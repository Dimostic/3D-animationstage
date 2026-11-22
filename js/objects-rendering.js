/**
 * Object Manager — Pin resolution, rendering, selection & context menu
 * (split from objects.js for maintainability)
 */

Object.assign(ObjectManager.prototype, {

    _isObjectInViewport(obj, viewportRect, padding = 0) {
        if (!viewportRect || !obj || typeof obj.getBounds !== 'function') return true;
        const bounds = obj.getBounds();
        if (!bounds) return true;
        const left = viewportRect.x - padding;
        const top = viewportRect.y - padding;
        const right = viewportRect.x + viewportRect.width + padding;
        const bottom = viewportRect.y + viewportRect.height + padding;
        return !(
            bounds.x + bounds.width < left ||
            bounds.y + bounds.height < top ||
            bounds.x > right ||
            bounds.y > bottom
        );
    },

    // Collect ids of objects that carry a baked `layer` animation track (dynamic
    // z-order, e.g. recorded armature movements). Empty set = fast path (no reorder).
    _getLayerOrderAnimObjectIds() {
        const ids = new Set();
        (this.objects || []).forEach(obj => {
            const anims = obj?.animations;
            if (!Array.isArray(anims)) return;
            for (const anim of anims) {
                const props = anim?.generated?.properties;
                if (Array.isArray(props) && props.includes('layer')) { ids.add(obj.id); break; }
            }
        });
        return ids;
    },

    // Return a NEW list ordered by each object's live (animated) layer. Children
    // (pinned parts, facial features, garments) inherit their nearest layer-animated
    // ancestor's layer so they stay grouped with it. Mirrors the export runtime.
    _orderObjectsByAnimatedLayer(list, layerAnimIds) {
        if (!Array.isArray(list) || list.length < 2) return list;
        const byId = Object.create(null);
        const indexById = Object.create(null);
        list.forEach((o, i) => { if (o && o.id) { byId[o.id] = o; indexById[o.id] = i; } });
        const roleOf = (obj) => {
            const role = String(
                obj?._armatureRoleKey
                || obj?.armatureRoleKey
                || obj?._armaturePartKey
                || obj?.armaturePartKey
                || obj?.bodyPartData?.partKey
                || obj?.bodyPartData?.roleKey
                || obj?._ucGarmentRoleKey
                || obj?.ucGarmentRoleKey
                || obj?._ucGarmentPartKey
                || obj?.ucGarmentPartKey
                || ''
            ).toLowerCase();
            if (role) return role;
            const name = String(obj?.name || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
            if (/\bfront\b/.test(name) && /\bleg\b/.test(name)) return 'front-leg';
            if (/\bback\b/.test(name) && /\bleg\b/.test(name)) return 'back-leg';
            if (/\bfront\b/.test(name) && /\barm\b/.test(name)) return 'front-arm';
            if (/\bback\b/.test(name) && /\barm\b/.test(name)) return 'back-arm';
            const parentId = obj?._ucGarmentForPartId || obj?.ucGarmentForPartId || obj?.pinnedTo || null;
            const parent = parentId ? byId[parentId] : null;
            if (parent && parent !== obj) {
                const parentRole = roleOf(parent);
                if (parentRole === 'front-arm' || parentRole === 'back-arm' || parentRole === 'front-leg' || parentRole === 'back-leg') return parentRole;
            }
            if (/\btorso\b/.test(name)) return 'torso';
            if (/\bhead\b/.test(name) || /\bneck\b/.test(name)) return 'head-neck';
            if (/\bright\b/.test(name) && /\bleg\b/.test(name)) return 'right-leg';
            if (/\bleft\b/.test(name) && /\bleg\b/.test(name)) return 'left-leg';
            if (/\bright\b/.test(name) && /\barm\b/.test(name)) return 'right-arm';
            if (/\bleft\b/.test(name) && /\barm\b/.test(name)) return 'left-arm';
            return '';
        };
        const garmentLayerPolicyOf = (obj) => String(obj?._ucGarmentLayerPolicy || obj?.ucGarmentLayerPolicy || '').toLowerCase();
        const isRobeGarment = (obj) => garmentLayerPolicyOf(obj) === 'body-drape'
            || obj?._ucAgbadaRobeLayer === true
            || obj?._ucGarmentPartKey === 'agbada-robe'
            || obj?.ucGarmentPartKey === 'agbada-robe'
            || obj?._ucGarmentPartKey === 'svg-african-body-drape'
            || obj?.ucGarmentPartKey === 'svg-african-body-drape'
            || obj?._ucGarmentPartKey === 'svg-african-outer-coat'
            || obj?.ucGarmentPartKey === 'svg-african-outer-coat';
        const isContinuousLowerGarment = (obj) => (
            garmentLayerPolicyOf(obj) === 'lower-over-legs'
            || obj?._ucGarmentPartKey === 'svg-african-lower-garment'
            || obj?.ucGarmentPartKey === 'svg-african-lower-garment'
        );
        const styleConfigOf = (obj) => obj?._ucCharacterStyleConfig || obj?.ucCharacterStyleConfig || {};
        const clothingOf = (obj) => {
            const config = styleConfigOf(obj);
            return config?.clothing || config || {};
        };
        const hasLongTorsoGarment = (obj) => {
            if (globalThis.ArmatureGarmentPolicies?.hasLongTorsoGarment?.(obj)) return true;
            const clothing = clothingOf(obj);
            const topStyle = String(clothing?.topStyle || '').toLowerCase();
            const preset = String(clothing?.outfitPreset || '').toLowerCase();
            if (topStyle === 'agbada' || topStyle === 'dress') return true;
            return ['agbada', 'agbada2', 'agbada3', 'royal-agbada', 'royal-agbada-painted', 'senator', 'senator2', 'senator3', 'senator-shirt', 'senator-shirt-panel', 'senator-shirt-stripe', 'executive-tunic-suit', 'chief', 'kaftan', 'buba-wrapper'].includes(preset);
        };
        const sameCharacterAsTorso = (obj, torso, garment) => {
            if (!obj || !torso) return false;
            if (obj.id === torso.id) return true;
            if (obj.pinnedTo === torso.id) return true;
            const familyId = String(torso._ucCharacterFamilyId || torso.ucCharacterFamilyId || garment?._ucGarmentFamilyId || garment?.ucGarmentFamilyId || '').trim();
            if (familyId && String(obj._ucCharacterFamilyId || obj.ucCharacterFamilyId || obj._ucGarmentFamilyId || obj.ucGarmentFamilyId || '').trim() === familyId) return true;
            const garmentRootId = String(garment?._ucGarmentRootId || garment?.ucGarmentRootId || '').trim();
            return !!garmentRootId && (obj.id === garmentRootId || obj.pinnedTo === garmentRootId);
        };
        const hasOwnRigLayer = (obj) => {
            if (!obj) return false;
            if (obj._armatureRoleKey || obj.armatureRoleKey || obj._armaturePartKey || obj.armaturePartKey) return true;
            if (obj.bodyPartData?.partKey || obj.bodyPartData?.roleKey) return true;
            if (Array.isArray(obj.joints) && obj.joints.length) return true;
            const role = roleOf(obj);
            return role === 'torso' || role === 'head-neck' || role.includes('arm') || role.includes('leg');
        };
        const explicitDrawLayerOf = (obj) => {
            const armatureLayer = Number(obj?._armatureDrawLayer ?? obj?.armatureDrawLayer);
            if (Number.isFinite(armatureLayer)) return armatureLayer;
            const uiLayer = Number(obj?.layer);
            return Number.isFinite(uiLayer) ? uiLayer : null;
        };
        const inferredRigLayerOf = (obj) => {
            const role = roleOf(obj);
            if (!role) return 0;
            const torso = role === 'torso'
                ? obj
                : list.find(candidate => roleOf(candidate) === 'torso' && sameCharacterAsTorso(obj, candidate, null));
            const baseIndex = (torso?.id && indexById[torso.id] != null)
                ? indexById[torso.id]
                : ((obj?.id && indexById[obj.id] != null) ? indexById[obj.id] : 0);
            const facing = String(torso?._armatureFrontBackFacing || torso?.armatureFrontBackFacing || torso?._ucCharacterStyleConfig?.view || '').toLowerCase();
            const order = facing.includes('back')
                ? ['left-arm', 'right-arm', 'right-leg', 'left-leg', 'torso', 'head-neck']
                : ['right-leg', 'left-leg', 'torso', 'head-neck', 'left-arm', 'right-arm'];
            const roleIndex = order.indexOf(role);
            return baseIndex + ((roleIndex >= 0 ? roleIndex : order.length) + 1) / 10;
        };
        const numericDrawLayerOf = (obj) => {
            const explicit = explicitDrawLayerOf(obj);
            if (explicit != null) return explicit;
            if (hasOwnRigLayer(obj)) return inferredRigLayerOf(obj);
            return 0;
        };
        const rawBaseLayerOf = (obj) => {
            let cur = obj;
            let guard = 0;
            while (cur && guard++ < 16) {
                if (layerAnimIds?.has?.(cur.id) || hasOwnRigLayer(cur)) {
                    return numericDrawLayerOf(cur);
                }
                const pid = cur.pinnedTo || cur._facialParentHead || cur._ucGarmentForPartId || cur.ucGarmentForPartId || null;
                cur = pid ? byId[pid] : null;
            }
            return numericDrawLayerOf(obj);
        };
        const longTorsoFor = (obj) => {
            if (!obj?.id) return null;
            const role = roleOf(obj);
            if (role === 'torso' && hasLongTorsoGarment(obj)) return obj;
            return list.find(candidate => roleOf(candidate) === 'torso' && hasLongTorsoGarment(candidate) && sameCharacterAsTorso(obj, candidate, null)) || null;
        };
        const hasSideArmPairForTorso = (torso) => {
            let hasFront = false;
            let hasBack = false;
            list.forEach(candidate => {
                if (!sameCharacterAsTorso(candidate, torso, null)) return;
                const role = roleOf(candidate);
                if (role === 'front-arm') hasFront = true;
                if (role === 'back-arm') hasBack = true;
            });
            return hasFront && hasBack;
        };
        const isSideTorso = (torso) => {
            if (!torso) return false;
            const profile = String(torso._armaturePromotedProfile || torso.armaturePromotedProfile || '').toLowerCase();
            if (profile === 'side-dual' || torso._armatureSkinStrictSideProfile || torso.armatureSkinStrictSideProfile) return true;
            return hasSideArmPairForTorso(torso);
        };
        const sideTorsoFor = (obj) => {
            if (!obj?.id) return null;
            const role = roleOf(obj);
            if (role === 'torso' && isSideTorso(obj)) return obj;
            return list.find(candidate => roleOf(candidate) === 'torso' && sameCharacterAsTorso(obj, candidate, null) && isSideTorso(candidate)) || null;
        };
        const sideArmRoleFor = (obj, torso) => {
            const role = roleOf(obj);
            if (!isSideTorso(torso)) return role;
            if (role === 'front-arm' || role === 'back-arm') return role;
            if (role !== 'right-arm' && role !== 'left-arm') return role;
            const facing = String(torso?._armatureFacingSide || torso?.armatureFacingSide || torso?._armatureVisualFacingSide || torso?.armatureVisualFacingSide || '').toLowerCase();
            const rightFacing = facing === 'right';
            if (rightFacing) return role === 'right-arm' ? 'front-arm' : 'back-arm';
            return role === 'left-arm' ? 'front-arm' : 'back-arm';
        };
        const legLayerMaxForTorso = (torso) => {
            let maxLayer = rawBaseLayerOf(torso);
            list.forEach(candidate => {
                const role = roleOf(candidate);
                if (role.includes('leg') && sameCharacterAsTorso(candidate, torso, null)) {
                    maxLayer = Math.max(maxLayer, rawBaseLayerOf(candidate));
                }
            });
            return maxLayer;
        };
        const baseLayerOf = (obj) => {
            const toolArm = obj?.sceneAsset?.characterTool && byId[obj.pinnedTo];
            if (toolArm && !toolArm.sceneAsset?.characterTool && roleOf(toolArm).includes('arm')) {
                if (obj.sceneAsset.activityKit && explicitDrawLayerOf(obj) != null) {
                    // Keep grip depth relative to garment-adjusted arms; retain absolute rear-body placement.
                    const layer = explicitDrawLayerOf(obj), offset = layer - rawBaseLayerOf(toolArm);
                    return Math.abs(offset) < 0.5 ? baseLayerOf(toolArm) + offset : layer;
                }
                return baseLayerOf(toolArm) + 0.01;
            }
            if (isContinuousLowerGarment(obj)) {
                const torso = byId[obj._ucGarmentForPartId || obj.ucGarmentForPartId]
                    || byId[obj.pinnedTo]
                    || byId[obj._ucGarmentRootId || obj.ucGarmentRootId]
                    || null;
                if (torso) {
                    const torsoLayer = rawBaseLayerOf(torso);
                    const legLayers = list
                        .filter(candidate => roleOf(candidate).includes('leg') && sameCharacterAsTorso(candidate, torso, obj))
                        .map(candidate => rawBaseLayerOf(candidate));
                    if (legLayers.length) {
                        const legLayer = Math.max(...legLayers);
                        return legLayer < torsoLayer
                            ? Math.min(legLayer + 0.20, torsoLayer - 0.05)
                            : legLayer + 0.20;
                    }
                    return torsoLayer - 0.05;
                }
            }
            if (isRobeGarment(obj)) {
                const torso = byId[obj._ucGarmentForPartId || obj.ucGarmentForPartId] || byId[obj.pinnedTo] || byId[obj._ucGarmentRootId || obj.ucGarmentRootId] || null;
                if (torso) {
                    let bodyLayer = baseLayerOf(torso);
                    list.forEach(candidate => {
                        const role = roleOf(candidate);
                        if (role && role.includes('leg') && sameCharacterAsTorso(candidate, torso, obj)) {
                            bodyLayer = Math.max(bodyLayer, baseLayerOf(candidate));
                        }
                    });
                    return bodyLayer + 0.20;
                }
            }
            const rawLayer = rawBaseLayerOf(obj);
            // Folding hands reach over the fabric; ordinary far-arm depth resumes without it.
            if (roleOf(obj).includes('arm') && list.some(tool => tool.visible !== false
                && tool.sceneAsset?.activityKit === 'fold' && tool.sceneAsset?.activityRole === 'tool'
                && tool.sceneAsset.activitySurfaceHandIds?.includes(obj._ucGarmentForPartId || obj.ucGarmentForPartId || obj.id)
                && rawLayer > rawBaseLayerOf(tool))) return rawLayer;
            const ownName = String(obj?.name || '').toLowerCase();
            if (obj?._facialParentHead || obj?.facialParentHead || /^face\s*:/.test(ownName)) {
                return rawLayer + 10;
            }
            const longTorso = longTorsoFor(obj);
            if (longTorso) {
                const torsoFloor = legLayerMaxForTorso(longTorso) + 0.25;
                const role = roleOf(obj);
                const sideRole = sideArmRoleFor(obj, longTorso);
                if (role === 'torso') return Math.max(rawLayer, torsoFloor);
                if (sideRole === 'front-arm') return Math.max(rawLayer, torsoFloor + 0.30);
                if (sideRole === 'back-arm') return Math.min(rawLayer, rawBaseLayerOf(longTorso) - 0.30);
                if (role.includes('arm')) {
                    // Garment clearance must preserve intentional far/back-view arm depth.
                    return rawLayer < rawBaseLayerOf(longTorso) ? rawLayer : Math.max(rawLayer, torsoFloor + 0.30);
                }
                if (role === 'head-neck' || obj?._facialParentHead || obj?.facialParentHead) return Math.max(rawLayer, torsoFloor + 0.15);
            }
            const role = roleOf(obj);
            if (role.includes('arm')) {
                const sideTorso = sideTorsoFor(obj);
                if (sideTorso) {
                    const sideTorsoLayer = rawBaseLayerOf(sideTorso);
                    const sideRole = sideArmRoleFor(obj, sideTorso);
                    if (sideRole === 'front-arm') return Math.max(rawLayer, sideTorsoLayer + 0.30);
                    if (sideRole === 'back-arm') return Math.min(rawLayer, sideTorsoLayer - 0.30);
                }
            }
            return rawLayer;
        };
        const characterStackPolicy = globalThis.CharacterStackPolicy;
        if (characterStackPolicy?.orderObjects) {
            return characterStackPolicy.orderObjects(list, baseLayerOf);
        }
        return list
            .map((o, i) => ({
                o,
                k: baseLayerOf(o),
                idx: (indexById[o.id] != null) ? indexById[o.id] : i
            }))
            .sort((a, b) => (a.k - b.k) || (a.idx - b.idx))
            .map(e => e.o);
    },

    renderScene(ctx, options = {}) {
        const {
            viewportRect = null,
            cullPadding = 0,
            includeEditorArtifacts = true,
            resolvePins = true,
            renderOptions = {}
        } = options;

        if (resolvePins) {
            this._resolvePins();
        }

        // Draw in animated-layer order when a baked `layer` track is present (e.g.
        // recorded armature movements with dynamic depth). Non-mutating: this.objects
        // array order is untouched (selection/hit-testing/z editing unaffected); only
        // the draw iteration order changes so the z-swap is observed during playback.
        const layerAnimIds = this._getLayerOrderAnimObjectIds();
        const drawList = this._orderObjectsByAnimatedLayer(this.objects, layerAnimIds);
        const objectRenderOptions = {
            ...renderOptions,
            includeEditorArtifacts
        };

        const webglSkipIds = window.__animationStageWebGLSkipObjectIds || null;
        drawList.forEach(obj => {
            if (webglSkipIds?.has?.(obj.id)) return;
            if (!this.isObjectLayerVisible(obj)) return;
            if (!this._isObjectInViewport(obj, viewportRect, cullPadding)) return;

            if (obj.pinContour && obj.pinnedTo && obj._pinParentRef) {
                obj._drawPinContour(ctx);
            }

            if (this._objEraserMode && this._objEraserTarget === obj && this._objEraserCanvas) {
                const t = this._objEraserTarget;
                const s = this._objEraserScale;
                const p = this._objEraserPad;
                const tb = t.getBounds();
                ctx.save();
                ctx.globalAlpha = t.opacity;
                ctx.drawImage(this._objEraserCanvas,
                    0, 0, this._objEraserCanvas.width, this._objEraserCanvas.height,
                    tb.x - p, tb.y - p, this._objEraserCanvas.width / s, this._objEraserCanvas.height / s);
                ctx.restore();
            } else if (this._objEraserMode && this._objEraserShape === obj) {
                ctx.save();
                ctx.globalAlpha = 0.5;
                obj.render(ctx, objectRenderOptions);
                ctx.restore();
            } else if (this._eraserMode && this._eraserObj === obj && this._eraserCanvas) {
                obj._eraserCanvas = this._eraserCanvas;
                obj.render(ctx, objectRenderOptions);
                obj._eraserCanvas = null;
            } else {
                obj.render(ctx, objectRenderOptions);
            }
        });

        if (!includeEditorArtifacts) return;

        if (this.tempObject) {
            this.tempObject.render(ctx, renderOptions);
        }

        if (this.isDrawingPath && this.currentPath.length > 0) {
            ctx.strokeStyle = '#4a90d9';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(this.currentPath[0].x, this.currentPath[0].y);
            for (let i = 1; i < this.currentPath.length; i++) {
                ctx.lineTo(this.currentPath[i].x, this.currentPath[i].y);
            }
            ctx.stroke();
            ctx.setLineDash([]);

            this.currentPath.forEach(p => {
                ctx.fillStyle = '#6366f1';
                ctx.beginPath();
                ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
                ctx.fill();
            });
        }

        if (this.isDrawingTrace && this.currentTracePath.length > 0) {
            const tp = this.currentTracePath;

            if (tp.length >= 2) {
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(tp[0].x, tp[0].y);

                for (let i = 1; i < tp.length; i++) {
                    const cur = tp[i];
                    if (cur.segmentType === 'straight') {
                        ctx.lineTo(cur.x, cur.y);
                    } else if (i < tp.length - 1) {
                        const next = tp[i + 1];
                        const xc = (cur.x + next.x) / 2;
                        const yc = (cur.y + next.y) / 2;
                        ctx.quadraticCurveTo(cur.x, cur.y, xc, yc);
                    } else {
                        ctx.lineTo(cur.x, cur.y);
                    }
                }

                if (this._tracePreviewPos) {
                    ctx.lineTo(this._tracePreviewPos.x, this._tracePreviewPos.y);
                }
                ctx.strokeStyle = '#4a90d9';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.restore();
            }

            tp.forEach((p, i) => {
                ctx.beginPath();
                if (p.segmentType === 'straight' && i > 0) {
                    ctx.rect(p.x - 4, p.y - 4, 8, 8);
                } else {
                    ctx.arc(p.x, p.y, i === 0 ? 6 : 4, 0, Math.PI * 2);
                }
                ctx.fillStyle = i === 0 ? '#22c55e' : (p.segmentType === 'straight' ? '#f59e0b' : '#6366f1');
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            });

            if (tp.length >= 3 && this._tracePreviewPos) {
                const first = tp[0];
                const dist = Math.hypot(this._tracePreviewPos.x - first.x, this._tracePreviewPos.y - first.y);
                if (dist < 12) {
                    ctx.beginPath();
                    ctx.arc(first.x, first.y, 10, 0, Math.PI * 2);
                    ctx.strokeStyle = '#22c55e';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }
            }

            if (tp.length >= 2) {
                ctx.save();
                ctx.font = '11px Inter, sans-serif';
                ctx.fillStyle = 'rgba(255,255,255,0.7)';
                ctx.textAlign = 'left';
                const last = tp[tp.length - 1];
                ctx.fillText('Right-click: toggle straight/curve · Dbl-click: open path · Click 1st pt: close', last.x + 15, last.y - 10);
                ctx.restore();
            }
        }
    },

    _resolvePins() {
        const lookup = {};
        this.objects.forEach(obj => { lookup[obj.id] = obj; });

        // Multiple passes to handle pin chains (A→B→C)
        for (let pass = 0; pass < 10; pass++) {
            let moved = false;
            this.objects.forEach(obj => {
                const pinParentId = obj.pinnedTo || obj._ucGarmentForPartId || obj.ucGarmentForPartId || null;
                if (obj._crossViewBlend) {
                    obj._pinParentRef = lookup[pinParentId] || null;
                    return;
                }
                if (!pinParentId) {
                    obj._pinParentRef = null;
                    // Root body parts: apply jointBaseAngle directly as rotation
                    if (obj.bodyPartData && obj.jointBaseAngle !== undefined) {
                        obj.rotation = obj.jointBaseAngle;
                    }
                    return;
                }
                const parent = lookup[pinParentId];
                if (!parent) { obj._pinParentRef = null; return; }
                obj._pinParentRef = parent;

                let target = this._getPinTargetWorldTransform(parent, obj);
                if (!target) return;
                let garmentTargetOffsetX = 0;
                let garmentTargetOffsetY = 0;
                const isUcGarment = !!(obj._ucGarmentLayer || obj.ucGarmentLayer || obj._ucAgbadaRobeLayer || obj.ucAgbadaRobeLayer);
                const garmentPartKey = String(obj._ucGarmentPartKey || obj.ucGarmentPartKey || '').toLowerCase();
                const parentPartKey = String(parent?._armaturePartKey || parent?.bodyPartRole || parent?.name || '').toLowerCase();
                const followsTorsoPanel = isUcGarment
                    && /torso/.test(parentPartKey)
                    && (/robe|shirt|tunic|torso/.test(garmentPartKey) || !garmentPartKey);
                if (followsTorsoPanel && Array.isArray(parent.joints) && parent.joints.length) {
                    const sortedParentJoints = [...parent.joints].sort((a, b) => (a.position || 0) - (b.position || 0));
                    const torsoJoint = sortedParentJoints[0];
                    const jointTarget = this._getPinTargetWorldTransform(parent, {
                        pinTargetType: 'joint',
                        pinJointId: torsoJoint?.id,
                        pinJointName: torsoJoint?.name
                    });
                    if (jointTarget) {
                        const anchorX = obj.pinAnchorX ?? target.anchorX ?? 0.5;
                        const anchorY = obj.pinAnchorY ?? target.anchorY ?? 0.5;
                        garmentTargetOffsetX += (anchorX - (jointTarget.anchorX ?? 0.5)) * (parent.width || 0);
                        garmentTargetOffsetY += (anchorY - (jointTarget.anchorY ?? 0.5)) * (parent.height || 0);
                        target = jointTarget;
                    }
                }
                // Rotation mode
                const mode = obj.pinRotationMode || ((obj.pinInheritRotation || obj._ucGarmentLayer || obj.ucGarmentLayer) ? 'inherit' : 'static');
                if (mode === 'inherit') {
                    if (obj._armaturePartKey) {
                        obj.rotation = (target.rotation || 0) + (obj.jointBaseAngle || 0);
                    } else {
                        obj.rotation = target.rotation || 0;
                    }
                } else if (mode === 'joint') {
                    // Additive: target rotation + this part's local joint angle
                    obj.rotation = (target.rotation || 0) + (obj.jointBaseAngle || 0);
                }
                if (mode === 'inherit' || mode === 'joint') {
                    obj.tiltX = Utils.clamp((target.tiltX || 0) + (obj.pinBaseTiltX || 0), -45, 45);
                    obj.tiltY = Utils.clamp((target.tiltY || 0) + (obj.pinBaseTiltY || 0), -45, 45);
                }
                if (isUcGarment) {
                    const motionRotation = Number(obj._ucGarmentMotionRotation || obj.ucGarmentMotionRotation || 0);
                    const motionTiltX = Number(obj._ucGarmentMotionTiltX || obj.ucGarmentMotionTiltX || 0);
                    const motionTiltY = Number(obj._ucGarmentMotionTiltY || obj.ucGarmentMotionTiltY || 0);
                    if (Number.isFinite(motionRotation) && Math.abs(motionRotation) > 0.0001) {
                        obj.rotation += motionRotation;
                    }
                    if (Number.isFinite(motionTiltX) && Math.abs(motionTiltX) > 0.0001) {
                        obj.tiltX = Utils.clamp((Number(obj.tiltX) || 0) + motionTiltX, -45, 45);
                    }
                    if (Number.isFinite(motionTiltY) && Math.abs(motionTiltY) > 0.0001) {
                        obj.tiltY = Utils.clamp((Number(obj.tiltY) || 0) + motionTiltY, -45, 45);
                    }
                }

                const anchorWorld = { x: target.x, y: target.y };
                const worldOffset = this._getPinTargetOffsetWorldVector(
                    target,
                    (obj.pinOffsetX || 0) + garmentTargetOffsetX,
                    (obj.pinOffsetY || 0) + garmentTargetOffsetY
                );
                let desiredPivotWorldX = anchorWorld.x + worldOffset.x;
                let desiredPivotWorldY = anchorWorld.y + worldOffset.y;

                // Facial offsets are head-local coordinates. Follow the rendered
                // segment, including its scale and transform order, during motion.
                if (obj._facialParentHead === parent.id && target.joint) {
                    const direction = StageObject.getJointDirectionMeta(parent.jointDirection);
                    const rect = obj._facialLocalRect;
                    const x = rect ? (rect.x + rect.w / 2 + (obj.pinOffsetX || 0) - (obj._facialBasePinOffsetX || 0)) / parent.width
                        : target.anchorX + (obj.pinOffsetX || 0) / parent.width;
                    const y = rect ? (rect.y + rect.h / 2 + (obj.pinOffsetY || 0) - (obj._facialBasePinOffsetY || 0)) / parent.height
                        : target.anchorY + (obj.pinOffsetY || 0) / parent.height;
                    const ratio = direction.isVertical ? y : x;
                    const point = parent.getJointWorldPosition({
                        position: direction.isReverse ? 1 - ratio : ratio,
                        crossOffset: direction.isVertical ? x : y
                    }, true);
                    desiredPivotWorldX = point.x;
                    desiredPivotWorldY = point.y;
                }

                const attachmentJoint = obj._armatureAttachmentPin && obj._getArmatureAttachmentJoint
                    ? obj._getArmatureAttachmentJoint()
                    : null;
                if (attachmentJoint) {
                    const attachmentWorld = obj._getArmatureAttachmentJointWorldPosition
                        ? obj._getArmatureAttachmentJointWorldPosition(attachmentJoint)
                        : obj.getJointWorldPosition(attachmentJoint);
                    const pivotWorld = obj.getPivotPoint();
                    desiredPivotWorldX += (pivotWorld.x - attachmentWorld.x);
                    desiredPivotWorldY += (pivotWorld.y - attachmentWorld.y);
                }

                const newX = desiredPivotWorldX - obj.width * obj.pivotX;
                const newY = desiredPivotWorldY - obj.height * obj.pivotY;

                if (Math.abs(obj.x - newX) > 0.01 || Math.abs(obj.y - newY) > 0.01) {
                    moved = true;
                    if (obj.pathPoints && obj.pathPoints.length > 0) {
                        const pdx = newX - obj.x, pdy = newY - obj.y;
                        obj.pathPoints.forEach(p => { p.x += pdx; p.y += pdy; });
                    }
                }
                obj.x = newX;
                obj.y = newY;
                // 'independent' — child keeps its own rotation, only position follows
                // 'static' — no rotation change (same as independent for position-only)

                // Anchor-hybrid: inherit a specific parent joint's ANGLE
                // into the child rotation AFTER position has been computed, so
                // the anchor stays rigid while the child visually rotates with
                // the joint (e.g. upper-body parts follow waist bends).
                // Joint tilt is NOT added here — it already flows through
                // partTilts → torso.tiltX/Y → target.tiltX/Y in the inherit
                // path above, so adding it again would double-apply.
                if (obj._pinInheritParentJointName && (mode === 'inherit' || mode === 'joint')) {
                    const jn = obj._pinInheritParentJointName;
                    const jt = (parent.joints || []).find(j => j?.name === jn);
                    if (jt) {
                        obj.rotation += (jt.angle || 0);
                    }
                }

                // Live joint sync: mirror parent's joint angles/tilt onto child
                if (obj.pinSyncJoints && parent.joints && parent.joints.length > 0 && obj.joints && obj.joints.length > 0) {
                    const parentJoints = [...parent.joints].sort((a, b) => a.position - b.position);
                    const childJoints = [...obj.joints].sort((a, b) => a.position - b.position);
                    // Match by name first, fall back to positional order
                    const parentByName = {};
                    parentJoints.forEach(jt => {
                        const n = (jt.name || '').toLowerCase().trim();
                        if (n) parentByName[n] = jt;
                    });
                    childJoints.forEach((cj, idx) => {
                        const cName = (cj.name || '').toLowerCase().trim();
                        const pj = (cName && parentByName[cName]) ? parentByName[cName] : parentJoints[idx];
                        if (!pj) return;
                        cj.angle = pj.angle ?? 0;
                        cj.tiltX = pj.tiltX ?? 0;
                        cj.tiltY = pj.tiltY ?? 0;
                        cj.crossOffset = pj.crossOffset ?? 0.5;
                    });
                }
            });
            if (!moved) break;
        }
    },

    // Rendering
    renderAll(ctx) {
        if (!window.__animationStageWebGLObjectsRendered || window.__animationStageWebGLSkipObjectIds) {
            this.renderScene(ctx, {
                includeEditorArtifacts: true,
                resolvePins: true,
                renderOptions: { quality: 'editor' }
            });
        }

        // Render selection box
        if (this.isSelecting && this.selectStart && this.selectEnd) {
            const sx = Math.min(this.selectStart.x, this.selectEnd.x);
            const sy = Math.min(this.selectStart.y, this.selectEnd.y);
            const sw = Math.abs(this.selectEnd.x - this.selectStart.x);
            const sh = Math.abs(this.selectEnd.y - this.selectStart.y);
            
            ctx.strokeStyle = '#6366f1';
            ctx.lineWidth = 1 / this.stage.zoom;
            ctx.setLineDash([4 / this.stage.zoom, 4 / this.stage.zoom]);
            ctx.strokeRect(sx, sy, sw, sh);
            ctx.fillStyle = 'rgba(99, 102, 241, 0.08)';
            ctx.fillRect(sx, sy, sw, sh);
            ctx.setLineDash([]);
        }

        // Render smart guides
        if (this.smartGuides.length > 0) {
            ctx.save();
            ctx.strokeStyle = '#ff3b9a';
            ctx.lineWidth = 1 / this.stage.zoom;
            ctx.setLineDash([3 / this.stage.zoom, 3 / this.stage.zoom]);

            this.smartGuides.forEach(guide => {
                ctx.beginPath();
                if (guide.type === 'v') {
                    ctx.moveTo(guide.pos, guide.from);
                    ctx.lineTo(guide.pos, guide.to);
                } else {
                    ctx.moveTo(guide.from, guide.pos);
                    ctx.lineTo(guide.to, guide.pos);
                }
                ctx.stroke();
            });

            ctx.setLineDash([]);
            ctx.restore();
        }
    },

    renderSelection(ctx) {
        const selected = this.getSelectedObjects();
        const zoom = Math.max(0.001, Math.abs(this.stage.zoom));

        // Draw group bounding boxes for any visible groups
        const drawnGroups = new Set();
        selected.forEach(obj => {
            if (obj.groupId && this.groups[obj.groupId] && !drawnGroups.has(obj.groupId)) {
                drawnGroups.add(obj.groupId);
                const bounds = this.getGroupBounds(obj.groupId);
                if (bounds) {
                    const pad = 4 / zoom;
                    ctx.save();
                    if (this._groupEditMode === obj.groupId) {
                        // Group edit mode: blue dashed border
                        ctx.strokeStyle = '#3b82f6';
                        ctx.lineWidth = 2 / zoom;
                        ctx.setLineDash([6 / zoom, 4 / zoom]);
                    } else {
                        // Normal group: gray dashed border
                        ctx.strokeStyle = 'rgba(99, 102, 241, 0.5)';
                        ctx.lineWidth = 1.5 / zoom;
                        ctx.setLineDash([4 / zoom, 4 / zoom]);
                    }
                    ctx.strokeRect(
                        bounds.x - pad,
                        bounds.y - pad,
                        bounds.width + pad * 2,
                        bounds.height + pad * 2
                    );
                    // Draw "Group" label
                    ctx.setLineDash([]);
                    ctx.font = `${10 / zoom}px sans-serif`;
                    ctx.fillStyle = this._groupEditMode === obj.groupId ? '#3b82f6' : 'rgba(99, 102, 241, 0.7)';
                    ctx.fillText(
                        this._groupEditMode === obj.groupId ? 'Editing Group' : 'Group',
                        bounds.x - pad,
                        bounds.y - pad - 3 / zoom
                    );
                    ctx.restore();

                    // Draw resize handles on group bounding box (not in group edit mode)
                    if (this._groupEditMode !== obj.groupId && this._getSelectedGroupId() === obj.groupId) {
                        const gHandles = this._getGroupHandlePositions(bounds);
                        const hs = 6 / zoom;
                        ctx.save();
                        Object.values(gHandles).forEach(h => {
                            ctx.fillStyle = 'white';
                            ctx.strokeStyle = '#6366f1';
                            ctx.lineWidth = 1.5 / zoom;
                            ctx.fillRect(h.x - hs / 2, h.y - hs / 2, hs, hs);
                            ctx.strokeRect(h.x - hs / 2, h.y - hs / 2, hs, hs);
                        });
                        ctx.restore();

                        // Rotation handles on group corners
                        const grHandles = this._getGroupRotationHandlePositions(bounds);
                        const rr = 4 / zoom;
                        ctx.save();
                        ctx.lineWidth = 1.2 / zoom;
                        const rotColor = '#6366f1';
                        Object.values(grHandles).forEach(rh => {
                            ctx.fillStyle = 'rgba(99, 102, 241, 0.15)';
                            ctx.strokeStyle = rotColor;
                            ctx.beginPath();
                            ctx.arc(rh.x, rh.y, rr, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.stroke();
                            // Tiny rotation arrow icon
                            const arrowR = 2.5 / zoom;
                            ctx.strokeStyle = rotColor;
                            ctx.lineWidth = 1 / zoom;
                            ctx.beginPath();
                            ctx.arc(rh.x, rh.y, arrowR, -Math.PI * 0.7, Math.PI * 0.3);
                            ctx.stroke();
                            const tipX = rh.x + arrowR * Math.cos(Math.PI * 0.3);
                            const tipY = rh.y + arrowR * Math.sin(Math.PI * 0.3);
                            const tipSize = 1.5 / zoom;
                            ctx.beginPath();
                            ctx.moveTo(tipX + tipSize, tipY - tipSize);
                            ctx.lineTo(tipX, tipY);
                            ctx.lineTo(tipX - tipSize, tipY - tipSize);
                            ctx.stroke();
                        });
                        ctx.restore();
                    }
                }
            }
        });

        selected.forEach(obj => {
            // Selection outline
            const isGroupEditSubSelect = this._groupEditMode && obj.groupId === this._groupEditMode;
            ctx.strokeStyle = isGroupEditSubSelect ? '#3b82f6' : '#6366f1';
            ctx.lineWidth = 2 / zoom;
            ctx.setLineDash([]);

            // Joint-bent shapes: draw outline around each segment polygon
            let jointOutlineDrawn = false;
            if (obj.joints && obj.joints.length > 0) {
                const polys = obj._getJointedHitPolygons();
                if (polys) {
                    polys.forEach(corners => {
                        ctx.beginPath();
                        ctx.moveTo(corners[0].x, corners[0].y);
                        for (let i = 1; i < corners.length; i++) ctx.lineTo(corners[i].x, corners[i].y);
                        ctx.closePath();
                        ctx.stroke();
                    });
                    jointOutlineDrawn = true;
                }
            }

            let extrusionOutlineDrawn = false;
            if (!jointOutlineDrawn) {
                const extrusion = obj.getDepthExtrusionGeometry?.();
                if (extrusion) {
                    extrusion.quads.forEach(quad => {
                        ctx.beginPath();
                        ctx.moveTo(quad[0].x, quad[0].y);
                        for (let i = 1; i < quad.length; i++) ctx.lineTo(quad[i].x, quad[i].y);
                        ctx.closePath();
                        ctx.stroke();
                    });
                    ctx.beginPath();
                    ctx.moveTo(extrusion.front[0].x, extrusion.front[0].y);
                    for (let i = 1; i < extrusion.front.length; i++) ctx.lineTo(extrusion.front[i].x, extrusion.front[i].y);
                    ctx.closePath();
                    ctx.stroke();
                    extrusionOutlineDrawn = true;
                }
            }

            if (!jointOutlineDrawn && !extrusionOutlineDrawn) {
            if (obj._hasDisplayRectTransform?.()) {
                const points = obj.getTransformedRectPoints();
                ctx.beginPath();
                ctx.moveTo(points[0].x, points[0].y);
                for (let i = 1; i < points.length; i++) {
                    ctx.lineTo(points[i].x, points[i].y);
                }
                ctx.closePath();
                ctx.stroke();
            } else {
                const pivot = obj.getPivotPoint();
                const cx = obj.x + obj.width / 2;
                const cy = obj.y + obj.height / 2;
                const pad = 1 / zoom;

                ctx.save();
                if (obj.rotation) {
                    ctx.translate(pivot.x, pivot.y);
                    ctx.rotate(Utils.degToRad(obj.rotation));
                    ctx.translate(-pivot.x, -pivot.y);
                }

                if (obj.type === 'circle') {
                    const rx = Math.abs(obj.width / 2 + pad + 1 / zoom);
                    const ry = Math.abs(obj.height / 2 + pad + 1 / zoom);
                    ctx.beginPath();
                    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
                    ctx.stroke();
                } else {
                    ctx.strokeRect(
                        obj.x - pad,
                        obj.y - pad,
                        obj.width + pad * 2,
                        obj.height + pad * 2
                    );
                }
                ctx.restore();
            }
            } // end if (!jointOutlineDrawn)

            // Resize handles (show for single selected object, or sub-selected in group edit)
            const showHandles = selected.length === 1 || isGroupEditSubSelect;
            if (showHandles && selected.length <= 2) {
                const handles = this.getHandlePositions(obj);
                const hs = 6 / zoom;
                Object.values(handles).forEach(h => {
                    ctx.fillStyle = 'white';
                    ctx.strokeStyle = isGroupEditSubSelect ? '#3b82f6' : '#6366f1';
                    ctx.lineWidth = 1.5 / zoom;
                    ctx.fillRect(h.x - hs / 2, h.y - hs / 2, hs, hs);
                    ctx.strokeRect(h.x - hs / 2, h.y - hs / 2, hs, hs);
                });

                // Rotation handles (circles outside corners)
                const rHandles = this.getRotationHandlePositions(obj);
                const rr = 4 / zoom;
                ctx.lineWidth = 1.2 / zoom;
                const rotColor = isGroupEditSubSelect ? '#3b82f6' : '#6366f1';
                Object.values(rHandles).forEach(rh => {
                    ctx.fillStyle = isGroupEditSubSelect
                        ? 'rgba(59, 130, 246, 0.15)'
                        : 'rgba(99, 102, 241, 0.15)';
                    ctx.strokeStyle = rotColor;
                    ctx.beginPath();
                    ctx.arc(rh.x, rh.y, rr, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();

                    // Tiny rotation arrow icon inside circle
                    const arrowR = 2.5 / zoom;
                    ctx.strokeStyle = rotColor;
                    ctx.lineWidth = 1 / zoom;
                    ctx.beginPath();
                    ctx.arc(rh.x, rh.y, arrowR, -Math.PI * 0.7, Math.PI * 0.3);
                    ctx.stroke();
                    // Arrow tip
                    const tipX = rh.x + arrowR * Math.cos(Math.PI * 0.3);
                    const tipY = rh.y + arrowR * Math.sin(Math.PI * 0.3);
                    const tipSize = 1.5 / zoom;
                    ctx.beginPath();
                    ctx.moveTo(tipX + tipSize, tipY - tipSize);
                    ctx.lineTo(tipX, tipY);
                    ctx.lineTo(tipX - tipSize, tipY - tipSize);
                    ctx.stroke();
                });

                const depthHandle = this.getDepthHandleInfo(obj);
                if (depthHandle) {
                    const handleRadius = 5 / zoom;
                    const handleColor = isGroupEditSubSelect ? '#f97316' : '#f59e0b';
                    ctx.save();
                    ctx.strokeStyle = 'rgba(245, 158, 11, 0.75)';
                    ctx.lineWidth = 1.4 / zoom;
                    ctx.beginPath();
                    ctx.moveTo(depthHandle.anchor.x, depthHandle.anchor.y);
                    ctx.lineTo(depthHandle.handle.x, depthHandle.handle.y);
                    ctx.stroke();

                    ctx.translate(depthHandle.handle.x, depthHandle.handle.y);
                    ctx.rotate(Math.PI / 4);
                    ctx.fillStyle = '#fff7ed';
                    ctx.strokeStyle = handleColor;
                    ctx.lineWidth = 1.5 / zoom;
                    ctx.fillRect(-handleRadius, -handleRadius, handleRadius * 2, handleRadius * 2);
                    ctx.strokeRect(-handleRadius, -handleRadius, handleRadius * 2, handleRadius * 2);
                    ctx.restore();
                }
            }
        });

        // Draw point handles if in point edit mode
        this.drawPointHandles(ctx);

        // Draw crop overlay if in crop mode
        this.renderCropOverlay(ctx);

        // Draw slice overlay if in slice mode
        this.renderSliceOverlay(ctx);

        // Draw flex overlay if in flex mode
        this.renderFlexOverlay(ctx);

        // Draw object eraser overlay
        if (this._objEraserMode && this._objEraserShape) {
            const zoom = Math.max(0.001, this.stage.zoom);
            const es = this._objEraserShape;
            const b = es.getBounds();
            ctx.save();
            // Dashed outline around eraser shape
            ctx.strokeStyle = '#ff4444';
            ctx.lineWidth = 2 / zoom;
            ctx.setLineDash([6 / zoom, 4 / zoom]);
            ctx.strokeRect(b.x, b.y, b.width, b.height);
            ctx.setLineDash([]);
            // Label
            ctx.fillStyle = '#ff4444';
            ctx.font = `bold ${11 / zoom}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText('ERASER', b.x + b.width / 2, b.y - 6 / zoom);
            // Target outline
            if (this._objEraserTarget) {
                const tb = this._objEraserTarget.getBounds();
                ctx.strokeStyle = '#44aaff';
                ctx.lineWidth = 1.5 / zoom;
                ctx.setLineDash([4 / zoom, 4 / zoom]);
                ctx.strokeRect(tb.x, tb.y, tb.width, tb.height);
                ctx.setLineDash([]);
                ctx.fillStyle = '#44aaff';
                ctx.fillText('TARGET', tb.x + tb.width / 2, tb.y - 6 / zoom);
            }
            ctx.restore();
        }

        // Draw eraser brush cursor
        if (this._eraserMode && this._eraserCursorPos) {
            const zoom = Math.max(0.001, this.stage.zoom);
            const radius = this._eraserBrushSize / 2;
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 1.5 / zoom;
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.arc(this._eraserCursorPos.x, this._eraserCursorPos.y, radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.lineWidth = 1 / zoom;
            ctx.setLineDash([3 / zoom, 3 / zoom]);
            ctx.beginPath();
            ctx.arc(this._eraserCursorPos.x, this._eraserCursorPos.y, radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }

        // Clone brush source, target, and brush cursor
        if (this._cloneBrushMode) {
            const zoom = Math.max(0.001, this.stage.zoom);
            ctx.save();
            if (this._cloneBrushTarget) {
                const bounds = this._cloneBrushTarget.getBounds();
                ctx.strokeStyle = this._cloneBrushPickTarget ? '#f59e0b' : '#22c55e';
                ctx.lineWidth = 1.5 / zoom;
                ctx.setLineDash([5 / zoom, 4 / zoom]);
                ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
                ctx.setLineDash([]);
            }
            if (this._cloneBrushBoundaryObject) {
                const bounds = this._cloneBrushBoundaryObject.getBounds();
                ctx.strokeStyle = '#d946ef';
                ctx.fillStyle = 'rgba(217,70,239,0.08)';
                ctx.lineWidth = 2 / zoom;
                ctx.setLineDash([6 / zoom, 3 / zoom]);
                ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
                ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
                ctx.setLineDash([]);
                ctx.fillStyle = '#d946ef';
                ctx.font = `bold ${10 / zoom}px sans-serif`;
                ctx.textAlign = 'left';
                ctx.textBaseline = 'bottom';
                ctx.fillText('TARGET BOUNDARY', bounds.x, bounds.y - 5 / zoom);
            } else if (this._cloneBrushBoundaryPoints?.length > 1) {
                const points = this._cloneBrushBoundaryPoints;
                ctx.beginPath();
                ctx.moveTo(points[0].x, points[0].y);
                for (let index = 1; index < points.length; index++) ctx.lineTo(points[index].x, points[index].y);
                if (!this._cloneBrushBoundaryDrawing && this._cloneBrushBoundaryCanvas) ctx.closePath();
                if (!this._cloneBrushBoundaryInverted && this._cloneBrushBoundaryCanvas) {
                    ctx.fillStyle = 'rgba(217,70,239,0.12)';
                    ctx.fill();
                }
                ctx.strokeStyle = '#d946ef';
                ctx.lineWidth = 2 / zoom;
                ctx.setLineDash([6 / zoom, 3 / zoom]);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.fillStyle = '#d946ef';
                ctx.font = `bold ${10 / zoom}px sans-serif`;
                ctx.textAlign = 'left';
                ctx.textBaseline = 'bottom';
                ctx.fillText('TARGET BOUNDARY', points[0].x, points[0].y - 5 / zoom);
            }
            if (this._cloneBrushSource && this._cloneBrushSourceCanvas && this._cloneBrushMaskPoints?.length > 1) {
                const stagePoints = this._cloneBrushMaskPoints
                    .map(point => this._cloneBrushImagePointToStage(this._cloneBrushSource, this._cloneBrushSourceCanvas, point))
                    .filter(Boolean);
                if (stagePoints.length > 1) {
                    ctx.beginPath();
                    ctx.moveTo(stagePoints[0].x, stagePoints[0].y);
                    for (let index = 1; index < stagePoints.length; index++) {
                        ctx.lineTo(stagePoints[index].x, stagePoints[index].y);
                    }
                    if (!this._cloneBrushMaskDrawing) ctx.closePath();
                    if (!this._cloneBrushMaskInverted && stagePoints.length > 2) {
                        ctx.fillStyle = 'rgba(14,165,233,0.14)';
                        ctx.fill();
                    }
                    ctx.strokeStyle = '#0ea5e9';
                    ctx.lineWidth = 2 / zoom;
                    ctx.setLineDash([5 / zoom, 3 / zoom]);
                    ctx.stroke();
                    ctx.setLineDash([]);
                    ctx.fillStyle = '#0ea5e9';
                    ctx.font = `bold ${10 / zoom}px sans-serif`;
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'bottom';
                    ctx.fillText(this._cloneBrushMaskInverted ? 'SOURCE MASK (INVERTED)' : 'SOURCE MASK', stagePoints[0].x, stagePoints[0].y - 5 / zoom);
                }
            }
            if (this._cloneBrushSourcePoint
                && !this._cloneBrushMaskMode
                && !this._cloneBrushPickTarget
                && !this._cloneBrushMaskCanvas) {
                const live = this._cloneBrushLiveSourcePos || {
                    x: this._cloneBrushSourcePoint.stageX,
                    y: this._cloneBrushSourcePoint.stageY
                };
                const x = live.x;
                const y = live.y;
                const arm = 8 / zoom;
                ctx.strokeStyle = '#38bdf8';
                ctx.lineWidth = 2 / zoom;
                ctx.beginPath();
                ctx.moveTo(x - arm, y);
                ctx.lineTo(x + arm, y);
                ctx.moveTo(x, y - arm);
                ctx.lineTo(x, y + arm);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(x, y, this._cloneBrushSize / 2, 0, Math.PI * 2);
                ctx.stroke();
                ctx.fillStyle = '#38bdf8';
                ctx.font = `bold ${10 / zoom}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillText('SOURCE', x, y - this._cloneBrushSize / 2 - 5 / zoom);
                const anchorX = this._cloneBrushSourcePoint.stageX;
                const anchorY = this._cloneBrushSourcePoint.stageY;
                if (Math.hypot(anchorX - x, anchorY - y) > 2 / zoom) {
                    ctx.fillStyle = 'rgba(56,189,248,0.8)';
                    ctx.beginPath();
                    ctx.arc(anchorX, anchorY, 2.5 / zoom, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            if (this._cloneBrushCursorPos && !this._cloneBrushMaskMode) {
                const radius = this._cloneBrushSize / 2;
                ctx.strokeStyle = 'rgba(255,255,255,0.9)';
                ctx.lineWidth = 1.5 / zoom;
                ctx.beginPath();
                ctx.arc(this._cloneBrushCursorPos.x, this._cloneBrushCursorPos.y, radius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.strokeStyle = 'rgba(0,0,0,0.65)';
                ctx.lineWidth = 1 / zoom;
                ctx.setLineDash([3 / zoom, 3 / zoom]);
                ctx.beginPath();
                ctx.arc(this._cloneBrushCursorPos.x, this._cloneBrushCursorPos.y, radius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.fillStyle = '#22c55e';
                ctx.font = `bold ${10 / zoom}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillText('TARGET', this._cloneBrushCursorPos.x, this._cloneBrushCursorPos.y - radius - 5 / zoom);
            }
            ctx.restore();
        }

        // Rigging overlay (bones, pins, mesh wireframe)
        if (this.rigging && this.rigging.isActive) {
            this.rigging.renderOverlay(ctx);
        }
    },

    // Rename object via a small inline prompt overlay
    renameObjectPrompt(obj) {
        if (!obj) return;
        const overlay = document.createElement('div');
        overlay.className = 'rename-overlay';
        overlay.innerHTML = `
            <div class="rename-dialog">
                <label style="font-size:11px;color:var(--text-secondary);margin-bottom:4px;display:block">Rename Object</label>
                <input type="text" class="rename-input" value="${Utils.escapeAttr(obj.name)}" />
                <div style="display:flex;gap:6px;margin-top:8px;justify-content:flex-end">
                    <button class="rename-cancel" style="padding:4px 12px;border:1px solid var(--border-color);background:var(--bg-secondary);color:var(--text-primary);border-radius:4px;cursor:pointer;font-size:11px">Cancel</button>
                    <button class="rename-ok" style="padding:4px 12px;border:none;background:var(--accent-primary);color:#fff;border-radius:4px;cursor:pointer;font-size:11px">OK</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);

        const input = overlay.querySelector('.rename-input');
        input.focus();
        input.select();

        const commit = (accept) => {
            if (commit._done) return;
            commit._done = true;
            if (accept) {
                const newName = input.value.trim();
                if (newName && newName !== obj.name) {
                    obj.name = newName;
                    this._afterRename();
                }
            }
            overlay.remove();
        };

        overlay.querySelector('.rename-ok').addEventListener('click', () => commit(true));
        overlay.querySelector('.rename-cancel').addEventListener('click', () => commit(false));
        overlay.addEventListener('click', (e) => { if (e.target === overlay) commit(false); });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') commit(true);
            if (e.key === 'Escape') commit(false);
        });
    },

    _getUniversalCharacterContext(hit = null) {
        const jointSystem = window.app?.jointSystem;
        if (!jointSystem || !hit || typeof jointSystem._detectArmatureFromPool !== 'function') return null;

        const allObjects = Array.isArray(this.objects) ? this.objects : [];
        const byId = new Map(allObjects.map(obj => [obj?.id, obj]).filter(([id]) => !!id));
        const getObject = id => id ? (this.getObjectById?.(id) || byId.get(id) || null) : null;
        const getParent = (obj, seen) => [
            obj?.pinnedTo,
            obj?._facialParentHead,
            obj?._ucGarmentForPartId,
            obj?._ucGarmentRootId
        ].map(getObject).find(parent => parent?.id && !seen.has(parent.id)) || null;
        const chain = [];
        const seen = new Set();
        let cursor = hit;
        while (cursor && cursor.id && !seen.has(cursor.id)) {
            chain.push(cursor);
            seen.add(cursor.id);
            cursor = getParent(cursor, seen);
        }

        const poolById = new Map();
        const addWithDescendants = (obj) => {
            if (!obj?.id || poolById.has(obj.id)) return;
            poolById.set(obj.id, obj);
            allObjects
                .filter(child => child?.pinnedTo === obj.id
                    || child?._facialParentHead === obj.id
                    || child?._ucGarmentForPartId === obj.id
                    || child?._ucGarmentRootId === obj.id)
                .forEach(addWithDescendants);
        };
        chain.forEach(addWithDescendants);
        if (!poolById.size) addWithDescendants(hit);

        const pool = Array.from(poolById.values());
        let detected = jointSystem._refreshDetectedArmatureReference?.(jointSystem._detectArmatureFromPool(pool))
            || jointSystem._detectArmatureFromPool(pool);

        if (!jointSystem._isUniversalCharacterArmature?.(detected)) {
            const familyId = chain
                .map(obj => obj?._ucCharacterFamilyId || obj?._ucGarmentFamilyId)
                .find(Boolean);
            const hasUniversalHint = chain.some(obj => (
                obj?._ucCharacterStyleConfig
                || obj?._ucCharacterVariantKey
                || obj?._ucGarmentLayer
                || obj?._ucQualityPreset
                || obj?._webglMaterialHint?.category === 'universal-character'
            ));
            const candidateRoots = (familyId || hasUniversalHint) ? allObjects.filter(obj => {
                const role = String(obj?._armatureRoleKey || obj?._armaturePartKey || '').toLowerCase();
                return role === 'torso'
                    && (!familyId || String(obj?._ucCharacterFamilyId || '') === String(familyId));
            }) : [];
            for (const root of candidateRoots) {
                const candidatePool = allObjects.filter(obj => obj?.id === root.id || obj?.pinnedTo === root.id);
                const candidate = jointSystem._detectArmatureFromPool(candidatePool);
                if (jointSystem._isUniversalCharacterArmature?.(candidate)) {
                    detected = jointSystem._refreshDetectedArmatureReference?.(candidate) || candidate;
                    break;
                }
            }
        }

        if (!detected || typeof jointSystem._isUniversalCharacterArmature !== 'function' || !jointSystem._isUniversalCharacterArmature(detected)) {
            return null;
        }

        return { jointSystem, armature: detected };
    },

    _openUniversalCharacterDialogFromContextMenu(stagePos = null) {
        const jointSystem = window.app?.jointSystem;
        if (!jointSystem?.openUniversalCharacterDialog) return;
        jointSystem.openUniversalCharacterDialog(null, {
            stageX: Number.isFinite(stagePos?.x) ? stagePos.x : undefined
        });
    },

    _getSvgAfricanCharacterContext(hit) {
        const jointSystem = window.app?.jointSystem || window.jointSystem || null;
        if (!hit || !jointSystem?._resolveSvgAfricanArmature) return null;

        const allObjects = Array.isArray(this.objects) ? this.objects : [];
        const chain = [];
        const seen = new Set();
        let cursor = hit;
        while (cursor && cursor.id && !seen.has(cursor.id)) {
            chain.push(cursor);
            seen.add(cursor.id);
            cursor = cursor.pinnedTo && typeof this.getObjectById === 'function'
                ? this.getObjectById(cursor.pinnedTo)
                : null;
        }

        const poolById = new Map();
        const addWithDescendants = (obj) => {
            if (!obj?.id || poolById.has(obj.id)) return;
            poolById.set(obj.id, obj);
            allObjects
                .filter(child => child?.pinnedTo === obj.id)
                .forEach(addWithDescendants);
        };
        chain.forEach(addWithDescendants);
        if (!poolById.size) addWithDescendants(hit);

        const pool = Array.from(poolById.values());
        const detected = jointSystem._detectArmatureFromPool?.(pool)
            || (typeof jointSystem._detectArmature === 'function' ? jointSystem._detectArmature(hit) : null);
        const resolved = jointSystem._resolveSvgAfricanArmature(detected || { root: hit, parts: {} });
        const root = resolved?.root || hit;
        const isSvgAfrican = !!(
            root?._svgCharacter ||
            root?._svgAfricanPremiumAssetId ||
            root?._characterAppearanceProvider === 'svg-african-premium' ||
            hit?._svgCharacterPart ||
            hit?._svgAfricanPremiumAssetId
        );
        return isSvgAfrican && resolved?.root ? { jointSystem, armature: resolved } : null;
    },

    // Context menu
    showContextMenu(screenX, screenY, stagePos) {
        // Remove existing
        document.querySelector('.context-menu')?.remove();

        const hit = this.hitTest(stagePos.x, stagePos.y);
        const menu = document.createElement('div');
        menu.className = 'context-menu';

        const items = [];
        if (hit) {
            if (!this.selectedIds.includes(hit.id)) {
                this.select([hit.id]);
            }
            const groupIds = Array.isArray(this.groups?.[hit.groupId]) ? this.groups[hit.groupId] : [];
            const groupMembers = groupIds.map(id => this.getObjectById?.(id)).filter(Boolean);
            const hasAnims = (hit.animations && hit.animations.length > 0)
                || groupMembers.some(member => Array.isArray(member.animations) && member.animations.length > 0);
            const ucContext = this._getUniversalCharacterContext(hit);
            const svgAfricanContext = this._getSvgAfricanCharacterContext(hit);
            const characterStackContext = this.getCharacterStackBundleForObject?.(hit) || null;
            const poseContext = svgAfricanContext || ucContext;
            if (poseContext) {
                items.push(
                    { icon: 'fa-person-rays', label: 'Pose & Movement (Pose Armature)', action: () =>
                        poseContext.jointSystem.openArmaturePanel(poseContext.armature) },
                    { icon: 'fa-list-ol', label: 'Character Sequence', action: () =>
                        poseContext.jointSystem._openCharacterSequenceEditor?.(poseContext.armature) },
                    { divider: true }
                );
                if (poseContext.jointSystem._supportsIndependentSvgHeadTurn(poseContext.armature)) items.splice(2, 0,
                    { icon: 'fa-user', label: 'Head Turn', action: () => poseContext.jointSystem._openIndependentSvgHeadTurn(poseContext.armature) });
                items.splice(2, 0, { icon: 'fa-rotate', label: 'Body Turn', action: () => poseContext.jointSystem._openBodyTurnEditor(poseContext.armature) });
                if (window.app?._selectedAnimationRigs().length > 1) items.splice(2, 0,
                    { icon: 'fa-users', label: 'Choreograph Selected Characters', action: () => window.app._openStageAnimateTool('choreography') });
            }
            items.push(
                { icon: 'fa-i-cursor', label: 'Rename', action: () => this.renameObjectPrompt(hit) },
                { icon: 'fa-copy', label: 'Duplicate', action: () => this.duplicateSelected() },
                { icon: 'fa-trash', label: 'Delete', action: () => this.deleteSelected() },
                { divider: true },
                { icon: 'fa-clipboard', label: 'Copy', action: () => this.copySelected() },
                { icon: 'fa-list-alt', label: 'Copy Properties', action: () => this.copyProperties(hit) },
                { icon: 'fa-cut', label: 'Cut', action: () => this.cutSelected() },
                { icon: 'fa-paste', label: 'Paste', action: () => this.pasteFromClipboard(stagePos), disabled: !this._clipboard || this._clipboard.length === 0 },
                { icon: 'fa-image', label: 'Paste as Image', action: () => this.pasteAsImage() },
                { icon: 'fa-download', label: 'Save as Image', action: () => this.saveObjectAsImage(hit) },
                { icon: 'fa-vector-square', label: 'Save as SVG', action: () => this.saveObjectAsSVG(hit) },
                { icon: 'fa-file-export', label: 'Export Object', action: () => this.exportObjectJSON(hit) },
                { icon: 'fa-bookmark', label: 'Save as Template', action: () => this.saveObjectAsTemplate(hit) },
                { icon: 'fa-folder-plus', label: 'Save to Assets Library', action: () => this.saveObjectToAssetLibrary(hit) },
                { icon: 'fa-code', label: 'Save as SVG Template', action: () => this.saveObjectAsSVGTemplate(hit) },
                { icon: 'fa-puzzle-piece', label: 'Save as Icon', action: () => this.saveSelectedAsIcon() },
                { divider: true },
                { icon: 'fa-arrows-alt-h', label: 'Flip Horizontal', action: () => this.flipSelectedH() },
                { icon: 'fa-arrows-alt-v', label: 'Flip Vertical', action: () => this.flipSelectedV() },
                { divider: true },
                { icon: 'fa-level-up-alt', label: 'Bring Forward', action: () => this.bringForward() },
                { icon: 'fa-level-down-alt', label: 'Send Backward', action: () => this.sendBackward() },
                { divider: true },
                { icon: 'fa-object-group', label: 'Group', action: () => this.groupSelected() },
                { icon: 'fa-object-ungroup', label: 'Ungroup', action: () => this.ungroupSelected() },
            );

            if (characterStackContext) {
                items.push(
                    { divider: true },
                    { icon: 'fa-angles-up', label: 'Bring Character to Front', action: () => this.bringCharactersToFront() },
                    { icon: 'fa-angle-up', label: 'Move Character Forward', action: () => this.bringCharactersForward() },
                    { icon: 'fa-angle-down', label: 'Move Character Backward', action: () => this.sendCharactersBackward() },
                    { icon: 'fa-angles-down', label: 'Send Character to Back', action: () => this.sendCharactersToBack() }
                );
            }

            if (hit.type === 'image' && hit.imageElement) {
                items.splice(10, 0, {
                    icon: 'fa-crop-alt',
                    label: 'Auto-Crop',
                    action: () => this.autoCropImageObject(hit)
                });
            }

            // Add "Edit Group" / "Exit Group Edit" option when applicable
            if (hit.groupId && this.groups[hit.groupId]) {
                if (this._groupEditMode === hit.groupId) {
                    items.push(
                        { icon: 'fa-sign-out-alt', label: 'Exit Group Edit', action: () => this.exitGroupEditMode() }
                    );
                } else {
                    items.push(
                        { icon: 'fa-pencil-alt', label: 'Edit Group', action: () => this.enterGroupEditMode(hit.groupId) }
                    );
                }
            }

            // Group alignment options when in group edit mode
            if (this._groupEditMode && this.groups[this._groupEditMode]) {
                items.push(
                    { divider: true },
                    { icon: 'fa-align-left', label: 'Align Group Left', action: () => this.alignGroupObjects('left') },
                    { icon: 'fa-align-center', label: 'Align Group Center H', action: () => this.alignGroupObjects('center-h') },
                    { icon: 'fa-align-right', label: 'Align Group Right', action: () => this.alignGroupObjects('right') },
                    { icon: 'fa-arrow-up', label: 'Align Group Top', action: () => this.alignGroupObjects('top') },
                    { icon: 'fa-arrows-alt-v', label: 'Align Group Center V', action: () => this.alignGroupObjects('center-v') },
                    { icon: 'fa-arrow-down', label: 'Align Group Bottom', action: () => this.alignGroupObjects('bottom') },
                    { icon: 'fa-arrows-left-right', label: 'Distribute H', action: () => this.alignGroupObjects('distribute-h') },
                    { icon: 'fa-arrows-up-down', label: 'Distribute V', action: () => this.alignGroupObjects('distribute-v') }
                );
            }

            if (ucContext) {
                items.push(
                    { divider: true },
                    { icon: 'fa-table', label: 'Copy Whole Character Properties', action: () => this.copyCharacterProperties(ucContext.armature) },
                    { icon: 'fa-user-edit', label: 'Edit UC', action: () => ucContext.jointSystem.openUniversalCharacterEditor(ucContext.armature) }
                );
            }

            if (svgAfricanContext) {
                items.push(
                    { divider: true },
                    { icon: 'fa-user-edit', label: 'Edit SVG African Character', action: () => {
                        svgAfricanContext.jointSystem._currentArmature = svgAfricanContext.armature;
                        window.app?.openSvgAfricanCharacterLibrary?.({
                            mode: 'edit',
                            armature: svgAfricanContext.armature
                        });
                    } }
                );
            }

            items.push({ divider: true });
            if (hit.realistic3D) {
                const library = globalThis.Realistic3DLibrary;
                if (hit.animations?.some(clip => library?.canEdit(hit, clip))) {
                    items.unshift({icon:'fa-route', label:'Edit 3D Action or Route', action:() => library.editRecorded(window.app, hit)});
                }
                items.push({ icon: 'fa-cube', label: '3D Appearance and Actions', action: () => {
                    if (window.app) globalThis.Realistic3DLibrary?.open(window.app, hit);
                } });
            }
            items.push(
                { icon: 'fa-magic', label: 'Animate', submenu: true },
                { icon: 'fa-clone', label: 'Copy Animations', action: () => this.copyAnimations(), disabled: !hasAnims },
                { icon: 'fa-trash-alt', label: 'Remove All Animations', action: () => this.removeAllAnimationsFromObject(hit), disabled: !hasAnims },
                { icon: 'fa-paste', label: 'Paste Animations', action: () => this.pasteAnimations(), disabled: !this._copiedAnimations },
                { icon: 'fa-paint-roller', label: 'Paint Animations', action: () => this.startAnimationPaint(), disabled: !this._copiedAnimations },
                { divider: true },
                { icon: 'fa-lock', label: hit.locked ? 'Unlock' : 'Lock', action: () => { hit.locked = !hit.locked; this.updateObjectList(); } },
                { icon: 'fa-eye-slash', label: hit.visible ? 'Hide' : 'Show', action: () => { hit.visible = !hit.visible; this.updateObjectList(); this.stage.requestRender(); } },
                { divider: true },
                { icon: 'fa-crosshairs', label: 'Focus', action: () => this.stage.focusOnSelected() },
                { icon: 'fa-tag', label: 'Add Tag...', action: () => eventBus.emit('tag:add-to-object', hit) }
            );

            // Boolean operations when 2+ shapes selected
            const validBoolTypes = ['rectangle','circle','triangle','star','polygon','diamond','heart','arrow','doubleArrow','curvedArrow', ...StageObject.getCustomShapeTypes(), 'freeform','path','scribble'];
            const boolShapes = this.getSelectedObjects().filter(o => validBoolTypes.includes(o.type));
            if (boolShapes.length >= 2) {
                items.push(
                    { divider: true },
                    { icon: 'fa-plus-square', label: 'Union', action: () => this.booleanOp('union') },
                    { icon: 'fa-minus-square', label: 'Subtract', action: () => this.booleanOp('subtract') },
                    { icon: 'fa-th-large', label: 'Intersect', action: () => this.booleanOp('intersect') },
                    { icon: 'fa-object-ungroup', label: 'Combine (XOR)', action: () => this.booleanOp('combine') },
                    { icon: 'fa-puzzle-piece', label: 'Fragment', action: () => this.booleanOp('fragment') }
                );
            }
        } else {
            items.push(
                { icon: 'fa-paste', label: 'Paste', action: () => this.pasteFromClipboard(stagePos), disabled: !this._clipboard || this._clipboard.length === 0 },
                { icon: 'fa-clipboard', label: 'Paste Clipboard Image', action: () => this.pasteImageFromClipboard(stagePos) },
                { icon: 'fa-clone', label: 'Paste as Clone', action: () => this.pasteAsClone(stagePos) },
                { icon: 'fa-object-group', label: 'Select All', action: () => this.selectAll() },
                { divider: true },
                { icon: 'fa-user', label: 'Universal Character', action: () => this._openUniversalCharacterDialogFromContextMenu(stagePos) },
                { icon: 'fa-user-tie', label: 'Add SVG African Character', action: () => window.app?.openSvgAfricanCharacterLibrary?.({
                    mode: 'create',
                    placement: {
                        stageX: stagePos.x,
                        stageY: stagePos.y,
                        anchor: 'center'
                    }
                }) },
                { divider: true },
                { icon: 'fa-table', label: 'Copy All Properties', action: () => this.copyAllProperties() },
                { divider: true },
                { icon: 'fa-file-import', label: 'Import Object', action: () => this.importObjectJSON() },
                { icon: 'fa-boxes', label: 'Saved Templates', action: () => this.showRiggedTemplates() },
                { icon: 'fa-folder-open', label: 'Saved Assets', action: () => this.showAssetLibrary() },
                { divider: true },
                { icon: 'fa-tag', label: 'Add Position Tag', action: () => eventBus.emit('tag:add-position', stagePos) }
            );
        }

        menu.innerHTML = items.map(item => {
            if (item.divider) return '<div class="context-menu-divider"></div>';
            const disabledClass = item.disabled ? ' ctx-disabled' : '';
            if (item.submenu) {
                return `<div class="context-menu-item has-submenu${disabledClass}" data-action="${item.label}">
                    <i class="fas ${item.icon}"></i> ${item.label}
                    <i class="fas fa-chevron-right ctx-arrow"></i>
                </div>`;
            }
            return `<div class="context-menu-item${disabledClass}" data-action="${item.label}">
                <i class="fas ${item.icon}"></i> ${item.label}
            </div>`;
        }).join('');

        document.body.appendChild(menu);
        menu.style.left = Math.min(screenX, window.innerWidth - menu.offsetWidth) + 'px';
        menu.style.top = Math.min(screenY, window.innerHeight - menu.offsetHeight) + 'px';

        // Bind actions (non-submenu items)
        menu.querySelectorAll('.context-menu-item:not(.has-submenu)').forEach(el => {
            const action = items.find(i => i.label === el.dataset.action);
            if (action?.action) {
                el.addEventListener('click', () => {
                    action.action();
                    menu.remove();
                });
            }
        });

        // Build the Animate submenu
        const animateItem = menu.querySelector('.context-menu-item.has-submenu[data-action="Animate"]');
        if (animateItem) {
            this._buildAnimateSubmenu(animateItem, menu);
        }

        // Close on click outside
        const close = (e) => {
            if (!menu.contains(e.target) && !e.target.closest('.context-submenu')) {
                document.querySelectorAll('.context-menu, .context-submenu').forEach(m => m.remove());
                document.removeEventListener('mousedown', close);
            }
        };
        setTimeout(() => document.addEventListener('mousedown', close), 0);
    },

    /**
     * Build cascading Animate submenu: Entry / Exit / Emphasis categories,
     * each expanding to show individual animations.
     */
    _buildAnimateSubmenu(parentItem, rootMenu) {
        let catMenu = null;
        let catTimer = null;

        const showCatMenu = () => {
            clearTimeout(catTimer);
            // Remove any existing submenu
            document.querySelectorAll('.context-submenu').forEach(m => m.remove());

            catMenu = document.createElement('div');
            catMenu.className = 'context-submenu';

            const categories = [
                { key: 'entry', label: 'Entry', icon: 'fa-sign-in-alt' },
                { key: 'exit', label: 'Exit', icon: 'fa-sign-out-alt' },
                { key: 'emphasis', label: 'Emphasis', icon: 'fa-bolt' }
            ];

            catMenu.innerHTML = categories.map(cat =>
                `<div class="context-menu-item has-submenu" data-category="${cat.key}">
                    <i class="fas ${cat.icon}"></i> ${cat.label}
                    <i class="fas fa-chevron-right ctx-arrow"></i>
                </div>`
            ).join('');

            document.body.appendChild(catMenu);

            // Position to the right of the parent item
            const rect = parentItem.getBoundingClientRect();
            let left = rect.right + 2;
            let top = rect.top;
            // Flip if going offscreen
            if (left + 160 > window.innerWidth) left = rect.left - 162;
            if (top + catMenu.offsetHeight > window.innerHeight) top = window.innerHeight - catMenu.offsetHeight - 4;
            catMenu.style.left = left + 'px';
            catMenu.style.top = top + 'px';

            // Bind each category to show its animation list
            catMenu.querySelectorAll('.context-menu-item[data-category]').forEach(catItem => {
                this._buildCategorySubmenu(catItem, rootMenu);
            });
        };

        parentItem.addEventListener('mouseenter', showCatMenu);
        parentItem.addEventListener('click', showCatMenu);

        parentItem.addEventListener('mouseleave', (e) => {
            catTimer = setTimeout(() => {
                const sub = document.querySelector('.context-submenu');
                if (sub && !sub.matches(':hover') && !sub.querySelector(':hover')) {
                    document.querySelectorAll('.context-submenu').forEach(m => m.remove());
                }
            }, 200);
        });
    },

    /**
     * Build the animation list sub-submenu for a single category (entry/exit/emphasis).
     */
    _buildCategorySubmenu(catItem, rootMenu) {
        let animMenu = null;
        let animTimer = null;

        const showAnimMenu = () => {
            clearTimeout(animTimer);
            // Remove deeper submenus only (keep category menu)
            document.querySelectorAll('.context-submenu-anim').forEach(m => m.remove());

            const category = catItem.dataset.category;
            const lib = this.animations?.library;
            if (!lib) return;

            // Collect animations for this category
            const anims = [];
            for (const [key, def] of Object.entries(lib)) {
                if (def.category === category) {
                    anims.push({ key, name: def.name });
                }
            }
            if (anims.length === 0) return;

            animMenu = document.createElement('div');
            animMenu.className = 'context-submenu context-submenu-anim';
            animMenu.innerHTML = anims.map(a =>
                `<div class="context-menu-item" data-anim-key="${a.key}">
                    ${a.name}
                </div>`
            ).join('');

            document.body.appendChild(animMenu);

            // Position to the right of the category item
            const rect = catItem.getBoundingClientRect();
            let left = rect.right + 2;
            let top = rect.top;
            if (left + 160 > window.innerWidth) left = rect.left - 162;
            if (top + animMenu.offsetHeight > window.innerHeight) top = window.innerHeight - animMenu.offsetHeight - 4;
            animMenu.style.left = left + 'px';
            animMenu.style.top = top + 'px';

            // Clicking an animation: select it and open the side panel
            animMenu.querySelectorAll('.context-menu-item[data-anim-key]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const animKey = btn.dataset.animKey;
                    this._applyAnimationFromContext(animKey, category);
                    // Close all menus
                    document.querySelectorAll('.context-menu, .context-submenu').forEach(m => m.remove());
                });
            });
        };

        catItem.addEventListener('mouseenter', showAnimMenu);
        catItem.addEventListener('click', showAnimMenu);

        catItem.addEventListener('mouseleave', () => {
            animTimer = setTimeout(() => {
                const sub = document.querySelector('.context-submenu-anim');
                if (sub && !sub.matches(':hover')) sub.remove();
            }, 200);
        });
    },

    /**
     * When user picks an animation from the context menu,
     * open the right panel → Animate tab → correct sub-tab,
     * then select the specific animation so the settings panel appears.
     */
    _applyAnimationFromContext(animKey, category) {
        const rightPanel = document.getElementById('right-panel');
        const btnRight = document.getElementById('collapse-right');
        const togglePanel = () => {
            if (rightPanel && rightPanel.classList.contains('collapsed') && btnRight) {
                btnRight.click();
            }
        };

        // 1. Expand right panel
        togglePanel();

        // 2. Switch to Animations tab
        const animTab = rightPanel?.querySelector('.panel-tab[data-tab="animations"]');
        if (animTab) animTab.click();

        // 3. Switch to the correct sub-tab (entry/exit/emphasis → basic)
        const basicCategories = ['entry', 'exit', 'emphasis'];
        const subtab = basicCategories.includes(category) ? 'basic' : 'properties';
        const subtabBtn = document.querySelector(`.anim-subtab[data-subtab="${subtab}"]`);
        if (subtabBtn) subtabBtn.click();

        // 4. After panel expand animation, select the animation and scroll to it
        setTimeout(() => {
            // Select the animation in the engine (shows settings panel)
            if (this.animations) {
                this.animations.selectAnimation(animKey);
                // Highlight the matching button
                document.querySelectorAll('.anim-btn').forEach(b => b.classList.remove('selected'));
                const btn = document.querySelector(`.anim-btn[data-anim="${animKey}"]`);
                if (btn) {
                    btn.classList.add('selected');
                    btn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }
        }, 300);
    },

    async removeAllAnimationsFromObject(obj) {
        if (!obj) {
            Utils.showToast('This object has no animations', 'info');
            return false;
        }

        const groupIds = Array.isArray(this.groups?.[obj.groupId]) ? this.groups[obj.groupId] : [];
        const groupMembers = groupIds.map(id => this.getObjectById?.(id)).filter(Boolean);
        const targets = [obj, ...groupMembers].filter((item, index, arr) => arr.findIndex(other => other.id === item.id) === index);
        const animatedTargets = targets.filter(item => Array.isArray(item.animations) && item.animations.length > 0);

        const animationCount = animatedTargets.reduce((sum, item) => sum + item.animations.length, 0);
        if (!animationCount) {
            Utils.showToast('This object has no animations', 'info');
            return false;
        }
        const objectLabel = obj.name || 'this object';
        const confirmed = await Utils.showConfirm(
            `Remove all ${animationCount} animation${animationCount === 1 ? '' : 's'} from "${objectLabel}"?`,
            'Remove Animations'
        );
        if (!confirmed) return false;

        this.animations?.stop?.();
        eventBus.emit('history:push');

        animatedTargets.forEach(item => {
            item.animations = [];
            delete item._faceSetAppliedMotionKey;
            delete item._faceSetAppliedMotionSignature;
        });

        const timeline = window.app?.timeline;
        if (timeline && timeline.selectedAnimObjId === obj.id) {
            timeline.selectedAnimId = null;
            timeline.selectedAnimObjId = null;
        }

        this.animations?.calculateTotalDuration?.();
        this.animations?.updateAppliedAnimationsList?.();
        this.animations?.updateCodeOutput?.();
        eventBus.emit('timeline:update');
        this.updateObjectList();
        this.stage.requestRender();

        Utils.showToast(`Removed ${animationCount} animation${animationCount === 1 ? '' : 's'} from "${objectLabel}"`, 'success');
        return true;
    },

    // Serialize all objects
    toJSON() {
        return this.objects.map(o => o.toJSON());
    },

    // Load objects from data
    loadFromData(data) {
        this.objects = data.map(d => StageObject.fromJSON(d));
        StageObject.counter = this.objects.length + 1;
        this.select([]);
        this.updateObjectList();
        this.stage.requestRender();
    },


});
