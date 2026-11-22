/* ============================================
   Animation Stage - Dope Sheet
   Cross-object grid view of all keyframes.
   Rows: object → animation property tracks.
   Click a diamond to seek; drag to retime;
   Delete key to remove the selected keyframe.
   ============================================ */

class DopeSheet {
    constructor(objects, animations, timeline) {
        this.objects = objects;
        this.animations = animations;
        this.timeline = timeline;

        this.modal = document.getElementById('dope-sheet-modal');
        this.canvas = document.getElementById('dope-sheet-canvas');
        this.ctx = this.canvas?.getContext('2d');
        this.scrollEl = document.getElementById('dope-sheet-scroll');

        this.rowHeight = 26;
        this.labelWidth = 220;
        this.headerHeight = 28;
        this.pixelsPerSecond = 100;

        this.rows = [];           // [{ objId, animId, configIndex, propName, label }]
        this.diamonds = [];       // [{ row, time, kind: 'start'|'end'|'kf', kfIndex?, animRef, configRef }]
        this.selected = -1;       // index into this.diamonds
        this.dragging = false;
        this.dragStart = null;
        this._isOpen = false;

        this.bindEvents();
    }

    bindEvents() {
        document.getElementById('btn-open-dope-sheet')?.addEventListener('click', () => this.open());
        document.getElementById('dope-sheet-close')?.addEventListener('click', () => this.close());
        this.modal?.addEventListener('click', (e) => { if (e.target === this.modal) this.close(); });

        if (!this.canvas) return;
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('contextmenu', (e) => this.onContextMenu(e));
        window.addEventListener('mousemove', (e) => this.onMouseMove(e));
        window.addEventListener('mouseup', () => this.onMouseUp());
        document.addEventListener('mousedown', (e) => {
            if (this._ctxMenu && !this._ctxMenu.contains(e.target)) this._closeContextMenu();
        });

        document.addEventListener('keydown', (e) => {
            if (!this._isOpen) return;
            if (e.target.matches('input, textarea, select, [contenteditable]')) return;
            if ((e.key === 'Delete' || e.key === 'Backspace') && this.selected >= 0) {
                e.preventDefault();
                this.deleteSelected();
            }
            if (e.key === 'Escape') this.close();
        });

        // Live refresh
        if (typeof eventBus !== 'undefined') {
            eventBus.on?.('timeline:update', () => { if (this._isOpen) this.draw(); });
            eventBus.on?.('timeline:time', () => { if (this._isOpen) this.draw(); });
        }
    }

    open() {
        if (!this.modal) return;
        this._isOpen = true;
        this.modal.classList.remove('hidden');
        this.modal.classList.add('active');
        // Match timeline zoom
        if (this.timeline?.pixelsPerSecond) this.pixelsPerSecond = this.timeline.pixelsPerSecond;
        requestAnimationFrame(() => this.resize());
    }

    close() {
        this._isOpen = false;
        this.modal?.classList.add('hidden');
        this.modal?.classList.remove('active');
        this._closeContextMenu();
    }

    resize() {
        if (!this.canvas || !this.scrollEl) return;
        this.buildRows();
        const totalSeconds = Math.max(1, Math.ceil((this.animations.totalDuration || 0) / 1000));
        const w = this.labelWidth + totalSeconds * this.pixelsPerSecond + 40;
        const h = this.headerHeight + this.rows.length * this.rowHeight + 20;
        const dpr = window.devicePixelRatio || 1;
        this.canvas.style.width = w + 'px';
        this.canvas.style.height = h + 'px';
        this.canvas.width = w * dpr;
        this.canvas.height = h * dpr;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.draw();
    }

    buildRows() {
        this.rows = [];
        this.objects.objects.forEach(obj => {
            if (!Array.isArray(obj.animations) || obj.animations.length === 0) return;
            obj.animations.forEach(anim => {
                const configs = Array.isArray(anim.generated) ? anim.generated : [anim.generated];
                configs.forEach((cfg, configIndex) => {
                    if (!cfg || !cfg.duration || cfg.property === '_chainType') return;
                    this.rows.push({
                        objId: obj.id,
                        animId: anim.id,
                        configIndex,
                        propName: cfg.property || cfg.type || 'prop',
                        label: `${obj.name} · ${anim.name} · ${cfg.property || cfg.type || 'prop'}`,
                        animRef: anim,
                        configRef: cfg,
                        objRef: obj
                    });
                });
            });
        });
    }

    draw() {
        if (!this.ctx) return;
        const ctx = this.ctx;
        const w = parseFloat(this.canvas.style.width);
        const h = parseFloat(this.canvas.style.height);

        // Clear
        ctx.fillStyle = '#13132a';
        ctx.fillRect(0, 0, w, h);

        // Build diamonds list
        this.diamonds = [];

        // Time ruler
        const totalSeconds = Math.max(1, Math.ceil((this.animations.totalDuration || 0) / 1000));
        ctx.fillStyle = '#1e1e32';
        ctx.fillRect(this.labelWidth, 0, w - this.labelWidth, this.headerHeight);
        ctx.fillStyle = '#a0a0b8';
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'center';
        for (let s = 0; s <= totalSeconds; s++) {
            const x = this.labelWidth + s * this.pixelsPerSecond;
            ctx.strokeStyle = '#2a2a45';
            ctx.beginPath(); ctx.moveTo(x, this.headerHeight - 8); ctx.lineTo(x, h); ctx.stroke();
            ctx.fillStyle = '#a0a0b8';
            ctx.fillText(s + 's', x, 14);
        }

        // Rows
        ctx.font = '12px Inter, sans-serif';
        this.rows.forEach((row, rowIdx) => {
            const y = this.headerHeight + rowIdx * this.rowHeight;
            // Row background
            ctx.fillStyle = rowIdx % 2 === 0 ? '#181830' : '#1a1a35';
            ctx.fillRect(0, y, w, this.rowHeight);

            // Label
            ctx.fillStyle = '#d4d4e0';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            const label = row.label.length > 32 ? row.label.slice(0, 30) + '…' : row.label;
            ctx.fillText(label, 8, y + this.rowHeight / 2);

            const anim = row.animRef;
            const cfg = row.configRef;
            const startMs = anim.delay || 0;
            const durMs = cfg.duration || 1000;
            const endMs = startMs + durMs;
            const startX = this.labelWidth + (startMs / 1000) * this.pixelsPerSecond;
            const endX = this.labelWidth + (endMs / 1000) * this.pixelsPerSecond;
            const cy = y + this.rowHeight / 2;

            // Bar line
            ctx.strokeStyle = 'rgba(99,102,241,0.4)';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(startX, cy); ctx.lineTo(endX, cy); ctx.stroke();

            // Endpoint diamonds
            this._pushDiamond(rowIdx, startX, cy, startMs, 'start', null, row);
            this._pushDiamond(rowIdx, endX, cy, endMs, 'end', null, row);

            // Intermediate keyframes
            if (Array.isArray(cfg.keyframes)) {
                cfg.keyframes.forEach((kf, kfIdx) => {
                    if (kf.t <= 0 || kf.t >= 1) return;
                    const t = startMs + durMs * kf.t;
                    const x = this.labelWidth + (t / 1000) * this.pixelsPerSecond;
                    this._pushDiamond(rowIdx, x, cy, t, 'kf', kfIdx, row);
                });
            }
        });

        // Draw all diamonds
        this.diamonds.forEach((d, i) => this._drawDiamond(d, i === this.selected));

        // Playhead
        const px = this.labelWidth + (this.animations.currentTime / 1000) * this.pixelsPerSecond;
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, h); ctx.stroke();
    }

    _pushDiamond(row, x, y, time, kind, kfIndex, rowData) {
        this.diamonds.push({ row, x, y, time, kind, kfIndex, rowData });
    }

    _drawDiamond(d, isSelected) {
        const ctx = this.ctx;
        const r = isSelected ? 8 : 6;
        ctx.save();
        ctx.translate(d.x, d.y);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = d.kind === 'kf' ? '#facc15' : (d.kind === 'start' ? '#34d399' : '#60a5fa');
        if (isSelected) ctx.fillStyle = '#fff';
        ctx.fillRect(-r, -r, r * 2, r * 2);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.strokeRect(-r, -r, r * 2, r * 2);
        ctx.restore();
    }

    _hitTest(cx, cy) {
        for (let i = this.diamonds.length - 1; i >= 0; i--) {
            const d = this.diamonds[i];
            if (Math.abs(cx - d.x) < 9 && Math.abs(cy - d.y) < 9) return i;
        }
        return -1;
    }

    _localPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    onMouseDown(e) {
        const { x, y } = this._localPos(e);
        const hit = this._hitTest(x, y);
        if (hit >= 0) {
            this.selected = hit;
            this.dragging = true;
            this._dragModifierShift = !!e.shiftKey;
            this.dragStart = { x: e.clientX, origTime: this.diamonds[hit].time };
            // Seek
            const t = this.diamonds[hit].time;
            this.animations.currentTime = t;
            eventBus?.emit?.('timeline:time', t);
            this.draw();
        } else if (x > this.labelWidth) {
            // Seek on empty area
            const t = ((x - this.labelWidth) / this.pixelsPerSecond) * 1000;
            this.animations.currentTime = Math.max(0, Math.min(this.animations.totalDuration, t));
            eventBus?.emit?.('timeline:time', this.animations.currentTime);
            this.selected = -1;
            this.draw();
        }
    }

    onMouseMove(e) {
        if (!this.dragging || this.selected < 0) return;
        const d = this.diamonds[this.selected];
        const dx = e.clientX - this.dragStart.x;
        const deltaMs = (dx / this.pixelsPerSecond) * 1000;
        let newTime = Math.max(0, this.dragStart.origTime + deltaMs);
        newTime = Math.round(newTime);

        const anim = d.rowData.animRef;
        const cfg = d.rowData.configRef;

        if (d.kind === 'start') {
            // Shift entire animation delay
            const shift = newTime - (anim.delay || 0);
            anim.delay = newTime;
            anim.params = anim.params || {};
            anim.params.delay = newTime / 1000;
            // dragStart anchor moves with it
            this.dragStart.origTime = newTime;
            this.dragStart.x = e.clientX;
        } else if (d.kind === 'end') {
            // Resize duration. Default: only this sub-config (per-row).
            // Hold Shift to resize ALL sub-configs of this animation together (legacy).
            const newDur = Math.max(50, newTime - (anim.delay || 0));
            const shiftAll = !!(this._dragModifierShift);
            const configs = Array.isArray(anim.generated) ? anim.generated : [anim.generated];
            if (shiftAll) {
                configs.forEach(c => { if (c) c.duration = newDur; });
                anim.params = anim.params || {};
                anim.params.duration = newDur / 1000;
            } else {
                if (cfg) cfg.duration = newDur;
                // Keep params.duration in sync with the longest sub-config so
                // re-apply / scheduling sees the true outer duration.
                const maxDur = configs.reduce((m, c) => Math.max(m, c?.duration || 0), 0);
                anim.params = anim.params || {};
                anim.params.duration = maxDur / 1000;
            }
        } else if (d.kind === 'kf') {
            // Move keyframe within bar
            const startMs = anim.delay || 0;
            const durMs = cfg.duration || 1000;
            let nt = (newTime - startMs) / durMs;
            nt = Math.max(0.001, Math.min(0.999, nt));
            cfg.keyframes[d.kfIndex].t = nt;
            // Re-sort if needed
            cfg.keyframes.sort((a, b) => a.t - b.t);
        }

        this.animations.calculateTotalDuration?.();
        this.animations.updateCodeOutput?.();
        this.resize();
    }

    onMouseUp() {
        if (this.dragging) {
            this.dragging = false;
            eventBus?.emit?.('history:push');
            eventBus?.emit?.('timeline:update');
        }
    }

    deleteSelected() {
        if (this.selected < 0) return;
        const d = this.diamonds[this.selected];
        const anim = d.rowData.animRef;
        const cfg = d.rowData.configRef;
        if (d.kind === 'kf' && Array.isArray(cfg.keyframes)) {
            cfg.keyframes.splice(d.kfIndex, 1);
            Utils?.showToast?.('Keyframe deleted', 'info');
        } else {
            // Endpoint = delete whole animation
            const obj = d.rowData.objRef;
            obj.animations = obj.animations.filter(a => a.id !== anim.id);
            Utils?.showToast?.(`Deleted "${anim.name}"`, 'info');
        }
        this.selected = -1;
        this.animations.calculateTotalDuration?.();
        this.animations.updateCodeOutput?.();
        eventBus?.emit?.('history:push');
        eventBus?.emit?.('timeline:update');
        this.resize();
    }

    // ---------- Right-click context menu ----------
    onContextMenu(e) {
        e.preventDefault();
        const { x, y } = this._localPos(e);
        const hit = this._hitTest(x, y);
        let row = null;
        if (hit >= 0) {
            this.selected = hit;
            row = this.diamonds[hit].rowData;
        } else {
            // Hit-test row by Y position
            const rowIdx = Math.floor((y - this.headerHeight) / this.rowHeight);
            if (rowIdx >= 0 && rowIdx < this.rows.length) row = this.rows[rowIdx];
        }
        if (!row) return;
        this.draw();

        const anim = row.animRef;
        const obj = row.objRef;
        const configs = Array.isArray(anim.generated) ? anim.generated : [anim.generated];
        const canSplit = configs.length > 1;

        this._openContextMenu(e.clientX, e.clientY, [
            {
                label: '<i class="fas fa-cut"></i> Split into separate animations',
                disabled: !canSplit,
                hint: canSplit ? `${configs.length} sub-tracks` : 'only one sub-track',
                action: () => this.splitAnimation(obj, anim)
            },
            {
                label: '<i class="fas fa-trash"></i> Delete this animation',
                action: () => {
                    obj.animations = obj.animations.filter(a => a.id !== anim.id);
                    Utils?.showToast?.(`Deleted "${anim.name}"`, 'info');
                    this.selected = -1;
                    this.animations.calculateTotalDuration?.();
                    this.animations.updateCodeOutput?.();
                    eventBus?.emit?.('history:push');
                    eventBus?.emit?.('timeline:update');
                    this.resize();
                }
            }
        ]);
    }

    _openContextMenu(clientX, clientY, items) {
        this._closeContextMenu();
        const menu = document.createElement('div');
        menu.className = 'dope-sheet-ctx-menu';
        menu.style.cssText = `
            position: fixed; left: ${clientX}px; top: ${clientY}px;
            z-index: 100000; background: #1e1e32; border: 1px solid #2a2a45;
            border-radius: 6px; padding: 4px; min-width: 240px;
            box-shadow: 0 8px 24px rgba(0,0,0,.5);
            font: 12px Inter, sans-serif; color: #d4d4e0;
        `;
        items.forEach(item => {
            const row = document.createElement('div');
            row.style.cssText = `
                padding: 7px 10px; border-radius: 4px; cursor: ${item.disabled ? 'not-allowed' : 'pointer'};
                opacity: ${item.disabled ? 0.45 : 1}; display: flex; align-items: center;
                gap: 8px; justify-content: space-between;
            `;
            row.innerHTML = `<span>${item.label}</span>${item.hint ? `<small style="opacity:.6">${item.hint}</small>` : ''}`;
            if (!item.disabled) {
                row.addEventListener('mouseenter', () => row.style.background = '#2a2a45');
                row.addEventListener('mouseleave', () => row.style.background = '');
                row.addEventListener('click', () => { this._closeContextMenu(); item.action(); });
            }
            menu.appendChild(row);
        });
        document.body.appendChild(menu);
        this._ctxMenu = menu;
        // Clamp to viewport
        const rect = menu.getBoundingClientRect();
        if (rect.right > window.innerWidth) menu.style.left = (window.innerWidth - rect.width - 8) + 'px';
        if (rect.bottom > window.innerHeight) menu.style.top = (window.innerHeight - rect.height - 8) + 'px';
    }

    _closeContextMenu() {
        if (this._ctxMenu) { this._ctxMenu.remove(); this._ctxMenu = null; }
    }

    // ---------- Split a multi-config preset into N independent animations ----------
    splitAnimation(obj, anim) {
        const configs = Array.isArray(anim.generated) ? anim.generated : [anim.generated];
        if (configs.length < 2) {
            Utils?.showToast?.('This animation has only one track — nothing to split', 'info');
            return;
        }
        const idx = obj.animations.findIndex(a => a.id === anim.id);
        if (idx < 0) return;

        const newAnims = configs.filter(Boolean).map((cfg, i) => {
            const propLabel = cfg.property || cfg.type || `track ${i + 1}`;
            return {
                id: (typeof Utils !== 'undefined' && Utils.generateId) ? Utils.generateId('anim') : `anim_split_${Date.now()}_${i}`,
                type: anim.type,
                name: `${anim.name} · ${propLabel}`,
                params: {
                    ...(anim.params || {}),
                    duration: (cfg.duration || 1000) / 1000,
                    easing: cfg.easing || anim.params?.easing || 'easeInOut'
                },
                delay: (anim.delay || 0) + (cfg._stepDelay || 0),
                repeat: anim.repeat || '1',
                repeatMode: anim.repeatMode || 'restart',
                trigger: anim.trigger || 'onLoad',
                startMode: anim.startMode || 'after-previous',
                generated: [{ ...cfg, _stepDelay: 0 }],
                _splitFrom: anim.id
            };
        });

        obj.animations.splice(idx, 1, ...newAnims);

        Utils?.showToast?.(`Split "${anim.name}" into ${newAnims.length} independent tracks`, 'success');
        this.selected = -1;
        this.animations.calculateTotalDuration?.();
        this.animations.updateAppliedAnimationsList?.();
        this.animations.updateCodeOutput?.();
        eventBus?.emit?.('history:push');
        eventBus?.emit?.('timeline:update');
        this.resize();
    }
}

window.DopeSheet = DopeSheet;
