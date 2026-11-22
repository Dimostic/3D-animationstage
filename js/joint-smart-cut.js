/**
 * Joint System — Smart Cut — trace, label & auto-assemble
 * (split from joint-system.js for maintainability)
 */

JointSystem._getGuidedLandmarkSteps = function() {
        return [
            { key: 'headTop',           label: 'Head Top',          icon: 'fa-chevron-up',      desc: 'Click the highest point of the head' },
            { key: 'jawTip',            label: 'Jaw Tip',           icon: 'fa-circle-dot',      desc: 'Click the lowest point of the chin / jaw' },
            { key: 'neckBase',          label: 'Neck Base',         icon: 'fa-arrows-up-down',  desc: 'Click where the neck meets the torso' },
            { key: 'leftShoulder',      label: 'Left Shoulder',     icon: 'fa-arrow-left',      desc: 'Click the left outer shoulder (viewer\'s left)' },
            { key: 'rightShoulder',     label: 'Right Shoulder',    icon: 'fa-arrow-right',     desc: 'Click the right outer shoulder (viewer\'s right)' },
            { key: 'leftHandTip',       label: 'Left Hand Tip',     icon: 'fa-hand-paper',      desc: 'Click the farthest tip of the left hand / fingers' },
            { key: 'rightHandTip',      label: 'Right Hand Tip',    icon: 'fa-hand-paper',      desc: 'Click the farthest tip of the right hand / fingers' },
            { key: 'crotch',            label: 'Crotch',            icon: 'fa-arrows-alt-v',    desc: 'Click where the legs separate' },
            { key: 'leftToeTip',        label: 'Left Toe Tip',      icon: 'fa-shoe-prints',     desc: 'Click the farthest tip of the left foot / toes' },
            { key: 'rightToeTip',       label: 'Right Toe Tip',     icon: 'fa-shoe-prints',     desc: 'Click the farthest tip of the right foot / toes' }
        ];
    }

JointSystem._getStencilTemplates = function() {
        // Helper: generate ellipse polygon (n points) centred at (cx,cy) with radii (rx,ry)
        const ellipse = (cx, cy, rx, ry, n = 12) => {
            const pts = [];
            for (let i = 0; i < n; i++) {
                const a = (2 * Math.PI * i) / n - Math.PI / 2;
                pts.push({ x: +(cx + Math.cos(a) * rx).toFixed(3), y: +(cy + Math.sin(a) * ry).toFixed(3) });
            }
            return pts;
        };

        return {
            'guided-motion-front': {
                parts: {
                    'head-neck': [
                        {x:0.50,y:0.00},{x:0.57,y:0.015},{x:0.61,y:0.06},{x:0.59,y:0.12},
                        {x:0.55,y:0.145},{x:0.55,y:0.19},{x:0.45,y:0.19},{x:0.45,y:0.145},
                        {x:0.41,y:0.12},{x:0.39,y:0.06},{x:0.43,y:0.015}
                    ],
                    'torso': [
                        {x:0.33,y:0.17},{x:0.67,y:0.17},{x:0.65,y:0.28},{x:0.61,y:0.47},
                        {x:0.39,y:0.47},{x:0.35,y:0.28}
                    ],
                    'l-arm': [
                        {x:0.63,y:0.17},{x:0.73,y:0.18},{x:0.74,y:0.31},{x:0.75,y:0.48},
                        {x:0.65,y:0.48},{x:0.65,y:0.31}
                    ],
                    'r-arm': [
                        {x:0.27,y:0.18},{x:0.37,y:0.17},{x:0.35,y:0.31},{x:0.35,y:0.48},
                        {x:0.25,y:0.48},{x:0.26,y:0.31}
                    ],
                    'l-leg': [
                        {x:0.49,y:0.45},{x:0.61,y:0.45},{x:0.59,y:0.66},{x:0.62,y:0.96},
                        {x:0.48,y:0.96},{x:0.51,y:0.66}
                    ],
                    'r-leg': [
                        {x:0.39,y:0.45},{x:0.51,y:0.45},{x:0.49,y:0.66},{x:0.52,y:0.96},
                        {x:0.38,y:0.96},{x:0.41,y:0.66}
                    ]
                },
                stars: [
                    { id:'neck', label:'Neck', x:0.50, y:0.18, links:[
                        {partKey:'head-neck',vertexIndices:[5,6]}, {partKey:'torso',vertexIndices:[0,1]}
                    ]},
                    { id:'l-shoulder', label:'Left Shoulder', x:0.66, y:0.18, links:[
                        {partKey:'torso',vertexIndices:[1]}, {partKey:'l-arm',vertexIndices:[0,1]}
                    ]},
                    { id:'r-shoulder', label:'Right Shoulder', x:0.34, y:0.18, links:[
                        {partKey:'torso',vertexIndices:[0]}, {partKey:'r-arm',vertexIndices:[0,1]}
                    ]},
                    { id:'l-elbow', label:'Left Elbow / Flex', x:0.695, y:0.31, links:[
                        {partKey:'l-arm',vertexIndices:[2,5]}
                    ]},
                    { id:'r-elbow', label:'Right Elbow / Flex', x:0.305, y:0.31, links:[
                        {partKey:'r-arm',vertexIndices:[2,5]}
                    ]},
                    { id:'l-hip', label:'Left Hip', x:0.56, y:0.46, links:[
                        {partKey:'torso',vertexIndices:[3]}, {partKey:'l-leg',vertexIndices:[0,1]}
                    ]},
                    { id:'r-hip', label:'Right Hip', x:0.44, y:0.46, links:[
                        {partKey:'torso',vertexIndices:[4]}, {partKey:'r-leg',vertexIndices:[0,1]}
                    ]},
                    { id:'l-knee', label:'Left Knee / Flex', x:0.55, y:0.66, links:[
                        {partKey:'l-leg',vertexIndices:[2,5]}
                    ]},
                    { id:'r-knee', label:'Right Knee / Flex', x:0.45, y:0.66, links:[
                        {partKey:'r-leg',vertexIndices:[2,5]}
                    ]}
                ]
            },
            'human-front': {
                parts: {
                    // ── Head: ellipse centred around 0.50, 0.065 ──
                    'head': ellipse(0.50, 0.065, 0.11, 0.07, 12),
                    // ── Neck: narrow rectangle ──
                    'neck': [
                        {x:0.46, y:0.13}, {x:0.54, y:0.13}, {x:0.54, y:0.18}, {x:0.46, y:0.18}
                    ],
                    // ── Torso: tapered — wide shoulders, narrower waist ──
                    'torso': [
                        {x:0.34, y:0.17}, {x:0.66, y:0.17},  // shoulder line
                        {x:0.65, y:0.22}, {x:0.62, y:0.34},  // right side taper
                        {x:0.58, y:0.45}, {x:0.42, y:0.45},  // waist/hip line
                        {x:0.38, y:0.34}, {x:0.35, y:0.22}   // left side taper
                    ],
                    // ── Left upper arm: tapered strip ──
                    'l-upper-arm': [
                        {x:0.64, y:0.18}, {x:0.74, y:0.18},  // shoulder end (wide)
                        {x:0.73, y:0.32}, {x:0.66, y:0.32}   // elbow end (narrower)
                    ],
                    // ── Left forearm ──
                    'l-forearm': [
                        {x:0.66, y:0.31}, {x:0.73, y:0.31},  // elbow end
                        {x:0.72, y:0.44}, {x:0.67, y:0.44}   // wrist end (narrower)
                    ],
                    // ── Left hand: small rectangle ──
                    'l-hand': [
                        {x:0.66, y:0.43}, {x:0.74, y:0.43},
                        {x:0.74, y:0.52}, {x:0.66, y:0.52}
                    ],
                    // ── Right upper arm ──
                    'r-upper-arm': [
                        {x:0.26, y:0.18}, {x:0.36, y:0.18},  // shoulder end (wide)
                        {x:0.34, y:0.32}, {x:0.27, y:0.32}   // elbow end (narrower)
                    ],
                    // ── Right forearm ──
                    'r-forearm': [
                        {x:0.27, y:0.31}, {x:0.34, y:0.31},  // elbow end
                        {x:0.33, y:0.44}, {x:0.28, y:0.44}   // wrist end
                    ],
                    // ── Right hand ──
                    'r-hand': [
                        {x:0.26, y:0.43}, {x:0.34, y:0.43},
                        {x:0.34, y:0.52}, {x:0.26, y:0.52}
                    ],
                    // ── Left upper leg: tapered ──
                    'l-upper-leg': [
                        {x:0.50, y:0.44}, {x:0.60, y:0.44},  // hip end (wide)
                        {x:0.58, y:0.64}, {x:0.51, y:0.64}   // knee end (narrower)
                    ],
                    // ── Left lower leg ──
                    'l-lower-leg': [
                        {x:0.51, y:0.63}, {x:0.58, y:0.63},  // knee end
                        {x:0.57, y:0.84}, {x:0.52, y:0.84}   // ankle end
                    ],
                    // ── Left foot ──
                    'l-foot': [
                        {x:0.49, y:0.83}, {x:0.60, y:0.83},
                        {x:0.62, y:0.96}, {x:0.48, y:0.96}
                    ],
                    // ── Right upper leg ──
                    'r-upper-leg': [
                        {x:0.40, y:0.44}, {x:0.50, y:0.44},  // hip end
                        {x:0.49, y:0.64}, {x:0.42, y:0.64}   // knee end
                    ],
                    // ── Right lower leg ──
                    'r-lower-leg': [
                        {x:0.42, y:0.63}, {x:0.49, y:0.63},  // knee end
                        {x:0.48, y:0.84}, {x:0.43, y:0.84}   // ankle end
                    ],
                    // ── Right foot ──
                    'r-foot': [
                        {x:0.38, y:0.83}, {x:0.51, y:0.83},
                        {x:0.52, y:0.96}, {x:0.38, y:0.96}
                    ]
                },
                /**
                 * Stars: draggable joint anchors at part connection boundaries.
                 * links[].vertexIndices are the vertex positions in the part polygon
                 * that should move with this star. Moving a star reshapes all linked
                 * vertices simultaneously.
                 */
                stars: [
                    // ── Head ↔ Neck ──
                    { id: 'neck-top', label: 'Chin / Top of Neck', x: 0.50, y: 0.13,
                      links: [
                          { partKey: 'head', vertexIndices: [5, 6, 7] },     // bottom of ellipse
                          { partKey: 'neck', vertexIndices: [0, 1] }         // top of neck rect
                      ]},
                    // ── Neck ↔ Torso ──
                    { id: 'neck-bottom', label: 'Base of Neck', x: 0.50, y: 0.18,
                      links: [
                          { partKey: 'neck', vertexIndices: [2, 3] },        // bottom of neck
                          { partKey: 'torso', vertexIndices: [0, 7] }        // top corners of torso
                      ]},
                    // ── Left shoulder (Torso ↔ L Upper Arm) ──
                    { id: 'l-shoulder', label: 'L Shoulder', x: 0.66, y: 0.18,
                      links: [
                          { partKey: 'torso', vertexIndices: [1, 2] },       // torso top-right
                          { partKey: 'l-upper-arm', vertexIndices: [0, 1] }  // upper arm top
                      ]},
                    // ── Right shoulder (Torso ↔ R Upper Arm) ──
                    { id: 'r-shoulder', label: 'R Shoulder', x: 0.34, y: 0.18,
                      links: [
                          { partKey: 'torso', vertexIndices: [0, 7] },       // torso top-left
                          { partKey: 'r-upper-arm', vertexIndices: [0, 1] }  // upper arm top
                      ]},
                    // ── Left elbow (L Upper Arm ↔ L Forearm) ──
                    { id: 'l-elbow', label: 'L Elbow', x: 0.695, y: 0.315,
                      links: [
                          { partKey: 'l-upper-arm', vertexIndices: [2, 3] },
                          { partKey: 'l-forearm', vertexIndices: [0, 1] }
                      ]},
                    // ── Right elbow ──
                    { id: 'r-elbow', label: 'R Elbow', x: 0.305, y: 0.315,
                      links: [
                          { partKey: 'r-upper-arm', vertexIndices: [2, 3] },
                          { partKey: 'r-forearm', vertexIndices: [0, 1] }
                      ]},
                    // ── Left wrist (L Forearm ↔ L Hand) ──
                    { id: 'l-wrist', label: 'L Wrist', x: 0.695, y: 0.435,
                      links: [
                          { partKey: 'l-forearm', vertexIndices: [2, 3] },
                          { partKey: 'l-hand', vertexIndices: [0, 1] }
                      ]},
                    // ── Right wrist ──
                    { id: 'r-wrist', label: 'R Wrist', x: 0.305, y: 0.435,
                      links: [
                          { partKey: 'r-forearm', vertexIndices: [2, 3] },
                          { partKey: 'r-hand', vertexIndices: [0, 1] }
                      ]},
                    // ── Left hip (Torso ↔ L Upper Leg) ──
                    { id: 'l-hip', label: 'L Hip', x: 0.57, y: 0.445,
                      links: [
                          { partKey: 'torso', vertexIndices: [4] },
                          { partKey: 'l-upper-leg', vertexIndices: [0, 1] }
                      ]},
                    // ── Right hip ──
                    { id: 'r-hip', label: 'R Hip', x: 0.43, y: 0.445,
                      links: [
                          { partKey: 'torso', vertexIndices: [5] },
                          { partKey: 'r-upper-leg', vertexIndices: [0, 1] }
                      ]},
                    // ── Left knee (L Upper Leg ↔ L Lower Leg) ──
                    { id: 'l-knee', label: 'L Knee', x: 0.555, y: 0.635,
                      links: [
                          { partKey: 'l-upper-leg', vertexIndices: [2, 3] },
                          { partKey: 'l-lower-leg', vertexIndices: [0, 1] }
                      ]},
                    // ── Right knee ──
                    { id: 'r-knee', label: 'R Knee', x: 0.455, y: 0.635,
                      links: [
                          { partKey: 'r-upper-leg', vertexIndices: [2, 3] },
                          { partKey: 'r-lower-leg', vertexIndices: [0, 1] }
                      ]},
                    // ── Left ankle (L Lower Leg ↔ L Foot) ──
                    { id: 'l-ankle', label: 'L Ankle', x: 0.555, y: 0.835,
                      links: [
                          { partKey: 'l-lower-leg', vertexIndices: [2, 3] },
                          { partKey: 'l-foot', vertexIndices: [0, 1] }
                      ]},
                    // ── Right ankle ──
                    { id: 'r-ankle', label: 'R Ankle', x: 0.455, y: 0.835,
                      links: [
                          { partKey: 'r-lower-leg', vertexIndices: [2, 3] },
                          { partKey: 'r-foot', vertexIndices: [0, 1] }
                      ]}
                ]
            },
            'human-side': {
                parts: {
                    'head': ellipse(0.47, 0.065, 0.16, 0.07, 12),
                    'torso': [
                        {x:0.25, y:0.14}, {x:0.60, y:0.14},
                        {x:0.58, y:0.34}, {x:0.55, y:0.46},
                        {x:0.30, y:0.46}, {x:0.27, y:0.34}
                    ],
                    'upper-arm': [
                        {x:0.40, y:0.17}, {x:0.52, y:0.17},
                        {x:0.51, y:0.33}, {x:0.41, y:0.33}
                    ],
                    'forearm': [
                        {x:0.41, y:0.32}, {x:0.51, y:0.32},
                        {x:0.50, y:0.46}, {x:0.42, y:0.46}
                    ],
                    'hand': [
                        {x:0.40, y:0.45}, {x:0.52, y:0.45},
                        {x:0.52, y:0.53}, {x:0.40, y:0.53}
                    ],
                    'upper-leg': [
                        {x:0.30, y:0.44}, {x:0.52, y:0.44},
                        {x:0.50, y:0.65}, {x:0.32, y:0.65}
                    ],
                    'lower-leg': [
                        {x:0.32, y:0.64}, {x:0.50, y:0.64},
                        {x:0.48, y:0.85}, {x:0.34, y:0.85}
                    ],
                    'foot': [
                        {x:0.30, y:0.84}, {x:0.55, y:0.84},
                        {x:0.68, y:0.96}, {x:0.28, y:0.96}
                    ]
                },
                stars: [
                    { id: 'neck', label: 'Neck', x: 0.47, y: 0.14,
                      links: [
                          { partKey: 'head', vertexIndices: [5, 6, 7] },
                          { partKey: 'torso', vertexIndices: [0, 1] }
                      ]},
                    { id: 'shoulder', label: 'Shoulder', x: 0.46, y: 0.17,
                      links: [
                          { partKey: 'torso', vertexIndices: [0, 1] },
                          { partKey: 'upper-arm', vertexIndices: [0, 1] }
                      ]},
                    { id: 'elbow', label: 'Elbow', x: 0.46, y: 0.325,
                      links: [
                          { partKey: 'upper-arm', vertexIndices: [2, 3] },
                          { partKey: 'forearm', vertexIndices: [0, 1] }
                      ]},
                    { id: 'wrist', label: 'Wrist', x: 0.46, y: 0.455,
                      links: [
                          { partKey: 'forearm', vertexIndices: [2, 3] },
                          { partKey: 'hand', vertexIndices: [0, 1] }
                      ]},
                    { id: 'hip', label: 'Hip', x: 0.42, y: 0.45,
                      links: [
                          { partKey: 'torso', vertexIndices: [3, 4] },
                          { partKey: 'upper-leg', vertexIndices: [0, 1] }
                      ]},
                    { id: 'knee', label: 'Knee', x: 0.42, y: 0.645,
                      links: [
                          { partKey: 'upper-leg', vertexIndices: [2, 3] },
                          { partKey: 'lower-leg', vertexIndices: [0, 1] }
                      ]},
                    { id: 'ankle', label: 'Ankle', x: 0.42, y: 0.845,
                      links: [
                          { partKey: 'lower-leg', vertexIndices: [2, 3] },
                          { partKey: 'foot', vertexIndices: [0, 1] }
                      ]}
                ]
            }
        };
    }


Object.assign(JointSystem.prototype, {

    _buildFaceRigSmartCutPreset() {
        return {
            key: 'face-rig-parts',
            name: 'SmartCut Face Parts',
            icon: 'fa-face-smile',
            description: 'Cut simple face parts that can be grouped and animated with Universal Face.',
            rigType: 'face-rig',
            faceCut: {
                keepBaseImage: true,
                padding: 6,
                feather: 3,
                overlap: 3
            },
            parts: [
                { partKey: 'leftEye', name: 'Left Eye', description: 'Trace the full visible left eye', faceRole: 'left-eye-sclera' },
                { partKey: 'rightEye', name: 'Right Eye', description: 'Trace the full visible right eye', faceRole: 'right-eye-sclera' },
                { partKey: 'leftIris', name: 'Left Iris', description: 'Optional iris color area for gaze/looking motion', faceRole: 'left-iris', optional: true },
                { partKey: 'rightIris', name: 'Right Iris', description: 'Optional iris color area for gaze/looking motion', faceRole: 'right-iris', optional: true },
                { partKey: 'leftPupil', name: 'Left Pupil', description: 'Optional dark pupil area for precise gaze motion', faceRole: 'left-pupil', optional: true },
                { partKey: 'rightPupil', name: 'Right Pupil', description: 'Optional dark pupil area for precise gaze motion', faceRole: 'right-pupil', optional: true },
                { partKey: 'leftBrow', name: 'Left Brow', description: 'Trace the left eyebrow', faceRole: 'left-eyebrow' },
                { partKey: 'rightBrow', name: 'Right Brow', description: 'Trace the right eyebrow', faceRole: 'right-eyebrow' },
                { partKey: 'upperLip', name: 'Upper Lip', description: 'Trace the upper lip shape', faceRole: 'upper-lip' },
                { partKey: 'lowerLip', name: 'Lower Lip', description: 'Trace the lower lip shape', faceRole: 'lower-lip' },
                { partKey: 'mouthOpening', name: 'Mouth Opening / Gap', description: 'Trace the visible opening, or use Closed Mouth to create a thin animated gap', faceRole: 'mouth-opening' },
                { partKey: 'teeth', name: 'Teeth', description: 'Optional teeth/highlight area', faceRole: 'teeth', optional: true }
            ]
        };
    },

    _getSmartCutPresetCatalog() {
        return [this._buildFaceRigSmartCutPreset(), ...JointPresets.getAll()];
    },

    // ═══════════════════════════════════════════════
    //  SMART CUT — trace, label & auto-assemble
    // ═══════════════════════════════════════════════

    showSmartCut() {
        // Need exactly one selected image object
        const selected = this.objects.getSelectedObjects();
        if (selected.length !== 1 || selected[0].type !== 'image') {
            if (selected.length > 0) {
                this.showAssembleSelectedPartsPanel?.({ presetKey: selected.length <= 6 ? 'guided-motion-front' : 'human-front' });
                Utils.showToast('Selected parts detected — label them for animation instead of starting a new SmartCut.', 'info');
                return;
            }
            Utils.showToast('Select a single image to smart-cut, or select cut parts to assemble them', 'warning');
            return;
        }

        this._closeActiveCuttingWorkflows?.();
        this._smartCutObj = selected[0];
        this._smartCutRegions = [];
        this._smartCutCurrentPath = [];
        this._smartCutPreset = null;
        this._smartCutEdgeMap = null;
        this._smartCutAutoOutline = null;
        this._smartCutEditMode = false;
        this._smartCutDragging = null;
        this._smartCutRegionDrag = null;
        this._smartCutHoverPoint = null;
        this._smartCutHoverEdge = null;
        this._smartCutHoverRegion = null;
        this._smartCutSelectedRegion = null;
        this._smartCutManualTraceEnabled = false;
        this._smartCutTraceThroughRegions = false;
        this._smartCutFaceWorkflow = 'trace';
        this._smartCutFaceGuides = null;
        this._smartCutFaceClosedMouth = false;
        this._smartCutFaceGuideDrag = null;
        this._smartCutFaceGuideHover = null;
        this._smartCutFaceLabelMode = localStorage.getItem('as.smartCut.faceGuideLabels') || this._smartCutFaceLabelMode || 'auto';
        this._smartCutFaceGuideEditCount = 0;
        this._smartCutLastTrainingCandidate = null;
        this._smartCutOriginalSrc = this._smartCutObj.imageSrc;
        this._smartCutOriginalImageElement = this._smartCutObj.imageElement;
        this._smartCutPreparedSrc = null;
        this._smartCutPreparedCanvas = null;
        this._smartCutPreparedTolerance = null;
        this._smartCutActive = false;

        // Auto-lock the image during Smart Cut
        this._smartCutWasLocked = this._smartCutObj.locked;
        this._smartCutObj._temporaryLockOwner = 'smart-cut';
        this._smartCutObj._temporaryLockPrevious = this._smartCutWasLocked;
        this._smartCutObj.locked = true;

        const facePreset = this._buildFaceRigSmartCutPreset();
        const presetByKey = new Map();
        [facePreset, ...this._getSmartCutPresetCatalog()].forEach((preset) => {
            if (!preset?.key || presetByKey.has(preset.key)) return;
            presetByKey.set(preset.key, preset);
        });
        const presets = [...presetByKey.values()];
        const panel = document.createElement('div');
        panel.id = 'smart-cut-panel';
        panel.className = 'smart-cut-panel';

        panel.innerHTML = `
            <div class="ja-header" data-draggable="true">
                <i class="fas fa-cut"></i> Smart Cut
                <span class="smc-step-indicator" id="smc-step-indicator">Step 1/3</span>
                <button class="ja-close" title="Close (Esc)"><i class="fas fa-times"></i></button>
            </div>
            <div class="smc-body">
                <!-- Step 1: Pick character type -->
                <div class="sc-step" id="sc-step-type">
                    <div class="smc-step-label">Character Type</div>
                    <div style="display:flex;gap:6px;align-items:center;margin:0 0 8px;flex-wrap:wrap;">
                        <button class="btn-secondary btn-sm" id="sc-assemble-existing" title="Label already-cut body parts and animate them">
                            <i class="fas fa-link"></i> Assemble Selected Parts
                        </button>
                        <span style="font-size:10px;color:#94a3b8;">Use this when parts are already cut or imported.</span>
                    </div>
                    <div class="smc-preset-list">
                        ${presets.map(p => `
                            <div class="smc-preset-row" data-preset="${p.key}" title="${p.description}">
                                <div class="smc-preset-main">
                                    <div class="smc-preset-title-row">
                                        <i class="fas ${p.icon}"></i>
                                        <span class="smc-preset-name">${p.name}</span>
                                        <span class="smc-preset-count">${p.parts.length} parts</span>
                                    </div>
                                    <div class="smc-preset-copy">${p.description}</div>
                                </div>
                                <div class="smc-preset-preview">${p.rigType === 'face-rig' ? '<div style="font-size:11px;color:#cbd5e1;padding:8px 10px;line-height:1.45;">Universal Face profile:<br>trace face parts, then apply Face Animation or Text Lip Sync.</div>' : this._renderGuidedRigDiagramMarkup('part-assembly', p)}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <!-- Step 2: Trace & label regions -->
                <div class="sc-step hidden" id="sc-step-trace">
                    <div class="smc-step-label">Trace Parts
                        <span class="sc-region-counter" id="sc-region-counter">(0)</span>
                    </div>
                    <div class="smc-trace-help">
                        <span><kbd>Click</kbd> trace &bull; <kbd>Dbl-click</kbd> close &bull; <kbd>Z</kbd> undo &bull; <kbd>Esc</kbd> cancel</span>
                    </div>
                    <div class="sc-face-workflow-card hidden" id="sc-face-workflow-card">
                        <div class="sc-auto-title"><i class="fas fa-face-smile"></i> Universal Face Parts</div>
                        <div class="sc-auto-copy">Choose how to create animated face parts from the selected image. The original image stays underneath as a base layer so small animation gaps are less visible.</div>
                        <div class="sc-face-workflow-options">
                            <button class="btn-primary btn-sm sc-face-workflow-option is-active" id="sc-face-trace-workflow" type="button">
                                <i class="fas fa-draw-polygon"></i>
                                <span>Trace and Cut</span>
                            </button>
                            <button class="btn-secondary btn-sm sc-face-workflow-option" id="sc-face-guide-workflow" type="button">
                                <i class="fas fa-crosshairs"></i>
                                <span>Place Guides and Auto Cut</span>
                            </button>
                        </div>
                        <div class="sc-face-guide-actions hidden" id="sc-face-guide-actions">
                            <label class="sc-auto-check" style="margin:0 4px 0 0">
                                <input type="checkbox" id="sc-face-enable-eye-details">
                                <span style="font-size:11px">Iris/Pupil details</span>
                            </label>
                            <label class="sc-auto-check" style="margin:0 4px 0 0" title="Use when the face image has closed lips. Creates a clean dark animated mouth gap instead of cutting mouth pixels.">
                                <input type="checkbox" id="sc-face-closed-mouth">
                                <span style="font-size:11px">Closed Mouth</span>
                            </label>
                            <label class="sc-face-guide-label-field" title="Control canvas labels and edit hint pills while positioning face guides. Auto shows labels for the first few edits, then hides them.">
                                <span>Labels</span>
                                <select id="sc-face-guide-label-mode">
                                    <option value="auto">Auto</option>
                                    <option value="always">Always</option>
                                    <option value="hide">Hide</option>
                                </select>
                            </label>
                            <button class="btn-secondary btn-sm" id="sc-face-reset-guides" type="button"><i class="fas fa-rotate-left"></i> Reset Guides</button>
                            <button class="btn-secondary btn-sm" id="sc-face-create-regions" type="button"><i class="fas fa-vector-square"></i> Create Cut Regions</button>
                            <button class="btn-primary btn-sm" id="sc-face-auto-cut-guides" type="button"><i class="fas fa-bolt"></i> Auto Cut From Guides</button>
                        </div>
                    </div>
                    <div class="sc-auto-card" id="sc-auto-card">
                        <div class="sc-auto-title"><i class="fas fa-wand-magic-sparkles"></i> Automatic Smart Cut</div>
                        <div class="sc-auto-copy" id="sc-auto-copy">Auto Trace first removes the background, isolates the character silhouette, then seeds body-part regions from the selected preset before cutting.</div>
                        <div class="sc-auto-samples" id="sc-auto-samples"></div>
                        <div style="display:flex;gap:6px;align-items:center;margin:2px 8px 4px;flex-wrap:wrap">
                            <label class="sc-auto-check" style="margin:0">
                                <input type="checkbox" id="sc-use-training" checked>
                                <span style="font-size:11px">Use Training Data</span>
                            </label>
                            <button class="btn-sm btn-secondary" id="sc-clear-training" style="display:none;font-size:11px;color:#f87171" title="Remove all saved training data for this preset"><i class="fas fa-trash"></i> Clear Training</button>
                        </div>
                        <div class="sc-auto-controls">
                            <label class="sc-auto-check">
                                <input type="checkbox" id="sc-auto-remove-bg" checked disabled>
                                <span>Remove Background First</span>
                            </label>
                            <label class="sc-auto-field">
                                <span>Sensitivity</span>
                                <input type="range" id="sc-auto-sensitivity" min="1" max="100" value="72">
                                <strong id="sc-auto-sensitivity-val">72</strong>
                            </label>
                            <label class="sc-auto-field">
                                <span>BG Tolerance</span>
                                <input type="range" id="sc-auto-bg-tolerance" min="1" max="100" value="30">
                                <strong id="sc-auto-bg-tolerance-val">30</strong>
                            </label>
                            <label class="sc-auto-field">
                                <span>Cut Source</span>
                                <select id="sc-cut-mode" title="How Smart Cut extracts each part">
                                    <option value="original" selected>Original Detail</option>
                                    <option value="silhouette">Silhouette Exact</option>
                                </select>
                                <small>Auto Cut and Cut &amp; Assemble use this mode.</small>
                            </label>
                            <label class="sc-auto-field">
                                <span>Assembly</span>
                                <select id="sc-assembly-mode" title="How body parts are positioned after cutting">
                                    <option value="keep" selected>Keep Positions</option>
                                    <option value="reposition">T-Pose (Reposition)</option>
                                </select>
                                <small>Keep = parts stay where cut. T-Pose = rearrange into 0° baseline for animation.</small>
                            </label>
                            <label class="sc-auto-field">
                                <span>Joint System</span>
                                <select id="sc-joint-system" title="Which joint/pin engine to use for assembly">
                                    <option value="smart-cut" selected>Smart Cut</option>
                                    <option value="armature">Pose Armature</option>
                                </select>
                                <small>Smart Cut uses its own pin/joint system. Pose Armature merges parts into 6 armature roles with inherited rotation.</small>
                            </label>
                        </div>
                        <div class="sc-actions sc-auto-actions">
                            <button class="btn-secondary btn-sm" id="sc-auto-trace" title="Trace the character silhouette and propose all body-part regions"><i class="fas fa-magic"></i> Auto Trace Parts</button>
                            <button class="btn-secondary btn-sm" id="sc-guided-trace" title="Click key body landmarks first, then auto-trace with guided precision"><i class="fas fa-crosshairs"></i> Guide + Trace</button>
                            <button class="btn-secondary btn-sm" id="sc-auto-train" title="Save the current approved Smart Cut layout as training for similar images"><i class="fas fa-graduation-cap"></i> Save Layout Training</button>
                            <button class="btn-primary btn-sm" id="sc-auto-cut" title="Auto-trace parts and cut them immediately"><i class="fas fa-bolt"></i> Auto Cut &amp; Assemble</button>
                        </div>
                        <div class="sc-auto-note" id="sc-auto-note">Works best on presets with a body map, especially Human (Front) and Human (Side). You can still delete and re-trace any generated region manually.</div>
                    </div>
                    <div class="sc-train-card hidden" id="sc-train-card">
                        <div class="sc-train-title"><i class="fas fa-pen-ruler"></i> Edit Parts</div>
                        <div class="sc-train-copy" id="sc-train-copy">Drag a body part to move it. Drag points to reshape it. Right-click a point to delete it or an edge to add a point. Click on empty canvas to trace a new region. Press <kbd>Esc</kbd> to cancel the current trace, again to exit edit mode, again to close. When the cut result looks correct, save it as training so Smart Cut can reuse that layout on similar images.</div>
                    </div>
                    <div class="sc-guide-card">
                        <div id="sc-guide-copy" class="sc-guide-copy"></div>
                        <div id="sc-guide-next" class="sc-guide-next"></div>
                        <div id="sc-guide-diagram" class="guided-rig-diagram-shell sc-guide-diagram"></div>
                        <div id="sc-guide-legend"></div>
                    </div>
                    <div class="sc-regions-list" id="sc-regions-list"></div>
                    <div class="sc-trace-current hidden" id="sc-trace-current">
                        <select id="sc-part-select" class="sc-part-select" title="Label this traced region"></select>
                        <button class="btn-primary btn-sm sc-confirm-region" id="sc-confirm-region" title="Confirm region (Enter)"><i class="fas fa-check"></i></button>
                        <button class="btn-secondary btn-sm sc-discard-region" id="sc-discard-region" title="Discard trace (Del)"><i class="fas fa-trash"></i></button>
                    </div>
                    <div class="sc-trace-hints" id="sc-trace-hints" style="font-size:11px;color:#94a3b8;padding:2px 8px;line-height:1.5">
                        <kbd style="background:#334155;border:1px solid #475569;border-radius:3px;padding:1px 4px;font-size:10px">Click</kbd> place point &bull;
                        <kbd style="background:#334155;border:1px solid #475569;border-radius:3px;padding:1px 4px;font-size:10px">Right-click</kbd> / <kbd style="background:#334155;border:1px solid #475569;border-radius:3px;padding:1px 4px;font-size:10px">Z</kbd> undo &bull;
                        <kbd style="background:#334155;border:1px solid #475569;border-radius:3px;padding:1px 4px;font-size:10px">Click start point</kbd> close shape
                    </div>
                    <div style="padding:0 8px 6px">
                        <label class="sc-auto-check" style="margin:0">
                            <input type="checkbox" id="sc-enable-manual-trace">
                            <span>Enable Manual Trace For Exceptions</span>
                        </label>
                    </div>
                    <div class="sc-actions">
                        <button class="btn-secondary btn-sm" id="sc-toggle-edit" title="Switch between tracing and editing the selected part"><i class="fas fa-pen-ruler"></i> Edit Selected Part</button>
                        <button class="btn-secondary btn-sm" id="sc-trace-through-regions" title="Allow tracing inside or over completed parts without selecting/blocking them"><i class="fas fa-layer-group"></i> Trace Through Parts</button>
                        <button class="btn-sm sc-undo-point-btn" id="sc-undo-point" title="Undo last point (Z / Right-click)"><i class="fas fa-undo"></i></button>
                        <button class="btn-sm sc-close-path-btn" id="sc-close-path" title="Close shape and pick label" style="display:none"><i class="fas fa-draw-polygon"></i> Close Shape</button>
                        <button class="btn-primary btn-sm sc-cut-all-btn" id="sc-cut-all" title="Cut all traced regions and assemble"><i class="fas fa-magic"></i> Cut &amp; Assemble</button>
                    </div>
                </div>
                <!-- Step 3: Done -->
                <div class="sc-step hidden" id="sc-step-done">
                    <div class="smc-step-label"><i class="fas fa-check-circle" style="color:#10b981"></i> Done!</div>
                    <div class="smc-done-msg" id="sc-done-msg"></div>
                    <div id="sc-cut-review"></div>
                    <div class="smc-face-readiness hidden" id="sc-face-readiness"></div>
                    <div class="smc-face-test-actions hidden" id="sc-face-test-actions">
                        <button class="btn-secondary btn-sm" data-scm-face-test="blink"><i class="fas fa-eye"></i> Test Blink</button>
                        <button class="btn-secondary btn-sm" data-scm-face-test="talk"><i class="fas fa-comment-dots"></i> Test Talk</button>
                        <button class="btn-secondary btn-sm" data-scm-face-test="smile"><i class="fas fa-face-smile"></i> Test Smile</button>
                    </div>
                    <div class="smc-face-repair-actions hidden" id="sc-face-repair-actions">
                        <button class="btn-secondary btn-sm" data-scm-face-repair="select-parts"><i class="fas fa-object-group"></i> Select Parts</button>
                        <button class="btn-secondary btn-sm" data-scm-face-repair="focus-eyes"><i class="fas fa-eye"></i> Focus Eyes</button>
                        <button class="btn-secondary btn-sm" data-scm-face-repair="focus-brows"><i class="fas fa-grip-lines"></i> Focus Brows</button>
                        <button class="btn-secondary btn-sm" data-scm-face-repair="focus-mouth"><i class="fas fa-comment"></i> Focus Mouth</button>
                        <button class="btn-secondary btn-sm" data-scm-face-repair="select-review"><i class="fas fa-wrench"></i> Review Parts</button>
                        <button class="btn-secondary btn-sm" data-scm-face-repair="toggle-covers"><i class="fas fa-layer-group"></i> Hide Covers</button>
                        <button class="btn-secondary btn-sm" data-scm-face-repair="select-covers"><i class="fas fa-clone"></i> Select Covers</button>
                        <button class="btn-secondary btn-sm" data-scm-face-repair="toggle-base"><i class="fas fa-image"></i> Hide Base</button>
                    </div>
                    <div class="sc-actions">
                        <button class="btn-secondary btn-sm" id="sc-btn-save-training"><i class="fas fa-graduation-cap"></i> Save Training</button>
                        <button class="btn-primary btn-sm hidden" id="sc-btn-open-universal-face"><i class="fas fa-face-smile"></i> Open Universal Face</button>
                        <button class="btn-primary btn-sm" id="sc-btn-movements"><i class="fas fa-play"></i> Movements</button>
                        <button class="btn-secondary btn-sm" id="sc-btn-poses"><i class="fas fa-bookmark"></i> Poses</button>
                        <button class="btn-sm hidden" id="sc-btn-armature-panel"><i class="fas fa-project-diagram"></i> Armature Panel</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(panel);
        this._makeDraggable(panel);
        Utils.makePanelResizable(panel);

        // Defensive runtime fallback: ensure Face Rig manual profile is always visible in Smart Cut.
        const presetList = panel.querySelector('.smc-preset-list');
        if (presetList && !presetList.querySelector('.smc-preset-row[data-preset="face-rig-parts"]')) {
            const fallbackRow = document.createElement('div');
            fallbackRow.className = 'smc-preset-row';
            fallbackRow.dataset.preset = facePreset.key;
            fallbackRow.title = facePreset.description;
            fallbackRow.innerHTML = `
                <div class="smc-preset-main">
                    <div class="smc-preset-title-row">
                        <i class="fas ${facePreset.icon}"></i>
                        <span class="smc-preset-name">${facePreset.name}</span>
                        <span class="smc-preset-count">${facePreset.parts.length} parts</span>
                    </div>
                    <div class="smc-preset-copy">${facePreset.description}</div>
                </div>
                <div class="smc-preset-preview"><div style="font-size:11px;color:#cbd5e1;padding:8px 10px;line-height:1.45;">Universal Face profile:<br>trace face parts, then apply Face Animation or Text Lip Sync.</div></div>
            `;
            presetList.prepend(fallbackRow);
        }

        // Close
        panel.querySelector('.ja-close')?.addEventListener('click', () => {
            this._exitSmartCut();
            panel.remove();
        });

        // Keyboard shortcuts
        this._scKeyHandler = (e) => this._scHandleKeyDown(e, panel);
        document.addEventListener('keydown', this._scKeyHandler);

        panel.querySelector('#sc-assemble-existing')?.addEventListener('click', () => {
            this.showAssembleSelectedPartsPanel?.({ presetKey: 'guided-motion-front' });
        });

        // Step 1: preset selection
        panel.querySelectorAll('.smc-preset-row').forEach(card => {
            card.addEventListener('click', () => {
                const key = card.dataset.preset;
                this._smartCutPreset = presets.find(p => p.key === key);
                panel.querySelector('#sc-step-type').classList.add('hidden');
                panel.querySelector('#sc-step-trace').classList.remove('hidden');
                this._updateStepIndicator(panel, 2);
                this._enterSmartCutTracing(panel);
            });
        });

        const launchContext = window.__smartCutLaunchContext || null;
        const launchPresetKey = String(launchContext?.presetKey || '').trim();
        if (launchPresetKey) {
            const launchRow = panel.querySelector(`.smc-preset-row[data-preset="${launchPresetKey}"]`);
            window.__smartCutLaunchContext = null;
            if (launchRow) {
                launchRow.click();
                this._applySmartCutLaunchContext(panel, launchContext);
            }
        }
    },

    _applySmartCutLaunchContext(panel, launchContext) {
        if (!panel || !launchContext || this._smartCutPreset?.key !== 'face-rig-parts') return;
        const target = launchContext.faceRigTarget;
        const rect = target?.rect;
        if (!rect || !Number.isFinite(Number(rect.w)) || !Number.isFinite(Number(rect.h))) return;
        const x = Number(rect.x) || 0;
        const y = Number(rect.y) || 0;
        const w = Math.max(4, Number(rect.w) || 0);
        const h = Math.max(4, Number(rect.h) || 0);
        const role = String(target?.role || '').trim();

        this._smartCutCurrentPath = [
            { x, y },
            { x: x + w, y },
            { x: x + w, y: y + h },
            { x, y: y + h }
        ];
        this._smartCutPathClosed = true;

        const traceUI = panel.querySelector('#sc-trace-current');
        if (traceUI) traceUI.classList.remove('hidden');
        this._updatePartSelect(panel);
        if (role) {
            const select = panel.querySelector('#sc-part-select');
            if (select && [...select.options].some(option => option.value === role)) select.value = role;
        }
        this._scUpdateTraceButtons(panel);
        this.stage.requestRender();
        Utils.showToast('Smart Cut pre-framed from Face Rig stencil. Fine-tune corners and confirm.', 'info');
    },

    _updateStepIndicator(panel, step) {
        const ind = panel.querySelector('#smc-step-indicator');
        if (ind) ind.textContent = `Step ${step}/3`;
    },

    _scHandleKeyDown(e, panel) {
        if (!document.getElementById('smart-cut-panel')) return;
        // Escape — graceful cancel ladder:
        //   1. cancel guided landmark capture if active
        //   2. cancel an in-progress trace path (do not close panel)
        //   3. exit edit/drag mode back to trace mode (do not close panel)
        //   4. close the Smart Cut panel
        if (e.key === 'Escape') {
            e.preventDefault();
            if (this._smartCutGuidedLandmarks?.active) {
                this._cancelGuidedLandmarks(panel);
                return;
            }
            if (this._smartCutCurrentPath && this._smartCutCurrentPath.length > 0) {
                this._smartCutCurrentPath = [];
                this._smartCutPathClosed = false;
                panel.querySelector('#sc-trace-current')?.classList.add('hidden');
                this._scUpdateTraceButtons(panel);
                this.stage.requestRender();
                Utils.showToast('Trace cancelled', 'info');
                return;
            }
            if (this._smartCutEditMode && this._smartCutRegions?.length > 0) {
                this._setSmartCutEditMode(panel, false);
                Utils.showToast(
                    this._smartCutManualTraceEnabled
                        ? 'Edit mode off — manual trace is enabled if you need to draw an exception region. Press Esc again to close.'
                        : 'Edit mode off — manual trace is locked. Enable Manual Trace only if this image needs an exception. Press Esc again to close.',
                    'info'
                );
                return;
            }
            this._exitSmartCut();
            panel.remove();
            return;
        }
        if (!this._smartCutActive) return;
        // Z — undo last point (trace or guided landmark)
        if (e.key === 'z' || e.key === 'Z') {
            if (e.ctrlKey || e.metaKey) return; // let global undo handle
            e.preventDefault();
            const gl = this._smartCutGuidedLandmarks;
            if (gl?.active && gl.currentIndex > 0) {
                gl.currentIndex--;
                delete gl.points[gl.steps[gl.currentIndex].key];
                this._updateGuidedLandmarkUI(panel);
                this.stage.requestRender();
                return;
            }
            if (this._smartCutCurrentPath.length > 0) {
                this._smartCutCurrentPath.pop();
                this._smartCutPathClosed = false;
                // If path was closed (label picker showing), hide it on undo
                if (this._smartCutCurrentPath.length < 3) {
                    panel.querySelector('#sc-trace-current')?.classList.add('hidden');
                }
                this._scUpdateTraceButtons(panel);
                this.stage.requestRender();
            }
            return;
        }
        // Enter — confirm region if label picker is visible
        if (e.key === 'Enter') {
            const traceUI = panel.querySelector('#sc-trace-current');
            if (traceUI && !traceUI.classList.contains('hidden')) {
                e.preventDefault();
                this._confirmCurrentRegion(panel);
            }
            return;
        }
        // Delete/Backspace — discard current trace
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'SELECT') return;
            const traceUI = panel.querySelector('#sc-trace-current');
            if (traceUI && !traceUI.classList.contains('hidden')) {
                e.preventDefault();
                this._smartCutCurrentPath = [];
                this._smartCutPathClosed = false;
                traceUI.classList.add('hidden');
                this._scUpdateTraceButtons(panel);
                this.stage.requestRender();
            }
            return;
        }
    },

    _enterSmartCutTracing(panel) {
        this._smartCutActive = true;
        this._smartCutCurrentPath = [];
        this._smartCutPathClosed = false;
        this._smartCutHover = null;
        this._smartCutGuideKey = null;
        this._smartCutFaceWorkflow = 'trace';
        this._smartCutManualTraceEnabled = this._smartCutPreset?.rigType === 'face-rig';
        this._setSmartCutEditMode(panel, false);
        this.stage.viewport.style.cursor = '';

        // Build edge map for snapping
        this._buildEdgeMap();

        // Populate part select
        this._updatePartSelect(panel);
        this._updateRegionsList(panel);
        panel.querySelector('#sc-part-select')?.addEventListener('change', () => {
            this._updateSmartCutGuide(panel);
            this.stage.requestRender();
        });

        // Bind canvas events
        this._scMouseDownHandler = (e) => this._scHandleMouseDown(e, panel);
        this._scMouseMoveHandler = (e) => this._scHandleMouseMove(e);
        this._scMouseUpHandler = (e) => this._scHandleMouseUp(e);
        this._scDblClickHandler = (e) => this._scHandleDblClick(e, panel);
        this._scCtxMenuHandler = (e) => this._scHandleContextMenu(e);
        this.stage.viewport.addEventListener('mousedown', this._scMouseDownHandler);
        this.stage.viewport.addEventListener('mousemove', this._scMouseMoveHandler);
        this.stage.viewport.addEventListener('mouseup', this._scMouseUpHandler);
        this.stage.viewport.addEventListener('dblclick', this._scDblClickHandler);
        this.stage.viewport.addEventListener('contextmenu', this._scCtxMenuHandler);

        // Undo point
        panel.querySelector('#sc-undo-point')?.addEventListener('click', () => {
            if (this._smartCutCurrentPath.length > 0) {
                this._smartCutCurrentPath.pop();
                this._smartCutPathClosed = false;
                if (this._smartCutCurrentPath.length < 3) {
                    panel.querySelector('#sc-trace-current')?.classList.add('hidden');
                }
                this._scUpdateTraceButtons(panel);
                this.stage.requestRender();
            }
        });

        // Close shape button
        panel.querySelector('#sc-close-path')?.addEventListener('click', () => {
            if (this._smartCutCurrentPath.length >= 3) {
                this._closePath(panel);
            }
        });

        const autoSensitivity = panel.querySelector('#sc-auto-sensitivity');
        const autoSensitivityVal = panel.querySelector('#sc-auto-sensitivity-val');
        if (autoSensitivity && autoSensitivityVal) {
            autoSensitivity.addEventListener('input', () => {
                autoSensitivityVal.textContent = autoSensitivity.value;
            });
        }
        const autoBgTolerance = panel.querySelector('#sc-auto-bg-tolerance');
        const autoBgToleranceVal = panel.querySelector('#sc-auto-bg-tolerance-val');
        if (autoBgTolerance && autoBgToleranceVal) {
            autoBgTolerance.addEventListener('input', () => {
                autoBgToleranceVal.textContent = autoBgTolerance.value;
            });
        }
        panel.querySelector('#sc-auto-trace')?.addEventListener('click', () => {
            this._smartCutAutoTrace(panel, false);
        });
        panel.querySelector('#sc-guided-trace')?.addEventListener('click', () => {
            if (this._smartCutPreset?.key === 'human-front') {
                this._startGuidedLandmarks(panel, false, true);
            } else {
                Utils.showToast('Guided landmarks are currently available for Human (Front)', 'info');
            }
        });
        panel.querySelector('#sc-auto-train')?.addEventListener('click', () => {
            this._saveSmartCutTrainingFromCurrentLayout(panel);
        });
        panel.querySelector('#sc-auto-cut')?.addEventListener('click', () => {
            this._smartCutAutoTrace(panel, true);
        });
        panel.querySelector('#sc-face-trace-workflow')?.addEventListener('click', () => {
            this._smartCutFaceWorkflow = 'trace';
            this._setSmartCutFaceWorkflowUI(panel);
            this._setSmartCutManualTraceEnabled(panel, true);
            Utils.showToast('Trace the eye, brow, and mouth parts, then click Cut & Assemble', 'info');
        });
        panel.querySelector('#sc-face-guide-workflow')?.addEventListener('click', () => {
            this._smartCutFaceWorkflow = 'guides';
            this._setSmartCutFaceWorkflowUI(panel);
            this._initSmartCutFaceGuides(panel, false);
            this._setSmartCutManualTraceEnabled(panel, false);
            this._setSmartCutEditMode(panel, false);
            Utils.showToast('Drag and resize the face-part guides, then create cut regions or auto-cut', 'info');
        });
        panel.querySelector('#sc-face-reset-guides')?.addEventListener('click', () => {
            this._initSmartCutFaceGuides(panel, true);
            const eyeDetailToggle = panel.querySelector('#sc-face-enable-eye-details');
            if (eyeDetailToggle) eyeDetailToggle.checked = false;
            const closedMouthToggle = panel.querySelector('#sc-face-closed-mouth');
            if (closedMouthToggle) closedMouthToggle.checked = false;
            this._smartCutFaceClosedMouth = false;
            Utils.showToast('Face guides reset to default positions', 'success');
        });
        panel.querySelector('#sc-face-guide-label-mode')?.addEventListener('change', (event) => {
            this._setSmartCutFaceGuideLabelMode(event.target.value, panel);
        });
        panel.querySelector('#sc-face-enable-eye-details')?.addEventListener('change', (event) => {
            this._setSmartCutFaceEyeDetailGuidesEnabled(!!event.target.checked, panel);
        });
        panel.querySelector('#sc-face-closed-mouth')?.addEventListener('change', (event) => {
            this._setSmartCutFaceClosedMouthEnabled(!!event.target.checked, panel);
        });
        panel.querySelector('#sc-face-create-regions')?.addEventListener('click', () => {
            this._createSmartCutFaceRegionsFromGuides(panel);
        });
        panel.querySelector('#sc-face-auto-cut-guides')?.addEventListener('click', () => {
            if (this._createSmartCutFaceRegionsFromGuides(panel, true)) {
                this._smartCutAndAssemble(panel);
            }
        });
        panel.querySelector('#sc-toggle-edit')?.addEventListener('click', () => {
            if (!this._smartCutEditMode) {
                if (!this._smartCutRegions.length) {
                    Utils.showToast('Trace or auto-trace at least one part first', 'info');
                    return;
                }
                if (!Number.isInteger(this._smartCutSelectedRegion)) {
                    Utils.showToast('Select a part from the list to edit it', 'info');
                    return;
                }
                this._setSmartCutEditMode(panel, true);
                return;
            }
            this._setSmartCutEditMode(panel, false);
        });
        panel.querySelector('#sc-clear-training')?.addEventListener('click', () => {
            this._clearSmartCutTraining(panel);
        });
        panel.querySelector('#sc-enable-manual-trace')?.addEventListener('change', (event) => {
            this._setSmartCutManualTraceEnabled(panel, !!event.target.checked);
        });
        panel.querySelector('#sc-trace-through-regions')?.addEventListener('click', () => {
            this._setSmartCutTraceThroughRegions(panel, !this._smartCutTraceThroughRegions);
        });
        this._updateSmartCutAutoUI(panel);
        this._setSmartCutFaceWorkflowUI(panel);
        this._updateSmartCutModeUI(panel);
        this._updateSmartCutManualTraceUI(panel);

        // Confirm region
        panel.querySelector('#sc-confirm-region')?.addEventListener('click', () => {
            this._confirmCurrentRegion(panel);
        });

        // Discard region
        panel.querySelector('#sc-discard-region')?.addEventListener('click', () => {
            this._smartCutCurrentPath = [];
            panel.querySelector('#sc-trace-current')?.classList.add('hidden');
            this.stage.requestRender();
        });

        // Cut & Assemble
        panel.querySelector('#sc-cut-all')?.addEventListener('click', () => {
            this._smartCutAndAssemble(panel);
        });

        // Register render overlay
        this._scRenderOverlay = (ctx) => this._renderSmartCutOverlay(ctx);
        eventBus.on('stage:render-overlay', this._scRenderOverlay);
        this.stage.requestRender();
    },

    _exitSmartCut() {
        this._clearCuttingCompletionHandler?.();
        // Restore lock state
        if (this._smartCutObj && this._smartCutWasLocked != null) {
            this._smartCutObj.locked = this._smartCutWasLocked;
            delete this._smartCutObj._temporaryLockOwner;
            delete this._smartCutObj._temporaryLockPrevious;
        }
        this._smartCutWasLocked = null;

        this._smartCutActive = false;
        this._smartCutCurrentPath = [];
        this._smartCutHover = null;
        this._smartCutGuideKey = null;
        this._smartCutEdgeMap = null;
        this._smartCutAutoOutline = null;
        this._smartCutEditMode = false;
        this._smartCutDragging = null;
        this._smartCutRegionDrag = null;
        this._smartCutHoverPoint = null;
        this._smartCutHoverRegion = null;
        this._smartCutSelectedRegion = null;
        this._smartCutManualTraceEnabled = false;
        this._smartCutFaceWorkflow = null;
        this._smartCutFaceGuides = null;
        this._smartCutFaceClosedMouth = false;
        this._smartCutFaceGuideDrag = null;
        this._smartCutFaceGuideHover = null;
        this._smartCutGuidedLandmarks = null;
        this._smartCutRestoreOriginalImage(true);
        this._smartCutOriginalSrc = null;
        this._smartCutOriginalImageElement = null;
        this._smartCutObj = null;
        this.stage.viewport.style.cursor = '';

        if (this._scMouseDownHandler) {
            this.stage.viewport.removeEventListener('mousedown', this._scMouseDownHandler);
            this.stage.viewport.removeEventListener('mousemove', this._scMouseMoveHandler);
            this.stage.viewport.removeEventListener('mouseup', this._scMouseUpHandler);
            this.stage.viewport.removeEventListener('dblclick', this._scDblClickHandler);
            this._scMouseDownHandler = null;
            this._scMouseMoveHandler = null;
            this._scMouseUpHandler = null;
            this._scDblClickHandler = null;
        }
        if (this._scCtxMenuHandler) {
            this.stage.viewport.removeEventListener('contextmenu', this._scCtxMenuHandler);
            this._scCtxMenuHandler = null;
        }
        if (this._scRenderOverlay) {
            eventBus.off('stage:render-overlay', this._scRenderOverlay);
            this._scRenderOverlay = null;
        }
        if (this._scKeyHandler) {
            document.removeEventListener('keydown', this._scKeyHandler);
            this._scKeyHandler = null;
        }
        this.stage.requestRender();
    },

    _smartCutSupportsAutoTrace(preset = this._smartCutPreset) {
        if (!preset?.key) return false;
        if (preset.rigType === 'face-rig') return false;
        return !!JointSystem._getStencilTemplates()[preset.key] || this._getSmartCutTrainingSamples(preset.key).length > 0;
    },

    _getSmartCutTrainingStorageKey(presetKey) {
        return `smartCutTraining_${presetKey}`;
    },

    _getSmartCutTrainingSamples(presetKey = this._smartCutPreset?.key) {
        if (!presetKey) return [];
        try {
            const raw = localStorage.getItem(this._getSmartCutTrainingStorageKey(presetKey));
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    },

    _setSmartCutTrainingSamples(presetKey, samples) {
        if (!presetKey) return;
        localStorage.setItem(this._getSmartCutTrainingStorageKey(presetKey), JSON.stringify(samples));
    },

    async _clearSmartCutTraining(panel) {
        const presetKey = this._smartCutPreset?.key;
        if (!presetKey) return;
        const count = this._getSmartCutTrainingSamples(presetKey).length;
        if (count === 0) {
            Utils.showToast('No training data to clear', 'info');
            return;
        }
        if (!await Utils.showConfirm(`Clear all ${count} saved Smart Cut training example${count === 1 ? '' : 's'} for "${presetKey}"?`)) return;
        localStorage.removeItem(this._getSmartCutTrainingStorageKey(presetKey));
        this._updateSmartCutAutoUI(panel);
        Utils.showToast(`Cleared ${count} training example${count === 1 ? '' : 's'} for ${presetKey}`, 'success');
    },

    _setSmartCutEditMode(panel, enabled) {
        if (enabled && !Number.isInteger(this._smartCutSelectedRegion) && this._smartCutRegions?.length) {
            this._smartCutSelectedRegion = 0;
        }
        this._smartCutEditMode = !!enabled;
        if (!enabled) {
            this._smartCutDragging = null;
            this._smartCutRegionDrag = null;
            this._smartCutHoverPoint = null;
            this._smartCutHoverEdge = null;
            this._smartCutHoverRegion = null;
        }
        const card = panel?.querySelector('#sc-train-card');
        if (card) card.classList.toggle('hidden', !enabled);
        const copy = panel?.querySelector('#sc-train-copy');
        if (copy) {
            if (enabled) {
                const selectedRegion = Number.isInteger(this._smartCutSelectedRegion)
                    ? this._smartCutRegions?.[this._smartCutSelectedRegion]
                    : null;
                copy.innerHTML = selectedRegion?.name
                    ? (selectedRegion.locked
                        ? `Selected <strong>${selectedRegion.name}</strong>, but it is locked. Right-click the shape and choose Unlock Shape before moving or reshaping it.`
                        : `Editing <strong>${selectedRegion.name}</strong>. Drag this body part to move it. Drag points to reshape it. Hover an edge for the + marker, then right-click to add a point; hover a point and right-click to delete it. Use the button below to return to tracing.`)
                    : 'Edit mode only works on the selected part. Choose a part from the list, then edit its shape or position.';
            } else {
                copy.innerHTML = this._smartCutManualTraceEnabled
                    ? 'Trace mode. Click on empty image space to place points for a new region. Double-click an existing body part to select it for editing.'
                    : 'Tracing is currently locked. Double-click an existing body part to edit it, or enable Manual Trace if this image needs an exception.';
            }
        }
        this._updateSmartCutModeUI(panel);
        if (this.stage?.viewport) {
            // Distinct cursor so users get clear visual feedback of the active mode.
            // Edit mode → 'default' (drag arrows take over via _scHandleMouseMove).
            // Trace mode → 'crosshair' (placing trace points).
            this.stage.viewport.style.cursor = enabled ? 'default' : (this._smartCutManualTraceEnabled ? 'crosshair' : 'default');
        }
        this.stage.requestRender();
    },

    _scIsRegionLocked(regionIndex) {
        return !!this._smartCutRegions?.[regionIndex]?.locked;
    },

    _scSetRegionLocked(regionIndex, locked, panel = null) {
        const region = this._smartCutRegions?.[regionIndex];
        if (!region) return;
        region.locked = !!locked;
        if (region.locked) {
            this._smartCutDragging = null;
            this._smartCutRegionDrag = null;
            this._smartCutHoverPoint = null;
            this._smartCutHoverEdge = null;
        }
        if (panel) {
            this._updateRegionsList(panel);
            if (this._smartCutEditMode) this._setSmartCutEditMode(panel, true);
        }
        this.stage.requestRender();
    },

    _setSmartCutManualTraceEnabled(panel, enabled) {
        this._smartCutManualTraceEnabled = !!enabled;
        if (!this._smartCutManualTraceEnabled) {
            this._smartCutCurrentPath = [];
            this._smartCutPathClosed = false;
            panel?.querySelector('#sc-trace-current')?.classList.add('hidden');
            this._smartCutHover = null;
        }
        this._updateSmartCutManualTraceUI(panel);
        this._updateSmartCutModeUI(panel);
        if (!this._smartCutEditMode && this.stage?.viewport) {
            this.stage.viewport.style.cursor = this._smartCutManualTraceEnabled ? 'crosshair' : 'default';
        }
        this.stage.requestRender();
    },

    _updateSmartCutManualTraceUI(panel) {
        if (!panel) return;
        const checkbox = panel.querySelector('#sc-enable-manual-trace');
        if (checkbox) checkbox.checked = !!this._smartCutManualTraceEnabled;
        this._scUpdateTraceButtons(panel);
    },

    _setSmartCutTraceThroughRegions(panel, enabled) {
        this._smartCutTraceThroughRegions = !!enabled;
        this._updateSmartCutTraceThroughUI(panel);
        this._updateSmartCutModeUI(panel);
        this.stage.requestRender();
    },

    _updateSmartCutTraceThroughUI(panel) {
        const btn = panel?.querySelector('#sc-trace-through-regions');
        if (!btn) return;
        const enabled = !!this._smartCutTraceThroughRegions;
        btn.classList.toggle('btn-primary', enabled);
        btn.classList.toggle('btn-secondary', !enabled);
        btn.classList.toggle('is-active', enabled);
        btn.innerHTML = enabled
            ? '<i class="fas fa-eye-slash"></i> Trace Through: On'
            : '<i class="fas fa-layer-group"></i> Trace Through Parts';
        btn.title = enabled
            ? 'Completed parts are dimmed and will not block tracing new overlapping parts'
            : 'Allow tracing inside or over completed parts without selecting/blocking them';
    },

    _updateSmartCutModeUI(panel) {
        if (!panel) return;
        this._updateSmartCutTraceThroughUI(panel);
        const toggleBtn = panel.querySelector('#sc-toggle-edit');
        const hint = panel.querySelector('#sc-trace-hints');
        if (toggleBtn) {
            if (this._smartCutEditMode) {
                toggleBtn.innerHTML = this._smartCutManualTraceEnabled
                    ? '<i class="fas fa-draw-polygon"></i> Back To Trace'
                    : '<i class="fas fa-ban"></i> Stop Editing';
                toggleBtn.classList.remove('btn-secondary');
                toggleBtn.classList.add('btn-primary');
                toggleBtn.disabled = false;
            } else {
                toggleBtn.innerHTML = '<i class="fas fa-pen-ruler"></i> Edit Selected Part';
                toggleBtn.classList.remove('btn-primary');
                toggleBtn.classList.add('btn-secondary');
                toggleBtn.disabled = !this._smartCutRegions.length;
            }
        }
        if (hint) {
            const traceThroughCopy = this._smartCutTraceThroughRegions
                ? ' Trace Through is on, so completed parts will not block a new trace.'
                : '';
            hint.innerHTML = this._smartCutEditMode
                ? 'Edit mode affects only the <strong>selected part</strong> in the list. Hover an edge for <strong>+ point</strong>, then right-click to add. Hover a point and right-click to delete.'
                : (this._smartCutManualTraceEnabled
                    ? '<kbd style="background:#334155;border:1px solid #475569;border-radius:3px;padding:1px 4px;font-size:10px">Click</kbd> place point &bull; <kbd style="background:#334155;border:1px solid #475569;border-radius:3px;padding:1px 4px;font-size:10px">Click start point</kbd> close shape &bull; <kbd style="background:#334155;border:1px solid #475569;border-radius:3px;padding:1px 4px;font-size:10px">Dbl-click body part</kbd> edit it &bull; <kbd style="background:#334155;border:1px solid #475569;border-radius:3px;padding:1px 4px;font-size:10px">Right-click</kbd> / <kbd style="background:#334155;border:1px solid #475569;border-radius:3px;padding:1px 4px;font-size:10px">Z</kbd> undo.' + traceThroughCopy
                    : 'Manual trace is off. Double-click body parts to edit them. Enable Manual Trace only when auto-trace missed a part and you need to draw an exception region.');
            if (this._smartCutPreset?.rigType === 'face-rig' && this._smartCutFaceWorkflow === 'guides') {
                hint.innerHTML = 'Drag each guide over the matching face part. Drag a corner to resize. Use Create Cut Regions to review and fine-tune before cutting, or Auto Cut From Guides to cut immediately.';
            }
        }
    },

    _updateSmartCutAutoUI(panel) {
        if (!panel) return;
        const supported = this._smartCutSupportsAutoTrace();
        const isFaceRig = this._smartCutPreset?.rigType === 'face-rig';
        const autoCard = panel.querySelector('#sc-auto-card');
        const faceWorkflowCard = panel.querySelector('#sc-face-workflow-card');
        if (autoCard) autoCard.classList.toggle('hidden', isFaceRig);
        if (faceWorkflowCard) faceWorkflowCard.classList.toggle('hidden', !isFaceRig);
        const traceBtn = panel.querySelector('#sc-auto-trace');
        const trainBtn = panel.querySelector('#sc-auto-train');
        const cutBtn = panel.querySelector('#sc-auto-cut');
        const note = panel.querySelector('#sc-auto-note');
        const copy = panel.querySelector('#sc-auto-copy');
        const samples = panel.querySelector('#sc-auto-samples');
        const exampleCount = this._getSmartCutTrainingSamples().length;
        if (traceBtn) traceBtn.disabled = !supported;
        if (trainBtn) trainBtn.disabled = !supported;
        if (cutBtn) cutBtn.disabled = !supported;
        if (copy) {
            copy.textContent = supported
                ? 'Auto Trace removes the background first, isolates the character silhouette, and fits body-part regions against that shape. Adjust the regions if needed, then save the approved layout as training so similar images auto-trace better next time.'
                : 'Automatic part seeding needs either a built-in body-map template or saved Smart Cut training for this preset. Use manual tracing here, or choose Human (Front) / Human (Side) for the automatic path.';
        }
        if (samples) {
            samples.textContent = exampleCount > 0
                ? `${exampleCount} saved training example${exampleCount === 1 ? '' : 's'} for this preset`
                : 'No saved training examples yet';
        }
        const clearBtn = panel.querySelector('#sc-clear-training');
        if (clearBtn) {
            clearBtn.style.display = exampleCount > 0 ? '' : 'none';
        }
        const useTrainingCheck = panel.querySelector('#sc-use-training');
        if (useTrainingCheck) {
            useTrainingCheck.parentElement.style.display = exampleCount > 0 ? '' : 'none';
        }
        if (note) {
            note.textContent = supported
                ? 'Recommended flow: Auto Trace Parts, adjust the regions only if needed, then click Save Layout Training. Manual trace stays off unless you explicitly enable it for an exception.'
                : 'Manual Smart Cut still works for this preset. Automatic part seeding is currently available on supported templates and any preset that already has saved Smart Cut training.';
        }
    },

    _setSmartCutFaceWorkflowUI(panel) {
        if (!panel) return;
        const isFaceRig = this._smartCutPreset?.rigType === 'face-rig';
        const card = panel.querySelector('#sc-face-workflow-card');
        if (card) card.classList.toggle('hidden', !isFaceRig);
        const workflow = this._smartCutFaceWorkflow || 'trace';
        const traceBtn = panel.querySelector('#sc-face-trace-workflow');
        const guideBtn = panel.querySelector('#sc-face-guide-workflow');
        if (traceBtn) {
            traceBtn.classList.toggle('is-active', workflow === 'trace');
            traceBtn.classList.toggle('btn-primary', workflow === 'trace');
            traceBtn.classList.toggle('btn-secondary', workflow !== 'trace');
        }
        if (guideBtn) {
            guideBtn.classList.toggle('is-active', workflow === 'guides');
            guideBtn.classList.toggle('btn-primary', workflow === 'guides');
            guideBtn.classList.toggle('btn-secondary', workflow !== 'guides');
        }
        const guideActions = panel.querySelector('#sc-face-guide-actions');
        if (guideActions) guideActions.classList.toggle('hidden', !isFaceRig || workflow !== 'guides');
        this._syncSmartCutFaceGuideLabelModeUI(panel);
        const traceHints = panel.querySelector('#sc-trace-hints');
        if (traceHints && isFaceRig && workflow === 'guides') {
            traceHints.innerHTML = 'Drag each guide over the matching face part. Drag a corner to resize. Use Create Cut Regions to review and fine-tune before cutting, or Auto Cut From Guides to cut immediately.';
        }
        if (isFaceRig && workflow === 'guides') this._updateSmartCutFaceGuideList(panel);
    },

    _getSmartCutFaceGuideSpecs() {
        return [
            { partKey: 'leftBrow', name: 'Left Brow', x: 0.29, y: 0.26, w: 0.20, h: 0.055, shape: 'capsule' },
            { partKey: 'rightBrow', name: 'Right Brow', x: 0.71, y: 0.26, w: 0.20, h: 0.055, shape: 'capsule' },
            { partKey: 'leftEye', name: 'Left Eye', x: 0.31, y: 0.36, w: 0.18, h: 0.105, shape: 'ellipse' },
            { partKey: 'rightEye', name: 'Right Eye', x: 0.69, y: 0.36, w: 0.18, h: 0.105, shape: 'ellipse' },
            { partKey: 'leftIris', name: 'Left Iris', x: 0.31, y: 0.36, w: 0.065, h: 0.075, shape: 'ellipse', optional: true, detailGroup: 'eye', enabled: false },
            { partKey: 'rightIris', name: 'Right Iris', x: 0.69, y: 0.36, w: 0.065, h: 0.075, shape: 'ellipse', optional: true, detailGroup: 'eye', enabled: false },
            { partKey: 'leftPupil', name: 'Left Pupil', x: 0.31, y: 0.36, w: 0.032, h: 0.038, shape: 'ellipse', optional: true, detailGroup: 'eye', enabled: false },
            { partKey: 'rightPupil', name: 'Right Pupil', x: 0.69, y: 0.36, w: 0.032, h: 0.038, shape: 'ellipse', optional: true, detailGroup: 'eye', enabled: false },
            { partKey: 'upperLip', name: 'Upper Lip', x: 0.50, y: 0.62, w: 0.28, h: 0.075, shape: 'capsule' },
            { partKey: 'mouthOpening', name: 'Mouth Opening / Gap', x: 0.50, y: 0.675, w: 0.23, h: 0.035, shape: 'capsule' },
            { partKey: 'lowerLip', name: 'Lower Lip', x: 0.50, y: 0.735, w: 0.27, h: 0.08, shape: 'capsule' },
            { partKey: 'teeth', name: 'Teeth', x: 0.50, y: 0.675, w: 0.18, h: 0.045, shape: 'capsule', optional: true }
        ];
    },

    _initSmartCutFaceGuides(panel, force = false) {
        const obj = this._smartCutObj;
        if (!obj || this._smartCutPreset?.rigType !== 'face-rig') return;
        if (this._smartCutFaceGuides?.length && !force) return;
        this._smartCutFaceGuides = this._getSmartCutFaceGuideSpecs().map(spec => ({
            ...spec,
            enabled: spec.enabled !== false,
            x: obj.x + (spec.x * obj.width) - (spec.w * obj.width / 2),
            y: obj.y + (spec.y * obj.height) - (spec.h * obj.height / 2),
            w: spec.w * obj.width,
            h: spec.h * obj.height
        }));
        this._smartCutFaceGuideDrag = null;
        this._smartCutFaceGuideHover = null;
        this._updateSmartCutFaceGuideList(panel);
        this._syncSmartCutFaceGuideLabelModeUI(panel);
        this.stage.requestRender();
    },

    _syncSmartCutFaceGuideLabelModeUI(panel = document.getElementById('smart-cut-panel')) {
        const select = panel?.querySelector('#sc-face-guide-label-mode');
        if (select) select.value = this._smartCutFaceLabelMode || 'auto';
    },

    _setSmartCutFaceGuideLabelMode(mode, panel = document.getElementById('smart-cut-panel')) {
        const normalized = ['auto', 'always', 'hide'].includes(mode) ? mode : 'auto';
        this._smartCutFaceLabelMode = normalized;
        try {
            localStorage.setItem('as.smartCut.faceGuideLabels', normalized);
        } catch (_) {}
        this._syncSmartCutFaceGuideLabelModeUI(panel);
        this.stage.requestRender();
        const label = normalized === 'always' ? 'always visible' : normalized === 'hide' ? 'hidden' : 'automatic';
        Utils.showToast(`Face guide labels: ${label}`, 'info');
    },

    _recordSmartCutFaceGuideEdit() {
        if (this._smartCutPreset?.rigType !== 'face-rig' || this._smartCutFaceWorkflow !== 'guides') return;
        this._smartCutFaceGuideEditCount = (this._smartCutFaceGuideEditCount || 0) + 1;
    },

    _shouldShowSmartCutFaceGuideLabels() {
        const mode = this._smartCutFaceLabelMode || 'auto';
        if (mode === 'always') return true;
        if (mode === 'hide') return false;
        const zoom = Math.max(0.001, this.stage?.zoom || 1);
        return (this._smartCutFaceGuideEditCount || 0) < 3 && zoom < 2.25;
    },

    _setSmartCutFaceEyeDetailGuidesEnabled(enabled, panel = document.getElementById('smart-cut-panel')) {
        if (!this._smartCutFaceGuides?.length) this._initSmartCutFaceGuides(panel, false);
        (this._smartCutFaceGuides || []).forEach(guide => {
            if (guide.detailGroup === 'eye') guide.enabled = !!enabled;
        });
        const toggle = panel?.querySelector('#sc-face-enable-eye-details');
        if (toggle) toggle.checked = !!enabled;
        this._updateSmartCutFaceGuideList(panel);
        this.stage.requestRender();
        Utils.showToast(`Iris/pupil detail guides ${enabled ? 'enabled' : 'disabled'}.`, 'info');
    },

    _setSmartCutFaceClosedMouthEnabled(enabled, panel = document.getElementById('smart-cut-panel')) {
        this._smartCutFaceClosedMouth = !!enabled;
        const toggle = panel?.querySelector('#sc-face-closed-mouth');
        if (toggle) toggle.checked = !!enabled;
        (this._smartCutFaceGuides || []).forEach(guide => {
            if (guide.partKey === 'mouthOpening') {
                guide.closedMouthGap = !!enabled;
                guide.name = enabled ? 'Closed Mouth Gap' : 'Mouth Opening / Gap';
                if (enabled) guide.shape = 'capsule';
            }
        });
        this._updateSmartCutFaceGuideList(panel);
        this.stage.requestRender();
        Utils.showToast(enabled
            ? 'Closed Mouth enabled: mouth gap will be generated for animation.'
            : 'Closed Mouth disabled: mouth opening will be cut from the image.',
            'info');
    },

    _isSmartCutFaceGuideEnabled(guide) {
        return !!guide && guide.enabled !== false;
    },

    _updateSmartCutFaceGuideList(panel) {
        if (!panel || this._smartCutFaceWorkflow !== 'guides') return;
        const list = panel.querySelector('#sc-regions-list');
        const counter = panel.querySelector('#sc-region-counter');
        const guides = this._smartCutFaceGuides || [];
        const activeCount = guides.filter(guide => this._isSmartCutFaceGuideEnabled(guide)).length;
        if (counter) counter.textContent = `(${activeCount}/${guides.length} guides)`;
        if (list) {
            list.innerHTML = guides.map((guide, index) => `
                <div class="sc-region-item ${this._smartCutFaceGuideHover?.index === index ? 'active' : ''} ${this._isSmartCutFaceGuideEnabled(guide) ? '' : 'muted'}" data-face-guide="${index}" style="${this._isSmartCutFaceGuideEnabled(guide) ? '' : 'opacity:.52'}">
                    <span class="sc-region-name"><i class="fas fa-crosshairs" style="color:#38bdf8"></i> ${guide.name}${guide.optional ? ' (optional)' : ''}${this._isSmartCutFaceGuideEnabled(guide) ? '' : ' - off'}</span>
                    <span class="sc-region-pts">${this._isSmartCutFaceGuideEnabled(guide) ? `${Math.round(guide.w)}x${Math.round(guide.h)}` : 'skip'}</span>
                </div>
            `).join('');
        }
    },

    _getSmartCutFaceGuideHit(stageX, stageY) {
        const guides = this._smartCutFaceGuides || [];
        const zoom = Math.max(0.001, this.stage?.zoom || 1);
        const handle = Math.max(7 / zoom, 4);
        for (let i = guides.length - 1; i >= 0; i--) {
            const g = guides[i];
            if (!this._isSmartCutFaceGuideEnabled(g)) continue;
            const corners = [
                ['nw', g.x, g.y],
                ['ne', g.x + g.w, g.y],
                ['sw', g.x, g.y + g.h],
                ['se', g.x + g.w, g.y + g.h]
            ];
            for (const [name, x, y] of corners) {
                if (Math.abs(stageX - x) <= handle && Math.abs(stageY - y) <= handle) {
                    return { index: i, handle: name };
                }
            }
            if (stageX >= g.x && stageX <= g.x + g.w && stageY >= g.y && stageY <= g.y + g.h) {
                return { index: i, handle: 'move' };
            }
        }
        return null;
    },

    _moveSmartCutFaceGuide(drag, pos) {
        const guide = this._smartCutFaceGuides?.[drag?.index];
        if (!guide) return;
        const minSize = Math.max(8, Math.min(this._smartCutObj?.width || 80, this._smartCutObj?.height || 80) * 0.025);
        const dx = pos.x - drag.lastX;
        const dy = pos.y - drag.lastY;
        drag.lastX = pos.x;
        drag.lastY = pos.y;
        if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) drag.moved = true;
        if (drag.handle === 'move') {
            guide.x += dx;
            guide.y += dy;
            return;
        }
        if (drag.handle.includes('w')) {
            guide.x += dx;
            guide.w -= dx;
        }
        if (drag.handle.includes('e')) guide.w += dx;
        if (drag.handle.includes('n')) {
            guide.y += dy;
            guide.h -= dy;
        }
        if (drag.handle.includes('s')) guide.h += dy;
        if (guide.w < minSize) {
            if (drag.handle.includes('w')) guide.x -= minSize - guide.w;
            guide.w = minSize;
        }
        if (guide.h < minSize) {
            if (drag.handle.includes('n')) guide.y -= minSize - guide.h;
            guide.h = minSize;
        }
    },

    _smartCutEllipsePath(cx, cy, rx, ry, segments = 24) {
        return Array.from({ length: segments }, (_, i) => {
            const angle = (Math.PI * 2 * i) / segments;
            return { x: cx + Math.cos(angle) * rx, y: cy + Math.sin(angle) * ry };
        });
    },

    _smartCutCapsulePath(x, y, w, h, segments = 10) {
        const r = Math.min(w, h) / 2;
        const left = x + r;
        const right = x + w - r;
        const cy = y + h / 2;
        const pts = [];
        for (let i = 0; i <= segments; i++) {
            const a = Math.PI / 2 + (Math.PI * i) / segments;
            pts.push({ x: left + Math.cos(a) * r, y: cy + Math.sin(a) * r });
        }
        for (let i = 0; i <= segments; i++) {
            const a = -Math.PI / 2 + (Math.PI * i) / segments;
            pts.push({ x: right + Math.cos(a) * r, y: cy + Math.sin(a) * r });
        }
        return pts;
    },

    _smartCutFaceGuideToPath(guide) {
        const pad = guide.optional ? 0 : Math.max(1, Math.min(guide.w, guide.h) * 0.08);
        const x = guide.x - pad;
        const y = guide.y - pad;
        const w = guide.w + pad * 2;
        const h = guide.h + pad * 2;
        if (guide.shape === 'ellipse') {
            return this._smartCutEllipsePath(x + w / 2, y + h / 2, w / 2, h / 2, 28);
        }
        return this._smartCutCapsulePath(x, y, w, h, 12);
    },

    _createSmartCutFaceRegionsFromGuides(panel, quiet = false) {
        if (this._smartCutPreset?.rigType !== 'face-rig') return false;
        this._initSmartCutFaceGuides(panel, false);
        const guides = (this._smartCutFaceGuides || [])
            .filter(guide => this._isSmartCutFaceGuideEnabled(guide))
            .filter(guide => guide.w > 4 && guide.h > 4);
        if (guides.length < 2) {
            Utils.showToast('Place at least two face guides before cutting', 'warning');
            return false;
        }
        this._smartCutRegions = guides.map(guide => ({
            path: this._simplifySmartCutPolygon(this._smartCutFaceGuideToPath(guide)),
            label: guide.partKey,
            name: guide.name,
            locked: false,
            source: 'face-guide',
            closedMouthGap: guide.partKey === 'mouthOpening' && !!(guide.closedMouthGap || this._smartCutFaceClosedMouth)
        })).filter(region => region.path.length >= 3);
        this._smartCutSelectedRegion = this._smartCutRegions.length ? 0 : null;
        this._smartCutCurrentPath = [];
        this._smartCutPathClosed = false;
        this._smartCutFaceWorkflow = 'trace';
        panel?.querySelector('#sc-trace-current')?.classList.add('hidden');
        this._setSmartCutFaceWorkflowUI(panel);
        this._setSmartCutEditMode(panel, true);
        this._updatePartSelect(panel);
        this._updateRegionsList(panel);
        this.stage.requestRender();
        if (!quiet) Utils.showToast(`Created ${this._smartCutRegions.length} editable cut regions. Hover edges for + point, right-click to add or delete points.`, 'success');
        return this._smartCutRegions.length >= 2;
    },

    _getSmartCutFacePartDefinition(partKey, preset = this._smartCutPreset) {
        if (!partKey || !Array.isArray(preset?.parts)) return null;
        return preset.parts.find(part => part.partKey === partKey) || null;
    },

    _getSmartCutFaceRole(partKey, preset = this._smartCutPreset) {
        const part = this._getSmartCutFacePartDefinition(partKey, preset);
        const fallbackRoles = {
            leftEye: 'left-eye-sclera',
            rightEye: 'right-eye-sclera',
            leftIris: 'left-iris',
            rightIris: 'right-iris',
            leftPupil: 'left-pupil',
            rightPupil: 'right-pupil',
            leftBrow: 'left-eyebrow',
            rightBrow: 'right-eyebrow',
            upperLip: 'upper-lip',
            lowerLip: 'lower-lip',
            mouthOpening: 'mouth-opening',
            teeth: 'teeth'
        };
        return part?.faceRole || fallbackRoles[partKey] || String(partKey || 'face-part');
    },

    _tagSmartCutFacePart(obj, region, preset, cutMode) {
        if (!obj || !region) return;
        const role = this._getSmartCutFaceRole(region.label, preset);
        const partDef = this._getSmartCutFacePartDefinition(region.label, preset);
        const quality = this._getSmartCutFaceQualitySettings(region, preset, 1);
        obj.faceSet = {
            ...(obj.faceSet || {}),
            type: 'smartcut-face-part',
            source: 'smart-cut',
            presetKey: preset?.key || 'face-rig-parts',
            presetName: preset?.name || 'SmartCut Face Parts',
            role,
            partKey: region.label,
            partName: partDef?.name || region.name || role,
            cutMode,
            keepBaseImage: true,
            feather: quality.feather,
            overlap: quality.overlap,
            gapFillMode: 'base-image'
        };
        obj._smartCutFacePart = true;
        obj._smartCutFaceRole = role;
        obj._smartCutFacePartKey = region.label;
        obj._smartCutFaceGapFillMode = 'base-image';
        obj.tags = Array.from(new Set([
            ...(Array.isArray(obj.tags) ? obj.tags : []),
            'universal-face',
            'smartcut-face',
            `face-role:${role}`,
            `face-part:${role}`,
            `face-part-key:${region.label}`
        ]));
    },

    _getSmartCutFaceQualitySettings(region, preset = this._smartCutPreset, scaleF = 1) {
        const baseFeather = Math.max(0, Number(preset?.faceCut?.feather) || 0);
        const baseOverlap = Math.max(0, Number(preset?.faceCut?.overlap) || 0);
        const key = String(region?.label || '').toLowerCase();
        const multipliers = {
            lefteye: { feather: 1.0, overlap: 1.0 },
            righteye: { feather: 1.0, overlap: 1.0 },
            leftbrow: { feather: 0.85, overlap: 0.7 },
            rightbrow: { feather: 0.85, overlap: 0.7 },
            upperlip: { feather: 1.1, overlap: 1.15 },
            lowerlip: { feather: 1.1, overlap: 1.15 },
            mouthopening: { feather: 0.45, overlap: 0.35 },
            teeth: { feather: 0.35, overlap: 0.15 }
        };
        const multiplier = multipliers[key] || { feather: 1, overlap: 1 };
        return {
            feather: Math.max(0, baseFeather * multiplier.feather * scaleF),
            overlap: Math.max(0, baseOverlap * multiplier.overlap * scaleF)
        };
    },

    _getSmartCutFacePatchColor(srcCanvas, pathPoints, options = {}) {
        if (!srcCanvas || !pathPoints?.length) return 'rgba(220, 180, 150, 0.95)';
        const role = String(options.role || '').toLowerCase();
        const preferSkin = !!options.preferSkin || role.includes('eyebrow') || role.includes('lip');
        const cw = srcCanvas.width;
        const ch = srcCanvas.height;
        const minX = Math.max(0, Math.floor(Math.min(...pathPoints.map(p => p.x))));
        const minY = Math.max(0, Math.floor(Math.min(...pathPoints.map(p => p.y))));
        const maxX = Math.min(cw - 1, Math.ceil(Math.max(...pathPoints.map(p => p.x))));
        const maxY = Math.min(ch - 1, Math.ceil(Math.max(...pathPoints.map(p => p.y))));
        const pad = Math.max(8, Math.round(Math.min(maxX - minX + 1, maxY - minY + 1) * 0.45));
        const x0 = Math.max(0, minX - pad);
        const y0 = Math.max(0, minY - pad);
        const x1 = Math.min(cw - 1, maxX + pad);
        const y1 = Math.min(ch - 1, maxY + pad);
        const w = Math.max(1, x1 - x0 + 1);
        const h = Math.max(1, y1 - y0 + 1);

        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = cw;
        maskCanvas.height = ch;
        const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
        this._scDrawSmartCutMaskPath(maskCtx, pathPoints);
        maskCtx.fillStyle = '#fff';
        maskCtx.fill();

        const srcCtx = srcCanvas.getContext('2d', { willReadFrequently: true });
        const img = srcCtx.getImageData(x0, y0, w, h).data;
        const mask = maskCtx.getImageData(x0, y0, w, h).data;
        let r = 0, g = 0, b = 0, a = 0, count = 0;
        let skinR = 0, skinG = 0, skinB = 0, skinA = 0, skinCount = 0;
        const addSample = (i) => {
            const alpha = img[i + 3];
            if (alpha <= 20) return;
            const pr = img[i];
            const pg = img[i + 1];
            const pb = img[i + 2];
            r += pr * alpha;
            g += pg * alpha;
            b += pb * alpha;
            a += alpha;
            count += alpha;
            if (preferSkin) {
                const max = Math.max(pr, pg, pb);
                const min = Math.min(pr, pg, pb);
                const saturation = max ? (max - min) / max : 0;
                const luminance = 0.2126 * pr + 0.7152 * pg + 0.0722 * pb;
                const redDominance = pr - Math.max(pg, pb);
                const looksLikeSkinBase = luminance >= 58 && luminance <= 242 && saturation <= 0.58;
                const notLipRed = !(redDominance > 34 && saturation > 0.32);
                const notBrowDark = luminance > 82 || saturation < 0.22;
                if (looksLikeSkinBase && notLipRed && notBrowDark) {
                    const weight = alpha * Math.max(0.2, 1 - saturation);
                    skinR += pr * weight;
                    skinG += pg * weight;
                    skinB += pb * weight;
                    skinA += alpha;
                    skinCount += weight;
                }
            }
        };

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const idx = (y * w + x) * 4;
                if (mask[idx + 3] < 12) addSample(idx);
            }
        }
        if (count < 255 * 8) {
            r = 0; g = 0; b = 0; a = 0; count = 0;
            for (let i = 0; i < img.length; i += 4) addSample(i);
        }
        if (preferSkin && skinCount > 255 * 4) {
            return `rgba(${Math.round(skinR / skinCount)}, ${Math.round(skinG / skinCount)}, ${Math.round(skinB / skinCount)}, ${Math.max(0.72, Math.min(1, skinA / (skinCount || 1))).toFixed(3)})`;
        }
        if (count <= 0) return 'rgba(220, 180, 150, 0.95)';
        return `rgba(${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(b / count)}, ${Math.max(0.65, Math.min(1, a / count)).toFixed(3)})`;
    },

    _createSmartCutFacePatchCanvas(srcCanvas, pathPoints, cw, ch, options = {}) {
        const feather = Math.max(1, Number(options.feather) || 2);
        const color = options.color || this._getSmartCutFacePatchColor(srcCanvas, pathPoints, options);
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = cw;
        maskCanvas.height = ch;
        const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
        maskCtx.save();
        maskCtx.filter = `blur(${feather}px)`;
        this._scDrawSmartCutMaskPath(maskCtx, pathPoints);
        maskCtx.fillStyle = '#fff';
        maskCtx.fill();
        maskCtx.restore();
        this._scDrawSmartCutMaskPath(maskCtx, pathPoints);
        maskCtx.fillStyle = '#fff';
        maskCtx.fill();

        const result = document.createElement('canvas');
        result.width = cw;
        result.height = ch;
        const ctx = result.getContext('2d', { willReadFrequently: true });
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, cw, ch);
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(maskCanvas, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
        return result;
    },

    _tagSmartCutFacePatch(obj, region, preset, sourcePartId) {
        if (!obj || !region) return;
        const role = this._getSmartCutFaceRole(region.label, preset);
        obj.name = `${region.name || role} Base Cover`;
        obj.locked = true;
        obj._smartCutFacePatch = true;
        obj._smartCutFaceRole = role;
        obj._smartCutFacePartKey = region.label;
        obj._smartCutFaceSourcePartId = sourcePartId || null;
        obj._smartCutCoverFillMode = 'auto';
        if (role.includes('iris') || role.includes('pupil')) obj._smartCutCoverPurpose = 'hide-original-eye-feature';
        else if (role.includes('eyebrow')) obj._smartCutCoverPurpose = 'hide-original-brow';
        else if (role.includes('lip')) obj._smartCutCoverPurpose = 'hide-original-lip';
        else if (role === 'mouth-opening') obj._smartCutCoverPurpose = 'support-dark-mouth-opening';
        obj.tags = Array.from(new Set([
            ...(Array.isArray(obj.tags) ? obj.tags : []),
            'universal-face-cover',
            'smartcut-face-cover',
            `face-cover:${region.label}`,
            `face-role:${role}`,
            `face-part-key:${region.label}`
        ]));
    },

    _rgbaToHex(color, fallback = '#f8fafc') {
        if (!color || typeof color !== 'string') return fallback;
        const hex = color.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
        if (hex) {
            const value = hex[1];
            if (value.length === 3) return `#${value.split('').map(ch => ch + ch).join('')}`.toLowerCase();
            return `#${value}`.toLowerCase();
        }
        const rgba = color.match(/rgba?\(([^)]+)\)/i);
        if (!rgba) return fallback;
        const parts = rgba[1].split(',').map(part => Number(String(part).trim()));
        if (parts.length < 3 || parts.slice(0, 3).some(value => !Number.isFinite(value))) return fallback;
        return `#${parts.slice(0, 3).map(value => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')).join('')}`;
    },

    _sampleSmartCutPartScleraColor(partObj) {
        const canvas = partObj?._tempTrimmedCanvas;
        if (!canvas?.width || !canvas?.height) return null;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
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
        if (weight > 0.8) {
            return `#${[r / weight, g / weight, b / weight]
                .map(value => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0'))
                .join('')}`;
        }
        if (fallbackWeight > 0) {
            return `#${[fallbackR / fallbackWeight, fallbackG / fallbackWeight, fallbackB / fallbackWeight]
                .map(value => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0'))
                .join('')}`;
        }
        return null;
    },

    _renderSmartCutCoverAsSolidColor(cover, color) {
        if (!cover?._smartCutCoverOriginalCanvas && !cover?.imageElement && !cover?.imageSrc) return false;
        const maskSource = cover._smartCutCoverOriginalCanvas || cover.imageElement;
        const width = Math.max(1, maskSource?.naturalWidth || maskSource?.width || Math.round(cover.width || 1));
        const height = Math.max(1, maskSource?.naturalHeight || maskSource?.height || Math.round(cover.height || 1));
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = width;
        maskCanvas.height = height;
        const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
        if (maskSource) maskCtx.drawImage(maskSource, 0, 0, width, height);
        else return false;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.fillStyle = color || '#f8fafc';
        ctx.fillRect(0, 0, width, height);
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(maskCanvas, 0, 0, width, height);
        ctx.globalCompositeOperation = 'source-over';

        const dataUrl = canvas.toDataURL('image/png');
        if (!cover._smartCutCoverOriginalSrc && cover.imageSrc) cover._smartCutCoverOriginalSrc = cover.imageSrc;
        cover.imageSrc = dataUrl;
        cover.loadImage?.(dataUrl);
        cover._smartCutCoverFillMode = 'solid';
        cover._smartCutCoverFillA = color;
        return true;
    },

    _applyScleraColorToSmartCutEyeFeatureCovers(createdParts = {}, coverPatches = {}) {
        const pairs = [
            { side: 'left', scleraKey: 'leftEye', coverKeys: ['leftIris', 'leftPupil'] },
            { side: 'right', scleraKey: 'rightEye', coverKeys: ['rightIris', 'rightPupil'] }
        ];
        let changed = 0;
        pairs.forEach(pair => {
            const scleraColor = this._sampleSmartCutPartScleraColor(createdParts[pair.scleraKey]) || '#f8fafc';
            pair.coverKeys.forEach(coverKey => {
                const cover = coverPatches[coverKey];
                if (!cover) return;
                if (this._renderSmartCutCoverAsSolidColor(cover, scleraColor)) {
                    cover._smartCutCoverFillRole = `${pair.side}-sclera`;
                    cover._smartCutCoverFillA = scleraColor;
                    cover._smartCutCoverAutoSource = pair.scleraKey;
                    cover._smartCutCoverPurpose = 'hide-original-eye-feature';
                    changed += 1;
                }
            });
        });
        return changed;
    },

    _createSmartCutClosedMouthGapCanvas(localPath, cw, ch, options = {}) {
        const canvas = document.createElement('canvas');
        canvas.width = cw;
        canvas.height = ch;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!Array.isArray(localPath) || localPath.length < 3) return canvas;
        const minX = Math.min(...localPath.map(point => point.x));
        const maxX = Math.max(...localPath.map(point => point.x));
        const minY = Math.min(...localPath.map(point => point.y));
        const maxY = Math.max(...localPath.map(point => point.y));
        const width = Math.max(1, maxX - minX);
        const height = Math.max(1, maxY - minY);

        const grad = ctx.createLinearGradient(minX, minY, minX, maxY);
        grad.addColorStop(0, options.topColor || 'rgba(48, 12, 20, 0.92)');
        grad.addColorStop(0.42, options.midColor || 'rgba(4, 3, 7, 0.98)');
        grad.addColorStop(1, options.bottomColor || 'rgba(62, 16, 24, 0.9)');

        ctx.save();
        ctx.beginPath();
        localPath.forEach((point, index) => {
            if (index === 0) ctx.moveTo(point.x, point.y);
            else ctx.lineTo(point.x, point.y);
        });
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.42)';
        ctx.shadowBlur = Math.max(1, height * 0.2);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.beginPath();
        const insetY = Math.max(1, height * 0.14);
        const insetX = Math.max(1, width * 0.04);
        ctx.ellipse(minX + width / 2, minY + height / 2, Math.max(1, width / 2 - insetX), Math.max(1, height / 2 - insetY), 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.46)';
        ctx.fill();
        ctx.restore();
        return canvas;
    },

    _getSmartCutFaceStackRank(obj) {
        const role = String(obj?._smartCutFaceRole || obj?.faceSet?.role || '').toLowerCase();
        if (obj?._smartCutFacePatch) return 0;
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

    _sortSmartCutFaceMembersForRender(members = []) {
        const list = Array.isArray(this.objects?.objects) ? this.objects.objects : null;
        if (!list || !members.length) return;
        const memberSet = new Set(members.filter(Boolean));
        const indexed = members
            .filter(obj => obj && list.includes(obj))
            .map(obj => ({ obj, index: list.indexOf(obj), rank: this._getSmartCutFaceStackRank(obj) }))
            .sort((a, b) => (a.rank - b.rank) || (a.index - b.index));
        if (!indexed.length) return;
        const insertAt = Math.min(...indexed.map(item => item.index));
        const remaining = list.filter(obj => !memberSet.has(obj));
        remaining.splice(insertAt, 0, ...indexed.map(item => item.obj));
        this.objects.objects = remaining;
    },

    _expandSmartCutPath(pathPoints, amount = 0) {
        if (!pathPoints?.length || amount <= 0) return pathPoints || [];
        const cx = pathPoints.reduce((sum, point) => sum + point.x, 0) / pathPoints.length;
        const cy = pathPoints.reduce((sum, point) => sum + point.y, 0) / pathPoints.length;
        return pathPoints.map(point => {
            const dx = point.x - cx;
            const dy = point.y - cy;
            const len = Math.hypot(dx, dy) || 1;
            return {
                x: point.x + (dx / len) * amount,
                y: point.y + (dy / len) * amount
            };
        });
    },

    _finalizeSmartCutFaceSet(createdParts, preset, sourceObj, cutMode, coverPatches = {}) {
        const parts = Object.values(createdParts || {}).filter(Boolean);
        if (!parts.length) return null;
        const patches = Object.values(coverPatches || {}).filter(Boolean);
        const eyeFeatureCoverCount = this._applyScleraColorToSmartCutEyeFeatureCovers(createdParts, coverPatches);
        const members = [...patches, ...parts];
        this._sortSmartCutFaceMembersForRender(members);
        const groupId = Utils.generateId('grp');
        if (!this.objects.groups) this.objects.groups = {};
        if (!this.objects.groupNames) this.objects.groupNames = {};
        this.objects.groups[groupId] = members.map(part => part.id);
        this.objects.groupNames[groupId] = 'Universal Face - SmartCut Parts';
        members.forEach(part => {
            part.groupId = groupId;
        });
        parts.forEach(part => {
            part.faceSet = {
                ...(part.faceSet || {}),
                groupId,
                groupName: this.objects.groupNames[groupId]
            };
        });

        if (sourceObj) {
            sourceObj.visible = true;
            sourceObj.opacity = Number.isFinite(Number(sourceObj.opacity)) ? Math.max(0.01, Number(sourceObj.opacity)) : 1;
            sourceObj._smartCutFaceBase = true;
            sourceObj._smartCutFaceGroupId = groupId;
            sourceObj.tags = Array.from(new Set([
                ...(Array.isArray(sourceObj.tags) ? sourceObj.tags : []),
                'universal-face-base',
                'smartcut-face-base'
            ]));
        }

        return {
            groupId,
            count: parts.length,
            patchCount: patches.length,
            partIds: parts.map(part => part.id),
            patchIds: patches.map(part => part.id),
            irisScleraCoverCount: eyeFeatureCoverCount,
            eyeFeatureCoverCount,
            sourceId: sourceObj?.id || null,
            cutMode,
            presetKey: preset?.key || 'face-rig-parts'
        };
    },

    _getSmartCutFacePartRole(obj) {
        if (obj?.faceSet?.role) return obj.faceSet.role;
        if (obj?._smartCutFaceRole) return obj._smartCutFaceRole;
        const tags = Array.isArray(obj?.tags) ? obj.tags : [];
        const roleTag = tags.find(tag => String(tag).startsWith('face-role:'))
            || tags.find(tag => String(tag).startsWith('face-part:'));
        return roleTag ? String(roleTag).slice(String(roleTag).indexOf(':') + 1) : '';
    },

    _analyzeSmartCutFaceReadiness(createdParts = {}, sourceObj = null) {
        const parts = Object.values(createdParts || {}).filter(Boolean);
        const byRole = new Map();
        parts.forEach(part => {
            const role = this._getSmartCutFacePartRole(part);
            if (role) byRole.set(role, part);
        });

        const required = [
            ['left-eye-sclera', 'Left eye'],
            ['right-eye-sclera', 'Right eye'],
            ['left-eyebrow', 'Left brow'],
            ['right-eyebrow', 'Right brow'],
            ['upper-lip', 'Upper lip'],
            ['lower-lip', 'Lower lip'],
            ['mouth-opening', 'Mouth opening']
        ];
        const missing = required.filter(([role]) => !byRole.has(role)).map(([, label]) => label);

        const sourceArea = Math.max(1, Number(sourceObj?.width || 0) * Number(sourceObj?.height || 0));
        const small = [];
        const smallIds = [];
        parts.forEach(part => {
            const role = this._getSmartCutFacePartRole(part);
            if (!role || role === 'teeth') return;
            const areaRatio = (Math.max(1, Number(part.width || 0)) * Math.max(1, Number(part.height || 0))) / sourceArea;
            const minSide = Math.min(Number(part.width || 0), Number(part.height || 0));
            if (areaRatio < 0.0007 || minSide < 5) {
                const label = part.faceSet?.partName || part.name || role;
                small.push(label);
                smallIds.push(part.id);
            }
        });

        const hasMouthMotion = byRole.has('mouth-opening') && byRole.has('upper-lip') && byRole.has('lower-lip');
        const hasEyeMotion = byRole.has('left-eye-sclera') || byRole.has('right-eye-sclera');
        const score = Math.max(0, 100 - (missing.length * 12) - (small.length * 6) - (!hasMouthMotion ? 10 : 0) - (!hasEyeMotion ? 10 : 0));
        const status = missing.length || small.length ? (score >= 70 ? 'review' : 'needs-work') : 'ready';

        return {
            status,
            score,
            missing,
            small,
            smallIds,
            hasMouthMotion,
            hasEyeMotion,
            partCount: parts.length
        };
    },

    _renderSmartCutFaceReadiness(panel, readiness) {
        const box = panel?.querySelector('#sc-face-readiness');
        if (!box || !readiness) return;
        const icon = readiness.status === 'ready' ? 'fa-circle-check' : (readiness.status === 'review' ? 'fa-triangle-exclamation' : 'fa-circle-exclamation');
        const title = readiness.status === 'ready' ? 'Ready to animate' : (readiness.status === 'review' ? 'Review before animating' : 'Needs a quick fix');
        const details = [];
        details.push(`${readiness.partCount} face part${readiness.partCount === 1 ? '' : 's'} found`);
        if (readiness.missing.length) details.push(`Missing: ${readiness.missing.join(', ')}`);
        if (readiness.small.length) details.push(`Very small: ${readiness.small.slice(0, 4).join(', ')}${readiness.small.length > 4 ? '...' : ''}`);
        if (!readiness.hasMouthMotion) details.push('Talk needs upper lip, lower lip, and mouth opening');
        if (!readiness.hasEyeMotion) details.push('Blink needs at least one eye part');
        box.className = `smc-face-readiness smc-face-readiness-${readiness.status}`;
        box.innerHTML = `
            <div class="smc-face-readiness-title"><i class="fas ${icon}"></i> ${Utils.escapeHtml(title)} <span>${Math.round(readiness.score)}%</span></div>
            <ul>${details.map(item => `<li>${Utils.escapeHtml(item)}</li>`).join('')}</ul>
        `;
    },

    _bindSmartCutFaceTestActions(panel, faceSetInfo, createdParts = {}) {
        const actions = panel?.querySelector('#sc-face-test-actions');
        if (!actions) return;
        actions.classList.remove('hidden');
        actions.querySelectorAll('[data-scm-face-test]').forEach(button => {
            button.addEventListener('click', () => {
                const key = button.dataset.scmFaceTest || 'smile';
                this._handoffSmartCutFaceSetToUniversalFace(faceSetInfo, createdParts);
                const manager = (typeof window !== 'undefined' && window.app?.faceRig) ? window.app.faceRig : null;
                const runPreview = () => {
                    if (typeof manager?.previewFaceMotion === 'function') {
                        manager.previewFaceMotion(key, { scope: 'selected', rangeSec: key === 'talk' ? 2.4 : 1.4, intensity: 'strong' });
                    } else if (typeof manager?.applyFaceMotion === 'function') {
                        manager.applyFaceMotion(key, { scope: 'selected', rangeSec: key === 'talk' ? 2.4 : 1.4, previewMode: true });
                    }
                };
                if (typeof window !== 'undefined' && typeof window.setTimeout === 'function') window.setTimeout(runPreview, 40);
                else runPreview();
            });
        });
    },

    _bindSmartCutFaceOpenAction(panel, faceSetInfo, createdParts = {}) {
        const button = panel?.querySelector('#sc-btn-open-universal-face');
        if (!button) return;
        button.classList.remove('hidden');
        button.addEventListener('click', () => {
            this._handoffSmartCutFaceSetToUniversalFace(faceSetInfo, createdParts, {
                forceOpenPanel: true,
                focusControls: true
            });
            Utils.showToast('Universal Face controls are open for the selected SmartCut face parts.', 'success');
        });
    },

    _selectSmartCutFaceIds(ids = [], toast = '') {
        const validIds = [...new Set((ids || []).filter(id => this.objects?.getObjectById?.(id)))];
        if (!validIds.length) {
            Utils.showToast('No matching face parts to select.', 'info');
            return false;
        }
        if (typeof this.objects?.select === 'function') {
            this.objects.select(validIds);
        } else if (this.objects) {
            this.objects.selectedIds = validIds;
            this.objects.updateProperties?.();
            this.objects.updateObjectList?.();
            this.stage?.requestRender?.();
            eventBus.emit('selection:changed', validIds);
        }
        if (toast) Utils.showToast(toast, 'info');
        return true;
    },

    _getSmartCutFaceIdsByRoles(partIds = [], roles = []) {
        const roleSet = new Set((roles || []).map(role => String(role || '').toLowerCase()).filter(Boolean));
        if (!roleSet.size) return [];
        return [...new Set((partIds || []).filter(id => {
            const obj = this.objects?.getObjectById?.(id);
            const role = String(this._getSmartCutFacePartRole(obj) || '').toLowerCase();
            return role && roleSet.has(role);
        }))];
    },

    _bindSmartCutFaceRepairActions(panel, faceSetInfo, createdParts = {}, readiness = null) {
        const actions = panel?.querySelector('#sc-face-repair-actions');
        if (!actions) return;
        actions.classList.remove('hidden');
        const partIds = Array.isArray(faceSetInfo?.partIds) ? faceSetInfo.partIds : Object.values(createdParts || {}).filter(Boolean).map(part => part.id);
        const patchIds = Array.isArray(faceSetInfo?.patchIds) ? faceSetInfo.patchIds : [];
        const sourceId = faceSetInfo?.sourceId || null;
        const reviewIds = Array.isArray(readiness?.smallIds) ? readiness.smallIds : [];
        const eyeIds = this._getSmartCutFaceIdsByRoles(partIds, ['left-eye-sclera', 'right-eye-sclera']);
        const browIds = this._getSmartCutFaceIdsByRoles(partIds, ['left-eyebrow', 'right-eyebrow']);
        const mouthIds = this._getSmartCutFaceIdsByRoles(partIds, ['upper-lip', 'lower-lip', 'mouth-opening', 'teeth']);
        let coversVisible = true;
        let baseVisible = true;

        actions.querySelectorAll('[data-scm-face-repair]').forEach(button => {
            button.addEventListener('click', () => {
                const action = button.dataset.scmFaceRepair || '';
                if (action === 'select-parts') {
                    this._selectSmartCutFaceIds(partIds, 'Selected SmartCut face parts.');
                    return;
                }
                if (action === 'focus-eyes') {
                    this._selectSmartCutFaceIds(eyeIds, 'Selected eye parts for adjustment.');
                    return;
                }
                if (action === 'focus-brows') {
                    this._selectSmartCutFaceIds(browIds, 'Selected eyebrow parts for adjustment.');
                    return;
                }
                if (action === 'focus-mouth') {
                    this._selectSmartCutFaceIds(mouthIds, 'Selected mouth parts for adjustment.');
                    return;
                }
                if (action === 'select-review') {
                    if (reviewIds.length) {
                        this._selectSmartCutFaceIds(reviewIds, 'Selected parts that may need resizing or recutting.');
                    } else {
                        this._selectSmartCutFaceIds(partIds, 'No tiny parts found, so all face parts are selected.');
                    }
                    return;
                }
                if (action === 'select-covers') {
                    if (patchIds.length) {
                        this._selectSmartCutFaceIds(patchIds, 'Selected SmartCut soft cover layers.');
                    } else {
                        Utils.showToast('No cover layers were created for this face set.', 'info');
                    }
                    return;
                }
                if (action === 'toggle-covers') {
                    if (!patchIds.length) {
                        Utils.showToast('No cover layers were created for this face set.', 'info');
                        return;
                    }
                    coversVisible = !coversVisible;
                    patchIds.forEach(id => {
                        const obj = this.objects?.getObjectById?.(id);
                        if (obj) obj.visible = coversVisible;
                    });
                    button.innerHTML = `<i class="fas fa-layer-group"></i> ${coversVisible ? 'Hide' : 'Show'} Covers`;
                    this.objects?.updateObjectList?.();
                    this.stage?.requestRender?.();
                    eventBus.emit('timeline:update');
                    Utils.showToast(`${coversVisible ? 'Showing' : 'Hiding'} SmartCut cover layers.`, 'info');
                    return;
                }
                if (action === 'toggle-base') {
                    const source = sourceId ? this.objects?.getObjectById?.(sourceId) : null;
                    if (!source) {
                        Utils.showToast('Original base image is not available for this face set.', 'info');
                        return;
                    }
                    baseVisible = !baseVisible;
                    source.visible = baseVisible;
                    button.innerHTML = `<i class="fas fa-image"></i> ${baseVisible ? 'Hide' : 'Show'} Base`;
                    this.objects?.updateObjectList?.();
                    this.stage?.requestRender?.();
                    eventBus.emit('timeline:update');
                    Utils.showToast(`${baseVisible ? 'Showing' : 'Hiding'} original base image.`, 'info');
                }
            });
        });
    },

    _openRightPanelForUniversalFace() {
        if (typeof document === 'undefined') return;
        const rightPanel = document.getElementById('right-panel');
        if (!rightPanel) return;

        rightPanel.classList.remove('layout-hidden', 'mobile-open');
        if (rightPanel.classList.contains('collapsed')) {
            const expandBtn = document.getElementById('cvbar-expand-right');
            const toggleBtn = document.getElementById('toggle-right');
            if (expandBtn) {
                expandBtn.click();
            } else if (toggleBtn) {
                toggleBtn.click();
            } else {
                rightPanel.classList.remove('collapsed');
            }
        }

        const propertiesTab = rightPanel.querySelector('.panel-tab[data-tab="properties"], .panel-tab[data-tab="objects"]');
        propertiesTab?.click?.();
    },

    _focusUniversalFacePropertiesPanel() {
        if (typeof document === 'undefined') return;
        const section = document.getElementById('face-rig-properties-section');
        if (!section) return;
        section.classList.remove('hidden');
        section.open = true;
        if (typeof section.scrollIntoView === 'function') {
            window.setTimeout(() => section.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
        }
    },

    _handoffSmartCutFaceSetToUniversalFace(faceSetInfo, createdParts = {}, options = {}) {
        const partIds = Array.isArray(faceSetInfo?.partIds) && faceSetInfo.partIds.length
            ? faceSetInfo.partIds
            : Object.values(createdParts || {}).filter(Boolean).map(part => part.id);
        if (!partIds.length) return;

        if (typeof this.objects?.select === 'function') {
            this.objects.select(partIds);
        } else if (this.objects) {
            this.objects.selectedIds = [...partIds];
        }

        const manager = (typeof window !== 'undefined' && window.app?.faceRig) ? window.app.faceRig : null;
        const openFaceControls = () => {
            if (options.forceOpenPanel || options.focusControls) {
                this._openRightPanelForUniversalFace();
            }
            if (!manager) return;
            if (typeof manager.startForSelection === 'function') {
                manager.startForSelection();
            } else {
                manager.active = true;
                manager.showPanel?.(true);
                manager.updatePropertiesPanelVisibility?.();
            }
            manager.setStatus?.('SmartCut face parts are selected. Choose a movement or Text Lip Sync to animate them.');
            manager.updatePropertiesPanelVisibility?.();
            if (options.focusControls) {
                this._focusUniversalFacePropertiesPanel();
            }
        };

        if (typeof window !== 'undefined' && typeof window.setTimeout === 'function') {
            window.setTimeout(openFaceControls, 0);
        } else {
            openFaceControls();
        }

        eventBus.emit('face:set-created', {
            source: 'smart-cut',
            groupId: faceSetInfo?.groupId || null,
            partIds: [...partIds],
            patchIds: Array.isArray(faceSetInfo?.patchIds) ? [...faceSetInfo.patchIds] : []
        });
    },

    _saveSmartCutTrainingFromCurrentLayout(panel, button = null) {
        if (!this._smartCutPreset?.key) {
            Utils.showToast('Choose a Smart Cut preset first', 'info');
            return;
        }
        if (!this._smartCutAutoOutline?.length || !this._smartCutRegions?.length) {
            Utils.showToast('First auto-trace the image, adjust the regions if needed, then save the approved layout as training', 'info');
            return;
        }

        this._smartCutLastTrainingCandidate = {
            preset: this._smartCutPreset,
            outline: this._smartCutAutoOutline.map(point => ({ x: point.x, y: point.y })),
            regions: this._smartCutRegions.map(region => ({
                label: region.label,
                name: region.name,
                path: region.path.map(point => ({ x: point.x, y: point.y }))
            }))
        };

        const targetButton = button || panel?.querySelector('#sc-auto-train');
        this._saveSmartCutTrainingFromLastCandidate(panel, targetButton);
    },

    _getSmartCutAutoTraceOptions(panel) {
        return {
            removeBg: panel?.querySelector('#sc-auto-remove-bg')?.checked !== false,
            bgTolerance: parseInt(panel?.querySelector('#sc-auto-bg-tolerance')?.value, 10) || 30,
            sensitivity: parseInt(panel?.querySelector('#sc-auto-sensitivity')?.value, 10) || 72
        };
    },

    _getSmartCutCutMode(panel) {
        return panel?.querySelector('#sc-cut-mode')?.value === 'silhouette' ? 'silhouette' : 'original';
    },

    _getSmartCutAssemblyMode(panel) {
        return panel?.querySelector('#sc-assembly-mode')?.value === 'reposition' ? 'reposition' : 'keep';
    },

    _getSmartCutTraceSourceObject() {
        const obj = this._smartCutObj;
        const sourceImage = this._smartCutOriginalImageElement || obj?.imageElement;
        if (!obj || !sourceImage) return obj;
        return {
            type: 'image',
            imageElement: sourceImage,
            x: obj.x,
            y: obj.y,
            width: obj.width,
            height: obj.height,
            name: obj.name
        };
    },

    _smartCutBuildBgRemovedPreview(panel) {
        const obj = this._smartCutObj;
        const img = this._smartCutOriginalImageElement || obj?.imageElement;
        if (!obj || !img) return null;

        const tolerance = parseInt(panel?.querySelector('#sc-auto-bg-tolerance')?.value, 10) || 30;
        if (this._smartCutPreparedCanvas && this._smartCutPreparedSrc && this._smartCutPreparedTolerance === tolerance) {
            return {
                canvas: this._smartCutPreparedCanvas,
                src: this._smartCutPreparedSrc,
                tolerance
            };
        }

        const natW = img.naturalWidth || img.width;
        const natH = img.naturalHeight || img.height;
        if (!natW || !natH) return null;

        const canvas = document.createElement('canvas');
        canvas.width = natW;
        canvas.height = natH;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, natW, natH);

        let imageData = ctx.getImageData(0, 0, natW, natH);
        const tracer = this.objects?._aiTrace;
        if (tracer?._removeBackgroundFromImageData) {
            imageData = tracer._removeBackgroundFromImageData(imageData, natW, natH, tolerance);
        } else {
            const data = imageData.data;
            const samples = [
                [0, 0], [natW - 1, 0],
                [0, natH - 1], [natW - 1, natH - 1]
            ];
            let bgR = 0, bgG = 0, bgB = 0, count = 0;
            samples.forEach(([sx, sy]) => {
                const idx = (sy * natW + sx) * 4;
                bgR += data[idx];
                bgG += data[idx + 1];
                bgB += data[idx + 2];
                count++;
            });
            bgR = Math.round(bgR / Math.max(1, count));
            bgG = Math.round(bgG / Math.max(1, count));
            bgB = Math.round(bgB / Math.max(1, count));
            const tolSq = tolerance * tolerance * 3;
            for (let i = 0; i < data.length; i += 4) {
                const dr = data[i] - bgR;
                const dg = data[i + 1] - bgG;
                const db = data[i + 2] - bgB;
                if (dr * dr + dg * dg + db * db < tolSq) data[i + 3] = 0;
            }
        }

        ctx.putImageData(imageData, 0, 0);
        const src = canvas.toDataURL('image/png');
        this._smartCutPreparedCanvas = canvas;
        this._smartCutPreparedSrc = src;
        this._smartCutPreparedTolerance = tolerance;
        return { canvas, src, tolerance };
    },

    _smartCutApplyBgRemovedPreview(panel) {
        const obj = this._smartCutObj;
        const preview = this._smartCutBuildBgRemovedPreview(panel);
        if (!obj || !preview?.canvas) return false;
        obj.imageElement = preview.canvas;
        obj.imageSrc = preview.src;
        this._buildEdgeMap();
        eventBus.emit('object:updated', obj);
        this.stage.requestRender();
        return true;
    },

    _smartCutRestoreOriginalImage(clearPreviewCache = false) {
        const obj = this._smartCutObj;
        if (!obj) return;

        if (this._smartCutOriginalImageElement) obj.imageElement = this._smartCutOriginalImageElement;
        if (this._smartCutOriginalSrc) obj.imageSrc = this._smartCutOriginalSrc;
        eventBus.emit('object:updated', obj);
        this.stage.requestRender();

        if (clearPreviewCache) {
            this._smartCutPreparedSrc = null;
            this._smartCutPreparedCanvas = null;
            this._smartCutPreparedTolerance = null;
        }
    },

    _buildSmartCutPartTemplateScanlines(template) {
        if (!template?.parts) return {};
        const rowCount = 220;
        const rowsByPart = {};
        Object.entries(template.parts).forEach(([partKey, poly]) => {
            const rows = [];
            for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
                const t = rowCount === 1 ? 0 : rowIndex / (rowCount - 1);
                const y = t;
                const intersections = [];
                for (let i = 0; i < poly.length; i++) {
                    const a = poly[i];
                    const b = poly[(i + 1) % poly.length];
                    if ((a.y <= y && b.y > y) || (b.y <= y && a.y > y)) {
                        const ratio = (y - a.y) / ((b.y - a.y) || 0.000001);
                        intersections.push(a.x + (b.x - a.x) * ratio);
                    }
                }
                intersections.sort((a, b) => a - b);
                const spans = [];
                for (let i = 0; i + 1 < intersections.length; i += 2) {
                    const start = intersections[i];
                    const end = intersections[i + 1];
                    if (end - start > 0.0005) spans.push({ start, end });
                }
                rows.push({
                    y,
                    spans,
                    totalWidth: spans.reduce((sum, span) => sum + (span.end - span.start), 0)
                });
            }
            rowsByPart[partKey] = rows;
        });
        return rowsByPart;
    },

    _getSmartCutNormalizedPathBounds(path) {
        if (!path?.length) return { minX: 0, minY: 0, maxX: 1, maxY: 1, width: 1, height: 1 };
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        path.forEach(point => {
            minX = Math.min(minX, point.x);
            minY = Math.min(minY, point.y);
            maxX = Math.max(maxX, point.x);
            maxY = Math.max(maxY, point.y);
        });
        return {
            minX,
            minY,
            maxX,
            maxY,
            width: Math.max(0.001, maxX - minX),
            height: Math.max(0.001, maxY - minY)
        };
    },

    _getSmartCutRowAt(rows, t) {
        if (!rows?.length) return null;
        const index = Math.max(0, Math.min(rows.length - 1, Math.round(this._clamp01(t) * (rows.length - 1))));
        return rows[index];
    },

    _getSmartCutOuterSpan(row) {
        if (!row?.spans?.length) return null;
        const start = row.spans[0].start;
        const end = row.spans[row.spans.length - 1].end;
        return { start, end, width: Math.max(0.001, end - start) };
    },

    _getSmartCutClosestSpan(spans, value) {
        if (!spans?.length) return null;
        const inside = spans.find(span => value >= span.start && value <= span.end);
        if (inside) return inside;
        let best = spans[0];
        let bestDist = Infinity;
        spans.forEach(span => {
            const candidate = value < span.start ? span.start : span.end;
            const dist = Math.abs(candidate - value);
            if (dist < bestDist) {
                best = span;
                bestDist = dist;
            }
        });
        return best;
    },

    _smoothSmartCutValues(values, radius = 3) {
        if (!values?.length) return [];
        return values.map((_, index) => {
            let total = 0;
            let count = 0;
            for (let offset = -radius; offset <= radius; offset++) {
                const sample = values[index + offset];
                if (Number.isFinite(sample)) {
                    total += sample;
                    count++;
                }
            }
            return count ? total / count : values[index];
        });
    },

    _findSmartCutProfileT(values, startT, endT, mode = 'min') {
        if (!values?.length) return this._clamp01((startT + endT) * 0.5);
        const startIndex = Math.max(0, Math.min(values.length - 1, Math.round(this._clamp01(startT) * (values.length - 1))));
        const endIndex = Math.max(startIndex, Math.min(values.length - 1, Math.round(this._clamp01(endT) * (values.length - 1))));
        let bestIndex = startIndex;
        let bestValue = values[startIndex];
        for (let i = startIndex + 1; i <= endIndex; i++) {
            const value = values[i];
            if ((mode === 'max' && value > bestValue) || (mode !== 'max' && value < bestValue)) {
                bestValue = value;
                bestIndex = i;
            }
        }
        return values.length === 1 ? 0 : bestIndex / (values.length - 1);
    },

    // Prominence-based profile search: finds the min/max that stands out
    // most from its local neighbourhood, reducing sensitivity to noise.
    _findSmartCutProminentProfileT(values, startT, endT, mode = 'min', contextRadius = 5) {
        if (!values?.length) return this._clamp01((startT + endT) * 0.5);
        const n = values.length;
        const si = Math.max(0, Math.min(n - 1, Math.round(this._clamp01(startT) * (n - 1))));
        const ei = Math.max(si, Math.min(n - 1, Math.round(this._clamp01(endT) * (n - 1))));

        let bestIdx = si;
        let bestScore = -Infinity;

        for (let i = si; i <= ei; i++) {
            const v = values[i];
            if (!Number.isFinite(v)) continue;
            // Local average excluding the current sample
            let sum = 0, cnt = 0;
            for (let j = Math.max(si, i - contextRadius); j <= Math.min(ei, i + contextRadius); j++) {
                if (j !== i && Number.isFinite(values[j])) { sum += values[j]; cnt++; }
            }
            const localAvg = cnt > 0 ? sum / cnt : v;
            // Prominence = how much this value stands out vs neighbours
            const prominence = mode === 'max' ? (v - localAvg) : (localAvg - v);
            // Tie-break by absolute value
            if (prominence > bestScore ||
                (prominence === bestScore &&
                 ((mode === 'max' && v > values[bestIdx]) ||
                  (mode !== 'max' && v < values[bestIdx])))) {
                bestScore = prominence;
                bestIdx = i;
            }
        }
        return n === 1 ? 0 : bestIdx / (n - 1);
    },

    // Validate detected anatomical landmarks against known human proportions.
    // Returns corrected T values. Only applies corrections when no hints are
    // provided (pure auto-trace) and the detected values are significantly off.
    _validateSmartCutAnatomicalProportions(detected, widths) {
        const d = { ...detected };

        // Expected proportion ranges for a front-facing human (fraction of height).
        // Calibrated from guided-trace landmark data.
        const expect = {
            neckT:     [0.10, 0.18],
            shoulderT: [0.16, 0.24],
            armpitT:   [0.22, 0.30],
            waistT:    [0.34, 0.46],
            hipT:      [0.38, 0.50],
            crotchT:   [0.46, 0.54],
            ankleT:    [0.86, 0.94]
        };

        // Expected minimum gaps between consecutive landmarks (fraction of height)
        const minGaps = {
            neck_shoulder: 0.03,
            shoulder_armpit: 0.04,
            armpit_waist: 0.08,
            waist_hip: 0.03,
            hip_crotch: 0.02,
            crotch_ankle: 0.26
        };

        // Pull strength: stronger when value is far from expected range
        const pullStrength = 0.45;

        // Check each landmark falls in expected range
        for (const [key, [lo, hi]] of Object.entries(expect)) {
            if (d[key] < lo) d[key] = d[key] + (lo - d[key]) * pullStrength;
            if (d[key] > hi) d[key] = d[key] + (hi - d[key]) * pullStrength;
        }

        // Enforce minimum spacing between consecutive landmarks
        if (d.shoulderT - d.neckT < minGaps.neck_shoulder) {
            const mid = (d.neckT + d.shoulderT) / 2;
            d.neckT = mid - minGaps.neck_shoulder / 2;
            d.shoulderT = mid + minGaps.neck_shoulder / 2;
        }
        if (d.armpitT - d.shoulderT < minGaps.shoulder_armpit) {
            d.armpitT = d.shoulderT + minGaps.shoulder_armpit;
        }
        if (d.waistT - d.armpitT < minGaps.armpit_waist) {
            d.waistT = d.armpitT + minGaps.armpit_waist;
        }
        if (d.hipT - d.waistT < minGaps.waist_hip) {
            d.hipT = d.waistT + minGaps.waist_hip;
        }
        if (d.crotchT - d.hipT < minGaps.hip_crotch) {
            d.crotchT = d.hipT + minGaps.hip_crotch;
        }
        if (d.ankleT - d.crotchT < minGaps.crotch_ankle) {
            d.ankleT = d.crotchT + minGaps.crotch_ankle;
        }

        // Width-ratio sanity: shoulder should be wider than neck
        if (widths?.length) {
            const getW = t => {
                const idx = Math.round(this._clamp01(t) * (widths.length - 1));
                return widths[Math.max(0, Math.min(widths.length - 1, idx))] || 0;
            };
            const neckW = getW(d.neckT);
            const shoulderW = getW(d.shoulderT);
            // If shoulder isn't at least 30% wider than neck, push shoulderT
            // toward the widest point in the shoulder search range
            if (shoulderW < neckW * 1.3 && shoulderW > 0) {
                const betterT = this._findSmartCutProminentProfileT(
                    widths, d.neckT + 0.03, 0.35, 'max'
                );
                d.shoulderT = d.shoulderT * 0.5 + betterT * 0.5;
            }
        }

        return d;
    },

    // Multi-row leg split detection: scans rows from crotchY downward to
    // find where the silhouette consistently separates into two leg spans.
    // Returns the X coordinate of the gap between legs.
    _findSmartCutLegSplitX(scanlines, bounds, crotchT, centerX) {
        if (!scanlines?.length || !bounds) return centerX;
        const n = scanlines.length;
        const startIdx = Math.round(this._clamp01(crotchT) * (n - 1));
        const endIdx = Math.min(n - 1, Math.round(this._clamp01(crotchT + 0.20) * (n - 1)));

        let splitSum = 0, splitCount = 0;

        for (let i = startIdx; i <= endIdx; i++) {
            const row = scanlines[i];
            if (!row?.spans || row.spans.length < 2) continue;
            // Find the gap closest to centerX between adjacent spans
            for (let s = 0; s < row.spans.length - 1; s++) {
                const gapStart = row.spans[s].end;
                const gapEnd = row.spans[s + 1].start;
                if (gapEnd - gapStart < 2) continue;
                const gapMid = (gapStart + gapEnd) / 2;
                if (Math.abs(gapMid - centerX) < bounds.width * 0.25) {
                    splitSum += gapMid;
                    splitCount++;
                }
            }
        }

        // Also check the very bottom rows (feet might be further apart)
        const footStartIdx = Math.max(endIdx, Math.round(0.90 * (n - 1)));
        for (let i = footStartIdx; i < n; i++) {
            const row = scanlines[i];
            if (!row?.spans || row.spans.length < 2) continue;
            const gapMid = (row.spans[0].end + row.spans[row.spans.length - 1].start) / 2;
            if (Math.abs(gapMid - centerX) < bounds.width * 0.3) {
                splitSum += gapMid;
                splitCount++;
            }
        }

        return splitCount > 0 ? splitSum / splitCount : centerX;
    },

    _normalizeSmartCutAnchorMap(anchors) {
        const filtered = (anchors || [])
            .filter(anchor => Number.isFinite(anchor.src) && Number.isFinite(anchor.dst))
            .map(anchor => ({ src: this._clamp01(anchor.src), dst: this._clamp01(anchor.dst) }))
            .sort((a, b) => a.src - b.src);
        if (!filtered.length || filtered[0].src > 0) filtered.unshift({ src: 0, dst: 0 });
        if (filtered[filtered.length - 1].src < 1) filtered.push({ src: 1, dst: 1 });
        let lastDst = 0;
        filtered.forEach((anchor, index) => {
            if (index === 0) {
                anchor.dst = 0;
                lastDst = 0;
                return;
            }
            anchor.dst = Math.max(lastDst + 0.002, anchor.dst);
            anchor.dst = Math.min(1, anchor.dst);
            lastDst = anchor.dst;
        });
        filtered[filtered.length - 1].dst = 1;
        return filtered;
    },

    _buildSmartCutVerticalAnchorMap(outline, preset, bounds, scanlines) {
        if (!outline?.length || !preset?.key || !bounds || !scanlines?.length) {
            return [{ src: 0, dst: 0 }, { src: 1, dst: 1 }];
        }
        const widths = this._smoothSmartCutValues(
            scanlines.map(row => (row?.totalWidth || 0) / Math.max(1, bounds.width)),
            5
        );
        let headT = this._findSmartCutProfileT(widths, 0.00, 0.18, 'min');
        headT = Math.max(0, Math.min(0.15, headT));
        let neckT = this._findSmartCutProfileT(widths, Math.max(0.05, headT + 0.03), 0.25, 'min');
        neckT = Math.max(headT + 0.03, Math.min(0.22, neckT));
        let shoulderT = this._findSmartCutProfileT(widths, Math.max(0.12, neckT + 0.02), 0.38, 'max');
        shoulderT = Math.max(neckT + 0.04, Math.min(0.32, shoulderT));
        let waistT = this._findSmartCutProfileT(widths, shoulderT + 0.08, 0.65, 'min');
        waistT = Math.max(shoulderT + 0.06, Math.min(0.55, waistT));
        let hipT = this._findSmartCutProfileT(widths, waistT + 0.03, 0.78, 'max');
        hipT = Math.max(waistT + 0.04, Math.min(0.72, hipT));
        let crotchT = this._findSmartCutProfileT(widths, hipT + 0.02, 0.88, 'min');
        crotchT = Math.max(hipT + 0.02, Math.min(0.82, crotchT));
        const kneeT = this._clamp01(crotchT + (1 - crotchT) * 0.45);
        const ankleT = this._clamp01(crotchT + (1 - crotchT) * 0.85);

        if (preset.key === 'human-front') {
            return this._normalizeSmartCutAnchorMap([
                { src: 0.00, dst: 0.00 },
                { src: 0.08, dst: headT },
                { src: 0.12, dst: neckT },
                { src: 0.18, dst: shoulderT },
                { src: 0.35, dst: waistT },
                { src: 0.45, dst: hipT },
                { src: 0.52, dst: crotchT },
                { src: 0.68, dst: kneeT },
                { src: 0.85, dst: ankleT },
                { src: 1.00, dst: 1.00 }
            ]);
        }

        if (preset.key === 'human-side') {
            return this._normalizeSmartCutAnchorMap([
                { src: 0.00, dst: 0.00 },
                { src: 0.10, dst: neckT },
                { src: 0.44, dst: hipT },
                { src: 0.56, dst: crotchT },
                { src: 0.72, dst: kneeT },
                { src: 0.88, dst: ankleT },
                { src: 1.00, dst: 1.00 }
            ]);
        }

        return [{ src: 0, dst: 0 }, { src: 1, dst: 1 }];
    },

    _getSmartCutAnchorDst(anchors, srcFallback, indexFallback = null, defaultValue = 0.5) {
        if (Number.isInteger(indexFallback) && anchors?.[indexFallback]?.dst != null) {
            return anchors[indexFallback].dst;
        }
        if (!anchors?.length) return defaultValue;
        let closest = anchors[0];
        let bestDist = Math.abs((anchors[0].src ?? 0) - srcFallback);
        anchors.forEach(anchor => {
            const dist = Math.abs((anchor.src ?? 0) - srcFallback);
            if (dist < bestDist) {
                closest = anchor;
                bestDist = dist;
            }
        });
        return closest?.dst ?? defaultValue;
    },

    _detectArmRegions(outline, bounds, scanlines, shoulderT, crotchT) {
        const empty = { left: null, right: null, extension: 0, visible: false };
        if (!outline?.length || !bounds || !scanlines?.length) return empty;

        const startRow = Math.max(0, Math.min(scanlines.length - 1, Math.floor(this._clamp01(shoulderT) * (scanlines.length - 1))));
        const endRow = Math.max(startRow, Math.min(scanlines.length - 1, Math.floor(this._clamp01(crotchT) * (scanlines.length - 1))));
        const torsoProbeT = this._clamp01(Math.min(0.62, shoulderT + ((crotchT - shoulderT) * 0.42)));
        const torsoRow = this._getSmartCutRowAt(scanlines, torsoProbeT);
        const torsoOuter = this._getSmartCutOuterSpan(torsoRow);
        const shoulderOuter = this._getSmartCutOuterSpan(scanlines[startRow]);
        if (!torsoOuter || !shoulderOuter) return empty;

        const torsoWidth = torsoOuter.width;
        const widthSamples = [];
        for (let i = startRow; i <= endRow; i++) {
            const outer = this._getSmartCutOuterSpan(scanlines[i]);
            if (outer) widthSamples.push({ rowIndex: i, outer, excess: outer.width - torsoWidth });
        }
        if (!widthSamples.length) return empty;

        const peak = widthSamples.sort((a, b) => b.excess - a.excess)[0];
        const extension = Math.max(0, peak.excess / Math.max(1, bounds.width));
        const visible = extension > 0.035 || shoulderOuter.width > torsoWidth * 1.08;
        const yRatio = peak ? peak.rowIndex / Math.max(1, scanlines.length - 1) : shoulderT;
        const region = visible ? {
            visible: true,
            extension,
            rowIndex: peak.rowIndex,
            yRatio,
            maxWidth: peak.outer.width
        } : null;

        return {
            left: region,
            right: region,
            extension,
            visible
        };
    },

    _detectFootRegions(outline, bounds, scanlines, ankleT) {
        const empty = { left: null, right: null, extensionY: 0, widthGain: 0, visible: false };
        if (!outline?.length || !bounds || !scanlines?.length) return empty;

        const startRow = Math.max(0, Math.min(scanlines.length - 1, Math.floor(this._clamp01(ankleT) * (scanlines.length - 1))));
        const ankleOuter = this._getSmartCutOuterSpan(scanlines[startRow]);
        if (!ankleOuter) return empty;

        let widest = ankleOuter;
        let widestIndex = startRow;
        let lastVisibleIndex = startRow;
        for (let i = startRow; i < scanlines.length; i++) {
            const outer = this._getSmartCutOuterSpan(scanlines[i]);
            if (!outer) continue;
            lastVisibleIndex = i;
            if (outer.width >= widest.width) {
                widest = outer;
                widestIndex = i;
            }
        }

        const widthGain = Math.max(0, (widest.width - ankleOuter.width) / Math.max(1, bounds.width));
        const extensionY = Math.max(0, (lastVisibleIndex / Math.max(1, scanlines.length - 1)) - ankleT);
        const visible = widthGain > 0.02 || extensionY > 0.06;
        const region = visible ? {
            visible: true,
            widthGain,
            extensionY,
            rowIndex: widestIndex
        } : null;

        return {
            left: region,
            right: region,
            extensionY,
            widthGain,
            visible
        };
    },

    _mirrorSmartCutTemplatePath(path) {
        return (path || []).map(point => ({
            x: 1 - point.x,
            y: point.y
        }));
    },

    _stretchSmartCutPath(path, adjuster) {
        return (path || []).map(point => adjuster({ x: point.x, y: point.y }));
    },

    _buildSmartCutAdaptiveTemplate(template, preset, scanlines, verticalAnchors, bounds, outline) {
        const adjusted = JSON.parse(JSON.stringify(template || {}));
        if (!adjusted?.parts || preset?.key !== 'human-front') return adjusted;

        const improvedLeftUpperArm = [
            { x: 0.62, y: 0.18 }, { x: 0.78, y: 0.18 }, { x: 0.81, y: 0.23 },
            { x: 0.83, y: 0.31 }, { x: 0.81, y: 0.39 }, { x: 0.75, y: 0.43 },
            { x: 0.67, y: 0.43 }, { x: 0.63, y: 0.36 }, { x: 0.61, y: 0.28 }
        ];
        const improvedLeftForearm = [
            { x: 0.66, y: 0.39 }, { x: 0.79, y: 0.39 }, { x: 0.81, y: 0.46 },
            { x: 0.80, y: 0.56 }, { x: 0.74, y: 0.60 }, { x: 0.67, y: 0.60 },
            { x: 0.64, y: 0.51 }, { x: 0.64, y: 0.44 }
        ];
        const improvedLeftHand = [
            { x: 0.66, y: 0.56 }, { x: 0.77, y: 0.56 }, { x: 0.80, y: 0.62 },
            { x: 0.79, y: 0.69 }, { x: 0.71, y: 0.70 }, { x: 0.65, y: 0.67 },
            { x: 0.63, y: 0.61 }
        ];
        const improvedLeftFoot = [
            { x: 0.48, y: 0.84 }, { x: 0.58, y: 0.84 }, { x: 0.63, y: 0.89 },
            { x: 0.67, y: 0.95 }, { x: 0.66, y: 0.99 }, { x: 0.48, y: 0.99 },
            { x: 0.46, y: 0.92 }
        ];

        adjusted.parts['l-upper-arm'] = improvedLeftUpperArm;
        adjusted.parts['l-forearm'] = improvedLeftForearm;
        adjusted.parts['l-hand'] = improvedLeftHand;
        adjusted.parts['l-foot'] = improvedLeftFoot;
        adjusted.parts['r-upper-arm'] = this._mirrorSmartCutTemplatePath(improvedLeftUpperArm);
        adjusted.parts['r-forearm'] = this._mirrorSmartCutTemplatePath(improvedLeftForearm);
        adjusted.parts['r-hand'] = this._mirrorSmartCutTemplatePath(improvedLeftHand);
        adjusted.parts['r-foot'] = this._mirrorSmartCutTemplatePath(improvedLeftFoot);

        const shoulderT = this._getSmartCutAnchorDst(verticalAnchors, 0.18, 3, 0.22);
        const crotchT = this._getSmartCutAnchorDst(verticalAnchors, 0.52, 6, 0.58);
        const ankleT = this._getSmartCutAnchorDst(verticalAnchors, 0.85, 8, 0.88);
        const armRegions = this._detectArmRegions(outline, bounds, scanlines, shoulderT, crotchT);
        const footRegions = this._detectFootRegions(outline, bounds, scanlines, ankleT);

        const applyArmAdjustment = (path, screenSide, strength = 1) => {
            const outward = Math.min(0.11, 0.028 + (armRegions.extension || 0) * (0.8 * strength));
            const drop = Math.min(0.06, 0.012 + (armRegions.extension || 0) * (0.25 * strength));
            return this._stretchSmartCutPath(path, point => {
                const armWeight = this._clamp01((point.y - 0.16) / 0.56);
                const handWeight = this._clamp01((point.y - 0.42) / 0.28);
                return {
                    x: screenSide === 'right'
                        ? Math.min(0.97, point.x + outward * (0.35 + armWeight * 0.85))
                        : Math.max(0.03, point.x - outward * (0.35 + armWeight * 0.85)),
                    y: Math.min(0.76, point.y + drop * handWeight)
                };
            });
        };

        const applyFootAdjustment = (path, screenSide) => {
            const down = Math.min(0.05, 0.015 + (footRegions.extensionY || 0) * 0.75);
            const widen = Math.min(0.06, 0.015 + (footRegions.widthGain || 0) * 0.9);
            return this._stretchSmartCutPath(path, point => {
                const toeWeight = this._clamp01((point.y - 0.88) / 0.12);
                return {
                    x: screenSide === 'right'
                        ? Math.min(0.99, point.x + widen * toeWeight)
                        : Math.max(0.01, point.x - widen * toeWeight),
                    y: Math.min(0.995, point.y + down * (0.35 + toeWeight))
                };
            });
        };

        if (armRegions.visible) {
            adjusted.parts['l-upper-arm'] = applyArmAdjustment(adjusted.parts['l-upper-arm'], 'right', 0.75);
            adjusted.parts['l-forearm'] = applyArmAdjustment(adjusted.parts['l-forearm'], 'right', 1.0);
            adjusted.parts['l-hand'] = applyArmAdjustment(adjusted.parts['l-hand'], 'right', 1.15);
            adjusted.parts['r-upper-arm'] = applyArmAdjustment(adjusted.parts['r-upper-arm'], 'left', 0.75);
            adjusted.parts['r-forearm'] = applyArmAdjustment(adjusted.parts['r-forearm'], 'left', 1.0);
            adjusted.parts['r-hand'] = applyArmAdjustment(adjusted.parts['r-hand'], 'left', 1.15);
        }

        if (footRegions.visible) {
            adjusted.parts['l-foot'] = applyFootAdjustment(adjusted.parts['l-foot'], 'right');
            adjusted.parts['r-foot'] = applyFootAdjustment(adjusted.parts['r-foot'], 'left');
        }

        return adjusted;
    },

    _remapSmartCutVerticalT(value, anchors) {
        const t = this._clamp01(value);
        if (!anchors?.length) return t;
        for (let i = 0; i < anchors.length - 1; i++) {
            const current = anchors[i];
            const next = anchors[i + 1];
            if (t >= current.src && t <= next.src) {
                const ratio = (t - current.src) / Math.max(0.000001, next.src - current.src);
                return current.dst + (next.dst - current.dst) * ratio;
            }
        }
        return anchors[anchors.length - 1].dst;
    },

    _getSmartCutScreenSideForPart(partKey, presetKey) {
        if (presetKey === 'human-front') {
            if (partKey.startsWith('l-')) return 'right';
            if (partKey.startsWith('r-')) return 'left';
            return 'center';
        }
        if (/\bleft\b|^l-/.test(partKey)) return 'left';
        if (/\bright\b|^r-/.test(partKey)) return 'right';
        return 'center';
    },

    _resolveSmartCutTargetSpan(row, partKey, presetKey, startT, endT) {
        const outer = this._getSmartCutOuterSpan(row);
        if (!outer) return null;
        const side = this._getSmartCutScreenSideForPart(partKey, presetKey);
        const desiredStart = outer.start + this._clamp01(startT) * outer.width;
        const desiredEnd = outer.start + this._clamp01(endT) * outer.width;

        if ((row?.spans?.length || 0) <= 1 || side === 'center') {
            const start = Math.max(outer.start, Math.min(desiredStart, outer.end));
            const end = Math.max(start + 0.5, Math.min(desiredEnd, outer.end));
            return { start, end };
        }

        const preferred = side === 'left'
            ? row.spans[0]
            : row.spans[row.spans.length - 1];
        return {
            start: preferred.start,
            end: preferred.end
        };
    },

    _mapSmartCutStencilPointToOutline(point, partKey, bounds, scanlines, templateRows, partRows, partBounds, outline, verticalAnchors, presetKey) {
        const sourceT = this._clamp01(point.y);
        const mappedT = this._remapSmartCutVerticalT(sourceT, verticalAnchors);
        const row = this._getSmartCutRowAt(scanlines, mappedT);
        const templateRow = this._getSmartCutRowAt(templateRows, sourceT);
        const partRow = this._getSmartCutRowAt(partRows, sourceT);
        const templateOuter = this._getSmartCutOuterSpan(templateRow) || { start: 0, end: 1, width: 1 };
        const sourceSpan = this._getSmartCutClosestSpan(partRow?.spans, point.x) || {
            start: partBounds.minX,
            end: partBounds.maxX
        };
        const targetSpan = this._resolveSmartCutTargetSpan(
            row,
            partKey,
            presetKey,
            (sourceSpan.start - templateOuter.start) / Math.max(0.001, templateOuter.width),
            (sourceSpan.end - templateOuter.start) / Math.max(0.001, templateOuter.width)
        ) || this._getSmartCutOuterSpan(row);

        const localRatio = this._clamp01((point.x - sourceSpan.start) / Math.max(0.001, sourceSpan.end - sourceSpan.start));
        const x = row?.spans?.length
            ? this._clampSmartCutXToRowSpans(targetSpan.start + localRatio * (targetSpan.end - targetSpan.start), row.spans)
            : bounds.minX + point.x * bounds.width;
        const y = bounds.minY + mappedT * bounds.height;
        const mapped = { x, y };
        return this._bsPointInPolygon(mapped.x, mapped.y, outline)
            ? mapped
            : this._nearestPointOnSmartCutOutline(mapped, outline);
    },

    _buildSmartCutAutoRegionsFromStencilFit(outline, preset, templateOverride = null, precomputed = null) {
        const template = templateOverride || JointSystem._getStencilTemplates()[preset?.key];
        const bounds = precomputed?.bounds || this._getSmartCutRegionBounds(outline);
        if (!template?.parts || !bounds) return [];

        const scanlines = precomputed?.scanlines || this._buildSmartCutOutlineScanlines(outline, bounds);
        const templateRows = this._buildSmartCutTemplateScanlines(template);
        const partRows = this._buildSmartCutPartTemplateScanlines(template);
        const verticalAnchors = precomputed?.verticalAnchors || this._buildSmartCutVerticalAnchorMap(outline, preset, bounds, scanlines);

        return Object.entries(template.parts).map(([partKey, normPath]) => {
            const part = preset.parts.find(entry => entry.partKey === partKey);
            const partBounds = this._getSmartCutNormalizedPathBounds(normPath);
            const mappedPath = normPath.map(point => this._mapSmartCutStencilPointToOutline(
                point,
                partKey,
                bounds,
                scanlines,
                templateRows,
                partRows[partKey],
                partBounds,
                outline,
                verticalAnchors,
                preset.key
            ));
            return {
                label: partKey,
                name: part?.name || partKey,
                path: this._simplifySmartCutPolygon(mappedPath)
            };
        }).filter(region => region.path.length >= 3);
    },

    _buildSmartCutOutlineScanlines(outline, bounds) {
        if (!outline?.length || !bounds) return [];
        const rows = [];
        const rowCount = Math.max(100, Math.min(320, Math.round(bounds.height * 1.2)));
        for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
            const t = rowCount === 1 ? 0 : rowIndex / (rowCount - 1);
            const y = bounds.minY + t * bounds.height;
            const intersections = [];
            for (let i = 0; i < outline.length; i++) {
                const a = outline[i];
                const b = outline[(i + 1) % outline.length];
                if ((a.y <= y && b.y > y) || (b.y <= y && a.y > y)) {
                    const ratio = (y - a.y) / ((b.y - a.y) || 0.000001);
                    intersections.push(a.x + (b.x - a.x) * ratio);
                }
            }
            intersections.sort((a, b) => a - b);
            const spans = [];
            for (let i = 0; i + 1 < intersections.length; i += 2) {
                const start = intersections[i];
                const end = intersections[i + 1];
                if (end - start > 0.5) spans.push({ start, end });
            }
            rows.push({
                y,
                spans,
                totalWidth: spans.reduce((sum, span) => sum + (span.end - span.start), 0)
            });
        }
        return rows;
    },

    _buildSmartCutOutlineColumns(outline, bounds) {
        if (!outline?.length || !bounds) return [];
        const cols = [];
        const colCount = Math.max(100, Math.min(320, Math.round(bounds.width * 1.2)));
        for (let colIndex = 0; colIndex < colCount; colIndex++) {
            const t = colCount === 1 ? 0 : colIndex / (colCount - 1);
            const x = bounds.minX + t * bounds.width;
            const intersections = [];
            for (let i = 0; i < outline.length; i++) {
                const a = outline[i];
                const b = outline[(i + 1) % outline.length];
                if ((a.x <= x && b.x > x) || (b.x <= x && a.x > x)) {
                    const ratio = (x - a.x) / ((b.x - a.x) || 0.000001);
                    intersections.push(a.y + (b.y - a.y) * ratio);
                }
            }
            intersections.sort((a, b) => a - b);
            const spans = [];
            for (let i = 0; i + 1 < intersections.length; i += 2) {
                const start = intersections[i];
                const end = intersections[i + 1];
                if (end - start > 0.5) spans.push({ start, end });
            }
            cols.push({
                x,
                spans,
                totalHeight: spans.reduce((sum, span) => sum + (span.end - span.start), 0)
            });
        }
        return cols;
    },

    _smartCutLerp(a, b, t) {
        return a + (b - a) * this._clamp01(t);
    },

    _getSmartCutRowInfoAtY(scanlines, bounds, y) {
        if (!scanlines?.length || !bounds) return null;
        const t = this._clamp01((y - bounds.minY) / Math.max(1, bounds.height));
        const index = Math.max(0, Math.min(scanlines.length - 1, Math.round(t * (scanlines.length - 1))));
        const row = scanlines[index];
        const outer = this._getSmartCutOuterSpan(row);
        if (!row || !outer) return null;
        return {
            row,
            outer,
            y: row.y,
            t
        };
    },

    _interpolateSmartCutValueByY(y, anchors, fallback = 0) {
        if (!anchors?.length) return fallback;
        const sorted = anchors
            .filter(anchor => Number.isFinite(anchor?.y) && Number.isFinite(anchor?.value))
            .sort((a, b) => a.y - b.y);
        if (!sorted.length) return fallback;
        if (y <= sorted[0].y) return sorted[0].value;
        for (let i = 0; i < sorted.length - 1; i++) {
            const current = sorted[i];
            const next = sorted[i + 1];
            if (y >= current.y && y <= next.y) {
                const ratio = (y - current.y) / Math.max(0.0001, next.y - current.y);
                return this._smartCutLerp(current.value, next.value, ratio);
            }
        }
        return sorted[sorted.length - 1].value;
    },

    /**
     * Sort points clockwise by angle from their centroid.
     * Creates a proper non-self-intersecting polygon from scattered points.
     */
    _sortPointsClockwise(points) {
        if (!points?.length || points.length < 3) return points || [];
        let cx = 0, cy = 0;
        for (const p of points) { cx += p.x; cy += p.y; }
        cx /= points.length;
        cy /= points.length;
        return [...points].sort((a, b) => {
            return Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx);
        });
    },

    /**
     * Build the head region by walking the actual outline contour above headBottomY.
     * Produces a polygon that follows the real silhouette shape of the head
     * rather than using a synthetic centerBand oval.
     */
    _buildSmartCutHeadContour(outline, headBottomY, leftBoundary = null, rightBoundary = null, jawTip = null) {
        if (!outline?.length || outline.length < 10) return [];

        const hasGuidedBoundary = leftBoundary && rightBoundary
            && Number.isFinite(leftBoundary.x) && Number.isFinite(leftBoundary.y)
            && Number.isFinite(rightBoundary.x) && Number.isFinite(rightBoundary.y);
        if (hasGuidedBoundary) {
            const nearestIndexToPoint = target => {
                let bestIndex = 0;
                let bestDist = Infinity;
                for (let i = 0; i < outline.length; i++) {
                    const point = outline[i];
                    const dist = Math.hypot(point.x - target.x, point.y - target.y);
                    if (dist < bestDist) {
                        bestDist = dist;
                        bestIndex = i;
                    }
                }
                return bestIndex;
            };

            const walkPath = (fromIdx, toIdx, fromPt, toPt) => {
                const pts = [{ x: fromPt.x, y: fromPt.y }];
                let idx = (fromIdx + 1) % outline.length;
                let safety = 0;
                while (safety++ < outline.length) {
                    pts.push({ x: outline[idx].x, y: outline[idx].y });
                    if (idx === toIdx) break;
                    idx = (idx + 1) % outline.length;
                }
                pts.push({ x: toPt.x, y: toPt.y });
                return pts;
            };

            const leftIdx = nearestIndexToPoint(leftBoundary);
            const rightIdx = nearestIndexToPoint(rightBoundary);
            const leftToRight = walkPath(leftIdx, rightIdx, leftBoundary, rightBoundary);
            const rightToLeft = walkPath(rightIdx, leftIdx, rightBoundary, leftBoundary);
            const avgLeftToRightY = leftToRight.reduce((sum, point) => sum + point.y, 0) / leftToRight.length;
            const avgRightToLeftY = rightToLeft.reduce((sum, point) => sum + point.y, 0) / rightToLeft.length;

            const topArc = avgLeftToRightY <= avgRightToLeftY
                ? leftToRight
                : [...rightToLeft].reverse();

            const polygon = [...topArc];
            if (jawTip && Number.isFinite(jawTip.x) && Number.isFinite(jawTip.y)) {
                polygon.push({ x: jawTip.x, y: jawTip.y });
            }
            return this._cleanSmartCutPolygon(polygon, 0.85);
        }

        // Find where the outline crosses headBottomY (the neck cut line)
        const crossings = [];
        for (let i = 0; i < outline.length; i++) {
            const a = outline[i];
            const b = outline[(i + 1) % outline.length];
            if ((a.y < headBottomY && b.y >= headBottomY) ||
                (a.y >= headBottomY && b.y < headBottomY)) {
                const t = (headBottomY - a.y) / ((b.y - a.y) || 0.001);
                crossings.push({
                    x: a.x + t * (b.x - a.x),
                    y: headBottomY,
                    afterIdx: i
                });
            }
        }
        if (crossings.length < 2) return [];

        // Sort by X — leftmost and rightmost define the neck cut line
        crossings.sort((a, b) => a.x - b.x);
        const left = crossings[0];
        const right = crossings[crossings.length - 1];

        // Walk the outline from right crossing to left crossing in both
        // directions and pick the path with the smaller average Y (= goes
        // through the top of the head, since Y grows downward).
        const walkPath = (fromIdx, toIdx, fromPt, toPt) => {
            const pts = [{ x: fromPt.x, y: fromPt.y }];
            let idx = (fromIdx + 1) % outline.length;
            let safety = 0;
            while (safety++ < outline.length) {
                pts.push({ x: outline[idx].x, y: outline[idx].y });
                if (idx === toIdx) break;
                idx = (idx + 1) % outline.length;
            }
            pts.push({ x: toPt.x, y: toPt.y });
            return pts;
        };

        const pathA = walkPath(right.afterIdx, left.afterIdx, right, left);
        const pathB = walkPath(left.afterIdx, right.afterIdx, left, right);

        const avgYA = pathA.reduce((s, p) => s + p.y, 0) / pathA.length;
        const avgYB = pathB.reduce((s, p) => s + p.y, 0) / pathB.length;
        const topArc = avgYA <= avgYB ? pathA : pathB;

        if (jawTip && Number.isFinite(jawTip.x) && Number.isFinite(jawTip.y)) {
            return this._cleanSmartCutPolygon([
                ...topArc,
                { x: jawTip.x, y: jawTip.y }
            ], 0.85);
        }

        // Choose the path with the topmost points (smaller avg Y)
        return topArc;
    },

    _cleanSmartCutPolygon(points, minDist = 1) {
        if (!points?.length) return [];
        const cleaned = [];
        points.forEach(point => {
            if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) return;
            const previous = cleaned[cleaned.length - 1];
            if (!previous || Math.hypot(point.x - previous.x, point.y - previous.y) >= minDist) {
                cleaned.push({ x: point.x, y: point.y });
            }
        });
        if (cleaned.length > 2) {
            const first = cleaned[0];
            const last = cleaned[cleaned.length - 1];
            if (Math.hypot(first.x - last.x, first.y - last.y) < minDist) cleaned.pop();
        }
        return cleaned;
    },

    _simplifySmartCutPolygon(points, minPoints = 4, maxPoints = 8) {
        const cleaned = this._cleanSmartCutPolygon(points, 0.85);
        if (cleaned.length <= maxPoints) return cleaned;

        const simplified = cleaned.map(point => ({ x: point.x, y: point.y }));
        const targetCount = Math.max(minPoints, Math.min(maxPoints, simplified.length));

        const vertexImportance = (polygon, index) => {
            const prev = polygon[(index - 1 + polygon.length) % polygon.length];
            const curr = polygon[index];
            const next = polygon[(index + 1) % polygon.length];
            const area2 = Math.abs(
                (prev.x * (curr.y - next.y)) +
                (curr.x * (next.y - prev.y)) +
                (next.x * (prev.y - curr.y))
            );
            const edgeWeight = Math.hypot(curr.x - prev.x, curr.y - prev.y) + Math.hypot(next.x - curr.x, next.y - curr.y);
            return area2 + (edgeWeight * 0.02);
        };

        while (simplified.length > targetCount) {
            let removeIndex = -1;
            let lowestScore = Infinity;
            for (let i = 0; i < simplified.length; i++) {
                const score = vertexImportance(simplified, i);
                if (score < lowestScore) {
                    lowestScore = score;
                    removeIndex = i;
                }
            }
            if (removeIndex < 0) break;
            simplified.splice(removeIndex, 1);
        }

        return simplified;
    },

    _getSmartCutPolygonArea(points) {
        if (!points?.length || points.length < 3) return 0;
        let area = 0;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
            area += (points[j].x * points[i].y) - (points[i].x * points[j].y);
        }
        return Math.abs(area) / 2;
    },

    _buildSmartCutBandPolygon(bounds, scanlines, yStart, yEnd, bandResolver, sampleCount = null) {
        if (!bounds || !scanlines?.length || !Number.isFinite(yStart) || !Number.isFinite(yEnd) || yEnd <= yStart) return [];
        const count = sampleCount || Math.max(10, Math.min(40, Math.round((yEnd - yStart) / 5)));
        const leftPoints = [];
        const rightPoints = [];

        for (let i = 0; i < count; i++) {
            const t = count === 1 ? 0 : i / (count - 1);
            const y = this._smartCutLerp(yStart, yEnd, t);
            const rowInfo = this._getSmartCutRowInfoAtY(scanlines, bounds, y);
            if (!rowInfo?.outer) continue;
            const band = bandResolver(rowInfo, y, t, i, count);
            if (!band || !Number.isFinite(band.start) || !Number.isFinite(band.end)) continue;

            let start = Math.max(rowInfo.outer.start, Math.min(band.start, rowInfo.outer.end));
            let end = Math.max(start + 0.5, Math.min(band.end, rowInfo.outer.end));
            if (end - start < 1.5) continue;

            leftPoints.push({ x: start, y: rowInfo.y });
            rightPoints.push({ x: end, y: rowInfo.y });
        }

        if (leftPoints.length < 2 || rightPoints.length < 2) return [];
        return this._cleanSmartCutPolygon([
            ...leftPoints,
            ...rightPoints.reverse()
        ], 0.85);
    },

    // ── Guided Landmark Collection ──


    _startGuidedLandmarks(panel, cutNow = false, trainMode = false) {
        const steps = JointSystem._getGuidedLandmarkSteps();
        this._smartCutGuidedLandmarks = {
            points: {},
            currentIndex: 0,
            active: true,
            cutNow,
            trainMode,
            steps
        };
        this._updateGuidedLandmarkUI(panel);
        this.stage.requestRender();
    },

    _cancelGuidedLandmarks(panel) {
        this._smartCutGuidedLandmarks = null;
        const bar = panel?.querySelector('#sc-guided-bar');
        if (bar) bar.classList.add('hidden');
        if (panel) this._updateSmartCutGuide(panel);
        this.stage.requestRender();
    },

    _updateGuidedLandmarkUI(panel) {
        const gl = this._smartCutGuidedLandmarks;
        if (!gl?.active || !panel) return;
        let bar = panel.querySelector('#sc-guided-bar');
        if (!bar) {
            bar = document.createElement('div');
            bar.id = 'sc-guided-bar';
            bar.className = 'sc-guided-bar';
            const anchor = panel.querySelector('.sc-auto-actions') || panel.querySelector('.sc-actions');
            if (anchor) anchor.after(bar);
            else panel.appendChild(bar);
        }
        bar.classList.remove('hidden');
        const step = gl.steps[gl.currentIndex];
        if (!step) {
            bar.classList.add('hidden');
            return;
        }
        const count = gl.steps.length;
        const done = gl.currentIndex;
        const remaining = gl.steps.slice(gl.currentIndex + 1, gl.currentIndex + 4);
        bar.innerHTML =
            `<div class="sc-guided-prompt">` +
                `<span class="sc-guided-step">${done + 1}/${count}</span> ` +
                `<i class="fas ${step.icon}"></i> <strong>${step.label}</strong>: ${step.desc}` +
            `</div>` +
            `<div class="sc-guided-actions">` +
                `<button class="btn-sm btn-secondary" id="sc-guided-undo" ${done === 0 ? 'disabled' : ''} title="Undo last point"><i class="fas fa-undo"></i></button>` +
                `<button class="btn-sm btn-secondary" id="sc-guided-skip" title="Skip this point"><i class="fas fa-forward"></i> Skip</button>` +
                `<button class="btn-sm btn-secondary" id="sc-guided-cancel" title="Cancel guided landmarks"><i class="fas fa-times"></i></button>` +
            `</div>`;
        const guideCopy = panel.querySelector('#sc-guide-copy');
        const guideNext = panel.querySelector('#sc-guide-next');
        if (guideCopy) {
            guideCopy.innerHTML = `<strong>Guided Landmarks: ${done}/${count}</strong><br>Click: ${step.label} — ${step.desc}`;
        }
        if (guideNext) {
            guideNext.innerHTML = remaining.length
                ? `Next: ${remaining.map(entry => `<span class="guided-rig-chip">${entry.label}</span>`).join('')}`
                : 'Last step — auto-trace will run after this click';
        }
        bar.querySelector('#sc-guided-undo')?.addEventListener('click', () => {
            if (gl.currentIndex > 0) {
                gl.currentIndex--;
                const prevKey = gl.steps[gl.currentIndex].key;
                delete gl.points[prevKey];
                this._updateGuidedLandmarkUI(panel);
                this.stage.requestRender();
            }
        });
        bar.querySelector('#sc-guided-skip')?.addEventListener('click', () => {
            this._advanceGuidedLandmark(panel);
        });
        bar.querySelector('#sc-guided-cancel')?.addEventListener('click', () => {
            this._cancelGuidedLandmarks(panel);
        });
    },

    _handleGuidedLandmarkClick(stageX, stageY, panel) {
        const gl = this._smartCutGuidedLandmarks;
        if (!gl?.active) return false;
        const step = gl.steps[gl.currentIndex];
        if (!step) return false;
        const point = { x: stageX, y: stageY };
        gl.points[step.key] = point;
        // Validate: catch obvious left/right side swaps and gross vertical
        // ordering errors so the user gets immediate feedback instead of a
        // silent broken auto-trace later.
        const warning = this._validateGuidedLandmark(step.key, point, gl.points);
        if (warning) {
            // Prefer non-blocking confirm so user can quickly say "yes that's
            // wrong, let me re-click". On cancel, rewind so they re-place this
            // step. On OK, accept and continue.
            const confirmFn = (typeof Utils !== 'undefined' && typeof Utils.showConfirm === 'function')
                ? Utils.showConfirm.bind(Utils)
                : (msg) => Promise.resolve(window.confirm(msg));
            confirmFn(`${warning}\n\nClick OK to keep this point, or Cancel to re-place it.`).then((keep) => {
                if (!keep) {
                    delete gl.points[step.key];
                    this._updateGuidedLandmarkUI(panel);
                    this.stage.requestRender();
                    Utils.showToast?.(`Re-click: ${step.label}`, 'info');
                    return;
                }
                this._advanceGuidedLandmark(panel);
            });
            return true;
        }
        this._advanceGuidedLandmark(panel);
        return true;
    },

    _validateGuidedLandmark(key, point, points) {
        // Viewer-perspective convention: "left" landmarks should sit on the
        // LOWER x side of the viewport (viewer's left = lower x), "right"
        // landmarks on the HIGHER x side. A pair where left.x > right.x is
        // almost always a mistake.
        const sidePairs = [
            { left: 'leftShoulder',  right: 'rightShoulder',  label: 'shoulder' },
            { left: 'leftArmpit',    right: 'rightArmpit',    label: 'armpit' },
            { left: 'leftHip',       right: 'rightHip',       label: 'hip' },
            { left: 'leftLegStart',  right: 'rightLegStart',  label: 'leg start' },
            { left: 'leftKnee',      right: 'rightKnee',      label: 'knee' },
            { left: 'leftAnkle',     right: 'rightAnkle',     label: 'ankle' },
            { left: 'leftElbow',     right: 'rightElbow',     label: 'elbow' },
            { left: 'leftWrist',     right: 'rightWrist',     label: 'wrist' },
            { left: 'leftHandTip',   right: 'rightHandTip',   label: 'hand tip' },
            { left: 'leftToeTip',    right: 'rightToeTip',    label: 'toe tip' },
            { left: 'leftNeckJoin',  right: 'rightNeckJoin',  label: 'neck join' }
        ];
        // Tolerance: only flag when the swap is unambiguous (left clearly past right).
        const swapTolerancePx = 4;
        for (const pair of sidePairs) {
            if (key !== pair.left && key !== pair.right) continue;
            const other = key === pair.left ? points[pair.right] : points[pair.left];
            if (!other) continue;
            const leftPt  = key === pair.left  ? point : other;
            const rightPt = key === pair.right ? point : other;
            if (leftPt.x > rightPt.x + swapTolerancePx) {
                const placed = key === pair.left ? 'Left' : 'Right';
                const opposite = key === pair.left ? 'right' : 'left';
                return `Looks like the ${placed} ${pair.label} was placed on the ${opposite} side. ` +
                    `"Left" means the viewer's left (the LOWER x side of the screen). ` +
                    `Auto-trace will fail if the sides are swapped.`;
            }
        }
        // Vertical ordering sanity (head should be above feet, etc.)
        const verticalOrder = [
            'headTop', 'jawTip', 'neckBase',
            'leftShoulder', 'rightShoulder',
            'leftArmpit', 'rightArmpit',
            'leftHip', 'rightHip', 'crotch',
            'leftKnee', 'rightKnee',
            'leftAnkle', 'rightAnkle',
            'leftToeTip', 'rightToeTip'
        ];
        const idx = verticalOrder.indexOf(key);
        if (idx >= 0) {
            const verticalTolerancePx = 6;
            // Compare against earlier points that should be ABOVE this one (smaller y).
            for (let i = 0; i < idx; i++) {
                const prev = points[verticalOrder[i]];
                if (!prev) continue;
                if (prev.y > point.y + verticalTolerancePx) {
                    return `${this._formatLandmarkLabel(key)} appears HIGHER on the image than ${this._formatLandmarkLabel(verticalOrder[i])}, ` +
                        `but it should normally be lower (further down). Did you click the wrong area?`;
                }
            }
            // Compare against later points that should be BELOW this one (larger y).
            for (let i = idx + 1; i < verticalOrder.length; i++) {
                const next = points[verticalOrder[i]];
                if (!next) continue;
                if (next.y < point.y - verticalTolerancePx) {
                    return `${this._formatLandmarkLabel(key)} appears LOWER on the image than ${this._formatLandmarkLabel(verticalOrder[i])}, ` +
                        `but it should normally be higher (further up). Did you click the wrong area?`;
                }
            }
        }
        return null;
    },

    _formatLandmarkLabel(key) {
        return (key || '').replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()).trim();
    },

    _advanceGuidedLandmark(panel) {
        const gl = this._smartCutGuidedLandmarks;
        if (!gl) return;
        gl.currentIndex++;
        if (gl.currentIndex >= gl.steps.length) {
            // All landmarks collected — run auto trace with them
            gl.active = false;
            const bar = panel?.querySelector('#sc-guided-bar');
            if (bar) bar.classList.add('hidden');
            this._smartCutAutoTrace(panel, gl.cutNow, gl.trainMode);
        } else {
            this._updateGuidedLandmarkUI(panel);
        }
        this.stage.requestRender();
    },

    _buildHintsFromGuidedLandmarks(bounds) {
        const gl = this._smartCutGuidedLandmarks;
        if (!gl?.points || !bounds) return null;
        const pts = gl.points;
        const toT = y => this._clamp01((y - bounds.minY) / Math.max(1, bounds.height));
        const hints = {};

        const averageT = (...values) => {
            const valid = values.filter(value => Number.isFinite(value));
            return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null;
        };

        const averageX = (...values) => {
            const valid = values.filter(value => Number.isFinite(value));
            return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null;
        };

        if (pts.headTop) hints.headTopT = toT(pts.headTop.y);
        if (pts.jawTip) hints.headBottomT = toT(pts.jawTip.y);
        if (pts.jawTip) hints.jawTipX = pts.jawTip.x;
        if (pts.neckBase) {
            hints.neckBottomT = toT(pts.neckBase.y);
            hints.torsoTopT = toT(pts.neckBase.y);
            hints.neckBaseX = pts.neckBase.x;
        }
        if (pts.leftNeckJoin && pts.rightNeckJoin) {
            hints.neckJoinT = toT((pts.leftNeckJoin.y + pts.rightNeckJoin.y) / 2);
            hints.neckJoinWidth = Math.abs(pts.rightNeckJoin.x - pts.leftNeckJoin.x);
        }
        if (pts.leftNeckJoin) hints.leftNeckJoinX = pts.leftNeckJoin.x;
        if (pts.rightNeckJoin) hints.rightNeckJoinX = pts.rightNeckJoin.x;

        // Shoulder T from shoulder clicks
        if (pts.leftShoulder || pts.rightShoulder) {
            const sY = (pts.leftShoulder && pts.rightShoulder)
                ? Math.min(pts.leftShoulder.y, pts.rightShoulder.y)
                : (pts.leftShoulder?.y ?? pts.rightShoulder?.y);
            hints.shoulderT = toT(sY);
            // Compute shoulder-to-shoulder width as torso width hint
            if (pts.leftShoulder && pts.rightShoulder) {
                hints.shoulderWidth = Math.abs(pts.rightShoulder.x - pts.leftShoulder.x);
            }
        }
        if (pts.leftShoulder) hints.leftShoulderT = toT(pts.leftShoulder.y);
        if (pts.rightShoulder) hints.rightShoulderT = toT(pts.rightShoulder.y);
        if (pts.leftShoulder) hints.leftShoulderX = pts.leftShoulder.x;
        if (pts.rightShoulder) hints.rightShoulderX = pts.rightShoulder.x;

        // Armpit — used for torso width calibration
        if (pts.leftArmpit || pts.rightArmpit) {
            const aY = (pts.leftArmpit && pts.rightArmpit)
                ? (pts.leftArmpit.y + pts.rightArmpit.y) / 2
                : (pts.leftArmpit?.y ?? pts.rightArmpit?.y);
            hints.armpitT = toT(aY);
            // Compute armpit-to-armpit width as torso width hint
            if (pts.leftArmpit && pts.rightArmpit) {
                hints.armpitWidth = Math.abs(pts.rightArmpit.x - pts.leftArmpit.x);
            }
        }
        if (pts.leftArmpit) hints.leftArmpitX = pts.leftArmpit.x;
        if (pts.rightArmpit) hints.rightArmpitX = pts.rightArmpit.x;

        // Fallback torso top from shoulder average when neck base is not provided.
        if (hints.torsoTopT == null && (pts.leftShoulder || pts.rightShoulder)) {
            const topY = (pts.leftShoulder && pts.rightShoulder)
                ? (pts.leftShoulder.y + pts.rightShoulder.y) / 2
                : (pts.leftShoulder?.y ?? pts.rightShoulder?.y);
            hints.torsoTopT = toT(topY);
        }

        if (pts.leftElbow) hints.elbowLeftT = toT(pts.leftElbow.y);
        if (pts.rightElbow) hints.elbowRightT = toT(pts.rightElbow.y);
        if (pts.leftElbow) hints.leftElbowX = pts.leftElbow.x;
        if (pts.rightElbow) hints.rightElbowX = pts.rightElbow.x;
        hints.elbowT = averageT(hints.elbowLeftT, hints.elbowRightT);

        if (pts.leftWrist) hints.wristLeftT = toT(pts.leftWrist.y);
        if (pts.rightWrist) hints.wristRightT = toT(pts.rightWrist.y);
        if (pts.leftWrist) hints.leftWristX = pts.leftWrist.x;
        if (pts.rightWrist) hints.rightWristX = pts.rightWrist.x;
        hints.wristT = averageT(hints.wristLeftT, hints.wristRightT);

        // Hip line on both sides
        if (pts.leftHip) hints.hipLeftT = toT(pts.leftHip.y);
        if (pts.rightHip) hints.hipRightT = toT(pts.rightHip.y);
        if (pts.leftHip) hints.leftHipX = pts.leftHip.x;
        if (pts.rightHip) hints.rightHipX = pts.rightHip.x;
        if (pts.leftHip && pts.rightHip) {
            hints.hipWidth = Math.abs(pts.rightHip.x - pts.leftHip.x);
            hints.hipMidX = (pts.leftHip.x + pts.rightHip.x) / 2;
        }
        hints.hipT = averageT(hints.hipLeftT, hints.hipRightT);

        // Legacy single-point hip line remains supported
        if (pts.hipLine && hints.hipT == null) {
            hints.hipT = toT(pts.hipLine.y);
        }

        if (pts.leftLegStart) hints.legStartLeftT = toT(pts.leftLegStart.y);
        if (pts.rightLegStart) hints.legStartRightT = toT(pts.rightLegStart.y);
        if (pts.leftLegStart) hints.leftLegStartX = pts.leftLegStart.x;
        if (pts.rightLegStart) hints.rightLegStartX = pts.rightLegStart.x;
        hints.legStartT = averageT(hints.legStartLeftT, hints.legStartRightT);
        if (pts.leftLegStart && pts.rightLegStart) {
            hints.legStartMidX = (pts.leftLegStart.x + pts.rightLegStart.x) / 2;
        }

        // Crotch = torso bottom + leg top
        if (pts.crotch) {
            hints.crotchT = toT(pts.crotch.y);
            hints.torsoBottomT = toT(pts.crotch.y);
            hints.crotchX = pts.crotch.x;
        }

        if (hints.crotchT == null && hints.legStartT != null) {
            hints.crotchT = hints.legStartT;
        }
        if (hints.torsoBottomT == null && hints.legStartT != null) {
            hints.torsoBottomT = hints.legStartT;
        }
        if (hints.crotchX == null) {
            hints.crotchX = averageX(
                pts.crotch?.x,
                hints.legStartMidX,
                hints.hipMidX
            );
        }

        // Per-side hand tips (screen-left = character-right, screen-right = character-left)
        if (pts.leftHandTip) hints.handBottomLeftT = toT(pts.leftHandTip.y);
        if (pts.rightHandTip) hints.handBottomRightT = toT(pts.rightHandTip.y);
        if (pts.leftHandTip) hints.leftHandTipX = pts.leftHandTip.x;
        if (pts.rightHandTip) hints.rightHandTipX = pts.rightHandTip.x;
        hints.handBottomT = averageT(hints.handBottomLeftT, hints.handBottomRightT);

        // Knees
        if (pts.leftKnee) hints.kneeLeftT = toT(pts.leftKnee.y);
        if (pts.rightKnee) hints.kneeRightT = toT(pts.rightKnee.y);
        if (pts.leftKnee) hints.leftKneeX = pts.leftKnee.x;
        if (pts.rightKnee) hints.rightKneeX = pts.rightKnee.x;
        hints.kneeT = averageT(hints.kneeLeftT, hints.kneeRightT);

        // Ankles
        if (pts.leftAnkle) hints.ankleLeftT = toT(pts.leftAnkle.y);
        if (pts.rightAnkle) hints.ankleRightT = toT(pts.rightAnkle.y);
        if (pts.leftAnkle) hints.leftAnkleX = pts.leftAnkle.x;
        if (pts.rightAnkle) hints.rightAnkleX = pts.rightAnkle.x;
        hints.ankleT = averageT(hints.ankleLeftT, hints.ankleRightT);

        // Per-side foot/toe tips
        if (pts.leftToeTip) hints.footBottomLeftT = toT(pts.leftToeTip.y);
        if (pts.rightToeTip) hints.footBottomRightT = toT(pts.rightToeTip.y);
        if (pts.leftToeTip) hints.leftToeTipX = pts.leftToeTip.x;
        if (pts.rightToeTip) hints.rightToeTipX = pts.rightToeTip.x;
        if (hints.hipT == null && hints.crotchT != null) {
            const armpitT = hints.armpitT ?? (hints.shoulderT != null ? hints.shoulderT + 0.06 : null);
            if (armpitT != null) hints.hipT = armpitT + (hints.crotchT - armpitT) * 0.7;
        }

        return Object.keys(hints).length > 0 ? hints : null;
    },

    /**
     * Extract landmark hints from saved training samples.
     * Decodes the best-matching training sample onto the current outline,
     * then derives Y-boundary T values and core widths from the decoded regions.
     * Returns null if no usable training data exists.
     */
    _extractLandmarkHintsFromTraining(outline, bounds, scanlines) {
        const samples = this._getSmartCutTrainingSamples('human-front');
        if (!samples.length || !outline?.length || !bounds || !scanlines?.length) return null;

        const best = this._chooseBestSmartCutTrainingSample(outline, 'human-front');
        if (!best?.parts) return null;

        const columns = this._buildSmartCutOutlineColumns(outline, bounds);
        const toT = y => this._clamp01((y - bounds.minY) / Math.max(1, bounds.height));

        // Decode each part's polygon and extract min/max Y
        const partBounds = {};
        for (const [partKey, encodedPath] of Object.entries(best.parts)) {
            if (!encodedPath?.length) continue;
            const decoded = encodedPath.map(p =>
                this._decodeSmartCutTrainingPoint(p, bounds, scanlines, columns, outline)
            );
            let minY = Infinity, maxY = -Infinity, minX = Infinity, maxX = -Infinity;
            for (const p of decoded) {
                if (p.y < minY) minY = p.y;
                if (p.y > maxY) maxY = p.y;
                if (p.x < minX) minX = p.x;
                if (p.x > maxX) maxX = p.x;
            }
            if (Number.isFinite(minY) && Number.isFinite(maxY)) {
                partBounds[partKey] = { minY, maxY, minX, maxX, width: maxX - minX, height: maxY - minY };
            }
        }

        if (!partBounds.torso) return null;

        const hints = {};

        // Torso top/bottom → neckBottomT, crotchT
        hints.torsoTopT = toT(partBounds.torso.minY);
        hints.torsoBottomT = toT(partBounds.torso.maxY);
        hints.torsoWidth = partBounds.torso.width;

        // Shoulder T from upper-arm tops
        const luaTop = partBounds['l-upper-arm']?.minY;
        const ruaTop = partBounds['r-upper-arm']?.minY;
        if (luaTop != null && ruaTop != null) {
            hints.shoulderT = toT(Math.min(luaTop, ruaTop));
        } else if (luaTop != null || ruaTop != null) {
            hints.shoulderT = toT(luaTop ?? ruaTop);
        }

        // Crotch T from upper-leg tops
        const lulTop = partBounds['l-upper-leg']?.minY;
        const rulTop = partBounds['r-upper-leg']?.minY;
        if (lulTop != null && rulTop != null) {
            hints.crotchT = toT(Math.min(lulTop, rulTop));
        } else if (lulTop != null || rulTop != null) {
            hints.crotchT = toT(lulTop ?? rulTop);
        }

        // Hip T from torso bottom → normally hip is above crotch
        if (hints.torsoBottomT != null && hints.crotchT != null) {
            hints.hipT = Math.min(hints.torsoBottomT, hints.crotchT - 0.01);
        }

        // Elbow Y from forearm tops
        const lfTop = partBounds['l-forearm']?.minY;
        const rfTop = partBounds['r-forearm']?.minY;
        if (lfTop != null || rfTop != null) {
            hints.elbowT = toT(lfTop ?? rfTop);
        }

        // Wrist Y from hand tops
        const lhTop = partBounds['l-hand']?.minY;
        const rhTop = partBounds['r-hand']?.minY;
        if (lhTop != null || rhTop != null) {
            hints.wristT = toT(lhTop ?? rhTop);
        }

        // Hand bottom Y from hand bottoms
        const lhBot = partBounds['l-hand']?.maxY;
        const rhBot = partBounds['r-hand']?.maxY;
        if (lhBot != null || rhBot != null) {
            hints.handBottomT = toT(Math.max(lhBot ?? -Infinity, rhBot ?? -Infinity));
        }

        // Knee Y from lower-leg tops
        const lllTop = partBounds['l-lower-leg']?.minY;
        const rllTop = partBounds['r-lower-leg']?.minY;
        if (lllTop != null || rllTop != null) {
            hints.kneeT = toT(Math.min(lllTop ?? Infinity, rllTop ?? Infinity));
        }

        // Ankle Y from foot tops
        const lfootTop = partBounds['l-foot']?.minY;
        const rfootTop = partBounds['r-foot']?.minY;
        if (lfootTop != null || rfootTop != null) {
            hints.ankleT = toT(Math.min(lfootTop ?? Infinity, rfootTop ?? Infinity));
        }

        return hints;
    },

    _getSmartCutHumanFrontLandmarksFromGuidedHints(outline, bounds, hints, scanlines) {
        if (!bounds || !hints) return null;
        const toY = t => bounds.minY + this._clamp01(t) * bounds.height;
        const avg = (...values) => {
            const valid = values.filter(value => Number.isFinite(value));
            return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null;
        };
        const height = Math.max(1, bounds.height);
        const width = Math.max(1, bounds.width);

        const centerX = avg(
            hints.crotchX,
            hints.neckBaseX,
            Number.isFinite(hints.leftShoulderX) && Number.isFinite(hints.rightShoulderX)
                ? (hints.leftShoulderX + hints.rightShoulderX) / 2
                : null
        ) ?? bounds.minX + width / 2;

        const headTopY = hints.headTopT != null ? toY(hints.headTopT) : bounds.minY;
        const shoulderY = hints.shoulderT != null ? toY(hints.shoulderT) : bounds.minY + height * 0.22;
        const headBottomY = hints.headBottomT != null
            ? toY(hints.headBottomT)
            : Math.min(shoulderY - height * 0.05, headTopY + height * 0.13);
        const neckBottomY = hints.neckBottomT != null
            ? toY(hints.neckBottomT)
            : Math.min(shoulderY - height * 0.015, headBottomY + height * 0.07);
        const neckTopY = Math.max(headBottomY + Math.max(2, height * 0.01), Math.min(neckBottomY - 2, headBottomY + height * 0.04));
        const neckJoinY = neckBottomY;

        const shoulderWidth = Math.max(
            width * 0.26,
            hints.shoulderWidth || 0
        );
        const leftShoulderX = Number.isFinite(hints.leftShoulderX) ? hints.leftShoulderX : centerX - shoulderWidth / 2;
        const rightShoulderX = Number.isFinite(hints.rightShoulderX) ? hints.rightShoulderX : centerX + shoulderWidth / 2;

        const neckWidth = Math.max(width * 0.08, shoulderWidth * 0.22);
        const neckBaseWidth = Math.max(neckWidth, shoulderWidth * 0.26);
        const leftNeckJoinX = centerX - neckBaseWidth / 2;
        const rightNeckJoinX = centerX + neckBaseWidth / 2;

        const armpitY = hints.armpitT != null ? toY(hints.armpitT) : Math.min(bounds.maxY, shoulderY + height * 0.08);
        // Armpits are where the arm meets the torso — typically 15-18% inward
        // from each outer shoulder tip, making the torso ~64-70% of shoulder width.
        const leftArmpitX = Number.isFinite(hints.leftArmpitX) ? hints.leftArmpitX : leftShoulderX + shoulderWidth * 0.17;
        const rightArmpitX = Number.isFinite(hints.rightArmpitX) ? hints.rightArmpitX : rightShoulderX - shoulderWidth * 0.17;

        const crotchY = hints.crotchT != null ? toY(hints.crotchT) : bounds.minY + height * 0.56;
        const hipY = hints.hipT != null ? toY(hints.hipT) : neckBottomY + (crotchY - neckBottomY) * 0.72;
        const waistY = neckBottomY + (hipY - neckBottomY) * 0.58;
        const hipCoreWidth = Math.max(width * 0.18, shoulderWidth * 0.78);
        const waistCoreWidth = Math.max(width * 0.14, shoulderWidth * 0.58);
        const leftHipX = Number.isFinite(hints.leftHipX) ? hints.leftHipX : centerX - hipCoreWidth / 2;
        const rightHipX = Number.isFinite(hints.rightHipX) ? hints.rightHipX : centerX + hipCoreWidth / 2;
        const splitX = Number.isFinite(hints.crotchX) ? hints.crotchX : centerX;
        const legGap = Math.max(width * 0.035, hipCoreWidth * 0.16);
        const leftLegStartX = Number.isFinite(hints.leftLegStartX) ? hints.leftLegStartX : splitX - legGap;
        const rightLegStartX = Number.isFinite(hints.rightLegStartX) ? hints.rightLegStartX : splitX + legGap;

        const handBottomLeftY = hints.handBottomLeftT != null
            ? Math.max(armpitY + height * 0.08, toY(hints.handBottomLeftT))
            : Math.min(crotchY - height * 0.04, bounds.maxY - height * 0.18);
        const handBottomRightY = hints.handBottomRightT != null
            ? Math.max(armpitY + height * 0.08, toY(hints.handBottomRightT))
            : Math.min(crotchY - height * 0.04, bounds.maxY - height * 0.18);
        const handBottomY = avg(handBottomLeftY, handBottomRightY) ?? Math.min(handBottomLeftY, handBottomRightY);

        const leftHandTipX = Number.isFinite(hints.leftHandTipX) ? hints.leftHandTipX : leftShoulderX - shoulderWidth * 0.62;
        const rightHandTipX = Number.isFinite(hints.rightHandTipX) ? hints.rightHandTipX : rightShoulderX + shoulderWidth * 0.62;
        const leftElbowY = hints.elbowLeftT != null ? toY(hints.elbowLeftT) : shoulderY + (handBottomLeftY - shoulderY) * 0.44;
        const rightElbowY = hints.elbowRightT != null ? toY(hints.elbowRightT) : shoulderY + (handBottomRightY - shoulderY) * 0.44;
        const leftWristY = hints.wristLeftT != null ? toY(hints.wristLeftT) : shoulderY + (handBottomLeftY - shoulderY) * 0.78;
        const rightWristY = hints.wristRightT != null ? toY(hints.wristRightT) : shoulderY + (handBottomRightY - shoulderY) * 0.78;
        const leftElbowX = Number.isFinite(hints.leftElbowX) ? hints.leftElbowX : this._smartCutLerp(leftShoulderX, leftHandTipX, 0.42);
        const rightElbowX = Number.isFinite(hints.rightElbowX) ? hints.rightElbowX : this._smartCutLerp(rightShoulderX, rightHandTipX, 0.42);
        const leftWristX = Number.isFinite(hints.leftWristX) ? hints.leftWristX : this._smartCutLerp(leftShoulderX, leftHandTipX, 0.78);
        const rightWristX = Number.isFinite(hints.rightWristX) ? hints.rightWristX : this._smartCutLerp(rightShoulderX, rightHandTipX, 0.78);

        const footBottomLeftY = hints.footBottomLeftT != null ? toY(hints.footBottomLeftT) : bounds.maxY;
        const footBottomRightY = hints.footBottomRightT != null ? toY(hints.footBottomRightT) : bounds.maxY;
        const leftToeTipX = Number.isFinite(hints.leftToeTipX) ? hints.leftToeTipX : centerX - hipCoreWidth * 0.36;
        const rightToeTipX = Number.isFinite(hints.rightToeTipX) ? hints.rightToeTipX : centerX + hipCoreWidth * 0.36;
        const ankleLeftY = hints.ankleLeftT != null ? toY(hints.ankleLeftT) : footBottomLeftY - height * 0.06;
        const ankleRightY = hints.ankleRightT != null ? toY(hints.ankleRightT) : footBottomRightY - height * 0.06;
        const kneeLeftY = hints.kneeLeftT != null ? toY(hints.kneeLeftT) : crotchY + (ankleLeftY - crotchY) * 0.48;
        const kneeRightY = hints.kneeRightT != null ? toY(hints.kneeRightT) : crotchY + (ankleRightY - crotchY) * 0.48;
        const leftKneeX = Number.isFinite(hints.leftKneeX) ? hints.leftKneeX : this._smartCutLerp(leftLegStartX, leftToeTipX, 0.42);
        const rightKneeX = Number.isFinite(hints.rightKneeX) ? hints.rightKneeX : this._smartCutLerp(rightLegStartX, rightToeTipX, 0.42);
        const leftAnkleX = Number.isFinite(hints.leftAnkleX) ? hints.leftAnkleX : this._smartCutLerp(leftLegStartX, leftToeTipX, 0.76);
        const rightAnkleX = Number.isFinite(hints.rightAnkleX) ? hints.rightAnkleX : this._smartCutLerp(rightLegStartX, rightToeTipX, 0.76);

        return {
            bounds,
            hasGuidedHints: true,
            centerX,
            headTopY,
            headBottomY,
            neckTopY,
            neckBottomY,
            neckJoinY,
            leftNeckJoinY: neckJoinY,
            rightNeckJoinY: neckJoinY,
            upperArmTopY: shoulderY,
            shoulderY,
            armpitY,
            waistY,
            hipY,
            crotchY,
            ankleY: avg(ankleLeftY, ankleRightY) ?? Math.min(ankleLeftY, ankleRightY),
            footBottomY: Math.max(footBottomLeftY, footBottomRightY),
            jawTipX: Number.isFinite(hints.jawTipX) ? hints.jawTipX : centerX,
            jawTipY: headBottomY,
            headWidth: Math.max(width * 0.16, shoulderWidth * 0.72),
            neckWidth,
            neckBaseWidth,
            shoulderCoreWidth: shoulderWidth,
            armpitCoreWidth: Math.max(width * 0.16, Math.abs(rightArmpitX - leftArmpitX)),
            waistCoreWidth,
            hipCoreWidth,
            crotchCoreWidth: Math.max(width * 0.10, Math.abs(rightLegStartX - leftLegStartX)),
            leftNeckJoinX,
            rightNeckJoinX,
            leftShoulderX,
            rightShoulderX,
            leftArmpitX,
            rightArmpitX,
            leftHipX,
            rightHipX,
            leftLegStartX,
            rightLegStartX,
            leftElbowX,
            rightElbowX,
            leftWristX,
            rightWristX,
            leftHandTipX,
            rightHandTipX,
            leftKneeX,
            rightKneeX,
            leftAnkleX,
            rightAnkleX,
            leftToeTipX,
            rightToeTipX,
            handBottomY,
            handBottomLeftY,
            handBottomRightY,
            elbowY: avg(leftElbowY, rightElbowY) ?? leftElbowY,
            elbowLeftY,
            elbowRightY,
            wristY: avg(leftWristY, rightWristY) ?? leftWristY,
            wristLeftY,
            wristRightY,
            kneeY: avg(kneeLeftY, kneeRightY) ?? kneeLeftY,
            kneeLeftY,
            kneeRightY,
            ankleLeftY,
            ankleRightY,
            footTopY: Math.min(ankleLeftY, ankleRightY),
            footTopLeftY: ankleLeftY,
            footTopRightY: ankleRightY,
            upperLegTopY: crotchY,
            upperLegTopLeftY: crotchY,
            upperLegTopRightY: crotchY,
            footBottomLeftY,
            footBottomRightY,
            legSplitX: splitX
        };
    },

    _getSmartCutHumanFrontLandmarks(outline, bounds, scanlines, hints = null, hintWeight = 0.6) {
        if (!outline?.length || !bounds || !scanlines?.length) return null;
        const hasRichGuidedHints = Boolean(
            hints && hintWeight >= 0.8 && (
                (Number.isFinite(hints.leftShoulderX) && Number.isFinite(hints.rightShoulderX)) ||
                (Number.isFinite(hints.leftHandTipX) && Number.isFinite(hints.rightHandTipX)) ||
                Number.isFinite(hints.crotchX)
            )
        );
        if (hasRichGuidedHints) {
            return this._getSmartCutHumanFrontLandmarksFromGuidedHints(outline, bounds, hints, scanlines);
        }

        const widths = this._smoothSmartCutValues(
            scanlines.map(row => (row?.totalWidth || 0) / Math.max(1, bounds.width)),
            5
        );
        const toY = t => bounds.minY + this._clamp01(t) * bounds.height;
        const getRow = t => this._getSmartCutRowAt(scanlines, t);
        const getOuter = t => this._getSmartCutOuterSpan(getRow(t));
        const getWidth = (t, fallback = bounds.width * 0.4) => (getOuter(t)?.width || fallback);
        const getCenter = (t, fallback = bounds.centerX) => {
            const outer = getOuter(t);
            return outer ? (outer.start + outer.end) / 2 : fallback;
        };

        // Blend helper: pull detected value toward hint at given strength.
        // When hintWeight is high (guided landmarks), use the hint directly.
        const hw = hintWeight;
        const blend = (detected, hintVal) =>
            (hintVal != null && Number.isFinite(hintVal))
                ? (hw >= 0.8 ? hintVal : detected * (1 - hw) + hintVal * hw)
                : detected;

        // Use prominence-based detection for key landmarks so that the most
        // anatomically significant feature (not just absolute min/max) is found.
        let neckT = this._findSmartCutProminentProfileT(widths, 0.07, 0.23, 'min');
        neckT = Math.max(0.08, Math.min(0.20, neckT));

        let shoulderT = this._findSmartCutProminentProfileT(widths, neckT + 0.02, 0.35, 'max');
        shoulderT = Math.max(neckT + 0.03, Math.min(0.30, shoulderT));
        if (hints?.shoulderT != null) shoulderT = blend(shoulderT, hints.shoulderT);

        let armpitT = this._findSmartCutProminentProfileT(widths, shoulderT + 0.03, 0.46, 'min');
        armpitT = Math.max(shoulderT + 0.04, Math.min(0.40, armpitT));
        if (hints?.armpitT != null) armpitT = blend(armpitT, hints.armpitT);

        let waistT = this._findSmartCutProminentProfileT(widths, Math.max(0.34, armpitT + 0.04), 0.62, 'min');
        waistT = Math.max(armpitT + 0.04, Math.min(0.58, waistT));

        let hipT = this._findSmartCutProminentProfileT(widths, waistT + 0.03, 0.62, 'max');
        hipT = Math.max(waistT + 0.04, Math.min(0.58, hipT));
        if (hints?.hipT != null) hipT = blend(hipT, hints.hipT);

        // Crotch detection uses three signals blended together:
        // 1) Width-minimum: where the profile is narrowest in [hip, 0.60]
        // 2) Span-transition: where the silhouette first splits into 2 legs
        // 3) Width-derivative: where the profile narrows fastest (steepest drop)
        let crotchT = this._findSmartCutProminentProfileT(widths, hipT + 0.02, 0.60, 'min');
        crotchT = Math.max(hipT + 0.03, Math.min(0.58, crotchT));

        if (!hints) {
            const n = scanlines.length;

            // Signal 2: Span-transition — where the silhouette first splits
            let spanSplitT = null;
            const searchStart = Math.round(this._clamp01(hipT) * (n - 1));
            const searchEnd = Math.min(n - 1, Math.round(0.65 * (n - 1)));
            for (let i = searchStart; i <= searchEnd; i++) {
                if (scanlines[i]?.spans?.length >= 2) {
                    spanSplitT = n === 1 ? 0 : i / (n - 1);
                    break;
                }
            }

            // Signal 3: Width-derivative — where width drops fastest
            // (transition from wide hips/torso to narrow leg region)
            let derivT = null;
            const derivStart = Math.max(0, Math.round(this._clamp01(hipT - 0.02) * (widths.length - 1)));
            const derivEnd = Math.min(widths.length - 2, Math.round(0.62 * (widths.length - 1)));
            let maxDrop = 0;
            for (let i = derivStart; i < derivEnd; i++) {
                const drop = widths[i] - widths[i + 1];
                if (drop > maxDrop) {
                    maxDrop = drop;
                    derivT = (i + 0.5) / (widths.length - 1);
                }
            }

            // Blend signals: span-transition is strongest when available,
            // then width-derivative, then width-minimum as baseline.
            if (spanSplitT != null) {
                crotchT = crotchT * 0.25 + spanSplitT * 0.55 + (derivT ?? crotchT) * 0.20;
            } else if (derivT != null && maxDrop > 0.02) {
                crotchT = crotchT * 0.45 + derivT * 0.55;
            }
            // Final clamp
            crotchT = Math.max(hipT + 0.03, Math.min(0.58, crotchT));
        }
        if (hints?.crotchT != null) crotchT = blend(crotchT, hints.crotchT);

        let ankleT = this._findSmartCutProminentProfileT(widths, Math.max(0.74, crotchT + 0.14), 0.97, 'min');
        ankleT = Math.max(crotchT + 0.14, Math.min(0.94, ankleT));
        if (hints?.ankleT != null) ankleT = blend(ankleT, hints.ankleT);

        // When running pure auto-trace (no guided hints), cross-validate
        // the detected landmarks against known anatomical proportions and
        // correct values that are clearly implausible.
        if (!hints) {
            const validated = this._validateSmartCutAnatomicalProportions(
                { neckT, shoulderT, armpitT, waistT, hipT, crotchT, ankleT },
                widths
            );
            neckT = validated.neckT;
            shoulderT = validated.shoulderT;
            armpitT = validated.armpitT;
            waistT = validated.waistT;
            hipT = validated.hipT;
            crotchT = validated.crotchT;
            ankleT = validated.ankleT;
        }

        let headTopY = bounds.minY;
        if (hints?.headTopT != null) headTopY = headTopY * (1 - hw) + toY(hints.headTopT) * hw;
        const jawTipY = Number.isFinite(hints?.headBottomT) ? toY(hints.headBottomT) : null;
        // Head bottom = just past the neck narrowest point, but never into
        // the shoulder zone. This keeps the head circular when rendered
        // as a centerBand rather than a fullSlice.
        let headBottomY = Math.max(
            bounds.minY + bounds.height * 0.08,
            Math.min(toY(neckT) + bounds.height * 0.01, toY(shoulderT) - bounds.height * 0.03)
        );
        if (hints?.headBottomT != null) {
            headBottomY = headBottomY * (1 - hw) + toY(hints.headBottomT) * hw;
        }
        headBottomY = Math.max(
            headTopY + bounds.height * 0.06,
            Math.min(headBottomY, toY(shoulderT) - bounds.height * 0.03)
        );
        // Neck occupies the zone from headBottomY down to the shoulder line.
        // Give it enough vertical space so it doesn't look compressed.
        const rawNeckBottom = toY(neckT + (shoulderT - neckT) * 0.70);
        let neckBottomY = Math.min(
            rawNeckBottom,
            toY(shoulderT)  // can reach the shoulder line
        );
        if (hints?.neckJoinT != null) {
            neckBottomY = neckBottomY * (1 - hw) + toY(hints.neckJoinT) * hw;
        }
        if (hints?.neckBottomT != null) {
            neckBottomY = neckBottomY * (1 - hw) + toY(hints.neckBottomT) * hw;
        }
        neckBottomY = Math.max(headBottomY + 4, Math.min(neckBottomY, toY(shoulderT)));
        const neckTopOffset = Math.max(2, bounds.height * 0.008);
        const neckTopY = Math.max(
            headTopY + bounds.height * 0.06,
            Math.min(headBottomY + neckTopOffset, neckBottomY - 2)
        );

        // Upper arm starts at the shoulder cap, not below it.
        const upperArmTopY = Math.max(
            headBottomY + 4,
            Math.min(toY(shoulderT) - bounds.height * 0.01, toY(armpitT) - bounds.height * 0.03)
        );

        const neckWidth = getWidth(neckT, bounds.width * 0.2);
        const headWidth = getWidth(Math.max(0.03, neckT * 0.48), bounds.width * 0.3);
        const shoulderWidth = getWidth(shoulderT, bounds.width * 0.7);
        const armpitWidth = getWidth(armpitT, bounds.width * 0.62);
        const waistWidth = getWidth(waistT, bounds.width * 0.45);
        const hipWidth = getWidth(hipT, bounds.width * 0.54);
        const crotchWidth = getWidth(crotchT, bounds.width * 0.18);

        const detectedCenterX = (
            getCenter(neckT, bounds.centerX)
            + getCenter(waistT, bounds.centerX)
            + getCenter(hipT, bounds.centerX)
        ) / 3;
        const hintedCenterCandidates = [
            hints?.neckBaseX,
            hints?.jawTipX,
            hints?.crotchX,
            hints?.legStartMidX,
            hints?.hipMidX
        ].filter(value => Number.isFinite(value));
        const hintedCenterX = hintedCenterCandidates.length
            ? hintedCenterCandidates.reduce((sum, value) => sum + value, 0) / hintedCenterCandidates.length
            : null;
        const centerX = Number.isFinite(hintedCenterX)
            ? (hw >= 0.8 ? hintedCenterX : detectedCenterX * (1 - hw) + hintedCenterX * hw)
            : detectedCenterX;

        let shoulderCoreWidth = Math.min(
            shoulderWidth * 0.90,
            Math.max(waistWidth * 1.35, neckWidth * 2.8)
        );
        // When user clicked shoulder landmarks, use their X-distance directly
        // as shoulder core width — the user knows best where the torso edges are.
        if (hints?.shoulderWidth != null && Number.isFinite(hints.shoulderWidth) && hw >= 0.8) {
            shoulderCoreWidth = hints.shoulderWidth;
        } else if (!hints && neckWidth > 0) {
            // Anatomical constraint: shoulder core should be 2.0–3.0× neck width
            // for a front-facing human. This helps when the silhouette has arms
            // close to the body, inflating shoulderWidth beyond the true torso.
            const idealShoulderCore = neckWidth * 2.5;
            const minShoulderCore = neckWidth * 2.0;
            const maxShoulderCore = neckWidth * 3.2;
            shoulderCoreWidth = Math.max(minShoulderCore,
                Math.min(maxShoulderCore, shoulderCoreWidth));
            // Blend toward idealized ratio when the detected value is far off
            if (shoulderCoreWidth < idealShoulderCore * 0.7 ||
                shoulderCoreWidth > idealShoulderCore * 1.4) {
                shoulderCoreWidth = shoulderCoreWidth * 0.6 + idealShoulderCore * 0.4;
            }
        }
        let armpitCoreWidth = Math.min(
            armpitWidth * 0.96,
            Math.max(waistWidth * 1.15, shoulderCoreWidth * 0.88)
        );
        // If user clicked armpits, use that distance directly as armpit core width.
        // With guided landmarks (hw >= 0.8), trust the user's click fully.
        if (hints?.armpitWidth != null && Number.isFinite(hints.armpitWidth)) {
            armpitCoreWidth = hw >= 0.8 ? hints.armpitWidth : (armpitCoreWidth * (1 - hw) + hints.armpitWidth * hw);
            shoulderCoreWidth = Math.max(shoulderCoreWidth, armpitCoreWidth * 1.02);
        }
        const waistCoreWidth = Math.min(
            waistWidth * 0.98,
            Math.max(neckWidth * 1.9, waistWidth * 0.90)
        );
        const hipCoreWidth = Math.min(
            hipWidth * 0.96,
            Math.max(waistCoreWidth * 1.12, hipWidth * 0.84)
        );
        // Anatomical constraint: hip core ≈ 0.80–1.05× shoulder core
        let hipCoreConstrained = !hints
            ? Math.max(shoulderCoreWidth * 0.78,
                Math.min(shoulderCoreWidth * 1.08, hipCoreWidth))
            : hipCoreWidth;
        if (hints?.hipWidth != null && Number.isFinite(hints.hipWidth)) {
            hipCoreConstrained = hw >= 0.8
                ? hints.hipWidth
                : (hipCoreConstrained * (1 - hw) + hints.hipWidth * hw);
        }
        const crotchCoreWidth = Math.max(
            bounds.width * 0.09,
            Math.min(hipCoreConstrained * 0.54, crotchWidth * 0.94)
        );
        const neckBaseWidth = hints?.neckJoinWidth != null && Number.isFinite(hints.neckJoinWidth)
            ? (hw >= 0.8
                ? hints.neckJoinWidth
                : Math.max(neckWidth, hints.neckJoinWidth * hw + neckWidth * (1 - hw)))
            : Math.min(shoulderCoreWidth * 0.34, neckWidth * 1.28);

        const leftNeckJoinX = Number.isFinite(hints?.leftNeckJoinX) ? hints.leftNeckJoinX : centerX - neckBaseWidth / 2;
        const rightNeckJoinX = Number.isFinite(hints?.rightNeckJoinX) ? hints.rightNeckJoinX : centerX + neckBaseWidth / 2;
        const leftShoulderX = Number.isFinite(hints?.leftShoulderX) ? hints.leftShoulderX : centerX - shoulderCoreWidth / 2;
        const rightShoulderX = Number.isFinite(hints?.rightShoulderX) ? hints.rightShoulderX : centerX + shoulderCoreWidth / 2;
        const leftArmpitX = Number.isFinite(hints?.leftArmpitX) ? hints.leftArmpitX : centerX - armpitCoreWidth / 2;
        const rightArmpitX = Number.isFinite(hints?.rightArmpitX) ? hints.rightArmpitX : centerX + armpitCoreWidth / 2;
        const leftHipX = Number.isFinite(hints?.leftHipX) ? hints.leftHipX : centerX - hipCoreConstrained / 2;
        const rightHipX = Number.isFinite(hints?.rightHipX) ? hints.rightHipX : centerX + hipCoreConstrained / 2;
        const leftLegStartX = Number.isFinite(hints?.leftLegStartX) ? hints.leftLegStartX : centerX - crotchCoreWidth / 2;
        const rightLegStartX = Number.isFinite(hints?.rightLegStartX) ? hints.rightLegStartX : centerX + crotchCoreWidth / 2;
        const armReach = Math.max(
            bounds.width * 0.08,
            Math.abs(leftArmpitX - leftShoulderX) * 1.1,
            Math.abs(rightShoulderX - rightArmpitX) * 1.1
        );
        const handReach = Math.max(bounds.width * 0.025, armReach * 0.18);
        const leftElbowX = Number.isFinite(hints?.leftElbowX) ? hints.leftElbowX : leftArmpitX - armReach * 0.44;
        const rightElbowX = Number.isFinite(hints?.rightElbowX) ? hints.rightElbowX : rightArmpitX + armReach * 0.44;
        const leftWristX = Number.isFinite(hints?.leftWristX) ? hints.leftWristX : leftElbowX - armReach * 0.18;
        const rightWristX = Number.isFinite(hints?.rightWristX) ? hints.rightWristX : rightElbowX + armReach * 0.18;
        const leftHandTipX = Number.isFinite(hints?.leftHandTipX) ? hints.leftHandTipX : leftWristX - handReach;
        const rightHandTipX = Number.isFinite(hints?.rightHandTipX) ? hints.rightHandTipX : rightWristX + handReach;
        const legSpread = Math.max(bounds.width * 0.03, Math.abs(leftHipX - leftLegStartX) * 0.65);
        const leftKneeX = Number.isFinite(hints?.leftKneeX) ? hints.leftKneeX : leftLegStartX - legSpread * 0.18;
        const rightKneeX = Number.isFinite(hints?.rightKneeX) ? hints.rightKneeX : rightLegStartX + legSpread * 0.18;
        const leftAnkleX = Number.isFinite(hints?.leftAnkleX) ? hints.leftAnkleX : leftKneeX - legSpread * 0.08;
        const rightAnkleX = Number.isFinite(hints?.rightAnkleX) ? hints.rightAnkleX : rightKneeX + legSpread * 0.08;
        const footReach = Math.max(bounds.width * 0.025, legSpread * 0.22);
        const leftToeTipX = Number.isFinite(hints?.leftToeTipX) ? hints.leftToeTipX : leftAnkleX - footReach;
        const rightToeTipX = Number.isFinite(hints?.rightToeTipX) ? hints.rightToeTipX : rightAnkleX + footReach;

        const hasGuidedHints = Boolean(
            hints && (
                Number.isFinite(hints.leftShoulderX) ||
                Number.isFinite(hints.rightShoulderX) ||
                Number.isFinite(hints.leftArmpitX) ||
                Number.isFinite(hints.rightArmpitX) ||
                Number.isFinite(hints.leftHipX) ||
                Number.isFinite(hints.rightHipX)
            )
        );

        const landmarks = {
            bounds,
            hasGuidedHints,
            centerX,
            headTopY,
            headBottomY,
            neckTopY,
            neckBottomY: Math.max(headBottomY + 4, neckBottomY),
            neckJoinY: hints?.neckJoinT != null ? toY(hints.neckJoinT) : Math.max(headBottomY + 2, neckBottomY),
            leftNeckJoinY: hints?.neckJoinT != null ? toY(hints.neckJoinT) : Math.max(headBottomY + 2, neckBottomY),
            rightNeckJoinY: hints?.neckJoinT != null ? toY(hints.neckJoinT) : Math.max(headBottomY + 2, neckBottomY),
            upperArmTopY,
            shoulderY: toY(shoulderT),
            armpitY: toY(armpitT),
            waistY: toY(waistT),
            hipY: toY(hipT),
            crotchY: toY(crotchT),
            ankleY: toY(ankleT),
            footBottomY: bounds.maxY,
            jawTipX: Number.isFinite(hints?.jawTipX) ? hints.jawTipX : centerX,
            jawTipY: jawTipY ?? headBottomY,
            headWidth,
            neckWidth,
            neckBaseWidth,
            shoulderCoreWidth,
            armpitCoreWidth,
            waistCoreWidth,
            hipCoreWidth: hipCoreConstrained,
            crotchCoreWidth,
            leftNeckJoinX,
            rightNeckJoinX,
            leftShoulderX,
            rightShoulderX,
            leftArmpitX,
            rightArmpitX,
            leftHipX,
            rightHipX,
            leftLegStartX,
            rightLegStartX,
            leftElbowX,
            rightElbowX,
            leftWristX,
            rightWristX,
            leftHandTipX,
            rightHandTipX,
            leftKneeX,
            rightKneeX,
            leftAnkleX,
            rightAnkleX,
            leftToeTipX,
            rightToeTipX
        };

        const armThreshold = Math.max(12, bounds.width * 0.035);
        let handBottomY = Math.min(landmarks.crotchY, bounds.maxY - bounds.height * 0.15);
        // Scan past the crotch to detect arm/hand extensions that go below
        // the hip line — fingertips often reach mid-thigh level.
        const armScanEndY = Math.min(bounds.maxY - bounds.height * 0.08, landmarks.crotchY + bounds.height * 0.06);
        const rowsToScan = Math.max(8, Math.round((armScanEndY - landmarks.armpitY) / 6));
        let armScanFoundSeparation = false;
        let lastArmExtensionY = landmarks.armpitY;
        for (let i = 0; i < rowsToScan; i++) {
            const t = rowsToScan === 1 ? 0 : i / (rowsToScan - 1);
            const y = this._smartCutLerp(landmarks.armpitY, armScanEndY, t);
            const rowInfo = this._getSmartCutRowInfoAtY(scanlines, bounds, y);
            if (!rowInfo?.outer) continue;
            const coreHalf = this._getSmartCutHumanFrontCoreHalfWidth(y, landmarks);
            const leftExtension = (landmarks.centerX - coreHalf) - rowInfo.outer.start;
            const rightExtension = rowInfo.outer.end - (landmarks.centerX + coreHalf);
            if (Math.max(leftExtension, rightExtension) > armThreshold) {
                lastArmExtensionY = rowInfo.y;
                armScanFoundSeparation = true;
            }
        }
        if (armScanFoundSeparation) {
            // Extend 4% below the last detected arm extension to cover
            // the fingertips, which may not protrude past the core width.
            handBottomY = lastArmExtensionY + bounds.height * 0.04;
        }
        // Anatomical fallback: when arms are at the sides with no clear
        // separation, hand-bottom targets just above crotch level.
        if (!armScanFoundSeparation && !hints) {
            handBottomY = landmarks.crotchY - bounds.height * 0.01;
        }
        // When guided landmarks are available, allow hands below crotch
        // (fingertips often reach mid-thigh). Cap at knee level instead.
        const handCapY = (hints && hw >= 0.8) ? landmarks.ankleY : landmarks.crotchY;
        handBottomY = Math.max(landmarks.armpitY + bounds.height * 0.16,
            Math.min(handBottomY, handCapY));
        if (hints?.handBottomT != null) {
            handBottomY = handBottomY * (1 - hw) + toY(hints.handBottomT) * hw;
        }
        // Cap: hands can reach crotch level (or ankle when guided)
        handBottomY = Math.min(handBottomY, handCapY);

        // Per-side hand bottom (overridden by guided hand-tip clicks)
        let handBottomLeftY = handBottomY;
        let handBottomRightY = handBottomY;
        if (hints?.handBottomLeftT != null) {
            // With guided landmarks (hw >= 0.8), use the user-clicked fingertip directly
            handBottomLeftY = hw >= 0.8
                ? Math.max(landmarks.armpitY + bounds.height * 0.16, toY(hints.handBottomLeftT))
                : Math.max(landmarks.armpitY + bounds.height * 0.16, toY(hints.handBottomLeftT) * hw + handBottomY * (1 - hw));
        }
        if (hints?.handBottomRightT != null) {
            handBottomRightY = hw >= 0.8
                ? Math.max(landmarks.armpitY + bounds.height * 0.16, toY(hints.handBottomRightT))
                : Math.max(landmarks.armpitY + bounds.height * 0.16, toY(hints.handBottomRightT) * hw + handBottomY * (1 - hw));
        }
        // Cap per-side to same limit
        handBottomLeftY = Math.min(handBottomLeftY, handCapY);
        handBottomRightY = Math.min(handBottomRightY, handCapY);

        // Arm subdivision: elbow at ~46% from upperArmTopY to hand-bottom,
        // wrist at ~74% — leaves room for hand without extending into thigh.
        let elbowY = landmarks.upperArmTopY + (handBottomY - landmarks.upperArmTopY) * 0.46;
        if (hints?.elbowT != null) elbowY = elbowY * (1 - hw) + toY(hints.elbowT) * hw;
        let elbowLeftY = landmarks.upperArmTopY + (handBottomLeftY - landmarks.upperArmTopY) * 0.46;
        let elbowRightY = landmarks.upperArmTopY + (handBottomRightY - landmarks.upperArmTopY) * 0.46;
        if (hints?.elbowLeftT != null) elbowLeftY = elbowLeftY * (1 - hw) + toY(hints.elbowLeftT) * hw;
        if (hints?.elbowRightT != null) elbowRightY = elbowRightY * (1 - hw) + toY(hints.elbowRightT) * hw;

        let wristY = landmarks.upperArmTopY + (handBottomY - landmarks.upperArmTopY) * 0.74;
        if (hints?.wristT != null) wristY = wristY * (1 - hw) + toY(hints.wristT) * hw;
        let wristLeftY = landmarks.upperArmTopY + (handBottomLeftY - landmarks.upperArmTopY) * 0.74;
        let wristRightY = landmarks.upperArmTopY + (handBottomRightY - landmarks.upperArmTopY) * 0.74;
        if (hints?.wristLeftT != null) wristLeftY = wristLeftY * (1 - hw) + toY(hints.wristLeftT) * hw;
        if (hints?.wristRightT != null) wristRightY = wristRightY * (1 - hw) + toY(hints.wristRightT) * hw;

        // Knee detection: use silhouette width profile to find a local width
        // minimum in the leg region, which often corresponds to the knee.
        // Fall back to anatomical proportion (47% between crotch and ankle)
        // when no clear minimum is found.
        let kneeY;
        if (!hints) {
            const kneeScanStartT = crotchT + (ankleT - crotchT) * 0.30;
            const kneeScanEndT = crotchT + (ankleT - crotchT) * 0.65;
            const kneeProfileT = this._findSmartCutProminentProfileT(
                widths, kneeScanStartT, kneeScanEndT, 'min'
            );
            const profileKneeY = toY(kneeProfileT);
            const proportionKneeY = landmarks.crotchY + (landmarks.ankleY - landmarks.crotchY) * 0.47;
            // Blend between profile-detected and proportion-based: profile
            // detection is weighted more when it falls in a plausible range
            const plausibleRange = (landmarks.ankleY - landmarks.crotchY) * 0.15;
            if (Math.abs(profileKneeY - proportionKneeY) < plausibleRange) {
                kneeY = profileKneeY * 0.65 + proportionKneeY * 0.35;
            } else {
                kneeY = proportionKneeY;
            }
        } else {
            kneeY = landmarks.crotchY + (landmarks.ankleY - landmarks.crotchY) * 0.50;
        }
        if (hints?.kneeT != null) kneeY = kneeY * (1 - hw) + toY(hints.kneeT) * hw;
        let kneeLeftY = kneeY;
        let kneeRightY = kneeY;
        if (hints?.kneeLeftT != null) kneeLeftY = kneeLeftY * (1 - hw) + toY(hints.kneeLeftT) * hw;
        if (hints?.kneeRightT != null) kneeRightY = kneeRightY * (1 - hw) + toY(hints.kneeRightT) * hw;

        let ankleLeftY = landmarks.ankleY;
        let ankleRightY = landmarks.ankleY;
        if (hints?.ankleLeftT != null) ankleLeftY = ankleLeftY * (1 - hw) + toY(hints.ankleLeftT) * hw;
        if (hints?.ankleRightT != null) ankleRightY = ankleRightY * (1 - hw) + toY(hints.ankleRightT) * hw;
        const footTopY = Math.max(landmarks.ankleY, bounds.maxY - bounds.height * 0.17);
        const footTopLeftY = Math.max(ankleLeftY, bounds.maxY - bounds.height * 0.17);
        const footTopRightY = Math.max(ankleRightY, bounds.maxY - bounds.height * 0.17);

        let upperLegTopY = landmarks.crotchY - bounds.height * 0.02;
        if (hints?.legStartT != null) upperLegTopY = upperLegTopY * (1 - hw) + toY(hints.legStartT) * hw;
        let upperLegTopLeftY = upperLegTopY;
        let upperLegTopRightY = upperLegTopY;
        if (hints?.legStartLeftT != null) upperLegTopLeftY = upperLegTopLeftY * (1 - hw) + toY(hints.legStartLeftT) * hw;
        if (hints?.legStartRightT != null) upperLegTopRightY = upperLegTopRightY * (1 - hw) + toY(hints.legStartRightT) * hw;

        // Per-side foot bottom (overridden by guided toe-tip clicks)
        let footBottomLeftY = landmarks.footBottomY;
        let footBottomRightY = landmarks.footBottomY;
        if (hints?.footBottomLeftT != null) {
            footBottomLeftY = footBottomLeftY * (1 - hw) + toY(hints.footBottomLeftT) * hw;
        }
        if (hints?.footBottomRightT != null) {
            footBottomRightY = footBottomRightY * (1 - hw) + toY(hints.footBottomRightT) * hw;
        }

        // Improved leg split detection: scan multiple rows from crotch
        // downward to find a consistent gap between two leg spans, rather
        // than relying solely on the very bottom foot row.
        let legSplitX = !hints
            ? this._findSmartCutLegSplitX(scanlines, bounds, crotchT, centerX)
            : centerX;
        const footRow = this._getSmartCutRowInfoAtY(scanlines, bounds, bounds.maxY - 2);
        if (legSplitX === centerX && footRow?.row?.spans?.length >= 2) {
            legSplitX = (footRow.row.spans[0].end + footRow.row.spans[footRow.row.spans.length - 1].start) / 2;
        }
        const hintedSplitX = [hints?.crotchX, hints?.legStartMidX, hints?.hipMidX]
            .find(value => Number.isFinite(value));
        if (Number.isFinite(hintedSplitX)) {
            legSplitX = legSplitX * (1 - hw) + hintedSplitX * hw;
        }

        return {
            ...landmarks,
            handBottomY,
            handBottomLeftY,
            handBottomRightY,
            elbowY,
            elbowLeftY,
            elbowRightY,
            wristY,
            wristLeftY,
            wristRightY,
            kneeY,
            kneeLeftY,
            kneeRightY,
            ankleLeftY,
            ankleRightY,
            footTopY,
            footTopLeftY,
            footTopRightY,
            upperLegTopY,
            upperLegTopLeftY,
            upperLegTopRightY,
            footBottomLeftY,
            footBottomRightY,
            legSplitX
        };
    },

    _getSmartCutHumanFrontCoreHalfWidth(y, landmarks) {
        if (!landmarks) return 0;
        const value = this._interpolateSmartCutValueByY(y, [
            { y: (landmarks.neckTopY + landmarks.neckBottomY) / 2, value: landmarks.neckWidth * 0.52 },
            { y: landmarks.shoulderY, value: landmarks.shoulderCoreWidth / 2 },
            { y: landmarks.armpitY, value: landmarks.armpitCoreWidth / 2 },
            { y: landmarks.waistY, value: landmarks.waistCoreWidth / 2 },
            { y: landmarks.hipY, value: landmarks.hipCoreWidth / 2 },
            { y: landmarks.crotchY, value: landmarks.crotchCoreWidth / 2 }
        ], landmarks.waistCoreWidth / 2);
        return Math.max(4, value);
    },

    _getSmartCutHumanFrontTorsoBand(rowInfo, landmarks) {
        if (!rowInfo?.outer || !landmarks) return null;

        const coreHalf = this._getSmartCutHumanFrontCoreHalfWidth(rowInfo.y, landmarks);
        const splitGap = Math.max(2, landmarks.bounds.width * 0.008);
        const leftAnchors = [
            { y: landmarks.neckJoinY, value: landmarks.leftNeckJoinX },
            { y: landmarks.shoulderY, value: landmarks.leftShoulderX },
            { y: landmarks.armpitY, value: landmarks.leftArmpitX },
            { y: landmarks.hipY, value: landmarks.leftHipX },
            { y: landmarks.crotchY, value: Math.min(landmarks.leftLegStartX, landmarks.legSplitX - splitGap) }
        ];
        const rightAnchors = [
            { y: landmarks.neckJoinY, value: landmarks.rightNeckJoinX },
            { y: landmarks.shoulderY, value: landmarks.rightShoulderX },
            { y: landmarks.armpitY, value: landmarks.rightArmpitX },
            { y: landmarks.hipY, value: landmarks.rightHipX },
            { y: landmarks.crotchY, value: Math.max(landmarks.rightLegStartX, landmarks.legSplitX + splitGap) }
        ];
        let start = this._interpolateSmartCutValueByY(rowInfo.y, leftAnchors, landmarks.centerX - coreHalf);
        let end = this._interpolateSmartCutValueByY(rowInfo.y, rightAnchors, landmarks.centerX + coreHalf);

        // When the silhouette has 3+ separated spans (arms away from torso),
        // pick the span closest to center as the torso.
        if (rowInfo.row?.spans?.length >= 3) {
            const torsoSpan = rowInfo.row.spans.reduce((best, span) => {
                const center = (span.start + span.end) / 2;
                const bestCenter = best ? (best.start + best.end) / 2 : Infinity;
                return Math.abs(center - landmarks.centerX) < Math.abs(bestCenter - landmarks.centerX) ? span : best;
            }, null);
            if (torsoSpan) {
                const armpitHalf = landmarks.armpitCoreWidth ? landmarks.armpitCoreWidth / 2 : coreHalf;
                const shoulderHalf = landmarks.shoulderCoreWidth ? landmarks.shoulderCoreWidth / 2 : armpitHalf;
                const maxHalf = (landmarks.armpitY && rowInfo.y <= landmarks.armpitY)
                    ? Math.min(coreHalf, shoulderHalf)
                    : Math.min(coreHalf, armpitHalf);
                start = Math.max(torsoSpan.start, Math.max(start, landmarks.centerX - maxHalf));
                end = Math.min(torsoSpan.end, Math.min(end, landmarks.centerX + maxHalf));
                if (end - start >= 2) return { start, end };
            }
        }

        if (landmarks.hasGuidedHints) {
            start = Math.max(rowInfo.outer.start, start);
            end = Math.min(rowInfo.outer.end, end);
            return end - start >= 2 ? { start, end } : null;
        }

        // The torso width should follow the guided landmarks:
        // Above armpitY: clamp to shoulderCoreWidth (shoulders are wider than armpits).
        // Below armpitY: clamp to armpitCoreWidth (torso narrows from armpit down).
        // Below hipY: clamp to hipCoreWidth (pelvis region).
        let finalCoreHalf = coreHalf;
        if (landmarks.armpitY && rowInfo.y <= landmarks.armpitY) {
            // Shoulder-to-armpit zone: use shoulder width as the limit
            if (landmarks.shoulderCoreWidth) {
                finalCoreHalf = Math.min(finalCoreHalf, landmarks.shoulderCoreWidth / 2);
            }
        } else {
            // Below armpit: use armpit core width as the limit
            if (landmarks.armpitCoreWidth) {
                const armpitHalf = landmarks.armpitCoreWidth / 2;
                finalCoreHalf = Math.min(finalCoreHalf, armpitHalf);
            }
        }

        // Below the hip line, use hip core width to cover the pelvis
        // area without spilling into the thigh/leg regions.
        if (landmarks.hipY && landmarks.hipCoreWidth && rowInfo.y > landmarks.hipY) {
            const hipHalf = landmarks.hipCoreWidth / 2;
            finalCoreHalf = Math.min(finalCoreHalf, hipHalf);
        }

        start = Math.max(rowInfo.outer.start, Math.max(start, landmarks.centerX - finalCoreHalf));
        end = Math.min(rowInfo.outer.end, Math.min(end, landmarks.centerX + finalCoreHalf));
        return end - start >= 2 ? { start, end } : null;
    },

    _getSmartCutHumanFrontPreferredSpan(rowInfo, targetX = null, screenSide = 'left') {
        if (!rowInfo?.row?.spans?.length) return rowInfo?.outer || null;
        if (Number.isFinite(targetX)) {
            const closest = this._getSmartCutClosestSpan(rowInfo.row.spans, targetX) || rowInfo.outer;
            if ((rowInfo.row.spans.length || 0) >= 3) {
                const outerCenter = (rowInfo.outer.start + rowInfo.outer.end) / 2;
                const closestCenter = (closest.start + closest.end) / 2;
                if (screenSide === 'left' && closestCenter > outerCenter) {
                    return rowInfo.row.spans[0];
                }
                if (screenSide === 'right' && closestCenter < outerCenter) {
                    return rowInfo.row.spans[rowInfo.row.spans.length - 1];
                }
            }
            return closest;
        }
        return screenSide === 'left'
            ? rowInfo.row.spans[0]
            : rowInfo.row.spans[rowInfo.row.spans.length - 1];
    },

    _getSmartCutHumanFrontArmBand(rowInfo, landmarks, screenSide, segment = 'full') {
        if (!rowInfo?.outer || !landmarks) return null;
        const isLeft = screenSide === 'left';
        const prefix = isLeft ? 'left' : 'right';
        const towardCenter = isLeft ? 1 : -1;
        const sideElbowY = isLeft ? (landmarks.elbowLeftY ?? landmarks.elbowY) : (landmarks.elbowRightY ?? landmarks.elbowY);
        const sideWristY = isLeft ? (landmarks.wristLeftY ?? landmarks.wristY) : (landmarks.wristRightY ?? landmarks.wristY);
        const sideHandBottom = isLeft ? (landmarks.handBottomLeftY ?? landmarks.handBottomY) : (landmarks.handBottomRightY ?? landmarks.handBottomY);
        const sideShoulderX = landmarks[`${prefix}ShoulderX`];
        const sideArmpitX = landmarks[`${prefix}ArmpitX`];
        const sideElbowX = landmarks[`${prefix}ElbowX`];
        const sideWristX = landmarks[`${prefix}WristX`];
        const sideHandTipX = landmarks[`${prefix}HandTipX`];

        // Only generate arm regions from upper arm top down to hand bottom.
        // Use per-side hand bottom so guided fingertip landmarks are respected.
        if (rowInfo.y < landmarks.upperArmTopY || rowInfo.y > sideHandBottom) {
            return null;
        }

        const thumbAllowance = Math.max(4, landmarks.bounds.width * 0.025);
        const targetX = this._interpolateSmartCutValueByY(rowInfo.y, [
            { y: landmarks.upperArmTopY, value: sideShoulderX },
            { y: sideElbowY, value: sideElbowX },
            { y: sideWristY, value: sideWristX },
            { y: sideHandBottom, value: sideHandTipX }
        ], sideShoulderX);
        const span = this._getSmartCutHumanFrontPreferredSpan(rowInfo, targetX, screenSide);
        if (!span) return null;

        let seamX;
        if (segment === 'upper-arm') {
            seamX = this._interpolateSmartCutValueByY(rowInfo.y, [
                { y: landmarks.upperArmTopY, value: this._smartCutLerp(sideShoulderX, sideArmpitX, 0.36) },
                { y: landmarks.armpitY, value: sideArmpitX },
                { y: sideElbowY, value: sideElbowX }
            ], sideArmpitX);
        } else if (segment === 'forearm') {
            seamX = this._interpolateSmartCutValueByY(rowInfo.y, [
                { y: sideElbowY, value: sideElbowX },
                { y: sideWristY, value: sideWristX },
                { y: sideHandBottom, value: sideHandTipX + towardCenter * thumbAllowance * 0.55 }
            ], sideWristX);
        } else if (segment === 'hand') {
            seamX = this._interpolateSmartCutValueByY(rowInfo.y, [
                { y: sideWristY, value: sideWristX + towardCenter * thumbAllowance * 0.35 },
                { y: sideHandBottom, value: sideHandTipX + towardCenter * thumbAllowance }
            ], sideHandTipX + towardCenter * thumbAllowance);
        } else {
            seamX = this._interpolateSmartCutValueByY(rowInfo.y, [
                { y: landmarks.upperArmTopY, value: this._smartCutLerp(sideShoulderX, sideArmpitX, 0.36) },
                { y: landmarks.armpitY, value: sideArmpitX },
                { y: sideElbowY, value: sideElbowX },
                { y: sideWristY, value: sideWristX },
                { y: sideHandBottom, value: sideHandTipX + towardCenter * thumbAllowance }
            ], sideArmpitX);
        }

        let start = isLeft ? span.start : seamX;
        let end = isLeft ? seamX : span.end;
        const minWidth = segment === 'hand'
            ? Math.max(8, landmarks.bounds.width * 0.038)
            : Math.max(4, landmarks.bounds.width * 0.022);

        if (segment === 'hand') {
            if (isLeft) {
                end = Math.max(end, sideHandTipX + thumbAllowance);
            } else {
                start = Math.min(start, sideHandTipX - thumbAllowance);
            }
        }

        start = Math.max(span.start, Math.min(start, span.end));
        end = Math.min(span.end, Math.max(end, start + 0.5));

        if (end - start < minWidth) {
            if (isLeft) {
                end = Math.min(span.end, start + minWidth);
            } else {
                start = Math.max(span.start, end - minWidth);
            }
        }

        return end - start >= 2 ? { start, end } : null;
    },

    _getSmartCutHumanFrontLegBand(rowInfo, landmarks, screenSide, segment = 'leg') {
        if (!rowInfo?.outer || !landmarks) return null;
        const isLeft = screenSide === 'left';
        const prefix = isLeft ? 'left' : 'right';
        const splitGap = Math.max(2, landmarks.bounds.width * 0.008);
        const kneeY = isLeft ? (landmarks.kneeLeftY ?? landmarks.kneeY) : (landmarks.kneeRightY ?? landmarks.kneeY);
        const ankleY = isLeft ? (landmarks.ankleLeftY ?? landmarks.ankleY) : (landmarks.ankleRightY ?? landmarks.ankleY);
        const upperLegTopY = isLeft ? (landmarks.upperLegTopLeftY ?? landmarks.upperLegTopY) : (landmarks.upperLegTopRightY ?? landmarks.upperLegTopY);
        const footTopY = isLeft ? (landmarks.footTopLeftY ?? landmarks.footTopY) : (landmarks.footTopRightY ?? landmarks.footTopY);
        const footBottomY = isLeft ? (landmarks.footBottomLeftY ?? landmarks.footBottomY) : (landmarks.footBottomRightY ?? landmarks.footBottomY);
        const hipX = landmarks[`${prefix}HipX`];
        const legStartX = landmarks[`${prefix}LegStartX`];
        const kneeX = landmarks[`${prefix}KneeX`];
        const ankleX = landmarks[`${prefix}AnkleX`];
        const toeTipX = landmarks[`${prefix}ToeTipX`];
        const targetCenterX = this._interpolateSmartCutValueByY(rowInfo.y, [
            { y: upperLegTopY, value: this._smartCutLerp(hipX, legStartX, 0.60) },
            { y: kneeY, value: kneeX },
            { y: ankleY, value: ankleX },
            { y: footBottomY, value: this._smartCutLerp(ankleX, toeTipX, 0.65) }
        ], legStartX);
        const topHalf = Math.max(6, Math.abs(legStartX - hipX) * 0.95 + landmarks.bounds.width * 0.01);
        const kneeHalf = Math.max(5, topHalf * 0.72);
        const ankleHalf = Math.max(4, topHalf * 0.52);
        const footHalf = Math.max(kneeHalf, Math.abs(toeTipX - ankleX) * 0.85 + landmarks.bounds.width * 0.015);
        const halfWidth = this._interpolateSmartCutValueByY(rowInfo.y, [
            { y: upperLegTopY, value: topHalf },
            { y: kneeY, value: kneeHalf },
            { y: ankleY, value: ankleHalf },
            { y: footTopY, value: Math.max(ankleHalf, footHalf * 0.85) },
            { y: footBottomY, value: footHalf }
        ], topHalf);
        const span = this._getSmartCutHumanFrontPreferredSpan(rowInfo, targetCenterX, screenSide);
        if (!span) return null;

        let start = Math.max(span.start, targetCenterX - halfWidth);
        let end = Math.min(span.end, targetCenterX + halfWidth);
        if (isLeft) {
            end = Math.min(end, landmarks.legSplitX - splitGap);
        } else {
            start = Math.max(start, landmarks.legSplitX + splitGap);
        }

        const minWidth = segment === 'foot'
            ? Math.max(8, landmarks.bounds.width * 0.032)
            : Math.max(5, landmarks.bounds.width * 0.022);
        if (end - start < minWidth) {
            const mid = targetCenterX;
            start = Math.max(span.start, mid - minWidth / 2);
            end = Math.min(span.end, mid + minWidth / 2);
            if (isLeft) end = Math.min(end, landmarks.legSplitX - splitGap);
            else start = Math.max(start, landmarks.legSplitX + splitGap);
        }

        return end - start >= 2 ? { start, end } : null;
    },

    _buildSmartCutGuidedInterpolatedBand(bounds, scanlines, yStart, yEnd, centerAnchors, widthAnchors, options = {}) {
        if (!bounds || !scanlines?.length || !Number.isFinite(yStart) || !Number.isFinite(yEnd) || yEnd <= yStart) {
            return [];
        }
        const minWidth = Math.max(2, options.minWidth || 0);
        const splitGap = Math.max(0, options.splitGap || 0);
        const preferredSide = options.preferredSide || null;
        const splitX = options.splitX;
        return this._buildSmartCutBandPolygon(
            bounds,
            scanlines,
            yStart,
            yEnd,
            rowInfo => {
                const center = this._interpolateSmartCutValueByY(
                    rowInfo.y,
                    centerAnchors,
                    bounds.centerX
                );
                const width = Math.max(
                    minWidth,
                    this._interpolateSmartCutValueByY(rowInfo.y, widthAnchors, minWidth)
                );
                const span = this._getSmartCutHumanFrontPreferredSpan(rowInfo, center, preferredSide) || rowInfo.outer;
                if (!span) return null;

                let start = Math.max(span.start, center - width / 2);
                let end = Math.min(span.end, center + width / 2);
                if (preferredSide === 'left' && Number.isFinite(splitX)) {
                    end = Math.min(end, splitX - splitGap);
                }
                if (preferredSide === 'right' && Number.isFinite(splitX)) {
                    start = Math.max(start, splitX + splitGap);
                }

                if (end - start < minWidth) {
                    start = Math.max(span.start, center - minWidth / 2);
                    end = Math.min(span.end, center + minWidth / 2);
                    if (preferredSide === 'left' && Number.isFinite(splitX)) end = Math.min(end, splitX - splitGap);
                    if (preferredSide === 'right' && Number.isFinite(splitX)) start = Math.max(start, splitX + splitGap);
                }

                return end - start >= 2 ? { start, end } : null;
            },
            options.sampleCount || null
        );
    },

    _buildSmartCutHumanFrontGuidedRegions(outline, preset, landmarks) {
        const points = this._smartCutGuidedLandmarks?.points;
        const bounds = landmarks?.bounds || this._getSmartCutRegionBounds(outline);
        if (!points || !bounds) return [];
        const scanlines = this._buildSmartCutOutlineScanlines(outline, bounds);
        if (!scanlines.length) return [];

        const splitGap = Math.max(3, bounds.width * 0.01);
        const avg = (...values) => {
            const valid = values.filter(value => Number.isFinite(value));
            return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null;
        };
        const getPoint = (key, fallbackX = null, fallbackY = null) => ({
            x: Number.isFinite(points?.[key]?.x) ? points[key].x : fallbackX,
            y: Number.isFinite(points?.[key]?.y) ? points[key].y : fallbackY
        });

        const headTopY = Number.isFinite(points?.headTop?.y) ? points.headTop.y : landmarks.headTopY;
        const jawY = Number.isFinite(points?.jawTip?.y) ? points.jawTip.y : (landmarks.jawTipY || landmarks.headBottomY);
        const neckJoinY = avg(points?.leftNeckJoin?.y, points?.rightNeckJoin?.y) ?? landmarks.neckJoinY;
        const neckBaseY = Number.isFinite(points?.neckBase?.y) ? points.neckBase.y : landmarks.neckBottomY;
        const shoulderY = avg(points?.leftShoulder?.y, points?.rightShoulder?.y) ?? landmarks.shoulderY;
        const armpitY = avg(points?.leftArmpit?.y, points?.rightArmpit?.y) ?? landmarks.armpitY;
        const hipY = avg(points?.leftHip?.y, points?.rightHip?.y) ?? landmarks.hipY;
        const crotchY = Number.isFinite(points?.crotch?.y) ? points.crotch.y : landmarks.crotchY;
        const splitX = Number.isFinite(points?.crotch?.x)
            ? points.crotch.x
            : (avg(points?.leftLegStart?.x, points?.rightLegStart?.x) ?? landmarks.legSplitX);

        const leftNeckJoin = getPoint('leftNeckJoin', landmarks.leftNeckJoinX, landmarks.leftNeckJoinY);
        const rightNeckJoin = getPoint('rightNeckJoin', landmarks.rightNeckJoinX, landmarks.rightNeckJoinY);
        const leftShoulder = getPoint('leftShoulder', landmarks.leftShoulderX, landmarks.shoulderY);
        const rightShoulder = getPoint('rightShoulder', landmarks.rightShoulderX, landmarks.shoulderY);
        const leftArmpit = getPoint('leftArmpit', landmarks.leftArmpitX, landmarks.armpitY);
        const rightArmpit = getPoint('rightArmpit', landmarks.rightArmpitX, landmarks.armpitY);
        const leftElbow = getPoint('leftElbow', landmarks.leftElbowX, landmarks.elbowLeftY);
        const rightElbow = getPoint('rightElbow', landmarks.rightElbowX, landmarks.elbowRightY);
        const leftWrist = getPoint('leftWrist', landmarks.leftWristX, landmarks.wristLeftY);
        const rightWrist = getPoint('rightWrist', landmarks.rightWristX, landmarks.wristRightY);
        const leftHandTip = getPoint('leftHandTip', landmarks.leftHandTipX, landmarks.handBottomLeftY);
        const rightHandTip = getPoint('rightHandTip', landmarks.rightHandTipX, landmarks.handBottomRightY);
        const leftHip = getPoint('leftHip', landmarks.leftHipX, landmarks.hipY);
        const rightHip = getPoint('rightHip', landmarks.rightHipX, landmarks.hipY);
        const leftLegStart = getPoint('leftLegStart', landmarks.leftLegStartX, landmarks.upperLegTopLeftY);
        const rightLegStart = getPoint('rightLegStart', landmarks.rightLegStartX, landmarks.upperLegTopRightY);
        const leftKnee = getPoint('leftKnee', landmarks.leftKneeX, landmarks.kneeLeftY);
        const rightKnee = getPoint('rightKnee', landmarks.rightKneeX, landmarks.kneeRightY);
        const leftAnkle = getPoint('leftAnkle', landmarks.leftAnkleX, landmarks.ankleLeftY);
        const rightAnkle = getPoint('rightAnkle', landmarks.rightAnkleX, landmarks.ankleRightY);
        const leftToeTip = getPoint('leftToeTip', landmarks.leftToeTipX, landmarks.footBottomLeftY);
        const rightToeTip = getPoint('rightToeTip', landmarks.rightToeTipX, landmarks.footBottomRightY);

        const torsoTopY = Math.min(leftNeckJoin.y, rightNeckJoin.y, neckJoinY);
        const neckStartY = Math.max(jawY + bounds.height * 0.01, Math.min(neckBaseY - 2, jawY + bounds.height * 0.04));
        const neckEndY = Math.max(neckStartY + 3, Math.min(neckBaseY, torsoTopY + bounds.height * 0.02));
        const neckCenterX = avg(leftNeckJoin.x, rightNeckJoin.x, points?.neckBase?.x) ?? landmarks.centerX;
        const neckWidth = Math.max(6, Math.abs(rightNeckJoin.x - leftNeckJoin.x));

        const leftShoulderCenterX = avg(leftShoulder.x, leftArmpit.x) ?? leftShoulder.x;
        const rightShoulderCenterX = avg(rightShoulder.x, rightArmpit.x) ?? rightShoulder.x;
        const leftUpperArmWidth = Math.max(bounds.width * 0.045, Math.abs(leftShoulder.x - leftArmpit.x) * 1.05);
        const rightUpperArmWidth = Math.max(bounds.width * 0.045, Math.abs(rightShoulder.x - rightArmpit.x) * 1.05);
        const leftForearmWidth = Math.max(bounds.width * 0.035, leftUpperArmWidth * 0.78, Math.abs(leftElbow.x - leftWrist.x) * 0.35);
        const rightForearmWidth = Math.max(bounds.width * 0.035, rightUpperArmWidth * 0.78, Math.abs(rightElbow.x - rightWrist.x) * 0.35);
        const leftHandWidth = Math.max(bounds.width * 0.06, Math.abs(leftHandTip.x - leftWrist.x) * 1.45, leftForearmWidth * 1.05, leftUpperArmWidth * 0.65);
        const rightHandWidth = Math.max(bounds.width * 0.06, Math.abs(rightHandTip.x - rightWrist.x) * 1.45, rightForearmWidth * 1.05, rightUpperArmWidth * 0.65);

        const leftUpperLegCenterX = avg(leftHip.x, leftLegStart.x) ?? leftLegStart.x;
        const rightUpperLegCenterX = avg(rightHip.x, rightLegStart.x) ?? rightLegStart.x;
        const leftUpperLegWidth = Math.max(bounds.width * 0.055, Math.abs(leftHip.x - leftLegStart.x) * 1.35);
        const rightUpperLegWidth = Math.max(bounds.width * 0.055, Math.abs(rightHip.x - rightLegStart.x) * 1.35);
        const leftLowerLegWidth = Math.max(bounds.width * 0.04, leftUpperLegWidth * 0.74, Math.abs(leftKnee.x - leftAnkle.x) * 0.32);
        const rightLowerLegWidth = Math.max(bounds.width * 0.04, rightUpperLegWidth * 0.74, Math.abs(rightKnee.x - rightAnkle.x) * 0.32);
        const leftFootWidth = Math.max(bounds.width * 0.055, Math.abs(leftToeTip.x - leftAnkle.x) * 1.4, leftLowerLegWidth * 0.95);
        const rightFootWidth = Math.max(bounds.width * 0.055, Math.abs(rightToeTip.x - rightAnkle.x) * 1.4, rightLowerLegWidth * 0.95);

        const minArea = Math.max(18, bounds.width * bounds.height * 0.0007);
        const makeRegion = (partKey, path) => {
            const part = preset.parts.find(entry => entry.partKey === partKey);
            if (!path?.length || path.length < 4) return null;
            if (this._getSmartCutPolygonArea(path) < minArea && !/neck|hand|foot/.test(partKey)) return null;
            return {
                label: partKey,
                name: part?.name || partKey,
                path: this._simplifySmartCutPolygon(path)
            };
        };

        const fullSlice = (yStart, yEnd, sampleCount = null) => this._buildSmartCutBandPolygon(
            bounds,
            scanlines,
            yStart,
            yEnd,
            rowInfo => ({ start: rowInfo.outer.start, end: rowInfo.outer.end }),
            sampleCount
        );

        const torsoPath = this._buildSmartCutBandPolygon(
            bounds,
            scanlines,
            torsoTopY,
            crotchY,
            rowInfo => {
                const start = this._interpolateSmartCutValueByY(rowInfo.y, [
                    { y: torsoTopY, value: leftNeckJoin.x },
                    { y: shoulderY, value: leftShoulder.x },
                    { y: armpitY, value: leftArmpit.x },
                    { y: hipY, value: leftHip.x },
                    { y: crotchY, value: Math.min(leftLegStart.x, splitX - splitGap) }
                ], leftArmpit.x);
                const end = this._interpolateSmartCutValueByY(rowInfo.y, [
                    { y: torsoTopY, value: rightNeckJoin.x },
                    { y: shoulderY, value: rightShoulder.x },
                    { y: armpitY, value: rightArmpit.x },
                    { y: hipY, value: rightHip.x },
                    { y: crotchY, value: Math.max(rightLegStart.x, splitX + splitGap) }
                ], rightArmpit.x);
                const startClamped = Math.max(rowInfo.outer.start, start);
                const endClamped = Math.min(rowInfo.outer.end, end);
                return endClamped - startClamped >= 2 ? { start: startClamped, end: endClamped } : null;
            },
            26
        );

        const regionsByKey = {
            head: makeRegion('head', fullSlice(headTopY, jawY, 18)),
            neck: makeRegion('neck', this._buildSmartCutGuidedInterpolatedBand(
                bounds,
                scanlines,
                neckStartY,
                neckEndY,
                [
                    { y: neckStartY, value: neckCenterX },
                    { y: neckEndY, value: neckCenterX }
                ],
                [
                    { y: neckStartY, value: neckWidth * 0.72 },
                    { y: neckEndY, value: neckWidth }
                ],
                { minWidth: 6, sampleCount: 10 }
            )),
            torso: makeRegion('torso', torsoPath),
            'r-upper-arm': makeRegion('r-upper-arm', this._buildSmartCutGuidedInterpolatedBand(
                bounds, scanlines, leftShoulder.y, leftElbow.y,
                [
                    { y: leftShoulder.y, value: leftShoulderCenterX },
                    { y: leftElbow.y, value: leftElbow.x }
                ],
                [
                    { y: leftShoulder.y, value: leftUpperArmWidth },
                    { y: leftElbow.y, value: leftUpperArmWidth * 0.74 }
                ],
                { minWidth: 6, preferredSide: 'left', sampleCount: 16 }
            )),
            'r-forearm': makeRegion('r-forearm', this._buildSmartCutGuidedInterpolatedBand(
                bounds, scanlines, leftElbow.y, leftWrist.y,
                [
                    { y: leftElbow.y, value: leftElbow.x },
                    { y: leftWrist.y, value: leftWrist.x }
                ],
                [
                    { y: leftElbow.y, value: leftForearmWidth },
                    { y: leftWrist.y, value: leftForearmWidth * 0.78 }
                ],
                { minWidth: 5, preferredSide: 'left', sampleCount: 14 }
            )),
            'r-hand': makeRegion('r-hand', this._buildSmartCutGuidedInterpolatedBand(
                bounds, scanlines, leftWrist.y, leftHandTip.y,
                [
                    { y: leftWrist.y, value: leftWrist.x },
                    { y: leftHandTip.y, value: (leftWrist.x + leftHandTip.x) / 2 }
                ],
                [
                    { y: leftWrist.y, value: leftHandWidth * 0.82 },
                    { y: leftHandTip.y, value: leftHandWidth }
                ],
                { minWidth: 8, preferredSide: 'left', sampleCount: 12 }
            )),
            'l-upper-arm': makeRegion('l-upper-arm', this._buildSmartCutGuidedInterpolatedBand(
                bounds, scanlines, rightShoulder.y, rightElbow.y,
                [
                    { y: rightShoulder.y, value: rightShoulderCenterX },
                    { y: rightElbow.y, value: rightElbow.x }
                ],
                [
                    { y: rightShoulder.y, value: rightUpperArmWidth },
                    { y: rightElbow.y, value: rightUpperArmWidth * 0.74 }
                ],
                { minWidth: 6, preferredSide: 'right', sampleCount: 16 }
            )),
            'l-forearm': makeRegion('l-forearm', this._buildSmartCutGuidedInterpolatedBand(
                bounds, scanlines, rightElbow.y, rightWrist.y,
                [
                    { y: rightElbow.y, value: rightElbow.x },
                    { y: rightWrist.y, value: rightWrist.x }
                ],
                [
                    { y: rightElbow.y, value: rightForearmWidth },
                    { y: rightWrist.y, value: rightForearmWidth * 0.78 }
                ],
                { minWidth: 5, preferredSide: 'right', sampleCount: 14 }
            )),
            'l-hand': makeRegion('l-hand', this._buildSmartCutGuidedInterpolatedBand(
                bounds, scanlines, rightWrist.y, rightHandTip.y,
                [
                    { y: rightWrist.y, value: rightWrist.x },
                    { y: rightHandTip.y, value: (rightWrist.x + rightHandTip.x) / 2 }
                ],
                [
                    { y: rightWrist.y, value: rightHandWidth * 0.82 },
                    { y: rightHandTip.y, value: rightHandWidth }
                ],
                { minWidth: 8, preferredSide: 'right', sampleCount: 12 }
            )),
            'r-upper-leg': makeRegion('r-upper-leg', this._buildSmartCutGuidedInterpolatedBand(
                bounds, scanlines, leftLegStart.y, leftKnee.y,
                [
                    { y: leftLegStart.y, value: leftUpperLegCenterX },
                    { y: leftKnee.y, value: leftKnee.x }
                ],
                [
                    { y: leftLegStart.y, value: leftUpperLegWidth },
                    { y: leftKnee.y, value: leftUpperLegWidth * 0.76 }
                ],
                { minWidth: 6, preferredSide: 'left', splitX, splitGap, sampleCount: 16 }
            )),
            'r-lower-leg': makeRegion('r-lower-leg', this._buildSmartCutGuidedInterpolatedBand(
                bounds, scanlines, leftKnee.y, leftAnkle.y,
                [
                    { y: leftKnee.y, value: leftKnee.x },
                    { y: leftAnkle.y, value: leftAnkle.x }
                ],
                [
                    { y: leftKnee.y, value: leftLowerLegWidth },
                    { y: leftAnkle.y, value: leftLowerLegWidth * 0.74 }
                ],
                { minWidth: 5, preferredSide: 'left', splitX, splitGap, sampleCount: 16 }
            )),
            'r-foot': makeRegion('r-foot', this._buildSmartCutGuidedInterpolatedBand(
                bounds, scanlines, leftAnkle.y, leftToeTip.y,
                [
                    { y: leftAnkle.y, value: leftAnkle.x },
                    { y: leftToeTip.y, value: (leftAnkle.x + leftToeTip.x) / 2 }
                ],
                [
                    { y: leftAnkle.y, value: leftFootWidth * 0.78 },
                    { y: leftToeTip.y, value: leftFootWidth }
                ],
                { minWidth: 9, preferredSide: 'left', splitX, splitGap, sampleCount: 12 }
            )),
            'l-upper-leg': makeRegion('l-upper-leg', this._buildSmartCutGuidedInterpolatedBand(
                bounds, scanlines, rightLegStart.y, rightKnee.y,
                [
                    { y: rightLegStart.y, value: rightUpperLegCenterX },
                    { y: rightKnee.y, value: rightKnee.x }
                ],
                [
                    { y: rightLegStart.y, value: rightUpperLegWidth },
                    { y: rightKnee.y, value: rightUpperLegWidth * 0.76 }
                ],
                { minWidth: 6, preferredSide: 'right', splitX, splitGap, sampleCount: 16 }
            )),
            'l-lower-leg': makeRegion('l-lower-leg', this._buildSmartCutGuidedInterpolatedBand(
                bounds, scanlines, rightKnee.y, rightAnkle.y,
                [
                    { y: rightKnee.y, value: rightKnee.x },
                    { y: rightAnkle.y, value: rightAnkle.x }
                ],
                [
                    { y: rightKnee.y, value: rightLowerLegWidth },
                    { y: rightAnkle.y, value: rightLowerLegWidth * 0.74 }
                ],
                { minWidth: 5, preferredSide: 'right', splitX, splitGap, sampleCount: 16 }
            )),
            'l-foot': makeRegion('l-foot', this._buildSmartCutGuidedInterpolatedBand(
                bounds, scanlines, rightAnkle.y, rightToeTip.y,
                [
                    { y: rightAnkle.y, value: rightAnkle.x },
                    { y: rightToeTip.y, value: (rightAnkle.x + rightToeTip.x) / 2 }
                ],
                [
                    { y: rightAnkle.y, value: rightFootWidth * 0.78 },
                    { y: rightToeTip.y, value: rightFootWidth }
                ],
                { minWidth: 9, preferredSide: 'right', splitX, splitGap, sampleCount: 12 }
            ))
        };

        return preset.parts
            .map(part => regionsByKey[part.partKey])
            .filter(Boolean);
    },

    _buildSmartCutHumanFrontRegions(outline, preset) {
        const bounds = this._getSmartCutRegionBounds(outline);
        if (!bounds) return [];
        const scanlines = this._buildSmartCutOutlineScanlines(outline, bounds);
        const guidedHints = this._buildHintsFromGuidedLandmarks(bounds);
        // When the user provided guided landmarks, use only those (no training
        // bleed-through). When no guided hints, use training only if enabled.
        const useTraining = this._smartCutUseTraining !== false;
        const trainingHints = (guidedHints || !useTraining)
            ? null
            : this._extractLandmarkHintsFromTraining(outline, bounds, scanlines);
        const hints = guidedHints || trainingHints;
        // Guided clicks are high-confidence (0.85), training data is moderate (0.6)
        const hintWeight = guidedHints ? 0.85 : 0.6;
        const landmarks = this._getSmartCutHumanFrontLandmarks(outline, bounds, scanlines, hints, hintWeight);
        if (!landmarks) return [];
        if (guidedHints && this._smartCutGuidedLandmarks?.points) {
            const guidedRegions = this._buildSmartCutHumanFrontGuidedRegions(outline, preset, landmarks);
            // Accept guided regions with a lower threshold — the user placed
            // landmarks deliberately, so honour them even if a few small parts
            // (neck, hands, feet) failed to produce sufficient area.
            if (guidedRegions.length >= Math.max(8, (preset.parts?.length || 0) - 6)) {
                return guidedRegions;
            }
        }

        const minArea = Math.max(18, bounds.width * bounds.height * 0.0007);
        const makeRegion = (partKey, path) => {
            const part = preset.parts.find(entry => entry.partKey === partKey);
            if (!path?.length || path.length < 4) return null;
            if (this._getSmartCutPolygonArea(path) < minArea && !/neck|hand|foot/.test(partKey)) return null;
            return {
                label: partKey,
                name: part?.name || partKey,
                path: this._simplifySmartCutPolygon(path)
            };
        };

        const centerBand = (yStart, yEnd, widthStart, widthEnd, sampleCount = null) => this._buildSmartCutBandPolygon(
            bounds,
            scanlines,
            yStart,
            yEnd,
            (rowInfo, y, t) => {
                const halfWidth = this._smartCutLerp(widthStart / 2, widthEnd / 2, t);
                return {
                    start: landmarks.centerX - halfWidth,
                    end: landmarks.centerX + halfWidth
                };
            },
            sampleCount
        );

        const fullSlice = (yStart, yEnd, sampleCount = null) => this._buildSmartCutBandPolygon(
            bounds,
            scanlines,
            yStart,
            yEnd,
            rowInfo => ({ start: rowInfo.outer.start, end: rowInfo.outer.end }),
            sampleCount
        );

        const sideSlice = (screenSide, yStart, yEnd, segment = 'full', sampleCount = null) => this._buildSmartCutBandPolygon(
            bounds,
            scanlines,
            yStart,
            yEnd,
            rowInfo => this._getSmartCutHumanFrontArmBand(rowInfo, landmarks, screenSide, segment),
            sampleCount
        );

        const legSlice = (screenSide, yStart, yEnd, segment = 'leg', sampleCount = null) => this._buildSmartCutBandPolygon(
            bounds,
            scanlines,
            yStart,
            yEnd,
            rowInfo => this._getSmartCutHumanFrontLegBand(rowInfo, landmarks, screenSide, segment),
            sampleCount
        );

        const hw = hintWeight;
        let torsoTopY = landmarks.neckJoinY || landmarks.neckBottomY;
        if (hints?.neckJoinT != null) {
            const hintY = bounds.minY + hints.neckJoinT * bounds.height;
            torsoTopY = torsoTopY * (1 - hw) + hintY * hw;
        } else if (hints?.torsoTopT != null) {
            const hintY = bounds.minY + hints.torsoTopT * bounds.height;
            torsoTopY = torsoTopY * (1 - hw) + hintY * hw;
        }

        const regionsByKey = {
            // Head: walk the actual outline contour above headBottomY so the
            // head polygon follows the real silhouette shape (roughly circular)
            // instead of a synthetic interpolated band.
            head: makeRegion('head', this._buildSmartCutHeadContour(
                outline,
                landmarks.headBottomY,
                null,
                null,
                { x: landmarks.jawTipX, y: landmarks.jawTipY }
            )),
            neck: makeRegion('neck', centerBand(
                landmarks.neckTopY,
                landmarks.neckBottomY,
                landmarks.neckWidth,
                landmarks.neckBaseWidth,
                12
            )),
            // Torso ends at crotchY — it should stop just above the crotch.
            torso: makeRegion('torso', this._buildSmartCutBandPolygon(
                bounds,
                scanlines,
                torsoTopY,
                landmarks.crotchY,
                rowInfo => this._getSmartCutHumanFrontTorsoBand(rowInfo, landmarks),
                28
            )),

            // Arms start at shoulder level (upperArmTopY) so the
            // upper-arm region covers the full shoulder-to-elbow range.
            'r-upper-arm': makeRegion('r-upper-arm', sideSlice('left', landmarks.upperArmTopY, landmarks.elbowLeftY, 'upper-arm', 16)),
            'r-forearm': makeRegion('r-forearm', sideSlice('left', landmarks.elbowLeftY, landmarks.wristLeftY, 'forearm', 16)),
            'r-hand': makeRegion('r-hand', sideSlice('left', landmarks.wristLeftY, landmarks.handBottomLeftY, 'hand', 12)),

            'l-upper-arm': makeRegion('l-upper-arm', sideSlice('right', landmarks.upperArmTopY, landmarks.elbowRightY, 'upper-arm', 16)),
            'l-forearm': makeRegion('l-forearm', sideSlice('right', landmarks.elbowRightY, landmarks.wristRightY, 'forearm', 16)),
            'l-hand': makeRegion('l-hand', sideSlice('right', landmarks.wristRightY, landmarks.handBottomRightY, 'hand', 12)),

            // Upper legs start 2% above crotchY — overlapping slightly
            // above the torso bottom to eliminate any gap.
            'r-upper-leg': makeRegion('r-upper-leg', legSlice('left', landmarks.upperLegTopLeftY, landmarks.kneeLeftY, 'upper-leg', 18)),
            'r-lower-leg': makeRegion('r-lower-leg', legSlice('left', landmarks.kneeLeftY, landmarks.ankleLeftY, 'lower-leg', 18)),
            'r-foot': makeRegion('r-foot', legSlice('left', landmarks.footTopLeftY, landmarks.footBottomLeftY, 'foot', 12)),

            'l-upper-leg': makeRegion('l-upper-leg', legSlice('right', landmarks.upperLegTopRightY, landmarks.kneeRightY, 'upper-leg', 18)),
            'l-lower-leg': makeRegion('l-lower-leg', legSlice('right', landmarks.kneeRightY, landmarks.ankleRightY, 'lower-leg', 18)),
            'l-foot': makeRegion('l-foot', legSlice('right', landmarks.footTopRightY, landmarks.footBottomRightY, 'foot', 12))
        };

        return preset.parts
            .map(part => regionsByKey[part.partKey])
            .filter(Boolean);
    },

    _mergeSmartCutIntervals(intervals, minSpan = 0.002) {
        if (!intervals?.length) return [];
        const merged = [];
        const sorted = intervals
            .map(interval => ({ start: interval.start, end: interval.end }))
            .filter(interval => interval.end - interval.start > minSpan)
            .sort((a, b) => a.start - b.start);
        sorted.forEach(interval => {
            const last = merged[merged.length - 1];
            if (!last || interval.start > last.end + minSpan) {
                merged.push(interval);
            } else {
                last.end = Math.max(last.end, interval.end);
            }
        });
        return merged;
    },

    _buildSmartCutTemplateScanlines(template) {
        if (!template?.parts) return [];
        const polygons = Object.values(template.parts);
        const rowCount = 220;
        const rows = [];
        for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
            const t = rowCount === 1 ? 0 : rowIndex / (rowCount - 1);
            const y = t;
            const intervals = [];
            polygons.forEach(poly => {
                const intersections = [];
                for (let i = 0; i < poly.length; i++) {
                    const a = poly[i];
                    const b = poly[(i + 1) % poly.length];
                    if ((a.y <= y && b.y > y) || (b.y <= y && a.y > y)) {
                        const ratio = (y - a.y) / ((b.y - a.y) || 0.000001);
                        intersections.push(a.x + (b.x - a.x) * ratio);
                    }
                }
                intersections.sort((a, b) => a - b);
                for (let i = 0; i + 1 < intersections.length; i += 2) {
                    intervals.push({ start: intersections[i], end: intersections[i + 1] });
                }
            });
            const spans = this._mergeSmartCutIntervals(intervals);
            rows.push({
                y,
                spans,
                totalWidth: spans.reduce((sum, span) => sum + (span.end - span.start), 0)
            });
        }
        return rows;
    },

    _buildSmartCutTemplateColumns(template) {
        if (!template?.parts) return [];
        const polygons = Object.values(template.parts);
        const colCount = 220;
        const cols = [];
        for (let colIndex = 0; colIndex < colCount; colIndex++) {
            const t = colCount === 1 ? 0 : colIndex / (colCount - 1);
            const x = t;
            const intervals = [];
            polygons.forEach(poly => {
                const intersections = [];
                for (let i = 0; i < poly.length; i++) {
                    const a = poly[i];
                    const b = poly[(i + 1) % poly.length];
                    if ((a.x <= x && b.x > x) || (b.x <= x && a.x > x)) {
                        const ratio = (x - a.x) / ((b.x - a.x) || 0.000001);
                        intersections.push(a.y + (b.y - a.y) * ratio);
                    }
                }
                intersections.sort((a, b) => a - b);
                for (let i = 0; i + 1 < intersections.length; i += 2) {
                    intervals.push({ start: intersections[i], end: intersections[i + 1] });
                }
            });
            const spans = this._mergeSmartCutIntervals(intervals);
            cols.push({
                x,
                spans,
                totalHeight: spans.reduce((sum, span) => sum + (span.end - span.start), 0)
            });
        }
        return cols;
    },

    _mapSmartCutAcrossSpans(t, spans, spanSizeKey) {
        if (!spans?.length) return null;
        const total = spans.reduce((sum, span) => sum + Math.max(0, span[spanSizeKey]), 0);
        if (total <= 1) return null;
        let remaining = this._clamp01(t) * total;
        for (const span of spans) {
            const size = Math.max(0, span[spanSizeKey]);
            if (remaining <= size) {
                return span.start + remaining;
            }
            remaining -= size;
        }
        return spans[spans.length - 1].end;
    },

    _clampSmartCutXToRowSpans(x, spans) {
        if (!spans?.length) return x;
        for (const span of spans) {
            if (x >= span.start && x <= span.end) return x;
        }
        let bestX = spans[0].start;
        let bestDist = Math.abs(x - bestX);
        spans.forEach(span => {
            const leftDist = Math.abs(x - span.start);
            if (leftDist < bestDist) {
                bestDist = leftDist;
                bestX = span.start;
            }
            const rightDist = Math.abs(x - span.end);
            if (rightDist < bestDist) {
                bestDist = rightDist;
                bestX = span.end;
            }
        });
        return bestX;
    },

    _getSmartCutOccupiedDistance(value, spans, spanSizeKey) {
        if (!spans?.length) return null;
        const clamped = this._clamp01(value);
        let consumed = 0;
        let previous = null;
        for (const span of spans) {
            const size = Math.max(0, span[spanSizeKey]);
            if (clamped < span.start) {
                if (!previous) return 0;
                const distToPrev = Math.abs(clamped - previous.end);
                const distToNext = Math.abs(span.start - clamped);
                return distToPrev <= distToNext ? consumed : consumed;
            }
            if (clamped <= span.end) {
                return consumed + (clamped - span.start);
            }
            consumed += size;
            previous = span;
        }
        return consumed;
    },

    _getSmartCutOccupiedDistanceAbsolute(value, spans, spanSizeKey) {
        if (!spans?.length) return null;
        let consumed = 0;
        for (const span of spans) {
            const size = Math.max(0, span[spanSizeKey]);
            if (value <= span.start) return consumed;
            if (value <= span.end) return consumed + (value - span.start);
            consumed += size;
        }
        return consumed;
    },

    _buildSmartCutOutlineDescriptor(bounds, scanlines, columns, bins = 28) {
        const rowProfile = [];
        const colProfile = [];
        for (let i = 0; i < bins; i++) {
            const t = bins === 1 ? 0 : i / (bins - 1);
            const rowIndex = Math.max(0, Math.min((scanlines?.length || 1) - 1, Math.round(t * ((scanlines?.length || 1) - 1))));
            const colIndex = Math.max(0, Math.min((columns?.length || 1) - 1, Math.round(t * ((columns?.length || 1) - 1))));
            const row = scanlines?.[rowIndex];
            const col = columns?.[colIndex];
            rowProfile.push((row?.totalWidth || 0) / Math.max(1, bounds?.width || 1));
            colProfile.push((col?.totalHeight || 0) / Math.max(1, bounds?.height || 1));
        }
        return {
            aspect: (bounds?.width || 1) / Math.max(1, bounds?.height || 1),
            rowProfile,
            colProfile
        };
    },

    _scoreSmartCutDescriptorMatch(a, b) {
        if (!a || !b) return Infinity;
        const len = Math.max(a.rowProfile?.length || 0, b.rowProfile?.length || 0, 1);
        let rowError = 0;
        let colError = 0;
        for (let i = 0; i < len; i++) {
            rowError += Math.abs((a.rowProfile?.[i] || 0) - (b.rowProfile?.[i] || 0));
            colError += Math.abs((a.colProfile?.[i] || 0) - (b.colProfile?.[i] || 0));
        }
        return Math.abs((a.aspect || 1) - (b.aspect || 1)) * 1.75
            + (rowError / len) * 2.25
            + (colError / len) * 1.75;
    },

    _chooseBestSmartCutTrainingSample(outline, presetKey = this._smartCutPreset?.key) {
        const samples = this._getSmartCutTrainingSamples(presetKey);
        if (!samples.length || !outline?.length) return null;
        const bounds = this._getSmartCutRegionBounds(outline);
        if (!bounds) return null;
        const scanlines = this._buildSmartCutOutlineScanlines(outline, bounds);
        const columns = this._buildSmartCutOutlineColumns(outline, bounds);
        const descriptor = this._buildSmartCutOutlineDescriptor(bounds, scanlines, columns);
        return samples
            .map(sample => ({
                sample,
                score: this._scoreSmartCutDescriptorMatch(descriptor, sample.descriptor)
            }))
            .sort((a, b) => a.score - b.score)[0]?.sample || null;
    },

    _encodeSmartCutTrainingPoint(point, bounds, scanlines, columns) {
        const xNorm = this._clamp01((point.x - bounds.minX) / Math.max(1, bounds.width));
        const yNorm = this._clamp01((point.y - bounds.minY) / Math.max(1, bounds.height));
        const rowIndex = Math.max(0, Math.min(scanlines.length - 1, Math.round(yNorm * (scanlines.length - 1))));
        const colIndex = Math.max(0, Math.min(columns.length - 1, Math.round(xNorm * (columns.length - 1))));
        const row = scanlines[rowIndex];
        const col = columns[colIndex];
        const rowOcc = row?.totalWidth > 0
            ? this._clamp01(this._getSmartCutOccupiedDistanceAbsolute(point.x, row.spans.map(span => ({
                start: span.start,
                end: span.end,
                width: span.end - span.start
            })), 'width') / row.totalWidth)
            : xNorm;
        const colOcc = col?.totalHeight > 0
            ? this._clamp01(this._getSmartCutOccupiedDistanceAbsolute(point.y, col.spans.map(span => ({
                start: span.start,
                end: span.end,
                height: span.end - span.start
            })), 'height') / col.totalHeight)
            : yNorm;
        return { xNorm, yNorm, rowOcc, colOcc };
    },

    _captureSmartCutTrainingSample(preset, outline, regions) {
        if (!preset?.key || !outline?.length || !regions?.length) return null;
        const bounds = this._getSmartCutRegionBounds(outline);
        if (!bounds) return null;
        const scanlines = this._buildSmartCutOutlineScanlines(outline, bounds);
        const columns = this._buildSmartCutOutlineColumns(outline, bounds);
        const parts = {};
        regions.forEach(region => {
            if (!region?.label || !region?.path?.length) return;
            parts[region.label] = region.path.map(point => this._encodeSmartCutTrainingPoint(point, bounds, scanlines, columns));
        });
        return {
            id: `sc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            presetKey: preset.key,
            createdAt: Date.now(),
            descriptor: this._buildSmartCutOutlineDescriptor(bounds, scanlines, columns),
            parts
        };
    },

    _decodeSmartCutTrainingPoint(encodedPoint, bounds, scanlines, columns, outline) {
        // Use normalized coordinates directly — these give reliable
        // proportional positions without the span-walking drift that caused
        // criss-crossing lines when the new silhouette had a different span
        // structure than the training silhouette.
        const mappedX = bounds.minX + (encodedPoint.xNorm || 0) * bounds.width;
        const mappedY = bounds.minY + (encodedPoint.yNorm || 0) * bounds.height;
        const mapped = { x: mappedX, y: mappedY };

        // If inside the outline, use directly.
        if (this._bsPointInPolygon(mapped.x, mapped.y, outline)) return mapped;

        // Outside: clamp X to the nearest span at this Y level.
        if (scanlines?.length) {
            const rowIdx = Math.max(0, Math.min(scanlines.length - 1,
                Math.round(((mappedY - bounds.minY) / Math.max(1, bounds.height)) * (scanlines.length - 1))));
            const row = scanlines[rowIdx];
            if (row?.spans?.length) {
                const clamped = this._clampSmartCutXToRowSpans(mapped.x, row.spans);
                if (clamped != null) {
                    mapped.x = clamped;
                    if (this._bsPointInPolygon(mapped.x, mapped.y, outline)) return mapped;
                }
            }
        }

        // Final fallback: snap to nearest outline point with a distance cap.
        const nearest = this._nearestPointOnSmartCutOutline(mapped, outline);
        const maxSnap = Math.max(bounds.width, bounds.height) * 0.10;
        const dx = nearest.x - mapped.x, dy = nearest.y - mapped.y;
        if (Math.sqrt(dx * dx + dy * dy) <= maxSnap) return nearest;

        return mapped;
    },

    _buildSmartCutAutoRegionsFromTrainingSample(outline, preset, sample) {
        if (!sample?.parts || !preset?.parts?.length) return [];
        const bounds = this._getSmartCutRegionBounds(outline);
        if (!bounds) return [];
        const scanlines = this._buildSmartCutOutlineScanlines(outline, bounds);
        const columns = this._buildSmartCutOutlineColumns(outline, bounds);
        return preset.parts.map(part => {
            const encodedPath = sample.parts[part.partKey];
            if (!encodedPath?.length) return null;
            let path = encodedPath.map(point => this._decodeSmartCutTrainingPoint(point, bounds, scanlines, columns, outline));

            // Post-process: remove spike vertices that are too far from
            // the region centroid. These are decode artefacts where a point
            // landed in a different body part, creating extending lines.
            if (path.length >= 4) {
                const cx = path.reduce((s, p) => s + p.x, 0) / path.length;
                const cy = path.reduce((s, p) => s + p.y, 0) / path.length;
                const avgR = path.reduce((s, p) => {
                    const dx = p.x - cx, dy = p.y - cy;
                    return s + Math.sqrt(dx * dx + dy * dy);
                }, 0) / path.length;
                const spikeThreshold = Math.max(avgR * 2.5, bounds.width * 0.06);
                path = path.filter(p => {
                    const dx = p.x - cx, dy = p.y - cy;
                    return Math.sqrt(dx * dx + dy * dy) <= spikeThreshold;
                });
            }

            // Remove self-intersecting edges: detect consecutive vertices
            // that cause a large direction reversal and remove them.
            if (path.length >= 4) {
                const cleaned = [path[0]];
                for (let i = 1; i < path.length - 1; i++) {
                    const prev = cleaned[cleaned.length - 1];
                    const curr = path[i];
                    const next = path[i + 1];
                    // Check if curr creates a sharp spike by measuring the
                    // distance from curr to the line prev→next
                    const segLen = Math.hypot(next.x - prev.x, next.y - prev.y);
                    if (segLen < 0.5) { cleaned.push(curr); continue; }
                    const crossDist = Math.abs(
                        (next.x - prev.x) * (prev.y - curr.y) -
                        (prev.x - curr.x) * (next.y - prev.y)
                    ) / segLen;
                    const maxDeviation = Math.max(bounds.width, bounds.height) * 0.12;
                    if (crossDist > maxDeviation) continue; // skip spike vertex
                    cleaned.push(curr);
                }
                cleaned.push(path[path.length - 1]);
                path = cleaned;
            }

            return {
                label: part.partKey,
                name: part.name,
                path: this._simplifySmartCutPolygon(path)
            };
        }).filter(region => region?.path?.length >= 3);
    },

    _nearestPointOnSmartCutOutline(point, outline) {
        if (!outline?.length) return point;
        let best = null;
        let bestDistSq = Infinity;
        for (let i = 0; i < outline.length; i++) {
            const a = outline[i];
            const b = outline[(i + 1) % outline.length];
            const abx = b.x - a.x;
            const aby = b.y - a.y;
            const denom = (abx * abx) + (aby * aby) || 1;
            const t = Math.max(0, Math.min(1, (((point.x - a.x) * abx) + ((point.y - a.y) * aby)) / denom));
            const candidate = {
                x: a.x + abx * t,
                y: a.y + aby * t
            };
            const dx = candidate.x - point.x;
            const dy = candidate.y - point.y;
            const distSq = (dx * dx) + (dy * dy);
            if (distSq < bestDistSq) {
                best = candidate;
                bestDistSq = distSq;
            }
        }
        return best || point;
    },

    _mapSmartCutTemplatePointToOutline(point, bounds, scanlines, columns, outline, templateRows, templateCols) {
        const fallbackX = bounds.minX + point.x * bounds.width;
        const fallbackY = bounds.minY + point.y * bounds.height;

        const mappedY = fallbackY;
        let mappedX = fallbackX;
        if (scanlines?.length && templateRows?.length) {
            const rowT = this._clamp01(point.y);
            const outlineRowIndex = Math.max(
                0,
                Math.min(scanlines.length - 1, Math.round(rowT * (scanlines.length - 1)))
            );
            const templateRowIndex = Math.max(
                0,
                Math.min(templateRows.length - 1, Math.round(rowT * (templateRows.length - 1)))
            );
            const row = scanlines[outlineRowIndex];
            const templateRow = templateRows[templateRowIndex];
            const occupiedX = this._getSmartCutOccupiedDistance(point.x, templateRow?.spans?.map(span => ({
                start: span.start,
                end: span.end,
                width: span.end - span.start
            })), 'width');
            if (occupiedX != null && templateRow?.totalWidth > 0) {
                const spanX = this._mapSmartCutAcrossSpans(occupiedX / templateRow.totalWidth, row?.spans?.map(span => ({
                    start: span.start,
                    end: span.end,
                    width: span.end - span.start
                })), 'width');
                if (spanX != null) mappedX = spanX;
            }
            mappedX = this._clampSmartCutXToRowSpans(mappedX, row?.spans);
        }

        const mapped = { x: mappedX, y: mappedY };
        if (this._bsPointInPolygon(mapped.x, mapped.y, outline)) return mapped;

        const rowIndex = Math.max(
            0,
            Math.min(scanlines.length - 1, Math.round(((mappedY - bounds.minY) / Math.max(1, bounds.height)) * (scanlines.length - 1)))
        );
        const row = scanlines[rowIndex];
        if (row?.spans?.length) {
            return {
                x: this._clampSmartCutXToRowSpans(mappedX, row.spans),
                y: mappedY
            };
        }

        return this._nearestPointOnSmartCutOutline(mapped, outline);
    },

    _buildSmartCutAutoRegionsFromTemplate(outline, preset) {
        if (preset?.key === 'human-front') {
            const silhouetteRegions = this._buildSmartCutHumanFrontRegions(outline, preset);
            // When guided landmarks were provided, accept the result even if
            // a few parts are missing — the user's clicks should be honoured.
            // Without guided landmarks, require a higher region count.
            const hasGuided = this._smartCutGuidedLandmarks?.points
                && Object.keys(this._smartCutGuidedLandmarks.points).length > 0;
            const minRegions = hasGuided
                ? Math.max(8, (preset.parts?.length || 0) - 6)
                : Math.max(12, (preset.parts?.length || 0) - 2);
            if (silhouetteRegions.length >= minRegions) {
                return silhouetteRegions;
            }
        }
        const template = JointSystem._getStencilTemplates()[preset?.key];
        const bounds = this._getSmartCutRegionBounds(outline);
        if (!template?.parts || !bounds) return [];
        const scanlines = this._buildSmartCutOutlineScanlines(outline, bounds);
        const verticalAnchors = this._buildSmartCutVerticalAnchorMap(outline, preset, bounds, scanlines);
        const adjustedTemplate = this._buildSmartCutAdaptiveTemplate(template, preset, scanlines, verticalAnchors, bounds, outline);
        const stencilFit = this._buildSmartCutAutoRegionsFromStencilFit(outline, preset, adjustedTemplate, {
            bounds,
            scanlines,
            verticalAnchors
        });
        if (stencilFit.length >= 2) return stencilFit;
        const columns = this._buildSmartCutOutlineColumns(outline, bounds);
        const templateRows = this._buildSmartCutTemplateScanlines(adjustedTemplate);
        const templateCols = this._buildSmartCutTemplateColumns(adjustedTemplate);
        return Object.entries(adjustedTemplate.parts).map(([partKey, normPath]) => {
            const part = preset.parts.find(entry => entry.partKey === partKey);
            return {
                label: partKey,
                name: part?.name || partKey,
                path: this._simplifySmartCutPolygon(normPath.map(point => this._mapSmartCutTemplatePointToOutline(point, bounds, scanlines, columns, outline, templateRows, templateCols)))
            };
        }).filter(region => region.path.length >= 3);
    },

    _smartCutAutoTrace(panel, cutNow = false, trainMode = false) {
        if (!this._smartCutObj || !this._smartCutPreset) return;
        if (!this._smartCutSupportsAutoTrace()) {
            Utils.showToast('Automatic part seeding is currently available for Human (Front) and Human (Side)', 'info');
            return;
        }
        const tracer = this.objects?._aiTrace;
        if (!tracer?.trace) {
            Utils.showToast('Auto Trace engine is not available', 'warning');
            return;
        }

        try {
            const opts = this._getSmartCutAutoTraceOptions(panel);
            const removeBgToggle = panel?.querySelector('#sc-auto-remove-bg');
            if (removeBgToggle) removeBgToggle.checked = true;
            this._smartCutApplyBgRemovedPreview(panel);
            const traceSourceObj = this._getSmartCutTraceSourceObject();

            let result = null;
            let lastError = null;
            const attempts = [
                { sensitivity: opts.sensitivity, bgTolerance: opts.bgTolerance },
                {
                    sensitivity: Math.min(100, opts.sensitivity + 6),
                    bgTolerance: Math.min(100, opts.bgTolerance + 12)
                }
            ];
            for (const attempt of attempts) {
                try {
                    result = tracer.trace(traceSourceObj, {
                        mode: 'outline',
                        detail: 2,
                        sensitivity: attempt.sensitivity,
                        minRegion: 120,
                        smooth: true,
                        removeBg: true,
                        bgTolerance: attempt.bgTolerance,
                        allowRawFallback: false
                    });
                    if (result?.shapes?.[0]?.points?.length >= 3) break;
                } catch (error) {
                    lastError = error;
                    result = null;
                }
            }
            const outline = result?.shapes?.[0]?.points;
            if (!outline || outline.length < 3) {
                Utils.showToast(lastError?.message || 'Could not isolate the foreground after removing the background. Increase BG Tolerance or Sensitivity and try again.', 'warning');
                return;
            }

            // When guided landmarks are active, always use the template/landmark
            // path so the user's clicks are honoured. Training data is only
            // used when no guided landmarks were collected AND the user has
            // the "Use Training Data" checkbox enabled.
            const hasGuidedLandmarks = this._smartCutGuidedLandmarks?.points
                && Object.keys(this._smartCutGuidedLandmarks.points).length > 0;
            const useTraining = panel?.querySelector('#sc-use-training')?.checked !== false;

            let bestTraining = null;
            if (!hasGuidedLandmarks && useTraining) {
                bestTraining = this._chooseBestSmartCutTrainingSample(outline, this._smartCutPreset.key);
            }
            // Propagate training flag so _buildSmartCutHumanFrontRegions
            // also skips training hints when the user disabled it.
            this._smartCutUseTraining = !hasGuidedLandmarks && useTraining;
            const autoRegions = bestTraining
                ? this._buildSmartCutAutoRegionsFromTrainingSample(outline, this._smartCutPreset, bestTraining)
                : this._buildSmartCutAutoRegionsFromTemplate(outline, this._smartCutPreset);
            if (autoRegions.length < 2) {
                Utils.showToast('Could not build automatic body-part regions for this preset', 'warning');
                return;
            }

            this._smartCutAutoOutline = outline.map(point => ({ x: point.x, y: point.y }));
            this._smartCutRegions = autoRegions;
            this._smartCutCurrentPath = [];
            this._smartCutPathClosed = false;
            this._smartCutSelectedRegion = autoRegions.length ? 0 : null;
            panel.querySelector('#sc-trace-current')?.classList.add('hidden');
            this._setSmartCutManualTraceEnabled(panel, false);
            // Always enter edit mode after a successful auto-trace so the user can immediately
            // drag regions, drag points, right-click to add/remove points, and reshape parts
            // before cutting. Without this, mouse clicks on the canvas would only place new
            // trace points and the auto-traced rectangles would be unmovable.
            this._setSmartCutEditMode(panel, true);
            this._updatePartSelect(panel);
            this._updateRegionsList(panel);
            this.stage.requestRender();

            if (bestTraining) {
                Utils.showToast(`Auto-traced ${autoRegions.length} preset regions using the closest saved training example`, 'success');
            } else {
                const methodLabel = this._smartCutPreset?.key === 'human-front'
                    ? 'silhouette landmark fitting'
                    : 'silhouette-guided stencil fitting';
                Utils.showToast(`Auto-traced ${autoRegions.length} preset regions using ${methodLabel}`, 'success');
            }

            if (cutNow) {
                this._smartCutAndAssemble(panel);
            }
        } catch (error) {
            Utils.showToast(error?.message || 'Auto Trace failed for Smart Cut', 'warning');
        }
    },

    // ── Edge Map for Snapping ──

    _buildEdgeMap() {
        const obj = this._smartCutObj;
        if (!obj || !obj.imageElement) return;

        const img = obj.imageElement;
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        // Cap for performance
        const maxDim = 400;
        const scale = Math.min(1, maxDim / Math.max(w, h));
        const sw = Math.round(w * scale);
        const sh = Math.round(h * scale);

        const canvas = document.createElement('canvas');
        canvas.width = sw;
        canvas.height = sh;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, sw, sh);
        const data = ctx.getImageData(0, 0, sw, sh).data;

        // Build alpha edge map (pixels neighboring transparency)
        const edges = new Uint8Array(sw * sh);
        const threshold = 20;
        for (let y = 1; y < sh - 1; y++) {
            for (let x = 1; x < sw - 1; x++) {
                const idx = (y * sw + x) * 4;
                const alpha = data[idx + 3];
                if (alpha < threshold) continue;
                // Check 4-connected neighbors for transparency
                const t = data[((y - 1) * sw + x) * 4 + 3] < threshold;
                const b = data[((y + 1) * sw + x) * 4 + 3] < threshold;
                const l = data[(y * sw + (x - 1)) * 4 + 3] < threshold;
                const r = data[(y * sw + (x + 1)) * 4 + 3] < threshold;
                if (t || b || l || r) edges[y * sw + x] = 1;
            }
        }

        this._smartCutEdgeMap = { edges, sw, sh, scale, objW: obj.width, objH: obj.height, objX: obj.x, objY: obj.y };
    },

    _snapToEdge(stageX, stageY) {
        const em = this._smartCutEdgeMap;
        if (!em) return { x: stageX, y: stageY };

        const obj = this._smartCutObj;
        if (!obj) return { x: stageX, y: stageY };

        // Convert stage → normalized (0-1) in object space
        const normX = (stageX - obj.x) / obj.width;
        const normY = (stageY - obj.y) / obj.height;

        // Convert to edge-map pixel coords
        const emX = Math.round(normX * em.sw);
        const emY = Math.round(normY * em.sh);

        // Search in radius for nearest edge pixel
        const searchRadius = Math.round(Math.max(em.sw, em.sh) * 0.04);
        let bestDist = Infinity;
        let bestX = emX, bestY = emY;

        for (let dy = -searchRadius; dy <= searchRadius; dy++) {
            for (let dx = -searchRadius; dx <= searchRadius; dx++) {
                const px = emX + dx;
                const py = emY + dy;
                if (px < 0 || px >= em.sw || py < 0 || py >= em.sh) continue;
                if (em.edges[py * em.sw + px]) {
                    const dist = dx * dx + dy * dy;
                    if (dist < bestDist) {
                        bestDist = dist;
                        bestX = px;
                        bestY = py;
                    }
                }
            }
        }

        // Convert back to stage coords
        const snappedStageX = obj.x + (bestX / em.sw) * obj.width;
        const snappedStageY = obj.y + (bestY / em.sh) * obj.height;
        return { x: snappedStageX, y: snappedStageY };
    },

    _scSetSelectedRegion(index, panel = null) {
        this._smartCutSelectedRegion = Number.isInteger(index) ? index : null;
        if (panel) {
            panel.querySelectorAll('.sc-region-item').forEach((item, itemIndex) => {
                item.classList.toggle('active', itemIndex === this._smartCutSelectedRegion);
            });
            this._updateSmartCutModeUI(panel);
            if (this._smartCutEditMode) {
                this._setSmartCutEditMode(panel, true);
            }
        }
        this.stage.requestRender();
    },

    _scFindNearestPoint(stageX, stageY) {
        if (!this._smartCutRegions?.length) return null;
        const allowedRegionIndexes = this._smartCutEditMode && Number.isInteger(this._smartCutSelectedRegion)
            ? [this._smartCutSelectedRegion]
            : this._smartCutRegions.map((_, regionIndex) => regionIndex);
        const zoom = this.stage.zoom || 1;
        const threshold = 8 / zoom;
        let best = null;
        let bestDist = threshold;

        allowedRegionIndexes.forEach((regionIndex) => {
            const region = this._smartCutRegions[regionIndex];
            if (region?.locked) return;
            (region.path || []).forEach((point, pointIndex) => {
                const dist = Math.hypot(point.x - stageX, point.y - stageY);
                if (dist < bestDist) {
                    bestDist = dist;
                    best = { regionIndex, pointIndex };
                }
            });
        });
        return best;
    },

    _scGetRegionsAtPoint(stageX, stageY, allowAnyRegion = false, includeLocked = false) {
        if (!this._smartCutRegions?.length) return [];
        const allowedRegionIndexes = (this._smartCutEditMode && !allowAnyRegion)
            ? (Number.isInteger(this._smartCutSelectedRegion) ? [this._smartCutSelectedRegion] : [])
            : this._smartCutRegions.map((_, regionIndex) => regionIndex);
        const hits = [];
        allowedRegionIndexes.forEach((index) => {
            const region = this._smartCutRegions[index];
            if (region?.locked && !includeLocked) return;
            const pts = region.path;
            if (!pts?.length || !this._bsPointInPolygon(stageX, stageY, pts)) return;
            let area = 0;
            for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
                area += (pts[j].x - pts[i].x) * (pts[j].y + pts[i].y);
            }
            hits.push({ index, area: Math.abs(area) / 2 });
        });
        return hits.sort((a, b) => a.area - b.area).map(hit => hit.index);
    },

    _scFindRegionAtPoint(stageX, stageY, allowAnyRegion = false, includeLocked = false) {
        return this._scGetRegionsAtPoint(stageX, stageY, allowAnyRegion, includeLocked)[0] ?? null;
    },

    _scFindNearestEdge(stageX, stageY) {
        if (!this._smartCutRegions?.length) return null;
        const allowedRegionIndexes = this._smartCutEditMode
            ? (Number.isInteger(this._smartCutSelectedRegion) ? [this._smartCutSelectedRegion] : [])
            : this._smartCutRegions.map((_, regionIndex) => regionIndex);
        const zoom = this.stage.zoom || 1;
        const threshold = 10 / zoom;
        let best = null;
        let bestDist = threshold;

        allowedRegionIndexes.forEach((regionIndex) => {
            const region = this._smartCutRegions[regionIndex];
            if (region?.locked) return;
            const pts = region.path || [];
            for (let i = 0; i < pts.length; i++) {
                const a = pts[i];
                const b = pts[(i + 1) % pts.length];
                const abx = b.x - a.x;
                const aby = b.y - a.y;
                const len2 = (abx * abx) + (aby * aby);
                if (!len2) continue;
                let t = ((stageX - a.x) * abx + (stageY - a.y) * aby) / len2;
                t = Math.max(0, Math.min(1, t));
                const px = a.x + t * abx;
                const py = a.y + t * aby;
                const dist = Math.hypot(px - stageX, py - stageY);
                if (dist < bestDist) {
                    bestDist = dist;
                    best = { regionIndex, segIndex: i, x: px, y: py };
                }
            }
        });
        return best;
    },

    _scHandleContextMenu(e) {
        if (!this._smartCutActive) return;
        if (e.target.closest('#smart-cut-panel')) return;
        if (e.target.closest('.bs-context-menu')) return;

        // During guided landmarks: right-click undoes last landmark
        const gl = this._smartCutGuidedLandmarks;
        if (gl?.active) {
            e.preventDefault();
            e.stopPropagation();
            if (gl.currentIndex > 0) {
                gl.currentIndex--;
                delete gl.points[gl.steps[gl.currentIndex].key];
                const panel = document.getElementById('smart-cut-panel');
                this._updateGuidedLandmarkUI(panel);
                this.stage.requestRender();
            }
            return;
        }

        // During tracing (not edit mode): right-click undoes last point
        if (!this._smartCutEditMode) {
            e.preventDefault();
            e.stopPropagation();
            if (this._smartCutCurrentPath.length > 0) {
                this._smartCutCurrentPath.pop();
                this._smartCutPathClosed = false;
                const panel = document.getElementById('smart-cut-panel');
                if (this._smartCutCurrentPath.length < 3) {
                    panel?.querySelector('#sc-trace-current')?.classList.add('hidden');
                }
                this._scUpdateTraceButtons(panel);
                this.stage.requestRender();
            }
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        const panel = document.getElementById('smart-cut-panel');

        const { x, y } = this.stage.screenToStage(e.clientX, e.clientY);
        const hitPoint = this._scFindNearestPoint(x, y);
        if (hitPoint) {
            const region = this._smartCutRegions[hitPoint.regionIndex];
            if (!region?.path || region.path.length <= 3) return;
            this._scSetSelectedRegion(hitPoint.regionIndex, panel);
            this._bsShowContextMenu(e.clientX, e.clientY, [
                {
                    label: 'Delete Point',
                    icon: 'fas fa-trash-alt',
                    action: () => {
                        region.path.splice(hitPoint.pointIndex, 1);
                        this._recordSmartCutFaceGuideEdit();
                        this.stage.requestRender();
                    }
                },
                {
                    label: region.locked ? 'Unlock Shape' : 'Lock Shape',
                    icon: region.locked ? 'fas fa-lock-open' : 'fas fa-lock',
                    action: () => {
                        this._scSetRegionLocked(hitPoint.regionIndex, !region.locked, panel);
                    }
                }
            ]);
            return;
        }

        const hitEdge = this._scFindNearestEdge(x, y);
        if (hitEdge) {
            const region = this._smartCutRegions[hitEdge.regionIndex];
            this._scSetSelectedRegion(hitEdge.regionIndex, panel);
            this._bsShowContextMenu(e.clientX, e.clientY, [
                {
                    label: 'Add Point',
                    icon: 'fas fa-plus-circle',
                    action: () => {
                        region.path.splice(hitEdge.segIndex + 1, 0, { x: hitEdge.x, y: hitEdge.y });
                        this._recordSmartCutFaceGuideEdit();
                        this.stage.requestRender();
                    }
                },
                {
                    label: region.locked ? 'Unlock Shape' : 'Lock Shape',
                    icon: region.locked ? 'fas fa-lock-open' : 'fas fa-lock',
                    action: () => {
                        this._scSetRegionLocked(hitEdge.regionIndex, !region.locked, panel);
                    }
                }
            ]);
            return;
        }

        const hitRegion = this._scFindRegionAtPoint(x, y, true, true);
        if (Number.isInteger(hitRegion)) {
            const region = this._smartCutRegions[hitRegion];
            this._scSetSelectedRegion(hitRegion, panel);
            this._bsShowContextMenu(e.clientX, e.clientY, [{
                label: region.locked ? 'Unlock Shape' : 'Lock Shape',
                icon: region.locked ? 'fas fa-lock-open' : 'fas fa-lock',
                action: () => {
                    this._scSetRegionLocked(hitRegion, !region.locked, panel);
                }
            }]);
        }
    },

    // ── Mouse Handlers ──

    _getSmartCutCloseHitRadius() {
        const zoom = Math.max(0.001, this.stage?.zoom || 1);
        return Math.max(5, 9 / zoom);
    },

    _isSmartCutClosePointHit(pos) {
        const pts = this._smartCutCurrentPath || [];
        if (!pos || pts.length < 3 || this._smartCutPathClosed) return false;
        const first = pts[0];
        return Math.hypot(pos.x - first.x, pos.y - first.y) <= this._getSmartCutCloseHitRadius();
    },

    _scHandleMouseDown(e, panel) {
        if (!this._smartCutActive) return;
        if (e.button !== 0) return;
        // Ignore clicks on the panel itself
        if (e.target.closest('#smart-cut-panel')) return;

        // Guided landmark collection intercepts all clicks
        if (this._smartCutGuidedLandmarks?.active) {
            e.stopPropagation();
            e.preventDefault();
            const pos = this.stage.screenToStage(e.clientX, e.clientY);
            this._handleGuidedLandmarkClick(pos.x, pos.y, panel);
            return;
        }

        const pos = this.stage.screenToStage(e.clientX, e.clientY);

        if (this._smartCutPreset?.rigType === 'face-rig'
            && this._smartCutFaceWorkflow === 'guides'
            && this._smartCutFaceGuides?.length) {
            const hitGuide = this._getSmartCutFaceGuideHit(pos.x, pos.y);
            if (hitGuide) {
                e.stopPropagation();
                e.preventDefault();
                this._smartCutFaceGuideDrag = {
                    ...hitGuide,
                    lastX: pos.x,
                    lastY: pos.y
                };
                this._smartCutFaceGuideHover = hitGuide;
                this.stage.viewport.style.cursor = hitGuide.handle === 'move' ? 'move' : 'nwse-resize';
                this._updateSmartCutFaceGuideList(panel);
                this.stage.requestRender();
                return;
            }
            e.stopPropagation();
            e.preventDefault();
            return;
        }

        if (!this._smartCutEditMode && this._smartCutCurrentPath.length === 0 && !this._smartCutTraceThroughRegions) {
            const hitRegions = this._scGetRegionsAtPoint(pos.x, pos.y, true, true);
            if (hitRegions.length) {
                e.stopPropagation();
                e.preventDefault();
                return;
            }
        }

        // Path already closed — ignore further clicks on stage
        if (this._smartCutPathClosed) return;

        if (this._smartCutEditMode && this._smartCutCurrentPath.length === 0) {
            const hitSelectableRegions = this._scGetRegionsAtPoint(pos.x, pos.y, true);
            const hitLockedRegions = this._scGetRegionsAtPoint(pos.x, pos.y, true, true)
                .filter(regionIndex => this._scIsRegionLocked(regionIndex));
            if (hitSelectableRegions.length && !hitSelectableRegions.includes(this._smartCutSelectedRegion)) {
                e.stopPropagation();
                e.preventDefault();
                this.stage.viewport.style.cursor = 'move';
                return;
            }
            if (hitLockedRegions.length) {
                e.stopPropagation();
                e.preventDefault();
                this.stage.viewport.style.cursor = 'not-allowed';
                return;
            }
            if (!Number.isInteger(this._smartCutSelectedRegion)) {
                e.stopPropagation();
                e.preventDefault();
                Utils.showToast('Select a part from the list before editing', 'info');
                return;
            }
            const hitPoint = this._scFindNearestPoint(pos.x, pos.y);
            if (hitPoint) {
                e.stopPropagation();
                e.preventDefault();
                this._smartCutDragging = hitPoint;
                this._scSetSelectedRegion(hitPoint.regionIndex, panel);
                this.stage.viewport.style.cursor = 'grabbing';
                return;
            }

            const hitRegion = this._scFindRegionAtPoint(pos.x, pos.y);
            if (Number.isInteger(hitRegion)) {
                e.stopPropagation();
                e.preventDefault();
                this._smartCutRegionDrag = { regionIndex: hitRegion, lastX: pos.x, lastY: pos.y };
                this._scSetSelectedRegion(hitRegion, panel);
                this.stage.viewport.style.cursor = 'move';
                return;
            }

            if (!this._smartCutManualTraceEnabled) {
                e.stopPropagation();
                e.preventDefault();
                return;
            }
        }

        if (!this._smartCutManualTraceEnabled) {
            e.stopPropagation();
            e.preventDefault();
            return;
        }

        e.stopPropagation();
        e.preventDefault();

        // Detect double-click manually (native dblclick is suppressed by preventDefault on mousedown)
        const now = Date.now();
        if (this._scLastClickTime && (now - this._scLastClickTime) < 500 && this._smartCutCurrentPath.length >= 3) {
            this._scLastClickTime = 0;
            this._closePath(panel);
            return;
        }
        this._scLastClickTime = now;

        // Close only when the user intentionally clicks the start/end target.
        if (this._isSmartCutClosePointHit(pos)) {
            this._closePath(panel);
            return;
        }

        const snapped = this._snapToEdge(pos.x, pos.y);

        // Debounce: ignore if too close to the last placed point (prevents dblclick duplicate)
        if (this._smartCutCurrentPath.length > 0) {
            const last = this._smartCutCurrentPath[this._smartCutCurrentPath.length - 1];
            if (Math.hypot(snapped.x - last.x, snapped.y - last.y) < 0.5) return;
        }

        this._smartCutCurrentPath.push(snapped);
        this._scUpdateTraceButtons(panel);
        this.stage.requestRender();
    },

    _scHandleMouseMove(e) {
        if (!this._smartCutActive) return;
        const pos = this.stage.screenToStage(e.clientX, e.clientY);

        if (this._smartCutFaceGuideDrag) {
            e.preventDefault();
            e.stopPropagation();
            this._moveSmartCutFaceGuide(this._smartCutFaceGuideDrag, pos);
            this.stage.viewport.style.cursor = this._smartCutFaceGuideDrag.handle === 'move' ? 'move' : 'nwse-resize';
            this.stage.requestRender();
            return;
        }

        if (this._smartCutPreset?.rigType === 'face-rig'
            && this._smartCutFaceWorkflow === 'guides'
            && this._smartCutFaceGuides?.length) {
            const hitGuide = this._getSmartCutFaceGuideHit(pos.x, pos.y);
            const previous = this._smartCutFaceGuideHover;
            this._smartCutFaceGuideHover = hitGuide;
            this.stage.viewport.style.cursor = hitGuide ? (hitGuide.handle === 'move' ? 'move' : 'nwse-resize') : 'default';
            if (previous?.index !== hitGuide?.index || previous?.handle !== hitGuide?.handle) {
                const panel = document.getElementById('smart-cut-panel');
                this._updateSmartCutFaceGuideList(panel);
                this.stage.requestRender();
            }
            return;
        }

        if (this._smartCutDragging) {
            e.preventDefault();
            e.stopPropagation();
            const region = this._smartCutRegions[this._smartCutDragging.regionIndex];
            if (region?.path?.[this._smartCutDragging.pointIndex]) {
                region.path[this._smartCutDragging.pointIndex] = { x: pos.x, y: pos.y };
                this.stage.requestRender();
            }
            return;
        }

        if (this._smartCutRegionDrag) {
            e.preventDefault();
            e.stopPropagation();
            const region = this._smartCutRegions[this._smartCutRegionDrag.regionIndex];
            if (region?.path?.length) {
                const dx = pos.x - this._smartCutRegionDrag.lastX;
                const dy = pos.y - this._smartCutRegionDrag.lastY;
                this._smartCutRegionDrag.lastX = pos.x;
                this._smartCutRegionDrag.lastY = pos.y;
                region.path = region.path.map(point => ({ x: point.x + dx, y: point.y + dy }));
                this.stage.requestRender();
            }
            return;
        }

        const prevHoverPoint = this._smartCutHoverPoint;
        const prevHoverEdge = this._smartCutHoverEdge;
        const prevHoverRegion = this._smartCutHoverRegion;
        if (this._smartCutEditMode && this._smartCutCurrentPath.length === 0) {
            this._smartCutHoverPoint = this._scFindNearestPoint(pos.x, pos.y);
            this._smartCutHoverEdge = this._smartCutHoverPoint ? null : this._scFindNearestEdge(pos.x, pos.y);
            this._smartCutHoverRegion = (this._smartCutHoverPoint || this._smartCutHoverEdge)
                ? null
                : this._scFindRegionAtPoint(pos.x, pos.y, true);
            const hitLockedRegion = this._scFindRegionAtPoint(pos.x, pos.y, true, true);
            if (this._smartCutHoverPoint) {
                this.stage.viewport.style.cursor = 'grab';
                this._smartCutHover = null;
            } else if (this._smartCutHoverEdge) {
                this.stage.viewport.style.cursor = 'copy';
                this._smartCutHover = null;
            } else if (Number.isInteger(this._smartCutHoverRegion)) {
                this.stage.viewport.style.cursor = 'move';
                this._smartCutHover = null;
            } else if (Number.isInteger(hitLockedRegion) && this._scIsRegionLocked(hitLockedRegion)) {
                this.stage.viewport.style.cursor = 'not-allowed';
                this._smartCutHover = null;
            } else {
                this.stage.viewport.style.cursor = 'crosshair';
                this._smartCutHover = this._snapToEdge(pos.x, pos.y);
                this._smartCutHoverRaw = { x: pos.x, y: pos.y };
            }
        } else if (!this._smartCutManualTraceEnabled) {
            this._smartCutHoverPoint = null;
            this._smartCutHoverEdge = null;
            this._smartCutHoverRegion = null;
            this._smartCutHover = null;
            this._smartCutHoverRaw = null;
            this.stage.viewport.style.cursor = 'default';
        } else {
            this._smartCutHoverPoint = null;
            this._smartCutHoverEdge = null;
            this._smartCutHoverRegion = null;
            this._smartCutHover = this._snapToEdge(pos.x, pos.y);
            this._smartCutHoverRaw = { x: pos.x, y: pos.y };
        }

        if ((prevHoverPoint?.regionIndex !== this._smartCutHoverPoint?.regionIndex)
            || (prevHoverPoint?.pointIndex !== this._smartCutHoverPoint?.pointIndex)
            || (prevHoverEdge?.regionIndex !== this._smartCutHoverEdge?.regionIndex)
            || (prevHoverEdge?.segIndex !== this._smartCutHoverEdge?.segIndex)
            || (prevHoverRegion !== this._smartCutHoverRegion)
            || !this._smartCutEditMode
            || (!this._smartCutHoverPoint && !this._smartCutHoverEdge && !Number.isInteger(this._smartCutHoverRegion))) {
            this.stage.requestRender();
        }
    },

    _scHandleDblClick(e, panel) {
        if (!this._smartCutActive) return;
        if (e.target.closest('#smart-cut-panel')) return;
        e.stopPropagation();
        e.preventDefault();
        const pos = this.stage.screenToStage(e.clientX, e.clientY);
        const hitRegions = this._scGetRegionsAtPoint(pos.x, pos.y, true);
        if (hitRegions.length && this._smartCutCurrentPath.length === 0) {
            let nextRegion = hitRegions[0];
            const currentIndex = hitRegions.indexOf(this._smartCutSelectedRegion);
            if (currentIndex >= 0) {
                nextRegion = hitRegions[(currentIndex + 1) % hitRegions.length];
            }
            this._scSetSelectedRegion(nextRegion, panel);
            this._setSmartCutEditMode(panel, true);
            this.stage.viewport.style.cursor = 'move';
            return;
        }
        if (this._smartCutCurrentPath.length >= 3) {
            this._closePath(panel);
        }
    },

    _scHandleMouseUp(e) {
        if (this._smartCutFaceGuideDrag) {
            e.preventDefault();
            e.stopPropagation();
            if (this._smartCutFaceGuideDrag.moved) this._recordSmartCutFaceGuideEdit();
            this._smartCutFaceGuideDrag = null;
            this.stage.viewport.style.cursor = this._smartCutFaceGuideHover ? 'move' : 'default';
            this.stage.requestRender();
            return;
        }

        if (this._smartCutDragging || this._smartCutRegionDrag) {
            e.preventDefault();
            e.stopPropagation();
            this._recordSmartCutFaceGuideEdit();
            this._smartCutDragging = null;
            this._smartCutRegionDrag = null;
            if (this._smartCutEditMode) {
                if (this._smartCutHoverPoint) this.stage.viewport.style.cursor = 'grab';
                else if (this._smartCutHoverEdge) this.stage.viewport.style.cursor = 'copy';
                else if (Number.isInteger(this._smartCutHoverRegion)) this.stage.viewport.style.cursor = 'move';
                else this.stage.viewport.style.cursor = 'crosshair';
            } else {
                this.stage.viewport.style.cursor = '';
            }
            this.stage.requestRender();
        }
    },

    _closePath(panel) {
        // Path closed — show label picker and lock path
        this._smartCutPathClosed = true;
        const traceUI = panel.querySelector('#sc-trace-current');
        if (traceUI) traceUI.classList.remove('hidden');
        this._updatePartSelect(panel);
        this._scUpdateTraceButtons(panel);
        this.stage.requestRender();
    },

    _scUpdateTraceButtons(panel) {
        if (!panel) return;
        const closeBtn = panel.querySelector('#sc-close-path');
        if (closeBtn) {
            closeBtn.style.display = this._smartCutManualTraceEnabled && this._smartCutCurrentPath.length >= 3 ? '' : 'none';
        }
        const undoBtn = panel.querySelector('#sc-undo-point');
        if (undoBtn) undoBtn.disabled = !this._smartCutManualTraceEnabled || this._smartCutCurrentPath.length === 0;
    },

    _updatePartSelect(panel) {
        const select = panel.querySelector('#sc-part-select');
        if (!select || !this._smartCutPreset) return;

        const assigned = new Set(this._smartCutRegions.map(r => r.label));
        const previous = select.value;
        const ranked = this._smartCutCurrentPath.length >= 3
            ? this._rankSmartCutPartsForPath(this._smartCutCurrentPath, this._smartCutPreset, this._smartCutRegions)
            : [];
        const orderedParts = ranked.length
            ? ranked.map(entry => entry.part)
            : this._topologicalSort(this._smartCutPreset.parts).filter(part => !assigned.has(part.partKey));

        select.innerHTML = orderedParts
            .filter(part => !assigned.has(part.partKey))
            .map((part, index) => {
                const prefix = ranked.length && index === 0 ? '[Suggested] ' : '';
                return `<option value="${part.partKey}">${prefix}${part.name} — ${part.description}</option>`;
            })
            .join('');
        if ([...select.options].some(option => option.value === previous)) select.value = previous;
        else if (select.options.length) select.value = select.options[0].value;
        this._updateSmartCutGuide(panel);
    },

    _confirmCurrentRegion(panel) {
        const select = panel.querySelector('#sc-part-select');
        const partKey = select?.value;
        if (!partKey || this._smartCutCurrentPath.length < 3) {
            Utils.showToast('Draw a closed region first', 'warning');
            return;
        }

        const part = this._smartCutPreset.parts.find(p => p.partKey === partKey);
        this._smartCutRegions.push({
            path: this._simplifySmartCutPolygon(this._smartCutCurrentPath),
            label: partKey,
            name: part?.name || partKey,
            locked: false
        });
        this._smartCutSelectedRegion = this._smartCutRegions.length - 1;

        this._smartCutCurrentPath = [];
        this._smartCutPathClosed = false;
        panel.querySelector('#sc-trace-current')?.classList.add('hidden');
        this._scUpdateTraceButtons(panel);
        this._updatePartSelect(panel);
        this._updateRegionsList(panel);
        this._updateSmartCutModeUI(panel);
        this.stage.requestRender();
        Utils.showToast(`Added region: ${part?.name}`, 'success');
    },

    _updateRegionsList(panel) {
        const list = panel.querySelector('#sc-regions-list');
        const counter = panel.querySelector('#sc-region-counter');
        if (!list) return;

        const total = this._smartCutPreset?.parts.length || 0;
        const done = this._smartCutRegions.length;
        if (counter) {
            counter.textContent = `(${done}/${total})`;
            counter.style.color = done === total ? '#10b981' : '';
        }
        this._updateSmartCutModeUI(panel);

        if (done === 0) {
            const expected = (this._smartCutPreset?.parts || []).slice(0, 8).map(part => part.name || part.partKey).join(', ');
            list.innerHTML = `<div class="sc-empty">No regions traced yet. Click on the image to start tracing.${expected ? `<br><span>Expected: ${this._escapeCutReviewText(expected)}${(this._smartCutPreset?.parts || []).length > 8 ? '...' : ''}</span>` : ''}</div>`;
            this._updateSmartCutGuide(panel);
            return;
        }

        const assigned = new Set(this._smartCutRegions.map(region => region.label));
        const missingNames = (this._smartCutPreset?.parts || [])
            .filter(part => !assigned.has(part.partKey))
            .slice(0, 5)
            .map(part => part.name || part.partKey);
        const counts = {};
        this._smartCutRegions.forEach(region => { counts[region.label] = (counts[region.label] || 0) + 1; });
        const duplicates = Object.entries(counts).filter(([, count]) => count > 1).map(([label]) => label);

        list.innerHTML = this._smartCutRegions.map((r, i) => `
            <div class="sc-region-item ${this._smartCutSelectedRegion === i ? 'active' : ''}" data-idx="${i}" style="opacity:${r.locked ? '0.72' : '1'}">
                <span class="sc-region-name"><i class="fas ${r.locked ? 'fa-lock' : 'fa-vector-square'}" style="color:${r.locked ? '#f59e0b' : '#10b981'}"></i> ${r.name}${r.locked ? ' (locked)' : ''}</span>
                <span class="sc-region-pts">${r.path.length} pts</span>
                <button class="sc-region-del" data-idx="${i}" title="Remove"><i class="fas fa-times"></i></button>
            </div>
        `).join('') + (missingNames.length || duplicates.length ? `
            <div class="sc-region-checklist">
                ${missingNames.length ? `<span><i class="fas fa-list-check"></i> Still needed: ${missingNames.map(name => this._escapeCutReviewText(name)).join(', ')}${(this._smartCutPreset?.parts || []).length - done > 5 ? '...' : ''}</span>` : ''}
                ${duplicates.length ? `<span class="warn"><i class="fas fa-triangle-exclamation"></i> Duplicate labels: ${duplicates.map(label => this._escapeCutReviewText(label)).join(', ')}</span>` : ''}
            </div>
        ` : '');

        list.querySelectorAll('.sc-region-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.sc-region-del')) return;
                const idx = parseInt(item.dataset.idx, 10);
                this._scSetSelectedRegion(Number.isNaN(idx) ? null : idx, panel);
            });
        });

        list.querySelectorAll('.sc-region-del').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.idx);
                this._smartCutRegions.splice(idx, 1);
                if (this._smartCutSelectedRegion === idx) this._smartCutSelectedRegion = null;
                if (this._smartCutSelectedRegion > idx) this._smartCutSelectedRegion--;
                this._updatePartSelect(panel);
                this._updateRegionsList(panel);
                this.stage.requestRender();
            });
        });

        this._updateSmartCutGuide(panel);
    },

    // ── Cut & Assemble ──

    _smartCutAndAssemble(panel) {
        if (this._smartCutRegions.length < 2) {
            Utils.showToast(this._smartCutPreset?.rigType === 'face-rig'
                ? 'Trace at least 2 face parts before cutting'
                : 'Trace at least 2 body parts before cutting', 'warning');
            return;
        }

        const obj = this._smartCutObj;
        const preset = this._smartCutPreset;
        const cutMode = this._getSmartCutCutMode(panel);
        if (!obj || !preset) return;

        this._smartCutLastTrainingCandidate = {
            preset,
            outline: this._smartCutAutoOutline?.map(point => ({ x: point.x, y: point.y })) || null,
            regions: this._smartCutRegions.map(region => ({
                label: region.label,
                name: region.name,
                path: region.path.map(point => ({ x: point.x, y: point.y }))
            }))
        };

        // Rasterize the source object
        const padding = preset.rigType === 'face-rig'
            ? Math.max(2, Number(preset.faceCut?.padding) || 6)
            : 2;
        const scaleF = 2;
        const w = Math.ceil(obj.width + padding * 2);
        const h = Math.ceil(obj.height + padding * 2);
        const cw = w * scaleF;
        const ch = h * scaleF;

        const srcCanvas = document.createElement('canvas');
        srcCanvas.width = cw;
        srcCanvas.height = ch;
        const srcCtx = srcCanvas.getContext('2d', { willReadFrequently: true });
        srcCtx.scale(scaleF, scaleF);
        srcCtx.translate(-obj.x + padding, -obj.y + padding);
        const renderImageElement = cutMode === 'original'
            ? (this._smartCutOriginalImageElement || obj.imageElement)
            : (this._smartCutPreparedCanvas || obj.imageElement);
        const renderImageSrc = cutMode === 'original'
            ? (this._smartCutOriginalSrc || obj.imageSrc)
            : (this._smartCutPreparedSrc || obj.imageSrc);
        const previousImageElement = obj.imageElement;
        const previousImageSrc = obj.imageSrc;
        const needsImageSwap = obj.type === 'image'
            && !!renderImageElement
            && (renderImageElement !== previousImageElement || renderImageSrc !== previousImageSrc);
        if (needsImageSwap) {
            obj.imageElement = renderImageElement;
            if (renderImageSrc) obj.imageSrc = renderImageSrc;
        }
        try {
            srcCtx.save();
            obj.render(srcCtx);
            srcCtx.restore();
        } finally {
            if (needsImageSwap) {
                obj.imageElement = previousImageElement;
                obj.imageSrc = previousImageSrc;
            }
        }
        let smartCutSourceCanvas = srcCanvas;
        if (cutMode === 'silhouette' && this._smartCutAutoOutline?.length >= 3) {
            const localOutline = this._smartCutAutoOutline.map(point => ({
                x: (point.x - obj.x + padding) * scaleF,
                y: (point.y - obj.y + padding) * scaleF
            }));
            smartCutSourceCanvas = this._scExtractWithMask(srcCanvas, localOutline, cw, ch);
        }

        // Cut each region
        const createdParts = {}; // partKey → StageObject
        const coverPatches = {}; // partKey → non-animated cover StageObject
        const partOrder = []; // track creation order

        this._smartCutRegions.forEach(region => {
            // Convert stage path to local canvas coords
            let localPath = region.path.map(p => ({
                x: (p.x - obj.x + padding) * scaleF,
                y: (p.y - obj.y + padding) * scaleF
            }));
            const faceQuality = preset.rigType === 'face-rig'
                ? this._getSmartCutFaceQualitySettings(region, preset, scaleF)
                : null;
            if (faceQuality?.overlap > 0) {
                localPath = this._expandSmartCutPath(localPath, faceQuality.overlap);
            }

            let patchObj = null;
            if (preset.rigType === 'face-rig') {
                const patchPath = this._expandSmartCutPath(localPath, Math.max(2, (faceQuality?.overlap || 0) * 0.55));
                const coverRole = this._getSmartCutFaceRole(region.label, preset);
                const patchCanvas = this._createSmartCutFacePatchCanvas(smartCutSourceCanvas, patchPath, cw, ch, {
                    feather: Math.max(2, (faceQuality?.feather || 0) * 0.9),
                    role: coverRole,
                    preferSkin: coverRole.includes('eyebrow') || coverRole.includes('lip')
                });
                if (this._scHasPixels(patchCanvas)) {
                    const patchTrimmed = this._scTrimCanvas(patchCanvas);
                    const patchX = obj.x - padding + patchTrimmed.offX / scaleF;
                    const patchY = obj.y - padding + patchTrimmed.offY / scaleF;
                    patchObj = new StageObject('image', {
                        x: patchX,
                        y: patchY,
                        width: patchTrimmed.width / scaleF,
                        height: patchTrimmed.height / scaleF,
                        imageSrc: patchTrimmed.canvas.toDataURL('image/png'),
                        name: `${region.name} Base Cover`,
                        layer: obj.layer,
                        opacity: Math.min(1, Math.max(0.72, Number(obj.opacity) || 1))
                    });
                    patchObj._smartCutCoverOriginalCanvas = patchTrimmed.canvas;
                    this._tagSmartCutFacePatch(patchObj, region, preset, null);
                    this.objects.addObject(patchObj);
                    coverPatches[region.label] = patchObj;
                }
            }

            // Clip to closed path (interior). For closed-mouth photos, synthesize
            // a clean mouth gap because there may be no dark opening to cut.
            const isClosedMouthGap = preset.rigType === 'face-rig'
                && region.label === 'mouthOpening'
                && !!(region.closedMouthGap || this._smartCutFaceClosedMouth);
            const isFaceMouthOpening = preset.rigType === 'face-rig'
                && region.label === 'mouthOpening';
            const clipped = isClosedMouthGap
                ? this._createSmartCutClosedMouthGapCanvas(localPath, cw, ch)
                : (isFaceMouthOpening
                    ? this._createSmartCutClosedMouthGapCanvas(localPath, cw, ch, {
                        topColor: 'rgba(42, 10, 18, 0.94)',
                        midColor: 'rgba(3, 2, 6, 0.99)',
                        bottomColor: 'rgba(70, 18, 28, 0.92)'
                    })
                : this._scExtractWithMask(smartCutSourceCanvas, localPath, cw, ch, {
                    feather: faceQuality?.feather || 0
                }));
            if (!this._scHasPixels(clipped)) {
                if (patchObj) {
                    const list = this.objects?.objects;
                    const index = Array.isArray(list) ? list.indexOf(patchObj) : -1;
                    if (index >= 0) list.splice(index, 1);
                    delete coverPatches[region.label];
                }
                return;
            }

            // Trim transparent borders
            const trimmed = this._scTrimCanvas(clipped);
            const dataUrl = trimmed.canvas.toDataURL('image/png');

            // Convert back to stage coords
            const stageX = obj.x - padding + trimmed.offX / scaleF;
            const stageY = obj.y - padding + trimmed.offY / scaleF;
            const stageW = trimmed.width / scaleF;
            const stageH = trimmed.height / scaleF;

            const newObj = new StageObject('image', {
                x: stageX, y: stageY,
                width: stageW, height: stageH,
                imageSrc: dataUrl,
                name: region.name,
                layer: obj.layer,
                opacity: obj.opacity
            });
            newObj._tempTrimmedCanvas = trimmed.canvas;
            if (preset.rigType === 'face-rig') {
                this._tagSmartCutFacePart(newObj, region, preset, cutMode);
                if (isClosedMouthGap) {
                    newObj.name = 'Closed Mouth Gap';
                    newObj.faceSet = {
                        ...(newObj.faceSet || {}),
                        generatedGap: true,
                        gapFillMode: 'generated-closed-mouth'
                    };
                    newObj._smartCutGeneratedMouthGap = true;
                    newObj.opacity = Math.min(0.95, Math.max(0.72, Number(obj.opacity) || 1));
                } else if (isFaceMouthOpening) {
                    newObj.name = region.name || 'Mouth Opening';
                    newObj.faceSet = {
                        ...(newObj.faceSet || {}),
                        generatedGap: true,
                        gapFillMode: 'dark-mouth-opening'
                    };
                    newObj._smartCutGeneratedMouthGap = true;
                    newObj.opacity = Math.min(1, Math.max(0.88, Number(obj.opacity) || 1));
                }
                if (patchObj) {
                    patchObj._smartCutFaceSourcePartId = newObj.id;
                }
            }
            this.objects.addObject(newObj);
            createdParts[region.label] = newObj;
            partOrder.push(region.label);
        });

        if (Object.keys(createdParts).length < 2) {
            this._rollbackCutArtifacts?.(createdParts, coverPatches);
            Utils.showToast('Could not extract enough parts', 'warning');
            return;
        }

        if (preset.rigType === 'face-rig') {
            const faceSetInfo = this._finalizeSmartCutFaceSet(createdParts, preset, obj, cutMode, coverPatches);
            const faceReadiness = this._analyzeSmartCutFaceReadiness(createdParts, obj);
            this._exitSmartCut();
            this._handoffSmartCutFaceSetToUniversalFace(faceSetInfo, createdParts);
            this.objects.updateObjectList();
            eventBus.emit('history:push');

            panel.querySelector('#sc-step-trace')?.classList.add('hidden');
            const doneStep = panel.querySelector('#sc-step-done');
            doneStep?.classList.remove('hidden');
            this._updateStepIndicator(panel, 3);
            const doneMsg = panel.querySelector('#sc-done-msg');
            if (doneMsg) {
                doneMsg.textContent = `Cut ${Object.keys(createdParts).length} Universal Face parts from "${preset.name}" with ${faceSetInfo?.patchCount || 0} soft cover layer${(faceSetInfo?.patchCount || 0) === 1 ? '' : 's'}. The new face set is selected and Universal Face controls are ready for Face Animation or Text Lip Sync.`;
            }
            this._renderSmartCutFaceReadiness(panel, faceReadiness);
            this._renderCutReview?.(panel, '#sc-cut-review', this._buildCutReview?.(createdParts, preset, {
                title: 'Universal Face Cut Review',
                sourceObj: obj,
                regions: this._smartCutRegions,
                optionalKeys: ['mouthOpening']
            }), createdParts);
            this._bindSmartCutFaceTestActions(panel, faceSetInfo, createdParts);
            this._bindSmartCutFaceRepairActions(panel, faceSetInfo, createdParts, faceReadiness);
            this._bindSmartCutFaceOpenAction(panel, faceSetInfo, createdParts);
            const saveTrainingBtn = panel.querySelector('#sc-btn-save-training');
            if (saveTrainingBtn) saveTrainingBtn.classList.add('hidden');
            panel.querySelector('#sc-btn-movements')?.classList.add('hidden');
            panel.querySelector('#sc-btn-poses')?.classList.add('hidden');

            this._setCuttingCompletionHandler?.(panel);
            Utils.showToast(`Universal Face parts created — ${faceSetInfo?.count || Object.keys(createdParts).length} part${Object.keys(createdParts).length === 1 ? '' : 's'} with ${faceSetInfo?.patchCount || 0} soft cover layer${(faceSetInfo?.patchCount || 0) === 1 ? '' : 's'}`, 'success');
            return;
        }

        // Now auto-assemble: pin parts together using preset joint definitions
        const jointSystem = panel.querySelector('#sc-joint-system')?.value || 'smart-cut';
        const assemblyMode = this._getSmartCutAssemblyMode(panel);

        if (jointSystem === 'armature') {
            // ── Pose Armature path: merge 16 fine-grained parts into 6 armature roles ──
            this._smartCutAssembleAsPoseArmature(createdParts, preset, panel, obj, cutMode);
            return;
        }

        const assembledCount = this._autoAssembleParts(createdParts, preset, assemblyMode);

        // Hide original object
        this._smartCutRestoreOriginalImage(false);
        obj.opacity = 0;
        obj.visible = false;

        this._exitSmartCut();
        this.objects.updateObjectList();
        eventBus.emit('history:push');

        // Show done step
        panel.querySelector('#sc-step-trace')?.classList.add('hidden');
        const doneStep = panel.querySelector('#sc-step-done');
        doneStep?.classList.remove('hidden');
        this._updateStepIndicator(panel, 3);
        const doneMsg = panel.querySelector('#sc-done-msg');
        if (doneMsg) doneMsg.textContent = `Cut ${Object.keys(createdParts).length} parts and assembled ${assembledCount} joints from "${preset.name}" using ${cutMode === 'silhouette' ? 'silhouette-exact' : 'original-detail'} extraction (${assemblyMode === 'keep' ? 'kept positions' : 'repositioned'}).`;
        this._renderCutReview?.(panel, '#sc-cut-review', this._buildCutReview?.(createdParts, preset, {
            title: 'SmartCut Review',
            sourceObj: obj,
            regions: this._smartCutRegions
        }), createdParts);
        const saveTrainingBtn = panel.querySelector('#sc-btn-save-training');
        if (saveTrainingBtn) {
            saveTrainingBtn.disabled = !this._smartCutLastTrainingCandidate?.outline?.length;
            saveTrainingBtn.addEventListener('click', () => {
                this._saveSmartCutTrainingFromLastCandidate(panel, saveTrainingBtn);
            });
        }

        panel.querySelector('#sc-btn-movements')?.addEventListener('click', () => {
            document.removeEventListener('keydown', doneKeyHandler);
            panel.remove();
            this.showMovementPicker();
        });
        panel.querySelector('#sc-btn-poses')?.addEventListener('click', () => {
            document.removeEventListener('keydown', doneKeyHandler);
            panel.remove();
            this.showPoseLibrary();
        });

        // Re-add Escape listener for done step
        const doneKeyHandler = this._setCuttingCompletionHandler(panel);

        // Auto-enable skeleton overlay
        if (!this._skeletonVisible) this.toggleSkeleton();

        Utils.showToast(`Smart Cut complete — ${Object.keys(createdParts).length} parts, ${assembledCount} joints (${cutMode === 'silhouette' ? 'silhouette exact' : 'original detail'})`, 'success');
    },

    // ═══════════════════════════════════════════════════════════════════════
    //  Pose Armature assembly path for Smart Cut
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Merge 16 fine-grained Smart Cut parts into 6 armature roles,
     * apply joint chains, armature pins, then open the Armature Panel.
     *
     * Role mapping (human-front, 16→6):
     *   torso                              → torso
     *   head + neck                        → head-neck
     *   r-upper-arm + r-forearm + r-hand   → right-arm
     *   l-upper-arm + l-forearm + l-hand   → left-arm
     *   r-upper-leg + r-lower-leg + r-foot → right-leg
     *   l-upper-leg + l-lower-leg + l-foot → left-leg
     *
     * Role mapping (human-side, 8→6):
     *   torso                              → torso
     *   head                               → head-neck
     *   upper-arm + forearm + hand         → front-arm
     *   upper-leg + lower-leg + foot       → front-leg
     */
    _smartCutAssembleAsPoseArmature(createdParts, preset, panel, sourceObj, cutMode) {
        const isSide = preset.key === 'human-side';

        // ── Define which fine-grained part keys merge into each armature role ──
        const roleGroups = isSide ? {
            'torso':     ['torso'],
            'head-neck': ['head'],
            'front-arm': ['upper-arm', 'forearm', 'hand'],
            'front-leg': ['upper-leg', 'lower-leg', 'foot']
        } : {
            'torso':     ['torso'],
            'head-neck': ['head', 'neck'],
            'right-arm': ['r-upper-arm', 'r-forearm', 'r-hand'],
            'left-arm':  ['l-upper-arm', 'l-forearm', 'l-hand'],
            'right-leg': ['r-upper-leg', 'r-lower-leg', 'r-foot'],
            'left-leg':  ['l-upper-leg', 'l-lower-leg', 'l-foot']
        };

        const nameMap = isSide ? {
            'torso': 'Torso', 'head-neck': 'Head Neck',
            'front-arm': 'Front Arm', 'front-leg': 'Front Leg'
        } : {
            'torso': 'Torso', 'head-neck': 'Head Neck',
            'right-arm': 'Right Arm', 'left-arm': 'Left Arm',
            'right-leg': 'Right Leg', 'left-leg': 'Left Leg'
        };

        // ── Merge sub-parts into composite images per armature role ──
        const mergedParts = {};
        for (const [roleKey, partKeys] of Object.entries(roleGroups)) {
            const subParts = partKeys.map(k => createdParts[k]).filter(Boolean);
            if (!subParts.length) continue;

            if (subParts.length === 1) {
                // Single part — reuse directly
                mergedParts[roleKey] = subParts[0];
            } else {
                // Multiple parts — composite onto a merged canvas
                const merged = this._mergePartsIntoComposite(subParts, roleKey);
                if (merged) {
                    mergedParts[roleKey] = merged;
                    // Remove the individual sub-parts from stage
                    for (const sp of subParts) {
                        this.objects.removeObject(sp.id);
                    }
                }
            }
        }

        const torso = mergedParts['torso'];
        if (!torso) {
            Utils.showToast('Torso part not found — cannot assemble as Pose Armature', 'warning');
            return;
        }

        // ── Name + tag parts with armature roles ──
        Object.entries(mergedParts).forEach(([roleKey, obj]) => {
            if (nameMap[roleKey]) obj.name = nameMap[roleKey];
            obj._armatureRoleKey = roleKey;
            obj._armaturePartKey = roleKey;
        });

        // ── Apply armature joint chains with image-aware cross-offsets ──
        Object.entries(mergedParts).forEach(([roleKey, obj]) => {
            const canvas = this._getObjectCanvas(obj);
            const customSpecs = canvas
                ? this._bslComputeImageJointCrossOffsets(canvas, roleKey)
                : null;
            const opts = { allowTorso: true };
            if (customSpecs?.length) opts.customSpecs = customSpecs;
            this._applyArmatureJointChainToObject(obj, roleKey, opts);
        });

        // ── Set pivots ──
        if (torso) { torso.pivotX = 0.5; torso.pivotY = 0.3; }
        const headNeck = mergedParts['head-neck'];
        if (headNeck) { headNeck.pivotX = 0.5; headNeck.pivotY = 1.0; }

        if (isSide) {
            const fArm = mergedParts['front-arm'];
            const fLeg = mergedParts['front-leg'];
            if (fArm) { fArm.pivotX = 0.5; fArm.pivotY = 0.08; }
            if (fLeg) { fLeg.pivotX = 0.5; fLeg.pivotY = 0.0; }
        } else {
            const rArm = mergedParts['right-arm'];
            const lArm = mergedParts['left-arm'];
            const rLeg = mergedParts['right-leg'];
            const lLeg = mergedParts['left-leg'];
            if (rArm) { rArm.pivotX = 0.68; rArm.pivotY = 0.10; }
            if (lArm) { lArm.pivotX = 0.32; lArm.pivotY = 0.10; }
            if (rLeg) { rLeg.pivotX = 0.5; rLeg.pivotY = 0.0; }
            if (lLeg) { lLeg.pivotX = 0.5; lLeg.pivotY = 0.0; }
        }

        // ── Pin children to torso ──
        if (isSide) {
            if (headNeck) this._configureDummyArmaturePin(headNeck, torso, 0.40, 0.00, 'inherit');
            const fArm = mergedParts['front-arm'];
            const fLeg = mergedParts['front-leg'];
            if (fArm) this._configureDummyArmaturePin(fArm, torso, 0.50, 0.08, 'inherit');
            if (fLeg) this._configureDummyArmaturePin(fLeg, torso, 0.50, 1.00, 'inherit');
        } else {
            if (headNeck) this._configureDummyArmaturePin(headNeck, torso, 0.50, 0.06, 'inherit');
            const rArm = mergedParts['right-arm'];
            const lArm = mergedParts['left-arm'];
            const rLeg = mergedParts['right-leg'];
            const lLeg = mergedParts['left-leg'];
            if (rArm) this._configureDummyArmaturePin(rArm, torso, 0.08, 0.22, 'inherit');
            if (lArm) this._configureDummyArmaturePin(lArm, torso, 0.92, 0.22, 'inherit');
            if (rLeg) this._configureDummyArmaturePin(rLeg, torso, 0.36, 0.84, 'inherit');
            if (lLeg) this._configureDummyArmaturePin(lLeg, torso, 0.64, 0.84, 'inherit');
        }

        torso._armatureFrontBackFacing = 'front';

        // ── Resolve pins ──
        if (this.objects._resolvePins) this.objects._resolvePins();

        // ── Select all parts ──
        const allIds = Object.values(mergedParts).map(o => o.id);
        this.objects.select(allIds);

        // ── Hide source image ──
        this._smartCutRestoreOriginalImage(false);
        sourceObj.opacity = 0;
        sourceObj.visible = false;

        // ── Clean up smart cut ──
        this._exitSmartCut();
        this.objects.updateObjectList();
        this.objects.updateProperties();
        this.stage.requestRender();
        eventBus.emit('history:push');

        if (!this._skeletonVisible) this.toggleSkeleton();

        const partCount = Object.keys(mergedParts).length;
        Utils.showToast(`Smart Cut complete — ${partCount} parts assembled with Pose Armature joint system`, 'success');

        // ── Show done step with armature panel button ──
        panel.querySelector('#sc-step-trace')?.classList.add('hidden');
        const doneStep = panel.querySelector('#sc-step-done');
        doneStep?.classList.remove('hidden');
        this._updateStepIndicator(panel, 3);
        const doneMsg = panel.querySelector('#sc-done-msg');
        if (doneMsg) doneMsg.textContent = `Merged ${Object.keys(createdParts).length} parts into ${partCount} armature roles using Pose Armature joint system (${cutMode === 'silhouette' ? 'silhouette-exact' : 'original-detail'}).`;
        this._renderCutReview?.(panel, '#sc-cut-review', this._buildCutReview?.(createdParts, preset, {
            title: 'SmartCut Review',
            sourceObj,
            regions: this._smartCutRegions
        }), createdParts);

        // Show armature panel button, hide save training (not applicable for armature)
        const armaturePanelBtn = panel.querySelector('#sc-btn-armature-panel');
        if (armaturePanelBtn) armaturePanelBtn.classList.remove('hidden');
        const saveTrainingBtn = panel.querySelector('#sc-btn-save-training');
        if (saveTrainingBtn) saveTrainingBtn.classList.add('hidden');

        const doneKeyHandler = this._setCuttingCompletionHandler(panel);

        panel.querySelector('#sc-btn-movements')?.addEventListener('click', () => {
            document.removeEventListener('keydown', doneKeyHandler);
            panel.remove();
            this.showMovementPicker();
        });
        panel.querySelector('#sc-btn-poses')?.addEventListener('click', () => {
            document.removeEventListener('keydown', doneKeyHandler);
            panel.remove();
            this.showPoseLibrary();
        });
        if (armaturePanelBtn) {
            armaturePanelBtn.addEventListener('click', () => {
                document.removeEventListener('keydown', doneKeyHandler);
                panel.remove();
                this.openArmaturePanel();
            });
        }
    },

    /**
     * Merge multiple StageObjects into a single composite image object.
     * Computes the bounding box of all sub-parts, renders them onto a
     * single canvas, creates a new StageObject, and returns it.
     */
    _mergePartsIntoComposite(subParts, roleKey) {
        if (!subParts?.length) return null;

        // Compute bounding box encompassing all sub-parts
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of subParts) {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x + p.width);
            maxY = Math.max(maxY, p.y + p.height);
        }

        const compositeW = Math.round(maxX - minX);
        const compositeH = Math.round(maxY - minY);
        if (compositeW < 1 || compositeH < 1) return null;

        const canvas = document.createElement('canvas');
        canvas.width = compositeW;
        canvas.height = compositeH;
        const ctx = canvas.getContext('2d');

        for (const p of subParts) {
            const img = p._tempTrimmedCanvas || p.imageElement || p._eraserCanvas;
            if (!img) continue;
            const dx = Math.round(p.x - minX);
            const dy = Math.round(p.y - minY);
            ctx.drawImage(img, 0, 0, img.naturalWidth || img.width, img.naturalHeight || img.height,
                          dx, dy, Math.round(p.width), Math.round(p.height));
        }

        const dataUrl = canvas.toDataURL('image/png');
        const newObj = new StageObject('image', {
            x: Math.round(minX),
            y: Math.round(minY),
            width: compositeW,
            height: compositeH,
            imageSrc: dataUrl,
            name: roleKey,
            layer: subParts[0].layer,
            opacity: subParts[0].opacity
        });
        this.objects.addObject(newObj);

        // Store trimmed canvas for joint cross-offset computation
        newObj._tempTrimmedCanvas = canvas;

        return newObj;
    },

    /**
     * Get a drawable canvas from a StageObject for joint cross-offset computation.
     */
    _getObjectCanvas(obj) {
        if (!obj || obj.type !== 'image') return null;
        const img = obj._tempTrimmedCanvas || obj.imageElement || obj._eraserCanvas;
        if (!img) return null;
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        if (!w || !h) return null;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d', { willReadFrequently: true }).drawImage(img, 0, 0, w, h);
        return canvas;
    },

    _saveSmartCutTrainingFromLastCandidate(panel, button = null) {
        const candidate = this._smartCutLastTrainingCandidate;
        if (!candidate?.preset?.key || !candidate?.outline?.length || !candidate?.regions?.length) {
            Utils.showToast('No Smart Cut training example is available from this session', 'warning');
            return;
        }

        const sample = this._captureSmartCutTrainingSample(candidate.preset, candidate.outline, candidate.regions);
        if (!sample) {
            Utils.showToast('Could not capture this Smart Cut layout as training', 'warning');
            return;
        }

        const presetKey = candidate.preset.key;
        const existing = this._getSmartCutTrainingSamples(presetKey);
        const next = [...existing, sample].slice(-24);
        this._setSmartCutTrainingSamples(presetKey, next);
        this._updateSmartCutAutoUI(panel);

        if (button) {
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-check"></i> Training Saved';
        }

        Utils.showToast(`Saved Smart Cut training for "${candidate.preset.name}" — future auto-trace runs will reuse this layout on similar silhouettes`, 'success');
    },

    _getIdleDownAssemblyPartKeys(presetKey) {
        switch (presetKey) {
            case 'human-front':
                return new Set([
                    'l-upper-arm', 'l-forearm',
                    'r-upper-arm', 'r-forearm',
                    'l-upper-leg', 'l-lower-leg',
                    'r-upper-leg', 'r-lower-leg',
                    'l-arm', 'r-arm',
                    'l-leg', 'r-leg'
                ]);
            case 'human-side':
                return new Set([
                    'upper-arm', 'forearm',
                    'upper-leg', 'lower-leg'
                ]);
            default:
                return new Set();
        }
    },

    _shouldNormalizeAssemblyPartToIdleDown(partKey, presetKey) {
        if (!partKey || !presetKey) return false;
        return this._getIdleDownAssemblyPartKeys(presetKey).has(partKey);
    },

    _normalizeAssemblyPartToIdleDown(obj, part, presetKey) {
        if (!obj || !part || !this.objects?.normalizeObjectDownBaseline) {
            return { changed: false, failed: true };
        }
        if (!this._shouldNormalizeAssemblyPartToIdleDown(part.partKey, presetKey)) {
            return { changed: false, failed: false, skipped: true };
        }
        return this.objects.normalizeObjectDownBaseline(obj, {
            bake: true,
            targetFromDown: 0
        });
    },

    _autoAssembleParts(createdParts, preset, assemblyMode = 'keep') {
        let jointCount = 0;
        const keepPositions = assemblyMode === 'keep';
        const rigId = `rig-${preset.key}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

        // Load trained parameters if available
        const trainingRaw = localStorage.getItem('jointTraining_' + preset.key);
        const training = trainingRaw ? JSON.parse(trainingRaw) : null;
        const trained = training ? training.parts : null;

        // Topological order: parents before children
        const sorted = [];
        const remaining = [...preset.parts];
        const placed = new Set();
        while (remaining.length > 0) {
            const before = remaining.length;
            for (let i = remaining.length - 1; i >= 0; i--) {
                const p = remaining[i];
                if (!p.parentPartKey || placed.has(p.parentPartKey)) {
                    sorted.push(p);
                    placed.add(p.partKey);
                    remaining.splice(i, 1);
                }
            }
            if (remaining.length === before) break; // prevent infinite loop
        }

        sorted.forEach(part => {
            const partObj = createdParts[part.partKey];
            if (!partObj) return;

            // Use trained parameters if available
            const t = trained && trained[part.partKey];

            // Store body-part metadata
            partObj.bodyPartData = this._applyGlobalJointLimits({
                charType: preset.key,
                presetKey: preset.key,
                motionPresetKey: preset.motionPresetKey || preset.key,
                rigType: preset.rigType || null,
                rigId,
                partKey: part.partKey,
                defaultAngle: part.defaultAngle
            });

            if (part.parentPartKey && createdParts[part.parentPartKey]) {
                const parentObj = createdParts[part.parentPartKey];
                const anchor = (t && t.anchorOnParent) || part.anchorOnParent;
                const pivot = (t && t.pivotOnSelf) || part.pivotOnSelf;

                if (pivot) {
                    partObj.pivotX = pivot.x;
                    partObj.pivotY = pivot.y;
                }

                this._normalizeAssemblyPartToIdleDown(partObj, part, preset.key);

                partObj.pinnedTo = parentObj.id;
                partObj.pinAnchorX = anchor.x;
                partObj.pinAnchorY = anchor.y;
                partObj.pinRotationMode = 'joint';
                partObj.pinInheritRotation = false;
                partObj.jointBaseAngle = part.defaultAngle;
                partObj.pinContour = true;  // auto-enable contour disc at joint

                if (keepPositions) {
                    // Compute the pin offset that keeps this part exactly where
                    // the cut placed it, instead of using preset/trained offsets.
                    const childPivot = partObj.getPivotPoint();
                    const offset = this.objects._getPinOffsetInParentSpace(
                        parentObj, childPivot.x, childPivot.y,
                        partObj.pinAnchorX, partObj.pinAnchorY
                    );
                    partObj.pinOffsetX = Math.round(offset.x);
                    partObj.pinOffsetY = Math.round(offset.y);
                } else {
                    partObj.pinOffsetX = (t && t.pinOffset) ? t.pinOffset.x : 0;
                    partObj.pinOffsetY = (t && t.pinOffset) ? t.pinOffset.y : 0;
                }

                jointCount++;
            } else {
                partObj.pinnedTo = null;
                partObj.pinRotationMode = 'static';
                partObj.jointBaseAngle = 0;
            }
        });

        // In reposition mode, resolve pins to rearrange parts using the preset layout.
        // In keep mode, parts already have correct offsets — just validate the hierarchy.
        if (this.objects._resolvePins) this.objects._resolvePins();
        this.stage.requestRender();
        return jointCount;
    },

    // ── Canvas helpers (minimal, reuse existing patterns) ──

    _scDrawSmartCutMaskPath(ctx, pathPoints) {
        ctx.beginPath();
        pathPoints.forEach((p, i) => {
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        });
        ctx.closePath();
    },

    _scExtractWithMask(srcCanvas, pathPoints, cw, ch, options = {}) {
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = cw;
        maskCanvas.height = ch;
        const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
        this._scDrawSmartCutMaskPath(maskCtx, pathPoints);
        maskCtx.fillStyle = '#fff';
        maskCtx.fill();

        const feather = Math.max(0, Number(options.feather) || 0);
        const finalMask = feather > 0 ? document.createElement('canvas') : maskCanvas;
        if (feather > 0) {
            finalMask.width = cw;
            finalMask.height = ch;
            const finalCtx = finalMask.getContext('2d');
            finalCtx.save();
            finalCtx.filter = `blur(${feather}px)`;
            finalCtx.drawImage(maskCanvas, 0, 0);
            finalCtx.restore();
            this._scDrawSmartCutMaskPath(finalCtx, pathPoints);
            finalCtx.fillStyle = '#fff';
            finalCtx.fill();
        }

        const result = document.createElement('canvas');
        result.width = cw;
        result.height = ch;
        const ctx = result.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(srcCanvas, 0, 0);
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(finalMask, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
        return result;
    },

    _scClipInterior(srcCanvas, pathPoints, cw, ch) {
        return this._scExtractWithMask(srcCanvas, pathPoints, cw, ch);
    },

    _scHasPixels(canvas) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        for (let i = 3; i < data.length; i += 4) {
            if (data[i] > 10) return true;
        }
        return false;
    },

    _scTrimCanvas(canvas) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const w = canvas.width, h = canvas.height;
        const data = ctx.getImageData(0, 0, w, h).data;
        let minX = w, minY = h, maxX = 0, maxY = 0;
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                if (data[(y * w + x) * 4 + 3] > 10) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }
        const tw = maxX - minX + 1;
        const th = maxY - minY + 1;
        if (tw <= 0 || th <= 0) return { canvas, offX: 0, offY: 0, width: w, height: h };
        const trimmed = document.createElement('canvas');
        trimmed.width = tw;
        trimmed.height = th;
        trimmed.getContext('2d', { willReadFrequently: true }).drawImage(canvas, minX, minY, tw, th, 0, 0, tw, th);
        return { canvas: trimmed, offX: minX, offY: minY, width: tw, height: th };
    },

    // ── Render overlay ──

    _renderSmartCutFaceGuides(ctx, zoom) {
        const guides = this._smartCutFaceGuides || [];
        if (!guides.length || this._smartCutPreset?.rigType !== 'face-rig' || this._smartCutFaceWorkflow !== 'guides') return;
        const palette = ['#38bdf8', '#0ea5e9', '#f472b6', '#ec4899', '#f59e0b', '#ef4444', '#fb7185', '#eab308'];
        const showLabels = this._shouldShowSmartCutFaceGuideLabels();
        guides.forEach((guide, index) => {
            const color = palette[index % palette.length];
            const enabled = this._isSmartCutFaceGuideEnabled(guide);
            if (!enabled && !guide.detailGroup) return;
            const isHover = this._smartCutFaceGuideHover?.index === index;
            const isDrag = this._smartCutFaceGuideDrag?.index === index;
            const active = enabled && (isHover || isDrag);
            const path = this._smartCutFaceGuideToPath(guide);
            ctx.beginPath();
            path.forEach((point, pointIndex) => {
                if (pointIndex === 0) ctx.moveTo(point.x, point.y);
                else ctx.lineTo(point.x, point.y);
            });
            ctx.closePath();
            ctx.fillStyle = enabled ? (active ? `${color}33` : `${color}22`) : 'rgba(148, 163, 184, 0.08)';
            ctx.strokeStyle = enabled ? color : 'rgba(148, 163, 184, 0.42)';
            ctx.lineWidth = (active ? 2.5 : 1.25) / zoom;
            ctx.setLineDash(guide.optional || !enabled ? [4 / zoom, 3 / zoom] : []);
            ctx.fill();
            ctx.stroke();
            ctx.setLineDash([]);

            const handleSize = 7 / zoom;
            const corners = [
                [guide.x, guide.y],
                [guide.x + guide.w, guide.y],
                [guide.x, guide.y + guide.h],
                [guide.x + guide.w, guide.y + guide.h]
            ];
            corners.forEach(([x, y]) => {
                ctx.fillStyle = enabled ? (active ? '#ffffff' : color) : 'rgba(148, 163, 184, 0.65)';
                ctx.strokeStyle = '#0f172a';
                ctx.lineWidth = 1 / zoom;
                ctx.fillRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
                ctx.strokeRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
            });

            if (!showLabels) return;
            const cx = guide.x + guide.w / 2;
            const cy = guide.y + guide.h / 2;
            const label = enabled ? (guide.optional ? `${guide.name} optional` : guide.name) : `${guide.name} off`;
            ctx.font = `bold ${10 / zoom}px Inter, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const textW = ctx.measureText(label).width;
            const pillW = textW + 10 / zoom;
            const pillH = 16 / zoom;
            ctx.fillStyle = 'rgba(15, 23, 42, 0.86)';
            if (ctx.roundRect) {
                ctx.beginPath();
                ctx.roundRect(cx - pillW / 2, cy - pillH / 2, pillW, pillH, 4 / zoom);
                ctx.fill();
            } else {
                ctx.fillRect(cx - pillW / 2, cy - pillH / 2, pillW, pillH);
            }
            ctx.fillStyle = '#f8fafc';
            ctx.fillText(label, cx, cy);
        });
    },

    _renderSmartCutOverlay(ctx) {
        if (!this._smartCutActive || !this._smartCutObj) return;

        const obj = this._smartCutObj;
        const zoom = Math.max(0.001, this.stage.zoom);
        const guidePart = this._smartCutPreset?.parts?.find(part => part.partKey === this._smartCutGuideKey) || null;

        ctx.save();

        // Highlight source object
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)';
        ctx.lineWidth = 2 / zoom;
        ctx.setLineDash([6 / zoom, 4 / zoom]);
        ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
        ctx.setLineDash([]);

        if (this._smartCutAutoOutline?.length >= 3) {
            ctx.beginPath();
            this._smartCutAutoOutline.forEach((point, index) => {
                if (index === 0) ctx.moveTo(point.x, point.y);
                else ctx.lineTo(point.x, point.y);
            });
            ctx.closePath();
            ctx.fillStyle = 'rgba(20, 184, 166, 0.08)';
            ctx.strokeStyle = 'rgba(20, 184, 166, 0.75)';
            ctx.lineWidth = 1.5 / zoom;
            ctx.setLineDash([4 / zoom, 3 / zoom]);
            ctx.fill();
            ctx.stroke();
            ctx.setLineDash([]);
        }

        this._renderSmartCutFaceGuides(ctx, zoom);

        // Draw completed regions (filled with semi-transparent color)
        const colors = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899',
                         '#06b6d4', '#f97316', '#14b8a6', '#6366f1', '#d946ef', '#84cc16',
                         '#0ea5e9', '#e11d48', '#a855f7', '#22c55e', '#eab308'];
        const showFaceEditLabels = this._smartCutPreset?.rigType === 'face-rig' && this._smartCutFaceWorkflow === 'guides'
            ? this._shouldShowSmartCutFaceGuideLabels()
            : true;
        const traceThroughRegions = !!this._smartCutTraceThroughRegions && !this._smartCutEditMode && !this._smartCutPathClosed;
        this._smartCutRegions.forEach((region, i) => {
            const color = colors[i % colors.length];
            const isSelected = this._smartCutSelectedRegion === i;
            const isHoverRegion = this._smartCutHoverRegion === i;
            const isHoverPointRegion = this._smartCutHoverPoint?.regionIndex === i;
            const isActiveRegion = isSelected || isHoverRegion || isHoverPointRegion || this._smartCutRegionDrag?.regionIndex === i;
            const isLocked = !!region.locked;
            const isTraceThroughDimmed = traceThroughRegions && !isActiveRegion;

            ctx.fillStyle = color + (isTraceThroughDimmed ? '12' : (isLocked ? '18' : (isActiveRegion ? '42' : '30')));
            ctx.strokeStyle = color;
            ctx.globalAlpha = isTraceThroughDimmed ? 0.55 : 1;
            ctx.lineWidth = (isActiveRegion ? 2.8 : 2) / zoom;
            ctx.setLineDash(isLocked || isTraceThroughDimmed ? [5 / zoom, 4 / zoom] : []);
            ctx.beginPath();
            region.path.forEach((p, j) => {
                if (j === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            });
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.globalAlpha = 1;

            if (this._smartCutEditMode && isSelected && !isLocked) {
                const ptR = 3.2 / zoom;
                region.path.forEach((p, pointIndex) => {
                    const isHoverPoint = this._smartCutHoverPoint
                        && this._smartCutHoverPoint.regionIndex === i
                        && this._smartCutHoverPoint.pointIndex === pointIndex;
                    const isDragPoint = this._smartCutDragging
                        && this._smartCutDragging.regionIndex === i
                        && this._smartCutDragging.pointIndex === pointIndex;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, (isHoverPoint || isDragPoint) ? ptR * 1.65 : ptR, 0, Math.PI * 2);
                    ctx.fillStyle = (isHoverPoint || isDragPoint) ? '#ffffff' : color;
                    ctx.fill();
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 1.1 / zoom;
                    ctx.stroke();
                });

                const drawHintPill = (text, x, y, colorOverride = color) => {
                    ctx.save();
                    ctx.font = `bold ${10 / zoom}px Inter, sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    const textW = ctx.measureText(text).width;
                    const pillW = textW + 12 / zoom;
                    const pillH = 17 / zoom;
                    const px = x - pillW / 2;
                    const py = y - 24 / zoom;
                    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
                    ctx.strokeStyle = colorOverride;
                    ctx.lineWidth = 1 / zoom;
                    ctx.beginPath();
                    if (ctx.roundRect) ctx.roundRect(px, py, pillW, pillH, 5 / zoom);
                    else ctx.rect(px, py, pillW, pillH);
                    ctx.fill();
                    ctx.stroke();
                    ctx.fillStyle = '#f8fafc';
                    ctx.fillText(text, x, py + pillH / 2);
                    ctx.restore();
                };

                if (this._smartCutHoverEdge?.regionIndex === i) {
                    const edge = this._smartCutHoverEdge;
                    const a = region.path[edge.segIndex];
                    const b = region.path[(edge.segIndex + 1) % region.path.length];
                    if (a && b) {
                        ctx.save();
                        ctx.strokeStyle = '#22c55e';
                        ctx.lineWidth = 4 / zoom;
                        ctx.setLineDash([5 / zoom, 4 / zoom]);
                        ctx.beginPath();
                        ctx.moveTo(a.x, a.y);
                        ctx.lineTo(b.x, b.y);
                        ctx.stroke();
                        ctx.setLineDash([]);

                        const markerR = 7 / zoom;
                        ctx.beginPath();
                        ctx.arc(edge.x, edge.y, markerR, 0, Math.PI * 2);
                        ctx.fillStyle = '#22c55e';
                        ctx.fill();
                        ctx.strokeStyle = '#ffffff';
                        ctx.lineWidth = 1.5 / zoom;
                        ctx.stroke();
                        ctx.fillStyle = '#052e16';
                        ctx.font = `bold ${13 / zoom}px Inter, sans-serif`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText('+', edge.x, edge.y + 0.2 / zoom);
                        ctx.restore();
                        if (showFaceEditLabels) drawHintPill('Right-click to add point', edge.x, edge.y, '#22c55e');
                    }
                }

                if (this._smartCutHoverPoint?.regionIndex === i) {
                    const point = region.path[this._smartCutHoverPoint.pointIndex];
                    if (point) {
                        ctx.save();
                        ctx.beginPath();
                        ctx.arc(point.x, point.y, 8 / zoom, 0, Math.PI * 2);
                        ctx.strokeStyle = '#f43f5e';
                        ctx.lineWidth = 2 / zoom;
                        ctx.stroke();
                        ctx.restore();
                        if (region.path.length > 3) {
                            if (showFaceEditLabels) drawHintPill('Right-click to delete point', point.x, point.y, '#f43f5e');
                        } else {
                            if (showFaceEditLabels) drawHintPill('Minimum 3 points', point.x, point.y, '#f59e0b');
                        }
                    }
                }
            }

            // Label
            if (!showFaceEditLabels || isTraceThroughDimmed) return;
            const cx = region.path.reduce((s, p) => s + p.x, 0) / region.path.length;
            const cy = region.path.reduce((s, p) => s + p.y, 0) / region.path.length;
            ctx.fillStyle = '#fff';
            ctx.font = `bold ${11 / zoom}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            // Background pill
            const labelText = isLocked ? `${region.name} [locked]` : region.name;
            const textW = ctx.measureText(labelText).width;
            ctx.fillStyle = color + 'cc';
            const pillH = 14 / zoom;
            const rx = cx - textW / 2 - 4 / zoom, ry = cy - pillH / 2, rw = textW + 8 / zoom, rr = 3 / zoom;
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(rx, ry, rw, pillH, rr);
            } else {
                ctx.rect(rx, ry, rw, pillH);
            }
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.fillText(labelText, cx, cy);
        });

        // Draw current tracing path
        const pts = this._smartCutCurrentPath;
        const pathClosed = this._smartCutPathClosed;
        if (pts.length > 0) {
            ctx.strokeStyle = pathClosed ? '#f59e0b' : '#10b981';
            ctx.lineWidth = 2 / zoom;
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) {
                ctx.lineTo(pts[i].x, pts[i].y);
            }
            if (pathClosed) {
                // Draw closing segment back to first point
                ctx.closePath();
                ctx.fillStyle = 'rgba(245, 158, 11, 0.12)';
                ctx.fill();
            } else if (this._smartCutHover) {
                // Live line to hover
                ctx.lineTo(this._smartCutHover.x, this._smartCutHover.y);
            }
            ctx.stroke();

            // Points
            const ptR = 3.5 / zoom;
            pts.forEach((p, i) => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, ptR, 0, Math.PI * 2);
                ctx.fillStyle = i === 0 ? '#f59e0b' : '#10b981';
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1.2 / zoom;
                ctx.stroke();
            });

            // Close-hint: glow only when the pointer is on the small close target.
            if (pts.length >= 3 && this._smartCutHoverRaw && !pathClosed) {
                const first = pts[0];
                if (this._isSmartCutClosePointHit(this._smartCutHoverRaw)) {
                    ctx.beginPath();
                    ctx.arc(first.x, first.y, 9 / zoom, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(245, 158, 11, 0.5)';
                    ctx.fill();
                    ctx.strokeStyle = '#f59e0b';
                    ctx.lineWidth = 2 / zoom;
                    ctx.stroke();

                    const label = 'Click to close';
                    ctx.font = `bold ${10 / zoom}px Inter, sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    const textW = ctx.measureText(label).width;
                    const pillW = textW + 12 / zoom;
                    const pillH = 18 / zoom;
                    const px = first.x - pillW / 2;
                    const py = first.y - 30 / zoom;
                    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
                    ctx.beginPath();
                    if (ctx.roundRect) ctx.roundRect(px, py, pillW, pillH, 5 / zoom);
                    else ctx.rect(px, py, pillW, pillH);
                    ctx.fill();
                    ctx.strokeStyle = '#f59e0b';
                    ctx.lineWidth = 1 / zoom;
                    ctx.stroke();
                    ctx.fillStyle = '#f8fafc';
                    ctx.fillText(label, first.x, py + pillH / 2);
                }
            }
        }

        // Snap cursor indicator
        if (this._smartCutHover && pts.length === 0 && !this._smartCutGuidedLandmarks?.active) {
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
            ctx.lineWidth = 1 / zoom;
            ctx.setLineDash([3 / zoom, 3 / zoom]);
            ctx.beginPath();
            ctx.moveTo(this._smartCutHover.x - 12 / zoom, this._smartCutHover.y);
            ctx.lineTo(this._smartCutHover.x + 12 / zoom, this._smartCutHover.y);
            ctx.moveTo(this._smartCutHover.x, this._smartCutHover.y - 12 / zoom);
            ctx.lineTo(this._smartCutHover.x, this._smartCutHover.y + 12 / zoom);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        if (guidePart) {
            const message = this._smartCutEditMode
                ? `Training Mode: drag ${guidePart.name} or reshape its points`
                : (this._smartCutCurrentPath.length >= 3
                    ? `Label region as: ${guidePart.name}`
                    : `Trace next: ${guidePart.name}`);
            const boxWidth = Math.max(180 / zoom, (message.length * 6.2) / zoom);
            ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
            ctx.fillRect(16 / zoom, 16 / zoom, boxWidth, 26 / zoom);
            ctx.strokeStyle = 'rgba(244, 63, 94, 0.85)';
            ctx.lineWidth = 1 / zoom;
            ctx.strokeRect(16 / zoom, 16 / zoom, boxWidth, 26 / zoom);
            ctx.fillStyle = '#fff1f2';
            ctx.font = `bold ${10 / zoom}px Inter, sans-serif`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(message, 24 / zoom, 29 / zoom);
        }

        // ── Guided Landmark Markers ──
        const gl = this._smartCutGuidedLandmarks;
        if (gl?.steps?.length) {
            const landmarkColors = {
                headTop: '#a855f7',
                jawTip: '#c084fc',
                neckBase: '#8b5cf6',
                leftNeckJoin: '#6366f1', rightNeckJoin: '#6366f1',
                leftShoulder: '#3b82f6', rightShoulder: '#3b82f6',
                leftArmpit: '#f59e0b', rightArmpit: '#f59e0b',
                leftElbow: '#22c55e', rightElbow: '#22c55e',
                leftWrist: '#14b8a6', rightWrist: '#14b8a6',
                leftHip: '#ef4444', rightHip: '#ef4444',
                leftLegStart: '#f97316', rightLegStart: '#f97316',
                crotch: '#ef4444',
                leftKnee: '#10b981', rightKnee: '#10b981',
                leftAnkle: '#06b6d4', rightAnkle: '#06b6d4',
                leftHandTip: '#ec4899', rightHandTip: '#ec4899',
                leftToeTip: '#06b6d4', rightToeTip: '#06b6d4'
            };

            // Draw placed landmarks
            for (const [key, pt] of Object.entries(gl.points)) {
                if (!pt) continue;
                const color = landmarkColors[key] || '#8b5cf6';
                const r = 6 / zoom;
                // Outer ring
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
                ctx.fillStyle = color + 'cc';
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2 / zoom;
                ctx.stroke();
                // Crosshair
                ctx.strokeStyle = color;
                ctx.lineWidth = 1.2 / zoom;
                ctx.beginPath();
                ctx.moveTo(pt.x - r * 1.8, pt.y);
                ctx.lineTo(pt.x + r * 1.8, pt.y);
                ctx.moveTo(pt.x, pt.y - r * 1.8);
                ctx.lineTo(pt.x, pt.y + r * 1.8);
                ctx.stroke();
                // Label
                const step = gl.steps.find(s => s.key === key);
                if (step) {
                    ctx.font = `bold ${8 / zoom}px Inter, sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'bottom';
                    ctx.fillStyle = 'rgba(0,0,0,0.7)';
                    ctx.fillText(step.label, pt.x, pt.y - r - 3 / zoom);
                    ctx.fillStyle = '#fff';
                    ctx.fillText(step.label, pt.x - 0.5 / zoom, pt.y - r - 3.5 / zoom);
                }
            }

            // Draw prompt for current step
            if (gl.active && gl.currentIndex < gl.steps.length) {
                const step = gl.steps[gl.currentIndex];
                const boxMsg = `Click: ${step.label}`;
                const bw = Math.max(140 / zoom, (boxMsg.length * 7) / zoom);
                ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
                ctx.fillRect(16 / zoom, 16 / zoom, bw, 26 / zoom);
                ctx.strokeStyle = '#f59e0b';
                ctx.lineWidth = 1.5 / zoom;
                ctx.strokeRect(16 / zoom, 16 / zoom, bw, 26 / zoom);
                ctx.fillStyle = '#fef3c7';
                ctx.font = `bold ${10 / zoom}px Inter, sans-serif`;
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(boxMsg, 24 / zoom, 29 / zoom);
            }
        }

        ctx.restore();
    },


    // ═══════════════════════════════════════════════════════════
    //  BODY STENCIL — pre-traced outlines for quick body-part cut
    // ═══════════════════════════════════════════════════════════

    /**
     * Returns stencil definitions: normalized {x,y} paths (0-1 within image)
     * for each body part, keyed to JointPresets part keys.
     *
     * Each template also defines `stars`: draggable joint-anchor points that
     * sit at connection boundaries between parts. Moving a star reshapes
     * the vertices of all adjacent parts simultaneously, making alignment
     * fast and intuitive.
     *
     * Star format:
     *   { id, label, x, y, links: [{ partKey, vertexIndices: [i,...] }] }
     *
     * Shapes are anatomically proportioned:
     *   head = ellipse, neck = narrow rect, torso = tapered trapezoid,
     *   arms/legs = tapered strips, hands/feet = small rects.
     */

    // ── Show the Body Stencil panel ──


});
