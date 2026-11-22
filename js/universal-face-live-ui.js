/* ============================================
   Universal Face Live UI Patch
   Standalone universal face workflow that works with
   any stage object/group (not only UC or image hosts).
   ============================================ */

(function () {
    const FaceRigManager = window.FaceRigManager;
    if (!FaceRigManager) return;

    const baseInsertFacialSet = FaceRigManager.prototype.insertFacialSet;
    const baseApplyFaceMotion = FaceRigManager.prototype.applyFaceMotion;
    const USER_STYLE_STORAGE_KEY = 'animationStage.universalFace.userStyles.v1';
    const USER_TEMPLATE_STORAGE_KEY = 'animationStage.universalFace.templates.v1';

    const getAvailableSets = () => FaceRigManager.availableSets || {};
    const getAvailableMotions = () => FaceRigManager.availableMotions || {};

    const VIEW_PRESETS = {
        front: {
            name: 'Front View',
            eyeScaleX: 1,
            hideFarEye: false,
            browSkew: 0
        },
        side: {
            name: 'Side View',
            eyeScaleX: 0.62,
            hideFarEye: true,
            browSkew: 8
        }
    };

    const DURATIONS = [1, 2, 3, 5, 8, 10, 15, 20, 30];
    const MOTION_CATEGORY_ORDER = ['Core', 'Emotion', 'Eyes + Gaze', 'Speech', 'Other'];
    const LIPSYNC_PACKS = {
        natural: { label: 'Natural', speedScale: 1, strengthScale: 1, mouthScale: 1, pauseScale: 1 },
        clear: { label: 'Clear Speech', speedScale: 0.92, strengthScale: 1.12, mouthScale: 1.15, pauseScale: 0.95 },
        cartoon: { label: 'Cartoon', speedScale: 0.85, strengthScale: 1.28, mouthScale: 1.35, pauseScale: 0.9 },
        dramatic: { label: 'Dramatic', speedScale: 0.9, strengthScale: 1.2, mouthScale: 1.25, pauseScale: 1.05 }
    };
    const LIPSYNC_TALK_SPEEDS = {
        slow: { label: 'Slow', wpm: 110 },
        normal: { label: 'Normal', wpm: 145 },
        fast: { label: 'Fast', wpm: 180 },
        veryFast: { label: 'Very fast', wpm: 220 }
    };
    const SIMPLE_INTENSITIES = {
        soft: { label: 'Soft' },
        normal: { label: 'Normal' },
        big: { label: 'Big' }
    };
    const QUICK_EXPRESSIONS = [
        { key: 'happy', label: 'Happy', intensity: 'normal', icon: 'fa-face-smile' },
        { key: 'sad', label: 'Sad', intensity: 'soft', icon: 'fa-face-frown' },
        { key: 'angry', label: 'Angry', intensity: 'big', icon: 'fa-face-angry' },
        { key: 'surprised', label: 'Surprised', intensity: 'big', icon: 'fa-face-surprise' },
        { key: 'closedEyes', label: 'Sleepy', intensity: 'soft', icon: 'fa-bed' },
        { key: 'suspicious', label: 'Thinking', intensity: 'soft', icon: 'fa-lightbulb' }
    ];
    const IDLE_PRESETS = [
        { key: 'blinkLoop', label: 'Auto Blink', repeat: '-1', duration: 2, pause: 1.4, intensity: 'soft', icon: 'fa-eye' },
        { key: 'breathing', label: 'Calm Idle', repeat: '-1', duration: 3, pause: 0.6, intensity: 'soft', icon: 'fa-wind' },
        { key: 'lookLeft', label: 'Look Left', repeat: '3', duration: 1, pause: 0.3, intensity: 'normal', icon: 'fa-arrow-left' },
        { key: 'lookRight', label: 'Look Right', repeat: '3', duration: 1, pause: 0.3, intensity: 'normal', icon: 'fa-arrow-right' }
    ];
    const FACE_PART_FOCUS = {
        whole: { label: 'Whole Face', roles: null },
        eyes: { label: 'Eyes', roles: ['left-eye-sclera', 'right-eye-sclera', 'left-iris', 'right-iris', 'left-pupil', 'right-pupil', 'left-eye-shine', 'right-eye-shine', 'left-blink-lid', 'right-blink-lid'] },
        brows: { label: 'Brows', roles: ['left-eyebrow', 'right-eyebrow'] },
        mouth: { label: 'Mouth', roles: ['upper-lip', 'lower-lip', 'mouth-opening', 'teeth'] },
        profile: { label: 'Profile', roles: ['profile-outline', 'profile-nose'] }
    };
    const SIDE_VIEW_FAR_ROLES = new Set([
        'right-eye-sclera',
        'right-iris',
        'right-pupil',
        'right-eye-shine',
        'right-blink-lid',
        'right-eyebrow'
    ]);
    const STYLE_PRESETS = {
        custom: { label: 'Custom' },
        cute: { label: 'Cute', iris: '#8b5cf6', brow: '#4c1d95', lip: '#f472b6', lipDark: '#9d174d', sclera: '#ffffff', sclera2: '#fdf2f8', lid: '#f8c7d8', lid2: '#eda7c1', useScleraGradient: true, useLidGradient: true },
        bold: { label: 'Bold', iris: '#111827', brow: '#050505', lip: '#ef233c', lipDark: '#7f0012', sclera: '#ffffff', sclera2: '#eef2ff', lid: '#f0b99a', lid2: '#d99072', useScleraGradient: true, useLidGradient: true },
        calm: { label: 'Calm', iris: '#64748b', brow: '#334155', lip: '#b85c74', lipDark: '#642135', sclera: '#ffffff', sclera2: '#e0f2fe', lid: '#e7c6ac', lid2: '#c99f84', useScleraGradient: true, useLidGradient: true },
        comic: { label: 'Comic', iris: '#22c55e', brow: '#111111', lip: '#ff4d6d', lipDark: '#8a0f23', sclera: '#fff7ed', sclera2: '#ffffff', lid: '#ffd0b5', lid2: '#f2a384', useScleraGradient: true, useLidGradient: true },
        natural: { label: 'Natural', iris: '#6b3f21', brow: '#2f1b14', lip: '#c65b68', lipDark: '#732633', sclera: '#ffffff', sclera2: '#f3f8ff', lid: '#e8b995', lid2: '#cf9677', useScleraGradient: true, useLidGradient: true }
    };

    Object.assign(FaceRigManager.prototype, {
        installPanel() {
            const panel = document.getElementById('face-rig-controls');
            if (!panel || panel.dataset.simpleFaceSets === 'true') return;
            const sets = getAvailableSets();
            const setKeys = Object.keys(sets);

            this.panel = panel;
            this._panelMotionKey = this._panelMotionKey || 'neutral';
            this._panelDurationSec = this._panelDurationSec || 2;
            this._panelStartSec = Number.isFinite(this._panelStartSec) ? this._panelStartSec : 0;
            this._panelEndSec = Number.isFinite(this._panelEndSec) ? this._panelEndSec : this._panelStartSec + this._panelDurationSec;
            this._panelRepeat = this._panelRepeat || '1';
            this._panelRepeatMode = this._panelRepeatMode || 'restart';
            this._panelRepeatPauseSec = Number.isFinite(this._panelRepeatPauseSec) ? this._panelRepeatPauseSec : 0;
            this._panelAfterPlayback = this._panelAfterPlayback === 'return' ? 'return' : 'keep';
            this._ufViewMode = this._ufViewMode || 'front';
            this._ufPlacementAction = this._ufPlacementAction || 'group';
            this._ufSelectedPlacement = this._ufSelectedPlacement || 'selected';
            this._ufReplaceExisting = !!this._ufReplaceExisting;
            this._ufLiveContextSync = false;
            this._ufStyle = this._ufStyle || this._getSetStyleDefaults(this.selectedSetKey || setKeys[0]);
            this._ufMotionIntensity = this._ufMotionIntensity || 'normal';
            this._ufStylePreset = this._ufStylePreset || 'custom';
            this._ufPartEditMode = this._ufPartEditMode || 'whole';

            panel.dataset.simpleFaceSets = 'true';
            panel.className = 'face-rig-panel face-rig-simple-panel hidden';
            panel.innerHTML = `
                <div class="face-rig-simple-header" data-draggable>
                    <div>
                        <h4><i class="fas fa-face-smile"></i> Universal Face</h4>
                        <p>Create standalone faces or attach faces to any selected object/group with grouping or linking options.</p>
                    </div>
                    <button id="btn-face-rig-done" class="btn-small" title="Close universal face"><i class="fas fa-check"></i></button>
                </div>
                <div class="face-rig-simple-body">
                    <div class="uf-panel-section is-open" data-uf-section="build">
                        <button type="button" class="uf-panel-section-toggle" data-uf-section-toggle="build" aria-expanded="true">
                            <span><i class="fas fa-wand-magic-sparkles"></i> Build & Place</span>
                            <i class="fas fa-chevron-down"></i>
                        </button>
                        <div class="uf-panel-section-body">
                    <div class="face-rig-simple-controls">
                        <label>
                            Face Type
                            <select id="face-rig-set-select">
                                ${setKeys.map(key => `<option value="${key}">${sets[key].name}</option>`).join('')}
                            </select>
                        </label>
                        <label>
                            View
                            <select id="uf-view-select">
                                <option value="front">Front View</option>
                                <option value="side">Side View</option>
                            </select>
                        </label>
                        <label>
                            Size
                            <input id="face-rig-set-size" type="range" min="60" max="220" value="110">
                            <span id="face-rig-set-size-value">110%</span>
                        </label>
                    </div>
                    <div class="face-rig-simple-controls" style="margin-top:6px;">
                        <label>
                            Iris
                            <input id="uf-color-iris" type="color" value="#6b3f21">
                        </label>
                        <label>
                            Brows
                            <input id="uf-color-brow" type="color" value="#2f1b14">
                        </label>
                        <label>
                            Lips
                            <input id="uf-color-lip" type="color" value="#d94c64">
                        </label>
                    </div>
                    <div class="face-rig-simple-controls" style="margin-top:6px;">
                        <label>
                            Sclera Base
                            <input id="uf-color-sclera" type="color" value="#ffffff">
                        </label>
                        <label>
                            Sclera End
                            <input id="uf-color-sclera-2" type="color" value="#f3f8ff">
                        </label>
                        <label class="face-rig-inline-toggle">
                            Sclera Gradient
                            <input id="uf-sclera-gradient" type="checkbox">
                        </label>
                    </div>
                    <div class="face-rig-simple-controls" style="margin-top:6px;">
                        <label>
                            Closed Lid Base
                            <input id="uf-color-lid" type="color" value="#f2c8a8">
                        </label>
                        <label>
                            Closed Lid End
                            <input id="uf-color-lid-2" type="color" value="#dcae8f">
                        </label>
                        <label class="face-rig-inline-toggle">
                            Lid Gradient
                            <input id="uf-lid-gradient" type="checkbox">
                        </label>
                    </div>
                    <div class="face-rig-simple-controls" style="margin-top:6px;">
                        <label>
                            Style Preset
                            <select id="uf-style-preset">
                                ${this._renderStylePresetOptions()}
                            </select>
                        </label>
                        <label>
                            Edit Mode
                            <select id="uf-edit-mode">
                                <option value="whole">Move Whole Face</option>
                                <option value="parts">Edit Parts</option>
                            </select>
                        </label>
                    </div>
                    <div class="face-rig-simple-controls" style="margin-top:6px;">
                        <label>
                            Saved Face Template
                            <select id="uf-template-preset">
                                ${this._renderTemplateOptions()}
                            </select>
                        </label>
                        <label class="face-rig-inline-toggle">
                            Apply Template Layout
                            <input id="uf-template-apply-layout" type="checkbox" checked>
                        </label>
                    </div>
                    <div class="face-rig-simple-actions uf-style-preset-actions" style="margin-top:6px;">
                        <button id="btn-uf-save-style" title="Save current colors as a reusable style"><i class="fas fa-bookmark"></i> Save Style</button>
                        <button id="btn-uf-delete-style" title="Delete selected saved style"><i class="fas fa-trash"></i> Delete Saved</button>
                    </div>
                    <div class="face-rig-simple-actions uf-template-actions" style="margin-top:6px;">
                        <button id="btn-uf-save-template" title="Save selected face colors, view, size, and part layout"><i class="fas fa-save"></i> Save Face Template</button>
                        <button id="btn-uf-delete-template" title="Delete selected saved face template"><i class="fas fa-trash"></i> Delete Template</button>
                    </div>
                    <div id="face-rig-attach-note" class="face-rig-motion-description">Universal Face is available whenever objects exist on stage. Select any object/group to attach, or place standalone on stage.</div>

                    <div id="face-rig-set-grid" class="face-rig-set-grid">
                        ${setKeys.map(key => this.renderSetCard(key)).join('')}
                    </div>

                    <div class="face-rig-simple-controls" style="margin-top:8px;">
                        <label>
                            Placement
                            <select id="uf-placement-select">
                                <option value="selected">Place On Selected Object</option>
                                <option value="stage">Place On Stage</option>
                            </select>
                        </label>
                        <label id="uf-placement-action-wrap">
                            Selected Object Option
                            <select id="uf-placement-action">
                                <option value="group">Group With Selected</option>
                                <option value="dont-group">Do Not Group</option>
                                <option value="link">Link With Selected</option>
                            </select>
                        </label>
                        <label id="uf-replace-wrap" class="face-rig-inline-toggle">
                            <span>Target Mode</span>
                            <select id="uf-replace-mode">
                                <option value="append">Add New Face On Target</option>
                                <option value="replace">Replace Existing Face On Target</option>
                            </select>
                        </label>
                    </div>

                    <div class="face-rig-simple-actions" style="margin-top:8px;">
                        <button id="btn-face-rig-place" class="btn-primary"><i class="fas fa-layer-group"></i> Place Face</button>
                    </div>
                    <div class="face-rig-simple-actions" style="margin-top:6px;">
                        <button id="btn-face-rig-edit-selected"><i class="fas fa-pen"></i> Edit Selected Face</button>
                        <button id="btn-face-rig-apply-style-selected"><i class="fas fa-paintbrush"></i> Apply Style To Selected</button>
                    </div>
                    <div class="face-rig-simple-actions" style="margin-top:6px;">
                        <button id="btn-face-rig-unlink"><i class="fas fa-unlink"></i> Unlink Face</button>
                        <button id="btn-face-rig-ungroup"><i class="fas fa-object-ungroup"></i> Ungroup Face</button>
                    </div>

                    ${this.renderManualFaceBuilder()}
                        </div>
                    </div>

                    <div class="uf-panel-section" data-uf-section="motion">
                        <button type="button" class="uf-panel-section-toggle" data-uf-section-toggle="motion" aria-expanded="false">
                            <span><i class="fas fa-person-running"></i> Face Animation</span>
                            <i class="fas fa-chevron-down"></i>
                        </button>
                        <div class="uf-panel-section-body">
                    <div class="face-rig-motion-library" style="margin-top:0;">
                        <div class="face-rig-motion-head">
                            <strong><i class="fas fa-person-running"></i> Face Animation</strong>
                            <span>Preview first, then apply to timeline for a selected duration range.</span>
                        </div>
                        <div class="uf-expression-preview" id="uf-expression-preview" data-motion="neutral" data-intensity="normal">
                            <div class="uf-expression-face">
                                <span class="uf-expression-brow left"></span>
                                <span class="uf-expression-brow right"></span>
                                <span class="uf-expression-eye left"><span></span></span>
                                <span class="uf-expression-eye right"><span></span></span>
                                <span class="uf-expression-mouth"></span>
                            </div>
                            <div>
                                <strong id="uf-expression-preview-title">Neutral</strong>
                                <span id="uf-expression-preview-copy">Choose an expression to preview the face behavior before applying it.</span>
                            </div>
                        </div>
                        <div class="uf-quick-expression-grid" aria-label="Quick expressions">
                            ${QUICK_EXPRESSIONS.map(item => `<button type="button" data-uf-expression="${item.key}" data-uf-intensity="${item.intensity}" title="${item.label}"><i class="fas ${item.icon}"></i><span>${item.label}</span></button>`).join('')}
                        </div>
                        <div class="uf-idle-preset-grid" aria-label="Idle face presets">
                            ${IDLE_PRESETS.map(item => `<button type="button" data-uf-idle="${item.key}" title="${item.label}"><i class="fas ${item.icon}"></i><span>${item.label}</span></button>`).join('')}
                        </div>
                        <div id="uf-motion-chip-grid" class="uf-motion-chip-grid" aria-label="All face motions"></div>
                        <div class="face-rig-simple-controls">
                            <label>
                                Category
                                <select id="uf-motion-category"></select>
                            </label>
                            <label>
                                Animation
                                <select id="uf-motion-select"></select>
                            </label>
                            <label>
                                Duration
                                <select id="uf-motion-duration">
                                    ${DURATIONS.map(sec => `<option value="${sec}">${sec}s</option>`).join('')}
                                </select>
                            </label>
                            <label>
                                Strength
                                <select id="uf-motion-intensity">
                                    ${Object.entries(SIMPLE_INTENSITIES).map(([key, spec]) => `<option value="${key}">${spec.label}</option>`).join('')}
                                </select>
                            </label>
                            <label>
                                Start (s)
                                <input id="uf-motion-start" type="number" min="0" step="0.1" value="0">
                            </label>
                            <label>
                                End (s)
                                <input id="uf-motion-end" type="number" min="0.1" step="0.1" value="2">
                            </label>
                            <label>
                                Repeat
                                <select id="uf-motion-repeat">
                                    <option value="1">Once</option>
                                    <option value="2">2x</option>
                                    <option value="3">3x</option>
                                    <option value="5">5x</option>
                                    <option value="10">10x</option>
                                    <option value="-1">Loop</option>
                                </select>
                            </label>
                            <label>
                                Repeat Style
                                <select id="uf-motion-repeat-mode">
                                    <option value="restart">Restart</option>
                                    <option value="cycle">Cycle</option>
                                </select>
                            </label>
                            <label>
                                Pause Between Repeats (s)
                                <input id="uf-motion-repeat-pause" type="number" min="0" step="0.1" value="0">
                            </label>
                            <label>
                                After Animation
                                <select id="uf-motion-after">
                                    <option value="keep">Keep Final State</option>
                                    <option value="return">Return To Start State</option>
                                </select>
                            </label>
                        </div>
                        <div id="face-rig-motion-description" class="face-rig-motion-description"></div>
                        <div id="face-rig-motion-total" class="face-rig-motion-description" style="margin-top:4px; opacity:0.9;"></div>
                        <div class="face-rig-motion-actions">
                            <button id="btn-face-rig-preview-motion"><i class="fas fa-eye"></i> Preview</button>
                            <button id="btn-face-rig-apply-motion"><i class="fas fa-check"></i> Apply To Selected</button>
                            <button id="btn-face-rig-clear-motion"><i class="fas fa-eraser"></i> Reset Face</button>
                            <button id="btn-face-rig-apply-playhead"><i class="fas fa-play"></i> Apply At Playhead</button>
                            <button id="btn-face-rig-apply-motion-all"><i class="fas fa-layer-group"></i> Apply To All</button>
                        </div>
                        <div class="face-rig-motion-actions">
                            <button id="btn-face-rig-merge-motion"><i class="fas fa-compress-alt"></i> Merge Animation</button>
                            <button id="btn-face-rig-unmerge-motion"><i class="fas fa-expand-alt"></i> Unmerge Animation</button>
                            <button id="btn-face-rig-validate-timing"><i class="fas fa-stopwatch"></i> Validate Timing</button>
                        </div>
                        <div class="uf-part-focus-actions" aria-label="Face part selection">
                            <button type="button" data-uf-part-focus="whole"><i class="fas fa-object-group"></i> Whole</button>
                            <button type="button" data-uf-part-focus="eyes"><i class="fas fa-eye"></i> Eyes</button>
                            <button type="button" data-uf-part-focus="brows"><i class="fas fa-minus"></i> Brows</button>
                            <button type="button" data-uf-part-focus="mouth"><i class="fas fa-comment"></i> Mouth</button>
                            <button type="button" data-uf-part-focus="profile"><i class="fas fa-user-alt"></i> Profile</button>
                        </div>
                        <div class="uf-part-focus-actions" aria-label="Face conversion">
                            <button type="button" id="btn-uf-convert-front"><i class="fas fa-user"></i> Front</button>
                            <button type="button" id="btn-uf-convert-side"><i class="fas fa-user-alt"></i> Side</button>
                            <button type="button" id="btn-uf-reset-layout"><i class="fas fa-rotate-left"></i> Reset Layout</button>
                            <button type="button" id="btn-uf-remove-face"><i class="fas fa-trash"></i> Remove Face</button>
                        </div>
                        <div class="uf-part-focus-actions" aria-label="Compression shortcuts">
                            <button type="button" id="btn-uf-compress-mouth-pair"><i class="fas fa-link"></i> Pair Mouth Close</button>
                            <button type="button" id="btn-uf-compress-mouth-open"><i class="fas fa-comment-dots"></i> Mouth Open 60%</button>
                            <button type="button" id="btn-uf-compress-blink"><i class="fas fa-eye"></i> Blink 100%</button>
                            <button type="button" id="btn-uf-compress-reset"><i class="fas fa-rotate-left"></i> Reset Compression</button>
                        </div>
                        <div class="uf-part-focus-actions" aria-label="SmartCut face layers">
                            <button type="button" id="btn-uf-select-smartcut-parts"><i class="fas fa-object-group"></i> Parts Only</button>
                            <button type="button" id="btn-uf-edit-smartcut-covers"><i class="fas fa-pen-to-square"></i> Edit Covers</button>
                            <button type="button" id="btn-uf-toggle-smartcut-covers"><i class="fas fa-layer-group"></i> Hide Covers</button>
                            <button type="button" id="btn-uf-toggle-smartcut-base"><i class="fas fa-image"></i> Hide Base</button>
                        </div>
                        <div class="face-rig-simple-controls" style="margin-top:6px;">
                            <label>
                                Cover Target
                                <select id="uf-smartcut-cover-target">
                                    <option value="all">All Covers</option>
                                    <option value="iris">Iris / Pupil Covers</option>
                                    <option value="eye">Eye / Sclera Covers</option>
                                    <option value="brow">Brow Covers</option>
                                    <option value="mouth">Mouth Covers</option>
                                    <option value="selected">Selected Covers</option>
                                </select>
                            </label>
                            <label>
                                Cover Fill
                                <select id="uf-smartcut-cover-mode">
                                    <option value="restore">Original Picture</option>
                                    <option value="solid">Solid Color</option>
                                    <option value="linear-gradient">Linear Gradient</option>
                                    <option value="radial-gradient">Radial Gradient</option>
                                    <option value="picture">Upload Picture</option>
                                </select>
                            </label>
                            <label>
                                Cover Color
                                <input id="uf-smartcut-cover-color-a" type="color" value="#d8a88d">
                            </label>
                            <label>
                                Cover End
                                <input id="uf-smartcut-cover-color-b" type="color" value="#f2c8a8">
                            </label>
                        </div>
                        <div class="uf-part-focus-actions" aria-label="SmartCut cover appearance">
                            <button type="button" id="btn-uf-apply-smartcut-cover-style"><i class="fas fa-fill-drip"></i> Apply Cover</button>
                            <button type="button" id="btn-uf-smartcut-iris-sclera-cover"><i class="fas fa-eye-dropper"></i> Eye Feature = Sclera</button>
                            <button type="button" id="btn-uf-upload-smartcut-cover-picture"><i class="fas fa-image"></i> Cover Picture</button>
                            <input id="uf-smartcut-cover-picture-input" type="file" accept="image/*" class="hidden">
                        </div>
                        <div class="face-rig-simple-controls" style="margin-top:6px;">
                            <label>
                                Cover Edge
                                <input id="uf-smartcut-cover-edge-px" type="range" min="1" max="14" step="1" value="3">
                                <span id="uf-smartcut-cover-edge-px-value">3px</span>
                            </label>
                            <label>
                                Softness
                                <input id="uf-smartcut-cover-softness-px" type="range" min="0" max="12" step="1" value="2">
                                <span id="uf-smartcut-cover-softness-px-value">2px</span>
                            </label>
                        </div>
                        <div class="uf-part-focus-actions" aria-label="SmartCut cover refinement">
                            <button type="button" id="btn-uf-select-target-covers"><i class="fas fa-arrow-pointer"></i> Select Target Covers</button>
                            <button type="button" id="btn-uf-shrink-smartcut-cover"><i class="fas fa-compress"></i> Shrink Cover</button>
                            <button type="button" id="btn-uf-grow-smartcut-cover"><i class="fas fa-expand"></i> Grow Cover</button>
                            <button type="button" id="btn-uf-soften-smartcut-cover"><i class="fas fa-feather"></i> Soften Edge</button>
                            <button type="button" id="btn-uf-erase-smartcut-cover"><i class="fas fa-eraser"></i> Erase Cover</button>
                            <button type="button" id="btn-uf-restore-smartcut-cover-brush"><i class="fas fa-paint-brush"></i> Restore Brush</button>
                            <button type="button" id="btn-uf-reset-smartcut-cover"><i class="fas fa-rotate-left"></i> Reset Cover</button>
                        </div>
                    </div>
                        </div>
                    </div>

                    <div class="uf-panel-section" data-uf-section="lipsync">
                        <button type="button" class="uf-panel-section-toggle" data-uf-section-toggle="lipsync" aria-expanded="false">
                            <span><i class="fas fa-closed-captioning"></i> Text Lip Sync</span>
                            <i class="fas fa-chevron-down"></i>
                        </button>
                        <div class="uf-panel-section-body">
                    <div class="face-rig-motion-library" style="margin-top:0;">
                        <div class="face-rig-motion-head">
                            <strong><i class="fas fa-closed-captioning"></i> Text Lip Sync</strong>
                            <span>Type dialogue to generate viseme-based face-set motion from text.</span>
                        </div>
                        <div class="face-rig-simple-controls">
                            <label style="grid-column: 1 / -1;">
                                Dialogue
                                <textarea id="uf-lipsync-text" rows="3" placeholder="Type dialogue here. Example: We can ship this today."></textarea>
                            </label>
                        </div>
                        <div class="face-rig-simple-controls" style="margin-top:6px;">
                            <label>
                                Speaking Style
                                <select id="uf-lipsync-pack">
                                    <option value="natural">Natural</option>
                                    <option value="clear">Clear Speech</option>
                                    <option value="cartoon">Cartoon</option>
                                    <option value="dramatic">Dramatic</option>
                                </select>
                            </label>
                            <label>
                                Talk Speed
                                <select id="uf-lipsync-talk-speed">
                                    <option value="slow">Slow</option>
                                    <option value="normal" selected>Normal</option>
                                    <option value="fast">Fast</option>
                                    <option value="veryFast">Very fast</option>
                                </select>
                            </label>
                            <label class="face-rig-inline-toggle" title="Use the dialogue text and talk speed to set the timeline duration automatically">
                                Auto Duration
                                <input id="uf-lipsync-auto-duration" type="checkbox" checked>
                            </label>
                            <label>
                                Mouth Timing (ms/char)
                                <input id="uf-lipsync-speed" type="number" min="70" max="320" step="5" value="130">
                            </label>
                            <label>
                                Intensity
                                <input id="uf-lipsync-intensity" type="range" min="60" max="180" step="5" value="100">
                                <span id="uf-lipsync-intensity-value">100%</span>
                            </label>
                            <label>
                                Pause
                                <input id="uf-lipsync-pause" type="range" min="70" max="150" step="5" value="100">
                                <span id="uf-lipsync-pause-value">100%</span>
                            </label>
                        </div>
                        <div class="face-rig-motion-actions">
                            <button id="btn-face-rig-preview-lipsync"><i class="fas fa-eye"></i> Preview Text</button>
                            <button id="btn-face-rig-apply-lipsync"><i class="fas fa-check"></i> Apply To Selected</button>
                            <button id="btn-face-rig-apply-lipsync-playhead"><i class="fas fa-play"></i> Apply At Playhead</button>
                            <button id="btn-face-rig-apply-lipsync-all"><i class="fas fa-layer-group"></i> Apply To All</button>
                        </div>
                        <div class="uf-part-focus-actions" aria-label="Lip sync compression shortcuts">
                            <button type="button" id="btn-uf-lipsync-mouth-pair"><i class="fas fa-link"></i> Pair Mouth Close</button>
                            <button type="button" id="btn-uf-lipsync-mouth-open"><i class="fas fa-comment-dots"></i> Mouth Open 60%</button>
                            <button type="button" id="btn-uf-lipsync-blink"><i class="fas fa-eye"></i> Blink 100%</button>
                        </div>
                        <div class="face-rig-motion-actions">
                            <button id="btn-face-rig-merge-lipsync"><i class="fas fa-compress-alt"></i> Merge Animation</button>
                            <button id="btn-face-rig-unmerge-lipsync"><i class="fas fa-expand-alt"></i> Unmerge Animation</button>
                            <button id="btn-face-rig-validate-lipsync-timing"><i class="fas fa-stopwatch"></i> Validate Timing</button>
                        </div>
                        <div class="face-rig-motion-description" style="margin-top:6px;">
                            <div id="uf-lipsync-preview-track" style="display:flex; gap:2px; align-items:flex-end; min-height:24px; padding:4px; border:1px solid rgba(148,163,184,0.35); border-radius:6px; background:rgba(15,23,42,0.18);"></div>
                            <div id="uf-lipsync-preview-summary" style="margin-top:4px; font-size:12px; opacity:0.9;">Type dialogue to preview visemes.</div>
                            <div id="uf-lipsync-duration-summary" style="margin-top:4px; font-size:12px; opacity:0.9;">Auto duration will be calculated from dialogue.</div>
                        </div>
                    </div>
                        </div>
                    </div>

                    <div id="face-rig-simple-status" class="face-rig-simple-status">Select a face set and place it on selected object or stage.</div>
                </div>
            `;

            const launchBtn = document.getElementById('btn-face-rig');
            if (launchBtn) {
                launchBtn.title = 'Create or attach universal face on any object/group';
                launchBtn.innerHTML = '<i class="fas fa-face-smile"></i> Universal Face';
            }

            this._initUniversalMotionSelectors(panel);
            this._syncStyleInputsFromSet(this.selectedSetKey || setKeys[0]);
            this._syncPlacementUI();
            this._updateTextLipSyncPreview();
            this.updateAttachContextUI();
        },

        bindUI() {
            document.getElementById('btn-face-rig')?.addEventListener('click', () => this.startForSelection());

            this.panel?.addEventListener('click', (event) => {
                const sectionToggle = event.target.closest?.('[data-uf-section-toggle]');
                if (sectionToggle) {
                    const sectionName = sectionToggle.dataset.ufSectionToggle;
                    const section = this.panel?.querySelector(`[data-uf-section="${sectionName}"]`);
                    if (!section) return;
                    section.classList.toggle('is-open');
                    this._syncUniversalFaceSections();
                    return;
                }
                const card = event.target.closest?.('[data-face-set]');
                if (card) {
                    this._clearLiveContextSync();
                    this.selectSet(card.dataset.faceSet);
                    return;
                }
                const quickExpression = event.target.closest?.('[data-uf-expression]');
                if (quickExpression) {
                    this._clearLiveContextSync();
                    this._setPanelMotionKey(quickExpression.dataset.ufExpression || 'neutral');
                    this._ufMotionIntensity = quickExpression.dataset.ufIntensity || this._ufMotionIntensity || 'normal';
                    this._syncMotionIntensityInput();
                    this._syncExpressionPreview();
                    return;
                }
                const idlePresetBtn = event.target.closest?.('[data-uf-idle]');
                if (idlePresetBtn) {
                    this._applyIdlePresetToPanel(idlePresetBtn.dataset.ufIdle || 'blinkLoop');
                    return;
                }
                const motionChip = event.target.closest?.('[data-uf-motion-chip]');
                if (motionChip) {
                    this._clearLiveContextSync();
                    this._setPanelMotionKey(motionChip.dataset.ufMotionChip || 'neutral');
                    return;
                }
                const partFocus = event.target.closest?.('[data-uf-part-focus]');
                if (partFocus) {
                    this._selectFacePartFocus(partFocus.dataset.ufPartFocus || 'whole');
                    return;
                }
                if (event.target.closest?.('#btn-face-rig-place')) {
                    this.insertSelectedSet({ placement: this._ufSelectedPlacement || 'selected' });
                    return;
                }
                if (event.target.closest?.('#btn-face-rig-edit-selected')) {
                    this.editSelectedFaceTarget();
                    return;
                }
                if (event.target.closest?.('#btn-face-rig-apply-style-selected')) {
                    this.applyStyleToSelectedFaceTarget();
                    return;
                }
                if (event.target.closest?.('#btn-uf-save-style')) {
                    this._saveCurrentStylePreset();
                    return;
                }
                if (event.target.closest?.('#btn-uf-delete-style')) {
                    this._deleteSelectedStylePreset();
                    return;
                }
                if (event.target.closest?.('#btn-uf-save-template')) {
                    this._saveSelectedFaceTemplate();
                    return;
                }
                if (event.target.closest?.('#btn-uf-delete-template')) {
                    this._deleteSelectedFaceTemplate();
                    return;
                }
                if (event.target.closest?.('#btn-uf-convert-front')) {
                    this._convertSelectedFaceView('front');
                    return;
                }
                if (event.target.closest?.('#btn-uf-convert-side')) {
                    this._convertSelectedFaceView('side');
                    return;
                }
                if (event.target.closest?.('#btn-uf-reset-layout')) {
                    this._resetSelectedFaceLayout();
                    return;
                }
                if (event.target.closest?.('#btn-uf-remove-face')) {
                    this._removeSelectedFaceTargets();
                    return;
                }
                if (event.target.closest?.('#btn-uf-compress-mouth-pair') || event.target.closest?.('#btn-uf-lipsync-mouth-pair')) {
                    this._applyCompressionShortcutFromSelectedFace('mouthPair');
                    return;
                }
                if (event.target.closest?.('#btn-uf-compress-mouth-open') || event.target.closest?.('#btn-uf-lipsync-mouth-open')) {
                    this._applyCompressionShortcutFromSelectedFace('mouthOpen');
                    return;
                }
                if (event.target.closest?.('#btn-uf-compress-blink') || event.target.closest?.('#btn-uf-lipsync-blink')) {
                    this._applyCompressionShortcutFromSelectedFace('blink');
                    return;
                }
                if (event.target.closest?.('#btn-uf-compress-reset')) {
                    this._applyCompressionShortcutFromSelectedFace('reset');
                    return;
                }
                if (event.target.closest?.('#btn-uf-select-smartcut-parts')) {
                    this._selectSmartCutAnimatedPartsOnly();
                    return;
                }
                if (event.target.closest?.('#btn-uf-edit-smartcut-covers')) {
                    this._selectSmartCutCoverLayersForEditing();
                    return;
                }
                if (event.target.closest?.('#btn-uf-toggle-smartcut-covers')) {
                    this._toggleSelectedSmartCutCompanionVisibility('covers');
                    return;
                }
                if (event.target.closest?.('#btn-uf-toggle-smartcut-base')) {
                    this._toggleSelectedSmartCutCompanionVisibility('base');
                    return;
                }
                if (event.target.closest?.('#btn-uf-apply-smartcut-cover-style')) {
                    this._applySmartCutCoverStyleFromPanel();
                    return;
                }
                if (event.target.closest?.('#btn-uf-smartcut-iris-sclera-cover')) {
                    this._applyScleraColorToSelectedSmartCutIrisCovers();
                    return;
                }
                if (event.target.closest?.('#btn-uf-upload-smartcut-cover-picture')) {
                    this.panel?.querySelector('#uf-smartcut-cover-picture-input')?.click();
                    return;
                }
                if (event.target.closest?.('#btn-uf-select-target-covers')) {
                    this._selectSmartCutCoversByPanelTarget();
                    return;
                }
                if (event.target.closest?.('#btn-uf-shrink-smartcut-cover')) {
                    this._refineSmartCutCoversFromPanel('shrink');
                    return;
                }
                if (event.target.closest?.('#btn-uf-grow-smartcut-cover')) {
                    this._refineSmartCutCoversFromPanel('grow');
                    return;
                }
                if (event.target.closest?.('#btn-uf-soften-smartcut-cover')) {
                    this._refineSmartCutCoversFromPanel('soften');
                    return;
                }
                if (event.target.closest?.('#btn-uf-erase-smartcut-cover')) {
                    this._startSmartCutCoverEraserFromPanel();
                    return;
                }
                if (event.target.closest?.('#btn-uf-restore-smartcut-cover-brush')) {
                    this._startSmartCutCoverRestoreBrushFromPanel();
                    return;
                }
                if (event.target.closest?.('#btn-uf-reset-smartcut-cover')) {
                    this._resetSmartCutCoversFromPanel();
                    return;
                }
                if (event.target.closest?.('#btn-face-rig-preview-motion')) {
                    this._setUniversalFaceSection('motion', true);
                    this._refreshTimelineWindowFromInputs();
                    this.previewFaceMotion(this._panelMotionKey || 'neutral', {
                        scope: 'selected',
                        rangeSec: this._panelDurationSec || 2,
                        intensity: this._readMotionIntensity()
                    });
                    return;
                }
                if (event.target.closest?.('#btn-face-rig-apply-motion')) {
                    this._refreshTimelineWindowFromInputs();
                    const repeat = this._readMotionRepeatConfig();
                    const afterPlayback = this._readMotionAfterPlaybackConfig();
                    this.applyFaceMotion(this._panelMotionKey || 'neutral', {
                        scope: 'selected',
                        rangeSec: this._panelDurationSec || 2,
                        startSec: this._panelStartSec || 0,
                        endSec: this._panelEndSec || ((this._panelStartSec || 0) + (this._panelDurationSec || 2)),
                        repeat: repeat.repeat,
                        repeatMode: repeat.repeatMode,
                        repeatPauseSec: repeat.repeatPauseSec,
                        afterPlayback,
                        intensity: this._readMotionIntensity()
                    });
                    return;
                }
                if (event.target.closest?.('#btn-face-rig-clear-motion')) {
                    this.applyFaceMotion('neutral', { scope: 'selected' });
                    this.setStatus('Reset selected face animation.');
                    return;
                }
                if (event.target.closest?.('#btn-face-rig-apply-playhead')) {
                    this._refreshTimelineWindowFromInputs();
                    const playheadSec = Math.max(0, Number(window.app?.timeline?.getPlayheadTime?.() ?? this.animations?.currentTime ?? 0));
                    const rangeSec = Math.max(0.1, Number(this._panelDurationSec) || 2);
                    const repeat = this._readMotionRepeatConfig();
                    const afterPlayback = this._readMotionAfterPlaybackConfig();
                    this._panelStartSec = playheadSec;
                    this._panelEndSec = playheadSec + rangeSec;
                    this._syncTimelineWindowInputs();
                    this.applyFaceMotion(this._panelMotionKey || 'neutral', {
                        scope: 'selected',
                        rangeSec,
                        startSec: playheadSec,
                        endSec: playheadSec + rangeSec,
                        repeat: repeat.repeat,
                        repeatMode: repeat.repeatMode,
                        repeatPauseSec: repeat.repeatPauseSec,
                        afterPlayback,
                        intensity: this._readMotionIntensity()
                    });
                    return;
                }
                if (event.target.closest?.('#btn-face-rig-apply-motion-all')) {
                    this._refreshTimelineWindowFromInputs();
                    const repeat = this._readMotionRepeatConfig();
                    const afterPlayback = this._readMotionAfterPlaybackConfig();
                    this.applyFaceMotion(this._panelMotionKey || 'neutral', {
                        scope: 'all',
                        rangeSec: this._panelDurationSec || 2,
                        startSec: this._panelStartSec || 0,
                        endSec: this._panelEndSec || ((this._panelStartSec || 0) + (this._panelDurationSec || 2)),
                        repeat: repeat.repeat,
                        repeatMode: repeat.repeatMode,
                        repeatPauseSec: repeat.repeatPauseSec,
                        afterPlayback,
                        intensity: this._readMotionIntensity()
                    });
                    return;
                }
                if (event.target.closest?.('#btn-face-rig-merge-motion') || event.target.closest?.('#btn-face-rig-merge-lipsync')) {
                    if (typeof this.setFaceSetTimelineMerge === 'function') {
                        this.setFaceSetTimelineMerge(true, { scope: 'selected' });
                        this.setStatus('Merged selected face set animations into one timeline row.');
                    } else {
                        Utils.showToast('Merge Animation is not available. Refresh and try again.', 'warning');
                    }
                    return;
                }
                if (event.target.closest?.('#btn-face-rig-unmerge-motion') || event.target.closest?.('#btn-face-rig-unmerge-lipsync')) {
                    if (typeof this.setFaceSetTimelineMerge === 'function') {
                        this.setFaceSetTimelineMerge(false, { scope: 'selected' });
                        this.setStatus('Unmerged selected face set timeline animations for editing.');
                    } else {
                        Utils.showToast('Unmerge Animation is not available. Refresh and try again.', 'warning');
                    }
                    return;
                }
                if (event.target.closest?.('#btn-face-rig-validate-timing') || event.target.closest?.('#btn-face-rig-validate-lipsync-timing')) {
                    this.repairUniversalFaceTiming({ scope: 'all', showToast: true });
                    return;
                }
                if (event.target.closest?.('#btn-face-rig-preview-lipsync')) {
                    this._setUniversalFaceSection('lipsync', true);
                    this._refreshTimelineWindowFromInputs();
                    this.previewTextLipSync({
                        scope: 'selected',
                        rangeSec: this._panelDurationSec || 2,
                        startSec: this._panelStartSec || 0,
                        endSec: this._panelEndSec || ((this._panelStartSec || 0) + (this._panelDurationSec || 2))
                    });
                    return;
                }
                if (event.target.closest?.('#btn-face-rig-apply-lipsync')) {
                    this._refreshTimelineWindowFromInputs();
                    this.applyTextLipSync({
                        scope: 'selected',
                        rangeSec: this._panelDurationSec || 2,
                        startSec: this._panelStartSec || 0,
                        endSec: this._panelEndSec || ((this._panelStartSec || 0) + (this._panelDurationSec || 2))
                    });
                    return;
                }
                if (event.target.closest?.('#btn-face-rig-apply-lipsync-playhead')) {
                    this._refreshTimelineWindowFromInputs();
                    const playheadSec = Math.max(0, Number(window.app?.timeline?.getPlayheadTime?.() ?? this.animations?.currentTime ?? 0));
                    const rangeSec = Math.max(0.1, Number(this._panelDurationSec) || 2);
                    this._panelStartSec = playheadSec;
                    this._panelEndSec = playheadSec + rangeSec;
                    this._syncTimelineWindowInputs();
                    this.applyTextLipSync({
                        scope: 'selected',
                        rangeSec,
                        startSec: playheadSec,
                        endSec: playheadSec + rangeSec
                    });
                    return;
                }
                if (event.target.closest?.('#btn-face-rig-apply-lipsync-all')) {
                    this._refreshTimelineWindowFromInputs();
                    this.applyTextLipSync({
                        scope: 'all',
                        rangeSec: this._panelDurationSec || 2,
                        startSec: this._panelStartSec || 0,
                        endSec: this._panelEndSec || ((this._panelStartSec || 0) + (this._panelDurationSec || 2))
                    });
                    return;
                }
                if (event.target.closest?.('#btn-face-rig-unlink')) {
                    this.unlinkFaceFromSelection();
                    return;
                }
                if (event.target.closest?.('#btn-face-rig-ungroup')) {
                    this.ungroupFaceFromSelection();
                    return;
                }
                if (event.target.closest?.('#btn-face-rig-cut-label-start')) {
                    this.startManualFaceBuilder();
                    return;
                }
                if (event.target.closest?.('#btn-face-rig-cut-label-cancel')) {
                    this.endManualFaceBuilder();
                    return;
                }
                if (event.target.closest?.('#btn-face-rig-cut-label-assign')) {
                    this.assignManualFaceRole();
                    return;
                }
                if (event.target.closest?.('#btn-face-rig-cut-label-clear')) {
                    this.clearManualFaceRole();
                    return;
                }
                if (event.target.closest?.('#btn-face-rig-cut-label-assemble')) {
                    this.assembleManualFaceParts();
                    return;
                }
                if (event.target.closest?.('#btn-face-rig-done')) {
                    this.stop();
                }
            });

            this.panel?.querySelector('#face-rig-set-select')?.addEventListener('change', (event) => {
                this._clearLiveContextSync();
                this.selectSet(event.target.value);
            });
            this.panel?.querySelector('#uf-view-select')?.addEventListener('change', (event) => {
                this._ufViewMode = event.target.value || 'front';
                this.updateAttachContextUI();
            });
            this.panel?.querySelector('#face-rig-set-size')?.addEventListener('input', (event) => {
                const value = Number(event.target.value) || 110;
                const label = this.panel?.querySelector('#face-rig-set-size-value');
                if (label) label.textContent = `${value}%`;
            });
            this.panel?.querySelector('#uf-placement-select')?.addEventListener('change', (event) => {
                this._ufSelectedPlacement = event.target.value || 'selected';
                this._syncPlacementUI();
                this.updateAttachContextUI();
            });
            this.panel?.querySelector('#uf-placement-action')?.addEventListener('change', (event) => {
                this._ufPlacementAction = event.target.value || 'group';
            });
            this.panel?.querySelector('#uf-replace-mode')?.addEventListener('change', (event) => {
                this._ufReplaceExisting = (event.target.value || 'append') === 'replace';
            });
            this.panel?.querySelector('#uf-smartcut-cover-picture-input')?.addEventListener('change', (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                    this._ufSmartCutCoverPictureSrc = reader.result;
                    const mode = this.panel?.querySelector('#uf-smartcut-cover-mode');
                    if (mode) mode.value = 'picture';
                    this._applySmartCutCoverStyleFromPanel();
                };
                reader.readAsDataURL(file);
                event.target.value = '';
            });
            this.panel?.querySelector('#uf-smartcut-cover-edge-px')?.addEventListener('input', (event) => {
                const label = this.panel?.querySelector('#uf-smartcut-cover-edge-px-value');
                if (label) label.textContent = `${parseInt(event.target.value, 10) || 3}px`;
            });
            this.panel?.querySelector('#uf-smartcut-cover-softness-px')?.addEventListener('input', (event) => {
                const label = this.panel?.querySelector('#uf-smartcut-cover-softness-px-value');
                if (label) label.textContent = `${parseInt(event.target.value, 10) || 0}px`;
            });

            ['iris', 'brow', 'lip', 'sclera', 'sclera-2', 'lid', 'lid-2'].forEach(key => {
                this.panel?.querySelector(`#uf-color-${key}`)?.addEventListener('input', () => {
                    this._ufStyle = this._readStyleOverrides();
                    this._ufStylePreset = 'custom';
                    const preset = this.panel?.querySelector('#uf-style-preset');
                    if (preset) preset.value = 'custom';
                });
            });
            this.panel?.querySelector('#uf-sclera-gradient')?.addEventListener('change', () => {
                this._ufStyle = this._readStyleOverrides();
                this._ufStylePreset = 'custom';
                const preset = this.panel?.querySelector('#uf-style-preset');
                if (preset) preset.value = 'custom';
            });
            this.panel?.querySelector('#uf-lid-gradient')?.addEventListener('change', () => {
                this._ufStyle = this._readStyleOverrides();
                this._ufStylePreset = 'custom';
                const preset = this.panel?.querySelector('#uf-style-preset');
                if (preset) preset.value = 'custom';
            });
            this.panel?.querySelector('#uf-style-preset')?.addEventListener('change', (event) => {
                this._applyStylePreset(event.target.value || 'custom');
            });
            this.panel?.querySelector('#uf-template-preset')?.addEventListener('change', (event) => {
                this._applyTemplatePreset(event.target.value || 'none');
            });
            this.panel?.querySelector('#uf-edit-mode')?.addEventListener('change', (event) => {
                this._setFacePartEditMode(event.target.value || 'whole');
            });

            this.panel?.querySelector('#uf-motion-category')?.addEventListener('change', () => {
                this._clearLiveContextSync();
                this._populateMotionList();
            });
            this.panel?.querySelector('#uf-motion-select')?.addEventListener('change', (event) => {
                this._clearLiveContextSync();
                this._panelMotionKey = event.target.value || 'neutral';
                this._updateMotionDescription(this._panelMotionKey);
                this._syncExpressionPreview();
            });
            this.panel?.querySelector('#uf-motion-intensity')?.addEventListener('change', (event) => {
                this._ufMotionIntensity = SIMPLE_INTENSITIES[event.target.value] ? event.target.value : 'normal';
                this._syncExpressionPreview();
            });
            this.panel?.querySelector('#uf-motion-duration')?.addEventListener('change', (event) => {
                this._panelDurationSec = Math.max(0.1, Number(event.target.value) || 2);
                this._panelEndSec = Math.max(this._panelStartSec + 0.1, this._panelStartSec + this._panelDurationSec);
                this._syncTimelineWindowInputs();
                this._updateMotionTotalHint();
            });
            this.panel?.querySelector('#uf-motion-start')?.addEventListener('input', (event) => {
                this._panelStartSec = Math.max(0, Number(event.target.value) || 0);
                if (!Number.isFinite(this._panelEndSec) || this._panelEndSec <= this._panelStartSec) {
                    this._panelEndSec = this._panelStartSec + Math.max(0.1, this._panelDurationSec || 2);
                }
                this._panelDurationSec = Math.max(0.1, this._panelEndSec - this._panelStartSec);
                this._syncTimelineWindowInputs();
                this._updateMotionTotalHint();
            });
            this.panel?.querySelector('#uf-motion-end')?.addEventListener('input', (event) => {
                const nextEnd = Math.max(0.1, Number(event.target.value) || (this._panelStartSec + this._panelDurationSec));
                this._panelEndSec = Math.max(this._panelStartSec + 0.1, nextEnd);
                this._panelDurationSec = Math.max(0.1, this._panelEndSec - this._panelStartSec);
                this._syncTimelineWindowInputs();
                this._updateMotionTotalHint();
            });
            this.panel?.querySelector('#uf-motion-repeat')?.addEventListener('change', (event) => {
                const value = String(event.target.value || '1');
                this._panelRepeat = ['1', '2', '3', '5', '10', '-1'].includes(value) ? value : '1';
                this._syncMotionRepeatInputs();
            });
            this.panel?.querySelector('#uf-motion-repeat-mode')?.addEventListener('change', (event) => {
                const value = String(event.target.value || 'restart');
                this._panelRepeatMode = value === 'cycle' ? 'cycle' : 'restart';
                this._syncMotionRepeatInputs();
            });
            this.panel?.querySelector('#uf-motion-repeat-pause')?.addEventListener('input', (event) => {
                this._panelRepeatPauseSec = Math.max(0, Number(event.target.value) || 0);
                this._syncMotionRepeatInputs();
            });
            this.panel?.querySelector('#uf-motion-after')?.addEventListener('change', (event) => {
                this._panelAfterPlayback = String(event.target.value || 'keep') === 'return' ? 'return' : 'keep';
                this._syncMotionAfterPlaybackInputs();
            });

            this.panel?.querySelector('#uf-lipsync-intensity')?.addEventListener('input', (event) => {
                const value = Math.max(60, Math.min(180, Number(event.target.value) || 100));
                const label = this.panel?.querySelector('#uf-lipsync-intensity-value');
                if (label) label.textContent = `${Math.round(value)}%`;
                this._updateTextLipSyncPreview();
            });
            this.panel?.querySelector('#uf-lipsync-pause')?.addEventListener('input', (event) => {
                const value = Math.max(70, Math.min(150, Number(event.target.value) || 100));
                const label = this.panel?.querySelector('#uf-lipsync-pause-value');
                if (label) label.textContent = `${Math.round(value)}%`;
                this._updateTextLipSyncPreview();
            });
            this.panel?.querySelector('#uf-lipsync-text')?.addEventListener('input', () => {
                this._updateTextLipSyncPreview();
            });
            this.panel?.querySelector('#uf-lipsync-pack')?.addEventListener('change', () => {
                this._updateTextLipSyncPreview();
            });
            this.panel?.querySelector('#uf-lipsync-talk-speed')?.addEventListener('change', () => {
                this._updateTextLipSyncPreview();
            });
            this.panel?.querySelector('#uf-lipsync-auto-duration')?.addEventListener('change', () => {
                this._updateTextLipSyncPreview();
            });
            this.panel?.querySelector('#uf-lipsync-speed')?.addEventListener('input', () => {
                this._updateTextLipSyncPreview();
            });

            this._syncUniversalFaceSections();
        },

        _syncUniversalFaceSections() {
            if (!this.panel) return;
            this.panel.querySelectorAll('[data-uf-section]').forEach(section => {
                const toggle = section.querySelector('[data-uf-section-toggle]');
                if (toggle) toggle.setAttribute('aria-expanded', section.classList.contains('is-open') ? 'true' : 'false');
            });
        },

        _setUniversalFaceSection(sectionName, open = true) {
            if (!this.panel || !sectionName) return;
            const section = this.panel.querySelector(`[data-uf-section="${sectionName}"]`);
            if (!section) return;
            section.classList.toggle('is-open', !!open);
            this._syncUniversalFaceSections();
        },

        _focusUniversalFaceSection(sectionName) {
            if (!this.panel || !sectionName) return;
            this.panel.querySelectorAll('[data-uf-section]').forEach(section => {
                section.classList.toggle('is-open', section.dataset.ufSection === sectionName);
            });
            this._syncUniversalFaceSections();
        },

        startForSelection() {
            this.active = true;
            this.showPanel(true);
            this._syncPlacementUI();
            this._focusUniversalFaceSection('build');
            this.updateAttachContextUI();
            this.setStatus('Universal Face ready. Choose a type, set placement options, then place and animate.');
            this.updatePropertiesPanelVisibility();
        },

        installPropertiesPanel() {
            this.propertiesPanel = null;
        },

        _syncPlacementUI() {
            const placement = this.panel?.querySelector('#uf-placement-select');
            const actionWrap = this.panel?.querySelector('#uf-placement-action-wrap');
            const action = this.panel?.querySelector('#uf-placement-action');
            const replaceWrap = this.panel?.querySelector('#uf-replace-wrap');
            const replaceMode = this.panel?.querySelector('#uf-replace-mode');
            const placeBtn = this.panel?.querySelector('#btn-face-rig-place');
            if (placement) placement.value = this._ufSelectedPlacement || 'selected';
            if (action) action.value = this._ufPlacementAction || 'group';
            if (replaceMode) replaceMode.value = this._ufReplaceExisting ? 'replace' : 'append';
            if (placeBtn) {
                const placingOnSelected = (this._ufSelectedPlacement || 'selected') === 'selected';
                placeBtn.innerHTML = placingOnSelected
                    ? '<i class="fas fa-object-group"></i> Place On Selected Object'
                    : '<i class="fas fa-layer-group"></i> Place On Stage';
            }
            if (actionWrap) {
                actionWrap.style.display = (this._ufSelectedPlacement || 'selected') === 'selected' ? '' : 'none';
            }
            if (replaceWrap) {
                replaceWrap.style.display = (this._ufSelectedPlacement || 'selected') === 'selected' ? '' : 'none';
            }
        },

        _refreshTimelineWindowFromInputs() {
            const startInput = this.panel?.querySelector('#uf-motion-start');
            const endInput = this.panel?.querySelector('#uf-motion-end');
            const durationSelect = this.panel?.querySelector('#uf-motion-duration');

            const rawStart = Number(startInput?.value);
            const rawEnd = Number(endInput?.value);
            const rawDuration = Number(durationSelect?.value);

            this._panelStartSec = Math.max(0, Number.isFinite(rawStart) ? rawStart : (Number(this._panelStartSec) || 0));

            if (Number.isFinite(rawDuration) && rawDuration > 0) {
                this._panelDurationSec = Math.max(0.1, rawDuration);
                this._panelEndSec = this._panelStartSec + this._panelDurationSec;
            } else if (Number.isFinite(rawEnd) && rawEnd > this._panelStartSec) {
                this._panelEndSec = rawEnd;
                this._panelDurationSec = Math.max(0.1, this._panelEndSec - this._panelStartSec);
            } else {
                this._panelDurationSec = Math.max(0.1, Number(this._panelDurationSec) || 2);
                this._panelEndSec = Math.max(this._panelStartSec + 0.1, Number(this._panelEndSec) || (this._panelStartSec + this._panelDurationSec));
                this._panelDurationSec = Math.max(0.1, this._panelEndSec - this._panelStartSec);
            }

            this._syncTimelineWindowInputs();
            this._updateMotionTotalHint();
        },

        _syncMotionRepeatInputs() {
            const repeatSelect = this.panel?.querySelector('#uf-motion-repeat');
            const repeatModeSelect = this.panel?.querySelector('#uf-motion-repeat-mode');
            const repeatPauseInput = this.panel?.querySelector('#uf-motion-repeat-pause');

            const repeat = ['1', '2', '3', '5', '10', '-1'].includes(String(this._panelRepeat)) ? String(this._panelRepeat) : '1';
            const repeatMode = this._panelRepeatMode === 'cycle' ? 'cycle' : 'restart';
            const repeatPauseSec = Math.max(0, Number(this._panelRepeatPauseSec) || 0);

            this._panelRepeat = repeat;
            this._panelRepeatMode = repeatMode;
            this._panelRepeatPauseSec = repeatPauseSec;

            if (repeatSelect) repeatSelect.value = repeat;
            if (repeatModeSelect) repeatModeSelect.value = repeatMode;
            if (repeatPauseInput) repeatPauseInput.value = repeatPauseSec.toFixed(1);
            this._updateMotionTotalHint();
        },

        _readMotionRepeatConfig() {
            const repeatSelect = this.panel?.querySelector('#uf-motion-repeat');
            const repeatModeSelect = this.panel?.querySelector('#uf-motion-repeat-mode');
            const repeatPauseInput = this.panel?.querySelector('#uf-motion-repeat-pause');

            const repeatRaw = String(repeatSelect?.value || this._panelRepeat || '1');
            const repeat = ['1', '2', '3', '5', '10', '-1'].includes(repeatRaw) ? repeatRaw : '1';
            const repeatMode = (String(repeatModeSelect?.value || this._panelRepeatMode || 'restart') === 'cycle') ? 'cycle' : 'restart';
            const repeatPauseSec = Math.max(0, Number(repeatPauseInput?.value ?? this._panelRepeatPauseSec ?? 0) || 0);

            this._panelRepeat = repeat;
            this._panelRepeatMode = repeatMode;
            this._panelRepeatPauseSec = repeatPauseSec;
            this._syncMotionRepeatInputs();
            return { repeat, repeatMode, repeatPauseSec };
        },

        _syncMotionAfterPlaybackInputs() {
            const afterSelect = this.panel?.querySelector('#uf-motion-after');
            const afterPlayback = this._panelAfterPlayback === 'return' ? 'return' : 'keep';
            this._panelAfterPlayback = afterPlayback;
            if (afterSelect) afterSelect.value = afterPlayback;
        },

        _readMotionAfterPlaybackConfig() {
            const afterSelect = this.panel?.querySelector('#uf-motion-after');
            const afterPlayback = String(afterSelect?.value || this._panelAfterPlayback || 'keep') === 'return' ? 'return' : 'keep';
            this._panelAfterPlayback = afterPlayback;
            this._syncMotionAfterPlaybackInputs();
            return afterPlayback;
        },

        _updateMotionTotalHint() {
            const totalHint = this.panel?.querySelector('#face-rig-motion-total');
            if (!totalHint) return;

            const durationSec = Math.max(0.1, Number(this._panelDurationSec) || 0.1);
            const repeatRaw = String(this._panelRepeat || '1');
            const repeatPauseSec = Math.max(0, Number(this._panelRepeatPauseSec) || 0);

            if (repeatRaw === '-1') {
                const cycleSec = durationSec + repeatPauseSec;
                totalHint.textContent = `Effective timing: loop mode • ${durationSec.toFixed(1)}s active + ${repeatPauseSec.toFixed(1)}s pause per cycle (${cycleSec.toFixed(1)}s cycle).`;
                return;
            }

            const repeatCount = Math.max(1, parseInt(repeatRaw, 10) || 1);
            const totalSec = (durationSec * repeatCount) + (repeatPauseSec * repeatCount);
            totalHint.textContent = `Effective timing: ${repeatCount}x • ${durationSec.toFixed(1)}s active + ${repeatPauseSec.toFixed(1)}s pause each = ${totalSec.toFixed(1)}s total.`;
        },

        _initUniversalMotionSelectors(panel) {
            const motions = getAvailableMotions();
            const categories = ['All', ...new Set(Object.values(motions).map(item => item.category || 'Core'))];
            const categorySelect = panel?.querySelector('#uf-motion-category');
            if (categorySelect) {
                categorySelect.innerHTML = categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
            }
            this._populateMotionList();
            const duration = panel?.querySelector('#uf-motion-duration');
            if (duration) duration.value = String(this._panelDurationSec || 2);
            this._syncTimelineWindowInputs();
            this._syncMotionRepeatInputs();
            this._syncMotionAfterPlaybackInputs();
            this._syncMotionIntensityInput();
            this._syncExpressionPreview();
            this._renderMotionChips();
        },

        _populateMotionList() {
            const motions = getAvailableMotions();
            const category = this.panel?.querySelector('#uf-motion-category')?.value || 'All';
            const keys = Object.keys(motions).filter(key => category === 'All' || (motions[key]?.category || 'Core') === category);
            const motionSelect = this.panel?.querySelector('#uf-motion-select');
            if (!motionSelect) return;

            if (category === 'All') {
                const grouped = {};
                MOTION_CATEGORY_ORDER.forEach(cat => { grouped[cat] = []; });
                keys.forEach(key => {
                    const cat = motions[key]?.category || 'Core';
                    if (!grouped[cat]) grouped[cat] = [];
                    grouped[cat].push(key);
                });
                const unknownCats = Object.keys(grouped).filter(cat => !MOTION_CATEGORY_ORDER.includes(cat));
                const renderOrder = [...MOTION_CATEGORY_ORDER, ...unknownCats];
                motionSelect.innerHTML = renderOrder
                    .filter(cat => grouped[cat]?.length)
                    .map(cat => {
                        const options = grouped[cat]
                            .map(key => `<option value="${key}">${motions[key]?.name || key}</option>`)
                            .join('');
                        return `<optgroup label="${cat}">${options}</optgroup>`;
                    })
                    .join('');
            } else {
                motionSelect.innerHTML = keys.map(key => `<option value="${key}">${motions[key]?.name || key}</option>`).join('');
            }

            if (!keys.length) {
                this._panelMotionKey = 'neutral';
                return;
            }
            if (!keys.includes(this._panelMotionKey)) {
                this._panelMotionKey = keys[0];
            }
            motionSelect.value = this._panelMotionKey;
            this._updateMotionDescription(this._panelMotionKey);
            this._renderMotionChips();
        },

        _updateMotionDescription(key) {
            const motion = getAvailableMotions()[key];
            const desc = this.panel?.querySelector('#face-rig-motion-description');
            if (desc) desc.textContent = motion?.description || '';
            this._syncExpressionPreview();
        },

        _renderMotionChips() {
            const grid = this.panel?.querySelector('#uf-motion-chip-grid');
            if (!grid) return;
            const motions = getAvailableMotions();
            const keys = Object.keys(motions).filter(key => key !== 'neutral');
            grid.innerHTML = keys.map(key => {
                const motion = motions[key] || {};
                const active = key === this._panelMotionKey ? ' active' : '';
                const canonical = this._resolveCanonicalExpressionForMotion?.(key) || key;
                const label = motion.name || key;
                return `
                    <button type="button" class="uf-motion-chip${active}" data-uf-motion-chip="${key}" data-expression="${canonical}" title="${motion.description || label}">
                        <span class="uf-motion-chip-face"></span>
                        <span>${label}</span>
                    </button>
                `;
            }).join('');
        },

        _setPanelMotionKey(key) {
            const motions = getAvailableMotions();
            const nextKey = motions[key] ? key : 'neutral';
            this._panelMotionKey = nextKey;
            this._syncMotionSelectorFromKey(nextKey);
            this._syncExpressionPreview();
        },

        _readMotionIntensity() {
            const input = this.panel?.querySelector('#uf-motion-intensity');
            const value = input?.value || this._ufMotionIntensity || 'normal';
            this._ufMotionIntensity = SIMPLE_INTENSITIES[value] ? value : 'normal';
            return this._ufMotionIntensity;
        },

        _syncMotionIntensityInput() {
            const input = this.panel?.querySelector('#uf-motion-intensity');
            const value = SIMPLE_INTENSITIES[this._ufMotionIntensity] ? this._ufMotionIntensity : 'normal';
            this._ufMotionIntensity = value;
            if (input) input.value = value;
        },

        _syncExpressionPreview() {
            const preview = this.panel?.querySelector('#uf-expression-preview');
            if (!preview) return;
            const key = this._panelMotionKey || 'neutral';
            const motion = getAvailableMotions()[key] || getAvailableMotions().neutral || {};
            const intensity = this._readMotionIntensity();
            const canonical = this._resolveCanonicalExpressionForMotion?.(key) || key;
            preview.dataset.motion = String(key || 'neutral');
            preview.dataset.expression = String(canonical || 'neutral');
            preview.dataset.intensity = intensity;

            const title = this.panel?.querySelector('#uf-expression-preview-title');
            const copy = this.panel?.querySelector('#uf-expression-preview-copy');
            if (title) title.textContent = `${motion.name || key} (${SIMPLE_INTENSITIES[intensity]?.label || 'Normal'})`;
            if (copy) copy.textContent = motion.description || 'Choose an expression to preview the face behavior before applying it.';
            this._renderMotionChips();
        },

        _applyIdlePresetToPanel(key) {
            const preset = IDLE_PRESETS.find(item => item.key === key) || IDLE_PRESETS[0];
            if (!preset) return;
            this._setPanelMotionKey(preset.key);
            this._ufMotionIntensity = preset.intensity || 'soft';
            this._panelDurationSec = Math.max(0.1, Number(preset.duration) || 2);
            this._panelEndSec = Math.max(this._panelStartSec + 0.1, this._panelStartSec + this._panelDurationSec);
            this._panelRepeat = preset.repeat || '-1';
            this._panelRepeatMode = 'restart';
            this._panelRepeatPauseSec = Math.max(0, Number(preset.pause) || 0);
            this._panelAfterPlayback = preset.repeat === '-1' ? 'return' : 'keep';
            this._syncTimelineWindowInputs();
            this._syncMotionRepeatInputs();
            this._syncMotionAfterPlaybackInputs();
            this._syncMotionIntensityInput();
            this._syncExpressionPreview();
            this.setStatus(`${preset.label} preset ready. Preview or apply it to the selected face.`);
        },

        _loadUserStylePresets() {
            try {
                const parsed = JSON.parse(localStorage.getItem(USER_STYLE_STORAGE_KEY) || '[]');
                return Array.isArray(parsed)
                    ? parsed.filter(item => item?.id && item?.label && item?.style)
                    : [];
            } catch (err) {
                return [];
            }
        },

        _saveUserStylePresets(items) {
            try {
                localStorage.setItem(USER_STYLE_STORAGE_KEY, JSON.stringify((items || []).slice(0, 24)));
            } catch (err) {
                Utils.showToast('Could not save face style in this browser.', 'warning');
            }
        },

        _renderStylePresetOptions() {
            const builtIn = Object.entries(STYLE_PRESETS)
                .map(([key, preset]) => `<option value="${key}">${preset.label}</option>`)
                .join('');
            const saved = this._loadUserStylePresets()
                .map(item => `<option value="user:${item.id}">${item.label}</option>`)
                .join('');
            return saved ? `${builtIn}<optgroup label="Saved Styles">${saved}</optgroup>` : builtIn;
        },

        _refreshStylePresetSelect(selectedValue = null) {
            const select = this.panel?.querySelector('#uf-style-preset');
            if (!select) return;
            select.innerHTML = this._renderStylePresetOptions();
            if (selectedValue && Array.from(select.options || []).some(opt => opt.value === selectedValue)) {
                select.value = selectedValue;
                this._ufStylePreset = selectedValue;
            } else if (Array.from(select.options || []).some(opt => opt.value === this._ufStylePreset)) {
                select.value = this._ufStylePreset;
            } else {
                select.value = 'custom';
                this._ufStylePreset = 'custom';
            }
        },

        _applyStylePreset(key) {
            if (String(key || '').startsWith('user:')) {
                const id = String(key).slice('user:'.length);
                const saved = this._loadUserStylePresets().find(item => item.id === id);
                if (saved?.style) {
                    this._ufStylePreset = key;
                    this._syncStyleInputsFromStyle(saved.style);
                    this._ufStyle = this._readStyleOverrides();
                    this._refreshStylePresetSelect(key);
                    this._syncExpressionPreview();
                    return;
                }
            }
            const presetKey = STYLE_PRESETS[key] ? key : 'custom';
            this._ufStylePreset = presetKey;
            const select = this.panel?.querySelector('#uf-style-preset');
            if (select) select.value = presetKey;
            if (presetKey === 'custom') {
                this._ufStyle = this._readStyleOverrides();
                return;
            }
            this._syncStyleInputsFromStyle({
                ...this._readStyleOverrides(),
                ...STYLE_PRESETS[presetKey]
            });
            this._ufStyle = this._readStyleOverrides();
            this._syncExpressionPreview();
        },

        _saveCurrentStylePreset() {
            const style = this._readStyleOverrides();
            const now = new Date();
            const label = `Face Style ${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            const id = `style-${Date.now().toString(36)}`;
            const items = this._loadUserStylePresets();
            items.unshift({ id, label, style });
            this._saveUserStylePresets(items);
            this._refreshStylePresetSelect(`user:${id}`);
            this.setStatus(`${label} saved.`);
            Utils.showToast('Universal Face style saved.', 'success');
        },

        _deleteSelectedStylePreset() {
            const select = this.panel?.querySelector('#uf-style-preset');
            const value = select?.value || this._ufStylePreset || 'custom';
            if (!String(value).startsWith('user:')) {
                Utils.showToast('Choose a saved style before deleting.', 'info');
                return;
            }
            const id = String(value).slice('user:'.length);
            const next = this._loadUserStylePresets().filter(item => item.id !== id);
            this._saveUserStylePresets(next);
            this._ufStylePreset = 'custom';
            this._refreshStylePresetSelect('custom');
            this.setStatus('Deleted saved Universal Face style.');
            Utils.showToast('Saved style deleted.', 'success');
        },

        _loadUserTemplates() {
            try {
                const parsed = JSON.parse(localStorage.getItem(USER_TEMPLATE_STORAGE_KEY) || '[]');
                return Array.isArray(parsed)
                    ? parsed.filter(item => item?.id && item?.label && item?.setKey)
                    : [];
            } catch (err) {
                return [];
            }
        },

        _saveUserTemplates(items) {
            try {
                localStorage.setItem(USER_TEMPLATE_STORAGE_KEY, JSON.stringify((items || []).slice(0, 32)));
            } catch (err) {
                Utils.showToast('Could not save face template in this browser.', 'warning');
            }
        },

        _renderTemplateOptions() {
            const saved = this._loadUserTemplates();
            const options = saved
                .map(item => `<option value="user:${item.id}">${item.label}</option>`)
                .join('');
            return `<option value="none">No Saved Template</option>${options ? `<optgroup label="Saved Templates">${options}</optgroup>` : ''}`;
        },

        _refreshTemplateSelect(selectedValue = 'none') {
            const select = this.panel?.querySelector('#uf-template-preset');
            if (!select) return;
            select.innerHTML = this._renderTemplateOptions();
            select.value = Array.from(select.options || []).some(opt => opt.value === selectedValue) ? selectedValue : 'none';
        },

        _captureFaceTemplateFromParts(parts) {
            if (!Array.isArray(parts) || !parts.length) return null;
            const bounds = this._getObjectsBounds(parts);
            if (!bounds || !bounds.width || !bounds.height) return null;
            const setKey = this._extractFaceSetKeyFromParts(parts) || this.selectedSetKey || 'classic';
            const viewMode = this._extractViewModeFromParts(parts) || this._ufViewMode || 'front';
            const style = parts.find(obj => obj?.faceSet?.style)?.faceSet?.style || this._extractStyleFromParts(parts) || this._readStyleOverrides();
            const geometry = parts.map(obj => {
                const role = this.getFaceRole(obj);
                if (!role) return null;
                return {
                    role,
                    x: (Number(obj.x || 0) - bounds.centerX) / bounds.width,
                    y: (Number(obj.y || 0) - bounds.centerY) / bounds.height,
                    width: Number(obj.width || 0) / bounds.width,
                    height: Number(obj.height || 0) / bounds.height,
                    rotation: Number(obj.rotation || 0),
                    scaleX: Number(obj.scaleX ?? 1),
                    scaleY: Number(obj.scaleY ?? 1),
                    opacity: Number(obj.opacity ?? 1),
                    visible: obj.visible !== false
                };
            }).filter(Boolean);
            return {
                setKey,
                viewMode,
                style,
                geometry,
                sizePercent: Number(this.panel?.querySelector('#face-rig-set-size')?.value) || 110
            };
        },

        _saveSelectedFaceTemplate() {
            const parts = this._getSelectedFaceTargetParts();
            const template = this._captureFaceTemplateFromParts(parts);
            if (!template) {
                Utils.showToast('Select a face set before saving a template.', 'warning');
                return;
            }
            const now = new Date();
            const label = `Face Template ${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            const id = `tpl-${Date.now().toString(36)}`;
            const items = this._loadUserTemplates();
            items.unshift({ id, label, ...template });
            this._saveUserTemplates(items);
            this._refreshTemplateSelect(`user:${id}`);
            this.setStatus(`${label} saved.`);
            Utils.showToast('Universal Face template saved.', 'success');
        },

        _deleteSelectedFaceTemplate() {
            const select = this.panel?.querySelector('#uf-template-preset');
            const value = select?.value || 'none';
            if (!String(value).startsWith('user:')) {
                Utils.showToast('Choose a saved face template before deleting.', 'info');
                return;
            }
            const id = String(value).slice('user:'.length);
            this._saveUserTemplates(this._loadUserTemplates().filter(item => item.id !== id));
            this._refreshTemplateSelect('none');
            this.setStatus('Deleted saved face template.');
            Utils.showToast('Saved face template deleted.', 'success');
        },

        _applyTemplatePreset(value) {
            if (!String(value || '').startsWith('user:')) return;
            const id = String(value).slice('user:'.length);
            const template = this._loadUserTemplates().find(item => item.id === id);
            if (!template) return;
            if (template.setKey && getAvailableSets()[template.setKey]) {
                this.selectSet(template.setKey, { silent: true });
            }
            if (template.viewMode === 'front' || template.viewMode === 'side') {
                this._ufViewMode = template.viewMode;
                const viewSelect = this.panel?.querySelector('#uf-view-select');
                if (viewSelect) viewSelect.value = template.viewMode;
            }
            if (template.style) {
                this._syncStyleInputsFromStyle(template.style);
            }
            if (Number.isFinite(Number(template.sizePercent))) {
                const size = this.panel?.querySelector('#face-rig-set-size');
                const sizeLabel = this.panel?.querySelector('#face-rig-set-size-value');
                const value = Math.max(60, Math.min(220, Number(template.sizePercent)));
                if (size) size.value = value;
                if (sizeLabel) sizeLabel.textContent = `${value}%`;
            }
            this.setStatus(`${template.label || 'Saved template'} loaded. Place Face to use it.`);
        },

        _setFacePartEditMode(mode) {
            const nextMode = mode === 'parts' ? 'parts' : 'whole';
            this._ufPartEditMode = nextMode;
            const select = this.panel?.querySelector('#uf-edit-mode');
            if (select) select.value = nextMode;
            const targets = this._getSelectedFaceTargetGroupsStrict();
            if (nextMode === 'whole') {
                this.setStatus(targets.length
                    ? `Move Whole Face mode: editing ${targets.length} face set${targets.length === 1 ? '' : 's'}.`
                    : 'Move Whole Face mode: select a face set to move it as one group.');
                return;
            }
            this.setStatus('Edit Parts mode: select an eye, brow, or mouth part to adjust it directly.');
        },

        _selectFacePartFocus(focusKey) {
            const focus = FACE_PART_FOCUS[focusKey] || FACE_PART_FOCUS.whole;
            const targets = this._getSelectedFaceTargetGroupsStrict();
            if (!targets.length) {
                Utils.showToast('Select a face set first.', 'warning');
                return;
            }
            const parts = targets.flat();
            let ids = [];
            if (!focus.roles) {
                ids = parts.map(obj => obj.id);
                this._setFacePartEditMode('whole');
            } else {
                const roleSet = new Set(focus.roles);
                ids = parts
                    .filter(obj => roleSet.has(this.getFaceRole(obj)))
                    .map(obj => obj.id);
                this._setFacePartEditMode('parts');
            }
            if (!ids.length) {
                Utils.showToast(`No ${focus.label.toLowerCase()} parts found in this face set.`, 'info');
                return;
            }
            this.objects.select?.(ids);
            this.objects.updateProperties?.();
            this.stage?.requestRender?.();
            this.setStatus(`${focus.label} selected for editing.`);
        },

        _syncTimelineWindowInputs() {
            this._panelStartSec = Math.max(0, Number(this._panelStartSec) || 0);
            this._panelDurationSec = Math.max(0.1, Number(this._panelDurationSec) || 2);
            this._panelEndSec = Math.max(this._panelStartSec + 0.1, Number(this._panelEndSec) || (this._panelStartSec + this._panelDurationSec));

            const startInput = this.panel?.querySelector('#uf-motion-start');
            const endInput = this.panel?.querySelector('#uf-motion-end');
            const durationSelect = this.panel?.querySelector('#uf-motion-duration');
            if (startInput) startInput.value = this._panelStartSec.toFixed(1);
            if (endInput) endInput.value = this._panelEndSec.toFixed(1);
            if (durationSelect) {
                Array.from(durationSelect.options || []).forEach(option => {
                    if (option.dataset?.custom === '1') option.remove();
                });
                const nearest = DURATIONS.find(sec => Math.abs(sec - this._panelDurationSec) < 0.05);
                if (nearest != null) {
                    durationSelect.value = String(nearest);
                } else {
                    const customSec = Math.max(0.1, Number(this._panelDurationSec.toFixed(1)));
                    const custom = document.createElement('option');
                    custom.value = String(customSec);
                    custom.textContent = `${customSec}s`;
                    custom.dataset.custom = '1';
                    durationSelect.appendChild(custom);
                    durationSelect.value = String(customSec);
                }
            }
        },

        _mouthOpenForTextExpression(expr) {
            switch (expr) {
                case 'talk-a': return 0.78;
                case 'talk-o': return 0.86;
                case 'talk-u': return 0.62;
                case 'talk-ee': return 0.36;
                case 'talk-f': return 0.28;
                case 'talk-m': return 0.04;
                case 'jaw-open': return 1;
                default: return 0;
            }
        },

        _textExpressionForChar(ch) {
            const c = String(ch || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            if ('mbp'.includes(c)) return 'talk-m';
            if ('fv'.includes(c)) return 'talk-f';
            if ('eiy'.includes(c)) return 'talk-ee';
            if ('u'.includes(c)) return 'talk-u';
            if ('ow'.includes(c)) return 'talk-o';
            if ('a'.includes(c)) return 'talk-a';
            if ('rln'.includes(c)) return 'talk-ee';
            if ('tdszcxj'.includes(c)) return 'talk-f';
            if ('kgqh'.includes(c)) return 'jaw-open';
            return 'talk-a';
        },

        _buildTextLipSyncVisemes(text, msPerChar, packKey = 'natural', tuning = null) {
            const source = String(text || '').trim();
            const events = [];
            let time = 0;
            let lastExpr = 'neutral';
            const pack = LIPSYNC_PACKS[packKey] || LIPSYNC_PACKS.natural;
            const resolvedTuning = {
                intensity: Math.max(0.6, Math.min(1.8, Number(tuning?.intensity) || 1)),
                pause: Math.max(0.7, Math.min(1.5, Number(tuning?.pause) || 1))
            };
            const charMs = Math.max(70, Math.min(320, (Number(msPerChar) || 130) * (pack.speedScale || 1)));

            for (let i = 0; i < source.length; i += 1) {
                const ch = source[i];
                if (/\s/.test(ch)) {
                    if (lastExpr !== 'neutral') {
                        events.push({ time, expr: 'neutral', strength: 0, mouthOpen: 0 });
                        lastExpr = 'neutral';
                    }
                    time += charMs * (1.55 * (pack.pauseScale || 1) * resolvedTuning.pause);
                    continue;
                }
                if (/[,.!?;:]/.test(ch)) {
                    if (lastExpr !== 'neutral') {
                        events.push({ time, expr: 'neutral', strength: 0, mouthOpen: 0 });
                        lastExpr = 'neutral';
                    }
                    time += charMs * (2.2 * (pack.pauseScale || 1) * resolvedTuning.pause);
                    continue;
                }

                const expr = this._textExpressionForChar(ch);
                const baseStrength = expr === 'talk-m' ? 0.82 : 1;
                const strength = Math.max(0, Math.min(2, baseStrength * (pack.strengthScale || 1) * resolvedTuning.intensity));
                const mouthOpen = Math.max(0, Math.min(1.6, this._mouthOpenForTextExpression(expr) * (pack.mouthScale || 1) * resolvedTuning.intensity));

                events.push({ time, expr, strength, mouthOpen });
                lastExpr = expr;
                time += charMs;
            }

            events.push({ time: time + (charMs * 0.25), expr: 'neutral', strength: 0, mouthOpen: 0 });
            return { events, duration: Math.max(charMs * 4, time + (charMs * 0.75)), charMs };
        },

        _buildTextLipSyncMotionForSet(parts, talk) {
            this._ensureSmartCutMouthOpeningLooksDark(parts);
            this._sortUniversalFacePartsForRender(parts);
            const role = this.mapPartsByRole(parts);
            const opening = role['mouth-opening'];
            const upperLip = role['upper-lip'];
            const lowerLip = role['lower-lip'];
            const teeth = role.teeth;
            if (!opening && !upperLip && !lowerLip && !teeth) return 0;

            const durationMs = Math.max(320, Math.round(Number(talk?.duration) || 1000));
            const charStep = Math.max(35, Math.min(95, (Number(talk?.charMs) || 130) * 0.58));
            const mouthScale = Math.max(0.75, (Number(opening?.height) || 54) / 54);
            const move = (value) => value * mouthScale;
            const events = Array.isArray(talk?.events) ? talk.events : [];

            const openingCfg = [];
            const upperCfg = [];
            const lowerCfg = [];
            const teethCfg = [];

            let prev = { expr: 'neutral', strength: 0, mouthOpen: 0 };
            events.forEach(event => {
                const delay = Math.max(0, Math.round(Number(event.time) || 0));
                const mouthOpen = Math.max(0, Number(event.mouthOpen) || 0);
                const strength = Math.max(0, Number(event.strength) || 0);
                const expr = String(event.expr || 'neutral');

                if (opening) {
                    const fromY = Number(opening.scaleY) * (0.25 + (prev.mouthOpen * 0.95));
                    const toY = Number(opening.scaleY) * (0.25 + (mouthOpen * 0.95));
                    const widthBias = expr === 'talk-ee' ? 0.18 : (expr === 'talk-o' ? -0.12 : 0.06);
                    const fromX = Number(opening.scaleX) * (1 + (Math.max(0, prev.strength) * widthBias));
                    const toX = Number(opening.scaleX) * (1 + (strength * widthBias));
                    openingCfg.push({ property: 'scaleY', from: fromY, to: toY, duration: charStep, delay, easing: toY > fromY ? 'easeOut' : 'easeInOut' });
                    openingCfg.push({ property: 'scaleX', from: fromX, to: toX, duration: charStep, delay, easing: 'easeInOut' });
                }

                if (upperLip) {
                    const from = Number(upperLip.y) - move((Math.max(0, prev.strength) * 4) + (Math.max(0, prev.mouthOpen) * 3));
                    const to = Number(upperLip.y) - move((strength * 4) + (mouthOpen * 3));
                    upperCfg.push({ property: 'y', from, to, duration: charStep, delay, easing: to < from ? 'easeOut' : 'easeInOut' });
                }

                if (lowerLip) {
                    const from = Number(lowerLip.y) + move((Math.max(0, prev.mouthOpen) * 10) + (Math.max(0, prev.strength) * 4));
                    const to = Number(lowerLip.y) + move((mouthOpen * 10) + (strength * 4));
                    lowerCfg.push({ property: 'y', from, to, duration: charStep, delay, easing: to > from ? 'easeOut' : 'easeInOut' });
                }

                if (teeth) {
                    const from = 0.18 + (Math.max(0, prev.mouthOpen) * 0.72);
                    const to = 0.18 + (mouthOpen * 0.72);
                    teethCfg.push({ property: 'opacity', from, to, duration: charStep, delay, easing: 'easeInOut' });
                }

                prev = { expr, strength, mouthOpen };
            });

            let count = 0;
            if (openingCfg.length && opening) {
                this.addMotionAnimation(opening, 'Face Text Lip Sync Opening', durationMs, openingCfg);
                count += 1;
            }
            if (upperCfg.length && upperLip) {
                this.addMotionAnimation(upperLip, 'Face Text Lip Sync Upper Lip', durationMs, upperCfg);
                count += 1;
            }
            if (lowerCfg.length && lowerLip) {
                this.addMotionAnimation(lowerLip, 'Face Text Lip Sync Lower Lip', durationMs, lowerCfg);
                count += 1;
            }
            if (teethCfg.length && teeth) {
                this.addMotionAnimation(teeth, 'Face Text Lip Sync Teeth', durationMs, teethCfg);
                count += 1;
            }
            return count;
        },

        _getUniversalFaceStackRank(obj) {
            const role = String(this.getFaceRole?.(obj) || obj?.faceSet?.role || obj?._smartCutFaceRole || '').toLowerCase();
            if (this._isSmartCutFaceCover?.(obj)) return 0;
            if (this._isSmartCutFaceBase?.(obj)) return -10;
            if (role.includes('eye-sclera')) return 10;
            if (role === 'mouth-opening') return 18;
            if (role === 'teeth') return 21;
            if (role === 'upper-lip') return 24;
            if (role === 'lower-lip') return 25;
            if (role.includes('iris')) return 30;
            if (role.includes('pupil')) return 32;
            if (role.includes('shine')) return 34;
            if (role.includes('eyebrow')) return 40;
            if (role.includes('blink-lid')) return 45;
            return 28;
        },

        _sortUniversalFacePartsForRender(parts = []) {
            const list = Array.isArray(this.objects?.objects) ? this.objects.objects : null;
            if (!list || !Array.isArray(parts) || !parts.length) return;
            const companions = this._getSelectedSmartCutFaceCompanions?.() || { covers: [], baseObjects: [] };
            const all = [...companions.baseObjects, ...companions.covers, ...parts].filter(obj => obj && list.includes(obj));
            if (!all.length) return;
            const memberSet = new Set(all);
            const indexed = all
                .map(obj => ({ obj, index: list.indexOf(obj), rank: this._getUniversalFaceStackRank(obj) }))
                .sort((a, b) => (a.rank - b.rank) || (a.index - b.index));
            const insertAt = Math.min(...indexed.map(item => item.index));
            const remaining = list.filter(obj => !memberSet.has(obj));
            remaining.splice(insertAt, 0, ...indexed.map(item => item.obj));
            this.objects.objects = remaining;
        },

        _ensureSmartCutMouthOpeningLooksDark(parts = []) {
            const openings = (parts || []).filter(obj => {
                const role = String(this.getFaceRole?.(obj) || obj?.faceSet?.role || obj?._smartCutFaceRole || '').toLowerCase();
                return role === 'mouth-opening' && obj?.type === 'image' && obj.imageElement;
            });
            let changed = 0;
            openings.forEach(obj => {
                if (obj._smartCutDarkMouthApplied && obj.faceSet?.gapFillMode === 'dark-mouth-opening') return;
                const img = obj.imageElement;
                const width = Math.max(1, img.naturalWidth || img.width || Math.round(obj.width || 1));
                const height = Math.max(1, img.naturalHeight || img.height || Math.round(obj.height || 1));
                const mask = document.createElement('canvas');
                mask.width = width;
                mask.height = height;
                const maskCtx = mask.getContext('2d', { willReadFrequently: true });
                maskCtx.drawImage(img, 0, 0, width, height);

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                const grad = ctx.createLinearGradient(0, 0, 0, height);
                grad.addColorStop(0, 'rgba(46, 10, 18, 0.95)');
                grad.addColorStop(0.42, 'rgba(3, 2, 7, 1)');
                grad.addColorStop(1, 'rgba(68, 16, 26, 0.94)');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, width, height);
                ctx.globalCompositeOperation = 'destination-in';
                ctx.drawImage(mask, 0, 0, width, height);
                ctx.globalCompositeOperation = 'source-over';
                const inner = ctx.createRadialGradient(width * 0.5, height * 0.48, 0, width * 0.5, height * 0.5, Math.max(width, height) * 0.52);
                inner.addColorStop(0, 'rgba(0,0,0,0.42)');
                inner.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.globalCompositeOperation = 'source-atop';
                ctx.fillStyle = inner;
                ctx.fillRect(0, 0, width, height);
                ctx.globalCompositeOperation = 'source-over';

                if (!obj._smartCutMouthOpeningOriginalSrc && obj.imageSrc) obj._smartCutMouthOpeningOriginalSrc = obj.imageSrc;
                const dataUrl = canvas.toDataURL('image/png');
                obj.imageSrc = dataUrl;
                obj.loadImage?.(dataUrl);
                obj.opacity = Math.min(1, Math.max(0.9, Number(obj.opacity) || 1));
                obj._smartCutDarkMouthApplied = true;
                obj._smartCutGeneratedMouthGap = true;
                obj.faceSet = {
                    ...(obj.faceSet || {}),
                    generatedGap: true,
                    gapFillMode: 'dark-mouth-opening'
                };
                changed += 1;
            });
            if (changed) {
                this.objects.updateObjectList?.();
                this.objects.updateProperties?.();
                this.stage?.requestRender?.();
            }
            return changed;
        },

        _readTextLipSyncConfig() {
            const text = String(this.panel?.querySelector('#uf-lipsync-text')?.value || '').trim();
            const pack = this.panel?.querySelector('#uf-lipsync-pack')?.value || 'natural';
            const talkSpeed = this.panel?.querySelector('#uf-lipsync-talk-speed')?.value || 'normal';
            const autoDuration = this.panel?.querySelector('#uf-lipsync-auto-duration')?.checked !== false;
            const speed = Math.max(70, Math.min(320, Number(this.panel?.querySelector('#uf-lipsync-speed')?.value) || 130));
            const intensity = Math.max(0.6, Math.min(1.8, (Number(this.panel?.querySelector('#uf-lipsync-intensity')?.value) || 100) / 100));
            const pause = Math.max(0.7, Math.min(1.5, (Number(this.panel?.querySelector('#uf-lipsync-pause')?.value) || 100) / 100));
            return { text, pack, speed, talkSpeed, autoDuration, tuning: { intensity, pause } };
        },

        _roundLipSyncDuration(seconds) {
            return Math.max(0.8, Math.ceil((Number(seconds) || 0.8) * 4) / 4);
        },

        _estimateTextLipSyncDuration(text, talkSpeedKey = 'normal') {
            const source = String(text || '').trim();
            const speed = LIPSYNC_TALK_SPEEDS[talkSpeedKey] || LIPSYNC_TALK_SPEEDS.normal;
            const words = source.match(/[\p{L}\p{N}]+(?:['-][\p{L}\p{N}]+)*/gu) || [];
            const wordCount = words.length || (source ? 1 : 0);
            const commaPauses = (source.match(/[,;:]/g) || []).length * 0.18;
            const sentencePauses = (source.match(/[.!?]/g) || []).length * 0.32;
            const newlinePauses = (source.match(/\n/g) || []).length * 0.25;
            const baseSeconds = wordCount ? (wordCount / speed.wpm) * 60 : 1.2;
            const minSeconds = this._roundLipSyncDuration(baseSeconds + commaPauses + sentencePauses + newlinePauses + 0.35);
            return {
                text: source,
                speedKey: talkSpeedKey,
                speedLabel: speed.label,
                wpm: speed.wpm,
                wordCount,
                minSeconds
            };
        },

        _resolveTextLipSyncTiming(config, options = {}) {
            const explicitStart = Math.max(0, Number(options.startSec) || 0);
            const explicitEndRaw = Number.isFinite(Number(options.endSec)) ? Number(options.endSec) : NaN;
            const rangeFromWindow = Number.isFinite(explicitEndRaw) ? Math.max(0.1, explicitEndRaw - explicitStart) : 0;
            const requestedRange = Math.max(0, Number(options.rangeSec) || rangeFromWindow || this._panelDurationSec || 0);
            const estimate = this._estimateTextLipSyncDuration(config?.text || '', config?.talkSpeed || 'normal');
            const rangeSec = config?.autoDuration
                ? estimate.minSeconds
                : Math.max(estimate.minSeconds, this._roundLipSyncDuration(requestedRange || estimate.minSeconds));
            return {
                ...estimate,
                startSec: explicitStart,
                rangeSec,
                endSec: explicitStart + rangeSec,
                clamped: !config?.autoDuration && requestedRange > 0 && requestedRange < estimate.minSeconds,
                autoDuration: config?.autoDuration !== false
            };
        },

        _applyTextLipSyncTimingToPanel(timing) {
            if (!timing) return;
            this._panelStartSec = Math.max(0, Number(timing.startSec) || 0);
            this._panelDurationSec = Math.max(0.1, Number(timing.rangeSec) || 0.1);
            this._panelEndSec = this._panelStartSec + this._panelDurationSec;
            this._syncTimelineWindowInputs();
        },

        _visemePreviewColor(expr) {
            switch (expr) {
                case 'talk-m': return '#f59e0b';
                case 'talk-f': return '#60a5fa';
                case 'talk-ee': return '#2dd4bf';
                case 'talk-u': return '#22c55e';
                case 'talk-o': return '#f97316';
                case 'talk-a': return '#ef4444';
                case 'jaw-open': return '#e11d48';
                default: return '#64748b';
            }
        },

        _updateTextLipSyncPreview() {
            const track = this.panel?.querySelector('#uf-lipsync-preview-track');
            const summary = this.panel?.querySelector('#uf-lipsync-preview-summary');
            const durationSummary = this.panel?.querySelector('#uf-lipsync-duration-summary');
            if (!track || !summary) return;

            const config = this._readTextLipSyncConfig();
            const timing = this._resolveTextLipSyncTiming(config, {
                startSec: this._panelStartSec || 0,
                endSec: this._panelEndSec,
                rangeSec: this._panelDurationSec
            });
            if (durationSummary) {
                durationSummary.textContent = config.text
                    ? `${timing.wordCount} word${timing.wordCount === 1 ? '' : 's'} at ${timing.speedLabel.toLowerCase()} speed: ${timing.autoDuration ? 'auto' : 'minimum'} ${timing.minSeconds.toFixed(2).replace(/\.00$/, '')}s.`
                    : 'Auto duration will be calculated from dialogue.';
            }
            if (!config.text) {
                track.innerHTML = '';
                summary.textContent = 'Type dialogue to preview visemes.';
                return;
            }

            const talk = this._buildTextLipSyncVisemes(config.text, config.speed, config.pack, config.tuning);
            const events = (talk.events || []).filter(item => item?.expr && item.expr !== 'neutral');
            if (!events.length) {
                track.innerHTML = '';
                summary.textContent = 'No speech visemes detected from current text.';
                return;
            }

            const maxBars = 48;
            const stride = Math.max(1, Math.ceil(events.length / maxBars));
            const sampled = events.filter((_, index) => index % stride === 0).slice(0, maxBars);

            track.innerHTML = sampled.map(item => {
                const h = Math.max(6, Math.min(22, 6 + Math.round((Number(item.mouthOpen) || 0) * 14)));
                const color = this._visemePreviewColor(item.expr);
                const timeSec = Math.max(0, Number(item.time || 0) / 1000);
                const mouthOpen = Math.max(0, Number(item.mouthOpen) || 0);
                const tip = `${item.expr} • ${timeSec.toFixed(2)}s • open ${mouthOpen.toFixed(2)}`;
                return `<span title="${tip}" style="display:inline-block; width:6px; height:${h}px; border-radius:2px; background:${color};"></span>`;
            }).join('');

            const seconds = Math.max(0.1, Number(talk.duration || 0) / 1000);
            const visemeCount = events.length;
            summary.textContent = `${visemeCount} viseme events • ${seconds.toFixed(1)}s generated • timeline ${timing.rangeSec.toFixed(2).replace(/\.00$/, '')}s • pack ${config.pack}`;
        },

        previewTextLipSync(options = {}) {
            const scope = options.scope || 'selected';
            const sets = scope === 'selected' ? this._getSelectedFaceTargetGroupsStrict() : this.getFaceSetTargets(scope);
            if (!sets.length) {
                Utils.showToast('Select a face target first to preview text lip sync.', 'warning');
                return;
            }
            const config = this._readTextLipSyncConfig();
            const timing = this._resolveTextLipSyncTiming(config, options);
            const timedOptions = {
                ...options,
                startSec: timing.startSec,
                endSec: timing.endSec,
                rangeSec: timing.rangeSec
            };
            this._applyTextLipSyncTimingToPanel(timing);

            const snapshots = new Map();
            sets.flat().forEach(obj => {
                snapshots.set(obj.id, {
                    animations: Utils.deepClone(obj.animations || []),
                    signature: obj._faceSetAppliedMotionSignature,
                    motionKey: obj._faceSetAppliedMotionKey
                });
            });

            const ok = this.applyTextLipSync({ ...timedOptions, scope, previewMode: true });
            if (!ok) return;

            const previewMs = Math.max(700, Math.round(timing.rangeSec * 1000));
            this.setStatus(`Previewing text lip sync (${(previewMs / 1000).toFixed(1)}s).`);
            setTimeout(() => {
                snapshots.forEach((state, id) => {
                    const obj = this.objects.getObjectById?.(id);
                    if (!obj) return;
                    obj.animations = Utils.deepClone(state.animations || []);
                    obj._faceSetAppliedMotionSignature = state.signature || null;
                    obj._faceSetAppliedMotionKey = state.motionKey || null;
                });
                this.objects.updateProperties?.();
                this.animations?.updateAppliedAnimationsList?.();
                this.animations?.updateCodeOutput?.();
                this.stage?.requestRender?.();
                eventBus.emit('timeline:update');
                this.setStatus('Text lip sync preview finished. Use Apply to commit.');
            }, previewMs);
        },

        applyTextLipSync(options = {}) {
            const scope = options.scope || 'selected';
            const previewMode = !!options.previewMode;

            const config = this._readTextLipSyncConfig();
            if (!config.text) {
                Utils.showToast('Type dialogue first to generate text lip sync.', 'warning');
                return false;
            }
            const timing = this._resolveTextLipSyncTiming(config, options);
            const explicitStart = timing.startSec;
            const rangeSec = timing.rangeSec;
            this._lastTextLipSyncTiming = timing;
            this._applyTextLipSyncTimingToPanel(timing);
            if (timing.clamped && !previewMode) {
                Utils.showToast(`Lip sync duration increased to ${timing.rangeSec.toFixed(2).replace(/\.00$/, '')}s for this dialogue.`, 'info');
            }

            const sets = scope === 'selected' ? this._getSelectedFaceTargetGroupsStrict() : this.getFaceSetTargets(scope);
            if (!sets.length) {
                Utils.showToast('Select a face target first, or place one on stage.', 'warning');
                return false;
            }

            const talk = this._buildTextLipSyncVisemes(config.text, config.speed, config.pack, config.tuning);
            if (!Array.isArray(talk.events) || !talk.events.length) {
                Utils.showToast('No speech events were generated from the text.', 'warning');
                return false;
            }

            let changedSets = 0;
            sets.forEach(parts => {
                this._captureFaceSetRestPose?.(parts);
                this.clearFaceSetMotion(parts);
                const appliedCount = this._buildTextLipSyncMotionForSet(parts, talk);
                if (!appliedCount) return;

                const signature = [
                    'text-lipsync-v1',
                    config.pack,
                    String(config.speed),
                    String(Math.round(config.tuning.intensity * 100)),
                    String(Math.round(config.tuning.pause * 100)),
                    config.text,
                    this._getFaceSetGroupSignature(parts)
                ].join('::');
                this._setFaceSetMotionSignature(parts, 'talk', signature);
                changedSets += 1;
            });

            if (!changedSets) {
                Utils.showToast('No compatible mouth parts found to apply text lip sync.', 'info');
                return false;
            }

            if (rangeSec > 0) {
                this._scaleFaceMotionDuration(sets, rangeSec, explicitStart, { pushHistory: !previewMode });
            } else {
                this.objects.updateObjectList?.();
                this.objects.updateProperties?.();
                this.animations?.updateAppliedAnimationsList?.();
                this.animations?.updateCodeOutput?.();
                this.stage?.requestRender?.();
                eventBus.emit('timeline:update');
                if (!previewMode) eventBus.emit('history:push');
            }

            if (!previewMode) {
                const endSec = timing.endSec || (explicitStart + Math.max(0.1, rangeSec || (talk.duration / 1000)));
                this._panelStartSec = explicitStart;
                this._panelEndSec = endSec;
                this._panelDurationSec = Math.max(0.1, endSec - explicitStart);
                this._syncTimelineWindowInputs();
                this.setStatus(`Text lip sync applied to ${explicitStart.toFixed(1)}s - ${endSec.toFixed(1)}s.`);
                Utils.showToast(`Applied text lip sync to ${scope === 'all' ? `${changedSets} facial set(s)` : 'selected facial set'}.`, 'success');
            }

            return true;
        },

        _getSetStyleDefaults(key) {
            const set = getAvailableSets()[key] || {};
            return {
                iris: set.iris || '#6b3f21',
                brow: set.brow || '#2f1b14',
                lip: set.lip || '#d94c64',
                lipDark: set.lipDark || '#7f1d2d',
                pupil: set.pupil || '#111111',
                sclera: '#ffffff',
                sclera2: '#f3f8ff',
                useScleraGradient: false,
                lid: '#f2c8a8',
                lid2: '#dcae8f',
                useLidGradient: false
            };
        },

        _syncStyleInputsFromSet(key) {
            const style = this._getSetStyleDefaults(key);
            this._ufStyle = { ...style };
            this._ufStylePreset = 'custom';
            const iris = this.panel?.querySelector('#uf-color-iris');
            const brow = this.panel?.querySelector('#uf-color-brow');
            const lip = this.panel?.querySelector('#uf-color-lip');
            const sclera = this.panel?.querySelector('#uf-color-sclera');
            const sclera2 = this.panel?.querySelector('#uf-color-sclera-2');
            const scleraGrad = this.panel?.querySelector('#uf-sclera-gradient');
            const lid = this.panel?.querySelector('#uf-color-lid');
            const lid2 = this.panel?.querySelector('#uf-color-lid-2');
            const lidGrad = this.panel?.querySelector('#uf-lid-gradient');
            if (iris) iris.value = style.iris;
            if (brow) brow.value = style.brow;
            if (lip) lip.value = style.lip;
            if (sclera) sclera.value = style.sclera;
            if (sclera2) sclera2.value = style.sclera2;
            if (scleraGrad) scleraGrad.checked = !!style.useScleraGradient;
            if (lid) lid.value = style.lid;
            if (lid2) lid2.value = style.lid2;
            if (lidGrad) lidGrad.checked = !!style.useLidGradient;
            this._refreshStylePresetSelect?.('custom');
        },

        _syncStyleInputsFromStyle(style) {
            if (!style) return;
            const merged = {
                ...this._getSetStyleDefaults(this.selectedSetKey),
                ...style
            };
            this._ufStyle = { ...merged };
            const iris = this.panel?.querySelector('#uf-color-iris');
            const brow = this.panel?.querySelector('#uf-color-brow');
            const lip = this.panel?.querySelector('#uf-color-lip');
            const sclera = this.panel?.querySelector('#uf-color-sclera');
            const sclera2 = this.panel?.querySelector('#uf-color-sclera-2');
            const scleraGrad = this.panel?.querySelector('#uf-sclera-gradient');
            const lid = this.panel?.querySelector('#uf-color-lid');
            const lid2 = this.panel?.querySelector('#uf-color-lid-2');
            const lidGrad = this.panel?.querySelector('#uf-lid-gradient');
            if (iris && merged.iris) iris.value = merged.iris;
            if (brow && merged.brow) brow.value = merged.brow;
            if (lip && merged.lip) lip.value = merged.lip;
            if (sclera && merged.sclera) sclera.value = merged.sclera;
            if (sclera2 && merged.sclera2) sclera2.value = merged.sclera2;
            if (scleraGrad) scleraGrad.checked = !!merged.useScleraGradient;
            if (lid && merged.lid) lid.value = merged.lid;
            if (lid2 && merged.lid2) lid2.value = merged.lid2;
            if (lidGrad) lidGrad.checked = !!merged.useLidGradient;
        },

        _readStyleOverrides() {
            const defaults = this._getSetStyleDefaults(this.selectedSetKey);
            const iris = this.panel?.querySelector('#uf-color-iris')?.value || defaults.iris;
            const brow = this.panel?.querySelector('#uf-color-brow')?.value || defaults.brow;
            const lip = this.panel?.querySelector('#uf-color-lip')?.value || defaults.lip;
            const sclera = this.panel?.querySelector('#uf-color-sclera')?.value || defaults.sclera;
            const sclera2 = this.panel?.querySelector('#uf-color-sclera-2')?.value || defaults.sclera2;
            const useScleraGradient = !!this.panel?.querySelector('#uf-sclera-gradient')?.checked;
            const lid = this.panel?.querySelector('#uf-color-lid')?.value || defaults.lid;
            const lid2 = this.panel?.querySelector('#uf-color-lid-2')?.value || defaults.lid2;
            const useLidGradient = !!this.panel?.querySelector('#uf-lid-gradient')?.checked;
            return {
                ...defaults,
                iris,
                brow,
                lip,
                lipDark: defaults.lipDark,
                pupil: defaults.pupil,
                sclera,
                sclera2,
                useScleraGradient,
                lid,
                lid2,
                useLidGradient
            };
        },

        _updateLiveContextBadge() {
            const cards = this.panel?.querySelectorAll('[data-face-set]') || [];
            cards.forEach(card => {
                card.classList.remove('uf-live-context');
                const badge = card.querySelector('.uf-live-badge');
                if (badge) badge.remove();
            });

            if (!this._ufLiveContextSync || !this.selectedSetKey) return;
            const active = this.panel?.querySelector(`[data-face-set="${this.selectedSetKey}"]`);
            if (!active) return;
            active.classList.add('uf-live-context');
            const badge = document.createElement('span');
            badge.className = 'uf-live-badge';
            badge.textContent = 'LIVE';
            active.appendChild(badge);
        },

        _clearLiveContextSync() {
            if (!this._ufLiveContextSync) return;
            this._ufLiveContextSync = false;
            this._updateLiveContextBadge();
        },

        selectSet(key, options = {}) {
            const sets = getAvailableSets();
            if (!sets[key]) return;
            this.selectedSetKey = key;
            this._ufLiveContextSync = !!options.fromLiveContext;
            this.panel?.querySelectorAll('[data-face-set]').forEach(card => {
                card.classList.toggle('active', card.dataset.faceSet === key);
            });
            const select = this.panel?.querySelector('#face-rig-set-select');
            if (select) select.value = key;
            this._syncStyleInputsFromSet(key);
            this._updateLiveContextBadge();
            if (!options.silent) {
                this.setStatus(`${sets[key].name} selected.`);
            }
        },

        _getSelectedFaceTargetParts() {
            const targets = this._getSelectedFaceTargetGroupsStrict();
            return Array.isArray(targets) && targets.length ? (targets[0] || []) : [];
        },

        _getSelectedFaceTargetGroupsStrict() {
            const allObjects = Array.isArray(this.objects?.objects) ? this.objects.objects : [];
            const faceParts = allObjects.filter(obj => this.isFaceSetObject(obj));
            if (!faceParts.length) return [];

            const selectedIds = Array.isArray(this.objects?.selectedIds) ? this.objects.selectedIds : [];
            const selectedObjects = this._getSelectedObjectsSafe();
            const groupIds = new Set();

            const addGroupForObject = (obj) => {
                if (!obj) return;
                if (this.isFaceSetObject(obj)) {
                    groupIds.add(obj.groupId || obj.id);
                    return;
                }
                const groupId = obj.groupId;
                if (!groupId) return;
                const members = Array.isArray(this.objects?.groups?.[groupId])
                    ? this.objects.groups[groupId].map(id => this.objects.getObjectById?.(id)).filter(Boolean)
                    : [];
                if (members.some(member => this.isFaceSetObject(member))) {
                    groupIds.add(groupId);
                }
            };

            selectedObjects.forEach(addGroupForObject);
            selectedIds.forEach(id => addGroupForObject(this.objects.getObjectById?.(id)));

            if (!groupIds.size && selectedIds.length) {
                const groups = this.objects?.groups || {};
                Object.keys(groups).forEach(groupId => {
                    const ids = Array.isArray(groups[groupId]) ? groups[groupId] : [];
                    const hasSelectedMember = ids.some(id => selectedIds.includes(id));
                    if (!hasSelectedMember) return;
                    const members = ids.map(id => this.objects.getObjectById?.(id)).filter(Boolean);
                    if (members.some(member => this.isFaceSetObject(member))) {
                        groupIds.add(groupId);
                    }
                });
            }

            return [...groupIds]
                .map(groupId => faceParts.filter(obj => (obj.groupId || obj.id) === groupId))
                .filter(parts => parts.length);
        },

        _normalizeFaceRoleTokens(value) {
            return String(value || '')
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, ' ')
                .trim();
        },

        _scoreFaceRoleMatch(obj, tokenSets = []) {
            if (!obj) return -1;
            const fields = [
                this.getFaceRole(obj),
                obj?.faceSet?.role,
                obj?.faceSet?.part,
                obj?.name,
                Array.isArray(obj?.tags) ? obj.tags.join(' ') : ''
            ];
            const haystack = this._normalizeFaceRoleTokens(fields.filter(Boolean).join(' '));
            if (!haystack) return -1;

            let best = -1;
            tokenSets.forEach((set) => {
                const tokens = Array.isArray(set) ? set : [set];
                let score = 0;
                tokens.forEach((token) => {
                    const t = this._normalizeFaceRoleTokens(token);
                    if (!t) return;
                    if (haystack.includes(t)) score += Math.max(1, t.length);
                });
                if (score > best) best = score;
            });
            return best;
        },

        _pickFaceObjectsByRoles(parts, roleGroups = []) {
            const list = Array.isArray(parts) ? parts : [];
            const groups = Array.isArray(roleGroups) ? roleGroups : [];
            const used = new Set();
            const picked = [];

            groups.forEach((group) => {
                const tokenSets = Array.isArray(group) ? group : [group];
                let bestObj = null;
                let bestScore = -1;

                list.forEach((obj) => {
                    if (!obj || used.has(obj.id)) return;
                    const score = this._scoreFaceRoleMatch(obj, tokenSets);
                    if (score > bestScore) {
                        bestScore = score;
                        bestObj = obj;
                    }
                });

                if (bestObj && bestScore > 0) {
                    used.add(bestObj.id);
                    picked.push(bestObj);
                }
            });

            return picked;
        },

        _resolveCompressionShortcutTargets(mode) {
            const groups = this._getSelectedFaceTargetGroupsStrict();
            if (!groups.length) return null;

            const rolesByMode = {
                mouthPair: [
                    [
                        ['upper-lip', 'lip-upper', 'top-lip', 'lip top', 'upper lip', 'mouth upper', 'mouth-top', 'lip u', 'lips upper']
                    ],
                    [
                        ['lower-lip', 'lip-lower', 'bottom-lip', 'lip bottom', 'lower lip', 'mouth lower', 'mouth-bottom', 'lip d', 'lips lower']
                    ]
                ],
                mouthOpen: [
                    [
                        ['upper-lip', 'lip-upper', 'top-lip', 'lip top', 'upper lip', 'mouth upper', 'mouth-top', 'lip u', 'lips upper']
                    ],
                    [
                        ['lower-lip', 'lip-lower', 'bottom-lip', 'lip bottom', 'lower lip', 'mouth lower', 'mouth-bottom', 'lip d', 'lips lower']
                    ]
                ],
                blink: [
                    [
                        ['upper-eyelid', 'lid-upper', 'eyelid upper', 'eye upper lid', 'top eyelid', 'eyelid top', 'upper lid', 'eye-lid-upper']
                    ],
                    [
                        ['lower-eyelid', 'lid-lower', 'eyelid lower', 'eye lower lid', 'bottom eyelid', 'eyelid bottom', 'lower lid', 'eye-lid-lower']
                    ]
                ]
            };

            const roleGroups = rolesByMode[mode] || [];
            for (const parts of groups) {
                const picked = this._pickFaceObjectsByRoles(parts, roleGroups);
                if (picked.length >= 2) return { upper: picked[0], lower: picked[1] };

                // Fallback to vertical ordering when explicit roles are unavailable.
                const sorted = [...parts].sort((a, b) => ((a.y + a.height * 0.5) - (b.y + b.height * 0.5)));
                if (sorted.length >= 2) return { upper: sorted[0], lower: sorted[1] };
            }
            return null;
        },

        _applyCompressionShortcutFromSelectedFace(mode = 'mouthPair') {
            const mgr = this.objects;
            if (!mgr) return;

            if (mode === 'reset') {
                if (typeof mgr.resetCompressionRigSelection === 'function') {
                    mgr.resetCompressionRigSelection();
                }
                if (typeof mgr.clearCompressionPairRig === 'function') {
                    mgr.clearCompressionPairRig();
                }
                this.setStatus('Compression reset for selected face parts.');
                return;
            }

            const pair = this._resolveCompressionShortcutTargets(mode);
            if (!pair?.upper || !pair?.lower) {
                this.setStatus('Select a face set with lip/eyelid parts first.', true);
                return;
            }

            if (typeof mgr.select === 'function') {
                mgr.select([pair.upper.id, pair.lower.id]);
            }

            if (mode === 'blink') {
                mgr.applyCompressionPreset?.('blink');
                const ok = mgr.setupCompressionPairRigFromObjects?.(pair.upper, pair.lower, {
                    amountPct: 100,
                    scaleTowardSeam: true,
                    applyNow: true,
                    pushHistory: true,
                    silent: true,
                    selectPair: true
                });
                this.setStatus(ok ? 'Blink compression applied to selected eyelids.' : 'Unable to apply blink compression.', !ok);
                return;
            }

            mgr.applyCompressionPreset?.('mouth');
            const amountPct = mode === 'mouthOpen' ? 60 : 100;
            const ok = mgr.setupCompressionPairRigFromObjects?.(pair.upper, pair.lower, {
                amountPct,
                scaleTowardSeam: true,
                applyNow: true,
                pushHistory: true,
                silent: true,
                selectPair: true
            });

            if (!ok) {
                this.setStatus('Unable to create mouth compression pair.', true);
                return;
            }
            this.setStatus(mode === 'mouthOpen'
                ? 'Mouth open compression applied (60%).'
                : 'Mouth close pair rig applied (100%).');
        },

        _isSmartCutFaceCover(obj) {
            const tags = Array.isArray(obj?.tags) ? obj.tags : [];
            return !!obj && (
                obj._smartCutFacePatch ||
                tags.includes('smartcut-face-cover') ||
                tags.includes('universal-face-cover')
            );
        },

        _isSmartCutFaceBase(obj) {
            const tags = Array.isArray(obj?.tags) ? obj.tags : [];
            return !!obj && (
                obj._smartCutFaceBase ||
                tags.includes('smartcut-face-base') ||
                tags.includes('universal-face-base')
            );
        },

        _isSmartCutAnimatedFacePart(obj) {
            if (!obj || this._isSmartCutFaceCover(obj) || this._isSmartCutFaceBase(obj)) return false;
            if (typeof this.isSmartCutFacePart === 'function' && this.isSmartCutFacePart(obj)) return true;
            return obj.faceSet?.source === 'smart-cut' || obj.faceSet?.type === 'smartcut-face-part';
        },

        _getSelectedSmartCutFaceCompanions() {
            const allObjects = Array.isArray(this.objects?.objects) ? this.objects.objects : [];
            const selectedObjects = this._getSelectedObjectsSafe();
            const selectedIds = Array.isArray(this.objects?.selectedIds) ? this.objects.selectedIds : [];
            const groupIds = new Set();

            const addGroupId = (groupId) => {
                if (groupId) groupIds.add(groupId);
            };

            this._getSelectedFaceTargetGroupsStrict().forEach(parts => {
                parts.forEach(part => {
                    if (this._isSmartCutAnimatedFacePart(part)) addGroupId(part.groupId || part.faceSet?.groupId || part.id);
                });
            });

            selectedObjects.forEach(obj => {
                if (!obj) return;
                if (this._isSmartCutAnimatedFacePart(obj) || this._isSmartCutFaceCover(obj)) addGroupId(obj.groupId || obj.faceSet?.groupId);
                if (this._isSmartCutFaceBase(obj)) addGroupId(obj._smartCutFaceGroupId || obj.groupId);
            });

            selectedIds.forEach(id => {
                const obj = this.objects.getObjectById?.(id);
                if (!obj) return;
                if (this._isSmartCutAnimatedFacePart(obj) || this._isSmartCutFaceCover(obj)) addGroupId(obj.groupId || obj.faceSet?.groupId);
                if (this._isSmartCutFaceBase(obj)) addGroupId(obj._smartCutFaceGroupId || obj.groupId);
            });

            if (!groupIds.size) {
                selectedObjects.forEach(obj => {
                    if (!obj?.groupId) return;
                    const members = this._getGroupMembers(obj.groupId);
                    if (members.some(member => this._isSmartCutAnimatedFacePart(member))) addGroupId(obj.groupId);
                });
            }

            const groupMatch = (obj) => {
                if (!obj) return false;
                return groupIds.has(obj.groupId) || groupIds.has(obj.faceSet?.groupId) || groupIds.has(obj._smartCutFaceGroupId);
            };
            const parts = allObjects.filter(obj => groupMatch(obj) && this._isSmartCutAnimatedFacePart(obj));
            const covers = allObjects.filter(obj => groupMatch(obj) && this._isSmartCutFaceCover(obj));
            const baseObjects = allObjects.filter(obj => groupMatch(obj) && this._isSmartCutFaceBase(obj));
            return { groupIds: [...groupIds], parts, covers, baseObjects };
        },

        _getSmartCutCoverRole(cover) {
            if (!cover) return '';
            if (cover._smartCutFaceRole) return String(cover._smartCutFaceRole);
            if (cover.faceSet?.role) return String(cover.faceSet.role);
            const tags = Array.isArray(cover.tags) ? cover.tags : [];
            const roleTag = tags.find(tag => String(tag).startsWith('face-role:'));
            if (roleTag) return String(roleTag).slice('face-role:'.length);
            const partTag = tags.find(tag => String(tag).startsWith('face-cover:')) || tags.find(tag => String(tag).startsWith('face-part-key:'));
            const key = partTag ? String(partTag).slice(String(partTag).indexOf(':') + 1).toLowerCase() : '';
            const keyRoles = {
                lefteye: 'left-eye-sclera',
                righteye: 'right-eye-sclera',
                leftiris: 'left-iris',
                rightiris: 'right-iris',
                leftpupil: 'left-pupil',
                rightpupil: 'right-pupil',
                leftbrow: 'left-eyebrow',
                rightbrow: 'right-eyebrow',
                upperlip: 'upper-lip',
                lowerlip: 'lower-lip',
                mouthopening: 'mouth-opening',
                teeth: 'teeth'
            };
            return keyRoles[key] || key;
        },

        _filterSmartCutCoversByTarget(covers, target = 'all') {
            const list = Array.isArray(covers) ? covers : [];
            const selectedIds = new Set(Array.isArray(this.objects?.selectedIds) ? this.objects.selectedIds : []);
            const normalized = String(target || 'all');
            if (normalized === 'selected') {
                const selectedCovers = list.filter(cover => selectedIds.has(cover.id));
                return selectedCovers.length ? selectedCovers : list;
            }
            if (normalized === 'all') return list;
            return list.filter(cover => {
                const role = this._getSmartCutCoverRole(cover).toLowerCase();
                if (normalized === 'iris') return role.includes('iris') || role.includes('pupil');
                if (normalized === 'eye') return role.includes('eye-sclera') || role === 'lefteye' || role === 'righteye';
                if (normalized === 'brow') return role.includes('brow') || role.includes('eyebrow');
                if (normalized === 'mouth') return role.includes('lip') || role.includes('mouth') || role.includes('teeth');
                return true;
            });
        },

        _getSmartCutPanelTargetCovers() {
            const companions = this._getSelectedSmartCutFaceCompanions();
            const target = this.panel?.querySelector('#uf-smartcut-cover-target')?.value || 'all';
            return {
                companions,
                target,
                covers: this._filterSmartCutCoversByTarget(companions.covers, target)
            };
        },

        _selectSmartCutCoversByPanelTarget() {
            const { covers, target } = this._getSmartCutPanelTargetCovers();
            const ids = covers.map(cover => cover.id).filter(Boolean);
            if (!ids.length) {
                Utils.showToast('No cover layers matched that target.', 'info');
                return [];
            }
            covers.forEach(cover => {
                cover.visible = true;
                cover.locked = false;
            });
            this.objects.select?.(ids);
            if (!this.objects.select && Array.isArray(this.objects.selectedIds)) this.objects.selectedIds = ids;
            this.objects.updateProperties?.();
            this.stage?.requestRender?.();
            this._updateSmartCutLayerButtons();
            const label = target === 'all' ? 'cover' : `${target} cover`;
            Utils.showToast(`Selected ${ids.length} ${label} layer${ids.length === 1 ? '' : 's'}.`, 'success');
            return covers;
        },

        _readSmartCutCoverRefineOptions() {
            const edge = Math.max(1, Math.min(24, parseInt(this.panel?.querySelector('#uf-smartcut-cover-edge-px')?.value, 10) || 3));
            const softness = Math.max(0, Math.min(24, parseInt(this.panel?.querySelector('#uf-smartcut-cover-softness-px')?.value, 10) || 0));
            return { edge, softness };
        },

        async _loadSmartCutCoverCanvas(cover) {
            if (!cover?.imageSrc && !cover?.imageElement) return null;
            if (!cover._smartCutCoverOriginalSrc && cover.imageSrc) cover._smartCutCoverOriginalSrc = cover.imageSrc;
            const img = cover.imageSrc
                ? await this._loadSmartCutCoverImage(cover.imageSrc)
                : cover.imageElement;
            const width = Math.max(1, img.naturalWidth || img.width || Math.round(cover.width || 1));
            const height = Math.max(1, img.naturalHeight || img.height || Math.round(cover.height || 1));
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(img, 0, 0, width, height);
            return canvas;
        },

        _erodeSmartCutCoverCanvas(canvas, radius) {
            const width = canvas.width;
            const height = canvas.height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            const src = ctx.getImageData(0, 0, width, height);
            const out = new ImageData(new Uint8ClampedArray(src.data), width, height);
            const alpha = src.data;
            const r = Math.max(1, Math.round(radius));
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const idx = (y * width + x) * 4;
                    if (alpha[idx + 3] < 8) continue;
                    let nearTransparent = false;
                    for (let dy = -r; dy <= r && !nearTransparent; dy++) {
                        for (let dx = -r; dx <= r; dx++) {
                            if ((dx * dx + dy * dy) > r * r) continue;
                            const nx = x + dx;
                            const ny = y + dy;
                            if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
                                nearTransparent = true;
                                break;
                            }
                            if (alpha[(ny * width + nx) * 4 + 3] < 16) {
                                nearTransparent = true;
                                break;
                            }
                        }
                    }
                    if (nearTransparent) out.data[idx + 3] = 0;
                }
            }
            ctx.putImageData(out, 0, 0);
            return canvas;
        },

        _dilateSmartCutCoverCanvas(canvas, radius) {
            const width = canvas.width;
            const height = canvas.height;
            const src = document.createElement('canvas');
            src.width = width;
            src.height = height;
            src.getContext('2d').drawImage(canvas, 0, 0);
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.clearRect(0, 0, width, height);
            const r = Math.max(1, Math.round(radius));
            for (let dy = -r; dy <= r; dy++) {
                for (let dx = -r; dx <= r; dx++) {
                    if ((dx * dx + dy * dy) > r * r) continue;
                    ctx.drawImage(src, dx, dy);
                }
            }
            ctx.drawImage(src, 0, 0);
            return canvas;
        },

        _softenSmartCutCoverCanvas(canvas, radius) {
            const blur = Math.max(0, Math.round(radius));
            if (!blur) return canvas;
            const width = canvas.width;
            const height = canvas.height;
            const src = document.createElement('canvas');
            src.width = width;
            src.height = height;
            src.getContext('2d').drawImage(canvas, 0, 0);
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.clearRect(0, 0, width, height);
            ctx.filter = `blur(${blur}px)`;
            ctx.drawImage(src, 0, 0);
            ctx.filter = 'none';
            return canvas;
        },

        async _applySmartCutCoverCanvasEdit(cover, editType, options = {}) {
            const canvas = await this._loadSmartCutCoverCanvas(cover);
            if (!canvas) return false;
            if (editType === 'shrink') this._erodeSmartCutCoverCanvas(canvas, options.edge || 3);
            else if (editType === 'grow') this._dilateSmartCutCoverCanvas(canvas, options.edge || 3);
            if (editType === 'soften' || options.softness > 0) this._softenSmartCutCoverCanvas(canvas, editType === 'soften' ? (options.softness || options.edge || 2) : options.softness);
            const dataUrl = canvas.toDataURL('image/png');
            cover.imageSrc = dataUrl;
            cover.loadImage?.(dataUrl);
            cover.visible = true;
            cover.locked = false;
            cover._smartCutCoverEdited = true;
            cover._smartCutCoverLastEdit = editType;
            return true;
        },

        async _refineSmartCutCoversFromPanel(editType) {
            const { covers, target } = this._getSmartCutPanelTargetCovers();
            if (!covers.length) {
                Utils.showToast('No cover layers matched that target.', 'info');
                return;
            }
            const options = this._readSmartCutCoverRefineOptions();
            let changed = 0;
            for (const cover of covers) {
                try {
                    if (await this._applySmartCutCoverCanvasEdit(cover, editType, options)) changed += 1;
                } catch (error) {
                    console.warn('[UniversalFace] Failed to refine SmartCut cover', error);
                }
            }
            if (!changed) {
                Utils.showToast('Could not refine cover layers.', 'warning');
                return;
            }
            this.objects.updateProperties?.();
            this.stage?.requestRender?.();
            eventBus.emit?.('history:push');
            const action = editType === 'shrink' ? 'Shrank' : editType === 'grow' ? 'Grew' : 'Softened';
            const targetLabel = target === 'all' ? 'cover' : `${target} cover`;
            this.setStatus(`${action} ${changed} ${targetLabel} layer${changed === 1 ? '' : 's'}.`);
            Utils.showToast(`${action} ${changed} cover layer${changed === 1 ? '' : 's'}.`, 'success');
        },

        async _resetSmartCutCoversFromPanel() {
            const { covers } = this._getSmartCutPanelTargetCovers();
            if (!covers.length) {
                Utils.showToast('No cover layers matched that target.', 'info');
                return;
            }
            let changed = 0;
            for (const cover of covers) {
                const src = cover._smartCutCoverOriginalSrc;
                if (!src) continue;
                cover.imageSrc = src;
                cover.loadImage?.(src);
                cover.visible = true;
                cover.locked = false;
                cover._smartCutCoverEdited = false;
                cover._smartCutCoverFillMode = 'restore';
                changed += 1;
            }
            if (!changed) {
                Utils.showToast('No original cover source was available to restore.', 'info');
                return;
            }
            this.objects.updateProperties?.();
            this.stage?.requestRender?.();
            eventBus.emit?.('history:push');
            Utils.showToast(`Reset ${changed} cover layer${changed === 1 ? '' : 's'}.`, 'success');
        },

        _startSmartCutCoverEraserFromPanel() {
            const covers = this._selectSmartCutCoversByPanelTarget();
            if (!covers.length) return;
            const cover = covers[0];
            if (covers.length > 1) {
                this.objects.select?.([cover.id]);
                if (!this.objects.select && Array.isArray(this.objects.selectedIds)) this.objects.selectedIds = [cover.id];
                Utils.showToast('Erase works on one cover at a time. The first matching cover is selected.', 'info');
            }
            cover.visible = true;
            cover.locked = false;
            const edge = this._readSmartCutCoverRefineOptions().edge;
            const sizeEl = document.getElementById('eraser-brush-size');
            const sizeVal = document.getElementById('eraser-brush-size-val');
            if (sizeEl) sizeEl.value = String(Math.max(8, edge * 6));
            if (sizeVal) sizeVal.textContent = sizeEl?.value || String(Math.max(8, edge * 6));
            if (typeof this.objects.enterEraserMode === 'function') {
                this.objects.enterEraserMode();
                this.setStatus('Erase the selected cover spillover, then click Apply in Image Eraser controls.');
                return;
            }
            Utils.showToast('Image eraser is not available for cover editing.', 'warning');
        },

        _startSmartCutCoverRestoreBrushFromPanel() {
            const covers = this._selectSmartCutCoversByPanelTarget();
            if (!covers.length) return;
            const cover = covers[0];
            const restoreSrc = cover._smartCutCoverOriginalSrc || cover.imageSrc;
            if (!restoreSrc) {
                Utils.showToast('No original cover source is available for restore brush.', 'warning');
                return;
            }
            if (covers.length > 1) {
                this.objects.select?.([cover.id]);
                if (!this.objects.select && Array.isArray(this.objects.selectedIds)) this.objects.selectedIds = [cover.id];
                Utils.showToast('Restore brush works on one cover at a time. The first matching cover is selected.', 'info');
            }
            cover.visible = true;
            cover.locked = false;
            const edge = this._readSmartCutCoverRefineOptions().edge;
            const sizeEl = document.getElementById('eraser-brush-size');
            const sizeVal = document.getElementById('eraser-brush-size-val');
            if (sizeEl) sizeEl.value = String(Math.max(8, edge * 6));
            if (sizeVal) sizeVal.textContent = sizeEl?.value || String(Math.max(8, edge * 6));
            if (typeof this.objects.enterEraserMode === 'function') {
                this.objects.enterEraserMode({ mode: 'restore', restoreFromSrc: restoreSrc });
                this.setStatus('Paint cover back where too much was erased, then click Apply in Image Eraser controls.');
                return;
            }
            Utils.showToast('Image restore brush is not available for cover editing.', 'warning');
        },

        _sampleImageObjectBrightColor(obj, fallback = '#f8fafc') {
            const img = obj?.imageElement;
            if (!img) return fallback;
            const width = Math.max(1, img.naturalWidth || img.width || Math.round(obj.width || 1));
            const height = Math.max(1, img.naturalHeight || img.height || Math.round(obj.height || 1));
            const canvas = document.createElement('canvas');
            canvas.width = Math.min(width, 160);
            canvas.height = Math.min(height, 160);
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            let r = 0, g = 0, b = 0, weight = 0;
            let fallbackR = 0, fallbackG = 0, fallbackB = 0, fallbackWeight = 0;
            for (let i = 0; i < data.length; i += 4) {
                const alpha = data[i + 3];
                if (alpha < 24) continue;
                const pr = data[i];
                const pg = data[i + 1];
                const pb = data[i + 2];
                const max = Math.max(pr, pg, pb);
                const min = Math.min(pr, pg, pb);
                const luminance = 0.2126 * pr + 0.7152 * pg + 0.0722 * pb;
                const saturation = max ? (max - min) / max : 0;
                const alphaWeight = alpha / 255;
                fallbackR += pr * alphaWeight;
                fallbackG += pg * alphaWeight;
                fallbackB += pb * alphaWeight;
                fallbackWeight += alphaWeight;
                if (luminance < 128 || saturation > 0.42) continue;
                const brightWeight = alphaWeight * Math.max(0.2, (luminance - 112) / 143) * Math.max(0.25, 1 - saturation);
                r += pr * brightWeight;
                g += pg * brightWeight;
                b += pb * brightWeight;
                weight += brightWeight;
            }
            const source = weight > 0.8
                ? [r / weight, g / weight, b / weight]
                : (fallbackWeight > 0 ? [fallbackR / fallbackWeight, fallbackG / fallbackWeight, fallbackB / fallbackWeight] : null);
            if (!source) return fallback;
            return `#${source.map(value => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')).join('')}`;
        },

        async _applyScleraColorToSelectedSmartCutIrisCovers() {
            const companions = this._getSelectedSmartCutFaceCompanions();
            if (!companions.covers.length || !companions.parts.length) {
                Utils.showToast('Select a SmartCut face with iris/pupil covers first.', 'warning');
                return;
            }
            const byRole = new Map();
            companions.parts.forEach(part => {
                const role = String(part.faceSet?.role || part._smartCutFaceRole || '').toLowerCase();
                if (role) byRole.set(role, part);
            });
            const irisCovers = this._filterSmartCutCoversByTarget(companions.covers, 'iris');
            let changed = 0;
            for (const cover of irisCovers) {
                const role = this._getSmartCutCoverRole(cover).toLowerCase();
                const side = role.includes('right') ? 'right' : 'left';
                const sclera = byRole.get(`${side}-eye-sclera`) || byRole.get('eye-sclera') || companions.parts.find(part => String(part.faceSet?.role || part._smartCutFaceRole || '').includes('eye-sclera'));
                const color = this._sampleImageObjectBrightColor(sclera, '#f8fafc');
                const dataUrl = await this._renderSmartCutCoverFill(cover, { mode: 'solid', colorA: color, colorB: color });
                if (!dataUrl) continue;
                cover.imageSrc = dataUrl;
                cover.loadImage?.(dataUrl);
                cover.visible = true;
                cover.locked = false;
                cover._smartCutCoverFillMode = 'solid';
                cover._smartCutCoverFillA = color;
                cover._smartCutCoverFillB = color;
                cover._smartCutCoverPurpose = 'hide-original-eye-feature';
                changed += 1;
            }
            if (!changed) {
                Utils.showToast('No iris/pupil covers were updated.', 'info');
                return;
            }
            const colorInput = this.panel?.querySelector('#uf-smartcut-cover-color-a');
            const targetInput = this.panel?.querySelector('#uf-smartcut-cover-target');
            const modeInput = this.panel?.querySelector('#uf-smartcut-cover-mode');
            if (targetInput) targetInput.value = 'iris';
            if (modeInput) modeInput.value = 'solid';
            if (colorInput && irisCovers[0]?._smartCutCoverFillA) colorInput.value = irisCovers[0]._smartCutCoverFillA;
            this.objects.updateProperties?.();
            this.stage?.requestRender?.();
            this._updateSmartCutLayerButtons();
            this.setStatus(`Matched ${changed} iris/pupil cover${changed === 1 ? '' : 's'} to sclera color.`);
            Utils.showToast(`Iris/pupil cover${changed === 1 ? '' : 's'} matched to sclera.`, 'success');
        },

        _getSmartCutEyeFeatureCoversForParts(parts = []) {
            const groupIds = new Set((parts || [])
                .map(obj => obj?.groupId || obj?.faceSet?.groupId)
                .filter(Boolean));
            if (!groupIds.size || !Array.isArray(this.objects?.objects)) return [];
            return this.objects.objects.filter(obj => {
                if (!obj || !this._isSmartCutFaceCover(obj)) return false;
                if (!groupIds.has(obj.groupId || obj.faceSet?.groupId)) return false;
                const role = this._getSmartCutCoverRole(obj).toLowerCase();
                return role.includes('iris') || role.includes('pupil');
            });
        },

        async _repairSmartCutEyeFeatureCoversForSet(parts = []) {
            if (!Array.isArray(parts) || !parts.length) return 0;
            const covers = this._getSmartCutEyeFeatureCoversForParts(parts);
            if (!covers.length) return 0;
            const byRole = new Map();
            parts.forEach(part => {
                const role = String(part?.faceSet?.role || part?._smartCutFaceRole || '').toLowerCase();
                if (role) byRole.set(role, part);
            });
            let changed = 0;
            for (const cover of covers) {
                const role = this._getSmartCutCoverRole(cover).toLowerCase();
                const side = role.includes('right') ? 'right' : 'left';
                const sclera = byRole.get(`${side}-eye-sclera`)
                    || byRole.get('eye-sclera')
                    || parts.find(part => String(part?.faceSet?.role || part?._smartCutFaceRole || '').includes('eye-sclera'));
                const color = this._sampleImageObjectBrightColor(sclera, '#f8fafc');
                const dataUrl = await this._renderSmartCutCoverFill(cover, { mode: 'solid', colorA: color, colorB: color });
                if (!dataUrl) continue;
                cover.imageSrc = dataUrl;
                cover.loadImage?.(dataUrl);
                cover.visible = true;
                cover.locked = false;
                cover._smartCutCoverFillMode = 'solid';
                cover._smartCutCoverFillA = color;
                cover._smartCutCoverFillB = color;
                cover._smartCutCoverPurpose = 'hide-original-eye-feature';
                changed += 1;
            }
            if (changed) {
                this.objects.updateProperties?.();
                this.stage?.requestRender?.();
            }
            return changed;
        },

        _updateSmartCutLayerButtons() {
            const companions = this._getSelectedSmartCutFaceCompanions();
            const selectBtn = this.panel?.querySelector('#btn-uf-select-smartcut-parts');
            const editCoversBtn = this.panel?.querySelector('#btn-uf-edit-smartcut-covers');
            const coverBtn = this.panel?.querySelector('#btn-uf-toggle-smartcut-covers');
            const baseBtn = this.panel?.querySelector('#btn-uf-toggle-smartcut-base');
            const hasSmartCutFace = companions.parts.length > 0;
            if (selectBtn) selectBtn.disabled = !hasSmartCutFace;
            if (editCoversBtn) editCoversBtn.disabled = !companions.covers.length;
            if (coverBtn) {
                coverBtn.disabled = !companions.covers.length;
                const anyVisible = companions.covers.some(obj => obj.visible !== false);
                coverBtn.innerHTML = `<i class="fas fa-layer-group"></i> ${anyVisible ? 'Hide' : 'Show'} Covers`;
            }
            if (baseBtn) {
                baseBtn.disabled = !companions.baseObjects.length;
                const anyVisible = companions.baseObjects.some(obj => obj.visible !== false);
                baseBtn.innerHTML = `<i class="fas fa-image"></i> ${anyVisible ? 'Hide' : 'Show'} Base`;
            }
        },

        _selectSmartCutAnimatedPartsOnly() {
            const companions = this._getSelectedSmartCutFaceCompanions();
            const ids = companions.parts.map(obj => obj.id).filter(Boolean);
            if (!ids.length) {
                Utils.showToast('Select a SmartCut face first.', 'warning');
                return;
            }
            this.objects.select?.(ids);
            this.objects.updateProperties?.();
            this.stage?.requestRender?.();
            this._updateSmartCutLayerButtons();
            this.setStatus('SmartCut animated face parts selected. Base and cover layers remain untouched.');
            Utils.showToast('Selected animated face parts only.', 'success');
        },

        _selectSmartCutCoverLayersForEditing() {
            const companions = this._getSelectedSmartCutFaceCompanions();
            const ids = companions.covers.map(obj => obj.id).filter(Boolean);
            if (!ids.length) {
                Utils.showToast('No SmartCut cover layers found for this face.', 'info');
                return;
            }
            companions.covers.forEach(obj => {
                obj.locked = false;
                obj.visible = true;
            });
            this.objects.select?.(ids);
            this.objects.updateProperties?.();
            this.stage?.requestRender?.();
            this._updateSmartCutLayerButtons();
            this.setStatus('SmartCut cover layers unlocked and selected. Adjust them, then choose Parts Only to return to animation editing.');
            Utils.showToast('Cover layers unlocked for editing.', 'success');
        },

        _loadSmartCutCoverImage(src) {
            return new Promise((resolve, reject) => {
                if (!src) {
                    reject(new Error('Missing cover image source'));
                    return;
                }
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = src;
            });
        },

        async _renderSmartCutCoverFill(cover, options) {
            if (!cover) return null;
            const originalSrc = cover._smartCutCoverOriginalSrc || cover.imageSrc;
            if (!cover._smartCutCoverOriginalSrc && cover.imageSrc) cover._smartCutCoverOriginalSrc = cover.imageSrc;
            if (options.mode === 'restore') return originalSrc || cover.imageSrc || null;

            const maskImg = cover._smartCutCoverOriginalSrc
                ? await this._loadSmartCutCoverImage(cover._smartCutCoverOriginalSrc)
                : (cover.imageElement || await this._loadSmartCutCoverImage(cover.imageSrc));
            const width = Math.max(1, maskImg.naturalWidth || maskImg.width || Math.round(cover.width || 1));
            const height = Math.max(1, maskImg.naturalHeight || maskImg.height || Math.round(cover.height || 1));
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });

            if (options.mode === 'linear-gradient') {
                const grad = ctx.createLinearGradient(0, 0, width, height);
                grad.addColorStop(0, options.colorA || '#d8a88d');
                grad.addColorStop(1, options.colorB || options.colorA || '#f2c8a8');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, width, height);
            } else if (options.mode === 'radial-gradient') {
                const grad = ctx.createRadialGradient(width * 0.5, height * 0.42, 0, width * 0.5, height * 0.5, Math.max(width, height) * 0.62);
                grad.addColorStop(0, options.colorB || '#f2c8a8');
                grad.addColorStop(1, options.colorA || '#d8a88d');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, width, height);
            } else if (options.mode === 'picture') {
                const pictureSrc = options.pictureSrc;
                if (!pictureSrc) {
                    Utils.showToast('Choose a cover picture first.', 'warning');
                    return null;
                }
                const picture = await this._loadSmartCutCoverImage(pictureSrc);
                const pw = picture.naturalWidth || picture.width || 1;
                const ph = picture.naturalHeight || picture.height || 1;
                const scale = Math.max(width / pw, height / ph);
                const drawW = pw * scale;
                const drawH = ph * scale;
                ctx.drawImage(picture, (width - drawW) / 2, (height - drawH) / 2, drawW, drawH);
            } else {
                ctx.fillStyle = options.colorA || '#d8a88d';
                ctx.fillRect(0, 0, width, height);
            }

            ctx.globalCompositeOperation = 'destination-in';
            ctx.drawImage(maskImg, 0, 0, width, height);
            ctx.globalCompositeOperation = 'source-over';
            return canvas.toDataURL('image/png');
        },

        async _applySmartCutCoverStyleFromPanel() {
            const companions = this._getSelectedSmartCutFaceCompanions();
            if (!companions.covers.length) {
                Utils.showToast('Select a SmartCut face with cover layers first.', 'warning');
                return;
            }
            const mode = this.panel?.querySelector('#uf-smartcut-cover-mode')?.value || 'restore';
            const target = this.panel?.querySelector('#uf-smartcut-cover-target')?.value || 'all';
            const colorA = this.panel?.querySelector('#uf-smartcut-cover-color-a')?.value || '#d8a88d';
            const colorB = this.panel?.querySelector('#uf-smartcut-cover-color-b')?.value || '#f2c8a8';
            const options = { mode, colorA, colorB, pictureSrc: this._ufSmartCutCoverPictureSrc || null };
            let changed = 0;
            const targetCovers = this._filterSmartCutCoversByTarget(companions.covers, target);
            if (!targetCovers.length) {
                Utils.showToast('No cover layers matched that target.', 'info');
                return;
            }
            for (const cover of targetCovers) {
                try {
                    if (!cover._smartCutCoverOriginalSrc && cover.imageSrc) cover._smartCutCoverOriginalSrc = cover.imageSrc;
                    const dataUrl = await this._renderSmartCutCoverFill(cover, options);
                    if (!dataUrl) continue;
                    cover.imageSrc = dataUrl;
                    cover.loadImage?.(dataUrl);
                    cover.visible = true;
                    cover.locked = false;
                    cover._smartCutCoverFillMode = mode;
                    cover._smartCutCoverFillA = colorA;
                    cover._smartCutCoverFillB = colorB;
                    changed += 1;
                } catch (error) {
                    console.warn('[UniversalFace] Failed to style SmartCut cover', error);
                }
            }
            if (!changed) {
                Utils.showToast('Could not update SmartCut cover layers.', 'warning');
                return;
            }
            this.objects.updateProperties?.();
            this.stage?.requestRender?.();
            this._updateSmartCutLayerButtons();
            const label = mode === 'restore' ? 'original picture' : mode.replace('-', ' ');
            const targetLabel = target === 'all' ? 'SmartCut' : target;
            this.setStatus(`Applied ${label} to ${changed} ${targetLabel} cover layer${changed === 1 ? '' : 's'}.`);
            Utils.showToast(`Updated ${changed} SmartCut cover layer${changed === 1 ? '' : 's'}.`, 'success');
        },

        _toggleSelectedSmartCutCompanionVisibility(kind) {
            const companions = this._getSelectedSmartCutFaceCompanions();
            const list = kind === 'base' ? companions.baseObjects : companions.covers;
            if (!list.length) {
                Utils.showToast(`No SmartCut ${kind === 'base' ? 'base image' : 'cover layers'} found for this face.`, 'info');
                return;
            }
            const nextVisible = !list.some(obj => obj.visible !== false);
            list.forEach(obj => {
                obj.visible = nextVisible;
            });
            this.objects.updateProperties?.();
            this.stage?.requestRender?.();
            this._updateSmartCutLayerButtons();
            const label = kind === 'base' ? 'base image' : 'cover layers';
            this.setStatus(`SmartCut ${label} ${nextVisible ? 'shown' : 'hidden'}.`);
            Utils.showToast(`SmartCut ${label} ${nextVisible ? 'shown' : 'hidden'}.`, 'success');
        },

        _extractFaceSetKeyFromParts(parts) {
            const sets = getAvailableSets();
            for (const obj of (parts || [])) {
                const key = obj?.faceSet?.key;
                if (key && sets[key]) return key;
                const tag = Array.isArray(obj?.tags)
                    ? obj.tags.find(t => String(t).startsWith('face-set:'))
                    : null;
                const taggedKey = tag ? String(tag).slice('face-set:'.length) : null;
                if (taggedKey && sets[taggedKey]) return taggedKey;
            }
            return this.selectedSetKey || Object.keys(sets)[0] || null;
        },

        _extractViewModeFromParts(parts) {
            for (const obj of (parts || [])) {
                const tag = Array.isArray(obj?.tags)
                    ? obj.tags.find(t => String(t).startsWith('face-view:'))
                    : null;
                const mode = tag ? String(tag).slice('face-view:'.length) : null;
                if (mode === 'front' || mode === 'side') return mode;
            }
            return this._ufViewMode || 'front';
        },

        _extractMotionKeyFromParts(parts) {
            const motions = getAvailableMotions();
            for (const obj of (parts || [])) {
                const key = obj?._faceSetAppliedMotionKey;
                if (key && motions[key]) return key;
            }
            return this._panelMotionKey || 'neutral';
        },

        _extractStyleFromParts(parts) {
            const fromMeta = parts.find(obj => obj?.faceSet?.style)?.faceSet?.style || null;
            if (fromMeta) return fromMeta;

            const out = {};
            const getRole = (obj) => this.getFaceRole(obj) || '';
            const findPart = (matcher) => (parts || []).find(obj => matcher(getRole(obj), obj));
            const iris = findPart(role => role.includes('iris'));
            const pupil = findPart(role => role.includes('pupil'));
            const brow = findPart(role => role.includes('eyebrow'));
            const lip = findPart(role => role === 'upper-lip' || role === 'lower-lip');
            const lipDark = findPart(role => role === 'mouth-opening');
            const sclera = findPart(role => role.includes('eye-sclera'));
            const lid = findPart(role => role.includes('blink-lid'));

            if (iris?.fill) out.iris = iris.fill;
            if (pupil?.fill) out.pupil = pupil.fill;
            if (brow?.fill) out.brow = brow.fill;
            if (lip?.fill) out.lip = lip.fill;
            if (lipDark?.fill) out.lipDark = lipDark.fill;
            if (sclera?.fill) out.sclera = sclera.fill;
            if (sclera?.gradientStops?.[1]?.color) out.sclera2 = sclera.gradientStops[1].color;
            if (typeof sclera?.fillType === 'string') out.useScleraGradient = sclera.fillType !== 'solid';
            if (lid?.fill) out.lid = lid.fill;
            if (lid?.gradientStops?.[1]?.color) out.lid2 = lid.gradientStops[1].color;
            if (typeof lid?.fillType === 'string') out.useLidGradient = lid.fillType !== 'solid';
            return out;
        },

        _extractTimelineWindowFromParts(parts) {
            for (const obj of (parts || [])) {
                const anim = Array.isArray(obj?.animations)
                    ? obj.animations.find(a => a?.type === 'face-set-motion')
                    : null;
                if (!anim) continue;
                this._normalizeFaceMotionTiming(anim);
                const startSec = Math.max(0, Number(anim.delay || 0) / 1000);
                const durationSec = this._getFaceMotionTimelineDurationSec(anim);
                return { startSec, endSec: startSec + durationSec, durationSec };
            }
            return null;
        },

        _extractRepeatSettingsFromParts(parts) {
            for (const obj of (parts || [])) {
                const anim = Array.isArray(obj?.animations)
                    ? obj.animations.find(a => a?.type === 'face-set-motion')
                    : null;
                if (!anim) continue;
                const repeatRaw = String(anim.repeat ?? anim?.params?.repeat ?? '1');
                const repeat = ['1', '2', '3', '5', '10', '-1'].includes(repeatRaw) ? repeatRaw : '1';
                const repeatMode = String(anim.repeatMode ?? (anim?.params?.repeatMode || 'restart')) === 'cycle' ? 'cycle' : 'restart';
                const pause = Math.max(0, Number(anim._faceSetRepeatPauseSec) || 0);
                return { repeat, repeatMode, repeatPauseSec: pause };
            }
            return null;
        },

        _extractMotionIntensityFromParts(parts) {
            const found = (parts || []).find(obj => SIMPLE_INTENSITIES[obj?._faceSetMotionIntensity]);
            return found?._faceSetMotionIntensity || null;
        },

        _syncMotionSelectorFromKey(key) {
            const motions = getAvailableMotions();
            if (!key || !motions[key]) return;
            this._panelMotionKey = key;
            const category = motions[key]?.category || 'Core';
            const catSelect = this.panel?.querySelector('#uf-motion-category');
            if (catSelect) {
                const hasOption = Array.from(catSelect.options || []).some(opt => opt.value === category);
                catSelect.value = hasOption ? category : 'All';
            }
            this._populateMotionList();
            const motionSelect = this.panel?.querySelector('#uf-motion-select');
            if (motionSelect && Array.from(motionSelect.options || []).some(opt => opt.value === key)) {
                motionSelect.value = key;
            }
            this._updateMotionDescription(key);
        },

        _syncPanelFromSelectedFaceTarget() {
            const parts = this._getSelectedFaceTargetParts();
            this._updateSmartCutLayerButtons();
            if (!parts.length) return;

            const setKey = this._extractFaceSetKeyFromParts(parts);
            if (setKey) this.selectSet(setKey, { silent: true, fromLiveContext: true });

            const viewMode = this._extractViewModeFromParts(parts);
            this._ufViewMode = viewMode;
            const viewSelect = this.panel?.querySelector('#uf-view-select');
            if (viewSelect) viewSelect.value = viewMode;

            const style = parts.find(obj => obj?.faceSet?.style)?.faceSet?.style || null;
            const extractedStyle = style || this._extractStyleFromParts(parts);
            if (extractedStyle) this._syncStyleInputsFromStyle(extractedStyle);

            const motionKey = this._extractMotionKeyFromParts(parts);
            this._syncMotionSelectorFromKey(motionKey);
            const intensity = this._extractMotionIntensityFromParts(parts);
            if (intensity) {
                this._ufMotionIntensity = intensity;
                this._syncMotionIntensityInput();
                this._syncExpressionPreview();
            }

            const windowInfo = this._extractTimelineWindowFromParts(parts);
            if (windowInfo) {
                this._panelStartSec = windowInfo.startSec;
                this._panelEndSec = windowInfo.endSec;
                this._panelDurationSec = windowInfo.durationSec;
                this._syncTimelineWindowInputs();
            }

            const repeatInfo = this._extractRepeatSettingsFromParts(parts);
            if (repeatInfo) {
                this._panelRepeat = repeatInfo.repeat;
                this._panelRepeatMode = repeatInfo.repeatMode;
                this._panelRepeatPauseSec = repeatInfo.repeatPauseSec;
                this._syncMotionRepeatInputs();
            }
            this._updateSmartCutLayerButtons();
        },

        updateAttachContextUI() {
            const note = this.panel?.querySelector('#face-rig-attach-note');
            this._updateSmartCutLayerButtons();
            if (!note) return;
            const context = this._getAttachContext();
            const placement = this._ufSelectedPlacement || 'selected';
            const action = this._ufPlacementAction || 'group';
            if (placement === 'stage') {
                note.textContent = `Placement: stage (${this._ufViewMode} view). Face remains standalone and fully editable.`;
                return;
            }
            if (context.hostObjects.length) {
                const modeText = action === 'group' ? 'grouped with selected' : (action === 'link' ? 'linked to selected' : 'kept separate');
                note.textContent = `Target: ${context.label}. Face will be ${modeText} (${this._ufViewMode} view).`;
            } else {
                note.textContent = 'No selected object/group. Choose "Place On Stage" or select an object first.';
            }
        },

        _getSelectedObjectsSafe() {
            return typeof this.objects?.getSelectedObjects === 'function'
                ? this.objects.getSelectedObjects().filter(Boolean)
                : [];
        },

        _getObjectsBounds(objects) {
            const bounds = (objects || []).map(obj => obj?.getBounds?.()).filter(Boolean);
            if (!bounds.length) return null;
            const minX = Math.min(...bounds.map(item => item.x));
            const minY = Math.min(...bounds.map(item => item.y));
            const maxX = Math.max(...bounds.map(item => item.right));
            const maxY = Math.max(...bounds.map(item => item.bottom));
            return {
                x: minX,
                y: minY,
                right: maxX,
                bottom: maxY,
                width: maxX - minX,
                height: maxY - minY,
                centerX: (minX + maxX) / 2,
                centerY: (minY + maxY) / 2
            };
        },

        _getGroupMembers(groupId) {
            const ids = Array.isArray(this.objects?.groups?.[groupId]) ? this.objects.groups[groupId] : [];
            return ids.map(id => this.objects.getObjectById?.(id)).filter(Boolean);
        },

        _groupContainsFaceSet(groupId) {
            return this._getGroupMembers(groupId).some(obj => this.isFaceSetObject(obj));
        },

        _getFaceSetGroupIdForObject(obj) {
            if (!obj) return null;
            if (this.isFaceSetObject(obj)) return obj.groupId || obj.id;
            if (obj.groupId && this._groupContainsFaceSet(obj.groupId)) return obj.groupId;
            return null;
        },

        _getAttachContext() {
            const selected = this._getSelectedObjectsSafe();
            if (!selected.length) {
                return {
                    groupId: null,
                    hostObjects: [],
                    bounds: null,
                    label: 'no selection'
                };
            }
            const sharedGroupIds = [...new Set(selected.map(obj => obj.groupId).filter(Boolean))];
            let hostObjects = selected;
            if (sharedGroupIds.length === 1) {
                const grouped = this._getGroupMembers(sharedGroupIds[0]);
                if (grouped.length) hostObjects = grouped;
            }
            return {
                groupId: sharedGroupIds.length === 1 ? sharedGroupIds[0] : null,
                hostObjects,
                bounds: this._getObjectsBounds(hostObjects),
                label: hostObjects.length === 1 ? (hostObjects[0].name || 'selected object') : `${hostObjects.length} selected objects`
            };
        },

        _applyPartFill(obj, primary, secondary, useGradient) {
            if (!obj) return;
            if (useGradient && secondary) {
                obj.fillType = 'linear-gradient';
                obj.gradientStops = [
                    { offset: 0, color: primary },
                    { offset: 1, color: secondary }
                ];
                obj.gradientAngle = 90;
                obj.fill = primary;
                return;
            }
            obj.fillType = 'solid';
            obj.fill = primary;
        },

        _applyStyleOverrides(parts, style) {
            (parts || []).forEach(obj => {
                const role = this.getFaceRole(obj) || '';
                if (role.includes('iris')) this._applyPartFill(obj, style.iris, null, false);
                if (role.includes('pupil')) this._applyPartFill(obj, style.pupil, null, false);
                if (role.includes('eye-sclera')) this._applyPartFill(obj, style.sclera, style.sclera2, style.useScleraGradient);
                if (role.includes('eyebrow')) this._applyPartFill(obj, style.brow, null, false);
                if (role === 'upper-lip' || role === 'lower-lip') this._applyPartFill(obj, style.lip, null, false);
                if (role === 'mouth-opening') this._applyPartFill(obj, style.lipDark, null, false);
                if (role.includes('blink-lid')) this._applyPartFill(obj, style.lid, style.lid2, style.useLidGradient);
                if (role === 'profile-outline' || role === 'profile-nose') {
                    obj.stroke = style.lid2 || style.brow || obj.stroke;
                    obj.fill = 'transparent';
                    obj.fillType = 'solid';
                }
                obj.faceSet = { ...(obj.faceSet || {}), style: { ...style } };
            });
        },

        _makeProfilePoint(cx, cy, w, h, x, y) {
            return { x: cx + (x * w), y: cy + (y * h) };
        },

        _ensureSideProfileParts(parts) {
            if (!Array.isArray(parts) || !parts.length || typeof StageObject === 'undefined') return parts || [];
            const bounds = this._getObjectsBounds(parts);
            if (!bounds) return parts;
            const groupId = parts[0]?.groupId || parts[0]?.id || Utils.generateId('faceSet');
            const setKey = this._extractFaceSetKeyFromParts(parts) || this.selectedSetKey || 'classic';
            const setName = getAvailableSets()[setKey]?.name || 'Universal Face';
            const style = parts.find(obj => obj?.faceSet?.style)?.faceSet?.style || this._readStyleOverrides();
            const existingRoles = new Set(parts.map(obj => this.getFaceRole(obj)).filter(Boolean));
            const cx = bounds.centerX;
            const cy = bounds.centerY;
            const w = Math.max(96, bounds.width);
            const h = Math.max(80, bounds.height);
            const mk = (role, props) => {
                if (existingRoles.has(role)) return null;
                const obj = new StageObject(props.type || 'freeform', {
                    ...props,
                    groupId,
                    tags: ['face-set', `face-set:${setKey}`, `face-part:${role}`, 'face-view:side'],
                    name: props.name || `${setName} ${role}`
                });
                obj.faceSet = { key: setKey, name: setName, role, viewMode: 'side', style: { ...style } };
                obj._ufProfilePart = true;
                parts.push(obj);
                this.objects?.objects?.push?.(obj);
                existingRoles.add(role);
                return obj;
            };
            const outlineStroke = style.lid2 || style.brow || '#c28d72';
            const lineWidth = Math.max(2, Math.round(w * 0.012));
            mk('profile-outline', {
                type: 'freeform',
                x: cx - w * 0.06,
                y: cy - h * 0.54,
                width: w * 0.64,
                height: h * 1.08,
                fill: 'transparent',
                stroke: outlineStroke,
                strokeWidth: lineWidth,
                closedPath: false,
                pathPoints: [
                    this._makeProfilePoint(cx, cy, w, h, -0.05, -0.48),
                    this._makeProfilePoint(cx, cy, w, h, 0.16, -0.4),
                    this._makeProfilePoint(cx, cy, w, h, 0.25, -0.24),
                    this._makeProfilePoint(cx, cy, w, h, 0.38, -0.11),
                    this._makeProfilePoint(cx, cy, w, h, 0.25, 0.02),
                    this._makeProfilePoint(cx, cy, w, h, 0.34, 0.16),
                    this._makeProfilePoint(cx, cy, w, h, 0.18, 0.35),
                    this._makeProfilePoint(cx, cy, w, h, -0.05, 0.45)
                ]
            });
            mk('profile-nose', {
                type: 'freeform',
                x: cx + w * 0.1,
                y: cy - h * 0.17,
                width: w * 0.28,
                height: h * 0.26,
                fill: 'transparent',
                stroke: outlineStroke,
                strokeWidth: Math.max(1, lineWidth - 1),
                closedPath: false,
                pathPoints: [
                    this._makeProfilePoint(cx, cy, w, h, 0.1, -0.18),
                    this._makeProfilePoint(cx, cy, w, h, 0.29, -0.07),
                    this._makeProfilePoint(cx, cy, w, h, 0.14, 0.04)
                ]
            });
            return parts;
        },

        _applySideMouthGeometry(roleMap, centerX, centerY, scale = 1) {
            const opening = roleMap['mouth-opening'];
            const upper = roleMap['upper-lip'];
            const lower = roleMap['lower-lip'];
            const teeth = roleMap.teeth;
            const mouthW = 72 * scale;
            const mouthH = 42 * scale;
            const mouthX = centerX + mouthW * 0.16;
            const mouthY = centerY + mouthH * 0.46;
            const pt = (x, y) => ({ x: mouthX + x * mouthW, y: mouthY + y * mouthH });
            if (opening) {
                Object.assign(opening, {
                    x: mouthX - mouthW * 0.04,
                    y: mouthY - mouthH * 0.12,
                    width: mouthW * 0.42,
                    height: mouthH * 0.34,
                    scaleX: 1,
                    scaleY: 0.45,
                    pivotY: 0.45,
                    pathPoints: [pt(-0.04, -0.1), pt(0.24, -0.02), pt(0.34, 0.1), pt(0.2, 0.22), pt(-0.02, 0.16)],
                    closedPath: true
                });
            }
            if (upper) {
                Object.assign(upper, {
                    x: mouthX - mouthW * 0.08,
                    y: mouthY - mouthH * 0.24,
                    width: mouthW * 0.56,
                    height: mouthH * 0.28,
                    scaleX: 1,
                    scaleY: 1,
                    pivotY: 0.82,
                    pathPoints: [pt(-0.08, -0.16), pt(0.12, -0.27), pt(0.36, -0.1), pt(0.15, 0.02), pt(-0.06, -0.03)],
                    closedPath: true
                });
            }
            if (lower) {
                Object.assign(lower, {
                    x: mouthX - mouthW * 0.04,
                    y: mouthY + mouthH * 0.02,
                    width: mouthW * 0.48,
                    height: mouthH * 0.3,
                    scaleX: 1,
                    scaleY: 1,
                    pivotY: 0.1,
                    pathPoints: [pt(-0.04, 0.04), pt(0.18, 0.18), pt(0.38, 0.1), pt(0.18, 0.28), pt(-0.02, 0.2)],
                    closedPath: true
                });
            }
            if (teeth) {
                Object.assign(teeth, {
                    x: mouthX + mouthW * 0.02,
                    y: mouthY - mouthH * 0.04,
                    width: mouthW * 0.22,
                    height: mouthH * 0.08,
                    scaleX: 1,
                    scaleY: 1,
                    borderRadius: Math.max(3, mouthH * 0.04)
                });
            }
        },

        editSelectedFaceTarget() {
            const targets = this._getSelectedFaceTargetGroupsStrict();
            if (!targets.length) {
                Utils.showToast('Select an existing face target first.', 'warning');
                return;
            }
            this.active = true;
            this.showPanel(true);
            this._focusUniversalFaceSection('build');
            this._syncPanelFromSelectedFaceTarget();
            this._syncPlacementUI();
            this._syncTimelineWindowInputs();
            this._ufLiveContextSync = true;
            this._updateLiveContextBadge();
            this.setStatus('Edit mode: selected face target loaded. Change properties, then click Apply Style To Selected.');
        },

        applyStyleToSelectedFaceTarget() {
            const targets = this._getSelectedFaceTargetGroupsStrict();
            if (!targets.length) {
                Utils.showToast('Select an existing face target first.', 'warning');
                return;
            }
            const style = this._readStyleOverrides();
            targets.forEach(parts => this._applyStyleOverrides(parts, style));
            this.objects?.updateProperties?.();
            this.objects?.updateObjectList?.();
            this.stage?.requestRender?.();
            eventBus.emit('history:push');
            this.setStatus('Applied style to selected face target.');
            Utils.showToast('Face style updated.', 'success');
        },

        _applyViewPreset(parts, viewMode) {
            const preset = VIEW_PRESETS[viewMode] || VIEW_PRESETS.front;
            const roleMap = {};
            (parts || []).forEach(obj => {
                const role = this.getFaceRole(obj) || '';
                if (role) roleMap[role] = obj;
                if (!obj._ufViewBase) {
                    obj._ufViewBase = {
                        x: Number(obj.x) || 0,
                        y: Number(obj.y) || 0,
                        width: Number(obj.width) || 0,
                        height: Number(obj.height) || 0,
                        rotation: Number(obj.rotation) || 0,
                        scaleX: Number(obj.scaleX) || 1,
                        scaleY: Number(obj.scaleY) || 1,
                        opacity: Number(obj.opacity ?? 1),
                        visible: obj.visible !== false
                    };
                }
            });

            const setViewTag = (obj, mode) => {
                obj.faceSet = { ...(obj.faceSet || {}), viewMode: mode };
                if (!Array.isArray(obj.tags)) obj.tags = [];
                obj.tags = obj.tags.filter(tag => !String(tag).startsWith('face-view:'));
                obj.tags.push(`face-view:${mode}`);
            };

            if (viewMode === 'front') {
                (parts || []).forEach(obj => {
                    const role = this.getFaceRole(obj) || '';
                    const base = obj._ufViewBase;
                    if (base) {
                        obj.x = base.x;
                        obj.y = base.y;
                        obj.width = base.width;
                        obj.height = base.height;
                        obj.rotation = base.rotation;
                        obj.scaleX = base.scaleX;
                        obj.scaleY = base.scaleY;
                        obj.opacity = base.opacity;
                        obj.visible = base.visible;
                    }
                    if (role === 'profile-outline' || role === 'profile-nose') {
                        obj.visible = false;
                        obj.opacity = 0;
                    }
                    setViewTag(obj, 'front');
                });
                return;
            }

            if (viewMode === 'side') {
                this._ensureSideProfileParts(parts);
                parts.forEach(obj => {
                    const role = this.getFaceRole(obj) || '';
                    if (role) roleMap[role] = obj;
                });
                const bounds = this._getObjectsBounds(parts || []);
                const centerX = Number.isFinite(bounds?.centerX) ? bounds.centerX : null;
                if (!Number.isFinite(centerX)) return;
                const centerY = Number.isFinite(bounds?.centerY) ? bounds.centerY : 0;
                const scale = Math.max(0.6, Math.min(2.4, (bounds.width || 180) / 330));
                const setPart = (role, patchFactory) => {
                    const obj = roleMap[role];
                    if (!obj) return;
                    const base = obj._ufViewBase || obj;
                    Object.assign(obj, patchFactory(base, obj));
                };

                (parts || []).forEach(obj => {
                    const role = this.getFaceRole(obj) || '';
                    const base = obj._ufViewBase || obj;
                    obj.visible = true;
                    obj.opacity = base.opacity ?? 1;
                    setViewTag(obj, 'side');
                    if (SIDE_VIEW_FAR_ROLES.has(role)) {
                        obj.visible = false;
                        obj.opacity = 0;
                    }
                });

                setPart('left-eye-sclera', base => ({
                    x: centerX - base.width * 0.1,
                    y: centerY - base.height * 1.02,
                    width: base.width * 0.54,
                    height: base.height * 0.82,
                    scaleX: 1,
                    rotation: -2
                }));
                ['left-iris', 'left-pupil', 'left-eye-shine'].forEach(role => {
                    setPart(role, base => ({
                        x: centerX + base.width * 0.04,
                        y: centerY - base.height * 0.96,
                        scaleX: 0.88,
                        scaleY: 0.9
                    }));
                });
                setPart('left-blink-lid', base => ({
                    x: centerX - base.width * 0.1,
                    y: centerY - base.height * 1.02,
                    width: base.width * 0.54,
                    height: base.height * 0.82,
                    scaleX: 1,
                    rotation: -2
                }));
                setPart('left-eyebrow', base => ({
                    x: centerX - base.width * 0.13,
                    y: centerY - base.height * 2.28,
                    width: base.width * 0.62,
                    rotation: -Math.abs(base.rotation || preset.browSkew || 8) - 3
                }));
                this._applySideMouthGeometry(roleMap, centerX, centerY, scale);
                return;
            }

            (parts || []).forEach(obj => {
                const role = this.getFaceRole(obj) || '';
                if (role.includes('right-') && preset.hideFarEye && (role.includes('eye-sclera') || role.includes('iris') || role.includes('pupil') || role.includes('eye-shine'))) {
                    obj.opacity = 0.55;
                    obj.scaleX = (obj.scaleX || 1) * 0.8;
                    return;
                }
                if (role.includes('eye-sclera') || role.includes('iris') || role.includes('pupil') || role.includes('eye-shine') || role.includes('blink-lid')) {
                    obj.scaleX = (obj.scaleX || 1) * preset.eyeScaleX;
                }
                if (role.includes('eyebrow')) {
                    obj.rotation = Number(obj.rotation || 0) + (role.includes('left-') ? preset.browSkew : -preset.browSkew * 0.6);
                }
                setViewTag(obj, viewMode);
            });
        },

        _removeSideViewFarParts(parts) {
            if (!Array.isArray(parts) || !parts.length || !Array.isArray(this.objects?.objects)) return parts || [];
            const removeIds = new Set(
                parts
                    .filter(obj => SIDE_VIEW_FAR_ROLES.has(this.getFaceRole(obj)))
                    .map(obj => obj.id)
            );
            if (!removeIds.size) return parts;

            this.objects.objects = this.objects.objects.filter(obj => !removeIds.has(obj.id));
            this.objects.selectedIds = (this.objects.selectedIds || []).filter(id => !removeIds.has(id));
            Object.keys(this.objects.groups || {}).forEach(groupId => {
                const ids = this.objects.groups[groupId];
                if (!Array.isArray(ids)) return;
                this.objects.groups[groupId] = ids.filter(id => !removeIds.has(id));
            });
            const kept = parts.filter(obj => !removeIds.has(obj.id));
            const groupId = kept[0]?.groupId;
            if (groupId && Array.isArray(this.objects.groups?.[groupId])) {
                const keepIds = new Set(kept.map(obj => obj.id));
                this.objects.groups[groupId] = this.objects.groups[groupId].filter(id => keepIds.has(id));
                kept.forEach(obj => {
                    if (!this.objects.groups[groupId].includes(obj.id)) this.objects.groups[groupId].push(obj.id);
                });
            }
            return kept;
        },

        _applyTemplateGeometry(parts, template) {
            if (!Array.isArray(parts) || !parts.length || !template?.geometry?.length) return;
            const bounds = this._getObjectsBounds(parts);
            if (!bounds || !bounds.width || !bounds.height) return;
            const roleMap = {};
            parts.forEach(obj => {
                const role = this.getFaceRole(obj);
                if (role) roleMap[role] = obj;
            });
            template.geometry.forEach(item => {
                const obj = roleMap[item.role];
                if (!obj) return;
                obj.x = bounds.centerX + (Number(item.x) || 0) * bounds.width;
                obj.y = bounds.centerY + (Number(item.y) || 0) * bounds.height;
                obj.width = Math.max(1, (Number(item.width) || 0.1) * bounds.width);
                obj.height = Math.max(1, (Number(item.height) || 0.1) * bounds.height);
                obj.rotation = Number(item.rotation) || 0;
                obj.scaleX = Number.isFinite(Number(item.scaleX)) ? Number(item.scaleX) : 1;
                obj.scaleY = Number.isFinite(Number(item.scaleY)) ? Number(item.scaleY) : 1;
                obj.opacity = Number.isFinite(Number(item.opacity)) ? Number(item.opacity) : 1;
                obj.visible = item.visible !== false;
            });
        },

        _getSelectedTemplatePreset() {
            const value = this.panel?.querySelector('#uf-template-preset')?.value || 'none';
            if (!String(value).startsWith('user:')) return null;
            const id = String(value).slice('user:'.length);
            return this._loadUserTemplates().find(item => item.id === id) || null;
        },

        _convertSelectedFaceView(viewMode) {
            const targets = this._getSelectedFaceTargetGroupsStrict();
            if (!targets.length) {
                Utils.showToast('Select a face set first.', 'warning');
                return;
            }
            targets.forEach(parts => {
                this._applyViewPreset(parts, viewMode);
                if (viewMode === 'side') this._removeSideViewFarParts(parts);
            });
            this._ufViewMode = viewMode;
            const viewSelect = this.panel?.querySelector('#uf-view-select');
            if (viewSelect) viewSelect.value = viewMode;
            this.objects.updateObjectList?.();
            this.objects.updateProperties?.();
            this.stage?.requestRender?.();
            eventBus.emit('history:push');
            this.setStatus(`Converted selected face set${targets.length === 1 ? '' : 's'} to ${viewMode} view.`);
            Utils.showToast(`Converted face to ${viewMode} view.`, 'success');
        },

        _resetSelectedFaceLayout() {
            const targets = this._getSelectedFaceTargetGroupsStrict();
            if (!targets.length) {
                Utils.showToast('Select a face set first.', 'warning');
                return;
            }
            targets.forEach(parts => this._applyViewPreset(parts, 'front'));
            this.objects.updateObjectList?.();
            this.objects.updateProperties?.();
            this.stage?.requestRender?.();
            eventBus.emit('history:push');
            this.setStatus('Reset selected face layout to front view.');
            Utils.showToast('Face layout reset.', 'success');
        },

        _removeSelectedFaceTargets() {
            const targets = this._getSelectedFaceTargetGroupsStrict();
            if (!targets.length) {
                Utils.showToast('Select a face set first.', 'warning');
                return;
            }
            if (!window.confirm(`Remove ${targets.length} selected face set${targets.length === 1 ? '' : 's'} from the stage?`)) {
                return;
            }
            const ids = new Set();
            targets.forEach(parts => (parts || []).forEach(part => ids.add(part.id)));
            ids.forEach(id => this.objects.removeObject?.(id));
            this.objects.updateObjectList?.();
            this.objects.updateProperties?.();
            this.stage?.requestRender?.();
            eventBus.emit('history:push');
            this.setStatus(`Removed ${targets.length} face set${targets.length === 1 ? '' : 's'}.`);
            Utils.showToast('Face set removed.', 'success');
        },

        _attachByLink(parts, hostObjects) {
            const host = (hostObjects || [])[0];
            if (!host) return;
            const pivotX = (host.x || 0) + (host.width || 0) * (Number.isFinite(host.pivotX) ? host.pivotX : 0.5);
            const pivotY = (host.y || 0) + (host.height || 0) * (Number.isFinite(host.pivotY) ? host.pivotY : 0.5);
            (parts || []).forEach(part => {
                const partPivotX = (part.x || 0) + (part.width || 0) * (Number.isFinite(part.pivotX) ? part.pivotX : 0.5);
                const partPivotY = (part.y || 0) + (part.height || 0) * (Number.isFinite(part.pivotY) ? part.pivotY : 0.5);
                part.pinnedTo = host.id;
                part.pinOffsetX = partPivotX - pivotX;
                part.pinOffsetY = partPivotY - pivotY;
            });
        },

        _clearLink(parts) {
            (parts || []).forEach(part => {
                delete part.pinnedTo;
                delete part.pinOffsetX;
                delete part.pinOffsetY;
            });
        },

        _detachObjectsFromExistingGroups(objects, nextGroupId) {
            (objects || []).forEach(obj => {
                const groupId = obj?.groupId;
                if (!groupId || groupId === nextGroupId || !Array.isArray(this.objects?.groups?.[groupId])) return;
                this.objects.groups[groupId] = this.objects.groups[groupId].filter(id => id !== obj.id);
                if (!this.objects.groups[groupId].length) {
                    delete this.objects.groups[groupId];
                    delete this.objects.groupNames[groupId];
                }
            });
        },

        insertSelectedSet(options = {}) {
            const placement = options.placement || this._ufSelectedPlacement || 'selected';
            const action = this._ufPlacementAction || 'group';
            const context = this._getAttachContext();
            const size = Number(this.panel?.querySelector('#face-rig-set-size')?.value) || 110;
            const style = this._readStyleOverrides();
            const view = this._ufViewMode || 'front';
            const selectedTemplate = this._getSelectedTemplatePreset();
            const applyTemplateLayout = this.panel?.querySelector('#uf-template-apply-layout')?.checked !== false;

            if (placement === 'selected' && !context.hostObjects.length) {
                Utils.showToast('Select an object/group first or use Place On Stage.', 'warning');
                return;
            }

            if (placement === 'selected' && this._ufReplaceExisting) {
                this._removeExistingFaceTargetsFromSelection();
            }

            const centerX = placement === 'selected' && Number.isFinite(context.bounds?.centerX)
                ? context.bounds.centerX
                : (this.stage?.width || 1280) / 2;
            const centerY = placement === 'selected' && Number.isFinite(context.bounds?.centerY)
                ? (context.bounds.y + Math.max(42, context.bounds.height * 0.42))
                : (this.stage?.height || 720) / 2;

            let created = baseInsertFacialSet.call(this, this.selectedSetKey, {
                scale: size / 100,
                x: centerX,
                y: centerY
            });
            if (!created?.length) return;

            this._applyStyleOverrides(created, style);
            this._applyViewPreset(created, view);
            if (selectedTemplate && applyTemplateLayout) {
                this._applyTemplateGeometry(created, selectedTemplate);
                this._applyViewPreset(created, selectedTemplate.viewMode || view);
            }
            const effectiveView = (selectedTemplate && applyTemplateLayout && selectedTemplate.viewMode) ? selectedTemplate.viewMode : view;
            if (effectiveView === 'side') {
                created = this._removeSideViewFarParts(created);
            }

            const newGroupId = created[0].groupId || created[0].id;
            if (placement === 'selected') {
                if (action === 'group') {
                    this._detachObjectsFromExistingGroups(context.hostObjects, newGroupId);
                    this.registerGroup(newGroupId, getAvailableSets()[this.selectedSetKey]?.name || this.selectedSetKey, created, context.hostObjects);
                    this.selectParts(created, context.hostObjects);
                    this._clearLink(created);
                } else if (action === 'link') {
                    this.selectParts(created, context.hostObjects);
                    this._attachByLink(created, context.hostObjects);
                } else {
                    this.selectParts(created);
                    this._clearLink(created);
                }
            } else {
                this.selectParts(created);
                this._clearLink(created);
            }

            this.objects.updateObjectList?.();
            this.objects.updateProperties?.();
            this.stage?.requestRender?.();
            eventBus.emit('timeline:update');
            eventBus.emit('history:push');

            const targetText = placement === 'selected'
                ? `${action === 'group' ? 'grouped with' : (action === 'link' ? 'linked to' : 'placed near')} ${context.label}`
                : 'placed on stage';
            this.setStatus(`Universal face ${targetText} (${view} view).`);
            Utils.showToast(`Universal face ${targetText}.`, 'success');
            this.updateAttachContextUI();
            this.updatePropertiesPanelVisibility();
        },

        _removeExistingFaceTargetsFromSelection() {
            const targets = this._getSelectedFaceTargetGroupsStrict();
            if (!targets.length) return;
            const ids = new Set();
            targets.forEach(parts => (parts || []).forEach(part => ids.add(part.id)));
            ids.forEach(id => this.objects?.removeObject?.(id));

            Object.keys(this.objects?.groups || {}).forEach(groupId => {
                const members = Array.isArray(this.objects.groups[groupId]) ? this.objects.groups[groupId] : [];
                const kept = members.filter(id => !ids.has(id));
                if (!kept.length) {
                    delete this.objects.groups[groupId];
                    delete this.objects.groupNames[groupId];
                } else {
                    this.objects.groups[groupId] = kept;
                }
            });

            this.objects?.updateObjectList?.();
            this.objects?.updateProperties?.();
            this.stage?.requestRender?.();
            eventBus.emit('timeline:update');
        },

        unlinkFaceFromSelection() {
            const targets = this._getSelectedFaceTargetGroupsStrict();
            if (!targets.length) {
                Utils.showToast('Select an attached face or host object first.', 'warning');
                return;
            }
            let count = 0;
            let detachedGroups = 0;
            targets.forEach(parts => {
                this._clearLink(parts);
                const groupId = parts[0]?.groupId;
                if (groupId) {
                    const members = this._getGroupMembers(groupId);
                    const faceMembers = members.filter(obj => this.isFaceSetObject(obj));
                    const hostMembers = members.filter(obj => !this.isFaceSetObject(obj));
                    if (faceMembers.length && hostMembers.length) {
                        const newFaceGroupId = Utils.generateId('group');
                        this.objects.groups[newFaceGroupId] = faceMembers.map(item => item.id);
                        this.objects.groupNames[newFaceGroupId] = (this.objects.groupNames[groupId] || 'Universal Face') + ' Face';
                        faceMembers.forEach(item => { item.groupId = newFaceGroupId; });

                        if (hostMembers.length > 1) {
                            this.objects.groups[groupId] = hostMembers.map(item => item.id);
                            hostMembers.forEach(item => { item.groupId = groupId; });
                        } else {
                            hostMembers.forEach(item => { delete item.groupId; });
                            delete this.objects.groups[groupId];
                            delete this.objects.groupNames[groupId];
                        }
                        detachedGroups += 1;
                    }
                }
                count += parts.length;
            });
            this.objects.updateObjectList?.();
            this.objects.updateProperties?.();
            this.stage?.requestRender?.();
            eventBus.emit('history:push');
            this.setStatus(`Unlinked ${count} face part(s) across ${detachedGroups || targets.length} face target(s).`);
            Utils.showToast('Face unlinked from host object while keeping face parts grouped.', 'success');
        },

        ungroupFaceFromSelection() {
            const targets = this.getFaceSetTargets('selected');
            if (!targets.length) {
                Utils.showToast('Select a face target group first.', 'warning');
                return;
            }
            targets.forEach(parts => {
                const groupId = parts[0]?.groupId;
                if (groupId) {
                    const members = this._getGroupMembers(groupId);
                    members.forEach(item => { delete item.groupId; });
                    delete this.objects.groups[groupId];
                    delete this.objects.groupNames[groupId];
                }
            });
            this.objects.updateObjectList?.();
            this.stage?.requestRender?.();
            eventBus.emit('history:push');
            this.setStatus('Ungrouped selected face target(s).');
            Utils.showToast('Face group ungrouped.', 'success');
        },

        previewFaceMotion(key, options = {}) {
            const scope = options.scope || 'selected';
            const rangeSec = Number(options.rangeSec) || 2;
            const sets = scope === 'selected' ? this._getSelectedFaceTargetGroupsStrict() : this.getFaceSetTargets(scope);
            if (!sets.length) {
                Utils.showToast('Select a face target first to preview animation.', 'warning');
                return;
            }
            const snapshots = new Map();
            sets.flat().forEach(obj => {
                snapshots.set(obj.id, Utils.deepClone(obj.animations || []));
            });

            this.applyFaceMotion(key, {
                scope,
                rangeSec,
                startSec: 0,
                endSec: rangeSec,
                previewMode: true,
                intensity: options.intensity || this._readMotionIntensity()
            });
            this.setStatus(`Previewing ${getAvailableMotions()[key]?.name || key} (${rangeSec}s).`);

            setTimeout(() => {
                snapshots.forEach((animations, id) => {
                    const obj = this.objects.getObjectById?.(id);
                    if (!obj) return;
                    obj.animations = Utils.deepClone(animations || []);
                    delete obj._faceSetAppliedMotionSignature;
                    delete obj._faceSetAppliedMotionKey;
                });
                this.objects.updateProperties?.();
                this.animations?.updateAppliedAnimationsList?.();
                this.animations?.updateCodeOutput?.();
                this.stage?.requestRender?.();
                eventBus.emit('timeline:update');
                this.setStatus('Preview finished. Use Apply to commit motion to timeline.');
            }, Math.max(700, Math.round(rangeSec * 1000)));
        },

        applyFaceMotion(key, options = {}) {
            if (options.intensity && SIMPLE_INTENSITIES[options.intensity]) {
                this._ufMotionIntensity = options.intensity;
                this._syncMotionIntensityInput();
            }
            const scope = options.scope || 'selected';
            const setsForRepair = scope === 'selected' ? this._getSelectedFaceTargetGroupsStrict() : this.getFaceSetTargets(scope);
            setsForRepair.forEach(parts => {
                this._ensureSmartCutMouthOpeningLooksDark(parts);
                this._repairSmartCutEyeFeatureCoversForSet?.(parts).catch?.(() => {});
                this._sortUniversalFacePartsForRender(parts);
            });
            const result = baseApplyFaceMotion.call(this, key, options);
            const explicitStart = Math.max(0, Number(options.startSec) || 0);
            const explicitEndRaw = Number.isFinite(Number(options.endSec)) ? Number(options.endSec) : NaN;
            const rangeFromWindow = Number.isFinite(explicitEndRaw) ? Math.max(0.1, explicitEndRaw - explicitStart) : 0;
            const rangeSec = Math.max(0, Number(options.rangeSec) || rangeFromWindow);
            if (rangeSec > 0 && key !== 'neutral') {
                const sets = scope === 'selected' ? this._getSelectedFaceTargetGroupsStrict() : this.getFaceSetTargets(scope);
                this._scaleFaceMotionDuration(sets, rangeSec, explicitStart);
                this._applyFaceMotionRepeatSettings(sets, {
                    repeat: options.repeat,
                    repeatMode: options.repeatMode,
                    repeatPauseSec: options.repeatPauseSec
                });
                this._applyFaceMotionAfterPlaybackSettings(sets, {
                    afterPlayback: options.afterPlayback
                });
                this._tuneSideViewFaceMotion(sets);
                if (!options.previewMode) {
                    const endSec = explicitStart + rangeSec;
                    this._panelStartSec = explicitStart;
                    this._panelEndSec = endSec;
                    this._panelDurationSec = rangeSec;
                    this._syncTimelineWindowInputs();
                    this.setStatus(`${getAvailableMotions()[key]?.name || key}: applied to ${explicitStart.toFixed(1)}s - ${endSec.toFixed(1)}s.`);
                }
            }
            return result;
        },

        _isSideViewFaceSet(parts) {
            return (parts || []).some(obj => obj?.faceSet?.viewMode === 'side'
                || (Array.isArray(obj?.tags) && obj.tags.includes('face-view:side')));
        },

        _tuneSideViewFaceMotion(sets) {
            (sets || []).forEach(parts => {
                if (!this._isSideViewFaceSet(parts)) return;
                (parts || []).forEach(obj => {
                    const role = this.getFaceRole(obj) || '';
                    if (!Array.isArray(obj.animations)) return;
                    obj.animations.forEach(anim => {
                        if (anim.type !== 'face-set-motion' || !Array.isArray(anim.generated)) return;
                        anim._sideViewTuned = true;
                        anim.generated = anim.generated.map(step => {
                            if (!step || step._sideViewTuned) return step;
                            const tuned = { ...step, _sideViewTuned: true };
                            const from = Number(tuned.from);
                            const to = Number(tuned.to);
                            if (Number.isFinite(from) && Number.isFinite(to)) {
                                const delta = to - from;
                                if (tuned.property === 'x') tuned.to = from + delta * 0.38;
                                if (tuned.property === 'rotation' && role.includes('eyebrow')) tuned.to = from + delta * 0.7;
                                if (tuned.property === 'scaleX' && (role.includes('lip') || role === 'mouth-opening' || role === 'teeth')) tuned.to = from + delta * 0.55;
                                if (tuned.property === 'scaleY' && role === 'mouth-opening') tuned.to = from + delta * 1.12;
                            }
                            return tuned;
                        });
                    });
                });
            });
        },

        validateUniversalFaceAnimations() {
            const targets = this.getFaceSetTargets('all');
            const rows = targets.map((parts, index) => {
                const animations = parts.flatMap(obj => Array.isArray(obj.animations) ? obj.animations : []);
                const faceMotionCount = animations.filter(anim => anim.type === 'face-set-motion' || anim.type === 'face-set').length;
                const roles = [...new Set(parts.map(obj => this.getFaceRole(obj)).filter(Boolean))].sort();
                const motionKey = parts.find(obj => obj?._faceSetAppliedMotionKey)?._faceSetAppliedMotionKey || 'none';
                const viewMode = this._extractViewModeFromParts(parts) || 'front';
                const missingCore = ['left-eye-sclera', 'left-iris', 'left-pupil', 'left-eyebrow', 'mouth-opening', 'upper-lip', 'lower-lip']
                    .filter(role => !roles.includes(role));
                const sideFarPartsPresent = viewMode === 'side'
                    ? roles.filter(role => SIDE_VIEW_FAR_ROLES.has(role))
                    : [];
                return {
                    index: index + 1,
                    parts: parts.length,
                    viewMode,
                    roles,
                    motionKey,
                    faceMotionCount,
                    hasExportableMotion: faceMotionCount > 0,
                    missingCore,
                    sideFarPartsPresent,
                    readyForExport: missingCore.length === 0 && sideFarPartsPresent.length === 0
                };
            });
            const summary = {
                faceSets: rows.length,
                animatedFaceSets: rows.filter(row => row.hasExportableMotion).length,
                exportReadyFaceSets: rows.filter(row => row.readyForExport).length,
                rows
            };
            try {
                console.table(rows.map(row => ({
                    set: row.index,
                    parts: row.parts,
                    view: row.viewMode,
                    motion: row.motionKey,
                    tracks: row.faceMotionCount,
                    exportable: row.hasExportableMotion ? 'yes' : 'no',
                    ready: row.readyForExport ? 'yes' : 'check',
                    missing: row.missingCore.join(', '),
                    sideFarParts: row.sideFarPartsPresent.join(', ')
                })));
            } catch (_) {}
            return summary;
        },

        repairUniversalFaceTiming(options = {}) {
            const scope = options.scope || 'all';
            const targets = scope === 'selected'
                ? this._getSelectedFaceTargetGroupsStrict()
                : this.getFaceSetTargets('all');
            let setCount = 0;
            let trackCount = 0;
            let repairedCount = 0;

            (targets || []).forEach(parts => {
                let setTouched = false;
                (parts || []).forEach(obj => {
                    if (!Array.isArray(obj?.animations)) return;
                    obj.animations.forEach(anim => {
                        if (anim?.type !== 'face-set-motion') return;
                        trackCount += 1;
                        const before = {
                            duration: Number(anim.params?.duration),
                            timelineDuration: Number(anim.params?.timelineDuration),
                            active: Number(anim.params?.activeDuration ?? anim._faceSetActiveDurationSec),
                            cycle: Number(anim.params?.cycleDuration ?? anim._faceSetCycleDurationSec),
                            pause: Number(anim.params?.repeatPauseSec ?? anim._faceSetRepeatPauseSec)
                        };
                        this._normalizeFaceMotionTiming(anim);
                        const after = {
                            duration: Number(anim.params?.duration),
                            timelineDuration: Number(anim.params?.timelineDuration),
                            active: Number(anim.params?.activeDuration ?? anim._faceSetActiveDurationSec),
                            cycle: Number(anim.params?.cycleDuration ?? anim._faceSetCycleDurationSec),
                            pause: Number(anim.params?.repeatPauseSec ?? anim._faceSetRepeatPauseSec)
                        };
                        const changed = Object.keys(after).some(key => {
                            const next = Number(after[key]);
                            const prev = Number(before[key]);
                            return Number.isFinite(next) && (!Number.isFinite(prev) || Math.abs(next - prev) > 0.001);
                        });
                        if (changed) {
                            repairedCount += 1;
                            setTouched = true;
                        }
                    });
                });
                if (setTouched) setCount += 1;
            });

            this.objects?.updateProperties?.();
            this.objects?.updateObjectList?.();
            this.animations?.updateAppliedAnimationsList?.();
            this.animations?.updateCodeOutput?.();
            this.stage?.requestRender?.();
            eventBus.emit('timeline:update');
            if (repairedCount > 0) eventBus.emit('history:push');

            const message = repairedCount > 0
                ? `Validated face timing: repaired ${repairedCount} animation track${repairedCount === 1 ? '' : 's'} across ${setCount} face set${setCount === 1 ? '' : 's'}.`
                : `Validated face timing: ${trackCount} animation track${trackCount === 1 ? '' : 's'} already look correct.`;
            this.setStatus(message);
            if (options.showToast !== false) {
                Utils.showToast(message, repairedCount > 0 ? 'success' : 'info');
            }
            return { setCount, trackCount, repairedCount };
        },

        _applyFaceMotionRepeatSettings(sets, options = {}) {
            const repeatRaw = String(options.repeat ?? this._panelRepeat ?? '1');
            const repeat = ['1', '2', '3', '5', '10', '-1'].includes(repeatRaw) ? repeatRaw : '1';
            const repeatMode = String(options.repeatMode ?? this._panelRepeatMode ?? 'restart') === 'cycle' ? 'cycle' : 'restart';
            const repeatPauseSec = Math.max(0, Number(options.repeatPauseSec ?? this._panelRepeatPauseSec ?? 0) || 0);

            this._panelRepeat = repeat;
            this._panelRepeatMode = repeatMode;
            this._panelRepeatPauseSec = repeatPauseSec;
            this._syncMotionRepeatInputs();

            (sets || []).forEach(parts => {
                (parts || []).forEach(obj => {
                    if (!Array.isArray(obj.animations)) return;
                    obj.animations.forEach(anim => {
                        if (anim.type !== 'face-set-motion') return;
                        if (!anim.params) anim.params = {};

                        this._normalizeFaceMotionTiming(anim);
                        const activeDuration = this._getFaceMotionTimelineDurationSec(anim);
                        const cycleDuration = activeDuration + repeatPauseSec;

                        anim._faceSetActiveDurationSec = activeDuration;
                        anim._faceSetTimelineDurationSec = activeDuration;
                        anim._faceSetRepeatPauseSec = repeatPauseSec;
                        anim._faceSetCycleDurationSec = cycleDuration;
                        anim.params.duration = activeDuration;
                        anim.params.timelineDuration = activeDuration;
                        anim.params.activeDuration = activeDuration;
                        anim.params.cycleDuration = cycleDuration;
                        anim.params.repeatPauseSec = repeatPauseSec;
                        anim.params.repeat = repeat === '-1' ? -1 : Math.max(1, parseInt(repeat, 10) || 1);
                        anim.params.repeatMode = repeatMode;
                        anim.repeat = repeat;
                        anim.repeatMode = repeatMode;
                    });
                });
            });

            this.animations?.updateAppliedAnimationsList?.();
            this.animations?.updateCodeOutput?.();
            this.stage?.requestRender?.();
            eventBus.emit('timeline:update');
        },

        _getFaceMotionTimelineDurationSec(anim) {
            const candidates = [
                anim?._faceSetTimelineDurationSec,
                anim?.params?.timelineDuration,
                anim?.params?.duration,
                anim?._faceSetActiveDurationSec,
                anim?.params?.activeDuration
            ].map(value => Number(value)).filter(value => Number.isFinite(value) && value > 0);
            return Math.max(0.1, candidates[0] || 1);
        },

        _normalizeFaceMotionTiming(anim) {
            if (!anim || anim.type !== 'face-set-motion') return anim;
            if (!anim.params) anim.params = {};
            const pauseSec = Math.max(0, Number(anim._faceSetRepeatPauseSec ?? anim.params.repeatPauseSec ?? 0) || 0);
            const paramsDuration = Math.max(0.1, Number(anim.params.duration) || 0.1);
            const activeStored = Number(anim._faceSetActiveDurationSec ?? anim.params.activeDuration);
            let timelineDuration = Number(anim._faceSetTimelineDurationSec ?? anim.params.timelineDuration);

            if (!Number.isFinite(timelineDuration) || timelineDuration <= 0) {
                timelineDuration = paramsDuration;
                if (Number.isFinite(activeStored) && activeStored > 0 && pauseSec > 0) {
                    const cycleDuration = activeStored + pauseSec;
                    if (Math.abs(paramsDuration - cycleDuration) < 0.06) {
                        timelineDuration = activeStored;
                    }
                }
            }

            timelineDuration = Math.max(0.1, timelineDuration);
            const activeDuration = Math.max(0.1, Number.isFinite(activeStored) && activeStored > 0 ? activeStored : timelineDuration);
            const cycleDuration = activeDuration + pauseSec;

            anim._faceSetTimelineDurationSec = timelineDuration;
            anim._faceSetActiveDurationSec = activeDuration;
            anim._faceSetCycleDurationSec = cycleDuration;
            anim.params.duration = timelineDuration;
            anim.params.timelineDuration = timelineDuration;
            anim.params.activeDuration = activeDuration;
            anim.params.cycleDuration = cycleDuration;
            anim.params.repeatPauseSec = pauseSec;
            return anim;
        },

        _applyFaceMotionAfterPlaybackSettings(sets, options = {}) {
            const afterPlayback = String(options.afterPlayback ?? this._panelAfterPlayback ?? 'keep') === 'return' ? 'return' : 'keep';
            this._panelAfterPlayback = afterPlayback;
            this._syncMotionAfterPlaybackInputs();

            (sets || []).forEach(parts => {
                (parts || []).forEach(obj => {
                    if (!Array.isArray(obj.animations)) return;
                    obj.animations.forEach(anim => {
                        if (anim.type !== 'face-set-motion') return;
                        if (!anim.params) anim.params = {};
                        anim.afterPlayback = afterPlayback;
                        anim.params.afterPlayback = afterPlayback;
                    });
                });
            });

            this.animations?.updateAppliedAnimationsList?.();
            this.animations?.updateCodeOutput?.();
            this.stage?.requestRender?.();
            eventBus.emit('timeline:update');
        },

        _scaleFaceMotionDuration(sets, rangeSec, startSec = 0, options = {}) {
            (sets || []).forEach(parts => {
                (parts || []).forEach(obj => {
                    if (!Array.isArray(obj.animations)) return;
                    obj.animations.forEach(anim => {
                        if (anim.type !== 'face-set-motion') return;
                        this._normalizeFaceMotionTiming(anim);
                        const prevDuration = this._getFaceMotionTimelineDurationSec(anim);
                        const scale = rangeSec / prevDuration;
                        if (!anim.params) anim.params = {};
                        anim.params.duration = rangeSec;
                        anim.params.timelineDuration = rangeSec;
                        anim.params.activeDuration = rangeSec;
                        anim._faceSetActiveDurationSec = rangeSec;
                        anim._faceSetTimelineDurationSec = rangeSec;
                        anim.params.delay = startSec;
                        anim.delay = Math.max(0, Math.round(startSec * 1000));
                        if (Array.isArray(anim.generated)) {
                            anim.generated = anim.generated.map(step => ({
                                ...step,
                                duration: Math.max(1, Math.round((Number(step.duration) || 0) * scale)),
                                _stepDelay: Math.max(0, Math.round((Number(step._stepDelay) || 0) * scale))
                            }));
                        }
                    });
                });
            });
            this.animations?.updateAppliedAnimationsList?.();
            this.animations?.updateCodeOutput?.();
            this.stage?.requestRender?.();
            eventBus.emit('timeline:update');
            if (options.pushHistory !== false) {
                eventBus.emit('history:push');
            }
        },

        registerGroup(groupId, name, parts, hostObjects = []) {
            if (!this.objects || !groupId || !Array.isArray(parts)) return;
            const allMembers = [...hostObjects, ...parts].filter(Boolean);
            const memberIds = [...new Set(allMembers.map(item => item.id))];
            this.objects._groupCounter = (this.objects._groupCounter || 0) + 1;
            this.objects.groups[groupId] = memberIds;
            this.objects.groupNames[groupId] = `Universal Face - ${name}`;
            allMembers.forEach(item => { item.groupId = groupId; });
        },

        selectParts(parts, hostObjects = []) {
            const ids = [...new Set([...hostObjects, ...parts].filter(Boolean).map(item => item.id))];
            if (typeof this.objects.select === 'function') {
                this.objects.select(ids);
            } else {
                this.objects.selectedIds = ids;
            }
        },

        updatePropertiesPanelVisibility() {
            this.updateAttachContextUI();
            const selected = this._getSelectedObjectsSafe();
            const selectedFaceTargets = this._getSelectedFaceTargetGroupsStrict();
            const hasSelectedFaceTarget = Array.isArray(selectedFaceTargets) && selectedFaceTargets.length > 0;

            if (hasSelectedFaceTarget) {
                const imagePropertiesSection = document.getElementById('image-properties');
                if (imagePropertiesSection) imagePropertiesSection.classList.remove('hidden');
            }

            // Keep Universal Face action-driven: do not auto-open from passive selection changes.
            if (hasSelectedFaceTarget && this.active && !this.panel?.classList?.contains('hidden')) {
                this._syncPanelFromSelectedFaceTarget?.();
                this._syncPlacementUI?.();
                this._syncTimelineWindowInputs?.();
                this.updateAttachContextUI();
                this.setStatus(`Editing ${selectedFaceTargets.length} face set${selectedFaceTargets.length === 1 ? '' : 's'}.`);
            }
        }
    });
})();
