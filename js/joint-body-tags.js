/**
 * Joint System — Body Tag editor
 * (split from joint-system.js for maintainability)
 */

JointSystem._bodySlicerFrontPoseLibrary = null;
JointSystem._bodySlicerFrontMovementLibrary = null;
JointSystem._convertHumanFrontAnglesToBodySlicerFrontAngles = function(angles = {}, context = {}) {
        const valueOf = (key) => Number.isFinite(angles?.[key]) ? Number(angles[key]) : null;
        const clamp = (value) => Math.max(-180, Math.min(180, Math.round(value * 1000) / 1000));
        const result = {};

        const convertArmChain = (prefix) => {
            const upper = valueOf(`${prefix}-upper-arm`);
            const fore = valueOf(`${prefix}-forearm`);
            const hand = valueOf(`${prefix}-hand`);
            if (upper == null && fore == null && hand == null) return;

            const u = upper ?? 0;
            const f = fore ?? 0;
            const h = hand ?? 0;
            const distalInfluence = Math.min(1, (Math.abs(f) + Math.abs(h)) / 180);
            const shoulderScale = 0.78 - (distalInfluence * 0.08);

            result[`${prefix}-upper-arm`] = clamp((u * shoulderScale) + (f * 0.10) + (h * 0.03));
            result[`${prefix}-forearm`] = clamp((f * 0.92) + (h * 0.14));
            result[`${prefix}-hand`] = clamp((h * 0.72) + (Math.sign(f || h || u) * Math.min(10, Math.abs(f) * 0.05)));
        };

        const convertLegChain = (prefix) => {
            const upper = valueOf(`${prefix}-upper-leg`);
            const lower = valueOf(`${prefix}-lower-leg`);
            const foot = valueOf(`${prefix}-foot`);
            if (upper == null && lower == null && foot == null) return;

            const u = upper ?? 0;
            const l = lower ?? 0;
            const f = foot ?? 0;

            result[`${prefix}-upper-leg`] = clamp((u * 0.90) + (l * 0.08));
            result[`${prefix}-lower-leg`] = clamp((l * 0.90) + (f * 0.12));
            result[`${prefix}-foot`] = clamp(f * 0.78);
        };

        if (valueOf('head') != null) result.head = clamp((valueOf('head') ?? 0) * 0.92);
        if (valueOf('torso') != null) result.torso = clamp((valueOf('torso') ?? 0) * 0.82);

        convertArmChain('r');
        convertArmChain('l');
        convertLegChain('r');
        convertLegChain('l');

        return JointSystem._tuneBodySlicerFrontAngles(result, context);
    }

JointSystem._tuneBodySlicerFrontAngles = function(converted = {}, context = {}) {
        const out = { ...converted };
        const id = `${context?.key || ''} ${context?.name || ''}`.toLowerCase();
        const scale = (keys, factor) => {
            keys.forEach(key => {
                if (!Number.isFinite(out[key])) return;
                out[key] = Math.max(-180, Math.min(180, Math.round(out[key] * factor * 1000) / 1000));
            });
        };

        if (/(hands-on-hips|confident)/.test(id)) {
            scale(['r-upper-arm', 'l-upper-arm'], 0.76);
            scale(['r-forearm', 'l-forearm'], 1.05);
            scale(['r-hand', 'l-hand'], 0.86);
        } else if (/wave/.test(id)) {
            scale(['r-upper-arm', 'l-upper-arm'], 0.80);
            scale(['r-forearm', 'l-forearm'], 0.96);
            scale(['r-hand', 'l-hand'], 0.88);
        } else if (/clap/.test(id)) {
            scale(['r-upper-arm', 'l-upper-arm'], 0.74);
            scale(['r-forearm', 'l-forearm'], 0.92);
            scale(['r-hand', 'l-hand'], 0.84);
        } else if (/bow/.test(id)) {
            scale(['torso'], 0.68);
            scale(['r-upper-arm', 'l-upper-arm'], 0.90);
        } else if (/(punch|uppercut)/.test(id)) {
            scale(['torso'], 0.62);
            scale(['r-upper-arm', 'l-upper-arm'], 0.84);
            scale(['r-forearm', 'l-forearm'], 0.92);
        } else if (/(guard|boxing|defense|defence)/.test(id)) {
            scale(['torso'], 0.78);
            scale(['r-upper-arm', 'l-upper-arm'], 0.82);
            scale(['r-forearm', 'l-forearm'], 0.94);
            scale(['r-hand', 'l-hand'], 0.88);
        } else if (/kick/.test(id)) {
            scale(['r-upper-leg', 'l-upper-leg'], 0.92);
            scale(['r-lower-leg', 'l-lower-leg'], 0.88);
            scale(['r-foot', 'l-foot'], 0.82);
        }

        return out;
    }

JointSystem._buildBodySlicerFrontPoseLibrary = function() {
        if (JointSystem._bodySlicerFrontPoseLibrary) {
            return JointSystem._bodySlicerFrontPoseLibrary;
        }

        JointSystem._bodySlicerFrontPoseLibrary = HUMAN_FRONT_STATIC_POSES.map(pose => {
            const keyBase = String(pose.id || pose.name || 'pose')
                .replace(/^builtin-human-front-/, '');
            const poseId = `builtin-body-slicer-front-${JointSystem._slugifyArmatureCatalogKey(keyBase, 'pose')}`;
            return {
                ...pose,
                id: poseId,
                presetKey: 'body-slicer-front',
                builtIn: true,
                contacts: {},
                angles: JointSystem._convertHumanFrontAnglesToBodySlicerFrontAngles(pose.angles || {}, {
                    kind: 'pose',
                    key: pose.id || poseId,
                    name: pose.name
                })
            };
        });

        return JointSystem._bodySlicerFrontPoseLibrary;
    }

JointSystem._buildBodySlicerFrontMovementLibrary = function() {
        if (JointSystem._bodySlicerFrontMovementLibrary) {
            return JointSystem._bodySlicerFrontMovementLibrary;
        }

        JointSystem._bodySlicerFrontMovementLibrary = JointMovements.getAll()
            .filter(move => Array.isArray(move?.presetKeys) && move.presetKeys.includes('human-front'))
            .map(move => {
                const keyBase = String(move.key || move.name || 'move').replace(/^hf-/, '');
                const moveKey = `bslf-${JointSystem._slugifyArmatureCatalogKey(keyBase, 'move')}`;
                return {
                    ...move,
                    key: moveKey,
                    presetKeys: ['body-slicer-front'],
                    contacts: {},
                    keyframes: (move.keyframes || []).map(kf => ({
                        ...kf,
                        contacts: undefined,
                        angles: JointSystem._convertHumanFrontAnglesToBodySlicerFrontAngles(kf.angles || {}, {
                            kind: 'move',
                            key: move.key || moveKey,
                            name: move.name,
                            phase: kf.t
                        })
                    }))
                };
            });

        return JointSystem._bodySlicerFrontMovementLibrary;
    }


Object.assign(JointSystem.prototype, {

    // ═══════════════════════════════════════════════════════════════

    toggleBodyTagMode() {
        if (this._bodyTagActive) {
            this._exitBodyTagMode();
            return false;
        }
        return this.showBodyTagEditor();
    },

    showBodyTagEditor() {
        const context = this._getBodyTagContext();
        if (!context) return false;
        if (this._bodyTagActive) this._exitBodyTagMode(true);
        return this._enterBodyTagMode(context);
    },

    _enterBodyTagMode(context) {
        if (!context?.objects?.length) return false;

        this._bodyTagContext = context;
        this._bodyTagActive = true;
        this._bodyTagDrag = null;
        this._bodyTagAddMode = null;
        this._bodyTagHoverRef = null;

        this._relocateBodyTagsToMatchedParts(context);

        if (!this._countBodyTagsForContext(context) && context.presetKey) {
            this._ensureBodyTagsForContext(context, context.presetKey, { pushHistory: false, silent: true });
        }

        this._buildBodyTagPanel();

        const entries = this._getBodyTagEntries(context);
        this._bodyTagSelectedRef = entries[0]
            ? { objectId: entries[0].obj.id, tagId: entries[0].tag.id }
            : null;
        this._updateBodyTagPanel();

        this._bodyTagOverlayHandler = (ctx) => {
            if (this._bodyTagActive) this._drawBodyTagHandles(ctx);
        };
        eventBus.on('stage:render-overlay', this._bodyTagOverlayHandler);

        this._bodyTagMouseDown = (e) => this._onBodyTagMouseDown(e);
        this._bodyTagMouseMove = (e) => this._onBodyTagMouseMove(e);
        this._bodyTagMouseUp = (e) => this._onBodyTagMouseUp(e);
        this.stage.canvas.addEventListener('mousedown', this._bodyTagMouseDown, true);
        this.stage.canvas.addEventListener('mousemove', this._bodyTagMouseMove, true);
        this.stage.canvas.addEventListener('mouseup', this._bodyTagMouseUp, true);
        this.stage.canvas.addEventListener('mouseleave', this._bodyTagMouseUp, true);

        const btn = document.getElementById('btn-joint-body-tags');
        if (btn) btn.classList.add('active');

        this.stage.requestRender();
        Utils.showToast('Body Tags ON — pick a preset, auto-tag the character, then drag any dot to refine it', 'info');
        return true;
    },

    _exitBodyTagMode(quiet = false) {
        if (!this._bodyTagActive && !document.getElementById('joint-body-tags-panel')) return;

        this._bodyTagActive = false;
        this._bodyTagDrag = null;
        this._bodyTagAddMode = null;
        this._bodyTagHoverRef = null;

        if (this._bodyTagOverlayHandler) {
            eventBus.off('stage:render-overlay', this._bodyTagOverlayHandler);
            this._bodyTagOverlayHandler = null;
        }
        if (this._bodyTagMouseDown) {
            this.stage.canvas.removeEventListener('mousedown', this._bodyTagMouseDown, true);
            this.stage.canvas.removeEventListener('mousemove', this._bodyTagMouseMove, true);
            this.stage.canvas.removeEventListener('mouseup', this._bodyTagMouseUp, true);
            this.stage.canvas.removeEventListener('mouseleave', this._bodyTagMouseUp, true);
            this._bodyTagMouseDown = null;
            this._bodyTagMouseMove = null;
            this._bodyTagMouseUp = null;
        }

        document.getElementById('joint-body-tags-panel')?.remove();
        const btn = document.getElementById('btn-joint-body-tags');
        if (btn) btn.classList.remove('active');

        this._bodyTagContext = null;
        this._bodyTagSelectedRef = null;
        this.stage.canvas.style.cursor = '';
        this.stage.requestRender();
        if (!quiet) Utils.showToast('Body Tags OFF', 'info');
    },

    _bodyTagRefEquals(a, b) {
        return !!a && !!b && a.objectId === b.objectId && a.tagId === b.tagId;
    },

    _getBodyTagPreset(presetKey) {
        const canonicalKey = presetKey === 'body-slicer-front'
            ? 'human-front'
            : (presetKey === 'body-slicer-side' ? 'human-side' : presetKey);
        return BODY_TAG_PRESETS.find(p => p.key === canonicalKey)
            || BODY_TAG_PRESETS.find(p => p.key === 'generic-character')
            || BODY_TAG_PRESETS[0];
    },

    _relocateBodyTagsToMatchedParts(context = this._bodyTagContext) {
        if (!context?.objects?.length || !context.partMap) return 0;

        const nextTagsByObjectId = new Map(context.objects.map(obj => [obj.id, []]));
        let movedCount = 0;

        context.objects.forEach(obj => {
            const fallbackPartKey = obj.bodyPartData?.partKey || null;
            (Array.isArray(obj.bodyTags) ? obj.bodyTags : []).forEach(tag => {
                const targetPartKey = tag?.targetPartKey || fallbackPartKey;
                const targetObj = targetPartKey ? context.partMap[targetPartKey] : null;
                const owner = targetObj || obj;
                if (owner.id !== obj.id) movedCount += 1;
                nextTagsByObjectId.get(owner.id)?.push(tag);
            });
        });

        if (!movedCount) return 0;

        context.objects.forEach(obj => {
            obj.bodyTags = (nextTagsByObjectId.get(obj.id) || []).map(tag => StageObject.normalizeBodyTag(tag));
        });

        return movedCount;
    },

    _getBodyTagCategoryColor(category) {
        return BODY_TAG_CATEGORY_COLORS[category] || BODY_TAG_CATEGORY_COLORS.body;
    },

    _slugifyBodyTagName(name) {
        return String(name || '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'body-tag';
    },

    _inferBodyTagCategory(obj) {
        const partKey = String(obj?._armatureRoleKey || obj?._armaturePartKey || obj?.bodyPartData?.partKey || obj?.name || '').toLowerCase();
        if (partKey.includes('head') || partKey.includes('face') || partKey.includes('neck')) return 'face';
        if (partKey.includes('hand') || partKey.includes('foot') || partKey.includes('leg') || partKey.includes('arm') || partKey.includes('wing') || partKey.includes('tail')) return 'extremity';
        if (partKey.includes('torso') || partKey.includes('body') || partKey.includes('hip') || partKey.includes('chest')) return 'torso';
        return 'custom';
    },

    _isBodyTagAddressableObject(obj) {
        return !!(obj?.bodyPartData?.partKey || obj?._armatureRoleKey || obj?._armaturePartKey);
    },

    _getBodyTagObjectRoleKey(obj) {
        return String(obj?._armatureRoleKey || obj?._armaturePartKey || obj?.bodyPartData?.partKey || '').toLowerCase().trim() || null;
    },

    _getBodyTagAliasPartKeysForRole(roleKey, presetKey = null) {
        const role = String(roleKey || '').toLowerCase().trim();
        const canonicalPresetKey = this._getBodyTagPreset(presetKey || 'generic-character').key;
        if (!role) return [];

        const aliases = new Set([role]);
        const addAll = (keys = []) => keys.forEach(key => key && aliases.add(key));

        switch (role) {
            case 'torso':
            case 'body':
                addAll(['torso', 'body']);
                break;
            case 'head-neck':
            case 'head':
            case 'neck':
                addAll(['head', 'neck', 'head-neck']);
                break;
            case 'right-arm':
            case 'r-arm':
                addAll(['r-arm', 'r-upper-arm', 'r-forearm', 'r-hand']);
                if (canonicalPresetKey === 'human-side') addAll(['hand', 'arm']);
                break;
            case 'left-arm':
            case 'l-arm':
                addAll(['l-arm', 'l-upper-arm', 'l-forearm', 'l-hand']);
                break;
            case 'right-leg':
            case 'r-leg':
                addAll(['r-leg', 'r-upper-leg', 'r-lower-leg', 'r-foot']);
                if (canonicalPresetKey === 'human-side') addAll(['foot', 'leg']);
                break;
            case 'left-leg':
            case 'l-leg':
                addAll(['l-leg', 'l-upper-leg', 'l-lower-leg', 'l-foot']);
                break;
            case 'front-arm':
                addAll(['front-arm', 'arm', 'hand']);
                break;
            case 'back-arm':
                addAll(['back-arm', 'arm', 'hand']);
                break;
            case 'front-leg':
                addAll(['front-leg', 'leg', 'foot']);
                break;
            case 'back-leg':
                addAll(['back-leg', 'leg', 'foot']);
                break;
            default:
                break;
        }

        return Array.from(aliases);
    },

    _buildBodyTagArmatureLayout(objects) {
        const armature = this._detectArmatureFromPool?.(objects);
        if (!armature?.root) return null;

        const presetKey = this._armatureUsesHumanFrontCatalog?.(armature)
            ? 'human-front'
            : (this._armatureUsesHumanSideCatalog?.(armature) ? 'human-side' : 'generic-character');
        const preset = JointPresets.getAll().find(candidate => candidate.key === presetKey) || null;
        const partMap = {};

        this._getArmatureObjects(armature).forEach(obj => {
            this._getBodyTagAliasPartKeysForRole(this._getBodyTagObjectRoleKey(obj), presetKey).forEach(alias => {
                if (!partMap[alias]) partMap[alias] = obj;
            });
        });

        const matchedCount = (preset?.parts || []).reduce((count, part) => count + (partMap[part.partKey] ? 1 : 0), 0);
        return {
            score: matchedCount ? (matchedCount * 30) + (partMap.torso ? 10 : 0) : 0,
            presetKey,
            partMap,
            matchedCount,
            totalParts: preset?.parts?.length || Object.keys(partMap).length,
            inferred: false,
            rootPartKey: 'torso'
        };
    },

    _inferBodyTagLayoutFromObjects(objects) {
        const uniqueObjects = Array.from(new Map((objects || []).filter(Boolean).map(obj => [obj.id, obj])).values());
        if (!uniqueObjects.length) return null;

        const armatureLayout = this._buildBodyTagArmatureLayout(uniqueObjects);
        if (armatureLayout?.matchedCount) {
            return armatureLayout;
        }

        const explicitPresetCounts = {};
        uniqueObjects.forEach(obj => {
            if (obj.bodyPartData?.charType) {
                explicitPresetCounts[obj.bodyPartData.charType] = (explicitPresetCounts[obj.bodyPartData.charType] || 0) + 1;
            }
        });

        let best = {
            score: -1,
            presetKey: null,
            partMap: {},
            matchedCount: 0,
            totalParts: 0,
            inferred: false,
            rootPartKey: null
        };

        JointPresets.getAll().forEach(preset => {
            const presetPartKeys = new Set(preset.parts.map(part => part.partKey));
            const presetPartMap = {};
            const usedIds = new Set();

            uniqueObjects.forEach(obj => {
                this._getBodyTagAliasPartKeysForRole(this._getBodyTagObjectRoleKey(obj), preset.key).forEach(explicitPartKey => {
                    if (presetPartKeys.has(explicitPartKey) && !presetPartMap[explicitPartKey]) {
                        presetPartMap[explicitPartKey] = obj;
                        usedIds.add(obj.id);
                    }
                });
            });

            const unmatchedObjects = uniqueObjects.filter(obj => !usedIds.has(obj.id));
            const remainingParts = preset.parts.filter(part => !presetPartMap[part.partKey]);
            const fuzzyMatches = this._matchStageToParts(unmatchedObjects, remainingParts);
            Object.keys(fuzzyMatches).forEach(partKey => {
                presetPartMap[partKey] = fuzzyMatches[partKey];
            });

            const matchedCount = Object.keys(presetPartMap).length;
            if (!matchedCount) return;

            const rootPartKey = preset.parts.find(part => !part.parentPartKey)?.partKey || null;
            const score = matchedCount * 20
                + (presetPartMap[rootPartKey] ? 5 : 0)
                + ((explicitPresetCounts[preset.key] || 0) * 10);

            if (score > best.score) {
                best = {
                    score,
                    presetKey: preset.key,
                    partMap: presetPartMap,
                    matchedCount,
                    totalParts: preset.parts.length,
                    inferred: (explicitPresetCounts[preset.key] || 0) === 0,
                    rootPartKey
                };
            }
        });

        return best.score >= 0 ? best : null;
    },

    _getBodyTagCharacterGroups() {
        const parts = (this.objects.objects || []).filter(obj => this._isBodyTagAddressableObject(obj));
        if (!parts.length) return [];

        const byId = new Map(parts.map(obj => [obj.id, obj]));
        const links = new Map(parts.map(obj => [obj.id, new Set()]));

        parts.forEach(obj => {
            if (obj.pinnedTo && byId.has(obj.pinnedTo)) {
                links.get(obj.id).add(obj.pinnedTo);
                links.get(obj.pinnedTo).add(obj.id);
            }
        });

        const groups = [];
        const visited = new Set();
        parts.forEach(obj => {
            if (visited.has(obj.id)) return;
            const stack = [obj.id];
            const group = [];
            while (stack.length) {
                const id = stack.pop();
                if (visited.has(id)) continue;
                visited.add(id);
                const current = byId.get(id);
                if (!current) continue;
                group.push(current);
                (links.get(id) || []).forEach(nextId => {
                    if (!visited.has(nextId)) stack.push(nextId);
                });
            }
            if (group.length) groups.push(group);
        });

        return groups;
    },

    _buildBodyTagContextFromObjects(objects) {
        const uniqueObjects = Array.from(new Map((objects || []).filter(Boolean).map(obj => [obj.id, obj])).values());
        if (!uniqueObjects.length) return null;

        const inferredLayout = this._inferBodyTagLayoutFromObjects(uniqueObjects);
        const partMap = inferredLayout?.partMap || {};
        const presetKey = inferredLayout?.presetKey || null;
        const matchedIds = new Set(Object.values(partMap).filter(Boolean).map(obj => obj.id));
        const hasInternalPins = uniqueObjects.some(obj => obj.pinnedTo && uniqueObjects.some(candidate => candidate.id === obj.pinnedTo));
        const rootObj = (inferredLayout?.rootPartKey && partMap[inferredLayout.rootPartKey])
            || uniqueObjects.find(obj => obj.bodyPartData?.partKey && !obj.pinnedTo)
            || uniqueObjects.find(obj => obj.bodyPartData?.partKey)
            || uniqueObjects[0];

        return {
            objects: uniqueObjects,
            partMap,
            rootObj,
            presetKey,
            isAssembled: hasInternalPins,
            sourceMode: hasInternalPins ? 'assembled' : (matchedIds.size >= 2 ? 'loose-parts' : 'single-object'),
            matchedPartCount: inferredLayout?.matchedCount || 0,
            totalPresetParts: inferredLayout?.totalParts || 0,
            unmatchedObjectCount: Math.max(0, uniqueObjects.length - matchedIds.size),
            inferredPreset: !!inferredLayout?.inferred
        };
    },

    _pickBodyTagContext(candidateContexts = []) {
        return candidateContexts
            .filter(Boolean)
            .sort((a, b) => {
                const matchedDelta = (b.matchedPartCount || 0) - (a.matchedPartCount || 0);
                if (matchedDelta !== 0) return matchedDelta;
                const objectDelta = (b.objects?.length || 0) - (a.objects?.length || 0);
                if (objectDelta !== 0) return objectDelta;
                return (a.unmatchedObjectCount || 0) - (b.unmatchedObjectCount || 0);
            })[0] || null;
    },

    _getExpandedBodyTagContextForObject(anchorObj) {
        if (!anchorObj) return null;

        const selectedArmature = this._detectSelectedArmature?.();
        if (selectedArmature?.root?.id) {
            const armatureObjects = this._getArmatureObjects(selectedArmature).filter(Boolean);
            const armatureContext = this._buildBodyTagContextFromObjects(armatureObjects);
            if (armatureContext?.matchedPartCount) {
                return armatureContext;
            }
        }

        const visibleObjects = (this.objects.objects || []).filter(obj => obj?.visible !== false);
        const visibleBodyParts = visibleObjects.filter(obj => this._isBodyTagAddressableObject(obj));
        const candidateContexts = [
            this._buildBodyTagContextFromObjects([anchorObj])
        ];

        if (anchorObj.groupId) {
            const groupedObjects = visibleObjects.filter(obj => obj?.groupId && obj.groupId === anchorObj.groupId);
            if (groupedObjects.some(obj => obj?.bodyPartData?.partKey)) {
                candidateContexts.push(this._buildBodyTagContextFromObjects(groupedObjects));
            }
        }

        if (this._isBodyTagAddressableObject(anchorObj)) {
            const connectedGroup = this._getBodyTagCharacterGroups()
                .find(group => group.some(obj => obj.id === anchorObj.id));
            if (connectedGroup?.length > 1) {
                candidateContexts.push(this._buildBodyTagContextFromObjects(connectedGroup));
            }

            const anchorPresetKey = this._getBodyTagPreset(anchorObj.bodyPartData?.charType || null).key;
            const samePresetObjects = visibleBodyParts.filter(obj => {
                const objPresetKey = this._getBodyTagPreset(obj.bodyPartData?.charType || null).key;
                return objPresetKey === anchorPresetKey;
            });
            if (samePresetObjects.length > 1) {
                candidateContexts.push(this._buildBodyTagContextFromObjects(samePresetObjects));
            }
        }

        return this._pickBodyTagContext(candidateContexts);
    },

    _getBodyTagContext(silent = false) {
        const selected = this.objects.getSelectedObjects().filter(obj => obj.visible !== false);
        const groups = this._getBodyTagCharacterGroups();
        const selectedBodyParts = selected.filter(obj => obj.bodyPartData?.partKey);

        if (selectedBodyParts.length) {
            const group = groups.find(candidate => candidate.some(obj => obj.id === selectedBodyParts[0].id));
            const allSelectedInSameGroup = group
                ? selected.every(obj => !obj.bodyPartData?.partKey || group.some(member => member.id === obj.id))
                : false;
            if (group && allSelectedInSameGroup) {
                return this._buildBodyTagContextFromObjects(group);
            }
        }

        if (selected.length > 1) {
            return this._buildBodyTagContextFromObjects(selected);
        }

        if (selected.length === 1) {
            return this._getExpandedBodyTagContextForObject(selected[0]);
        }

        if (groups.length === 1) {
            return this._buildBodyTagContextFromObjects(groups[0]);
        }

        if (!silent) {
            if (groups.length > 1) {
                Utils.showToast('Select one character or one body-part object first to edit Body Tags', 'info');
            } else {
                Utils.showToast('Select a character image or assembled body part first', 'warning');
            }
        }
        return null;
    },

    _collectBodyTagEntries(objects) {
        const entries = [];
        (objects || []).forEach(obj => {
            (Array.isArray(obj.bodyTags) ? obj.bodyTags : []).forEach(tag => {
                const world = this._getObjectWorldPoint(obj, tag.x ?? 0.5, tag.y ?? 0.5);
                entries.push({
                    obj,
                    tag,
                    worldX: world.x,
                    worldY: world.y,
                    partKey: tag.targetPartKey || obj.bodyPartData?.partKey || null
                });
            });
        });
        return entries;
    },

    _getBodyTagEntries(context = this._bodyTagContext) {
        if (!context?.objects?.length) return [];
        const entries = this._collectBodyTagEntries(context.objects);
        const objectOrder = new Map((context.objects || []).map((obj, index) => [obj.id, index]));
        const partOrder = new Map();
        const tagOrder = new Map();
        const preset = context.presetKey ? JointPresets.getAll().find(candidate => candidate.key === context.presetKey) : null;
        const tagPreset = context.presetKey ? this._getBodyTagPreset(context.presetKey) : null;

        (preset?.parts || []).forEach((part, index) => partOrder.set(part.partKey, index));
        (tagPreset?.tags || []).forEach((tag, index) => tagOrder.set(tag.key, index));

        return entries.sort((a, b) => {
            const aPart = partOrder.has(a.partKey) ? partOrder.get(a.partKey) : 1000 + (objectOrder.get(a.obj.id) || 0);
            const bPart = partOrder.has(b.partKey) ? partOrder.get(b.partKey) : 1000 + (objectOrder.get(b.obj.id) || 0);
            if (aPart !== bPart) return aPart - bPart;

            const aTag = tagOrder.has(a.tag.key) ? tagOrder.get(a.tag.key) : 1000;
            const bTag = tagOrder.has(b.tag.key) ? tagOrder.get(b.tag.key) : 1000;
            if (aTag !== bTag) return aTag - bTag;

            return String(a.tag.name || '').localeCompare(String(b.tag.name || ''));
        });
    },

    _findBodyTagEntryByRef(ref, context = this._bodyTagContext) {
        if (!ref) return null;
        return this._getBodyTagEntries(context).find(entry =>
            entry.obj.id === ref.objectId && entry.tag.id === ref.tagId
        ) || null;
    },

    _selectBodyTag(ref, options = {}) {
        this._bodyTagSelectedRef = ref ? { objectId: ref.objectId, tagId: ref.tagId } : null;
        const entry = this._findBodyTagEntryByRef(this._bodyTagSelectedRef);
        if (entry && options.selectObject !== false) {
            this.objects.select([entry.obj.id]);
        }
        this._updateBodyTagPanel();
        this.stage.requestRender();
    },

    _countBodyTagsForContext(context = this._bodyTagContext) {
        if (!context?.objects?.length) return 0;
        return context.objects.reduce((sum, obj) => sum + ((Array.isArray(obj.bodyTags) ? obj.bodyTags.length : 0)), 0);
    },

    _ensureBodyTagsForContext(context, presetKey, options = {}) {
        if (!context?.objects?.length || !presetKey) return false;
        const hasTags = context.objects.some(obj => Array.isArray(obj.bodyTags) && obj.bodyTags.length > 0);
        if (hasTags) return false;
        return this._applyBodyTagTemplate(presetKey, { ...options, context });
    },

    _applyBodyTagTemplate(presetKey, options = {}) {
        const context = options.context || this._bodyTagContext || this._getBodyTagContext(true);
        const preset = this._getBodyTagPreset(presetKey);
        if (!context?.objects?.length || !preset) return false;

        context.objects.forEach(obj => {
            const existing = Array.isArray(obj.bodyTags) ? obj.bodyTags : [];
            obj.bodyTags = existing.filter(tag => !(tag?.builtIn && tag.sourcePreset === preset.key));
        });

        let addedCount = 0;
        const touchedObjectIds = new Set();
        preset.tags.forEach(def => {
            let targetObj = def.partKey ? context.partMap[def.partKey] : null;
            if (!targetObj && context.objects.length === 1) targetObj = context.rootObj;
            if (!targetObj) return;

            const tag = StageObject.normalizeBodyTag({
                key: def.key,
                name: def.name,
                category: def.category || 'body',
                x: def.x,
                y: def.y,
                color: def.color || this._getBodyTagCategoryColor(def.category),
                builtIn: true,
                sourcePreset: preset.key,
                targetPartKey: def.partKey || targetObj.bodyPartData?.partKey || null
            });

            targetObj.bodyTags = [...(Array.isArray(targetObj.bodyTags) ? targetObj.bodyTags : []), tag];
            addedCount++;
            touchedObjectIds.add(targetObj.id);
        });

        if (!addedCount) {
            if (!options.silent) {
                Utils.showToast('No matching parts found for that preset. Select an assembled character or named loose parts first.', 'warning');
            }
            return false;
        }

        context.presetKey = preset.key;
        this._bodyTagSelectedRef = null;
        this._bodyTagHoverRef = null;
        if (options.pushHistory !== false) {
            eventBus.emit('history:push');
        }
        eventBus.emit('tags:updated');
        this.stage.requestRender();
        if (this._bodyTagActive) this._updateBodyTagPanel();
        if (!options.silent) {
            Utils.showToast(`Applied ${addedCount} Body Tags across ${touchedObjectIds.size} part${touchedObjectIds.size === 1 ? '' : 's'}`, 'success');
        }
        return true;
    },

    _clearBodyTags(options = {}) {
        const context = options.context || this._bodyTagContext;
        if (!context?.objects?.length) return;
        context.objects.forEach(obj => { obj.bodyTags = []; });
        this._bodyTagSelectedRef = null;
        this._bodyTagHoverRef = null;
        eventBus.emit('tags:updated');
        if (options.pushHistory !== false) eventBus.emit('history:push');
        this.stage.requestRender();
        this._updateBodyTagPanel();
        if (!options.silent) Utils.showToast('Cleared Body Tags for the current character', 'info');
    },

    _deleteBodyTagByRef(ref, options = {}) {
        const entry = this._findBodyTagEntryByRef(ref);
        if (!entry) return;
        entry.obj.bodyTags = (entry.obj.bodyTags || []).filter(tag => tag.id !== entry.tag.id);
        if (this._bodyTagRefEquals(this._bodyTagSelectedRef, ref)) this._bodyTagSelectedRef = null;
        if (this._bodyTagRefEquals(this._bodyTagHoverRef, ref)) this._bodyTagHoverRef = null;
        eventBus.emit('tags:updated');
        if (options.pushHistory !== false) eventBus.emit('history:push');
        this.stage.requestRender();
        this._updateBodyTagPanel();
    },

    _startAddBodyTag() {
        const name = window.prompt('New Body Tag name:', 'Custom Tag');
        if (!name) return;
        this._bodyTagAddMode = { name: name.trim() };
        this.stage.canvas.style.cursor = 'crosshair';
        this._updateBodyTagPanel();
        Utils.showToast(`Click on the character to place "${name.trim()}"`, 'info');
    },

    _buildBodyTagPanel() {
        document.getElementById('joint-body-tags-panel')?.remove();

        const context = this._bodyTagContext;
        const presetKey = this._getBodyTagPreset(context?.presetKey || 'generic-character').key;
        const presets = BODY_TAG_PRESETS;
        const panel = document.createElement('div');
        panel.id = 'joint-body-tags-panel';
        panel.className = 'joint-assembly-panel body-tags-panel';
        panel.innerHTML = `
            <div class="ja-header" data-draggable="true">
                <i class="fas fa-location-dot"></i> Body Tags
                ${context?.presetKey ? `<span class="ja-preset-badge">${this._escapeHtml(this._friendlyPresetName(context.presetKey))}</span>` : ''}
                <button class="ja-close" id="body-tags-close" title="Close"><i class="fas fa-times"></i></button>
            </div>
            <div class="ja-body body-tags-body">
                <div class="jtune-card btags-guide-card">
                    <div class="jtune-section-title">Quick Start</div>
                    <div class="btags-hint">Select one assembled body part to tag the full character, or select multiple loose body parts first. Auto-Tag uses the chosen preset and detected part names to place editable landmarks.</div>
                    <div class="btags-guide-steps">
                        <span>1. Select character or parts</span>
                        <span>2. Choose preset</span>
                        <span>3. Auto-Tag Parts</span>
                        <span>4. Drag dots to refine</span>
                    </div>
                    <div id="body-tags-context" class="btags-context"></div>
                </div>
                <div class="btags-toolbar">
                    <select id="body-tag-preset" class="jpl-input">
                        ${presets.map(p => `<option value="${p.key}" ${p.key === presetKey ? 'selected' : ''}>${this._escapeHtml(p.name)}</option>`).join('')}
                    </select>
                    <button id="body-tags-auto" class="btn-small ja-btn-green"><i class="fas fa-wand-magic-sparkles"></i> Auto-Tag Parts</button>
                    <button id="body-tags-add" class="btn-small ja-btn-blue"><i class="fas fa-plus"></i> Add Custom</button>
                    <button id="body-tags-clear" class="btn-small"><i class="fas fa-trash"></i> Clear</button>
                </div>
                <div id="body-tags-status" class="btags-status"></div>
                <div class="jtune-card">
                    <div class="jtune-section-title">Selected Tag</div>
                    <div id="body-tag-detail" class="jtune-detail"><div class="jtune-empty">No tag selected</div></div>
                    <div id="body-tag-fields" class="jtune-grid hidden">
                        <label class="jtune-field">
                            <span class="jtune-field-label">Relative X</span>
                            <input type="number" id="body-tag-x" min="0" max="1" step="0.01" class="jtune-input">
                        </label>
                        <label class="jtune-field">
                            <span class="jtune-field-label">Relative Y</span>
                            <input type="number" id="body-tag-y" min="0" max="1" step="0.01" class="jtune-input">
                        </label>
                    </div>
                    <div class="jtune-actions">
                        <button id="body-tag-center" class="btn-small"><i class="fas fa-bullseye"></i> Center On Part</button>
                        <button id="body-tag-delete" class="btn-small"><i class="fas fa-trash"></i> Delete</button>
                    </div>
                </div>
                <div class="jtune-card">
                    <div class="jtune-section-title">Character Tags</div>
                    <div id="body-tags-list" class="btags-list"></div>
                </div>
            </div>
        `;

        document.body.appendChild(panel);
        this._makeDraggable(panel);
        Utils.makePanelResizable(panel);
        if (typeof Utils !== 'undefined' && Utils.undockPanel) {
            Utils.undockPanel(panel);
        }

        panel.querySelector('#body-tags-close')?.addEventListener('click', () => this._exitBodyTagMode());
        panel.querySelector('#body-tag-preset')?.addEventListener('change', () => this._updateBodyTagPanel());
        panel.querySelector('#body-tags-auto')?.addEventListener('click', () => {
            const nextPresetKey = panel.querySelector('#body-tag-preset')?.value || presetKey;
            this._applyBodyTagTemplate(nextPresetKey, { context: this._bodyTagContext });
        });
        panel.querySelector('#body-tags-add')?.addEventListener('click', () => this._startAddBodyTag());
        panel.querySelector('#body-tags-clear')?.addEventListener('click', async () => {
            if (await Utils.showConfirm('Clear all Body Tags for the current character?')) {
                this._clearBodyTags();
            }
        });

        const bindInput = (id, axis) => {
            panel.querySelector(id)?.addEventListener('change', (e) => {
                const entry = this._findBodyTagEntryByRef(this._bodyTagSelectedRef);
                if (!entry) return;
                const raw = parseFloat(e.target.value);
                if (!Number.isFinite(raw)) return;
                const value = this._clamp01(raw);
                entry.tag[axis] = value;
                this.stage.requestRender();
                this._updateBodyTagPanel();
                eventBus.emit('tags:updated');
                eventBus.emit('history:push');
            });
        };
        bindInput('#body-tag-x', 'x');
        bindInput('#body-tag-y', 'y');

        panel.querySelector('#body-tag-center')?.addEventListener('click', () => {
            const entry = this._findBodyTagEntryByRef(this._bodyTagSelectedRef);
            if (!entry) return;
            entry.tag.x = 0.5;
            entry.tag.y = 0.5;
            this.stage.requestRender();
            this._updateBodyTagPanel();
            eventBus.emit('tags:updated');
            eventBus.emit('history:push');
        });
        panel.querySelector('#body-tag-delete')?.addEventListener('click', () => {
            if (!this._bodyTagSelectedRef) return;
            this._deleteBodyTagByRef(this._bodyTagSelectedRef);
        });
    },

    _updateBodyTagPanel() {
        const panel = document.getElementById('joint-body-tags-panel');
        if (!panel) return;

        const presetSelect = panel.querySelector('#body-tag-preset');
        const selectedPresetKey = presetSelect?.value || this._getBodyTagPreset(this._bodyTagContext?.presetKey || 'generic-character').key;
        const entries = this._getBodyTagEntries();
        if (!entries.length) this._bodyTagSelectedRef = null;
        let selectedEntry = this._findBodyTagEntryByRef(this._bodyTagSelectedRef);
        if (!selectedEntry && entries[0]) {
            this._bodyTagSelectedRef = { objectId: entries[0].obj.id, tagId: entries[0].tag.id };
            selectedEntry = entries[0];
        }

        const contextWrap = panel.querySelector('#body-tags-context');
        if (contextWrap) {
            const ctx = this._bodyTagContext;
            const modeLabel = ctx?.sourceMode === 'assembled'
                ? 'Assembled character'
                : ctx?.sourceMode === 'loose-parts'
                    ? 'Loose named parts'
                    : 'Single object';
            const pills = [];
            if (ctx) pills.push(`<span class="btags-context-pill">${modeLabel}</span>`);
            if (selectedPresetKey) pills.push(`<span class="btags-context-pill">Preset: ${this._escapeHtml(this._friendlyPresetName(selectedPresetKey))}</span>`);
            if ((ctx?.matchedPartCount || 0) > 0 && (ctx?.totalPresetParts || 0) > 0) {
                pills.push(`<span class="btags-context-pill">Matched parts: ${ctx.matchedPartCount}/${ctx.totalPresetParts}</span>`);
            }
            if ((ctx?.unmatchedObjectCount || 0) > 0) {
                pills.push(`<span class="btags-context-pill subtle">Unmatched objects: ${ctx.unmatchedObjectCount}</span>`);
            }
            if (ctx?.inferredPreset) {
                pills.push('<span class="btags-context-pill subtle">Preset inferred from part names</span>');
            }
            contextWrap.innerHTML = pills.join('');
        }

        const status = panel.querySelector('#body-tags-status');
        if (status) {
            const matchedPartText = (this._bodyTagContext?.matchedPartCount || 0) > 0
                ? `<span><strong>${this._bodyTagContext.matchedPartCount}</strong> matched part${this._bodyTagContext.matchedPartCount === 1 ? '' : 's'}</span><span>·</span>`
                : '';
            status.innerHTML = `
                <span><strong>${entries.length}</strong> tag${entries.length === 1 ? '' : 's'}</span>
                <span>·</span>
                ${matchedPartText}
                <span><strong>${this._bodyTagContext?.objects?.length || 0}</strong> selected object${(this._bodyTagContext?.objects?.length || 0) === 1 ? '' : 's'}</span>
                ${this._bodyTagAddMode ? '<span>·</span><span class="btags-add-mode">Click a part to place the new tag</span>' : ''}
            `;
        }

        const detail = panel.querySelector('#body-tag-detail');
        const fieldWrap = panel.querySelector('#body-tag-fields');
        if (detail && fieldWrap) {
            if (!selectedEntry) {
                detail.innerHTML = '<div class="jtune-empty">No tag selected</div>';
                fieldWrap.classList.add('hidden');
            } else {
                detail.innerHTML = `
                    <div class="jtune-joint-name">${this._escapeHtml(selectedEntry.tag.name)}</div>
                    <div class="jtune-joint-meta">
                        ${this._escapeHtml(selectedEntry.partKey || selectedEntry.obj.name || 'Object')}
                        · ${this._escapeHtml(selectedEntry.tag.category || 'body')}
                        · stage ${Math.round(selectedEntry.worldX)}, ${Math.round(selectedEntry.worldY)}
                    </div>
                `;
                fieldWrap.classList.remove('hidden');

                const setVal = (id, value) => {
                    const input = panel.querySelector(id);
                    if (input && input !== document.activeElement) input.value = (Math.round(value * 100) / 100).toFixed(2);
                };
                setVal('#body-tag-x', selectedEntry.tag.x ?? 0.5);
                setVal('#body-tag-y', selectedEntry.tag.y ?? 0.5);
            }
        }

        const list = panel.querySelector('#body-tags-list');
        if (list) {
            list.innerHTML = entries.length ? entries.map(entry => {
                const ref = { objectId: entry.obj.id, tagId: entry.tag.id };
                const selected = this._bodyTagRefEquals(this._bodyTagSelectedRef, ref);
                const color = entry.tag.color || this._getBodyTagCategoryColor(entry.tag.category);
                return `
                    <div class="btag-card ${selected ? 'selected' : ''}" data-object-id="${entry.obj.id}" data-tag-id="${entry.tag.id}">
                        <div class="btag-main">
                            <div class="btag-title-row">
                                <span class="btags-color-dot" style="background:${color}"></span>
                                <span class="btag-name">${this._escapeHtml(entry.tag.name)}</span>
                                <span class="btag-badge">${this._escapeHtml(entry.tag.category || 'body')}</span>
                                ${entry.tag.builtIn ? '<span class="btags-mini-badge">Preset</span>' : '<span class="btags-mini-badge custom">Custom</span>'}
                            </div>
                            <div class="btag-meta">${this._escapeHtml(entry.partKey || entry.obj.name || 'Object')} · ${(entry.tag.x ?? 0.5).toFixed(2)}, ${(entry.tag.y ?? 0.5).toFixed(2)} · stage ${Math.round(entry.worldX)}, ${Math.round(entry.worldY)}</div>
                        </div>
                        <div class="btag-actions">
                            <button class="btag-select" title="Select"><i class="fas fa-crosshairs"></i></button>
                            <button class="btag-delete" title="Delete"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                `;
            }).join('') : '<div class="jtune-empty">No Body Tags yet. Choose a preset and click Auto-Tag Parts, or add custom tags manually.</div>';

            list.querySelectorAll('.btag-card').forEach(card => {
                const ref = { objectId: card.dataset.objectId, tagId: card.dataset.tagId };
                card.addEventListener('click', (e) => {
                    if (e.target.closest('.btag-delete')) return;
                    this._selectBodyTag(ref);
                });
            });
            list.querySelectorAll('.btag-select').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const card = e.currentTarget.closest('.btag-card');
                    this._selectBodyTag({ objectId: card.dataset.objectId, tagId: card.dataset.tagId });
                });
            });
            list.querySelectorAll('.btag-delete').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const card = e.currentTarget.closest('.btag-card');
                    this._deleteBodyTagByRef({ objectId: card.dataset.objectId, tagId: card.dataset.tagId });
                });
            });
        }
    },

    _pickBodyTagTargetObject(stageX, stageY) {
        const context = this._bodyTagContext;
        if (!context?.objects?.length) return null;
        const contextIds = new Set(context.objects.map(obj => obj.id));
        const stageOrder = [...(this.objects.objects || [])]
            .filter(obj => contextIds.has(obj.id))
            .reverse();
        return stageOrder.find(obj => this._pointHitsObject(obj, stageX, stageY)) || null;
    },

    _drawBodyTagHandles(ctx) {
        const entries = this._getBodyTagEntries();
        if (!entries.length) return;

        ctx.save();
        ctx.font = '11px Inter, sans-serif';
        entries.forEach(entry => {
            const ref = { objectId: entry.obj.id, tagId: entry.tag.id };
            const selected = this._bodyTagRefEquals(this._bodyTagSelectedRef, ref);
            const hovered = this._bodyTagRefEquals(this._bodyTagHoverRef, ref) || this._bodyTagRefEquals(this._bodyTagDrag, ref);
            const color = entry.tag.color || this._getBodyTagCategoryColor(entry.tag.category);
            const radius = selected ? 7 : (hovered ? 6 : 5);

            ctx.beginPath();
            ctx.arc(entry.worldX, entry.worldY, radius + 4, 0, Math.PI * 2);
            ctx.fillStyle = selected || hovered ? 'rgba(255,255,255,0.22)' : 'rgba(15,23,42,0.18)';
            ctx.fill();

            ctx.beginPath();
            ctx.arc(entry.worldX, entry.worldY, radius, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = selected || hovered ? 2 : 1.5;
            ctx.stroke();

            if (selected || hovered) {
                const label = entry.tag.name;
                const labelX = entry.worldX + 10;
                const labelY = entry.worldY - 10;
                const metrics = ctx.measureText(label);
                ctx.fillStyle = 'rgba(15, 23, 42, 0.84)';
                ctx.fillRect(labelX - 4, labelY - 11, metrics.width + 8, 16);
                ctx.fillStyle = '#f8fafc';
                ctx.fillText(label, labelX, labelY);
            }
        });
        ctx.restore();
    },

    _hitTestBodyTag(stageX, stageY) {
        const entries = this._getBodyTagEntries();
        for (let i = entries.length - 1; i >= 0; i--) {
            const entry = entries[i];
            if (Math.hypot(stageX - entry.worldX, stageY - entry.worldY) <= 10) return entry;
        }
        return null;
    },

    _onBodyTagMouseDown(e) {
        if (!this._bodyTagActive || e.button !== 0) return;
        const pos = this.stage.screenToStage(e.clientX, e.clientY);

        if (this._bodyTagAddMode) {
            this._bodyTagHoverRef = null;
            const targetObj = this._pickBodyTagTargetObject(pos.x, pos.y);
            if (!targetObj) {
                Utils.showToast('Click directly on a character part to place the new Body Tag', 'warning');
                e.preventDefault();
                e.stopPropagation();
                return;
            }

            const norm = this._getObjectNormalizedPoint(targetObj, pos.x, pos.y);
            const category = this._inferBodyTagCategory(targetObj);
            const newTag = StageObject.normalizeBodyTag({
                key: this._slugifyBodyTagName(this._bodyTagAddMode.name),
                name: this._bodyTagAddMode.name,
                category,
                x: norm.x,
                y: norm.y,
                color: this._getBodyTagCategoryColor(category),
                builtIn: false,
                targetPartKey: targetObj.bodyPartData?.partKey || null
            });
            targetObj.bodyTags = [...(Array.isArray(targetObj.bodyTags) ? targetObj.bodyTags : []), newTag];
            this._bodyTagAddMode = null;
            this.stage.canvas.style.cursor = '';
            this._selectBodyTag({ objectId: targetObj.id, tagId: newTag.id });
            this._updateBodyTagPanel();
            this.stage.requestRender();
            eventBus.emit('tags:updated');
            eventBus.emit('history:push');
            Utils.showToast(`Added Body Tag "${newTag.name}"`, 'success');
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        const hit = this._hitTestBodyTag(pos.x, pos.y);
        if (!hit) return;
        this._bodyTagDrag = { objectId: hit.obj.id, tagId: hit.tag.id };
        this._bodyTagHoverRef = { ...this._bodyTagDrag };
        this._selectBodyTag(this._bodyTagDrag);
        this.stage.canvas.style.cursor = 'grabbing';
        e.preventDefault();
        e.stopPropagation();
    },

    _onBodyTagMouseMove(e) {
        if (!this._bodyTagActive) return;
        const pos = this.stage.screenToStage(e.clientX, e.clientY);

        if (this._bodyTagDrag) {
            const entry = this._findBodyTagEntryByRef(this._bodyTagDrag);
            if (!entry) return;
            this._bodyTagHoverRef = { ...this._bodyTagDrag };
            const norm = this._getObjectNormalizedPoint(entry.obj, pos.x, pos.y);
            entry.tag.x = norm.x;
            entry.tag.y = norm.y;
            this.stage.requestRender();
            this._updateBodyTagPanel();
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        if (this._bodyTagAddMode) {
            if (this._bodyTagHoverRef) {
                this._bodyTagHoverRef = null;
                this.stage.requestRender();
            }
            this.stage.canvas.style.cursor = 'crosshair';
            return;
        }

        const hit = this._hitTestBodyTag(pos.x, pos.y);
        const nextHover = hit ? { objectId: hit.obj.id, tagId: hit.tag.id } : null;
        if (!this._bodyTagRefEquals(this._bodyTagHoverRef, nextHover)) {
            this._bodyTagHoverRef = nextHover;
            this.stage.requestRender();
        }
        this.stage.canvas.style.cursor = hit ? 'pointer' : '';
    },

    _onBodyTagMouseUp(e) {
        if (!this._bodyTagDrag) return;
        this._bodyTagDrag = null;
        this.stage.canvas.style.cursor = this._bodyTagAddMode ? 'crosshair' : '';
        this.stage.requestRender();
        this._updateBodyTagPanel();
        eventBus.emit('tags:updated');
        eventBus.emit('history:push');
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
    },

    getBodyTagData() {
        return this._collectBodyTagEntries((this.objects.objects || []).filter(obj => Array.isArray(obj.bodyTags) && obj.bodyTags.length))
            .map(entry => ({
                objectId: entry.obj.id,
                objectName: entry.obj.name,
                partKey: entry.partKey,
                name: entry.tag.name,
                key: entry.tag.key || null,
                category: entry.tag.category || 'body',
                relativeX: Math.round((entry.tag.x ?? 0.5) * 1000) / 1000,
                relativeY: Math.round((entry.tag.y ?? 0.5) * 1000) / 1000,
                worldX: Math.round(entry.worldX),
                worldY: Math.round(entry.worldY),
                builtIn: entry.tag.builtIn === true,
                sourcePreset: entry.tag.sourcePreset || null
            }));
    },

    getBodyTagWorldPosition(tagName) {
        const needle = String(tagName || '').trim().toLowerCase();
        if (!needle) return null;
        const match = this.getBodyTagData().find(tag =>
            String(tag.name || '').toLowerCase() === needle || String(tag.key || '').toLowerCase() === needle
        );
        return match ? { x: match.worldX, y: match.worldY, partKey: match.partKey, objectId: match.objectId } : null;
    },

    _getEditableMovementContactMap(move) {
        if (!move) return {};
        if (move.overrideContacts && Object.keys(move.overrideContacts).length) {
            return this._cloneContactSpecMap(move.overrideContacts);
        }
        const merged = this._cloneContactSpecMap(move.contacts || {});
        (move.keyframes || []).forEach(kf => {
            Object.entries(kf?.contacts || {}).forEach(([partKey, spec]) => {
                if (!merged[partKey]) merged[partKey] = this._cloneContactSpecMap(spec);
            });
        });
        return merged;
    },

    _getEditablePoseContactMap(pose) {
        if (!pose) return {};
        if (pose.overrideContacts && Object.keys(pose.overrideContacts).length) {
            return this._cloneContactSpecMap(pose.overrideContacts);
        }
        return this._cloneContactSpecMap(pose.contacts || {});
    },

    _isMovementContactKind(kind) {
        return kind === 'move' || kind === 'armature-move';
    },

    _isArmatureContactKind(kind) {
        return kind === 'armature-pose' || kind === 'armature-move';
    },

    _contactRowsFromMap(contactMap = {}) {
        return Object.entries(contactMap).map(([partKey, spec]) => ({
            partKey,
            tag: Array.isArray(spec?.tag) ? (spec.tag[0] || '') : (spec?.tag || ''),
            offsetX: Number(spec?.offsetX ?? spec?.dx ?? 0) || 0,
            offsetY: Number(spec?.offsetY ?? spec?.dy ?? 0) || 0,
            iterations: Math.max(2, Math.min(16, Math.round(Number(spec?.iterations ?? 8) || 8)))
        }));
    },

    _contactMapFromRows(rows = []) {
        const map = {};
        rows.forEach(row => {
            const partKey = String(row?.partKey || '').trim();
            const tag = String(row?.tag || '').trim();
            if (!partKey || !tag) return;
            map[partKey] = {
                tag,
                offsetX: Number(row.offsetX) || 0,
                offsetY: Number(row.offsetY) || 0,
                iterations: Math.max(2, Math.min(16, Math.round(Number(row.iterations) || 8)))
            };
        });
        return map;
    },

    _friendlyContactSourceLabel(partKey, partMap) {
        const channel = partMap?.[partKey];
        if (channel?.label && channel.label !== partKey) return channel.label;
        const presetKey = this._detectAssembledPreset();
        const preset = JointPresets.getAll().find(candidate => candidate.key === presetKey) || RigPresets.getByKey(presetKey);
        const partName = preset?.parts?.find(part => part.partKey === partKey)?.name;
        if (partName) return partName;
        return String(partKey || '')
            .replace(/-/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase());
    },

    _getFallbackContactSourceOptions(presetKey, existingMap = {}) {
        const canonicalPresetKey = this._getCanonicalPresetKey(presetKey);
        const preset = JointPresets.getAll().find(candidate => candidate.key === canonicalPresetKey) || RigPresets.getByKey(canonicalPresetKey);
        const keys = new Set(Object.keys(existingMap || {}));
        (preset?.parts || []).forEach(part => {
            if (/(hand|foot)$/i.test(part.partKey)) keys.add(part.partKey);
        });
        return Array.from(keys).map(partKey => ({
            value: partKey,
            label: this._friendlyContactSourceLabel(partKey, null)
        }));
    },

    _getContactSourceOptions(partMap, existingMap = {}, presetKey = null) {
        const keys = new Set([
            ...Object.keys(existingMap || {}),
            ...Object.keys(partMap || {})
        ]);

        const options = Array.from(keys)
            .filter(partKey => {
                if (existingMap?.[partKey]) return true;
                const channel = partMap?.[partKey];
                return this._canApplyMotionContact(channel, partKey);
            })
            .sort()
            .map(partKey => ({
                value: partKey,
                label: this._friendlyContactSourceLabel(partKey, partMap)
            }));

        return options.length ? options : this._getFallbackContactSourceOptions(presetKey, existingMap);
    },

    _getContactTargetOptionsForObjects(objects, presetKey = null, existingMap = {}) {
        const options = new Map();
        this._collectBodyTagEntries(objects || []).forEach(entry => {
            const value = entry.tag?.key || entry.tag?.name;
            if (!value || options.has(value)) return;
            options.set(value, {
                value,
                label: `${entry.tag.name} (${this._friendlyContactSourceLabel(entry.partKey || entry.obj?.bodyPartData?.partKey, null)})`
            });
        });

        Object.values(existingMap || {}).forEach(spec => {
            const tagValues = Array.isArray(spec?.tag)
                ? spec.tag
                : (spec?.tag != null ? [spec.tag] : []);
            tagValues.forEach(tagValue => {
                const value = String(tagValue || '').trim();
                if (!value || options.has(value)) return;
                options.set(value, {
                    value,
                    label: `${value} (saved target)`
                });
            });
        });

        return Array.from(options.values()).sort((a, b) => a.label.localeCompare(b.label));
    },

    _getContactTargetOptions(partMap, presetKey = null, existingMap = {}) {
        return this._getContactTargetOptionsForObjects(
            this._getUniqueObjectsFromPartMap(partMap),
            presetKey,
            existingMap
        );
    },

    _syncContactTargetEditorState(panel) {
        if (!panel || !this._contactTargetEditorState) return;
        this._contactTargetEditorState.rows = Array.from(panel.querySelectorAll('.ct-row')).map(row => ({
            partKey: row.querySelector('.ct-source')?.value || '',
            tag: row.querySelector('.ct-tag')?.value || '',
            offsetX: parseFloat(row.querySelector('.ct-offset-x')?.value || '0') || 0,
            offsetY: parseFloat(row.querySelector('.ct-offset-y')?.value || '0') || 0,
            iterations: parseInt(row.querySelector('.ct-iterations')?.value || '8', 10) || 8
        }));
    },

    _withTemporaryContactOverride(kind, key, contacts, callback) {
        const previousOverride = this._getContactOverride(kind, key);
        this._setContactOverride(kind, key, contacts);
        try {
            return callback();
        } finally {
            this._setContactOverride(kind, key, previousOverride);
        }
    },

    _previewContactTargetEditorState(rows = null) {
        const state = this._contactTargetEditorState;
        if (!state) return false;

        const refreshPreviewUi = () => {
            this.objects.updateProperties?.();
            this.objects.updateObjectList?.();
            this.stage.requestRender?.();
        };

        const previewRows = Array.isArray(rows) ? rows : state.rows;
        const previewMap = this._contactMapFromRows(previewRows || []);
        state.rows = previewRows;

        if (this._isArmatureContactKind(state.kind)) {
            const armature = this._currentArmature || this._detectArmature();
            if (!armature?.root) return false;
            return this._withTemporaryContactOverride(state.kind, state.key, previewMap, () => {
                if (state.kind === 'armature-move') {
                    const poseCatalog = this._getActiveArmaturePoseCatalog(armature) || {};
                    this._stopArmatureMovement(armature);
                    this._captureArmatureStageBasePosition(armature);
                    this._applyArmaturePose(armature, poseCatalog.idle || { jointAngles: {} });
                    this._playArmatureMovement(armature, state.key);
                    this._updateArmaturePanelPlayState?.(armature);
                    this._updateContactTargetPreviewDiagnostics();
                    refreshPreviewUi();
                    return true;
                }

                const poseCatalog = this._getActiveArmaturePoseCatalog(armature) || {};
                const pose = this._getDecoratedArmaturePoseEntry(state.key, poseCatalog[state.key]);
                if (!pose) return false;
                this._stopArmatureMovement(armature);
                this._captureArmatureStageBasePosition(armature);
                this._applyArmaturePose(armature, pose);
                this._updateArmaturePanelPlayState?.(armature);
                this._updateContactTargetPreviewDiagnostics();
                refreshPreviewUi();
                return true;
            });
        }

        if (state.kind === 'move') {
            return this._withTemporaryContactOverride(state.kind, state.key, previewMap, () => {
                this._previewMovement(state.key);
                this._updateContactTargetPreviewDiagnostics();
                refreshPreviewUi();
                return true;
            });
        }

        return this._withTemporaryContactOverride(state.kind, state.key, previewMap, () => {
            const pose = this._getPoseById(state.key, this._detectAssembledMotionProfile());
            if (!pose) return false;
            const partMap = this._getPartMotionChannelMap();
            if (Object.keys(partMap).length === 0) return false;

            if (this._shouldResetPoseToIdleFirst()) {
                this._resetAssembledPartsToIdleBaseline(partMap);
            }

            Object.keys(partMap).forEach(partKey => {
                const angle = this._getPoseAngle(pose, partKey);
                this._applyMotionChannelAngle(partMap[partKey], angle);
            });
            this.objects._resolvePins?.();

            const poseContacts = this._getEditablePoseContactMap(pose);
            if (Object.keys(poseContacts).length) {
                this._applyBodyTagContacts(partMap, poseContacts, { silent: true });
            }
            this._updateContactTargetPreviewDiagnostics();
            refreshPreviewUi();
            return true;
        });
    },

    _updateContactTargetPreviewDiagnostics() {
        const state = this._contactTargetEditorState;
        if (!state) return;

        if (!this._isArmatureContactKind(state.kind)) {
            state.previewDiagnostics = this._buildAssembledContactPreviewDiagnostics();
            const panel = document.getElementById('joint-contact-target-panel');
            if (panel) this._renderContactTargetEditorDiagnostics(panel);
            return;
        }

        const armature = this._currentArmature || this._detectArmature();
        if (!armature?.root || !this._snapshotArmaturePose) {
            state.previewDiagnostics = null;
            return;
        }

        const snapshot = this._snapshotArmaturePose(armature);
        const sourceMap = this._getArmatureContactSourceMap?.(armature) || {};
        const rows = Array.isArray(state.rows) ? state.rows : [];
        const seenSources = new Set();
        const chains = rows.map(row => {
            const sourceKey = row?.partKey || '';
            if (!sourceKey || seenSources.has(sourceKey)) return null;
            seenSources.add(sourceKey);
            const source = sourceMap[sourceKey];
            if (!source?.jointNames?.length) return null;
            return {
                sourceKey,
                label: source.label || sourceKey,
                joints: source.jointNames.map(name => ({
                    name,
                    angle: Number(snapshot?.jointAngles?.[name] || 0)
                }))
            };
        }).filter(Boolean);

        state.previewDiagnostics = {
            kind: 'armature',
            message: state.kind === 'armature-move'
                ? 'Values reflect the current preview frame after the contact solver runs.'
                : 'Values reflect the resolved armature pose after the contact solver runs.',
            chains
        };

        const panel = document.getElementById('joint-contact-target-panel');
        if (panel) this._renderContactTargetEditorDiagnostics(panel);
    },

    _buildAssembledContactPreviewDiagnostics() {
        const state = this._contactTargetEditorState;
        const partMap = this._getPartMotionChannelMap?.() || {};
        const rows = Array.isArray(state?.rows) ? state.rows : [];
        const seenSources = new Set();
        const chains = rows.map(row => {
            const sourceKey = row?.partKey || '';
            if (!sourceKey || seenSources.has(sourceKey)) return null;
            seenSources.add(sourceKey);

            const channel = partMap[sourceKey];
            if (!channel) return null;

            const entries = [];
            const channelState = this._captureMotionChannelState?.(channel);
            if (channel?.target === 'joint' && channel?.joint) {
                entries.push({
                    name: channel.label || channel.joint?.name || sourceKey,
                    angle: Number(channelState?.angle || 0)
                });
            }

            const visited = new Set();
            let current = this._getMapEntryObject?.(channel);
            let depth = 0;
            while (current?.id && !visited.has(current.id) && depth < 10) {
                visited.add(current.id);
                entries.push({
                    name: current.name || current.bodyPartData?.jointName || current.bodyPartData?.partKey || `Object ${depth + 1}`,
                    angle: Number(current.jointBaseAngle || 0)
                });
                current = current.pinnedTo ? this.objects.getObjectById?.(current.pinnedTo) : null;
                depth += 1;
            }

            if (!entries.length) return null;
            return {
                sourceKey,
                label: channel.label || sourceKey,
                entries
            };
        }).filter(Boolean);

        return {
            kind: 'assembled',
            message: this._isMovementContactKind(state?.kind)
                ? 'Values reflect the live assembled movement frame after contact IK resolves the chain.'
                : 'Values reflect the resolved assembled pose after contact IK resolves the chain.',
            chains
        };
    },

    _renderContactTargetEditorDiagnostics(panel) {
        const state = this._contactTargetEditorState;
        const container = panel?.querySelector('#ct-preview-diagnostics');
        if (!container || !state) return;

        const diagnostics = state.previewDiagnostics;
        if (!diagnostics) {
            container.innerHTML = '';
            return;
        }

        if (diagnostics.kind === 'assembled') {
            const chainsHtml = diagnostics.chains?.length
                ? diagnostics.chains.map(chain => `
                    <div style="padding:7px 8px;border-radius:6px;background:rgba(2,6,23,0.45);border:1px solid rgba(148,163,184,0.14);">
                        <div style="font-size:10px;font-weight:700;letter-spacing:0.03em;text-transform:uppercase;color:#93c5fd;margin-bottom:5px;">${this._escapeHtml(chain.label || chain.sourceKey)}</div>
                        <div style="display:grid;grid-template-columns:1fr auto;gap:4px 8px;font-size:11px;color:#e2e8f0;">
                            ${chain.entries.map(entry => `
                                <span>${this._escapeHtml(entry.name)}</span>
                                <span>${Math.round(Number(entry.angle) || 0)}&deg;</span>
                            `).join('')}
                        </div>
                    </div>
                `).join('')
                : '<div style="font-size:11px;color:#cbd5e1;">Add a source part to monitor the live assembled chain angles here.</div>';

            container.innerHTML = `
                <div style="margin:10px 0 8px 0;padding:8px 10px;border-radius:8px;background:rgba(15,23,42,0.5);border:1px solid rgba(148,163,184,0.18);font-size:11px;line-height:1.45;color:#cbd5e1;">
                    <div style="font-weight:600;color:#93c5fd;margin-bottom:4px;">Resolved Joint Angles</div>
                    <div style="font-size:11px;line-height:1.45;color:#cbd5e1;margin-bottom:8px;">${this._escapeHtml(diagnostics.message || '')}</div>
                    <div style="display:grid;gap:8px;">${chainsHtml}</div>
                </div>
            `;
            return;
        }

        if (diagnostics.kind !== 'armature') {
            container.innerHTML = '';
            return;
        }

        const chainsHtml = diagnostics.chains.length
            ? diagnostics.chains.map(chain => `
                <div style="padding:7px 8px;border-radius:6px;background:rgba(2,6,23,0.45);border:1px solid rgba(148,163,184,0.14);">
                    <div style="font-size:10px;font-weight:700;letter-spacing:0.03em;text-transform:uppercase;color:#93c5fd;margin-bottom:5px;">${this._escapeHtml(chain.label || chain.sourceKey)}</div>
                    <div style="display:grid;grid-template-columns:1fr auto;gap:4px 8px;font-size:11px;color:#e2e8f0;">
                        ${chain.joints.map(joint => `
                            <span>${this._escapeHtml(joint.name)}</span>
                            <span>${Math.round(Number(joint.angle) || 0)}&deg;</span>
                        `).join('')}
                    </div>
                </div>
            `).join('')
            : '<div style="font-size:11px;color:#cbd5e1;">Add a source chain to monitor its resolved shoulder, elbow, wrist, hip, knee, or ankle angles here.</div>';

        container.innerHTML = `
            <div style="margin:10px 0 8px 0;padding:8px 10px;border-radius:8px;background:rgba(15,23,42,0.5);border:1px solid rgba(148,163,184,0.18);">
                <div style="font-weight:600;color:#93c5fd;margin-bottom:4px;">Resolved Joint Angles</div>
                <div style="font-size:11px;line-height:1.45;color:#cbd5e1;margin-bottom:8px;">${this._escapeHtml(diagnostics.message || '')}</div>
                <div style="display:grid;gap:8px;">${chainsHtml}</div>
            </div>
        `;
    },

    _refreshContactAwarePanel(kind) {
        if (kind === 'move' && document.getElementById('joint-movement-picker')) {
            this.showMovementPicker();
        } else if (kind === 'pose' && document.getElementById('joint-pose-panel')) {
            this.showPoseLibrary();
        } else if ((kind === 'armature-pose' || kind === 'armature-move') && document.getElementById('armature-panel') && this._currentArmature) {
            this._buildArmaturePanel(this._currentArmature);
        }
    },

    _showContactTargetEditor(kind, key) {
        const isArmature = this._isArmatureContactKind(kind);
        const isMove = this._isMovementContactKind(kind);
        const armature = isArmature ? (this._currentArmature || this._detectArmature()) : null;
        if (isArmature && !armature) {
            Utils.showToast('No active Pose Armature found', 'warning');
            return;
        }

        const entity = isArmature
            ? (() => {
                if (kind === 'armature-move') {
                    return this._getDecoratedArmatureMovementEntry(
                        key,
                        this._getActiveArmatureMovementCatalog(armature)?.[key]
                    );
                }
                return this._getDecoratedArmaturePoseEntry(
                    key,
                    this._getActiveArmaturePoseCatalog(armature)?.[key]
                );
            })()
            : (kind === 'move'
                ? this._getMovementByKey(key, this._detectAssembledMotionProfile())
                : this._getPoseById(key, this._detectAssembledMotionProfile()));
        if (!entity) return;

        const partMap = isArmature ? null : this._getPartMotionChannelMap();
        const armatureObjects = isArmature ? this._getArmatureObjects(armature) : [];
        const presetKey = isArmature
            ? (this._armatureUsesHumanFrontCatalog(armature)
                ? 'human-front'
                : (this._armatureUsesHumanSideCatalog(armature) ? 'human-side' : 'generic-character'))
            : (entity.presetKey || entity.presetKeys?.[0] || this._detectAssembledPreset() || 'generic-character');
        const editableMap = isArmature
            ? (isMove
                ? this._getEditableArmatureMovementContactMap(
                    key,
                    entity,
                    Object.fromEntries(
                        Object.entries(this._getActiveArmaturePoseCatalog(armature) || {}).map(([poseKey, poseValue]) => [
                            poseKey,
                            this._getDecoratedArmaturePoseEntry(poseKey, poseValue)
                        ])
                    )
                )
                : this._getEditableArmaturePoseContactMap(key, entity))
            : (kind === 'move'
                ? this._getEditableMovementContactMap(entity)
                : this._getEditablePoseContactMap(entity));

        this._contactTargetEditorState = {
            kind,
            key,
            name: entity.name || key,
            presetKey,
            hasOverride: !!(entity.overrideContacts && Object.keys(entity.overrideContacts).length),
            rows: this._contactRowsFromMap(editableMap),
            previewDiagnostics: null,
            sourceOptions: isArmature
                ? this._getArmatureContactSourceOptions(armature, editableMap)
                : this._getContactSourceOptions(partMap, editableMap, presetKey),
            tagOptions: isArmature
                ? this._getContactTargetOptionsForObjects(armatureObjects, presetKey, editableMap)
                : this._getContactTargetOptions(partMap, presetKey, editableMap),
            hasLiveTags: isArmature
                ? this._collectBodyTagEntries(armatureObjects).length > 0
                : this._collectBodyTagEntries(this._getUniqueObjectsFromPartMap(partMap)).length > 0
        };
        this._renderContactTargetEditor();
    },

    _renderContactTargetEditor() {
        const state = this._contactTargetEditorState;
        if (!state) return;

        document.getElementById('joint-contact-target-panel')?.remove();
        const panel = document.createElement('div');
        panel.id = 'joint-contact-target-panel';
        panel.className = 'joint-assembly-panel';
        panel.style.width = '430px';

        const sourceOptions = state.sourceOptions.length
            ? state.sourceOptions.map(option => `<option value="${this._escapeHtml(option.value)}">${this._escapeHtml(option.label)}</option>`).join('')
            : '<option value="">No compatible end-effectors</option>';
        const tagOptions = state.tagOptions.length
            ? state.tagOptions.map(option => `<option value="${this._escapeHtml(option.value)}">${this._escapeHtml(option.label)}</option>`).join('')
            : '<option value="">No Body Tags found</option>';

        panel.innerHTML = `
            <div class="ja-header" data-draggable="true">
                <i class="fas fa-location-dot"></i> Contact Targets
                <span class="ja-preset-badge">${this._escapeHtml(state.name)}</span>
                <button class="ja-close" title="Close"><i class="fas fa-times"></i></button>
            </div>
            <div class="ja-body">
                <div class="ja-hint" style="margin-bottom:8px;">
                    Attach a hand or foot to a Body Tag during this ${this._isMovementContactKind(state.kind) ? 'movement' : 'pose'}. ${this._isArmatureContactKind(state.kind) ? 'Pose Armature uses its internal joint chain to reach the target.' : 'This works best on Smart Cut / Body Stencil rigs with separate hand and foot objects.'}
                </div>
                <div style="font-size:11px;color:#93c5fd;margin-bottom:8px;line-height:1.4;">
                    Drag the header to move this panel. Changes preview live while you edit. Use Save to keep them.
                </div>
                <div style="font-size:11px;color:#94a3b8;margin-bottom:8px;">
                    ${state.hasLiveTags
                        ? 'Using the Body Tags currently placed on the selected character.'
                        : 'No live Body Tags found on the current character. Contact targets only resolve against tags that already exist on this character, so run Auto-Tag Parts or add tags first.'}
                </div>
                <div style="margin:0 0 10px 0;padding:8px 10px;border-radius:8px;background:rgba(15,23,42,0.42);border:1px solid rgba(148,163,184,0.16);font-size:11px;line-height:1.45;color:#cbd5e1;">
                    <div style="font-weight:600;color:#93c5fd;margin-bottom:4px;">Quick Use</div>
                    <div>1. Add or refine Body Tags on the current character.</div>
                    <div>2. Pick the hand or foot chain in <strong>Source Part</strong>.</div>
                    <div>3. Pick the live Body Tag in <strong>Target Tag</strong>.</div>
                    <div>4. Move the tag first for big corrections, then use <strong>dx</strong> and <strong>dy</strong> for small offsets.</div>
                    <div style="margin-top:6px;color:#94a3b8;">Examples: <strong>left-hand -&gt; left-waist</strong> for hands-on-hips, <strong>right-hand -&gt; temple</strong> for thinking poses, <strong>hand -&gt; sternum</strong> for bow or chest contact.</div>
                </div>
                <div id="ct-preview-diagnostics"></div>
                <div id="ct-rows">
                    ${state.rows.length ? state.rows.map((row, index) => `
                        <div class="ct-row" data-index="${index}" style="display:grid;grid-template-columns:1.2fr 1.5fr 72px 72px 72px 34px;gap:6px;align-items:center;margin-bottom:6px;">
                            <select class="ct-source jpl-input">${sourceOptions}</select>
                            <select class="ct-tag jpl-input">${tagOptions}</select>
                            <input class="ct-offset-x jpl-input" type="number" step="1" value="${Number(row.offsetX) || 0}" title="Offset X">
                            <input class="ct-offset-y jpl-input" type="number" step="1" value="${Number(row.offsetY) || 0}" title="Offset Y">
                            <input class="ct-iterations jpl-input" type="number" min="2" max="16" step="1" value="${Number(row.iterations) || 8}" title="Iterations">
                            <button class="btn-small ct-remove" title="Remove"><i class="fas fa-trash"></i></button>
                        </div>
                    `).join('') : '<div class="ja-hint" style="margin:8px 0;">No contact targets yet.</div>'}
                </div>
                <div style="display:grid;grid-template-columns:1.2fr 1.5fr 72px 72px 72px 34px;gap:6px;align-items:center;font-size:10px;color:#94a3b8;margin:-2px 0 8px 0;">
                    <span>Source Part</span>
                    <span>Target Tag</span>
                    <span>dx</span>
                    <span>dy</span>
                    <span>Iter</span>
                    <span></span>
                </div>
                <div class="jtune-actions">
                    <button id="ct-add-row" class="btn-small ja-btn-blue" ${state.tagOptions.length ? '' : 'disabled'}><i class="fas fa-plus"></i> Add Target</button>
                    <button id="ct-save" class="btn-small ja-btn-green"><i class="fas fa-save"></i> Save</button>
                    <button id="ct-clear" class="btn-small"><i class="fas fa-rotate-left"></i> Clear Override</button>
                </div>
            </div>
        `;

        document.body.appendChild(panel);
        this._makeDraggable(panel);
        Utils.makePanelResizable(panel);
        if (typeof Utils !== 'undefined' && Utils.undockPanel) {
            Utils.undockPanel(panel);
        }

        const setRowValues = () => {
            panel.querySelectorAll('.ct-row').forEach((rowEl, index) => {
                const row = state.rows[index];
                if (!row) return;
                const source = rowEl.querySelector('.ct-source');
                const tag = rowEl.querySelector('.ct-tag');
                if (source) source.value = row.partKey || source.value;
                if (tag) tag.value = row.tag || tag.value;
            });
        };
        setRowValues();
        this._renderContactTargetEditorDiagnostics(panel);

        panel.querySelector('.ja-close')?.addEventListener('click', () => {
            this._contactTargetEditorState = null;
            panel.remove();
        });

        const previewEditorState = () => {
            this._syncContactTargetEditorState(panel);
            this._previewContactTargetEditorState();
        };

        panel.querySelectorAll('.ct-source, .ct-tag').forEach(input => {
            input.addEventListener('change', previewEditorState);
        });
        panel.querySelectorAll('.ct-offset-x, .ct-offset-y, .ct-iterations').forEach(input => {
            input.addEventListener('input', previewEditorState);
            input.addEventListener('change', previewEditorState);
        });

        panel.querySelectorAll('.ct-remove').forEach((btn, index) => {
            btn.addEventListener('click', () => {
                this._syncContactTargetEditorState(panel);
                state.rows.splice(index, 1);
                this._previewContactTargetEditorState(state.rows);
                this._renderContactTargetEditor();
            });
        });

        panel.querySelector('#ct-add-row')?.addEventListener('click', () => {
            this._syncContactTargetEditorState(panel);
            if (!state.tagOptions.length) {
                Utils.showToast('Add Body Tags to the current character before creating a contact target', 'warning');
                return;
            }
            state.rows.push({
                partKey: state.sourceOptions[0]?.value || '',
                tag: state.tagOptions[0]?.value || '',
                offsetX: 0,
                offsetY: 0,
                iterations: 8
            });
            this._previewContactTargetEditorState(state.rows);
            this._renderContactTargetEditor();
        });

        panel.querySelector('#ct-clear')?.addEventListener('click', () => {
            this._setContactOverride(state.kind, state.key, null);
            const isArmature = this._isArmatureContactKind(state.kind);
            const isMove = this._isMovementContactKind(state.kind);
            const armature = isArmature ? (this._currentArmature || this._detectArmature()) : null;
            const entity = isArmature
                ? (() => {
                    if (!armature) return null;
                    if (state.kind === 'armature-move') {
                        return this._getDecoratedArmatureMovementEntry(
                            state.key,
                            this._getActiveArmatureMovementCatalog(armature)?.[state.key]
                        );
                    }
                    return this._getDecoratedArmaturePoseEntry(
                        state.key,
                        this._getActiveArmaturePoseCatalog(armature)?.[state.key]
                    );
                })()
                : (state.kind === 'move'
                    ? this._getMovementByKey(state.key, this._detectAssembledMotionProfile())
                    : this._getPoseById(state.key, this._detectAssembledMotionProfile()));
            const entityWithoutOverride = entity ? { ...entity, overrideContacts: null } : null;
            const builtinMap = isArmature
                ? (isMove
                    ? this._getEditableArmatureMovementContactMap(
                        state.key,
                        entityWithoutOverride,
                        armature
                            ? Object.fromEntries(
                                Object.entries(this._getActiveArmaturePoseCatalog(armature) || {}).map(([poseKey, poseValue]) => [
                                    poseKey,
                                    this._getDecoratedArmaturePoseEntry(poseKey, poseValue)
                                ])
                            )
                            : null
                    )
                    : this._getEditableArmaturePoseContactMap(state.key, entityWithoutOverride))
                : (state.kind === 'move'
                    ? this._getEditableMovementContactMap(entityWithoutOverride)
                    : this._getEditablePoseContactMap(entityWithoutOverride));
            state.hasOverride = false;
            state.rows = this._contactRowsFromMap(builtinMap);
                    this._previewContactTargetEditorState(state.rows);
            this._refreshContactAwarePanel(state.kind);
            this._renderContactTargetEditor();
            Utils.showToast('Contact target override cleared', 'info');
        });

        panel.querySelector('#ct-save')?.addEventListener('click', () => {
            this._syncContactTargetEditorState(panel);
            const nextMap = this._contactMapFromRows(state.rows);
            this._setContactOverride(state.kind, state.key, nextMap);
            state.hasOverride = Object.keys(nextMap).length > 0;
            this._refreshContactAwarePanel(state.kind);
            Utils.showToast(`Saved ${Object.keys(nextMap).length} contact target${Object.keys(nextMap).length === 1 ? '' : 's'}`, 'success');
        });

        this._updateContactTargetPreviewDiagnostics();
    },







    // ═══════════════════════════════════════════════════════════════
    //  POSE LIBRARY — Save, load, blend named poses
    // ═══════════════════════════════════════════════════════════════

    _getPoseStorageKey() {
        return 'joint-pose-library';
    },

    _getBuiltinPoseLibrary(presetKey = null) {
        switch (presetKey) {
            case 'body-slicer-front':
                return JointSystem._buildBodySlicerFrontPoseLibrary();
            default: {
                const front = HUMAN_FRONT_STATIC_POSES.map(pose => ({ ...pose, builtIn: true }));
                // Also surface the richer expressive armature poses (surprised, shy,
                // confident, etc.) in the assembled-rig pose library, converted from
                // armature-joint space to the front-angle space this library applies.
                const seenNames = new Set(front.map(p => String(p.name || '').toLowerCase()));
                const armaturePoses = Object.entries(JointSystem.ARMATURE_POSES || {})
                    .map(([key, entry]) => this._convertArmaturePoseToHumanFrontAngles(key, entry))
                    .filter(pose => pose && !seenNames.has(String(pose.name || '').toLowerCase()));
                return [...front, ...armaturePoses];
            }
        }
    },

    // Convert an armature-space pose (jointAngles keyed by left-shoulder/right-elbow…,
    // partAngles.torso) into the front-angle pose format used by the assembled-rig pose
    // library. Inverse of _convertHumanFrontAnglesToArmaturePoseData (left side negated).
    _convertArmaturePoseToHumanFrontAngles(key, entry) {
        if (!entry || !entry.jointAngles) return null;
        const j = entry.jointAngles;
        const angles = {};
        const set = (frontKey, jointName, invert = false) => {
            const v = j[jointName];
            if (Number.isFinite(v)) angles[frontKey] = invert ? -v : v;
        };
        set('r-upper-arm', 'right-shoulder');
        set('l-upper-arm', 'left-shoulder', true);
        set('r-forearm', 'right-elbow');
        set('l-forearm', 'left-elbow', true);
        set('r-hand', 'right-wrist');
        set('l-hand', 'left-wrist', true);
        set('r-upper-leg', 'right-hip');
        set('l-upper-leg', 'left-hip', true);
        set('r-lower-leg', 'right-knee');
        set('l-lower-leg', 'left-knee', true);
        set('r-foot', 'right-ankle');
        set('l-foot', 'left-ankle', true);
        if (Number.isFinite(j['neck'])) angles.head = j['neck'];
        if (Number.isFinite(entry.partAngles?.torso)) angles.torso = entry.partAngles.torso;
        return {
            id: 'armature-pose-' + key,
            name: entry.name || key,
            icon: entry.icon || 'fa-user',
            category: entry.category || 'Expressive',
            presetKey: 'human-front',
            angles,
            contacts: entry.contacts ? JSON.parse(JSON.stringify(entry.contacts)) : undefined,
            builtIn: true
        };
    },

    _loadPoseLibrary() {
        try {
            return JSON.parse(localStorage.getItem(this._getPoseStorageKey())) || [];
        } catch { return []; }
    },

    _savePoseLibrary(lib) {
        localStorage.setItem(this._getPoseStorageKey(), JSON.stringify(lib));
    },

    _getAllPoseLibrary(presetKey = null) {
        return [...this._getBuiltinPoseLibrary(presetKey), ...this._loadPoseLibrary()];
    },

    _getPoseLibraryByPreset(presetKey) {
        const builtins = this._getBuiltinPoseLibrary(presetKey);
        const custom = this._loadPoseLibrary().filter(pose => !presetKey || pose.presetKey === presetKey);
        return [...builtins, ...custom].map(pose => this._getDecoratedPose(pose));
    },

    _getPoseById(poseId, presetKey = this._detectAssembledMotionProfile()) {
        const searchProfiles = Array.from(new Set([
            presetKey,
            this._detectAssembledPreset(),
            null
        ].filter(v => v !== undefined)));
        let pose = null;
        for (const profile of searchProfiles) {
            pose = this._getBuiltinPoseLibrary(profile).find(entry => entry.id === poseId) || null;
            if (pose) break;
        }
        if (!pose) {
            pose = this._loadPoseLibrary().find(entry => entry.id === poseId) || null;
        }
        return this._getDecoratedPose(pose);
    },

    _getPoseAngle(pose, partKey) {
        return Object.prototype.hasOwnProperty.call(pose?.angles || {}, partKey)
            ? pose.angles[partKey]
            : 0;
    },

    /**
     * Capture current joint angles as a named pose.
     */
    savePose(name) {
        const partMap = this._getPartMotionChannelMap();
        if (Object.keys(partMap).length === 0) {
            Utils.showToast('No assembled parts on stage', 'warning');
            return;
        }
        const presetKey = this._detectAssembledMotionProfile();
        const angles = {};
        Object.keys(partMap).forEach(pk => {
            angles[pk] = this._captureMotionChannelState(partMap[pk])?.angle || 0;
        });
        const pose = {
            id: 'pose-' + Date.now(),
            name: name || 'Pose ' + new Date().toLocaleTimeString(),
            presetKey: presetKey || 'unknown',
            angles: angles,
            timestamp: Date.now()
        };
        const lib = this._loadPoseLibrary();
        lib.push(pose);
        this._savePoseLibrary(lib);
        Utils.showToast(`Pose "${pose.name}" saved`, 'success');
        return pose;
    },

    /**
     * Apply a saved pose to assembled parts.
     */
    loadPose(poseId) {
        const pose = this._getPoseById(poseId, this._detectAssembledMotionProfile());
        if (!pose) return;
        const partMap = this._getPartMotionChannelMap();
        if (this._shouldResetPoseToIdleFirst()) {
            this._resetAssembledPartsToIdleBaseline(partMap);
        }
        Object.keys(partMap).forEach(pk => {
            const angle = this._getPoseAngle(pose, pk);
            this._applyMotionChannelAngle(partMap[pk], angle);
        });
        this.objects._resolvePins();
        const poseContacts = this._getEditablePoseContactMap(pose);
        if (Object.keys(poseContacts).length) {
            this._applyBodyTagContacts(partMap, poseContacts, { silent: true });
        }
        this.stage.requestRender();
        eventBus.emit('history:push');
        Utils.showToast(`Pose "${pose.name}" loaded`, 'success');
    },

    /**
     * Blend between two poses with a ratio (0-1).
     */
    blendPoses(poseIdA, poseIdB, ratio) {
        const presetKey = this._detectAssembledMotionProfile();
        const poseA = this._getPoseById(poseIdA, presetKey);
        const poseB = this._getPoseById(poseIdB, presetKey);
        if (!poseA || !poseB) return;

        const partMap = this._getPartMotionChannelMap();
        if (this._shouldResetPoseToIdleFirst()) {
            this._resetAssembledPartsToIdleBaseline(partMap);
        }
        Object.keys(partMap).forEach(pk => {
            const a = this._getPoseAngle(poseA, pk);
            const b = this._getPoseAngle(poseB, pk);
            let angle = a + (b - a) * ratio;
            this._applyMotionChannelAngle(partMap[pk], angle);
        });
        this.objects._resolvePins();
        this.stage.requestRender();
    },

    deletePose(poseId) {
        if (this._getBuiltinPoseLibrary(this._detectAssembledMotionProfile()).some(p => p.id === poseId)) {
            Utils.showToast('Built-in poses cannot be deleted', 'info');
            return;
        }
        const lib = this._loadPoseLibrary().filter(p => p.id !== poseId);
        this._savePoseLibrary(lib);
    },

    showPoseLibrary() {
        document.getElementById('joint-pose-panel')?.remove();

        const partMap = this._getPartObjectMap();
        const hasAssembly = Object.keys(partMap).length >= 2;
        const presetKey = this._detectAssembledMotionProfile();
        const filteredLib = this._getPoseLibraryByPreset(presetKey);
        const builtInLib = filteredLib.filter(p => p.builtIn);
        const customLib = filteredLib.filter(p => !p.builtIn);
        const renderPoseCard = (pose) => `
            <div class="jpl-pose-card" data-pose="${pose.id}">
                <div class="jpl-pose-info">
                    <div class="jpl-pose-name-row">
                        <div class="jpl-pose-name">${this._escapeHtml(pose.name)}</div>
                        ${pose.builtIn ? '<span class="jpl-pose-badge">Built-in</span>' : ''}
                        ${this._entityHasBodyTagContacts(pose) ? '<span class="jpl-pose-badge" style="background:rgba(59,130,246,0.14);border-color:rgba(59,130,246,0.35);color:#93c5fd;">Body Tags</span>' : ''}
                    </div>
                    <div class="jpl-pose-meta">${[
                        pose.category,
                        `${Object.keys(pose.angles || {}).length} joints`,
                        presetKey ? null : this._friendlyPresetName(pose.presetKey)
                    ].filter(Boolean).map(v => this._escapeHtml(v)).join(' · ')}</div>
                </div>
                <div class="jpl-pose-actions">
                    <button class="jpl-targets" data-pose="${pose.id}" title="Contact Targets"><i class="fas fa-location-dot"></i></button>
                    <button class="jpl-load" data-pose="${pose.id}" title="Load pose"><i class="fas fa-play"></i></button>
                    ${pose.builtIn ? '' : `<button class="jpl-delete" data-pose="${pose.id}" title="Delete"><i class="fas fa-trash"></i></button>`}
                </div>
            </div>
        `;

        const panel = document.createElement('div');
        panel.id = 'joint-pose-panel';
        panel.className = 'joint-assembly-panel';

        panel.innerHTML = `
            <div class="ja-header" data-draggable="true">
                <i class="fas fa-bookmark"></i> Pose Library
                ${presetKey ? `<span class="ja-preset-badge">${this._friendlyPresetName(presetKey)}</span>` : ''}
                <button class="ja-close" title="Close"><i class="fas fa-times"></i></button>
            </div>
            <div class="ja-body">
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;">
                    <label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:11px;" title="When on, loading or blending poses first returns the rig to its idle baseline: stage angle 0, local Z rotation 0, and inner joint angles at 0. Turn this off only when intentionally combining with the current pose.">
                        <input type="checkbox" id="jpl-reset-idle-toggle" checked>
                        <i class="fas fa-rotate-left"></i> Reset To Idle First
                    </label>
                    <span style="font-size:10px;color:#777;">(turn off to combine)</span>
                </div>
                ${hasAssembly ? `
                    <div class="jpl-save-row">
                        <input type="text" id="jpl-pose-name" class="jpl-input" placeholder="Pose name…" maxlength="40">
                        <button id="jpl-save-btn" class="btn-small ja-btn-green"><i class="fas fa-save"></i> Save Current</button>
                    </div>
                ` : '<div class="ja-hint">Assemble body parts first to save poses.</div>'}
                <div class="jpl-list" id="jpl-list">
                    ${filteredLib.length === 0 ? '<div class="ja-hint">No poses available for this preset yet.</div>' :
                    `
                        ${builtInLib.length ? `<div class="ja-step-label">Built-in Poses</div>${builtInLib.map(renderPoseCard).join('')}` : ''}
                        ${customLib.length ? `<div class="ja-step-label">Saved Poses</div>${customLib.map(renderPoseCard).join('')}` : ''}
                    `}
                </div>
                ${filteredLib.length >= 2 ? `
                    <div class="jpl-blend-section">
                        <div class="ja-step-label">Blend Between Poses</div>
                        <div class="jpl-blend-row">
                            <select id="jpl-blend-a" class="jpl-input">
                                ${filteredLib.map(p => `<option value="${p.id}">${this._escapeHtml(p.name)}</option>`).join('')}
                            </select>
                            <input type="range" id="jpl-blend-slider" min="0" max="100" value="50" class="jpl-slider">
                            <select id="jpl-blend-b" class="jpl-input">
                                ${filteredLib.map((p, i) => `<option value="${p.id}" ${i === 1 ? 'selected' : ''}>${this._escapeHtml(p.name)}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;

        document.body.appendChild(panel);
        this._makeDraggable(panel);
        Utils.makePanelResizable(panel);

        // Bind events
        panel.querySelector('.ja-close').addEventListener('click', () => panel.remove());

        panel.querySelector('#jpl-save-btn')?.addEventListener('click', () => {
            const name = panel.querySelector('#jpl-pose-name').value.trim();
            this.savePose(name);
            panel.remove();
            this.showPoseLibrary(); // Refresh
        });

        panel.querySelectorAll('.jpl-load').forEach(btn => {
            btn.addEventListener('click', () => {
                this.loadPose(btn.dataset.pose);
            });
        });

        panel.querySelectorAll('.jpl-targets').forEach(btn => {
            btn.addEventListener('click', () => {
                this._showContactTargetEditor('pose', btn.dataset.pose);
            });
        });

        panel.querySelectorAll('.jpl-delete').forEach(btn => {
            btn.addEventListener('click', () => {
                this.deletePose(btn.dataset.pose);
                panel.remove();
                this.showPoseLibrary(); // Refresh
            });
        });

        // Blend slider
        const slider = panel.querySelector('#jpl-blend-slider');
        if (slider) {
            const blendHandler = () => {
                const idA = panel.querySelector('#jpl-blend-a').value;
                const idB = panel.querySelector('#jpl-blend-b').value;
                this.blendPoses(idA, idB, parseInt(slider.value) / 100);
            };
            slider.addEventListener('input', blendHandler);
            panel.querySelector('#jpl-blend-a').addEventListener('change', blendHandler);
            panel.querySelector('#jpl-blend-b').addEventListener('change', blendHandler);
        }
    },

    _escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    _friendlyPresetName(key) {
        switch (key) {
            case 'body-slicer-front':
                return 'Body Slicer · Front Facing';
            case 'body-slicer-side':
                return 'Body Slicer · Side Facing';
            default:
                break;
        }
        const preset = JointPresets.getAll().find(p => p.key === key) || RigPresets.getByKey(key);
        return preset ? preset.name : key;
    },


    // ═══════════════════════════════════════════════════════════════
    //  MIRROR POSE — Swap left↔right joint angles
    // ═══════════════════════════════════════════════════════════════

    _getMirrorPartKey(partKey) {
        if (!partKey || typeof partKey !== 'string') return null;
        if (partKey.startsWith('l-')) return 'r-' + partKey.slice(2);
        if (partKey.startsWith('r-')) return 'l-' + partKey.slice(2);
        if (partKey.startsWith('fl-')) return 'fr-' + partKey.slice(3);
        if (partKey.startsWith('fr-')) return 'fl-' + partKey.slice(3);
        if (partKey.startsWith('rl-')) return 'rr-' + partKey.slice(3);
        if (partKey.startsWith('rr-')) return 'rl-' + partKey.slice(3);
        if (partKey.includes('-l-')) return partKey.replace('-l-', '-r-');
        if (partKey.includes('-r-')) return partKey.replace('-r-', '-l-');
        if (partKey.includes('-left-')) return partKey.replace('-left-', '-right-');
        if (partKey.includes('-right-')) return partKey.replace('-right-', '-left-');
        return null;
    },

    _getMirrorPairs(partMap) {
        const pairs = [];
        const handled = new Set();

        Object.keys(partMap).forEach(partKey => {
            if (handled.has(partKey)) return;
            const mirrorKey = this._getMirrorPartKey(partKey);
            if (!mirrorKey || !partMap[mirrorKey] || handled.has(mirrorKey)) return;
            pairs.push([partKey, mirrorKey]);
            handled.add(partKey);
            handled.add(mirrorKey);
        });

        return pairs;
    },

    copyPoseToOpposite() {
        const partMap = this._getPartObjectMap();
        if (Object.keys(partMap).length === 0) {
            Utils.showToast('No assembled parts on stage', 'warning');
            return;
        }

        const selectedParts = Array.from(new Set(
            this.objects.getSelectedObjects()
                .filter(obj => obj.bodyPartData?.partKey)
                .map(obj => obj.bodyPartData.partKey)
        ));
        if (selectedParts.length === 0 && this._tuneSelected?.bodyPartData?.partKey) {
            selectedParts.push(this._tuneSelected.bodyPartData.partKey);
        }
        if (selectedParts.length === 0) {
            Utils.showToast('Select the source joints on one side first, then click Copy Across', 'info');
            return;
        }

        const selectedSet = new Set(selectedParts);
        const conflicts = [];
        const operations = [];

        selectedParts.forEach(sourceKey => {
            const targetKey = this._getMirrorPartKey(sourceKey);
            if (!targetKey || !partMap[targetKey]) return;
            if (selectedSet.has(targetKey)) {
                conflicts.push([sourceKey, targetKey].sort().join('↔'));
                return;
            }
            operations.push({ sourceKey, targetKey });
        });

        if (conflicts.length > 0) {
            Utils.showToast('Select only the source side when using Copy Across. Use Mirror to swap both sides.', 'warning');
            return;
        }
        if (operations.length === 0) {
            Utils.showToast('None of the selected joints have an opposite-side match', 'info');
            return;
        }

        const sourceStates = new Map();
        operations.forEach(({ sourceKey }) => {
            if (sourceStates.has(sourceKey)) return;
            const sourceObj = partMap[sourceKey];
            sourceStates.set(sourceKey, {
                angle: sourceObj?.jointBaseAngle ?? 0,
                tiltX: sourceObj?.tiltX ?? 0,
                tiltY: sourceObj?.tiltY ?? 0
            });
        });

        operations.forEach(({ sourceKey, targetKey }) => {
            const targetObj = partMap[targetKey];
            const sourceState = sourceStates.get(sourceKey);
            if (!targetObj || !sourceState) return;
            targetObj.jointBaseAngle = this._clampJointAngle(-(sourceState.angle ?? 0));
            targetObj.tiltX = Math.max(-45, Math.min(45, sourceState.tiltX ?? 0));
            targetObj.tiltY = Math.max(-45, Math.min(45, -(sourceState.tiltY ?? 0)));
        });

        this.objects._resolvePins();
        this.stage.requestRender();
        eventBus.emit('history:push');
        Utils.showToast(`Copied ${operations.length} joint pose${operations.length === 1 ? '' : 's'} to the opposite side`, 'success');
    },

    mirrorPose() {
        const partMap = this._getPartObjectMap();
        if (Object.keys(partMap).length === 0) {
            Utils.showToast('No assembled parts on stage', 'warning');
            return;
        }

        const pairs = this._getMirrorPairs(partMap);

        if (pairs.length === 0) {
            Utils.showToast('No left/right pairs found to mirror', 'info');
            return;
        }

        // Swap and negate angles between pairs
        pairs.forEach(([left, right]) => {
            const lObj = partMap[left];
            const rObj = partMap[right];
            const lAngle = lObj.jointBaseAngle || 0;
            const rAngle = rObj.jointBaseAngle || 0;

            // Negate when swapping (mirror reflection)
            let newLAngle = -rAngle;
            let newRAngle = -lAngle;

            lObj.jointBaseAngle = this._clampJointAngle(newLAngle);
            rObj.jointBaseAngle = this._clampJointAngle(newRAngle);
        });

        this.objects._resolvePins();
        this.stage.requestRender();
        eventBus.emit('history:push');
        Utils.showToast(`Mirrored ${pairs.length} L↔R joint pairs`, 'success');
    },


    // ═══════════════════════════════════════════════════════════════
    //  SIMPLE IK SOLVER — CCD (Cyclic Coordinate Descent)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Solve IK for a given end-effector object toward a target point.
     * Walks up the pin chain and adjusts jointBaseAngle values.
     * @param {StageObject} endObj — the tip of the chain (e.g. a hand)
     * @param {number} targetX — world X to reach
     * @param {number} targetY — world Y to reach
     * @param {number} iterations — CCD iterations (default 10)
     * @param {boolean} suppressRender — skip stage redraw when batching corrections
     */
    solveIK(endObj, targetX, targetY, iterations = 10, suppressRender = false) {
        if (!endObj || !endObj.bodyPartData) return;

        // Build the chain from end effector up to root
        const chain = [];
        let current = endObj;
        while (current && current.bodyPartData) {
            chain.push(current);
            if (!current.pinnedTo) break;
            current = this.objects.getObjectById(current.pinnedTo);
        }

        if (chain.length < 2) return;

        // CCD iterations
        for (let iter = 0; iter < iterations; iter++) {
            // Process from just before the tip up to the root
            for (let i = 1; i < chain.length; i++) {
                const joint = chain[i];
                const pivot = joint.getPivotPoint();

                // Get current end effector position
                const endPivot = endObj.getPivotPoint();

                // Vector from joint pivot to end effector
                const toEnd = Math.atan2(endPivot.y - pivot.y, endPivot.x - pivot.x);
                // Vector from joint pivot to target
                const toTarget = Math.atan2(targetY - pivot.y, targetX - pivot.x);

                // Angle difference
                let delta = (toTarget - toEnd) * 180 / Math.PI;
                // Normalize to -180..180
                while (delta > 180) delta -= 360;
                while (delta < -180) delta += 360;

                // Apply delta to joint's base angle
                let newAngle = (joint.jointBaseAngle || 0) + delta;

                joint.jointBaseAngle = this._clampJointAngle(newAngle);

                // Re-resolve pin positions so next joint sees updated positions
                if (this.objects._resolvePins) {
                    this.objects._resolvePins();
                }
            }

            // Check if close enough
            const finalPos = endObj.getPivotPoint();
            const dist = Math.hypot(targetX - finalPos.x, targetY - finalPos.y);
            if (dist < 2) break;
        }

        if (!suppressRender) this.stage.requestRender();
    },

});
