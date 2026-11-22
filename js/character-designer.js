/* Prompt and photo-assisted reconstruction use the same existing SVG armature. */
(function () {
    'use strict';
    const clone = value => JSON.parse(JSON.stringify(value));
    const label = key => key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, ch => ch.toUpperCase());
    const escape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

    class CharacterDesigner {
        constructor(app) {
            this.app = app;
            this.generation = 0;
            this.previewGeneration = 0;
            this.mode = 'create';
            this.worker = null;
            this.dialog = null;
            this.photo = null;
            this.anchors = {};
        }

        selectedRig() {
            const selected = this.app.objects.getSelectedObjects?.() || [];
            if (!selected.length) return null;
            const rig = this.app.jointSystem?._detectSelectedArmature?.();
            return rig?.root?._svgCharacterConfig ? rig : null;
        }

        async ensureArtwork(config) {
            if (config.engine !== 'svg-armature-premium' && !config.assetCharacterId) return;
            const asset = globalThis.SvgAfricanPremiumAssets.resolveAssetForConfig(config);
            if (!asset) throw new Error('No compatible SVG asset is available.');
            await globalThis.SvgAfricanAuthoredArtworkLoader?.ensureLoaded({ assetId: asset.configAssetId || asset.id, reason: 'character-designer' });
        }

        open(options = {}) {
            this.close();
            this.previousFocus = document.activeElement;
            this.mode = options.mode === 'edit' ? 'edit' : 'create';
            this.target = this.mode === 'edit' ? (options.target || this.selectedRig()) : null;
            this.builderUnderneath = document.getElementById('svg-african-character-modal')?.classList.contains('hidden') === false;
            if (this.mode === 'edit' && !this.target) { Utils.showToast('Select an SVG character first.', 'warning'); return; }
            const initial = options.config || this.target?.root?._svgCharacterConfig || { preset: 'ada-lecturer-premium' };
            this.config = CharacterDesignSpec.validate(initial, options.config || this.target?.root?._svgCharacterConfig || null).config;
            this.warnings = [];
            const providerOptions = ['deepseek', 'openai'].filter(provider => this.app.ai?.hasConfiguredProvider?.(provider))
                .map(provider => `<option value="${provider}">${provider === 'openai' ? 'OpenAI' : 'DeepSeek'}</option>`).join('');
            const dialog = document.createElement('div');
            dialog.className = 'modal character-designer-modal';
            dialog.id = 'character-designer-modal';
            dialog.setAttribute('role', 'dialog');
            dialog.setAttribute('aria-modal', 'true');
            dialog.setAttribute('aria-label', 'AI Character Designer');
            dialog.innerHTML = `<div class="modal-content character-designer-content">
                <div class="modal-header"><h3><i class="fas fa-user-pen"></i> AI Character Designer</h3><button type="button" class="modal-close" data-command="close" title="Close" aria-label="Close"><i class="fas fa-times"></i></button></div>
                <div id="character-designer-notice" class="character-designer-notice" role="status" aria-live="polite" hidden><span></span><button type="button" class="btn-icon" data-command="dismiss-notice" title="Dismiss message" aria-label="Dismiss message"><i class="fas fa-times"></i></button></div>
                <div id="character-designer-operation" class="character-designer-operation" role="status" aria-live="polite" hidden><div><h4></h4><p></p><progress aria-label="Character processing"></progress></div></div>
                <div class="character-designer-workspace">
                    <section class="character-designer-media" aria-label="Character preview">
                        <div class="character-designer-toolbar"><select id="character-designer-pane" aria-label="Preview content"><option value="rig">Rig preview</option><option value="photo">Photo landmarks</option></select>
                            <button type="button" class="btn-icon" data-command="zoom-out" title="Zoom out" aria-label="Zoom out"><i class="fas fa-search-minus"></i></button>
                            <output id="character-designer-zoom" aria-label="Zoom">100%</output>
                            <button type="button" class="btn-icon" data-command="reset" title="Reset preview" aria-label="Reset preview"><i class="fas fa-arrows-to-circle"></i></button>
                            <button type="button" class="btn-icon" data-command="zoom-in" title="Zoom in" aria-label="Zoom in"><i class="fas fa-search-plus"></i></button>
                            <select id="character-designer-motion" aria-label="Preview action"><option value="idle">Idle</option><option value="reading-book">Reading</option><option value="hold-microphone">Microphone</option><option value="phone-call">Phone</option></select>
                            <select id="character-designer-face-check" aria-label="Photo face check" title="Photo face check" hidden><option value="current">Current face</option><option value="mouth">Open mouth</option><option value="blink">Blink</option><option value="left">Look left</option><option value="right">Look right</option><option value="brows">Raise brows</option></select>
                        </div>
                        <div class="character-designer-viewport"><canvas id="character-designer-preview" aria-label="Rigged character preview"></canvas><canvas id="character-designer-photo" hidden aria-label="Editable photo landmarks"></canvas></div>
                    </section>
                    <section class="character-designer-controls" aria-label="Character settings">
                        <label>Target<select id="character-designer-target"><option value="create">New character</option><option value="edit">Edit selected SVG character</option></select></label>
                        <label for="character-designer-prompt">Description</label><textarea id="character-designer-prompt" rows="4" maxlength="4000" placeholder="Female doctor, shoulder-length hair, white coat, side right"></textarea>
                        <div class="character-designer-command-row"><select id="character-designer-planner" aria-label="Planning engine"><option value="catalog">Catalog matching</option><option value="ai">Configured AI</option>${providerOptions}</select><button type="button" class="btn-sm btn-primary" data-command="generate"><i class="fas fa-wand-magic-sparkles"></i> Generate draft</button></div>
                        <details id="character-designer-personal"><summary>My photo presets</summary>
                            <label>Saved preset<select id="character-designer-personal-list"><option value="">Select a personal preset</option></select></label>
                            <div class="character-designer-command-row"><button type="button" class="btn-sm" data-command="preset-load" disabled><i class="fas fa-folder-open"></i> Load preset</button><button type="button" class="btn-icon" data-command="preset-refresh" title="Refresh personal presets" aria-label="Refresh personal presets"><i class="fas fa-rotate"></i></button><button type="button" class="btn-icon" data-command="preset-delete" disabled title="Delete personal preset" aria-label="Delete personal preset"><i class="fas fa-trash"></i></button></div>
                            <label>New preset name<input id="character-designer-personal-name" type="text" maxlength="80"></label>
                            <label class="character-designer-checkbox"><input id="character-designer-personal-consent" type="checkbox">Store photo-derived images in my private account presets.</label>
                            <button type="button" class="btn-sm" data-command="preset-save" disabled><i class="fas fa-save"></i> Save new preset</button>
                            <p id="character-designer-personal-status" role="status"></p>
                        </details>
                        <details open><summary>Photo character</summary>
                            <label for="character-designer-file">Reference photo</label><input id="character-designer-file" type="file" accept="image/png,image/jpeg,image/webp">
                            <div id="character-designer-consent" hidden><label class="character-designer-checkbox"><input type="checkbox" id="character-designer-consent-check">I have permission from the person shown (or their authorized guardian) and the rights to use this photo to create, animate, save and export a character.</label><p>Analysis stays on this device. A photo fingerprint and consent receipt are recorded on the server. Photo textures are included when the character is saved.</p><button type="button" class="btn-sm" data-command="consent"><i class="fas fa-check"></i> Record consent</button><output id="character-designer-consent-status" role="status"></output></div>
                            <label>Photo output<select id="character-designer-photo-output" disabled><option value="hybrid">Photo likeness + SVG body</option><option value="vector">Fully vectorized character</option><option value="parts">Advanced photo cutting</option><option value="preset">SVG preset approximation</option></select></label>
                            <label id="character-designer-photo-clothing-label" hidden>Clothing<select id="character-designer-photo-clothing"><option value="editable">Editable SVG clothing</option><option value="photo">Photo torso texture (front only)</option><option value="segments">Photo clothing and limbs (visible front)</option></select></label>
                            <label id="character-designer-photo-glasses-label" hidden>Glasses in photo<select id="character-designer-photo-glasses"><option value="keep">Keep photographed frames</option><option value="replace">Replace with editable frames</option><option value="remove">Remove frames (approximate)</option></select></label>
                            <label id="character-designer-photo-frame-label" hidden>Editable frame shape<select id="character-designer-photo-frame"><option value="rectangular">Rectangular</option><option value="round">Round</option></select></label>
                            <div id="character-designer-photo-readiness" role="status" aria-live="polite" hidden><strong></strong><p></p><small></small></div>
                            <label id="character-designer-quality-confirm-label" class="character-designer-checkbox" hidden><input type="checkbox" id="character-designer-quality-confirm">Continue with these photo limitations.</label>
                            <button type="button" class="btn-sm btn-primary" data-command="reconstruct" hidden><i class="fas fa-wand-magic-sparkles"></i> Reconstruct photo</button>
                            <details id="character-designer-measurements" hidden><summary>Photo measurements (pixels)</summary><dl></dl></details>
                            <label id="character-designer-clone-target-label" hidden>Parts<select id="character-designer-clone-target"><option value="face">Face</option><option value="body">Full body (front)</option></select></label>
                            <div class="character-designer-command-row"><button type="button" class="btn-sm" data-command="crop-photo" disabled><i class="fas fa-crop-simple"></i> Crop</button><button type="button" class="btn-sm" data-command="remove-background" disabled><i class="fas fa-eraser"></i> Remove background</button><button type="button" class="btn-icon" data-command="restore-photo" disabled title="Restore original photo" aria-label="Restore original photo"><i class="fas fa-clock-rotate-left"></i></button></div>
                            <button type="button" class="btn-sm" data-command="cleanup-photo" disabled><i class="fas fa-paint-brush"></i> Refine edges</button>
                            <label class="character-designer-checkbox" title="Apply gentle edge cleanup during background removal"><input type="checkbox" id="character-designer-auto-edges" checked>Automatic edge cleanup</label>
                            <div id="character-designer-cutout" hidden>
                                <div class="character-designer-command-row" role="group" aria-label="Cutout tools">
                                    <button type="button" class="btn-icon" data-command="cutout-erase" aria-label="Erase" title="Erase" aria-pressed="true"><i class="fas fa-eraser"></i></button>
                                    <button type="button" class="btn-icon" data-command="cutout-restore" aria-label="Restore" title="Restore" aria-pressed="false"><i class="fas fa-paint-brush"></i></button>
                                    <button type="button" class="btn-icon" data-command="cutout-sample" aria-label="Sample clone source" title="Sample clone source" aria-pressed="false"><i class="fas fa-bullseye"></i></button>
                                    <button type="button" class="btn-icon" data-command="cutout-clone" aria-label="Clone repair" title="Clone repair (Alt-click to sample)" aria-pressed="false"><i class="fas fa-stamp"></i></button>
                                    <button type="button" class="btn-icon" data-command="cutout-pan" aria-label="Pan photo" title="Pan photo" aria-pressed="false"><i class="fas fa-hand"></i></button>
                                    <button type="button" class="btn-icon" data-command="cutout-undo" aria-label="Undo cleanup" title="Undo cleanup"><i class="fas fa-undo"></i></button>
                                    <button type="button" class="btn-icon" data-command="cutout-redo" aria-label="Redo cleanup" title="Redo cleanup"><i class="fas fa-redo"></i></button>
                                    <button type="button" class="btn-icon" data-command="cutout-specks" aria-label="Remove small detached specks" title="Remove small detached specks"><i class="fas fa-broom"></i></button>
                                    <button type="button" class="btn-icon" data-command="cutout-compare" aria-label="Compare with original" title="Compare with original" aria-pressed="false"><i class="fas fa-circle-half-stroke"></i></button>
                                </div>
                                <label class="character-designer-slider">Brush size (px)<input id="character-designer-brush-size" type="range" min="2" max="160" value="40"><output>40</output></label>
                                <label class="character-designer-slider">Hardness (%)<input id="character-designer-brush-hardness" type="range" min="0" max="100" value="65"><output>65</output></label>
                                <label class="character-designer-slider" id="character-designer-clone-settings" hidden>Clone opacity (%)<input id="character-designer-clone-opacity" type="range" min="1" max="100" value="70"><output>70</output></label>
                                <label class="character-designer-slider">Edge cleanup (%)<input type="range" data-cutout-edge="cleanup" min="0" max="100" value="0"><output>0</output></label>
                                <label class="character-designer-slider">Feather (px)<input type="range" data-cutout-edge="feather" min="0" max="4" step="0.25" value="0"><output>0</output></label>
                                <label class="character-designer-slider">Edge inset (px)<input type="range" data-cutout-edge="inset" min="0" max="3" step="1" value="0"><output>0</output></label>
                                <label class="character-designer-slider">Remove color fringe (%)<input type="range" data-cutout-edge="defringe" min="0" max="100" value="0"><output>0</output></label>
                                <output id="character-designer-cutout-status" role="status"></output>
                                <div class="character-designer-command-row" role="group" aria-label="Cutout inspection background">
                                    <button type="button" class="btn-icon" data-command="cutout-checker" title="Transparency checker" aria-label="Transparency checker" aria-pressed="true"><i class="fas fa-chess-board"></i></button>
                                    <button type="button" class="character-designer-swatch" data-command="cutout-light" title="Light background" aria-label="Light background" aria-pressed="false"></button>
                                    <button type="button" class="character-designer-swatch" data-command="cutout-dark" title="Dark background" aria-label="Dark background" aria-pressed="false"></button>
                                </div>
                                <div class="character-designer-command-row"><button type="button" class="btn-sm btn-primary" data-command="cutout-apply"><i class="fas fa-check"></i> Apply cleanup</button><button type="button" class="btn-sm" data-command="cutout-cancel">Cancel</button></div>
                            </div>
                            <div id="character-designer-crop" hidden>
                                <div class="character-designer-coordinates">${['left', 'top', 'width', 'height'].map(key => `<label>${label(key)} (%)<input type="number" data-crop="${key}" min="0" max="100" step="0.1"></label>`).join('')}</div>
                                <div class="character-designer-command-row"><button type="button" class="btn-sm" data-command="apply-crop"><i class="fas fa-check"></i> Apply crop</button><button type="button" class="btn-sm" data-command="cancel-crop">Cancel</button></div>
                            </div>
                            <div class="character-designer-command-row"><button type="button" class="btn-sm" data-command="analyze" disabled><i class="fas fa-crosshairs"></i> Analyze photo</button><button type="button" class="btn-sm" data-command="fit" disabled><i class="fas fa-person-rays"></i> Fit SVG preset</button><button type="button" class="btn-icon" data-command="manual-guides" title="Reset manual landmark guides" aria-label="Reset manual landmark guides"><i class="fas fa-rotate-left"></i></button><button type="button" class="btn-icon" data-command="clear-photo" title="Remove photo" aria-label="Remove photo"><i class="fas fa-trash"></i></button></div>
                            <label for="character-designer-landmark">Landmark<select id="character-designer-landmark"></select></label>
                            <div class="character-designer-coordinates"><label>X<input type="number" id="character-designer-landmark-x" min="0" max="100" step="0.1"></label><label>Y<input type="number" id="character-designer-landmark-y" min="0" max="100" step="0.1"></label></div>
                            <span id="character-designer-detection" role="status">No photo selected</span>
                        </details>
                        <div id="character-designer-fields"></div>
                        <details><summary>Additional views (inferred)</summary><div id="character-designer-views" class="character-designer-view-list"></div></details>
                        <p id="character-designer-status" role="status" aria-live="polite"></p>
                        <ul id="character-designer-warnings" class="character-designer-warnings"></ul>
                    </section>
                </div>
                <div class="modal-footer"><span id="character-designer-create-status" role="status" aria-live="polite"></span><button type="button" class="btn btn-secondary" data-command="builder"><i class="fas fa-sliders"></i> Open in SVG Builder</button><button type="button" class="btn btn-primary" data-command="apply" aria-describedby="character-designer-create-status"><i class="fas fa-user-plus"></i> <span id="character-designer-apply-label">Create on Stage</span></button></div>
            </div>`;
            document.body.append(dialog);
            this.dialog = dialog;
            this.presetAbort = new AbortController();
            this.zoom = 1;
            this.photoZoom = 1;
            this.photoOutput = this.config._photoCharacter?.faceMode === 'vector' ? 'vector' : this.config._photoCharacter ? 'hybrid' : 'parts';
            this.$('#character-designer-photo-output').value = this.photoOutput;
            this.$('#character-designer-target').value = this.mode;
            this.$('#character-designer-prompt').value = options.prompt || '';
            this.$('#character-designer-apply-label').textContent = this.mode === 'edit' ? 'Update selected' : 'Create on Stage';
            this.renderFields();
            this.renderLandmarkList();
            this.updatePhotoControls();
            if (this.config._photoCharacter) this.$('#character-designer-photo-clothing').value = this.config._photoCharacter.clothing;
            if (this.config._photoCharacter) {
                this.$('#character-designer-photo-glasses').value = this.config._photoCharacter.glassesMode;
                this.$('#character-designer-photo-frame').value = this.config._photoCharacter.glassesStyle;
            }
            dialog.addEventListener('click', event => {
                const command = event.target.closest('[data-command]')?.dataset.command;
                if (command) this.command(command);
            });
            dialog.addEventListener('modal:escape', event => {
                if (this.cutoutEditor && !this.busy) { event.preventDefault(); this.finishPhotoCleanup(false); }
            });
            dialog.addEventListener('keydown', event => {
                if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); if (this.cutoutEditor && !this.busy) this.finishPhotoCleanup(false); else this.close(); }
                if (event.key === 'Tab') {
                    const controls = [...dialog.querySelectorAll('button,input,select,textarea,summary')].filter(el => !el.disabled && !el.closest('[inert]') && el.getClientRects().length);
                    if (!controls.length) return;
                    if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1).focus(); }
                    else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0].focus(); }
                }
            });
            this.$('#character-designer-target').addEventListener('change', () => this.changeTarget());
            this.$('#character-designer-personal-list').addEventListener('change', () => this.updatePhotoControls());
            this.$('#character-designer-personal-consent').addEventListener('change', () => this.updatePhotoControls());
            this.$('#character-designer-personal-name').addEventListener('input', () => this.updatePhotoControls());
            this.$('#character-designer-file').addEventListener('change', event => this.loadPhoto(event.target.files[0]));
            this.$('#character-designer-quality-confirm').addEventListener('change', () => this.updatePhotoControls());
            this.$('#character-designer-pane').addEventListener('change', () => this.showPane());
            this.$('#character-designer-photo-output').addEventListener('change', event => {
                this.photoOutput = event.target.value;
                this.config._photoCharacter = null;
                if (this.photoOutput === 'vector' && this.$('#character-designer-photo-glasses').value === 'keep') this.$('#character-designer-photo-glasses').value = 'remove';
                this.renderFields();
                this.updatePhotoControls();
                if (this.photoOutput === 'parts') this.showPhoto();
                else this.refreshPreview();
            });
            this.$('#character-designer-photo-clothing').addEventListener('change', event => {
                this.changePhotoClothing(event.target.value);
            });
            this.$('#character-designer-photo-glasses').addEventListener('change', () => {
                this.invalidatePhotoDraft();
                this.updatePhotoControls();
                this.showPhoto();
            });
            this.$('#character-designer-photo-frame').addEventListener('change', event => {
                if (this.config._photoCharacter) {
                    this.config._photoCharacter.glassesStyle = event.target.value;
                    this.config._photoCharacter.revision = crypto.randomUUID();
                    this.refreshPreview();
                }
            });
            this.$('#character-designer-motion').addEventListener('change', () => this.refreshPreview());
            this.$('#character-designer-face-check').addEventListener('change', () => this.refreshPreview());
            this.$('#character-designer-landmark').addEventListener('change', () => this.landmarkReadouts());
            dialog.querySelectorAll('[data-crop]').forEach(input => input.addEventListener('input', () => {
                if (!this.crop || !Number.isFinite(input.valueAsNumber)) return;
                this.crop[input.dataset.crop] = input.valueAsNumber / 100;
                this.normalizeCrop(); this.drawPhoto();
            }));
            dialog.querySelectorAll('[data-crop]').forEach(input => input.addEventListener('change', () => this.cropReadouts()));
            for (const axis of ['x', 'y']) this.$('#character-designer-landmark-' + axis).addEventListener('input', event => {
                const key = this.$('#character-designer-landmark').value;
                if (!this.anchors[key]) return;
                this.anchors[key][axis] = Math.max(0, Math.min(1, Number(event.target.value) / 100));
                this.invalidatePhotoDraft();
                this.updatePhotoControls();
                this.drawPhoto();
            });
            this.setupPhotoDrag();
            for (const input of dialog.querySelectorAll('#character-designer-cutout input')) {
                input.addEventListener('input', () => {
                    input.nextElementSibling.textContent = input.value;
                    if (input.dataset.cutoutEdge && this.cutoutEditor) {
                        this.cutoutEditor.setEdge(input.dataset.cutoutEdge, Number(input.value));
                        this.scheduleCutoutDraw(true);
                    } else this.scheduleCutoutDraw();
                });
                input.addEventListener('change', () => {
                    if (input.dataset.cutoutEdge && this.cutoutEditor) this.cutoutEditor.adjusting = false;
                });
            }
            this.resizeObserver = new ResizeObserver(() => { this.sizePreview(); this.drawPhoto(); });
            this.resizeObserver.observe(this.$('.character-designer-viewport'));
            this.refreshPreview();
            this.$('#character-designer-prompt').focus();
            this.refreshPersonalPresets();
        }

        $(selector) { return this.dialog?.querySelector(selector); }
        async personalPresetRequest(method = 'GET', body = null, id = '') {
            const url = new URL('api/photo-character-presets.php', document.baseURI);
            if (id) url.searchParams.set('id', id);
            const response = await fetch(url, { method, credentials: 'same-origin', signal: this.presetAbort?.signal,
                headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': globalThis.__STAGE_USER?.csrf_token || '' },
                ...(body ? { body: JSON.stringify(body) } : {}) });
            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.ok) throw new Error(data.error || 'Personal presets are unavailable. Sign in and retry.');
            return data;
        }

        async refreshPersonalPresets(selected = '') {
            const generation = this.generation, request = this.presetListRequest = (this.presetListRequest || 0) + 1;
            try {
                const data = await this.personalPresetRequest();
                if (!this.dialog || generation !== this.generation || request !== this.presetListRequest) return;
                const select = this.$('#character-designer-personal-list'), previous = selected || select.value;
                select.innerHTML = '<option value="">Select a personal preset</option>';
                for (const item of data.presets || []) {
                    if (/^pp_[a-f0-9]{32}$/.test(item.id)) select.add(new Option(item.name, item.id));
                }
                select.value = previous;
                this.$('#character-designer-personal-status').textContent = data.presets?.length ? '' : 'No personal photo presets saved.';
                this.updatePhotoControls();
            } catch (error) {
                if (this.dialog && generation === this.generation && request === this.presetListRequest && error.name !== 'AbortError') this.$('#character-designer-personal-status').textContent = error.message;
            }
        }

        async savePersonalPreset() {
            const blocker = this.photoCreateBlocker(true);
            if (blocker) throw new Error(blocker);
            const name = this.$('#character-designer-personal-name').value.trim();
            if (!name) throw new Error('Enter a name for this personal preset.');
            if (!this.$('#character-designer-personal-consent').checked) throw new Error('Confirm private account storage first.');
            const config = CharacterDesignSpec.validate({}, this.config).config;
            if (!config._photoCharacter) throw new Error('Reconstruct a photo character before saving a preset.');
            const generation = this.generation;
            const result = await this.personalPresetRequest('POST', { name, config, confirmedPrivateStorage: true });
            if (!this.dialog || generation !== this.generation) return;
            await this.refreshPersonalPresets(result.preset.id);
            if (this.dialog && generation === this.generation) this.$('#character-designer-personal-status').textContent = 'Saved privately to your account.';
        }

        async loadPersonalPreset() {
            const id = this.$('#character-designer-personal-list').value;
            if (!id) throw new Error('Select a personal preset.');
            const generation = this.generation;
            const { preset } = await this.personalPresetRequest('GET', null, id);
            if (!this.dialog || generation !== this.generation) return;
            const config = CharacterDesignSpec.validate({}, preset.config).config;
            if (!config._photoCharacter) throw new Error('This preset does not contain a valid photo character.');
            this.clearPhoto();
            this.config = config; this.config.name = preset.name;
            this.photoOutput = config._photoCharacter.faceMode === 'vector' ? 'vector' : 'hybrid';
            this.$('#character-designer-photo-output').value = this.photoOutput;
            this.mode = 'create'; this.target = null;
            this.$('#character-designer-target').value = 'create';
            this.$('#character-designer-personal-name').value = preset.name;
            this.$('#character-designer-personal-consent').checked = false;
            this.$('#character-designer-photo-clothing').value = config._photoCharacter.clothing;
            this.$('#character-designer-photo-glasses').value = config._photoCharacter.glassesMode;
            this.$('#character-designer-photo-frame').value = config._photoCharacter.glassesStyle;
            this.warnings = ['Photo preset loaded. Other views remain inferred SVG artwork.'];
            this.renderFields(); this.updatePhotoControls();
            this.$('#character-designer-pane').value = 'rig'; this.showPane();
            await this.refreshPreview({ throwOnError: true });
        }

        async deletePersonalPreset() {
            const select = this.$('#character-designer-personal-list'), id = select.value;
            if (!id) throw new Error('Select a personal preset.');
            if (!window.confirm('Delete personal preset "' + select.selectedOptions[0].textContent + '"? Characters already on Stage will be kept.')) return;
            const generation = this.generation;
            await this.personalPresetRequest('DELETE', { id });
            if (!this.dialog || generation !== this.generation) return;
            await this.refreshPersonalPresets();
            if (this.dialog && generation === this.generation) this.$('#character-designer-personal-status').textContent = 'Personal preset deleted.';
        }
        status(message) {
            const el = this.$('#character-designer-status'); if (el) el.textContent = message;
            const progress = this.$('#character-designer-operation');
            if (progress && !progress.hidden) progress.querySelector('p').textContent = message;
        }

        processing(title = '') {
            const overlay = this.$('#character-designer-operation');
            if (!overlay) return;
            overlay.hidden = !title;
            this.$('.character-designer-workspace').inert = !!title;
            this.$('.modal-footer').inert = !!title;
            this.$('.character-designer-workspace').setAttribute('aria-busy', String(!!title));
            if (title) {
                this.processingFocus = document.activeElement;
                this.$('#character-designer-notice').hidden = true;
                overlay.querySelector('h4').textContent = title;
                overlay.querySelector('p').textContent = 'Please wait...';
                this.$('[data-command="close"]').focus({ preventScroll: true });
            } else if (this.processingFocus?.isConnected) {
                this.processingFocus.focus({ preventScroll: true });
                this.processingFocus = null;
            }
        }

        notifyResult(message, type = 'success') {
            const notice = this.$('#character-designer-notice');
            if (!notice) return;
            notice.hidden = false;
            notice.dataset.type = type;
            notice.querySelector('span').textContent = message;
            Utils.showToast(message, type, type === 'error' ? 7000 : 4500);
        }
        showWarnings() {
            const el = this.$('#character-designer-warnings');
            if (el) el.innerHTML = [...new Set(this.warnings || [])].map(text => `<li>${escape(text)}</li>`).join('');
        }

        renderFields() {
            const schema = CharacterDesignSpec.schema();
            const fields = this.$('#character-designer-fields');
            if (!fields) return;
            const expanded = new Set([...fields.querySelectorAll('details[open]')].map(el => el.querySelector('summary').textContent));
            const selectedViews = new Set([...this.$('#character-designer-views').querySelectorAll('input:checked')].map(el => el.value));
            const optionHtml = (list, value) => list.map(item => `<option value="${escape(item.id)}"${item.id === value ? ' selected' : ''}>${escape(item.name)}</option>`).join('');
            fields.innerHTML = `<label>Preset<select data-field="preset">${optionHtml(schema.presets, this.config.preset)}</select></label>`;
            for (const group of ['identity', 'styling']) {
                const section = document.createElement('details');
                section.innerHTML = `<summary>${group === 'identity' ? 'Identity and face' : 'Clothing and view'}</summary>`;
                for (const [key, list] of Object.entries(schema[group])) {
                    if (key === 'accessories') {
                        section.insertAdjacentHTML('beforeend', `<fieldset><legend>Accessories</legend>${list.map(item => `<label class="character-designer-checkbox"><input type="checkbox" data-accessory="${escape(item.id)}"${this.config.styling.accessories?.includes(item.id) ? ' checked' : ''}>${escape(item.name)}</label>`).join('')}</fieldset>`);
                    } else section.insertAdjacentHTML('beforeend', `<label>${escape(label(key))}<select data-field="${group}.${key}">${optionHtml(list, this.config[group]?.[key])}</select></label>`);
                }
                fields.append(section);
            }
            const morphs = document.createElement('details');
            morphs.innerHTML = '<summary>Face and body adjustments</summary>';
            for (const [key, range] of Object.entries(schema.adjustments)) {
                if (['headScale', 'neckLength'].includes(key)) continue;
                const value = this.config.premiumAdjustments[key] || 0;
                morphs.insertAdjacentHTML('beforeend', `<label class="character-designer-slider">${escape(label(key))}<input type="range" data-adjustment="${escape(key)}" min="${range.min}" max="${range.max}" step="0.01" value="${value}"><output>${value.toFixed(2)}</output></label>`);
            }
            fields.append(morphs);
            const face = document.createElement('details');
            const photoFace = !!this.config._photoCharacter && (this.config.styling.view === 'front' || this.config._photoCharacter.vector?.viewMode === 'matched');
            face.innerHTML = `<summary>${photoFace ? 'Photo facial controls' : 'Expression and gaze'}</summary><label>Expression<select data-face-preset="true">${optionHtml(schema.facePresets, this.config._svgAfricanFacePreset || 'neutral')}</select></label>`;
            for (const [key, range] of Object.entries(schema.faceProperties)) {
                if (photoFace && this.config.styling.view.startsWith('back') && !['headNod', 'headTilt'].includes(key)) continue;
                if (photoFace && !['mouthOpen', 'jawOpen', 'mouthOpeningGain', 'mouthWide', 'mouthRound', 'lipPress', 'blink', 'gazeX', 'gazeY', 'browRaise', 'headNod', 'headTilt', ...(this.config._photoCharacter.vector ? ['smile', 'upperLipLift', 'lowerLipDrop'] : [])].includes(key)) continue;
                const value = this.config._svgAfricanFaceState?.[key] ?? range.defaultValue ?? 0;
                face.insertAdjacentHTML('beforeend', `<label class="character-designer-slider">${escape(label(key))}<input type="range" data-face-state="${escape(key)}" min="${range.min}" max="${range.max}" step="0.01" value="${value}"><output>${Number(value).toFixed(2)}</output></label>`);
            }
            fields.append(face);
            if (this.config._photoCharacter) {
                const photo = this.config._photoCharacter, appearance = PhotoCharacterRig.appearanceFor(photo);
                const hair = document.createElement('details');
                hair.innerHTML = '<summary>Hair and headwear</summary>';
                hair.insertAdjacentHTML('beforeend', `<output>${appearance.suggestedHair ? `Suggested style: ${label(appearance.suggestedHair)} (approximate)` : 'No confident hair match'}</output>`);
                if (!photo.vector) hair.insertAdjacentHTML('beforeend', '<div>Front hair: original photo</div>');
                for (const [key, title, choices] of [['hairStyle', photo.vector ? 'Hairstyle' : 'Other-view hairstyle', PhotoCharacterRig.hairStyles], ['headwear', 'Headwear', PhotoCharacterRig.headwearStyles]]) {
                    hair.insertAdjacentHTML('beforeend', `<label>${title}<select data-photo-hair="${key}">${choices.map(value => `<option value="${value}"${appearance[key] === value ? ' selected' : ''}>${key === 'headwear' ? PhotoCharacterRig.headwearLabels[value] : label(value)}</option>`).join('')}</select></label>`);
                }
                for (const [key, title] of [['hairColor', photo.vector ? 'Hair color' : 'Other-view hair color'], ['headwearColor', 'Headwear color']]) hair.insertAdjacentHTML('beforeend', `<label class="character-designer-color">${title}<input type="color" data-photo-hair="${key}" value="${appearance[key]}"></label>`);
                hair.insertAdjacentHTML('beforeend', `<label class="character-designer-slider">${photo.vector ? 'Hair volume' : 'Other-view hair volume'}<input type="range" data-photo-hair="hairVolume" min="0.7" max="1.4" step="0.01" value="${appearance.hairVolume}"><output>${appearance.hairVolume.toFixed(2)}</output></label>`);
                if (appearance.suggestedHair) hair.insertAdjacentHTML('beforeend', '<button type="button" class="btn-icon" data-command="restore-hair-suggestion" title="Use suggested hairstyle" aria-label="Use suggested hairstyle"><i class="fas fa-rotate-left"></i></button>');
                fields.append(hair);
            }
            if (photoFace && this.config.styling.view.startsWith('back')) face.querySelector('[data-face-preset]').closest('label').hidden = true;
            if (this.config._photoCharacter && (this.config.styling.view === 'front' || this.config._photoCharacter.vector)) {
                const fitting = document.createElement('details');
                const photo = this.config._photoCharacter, values = PhotoCharacterRig.normalizeFitting(photo.fitting);
                fitting.innerHTML = '<summary>Photo face fitting</summary>';
                for (const [key, range] of Object.entries(PhotoCharacterRig.fittingControls)) {
                    if (key.startsWith('frame') && (photo.glassesMode === 'keep' || !this.config.styling.accessories?.includes('glasses'))) continue;
                    fitting.insertAdjacentHTML('beforeend', `<label class="character-designer-slider">${range.label}<input type="range" data-photo-fit="${key}" min="${range.min}" max="${range.max}" step="0.01" value="${values[key]}"><output>${values[key].toFixed(2)}</output></label>`);
                }
                fitting.insertAdjacentHTML('beforeend', `<label class="character-designer-color">Iris color<input type="color" data-photo-fit="irisColor" value="${values.irisColor}"></label><button type="button" class="btn-icon" data-command="reset-photo-fit" title="Reset photo face fitting" aria-label="Reset photo face fitting"><i class="fas fa-rotate-left"></i></button>`);
                fields.append(fitting);
                if (photo.vector) {
                    const vector = document.createElement('details');
                    vector.innerHTML = '<summary>Vector face fitting</summary>';
                    for (const [key, range] of Object.entries(PhotoCharacterRig.vectorControls).filter(([key]) => key !== 'hairVolume')) vector.insertAdjacentHTML('beforeend', `<label class="character-designer-slider">${range.label}<input type="range" data-photo-vector="${key}" min="${range.min}" max="${range.max}" step="0.01" value="${photo.vector[key]}"><output>${photo.vector[key].toFixed(2)}</output></label>`);
                    for (const [key, title, choices] of [['facialHair', 'Facial hair', PhotoCharacterRig.facialHairStyles], ['viewMode', 'Other views', ['matched', 'catalog']]]) vector.insertAdjacentHTML('beforeend', `<label>${title}<select data-photo-vector="${key}">${choices.map(value => `<option value="${value}"${photo.vector[key] === value ? ' selected' : ''}>${key === 'viewMode' ? value === 'matched' ? 'Matched vector (inferred)' : 'Catalog approximation' : label(value)}</option>`).join('')}</select></label>`);
                    vector.insertAdjacentHTML('beforeend', `<label class="character-designer-color">Lips<input type="color" data-photo-vector="lipColor" value="${photo.vector.lipColor}"></label>`);
                    vector.insertAdjacentHTML('beforeend', '<button type="button" class="btn-icon" data-command="reset-vector-fit" title="Reset vector fitting; keep colors and hairstyle" aria-label="Reset vector fitting"><i class="fas fa-rotate-left"></i></button>');
                    if (!photo.fullVector) vector.insertAdjacentHTML('beforeend', '<button type="button" class="btn-sm" data-command="vectorize-photo"><i class="fas fa-vector-square"></i> Vectorize remaining textures</button>');
                    fields.append(vector);
                }
                if (photo.fullVector && Object.keys(photo.vectorLayers || {}).length) {
                    const clothing = document.createElement('details');
                    clothing.innerHTML = '<summary>Traced clothing</summary>';
                    clothing.insertAdjacentHTML('beforeend', '<label>Clothing source<select data-photo-clothing-source><option value="editable">Catalog clothing</option><option value="photo">Traced torso (front)</option><option value="segments">Traced clothing and limbs (visible front)</option></select></label>');
                    for (const [part, shapes] of Object.entries(photo.vectorLayers)) {
                        const group = document.createElement('fieldset');
                        group.className = 'character-designer-vector-colors';
                        group.innerHTML = `<legend>${escape(label(part.replaceAll('-', ' ')))}</legend>`;
                        for (const fill of new Set(shapes.map(shape => shape.fill))) group.insertAdjacentHTML('beforeend', `<input type="color" data-photo-region-color="${fill}" data-photo-region-part="${part}" value="${fill}" title="${escape(label(part))} ${fill}" aria-label="${escape(label(part))} ${fill}">`);
                        clothing.append(group);
                    }
                    fields.append(clothing);
                }
            }
            const colors = document.createElement('details');
            colors.innerHTML = '<summary>Colors</summary>';
            if (this.config._photoCharacter) {
                const photo = this.config._photoCharacter;
                colors.insertAdjacentHTML('beforeend', `<label class="character-designer-color" title="Original photo pixels keep their photographed colors">${photo.vector ? 'Skin color' : 'Generated skin color'}<input type="color" data-photo-skin="true" value="${PhotoCharacterRig.normalize(photo).skin}"></label>`);
            }
            const palette = SvgAfricanPremiumAssets.getPalette(this.config);
            const slots = { top: 'blazer', shirt: 'blouse', tie: 'tie', bottom: 'skirt', shoes: 'shoe', glasses: 'glass', headwear: 'headwear', accent: 'accent' };
            for (const key of schema.colorOverrides) colors.insertAdjacentHTML('beforeend', `<label class="character-designer-color">${escape(label(key))}<input type="color" data-color="${key}" value="${this.config.styling.colorOverrides?.[key] || palette[slots[key]] || '#343940'}"></label>`);
            fields.append(colors);
            fields.querySelectorAll('details').forEach(el => { el.open = expanded.has(el.querySelector('summary').textContent); });
            fields.addEventListener('change', this.onFieldsChange ||= event => this.changeField(event));
            fields.addEventListener('input', this.onFieldsInput ||= event => { if (event.target.dataset.adjustment || event.target.dataset.faceState || event.target.dataset.photoFit || event.target.dataset.photoVector || event.target.dataset.photoHair || event.target.dataset.photoSkin) this.changeField(event); });
            if (this.config._photoCharacter) fields.querySelectorAll('[data-field="identity.skinTone"], [data-field="identity.hair"], [data-field="identity.hairColor"], [data-field="styling.headwear"], [data-color="headwear"], [data-adjustment="hairVolume"]').forEach(el => { el.closest('label').hidden = true; });
            const views = this.$('#character-designer-views');
            views.innerHTML = schema.styling.view.filter(item => item.id !== this.config.styling.view).map(item => `<label class="character-designer-checkbox"><input type="checkbox" value="${item.id}"${this.mode === 'edit' ? ' disabled' : selectedViews.has(item.id) ? ' checked' : ''}>${escape(item.name)}</label>`).join('');
            // Catalog face controls cannot redraw a cloned photo face.
            if (photoFace) {
                const photoIdentity = new Set(['skinTone', 'face', 'headType', 'eyes', 'nose', 'lips', 'hair', 'hairColor', 'facialHair']);
                fields.querySelectorAll('[data-field^="identity."]').forEach(el => { el.closest('label').hidden = photoIdentity.has(el.dataset.field.split('.')[1]); });
                fields.querySelector('[data-field="styling.headwear"]').closest('label').hidden = true;
                fields.querySelectorAll('[data-accessory]').forEach(el => {
                    if (el.dataset.accessory === 'earrings' || (el.dataset.accessory === 'glasses' && this.config._photoCharacter.glassesMode === 'keep')) el.closest('label').hidden = true;
                });
                const bodySliders = /^(headWidth|headHeight|neckWidth|neckHeight|torsoWidth|torsoLength|topWearLength|armLength|armWidth|handSize|legLength|legWidth|bottomWearLength|muscleDefinition|footSize|shoulderWidth|hipWidth|abdomenWidth|abdomenProjection)$/;
                fields.querySelectorAll('[data-adjustment]').forEach(el => { el.closest('label').hidden = !bodySliders.test(el.dataset.adjustment); });
            }
            this.syncPhotoClothing();
        }

        syncPhotoClothing() {
            const photo = this.config._photoCharacter;
            const available = photo ? PhotoCharacterRig.clothingAvailability(photo) : { editable: true, photo: true, segments: true };
            const vector = photo ? photo.fullVector : this.photoOutput === 'vector';
            for (const select of this.dialog.querySelectorAll('#character-designer-photo-clothing, [data-photo-clothing-source]')) {
                for (const option of select.options) {
                    option.disabled = !available[option.value];
                    if (option.value === 'editable') continue;
                    const text = vector ? option.value === 'photo' ? `${photo ? 'Traced' : 'Trace'} torso (front)` : `${photo ? 'Traced' : 'Trace'} clothing and limbs (visible front)`
                        : option.value === 'photo' ? 'Photo torso texture (front only)' : 'Photo clothing and limbs (visible front)';
                    option.textContent = text + (option.disabled ? ' - unavailable' : '');
                }
                if (photo) select.value = photo.clothing;
                select.disabled = !!this.busy || !!this.cutoutEditor;
            }
            for (const swatch of this.dialog.querySelectorAll('[data-photo-region-color]')) {
                swatch.disabled = !!this.busy || !!this.cutoutEditor || photo?.clothing === 'editable'
                    || this.config.styling.view !== 'front'
                    || (photo?.clothing === 'photo' && swatch.dataset.photoRegionPart !== 'torso');
            }
        }

        changePhotoClothing(value) {
            const photo = this.config._photoCharacter;
            if (!photo) return;
            if (this.busy || this.cutoutEditor || !PhotoCharacterRig.clothingAvailability(photo)[value]) {
                this.syncPhotoClothing();
                return;
            }
            photo.clothing = value;
            photo.revision = crypto.randomUUID();
            this.syncPhotoClothing();
            this.refreshPreview();
        }

        changeField(event) {
            const el = event.target;
            if (el.hasAttribute('data-photo-clothing-source') || el.dataset.photoRegionColor) {
                const photo = this.config._photoCharacter;
                if (!photo?.fullVector || this.busy) return;
                if (el.hasAttribute('data-photo-clothing-source')) { this.changePhotoClothing(el.value); return; }
                else {
                    if (!/^#[a-f0-9]{6}$/i.test(el.value)) return;
                    for (const shape of photo.vectorLayers[el.dataset.photoRegionPart] || []) {
                        if (shape.fill === el.dataset.photoRegionColor) shape.fill = el.value.toLowerCase();
                    }
                    el.dataset.photoRegionColor = el.value.toLowerCase();
                }
                photo.revision = crypto.randomUUID();
                clearTimeout(this.previewTimer); this.previewTimer = setTimeout(() => this.refreshPreview(), 100);
                return;
            }
            if (el.dataset.photoSkin) {
                const photo = this.config._photoCharacter;
                if (!photo || this.busy || !/^#[a-f0-9]{6}$/i.test(el.value)) return;
                photo.skin = el.value;
                photo.revision = crypto.randomUUID();
                clearTimeout(this.previewTimer); this.previewTimer = setTimeout(() => this.refreshPreview(), 100);
                return;
            }
            if (el.dataset.photoHair) {
                const photo = this.config._photoCharacter, key = el.dataset.photoHair;
                if (!photo || this.busy) return;
                const appearance = PhotoCharacterRig.appearanceFor(photo);
                const updated = PhotoCharacterRig.normalizeVector({ ...appearance, [key]: key === 'hairVolume' ? Number(el.value) : el.value,
                    ...(key === 'headwear' && appearance.headwearColor === PhotoCharacterRig.headwearColors[appearance.headwear] ? { headwearColor: PhotoCharacterRig.headwearColors[el.value] } : {}),
                    ...(key === 'hairStyle' ? { hairContour: [] } : {}) });
                photo[photo.vector ? 'vector' : 'appearance'] = updated;
                photo.revision = crypto.randomUUID();
                if (el.nextElementSibling?.tagName === 'OUTPUT') el.nextElementSibling.textContent = updated[key].toFixed(2);
                if (key === 'headwear') this.renderFields();
                clearTimeout(this.previewTimer); this.previewTimer = setTimeout(() => this.refreshPreview(), 100);
                return;
            }
            if (el.dataset.photoVector) {
                const photo = this.config._photoCharacter, key = el.dataset.photoVector;
                if (!photo?.vector || this.busy) return;
                if (key === 'skin') photo.skin = /^#[a-f0-9]{6}$/i.test(el.value) ? el.value : photo.skin;
                else photo.vector = PhotoCharacterRig.normalizeVector({ ...photo.vector, [key]: ['hairStyle', 'hairColor', 'lipColor', 'facialHair', 'headwear', 'headwearColor', 'viewMode'].includes(key) ? el.value : Number(el.value) });
                photo.revision = crypto.randomUUID();
                if (el.nextElementSibling?.tagName === 'OUTPUT') el.nextElementSibling.textContent = photo.vector[key].toFixed(2);
                if (key === 'viewMode') this.renderFields();
                clearTimeout(this.previewTimer); this.previewTimer = setTimeout(() => this.refreshPreview(), 100);
                return;
            }
            if (el.dataset.faceState || el.dataset.facePreset) this.$('#character-designer-face-check').value = 'current';
            if (el.dataset.photoFit) {
                const photo = this.config._photoCharacter;
                if (!photo || this.busy) return;
                const key = el.dataset.photoFit;
                photo.fitting = PhotoCharacterRig.normalizeFitting({ ...photo.fitting, [key]: key === 'irisColor' ? el.value : Number(el.value) });
                photo.revision = crypto.randomUUID();
                if (el.nextElementSibling?.tagName === 'OUTPUT') el.nextElementSibling.textContent = photo.fitting[key].toFixed(2);
                clearTimeout(this.previewTimer);
                this.previewTimer = setTimeout(() => this.refreshPreview(), 100);
                return;
            }
            const patch = {};
            if (el.dataset.field === 'preset') patch.preset = el.value;
            else if (el.dataset.facePreset) patch.facePreset = el.value;
            else if (el.dataset.faceState) {
                patch.faceState = { [el.dataset.faceState]: Number(el.value) };
                el.nextElementSibling.textContent = Number(el.value).toFixed(2);
            }
            else if (el.dataset.field) {
                const [group, key] = el.dataset.field.split('.');
                patch[group] = { [key]: el.value };
            } else if (el.dataset.adjustment) {
                patch.premiumAdjustments = { [el.dataset.adjustment]: Number(el.value) };
                el.nextElementSibling.textContent = Number(el.value).toFixed(2);
            } else if (el.dataset.color) patch.styling = { colorOverrides: { [el.dataset.color]: el.value } };
            else if (el.dataset.accessory) patch.styling = { accessories: [...this.$('#character-designer-fields').querySelectorAll('[data-accessory]:checked')].map(item => item.dataset.accessory) };
            else return;
            const result = CharacterDesignSpec.validate(patch, this.config);
            this.config = result.config;
            if (['photo', 'segments'].includes(this.config._photoCharacter?.clothing) && (patch.preset || patch.styling?.outfit || patch.styling?.topClothing || patch.styling?.bottomClothing || patch.styling?.footwear || patch.styling?.sleeveLength || patch.styling?.fabricDesign || patch.styling?.clothingPalette || Object.keys(patch.styling?.colorOverrides || {}).some(key => ['top', 'shirt', 'tie', 'bottom', 'shoes'].includes(key)))) {
                this.config._photoCharacter.clothing = 'editable';
                this.$('#character-designer-photo-clothing').value = 'editable';
                result.warnings.push('Switched to editable SVG clothing for this clothing change.');
            }
            if (patch.preset || patch.facePreset || patch.styling?.view || el.dataset.accessory === 'glasses') this.renderFields();
            this.warnings = result.warnings;
            this.showWarnings();
            this.updatePhotoControls();
            clearTimeout(this.previewTimer);
            this.previewTimer = setTimeout(() => this.refreshPreview(), 100);
        }

        changeTarget() {
            const edit = this.$('#character-designer-target').value === 'edit';
            const target = edit ? this.selectedRig() : null;
            if (edit && !target) {
                this.$('#character-designer-target').value = this.mode;
                this.status('Select an SVG character on Stage before editing.');
                return;
            }
            this.mode = edit ? 'edit' : 'create';
            this.target = target;
            this.config = CharacterDesignSpec.validate(edit ? target.root._svgCharacterConfig : { preset: 'ada-lecturer-premium' }, edit ? target.root._svgCharacterConfig : null).config;
            this.$('#character-designer-apply-label').textContent = edit ? 'Update selected' : 'Create on Stage';
            this.renderFields();
            this.updatePhotoControls();
            this.refreshPreview();
        }

        async command(command) {
            if (command === 'close') { this.close(); return; }
            if (command === 'dismiss-notice') { this.$('#character-designer-notice').hidden = true; return; }
            if (this.busy) return;
            if (command.startsWith('cutout-')) {
                if (!this.cutoutEditor) return;
                const action = command.slice(7);
                if (action === 'apply' || action === 'cancel') this.finishPhotoCleanup(action === 'apply');
                else if (['erase', 'restore', 'pan', 'sample', 'clone'].includes(action)) this.cutoutTool = action;
                else if (['checker', 'light', 'dark'].includes(action)) this.cutoutBackground = action;
                else if (action === 'undo') this.cutoutEditor.undo();
                else if (action === 'redo') this.cutoutEditor.redo();
                else if (action === 'compare') this.cutoutCompare = !this.cutoutCompare;
                else if (action === 'specks') {
                    const removed = this.cutoutEditor.removeSpecks();
                    this.$('#character-designer-cutout-status').textContent = removed ? `Removed ${removed} speck pixels.` : 'No small detached specks found.';
                }
                this.updateCutoutControls(); this.drawPhoto(); return;
            }
            if (this.cutoutEditor && command !== 'reset' && !command.startsWith('zoom-')) {
                this.notifyResult('Apply or cancel edge cleanup first.', 'warning'); return;
            }
            if (command === 'reset-photo-fit') {
                if (!this.config._photoCharacter || this.busy) return;
                this.config._photoCharacter.fitting = PhotoCharacterRig.normalizeFitting();
                this.config._photoCharacter.revision = crypto.randomUUID();
                this.renderFields();
                await this.refreshPreview();
                return;
            }
            if (command === 'restore-hair-suggestion') {
                const photo = this.config._photoCharacter;
                if (!photo || this.busy) return;
                const appearance = PhotoCharacterRig.appearanceFor(photo);
                if (!appearance.suggestedHair) return;
                photo[photo.vector ? 'vector' : 'appearance'] = PhotoCharacterRig.normalizeVector({ ...appearance, hairStyle: appearance.suggestedHair, hairContour: [] });
                photo.revision = crypto.randomUUID();
                clearTimeout(this.previewTimer);
                this.renderFields(); await this.refreshPreview(); return;
            }
            if (command === 'reset-vector-fit') {
                const photo = this.config._photoCharacter;
                if (!photo?.vector || this.busy) return;
                clearTimeout(this.previewTimer);
                photo.vector = PhotoCharacterRig.normalizeVector({ ...photo.vector, ...Object.fromEntries(Object.entries(PhotoCharacterRig.vectorControls).map(([key, range]) => [key, range.defaultValue])) });
                photo.revision = crypto.randomUUID();
                this.renderFields(); await this.refreshPreview(); return;
            }
            if (command === 'clear-photo') { this.clearPhoto(); return; }
            if (command === 'restore-photo') { this.restorePhoto(); return; }
            if (command === 'manual-guides') {
                if (this.photo) { this.setManualAnchors(); this.drawPhoto(); this.status('Manual guides reset. Position each guide before fitting.'); }
                return;
            }
            if (command === 'reset' || command.startsWith('zoom-')) {
                if (this.$('#character-designer-pane').value === 'photo') {
                    this.zoomPhoto(command === 'reset' ? 1 : this.photoZoom + (command === 'zoom-in' ? .25 : -.25));
                    return;
                }
                this.zoom = command === 'reset' ? 1 : Math.max(0.6, Math.min(3, this.zoom + (command === 'zoom-in' ? 0.2 : -0.2)));
                this.$('#character-designer-zoom').textContent = Math.round(this.zoom * 100) + '%';
                this.sizePreview(); return;
            }
            if (this.busy) return;
            this.busy = true;
            this.updatePhotoControls();
            const current = this.generation;
            this.abortController = new AbortController();
            const messages = {
                analyze: ['Analyzing photo', 'Photo analysis complete.'],
                reconstruct: ['Reconstructing photo character', 'Photo character reconstructed.'],
                'vectorize-photo': ['Vectorizing character', 'Character textures converted to vectors.'],
                'remove-background': this.photo?.cutout ? ['Restoring background', 'Background restored.'] : ['Removing background', 'Background removed.'],
                generate: ['Generating character', 'Character draft ready.'],
                fit: ['Fitting SVG character', 'SVG character fitted.'],
                consent: ['Recording consent', 'Photo consent recorded.'],
                'preset-save': ['Saving personal preset', 'Personal photo preset saved.'],
                'preset-load': ['Loading personal preset', 'Personal photo preset loaded.'],
                apply: [this.mode === 'edit' ? 'Updating character' : 'Adding character to Stage', 'Character ready.'],
                'apply-crop': ['Cropping photo', 'Photo cropped.'],
                'cleanup-photo': ['Opening edge editor', 'Edge editor ready.'],
            };
            const feedback = messages[command];
            if (feedback) this.processing(feedback[0]);
            try {
                // Let the visible progress state paint before local canvas work.
                if (feedback) await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
                if (current !== this.generation || !this.dialog) return;
                if (command === 'preset-save') await this.savePersonalPreset();
                else if (command === 'preset-load') await this.loadPersonalPreset();
                else if (command === 'preset-delete') await this.deletePersonalPreset();
                else if (command === 'preset-refresh') await this.refreshPersonalPresets();
                else if (command === 'consent') await this.recordPhotoConsent();
                else if (command === 'reconstruct') await this.reconstructPhoto();
                else if (command === 'vectorize-photo') {
                    const source = this.config._photoCharacter;
                    const data = await PhotoCharacterRig.vectorize(source, { tracer: new AITrace(this.app.objects), signal: this.abortController.signal,
                        onProgress: ({ part, progress }) => this.status(`Vectorizing ${part.replaceAll('-', ' ')}: ${Math.round(progress * 100)}%`) });
                    if (current !== this.generation || !this.dialog || this.config._photoCharacter !== source) return;
                    this.config._photoCharacter = data;
                    this.renderFields();
                    await this.refreshPreview({ throwOnError: true });
                }
                else if (command === 'cleanup-photo') this.startPhotoCleanup();
                else if (command === 'generate') {
                    const prompt = this.$('#character-designer-prompt').value.trim();
                    if (!prompt) throw new Error('Enter a character description.');
                    this.status('Generating draft...');
                    const planner = this.$('#character-designer-planner').value;
                    const ai = planner === 'catalog' ? null : this.app.ai?.getProviderConnection(planner === 'ai' ? this.app.ai.apiProvider : planner);
                    if (planner !== 'catalog' && !ai?.apiKey && !ai?.serverConfigured) throw new Error('Select an available AI provider, or configure one in Settings.');
                    const result = await CharacterDesignSpec.promptPlan(prompt, ai, this.config, this.abortController.signal);
                    if (current !== this.generation) return;
                    this.config = result.config;
                    this.warnings = result.warnings;
                    this.renderFields();
                    await this.refreshPreview({ throwOnError: true });
                    this.status('Draft ready');
                } else if (command === 'crop-photo') {
                    if (!this.photo) return;
                    this.crop = { left: 0, top: 0, width: 1, height: 1 };
                    this.cropReadouts(); this.updatePhotoControls(); this.showPhoto();
                } else if (command === 'cancel-crop') {
                    this.crop = null; this.cropDrag = null;
                    this.updatePhotoControls(); this.drawPhoto();
                } else if (command === 'apply-crop') this.applyCrop();
                else if (command === 'remove-background') await this.removePhotoBackground();
                else if (command === 'analyze' && !this.crop) await this.analyzePhoto();
                else if (command === 'fit') {
                    this.requirePhotoConsent();
                    if (this.crop) throw new Error('Apply or cancel the crop first.');
                    if (!this.photo) throw new Error('Choose a photo first.');
                    if (this.config.engine !== 'svg-armature-premium') throw new Error('Select a premium preset for landmark-based reconstruction.');
                    const result = CharacterDesignSpec.fitPhoto(this.config, this.anchors, this.photo.data, this.analysis?.mask);
                    this.config = result.config;
                    this.config._photoCharacter = null;
                    this.photoOutput = 'preset';
                    this.$('#character-designer-photo-output').value = 'preset';
                    this.updatePhotoControls();
                    this.warnings = result.warnings;
                    this.renderFields();
                    this.$('#character-designer-pane').value = 'rig';
                    this.showPane();
                    await this.refreshPreview({ throwOnError: true });
                    this.status('Photo-fitted SVG preset ready for review');
                } else if (command === 'builder') {
                    const config = clone(this.config), target = this.target, mode = this.mode;
                    this.close();
                    this.app.openSvgAfricanCharacterLibrary({ mode, armature: target });
                    this.app.applySvgAfricanBuilderConfig(config, { preservePieceOverrides: true });
                } else if (command === 'apply') await this.apply();
                if (current === this.generation) {
                    this.showWarnings();
                    if (command === 'analyze' && this.analysis) {
                        const readiness = PhotoCharacterRig.assess(this.photo, this.anchors, this.analysis);
                        this.notifyResult(readiness.message, readiness.status === 'blocked' ? 'error' : readiness.status === 'warning' ? 'warning' : 'success');
                    } else if (feedback) this.notifyResult(feedback[1] + (command === 'reconstruct' && this.reconstructionBackgroundWarning ? ' Background cleanup needs review.' : ''), command === 'reconstruct' && this.reconstructionBackgroundWarning ? 'warning' : 'success');
                }
            } catch (error) {
                if (current === this.generation && error.name !== 'AbortError') {
                    this.status(error.message || 'Character operation failed.');
                    this.notifyResult(error.message || 'Character operation failed.', 'error');
                    if (command.startsWith('preset-')) this.$('#character-designer-personal-status').textContent = error.message;
                    if (command === 'remove-background') this.$('#character-designer-detection').textContent = error.message;
                }
            } finally { if (current === this.generation) { this.busy = false; this.processing(); this.updatePhotoControls(); } }
        }

        async refreshPreview({ throwOnError = false } = {}) {
            if (!this.dialog) return;
            if (this.photo && ['hybrid', 'vector'].includes(this.photoOutput) && !this.config._photoCharacter) { this.showPhoto(); return; }
            const generation = ++this.previewGeneration;
            const config = clone(this.config);
            if (config._photoCharacter && (config.styling.view === 'front' || config._photoCharacter.vector?.viewMode === 'matched')) {
                const check = this.$('#character-designer-face-check').value;
                const states = { mouth: { mouthOpen: .85, jawOpen: .3, lipPress: 0 }, blink: { blink: 1 }, left: { gazeX: -8 }, right: { gazeX: 8 }, brows: { browRaise: 6 } };
                config._svgAfricanFaceState = { ...config._svgAfricanFaceState, ...(states[check] || {}) };
            }
            this.status('Loading rig preview...');
            try {
                await this.ensureArtwork(config);
                if (generation !== this.previewGeneration || !this.dialog) return;
                if (this.sandbox) this.sandbox.disposed = true;
                const sandbox = this.app._createSvgAfricanBuilderMotionSandbox({}, { config });
                if (!sandbox) throw new Error('Rig preview could not be created.');
                this.sandbox = sandbox;
                sandbox.canvas = this.$('#character-designer-preview');
                sandbox.pixelRatio = Math.min(2, window.devicePixelRatio || 1);
                const ready = await this.app._waitForSvgAfricanBuilderMotionImages(sandbox, 8000);
                if (generation !== this.previewGeneration || !this.dialog) { sandbox.disposed = true; return; }
                if (!ready) throw new Error('Artwork did not finish loading. Retry the draft.');
                const action = this.$('#character-designer-motion').value;
                if (action !== 'idle') {
                    const poses = sandbox.runtime._getActiveArmaturePoseCatalog?.(sandbox.armature) || {};
                    if (poses[action]) sandbox.runtime._applyArmaturePose?.(sandbox.armature, poses[action]);
                }
                sandbox.manager._resolvePins?.();
                sandbox.stageBounds = this.app._getSvgAfricanBuilderMotionBounds(sandbox.manager.objects);
                sandbox.ready = true;
                this.sizePreview();
                this.status(config._photoCharacter && config.styling.view !== 'front' ? 'Inferred view: SVG approximation, not a photograph of the hidden side.' : 'Draft ready');
            } catch (error) { if (generation === this.previewGeneration) this.status(error.message); if (throwOnError) throw error; }
            finally {
                // Preview work and form edits can finish in either order. Derive
                // creation readiness again from the current draft, not old UI state.
                if (generation === this.previewGeneration) this.updatePhotoControls();
            }
        }

        sizePreview() {
            const viewport = this.$('.character-designer-viewport');
            const sandbox = this.sandbox;
            if (!viewport || !sandbox?.ready || this.$('#character-designer-preview').hidden) return;
            const { width, height } = this.previewSize(this.zoom);
            const canvas = sandbox.canvas;
            canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
            const pixelWidth = Math.round(width * sandbox.pixelRatio), pixelHeight = Math.round(height * sandbox.pixelRatio);
            if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
            if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
            sandbox.targetBounds = { minX: 20, minY: 20, maxX: width - 20, maxY: height - 20 };
            this.app._renderSvgAfricanBuilderMotionSandbox(sandbox);
            if (this.zoom === 1) { viewport.scrollTop = 0; viewport.scrollLeft = 0; }
        }

        previewSize(zoom = 1) {
            const viewport = this.$('.character-designer-viewport');
            // client dimensions round fractional CSS pixels up at some display scales.
            // Leave one pixel so fit-to-view cannot toggle scrollbars on every resize.
            return {
                width: Math.round(Math.max(120, viewport.clientWidth - 1) * zoom),
                height: Math.round(Math.max(120, viewport.clientHeight - 1) * zoom)
            };
        }

        async loadPhoto(file) {
            if (!file || !this.dialog) return;
            this.cancelPhotoAnalysis();
            const current = this.photoGeneration = (this.photoGeneration || 0) + 1;
            this.busy = true;
            this.processing('Loading photo');
            try {
                if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Use a PNG, JPEG or WebP photo.');
                if (file.size > 25 * 1024 * 1024) throw new Error('Photo must be smaller than 25 MB.');
                const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
                if (bitmap.width * bitmap.height > 40e6) { bitmap.close(); throw new Error('Photo exceeds 40 megapixels.'); }
                const ratio = Math.min(1, 1536 / Math.max(bitmap.width, bitmap.height));
                const canvas = document.createElement('canvas');
                canvas.width = Math.round(bitmap.width * ratio); canvas.height = Math.round(bitmap.height * ratio);
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
                if (!this.dialog || current !== this.photoGeneration) return;
                const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
                if (!this.dialog || current !== this.photoGeneration) return;
                const sha256 = [...new Uint8Array(digest)].map(v => v.toString(16).padStart(2, '0')).join('');
                this.photo = { canvas, source: canvas, original: canvas, data: ctx.getImageData(0, 0, canvas.width, canvas.height), name: file.name, cutout: false, sha256, consent: null };
                this.config._photoCharacter = null;
                this.$('#character-designer-consent-check').checked = false;
                this.$('#character-designer-consent-status').textContent = '';
                this.photoZoom = 1; this.photoOutput = 'hybrid';
                this.$('#character-designer-photo-output').value = 'hybrid';
                this.$('#character-designer-photo-glasses').value = 'keep';
                this.$('#character-designer-photo-frame').value = 'rectangular';
                this.crop = null; this.cropDrag = null; this.dragKey = null;
                this.analysis = null;
                this.setManualAnchors();
                this.updatePhotoControls();
                this.$('#character-designer-pane').value = 'photo';
                this.$('#character-designer-detection').textContent = 'Local photo ready. Landmark guides are manual until analysis succeeds.';
                this.showPhoto(); this.zoomPhoto(1);
                this.notifyResult('Photo loaded.');
            } catch (error) {
                if (current === this.photoGeneration) { this.status(error.message); this.notifyResult(error.message, 'error'); }
            } finally {
                if (current === this.photoGeneration && this.dialog) { this.busy = false; this.processing(); this.updatePhotoControls(); }
            }
        }

        requirePhotoConsent() {
            if (!this.photo?.consent || this.photo.consent.sha256 !== this.photo.sha256) throw new Error('Confirm and record consent for this photo before processing it.');
        }

        invalidatePhotoDraft() {
            if (!this.photo || !this.config._photoCharacter) return;
            this.config._photoCharacter = null;
            this.$('#character-designer-measurements').hidden = true;
            this.updatePhotoControls();
            this.status('Photo changed. Reconstruct again to update the draft.');
        }

        async recordPhotoConsent() {
            const photo = this.photo, generation = this.photoGeneration;
            if (!photo || !this.$('#character-designer-consent-check').checked) throw new Error('Confirm permission using the consent checkbox first.');
            this.status('Recording photo consent...');
            const response = await fetch(new URL('api/photo-consent.php', document.baseURI), {
                method: 'POST', credentials: 'same-origin', signal: this.abortController?.signal,
                headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': globalThis.__STAGE_USER?.csrf_token || '' },
                body: JSON.stringify({ confirmed: true, version: 'photo-character-v1', sha256: photo.sha256 })
            });
            const data = await response.json().catch(() => ({}));
            if (!this.dialog || photo !== this.photo || generation !== this.photoGeneration) return;
            if (!response.ok || !data.ok || !/^pc_[a-f0-9]{32}$/.test(data.receipt?.id || '') || data.receipt.sha256 !== photo.sha256) throw new Error(data.error || 'Consent could not be saved. Sign in and retry; photo processing remains blocked.');
            photo.consent = data.receipt;
            this.$('#character-designer-consent-status').textContent = `Recorded: ${data.receipt.id}`;
            this.status('Consent recorded. Ready to reconstruct.');
            this.updatePhotoControls();
        }

        async reconstructPhoto() {
            this.reconstructionBackgroundWarning = '';
            this.requirePhotoConsent();
            if (this.crop) throw new Error('Apply or cancel the crop first.');
            const photo = this.photo, generation = this.photoGeneration;
            if (!this.analysis?.faces?.length) await this.analyzePhoto();
            if (!this.dialog || photo !== this.photo || generation !== this.photoGeneration) return;
            const readiness = this.renderPhotoReadiness();
            if (readiness.status === 'blocked' || readiness.status === 'unchecked') throw new Error(readiness.message);
            if (readiness.status === 'warning' && !this.$('#character-designer-quality-confirm').checked) throw new Error('Review the photo limitations and confirm before reconstruction. ' + readiness.message);
            let backgroundWarning = '';
            if (!photo.cutout) {
                try { await this.removePhotoBackground(); }
                catch (error) { if (error.name === 'AbortError') throw error; backgroundWarning = error.message; }
            }
            if (!this.dialog || photo !== this.photo || generation !== this.photoGeneration) return;
            this.reconstructionBackgroundWarning = backgroundWarning;
            this.status('Building editable facial parts and fitting the body...');
            await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
            if (!this.dialog || photo !== this.photo || generation !== this.photoGeneration) return;
            const glassesMode = this.$('#character-designer-photo-glasses').value;
            let data = PhotoCharacterRig.build(photo, this.anchors, this.analysis, photo.consent, this.$('#character-designer-photo-clothing').value, glassesMode, this.photoOutput);
            if (this.photoOutput === 'vector') {
                this.status('Tracing clothing into editable vector regions...');
                data = await PhotoCharacterRig.vectorize(data, { tracer: new AITrace(this.app.objects), signal: this.abortController?.signal,
                    onProgress: ({ part, progress }) => this.status(`Vectorizing ${part.replaceAll('-', ' ')}: ${Math.round(progress * 100)}%`) });
                if (!this.dialog || photo !== this.photo || generation !== this.photoGeneration) return;
            }
            data.glassesStyle = this.$('#character-designer-photo-frame').value;
            const front = CharacterDesignSpec.validate({ styling: { view: 'front' } }, this.config).config;
            const fitted = CharacterDesignSpec.fitPhoto(front, this.anchors, photo.data, this.analysis?.mask);
            this.config = fitted.config;
            this.config._photoCharacter = data;
            if (glassesMode !== 'keep') {
                const accessories = new Set(this.config.styling.accessories || []);
                if (glassesMode === 'replace') accessories.add('glasses'); else accessories.delete('glasses');
                this.config = CharacterDesignSpec.validate({ styling: { accessories: [...accessories] } }, this.config).config;
            }
            this.config._svgAfricanFaceState = { ...this.config._svgAfricanFaceState, mouthOpen: 0, jawOpen: 0 };
            this.config.name = 'Photo character';
            this.warnings = [...fitted.warnings, data.fullVector ? 'Raster-free reconstruction: measured face and editable features, fitted SVG body and traced visible clothing. Fine textures are simplified; obscured parts use fitted catalog artwork.' : data.vector ? 'Fitted vector face; existing clothing textures are retained.' : 'Hybrid front face: preserved photo texture with animated eyes, brows and lips. Not a fully vector-traced face.', 'Side, back and 3/4 views are inferred; unseen likeness and clothing cannot be recovered from a front photo.'];
            if (backgroundWarning) this.warnings.push(backgroundWarning);
            if (glassesMode !== 'keep') this.warnings.push('Hidden skin and eyebrows are approximated. Review eye landmarks and the result; opaque sunglasses require a clearer photo for accurate likeness.');
            if (data.fullVector && data.clothing !== 'editable') this.warnings.push(`Traced front parts: ${Object.keys(data.vectorLayers).join(', ') || 'none'}. Obscured and non-front parts retain fitted SVG clothing.`);
            else if (data.clothing === 'photo') this.warnings.push(data.torso ? 'Photo texture is applied to the front torso only. Sleeves and lower clothing remain editable SVG.' : 'The torso is obscured or its landmarks are missing; editable clothing is retained.');
            else if (data.clothing === 'segments') this.warnings.push(`Visible front textures: ${[...(data.torso ? ['torso'] : []), ...Object.keys(data.textures)].join(', ') || 'none'}. Obscured, incomplete and non-front parts retain SVG clothing.`);
            const measurements = this.$('#character-designer-measurements');
            measurements.hidden = false;
            measurements.querySelector('dl').innerHTML = Object.entries(data.measurements).map(([key, value]) => `<dt>${escape(label(key))}</dt><dd>${value.toFixed(1)}</dd>`).join('');
            this.renderFields();
            this.updatePhotoControls();
            this.$('#character-designer-pane').value = 'rig'; this.showPane();
            await this.refreshPreview({ throwOnError: true });
            this.showWarnings();
        }

        showPhoto() {
            this.$('#character-designer-pane').value = 'photo';
            this.showPane();
        }

        zoomPhoto(value) {
            const viewport = this.$('.character-designer-viewport'), canvas = this.$('#character-designer-photo');
            let centerX = (viewport.scrollLeft + viewport.clientWidth / 2) / Math.max(1, canvas.width);
            let centerY = (viewport.scrollTop + viewport.clientHeight / 2) / Math.max(1, canvas.height);
            if (value > this.photoZoom && this.photoRect) {
                const focus = this.crop ? { x: this.crop.left + this.crop.width / 2, y: this.crop.top + this.crop.height / 2 } : this.anchors[this.$('#character-designer-landmark').value];
                if (focus) {
                    centerX = (this.photoRect.x + focus.x * this.photoRect.w) / canvas.width;
                    centerY = (this.photoRect.y + focus.y * this.photoRect.h) / canvas.height;
                }
            }
            this.photoZoom = Math.max(1, Math.min(4, value));
            this.drawPhoto();
            viewport.scrollLeft = this.photoZoom === 1 ? 0 : centerX * canvas.width - viewport.clientWidth / 2;
            viewport.scrollTop = this.photoZoom === 1 ? 0 : centerY * canvas.height - viewport.clientHeight / 2;
            this.$('#character-designer-zoom').textContent = Math.round(this.photoZoom * 100) + '%';
        }

        photoCreateBlocker(ignoreBusy = false) {
            if (this.busy && !ignoreBusy) return 'Processing character...';
            if (this.cutoutEditor) return 'Apply or cancel edge cleanup first.';
            if (!this.photo) return '';
            if (!this.photo.consent || this.photo.consent.sha256 !== this.photo.sha256) return 'Photo consent is not recorded.';
            if (this.crop) return 'Photo crop is unfinished.';
            if (['hybrid', 'vector'].includes(this.photoOutput)) {
                const draft = this.config._photoCharacter;
                if (!draft) return 'Photo reconstruction is required.';
                if ((draft.faceMode === 'vector') !== (this.photoOutput === 'vector')) return 'Reconstruct the selected photo output.';
                if (draft.sha256 !== this.photo.sha256 || draft.consentId !== this.photo.consent.id) return 'Photo reconstruction is out of date.';
            }
            return '';
        }

        renderPhotoReadiness() {
            const readiness = PhotoCharacterRig.assess(this.photo, this.anchors, this.analysis);
            const region = this.$('#character-designer-photo-readiness');
            const signature = JSON.stringify(readiness);
            if (signature !== this.readinessSignature) this.$('#character-designer-quality-confirm').checked = false;
            this.readinessSignature = signature;
            region.hidden = !this.photo || !['hybrid', 'vector'].includes(this.photoOutput);
            region.dataset.status = readiness.status;
            region.querySelector('strong').textContent = { unchecked: 'Photo not checked', blocked: 'Not ready', warning: 'Usable with limitations', ready: 'Ready' }[readiness.status];
            region.querySelector('p').textContent = readiness.message;
            region.querySelector('small').textContent = this.photo ? `${this.photo.canvas.width} x ${this.photo.canvas.height} px` + (readiness.faceWidth ? ` | Face: ${readiness.faceWidth} x ${readiness.faceHeight} px` : '') + (readiness.focused ? ' | Focused face detection' : '') : '';
            this.$('#character-designer-quality-confirm-label').hidden = region.hidden || readiness.status !== 'warning';
            return readiness;
        }

        updatePhotoControls() {
            if (!this.dialog) return;
            const cleaning = !!this.cutoutEditor;
            this.$('#character-designer-cutout').hidden = !cleaning;
            this.$('#character-designer-file').disabled = cleaning;
            this.$('#character-designer-auto-edges').disabled = cleaning || !!this.busy;
            this.$('#character-designer-auto-edges').closest('label').hidden = !this.photo;
            this.$('#character-designer-target').disabled = cleaning;
            this.$('#character-designer-pane').disabled = cleaning;
            this.$('#character-designer-fields').inert = cleaning;
            this.$('#character-designer-views').closest('details').inert = cleaning;
            this.$('[data-command="cleanup-photo"]').disabled = !this.photo || this.busy || !this.photo.consent || !!this.crop || cleaning;
            this.$('#character-designer-face-check').hidden = !this.config._photoCharacter || this.config.styling.view.startsWith('back') || (this.config.styling.view !== 'front' && this.config._photoCharacter.vector?.viewMode !== 'matched');
            const unavailable = !this.photo || this.busy || !this.photo.consent || cleaning;
            const readiness = this.renderPhotoReadiness();
            this.$('#character-designer-quality-confirm').disabled = unavailable;
            for (const command of ['analyze', 'fit', 'crop-photo', 'remove-background']) {
                this.$(`[data-command="${command}"]`).disabled = unavailable || !!this.crop;
            }
            this.$('[data-command="restore-photo"]').disabled = !this.photo || (this.photo.source === this.photo.original && !this.photo.cutout && !this.crop);
            this.$('[data-command="remove-background"]').innerHTML = `<i class="fas fa-${this.photo?.cutout ? 'image' : 'eraser'}"></i> ${this.photo?.cutout ? 'Restore background' : 'Remove background'}`;
            this.$('#character-designer-crop').hidden = !this.crop;
            const photoParts = !!this.photo && this.photoOutput === 'parts';
            const hybrid = !!this.photo && ['hybrid', 'vector'].includes(this.photoOutput);
            this.$('#character-designer-photo-glasses option[value="keep"]').disabled = this.photoOutput === 'vector';
            this.syncPhotoClothing();
            this.$('#character-designer-consent').hidden = !this.photo;
            this.$('[data-command="consent"]').disabled = !this.photo || this.busy || !!this.photo.consent;
            this.$('#character-designer-consent-check').disabled = !!this.photo?.consent;
            this.$('[data-command="reconstruct"]').hidden = !hybrid;
            this.$('[data-command="reconstruct"]').disabled = unavailable || !!this.crop || !['ready', 'warning'].includes(readiness.status) || (readiness.status === 'warning' && !this.$('#character-designer-quality-confirm').checked);
            this.$('[data-command="reconstruct"]').title = readiness.status === 'ready' ? '' : readiness.message;
            this.$('#character-designer-photo-clothing-label').hidden = !hybrid && !this.config._photoCharacter;
            this.$('#character-designer-photo-glasses-label').hidden = !hybrid && !this.config._photoCharacter;
            this.$('#character-designer-photo-glasses').disabled = !this.photo || !!this.busy || cleaning;
            this.$('#character-designer-photo-glasses').title = this.photo ? '' : 'A source photo is required to reconstruct photographed frames.';
            this.$('#character-designer-photo-frame-label').hidden = this.config._photoCharacter
                ? this.config._photoCharacter.glassesMode === 'keep'
                : !hybrid || this.$('#character-designer-photo-glasses').value === 'keep';
            const blocker = this.photoCreateBlocker();
            const apply = this.$('[data-command="apply"]');
            apply.disabled = !!blocker;
            apply.title = blocker;
            apply.setAttribute('aria-disabled', String(!!blocker));
            this.$('#character-designer-create-status').textContent = blocker || (hybrid ? 'Photo character ready' : '');
            const personalSelected = !!this.$('#character-designer-personal-list').value;
            this.$('[data-command="preset-load"]').disabled = this.busy || !personalSelected;
            this.$('[data-command="preset-delete"]').disabled = this.busy || !personalSelected;
            this.$('[data-command="preset-refresh"]').disabled = !!this.busy;
            this.$('[data-command="preset-save"]').disabled = !!blocker || !this.config._photoCharacter || !this.$('#character-designer-personal-name').value.trim() || !this.$('#character-designer-personal-consent').checked;
            this.$('#character-designer-photo-output').disabled = !this.photo || cleaning;
            for (const id of ['character-designer-photo-frame', 'character-designer-landmark', 'character-designer-landmark-x', 'character-designer-landmark-y']) this.$('#' + id).disabled = cleaning;
            this.$('#character-designer-clone-target-label').hidden = !photoParts;
            this.$('#character-designer-pane option[value="rig"]').disabled = photoParts;
            this.$('#character-designer-fields').hidden = photoParts;
            this.$('#character-designer-views').closest('details').hidden = photoParts;
            this.$('[data-command="builder"]').hidden = !!this.photo || !!this.config._photoCharacter;
            this.$('[data-command="fit"]').hidden = photoParts || hybrid;
            this.$('[data-command="apply"] i').className = photoParts ? 'fas fa-clone' : 'fas fa-user-plus';
            this.$('#character-designer-apply-label').textContent = photoParts ? 'Open photo cloning' : this.mode === 'edit' ? 'Update selected' : hybrid ? 'Create photo character' : this.photo ? 'Create SVG preset' : 'Create on Stage';
        }

        cancelPhotoAnalysis() {
            this.worker?.terminate(); this.worker = null;
            this.workerReject?.(new DOMException('Cancelled', 'AbortError'));
        }

        startPhotoCleanup() {
            this.requirePhotoConsent();
            if (this.crop) throw new Error('Apply or cancel the crop first.');
            this.cutoutEditor = new PhotoCutoutEditor(this.photo.source, this.photo.canvas, this.app.objects);
            this.cutoutTool = 'erase'; this.cutoutBackground = 'checker'; this.cutoutCursor = null; this.cutoutPointer = null; this.cutoutCompare = false;
            this.$('#character-designer-cutout-status').textContent = '';
            this.updatePhotoControls(); this.updateCutoutControls(); this.showPhoto();
        }

        updateCutoutControls() {
            if (!this.dialog || !this.cutoutEditor) return;
            for (const tool of ['erase', 'restore', 'pan', 'sample', 'clone', 'checker', 'light', 'dark']) this.$(`[data-command="cutout-${tool}"]`).setAttribute('aria-pressed', String(tool === this.cutoutTool || tool === this.cutoutBackground));
            this.$('[data-command="cutout-undo"]').disabled = this.cutoutCompare || !this.cutoutEditor.undoStack.length;
            this.$('[data-command="cutout-redo"]').disabled = this.cutoutCompare || !this.cutoutEditor.redoStack.length;
            for (const tool of ['erase', 'restore', 'sample', 'clone']) this.$(`[data-command="cutout-${tool}"]`).disabled = !!this.cutoutCompare;
            this.$('#character-designer-clone-settings').hidden = !['sample', 'clone'].includes(this.cutoutTool);
            this.$('#character-designer-clone-opacity').disabled = !!this.cutoutCompare;
            this.$('#character-designer-brush-size').disabled = !!this.cutoutCompare;
            this.$('#character-designer-brush-hardness').disabled = !!this.cutoutCompare;
            this.$('[data-command="cutout-compare"]').setAttribute('aria-pressed', String(!!this.cutoutCompare));
            this.$('[data-command="cutout-specks"]').disabled = !!this.cutoutCompare;
            this.$('#character-designer-photo').style.cursor = this.cutoutTool === 'pan' ? 'grab' : 'crosshair';
            for (const input of this.dialog.querySelectorAll('[data-cutout-edge]')) {
                input.disabled = !!this.cutoutCompare;
                input.value = this.cutoutEditor[input.dataset.cutoutEdge]; input.nextElementSibling.textContent = input.value;
            }
        }

        scheduleCutoutDraw(render = false) {
            this.cutoutNeedsRender ||= render;
            if (this.cutoutFrame || !this.cutoutEditor) return;
            this.cutoutFrame = requestAnimationFrame(() => {
                this.cutoutFrame = null;
                if (!this.cutoutEditor || !this.dialog) return;
                if (this.cutoutNeedsRender) this.cutoutEditor.render();
                this.cutoutNeedsRender = false;
                this.updateCutoutControls(); this.drawPhoto();
            });
        }

        finishPhotoCleanup(apply) {
            if (!this.cutoutEditor || !this.photo) return;
            this.cutoutEditor.end();
            if (apply) {
                const canvas = this.cutoutEditor.render(), data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
                let visible = false;
                for (let i = 3; i < data.data.length && !visible; i += 4) visible = data.data[i] > 0;
                if (!visible) { this.notifyResult('The cutout is empty. Undo or restore part of the photo before applying.', 'error'); return; }
                this.photo.canvas = canvas; this.photo.data = data; this.photo.cutout = true;
                this.invalidatePhotoDraft();
            }
            cancelAnimationFrame(this.cutoutFrame); this.cutoutFrame = null;
            this.cutoutEditor = null; this.cutoutCursor = null; this.cutoutNeedsRender = false; this.photoPan = null;
            this.cutoutPointer = null;
            this.$('#character-designer-photo').style.cursor = '';
            this.updatePhotoControls(); this.drawPhoto();
            this.notifyResult(apply ? 'Edge cleanup applied. Reconstruct the photo character to use it.' : 'Edge cleanup cancelled.');
        }

        restorePhoto() {
            if (!this.photo) return;
            this.cancelPhotoAnalysis();
            this.photoGeneration++;
            this.photo.source = this.photo.original;
            this.config._photoCharacter = null;
            this.photo.canvas = this.photo.original;
            this.photo.data = this.photo.canvas.getContext('2d').getImageData(0, 0, this.photo.canvas.width, this.photo.canvas.height);
            this.photo.cutout = false;
            this.analysis = null; this.crop = null; this.cropDrag = null; this.dragKey = null;
            this.setManualAnchors(); this.updatePhotoControls(); this.showPhoto(); this.zoomPhoto(1);
            this.$('#character-designer-detection').textContent = 'Original restored. Landmark guides reset.';
            this.status('Original photo restored');
        }

        normalizeCrop() {
            if (!this.crop || !this.photo) return;
            const c = this.crop, image = this.photo.canvas;
            const minW = Math.min(1, 16 / image.width), minH = Math.min(1, 16 / image.height);
            c.left = Math.max(0, Math.min(1 - minW, c.left));
            c.top = Math.max(0, Math.min(1 - minH, c.top));
            c.width = Math.max(minW, Math.min(1 - c.left, c.width));
            c.height = Math.max(minH, Math.min(1 - c.top, c.height));
        }

        cropReadouts() {
            if (!this.crop) return;
            this.dialog.querySelectorAll('[data-crop]').forEach(input => { input.value = (this.crop[input.dataset.crop] * 100).toFixed(1); });
        }

        applyCrop() {
            if (!this.photo || !this.crop) return;
            this.normalizeCrop();
            const source = this.photo.source, c = this.crop;
            const x = Math.floor(c.left * source.width), y = Math.floor(c.top * source.height);
            const width = Math.max(1, Math.min(source.width - x, Math.round(c.width * source.width)));
            const height = Math.max(1, Math.min(source.height - y, Math.round(c.height * source.height)));
            const cropCanvas = image => {
                const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
                canvas.getContext('2d').drawImage(image, x, y, width, height, 0, 0, width, height);
                return canvas;
            };
            this.photo.canvas = cropCanvas(this.photo.canvas);
            this.config._photoCharacter = null;
            this.photo.source = cropCanvas(source);
            this.photo.data = this.photo.canvas.getContext('2d').getImageData(0, 0, width, height);
            // Preserve only landmarks still inside the crop, in its new coordinate space.
            this.anchors = Object.fromEntries(Object.entries(this.anchors).map(([key, p]) => [key, {
                ...p, x: (p.x * source.width - x) / width, y: (p.y * source.height - y) / height
            }]).filter(([, p]) => p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1));
            this.photoGeneration++;
            this.analysis = null; this.crop = null; this.cropDrag = null; this.dragKey = null;
            this.renderLandmarkList(); this.updatePhotoControls(); this.drawPhoto();
            this.$('#character-designer-detection').textContent = 'Photo cropped. Retained landmarks repositioned; analysis reset.';
            this.status('Crop applied');
        }

        async removePhotoBackground() {
            if (!this.photo || this.crop) return;
            this.requirePhotoConsent();
            const photo = this.photo, generation = this.photoGeneration;
            this.showPhoto();
            if (photo.cutout) {
                this.invalidatePhotoDraft();
                photo.canvas = photo.source;
                photo.data = photo.canvas.getContext('2d').getImageData(0, 0, photo.canvas.width, photo.canvas.height);
                photo.cutout = false;
            } else {
                this.updatePhotoControls();
                this.status('Removing background locally...');
                this.$('#character-designer-detection').textContent = 'Removing background locally...';
                const result = await this.runPhotoVision('segment');
                if (!this.dialog || this.photo !== photo || generation !== this.photoGeneration) return;
                const mask = result?.mask;
                if (!mask || !Number.isInteger(mask.width) || !Number.isInteger(mask.height) || mask.width <= 0 || mask.height <= 0 || mask.values?.length !== mask.width * mask.height || !mask.values.every(Number.isFinite)) throw new Error('Background removal returned an invalid mask. Try again.');
                if (!mask.values.some(value => value > .65)) throw new Error('No person found for background removal. Choose a clearer person photo.');
                const alpha = document.createElement('canvas'); alpha.width = mask.width; alpha.height = mask.height;
                const ctx = alpha.getContext('2d'), pixels = ctx.createImageData(mask.width, mask.height);
                for (let i = 0; i < mask.values.length; i++) {
                    const t = Math.max(0, Math.min(1, (mask.values[i] - .15) / .7));
                    pixels.data[i * 4 + 3] = Math.round(255 * t * t * (3 - 2 * t));
                }
                ctx.putImageData(pixels, 0, 0);
                const canvas = document.createElement('canvas'); canvas.width = photo.source.width; canvas.height = photo.source.height;
                const output = canvas.getContext('2d');
                output.drawImage(photo.source, 0, 0);
                // Multiplication preserves existing source transparency and soft mask edges.
                output.globalCompositeOperation = 'destination-in';
                output.drawImage(alpha, 0, 0, canvas.width, canvas.height);
                let cleaned = canvas;
                if (this.$('#character-designer-auto-edges').checked) {
                    const editor = new PhotoCutoutEditor(photo.source, canvas);
                    editor.refineSolidBackground();
                    editor.cleanup = 8; editor.defringe = 50;
                    cleaned = editor.render();
                }
                const cutout = cleaned.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
                const source = photo.source.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
                let opaque = 0, removed = 0, retained = 0;
                for (let i = 3; i < source.data.length; i += 4) {
                    if (source.data[i] < 200) continue;
                    opaque++;
                    if (cutout.data[i] < 64) removed++;
                    if (cutout.data[i] > 200) retained++;
                }
                // Do not claim success for an unchanged image or an empty cutout.
                if (removed < Math.max(1, opaque * .005)) throw new Error('No removable background detected. The original photo has been kept. Try a wider crop around the person.');
                if (retained < Math.max(1, opaque * .005)) throw new Error('The person could not be isolated reliably. The original photo has been kept.');
                photo.canvas = cleaned; photo.data = cutout; photo.cutout = true;
                this.invalidatePhotoDraft();
            }
            this.updatePhotoControls(); this.showPhoto();
            const message = photo.cutout ? 'Background removed' : 'Background restored';
            this.status(message);
            this.$('#character-designer-detection').textContent = message;
        }

        setManualAnchors() {
            this.invalidatePhotoDraft();
            const positions = { crown: [.5, .06], chin: [.5, .22], faceLeft: [.43, .14], faceRight: [.57, .14], eyeLeft: [.465, .12], eyeRight: [.535, .12], nose: [.5, .15], mouthLeft: [.475, .18], mouthRight: [.525, .18], upperLip: [.5, .175], lowerLip: [.5, .185], shoulderLeft: [.34, .27], shoulderRight: [.66, .27], elbowLeft: [.29, .43], elbowRight: [.71, .43], wristLeft: [.26, .57], wristRight: [.74, .57], hipLeft: [.43, .54], hipRight: [.57, .54], kneeLeft: [.43, .74], kneeRight: [.57, .74], ankleLeft: [.43, .94], ankleRight: [.57, .94] };
            this.anchors = Object.fromEntries(Object.entries(positions).map(([key, [x, y]]) => [key, { x: /Left|Right/.test(key) ? 1 - x : x, y }]));
            this.renderLandmarkList();
            this.updatePhotoControls();
        }

        async runPhotoVision(operation = 'analyze') {
            if (!this.photo) throw new Error('Select a photo.');
            this.requirePhotoConsent();
            const current = this.generation, photoGeneration = this.photoGeneration;
            this.cancelPhotoAnalysis();
            const bitmap = await createImageBitmap(this.photo.source);
            if (!this.dialog || current !== this.generation || photoGeneration !== this.photoGeneration) { bitmap.close(); throw new DOMException('Cancelled', 'AbortError'); }
            const worker = this.worker = new Worker(new URL('js/character-vision-worker.js?v=' + encodeURIComponent(window.__appAssetVersion || ''), document.baseURI));
            const result = await new Promise((resolve, reject) => {
                const timer = setTimeout(() => finish(new Error('Photo processing timed out. Try again or use a smaller photo.')), 90000);
                const finish = (error, value) => { clearTimeout(timer); worker.terminate(); if (this.worker === worker) this.worker = null; this.workerReject = null; error ? reject(error) : resolve(value); };
                this.workerReject = error => finish(error);
                worker.onmessage = event => event.data.error ? finish(new Error(event.data.error)) : finish(null, event.data.result);
                worker.onerror = event => finish(new Error(event.message || 'Photo analyzer unavailable. Manual landmarks remain available.'));
                worker.postMessage({ id: 1, bitmap, operation, base: new URL('assets/character-vision/', document.baseURI).href }, [bitmap]);
            });
            if (!this.dialog || current !== this.generation || photoGeneration !== this.photoGeneration) throw new DOMException('Cancelled', 'AbortError');
            return result;
        }

        async analyzePhoto({ preserveAnchors = false } = {}) {
            this.status('Analyzing locally...');
            const result = await this.runPhotoVision();
            this.invalidatePhotoDraft();
            this.analysis = result;
            this.$('#character-designer-quality-confirm').checked = false;
            if (!preserveAnchors) this.anchors = CharacterDesignSpec.photoAnchors(result);
            this.renderLandmarkList(); this.drawPhoto();
            this.$('#character-designer-detection').textContent = `${result.faces?.length > 1 ? 'Multiple faces detected' : result.faces?.length ? 'Face detected' : 'No face detected'}; ${result.pose?.length ? 'body landmarks detected' : 'body not detected'}.`;
            this.updatePhotoControls();
            this.status(PhotoCharacterRig.assess(this.photo, this.anchors, this.analysis).message);
        }

        renderLandmarkList() {
            const select = this.$('#character-designer-landmark');
            if (!select) return;
            const selected = select.value;
            select.innerHTML = Object.keys(this.anchors).map(key => `<option value="${key}">${escape(this.landmarkLabel(key))}</option>`).join('');
            if (this.anchors[selected]) select.value = selected;
            this.landmarkReadouts();
        }

        landmarkReadouts() {
            const key = this.$('#character-designer-landmark')?.value;
            const anchor = this.anchors[key];
            for (const axis of ['x', 'y']) {
                const el = this.$('#character-designer-landmark-' + axis);
                if (el) { el.disabled = !anchor; el.value = anchor ? (anchor[axis] * 100).toFixed(1) : ''; }
            }
        }

        landmarkLabel(key) {
            if (key === 'crown') return 'Upper forehead';
            const side = key.includes('Left') ? 'left' : key.includes('Right') ? 'right' : null;
            return side ? `Character ${side} ${label(key.replace(/Left|Right/, '')).toLowerCase()}` : label(key);
        }

        showPane() {
            const photo = this.$('#character-designer-pane').value === 'photo';
            this.$('#character-designer-preview').hidden = photo;
            this.$('#character-designer-photo').hidden = !photo;
            this.$('#character-designer-motion').disabled = photo;
            this.$('#character-designer-zoom').textContent = Math.round((photo ? this.photoZoom : this.zoom) * 100) + '%';
            if (photo) this.drawPhoto(); else this.sizePreview();
        }

        drawPhoto() {
            const canvas = this.$('#character-designer-photo'), viewport = this.$('.character-designer-viewport');
            if (!canvas || !viewport || canvas.hidden) return;
            const { width: w, height: h } = this.previewSize(this.photoZoom || 1);
            if (canvas.width !== w) canvas.width = w;
            if (canvas.height !== h) canvas.height = h;
            canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, w, h);
            if (!this.photo) return;
            const image = this.cutoutEditor ? (this.cutoutCompare ? this.photo.source : this.cutoutEditor.output) : this.photo.canvas;
            const scale = Math.min((w - 24) / image.width, (h - 24) / image.height);
            const rect = { x: (w - image.width * scale) / 2, y: (h - image.height * scale) / 2, w: image.width * scale, h: image.height * scale };
            this.photoRect = rect;
            if (this.cutoutEditor && this.cutoutBackground !== 'checker') {
                ctx.fillStyle = this.cutoutBackground === 'dark' ? '#202124' : '#ffffff'; ctx.fillRect(0, 0, w, h);
            } else for (let y = 0; y < h; y += 12) for (let x = 0; x < w; x += 12) {
                ctx.fillStyle = (x / 12 + y / 12) % 2 ? '#e1e7eb' : '#f5f7f8'; ctx.fillRect(x, y, 12, 12);
            }
            ctx.drawImage(image, rect.x, rect.y, rect.w, rect.h);
            if (this.cutoutEditor) {
                const sample = this.cutoutEditor.cloneSession?._cloneBrushLiveSourcePos || this.cutoutEditor.cloneSource;
                if (sample && ['sample', 'clone'].includes(this.cutoutTool) && !this.cutoutCompare) {
                    const x = rect.x + sample.x / image.width * rect.w, y = rect.y + sample.y / image.height * rect.h;
                    ctx.beginPath(); ctx.moveTo(x - 7, y); ctx.lineTo(x + 7, y); ctx.moveTo(x, y - 7); ctx.lineTo(x, y + 7);
                    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke(); ctx.strokeStyle = '#252525'; ctx.lineWidth = 1; ctx.stroke();
                }
                if (this.cutoutCursor && this.cutoutTool !== 'pan' && !this.cutoutCompare) {
                    const p = this.cutoutCursor, radius = Number(this.$('#character-designer-brush-size').value) / 2 * rect.w / image.width;
                    ctx.beginPath(); ctx.arc(rect.x + p.x / image.width * rect.w, rect.y + p.y / image.height * rect.h, radius, 0, Math.PI * 2);
                    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke(); ctx.strokeStyle = '#252525'; ctx.lineWidth = 1; ctx.stroke();
                }
                return;
            }
            if (this.crop) {
                const c = this.crop, x = rect.x + c.left * rect.w, y = rect.y + c.top * rect.h, cw = c.width * rect.w, ch = c.height * rect.h;
                ctx.fillStyle = '#0008';
                ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.rect(x, y, cw, ch); ctx.fill('evenodd');
                ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(x, y, cw, ch);
                ctx.fillStyle = '#00b594';
                for (const px of [x, x + cw]) for (const py of [y, y + ch]) ctx.fillRect(px - 5, py - 5, 10, 10);
                return;
            }
            for (const [key, anchor] of Object.entries(this.anchors)) {
                ctx.fillStyle = key === this.$('#character-designer-landmark').value ? '#fae36e' : '#00b594';
                ctx.strokeStyle = '#15181c'; ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.arc(rect.x + anchor.x * rect.w, rect.y + anchor.y * rect.h, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            }
        }

        setupPhotoDrag() {
            const canvas = this.$('#character-designer-photo');
            const point = event => {
                const rect = canvas.getBoundingClientRect();
                return { x: (event.clientX - rect.left) * canvas.width / rect.width, y: (event.clientY - rect.top) * canvas.height / rect.height };
            };
            canvas.addEventListener('pointerdown', event => {
                if (!this.photo || !this.photoRect || this.busy) return;
                const p = point(event), r = this.photoRect;
                if (this.cutoutEditor) {
                    if (this.cutoutCompare && this.cutoutTool !== 'pan') return;
                    if (!event.isPrimary || event.button !== 0 || this.cutoutPointer != null) return;
                    if (p.x < r.x || p.y < r.y || p.x > r.x + r.w || p.y > r.y + r.h) return;
                    this.cutoutPointer = event.pointerId;
                    if (this.cutoutTool === 'pan') {
                        const viewport = this.$('.character-designer-viewport');
                        this.photoPan = { x: event.clientX, y: event.clientY, left: viewport.scrollLeft, top: viewport.scrollTop };
                    } else {
                        const position = { x: (p.x - r.x) / r.w * this.photo.source.width, y: (p.y - r.y) / r.h * this.photo.source.height };
                        this.cutoutCursor = position;
                        const status = this.$('#character-designer-cutout-status');
                        if (this.cutoutTool === 'sample' || (this.cutoutTool === 'clone' && event.altKey)) {
                            const sampled = this.cutoutEditor.sampleClone(position);
                            status.textContent = sampled ? 'Clone source selected.' : 'Choose a visible part of the photo.';
                            if (sampled) this.cutoutTool = 'clone';
                        } else {
                            const started = this.cutoutEditor.begin(position, this.cutoutTool, Number(this.$('#character-designer-brush-size').value) / 2, Number(this.$('#character-designer-brush-hardness').value) / 100, Number(this.$('#character-designer-clone-opacity').value));
                            status.textContent = started === false ? 'Select a clone source first.' : '';
                        }
                        this.scheduleCutoutDraw(true);
                    }
                    canvas.setPointerCapture(event.pointerId); event.preventDefault(); return;
                }
                if (this.crop) {
                    const x = Math.max(0, Math.min(1, (p.x - r.x) / r.w)), y = Math.max(0, Math.min(1, (p.y - r.y) / r.h));
                    const c = this.crop;
                    const cornerX = Math.abs(x - c.left) < Math.abs(x - c.left - c.width) ? c.left : c.left + c.width;
                    const cornerY = Math.abs(y - c.top) < Math.abs(y - c.top - c.height) ? c.top : c.top + c.height;
                    const corner = Math.hypot((x - cornerX) * r.w, (y - cornerY) * r.h) < 18;
                    const inside = x >= c.left && x <= c.left + c.width && y >= c.top && y <= c.top + c.height;
                    this.cropDrag = { x, y, start: { ...c }, mode: corner ? 'resize' : inside ? 'move' : 'draw',
                        fixedX: cornerX === c.left ? c.left + c.width : c.left, fixedY: cornerY === c.top ? c.top + c.height : c.top };
                    canvas.setPointerCapture(event.pointerId); event.preventDefault(); return;
                }
                let nearest = null, distance = 20;
                for (const [key, anchor] of Object.entries(this.anchors)) {
                    const d = Math.hypot(r.x + anchor.x * r.w - p.x, r.y + anchor.y * r.h - p.y);
                    if (d < distance) { nearest = key; distance = d; }
                }
                if (!nearest) {
                    if (this.photoZoom > 1) {
                        const viewport = this.$('.character-designer-viewport');
                        this.photoPan = { x: event.clientX, y: event.clientY, left: viewport.scrollLeft, top: viewport.scrollTop };
                        canvas.setPointerCapture(event.pointerId); event.preventDefault();
                    }
                    return;
                }
                this.dragKey = nearest;
                this.$('#character-designer-landmark').value = nearest;
                canvas.setPointerCapture(event.pointerId); event.preventDefault();
                this.landmarkReadouts(); this.drawPhoto();
            });
            canvas.addEventListener('pointermove', event => {
                if (this.cutoutEditor && this.cutoutPointer != null && this.cutoutPointer !== event.pointerId) return;
                if (this.photoPan) {
                    const viewport = this.$('.character-designer-viewport');
                    viewport.scrollLeft = this.photoPan.left + this.photoPan.x - event.clientX;
                    viewport.scrollTop = this.photoPan.top + this.photoPan.y - event.clientY;
                    return;
                }
                if (this.cutoutEditor && this.photoRect) {
                    const p = point(event), r = this.photoRect;
                    const position = { x: (p.x - r.x) / r.w * this.photo.source.width, y: (p.y - r.y) / r.h * this.photo.source.height };
                    this.cutoutCursor = position;
                    if (this.cutoutEditor.stroke) this.cutoutEditor.move(position);
                    this.scheduleCutoutDraw(!!this.cutoutEditor.stroke); return;
                }
                if (this.crop && this.cropDrag && this.photoRect) {
                    const p = point(event), r = this.photoRect, d = this.cropDrag;
                    const x = Math.max(0, Math.min(1, (p.x - r.x) / r.w)), y = Math.max(0, Math.min(1, (p.y - r.y) / r.h));
                    if (d.mode === 'move') this.crop = { ...d.start, left: Math.max(0, Math.min(1 - d.start.width, d.start.left + x - d.x)), top: Math.max(0, Math.min(1 - d.start.height, d.start.top + y - d.y)) };
                    else {
                        const fx = d.mode === 'resize' ? d.fixedX : d.x, fy = d.mode === 'resize' ? d.fixedY : d.y;
                        this.crop = { left: Math.min(fx, x), top: Math.min(fy, y), width: Math.abs(x - fx), height: Math.abs(y - fy) };
                    }
                    this.normalizeCrop(); this.cropReadouts(); this.drawPhoto(); return;
                }
                if (!this.dragKey || !this.photoRect) return;
                const p = point(event), r = this.photoRect;
                this.anchors[this.dragKey] = { x: Math.max(0, Math.min(1, (p.x - r.x) / r.w)), y: Math.max(0, Math.min(1, (p.y - r.y) / r.h)) };
                this.invalidatePhotoDraft();
                this.updatePhotoControls();
                this.landmarkReadouts(); this.drawPhoto();
            });
            const end = event => {
                if (this.cutoutEditor && this.cutoutPointer != null && event.pointerId !== this.cutoutPointer) return;
                if (this.cutoutEditor?.stroke) { this.cutoutEditor.end(event.type !== 'pointerup'); this.scheduleCutoutDraw(true); }
                this.cutoutPointer = null;
                this.dragKey = null; this.cropDrag = null; this.photoPan = null;
            };
            canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
            canvas.addEventListener('lostpointercapture', end);
            canvas.addEventListener('pointerleave', () => { if (this.cutoutEditor && !this.cutoutEditor.stroke) { this.cutoutCursor = null; this.scheduleCutoutDraw(); } });
        }

        clearPhoto() {
            cancelAnimationFrame(this.cutoutFrame); this.cutoutFrame = null;
            this.cutoutEditor = null; this.cutoutCursor = null; this.cutoutPointer = null; this.cutoutNeedsRender = false;
            this.photoGeneration = (this.photoGeneration || 0) + 1;
            this.cancelPhotoAnalysis();
            this.photo = null; this.analysis = null; this.anchors = {};
            this.photoZoom = 1; this.photoPan = null;
            this.crop = null; this.cropDrag = null; this.dragKey = null; this.photoRect = null;
            if (!this.dialog) return;
            this.$('#character-designer-file').value = '';
            this.$('#character-designer-photo').style.cursor = '';
            this.updatePhotoControls();
            this.$('#character-designer-detection').textContent = 'No photo selected';
            this.renderLandmarkList(); this.drawPhoto();
        }

        async openPhotoCloning() {
            if (!this.photo) throw new Error('Choose a photo first.');
            this.requirePhotoConsent();
            if (this.crop) throw new Error('Apply or cancel the crop first.');
            const generation = this.generation, photoGeneration = this.photoGeneration;
            const target = this.$('#character-designer-clone-target').value;
            const anchors = clone(this.anchors), photo = this.photo;
            const imageSrc = photo.canvas.toDataURL('image/png');
            const image = new Image(); image.src = imageSrc;
            await image.decode();
            if (generation !== this.generation || photoGeneration !== this.photoGeneration || !this.dialog) return;
            const stage = this.app.stage, manager = this.app.objects, js = this.app.jointSystem;
            const scale = Math.min(1, stage.width * .65 / image.width, stage.height * .85 / image.height);
            const source = new StageObject('image', {
                name: 'Photo source - ' + photo.name, imageSrc,
                width: image.width * scale, height: image.height * scale,
                x: (stage.width - image.width * scale) / 2, y: (stage.height - image.height * scale) / 2
            });
            source.imageElement = image;
            source.lockAspectRatio = true;
            const previousSelection = manager.getSelectedObjects().map(obj => obj.id);
            const suppress = manager._suppressHistory;
            manager._suppressHistory = true;
            try {
                manager.addObject(source); manager.select([source.id]);
                js.showSmartCut();
                const panel = document.getElementById('smart-cut-panel');
                const preset = target === 'face' ? 'face-rig-parts' : 'human-front';
                const row = panel?.querySelector(`.smc-preset-row[data-preset="${preset}"]`);
                if (!row) throw new Error('Photo cloning tools could not be opened.');
                row.click();
                const at = key => anchors[key] && { x: source.x + anchors[key].x * source.width, y: source.y + anchors[key].y * source.height };
                if (target === 'face') {
                    panel.querySelector('#sc-face-guide-workflow').click();
                    const eyes = ['Left', 'Right'].map(side => at('eye' + side));
                    const faceWidth = eyes.every(Boolean) ? Math.abs(eyes[0].x - eyes[1].x) / .58 : source.width * .5;
                    const mouthLeft = at('mouthLeft'), mouthRight = at('mouthRight');
                    const mouthWidth = mouthLeft && mouthRight ? Math.abs(mouthLeft.x - mouthRight.x) : faceWidth * .36;
                    const guides = js._smartCutFaceGuides;
                    const place = (key, center, width, height) => {
                        const guide = guides.find(item => item.partKey === key);
                        if (!guide || !center) return;
                        guide.w = Math.max(3, width); guide.h = Math.max(2, height);
                        guide.x = center.x - guide.w / 2; guide.y = center.y - guide.h / 2;
                    };
                    for (const side of ['Left', 'Right']) {
                        const outer = at('eye' + side), inner = at('eye' + side + 'Inner');
                        const center = outer && inner ? { x: (outer.x + inner.x) / 2, y: (outer.y + inner.y) / 2 } : outer;
                        const width = outer && inner ? Math.abs(outer.x - inner.x) : faceWidth * .18;
                        const top = at('eyeTop' + side), bottom = at('eyeBottom' + side);
                        const height = top && bottom ? Math.abs(bottom.y - top.y) : width * .42;
                        const key = side.toLowerCase();
                        place(key + 'Eye', center, width * 1.12, height * 1.25);
                        place(key + 'Iris', center, height * .85, height * .85);
                        place(key + 'Pupil', center, height * .42, height * .42);
                        place(key + 'Brow', at('brow' + side) || (center && { x: center.x, y: center.y - width * .6 }), width * 1.25, width * .3);
                        for (const guide of guides.filter(item => item.partKey.startsWith(key))) guide.name = 'Character ' + key + ' ' + guide.partKey.slice(key.length).toLowerCase();
                    }
                    const upper = at('upperLip'), lower = at('lowerLip');
                    const upperOuter = at('upperLipOuter'), lowerOuter = at('lowerLipOuter');
                    const mid = (a, b) => a && b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : a || b;
                    place('upperLip', mid(upper, upperOuter), mouthWidth, upper && upperOuter ? Math.abs(upper.y - upperOuter.y) : mouthWidth * .16);
                    place('lowerLip', mid(lower, lowerOuter), mouthWidth, lower && lowerOuter ? Math.abs(lower.y - lowerOuter.y) : mouthWidth * .18);
                    place('mouthOpening', mid(upper, lower), mouthWidth * .82, upper && lower ? Math.abs(lower.y - upper.y) : mouthWidth * .12);
                    place('teeth', mid(upper, lower), mouthWidth * .65, mouthWidth * .08);
                    js._updateSmartCutFaceGuideList(panel);
                } else {
                    // Smart Cut's geometry uses image-left/right internally;
                    // adapt anatomical photo keys without changing its saved format.
                    const points = {};
                    for (const [imageSide, characterSide] of [['left', 'Right'], ['right', 'Left']]) {
                        for (const joint of ['Shoulder', 'Elbow', 'Wrist', 'Hip', 'Knee', 'Ankle']) {
                            const point = at(joint[0].toLowerCase() + joint.slice(1) + characterSide);
                            if (point) points[imageSide + joint] = point;
                        }
                        const toe = at('toe' + characterSide);
                        if (toe) points[imageSide + 'ToeTip'] = toe;
                    }
                    if (at('chin')) points.jawTip = at('chin');
                    js._smartCutGuidedLandmarks = { points, active: false, currentIndex: 0, steps: JointSystem._getGuidedLandmarkSteps() };
                }
                stage.requestRender();
                this.close();
                Utils.showToast('Photo source opened in Smart Cut for part review.', 'success');
            } catch (error) {
                js._exitSmartCut?.(); document.getElementById('smart-cut-panel')?.remove();
                manager.removeObject(source.id); manager.select(previousSelection);
                throw error;
            } finally { manager._suppressHistory = suppress; }
            eventBus.emit('history:push');
        }

        async apply() {
            const blocker = this.photoCreateBlocker(true);
            if (blocker) throw new Error(blocker);
            if (this.photo && this.photoOutput === 'parts') { await this.openPhotoCloning(); return; }
            const generation = this.generation;
            const config = CharacterDesignSpec.validate({}, this.config).config;
            if (this.mode === 'edit' && !this.app.objects.getObjectById(this.target?.root?.id)) throw new Error('The target character no longer exists.');
            const views = this.mode === 'create' ? [...this.$('#character-designer-views').querySelectorAll('input:checked')].map(el => el.value) : [];
            const configs = [config, ...views.map(view => CharacterDesignSpec.validate({ styling: { view, sideFacing: view.endsWith('left') ? 'left' : 'right' } }, config).config)];
            for (const item of configs) await this.ensureArtwork(item);
            if (generation !== this.generation || !this.dialog) return;
            const js = this.app.jointSystem;
            const previousObjects = new Set(this.app.objects.objects);
            const originalSuppress = this.app.objects._suppressHistory;
            this.app.objects._suppressHistory = true;
            try {
                if (this.mode === 'edit') {
                    const oldView = this.target.root._svgCharacterConfig?.styling?.view || 'front';
                    if (/^side/.test(oldView) !== /^side/.test(config.styling.view)) throw new Error('Side rigs can only switch between side left and side right. Create a new character for a different rig family.');
                    if (!js.updateSvgAfricanCharacterAppearance(this.target, config)) throw new Error('Character update failed.');
                } else {
                    for (let i = 0; i < configs.length; i++) {
                        const rig = js.createSvgAfricanCharacter(configs[i], { ignoreSelectionReference: true });
                        if (!rig?.root) throw new Error('Character creation failed.');
                        if (i) {
                            rig.root.x += i * 190;
                        }
                    }
                }
            } catch (error) {
                // Creation is transactional. Existing objects and animations are
                // never removed if a later view fails to build.
                if (this.mode === 'create') this.app.objects.objects = this.app.objects.objects.filter(obj => previousObjects.has(obj));
                throw error;
            } finally { this.app.objects._suppressHistory = originalSuppress; }
            this.app.objects._resolvePins?.();
            this.app.objects.updateObjectList?.(); this.app.objects.updateProperties?.();
            this.app.stage.requestRender?.();
            eventBus.emit('history:push');
            Utils.showToast(this.mode === 'edit' ? 'SVG character updated.' : `${configs.length} SVG character${configs.length > 1 ? 's' : ''} created.`, 'success');
            if (this.builderUnderneath) this.app.closeSvgAfricanCharacterLibrary?.({ force: true });
            this.close({ focusStage: true });
        }

        close({ focusStage = false } = {}) {
            this.generation++;
            this.previewGeneration++;
            this.abortController?.abort();
            this.presetAbort?.abort();
            this.clearPhoto();
            this.resizeObserver?.disconnect();
            clearTimeout(this.previewTimer);
            if (this.sandbox) this.sandbox.disposed = true;
            this.sandbox = null;
            this.dialog?.remove(); this.dialog = null;
            this.busy = false;
            if (focusStage && this.app.stage.canvas) {
                this.app.stage.canvas.setAttribute('tabindex', '-1');
                this.app.stage.canvas.focus({ preventScroll: true });
            } else if (this.previousFocus?.isConnected) this.previousFocus.focus();
        }
    }
    globalThis.CharacterDesigner = CharacterDesigner;
})();
