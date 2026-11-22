/* ============================================
   Preview / Export Compatibility Checker
   ============================================ */

class PreviewExportCompat {
    constructor(app) {
        this.app = app;
        this.modal = null;
    }

    analyze() {
        const objects = this._getObjects();
        const scenes = this._getScenes();
        const features = [];
        const warnings = [];
        const errors = [];
        const seen = new Set();

        const addFeature = (key, label, detail, status = 'ready') => {
            if (seen.has(key)) return;
            seen.add(key);
            features.push({ key, label, detail, status });
        };

        if (!objects.length && !scenes.length) {
            warnings.push({
                title: 'Nothing to check yet',
                detail: 'Add objects or scenes, then run the checker before preview/export.'
            });
        }

        objects.forEach((obj) => {
            const type = String(obj?.type || '').toLowerCase();
            if (type) {
                addFeature(`object-${type}`, this._title(type), `${this._countObjectsByType(objects, type)} object(s) on stage`);
            }

            if (type === 'image' || obj?.imageSrc || obj?.src) {
                addFeature('images', 'Images and uploaded assets', 'Image objects are included in HTML preview and export.');
                if (!obj.imageSrc && !obj.src && !obj.imageData && !obj.dataUrl) {
                    errors.push({
                        title: 'Image source is missing',
                        detail: `${this._objectName(obj)} has no portable image source. Reinsert or relink the image before export.`
                    });
                }
                this._checkPortableUrl(obj.imageSrc || obj.src || obj.imageData || obj.dataUrl, obj, warnings);
            }

            if (type === 'text' || obj?.richText || obj?.bullets || obj?.textRuns) {
                addFeature('rich-text', 'Text, bullets, and styling', 'Formatted text is represented in preview/export data.');
            }

            if (obj?.textureImageSrc || obj?.fillImageSrc || obj?.pictureFill) {
                addFeature('picture-fill', 'Picture fill for shapes', 'Shape picture fills are detected for canvas preview/export.');
                this._checkPortableUrl(obj.textureImageSrc || obj.fillImageSrc, obj, warnings);
                if (obj?.textureImageSrc && type !== 'image' && obj.fillType !== 'picture') {
                    errors.push({
                        title: 'Inactive picture texture',
                        detail: `${this._objectName(obj)} has textureImageSrc but its fillType is not "picture". The texture will not render in stage, preview, or export.`
                    });
                }
            }

            if (Array.isArray(obj?.joints) && obj.joints.length) {
                addFeature('joints', 'Joint and body-part animation', 'Joint angles and body-part transforms are exported with runtime support.');
            }

            if (Array.isArray(obj?.flexPins) && obj.flexPins.length) {
                addFeature('flex', 'Flex pins and step-record bends', 'Flex pin angles are included in new-window preview and HTML export.');
            }

            if (obj?.rigging?.pins?.length || obj?.deformPins?.length || obj?.meshDeform) {
                addFeature('deform', 'Image deform pins', 'Deform data is present and should be verified in preview before final export.', 'check');
            }

            const garmentDeformationPolicy = String(
                obj?._ucGarmentDeformationPolicy
                || obj?.ucGarmentDeformationPolicy
                || ''
            ).toLowerCase();
            if ((obj?._ucGarmentLayer === true || obj?.ucGarmentLayer === true || obj?._ucAgbadaRobeLayer === true)
                && garmentDeformationPolicy
                && garmentDeformationPolicy !== 'rigid'
                && garmentDeformationPolicy !== 'limb-overlay') {
                addFeature('garment-deformation', 'Armature garment deformation', 'Waist-anchored garment deformation is included in timeline preview and export.');
            }

            if (obj?.universalFaceSet || obj?.faceSetId || obj?.facePartRole || obj?.isFaceSetPart) {
                addFeature('universal-face', 'Universal face sets', 'Face-set parts and labelled cut parts are detected.');
            }

            if (obj?.smartArtData || obj?.smartartData || obj?.smartArtType || type === 'smartart') {
                addFeature('smartart', 'SmartArt and charts', 'SmartArt objects are included as stage objects for preview/export.');
            }

            if (obj?.cloneBrushData || obj?.imageEditHistory || obj?.editedImageSrc || obj?.maskData) {
                addFeature('image-tools', 'Image edit tools', 'Baked image edits are portable when their source data is saved on the object.');
            }

            this._collectAnimationWarnings(obj, warnings);
        });

        if (this._hasAudio()) {
            addFeature('audio', 'Audio tracks', 'Audio is detected. Browser autoplay can still require user interaction in some preview windows.', 'check');
        }

        if (scenes.length > 1) {
            addFeature('multi-scene', 'Multiple scenes', `${scenes.length} scenes will be checked for scene playback/export.`);
        }

        if (scenes.some(scene => scene?.transition && scene.transition !== 'none')) {
            addFeature('scene-transitions', 'Scene transitions', 'Scene transition data is present for preview/export.');
        }

        const validations = this._validateCurrentHtmlBundle(objects, features, warnings, errors);
        this._validateAllSceneBundles(features, validations, warnings, errors);
        this._validateRuntimeHelpers(features, validations, errors);
        this._validateExportFormats(features, validations, warnings);
        const formatReadiness = this._buildFormatReadiness(features, validations, warnings, errors);
        const status = errors.length
            ? 'error'
            : warnings.length || features.some(f => f.status === 'check') || validations.some(v => v.status === 'check')
                ? 'check'
                : 'ready';
        return {
            status,
            features,
            validations,
            formatReadiness,
            warnings,
            errors,
            counts: {
                objects: objects.length,
                scenes: scenes.length || 1,
                animations: this._countAnimations(objects)
            }
        };
    }

    openReport() {
        const report = this.analyze();
        const modal = this._ensureModal();
        modal.querySelector('.preview-compat-body').innerHTML = this._renderReport(report);
        modal.classList.remove('hidden');

        const close = () => modal.classList.add('hidden');
        modal.querySelectorAll('[data-preview-compat-close]').forEach(btn => {
            btn.onclick = close;
        });
        modal.querySelectorAll('[data-preview-compat-action]').forEach((btn) => {
            btn.addEventListener('click', () => this.runReadinessAction(btn.dataset.previewCompatAction));
        });
    }

    _ensureModal() {
        if (this.modal && this.modal.isConnected) return this.modal;

        const modal = document.createElement('div');
        modal.id = 'preview-export-compat-modal';
        modal.className = 'modal hidden preview-compat-modal';
        modal.innerHTML = `
            <div class="modal-content preview-compat-content">
                <div class="modal-header preview-compat-header">
                    <h3><i class="fas fa-clipboard-check"></i> Preview / Export Check</h3>
                    <button class="modal-close" data-preview-compat-close aria-label="Close">&times;</button>
                </div>
                <div class="preview-compat-body"></div>
            </div>
        `;
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.classList.add('hidden');
            }
        });
        document.body.appendChild(modal);
        this.modal = modal;
        return modal;
    }

    _renderReport(report) {
        const esc = (typeof Utils !== 'undefined' && Utils.escapeHtml)
            ? Utils.escapeHtml.bind(Utils)
            : (value) => String(value ?? '').replace(/[&<>"']/g, ch => ({
                '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
            }[ch]));

        const statusLabel = report.status === 'ready' ? 'Ready' : report.status === 'error' ? 'Needs attention' : 'Review';
        const statusDetail = report.status === 'ready'
            ? 'No obvious preview/export risks were found.'
            : report.status === 'error'
                ? 'Fix the items below before relying on export.'
                : 'Preview this scene and review the notes below before final export.';

        const featureRows = report.features.length
            ? report.features.map(feature => `
                <div class="preview-compat-row preview-compat-row-${esc(feature.status)}">
                    <span class="preview-compat-dot"></span>
                    <div>
                        <strong>${esc(feature.label)}</strong>
                        <p>${esc(feature.detail)}</p>
                    </div>
                </div>
            `).join('')
            : '<p class="preview-compat-empty">No stage features detected yet.</p>';

        const issueRows = [
            ...report.errors.map(issue => ({ ...issue, level: 'error' })),
            ...report.warnings.map(issue => ({ ...issue, level: 'check' }))
        ].map(issue => `
            <div class="preview-compat-issue preview-compat-issue-${esc(issue.level)}">
                <strong>${esc(issue.title)}</strong>
                <p>${esc(issue.detail)}</p>
            </div>
        `).join('');

        const formatRows = (report.formatReadiness || []).map(format => `
            <div class="preview-format-card preview-format-card-${esc(format.status)}">
                <div class="preview-format-card-heading">
                    <strong>${esc(format.label)}</strong>
                    <span>${esc(format.score)}%</span>
                </div>
                <p>${esc(format.detail)}</p>
                <button class="preview-format-action" data-preview-compat-action="${esc(format.label === 'New-window preview' ? 'preview' : 'export')}">
                    <i class="fas ${format.label === 'New-window preview' ? 'fa-eye' : 'fa-download'}"></i> ${format.label === 'New-window preview' ? 'Preview' : 'Open export'}
                </button>
            </div>
        `).join('') || '<p class="preview-compat-empty">No export formats were checked.</p>';

        return `
            <div class="preview-compat-summary preview-compat-summary-${esc(report.status)}">
                <div>
                    <strong>${esc(statusLabel)}</strong>
                    <p>${esc(statusDetail)}</p>
                </div>
                <div class="preview-compat-counts">
                    <span>${esc(report.counts.objects)} objects</span>
                    <span>${esc(report.counts.animations)} animations</span>
                    <span>${esc(report.counts.scenes)} scene(s)</span>
                </div>
            </div>
            <h4>Format Readiness</h4>
            <div class="preview-format-grid">${formatRows}</div>
            <h4>Detected Tool Support</h4>
            <div class="preview-compat-list">${featureRows}</div>
            <h4>Current Scene Runtime Validation</h4>
            <div class="preview-compat-list">${this._renderValidationRows(report.validations, esc)}</div>
            <h4>Items To Review</h4>
            <div class="preview-compat-list">${issueRows || '<p class="preview-compat-empty">No issues found.</p>'}</div>
            <div class="preview-compat-actions">
                <button class="btn btn-secondary" data-preview-compat-close>Close</button>
            </div>
        `;
    }

    _renderValidationRows(validations, esc) {
        if (!validations || !validations.length) {
            return '<p class="preview-compat-empty">Runtime validation has not run.</p>';
        }
        return validations.map(item => `
            <div class="preview-compat-row preview-compat-row-${esc(item.status)}">
                <span class="preview-compat-dot"></span>
                <div>
                    <strong>${esc(item.label)}</strong>
                    <p>${esc(item.detail)}</p>
                </div>
            </div>
        `).join('');
    }

    runReadinessAction(action) {
        if (action === 'preview') {
            const preview = document.getElementById('btn-preview-current-scene') || document.getElementById('btn-preview');
            if (preview) {
                this.modal?.classList.add('hidden');
                preview.click();
                return true;
            }
        }
        const exportButton = document.getElementById('btn-export');
        if (exportButton) {
            this.modal?.classList.add('hidden');
            exportButton.click();
            return true;
        }
        if (typeof Utils !== 'undefined' && Utils.showToast) Utils.showToast('That action is not available yet.', 'warning');
        return false;
    }

    _getObjects() {
        return Array.isArray(this.app?.objects?.objects) ? this.app.objects.objects : [];
    }

    _getScenes() {
        if (Array.isArray(this.app?.scenes)) return this.app.scenes;
        if (Array.isArray(this.app?.sceneManager?.scenes)) return this.app.sceneManager.scenes;
        return [];
    }

    _hasAudio() {
        const audio = this.app?.audioTimeline;
        if (!audio) return false;
        if (Array.isArray(audio.tracks) && audio.tracks.length) return true;
        if (Array.isArray(audio.clips) && audio.clips.length) return true;
        if (typeof audio.getState === 'function') {
            try {
                const state = audio.getState();
                return !!(state?.clips?.length || state?.tracks?.length || state?.audioData);
            } catch (_) {
                return false;
            }
        }
        return false;
    }

    _countObjectsByType(objects, type) {
        return objects.filter(obj => String(obj?.type || '').toLowerCase() === type).length;
    }

    _countAnimations(objects) {
        return objects.reduce((total, obj) => total + (Array.isArray(obj?.animations) ? obj.animations.length : 0), 0);
    }

    _objectName(obj) {
        return obj?.name || obj?.label || obj?.id || 'An object';
    }

    _title(value) {
        return String(value || '')
            .replace(/[-_]+/g, ' ')
            .replace(/\b\w/g, letter => letter.toUpperCase());
    }

    _checkPortableUrl(url, obj, warnings) {
        if (!url || typeof url !== 'string') return;
        if (/^blob:/i.test(url)) {
            warnings.push({
                title: 'Temporary image source',
                detail: `${this._objectName(obj)} uses a temporary blob URL. Save or reinsert it so preview/export can reload it.`
            });
        }
        if (/^https?:\/\//i.test(url)) {
            warnings.push({
                title: 'External image source',
                detail: `${this._objectName(obj)} uses an external URL. Export may depend on network access and CORS permissions.`
            });
        }
    }

    _collectAnimationWarnings(obj, warnings) {
        const animations = Array.isArray(obj?.animations) ? obj.animations : [];
        if (!animations.length) return;

        const knownProps = new Set([
            'x', 'y', 'width', 'height', 'rotation', 'opacity', 'scaleX', 'scaleY',
            'fill', 'stroke', 'strokeWidth', 'visible', 'imageSrc', 'textureImageSrc', 'flipH', 'flipV',
            'tiltX', 'tiltY', 'pinOffsetX', 'pinOffsetY', 'pinAnchorX', 'pinAnchorY',
            '_facialBasePinOffsetX', '_facialBasePinOffsetY', 'mouthOpen',
            'eyeOpen', 'browOffsetY', 'lookX', 'lookY'
        ]);
        const knownPrefixes = [
            'jointAngle_', 'jointTiltX_', 'jointTiltY_', 'jointCrossOffset_',
            'flexPinAngle_', 'facePart_', 'universalFace_', 'stageCamera_'
        ];

        animations.forEach((anim) => {
            const generated = Array.isArray(anim?.generated) ? anim.generated : [];
            generated.forEach((entry) => {
                const prop = String(entry?.property || '');
                if (!prop) return;
                const supported = knownProps.has(prop) || knownPrefixes.some(prefix => prop.startsWith(prefix));
                if (!supported) {
                    warnings.push({
                        title: 'Review animated property',
                        detail: `${this._objectName(obj)} animates "${prop}". Preview it before export to confirm this newer property is supported.`
                    });
                }
            });
        });
    }

    _validateCurrentHtmlBundle(objects, features, warnings, errors) {
        const validations = [];
        const add = (label, detail, status = 'ready') => validations.push({ label, detail, status });
        const exporter = this.app?.exporter;

        if (!exporter || typeof exporter.runPreviewExportStateSelfCheck !== 'function') {
            add('HTML runtime bundle', 'Exporter self-check is not available in this session.', 'check');
            return validations;
        }

        let result;
        try {
            result = exporter.runPreviewExportStateSelfCheck({ showToast: false });
        } catch (err) {
            errors.push({
                title: 'Preview/export self-check failed',
                detail: err?.message || 'The current scene could not be serialized for preview/export.'
            });
            add('HTML runtime bundle', 'Self-check threw an error while building the current scene bundle.', 'error');
            return validations;
        }

        if (!result?.ok) {
            const failed = Object.entries(result?.checks || {})
                .filter(([, ok]) => !ok)
                .map(([name]) => name)
                .join(', ') || 'unknown check';
            errors.push({
                title: 'Preview/export state check failed',
                detail: `Exporter reported failed check(s): ${failed}.`
            });
            add('HTML runtime bundle', `Failed: ${failed}.`, 'error');
            return validations;
        }

        add('HTML runtime bundle', 'Object and animation code generated without changing the stage state.');

        const objectCode = String(result.bundle?.objectCode || '');
        const animCode = String(result.bundle?.animCode || '');
        const hasFeature = key => features.some(feature => feature.key === key);
        const hasAnimatedProp = prefix => objects.some(obj =>
            (Array.isArray(obj?.animations) ? obj.animations : []).some(anim =>
                (Array.isArray(anim?.generated) ? anim.generated : []).some(prop =>
                    String(prop?.property || '').startsWith(prefix)
                )
            )
        );

        const checks = [
            {
                when: hasFeature('images'),
                label: 'Image serialization',
                marker: /imageSrc|dataUrl|imageData|src/,
                source: objectCode,
                detail: 'Image source data is present in the current scene bundle.'
            },
            {
                when: hasFeature('picture-fill'),
                label: 'Picture fill serialization',
                marker: /textureImageSrc|fillImageSrc|pictureFill/,
                source: objectCode,
                detail: 'Shape picture-fill data is present in the current scene bundle.'
            },
            {
                when: hasFeature('joints'),
                label: 'Joint serialization',
                marker: /joints/,
                source: objectCode,
                detail: 'Joint data is present in the current scene bundle.'
            },
            {
                when: hasAnimatedProp('jointAngle_') || hasAnimatedProp('jointTilt') || hasAnimatedProp('jointCrossOffset_'),
                label: 'Joint animation serialization',
                marker: /jointAngle_|jointTiltX_|jointTiltY_|jointCrossOffset_/,
                source: animCode,
                detail: 'Joint animation properties are present in the current scene bundle.'
            },
            {
                when: hasFeature('flex'),
                label: 'Flex pin serialization',
                marker: /flexPins/,
                source: objectCode,
                detail: 'Flex pin data is present in the current scene bundle.'
            },
            {
                when: hasAnimatedProp('flexPinAngle_'),
                label: 'Flex step-record serialization',
                marker: /flexPinAngle_/,
                source: animCode,
                detail: 'Flex pin step-record properties are present in the current scene bundle.'
            },
            {
                when: hasFeature('deform'),
                label: 'Deform pin serialization',
                marker: /rigging|deformPins|meshDeform/,
                source: objectCode,
                detail: 'Image deform data is present in the current scene bundle.'
            },
            {
                when: hasFeature('universal-face'),
                label: 'Universal face serialization',
                marker: /universalFaceSet|faceSetId|facePartRole|isFaceSetPart/,
                source: objectCode,
                detail: 'Universal face-set data is present in the current scene bundle.'
            },
            {
                when: hasFeature('smartart'),
                label: 'SmartArt serialization',
                marker: /smartArtData|smartartData|smartArtType|smartart/,
                source: objectCode,
                detail: 'SmartArt data is present in the current scene bundle.'
            }
        ];

        checks.forEach(check => {
            if (!check.when) return;
            if (check.marker.test(check.source)) {
                add(check.label, check.detail);
            } else {
                warnings.push({
                    title: `${check.label} needs review`,
                    detail: 'The feature was detected on stage, but its expected export marker was not found in the current scene bundle.'
                });
                add(check.label, 'Expected export marker was not found in the current scene bundle.', 'check');
            }
        });

        return validations;
    }

    _validateAllSceneBundles(features, validations, warnings, errors) {
        if (!features.some(feature => feature.key === 'multi-scene')) return;

        const exporter = this.app?.exporter;
        if (!exporter
            || typeof exporter._getAllScenesData !== 'function'
            || typeof exporter._loadSceneForExport !== 'function'
            || typeof exporter.runPreviewExportStateSelfCheck !== 'function') {
            validations.push({
                label: 'All scenes runtime validation',
                detail: 'Exporter scene validation hooks are not available. Use Preview all scenes for visual confirmation.',
                status: 'check'
            });
            return;
        }

        let scenesData;
        try {
            scenesData = exporter._getAllScenesData();
        } catch (err) {
            errors.push({
                title: 'All-scenes export data could not be built',
                detail: err?.message || 'The exporter could not collect scene data for validation.'
            });
            validations.push({
                label: 'All scenes runtime validation',
                detail: 'Failed while collecting scene data.',
                status: 'error'
            });
            return;
        }

        if (!Array.isArray(scenesData) || !scenesData.length) {
            validations.push({
                label: 'All scenes runtime validation',
                detail: 'No scene data was available to validate.',
                status: 'check'
            });
            return;
        }

        const failed = [];
        const checked = [];
        scenesData.forEach((sceneData, index) => {
            let restore = null;
            try {
                restore = exporter._loadSceneForExport(sceneData);
                const result = exporter.runPreviewExportStateSelfCheck({ showToast: false });
                if (!result?.ok) {
                    const failedChecks = Object.entries(result?.checks || {})
                        .filter(([, ok]) => !ok)
                        .map(([name]) => name)
                        .join(', ') || 'unknown check';
                    failed.push(`Scene ${index + 1}: ${failedChecks}`);
                } else {
                    checked.push(index + 1);
                }
            } catch (err) {
                failed.push(`Scene ${index + 1}: ${err?.message || 'validation error'}`);
            } finally {
                try {
                    if (typeof restore === 'function') restore();
                } catch (_) {}
            }
        });

        if (failed.length) {
            errors.push({
                title: 'One or more scenes failed preview/export validation',
                detail: failed.slice(0, 5).join('; ') + (failed.length > 5 ? `; ${failed.length - 5} more` : '')
            });
            validations.push({
                label: 'All scenes runtime validation',
                detail: `${failed.length} of ${scenesData.length} scene(s) failed serialization checks.`,
                status: 'error'
            });
            return;
        }

        validations.push({
            label: 'All scenes runtime validation',
            detail: `${checked.length} scene(s) generated object and animation code without changing stage state. Use Preview all scenes for final visual confirmation.`,
            status: 'ready'
        });
    }

    _validateRuntimeHelpers(features, validations, errors) {
        const exporter = this.app?.exporter;
        if (!exporter) {
            validations.push({
                label: 'Generated runtime helpers',
                detail: 'Exporter is not available for helper validation.',
                status: 'check'
            });
            return;
        }

        const source = this._getExporterRuntimeSource(exporter);
        if (!source) {
            validations.push({
                label: 'Generated runtime helpers',
                detail: 'Could not inspect exporter helper source in this session.',
                status: 'check'
            });
            return;
        }

        const hasFeature = key => features.some(feature => feature.key === key);
        const required = [
            { name: 'applyInitialFromStates', marker: /function\s+applyInitialFromStates\b/ },
            { name: 'initializedPropsByObject', marker: /initializedPropsByObject/ },
            { name: 'initializedProps', marker: /\binitializedProps\b/ }
        ];

        if (hasFeature('joints') || hasFeature('flex')) {
            required.push({ name: 'applyJointAngles', marker: /function\s+applyJointAngles\b/ });
        }
        if (hasFeature('flex')) {
            required.push({ name: 'flexPinAngle_', marker: /flexPinAngle_/ });
        }
        if (hasFeature('deform')) {
            required.push({ name: 'RigUtils', marker: /\bRigUtils\b/ });
        }
        if (hasFeature('garment-deformation')) {
            required.push({ name: 'getRuntimeGarmentDeformationTransform', marker: /function\s+getRuntimeGarmentDeformationTransform\b/ });
        }
        if (hasFeature('audio')) {
            required.push(
                { name: 'waitForRuntimeAudioReady', marker: /function\s+waitForRuntimeAudioReady\b/ },
                { name: 'runtime audio sync', marker: /syncRuntimeAudio|syncSceneAudio/ }
            );
        }
        if (hasFeature('multi-scene')) {
            required.push(
                { name: 'cloneRuntimeValue', marker: /function\s+cloneRuntimeValue\b/ },
                { name: 'preloadRuntimeObjectAssets', marker: /function\s+preloadRuntimeObjectAssets\b/ },
                { name: 'drawRuntimeSceneFrame', marker: /function\s+drawRuntimeSceneFrame\b/ },
                { name: 'startScenePlayback', marker: /function\s+startScenePlayback\b/ }
            );
        }

        const missing = required
            .filter(item => !item.marker.test(source))
            .map(item => item.name);

        if (missing.length) {
            errors.push({
                title: 'Generated HTML runtime helper is missing',
                detail: `Missing helper(s): ${missing.join(', ')}. Preview/export may show a ReferenceError.`
            });
            validations.push({
                label: 'Generated runtime helpers',
                detail: `${missing.length} required helper(s) are missing: ${missing.join(', ')}.`,
                status: 'error'
            });
            return;
        }

        validations.push({
            label: 'Generated runtime helpers',
            detail: `${required.length} required helper marker(s) found for the detected stage features.`,
            status: 'ready'
        });
    }

    _getExporterRuntimeSource(exporter) {
        if (typeof exporter.__runtimeSourceForCheck === 'string') {
            return exporter.__runtimeSourceForCheck;
        }
        const methods = [
            'exportHTML5',
            '_exportHTML5AllScenes',
            '_getSingleSceneRuntimeAudioCode',
            '_getMultiSceneRuntimeAudioCode',
            'createCurrentHTML5PlaybackBundle',
            'runPreviewExportStateSelfCheck'
        ];
        return methods
            .map(name => {
                try {
                    return typeof exporter[name] === 'function' ? Function.prototype.toString.call(exporter[name]) : '';
                } catch (_) {
                    return '';
                }
            })
            .filter(Boolean)
            .join('\n');
    }

    _buildFormatReadiness(features, validations, warnings, errors) {
        const hasFeature = key => features.some(feature => feature.key === key);
        const validationFor = label => validations.find(item => item.label === label);
        const hasRuntimeFailure = validations.some(item => item.status === 'error');
        const hasAudio = hasFeature('audio');
        const advancedCanvasContent = [
            'flex', 'deform', 'universal-face', 'image-tools', 'layer-mask', 'joints'
        ].some(hasFeature);
        const hasMultiScene = hasFeature('multi-scene');
        const hasExternalAssets = warnings.some(warning => /Temporary image source|External image source/.test(warning.title || ''));
        const htmlRuntime = validationFor('Generated runtime helpers');
        const video = validationFor('MP4/WebM video export');
        const powerpoint = validationFor('PowerPoint export');

        const make = (label, status, detail) => ({
            label,
            status,
            score: status === 'ready' ? 100 : status === 'check' ? 75 : 30,
            detail
        });

        const result = [];
        result.push(make(
            'New-window preview',
            errors.length || hasRuntimeFailure ? 'error' : (hasAudio || hasExternalAssets ? 'check' : 'ready'),
            errors.length || hasRuntimeFailure
                ? 'Resolve runtime helper or asset errors before relying on preview.'
                : hasAudio
                    ? 'Ready after the preview window has been allowed to start audio.'
                    : hasExternalAssets
                        ? 'Ready to test, but external or temporary assets may not reload consistently.'
                        : 'Current stage data is ready for a normal preview run.'
        ));
        result.push(make(
            'Interactive HTML',
            errors.length || hasRuntimeFailure || htmlRuntime?.status === 'error'
                ? 'error'
                : (hasAudio || hasExternalAssets ? 'check' : 'ready'),
            errors.length || hasRuntimeFailure || htmlRuntime?.status === 'error'
                ? 'Generated HTML needs the missing runtime support before export.'
                : hasAudio
                    ? 'HTML retains audio, but browsers can require a play interaction before sound begins.'
                    : hasMultiScene
                        ? 'Multi-scene playback helpers are present for the current project.'
                        : 'Portable stage data is ready for HTML export.'
        ));
        result.push(make(
            'MP4 or WebM video',
            video?.status === 'ready' ? (hasExternalAssets ? 'check' : 'ready') : 'check',
            video?.status === 'ready'
                ? hasAudio
                    ? 'Canvas capture is available and the project audio can be mixed into video output.'
                    : 'Canvas capture is available for rendered video output.'
                : 'This browser needs compatible canvas capture and MediaRecorder support for video export.'
        ));
        result.push(make(
            'PowerPoint',
            powerpoint?.status === 'ready' ? (advancedCanvasContent ? 'check' : 'ready') : 'check',
            powerpoint?.status === 'ready'
                ? advancedCanvasContent
                    ? 'Ready with video-backed playback for advanced motion; check the final slide show output.'
                    : 'PowerPoint libraries are loaded for the current project.'
                : 'Refresh the app if PowerPoint libraries have not finished loading.'
        ));
        result.push(make(
            'GIF and static formats',
            advancedCanvasContent || hasAudio ? 'check' : 'ready',
            hasAudio
                ? 'GIF does not include audio. Use HTML or video when sound matters.'
                : advancedCanvasContent
                    ? 'Advanced rig and image effects may flatten in static or vector formats.'
                    : 'Simple shapes, text, and images are suitable for static export.'
        ));
        return result;
    }

    _validateExportFormats(features, validations, warnings) {
        const exporter = this.app?.exporter;
        const hasFeature = key => features.some(feature => feature.key === key);
        const hasAnimatedContent = this._getObjects().some(obj => Array.isArray(obj?.animations) && obj.animations.length);
        const canvas = this.app?.stage?.canvas || (typeof document !== 'undefined' ? document.querySelector?.('canvas') : null);
        const canCaptureCanvas = !!(canvas && typeof canvas.captureStream === 'function');
        const mediaRecorder = typeof MediaRecorder !== 'undefined' ? MediaRecorder : null;
        const hasMediaRecorder = !!mediaRecorder;

        validations.push({
            label: 'HTML preview/export format',
            detail: 'HTML is the reference export path for interactive preview and multi-scene playback.',
            status: 'ready'
        });

        if (hasMediaRecorder && canCaptureCanvas) {
            const mp4Candidates = typeof exporter?._getMp4ExportCandidates === 'function'
                ? exporter._getMp4ExportCandidates()
                : [];
            const mp4Supported = mp4Candidates.some(candidate => {
                try {
                    return mediaRecorder.isTypeSupported?.(candidate.mimeType);
                } catch (_) {
                    return false;
                }
            });
            const webmSupported = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
                .some(type => {
                    try {
                        return mediaRecorder.isTypeSupported?.(type);
                    } catch (_) {
                        return false;
                    }
                });

            validations.push({
                label: 'MP4/WebM video export',
                detail: mp4Supported
                    ? 'Canvas recording is available and this browser reports MP4 support.'
                    : webmSupported
                        ? 'Canvas recording is available. MP4 may fall back to WebM depending on browser support.'
                        : 'Canvas recording is available, but no common MP4/WebM MIME type reported support.',
                status: mp4Supported || webmSupported ? 'ready' : 'check'
            });
        } else {
            validations.push({
                label: 'MP4/WebM video export',
                detail: 'Canvas capture or MediaRecorder is not available in this browser session.',
                status: 'check'
            });
            warnings.push({
                title: 'Video export needs browser recording support',
                detail: 'Use a modern Chromium, Edge, or Safari browser if MP4/WebM export is unavailable.'
            });
        }

        const hasPptx = typeof PptxGenJS !== 'undefined';
        const hasZip = typeof JSZip !== 'undefined';
        validations.push({
            label: 'PowerPoint export',
            detail: hasPptx && hasZip
                ? hasAnimatedContent
                    ? 'PowerPoint libraries are loaded. Animated PowerPoint uses video-backed playback for motion.'
                    : 'PowerPoint libraries are loaded for static slide export.'
                : 'PowerPoint export library support is not fully loaded in this session.',
            status: hasPptx && hasZip ? 'ready' : 'check'
        });
        if (!(hasPptx && hasZip)) {
            warnings.push({
                title: 'PowerPoint export libraries need review',
                detail: 'Refresh the app if PowerPoint export is selected and the library check does not become ready.'
            });
        }

        validations.push({
            label: 'GIF export',
            detail: 'GIF export uses rendered canvas frames. Audio is not included in GIF output.',
            status: hasFeature('audio') ? 'check' : 'ready'
        });
        if (hasFeature('audio')) {
            warnings.push({
                title: 'GIF does not include audio',
                detail: 'Use MP4/WebM or HTML export when audio must be preserved.'
            });
        }

        const vectorHeavy = hasFeature('deform') || hasFeature('flex') || hasFeature('universal-face') || hasFeature('image-tools');
        validations.push({
            label: 'SVG/Lottie/static image export',
            detail: vectorHeavy
                ? 'Advanced image/rig effects should be confirmed with HTML or video export; static/vector exports may flatten or omit motion.'
                : 'Static/vector export paths should be suitable for simple shapes, text, and images.',
            status: vectorHeavy ? 'check' : 'ready'
        });
    }
}

window.PreviewExportCompat = PreviewExportCompat;
