/**
 * Stage Camera — animated viewport that pans & zooms during playback.
 *
 * Concept: a draggable/resizable rectangle is the camera frame. At playback
 * time the renderer scales+translates so this rectangle fills the stage.
 * Keyframes are placed at points along the timeline; values interpolate.
 *
 * Edit mode: rectangle is editable on stage, dimming area outside.
 * Playback / export: transform is applied automatically inside stage.render().
 *
 * Persistence: keyframes are stored on stage (so they round-trip via
 * getStageData/loadFromData and serialize with the project + per-scene).
 */
class StageCameraManager {
    constructor(stage, animations) {
        this.stage = stage;
        this.animations = animations;
        this._editMode = false;
        this._panelEl = null;
        this._dragMode = null;          // 'pan' | 'resize-tl' | 'resize-tr' | 'resize-bl' | 'resize-br' | 'resize-center' | null
        this._dragStart = null;         // { mouseX, mouseY, frameX, frameY, frameW, frameH }
        this._backupKeyframes = null;   // for Cancel
        this._defaultEasing = 'easeInOut';

        // Ensure the stage has the storage hook
        if (!Array.isArray(this.stage.cameraKeyframes)) {
            this.stage.cameraKeyframes = [];
        }
        if (!('cameraEnabled' in this.stage)) {
            this.stage.cameraEnabled = true;
        }

        // Bind listeners (kept around for add/removeEventListener)
        this._onMouseDown = this._onMouseDown.bind(this);
        this._onMouseMove = this._onMouseMove.bind(this);
        this._onMouseUp = this._onMouseUp.bind(this);
        this._onWheel = this._onWheel.bind(this);
        this._onKeyDown = this._onKeyDown.bind(this);

        // Overlay rendering hook
        eventBus.on('stage:render-overlay', (ctx) => this._renderOverlay(ctx));
        for(const name of ['playback:paused','playback:stopped'])eventBus.on(name,()=>{this._cameraPreview=false;this.stage.requestRender();});
        let refreshTimer,checkLiveEdit=false;
        for(const name of ['history:push','objects:updated','audio:updated','stage:resize','timeline:update'])eventBus.on(name,()=>{
            checkLiveEdit ||= name==='history:push';clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>{const live=checkLiveEdit;checkLiveEdit=false;this._checkCharacterShots(live);},350);
        });

        // Toolbar wiring (deferred until DOM exists)
        const wire = () => {
            const btn = document.getElementById('btn-animate-stage-camera');
            if (btn && !btn._scWired) {
                btn._scWired = true;
                btn.addEventListener('click', () => this.toggle());
            }
        };
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', wire);
        } else {
            wire();
        }
    }

    // ───────── Public API ─────────

    toggle() { this._editMode ? this.cancel() : this.enter(); }

    enter() {
        if (this._editMode) return;
        this._checkCharacterShots();
        this._editMode = true;
        this._backupEnabled=this.stage.cameraEnabled;

        // Snapshot keyframes for Cancel
        this._backupKeyframes = JSON.parse(JSON.stringify(this.stage.cameraKeyframes || []));

        // If no keyframes exist, seed a full-stage keyframe at t=0 so the user
        // sees a sensible starting rectangle.
        if (!this.stage.cameraKeyframes.length) {
            this.stage.cameraKeyframes.push({...this._makeFullFrameKeyframe(0),cameraSeed:true});
        }

        // Listen for canvas mouse + wheel (capture so we win against object selection)
        this.stage.canvas.addEventListener('mousedown', this._onMouseDown, true);
        window.addEventListener('mousemove', this._onMouseMove, true);
        window.addEventListener('mouseup', this._onMouseUp, true);
        this.stage.canvas.addEventListener('wheel', this._onWheel, { capture: true, passive: false });
        window.addEventListener('keydown', this._onKeyDown);

        // Subscribe to playhead changes so the rectangle follows
        this._timelineUpdateHandler = () => this.stage.requestRender();
        eventBus.on('timeline:update', this._timelineUpdateHandler);
        eventBus.on('timeline:scrub', this._timelineUpdateHandler);

        document.getElementById('btn-animate-stage-camera')?.classList.add('active');
        this._buildPanel();
        this.stage.requestRender();
        if (typeof Utils !== 'undefined' && Utils.showToast) {
            Utils.showToast('Camera Mode — drag the frame to pan, drag corners to zoom. Move the playhead and adjust to add a keyframe.', 'info');
        }
    }

    exit(applied = true) {
        if(this._shotBusy)return;
        if (!this._editMode) return;
        this._editMode = false;
        if(this._cameraPreview)this.animations.pause?.();
        this._cameraPreview=false;
        this._dragMode = null;
        this._dragStart = null;

        this.stage.canvas.removeEventListener('mousedown', this._onMouseDown, true);
        window.removeEventListener('mousemove', this._onMouseMove, true);
        window.removeEventListener('mouseup', this._onMouseUp, true);
        this.stage.canvas.removeEventListener('wheel', this._onWheel, { capture: true });
        window.removeEventListener('keydown', this._onKeyDown);

        if (this._timelineUpdateHandler) {
            eventBus.off?.('timeline:update', this._timelineUpdateHandler);
            eventBus.off?.('timeline:scrub', this._timelineUpdateHandler);
            this._timelineUpdateHandler = null;
        }
        if (this._timeDisplayHandler) {
            eventBus.off?.('timeline:time', this._timeDisplayHandler);
            eventBus.off?.('timeline:scrub', this._timeDisplayHandler);
            this._timeDisplayHandler = null;
        }

        document.getElementById('btn-animate-stage-camera')?.classList.remove('active');
        this._panelEl?.remove();
        this._panelEl = null;
        this._refreshCharacterShotList=null;
        this._commitCharacterShotDraft=null;
        this.stage.canvas.style.cursor = '';

        if (applied) {
            eventBus.emit?.('history:push');
            if (this.stage.cameraKeyframes.length >= 2 && typeof Utils !== 'undefined' && Utils.showToast) {
                Utils.showToast(`Stage Camera applied (${this.stage.cameraKeyframes.length} keyframes)`, 'success');
            } else if (this.stage.cameraKeyframes.length <= 1 && typeof Utils !== 'undefined' && Utils.showToast) {
                Utils.showToast('Stage Camera saved (add a 2nd keyframe to animate)', 'info');
            }
        }
        this._backupKeyframes = null;
        this.stage.requestRender();
    }

    cancel() {
        if(this._shotBusy)return;
        if (!this._editMode) return;
        if (this._backupKeyframes) {
            this.stage.cameraKeyframes = JSON.parse(JSON.stringify(this._backupKeyframes));
        }
        this.stage.cameraEnabled=this._backupEnabled;
        this.exit(false);
        eventBus.emit('camera:keyframes-changed');
        if (typeof Utils !== 'undefined' && Utils.showToast) {
            Utils.showToast('Camera changes discarded', 'info');
        }
    }

    clearKeyframes() {
        this.stage.cameraKeyframes = [];
        if (this._editMode) {
            this.stage.cameraKeyframes.push({...this._makeFullFrameKeyframe(0),cameraSeed:true});
        }
        this.stage.requestRender();
        this._refreshPanel();
    }

    /**
     * Returns a transform `{ scale, x, y }` to apply during render, or null if
     * no camera animation is active. Called from stage.render().
     */
    getActiveTransform() {
        if (!this.stage.cameraEnabled) return null;
        const kfs = this.stage.cameraKeyframes;
        if (!Array.isArray(kfs) || kfs.length === 0) return null;

        // While editing, never apply the transform — user needs to see the
        // stage in its true coordinate space. The rectangle overlay shows what
        // the camera will frame.
        if (this._editMode && !this._cameraPreview) return null;

        // Apply at all other times (playback AND timeline scrubbing) so the
        // camera animation is visible whenever the user moves the playhead.

        const time = this.animations?.currentTime || 0;
        const frame = this._sampleFrame(time);
        if (!frame) return null;

        const stageW = this.stage.width;
        const fitW = frame.w > 0 ? frame.w : stageW;
        const scale = stageW / fitW;
        return { scale, x: frame.x, y: frame.y };
    }

    // ───────── Keyframe math ─────────

    _stageAspect() {
        return this.stage.width / Math.max(1, this.stage.height);
    }

    _makeFullFrameKeyframe(timeMs) {
        return {
            time: Math.max(0, timeMs | 0),
            x: 0, y: 0,
            w: this.stage.width,
            h: this.stage.height,
            easing: this._defaultEasing
        };
    }

    _normalizedFrame(rect) {
        // Lock aspect to stage aspect using the larger dimension so frame
        // never produces stretched output.
        const aspect = this._stageAspect();
        let { x, y, w, h } = rect;
        // Honor width as the source-of-truth; recompute height
        if (w / h > aspect) {
            h = w / aspect;
        } else {
            w = h * aspect;
        }
        // Clamp: width range = 5%..150% of stage
        const minW = this.stage.width * 0.05;
        const maxW = this.stage.width * 1.5;
        w = Math.max(minW, Math.min(maxW, w));
        h = w / aspect;
        // Clamp position so frame center stays near the stage
        return { x, y, w, h };
    }

    _sampleFrame(timeMs) {
        const kfs = this.stage.cameraKeyframes;
        if (!kfs?.length) return null;
        const sorted = [...kfs].sort((a, b) => a.time - b.time);
        if (timeMs <= sorted[0].time) return { ...sorted[0] };
        if (timeMs >= sorted[sorted.length - 1].time) return { ...sorted[sorted.length - 1] };
        for (let i = 0; i < sorted.length - 1; i++) {
            const a = sorted[i], b = sorted[i + 1];
            if (timeMs >= a.time && timeMs <= b.time) {
                const span = Math.max(1, b.time - a.time);
                const raw = (timeMs - a.time) / span;
                const easeName = b.easing || a.easing || this._defaultEasing;
                const ease = (typeof Utils !== 'undefined' && Utils.getEasing) ? Utils.getEasing(easeName) : (t => t);
                const t = ease(raw);
                return {
                    time: timeMs,
                    x: a.x + (b.x - a.x) * t,
                    y: a.y + (b.y - a.y) * t,
                    w: a.w + (b.w - a.w) * t,
                    h: a.h + (b.h - a.h) * t,
                    easing: easeName
                };
            }
        }
        return { ...sorted[sorted.length - 1] };
    }

    _currentEditTime() {
        return Math.max(0, this.animations?.currentTime || 0);
    }

    _findKeyframeNear(timeMs, toleranceMs = 50) {
        const kfs = this.stage.cameraKeyframes;
        for (let i = 0; i < kfs.length; i++) {
            if (Math.abs(kfs[i].time - timeMs) <= toleranceMs) return kfs[i];
        }
        return null;
    }

    _commitFrameAtTime(rect) {
        const time = this._currentEditTime();
        const fr = this._normalizedFrame(rect);
        const existing = this._findKeyframeNear(time);
        if(existing?.choreographyId || existing?.characterCameraId){Utils.showToast('Edit this generated shot through its camera or choreography controls.','warning');return;}
        if(!this._manualCameraTimeAllowed(time,existing))return;
        if (existing) {
            delete existing.cameraSeed;
            existing.x = fr.x;
            existing.y = fr.y;
            existing.w = fr.w;
            existing.h = fr.h;
            existing.time = time;
        } else {
            this.stage.cameraKeyframes.push({
                time,
                x: fr.x, y: fr.y, w: fr.w, h: fr.h,
                easing: this._defaultEasing,
                manualCameraSectionId:this._manualSectionId || undefined
            });
            this.stage.cameraKeyframes.sort((a, b) => a.time - b.time);
        }
        this._refreshPanel();
        this.stage.requestRender();
    }

    addKeyframeAtCurrentTime() {
        let time = this._currentEditTime();
        // If a keyframe already exists at (or very near) this time, auto-advance
        // the playhead by 1 second so each click captures a distinct frame.
        // Without this, repeated clicks at t=0 silently overwrite the same kf.
        const existing = this._findKeyframeNear(time, 50);
        let bumped = false;
        if (existing && this.stage.cameraKeyframes.length > 0) {
            const lastTime = Math.max(...this.stage.cameraKeyframes.map(k => k.time));
            const totalDur = Math.max(this.animations?.totalDuration || 5000, lastTime + 1000);
            time = Math.min(lastTime + 1000, totalDur);
            if (this.animations) {
                this.animations.currentTime = time;
                eventBus.emit?.('timeline:time', time);
                eventBus.emit?.('timeline:scrub', time);
            }
            bumped = true;
        }
        const rect = this._currentEditFrame();
        const fr = this._normalizedFrame(rect);
        if(!this._manualCameraTimeAllowed(time))return;
        this.stage.cameraKeyframes.push({
            time: Math.max(0, time | 0),
            x: fr.x, y: fr.y, w: fr.w, h: fr.h,
            easing: this._defaultEasing,
            manualCameraSectionId:this._manualSectionId || undefined
        });
        this.stage.cameraKeyframes.sort((a, b) => a.time - b.time);
        this._refreshPanel();
        this.stage.requestRender();
        if (typeof Utils !== 'undefined' && Utils.showToast) {
            const msg = bumped
                ? `Keyframe added at ${(time / 1000).toFixed(2)}s (auto-advanced — scrub the timeline to place at a different time)`
                : `Keyframe added at ${(time / 1000).toFixed(2)}s`;
            Utils.showToast(msg, bumped ? 'info' : 'success');
        }
    }

    stepTime(deltaMs) {
        if (!this.animations) return;
        const max = Math.max(this.animations.totalDuration || 5000, 5000);
        const next = Math.max(0, Math.min(max, (this.animations.currentTime || 0) + deltaMs));
        this.animations.currentTime = next;
        eventBus.emit?.('timeline:time', next);
        eventBus.emit?.('timeline:scrub', next);
        this._updateTimeDisplay();
        this.stage.requestRender();
    }

    _updateTimeDisplay() {
        if (!this._panelEl) return;
        const el = this._panelEl.querySelector('[data-cur-time]');
        if (el) el.textContent = ((this.animations?.currentTime || 0) / 1000).toFixed(2) + 's';
    }

    deleteKeyframe(index) {
        if (index < 0 || index >= this.stage.cameraKeyframes.length) return;
        if(this.stage.cameraKeyframes[index].choreographyId || this.stage.cameraKeyframes[index].characterCameraId){Utils.showToast('Delete this generated shot through its camera or choreography controls.','warning');return;}
        this.stage.cameraKeyframes.splice(index, 1);
        this._refreshPanel();
        this.stage.requestRender();
    }

    resetCurrentFrame() {
        // Set frame to full-stage at current time
        this._commitFrameAtTime({ x: 0, y: 0, w: this.stage.width, h: this.stage.height });
    }

    setKeyframeEasing(index, easing) {
        const kf = this.stage.cameraKeyframes[index];
        if (!kf) return;
        if(kf.choreographyId || kf.characterCameraId){Utils.showToast('Edit this generated shot through its camera or choreography controls.','warning');return;}
        kf.easing = easing;
        this._defaultEasing = easing;
        this._refreshPanel();
        this.stage.requestRender();
    }

    _startManualCameraSection() {
        const prior=this._manualSectionId;this._manualSectionId=Utils.generateId('camera-section');
        const time=this._currentEditTime();if(!this._manualCameraTimeAllowed(time)){this._manualSectionId=prior;return;}
        this.stage.cameraKeyframes.push({...this._normalizedFrame(this._currentEditFrame()),time,easing:this._defaultEasing,manualCameraSectionId:this._manualSectionId});
        this.stage.cameraKeyframes.sort((a,b)=>a.time-b.time);this._refreshPanel();this.stage.requestRender();
    }

    _manualCameraTimeAllowed(time,replacing=null,notify=true) {
        const section=replacing?(replacing.manualCameraSectionId || 'default'):(this._manualSectionId || 'default');
        const frames=this.stage.cameraKeyframes,manual=frames.filter(frame=>!frame.choreographyId && !frame.characterCameraId && !frame.cameraSeed && frame!==replacing && (frame.manualCameraSectionId || 'default')===section);
        const start=Math.min(time,...manual.map(frame=>frame.time)),end=Math.max(time,...manual.map(frame=>frame.time)),windows=new Map();
        for(const frame of frames)if(!frame.choreographyLead && !frame.cameraSeed && frame!==replacing && (frame.choreographyId || frame.characterCameraId || (frame.manualCameraSectionId || 'default')!==section)){const id=frame.choreographyId || frame.characterCameraId || `manual:${frame.manualCameraSectionId || 'default'}`,window=windows.get(id)||{start:Infinity,end:-Infinity};window.start=Math.min(window.start,frame.time);window.end=Math.max(window.end,frame.time);windows.set(id,window);}
        if([...windows.values()].some(window=>start<=window.end && end>=window.start)){if(notify)Utils.showToast('Camera sections overlap. Move outside the existing section, or start a new section.','warning');return false;}
        return true;
    }

    _newCharacterShot() {
        return {name:'Character shot',start:this._currentEditTime()/1000,duration:4,subjects:[],mode:'selected',framing:'waist-up',tracking:true,fitRouteDuration:true,blend:.6,padding:20,smoothing:.3,adaptiveZoom:false,minZoom:.1,maxZoom:10,zoomSpeed:.35,headroom:0,offset:0,lookAhead:0};
    }

    _fitCharacterShotRoute(settings) {
        if (!settings.fitRouteDuration || !settings.tracking || settings.mode === 'full') return settings;
        const system = window.app.jointSystem, ids = new Set();
        for (const obj of window.app.objects.objects) for (const track of obj.animations || []) {
            if (track._armatureActionId) ids.add(track._armatureActionId);
        }
        const actions = [...ids].map(id => system._getArmatureRecordedAction(id)).filter(action => {
            if(action?.recipe?.sequence?.steps?.some(step => step.kind === 'travel-route')
                && settings.subjects.includes(action.rootId))return true;
            const choreography=action?.recipe?.choreography;
            const actors=new Set((choreography?.actors || []).filter(actor=>settings.subjects.includes(actor.rootId)).map(actor=>actor.id));
            return choreography?.beats?.some(beat=>beat.actions.some(item=>actors.has(item.actorId)&&item.step.kind==='travel-route'));
        });
        if (!actions.length) return settings;
        const start = Math.min(...actions.map(action => action.start));
        const end = Math.max(...actions.map(action => action.start + action.durationMs));
        return { ...settings, start: start / 1000, duration: (end - start) / 1000 };
    }

    _characterShotEntries() {
        return this.stage.cameraKeyframes.filter(frame=>frame.characterCameraRecipe);
    }

    _preferredCharacterShot() {
        const objects=window.app?.objects,byId=new Map((objects?.objects || []).map(obj=>[obj.id,obj]));
        const selected=new Set();
        for(const id of objects?.selectedIds || []){
            let obj=byId.get(id);const visited=new Set();
            while(obj&&!visited.has(obj.id)){visited.add(obj.id);selected.add(obj.id);obj=byId.get(obj.pinnedTo);}
        }
        const entries=this._characterShotEntries(),matches=entries.filter(entry=>entry.characterCameraRecipe.subjects.some(id=>selected.has(id)));
        const candidates=selected.size?matches:entries,time=this._currentEditTime()/1000;
        return candidates.find(entry=>{const recipe=entry.characterCameraRecipe;return time>=recipe.start&&time<recipe.start+recipe.duration;})
            ||candidates.find(entry=>entry.characterCameraId===this._lastCharacterShotId)||candidates[0]||null;
    }

    _characterShotAudio(settings) {
        const audio=window.app.audioTimeline;audio?._saveActiveTrack?.();
        return (audio?.tracks || []).filter(track=>!track.muted && settings.subjects.includes(track.characterId)).map(track=>({
            id:track.audioId,rootId:track.characterId,start:Number(track.timelineStartMs)||0,
            end:(Number(track.timelineStartMs)||0)+audio._getTrackClipDurationMs(track),revision:track.audioRevision
        })).filter(track=>track.start<(settings.start+settings.duration)*1000&&track.end>settings.start*1000);
    }

    _characterShotFingerprint(settings) {
        const s=window.app.jointSystem;
        const geometry=settings.mode==='full'?`${this.stage.width}:${this.stage.height}`:s._choreographyCameraFingerprint({start:settings.start*1000,durationMs:settings.duration*1000,recipe:{choreography:{actors:settings.subjects.map(rootId=>({rootId}))}}});
        return JSON.stringify({geometry,audio:['speaker','coverage'].includes(settings.mode)?this._characterShotAudio(settings):[]});
    }

    _checkCharacterShots(checkLiveEdit=false) {
        if(this._shotBusy || this._editMode || this.animations.isPlaying || this.animations._exportingVideo || window.app?.jointSystem?._choreographyCompiling || window.app?.jointSystem?._characterSequenceCompiling)return;
        for(const entry of this._characterShotEntries()){
            if(entry.characterCameraNeedsRefresh)continue;
            let stale=false;
            try{
                const settings=entry.characterCameraRecipe,s=window.app.jointSystem;
                if(checkLiveEdit&&settings.mode!=='full'){
                    const rigs=settings.subjects.map(rootId=>s._choreographyRig(rootId)),snapshot=s._choreographySnapshot(rigs),geometry=()=>rigs.map(rig=>[rig.root.x,rig.root.y,...Object.values(s._getArmatureBounds(rig))]),before=geometry();
                    try{this.animations.applyAnimationsAtTime(this.animations.currentTime,{timelinePreview:true});s.objects._resolvePins();const expected=geometry();stale=before.some((values,i)=>values.some((value,j)=>Math.abs(value-expected[i][j])>.1));}
                    finally{s._restoreArmatureActionSnapshot(snapshot,true);}
                }
                stale ||= entry.characterCameraFingerprint!==this._characterShotFingerprint(settings);
            }catch(_){stale=true;}
            if(stale){const live=this.stage.cameraKeyframes.find(f=>f.characterCameraId===entry.characterCameraId&&f.characterCameraRecipe);if(live)live.characterCameraNeedsRefresh=true;Utils.showToast('A character camera shot needs refresh. Open Camera, then Character shots.','warning');}
        }
    }

    _saveCharacterShot(input,id=null) {
        if(this.animations.isPlaying || this.animations._exportingVideo)throw Error('Stop playback before creating a camera shot.');
        const settings=this._fitCharacterShotRoute(Utils.deepClone(input)),s=window.app.jointSystem;
        const ranges={start:[0,86400],duration:[.05,3600],blend:[.05,10],padding:[0,100],smoothing:[0,1.5],headroom:[0,35],offset:[-35,35],lookAhead:[0,1.5],minZoom:[.05,10],maxZoom:[.1,20],zoomSpeed:[.05,2]};
        for(const [key,[min,max]] of Object.entries(ranges))if(!Number.isFinite(settings[key])||settings[key]<min||settings[key]>max)throw Error(`${key} must be between ${min} and ${max}.`);
        if(!['selected','speaker','coverage','full'].includes(settings.mode)||!['full-body','waist-up','close-up'].includes(settings.framing))throw Error('Choose a camera shot and framing preset.');
        if(settings.minZoom>settings.maxZoom)throw Error('Minimum zoom must not exceed maximum zoom.');
        if(!Array.isArray(settings.subjects)||new Set(settings.subjects).size!==settings.subjects.length||(!settings.subjects.length&&settings.mode!=='full'))throw Error('Select at least one character.');
        const actors=settings.mode==='full'?[]:settings.subjects.map(rootId=>({id:rootId,rootId})),rigs=actors.map(actor=>s._choreographyRig(actor.rootId));
        const start=settings.start*1000,end=start+settings.duration*1000,existing=this.stage.cameraKeyframes.filter(f=>f.characterCameraId!==id&&!f.cameraSeed),windows=new Map();
        for(const frame of existing){if(frame.choreographyLead)continue;const owner=frame.choreographyId||frame.characterCameraId||frame.manualCameraSectionId||'manual';const range=windows.get(owner)||{start:Infinity,end:-Infinity,generated:!!(frame.choreographyId||frame.characterCameraId)};range.start=Math.min(range.start,frame.time);range.end=Math.max(range.end,frame.time);windows.set(owner,range);}
        if([...windows.values()].some(range=>range.generated?start<range.end&&end>range.start:start<=range.end&&end>=range.start))throw Error('Camera sections overlap. Move this shot outside the existing camera section.');
        const audio=['speaker','coverage'].includes(settings.mode)?this._characterShotAudio(settings):[];
        if(['speaker','coverage'].includes(settings.mode)&&!audio.length)throw Error('No speech is linked to the selected characters in this time range. Link audio first or choose Selected characters.');
        const boundaries=[...new Set([start,end,...audio.flatMap(track=>[Math.max(start,track.start),Math.min(end,track.end)])])].sort((a,b)=>a-b);
        const snapshot=rigs.length?s._choreographySnapshot(rigs):null,original=this.stage.cameraKeyframes;
        const full={x:0,y:0,w:this.stage.width,h:this.stage.height},frames=[],shotId=id||Utils.generateId('character-camera');
        const add=(time,rect,easing='linear')=>{const frame={...rect,time,easing,characterCameraId:shotId,manualCameraSectionId:shotId};if(frames.at(-1)?.time===time)frames.pop();frames.push(frame);};
        try {
            this.stage.cameraKeyframes=existing;
            let current=this._sampleFrame(start)||full;current={x:current.x,y:current.y,w:current.w,h:current.h};add(start,current);
            for(let i=0;i<boundaries.length-1;i++){
                const segment={start:boundaries[i]-start,end:boundaries[i+1]-start},active=[...new Set(audio.filter(track=>track.start<boundaries[i+1]&&track.end>boundaries[i]).map(track=>track.rootId))];
                const mode=settings.mode==='full'?'full':settings.mode==='selected'?'group':active.length===1?'actor':'group';
                const cue={...settings,mode,actorId:active[0],coverage:settings.mode==='coverage'&&active.length===1},beat={actions:active.map(actorId=>({actorId,step:{speech:{audioId:'linked'}}})),camera:cue};
                for(const shot of s._choreographyCameraShots({actors},beat,segment)){
                    const selected=shot.cue.mode==='actor'?actors.filter(actor=>actor.id===shot.cue.actorId):actors,blend=Math.min(settings.blend*1000,shot.segment.end-shot.segment.start),entry=current;
                    add(start+shot.segment.start,current);
                    if(settings.tracking && shot.cue.mode!=='full'){
                        for(const sample of s._choreographyTrackingFrames(selected,shot.cue,start,shot.segment,settings.duration*1000)){
                            const t=Math.min(1,(sample.offset-shot.segment.start)/blend),ease=t<.5?2*t*t:1-(-2*t+2)**2/2;
                            current=Object.fromEntries(['x','y','w','h'].map(key=>[key,entry[key]+(sample.rect[key]-entry[key])*ease]));add(start+sample.offset,current);
                        }
                    }else{current=shot.cue.mode==='full'?full:s._choreographyCameraFrame(selected,shot.cue,start+shot.segment.start+blend);add(start+shot.segment.start+blend,current,'easeInOut');add(start+shot.segment.end,current);}
                }
            }
        } finally {if(snapshot)s._restoreArmatureActionSnapshot(snapshot,true);else this.stage.cameraKeyframes=original;}
        frames[0].characterCameraRecipe=settings;
        frames[0].characterCameraFingerprint=this._characterShotFingerprint(settings);
        // Preserve an existing lead-in, or provide a full-stage hold before the first shot.
        const seeds=this.stage.cameraKeyframes.filter(f=>f.cameraSeed);
        this.stage.cameraKeyframes=s._composeChoreographyCameras([...existing,...(start>0&&!existing.some(f=>f.time<start)?seeds.length?seeds:[{...full,time:0,easing:'linear',cameraSeed:true}]:[]),...frames].sort((a,b)=>a.time-b.time));
        this.stage.cameraEnabled=true;this._refreshPanel();this.stage.requestRender();return shotId;
    }

    _currentEditFrame() {
        // The frame the user currently sees — interpolated at the playhead.
        const time = this._currentEditTime();
        const sampled = this._sampleFrame(time);
        if (sampled) return { x: sampled.x, y: sampled.y, w: sampled.w, h: sampled.h };
        return { x: 0, y: 0, w: this.stage.width, h: this.stage.height };
    }

    // ───────── Mouse interaction ─────────

    _hitTest(stageX, stageY) {
        const fr = this._currentEditFrame();
        const handleSize = 14 / Math.max(0.001, this.stage.zoom);
        const centerHandleSize = 18 / Math.max(0.001, this.stage.zoom);
        const corners = [
            { id: 'resize-tl', x: fr.x,           y: fr.y },
            { id: 'resize-tr', x: fr.x + fr.w,    y: fr.y },
            { id: 'resize-bl', x: fr.x,           y: fr.y + fr.h },
            { id: 'resize-br', x: fr.x + fr.w,    y: fr.y + fr.h }
        ];
        for (const c of corners) {
            if (Math.hypot(stageX - c.x, stageY - c.y) <= handleSize) return c.id;
        }
        // Center handle — scale uniformly from the frame's center
        const cx = fr.x + fr.w / 2;
        const cy = fr.y + fr.h / 2;
        if (Math.hypot(stageX - cx, stageY - cy) <= centerHandleSize) return 'resize-center';
        if (stageX >= fr.x && stageX <= fr.x + fr.w &&
            stageY >= fr.y && stageY <= fr.y + fr.h) {
            return 'pan';
        }
        return null;
    }

    _onMouseDown(e) {
        if (!this._editMode || this._cameraPreview || e.button !== 0) return;
        const pos = this.stage.screenToStage(e.clientX, e.clientY);
        const hit = this._hitTest(pos.x, pos.y);
        if (!hit) return; // let normal selection happen if user clicks outside
        this._dragMode = hit;
        const fr = this._currentEditFrame();
        this._dragStart = {
            mouseX: pos.x, mouseY: pos.y,
            frameX: fr.x, frameY: fr.y,
            frameW: fr.w, frameH: fr.h
        };
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation?.();
    }

    _onMouseMove(e) {
        if (!this._editMode || this._cameraPreview) return;

        // Update cursor when hovering, even when not dragging
        if (!this._dragMode) {
            const pos = this.stage.screenToStage(e.clientX, e.clientY);
            const hit = this._hitTest(pos.x, pos.y);
            if (hit === 'pan') this.stage.canvas.style.cursor = 'move';
            else if (hit === 'resize-tl' || hit === 'resize-br') this.stage.canvas.style.cursor = 'nwse-resize';
            else if (hit === 'resize-tr' || hit === 'resize-bl') this.stage.canvas.style.cursor = 'nesw-resize';
            else if (hit === 'resize-center') this.stage.canvas.style.cursor = 'zoom-in';
            else this.stage.canvas.style.cursor = '';
            return;
        }

        const pos = this.stage.screenToStage(e.clientX, e.clientY);
        const dx = pos.x - this._dragStart.mouseX;
        const dy = pos.y - this._dragStart.mouseY;
        const start = this._dragStart;
        const aspect = this._stageAspect();
        let nx = start.frameX, ny = start.frameY, nw = start.frameW, nh = start.frameH;

        if (this._dragMode === 'pan') {
            nx = start.frameX + dx;
            ny = start.frameY + dy;
        } else if (this._dragMode === 'resize-center') {
            // Scale from center: use vertical drag (down = bigger, up = smaller).
            // Anchor is the frame's center; preserve aspect.
            const cxStart = start.frameX + start.frameW / 2;
            const cyStart = start.frameY + start.frameH / 2;
            const minW = this.stage.width * 0.05;
            const maxW = this.stage.width * 1.5;
            // Drag down or right grows the frame; drag up or left shrinks it.
            const delta = dy + dx; // combined for either-direction feel
            const factor = 1 + (delta / Math.max(120, start.frameH));
            let absW = Math.max(minW, Math.min(maxW, start.frameW * factor));
            let absH = absW / aspect;
            nw = absW;
            nh = absH;
            nx = cxStart - nw / 2;
            ny = cyStart - nh / 2;
        } else {
            // Resize from a fixed opposite corner; preserve aspect using max delta
            const fixed = {
                'resize-tl': { x: start.frameX + start.frameW, y: start.frameY + start.frameH },
                'resize-tr': { x: start.frameX,                y: start.frameY + start.frameH },
                'resize-bl': { x: start.frameX + start.frameW, y: start.frameY                },
                'resize-br': { x: start.frameX,                y: start.frameY                }
            }[this._dragMode];
            const dragX = pos.x;
            const dragY = pos.y;
            let absW = Math.abs(dragX - fixed.x);
            let absH = Math.abs(dragY - fixed.y);
            // Lock aspect — pick whichever dimension grew more
            if (absW / Math.max(1, absH) > aspect) {
                absH = absW / aspect;
            } else {
                absW = absH * aspect;
            }
            const minW = this.stage.width * 0.05;
            absW = Math.max(minW, absW);
            absH = absW / aspect;
            nw = absW;
            nh = absH;
            nx = (this._dragMode === 'resize-tr' || this._dragMode === 'resize-br') ? fixed.x : fixed.x - nw;
            ny = (this._dragMode === 'resize-bl' || this._dragMode === 'resize-br') ? fixed.y : fixed.y - nh;
        }

        // Live update — write a transient frame so render shows the change.
        // Commit on mouseup.
        this._previewFrame = { x: nx, y: ny, w: nw, h: nh };
        this.stage.requestRender();
        e.preventDefault();
        e.stopPropagation();
    }

    _onMouseUp(e) {
        if (!this._editMode || !this._dragMode) return;
        if (this._previewFrame) {
            this._commitFrameAtTime(this._previewFrame);
            this._previewFrame = null;
        }
        this._dragMode = null;
        this._dragStart = null;
        this.stage.canvas.style.cursor = '';
        e.preventDefault?.();
        e.stopPropagation?.();
    }

    _onWheel(e) {
        if (!this._editMode || this._cameraPreview) return;
        const pos = this.stage.screenToStage(e.clientX, e.clientY);
        const fr = this._currentEditFrame();
        // Only zoom when the cursor is over the frame (so user can still scroll
        // outside it without altering the camera).
        if (pos.x < fr.x || pos.x > fr.x + fr.w || pos.y < fr.y || pos.y > fr.y + fr.h) return;
        e.preventDefault();
        e.stopPropagation();

        const aspect = this._stageAspect();
        const scaleStep = e.deltaY < 0 ? 0.92 : 1.08;
        let nw = fr.w * scaleStep;
        const minW = this.stage.width * 0.05;
        const maxW = this.stage.width * 1.5;
        nw = Math.max(minW, Math.min(maxW, nw));
        const nh = nw / aspect;
        // Zoom around the cursor: keep the cursor at the same relative point
        const ux = (pos.x - fr.x) / fr.w;
        const uy = (pos.y - fr.y) / fr.h;
        const nx = pos.x - ux * nw;
        const ny = pos.y - uy * nh;
        this._commitFrameAtTime({ x: nx, y: ny, w: nw, h: nh });
    }

    _onKeyDown(e) {
        if (!this._editMode) return;
        if (e.key === 'Escape') { e.preventDefault(); this.cancel(); }
        else if (e.key === 'Enter' && !e.target.matches('input, textarea, select')) {
            e.preventDefault(); this.exit(true);
        }
    }

    // ───────── Overlay rendering ─────────

    _renderOverlay(ctx) {
        if (!this._editMode || this._cameraPreview) return;
        const fr = this._previewFrame || this._currentEditFrame();
        const sw = this.stage.width;
        const sh = this.stage.height;
        const zoom = Math.max(0.001, this.stage.zoom);

        ctx.save();

        // Dim region outside the frame using even-odd fill so we get a hole
        ctx.beginPath();
        ctx.rect(0, 0, sw, sh);
        ctx.rect(fr.x, fr.y, fr.w, fr.h);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
        ctx.fill('evenodd');

        // Frame border
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 2 / zoom;
        ctx.setLineDash([8 / zoom, 4 / zoom]);
        ctx.strokeRect(fr.x, fr.y, fr.w, fr.h);
        ctx.setLineDash([]);

        // Rule-of-thirds guides inside the frame
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.35)';
        ctx.lineWidth = 1 / zoom;
        for (let i = 1; i < 3; i++) {
            const x = fr.x + (fr.w * i) / 3;
            const y = fr.y + (fr.h * i) / 3;
            ctx.beginPath(); ctx.moveTo(x, fr.y); ctx.lineTo(x, fr.y + fr.h); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(fr.x, y); ctx.lineTo(fr.x + fr.w, y); ctx.stroke();
        }

        // Corner handles
        const hSize = 10 / zoom;
        const corners = [
            { x: fr.x,        y: fr.y        },
            { x: fr.x + fr.w, y: fr.y        },
            { x: fr.x,        y: fr.y + fr.h },
            { x: fr.x + fr.w, y: fr.y + fr.h }
        ];
        ctx.fillStyle = '#22d3ee';
        ctx.strokeStyle = '#0e7490';
        ctx.lineWidth = 1.5 / zoom;
        corners.forEach(c => {
            ctx.beginPath();
            ctx.arc(c.x, c.y, hSize / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        });

        // Center handle — scale-from-center
        const cHx = fr.x + fr.w / 2;
        const cHy = fr.y + fr.h / 2;
        const cR = 12 / zoom;
        ctx.fillStyle = 'rgba(34, 211, 238, 0.95)';
        ctx.strokeStyle = '#0e7490';
        ctx.lineWidth = 2 / zoom;
        ctx.beginPath();
        ctx.arc(cHx, cHy, cR, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Four-arrow scale glyph
        ctx.strokeStyle = '#0b1116';
        ctx.lineWidth = 1.6 / zoom;
        const a = cR * 0.55;
        const arrow = (x1, y1, x2, y2, hx1, hy1, hx2, hy2) => {
            ctx.beginPath();
            ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
            ctx.moveTo(x2, y2); ctx.lineTo(hx1, hy1);
            ctx.moveTo(x2, y2); ctx.lineTo(hx2, hy2);
            ctx.stroke();
        };
        const t = a * 0.4;
        // diagonal arrows in 4 directions to convey scale-from-center
        arrow(cHx, cHy, cHx + a, cHy + a, cHx + a - t, cHy + a, cHx + a, cHy + a - t);
        arrow(cHx, cHy, cHx - a, cHy - a, cHx - a + t, cHy - a, cHx - a, cHy - a + t);
        arrow(cHx, cHy, cHx + a, cHy - a, cHx + a - t, cHy - a, cHx + a, cHy - a + t);
        arrow(cHx, cHy, cHx - a, cHy + a, cHx - a + t, cHy + a, cHx - a, cHy + a - t);

        // Path through keyframe centers (so user sees the camera move)
        const kfs = [...this.stage.cameraKeyframes].sort((a, b) => a.time - b.time);
        if (kfs.length >= 2) {
            ctx.strokeStyle = 'rgba(250, 204, 21, 0.85)';
            ctx.lineWidth = 1.5 / zoom;
            ctx.setLineDash([6 / zoom, 4 / zoom]);
            ctx.beginPath();
            kfs.forEach((kf, i) => {
                const cx = kf.x + kf.w / 2;
                const cy = kf.y + kf.h / 2;
                if (i === 0) ctx.moveTo(cx, cy); else ctx.lineTo(cx, cy);
            });
            ctx.stroke();
            ctx.setLineDash([]);
        }
        kfs.forEach((kf, i) => {
            const cx = kf.x + kf.w / 2;
            const cy = kf.y + kf.h / 2;
            ctx.beginPath();
            ctx.arc(cx, cy, 6 / zoom, 0, Math.PI * 2);
            ctx.fillStyle = '#facc15';
            ctx.fill();
            ctx.strokeStyle = '#78350f';
            ctx.lineWidth = 1 / zoom;
            ctx.stroke();
            // Label
            ctx.fillStyle = '#facc15';
            ctx.font = `${11 / zoom}px Inter, sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(`${i + 1}`, cx, cy - 9 / zoom);
        });

        // Top-left badge
        ctx.fillStyle = 'rgba(34, 211, 238, 0.9)';
        ctx.font = `${12 / zoom}px Inter, sans-serif`;
        ctx.textAlign = 'left';
        ctx.fillText(
            `Camera ${Math.round((this.stage.width / fr.w) * 100)}%  ·  ${Math.round(fr.x)}, ${Math.round(fr.y)}`,
            fr.x + 6 / zoom, fr.y - 8 / zoom
        );

        ctx.restore();
    }

    // ───────── Floating panel UI ─────────

    _buildPanel() {
        this._panelEl?.remove();
        const panel = document.createElement('div');
        panel.className = 'stage-camera-panel';
        panel.innerHTML = `
            <div class="sc-header" data-drag-handle>
                <span><i class="fas fa-video"></i> Animate Stage Camera</span>
                <button class="sc-close" title="Cancel"><i class="fas fa-times"></i></button>
            </div>
            <div class="sc-body">
                <div class="sc-hint">Drag the frame to <b>pan</b>, drag corners to <b>zoom</b>. Scrub the timeline (or use ◀ ▶) to a different time before each <b>Add Keyframe</b>.</div>
                <div class="sc-time-row">
                    <button class="sc-btn sc-step" data-act="step-back" title="Back 1s">◀ 1s</button>
                    <div class="sc-time-display">
                        <span class="sc-time-label">Time</span>
                        <span class="sc-time-value" data-cur-time>0.00s</span>
                    </div>
                    <button class="sc-btn sc-step" data-act="step-fwd" title="Forward 1s">1s ▶</button>
                </div>
                <div class="sc-row">
                    <button class="sc-btn sc-btn-primary" data-act="add-kf"><i class="fas fa-plus"></i> Add Keyframe</button>
                    <button class="sc-btn" data-act="new-section" title="Start a separate manual camera section at the playhead"><i class="fas fa-film"></i> New Section</button>
                    <button class="sc-btn" data-act="reset" title="Reset frame to full stage at current time"><i class="fas fa-expand"></i> Fill</button>
                </div>
                <div class="sc-row">
                    <label class="sc-easing">
                        <span>Default easing</span>
                        <select data-act="easing">
                            <option value="linear">Linear</option>
                            <option value="easeIn">Ease In</option>
                            <option value="easeOut">Ease Out</option>
                            <option value="easeInOut" selected>Ease In Out</option>
                        </select>
                    </label>
                </div>
                <div class="sc-keyframes" data-kf-list></div>
                <div class="sc-row sc-row-foot">
                    <button class="sc-btn sc-btn-danger" data-act="clear"><i class="fas fa-trash"></i> Clear All</button>
                    <button class="sc-btn sc-btn-preview" data-act="preview"><i class="fas fa-play"></i> Preview</button>
                </div>
                <div class="sc-row sc-row-cta">
                    <button class="sc-btn" data-act="cancel">Cancel</button>
                    <button class="sc-btn sc-btn-apply" data-act="apply"><i class="fas fa-check"></i> Apply</button>
                </div>
            </div>
        `;
        document.body.appendChild(panel);
        this._panelEl = panel;
        this._makePanelDraggable(panel);

        panel.querySelector('.sc-close')?.addEventListener('click', () => this.cancel());
        panel.querySelector('[data-act="add-kf"]')?.addEventListener('click', () => this.addKeyframeAtCurrentTime());
        panel.querySelector('[data-act="new-section"]')?.addEventListener('click', () => this._startManualCameraSection());
        panel.querySelector('[data-act="reset"]')?.addEventListener('click', () => this.resetCurrentFrame());
        panel.querySelector('[data-act="step-back"]')?.addEventListener('click', () => this.stepTime(-1000));
        panel.querySelector('[data-act="step-fwd"]')?.addEventListener('click', () => this.stepTime(1000));
        // Live-update time display
        this._timeDisplayHandler = () => this._updateTimeDisplay();
        eventBus.on('timeline:time', this._timeDisplayHandler);
        eventBus.on('timeline:scrub', this._timeDisplayHandler);
        panel.querySelector('[data-act="clear"]')?.addEventListener('click', async () => {
            const ok = (typeof Utils !== 'undefined' && Utils.showConfirm)
                ? await Utils.showConfirm('Delete all camera keyframes?')
                : confirm('Delete all camera keyframes?');
            if (ok) this.clearKeyframes();
        });
        panel.querySelector('[data-act="preview"]')?.addEventListener('click', () => {
            if (this.animations?.isPlaying) this.animations.pause?.();
            else {if(this._commitCharacterShotDraft?.()===false)return;this._cameraPreview=true;this.animations?.playAll?.(false);}
        });
        panel.querySelector('[data-act="cancel"]')?.addEventListener('click', () => this.cancel());
        panel.querySelector('[data-act="apply"]')?.addEventListener('click', () => {
            if(this._shotBusy)return;
            if(this.animations.isPlaying)this.animations.pause?.();
            if(this._commitCharacterShotDraft?.()!==false)this.exit(true);
        });
        panel.querySelector('[data-act="easing"]')?.addEventListener('change', (e) => {
            this._defaultEasing = e.target.value;
        });

        this._mountCharacterShotTools(panel);

        this._refreshPanel();
        this._updateTimeDisplay();
    }

    _refreshPanel() {
        if (!this._panelEl) return;
        this._refreshCharacterShotList?.();
        const list = this._panelEl.querySelector('[data-kf-list]');
        if (!list) return;
        const kfs = this.stage.cameraKeyframes.filter(frame=>!frame.choreographyId&&!frame.characterCameraId).sort((a, b) => a.time - b.time);
        if (!kfs.length) {
            list.innerHTML = '<div class="sc-empty">No keyframes yet. Adjust the frame and click <b>Add Keyframe</b>.</div>';
            // Notify timeline to clear any markers
            eventBus.emit?.('camera:keyframes-changed');
            return;
        }
        list.innerHTML = kfs.map((kf, i) => {
            const realIdx = this.stage.cameraKeyframes.indexOf(kf);
            const zoomPct = Math.round((this.stage.width / Math.max(1, kf.w)) * 100);
            return `
                <div class="sc-kf-row" data-idx="${realIdx}">
                    <span class="sc-kf-num">${i + 1}</span>
                    <input class="sc-kf-time-input" type="number" step="0.05" min="0" value="${(kf.time / 1000).toFixed(2)}" title="Click to edit time (seconds)" />
                    <span class="sc-kf-zoom">${zoomPct}%</span>
                    <button class="sc-kf-goto" title="Go to this time"><i class="fas fa-crosshairs"></i></button>
                    <button class="sc-kf-del" title="Delete"><i class="fas fa-times"></i></button>
                </div>
            `;
        }).join('');
        list.querySelectorAll('.sc-kf-goto').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const row = e.currentTarget.closest('.sc-kf-row');
                const idx = parseInt(row.dataset.idx, 10);
                const kf = this.stage.cameraKeyframes[idx];
                if (kf && this.animations) {
                    if(!kf.choreographyId)this._manualSectionId=kf.manualCameraSectionId || null;
                    this.animations.currentTime = kf.time;
                    eventBus.emit?.('timeline:scrub', kf.time);
                    eventBus.emit?.('timeline:time', kf.time);
                    this.stage.requestRender();
                    this._refreshPanel();
                }
            });
        });
        list.querySelectorAll('.sc-kf-del').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const row = e.currentTarget.closest('.sc-kf-row');
                const idx = parseInt(row.dataset.idx, 10);
                this.deleteKeyframe(idx);
            });
        });
        list.querySelectorAll('.sc-kf-time-input').forEach(input => {
            const commit = (e) => {
                const row = e.currentTarget.closest('.sc-kf-row');
                const idx = parseInt(row.dataset.idx, 10);
                const kf = this.stage.cameraKeyframes[idx];
                if (!kf) return;
                if(kf.choreographyId || kf.characterCameraId){Utils.showToast('Move this generated shot through its camera or choreography controls.','warning');this._refreshPanel();return;}
                const v = parseFloat(e.currentTarget.value);
                if (isNaN(v) || v < 0) { this._refreshPanel(); return; }
                if(!this._manualCameraTimeAllowed(Math.round(v*1000),kf)){this._refreshPanel();return;}
                kf.time = Math.round(v * 1000);
                this.stage.cameraKeyframes.sort((a, b) => a.time - b.time);
                eventBus.emit?.('camera:keyframes-changed');
                this.stage.requestRender();
                this._refreshPanel();
            };
            input.addEventListener('change', commit);
            input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } });
        });
        // Notify timeline that keyframes changed (so ruler markers refresh)
        eventBus.emit?.('camera:keyframes-changed');
    }

    _mountCharacterShotTools(panel) {
        const body=panel.querySelector('.sc-body'),tabs=document.createElement('div'),host=document.createElement('div');tabs.className='sc-tabs';tabs.setAttribute('role','tablist');host.className='sc-shot-tools';
        const manual=[...body.children].filter(el=>!el.classList.contains('sc-row-foot')&&!el.classList.contains('sc-row-cta'));
        body.prepend(tabs,host);
        for(const [value,label] of [['manual','Manual keyframes'],['characters','Character shots']]){const button=document.createElement('button');button.className='sc-btn';button.type='button';button.textContent=label;button.setAttribute('role','tab');button.dataset.cameraTab=value;button.onclick=()=>{this._cameraTab=value;for(const tab of tabs.children)tab.setAttribute('aria-selected',String(tab===button));manual.forEach(el=>el.hidden=value!=='manual');host.hidden=value!=='characters';};tabs.append(button);}
        const restored=this._preferredCharacterShot();
        tabs.querySelector(`[data-camera-tab="${restored?'characters':this._cameraTab || 'manual'}"]`).click();
        let draft=restored?Utils.deepClone(restored.characterCameraRecipe):this._newCharacterShot(),id=restored?.characterCameraId || null;
        let cleanDraft=JSON.stringify(draft);
        const choose=document.createElement('select');choose.setAttribute('aria-label','Saved character camera shots');host.append(choose);
        const status=document.createElement('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
        const fields=document.createElement('div');fields.className='sc-shot-fields';host.append(fields);
        const refreshChoices=()=>{choose.replaceChildren(new Option('New character shot',''));for(const entry of this._characterShotEntries())choose.append(new Option(`${entry.characterCameraRecipe.name || 'Character shot'}${entry.characterCameraNeedsRefresh?' (refresh needed)':''}`,entry.characterCameraId));choose.value=id || '';};
        const field=(parent,label,input)=>{const el=document.createElement('label');el.append(document.createTextNode(label),input);parent.append(el);return input;};
        const markEdited=()=>{const dirty=JSON.stringify(draft)!==cleanDraft;save.dataset.dirty=String(dirty);if(dirty)status.textContent='Unsaved shot changes.';else if(status.textContent==='Unsaved shot changes.')status.textContent='';};
        const numeric=(parent,key,label,min,max,step=.1)=>{const input=document.createElement('input');input.type='number';input.min=min;input.max=max;input.step=step;input.value=draft[key];input.dataset.shotField=key;field(parent,label,input);input.oninput=input.onchange=()=>{draft[key]=input.valueAsNumber;markEdited();};};
        const select=(parent,key,label,options)=>{const input=document.createElement('select');for(const [value,text]of options)input.append(new Option(text,value));input.value=draft[key];input.dataset.shotField=key;field(parent,label,input).onchange=()=>{draft[key]=input.value;render();};};
        const check=(parent,key,label)=>{const input=document.createElement('input');input.type='checkbox';input.checked=!!draft[key];input.dataset.shotField=key;field(parent,label,input).onchange=()=>{draft[key]=input.checked;render();};};
        const render=()=>{
            fields.replaceChildren();const name=document.createElement('input');name.value=draft.name;name.maxLength=100;name.dataset.shotField='name';field(fields,'Shot name',name).oninput=()=>{draft.name=name.value;markEdited();};
            const fitted=this._fitCharacterShotRoute(draft),fitsRoute=fitted!==draft;draft=fitted;
            numeric(fields,'start','Start (s)',0,86400);numeric(fields,'duration','Duration (s)',.05,3600,.05);
            check(fields,'fitRouteDuration','Fit route duration');
            if(fitsRoute){fields.querySelector('[data-shot-field="start"]').disabled=true;fields.querySelector('[data-shot-field="duration"]').disabled=true;}
            select(fields,'mode','Shot',[['selected','Selected characters'],['speaker','Follow linked speakers'],['coverage','Group, speaker and listener'],['full','Full stage']]);
            numeric(fields,'blend','Transition (s)',.05,10,.05);
            if(draft.mode!=='full'){
                const subjects=document.createElement('fieldset'),legend=document.createElement('legend');legend.textContent='Characters';subjects.append(legend);subjects.className='sc-shot-subjects';fields.append(subjects);
                const characters=window.app.audioTimeline?._getAvailableCharacters?.() || [];
                for(const [index,actor]of characters.entries()){const input=document.createElement('input');input.type='checkbox';input.checked=draft.subjects.includes(actor.id);const label=/^(torso|body)$/i.test(actor.name)?`Universal character ${index+1}`:actor.name;field(subjects,label,input).onchange=()=>{draft.subjects=input.checked?[...draft.subjects,actor.id]:draft.subjects.filter(value=>value!==actor.id);render();};}
                if(draft.subjects.some(rootId=>!characters.some(actor=>actor.id===rootId)))status.textContent='A selected character is missing. Select the remaining characters again.';
                select(fields,'framing','Framing',[['full-body','Full body'],['waist-up','Waist up'],['close-up','Close up']]);numeric(fields,'padding','Margin (%)',0,100,5);check(fields,'tracking','Track movement');
                const composition=document.createElement('details'),summary=document.createElement('summary'),group=document.createElement('div');summary.textContent='Composition';group.className='sc-shot-fields';composition.append(summary,group);fields.append(composition);
                numeric(group,'headroom','Headroom (%)',0,35,5);numeric(group,'offset','Horizontal offset (%)',-35,35,5);
                if(draft.tracking){numeric(group,'lookAhead','Travel look ahead (s)',0,1.5);numeric(group,'smoothing','Tracking smoothness (s)',0,1.5,.05);check(group,'adaptiveZoom','Adaptive zoom');if(draft.adaptiveZoom){numeric(group,'minZoom','Minimum zoom (x)',.05,10,.05);numeric(group,'maxZoom','Maximum zoom (x)',.1,20);numeric(group,'zoomSpeed','Zoom change rate',.05,2,.05);}}
            }
            save.textContent=id?'Update shot':'Add shot';remove.disabled=!id;markEdited();
            if(id)this._lastCharacterShotId=id;
        };
        const actions=document.createElement('div');actions.className='sc-row';const save=document.createElement('button'),remove=document.createElement('button');save.className='sc-btn sc-btn-primary';save.dataset.saveCharacterShot='';remove.className='sc-btn';remove.innerHTML='<i class="fas fa-trash"></i>';remove.title='Delete selected character shot';remove.setAttribute('aria-label',remove.title);actions.append(save,remove);host.append(actions,status);
        choose.onchange=()=>{id=choose.value || null;const entry=this._characterShotEntries().find(entry=>entry.characterCameraId===id);draft=entry?Utils.deepClone(entry.characterCameraRecipe):this._newCharacterShot();cleanDraft=JSON.stringify(draft);status.textContent=entry?.characterCameraNeedsRefresh?'Update shot to rebuild its framing.':'';render();};
        this._commitCharacterShotDraft=()=>{
            if(JSON.stringify(draft)===cleanDraft)return true;
            try{id=this._saveCharacterShot(draft,id);cleanDraft=JSON.stringify(draft);refreshChoices();render();status.textContent='Camera shot updated.';return true;}
            catch(error){status.textContent=error.message;return false;}
        };
        save.onclick=async()=>{
            if(this._shotBusy)return;this._shotBusy=true;body.inert=true;status.textContent='Preparing camera shot...';
            try{await new Promise(resolve=>requestAnimationFrame(resolve));id=this._saveCharacterShot(draft,id);cleanDraft=JSON.stringify(draft);refreshChoices();render();status.textContent='Shot ready. Apply saves the camera changes.';}
            catch(error){status.textContent=error.message;}finally{this._shotBusy=false;body.inert=false;}
        };
        remove.onclick=()=>{if(!id)return;this.stage.cameraKeyframes=this.stage.cameraKeyframes.filter(frame=>frame.characterCameraId!==id);id=null;draft=this._newCharacterShot();cleanDraft=JSON.stringify(draft);refreshChoices();render();this._refreshPanel();this.stage.requestRender();status.textContent='Shot removed. Apply saves the change.';};
        this._refreshCharacterShotList=()=>{if(id&&!this._characterShotEntries().some(entry=>entry.characterCameraId===id)){id=null;draft=this._newCharacterShot();cleanDraft=JSON.stringify(draft);}refreshChoices();render();};
        refreshChoices();render();
    }

    _makePanelDraggable(panel) {
        const handle = panel.querySelector('[data-drag-handle]');
        if (!handle) return;
        let dragging = false, sx = 0, sy = 0, ox = 0, oy = 0;
        // Default position: top-right
        requestAnimationFrame(() => {
            const r = panel.getBoundingClientRect();
            panel.style.left = (window.innerWidth - r.width - 24) + 'px';
            panel.style.top = '88px';
            panel.style.right = 'auto';
            panel.style.bottom = 'auto';
        });
        handle.addEventListener('mousedown', (e) => {
            if (e.target.closest('button')) return;
            dragging = true;
            sx = e.clientX; sy = e.clientY;
            const r = panel.getBoundingClientRect();
            ox = r.left; oy = r.top;
            e.preventDefault();
        });
        window.addEventListener('mousemove', (e) => {
            if (!dragging) return;
            panel.style.left = (ox + e.clientX - sx) + 'px';
            panel.style.top = (oy + e.clientY - sy) + 'px';
        });
        window.addEventListener('mouseup', () => { dragging = false; });
    }
}

if (typeof window !== 'undefined') {
    window.StageCameraManager = StageCameraManager;

    // Inject panel CSS once
    if (!document.getElementById('stage-camera-styles')) {
        const css = document.createElement('style');
        css.id = 'stage-camera-styles';
        css.textContent = `
        .stage-camera-panel{position:fixed;z-index:20050;width:min(340px,calc(100vw - 24px));background:#1e1e2e;border:1px solid #444;border-radius:8px;box-shadow:0 12px 40px rgba(0,0,0,.5);color:#e0e0e0;font-size:12px;animation:fadeSlideIn .2s ease;display:flex;flex-direction:column;max-height:calc(100dvh - 100px)}
        .stage-camera-panel .sc-header{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;font-size:13px;font-weight:600;color:#22d3ee;cursor:grab;border-bottom:1px solid #333;-webkit-user-select:none;user-select:none}
        .stage-camera-panel .sc-header:active{cursor:grabbing}
        .stage-camera-panel .sc-header i.fa-video{margin-right:6px}
        .stage-camera-panel .sc-close{background:transparent;border:none;color:#888;cursor:pointer;padding:2px 6px;border-radius:3px;font-size:12px}
        .stage-camera-panel .sc-close:hover{color:#fff;background:#333}
        .stage-camera-panel .sc-body{padding:10px 12px;display:flex;flex-direction:column;gap:8px;overflow:auto}
        .stage-camera-panel .sc-hint{font-size:11px;color:#9ca3af;line-height:1.4;background:rgba(34,211,238,.07);border:1px solid rgba(34,211,238,.18);border-radius:6px;padding:7px 9px}
        .stage-camera-panel .sc-row{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
        .stage-camera-panel [hidden]{display:none!important}
        .stage-camera-panel .sc-tabs{display:flex;gap:4px}
        .stage-camera-panel .sc-tabs [aria-selected="true"]{border-color:#0e7490;background:#d4eee9;color:#134b43}
        .stage-camera-panel .sc-shot-tools{display:grid;gap:10px;min-width:0}
        .stage-camera-panel .sc-shot-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
        .stage-camera-panel .sc-shot-fields label{display:flex;flex-direction:column;gap:4px;min-width:0;overflow-wrap:anywhere}
        .stage-camera-panel .sc-shot-fields>label:first-child,.stage-camera-panel .sc-shot-fields>details,.stage-camera-panel .sc-shot-subjects{grid-column:1/-1}
        .stage-camera-panel .sc-shot-fields>label:has([data-shot-field="mode"]){grid-column:1/-1}
        .stage-camera-panel .sc-shot-tools input:not([type="checkbox"]),.stage-camera-panel .sc-shot-tools select{width:100%;min-width:0;box-sizing:border-box;padding:5px;border:1px solid #879ac4;border-radius:4px;background:var(--bg-secondary,#f8f8fa);color:var(--text-primary,#222)}
        .stage-camera-panel .sc-shot-subjects{display:grid;gap:6px;max-height:160px;overflow:auto;min-width:0;border:1px solid #879ac4;border-radius:4px}
        .stage-camera-panel .sc-shot-subjects label{flex-direction:row;align-items:center;justify-content:space-between}
        .stage-camera-panel .sc-shot-tools input[type="checkbox"]{width:16px;height:16px;flex:0 0 16px}
        .stage-camera-panel .sc-shot-tools [role="status"]{margin:0;overflow-wrap:anywhere}
        .stage-camera-panel .sc-row-foot{margin-top:4px;border-top:1px solid #2a2a3c;padding-top:8px}
        .stage-camera-panel .sc-row-cta{margin-top:4px;justify-content:flex-end}
        .stage-camera-panel .sc-time-row{display:flex;gap:6px;align-items:stretch;background:#16161f;border:1px solid #2a2a3c;border-radius:6px;padding:4px}
        .stage-camera-panel .sc-step{flex:0 0 auto;min-width:50px;font-weight:600;font-size:11px;background:#2a2a3c;border-color:#3a3a4c}
        .stage-camera-panel .sc-step:hover{background:#0e7490;border-color:#22d3ee;color:#ecfeff}
        .stage-camera-panel .sc-time-display{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2px 8px}
        .stage-camera-panel .sc-time-label{font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:#6b7280}
        .stage-camera-panel .sc-time-value{font-family:monospace;font-size:18px;font-weight:700;color:#22d3ee;line-height:1.1}
        .stage-camera-panel .sc-btn{flex:1;background:#2a2a3c;border:1px solid #3a3a4c;color:#e0e0e0;font-size:11px;padding:7px 10px;border-radius:6px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:5px;transition:background .12s,border-color .12s}
        .stage-camera-panel .sc-btn:hover{background:#3a3a4c;border-color:#4a4a5c}
        .stage-camera-panel .sc-btn-primary{background:#0e7490;border-color:#22d3ee;color:#ecfeff}
        .stage-camera-panel .sc-btn-primary:hover{background:#155e75}
        .stage-camera-panel .sc-btn-apply{background:#059669;border-color:#10b981;color:#ecfdf5;flex:0 0 auto;padding:7px 14px}
        .stage-camera-panel .sc-btn-apply:hover{background:#047857}
        .stage-camera-panel .sc-btn-danger{color:#fca5a5}
        .stage-camera-panel .sc-btn-danger:hover{background:#7f1d1d;border-color:#ef4444;color:#fff}
        .stage-camera-panel .sc-btn-preview{color:#facc15}
        .stage-camera-panel .sc-row-cta .sc-btn{flex:0 0 auto;padding:7px 14px}
        .stage-camera-panel .sc-easing{display:flex;justify-content:space-between;align-items:center;gap:8px;width:100%;font-size:11px;color:#9ca3af}
        .stage-camera-panel .sc-easing select{background:#2a2a3c;border:1px solid #3a3a4c;color:#e0e0e0;font-size:11px;padding:4px 6px;border-radius:4px}
        .stage-camera-panel .sc-keyframes{max-height:200px;overflow:auto;border:1px solid #2a2a3c;border-radius:6px;background:#16161f}
        .stage-camera-panel .sc-empty{padding:14px;text-align:center;font-size:11px;color:#6b7280}
        .stage-camera-panel .sc-kf-row{display:grid;grid-template-columns:24px 1fr 60px 28px 28px;gap:6px;align-items:center;padding:6px 8px;border-bottom:1px solid #232333;font-size:11px}
        .stage-camera-panel .sc-kf-time-input{background:#16161f;border:1px solid #2a2a3c;color:#e5e7eb;padding:3px 6px;border-radius:4px;font-family:monospace;font-size:11px;width:100%;text-align:center}
        .stage-camera-panel .sc-kf-time-input:focus{outline:none;border-color:#22d3ee;background:#1a1a26}
        body.light-mode .stage-camera-panel .sc-kf-time-input{background:#fff;border-color:#d1d5db;color:#111827}
        .stage-camera-panel .sc-kf-row:last-child{border-bottom:none}
        .stage-camera-panel .sc-kf-row:hover{background:#1d1d2a}
        .stage-camera-panel .sc-kf-num{display:inline-flex;width:20px;height:20px;align-items:center;justify-content:center;background:#facc15;color:#78350f;border-radius:50%;font-weight:700;font-size:10px}
        .stage-camera-panel .sc-kf-time{color:#22d3ee;font-family:monospace}
        .stage-camera-panel .sc-kf-zoom{color:#9ca3af;text-align:right;font-family:monospace}
        .stage-camera-panel .sc-kf-goto,.stage-camera-panel .sc-kf-del{background:transparent;border:none;color:#9ca3af;cursor:pointer;padding:3px;border-radius:3px;font-size:10px}
        .stage-camera-panel .sc-kf-goto:hover{color:#22d3ee;background:#1f2a37}
        .stage-camera-panel .sc-kf-del:hover{color:#ef4444;background:#3b1d1d}
        #btn-animate-stage-camera.active{background:#0e7490 !important;color:#ecfeff !important}
        body.light-mode .stage-camera-panel{background:#f8f8fa;border-color:#ddd;color:#333;box-shadow:0 12px 40px rgba(0,0,0,.15)}
        body.light-mode .stage-camera-panel .sc-header{color:#0e7490;border-bottom-color:#e0e0e0}
        body.light-mode .stage-camera-panel .sc-btn{background:#fff;border-color:#d0d0d8;color:#333}
        body.light-mode .stage-camera-panel .sc-btn:hover{background:#eef2f7;border-color:#bcc1cc}
        body.light-mode .stage-camera-panel .sc-keyframes{background:#fff;border-color:#e2e2ea}
        body.light-mode .stage-camera-panel .sc-kf-row{border-bottom-color:#eef0f3}
        body.light-mode .stage-camera-panel .sc-kf-row:hover{background:#f3f4f6}
        body.light-mode .stage-camera-panel .sc-easing select{background:#fff;border-color:#d0d0d8;color:#333}
        body.light-mode .stage-camera-panel .sc-hint{background:rgba(14,116,144,.06);border-color:rgba(14,116,144,.2);color:#475569}
        `;
        document.head.appendChild(css);
    }
}
