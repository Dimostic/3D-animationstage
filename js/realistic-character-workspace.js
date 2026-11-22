(function (global) {
    'use strict';
    const R = () => global.RealisticCharacter;
    const copy = value => structuredClone(value);
    class RealisticCharacterWorkspace {
        constructor(app) { this.app = app; this.view = 'front'; this.role = 'torso'; this.zoom = 1; this.tool = 'outline'; this._viewEditors = new WeakMap(); }
        get history() {
            if (this._historyData !== this.data) { this._historyData = this.data; this._viewHistory = new Map(); }
            if (!this._viewHistory) this._viewHistory = new Map();
            if (!this._viewHistory.has(this.view)) this._viewHistory.set(this.view, []);
            return this._viewHistory.get(this.view);
        }
        set history(value) { this.history; this._viewHistory.set(this.view, value); }
        $(selector) { return this.dialog.querySelector(selector); }
        async run(label, action) {
            if (this.busy) return;
            this.busy = true; this.status(label); this.dialog.setAttribute('aria-busy', 'true');
            this.controls();
            this.$('.rc-progress').hidden = false;
            try { await action(); this.status('Ready.'); }
            catch (error) { this.status(error.message || 'Operation failed.', true); }
            finally { this.busy = false; this.dialog.removeAttribute('aria-busy'); this.$('.rc-progress').hidden = true; this.controls(); }
        }
        status(message, error = false) { this.$('[role=status]').textContent = message; this.$('[role=status]').classList.toggle('rc-error', error); }
        open(target = null, options = {}) {
            if (this.dialog?.open) return;
            this.target = target;
            this._lastDraft = null;
            this.data = copy(target?.root?._svgCharacterConfig?._realisticCharacter || { version: 1, name: 'Realistic character', revision: '1', views: {}, provenance: { kind: 'uploaded' } });
            this.view = Object.keys(this.data.views)[0] || 'front'; this.history = [];
            this.dialog = document.createElement('dialog'); this.dialog.className = 'rc-workspace';
            this.dialog.setAttribute('aria-label', 'Realistic Characters');
            this.dialog.innerHTML = `<header><h2>Realistic Characters <small>Experimental</small></h2><a class="rc-help" href="tutorial.php#tut-realistic-image" target="_blank" rel="noopener" title="Simple realistic image tutorial (opens in a new tab)" aria-label="Simple realistic image tutorial (opens in a new tab)"><i class="fas fa-question-circle" aria-hidden="true"></i></a><button data-action="close" title="Close" aria-label="Close"><i class="fas fa-times"></i></button></header>
                <div class="rc-toolbar"><input name="name" aria-label="Character name" maxlength="80"><select name="view" aria-label="View"></select>
                <button data-action="upload"><i class="fas fa-image"></i> Image</button><button data-action="import"><i class="fas fa-folder-open"></i> Package</button>
                <button data-action="load"><i class="fas fa-bookmark"></i> Character library</button><button data-action="modules"><i class="fas fa-user-cog"></i> Assemble character</button><button data-action="quality"><i class="fas fa-check-circle"></i> Quality review</button><button data-action="ai-images"><i class="fas fa-magic"></i> AI artwork</button><button data-action="edit"><i class="fas fa-pen"></i> Edit selected</button>
                <input name="image" type="file" accept="image/png,image/jpeg,image/webp" hidden><input name="package" type="file" accept=".json,.realistic" hidden></div>
                <div class="rc-layout"><aside>
                <fieldset><legend>Character type</legend><select name="characterMode" aria-label="Character type"><option value="photographic">Photographic body</option><option value="hybrid">Realistic head + SVG body</option></select></fieldset>
                <fieldset><legend>Head fitting</legend><label>Head size<input name="headScale" type="range" min=".65" max="1.15" step=".01" value="1"></label><label>Neck height<input name="neckLift" type="range" min="0" max=".2" step=".01" value=".05"></label><button data-action="preview-fit"><i class="fas fa-eye"></i> Preview assembly</button></fieldset>
                <fieldset class="rc-hybrid" hidden><legend>Hybrid fitting</legend><label>SVG body<select name="bodyPreset"></select></label>
                <label>Skin match<input name="hybridSkin" type="color" value="#a87755"></label><button data-action="match-skin"><i class="fas fa-eye-dropper"></i> Sample skin</button>
                <label>Head width<input name="hybridHeadWidth" type="range" min=".65" max="1.2" step=".01" value="1"></label>
                <label>Head height offset<input name="hybridHeadY" type="range" min="-12" max="12" step=".5" value="0"></label>
                <label>Neck width<input name="hybridNeckWidth" type="range" min=".16" max=".4" step=".01" value=".26"></label>
                ${['right','left'].map(side=>`<label>${side==='right'?'Right':'Left'} hand<select name="hybridHand-${side}"><option value="rest">Rest</option><option value="open">Open palm</option><option value="point">Point</option><option value="grip">Grip</option></select></label>`).join('')}</fieldset>
                <fieldset><legend>Face shape (all views)</legend>${[['breadth','Face breadth'],['jaw','Jaw breadth'],['eyes','Eye size'],['mouth','Mouth width']].map(([key,label])=>`<label>${label}<input name="faceShape-${key}" type="range" min="-.08" max=".08" step=".01" value="0"></label>`).join('')}<button data-action="reset-face-shape" title="Reset face shape" aria-label="Reset face shape"><i class="fas fa-undo"></i></button></fieldset>
                <fieldset><legend>Source <small class="rc-source-kind"></small></legend><label class="rc-consent"><input name="consent" type="checkbox">I have permission to use and animate this image.</label>
                <button data-action="consent"><i class="fas fa-check"></i> Record consent</button>
                <label><input name="consentAll" type="checkbox">Apply permission to all views in this package</label>
                <div class="rc-pair"><button data-action="crop"><i class="fas fa-crop"></i> Crop</button><button data-action="apply-crop">Apply crop</button></div><button data-action="cancel-crop" hidden>Cancel crop</button>
                <button data-action="segment"><i class="fas fa-eraser"></i> Remove background</button>
                <button data-action="analyze"><i class="fas fa-crosshairs"></i> Fit landmarks</button>
                <button data-action="doctor-layout"><i class="fas fa-columns"></i> Doctor reference layout</button>
                <label>Tool<select name="tool"><option value="outline">Part outline / anchor</option><option value="layer">Clothing region outline</option><option value="face">Face regions</option><option value="erase">Erase mask</option><option value="restore">Restore mask</option><option value="sample">Clone source</option><option value="clone">Clone brush</option></select></label>
                <label>Brush<input name="brush" type="range" min="2" max="80" value="18"></label>
                <label>Edge inset<input name="inset" type="range" min="0" max="3" step=".1" value="0"></label>
                <label>Defringe<input name="defringe" type="range" min="0" max="100" value="0"></label>
                <button data-action="undo"><i class="fas fa-undo"></i> Undo</button></fieldset>
                <fieldset><legend>Parts</legend><select name="part" aria-label="Body part">${R().roles.map(k => `<option value="${k}">${R().labels[k]}</option>`).join('')}</select>
                <div class="rc-anchor-controls"><label>Attachment X (%)<input name="anchorX" type="number" min="0" max="100" step=".001"></label><label>Attachment Y (%)<input name="anchorY" type="number" min="0" max="100" step=".001"></label></div>
                <button data-action="replace-part"><i class="fas fa-image"></i> Replace part texture</button><button data-action="restore-part"><i class="fas fa-undo"></i> Original texture</button><input name="part-image" type="file" accept="image/png,image/jpeg,image/webp" hidden>
                <div class="rc-pair"><button data-action="vertex-add" title="Add outline vertex" aria-label="Add outline vertex"><i class="fas fa-plus"></i></button><button data-action="vertex-remove" title="Remove selected outline vertex" aria-label="Remove selected outline vertex"><i class="fas fa-minus"></i></button></div>
                <label>Bend joint<input name="bend" type="range" min=".1" max=".9" step=".01"></label>
                <label>Wrist / ankle<input name="end" type="range" min=".4" max=".99" step=".01"></label>
                <label>Tint<input name="tint" type="color" value="#ffffff"></label><label>Tint strength<input name="tintStrength" type="range" min="0" max=".75" step=".01"></label>
                <label>Face region<select name="feature"><option value="mouth">Mouth</option><option value="eyeLeft">Image-left eye / visible eye</option><option value="eyeRight">Image-right eye</option></select></label></fieldset>
                <fieldset class="rc-clothing-regions"><legend>Clothing regions</legend><select name="layer" aria-label="Clothing region"></select><div class="rc-pair"><button data-action="layer-add" title="Add clothing region" aria-label="Add clothing region"><i class="fas fa-plus"></i></button><button data-action="layer-delete" title="Delete clothing region" aria-label="Delete clothing region"><i class="fas fa-trash"></i></button></div><label>Name<input name="layerName" maxlength="80"></label><label><input name="layerVisible" type="checkbox">Visible</label><label>Region tint<input name="layerTint" type="color"></label><label>Tint strength<input name="layerStrength" type="range" min="0" max=".75" step=".01"></label></fieldset>
                <fieldset><legend>Proportions</legend>${[['widthScale','Body width',.8,1.2],['heightScale','Height',.8,1.2]].map(([k,l,min,max]) => `<label>${l}<input name="${k}" type="range" min="${min}" max="${max}" step=".01" value="1"></label>`).join('')}</fieldset>
                </aside><main><div class="rc-canvas-tools"><button data-action="zoom-out" title="Zoom out" aria-label="Zoom out"><i class="fas fa-search-minus"></i></button><output class="rc-zoom">100%</output><button data-action="zoom-in" title="Zoom in" aria-label="Zoom in"><i class="fas fa-search-plus"></i></button><button data-action="fit" title="Fit image" aria-label="Fit image"><i class="fas fa-expand"></i></button></div>
                <div class="rc-viewport"><canvas width="600" height="800" aria-label="Photographic character part editor"></canvas></div></main></div>
                <footer><progress class="rc-progress" hidden></progress><output role="status" aria-live="polite"></output><div><button data-action="inspect"><i class="fas fa-eye"></i> Inspect</button><button data-action="motion"><i class="fas fa-play"></i> Motion</button><button data-action="save"><i class="fas fa-bookmark"></i> Save preset</button><button data-action="save-account"><i class="fas fa-cloud-upload-alt"></i> Save to account</button><button data-action="export"><i class="fas fa-download"></i> Export package</button><button data-action="create"><i class="fas fa-plus"></i> ${target ? 'Update character' : 'Add to stage'}</button></div></footer>`;
            this.$('[name=tool]').add(new Option('Crop image','crop'));
            this.$('[name=tool]').add(new Option('Joint landmarks','joints'));
            this.$('.rc-anchor-controls').insertAdjacentHTML('afterend','<button data-action="fit-attachment"><i class="fas fa-crosshairs"></i> Fit attachment inside outline</button>');
            this.$('[data-action=fit-attachment]').insertAdjacentHTML('afterend','<button data-action="repair-attachments"><i class="fas fa-wrench"></i> Repair misplaced attachments</button>');
            this.$('[data-action=analyze]').insertAdjacentHTML('afterend','<button data-action="joint-landmarks"><i class="fas fa-project-diagram"></i> Joint landmarks</button><p class="rc-joint-note" hidden></p>');
            this.$('.rc-clothing-regions legend').textContent='Garments and repairs';
            this.$('.rc-clothing-regions').insertAdjacentHTML('beforeend',`<label>Layer type<select name="layerKind"><option value="garment">Garment</option><option value="repair">Body repair patch</option></select></label><label><input type="checkbox" name="layerExtract">Separate garment from base</label><button data-action="layer-source"><i class="fas fa-crosshairs"></i> Select repair source</button><div class="rc-pair"><button data-action="layer-up" title="Raise layer" aria-label="Raise layer"><i class="fas fa-arrow-up"></i></button><button data-action="layer-down" title="Lower layer" aria-label="Lower layer"><i class="fas fa-arrow-down"></i></button></div>`);
            this.$('[name=tool]').add(new Option('Repair source area','layer-source'));
            this.$('.rc-clothing-regions').insertAdjacentHTML('beforeend','<label>Edge softness<input name="layerSoftness" type="range" min="0" max=".15" step=".01" value="0"></label>');
            this.$('[name=tool]').closest('label').insertAdjacentHTML('beforebegin',`<div class="rc-image-tools" role="group" aria-label="Image tools">${[['erase','eraser','Erase'],['restore','paint-brush','Restore pixels'],['sample','crosshairs','Choose clone source'],['clone','clone','Clone brush']].map(([tool,icon,label])=>`<button data-action="tool-${tool}" title="${label}" aria-label="${label}" aria-pressed="false"><i class="fas fa-${icon}" aria-hidden="true"></i></button>`).join('')}<button data-action="image-undo" title="Undo image edit" aria-label="Undo image edit"><i class="fas fa-undo" aria-hidden="true"></i></button><button data-action="image-redo" title="Redo image edit" aria-label="Redo image edit"><i class="fas fa-redo" aria-hidden="true"></i></button><button data-action="image-specks" title="Remove small isolated specks" aria-label="Remove small isolated specks"><i class="fas fa-broom" aria-hidden="true"></i></button><button data-action="image-reset" title="Restore original image" aria-label="Restore original image"><i class="fas fa-history" aria-hidden="true"></i></button></div><label><input name="showOriginal" type="checkbox">Original image</label>`);
            this.$('[name=brush]').closest('label').insertAdjacentHTML('afterend','<label>Brush hardness<input name="hardness" type="range" min="0" max="100" value="65"></label><label>Brush opacity<input name="brushOpacity" type="range" min="1" max="100" value="100"></label><label>Edge feather<input name="feather" type="range" min="0" max="4" step=".1" value="0"></label><label>Edge cleanup<input name="cleanup" type="range" min="0" max="100" value="0"></label>');
            document.body.append(this.dialog); this.dialog.showModal();
            this.pointerPosition=null;
            this.dialog.insertAdjacentHTML('beforeend','<div class="rc-brush-cursor" hidden aria-hidden="true"><span class="rc-brush-core"></span><i></i></div>');
            this.$('[name=brush]').insertAdjacentHTML('afterend','<output class="rc-brush-size"></output>');
            this.dialog.addEventListener('input',e=>{if(['brush','hardness','brushOpacity'].includes(e.target.name))this.updateCursor();});
            this.$('[name=name]').value = this.data.name;
            for (const preset of global.SvgAfricanCharacterCatalog.listPresets().filter(p=>p.assetCharacterId && p.assetCharacterId.endsWith('-front'))) this.$('[name=bodyPreset]').add(new Option(preset.name || preset.label || preset.id,preset.id));
            if(target?.root?._svgCharacterConfig && this.data.mode==='hybrid') this.data.hybrid.preset=target.root._svgCharacterConfig.preset;
            this.dialog.addEventListener('click', e => { const a = e.target.closest('[data-action]')?.dataset.action; if (a) this.action(a); });
            this.dialog.addEventListener('change', e => this.change(e));
            this.dialog.addEventListener('cancel', e => { e.preventDefault(); if (!this.busy) this.requestClose(); });
            const dialog = this.dialog;
            this.dialog.addEventListener('close', () => { clearInterval(this._draftTimer); this.closeContextMenu(false);this.gallery?.close(); this.worker?.terminate(); this.worker = null; dialog.remove(); this.app.stage?.requestRender?.(); });
            const c = this.$('canvas'); c.addEventListener('pointerdown', e => this.down(e)); c.addEventListener('pointermove', e => this.move(e));
            c.tabIndex=0;c.addEventListener('contextmenu',e=>this.openContextMenu(e));
            this.dialog.addEventListener('pointerdown',e=>{if(this.contextMenu&&!this.contextMenu.contains(e.target))this.closeContextMenu(false);});
            this.dialog.addEventListener('scroll',()=>{this.closeContextMenu(false);this.pointerPosition=null;this.updateCursor();},true);
            c.addEventListener('pointerenter',e=>{this.pointerPosition={x:e.clientX,y:e.clientY};this.updateCursor();});
            c.addEventListener('pointerleave',()=>{this.pointerPosition=null;this.updateCursor();});
            c.addEventListener('pointerup', () => this.up()); c.addEventListener('pointercancel', () => this.up());
            this.$('.rc-viewport').addEventListener('wheel',e=>{
                if(this.busy||!this.editor||this.drag)return;
                e.preventDefault();this.closeContextMenu(false);
                const viewport=this.$('.rc-viewport'),before=c.getBoundingClientRect(),x=(e.clientX-before.left)/before.width,y=(e.clientY-before.top)/before.height;
                const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?viewport.clientHeight:1);
                this.zoom=Math.max(.3,Math.min(4,this.zoom*Math.exp(-Math.max(-300,Math.min(300,delta))*.002)));
                this.draw();const after=c.getBoundingClientRect();
                viewport.scrollLeft+=after.left+x*after.width-e.clientX;viewport.scrollTop+=after.top+y*after.height-e.clientY;
                this.pointerPosition=null;this.updateCursor();
            },{passive:false});
            this._cleanDraft = JSON.stringify(this.data);
            this._draftTimer = options.tutorial ? null : setInterval(() => {
                if (!this.busy && !this.drag && !this._closePrompt?.open && this.dialog?.open) this.saveDraft().catch(error => this.status('Draft recovery unavailable: '+error.message, true));
            }, 30000);
            this.controls(); return this.run('Opening workspace...', async () => {
                let recovered = false;
                if (!options.tutorial && !target && global.StorageIDB?.isAvailable()) {
                    try {
                        const draft = await global.StorageIDB.get('autosaves', 'realistic-draft');
                        if (draft?.data?.views && confirm('Resume your locally saved realistic character draft?')) {
                            this.data = draft.data; this.view = Object.keys(this.data.views)[0] || 'front';
                            this.$('[name=name]').value = this.data.name; recovered = true;
                        }
                    } catch (error) { console.warn('Realistic draft recovery:', error.message); }
                }
                await this.loadView(); if (!options.tutorial && !target && !recovered) await this.library();
            });
        }
        async saveDraft() {
            if (this._draftWrite) await this._draftWrite;
            if (!Object.keys(this.data.views).length) return;
            this.commitMask();
            const serialized = JSON.stringify(this.data);
            if (serialized === this._lastDraft || serialized === this._cleanDraft) return;
            if (!global.StorageIDB?.isAvailable()) throw new Error('Browser storage is unavailable. Export a package before closing.');
            this._draftWrite = global.StorageIDB.put('autosaves', 'realistic-draft', { data: copy(this.data), savedAt: Date.now() });
            try { await this._draftWrite; } finally { this._draftWrite = null; }
            this._lastDraft = serialized;
        }
        async requestClose() {
            if (this.busy || this._closePrompt?.open) return;
            this.commitMask();
            if (JSON.stringify(this.data) === this._cleanDraft) { this.dialog.close(); return; }
            const d = document.createElement('dialog'); this._closePrompt = d; d.className = 'rc-ai-dialog';
            d.innerHTML = '<h3>Keep this character draft?</h3><p>The draft stays in this browser. It is not uploaded.</p><button data-choice="save">Save draft and close</button><button data-choice="discard">Discard draft</button><button data-choice="cancel">Cancel</button><output role="status"></output>';
            d.onclick = async e => {
                const choice = e.target.dataset.choice; if (!choice) return;
                if (choice === 'cancel') { d.close(); return; }
                for (const b of d.querySelectorAll('button')) b.disabled = true;
                try {
                    if (choice === 'save') await this.saveDraft();
                    else if (global.StorageIDB?.isAvailable()) {
                        if (this._draftWrite) await this._draftWrite.catch(()=>{});
                        await global.StorageIDB.del('autosaves', 'realistic-draft');
                    }
                    d.close(); this.dialog.close();
                } catch (error) {
                    d.querySelector('output').textContent = error.message;
                    for (const b of d.querySelectorAll('button')) b.disabled = false;
                }
            };
            d.onclose = () => d.remove(); document.body.append(d); d.showModal();
        }
        controls() {
            if (!this.dialog) return;
            const v = this.data.views[this.view], p = v?.parts[this.role];
            for(const [key,value]of Object.entries(R().faceShape(v?.faceShape)))this.$(`[name=faceShape-${key}]`).value=value;
            this.data.hybrid ||= {preset:'corporate-woman-premium',skin:'#a87755',headWidth:1,headY:0,neckWidth:.26};
            this.data.hybrid.hands ||= {right:'rest',left:'rest'};
            for(const side of ['right','left']) this.$(`[name=hybridHand-${side}]`).value=this.data.hybrid.hands[side];
            this.$('[name=characterMode]').value=this.data.mode || 'photographic'; this.$('.rc-hybrid').hidden=this.data.mode!=='hybrid';
            this.$('[name=bodyPreset]').value=this.data.hybrid.preset;
            for(const [input,key] of [['hybridSkin','skin'],['hybridHeadWidth','headWidth'],['hybridHeadY','headY'],['hybridNeckWidth','neckWidth']]) this.$(`[name=${input}]`).value=this.data.hybrid[key];
            const select = this.$('[name=view]'); select.replaceChildren(...R().views.map(k => new Option(k.replaceAll('-', ' ') + (this.data.views[k] ? '' : ' (not supplied)'), k))); select.value = this.view;
            this.$('[name=part]').value = this.role;
            for (const option of this.$('[name=part]').options) {
                option.textContent = R().labels[option.value];
                if (this.view.startsWith('side') && /-(arm|leg)$/.test(option.value)) option.textContent += option.value.startsWith(this.view.endsWith('right') ? 'right' : 'left') ? ' (near)' : ' (far)';
            }
            for (const key of ['bend','end','tintStrength','tint']) this.$(`[name=${key}]`).value = p?.[key] || (key === 'tint' ? '#ffffff' : 0);
            for (const [name,axis] of [['anchorX','x'],['anchorY','y']]) this.$(`[name=${name}]`).value = p ? Number((p.pivot[axis]*100).toFixed(3)) : '';
            for (const key of ['widthScale','heightScale','headScale']) this.$(`[name=${key}]`).value = this.data[key] || 1;
            this.$('[name=neckLift]').value=this.data.neckLift??.05;
            for(const key of ['neckLift','headScale'])this.$(`[name=${key}]`).closest('label').hidden=this.data.mode==='hybrid';
            for (const b of this.dialog.querySelectorAll('button')) if(!b.closest('.rc-context-menu')) b.disabled = !!this.busy;
            for (const input of this.dialog.querySelectorAll('input,select')) input.disabled = !!this.busy;
            this.$('[name=neckLift]').disabled=this.busy||this.data.mode==='hybrid'||!v?.parts?.['head-neck']?.sourceImage;
            this.$('[data-action=create]').innerHTML = `<i class="fas fa-plus"></i> ${this.target ? 'Update character' : 'Add to stage'}`;
            for (const a of ['create','save','save-account','export','inspect','preview-fit','motion','segment','analyze','doctor-layout','crop','apply-crop']) this.$(`[data-action=${a}]`).disabled = this.busy || !v || !this.hasConsent();
            this.$('[data-action=apply-crop]').disabled ||= this.tool!=='crop'||!this.cropBox;
            this.$('[data-action=cancel-crop]').hidden=this.tool!=='crop';
            this.$('[data-action=replace-part]').disabled = this.busy || !p || this.role === 'head-neck' || !this.hasConsent();
            this.$('[data-action=fit-attachment]').disabled=this.busy||!p||!this.hasConsent();
            this.$('[data-action=repair-attachments]').disabled=this.busy||!v||!this.hasConsent();
            for (const name of ['anchorX','anchorY']) this.$(`[name=${name}]`).disabled = this.busy || !p || !this.hasConsent();
            const layers=(v?.layers || []).filter(layer=>layer.role===this.role);
            if(!layers.some(layer=>layer.id===this.layerId))this.layerId=layers[0]?.id || '';
            const layer=layers.find(item=>item.id===this.layerId), layerSelect=this.$('[name=layer]');
            layerSelect.replaceChildren(...(layers.length?layers.map(item=>new Option(item.name,item.id)):[new Option('No regions','')]));layerSelect.value=this.layerId;
            this.$('.rc-clothing-regions').hidden=this.data.mode==='hybrid'||this.role==='head-neck';
            this.$('[name=layerName]').value=layer?.name || '';this.$('[name=layerVisible]').checked=!!layer?.visible;
            this.$('[name=layerTint]').value=layer?.tint || '#ffffff';this.$('[name=layerStrength]').value=layer?.tintStrength || 0;
            for(const name of ['layer','layerName','layerVisible','layerTint','layerStrength'])this.$(`[name=${name}]`).disabled=this.busy||!layer||!this.hasConsent();
            this.$('[data-action=layer-add]').disabled=this.busy||!p||this.role==='head-neck'||!this.hasConsent()||(v?.layers?.length||0)>=16;
            this.$('[data-action=layer-delete]').disabled=this.busy||!layer||!this.hasConsent();
            this.$('[name=layerKind]').value=layer?.kind||'garment';this.$('[name=layerExtract]').checked=!!layer?.extract;
            this.$('[name=layerKind]').disabled=this.busy||!layer||!this.hasConsent();
            this.$('[name=layerExtract]').disabled=this.busy||!layer||!this.hasConsent()||layer.kind==='repair';
            this.$('[data-action=layer-source]').disabled=this.busy||!layer||!this.hasConsent()||layer.kind!=='repair';
            this.$('[name=layerSoftness]').value=layer?.edgeSoftness||0;this.$('[name=layerSoftness]').disabled=this.busy||!layer||!this.hasConsent();
            for(const action of ['layer-up','layer-down'])this.$(`[data-action=${action}]`).disabled=this.busy||!layer||!this.hasConsent();
            for(const tool of ['erase','restore','sample','clone']) {
                const button=this.$(`[data-action=tool-${tool}]`);button.disabled=this.busy||!this.editor||!this.hasConsent();button.setAttribute('aria-pressed',String(this.tool===tool));
            }
            for(const [action,disabled] of [['image-undo',!this.editor?.undoStack.length],['image-redo',!this.editor?.redoStack.length],['image-specks',false],['image-reset',false]])this.$(`[data-action=${action}]`).disabled=this.busy||!this.editor||!this.hasConsent()||disabled;
            for(const key of ['feather','cleanup','inset','defringe']) {this.$(`[name=${key}]`).value=this.editor?.[key]||0;this.$(`[name=${key}]`).disabled=this.busy||!this.editor||!this.hasConsent();}
            this.$('[name=showOriginal]').disabled=this.busy||!this.editor;
            this.$('[data-action=joint-landmarks]').disabled=this.busy||!v||!this.hasConsent();
            this.$('[data-action=joint-landmarks]').setAttribute('aria-pressed',String(this.tool==='joints'));
            const note=this.$('.rc-joint-note');note.hidden=this.tool!=='joints';
            note.textContent=(this.data.mode==='hybrid'?'The SVG body supplies its own joints. Fit the pictured neck here. ':this.view.startsWith('side')?'Side-view auto-fit estimates torso depth and visible limbs. Review the outline and fit hidden limb joints manually. ':'')+'Select a part to see joint names. Drag attachment dots freely; drag elbow, knee, wrist and ankle dots along the limb. Use Part outline / anchor to change the cutout, not the joints. Undo reverses a drag.';
            this.updateCursor();
            const independent=Object.values(v?.parts||{}).some(part=>part.sourceImage);
            this.$('.rc-source-kind').textContent=independent?'Independent parts':'';
            const unavailable=['crop','apply-crop','segment','analyze','doctor-layout','layer-add','tool-erase','tool-restore','tool-sample','tool-clone','image-undo','image-redo','image-specks','image-reset'];
            if(independent){for(const action of unavailable)this.$(`[data-action=${action}]`).disabled=true;for(const name of ['brush','feather','cleanup','inset','defringe'])this.$(`[name=${name}]`).disabled=true;}
            for(const option of this.$('[name=tool]').options)option.disabled=independent&&['erase','restore','sample','clone','crop','layer','layer-source'].includes(option.value);
            if(independent&&['erase','restore','sample','clone','crop','layer','layer-source'].includes(this.tool)){this.tool='outline';this.$('[name=tool]').value=this.tool;this.updateCursor();}
        }
        updateCursor() {
            const c=this.$('canvas'),ring=this.$('.rc-brush-cursor');if(!ring)return;
            const brush=['erase','restore','clone'].includes(this.tool),ready=!!this.editor&&!this.busy&&this.hasConsent()&&!this.$('[name=showOriginal]').checked;
            c.style.cursor=!ready?(this.busy?'wait':'default'):brush?'none':['sample','face','layer-source'].includes(this.tool)?'crosshair':this.tool==='crop'?'crosshair':'default';
            const radius=+this.$('[name=brush]').value;
            this.$('.rc-brush-size').textContent=`${radius*2} px diameter`;
            const rect=c.getBoundingClientRect(),p=this.pointerPosition;
            ring.hidden=!ready||!brush||!p||!!this.contextMenu||p.x<rect.left||p.x>rect.right||p.y<rect.top||p.y>rect.bottom;
            if(ring.hidden)return;
            ring.style.left=`${p.x}px`;ring.style.top=`${p.y}px`;
            ring.style.width=`${radius*2*rect.width/c.width}px`;ring.style.height=`${radius*2*rect.height/c.height}px`;
            ring.dataset.tool=this.tool;
            const icon=ring.querySelector('i');icon.className='fas fa-'+({erase:'eraser',restore:'paint-brush',clone:'clone'}[this.tool]);
            const core=ring.querySelector('.rc-brush-core'),hardness=+this.$('[name=hardness]').value;
            core.style.width=core.style.height=`${hardness}%`;core.hidden=hardness===0||hardness===100;
        }
        selectedLayer() { return this.data.views[this.view]?.layers?.find(layer=>layer.id===this.layerId && layer.role===this.role); }
        hasConsent() { return /^pc_[a-f0-9]{32}$/.test(this.data.views[this.view]?.consentId || ''); }
        requireConsent() { if (!this.hasConsent()) throw new Error('Record permission for this view before processing it.'); }
        async change(e) {
            if (this.busy) return;
            this.closeContextMenu(false);
            const n = e.target.name, v = this.data.views[this.view];
            if(n?.startsWith('faceShape-')) {
                const key=n.slice(10);if(!Object.hasOwn(R().faceShape(),key))return;
                const shape=R().faceShape({...v?.faceShape,[key]:e.target.value});
                for(const artwork of Object.values(this.data.views)){artwork.faceShape={...shape};delete artwork.qualityReview;}
                this.controls();this.status('Face shape updated for all views. Inspect to preview; review before saving.');return;
            }
            if (n === 'image') return this.run('Loading image...', () => this.upload(e.target.files[0]));
            if (n === 'part-image') return this.run('Replacing part texture...', () => this.replacePart(e.target.files[0]));
            if (n === 'package') return this.run('Opening package...', () => this.import(e.target.files[0]));
            if (n === 'view') { this.commitMask(); this.view = e.target.value; return this.run('Opening view...', () => this.loadView()); }
            if (n === 'part') { this.role = e.target.value; this.controls(); this.draw(); return; }
            if(n==='layer') {this.layerId=e.target.value;this.tool='layer';this.$('[name=tool]').value='layer';this.controls();this.draw();return;}
            if(n==='layerKind'||n==='layerExtract') {
                const layer=this.selectedLayer();if(!layer||!this.hasConsent())return;
                this.checkpoint();
                if(n==='layerKind') {layer.kind=e.target.value;if(layer.kind==='repair'){layer.extract=false;layer.sourceRect ||= R().bounds(layer.polygon);}}
                else layer.extract=e.target.checked;
                this.controls();this.draw();return;
            }
            if(['layerName','layerVisible','layerTint','layerStrength','layerSoftness'].includes(n)) {
                const layer=this.selectedLayer();if(!layer||!this.hasConsent())return;
                this.checkpoint();const key={layerName:'name',layerVisible:'visible',layerTint:'tint',layerStrength:'tintStrength',layerSoftness:'edgeSoftness'}[n];
                layer[key]=n==='layerVisible'?e.target.checked:['layerStrength','layerSoftness'].includes(n)?+e.target.value:e.target.value;
                this.controls();this.draw();return;
            }
            if(n==='showOriginal'){this.draw();return;}
            if (n === 'tool') { this.tool = e.target.value;if(this.tool==='crop'&&!this.cropBox)this.cropBox={x:.05,y:.05,w:.9,h:.9};this.$('[name=showOriginal]').checked=false;this.controls(); this.draw(); return; }
            if (n === 'anchorX' || n === 'anchorY') {
                const value=e.target.valueAsNumber, part=v?.parts[this.role];
                if (!part || !this.hasConsent() || !Number.isFinite(value) || value<0 || value>100) {
                    this.controls(); this.status('Enter an attachment position from 0 to 100 after recording consent.',true); return;
                }
                const axis=n==='anchorX'?'x':'y';
                if (Math.abs(part.pivot[axis]-value/100)>1e-8) {
                    this.checkpoint(); part.pivot[axis]=value/100;
                    this.tool='outline';this.$('[name=tool]').value='outline';this.draw();
                }
                this.controls(); return;
            }
            if (n === 'name') { this.data.name = e.target.value; return; }
            if (n === 'characterMode') { this.data.mode=e.target.value; this.controls(); return; }
            if (n === 'bodyPreset') { this.data.hybrid.preset=e.target.value; return; }
            if(n?.startsWith('hybridHand-')) {this.data.hybrid.hands[n.split('-')[1]]=e.target.value;return;}
            const hybridKey={hybridSkin:'skin',hybridHeadWidth:'headWidth',hybridHeadY:'headY',hybridNeckWidth:'neckWidth'}[n];
            if(hybridKey) { this.data.hybrid[hybridKey]=hybridKey==='skin'?e.target.value:+e.target.value; return; }
            if (['widthScale','heightScale','headScale','neckLift'].includes(n)) this.data[n] = +e.target.value;
            if (v && ['bend','end','tint','tintStrength'].includes(n)) { this.checkpoint(); v.parts[this.role][n] = n === 'tint' ? e.target.value : +e.target.value; this.draw(); }
            if (this.editor && this.hasConsent() && ['feather','cleanup','inset','defringe'].includes(n)) {this.$('[name=showOriginal]').checked=false;this.editor.setEdge(n, +e.target.value, true); this.editor.render(); this.controls();this.draw(); }
        }
        async action(a) {
            if(a==='preview-fit')a='inspect';
            if(a==='reset-face-shape') {
                if(this.busy)return;
                for(const artwork of Object.values(this.data.views)){artwork.faceShape=R().faceShape();delete artwork.qualityReview;}
                this.controls();this.status('Face shape reset. Inspect to preview.');return;
            }
            if(a==='repair-attachments') {
                if(this.busy||!this.editor||!this.hasConsent())return;
                const parts=Object.values(this.data.views[this.view].parts).filter(p=>!R().insideOutline(p.pivot,p.polygon));
                if(!parts.length){this.status('All attachments are inside their outlines.');return;}
                this.checkpoint();let fixed=0;
                for(const p of parts){
                    const b=R().bounds(p.polygon);if(!b.w||!b.h)continue;
                    const preferred=Math.max(.05,Math.min(.95,(p.pivot.y-b.y)/b.h));
                    for(const t of [preferred,...Array.from({length:19},(_,i)=>(i+1)/20)]){
                        const point={x:b.x+R().limbCenter(p.polygon,t)*b.w,y:b.y+t*b.h};
                        if(R().insideOutline(point,p.polygon)){p.pivot=point;fixed++;break;}
                    }
                }
                this.tool='joints';this.$('[name=tool]').value='joints';this.$('[name=showOriginal]').checked=false;this.controls();this.draw();
                this.status(`Repaired ${fixed} attachment(s) in this view. Check hip and shoulder placement in Motion. Undo restores the previous positions.`);return;
            }
            if(a==='fit-attachment') {
                if(this.busy||!this.editor||!this.hasConsent())return;
                const p=this.data.views[this.view].parts[this.role],b=R().bounds(p.polygon);
                if(!b.w||!b.h)return;
                this.checkpoint();const t=Math.max(.05,Math.min(.95,(p.pivot.y-b.y)/b.h));
                p.pivot={x:b.x+R().limbCenter(p.polygon,t)*b.w,y:b.y+t*b.h};
                this.tool='joints';this.$('[name=tool]').value='joints';this.$('[name=showOriginal]').checked=false;this.controls();this.draw();return;
            }
            if(a==='joint-landmarks') {if(this.busy||!this.editor||!this.hasConsent())return;this.tool='joints';this.$('[name=tool]').value='joints';this.$('[name=showOriginal]').checked=false;this.controls();this.draw();return;}
            if (a === 'ai-images') return this.run('Loading image jobs...', () => this.imageJobs());
            if (this.busy) return;
            if(a.startsWith('tool-')) {
                if(!this.editor||!this.hasConsent())return;
                this.tool=a.slice(5);this.$('[name=tool]').value=this.tool;this.$('[name=showOriginal]').checked=false;this.controls();this.draw();return;
            }
            if(a.startsWith('image-'))return this.run('Updating image...',async()=>{
                this.requireConsent();if(!this.editor)return;this.$('[name=showOriginal]').checked=false;
                if(a==='image-undo')this.editor.undo();
                if(a==='image-redo')this.editor.redo();
                if(a==='image-specks')this.editor.removeSpecks();
                if(a==='image-reset'&&confirm('Restore the original image and remove mask, clone and edge edits? Outlines and garment layers will remain.')) {
                    this.editor.checkpoint();this.editor.mask.fill(255);this.editor.colorPixels=this.editor.originalPixels.slice();this.editor.colorCanvas.getContext('2d').putImageData(new ImageData(this.editor.colorPixels,this.editor.width,this.editor.height),0,0);
                    for(const key of ['feather','cleanup','inset','defringe'])this.editor[key]=0;
                    this.editor.cloneSource=null;this.editor.cloneSession=null;this.editor.render();
                }
                this.draw();
            });
            if(a==='save-account') {this.confirmAccountSave();return;}
            if (a === 'close') { await this.requestClose(); return; }
            if (a === 'upload') { this.$('[name=image]').click(); return; }
            if (a === 'import') { this.$('[name=package]').click(); return; }
            if (a === 'replace-part') { this.$('[name=part-image]').value = ''; this.$('[name=part-image]').click(); return; }
            if (a === 'edit') {
                const rig = this.app.jointSystem?._detectSelectedArmature?.();
                if (!rig?.root?._svgCharacterConfig?._realisticCharacter) { this.status('Select a realistic character on stage first.', true); return; }
                this.dialog.close(); this.open(rig); return;
            }
            if (a.startsWith('zoom') || a === 'fit') {
                const viewport = this.$('.rc-viewport'), v = this.data.views[this.view];
                this.zoom = a === 'fit' && v ? Math.max(.05, Math.min(4, (viewport.clientHeight-24)/680, (viewport.clientWidth-24)/(680*v.width/v.height))) : Math.max(.3, Math.min(4, this.zoom * (a === 'zoom-in' ? 1.25 : .8)));
                this.draw(); return;
            }
            await this.run(({ segment: 'Removing background...', create: 'Preparing character parts...', consent: 'Recording permission...', save: 'Saving preset...' })[a] || 'Working...', async () => {
                if (a === 'consent') await this.consent();
                if (a === 'segment') await this.segment();
                if (a === 'analyze') await this.analyze();
                if (a === 'quality') await this.qualityReview();
                if(a==='layer-add') {
                    this.requireConsent();const v=this.data.views[this.view];if(this.role==='head-neck'||(v.layers?.length||0)>=16)return;
                    this.checkpoint();v.layers ||= [];this.layerId=crypto.randomUUID();
                    v.layers.push({id:this.layerId,name:`${R().labels[this.role]} region ${v.layers.length+1}`,role:this.role,polygon:copy(v.parts[this.role].polygon),visible:true,tint:'#ffffff',tintStrength:0,texture:''});
                    this.tool='layer';this.$('[name=tool]').value='layer';this.draw();
                }
                if(a==='layer-delete') {this.requireConsent();this.checkpoint();const v=this.data.views[this.view];v.layers=(v.layers||[]).filter(layer=>layer.id!==this.layerId);this.layerId='';this.tool='outline';this.$('[name=tool]').value='outline';this.draw();}
                if(a==='layer-source'&&this.selectedLayer()?.kind==='repair') {this.requireConsent();this.tool='layer-source';this.$('[name=tool]').value=this.tool;this.draw();}
                if(a==='layer-up'||a==='layer-down') {
                    this.requireConsent();const layer=this.selectedLayer(),layers=this.data.views[this.view].layers||[],index=layers.indexOf(layer),step=a==='layer-up'?1:-1;
                    for(let next=index+step;index>=0&&next>=0&&next<layers.length;next+=step)if(layers[next].role===this.role&&(layers[next].kind==='repair')===(layer.kind==='repair')) {
                        this.checkpoint();[layers[index],layers[next]]=[layers[next],layers[index]];break;
                    }
                    this.draw();
                }
                if (a === 'match-skin') await this.matchSkin();
                if (a === 'doctor-layout') await this.doctorLayout();
                if (a === 'restore-part') { const p = this.data.views[this.view]?.parts[this.role]; if (p) { this.checkpoint(); delete p.replacement; delete p.replacementConsent; } }
                if (a === 'vertex-add' || a === 'vertex-remove') {
                    const p = this.tool==='layer'?this.selectedLayer():this.data.views[this.view]?.parts[this.role];
                    if (p) {
                        this.checkpoint();
                        if (a === 'vertex-add' && p.polygon.length < 128) {
                            let index = 0, longest = 0;
                            p.polygon.forEach((pt, i) => { const next = p.polygon[(i + 1) % p.polygon.length], d = Math.hypot(pt.x - next.x, pt.y - next.y); if (d > longest) { longest = d; index = i; } });
                            const pt = p.polygon[index], next = p.polygon[(index + 1) % p.polygon.length];
                            p.polygon.splice(index + 1, 0, { x: (pt.x + next.x) / 2, y: (pt.y + next.y) / 2 });
                        } else if (a === 'vertex-remove' && p.polygon.length > 3 && this.selectedVertex < p.polygon.length) p.polygon.splice(this.selectedVertex, 1);
                        this.draw();
                    }
                }
                if (a === 'crop') { this.requireConsent(); this.tool = 'crop'; this.$('[name=tool]').value='crop'; this.cropBox = {x:.05,y:.05,w:.9,h:.9}; this.$('[name=showOriginal]').checked=false; }
                if (a === 'cancel-crop') { this.cropBox=null;this.drag=null;this.tool='outline';this.$('[name=tool]').value='outline'; }
                if (a === 'apply-crop') await this.applyCrop();
                if (a === 'undo') {
                    if (['erase','restore','clone','sample'].includes(this.tool)) this.editor?.undo();
                    else if (this.history.length) { const shape=R().faceShape(this.data.views[this.view]?.faceShape);this.data.views[this.view] = this.history.pop();this.data.views[this.view].faceShape=shape;await this.loadView(); }
                    this.draw();
                }
                if(a==='motion') {await this.prepare();global.RealisticCharacterMotion.open(this.app,this.characterConfig());}
                if (a === 'create' || a === 'save' || a === 'export' || a === 'inspect') {
                    await this.prepare(a === 'create' || a === 'save');
                    if (a === 'inspect') await this.inspect();
                    else if (a === 'create') {
                        const config = this.characterConfig(), js = this.app.jointSystem;
                        const result = this.target ? js.updateSvgAfricanCharacterAppearance(this.target, config) : js.createSvgAfricanCharacter(config, { ignoreSelectionReference: true });
                        if (!result) throw new Error('Character could not be added.');
                        global.emit?.('history:push'); this.dialog.close();
                    } else if (a === 'save') {
                        const state=await this.createAssemblyPreview(this.characterConfig());
                        try {
                            await this.drawAssemblyPreview(state);
                            await this.store('put', { id: this.data.id || (this.data.id = crypto.randomUUID()), name: this.data.name, data: this.data, thumbnail:state.sandbox.canvas.toDataURL() });
                        } finally {this.app._disposeSvgAfricanBuilderMotionSandbox(state);}
                    }
                    else this.download();
                }
                if (a === 'load') await this.library();
                if (a === 'modules') await this.modules();
            });
        }
        async imageRevision(view) {
            const v = this.data.views[view];
            if (!v) return '';
            const text = JSON.stringify({source:v.source,consent:v.consentId,face:v.face,parts:Object.fromEntries(Object.entries(v.parts).map(([k,p])=>[k,{polygon:p.polygon,pivot:p.pivot,replacement:p.replacement}]))});
            return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),n=>n.toString(16).padStart(2,'0')).join('');
        }
        async matchSkin() {
            this.requireConsent(); this.commitMask();
            const v=this.data.views[this.view], eye=v.face.eyeLeft, mouth=v.face.mouth;
            const img=await R().image(v.source), c=R().canvas(v.width,v.height), ctx=c.getContext('2d',{willReadFrequently:true}); ctx.drawImage(img,0,0,c.width,c.height);
            const x=Math.max(0,Math.min(c.width-5,Math.round((eye.x+eye.w*.5)*c.width))),y=Math.max(0,Math.min(c.height-5,Math.round((eye.y+eye.h+mouth.y)*.5*c.height)));
            const pixels=ctx.getImageData(x,y,5,5).data, channels=[[],[],[]];
            for(let i=0;i<pixels.length;i+=4) if(pixels[i+3]>200) channels.forEach((a,k)=>a.push(pixels[i+k]));
            if(!channels[0].length) throw new Error('Fit eye and mouth regions before sampling skin.');
            this.data.hybrid.skin='#'+channels.map(a=>a.sort((a,b)=>a-b)[Math.floor(a.length/2)].toString(16).padStart(2,'0')).join(''); this.controls();
        }
        async imageApi(body) {
            const response = await fetch('api/ai/realistic-images.php', { credentials: 'same-origin', signal: AbortSignal.timeout(30000),
                method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': global.__STAGE_USER?.csrf_token || '' }, ...(body ? { body: JSON.stringify(body) } : {}) });
            const data = await response.json().catch(() => { throw new Error(`Image service returned HTTP ${response.status}.`); });
            if (!response.ok || !data.ok) throw new Error(data.error || data.message || 'Image request failed.');
            return data;
        }
        async imageJobs() {
            const state = await this.imageApi(), d = document.createElement('dialog');
            d.className = 'rc-ai-dialog'; d.setAttribute('aria-label', 'AI character artwork');
            d.innerHTML = `<h2>AI character artwork</h2><form method="dialog"><button aria-label="Close">Close</button></form>
                <label>Operation<select name="operation"><option value="generate">New fictional character</option><option value="view">Matching view (inferred)</option><option value="reconstruct">Reconstruct selected body part (inferred)</option><option value="restyle">Change hairstyle or clothing</option></select></label>
                <label>Character design<select name="design"></select></label><label>View<select name="target-view"></select></label>
                <label>Details<textarea name="prompt" maxlength="2400" rows="3"></textarea></label>
                <label><input type="checkbox" name="external">Allow uploading this reference to OpenAI for this request.</label>
                <label><input type="checkbox" name="charge">Approve image generation charge: <span class="cost"></span> credits.</label>
                <button class="generate">Generate</button><button class="refresh">Refresh jobs</button><output role="status" aria-live="polite"></output><section class="jobs"></section>`;
            const q = s => d.querySelector(s), roles = ['Doctor','Nurse','Teacher','University student','Farmer','Mechanic','Market trader','Tailor','Chef','Office worker','Engineer','Community elder','Yoruba traditional ruler','Igbo traditional ruler','Hausa traditional ruler','Niger Delta ceremonial leader','Fisher','Carpenter','Bus driver','Shopkeeper','Community health worker','Security officer'];
            for (const role of roles) for (const gender of ['woman','man']) q('[name=design]').add(new Option(`${role} - ${gender}`, `${role}, adult Nigerian ${gender}`));
            for (const view of R().views) q('[name=target-view]').add(new Option(view,view));
            q('[name=target-view]').value = this.view; q('.cost').textContent = state.cost;
            const seed = () => { q('[name=prompt]').value = `${q('[name=design]').value}. Culturally appropriate contemporary clothing, natural proportions, neutral standing pose.`; }; seed();
            q('[name=design]').onchange = seed;
            q('[name=operation]').onchange = () => {
                const op=q('[name=operation]').value; q('[name=design]').disabled=op!=='generate';
                if(op==='generate') seed();
                else q('[name=prompt]').value=op==='restyle'?'Change the outfit to a plain business suit. Preserve face identity and hairstyle.':'Preserve the source identity, proportions, clothing and hairstyle.';
            };
            const status = message => { q('[role=status]').textContent = message; };
            q('.generate').disabled = !state.configured || !state.workerReady;
            if (!state.configured || !state.workerReady) status('Image service unavailable. The server image worker and OpenAI key must be configured.');
            let working = false, pending = false;
            const guard = async action => { if (working) return; working = true; try { await action(); } catch(e) { status(e.message); } finally { working = false; } };
            const render = jobs => {
                pending = jobs.some(job => ['queued','processing'].includes(job.status));
                q('.jobs').replaceChildren();
                for (const job of jobs) {
                    const row = document.createElement('div'), label = document.createElement('p');
                    label.textContent = `${job.name} / ${job.view}: ${job.status}${job.error ? ' - '+job.error : ''}`; row.append(label);
                    if (job.status === 'complete') {
                        const button = document.createElement('button'); button.textContent = 'Review result';
                        button.onclick = () => guard(async () => {
                            const response = await fetch(`api/ai/realistic-images.php?id=${encodeURIComponent(job.id)}&image=1`, { credentials:'same-origin', signal:AbortSignal.timeout(30000) });
                            if (!response.ok) throw new Error('Cannot load generated image.');
                            const blob = await response.blob(), url = URL.createObjectURL(blob), review = document.createElement('dialog');
                            review.innerHTML = '<h3>Review inferred artwork</h3><img alt="Generated character artwork" style="max-width:100%;max-height:55vh"><p>Check identity, clothing, anatomy and direction. Fit landmarks and outlines after accepting.</p><button class="accept">Accept artwork</button><button class="discard">Close without applying</button>';
                            review.querySelector('img').src = url; document.body.append(review); review.showModal();
                            review.onclose = () => { URL.revokeObjectURL(url); review.remove(); };
                            review.querySelector('.discard').onclick = () => review.close();
                            review.querySelector('.accept').onclick = async () => {
                                const accept = review.querySelector('.accept'); accept.disabled = true;
                                try {
                                    if (job.operation !== 'generate' && job.sourceRevision !== await this.imageRevision(job.sourceView)) throw new Error('Character changed since this request. Reconstruct from the current character instead.');
                                    const img = await R().image(url), scale = Math.min(1,1600/Math.max(img.width,img.height)), c = R().canvas(img.width*scale,img.height*scale);
                                    c.getContext('2d').drawImage(img,0,0,c.width,c.height); const png = c.toDataURL();
                                    this.checkpoint();
                                    if (job.operation === 'reconstruct') {
                                        const p = this.data.views[job.sourceView]?.parts[job.part];
                                        if (!p || job.part === 'head-neck') throw new Error('The original body part is no longer available.');
                                        p.replacement = png; p.replacementConsent = job.consentId;
                                    } else {
                                        if (this.data.views[job.view] && !confirm('Replace the existing artwork for this view?')) return;
                                        const v = R().defaults(c.width,c.height,job.view);
                                        Object.assign(v,{source:png,original:png,consentId:job.consentId,sha256:job.sha256,generation:{jobId:job.id,operation:job.operation,reviewed:true}});
                                        this.data.views[job.view] = v; this.view = job.view;
                                    }
                                    this.data.revision = String(Date.now()); review.close(); d.close(); await this.loadView(); this.controls(); this.status('Artwork accepted. Check landmarks and part outlines before adding to stage.');
                                } catch(e) { status(e.message); review.close(); } finally { accept.disabled = false; }
                            };
                        }); row.append(button);
                    }
                    if (!['processing','discarded'].includes(job.status)) {
                        const remove = document.createElement('button'); remove.textContent = job.status === 'queued' ? 'Cancel request' : 'Remove result';
                        remove.onclick = () => guard(async () => { if (!confirm('Remove this image job and its stored result?')) return; await this.imageApi({action:'cancel',id:job.id}); render((await this.imageApi()).jobs); }); row.append(remove);
                    }
                    q('.jobs').append(row);
                }
            };
            q('.refresh').onclick = () => guard(async () => render((await this.imageApi()).jobs));
            q('.generate').onclick = () => guard(async () => {
                const operation = q('[name=operation]').value, source = this.data.views[this.view];
                if (!q('[name=charge]').checked) throw new Error('Approve the displayed credit charge first.');
                const body = {operation,prompt:q('[name=prompt]').value,name:q('[name=design]').value,view:q('[name=target-view]').value,confirmedCharge:true,requestId:crypto.randomUUID(),sourceRevision:String(this.data.revision),sourceView:this.view};
                if (operation !== 'generate') {
                    this.requireConsent(); if (!q('[name=external]').checked) throw new Error('External upload consent is required.');
                    this.commitMask(); Object.assign(body,{source:source.source,consentId:source.consentId,sourceHash:source.sha256,confirmedExternalUpload:true});
                    if (operation === 'restyle') body.view = this.view;
                    if (operation === 'reconstruct') {
                        if (this.role === 'head-neck') throw new Error('Select a torso, arm or leg. Head reconstruction is not supported.');
                        await R().compile(source,this.view); body.part = this.role; body.partImage = source.parts[this.role].texture;
                    }
                }
                body.sourceRevision = await this.imageRevision(this.view);
                await this.imageApi(body); q('[name=charge]').checked = false; q('[name=external]').checked = false;
                render((await this.imageApi()).jobs); status('Queued. Refresh jobs to check progress. You can close this window while processing continues.');
            });
            render(state.jobs); document.body.append(d); d.showModal();
            const poll = setInterval(() => { if (pending && d.open) guard(async () => render((await this.imageApi()).jobs)); },8000);
            d.onclose = () => { clearInterval(poll); d.remove(); };
        }
        async upload(file) {
            if (!file) return;
            if (!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size > 12e6) throw new Error('Use a PNG, JPEG or WebP image below 12 MB.');
            const bytes = await file.arrayBuffer(), hash = await crypto.subtle.digest('SHA-256', bytes);
            const url = URL.createObjectURL(file); let img;
            try { img = await R().image(url); } finally { URL.revokeObjectURL(url); }
            const scale = Math.min(1, 1600 / Math.max(img.width, img.height)), c = R().canvas(img.width * scale, img.height * scale);
            c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
            const v = R().defaults(c.width, c.height, this.view); v.source = c.toDataURL(); v.original = v.source;
            v.sha256 = Array.from(new Uint8Array(hash), n => n.toString(16).padStart(2, '0')).join(''); v.consentId = '';
            this.data.views[this.view] = v; this.data.provenance.sourceName = file.name;
            this.$('[name=consent]').checked = false; await this.loadView();
        }
        async replacePart(file) {
            if (!file) return;
            this.requireConsent();
            if (!this.$('[name=consent]').checked) throw new Error('Confirm permission for the replacement image using the permission checkbox.');
            if (!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size > 12e6) throw new Error('Use PNG, JPEG or WebP below 12 MB.');
            const hash = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
            const sha256 = Array.from(new Uint8Array(hash), n => n.toString(16).padStart(2, '0')).join('');
            const receipt = await this.recordConsent(sha256), url = URL.createObjectURL(file); let img;
            try { img = await R().image(url); } finally { URL.revokeObjectURL(url); }
            const scale = Math.min(1, 1000 / Math.max(img.width, img.height)), c = R().canvas(img.width * scale, img.height * scale); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
            this.checkpoint(); Object.assign(this.data.views[this.view].parts[this.role], { replacement: c.toDataURL(), replacementConsent: receipt.id });
        }
        async loadView() {
            this.editor = null; this.cropBox = null; const v = this.data.views[this.view];
            if (v) {
                const cached=this._viewEditors.get(v);
                if (cached && cached.source===v.source && cached.original===v.original) { this.editor=cached.editor; this.draw(); return; }
                const img = await R().image(v.original || v.source), source = R().canvas(v.width, v.height);
                source.getContext('2d').drawImage(img, 0, 0, source.width, source.height);
                const current = R().canvas(v.width, v.height); current.getContext('2d').drawImage(await R().image(v.source), 0, 0, v.width, v.height);
                this.editor = new PhotoCutoutEditor(source, current, this.app.objects);
                this._viewEditors.set(v,{editor:this.editor,source:v.source,original:v.original});
            }
            this.draw();
        }
        commitMask() {
            const v=this.data.views[this.view];
            if (this.editor && v) {
                v.source=this.editor.output.toDataURL();
                this._viewEditors.set(v,{editor:this.editor,source:v.source,original:v.original});
            }
        }
        async consent() {
            const v = this.data.views[this.view];
            if (!v || !this.$('[name=consent]').checked) throw new Error('Select an image and confirm permission first.');
            const selected=this.$('[name=consentAll]').checked?Object.values(this.data.views):[v];
            for(const item of selected){
                if(!/^[a-f0-9]{64}$/.test(item.sha256||''))item.sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(item.source))),n=>n.toString(16).padStart(2,'0')).join('');
                const receipt=await this.recordConsent(item.sha256);item.consentId=receipt.id;
            }
            this.data.provenance.consentId = v.consentId;
        }
        async loadLibraryJson(file) {
            if(!/^[a-z0-9.-]+$/.test(file))throw new Error('Invalid library path.');
            const controller=new AbortController();let idle,reader;
            const touch=()=>{clearTimeout(idle);idle=setTimeout(()=>controller.abort(),60000);};
            const deadline=setTimeout(()=>controller.abort(),300000);
            try {
                touch();
                const response=await fetch('assets/realistic-characters/'+file,{signal:controller.signal});
                if(!response.ok)throw new Error(`Library package unavailable (HTTP ${response.status}).`);
                const limit=32e6,total=Number(response.headers.get('content-length'))||0;
                if(total>limit)throw new Error('Library package is too large.');
                reader=response.body.getReader();const decoder=new TextDecoder();let text='',received=0;
                while(true){
                    const {done,value}=await reader.read();if(done)break;
                    touch();received+=value.byteLength;
                    if(received>limit)throw new Error('Library package is too large.');
                    text+=decoder.decode(value,{stream:true});
                    this.status(`Downloading character: ${(received/1e6).toFixed(1)} MB${total?' / '+(total/1e6).toFixed(1)+' MB':''}`);
                }
                text+=decoder.decode();this.status('Preparing character artwork...');return JSON.parse(text);
            } catch(error) {
                if(controller.signal.aborted)throw new Error('Character download stalled or exceeded five minutes. Reopen the library and retry; your current character has not been replaced.');
                throw error;
            } finally {clearTimeout(idle);clearTimeout(deadline);await reader?.cancel().catch(()=>{});}
        }
        async modules() {
            const fetchJson=async file=>{
                if(!/^[a-z0-9.-]+$/.test(file))throw new Error('Invalid module path.');
                return this.loadLibraryJson(file);
            };
            const catalog=await fetchJson('modules.json'),saved=this.data.modules||{},d=document.createElement('dialog');d.className='rc-ai-dialog';d.setAttribute('aria-label','Assemble photographic character');
            d.innerHTML='<h2>Assemble photographic character</h2><label>Head<select name="head"></select></label><label>Body and fitted outfit<select name="body"></select></label><label>Build<select name="build"><option value="standard">Standard</option><option value="slim">Narrower (6%)</option><option value="broad">Broader (8%)</option></select></label><label>Outfit colour<select name="outfit"><option value="original">Original</option><option value="teal">Teal tint</option><option value="burgundy">Burgundy tint</option></select></label><label>Head fit<input name="headFit" type="range" min=".9" max="1.1" step=".01" value="1"></label><label><input name="turns" type="checkbox" checked>Experimental photographic head turns</label><output role="status"></output><button class="assemble"><i class="fas fa-user-plus"></i> Assemble</button><button class="close">Cancel</button>';
            for(const group of ['head','body'])for(const item of catalog[group==='head'?'heads':'bodies'])d.querySelector(`[name=${group}]`).add(new Option(item.name,item.id));
            for(const key of ['head','body','build','outfit','headFit'])if(saved[key]!=null)d.querySelector(`[name=${key}]`).value=saved[key];
            d.querySelector('[name=turns]').checked=saved.turns!==false;
            const preview=document.createElement('section');preview.className='rc-module-preview';
            preview.innerHTML='<button type="button" class="preview"><i class="fas fa-eye"></i> Preview combination</button><label>Preview view<select name="moduleView"></select></label><img alt="Assembled photographic character preview" hidden>';
            d.querySelector('output').before(preview);
            const viewSelect=preview.querySelector('select'),previewImage=preview.querySelector('img');
            let prepared=null,preparedKey='';const files=new Map();
            const getFile=async file=>{if(!files.has(file))files.set(file,fetchJson(file).catch(e=>{files.delete(file);throw e;}));return files.get(file);};
            const readOptions=()=>({...Object.fromEntries(['head','body','build','outfit','headFit'].map(k=>[k,d.querySelector(`[name=${k}]`).value])),turns:d.querySelector('[name=turns]').checked});
            const prepare=async options=>{
                const key=JSON.stringify(options);if(prepared&&preparedKey===key)return prepared;
                const bodyEntry=catalog.bodies.find(b=>b.id===options.body),headEntry=catalog.heads.find(h=>h.id===options.head);
                if(!bodyEntry||!headEntry)throw new Error('Select a compatible head and body.');
                const body=await getFile(bodyEntry.file),donor=headEntry.body?await getFile(catalog.bodies.find(b=>b.id===headEntry.body).file):null;
                const pack=donor?R().headPack(donor):await getFile(headEntry.file);
                const result=await R().composeModules(body,pack,options);prepared=result;preparedKey=key;return result;
            };
            let previewSerial=0;
            const showPreview=async()=>{
                const token=++previewSerial,data=prepared,view=viewSelect.value;
                previewImage.hidden=true;if(!data?.views[view])return;
                let state;
                try {
                    state=await this.createAssemblyPreview(R().config(data,view));
                    await this.drawAssemblyPreview(state,{},false);
                    if(token!==previewSerial||!d.open)return;
                    previewImage.src=state.sandbox.canvas.toDataURL();previewImage.hidden=false;
                } catch(e) {if(token===previewSerial)d.querySelector('output').textContent=e.message;}
                finally {if(state)this.app._disposeSvgAfricanBuilderMotionSandbox(state);}
            };
            viewSelect.onchange=showPreview;
            d.addEventListener('input',e=>{if(e.target.closest('.rc-module-preview'))return;++previewSerial;prepared=null;preparedKey='';previewImage.hidden=true;previewImage.removeAttribute('src');viewSelect.replaceChildren();d.querySelector('output').textContent='Selection changed.';});
            let working=false;
            preview.querySelector('button').onclick=async()=>{
                if(working)return;working=true;for(const input of d.querySelectorAll('button,input,select'))input.disabled=true;
                const status=d.querySelector('output');status.textContent='Preparing eight-view preview...';
                try{await prepare(readOptions());viewSelect.replaceChildren();for(const view of Object.keys(prepared.views))viewSelect.add(new Option(view.replaceAll('-',' '),view));await showPreview();status.textContent='Preview ready.';}
                catch(e){status.textContent=e.message;}finally{working=false;for(const input of d.querySelectorAll('button,input,select'))input.disabled=false;}
            };
            d.querySelector('.close').onclick=()=>{if(!working)d.close();};d.addEventListener('cancel',e=>{if(working)e.preventDefault();});d.onclose=()=>d.remove();
            d.querySelector('.assemble').onclick=async()=>{
                if(working)return;
                if(Object.keys(this.data.views).length&&!confirm('Assemble from the selected modules? This replaces the current workspace artwork and fitting. Saved presets and stage characters remain unchanged until Update character.'))return;
                working=true;for(const input of d.querySelectorAll('button,input,select'))input.disabled=true;
                const status=d.querySelector('output');status.textContent='Loading and fitting all eight views...';
                try{
                    const options=Object.fromEntries(['head','body','build','outfit','headFit'].map(k=>[k,d.querySelector(`[name=${k}]`).value]));options.turns=d.querySelector('[name=turns]').checked;
                    const bodyEntry=catalog.bodies.find(b=>b.id===options.body),headEntry=catalog.heads.find(h=>h.id===options.head);
                    if(!bodyEntry||!headEntry)throw new Error('Select a compatible head and body.');
                    const result=await prepare(options);result.name=this.target?this.data.name:`${headEntry.name} - ${bodyEntry.name}`;
                    this.data=result;this.view=result.views[this.view]?this.view:'front';this.role='head-neck';this.history=[];this.$('[name=name]').value=result.name;this.$('[name=consent]').checked=false;this.$('[name=consentAll]').checked=false;
                    await this.loadView();this.controls();d.close();this.status('Assembly ready. Record permission, inspect the fit and complete Quality review before adding.');
                }catch(e){status.textContent=e.message;}finally{working=false;for(const input of d.querySelectorAll('button,input,select'))input.disabled=false;}
            };
            document.body.append(d);d.showModal();
        }
        async recordConsent(sha256) {
            const res = await fetch('api/photo-consent.php', { method: 'POST', credentials: 'same-origin', signal: AbortSignal.timeout(20000), headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': global.__STAGE_USER?.csrf_token || '' }, body: JSON.stringify({ confirmed: true, version: 'photo-character-v1', sha256 }) });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.ok || data.receipt?.sha256 !== sha256 || !/^pc_[a-f0-9]{32}$/.test(data.receipt?.id || '')) throw new Error(data.error || 'Sign in to record photo consent.');
            return data.receipt;
        }
        async vision(operation) {
            this.requireConsent();
            const bitmap = await createImageBitmap(this.editor.source);
            this.worker?.terminate();
            this.worker = new Worker(new URL('js/character-vision-worker.js?v=' + encodeURIComponent(global.__appAssetVersion || ''), document.baseURI));
            const result = await new Promise((resolve, reject) => {
                const timer = setTimeout(() => { this.worker.terminate(); reject(new Error('Background removal timed out. Retry or use the mask brush.')); }, 90000);
                this.worker.onmessage = ({ data }) => { clearTimeout(timer); data.error ? reject(new Error(data.error)) : resolve(data.result); };
                this.worker.onerror = () => { clearTimeout(timer); reject(new Error('Background removal could not start.')); };
                this.worker.postMessage({ id: 1, bitmap, operation, base: new URL('assets/character-vision/', document.baseURI).href }, [bitmap]);
            });
            this.worker.terminate(); this.worker = null;
            return result;
        }
        async segment() {
            const result = await this.vision('segment');
            const m = result.mask, small = R().canvas(m.width, m.height), ctx = small.getContext('2d'), pixels = ctx.createImageData(m.width, m.height);
            for (let i = 0; i < m.values.length; i++) { pixels.data[i * 4 + 3] = Math.round(Math.max(0, Math.min(1, (m.values[i] - .15) / .7)) * 255); }
            ctx.putImageData(pixels, 0, 0);
            const mask = R().canvas(this.editor.width, this.editor.height); mask.getContext('2d').drawImage(small, 0, 0, mask.width, mask.height);
            const alpha = mask.getContext('2d').getImageData(0, 0, mask.width, mask.height).data;
            this.editor.checkpoint(); for (let i = 0; i < this.editor.mask.length; i++) this.editor.mask[i] = alpha[i * 4 + 3];
            this.editor.render(); this.draw();
        }
        async analyze() {
            const result = await this.vision('analyze');
            if (result.faces?.length !== 1 || !result.pose?.length) throw new Error('Crop to one full person with a clear face, then retry. Part outlines can also be fitted manually.');
            this.checkpoint(); R().fitLandmarks(this.data.views[this.view], result, this.view);this.tool='joints';this.$('[name=tool]').value='joints';this.$('[name=showOriginal]').checked=false; this.draw();
        }
        async doctorLayout() {
            this.requireConsent(); this.commitMask();
            const source = this.data.views[this.view];
            if (Math.abs(source.width / source.height - 1122 / 1402) > .1) throw new Error('This layout expects the supplied full front/profile doctor reference, before cropping.');
            const prepared = await R().doctorLayout(source);
            this.data.views = { ...this.data.views, ...prepared }; this.data.name = 'Doctor - photographic'; this.$('[name=name]').value = this.data.name;
            this.view = 'front'; await this.loadView();
        }
        async applyCrop() {
            this.requireConsent(); if (!this.cropBox || this.cropBox.w < .05 || this.cropBox.h < .05) throw new Error('Select a larger crop.');
            if(!confirm('Cropping resets part outlines, joints, face fitting and garment/repair layers for this view. Undo can restore them. Continue?'))return;
            this.checkpoint();
            const old = this.data.views[this.view], output = R().crop(this.editor.output, this.cropBox), original = R().crop(this.editor.source, this.cropBox);
            const v = R().defaults(output.width, output.height, this.view);
            Object.assign(v, { source: output.toDataURL(), original: original.toDataURL(), consentId: old.consentId, sha256: old.sha256 });
            this.data.views[this.view] = v; this.tool = 'outline'; this.$('[name=tool]').value = this.tool; await this.loadView();
        }
        checkpoint() {
            this.commitMask();
            const snapshot = copy(this.data.views[this.view]);
            const cached = this._viewEditors.get(this.data.views[this.view]);
            if (cached) this._viewEditors.set(snapshot, cached);
            this.history.push(snapshot);
            if (this.history.length > 10) this.history.shift();
        }
        closeContextMenu(focus=true) {
            if(!this.contextMenu)return;
            this.contextMenu.remove();this.contextMenu=null;this.updateCursor();
            if(focus&&this.dialog?.open)this.$('canvas').focus({preventScroll:true});
        }
        openContextMenu(e) {
            e.preventDefault();e.stopPropagation();this.closeContextMenu(false);
            if(this.busy||!this.editor)return;
            const rect=this.$('canvas').getBoundingClientRect(),point=this.point(e);
            const editingLayer=this.tool==='layer';
            const part=editingLayer?this.selectedLayer():!['face','crop','layer-source','joints'].includes(this.tool)?this.data.views[this.view]?.parts[this.role]:null;
            let edge=0,nearest=Infinity,insert=point,vertex=-1,vertexDistance=18;
            part?.polygon.forEach((a,i)=>{
                const b=part.polygon[(i+1)%part.polygon.length],dx=(b.x-a.x)*rect.width,dy=(b.y-a.y)*rect.height;
                const px=(point.x-a.x)*rect.width,py=(point.y-a.y)*rect.height,t=Math.max(0,Math.min(1,(px*dx+py*dy)/(dx*dx+dy*dy||1)));
                const distance=Math.hypot(px-dx*t,py-dy*t);
                if(distance<nearest){nearest=distance;edge=i;insert={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};}
                const vd=Math.hypot(px,py);if(vd<vertexDistance){vertexDistance=vd;vertex=i;}
            });
            const menu=document.createElement('div');menu.className='rc-context-menu';menu.setAttribute('role','menu');menu.setAttribute('aria-label','Image and outline actions');
            const items=[['add','plus','Add outline point',!part||part.polygon.length>=128||nearest<Infinity&&part.polygon.some(p=>Math.hypot((p.x-insert.x)*rect.width,(p.y-insert.y)*rect.height)<2)],
                ['remove','minus','Remove outline point',!part||part.polygon.length<=3||vertex<0],['erase','eraser','Erase',false],['restore','paint-brush','Restore pixels',false],['sample','crosshairs','Choose clone source',false]];
            for(const [key,icon,label,disabled] of items) {
                const button=document.createElement('button');button.type='button';button.setAttribute('role','menuitem');button.disabled=disabled||!this.hasConsent();button.innerHTML=`<i class="fas fa-${icon}" aria-hidden="true"></i> ${label}`;
                button.onclick=()=>{
                    if(this.busy||!this.hasConsent()){this.closeContextMenu();return;}
                    if(key==='add'||key==='remove') {
                        this.checkpoint();if(key==='add'){part.polygon.splice(edge+1,0,insert);this.selectedVertex=edge+1;}
                        else {part.polygon.splice(vertex,1);this.selectedVertex=-1;}
                        this.tool=editingLayer?'layer':'outline';this.$('[name=tool]').value=this.tool;
                        this.$('[name=showOriginal]').checked=false;this.controls();this.draw();
                    } else this.action('tool-'+key);
                    this.closeContextMenu();
                };menu.append(button);
            }
            menu.addEventListener('keydown',event=>{
                event.stopPropagation();const buttons=[...menu.querySelectorAll('button:not(:disabled)')],index=buttons.indexOf(document.activeElement);
                if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)) {event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;buttons[next]?.focus();}
                if(event.key==='Escape'){event.preventDefault();this.closeContextMenu();}
                if(event.key==='Tab')this.closeContextMenu(false);
            });
            this.contextMenu=menu;this.dialog.append(menu);this.updateCursor();
            const box=menu.getBoundingClientRect();menu.style.left=`${Math.max(8,Math.min(e.clientX,innerWidth-box.width-8))}px`;menu.style.top=`${Math.max(8,Math.min(e.clientY,innerHeight-box.height-8))}px`;
            menu.querySelector('button:not(:disabled)')?.focus({preventScroll:true});
        }
        point(e) { const rect = this.$('canvas').getBoundingClientRect(); return { x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)) }; }
        jointHandles() {
            const v=this.data.views[this.view];if(!v)return [];
            return R().roles.flatMap(role=>{
                if(this.data.mode==='hybrid'&&role!=='head-neck')return [];
                const p=v.parts[role],b=R().bounds(p.polygon),arm=role.includes('arm'),leg=role.includes('leg');
                const handles=[{role,key:'pivot',label:arm?'Shoulder':leg?'Hip':role==='head-neck'?'Neck':'Torso attachment',...p.pivot}];
                if(arm||leg)for(const [key,label] of [['bend',arm?'Elbow':'Knee'],['end',arm?'Wrist':'Ankle']])handles.push({role,key,label,x:b.x+R().limbCenter(p.polygon,p[key])*b.w,y:b.y+p[key]*b.h});
                return handles;
            });
        }
        cropHandles() {
            const b=this.cropBox;if(!b)return [];
            return [[0,0],[.5,0],[1,0],[1,.5],[1,1],[.5,1],[0,1],[0,.5]].map(([x,y])=>({x:b.x+x*b.w,y:b.y+y*b.h,hx:x,hy:y}));
        }
        down(e) {
            if (e.button!==0||this.busy || !this.editor || !this.hasConsent()||this.$('[name=showOriginal]').checked) return;
            const pt = this.point(e), v = this.data.views[this.view], part = this.tool==='layer'?this.selectedLayer():v.parts[this.role];
            if(!part)return;this.$('canvas').setPointerCapture(e.pointerId);
            if(this.tool==='joints') {
                const r=this.$('canvas').getBoundingClientRect();
                const hit=this.jointHandles().map(h=>({...h,d:Math.hypot((h.x-pt.x)*r.width,(h.y-pt.y)*r.height)})).filter(h=>h.d<=14).sort((a,b)=>a.d-b.d)[0];
                if(hit){this.checkpoint();this.role=hit.role;this.drag={joint:hit.key};this.controls();}
            }
            else if (this.tool === 'sample') { this.editor.sampleClone({ x: pt.x * v.width, y: pt.y * v.height }); this.tool = 'clone'; this.$('[name=tool]').value = 'clone'; }
            else if (['erase','restore','clone'].includes(this.tool)) { const started = this.editor.begin({ x: pt.x * v.width, y: pt.y * v.height }, this.tool, +this.$('[name=brush]').value, +this.$('[name=hardness]').value/100, +this.$('[name=brushOpacity]').value); if (started !== false) this.drag = { brush: true }; else this.status('Select a clone source first.', true); }
            else if(this.tool==='crop') {
                const b=this.cropBox,r=this.$('canvas').getBoundingClientRect();
                const handle=this.cropHandles().find(p=>Math.abs(p.x-pt.x)*r.width<=12&&Math.abs(p.y-pt.y)*r.height<=12);
                if(handle)this.drag={crop:'resize',handle,start:pt,bounds:{...b}};
                else if(b&&pt.x>=b.x&&pt.x<=b.x+b.w&&pt.y>=b.y&&pt.y<=b.y+b.h)this.drag={crop:'move',start:pt,bounds:{...b}};
                else this.drag={start:pt,box:true};
            }
            else if (this.tool === 'face' || this.tool==='layer-source') {
                if(this.tool==='layer-source'&&this.selectedLayer()?.kind!=='repair')return;
                this.checkpoint(); this.drag = { start: pt, box: true };
            }
            else {
                const points = this.tool==='layer'?part.polygon:[...part.polygon, part.pivot];
                let index = -1, distance = .045;
                points.forEach((p, i) => { const d = Math.hypot((p.x - pt.x) * v.width / v.height, p.y - pt.y); if (d < distance) { distance = d; index = i; } });
                if (index >= 0) { this.checkpoint(); this.drag = { index }; this.selectedVertex = index; }
            }
            this.draw();
        }
        move(e) {
            this.pointerPosition=e.pointerType==='touch'?null:{x:e.clientX,y:e.clientY};this.updateCursor();
            if (!this.drag) return; const pt = this.point(e), v = this.data.views[this.view];
            if(this.drag.joint) {
                const p=v.parts[this.role],b=R().bounds(p.polygon),key=this.drag.joint;
                if(key==='pivot')p.pivot=pt;
                else {const t=(pt.y-b.y)/b.h;p[key]=key==='bend'?Math.max(.1,Math.min(.9,p.end-.02,t)):Math.max(.4,p.bend+.02,Math.min(.99,t));}
                this.controls();
            }
            else if (this.drag.brush) this.editor.move({ x: pt.x * v.width, y: pt.y * v.height });
            else if(this.drag.crop) {
                const {bounds:b,start,handle}=this.drag,clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
                if(this.drag.crop==='move')this.cropBox={...b,x:clamp(b.x+pt.x-start.x,0,1-b.w),y:clamp(b.y+pt.y-start.y,0,1-b.h)};
                else {
                    let left=b.x,right=b.x+b.w,top=b.y,bottom=b.y+b.h;
                    if(handle.hx===0)left=clamp(pt.x,0,right-.05);if(handle.hx===1)right=clamp(pt.x,left+.05,1);
                    if(handle.hy===0)top=clamp(pt.y,0,bottom-.05);if(handle.hy===1)bottom=clamp(pt.y,top+.05,1);
                    this.cropBox={x:left,y:top,w:right-left,h:bottom-top};
                }
            }
            else if (this.drag.box) {
                const s = this.drag.start, b = { x: Math.min(s.x, pt.x), y: Math.min(s.y, pt.y), w: Math.abs(s.x - pt.x), h: Math.abs(s.y - pt.y) };
                if (this.tool === 'crop') this.cropBox = b;
                else if(this.tool==='layer-source')this.selectedLayer().sourceRect=b;
                else v.face[this.$('[name=feature]').value] = b;
            } else { const p = this.tool==='layer'?this.selectedLayer():v.parts[this.role];if(!p)return; if (this.tool!=='layer' && this.drag.index === p.polygon.length) p.pivot = pt; else p.polygon[this.drag.index] = pt; }
            this.draw();
        }
        up() { if (this.drag?.brush) this.editor.end(); this.drag = null; this.controls(); }
        draw() {
            const c = this.$('canvas'), v = this.data.views[this.view], ctx = c.getContext('2d');
            c.width = v?.width || 600; c.height = v?.height || 800;
            c.style.width = `${Math.round(c.width / c.height * 680 * this.zoom)}px`; c.style.height = `${680 * this.zoom}px`;
            this.$('.rc-zoom').textContent = `${Math.round(this.zoom * 100)}%`;
            this.updateCursor();
            if (!v || !this.editor) return;
            ctx.drawImage(this.$('[name=showOriginal]').checked?this.editor.source:this.editor.output, 0, 0);
            if(this.$('[name=showOriginal]').checked)return;
            if(this.data.mode!=='hybrid') {
                for(const layer of v.layers || [])if(layer.extract&&layer.kind!=='repair') {
                    ctx.save();ctx.globalCompositeOperation='destination-out';ctx.beginPath();layer.polygon.forEach((p,i)=>ctx[i?'lineTo':'moveTo'](p.x*c.width,p.y*c.height));ctx.closePath();ctx.fill();ctx.restore();
                }
                for(const layer of R().orderedLayers(v)) {
                if(!layer.visible)continue;
                const b=R().bounds(layer.polygon),patch=R().layerCanvas(this.editor.output,layer),paint=patch.getContext('2d');
                paint.filter='none';paint.globalCompositeOperation='source-atop';paint.globalAlpha=layer.tintStrength||0;paint.fillStyle=layer.tint;paint.fillRect(0,0,patch.width,patch.height);
                ctx.drawImage(patch,b.x*c.width,b.y*c.height,b.w*c.width,b.h*c.height);
                }
            }
            ctx.lineWidth = Math.max(1.5, c.height / 500); ctx.strokeStyle = '#0eada3'; ctx.fillStyle = '#0eada3';
            const rectangle = b => ctx.strokeRect(b.x * c.width, b.y * c.height, b.w * c.width, b.h * c.height);
            if(this.tool==='joints') {
                const scale=c.width/this.$('canvas').getBoundingClientRect().width,handles=this.jointHandles();
                for(const role of R().roles){const list=handles.filter(h=>h.role===role);if(!list.length)continue;
                    ctx.strokeStyle=role===this.role?'#ffd166':'#73dbd3';ctx.lineWidth=2*scale;ctx.beginPath();list.forEach((h,i)=>ctx[i?'lineTo':'moveTo'](h.x*c.width,h.y*c.height));ctx.stroke();
                    for(const h of list){ctx.fillStyle=role===this.role?'#ffd166':'#73dbd3';ctx.beginPath();ctx.arc(h.x*c.width,h.y*c.height,6*scale,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#111';ctx.stroke();
                        if(role===this.role){ctx.font=`${12*scale}px sans-serif`;const w=ctx.measureText(h.label).width,x=Math.max(0,Math.min(c.width-w-8*scale,h.x*c.width+10*scale)),y=Math.max(14*scale,h.y*c.height);ctx.fillStyle='#20222b';ctx.fillRect(x,y-13*scale,w+8*scale,18*scale);ctx.fillStyle='#fff';ctx.fillText(h.label,x+4*scale,y);}
                    }
                }
            }
            else if (this.tool === 'crop' && this.cropBox) {
                const b=this.cropBox,x=b.x*c.width,y=b.y*c.height,w=b.w*c.width,h=b.h*c.height;
                const scale=c.width/this.$('canvas').getBoundingClientRect().width;
                ctx.fillStyle='#0008';ctx.beginPath();ctx.rect(0,0,c.width,c.height);ctx.rect(x,y,w,h);ctx.fill('evenodd');
                ctx.strokeStyle='#fff';ctx.lineWidth=2*scale;rectangle(b);
                ctx.lineWidth=scale;ctx.strokeStyle='#ffffff80';ctx.beginPath();
                for(const t of [1/3,2/3]){ctx.moveTo(x+w*t,y);ctx.lineTo(x+w*t,y+h);ctx.moveTo(x,y+h*t);ctx.lineTo(x+w,y+h*t);}ctx.stroke();
                for(const p of this.cropHandles()){ctx.fillStyle='#fff';ctx.strokeStyle='#151515';ctx.fillRect(p.x*c.width-5*scale,p.y*c.height-5*scale,10*scale,10*scale);ctx.strokeRect(p.x*c.width-5*scale,p.y*c.height-5*scale,10*scale,10*scale);}
            }
            else if(this.tool==='layer-source'&&this.selectedLayer()?.sourceRect) {ctx.strokeStyle='#efb13b';rectangle(this.selectedLayer().sourceRect);}
            else if (this.tool === 'face') { for (const [key, b] of Object.entries(v.face)) { ctx.strokeStyle = key === this.$('[name=feature]').value ? '#efb13b' : '#0eada3'; rectangle(b); } }
            else if (this.tool === 'outline' || this.tool==='layer') {
                const p = this.tool==='layer'?this.selectedLayer():v.parts[this.role];if(!p)return;
                ctx.beginPath(); p.polygon.forEach((pt, i) => ctx[i ? 'lineTo' : 'moveTo'](pt.x * c.width, pt.y * c.height)); ctx.closePath(); ctx.stroke();
                for (const pt of p.polygon) ctx.fillRect(pt.x * c.width - 4, pt.y * c.height - 4, 8, 8);
                if(p.pivot){ctx.fillStyle = '#efb13b'; ctx.beginPath(); ctx.arc(p.pivot.x * c.width, p.pivot.y * c.height, 7, 0, Math.PI * 2); ctx.fill();}
            }
        }
        async qualityReview() {
            this.commitMask();
            const entries=Object.entries(this.data.views);
            if (!entries.length) throw new Error('Add artwork first.');
            const d=document.createElement('dialog'); d.className='rc-ai-dialog';
            d.innerHTML='<h2>Artwork and rig review</h2><section></section><label><input type="checkbox">I checked the outlines, face regions, attachment points and inferred details.</label><output role="status"></output><button class="inspect">Inspect current view</button><button class="approve">Confirm review</button><button class="close">Close</button>';
            const reports=[];
            for(const [view,v] of entries) {
                const report=await R().quality(v,view); reports.push({view,v,...report});
                const heading=document.createElement('h3'); heading.textContent=view.replaceAll('-',' '); d.querySelector('section').append(heading);
                const list=document.createElement('ul');
                for(const issue of report.issues.length?report.issues:[{severity:'pass',message:'Geometry and image-edge checks passed.'}]) {
                    const li=document.createElement('li'); li.textContent=`${issue.severity}: ${issue.message}`;
                    if (issue.severity !== 'pass') {
                        const button=document.createElement('button');button.textContent='Adjust';
                        button.onclick=async()=>{
                            this.commitMask();this.view=view;
                            const role=issue.role || R().roles.find(key=>issue.message.includes(R().labels[key]));
                            if(role)this.role=role;
                            this.tool=/attachment|joint|bend/i.test(issue.message)?'joints':/face|mouth|eye/i.test(issue.message)?'face':'outline';
                            this.$('[name=tool]').value=this.tool;
                            await this.loadView();this.controls();d.close();
                        };li.append(' ',button);
                    }
                    list.append(li);
                }
                d.querySelector('section').append(list);
            }
            if (entries.length > 1) {
                const heading=document.createElement('h3'); heading.textContent='View alignment';
                const list=document.createElement('ul'), alignment=R().viewAlignment(this.data);
                const reference=entries.some(([view])=>view==='front')?'front':entries[0][0];
                for (const issue of alignment.length ? alignment : [{severity:'pass',message:'Relative proportions and attachment heights match across available views.'}]) {
                    const li=document.createElement('li'); li.textContent=`${issue.severity}: ${issue.message}`;
                    if (issue.role) {
                        const actions=document.createElement('span'); actions.className='rc-review-actions';
                        for (const [view,icon,label] of [[issue.view,'pen','Adjust'],[reference,'eye','Reference']]) {
                            const button=document.createElement('button'); button.type='button';
                            button.title=`${label}: ${view.replaceAll('-', ' ')} - ${R().labels[issue.role]}`;
                            button.setAttribute('aria-label',button.title); button.innerHTML=`<i class="fas fa-${icon}" aria-hidden="true"></i>`;
                            button.onclick=()=>{
                                if(this.busy)return;
                                d.close();
                                this.run('Opening part...',async()=>{
                                    this.commitMask();
                                    const changed=view!==this.view;
                                    this.view=view;this.role=issue.role;this.tool='outline';this.drag=null;
                                    this.$('[name=tool]').value='outline';
                                    if(changed){this.$('[name=consent]').checked=false;await this.loadView();}
                                    else this.draw();
                                }).then(()=>{
                                    const part=this.$('[name=part]');part.focus();part.scrollIntoView({block:'nearest'});
                                });
                            };
                            actions.append(button);
                        }
                        li.append(actions);
                    }
                    list.append(li);
                }
                d.querySelector('section').append(heading,list);
            }
            d.querySelector('.approve').disabled=reports.some(r=>r.issues.some(i=>i.severity==='error'));
            d.querySelector('.inspect').onclick=async()=>{try{await this.prepare();await this.inspect();}catch(e){d.querySelector('output').textContent=e.message;}};
            d.querySelector('.approve').onclick=async()=> {
                if(!d.querySelector('input').checked) { d.querySelector('output').textContent='Confirm your visual review first.'; return; }
                for(const report of reports) {
                    if(await R().fingerprint(report.v)!==report.fingerprint) { d.querySelector('output').textContent='Artwork changed. Reopen this review.'; return; }
                    report.v.qualityReview={fingerprint:report.fingerprint,reviewedAt:new Date().toISOString()};
                }
                this.status('Review recorded for the current artwork and rig.'); d.close();
            };
            d.querySelector('.close').onclick=()=>d.close(); d.onclose=()=>d.remove(); document.body.append(d); d.showModal();
        }
        async prepare(requireReview = false) {
            this.requireConsent(); this.commitMask();
            for (const [key, v] of Object.entries(this.data.views)) {
                if (!/^pc_[a-f0-9]{32}$/.test(v.consentId || '')) throw new Error(`Record permission for ${key} first.`);
                const report=await R().quality(v,key), errors=report.issues.filter(issue=>issue.severity==='error');
                if (errors.length) throw new Error(`${key.replaceAll('-', ' ')}: ${errors.map(issue=>issue.message).join(' ')}`);
                if (requireReview && (v.generation || this.data.provenance?.kind === 'generated') && v.qualityReview?.fingerprint !== await R().fingerprint(v)) throw new Error(`Complete Quality review for ${key} before saving or adding generated artwork.`);
            }
            for (const [key,v] of Object.entries(this.data.views)) await R().compile(v,key);
            this.data.revision = Date.now().toString(36);
            if (this.data.mode === 'hybrid') this.data.hybrid.body = R().bodySettings(this.characterConfig());
            const validated = R().normalize(this.data); if (!validated) throw new Error('Package is incomplete or too large. Use smaller source images.');
        }
        async import(file) {
            if (!file) return; if (file.size > 32e6) throw new Error('Package exceeds 32 MB.');
            const data = R().normalize(JSON.parse(await file.text())); if (!data) throw new Error('Invalid realistic character package.');
            this.data = data; this.view = Object.keys(data.views)[0]; this.$('[name=name]').value = data.name; this.target = null; await this.loadView();
        }
        download() {
            const url = URL.createObjectURL(new Blob([JSON.stringify(R().normalize(this.data))], { type: 'application/json' }));
            const a = document.createElement('a'); a.href = url; a.download = `${this.data.name.replace(/[^a-z0-9_-]/gi, '_')}.realistic`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 3000);
        }
        characterConfig(view = this.view) {
            const config = R().config(this.data, view), previous = this.target?.root?._svgCharacterConfig;
            if (config._realisticCharacter.mode === 'hybrid' && previous?._realisticCharacter?.mode === 'hybrid' && previous.preset === this.data.hybrid.preset) {
                return {...copy(previous), name:config.name, _realisticCharacter:config._realisticCharacter,
                    view:config.view,sideFacing:config.sideFacing,headwear:config.headwear,
                    styling:{...copy(previous.styling),view:config.view,sideFacing:config.sideFacing,headwear:config.headwear}};
            }
            return config;
        }
        async createAssemblyPreview(config) {
            const normalized=SvgAfricanCharacterCatalog.normalizeConfig(config);
            const assetId=this.app._resolveSvgAfricanAuthoredAssetId(normalized);
            if(assetId)await global.SvgAfricanAuthoredArtworkLoader?.ensureLoaded({assetId,reason:'realistic-assembly'});
            const state={sandbox:null};
            try {
                state.sandbox=this.app._createSvgAfricanBuilderMotionSandbox(state,{config:normalized});
                if(!state.sandbox||!await this.app._waitForSvgAfricanBuilderMotionImages(state.sandbox,15000))throw new Error('Character artwork could not be loaded.');
                const s=state.sandbox;s.manager._resolvePins();
                s.stageBounds=this.app._getSvgAfricanBuilderMotionBounds(s.manager.objects);
                s.canvas=document.createElement('canvas');s.canvas.width=400;s.canvas.height=700;
                s.canvas.style.cssText='position:fixed;left:-10000px;width:400px;height:700px';
                document.body.append(s.canvas);s.pixelRatio=1;s.ready=true;
                s.targetBounds={minX:16,minY:16,maxX:384,maxY:684};
                return state;
            } catch(e) {this.app._disposeSvgAfricanBuilderMotionSandbox(state);throw e;}
        }
        async drawAssemblyPreview(state,faceState={},closeup=false) {
            const s=state.sandbox,head=s.armature.parts['head-neck']?.obj;
            const faceKey=JSON.stringify(faceState);
            if(head&&state.faceKey!==faceKey) {
                const cfg=head._svgCharacterConfig,asset=SvgAfricanPremiumAssets.resolveAssetForConfig(cfg);
                const src=SvgAfricanPremiumAssets.renderPartDataUrl(asset.id,'head-neck',cfg,'assembly',{faceState});
                const image=new Image();image.src=src;await image.decode();
                if(s.disposed)return;
                head.imageSrc=src;head.imageElement=image;state.faceKey=faceKey;
            }
            s.stageBounds=this.app._getSvgAfricanBuilderMotionBounds(closeup&&head?[head]:s.manager.objects);
            this.app._renderSvgAfricanBuilderMotionSandbox(s);
        }
        async inspect() {
            const d = document.createElement('dialog'); d.className = 'rc-presets rc-inspect';
            d.setAttribute('aria-label', 'Assembled artwork');
            d.innerHTML = '<header><h3>Assembled artwork</h3><button class="rc-inspect-close" aria-label="Close" title="Close"><i class="fas fa-times"></i></button></header><section class="rc-fitting-layout"><aside><div class="rc-fitting-controls"></div><label>Mouth opening<input name="previewMouth" type="range" min="0" max="1" step=".02" value="0"></label></aside><div class="rc-fitting-viewport"><div class="rc-fitting-frame"><div class="rc-inspect-image"></div></div></div></section><output role="status" aria-live="polite"></output>';
            const controls = d.querySelector('.rc-fitting-controls'), host = d.querySelector('.rc-inspect-image');
            const facePanel=document.createElement('fieldset');facePanel.className='rc-face-preview';
            facePanel.innerHTML='<legend>Face test</legend><label>View<select name="previewView"></select></label>'+[['previewBlink','Blink',0,1],['previewGazeX','Look left / right',-1,1],['previewGazeY','Look up / down',-1,1],['previewTurn','Head turn',-3,3]].map(([name,label,min,max])=>`<label>${label}<input name="${name}" type="range" min="${min}" max="${max}" step=".05" value="0"></label>`).join('')+'<div class="rc-pair"><button type="button" class="rc-face-play" aria-label="Play speaking test" title="Play speaking test" aria-pressed="false"><i class="fas fa-play"></i></button><button type="button" class="rc-face-reset" aria-label="Reset face test" title="Reset face test"><i class="fas fa-undo"></i></button></div>';
            d.querySelector('aside').append(facePanel);
            facePanel.querySelector('legend').insertAdjacentHTML('afterend','<label><input name="previewCloseup" type="checkbox">Face close-up</label>');
            for(const key of Object.keys(this.data.views))facePanel.querySelector('select').add(new Option(key.replaceAll('-',' '),key));
            facePanel.querySelector('select').value=this.view;
            const turn=facePanel.querySelector('[name=previewTurn]'),play=facePanel.querySelector('.rc-face-play');
            const syncTurn=()=>{const view=facePanel.querySelector('select').value;turn.disabled=!(this.data.modules?.turns&&this.data.mode==='photographic');turn.min=view.startsWith('side')?'0':view.includes('3q')?'-1':'-3';turn.max=view.includes('3q')?'1':'3';turn.value='0';};syncTurn();
            const initial = copy(this.data.hybrid), hybrid = this.data.mode === 'hybrid';
            if (hybrid) {
                for (const label of this.$('.rc-hybrid').querySelectorAll('label')) controls.append(label.cloneNode(true));
                const reset = document.createElement('button'); reset.type = 'button'; reset.title = 'Reset fitting changes'; reset.setAttribute('aria-label', reset.title); reset.className = 'rc-fitting-reset'; reset.innerHTML = '<i class="fas fa-undo"></i>';
                reset.onclick = () => { this.data.hybrid = copy(initial); sync(); schedule(); }; controls.append(reset);
            } else {
                for(const name of ['headScale','neckLift','widthScale','heightScale'])controls.append(this.$(`[name=${name}]`).closest('label').cloneNode(true));
            }
            const sync = () => {
                for (const input of controls.querySelectorAll('input,select')) {
                    input.disabled = false;
                    const original = this.$(`[name="${input.name}"]`);
                    const key = {bodyPreset:'preset',hybridSkin:'skin',hybridHeadWidth:'headWidth',hybridHeadY:'headY',hybridNeckWidth:'neckWidth'}[input.name];
                    input.value = key ? this.data.hybrid[key] : input.name.startsWith('hybridHand-') ? this.data.hybrid.hands[input.name.split('-')[1]] : original.value;
                    input.closest('label').hidden=false;
                    if(input.name==='neckLift')input.disabled=!this.data.views[facePanel.querySelector('select').value]?.parts['head-neck']?.sourceImage;
                }
            };
            let serial = 0, timer, playing=false, demoTimer, demoStart=0, rendering=false, rerender=false, cachedKey='', cachedAsset=null, assembly=null;
            const stopDemo=()=>{playing=false;clearTimeout(demoTimer);play.setAttribute('aria-pressed','false');play.setAttribute('aria-label','Play speaking test');play.title='Play speaking test';play.innerHTML='<i class="fas fa-play"></i>';};
            const render = async () => {
                if(!d.open)return;
                if(rendering){rerender=true;return;}
                rendering=true;
                const request = ++serial;
                try {
                    const faceState={mouthOpen:+d.querySelector('[name=previewMouth]').value,blink:+d.querySelector('[name=previewBlink]').value,gazeX:+d.querySelector('[name=previewGazeX]').value,gazeY:+d.querySelector('[name=previewGazeY]').value,frontHeadYaw:turn.disabled?0:+turn.value,smile:0};
                    const closeup=d.querySelector('[name=previewCloseup]').checked;
                    const cacheKey=JSON.stringify([facePanel.querySelector('select').value,closeup,this.data.hybrid,this.data.headScale,this.data.neckLift,this.data.widthScale,this.data.heightScale]);
                    if(!closeup) {
                        if(cacheKey!==cachedKey||!assembly) {
                            if(assembly)this.app._disposeSvgAfricanBuilderMotionSandbox(assembly);
                            assembly=await this.createAssemblyPreview(this.characterConfig(facePanel.querySelector('select').value));
                            if(request!==serial||!d.open){this.app._disposeSvgAfricanBuilderMotionSandbox(assembly);assembly=null;return;}
                            host.replaceChildren(assembly.sandbox.canvas);cachedKey=cacheKey;
                        }
                        await this.drawAssemblyPreview(assembly,faceState);
                        const width=Math.min(400,Math.max(1,d.querySelector('.rc-fitting-viewport').clientWidth-16));
                        assembly.sandbox.canvas.style.cssText=`display:block;width:${width}px;height:${width*1.75}px`;
                        host.style.cssText=`width:${width}px;height:${width*1.75}px`;
                        d.querySelector('.rc-fitting-frame').style.cssText=host.style.cssText;
                        d.querySelector('output').textContent='';return;
                    }
                    if(assembly){this.app._disposeSvgAfricanBuilderMotionSandbox(assembly);assembly=null;cachedKey='';}
                    if(cacheKey!==cachedKey) {
                        const cfg=this.characterConfig(facePanel.querySelector('select').value),asset=SvgAfricanPremiumAssets.resolveAssetForConfig(cfg),images=[];
                        for(const key of closeup?['head-neck']:asset.order) {
                            let node;
                            if(key==='head-neck') {
                                const raw=SvgAfricanPremiumAssets.renderPartSvg(asset.id,key,cfg,'inspect',{faceState});
                                node=document.importNode(new DOMParser().parseFromString(raw,'image/svg+xml').documentElement,true);
                                node.setAttribute('aria-label','Character face preview');
                            } else {
                                node=new Image();node.alt='';node.src=SvgAfricanPremiumAssets.renderPartDataUrl(asset.id,key,cfg,'inspect');await node.decode();
                            }
                            node.dataset.part=key;images.push(node);
                            if(request!==serial||!d.open)return;
                        }
                        host.replaceChildren(...images);cachedAsset=asset;cachedKey=cacheKey;
                    }
                    const asset=cachedAsset,keys=closeup?['head-neck']:asset.order;
                    const parts = keys.map(key=>asset.parts[key]), x = Math.min(...(closeup?[]:[0]),...parts.map(p=>p.x)), y = Math.min(...(closeup?[]:[0]),...parts.map(p=>p.y));
                    const width = Math.max(...parts.map(p=>p.x+p.width))-x, height = Math.max(...parts.map(p=>p.y+p.height))-y;
                    for (const node of host.children) {
                        const p=asset.parts[node.dataset.part];
                        node.style.cssText=`position:absolute;left:${p.x-x}px;top:${p.y-y}px;width:${p.width}px;height:${p.height}px`;
                    }
                    SvgAfricanFaceRuntime.applyState(host.querySelector('[data-part="head-neck"]'),faceState);
                    // Replace complete frames only; stale slider renders must not overwrite newer settings.
                    if (request !== serial || !d.open) return;
                    const scale = Math.min(closeup?3:1, Math.max(1,d.querySelector('.rc-fitting-viewport').clientWidth-16)/width);
                    host.style.cssText = `width:${width}px;height:${height}px;transform:scale(${scale});transform-origin:top left`;
                    d.querySelector('.rc-fitting-frame').style.cssText = `width:${width*scale}px;height:${height*scale}px`;
                    d.querySelector('output').textContent = '';
                } catch (error) { if (request === serial && d.open) d.querySelector('output').textContent = error.message || 'Preview failed.'; }
                finally {rendering=false;if(rerender&&d.open){rerender=false;schedule();}}
            };
            const schedule = () => { ++serial; clearTimeout(timer); timer = setTimeout(render,100); };
            const tick=async()=>{
                if(!playing||!d.open)return;
                const t=(performance.now()-demoStart)/1000,phase=t%4;
                d.querySelector('[name=previewMouth]').value=phase>3.2?0:.12+.65*Math.pow(Math.sin(t*7),2);
                d.querySelector('[name=previewBlink]').value=Math.max(0,1-Math.abs(phase-2.8)/.16);
                await render();if(playing&&d.open)demoTimer=setTimeout(tick,90);
            };
            play.onclick=()=>{if(playing){stopDemo();return;}clearTimeout(timer);playing=true;demoStart=performance.now();play.setAttribute('aria-pressed','true');play.setAttribute('aria-label','Pause speaking test');play.title='Pause speaking test';play.innerHTML='<i class="fas fa-pause"></i>';tick();};
            facePanel.querySelector('.rc-face-reset').onclick=()=>{stopDemo();for(const name of ['previewMouth','previewBlink','previewGazeX','previewGazeY','previewTurn'])d.querySelector(`[name=${name}]`).value='0';schedule();};
            d.addEventListener('input', e => {
                if(e.target.name?.startsWith('preview'))stopDemo();
                if(e.target.name==='previewView')syncTurn();
                const n = e.target.name, key = {bodyPreset:'preset',hybridSkin:'skin',hybridHeadWidth:'headWidth',hybridHeadY:'headY',hybridNeckWidth:'neckWidth'}[n];
                if (key) this.data.hybrid[key] = ['preset','skin'].includes(key) ? e.target.value : +e.target.value;
                else if (n?.startsWith('hybridHand-')) this.data.hybrid.hands[n.split('-')[1]] = e.target.value;
                else if(['headScale','neckLift','widthScale','heightScale'].includes(n))this.data[n]=+e.target.value;
                schedule();
            });
            const resize = new ResizeObserver(schedule);
            d.querySelector('.rc-inspect-close').onclick = () => d.close();
            d.addEventListener('close', () => { stopDemo();++serial; clearTimeout(timer); resize.disconnect();if(assembly)this.app._disposeSvgAfricanBuilderMotionSandbox(assembly);assembly=null;host.replaceChildren();cachedAsset=null;cachedKey=''; d.remove(); this.controls(); });
            document.body.append(d); d.showModal(); sync(); resize.observe(d.querySelector('.rc-fitting-viewport')); await render();
        }
        async store(method, value) {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open('animstage-realistic-presets', 1);
                request.onupgradeneeded = () => request.result.createObjectStore('presets', { keyPath: 'id' });
                request.onerror = () => reject(request.error);
                request.onsuccess = () => {
                    const db = request.result, tx = db.transaction('presets', method === 'getAll' ? 'readonly' : 'readwrite');
                    const op = method === 'getAll' ? tx.objectStore('presets').getAll() : tx.objectStore('presets')[method](value);
                    tx.oncomplete = () => { db.close(); resolve(op.result); }; tx.onerror = () => { db.close(); reject(tx.error); };
                };
            });
        }
        async accountRequest(method='GET',body=null,id='') {
            const response=await fetch('api/realistic-character-presets.php'+(id?'?id='+encodeURIComponent(id):''),{method,credentials:'same-origin',headers:body?{'Content-Type':'application/json','X-CSRF-Token':global.__STAGE_USER?.csrf_token || ''}:{},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(60000)});
            const result=await response.json().catch(()=>null);
            if(!response.ok || !result?.ok)throw new Error(result?.error || (response.status===401?'Sign in to use account presets.':'Account presets are unavailable. Your browser presets are unchanged.'));
            return result;
        }
        confirmAccountSave() {
            const d=document.createElement('dialog');d.className='rc-ai-dialog';
            d.innerHTML='<h3>Save to your account</h3><label><input type="checkbox">I agree to upload this character package, including its source images, to my private account storage.</label><button class="confirm" disabled>Save to account</button><button class="cancel">Cancel</button>';
            d.querySelector('input').onchange=e=>{d.querySelector('.confirm').disabled=!e.target.checked;};
            d.querySelector('.cancel').onclick=()=>d.close();d.onclose=()=>d.remove();
            d.querySelector('.confirm').onclick=()=>{
                if(!d.querySelector('input').checked)return;d.close();
                this.run('Saving account preset...',async()=>{
                    await this.prepare(true);const data=R().normalize(this.data);
                    const saved=await this.accountRequest('POST',{name:this.data.name,data,confirmedPrivateStorage:true,...(this.accountPreset?.data===this.data?{id:this.accountPreset.id}:{})});
                    this.accountPreset={data:this.data,id:saved.preset.id};
                });
            };
            document.body.append(d);d.showModal();
        }
        async library() {
            if (this.gallery?.open) return;
            const d = document.createElement('dialog'); d.className = 'rc-presets rc-gallery'; this.gallery = d;
            d.setAttribute('aria-label','Realistic character library');
            d.innerHTML='<header><h2>Realistic character library</h2><button class="rc-gallery-close" title="Close" aria-label="Close"><i class="fas fa-times"></i></button></header><nav role="tablist" aria-label="Asset type"></nav><output role="status" aria-live="polite">Loading library...</output><footer><button data-source="upload"><i class="fas fa-image"></i> Upload photo</button><button data-source="import"><i class="fas fa-folder-open"></i> Import package</button><button data-source="ai-images"><i class="fas fa-magic"></i> Generate artwork (paid)</button></footer>';
            d.querySelector('footer').insertAdjacentHTML('afterbegin','<button data-source="modules"><i class="fas fa-user-cog"></i> Assemble character</button>');
            const panels={}, tabs={}, status=d.querySelector('output'), nav=d.querySelector('nav');
            const activate = key => { for(const name of Object.keys(panels)) {panels[name].hidden=name!==key;tabs[name].setAttribute('aria-selected',String(name===key));tabs[name].tabIndex=name===key?0:-1;} const filters=d.querySelector('.rc-library-filters');if(filters)filters.hidden=key!=='characters';if(key==='account')loadAccount(); };
            let accountLoading=false;
            const loadAccount=async()=>{
                if(accountLoading)return;accountLoading=true;panels.account.textContent='Loading account presets...';
                try {
                    const result=await this.accountRequest();if(!d.open)return;panels.account.replaceChildren();
                    for(const entry of result.presets || []) {
                        const row=document.createElement('article'),load=document.createElement('button'),remove=document.createElement('button');row.className='rc-saved-card';load.textContent=entry.name;remove.textContent='Delete';remove.setAttribute('aria-label',`Delete account preset ${entry.name}`);
                        load.onclick=()=>{d.close();this.run('Opening account preset...',async()=>{
                            const full=await this.accountRequest('GET',null,entry.id),data=R().normalize(full.preset.data);if(!data)throw new Error('Invalid account preset.');
                            this.data=data;this.accountPreset={data,id:entry.id};this.target=null;this.view=Object.keys(data.views)[0];this.$('[name=name]').value=data.name;this.$('[name=consent]').checked=false;await this.loadView();
                        });};
                        remove.onclick=async()=>{
                            if(!global.confirm(`Delete account preset "${entry.name}"? Browser copies will remain.`))return;
                            remove.disabled=true;
                            try{await this.accountRequest('DELETE',{id:entry.id});row.remove();if(this.accountPreset?.id===entry.id)this.accountPreset=null;if(!panels.account.children.length)panels.account.textContent='No account presets.';}catch(e){status.textContent=e.message;remove.disabled=false;}
                        };
                        row.append(load,remove);panels.account.append(row);
                    }
                    if(!panels.account.children.length)panels.account.textContent='No account presets.';
                } catch(e) {if(d.open){panels.account.textContent=e.message;const retry=document.createElement('button');retry.textContent='Retry';retry.onclick=loadAccount;panels.account.append(retry);}}
                finally{accountLoading=false;}
            };
            for(const [key,label] of [['characters','Characters'],['heads','Heads'],['presets','My presets'],['account','Account presets']]) {
                const tab=document.createElement('button'), panel=document.createElement('section');tab.textContent=label;tab.id='rc-tab-'+key;tab.setAttribute('role','tab');tab.setAttribute('aria-controls','rc-panel-'+key);
                panel.id='rc-panel-'+key;panel.className='rc-gallery-grid';panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',tab.id);panels[key]=panel;tabs[key]=tab;
                tab.onclick=()=>activate(key);nav.append(tab);d.insertBefore(panel,d.querySelector('footer'));
            }
            nav.onkeydown=e=>{const keys=Object.keys(tabs),i=keys.findIndex(k=>tabs[k]===document.activeElement);if(i<0)return;const next=e.key==='ArrowRight'?(i+1)%keys.length:e.key==='ArrowLeft'?(i+keys.length-1)%keys.length:e.key==='Home'?0:e.key==='End'?keys.length-1:-1;if(next>=0){e.preventDefault();activate(keys[next]);tabs[keys[next]].focus();}};
            activate('characters');
            const filter=document.createElement('select');filter.setAttribute('aria-label','Character artwork');
            for(const [value,label] of [['all','All artwork'],['photographic','Photographic'],['hybrid','Realistic head + editable body']])filter.add(new Option(label,value));
            const search=document.createElement('input');search.type='search';search.placeholder='Search characters';search.setAttribute('aria-label','Search realistic characters');
            const noMatches=document.createElement('p');noMatches.textContent='No matching characters.';noMatches.hidden=true;noMatches.setAttribute('role','status');panels.characters.append(noMatches);
            const viewFilter=document.createElement('select');viewFilter.setAttribute('aria-label','Available character view');
            for(const [value,label] of [['all','All views'],['eight','All eight views'],['front','Front'],['back','Back'],['side-left','Left side'],['side-right','Right side'],['front-3q-left','Front three-quarter left'],['front-3q-right','Front three-quarter right'],['back-3q-left','Back three-quarter left'],['back-3q-right','Back three-quarter right']])viewFilter.add(new Option(label,value));
            const applyFilters=()=>{const cards=[...panels.characters.querySelectorAll('[data-artwork]')];for(const card of cards){const views=(card.dataset.views||'').split(' ');card.hidden=(filter.value!=='all'&&card.dataset.artwork!==filter.value)||(viewFilter.value==='eight'?views.length!==8:viewFilter.value!=='all'&&!views.includes(viewFilter.value))||!card.textContent.toLowerCase().includes(search.value.trim().toLowerCase());}noMatches.hidden=!cards.length||cards.some(card=>!card.hidden);};
            filter.onchange=viewFilter.onchange=applyFilters;search.oninput=applyFilters;
            const filters=document.createElement('div');filters.className='rc-library-filters';filters.append(search,filter,viewFilter);d.insertBefore(filters,panels.characters);
            d.querySelector('.rc-gallery-close').onclick=()=>d.close();
            for(const button of d.querySelectorAll('[data-source]')) button.onclick=()=>{if(this.busy)return;d.close();this.action(button.dataset.source);};
            d.addEventListener('close',()=>{d.remove();if(this.gallery===d)this.gallery=null;});document.body.append(d);d.showModal();
            let entries=[];
            try { entries=await this.store('getAll'); } catch { status.textContent='Saved presets are unavailable in this browser.'; }
            try {
                const response=await fetch('assets/realistic-characters/catalog.json',{signal:AbortSignal.timeout(15000)});
                if(!response.ok) throw new Error('Starter catalog is unavailable.');
                const catalog=await response.json();
                for(const entry of (catalog.characters || []).slice(0,60)) {
                    if(!/^[a-z0-9-]+\.realistic$/.test(entry.file)) continue;
                    for(const mode of ['characters',...(entry.mode!=='hybrid' && /^[a-z0-9-]+\.png$/.test(entry.headThumbnail || '')?['heads']:[])]) {
                    const row=document.createElement('article'), button=document.createElement('button'), label=document.createElement('span'); row.className='rc-gallery-card';
                    row.dataset.artwork=mode==='heads'||entry.mode==='hybrid'?'hybrid':'photographic';
                    row.dataset.views=(entry.views||[]).join(' ');
                    label.textContent=`${entry.name}${mode==='heads'?' - head':''} (${entry.views?.length>3?`${entry.views.length} views`:(entry.views || []).join(', ')})`;
                    const thumbnail=mode==='heads'?entry.headThumbnail:entry.thumbnail;
                    if(/^[a-z0-9-]+\.png$/.test(thumbnail || '')) { const img=document.createElement('img'); img.src='assets/realistic-characters/'+thumbnail+'?v='+encodeURIComponent(global.__appAssetVersion||''); img.alt=''; img.width=180;img.height=200;button.append(img); }
                    button.append(label);
                    button.onclick=()=>{d.close(); this.run('Opening starter character...',async()=>{
                        const data=R().normalize(await this.loadLibraryJson(entry.file)); if(!data) throw new Error('Invalid starter package.');
                        data.mode=mode==='heads'||entry.mode==='hybrid'?'hybrid':'photographic';
                        if(data.mode==='hybrid') {data.hybrid.preset=entry.bodyPreset || 'corporate-woman-premium';delete data.hybrid.body;}
                        data.name=String(entry.name+(mode==='heads'?' - head':'')).slice(0,80);
                        for(const v of Object.values(data.views)) v.consentId='';
                        this.data=data; this.target=null; this.view=Object.keys(data.views)[0]; this.$('[name=name]').value=data.name; this.$('[name=consent]').checked=false; await this.loadView();
                        if(mode==='heads') this.role='head-neck';
                        this.controls();this.draw();
                    });}; row.append(button);
                    const detail=document.createElement('small');detail.textContent=`${row.dataset.artwork==='hybrid'?'Realistic head + editable body':'Photographic'} | ${entry.status==='experimental'?'Experimental':entry.status==='fitted-front-only'?'Front fitted; other views unavailable':'Not reviewed'}`;row.append(detail);
                    if(Array.isArray(entry.limitations)&&entry.limitations.length){const details=document.createElement('details'),summary=document.createElement('summary'),list=document.createElement('ul');summary.textContent='Artwork limitations';for(const text of entry.limitations){const li=document.createElement('li');li.textContent=String(text);list.append(li);}details.append(summary,list);row.append(details);}
                    panels[mode].append(row);
                    }
                }
                if(status.textContent==='Loading library...') status.textContent='';
                applyFilters();
                for(const key of ['characters','heads']) if(!panels[key].querySelector('.rc-gallery-card')) panels[key].textContent='No starter assets available.';
            } catch(e) { status.textContent=e.message; const retry=document.createElement('button');retry.textContent='Retry library';retry.onclick=()=>{d.close();this.run('Loading library...',()=>this.library());};panels.characters.append(retry); }
            for (const entry of entries) {
                const row = document.createElement('article'), button = document.createElement('button'), remove = document.createElement('button'); row.className='rc-saved-card'; button.textContent = entry.name;
                remove.textContent = 'Delete'; remove.setAttribute('aria-label', `Delete ${entry.name}`);
                const data=R().normalize(entry.data),front=data?.views.front;
                const load = headOnly => { d.close(); this.run('Opening preset...', async () => {
                    this.data = R().normalize(entry.data); if (!this.data) throw new Error('Invalid saved package.');
                    if (headOnly) {this.data.mode='hybrid';this.data.name=`${this.data.name} - head`.slice(0,80);this.view='front';this.role='head-neck';}
                    else {this.data.id=entry.id;this.view=Object.keys(this.data.views)[0];}
                    this.target=null;this.$('[name=name]').value=this.data.name;await this.loadView();this.controls();
                }); };
                button.onclick=()=>load(false);button.disabled=!data;
                const thumbnail=typeof entry.thumbnail==='string'&&entry.thumbnail.startsWith('data:image/png;base64,')?entry.thumbnail:null;
                if (thumbnail) {const img=document.createElement('img');img.src=thumbnail;img.alt='';img.width=180;img.height=160;row.append(img);}
                let headCard;
                if (front?.parts['head-neck'].texture) {
                    headCard=document.createElement('article');headCard.className='rc-gallery-card';
                    const use=document.createElement('button'),img=document.createElement('img'),label=document.createElement('span');
                    img.src=front.parts['head-neck'].texture;img.alt='';img.width=180;img.height=200;
                    label.textContent=`${entry.name} - saved head (front)`;use.append(img,label);use.onclick=()=>load(true);headCard.append(use);panels.heads.append(headCard);
                }
                remove.onclick = async () => { try { await this.store('delete', entry.id); row.remove();headCard?.remove();if(!panels.presets.children.length)panels.presets.textContent='No saved presets in this browser.'; } catch (e) { status.textContent=e.message; } }; row.append(button, remove); panels.presets.append(row);
            }
            if (!entries.length) panels.presets.textContent='No saved presets in this browser.';
        }
    }
    global.RealisticCharacterWorkspace = RealisticCharacterWorkspace;
})(globalThis);
