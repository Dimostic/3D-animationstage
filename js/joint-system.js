// ─────────────────────────────────────────────────────
//  JOINT SYSTEM MANAGER — Core class definition
//  Method groups are split into separate joint-*.js files
// ─────────────────────────────────────────────────────

class JointSystem {

    constructor(objectManager, stage, animations) {
        this.objects = objectManager;
        this.stage = stage;
        this.animations = animations;
        this._assemblyMap = {};       // { partKey: objectId }
        this._activePreset = null;    // currently selected JointPreset
        this._previewAnim = null;     // preview animation handle
        this._ragdollAnim = null;

        // Initialize overlay renderer and IK after a tick (DOM must be ready)
        setTimeout(() => {
            this.initSkeletonOverlay();
            this.initIKDragMode();
            this.initJointRotationHandles();
        }, 100);

        // Smart Cut state
        this._smartCutActive = false;
        this._smartCutObj = null;
        this._smartCutRegions = []; // { path:[], label:partKey, name:string }
        this._smartCutCurrentPath = [];
        this._smartCutHover = null;
        this._smartCutPreset = null;
        this._smartCutGuideKey = null;
        this._smartCutEdgeMap = null; // cached alpha edge data
        this._smartCutAutoOutline = null;
        this._smartCutEditMode = false;
        this._smartCutDragging = null;
        this._smartCutRegionDrag = null;
        this._smartCutHoverPoint = null;
        this._smartCutHoverRegion = null;
        this._smartCutSelectedRegion = null;
        this._smartCutLastTrainingCandidate = null;
        this._smartCutOriginalSrc = null;
        this._smartCutOriginalImageElement = null;
        this._smartCutPreparedSrc = null;
        this._smartCutPreparedCanvas = null;
        this._smartCutPreparedTolerance = null;
        // Guided landmark collection state
        this._smartCutGuidedLandmarks = null;  // { points: {key→{x,y}}, current: index, active: bool }
        this._guidedRig = null;
        this._jointRotateDrag = null;
        this._assemblyUseContours = true;
        this._bodyTagActive = false;
        this._bodyTagContext = null;
        this._bodyTagSelectedRef = null;
        this._bodyTagDrag = null;
        this._bodyTagAddMode = null;
        this._bodyTagHoverRef = null;
    }

    _getJointAngleLimits() {
        return { minAngle: -180, maxAngle: 180 };
    }

    _clampJointAngle(angle) {
        const { minAngle, maxAngle } = this._getJointAngleLimits();
        return Math.max(minAngle, Math.min(maxAngle, angle));
    }

    _applyGlobalJointLimits(target) {
        if (!target) return target;
        const { minAngle, maxAngle } = this._getJointAngleLimits();
        target.minAngle = minAngle;
        target.maxAngle = maxAngle;
        return target;
    }

}
