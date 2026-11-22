/* Replacement artwork uses the kit's solved grip and motion, without modifying source objects. */
(() => {
    const roles = [['tool', 'Held tool'], ['chair', 'Chair'], ['desk', 'Table'], ['plate', 'Plate'], ['pot', 'Pot'], ['board', 'Board'], ['shelf', 'Shelf'], ['writing-paper', 'Paper']];
    Object.assign(JointSystem.prototype, {
        _refreshActivityKitReplacementControls(host, settings, enabled) {
            const slot = host.querySelector('[data-kit-replacement]'); if (!slot) return;
            slot.replaceChildren(); slot.hidden = !enabled; if (!enabled) return;
            const root = this.objects.getObjectById(host.dataset.rootId), action = this._armatureSelectedAction;
            const step = { kit: true, propReplacements: Utils.deepClone(settings.propReplacements || {}) };
            const message = document.createElement('p'); message.setAttribute('aria-live', 'polite');
            this._mountSequencePropFields(slot, step, {
                regular: true,
                alive: () => host.isConnected && this.objects.getObjectById(root.id) === root && this._armatureSelectedAction?.key === action?.key,
                status: text => { message.textContent = text; },
                invalidate: () => { this._stopArmatureClipPreview(); this._armaturePreparedAction = null; },
                changed: () => {
                    settings.propReplacements = Utils.deepClone(step.propReplacements || {});
                    for (const [role, key] of [['tool', 'existing'], ['chair', 'chair'], ['desk', 'desk']]) if (settings.propReplacements[role]) settings[key] = '';
                    this._prepareSelectedArmatureAction();
                }
            });
            const section = slot.querySelector('details'); section.open = true;
            section.querySelector('summary').textContent = 'Replace prop'; slot.append(message);
        },
        async _sequencePropImage(source) {
            const image = new Image(); image.crossOrigin = 'anonymous'; image.src = source; await image.decode();
            if (!image.naturalWidth || !image.naturalHeight) throw Error('The prop image is empty.');
            const scale = Math.min(1, 2048 / Math.max(image.naturalWidth, image.naturalHeight));
            const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
            canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
            const src = canvas.toDataURL('image/png');
            if (src.length > 6 * 1024 * 1024) throw Error('Use a smaller prop image (under 6 MB after preparation).');
            return src;
        },
        async _replaceCharacterSequenceProps(clip, step) {
            if (!step.kit) return;
            for (const [role, replacement] of Object.entries(step.propReplacements || {})) {
                if (!roles.some(([key]) => key === role)) throw Error('Unknown replacement prop role.');
                if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(replacement.src || '') || replacement.src.length > 6 * 1024 * 1024) throw Error('Invalid custom prop image. Select or upload it again.');
                const fit = { scale: replacement.scale ?? 1, x: replacement.x ?? 0, y: replacement.y ?? 0, rotation: replacement.rotation ?? 0 };
                if (!Object.values(fit).every(Number.isFinite) || fit.scale < .1 || fit.scale > 3 || Math.abs(fit.x) > 100 || Math.abs(fit.y) > 100 || Math.abs(fit.rotation) > 180) throw Error('Invalid custom prop fit.');
                if (['flipX', 'flipY'].some(key => replacement[key] !== undefined && typeof replacement[key] !== 'boolean')) throw Error('Invalid custom prop flip.');
                const props = clip.additions.filter(obj => obj.sceneAsset?.activityRole === role);
                if (!props.length) throw Error(`This activity has no ${roles.find(([key]) => key === role)[1].toLowerCase()}. Remove that replacement or choose another activity.`);
                for (const obj of props) {
                    const w = obj.width, h = obj.height;
                    const markup = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><g transform="translate(${w * (.5 + fit.x / 100)} ${h * (.5 + fit.y / 100)}) rotate(${fit.rotation}) scale(${fit.scale * (replacement.flipX ? -1 : 1)} ${fit.scale * (replacement.flipY ? -1 : 1)}) translate(${-w / 2} ${-h / 2})"><image href="${replacement.src}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/></g></svg>`;
                    const src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(markup);
                    obj.imageSrc = src; obj.imageElement = new Image(); obj.imageElement.src = src; await obj.imageElement.decode();
                    obj.name = replacement.name || obj.name; obj.sceneAsset.sequenceCustomArtwork = src;
                    const original = clip.originals.get(obj.id);
                    if (original) { original.imageSrc = src; original.sceneAsset = Utils.deepClone(obj.sceneAsset); }
                }
            }
        },
        _mountSequencePropFields(row, step, context) {
            const section = document.createElement('details'); section.className = 'sequence-props';
            section.innerHTML = '<summary>Props</summary><div class="sequence-fields"></div>';
            const fields = section.querySelector('div');
            const field = (text, input) => { const label = document.createElement('label'); label.append(document.createTextNode(text), input); fields.append(label); return input; };
            const toggle = (key, text) => { const input = document.createElement('input'); input.type = 'checkbox'; input.checked = !!step[key]; field(text, input).onchange = () => { context.invalidate(); step[key] = input.checked; }; };
            if (!context.regular) toggle('clearProps', 'Clear props from earlier steps');
            if (!step.kit) { row.append(section); return; }
            if (!context.regular) toggle('keepProps', 'Keep props after this step');
            const role = document.createElement('select'); roles.forEach(([value, text]) => role.append(new Option(text, value))); field('Replace kit item', role);
            const source = document.createElement('select'); source.append(new Option('Choose stage image', ''));
            this.objects.objects.filter(obj => obj.type === 'image' && obj.imageSrc && !obj.sceneAsset?.activityRootId && !(obj.joints || []).length).forEach(obj => source.append(new Option(obj.name || obj.id, obj.id)));
            field('Stage image (copy)', source);
            const preview = document.createElement('img'); preview.alt = 'Replacement prop'; preview.className = 'sequence-prop-preview'; section.append(preview);
            const refresh = () => { const value = step.propReplacements?.[role.value]; preview.hidden = !value; if (value) preview.src = value.src; else preview.removeAttribute('src');
                for (const input of fields.querySelectorAll('[data-prop-fit]')) { input.disabled = !value; input.value = value?.[input.dataset.propFit] ?? (input.dataset.propFit === 'scale' ? 1 : 0); }
                for (const input of fields.querySelectorAll('[data-prop-flip]')) { input.disabled = !value; input.checked = !!value?.[input.dataset.propFlip]; }
                const reset = section.querySelector('[data-prop-reset]'); if (reset) reset.disabled = !value;
            };
            let request = 0;
            const replace = async (src, name) => { const target = role.value, token = ++request; try {
                context.status('Preparing prop image...'); const prepared = await this._sequencePropImage(src);
                if (!context.alive() || token !== request || !section.isConnected) return; context.invalidate(); step.propReplacements ||= {};
                step.propReplacements[target] = { src: prepared, name, scale: 1, x: 0, y: 0, rotation: 0 }; refresh(); context.changed?.(); context.status('Prop selected. Preview the action to check its fit.');
            } catch (error) { context.status(error.message); } };
            source.onchange = () => { const obj = this.objects.getObjectById(source.value); if (obj) replace(obj.imageSrc, obj.name); };
            role.onchange = refresh;
            for (const [key, text, min, max, increment] of [['scale', 'Artwork size', .1, 3, .05], ['x', 'Horizontal offset (%)', -100, 100, 1], ['y', 'Vertical offset (%)', -100, 100, 1], ['rotation', 'Artwork rotation', -180, 180, 1]]) {
                const input = document.createElement('input'); input.type = 'number'; input.min = min; input.max = max; input.step = increment; input.dataset.propFit = key;
                field(text, input).onchange = () => {
                    const value = step.propReplacements?.[role.value]; if (!value) return;
                    const number = input.valueAsNumber;
                    if (!Number.isFinite(number) || number < min || number > max) { refresh(); context.status(`${text} must be between ${min} and ${max}.`); return; }
                    context.invalidate(); value[key] = number; context.changed?.();
                };
            }
            for (const [key, text] of [['flipX', 'Flip horizontally'], ['flipY', 'Flip vertically']]) {
                const input = document.createElement('input'); input.type = 'checkbox'; input.dataset.propFlip = key;
                field(text, input).onchange = () => { const value = step.propReplacements?.[role.value]; if (!value) return; context.invalidate(); value[key] = input.checked; context.changed?.(); };
            }
            const controls = document.createElement('div'); controls.className = 'sequence-library'; section.insertBefore(controls, fields);
            const button = (icon, title, handler) => { const node = document.createElement('button'); node.type = 'button'; node.title = title; node.setAttribute('aria-label', title); node.innerHTML = `<i class="fas fa-${icon}"></i>`; node.onclick = handler; controls.append(node); return node; };
            const upload = button('upload', 'Upload replacement prop', () => { const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/png,image/jpeg,image/webp'; input.onchange = async () => {
                const file = input.files[0]; if (!file) return;
                if (file.size > 10 * 1024 * 1024) { context.status('Choose an image under 10 MB.'); return; }
                const url = URL.createObjectURL(file); try { await replace(url, file.name); } finally { URL.revokeObjectURL(url); }
            }; input.click(); });
            upload.append(document.createTextNode(' Upload Prop'));
            const reset = button('compress-arrows-alt', 'Reset prop fit', () => {
                const value = step.propReplacements?.[role.value]; if (!value) return;
                context.invalidate(); Object.assign(value, {scale: 1, x: 0, y: 0, rotation: 0, flipX: false, flipY: false}); refresh(); context.changed?.(); context.status('Prop fit reset. Uploaded artwork retained.');
            }); reset.dataset.propReset = '';
            button('undo', 'Restore built-in prop', () => { request++; context.invalidate(); if (step.propReplacements) delete step.propReplacements[role.value]; refresh(); context.changed?.(); });
            refresh(); row.append(section);
        }
    });
})();
