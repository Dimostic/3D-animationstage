/* ============================================
   Animation Stage - Object System
   Object creation, selection, manipulation, rendering
   ============================================ */

class StageObject {
    constructor(type, props = {}) {
        this.realistic3D = type === 'image' ? globalThis.Realistic3DLibrary?.normalize(props.realistic3D) || undefined : undefined;
        if (this.realistic3D) for (const key of globalThis.Realistic3DLibrary.channels) {
            this[key] = Number.isFinite(props[key]) ? props[key] : 0;
        }
        this.id = Utils.generateId('obj');
        this.type = type; // 'rectangle','circle','triangle','star','polygon','line','diamond','heart','arrow','doubleArrow','curvedArrow','scribble','freeform','text','image','path','icon'
        this.name = props.name || `${StageObject.getTypeDisplayName(type)} ${StageObject.counter++}`;
        
        // Transform
        this.x = props.x ?? 0;
        this.y = props.y ?? 0;
        this.width = props.width ?? 100;
        this.height = props.height ?? 100;
        this.rotation = props.rotation || 0;
        this.depth = props.depth ?? 0;
        this.depthSideColor = props.depthSideColor || '';
        this.depthSideMode = ['auto', 'color'].includes(props.depthSideMode) ? props.depthSideMode : 'auto';
        this.depthLighting = props.depthLighting ?? 45;
        this.depthPerspective = props.depthPerspective ?? 0;
        this.showDepthHandle = props.showDepthHandle ?? false;
        this.tiltX = props.tiltX ?? 0;
        this.tiltY = props.tiltY ?? 0;
        this.scaleX = props.scaleX ?? 1;
        this.scaleY = props.scaleY ?? 1;
        this.armatureSeatDepth = props.armatureSeatDepth ?? 0;
        this.armatureKneelDepth = props.armatureKneelDepth ?? 0;
        this.armatureReachDepth = props.armatureReachDepth ?? 0;
        this.limbLengthMode = props.limbLengthMode || 'natural';
        this.limbLengthCompensation = props.limbLengthCompensation ?? .5;
        this.limbReachStretch = props.limbReachStretch ?? 0;
        this.armatureSeatLean = props.armatureSeatLean ?? 0;
        this.opacity = props.opacity ?? 1;
        // Compositing/blend mode (canvas globalCompositeOperation). 'normal' maps to 'source-over'.
        this.blendMode = props.blendMode || 'normal';
        this.lockAspectRatio = props.lockAspectRatio ?? false;
        
        // Appearance
        this.fillType = props.fillType || 'solid'; // 'solid','linear-gradient','radial-gradient','pattern','picture'
        this.fill = props.fill || '#4a90d9';
        this.gradientStops = props.gradientStops || [{offset:0, color:'#4a90d9'},{offset:1, color:'#1a5fb4'}];
        this.gradientAngle = props.gradientAngle ?? 0; // degrees for linear gradient
        this.patternType = props.patternType || 'none'; // 'none','stripes','dots','crosshatch','checkerboard'
        this.patternColor = props.patternColor || '#ffffff';
        this.patternScale = props.patternScale ?? 1;

        // Outline / Stroke
        const linePaintTypes = ['line', 'path', 'arrow', 'doubleArrow', 'curvedArrow', 'scribble'];
        this.stroke = Object.prototype.hasOwnProperty.call(props, 'stroke')
            ? (props.stroke || '#000000')
            : (linePaintTypes.includes(type) ? (props.fill || '#4a90d9') : '#000000');
        this.strokeWidth = props.strokeWidth ?? (['line','arrow','doubleArrow','curvedArrow','scribble','cube','can','brace','bracket','bentArrow','uTurnArrow','quadArrow','upDownArrow','upArrowCallout','elbowArrowConnector'].includes(type) ? 2 : 0);
        this.strokeDash = props.strokeDash || 'solid'; // 'solid','dashed','dotted','dash-dot'
        this.strokeCap = props.strokeCap || 'round'; // 'butt','round','square'
        this.strokeJoin = props.strokeJoin || 'round'; // 'miter','round','bevel'
        this.borderRadius = props.borderRadius || 0;

        // Shadow
        this.shadow = props.shadow || false;
        this.shadowColor = props.shadowColor || 'rgba(0,0,0,0.3)';
        this.shadowBlur = props.shadowBlur || 10;
        this.shadowOffsetX = props.shadowOffsetX || 2;
        this.shadowOffsetY = props.shadowOffsetY || 4;

        // Effects
        this.glowEnabled = props.glowEnabled ?? false;
        this.glowColor = props.glowColor || '#00bfff';
        this.glowSize = props.glowSize ?? 15;
        this.reflectionEnabled = props.reflectionEnabled ?? false;
        this.reflectionOpacity = props.reflectionOpacity ?? 0.3;
        this.reflectionOffset = props.reflectionOffset ?? 0;
        this.bevelEnabled = props.bevelEnabled ?? false;
        this.bevelSize = props.bevelSize ?? 4;
        this.bevelHighlight = props.bevelHighlight || '#ffffff';
        this.bevelShadow = props.bevelShadow || '#000000';
        
        // Text properties
        this.text = props.text || '';
        this.fontFamily = props.fontFamily || 'Inter';
        this.fontSize = props.fontSize || 24;
        this.fontWeight = props.fontWeight || '400';
        this.fontStyle = props.fontStyle || 'normal'; // 'normal' | 'italic'
        this.textDecoration = props.textDecoration || 'none'; // 'none' | 'underline' | 'line-through' | 'underline line-through'
        this.textAlign = props.textAlign || 'left';
        this.textColor = props.textColor || '#ffffff';
        this.lineHeight = props.lineHeight ?? 1.4;
        this.letterSpacing = props.letterSpacing ?? 0;
        this.textCurve = props.textCurve ?? 0;
        this.textTransform = props.textTransform || 'none';
        // Bullet / numbered list rendering — 'none' disables markers entirely
        this.listStyle = props.listStyle || 'none'; // 'none' | 'bullet' | 'dash' | 'check' | 'arrow' | 'number'
        this.listIndent = Number.isFinite(props.listIndent) ? props.listIndent : 24; // px between marker and text
        this.textStrokeColor = props.textStrokeColor || '#000000';
        this.textStrokeWidth = props.textStrokeWidth ?? 0;
        this.textBackgroundEnabled = props.textBackgroundEnabled ?? false;
        this.textBackgroundColor = props.textBackgroundColor || '#111827';
        this.textBackgroundPadding = props.textBackgroundPadding ?? 10;
        this.textBackgroundRadius = props.textBackgroundRadius ?? 8;

        // Caption (timed subtitle) properties — segments are timeline-absolute ms
        this.segments = Array.isArray(props.segments)
            ? props.segments.map(segment => ({
                startMs: Math.max(0, Number(segment.startMs) || 0),
                endMs: Math.max(0, Number(segment.endMs) || 0),
                text: String(segment.text || ''),
                // Optional second-language translation aligned to this cue's timing
                secondary: segment.secondary ? String(segment.secondary) : undefined,
                words: Array.isArray(segment.words)
                    ? segment.words.map(word => ({
                        startMs: Math.max(0, Number(word.startMs) || 0),
                        endMs: Math.max(0, Number(word.endMs) || 0),
                        text: String(word.text || '')
                    }))
                    : undefined
            }))
            : [];
        this.captionAudioId = props.captionAudioId || '';
        for (const key of ['captionBinding', 'captionSourceSegments', 'captionProfile']) {
            this[key] = props[key] ? JSON.parse(JSON.stringify(props[key])) : null;
        }
        this.captionLanguage = props.captionLanguage || 'en';
        this.captionDelivery = props.captionDelivery || 'burn-in';
        this.captionStale = props.captionStale || '';
        if (this.type === 'caption' && globalThis.CaptionRuntime) {
            this.segments = (props.segments || []).map(cue => globalThis.CaptionRuntime.normalize(cue));
        }
        this.captionPreset = props.captionPreset || 'subtitle';
        this.captionHighlightEnabled = props.captionHighlightEnabled ?? false;
        this.captionHighlightColor = props.captionHighlightColor || '#f6c945';
        this.captionVerticalAlign = props.captionVerticalAlign || '';
        // Bilingual captions — primary on top, translation below (shares timing)
        this.bilingual = props.bilingual ?? false;
        this.secondaryLang = props.secondaryLang || '';         // label / BCP-47 (used for SRT filename)
        this.secondaryTextColor = props.secondaryTextColor || '#cfe8ff';
        this.secondaryFontScale = Number.isFinite(props.secondaryFontScale) ? props.secondaryFontScale : 0.85;
        this.secondaryGap = Number.isFinite(props.secondaryGap) ? props.secondaryGap : 6;

        // Image
        this.imageSrc = props.imageSrc || null;
        this.sceneAsset = props.sceneAsset ? JSON.parse(JSON.stringify(props.sceneAsset)) : null;
        this.activityRootId = props.activityRootId || null;
        this.activityKitSettings = props.activityKitSettings ? JSON.parse(JSON.stringify(props.activityKitSettings)) : null;
        this.imageZoom = Math.max(1, Math.min(2.5, Number(props.imageZoom) || 1));
        this.imagePanX = Math.max(-1, Math.min(1, Number(props.imagePanX) || 0));
        this.imagePanY = Math.max(-1, Math.min(1, Number(props.imagePanY) || 0));
        this.cloneBrushLayer = props.cloneBrushLayer ? JSON.parse(JSON.stringify(props.cloneBrushLayer)) : null;
        this.layerMask = props.layerMask ? JSON.parse(JSON.stringify(props.layerMask)) : null;
        this.faceRig = props.faceRig ? JSON.parse(JSON.stringify(props.faceRig)) : null;
        this.faceRigExpression = props.faceRigExpression || 'neutral';
        this.faceRigStrength = Number.isFinite(Number(props.faceRigStrength)) ? Number(props.faceRigStrength) : 0;
        this.faceRigLookX = Number.isFinite(Number(props.faceRigLookX)) ? Number(props.faceRigLookX) : 0;
        this.faceRigLookY = Number.isFinite(Number(props.faceRigLookY)) ? Number(props.faceRigLookY) : 0;
        this.faceRigMouthOpen = Number.isFinite(Number(props.faceRigMouthOpen)) ? Number(props.faceRigMouthOpen) : 0;
        this.faceRigPartParentId = props.faceRigPartParentId || null;
        this.faceRigPartRole = props.faceRigPartRole || null;
        this.faceRigPartLabel = props.faceRigPartLabel || null;
        this.faceRigPartBase = props.faceRigPartBase ? JSON.parse(JSON.stringify(props.faceRigPartBase)) : null;
        this.faceRigPartTuning = props.faceRigPartTuning ? JSON.parse(JSON.stringify(props.faceRigPartTuning)) : null;
        const svgAvatarData = props._svgAvatar || props.svgAvatar || null;
        this._svgAvatar = svgAvatarData ? JSON.parse(JSON.stringify(svgAvatarData)) : null;
        this._characterAppearanceProvider = props.characterAppearanceProvider || props._characterAppearanceProvider || null;
        this._svgCharacter = props.svgCharacter === true || props._svgCharacter === true;
        this._svgCharacterVersion = props.svgCharacterVersion || props._svgCharacterVersion || null;
        this._svgCharacterEngine = props.svgCharacterEngine || props._svgCharacterEngine || null;
        this._svgCharacterInstanceId = props.svgCharacterInstanceId || props._svgCharacterInstanceId || null;
        this._svgCharacterIdentityId = props.svgCharacterIdentityId || props._svgCharacterIdentityId || null;
        this._svgCharacterConfig = (props.svgCharacterConfig || props._svgCharacterConfig)
            ? JSON.parse(JSON.stringify(props.svgCharacterConfig || props._svgCharacterConfig))
            : null;
        this._svgCharacterIdentity = (props.svgCharacterIdentity || props._svgCharacterIdentity)
            ? JSON.parse(JSON.stringify(props.svgCharacterIdentity || props._svgCharacterIdentity))
            : null;
        this._svgCharacterStyling = (props.svgCharacterStyling || props._svgCharacterStyling)
            ? JSON.parse(JSON.stringify(props.svgCharacterStyling || props._svgCharacterStyling))
            : null;
        this._svgCharacterViewProfileKey = props.svgCharacterViewProfileKey || props._svgCharacterViewProfileKey || null;
        this._svgCharacterProjectionMode = props.svgCharacterProjectionMode || props._svgCharacterProjectionMode || null;
        this._svgCharacterPremiumAssetId = props.svgCharacterPremiumAssetId || props._svgCharacterPremiumAssetId || null;
        this._svgCharacterPart = props.svgCharacterPart === true || props._svgCharacterPart === true;
        this._svgCharacterPremiumPart = props.svgCharacterPremiumPart === true || props._svgCharacterPremiumPart === true;
        this._svgCharacterPartKey = props.svgCharacterPartKey || props._svgCharacterPartKey || null;
        this._svgCharacterPremiumPartKey = props.svgCharacterPremiumPartKey || props._svgCharacterPremiumPartKey || null;
        this._svgAfricanPremiumAssetId = props.svgAfricanPremiumAssetId || props._svgAfricanPremiumAssetId || null;
        this._svgAfricanAssetProfile = props.svgAfricanAssetProfile || props._svgAfricanAssetProfile || null;
        this._svgAfricanSourcePath = props.svgAfricanSourcePath || props._svgAfricanSourcePath || null;
        this._svgAfricanSourceFile = props.svgAfricanSourceFile || props._svgAfricanSourceFile || null;
        this._svgAfricanMasterFile = props.svgAfricanMasterFile || props._svgAfricanMasterFile || null;
        this._svgAfricanCalibrationVersion = props.svgAfricanCalibrationVersion || props._svgAfricanCalibrationVersion || null;
        this._svgAfricanPremiumBaseScale = Number(props.svgAfricanPremiumBaseScale ?? props._svgAfricanPremiumBaseScale) || null;
        this._svgAfricanAnatomicalLayoutVersion = Number.isFinite(Number(props.svgAfricanAnatomicalLayoutVersion ?? props._svgAfricanAnatomicalLayoutVersion))
            ? Number(props.svgAfricanAnatomicalLayoutVersion ?? props._svgAfricanAnatomicalLayoutVersion)
            : null;
        this._svgAfricanAssetManifest = (props.svgAfricanAssetManifest || props._svgAfricanAssetManifest)
            ? JSON.parse(JSON.stringify(props.svgAfricanAssetManifest || props._svgAfricanAssetManifest))
            : null;
        this._svgAfricanCalibration = (props.svgAfricanCalibration || props._svgAfricanCalibration)
            ? JSON.parse(JSON.stringify(props.svgAfricanCalibration || props._svgAfricanCalibration))
            : null;
        this._svgAfricanPartProfile = (props.svgAfricanPartProfile || props._svgAfricanPartProfile)
            ? JSON.parse(JSON.stringify(props.svgAfricanPartProfile || props._svgAfricanPartProfile))
            : null;
        this._svgAfricanJointProfile = (props.svgAfricanJointProfile || props._svgAfricanJointProfile)
            ? JSON.parse(JSON.stringify(props.svgAfricanJointProfile || props._svgAfricanJointProfile))
            : null;
        this._svgAfricanPinProfile = (props.svgAfricanPinProfile || props._svgAfricanPinProfile)
            ? JSON.parse(JSON.stringify(props.svgAfricanPinProfile || props._svgAfricanPinProfile))
            : null;
        this._svgAfricanFaceState = (props.svgAfricanFaceState || props._svgAfricanFaceState)
            ? JSON.parse(JSON.stringify(props.svgAfricanFaceState || props._svgAfricanFaceState))
            : null;
        this._svgAfricanAdjustments = (props.svgAfricanAdjustments || props._svgAfricanAdjustments)
            ? JSON.parse(JSON.stringify(props.svgAfricanAdjustments || props._svgAfricanAdjustments))
            : null;
        globalThis.SvgAfricanAuthoredArtworkLoader?.warmForStageObject?.(this);
        this._imageElementInternal = null;
        Object.defineProperty(this, 'imageElement', {
            configurable: true,
            enumerable: true,
            get: () => this._imageElementInternal,
            set: (value) => {
                this._imageElementInternal = value || null;
            }
        });
        Object.defineProperty(this, '_imgEl', {
            configurable: true,
            enumerable: false,
            get: () => this._imageElementInternal,
            set: (value) => {
                this._imageElementInternal = value || null;
            }
        });
        this.textureImageSrc = props.textureImageSrc || null;
        this.pictureFillMode = ['stretch', 'fill', 'fit'].includes(props.pictureFillMode)
            ? props.pictureFillMode
            : 'stretch';
        this.pictureFillRotation = Number.isFinite(Number(props.pictureFillRotation))
            ? Number(props.pictureFillRotation)
            : 0;
        this._textureImageElementInternal = null;
        Object.defineProperty(this, 'textureImageElement', {
            configurable: true,
            enumerable: true,
            get: () => this._textureImageElementInternal,
            set: (value) => {
                this._textureImageElementInternal = value || null;
            }
        });
        Object.defineProperty(this, '_textureImgEl', {
            configurable: true,
            enumerable: false,
            get: () => this._textureImageElementInternal,
            set: (value) => {
                this._textureImageElementInternal = value || null;
            }
        });
        
        // Animated GIF
        this.isAnimatedGif = props.isAnimatedGif || false;
        this.gifFrameDelays = props.gifFrameDelays || null; // array of ms delays per frame
        this.isSpriteSequence = props.isSpriteSequence || false;
        this.spriteSheet = props.spriteSheet ? JSON.parse(JSON.stringify(props.spriteSheet)) : null;
        this._spriteStartTime = performance.now();
        this._gifFrames = null;      // transient: decoded frame canvases (not serialised)
        this._gifTotalDuration = 0;  // computed from gifFrameDelays
        this._gifStartTime = 0;      // performance.now() at first render
        
        // Image filters
        this.imgBrightness = props.imgBrightness ?? 0;    // -100 to 100
        this.imgContrast = props.imgContrast ?? 0;         // -100 to 100
        this.imgSaturation = props.imgSaturation ?? 0;     // -100 to 100
        this.imgHue = props.imgHue ?? 0;                   // 0 to 360
        this.imgBlur = props.imgBlur ?? 0;                 // 0 to 20
        this.imgGrayscale = props.imgGrayscale ?? 0;       // 0 to 100
        this.imgSepia = props.imgSepia ?? 0;               // 0 to 100
        this.imgInvert = props.imgInvert ?? 0;             // 0 to 100
        this.imgTintColor = props.imgTintColor || '#ffffff';
        this.imgTintAmount = props.imgTintAmount ?? 0;     // 0 to 100
        
        // Path
        this.pathPoints = props.pathPoints || [];
        this.closedPath = props.closedPath ?? true; // open or closed freeform path

        // Icon (SVG path data)
        this.iconPath = props.iconPath || null;
        this.iconViewBox = props.iconViewBox || '0 0 100 100';
        
        // Star/Polygon and advanced shape parameters
        this.sides = props.sides ?? 5;
        this.innerRadius = props.innerRadius ?? StageObject.getDefaultShapeProperty(type, 'innerRadius') ?? 0.4;
        this.shapeStartAngle = props.shapeStartAngle ?? StageObject.getDefaultShapeProperty(type, 'shapeStartAngle');
        this.shapeSweepAngle = props.shapeSweepAngle ?? StageObject.getDefaultShapeProperty(type, 'shapeSweepAngle');
        this.arrowShaftWidth = props.arrowShaftWidth ?? StageObject.getDefaultShapeProperty(type, 'arrowShaftWidth');
        this.arrowHeadLength = props.arrowHeadLength ?? StageObject.getDefaultShapeProperty(type, 'arrowHeadLength');

        // Pivot point (0-1 normalized, 0.5,0.5 = center)
        this.pivotX = props.pivotX ?? 0.5;
        this.pivotY = props.pivotY ?? 0.5;
        this.showPivot = props.showPivot ?? false;

        // Flip
        this.flipH = props.flipH ?? false;
        this.flipV = props.flipV ?? false;

        // Grouping
        this.groupId = props.groupId || null;
        this.animatedPart = props.animatedPart ? JSON.parse(JSON.stringify(props.animatedPart)) : null;

        // Whole-character stacking is intentionally separate from the armature's
        // internal limb/torso draw order.
        this._characterStackId = props.characterStackId || props._characterStackId || null;
        const characterStackOrder = Number(props.characterStackOrder ?? props._characterStackOrder);
        this._characterStackOrder = Number.isFinite(characterStackOrder) ? characterStackOrder : undefined;
        
        // State
        this.visible = props.visible ?? true;
        this.locked = props.locked ?? false;
        this.layer = props.layer || 0;
        const armatureDrawLayer = Number(props._armatureDrawLayer ?? props.armatureDrawLayer);
        this._armatureDrawLayer = Number.isFinite(armatureDrawLayer) ? armatureDrawLayer : undefined;
        this.tags = props.tags || [];
        this.bodyTags = StageObject.normalizeBodyTagList(props.bodyTags);
        this.animations = [];

        // Rigging (bone/pin deformation for images)
        this.rigging = props.rigging ? JSON.parse(JSON.stringify(props.rigging)) : null;
        this.rigContours = props.rigContours ?? false;  // contour discs at bone joints

        // Pin (attach to another object and follow it)
        this.pinnedTo = props.pinnedTo || null;       // ID of parent object
        this.pinOffsetX = props.pinOffsetX ?? 0;      // offset from parent anchor
        this.pinOffsetY = props.pinOffsetY ?? 0;
        this.pinAnchorX = props.pinAnchorX ?? 0.5;    // normalized (0-1) anchor on parent
        this.pinAnchorY = props.pinAnchorY ?? 0.5;
        this.pinTargetType = props.pinTargetType || ((props.pinJointId || props.pinJointName) ? 'joint' : 'anchor');
        this.pinJointId = props.pinJointId || null;
        this.pinJointName = props.pinJointName || null;
        // Rotation mode: 'static' (no rotation), 'inherit' (follow parent), 'independent' (own rotation)
        this.pinRotationMode = props.pinRotationMode || (props.pinInheritRotation ? 'inherit' : 'static');
        this.pinInheritRotation = props.pinInheritRotation ?? false; // kept for compat
        this.pinBaseTiltX = props.pinBaseTiltX ?? 0;
        this.pinBaseTiltY = props.pinBaseTiltY ?? 0;
        this.pinContour = props.pinContour ?? false;             // contour disc at pin connection
        this.pinContourColor = props.pinContourColor || null;    // auto-sampled or user override
        this.pinSyncJoints = props.pinSyncJoints ?? false;       // live-sync parent's joint angles/tilt onto this object
        this._normalizedDownBaseline = props.normalizedDownBaseline === true || props._normalizedDownBaseline === true;

        // Joints (skeletal joints for bending parts of the object)
        this.joints = props.joints ? JSON.parse(JSON.stringify(props.joints)) : [];
        this.jointDirection = StageObject.normalizeJointDirection(props.jointDirection);
        const svgLimb = this._svgCharacterPart && String(this._svgCharacterViewProfileKey || '').startsWith('side')
            && /^(left|right|front|back)-(arm|leg)$/.test(
            this._svgCharacterPremiumPartKey || this._svgCharacterPartKey || '');
        this.jointContours = props.jointContours ?? svgLimb;
        if (svgLimb && props.jointContours == null) {
            this.joints.forEach(joint => {
                joint.contourSize ??= /(?:^|-)(elbow|knee)$/.test(joint.name) ? 1 : 0;
            });
        }
        // Contour style (shared by joint, pin, and rig contours)
        this.contourSize = props.contourSize ?? 1.0;     // scale factor for contour disc radius
        this.contourColor = props.contourColor || null;   // explicit color override (null = auto)
        this.contourFillMode = props.contourFillMode || 'auto'; // auto | solid | pattern | linear-gradient | radial-gradient | picture
        this.contourPatternType = props.contourPatternType || 'stripes';
        this.contourPatternColor = props.contourPatternColor || '#ffffff';
        this.contourPatternScale = props.contourPatternScale ?? 1;
        this.contourGradientStart = props.contourGradientStart || '#ffffff';
        this.contourGradientEnd = props.contourGradientEnd || props.contourColor || '#888888';
        this.contourGradientAngle = props.contourGradientAngle ?? 0;
        this.contourRotation = props.contourRotation ?? 0;  // rotation angle of contour discs (degrees)
        // Joint assembly data (for cutout character assembly system)
        this.jointBaseAngle = props.jointBaseAngle || 0;  // rotation relative to parent in 'joint' pin mode
        this.bodyPartData = props.bodyPartData || null;    // { partKey, charType, jointName, defaultAngle, minAngle, maxAngle }

        // Flex (arc-bending at anchor points)
        this.flexEnabled = props.flexEnabled ?? false;
        this.flexPins = props.flexPins ? JSON.parse(JSON.stringify(props.flexPins)) : [];
        // Each pin: { id, position (0-1 along length), angle (degrees), spread (0.05-1) }
        this.flexDirection = props.flexDirection || 'horizontal'; // axis the object bends along
        this.flexPreserveTexture = props.flexPreserveTexture !== false;
        
        // Load image if needed
        if (this.imageSrc) {
            this.loadImage(this.imageSrc);
        }
        if (this.textureImageSrc) {
            this.loadTextureImage(this.textureImageSrc);
        }
    }

    static normalizeJointDirection(direction) {
        switch (direction) {
            case 'vertical-bt':
                return 'vertical-bt';
            case 'horizontal':
            case 'horizontal-lr':
                return 'horizontal-lr';
            case 'horizontal-rl':
                return 'horizontal-rl';
            case 'vertical':
            case 'vertical-tb':
            default:
                return 'vertical-tb';
        }
    }

    /**
     * Keep SVG African head/neck artwork anchored at the neck while rotating
     * the artwork above it. Older rigs stored the neck as a top-down ratio
     * (about 0.83); the armature renderer uses a bottom-to-top chain here.
     */
    static normalizeSvgAfricanHeadNeckRig(obj, options = {}) {
        if (!obj) return false;
        const partKey = String(
            obj._svgCharacterPremiumPartKey
            || obj._svgCharacterPartKey
            || obj._armatureRoleKey
            || obj._armaturePartKey
            || obj.bodyPartData?.partKey
            || ''
        ).toLowerCase();
        const isSvgAfrican = obj._characterAppearanceProvider === 'svg-african-premium'
            || obj._characterAppearanceProvider === 'svg-african'
            || obj._svgCharacterPremiumPart === true;
        if (options.force !== true && (!isSvgAfrican || partKey !== 'head-neck')) return false;

        const view = String(
            options.view
            || obj._svgCharacterViewProfileKey
            || obj._svgCharacterConfig?.view
            || obj._svgCharacterStyling?.view
            || 'front'
        ).toLowerCase();
        const fallbackPosition = /^side-(left|right)$/.test(view) ? 0.15 : 0.17;
        const joints = Array.isArray(obj.joints) ? obj.joints : [];
        const neck = joints.find(joint => String(joint?.name || '').toLowerCase() === 'neck');
        if (!neck) return false;

        const profilePosition = Number(options.position ?? obj._svgAfricanJointProfile?.neck?.position);
        const jointPosition = Number(neck.position);
        const photographic = obj._svgAfricanJointProfile?.neck?.photographic === true;
        let position = Number.isFinite(profilePosition) ? profilePosition : jointPosition;
        // Convert the legacy top-down coordinate into the canonical distance
        // from the bottom. Values already in the canonical range are retained.
        if (!photographic && position > 0.5) position = 1 - position;
        if (!Number.isFinite(position) || (!photographic && (position < 0.08 || position > 0.30))) {
            position = fallbackPosition;
        }
        position = photographic ? Math.max(.01,Math.min(.99,position)) : Math.max(0.08, Math.min(0.30, position));

        let changed = false;
        if (StageObject.normalizeJointDirection(obj.jointDirection) !== 'vertical-bt') {
            obj.jointDirection = 'vertical-bt';
            changed = true;
        }
        if (!Number.isFinite(jointPosition) || Math.abs(jointPosition - position) > 0.0005) {
            neck.position = position;
            changed = true;
        }
        if (obj.jointContours !== photographic) {
            obj.jointContours = photographic;
            changed = true;
        }
        if (obj.pinContour !== false) {
            obj.pinContour = false;
            changed = true;
        }

        if (obj._svgAfricanJointProfile && typeof obj._svgAfricanJointProfile === 'object') {
            const previous = obj._svgAfricanJointProfile.neck || {};
            if (Math.abs((Number(previous.position) || 0) - position) > 0.0005) {
                obj._svgAfricanJointProfile = {
                    ...obj._svgAfricanJointProfile,
                    neck: { ...previous, position }
                };
                changed = true;
            }
        }
        return changed;
    }

    static normalizeSvgAfricanPremiumHeadNeckRig(obj, options = {}) {
        return StageObject.normalizeSvgAfricanHeadNeckRig(obj, options);
    }

    static normalizeBodyTag(tag = {}) {
        const clamp01 = (value, fallback = 0.5) => {
            const parsed = typeof value === 'number' ? value : parseFloat(value);
            const num = Number.isFinite(parsed) ? parsed : fallback;
            return Math.max(0, Math.min(1, num));
        };
        return {
            id: tag.id || Utils.generateId('btag'),
            key: typeof tag.key === 'string' && tag.key.trim() ? tag.key.trim() : null,
            name: typeof tag.name === 'string' && tag.name.trim() ? tag.name.trim() : 'Body Tag',
            category: typeof tag.category === 'string' && tag.category.trim() ? tag.category.trim() : 'body',
            x: clamp01(tag.x ?? tag.normX, 0.5),
            y: clamp01(tag.y ?? tag.normY, 0.5),
            color: typeof tag.color === 'string' && tag.color.trim() ? tag.color.trim() : null,
            builtIn: tag.builtIn === true,
            sourcePreset: typeof tag.sourcePreset === 'string' && tag.sourcePreset.trim() ? tag.sourcePreset.trim() : null,
            targetPartKey: typeof tag.targetPartKey === 'string' && tag.targetPartKey.trim() ? tag.targetPartKey.trim() : null
        };
    }

    static normalizeBodyTagList(tags) {
        return Array.isArray(tags) ? tags.map(tag => StageObject.normalizeBodyTag(tag)) : [];
    }

    static getJointDirectionMeta(direction) {
        const value = StageObject.normalizeJointDirection(direction);
        return {
            value,
            isVertical: value.startsWith('vertical'),
            isReverse: value === 'vertical-bt' || value === 'horizontal-rl'
        };
    }

    static getTypeDisplayName(type) {
        const labels = {
            roundedRectangle: 'Rounded Rectangle',
            parallelogram: 'Parallelogram',
            trapezium: 'Trapezium',
            hexagon: 'Hexagon',
            heptagon: 'Heptagon',
            pie: 'Pie',
            chord: 'Chord',
            teardrop: 'Teardrop',
            lShape: 'L-Shape',
            can: 'Can',
            plaque: 'Plaque',
            cube: 'Cube',
            doughnut: 'Doughnut',
            blockArc: 'Block Arc',
            brace: 'Brace',
            bracket: 'Bracket',
            bentArrow: 'Bent Arrow',
            uTurnArrow: 'U-Turn Arrow',
            quadArrow: 'Quad Arrow',
            upDownArrow: 'Up-Down Arrow',
            upArrowCallout: 'Up Arrow Callout',
            elbowArrowConnector: 'Elbow Arrow Connector'
        };
        return labels[type] || `${type.charAt(0).toUpperCase()}${type.slice(1)}`;
    }

    static getCustomShapeTypes() {
        return [
            'roundedRectangle',
            'parallelogram',
            'trapezium',
            'hexagon',
            'heptagon',
            'pie',
            'chord',
            'teardrop',
            'lShape',
            'can',
            'plaque',
            'cube',
            'doughnut',
            'blockArc',
            'brace',
            'bracket',
            'bentArrow',
            'uTurnArrow',
            'quadArrow',
            'upDownArrow',
            'upArrowCallout',
            'elbowArrowConnector'
        ];
    }

    static isCustomShapeType(type) {
        return StageObject.getCustomShapeTypes().includes(type);
    }

    static _getShapeFrame(obj, centered = false) {
        const width = Math.abs(obj.width || 0);
        const height = Math.abs(obj.height || 0);
        const x = centered ? -(width / 2) : Math.min(obj.x, obj.x + (obj.width || 0));
        const y = centered ? -(height / 2) : Math.min(obj.y, obj.y + (obj.height || 0));
        return {
            x,
            y,
            w: width,
            h: height,
            cx: x + width / 2,
            cy: y + height / 2
        };
    }

    static _polygonPath(points) {
        if (!points.length) return '';
        return points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`).join(' ') + ' Z';
    }

    static _regularPolygonPoints(cx, cy, rx, ry, sides, rotation = -Math.PI / 2) {
        const points = [];
        for (let i = 0; i < sides; i++) {
            const angle = rotation + (i * Math.PI * 2 / sides);
            points.push({ x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) });
        }
        return points;
    }

    static _ellipsePath(cx, cy, rx, ry, clockwise = true) {
        const sweep = clockwise ? 0 : 1;
        return `M${cx - rx} ${cy} A${rx} ${ry} 0 1 ${sweep} ${cx + rx} ${cy} A${rx} ${ry} 0 1 ${sweep} ${cx - rx} ${cy}`;
    }

    static _ellipsePoint(cx, cy, rx, ry, angle) {
        return { x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) };
    }

    static _clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    static getDefaultShapeProperty(type, prop) {
        const defaults = {
            innerRadius: {
                star: 0.4,
                doughnut: 0.55,
                blockArc: 0.6
            },
            shapeStartAngle: {
                pie: -115,
                chord: -148,
                blockArc: -158
            },
            shapeSweepAngle: {
                pie: 160,
                chord: 180,
                blockArc: 180
            },
            arrowShaftWidth: {
                bentArrow: 0.22,
                uTurnArrow: 0.22,
                quadArrow: 0.22,
                upDownArrow: 0.36,
                upArrowCallout: 0.44,
                elbowArrowConnector: 0.18
            },
            arrowHeadLength: {
                bentArrow: 0.28,
                uTurnArrow: 0.3,
                quadArrow: 0.24,
                upDownArrow: 0.22,
                upArrowCallout: 0.3,
                elbowArrowConnector: 0.18
            }
        };
        return defaults[prop]?.[type] ?? null;
    }

    static getShapeControlDefaults(type) {
        switch (type) {
            case 'star':
                return { sides: 5, innerRadius: StageObject.getDefaultShapeProperty(type, 'innerRadius') ?? 0.4 };
            case 'polygon':
                return { sides: 5 };
            case 'doughnut':
                return { innerRadius: StageObject.getDefaultShapeProperty(type, 'innerRadius') ?? 0.55 };
            case 'pie':
            case 'chord':
                return {
                    shapeStartAngle: StageObject.getDefaultShapeProperty(type, 'shapeStartAngle') ?? -90,
                    shapeSweepAngle: StageObject.getDefaultShapeProperty(type, 'shapeSweepAngle') ?? 180
                };
            case 'blockArc':
                return {
                    innerRadius: StageObject.getDefaultShapeProperty(type, 'innerRadius') ?? 0.6,
                    shapeStartAngle: StageObject.getDefaultShapeProperty(type, 'shapeStartAngle') ?? -90,
                    shapeSweepAngle: StageObject.getDefaultShapeProperty(type, 'shapeSweepAngle') ?? 180
                };
            case 'bentArrow':
            case 'uTurnArrow':
            case 'quadArrow':
            case 'upDownArrow':
            case 'upArrowCallout':
            case 'elbowArrowConnector':
                return {
                    arrowShaftWidth: StageObject.getDefaultShapeProperty(type, 'arrowShaftWidth'),
                    arrowHeadLength: StageObject.getDefaultShapeProperty(type, 'arrowHeadLength')
                };
            default:
                return null;
        }
    }

    static hasAdjustableShapeControls(type) {
        return !!StageObject.getShapeControlDefaults(type);
    }

    static _getInnerRadiusRatio(obj) {
        return StageObject._clamp(
            obj.innerRadius ?? StageObject.getDefaultShapeProperty(obj.type, 'innerRadius') ?? 0.4,
            0.1,
            0.9
        );
    }

    static _getSweepConfig(obj) {
        const startDeg = obj.shapeStartAngle ?? StageObject.getDefaultShapeProperty(obj.type, 'shapeStartAngle') ?? -90;
        const sweepDeg = StageObject._clamp(
            obj.shapeSweepAngle ?? StageObject.getDefaultShapeProperty(obj.type, 'shapeSweepAngle') ?? 180,
            10,
            359
        );
        const start = Utils.degToRad(startDeg);
        const sweep = Utils.degToRad(sweepDeg);
        return {
            start,
            sweep,
            end: start + sweep,
            largeArc: sweepDeg > 180 ? 1 : 0,
            startDeg,
            sweepDeg
        };
    }

    static getCustomShapePathData(obj, centered = false) {
        const { x, y, w, h, cx, cy } = StageObject._getShapeFrame(obj, centered);
        const rx = w / 2;
        const ry = h / 2;
        const minDim = Math.min(w, h);

        switch (obj.type) {
            case 'roundedRectangle': {
                const r = Math.min(Math.max(obj.borderRadius || minDim * 0.2, 8), w / 2, h / 2);
                return `M${x + r} ${y} L${x + w - r} ${y} Q${x + w} ${y} ${x + w} ${y + r} L${x + w} ${y + h - r} Q${x + w} ${y + h} ${x + w - r} ${y + h} L${x + r} ${y + h} Q${x} ${y + h} ${x} ${y + h - r} L${x} ${y + r} Q${x} ${y} ${x + r} ${y} Z`;
            }
            case 'parallelogram': {
                const skew = w * 0.22;
                return StageObject._polygonPath([
                    { x: x + skew, y },
                    { x: x + w, y },
                    { x: x + w - skew, y: y + h },
                    { x, y: y + h }
                ]);
            }
            case 'trapezium': {
                const inset = w * 0.18;
                return StageObject._polygonPath([
                    { x: x + inset, y },
                    { x: x + w - inset, y },
                    { x: x + w, y: y + h },
                    { x, y: y + h }
                ]);
            }
            case 'hexagon':
                return StageObject._polygonPath([
                    { x: x + w * 0.25, y },
                    { x: x + w * 0.75, y },
                    { x: x + w, y: y + h * 0.5 },
                    { x: x + w * 0.75, y: y + h },
                    { x: x + w * 0.25, y: y + h },
                    { x, y: y + h * 0.5 }
                ]);
            case 'heptagon':
                return StageObject._polygonPath(StageObject._regularPolygonPoints(cx, cy, rx, ry, 7));
            case 'pie': {
                    const { start, end, largeArc } = StageObject._getSweepConfig(obj);
                const startPt = StageObject._ellipsePoint(cx, cy, rx, ry, start);
                const endPt = StageObject._ellipsePoint(cx, cy, rx, ry, end);
                    return `M${cx} ${cy} L${startPt.x} ${startPt.y} A${rx} ${ry} 0 ${largeArc} 1 ${endPt.x} ${endPt.y} Z`;
            }
            case 'chord': {
                    const { start, end, largeArc } = StageObject._getSweepConfig(obj);
                const startPt = StageObject._ellipsePoint(cx, cy, rx, ry, start);
                const endPt = StageObject._ellipsePoint(cx, cy, rx, ry, end);
                    return `M${startPt.x} ${startPt.y} A${rx} ${ry} 0 ${largeArc} 1 ${endPt.x} ${endPt.y} Z`;
            }
            case 'teardrop':
                return `M${cx} ${y + h} C${x + w * 0.86} ${y + h * 0.72} ${x + w * 0.92} ${y + h * 0.2} ${cx} ${y} C${x + w * 0.08} ${y + h * 0.2} ${x + w * 0.14} ${y + h * 0.72} ${cx} ${y + h} Z`;
            case 'lShape': {
                const t = minDim * 0.38;
                return StageObject._polygonPath([
                    { x, y },
                    { x: x + w, y },
                    { x: x + w, y: y + t },
                    { x: x + t, y: y + t },
                    { x: x + t, y: y + h },
                    { x, y: y + h }
                ]);
            }
            case 'can': {
                const lip = Math.max(h * 0.12, 6);
                const top = y + lip;
                const bottom = y + h - lip;
                return [
                    `M${x} ${top}`,
                    `C${x} ${y + lip * 0.15} ${x + w} ${y + lip * 0.15} ${x + w} ${top}`,
                    `L${x + w} ${bottom}`,
                    `C${x + w} ${y + h + lip * 0.15} ${x} ${y + h + lip * 0.15} ${x} ${bottom}`,
                    'Z',
                    `M${x} ${top}`,
                    `C${x} ${y - lip * 0.7} ${x + w} ${y - lip * 0.7} ${x + w} ${top}`,
                    `C${x + w} ${y + lip * 1.7} ${x} ${y + lip * 1.7} ${x} ${top}`
                ].join(' ');
            }
            case 'plaque': {
                const cutX = w * 0.12;
                const cutY = h * 0.18;
                return StageObject._polygonPath([
                    { x: x + cutX, y },
                    { x: x + w - cutX, y },
                    { x: x + w, y: y + cutY },
                    { x: x + w, y: y + h - cutY },
                    { x: x + w - cutX, y: y + h },
                    { x: x + cutX, y: y + h },
                    { x, y: y + h - cutY },
                    { x, y: y + cutY }
                ]);
            }
            case 'cube': {
                const a = { x: x + w * 0.22, y: y + h * 0.22 };
                const b = { x: x + w * 0.72, y };
                const c = { x: x + w, y: y + h * 0.22 };
                const d = { x: x + w * 0.5, y: y + h * 0.44 };
                const e = { x: x + w * 0.5, y: y + h };
                const f = { x, y: y + h * 0.78 };
                const g = { x: x + w, y: y + h * 0.78 };
                return `${StageObject._polygonPath([a, b, c, g, e, f])} M${a.x} ${a.y} L${d.x} ${d.y} L${c.x} ${c.y} M${d.x} ${d.y} L${e.x} ${e.y}`;
            }
            case 'doughnut': {
                const innerRatio = StageObject._getInnerRadiusRatio(obj);
                const innerRx = rx * innerRatio;
                const innerRy = ry * innerRatio;
                return `${StageObject._ellipsePath(cx, cy, rx, ry, true)} ${StageObject._ellipsePath(cx, cy, innerRx, innerRy, false)} Z`;
            }
            case 'blockArc': {
                const { start, end, largeArc } = StageObject._getSweepConfig(obj);
                const innerRatio = StageObject._getInnerRadiusRatio(obj);
                const innerRx = rx * innerRatio;
                const innerRy = ry * innerRatio;
                const outerStart = StageObject._ellipsePoint(cx, cy, rx, ry, start);
                const outerEnd = StageObject._ellipsePoint(cx, cy, rx, ry, end);
                const innerEnd = StageObject._ellipsePoint(cx, cy, innerRx, innerRy, end);
                const innerStart = StageObject._ellipsePoint(cx, cy, innerRx, innerRy, start);
                return `M${outerStart.x} ${outerStart.y} A${rx} ${ry} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y} L${innerEnd.x} ${innerEnd.y} A${innerRx} ${innerRy} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y} Z`;
            }
            case 'brace': {
                const inset = w * 0.4;
                const t = Math.max(w * 0.16, 8);
                return `M${x + w} ${y} Q${x + inset} ${y} ${x + inset} ${y + h * 0.2} Q${x + inset} ${y + h * 0.38} ${x} ${y + h * 0.44} L${x} ${y + h * 0.56} Q${x + inset} ${y + h * 0.62} ${x + inset} ${y + h * 0.8} Q${x + inset} ${y + h} ${x + w} ${y + h} L${x + w - t} ${y + h} Q${x + inset + t * 0.3} ${y + h} ${x + inset + t * 0.3} ${y + h * 0.78} Q${x + inset + t * 0.3} ${y + h * 0.62} ${x + t} ${y + h * 0.56} L${x + t} ${y + h * 0.44} Q${x + inset + t * 0.3} ${y + h * 0.38} ${x + inset + t * 0.3} ${y + h * 0.22} Q${x + inset + t * 0.3} ${y} ${x + w - t} ${y} Z`;
            }
            case 'bracket': {
                return StageObject._polygonPath([
                    { x: x + w, y },
                    { x: x + w * 0.24, y },
                    { x: x + w * 0.24, y: y + h * 0.14 },
                    { x: x + w * 0.72, y: y + h * 0.14 },
                    { x: x + w * 0.72, y: y + h * 0.86 },
                    { x: x + w * 0.24, y: y + h * 0.86 },
                    { x: x + w * 0.24, y: y + h },
                    { x: x + w, y: y + h },
                    { x: x + w, y: y + h * 0.84 },
                    { x: x + w * 0.42, y: y + h * 0.84 },
                    { x: x + w * 0.42, y: y + h * 0.16 },
                    { x: x + w, y: y + h * 0.16 }
                ]);
            }
            case 'bentArrow': {
                const shaft = StageObject._clamp((obj.arrowShaftWidth ?? StageObject.getDefaultShapeProperty(obj.type, 'arrowShaftWidth') ?? 0.22) * minDim, minDim * 0.12, minDim * 0.45);
                const head = StageObject._clamp((obj.arrowHeadLength ?? StageObject.getDefaultShapeProperty(obj.type, 'arrowHeadLength') ?? 0.28) * Math.min(w, h), minDim * 0.18, Math.min(w, h) * 0.48);
                const midY = cy;
                return StageObject._polygonPath([
                    { x: x + shaft, y: y + h },
                    { x: x + shaft, y: midY + shaft / 2 },
                    { x: x + w - head, y: midY + shaft / 2 },
                    { x: x + w - head, y: midY + head / 2 },
                    { x: x + w, y: midY },
                    { x: x + w - head, y: midY - head / 2 },
                    { x: x + w - head, y: midY - shaft / 2 },
                    { x, y: midY - shaft / 2 },
                    { x, y: y + h }
                ]);
            }
            case 'uTurnArrow': {
                const shaft = StageObject._clamp((obj.arrowShaftWidth ?? StageObject.getDefaultShapeProperty(obj.type, 'arrowShaftWidth') ?? 0.22) * minDim, minDim * 0.12, minDim * 0.4);
                const head = StageObject._clamp((obj.arrowHeadLength ?? StageObject.getDefaultShapeProperty(obj.type, 'arrowHeadLength') ?? 0.3) * Math.min(w, h), minDim * 0.18, Math.min(w, h) * 0.48);
                const turnY = y + head;
                return StageObject._polygonPath([
                    { x: x + w - shaft, y: y + h },
                    { x: x + w - shaft, y: turnY },
                    { x: x + head, y: turnY },
                    { x: x + head, y },
                    { x, y: y + h * 0.34 },
                    { x: x + head, y: y + h * 0.68 },
                    { x: x + head, y: turnY + shaft },
                    { x: x + w, y: turnY + shaft },
                    { x: x + w, y: y + h }
                ]);
            }
            case 'quadArrow': {
                const shaft = StageObject._clamp((obj.arrowShaftWidth ?? StageObject.getDefaultShapeProperty(obj.type, 'arrowShaftWidth') ?? 0.22) * minDim, minDim * 0.12, minDim * 0.38);
                const head = StageObject._clamp((obj.arrowHeadLength ?? StageObject.getDefaultShapeProperty(obj.type, 'arrowHeadLength') ?? 0.24) * minDim, minDim * 0.16, minDim * 0.34);
                return StageObject._polygonPath([
                    { x: cx, y },
                    { x: cx + head / 2, y: y + head },
                    { x: cx + shaft / 2, y: y + head },
                    { x: cx + shaft / 2, y: cy - shaft / 2 },
                    { x: x + w - head, y: cy - shaft / 2 },
                    { x: x + w - head, y: cy - head / 2 },
                    { x: x + w, y: cy },
                    { x: x + w - head, y: cy + head / 2 },
                    { x: x + w - head, y: cy + shaft / 2 },
                    { x: cx + shaft / 2, y: cy + shaft / 2 },
                    { x: cx + shaft / 2, y: y + h - head },
                    { x: cx + head / 2, y: y + h - head },
                    { x: cx, y: y + h },
                    { x: cx - head / 2, y: y + h - head },
                    { x: cx - shaft / 2, y: y + h - head },
                    { x: cx - shaft / 2, y: cy + shaft / 2 },
                    { x: x + head, y: cy + shaft / 2 },
                    { x: x + head, y: cy + head / 2 },
                    { x, y: cy },
                    { x: x + head, y: cy - head / 2 },
                    { x: x + head, y: cy - shaft / 2 },
                    { x: cx - shaft / 2, y: cy - shaft / 2 },
                    { x: cx - shaft / 2, y: y + head },
                    { x: cx - head / 2, y: y + head }
                ]);
            }
            case 'upDownArrow': {
                const shaft = StageObject._clamp((obj.arrowShaftWidth ?? StageObject.getDefaultShapeProperty(obj.type, 'arrowShaftWidth') ?? 0.36) * w, w * 0.16, w * 0.68);
                const head = StageObject._clamp((obj.arrowHeadLength ?? StageObject.getDefaultShapeProperty(obj.type, 'arrowHeadLength') ?? 0.22) * h, h * 0.14, h * 0.32);
                return StageObject._polygonPath([
                    { x: cx, y },
                    { x: x + w, y: y + head },
                    { x: cx + shaft / 2, y: y + head },
                    { x: cx + shaft / 2, y: y + h - head },
                    { x: x + w, y: y + h - head },
                    { x: cx, y: y + h },
                    { x, y: y + h - head },
                    { x: cx - shaft / 2, y: y + h - head },
                    { x: cx - shaft / 2, y: y + head },
                    { x, y: y + head }
                ]);
            }
            case 'upArrowCallout': {
                const head = StageObject._clamp((obj.arrowHeadLength ?? StageObject.getDefaultShapeProperty(obj.type, 'arrowHeadLength') ?? 0.3) * h, h * 0.16, h * 0.38);
                const stemWidth = StageObject._clamp((obj.arrowShaftWidth ?? StageObject.getDefaultShapeProperty(obj.type, 'arrowShaftWidth') ?? 0.44) * w, w * 0.18, w * 0.72);
                const bodyTop = y + head;
                const bodyRadius = Math.min(w, h) * 0.08;
                return `M${cx} ${y} L${cx + stemWidth / 2} ${bodyTop} L${x + w - bodyRadius} ${bodyTop} Q${x + w} ${bodyTop} ${x + w} ${bodyTop + bodyRadius} L${x + w} ${y + h - bodyRadius} Q${x + w} ${y + h} ${x + w - bodyRadius} ${y + h} L${x + bodyRadius} ${y + h} Q${x} ${y + h} ${x} ${y + h - bodyRadius} L${x} ${bodyTop + bodyRadius} Q${x} ${bodyTop} ${x + bodyRadius} ${bodyTop} L${cx - stemWidth / 2} ${bodyTop} Z`;
            }
            case 'elbowArrowConnector': {
                const t = StageObject._clamp((obj.arrowShaftWidth ?? StageObject.getDefaultShapeProperty(obj.type, 'arrowShaftWidth') ?? 0.18) * minDim, 8, minDim * 0.34);
                const head = StageObject._clamp((obj.arrowHeadLength ?? StageObject.getDefaultShapeProperty(obj.type, 'arrowHeadLength') ?? 0.18) * minDim, 8, minDim * 0.28);
                const midY = y + h * 0.4;
                return StageObject._polygonPath([
                    { x, y: y + h },
                    { x: x + t, y: y + h },
                    { x: x + t, y: midY + t / 2 },
                    { x: x + w - head, y: midY + t / 2 },
                    { x: x + w - head, y: midY + head / 2 },
                    { x: x + w, y: midY },
                    { x: x + w - head, y: midY - head / 2 },
                    { x: x + w - head, y: midY - t / 2 },
                    { x, y: midY - t / 2 }
                ]);
            }
            default:
                return '';
        }
    }

    static drawCustomShape(ctx, obj, centered = false) {
        const pathData = StageObject.getCustomShapePathData(obj, centered);
        if (!pathData) return false;
        const path = new Path2D(pathData);
        ctx.fill(path);
        if ((obj.strokeWidth || 0) > 0) ctx.stroke(path);
        return true;
    }

    static getCustomShapePoints(obj, centered = false) {
        const { x, y, w, h, cx, cy } = StageObject._getShapeFrame(obj, centered);
        const rx = w / 2;
        const ry = h / 2;

        switch (obj.type) {
            case 'roundedRectangle': {
                const r = Math.min(Math.max(obj.borderRadius || Math.min(w, h) * 0.2, 8), w / 2, h / 2);
                const points = [];
                const corners = [
                    { ox: x + w - r, oy: y + r, start: -Math.PI / 2, end: 0 },
                    { ox: x + w - r, oy: y + h - r, start: 0, end: Math.PI / 2 },
                    { ox: x + r, oy: y + h - r, start: Math.PI / 2, end: Math.PI },
                    { ox: x + r, oy: y + r, start: Math.PI, end: Math.PI * 1.5 }
                ];
                corners.forEach((corner, cornerIndex) => {
                    for (let i = 0; i < 5; i++) {
                        if (cornerIndex > 0 && i === 0) continue;
                        const angle = corner.start + ((corner.end - corner.start) * i / 4);
                        points.push({ x: corner.ox + r * Math.cos(angle), y: corner.oy + r * Math.sin(angle) });
                    }
                });
                return points;
            }
            case 'parallelogram':
                return [{ x: x + w * 0.22, y }, { x: x + w, y }, { x: x + w * 0.78, y: y + h }, { x, y: y + h }];
            case 'trapezium':
                return [{ x: x + w * 0.18, y }, { x: x + w * 0.82, y }, { x: x + w, y: y + h }, { x, y: y + h }];
            case 'hexagon':
                return [{ x: x + w * 0.25, y }, { x: x + w * 0.75, y }, { x: x + w, y: y + h * 0.5 }, { x: x + w * 0.75, y: y + h }, { x: x + w * 0.25, y: y + h }, { x, y: y + h * 0.5 }];
            case 'heptagon':
                return StageObject._regularPolygonPoints(cx, cy, rx, ry, 7);
            case 'pie': {
                const { start, sweep } = StageObject._getSweepConfig(obj);
                const steps = Math.max(10, Math.ceil(Math.abs(sweep) / (Math.PI / 12)));
                return [{ x: cx, y: cy }, ...Array.from({ length: steps + 1 }, (_, i) => StageObject._ellipsePoint(cx, cy, rx, ry, start + (sweep * i / steps)))];
            }
            case 'chord': {
                const { start, sweep } = StageObject._getSweepConfig(obj);
                const steps = Math.max(12, Math.ceil(Math.abs(sweep) / (Math.PI / 14)));
                return Array.from({ length: steps + 1 }, (_, i) => StageObject._ellipsePoint(cx, cy, rx, ry, start + (sweep * i / steps)));
            }
            case 'teardrop': {
                const points = [];
                const steps = 14;
                for (let i = 0; i <= steps; i++) {
                    const t = i / steps;
                    const mt = 1 - t;
                    const p0 = { x: cx, y: y + h };
                    const p1 = { x: x + w * 0.86, y: y + h * 0.72 };
                    const p2 = { x: x + w * 0.92, y: y + h * 0.2 };
                    const p3 = { x: cx, y };
                    points.push({
                        x: mt*mt*mt*p0.x + 3*mt*mt*t*p1.x + 3*mt*t*t*p2.x + t*t*t*p3.x,
                        y: mt*mt*mt*p0.y + 3*mt*mt*t*p1.y + 3*mt*t*t*p2.y + t*t*t*p3.y
                    });
                }
                for (let i = steps; i >= 0; i--) {
                    const t = i / steps;
                    const mt = 1 - t;
                    const p0 = { x: cx, y };
                    const p1 = { x: x + w * 0.08, y: y + h * 0.2 };
                    const p2 = { x: x + w * 0.14, y: y + h * 0.72 };
                    const p3 = { x: cx, y: y + h };
                    points.push({
                        x: mt*mt*mt*p0.x + 3*mt*mt*t*p1.x + 3*mt*t*t*p2.x + t*t*t*p3.x,
                        y: mt*mt*mt*p0.y + 3*mt*mt*t*p1.y + 3*mt*t*t*p2.y + t*t*t*p3.y
                    });
                }
                return points;
            }
            case 'lShape':
                return [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h * 0.38 }, { x: x + w * 0.38, y: y + h * 0.38 }, { x: x + w * 0.38, y: y + h }, { x, y: y + h }];
            case 'can': {
                const lip = Math.max(h * 0.12, 6);
                const points = [];
                for (let i = 0; i <= 12; i++) {
                    const angle = Math.PI + (Math.PI * i / 12);
                    points.push({ x: cx + rx * Math.cos(angle), y: y + lip + lip * 0.85 * Math.sin(angle) });
                }
                points.push({ x: x + w, y: y + h - lip });
                for (let i = 0; i <= 12; i++) {
                    const angle = Math.PI * i / 12;
                    points.push({ x: cx + rx * Math.cos(angle), y: y + h - lip + lip * 0.85 * Math.sin(angle) });
                }
                points.push({ x, y: y + lip });
                return points;
            }
            case 'plaque':
                return [{ x: x + w * 0.12, y }, { x: x + w * 0.88, y }, { x: x + w, y: y + h * 0.18 }, { x: x + w, y: y + h * 0.82 }, { x: x + w * 0.88, y: y + h }, { x: x + w * 0.12, y: y + h }, { x, y: y + h * 0.82 }, { x, y: y + h * 0.18 }];
            case 'cube':
                return [{ x: x + w * 0.22, y: y + h * 0.22 }, { x: x + w * 0.72, y }, { x: x + w, y: y + h * 0.22 }, { x: x + w, y: y + h * 0.78 }, { x: x + w * 0.5, y: y + h }, { x, y: y + h * 0.78 }];
            case 'doughnut':
                return Array.from({ length: 28 }, (_, i) => StageObject._ellipsePoint(cx, cy, rx, ry, i * Math.PI * 2 / 28));
            case 'blockArc': {
                const { start, sweep } = StageObject._getSweepConfig(obj);
                const innerRatio = StageObject._getInnerRadiusRatio(obj);
                const steps = Math.max(12, Math.ceil(Math.abs(sweep) / (Math.PI / 14)));
                const outer = Array.from({ length: steps + 1 }, (_, i) => StageObject._ellipsePoint(cx, cy, rx, ry, start + (sweep * i / steps)));
                const inner = Array.from({ length: steps + 1 }, (_, i) => StageObject._ellipsePoint(cx, cy, rx * innerRatio, ry * innerRatio, start + sweep - (sweep * i / steps)));
                return [...outer, ...inner];
            }
            case 'brace':
                return [{ x: x + w, y }, { x: x + w * 0.45, y }, { x: x + w * 0.45, y: y + h * 0.22 }, { x, y: y + h * 0.44 }, { x, y: y + h * 0.56 }, { x: x + w * 0.45, y: y + h * 0.78 }, { x: x + w * 0.45, y: y + h }, { x: x + w, y: y + h }, { x: x + w * 0.78, y: y + h }, { x: x + w * 0.52, y: y + h * 0.8 }, { x: x + w * 0.18, y: y + h * 0.56 }, { x: x + w * 0.18, y: y + h * 0.44 }, { x: x + w * 0.52, y: y + h * 0.2 }, { x: x + w * 0.78, y }];
            case 'bracket':
                return [{ x: x + w, y }, { x: x + w * 0.24, y }, { x: x + w * 0.24, y: y + h * 0.14 }, { x: x + w * 0.72, y: y + h * 0.14 }, { x: x + w * 0.72, y: y + h * 0.86 }, { x: x + w * 0.24, y: y + h * 0.86 }, { x: x + w * 0.24, y: y + h }, { x: x + w, y: y + h }, { x: x + w, y: y + h * 0.84 }, { x: x + w * 0.42, y: y + h * 0.84 }, { x: x + w * 0.42, y: y + h * 0.16 }, { x: x + w, y: y + h * 0.16 }];
            case 'bentArrow': {
                const shaft = StageObject._clamp((obj.arrowShaftWidth ?? StageObject.getDefaultShapeProperty(obj.type, 'arrowShaftWidth') ?? 0.22) * minDim, minDim * 0.12, minDim * 0.45);
                const head = StageObject._clamp((obj.arrowHeadLength ?? StageObject.getDefaultShapeProperty(obj.type, 'arrowHeadLength') ?? 0.28) * Math.min(w, h), minDim * 0.18, Math.min(w, h) * 0.48);
                return [{ x: x + shaft, y: y + h }, { x: x + shaft, y: cy + shaft / 2 }, { x: x + w - head, y: cy + shaft / 2 }, { x: x + w - head, y: cy + head / 2 }, { x: x + w, y: cy }, { x: x + w - head, y: cy - head / 2 }, { x: x + w - head, y: cy - shaft / 2 }, { x, y: cy - shaft / 2 }, { x, y: y + h }];
            }
            case 'uTurnArrow': {
                const shaft = StageObject._clamp((obj.arrowShaftWidth ?? StageObject.getDefaultShapeProperty(obj.type, 'arrowShaftWidth') ?? 0.22) * minDim, minDim * 0.12, minDim * 0.4);
                const head = StageObject._clamp((obj.arrowHeadLength ?? StageObject.getDefaultShapeProperty(obj.type, 'arrowHeadLength') ?? 0.3) * Math.min(w, h), minDim * 0.18, Math.min(w, h) * 0.48);
                const turnY = y + head;
                return [{ x: x + w - shaft, y: y + h }, { x: x + w - shaft, y: turnY }, { x: x + head, y: turnY }, { x: x + head, y }, { x, y: y + h * 0.34 }, { x: x + head, y: y + h * 0.68 }, { x: x + head, y: turnY + shaft }, { x: x + w, y: turnY + shaft }, { x: x + w, y: y + h }];
            }
            case 'quadArrow': {
                const shaft = StageObject._clamp((obj.arrowShaftWidth ?? StageObject.getDefaultShapeProperty(obj.type, 'arrowShaftWidth') ?? 0.22) * minDim, minDim * 0.12, minDim * 0.38);
                const head = StageObject._clamp((obj.arrowHeadLength ?? StageObject.getDefaultShapeProperty(obj.type, 'arrowHeadLength') ?? 0.24) * minDim, minDim * 0.16, minDim * 0.34);
                return [{ x: cx, y }, { x: cx + head / 2, y: y + head }, { x: cx + shaft / 2, y: y + head }, { x: cx + shaft / 2, y: cy - shaft / 2 }, { x: x + w - head, y: cy - shaft / 2 }, { x: x + w - head, y: cy - head / 2 }, { x: x + w, y: cy }, { x: x + w - head, y: cy + head / 2 }, { x: x + w - head, y: cy + shaft / 2 }, { x: cx + shaft / 2, y: cy + shaft / 2 }, { x: cx + shaft / 2, y: y + h - head }, { x: cx + head / 2, y: y + h - head }, { x: cx, y: y + h }, { x: cx - head / 2, y: y + h - head }, { x: cx - shaft / 2, y: y + h - head }, { x: cx - shaft / 2, y: cy + shaft / 2 }, { x: x + head, y: cy + shaft / 2 }, { x: x + head, y: cy + head / 2 }, { x, y: cy }, { x: x + head, y: cy - head / 2 }, { x: x + head, y: cy - shaft / 2 }, { x: cx - shaft / 2, y: cy - shaft / 2 }, { x: cx - shaft / 2, y: y + head }, { x: cx - head / 2, y: y + head }];
            }
            case 'upDownArrow': {
                const shaft = StageObject._clamp((obj.arrowShaftWidth ?? StageObject.getDefaultShapeProperty(obj.type, 'arrowShaftWidth') ?? 0.36) * w, w * 0.16, w * 0.68);
                const head = StageObject._clamp((obj.arrowHeadLength ?? StageObject.getDefaultShapeProperty(obj.type, 'arrowHeadLength') ?? 0.22) * h, h * 0.14, h * 0.32);
                return [{ x: cx, y }, { x: x + w, y: y + head }, { x: cx + shaft / 2, y: y + head }, { x: cx + shaft / 2, y: y + h - head }, { x: x + w, y: y + h - head }, { x: cx, y: y + h }, { x, y: y + h - head }, { x: cx - shaft / 2, y: y + h - head }, { x: cx - shaft / 2, y: y + head }, { x, y: y + head }];
            }
            case 'upArrowCallout': {
                const head = StageObject._clamp((obj.arrowHeadLength ?? StageObject.getDefaultShapeProperty(obj.type, 'arrowHeadLength') ?? 0.3) * h, h * 0.16, h * 0.38);
                const stemWidth = StageObject._clamp((obj.arrowShaftWidth ?? StageObject.getDefaultShapeProperty(obj.type, 'arrowShaftWidth') ?? 0.44) * w, w * 0.18, w * 0.72);
                return [{ x: cx, y }, { x: cx + stemWidth / 2, y: y + head }, { x: x + w, y: y + head }, { x: x + w, y: y + h }, { x, y: y + h }, { x, y: y + head }, { x: cx - stemWidth / 2, y: y + head }];
            }
            case 'elbowArrowConnector': {
                const shaft = StageObject._clamp((obj.arrowShaftWidth ?? StageObject.getDefaultShapeProperty(obj.type, 'arrowShaftWidth') ?? 0.18) * minDim, 8, minDim * 0.34);
                const head = StageObject._clamp((obj.arrowHeadLength ?? StageObject.getDefaultShapeProperty(obj.type, 'arrowHeadLength') ?? 0.18) * minDim, 8, minDim * 0.28);
                const midY = y + h * 0.4;
                return [{ x, y: y + h }, { x: x + shaft, y: y + h }, { x: x + shaft, y: midY + shaft / 2 }, { x: x + w - head, y: midY + shaft / 2 }, { x: x + w - head, y: midY + head / 2 }, { x: x + w, y: midY }, { x: x + w - head, y: midY - head / 2 }, { x: x + w - head, y: midY - shaft / 2 }, { x, y: midY - shaft / 2 }];
            }
            default:
                return [];
        }
    }

    loadImage(src, options = {}) {
        const requestId = (this._imageLoadRequestId || 0) + 1;
        this._imageLoadRequestId = requestId;
        const preserveDimensions = options.preserveDimensions === true
            || !!this.sceneAsset
            || this._svgCharacterPart === true
            || this._svgCharacterPremiumPart === true;
        const cacheSvg = typeof src === 'string' && src.startsWith('data:image/svg+xml')
            && (this._svgCharacterPart === true || this._svgCharacterPremiumPart === true || this._svgAfricanGarmentLayer === true);
        if (cacheSvg && !(this._svgDecodedImageCache instanceof Map)) this._svgDecodedImageCache = new Map();
        let cachedImage = cacheSvg ? this._svgDecodedImageCache.get(src) : null;
        if (cachedImage && (!cachedImage.complete || !cachedImage.naturalWidth || cachedImage.src !== src)) cachedImage = null;
        const img = cachedImage || new Image();
        let handled = false;
        const handleLoad = () => {
            // A view switch may queue several SVG data URLs in the same tick.
            // Only the newest request is allowed to become the displayed artwork.
            if (handled || this._imageLoadRequestId !== requestId) return;
            handled = true;
            if (cacheSvg) {
                // Timeline restore/view tracks revisit these immutable data URLs each frame.
                this._svgDecodedImageCache.delete(src);
                this._svgDecodedImageCache.set(src, img);
                while (this._svgDecodedImageCache.size > 4) this._svgDecodedImageCache.delete(this._svgDecodedImageCache.keys().next().value);
            }
            this.imageElement = img;
            if (!preserveDimensions && (!this.width || this.width === 100)) {
                this.width = img.naturalWidth;
                this.height = img.naturalHeight;
                // Scale to fit if too large
                const maxDim = 400;
                if (this.width > maxDim || this.height > maxDim) {
                    const scale = maxDim / Math.max(this.width, this.height);
                    this.width *= scale;
                    this.height *= scale;
                }
            }
            // Decode animated GIF frames if applicable
            if (src && src.startsWith('data:image/gif')) {
                this._tryDecodeGif(src);
            } else if (src && (this.isAnimatedGif || /\.gif(?:$|[?#])/i.test(src))) {
                this._tryDecodeGifFromSource(src);
            }
            if (this.isSpriteSequence && this.spriteSheet) {
                this._spriteStartTime = performance.now();
                eventBus.emit('gif:animated');
            }
            eventBus.emit('object:updated', this);
            // Trigger a stage re-render so the image appears immediately
            eventBus.emit('stage:request-render');
        };
        if (!cachedImage) {
            img.onload = handleLoad;
            img.src = src;
        }
        if (img.complete && (img.naturalWidth || img.width)) {
            handleLoad();
        }
    }

    _tryDecodeGifFromSource(src) {
        if (!src || typeof GIFDecoder === 'undefined') return;
        if (typeof src === 'string' && src.startsWith('data:image/gif')) {
            this._tryDecodeGif(src);
            return;
        }
        if (this._gifDecodeSource === src) return;
        this._gifDecodeSource = src;
        fetch(src)
            .then(response => {
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return response.blob();
            })
            .then(blob => new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(reader.error || new Error('Could not read GIF blob'));
                reader.readAsDataURL(blob);
            }))
            .then(dataUrl => {
                if (typeof dataUrl === 'string') {
                    this._tryDecodeGif(dataUrl);
                }
            })
            .catch(err => {
                console.warn('GIF decode fetch failed:', err);
            });
    }

    loadTextureImage(src) {
        const img = new Image();
        const handleLoad = () => {
            this.textureImageElement = img;
            eventBus.emit('object:updated', this);
            eventBus.emit('stage:request-render');
        };
        img.onload = handleLoad;
        img.onerror = (error) => {
            this.textureImageElement = null;
            console.error('StageObject texture image failed to load:', {
                objectId: this.id,
                objectName: this.name,
                src,
                error
            });
            eventBus.emit('object:updated', this);
            eventBus.emit('stage:request-render');
        };
        img.src = src;
        if (img.complete && (img.naturalWidth || img.width)) {
            handleLoad();
        }
    }

    clearTextureImage() {
        this.textureImageSrc = null;
        this.textureImageElement = null;
    }

    /** Attempt to decode GIF frames from a data URL. */
    _tryDecodeGif(dataUrl) {
        try {
            if (typeof GIFDecoder === 'undefined') return;
            const result = GIFDecoder.decodeDataUrl(dataUrl);
            if (result.frames.length > 1) {
                this.isAnimatedGif = true;
                this.gifFrameDelays = result.frames.map(f => f.delay);
                this._gifFrames = result.frames.map(f => f.canvas);
                this._gifTotalDuration = this.gifFrameDelays.reduce((a, b) => a + b, 0);
                this._gifStartTime = performance.now();
                eventBus.emit('gif:animated');
            }
        } catch (e) {
            console.warn('GIF decode failed, treating as static image:', e);
        }
    }

    // Get bounding box (axis-aligned, always positive dimensions)
    getBounds() {
        // Joint-bent shapes: compute bounds from all segment polygons
        if (this.joints && this.joints.length > 0) {
            const polys = this._getJointedHitPolygons();
            if (polys) {
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                for (const corners of polys) {
                    for (const c of corners) {
                        if (c.x < minX) minX = c.x;
                        if (c.y < minY) minY = c.y;
                        if (c.x > maxX) maxX = c.x;
                        if (c.y > maxY) maxY = c.y;
                    }
                }
                return {
                    x: minX, y: minY,
                    width: maxX - minX, height: maxY - minY,
                    right: maxX, bottom: maxY,
                    centerX: (minX + maxX) / 2, centerY: (minY + maxY) / 2
                };
            }
        }

        if (this._hasDisplayRectTransform()) {
            const extrusion = this.getDepthExtrusionGeometry();
            if (extrusion) {
                const points = [...extrusion.front, ...extrusion.back];
                const xs = points.map(point => point.x);
                const ys = points.map(point => point.y);
                const x = Math.min(...xs);
                const y = Math.min(...ys);
                const right = Math.max(...xs);
                const bottom = Math.max(...ys);
                return {
                    x,
                    y,
                    width: right - x,
                    height: bottom - y,
                    right,
                    bottom,
                    centerX: (x + right) / 2,
                    centerY: (y + bottom) / 2
                };
            }
            const points = this.getTransformedRectPoints();
            const xs = points.map(point => point.x);
            const ys = points.map(point => point.y);
            const x = Math.min(...xs);
            const y = Math.min(...ys);
            const right = Math.max(...xs);
            const bottom = Math.max(...ys);
            return {
                x,
                y,
                width: right - x,
                height: bottom - y,
                right,
                bottom,
                centerX: (x + right) / 2,
                centerY: (y + bottom) / 2
            };
        }
        const x = Math.min(this.x, this.x + this.width);
        const y = Math.min(this.y, this.y + this.height);
        const w = Math.abs(this.width);
        const h = Math.abs(this.height);
        return {
            x: x,
            y: y,
            width: w,
            height: h,
            right: x + w,
            bottom: y + h,
            centerX: x + w / 2,
            centerY: y + h / 2
        };
    }

    // Hit test
    containsPoint(px, py) {
        // Joint-bent shapes: test each transformed segment polygon
        if (this.joints && this.joints.length > 0) {
            const polys = this._getJointedHitPolygons();
            if (polys) {
                for (const corners of polys) {
                    if (StageObject.pointInPolygon(px, py, corners)) return true;
                }
                return false;
            }
        }

        const hasDisplayTransform = this._hasDisplayRectTransform();
        if (hasDisplayTransform) {
            const extrusion = this.getDepthExtrusionGeometry();
            if (extrusion) {
                if (StageObject.pointInPolygon(px, py, extrusion.front)) return true;
                for (const quad of extrusion.quads) {
                    if (StageObject.pointInPolygon(px, py, quad)) return true;
                }
                return false;
            }
        }

        let testX = px;
        let testY = py;
        if (hasDisplayTransform) {
            const localPoint = this._inverseTransformDisplayPoint({ x: px, y: py });
            testX = localPoint.x;
            testY = localPoint.y;
        }

        // For lines/arrows, width/height can be negative (encode direction).
        // Normalize to axis-aligned bounding box for hit testing.
        const lineTypes = ['line', 'arrow', 'doubleArrow', 'curvedArrow'];
        const isLine = lineTypes.includes(this.type);
        let bx = this.x, by = this.y, bw = this.width, bh = this.height;
        if (isLine) {
            bx = Math.min(this.x, this.x + this.width);
            by = Math.min(this.y, this.y + this.height);
            bw = Math.abs(this.width);
            bh = Math.abs(this.height);
            // Lines are thin — use a minimum hit area thickness of 10
            const pad = Math.max(0, (10 - bh) / 2);
            const padX = Math.max(0, (10 - bw) / 2);
            bx -= padX;
            by -= pad;
            bw += padX * 2;
            bh += pad * 2;
        }

        // For circles: use elliptical test even when rotated
        if (this.type === 'circle') {
            if (!hasDisplayTransform && this.rotation !== 0) {
                // Un-rotate the test point around the pivot
                const pivot = this.getPivotPoint();
                const angle = -Utils.degToRad(this.rotation);
                const cos = Math.cos(angle), sin = Math.sin(angle);
                const dx = px - pivot.x, dy = py - pivot.y;
                testX = cos * dx - sin * dy + pivot.x;
                testY = sin * dx + cos * dy + pivot.y;
            }
            const cx = this.x + this.width / 2;
            const cy = this.y + this.height / 2;
            const rx = Math.abs(this.width / 2) || 1;
            const ry = Math.abs(this.height / 2) || 1;
            return ((testX - cx) ** 2 / rx ** 2 + (testY - cy) ** 2 / ry ** 2) <= 1;
        }

        if (!hasDisplayTransform && this.rotation !== 0) {
            return Utils.pointInRotatedRect(px, py, {
                x: bx, y: by, width: bw, height: bh, rotation: this.rotation,
                pivotX: this.pivotX, pivotY: this.pivotY
            });
        }

        return Utils.pointInRect(testX, testY, bx, by, bw, bh);
    }

    // Get the absolute pivot position in stage coordinates
    getPivotPoint() {
        return {
            x: this.x + this.width * this.pivotX,
            y: this.y + this.height * this.pivotY
        };
    }

    /**
     * Change pivotX/pivotY and compensate x/y so the object stays visually
     * in the same place.  Without compensation, objects with non-unit scale
     * (e.g. mirror-duplicated shapes with scaleX=-1) or rotation would jump
     * when the pivot is moved because the transform origin shifts.
     */
    adjustPivot(newPivotX, newPivotY) {
        const oldPvX = this.pivotX ?? 0.5;
        const oldPvY = this.pivotY ?? 0.5;
        if (oldPvX === newPivotX && oldPvY === newPivotY) return;

        const effSx = (this.scaleX || 1) * (this.flipH ? -1 : 1);
        const effSy = (this.scaleY || 1) * (this.flipV ? -1 : 1);
        const rot = this.rotation || 0;

        if (effSx !== 1 || effSy !== 1 || rot !== 0) {
            const θ = rot * Math.PI / 180;
            const cosθ = Math.cos(θ);
            const sinθ = Math.sin(θ);
            const dpx = oldPvX - newPivotX;
            const dpy = oldPvY - newPivotY;
            const w = this.width;
            const h = this.height;
            this.x += w * dpx * (1 - effSx * cosθ) + h * dpy * effSy * sinθ;
            this.y += h * dpy * (1 - effSy * cosθ) - w * dpx * effSx * sinθ;
        }

        this.pivotX = newPivotX;
        this.pivotY = newPivotY;
    }

    getDepthValue() {
        const rawDepth = typeof this.depth === 'number' ? this.depth : parseFloat(this.depth);
        return Number.isFinite(rawDepth) ? rawDepth : 0;
    }

    getDepthExtrusionVector() {
        const depth = this.getDepthValue();
        if (!StageObject.supportsDepthExtrusionType(this) || Math.abs(depth) < 0.01) {
            return { dx: 0, dy: 0, active: false };
        }
        const angle = -Math.PI / 4;
        return {
            dx: Math.cos(angle) * depth,
            dy: Math.sin(angle) * depth,
            active: true
        };
    }

    _getDepthBasePolygon() {
        if (this.pathPoints && this.pathPoints.length >= 3 && (this.type !== 'freeform' || this.closedPath !== false)) {
            return this.pathPoints.map(point => ({ x: point.x, y: point.y }));
        }

        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        const x = this.x;
        const y = this.y;
        const w = this.width;
        const h = this.height;

        switch (this.type) {
            case 'image':
                return this._getImageAlphaDepthPolygon()
                    || [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }];
            case 'icon':
            case 'rectangle':
                if (this.borderRadius > 0) {
                    return StageObject.getCustomShapePoints({ ...this, type: 'roundedRectangle' }, false);
                }
                return [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }];
            case 'circle': {
                const pts = [];
                const segments = 48;
                for (let i = 0; i < segments; i++) {
                    const angle = (i / segments) * Math.PI * 2;
                    pts.push({
                        x: cx + (w / 2) * Math.cos(angle),
                        y: cy + (h / 2) * Math.sin(angle)
                    });
                }
                return pts;
            }
            case 'triangle':
                return [{ x: cx, y }, { x: x + w, y: y + h }, { x, y: y + h }];
            case 'diamond':
                return [{ x: cx, y }, { x: x + w, y: cy }, { x: cx, y: y + h }, { x, y: cy }];
            case 'star': {
                const pts = [];
                const spikes = this.sides || 5;
                const outerR = Math.min(w, h) / 2;
                const innerR = outerR * (this.innerRadius || 0.4);
                for (let i = 0; i < spikes * 2; i++) {
                    const angle = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
                    const radius = i % 2 === 0 ? outerR : innerR;
                    pts.push({ x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) });
                }
                return pts;
            }
            case 'polygon': {
                const pts = [];
                const sides = this.sides || 6;
                const radius = Math.min(w, h) / 2;
                for (let i = 0; i < sides; i++) {
                    const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
                    pts.push({ x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) });
                }
                return pts;
            }
            case 'heart': {
                const pts = [];
                const segments = 48;
                for (let i = 0; i < segments; i++) {
                    const t = (i / segments) * Math.PI * 2;
                    const hx = 16 * Math.pow(Math.sin(t), 3);
                    const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
                    pts.push({ x: cx + hx * (w / 36), y: cy + hy * (h / 36) });
                }
                return pts;
            }
            default:
                if (StageObject.isCustomShapeType(this.type)) {
                    return StageObject.getCustomShapePoints(this, false);
                }
                return null;
        }
    }

    _transformDisplayPoint(point, options = {}) {
        const { includeDepthScale = true, includeTilt = true } = options;
        const pivot = this.getPivotPoint();
        const depthScale = includeDepthScale ? StageObject.getDepthTransformComponents(this).scale : 1;
        const effScaleX = (this.scaleX ?? 1) * depthScale * (this.flipH ? -1 : 1);
        const effScaleY = (this.scaleY ?? 1) * depthScale * (this.flipV ? -1 : 1);
        const tilt = includeTilt ? StageObject.getTiltTransformComponents(this) : { active: false, a: 1, b: 0, c: 0, d: 1 };
        const rotation = Utils.degToRad(this.rotation || 0);
        const cos = Math.cos(rotation);
        const sin = Math.sin(rotation);

        let dx = (point.x - pivot.x) * effScaleX;
        let dy = (point.y - pivot.y) * effScaleY;

        if (tilt.active) {
            const tiltedX = dx * tilt.a + dy * tilt.c;
            const tiltedY = dx * tilt.b + dy * tilt.d;
            dx = tiltedX;
            dy = tiltedY;
        }

        if (this.rotation) {
            const rotatedX = dx * cos - dy * sin;
            const rotatedY = dx * sin + dy * cos;
            dx = rotatedX;
            dy = rotatedY;
        }

        return {
            x: pivot.x + dx,
            y: pivot.y + dy
        };
    }

    _transformDisplayPoints(points, options = {}) {
        return points.map(point => this._transformDisplayPoint(point, options));
    }

    _inverseTransformDisplayPoint(point, options = {}) {
        const { includeDepthScale = true, includeTilt = true } = options;
        const pivot = this.getPivotPoint();
        const depthScale = includeDepthScale ? StageObject.getDepthTransformComponents(this).scale : 1;
        const effScaleX = (this.scaleX ?? 1) * depthScale * (this.flipH ? -1 : 1);
        const effScaleY = (this.scaleY ?? 1) * depthScale * (this.flipV ? -1 : 1);
        const tilt = includeTilt ? StageObject.getTiltTransformComponents(this) : { active: false, a: 1, b: 0, c: 0, d: 1 };
        const rotation = Utils.degToRad(-(this.rotation || 0));
        const cos = Math.cos(rotation);
        const sin = Math.sin(rotation);

        let dx = point.x - pivot.x;
        let dy = point.y - pivot.y;

        if (this.rotation) {
            const rotatedX = dx * cos - dy * sin;
            const rotatedY = dx * sin + dy * cos;
            dx = rotatedX;
            dy = rotatedY;
        }

        if (tilt.active) {
            const det = tilt.a * tilt.d - tilt.b * tilt.c;
            if (Math.abs(det) > 1e-6) {
                const invA = tilt.d / det;
                const invB = -tilt.b / det;
                const invC = -tilt.c / det;
                const invD = tilt.a / det;
                const untiltedX = dx * invA + dy * invC;
                const untiltedY = dx * invB + dy * invD;
                dx = untiltedX;
                dy = untiltedY;
            }
        }

        if (Math.abs(effScaleX) > 1e-6) dx /= effScaleX;
        if (Math.abs(effScaleY) > 1e-6) dy /= effScaleY;

        return {
            x: pivot.x + dx,
            y: pivot.y + dy
        };
    }

    _hasDisplayRectTransform() {
        const tilt = StageObject.getTiltTransformComponents(this);
        const depth = StageObject.getDepthTransformComponents(this);
        return !!(
            tilt.active
            || depth.active
            || Math.abs((this.rotation || 0)) > 0.001
            || !!this.flipH
            || !!this.flipV
            || Math.abs((this.scaleX ?? 1) - 1) > 0.001
            || Math.abs((this.scaleY ?? 1) - 1) > 0.001
        );
    }

    getDepthHandleDirection(signOverride = null) {
        const sign = signOverride ?? (this.getDepthValue() < 0 ? -1 : 1);
        const pivot = this.getPivotPoint();
        const origin = this._transformDisplayPoint(pivot, { includeDepthScale: false, includeTilt: false });
        const probe = this._transformDisplayPoint({
            x: pivot.x + Math.cos(-Math.PI / 4) * sign,
            y: pivot.y + Math.sin(-Math.PI / 4) * sign
        }, { includeDepthScale: false, includeTilt: false });
        const dx = probe.x - origin.x;
        const dy = probe.y - origin.y;
        const len = Math.hypot(dx, dy) || 1;
        return { x: dx / len, y: dy / len };
    }

    getDepthFrontDisplayPolygon() {
        if (StageObject.supportsDepthExtrusionType(this)) {
            const base = this._getDepthBasePolygon();
            if (base && base.length >= 3) {
                const includeTilt = !this.getDepthExtrusionVector().active;
                return this._transformDisplayPoints(base, { includeDepthScale: false, includeTilt });
            }
        }
        if (StageObject.supportsDepthScaleType(this.type) || StageObject.supportsTiltType(this.type)) {
            return this.getTransformedRectPoints();
        }
        return null;
    }

    _getDepthExtrusionGeometryLocal() {
        const extrusion = this.getDepthExtrusionVector();
        const front = this._getDepthBasePolygon();
        if (!extrusion.active || !front || front.length < 3) return null;

        const back = front.map(point => ({
            x: point.x + extrusion.dx,
            y: point.y + extrusion.dy
        }));

        const orientation = StageObject._polygonSignedArea(front) >= 0 ? 1 : -1;
        const quads = [];
        for (let i = 0; i < front.length; i++) {
            const next = (i + 1) % front.length;
            const edgeDx = front[next].x - front[i].x;
            const edgeDy = front[next].y - front[i].y;
            const outward = orientation >= 0
                ? { x: edgeDy, y: -edgeDx }
                : { x: -edgeDy, y: edgeDx };
            const dot = outward.x * extrusion.dx + outward.y * extrusion.dy;
            if (dot > 0) {
                const quad = [front[i], front[next], back[next], back[i]];
                quad.edgeIndex = i;
                quads.push(quad);
            }
        }

        return { front, back, quads, extrusion };
    }

    getDepthExtrusionGeometry() {
        const local = this._getDepthExtrusionGeometryLocal();
        if (!local) return null;
        return {
            front: this._transformDisplayPoints(local.front, { includeDepthScale: false, includeTilt: false }),
            back: this._transformDisplayPoints(local.back, { includeDepthScale: false, includeTilt: false }),
            quads: local.quads.map(quad => this._transformDisplayPoints(quad, { includeDepthScale: false, includeTilt: false })),
            extrusion: local.extrusion
        };
    }

    _getImageAlphaDepthPolygon() {
        if (this.type !== 'image') return null;
        const px = this._getContourPixels();
        if (!px || !px.pixels || !px.w || !px.h) return null;

        const { pixels, w, h, src } = px;
        const cache = this._depthAlphaPolygonCache;
        if (cache && cache.pixels === pixels && cache.src === src && cache.w === w && cache.h === h) {
            return cache.points.map(point => ({
                x: this.x + point.x * this.width,
                y: this.y + point.y * this.height
            }));
        }

        const threshold = 24;
        const samples = Math.max(24, Math.min(96, Math.round(Math.max(w, h) / 10)));
        const rows = [];
        for (let i = 0; i < samples; i += 1) {
            const row = Math.round((i / Math.max(1, samples - 1)) * (h - 1));
            const band = Math.max(0, Math.round(h / samples / 2));
            let minX = w;
            let maxX = -1;
            for (let yy = Math.max(0, row - band); yy <= Math.min(h - 1, row + band); yy += 1) {
                const offset = yy * w * 4;
                for (let xx = 0; xx < w; xx += 1) {
                    if (pixels[offset + xx * 4 + 3] >= threshold) {
                        if (xx < minX) minX = xx;
                        if (xx > maxX) maxX = xx;
                    }
                }
            }
            if (maxX >= minX) rows.push({ y: row, minX, maxX });
        }

        if (rows.length < 2) return null;

        const isFullRect = rows.length >= samples * 0.9 && rows.every(row => row.minX <= 1 && row.maxX >= w - 2);
        if (isFullRect) return null;

        const denomX = Math.max(1, w - 1);
        const denomY = Math.max(1, h - 1);
        const left = rows.map(row => ({ x: row.minX / denomX, y: row.y / denomY }));
        const right = rows.slice().reverse().map(row => ({ x: row.maxX / denomX, y: row.y / denomY }));
        const raw = left.concat(right);
        const simplified = [];
        for (const point of raw) {
            const prev = simplified[simplified.length - 1];
            if (!prev || Math.abs(prev.x - point.x) > 0.003 || Math.abs(prev.y - point.y) > 0.003) {
                simplified.push(point);
            }
        }
        if (simplified.length >= 3) {
            const first = simplified[0];
            const last = simplified[simplified.length - 1];
            if (Math.abs(first.x - last.x) < 0.003 && Math.abs(first.y - last.y) < 0.003) {
                simplified.pop();
            }
        }
        if (simplified.length < 3) return null;

        this._depthAlphaPolygonCache = { src, w, h, pixels, points: simplified };
        return simplified.map(point => ({
            x: this.x + point.x * this.width,
            y: this.y + point.y * this.height
        }));
    }

    _sampleImageDepthEdgeColor(edgeStart, edgeEnd, frontCenter) {
        if (this.type !== 'image' || this.depthSideMode === 'color') return null;
        const px = this._getContourPixels();
        if (!px || !px.pixels || !px.w || !px.h) return null;
        const { pixels, w, h } = px;
        const samples = 13;
        const radius = 1;
        let r = 0;
        let g = 0;
        let b = 0;
        let count = 0;
        const sx = Math.min(this.x, this.x + this.width);
        const sy = Math.min(this.y, this.y + this.height);
        const sw = Math.max(1, Math.abs(this.width));
        const sh = Math.max(1, Math.abs(this.height));

        for (let i = 0; i < samples; i += 1) {
            const t = samples === 1 ? 0.5 : i / (samples - 1);
            let pxStage = edgeStart.x + (edgeEnd.x - edgeStart.x) * t;
            let pyStage = edgeStart.y + (edgeEnd.y - edgeStart.y) * t;
            if (frontCenter) {
                pxStage += (frontCenter.x - pxStage) * 0.055;
                pyStage += (frontCenter.y - pyStage) * 0.055;
            }
            const ix = Math.max(0, Math.min(w - 1, Math.round(((pxStage - sx) / sw) * (w - 1))));
            const iy = Math.max(0, Math.min(h - 1, Math.round(((pyStage - sy) / sh) * (h - 1))));
            for (let yy = Math.max(0, iy - radius); yy <= Math.min(h - 1, iy + radius); yy += 1) {
                for (let xx = Math.max(0, ix - radius); xx <= Math.min(w - 1, ix + radius); xx += 1) {
                    const idx = (yy * w + xx) * 4;
                    if (pixels[idx + 3] < 24) continue;
                    r += pixels[idx];
                    g += pixels[idx + 1];
                    b += pixels[idx + 2];
                    count += 1;
                }
            }
        }

        if (!count) return null;
        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);
        return Utils.rgbToHex(r, g, b);
    }

    _getImageDepthSource() {
        if (this.type !== 'image') return null;
        let imgSource = null;
        if (this.isAnimatedGif && this._gifFrames && this._gifFrames.length > 1) {
            const elapsed = (performance.now() - this._gifStartTime) % this._gifTotalDuration;
            let acc = 0;
            let idx = 0;
            for (let i = 0; i < this.gifFrameDelays.length; i++) {
                acc += this.gifFrameDelays[i];
                if (elapsed < acc) { idx = i; break; }
            }
            imgSource = this._gifFrames[idx];
        } else {
            imgSource = globalThis.ArmatureViewState?.blendImage(this, src => this._crossViewImages?.get(src))
                || this._eraserCanvas || this._audioLipSyncImageElement || this.imageElement;
        }
        if (!imgSource || !(imgSource.naturalWidth || imgSource.width)) return null;
        return {
            imgSource,
            spriteRect: this._getCurrentSpriteFrameRect(imgSource)
        };
    }

    _drawImageDepthLayer(ctx, imgSource, spriteRect, offsetX, offsetY, shadeAlpha) {
        const width = Math.max(1, this.width || 1);
        const height = Math.max(1, this.height || 1);
        const srcW = Math.max(1, spriteRect?.width || imgSource.naturalWidth || imgSource.width || width);
        const srcH = Math.max(1, spriteRect?.height || imgSource.naturalHeight || imgSource.height || height);
        const zoom = Number.isFinite(this.imageZoom) ? this.imageZoom : 1;
        const panX = Number.isFinite(this.imagePanX) ? this.imagePanX : 0;
        const panY = Number.isFinite(this.imagePanY) ? this.imagePanY : 0;
        const useCropFit = zoom > 1.0001 || Math.abs(panX) > 0.0001 || Math.abs(panY) > 0.0001;
        const isCompressionActive = ((this._compressionRig?.amount || 0) > 0) || ((this._compressionPair?.amount || 0) > 0);

        ctx.save();
        ctx.imageSmoothingEnabled = true;
        if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.beginPath();
        if (this.borderRadius > 0 && ctx.roundRect) ctx.roundRect(this.x + offsetX, this.y + offsetY, width, height, this.borderRadius);
        else ctx.rect(this.x + offsetX, this.y + offsetY, width, height);
        ctx.clip();

        if (isCompressionActive || !useCropFit) {
            if (spriteRect) ctx.drawImage(imgSource, spriteRect.x, spriteRect.y, spriteRect.width, spriteRect.height, this.x + offsetX, this.y + offsetY, width, height);
            else ctx.drawImage(imgSource, this.x + offsetX, this.y + offsetY, width, height);
        } else {
            const safeZoom = Math.max(1, Math.min(2.5, zoom || 1));
            const safePanX = Math.max(-1, Math.min(1, panX || 0));
            const safePanY = Math.max(-1, Math.min(1, panY || 0));
            const coverScale = Math.max(width / srcW, height / srcH);
            const drawW = srcW * coverScale * safeZoom;
            const drawH = srcH * coverScale * safeZoom;
            const extraX = Math.max(0, drawW - width);
            const extraY = Math.max(0, drawH - height);
            const drawX = this.x + offsetX - extraX / 2 - safePanX * (extraX / 2);
            const drawY = this.y + offsetY - extraY / 2 - safePanY * (extraY / 2);
            if (spriteRect) ctx.drawImage(imgSource, spriteRect.x, spriteRect.y, spriteRect.width, spriteRect.height, drawX, drawY, drawW, drawH);
            else ctx.drawImage(imgSource, drawX, drawY, drawW, drawH);
        }

        ctx.globalCompositeOperation = 'source-atop';
        if (this.depthSideMode === 'color' && this.depthSideColor) {
            const savedAlpha = ctx.globalAlpha;
            ctx.globalAlpha = savedAlpha * Math.max(0.25, Math.min(0.86, shadeAlpha + 0.08));
            ctx.fillStyle = this.depthSideColor;
            ctx.fillRect(this.x + offsetX, this.y + offsetY, width, height);
            ctx.globalAlpha = savedAlpha;
        } else {
            ctx.fillStyle = `rgba(0, 0, 0, ${Math.max(0.04, Math.min(0.82, shadeAlpha))})`;
            ctx.fillRect(this.x + offsetX, this.y + offsetY, width, height);
        }
        ctx.restore();
    }

    _renderImageDepthSilhouette(ctx, geometry) {
        if (this.type !== 'image') return false;
        const source = this._getImageDepthSource();
        if (!source) return false;
        const extrusion = geometry?.extrusion || this.getDepthExtrusionVector();
        const length = Math.hypot(extrusion.dx || 0, extrusion.dy || 0);
        if (!extrusion.active || length < 0.01) return false;
        const light = Utils.clamp(Number(this.depthLighting ?? 45), 0, 100) / 100;
        const steps = Math.max(6, Math.min(96, Math.ceil(length * 2)));
        ctx.save();
        for (let i = steps; i >= 0; i -= 1) {
            const t = i / steps;
            const shade = 0.08 + t * (0.62 - light * 0.22);
            this._drawImageDepthLayer(ctx, source.imgSource, source.spriteRect, extrusion.dx * t, extrusion.dy * t, shade);
        }
        ctx.restore();
        return true;
    }

    _renderDepthExtrusion(ctx) {
        const geometry = this._getDepthExtrusionGeometryLocal();
        if (!geometry) return false;

        const baseFill = StageObject._getDepthFillBase(this);
        const sideBaseFill = StageObject._getDepthSideFillBase(this);
        const light = Utils.clamp(Number(this.depthLighting ?? 45), 0, 100) / 100;
        const topFill = StageObject._shadeHexColor(baseFill, 0.06 + light * 0.24);
        const sideFill = StageObject._shadeHexColor(sideBaseFill, -0.46 + light * 0.28);
        const sideStroke = StageObject._shadeHexColor(this.stroke || sideBaseFill, -0.52 + light * 0.24);
        const frontCenter = StageObject._polygonCentroid(geometry.front);

        const quads = [...geometry.quads].sort((a, b) => {
            const ca = StageObject._polygonCentroid(a);
            const cb = StageObject._polygonCentroid(b);
            return (ca.y + ca.x) - (cb.y + cb.x);
        });

        ctx.save();
        quads.forEach(quad => {
            const center = StageObject._polygonCentroid(quad);
            const sampledSideColor = this.type === 'image' ? null : this._sampleImageDepthEdgeColor(quad[0], quad[1], frontCenter);
            let fill = center.y < frontCenter.y && !sampledSideColor ? topFill : sideFill;
            if (sampledSideColor) {
                const frontMid = {
                    x: (quad[0].x + quad[1].x) / 2,
                    y: (quad[0].y + quad[1].y) / 2
                };
                const backMid = {
                    x: (quad[2].x + quad[3].x) / 2,
                    y: (quad[2].y + quad[3].y) / 2
                };
                const edgeFill = StageObject._shadeHexColor(sampledSideColor, -0.10 + light * 0.10);
                const deepFill = StageObject._shadeHexColor(sampledSideColor, -0.72 + light * 0.22);
                const grad = ctx.createLinearGradient(frontMid.x, frontMid.y, backMid.x, backMid.y);
                grad.addColorStop(0, edgeFill);
                grad.addColorStop(0.45, StageObject._shadeHexColor(sampledSideColor, -0.38 + light * 0.16));
                grad.addColorStop(1, deepFill);
                fill = grad;
            }
            const drawQuad = this.type === 'image'
                ? quad.map(point => {
                    const dx = point.x - frontCenter.x;
                    const dy = point.y - frontCenter.y;
                    const len = Math.hypot(dx, dy) || 1;
                    const expand = 1.15;
                    return {
                        x: point.x + (dx / len) * expand,
                        y: point.y + (dy / len) * expand
                    };
                })
                : quad;
            ctx.beginPath();
            ctx.moveTo(drawQuad[0].x, drawQuad[0].y);
            for (let i = 1; i < drawQuad.length; i++) ctx.lineTo(drawQuad[i].x, drawQuad[i].y);
            ctx.closePath();
            ctx.fillStyle = fill;
            ctx.fill();
            if (this.strokeWidth > 0) {
                ctx.strokeStyle = sideStroke;
                ctx.stroke();
            }
        });
        ctx.restore();
        return true;
    }

    // Render on canvas
    render(ctx, renderOptions = {}) {
        if (!this.visible) return;
        if (this._facialParentHead) {
            const facialKey = String(this._facialFeatureKey || '').toLowerCase().trim();
            const facialName = String(this.name || '').toLowerCase().trim();
            if (facialKey === 'nose' || /^face:\s*nose$/.test(facialName)) return;
        }

        this._activeRenderOptions = renderOptions || {};
        const includeEditorArtifacts = this._activeRenderOptions.includeEditorArtifacts !== false;

        ctx.save();
        
        // Apply transform around pivot point
        const pivot = this.getPivotPoint();
        const depth = StageObject.getDepthTransformComponents(this);
        
        if (this.rotation !== 0) {
            ctx.translate(pivot.x, pivot.y);
            ctx.rotate(Utils.degToRad(this.rotation));
            ctx.translate(-pivot.x, -pivot.y);
        }
        
        ctx.globalAlpha = this.opacity;
        if (this.blendMode && this.blendMode !== 'normal') {
            ctx.globalCompositeOperation = this.blendMode;
        }

        const effScaleX = this.scaleX * depth.scale * (this.flipH ? -1 : 1);
        const effScaleY = this.scaleY * depth.scale * (this.flipV ? -1 : 1);
        if (effScaleX !== 1 || effScaleY !== 1) {
            ctx.translate(pivot.x, pivot.y);
            ctx.scale(effScaleX, effScaleY);
            ctx.translate(-pivot.x, -pivot.y);
        }

        const garmentDeformation = StageObject.getGarmentDeformationTransform(this);
        if (garmentDeformation.active) {
            ctx.translate(pivot.x, pivot.y);
            ctx.transform(1, 0, garmentDeformation.shearX, garmentDeformation.scaleY, 0, 0);
            ctx.translate(-pivot.x, -pivot.y);
        }

        // Glow effect (drawn as shadowBlur before the main shape)
        if (this.glowEnabled) {
            ctx.shadowColor = this.glowColor;
            ctx.shadowBlur = this.glowSize;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        }
        // Shadow (regular drop shadow) — can stack with glow
        if (!this.glowEnabled && this.shadow) {
            ctx.shadowColor = this.shadowColor;
            ctx.shadowBlur = this.shadowBlur;
            ctx.shadowOffsetX = this.shadowOffsetX;
            ctx.shadowOffsetY = this.shadowOffsetY;
        }

        // Fill - handle gradient and pattern fills
        ctx.fillStyle = this._resolveFill(ctx);
        ctx.strokeStyle = this.stroke;
        ctx.lineWidth = this.strokeWidth;

        // Stroke dash pattern
        if (this.strokeDash && this.strokeDash !== 'solid') {
            const w = this.strokeWidth || 2;
            switch (this.strokeDash) {
                case 'dashed': ctx.setLineDash([w * 4, w * 2]); break;
                case 'dotted': ctx.setLineDash([w, w * 2]); break;
                case 'dash-dot': ctx.setLineDash([w * 4, w * 2, w, w * 2]); break;
            }
        } else {
            ctx.setLineDash([]);
        }
        ctx.lineCap = this.strokeCap || 'round';
        ctx.lineJoin = this.strokeJoin || 'round';

        // Clip animation support (wipe, strips, wheel, wedge)
        const _clipProps = ['_clipWipeRight','_clipWipeLeft','_clipWipeUp','_clipWipeDown',
                            '_clipStripsH','_clipStripsV','_clipWheel','_clipWedge'];
        let _clipActive = null, _clipP = 1;
        for (const cp of _clipProps) {
            if (this[cp] !== undefined) { _clipActive = cp; _clipP = this[cp]; break; }
        }
        if (_clipActive !== null) {
            if (_clipP <= 0) { ctx.restore(); return; }
            if (_clipP < 1) {
                const bx = Math.min(this.x, this.x + this.width);
                const by = Math.min(this.y, this.y + this.height);
                const bw = Math.abs(this.width) || 1;
                const bh = Math.abs(this.height) || 1;
                const ccx = bx + bw/2, ccy = by + bh/2;
                ctx.beginPath();
                switch (_clipActive) {
                    case '_clipWipeRight': ctx.rect(bx, by, bw * _clipP, bh); break;
                    case '_clipWipeLeft':  ctx.rect(bx + bw * (1 - _clipP), by, bw * _clipP, bh); break;
                    case '_clipWipeDown':  ctx.rect(bx, by, bw, bh * _clipP); break;
                    case '_clipWipeUp':    ctx.rect(bx, by + bh * (1 - _clipP), bw, bh * _clipP); break;
                    case '_clipStripsH': {
                        const n = 10, sh = bh / n;
                        for (let i = 0; i < n; i++) ctx.rect(bx, by + i*sh + sh/2*(1-_clipP), bw, sh*_clipP);
                        break;
                    }
                    case '_clipStripsV': {
                        const n = 10, sw = bw / n;
                        for (let i = 0; i < n; i++) ctx.rect(bx + i*sw + sw/2*(1-_clipP), by, sw*_clipP, bh);
                        break;
                    }
                    case '_clipWheel': {
                        const r = Math.sqrt(bw*bw + bh*bh)/2 + 10, spokes = 4;
                        for (let i = 0; i < spokes; i++) {
                            const sa = i*2*Math.PI/spokes - Math.PI/2;
                            ctx.moveTo(ccx, ccy); ctx.arc(ccx, ccy, r, sa, sa + (2*Math.PI/spokes)*_clipP); ctx.lineTo(ccx, ccy);
                        }
                        break;
                    }
                    case '_clipWedge': {
                        const r = Math.sqrt(bw*bw + bh*bh)/2 + 10;
                        ctx.moveTo(ccx, ccy); ctx.arc(ccx, ccy, r, -Math.PI/2 - Math.PI*_clipP, -Math.PI/2 + Math.PI*_clipP);
                        ctx.lineTo(ccx, ccy); ctx.closePath();
                        break;
                    }
                }
                ctx.clip();
            }
        }

        this._applyLayerMaskClip(ctx);

        // Draw shape (with flex / joint support)
        if (this.flexEnabled && this.flexPins && this.flexPins.length > 0) {
            this._renderWithFlex(ctx);
        } else if (this.joints && this.joints.length > 0) {
            this._renderWithJoints(ctx, { includeEditorArtifacts });
        } else {
            const depthExtrusionActive = this.getDepthExtrusionVector().active;
            const imageDepthTiltActive = this.type === 'image'
                && depthExtrusionActive
                && StageObject.getTiltTransformComponents(this).active;
            if (imageDepthTiltActive) {
                this._withTiltTransform(ctx, () => {
                    this._renderDepthExtrusion(ctx);
                    this._drawShapeByType(ctx);
                });
            } else {
                this._renderDepthExtrusion(ctx);
                this._drawShapeByType(ctx);
            }
        }
        if (this.faceRig && typeof this._drawFaceRigPose === 'function') {
            this._drawFaceRigPose(ctx);
        }

        // Clear shadow/glow for bevel overlay
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.setLineDash([]);

        // Bevel effect - draw highlight and shadow edges
        if (this.bevelEnabled && !['line','path','scribble','text'].includes(this.type)) {
            this._drawBevel(ctx);
        }

        ctx.restore();

        // Reflection effect (drawn below the object)
        if (this.reflectionEnabled && !['line','path','scribble','text'].includes(this.type)) {
            this._drawReflection(ctx);
        }

        // Draw pivot point indicator
        if (includeEditorArtifacts && this.showPivot) {
            this.drawPivotPoint(ctx);
        }

        // Draw pin connection line
        if (includeEditorArtifacts && this.pinnedTo) {
            this._drawPinLine(ctx);
        }

        this._activeRenderOptions = null;
    }

    _applyLayerMaskClip(ctx) {
        const mask = this.layerMask;
        if (!mask || mask.enabled === false) return false;
        const x = this.x + (Number(mask.x) || 0);
        const y = this.y + (Number(mask.y) || 0);
        const w = Number(mask.width) || this.width || 1;
        const h = Number(mask.height) || this.height || 1;
        const angle = Number(mask.rotation) || 0;
        const cx = x + w / 2;
        const cy = y + h / 2;
        if (angle) {
            ctx.translate(cx, cy);
            ctx.rotate(Utils.degToRad(angle));
            ctx.translate(-cx, -cy);
        }
        ctx.beginPath();
        if (mask.invert) {
            const pad = Math.max(Math.abs(this.width), Math.abs(this.height), Math.abs(w), Math.abs(h), 100) * 4;
            ctx.rect(this.x - pad, this.y - pad, Math.abs(this.width) + pad * 2, Math.abs(this.height) + pad * 2);
        }
        this._drawLayerMaskPath(ctx, mask, x, y, w, h);
        try {
            if (mask.invert) ctx.clip('evenodd');
            else ctx.clip();
        } catch (_) {
            ctx.clip();
        }
        if (angle) {
            ctx.translate(cx, cy);
            ctx.rotate(Utils.degToRad(-angle));
            ctx.translate(-cx, -cy);
        }
        return true;
    }

    _drawLayerMaskPath(ctx, mask, x, y, w, h) {
        const type = String(mask.type || 'rectangle');
        if ((type === 'path' || type === 'freeform' || type === 'scribble') && Array.isArray(mask.pathPoints) && mask.pathPoints.length) {
            const pts = mask.pathPoints;
            const pointX = (point) => this.x + (Number(point?.x) || 0);
            const pointY = (point) => this.y + (Number(point?.y) || 0);
            ctx.moveTo(pointX(pts[0]), pointY(pts[0]));
            for (let i = 1; i < pts.length; i += 1) {
                const cur = pts[i];
                const prev = pts[i - 1];
                if (cur.segmentType === 'straight' || prev.segmentType === 'straight' || i >= pts.length - 1) {
                    ctx.lineTo(pointX(cur), pointY(cur));
                } else {
                    const next = pts[i + 1];
                    ctx.quadraticCurveTo(
                        pointX(cur),
                        pointY(cur),
                        (pointX(cur) + pointX(next)) / 2,
                        (pointY(cur) + pointY(next)) / 2
                    );
                }
            }
            if (mask.closedPath !== false) ctx.closePath();
            return;
        }
        switch (type) {
            case 'circle':
                ctx.ellipse(x + w / 2, y + h / 2, Math.abs(w / 2) || 1, Math.abs(h / 2) || 1, 0, 0, Math.PI * 2);
                break;
            case 'triangle':
                ctx.moveTo(x + w / 2, y);
                ctx.lineTo(x + w, y + h);
                ctx.lineTo(x, y + h);
                ctx.closePath();
                break;
            case 'diamond':
                ctx.moveTo(x + w / 2, y);
                ctx.lineTo(x + w, y + h / 2);
                ctx.lineTo(x + w / 2, y + h);
                ctx.lineTo(x, y + h / 2);
                ctx.closePath();
                break;
            case 'heart': {
                const topY = h * 0.3;
                ctx.moveTo(x + w / 2, y + topY);
                ctx.bezierCurveTo(x + w / 2, y, x, y, x, y + topY);
                ctx.bezierCurveTo(x, y + (h + topY) / 2, x + w / 2, y + h * 0.8, x + w / 2, y + h);
                ctx.bezierCurveTo(x + w / 2, y + h * 0.8, x + w, y + (h + topY) / 2, x + w, y + topY);
                ctx.bezierCurveTo(x + w, y, x + w / 2, y, x + w / 2, y + topY);
                ctx.closePath();
                break;
            }
            case 'star': {
                const sides = Math.max(3, Number(mask.sides) || 5);
                const innerRadius = Number(mask.innerRadius) || 0.4;
                const cx = x + w / 2;
                const cy = y + h / 2;
                const outerR = Math.min(Math.abs(w), Math.abs(h)) / 2;
                for (let i = 0; i < sides * 2; i += 1) {
                    const r = i % 2 === 0 ? outerR : outerR * innerRadius;
                    const a = (i * Math.PI / sides) - Math.PI / 2;
                    const px = cx + r * Math.cos(a);
                    const py = cy + r * Math.sin(a);
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                break;
            }
            case 'polygon': {
                const sides = Math.max(3, Number(mask.sides) || 5);
                const cx = x + w / 2;
                const cy = y + h / 2;
                const r = Math.min(Math.abs(w), Math.abs(h)) / 2;
                for (let i = 0; i < sides; i += 1) {
                    const a = (i * 2 * Math.PI / sides) - Math.PI / 2;
                    const px = cx + r * Math.cos(a);
                    const py = cy + r * Math.sin(a);
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                break;
            }
            case 'roundedRectangle': {
                const radius = Math.max(0, Math.min(Number(mask.borderRadius) || 0, Math.abs(w) / 2, Math.abs(h) / 2));
                if (radius && typeof ctx.roundRect === 'function') ctx.roundRect(x, y, w, h, radius);
                else ctx.rect(x, y, w, h);
                break;
            }
            default:
                ctx.rect(x, y, w, h);
                break;
        }
    }

    /**
     * Draw shape by type (extracted for joint rendering reuse).
     */
    _drawShapeByType(ctx) {
        switch (this.type) {
            case 'symbol': {
                if (window.app?.symbols) window.app.symbols.renderInstance(ctx, this);
                break;
            }
            case 'rectangle': this.drawRectangle(ctx); break;
            case 'circle': this.drawCircle(ctx); break;
            case 'triangle': this.drawTriangle(ctx); break;
            case 'star': this.drawStar(ctx); break;
            case 'polygon': this.drawPolygon(ctx); break;
            case 'line': this.drawLine(ctx); break;
            case 'text': this.drawText(ctx); break;
            case 'image': this.drawImage(ctx); break;
            case 'path': this.drawPath(ctx); break;
            case 'diamond': this.drawDiamond(ctx); break;
            case 'heart': this.drawHeart(ctx); break;
            case 'arrow': this.drawArrow(ctx); break;
            case 'doubleArrow': this.drawDoubleArrow(ctx); break;
            case 'curvedArrow': this.drawCurvedArrow(ctx); break;
            case 'scribble': this.drawScribble(ctx); break;
            case 'freeform': this.drawFreeform(ctx); break;
            case 'icon': this.drawIcon(ctx); break;
            case 'caption': this.paintCaption(ctx, this.x, this.y); break;
            case 'roundedRectangle':
            case 'parallelogram':
            case 'trapezium':
            case 'hexagon':
            case 'heptagon':
            case 'pie':
            case 'chord':
            case 'teardrop':
            case 'lShape':
            case 'can':
            case 'plaque':
            case 'cube':
            case 'doughnut':
            case 'blockArc':
            case 'brace':
            case 'bracket':
            case 'bentArrow':
            case 'uTurnArrow':
            case 'quadArrow':
            case 'upDownArrow':
            case 'upArrowCallout':
            case 'elbowArrowConnector':
                this.drawPresetShape(ctx);
                break;
        }
        if (this.text && this.type !== 'text' && this.type !== 'image') {
            this._renderShapeText(ctx);
        }
    }

    /**
     * Render the shape with joint bending.
     * Each joint splits the object and applies cumulative rotation.
     */
    _renderWithJoints(ctx, options = {}) {
        const joints = [...this.joints].sort((a, b) => a.position - b.position);
        const direction = StageObject.getJointDirectionMeta(this.jointDirection);
        const axisRatio = (position) => direction.isReverse ? 1 - position : position;
        const positions = [0, ...joints.map(j => j.position), 1];
        const pad = (this.strokeWidth || 0) + 1;
        const partKey = String(
            this._armatureRoleKey
            || this._armaturePartKey
            || this.bodyPartData?.partKey
            || ''
        ).toLowerCase();
        const isHeadNeckPart = partKey === 'head-neck'
            || partKey === 'neck'
            || /head[- ]?neck/.test(partKey);
        const suppressInternalHeadMarkers = isHeadNeckPart;
        const headNeckSegmentOverlap = isHeadNeckPart
            ? Math.max(2, Math.min(this.width, this.height) * 0.045)
            : 0;

        // Draw contour discs BEFORE segments so bone edges overlap and cover disc edges.
        // Head-neck artwork already carries its own smooth neck transition; a contour
        // disc at the neck joint reads as an unwanted ring in stage, preview, and export.
        if (this.jointContours && !isHeadNeckPart) {
            this._drawJointContours(ctx, joints, direction);
        }

        for (let seg = 0; seg < positions.length - 1; seg++) {
            ctx.save();

            // Apply cumulative rotations and tilts from all joints before this segment
            for (let j = 0; j < seg; j++) {
                const jt = joints[j];
                const ratio = axisRatio(jt.position);
                const co = jt.crossOffset ?? 0.5;
                const px = direction.isVertical ? this.x + this.width * co : this.x + this.width * ratio;
                const py = direction.isVertical ? this.y + this.height * ratio : this.y + this.height * co;
                ctx.translate(px, py);
                ctx.rotate(jt.angle * Math.PI / 180);
                const tilt = this.getJointTiltTransform(jt);
                if (tilt.active) ctx.transform(tilt.a, tilt.b, tilt.c, tilt.d, 0, 0);
                ctx.translate(-px, -py);
            }

            // Clip to this segment's region
            ctx.beginPath();
            const segStart = axisRatio(positions[seg]);
            const segEnd = axisRatio(positions[seg + 1]);
            if (direction.isVertical) {
                const segY = this.y + this.height * Math.min(segStart, segEnd);
                const segH = this.height * Math.abs(segEnd - segStart);
                ctx.rect(
                    this.x - pad,
                    segY - headNeckSegmentOverlap,
                    this.width + pad * 2,
                    segH + (seg < positions.length - 2 ? 0.5 : 0) + headNeckSegmentOverlap * 2
                );
            } else {
                const segX = this.x + this.width * Math.min(segStart, segEnd);
                const segW = this.width * Math.abs(segEnd - segStart);
                ctx.rect(
                    segX - headNeckSegmentOverlap,
                    this.y - pad,
                    segW + (seg < positions.length - 2 ? 0.5 : 0) + headNeckSegmentOverlap * 2,
                    this.height + pad * 2
                );
            }
            ctx.clip();

            // Draw the full shape — only the clipped portion is visible
            this._drawShapeByType(ctx);

            ctx.restore();
        }

        // Draw joint pivot indicators
        if (options.includeEditorArtifacts !== false && !suppressInternalHeadMarkers) {
            this._drawJointIndicators(ctx, joints, direction);
        }
    }

    /**
     * Get the world-space (transformed) position of a joint, accounting for parent joint rotations.
     */
    getJointWorldPosition(jt, rendered = false) {
        if (rendered) {
            const dir = StageObject.getJointDirectionMeta(this.jointDirection);
            const local = joint => {
                const ratio = dir.isReverse ? 1 - joint.position : joint.position;
                return { x: this.x + this.width * (dir.isVertical ? (joint.crossOffset ?? .5) : ratio),
                    y: this.y + this.height * (dir.isVertical ? ratio : (joint.crossOffset ?? .5)) };
            };
            let point = local(jt);
            for (const joint of this.joints.filter(j => j.position < jt.position).sort((a, b) => b.position - a.position)) {
                const p = local(joint), tilt = this.getJointTiltTransform(joint);
                let x = point.x - p.x, y = point.y - p.y;
                if (tilt.active) { const tx = x * tilt.a + y * tilt.c; y = x * tilt.b + y * tilt.d; x = tx; }
                const r = (joint.angle || 0) * Math.PI / 180;
                point = { x: p.x + x * Math.cos(r) - y * Math.sin(r), y: p.y + x * Math.sin(r) + y * Math.cos(r) };
            }
            return this._transformDisplayPoint(point);
        }
        const direction = StageObject.getJointDirectionMeta(this.jointDirection);
        const axisRatio = direction.isReverse ? 1 - jt.position : jt.position;
        const co = jt.crossOffset ?? 0.5;
        let px = direction.isVertical ? this.x + this.width * co : this.x + this.width * axisRatio;
        let py = direction.isVertical ? this.y + this.height * axisRatio : this.y + this.height * co;

        const sorted = [...this.joints].sort((a, b) => a.position - b.position);
        // Apply cumulative parent joint rotations to this position
        for (const sj of sorted) {
            if (sj.position >= jt.position) break;
            const sjRatio = direction.isReverse ? 1 - sj.position : sj.position;
            const sjCo = sj.crossOffset ?? 0.5;
            const sjx = direction.isVertical ? this.x + this.width * sjCo : this.x + this.width * sjRatio;
            const sjy = direction.isVertical ? this.y + this.height * sjRatio : this.y + this.height * sjCo;
            // Apply rotation
            const rad = sj.angle * Math.PI / 180;
            const cos = Math.cos(rad), sin = Math.sin(rad);
            let dx = px - sjx, dy = py - sjy;
            let rx = dx * cos - dy * sin, ry = dx * sin + dy * cos;
            // Apply tilt
            const tilt = this.getJointTiltTransform(sj);
            if (tilt.active) {
                const tx = rx * tilt.a + ry * tilt.c;
                const ty = rx * tilt.b + ry * tilt.d;
                rx = tx; ry = ty;
            }
            px = sjx + rx;
            py = sjy + ry;
        }

        if (typeof this._transformDisplayPoint === 'function') {
            return this._transformDisplayPoint({ x: px, y: py });
        }

        // Also apply the object's own rotation if any
        if (this.rotation) {
            const pivot = this.getPivotPoint();
            const rad = this.rotation * Math.PI / 180;
            const cos = Math.cos(rad), sin = Math.sin(rad);
            const dx = px - pivot.x, dy = py - pivot.y;
            px = pivot.x + dx * cos - dy * sin;
            py = pivot.y + dx * sin + dy * cos;
        }
        return { x: px, y: py };
    }

    getJointWorldAngle(jt) {
        if (!jt) return this.rotation || 0;
        const sorted = [...(this.joints || [])].sort((a, b) => a.position - b.position);
        const handedness = (((this.scaleX ?? 1) * (this.flipH ? -1 : 1)) * ((this.scaleY ?? 1) * (this.flipV ? -1 : 1))) < 0 ? -1 : 1;
        let angle = this.rotation || 0;
        for (const sj of sorted) {
            angle += (sj.angle || 0) * handedness;
            if (sj.id === jt.id) break;
            if (sj.position >= jt.position) break;
        }
        return angle;
    }

    _getPinnedParentJoint(parent = this._pinParentRef) {
        if (!parent || this.pinTargetType !== 'joint' || !Array.isArray(parent.joints) || parent.joints.length === 0) return null;
        return parent.joints.find(jt => (this.pinJointId && jt.id === this.pinJointId) || (this.pinJointName && jt.name === this.pinJointName)) || null;
    }

    _getPinnedParentAnchorInfo(parent = this._pinParentRef) {
        if (!parent) return null;
        const joint = this._getPinnedParentJoint(parent);
        if (joint) {
            const point = parent.getJointWorldPosition(joint, !!this.sceneAsset?.activityKit);
            const direction = StageObject.getJointDirectionMeta(parent.jointDirection);
            const axisRatio = direction.isReverse ? 1 - joint.position : joint.position;
            return {
                x: point.x,
                y: point.y,
                rotation: parent.getJointWorldAngle(joint),
                tiltX: joint.tiltX ?? 0,
                tiltY: joint.tiltY ?? 0,
                tiltTransform: parent.getJointTiltTransform(joint),
                anchorX: direction.isVertical ? (joint.crossOffset ?? 0.5) : axisRatio,
                anchorY: direction.isVertical ? axisRatio : (joint.crossOffset ?? 0.5),
                joint
            };
        }

        const anchorX = this.pinAnchorX ?? 0.5;
        const anchorY = this.pinAnchorY ?? 0.5;
        const point = parent.getWorldPoint ? parent.getWorldPoint(anchorX, anchorY) : null;
        const world = point || { x: parent.x + parent.width * anchorX, y: parent.y + parent.height * anchorY };
        return {
            x: world.x,
            y: world.y,
            rotation: parent.rotation || 0,
            tiltX: parent.tiltX ?? 0,
            tiltY: parent.tiltY ?? 0,
            tiltTransform: StageObject.getTiltTransformComponents(parent),
            anchorX,
            anchorY,
            joint: null
        };
    }

    _getArmatureAttachmentJoint(obj = this) {
        const roleKey = obj?._armaturePartKey || obj?._armatureRoleKey || '';
        if (!roleKey || !Array.isArray(obj.joints) || obj.joints.length === 0) return null;
        const partKey = String(roleKey).toLowerCase();
        const joints = [...obj.joints].sort((a, b) => a.position - b.position);
        const byName = new Map(joints.map(jt => [String(jt?.name || '').toLowerCase(), jt]));

        if (partKey === 'head-neck') {
            return byName.get('neck') || joints[0] || null;
        }
        if (partKey.endsWith('-arm') || partKey === 'left-arm' || partKey === 'right-arm') {
            for (const jt of joints) {
                if (String(jt?.name || '').toLowerCase().includes('shoulder')) return jt;
            }
            return joints[0] || null;
        }
        return null;
    }

    _getArmatureAttachmentJointWorldPosition(jt, obj = this) {
        if (!jt || !obj || !Array.isArray(obj.joints) || obj.joints.length === 0) return null;
        const direction = StageObject.getJointDirectionMeta(obj.jointDirection);
        const sorted = [...obj.joints].sort((a, b) => a.position - b.position);
        const targetIndex = sorted.findIndex(sj => sj?.id === jt?.id);
        if (targetIndex < 0) return obj.getJointWorldPosition ? obj.getJointWorldPosition(jt) : null;

        const axisRatio = direction.isReverse ? 1 - jt.position : jt.position;
        const co = jt.crossOffset ?? 0.5;
        let point = {
            x: direction.isVertical ? obj.x + obj.width * co : obj.x + obj.width * axisRatio,
            y: direction.isVertical ? obj.y + obj.height * axisRatio : obj.y + obj.height * co
        };

        for (let index = 0; index < targetIndex; index++) {
            const sj = sorted[index];
            const sjRatio = direction.isReverse ? 1 - sj.position : sj.position;
            const sjCo = sj.crossOffset ?? 0.5;
            const pivot = {
                x: direction.isVertical ? obj.x + obj.width * sjCo : obj.x + obj.width * sjRatio,
                y: direction.isVertical ? obj.y + obj.height * sjRatio : obj.y + obj.height * sjCo
            };
            const rad = (sj.angle || 0) * Math.PI / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            let dx = point.x - pivot.x;
            let dy = point.y - pivot.y;
            let rx = dx * cos - dy * sin;
            let ry = dx * sin + dy * cos;
            const tilt = this.getJointTiltTransform(sj);
            if (tilt.active) {
                const tx = rx * tilt.a + ry * tilt.c;
                const ty = rx * tilt.b + ry * tilt.d;
                rx = tx;
                ry = ty;
            }
            point = { x: pivot.x + rx, y: pivot.y + ry };
        }

        return obj._transformDisplayPoint
            ? obj._transformDisplayPoint(point)
            : (obj.getJointWorldPosition ? obj.getJointWorldPosition(jt) : point);
    }

    /**
     * Compute world-space polygons for each joint segment (for hit-testing).
     * Returns null if no joint has a non-zero angle.
     */
    _getJointedHitPolygons() {
        const joints = [...this.joints].sort((a, b) => a.position - b.position);
        if (!this.armatureSeatDepth && !this.armatureKneelDepth && !this.armatureReachDepth && !joints.some(j => Math.abs(j.angle) > 0.01 || Math.abs(j.tiltX || 0) > 0.01 || Math.abs(j.tiltY || 0) > 0.01)) return null;

        const direction = StageObject.getJointDirectionMeta(this.jointDirection);
        const axisRatio = (pos) => direction.isReverse ? 1 - pos : pos;
        const positions = [0, ...joints.map(j => j.position), 1];
        const pad = (this.strokeWidth || 0) + 1;

        const polygons = [];

        for (let seg = 0; seg < positions.length - 1; seg++) {
            const segStart = axisRatio(positions[seg]);
            const segEnd = axisRatio(positions[seg + 1]);

            let corners;
            if (direction.isVertical) {
                const y0 = this.y + this.height * Math.min(segStart, segEnd);
                const y1 = this.y + this.height * Math.max(segStart, segEnd);
                corners = [
                    { x: this.x - pad, y: y0 },
                    { x: this.x + this.width + pad, y: y0 },
                    { x: this.x + this.width + pad, y: y1 },
                    { x: this.x - pad, y: y1 }
                ];
            } else {
                const x0 = this.x + this.width * Math.min(segStart, segEnd);
                const x1 = this.x + this.width * Math.max(segStart, segEnd);
                corners = [
                    { x: x0, y: this.y - pad },
                    { x: x1, y: this.y - pad },
                    { x: x1, y: this.y + this.height + pad },
                    { x: x0, y: this.y + this.height + pad }
                ];
            }

            // Apply cumulative joint rotations and tilts from all preceding joints
            for (let j = 0; j < seg; j++) {
                const jt = joints[j];
                const ratio = axisRatio(jt.position);
                const jCo = jt.crossOffset ?? 0.5;
                const jx = direction.isVertical ? this.x + this.width * jCo : this.x + this.width * ratio;
                const jy = direction.isVertical ? this.y + this.height * ratio : this.y + this.height * jCo;
                const rad = jt.angle * Math.PI / 180;
                const cos = Math.cos(rad), sin = Math.sin(rad);
                const tilt = this.getJointTiltTransform(jt);
                corners = corners.map(c => {
                    let dx = c.x - jx, dy = c.y - jy;
                    // Rotation
                    let rx = dx * cos - dy * sin, ry = dx * sin + dy * cos;
                    // Tilt
                    if (tilt.active) {
                        const tx = rx * tilt.a + ry * tilt.c;
                        const ty = rx * tilt.b + ry * tilt.d;
                        rx = tx; ry = ty;
                    }
                    return { x: jx + rx, y: jy + ry };
                });
            }
            polygons.push(this._transformDisplayPoints(corners, { includeDepthScale: true, includeTilt: true }));
        }

        return polygons;
    }

    /**
     * Draw small circle indicators at each joint pivot.
     */
    _drawJointIndicators(ctx, joints, direction) {
        joints.forEach(jt => {
            const axisRatio = direction.isReverse ? 1 - jt.position : jt.position;
            const co = jt.crossOffset ?? 0.5;
            const px = direction.isVertical ? this.x + this.width * co : this.x + this.width * axisRatio;
            const py = direction.isVertical ? this.y + this.height * axisRatio : this.y + this.height * co;

            ctx.save();
            // Apply parent joint rotations and tilts so indicator is in the right spot
            const sorted = [...this.joints].sort((a, b) => a.position - b.position);
            for (const sj of sorted) {
                if (sj.position >= jt.position) break;
                const sjRatio = direction.isReverse ? 1 - sj.position : sj.position;
                const sjCo = sj.crossOffset ?? 0.5;
                const sjx = direction.isVertical ? this.x + this.width * sjCo : this.x + this.width * sjRatio;
                const sjy = direction.isVertical ? this.y + this.height * sjRatio : this.y + this.height * sjCo;
                ctx.translate(sjx, sjy);
                ctx.rotate(sj.angle * Math.PI / 180);
                const tilt = this.getJointTiltTransform(sj);
                if (tilt.active) ctx.transform(tilt.a, tilt.b, tilt.c, tilt.d, 0, 0);
                ctx.translate(-sjx, -sjy);
            }

            ctx.beginPath();
            ctx.arc(px, py, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#ff9800';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.restore();
        });
    }

    /**
     * Draw filled contour discs at each joint to visually bridge adjacent bone segments.
     * The disc radius matches half the cross-axis dimension so it seamlessly covers
     * the V-shaped gap that appears when segments bend at a joint.
     */
    _drawJointContours(ctx, joints, direction) {
        // Object-level defaults
        const objSizeFactor = this.contourSize ?? 1;
        const objColor = this.contourColor || null;
        const partKey = String(
            this._armatureRoleKey
            || this._armaturePartKey
            || this.bodyPartData?.partKey
            || ''
        ).toLowerCase();

        joints.forEach(jt => {
            const co = jt.crossOffset ?? 0.5;
            // Compute base radius from actual shape width at this joint's position
            const axisRatio = direction.isReverse ? 1 - jt.position : jt.position;
            const crossWidth = this._getShapeCrossWidthAtPoint(axisRatio, co, direction);
            const baseRadius = crossWidth / 2;

            // Per-joint overrides: use joint-specific values if set, else fall back to object-level
            const isHeadNeckJoint = (partKey === 'head-neck' || partKey === 'neck' || /head[- ]?neck/.test(partKey))
                && String(jt?.name || '').toLowerCase() === 'neck';
            let sizeFactor = jt.contourSize != null ? jt.contourSize : objSizeFactor;
            if (isHeadNeckJoint && (!Number.isFinite(sizeFactor) || sizeFactor < 0.9)) {
                sizeFactor = 1;
            }
            const radius = baseRadius * sizeFactor;
            if (radius <= 0) return;

            const px = direction.isVertical ? this.x + this.width * co : this.x + this.width * axisRatio;
            const py = direction.isVertical ? this.y + this.height * axisRatio : this.y + this.height * co;
            let useColor = jt.contourColor || objColor || null;
            if (!useColor && this.type === 'image') {
                const sampleX = direction.isVertical ? co : axisRatio;
                const sampleY = direction.isVertical ? axisRatio : co;
                useColor = this._sampleColorAtPoint(sampleX, sampleY) || null;
            }

            ctx.save();

            // Apply cumulative rotations and tilts from all preceding joints
            const sorted = [...this.joints].sort((a, b) => a.position - b.position);
            for (const sj of sorted) {
                if (sj.position >= jt.position) break;
                const sjRatio = direction.isReverse ? 1 - sj.position : sj.position;
                const sjCo = sj.crossOffset ?? 0.5;
                const sjx = direction.isVertical ? this.x + this.width * sjCo : this.x + this.width * sjRatio;
                const sjy = direction.isVertical ? this.y + this.height * sjRatio : this.y + this.height * sjCo;
                ctx.translate(sjx, sjy);
                ctx.rotate(sj.angle * Math.PI / 180);
                const tilt = this.getJointTiltTransform(sj);
                if (tilt.active) ctx.transform(tilt.a, tilt.b, tilt.c, tilt.d, 0, 0);
                ctx.translate(-sjx, -sjy);
            }

            // Draw the contour disc (with optional contour rotation)
            const cRot = this.contourRotation || 0;
            if (cRot !== 0) {
                ctx.translate(px, py);
                ctx.rotate(cRot * Math.PI / 180);
                ctx.translate(-px, -py);
            }
            this._fillContourCircle(ctx, px, py, radius, {
                autoSource: 'joint',
                autoSampleColor: useColor || undefined,
                fallbackColor: useColor || '#888888',
                jointTexture: !jt.contourColor && !objColor,
                jointTextureAngle: Number(jt.angle) || 0
            });
            if (this.strokeWidth > 0) ctx.stroke();

            ctx.restore();
        });
    }

    /**
     * Returns the cross-axis width of this shape at a normalised axis position (0-1).
     * For vertical joint direction: measures horizontal width at a given y-fraction.
     * For horizontal joint direction: measures vertical height at a given x-fraction.
     * Uses actual shape geometry rather than the bounding box.
     */
    _getShapeCrossWidthAtPosition(t, direction) {
        t = Math.max(0, Math.min(1, t));
        const isVert = direction.isVertical;
        const fullCross = isVert ? this.width : this.height;

        // For image objects, measure actual opaque pixel width instead of bounding box
        if (this.type === 'image') {
            const px = this._getContourPixels();
            if (px) {
                const { pixels, w, h } = px;
                if (isVert) {
                    // Measure horizontal opaque span at row t
                    const row = Math.round(Math.max(0, Math.min(h - 1, t * (h - 1))));
                    const band = Math.max(1, Math.round(h * 0.025));
                    const rStart = Math.max(0, row - band);
                    const rEnd = Math.min(h - 1, row + band);
                    let minL = w, maxR = -1;
                    for (let r = rStart; r <= rEnd; r++) {
                        const off = r * w * 4;
                        for (let x = 0; x < w; x++) {
                            if (pixels[off + x * 4 + 3] >= 128) {
                                if (x < minL) minL = x;
                                if (x > maxR) maxR = x;
                            }
                        }
                    }
                    if (maxR >= minL) return (maxR - minL + 1) * (this.width / w);
                } else {
                    // Measure vertical opaque span at column t
                    const col = Math.round(Math.max(0, Math.min(w - 1, t * (w - 1))));
                    const band = Math.max(1, Math.round(w * 0.025));
                    const cStart = Math.max(0, col - band);
                    const cEnd = Math.min(w - 1, col + band);
                    let minT = h, maxB = -1;
                    for (let c = cStart; c <= cEnd; c++) {
                        for (let y = 0; y < h; y++) {
                            if (pixels[(y * w + c) * 4 + 3] >= 128) {
                                if (y < minT) minT = y;
                                if (y > maxB) maxB = y;
                            }
                        }
                    }
                    if (maxB >= minT) return (maxB - minT + 1) * (this.height / h);
                }
            }
            return fullCross;
        }

        switch (this.type) {
            case 'circle': {
                // Ellipse: width(t) = full * sqrt(1 - (2t-1)²)
                const inner = 1 - (2 * t - 1) ** 2;
                return inner > 0 ? fullCross * Math.sqrt(inner) : 0;
            }
            case 'triangle': {
                // Apex top-center, base bottom (vertical axis only; horizontal falls through)
                if (isVert) return fullCross * t;
                return fullCross;
            }
            case 'diamond': {
                // Rhombus – widens to midpoint then narrows
                return fullCross * (t <= 0.5 ? t * 2 : (1 - t) * 2);
            }
            case 'star':
            case 'polygon': {
                // Inscribed in a circle of radius min(w,h)/2
                const R = Math.min(this.width, this.height) / 2;
                const d = (t - 0.5) * (isVert ? this.height : this.width); // distance from center
                if (Math.abs(d) >= R) return 0;
                return 2 * Math.sqrt(R * R - d * d);
            }
            case 'freeform': {
                if (this.closedPath && this.pathPoints && this.pathPoints.length >= 3) {
                    return this._scanPathCrossWidth(t, isVert);
                }
                return fullCross;
            }
            default:
                return fullCross;
        }
    }

    /**
     * Returns the cross-axis center of the shape at a normalised axis position (0-1),
     * expressed as a 0-1 ratio within the bounding box.
     * For symmetric shapes this is always 0.5; for freeform shapes it may differ.
     */
    _getShapeCrossCenterAtPosition(t, direction) {
        t = Math.max(0, Math.min(1, t));
        const isVert = direction.isVertical;

        if (this.type === 'freeform' && this.closedPath && this.pathPoints && this.pathPoints.length >= 3) {
            const range = this._scanPathCrossRange(t, isVert);
            if (range) {
                const mid = (range.min + range.max) / 2;
                return isVert
                    ? (mid - this.x) / this.width
                    : (mid - this.y) / this.height;
            }
        }
        // All built-in shapes are symmetric about the cross-axis center
        return 0.5;
    }

    /**
     * Scan freeform pathPoints edges to find the cross-axis min/max
     * at a given normalised axis position. Returns {min, max} or null.
     */
    _scanPathCrossRange(t, isVertical) {
        const pts = this.pathPoints;
        let minC = Infinity, maxC = -Infinity;

        if (isVertical) {
            const targetY = this.y + this.height * t;
            for (let i = 0; i < pts.length; i++) {
                const p1 = pts[i];
                const p2 = pts[(i + 1) % pts.length];
                if ((p1.y <= targetY && p2.y >= targetY) || (p2.y <= targetY && p1.y >= targetY)) {
                    if (Math.abs(p2.y - p1.y) < 0.001) {
                        minC = Math.min(minC, p1.x, p2.x);
                        maxC = Math.max(maxC, p1.x, p2.x);
                    } else {
                        const frac = (targetY - p1.y) / (p2.y - p1.y);
                        const ix = p1.x + frac * (p2.x - p1.x);
                        minC = Math.min(minC, ix);
                        maxC = Math.max(maxC, ix);
                    }
                }
            }
        } else {
            const targetX = this.x + this.width * t;
            for (let i = 0; i < pts.length; i++) {
                const p1 = pts[i];
                const p2 = pts[(i + 1) % pts.length];
                if ((p1.x <= targetX && p2.x >= targetX) || (p2.x <= targetX && p1.x >= targetX)) {
                    if (Math.abs(p2.x - p1.x) < 0.001) {
                        minC = Math.min(minC, p1.y, p2.y);
                        maxC = Math.max(maxC, p1.y, p2.y);
                    } else {
                        const frac = (targetX - p1.x) / (p2.x - p1.x);
                        const iy = p1.y + frac * (p2.y - p1.y);
                        minC = Math.min(minC, iy);
                        maxC = Math.max(maxC, iy);
                    }
                }
            }
        }

        if (minC === Infinity) return null;
        return { min: minC, max: maxC };
    }

    /**
     * Scan freeform pathPoints edges to find the cross-axis extent
     * at a given normalised axis position.
     */
    _scanPathCrossWidth(t, isVertical) {
        const range = this._scanPathCrossRange(t, isVertical);
        if (!range) return isVertical ? this.width : this.height;
        return range.max - range.min;
    }

    _getCurrentGifFrameIndex() {
        if (!(this.isAnimatedGif && this._gifFrames && this._gifFrames.length > 1 && this.gifFrameDelays?.length && this._gifTotalDuration > 0)) {
            return 0;
        }
        const elapsed = (performance.now() - this._gifStartTime) % this._gifTotalDuration;
        let acc = 0;
        for (let i = 0; i < this.gifFrameDelays.length; i++) {
            acc += this.gifFrameDelays[i];
            if (elapsed < acc) return i;
        }
        return 0;
    }

    _getCurrentSpriteFrameRect(source = this.imageElement) {
        const sheet = this.spriteSheet;
        if (!this.isSpriteSequence || !sheet || !source) return null;
        const indices = Array.isArray(sheet.frameIndices) && sheet.frameIndices.length
            ? sheet.frameIndices
            : Array.from({ length: Math.max(1, (sheet.columns || 1) * (sheet.rows || 1)) }, (_, index) => index);
        const frameDuration = Math.max(20, Number(sheet.frameDuration) || 100);
        const elapsed = Number.isFinite(this._spriteTimelineTime)
            ? Math.max(0, this._spriteTimelineTime)
            : Math.max(0, performance.now() - (this._spriteStartTime || performance.now()));
        const rawIndex = Math.floor(elapsed / frameDuration);
        const sequenceIndex = sheet.loop === false
            ? Math.min(indices.length - 1, rawIndex)
            : rawIndex % indices.length;
        const frameIndex = indices[Math.max(0, sequenceIndex)] || 0;
        const columns = Math.max(1, Number(sheet.columns) || 1);
        const gapX = Math.max(0, Number(sheet.gapX) || 0);
        const gapY = Math.max(0, Number(sheet.gapY) || 0);
        const marginX = Math.max(0, Number(sheet.marginX) || 0);
        const marginY = Math.max(0, Number(sheet.marginY) || 0);
        const sourceWidth = source.naturalWidth || source.width || 1;
        const sourceHeight = source.naturalHeight || source.height || 1;
        const rows = Math.max(1, Number(sheet.rows) || 1);
        const frameWidth = Math.max(1, Number(sheet.frameWidth) || Math.floor((sourceWidth - marginX * 2 - gapX * (columns - 1)) / columns));
        const frameHeight = Math.max(1, Number(sheet.frameHeight) || Math.floor((sourceHeight - marginY * 2 - gapY * (rows - 1)) / rows));
        return {
            x: marginX + (frameIndex % columns) * (frameWidth + gapX),
            y: marginY + Math.floor(frameIndex / columns) * (frameHeight + gapY),
            width: frameWidth,
            height: frameHeight
        };
    }

    _applyRenderStyles(ctx) {
        ctx.fillStyle = this._resolveFill(ctx);
        ctx.strokeStyle = this.stroke;
        ctx.lineWidth = this.strokeWidth;
        if (this.strokeDash && this.strokeDash !== 'solid') {
            const w = this.strokeWidth || 2;
            switch (this.strokeDash) {
                case 'dashed':
                    ctx.setLineDash([w * 4, w * 2]);
                    break;
                case 'dotted':
                    ctx.setLineDash([w, w * 2]);
                    break;
                case 'dash-dot':
                    ctx.setLineDash([w * 4, w * 2, w, w * 2]);
                    break;
                default:
                    ctx.setLineDash([]);
                    break;
            }
        } else {
            ctx.setLineDash([]);
        }
        ctx.lineCap = this.strokeCap || 'round';
        ctx.lineJoin = this.strokeJoin || 'round';
    }

    _getFlexSurfaceBounds() {
        const basePad = Math.max(4, (this.strokeWidth || 0) + 4);
        let extraPad = 0;
        if (StageObject.getTiltTransformComponents(this).active) {
            extraPad += Math.ceil(Math.max(Math.abs(this.width), Math.abs(this.height)) * 0.2);
        }
        if (this.getDepthExtrusionVector().active) {
            extraPad += Math.ceil(Math.abs(this.getDepthValue()) + 8);
        }
        const pad = basePad + extraPad;
        const x = Math.min(this.x, this.x + this.width) - pad;
        const y = Math.min(this.y, this.y + this.height) - pad;
        const width = Math.max(1, Math.abs(this.width) + pad * 2);
        const height = Math.max(1, Math.abs(this.height) + pad * 2);
        return { x, y, width, height, pad };
    }

    _getFlexSurfaceCacheKey(scale) {
        const imageSource = this._eraserCanvas || this.imageElement || null;
        const imageWidth = imageSource?.naturalWidth || imageSource?.width || 0;
        const imageHeight = imageSource?.naturalHeight || imageSource?.height || 0;
        return JSON.stringify({
            type: this.type,
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
            fill: this.fill,
            fillType: this.fillType,
            gradientStops: this.gradientStops,
            gradientAngle: this.gradientAngle,
            patternType: this.patternType,
            patternColor: this.patternColor,
            patternScale: this.patternScale,
            stroke: this.stroke,
            strokeWidth: this.strokeWidth,
            strokeDash: this.strokeDash,
            strokeCap: this.strokeCap,
            strokeJoin: this.strokeJoin,
            borderRadius: this.borderRadius,
            text: this.text,
            textColor: this.textColor,
            textAlign: this.textAlign,
            fontSize: this.fontSize,
            fontWeight: this.fontWeight,
            fontFamily: this.fontFamily,
            fontStyle: this.fontStyle,
            letterSpacing: this.letterSpacing,
            textCurve: this.textCurve,
            lineHeight: this.lineHeight,
            textTransform: this.textTransform,
            listStyle: this.listStyle,
            listIndent: this.listIndent,
            textStrokeColor: this.textStrokeColor,
            textStrokeWidth: this.textStrokeWidth,
            textBackgroundEnabled: this.textBackgroundEnabled,
            textBackgroundColor: this.textBackgroundColor,
            textBackgroundPadding: this.textBackgroundPadding,
            textBackgroundRadius: this.textBackgroundRadius,
            sides: this.sides,
            innerRadius: this.innerRadius,
            pathPoints: this.pathPoints,
            closedPath: this.closedPath,
            iconPath: this.iconPath,
            iconViewBox: this.iconViewBox,
            tiltX: this.tiltX,
            tiltY: this.tiltY,
            depth: this.depth,
            imageSrc: this.imageSrc,
            crossViewBlendWeight: this._crossViewBlend?.weight,
            imageZoom: this.imageZoom,
            imagePanX: this.imagePanX,
            imagePanY: this.imagePanY,
            imageWidth,
            imageHeight,
            imgBrightness: this.imgBrightness,
            imgContrast: this.imgContrast,
            imgSaturation: this.imgSaturation,
            imgHue: this.imgHue,
            imgBlur: this.imgBlur,
            imgGrayscale: this.imgGrayscale,
            imgSepia: this.imgSepia,
            imgInvert: this.imgInvert,
            imgTintAmount: this.imgTintAmount,
            imgTintColor: this.imgTintColor,
            gifFrame: this._getCurrentGifFrameIndex(),
            scale
        });
    }

    _getFlexSurfaceCache() {
        if (typeof document === 'undefined') return null;

        const bounds = this._getFlexSurfaceBounds();
        const scale = Math.max(1, Math.min(3, (window.devicePixelRatio || 1) * Math.max(1, this.stage?.zoom || 1)));
        const key = this._getFlexSurfaceCacheKey(scale);

        if (this._flexSurfaceCache?.key === key) {
            return this._flexSurfaceCache;
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.ceil(bounds.width * scale));
        canvas.height = Math.max(1, Math.ceil(bounds.height * scale));
        const surfaceCtx = canvas.getContext('2d');
        if (!surfaceCtx) return null;

        surfaceCtx.setTransform(scale, 0, 0, scale, 0, 0);
        surfaceCtx.translate(-bounds.x, -bounds.y);
        this._applyRenderStyles(surfaceCtx);
        this._renderDepthExtrusion(surfaceCtx);
        this._drawShapeByType(surfaceCtx);

        this._flexSurfaceCache = {
            key,
            canvas,
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height
        };
        return this._flexSurfaceCache;
    }

    _renderFlexSegments(ctx, isVertical, segments, pad, segAngles, drawSegment, overlap = 0, startSeg = 0, endSeg = segments, reverse = false) {
        const segStart = Math.max(0, Math.min(segments, startSeg));
        const segEnd = Math.max(segStart, Math.min(segments, endSeg));
        const segList = [];
        if (reverse) {
            for (let seg = segEnd - 1; seg >= segStart; seg--) segList.push(seg);
        } else {
            for (let seg = segStart; seg < segEnd; seg++) segList.push(seg);
        }
        for (const seg of segList) {
            ctx.save();

            if (reverse) {
                for (let j = segEnd - 1; j > seg; j--) {
                    if (Math.abs(segAngles[j]) < 0.001) continue;
                    const ratio = (j + 1) / segments;
                    let px;
                    let py;
                    if (isVertical) {
                        px = this.x + this.width / 2;
                        py = this.y + this.height * ratio;
                    } else {
                        px = this.x + this.width * ratio;
                        py = this.y + this.height / 2;
                    }
                    ctx.translate(px, py);
                    ctx.rotate(segAngles[j] * Math.PI / 180);
                    ctx.translate(-px, -py);
                }
            } else {
                for (let j = segStart; j < seg; j++) {
                    if (Math.abs(segAngles[j]) < 0.001) continue;
                    const ratio = j / segments;
                    let px;
                    let py;
                    if (isVertical) {
                        px = this.x + this.width / 2;
                        py = this.y + this.height * ratio;
                    } else {
                        px = this.x + this.width * ratio;
                        py = this.y + this.height / 2;
                    }
                    ctx.translate(px, py);
                    ctx.rotate(segAngles[j] * Math.PI / 180);
                    ctx.translate(-px, -py);
                }
            }

            ctx.beginPath();
            const s0 = seg / segments;
            const s1 = (seg + 1) / segments;
            if (isVertical) {
                const sy = this.y + this.height * s0;
                const sh = this.height * (s1 - s0);
                ctx.rect(this.x - pad, sy - overlap, this.width + pad * 2, sh + overlap * 2 + 0.5);
            } else {
                const sx = this.x + this.width * s0;
                const sw = this.width * (s1 - s0);
                ctx.rect(sx - overlap, this.y - pad, sw + overlap * 2 + 0.5, this.height + pad * 2);
            }
            ctx.clip();

            drawSegment(ctx, { seg, s0, s1 });
            ctx.restore();
        }
    }

    // ============ FLEX (ELASTIC DEFORMATION) RENDERING ============

    /**
     * Render this object with arc bending at flex anchor points.
     * Subdivides into 40 micro-segments with Gaussian angle distribution
     * and clip-and-rotate technique (same approach as _renderWithJoints).
     */
    static flexRegionLockAt(pins, x, y) {
        let lock = 0;
        for (const pin of pins) {
            if (pin?.maskMode !== 'exclude' || !Array.isArray(pin.maskPathN) || pin.maskPathN.length < 3) continue;
            const points = pin.maskPathN;
            if (points.some(p => !Number.isFinite(Number(p.x)) || !Number.isFinite(Number(p.y)))) continue;
            const feather = Math.max(0, Math.min(.25, Number(pin.maskFeather) || 0));
            let inside = false, distance = Infinity;
            for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
                const ax = Math.max(0, Math.min(1, Number(points[j].x))), ay = Math.max(0, Math.min(1, Number(points[j].y)));
                const bx = Math.max(0, Math.min(1, Number(points[i].x))), by = Math.max(0, Math.min(1, Number(points[i].y)));
                if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside;
                if (feather) {
                    const dx = bx - ax, dy = by - ay;
                    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
                    distance = Math.min(distance, Math.hypot(x - ax - t * dx, y - ay - t * dy));
                }
            }
            const t = inside ? 1 : feather ? Math.max(0, 1 - distance / feather) : 0;
            const weight = t * t * (3 - 2 * t);
            const strength = Number(pin.maskStrength ?? 1);
            if (Number.isFinite(strength)) lock = Math.max(lock, weight * Math.max(0, Math.min(1, strength)));
        }
        return lock;
    }

    static stabilizeFlexGrid(disp, width, height, vertical) {
        const rows = disp.length - 1, cols = disp[0].length - 1;
        const step = Math.abs(vertical ? width / cols : height / rows);
        let factor = 1, constrainedEdges = 0;
        // Each cell has only one displacement axis. Positive edge spans preserve
        // both triangle orientations; scale the field to retain a small margin.
        for (let r = 0; r <= rows; r++) for (let c = 0; c <= cols; c++) {
            if (vertical ? c === cols : r === rows) continue;
            const delta = vertical ? disp[r][c + 1] - disp[r][c] : disp[r + 1][c] - disp[r][c];
            if (!Number.isFinite(delta)) throw new Error('Non-finite Flex grid displacement');
            if (delta < -step * .98) {
                constrainedEdges++;
                factor = Math.min(factor, step * .98 / -delta);
            }
        }
        if (factor < 1) for (const row of disp) for (let c = 0; c < row.length; c++) row[c] *= factor;
        return { constrainedEdges, displacementScale: factor };
    }

    static renderFlexLayer(ctx, draw) {
        // Keep destructive mask operations off the scene and apply opacity once.
        const destination = ctx.canvas;
        const canvas = destination._flexCompositeSurface || document.createElement('canvas');
        destination._flexCompositeSurface = canvas;
        if (canvas.width !== destination.width || canvas.height !== destination.height) {
            canvas.width = destination.width; canvas.height = destination.height;
        }
        const layer = canvas.getContext('2d');
        if (typeof layer.reset === 'function') layer.reset();
        else canvas.width = canvas.width;
        layer.setTransform(ctx.getTransform());
        for (const key of ['fillStyle', 'strokeStyle', 'lineWidth', 'lineCap', 'lineJoin',
            'miterLimit', 'lineDashOffset', 'font', 'textAlign', 'textBaseline', 'direction',
            'imageSmoothingEnabled', 'imageSmoothingQuality']) layer[key] = ctx[key];
        layer.setLineDash(ctx.getLineDash());
        draw(layer);
        ctx.save();
        try {
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.drawImage(canvas, 0, 0);
        } finally { ctx.restore(); }
    }

    _renderWithFlex(ctx, isolated = false) {
        const pins = this.flexPins;
        if (!pins || pins.length === 0) { this._drawShapeByType(ctx); return; }

        // Check if any pin has non-zero angle
        const hasAngle = pins.some(p => Math.abs(p.angle) > 0.1);
        if (!hasAngle) { this._drawShapeByType(ctx); return; }
        if (!isolated && pins.some(pin => pin.maskMode === 'exclude' && pin.maskPathN?.length >= 3)) {
            StageObject.renderFlexLayer(ctx, layer => this._renderWithFlex(layer, true));
            return;
        }

        const isVertical = this.flexDirection === 'vertical';
        const fixedRegionMode = this.flexFixedRegionMode === 'grid' ? 'grid' : 'overlay';
        const gridDensity = Math.max(0.35, Math.min(1.5, Number(this.flexGridDensity ?? 0.6)));
        const useSurfaceFlex = this.type === 'image' || this.flexPreserveTexture !== false;
        const maxSpan = Math.max(Math.abs(this.width), Math.abs(this.height));
        const segments = useSurfaceFlex
            ? Math.max(48, Math.min(180, Math.round(maxSpan / 3)))
            : Math.max(40, Math.min(120, Math.round(maxSpan / 5)));
        const pad = (this.strokeWidth || 0) + 2;

        // Compute per-segment rotation by distributing each pin's angle
        // across segments using a Gaussian bell centred on the pin position
        const segAngles = new Array(segments).fill(0);
        const _clamp01 = (v) => Math.max(0, Math.min(1, v));
        const _pointInPolyN = (x, y, poly) => {
            let inside = false;
            for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
                const xi = _clamp01(Number(poly[i].x));
                const yi = _clamp01(Number(poly[i].y));
                const xj = _clamp01(Number(poly[j].x));
                const yj = _clamp01(Number(poly[j].y));
                const intersects = ((yi > y) !== (yj > y)) &&
                    (x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-6) + xi);
                if (intersects) inside = !inside;
            }
            return inside;
        };
        const _getGlobalExcludeLockAt = (px, py) => {
            const lock = StageObject.flexRegionLockAt(pins, _clamp01(px), _clamp01(py));
            return lock;
        };
        const _getPinRegionWeight = (pin, t) => {
            const path = pin && Array.isArray(pin.maskPathN) ? pin.maskPathN : null;
            const strength = Math.max(0, Math.min(1, Number(pin.maskStrength ?? 1)));
            const samples = 13;
            let weightSum = 0;
            for (let i = 0; i < samples; i++) {
                const u = (i + 0.5) / samples;
                const px = isVertical ? u : t;
                const py = isVertical ? t : u;
                let baseMask = 1;
                if (path && path.length >= 3) {
                    const inRegion = _pointInPolyN(px, py, path) ? 1 : 0;
                    const hardMask = pin.maskMode === 'include' ? inRegion : (1 - inRegion);
                    baseMask = 1 - strength * (1 - hardMask);
                }
                const globalLock = _getGlobalExcludeLockAt(px, py);
                weightSum += baseMask * (1 - globalLock);
            }
            return _clamp01(weightSum / samples);
        };
        const _getPinPointRegionWeight = (pin, t, u) => {
            const path = pin && Array.isArray(pin.maskPathN) ? pin.maskPathN : null;
            const strength = Math.max(0, Math.min(1, Number(pin.maskStrength ?? 1)));
            const px = isVertical ? u : t;
            const py = isVertical ? t : u;
            let baseMask = 1;
            if (path && path.length >= 3) {
                const inRegion = _pointInPolyN(_clamp01(px), _clamp01(py), path) ? 1 : 0;
                const hardMask = pin.maskMode === 'include' ? inRegion : (1 - inRegion);
                baseMask = 1 - strength * (1 - hardMask);
            }
            const globalLock = _getGlobalExcludeLockAt(px, py);
            return baseMask * (1 - globalLock);
        };
        const _drawFixedRegionOverlays = () => {
            for (const pin of pins) {
                if (!pin || pin.maskMode !== 'exclude') continue;
                const path = Array.isArray(pin.maskPathN) ? pin.maskPathN : null;
                if (!path || path.length < 3) continue;
                const strength = Math.max(0, Math.min(1, Number(pin.maskStrength ?? 1)));
                if (strength <= 0.0001) continue;

                // First remove the bent pixels in this fixed region so no deformed
                // geometry remains under the unbent overlay.
                ctx.save();
                ctx.globalAlpha *= strength;
                ctx.globalCompositeOperation = 'destination-out';
                ctx.beginPath();
                for (let i = 0; i < path.length; i++) {
                    const px = this.x + _clamp01(Number(path[i].x)) * this.width;
                    const py = this.y + _clamp01(Number(path[i].y)) * this.height;
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fillStyle = '#000';
                ctx.fill();
                ctx.restore();

                ctx.save();
                ctx.globalAlpha *= strength;
                ctx.beginPath();
                for (let i = 0; i < path.length; i++) {
                    const px = this.x + _clamp01(Number(path[i].x)) * this.width;
                    const py = this.y + _clamp01(Number(path[i].y)) * this.height;
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.clip();
                this._drawShapeByType(ctx);
                ctx.restore();
            }
        };
        let aboveSplit = 0;
        let hasAbovePin = false;
        for (const pin of pins) {
            if (pin.influenceSide === 'above') {
                hasAbovePin = true;
                const pinPos = Math.max(0, Math.min(1, Number(pin.position || 0)));
                aboveSplit = Math.max(aboveSplit, Math.min(segments, Math.max(1, Math.floor(pinPos * segments) + 1)));
            }
        }
        const pinDistributions = [];
        for (const pin of pins) {
            const sigma = Math.max(0.03, (pin.spread || 0.25) / 2);
            const inv2s2 = 1 / (2 * sigma * sigma);
            let totalW = 0;
            const ws = [];
            const side = pin.influenceSide === 'above' ? 'above' : 'below';
            for (let s = 0; s < segments; s++) {
                const t = (s + 0.5) / segments;
                if (side === 'below' && t < pin.position) { ws.push(0); continue; }
                if (side === 'above' && t > pin.position) { ws.push(0); continue; }
                const d = t - pin.position;
                const w = Math.exp(-d * d * inv2s2);
                ws.push(w);
                totalW += w;
            }
            pinDistributions.push({ pin, ws, totalW });
            if (totalW > 0) {
                for (let s = 0; s < segments; s++) {
                    const t = (s + 0.5) / segments;
                    const regionWeight = _getPinRegionWeight(pin, t);
                    if (regionWeight <= 0.0001) continue;
                    const contribution = pin.angle * (ws[s] / totalW) * regionWeight;
                    segAngles[s] += contribution;
                }
            }
        }

        const _drawTrue2DGrid = () => {
            const srcW = Math.max(1, Math.ceil(Math.abs(this.width)));
            const srcH = Math.max(1, Math.ceil(Math.abs(this.height)));
            if (srcW < 2 || srcH < 2) return false;

            const srcCanvas = document.createElement('canvas');
            srcCanvas.width = srcW;
            srcCanvas.height = srcH;
            const srcCtx = srcCanvas.getContext('2d');
            for (const key of ['fillStyle', 'strokeStyle', 'lineWidth', 'lineCap', 'lineJoin', 'font', 'textAlign', 'textBaseline']) srcCtx[key] = ctx[key];
            srcCtx.imageSmoothingEnabled = true;
            srcCtx.imageSmoothingQuality = 'high';
            srcCtx.translate(-this.x, -this.y);
            this._drawShapeByType(srcCtx);

            const rows = Math.max(12, Math.min(140, Math.round((srcH / 5) * gridDensity)));
            const cols = Math.max(10, Math.min(100, Math.round((srcW / 8) * gridDensity)));
            const rowH = this.height / rows;
            const colW = this.width / cols;

            const theta = Array.from({ length: rows + 1 }, () => new Array(cols + 1).fill(0));
            for (let r = 0; r <= rows; r++) {
                const t = r / rows;
                const sIdx = Math.max(0, Math.min(segments - 1, Math.floor(t * segments)));
                for (let c = 0; c <= cols; c++) {
                    const u = c / cols;
                    let a = 0;
                    for (const dist of pinDistributions) {
                        if (!dist.totalW || dist.totalW <= 0) continue;
                        const base = dist.pin.angle * (dist.ws[sIdx] / dist.totalW);
                        const regionWeight = _getPinPointRegionWeight(dist.pin, t, u);
                        if (regionWeight <= 0.0001) continue;
                        a += base * regionWeight;
                    }
                    theta[r][c] = a;
                }
            }

            const disp = Array.from({ length: rows + 1 }, () => new Array(cols + 1).fill(0));
            if (isVertical) {
                for (let c = 0; c <= cols; c++) {
                    for (let r = 1; r <= rows; r++) {
                        const rad = theta[r - 1][c] * Math.PI / 180;
                        disp[r][c] = disp[r - 1][c] + Math.tan(rad) * rowH;
                    }
                }
            } else {
                for (let r = 0; r <= rows; r++) {
                    for (let c = 1; c <= cols; c++) {
                        const rad = theta[r][c - 1] * Math.PI / 180;
                        disp[r][c] = disp[r][c - 1] + Math.tan(rad) * colW;
                    }
                }
            }

            // Lock accumulated displacement, not only local bending: upstream bends
            // can otherwise translate an excluded vertex even when its angle is zero.
            for (let r = 0; r <= rows; r++) {
                for (let c = 0; c <= cols; c++) {
                    disp[r][c] *= 1 - _getGlobalExcludeLockAt(c / cols, r / rows);
                }
            }
            this._flexGeometryDiagnostics = StageObject.stabilizeFlexGrid(disp, this.width, this.height, isVertical);
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const sx = (c / cols) * srcW;
                    const sy = (r / rows) * srcH;
                    const sw = Math.max(1, (srcW / cols) + 0.5);
                    const sh = Math.max(1, (srcH / rows) + 0.5);
                    const srcBleed = 0.8;
                    const sxB = Math.max(0, sx - srcBleed);
                    const syB = Math.max(0, sy - srcBleed);
                    const swB = Math.min(srcW - sxB, sw + srcBleed * 2);
                    const shB = Math.min(srcH - syB, sh + srcBleed * 2);

                    let x00; let y00; let x10; let y10; let x01; let y01; let x11; let y11;
                    if (isVertical) {
                        x00 = this.x + c * colW + disp[r][c];
                        y00 = this.y + r * rowH;
                        x10 = this.x + (c + 1) * colW + disp[r][c + 1];
                        y10 = this.y + r * rowH;
                        x01 = this.x + c * colW + disp[r + 1][c];
                        y01 = this.y + (r + 1) * rowH;
                        x11 = this.x + (c + 1) * colW + disp[r + 1][c + 1];
                        y11 = this.y + (r + 1) * rowH;
                    } else {
                        x00 = this.x + c * colW;
                        y00 = this.y + r * rowH + disp[r][c];
                        x10 = this.x + (c + 1) * colW;
                        y10 = this.y + r * rowH + disp[r][c + 1];
                        x01 = this.x + c * colW;
                        y01 = this.y + (r + 1) * rowH + disp[r + 1][c];
                        x11 = this.x + (c + 1) * colW;
                        y11 = this.y + (r + 1) * rowH + disp[r + 1][c + 1];
                    }

                    const a = (x10 - x00) / sw;
                    const b = (y10 - y00) / sw;
                    const cM = (x01 - x00) / sh;
                    const d = (y01 - y00) / sh;

                    ctx.save();
                    ctx.beginPath();
                    ctx.moveTo(x00, y00);
                    ctx.lineTo(x10, y10);
                    ctx.lineTo(x11, y11);
                    ctx.lineTo(x01, y01);
                    ctx.closePath();
                    ctx.clip();
                    ctx.transform(a, b, cM, d, x00, y00);
                    ctx.drawImage(srcCanvas, sxB, syB, swB, shB, -srcBleed, -srcBleed, swB, shB);
                    ctx.restore();
                }
            }
            return true;
        };

        if (fixedRegionMode === 'grid' && _drawTrue2DGrid()) {
            _drawFixedRegionOverlays();
            return;
        }

        if (useSurfaceFlex) {
            const surface = this._getFlexSurfaceCache();
            if (surface?.canvas) {
                const surfaceScaleX = surface.canvas.width / Math.max(1, surface.width);
                const surfaceScaleY = surface.canvas.height / Math.max(1, surface.height);
                const overlap = Math.max(1, 2 / Math.max(0.1, this.stage?.zoom || 1));
                const drawSurfaceSegment = (segmentCtx, meta) => {
                    segmentCtx.imageSmoothingEnabled = true;
                    segmentCtx.imageSmoothingQuality = 'high';

                    if (isVertical) {
                        const segY = this.y + this.height * meta.s0;
                        const segH = this.height * (meta.s1 - meta.s0);
                        const srcY = Math.min(
                            Math.max(0, Math.round((segY - surface.y - overlap) * surfaceScaleY)),
                            Math.max(0, surface.canvas.height - 1)
                        );
                        const srcH = Math.max(1, Math.round((segH + overlap * 2) * surfaceScaleY));
                        const clampedSrcH = Math.min(surface.canvas.height - srcY, srcH);
                        if (clampedSrcH <= 0) return;
                        segmentCtx.drawImage(
                            surface.canvas,
                            0,
                            srcY,
                            surface.canvas.width,
                            clampedSrcH,
                            surface.x,
                            segY - overlap,
                            surface.width,
                            (clampedSrcH / surfaceScaleY)
                        );
                    } else {
                        const segX = this.x + this.width * meta.s0;
                        const segW = this.width * (meta.s1 - meta.s0);
                        const srcX = Math.min(
                            Math.max(0, Math.round((segX - surface.x - overlap) * surfaceScaleX)),
                            Math.max(0, surface.canvas.width - 1)
                        );
                        const srcW = Math.max(1, Math.round((segW + overlap * 2) * surfaceScaleX));
                        const clampedSrcW = Math.min(surface.canvas.width - srcX, srcW);
                        if (clampedSrcW <= 0) return;
                        segmentCtx.drawImage(
                            surface.canvas,
                            srcX,
                            0,
                            clampedSrcW,
                            surface.canvas.height,
                            segX - overlap,
                            surface.y,
                            (clampedSrcW / surfaceScaleX),
                            surface.height
                        );
                    }
                };
                if (isVertical && hasAbovePin && aboveSplit < segments) {
                    this._renderFlexSegments(ctx, isVertical, segments, pad, segAngles, drawSurfaceSegment, overlap, 0, aboveSplit, true);
                    this._renderFlexSegments(ctx, isVertical, segments, pad, segAngles, drawSurfaceSegment, overlap, aboveSplit, segments, false);
                } else {
                    this._renderFlexSegments(ctx, isVertical, segments, pad, segAngles, drawSurfaceSegment, overlap);
                }
                _drawFixedRegionOverlays();
                return;
            }
        }

        if (isVertical && hasAbovePin && aboveSplit < segments) {
            this._renderFlexSegments(ctx, isVertical, segments, pad, segAngles, (segmentCtx) => {
                this._drawShapeByType(segmentCtx);
            }, 0, 0, aboveSplit, true);
            this._renderFlexSegments(ctx, isVertical, segments, pad, segAngles, (segmentCtx) => {
                this._drawShapeByType(segmentCtx);
            }, 0, aboveSplit, segments);
        } else {
            this._renderFlexSegments(ctx, isVertical, segments, pad, segAngles, (segmentCtx) => {
                this._drawShapeByType(segmentCtx);
            });
        }
        _drawFixedRegionOverlays();
    }

    /**
     * Draw a visual line from this pinned object to its parent.
     */
    _drawPinLine(ctx) {
        if (!this._pinParentRef) return;
        const parent = this._pinParentRef;
        const myPivot = this.getPivotPoint();
        const anchor = this._getPinnedParentAnchorInfo(parent);
        if (!anchor) return;
        const anchorScreenX = anchor.x;
        const anchorScreenY = anchor.y;

        ctx.save();
        ctx.strokeStyle = '#ff9800';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(myPivot.x, myPivot.y);
        ctx.lineTo(anchorScreenX, anchorScreenY);
        ctx.stroke();
        // Pin icon at child pivot
        ctx.fillStyle = '#ff9800';
        ctx.beginPath();
        ctx.arc(myPivot.x, myPivot.y, 3, 0, Math.PI * 2);
        ctx.fill();
        // Anchor point on parent (diamond shape)
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.moveTo(anchorScreenX, anchorScreenY - 4);
        ctx.lineTo(anchorScreenX + 4, anchorScreenY);
        ctx.lineTo(anchorScreenX, anchorScreenY + 4);
        ctx.lineTo(anchorScreenX - 4, anchorScreenY);
        ctx.closePath();
        ctx.fill();
        ctx.setLineDash([]);
        ctx.restore();
    }

    /**
     * Draw a filled contour capsule at this pinned object's pivot (connection joint)
     * to bridge the gap between parent and child limbs during rotation.
     * The capsule extends along the limb axis into both parent and child,
     * covering rotation gaps. Called BEFORE the child renders so it sits underneath.
     */
    _drawPinContour(ctx) {
        if (!this._pinParentRef) return;
        const parent = this._pinParentRef;
        const anchorInfo = this._getPinnedParentAnchorInfo(parent);
        if (!anchorInfo) return;

        // --- Measure actual limb width at the joint from pixel data ---
        const anchorY = anchorInfo.anchorY ?? (this.pinAnchorY ?? 0.5);
        const anchorX = anchorInfo.anchorX ?? (this.pinAnchorX ?? 0.5);
        const pvx = this.pivotX ?? 0.5;
        const pvy = this.pivotY ?? 0.5;
        const partKey = String(
            this.bodyPartData?.partKey
            || this._armatureRoleKey
            || this._armaturePartKey
            || ''
        ).toLowerCase();
        const childDirection = StageObject.getJointDirectionMeta(this.jointDirection);
        const attachmentJoint = this._getArmatureAttachmentJoint
            ? this._getArmatureAttachmentJoint(this)
            : null;
        const attachmentAxisRatio = attachmentJoint
            ? (childDirection.isReverse ? 1 - attachmentJoint.position : attachmentJoint.position)
            : (childDirection.isVertical ? pvy : pvx);
        const attachmentCrossRatio = attachmentJoint
            ? (attachmentJoint.crossOffset ?? 0.5)
            : (childDirection.isVertical ? pvx : pvy);
        const pivot = attachmentJoint && this._getArmatureAttachmentJointWorldPosition
            ? (this._getArmatureAttachmentJointWorldPosition(attachmentJoint, this) || this.getPivotPoint())
            : this.getPivotPoint();
        const childStageW = this._getShapeCrossWidthAtPoint
            ? this._getShapeCrossWidthAtPoint(attachmentAxisRatio, attachmentCrossRatio, childDirection)
            : 0;

        // For shoulder joints, also measure the parent limb at the anchor
        // point — shoulders need a wider contour based on the parent (torso)
        const isShoulder = /upper-?arm/i.test(partKey)
            || /(^|[-])(r|l)-arm$/.test(partKey)
            || /(left|right|front|back)-arm$/.test(partKey);
        const isNeckLike = partKey === 'head-neck'
            || partKey === 'neck'
            || /head[- ]?neck/.test(partKey);
        if (isShoulder || isNeckLike) return;
        let parentStageW = 0;
        if (isShoulder) {
            const parentSpan = parent._getOpaqueHorizontalSpanAtRow?.(anchorY, anchorX);
            if (parentSpan) {
                const anchorPx = Math.max(
                    parentSpan.startPixel,
                    Math.min(
                        parentSpan.endPixel,
                        Math.round(Math.max(0, Math.min(1, anchorX)) * Math.max(1, parentSpan.bitmapWidth - 1))
                    )
                );
                const edgeDepthPx = Math.min(
                    Math.abs(anchorPx - parentSpan.startPixel),
                    Math.abs(parentSpan.endPixel - anchorPx)
                );
                const socketPixels = Math.max(1, edgeDepthPx * 2 + 1);
                parentStageW = socketPixels * (parent.width / Math.max(1, parentSpan.bitmapWidth));
            }
        }

        // Cross-axis width is derived from the local opaque diameter at the joint,
        // not the full object bounds. Shoulder joints can widen slightly using the
        // torso-side socket thickness at the anchor point.
        let crossW;
        if (isShoulder && parentStageW > 0) {
            const localArmW = Math.max(childStageW || 0, Math.min(this.width, this.height) * 0.2);
            const localSocketW = Math.max(parentStageW || 0, 0);
            crossW = Math.max(localArmW, localSocketW);
            crossW = Math.min(
                crossW,
                Math.max(localArmW * 1.12, localSocketW * 1.15, Math.min(this.width, this.height) * 0.7)
            );
        } else if (childStageW > 0) {
            crossW = childStageW;
        } else {
            crossW = Math.min(this.width, this.height) * 0.5;
        }

        // Pin contours should read as the originating limb socket, not as a
        // broad bridge between both connected parts.
        if (isShoulder) crossW *= 0.84;
        else if (/head/i.test(partKey) && !isNeckLike) crossW *= 0.45;
        else if (isNeckLike) crossW *= 0.74;
        else crossW *= 0.82;

        const sf = this.contourSize ?? 1;
        crossW *= sf;
        if (crossW < 2) return;

        const childSampleX = childDirection.isVertical ? attachmentCrossRatio : attachmentAxisRatio;
        const childSampleY = childDirection.isVertical ? attachmentAxisRatio : attachmentCrossRatio;
        const childColor = this._sampleColorAtPoint(childSampleX, childSampleY);
        const parentColor = isShoulder && parent._sampleColorAtPoint
            ? parent._sampleColorAtPoint(anchorX, anchorY)
            : null;
        const contourColor = childColor || parentColor;

        if (isNeckLike) {
            ctx.save();
            ctx.globalAlpha = this.opacity;
            this._fillContourCircle(ctx, pivot.x, pivot.y, crossW / 2, {
                autoSource: 'pin',
                autoSampleColor: contourColor,
                fallbackColor: contourColor || this.pinContourColor || '#888888'
            });
            ctx.restore();
            return;
        }

        // Main-axis length: moderate extension into both limbs
        // Shoulder joints lean slightly more toward the arm side so the bridge
        // follows the raised arm instead of reading like a vertical plug.
        const parentExtension = isShoulder ? crossW * 0.04 : crossW * 0.18;
        const childExtension = isShoulder ? crossW * 0.12 : crossW * 0.2;
        const mainLen = crossW + parentExtension + childExtension;

        // Limb axis in world space: use child's rotation to find the direction
        // the child body extends from the joint (pivot → child center, rotated)
        let localDX = (0.5 - pvx) * this.width;
        let localDY = (0.5 - pvy) * this.height;
        if (isShoulder) {
            const outerDir = (anchorX ?? 0.5) < 0.5 ? -1 : 1;
            const targetXRatio = this._clamp01
                ? this._clamp01(0.5 + outerDir * 0.28)
                : Math.max(0, Math.min(1, 0.5 + outerDir * 0.28));
            const targetYRatio = Math.max(pvy + 0.2, 0.24);
            localDX = (targetXRatio - pvx) * this.width;
            localDY = (targetYRatio - pvy) * this.height;
        }
        const localLen = Math.sqrt(localDX * localDX + localDY * localDY);
        let axisAngle;
        if (localLen > 0.5) {
            const rot = (this.rotation || 0) * Math.PI / 180;
            const cosR = Math.cos(rot), sinR = Math.sin(rot);
            const worldDX = localDX * cosR - localDY * sinR;
            const worldDY = localDX * sinR + localDY * cosR;
            axisAngle = Math.atan2(worldDY, worldDX);
        } else {
            // Fallback: direction from parent center to child pivot in world space
            const pCX = parent.x + parent.width * 0.5;
            const pCY = parent.y + parent.height * 0.5;
            axisAngle = Math.atan2(pivot.y - pCY, pivot.x - pCX);
        }

        // Draw in world space (no parent rotation needed — pin system already
        // positions the child correctly in world coords)
        ctx.save();
        ctx.globalAlpha = this.opacity;

        // Position and orient the capsule along the limb axis
        ctx.translate(pivot.x, pivot.y);
        const cRot = this.contourRotation || 0;
        ctx.rotate(axisAngle - Math.PI / 2 + cRot * Math.PI / 180);

        const hw = crossW / 2;
        const cr = hw;  // full rounding → capsule (stadium) ends
        const drawTop = -(crossW / 2) - parentExtension;

        ctx.beginPath();
        ctx.roundRect(-hw, drawTop, crossW, mainLen, cr);

        // Fill with appropriate mode
        const mode = this._getContourFillMode();
        if (mode === 'picture') {
            const source = this._getContourPictureSource();
            if (source) {
                ctx.save();
                ctx.clip();
                ctx.drawImage(source, -hw, drawTop, crossW, mainLen);
                ctx.restore();
            } else {
                ctx.fillStyle = this._resolveContourPaint(ctx, 0, 0, hw, {
                    autoSource: 'pin', autoSampleColor: contourColor,
                    fallbackColor: contourColor || this.pinContourColor || '#888888'
                });
                ctx.fill();
            }
        } else {
            ctx.fillStyle = this._resolveContourPaint(ctx, 0, 0, hw, {
                autoSource: 'pin', autoSampleColor: contourColor,
                fallbackColor: contourColor || this.pinContourColor || '#888888'
            });
            ctx.fill();
        }
        ctx.restore();
    }

    /**
     * Sample a color from this image object near its pivot point for contour fill.
     * Caches the result after first sample.
     */
    _samplePivotColor() {
        if (this._cachedPivotColor) return this._cachedPivotColor;

        const img = this._eraserCanvas || this.imageElement;
        if (!img) return '#888888';

        try {
            const imgW = img.naturalWidth || img.width;
            const imgH = img.naturalHeight || img.height;
            if (!imgW || !imgH) return '#888888';

            const pvx = this.pivotX ?? 0.5;
            const pvy = this.pivotY ?? 0.5;
            // Sample at pivot position
            const sx = Math.round(pvx * imgW);
            const sy = Math.round(pvy * imgH);

            const c = document.createElement('canvas');
            c.width = imgW;
            c.height = imgH;
            const ctx2 = c.getContext('2d', { willReadFrequently: true });
            ctx2.drawImage(img, 0, 0, imgW, imgH);

            // Sample a small area around the pivot and average
            const sampleR = Math.max(3, Math.round(Math.min(imgW, imgH) * 0.05));
            const x0 = Math.max(0, sx - sampleR);
            const y0 = Math.max(0, sy - sampleR);
            const x1 = Math.min(imgW, sx + sampleR);
            const y1 = Math.min(imgH, sy + sampleR);
            const data = ctx2.getImageData(x0, y0, x1 - x0, y1 - y0).data;

            let r = 0, g = 0, b = 0, count = 0;
            for (let i = 0; i < data.length; i += 4) {
                if (data[i + 3] < 128) continue; // skip transparent
                r += data[i]; g += data[i + 1]; b += data[i + 2]; count++;
            }
            if (count === 0) return '#888888';
            r = Math.round(r / count);
            g = Math.round(g / count);
            b = Math.round(b / count);
            this._cachedPivotColor = '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
            return this._cachedPivotColor;
        } catch (e) {
            return '#888888';
        }
    }

    /**
     * Draw contour discs at rigging bone joints to bridge mesh gaps during deformation.
     * Called after the deformed mesh is drawn.
     */
    _drawRigContours(ctx) {
        const rig = this.rigging;
        if (!rig || !rig.bones || rig.bones.length === 0) return;
        if (!rig.pins || rig.pins.length === 0) return;

        const pinMap = {};
        rig.pins.forEach(p => { pinMap[p.id] = p; });

        // Check if any pin has moved
        const hasMoved = rig.pins.some(p =>
            Math.abs(p.x - p.restX) > 0.0005 || Math.abs(p.y - p.restY) > 0.0005
        );
        if (!hasMoved) return;

        const sizeFactor = this.contourSize ?? 1;

        ctx.save();
        if (this.borderRadius > 0) {
            ctx.beginPath();
            ctx.roundRect(this.x, this.y, this.width, this.height, this.borderRadius);
            ctx.clip();
        } else {
            ctx.beginPath();
            ctx.rect(this.x, this.y, this.width, this.height);
            ctx.clip();
        }

        rig.bones.forEach(bone => {
            const parent = pinMap[bone.parentPinId];
            const child = pinMap[bone.childPinId];
            if (!parent || !child) return;

            // Contour disc at child pin (the joint between two bones)
            // Convert normalized pin position to stage coords
            const jx = this.x + child.x * this.width;
            const jy = this.y + child.y * this.height;

            // Radius based on bone length fraction, scaled by contourSize
            const boneLen = Math.hypot(
                (child.x - parent.x) * this.width,
                (child.y - parent.y) * this.height
            );
            const radius = Math.max(4, boneLen * 0.25) * sizeFactor;

            ctx.save();
            this._fillContourCircle(ctx, jx, jy, radius, {
                autoSource: 'rig',
                fallbackColor: '#888888'
            });
            ctx.restore();
        });

        ctx.restore();
    }

    /**
     * Sample a color from this image near bone joint areas for rig contour fill.
     * Caches the result.
     */
    _sampleRigContourColor() {
        if (this._cachedRigContourColor) return this._cachedRigContourColor;

        const img = this._eraserCanvas || this.imageElement;
        if (!img) return '#888888';

        try {
            const imgW = img.naturalWidth || img.width;
            const imgH = img.naturalHeight || img.height;
            if (!imgW || !imgH) return '#888888';

            const c = document.createElement('canvas');
            c.width = imgW;
            c.height = imgH;
            const ctx2 = c.getContext('2d', { willReadFrequently: true });
            ctx2.drawImage(img, 0, 0, imgW, imgH);

            // Sample center area of image for average color
            const cx = Math.round(imgW * 0.5);
            const cy = Math.round(imgH * 0.5);
            const sr = Math.max(5, Math.round(Math.min(imgW, imgH) * 0.15));
            const x0 = Math.max(0, cx - sr);
            const y0 = Math.max(0, cy - sr);
            const x1 = Math.min(imgW, cx + sr);
            const y1 = Math.min(imgH, cy + sr);
            const data = ctx2.getImageData(x0, y0, x1 - x0, y1 - y0).data;

            let r = 0, g = 0, b = 0, count = 0;
            for (let i = 0; i < data.length; i += 4) {
                if (data[i + 3] < 128) continue;
                r += data[i]; g += data[i + 1]; b += data[i + 2]; count++;
            }
            if (count === 0) return '#888888';
            r = Math.round(r / count);
            g = Math.round(g / count);
            b = Math.round(b / count);
            this._cachedRigContourColor = '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
            return this._cachedRigContourColor;
        } catch (e) {
            return '#888888';
        }
    }

    /**
     * Get cached pixel data from this object's image for contour measurement.
     * Caches based on image source reference with short TTL for eraser canvases.
     */
    _getContourPixels() {
        const img = this._eraserCanvas || this.imageElement;
        if (!img) return null;
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        if (!w || !h) return null;

        const now = performance.now();
        const c = this._contourPixelsCache;
        const sourceUrl = img.currentSrc || img.src || '';
        const immutableSvg = !this._eraserCanvas && sourceUrl.startsWith('data:image/svg+xml')
            && (this._svgCharacterPart === true || this._svgCharacterPremiumPart === true || this._svgAfricanGarmentLayer === true);
        if (c && c.src === img && c.sourceUrl === sourceUrl && c.w === w && c.h === h
            && (immutableSvg || now - c.time < 500)) return c;

        try {
            const cv = document.createElement('canvas');
            cv.width = w; cv.height = h;
            const cx = cv.getContext('2d', { willReadFrequently: true });
            cx.drawImage(img, 0, 0, w, h);
            const result = { pixels: cx.getImageData(0, 0, w, h).data, w, h, src: img, sourceUrl, time: now };
            this._contourPixelsCache = result;
            return result;
        } catch (e) { return null; }
    }

    /**
     * Measure the actual opaque pixel width of this object's image at a given
     * normalized Y position (0-1).  Returns width in image pixels, or 0.
     */
    _measureOpaqueWidthAtRow(normalizedY) {
        const px = this._getContourPixels();
        if (!px) return 0;
        const { pixels, w, h } = px;

        const centerRow = Math.round(Math.max(0, Math.min(h - 1, normalizedY * (h - 1))));
        const band = Math.max(1, Math.round(h * 0.025));
        const rStart = Math.max(0, centerRow - band);
        const rEnd = Math.min(h - 1, centerRow + band);

        let minL = w, maxR = -1;
        for (let r = rStart; r <= rEnd; r++) {
            const off = r * w * 4;
            for (let x = 0; x < w; x++) {
                if (pixels[off + x * 4 + 3] >= 128) {
                    if (x < minL) minL = x;
                    if (x > maxR) maxR = x;
                }
            }
        }
        return maxR >= minL ? (maxR - minL + 1) : 0;
    }

    _getOpaqueHorizontalSpanAtRow(normalizedY, normalizedX = 0.5) {
        const px = this._getContourPixels();
        if (!px) return null;
        const { pixels, w, h } = px;

        const centerRow = Math.round(Math.max(0, Math.min(h - 1, normalizedY * (h - 1))));
        const band = Math.max(1, Math.round(h * 0.025));
        const rStart = Math.max(0, centerRow - band);
        const rEnd = Math.min(h - 1, centerRow + band);
        const targetX = Math.round(Math.max(0, Math.min(w - 1, normalizedX * (w - 1))));
        let best = null;

        for (let r = rStart; r <= rEnd; r++) {
            const rowOffset = r * w * 4;
            let x = 0;
            while (x < w) {
                while (x < w && pixels[rowOffset + x * 4 + 3] < 128) x++;
                if (x >= w) break;
                const start = x;
                while (x < w && pixels[rowOffset + x * 4 + 3] >= 128) x++;
                const end = x - 1;
                const size = end - start + 1;
                const contains = targetX >= start && targetX <= end;
                const dist = contains ? 0 : Math.min(Math.abs(targetX - start), Math.abs(targetX - end));
                const rowPenalty = Math.abs(r - centerRow) * 2;
                const score = (contains ? 100000 : 0) - dist * 8 - rowPenalty + size * 0.25;
                if (!best || score > best.score) {
                    best = { start, end, row: r, size, score };
                }
            }
        }

        if (!best) return null;
        const denom = Math.max(1, w - 1);
        return {
            startPixel: best.start,
            endPixel: best.end,
            rowPixel: best.row,
            sizePixels: best.size,
            bitmapWidth: w,
            bitmapHeight: h,
            start: best.start / denom,
            end: best.end / denom,
            center: ((best.start + best.end) * 0.5) / denom
        };
    }

    _getOpaqueVerticalSpanAtColumn(normalizedX, normalizedY = 0.5) {
        const px = this._getContourPixels();
        if (!px) return null;
        const { pixels, w, h } = px;

        const centerCol = Math.round(Math.max(0, Math.min(w - 1, normalizedX * (w - 1))));
        const band = Math.max(1, Math.round(w * 0.025));
        const cStart = Math.max(0, centerCol - band);
        const cEnd = Math.min(w - 1, centerCol + band);
        const targetY = Math.round(Math.max(0, Math.min(h - 1, normalizedY * (h - 1))));
        let best = null;

        for (let c = cStart; c <= cEnd; c++) {
            let y = 0;
            while (y < h) {
                while (y < h && pixels[(y * w + c) * 4 + 3] < 128) y++;
                if (y >= h) break;
                const start = y;
                while (y < h && pixels[(y * w + c) * 4 + 3] >= 128) y++;
                const end = y - 1;
                const size = end - start + 1;
                const contains = targetY >= start && targetY <= end;
                const dist = contains ? 0 : Math.min(Math.abs(targetY - start), Math.abs(targetY - end));
                const colPenalty = Math.abs(c - centerCol) * 2;
                const score = (contains ? 100000 : 0) - dist * 8 - colPenalty + size * 0.25;
                if (!best || score > best.score) {
                    best = { start, end, col: c, size, score };
                }
            }
        }

        if (!best) return null;
        const denom = Math.max(1, h - 1);
        return {
            startPixel: best.start,
            endPixel: best.end,
            colPixel: best.col,
            sizePixels: best.size,
            bitmapWidth: w,
            bitmapHeight: h,
            start: best.start / denom,
            end: best.end / denom,
            center: ((best.start + best.end) * 0.5) / denom
        };
    }

    _getShapeCrossSpanAtPoint(axisT, crossT, direction) {
        const dir = direction || StageObject.getJointDirectionMeta(this.jointDirection);
        if (this.type !== 'image') return null;
        return dir.isVertical
            ? this._getOpaqueHorizontalSpanAtRow(axisT, crossT)
            : this._getOpaqueVerticalSpanAtColumn(axisT, crossT);
    }

    _getShapeCrossWidthAtPoint(axisT, crossT, direction) {
        const dir = direction || StageObject.getJointDirectionMeta(this.jointDirection);
        const span = this._getShapeCrossSpanAtPoint(axisT, crossT, dir);
        if (span) {
            return dir.isVertical
                ? span.sizePixels * (this.width / Math.max(1, span.bitmapWidth))
                : span.sizePixels * (this.height / Math.max(1, span.bitmapHeight));
        }
        return this._getShapeCrossWidthAtPosition(axisT, dir);
    }

    /**
     * Sample the average opaque colour from this object's image at a given
     * normalized (x, y) position (0-1 each).  Returns hex string or null.
     */
    _sampleColorAtPoint(normalizedX, normalizedY) {
        const px = this._getContourPixels();
        if (!px) return null;
        const { pixels, w, h } = px;

        const sx = Math.round(normalizedX * (w - 1));
        const sy = Math.round(normalizedY * (h - 1));
        const sr = Math.max(3, Math.round(Math.min(w, h) * 0.06));
        const x0 = Math.max(0, sx - sr);
        const y0 = Math.max(0, sy - sr);
        const x1 = Math.min(w, sx + sr + 1);
        const y1 = Math.min(h, sy + sr + 1);

        let rs = 0, gs = 0, bs = 0, cnt = 0;
        for (let row = y0; row < y1; row++) {
            for (let col = x0; col < x1; col++) {
                const i = (row * w + col) * 4;
                if (pixels[i + 3] < 128) continue;
                rs += pixels[i]; gs += pixels[i + 1]; bs += pixels[i + 2]; cnt++;
            }
        }
        if (cnt === 0) return null;
        rs = Math.round(rs / cnt); gs = Math.round(gs / cnt); bs = Math.round(bs / cnt);
        return '#' + ((1 << 24) + (rs << 16) + (gs << 8) + bs).toString(16).slice(1);
    }

    _getContourFillMode() {
        const mode = String(this.contourFillMode || 'auto');
        return ['auto', 'solid', 'pattern', 'linear-gradient', 'radial-gradient', 'picture', 'joint-texture'].includes(mode) ? mode : 'auto';
    }

    _getContourPictureSource() {
        if (this.type === 'image') return this._eraserCanvas || this.imageElement || null;
        return null;
    }

    _createContourPatternFill(ctx, fallbackColor = '#888888') {
        const baseColor = this.contourColor || fallbackColor;
        const accentColor = this.contourPatternColor || '#ffffff';
        const patternType = this.contourPatternType || 'stripes';
        const patternScale = this.contourPatternScale ?? 1;
        const key = `${baseColor}_${accentColor}_${patternType}_${patternScale}`;

        if (this._contourPatternKey !== key || !this._contourPatternCanvas) {
            this._contourPatternKey = key;
            const size = Math.max(8, 16 * patternScale);
            const pc = document.createElement('canvas');
            pc.width = size;
            pc.height = size;
            const pctx = pc.getContext('2d');
            pctx.fillStyle = baseColor;
            pctx.fillRect(0, 0, size, size);
            pctx.strokeStyle = accentColor;
            pctx.fillStyle = accentColor;
            pctx.lineWidth = Math.max(1, size * 0.08);

            switch (patternType) {
                case 'dots':
                    pctx.beginPath();
                    pctx.arc(size / 2, size / 2, size * 0.15, 0, Math.PI * 2);
                    pctx.fill();
                    break;
                case 'crosshatch':
                    pctx.beginPath();
                    pctx.moveTo(0, size); pctx.lineTo(size, 0);
                    pctx.moveTo(0, 0); pctx.lineTo(size, size);
                    pctx.stroke();
                    break;
                case 'checkerboard':
                    pctx.fillRect(0, 0, size / 2, size / 2);
                    pctx.fillRect(size / 2, size / 2, size / 2, size / 2);
                    break;
                case 'stripes':
                default:
                    pctx.beginPath();
                    pctx.moveTo(0, size); pctx.lineTo(size, 0);
                    pctx.moveTo(-size * 0.5, size * 0.5); pctx.lineTo(size * 0.5, -size * 0.5);
                    pctx.moveTo(size * 0.5, size * 1.5); pctx.lineTo(size * 1.5, size * 0.5);
                    pctx.stroke();
                    break;
            }

            this._contourPatternCanvas = pc;
        }

        return ctx.createPattern(this._contourPatternCanvas, 'repeat');
    }

    _resolveContourPaint(ctx, centerX, centerY, radius, options = {}) {
        const mode = options.modeOverride || this._getContourFillMode();
        const fallbackColor = options.fallbackColor || '#888888';

        if (mode === 'solid') {
            return this.contourColor || fallbackColor;
        }

        if (mode === 'pattern') {
            return this._createContourPatternFill(ctx, fallbackColor);
        }

        if (mode === 'linear-gradient') {
            const start = this.contourGradientStart || '#ffffff';
            const end = this.contourGradientEnd || this.contourColor || fallbackColor;
            const rad = (this.contourGradientAngle || 0) * Math.PI / 180;
            const grad = ctx.createLinearGradient(
                centerX - radius * Math.cos(rad),
                centerY - radius * Math.sin(rad),
                centerX + radius * Math.cos(rad),
                centerY + radius * Math.sin(rad)
            );
            grad.addColorStop(0, start);
            grad.addColorStop(1, end);
            return grad;
        }

        if (mode === 'radial-gradient') {
            const start = this.contourGradientStart || '#ffffff';
            const end = this.contourGradientEnd || this.contourColor || fallbackColor;
            const grad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.max(1, radius));
            grad.addColorStop(0, start);
            grad.addColorStop(1, end);
            return grad;
        }

        if (mode === 'auto') {
            if (this.contourColor) return this.contourColor;
            if (options.autoSampleColor) return options.autoSampleColor;
            if (options.autoSource === 'pin') return this.pinContourColor || this._samplePivotColor();
            if (options.autoSource === 'rig') return this._sampleRigContourColor();
            if (this.type === 'image') return this._samplePivotColor();
            const fill = this._resolveFill(ctx);
            if (fill && fill !== 'transparent') return fill;
        }

        return this.contourColor || fallbackColor;
    }

    _fillContourCircle(ctx, centerX, centerY, radius, options = {}) {
        const mode = options.modeOverride || this._getContourFillMode();
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);

        if (mode === 'joint-texture') {
            // Preserve local skin/fabric detail; the base fills transparent source edges.
            ctx.fillStyle = this._resolveContourPaint(ctx, centerX, centerY, radius, { ...options, modeOverride: 'auto' });
            ctx.fill();
            const source = options.jointTexture && this._getContourPictureSource();
            if (source && (source.naturalWidth || source.width) > 0) {
                ctx.save();
                ctx.clip();
                // Orient the local patch between adjoining segments rather than leaving a rigid seam.
                ctx.translate(centerX, centerY);
                ctx.rotate(Math.max(-180, Math.min(180, options.jointTextureAngle || 0)) * Math.PI / 360);
                ctx.translate(-centerX, -centerY);
                ctx.drawImage(source, this.x, this.y, this.width, this.height);
                ctx.restore();
            }
            return;
        }

        if (mode === 'picture') {
            const source = this._getContourPictureSource();
            if (source) {
                ctx.save();
                ctx.clip();
                ctx.drawImage(source, centerX - radius, centerY - radius, radius * 2, radius * 2);
                ctx.restore();
                return;
            }
        }

        ctx.fillStyle = this._resolveContourPaint(ctx, centerX, centerY, radius, options);
        ctx.fill();
    }

    _resolveFill(ctx) {
        if (this.fillType === 'picture' && this.textureImageElement && this.type !== 'image') {
            const pattern = ctx.createPattern(this.textureImageElement, 'no-repeat');
            if (pattern) {
                const srcW = Math.max(1, this.textureImageElement.naturalWidth || this.textureImageElement.width || this.width || 1);
                const srcH = Math.max(1, this.textureImageElement.naturalHeight || this.textureImageElement.height || this.height || 1);
                if (typeof pattern.setTransform === 'function' && typeof DOMMatrix !== 'undefined') {
                    const boxX = Math.min(this.x, this.x + this.width);
                    const boxY = Math.min(this.y, this.y + this.height);
                    const boxW = Math.max(1, Math.abs(this.width));
                    const boxH = Math.max(1, Math.abs(this.height));
                    const centerX = boxX + boxW / 2;
                    const centerY = boxY + boxH / 2;
                    const mode = ['stretch', 'fill', 'fit'].includes(this.pictureFillMode)
                        ? this.pictureFillMode
                        : 'stretch';
                    const angle = Number(this.pictureFillRotation) || 0;
                    const rad = angle * Math.PI / 180;
                    const absCos = Math.abs(Math.cos(rad));
                    const absSin = Math.abs(Math.sin(rad));
                    let scaleX = boxW / srcW;
                    let scaleY = boxH / srcH;

                    if (mode === 'fill') {
                        const requiredW = boxW * absCos + boxH * absSin;
                        const requiredH = boxW * absSin + boxH * absCos;
                        const scale = Math.max(requiredW / srcW, requiredH / srcH);
                        scaleX = scaleY = scale;
                    } else if (mode === 'fit') {
                        const rotatedW = srcW * absCos + srcH * absSin;
                        const rotatedH = srcW * absSin + srcH * absCos;
                        const scale = Math.min(boxW / Math.max(1, rotatedW), boxH / Math.max(1, rotatedH));
                        scaleX = scaleY = scale;
                    }

                    const drawW = srcW * scaleX;
                    const drawH = srcH * scaleY;
                    pattern.setTransform(
                        new DOMMatrix()
                            .translateSelf(centerX, centerY)
                            .rotateSelf(angle)
                            .translateSelf(-drawW / 2, -drawH / 2)
                            .scaleSelf(scaleX, scaleY)
                    );
                }
                return pattern;
            }
        }
        if (this.fillType === 'none') return 'transparent';
        if (this.fillType === 'linear-gradient' && this.gradientStops?.length >= 2) {
            const rad = (this.gradientAngle || 0) * Math.PI / 180;
            const cx = this.x + this.width / 2, cy = this.y + this.height / 2;
            const r = Math.max(this.width, this.height) / 2;
            const grad = ctx.createLinearGradient(
                cx - r * Math.cos(rad), cy - r * Math.sin(rad),
                cx + r * Math.cos(rad), cy + r * Math.sin(rad)
            );
            this.gradientStops.forEach(s => grad.addColorStop(s.offset, s.color));
            return grad;
        }
        if (this.fillType === 'radial-gradient' && this.gradientStops?.length >= 2) {
            const cx = this.x + this.width / 2, cy = this.y + this.height / 2;
            const r = Math.abs(Math.max(this.width, this.height) / 2) || 1;
            const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
            this.gradientStops.forEach(s => grad.addColorStop(s.offset, s.color));
            return grad;
        }
        if (this.fillType === 'pattern' && this.patternType && this.patternType !== 'none') {
            return this._createPatternFill(ctx);
        }
        return this.fill;
    }

    /**
     * Create a canvas-based pattern fill.
     * Cached — only rebuilt when pattern params change.
     */
    _createPatternFill(ctx) {
        const patKey = `${this.fill}_${this.patternColor}_${this.patternType}_${this.patternScale}`;
        if (this._patternKey !== patKey || !this._patternCanvas) {
            this._patternKey = patKey;
            const sz = Math.max(8, 16 * (this.patternScale || 1));
            const pc = document.createElement('canvas');
            pc.width = sz; pc.height = sz;
            const pctx = pc.getContext('2d');
            // Fill base color
            pctx.fillStyle = this.fill;
            pctx.fillRect(0, 0, sz, sz);
            pctx.strokeStyle = this.patternColor || '#fff';
            pctx.fillStyle = this.patternColor || '#fff';
            pctx.lineWidth = Math.max(1, sz * 0.08);
            switch (this.patternType) {
                case 'stripes':
                    pctx.beginPath();
                    pctx.moveTo(0, sz); pctx.lineTo(sz, 0);
                    pctx.moveTo(-sz * 0.5, sz * 0.5); pctx.lineTo(sz * 0.5, -sz * 0.5);
                    pctx.moveTo(sz * 0.5, sz * 1.5); pctx.lineTo(sz * 1.5, sz * 0.5);
                    pctx.stroke();
                    break;
                case 'dots':
                    pctx.beginPath();
                    pctx.arc(sz / 2, sz / 2, sz * 0.15, 0, Math.PI * 2);
                    pctx.fill();
                    break;
                case 'crosshatch':
                    pctx.beginPath();
                    pctx.moveTo(0, sz); pctx.lineTo(sz, 0);
                    pctx.moveTo(0, 0); pctx.lineTo(sz, sz);
                    pctx.stroke();
                    break;
                case 'checkerboard':
                    pctx.fillRect(0, 0, sz / 2, sz / 2);
                    pctx.fillRect(sz / 2, sz / 2, sz / 2, sz / 2);
                    break;
            }
            this._patternCanvas = pc;
        }
        return ctx.createPattern(this._patternCanvas, 'repeat');
    }

    /**
     * Draw bevel effect (highlight + shadow borders).
     */
    _drawBevel(ctx) {
        const b = Math.max(1, this.bevelSize || 4);
        ctx.save();
        ctx.globalAlpha = 0.5;
        // Top-left highlight
        ctx.strokeStyle = this.bevelHighlight;
        ctx.lineWidth = b;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y + this.height);
        ctx.lineTo(this.x, this.y);
        ctx.lineTo(this.x + this.width, this.y);
        ctx.stroke();
        // Bottom-right shadow
        ctx.strokeStyle = this.bevelShadow;
        ctx.beginPath();
        ctx.moveTo(this.x + this.width, this.y);
        ctx.lineTo(this.x + this.width, this.y + this.height);
        ctx.lineTo(this.x, this.y + this.height);
        ctx.stroke();
        ctx.restore();
    }

    /**
     * Draw reflection effect below the object.
     */
    _drawReflection(ctx) {
        const gap = this.reflectionOffset || 0;
        ctx.save();
        const pivot = this.getPivotPoint();
        if (this.rotation !== 0) {
            ctx.translate(pivot.x, pivot.y);
            ctx.rotate(Utils.degToRad(this.rotation));
            ctx.translate(-pivot.x, -pivot.y);
        }
        // Position reflected image below
        const reflY = this.y + this.height + gap;
        ctx.translate(this.x + this.width / 2, reflY);
        ctx.scale(1, -1);
        ctx.translate(-(this.x + this.width / 2), -this.y);
        // Clip to a rectangle and apply fade gradient
        ctx.beginPath();
        ctx.rect(this.x - 2, this.y, this.width + 4, this.height);
        ctx.clip();
        ctx.globalAlpha = this.reflectionOpacity || 0.3;
        // Re-render the shape (simplified - just re-render the fill)
        ctx.fillStyle = this._resolveFill(ctx);
        ctx.strokeStyle = this.stroke;
        ctx.lineWidth = this.strokeWidth;
        switch (this.type) {
            case 'rectangle': this.drawRectangle(ctx); break;
            case 'circle': this.drawCircle(ctx); break;
            case 'triangle': this.drawTriangle(ctx); break;
            case 'star': this.drawStar(ctx); break;
            case 'polygon': this.drawPolygon(ctx); break;
            case 'diamond': this.drawDiamond(ctx); break;
            case 'heart': this.drawHeart(ctx); break;
            case 'image': this.drawImage(ctx); break;
            case 'freeform': this.drawFreeform(ctx); break;
            case 'line': this.drawLine(ctx); break;
            case 'arrow': this.drawArrow(ctx); break;
            case 'doubleArrow': this.drawDoubleArrow(ctx); break;
            case 'curvedArrow': this.drawCurvedArrow(ctx); break;
            case 'scribble': this.drawScribble(ctx); break;
            default:
                if (StageObject.isCustomShapeType(this.type)) this.drawPresetShape(ctx);
                break;
        }
        ctx.restore();
    }

    drawPresetShape(ctx) {
        if (this.type === 'roundedRectangle' && StageObject.supportsTiltType(this.type) && !this.getDepthExtrusionVector().active) {
            this._withTiltTransform(ctx, () => StageObject.drawCustomShape(ctx, this, false));
            return;
        }
        StageObject.drawCustomShape(ctx, this, false);
    }

    drawPivotPoint(ctx) {
        const p = this.getPivotPoint();
        ctx.save();
        // Outer circle
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
        ctx.stroke();
        // Inner dot
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
        // Crosshair lines
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x - 12, p.y); ctx.lineTo(p.x - 4, p.y);
        ctx.moveTo(p.x + 4, p.y);  ctx.lineTo(p.x + 12, p.y);
        ctx.moveTo(p.x, p.y - 12); ctx.lineTo(p.x, p.y - 4);
        ctx.moveTo(p.x, p.y + 4);  ctx.lineTo(p.x, p.y + 12);
        ctx.stroke();
        ctx.restore();
    }

    drawRectangle(ctx) {
        const drawRect = () => {
            if (this.borderRadius > 0) {
                const r = Math.min(this.borderRadius, this.width / 2, this.height / 2);
                ctx.beginPath();
                ctx.roundRect(this.x, this.y, this.width, this.height, r);
                ctx.fill();
                if (this.strokeWidth > 0) ctx.stroke();
            } else {
                ctx.fillRect(this.x, this.y, this.width, this.height);
                if (this.strokeWidth > 0) ctx.strokeRect(this.x, this.y, this.width, this.height);
            }
        };

        if (StageObject.supportsTiltType(this.type) && !this.getDepthExtrusionVector().active) {
            this._withTiltTransform(ctx, drawRect);
            return;
        }

        drawRect();
    }

    drawCircle(ctx) {
        ctx.beginPath();
        ctx.ellipse(
            this.x + this.width / 2,
            this.y + this.height / 2,
            Math.abs(this.width / 2) || 1,
            Math.abs(this.height / 2) || 1,
            0, 0, Math.PI * 2
        );
        ctx.fill();
        if (this.strokeWidth > 0) ctx.stroke();
    }

    drawTriangle(ctx) {
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2, this.y);
        ctx.lineTo(this.x + this.width, this.y + this.height);
        ctx.lineTo(this.x, this.y + this.height);
        ctx.closePath();
        ctx.fill();
        if (this.strokeWidth > 0) ctx.stroke();
    }

    drawStar(ctx) {
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        const outerR = Math.min(this.width, this.height) / 2;
        const innerR = outerR * this.innerRadius;
        const points = this.sides;

        ctx.beginPath();
        for (let i = 0; i < points * 2; i++) {
            const r = i % 2 === 0 ? outerR : innerR;
            const angle = (i * Math.PI / points) - Math.PI / 2;
            const x = cx + r * Math.cos(angle);
            const y = cy + r * Math.sin(angle);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        if (this.strokeWidth > 0) ctx.stroke();
    }

    drawPolygon(ctx) {
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        const r = Math.min(this.width, this.height) / 2;
        const sides = this.sides;

        ctx.beginPath();
        for (let i = 0; i < sides; i++) {
            const angle = (i * 2 * Math.PI / sides) - Math.PI / 2;
            const x = cx + r * Math.cos(angle);
            const y = cy + r * Math.sin(angle);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        if (this.strokeWidth > 0) ctx.stroke();
    }

    drawLine(ctx) {
        if (!(this.strokeWidth > 0)) return;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + this.width, this.y + this.height);
        ctx.strokeStyle = this.stroke || this.fill;
        ctx.lineWidth = this.strokeWidth;
        ctx.stroke();
    }

    drawText(ctx) {
        const applyTransform = (value) => {
            const text = String(value || '');
            if (this.textTransform === 'uppercase') return text.toUpperCase();
            if (this.textTransform === 'lowercase') return text.toLowerCase();
            if (this.textTransform === 'title') {
                return text.replace(/\b([A-Za-z][A-Za-z'’-]*)\b/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
            }
            return text;
        };
        // Strip a leading marker the user (or a previous list style) may have
        // typed so toggling list styles is non-destructive.
        const stripLeadingMarker = (line) => {
            return String(line || '').replace(/^\s*(?:[•●◦‣▪▶➤➔→★]|[-–—]|\d{1,3}\.|\d{1,3}\))\s+/, '');
        };
        const listStyle = this.listStyle || 'none';
        const listIndentPx = Math.max(0, Number(this.listIndent) || 0);
        const markerFor = (index) => {
            switch (listStyle) {
                case 'bullet': return '•';
                case 'dash':   return '–';
                case 'check':  return '✓';
                case 'arrow':  return '➤';
                case 'number': return (index + 1) + '.';
                default:       return '';
            }
        };
        const fontStyleStr = this.fontStyle === 'italic' ? 'italic ' : '';
        ctx.font = `${fontStyleStr}${this.fontWeight} ${this.fontSize}px ${this.fontFamily}`;
        ctx.fillStyle = this.textColor || this.fill;
        ctx.textAlign = this.textAlign;
        ctx.textBaseline = 'top';
        if (this.shadow) {
            ctx.shadowColor = this.shadowColor || 'rgba(0,0,0,0.3)';
            ctx.shadowBlur = this.shadowBlur ?? 10;
            ctx.shadowOffsetX = this.shadowOffsetX ?? 2;
            ctx.shadowOffsetY = this.shadowOffsetY ?? 4;
        }
        // Word spacing (additional gap inserted between words; applies to fillText/strokeText only)
        const wordSpacingPx = Number(this.wordSpacing) || 0;
        if (wordSpacingPx !== 0 && 'wordSpacing' in ctx) {
            try { ctx.wordSpacing = wordSpacingPx + 'px'; } catch (_) { /* unsupported */ }
        }

        const lines = applyTransform(this.text).split('\n');
        // Compute per-line marker prefix; numbered lists count only non-empty
        // lines so a blank line doesn't bump the counter unexpectedly.
        let markerCounter = 0;
        const linePrefixes = lines.map(line => {
            if (listStyle === 'none' || !line.trim()) return '';
            const m = markerFor(markerCounter++);
            return m ? m + ' ' : '';
        });
        // Re-write lines so measurement + drawing use the prefixed text.
        const renderedLines = listStyle === 'none'
            ? lines
            : lines.map((line, i) => linePrefixes[i] + stripLeadingMarker(line));
        const lineHeight = this.fontSize * (this.lineHeight || 1.4);
        // Vertical alignment offset within the object's height box
        const totalTextHeight = lines.length * lineHeight;
        const vAlign = this.textVerticalAlign || 'top';
        let yOffset = 0;
        if (vAlign === 'middle') yOffset = Math.max(0, (this.height - totalTextHeight) / 2);
        else if (vAlign === 'bottom') yOffset = Math.max(0, this.height - totalTextHeight);
        let offsetX = 0;
        
        if (this.textAlign === 'center') offsetX = this.width / 2;
        else if (this.textAlign === 'right') offsetX = this.width;

        // Letter spacing
        const spacing = this.letterSpacing || 0;
        const strokeWidth = Math.max(0, Number(this.textStrokeWidth) || 0);
        const backgroundEnabled = !!this.textBackgroundEnabled;
        const backgroundPadding = Math.max(0, Number(this.textBackgroundPadding) || 0);
        const backgroundRadius = Math.max(0, Number(this.textBackgroundRadius) || 0);
        const measureLineWidth = (line) => {
            const chars = Array.from(line || '');
            if (!chars.length) return 0;
            return chars.reduce((sum, char, index) => sum + ctx.measureText(char).width + (index < chars.length - 1 ? spacing : 0), 0);
        };
        const lineWidths = renderedLines.map(measureLineWidth);
        const drawGlyph = (text, x, y, maxWidth) => {
            if (strokeWidth > 0) {
                ctx.lineWidth = strokeWidth;
                ctx.strokeStyle = this.textStrokeColor || '#000000';
                ctx.lineJoin = 'round';
                ctx.strokeText(text, x, y, maxWidth);
            }
            ctx.fillText(text, x, y, maxWidth);
        };
        const drawBackgroundBlock = () => {
            if (!backgroundEnabled || !lines.length) return;
            const maxLineWidth = lineWidths.reduce((max, width) => Math.max(max, width), 0);
            const textHeight = lines.length > 0 ? ((lines.length - 1) * lineHeight) + this.fontSize : this.fontSize;
            let blockLeft = this.x;
            if (this.textAlign === 'center') blockLeft = this.x + this.width / 2 - maxLineWidth / 2;
            else if (this.textAlign === 'right') blockLeft = this.x + this.width - maxLineWidth;
            const blockTop = this.y - backgroundPadding * 0.6;

            ctx.save();
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            ctx.fillStyle = this.textBackgroundColor || '#111827';
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(blockLeft - backgroundPadding, blockTop, maxLineWidth + backgroundPadding * 2, textHeight + backgroundPadding * 1.2, backgroundRadius);
            else ctx.rect(blockLeft - backgroundPadding, blockTop, maxLineWidth + backgroundPadding * 2, textHeight + backgroundPadding * 1.2);
            ctx.fill();
            ctx.restore();
        };
        const drawCurvedLine = (line, lineIndex) => {
            const chars = Array.from(line || '');
            if (!chars.length) return;
            const curveDegrees = Number(this.textCurve) || 0;
            const curveRadians = curveDegrees * Math.PI / 180;
            if (Math.abs(curveRadians) < 0.01 || chars.length < 2) return false;

            const advances = chars.map((char, index) => ctx.measureText(char).width + (index < chars.length - 1 ? spacing : 0));
            const totalAdvance = advances.reduce((sum, width) => sum + width, 0);
            if (totalAdvance <= 0) return false;

            const radius = Math.max(totalAdvance / Math.abs(curveRadians), this.fontSize * 1.6);
            const baseCenterX = this.x + this.width / 2;
            const baseLineY = this.y + yOffset + lineIndex * lineHeight + this.fontSize * 0.6;
            const circleCenterY = baseLineY + (curveDegrees > 0 ? radius : -radius);
            const baseAngle = curveDegrees > 0 ? -Math.PI / 2 : Math.PI / 2;
            let cursor = -totalAdvance / 2;

            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            chars.forEach((char, index) => {
                const charWidth = ctx.measureText(char).width;
                const midAdvance = cursor + charWidth / 2;
                const angle = baseAngle + (midAdvance / totalAdvance) * curveRadians;
                const glyphX = baseCenterX + radius * Math.cos(angle);
                const glyphY = circleCenterY + radius * Math.sin(angle);
                const rotation = angle + (curveDegrees > 0 ? Math.PI / 2 : -Math.PI / 2);

                ctx.save();
                ctx.translate(glyphX, glyphY);
                ctx.rotate(rotation);
                drawGlyph(char, 0, 0);
                if (this.textDecoration && this.textDecoration !== 'none') {
                    ctx.strokeStyle = this.textColor || this.fill;
                    ctx.lineWidth = Math.max(1, this.fontSize / 14);
                    if (this.textDecoration.includes('underline')) {
                        ctx.beginPath();
                        ctx.moveTo(-charWidth / 2, this.fontSize * 0.38);
                        ctx.lineTo(charWidth / 2, this.fontSize * 0.38);
                        ctx.stroke();
                    }
                    if (this.textDecoration.includes('line-through')) {
                        ctx.beginPath();
                        ctx.moveTo(-charWidth / 2, 0);
                        ctx.lineTo(charWidth / 2, 0);
                        ctx.stroke();
                    }
                }
                ctx.restore();
                cursor += advances[index];
            });
            ctx.restore();
            return true;
        };

        drawBackgroundBlock();
        
        lines.forEach((rawLine, i) => {
            const line = renderedLines[i];
            if (drawCurvedLine(line, i)) return;
            const yPos = this.y + yOffset + i * lineHeight;
            if (spacing !== 0) {
                // Manual letter spacing
                let xCursor = this.x + offsetX;
                if (this.textAlign === 'center') {
                    const totalW = ctx.measureText(line).width + (line.length - 1) * spacing;
                    xCursor = this.x + this.width / 2 - totalW / 2;
                } else if (this.textAlign === 'right') {
                    const totalW = ctx.measureText(line).width + (line.length - 1) * spacing;
                    xCursor = this.x + this.width - totalW;
                }
                ctx.textAlign = 'left';
                for (let c = 0; c < line.length; c++) {
                    drawGlyph(line[c], xCursor, yPos);
                    xCursor += ctx.measureText(line[c]).width + spacing;
                }
                ctx.textAlign = this.textAlign; // restore
            } else {
                drawGlyph(line, this.x + offsetX, yPos, this.width);
            }
            // Text decoration
            if (this.textDecoration && this.textDecoration !== 'none') {
                const metrics = ctx.measureText(line);
                let decoX = this.x + offsetX;
                const w = metrics.width;
                if (this.textAlign === 'center') decoX -= w / 2;
                else if (this.textAlign === 'right') decoX -= w;
                ctx.save();
                ctx.strokeStyle = this.textColor || this.fill;
                ctx.lineWidth = Math.max(1, this.fontSize / 14);
                if (this.textDecoration.includes('underline')) {
                    ctx.beginPath();
                    ctx.moveTo(decoX, yPos + this.fontSize + 2);
                    ctx.lineTo(decoX + w, yPos + this.fontSize + 2);
                    ctx.stroke();
                }
                if (this.textDecoration.includes('line-through')) {
                    ctx.beginPath();
                    ctx.moveTo(decoX, yPos + this.fontSize * 0.55);
                    ctx.lineTo(decoX + w, yPos + this.fontSize * 0.55);
                    ctx.stroke();
                }
                ctx.restore();
            }
        });

        // Calculate actual height from text (store as computed, don't mutate during animation)
        const computedH = Math.max(lineHeight * lines.length, this.fontSize);
        if (!this._animatingHeight) this.height = computedH;
    }

    /**
     * Draw text centered on a non-text shape (e.g. SmartArt labels on rectangles/circles).
     */
    _renderShapeText(ctx) {
        ctx.save();
        const fontSize = this.fontSize || 14;
        const fontWeight = this.fontWeight || '400';
        const fontFamily = this.fontFamily || 'Inter, sans-serif';
        const fontStyleStr = this.fontStyle === 'italic' ? 'italic ' : '';
        ctx.font = `${fontStyleStr}${fontWeight} ${fontSize}px ${fontFamily}`;
        ctx.fillStyle = this.textColor || '#ffffff';
        ctx.textAlign = this.textAlign || 'center';
        ctx.textBaseline = 'middle';

        const padding = 6;
        const maxW = this.width - padding * 2;
        const lineHeight = fontSize * 1.3;
        const lines = [];
        const words = this.text.split(/\s+/);
        let currentLine = '';
        for (const word of words) {
            const test = currentLine ? currentLine + ' ' + word : word;
            if (ctx.measureText(test).width > maxW && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = test;
            }
        }
        if (currentLine) lines.push(currentLine);

        const totalH = lines.length * lineHeight;
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        const startY = cy - totalH / 2 + lineHeight / 2;
        const backgroundEnabled = !!this.textBackgroundEnabled;
        const backgroundPadding = Math.max(0, Number(this.textBackgroundPadding) || 0);
        const backgroundRadius = Math.max(0, Number(this.textBackgroundRadius) || 0);
        const maxLineWidth = lines.reduce((max, line) => Math.max(max, ctx.measureText(line).width), 0);

        let offsetX = 0;
        if (ctx.textAlign === 'left') offsetX = -this.width / 2 + padding;
        else if (ctx.textAlign === 'right') offsetX = this.width / 2 - padding;

        if (backgroundEnabled && lines.length) {
            let blockLeft = cx - maxLineWidth / 2;
            if (ctx.textAlign === 'left') blockLeft = cx + offsetX;
            else if (ctx.textAlign === 'right') blockLeft = cx + offsetX - maxLineWidth;
            // Vertically centred block: matches the visible glyph stack rendered with textBaseline='middle'
            const blockTop = cy - totalH / 2 - backgroundPadding * 0.5;
            const blockHeight = totalH + backgroundPadding;

            ctx.save();
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            ctx.fillStyle = this.textBackgroundColor || '#111827';
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(blockLeft - backgroundPadding, blockTop, maxLineWidth + backgroundPadding * 2, blockHeight, backgroundRadius);
            else ctx.rect(blockLeft - backgroundPadding, blockTop, maxLineWidth + backgroundPadding * 2, blockHeight);
            ctx.fill();
            ctx.restore();
        }

        for (let i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i], cx + offsetX, startY + i * lineHeight, maxW);
        }
        ctx.restore();
    }

    drawImage(ctx) {
        if (this.realistic3D) {
            globalThis.Realistic3DLibrary?.draw(ctx, this, () => globalThis.app?.stage?.requestRender());
            return;
        }
        const draw = () => {
            // Use mesh deformation if rigging pins have been displaced
            if (this.rigging && this.rigging.pins && this.rigging.pins.length > 0) {
                if (typeof RiggingUtils !== 'undefined' && RiggingUtils.renderDeformedImage(ctx, this)) {
                    // Draw contour discs at bone joints to bridge mesh gaps
                    if (this.rigContours) {
                        this._drawRigContours(ctx);
                    }
                    if (this.strokeWidth > 0) {
                        ctx.strokeRect(this.x, this.y, this.width, this.height);
                    }
                    return;
                }
            }

            // Determine image source: animated GIF frame or static image
            let imgSource;
            if (this.isAnimatedGif && this._gifFrames && this._gifFrames.length > 1) {
                // Compute current frame from elapsed time
                const elapsed = (performance.now() - this._gifStartTime) % this._gifTotalDuration;
                let acc = 0;
                let idx = 0;
                for (let i = 0; i < this.gifFrameDelays.length; i++) {
                    acc += this.gifFrameDelays[i];
                    if (elapsed < acc) { idx = i; break; }
                }
                imgSource = this._gifFrames[idx];
            } else {
                imgSource = globalThis.ArmatureViewState?.blendImage(this, src => this._crossViewImages?.get(src))
                    || this._eraserCanvas || this._audioLipSyncImageElement || this.imageElement;
            }

            if (imgSource) {
                ctx.save();
                const filters = [];
                if (this.imgBrightness) filters.push(`brightness(${1 + this.imgBrightness / 100})`);
                if (this.imgContrast) filters.push(`contrast(${1 + this.imgContrast / 100})`);
                if (this.imgSaturation) filters.push(`saturate(${1 + this.imgSaturation / 100})`);
                if (this.imgHue) filters.push(`hue-rotate(${this.imgHue}deg)`);
                if (this.imgBlur) filters.push(`blur(${this.imgBlur}px)`);
                if (this.imgGrayscale) filters.push(`grayscale(${this.imgGrayscale}%)`);
                if (this.imgSepia) filters.push(`sepia(${this.imgSepia}%)`);
                if (this.imgInvert) filters.push(`invert(${this.imgInvert}%)`);
                if (filters.length > 0) ctx.filter = filters.join(' ');

                const spriteRect = this._getCurrentSpriteFrameRect(imgSource);
                const isCompressionActive = ((this._compressionRig?.amount || 0) > 0) || ((this._compressionPair?.amount || 0) > 0);
                // Always clip image drawing to the object bounds so bitmap pixels
                // stay aligned with the visible selection/bounding box while resizing.
                const mustClipToBounds = true;

                if (mustClipToBounds) {
                    ctx.beginPath();
                    if (this.borderRadius > 0 && ctx.roundRect) ctx.roundRect(this.x, this.y, this.width, this.height, this.borderRadius);
                    else ctx.rect(this.x, this.y, this.width, this.height);
                    ctx.clip();
                }

                if (isCompressionActive) {
                    if (spriteRect) ctx.drawImage(imgSource, spriteRect.x, spriteRect.y, spriteRect.width, spriteRect.height, this.x, this.y, this.width, this.height);
                    else ctx.drawImage(imgSource, this.x, this.y, this.width, this.height);
                } else {
                    const imgW = Math.max(1, spriteRect?.width || imgSource.naturalWidth || imgSource.width || this.width || 1);
                    const imgH = Math.max(1, spriteRect?.height || imgSource.naturalHeight || imgSource.height || this.height || 1);
                    const zoom = Number.isFinite(this.imageZoom) ? this.imageZoom : 1;
                    const panX = Number.isFinite(this.imagePanX) ? this.imagePanX : 0;
                    const panY = Number.isFinite(this.imagePanY) ? this.imagePanY : 0;
                    const useCropFit = zoom > 1.0001 || Math.abs(panX) > 0.0001 || Math.abs(panY) > 0.0001;
                    if (!useCropFit) {
                        if (spriteRect) ctx.drawImage(imgSource, spriteRect.x, spriteRect.y, spriteRect.width, spriteRect.height, this.x, this.y, this.width, this.height);
                        else ctx.drawImage(imgSource, this.x, this.y, this.width, this.height);
                    } else {
                        const coverScale = Math.max(this.width / imgW, this.height / imgH);
                        const drawW = imgW * coverScale * zoom;
                        const drawH = imgH * coverScale * zoom;
                        const extraX = Math.max(0, drawW - this.width);
                        const extraY = Math.max(0, drawH - this.height);
                        const drawX = this.x - extraX / 2 - panX * (extraX / 2);
                        const drawY = this.y - extraY / 2 - panY * (extraY / 2);
                        if (spriteRect) ctx.drawImage(imgSource, spriteRect.x, spriteRect.y, spriteRect.width, spriteRect.height, drawX, drawY, drawW, drawH);
                        else ctx.drawImage(imgSource, drawX, drawY, drawW, drawH);
                    }
                }
                ctx.filter = 'none';

                if (this.imgTintAmount > 0) {
                    ctx.globalAlpha = this.imgTintAmount / 100;
                    ctx.globalCompositeOperation = 'source-atop';
                    ctx.fillStyle = this.imgTintColor;
                    ctx.fillRect(this.x, this.y, this.width, this.height);
                    ctx.globalCompositeOperation = 'source-over';
                    ctx.globalAlpha = this.opacity;
                }

                ctx.restore();

                if (this.strokeWidth > 0) {
                    ctx.strokeRect(this.x, this.y, this.width, this.height);
                }
            } else {
                ctx.fillStyle = '#2a2a45';
                ctx.fillRect(this.x, this.y, this.width, this.height);
                ctx.fillStyle = '#6a6a82';
                ctx.font = '14px Inter';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('Loading...', this.x + this.width / 2, this.y + this.height / 2);
            }
        };
        if (this.getDepthExtrusionVector().active) draw();
        else this._withTiltTransform(ctx, draw);
    }

    drawPath(ctx) {
        if (this.pathPoints.length < 2 || !(this.strokeWidth > 0)) return;
        ctx.beginPath();
        ctx.moveTo(this.pathPoints[0].x, this.pathPoints[0].y);
        for (let i = 1; i < this.pathPoints.length; i++) {
            ctx.lineTo(this.pathPoints[i].x, this.pathPoints[i].y);
        }
        ctx.strokeStyle = this.stroke || this.fill;
        ctx.lineWidth = this.strokeWidth;
        ctx.lineCap = this.strokeCap || 'round';
        ctx.lineJoin = this.strokeJoin || 'round';
        ctx.stroke();
    }

    drawIcon(ctx) {
        if (!this.iconPath) return;
        const draw = () => {
            const vb = (this.iconViewBox || '0 0 100 100').split(' ').map(Number);
            const vbW = vb[2] || 100, vbH = vb[3] || 100;
            const sx = this.width / vbW, sy = this.height / vbH;
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.scale(sx, sy);
            ctx.translate(-vb[0], -vb[1]);
            const subPaths = this.iconPath.split('|');
            subPaths.forEach(sp => {
                const p = new Path2D(sp.trim());
                ctx.fill(p);
                if (this.strokeWidth > 0) ctx.stroke(p);
            });
            ctx.restore();
        };
        if (this.getDepthExtrusionVector().active) draw();
        else this._withTiltTransform(ctx, draw);
    }

    // Returns the caption segment active at the given timeline time (ms), or null.
    _getActiveCaptionSegment(timeMs) {
        const segments = Array.isArray(this.segments) ? this.segments : [];
        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];
            const start = Number(segment.startMs) || 0;
            const end = Number(segment.endMs) || 0;
            if (timeMs >= start && timeMs < end) return segment;
        }
        return null;
    }

    /**
     * Render the active caption segment (time-gated subtitle text) inside the
     * object box whose top-left is (originX, originY) in the current ctx space.
     * Shared by the main stage renderer and the preview/raster/video export path.
     */
    paintCaption(ctx, originX, originY) {
        if (globalThis.Realistic3DLibrary?.isPreviewingCaption?.(ctx,this.captionAudioId)) return;
        const timeMs = Number(window.app?.animations?.currentTime) || 0;
        if (globalThis.CaptionRuntime) return globalThis.CaptionRuntime.paint(ctx, this, originX, originY, timeMs, { objects: window.app?.objects?.objects });
        const active = this._getActiveCaptionSegment(timeMs);
        if (!active) return;
        const primaryText = String(active.text || '');
        const bilingual = !!this.bilingual;
        const secondaryText = bilingual ? String(active.secondary || '') : '';
        if (!primaryText.trim() && !secondaryText.trim()) return;

        const width = Math.max(1, Number(this.width) || 400);
        const height = Math.max(1, Number(this.height) || 100);
        const pad = 8;
        const maxW = Math.max(1, width - pad * 2);

        const fontStyleStr = this.fontStyle === 'italic' ? 'italic ' : '';
        const weight = this.fontWeight || '600';
        const family = this.fontFamily || 'Inter';
        const lineHeightRatio = this.lineHeight || 1.3;
        const primaryFs = Math.max(6, Number(this.fontSize) || 28);
        const secondaryFs = Math.max(6, Math.round(primaryFs * (Number(this.secondaryFontScale) || 0.85)));

        // Wrap a text block to the caption width at a given font size.
        const wrap = (text, fontSize) => {
            ctx.font = `${fontStyleStr}${weight} ${fontSize}px ${family}`;
            const spaceW = ctx.measureText(' ').width;
            const lines = [];
            String(text).split('\n').forEach(paragraph => {
                const words = paragraph.split(/\s+/).filter(Boolean);
                if (!words.length) { lines.push([]); return; }
                let current = [];
                let currentW = 0;
                words.forEach(word => {
                    const w = ctx.measureText(word).width;
                    const advance = current.length ? spaceW + w : w;
                    if (currentW + advance > maxW && current.length) {
                        lines.push(current);
                        current = [{ text: word, w }];
                        currentW = w;
                    } else {
                        current.push({ text: word, w });
                        currentW += advance;
                    }
                });
                lines.push(current);
            });
            return { lines, spaceW, lineHeight: fontSize * lineHeightRatio };
        };

        const primaryWrap = primaryText.trim() ? wrap(primaryText, primaryFs) : null;
        const secondaryWrap = (bilingual && secondaryText.trim()) ? wrap(secondaryText, secondaryFs) : null;
        const gap = (primaryWrap && secondaryWrap) ? Math.max(0, Number(this.secondaryGap) || 6) : 0;
        const primaryH = primaryWrap ? primaryWrap.lines.length * primaryWrap.lineHeight : 0;
        const secondaryH = secondaryWrap ? secondaryWrap.lines.length * secondaryWrap.lineHeight : 0;
        const totalH = primaryH + (secondaryH ? gap + secondaryH : 0);

        const vAlign = this.captionVerticalAlign || this.textVerticalAlign || 'bottom';
        let startY;
        if (vAlign === 'top') startY = originY + pad;
        else if (vAlign === 'middle') startY = originY + (height - totalH) / 2;
        else startY = originY + height - totalH - pad;

        const align = this.textAlign || 'center';
        const lineWidth = (line, spaceW) => line.reduce((sum, word, index) => sum + word.w + (index ? spaceW : 0), 0);
        const lineStartX = (line, spaceW) => {
            const lw = lineWidth(line, spaceW);
            if (align === 'left') return originX + pad;
            if (align === 'right') return originX + width - pad - lw;
            return originX + width / 2 - lw / 2;
        };

        if (this.textBackgroundEnabled) {
            let maxLineWidth = 0;
            if (primaryWrap) primaryWrap.lines.forEach(line => { maxLineWidth = Math.max(maxLineWidth, lineWidth(line, primaryWrap.spaceW)); });
            if (secondaryWrap) secondaryWrap.lines.forEach(line => { maxLineWidth = Math.max(maxLineWidth, lineWidth(line, secondaryWrap.spaceW)); });
            if (maxLineWidth > 0) {
                const bgPad = Math.max(0, Number(this.textBackgroundPadding) || 10);
                const bgRadius = Math.max(0, Number(this.textBackgroundRadius) || 8);
                let bgLeft;
                if (align === 'left') bgLeft = originX + pad;
                else if (align === 'right') bgLeft = originX + width - pad - maxLineWidth;
                else bgLeft = originX + width / 2 - maxLineWidth / 2;
                ctx.save();
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
                ctx.fillStyle = this.textBackgroundColor || 'rgba(0,0,0,0.6)';
                ctx.beginPath();
                const bx = bgLeft - bgPad;
                const by = startY - bgPad * 0.6;
                const bw = maxLineWidth + bgPad * 2;
                const bh = totalH + bgPad * 1.2;
                if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, bgRadius);
                else ctx.rect(bx, by, bw, bh);
                ctx.fill();
                ctx.restore();
            }
        }

        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';
        const strokeW = Math.max(0, Number(this.textStrokeWidth) || 0);
        let y = startY;

        if (primaryWrap) {
            ctx.font = `${fontStyleStr}${weight} ${primaryFs}px ${family}`;
            const baseColor = this.textColor || '#ffffff';
            const highlightOn = this.captionHighlightEnabled
                && Array.isArray(active.words) && active.words.length > 0;
            const activeWordIndex = highlightOn
                ? active.words.findIndex(word => timeMs >= (Number(word.startMs) || 0) && timeMs < (Number(word.endMs) || 0))
                : -1;
            let globalWordIndex = 0;
            primaryWrap.lines.forEach(line => {
                let x = lineStartX(line, primaryWrap.spaceW);
                line.forEach(word => {
                    const highlighted = highlightOn && globalWordIndex === activeWordIndex;
                    if (strokeW > 0) {
                        ctx.lineWidth = strokeW;
                        ctx.strokeStyle = this.textStrokeColor || '#000000';
                        ctx.lineJoin = 'round';
                        ctx.strokeText(word.text, x, y);
                    }
                    ctx.fillStyle = highlighted ? (this.captionHighlightColor || '#f6c945') : baseColor;
                    ctx.fillText(word.text, x, y);
                    x += word.w + primaryWrap.spaceW;
                    globalWordIndex++;
                });
                y += primaryWrap.lineHeight;
            });
        }

        if (secondaryWrap) {
            y += gap;
            ctx.font = `${fontStyleStr}${weight} ${secondaryFs}px ${family}`;
            const secColor = this.secondaryTextColor || '#cfe8ff';
            secondaryWrap.lines.forEach(line => {
                let x = lineStartX(line, secondaryWrap.spaceW);
                line.forEach(word => {
                    if (strokeW > 0) {
                        ctx.lineWidth = strokeW;
                        ctx.strokeStyle = this.textStrokeColor || '#000000';
                        ctx.lineJoin = 'round';
                        ctx.strokeText(word.text, x, y);
                    }
                    ctx.fillStyle = secColor;
                    ctx.fillText(word.text, x, y);
                    x += word.w + secondaryWrap.spaceW;
                });
                y += secondaryWrap.lineHeight;
            });
        }
    }

    static getIconPreviewMode(pathData) {
        const subPaths = (pathData || '').split('|').map(path => path.trim()).filter(Boolean);
        if (!subPaths.length) return 'fill';
        const closedCount = subPaths.filter(path => /(?:\s|^)Z\s*$/i.test(path)).length;
        const openCount = subPaths.length - closedCount;
        if (closedCount === 0) return 'stroke';
        if (openCount > 0) return 'mixed';
        return 'fill';
    }

    static buildIconPreviewMarkup(pathData, viewBox = '0 0 100 100') {
        const previewMode = StageObject.getIconPreviewMode(pathData);
        const paths = (pathData || '').split('|').map(path => path.trim()).filter(Boolean)
            .map(path => `<path class="icon-preview-path" d="${path}"/>`)
            .join('');
        return {
            previewMode,
            markup: `<svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${paths}</svg>`
        };
    }

    static supportsTiltType(type) {
        return type === 'image' || type === 'icon' || type === 'rectangle' || type === 'roundedRectangle' || type === 'freeform';
    }

    static supportsDepthExtrusionType(objOrType) {
        const type = typeof objOrType === 'string' ? objOrType : objOrType?.type;
        const isClosedFreeform = typeof objOrType === 'object'
            && objOrType?.type === 'freeform'
            && objOrType?.closedPath !== false
            && Array.isArray(objOrType?.pathPoints)
            && objOrType.pathPoints.length >= 3;
        if (isClosedFreeform) return true;
        return [
            'image', 'icon', 'rectangle', 'circle', 'triangle', 'star', 'polygon', 'diamond', 'heart',
            'roundedRectangle', 'parallelogram', 'trapezium', 'hexagon', 'heptagon',
            'pie', 'chord', 'teardrop', 'lShape', 'can', 'plaque', 'doughnut',
            'blockArc', 'brace', 'bracket', 'bentArrow', 'uTurnArrow', 'quadArrow',
            'upDownArrow', 'upArrowCallout', 'elbowArrowConnector'
        ].includes(type);
    }

    static supportsDepthScaleType(type) {
        return type === 'image' || type === 'icon';
    }

    static supportsAspectLockType(type) {
        return !['line', 'arrow', 'doubleArrow', 'curvedArrow'].includes(type);
    }

    static getTiltTransformComponents(obj) {
        if (!StageObject.supportsTiltType(obj.type)) {
            return { a: 1, b: 0, c: 0, d: 1, active: false };
        }
        const tiltX = Utils.clamp(obj.tiltX ?? 0, -45, 45);
        const tiltY = Utils.clamp(obj.tiltY ?? 0, -45, 45);
        if (Math.abs(tiltX) < 0.01 && Math.abs(tiltY) < 0.01) {
            return { a: 1, b: 0, c: 0, d: 1, active: false };
        }
        const tx = Utils.degToRad(tiltX);
        const ty = Utils.degToRad(tiltY);
        return {
            a: Math.max(0.2, Math.cos(ty)),
            b: -Math.tan(ty) * 0.18,
            c: Math.tan(tx) * 0.18,
            d: Math.max(0.2, Math.cos(tx)),
            active: true
        };
    }

    static getGarmentDeformationTransform(obj) {
        const isGarment = obj?._ucGarmentLayer === true
            || obj?.ucGarmentLayer === true
            || obj?._ucAgbadaRobeLayer === true
            || obj?.ucAgbadaRobeLayer === true;
        const policy = String(
            obj?._ucGarmentDeformationPolicy
            || obj?.ucGarmentDeformationPolicy
            || ''
        ).toLowerCase();
        if (!isGarment || policy === 'rigid' || policy === 'limb-overlay') {
            return { shearX: 0, scaleY: 1, active: false };
        }
        const rawShearX = Number(obj?._ucGarmentDeformationShearX ?? obj?.ucGarmentDeformationShearX);
        const rawScaleY = Number(obj?._ucGarmentDeformationScaleY ?? obj?.ucGarmentDeformationScaleY);
        const shearX = Number.isFinite(rawShearX) ? Utils.clamp(rawShearX, -0.12, 0.12) : 0;
        const scaleY = Number.isFinite(rawScaleY) ? Utils.clamp(rawScaleY, 0.9, 1.05) : 1;
        return {
            shearX,
            scaleY,
            active: Math.abs(shearX) > 0.0001 || Math.abs(scaleY - 1) > 0.0001
        };
    }

    static getDepthTransformComponents(obj) {
        const rawDepth = typeof obj?.depth === 'number' ? obj.depth : parseFloat(obj?.depth);
        const depth = Number.isFinite(rawDepth) ? rawDepth : 0;
        const rawPerspective = typeof obj?.depthPerspective === 'number' ? obj.depthPerspective : parseFloat(obj?.depthPerspective);
        const perspective = Number.isFinite(rawPerspective) ? Utils.clamp(rawPerspective, 0, 100) / 100 : 0;
        if (!StageObject.supportsDepthScaleType(obj?.type) || Math.abs(depth) < 0.01 || perspective <= 0.001) {
            return { scale: 1, active: false };
        }
        return {
            scale: Utils.clamp(1 + depth * 0.004 * perspective, 0.15, 6),
            active: true
        };
    }

    static _shadeHexColor(hex, amount = 0) {
        const base = (typeof hex === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex))
            ? hex
            : '#4a90d9';
        const { r, g, b } = Utils.hexToRgb(base);
        const mix = (channel) => {
            if (amount >= 0) {
                return Math.round(channel + (255 - channel) * amount);
            }
            return Math.round(channel * (1 + amount));
        };
        return Utils.rgbToHex(
            Utils.clamp(mix(r), 0, 255),
            Utils.clamp(mix(g), 0, 255),
            Utils.clamp(mix(b), 0, 255)
        );
    }

    static _getDepthFillBase(obj) {
        if (typeof obj?.fill === 'string' && obj.fill.startsWith('#')) return obj.fill;
        if (typeof obj?.stroke === 'string' && obj.stroke.startsWith('#')) return obj.stroke;
        return '#4a90d9';
    }

    static _getDepthSideFillBase(obj) {
        if (typeof obj?.depthSideColor === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(obj.depthSideColor)) {
            return obj.depthSideColor;
        }
        return StageObject._getDepthFillBase(obj);
    }

    static _polygonSignedArea(points) {
        let area = 0;
        for (let i = 0; i < points.length; i++) {
            const next = points[(i + 1) % points.length];
            area += points[i].x * next.y - next.x * points[i].y;
        }
        return area / 2;
    }

    static _polygonCentroid(points) {
        if (!points.length) return { x: 0, y: 0 };
        const sum = points.reduce((acc, point) => {
            acc.x += point.x;
            acc.y += point.y;
            return acc;
        }, { x: 0, y: 0 });
        return { x: sum.x / points.length, y: sum.y / points.length };
    }

    getJointTiltTransform(joint) {
        const tilt = StageObject.getJointTiltComponents(joint.tiltX, joint.tiltY);
        const projection = StageObject.getSeatedJointProjection(this, joint);
        if (projection.a !== undefined) {
            const { a, b, c, d } = projection;
            return { a: tilt.a * a + tilt.c * b, b: tilt.b * a + tilt.d * b,
                c: tilt.a * c + tilt.c * d, d: tilt.b * c + tilt.d * d, active: true };
        }
        const { scale, shear } = projection;
        return scale === 1 ? tilt : { ...tilt, c: tilt.a * shear + tilt.c * scale, d: tilt.b * shear + tilt.d * scale, active: true };
    }

    static getSeatedJointProjection(obj, joint) {
        const axial = item => {
            const x = Math.max(-45, Math.min(45, Number(item?.tiltX) || 0)) * Math.PI / 180;
            return Math.hypot(Math.tan(x) * .18, Math.cos(x));
        };
        const reach = Math.max(0, Math.min(1, Number(obj.armatureReachDepth) || 0));
        if (reach && /shoulder|elbow/.test(joint.name || '')) {
            const shoulder = (obj.joints || []).find(j => /shoulder/.test(j.name || ''));
            const stretch = obj.limbLengthMode === 'reach' ? Math.max(0, Math.min(.15, Number(obj.limbReachStretch) || 0)) : 0;
            // Reach is the axial projection; tilt supplies direction, not a second shortening.
            const scale = (1 - .82 * reach) * (1 + stretch * reach) / Math.max(.2, axial(shoulder));
            if (/shoulder/.test(joint.name)) return { scale, shear: 0 };
            // Cancel the upper-arm projection in the bent elbow's local axes.
            // The forearm and hand retain their length instead of shrinking too.
            const tx = Math.max(-45, Math.min(45, shoulder?.tiltX || 0)) * Math.PI / 180;
            const ty = Math.max(-45, Math.min(45, shoulder?.tiltY || 0)) * Math.PI / 180;
            const a = Math.cos(ty), b = -Math.tan(ty) * .18;
            const c = Math.tan(tx) * .18 * scale, d = Math.cos(tx) * scale;
            const det = a * d - b * c, r = (joint.angle || 0) * Math.PI / 180;
            const cs = Math.cos(r), sn = Math.sin(r);
            const ia = d / det, ib = -b / det, ic = -c / det, id = a / det;
            return { a: cs * (ia * cs + ic * sn) + sn * (ib * cs + id * sn),
                b: -sn * (ia * cs + ic * sn) + cs * (ib * cs + id * sn),
                c: cs * (-ia * sn + ic * cs) + sn * (-ib * sn + id * cs),
                d: -sn * (-ia * sn + ic * cs) + cs * (-ib * sn + id * cs), scale: 1, shear: 0 };
        }
        const kneel = Math.max(0, Math.min(1, Number(obj.armatureKneelDepth) || 0));
        if (kneel) {
            // The leading thigh projects forward; the other shin folds back.
            // Undo each scale at the next joint so the shoes keep their size.
            const joints = obj.joints || [];
            const hip = joints.find(item => /hip/i.test(item.name || ''))?.position ?? 0;
            const knee = joints.find(item => /knee/i.test(item.name || ''))?.position ?? .5;
            const ankle = joints.find(item => /ankle/i.test(item.name || ''))?.position ?? .9;
            const thighLength = Math.max(.01, knee - hip), shinLength = Math.max(.01, ankle - knee);
            const drop = .9 * kneel * Math.min(thighLength, shinLength);
            const shinScale = 1 - drop / shinLength, thighScale = 1 - drop / thighLength;
            const name = joint.name || '';
            if (/right-(hip|knee|ankle)/i.test(name)) {
                return { scale: /hip/i.test(name) ? thighScale : /knee/i.test(name) ? 1 / thighScale : 1, shear: 0 };
            }
            return { scale: /knee/i.test(name) ? shinScale : /ankle/i.test(name) ? 1 / shinScale : 1, shear: 0 };
        }
        const depth = Math.max(0, Math.min(1, Number(obj.armatureSeatDepth) || 0));
        if (!depth) {
            const strength = obj.limbLengthMode === 'preserve' ? Math.max(0, Math.min(1, Number(obj.limbLengthCompensation) || 0)) : 0;
            const gain = Math.min(1.25, 1 / Math.max(.2, axial(joint)));
            return { scale: 1 + strength * (gain - 1), shear: 0 };
        }
        // Project the thigh toward the viewer, then undo that scale at the knee
        // so the shin and shoe retain their length throughout a seated transition.
        const scale = 1 - .76 * depth;
        const factor = /hip/i.test(joint.name || '') ? scale : /knee/i.test(joint.name || '') ? 1 / scale : 1;
        const lean = Math.max(-.65, Math.min(.65, Number(obj.armatureSeatLean) || 0));
        const shear = /hip/i.test(joint.name || '') ? lean : /knee/i.test(joint.name || '') ? -lean / scale : 0;
        return { scale: factor, shear };
    }

    /** Compute the joint's tilt matrix independently of its object type. */
    static getJointTiltComponents(tiltX, tiltY) {
        tiltX = Utils.clamp(tiltX ?? 0, -45, 45);
        tiltY = Utils.clamp(tiltY ?? 0, -45, 45);
        if (Math.abs(tiltX) < 0.01 && Math.abs(tiltY) < 0.01) {
            return { a: 1, b: 0, c: 0, d: 1, active: false };
        }
        const tx = Utils.degToRad(tiltX);
        const ty = Utils.degToRad(tiltY);
        return {
            a: Math.max(0.2, Math.cos(ty)),
            b: -Math.tan(ty) * 0.18,
            c: Math.tan(tx) * 0.18,
            d: Math.max(0.2, Math.cos(tx)),
            active: true
        };
    }

    static pointInPolygon(px, py, points) {
        let inside = false;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
            const xi = points[i].x;
            const yi = points[i].y;
            const xj = points[j].x;
            const yj = points[j].y;
            const intersects = ((yi > py) !== (yj > py))
                && (px < ((xj - xi) * (py - yi)) / ((yj - yi) || 0.000001) + xi);
            if (intersects) inside = !inside;
        }
        return inside;
    }

    static getRectMidpoints(points) {
        return {
            n: { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 },
            e: { x: (points[1].x + points[2].x) / 2, y: (points[1].y + points[2].y) / 2 },
            s: { x: (points[2].x + points[3].x) / 2, y: (points[2].y + points[3].y) / 2 },
            w: { x: (points[3].x + points[0].x) / 2, y: (points[3].y + points[0].y) / 2 }
        };
    }

    getTransformedRectPoints() {
        return this._transformDisplayPoints([
            { x: this.x, y: this.y },
            { x: this.x + this.width, y: this.y },
            { x: this.x + this.width, y: this.y + this.height },
            { x: this.x, y: this.y + this.height }
        ]);
    }

    _withTiltTransform(ctx, drawFn) {
        const tilt = StageObject.getTiltTransformComponents(this);
        if (!tilt.active) {
            drawFn();
            return;
        }
        const pivot = this.getPivotPoint();
        ctx.save();
        ctx.translate(pivot.x, pivot.y);
        ctx.transform(tilt.a, tilt.b, tilt.c, tilt.d, 0, 0);
        ctx.translate(-pivot.x, -pivot.y);
        drawFn();
        ctx.restore();
    }

    drawDiamond(ctx) {
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2, this.y);
        ctx.lineTo(this.x + this.width, this.y + this.height / 2);
        ctx.lineTo(this.x + this.width / 2, this.y + this.height);
        ctx.lineTo(this.x, this.y + this.height / 2);
        ctx.closePath();
        ctx.fill();
        if (this.strokeWidth > 0) ctx.stroke();
    }

    drawHeart(ctx) {
        const x = this.x, y = this.y, w = this.width, h = this.height;
        const topY = h * 0.3;
        ctx.beginPath();
        ctx.moveTo(x + w / 2, y + topY);
        // Left bump
        ctx.bezierCurveTo(x + w / 2, y, x, y, x, y + topY);
        // Left bottom
        ctx.bezierCurveTo(x, y + (h + topY) / 2, x + w / 2, y + h * 0.8, x + w / 2, y + h);
        // Right bottom
        ctx.bezierCurveTo(x + w / 2, y + h * 0.8, x + w, y + (h + topY) / 2, x + w, y + topY);
        // Right bump
        ctx.bezierCurveTo(x + w, y, x + w / 2, y, x + w / 2, y + topY);
        ctx.closePath();
        ctx.fill();
        if (this.strokeWidth > 0) ctx.stroke();
    }

    drawArrow(ctx) {
        if (!(this.strokeWidth > 0)) return;
        const x1 = this.x, y1 = this.y;
        const x2 = this.x + this.width, y2 = this.y + this.height;
        const len = Math.sqrt(this.width ** 2 + this.height ** 2);
        const sw = this.strokeWidth;
        const strokePaint = this.stroke || this.fill;
        const headLen = Math.max(sw * 4, Math.min(len * 0.35, len * 0.2 + sw * 2));
        const headWidth = Math.PI / 6;
        const angle = Math.atan2(y2 - y1, x2 - x1);
        // Shorten shaft so it doesn't poke through the arrowhead
        const shaftEndX = x2 - headLen * 0.5 * Math.cos(angle);
        const shaftEndY = y2 - headLen * 0.5 * Math.sin(angle);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(shaftEndX, shaftEndY);
        ctx.strokeStyle = strokePaint;
        ctx.lineWidth = sw;
        ctx.lineCap = 'round';
        ctx.stroke();
        // Arrowhead
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - headLen * Math.cos(angle - headWidth), y2 - headLen * Math.sin(angle - headWidth));
        ctx.lineTo(x2 - headLen * Math.cos(angle + headWidth), y2 - headLen * Math.sin(angle + headWidth));
        ctx.closePath();
        ctx.fillStyle = strokePaint;
        ctx.fill();
    }

    drawDoubleArrow(ctx) {
        if (!(this.strokeWidth > 0)) return;
        const x1 = this.x, y1 = this.y;
        const x2 = this.x + this.width, y2 = this.y + this.height;
        const len = Math.sqrt(this.width ** 2 + this.height ** 2);
        const sw = this.strokeWidth;
        const strokePaint = this.stroke || this.fill;
        const headLen = Math.max(sw * 4, Math.min(len * 0.35, len * 0.2 + sw * 2));
        const headWidth = Math.PI / 6;
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const rev = angle + Math.PI;
        // Shorten shaft at both ends
        const sx = x1 + headLen * 0.5 * Math.cos(angle);
        const sy = y1 + headLen * 0.5 * Math.sin(angle);
        const ex = x2 - headLen * 0.5 * Math.cos(angle);
        const ey = y2 - headLen * 0.5 * Math.sin(angle);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.strokeStyle = strokePaint;
        ctx.lineWidth = sw;
        ctx.lineCap = 'round';
        ctx.stroke();
        // End arrowhead
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - headLen * Math.cos(angle - headWidth), y2 - headLen * Math.sin(angle - headWidth));
        ctx.lineTo(x2 - headLen * Math.cos(angle + headWidth), y2 - headLen * Math.sin(angle + headWidth));
        ctx.closePath();
        ctx.fillStyle = strokePaint;
        ctx.fill();
        // Start arrowhead
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x1 - headLen * Math.cos(rev - headWidth), y1 - headLen * Math.sin(rev - headWidth));
        ctx.lineTo(x1 - headLen * Math.cos(rev + headWidth), y1 - headLen * Math.sin(rev + headWidth));
        ctx.closePath();
        ctx.fillStyle = strokePaint;
        ctx.fill();
    }

    drawCurvedArrow(ctx) {
        if (!(this.strokeWidth > 0)) return;
        const x1 = this.x, y1 = this.y + this.height;
        const x2 = this.x + this.width, y2 = this.y;
        const cpx = this.x + this.width / 2, cpy = this.y - this.height * 0.3;
        const strokePaint = this.stroke || this.fill;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(cpx, cpy, x2, y2);
        ctx.strokeStyle = strokePaint;
        const sw = this.strokeWidth;
        ctx.lineWidth = sw;
        ctx.lineCap = 'round';
        ctx.stroke();
        // Arrowhead – approximate tangent at end
        const t = 0.95, mt = 1 - t;
        const tx = 2 * mt * (cpx - x1) + 2 * t * (x2 - cpx);
        const ty = 2 * mt * (cpy - y1) + 2 * t * (y2 - cpy);
        const angle = Math.atan2(ty, tx);
        const len = Math.sqrt(this.width ** 2 + this.height ** 2);
        const headLen = Math.max(sw * 3, Math.min(len * 0.3, len * 0.15 + sw * 2));
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fillStyle = strokePaint;
        ctx.fill();
    }

    drawScribble(ctx) {
        if (this.pathPoints.length < 2 || !(this.strokeWidth > 0)) return;
        ctx.beginPath();
        ctx.moveTo(this.pathPoints[0].x, this.pathPoints[0].y);
        // Smooth curve through points
        for (let i = 1; i < this.pathPoints.length - 1; i++) {
            const xc = (this.pathPoints[i].x + this.pathPoints[i + 1].x) / 2;
            const yc = (this.pathPoints[i].y + this.pathPoints[i + 1].y) / 2;
            ctx.quadraticCurveTo(this.pathPoints[i].x, this.pathPoints[i].y, xc, yc);
        }
        const last = this.pathPoints[this.pathPoints.length - 1];
        ctx.lineTo(last.x, last.y);
        ctx.strokeStyle = this.stroke || this.fill;
        ctx.lineWidth = this.strokeWidth;
        ctx.lineCap = this.strokeCap || 'round';
        ctx.lineJoin = this.strokeJoin || 'round';
        ctx.stroke();
    }

    drawFreeform(ctx) {
        const pts = this.pathPoints;
        if (pts.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);

        for (let i = 1; i < pts.length; i++) {
            const prev = pts[i - 1];
            const cur = pts[i];
            if (cur.segmentType === 'straight' || prev.segmentType === 'straight') {
                ctx.lineTo(cur.x, cur.y);
            } else {
                // Smooth curve: use midpoint quadratic for interior, direct line for last
                if (i < pts.length - 1) {
                    const next = pts[i + 1];
                    const xc = (cur.x + next.x) / 2;
                    const yc = (cur.y + next.y) / 2;
                    ctx.quadraticCurveTo(cur.x, cur.y, xc, yc);
                } else {
                    ctx.lineTo(cur.x, cur.y);
                }
            }
        }

        if (this.closedPath) {
            // Close back to start
            const last = pts[pts.length - 1];
            const first = pts[0];
            if (first.segmentType === 'straight' || last.segmentType === 'straight') {
                ctx.lineTo(first.x, first.y);
            }
            ctx.closePath();
            ctx.fill();
        }
        if (this.strokeWidth > 0) ctx.stroke();
    }

    // Serialize
    toJSON() {
        return {
            id: this.id,
            type: this.type,
            name: this.name,
            ...(this.realistic3D ? { realistic3D: { ...this.realistic3D },
                ...Object.fromEntries(globalThis.Realistic3DLibrary.channels.map(key => [key, Number.isFinite(this[key]) ? this[key] : 0])) } : {}),
            x: this.x, y: this.y,
            width: this.width, height: this.height,
            rotation: this.rotation,
            depth: this.depth,
            depthSideColor: this.depthSideColor || undefined,
            depthSideMode: this.depthSideMode !== 'auto' ? this.depthSideMode : undefined,
            depthLighting: this.depthLighting,
            depthPerspective: this.depthPerspective,
            showDepthHandle: this.showDepthHandle || undefined,
            tiltX: this.tiltX,
            tiltY: this.tiltY,
            scaleX: this.scaleX, scaleY: this.scaleY,
            armatureSeatDepth: this.armatureSeatDepth,
            armatureKneelDepth: this.armatureKneelDepth,
            armatureReachDepth: this.armatureReachDepth,
            limbLengthMode: this.limbLengthMode,
            limbLengthCompensation: this.limbLengthCompensation,
            limbReachStretch: this.limbReachStretch,
            armatureSeatLean: this.armatureSeatLean,
            opacity: this.opacity,
            blendMode: this.blendMode && this.blendMode !== 'normal' ? this.blendMode : undefined,
            fillType: this.fillType,
            fill: this.fill,
            gradientStops: JSON.parse(JSON.stringify(this.gradientStops)),
            gradientAngle: this.gradientAngle,
            patternType: this.patternType,
            patternColor: this.patternColor,
            patternScale: this.patternScale,
            stroke: this.stroke,
            strokeWidth: this.strokeWidth,
            strokeDash: this.strokeDash,
            strokeCap: this.strokeCap,
            strokeJoin: this.strokeJoin,
            borderRadius: this.borderRadius,
            shadow: this.shadow,
            shadowColor: this.shadowColor,
            shadowBlur: this.shadowBlur,
            shadowOffsetX: this.shadowOffsetX,
            shadowOffsetY: this.shadowOffsetY,
            glowEnabled: this.glowEnabled,
            glowColor: this.glowColor,
            glowSize: this.glowSize,
            reflectionEnabled: this.reflectionEnabled,
            reflectionOpacity: this.reflectionOpacity,
            reflectionOffset: this.reflectionOffset,
            bevelEnabled: this.bevelEnabled,
            bevelSize: this.bevelSize,
            bevelHighlight: this.bevelHighlight,
            bevelShadow: this.bevelShadow,
            text: this.text, fontFamily: this.fontFamily,
            fontSize: this.fontSize, fontWeight: this.fontWeight,
            fontStyle: this.fontStyle, textDecoration: this.textDecoration,
            textAlign: this.textAlign, textColor: this.textColor,
            lineHeight: this.lineHeight, letterSpacing: this.letterSpacing,
            textCurve: this.textCurve,
            textTransform: this.textTransform,
            textStrokeColor: this.textStrokeColor,
            textStrokeWidth: this.textStrokeWidth,
            textBackgroundEnabled: this.textBackgroundEnabled,
            textBackgroundColor: this.textBackgroundColor,
            textBackgroundPadding: this.textBackgroundPadding,
            textBackgroundRadius: this.textBackgroundRadius,
            segments: this.type === 'caption' && Array.isArray(this.segments) && this.segments.length
                ? JSON.parse(JSON.stringify(this.segments)) : undefined,
            captionAudioId: this.captionAudioId || undefined,
            captionBinding: this.captionBinding ? JSON.parse(JSON.stringify(this.captionBinding)) : undefined,
            captionSourceSegments: this.captionSourceSegments ? JSON.parse(JSON.stringify(this.captionSourceSegments)) : undefined,
            captionProfile: this.captionProfile ? JSON.parse(JSON.stringify(this.captionProfile)) : undefined,
            captionLanguage: this.type === 'caption' ? this.captionLanguage : undefined,
            captionDelivery: this.type === 'caption' ? this.captionDelivery : undefined,
            captionStale: this.captionStale || undefined,
            captionPreset: this.type === 'caption' ? this.captionPreset : undefined,
            captionHighlightEnabled: this.captionHighlightEnabled || undefined,
            captionHighlightColor: this.captionHighlightEnabled ? this.captionHighlightColor : undefined,
            captionVerticalAlign: this.captionVerticalAlign || undefined,
            bilingual: this.type === 'caption' && this.bilingual ? true : undefined,
            secondaryLang: this.type === 'caption' && this.bilingual ? (this.secondaryLang || undefined) : undefined,
            secondaryTextColor: this.type === 'caption' && this.bilingual ? this.secondaryTextColor : undefined,
            secondaryFontScale: this.type === 'caption' && this.bilingual ? this.secondaryFontScale : undefined,
            secondaryGap: this.type === 'caption' && this.bilingual ? this.secondaryGap : undefined,
            imageSrc: this.imageSrc,
            sceneAsset: this.sceneAsset ? JSON.parse(JSON.stringify(this.sceneAsset)) : undefined,
            activityRootId: this.activityRootId || null,
            activityKitSettings: this.activityKitSettings ? JSON.parse(JSON.stringify(this.activityKitSettings)) : undefined,
            imageZoom: this.imageZoom !== 1 ? this.imageZoom : undefined,
            imagePanX: this.imagePanX ? this.imagePanX : undefined,
            imagePanY: this.imagePanY ? this.imagePanY : undefined,
            _compressionRig: this._compressionRig ? JSON.parse(JSON.stringify(this._compressionRig)) : undefined,
            _compressionPair: this._compressionPair ? JSON.parse(JSON.stringify(this._compressionPair)) : undefined,
            _compressionRigBase: this._compressionRigBase ? JSON.parse(JSON.stringify(this._compressionRigBase)) : undefined,
            _compressionPairBase: this._compressionPairBase ? JSON.parse(JSON.stringify(this._compressionPairBase)) : undefined,
            cloneBrushLayer: this.cloneBrushLayer ? JSON.parse(JSON.stringify(this.cloneBrushLayer)) : undefined,
            layerMask: this.layerMask ? JSON.parse(JSON.stringify(this.layerMask)) : undefined,
            faceRig: this.faceRig ? JSON.parse(JSON.stringify(this.faceRig)) : undefined,
            faceSet: this.faceSet ? JSON.parse(JSON.stringify(this.faceSet)) : undefined,
            faceRigExpression: this.faceRigExpression && this.faceRigExpression !== 'neutral' ? this.faceRigExpression : undefined,
            faceRigStrength: this.faceRigStrength ? this.faceRigStrength : undefined,
            faceRigLookX: this.faceRigLookX ? this.faceRigLookX : undefined,
            faceRigLookY: this.faceRigLookY ? this.faceRigLookY : undefined,
            faceRigMouthOpen: this.faceRigMouthOpen ? this.faceRigMouthOpen : undefined,
            faceRigPartParentId: this.faceRigPartParentId || undefined,
            faceRigPartRole: this.faceRigPartRole || undefined,
            faceRigPartLabel: this.faceRigPartLabel || undefined,
            faceRigPartBase: this.faceRigPartBase ? JSON.parse(JSON.stringify(this.faceRigPartBase)) : undefined,
            faceRigPartTuning: this.faceRigPartTuning ? JSON.parse(JSON.stringify(this.faceRigPartTuning)) : undefined,
            svgAvatar: this._svgAvatar ? (() => {
                const data = JSON.parse(JSON.stringify(this._svgAvatar));
                delete data.currentSvg;
                delete data._lastRenderKey;
                delete data._renderQueued;
                return data;
            })() : undefined,
            characterAppearanceProvider: this._characterAppearanceProvider || undefined,
            svgCharacter: this._svgCharacter === true ? true : undefined,
            svgCharacterVersion: this._svgCharacterVersion || undefined,
            svgCharacterEngine: this._svgCharacterEngine || undefined,
            svgCharacterInstanceId: this._svgCharacterInstanceId || undefined,
            svgCharacterIdentityId: this._svgCharacterIdentityId || undefined,
            svgCharacterConfig: this._svgCharacterConfig ? Utils.cloneProjectState(this._svgCharacterConfig) : undefined,
            svgCharacterIdentity: this._svgCharacterIdentity ? JSON.parse(JSON.stringify(this._svgCharacterIdentity)) : undefined,
            svgCharacterStyling: this._svgCharacterStyling ? JSON.parse(JSON.stringify(this._svgCharacterStyling)) : undefined,
            svgCharacterViewProfileKey: this._svgCharacterViewProfileKey || undefined,
            svgCharacterProjectionMode: this._svgCharacterProjectionMode || undefined,
            svgCharacterPremiumAssetId: this._svgCharacterPremiumAssetId || this._svgAfricanPremiumAssetId || undefined,
            svgCharacterPart: this._svgCharacterPart === true ? true : undefined,
            svgCharacterPremiumPart: this._svgCharacterPremiumPart === true ? true : undefined,
            svgCharacterPartKey: this._svgCharacterPartKey || undefined,
            svgCharacterPremiumPartKey: this._svgCharacterPremiumPartKey || undefined,
            svgAfricanPremiumAssetId: this._svgAfricanPremiumAssetId || this._svgCharacterPremiumAssetId || undefined,
            svgAfricanAssetProfile: this._svgAfricanAssetProfile || undefined,
            svgAfricanSourcePath: this._svgAfricanSourcePath || undefined,
            svgAfricanSourceFile: this._svgAfricanSourceFile || undefined,
            svgAfricanMasterFile: this._svgAfricanMasterFile || undefined,
            svgAfricanCalibrationVersion: this._svgAfricanCalibrationVersion || undefined,
            svgAfricanPremiumBaseScale: this._svgAfricanPremiumBaseScale || undefined,
            svgAfricanAnatomicalLayoutVersion: Number.isFinite(this._svgAfricanAnatomicalLayoutVersion)
                ? this._svgAfricanAnatomicalLayoutVersion
                : undefined,
            svgAfricanAssetManifest: this._svgAfricanAssetManifest ? JSON.parse(JSON.stringify(this._svgAfricanAssetManifest)) : undefined,
            svgAfricanCalibration: this._svgAfricanCalibration ? JSON.parse(JSON.stringify(this._svgAfricanCalibration)) : undefined,
            svgAfricanPartProfile: this._svgAfricanPartProfile ? JSON.parse(JSON.stringify(this._svgAfricanPartProfile)) : undefined,
            svgAfricanJointProfile: this._svgAfricanJointProfile ? JSON.parse(JSON.stringify(this._svgAfricanJointProfile)) : undefined,
            svgAfricanPinProfile: this._svgAfricanPinProfile ? JSON.parse(JSON.stringify(this._svgAfricanPinProfile)) : undefined,
            svgAfricanFaceState: this._svgAfricanFaceState ? JSON.parse(JSON.stringify(this._svgAfricanFaceState)) : undefined,
            svgAfricanAdjustments: this._svgAfricanAdjustments ? JSON.parse(JSON.stringify(this._svgAfricanAdjustments)) : undefined,
            textureImageSrc: this.textureImageSrc || undefined,
            pictureFillMode: this.pictureFillMode !== 'stretch' ? this.pictureFillMode : undefined,
            pictureFillRotation: this.pictureFillRotation || undefined,
            isAnimatedGif: this.isAnimatedGif || undefined,
            gifFrameDelays: this.gifFrameDelays || undefined,
            isSpriteSequence: this.isSpriteSequence || undefined,
            spriteSheet: this.spriteSheet ? JSON.parse(JSON.stringify(this.spriteSheet)) : undefined,
            imgBrightness: this.imgBrightness,
            imgContrast: this.imgContrast,
            imgSaturation: this.imgSaturation,
            imgHue: this.imgHue,
            imgBlur: this.imgBlur,
            imgGrayscale: this.imgGrayscale,
            imgSepia: this.imgSepia,
            imgInvert: this.imgInvert,
            imgTintColor: this.imgTintColor,
            imgTintAmount: this.imgTintAmount,
            pathPoints: JSON.parse(JSON.stringify(this.pathPoints)),
            closedPath: this.closedPath,
            sides: this.sides, innerRadius: this.innerRadius,
            shapeStartAngle: this.shapeStartAngle,
            shapeSweepAngle: this.shapeSweepAngle,
            arrowShaftWidth: this.arrowShaftWidth,
            arrowHeadLength: this.arrowHeadLength,
            pivotX: this.pivotX, pivotY: this.pivotY,
            showPivot: this.showPivot,
            flipH: this.flipH, flipV: this.flipV,
            iconPath: this.iconPath,
            iconViewBox: this.iconViewBox,
            groupId: this.groupId,
            animatedPart: this.animatedPart ? JSON.parse(JSON.stringify(this.animatedPart)) : null,
            characterStackId: this._characterStackId || undefined,
            characterStackOrder: Number.isFinite(Number(this._characterStackOrder))
                ? Number(this._characterStackOrder)
                : undefined,
            visible: this.visible,
            locked: this._temporaryLockOwner ? !!this._temporaryLockPrevious : this.locked,
            lockAspectRatio: this.lockAspectRatio || undefined,
            layer: this.layer, tags: [...this.tags],
            armatureDrawLayer: Number.isFinite(Number(this._armatureDrawLayer)) ? Number(this._armatureDrawLayer) : undefined,
            layerMaskSource: this._layerMaskSource === true ? true : undefined,
            layerMaskTargetId: this._layerMaskTargetId || undefined,
            smartCutFacePart: this._smartCutFacePart === true ? true : undefined,
            smartCutFacePatch: this._smartCutFacePatch === true ? true : undefined,
            smartCutFaceBase: this._smartCutFaceBase === true ? true : undefined,
            smartCutFaceRole: this._smartCutFaceRole || undefined,
            smartCutFacePartKey: this._smartCutFacePartKey || undefined,
            smartCutFaceGapFillMode: this._smartCutFaceGapFillMode || undefined,
            smartCutFaceSourcePartId: this._smartCutFaceSourcePartId || undefined,
            smartCutFaceGroupId: this._smartCutFaceGroupId || undefined,
            bodyTags: this.bodyTags?.length ? JSON.parse(JSON.stringify(this.bodyTags)) : undefined,
            animations: Utils.cloneProjectState(this.animations),
            armatureViewState: this.armatureViewState || undefined,
            expressions: this.expressions && Object.keys(this.expressions).length
                ? JSON.parse(JSON.stringify(this.expressions)) : undefined,
            rigging: this.rigging ? {
                pins: JSON.parse(JSON.stringify(this.rigging.pins)),
                bones: JSON.parse(JSON.stringify(this.rigging.bones)),
                meshDensity: this.rigging.meshDensity,
                deformationMode: this.rigging.deformationMode || 'skeletal',
                showBoneLabels: this.rigging.showBoneLabels !== false
            } : null,
            rigContours: this.rigContours || undefined,
            pinnedTo: this.pinnedTo,
            pinOffsetX: this.pinOffsetX,
            pinOffsetY: this.pinOffsetY,
            pinAnchorX: this.pinAnchorX,
            pinAnchorY: this.pinAnchorY,
            pinTargetType: this.pinTargetType === 'joint' ? 'joint' : undefined,
            pinJointId: this.pinTargetType === 'joint' ? (this.pinJointId || undefined) : undefined,
            pinJointName: this.pinTargetType === 'joint' ? (this.pinJointName || undefined) : undefined,
            pinRotationMode: this.pinRotationMode,
            pinInheritRotation: this.pinRotationMode === 'inherit',
            pinBaseTiltX: Math.abs(this.pinBaseTiltX || 0) > 0.001 ? this.pinBaseTiltX : undefined,
            pinBaseTiltY: Math.abs(this.pinBaseTiltY || 0) > 0.001 ? this.pinBaseTiltY : undefined,
            pinContour: this.pinContour || undefined,
            pinContourColor: this.pinContourColor || undefined,
            pinSyncJoints: this.pinSyncJoints || undefined,
            pinInheritParentJointName: this._pinInheritParentJointName || undefined,
            armatureAttachmentPin: this._armatureAttachmentPin === true ? true : undefined,
                        normalizedDownBaseline: this._normalizedDownBaseline === true ? true : undefined,
            bslSkipTorsoAttachmentRig: this._bslSkipTorsoAttachmentRig || undefined,
              armatureFrontBackFacing: this._armatureFrontBackFacing || undefined,
              armatureFront3qLean: (this._armatureFront3qLean === 'left' || this._armatureFront3qLean === 'right') ? this._armatureFront3qLean : undefined,
              armaturePromotedProfile: this._armaturePromotedProfile || undefined,
              armatureFacingSide: this._armatureFacingSide || undefined,
              armatureFacingExplicit: this._armatureFacingExplicit === true ? true : undefined,
              armatureSilhouetteRig: this._armatureSilhouetteRig === true ? true : undefined,
              armatureSilhouetteSourceProfile: this._armatureSilhouetteSourceProfile ? JSON.parse(JSON.stringify(this._armatureSilhouetteSourceProfile)) : undefined,
              armatureSkinStrictSideProfile: this._armatureSkinStrictSideProfile === false ? false : (this._armatureSkinStrictSideProfile === true ? true : undefined),
              armatureRoleKey: this._armatureRoleKey || undefined,
              armaturePartKey: this._armaturePartKey || undefined,
              ucCharacterFamilyId: this._ucCharacterFamilyId || undefined,
              ucCharacterVariantKey: this._ucCharacterVariantKey || undefined,
              ucCharacterStyleConfig: this._ucCharacterStyleConfig ? JSON.parse(JSON.stringify(this._ucCharacterStyleConfig)) : undefined,
              ucCharacterLinkedViews: Array.isArray(this._ucCharacterLinkedViews) && this._ucCharacterLinkedViews.length ? JSON.parse(JSON.stringify(this._ucCharacterLinkedViews)) : undefined,
              ucCharacterFamilyState: this._ucCharacterFamilyState ? JSON.parse(JSON.stringify(this._ucCharacterFamilyState)) : undefined,
              ucGarmentLayer: this._ucGarmentLayer === true ? true : undefined,
              ucGarmentRootId: this._ucGarmentRootId || undefined,
              ucGarmentForPartId: this._ucGarmentForPartId || undefined,
              ucGarmentPartKey: this._ucGarmentPartKey || undefined,
              ucGarmentFamilyId: this._ucGarmentFamilyId || undefined,
              ucGarmentVariantKey: this._ucGarmentVariantKey || undefined,
              ucGarmentPolicyVersion: this._ucGarmentPolicyVersion || undefined,
              ucGarmentAdapterId: this._ucGarmentAdapterId || undefined,
              ucGarmentMotionPolicy: this._ucGarmentMotionPolicy || undefined,
              ucGarmentLayerPolicy: this._ucGarmentLayerPolicy || undefined,
              ucGarmentDeformationPolicy: this._ucGarmentDeformationPolicy || undefined,
              svgAfricanGarmentLayer: this._svgAfricanGarmentLayer === true ? true : undefined,
              svgAfricanGarmentSlot: this._svgAfricanGarmentSlot || undefined,
              svgAfricanGarmentKind: this._svgAfricanGarmentKind || undefined,
              svgAfricanGarmentViewFamily: this._svgAfricanGarmentViewFamily || undefined,
              svgAfricanGarmentFacing: this._svgAfricanGarmentFacing || undefined,
              svgAfricanGarmentContinuityType: this._svgAfricanGarmentContinuityType || undefined,
              ucGarmentDeformationShearX: Math.abs(Number(this._ucGarmentDeformationShearX) || 0) > 0.0001
                  ? Number(this._ucGarmentDeformationShearX)
                  : undefined,
              ucGarmentDeformationScaleY: Math.abs((Number(this._ucGarmentDeformationScaleY) || 1) - 1) > 0.0001
                  ? Number(this._ucGarmentDeformationScaleY)
                  : undefined,
              ucSideTorsoGarmentLayer: this._ucSideTorsoGarmentLayer === true ? true : undefined,
                        facialExpression: this._facialExpression || undefined,
                        facialFeatures: this._facialFeatures && Object.keys(this._facialFeatures).length ? JSON.parse(JSON.stringify(this._facialFeatures)) : undefined,
                        facialProportions: this._facialProportions ? JSON.parse(JSON.stringify(this._facialProportions)) : undefined,
                        facialDrawContext: this._facialDrawCtx
                            && typeof this._facialDrawCtx === 'object'
                            && typeof this._facialDrawCtx.view === 'string'
                            ? JSON.parse(JSON.stringify(this._facialDrawCtx))
                            : undefined,
                        facialLocalRect: this._facialLocalRect ? JSON.parse(JSON.stringify(this._facialLocalRect)) : undefined,
                        facialUseAnchorPin: this._facialUseAnchorPin === true ? true : undefined,
                        facialFeatureKey: this._facialFeatureKey || undefined,
                        facialParentHead: this._facialParentHead || undefined,
                        facialBasePinOffsetX: this._facialFeatureKey ? (this._facialBasePinOffsetX ?? 0) : undefined,
                        facialBasePinOffsetY: this._facialFeatureKey ? (this._facialBasePinOffsetY ?? 0) : undefined,
                        facialBaseRotation: this._facialFeatureKey ? (this._facialBaseRotation ?? 0) : undefined,
            jointBaseAngle: this.jointBaseAngle || undefined,
            bodyPartData: this.bodyPartData || undefined,
            joints: JSON.parse(JSON.stringify(this.joints)),
            jointDirection: StageObject.normalizeJointDirection(this.jointDirection),
            jointContours: this.jointContours,
            contourSize: this.contourSize != null && this.contourSize !== 1 ? this.contourSize : undefined,
            contourColor: this.contourColor || undefined,
            contourFillMode: this.contourFillMode && this.contourFillMode !== 'auto' ? this.contourFillMode : undefined,
            contourPatternType: this.contourPatternType && this.contourPatternType !== 'stripes' ? this.contourPatternType : undefined,
            contourPatternColor: this.contourPatternColor && this.contourPatternColor !== '#ffffff' ? this.contourPatternColor : undefined,
            contourPatternScale: this.contourPatternScale != null && this.contourPatternScale !== 1 ? this.contourPatternScale : undefined,
            contourGradientStart: this.contourGradientStart && this.contourGradientStart !== '#ffffff' ? this.contourGradientStart : undefined,
            contourGradientEnd: this.contourGradientEnd && this.contourGradientEnd !== (this.contourColor || '#888888') ? this.contourGradientEnd : undefined,
            contourGradientAngle: this.contourGradientAngle ? this.contourGradientAngle : undefined,
            contourRotation: this.contourRotation ? this.contourRotation : undefined,
            flexEnabled: this.flexEnabled || undefined,
            flexPins: this.flexPins && this.flexPins.length > 0 ? JSON.parse(JSON.stringify(this.flexPins)) : undefined,
            flexDirection: this.flexDirection !== 'horizontal' ? this.flexDirection : undefined,
            flexPreserveTexture: this.flexPreserveTexture === false ? false : undefined
        };
    }

    // Deserialize
    static fromJSON(data) {
        const obj = new StageObject(data.type, data);
        obj.id = data.id;
        obj.name = data.name;
        obj.visible = data.visible ?? true;
        obj.locked = data.locked ?? false;
        obj.lockAspectRatio = data.lockAspectRatio ?? false;
        obj.pivotX = data.pivotX ?? 0.5;
        obj.pivotY = data.pivotY ?? 0.5;
        obj.showPivot = data.showPivot ?? false;
        obj.depthSideColor = data.depthSideColor || '';
        obj.depthSideMode = ['auto', 'color'].includes(data.depthSideMode) ? data.depthSideMode : 'auto';
        obj.depthLighting = data.depthLighting ?? 45;
        obj.depthPerspective = data.depthPerspective ?? 0;
        obj.flipH = data.flipH ?? false;
        obj.flipV = data.flipV ?? false;
        obj.groupId = data.groupId || null;
        obj.animatedPart = data.animatedPart ? JSON.parse(JSON.stringify(data.animatedPart)) : null;
        obj._characterStackId = data.characterStackId || data._characterStackId || null;
        const characterStackOrder = Number(data.characterStackOrder ?? data._characterStackOrder);
        obj._characterStackOrder = Number.isFinite(characterStackOrder) ? characterStackOrder : undefined;
        if (data.layerMaskSource === true) obj._layerMaskSource = true;
        if (data.layerMaskTargetId) obj._layerMaskTargetId = data.layerMaskTargetId;
        if (data.faceSet) obj.faceSet = JSON.parse(JSON.stringify(data.faceSet));
        if (data._compressionRig) obj._compressionRig = JSON.parse(JSON.stringify(data._compressionRig));
        if (data._compressionPair) obj._compressionPair = JSON.parse(JSON.stringify(data._compressionPair));
        if (data._compressionRigBase) obj._compressionRigBase = JSON.parse(JSON.stringify(data._compressionRigBase));
        if (data._compressionPairBase) obj._compressionPairBase = JSON.parse(JSON.stringify(data._compressionPairBase));
        if (data.smartCutFacePart === true) obj._smartCutFacePart = true;
        if (data.smartCutFacePatch === true) obj._smartCutFacePatch = true;
        if (data.smartCutFaceBase === true) obj._smartCutFaceBase = true;
        if (data.smartCutFaceRole) obj._smartCutFaceRole = data.smartCutFaceRole;
        if (data.smartCutFacePartKey) obj._smartCutFacePartKey = data.smartCutFacePartKey;
        if (data.smartCutFaceGapFillMode) obj._smartCutFaceGapFillMode = data.smartCutFaceGapFillMode;
        if (data.smartCutFaceSourcePartId) obj._smartCutFaceSourcePartId = data.smartCutFaceSourcePartId;
        if (data.smartCutFaceGroupId) obj._smartCutFaceGroupId = data.smartCutFaceGroupId;
        obj.bodyTags = StageObject.normalizeBodyTagList(data.bodyTags);
        obj.flexPreserveTexture = data.flexPreserveTexture !== false;
        // Restore new properties
        obj.fillType = data.fillType || 'solid';
        obj.gradientStops = data.gradientStops || [{offset:0,color:'#4a90d9'},{offset:1,color:'#1a5fb4'}];
        obj.gradientAngle = data.gradientAngle ?? 0;
        obj.patternType = data.patternType || 'none';
        obj.patternColor = data.patternColor || '#ffffff';
        obj.patternScale = data.patternScale ?? 1;
        obj.strokeDash = data.strokeDash || 'solid';
        obj.strokeCap = data.strokeCap || 'round';
        obj.strokeJoin = data.strokeJoin || 'round';
        if (['line', 'path', 'arrow', 'doubleArrow', 'curvedArrow', 'scribble'].includes(obj.type)
            && data.stroke === '#000000'
            && data.fill
            && data.fill !== '#000000') {
            obj.stroke = data.fill;
        }
        obj.glowEnabled = data.glowEnabled ?? false;
        obj.glowColor = data.glowColor || '#00bfff';
        obj.glowSize = data.glowSize ?? 15;
        obj.reflectionEnabled = data.reflectionEnabled ?? false;
        obj.reflectionOpacity = data.reflectionOpacity ?? 0.3;
        obj.reflectionOffset = data.reflectionOffset ?? 0;
        obj.bevelEnabled = data.bevelEnabled ?? false;
        obj.bevelSize = data.bevelSize ?? 4;
        obj.bevelHighlight = data.bevelHighlight || '#ffffff';
        obj.bevelShadow = data.bevelShadow || '#000000';
        obj.shadowColor = data.shadowColor || 'rgba(0,0,0,0.3)';
        obj.shadowBlur = data.shadowBlur ?? 10;
        obj.shadowOffsetX = data.shadowOffsetX ?? 2;
        obj.shadowOffsetY = data.shadowOffsetY ?? 4;
        obj.closedPath = data.closedPath ?? true;
        obj.textureImageSrc = data.textureImageSrc || null;
        obj.pictureFillMode = ['stretch', 'fill', 'fit'].includes(data.pictureFillMode)
            ? data.pictureFillMode
            : 'stretch';
        obj.pictureFillRotation = Number.isFinite(Number(data.pictureFillRotation))
            ? Number(data.pictureFillRotation)
            : 0;
        if (obj.textureImageSrc) obj.loadTextureImage(obj.textureImageSrc);
        obj.fontStyle = data.fontStyle || 'normal';
        obj.textDecoration = data.textDecoration || 'none';
        obj.lineHeight = data.lineHeight ?? 1.4;
        obj.letterSpacing = data.letterSpacing ?? 0;
        obj.textCurve = data.textCurve ?? 0;
        obj.textTransform = data.textTransform || 'none';
        obj.listStyle = data.listStyle || 'none';
        obj.listIndent = Number.isFinite(data.listIndent) ? data.listIndent : 24;
        obj.textStrokeColor = data.textStrokeColor || '#000000';
        obj.textStrokeWidth = data.textStrokeWidth ?? 0;
        obj.textBackgroundEnabled = data.textBackgroundEnabled ?? false;
        obj.textBackgroundColor = data.textBackgroundColor || '#111827';
        obj.textBackgroundPadding = data.textBackgroundPadding ?? 10;
        obj.textBackgroundRadius = data.textBackgroundRadius ?? 8;
        obj.animations = data.animations || [];
        if (data.expressions && typeof data.expressions === 'object') {
            obj.expressions = JSON.parse(JSON.stringify(data.expressions));
        }
        // Animated GIF data (frames are re-decoded from imageSrc on load)
        obj.isAnimatedGif = data.isAnimatedGif || false;
        obj.gifFrameDelays = data.gifFrameDelays || null;
        obj.isSpriteSequence = data.isSpriteSequence || false;
        obj.spriteSheet = data.spriteSheet ? JSON.parse(JSON.stringify(data.spriteSheet)) : null;
        obj._spriteStartTime = performance.now();
        // Rigging data
        if (data.rigging) {
            obj.rigging = JSON.parse(JSON.stringify(data.rigging));
            obj.rigging.deformationMode = obj.rigging.deformationMode || 'skeletal';
            obj.rigging.showBoneLabels = obj.rigging.showBoneLabels !== false;
            obj.rigging.bones = (obj.rigging.bones || []).map((bone, index) => ({
                ...bone,
                name: typeof bone.name === 'string' && bone.name.trim() ? bone.name.trim() : `Bone ${index + 1}`,
                stiffness: typeof bone.stiffness === 'number' ? bone.stiffness : 1,
                ikLocked: bone.ikLocked === true,
                minAngle: typeof bone.minAngle === 'number' ? bone.minAngle : null,
                maxAngle: typeof bone.maxAngle === 'number' ? bone.maxAngle : null
            }));
        }
        // Pin data
        obj.pinnedTo = data.pinnedTo || null;
        obj.pinOffsetX = data.pinOffsetX ?? 0;
        obj.pinOffsetY = data.pinOffsetY ?? 0;
        obj.pinAnchorX = data.pinAnchorX ?? 0.5;
        obj.pinAnchorY = data.pinAnchorY ?? 0.5;
        obj.pinTargetType = data.pinTargetType || ((data.pinJointId || data.pinJointName) ? 'joint' : 'anchor');
        obj.pinJointId = data.pinJointId || null;
        obj.pinJointName = data.pinJointName || null;
        obj.pinRotationMode = data.pinRotationMode || (data.pinInheritRotation ? 'inherit' : 'static');
        obj.pinInheritRotation = data.pinInheritRotation ?? false;
        obj.pinBaseTiltX = data.pinBaseTiltX ?? 0;
        obj.pinBaseTiltY = data.pinBaseTiltY ?? 0;
        if (data.pinInheritParentJointName) obj._pinInheritParentJointName = data.pinInheritParentJointName;
        if (data.armatureAttachmentPin === true) obj._armatureAttachmentPin = true;
        if (data.normalizedDownBaseline != null) obj._normalizedDownBaseline = data.normalizedDownBaseline === true;
        if (data.bslSkipTorsoAttachmentRig) obj._bslSkipTorsoAttachmentRig = true;
            if (data.armatureFrontBackFacing) obj._armatureFrontBackFacing = data.armatureFrontBackFacing;
            if (data.armatureFront3qLean === 'left' || data.armatureFront3qLean === 'right') obj._armatureFront3qLean = data.armatureFront3qLean;
            if (data.armaturePromotedProfile) obj._armaturePromotedProfile = data.armaturePromotedProfile;
            if (data.armatureFacingSide) obj._armatureFacingSide = data.armatureFacingSide;
            if (data.armatureFacingExplicit != null) obj._armatureFacingExplicit = data.armatureFacingExplicit === true;
            if (data.armatureSilhouetteRig) obj._armatureSilhouetteRig = true;
            if (data.armatureSilhouetteSourceProfile) obj._armatureSilhouetteSourceProfile = JSON.parse(JSON.stringify(data.armatureSilhouetteSourceProfile));
            if (data.armatureSkinStrictSideProfile != null) obj._armatureSkinStrictSideProfile = data.armatureSkinStrictSideProfile !== false;
            if (data.armatureDrawLayer != null || data._armatureDrawLayer != null) {
                const armatureDrawLayer = Number(data.armatureDrawLayer ?? data._armatureDrawLayer);
                if (Number.isFinite(armatureDrawLayer)) obj._armatureDrawLayer = armatureDrawLayer;
            }
            if (data.armatureRoleKey) obj._armatureRoleKey = data.armatureRoleKey;
            if (data.armaturePartKey) obj._armaturePartKey = data.armaturePartKey;
            if (data.ucCharacterFamilyId) obj._ucCharacterFamilyId = data.ucCharacterFamilyId;
            if (data.ucCharacterVariantKey) obj._ucCharacterVariantKey = data.ucCharacterVariantKey;
            if (data.ucCharacterStyleConfig) obj._ucCharacterStyleConfig = JSON.parse(JSON.stringify(data.ucCharacterStyleConfig));
            if (Array.isArray(data.ucCharacterLinkedViews)) obj._ucCharacterLinkedViews = JSON.parse(JSON.stringify(data.ucCharacterLinkedViews));
            if (data.ucCharacterFamilyState) obj._ucCharacterFamilyState = JSON.parse(JSON.stringify(data.ucCharacterFamilyState));
            if (data.ucGarmentLayer === true) obj._ucGarmentLayer = true;
            if (data.ucGarmentRootId) obj._ucGarmentRootId = data.ucGarmentRootId;
            if (data.ucGarmentForPartId) obj._ucGarmentForPartId = data.ucGarmentForPartId;
            if (data.ucGarmentPartKey) obj._ucGarmentPartKey = data.ucGarmentPartKey;
            if (data.ucGarmentFamilyId) obj._ucGarmentFamilyId = data.ucGarmentFamilyId;
            if (data.ucGarmentVariantKey) obj._ucGarmentVariantKey = data.ucGarmentVariantKey;
            if (data.ucGarmentPolicyVersion) obj._ucGarmentPolicyVersion = data.ucGarmentPolicyVersion;
            if (data.ucGarmentAdapterId) obj._ucGarmentAdapterId = data.ucGarmentAdapterId;
            if (data.ucGarmentMotionPolicy) obj._ucGarmentMotionPolicy = data.ucGarmentMotionPolicy;
            if (data.ucGarmentLayerPolicy) obj._ucGarmentLayerPolicy = data.ucGarmentLayerPolicy;
            if (data.ucGarmentDeformationPolicy) obj._ucGarmentDeformationPolicy = data.ucGarmentDeformationPolicy;
            if (data.svgAfricanGarmentLayer === true) obj._svgAfricanGarmentLayer = true;
            if (data.svgAfricanGarmentSlot) obj._svgAfricanGarmentSlot = data.svgAfricanGarmentSlot;
            if (data.svgAfricanGarmentKind) obj._svgAfricanGarmentKind = data.svgAfricanGarmentKind;
            if (data.svgAfricanGarmentViewFamily) obj._svgAfricanGarmentViewFamily = data.svgAfricanGarmentViewFamily;
            if (data.svgAfricanGarmentFacing) obj._svgAfricanGarmentFacing = data.svgAfricanGarmentFacing;
            if (data.svgAfricanGarmentContinuityType) obj._svgAfricanGarmentContinuityType = data.svgAfricanGarmentContinuityType;
            if (Number.isFinite(Number(data.ucGarmentDeformationShearX))) {
                obj._ucGarmentDeformationShearX = Number(data.ucGarmentDeformationShearX);
            }
            if (Number.isFinite(Number(data.ucGarmentDeformationScaleY))) {
                obj._ucGarmentDeformationScaleY = Number(data.ucGarmentDeformationScaleY);
            }
            if (data.ucSideTorsoGarmentLayer === true) obj._ucSideTorsoGarmentLayer = true;
        if (data.facialExpression) obj._facialExpression = data.facialExpression;
        if (data.facialFeatures) obj._facialFeatures = JSON.parse(JSON.stringify(data.facialFeatures));
        if (data.facialProportions) {
            obj._facialProportions = JSON.parse(JSON.stringify(data.facialProportions));
        }
        if (data.facialDrawContext && typeof data.facialDrawContext === 'object') {
            obj._facialDrawCtx = JSON.parse(JSON.stringify(data.facialDrawContext));
        }
        if (data.facialLocalRect && typeof data.facialLocalRect === 'object') {
            obj._facialLocalRect = JSON.parse(JSON.stringify(data.facialLocalRect));
        }
        if (data.facialUseAnchorPin === true) obj._facialUseAnchorPin = true;
        if (data.facialFeatureKey) obj._facialFeatureKey = data.facialFeatureKey;
        if (data.facialParentHead) obj._facialParentHead = data.facialParentHead;
        if (data.facialBasePinOffsetX !== undefined) obj._facialBasePinOffsetX = data.facialBasePinOffsetX;
        if (data.facialBasePinOffsetY !== undefined) obj._facialBasePinOffsetY = data.facialBasePinOffsetY;
        if (data.facialBaseRotation !== undefined) obj._facialBaseRotation = data.facialBaseRotation;
        if (data.svgAvatar || data._svgAvatar) obj._svgAvatar = JSON.parse(JSON.stringify(data.svgAvatar || data._svgAvatar));
        if (data.characterAppearanceProvider || data._characterAppearanceProvider) obj._characterAppearanceProvider = data.characterAppearanceProvider || data._characterAppearanceProvider;
        if (data.svgCharacter === true || data._svgCharacter === true) obj._svgCharacter = true;
        if (data.svgCharacterVersion || data._svgCharacterVersion) obj._svgCharacterVersion = data.svgCharacterVersion || data._svgCharacterVersion;
        if (data.svgCharacterEngine || data._svgCharacterEngine) obj._svgCharacterEngine = data.svgCharacterEngine || data._svgCharacterEngine;
        if (data.svgCharacterInstanceId || data._svgCharacterInstanceId) obj._svgCharacterInstanceId = data.svgCharacterInstanceId || data._svgCharacterInstanceId;
        if (data.svgCharacterIdentityId || data._svgCharacterIdentityId) obj._svgCharacterIdentityId = data.svgCharacterIdentityId || data._svgCharacterIdentityId;
        if (data.svgCharacterConfig || data._svgCharacterConfig) obj._svgCharacterConfig = Utils.cloneProjectState(data.svgCharacterConfig || data._svgCharacterConfig);
        if (data.svgCharacterIdentity || data._svgCharacterIdentity) obj._svgCharacterIdentity = JSON.parse(JSON.stringify(data.svgCharacterIdentity || data._svgCharacterIdentity));
        if (data.svgCharacterStyling || data._svgCharacterStyling) obj._svgCharacterStyling = JSON.parse(JSON.stringify(data.svgCharacterStyling || data._svgCharacterStyling));
        if (data.svgCharacterViewProfileKey || data._svgCharacterViewProfileKey) obj._svgCharacterViewProfileKey = data.svgCharacterViewProfileKey || data._svgCharacterViewProfileKey;
        if (data.svgCharacterProjectionMode || data._svgCharacterProjectionMode) obj._svgCharacterProjectionMode = data.svgCharacterProjectionMode || data._svgCharacterProjectionMode;
        if (data.svgCharacterPremiumAssetId || data._svgCharacterPremiumAssetId) obj._svgCharacterPremiumAssetId = data.svgCharacterPremiumAssetId || data._svgCharacterPremiumAssetId;
        if (data.svgCharacterPart === true || data._svgCharacterPart === true) obj._svgCharacterPart = true;
        if (data.svgCharacterPremiumPart === true || data._svgCharacterPremiumPart === true) obj._svgCharacterPremiumPart = true;
        if (data.svgCharacterPartKey || data._svgCharacterPartKey) obj._svgCharacterPartKey = data.svgCharacterPartKey || data._svgCharacterPartKey;
        if (data.svgCharacterPremiumPartKey || data._svgCharacterPremiumPartKey) obj._svgCharacterPremiumPartKey = data.svgCharacterPremiumPartKey || data._svgCharacterPremiumPartKey;
        if (data.svgAfricanPremiumAssetId || data._svgAfricanPremiumAssetId) obj._svgAfricanPremiumAssetId = data.svgAfricanPremiumAssetId || data._svgAfricanPremiumAssetId;
        if (data.svgAfricanAssetProfile || data._svgAfricanAssetProfile) obj._svgAfricanAssetProfile = data.svgAfricanAssetProfile || data._svgAfricanAssetProfile;
        if (data.svgAfricanSourcePath || data._svgAfricanSourcePath) obj._svgAfricanSourcePath = data.svgAfricanSourcePath || data._svgAfricanSourcePath;
        if (data.svgAfricanSourceFile || data._svgAfricanSourceFile) obj._svgAfricanSourceFile = data.svgAfricanSourceFile || data._svgAfricanSourceFile;
        if (data.svgAfricanMasterFile || data._svgAfricanMasterFile) obj._svgAfricanMasterFile = data.svgAfricanMasterFile || data._svgAfricanMasterFile;
        if (data.svgAfricanCalibrationVersion || data._svgAfricanCalibrationVersion) obj._svgAfricanCalibrationVersion = data.svgAfricanCalibrationVersion || data._svgAfricanCalibrationVersion;
        if (Number.isFinite(Number(data.svgAfricanAnatomicalLayoutVersion ?? data._svgAfricanAnatomicalLayoutVersion))) {
            obj._svgAfricanAnatomicalLayoutVersion = Number(data.svgAfricanAnatomicalLayoutVersion ?? data._svgAfricanAnatomicalLayoutVersion);
        }
        if (data.svgAfricanAssetManifest || data._svgAfricanAssetManifest) obj._svgAfricanAssetManifest = JSON.parse(JSON.stringify(data.svgAfricanAssetManifest || data._svgAfricanAssetManifest));
        if (data.svgAfricanCalibration || data._svgAfricanCalibration) obj._svgAfricanCalibration = JSON.parse(JSON.stringify(data.svgAfricanCalibration || data._svgAfricanCalibration));
        if (data.svgAfricanPartProfile || data._svgAfricanPartProfile) obj._svgAfricanPartProfile = JSON.parse(JSON.stringify(data.svgAfricanPartProfile || data._svgAfricanPartProfile));
        if (data.svgAfricanJointProfile || data._svgAfricanJointProfile) obj._svgAfricanJointProfile = JSON.parse(JSON.stringify(data.svgAfricanJointProfile || data._svgAfricanJointProfile));
        if (data.svgAfricanPinProfile || data._svgAfricanPinProfile) obj._svgAfricanPinProfile = JSON.parse(JSON.stringify(data.svgAfricanPinProfile || data._svgAfricanPinProfile));
        if (data.svgAfricanFaceState || data._svgAfricanFaceState) obj._svgAfricanFaceState = JSON.parse(JSON.stringify(data.svgAfricanFaceState || data._svgAfricanFaceState));
        if (data.svgAfricanAdjustments || data._svgAfricanAdjustments) obj._svgAfricanAdjustments = JSON.parse(JSON.stringify(data.svgAfricanAdjustments || data._svgAfricanAdjustments));
        obj.showDepthHandle = data.showDepthHandle ?? false;
        obj.contourFillMode = data.contourFillMode || 'auto';
        obj.contourPatternType = data.contourPatternType || 'stripes';
        obj.contourPatternColor = data.contourPatternColor || '#ffffff';
        obj.contourPatternScale = data.contourPatternScale ?? 1;
        obj.contourGradientStart = data.contourGradientStart || '#ffffff';
        obj.contourGradientEnd = data.contourGradientEnd || data.contourColor || '#888888';
        obj.contourGradientAngle = data.contourGradientAngle ?? 0;
        // Joint data
        obj.joints = data.joints ? JSON.parse(JSON.stringify(data.joints)) : [];
        obj.jointDirection = StageObject.normalizeJointDirection(data.jointDirection);
        obj.jointBaseAngle = data.jointBaseAngle || 0;
        obj.bodyPartData = data.bodyPartData || null;
        StageObject.normalizeSvgAfricanHeadNeckRig(obj);
        if (data.armatureViewState) globalThis.ArmatureViewState?.apply(obj, data.armatureViewState, true);
        globalThis.ArmatureViewState?.warmImages(obj);
        return obj;
    }

    static stripCompressionRuntimeState(data) {
        if (!data || typeof data !== 'object') return data;
        if (Array.isArray(data)) {
            return data.map(item => StageObject.stripCompressionRuntimeState(item));
        }
        const next = { ...data };
        delete next._compressionRig;
        delete next._compressionPair;
        delete next._compressionRigBase;
        delete next._compressionPairBase;
        return next;
    }
}
StageObject.counter = 1;


class ObjectManager {
    constructor(stageManager) {
        this.stage = stageManager;
        this.objects = [];
        this.selectedIds = [];
        this.currentTool = 'select';
        
        // Drawing state
        this.isDrawing = false;
        this.drawStart = null;
        this.tempObject = null;
        
        // Drag state
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        
        // Resize state
        this.isResizing = false;
        this.resizeHandle = null;
        this.resizeStart = null;
        this._groupResizing = false;

        // Rotation state
        this.isRotating = false;
        this.rotateStartAngle = 0;
        this.rotateObjStartAngle = 0;
        this.isAdjustingDepth = false;
        this._depthAdjustData = null;
        
        // Selection box
        this.isSelecting = false;
        this.selectStart = null;
        this.selectEnd = null;
        
        // Stage pan mode toggle
        this._stagePanMode = false;
        
        // Path drawing
        this.isDrawingPath = false;
        this.currentPath = [];

        // Trace drawing (point-by-point, creates filled shape)
        this.isDrawingTrace = false;
        this.currentTracePath = [];

        // Smart guides (snap-to-object alignment)
        this.smartGuides = [];       // [{type:'v'|'h', pos:number, from:number, to:number}]
        this.smartGuideThreshold = 5; // px threshold

        // Object grouping
        this.groups = {};  // { groupId: [objId, ...] }
        this.groupNames = {}; // { groupId: 'Group N' }
        this._groupCounter = 0;
        this._groupEditMode = null;  // groupId when editing inside a group (sub-selection)
        this._groupEditSavedSelection = []; // selection before entering group edit
        this._isRenaming = false; // flag to prevent rebuilds during inline rename

        // Layer system
        this.layers = [{ id: 'layer-1', name: 'Layer 1', visible: true, locked: false }];
        this.activeLayerId = 'layer-1';
        this._layerCounter = 1;
        this._collapsedLayers = new Set();

        // Copy position/size mode
        this._copyMode = null; // null | 'position' | 'size'
        this._copyData = null; // { x, y } or { width, height }

        // Interactive joint placement state
        this._pinPickMode = false;
        this._pinPickObj = null;
        this._jointPlaceMode = false;
        this._jointPlaceObj = null;
        this._jointPlaceSpec = null;
        this._jointPlacementGuide = null;

        // Interactive crop mode state
        this._cropMode = false;
        this._cropObj = null;
        this._cropRect = null;  // { x, y, w, h } in stage coordinates
        this._cropDragging = null; // null | 'move' | handle name
        this._cropDragStart = null;
        this._cropRectStart = null;

        // Image eraser mode state
        this._eraserMode = false;
        this._eraserObj = null;
        this._eraserCanvas = null;   // offscreen canvas with editable image
        this._eraserCtx = null;
        this._eraserDrawing = false;
        this._eraserLastPos = null;
        this._eraserBrushSize = 20;
        this._eraserHardness = 100;  // 0-100 (100 = hard edge, 0 = soft)
        this._eraserCursorPos = null; // for rendering brush preview

        // Non-destructive edge refinement preview state
        this._edgeRefineMode = false;
        this._edgeRefineObj = null;
        this._edgeRefineSourceCanvas = null;
        this._edgeRefinePreviousCanvas = null;
        this._edgeRefineTimer = null;

        // Non-destructive color replace / color key preview state
        this._imageColorKeyMode = false;
        this._imageColorKeyObj = null;
        this._imageColorKeySourceCanvas = null;
        this._imageColorKeyPreviousCanvas = null;
        this._imageColorKeyTimer = null;
        this._imageColorKeyPicking = false;

        // Non-destructive four-corner perspective preview state
        this._imagePerspectiveMode = false;
        this._imagePerspectiveObj = null;
        this._imagePerspectiveSourceCanvas = null;
        this._imagePerspectivePreviousCanvas = null;
        this._imagePerspectiveView = null;
        this._imagePerspectiveTimer = null;

        // Sprite-sheet extraction panel state
        this._spriteSheetState = null;

        // Non-destructive clone brush mode state
        this._cloneBrushMode = false;
        this._cloneBrushSource = null;
        this._cloneBrushSourceCanvas = null;
        this._cloneBrushSourcePoint = null;
        this._cloneBrushTarget = null;
        this._cloneBrushLayer = null;
        this._cloneBrushCanvas = null;
        this._cloneBrushCtx = null;
        this._cloneBrushDrawing = false;
        this._cloneBrushLastPoint = null;
        this._cloneBrushStrokeAnchor = null;
        this._cloneBrushAlignedAnchor = null;
        this._cloneBrushCursorPos = null;
        this._cloneBrushLiveSourcePos = null;
        this._cloneBrushStrokeStartStage = null;
        this._cloneBrushStrokeMoved = false;
        this._cloneBrushRecentStrokes = [];
        this._cloneBrushMaskMode = false;
        this._cloneBrushMaskDrawing = false;
        this._cloneBrushMaskPoints = [];
        this._cloneBrushMaskCanvas = null;
        this._cloneBrushMaskTextureCanvas = null;
        this._cloneBrushMaskTextureCache = null;
        this._cloneBrushMaskBounds = null;
        this._cloneBrushMaskFeather = 2;
        this._cloneBrushMaskInverted = false;
        this._cloneBrushClipTargetAlpha = false;
        this._cloneBrushTargetAlphaCanvas = null;
        this._cloneBrushBoundaryMode = null;
        this._cloneBrushBoundaryDrawing = false;
        this._cloneBrushBoundaryPoints = [];
        this._cloneBrushBoundaryObject = null;
        this._cloneBrushBoundaryCanvas = null;
        this._cloneBrushBoundaryFeather = 2;
        this._cloneBrushBoundaryInverted = false;
        this._cloneBrushBoundaryPointerStart = null;
        this._cloneBrushBoundaryDragged = false;
        this._cloneBrushMaskPointerStart = null;
        this._cloneBrushMaskDragged = false;
        this._cloneBrushPickSource = false;
        this._cloneBrushPickTarget = false;
        this._cloneBrushSize = 36;
        this._cloneBrushHardness = 75;
        this._cloneBrushOpacity = 100;
        this._cloneBrushSpacing = 20;
        this._cloneBrushAligned = true;
        this._cloneBrushUndo = [];
        this._cloneBrushRedo = [];

        // Object eraser mode state (shape-based erasing)
        this._objEraserMode = false;
        this._objEraserTarget = null;     // the object being erased
        this._objEraserCanvas = null;     // offscreen canvas for the target
        this._objEraserCtx = null;
        this._objEraserShape = null;      // the eraser shape object
        this._objEraserDragging = false;  // dragging the eraser shape
        this._objEraserDragOff = null;    // drag offset {x, y}
        this._objEraserOrigPos = null;    // original position of eraser shape for reset
        this._objEraserOrigRot = null;    // { eraserRot, targetRot } for reset

        // Slice tool state
        this._sliceMode = false;
        this._sliceObj = null;       // target object being sliced
        this._slicePoints = [];      // array of { x, y } in stage coords
        this._sliceHoverPos = null;  // cursor position for live preview line
        this._sliceLocked = false;   // true after double-click: points frozen, cursor freed
        this._sliceModeChoice = null; // 'single' | 'continuous' selected via stage chooser
        this._sliceContinuousMode = false; // queue multiple regions before cutting
        this._sliceQueuedRegions = []; // queued regions: array of stage-point arrays

        // Flex tool state (arc bending)
        this._flexMode = false;
        this._flexObj = null;           // object being flexed
        this._flexDraggingPin = -1;     // index of pin being dragged (bend handle)
        this._flexDragStart = null;     // { x, y } stage pos where drag began
        this._flexDragStartAngle = 0;   // pin angle when drag began
        this._flexHoverPin = -1;        // index of hovered pin

        // Object clipboard (copy/paste)
        this._clipboard = [];       // array of serialised object data from toJSON()
        this._clipboardPayload = null; // grouped/single transfer payload used for copy/paste
        this._clipboardStagePos = null; // stage position when copied (for offset pasting)

        // Rigging manager (bone/pin tool)
        this.rigging = new RiggingManager(this, stageManager);

        this.init();
    }

    init() {
        this.bindCanvasEvents();
        this.bindToolEvents();
        this.bindPropertyEvents();
        this.bindObjectListEvents();
        this.bindRenderEvents();
        this.initAssetLibraryUI();
        this.initIconLibrary();
        this.initEmojiLibrary();
        this.initPropLibrary();
        this.initAnimatedParts();
        this._initPropRecording();
    }

    bindRenderEvents() {
        eventBus.on('stage:render', (ctx) => this.renderAll(ctx));
        eventBus.on('stage:render-selection', (ctx) => this.renderSelection(ctx));

        // Smart alignment guides (drawn while dragging)
        eventBus.on('stage:render-overlay', (ctx) => this.renderSmartGuides(ctx));

        // Restore hand cursor after pan-end
        eventBus.on('stage:pan-end', () => {
            if (this.currentTool === 'hand') {
                this.stage.viewport.style.cursor = 'grab';
            }
        });

        // Recording mode
        eventBus.on('recording:start', (options = {}) => {
            this._isRecording = true;
            if (options && typeof options === 'object' && options.orderMode) {
                this._recordOrderMode = options.orderMode === 'sequence' ? 'sequence' : 'same';
            }
        });
        eventBus.on('recording:stop', () => { this._isRecording = false; this._recordSnapshots = null; });
        eventBus.on('recording:order-mode', (mode = 'same') => {
            this._recordOrderMode = mode === 'sequence' ? 'sequence' : 'same';
            if (this._recordOrderMode === 'same') this._recordSequenceCursorMs = null;
        });

        // When a new object is drawn during step recording (and not during
        // continuous recording, which has its own draw-track sampling), inject
        // a "from invisible" snapshot so the recorder can produce a draw-on.
        eventBus.on('object:added', (obj) => {
            if (!obj || this._contRec?.active) return;
            if (!this._isRecording) return;
            if (!this._recordSnapshots) this._recordSnapshots = new Map();
            if (this._recordSnapshots.has(obj.id)) return;
            const fromZero = {
                x: obj.x, y: obj.y,
                width: 0, height: 0,
                rotation: obj.rotation,
                depth: obj.depth ?? 0,
                tiltX: obj.tiltX ?? 0, tiltY: obj.tiltY ?? 0,
                scaleX: obj.scaleX ?? 1, scaleY: obj.scaleY ?? 1,
                opacity: 0,
                jointBaseAngle: obj.jointBaseAngle ?? 0,
                pinOffsetX: obj.pinOffsetX ?? 0,
                pinOffsetY: obj.pinOffsetY ?? 0,
                fill: obj.fill, stroke: obj.stroke,
                strokeWidth: obj.strokeWidth ?? 0,
                borderRadius: obj.borderRadius ?? 0,
                imageSrc: obj.imageSrc,
                textureImageSrc: obj.textureImageSrc,
                visible: obj.visible !== false,
                flipH: !!obj.flipH, flipV: !!obj.flipV
            };
            if (obj.joints && obj.joints.length > 0) {
                const sorted = [...obj.joints].sort((a, b) => a.position - b.position);
                sorted.forEach((jt, idx) => {
                    fromZero['jointAngle_' + idx] = jt.angle || 0;
                    fromZero['jointTiltX_' + idx] = jt.tiltX || 0;
                    fromZero['jointTiltY_' + idx] = jt.tiltY || 0;
                    fromZero['jointCrossOffset_' + idx] = jt.crossOffset ?? 0.5;
                });
            }
            this._recordSnapshots.set(obj.id, fromZero);
            // The drawn object's mouseup path already calls _showRecordingConfirm
            // for drag flows, but a fresh draw doesn't go through the drag branch.
            // Trigger the confirm explicitly here.
            try { this._showRecordingConfirm(); } catch (_) {}
        });
    }

    // Draw smart alignment guides on the stage. Lines are stage-space
    // coordinates already; the stage applies pan/zoom transform before
    // emitting `stage:render-overlay`, so we just stroke them directly.
    renderSmartGuides(ctx) {
        if (!this.smartGuides || this.smartGuides.length === 0) return;
        const zoom = this.stage.zoom || 1;
        ctx.save();
        ctx.strokeStyle = '#ff3aa5';        // hot pink — same convention as Figma/Sketch
        ctx.lineWidth = 1 / zoom;
        ctx.setLineDash([4 / zoom, 3 / zoom]);
        for (const g of this.smartGuides) {
            ctx.beginPath();
            if (g.type === 'v') {
                ctx.moveTo(g.pos, g.from);
                ctx.lineTo(g.pos, g.to);
            } else {
                ctx.moveTo(g.from, g.pos);
                ctx.lineTo(g.to, g.pos);
            }
            ctx.stroke();
        }
        ctx.setLineDash([]);
        ctx.restore();
    }

    bindCanvasEvents() {
        const viewport = this.stage.viewport;

        viewport.addEventListener('mousedown', (e) => {
            if (e.button !== 0 || (e.altKey && !this._cloneBrushMode)) return;
            if (this.stage._sbDragging || this.stage._sbHover) return; // scrollbar active
            const pos = this.stage.screenToStage(e.clientX, e.clientY);
            this.handleMouseDown(pos, e);
        });

        viewport.addEventListener('mousemove', (e) => {
            if (this.stage._sbDragging || this.stage.isPanning) return; // scrollbar or stage pan in progress
            const pos = this.stage.screenToStage(e.clientX, e.clientY);
            this.handleMouseMove(pos, e);
        });

        viewport.addEventListener('mouseup', (e) => {
            if (this.stage._sbDragging) return; // scrollbar being dragged
            const pos = this.stage.screenToStage(e.clientX, e.clientY);
            this.handleMouseUp(pos, e);
        });

        viewport.addEventListener('dblclick', (e) => {
            const pos = this.stage.screenToStage(e.clientX, e.clientY);
            this.handleDoubleClick(pos, e);
        });

        // Context menu
        viewport.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            // Smart Cut active — let joint-system handle contextmenu
            if (window.app?.jointSystem?._smartCutActive) return;
            // Body Stencil active — let joint-system handle contextmenu
            if (window.app?.jointSystem?._bsActive) return;
            if (this.stage._suppressContextMenuOnce) {
                this.stage._suppressContextMenuOnce = false;
                return;
            }
            const pos = this.stage.screenToStage(e.clientX, e.clientY);
            // Trace mode: right-click toggles last placed point's segment type
            if (this.isDrawingTrace && this.currentTracePath.length >= 2) {
                this._toggleTraceSegmentType(pos);
                return;
            }
            // Point edit mode: right-click on point → delete, on edge → add
            if (this._pointEditMode && this._pointEditObj) {
                this._handlePointEditRightClick(pos, e);
                return;
            }
            // Rig mode: right-click to add pins
            if (this.rigging.isActive && this.rigging.handleContextMenu(pos)) {
                return;
            }
            this.showContextMenu(e.clientX, e.clientY, pos);
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyDown(e);
        });
    }

    _invalidateAnimationBaseSnapshot() {
        const anim = window.app?.animations;
        if (!anim) return;
        anim.originalStates = null;
        anim._preserveFinalPose = false;
    }

    handleMouseDown(pos, e) {
        // Smart Cut active — let joint-system handle all stage interaction
        if (window.app?.jointSystem?._smartCutActive) return;

        if (window.app?.faceRig?.isActive?.()) {
            if (window.app.faceRig.handleMouseDown(pos, e)) return;
        }

        if (this._imageColorKeyMode && this._imageColorKeyPicking) {
            this._handleImageColorKeyPick(pos);
            return;
        }

        const tool = this.currentTool;

        // Measure mode intercept
        if (this._measureMode) {
            this._handleMeasureMouseDown(pos);
            return;
        }

        // Copy position/size mode intercept
        if (this._copyMode) {
            const hit = this.hitTest(pos.x, pos.y);
            if (hit) {
                this.applyCopyMode(hit);
            } else {
                this.cancelCopyMode();
            }
            return;
        }

        // Pin pick-point mode intercept
        if (this._pinPickMode && this._pinPickObj) {
            this._handlePinPickClick(pos);
            return;
        }

        // Joint placement mode intercept
        if (this._jointPlaceMode && this._jointPlaceObj) {
            this._handleJointPlacementClick(pos);
            return;
        }

        // Crop mode intercept
        if (this._cropMode && this._cropRect) {
            if (e.target.closest('#crop-floating-toolbar')) return;
            this._handleCropMouseDown(pos);
            return;
        }

        // Object eraser mode intercept
        if (this._objEraserMode && this._objEraserShape) {
            this._handleObjEraserMouseDown(pos);
            return;
        }

        // Eraser mode intercept
        if (this._eraserMode && this._eraserObj) {
            this._handleEraserMouseDown(pos);
            return;
        }

        // Clone brush mode intercept
        if (this._cloneBrushMode) {
            this._handleCloneBrushMouseDown(pos, e);
            return;
        }

        // Flex mode intercept
        if (this._flexMode && this._flexObj) {
            this._handleFlexMouseDown(pos);
            return;
        }

        // Flex Rig mode intercept
        if (this._flexRigMode) {
            if (this._handleFlexRigMouseDown(pos)) return;
        }

        // Slice mode intercept
        if (this._sliceMode && !this._sliceLocked) {
            // Ignore clicks on slice overlay UI controls
            if (e.target.closest('#slice-floating-toolbar') || e.target.closest('#slice-mode-chooser')) return;
            this._handleSliceClick(pos);
            return;
        }

        // Rig mode intercept
        if (this.rigging.isActive) {
            this.rigging.handleMouseDown(pos, e);
            return;
        }

        // Animation paint mode intercept
        if (this._animPaintMode) {
            this._handleAnimPaintClick(pos);
            return;
        }

        // Eyedropper mode intercept
        if (this._eyedropperMode || tool === 'eyedropper') {
            this._handleEyedropperClick(pos);
            return;
        }

        // Point editing mode intercept
        if (this._pointEditMode) {
            this._resetIdleRevert();
            const ptIdx = this.hitTestPoint(pos.x, pos.y);
            if (ptIdx >= 0) {
                this._selectedPointIdx = ptIdx;
                this._draggingPoint = true;
                this._dragPointStart = {x: pos.x, y: pos.y};
                const pt = this._pointEditObj.pathPoints[ptIdx];
                document.getElementById('point-info')?.classList.remove('hidden');
                const pxEl = document.getElementById('point-x');
                const pyEl = document.getElementById('point-y');
                if (pxEl) pxEl.value = Math.round(pt.x);
                if (pyEl) pyEl.value = Math.round(pt.y);
                this.stage.requestRender();
                return;
            }
            // Click not on a point - deselect point (but stay in mode)
            this._selectedPointIdx = -1;
            document.getElementById('point-info')?.classList.add('hidden');
            this.stage.requestRender();
            // Don't return — allow falling through to normal select
        }

        // Emit stage click event for path animation picking etc.
        // If a path-animation pick is active, let it handle and skip normal logic
        if (this._pathPickActive) {
            eventBus.emit('stage:click', pos);
            return;
        }
        eventBus.emit('stage:click', pos);

        // Check for joint hit (cursor rotation on joints)
        if (tool === 'select') {
            const jointHit = this._hitTestJoint(pos);
            if (jointHit) {
                this._draggingJoint = true;
                this._dragJointObj = jointHit.obj;
                this._dragJoint = jointHit.joint;
                this._dragJointStartAngle = jointHit.joint.angle || 0;
                this._dragJointPrevRad = Math.atan2(pos.y - jointHit.worldPos.y, pos.x - jointHit.worldPos.x);
                this._dragJointAccumDeg = 0;
                this._dragJointCenter = jointHit.worldPos;
                this.stage.viewport.style.cursor = 'grabbing';
                if (this._isRecording) this._snapshotForRecording(true);
                return;
            }
        }

        if (tool === 'select' && this.selectedIds.length === 1) {
            const depthHandle = this.getDepthHandle(pos);
            if (depthHandle) {
                this.isAdjustingDepth = true;
                this._depthAdjustData = {
                    objId: depthHandle.obj.id,
                    startPos: { x: pos.x, y: pos.y },
                    startDepth: depthHandle.obj.getDepthValue(),
                    dir: { ...depthHandle.dir }
                };
                this.stage.viewport.style.cursor = 'grabbing';
                if (this._isRecording) this._snapshotForRecording(true);
                return;
            }
        }

        // Check for rotation handle first (corners outside bounding box)
        if (tool === 'select' && this.selectedIds.length >= 1) {
            const rotHandle = this.getRotationHandle(pos);
            if (rotHandle) {
                this.isRotating = true;
                this.stage.viewport.style.cursor = 'grabbing';
                if (this._isRecording) this._snapshotForRecording(true);

                if (rotHandle.startsWith('group_')) {
                    // Group rotation
                    const groupId = this._getSelectedGroupId();
                    const bounds = this.getGroupBounds(groupId);
                    const cx = bounds.x + bounds.width / 2;
                    const cy = bounds.y + bounds.height / 2;
                    this._groupRotating = true;
                    this.rotateStartAngle = Math.atan2(pos.y - cy, pos.x - cx);
                    this._groupRotateData = {
                        groupId,
                        centerX: cx,
                        centerY: cy,
                        originals: this.groups[groupId].map(id => {
                            const o = this.getObjectById(id);
                            if (!o) return null;
                            return {
                                id,
                                cx: o.x + o.width / 2,
                                cy: o.y + o.height / 2,
                                hw: o.width / 2,
                                hh: o.height / 2,
                                rotation: o.rotation || 0,
                                pathPoints: o.pathPoints ? o.pathPoints.map(p => ({ ...p })) : null
                            };
                        }).filter(Boolean)
                    };
                } else {
                    // Single object rotation
                    this._groupRotating = false;
                    this._groupRotateData = null;
                    const obj = this.getSelectedObjects()[0];
                    const pivot = obj.getPivotPoint();
                    this.rotateStartAngle = Math.atan2(pos.y - pivot.y, pos.x - pivot.x);
                    this.rotateObjStartAngle = obj.rotation || 0;
                }
                return;
            }
        }

        // Check for resize handle (single object or group)
        if (tool === 'select' && this.selectedIds.length >= 1) {
            const handle = this.getResizeHandle(pos);
            if (handle) {
                this.isResizing = true;
                this.resizeHandle = handle;
                const groupId = this.selectedIds.length > 1 ? this._getSelectedGroupId() : null;
                if (groupId) {
                    // Group resize — store originals for all members + group bounds
                    const bounds = this.getGroupBounds(groupId);
                    this._groupResizing = true;
                    this.resizeStart = {
                        ...pos,
                        groupId,
                        bounds: { ...bounds },
                        members: this.groups[groupId].map(id => {
                            const o = this.getObjectById(id);
                            return o ? { id, obj: Utils.deepClone(o) } : null;
                        }).filter(Boolean)
                    };
                } else {
                    // Single object resize
                    this._groupResizing = false;
                    this.resizeStart = { ...pos, obj: Utils.deepClone(this.getSelectedObjects()[0]) };
                }
                if (this._isRecording) this._snapshotForRecording(true);
                return;
            }
        }

        if (tool === 'select' || tool === 'move') {
            // Check if animation engine is in "pick destination" mode
            if (this.animations?.isPickingDestination) {
                const hit = this.hitTest(pos.x, pos.y);
                // Only pick destination on empty stage area (not on existing objects)
                if (!hit) {
                    eventBus.emit('destination:picked', { x: pos.x, y: pos.y });
                    return;
                }
            }

            // Try to select object at point
            const hit = this.hitTest(pos.x, pos.y);

            // Group edit mode handling
            if (this._groupEditMode) {
                if (hit && hit.groupId === this._groupEditMode) {
                    // Clicked a member of the group being edited → sub-select it
                    if (e.shiftKey) {
                        this.toggleSelection(hit.id);
                    } else {
                        this.select([hit.id]);
                    }
                    // Start drag for the sub-selected object(s)
                    this.isDragging = true;
                    this._dragPrimaryId = hit.id;
                    this.dragOffset = { x: pos.x - hit.x, y: pos.y - hit.y };
                    this._dragObjectOffsets = {};
                    this.getSelectedObjects().forEach(obj => {
                        this._dragObjectOffsets[obj.id] = { x: pos.x - obj.x, y: pos.y - obj.y };
                    });
                    if (this._isRecording) this._snapshotForRecording(true);
                    return;
                } else {
                    // Clicked outside the group being edited → exit group edit mode
                    this.exitGroupEditMode();
                    // Fall through to normal selection logic below
                }
            }

            if (hit) {
                if (!e.shiftKey && !this.selectedIds.includes(hit.id)) {
                    // Select with group awareness
                    this.selectWithGroup(hit.id);
                } else if (e.shiftKey) {
                    this.toggleSelection(hit.id);
                }
                // Start drag — store per-object offsets so groups keep relative positions
                this.isDragging = true;
                this._dragPrimaryId = hit.id;
                this.dragOffset = {
                    x: pos.x - hit.x,
                    y: pos.y - hit.y
                };
                // Per-object offsets from the mouse position
                this._dragObjectOffsets = {};
                this.getSelectedObjects().forEach(obj => {
                    this._dragObjectOffsets[obj.id] = {
                        x: pos.x - obj.x,
                        y: pos.y - obj.y
                    };
                });
                if (this._isRecording) this._snapshotForRecording(true);
            } else {
                if (this._stagePanMode) {
                    // Pan mode active: drag to pan
                    this.select([]);
                    this._tempPanning = true;
                    this.stage.isPanning = true;
                    this.stage.lastPanX = e.clientX;
                    this.stage.lastPanY = e.clientY;
                    this.stage.viewport.style.cursor = 'grabbing';
                } else {
                    // Default: drag to select (rubber band)
                    if (!e.shiftKey) this.select([]);
                    this.isSelecting = true;
                    this.selectStart = { ...pos };
                    this.selectEnd = { ...pos };
                }
            }
        } else if (tool === 'path') {
            // Path drawing
            if (!this.isDrawingPath) {
                this.isDrawingPath = true;
                this.currentPath = [{ x: pos.x, y: pos.y }];
            }
            this.currentPath.push({ x: pos.x, y: pos.y });
            this.stage.requestRender();
        } else if (tool === 'text') {
            // Create text object
            const snapped = this.stage.snapPosition(pos.x, pos.y);
            const obj = new StageObject('text', {
                x: snapped.x, y: snapped.y,
                width: 200, height: 30,
                text: 'Double-click to edit',
                textColor: '#ffffff'
            });
            this.addObject(obj);
            this.select([obj.id]);
            this.setTool('select');
        } else if (['rectangle','circle','triangle','star','polygon','line','diamond','heart','arrow','doubleArrow','curvedArrow', ...StageObject.getCustomShapeTypes()].includes(tool)) {
            // Start drawing bounding-box shape
            this.isDrawing = true;
            const snapped = this.stage.snapPosition(pos.x, pos.y);
            this.drawStart = { ...snapped };
            this.tempObject = new StageObject(tool, {
                x: snapped.x, y: snapped.y,
                width: 0, height: 0
            });
        } else if (tool === 'scribble' || tool === 'freeform') {
            // Start freehand drawing
            this.isDrawing = true;
            this.drawStart = { x: pos.x, y: pos.y };
            this.tempObject = new StageObject(tool, {
                x: pos.x, y: pos.y, width: 0, height: 0
            });
            this.tempObject.pathPoints = [{ x: pos.x, y: pos.y }];
        } else if (tool === 'trace') {
            // Trace tool: click to place points, double-click = open, close near first = closed
            if (!this.isDrawingTrace) {
                this.isDrawingTrace = true;
                this.currentTracePath = [{ x: pos.x, y: pos.y }];
            } else {
                // Check if clicking near first point to close the shape
                const first = this.currentTracePath[0];
                const closeDist = Math.hypot(pos.x - first.x, pos.y - first.y);
                if (this.currentTracePath.length >= 3 && closeDist < 12) {
                    this.finalizeTrace(true); // closed path
                    return;
                }
                this.currentTracePath.push({ x: pos.x, y: pos.y });
            }
            this.stage.requestRender();
        } else if (tool === 'hand') {
            this.stage.isPanning = true;
            this.stage.lastPanX = e.clientX;
            this.stage.lastPanY = e.clientY;
            this.stage.viewport.style.cursor = 'grabbing';
        } else if (tool === 'zoom') {
            // Zoom in on click, zoom out on alt-click
            const factor = e.altKey ? 0.8 : 1.25;
            this.stage.setZoom(this.stage.zoom * factor);
        }
    }

    handleMouseMove(pos, e) {
        // Smart Cut active — let joint-system handle mouse move
        if (window.app?.jointSystem?._smartCutActive) return;

        if (window.app?.faceRig?.isActive?.()) {
            if (window.app.faceRig.handleMouseMove(pos, e)) return;
        }

        // Measure mode intercept
        if (this._measureMode && this._measureDragging) {
            this._handleMeasureMouseMove(pos);
            return;
        }

        // Crop mode intercept
        if (this._cropMode && this._cropDragging) {
            this._handleCropMouseMove(pos);
            return;
        }
        if (this._cropMode && this._cropRect) {
            this._updateCropCursor(pos);
        }

        // Object eraser mode intercept
        if (this._objEraserMode && this._objEraserDragging) {
            this._handleObjEraserMouseMove(pos);
            return;
        }

        // Eraser mode intercept
        if (this._eraserMode) {
            this._handleEraserMouseMove(pos);
            if (this._eraserDrawing) return;
        }

        if (this._cloneBrushMode) {
            this._handleCloneBrushMouseMove(pos, e);
            return;
        }

        // Flex mode intercept
        if (this._flexMode && this._flexObj) {
            this._handleFlexMouseMove(pos);
            if (this._flexDraggingPin >= 0) return;
        }

        // Flex Rig mode intercept
        if (this._flexRigMode) {
            if (this._handleFlexRigMouseMove(pos)) return;
        }

        // Slice mode hover tracking
        if (this._sliceMode && !this._sliceLocked) {
            this._sliceHoverPos = { x: pos.x, y: pos.y };
            this.stage.requestRender();
        }

        // Rig mode intercept
        if (this.rigging.isActive) {
            this.rigging.handleMouseMove(pos, e);
            return;
        }

        // Point edit mode: hover tooltips for points and edges
        if (this._pointEditMode && this._pointEditObj && !this._draggingPoint) {
            this._handlePointEditHover(pos);
        }

        // Point drag handling
        if (this._pointEditMode && this._draggingPoint && this._selectedPointIdx >= 0) {
            // Convert to freeform on first drag
            this._convertToFreeformIfNeeded(this._pointEditObj);
            this._resetIdleRevert();
            const pt = this._pointEditObj.pathPoints[this._selectedPointIdx];
            pt.x = pos.x;
            pt.y = pos.y;
            const pxEl = document.getElementById('point-x');
            const pyEl = document.getElementById('point-y');
            if (pxEl) pxEl.value = Math.round(pt.x);
            if (pyEl) pyEl.value = Math.round(pt.y);
            this._recalcBoundsFromPoints(this._pointEditObj);
            this.stage.requestRender();
            return;
        }

        if (this.isDrawing && this.tempObject) {
            // Freehand tools: collect points
            if (this.tempObject.type === 'scribble' || this.tempObject.type === 'freeform') {
                this.tempObject.pathPoints.push({ x: pos.x, y: pos.y });
                // Update bounding box from points
                const pts = this.tempObject.pathPoints;
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                for (const p of pts) {
                    if (p.x < minX) minX = p.x;
                    if (p.y < minY) minY = p.y;
                    if (p.x > maxX) maxX = p.x;
                    if (p.y > maxY) maxY = p.y;
                }
                this.tempObject.x = minX;
                this.tempObject.y = minY;
                this.tempObject.width = maxX - minX;
                this.tempObject.height = maxY - minY;
                this.stage.requestRender();
            } else {
                const snapped = this.stage.snapPosition(pos.x, pos.y);
                const lineTools = ['line','arrow','doubleArrow','curvedArrow'];
                if (lineTools.includes(this.tempObject.type)) {
                    // Line-based: keep start fixed, width/height encode direction
                    this.tempObject.x = this.drawStart.x;
                    this.tempObject.y = this.drawStart.y;
                    this.tempObject.width = snapped.x - this.drawStart.x;
                    this.tempObject.height = snapped.y - this.drawStart.y;

                    // Shift constrains to horizontal/vertical/45deg
                    if (e.shiftKey) {
                        const ax = Math.abs(this.tempObject.width);
                        const ay = Math.abs(this.tempObject.height);
                        if (ax > ay * 2) this.tempObject.height = 0;
                        else if (ay > ax * 2) this.tempObject.width = 0;
                        else {
                            const d = Math.max(ax, ay);
                            this.tempObject.width = d * Math.sign(this.tempObject.width || 1);
                            this.tempObject.height = d * Math.sign(this.tempObject.height || 1);
                        }
                    }
                } else {
                    const minX = Math.min(this.drawStart.x, snapped.x);
                    const minY = Math.min(this.drawStart.y, snapped.y);
                    const maxX = Math.max(this.drawStart.x, snapped.x);
                    const maxY = Math.max(this.drawStart.y, snapped.y);
                    this.tempObject.x = minX;
                    this.tempObject.y = minY;
                    this.tempObject.width = maxX - minX;
                    this.tempObject.height = maxY - minY;

                    // Hold shift for square/circle
                    if (e.shiftKey) {
                        const size = Math.max(this.tempObject.width, this.tempObject.height);
                        this.tempObject.width = size;
                        this.tempObject.height = size;
                    }
                }
                
                this.stage.requestRender();
            }
        } else if (this.isDragging) {
            const selected = this.getSelectedObjects();
            this.smartGuides = []; // Clear guides

            // Compute the primary object's new position (for snapping/guides)
            const primaryObj = selected.find(o => o.id === this._dragPrimaryId && !o.locked)
                || selected.find(o => !o.locked);
            const primaryOffset = primaryObj && this._dragObjectOffsets
                ? this._dragObjectOffsets[primaryObj.id]
                : null;
            const primaryBaseX = pos.x - (primaryOffset ? primaryOffset.x : this.dragOffset.x);
            const primaryBaseY = pos.y - (primaryOffset ? primaryOffset.y : this.dragOffset.y);
            let primaryNewX = primaryBaseX;
            let primaryNewY = primaryBaseY;

            // Smart alignment guides (snap-to-other-object / stage edges).
            // Use the clicked object as the snap reference; hold Alt
            // to bypass smart snapping entirely (matches Figma convention).
            if (primaryObj && !e.altKey) {
                const snapped = this.calculateSmartGuides(primaryObj, primaryNewX, primaryNewY);
                primaryNewX = snapped.x;
                primaryNewY = snapped.y;
            }
            // Fall back to grid snap only when no smart guide engaged and
            // grid snap is enabled in the stage settings.
            if (this.smartGuides.length === 0 && this.stage.snapEnabled && !e.altKey) {
                const snapped = this.stage.snapPosition(primaryNewX, primaryNewY);
                primaryNewX = snapped.x;
                primaryNewY = snapped.y;
            }

            // Calculate delta from primary object's movement
            const baseDeltaX = primaryNewX - primaryBaseX;
            const baseDeltaY = primaryNewY - primaryBaseY;

            // Build set of selected IDs for fast ancestor-in-selection check
            const selectedIdSet = new Set(this.selectedIds);

            selected.forEach(obj => {
                if (obj.locked) return;
                const off = this._dragObjectOffsets && this._dragObjectOffsets[obj.id];
                let newX, newY;
                if (off) {
                    // Use per-object offset to maintain relative positions
                    newX = pos.x - off.x + baseDeltaX;
                    newY = pos.y - off.y + baseDeltaY;
                } else {
                    newX = pos.x - this.dragOffset.x;
                    newY = pos.y - this.dragOffset.y;
                }

                // If pinned, update pin offsets instead of raw position
                if (obj.pinnedTo) {
                    // Check if any ancestor in the pin chain is also being dragged.
                    // If so, skip offset recalculation — the ancestor will move, and
                    // _resolvePins will correctly cascade the position change down.
                    // Without this, the child's offset is computed from the parent's
                    // stale position, then applied from the parent's new position,
                    // causing double-movement and flickering.
                    let ancestorDragged = false;
                    let walkId = obj.pinnedTo;
                    while (walkId) {
                        if (selectedIdSet.has(walkId)) {
                            ancestorDragged = true;
                            break;
                        }
                        const walkObj = this.getObjectById(walkId);
                        walkId = walkObj ? walkObj.pinnedTo : null;
                    }
                    if (!ancestorDragged) {
                        const parent = this.getObjectById(obj.pinnedTo);
                        if (parent) {
                            const target = this._getPinTargetWorldTransform(parent, obj);
                            if (!target) return;
                            const childPivotX = newX + obj.width * obj.pivotX;
                            const childPivotY = newY + obj.height * obj.pivotY;
                            const offset = this._getPinOffsetInTargetSpace(
                                target.x,
                                target.y,
                                target.rotation,
                                childPivotX,
                                childPivotY,
                                target.tiltTransform
                            );
                            obj.pinOffsetX = offset.x;
                            obj.pinOffsetY = offset.y;
                        }
                    }
                    // _resolvePins will set actual x/y
                    return;
                }

                // Translate pathPoints for freeform/path/scribble objects (absolute coords)
                if (obj.pathPoints && obj.pathPoints.length > 0) {
                    const dx = newX - obj.x;
                    const dy = newY - obj.y;
                    if (dx !== 0 || dy !== 0) {
                        obj.pathPoints.forEach(p => { p.x += dx; p.y += dy; });
                    }
                }
                obj.x = newX;
                obj.y = newY;
            });
            // Resolve pin positions immediately so pinned children have
            // up-to-date x/y before updateProperties and the next mousemove
            this._resolvePins();
            this.updateProperties();
            this.stage.requestRender();
        } else if (this._draggingJoint && this._dragJoint) {
            const center = this._dragJointCenter;
            // Skip updates when mouse is too close to the pivot (avoids jitter)
            const dist = Math.hypot(pos.x - center.x, pos.y - center.y);
            if (dist < 5 / (this.stage.zoom || 1)) {
                // Too close to center — skip
            } else {
                // Accumulative angle tracking: compute small frame-to-frame deltas
                // to avoid atan2 ±π boundary discontinuity
                const currentRad = Math.atan2(pos.y - center.y, pos.x - center.x);
                let deltaRad = currentRad - this._dragJointPrevRad;
                // Normalize delta to [-π, π]
                if (deltaRad > Math.PI) deltaRad -= 2 * Math.PI;
                else if (deltaRad < -Math.PI) deltaRad += 2 * Math.PI;
                this._dragJointAccumDeg += deltaRad * 180 / Math.PI;
                this._dragJointPrevRad = currentRad;

                let totalDeg = this._dragJointAccumDeg;
                if (e.shiftKey) totalDeg = Math.round(totalDeg / 15) * 15;
                let newAngle = this._dragJointStartAngle + totalDeg;
                const jMin = this._dragJoint.minAngle ?? -180;
                const jMax = this._dragJoint.maxAngle ?? 180;
                newAngle = Math.max(jMin, Math.min(jMax, Math.round(newAngle * 10) / 10));
                this._dragJoint.angle = newAngle;
                // Sync panel controls
                const sliderEl = document.querySelector(`.joint-angle-slider[data-joint-id="${this._dragJoint.id}"]`);
                const numEl = document.querySelector(`.joint-angle-input[data-joint-id="${this._dragJoint.id}"]`);
                if (sliderEl) sliderEl.value = newAngle;
                if (numEl) numEl.value = newAngle;
                const coordsEl = document.getElementById('mouse-coordinates');
                if (coordsEl) coordsEl.textContent = `Joint ⟳ ${newAngle}°`;
            }
            this.stage.requestRender();
        } else if (this.isAdjustingDepth && this._depthAdjustData) {
            this.handleDepthAdjust(pos, e.shiftKey);
        } else if (this.isRotating) {
            this.handleRotation(pos, e.shiftKey);
        } else if (this.isResizing && this.resizeStart) {
            this.handleResize(pos, e.shiftKey, e.altKey);
        } else if (this.isSelecting) {
            this.selectEnd = { ...pos };
            this.stage.requestRender();
        } else if (this.isDrawingPath) {
            // Preview path segment
            this.stage.requestRender();
        } else if (this.isDrawingTrace) {
            // Store mouse position for trace preview line
            this._tracePreviewPos = { x: pos.x, y: pos.y };
            this.stage.requestRender();
        }

        // Update cursor based on hover
        if (!this.isDrawing && !this.isDragging && !this.isResizing && !this.isRotating && !this._draggingJoint && !this.isAdjustingDepth) {
            this.updateCursor(pos);
        }
    }

    handleMouseUp(pos, e) {
        // Smart Cut active — let joint-system handle mouse up
        if (window.app?.jointSystem?._smartCutActive) return;

        if (window.app?.faceRig?.isActive?.()) {
            if (window.app.faceRig.handleMouseUp(pos, e)) return;
        }

        // Measure mode intercept
        if (this._measureMode && this._measureDragging) {
            this._handleMeasureMouseUp(pos);
            return;
        }

        // Crop mode intercept
        if (this._cropMode && this._cropDragging) {
            this._handleCropMouseUp(pos);
            return;
        }

        // Object eraser mode intercept
        if (this._objEraserMode && this._objEraserDragging) {
            this._handleObjEraserMouseUp();
            return;
        }

        // Eraser mode intercept
        if (this._eraserMode && this._eraserDrawing) {
            this._handleEraserMouseUp();
            return;
        }

        if (this._cloneBrushMode) {
            this._handleCloneBrushMouseUp(pos);
            return;
        }

        // Flex mode intercept
        if (this._flexMode && this._flexDraggingPin >= 0) {
            this._handleFlexMouseUp();
            return;
        }

        // Flex Rig mode intercept
        if (this._flexRigMode && this._flexRigDrag) {
            if (this._handleFlexRigMouseUp()) return;
        }

        // Rig mode intercept
        if (this.rigging.isActive) {
            this.rigging.handleMouseUp(pos, e);
            return;
        }

        // End point dragging
        if (this._pointEditMode && this._draggingPoint) {
            this._draggingPoint = false;
            this._invalidateAnimationBaseSnapshot();
            eventBus.emit('history:push');
            return;
        }

        if (this.isDrawing && this.tempObject) {
            // Finalize shape creation
            const isFreehand = this.tempObject.type === 'scribble' || this.tempObject.type === 'freeform';
            const lineTools = ['line','arrow','doubleArrow','curvedArrow'];
            const isLine = lineTools.includes(this.tempObject.type);
            let minSize;
            if (isFreehand) minSize = this.tempObject.pathPoints.length >= 3;
            else if (isLine) minSize = Math.sqrt(this.tempObject.width ** 2 + this.tempObject.height ** 2) > 10;
            else minSize = this.tempObject.width > 5 && this.tempObject.height > 5;
            if (minSize) {
                this.addObject(this.tempObject);
                this.select([this.tempObject.id]);
                this.setTool('select');
                this._invalidateAnimationBaseSnapshot();
            }
            this.tempObject = null;
            this.isDrawing = false;
        } else if (this.isDragging) {
            this.isDragging = false;
            this._dragPrimaryId = null;
            this._dragObjectOffsets = null;
            this.smartGuides = []; // Clear guides
            if (this._isRecording) this._showRecordingConfirm();
            this._invalidateAnimationBaseSnapshot();
            eventBus.emit('history:push');
        } else if (this._draggingJoint) {
            this._draggingJoint = false;
            this._dragJoint = null;
            this._dragJointObj = null;
            this._dragJointCenter = null;
            const coordsEl = document.getElementById('mouse-coordinates');
            if (coordsEl) coordsEl.textContent = `X: ${Math.round(pos.x)}  Y: ${Math.round(pos.y)}`;
            if (this._isRecording) this._showRecordingConfirm();
            this._invalidateAnimationBaseSnapshot();
            eventBus.emit('history:push');
        } else if (this.isAdjustingDepth) {
            this.isAdjustingDepth = false;
            this._depthAdjustData = null;
            const coordsEl = document.getElementById('mouse-coordinates');
            if (coordsEl) coordsEl.textContent = `X: ${Math.round(pos.x)}  Y: ${Math.round(pos.y)}`;
            this.updateProperties();
            if (this._isRecording) this._showRecordingConfirm();
            this._invalidateAnimationBaseSnapshot();
            eventBus.emit('history:push');
        } else if (this.isRotating) {
            this.isRotating = false;
            this._groupRotating = false;
            this._groupRotateData = null;
            // Clear the rotation indicator from coordinates display
            const coordsEl = document.getElementById('mouse-coordinates');
            if (coordsEl) coordsEl.textContent = `X: ${Math.round(pos.x)}  Y: ${Math.round(pos.y)}`;
            this.updateProperties();
            if (this._isRecording) this._showRecordingConfirm();
            this._invalidateAnimationBaseSnapshot();
            eventBus.emit('history:push');
        } else if (this.isResizing) {
            this.isResizing = false;
            this.resizeHandle = null;
            this.resizeStart = null;
            this._groupResizing = false;
            if (this._isRecording) this._showRecordingConfirm();
            this._invalidateAnimationBaseSnapshot();
            eventBus.emit('history:push');
        } else if (this.isSelecting) {
            // Select objects in box
            this.selectInBox();
            this.isSelecting = false;
            this.selectStart = null;
            this.selectEnd = null;
        } else if (this._tempPanning) {
            // End temporary pan from empty-area drag
            this._tempPanning = false;
            this.stage.isPanning = false;
            this.stage.viewport.style.cursor = this._stagePanMode ? 'grab' : '';
        }
        
        this.stage.requestRender();
    }

    _beginInlineTextEdit(obj) {
        if (!obj || obj.type !== 'text' || !this.stage?.viewport) return;
        this._endInlineTextEdit(false);

        const topLeft = this.stage.stageToScreen(obj.x, obj.y);
        const zoom = this.stage.zoom || 1;
        const width = Math.max(80, Math.abs(obj.width || 200) * zoom);
        const height = Math.max(42, Math.abs(obj.height || 60) * zoom);
        const fontSize = Math.max(10, (Number(obj.fontSize) || 24) * zoom);
        const textarea = document.createElement('textarea');
        textarea.className = 'stage-inline-text-editor';
        textarea.value = String(obj.text || '');
        textarea.spellcheck = true;
        textarea.wrap = 'soft';
        textarea.setAttribute('aria-label', 'Edit text');

        const textAlign = ['left', 'center', 'right'].includes(obj.textAlign) ? obj.textAlign : 'left';
        const color = obj.textColor || obj.fill || '#ffffff';
        const lineHeight = Number(obj.lineHeight) || 1.35;
        textarea.style.cssText = [
            'position:fixed',
            `left:${topLeft.x}px`,
            `top:${topLeft.y}px`,
            `width:${width}px`,
            `height:${height}px`,
            'z-index:100000',
            'box-sizing:border-box',
            'resize:none',
            'overflow:auto',
            'border:1px solid rgba(56,189,248,0.95)',
            'outline:2px solid rgba(14,165,233,0.28)',
            'border-radius:4px',
            'padding:6px 8px',
            'background:rgba(15,23,42,0.92)',
            `color:${color}`,
            `font-family:${obj.fontFamily || 'Inter'}, Arial, sans-serif`,
            `font-size:${fontSize}px`,
            `font-weight:${obj.fontWeight || '400'}`,
            `font-style:${obj.fontStyle === 'italic' ? 'italic' : 'normal'}`,
            `line-height:${lineHeight}`,
            `text-align:${textAlign}`,
            'white-space:pre-wrap',
            'tab-size:4',
            'box-shadow:0 10px 32px rgba(0,0,0,0.35)'
        ].join(';');
        if (Number(obj.rotation)) {
            textarea.style.transformOrigin = 'top left';
            textarea.style.transform = `rotate(${Number(obj.rotation) || 0}deg)`;
        }

        const previousText = String(obj.text || '');
        let closed = false;
        const close = (commit = true) => {
            if (closed) return;
            closed = true;
            if (commit) {
                const nextText = textarea.value;
                if (nextText !== previousText) {
                    obj.text = nextText;
                    this.updateProperties();
                    this.stage.requestRender();
                    eventBus.emit('history:push');
                }
            } else if (obj.text !== previousText) {
                obj.text = previousText;
                this.updateProperties();
                this.stage.requestRender();
            }
            textarea.remove();
            if (this._inlineTextEditor?.textarea === textarea) this._inlineTextEditor = null;
        };

        textarea.addEventListener('mousedown', (e) => e.stopPropagation());
        textarea.addEventListener('click', (e) => e.stopPropagation());
        textarea.addEventListener('dblclick', (e) => e.stopPropagation());
        textarea.addEventListener('keydown', (e) => {
            e.stopPropagation();
            if (e.key === 'Escape') {
                e.preventDefault();
                close(false);
            } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                close(true);
            }
        });
        textarea.addEventListener('input', () => {
            obj.text = textarea.value;
            this.updateProperties();
            this.stage.requestRender();
        });
        textarea.addEventListener('blur', () => close(true));

        document.body.appendChild(textarea);
        this._inlineTextEditor = { textarea, obj, close };
        this.select([obj.id]);
        this.updateProperties();
        this.stage.requestRender();
        requestAnimationFrame(() => {
            textarea.focus();
            textarea.select();
        });
    }

    _endInlineTextEdit(commit = true) {
        if (this._inlineTextEditor?.close) {
            this._inlineTextEditor.close(commit);
        }
    }

    handleDoubleClick(pos, e) {
        // Smart Cut active — let joint-system handle dblclick
        if (window.app?.jointSystem?._smartCutActive) return;

        if (this._cloneBrushMode && this._cloneBrushMaskMode) {
            this._finishCloneBrushMaskSelection();
            e?.preventDefault?.();
            e?.stopPropagation?.();
            return;
        }

        if (this._cloneBrushMode && this._cloneBrushBoundaryMode === 'draw') {
            this._finishCloneBrushBoundarySelection();
            e?.preventDefault?.();
            e?.stopPropagation?.();
            return;
        }

        if (this._cloneBrushMode) {
            this._handleCloneBrushDoubleClick(pos, e);
            return;
        }

        // Measure mode: finalize
        if (this._measureMode && this._measureStart) {
            this._finalizeMeasure();
            return;
        }

        // Trace tool: double-click finalizes as open path
        if (this.isDrawingTrace && this.currentTracePath.length >= 2) {
            this.finalizeTrace(false); // open path
            return;
        }

        // Slice mode: double-click locks the cut path
        if (this._sliceMode && this._sliceObj && !this._sliceLocked) {
            this._lockSlicePoints();
            return;
        }

        // In point edit mode, double-click on an edge to insert a new point
        if (this._pointEditMode && this._pointEditObj) {
            const edge = this.hitTestEdge(pos.x, pos.y);
            if (edge >= 0) {
                this.insertPointOnEdge(pos.x, pos.y, edge);
                return;
            }
        }

        const hit = this.hitTest(pos.x, pos.y);
        if (hit) {
            // Double-click on a grouped object: enter group edit mode
            if (hit.groupId && this.groups[hit.groupId] && !this._groupEditMode) {
                this.enterGroupEditMode(hit.groupId);
                // Select the specific clicked object within the group
                this.select([hit.id]);
                return;
            }
            // Double-click on text: edit text
            if (hit.type === 'text') {
                e?.preventDefault?.();
                e?.stopPropagation?.();
                this._beginInlineTextEdit(hit);
            }
            // Double-click on a caption: open the caption editor
            else if (hit.type === 'caption') {
                e?.preventDefault?.();
                e?.stopPropagation?.();
                this.openCaptionEditor(hit);
            }
        } else {
            // Double-click on empty area: exit group edit mode or revert to select tool
            if (this._groupEditMode) {
                this.exitGroupEditMode();
            }
            if (this.currentTool !== 'select') {
                this.setTool('select');
            }
        }
    }

    // === Caption editor (view/edit generated captions) ===
    _ensureCaptionEditor() {
        if (this._captionEditorModal || typeof document === 'undefined') return this._captionEditorModal;
        if (!document.getElementById('caption-editor-style')) {
            const style = document.createElement('style');
            style.id = 'caption-editor-style';
            style.textContent = `
.caption-editor-modal{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.5)}
.caption-editor-modal.hidden{display:none}
.caption-editor-dialog{width:min(640px,94vw);max-height:86vh;display:flex;flex-direction:column;background:var(--panel-bg,#1f2937);color:var(--text,#f3f4f6);border:1px solid rgba(255,255,255,.12);border-radius:10px;box-shadow:0 24px 70px rgba(0,0,0,.5)}
.caption-editor-header{display:flex;align-items:center;gap:8px;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,.1);font-weight:600}
.caption-editor-header button{margin-left:auto;background:none;border:none;color:inherit;font-size:18px;cursor:pointer;line-height:1}
.caption-editor-body{padding:12px 16px;overflow:auto}
.caption-editor-opts{display:flex;gap:16px;align-items:center;margin-bottom:10px;font-size:13px;flex-wrap:wrap}
.caption-editor-rows{display:flex;flex-direction:column;gap:8px}
.caption-editor-row{display:grid;grid-template-columns:24px 72px 72px 1fr 28px;gap:6px;align-items:center}
.caption-editor-row input{width:100%;padding:5px 7px;border-radius:6px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:inherit;font-size:13px}
.caption-editor-row input.caption-editor-select{width:16px;height:16px;padding:0;cursor:pointer}
.caption-editor-row .caption-editor-remove{background:rgba(239,68,68,.15);color:#f87171;border:1px solid rgba(248,113,113,.4);border-radius:6px;cursor:pointer;height:28px}
.caption-editor-head{display:grid;grid-template-columns:24px 72px 72px 1fr 28px;gap:6px;font-size:11px;opacity:.7;margin-bottom:4px}
.caption-editor-add{margin-top:10px;background:rgba(99,102,241,.18);color:#c7d2fe;border:1px solid rgba(129,140,248,.4);border-radius:6px;padding:6px 10px;cursor:pointer}
.caption-editor-combine{background:rgba(245,158,11,.16);color:#fcd34d;border:1px solid rgba(251,191,36,.4);border-radius:6px;padding:5px 10px;cursor:pointer;font-size:12px}
.caption-editor-combine:disabled{opacity:.45;cursor:default}
.caption-editor-lang{padding:5px 7px;border-radius:6px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:inherit;font-size:12px;width:160px}
.caption-editor-paste{background:rgba(16,185,129,.16);color:#6ee7b7;border:1px solid rgba(52,211,153,.4);border-radius:6px;padding:5px 10px;cursor:pointer;font-size:12px}
.caption-editor-paste-panel{margin:10px 0;display:flex;flex-direction:column;gap:6px}
.caption-editor-paste-panel textarea{width:100%;min-height:120px;padding:7px;border-radius:6px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:inherit;font-size:13px;resize:vertical}
.caption-editor-paste-panel .caption-editor-paste-actions{display:flex;gap:8px}
.caption-editor-paste-panel button{padding:5px 12px;border-radius:6px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.08);color:inherit;cursor:pointer;font-size:12px}
.caption-editor-paste-panel .caption-editor-paste-apply{background:#10b981;border-color:#10b981;color:#042f1f;font-weight:600}
/* Bilingual mode adds a translation column */
.caption-editor-modal.bilingual .caption-editor-row{grid-template-columns:24px 60px 60px 1fr 1fr 28px}
.caption-editor-modal.bilingual .caption-editor-head{grid-template-columns:24px 60px 60px 1fr 1fr 28px}
.caption-editor-row .caption-editor-secondary,.caption-editor-head .caption-editor-head-secondary,.caption-editor-lang,.caption-editor-paste{display:none}
.caption-editor-modal.bilingual .caption-editor-row .caption-editor-secondary,.caption-editor-modal.bilingual .caption-editor-head .caption-editor-head-secondary,.caption-editor-modal.bilingual .caption-editor-lang,.caption-editor-modal.bilingual .caption-editor-paste{display:block}
.caption-editor-style{display:none;gap:16px;align-items:center;margin-bottom:10px;font-size:12px;flex-wrap:wrap}
.caption-editor-modal.bilingual .caption-editor-style{display:flex}
.caption-editor-style label{display:flex;align-items:center;gap:6px}
.caption-editor-style input[type=color]{width:34px;height:24px;padding:0;border:1px solid rgba(255,255,255,.18);border-radius:5px;background:none;cursor:pointer}
.caption-editor-style input[type=number]{width:56px;padding:4px 6px;border-radius:6px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:inherit}
.caption-editor-footer{padding:12px 16px;border-top:1px solid rgba(255,255,255,.1);display:flex;justify-content:flex-end;gap:8px}
.caption-editor-footer button{padding:7px 16px;border-radius:6px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.08);color:inherit;cursor:pointer}
.caption-editor-footer .caption-editor-done{background:#6366f1;border-color:#6366f1;color:#fff;font-weight:600}`;
            document.head.appendChild(style);
        }
        const modal = document.createElement('div');
        modal.className = 'caption-editor-modal hidden';
        modal.innerHTML = `
            <div class="caption-editor-dialog" role="dialog" aria-modal="true" aria-label="Edit captions">
                <div class="caption-editor-header"><i class="fas fa-closed-captioning"></i><span>Edit Captions</span><button type="button" class="caption-editor-close" title="Close" aria-label="Close">&times;</button></div>
                <div class="caption-editor-body">
                    <div class="caption-editor-opts">
                        <label><input type="checkbox" class="caption-editor-highlight"> Highlight spoken word</label>
                        <label><input type="checkbox" class="caption-editor-bilingual"> Second language</label>
                        <input type="text" class="caption-editor-lang" placeholder="Language label (e.g. Swahili)" maxlength="40">
                        <button type="button" class="caption-editor-paste"><i class="fas fa-paste"></i> Paste translation</button>
                        <button type="button" class="caption-editor-combine" disabled><i class="fas fa-compress-alt"></i> Combine selected</button>
                        <span class="caption-editor-count"></span>
                    </div>
                    <div class="caption-editor-style">
                        <label>Translation colour <input type="color" class="caption-editor-sec-color" value="#cfe8ff"></label>
                        <label>Size <input type="range" class="caption-editor-sec-scale" min="50" max="100" step="5" value="85"><span class="caption-editor-sec-scale-val">85%</span></label>
                        <label>Gap <input type="number" class="caption-editor-sec-gap" min="0" max="60" step="1" value="6"> px</label>
                    </div>
                    <div class="caption-editor-paste-panel" hidden>
                        <textarea class="caption-editor-paste-text" placeholder="Paste the translated transcript — one line per caption cue, in the same order as above."></textarea>
                        <div class="caption-editor-paste-actions">
                            <button type="button" class="caption-editor-paste-apply">Apply translation</button>
                            <button type="button" class="caption-editor-paste-cancel">Cancel</button>
                        </div>
                    </div>
                    <div class="caption-editor-head"><span></span><span>Start (s)</span><span>End (s)</span><span>Caption text</span><span class="caption-editor-head-secondary">Translation</span><span></span></div>
                    <div class="caption-editor-rows"></div>
                    <button type="button" class="caption-editor-add"><i class="fas fa-plus"></i> Add line</button>
                </div>
                <div class="caption-editor-footer">
                    <button type="button" class="caption-editor-done">Done</button>
                </div>
            </div>`;
        document.body.appendChild(modal);
        this._captionEditorModal = modal;

        const close = () => this.closeCaptionEditor();
        modal.querySelector('.caption-editor-close')?.addEventListener('click', close);
        modal.querySelector('.caption-editor-done')?.addEventListener('click', close);
        modal.addEventListener('mousedown', event => { if (event.target === modal) close(); });
        modal.querySelector('.caption-editor-add')?.addEventListener('click', () => this._addCaptionRow());
        modal.querySelector('.caption-editor-highlight')?.addEventListener('change', event => {
            const obj = this._captionEditorObj;
            if (!obj) return;
            obj.captionHighlightEnabled = event.target.checked;
            this.stage?.requestRender?.();
            eventBus.emit('history:push');
        });
        modal.querySelector('.caption-editor-bilingual')?.addEventListener('change', event => {
            const obj = this._captionEditorObj;
            if (!obj) return;
            obj.bilingual = event.target.checked;
            modal.classList.toggle('bilingual', obj.bilingual);
            if (obj.bilingual && !obj.secondaryLang) {
                const langInput = modal.querySelector('.caption-editor-lang');
                if (langInput) langInput.value = '';
            }
            this.stage?.requestRender?.();
            eventBus.emit('history:push');
        });
        modal.querySelector('.caption-editor-lang')?.addEventListener('input', event => {
            const obj = this._captionEditorObj;
            if (!obj) return;
            obj.secondaryLang = String(event.target.value || '').slice(0, 40);
        });
        modal.querySelector('.caption-editor-sec-color')?.addEventListener('input', event => {
            const obj = this._captionEditorObj;
            if (!obj) return;
            obj.secondaryTextColor = event.target.value || '#cfe8ff';
            this.stage?.requestRender?.();
            eventBus.emit('history:push');
        });
        modal.querySelector('.caption-editor-sec-scale')?.addEventListener('input', event => {
            const obj = this._captionEditorObj;
            if (!obj) return;
            const pct = Math.max(50, Math.min(100, Number(event.target.value) || 85));
            obj.secondaryFontScale = pct / 100;
            const label = modal.querySelector('.caption-editor-sec-scale-val');
            if (label) label.textContent = `${pct}%`;
            this.stage?.requestRender?.();
            eventBus.emit('history:push');
        });
        modal.querySelector('.caption-editor-sec-gap')?.addEventListener('input', event => {
            const obj = this._captionEditorObj;
            if (!obj) return;
            obj.secondaryGap = Math.max(0, Math.min(60, Number(event.target.value) || 0));
            this.stage?.requestRender?.();
            eventBus.emit('history:push');
        });
        modal.querySelector('.caption-editor-paste')?.addEventListener('click', () => {
            const panel = modal.querySelector('.caption-editor-paste-panel');
            if (!panel) return;
            panel.hidden = !panel.hidden;
            if (!panel.hidden) modal.querySelector('.caption-editor-paste-text')?.focus();
        });
        modal.querySelector('.caption-editor-paste-cancel')?.addEventListener('click', () => {
            const panel = modal.querySelector('.caption-editor-paste-panel');
            if (panel) panel.hidden = true;
        });
        modal.querySelector('.caption-editor-paste-apply')?.addEventListener('click', () => this._applyPastedTranslation());
        modal.querySelector('.caption-editor-combine')?.addEventListener('click', () => this._combineSelectedCaptionRows());
        modal.querySelector('.caption-editor-rows')?.addEventListener('input', () => this._commitCaptionRows());
        modal.querySelector('.caption-editor-rows')?.addEventListener('change', event => {
            if (event.target.classList?.contains('caption-editor-select')) this._updateCombineButtonState();
        });
        modal.querySelector('.caption-editor-rows')?.addEventListener('click', event => {
            const remove = event.target.closest('.caption-editor-remove');
            if (!remove) return;
            remove.closest('.caption-editor-row')?.remove();
            this._commitCaptionRows();
            this._updateCombineButtonState();
        });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && !modal.classList.contains('hidden')) close();
        });
        return modal;
    }

    openCaptionEditor(obj) {
        if (!obj || obj.type !== 'caption') return;
        if (globalThis.CaptionWorkspace) return globalThis.CaptionWorkspace.open(obj);
        const modal = this._ensureCaptionEditor();
        if (!modal) return;
        this._captionEditorObj = obj;
        const highlight = modal.querySelector('.caption-editor-highlight');
        if (highlight) highlight.checked = !!obj.captionHighlightEnabled;
        const bilingual = modal.querySelector('.caption-editor-bilingual');
        if (bilingual) bilingual.checked = !!obj.bilingual;
        modal.classList.toggle('bilingual', !!obj.bilingual);
        const langInput = modal.querySelector('.caption-editor-lang');
        if (langInput) langInput.value = String(obj.secondaryLang || '');
        const secColor = modal.querySelector('.caption-editor-sec-color');
        if (secColor) secColor.value = obj.secondaryTextColor || '#cfe8ff';
        const secScale = modal.querySelector('.caption-editor-sec-scale');
        const secScaleVal = modal.querySelector('.caption-editor-sec-scale-val');
        const scalePct = Math.round((Number(obj.secondaryFontScale) || 0.85) * 100);
        if (secScale) secScale.value = String(scalePct);
        if (secScaleVal) secScaleVal.textContent = `${scalePct}%`;
        const secGap = modal.querySelector('.caption-editor-sec-gap');
        if (secGap) secGap.value = String(Number.isFinite(obj.secondaryGap) ? obj.secondaryGap : 6);
        const pastePanel = modal.querySelector('.caption-editor-paste-panel');
        if (pastePanel) pastePanel.hidden = true;
        const rows = modal.querySelector('.caption-editor-rows');
        if (rows) {
            rows.innerHTML = '';
            (Array.isArray(obj.segments) ? obj.segments : []).forEach(segment => this._appendCaptionRow(rows, segment));
            if (!rows.children.length) this._appendCaptionRow(rows, { startMs: 0, endMs: 2000, text: '' });
        }
        this._updateCaptionEditorCount();
        this._updateCombineButtonState();
        modal.classList.remove('hidden');
    }

    closeCaptionEditor() {
        this._captionEditorModal?.classList.add('hidden');
        this._captionEditorObj = null;
    }

    _appendCaptionRow(rowsEl, segment) {
        const row = document.createElement('div');
        row.className = 'caption-editor-row';
        const toSec = ms => (Math.max(0, Number(ms) || 0) / 1000).toFixed(2);
        row.innerHTML = `
            <input type="checkbox" class="caption-editor-select" title="Select to combine" aria-label="Select line">
            <input type="number" min="0" step="0.01" data-caption-field="start" value="${toSec(segment.startMs)}">
            <input type="number" min="0" step="0.01" data-caption-field="end" value="${toSec(segment.endMs)}">
            <input type="text" data-caption-field="text" value="${Utils.escapeAttr(String(segment.text || ''))}">
            <input type="text" class="caption-editor-secondary" data-caption-field="secondary" placeholder="Translation" value="${Utils.escapeAttr(String(segment.secondary || ''))}">
            <button type="button" class="caption-editor-remove" title="Remove line" aria-label="Remove line">&times;</button>`;
        if (Array.isArray(segment.words) && segment.words.length) {
            row._captionWords = segment.words.map(word => ({ ...word }));
            row.dataset.origText = String(segment.text || '');
            row.dataset.origStart = String(Number(segment.startMs) || 0);
            row.dataset.origEnd = String(Number(segment.endMs) || 0);
        }
        rowsEl.appendChild(row);
        return row;
    }

    _addCaptionRow() {
        const rows = this._captionEditorModal?.querySelector('.caption-editor-rows');
        if (!rows) return;
        const last = rows.lastElementChild;
        const lastEnd = last ? (parseFloat(last.querySelector('[data-caption-field="end"]')?.value) || 0) : 0;
        this._appendCaptionRow(rows, { startMs: lastEnd * 1000, endMs: (lastEnd + 2) * 1000, text: '' });
        this._commitCaptionRows();
    }

    _commitCaptionRows() {
        const obj = this._captionEditorObj;
        const rows = this._captionEditorModal?.querySelector('.caption-editor-rows');
        if (!obj || !rows) return;
        const segments = [];
        rows.querySelectorAll('.caption-editor-row').forEach(row => {
            const startMs = Math.max(0, Math.round((parseFloat(row.querySelector('[data-caption-field="start"]')?.value) || 0) * 1000));
            const endMs = Math.max(startMs + 1, Math.round((parseFloat(row.querySelector('[data-caption-field="end"]')?.value) || 0) * 1000));
            const text = String(row.querySelector('[data-caption-field="text"]')?.value || '').trim();
            if (!text) return;
            const secondary = String(row.querySelector('[data-caption-field="secondary"]')?.value || '').trim();
            const segment = { startMs, endMs, text };
            if (secondary) segment.secondary = secondary;
            // Keep per-word highlight timing only while the row is unchanged.
            // Compare on the 10ms display grid since the inputs show 2 decimals.
            if (row._captionWords
                && row.dataset.origText === text
                && Math.round(Number(row.dataset.origStart) / 10) === Math.round(startMs / 10)
                && Math.round(Number(row.dataset.origEnd) / 10) === Math.round(endMs / 10)) {
                segment.words = row._captionWords.map(word => ({ ...word }));
            }
            segments.push(segment);
        });
        segments.sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);
        obj.segments = segments;
        this._updateCaptionEditorCount();
        this.stage?.requestRender?.();
        eventBus.emit('history:push');
    }

    _updateCaptionEditorCount() {
        const count = this._captionEditorModal?.querySelector('.caption-editor-count');
        const rows = this._captionEditorModal?.querySelectorAll('.caption-editor-row').length || 0;
        if (count) count.textContent = `${rows} line${rows === 1 ? '' : 's'}`;
    }

    _updateCombineButtonState() {
        const modal = this._captionEditorModal;
        const button = modal?.querySelector('.caption-editor-combine');
        if (!button) return;
        const selected = modal.querySelectorAll('.caption-editor-select:checked').length;
        button.disabled = selected < 2;
    }

    // Merge the selected cues into one: span from the earliest start to the
    // latest end, join all text into a single line, and play together.
    _combineSelectedCaptionRows() {
        const modal = this._captionEditorModal;
        const obj = this._captionEditorObj;
        if (!modal || !obj) return;
        const rowsEl = modal.querySelector('.caption-editor-rows');
        const allRows = Array.from(rowsEl?.querySelectorAll('.caption-editor-row') || []);
        const selectedRows = allRows.filter(row => row.querySelector('.caption-editor-select')?.checked);
        if (selectedRows.length < 2) return;

        const read = row => {
            const startMs = Math.max(0, Math.round((parseFloat(row.querySelector('[data-caption-field="start"]')?.value) || 0) * 1000));
            const endMs = Math.max(startMs + 1, Math.round((parseFloat(row.querySelector('[data-caption-field="end"]')?.value) || 0) * 1000));
            const text = String(row.querySelector('[data-caption-field="text"]')?.value || '').trim();
            const secondary = String(row.querySelector('[data-caption-field="secondary"]')?.value || '').trim();
            const words = (row._captionWords && row.dataset.origText === text
                && Math.round(Number(row.dataset.origStart) / 10) === Math.round(startMs / 10)
                && Math.round(Number(row.dataset.origEnd) / 10) === Math.round(endMs / 10))
                ? row._captionWords.map(word => ({ ...word })) : null;
            return { startMs, endMs, text, secondary, words };
        };

        // Combine in timeline order regardless of selection order.
        const parts = selectedRows.map(read).sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);
        const startMs = Math.min(...parts.map(p => p.startMs));
        const endMs = Math.max(...parts.map(p => p.endMs));
        const text = parts.map(p => p.text).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
        const secondary = parts.map(p => p.secondary).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
        // Preserve per-word highlight timing only if every merged cue had it and
        // the combined words still line up 1:1 with the combined text (in order).
        let words;
        if (parts.every(p => Array.isArray(p.words) && p.words.length)) {
            const concatWords = parts.flatMap(p => p.words.map(word => ({ ...word })));
            const textWordCount = text.split(/\s+/).filter(Boolean).length;
            if (concatWords.length === textWordCount) words = concatWords;
        }
        const merged = { startMs, endMs, text };
        if (secondary) merged.secondary = secondary;
        if (words && words.length) merged.words = words;

        // Replace the first selected row (in DOM order) with the merged row,
        // then drop the rest.
        const firstSelected = selectedRows[0];
        const newRow = this._appendCaptionRow(rowsEl, merged);
        rowsEl.insertBefore(newRow, firstSelected);
        selectedRows.forEach(row => row.remove());

        this._commitCaptionRows();
        this._updateCombineButtonState();
        if (typeof Utils !== 'undefined' && Utils.showToast) {
            Utils.showToast(`Combined ${parts.length} cues into one`, 'success');
        }
    }

    // Distribute pasted translation lines onto the caption rows by order,
    // one line per cue (blank lines are kept so alignment is preserved).
    _applyPastedTranslation() {
        const modal = this._captionEditorModal;
        const textarea = modal?.querySelector('.caption-editor-paste-text');
        const rows = modal?.querySelectorAll('.caption-editor-row');
        if (!textarea || !rows?.length) return;
        const lines = String(textarea.value || '').replace(/\r\n/g, '\n').split('\n').map(line => line.trim());
        // Trim a single trailing blank line (common when pasting).
        if (lines.length && lines[lines.length - 1] === '') lines.pop();
        let applied = 0;
        rows.forEach((row, index) => {
            const field = row.querySelector('[data-caption-field="secondary"]');
            if (!field) return;
            const line = index < lines.length ? lines[index] : '';
            field.value = line;
            if (line) applied++;
        });
        this._commitCaptionRows();
        const panel = modal.querySelector('.caption-editor-paste-panel');
        if (panel) panel.hidden = true;
        if (typeof Utils !== 'undefined' && Utils.showToast) {
            const extra = lines.length > rows.length ? ` (${lines.length - rows.length} extra line${lines.length - rows.length === 1 ? '' : 's'} ignored)` : '';
            Utils.showToast(`Translation applied to ${applied} of ${rows.length} cue${rows.length === 1 ? '' : 's'}${extra}`, applied ? 'success' : 'warning');
        }
    }

    // === Smart Guides (snap-to-object alignment) ===
    calculateSmartGuides(draggedObj, newX, newY) {
        const threshold = this.smartGuideThreshold;
        const guides = [];
        let snapX = newX;
        let snapY = newY;

        const dragLeft = newX;
        const dragRight = newX + draggedObj.width;
        const dragTop = newY;
        const dragBottom = newY + draggedObj.height;
        const dragCenterX = newX + draggedObj.width / 2;
        const dragCenterY = newY + draggedObj.height / 2;

        // Also check stage edges and center
        const snapTargets = [];

        // Stage boundaries
        snapTargets.push({ left: 0, right: this.stage.width, top: 0, bottom: this.stage.height,
            centerX: this.stage.width / 2, centerY: this.stage.height / 2 });

        // Other objects
        this.objects.forEach(other => {
            if (other.id === draggedObj.id) return;
            if (this.selectedIds.includes(other.id)) return;
            snapTargets.push({
                left: other.x, right: other.x + other.width,
                top: other.y, bottom: other.y + other.height,
                centerX: other.x + other.width / 2,
                centerY: other.y + other.height / 2
            });
        });

        let bestDx = Infinity, bestDy = Infinity;

        snapTargets.forEach(target => {
            // Vertical guides (X alignment)
            const xChecks = [
                { drag: dragLeft, ref: target.left },
                { drag: dragLeft, ref: target.right },
                { drag: dragLeft, ref: target.centerX },
                { drag: dragRight, ref: target.left },
                { drag: dragRight, ref: target.right },
                { drag: dragRight, ref: target.centerX },
                { drag: dragCenterX, ref: target.left },
                { drag: dragCenterX, ref: target.right },
                { drag: dragCenterX, ref: target.centerX },
            ];

            xChecks.forEach(({ drag, ref }) => {
                const diff = Math.abs(drag - ref);
                if (diff < threshold && diff < Math.abs(bestDx)) {
                    bestDx = ref - drag;
                }
            });

            // Horizontal guides (Y alignment)
            const yChecks = [
                { drag: dragTop, ref: target.top },
                { drag: dragTop, ref: target.bottom },
                { drag: dragTop, ref: target.centerY },
                { drag: dragBottom, ref: target.top },
                { drag: dragBottom, ref: target.bottom },
                { drag: dragBottom, ref: target.centerY },
                { drag: dragCenterY, ref: target.top },
                { drag: dragCenterY, ref: target.bottom },
                { drag: dragCenterY, ref: target.centerY },
            ];

            yChecks.forEach(({ drag, ref }) => {
                const diff = Math.abs(drag - ref);
                if (diff < threshold && diff < Math.abs(bestDy)) {
                    bestDy = ref - drag;
                }
            });
        });

        // Apply snapping
        if (Math.abs(bestDx) < threshold) {
            snapX = newX + bestDx;
        }
        if (Math.abs(bestDy) < threshold) {
            snapY = newY + bestDy;
        }

        // Generate guide lines for rendering
        const finalLeft = snapX;
        const finalRight = snapX + draggedObj.width;
        const finalTop = snapY;
        const finalBottom = snapY + draggedObj.height;
        const finalCX = snapX + draggedObj.width / 2;
        const finalCY = snapY + draggedObj.height / 2;

        snapTargets.forEach(target => {
            // Draw vertical guide lines for snapped X positions
            [finalLeft, finalRight, finalCX].forEach(fx => {
                [target.left, target.right, target.centerX].forEach(ref => {
                    if (Math.abs(fx - ref) < 1) {
                        const minY = Math.min(finalTop, target.top) - 20;
                        const maxY = Math.max(finalBottom, target.bottom) + 20;
                        guides.push({ type: 'v', pos: ref, from: minY, to: maxY });
                    }
                });
            });
            // Draw horizontal guide lines for snapped Y positions
            [finalTop, finalBottom, finalCY].forEach(fy => {
                [target.top, target.bottom, target.centerY].forEach(ref => {
                    if (Math.abs(fy - ref) < 1) {
                        const minX = Math.min(finalLeft, target.left) - 20;
                        const maxX = Math.max(finalRight, target.right) + 20;
                        guides.push({ type: 'h', pos: ref, from: minX, to: maxX });
                    }
                });
            });
        });

        this.smartGuides = guides;
        return { x: snapX, y: snapY };
    }

    // === Object Grouping (PowerPoint-style) ===
}
