/* Experimental front/side transitions. View states keep physical object IDs stable. */
globalThis.ArmatureViewState = {
    preload: function preloadArmatureViewAssets(animations, load, prepare) {
        const seen = new Set();
        const imageSources = new Set();
        const loadImage = function(src) {
            if (!src || imageSources.has(src)) return;
            imageSources.add(src);
            const image = load(src);
            if (!image || !prepare) return;
            if (image.complete && image.naturalWidth) prepare(image);
            else image.addEventListener('load', function() { prepare(image); }, { once: true });
        };
        (animations || []).forEach(function(anim) {
            (anim.keyframes || anim.generated?.keyframes || []).forEach(function(frame) {
                const value = frame.values?.armatureViewState;
                if (!value || seen.has(value)) return;
                seen.add(value);
                try {
                    const props = JSON.parse(value).props;
                    if (props?.imageSrc) loadImage(props.imageSrc);
                    if (props?.textureImageSrc) loadImage(props.textureImageSrc);
                } catch (_) { /* Invalid states are ignored by the property setter too. */ }
            });
        });
    },

    warmImages(obj) {
        this.preload(obj.animations, src => {
            if (!(obj._crossViewImages instanceof Map)) obj._crossViewImages = new Map();
            if (obj._crossViewImages.has(src)) return;
            const image = new Image();
            image.onload = () => {
                this.prepareImage(image);
                obj._crossViewImages.set(src, image);
            };
            image.src = src;
        });
    },

    capture(obj, options = {}) {
        const excluded = new Set(['id', 'animations', 'armatureViewState', 'activityKitSettings', 'groupId', 'characterStackId',
            'characterStackOrder', 'svgCharacterInstanceId', 'ucCharacterFamilyId', 'ucCharacterLinkedViews']);
        const props = {};
        Object.entries(obj.toJSON()).forEach(([key, value]) => {
            if (excluded.has(key) || value === undefined) return;
            const actual = key === 'facialDrawContext' ? '_facialDrawCtx'
                : Object.prototype.hasOwnProperty.call(obj, '_' + key) ? '_' + key : key;
            props[actual] = value;
        });
        for (const key of ['_armatureVisualFacingSide', '_armatureVisualBaseFacingSide', '_armatureDrawLayer',
            '_ucCharacterVariantKey',
            '_armatureAttachmentPin',
            '_armatureFrontBackFacing', '_armatureFront3qLean', '_armatureFacingSide', '_armatureFacingExplicit',
            'pinTargetType', 'pinJointId', 'pinJointName', 'pinBaseTiltX', 'pinBaseTiltY', '_pinInheritParentJointName']) {
            props[key] = obj[key] ?? null;
        }
        const reuseRealisticArtwork = options.reuseRealisticArtwork === true && !!props._svgCharacterConfig?._realisticCharacter;
        if (reuseRealisticArtwork) {
            props._svgCharacterConfig = { ...props._svgCharacterConfig };
            delete props._svgCharacterConfig._realisticCharacter;
        }
        return JSON.stringify({ version: 1, props, ...(reuseRealisticArtwork ? { reuseRealisticArtwork: true } : {}) });
    },

    // Self-contained helpers are also embedded in standalone preview/export.
    interpolate: function interpolateArmatureViewState(from, to, progress) {
        if (from === to || progress <= 0) return from;
        if (progress >= 1) return to;
        let a, b;
        try { a = JSON.parse(from); b = JSON.parse(to); } catch (_) { return progress < .5 ? from : to; }
        if (a?.version !== 1 || b?.version !== 1 || !a.props || !b.props) return progress < .5 ? from : to;
        // New two-part turns ease only at the outer ends, without pausing at three-quarter.
        const t = a.quickPivot && a.smoothTurnCount > 1 ? (a.smoothTurnIndex === 0 ? progress ** 3
            : a.smoothTurnIndex === a.smoothTurnCount - 1 ? 1 - (1 - progress) ** 3 : progress)
            : a.smoothTurnCount > 1 ? (a.smoothTurnIndex === 0 ? 2 * progress ** 2 - progress ** 3
            : a.smoothTurnIndex === a.smoothTurnCount - 1 ? progress + progress ** 2 - progress ** 3 : progress)
            : a.motionSegment ? progress : a.turnSegment === 0 ? 1.5 * progress * progress - .5 * progress ** 3
            : a.turnSegment === 1 ? 1.5 * progress - .5 * progress ** 3
            : progress * progress * (3 - 2 * progress);
        const left = a.props, right = b.props;
        const props = { ...(t < .5 ? left : right) };
        const mix = (x, y) => x + (y - x) * t;
        const angle = (x, y) => x + (((y - x + 180) % 360 + 360) % 360 - 180) * t;
        for (const key of ['x', 'y', 'width', 'height', 'pivotX', 'pivotY', 'tiltX', 'tiltY',
            'pinOffsetX', 'pinOffsetY', 'pinAnchorX', 'pinAnchorY', 'imageZoom', 'imagePanX', 'imagePanY',
            'armatureSeatDepth', 'armatureSeatLean', 'armatureKneelDepth']) {
            if (Number.isFinite(left[key]) && Number.isFinite(right[key])) props[key] = mix(left[key], right[key]);
        }
        for (const key of ['rotation', 'jointBaseAngle']) {
            if (Number.isFinite(left[key]) && Number.isFinite(right[key])) props[key] = angle(left[key], right[key]);
        }
        if (a.resizeSegment) {
            for (const key of ['fontSize', 'strokeWidth', 'outlineWidth', 'borderRadius', 'shadowBlur', 'shadowOffsetX', 'shadowOffsetY',
                'patternScale', 'textureScale', '_svgAfricanPremiumBaseScale', '_facialBasePinOffsetX', '_facialBasePinOffsetY']) {
                if (Number.isFinite(left[key]) && Number.isFinite(right[key])) props[key] = mix(left[key], right[key]);
            }
            if (left._facialLocalRect && right._facialLocalRect) {
                props._facialLocalRect = { ...left._facialLocalRect };
                for (const key of ['x', 'y', 'w', 'h']) if (Number.isFinite(left._facialLocalRect[key]) && Number.isFinite(right._facialLocalRect[key])) props._facialLocalRect[key] = mix(left._facialLocalRect[key], right._facialLocalRect[key]);
            }
        }
        for (const key of ['scaleX', 'scaleY']) {
            if (Number.isFinite(left[key]) && Number.isFinite(right[key])) {
                props[key] = Math.sign(props[key] || 1) * mix(Math.abs(left[key]), Math.abs(right[key]));
            }
        }
        if (Array.isArray(left.joints) && Array.isArray(right.joints)) {
            props.joints = props.joints.map((joint, index) => {
                const role = (t < .5 ? a.jointRoles : b.jointRoles)?.[index];
                const source = role ? left.joints[a.jointRoles?.indexOf(role)] : left.joints.find(j => j.name === joint.name) || left.joints[index];
                const target = role ? right.joints[b.jointRoles?.indexOf(role)] : right.joints.find(j => j.name === joint.name) || right.joints[index];
                if (!source || !target) return joint;
                const result = { ...joint };
                for (const key of ['position', 'angle', 'tiltX', 'tiltY', 'crossOffset']) {
                    if (Number.isFinite(source[key]) && Number.isFinite(target[key])) {
                        result[key] = key === 'angle' ? angle(source[key], target[key]) : mix(source[key], target[key]);
                    }
                }
                return result;
            });
        }
        props.visible = left.visible !== false || right.visible !== false;
        props.opacity = mix(left.visible === false ? 0 : (left.opacity ?? 1), right.visible === false ? 0 : (right.opacity ?? 1));
        // World geometry is already interpolated; pinning to either endpoint rig would snap it back.
        // Anticipate only the head artwork; its attachment geometry still follows the torso.
        const lead = a.smoothHeadLead ? .12 : a.smoothShoulderLead ? .055 : 0;
        const appearanceTime = Math.min(1, t + lead * Math.sin(Math.PI * t));
        const dissolve = Math.max(0, Math.min(1, (appearanceTime - .3) / .4));
        let blend = { from: left.imageSrc, to: right.imageSrc, weight: dissolve * dissolve * (3 - 2 * dissolve),
            fromFlipX: (left.scaleX < 0) !== (props.scaleX < 0), toFlipX: (right.scaleX < 0) !== (props.scaleX < 0) };
        if (a.sampledTurn && b.sampledTurn && a.blend && b.blend && a.blend.from === b.blend.from && a.blend.to === b.blend.to) {
            const flipped = (left.scaleX < 0) !== (props.scaleX < 0);
            blend = { ...a.blend, weight: mix(a.blend.weight, b.blend.weight),
                fromFlipX: !!a.blend.fromFlipX !== flipped, toFlipX: !!a.blend.toFlipX !== flipped };
        }
        const followTurnPin = a.followTurnPin === true && b.followTurnPin === true;
        return JSON.stringify({ version: 1, props, blend: followTurnPin ? null : blend, followTurnPin,
            reuseRealisticArtwork: (t < .5 ? a : b).reuseRealisticArtwork === true,
            sampledTurn: a.sampledTurn === true && b.sampledTurn === true, motionSegment: a.motionSegment === true });
    },

    prepareImage: function prepareArmatureViewImage(image) {
        if (image._crossViewRaster || !image.complete || !image.naturalWidth) return;
        const scale = Math.min(1, 2048 / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.ceil(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.ceil(image.naturalHeight * scale));
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        image._crossViewRaster = canvas;
    },

    blendImage: function blendArmatureViewImage(obj, resolveImage) {
        const blend = obj._crossViewBlend;
        if (!blend?.from || !blend.to || blend.from === blend.to) return null;
        const a = resolveImage(blend.from), b = resolveImage(blend.to);
        if (!a?.complete || !a.naturalWidth || !b?.complete || !b.naturalWidth) return null;
        if (blend.weight === 0 && !blend.fromFlipX) return a;
        if (blend.weight === 1 && !blend.toFlipX) return b;
        const width = Math.max(a.naturalWidth, b.naturalWidth);
        const height = Math.max(a.naturalHeight, b.naturalHeight);
        const scale = Math.min(1, 2048 / Math.max(width, height));
        let canvas = obj._crossViewBlendCanvas;
        if (!canvas) canvas = obj._crossViewBlendCanvas = document.createElement('canvas');
        const w = Math.max(1, Math.ceil(width * scale)), h = Math.max(1, Math.ceil(height * scale));
        const previous = obj._crossViewBlendDrawn;
        if (previous?.a === a && previous.b === b && previous.weight === blend.weight
            && previous.fromFlipX === blend.fromFlipX && previous.toFlipX === blend.toFlipX
            && canvas.width === w && canvas.height === h) return canvas;
        if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, w, h);
        // Weighted premultiplied pixels preserve opacity where both drawings overlap.
        ctx.globalCompositeOperation = 'lighter';
        const draw = (img, weight, flip) => {
            ctx.save(); ctx.globalAlpha = weight;
            if (flip) { ctx.translate(w, 0); ctx.scale(-1, 1); }
            ctx.drawImage(img, 0, 0, w, h); ctx.restore();
        };
        draw(a._crossViewRaster || a, 1 - blend.weight, blend.fromFlipX);
        draw(b._crossViewRaster || b, blend.weight, blend.toFlipX);
        ctx.globalCompositeOperation = 'source-over';
        obj._crossViewBlendDrawn = { a, b, weight: blend.weight, fromFlipX: blend.fromFlipX, toFlipX: blend.toFlipX };
        return canvas;
    },

    apply: function applyArmatureViewState(obj, value, metadataOnly) {
        if (!obj || typeof value !== 'string') return false;
        let state;
        try { state = JSON.parse(value); } catch (_) { return false; }
        if (state.version !== 1 || !state.props || typeof state.props !== 'object') return false;
        if (state.reuseRealisticArtwork) {
            const artwork = obj._svgCharacterConfig?._realisticCharacter || obj.svgCharacterConfig?._realisticCharacter;
            if (!artwork || !state.props._svgCharacterConfig) return false;
            state.props._svgCharacterConfig._realisticCharacter = artwork;
        }
        const headView = target => JSON.stringify([target._svgCharacterPremiumAssetId, target._svgAfricanPremiumAssetId,
            target._svgCharacterConfig?.assetCharacterId, target._svgCharacterConfig?.styling?.headArtwork,
            target._svgCharacterConfig?._independentHeadTurn, target._svgCharacterConfig?._headTurnConstruction]);
        const previousHeadView = headView(obj);
        const blocked = ['__proto__', 'constructor', 'prototype', 'id', 'animations', 'armatureViewState'];
        Object.keys(state.props).forEach(function(key) {
            if (blocked.includes(key)) return;
            if (metadataOnly && key[0] !== '_' && key !== 'bodyPartData') return;
            obj[key] = state.props[key];
            if (key[0] === '_') {
                const alias = key === '_facialDrawCtx' ? 'facialDrawContext' : key.slice(1);
                if (Object.prototype.hasOwnProperty.call(obj, alias)) obj[alias] = state.props[key];
            }
        });
        if (previousHeadView !== headView(obj)) {
            // A decoded face from the previous view must not replace the restored/next head.
            obj._svgAfricanFaceImageRequestId = (obj._svgAfricanFaceImageRequestId || 0) + 1;
            obj._svgAfricanFaceImageAppliedId = obj._svgAfricanFaceImageRequestId;
            obj._audioLipSyncImageElement = null;
        }
        if (!metadataOnly) {
            obj._crossViewBlend = state.blend || null;
            // A restored/destination view has its own sockets and joint IDs.
            // Never reuse the layout cached for the previous drawing or size.
            delete obj._armatureFrontViewLayout;
            Object.keys(obj).filter(function(key) { return /^joint(Angle|TiltX|TiltY|CrossOffset)_\d+$/.test(key); })
                .forEach(function(key) { delete obj[key]; });
        }
        obj.armatureViewState = value;
        obj._svgAfricanLastFaceRenderKey = null;
        obj._facialLastApplySignature = null;
        return true;
    }
};

Object.assign(JointSystem.prototype, {
    _validateCapturedViewSequence(recipe) {
        if(recipe?.version!==1||!Array.isArray(recipe.segments)||!recipe.segments.length||recipe.segments.length>24)throw new Error('A captured sequence needs 1-24 view segments.');
        let count=0,duration=0;
        recipe.segments.forEach((segment,i)=>{
            if(!/^(front|side:(left|right)|front-3q:(left|right))$/.test(segment.view))throw new Error('Unsupported captured view.');
            const side=segment.view.split(':')[1],prior=recipe.segments[i-1]?.view.split(':')[1];
            if(side&&prior&&side!==prior)throw new Error('Insert a front segment between opposite-facing views.');
            if(!['root','left','right','left-hand','right-hand'].includes(segment.anchor||'root'))throw new Error('Unsupported turn anchor.');
            const move=segment.move;
            if(!move||!Number.isFinite(move.duration)||move.duration<50||move.duration>30000||!Array.isArray(move.keyframes)||move.keyframes.length<2)throw new Error('Invalid captured segment duration or frames.');
            if(!Number.isFinite(segment.turnMs)||segment.turnMs<200||segment.turnMs>2000)throw new Error('Turn duration must be 0.2-2 seconds.');
            let last=-1;
            for(const f of move.keyframes){
                if(!Number.isFinite(f.t)||f.t<0||f.t>1||f.t<=last)throw new Error('Captured keyframe times must increase from 0 to 1.');last=f.t;
                for(const key of ['dx','dy'])if(f[key]!==undefined&&(!Number.isFinite(f[key])||Math.abs(f[key])>100000))throw new Error('Invalid captured travel.');
                for(const field of ['jointAngles','jointTilts'])for(const [key,value] of Object.entries(f[field]||{})){
                    if(field==='jointTilts'&&(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(axis=>!['x','y'].includes(axis))))throw new Error('Invalid captured tilt.');
                    if(!/^[a-z][a-z0-9-]*$/i.test(key)||!(field==='jointTilts'?Object.values(value):[value]).every(n=>Number.isFinite(n)&&Math.abs(n)<=3600))throw new Error('Invalid captured joint values.');
                }
            }
            if(move.keyframes[0].t!==0||last!==1)throw new Error('Each captured segment must include both endpoints.');
            count+=move.keyframes.length;duration+=move.duration;
        });
        if(count>1000||duration>60000)throw new Error('Captured sequences are limited to 1000 poses and 60 seconds of motion.');
        return recipe;
    },

    _capturedViewReferenceHeight(rig){
        const snapshot=this._armatureActionSnapshot(rig);
        try{this._resetArmatureToActiveCatalogIdle(rig);return this._crossViewAnchor(rig).height;}
        finally{this._restoreArmatureActionSnapshot(snapshot,true);}
    },

    _capturedViewContact(rig,view,anchor){
        if(!anchor||anchor==='root')return{x:rig.root.x,y:rig.root.y};
        const side=anchor.split('-')[0],part=anchor.endsWith('-hand')?'wrist':'ankle';
        const prefix=view.startsWith('side:')?(side===view.split(':')[1]?'front':'back'):side;
        const entry=this._getArmatureJointMap(rig)[`${prefix}-${part}`];
        if(!entry)throw new Error(`The ${anchor} anchor is unavailable in ${view}.`);
        return entry.obj.getJointWorldPosition(entry.jt);
    },

    async _compileCapturedViewSequence(rig,recipe){
        this._validateCapturedViewSequence(recipe);
        if(this._crossViewPreparing)throw new Error('A view sequence is already being prepared.');
        const startView=this._getUniversalCharacterCurrentViewSwitchKey(rig);
        if(startView!==recipe.segments[0].view)throw new Error(`Switch the character to ${recipe.segments[0].view} before using this sequence.`);
        this._captureArmatureStageBasePosition(rig);
        const snapshot=this._armatureActionSnapshot(rig),created=new Set(),tracks=new Map(),initial=new Map(),referenceHeight=this._capturedViewReferenceHeight(rig);
        let time=0,view=startView,completed=false;
        const state=()=>new Map(this._crossViewObjects(rig).map(obj=>{
            const value=JSON.parse(ArmatureViewState.capture(obj));
            value.jointRoles=(value.props.joints||[]).map(j=>view.startsWith('side:')?String(j.name||'').replace(/^(front|back)-/,(_,near)=>((near==='front')===(view==='side:right')?'right':'left')+'-'):j.name);
            return[obj.id,JSON.stringify(value)];
        }));
        const append=(id,track)=>{if(!tracks.has(id))tracks.set(id,[]);tracks.get(id).push(track);};
        const addState=(before,after,duration,name)=>{
            for(const [id,to] of after){
                const from=before.get(id)||initial.get(id)||to;
                append(id,{id:Utils.generateId('anim'),type:'continuous',name,trigger:'onLoad',repeat:'1',delay:time,afterPlayback:'keep',params:{duration:duration/1000,afterPlayback:'keep'},_armatureMovementKey:'cross-view-sequence',_armatureFacingFlip:true,
                    generated:{type:'continuous',duration,segmentEasing:'linear',properties:['armatureViewState'],keyframes:[{t:0,values:{armatureViewState:from}},{t:1,values:{armatureViewState:to}}]}});
            }
            time+=duration;
        };
        this._crossViewPreparing=true;
        try{
            await this._crossViewDecode(rig);
            state().forEach((value,id)=>initial.set(id,value));
            for(const [index,segment] of recipe.segments.entries()){
                if(this._armatureRecordingBusy?.cancelled)throw new Error('Sequence preparation cancelled.');
                const before=state(),anchor=this._capturedViewContact(rig,view,segment.anchor);
                if(view!==segment.view)rig=await this._switchArmatureCrossView(rig,segment.view,created,{referenceHeight});
                view=segment.view;
                let move=Utils.deepClone(segment.move);move._videoCaptureView=view;move=this._prepareVideoCaptureMovementLayers(move,rig);
                const map=this._getArmatureJointMap(rig);
                if(move.keyframes.some(f=>Object.keys(f.jointAngles||{}).some(key=>!map[key])))throw new Error(`Joint mapping does not match ${view}. Refit this segment.`);
                move.keyframes[0]._videoKeep=true;move.keyframes.at(-1)._videoKeep=true;
                const session=this._prepareArmatureDebuggerSession(rig,move.key,{prepared:true,movementEntry:move});
                const apply=t=>{const result=this._applyArmatureDebuggerResolvedState(session,this._resolveArmatureDebuggerPlaybackState(session,t));if(!result?.ok)throw new Error('Could not apply a captured boundary pose.');};
                apply(0);
                if(index){
                    const next=this._capturedViewContact(rig,view,segment.anchor),dx=anchor.x-next.x,dy=anchor.y-next.y;
                    session.basePosition.x+=dx;session.basePosition.y+=dy;apply(0);
                }
                const first=state();
                first.forEach((value,id)=>{if(!initial.has(id)){const hidden=JSON.parse(value);hidden.props.visible=false;initial.set(id,JSON.stringify(hidden));}});
                if(index)addState(before,first,segment.turnMs,'Captured pose-preserving turn');
                else addState(first,first,1,'Captured sequence starting pose');
                const ids=new Map(this.objects.objects.map(obj=>[obj.id,new Set(obj.animations.map(a=>a.id))]));
                const recorded=this._recordArmatureMovement(rig,move.key,{movementEntryOverride:move,preparedMovementOverride:{move},repeatCountOverride:1,delayMsOverride:time,baseXOverride:session.basePosition.x,baseYOverride:session.basePosition.y,previewAfterRecord:false,showToast:false,emitEvents:false,updateProperties:false,skipRecordSequenceAdvance:true});
                if(!recorded)throw new Error('Could not record captured segment.');
                // Capture baked numeric tracks; do not introduce a second motion renderer.
                this.objects.objects.forEach(obj=>obj.animations.filter(a=>!ids.get(obj.id)?.has(a.id)).forEach(a=>append(obj.id,Utils.deepClone(a))));
                time+=recorded.durationMs;apply(1);
            }
            const final=state();
            // Every auxiliary object has a baseline even when it first appears after a turn.
            for(const [id,value] of initial){
                const track={id:Utils.generateId('anim'),type:'continuous',name:'Captured sequence baseline',trigger:'onLoad',repeat:'1',delay:0,afterPlayback:'keep',params:{duration:.001,afterPlayback:'keep'},_armatureMovementKey:'cross-view-sequence',generated:{type:'continuous',duration:1,segmentEasing:'linear',properties:['armatureViewState'],keyframes:[{t:0,values:{armatureViewState:value}},{t:1,values:{armatureViewState:value}}]}};
                tracks.set(id,[track,...(tracks.get(id)||[])]);
            }
            completed=true;
            return{tracks,initial,final,durationMs:time,rootId:snapshot.root.id,startView,target:view,mode:'capture',startBase:{x:snapshot.states.get(snapshot.root.id).json.x,y:snapshot.states.get(snapshot.root.id).json.y},recipe:Utils.deepClone(recipe)};
        }finally{
            // Keep newly required artwork available to the returned tracks, but hidden at rest.
            const additions=completed?this.objects.objects.filter(obj=>created.has(obj.id)):[];
            this._restoreArmatureActionSnapshot(snapshot,true);
            additions.forEach(obj=>{obj.animations=[];this.objects.objects.push(obj);if(initial.has(obj.id))ArmatureViewState.apply(obj,initial.get(obj.id));else obj.visible=false;});
            this._crossViewPreparing=false;this._currentArmature=this._refreshDetectedArmatureReference(this._currentArmature)||rig;
        }
    },

    _getCapturedViewTemplates(){try{const value=JSON.parse(localStorage.getItem('animationStage.capturedViewSequences.v1')||'{}');return value&&typeof value==='object'&&!Array.isArray(value)?value:{};}catch(_){return{};}},

    async _openCapturedViewSequenceEditor(rig,input,options={}){
        this._closeCapturedViewEditor?.();this._stopArmatureClipPreview?.();this._stopArmatureCrossView();
        const recipe=Utils.deepClone(this._validateCapturedViewSequence(input)),snapshot=this._armatureActionSnapshot(rig);
        let savedKey=options.savedKey||null;
        const panel=document.createElement('div');panel.className='vmc-dialog vmc-sequence-editor';panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Captured view sequence');
        panel.innerHTML=`<header><strong>Captured View Sequence</strong><button data-sequence="close" title="Close" aria-label="Close"><i class="fas fa-times"></i></button></header><label>Name<input data-sequence="name" maxlength="120"></label><div data-sequence="segments"></div><div class="vmc-toolbar"><button data-sequence="play"><i class="fas fa-play"></i> Preview</button><button data-sequence="stop" title="Stop and restore" aria-label="Stop and restore"><i class="fas fa-stop"></i></button><button data-sequence="save"><i class="fas fa-save"></i> Save Sequence</button><button data-sequence="select"><i class="fas fa-check"></i> Select for Timeline</button></div><input data-sequence="seek" type="range" min="0" max="1" step="0.001" value="0" aria-label="Sequence time"><output data-sequence="time"></output><p role="status"></p>`;
        document.body.append(panel);panel.querySelector('[data-sequence=name]').value=recipe.name||'Captured view sequence';
        let sequence=null,busy=false,closed=false,raf=null;
        const status=panel.querySelector('[role=status]'),seek=panel.querySelector('[data-sequence=seek]');
        const stop=()=>{cancelAnimationFrame(raf);raf=null;if(sequence)this._crossViewRestore(sequence.initial);seek.value=0;this.stage.requestRender();};
        const close=()=>{if(busy)return;closed=true;stop();this._restoreArmatureActionSnapshot(snapshot,true);panel.remove();if(this._closeCapturedViewEditor===close)this._closeCapturedViewEditor=null;};
        this._closeCapturedViewEditor=close;
        const run=async fn=>{if(busy)return;busy=true;panel.querySelectorAll('button,input,select').forEach(el=>el.disabled=true);try{stop();await fn();}catch(error){status.textContent=error.message;}finally{busy=false;if(!closed)panel.querySelectorAll('button,input,select').forEach(el=>el.disabled=false);}};
        const compile=async()=>{this._restoreArmatureActionSnapshot(snapshot,true);sequence=await this._compileCapturedViewSequence(this._refreshDetectedArmatureReference(rig)||rig,recipe);return sequence;};
        const sample=t=>{if(sequence){this._sampleArmatureCrossViewSequence(sequence,t*sequence.durationMs);panel.querySelector('[data-sequence=time]').value=`${(t*sequence.durationMs/1000).toFixed(2)} / ${(sequence.durationMs/1000).toFixed(2)} s`;}};
        const rows=panel.querySelector('[data-sequence=segments]');
        for(const [i,segment] of recipe.segments.entries()){
            const row=document.createElement('div');row.className='vmc-toolbar';
            const label=document.createElement('strong');label.textContent=`${i+1}. ${segment.view} (${segment.move.keyframes.length} poses)`;row.append(label);
            if(i){
                const input=document.createElement('input');input.type='number';input.min=.2;input.max=2;input.step=.1;input.value=segment.turnMs/1000;
                input.setAttribute('aria-label',`Turn ${i} seconds`);input.title='Turn duration (seconds)';
                input.onchange=()=>{stop();segment.turnMs=Math.max(200,Math.min(2000,Number(input.value)*1000||800));input.value=segment.turnMs/1000;sequence=null;};
                const anchor=document.createElement('select');anchor.setAttribute('aria-label',`Turn ${i} anchor`);
                for(const [key,label] of [['root','Body position'],['left','Left foot'],['right','Right foot'],['left-hand','Left hand'],['right-hand','Right hand']])anchor.append(new Option(label,key));
                anchor.value=segment.anchor||'root';anchor.onchange=()=>{stop();segment.anchor=anchor.value;sequence=null;};
                const durationLabel=document.createElement('label');durationLabel.textContent='Turn (s)';durationLabel.append(input);
                const anchorLabel=document.createElement('label');anchorLabel.textContent='Anchor';anchorLabel.append(anchor);
                row.append(durationLabel,anchorLabel);
            }
            const edit=document.createElement('button');edit.innerHTML='<i class="fas fa-sliders-h"></i> Edit / Simplify';
            edit.onclick=()=>run(async()=>{
                this._restoreArmatureActionSnapshot(snapshot,true);let target=this._refreshDetectedArmatureReference(rig)||rig;
                if(this._getUniversalCharacterCurrentViewSwitchKey(target)!==segment.view)target=await this._switchArmatureCrossView(target,segment.view,new Set(),{referenceHeight:this._capturedViewReferenceHeight(target)});
                if(!this._openArmatureMovementDebugger(target,segment.move.key,{prepared:true,movementEntry:segment.move}))throw new Error('Could not open segment debugger.');
                panel.hidden=true;
                this._activeArmatureDebuggerSession.onClose=edited=>{
                    segment.move=this._getArmatureDebuggerRevisedMove(edited);segment.move.keyframes[0]._videoKeep=true;segment.move.keyframes.at(-1)._videoKeep=true;
                    label.textContent=`${i+1}. ${segment.view} (${segment.move.keyframes.length} poses)`;
                    this._restoreArmatureActionSnapshot(snapshot,true);sequence=null;panel.hidden=false;
                };
            });row.append(edit);rows.append(row);
        }
        panel.querySelector('[data-sequence=close]').onclick=close;
        panel.querySelector('[data-sequence=stop]').onclick=stop;
        seek.oninput=()=>{cancelAnimationFrame(raf);raf=null;sample(Number(seek.value));};
        panel.querySelector('[data-sequence=play]').onclick=()=>run(async()=>{
            await compile();const started=performance.now();
            const tick=now=>{if(closed)return;const t=Math.min(1,(now-started)/sequence.durationMs);seek.value=t;sample(t);if(t<1)raf=requestAnimationFrame(tick);};raf=requestAnimationFrame(tick);
        });
        panel.querySelector('[data-sequence=save]').onclick=()=>run(async()=>{
            recipe.name=panel.querySelector('[data-sequence=name]').value.trim()||'Captured view sequence';this._validateCapturedViewSequence(recipe);
            const templates=this._getCapturedViewTemplates();savedKey||=Utils.generateId('captured-sequence');templates[savedKey]=recipe;localStorage.setItem('animationStage.capturedViewSequences.v1',JSON.stringify(templates));status.textContent='Saved in Cross-view sequence > Captured sequences.';
        });
        panel.querySelector('[data-sequence=select]').onclick=()=>run(async()=>{
            recipe.name=panel.querySelector('[data-sequence=name]').value.trim()||'Captured view sequence';
            this._restoreArmatureActionSnapshot(snapshot,true);
            const spec={kind:'cross',name:recipe.name,rootId:rig.root.id,view:recipe.segments[0].view,options:{capture:recipe}};
            if(options.editingAction){this._armatureEditingAction=options.editingAction;this._armatureSelectedAction=spec;this._armaturePreparedAction=null;await this._prepareSelectedArmatureAction();}
            else await this._selectArmatureRecordingAction(spec);
            if(!this._armaturePreparedAction)throw new Error('Could not prepare the sequence.');busy=false;close();this._buildArmaturePanel(this._refreshDetectedArmatureReference(rig)||rig,{preserveState:true,reuseExisting:true});
        });
        await run(compile);
    },

    _crossViewObjects(rig) {
        const objects = [...this._getArmatureViewTransitionObjects(rig)];
        const ids = new Set(objects.map(obj => obj.id));
        // Include user-pinned props and nested accessories in baseline/seek state,
        // but never treat them as replacement character artwork.
        let changed = true;
        while (changed) {
            changed = false;
            for (const obj of this.objects.objects) {
                if (!ids.has(obj.id) && ids.has(obj.pinnedTo)) {
                    ids.add(obj.id); objects.push(obj); changed = true;
                }
            }
        }
        return objects;
    },

    _captureCrossViewAttachments(rig) {
        const parts = new Set(this._getArmatureViewTransitionObjects(rig).map(obj => obj.id));
        return this._crossViewObjects(rig).filter(obj => !parts.has(obj.id)).map(obj => {
            const parent = this.objects.getObjectById(obj.pinnedTo);
            const joint = parent?.joints?.find(j => j.id === obj.pinJointId)
                || parent?.joints?.find(j => j.name === obj.pinJointName);
            return { id: obj.id, parentId: obj.pinnedTo, jointName: joint?.name || obj.pinJointName,
                jointRole: (joint?.name || obj.pinJointName || '').replace(/^(front|back|left|right)-/, ''),
                state: ArmatureViewState.capture(obj) };
        });
    },

    _restoreCrossViewAttachments(attachments) {
        for (const attachment of attachments) {
            const obj = this.objects.getObjectById(attachment.id);
            const parent = this.objects.getObjectById(attachment.parentId);
            if (!obj || !parent) throw new Error('A pinned accessory lost its physical parent during the view change.');
            this.animations._setAnimatedPropertyValue(obj, 'armatureViewState', attachment.state);
            obj.pinnedTo = parent.id;
            if (obj.pinTargetType === 'joint') {
                const matches = (parent.joints || []).filter(j => j.name === attachment.jointName
                    || j.name?.replace(/^(front|back|left|right)-/, '') === attachment.jointRole);
                if (matches.length !== 1) throw new Error('A pinned accessory has no unambiguous matching joint in the destination view.');
                obj.pinJointId = matches[0].id;
                obj.pinJointName = matches[0].name;
            }
        }
        this.objects._resolvePins();
    },

    _crossViewAnchor(rig) {
        this.objects._resolvePins();
        const feet = Object.entries(this._getArmatureContactSourceMap(rig))
            .filter(([key]) => key.endsWith('-foot')).map(([, source]) => this._getArmatureFootSole(source));
        if (!feet.length) throw new Error('This rig has no supported foot anchors.');
        const head = rig.parts['head-neck']?.obj || rig.parts.headNeck?.obj || rig.parts.head?.obj;
        const y = Math.max(...feet.map(p => p.y));
        return { x: feet.reduce((sum, p) => sum + p.x, 0) / feet.length, y,
            height: y - (head?.getBounds?.().y ?? rig.root.y) };
    },

    _crossViewRestore(states) {
        states.forEach((value, id) => {
            const obj = this.objects.getObjectById(id);
            if (obj) this.animations._setAnimatedPropertyValue(obj, 'armatureViewState', value);
        });
        this.objects._resolvePins();
    },

    async _crossViewDecode(rig) {
        await Promise.all(this._crossViewObjects(rig).filter(o => o.imageSrc).map(async obj => {
            const src = obj.imageSrc;
            const image = new Image(); image.src = src;
            await image.decode();
            ArmatureViewState.prepareImage(image);
            if (!(obj._crossViewImages instanceof Map)) obj._crossViewImages = new Map();
            obj._crossViewImages.set(src, image);
            if (obj.imageSrc === src) obj.imageElement = image;
        }));
    },

    async _switchArmatureCrossView(rig, target, createdIds = new Set(), options = {}) {
        if (rig.root?._svgCharacterConfig?._realisticCharacter) {
            globalThis.RealisticCharacter.selected(rig.root._svgCharacterConfig, String(target).replace(':', '-'));
        }
        const spec = this._getUniversalCharacterViewSwitchSpec(target);
        if (!spec || !/^(front|back|(front-3q|back-3q|side):(left|right))$/.test(target)) {
            throw new Error('Choose a supported character view.');
        }
        const anchor = this._crossViewAnchor(rig);
        const attachments = this._captureCrossViewAttachments(rig);
        const head = this.animations._getSvgAfricanPremiumHeadObject?.(rig.root);
        if (head && target !== this._getUniversalCharacterCurrentViewSwitchKey(rig)) {
            head._svgAfricanFaceImageRequestId = (head._svgAfricanFaceImageRequestId || 0) + 1;
            head._svgAfricanFaceImageAppliedId = head._svgAfricanFaceImageRequestId;
        }
        if (rig.root._characterAppearanceProvider === 'svg-african-premium') {
            rig = this._switchSvgAfricanPremiumView(rig, target, {
                allowStructuralSwitch: true, stopMovement: false, rebuildPanel: false, pushHistory: false, toast: false,
                threeQuarterArtwork: options.threeQuarterArtwork
            }) || rig;
        } else {
            const style = this._getUniversalCharacterStyleConfig(rig);
            if (!style) throw new Error('This character has no saved view styling.');
            const existingIds = new Set(this.objects.objects.map(o => o.id));
            const oldObjects = this._getArmatureViewTransitionObjects(rig);
            const physicalKey = (obj, view) => {
                let key = obj._armaturePartKey || obj._armatureRoleKey || obj.bodyPartData?.partKey;
                if (key === 'headNeck' || key === 'head') key = 'head-neck';
                if (/^(front|back)-(arm|leg)$/.test(key || '')) {
                    const nearRight = view === 'side:right';
                    key = key.replace(/^(front|back)/, near => (near === 'front') === nearRight ? 'right' : 'left');
                }
                if (key) return 'part:' + key;
                if (obj._facialFeatureKey) return 'face:' + obj._facialFeatureKey;
                return 'helper:' + (obj._ucGarmentPartKey || obj._svgAfricanGarmentSlot || obj.name);
            };
            const oldView = this._getUniversalCharacterCurrentViewSwitchKey(rig);
            const slots = new Map(oldObjects.map(obj => [physicalKey(obj, oldView), obj]));
            let generated;
            try {
                generated = this.createUniversalCharacter({ ...style, view: spec.view, viewVariant: spec.viewVariant,
                    sideFacing: spec.sideFacing, front3qLean: spec.lean || 'none',
                    _ucInternal: { openPanel: false, pushHistory: false, toast: false, select: false,
                        styleConfig: { ...style, view: spec.view, viewVariant: spec.viewVariant,
                            sideFacing: spec.sideFacing, front3qLean: spec.lean || 'none' },
                        variantKey: spec.key, linkedViews: [] } });
                const fresh = this._crossViewObjects(generated);
                const idMap = new Map();
                const pairs = fresh.map(obj => {
                    const key = physicalKey(obj, target);
                    let original = slots.get(key);
                    if (!original) {
                        original = StageObject.fromJSON(obj.toJSON());
                        original.id = Utils.generateId('obj'); original.visible = false;
                        original.animations = [];
                        for (const field of ['groupId', '_characterStackId', '_characterStackOrder',
                            '_ucCharacterFamilyId', '_ucCharacterLinkedViews']) original[field] = rig.root[field];
                        this.objects.objects.push(original);
                        createdIds.add(original.id);
                        slots.set(key, original);
                    }
                    idMap.set(obj.id, original.id);
                    return [obj, original];
                });
                const remap = value => {
                    if (typeof value === 'string') return idMap.get(value) || value;
                    if (Array.isArray(value)) return value.map(remap);
                    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, remap(v)]));
                    return value;
                };
                oldObjects.forEach(obj => { obj.visible = false; });
                pairs.forEach(([source, destination]) => {
                    const state = remap(JSON.parse(ArmatureViewState.capture(source)));
                    this.animations._setAnimatedPropertyValue(destination, 'armatureViewState', JSON.stringify(state));
                });
            } finally {
                // Remove only generated templates; mapped live objects keep their IDs and tracks.
                const templateIds = new Set(this.objects.objects.filter(o => !existingIds.has(o.id)
                    && ![...slots.values()].includes(o)).map(o => o.id));
                this.objects.objects = this.objects.objects.filter(o => !templateIds.has(o.id));
            }
            rig = this._refreshDetectedArmatureReference(rig) || rig;
        }
        this._resetArmatureToActiveCatalogIdle(rig);
        await this._crossViewDecode(rig);
        if (this.objects.getObjectById(rig.root.id) !== rig.root) throw new Error('The character or scene changed while preparing the turn.');
        let next = this._crossViewAnchor(rig);
        const scale = (options.referenceHeight || anchor.height) / next.height;
        if (!Number.isFinite(scale) || scale <= 0) {
            throw new Error('Could not match the character size across views.');
        }
        if (Math.abs(scale - 1) > 1e-8) {
            if (!this._scaleArmatureUniform(rig, scale, { toast: false, pushHistory: false })) {
                throw new Error('Could not resize the destination view to match the character.');
            }
        }
        next = this._crossViewAnchor(rig);
        this._setArmatureRootPosition(rig, rig.root.x + anchor.x - next.x, rig.root.y + anchor.y - next.y);
        this._setArmatureBasePosition(rig, rig.root.x, rig.root.y);
        this._restoreCrossViewAttachments(attachments);
        this.objects._resolvePins();
        this._currentArmature = rig;
        return rig;
    },

    async _compileArmatureCrossViewSequence(rig, options = {}) {
        if(options.capture)return this._compileCapturedViewSequence(rig,options.capture);
        if (this._crossViewPreparing) throw new Error('A cross-view sequence is already being prepared.');
        if (this.animations.isPlaying) this.animations.pause();
        const startView = this._getUniversalCharacterCurrentViewSwitchKey(rig);
        if (!/^(front|side:(left|right))$/.test(startView)) throw new Error('Start with a front or side-view character.');
        const mode = options.mode || 'walk-turn';
        const side = options.side === 'left' ? 'left' : 'right';
        const target = startView.startsWith('side:') ? 'front' : `side:${side}`;
        const turnMs = Math.max(200, Math.min(2000, Number(options.turnMs) || 800));
        const pauseMs = Math.max(0, Math.min(3000, Number(options.pauseMs) || 0));
        this._stopArmatureCrossView?.();
        rig = this._refreshDetectedArmatureReference(rig) || rig;
        // Stage dragging does not update the pose cache. Capture placement before idle reset uses it.
        this._captureArmatureStageBasePosition(rig);
        this._stopArmatureMovement(rig);
        rig = this._resetArmatureToActiveCatalogIdle(rig) || rig;
        await this._crossViewDecode(rig);
        const createdIds = new Set();
        const initial = new Map(this._crossViewObjects(rig).map(o => [o.id, ArmatureViewState.capture(o)]));
        const animations = new Map(this.objects.objects.map(o => [o.id, o.animations.slice()]));
        const originals = this.animations.originalStates;
        this.animations.originalStates = new Map(originals);
        const cursor = this.objects._recordSequenceCursorMs;
        const startBase = { x: rig.root.x, y: rig.root.y };
        const tracks = new Map();
        let time = 0;
        const state = () => new Map(this._crossViewObjects(rig).map(o => [o.id, ArmatureViewState.capture(o)]));
        const addState = (before, after, duration, turnSegment) => {
            const ids = new Set([...before.keys(), ...after.keys()]);
            ids.forEach(id => {
                let value0 = before.get(id) || initial.get(id);
                let value1 = after.get(id) || value0;
                if (!value0 || !value1) return;
                if (turnSegment !== undefined) {
                    value0 = JSON.stringify({ ...JSON.parse(value0), turnSegment });
                    value1 = JSON.stringify({ ...JSON.parse(value1), turnSegment });
                }
                const clip = { id: Utils.generateId('anim'), type: 'continuous', name: 'Armature Cross-view Turn (Experimental)',
                    trigger: 'onLoad', repeat: '1', delay: time, afterPlayback: 'keep',
                    params: { duration: duration / 1000, afterPlayback: 'keep' },
                    _armatureMovementKey: 'cross-view-sequence', _armatureFacingFlip: true,
                    generated: { type: 'continuous', duration, segmentEasing: 'linear', properties: ['armatureViewState'],
                        keyframes: [{ t: 0, values: { armatureViewState: value0 } }, { t: 1, values: { armatureViewState: value1 } }] } };
                (tracks.get(id) || (tracks.set(id, []), tracks.get(id))).push(clip);
            });
            time += duration;
        };
        const walk = () => {
            const key = this._getUniversalCharacterCurrentViewSwitchKey(rig).startsWith('side:')
                ? 'walk-natural-forward' : 'front-walk-forward';
            const move = this._getActiveArmatureMovementCatalog(rig)[key];
            if (!move) throw new Error('This view has no compatible forward walk.');
            const beforeTracks = new Map(this.objects.objects.map(o => [o.id, new Set(o.animations.map(a => a.id))]));
            const segment = this._recordArmatureMovement(rig, key, { delayMsOverride: time,
                previewAfterRecord: false, showToast: false, emitEvents: false, updateProperties: false,
                skipRecordSequenceAdvance: true });
            if (!segment) throw new Error('Could not prepare the walking segment.');
            this.objects.objects.forEach(obj => {
                const added = obj.animations.filter(a => !beforeTracks.get(obj.id)?.has(a.id));
                if (added.length) tracks.set(obj.id, [...(tracks.get(obj.id) || []), ...Utils.deepClone(added)]);
            });
            const terminal = segment.terminalPoseSnapshots?.get(rig.root.id);
            this._setArmatureRootPosition(rig, terminal?.x ?? rig.root.x, terminal?.y ?? rig.root.y);
            this._setArmatureBasePosition(rig, rig.root.x, rig.root.y);
            this._resetArmatureToActiveCatalogIdle(rig);
            time += segment.durationMs;
        };
        this._crossViewPreparing = true;
        try {
            if (mode === 'walk-turn') walk();
            if (pauseMs) { const hold = state(); addState(hold, hold, pauseMs); }
            const turnSide = startView.startsWith('side:') ? startView.split(':')[1] : side;
            for (const [turnSegment, view] of [`front-3q:${turnSide}`, target].entries()) {
                const before = state();
                rig = await this._switchArmatureCrossView(rig, view, createdIds);
                // Auxiliary parts that exist in only one view stay hidden in the other.
                this._crossViewObjects(rig).forEach(obj => {
                    if (!initial.has(obj.id)) {
                        const hidden = JSON.parse(ArmatureViewState.capture(obj)); hidden.props.visible = false;
                        initial.set(obj.id, JSON.stringify(hidden));
                        animations.set(obj.id, []);
                    }
                });
                addState(before, state(), turnMs / 2, turnSegment);
            }
            if (mode === 'turn-walk') walk();
            // A baseline track restores the full attachment layout when seeking backwards.
            initial.forEach((value, id) => {
                const baseline = { id: Utils.generateId('anim'), type: 'continuous', name: 'Cross-view starting state',
                    trigger: 'onLoad', repeat: '1', delay: 0, afterPlayback: 'keep',
                    params: { duration: .001, afterPlayback: 'keep' }, _armatureMovementKey: 'cross-view-sequence',
                    generated: { type: 'continuous', duration: 1, segmentEasing: 'linear', properties: ['armatureViewState'],
                        keyframes: [{ t: 0, values: { armatureViewState: value } }, { t: 1, values: { armatureViewState: value } }] } };
                tracks.set(id, [baseline, ...(tracks.get(id) || [])]);
            });
            return { tracks, initial, durationMs: time, rootId: rig.root.id, startView, target,
                mode, final: state(), startBase };
        } catch (error) {
            this.objects.objects = this.objects.objects.filter(o => !createdIds.has(o.id));
            throw error;
        } finally {
            this._crossViewPreparing = false;
            this._crossViewRestore(initial);
            this.objects.objects.forEach(o => { if (animations.has(o.id)) o.animations = animations.get(o.id); });
            this.animations.originalStates = originals;
            this.objects._recordSequenceCursorMs = cursor;
            if (this.objects.getObjectById(rig.root.id)) {
                rig = this._refreshDetectedArmatureReference(rig) || rig;
                this._setArmatureBasePosition(rig, startBase.x, startBase.y);
                this._currentArmature = rig;
                this.objects.select(this._getArmatureObjects(rig).map(o => o.id));
            }
        }
    },

    _sampleArmatureCrossViewSequence(sequence, elapsed) {
        this._crossViewRestore(sequence.initial);
        sequence.tracks.forEach((tracks, id) => {
            const obj = this.objects.getObjectById(id);
            if (!obj) return;
            tracks.forEach(clip => {
                if (elapsed < clip.delay) return;
                const config = clip.generated, frames = config.keyframes;
                const t = Math.min(1, (elapsed - clip.delay) / config.duration);
                let a = frames[0], b = frames[frames.length - 1];
                for (let i = 1; i < frames.length; i++) if (t <= frames[i].t) { a = frames[i - 1]; b = frames[i]; break; }
                let p = Math.max(0, Math.min(1, (t - a.t) / (b.t - a.t || 1)));
                if (config.segmentEasing === 'easeInOutQuad') p = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
                Object.keys(a.values).forEach(key => {
                    const v0 = a.values[key], v1 = b.values[key] ?? v0;
                    this.animations._setAnimatedPropertyValue(obj, key,
                        this.animations._resolveAnimatedPropertyValue(obj, key, v0, v1, p, v0 + (v1 - v0) * p));
                });
            });
        });
        // Cross-view clips own metadata; old SVG family syncs must not remap the new joints.
        this.animations._pendingSvgArmatureTimelineViews?.delete(sequence.rootId);
        this.objects._resolvePins();
        this.stage.requestRender();
    },

    _stopArmatureCrossView() {
        const active = this._crossViewPreview;
        if (!active) return;
        cancelAnimationFrame(active.raf);
        this._crossViewPreview = null;
        this._crossViewRestore(active.sequence.initial);
        const rig = this._refreshDetectedArmatureReference(this._currentArmature);
        if (rig) this._currentArmature = rig;
        this.stage.requestRender();
    },

    _playArmatureCrossViewSequence(sequence) {
        this._stopArmatureCrossView();
        const active = { sequence, raf: null, started: null };
        this._crossViewPreview = active;
        const frame = now => {
            if (this._crossViewPreview !== active) return;
            if (this.animations.isPlaying || !this.objects.getObjectById(sequence.rootId)) {
                this._stopArmatureCrossView();
                return;
            }
            if (active.started === null) active.started = now;
            const elapsed = Math.min(sequence.durationMs, now - active.started);
            this._sampleArmatureCrossViewSequence(sequence, elapsed);
            if (elapsed < sequence.durationMs) active.raf = requestAnimationFrame(frame);
            else {
                this._crossViewPreview = null;
                const rig = this._refreshDetectedArmatureReference(this._currentArmature);
                this._currentArmature = rig;
                this._setArmatureBasePosition(rig, rig.root.x, rig.root.y);
                this._buildArmaturePanel(rig, { preserveState: true, reuseExisting: true });
            }
        };
        active.raf = requestAnimationFrame(frame);
    },

    _recordArmatureCrossViewSequence(sequence, options = {}) {
        const rig = this._refreshDetectedArmatureReference(this._currentArmature);
        const delay = this._getArmatureRecordStartMs(rig, options);
        // Unanimated parts may still have a snapshot from before a stage move or resize.
        // Preserve existing animated baselines, since earlier timeline clips depend on them.
        sequence.tracks.forEach((_, id) => {
            const obj = this.objects.getObjectById(id);
            if (obj && !obj.animations?.length) this.animations.originalStates?.delete(id);
        });
        this._ensureArmatureTimelineOriginalStates(rig);
        sequence.tracks.forEach((tracks, id) => {
            const obj = this.objects.getObjectById(id);
            if (!obj) return;
            tracks.forEach(track => obj.animations.push({ ...Utils.deepClone(track), delay: delay + track.delay }));
        });
        this._advanceArmatureRecordSequenceCursor(delay, sequence.durationMs, options);
        eventBus.emit('timeline:update'); eventBus.emit('objects:updated'); eventBus.emit('history:push');
        this.stage.requestRender();
        return { durationMs: sequence.durationMs, delayMs: delay };
    },

    _syncArmatureCrossViewPanel() {
        if (this._crossViewPreparing || this._crossViewPreview || this._armatureRecordingBusy || this._armatureClipPreview || this.animations?._exportingVideo) return;
        const current = this._currentArmature;
        const panel = document.getElementById('armature-panel');
        if (!current?.root?.armatureViewState || !panel) return;
        if (current.root._crossViewBlend) return;
        const rig = this._refreshDetectedArmatureReference(current);
        const key = this._getUniversalCharacterCurrentViewSwitchKey(rig);
        this._currentArmature = rig;
        if (panel.dataset.crossViewKey === key) return;
        this._buildArmaturePanel(rig, { preserveState: true, reuseExisting: true });
    },

    _mountArmatureCrossViewControls(panel, rig) {
        const view = this._getUniversalCharacterCurrentViewSwitchKey(rig);
        panel.dataset.crossViewKey = view;
        if (!/^(front|front-3q:(left|right)|side:(left|right))$/.test(view)
            || !(rig.root._characterAppearanceProvider === 'svg-african-premium' || this._isUniversalCharacterArmature(rig))) return;
        const host = panel.querySelector('#armature-movement-blend');
        if (!host) return;
        const controls = document.createElement('details');
        controls.id = 'armature-cross-view';
        controls.style.cssText = 'margin-top:10px;border-top:1px solid var(--border-color);padding-top:8px';
        const side = view.startsWith('side:');
        controls.innerHTML = `<summary>Cross-view sequence (Experimental)</summary>
            <label style="display:block;margin-top:8px">Sequence<select class="jpl-input" data-cross="mode" style="width:100%">
                <option value="walk-turn">${side ? 'Walk, stop, face front' : 'Front walk, stop, turn side'}</option>
                ${!side ? '<option value="turn-walk">Turn side, then walk</option>' : ''}
                <option value="turn">${side ? 'Turn to front' : 'Turn to side'}</option></select></label>
            ${!side ? '<label style="display:block;margin-top:6px">Direction<select class="jpl-input" data-cross="side" style="width:100%"><option value="right">Right</option><option value="left">Left</option></select></label>' : ''}
            <label style="display:flex;align-items:center;gap:8px;margin-top:6px">Pause (s)<input class="jpl-input" data-cross="pause" type="number" min="0" max="3" step="0.1" value="0.2" style="width:76px"></label>
            <label style="display:flex;align-items:center;gap:8px;margin-top:6px">Turn (s)<input class="jpl-input" data-cross="duration" type="number" min="0.2" max="2" step="0.1" value="0.8" style="width:76px"></label>
            <div style="display:flex;gap:8px;margin-top:8px">
                <button class="btn-small" data-cross="preview" title="Preview cross-view sequence"><i class="fas fa-play"></i> Preview</button>
                <button class="btn-small" data-cross="record" title="Select this sequence for the timeline action controls"><i class="fas fa-check"></i> Select Sequence</button>
                <button class="btn-small" data-cross="stop" title="Stop and restore starting view" aria-label="Stop and restore starting view"><i class="fas fa-stop"></i></button>
            </div><div data-cross="status" role="status" style="font-size:11px;margin-top:6px"></div>`;
        host.append(controls);
        const library=document.createElement('div');library.className='vmc-toolbar';
        const select=document.createElement('select');select.setAttribute('aria-label','Captured view sequences');select.append(new Option('Captured sequences',''));
        const templates=this._getCapturedViewTemplates();
        Object.entries(templates).filter(([,r])=>r.segments?.[0]?.view===view).forEach(([key,r])=>select.append(new Option(r.name||'Captured sequence',key)));
        const open=document.createElement('button');open.className='btn-small';open.innerHTML='<i class="fas fa-film"></i> Review';open.disabled=true;
        const remove=document.createElement('button');remove.className='btn-small';remove.innerHTML='<i class="fas fa-trash"></i>';remove.title='Delete captured sequence';remove.setAttribute('aria-label',remove.title);remove.disabled=true;
        select.onchange=()=>{open.disabled=remove.disabled=!select.value;};
        open.onclick=()=>this._openCapturedViewSequenceEditor(this._refreshDetectedArmatureReference(rig)||rig,templates[select.value],{savedKey:select.value}).catch(error=>Utils.showToast(error.message,'warning'));
        remove.onclick=()=>{if(!confirm('Delete this saved captured sequence?'))return;try{delete templates[select.value];localStorage.setItem('animationStage.capturedViewSequences.v1',JSON.stringify(templates));select.selectedOptions[0].remove();select.value='';select.onchange();}catch(error){Utils.showToast(error.message,'warning');}};
        library.append(select,open,remove);controls.prepend(library);
        if(this._armatureSelectedAction?.options?.capture&&this._armatureSelectedAction.rootId===rig.root.id){
            const edit=document.createElement('button');edit.className='btn-small';edit.innerHTML='<i class="fas fa-sliders-h"></i> Edit Selected Capture';
            edit.onclick=()=>this._openCapturedViewSequenceEditor(this._refreshDetectedArmatureReference(rig)||rig,this._armatureSelectedAction.options.capture,{editingAction:this._armatureEditingAction}).catch(error=>Utils.showToast(error.message,'warning'));library.append(edit);
        }
        if(view.startsWith('front-3q:'))controls.querySelectorAll('[data-cross]').forEach(el=>{if('disabled' in el)el.disabled=true;});
        controls.querySelector('[data-cross="stop"]').onclick = () => {
            this._stopArmatureClipPreview?.(); this._stopArmatureCrossView();
        };
        for (const action of ['preview', 'record']) controls.querySelector(`[data-cross="${action}"]`).onclick = async () => {
            if (this._selectArmatureRecordingAction) {
                if (this._armatureRecordingBusy) return;
                const live = this._refreshDetectedArmatureReference(this._currentArmature) || rig;
                await this._selectArmatureRecordingAction({ kind: 'cross', name: controls.querySelector('[data-cross="mode"]').selectedOptions[0].textContent,
                    rootId: live.root.id, view: this._getUniversalCharacterCurrentViewSwitchKey(live), options: {
                        mode: controls.querySelector('[data-cross="mode"]').value,
                        side: controls.querySelector('[data-cross="side"]')?.value,
                        turnMs: Number(controls.querySelector('[data-cross="duration"]').value) * 1000,
                        pauseMs: Number(controls.querySelector('[data-cross="pause"]').value) * 1000
                    } });
                // Selection prepares and reports the exact duration; insertion always remains explicit.
                if (action === 'preview') await this._runArmatureSelectedAction('preview');
                return;
            }
            const buttons = controls.querySelectorAll('button'); buttons.forEach(b => b.disabled = true);
            const status = controls.querySelector('[data-cross="status"]'); status.textContent = 'Preparing views...';
            try {
                const live = this._refreshDetectedArmatureReference(rig) || rig;
                const sequence = await this._compileArmatureCrossViewSequence(live, {
                    mode: controls.querySelector('[data-cross="mode"]').value,
                    side: controls.querySelector('[data-cross="side"]')?.value,
                    turnMs: Number(controls.querySelector('[data-cross="duration"]').value) * 1000,
                    pauseMs: Number(controls.querySelector('[data-cross="pause"]').value) * 1000
                });
                if (action === 'record') this._recordArmatureCrossViewSequence(sequence);
                else this._playArmatureCrossViewSequence(sequence);
                status.textContent = action === 'record' ? 'Sequence recorded.' : '';
            } catch (error) { status.textContent = error.message; }
            finally { buttons.forEach(b => b.disabled = false); }
        };
        controls.addEventListener('change', () => {
            if (this._armatureSelectedAction?.kind === 'cross' && !this._armatureRecordingBusy) {
                controls.querySelector('[data-cross="record"]').click();
            }
        });
    }
});
