/* Editable library artwork stays self-contained in the ordinary object/template format. */
(function (global) {
    'use strict';
    const lib = global.BUILTIN_PROP_LIBRARY;
    const props = new Map(Object.values(lib.items).flat().map(p => [p.id, p]));
    const ns = 'http://www.w3.org/2000/svg';
    const parse = svg => new DOMParser().parseFromString(svg, 'image/svg+xml');
    const serialize = doc => new XMLSerializer().serializeToString(doc);
    const dataUrl = svg => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    const clone = value => JSON.parse(JSON.stringify(value));
    let activeClose = null;
    const hex = value => /^#[0-9a-f]{6}$/i.test(value || '');
    const node = (tag, attrs = {}, text) => {
        const el = document.createElement(tag);
        Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
        if (text != null) el.textContent = text;
        return el;
    };
    function colors(svg) {
        const result = new Set();
        parse(svg).querySelectorAll('*').forEach(el => ['fill', 'stroke', 'stop-color'].forEach(attr => {
            const value = el.getAttribute(attr); if (hex(value)) result.add(value.toLowerCase());
        }));
        return [...result];
    }
    function paint(svg, replacements = {}) {
        const doc = parse(svg);
        doc.querySelectorAll('*').forEach(el => ['fill', 'stroke', 'stop-color'].forEach(attr => {
            const replacement = replacements[el.getAttribute(attr)?.toLowerCase()];
            if (hex(replacement)) el.setAttribute(attr, replacement);
        }));
        return serialize(doc);
    }
    function variant(scene, options = {}) {
        const result = clone(scene);
        result.design = { layout: options.layout === 'portrait' ? 'portrait' : 'wide', time: options.time === 'night' ? 'night' : 'day' };
        if (result.design.layout === 'portrait') {
            const doc = parse(scene.backdrop), root = doc.documentElement;
            const originalW = scene.backdropW || 900;
            const base = root.querySelector('rect'), rects = [...root.querySelectorAll('rect')];
            const floor = rects.find(r => +r.getAttribute('width') >= originalW && +r.getAttribute('y') > 0);
            const wallColor = base?.getAttribute('fill') || '#e9eef2', floorColor = floor?.getAttribute('fill') || '#acbcc2';
            const floorTop = floor?.getAttribute('y');
            if (floorTop) root.querySelectorAll('path').forEach(path => {
                const commands = path.getAttribute('d')?.trim().replace(/\s+/g, ' ');
                if (commands === `M0 ${floorTop} H${originalW}`) path.remove();
            });
            base?.remove(); floor?.remove();
            const feature = doc.createElementNS(ns, 'g');
            // Keep buildings on the floor when adapting a wide scene to portrait.
            const featureScale = 540 / originalW;
            const featureY = floorTop == null ? 300 : 650 - Number(floorTop) * featureScale;
            feature.setAttribute('transform', `translate(0 ${featureY}) scale(${featureScale})`);
            while (root.firstChild) feature.append(root.firstChild);
            root.setAttribute('viewBox', '0 0 540 900'); root.setAttribute('width', '540'); root.setAttribute('height', '900');
            const rect = (y, h, fill) => { const r = doc.createElementNS(ns, 'rect'); Object.entries({ width: 540, y, height: h, fill }).forEach(([k, v]) => r.setAttribute(k, v)); return r; };
            root.append(rect(0, 900, wallColor), feature, rect(650, 250, floorColor));
            result.backdrop = serialize(doc); result.backdropW = 540; result.backdropH = 900;
            const scale = 540 / originalW, oldGround = scene.groundY ?? 150;
            result.groundY = 300;
            result.pieces = scene.pieces.map(p => ({ ...p, oX: (p.oX || 0) * scale,
                oY: p.ground ? undefined : 300 + ((p.oY || 0) - oldGround) * scale,
                w: (p.w || props.get(p.propId)?.w || 120) * scale,
                h: (p.h || props.get(p.propId)?.h || 120) * scale }));
        }
        if (result.design.time === 'night') {
            const replacements = {};
            colors(result.backdrop).forEach(c => {
                // Dim architecture, retaining material hues; lit window panes remain warm.
                replacements[c] = ['#b9dfed', '#bcd6ef'].includes(c) ? '#f3dba1' : '#' + [1, 3, 5].map((offset, i) => Math.round(parseInt(c.slice(offset, offset + 2), 16) * [0.48, 0.52, 0.64][i]).toString(16).padStart(2, '0')).join('');
            });
            result.backdrop = paint(result.backdrop, replacements);
        }
        return result;
    }
    function metadata(propId, extra = {}) { return { version: 1, kind: propId ? 'prop' : 'backdrop', propId, view: 'front', colors: {}, ...extra }; }
    function infer(obj) {
        if (obj.sceneAsset) return clone(obj.sceneAsset);
        const prop = [...props.values()].find(p => p.name === obj.name && (obj.type === 'icon' || obj.imageSrc === dataUrl(p.svg)));
        if (prop) return metadata(prop.id);
        const scene = lib.scenes.find(s => obj.imageSrc === dataUrl(s.backdrop));
        return scene ? metadata(null, { sceneId: scene.id, ground: .5 + (scene.groundY ?? 150) / (scene.backdropH || 520) }) : null;
    }
    function artwork(obj) {
        const meta = obj.sceneAsset, prop = props.get(meta?.propId);
        if (meta?.activityArtworks?.[meta.view]) return meta.activityArtworks[meta.view];
        if (prop) return prop.views?.[meta.view] || prop.svg || '';
        if (meta?.kind === 'backdrop') {
            const scene = lib.scenes.find(s => s.id === meta.sceneId);
            return scene ? variant(scene, meta.design).backdrop : '';
        }
        return '';
    }
    function refresh(obj) {
        if (obj.type === 'icon') return;
        const svg = artwork(obj); if (!svg) return;
        obj.imageSrc = dataUrl(paint(svg, obj.sceneAsset.colors));
        obj.loadImage(obj.imageSrc, { preserveDimensions: true });
    }
    function visualBox(obj) {
        const svg = artwork(obj); if (!svg) return { x: 0, y: 0, width: 1, height: 1 };
        const root = document.importNode(parse(svg).documentElement, true);
        root.style.cssText = 'position:fixed;left:-10000px;top:0;visibility:hidden';
        document.body.append(root);
        try {
            const b = root.getBBox(), v = root.viewBox.baseVal;
            const iw = +root.getAttribute('width') || v.width, ih = +root.getAttribute('height') || v.height;
            const scale = Math.min(iw / v.width, ih / v.height);
            const dx = (iw - v.width * scale) / 2, dy = (ih - v.height * scale) / 2;
            return { x: (dx + (b.x - v.x) * scale) / iw, y: (dy + (b.y - v.y) * scale) / ih,
                width: b.width * scale / iw, height: b.height * scale / ih };
        } finally { root.remove(); }
    }
    function floorY(manager, objects) {
        const backdrop = objects.find(o => o.sceneAsset?.kind === 'backdrop' && o.visible !== false);
        return backdrop ? backdrop.y + backdrop.height * (backdrop.sceneAsset.ground ?? .85) : manager.stage.height * .9;
    }
    function place(obj, y) {
        if (obj.rotation || obj.imageZoom > 1 || obj.imagePanX || obj.imagePanY) throw new Error('Reset rotation and image crop before aligning this prop.');
        const b = visualBox(obj); obj.y = y - obj.height * (b.y + b.height);
    }
    function surfaceRatio(obj) {
        const view = obj.sceneAsset?.view || 'front', id = obj.sceneAsset?.propId;
        const family = view.replace(/-(left|right)$/, '');
        const ratio = view === 'front' || view === 'back' ? lib.surfaces[id] : lib.surfaceViews?.[id]?.[family];
        if (!Number.isFinite(ratio)) return null;
        const root = parse(artwork(obj)).documentElement, v = root.getAttribute('viewBox')?.split(/\s+/).map(Number);
        if (!v || v.length !== 4) return null;
        const iw = +root.getAttribute('width') || v[2], ih = +root.getAttribute('height') || v[3];
        const height = v[3] * Math.min(iw / v[2], ih / v[3]);
        return ((ih - height) / 2 + height * ratio) / ih;
    }
    function surfaceY(obj) {
        if (obj.rotation || obj.imageZoom > 1 || obj.imagePanX || obj.imagePanY) return null;
        const ratio = surfaceRatio(obj);
        return ratio == null ? null : obj.y + obj.height * ratio;
    }
    const storageKey = 'animstage.scene-library.v1';
    function readLibrary() {
        try { const value = JSON.parse(localStorage.getItem(storageKey) || '{}'); return { favorites: Array.isArray(value.favorites) ? value.favorites.filter(x => typeof x === 'string').slice(0, 200) : [], recent: Array.isArray(value.recent) ? value.recent.filter(x => typeof x === 'string').slice(0, 30) : [] }; }
        catch (_) { return { favorites: [], recent: [] }; }
    }
    function saveLibrary(value) { try { localStorage.setItem(storageKey, JSON.stringify(value)); } catch (_) { Utils.showToast('Library preferences could not be saved in this browser.', 'warning'); } }
    function recent(id) { const value = readLibrary(); value.recent = [id, ...value.recent.filter(x => x !== id)].slice(0, 30); saveLibrary(value); document.getElementById('prop-lib-saved')?.dispatchEvent(new Event('change')); }
    function favoriteButton(button, id) {
        button.dataset.assetId = id;
        const wrapper = node('div', { class: 'prop-tile' }); button.replaceWith(wrapper); wrapper.append(button);
        const star = node('button', { type: 'button', class: 'prop-favorite', title: 'Favorite', 'aria-label': `Favorite ${button.textContent}` });
        star.innerHTML = '<i class="fas fa-star" aria-hidden="true"></i>';
        const update = () => star.setAttribute('aria-pressed', String(readLibrary().favorites.includes(id)));
        update(); star.onclick = () => { const value = readLibrary(); value.favorites = value.favorites.includes(id) ? value.favorites.filter(x => x !== id) : [...value.favorites, id]; saveLibrary(value); update(); document.getElementById('prop-lib-saved')?.dispatchEvent(new Event('change')); };
        wrapper.append(star);
    }
    function matches(button) {
        const mode = document.getElementById('prop-lib-saved')?.value || 'all', saved = readLibrary();
        return mode === 'all' || (mode === 'favorites' ? saved.favorites : saved.recent).includes(button.dataset.assetId);
    }
    function rank(button) {
        return document.getElementById('prop-lib-saved')?.value === 'recent' ? Math.max(0, readLibrary().recent.indexOf(button.dataset.assetId)) : 0;
    }
    function bind(manager) {
        document.getElementById('prop-edit-selection')?.addEventListener('click', () => open(manager));
        document.getElementById('prop-save-template')?.addEventListener('click', () => {
            if (!manager.selectedIds.length) { Utils.showToast('Select a prop or scene first.', 'info'); return; }
            manager.saveObjectAsTemplate();
        });
        document.getElementById('prop-open-templates')?.addEventListener('click', () => manager.showRiggedTemplates());
    }
    function open(manager) {
        activeClose?.();
        const selected = manager.objects.filter(o => manager.selectedIds.includes(o.id));
        const groups = new Set(selected.map(o => o.groupId).filter(Boolean));
        const originals = manager.objects.filter(o => (selected.includes(o) || groups.has(o.groupId)) && infer(o));
        if (!originals.length) { Utils.showToast('Select a library prop or scene to edit.', 'info'); return; }
        const drafts = originals.map(o => StageObject.fromJSON({ ...o.toJSON(), sceneAsset: infer(o) }));
        const initial = drafts.map(o => o.toJSON()), sceneIndex = global.app?.currentSceneIndex;
        let current = 0, frame = 0, closed = false;
        const dialog = node('dialog', { id: 'scene-design-dialog', class: 'scene-design-dialog', 'aria-labelledby': 'scene-design-title' });
        dialog.innerHTML = '<header><h2 id="scene-design-title">Scene & prop editor</h2><button type="button" data-action="close" title="Close" aria-label="Close"><i class="fas fa-times"></i></button></header><div class="scene-design-layout"><canvas width="800" height="600" aria-label="Scene preview"></canvas><form class="scene-design-controls"></form></div><p class="scene-design-status" role="status"></p><footer><button type="button" data-action="cancel">Cancel</button><button type="button" data-action="apply">Apply</button></footer>';
        const canvas = dialog.querySelector('canvas'), ctx = canvas.getContext('2d');
        const form = dialog.querySelector('form'), status = dialog.querySelector('[role=status]');
        const field = (label, input) => { const wrap = node('label'); wrap.append(node('span', {}, label), input); form.append(wrap); return input; };
        const select = (label, entries) => { const input = node('select', { 'aria-label': label }); entries.forEach(([value, text]) => input.add(new Option(text, value))); return field(label, input); };
        const number = (label, value, min, max, step = 1) => field(label, Object.assign(node('input', { type: 'number', 'aria-label': label, min, max, step }), { value }));
        const command = (text, icon, fn) => { const button = node('button', { type: 'button' }); button.innerHTML = `<i class="fas fa-${icon}" aria-hidden="true"></i> `; button.append(document.createTextNode(text)); button.onclick = () => { try { fn(); status.textContent = ''; controls(); } catch (e) { status.textContent = e.message; } }; form.append(button); };
        function controls() {
            form.replaceChildren(); const obj = drafts[current], meta = obj.sceneAsset;
            const member = select('Part', drafts.map((o, i) => [String(i), o.name])); member.value = String(current); member.onchange = () => { current = +member.value; controls(); };
            const visible = field('Visible', node('input', { type: 'checkbox', 'aria-label': 'Visible' })); visible.checked = obj.visible !== false; visible.onchange = () => obj.visible = visible.checked;
            const depth = select('Depth', [['unchanged', 'Keep layer'], ['background', 'Behind characters'], ['foreground', 'In front of characters']]); depth.value = meta.depth || 'unchanged'; depth.onchange = () => meta.depth = depth.value;
            const prop = props.get(meta.propId);
            const viewLabels = { front: 'Front', back: 'Back', 'side-right': 'Side right', 'side-left': 'Side left', 'three-quarter-right': 'Three-quarter right', 'three-quarter-left': 'Three-quarter left' };
            const views = select('View', Object.keys({ front: true, ...prop?.views, ...meta.activityArtworks }).map(v => [v, viewLabels[v] || v.replaceAll('-', ' ')])); views.value = meta.view || 'front'; views.disabled = views.options.length < 2; views.onchange = () => { meta.view = views.value; refresh(obj); controls(); };
            for (const key of ['x', 'y', 'width', 'height']) {
                const input = number(key[0].toUpperCase() + key.slice(1), Math.round(obj[key] * 100) / 100, key === 'x' || key === 'y' ? -20000 : 1, 20000, 'any');
                input.oninput = () => { const n = Number(input.value); if (input.value && Number.isFinite(n) && input.checkValidity()) obj[key] = n; };
            }
            const palette = node('fieldset', { class: 'scene-design-palette' }); palette.append(node('legend', {}, 'Material colors')); form.append(palette);
            const list = obj.type === 'icon' ? [obj.fill] : colors(artwork(obj));
            const rectangles = meta.kind === 'backdrop' ? [...parse(artwork(obj)).querySelectorAll('rect')] : [];
            const wall = rectangles[0]?.getAttribute('fill')?.toLowerCase();
            const floor = rectangles.find(r => +r.getAttribute('y') > 0 && +r.getAttribute('width') >= (meta.design?.layout === 'portrait' ? 540 : 900))?.getAttribute('fill')?.toLowerCase();
            list.forEach((color, i) => {
                const name = color === wall ? 'Wall / sky' : color === floor ? 'Floor / ground' : `Material ${i + 1}`;
                const label = node('label'), input = node('input', { type: 'color', 'aria-label': name, title: name });
                input.value = meta.colors[color] || color; label.append(input, node('span', {}, name)); palette.append(label);
                input.oninput = () => { if (obj.type === 'icon') obj.fill = input.value; else { meta.colors[color] = input.value; refresh(obj); } };
            });
            if (meta.kind !== 'backdrop') {
                command('Align to floor', 'arrow-down', () => place(obj, floorY(manager, drafts)));
                const tables = [...drafts, ...manager.objects.filter(o => !originals.includes(o)).map(o => ({ ...o, sceneAsset: infer(o) }))].filter(o => o.id !== obj.id && o.visible !== false && surfaceY(o) != null);
                if (tables.length) {
                    const table = select('Tabletop', tables.map(o => [o.id, o.name]));
                    command('Place on tabletop', 'arrow-down', () => { const target = tables.find(o => o.id === table.value); obj.x = target.x + (target.width - obj.width) / 2; place(obj, surfaceY(target)); });
                }
                const characters = global.CharacterStackPolicy?.buildModel(manager.objects)?.characterBundles || [];
                if (characters.length) {
                    const character = select('Reference character', characters.map((b, i) => [String(i), b.root?.name || `Character ${i + 1}`]));
                    const meters = number('Prop height (m)', lib.physicalHeight[meta.propId] || 1, .05, 10, .05);
                    const person = number('Character height (m)', 1.75, .3, 3, .05);
                    command('Match scale', 'ruler-vertical', () => {
                        if (!meters.checkValidity() || !person.checkValidity()) throw new Error('Enter valid heights.');
                        const members = characters[+character.value].members;
                        const height = Math.max(...members.map(o => o.y + o.height)) - Math.min(...members.map(o => o.y));
                        const desired = height * +meters.value / +person.value, box = visualBox(obj);
                        const factor = desired / Math.max(1, obj.height * box.height); obj.width *= factor; obj.height *= factor; place(obj, floorY(manager, drafts));
                    });
                }
            }
            command('Reset part', 'undo', () => { drafts[current] = StageObject.fromJSON(initial[current]); });
        }
        function render() {
            if (closed) return;
            ctx.clearRect(0, 0, 800, 600);
            const shown = drafts.filter(o => o.visible !== false);
            if (shown.length) {
                const x = Math.min(...shown.map(o => o.x)), y = Math.min(...shown.map(o => o.y));
                const w = Math.max(...shown.map(o => o.x + o.width)) - x, h = Math.max(...shown.map(o => o.y + o.height)) - y;
                const scale = Math.min(760 / Math.max(w, 1), 560 / Math.max(h, 1));
                ctx.save(); ctx.translate((800 - w * scale) / 2, (600 - h * scale) / 2); ctx.scale(scale, scale); ctx.translate(-x, -y);
                shown.slice().sort((a, b) => ({ background: -1, foreground: 1 }[a.sceneAsset.depth] || 0) - ({ background: -1, foreground: 1 }[b.sceneAsset.depth] || 0)).forEach(o => o.render(ctx, { includeEditorArtifacts: false })); ctx.restore();
            }
            frame = requestAnimationFrame(render);
        }
        function close() { closed = true; cancelAnimationFrame(frame); dialog.close(); dialog.remove(); activeClose = null; }
        activeClose = close;
        dialog.querySelectorAll('[data-action=close],[data-action=cancel]').forEach(b => b.onclick = close);
        dialog.addEventListener('cancel', e => { e.preventDefault(); close(); });
        form.onsubmit = e => e.preventDefault();
        dialog.querySelector('[data-action=apply]').onclick = () => {
            if (!form.reportValidity()) return;
            if (global.app?.currentSceneIndex !== sceneIndex || originals.some(o => !manager.objects.includes(o))) { status.textContent = 'The stage changed. Close and reopen this editor.'; return; }
            eventBus.emit('history:flush');
            originals.forEach((o, i) => {
                const d = drafts[i], before = initial[i];
                // Commit only edited fields so live placement and activity metadata survive.
                ['x', 'y', 'width', 'height', 'visible', 'fill', 'imageSrc'].forEach(k => {
                    if (d[k] !== before[k]) o[k] = d[k];
                });
                const meta = infer(o) || clone(before.sceneAsset);
                Object.keys(d.sceneAsset).filter(k => k !== 'colors').forEach(k => {
                    if (JSON.stringify(d.sceneAsset[k]) !== JSON.stringify(before.sceneAsset[k])) meta[k] = clone(d.sceneAsset[k]);
                });
                meta.colors ||= {};
                Object.entries(d.sceneAsset.colors).forEach(([key, value]) => {
                    if (value !== before.sceneAsset.colors[key]) meta.colors[key] = value;
                });
                o.sceneAsset = meta;
                if (d.sceneAsset.view !== before.sceneAsset.view || JSON.stringify(d.sceneAsset.colors) !== JSON.stringify(before.sceneAsset.colors)) refresh(o);
                else if (o.type === 'image') o.loadImage(o.imageSrc, { preserveDimensions: true });
            });
            // Move only edited scenery. Character bundles and their internal order remain untouched.
            const back = originals.filter(o => o.sceneAsset.depth === 'background'), front = originals.filter(o => o.sceneAsset.depth === 'foreground');
            const rest = manager.objects.filter(o => !back.includes(o) && !front.includes(o));
            const min = Math.min(1, ...rest.map(o => o.layer || 1)), max = Math.max(1, ...rest.map(o => o.layer || 1));
            back.forEach(o => o.layer = min); front.forEach(o => o.layer = max);
            manager.objects.splice(0, manager.objects.length, ...back, ...rest, ...front);
            manager.updateObjectList(); manager.stage.requestRender(); eventBus.emit('history:push'); close();
        };
        document.body.append(dialog); controls(); dialog.showModal(); render();
    }
    function sceneOptions(stage) {
        const layout = document.getElementById('prop-scene-layout')?.value || 'auto';
        return { layout: layout === 'auto' ? (stage.height > stage.width ? 'portrait' : 'wide') : layout,
            time: document.getElementById('prop-scene-time')?.value || 'day' };
    }
    async function embedImage(url) {
        const response = await fetch(url, { mode: 'cors', credentials: 'omit', signal: AbortSignal.timeout(20000) });
        if (!response.ok) throw new Error(`Image download failed (${response.status}).`);
        const limit = 20 * 1024 * 1024;
        if (+response.headers.get('content-length') > limit) throw new Error('Background exceeds 20 MB.');
        const reader = response.body.getReader(), chunks = []; let size = 0;
        while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > limit) { await reader.cancel(); throw new Error('Background exceeds 20 MB.'); } chunks.push(value); }
        const type = (response.headers.get('content-type') || '').split(';')[0].trim();
        if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(type)) throw new Error('Portable backgrounds must be PNG, JPEG, WebP or GIF.');
        const blob = new Blob(chunks, { type });
        const src = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('Could not read background.')); reader.readAsDataURL(blob); });
        const img = new Image(); img.src = src; await img.decode();
        if (!img.naturalWidth || img.naturalWidth * img.naturalHeight > 64000000) throw new Error('Background exceeds 64 megapixels.');
        return src;
    }
    function sourceHash(src) {
        let hash = 2166136261;
        for (let i = 0; i < (src?.length || 0); i++) hash = Math.imul(hash ^ src.charCodeAt(i), 16777619);
        return (hash >>> 0).toString(16);
    }
    // Matching environment sets share the same portrait and lighting authoring as editable scenes.
    lib.environments.forEach(env => {
        const scene = lib.scenes.find(s => `env-set-${s.id.slice(6)}` === env.id); if (!scene) return;
        env.generate = (w, h, options = {}) => {
            const layout = options.layout && options.layout !== 'auto' ? options.layout : h > w ? 'portrait' : 'wide';
            const sc = variant(scene, { ...options, layout }), doc = parse(lib.sceneSvg(sc));
            const root = doc.documentElement; root.setAttribute('width', w); root.setAttribute('height', h); root.setAttribute('preserveAspectRatio', 'xMidYMid slice');
            return serialize(doc);
        };
    });
    global.SceneDesign = { colors, paint, variant, metadata, infer, artwork, refresh, visualBox, place, surfaceRatio, surfaceY, floorY,
        recent, favoriteButton, matches, rank, bind, open, sceneOptions, embedImage, readLibrary, sourceHash };
})(globalThis);
