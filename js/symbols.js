/**
 * SymbolManager — reusable component instances.
 *
 * A "symbol" is a saved snapshot of one or more objects, registered in
 * `library[symId]`. Stage objects with `type === 'symbol'` reference a
 * library entry by `symbolId` and re-render whenever the master changes.
 *
 * Key flows
 *   convertSelectionToSymbol(name?)  — selection → new symbol + 1 instance
 *   placeInstance(symId, x?, y?)     — drop another instance on the stage
 *   editMaster(symId)                — pop master items onto stage for editing
 *   finishEditing()                  — snapshot edited items back into library
 */
class SymbolManager {
    constructor(objectManager, stage, animations) {
        this.objects = objectManager;
        this.stage = stage;
        this.animations = animations;
        this.library = {};                 // symId → { id, name, items[], width, height, originX, originY, created }
        this._cache = {};                  // symId → cached StageObject[] for rendering
        this._editing = null;              // { symId, snapshotBefore: [...], pushedIds: [] }
        this._counter = 0;
    }

    init() {
        this._bindUI();
        // Invalidate render cache whenever a master is edited indirectly
        if (typeof eventBus !== 'undefined') {
            eventBus.on('symbols:invalidate', (id) => { if (id) delete this._cache[id]; else this._cache = {}; });
        }
    }

    _genId() { return `sym_${Date.now().toString(36)}_${(++this._counter).toString(36)}`; }

    /** Snapshot selected objects into a new symbol; replace selection with one instance. */
    convertSelectionToSymbol(name = null) {
        const sel = this.objects.getSelectedObjects();
        if (sel.length === 0) {
            Utils.showToast?.('Select objects to convert into a symbol', 'warning');
            return null;
        }
        const symName = (name || prompt('Symbol name?', `Symbol ${Object.keys(this.library).length + 1}`) || '').trim();
        if (!symName) return null;

        // Compute bounding box of selection
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        sel.forEach(o => {
            const b = (typeof o.getBounds === 'function') ? o.getBounds() : { x: o.x, y: o.y, width: o.width, height: o.height };
            if (!b) return;
            if (b.x < minX) minX = b.x;
            if (b.y < minY) minY = b.y;
            if (b.x + b.width > maxX) maxX = b.x + b.width;
            if (b.y + b.height > maxY) maxY = b.y + b.height;
        });
        if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 100; maxY = 100; }

        const symId = this._genId();
        // Snapshot — keep items in absolute coords, store origin so renderer can offset
        const items = sel.map(o => o.toJSON());
        this.library[symId] = {
            id: symId,
            name: symName,
            items,
            width: maxX - minX,
            height: maxY - minY,
            originX: minX,
            originY: minY,
            created: Date.now(),
        };

        // Remove originals
        const ids = sel.map(o => o.id);
        this.objects.objects = this.objects.objects.filter(o => !ids.includes(o.id));

        // Drop an instance at the same position
        const inst = this._makeInstance(symId, minX, minY);
        this.objects.objects.push(inst);
        this.objects.select([inst.id]);
        this.objects.updateObjectList();
        this.stage.requestRender();
        this._renderPanel();
        eventBus.emit('history:push');
        Utils.showToast?.(`Symbol "${symName}" created`, 'success');
        return symId;
    }

    /** Create a fresh instance object (StageObject of type 'symbol'). */
    _makeInstance(symId, x, y) {
        const def = this.library[symId];
        const obj = new StageObject('symbol', {
            x, y,
            width: def.width,
            height: def.height,
            name: `${def.name} instance`,
        });
        obj.symbolId = symId;
        obj.fill = '#888';
        return obj;
    }

    placeInstance(symId, x = null, y = null) {
        const def = this.library[symId];
        if (!def) return null;
        if (x === null) x = (this.stage?.width || 800) / 2 - def.width / 2;
        if (y === null) y = (this.stage?.height || 600) / 2 - def.height / 2;
        const inst = this._makeInstance(symId, x, y);
        this.objects.objects.push(inst);
        this.objects.select([inst.id]);
        this.objects.updateObjectList();
        this.stage.requestRender();
        eventBus.emit('history:push');
        return inst;
    }

    /** Build (and cache) StageObject children for rendering an instance. */
    getRenderItems(symId) {
        if (!this.library[symId]) return [];
        if (!this._cache[symId]) {
            this._cache[symId] = this.library[symId].items.map(d => {
                try { return StageObject.fromJSON(d); } catch (e) { return null; }
            }).filter(Boolean);
        }
        return this._cache[symId];
    }

    /** Render a symbol instance — called from StageObject._drawShapeByType('symbol'). */
    renderInstance(ctx, instance) {
        const def = this.library[instance.symbolId];
        if (!def) {
            // Missing master — draw placeholder
            ctx.save();
            ctx.fillStyle = 'rgba(239,68,68,0.2)';
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 1;
            ctx.fillRect(instance.x, instance.y, instance.width, instance.height);
            ctx.strokeRect(instance.x, instance.y, instance.width, instance.height);
            ctx.fillStyle = '#ef4444';
            ctx.font = '11px sans-serif';
            ctx.fillText('Missing symbol', instance.x + 6, instance.y + 16);
            ctx.restore();
            return;
        }
        const items = this.getRenderItems(instance.symbolId);
        // Scale instance.width/height vs def.width/height
        const sx = def.width > 0 ? instance.width / def.width : 1;
        const sy = def.height > 0 ? instance.height / def.height : 1;
        ctx.save();
        // The outer StageObject.render already applied rotation+scale around pivot.
        // Translate from def origin to instance origin, then optionally re-scale child geometry
        // to match an instance resize.
        ctx.translate(instance.x - def.originX * sx, instance.y - def.originY * sy);
        if (sx !== 1 || sy !== 1) ctx.scale(sx, sy);
        items.forEach(child => {
            try { child.render(ctx, { quality: 'editor' }); } catch (e) { /* ignore one-child failure */ }
        });
        ctx.restore();
    }

    /** Begin editing a symbol master — pop snapshot items onto stage. */
    editMaster(symId) {
        if (this._editing) {
            Utils.showToast?.('Finish current symbol edit first', 'warning');
            return;
        }
        const def = this.library[symId];
        if (!def) return;
        const stageObjsBefore = this.objects.objects.map(o => o.toJSON());
        // Hide all current stage objects by removing them; we'll restore on finish
        const restored = def.items.map(d => StageObject.fromJSON(d));
        restored.forEach(o => { o._editingSymbolId = symId; });
        this.objects.objects = restored;
        this.objects.select([]);
        this._editing = { symId, snapshotBefore: stageObjsBefore };
        this.objects.updateObjectList();
        this.stage.requestRender();
        this._showEditBanner(def.name);
    }

    finishEditing(commit = true) {
        if (!this._editing) return;
        const { symId, snapshotBefore } = this._editing;
        const def = this.library[symId];
        if (commit && def) {
            const newItems = this.objects.objects.map(o => {
                const j = o.toJSON();
                delete j._editingSymbolId;
                return j;
            });
            // Recompute bounding box
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            this.objects.objects.forEach(o => {
                const b = (typeof o.getBounds === 'function') ? o.getBounds() : null;
                if (!b) return;
                if (b.x < minX) minX = b.x;
                if (b.y < minY) minY = b.y;
                if (b.x + b.width > maxX) maxX = b.x + b.width;
                if (b.y + b.height > maxY) maxY = b.y + b.height;
            });
            if (isFinite(minX)) {
                def.items = newItems;
                def.originX = minX; def.originY = minY;
                def.width = maxX - minX;
                def.height = maxY - minY;
            }
            delete this._cache[symId];
        }
        // Restore stage
        this.objects.objects = snapshotBefore.map(d => StageObject.fromJSON(d));
        this.objects.select([]);
        this._editing = null;
        this.objects.updateObjectList();
        this.stage.requestRender();
        this._hideEditBanner();
        eventBus.emit('history:push');
        if (commit) Utils.showToast?.('Symbol updated', 'success');
    }

    deleteSymbol(symId) {
        if (!this.library[symId]) return;
        // Remove all instances on stage
        this.objects.objects = this.objects.objects.filter(o => !(o.type === 'symbol' && o.symbolId === symId));
        delete this.library[symId];
        delete this._cache[symId];
        this.objects.updateObjectList();
        this.stage.requestRender();
        this._renderPanel();
        eventBus.emit('history:push');
    }

    renameSymbol(symId, newName) {
        const def = this.library[symId];
        if (!def || !newName) return;
        def.name = newName.trim() || def.name;
        this._renderPanel();
        eventBus.emit('history:push');
    }

    // === Persistence ===
    toJSON() {
        return {
            library: JSON.parse(JSON.stringify(this.library)),
            counter: this._counter,
        };
    }
    fromJSON(data) {
        this.library = (data && data.library) ? JSON.parse(JSON.stringify(data.library)) : {};
        this._counter = (data && data.counter) || 0;
        this._cache = {};
        this._renderPanel();
    }

    // === UI ===
    _bindUI() {
        const openBtn = document.getElementById('btn-open-symbols');
        if (openBtn) openBtn.addEventListener('click', () => this.openPanel());
        const closeBtn = document.getElementById('symbols-panel-close');
        if (closeBtn) closeBtn.addEventListener('click', () => this.closePanel());
        const convertBtn = document.getElementById('symbols-convert-selection');
        if (convertBtn) convertBtn.addEventListener('click', () => this.convertSelectionToSymbol());
        const finishBtn = document.getElementById('symbols-finish-edit');
        if (finishBtn) finishBtn.addEventListener('click', () => this.finishEditing(true));
        const cancelBtn = document.getElementById('symbols-cancel-edit');
        if (cancelBtn) cancelBtn.addEventListener('click', () => this.finishEditing(false));
        // Refresh panel when objects change (instance counts)
        if (typeof eventBus !== 'undefined') {
            eventBus.on('history:push', () => { if (this._panelOpen) this._renderPanel(); });
        }
    }

    openPanel() {
        const m = document.getElementById('symbols-modal');
        if (!m) return;
        m.classList.remove('hidden');
        this._panelOpen = true;
        this._renderPanel();
    }
    closePanel() {
        const m = document.getElementById('symbols-modal');
        if (m) m.classList.add('hidden');
        this._panelOpen = false;
    }

    _renderPanel() {
        const list = document.getElementById('symbols-list');
        if (!list) return;
        const ids = Object.keys(this.library);
        if (ids.length === 0) {
            list.innerHTML = '<div style="opacity:.6;padding:20px;text-align:center">No symbols yet. Select objects on the stage and click "Convert Selection to Symbol".</div>';
            return;
        }
        const countInstances = (symId) => this.objects.objects.filter(o => o.type === 'symbol' && o.symbolId === symId).length;
        list.innerHTML = ids.map(id => {
            const def = this.library[id];
            const n = countInstances(id);
            return `<div class="symbol-row" data-sym="${id}" style="display:flex;align-items:center;gap:8px;padding:8px;border-bottom:1px solid rgba(255,255,255,.08)">
                <i class="fas fa-shapes" style="color:#a78bfa"></i>
                <div style="flex:1">
                    <div style="font-weight:600">${Utils.escapeHtml(def.name)}</div>
                    <div style="font-size:11px;opacity:.6">${Math.round(def.width)}×${Math.round(def.height)} · ${def.items.length} item${def.items.length === 1 ? '' : 's'} · ${n} instance${n === 1 ? '' : 's'} on stage</div>
                </div>
                <button data-act="place" data-sym="${id}" title="Place instance"><i class="fas fa-plus"></i></button>
                <button data-act="edit" data-sym="${id}" title="Edit master"><i class="fas fa-pen"></i></button>
                <button data-act="rename" data-sym="${id}" title="Rename"><i class="fas fa-i-cursor"></i></button>
                <button data-act="delete" data-sym="${id}" title="Delete (and all instances)" style="color:#f87171"><i class="fas fa-trash"></i></button>
            </div>`;
        }).join('');
        list.querySelectorAll('button[data-act]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.sym;
                const act = btn.dataset.act;
                if (act === 'place') this.placeInstance(id);
                else if (act === 'edit') { this.closePanel(); this.editMaster(id); }
                else if (act === 'rename') {
                    const cur = this.library[id]?.name || '';
                    const next = prompt('Rename symbol:', cur);
                    if (next !== null) this.renameSymbol(id, next);
                }
                else if (act === 'delete') {
                    if (confirm(`Delete symbol "${this.library[id]?.name}" and all its instances?`)) this.deleteSymbol(id);
                }
            });
        });
    }

    _showEditBanner(name) {
        let b = document.getElementById('symbol-edit-banner');
        if (!b) {
            b = document.createElement('div');
            b.id = 'symbol-edit-banner';
            b.style.cssText = 'position:fixed;top:8px;left:50%;transform:translateX(-50%);background:#a78bfa;color:#1e1b4b;padding:8px 16px;border-radius:8px;font-weight:600;z-index:10000;display:flex;gap:12px;align-items:center;box-shadow:0 4px 12px rgba(0,0,0,.3)';
            document.body.appendChild(b);
        }
        b.innerHTML = `<i class="fas fa-pen"></i> Editing symbol: <span id="symbol-edit-name">${Utils.escapeHtml(name)}</span>
            <button id="symbol-edit-banner-save" style="background:#1e1b4b;color:#fff;border:none;padding:4px 10px;border-radius:4px;cursor:pointer">Save</button>
            <button id="symbol-edit-banner-cancel" style="background:transparent;color:#1e1b4b;border:1px solid #1e1b4b;padding:4px 10px;border-radius:4px;cursor:pointer">Cancel</button>`;
        document.getElementById('symbol-edit-banner-save').onclick = () => this.finishEditing(true);
        document.getElementById('symbol-edit-banner-cancel').onclick = () => this.finishEditing(false);
    }
    _hideEditBanner() {
        const b = document.getElementById('symbol-edit-banner');
        if (b) b.remove();
    }
}

if (typeof window !== 'undefined') window.SymbolManager = SymbolManager;
