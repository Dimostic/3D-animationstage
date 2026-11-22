/* ============================================
   Animation Stage - Simple Face Sets
   Editable cartoon eyes, brows, and lips as normal stage objects.
   Legacy landmark/cutout rig archived at:
   archive/face-rig/face-rig.legacy-20260613-before-simple-sets.js
   ============================================ */

(function () {
    const SETS = {
        classic: {
            name: 'Classic Brown',
            description: 'Warm brown eyes, dark brows, soft red lips',
            iris: '#6b3f21',
            pupil: '#111111',
            brow: '#2f1b14',
            lip: '#d94c64',
            lipDark: '#7f1d2d',
            eyeScale: 1,
            mouthScale: 1,
            browTilt: 8
        },
        blue: {
            name: 'Blue Smile',
            description: 'Bright blue eyes, charcoal brows, rose lips',
            iris: '#2d8cff',
            pupil: '#0b1220',
            brow: '#1f2937',
            lip: '#e35b83',
            lipDark: '#8d1f46',
            eyeScale: 1.04,
            mouthScale: 1.05,
            browTilt: 5
        },
        green: {
            name: 'Green Soft',
            description: 'Green irises, auburn brows, peach lips',
            iris: '#2e9f62',
            pupil: '#0f172a',
            brow: '#7c3f1d',
            lip: '#e7796b',
            lipDark: '#8f2c28',
            eyeScale: 0.96,
            mouthScale: 0.96,
            browTilt: 10
        },
        amber: {
            name: 'Amber Oval',
            description: 'Amber eyes, rounded brows, coral lips',
            iris: '#c48624',
            pupil: '#111111',
            brow: '#5b3423',
            lip: '#ef6f5e',
            lipDark: '#84231f',
            eyeScale: 1.12,
            mouthScale: 0.9,
            browTilt: 2
        },
        violet: {
            name: 'Violet Large',
            description: 'Large violet eyes, slim brows, pink lips',
            iris: '#7c3aed',
            pupil: '#111827',
            brow: '#3b0764',
            lip: '#f472b6',
            lipDark: '#9d174d',
            eyeScale: 1.25,
            mouthScale: 0.82,
            browTilt: 12
        },
        gray: {
            name: 'Gray Calm',
            description: 'Gray irises, black brows, muted lips',
            iris: '#64748b',
            pupil: '#050505',
            brow: '#171717',
            lip: '#b85c74',
            lipDark: '#642135',
            eyeScale: 0.9,
            mouthScale: 1.08,
            browTilt: 0
        },
        hazel: {
            name: 'Hazel Wide',
            description: 'Hazel eyes, angled brows, plum lips',
            iris: '#8a6b24',
            pupil: '#111111',
            brow: '#3f2b1d',
            lip: '#b84c6f',
            lipDark: '#5f1730',
            eyeScale: 1.16,
            mouthScale: 1.15,
            browTilt: 14
        },
        comic: {
            name: 'Comic Bold',
            description: 'Bold black pupils, thick brows, red lips',
            iris: '#101010',
            pupil: '#000000',
            brow: '#000000',
            lip: '#ef233c',
            lipDark: '#7f0012',
            eyeScale: 1.08,
            mouthScale: 1.22,
            browTilt: 16
        },
        child: {
            name: 'Child Bright',
            description: 'Large friendly eyes, soft brows, playful pink lips',
            iris: '#38bdf8',
            pupil: '#0f172a',
            brow: '#5b3a29',
            lip: '#fb7185',
            lipDark: '#9f1239',
            eyeScale: 1.3,
            mouthScale: 0.9,
            browTilt: 7
        },
        adult: {
            name: 'Adult Neutral',
            description: 'Balanced human-like proportions with natural tones',
            iris: '#5b4636',
            pupil: '#111111',
            brow: '#2f2118',
            lip: '#c86b78',
            lipDark: '#73303a',
            eyeScale: 0.98,
            mouthScale: 1,
            browTilt: 4
        },
        softReal: {
            name: 'Soft Real',
            description: 'Gentle realistic colors, calm brows, muted lips',
            iris: '#4f7c8a',
            pupil: '#0f172a',
            brow: '#3f342b',
            lip: '#b96b73',
            lipDark: '#6d3037',
            eyeScale: 0.94,
            mouthScale: 0.98,
            browTilt: 2
        },
        profile: {
            name: 'Profile Starter',
            description: 'Designed for side-view placement with compact mouth and eye',
            iris: '#2f6f8f',
            pupil: '#111827',
            brow: '#1f2937',
            lip: '#d45d6b',
            lipDark: '#7a2530',
            eyeScale: 0.92,
            mouthScale: 0.82,
            browTilt: 10
        }
    };

    const SET_KEYS = Object.keys(SETS);
    const MOUTH_STYLES = {
        classic: { width: 1.02, height: 1, upper: 0.95, lower: 1.08, smile: 0.02 },
        blue: { width: 1.08, height: 0.96, upper: 0.9, lower: 1.02, smile: 0.06 },
        green: { width: 0.96, height: 0.92, upper: 0.92, lower: 0.96, smile: 0.01 },
        amber: { width: 0.9, height: 1.05, upper: 1.02, lower: 1.12, smile: 0 },
        violet: { width: 0.78, height: 0.86, upper: 0.9, lower: 0.92, smile: 0.03 },
        gray: { width: 1.02, height: 0.82, upper: 0.8, lower: 0.88, smile: -0.02 },
        hazel: { width: 1.16, height: 1.08, upper: 1.05, lower: 1.18, smile: 0.05 },
        comic: { width: 1.26, height: 1.14, upper: 1.1, lower: 1.2, smile: 0.08 },
        child: { width: 0.92, height: 0.9, upper: 0.84, lower: 0.98, smile: 0.08 },
        adult: { width: 1, height: 0.95, upper: 0.9, lower: 1.02, smile: 0.02 },
        softReal: { width: 0.96, height: 0.88, upper: 0.84, lower: 0.96, smile: 0.01 },
        profile: { width: 0.72, height: 0.94, upper: 0.86, lower: 1.02, smile: 0 }
    };
    const DEFAULT_FACE_MOTIONS = {
        neutral: { name: 'Neutral / Clear Motion', description: 'Remove Face Set motion tracks from the target set.' },
        smile: { name: 'Smile', description: 'Soft smile with lifted lips and relaxed brows.' },
        talk: { name: 'Talk', description: 'Lip-sync style mouth flaps using upper lip, lower lip, opening, and teeth.' },
        laugh: { name: 'Laugh', description: 'Wide happy mouth, raised brows, and smiling eye lids.' },
        shout: { name: 'Shout', description: 'Large open mouth with high brows and clear intensity.' },
        frown: { name: 'Frown', description: 'Downturned mouth with tense brows.' },
        surprised: { name: 'Surprised', description: 'Raised brows, round open mouth, and larger pupils.' },
        blink: { name: 'Blink', description: 'Both eyes close and reopen.' },
        winkLeft: { name: 'Wink Left', description: 'Left eye closes while the mouth smiles.' },
        chew: { name: 'Chew', description: 'Repeated lower-lip and mouth opening movement.' },
        cry: { name: 'Cry', description: 'Sad brows, trembling mouth, and half-closed eyes.' }
    };
    const FACE_MOTIONS = (() => {
        const sharedSpecs = window.FacialExpressionSpecs;
        const catalog = (sharedSpecs && typeof sharedSpecs.getFaceSetMotionCatalog === 'function')
            ? sharedSpecs.getFaceSetMotionCatalog()
            : null;
        if (!Array.isArray(catalog) || !catalog.length) {
            return DEFAULT_FACE_MOTIONS;
        }
        const mapped = {};
        catalog.forEach(entry => {
            if (!entry?.key) return;
            mapped[entry.key] = {
                name: entry.name || entry.key,
                description: entry.description || '',
                category: entry.category || 'Core',
                canonicalExpression: entry.canonicalExpression || null
            };
        });
        return Object.keys(mapped).length ? mapped : DEFAULT_FACE_MOTIONS;
    })();
    const FACE_MOTION_ACTION_ALIASES = {
        happy: 'smile',
        talking: 'talk',
        whispering: 'talk',
        singing: 'talk',
        chanting: 'talk',
        laughing: 'laugh',
        shouting: 'shout',
        sad: 'frown',
        shocked: 'surprised',
        crying: 'cry',
        chewing: 'chew',
        closedEyes: 'blink',
        closeEyes: 'blink',
        eyesClosed: 'blink'
    };
    const FACE_TALK_SPEEDS = {
        slow: { label: 'Slow', wpm: 110, cycleMs: 420 },
        normal: { label: 'Normal', wpm: 145, cycleMs: 340 },
        fast: { label: 'Fast', wpm: 180, cycleMs: 280 },
        veryFast: { label: 'Very fast', wpm: 220, cycleMs: 230 }
    };
    const FACE_MOTION_INTENSITY_PRESETS = {
        soft: { label: 'Soft', multiplier: 0.65 },
        normal: { label: 'Normal', multiplier: 1 },
        big: { label: 'Big', multiplier: 1.35 }
    };
    const FACE_MOTION_KEYS = Object.keys(FACE_MOTIONS);
    const MANUAL_FACE_ROLES = [
        { value: 'left-eye-sclera', label: 'Left sclera' },
        { value: 'right-eye-sclera', label: 'Right sclera' },
        { value: 'left-pupil', label: 'Left iris + pupil' },
        { value: 'right-pupil', label: 'Right iris + pupil' },
        { value: 'left-eyebrow', label: 'Left eyebrow' },
        { value: 'right-eyebrow', label: 'Right eyebrow' },
        { value: 'upper-lip', label: 'Upper lip' },
        { value: 'lower-lip', label: 'Lower lip' },
        { value: 'mouth-opening', label: 'Mouth interior (optional)' }
    ];
    const MANUAL_FACE_ROLE_LABELS = Object.fromEntries(MANUAL_FACE_ROLES.map(role => [role.value, role.label]));

    class FaceRigManager {
        constructor(objects, stage, animations) {
            this.objects = objects;
            this.stage = stage;
            this.animations = animations;
            this.active = false;
            this.selectedSetKey = 'classic';
            this.panel = null;
            this.propertiesPanel = null;
            this._faceSetMotionSigVersion = 5;
            this.faceMotionIntensity = 'normal';
            this.manualFaceSourceId = null;
            this.talkSettings = {
                text: '',
                speed: 'normal',
                autoDuration: true,
                durationSeconds: 2
            };
            this.installPanel();
            this.installPropertiesPanel();
            this.bindUI();
            eventBus.on('selection:changed', () => {
                this.updatePropertiesPanelVisibility();
                this.updateManualFaceBuilderStatus();
                const selected = this._getSelectedObjects();
                const selectedRole = selected.length === 1 ? selected[0]?.faceRigPartRole : null;
                const roleSelect = this.panel?.querySelector('#face-rig-cut-label-role');
                if (roleSelect && MANUAL_FACE_ROLE_LABELS[selectedRole]) roleSelect.value = selectedRole;
            });
            eventBus.on('object:added', () => this.updatePropertiesPanelVisibility());
        }

        installPanel() {
            const panel = document.getElementById('face-rig-controls');
            if (!panel || panel.dataset.simpleFaceSets === 'true') return;
            this.panel = panel;
            panel.dataset.simpleFaceSets = 'true';
            panel.className = 'face-rig-panel face-rig-simple-panel hidden';
            panel.innerHTML = `
                <div class="face-rig-simple-header" data-draggable>
                    <div>
                        <h4><i class="fas fa-face-smile"></i> Facial Sets</h4>
                        <p>Insert editable cartoon eyes, eyebrows, and animated lips as grouped stage objects.</p>
                    </div>
                    <button id="btn-face-rig-done" class="btn-small" title="Close facial sets"><i class="fas fa-check"></i></button>
                </div>
                <div class="face-rig-simple-body">
                    <div class="face-rig-simple-controls">
                        <label>
                            Set
                            <select id="face-rig-set-select">
                                ${SET_KEYS.map(key => `<option value="${key}">${SETS[key].name}</option>`).join('')}
                            </select>
                        </label>
                        <label>
                            Size
                            <input id="face-rig-set-size" type="range" min="60" max="180" value="110">
                            <span id="face-rig-set-size-value">110%</span>
                        </label>
                    </div>
                    <div id="face-rig-set-grid" class="face-rig-set-grid">
                        ${SET_KEYS.map(key => this.renderSetCard(key)).join('')}
                    </div>
                    <div class="face-rig-simple-actions">
                        <button id="btn-face-rig-insert-set" class="btn-primary"><i class="fas fa-plus"></i> Insert Set</button>
                    </div>
                    ${this.renderManualFaceBuilder()}
                    <div class="face-rig-motion-library">
                        <div class="face-rig-motion-head">
                            <strong><i class="fas fa-person-running"></i> Movement Library</strong>
                            <span>Applies to all parts in a Face Set group.</span>
                        </div>
                        <label>
                            Movement / pose
                            <select id="face-rig-motion-select">
                                ${FACE_MOTION_KEYS.map(key => `<option value="${key}">${FACE_MOTIONS[key].name}</option>`).join('')}
                            </select>
                        </label>
                        <div id="face-rig-motion-description" class="face-rig-motion-description">${FACE_MOTIONS.neutral.description}</div>
                        <div class="face-rig-motion-actions">
                            <button id="btn-face-rig-apply-motion"><i class="fas fa-check"></i> Apply Selected</button>
                            <button id="btn-face-rig-apply-motion-all"><i class="fas fa-layer-group"></i> Apply All Sets</button>
                        </div>
                        <div class="face-rig-motion-actions">
                            <button id="btn-face-rig-merge-motion"><i class="fas fa-compress-alt"></i> Merge Animation</button>
                            <button id="btn-face-rig-unmerge-motion"><i class="fas fa-expand-alt"></i> Unmerge</button>
                        </div>
                        ${this.renderTalkControls('main')}
                    </div>
                    <div id="face-rig-simple-status" class="face-rig-simple-status">Choose a set, then insert it on the stage.</div>
                </div>
            `;
        }

        installPropertiesPanel() {
            const host = document.getElementById('tab-properties') || document.getElementById('properties-editor');
            if (!host || document.getElementById('face-rig-properties-section')) return;
            const section = document.createElement('div');
            section.id = 'face-rig-properties-section';
            section.className = 'prop-section face-rig-properties-section hidden';
            section.innerHTML = `
                <h4><i class="fas fa-face-smile"></i> Face Set</h4>
                <div class="face-rig-motion-library face-rig-motion-library--props">
                    <div class="face-rig-motion-head">
                        <strong><i class="fas fa-person-running"></i> Movement Library</strong>
                        <span>Visible when a facial part is selected.</span>
                    </div>
                    <label>
                        Movement / pose
                        <select id="face-rig-prop-motion-select">
                            ${FACE_MOTION_KEYS.map(key => `<option value="${key}">${FACE_MOTIONS[key].name}</option>`).join('')}
                        </select>
                    </label>
                    <div id="face-rig-prop-motion-description" class="face-rig-motion-description">${FACE_MOTIONS.neutral.description}</div>
                    <div class="face-rig-motion-actions">
                        <button id="btn-face-rig-prop-apply-motion"><i class="fas fa-check"></i> Apply Selected</button>
                        <button id="btn-face-rig-prop-apply-motion-all"><i class="fas fa-layer-group"></i> Apply All Sets</button>
                    </div>
                    <div class="face-rig-motion-actions">
                        <button id="btn-face-rig-prop-merge-motion"><i class="fas fa-compress-alt"></i> Merge Animation</button>
                        <button id="btn-face-rig-prop-unmerge-motion"><i class="fas fa-expand-alt"></i> Unmerge</button>
                    </div>
                    ${this.renderTalkControls('prop')}
                </div>
            `;
            host.appendChild(section);
            this.propertiesPanel = section;

            section.querySelector('#face-rig-prop-motion-select')?.addEventListener('change', (event) => {
                const desc = section.querySelector('#face-rig-prop-motion-description');
                if (desc) desc.textContent = FACE_MOTIONS[event.target.value]?.description || '';
                this.syncTalkControlsVisibility();
            });
            this.bindTalkControls(section, 'prop');
            section.querySelector('#btn-face-rig-prop-apply-motion')?.addEventListener('click', () => {
                const key = section.querySelector('#face-rig-prop-motion-select')?.value || 'smile';
                this.applyFaceMotion(key, { scope: 'selected' });
            });
            section.querySelector('#btn-face-rig-prop-apply-motion-all')?.addEventListener('click', () => {
                const key = section.querySelector('#face-rig-prop-motion-select')?.value || 'smile';
                this.applyFaceMotion(key, { scope: 'all' });
            });
            section.querySelector('#btn-face-rig-prop-merge-motion')?.addEventListener('click', () => {
                this.setFaceSetTimelineMerge(true, { scope: 'selected' });
            });
            section.querySelector('#btn-face-rig-prop-unmerge-motion')?.addEventListener('click', () => {
                this.setFaceSetTimelineMerge(false, { scope: 'selected' });
            });
            this.updatePropertiesPanelVisibility();
        }

        renderSetCard(key) {
            const set = SETS[key];
            const active = key === this.selectedSetKey ? ' active' : '';
            return `
                <button class="face-rig-set-card${active}" data-face-set="${key}" type="button">
                    <span class="face-rig-set-preview" style="--iris:${set.iris};--brow:${set.brow};--lip:${set.lip};--lip-dark:${set.lipDark};">
                        <span class="fr-prev-brow left"></span>
                        <span class="fr-prev-brow right"></span>
                        <span class="fr-prev-eye left"><span></span></span>
                        <span class="fr-prev-eye right"><span></span></span>
                        <span class="fr-prev-mouth-open"></span>
                        <span class="fr-prev-mouth upper"></span>
                        <span class="fr-prev-mouth lower"></span>
                    </span>
                    <span class="face-rig-set-card-text">
                        <strong>${Utils.escapeHtml(set.name)}</strong>
                        <small>${Utils.escapeHtml(set.description)}</small>
                    </span>
                </button>
            `;
        }

        renderManualFaceBuilder() {
            return `
                <details class="face-rig-cut-label" open>
                    <summary><i class="fas fa-scissors"></i> Cut &amp; Label</summary>
                    <div class="face-rig-cut-label-body">
                        <div class="face-rig-cut-label-copy">Select the face image and start. Cut parts with SmartCut, Slice, Clone Part, or another tool, then label each resulting object.</div>
                        <div class="face-rig-cut-label-actions">
                            <button id="btn-face-rig-cut-label-start"><i class="fas fa-crosshairs"></i> Use Selected Face</button>
                            <button id="btn-face-rig-cut-label-cancel" title="End this labelling session without changing assembled face sets"><i class="fas fa-xmark"></i> End</button>
                        </div>
                        <div id="face-rig-cut-label-source" class="face-rig-cut-label-source">No source face selected</div>
                        <label>
                            Face part
                            <select id="face-rig-cut-label-role">
                                ${MANUAL_FACE_ROLES.map(role => `<option value="${role.value}">${role.label}</option>`).join('')}
                            </select>
                        </label>
                        <div class="face-rig-cut-label-actions">
                            <button id="btn-face-rig-cut-label-assign" class="btn-primary"><i class="fas fa-tag"></i> Label Selected Part</button>
                            <button id="btn-face-rig-cut-label-clear"><i class="fas fa-eraser"></i> Clear Label</button>
                        </div>
                        <div id="face-rig-cut-label-list" class="face-rig-cut-label-list">No labelled parts</div>
                        <button id="btn-face-rig-cut-label-assemble" class="btn-primary face-rig-cut-label-assemble"><i class="fas fa-link"></i> Assemble Face Parts</button>
                    </div>
                </details>
            `;
        }

        renderTalkControls(prefix) {
            const speedOptions = Object.entries(FACE_TALK_SPEEDS)
                .map(([key, spec]) => `<option value="${key}"${key === this.talkSettings.speed ? ' selected' : ''}>${spec.label}</option>`)
                .join('');
            const checked = this.talkSettings.autoDuration ? ' checked' : '';
            return `
                <div class="face-rig-talk-panel" data-face-talk-panel="${prefix}">
                    <div class="face-rig-talk-heading">Lip sync duration <span>Used by Talk / Talking</span></div>
                    <label for="face-rig-${prefix}-talk-text">Lip sync text</label>
                    <textarea id="face-rig-${prefix}-talk-text" data-face-talk-field="text" rows="3" placeholder="Type the words the face should speak">${Utils.escapeHtml(this.talkSettings.text || '')}</textarea>
                    <div class="face-rig-talk-row">
                        <span>Talk Speed</span>
                        <select id="face-rig-${prefix}-talk-speed" data-face-talk-field="speed">${speedOptions}</select>
                        <span data-face-talk-wpm>${FACE_TALK_SPEEDS[this.talkSettings.speed]?.wpm || FACE_TALK_SPEEDS.normal.wpm} wpm</span>
                    </div>
                    <label class="face-rig-talk-check">
                        <input id="face-rig-${prefix}-talk-auto" data-face-talk-field="autoDuration" type="checkbox"${checked}>
                        Auto duration from text
                    </label>
                    <div class="face-rig-talk-row">
                        <span>Duration</span>
                        <input id="face-rig-${prefix}-talk-duration" data-face-talk-field="duration" type="number" min="0.8" step="0.25" value="${this.talkSettings.durationSeconds}">
                        <span data-face-talk-min>min 0.8s</span>
                    </div>
                    <div class="face-rig-talk-note" data-face-talk-note>Enter text to calculate lip sync duration.</div>
                </div>
            `;
        }

        bindUI() {
            document.getElementById('btn-face-rig')?.addEventListener('click', () => this.startForSelection());
            this.panel?.addEventListener('click', (event) => {
                const card = event.target.closest?.('[data-face-set]');
                if (card) {
                    this.selectSet(card.dataset.faceSet);
                    return;
                }
                if (event.target.closest?.('#btn-face-rig-insert-set')) {
                    this.insertSelectedSet();
                }
                if (event.target.closest?.('#btn-face-rig-cut-label-start')) {
                    this.startManualFaceBuilder();
                }
                if (event.target.closest?.('#btn-face-rig-cut-label-cancel')) {
                    this.endManualFaceBuilder();
                }
                if (event.target.closest?.('#btn-face-rig-cut-label-assign')) {
                    this.assignManualFaceRole();
                }
                if (event.target.closest?.('#btn-face-rig-cut-label-clear')) {
                    this.clearManualFaceRole();
                }
                if (event.target.closest?.('#btn-face-rig-cut-label-assemble')) {
                    this.assembleManualFaceParts();
                }
                if (event.target.closest?.('#btn-face-rig-apply-motion')) {
                    this.applySelectedMotion('selected');
                }
                if (event.target.closest?.('#btn-face-rig-apply-motion-all')) {
                    this.applySelectedMotion('all');
                }
                if (event.target.closest?.('#btn-face-rig-merge-motion')) {
                    this.setFaceSetTimelineMerge(true, { scope: 'selected' });
                }
                if (event.target.closest?.('#btn-face-rig-unmerge-motion')) {
                    this.setFaceSetTimelineMerge(false, { scope: 'selected' });
                }
                if (event.target.closest?.('#btn-face-rig-done')) {
                    this.stop();
                }
            });
            this.panel?.querySelector('#face-rig-set-select')?.addEventListener('change', (event) => {
                this.selectSet(event.target.value);
            });
            this.panel?.querySelector('#face-rig-set-size')?.addEventListener('input', (event) => {
                const value = Number(event.target.value) || 110;
                const label = this.panel?.querySelector('#face-rig-set-size-value');
                if (label) label.textContent = `${value}%`;
            });
            this.panel?.querySelector('#face-rig-motion-select')?.addEventListener('change', (event) => {
                this.updateMotionDescription(event.target.value);
                this.syncTalkControlsVisibility();
            });
            this.bindTalkControls(this.panel, 'main');
            this.syncTalkControlsVisibility();
            this.updateManualFaceBuilderStatus();
        }

        startForSelection() {
            this.active = true;
            this.showPanel(true);
            this.setStatus('Choose a facial set, then insert it. Each part is editable after insertion.');
            this.showImplementationToolbar();
            this.updatePropertiesPanelVisibility();
        }

        stop() {
            this.active = false;
            this.showPanel(false);
            this.hideImplementationToolbar();
        }

        isActive() {
            return this.active;
        }

        showPanel(show) {
            if (!this.panel) this.installPanel();
            const panel = this.panel || document.getElementById('face-rig-controls');
            panel?.classList.toggle('hidden', !show);
        }

        showImplementationToolbar() {
            if (typeof this.objects?._showImplementationFloatingToolbar !== 'function') return;
            this.objects._showImplementationFloatingToolbar({
                tool: 'face-rig',
                label: 'Face Rig',
                hint: 'Apply selected face motion or close',
                applyText: 'Apply Motion',
                cancelText: 'Close',
                onApply: () => this.applySelectedMotion('selected'),
                onCancel: () => this.stop()
            });
        }

        hideImplementationToolbar() {
            if (typeof this.objects?._hideImplementationFloatingToolbar !== 'function') return;
            this.objects._hideImplementationFloatingToolbar('face-rig');
        }

        handleMouseDown() { return false; }
        handleMouseMove() { return false; }
        handleMouseUp() { return false; }
        renderOverlay() {}

        _getSelectedObjects() {
            return typeof this.objects?.getSelectedObjects === 'function'
                ? this.objects.getSelectedObjects().filter(Boolean)
                : (this.objects?.selectedIds || []).map(id => this.objects?.getObjectById?.(id)).filter(Boolean);
        }

        _getManualFaceSource() {
            return this.manualFaceSourceId ? this.objects?.getObjectById?.(this.manualFaceSourceId) : null;
        }

        _getManualFaceDraftParts() {
            if (!this.manualFaceSourceId) return [];
            return (this.objects?.objects || []).filter(obj =>
                !this.isFaceSetObject(obj)
                && obj.faceRigPartParentId === this.manualFaceSourceId
                && MANUAL_FACE_ROLE_LABELS[obj.faceRigPartRole]
            );
        }

        startManualFaceBuilder() {
            const selected = this._getSelectedObjects();
            if (selected.length !== 1) {
                Utils.showToast('Select one source face image first.', 'warning');
                return;
            }
            const source = selected[0];
            if (this.isFaceSetObject(source)) {
                Utils.showToast('Select the original face image, not an assembled face part.', 'warning');
                return;
            }
            this.manualFaceSourceId = source.id;
            this.updateManualFaceBuilderStatus();
            this.setStatus(`Cut & Label started for ${source.name || 'selected face'}.`);
            Utils.showToast('Source face selected. Cut a part, select it, then assign its label.', 'success');
        }

        endManualFaceBuilder() {
            this.manualFaceSourceId = null;
            this.updateManualFaceBuilderStatus();
            this.setStatus('Cut & Label session ended. Existing labels were kept.');
        }

        assignManualFaceRole() {
            const source = this._getManualFaceSource();
            if (!source) {
                Utils.showToast('Use Selected Face before labelling parts.', 'warning');
                return;
            }
            const role = this.panel?.querySelector('#face-rig-cut-label-role')?.value;
            if (!MANUAL_FACE_ROLE_LABELS[role]) return;
            const selected = this._getSelectedObjects().filter(obj => obj.id !== source.id && !this.isFaceSetObject(obj));
            if (selected.length !== 1) {
                Utils.showToast('Select one unassembled cut part to label.', 'warning');
                return;
            }
            const part = selected[0];
            const duplicate = this._getManualFaceDraftParts().find(obj => obj.id !== part.id && obj.faceRigPartRole === role);
            if (duplicate) {
                Utils.showToast(`${MANUAL_FACE_ROLE_LABELS[role]} is already assigned. Clear or change that label first.`, 'warning');
                return;
            }
            part.faceRigPartParentId = source.id;
            part.faceRigPartRole = role;
            part.faceRigPartLabel = MANUAL_FACE_ROLE_LABELS[role];
            part._smartCutFacePart = true;
            part._smartCutFaceRole = role;
            this.updateManualFaceBuilderStatus();
            this.objects.updateObjectList?.();
            this.objects.updateProperties?.();
            this.stage?.requestRender?.();
            eventBus.emit('history:push');
            Utils.showToast(`Labelled as ${MANUAL_FACE_ROLE_LABELS[role]}.`, 'success');
        }

        clearManualFaceRole() {
            const selected = this._getSelectedObjects().filter(obj => !this.isFaceSetObject(obj));
            const labelled = selected.filter(obj => MANUAL_FACE_ROLE_LABELS[obj.faceRigPartRole]);
            if (!labelled.length) {
                Utils.showToast('Select an unassembled labelled part first.', 'warning');
                return;
            }
            labelled.forEach(part => {
                delete part.faceRigPartParentId;
                delete part.faceRigPartRole;
                delete part.faceRigPartLabel;
                delete part._smartCutFacePart;
                delete part._smartCutFaceRole;
            });
            this.updateManualFaceBuilderStatus();
            this.objects.updateObjectList?.();
            this.objects.updateProperties?.();
            this.stage?.requestRender?.();
            eventBus.emit('history:push');
            Utils.showToast('Face-part label cleared.', 'success');
        }

        _detachPartFromExistingGroup(part) {
            const oldGroupId = part?.groupId;
            if (!oldGroupId || !this.objects?.groups?.[oldGroupId]) return;
            this.objects.groups[oldGroupId] = this.objects.groups[oldGroupId].filter(id => id !== part.id);
            if (!this.objects.groups[oldGroupId].length) {
                delete this.objects.groups[oldGroupId];
                delete this.objects.groupNames?.[oldGroupId];
            }
        }

        _applyManualFacePivot(part, role) {
            if (!part) return;
            part.pivotX = 0.5;
            if (role === 'upper-lip') part.pivotY = 1;
            else if (role === 'lower-lip') part.pivotY = 0;
            else part.pivotY = 0.5;
        }

        assembleManualFaceParts() {
            const source = this._getManualFaceSource();
            const parts = this._getManualFaceDraftParts();
            if (!source || !parts.length) {
                Utils.showToast('Select a source face and label at least one cut part.', 'warning');
                return;
            }
            const roles = new Set(parts.map(part => part.faceRigPartRole));
            if (roles.size !== parts.length) {
                Utils.showToast('Each assembled part must have a unique face label.', 'warning');
                return;
            }
            const groupId = Utils.generateId('faceSet');
            const setName = `${source.name || 'Manual'} Face Parts`;
            parts.forEach(part => {
                const role = part.faceRigPartRole;
                this._detachPartFromExistingGroup(part);
                part.tags = Array.from(new Set([
                    ...(Array.isArray(part.tags) ? part.tags : []),
                    'face-set',
                    'face-set:manual-cut-label',
                    `face-part:${role}`,
                    'smartcut-face'
                ]));
                part.faceSet = {
                    key: 'manual-cut-label',
                    name: setName,
                    role,
                    type: 'smartcut-face-part',
                    source: 'cut-label',
                    sourceId: source.id,
                    groupId
                };
                part._smartCutFacePart = true;
                part._smartCutFaceRole = role;
                part._smartCutFaceSourcePartId = source.id;
                part._smartCutFaceGroupId = groupId;
                this._applyManualFacePivot(part, role);
            });
            this.registerGroup(groupId, setName, parts);
            this._captureFaceSetRestPose(parts, { force: true });
            this.selectParts(parts);
            this.manualFaceSourceId = null;
            this.updateManualFaceBuilderStatus();
            this.objects.updateObjectList?.();
            this.objects.updateProperties?.();
            this.updatePropertiesPanelVisibility();
            this.stage?.requestRender?.();
            eventBus.emit('timeline:update');
            eventBus.emit('history:push');
            this.setStatus(`Assembled ${parts.length} manually cut face parts.`);
            Utils.showToast(`Assembled ${parts.length} face parts. Universal Face animations are ready.`, 'success');
        }

        updateManualFaceBuilderStatus() {
            const sourceEl = this.panel?.querySelector('#face-rig-cut-label-source');
            const listEl = this.panel?.querySelector('#face-rig-cut-label-list');
            const assembleButton = this.panel?.querySelector('#btn-face-rig-cut-label-assemble');
            const source = this._getManualFaceSource();
            const parts = this._getManualFaceDraftParts();
            if (sourceEl) {
                sourceEl.textContent = source ? `Source: ${source.name || source.id}` : 'No source face selected';
                sourceEl.classList.toggle('is-ready', !!source);
            }
            if (listEl) {
                listEl.innerHTML = parts.length
                    ? parts.map(part => `<span><i class="fas fa-tag"></i> ${Utils.escapeHtml(MANUAL_FACE_ROLE_LABELS[part.faceRigPartRole])}</span>`).join('')
                    : 'No labelled parts';
            }
            if (assembleButton) assembleButton.disabled = !source || !parts.length;
        }

        selectSet(key) {
            if (!SETS[key]) return;
            this.selectedSetKey = key;
            this.panel?.querySelectorAll('[data-face-set]').forEach(card => {
                card.classList.toggle('active', card.dataset.faceSet === key);
            });
            const select = this.panel?.querySelector('#face-rig-set-select');
            if (select) select.value = key;
            this.setStatus(`${SETS[key].name} selected.`);
        }

        insertSelectedSet() {
            const size = Number(this.panel?.querySelector('#face-rig-set-size')?.value) || 110;
            const created = this.insertFacialSet(this.selectedSetKey, { scale: size / 100 });
            if (created.length) {
                this.setStatus(`Inserted ${SETS[this.selectedSetKey].name} as an editable group.`);
            }
        }

        applySelectedMotion(scope = 'selected') {
            const key = this.panel?.querySelector('#face-rig-motion-select')?.value || 'smile';
            this.applyFaceMotion(key, { scope });
        }

        setFaceSetTimelineMerge(merged, options = {}) {
            const sets = this.getFaceSetTargets(options.scope || 'selected');
            if (!sets.length) {
                Utils.showToast('Select a facial set first.', 'warning');
                return 0;
            }
            let changed = 0;
            sets.forEach(parts => {
                const groupId = parts.find(obj => obj?.groupId)?.groupId || parts[0]?.id || Utils.generateId('faceSetMerge');
                const setName = parts.find(obj => obj?.faceSet?.name)?.faceSet.name || 'Face Set';
                const hasAnimations = parts.some(obj => Array.isArray(obj?.animations) && obj.animations.length);
                if (merged && !hasAnimations) return;
                parts.forEach(obj => {
                    obj.faceSet = { ...(obj.faceSet || {}), timelineMerged: !!merged, timelineMergeId: groupId, timelineMergeName: setName };
                    obj._faceSetTimelineMerged = !!merged;
                    obj._faceSetTimelineMergeId = groupId;
                    obj._faceSetTimelineMergeName = setName;
                });
                changed += 1;
            });
            if (!changed) {
                Utils.showToast(merged ? 'Add a face-set animation before merging.' : 'No merged face-set timeline rows found.', 'info');
                return 0;
            }
            this.objects.updateObjectList?.();
            this.objects.updateProperties?.();
            this.animations?.updateAppliedAnimationsList?.();
            this.animations?.updateCodeOutput?.();
            eventBus.emit('timeline:update');
            eventBus.emit('history:push');
            Utils.showToast(merged ? `Merged ${changed} face-set timeline row(s).` : `Unmerged ${changed} face-set timeline row(s).`, 'success');
            return changed;
        }

        updateMotionDescription(key) {
            const desc = this.panel?.querySelector('#face-rig-motion-description');
            if (desc) desc.textContent = FACE_MOTIONS[key]?.description || '';
        }

        bindTalkControls(root, prefix) {
            if (!root || root.dataset?.[`faceTalkBound${prefix}`] === 'true') return;
            if (root.dataset) root.dataset[`faceTalkBound${prefix}`] = 'true';
            root.querySelectorAll('[data-face-talk-field]').forEach(field => {
                const type = field.dataset.faceTalkField;
                const eventName = type === 'text' || type === 'duration' ? 'input' : 'change';
                field.addEventListener(eventName, () => {
                    this.updateTalkSettingsFromControls(root);
                    this.syncTalkControls();
                });
            });
        }

        updateTalkSettingsFromControls(root) {
            const textField = root?.querySelector('[data-face-talk-field="text"]');
            const speedField = root?.querySelector('[data-face-talk-field="speed"]');
            const autoField = root?.querySelector('[data-face-talk-field="autoDuration"]');
            const durationField = root?.querySelector('[data-face-talk-field="duration"]');
            if (textField) this.talkSettings.text = textField.value || '';
            if (speedField && FACE_TALK_SPEEDS[speedField.value]) this.talkSettings.speed = speedField.value;
            if (autoField) this.talkSettings.autoDuration = !!autoField.checked;
            if (durationField) {
                const value = Number(durationField.value);
                if (Number.isFinite(value) && value > 0) this.talkSettings.durationSeconds = value;
            }
        }

        syncTalkControls() {
            const profile = this.getTalkDurationProfile();
            document.querySelectorAll('[data-face-talk-panel]').forEach(panel => {
                const text = panel.querySelector('[data-face-talk-field="text"]');
                const speed = panel.querySelector('[data-face-talk-field="speed"]');
                const auto = panel.querySelector('[data-face-talk-field="autoDuration"]');
                const duration = panel.querySelector('[data-face-talk-field="duration"]');
                const wpm = panel.querySelector('[data-face-talk-wpm]');
                const min = panel.querySelector('[data-face-talk-min]');
                const note = panel.querySelector('[data-face-talk-note]');
                if (text && text.value !== this.talkSettings.text) text.value = this.talkSettings.text || '';
                if (speed) speed.value = this.talkSettings.speed;
                if (auto) auto.checked = !!this.talkSettings.autoDuration;
                if (duration) {
                    duration.min = String(profile.minSeconds);
                    if (this.talkSettings.autoDuration || Number(duration.value) < profile.minSeconds) {
                        duration.value = String(profile.durationSeconds);
                    }
                    duration.disabled = !!this.talkSettings.autoDuration;
                }
                if (wpm) wpm.textContent = `${profile.wpm} wpm`;
                if (min) min.textContent = `min ${profile.minSeconds.toFixed(2).replace(/\.00$/, '')}s`;
                if (note) {
                    note.classList.toggle('is-warning', profile.wasClamped);
                    note.textContent = profile.text
                        ? `${profile.wordCount} word${profile.wordCount === 1 ? '' : 's'} at ${profile.speedLabel.toLowerCase()} speed: ${profile.durationSeconds.toFixed(2).replace(/\.00$/, '')}s.`
                        : 'Enter text to calculate lip sync duration.';
                }
            });
        }

        syncTalkControlsVisibility() {
            const mainKey = this.panel?.querySelector('#face-rig-motion-select')?.value || '';
            const propKey = this.propertiesPanel?.querySelector('#face-rig-prop-motion-select')?.value || '';
            const showMain = this._resolveFaceSetActionKey(mainKey) === 'talk';
            const showProp = this._resolveFaceSetActionKey(propKey) === 'talk';
            this.panel?.querySelector('[data-face-talk-panel="main"]')?.classList.toggle('is-inactive', !showMain);
            this.propertiesPanel?.querySelector('[data-face-talk-panel="prop"]')?.classList.toggle('is-inactive', !showProp);
            this.syncTalkControls();
        }

        getTalkDurationProfile(settings = this.talkSettings) {
            const text = String(settings?.text || '').trim();
            const speedKey = FACE_TALK_SPEEDS[settings?.speed] ? settings.speed : 'normal';
            const speed = FACE_TALK_SPEEDS[speedKey];
            const words = text.match(/[\p{L}\p{N}]+(?:['-][\p{L}\p{N}]+)*/gu) || [];
            const wordCount = words.length || (text ? 1 : 0);
            const commaPauses = (text.match(/[,;:]/g) || []).length * 0.18;
            const sentencePauses = (text.match(/[.!?]/g) || []).length * 0.32;
            const newlinePauses = (text.match(/\n/g) || []).length * 0.25;
            const baseSeconds = wordCount ? (wordCount / speed.wpm) * 60 : 1.2;
            const minSeconds = this._roundTalkDuration(Math.max(0.8, baseSeconds + commaPauses + sentencePauses + newlinePauses + 0.35));
            let requestedSeconds = Number(settings?.durationSeconds);
            if (!Number.isFinite(requestedSeconds) || requestedSeconds <= 0) requestedSeconds = minSeconds;
            const durationSeconds = settings?.autoDuration ? minSeconds : Math.max(minSeconds, this._roundTalkDuration(requestedSeconds));
            return {
                text,
                speedKey,
                speedLabel: speed.label,
                wpm: speed.wpm,
                cycleMs: speed.cycleMs,
                wordCount,
                minSeconds,
                durationSeconds,
                durationMs: Math.max(800, Math.round(durationSeconds * 1000)),
                minDurationMs: Math.max(800, Math.round(minSeconds * 1000)),
                autoDuration: settings?.autoDuration !== false,
                wasClamped: !settings?.autoDuration && requestedSeconds < minSeconds
            };
        }

        _roundTalkDuration(seconds) {
            return Math.max(0.8, Math.ceil((Number(seconds) || 0.8) * 4) / 4);
        }

        updatePropertiesPanelVisibility() {
            if (!this.propertiesPanel) {
                this.propertiesPanel = document.getElementById('face-rig-properties-section');
            }
            if (!this.propertiesPanel) return;
            const selected = typeof this.objects?.getSelectedObjects === 'function'
                ? this.objects.getSelectedObjects()
                : [];
            const hasSelectedFaceSet = selected.some(obj => this.isFaceSetObject(obj));
            const hasAnyFaceSet = (this.objects?.objects || []).some(obj => this.isFaceSetObject(obj));
            this.propertiesPanel.classList.toggle('hidden', !hasAnyFaceSet);
            const headNote = this.propertiesPanel.querySelector('.face-rig-motion-head span');
            if (headNote) {
                headNote.textContent = hasSelectedFaceSet
                    ? 'Applies to the selected facial set group.'
                    : (hasAnyFaceSet ? 'Select any facial part to edit movement.' : 'Insert a facial set to enable movement.');
            }
            this.syncTalkControlsVisibility();
        }

        insertFacialSet(key = this.selectedSetKey, options = {}) {
            const set = SETS[key] || SETS.classic;
            const addDefaultAnimations = options.addDefaultAnimations === true;
            const scale = Math.max(0.45, Math.min(2.4, Number(options.scale) || 1));
            const groupId = Utils.generateId('faceSet');
            const centerX = Number.isFinite(options.x) ? options.x : (this.stage?.width || 1280) / 2;
            const centerY = Number.isFinite(options.y) ? options.y : (this.stage?.height || 720) / 2;
            const parts = [];
            const baseW = 330 * scale;
            const baseH = 210 * scale;
            const leftX = centerX - baseW * 0.25;
            const rightX = centerX + baseW * 0.25;
            const eyeY = centerY - baseH * 0.18;
            const mouthY = centerY + baseH * 0.23;
            const eyeW = 76 * set.eyeScale * scale;
            const eyeH = 48 * set.eyeScale * scale;

            const add = (type, props) => {
                const obj = new StageObject(type, {
                    ...props,
                    groupId,
                    tags: ['face-set', `face-set:${key}`, props.role ? `face-part:${props.role}` : 'face-part'],
                    name: props.name || 'Face Part'
                });
                obj.faceSet = { key, name: set.name, role: props.role || null };
                parts.push(obj);
                this.objects.addObject(obj);
                return obj;
            };

            const makeEye = (side, x) => {
                add('circle', {
                    name: `${set.name} ${side} eye sclera`,
                    role: `${side}-eye-sclera`,
                    x: x - eyeW / 2,
                    y: eyeY - eyeH / 2,
                    width: eyeW,
                    height: eyeH,
                    fill: '#ffffff',
                    stroke: '#111827',
                    strokeWidth: Math.max(2, 2.4 * scale)
                });
                const irisSize = eyeH * 0.62;
                add('circle', {
                    name: `${set.name} ${side} iris`,
                    role: `${side}-iris`,
                    x: x - irisSize / 2,
                    y: eyeY - irisSize / 2,
                    width: irisSize,
                    height: irisSize,
                    fill: set.iris,
                    stroke: 'rgba(0,0,0,0.25)',
                    strokeWidth: Math.max(1, 1.3 * scale)
                });
                const pupilSize = irisSize * 0.42;
                add('circle', {
                    name: `${set.name} ${side} pupil`,
                    role: `${side}-pupil`,
                    x: x - pupilSize / 2,
                    y: eyeY - pupilSize / 2,
                    width: pupilSize,
                    height: pupilSize,
                    fill: set.pupil,
                    stroke: 'transparent',
                    strokeWidth: 0
                });
                const shineSize = irisSize * 0.16;
                add('circle', {
                    name: `${set.name} ${side} eye shine`,
                    role: `${side}-eye-shine`,
                    x: x - irisSize * 0.12,
                    y: eyeY - irisSize * 0.26,
                    width: shineSize,
                    height: shineSize,
                    fill: 'rgba(255,255,255,0.88)',
                    stroke: 'transparent',
                    strokeWidth: 0
                });
                const lid = add('circle', {
                    name: `${set.name} ${side} blink lid`,
                    role: `${side}-blink-lid`,
                    x: x - eyeW / 2,
                    y: eyeY - eyeH / 2,
                    width: eyeW,
                    height: eyeH,
                    fill: '#f2c8a8',
                    stroke: 'transparent',
                    strokeWidth: 0,
                    opacity: 0
                });
                if (addDefaultAnimations) {
                    this.addAnimation(lid, 'Blink', 900, [
                        { property: 'opacity', from: 0, to: 1, duration: 140, easing: 'easeIn' },
                        { property: 'opacity', from: 1, to: 0, duration: 180, delay: 140, easing: 'easeOut' }
                    ]);
                }
            };

            makeEye('left', leftX);
            makeEye('right', rightX);

            const browW = 82 * scale;
            const browH = Math.max(8, 11 * scale);
            const browY = eyeY - eyeH * 0.92;
            const leftBrow = add('rectangle', {
                name: `${set.name} left eyebrow`,
                role: 'left-eyebrow',
                x: leftX - browW / 2,
                y: browY,
                width: browW,
                height: browH,
                fill: set.brow,
                stroke: 'transparent',
                strokeWidth: 0,
                borderRadius: browH,
                rotation: -Math.abs(set.browTilt)
            });
            const rightBrow = add('rectangle', {
                name: `${set.name} right eyebrow`,
                role: 'right-eyebrow',
                x: rightX - browW / 2,
                y: browY,
                width: browW,
                height: browH,
                fill: set.brow,
                stroke: 'transparent',
                strokeWidth: 0,
                borderRadius: browH,
                rotation: Math.abs(set.browTilt)
            });
            if (addDefaultAnimations) {
                this.addAnimation(leftBrow, 'Brow Raise', 900, [
                    { property: 'y', from: leftBrow.y, to: leftBrow.y - 18 * scale, duration: 260, easing: 'easeOut' },
                    { property: 'y', from: leftBrow.y - 18 * scale, to: leftBrow.y, duration: 260, delay: 260, easing: 'easeInOut' }
                ]);
                this.addAnimation(rightBrow, 'Brow Raise', 900, [
                    { property: 'y', from: rightBrow.y, to: rightBrow.y - 18 * scale, duration: 260, easing: 'easeOut' },
                    { property: 'y', from: rightBrow.y - 18 * scale, to: rightBrow.y, duration: 260, delay: 260, easing: 'easeInOut' }
                ]);
            }

            const mouthStyle = MOUTH_STYLES[key] || MOUTH_STYLES.classic;
            const mouthW = 126 * set.mouthScale * mouthStyle.width * scale;
            const mouthH = 54 * set.mouthScale * mouthStyle.height * scale;
            const makeMouthPoints = (centerY, points) => points.map(point => ({
                x: centerX + point[0] * mouthW,
                y: centerY + point[1] * mouthH
            }));
            const lipStroke = 'rgba(61, 12, 24, 0.32)';
            const openingTop = mouthY - mouthH * (0.06 + mouthStyle.smile);
            const openingPoints = makeMouthPoints(openingTop, [
                [-0.43, 0.02],
                [-0.28, -0.18],
                [-0.08, -0.22],
                [0, -0.2],
                [0.08, -0.22],
                [0.28, -0.18],
                [0.43, 0.02],
                [0.28, 0.24],
                [0.08, 0.31],
                [0, 0.32],
                [-0.08, 0.31],
                [-0.28, 0.24]
            ]);
            const interior = add('freeform', {
                name: `${set.name} mouth opening`,
                role: 'mouth-opening',
                x: centerX - mouthW * 0.43,
                y: openingTop - mouthH * 0.22,
                width: mouthW * 0.86,
                height: mouthH * 0.54,
                fill: set.lipDark,
                stroke: 'rgba(0,0,0,0.18)',
                strokeWidth: Math.max(1, 0.9 * scale),
                pathPoints: openingPoints,
                closedPath: true,
                scaleY: 0.34,
                pivotY: 0.42
            });
            const teeth = add('rectangle', {
                name: `${set.name} teeth highlight`,
                role: 'teeth',
                x: centerX - mouthW * 0.23,
                y: openingTop - mouthH * 0.08,
                width: mouthW * 0.46,
                height: mouthH * 0.12,
                fill: 'rgba(255,255,255,0.86)',
                stroke: 'transparent',
                strokeWidth: 0,
                borderRadius: Math.max(5, 8 * scale),
                opacity: 0.78
            });
            const upperY = mouthY - mouthH * (0.23 + mouthStyle.smile);
            const upperLip = add('freeform', {
                name: `${set.name} upper lip`,
                role: 'upper-lip',
                x: centerX - mouthW * 0.52,
                y: upperY - mouthH * 0.24 * mouthStyle.upper,
                width: mouthW * 1.04,
                height: mouthH * 0.42 * mouthStyle.upper,
                fill: set.lip,
                stroke: lipStroke,
                strokeWidth: Math.max(1, 1.25 * scale),
                pathPoints: makeMouthPoints(upperY, [
                    [-0.52, 0.11],
                    [-0.38, -0.11 * mouthStyle.upper],
                    [-0.19, -0.18 * mouthStyle.upper],
                    [-0.06, -0.07 * mouthStyle.upper],
                    [0, -0.24 * mouthStyle.upper],
                    [0.06, -0.07 * mouthStyle.upper],
                    [0.19, -0.18 * mouthStyle.upper],
                    [0.38, -0.11 * mouthStyle.upper],
                    [0.52, 0.11],
                    [0.3, 0.16],
                    [0.1, 0.1],
                    [0, 0.08],
                    [-0.1, 0.1],
                    [-0.3, 0.16]
                ]),
                closedPath: true,
                pivotY: 0.84
            });
            const lowerY = mouthY + mouthH * (0.16 + mouthStyle.smile);
            const lowerLip = add('freeform', {
                name: `${set.name} lower lip`,
                role: 'lower-lip',
                x: centerX - mouthW * 0.5,
                y: lowerY - mouthH * 0.09,
                width: mouthW,
                height: mouthH * 0.42 * mouthStyle.lower,
                fill: set.lip,
                stroke: lipStroke,
                strokeWidth: Math.max(1, 1.25 * scale),
                pathPoints: makeMouthPoints(lowerY, [
                    [-0.5, -0.07],
                    [-0.34, 0.12 * mouthStyle.lower],
                    [-0.16, 0.26 * mouthStyle.lower],
                    [0, 0.3 * mouthStyle.lower],
                    [0.16, 0.26 * mouthStyle.lower],
                    [0.34, 0.12 * mouthStyle.lower],
                    [0.5, -0.07],
                    [0.28, -0.01],
                    [0.08, 0.03],
                    [0, 0.04],
                    [-0.08, 0.03],
                    [-0.28, -0.01]
                ]),
                closedPath: true,
                pivotY: 0.05
            });
            if (addDefaultAnimations) {
                this.addAnimation(interior, 'Talk Open', 1200, [
                    { property: 'scaleY', from: 0.34, to: 1.05, duration: 180, easing: 'easeOut' },
                    { property: 'scaleY', from: 1.05, to: 0.45, duration: 160, delay: 180, easing: 'easeInOut' },
                    { property: 'scaleY', from: 0.45, to: 0.95, duration: 160, delay: 340, easing: 'easeOut' },
                    { property: 'scaleY', from: 0.95, to: 0.34, duration: 220, delay: 500, easing: 'easeIn' }
                ]);
                this.addAnimation(teeth, 'Talk Teeth', 1200, [
                    { property: 'opacity', from: 0.78, to: 0.38, duration: 180, easing: 'easeOut' },
                    { property: 'opacity', from: 0.38, to: 0.74, duration: 220, delay: 500, easing: 'easeInOut' }
                ]);
                this.addAnimation(upperLip, 'Talk Upper Lip', 1200, [
                    { property: 'y', from: upperLip.y, to: upperLip.y - 5 * scale, duration: 180, easing: 'easeOut' },
                    { property: 'y', from: upperLip.y - 5 * scale, to: upperLip.y, duration: 220, delay: 500, easing: 'easeInOut' }
                ]);
                this.addAnimation(lowerLip, 'Talk Lower Lip', 1200, [
                    { property: 'y', from: lowerLip.y, to: lowerLip.y + 17 * scale, duration: 180, easing: 'easeOut' },
                    { property: 'y', from: lowerLip.y + 17 * scale, to: lowerLip.y, duration: 220, delay: 500, easing: 'easeInOut' }
                ]);
            }

            this.registerGroup(groupId, set.name, parts);
            this.selectParts(parts);
            this.objects.updateObjectList?.();
            this.objects.updateProperties?.();
            this.updatePropertiesPanelVisibility();
            this.stage?.requestRender?.();
            eventBus.emit('timeline:update');
            eventBus.emit('history:push');
            Utils.showToast(`${set.name} facial set inserted`, 'success');
            return parts;
        }

        applyFaceMotion(key, options = {}) {
            const motion = FACE_MOTIONS[key];
            if (!motion) return;
            const sets = this.getFaceSetTargets(options.scope || 'selected');
            if (!sets.length) {
                Utils.showToast('Select a facial set first, or insert one on the stage.', 'warning');
                return;
            }
            const actionKey = this._resolveFaceSetActionKey(key);
            const talkProfile = actionKey === 'talk' ? this.getTalkDurationProfile() : null;
            const intensityKey = FACE_MOTION_INTENSITY_PRESETS[options.intensity]
                ? options.intensity
                : (FACE_MOTION_INTENSITY_PRESETS[this.faceMotionIntensity] ? this.faceMotionIntensity : 'normal');
            this.faceMotionIntensity = intensityKey;
            if (talkProfile) {
                this.talkSettings.durationSeconds = talkProfile.durationSeconds;
                this.syncTalkControls();
                if (talkProfile.wasClamped) {
                    Utils.showToast(`Duration adjusted to ${talkProfile.durationSeconds.toFixed(2).replace(/\.00$/, '')}s for the lip sync text.`, 'info');
                }
            }

            if (window.FacialExpressionSpecs) {
                const history = window.FacialExpressionSpecs.getExpressionHistory('face-set');
                if (!window.__appExpressionHistory) window.__appExpressionHistory = [];
                window.__appExpressionHistory.push({
                    ...history,
                    motion: key,
                    canonicalExpression: window.FacialExpressionSpecs.resolveFaceSetMotionKey(key),
                    setCount: sets.length
                });
                if (window.__appExpressionHistory.length > 100) {
                    window.__appExpressionHistory.shift();
                }
            }

            let changedSets = 0;
            let skippedSets = 0;

            sets.forEach(parts => {
                this._captureFaceSetRestPose(parts);
                const nextSignature = this._buildFaceSetMotionApplySignature(key, parts, talkProfile, intensityKey);
                const currentSignature = this._getCurrentFaceSetMotionSignature(parts);
                if (currentSignature === nextSignature) {
                    skippedSets += 1;
                    return;
                }

                if (key === 'neutral') {
                    const didClear = this.clearFaceSetMotion(parts);
                    if (!didClear && !this._hasFaceSetMotionTracks(parts)) {
                        this._setFaceSetMotionSignature(parts, key, nextSignature);
                        skippedSets += 1;
                        return;
                    }
                } else {
                    this.clearFaceSetMotion(parts);
                    const appliedCount = this.buildMotionForSet(key, parts, { talkProfile, intensity: intensityKey });
                    if (!appliedCount) {
                        skippedSets += 1;
                        return;
                    }
                }

                this._setFaceSetMotionSignature(parts, key, nextSignature);
                changedSets += 1;
            });

            if (!changedSets) {
                const skippedText = skippedSets ? ` (${skippedSets} unchanged)` : '';
                this.setStatus(`${motion.name}: no motion changes applied${skippedText}.`);
                Utils.showToast(`No changes needed for ${motion.name.toLowerCase()}.`, 'info');
                return;
            }

            this.objects.updateObjectList?.();
            this.objects.updateProperties?.();
            this.animations?.updateAppliedAnimationsList?.();
            this.animations?.updateCodeOutput?.();
            this.stage?.requestRender?.();
            eventBus.emit('timeline:update');
            eventBus.emit('history:push');

            const scopeText = options.scope === 'all' ? `${changedSets} facial set(s)` : 'selected facial set';
            const action = key === 'neutral' ? 'cleared motion from' : `applied ${motion.name} to`;
            this.setStatus(`${motion.name}: ${scopeText}.`);
            Utils.showToast(`${action} ${scopeText}`, 'success');
        }

        getFaceSetTargets(scope = 'selected') {
            const objects = Array.isArray(this.objects?.objects) ? this.objects.objects : [];
            const faceParts = objects.filter(obj => this.isFaceSetObject(obj));
            if (!faceParts.length) return [];

            let groupIds = new Set();
            if (scope !== 'all') {
                const selectedIds = Array.isArray(this.objects?.selectedIds) ? this.objects.selectedIds : [];
                selectedIds.forEach(id => {
                    const obj = this.objects.getObjectById?.(id);
                    if (this.isFaceSetObject(obj)) groupIds.add(obj.groupId || obj.id);
                });
            }
            if (scope === 'all' || groupIds.size === 0) {
                faceParts.forEach(obj => groupIds.add(obj.groupId || obj.id));
            }

            return [...groupIds].map(groupId => faceParts.filter(obj => (obj.groupId || obj.id) === groupId)).filter(parts => parts.length);
        }

        isFaceSetObject(obj) {
            return !!obj && (obj.faceSet || (Array.isArray(obj.tags) && obj.tags.includes('face-set')));
        }

        isSmartCutFacePart(obj) {
            if (!obj) return false;
            if (obj._smartCutFacePart) return true;
            if (obj.faceSet?.type === 'smartcut-face-part' || obj.faceSet?.source === 'smart-cut') return true;
            return Array.isArray(obj.tags) && obj.tags.includes('smartcut-face');
        }

        getFaceRole(obj) {
            if (obj?.faceSet?.role) return obj.faceSet.role;
            const tags = Array.isArray(obj?.tags) ? obj.tags : [];
            const roleTag = tags.find(tag => String(tag).startsWith('face-role:'))
                || tags.find(tag => String(tag).startsWith('face-part:'));
            return roleTag ? String(roleTag).slice(String(roleTag).indexOf(':') + 1) : null;
        }

        mapPartsByRole(parts) {
            const map = {};
            parts.forEach(obj => {
                const role = this.getFaceRole(obj);
                if (role) map[role] = obj;
            });
            return map;
        }

        _makeTearPath(x, y, width, height) {
            return [
                { x: x + width * 0.5, y },
                { x: x + width * 0.88, y: y + height * 0.38 },
                { x: x + width * 0.82, y: y + height * 0.78 },
                { x: x + width * 0.5, y: y + height },
                { x: x + width * 0.18, y: y + height * 0.78 },
                { x: x + width * 0.12, y: y + height * 0.38 }
            ];
        }

        _ensureFaceSetTears(parts) {
            if (!Array.isArray(parts) || !parts.length || typeof StageObject !== 'function') return parts || [];
            const role = this.mapPartsByRole(parts);
            const groupId = parts.find(obj => obj?.groupId)?.groupId || Utils.generateId('faceSet');
            const source = parts.find(obj => obj?.faceSet) || parts[0];
            const setKey = source?.faceSet?.key || this._extractFaceSetKey?.(source) || 'custom';
            const setName = source?.faceSet?.name || 'Face Set';
            const addTear = (side) => {
                const tearRole = `${side}-tear`;
                if (role[tearRole]) return role[tearRole];
                const sclera = role[`${side}-eye-sclera`] || role[`${side}-iris`] || role[`${side}-pupil`];
                const iris = role[`${side}-iris`] || sclera;
                if (!sclera && side === 'right') return null;
                const anchor = sclera || role['left-eye-sclera'] || role['left-iris'] || role['left-pupil'];
                if (!anchor) return null;
                const eyeW = Math.max(20, Number(anchor.width) || 44);
                const eyeH = Math.max(16, Number(anchor.height) || 32);
                const width = Math.max(10, eyeW * 0.18);
                const height = Math.max(18, eyeH * 0.52);
                const x = (Number(anchor.x) || 0) + (side === 'left' ? eyeW * 0.72 : eyeW * 0.12) - width * 0.5;
                const y = (Number(anchor.y) || 0) + eyeH * 0.58;
                const obj = new StageObject('freeform', {
                    name: `${setName} ${side} tear`,
                    role: tearRole,
                    x,
                    y,
                    width,
                    height,
                    fill: 'rgba(96, 190, 255, 0.82)',
                    stroke: 'rgba(24, 111, 196, 0.42)',
                    strokeWidth: Math.max(1, eyeW * 0.018),
                    pathPoints: this._makeTearPath(x, y, width, height),
                    closedPath: true,
                    opacity: 0,
                    pivotY: 0.02,
                    groupId,
                    tags: ['face-set', `face-set:${setKey}`, `face-part:${tearRole}`]
                });
                obj.faceSet = {
                    key: setKey,
                    name: setName,
                    role: tearRole,
                    effect: 'tear'
                };
                obj._faceSetRestPose = {
                    x: obj.x,
                    y: obj.y,
                    rotation: obj.rotation || 0,
                    scaleX: obj.scaleX ?? 1,
                    scaleY: obj.scaleY ?? 1,
                    opacity: 0,
                    visible: obj.visible !== false,
                    pivotX: obj.pivotX,
                    pivotY: obj.pivotY
                };
                parts.push(obj);
                if (this.objects?.addObject) {
                    this.objects.addObject(obj);
                } else if (Array.isArray(this.objects?.objects)) {
                    this.objects.objects.push(obj);
                }
                if (this.objects?.groups && groupId) {
                    const ids = this.objects.groups[groupId] || [];
                    if (!ids.includes(obj.id)) ids.push(obj.id);
                    this.objects.groups[groupId] = ids;
                    obj.groupId = groupId;
                }
                role[tearRole] = obj;
                return obj;
            };
            addTear('left');
            addTear('right');
            return parts;
        }

        _getFaceSetRestPoseProps(obj) {
            const props = ['x', 'y', 'rotation', 'scaleX', 'scaleY', 'opacity', 'visible', 'pivotX', 'pivotY'];
            const pose = {};
            props.forEach(prop => {
                if (prop in obj && obj[prop] !== undefined) pose[prop] = obj[prop];
            });
            if (!('rotation' in pose)) pose.rotation = 0;
            if (!('scaleX' in pose)) pose.scaleX = 1;
            if (!('scaleY' in pose)) pose.scaleY = 1;
            if (!('opacity' in pose)) pose.opacity = 1;
            if (!('visible' in pose)) pose.visible = true;
            const role = this.getFaceRole(obj);
            if (role === 'left-tear' || role === 'right-tear') {
                pose.opacity = 0;
                pose.scaleX = 1;
                pose.scaleY = 1;
            }
            return pose;
        }

        _captureFaceSetRestPose(parts, options = {}) {
            const force = !!options.force;
            (parts || []).forEach(obj => {
                if (!obj) return;
                if (!force && obj._faceSetRestPose) return;
                obj._faceSetRestPose = this._getFaceSetRestPoseProps(obj);
            });
        }

        _captureFaceSetRestPoseFromAnimations(parts) {
            (parts || []).forEach(obj => {
                if (!obj || obj._faceSetRestPose || !Array.isArray(obj.animations)) return;
                const pose = this._getFaceSetRestPoseProps(obj);
                obj.animations.forEach(anim => {
                    if (!anim || (anim.type !== 'face-set' && anim.type !== 'face-set-motion')) return;
                    const steps = Array.isArray(anim.generated) ? anim.generated : [anim.generated];
                    const firstByProp = new Map();
                    steps.forEach(step => {
                        if (!step || !step.property || step.from === undefined) return;
                        const delay = Number(step.delay) || 0;
                        const existing = firstByProp.get(step.property);
                        if (!existing || delay < existing.delay) {
                            firstByProp.set(step.property, { delay, value: step.from });
                        }
                    });
                    firstByProp.forEach(({ value }, prop) => {
                        if (['x', 'y', 'rotation', 'scaleX', 'scaleY', 'opacity', 'visible', 'pivotX', 'pivotY'].includes(prop)) {
                            pose[prop] = value;
                        }
                    });
                });
                obj._faceSetRestPose = pose;
            });
        }

        _restoreFaceSetRestPose(parts) {
            let changed = false;
            (parts || []).forEach(obj => {
                if (!obj) return;
                const pose = obj._faceSetRestPose || this._getFaceSetRestPoseProps(obj);
                Object.entries(pose).forEach(([prop, value]) => {
                    if (value === undefined) return;
                    if (obj[prop] !== value) {
                        obj[prop] = value;
                        changed = true;
                    }
                });
                const role = this.getFaceRole(obj);
                if (role === 'left-tear' || role === 'right-tear') {
                    if (obj.opacity !== 0) {
                        obj.opacity = 0;
                        changed = true;
                    }
                    if (obj.scaleX !== 1) {
                        obj.scaleX = 1;
                        changed = true;
                    }
                    if (obj.scaleY !== 1) {
                        obj.scaleY = 1;
                        changed = true;
                    }
                }
                delete obj._faceSetAppliedMotionKey;
                delete obj._faceSetAppliedMotionSignature;
            });
            return changed;
        }

        clearFaceSetMotion(parts) {
            let changed = false;
            this._captureFaceSetRestPoseFromAnimations(parts);
            parts.forEach(obj => {
                if (!obj) return;
                if (Array.isArray(obj.animations)) {
                    const before = obj.animations.length;
                    obj.animations = obj.animations.filter(anim => anim.type !== 'face-set' && anim.type !== 'face-set-motion');
                    if (obj.animations.length !== before) changed = true;
                }
                delete obj._faceSetAppliedMotionKey;
                delete obj._faceSetAppliedMotionSignature;
            });
            if (this._restoreFaceSetRestPose(parts)) changed = true;
            return changed;
        }

        _getFaceSetPartsForObject(obj) {
            if (!obj || !this.isFaceSetObject(obj)) return [];
            const groupId = obj.groupId || obj.faceSet?.groupId || obj.id;
            const objects = Array.isArray(this.objects?.objects) ? this.objects.objects : [];
            return objects.filter(item => this.isFaceSetObject(item) && ((item.groupId || item.faceSet?.groupId || item.id) === groupId));
        }

        resetFaceSetIfNoMotionTracksForObject(obj) {
            const parts = this._getFaceSetPartsForObject(obj);
            if (!parts.length || this._hasFaceSetMotionTracks(parts)) return false;
            return this.clearFaceSetMotion(parts);
        }

        resetAllFaceSetsToRest() {
            let changed = false;
            this.getFaceSetTargets('all').forEach(parts => {
                if (this.clearFaceSetMotion(parts)) changed = true;
            });
            return changed;
        }

        _getFaceSetGroupSignature(parts) {
            const normalized = (parts || [])
                .map(obj => ({
                    id: String(obj?.id || ''),
                    role: String(this.getFaceRole(obj) || ''),
                    x: Number(obj?.x || 0).toFixed(2),
                    y: Number(obj?.y || 0).toFixed(2),
                    width: Number(obj?.width || 0).toFixed(2),
                    height: Number(obj?.height || 0).toFixed(2),
                    rotation: Number(obj?.rotation || 0).toFixed(2),
                    scaleX: Number(obj?.scaleX ?? 1).toFixed(3),
                    scaleY: Number(obj?.scaleY ?? 1).toFixed(3),
                    opacity: Number(obj?.opacity ?? 1).toFixed(3)
                }))
                .sort((a, b) => {
                    if (a.role === b.role) return a.id.localeCompare(b.id);
                    return a.role.localeCompare(b.role);
                });
            return normalized
                .map(item => `${item.role}:${item.id}:${item.x},${item.y},${item.width},${item.height},${item.rotation},${item.scaleX},${item.scaleY},${item.opacity}`)
                .join('|');
        }

        _buildFaceSetMotionApplySignature(key, parts, talkProfile = null, intensityKey = 'normal') {
            const canonicalKey = this._resolveCanonicalExpressionForMotion(key);
            const canonicalSpecSig = this._getCanonicalExpressionSignature(canonicalKey);
            const actionKey = this._resolveFaceSetActionKey(key);
            return [
                `v${this._faceSetMotionSigVersion}`,
                String(key || 'neutral'),
                String(actionKey || key || 'neutral'),
                String(canonicalKey || 'neutral'),
                String(canonicalSpecSig || ''),
                String(FACE_MOTION_INTENSITY_PRESETS[intensityKey] ? intensityKey : 'normal'),
                talkProfile ? JSON.stringify({
                    text: talkProfile.text,
                    speed: talkProfile.speedKey,
                    durationMs: talkProfile.durationMs,
                    autoDuration: talkProfile.autoDuration
                }) : '',
                this._getFaceSetGroupSignature(parts)
            ].join('::');
        }

        _resolveFaceSetActionKey(key) {
            const raw = String(key || 'neutral');
            return FACE_MOTION_ACTION_ALIASES[raw] || raw;
        }

        _resolveCanonicalExpressionForMotion(key) {
            const sharedSpecs = window.FacialExpressionSpecs;
            if (sharedSpecs && typeof sharedSpecs.resolveFaceSetMotionKey === 'function') {
                return sharedSpecs.resolveFaceSetMotionKey(key);
            }
            return String(key || 'neutral');
        }

        _getCanonicalExpressionSpecForMotion(key) {
            const canonicalKey = this._resolveCanonicalExpressionForMotion(key);
            const sharedSpecs = window.FacialExpressionSpecs;
            if (sharedSpecs && typeof sharedSpecs.getCanonicalExpressionSpec === 'function') {
                return sharedSpecs.getCanonicalExpressionSpec(canonicalKey);
            }
            if (sharedSpecs && typeof sharedSpecs.getUCExpressionSpec === 'function') {
                return sharedSpecs.getUCExpressionSpec(canonicalKey);
            }
            return null;
        }

        _getCanonicalExpressionSignature(canonicalKey) {
            const sharedSpecs = window.FacialExpressionSpecs;
            let spec = null;
            if (sharedSpecs && typeof sharedSpecs.getCanonicalExpressionSpec === 'function') {
                spec = sharedSpecs.getCanonicalExpressionSpec(canonicalKey);
            } else if (sharedSpecs && typeof sharedSpecs.getUCExpressionSpec === 'function') {
                spec = sharedSpecs.getUCExpressionSpec(canonicalKey);
            }
            return spec ? JSON.stringify(spec) : '';
        }

        _applyCanonicalExpressionToSet(role, expr, helpers) {
            if (!expr || !role || !helpers) return 0;

            const {
                add,
                to,
                nudge,
                move,
                lids,
                brows,
                pupils
            } = helpers;

            const getSide = (name) => name.includes('left') ? 'left' : 'right';
            const resolveEyeState = (side) => expr.eyes?.[side] || expr.eye || 'open';
            const resolveBrowState = (side) => expr.brows?.[side] || expr.brow || 'neutral';
            const resolveOffset = (featureKey, axis) => {
                const specific = expr.featureOffsets?.[featureKey]?.[axis];
                const family = featureKey.startsWith('brow-')
                    ? expr.featureOffsets?.brow?.[axis]
                    : featureKey.startsWith('mouth')
                        ? expr.featureOffsets?.mouth?.[axis]
                        : null;
                return Number.isFinite(specific) ? specific : (Number.isFinite(family) ? family : 0);
            };

            const eyeLidTarget = (state) => {
                switch (state) {
                    case 'closed': return 1;
                    case 'half': return 0.46;
                    case 'smile':
                    case 'squint':
                    case 'sad':
                    case 'tear': return 0.28;
                    case 'wide':
                    case 'open':
                    case 'look-left':
                    case 'look-right':
                    case 'look-up':
                    case 'look-down':
                    case 'roll':
                    default:
                        return 0;
                }
            };

            const gazeDeltaForState = (state) => {
                switch (state) {
                    case 'look-left':
                        return { x: -8, y: 0 };
                    case 'look-right':
                        return { x: 8, y: 0 };
                    case 'look-up':
                        return { x: 0, y: -4 };
                    case 'look-down':
                        return { x: 0, y: 4 };
                    case 'roll':
                        return { x: 3, y: -3 };
                    case 'wide':
                        return { x: 0, y: 0 };
                    default:
                        return { x: 0, y: 0 };
                }
            };

            const browDeltaForState = (state, side) => {
                switch (state) {
                    case 'raised': return { y: -10, rotation: 0 };
                    case 'lowered': return { y: 6, rotation: 0 };
                    case 'angry-left': return side === 'left' ? { y: 7, rotation: 14 } : { y: 3, rotation: -6 };
                    case 'angry-right': return side === 'right' ? { y: 7, rotation: -14 } : { y: 3, rotation: 6 };
                    case 'sad-left': return side === 'left' ? { y: 6, rotation: 12 } : { y: 3, rotation: -4 };
                    case 'sad-right': return side === 'right' ? { y: 6, rotation: -12 } : { y: 3, rotation: 4 };
                    case 'skeptical-high': return { y: -12, rotation: side === 'left' ? -6 : 6 };
                    case 'skeptical-low': return { y: 5, rotation: side === 'left' ? 6 : -6 };
                    case 'neutral':
                    default:
                        return { y: 0, rotation: 0 };
                }
            };

            const mouthTargets = (state) => {
                switch (state) {
                    case 'smile': return { scaleY: 0.22, scaleX: 1.14, lowerLipY: -move(3), upperLipY: -move(3), teethOpacity: 0.9 };
                    case 'grin': return { scaleY: 0.30, scaleX: 1.20, lowerLipY: -move(2), upperLipY: -move(4), teethOpacity: 0.95 };
                    case 'frown': return { scaleY: 0.16, scaleX: 0.82, lowerLipY: move(7), upperLipY: move(5), teethOpacity: 0.05 };
                    case 'pout': return { scaleY: 0.18, scaleX: 0.78, lowerLipY: move(5), upperLipY: move(2), teethOpacity: 0.04 };
                    case 'talking': return { scaleY: 0.84, scaleX: 1.00, lowerLipY: move(10), upperLipY: -move(2), teethOpacity: 0.55 };
                    case 'open': return { scaleY: 1.00, scaleX: 0.92, lowerLipY: move(14), upperLipY: -move(5), teethOpacity: 0.28 };
                    case 'wide-open': return { scaleY: 1.30, scaleX: 0.82, lowerLipY: move(20), upperLipY: -move(10), teethOpacity: 0.16 };
                    case 'singing': return { scaleY: 1.08, scaleX: 0.86, lowerLipY: move(16), upperLipY: -move(8), teethOpacity: 0.22 };
                    case 'cry': return { scaleY: 0.42, scaleX: 0.78, lowerLipY: move(8), upperLipY: move(4), teethOpacity: 0.08 };
                    case 'smirk': return { scaleY: 0.24, scaleX: 1.06, lowerLipY: -move(1), upperLipY: -move(1), teethOpacity: 0.42 };
                    case 'grimace': return { scaleY: 0.26, scaleX: 0.94, lowerLipY: move(3), upperLipY: move(2), teethOpacity: 0.74 };
                    case 'snarl': return { scaleY: 0.30, scaleX: 1.02, lowerLipY: move(4), upperLipY: -move(2), teethOpacity: 0.68 };
                    case 'neutral':
                    default:
                        return { scaleY: 0.34, scaleX: 1.00, lowerLipY: 0, upperLipY: 0, teethOpacity: 0.78 };
                }
            };

            let count = 0;

            lids.forEach(obj => {
                const side = getSide(this.getFaceRole(obj) || obj.name || 'left');
                const eyeState = resolveEyeState(side);
                const lidTarget = eyeLidTarget(eyeState);
                count += add(obj, 'Canonical Eye Lid', 620, [to(obj, 'opacity', lidTarget, 220)]);
            });

            brows.forEach(obj => {
                const side = getSide(this.getFaceRole(obj) || obj.name || 'left');
                const state = resolveBrowState(side);
                const delta = browDeltaForState(state, side);
                const yOffset = delta.y + (resolveOffset(`brow-${side}`, 'y') * 120);
                count += add(obj, 'Canonical Brow Y', 620, [nudge(obj, 'y', yOffset, 240)]);
                if (delta.rotation) {
                    count += add(obj, 'Canonical Brow Rotation', 620, [nudge(obj, 'rotation', delta.rotation, 240)]);
                }
            });

            const mouthSpec = mouthTargets(expr.mouth || 'neutral');
            const mouthOffsetY = resolveOffset('mouth', 'y') * 120;
            const mouthOpening = role['mouth-opening'];
            count += add(mouthOpening, 'Canonical Mouth Opening', 700, [
                to(mouthOpening, 'scaleY', mouthSpec.scaleY, 260),
                to(mouthOpening, 'scaleX', mouthSpec.scaleX, 260)
            ]);
            count += add(role['upper-lip'], 'Canonical Upper Lip', 700, [nudge(role['upper-lip'], 'y', mouthSpec.upperLipY + mouthOffsetY, 260)]);
            count += add(role['lower-lip'], 'Canonical Lower Lip', 700, [nudge(role['lower-lip'], 'y', mouthSpec.lowerLipY + mouthOffsetY, 260)]);
            count += add(role.teeth, 'Canonical Teeth', 700, [to(role.teeth, 'opacity', mouthSpec.teethOpacity, 220)]);

            const gaze = gazeDeltaForState(expr.eye || 'open');
            pupils.forEach(obj => {
                const cfg = [
                    nudge(obj, 'x', gaze.x, 240),
                    nudge(obj, 'y', gaze.y, 240)
                ];
                if (expr.eye === 'wide' || expr.eye === 'look-up' || expr.eye === 'look-down' || expr.eye === 'roll') {
                    cfg.push(to(obj, 'scaleX', 1.1, 220), to(obj, 'scaleY', 1.1, 220));
                }
                count += add(obj, 'Canonical Pupil Gaze', 620, cfg);
            });

            return count;
        }

        _getCurrentFaceSetMotionSignature(parts) {
            const first = Array.isArray(parts) ? parts.find(Boolean) : null;
            return first?._faceSetAppliedMotionSignature || null;
        }

        _setFaceSetMotionSignature(parts, key, signature) {
            (parts || []).forEach(obj => {
                if (!obj) return;
                obj._faceSetAppliedMotionKey = key || 'neutral';
                obj._faceSetAppliedMotionSignature = signature || null;
            });
        }

        _hasFaceSetMotionTracks(parts) {
            return (parts || []).some(obj => Array.isArray(obj?.animations)
                && obj.animations.some(anim => anim.type === 'face-set' || anim.type === 'face-set-motion'));
        }

        buildMotionForSet(key, parts, options = {}) {
            const actionKey = this._resolveFaceSetActionKey(key);
            if (actionKey === 'cry') {
                this._ensureFaceSetTears(parts);
            }
            const intensityKey = FACE_MOTION_INTENSITY_PRESETS[options.intensity]
                ? options.intensity
                : (FACE_MOTION_INTENSITY_PRESETS[this.faceMotionIntensity] ? this.faceMotionIntensity : 'normal');
            const intensity = FACE_MOTION_INTENSITY_PRESETS[intensityKey]?.multiplier || 1;
            const role = this.mapPartsByRole(parts);
            const hasSmartCutFace = Array.isArray(parts) && parts.some(obj => this.isSmartCutFacePart(obj));
            const both = (...roles) => roles.map(name => role[name]).filter(Boolean);
            const px = (value) => Number(value) || 0;
            const withIntensity = (prop, from, value) => {
                if (!Number.isFinite(Number(from)) || !Number.isFinite(Number(value))) return value;
                let next = Number(from) + ((Number(value) - Number(from)) * intensity);
                if (prop === 'opacity') next = Math.max(0, Math.min(1, next));
                if (prop === 'scaleX' || prop === 'scaleY') next = Math.max(0.02, next);
                return next;
            };
            const nudge = (obj, prop, amount, duration = 240, delay = 0, easing = 'easeInOut') => {
                if (!obj) return null;
                const from = Number.isFinite(Number(obj[prop])) ? Number(obj[prop]) : (prop.startsWith('scale') ? 1 : 0);
                return { property: prop, from, to: from + (amount * intensity), duration, delay, easing };
            };
            const to = (obj, prop, value, duration = 240, delay = 0, easing = 'easeInOut') => {
                if (!obj) return null;
                const from = Number.isFinite(Number(obj[prop])) ? Number(obj[prop]) : (prop.startsWith('scale') ? 1 : 0);
                return { property: prop, from, to: withIntensity(prop, from, value), duration, delay, easing };
            };
            const bounce = (obj, prop, amount, duration = 520, split = 0.5) => {
                if (!obj) return [];
                const from = Number.isFinite(Number(obj[prop])) ? Number(obj[prop]) : (prop.startsWith('scale') ? 1 : 0);
                const scaledAmount = amount * intensity;
                const first = Math.round(duration * split);
                return [
                    { property: prop, from, to: from + scaledAmount, duration: first, easing: 'easeOut' },
                    { property: prop, from: from + scaledAmount, to: from, duration: duration - first, delay: first, easing: 'easeInOut' }
                ];
            };
            const add = (obj, name, duration, configs) => {
                const valid = configs.flat().filter(Boolean);
                if (obj && valid.length) {
                    this.addMotionAnimation(obj, name, duration, valid);
                    return 1;
                }
                return 0;
            };
            const buildTalkConfigs = (obj, prop, values, profile, perValueDuration = 115, offset = 0) => {
                if (!obj || !Array.isArray(values) || !values.length) return [];
                const durationMs = Math.max(800, Number(profile?.durationMs) || 1450);
                const cycleMs = Math.max(180, Number(profile?.cycleMs) || 340);
                const configs = [];
                for (let start = offset; start < durationMs - 20; start += cycleMs) {
                    values.forEach((value, index) => {
                        const delay = Math.round(start + index * (cycleMs / values.length));
                        if (delay >= durationMs) return;
                        configs.push(to(obj, prop, value, Math.min(perValueDuration, Math.max(70, durationMs - delay)), delay));
                    });
                }
                return configs;
            };
            let appliedCount = 0;
            const mouthScale = Math.max(0.75, px(role['mouth-opening']?.height) / 54 || 1);
            const move = (value) => value * mouthScale;
            parts.forEach(obj => {
                if (obj) obj._faceSetMotionIntensity = intensityKey;
            });
            const lids = both('left-blink-lid', 'right-blink-lid');
            const brows = both('left-eyebrow', 'right-eyebrow');
            const pupils = both('left-pupil', 'right-pupil', 'left-iris', 'right-iris', 'left-eye-shine', 'right-eye-shine');
            const tears = both('left-tear', 'right-tear');
            const smartCutEyes = hasSmartCutFace ? both('left-eye-sclera', 'right-eye-sclera') : [];
            const smartCutEyeConfigs = (obj, scaleY, opacity, duration = 180, delay = 0) => [
                to(obj, 'scaleY', scaleY, duration, delay, 'easeInOut'),
                to(obj, 'opacity', opacity, Math.max(90, duration - 20), delay, 'easeInOut')
            ];
            const smartCutGazeDeltaForAction = (action) => {
                switch (action) {
                    case 'lookLeft':
                    case 'look-left':
                        return { x: -Math.max(4, Math.min(12, (px(smartCutEyes[0]?.width) || 60) * 0.12)), y: 0 };
                    case 'lookRight':
                    case 'look-right':
                        return { x: Math.max(4, Math.min(12, (px(smartCutEyes[0]?.width) || 60) * 0.12)), y: 0 };
                    case 'lookUp':
                    case 'look-up':
                        return { x: 0, y: -Math.max(3, Math.min(9, (px(smartCutEyes[0]?.height) || 36) * 0.12)) };
                    case 'lookDown':
                    case 'look-down':
                        return { x: 0, y: Math.max(3, Math.min(9, (px(smartCutEyes[0]?.height) || 36) * 0.12)) };
                    case 'eyeRoll':
                    case 'eye-roll':
                        return { x: Math.max(3, Math.min(9, (px(smartCutEyes[0]?.width) || 60) * 0.08)), y: -Math.max(2, Math.min(7, (px(smartCutEyes[0]?.height) || 36) * 0.1)) };
                    default:
                        return null;
                }
            };
            const addSmartCutEyePose = (name, scaleY, opacity, duration = 900, delay = 0) => {
                if (!smartCutEyes.length) return 0;
                let count = 0;
                smartCutEyes.forEach(obj => {
                    count += add(obj, name, duration, smartCutEyeConfigs(obj, scaleY, opacity, 190, delay));
                });
                return count;
            };
            const addSmartCutBlink = (name, duration = 720, targetScale = 0.08, targetOpacity = 0.18) => {
                if (!smartCutEyes.length) return 0;
                let count = 0;
                smartCutEyes.forEach(obj => {
                    count += add(obj, name, duration, [
                        ...smartCutEyeConfigs(obj, targetScale, targetOpacity, 95, 0),
                        ...smartCutEyeConfigs(obj, 1, 1, 120, 120)
                    ]);
                });
                pupils.forEach(obj => {
                    count += add(obj, `${name} Gaze`, duration, [
                        ...smartCutEyeConfigs(obj, targetScale, 0.04, 95, 0),
                        ...smartCutEyeConfigs(obj, 1, 1, 120, 120)
                    ]);
                });
                return count;
            };
            const addSmartCutGazeFallback = (name, delta, duration = 900) => {
                if (!smartCutEyes.length || pupils.length) return 0;
                if (!delta || (!delta.x && !delta.y)) return 0;
                let count = 0;
                smartCutEyes.forEach(obj => {
                    const configs = [
                        nudge(obj, 'x', delta.x || 0, 220, 0, 'easeOut'),
                        nudge(obj, 'y', delta.y || 0, 220, 0, 'easeOut')
                    ];
                    if (name.toLowerCase().includes('roll')) {
                        configs.push(
                            nudge(obj, 'x', -(delta.x || 0) * 1.2, 220, 260, 'easeInOut'),
                            nudge(obj, 'y', Math.abs(delta.y || 0) * 1.6, 220, 260, 'easeInOut'),
                            nudge(obj, 'x', delta.x || 0, 220, 520, 'easeInOut'),
                            nudge(obj, 'y', delta.y || 0, 220, 520, 'easeInOut')
                        );
                    }
                    count += add(obj, name, duration, configs);
                });
                return count;
            };

            const canonicalExpr = this._getCanonicalExpressionSpecForMotion(key);
            appliedCount += this._applyCanonicalExpressionToSet(role, canonicalExpr, {
                add,
                to,
                nudge,
                move,
                lids,
                brows,
                pupils
            });
            appliedCount += addSmartCutGazeFallback(
                `Face SmartCut ${String(actionKey || key || 'Look')} Gaze`,
                smartCutGazeDeltaForAction(actionKey) || smartCutGazeDeltaForAction(key),
                actionKey === 'eyeRoll' ? 1100 : 900
            );

            switch (actionKey) {
                case 'smile':
                    appliedCount += add(role['mouth-opening'], 'Face Smile Opening', 900, [
                        to(role['mouth-opening'], 'scaleY', 0.22, 260),
                        to(role['mouth-opening'], 'scaleX', 1.18, 260)
                    ]);
                    appliedCount += add(role['upper-lip'], 'Face Smile Upper Lip', 900, [nudge(role['upper-lip'], 'y', -move(5), 260)]);
                    appliedCount += add(role['lower-lip'], 'Face Smile Lower Lip', 900, [nudge(role['lower-lip'], 'y', -move(4), 260), to(role['lower-lip'], 'scaleX', 1.12, 260)]);
                    appliedCount += add(role.teeth, 'Face Smile Teeth', 900, [to(role.teeth, 'opacity', 0.92, 220)]);
                    brows.forEach(obj => { appliedCount += add(obj, 'Face Smile Brow', 900, [nudge(obj, 'y', -4, 260)]); });
                    appliedCount += addSmartCutEyePose('Face Smile SmartCut Eye Squint', 0.72, 0.96, 900);
                    break;

                case 'talk':
                    {
                        const profile = options.talkProfile || this.getTalkDurationProfile();
                        const durationMs = profile.durationMs;
                        const cycleMs = profile.cycleMs;
                        appliedCount += add(role['mouth-opening'], 'Face Talk Opening', durationMs, [
                            ...buildTalkConfigs(role['mouth-opening'], 'scaleY', [0.92, 0.36, 1.16, 0.48, 0.86, 0.32], profile, 120),
                            ...buildTalkConfigs(role['mouth-opening'], 'scaleX', [0.92, 1.1, 0.88, 1.14, 0.96, 1.04], profile, 120, Math.round(cycleMs * 0.08)),
                            to(role['mouth-opening'], 'scaleY', 0.32, 160, Math.max(0, durationMs - 170), 'easeInOut'),
                            to(role['mouth-opening'], 'scaleX', 1.04, 160, Math.max(0, durationMs - 170), 'easeInOut')
                        ]);
                        appliedCount += add(role['upper-lip'], 'Face Talk Upper Lip', durationMs, [
                            ...buildTalkConfigs(role['upper-lip'], 'y', [
                                role['upper-lip'] ? role['upper-lip'].y - move(8) : 0,
                                role['upper-lip'] ? role['upper-lip'].y - move(2) : 0,
                                role['upper-lip'] ? role['upper-lip'].y - move(6) : 0,
                                role['upper-lip'] ? role['upper-lip'].y : 0
                            ], profile, 125),
                            ...buildTalkConfigs(role['upper-lip'], 'scaleY', [0.82, 1.06, 0.9, 1.02], profile, 125, Math.round(cycleMs * 0.12)),
                            to(role['upper-lip'], 'y', role['upper-lip']?.y || 0, 160, Math.max(0, durationMs - 170), 'easeInOut'),
                            to(role['upper-lip'], 'scaleY', 1, 160, Math.max(0, durationMs - 170), 'easeInOut')
                        ]);
                        appliedCount += add(role['lower-lip'], 'Face Talk Lower Lip', durationMs, [
                            ...buildTalkConfigs(role['lower-lip'], 'y', [
                                role['lower-lip'] ? role['lower-lip'].y + move(24) : 0,
                                role['lower-lip'] ? role['lower-lip'].y + move(7) : 0,
                                role['lower-lip'] ? role['lower-lip'].y + move(20) : 0,
                                role['lower-lip'] ? role['lower-lip'].y : 0
                            ], profile, 125, Math.round(cycleMs * 0.05)),
                            ...buildTalkConfigs(role['lower-lip'], 'scaleY', [1.18, 0.92, 1.12, 0.98], profile, 125, Math.round(cycleMs * 0.1)),
                            ...buildTalkConfigs(role['lower-lip'], 'scaleX', [0.94, 1.08, 0.98, 1.04], profile, 125, Math.round(cycleMs * 0.2)),
                            to(role['lower-lip'], 'y', role['lower-lip']?.y || 0, 160, Math.max(0, durationMs - 170), 'easeInOut'),
                            to(role['lower-lip'], 'scaleX', 1, 160, Math.max(0, durationMs - 170), 'easeInOut'),
                            to(role['lower-lip'], 'scaleY', 1, 160, Math.max(0, durationMs - 170), 'easeInOut')
                        ]);
                        appliedCount += add(role.teeth, 'Face Talk Teeth', durationMs, [
                            ...buildTalkConfigs(role.teeth, 'opacity', [0.3, 0.82, 0.38, 0.72], profile, 110),
                            to(role.teeth, 'opacity', 0.78, 150, Math.max(0, durationMs - 160), 'easeInOut')
                        ]);
                        if (hasSmartCutFace) {
                            appliedCount += add(role['mouth-opening'], 'Face Talk SmartCut Opening Visibility', durationMs, [
                                ...buildTalkConfigs(role['mouth-opening'], 'opacity', [0.95, 0.45, 1, 0.52, 0.9, 0.38], profile, 110, Math.round(cycleMs * 0.04)),
                                to(role['mouth-opening'], 'opacity', 0.72, 150, Math.max(0, durationMs - 160), 'easeInOut')
                            ]);
                        }
                    }
                    break;

                case 'laugh':
                    appliedCount += add(role['mouth-opening'], 'Face Laugh Opening', 1400, [to(role['mouth-opening'], 'scaleY', 1.28, 220), to(role['mouth-opening'], 'scaleX', 1.18, 220)]);
                    appliedCount += add(role['upper-lip'], 'Face Laugh Upper Lip', 1400, [nudge(role['upper-lip'], 'y', -move(9), 220)]);
                    appliedCount += add(role['lower-lip'], 'Face Laugh Lower Lip', 1400, [nudge(role['lower-lip'], 'y', move(22), 220), to(role['lower-lip'], 'scaleX', 1.16, 220)]);
                    appliedCount += add(role.teeth, 'Face Laugh Teeth', 1400, [to(role.teeth, 'opacity', 0.95, 180)]);
                    lids.forEach(obj => { appliedCount += add(obj, 'Face Laugh Eye Squint', 1400, [to(obj, 'opacity', 0.32, 180)]); });
                    brows.forEach(obj => { appliedCount += add(obj, 'Face Laugh Brow', 1400, [nudge(obj, 'y', -12, 220)]); });
                    appliedCount += addSmartCutEyePose('Face Laugh SmartCut Eye Squint', 0.38, 0.86, 1400);
                    break;

                case 'shout':
                    appliedCount += add(role['mouth-opening'], 'Face Shout Opening', 1200, [to(role['mouth-opening'], 'scaleY', 1.58, 180), to(role['mouth-opening'], 'scaleX', 0.92, 180)]);
                    appliedCount += add(role['upper-lip'], 'Face Shout Upper Lip', 1200, [nudge(role['upper-lip'], 'y', -move(13), 180)]);
                    appliedCount += add(role['lower-lip'], 'Face Shout Lower Lip', 1200, [nudge(role['lower-lip'], 'y', move(28), 180)]);
                    appliedCount += add(role.teeth, 'Face Shout Teeth', 1200, [to(role.teeth, 'opacity', 0.15, 160)]);
                    brows.forEach(obj => { appliedCount += add(obj, 'Face Shout Brow', 1200, [nudge(obj, 'y', -18, 180)]); });
                    break;

                case 'frown':
                    appliedCount += add(role['mouth-opening'], 'Face Frown Opening', 1000, [to(role['mouth-opening'], 'scaleY', 0.16, 260), to(role['mouth-opening'], 'scaleX', 0.82, 260)]);
                    appliedCount += add(role['upper-lip'], 'Face Frown Upper Lip', 1000, [nudge(role['upper-lip'], 'y', move(5), 260), to(role['upper-lip'], 'scaleX', 0.88, 260)]);
                    appliedCount += add(role['lower-lip'], 'Face Frown Lower Lip', 1000, [nudge(role['lower-lip'], 'y', move(8), 260), to(role['lower-lip'], 'scaleX', 0.86, 260)]);
                    appliedCount += add(role.teeth, 'Face Frown Teeth', 1000, [to(role.teeth, 'opacity', 0.05, 180)]);
                    appliedCount += add(role['left-eyebrow'], 'Face Frown Left Brow', 1000, [nudge(role['left-eyebrow'], 'y', 8, 240), nudge(role['left-eyebrow'], 'rotation', 14, 240)]);
                    appliedCount += add(role['right-eyebrow'], 'Face Frown Right Brow', 1000, [nudge(role['right-eyebrow'], 'y', 8, 240), nudge(role['right-eyebrow'], 'rotation', -14, 240)]);
                    appliedCount += addSmartCutEyePose('Face Frown SmartCut Eyes', 0.82, 0.94, 1000);
                    break;

                case 'surprised':
                    appliedCount += add(role['mouth-opening'], 'Face Surprised Opening', 1100, [to(role['mouth-opening'], 'scaleY', 1.38, 200), to(role['mouth-opening'], 'scaleX', 0.78, 200)]);
                    appliedCount += add(role['upper-lip'], 'Face Surprised Upper Lip', 1100, [nudge(role['upper-lip'], 'y', -move(8), 200)]);
                    appliedCount += add(role['lower-lip'], 'Face Surprised Lower Lip', 1100, [nudge(role['lower-lip'], 'y', move(18), 200)]);
                    brows.forEach(obj => { appliedCount += add(obj, 'Face Surprised Brow', 1100, [nudge(obj, 'y', -20, 200)]); });
                    pupils.forEach(obj => { appliedCount += add(obj, 'Face Surprised Pupils', 1100, [to(obj, 'scaleX', 1.12, 200), to(obj, 'scaleY', 1.12, 200)]); });
                    appliedCount += addSmartCutEyePose('Face Surprised SmartCut Eyes', 1.12, 1, 1100);
                    break;

                case 'blink':
                    lids.forEach(obj => { appliedCount += add(obj, 'Face Blink', 720, [
                        to(obj, 'opacity', 0.72, 90, 0, 'easeOut'),
                        to(obj, 'opacity', 1, 80, 90, 'easeOut'),
                        to(obj, 'opacity', 1, 65, 170, 'linear'),
                        to(obj, 'opacity', 0, 170, 235, 'easeInOut')
                    ]); });
                    appliedCount += addSmartCutBlink('Face SmartCut Blink');
                    break;

                case 'winkLeft':
                    appliedCount += add(role['left-blink-lid'], 'Face Wink Left', 900, [
                        to(role['left-blink-lid'], 'opacity', 1, 120),
                        to(role['left-blink-lid'], 'opacity', 0, 170, 280)
                    ]);
                    if (hasSmartCutFace && role['left-eye-sclera']) {
                        appliedCount += add(role['left-eye-sclera'], 'Face SmartCut Wink Left', 900, [
                            ...smartCutEyeConfigs(role['left-eye-sclera'], 0.08, 0.18, 120, 0),
                            ...smartCutEyeConfigs(role['left-eye-sclera'], 1, 1, 170, 280)
                        ]);
                        both('left-pupil', 'left-iris', 'left-eye-shine').forEach(obj => {
                            appliedCount += add(obj, 'Face SmartCut Wink Left Gaze', 900, [
                                ...smartCutEyeConfigs(obj, 0.08, 0.04, 120, 0),
                                ...smartCutEyeConfigs(obj, 1, 1, 170, 280)
                            ]);
                        });
                    }
                    appliedCount += add(role['mouth-opening'], 'Face Wink Smile', 900, [to(role['mouth-opening'], 'scaleY', 0.2, 220), to(role['mouth-opening'], 'scaleX', 1.14, 220)]);
                    appliedCount += add(role['lower-lip'], 'Face Wink Lower Lip', 900, [nudge(role['lower-lip'], 'y', -move(3), 220)]);
                    break;

                case 'chew':
                    appliedCount += add(role['mouth-opening'], 'Face Chew Opening', 1500, [
                        to(role['mouth-opening'], 'scaleY', 0.72, 160),
                        to(role['mouth-opening'], 'scaleY', 0.24, 140, 180),
                        to(role['mouth-opening'], 'scaleY', 0.68, 160, 360),
                        to(role['mouth-opening'], 'scaleY', 0.22, 140, 560),
                        to(role['mouth-opening'], 'scaleY', 0.62, 160, 740),
                        to(role['mouth-opening'], 'scaleY', 0.28, 160, 940)
                    ]);
                    appliedCount += add(role['lower-lip'], 'Face Chew Lower Lip', 1500, [
                        nudge(role['lower-lip'], 'y', move(10), 150),
                        nudge(role['lower-lip'], 'x', -move(5), 150, 180),
                        nudge(role['lower-lip'], 'y', move(9), 150, 360),
                        nudge(role['lower-lip'], 'x', move(5), 150, 560)
                    ]);
                    appliedCount += add(role.teeth, 'Face Chew Teeth', 1500, [to(role.teeth, 'opacity', 0.42, 120), to(role.teeth, 'opacity', 0.78, 120, 560)]);
                    break;

                case 'cry':
                        appliedCount += add(role['mouth-opening'], 'Face Cry Opening', 1400, [to(role['mouth-opening'], 'scaleY', 0.44, 180), to(role['mouth-opening'], 'scaleX', 0.78, 180)]);
                        appliedCount += add(role['upper-lip'], 'Face Cry Upper Lip', 1400, [nudge(role['upper-lip'], 'y', move(5), 180)]);
                        appliedCount += add(role['lower-lip'], 'Face Cry Lower Lip', 1400, [bounce(role['lower-lip'], 'y', move(8), 520), bounce(role['lower-lip'], 'y', move(6), 520).map(c => ({ ...c, delay: (c.delay || 0) + 520 }))]);
                        lids.forEach(obj => { appliedCount += add(obj, 'Face Cry Lids', 1400, [to(obj, 'opacity', 0.26, 180)]); });
                        appliedCount += addSmartCutEyePose('Face Cry SmartCut Eyes', 0.42, 0.82, 1400);
                        appliedCount += add(role['left-eyebrow'], 'Face Cry Left Brow', 1400, [nudge(role['left-eyebrow'], 'y', 6, 180), nudge(role['left-eyebrow'], 'rotation', 18, 180)]);
                        appliedCount += add(role['right-eyebrow'], 'Face Cry Right Brow', 1400, [nudge(role['right-eyebrow'], 'y', 6, 180), nudge(role['right-eyebrow'], 'rotation', -18, 180)]);
                        tears.forEach((obj, index) => {
                            const sideDelay = index * 120;
                            const startY = Number(obj?.y) || 0;
                            appliedCount += add(obj, 'Face Cry Tear Drop', 1400, [
                                to(obj, 'opacity', 0.96, 150, 120 + sideDelay, 'easeOut'),
                                nudge(obj, 'y', move(16), 520, 180 + sideDelay, 'easeInOut'),
                                to(obj, 'scaleY', 1.22, 420, 190 + sideDelay, 'easeInOut'),
                                to(obj, 'opacity', 0.72, 160, 720 + sideDelay, 'linear'),
                                { property: 'y', from: startY + move(16), to: startY + move(34), duration: 420, delay: 780 + sideDelay, easing: 'easeIn' },
                                to(obj, 'opacity', 0, 260, 1030 + sideDelay, 'easeIn'),
                                { property: 'y', from: startY + move(34), to: startY, duration: 80, delay: 1320, easing: 'linear' },
                                to(obj, 'scaleY', 1, 80, 1320, 'linear')
                            ]);
                        });
                    break;
            }

                    return appliedCount;
        }

        addAnimation(obj, name, durationMs, generated) {
            if (!obj) return;
            const normalized = generated.map(config => ({
                property: config.property,
                from: config.from,
                to: config.to,
                duration: config.duration,
                _stepDelay: config.delay || 0,
                easing: config.easing || 'easeInOut'
            }));
            obj.animations.push({
                id: Utils.generateId('anim'),
                type: 'face-set',
                name,
                params: {
                    duration: durationMs / 1000,
                    delay: 0,
                    easing: 'easeInOut',
                    repeat: 0,
                    repeatMode: 'restart',
                    startMode: 'timeline'
                },
                delay: 0,
                repeat: 0,
                repeatMode: 'restart',
                _faceSetAnimationBase: {
                    x: Number(obj.x) || 0,
                    y: Number(obj.y) || 0,
                    rotation: Number(obj.rotation) || 0,
                    scaleX: Number(obj.scaleX) || 1,
                    scaleY: Number(obj.scaleY) || 1
                },
                generated: normalized
            });
        }

        addMotionAnimation(obj, name, durationMs, generated) {
            if (!obj) return;
            const normalized = generated.map(config => ({
                property: config.property,
                from: config.from,
                to: config.to,
                _faceSetRelativeDelta: (Number.isFinite(config.to) && Number.isFinite(config.from))
                    ? (config.to - config.from)
                    : null,
                duration: config.duration,
                _stepDelay: config.delay || 0,
                easing: config.easing || 'easeInOut'
            }));
            obj.animations.push({
                id: Utils.generateId('anim'),
                type: 'face-set-motion',
                name,
                params: {
                    duration: durationMs / 1000,
                    delay: 0,
                    easing: 'easeInOut',
                    repeat: 0,
                    repeatMode: 'restart',
                    startMode: 'timeline'
                },
                delay: 0,
                repeat: 0,
                repeatMode: 'restart',
                _faceSetAnimationBase: {
                    x: Number(obj.x) || 0,
                    y: Number(obj.y) || 0,
                    rotation: Number(obj.rotation) || 0,
                    scaleX: Number(obj.scaleX) || 1,
                    scaleY: Number(obj.scaleY) || 1
                },
                generated: normalized
            });
        }

        registerGroup(groupId, name, parts) {
            if (!this.objects || !groupId || !Array.isArray(parts)) return;
            this.objects._groupCounter = (this.objects._groupCounter || 0) + 1;
            this.objects.groups[groupId] = parts.map(part => part.id);
            this.objects.groupNames[groupId] = `Face Set - ${name}`;
            parts.forEach(part => { part.groupId = groupId; });
        }

        selectParts(parts) {
            const ids = parts.map(part => part.id);
            if (typeof this.objects.select === 'function') {
                this.objects.select(ids);
            } else {
                this.objects.selectedIds = ids;
            }
        }

        setStatus(message) {
            const status = this.panel?.querySelector('#face-rig-simple-status');
            if (status) status.textContent = message;
        }

        static get availableSets() {
            return SETS;
        }

        static get availableMotions() {
            return FACE_MOTIONS;
        }
    }

    window.FaceRigManager = FaceRigManager;
})();
