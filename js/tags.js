/* ============================================
   Animation Stage - Tag System
   Position tags, object tags, zone tags
   ============================================ */

class TagManager {
    constructor(stageManager, objectManager) {
        this.stage = stageManager;
        this.objects = objectManager;
        
        this.positionTags = [];   // { id, name, x, y, color }
        this.zoneTags = [];       // { id, name, x, y, width, height, color }
        this.isDrawingZone = false;
        this.zoneStart = null;
        
        this.tagColors = [
            '#ef4444', '#f59e0b', '#22c55e', '#06b6d4',
            '#6366f1', '#a855f7', '#ec4899', '#f97316'
        ];
        this.colorIndex = 0;
        
        this.init();
    }

    init() {
        this.bindEvents();
        
        eventBus.on('tag:add-position', (pos) => {
            const name = prompt('Tag name:');
            if (name) this.addPositionTag(name, pos.x, pos.y);
        });
        
        eventBus.on('tag:add-to-object', (obj) => {
            const tag = prompt('Tag name for this object:');
            if (tag) this.addObjectTag(obj, tag);
        });
        
        eventBus.on('selection:changed', () => {
            this.updateObjectTagsUI();
        });

        // Update object tags display when object is renamed elsewhere
        eventBus.on('object:updated', () => {
            this.updateObjectTagsUI();
        });
        eventBus.on('timeline:update', () => {
            this.updateObjectTagsUI();
        });
    }

    bindEvents() {
        // Create position tag
        document.getElementById('btn-create-tag')?.addEventListener('click', () => {
            const nameInput = document.getElementById('new-tag-name');
            const name = nameInput?.value.trim();
            if (!name) {
                Utils.showToast('Enter a tag name', 'warning');
                return;
            }
            
            // Use center of stage or selected object position
            const selected = this.objects.getSelectedObjects();
            let x, y;
            if (selected.length > 0) {
                const bounds = selected[0].getBounds();
                x = bounds.centerX;
                y = bounds.centerY;
            } else {
                x = this.stage.width / 2;
                y = this.stage.height / 2;
            }
            
            this.addPositionTag(name, x, y);
            nameInput.value = '';
        });

        // Create zone tag
        document.getElementById('btn-create-zone')?.addEventListener('click', () => {
            // Remove any existing zone drawing listeners to prevent leaks
            if (this._zoneMouseDown) {
                this.stage.viewport.removeEventListener('mousedown', this._zoneMouseDown);
                this.stage.viewport.removeEventListener('mouseup', this._zoneMouseUp);
            }

            this.isDrawingZone = true;
            Utils.showToast('Click and drag on stage to draw a zone', 'info');
            this.stage.viewport.style.cursor = 'crosshair';

            this._zoneMouseDown = (e) => {
                if (!this.isDrawingZone) return;
                const pos = this.stage.screenToStage(e.clientX, e.clientY);
                this.zoneStart = { x: pos.x, y: pos.y };
            };

            this._zoneMouseUp = (e) => {
                if (!this.isDrawingZone || !this.zoneStart) return;
                const pos = this.stage.screenToStage(e.clientX, e.clientY);
                
                const name = prompt('Zone tag name:');
                if (name) {
                    this.addZoneTag(
                        name,
                        Math.min(this.zoneStart.x, pos.x),
                        Math.min(this.zoneStart.y, pos.y),
                        Math.abs(pos.x - this.zoneStart.x),
                        Math.abs(pos.y - this.zoneStart.y)
                    );
                }
                
                this.isDrawingZone = false;
                this.zoneStart = null;
                this.stage.viewport.style.cursor = '';
                
                this.stage.viewport.removeEventListener('mousedown', this._zoneMouseDown);
                this.stage.viewport.removeEventListener('mouseup', this._zoneMouseUp);
            };

            this.stage.viewport.addEventListener('mousedown', this._zoneMouseDown);
            this.stage.viewport.addEventListener('mouseup', this._zoneMouseUp);
        });
    }

    getNextColor() {
        const color = this.tagColors[this.colorIndex % this.tagColors.length];
        this.colorIndex++;
        return color;
    }

    // Position Tags
    addPositionTag(name, x, y) {
        const tag = {
            id: Utils.generateId('tag'),
            name,
            x: Math.round(x),
            y: Math.round(y),
            color: this.getNextColor()
        };
        this.positionTags.push(tag);
        this.updatePositionTagsUI();
        this.stage.requestRender();
        eventBus.emit('tags:updated');
        Utils.showToast(`Position tag "${name}" added`, 'success');
    }

    removePositionTag(id) {
        this.positionTags = this.positionTags.filter(t => t.id !== id);
        this.updatePositionTagsUI();
        this.stage.requestRender();
        eventBus.emit('tags:updated');
    }

    updatePositionTagsUI() {
        const listEl = document.getElementById('position-tags');
        if (!listEl) return;

        if (this.positionTags.length === 0) {
            listEl.innerHTML = '<div class="empty-state small"><p>No position tags</p></div>';
            return;
        }

        listEl.innerHTML = this.positionTags.map(tag => `
            <div class="tag-item" data-id="${tag.id}">
                <div class="tag-color" style="background:${tag.color}"></div>
                <span class="tag-name" data-id="${tag.id}">${tag.name}</span>
                <span class="tag-coords">(${tag.x}, ${tag.y})</span>
                <span class="tag-remove" data-id="${tag.id}"><i class="fas fa-times"></i></span>
            </div>
        `).join('');

        // Remove handler
        listEl.querySelectorAll('.tag-remove').forEach(btn => {
            btn.addEventListener('click', () => {
                this.removePositionTag(btn.dataset.id);
            });
        });

        // Double-click tag name to rename
        listEl.querySelectorAll('.tag-name[data-id]').forEach(nameSpan => {
            nameSpan.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                const tagId = nameSpan.dataset.id;
                const tag = this.positionTags.find(t => t.id === tagId);
                if (!tag) return;
                const currentName = tag.name;
                const input = document.createElement('input');
                input.type = 'text';
                input.value = currentName;
                input.className = 'tl-rename-input';
                input.style.width = '80px';
                nameSpan.textContent = '';
                nameSpan.appendChild(input);
                input.focus();
                input.select();
                const commit = () => {
                    const newName = input.value.trim() || currentName;
                    tag.name = newName;
                    this.updatePositionTagsUI();
                    this.stage.requestRender();
                    eventBus.emit('tags:updated');
                };
                input.addEventListener('blur', commit);
                input.addEventListener('keydown', (ke) => {
                    if (ke.key === 'Enter') { ke.preventDefault(); input.blur(); }
                    if (ke.key === 'Escape') { input.value = currentName; input.blur(); }
                });
                input.addEventListener('click', (ce) => ce.stopPropagation());
            });
        });

        // Click to pan to tag
        listEl.querySelectorAll('.tag-item').forEach(el => {
            el.addEventListener('click', (e) => {
                if (e.target.closest('.tag-remove') || e.target.closest('.tag-name')) return;
                const tag = this.positionTags.find(t => t.id === el.dataset.id);
                if (tag) {
                    // Center viewport on tag
                    this.stage.panX = this.stage.viewportWidth / 2 - tag.x * this.stage.zoom;
                    this.stage.panY = this.stage.viewportHeight / 2 - tag.y * this.stage.zoom;
                    this.stage.requestRender();
                }
            });
        });
    }

    // Zone Tags
    addZoneTag(name, x, y, width, height) {
        const tag = {
            id: Utils.generateId('zone'),
            name,
            x: Math.round(x),
            y: Math.round(y),
            width: Math.round(width),
            height: Math.round(height),
            color: this.getNextColor()
        };
        this.zoneTags.push(tag);
        this.updateZoneTagsUI();
        this.stage.requestRender();
        eventBus.emit('tags:updated');
        Utils.showToast(`Zone tag "${name}" added`, 'success');
    }

    removeZoneTag(id) {
        this.zoneTags = this.zoneTags.filter(t => t.id !== id);
        this.updateZoneTagsUI();
        this.stage.requestRender();
        eventBus.emit('tags:updated');
    }

    updateZoneTagsUI() {
        const listEl = document.getElementById('zone-tags');
        if (!listEl) return;

        if (this.zoneTags.length === 0) {
            listEl.innerHTML = '<div class="empty-state small"><p>No zone tags</p></div>';
            return;
        }

        listEl.innerHTML = this.zoneTags.map(tag => `
            <div class="tag-item" data-id="${tag.id}">
                <div class="tag-color" style="background:${tag.color}"></div>
                <span class="tag-name" data-id="${tag.id}">${tag.name}</span>
                <span class="tag-coords">${tag.width}×${tag.height}</span>
                <span class="tag-remove" data-id="${tag.id}"><i class="fas fa-times"></i></span>
            </div>
        `).join('');

        listEl.querySelectorAll('.tag-remove').forEach(btn => {
            btn.addEventListener('click', () => {
                this.removeZoneTag(btn.dataset.id);
            });
        });

        // Double-click zone tag name to rename
        listEl.querySelectorAll('.tag-name[data-id]').forEach(nameSpan => {
            nameSpan.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                const tagId = nameSpan.dataset.id;
                const tag = this.zoneTags.find(t => t.id === tagId);
                if (!tag) return;
                const currentName = tag.name;
                const input = document.createElement('input');
                input.type = 'text';
                input.value = currentName;
                input.className = 'tl-rename-input';
                input.style.width = '80px';
                nameSpan.textContent = '';
                nameSpan.appendChild(input);
                input.focus();
                input.select();
                const commit = () => {
                    const newName = input.value.trim() || currentName;
                    tag.name = newName;
                    this.updateZoneTagsUI();
                    this.stage.requestRender();
                    eventBus.emit('tags:updated');
                };
                input.addEventListener('blur', commit);
                input.addEventListener('keydown', (ke) => {
                    if (ke.key === 'Enter') { ke.preventDefault(); input.blur(); }
                    if (ke.key === 'Escape') { input.value = currentName; input.blur(); }
                });
                input.addEventListener('click', (ce) => ce.stopPropagation());
            });
        });
    }

    // Object Tags
    addObjectTag(obj, tagName) {
        if (!obj.tags.includes(tagName)) {
            obj.tags.push(tagName);
            this.updateObjectTagsUI();
            eventBus.emit('tags:updated');
            Utils.showToast(`Tag "${tagName}" added to ${obj.name}`, 'success');
        }
    }

    removeObjectTag(obj, tagName) {
        obj.tags = obj.tags.filter(t => t !== tagName);
        this.updateObjectTagsUI();
        eventBus.emit('tags:updated');
    }

    updateObjectTagsUI() {
        const listEl = document.getElementById('object-tags');
        if (!listEl) return;

        const selected = this.objects.getSelectedObjects();
        if (selected.length === 0) {
            listEl.innerHTML = '<div class="empty-state small"><p>Select an object to manage tags</p></div>';
            return;
        }

        const obj = selected[0];
        
        let html = `<div style="margin-bottom:8px">
            <strong class="obj-tag-name" data-obj-id="${obj.id}" style="font-size:11px;color:var(--text-secondary);cursor:pointer" title="Double-click to rename">${Utils.escapeHtml(obj.name)}</strong>
        </div>`;
        
        if (obj.tags.length === 0) {
            html += '<div style="font-size:11px;color:var(--text-muted);margin-bottom:8px">No tags assigned</div>';
        } else {
            html += obj.tags.map((tag, idx) => `
                <div class="tag-item">
                    <div class="tag-color" style="background:var(--accent-primary)"></div>
                    <span class="tag-name obj-tag-label" data-idx="${idx}">${tag}</span>
                    <span class="tag-remove" data-tag="${tag}"><i class="fas fa-times"></i></span>
                </div>
            `).join('');
        }
        
        html += `<div class="tag-create" style="margin-top:8px">
            <input type="text" id="new-obj-tag" placeholder="Add tag...">
            <button class="btn-primary btn-sm" id="btn-add-obj-tag"><i class="fas fa-plus"></i></button>
        </div>`;

        listEl.innerHTML = html;

        // Double-click object name to rename
        listEl.querySelector('.obj-tag-name')?.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            const nameEl = e.target;
            const currentName = obj.name;
            const input = document.createElement('input');
            input.type = 'text';
            input.value = currentName;
            input.className = 'tl-rename-input';
            input.style.width = '120px';
            nameEl.textContent = '';
            nameEl.appendChild(input);
            input.focus();
            input.select();
            const commit = () => {
                const newName = input.value.trim() || currentName;
                obj.name = newName;
                this.objects.updateObjectList();
                eventBus.emit('timeline:update');
                eventBus.emit('history:push');
                this.updateObjectTagsUI();
            };
            input.addEventListener('blur', commit);
            input.addEventListener('keydown', (ke) => {
                if (ke.key === 'Enter') { ke.preventDefault(); input.blur(); }
                if (ke.key === 'Escape') { input.value = currentName; input.blur(); }
            });
            input.addEventListener('click', (ce) => ce.stopPropagation());
        });

        // Double-click object tag label to rename tag
        listEl.querySelectorAll('.obj-tag-label').forEach(tagSpan => {
            tagSpan.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                const idx = parseInt(tagSpan.dataset.idx);
                const currentTag = obj.tags[idx];
                if (currentTag === undefined) return;
                const input = document.createElement('input');
                input.type = 'text';
                input.value = currentTag;
                input.className = 'tl-rename-input';
                input.style.width = '80px';
                tagSpan.textContent = '';
                tagSpan.appendChild(input);
                input.focus();
                input.select();
                const commit = () => {
                    const newTag = input.value.trim() || currentTag;
                    obj.tags[idx] = newTag;
                    this.updateObjectTagsUI();
                    eventBus.emit('tags:updated');
                };
                input.addEventListener('blur', commit);
                input.addEventListener('keydown', (ke) => {
                    if (ke.key === 'Enter') { ke.preventDefault(); input.blur(); }
                    if (ke.key === 'Escape') { input.value = currentTag; input.blur(); }
                });
                input.addEventListener('click', (ce) => ce.stopPropagation());
            });
        });

        // Add tag
        document.getElementById('btn-add-obj-tag')?.addEventListener('click', () => {
            const input = document.getElementById('new-obj-tag');
            if (input?.value.trim()) {
                this.addObjectTag(obj, input.value.trim());
                input.value = '';
            }
        });
        document.getElementById('new-obj-tag')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') document.getElementById('btn-add-obj-tag')?.click();
        });

        // Remove tag
        listEl.querySelectorAll('.tag-remove[data-tag]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.removeObjectTag(obj, btn.dataset.tag);
            });
        });
    }

    // Render tags on stage (called during stage render)
    renderTags(ctx) {
        // Position tags
        this.positionTags.forEach(tag => {
            const size = 6;
            ctx.save();
            
            // Crosshair
            ctx.strokeStyle = tag.color;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(tag.x - size * 2, tag.y);
            ctx.lineTo(tag.x + size * 2, tag.y);
            ctx.moveTo(tag.x, tag.y - size * 2);
            ctx.lineTo(tag.x, tag.y + size * 2);
            ctx.stroke();
            
            // Circle
            ctx.beginPath();
            ctx.arc(tag.x, tag.y, size, 0, Math.PI * 2);
            ctx.fillStyle = tag.color + '33';
            ctx.fill();
            ctx.stroke();
            
            // Label
            ctx.font = '10px Inter';
            ctx.fillStyle = tag.color;
            ctx.textAlign = 'left';
            ctx.fillText(tag.name, tag.x + size * 2 + 4, tag.y + 3);
            
            ctx.restore();
        });

        // Zone tags
        this.zoneTags.forEach(tag => {
            ctx.save();
            
            ctx.strokeStyle = tag.color;
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.strokeRect(tag.x, tag.y, tag.width, tag.height);
            
            ctx.fillStyle = tag.color + '11';
            ctx.fillRect(tag.x, tag.y, tag.width, tag.height);
            
            // Label
            ctx.setLineDash([]);
            ctx.font = '10px Inter';
            ctx.fillStyle = tag.color;
            ctx.textAlign = 'left';
            ctx.fillText(tag.name, tag.x + 4, tag.y - 4);
            
            ctx.restore();
        });
    }

    // Get all tag data for AI
    getTagData() {
        const objectTags = {};
        const bodyTags = [];
        this.objects.objects.forEach(obj => {
            if (obj.tags.length > 0) {
                objectTags[obj.id] = { name: obj.name, tags: obj.tags };
            }
            (Array.isArray(obj.bodyTags) ? obj.bodyTags : []).forEach(tag => {
                const world = this.objects._getObjectWorldPoint
                    ? this.objects._getObjectWorldPoint(obj, tag.x ?? 0.5, tag.y ?? 0.5)
                    : { x: obj.x, y: obj.y };
                bodyTags.push({
                    objectId: obj.id,
                    objectName: obj.name,
                    partKey: tag.targetPartKey || obj.bodyPartData?.partKey || null,
                    name: tag.name,
                    category: tag.category || 'body',
                    x: tag.x ?? 0.5,
                    y: tag.y ?? 0.5,
                    worldX: Math.round(world.x),
                    worldY: Math.round(world.y)
                });
            });
        });

        return {
            positions: this.positionTags.map(t => ({ name: t.name, x: t.x, y: t.y })),
            zones: this.zoneTags.map(t => ({ name: t.name, x: t.x, y: t.y, width: t.width, height: t.height })),
            objects: objectTags,
            bodyTags
        };
    }

    // Find objects by tag
    findObjectsByTag(tagName) {
        return this.objects.objects.filter(obj => obj.tags.includes(tagName));
    }

    // Get position tag by name
    getPositionTag(name) {
        return this.positionTags.find(t => t.name.toLowerCase() === name.toLowerCase());
    }

    // Get zone tag by name
    getZoneTag(name) {
        return this.zoneTags.find(t => t.name.toLowerCase() === name.toLowerCase());
    }

    // Serialization
    toJSON() {
        return {
            positionTags: this.positionTags,
            zoneTags: this.zoneTags
        };
    }

    loadFromData(data) {
        if (data?.positionTags) this.positionTags = data.positionTags;
        if (data?.zoneTags) this.zoneTags = data.zoneTags;
        this.updatePositionTagsUI();
        this.updateZoneTagsUI();
        this.stage.requestRender();
    }
}
