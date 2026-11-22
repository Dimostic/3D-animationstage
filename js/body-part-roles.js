(function(global) {
    'use strict';

    const ROLE_DEFS = [
        { key: 'torso', label: 'Torso', region: 'body', aliases: ['trunk', 'body', 'chest', 'abdomen', 'main-body'] },
        { key: 'head-neck', label: 'Head / Neck', region: 'head', aliases: ['head', 'neck', 'head-neck', 'head neck', 'face', 'skull'] },
        { key: 'head', label: 'Head', region: 'head', aliases: ['head-only', 'face-only'] },
        { key: 'neck', label: 'Neck', region: 'head', aliases: ['neck-only'] },

        { key: 'right-arm', label: 'Right Arm', side: 'right', region: 'arm', view: 'front', aliases: ['r-arm', 'right arm', 'viewer-left-arm', 'stage-left-arm', 'front-right-arm', 'right-upper-limb'] },
        { key: 'left-arm', label: 'Left Arm', side: 'left', region: 'arm', view: 'front', aliases: ['l-arm', 'left arm', 'viewer-right-arm', 'stage-right-arm', 'front-left-arm', 'left-upper-limb'] },
        { key: 'front-arm', label: 'Front Arm', side: 'front', region: 'arm', view: 'side', aliases: ['near-arm', 'visible-arm', 'profile-front-arm', 'side-front-arm'] },
        { key: 'back-arm', label: 'Back Arm', side: 'back', region: 'arm', view: 'side', aliases: ['far-arm', 'rear-arm', 'profile-back-arm', 'side-back-arm'] },
        { key: 'r-upper-arm', label: 'Right Upper Arm', side: 'right', region: 'upper-arm', aliases: ['right-upper-arm', 'right shoulder arm', 'right-shoulder-arm', 'upper-right-arm'] },
        { key: 'r-forearm', label: 'Right Forearm', side: 'right', region: 'forearm', aliases: ['right-forearm', 'right-lower-arm', 'r-lower-arm'] },
        { key: 'r-hand', label: 'Right Hand', side: 'right', region: 'hand', aliases: ['right-hand', 'right palm', 'right-palm'] },
        { key: 'l-upper-arm', label: 'Left Upper Arm', side: 'left', region: 'upper-arm', aliases: ['left-upper-arm', 'left shoulder arm', 'left-shoulder-arm', 'upper-left-arm'] },
        { key: 'l-forearm', label: 'Left Forearm', side: 'left', region: 'forearm', aliases: ['left-forearm', 'left-lower-arm', 'l-lower-arm'] },
        { key: 'l-hand', label: 'Left Hand', side: 'left', region: 'hand', aliases: ['left-hand', 'left palm', 'left-palm'] },

        { key: 'right-leg', label: 'Right Leg', side: 'right', region: 'leg', view: 'front', aliases: ['r-leg', 'right leg', 'viewer-left-leg', 'stage-left-leg', 'front-right-leg', 'right-lower-limb'] },
        { key: 'left-leg', label: 'Left Leg', side: 'left', region: 'leg', view: 'front', aliases: ['l-leg', 'left leg', 'viewer-right-leg', 'stage-right-leg', 'front-left-leg', 'left-lower-limb'] },
        { key: 'front-leg', label: 'Front Leg', side: 'front', region: 'leg', view: 'side', aliases: ['near-leg', 'visible-leg', 'profile-front-leg', 'side-front-leg'] },
        { key: 'back-leg', label: 'Back Leg', side: 'back', region: 'leg', view: 'side', aliases: ['far-leg', 'rear-leg', 'profile-back-leg', 'side-back-leg'] },
        { key: 'r-upper-leg', label: 'Right Thigh', side: 'right', region: 'upper-leg', aliases: ['right-thigh', 'right-upper-leg', 'right upper leg'] },
        { key: 'r-lower-leg', label: 'Right Lower Leg', side: 'right', region: 'lower-leg', aliases: ['right-shin', 'right-calf', 'right-lower-leg'] },
        { key: 'r-foot', label: 'Right Foot', side: 'right', region: 'foot', aliases: ['right-foot', 'right-ankle-foot'] },
        { key: 'l-upper-leg', label: 'Left Thigh', side: 'left', region: 'upper-leg', aliases: ['left-thigh', 'left-upper-leg', 'left upper leg'] },
        { key: 'l-lower-leg', label: 'Left Lower Leg', side: 'left', region: 'lower-leg', aliases: ['left-shin', 'left-calf', 'left-lower-leg'] },
        { key: 'l-foot', label: 'Left Foot', side: 'left', region: 'foot', aliases: ['left-foot', 'left-ankle-foot'] },

        { key: 'mouth', label: 'Mouth', region: 'face', aliases: ['face-mouth', 'lips', 'lip', 'upper-lip', 'lower-lip'] },
        { key: 'eye-left', label: 'Left Eye', side: 'left', region: 'face', aliases: ['left-eye', 'face-eye-left', 'l-eye'] },
        { key: 'eye-right', label: 'Right Eye', side: 'right', region: 'face', aliases: ['right-eye', 'face-eye-right', 'r-eye'] },
        { key: 'brow-left', label: 'Left Brow', side: 'left', region: 'face', aliases: ['left-brow', 'left-eyebrow', 'l-brow', 'face-brow-left'] },
        { key: 'brow-right', label: 'Right Brow', side: 'right', region: 'face', aliases: ['right-brow', 'right-eyebrow', 'r-brow', 'face-brow-right'] },
        { key: 'iris-left', label: 'Left Iris / Pupil', side: 'left', region: 'face', aliases: ['left-iris', 'left-pupil', 'l-iris', 'face-iris-left'] },
        { key: 'iris-right', label: 'Right Iris / Pupil', side: 'right', region: 'face', aliases: ['right-iris', 'right-pupil', 'r-iris', 'face-iris-right'] }
    ];

    const ROLE_MAP = new Map();
    const ALIAS_TO_KEY = new Map();

    function normalizeKey(value) {
        return String(value || '')
            .toLowerCase()
            .replace(/[–—]/g, '-')
            .replace(/[_:/]+/g, '-')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    function register(def) {
        const key = normalizeKey(def.key);
        const aliases = new Set([key, normalizeKey(def.label), ...(def.aliases || []).map(normalizeKey)]);
        ROLE_MAP.set(key, { ...def, key, aliases: Array.from(aliases).filter(Boolean) });
        aliases.forEach(alias => {
            if (alias) ALIAS_TO_KEY.set(alias, key);
        });
    }

    ROLE_DEFS.forEach(register);

    function canonicalize(value) {
        const normalized = normalizeKey(value);
        if (!normalized) return '';
        if (ALIAS_TO_KEY.has(normalized)) return ALIAS_TO_KEY.get(normalized);
        const compact = normalized.replace(/-/g, '');
        for (const [alias, key] of ALIAS_TO_KEY.entries()) {
            if (alias.replace(/-/g, '') === compact) return key;
        }
        return normalized;
    }

    function getRoleOptions() {
        return Array.from(ROLE_MAP.values()).map(def => ({
            key: def.key,
            label: def.label,
            side: def.side || '',
            region: def.region || '',
            view: def.view || ''
        }));
    }

    function getAliases(value) {
        const canonical = canonicalize(value);
        const def = ROLE_MAP.get(canonical);
        const aliases = new Set([normalizeKey(value), canonical]);
        if (def) def.aliases.forEach(alias => aliases.add(alias));

        if (canonical === 'right-arm') ['front-arm', 'r-arm'].forEach(v => aliases.add(v));
        if (canonical === 'left-arm') ['back-arm', 'l-arm'].forEach(v => aliases.add(v));
        if (canonical === 'right-leg') ['front-leg', 'r-leg'].forEach(v => aliases.add(v));
        if (canonical === 'left-leg') ['back-leg', 'l-leg'].forEach(v => aliases.add(v));
        if (canonical === 'front-arm') ['right-arm', 'r-arm'].forEach(v => aliases.add(v));
        if (canonical === 'back-arm') ['left-arm', 'l-arm'].forEach(v => aliases.add(v));
        if (canonical === 'front-leg') ['right-leg', 'r-leg'].forEach(v => aliases.add(v));
        if (canonical === 'back-leg') ['left-leg', 'l-leg'].forEach(v => aliases.add(v));

        return Array.from(aliases).map(normalizeKey).filter(Boolean);
    }

    function getObjectTokens(obj) {
        if (!obj) return [];
        const tags = Array.isArray(obj.tags) ? obj.tags : [];
        const body = obj.bodyPartData || {};
        return [
            obj._armatureRoleKey,
            obj._armaturePartKey,
            obj._guidedPartKey,
            obj.partKey,
            body.partKey,
            body.role,
            body.jointName,
            body.label,
            body.sourcePartKey,
            obj.name,
            ...tags
        ].filter(Boolean);
    }

    function resolveObjectRole(obj) {
        const tokens = getObjectTokens(obj);
        for (const token of tokens) {
            const cleaned = String(token).replace(/^(body-part|body-role|part|role)\s*[:=]\s*/i, '');
            const canonical = canonicalize(cleaned);
            if (ROLE_MAP.has(canonical)) return { canonical, def: ROLE_MAP.get(canonical), source: token };
        }
        return null;
    }

    function matches(obj, roleOrAlias) {
        const needles = getAliases(roleOrAlias);
        if (!needles.length) return false;
        const role = resolveObjectRole(obj);
        if (role && needles.includes(role.canonical)) return true;
        const hay = getObjectTokens(obj).flatMap(token => getAliases(token));
        return needles.some(needle => hay.some(value => (
            value === needle
            || (needle.length >= 6 && value.length >= 6 && value.includes(needle))
            || (needle.length >= 6 && value.length >= 6 && needle.includes(value))
        )));
    }

    function inferIntent(value) {
        const text = normalizeKey(value);
        if (/arm|hand|forearm/.test(text)) return 'arm';
        if (/leg|foot|thigh|shin|calf/.test(text)) return 'leg';
        if (/eye|iris|pupil/.test(text)) return 'eye';
        if (/mouth|lip/.test(text)) return 'mouth';
        if (/brow/.test(text)) return 'brow';
        if (/head|neck/.test(text)) return 'head';
        if (/torso|trunk|body/.test(text)) return 'torso';
        return 'generic';
    }

    function score(obj, roleOrAlias) {
        if (!obj) return -999;
        const role = resolveObjectRole(obj);
        const canonical = canonicalize(roleOrAlias);
        const aliases = getAliases(roleOrAlias);
        const tokens = getObjectTokens(obj).map(normalizeKey).filter(Boolean);
        const text = tokens.join(' ');
        let value = 0;

        if (role?.canonical === canonical) value += 160;
        if (role && aliases.includes(role.canonical)) value += 110;
        if (tokens.includes(canonical)) value += 90;
        if (aliases.some(alias => tokens.includes(alias))) value += 75;
        if (aliases.some(alias => alias.length >= 4 && text.includes(alias))) value += 35;

        const intent = inferIntent(roleOrAlias);
        const objIntent = role?.def?.region || inferIntent(text);
        if (intent !== 'generic' && (objIntent.includes(intent) || text.includes(intent))) value += 30;
        if (intent === 'arm' && /leg|foot|eye|brow|mouth|lip/.test(text)) value -= 90;
        if (intent === 'leg' && /arm|hand|eye|brow|mouth|lip/.test(text)) value -= 90;
        if (intent === 'eye' && /arm|leg|mouth|lip|torso/.test(text)) value -= 80;
        if (intent === 'mouth' && /arm|leg|eye|brow|torso/.test(text)) value -= 80;

        if (Array.isArray(obj.joints) && obj.joints.length) value += Math.min(45, obj.joints.length * 12);
        if (Array.isArray(obj.flexPins) && obj.flexPins.length) value += 8;
        if (obj._armatureRoleKey || obj._armaturePartKey || obj.bodyPartData?.partKey) value += 15;

        return value;
    }

    function relatedTo(base, obj) {
        if (!base || !obj) return false;
        if (obj === base || obj.id === base.id) return true;
        const fields = ['groupId', '_armatureId', '_guidedRigId', '_bodyStencilId'];
        for (const field of fields) {
            if (base[field] && obj[field] && base[field] === obj[field]) return true;
        }
        const baseBody = base.bodyPartData || {};
        const objBody = obj.bodyPartData || {};
        const bodyFields = ['rigId', 'assemblyId', 'characterId', 'groupId', 'sourceObjectId'];
        for (const field of bodyFields) {
            if (baseBody[field] && objBody[field] && baseBody[field] === objBody[field]) return true;
        }
        if (base.pinnedTo && (obj.pinnedTo === base.pinnedTo || obj.id === base.pinnedTo)) return true;
        if (obj.pinnedTo && obj.pinnedTo === base.id) return true;
        return false;
    }

    function findCharacterParts(objects, base) {
        const list = Array.isArray(objects) ? objects.filter(Boolean) : [];
        if (!base) return list.filter(obj => resolveObjectRole(obj));
        const related = list.filter(obj => relatedTo(base, obj));
        const pool = related.length > 1 ? related : list.filter(obj => resolveObjectRole(obj));
        const result = pool.filter(obj => obj === base || resolveObjectRole(obj) || relatedTo(base, obj));
        return result.length ? Array.from(new Set(result)) : [base];
    }

    function findMatching(objects, roleOrAlias, base) {
        const pool = base ? findCharacterParts(objects, base) : (Array.isArray(objects) ? objects : []);
        return pool
            .filter(obj => matches(obj, roleOrAlias))
            .map(obj => ({ obj, score: score(obj, roleOrAlias) }))
            .sort((a, b) => b.score - a.score)
            .map(entry => entry.obj);
    }

    function assignRole(obj, roleOrAlias, options = {}) {
        if (!obj) return null;
        const canonical = canonicalize(roleOrAlias);
        const def = ROLE_MAP.get(canonical) || { key: canonical, label: roleOrAlias, aliases: [canonical] };
        obj.bodyPartData = {
            ...(obj.bodyPartData || {}),
            partKey: canonical,
            role: canonical,
            label: def.label || canonical,
            side: def.side || '',
            region: def.region || '',
            view: def.view || ''
        };
        if (options.setArmatureKey) obj._armatureRoleKey = canonical;
        const tags = new Set(Array.isArray(obj.tags) ? obj.tags : []);
        tags.add(`body-part:${canonical}`);
        obj.tags = Array.from(tags);
        return obj.bodyPartData;
    }

    function getObjectsManager() {
        return global.app?.objects || null;
    }

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, ch => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[ch]));
    }

    function openRelabelPanel() {
        const manager = getObjectsManager();
        const selected = manager?.getSelectedObjects?.() || [];
        if (!manager || !selected.length) {
            global.Utils?.showToast?.('Select one or more body parts first, then choose Relabel Parts.', 'warning');
            return;
        }

        const existing = document.querySelector('.body-part-relabel-modal');
        if (existing) existing.remove();

        const roles = getRoleOptions();
        const roleOptionsHtml = roles
            .map(role => `<option value="${escapeHtml(role.key)}">${escapeHtml(role.label)}</option>`)
            .join('');

        const overlay = document.createElement('div');
        overlay.className = 'confirm-modal-overlay body-part-relabel-modal';
        overlay.innerHTML = `
            <div class="confirm-modal-box code-scope-modal body-part-relabel-box">
                <h3>Relabel Body Parts</h3>
                <p>Assign standard labels to selected parts so Smart Cut, Body Slicer, Pose Armature, Flex Rig, and code templates can use the same movement names.</p>
                <div class="body-part-relabel-list">
                    ${selected.map((obj, index) => {
                        const resolved = resolveObjectRole(obj);
                        const current = resolved?.canonical || '';
                        return `
                            <label class="body-part-relabel-row" data-object-id="${escapeHtml(obj.id)}">
                                <span class="body-part-relabel-name">${escapeHtml(obj.name || `Part ${index + 1}`)}</span>
                                <select class="body-part-relabel-select">
                                    <option value="">No body label</option>
                                    ${roleOptionsHtml}
                                </select>
                                <small>${current ? `Detected: ${escapeHtml(ROLE_MAP.get(current)?.label || current)}` : 'No role detected'}</small>
                            </label>`;
                    }).join('')}
                </div>
                <div class="confirm-modal-actions">
                    <button class="confirm-modal-cancel" data-action="auto">Auto Detect</button>
                    <button class="confirm-modal-cancel" data-action="close">Cancel</button>
                    <button class="confirm-modal-confirm" data-action="apply">Apply Labels</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);

        overlay.querySelectorAll('.body-part-relabel-row').forEach(row => {
            const obj = manager.getObjectById?.(row.getAttribute('data-object-id'));
            const resolved = resolveObjectRole(obj);
            const select = row.querySelector('.body-part-relabel-select');
            if (select && resolved?.canonical) select.value = resolved.canonical;
        });

        const close = () => overlay.remove();
        overlay.addEventListener('click', event => {
            if (event.target === overlay) close();
        });
        overlay.querySelector('[data-action="close"]')?.addEventListener('click', close);
        overlay.querySelector('[data-action="auto"]')?.addEventListener('click', () => {
            overlay.querySelectorAll('.body-part-relabel-row').forEach(row => {
                const obj = manager.getObjectById?.(row.getAttribute('data-object-id'));
                const resolved = resolveObjectRole(obj);
                const select = row.querySelector('.body-part-relabel-select');
                if (select && resolved?.canonical) select.value = resolved.canonical;
            });
            global.Utils?.showToast?.('Detected labels refreshed. Review and apply when ready.', 'info');
        });
        overlay.querySelector('[data-action="apply"]')?.addEventListener('click', () => {
            let count = 0;
            overlay.querySelectorAll('.body-part-relabel-row').forEach(row => {
                const obj = manager.getObjectById?.(row.getAttribute('data-object-id'));
                const value = row.querySelector('.body-part-relabel-select')?.value || '';
                if (!obj || !value) return;
                assignRole(obj, value, { setArmatureKey: false });
                count++;
            });
            if (count) {
                global.eventBus?.emit?.('object:updated', selected[0] || null);
                global.eventBus?.emit?.('history:push');
                global.app?.stage?.requestRender?.();
                global.Utils?.showToast?.(`Relabeled ${count} body part${count === 1 ? '' : 's'}.`, 'success');
            }
            close();
        });
    }

    function initRelabelButton() {
        const button = document.getElementById('btn-body-part-relabel');
        if (button && !button.dataset.bodyRoleBound) {
            button.dataset.bodyRoleBound = '1';
            button.addEventListener('click', openRelabelPanel);
        }

        const reportButton = document.getElementById('btn-role-compat-report');
        if (reportButton && !reportButton.dataset.bodyRoleReportBound) {
            reportButton.dataset.bodyRoleReportBound = '1';
            reportButton.addEventListener('click', () => {
                const jointSystem = global.app?.jointSystem || null;
                if (jointSystem?.showRoleCompatibilityReport) {
                    jointSystem.showRoleCompatibilityReport();
                    return;
                }
                global.Utils?.showToast?.('Role report is available after joint tools finish loading.', 'warning');
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initRelabelButton);
    } else {
        initRelabelButton();
    }

    global.BodyPartRoles = Object.freeze({
        normalizeKey,
        canonicalize,
        getAliases,
        getRoleOptions,
        resolveObjectRole,
        matches,
        score,
        findCharacterParts,
        findMatching,
        assignRole,
        openRelabelPanel
    });
})(window);
