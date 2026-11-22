/* ============================================
   Animation Stage - Character Stack Policy
   Keeps complete armatures atomic in scene order while preserving each
   character's independent internal body-part order.
   ============================================ */

(function installCharacterStackPolicy(global) {
    'use strict';

    function createCharacterStackPolicy() {
        const text = (value) => String(value ?? '').trim();
        const finiteNumber = (value) => {
            const number = Number(value);
            return Number.isFinite(number) ? number : null;
        };
        const roleOf = (obj) => text(
            obj?._armatureRoleKey
            || obj?.armatureRoleKey
            || obj?._armaturePartKey
            || obj?.armaturePartKey
            || obj?.bodyPartData?.partKey
            || obj?.bodyPartData?.roleKey
            || ''
        ).toLowerCase();
        const explicitStackIdOf = (obj) => text(obj?._characterStackId || obj?.characterStackId);
        const explicitStackOrderOf = (obj) => finiteNumber(obj?._characterStackOrder ?? obj?.characterStackOrder);
        const sourceAliasesOf = (obj) => {
            if (!obj) return [];
            const aliases = [];
            const svgId = text(obj._svgCharacterInstanceId || obj.svgCharacterInstanceId);
            const ucFamilyId = text(
                obj._ucCharacterFamilyId
                || obj.ucCharacterFamilyId
                || obj._ucGarmentFamilyId
                || obj.ucGarmentFamilyId
            );
            if (svgId) aliases.push(`svg:${svgId}`);
            if (ucFamilyId) aliases.push(`uc:${ucFamilyId}`);
            return aliases;
        };
        const parentIdsOf = (obj) => {
            if (!obj) return [];
            return [
                obj.pinnedTo,
                obj.activityRootId,
                obj._facialParentHead,
                obj.facialParentHead,
                obj.faceRigPartParentId,
                obj._ucGarmentForPartId,
                obj.ucGarmentForPartId,
                obj._ucGarmentRootId,
                obj.ucGarmentRootId,
                obj._backViewScalpHairParentId,
                obj._ucClonePreviewRootId
            ].map(text).filter(Boolean);
        };
        const isRigLike = (obj) => !!(
            obj
            && (
                roleOf(obj)
                || obj._svgCharacter === true
                || obj.svgCharacter === true
                || obj._svgCharacterPart === true
                || obj.svgCharacterPart === true
                || Array.isArray(obj.joints) && obj.joints.length
            )
        );
        const isTorso = (obj) => roleOf(obj) === 'torso'
            || /(^|\s)torso(\s|$)/i.test(text(obj?.name));

        function buildModel(input) {
            const objects = Array.isArray(input) ? input.filter(Boolean) : [];
            const byId = new Map();
            const indexById = new Map();
            objects.forEach((obj, index) => {
                if (!obj?.id) return;
                byId.set(String(obj.id), obj);
                indexById.set(String(obj.id), index);
            });

            const explicitIdsByAlias = new Map();
            objects.forEach((obj) => {
                const explicitId = explicitStackIdOf(obj);
                if (!explicitId) return;
                sourceAliasesOf(obj).forEach((alias) => {
                    if (!explicitIdsByAlias.has(alias)) explicitIdsByAlias.set(alias, new Set());
                    explicitIdsByAlias.get(alias).add(explicitId);
                });
            });

            const memo = new Map();
            const resolving = new Set();
            const resolveKey = (obj) => {
                if (!obj?.id) return null;
                const objectId = String(obj.id);
                if (memo.has(objectId)) return memo.get(objectId);
                if (resolving.has(objectId)) return null;
                resolving.add(objectId);

                const explicitId = explicitStackIdOf(obj);
                if (explicitId) {
                    const key = `stack:${explicitId}`;
                    memo.set(objectId, key);
                    resolving.delete(objectId);
                    return key;
                }

                for (const parentId of parentIdsOf(obj)) {
                    const parent = byId.get(parentId);
                    const parentKey = parent ? resolveKey(parent) : null;
                    if (parentKey) {
                        memo.set(objectId, parentKey);
                        resolving.delete(objectId);
                        return parentKey;
                    }
                }

                const aliases = sourceAliasesOf(obj);
                for (const alias of aliases) {
                    const linkedExplicitIds = explicitIdsByAlias.get(alias);
                    if (linkedExplicitIds?.size === 1) {
                        const key = `stack:${Array.from(linkedExplicitIds)[0]}`;
                        memo.set(objectId, key);
                        resolving.delete(objectId);
                        return key;
                    }
                }
                if (aliases.length) {
                    memo.set(objectId, aliases[0]);
                    resolving.delete(objectId);
                    return aliases[0];
                }

                if (isRigLike(obj)) {
                    let root = obj;
                    const visited = new Set([objectId]);
                    while (root) {
                        const parentId = parentIdsOf(root).find(id => byId.has(id) && !visited.has(id));
                        if (!parentId) break;
                        visited.add(parentId);
                        root = byId.get(parentId);
                    }
                    const key = root?.id ? `armature:${root.id}` : null;
                    memo.set(objectId, key);
                    resolving.delete(objectId);
                    return key;
                }

                memo.set(objectId, null);
                resolving.delete(objectId);
                return null;
            };

            const grouped = new Map();
            objects.forEach((obj, index) => {
                const key = resolveKey(obj);
                if (!key) return;
                if (!grouped.has(key)) grouped.set(key, { key, members: [], firstIndex: index });
                const group = grouped.get(key);
                group.members.push(obj);
                group.firstIndex = Math.min(group.firstIndex, index);
            });

            const characterBundles = [];
            const byObjectId = new Map();
            grouped.forEach((group) => {
                const qualifiedByIdentity = /^(stack|svg|uc):/.test(group.key);
                const rigMembers = group.members.filter(isRigLike);
                const qualifiedGenericArmature = rigMembers.length >= 2 && rigMembers.some(isTorso);
                if (!qualifiedByIdentity && !qualifiedGenericArmature) return;

                const visibleTorsos = group.members.filter(obj => isTorso(obj) && obj.visible !== false);
                const torsos = group.members.filter(isTorso);
                const root = visibleTorsos[0] || torsos[0] || group.members.find(obj => !parentIdsOf(obj).some(id => byId.has(id))) || group.members[0];
                const explicitId = group.members.map(explicitStackIdOf).find(Boolean) || '';
                const rootOrder = explicitStackOrderOf(root);
                const memberOrder = group.members.map(explicitStackOrderOf).find(value => value != null);
                const order = rootOrder ?? memberOrder ?? group.firstIndex;
                const bundle = {
                    key: group.key,
                    stackId: explicitId,
                    order,
                    explicitOrder: rootOrder ?? memberOrder,
                    firstIndex: group.firstIndex,
                    root,
                    members: group.members.slice()
                };
                characterBundles.push(bundle);
                group.members.forEach((obj) => {
                    if (obj?.id) byObjectId.set(String(obj.id), bundle);
                });
            });

            characterBundles.sort((left, right) => (
                (left.order - right.order)
                || (left.firstIndex - right.firstIndex)
                || left.key.localeCompare(right.key)
            ));

            return { objects, byId, indexById, byObjectId, characterBundles };
        }

        function orderObjects(input, localLayerOf) {
            const objects = Array.isArray(input) ? input.filter(Boolean) : [];
            if (objects.length < 2) return objects;
            const model = buildModel(objects);
            const readLocalLayer = typeof localLayerOf === 'function'
                ? localLayerOf
                : (obj, index) => finiteNumber(obj?._armatureDrawLayer ?? obj?.armatureDrawLayer) ?? index;

            if (!model.characterBundles.length) {
                return objects
                    .map((obj, index) => ({ obj, index, layer: readLocalLayer(obj, index) }))
                    .sort((left, right) => (left.layer - right.layer) || (left.index - right.index))
                    .map(entry => entry.obj);
            }

            const slots = [];
            const emittedCharacters = new Set();
            objects.forEach((obj) => {
                const bundle = obj?.id ? model.byObjectId.get(String(obj.id)) : null;
                if (!bundle) {
                    slots.push({ type: 'object', obj });
                    return;
                }
                if (emittedCharacters.has(bundle.key)) return;
                emittedCharacters.add(bundle.key);
                slots.push({ type: 'character' });
            });

            let characterIndex = 0;
            const ordered = [];
            slots.forEach((slot) => {
                if (slot.type === 'object') {
                    ordered.push(slot.obj);
                    return;
                }
                const bundle = model.characterBundles[characterIndex++];
                if (!bundle) return;
                const collar=bundle.members.find(isTorso);
                const collarLayer=collar?readLocalLayer(collar,model.indexById.get(String(collar.id))??0):null;
                bundle.members
                    .map((obj) => {
                        const index = model.indexById.get(String(obj.id)) ?? 0;
                        let layer=readLocalLayer(obj,index);
                        // Independent photo necks tuck beneath the collar in every renderer.
                        if(collarLayer!=null && roleOf(obj)==='head-neck' && (obj._svgAfricanJointProfile||obj.svgAfricanJointProfile)?.neck?.collarOverlap)layer=Math.min(layer,collarLayer-.01);
                        return { obj, index, layer };
                    })
                    .sort((left, right) => (left.layer - right.layer) || (left.index - right.index))
                    .forEach(entry => ordered.push(entry.obj));
            });
            return ordered;
        }

        return {
            buildModel,
            orderObjects,
            roleOf,
            explicitStackIdOf,
            explicitStackOrderOf,
            isRigLike,
            getRuntimeSource(variableName = 'runtimeCharacterStackPolicy') {
                const safeName = /^[A-Za-z_$][\w$]*$/.test(variableName)
                    ? variableName
                    : 'runtimeCharacterStackPolicy';
                return `var ${safeName} = (${createCharacterStackPolicy.toString()})();`;
            }
        };
    }

    global.CharacterStackPolicy = createCharacterStackPolicy();
})(globalThis);
