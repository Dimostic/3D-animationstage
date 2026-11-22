/* Multi-character cues compile to the same property tracks as Character Sequence. */
(() => {
    const copy = value => Utils.deepClone(value);
    const available = () => {
        const app = window.app, characters = [...app.audioTimeline._getAvailableCharacters()];
        const seen = new Set(characters.map(item => item.id));
        // Choreography also needs back-facing rigs without a visible speaking face.
        const objects = app.objects.objects, children = new Map();
        for (const obj of objects) if (obj.pinnedTo) {
            if (!children.has(obj.pinnedTo)) children.set(obj.pinnedTo, []);
            children.get(obj.pinnedTo).push(obj);
        }
        for (const root of objects) {
            if (seen.has(root.id) || !children.has(root.id)) continue;
            const rig = app.jointSystem._detectArmatureFromPool([root, ...children.get(root.id)]);
            if (!rig?.root || seen.has(rig.root.id)) continue;
            if (rig.root._characterAppearanceProvider !== 'svg-african-premium' && !app.jointSystem._isUniversalCharacterArmature(rig)) continue;
            seen.add(rig.root.id);
            characters.push({ id: rig.root.id, name: rig.root.name || 'Character', armature: rig });
        }
        return characters;
    };
    const key = 'animationStage.choreography.v1';
    const bounded = (value, min, max, name) => {
        if (!Number.isFinite(value) || value < min || value > max) throw Error(`${name} must be between ${min} and ${max}.`);
        return value;
    };
    Object.assign(JointSystem.prototype, {
        _choreographySpeakingAction(item) { return this._sequenceSpeechSteps([item.step]).some(step=>step.speech?.audioId); },
        _mountHandoffStepFields(host,step,{rig,invalidate,render,status,actors}) {
            if(actors&&step.handoffReceiverActorId)step.handoffReceiverRootId=actors.find(a=>a.id===step.handoffReceiverActorId)?.rootId||'';
            const fields=document.createElement('div');fields.className='sequence-fields';host.append(fields);
            const field=(name,input)=>{const label=document.createElement('label');label.append(name,input);fields.append(label);return input;};
            const select=(key,name,choices,fallback='')=>{const input=document.createElement('select');choices.forEach(([v,n])=>input.append(new Option(n,v)));input.value=step[key]??fallback;
                field(name,input).onchange=()=>{invalidate();step[key]=input.value;if(key==='handoffReceiverRootId'&&actors)step.handoffReceiverActorId=actors.find(a=>a.rootId===input.value)?.id;};};
            select('handoffReceiverRootId','Receiver',[['','Choose character'],...available().filter(a=>a.id!==rig.root.id).map(a=>[a.id,a.name])]);
            for(const role of ['Giver','Receiver'])select(`handoff${role}Hand`,`${role} hand`,[['front-hand','Near hand'],['back-hand','Far hand'],['left-hand','Left hand'],['right-hand','Right hand']],'front-hand');
            select('handoffProp','Prop',[['notebook','Notebook'],['activity-folder','Document folder'],['activity-parcel','Small parcel']],'notebook');
            select('handoffDeskId','Table clearance',[['','Automatic'],...this.objects.objects.filter(o=>o.type==='image'&&o.sceneAsset&&!o.joints?.length).map(o=>[o.id,o.name||'Prop'])]);
            for(const [key,name,min,max,value]of [['handoffScale','Prop scale',.5,2,1],...['Giver','Receiver'].flatMap(role=>['X','Y'].map(axis=>[`handoff${role}Grip${axis}`,`${role} grip ${axis} (%)`,0,100,'']))]){
                const input=document.createElement('input');input.type='number';input.min=min;input.max=max;input.step='.05';input.value=step[key]??value;input.placeholder='Automatic';
                field(name,input).onchange=()=>{invalidate();if(input.value==='')delete step[key];else step[key]=input.valueAsNumber;};
            }
            const upload=document.createElement('input');upload.type='file';upload.accept='image/png,image/jpeg,image/webp';field('Upload prop',upload).onchange=async()=>{
                const file=upload.files?.[0];if(!file)return;let url;
                try{if(file.size>10*1024*1024||!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('Choose a PNG, JPEG or WebP under 10 MB.');
                    url=URL.createObjectURL(file);const src=await this._sequencePropImage(url),img=new Image();img.src=src;await img.decode();if(!host.isConnected)return;
                    invalidate();step.handoffArtwork={src,width:img.naturalWidth,height:img.naturalHeight,name:file.name};status('Custom prop selected.');
                }catch(error){status(error.message);}finally{if(url)URL.revokeObjectURL(url);}
            };
            const reset=document.createElement('button');reset.type='button';reset.title='Reset custom prop';reset.innerHTML='<i class="fas fa-rotate-left"></i>';reset.onclick=()=>{invalidate();delete step.handoffArtwork;render();};fields.append(reset);
        },
        async _compileHandoffCharacterSequence(rig,recipe,options) {
            const roots=[rig.root.id,...new Set(recipe.steps.filter(s=>s.kind==='handoff').map(s=>s.handoffReceiverRootId))];
            if(roots.some(id=>!id))throw Error('Choose a receiver for every handoff.');
            const group=this._newSceneChoreography(roots);group.name=recipe.name;
            group.actors.sort((a,b)=>(a.rootId===rig.root.id?-1:0)-(b.rootId===rig.root.id?-1:0));
            if(group.actors.length!==new Set(roots).size)throw Error('A handoff receiver is missing.');
            group.actors[0].start=copy(recipe);
            group.beats=recipe.steps.map(step=>({id:`cue:${step.id}`,name:step.kind==='handoff'?'Hand over prop':step.key||step.kind,wait:0,actions:[{actorId:group.actors[0].id,delay:0,step:copy(step)}]}));
            const clip=await this._compileSceneChoreography(group,options.actionId);
            clip.recipe={...clip.recipe,sequence:copy(recipe),spec:{kind:'sequence',rootId:rig.root.id}};delete clip.recipe.choreography;
            let view=recipe.view;
            clip.schedule.forEach((s,i)=>{const step=recipe.steps[i];if(step.kind==='turn')view=step.target;else if(step.kind==='travel-route')view=this._travelRouteEndView(step.route,view);
                s.id=step.id;s.index=i;s.view=view;});return clip;
        },
        _choreographyRig(rootId) {
            const item = available().find(item => item.id === rootId);
            if (!item) throw Error('A choreography character is missing. Assign its role to a character on this scene.');
            return this._refreshDetectedArmatureReference(item.armature) || item.armature;
        },
        _newSceneChoreography(rootIds = null) {
            const characters = rootIds ? available().filter(item => rootIds.includes(item.id)).slice(0,8) : available().slice(0,2);
            return {version:1, name:'Scene Choreography', actors:characters.map((item,index) => ({
                id:Utils.generateId('role'), name:`Character ${index+1}`, rootId:item.id, start:this._newCharacterSequence(item.armature)
            })), beats:[{id:Utils.generateId('cue'), name:'Step 1', wait:0, actions:[]}]};
        },
        async _choreographyExample(input,key) {
            if(key!=='receive-carry-return')throw Error('Choose a choreography example.');
            const recipe=copy(input),[giver,receiver]=recipe.actors;
            if(!giver||!receiver)throw Error('Choose two characters first.');
            const rig=this._choreographyRig(receiver.rootId),view=this._getUniversalCharacterCurrentViewSwitchKey(rig);
            if(!view.startsWith('side:'))throw Error('The carry-and-return example needs a side-view receiver. Other handoff views can be authored directly.');
            const start=this._crossViewAnchor(rig),outward=this._travelWaypointView('flip',view),dx=outward.endsWith('left')?-60:60;
            const choices=this._travelMovementChoices(await this._characterSequenceCatalog(rig,outward),outward);
            if(!choices.length)throw Error('This character has no travelling movement.');
            const beat=(name,actor,step)=>({id:Utils.generateId('cue'),name,wait:0,actions:[{actorId:actor.id,delay:0,step}]});
            const give=(target,text)=>({...this._newCharacterSequenceStep('handoff'),duration:3,handoffReceiverRootId:target.rootId,handoffReceiverActorId:target.id,
                speechDraft:{text,provider:'local',voice:'',language:'en'}});
            const route={...this._newCharacterSequenceStep('travel-route'),route:{points:[
                {...this._newTravelWaypoint(),x:start.x+dx,y:start.y,key:choices[0].key,duration:2,turn:'flip'},
                {...this._newTravelWaypoint(),x:start.x,y:start.y,key:choices[0].key,duration:2}
            ]}};
            recipe.name='Receive, carry and return';recipe.actors.forEach(a=>{a.start=this._newCharacterSequence(this._choreographyRig(a.rootId));});
            recipe.beats=[beat('Receive',giver,give(receiver,'Please take this and bring it back.')),
                beat('Turn outward',receiver,{...this._newCharacterSequenceStep('turn'),target:outward,turnPosture:'current'}),
                beat('Carry and return',receiver,route),beat('Hand back',receiver,give(giver,'Here it is. Thank you.'))];
            return recipe;
        },
        _validateChoreography(recipe) {
            if (recipe?.version !== 1 || !Array.isArray(recipe.actors) || recipe.actors.length < 2 || recipe.actors.length > 8
                || !Array.isArray(recipe.beats) || !recipe.beats.length || recipe.beats.length > 20) throw Error('Use 2-8 characters and 1-20 steps.');
            const roles = new Set(), roots = new Set(), ids = new Set(), audios = new Set();
            for (const actor of recipe.actors) {
                if (!actor.id || roles.has(actor.id) || roots.has(actor.rootId)) throw Error('Each role must use a different character.');
                roles.add(actor.id); roots.add(actor.rootId); this._choreographyRig(actor.rootId);
            }
            for (const beat of recipe.beats) {
                if (!beat.id || ids.has(beat.id) || !Array.isArray(beat.actions)) throw Error('Invalid choreography step.');
                ids.add(beat.id); bounded(beat.wait,0,120,'Wait after step');
                if (beat.camera && beat.camera.mode !== 'hold') {
                    if (!['full','group','selected','actor','speaker'].includes(beat.camera.mode)) throw Error('Invalid camera shot.');
                    bounded(beat.camera.blend, .05, 10, 'Camera transition');
                    bounded(beat.camera.padding, 0, 100, 'Camera padding');
                    if(!['full-body','waist-up','close-up'].includes(beat.camera.framing || 'full-body'))throw Error('Choose a camera framing preset.');
                    if (beat.camera.mode === 'actor' && !roles.has(beat.camera.actorId)) throw Error('Choose a character for the camera.');
                    if (beat.camera.mode === 'selected' && (!Array.isArray(beat.camera.actorIds) || !beat.camera.actorIds.length || new Set(beat.camera.actorIds).size !== beat.camera.actorIds.length || beat.camera.actorIds.some(id=>!roles.has(id)))) throw Error('Select one or more camera characters.');
                    if (beat.camera.tracking !== undefined && typeof beat.camera.tracking !== 'boolean') throw Error('Invalid camera tracking setting.');
                    for(const property of ['adaptiveZoom','coverage'])if(beat.camera[property]!==undefined&&typeof beat.camera[property]!=='boolean')throw Error('Invalid camera option.');
                    bounded(beat.camera.smoothing ?? .3,0,1.5,'Camera tracking smoothing');
                    bounded(beat.camera.headroom ?? 0,0,35,'Headroom');
                    bounded(beat.camera.offset ?? 0,-35,35,'Horizontal framing offset');
                    bounded(beat.camera.lookAhead ?? 0,0,1.5,'Travel look ahead');
                    bounded(beat.camera.minZoom ?? .1,.05,10,'Minimum zoom');
                    bounded(beat.camera.maxZoom ?? 10,.1,20,'Maximum zoom');
                    if((beat.camera.minZoom ?? .1)>(beat.camera.maxZoom ?? 10))throw Error('Minimum zoom must not exceed maximum zoom.');
                    bounded(beat.camera.zoomSpeed ?? .35,.05,2,'Zoom change rate');
                    if (beat.camera.mode === 'speaker' && beat.actions.filter(item=>this._choreographySpeakingAction(item)).length !== 1) throw Error('Speaker camera needs exactly one speaking character in its step.');
                }
                const used = new Set();
                for (const item of beat.actions) {
                    if (!roles.has(item.actorId) || used.has(item.actorId)) throw Error('Assign at most one action per character per step.');
                    used.add(item.actorId); bounded(item.delay,0,120,'Action delay');
                    if (!item.step?.id || ids.has(item.step.id)) throw Error('Action IDs must be unique.');
                    ids.add(item.step.id);
                    for(const spoken of this._sequenceSpeechSteps([item.step]))if (spoken.speech?.audioId) {
                        if (audios.has(spoken.speech.audioId)) throw Error('Use each speech clip once. Duplicate its audio row for reuse.');
                        if (spoken.speech.timing !== 'wait' && !(item.step.kind==='travel-route'&&spoken.speech.timing==='continue')) throw Error('Choreography speech must finish before the next step.');
                        audios.add(spoken.speech.audioId);
                    }
                }
            }
            return recipe;
        },
        _choreographySnapshot(rigs) {
            const snapshot = this._armatureActionSnapshot(rigs[0]);
            snapshot.choreographyCamera = {frames:copy(this.stage.cameraKeyframes || []),enabled:this.stage.cameraEnabled};
            snapshot.choreographyTime = this.animations.currentTime;
            for (const rig of rigs) for (const obj of this._getArmatureViewTransitionObjects(rig) || []) {
                if (snapshot.states.has(obj.id)) snapshot.states.get(obj.id).view = ArmatureViewState.capture(obj);
            }
            return snapshot;
        },
        async _compileHandoffChoreography(input, actionId) {
            const recipe=copy(this._validateChoreography(input)),rigs=recipe.actors.map(a=>this._choreographyRig(a.rootId));
            const snapshot=this._choreographySnapshot(rigs),staging=window.app.conversations.staging;
            const combined={name:recipe.name,rootId:rigs[0].root.id,durationMs:0,schedule:[],actorSchedule:recipe.actors.map(a=>({actorId:a.id,steps:[]})),
                tracks:new Map(),originals:new Map(),additions:[],speech:[],routeSchedule:[],ownership:[],recipe:{version:1,choreography:recipe,spec:{kind:'choreography',rootId:rigs[0].root.id},controls:{},activityOriginals:{}}};
            const warnings=[];
            let owned=null;
            const physicalHand=(rootId,hand)=>{const view=this._getUniversalCharacterCurrentViewSwitchKey(this._choreographyRig(rootId));
                return view.startsWith('side:')?`${(hand==='front-hand')===(view==='side:right')?'right':'left'}-hand`:hand;};
            const apply=clip=>{
                this.objects.objects.forEach(o=>{o.animations=[];});this.animations.originalStates=new Map();
                this._installArmatureAction(clip,0,'handoff-build');
                this.animations.applyAnimationsAtTime(clip.durationMs,{timelinePreview:true});this.objects._resolvePins();
            };
            try{
                for(const [index,beat]of recipe.beats.entries()){
                    const exchanges=beat.actions.filter(a=>a.step.kind==='handoff');
                    if(exchanges.length>1)throw Error('Use one shared prop exchange per choreography step.');
                    const entry=exchanges[0],step=entry?.step;
                    if(step?.handoffReceiverActorId)step.handoffReceiverRootId=recipe.actors.find(a=>a.id===step.handoffReceiverActorId)?.rootId||'';
                    const actors=recipe.actors.map((a,i)=>({...copy(a),start:index?this._newCharacterSequence(this._choreographyRig(a.rootId)):copy(a.start)}));
                    const cue=copy(beat);
                    if(entry){
                        if(step.headTurn)throw Error('Place handoff head turns in the preceding or following step.');
                        if(step.cycles!==1||step.kit)throw Error('Use one exchange per handoff step, without an activity kit.');
                        bounded(step.duration,2,8,'Handoff seconds');
                        const receiver=actors.find(a=>a.rootId===step.handoffReceiverRootId);
                        if(!receiver||receiver.id===entry.actorId)throw Error('Choose another choreography character to receive the prop.');
                        if(beat.actions.some(a=>a.actorId===receiver.id&&a.step.kind!=='wait'))throw Error('The receiver must hold their body pose during the handoff.');
                        cue.actions=cue.actions.map(a=>a.step.kind==='handoff'?{...a,step:{...a.step,kind:'wait',_timingName:'Hand over prop'}}:a);
                    }
                    const clip=await this._compileSceneChoreography({...recipe,actors,beats:[cue]},actionId,{handoffSegment:true});
                    apply(clip);
                    const occupied=new Map();
                    if(entry){
                        const giver=actors.find(a=>a.id===entry.actorId),receiver=actors.find(a=>a.rootId===step.handoffReceiverRootId);
                        for(const [i,actor]of [giver,receiver].entries()){
                            const key=i?'handoffReceiverHand':'handoffGiverHand',other=i?giver:receiver;
                            step[key]=staging.resolveHandoffHand(this._choreographyRig(actor.rootId),step[key]||'front-hand',this._crossViewAnchor(this._choreographyRig(other.rootId)).x);
                            occupied.set(actor.rootId,staging.handoffHand(this._choreographyRig(actor.rootId),step[key]).obj.id);
                        }
                        const pair=[giver,receiver].map(a=>({...a,staging:{view:this._getUniversalCharacterCurrentViewSwitchKey(this._choreographyRig(a.rootId)).replace(':','-'),
                            posture:this._snapshotArmaturePose(this._choreographyRig(a.rootId)).seatDepth?'seated':'standing'}}));
                        const turn={...step};
                        if(owned){
                            if(owned.rootId!==giver.rootId)throw Error('The next giver must be the current prop holder.');
                            const hand=staging.handoffHand(this._choreographyRig(giver.rootId),step.handoffGiverHand||'front-hand');
                            const view=this._getUniversalCharacterCurrentViewSwitchKey(this._choreographyRig(giver.rootId));
                            const expected=view.startsWith('side:')?`${(owned.anatomicalHand==='right-hand')===(view==='side:right')?'front':'back'}-hand`:owned.anatomicalHand;
                            if(step.handoffGiverHand!==expected)throw Error(`Pass the prop using the ${expected.replaceAll('-',' ')} that received it.`);
                            owned.handId=hand.obj.id;
                            turn.handoffGiverGripX=owned.grip.x*100;turn.handoffGiverGripY=owned.grip.y*100;
                        }
                        const shared=await staging.handoffClip({groupId:recipe.id||'choreography'},
                            {turn,giver:pair[0],receiver:pair[1],actors:pair,seconds:step.duration,continuation:true,dimensions:owned?.prop},entry.delay*1000,clip.durationMs);
                        clip.durationMs=Math.max(clip.durationMs,shared.durationMs);
                        const generatedProp=shared.additions[0],prop=owned?.prop||generatedProp;
                        const transfer=combined.durationMs+shared.validation.transferMs;
                        if(!owned)combined.ownership.push({rootId:giver.rootId,hand:step.handoffGiverHand,anatomicalHand:physicalHand(giver.rootId,step.handoffGiverHand),grip:copy(shared.validation.grips[0]),propId:prop.id,start:combined.durationMs,end:transfer,stepId:step.id});
                        else combined.ownership.at(-1).end=transfer;
                        combined.ownership.push({rootId:receiver.rootId,hand:step.handoffReceiverHand,anatomicalHand:physicalHand(receiver.rootId,step.handoffReceiverHand),grip:copy(shared.validation.grips[1]),propId:prop.id,start:transfer,end:combined.durationMs+clip.durationMs,stepId:step.id});
                        if(!owned){prop.sceneAsset.sharedHandoff=true;clip.additions.push(prop);shared.originals.get(prop.id).visible=false;}
                        for(const [id,tracks]of shared.tracks){
                            const target=id===generatedProp.id?prop.id:id;
                            if(!clip.tracks.has(target))clip.tracks.set(target,[]);clip.tracks.get(target).push(...tracks);
                            if(!clip.originals.has(target))clip.originals.set(target,copy(shared.originals.get(id)));
                        }
                        const source=staging.handoffHand(this._choreographyRig(receiver.rootId),step.handoffReceiverHand||'front-hand');
                        const anatomicalHand=physicalHand(receiver.rootId,step.handoffReceiverHand);
                        owned={rootId:receiver.rootId,hand:step.handoffReceiverHand||'front-hand',anatomicalHand,handId:source.obj.id,grip:shared.validation.grips[1],prop};
                        prop.sceneAsset.sharedHandoffHands=[...new Set([...(prop.sceneAsset.sharedHandoffHands||[]),...pair.map((a,i)=>staging.handoffHand(this._choreographyRig(a.rootId),step[i?'handoffReceiverHand':'handoffGiverHand']||'front-hand').obj.id)])];
                        apply(clip);
                    }else if(owned){
                        const ownerAction=beat.actions.find(a=>actors.find(actor=>actor.id===a.actorId)?.rootId===owned.rootId)?.step;
                        if(ownerAction&&(ownerAction.kit||/clap|read|write|type|eat|drink|phone|microphone|carry|sweep|mop/.test(ownerAction.key||'')))warnings.push({message:`${beat.name}: ${actors.find(a=>a.rootId===owned.rootId)?.name||'Character'} holds a prop in the ${owned.hand.replaceAll('-',' ')}. Check that ${ownerAction.key||ownerAction.kind} leaves that hand available.`});
                        const frames=[],count=Math.max(2,Math.ceil(clip.durationMs/33));
                        for(let n=0;n<=count;n++){
                            this.animations.applyAnimationsAtTime(clip.durationMs*n/count,{timelinePreview:true});this.objects._resolvePins();
                            const rig=this._choreographyRig(owned.rootId),view=this._getUniversalCharacterCurrentViewSwitchKey(rig);
                            const key=view.startsWith('side:')?`${(owned.anatomicalHand==='right-hand')===(view==='side:right')?'front':'back'}-hand`:owned.anatomicalHand;
                            const hand=staging.handoffHand(rig,key);
                            if(!hand)throw Error('This turn has no compatible prop-holding hand.');
                            owned.hand=key;owned.handId=hand.obj.id;
                            const point=this._getArmatureEndEffectorWorldPosition(hand);
                            frames.push({t:n/count,values:{x:point.x-owned.prop.width*owned.grip.x,y:point.y-owned.prop.height*owned.grip.y,visible:true}});
                        }
                        clip.tracks.set(owned.prop.id,[{id:Utils.generateId('anim'),name:'Held shared prop',type:'continuous',delay:0,repeat:'1',trigger:'onLoad',afterPlayback:'keep',params:{duration:clip.durationMs/1000},
                            generated:{type:'continuous',duration:clip.durationMs,segmentEasing:'linear',properties:['x','y','visible'],keyframes:frames}}]);
                        Object.assign(owned.prop,frames.at(-1).values);
                        combined.ownership.at(-1).end=combined.durationMs+clip.durationMs;
                    }
                    if(owned)occupied.set(owned.rootId,owned.handId);
                    for(const speech of clip.speech)if(occupied.has(speech.rootId)){
                        for(const config of Array.isArray(speech.animation?.generated)?speech.animation.generated:[speech.animation?.generated])if(config){
                            config.reservedHandObjectIds=[...new Set([...(config.reservedHandObjectIds||[]),occupied.get(speech.rootId)])];
                            if(config.performance){config.performance.bodyIntensity=0;config.performance.bodyMovement=false;}
                        }
                    }
                    const offset=combined.durationMs;
                    combined.routeSchedule.push(...(clip.routeSchedule||[]).map(e=>({...e,start:e.start+offset,motionEnd:(e.motionEnd??e.end)+offset,end:e.end+offset})));
                    warnings.push(...(clip.validation?.warnings||[]));
                    for(const [id,tracks]of clip.tracks){if(!combined.tracks.has(id))combined.tracks.set(id,[]);combined.tracks.get(id).push(...tracks.map(t=>({...copy(t),delay:(Number(t.delay)||0)+offset})));}
                    clip.originals.forEach((v,id)=>{if(!combined.originals.has(id))combined.originals.set(id,copy(v));});
                    for(const obj of clip.additions)if(!combined.additions.some(o=>o.id===obj.id))combined.additions.push(obj);
                    combined.speech.push(...clip.speech.map(s=>({...s,startMs:s.startMs+offset,endMs:s.endMs+offset,gestureWindows:s.gestureWindows?.map(w=>({...w,startMs:w.startMs+offset,endMs:w.endMs+offset}))})));
                    combined.durationMs+=clip.durationMs;
                    combined.schedule.push({id:beat.id,name:beat.name,start:offset,end:combined.durationMs});
                    combined.actorSchedule.forEach(a=>a.steps.push({start:offset,end:combined.durationMs}));
                    this.objects.objects.forEach(o=>{o.animations=[];});this.animations.originalStates=null;
                }
                combined.recipe.schedule=combined.schedule;combined.validation=this._validateArmatureCompiledTracks(combined.tracks);
                combined.validation.warnings.push(...warnings);combined.recipe.ownership=copy(combined.ownership);
                for(const prop of combined.additions)if(prop.sceneAsset?.sharedHandoff&&combined.originals.has(prop.id))combined.originals.get(prop.id).sceneAsset=copy(prop.sceneAsset);
                if(combined.validation.errors.length)throw Error(combined.validation.errors[0].message);
                return combined;
            }finally{this._restoreArmatureActionSnapshot(snapshot,true);}
        },
        async _compileSceneChoreography(input, actionId = null, options = {}) {
            if (this._choreographyCompiling || this.animations.isPlaying || this.animations._exportingVideo) throw Error('Stop playback first.');
            if(!options.handoffSegment&&input.beats?.some(b=>b.actions.some(a=>a.step?.kind==='handoff')))return this._compileHandoffChoreography(input,actionId);
            const recipe = copy(this._validateChoreography(input));
            const rigs = recipe.actors.map(actor => this._choreographyRig(actor.rootId));
            const snapshot = this._choreographySnapshot(rigs);
            const oldRig = this._currentArmature;
            this._choreographyCompiling = true;
            try {
                const drafts = [], lengths = recipe.beats.map(() => 0);
                // Measure actual compiled duration, including repeats, transitions and speech.
                for (const [index, actor] of recipe.actors.entries()) {
                    const beforeStep = {}, sequence = {...copy(actor.start), captionStyle:copy(actor.start.captionStyle?.enabled ? {...recipe.captionStyle,...actor.start.captionStyle} : recipe.captionStyle), name:recipe.name, steps:[]};
                    recipe.beats.forEach(beat => {
                        const item = beat.actions.find(item => item.actorId === actor.id);
                        const step = item ? copy(item.step) : {...this._newCharacterSequenceStep('wait'), duration:.05};
                        sequence.steps.push(step); beforeStep[step.id] = (item?.delay || 0)*1000;
                    });
                    const measured = await this._compileCharacterSequence(rigs[index],sequence,{actionId,beforeStep});
                    measured.schedule.forEach((entry,i) => { lengths[i] = Math.max(lengths[i],entry.end-(measured.schedule[i-1]?.end || 0)); });
                    drafts.push({rig:rigs[index],sequence,beforeStep,measured,actor});
                }
                let cursor = 0;
                const schedule = recipe.beats.map((beat,i) => { const start = cursor; cursor += lengths[i]+beat.wait*1000; return {id:beat.id,name:beat.name,start,end:cursor}; });
                const combined = {name:recipe.name,rootId:rigs[0].root.id,durationMs:cursor,schedule,tracks:new Map(),originals:new Map(),additions:[],speech:[],routeSchedule:[],
                    recipe:{version:1,choreography:recipe,schedule,spec:{kind:'choreography',rootId:rigs[0].root.id},controls:{},activityOriginals:{}}};
                combined.actorSchedule=drafts.map(draft=>({actorId:draft.actor.id,steps:draft.measured.schedule.map((entry,i)=>{
                    const previous=draft.measured.schedule[i-1]?.end || 0;
                    return {start:schedule[i].start+draft.beforeStep[draft.sequence.steps[i].id],end:schedule[i].start+entry.end-previous};
                })}));
                const warnings=[];
                for (const draft of drafts) {
                    const stepEnds = Object.fromEntries(draft.sequence.steps.map((step,i)=>[step.id,schedule[i].end]));
                    const clip = await this._compileCharacterSequence(draft.rig,draft.sequence,{actionId,beforeStep:draft.beforeStep,stepEnds});
                    for (const [id,tracks] of clip.tracks) {
                        if (combined.tracks.has(id)) throw Error('Characters share animated parts. Use separate character rigs.');
                        combined.tracks.set(id,tracks);
                    }
                    clip.originals.forEach((value,id)=>combined.originals.set(id,value));
                    combined.additions.push(...clip.additions); combined.speech.push(...clip.speech);
                    combined.routeSchedule.push(...(clip.routeSchedule||clip.schedule).map(e=>({...e,rootId:draft.rig.root.id})));
                    warnings.push(...(clip.validation?.warnings||[]));
                }
                combined.validation = this._validateArmatureCompiledTracks(combined.tracks);
                combined.validation.warnings.push(...warnings);
                if (combined.validation.errors.length) throw Error(combined.validation.errors[0].message);
                return combined;
            } finally {
                this._restoreArmatureActionSnapshot(snapshot,true); this._currentArmature = oldRig;
                this._choreographyCompiling = false;
            }
        },
        _validateChoreographyPlacement(clip,start,actionId) {
            bounded(start,0,86400000,'Timeline start');
            const speechIds = new Set(clip.speech.map(entry=>entry.audioId));
            for (const id of clip.tracks.keys()) for (const track of this.objects.getObjectById(id)?.animations || []) {
                if (actionId && track._armatureActionId === actionId) continue;
                const configs = (Array.isArray(track.generated) ? track.generated : [track.generated]).filter(Boolean);
                if (configs.length && configs.every(config=>config.type==='audio-lip-sync' && speechIds.has(config.audioId))) continue;
                if ((Number(track.delay)||0) < start+clip.durationMs && (Number(track.delay)||0)+this._armatureTrackDuration(track) > start)
                    throw Error('Another animation overlaps a choreography character. Move the timeline start or remove the conflicting clip.');
            }
        },
        _installSceneChoreography(clip,start,id,previous=null,temporary=false) {
            this._validateChoreographyPlacement(clip,start,previous?.id);
            const hasCamera=clip.recipe.choreography.beats.some(beat=>beat.camera && beat.camera.mode!=='hold');
            if(hasCamera)this._validateChoreographyCameraWindow(start,clip.durationMs,previous?.id);
            const snapshot=this._choreographySnapshot(clip.recipe.choreography.actors.map(actor=>this._choreographyRig(actor.rootId)));
            const audio=this._snapshotCharacterSequenceAudio();
            try {
                if (previous) this._removeArmatureActionTracks(previous);
                const tracks=this._installArmatureAction(clip,start,id);
                this._installCharacterSequenceSpeech(clip,start,id,{temporary});
                this._installChoreographyCamera(clip,start,id,previous?.id,temporary);
                if(!temporary){const installed=this._getArmatureRecordedAction(id);if(installed?.recipe){const fingerprint=this._choreographyCameraFingerprint(installed);this._getArmatureRecordedAction(id).recipe.cameraFingerprint=fingerprint;}}
                return tracks;
            } catch(error) { this._restoreArmatureActionSnapshot(snapshot,true);this._restoreCharacterSequenceAudio(audio);throw error; }
        },
        _installChoreographyCamera(clip,start,id,previousId,temporary) {
            const recipe=clip.recipe.choreography;
            const existing=(this.stage.cameraKeyframes || []).filter(frame=>!previousId || frame.choreographyId!==previousId);
            if (!recipe.beats.some(beat=>beat.camera && beat.camera.mode!=='hold')) {this.stage.cameraKeyframes=this._composeChoreographyCameras(existing);return;}
            const rigs=recipe.actors.map(actor=>this._choreographyRig(actor.rootId)),snapshot=this._choreographySnapshot(rigs);
            const frames=[],full={x:0,y:0,w:this.stage.width,h:this.stage.height};let current=full,entryWeight=1;
            const add=(offset,rect,easing='easeInOut',weight=entryWeight)=>{
                const frame={...rect,time:start+offset,easing,choreographyId:id,choreographyOffset:offset,choreographyPreview:temporary,choreographyEntryWeight:weight,choreographyRawFrame:{...rect}};
                if(frames.at(-1)?.time===frame.time) {
                    if(['x','y','w','h'].every(key=>frames.at(-1)[key]===frame[key]))return;
                    frames.pop();
                }
                frames.push(frame);
            };
            try {
                add(0,full);
                recipe.beats.flatMap((beat,index)=>this._choreographyCameraShots(recipe,beat,clip.schedule[index])).forEach(({beat,cue,segment})=>{
                    add(segment.start,current);
                    if(cue && cue.mode!=='hold') {
                        let target=full;
                        if(cue.mode!=='full') {
                            const actorId=cue.mode==='speaker'?beat.actions.find(item=>this._choreographySpeakingAction(item))?.actorId:cue.actorId;
                            const selected=cue.mode==='group'?recipe.actors:recipe.actors.filter(actor=>cue.mode==='selected'?cue.actorIds.includes(actor.id):actor.id===actorId);
                            if(cue.tracking) {
                                const samples=this._choreographyTrackingFrames(selected,cue,start,segment,clip.durationMs);
                                const entry=current,blend=Math.min(cue.blend*1000,segment.end-segment.start);
                                for(const sample of samples) {
                                    const progress=Math.min(1,(sample.offset-segment.start)/blend);
                                    const ease=progress<.5?2*progress*progress:1-Math.pow(-2*progress+2,2)/2;
                                    target=Object.fromEntries(['x','y','w','h'].map(key=>[key,entry[key]+(sample.rect[key]-entry[key])*ease]));
                                    add(sample.offset,target,'linear',entryWeight*(1-ease));
                                }
                                current=target;entryWeight=0;
                                return;
                            }
                            const sampleAt=segment.start+Math.min(cue.blend*1000,segment.end-segment.start);
                            target=this._choreographyCameraFrame(selected,cue,start+sampleAt);
                        }
                        entryWeight=0;add(segment.start+Math.min(cue.blend*1000,segment.end-segment.start),target);current=target;
                    }
                    add(segment.end,current);
                });
            } finally {this._restoreArmatureActionSnapshot(snapshot,true);}
            // A full-stage lead-in prevents the first shot appearing before the group starts.
            if(start>0)frames.unshift({...full,time:0,easing:'linear',choreographyId:id,choreographyOffset:-start,choreographyLead:true,choreographyPreview:temporary});
            this.stage.cameraKeyframes=this._composeChoreographyCameras([...existing,...frames]);this.stage.cameraEnabled=true;
        },
        _validateChoreographyCameraWindow(start,duration,ignoreId=null) {
            const windows=new Map();
            for(const frame of this.stage.cameraKeyframes || []) {
                if(frame.choreographyId && frame.choreographyId===ignoreId)continue;
                if(frame.choreographyLead || frame.cameraSeed)continue;
                const owner=frame.choreographyId || (frame.characterCameraId?`character:${frame.characterCameraId}`:`manual:${frame.manualCameraSectionId || 'default'}`);
                const window=windows.get(owner) || {start:Infinity,end:-Infinity};
                window.start=Math.min(window.start,frame.time);window.end=Math.max(window.end,frame.time);windows.set(owner,window);
            }
            for(const [owner,window] of windows)if(owner.startsWith('manual:') ? start<=window.end && start+duration>=window.start : start<window.end && start+duration>window.start)throw Error('Camera sequences overlap. Place this sequence outside the existing camera section.');
        },
        _composeChoreographyCameras(frames) {
            const groups=new Map(),manual=frames.filter(frame=>!frame.choreographyId);
            for(const frame of frames)if(frame.choreographyId && !frame.choreographyLead) {
                if(!groups.has(frame.choreographyId))groups.set(frame.choreographyId,[]);
                groups.get(frame.choreographyId).push(frame);
            }
            const ordered=[...groups.values()].map(group=>group.sort((a,b)=>a.time-b.time)).sort((a,b)=>a[0].time-b[0].time);
            const full={x:0,y:0,w:this.stage.width,h:this.stage.height},result=[...manual];let last=full;
            for(const group of ordered) {
                const preceding=manual.filter(frame=>frame.time<group[0].time || frame.characterCameraId&&frame.time===group[0].time).sort((a,b)=>a.time-b.time).at(-1);
                if(preceding && (!Number.isFinite(last.time) || preceding.time>last.time))last=preceding;
                for(const frame of group) {
                    const raw=frame.choreographyRawFrame || frame,weight=frame.choreographyEntryWeight ?? (frame.choreographyOffset===0?1:0);
                    const rect=Object.fromEntries(['x','y','w','h'].map(key=>[key,raw[key]+weight*(last[key]-full[key])]));
                    result.push({...frame,...rect,choreographyEntryWeight:weight,choreographyRawFrame:Object.fromEntries(['x','y','w','h'].map(key=>[key,raw[key]]))});
                }
                last=result.at(-1);
            }
            const first=ordered[0]?.[0];
            if(first?.time>0 && !manual.some(frame=>frame.time<=first.time))result.push({...full,time:0,easing:'linear',choreographyId:first.choreographyId,choreographyOffset:-first.time,choreographyLead:true,choreographyPreview:first.choreographyPreview});
            return result.sort((a,b)=>a.time-b.time);
        },
        _choreographyCameraShots(recipe,beat,segment) {
            const cue=beat.camera;
            if(!cue?.coverage || segment.end-segment.start<4000)return [{beat,cue,segment}];
            const speaker=beat.actions.find(item=>this._choreographySpeakingAction(item))?.actorId;
            const listener=recipe.actors.find(actor=>actor.id!==speaker)?.id;
            if(!speaker || !listener)return [{beat,cue:{...cue,mode:'group'},segment}];
            const length=segment.end-segment.start;
            return [[0,.2,'group',null,'full-body'],[.2,.65,'actor',speaker,'waist-up'],[.65,.85,'actor',listener,'close-up'],[.85,1,'group',null,'full-body']].map(([from,to,mode,actorId,framing])=>({beat,cue:{...cue,coverage:false,mode,actorId,framing},segment:{start:segment.start+length*from,end:segment.start+length*to}}));
        },
        _applyChoreographyCameraPreset(recipe,preset) {
            if(!['speaker','coverage','group'].includes(preset))throw Error('Choose a conversation camera preset.');
            for(const beat of recipe.beats){
                const speakers=beat.actions.filter(item=>this._choreographySpeakingAction(item));
                beat.camera={mode:preset==='group'||speakers.length!==1?'group':'speaker',framing:preset==='group'?'full-body':'waist-up',blend:.6,padding:20,tracking:true,smoothing:.3,coverage:preset==='coverage'&&speakers.length===1};
            }
        },
        _choreographyCameraFingerprint(action) {
            const recipe=action.recipe.choreography,rigs=recipe.actors.map(actor=>this._choreographyRig(actor.rootId));
            const snapshot=this._choreographySnapshot(rigs),time=this.animations.currentTime;
            try {
                const samples=[action.start,action.start+action.durationMs/2,action.start+action.durationMs].map(t=>{
                    this.animations.applyAnimationsAtTime(t,{timelinePreview:true});this.objects._resolvePins();
                    return rigs.map(rig=>Object.values(this._getArmatureBounds(rig)).map(value=>Math.round(value*100)/100));
                });
                return JSON.stringify({stage:[this.stage.width,this.stage.height],samples,duration:action.durationMs});
            } finally {this._restoreArmatureActionSnapshot(snapshot,true);this.animations.currentTime=time;}
        },
        _checkChoreographyCameraRefresh(checkLiveEdit=false) {
            if(this._choreographyCompiling || this._characterSequenceCompiling || this.animations.isPlaying || this.animations._exportingVideo || document.querySelector('.scene-choreography'))return;
            const ids=new Set((this.stage.cameraKeyframes || []).filter(frame=>!frame.choreographyPreview).map(frame=>frame.choreographyId).filter(Boolean));
            for(const id of ids){
                const action=this._getArmatureRecordedAction(id);if(!action?.recipe?.cameraFingerprint)continue;
                let changed=!!action.recipe.speechNeedsRefresh;
                try{if(checkLiveEdit){
                    const rigs=action.recipe.choreography.actors.map(actor=>this._choreographyRig(actor.rootId)),snapshot=this._choreographySnapshot(rigs);
                    const geometry=()=>rigs.map(rig=>({x:rig.root.x,y:rig.root.y,b:this._getArmatureBounds(rig)}));
                    const before=geometry();
                    try{this.animations.applyAnimationsAtTime(this.animations.currentTime,{timelinePreview:true});this.objects._resolvePins();const expected=geometry();changed ||= before.some((item,i)=>Math.abs(item.x-expected[i].x)>.1||Math.abs(item.y-expected[i].y)>.1||Object.keys(item.b).some(key=>Math.abs(item.b[key]-expected[i].b[key])>.1));}
                    finally{this._restoreArmatureActionSnapshot(snapshot,true);}
                }
                changed ||= action.recipe.cameraFingerprint!==this._choreographyCameraFingerprint(action);}catch(_){changed=true;}
                const live=this._getArmatureRecordedAction(id);
                if(changed && live && !live.recipe.cameraNeedsRefresh){live.recipe.cameraNeedsRefresh=true;Utils.showToast('Choreography camera needs refresh. Open its timeline action and choose Update Timeline.','warning');}
            }
        },
        _choreographySubjectBounds(rig,framing) {
            const full=this._getArmatureBounds(rig);
            if(!framing || framing==='full-body')return full;
            const head=rig.parts?.['head-neck']?.obj || this.animations._getSvgAfricanPremiumHeadObject(rig.root);
            const hb=head?.getBounds?.(),torso=(rig.parts?.torso?.obj || rig.root).getBounds?.();
            if(!hb || !torso)throw Error('This character does not have head and torso bounds for portrait framing.');
            if(framing==='close-up')return {minX:hb.x,minY:hb.y,maxX:hb.right ?? hb.x+hb.width,maxY:hb.bottom ?? hb.y+hb.height};
            const map=this._getArmatureJointMap(rig),waist=map.waist;
            const point=waist?.obj?.getJointWorldPosition?.(waist.jt);
            const bottom=Number.isFinite(point?.y)?point.y:torso.bottom ?? torso.y+torso.height;
            return {minX:Math.min(hb.x,torso.x),minY:Math.min(hb.y,torso.y),maxX:Math.max(hb.right ?? hb.x+hb.width,torso.right ?? torso.x+torso.width),maxY:Math.max(hb.bottom ?? hb.y+hb.height,bottom)};
        },
        _choreographyCameraFrame(actors,cue,time,withBounds=false) {
            this.animations.applyAnimationsAtTime(time,{timelinePreview:true});this.objects._resolvePins();
            const bounds=actors.map(actor=>this._choreographySubjectBounds(this._choreographyRig(actor.rootId),cue.framing));
            const minX=Math.min(...bounds.map(b=>b.minX)),maxX=Math.max(...bounds.map(b=>b.maxX));
            const minY=Math.min(...bounds.map(b=>b.minY)),maxY=Math.max(...bounds.map(b=>b.maxY));
            const aspect=this.stage.width/this.stage.height,pad=1+cue.padding/100;
            const offset=(cue.offset || 0)/100,headroom=(cue.headroom || 0)/100;
            const w=Math.max(this.stage.width*.05,(maxX-minX)*pad/(1-2*Math.abs(offset)),(maxY-minY)*pad*aspect/(1-2*headroom)),h=w/aspect;
            const rect={x:(minX+maxX-w)/2+w*offset,y:(minY+maxY-h)/2-h*headroom,w,h};
            if(!Object.values(rect).every(Number.isFinite))throw Error('Cannot frame the selected characters.');
            return withBounds?{rect,bounds:{minX,maxX,minY,maxY}}:rect;
        },
        _choreographyTrackingFrames(actors,cue,start,segment,duration) {
            // Bake bounded samples into ordinary camera frames for seek/export parity.
            const count=Math.max(1,Math.ceil((segment.end-segment.start)/Math.max(50,duration/1800)));
            const interval=(segment.end-segment.start)/count,samples=[];
            for(let index=0;index<=count;index++) {
                const offset=segment.start+index*interval;
                samples.push({offset,...this._choreographyCameraFrame(actors,cue,start+offset,true)});
            }
            // One shot size avoids zoom pumping as limbs swing. Center smoothing is
            // constrained to keep every selected subject inside the sampled frame.
            const radius=Math.ceil((cue.smoothing ?? .3)*1000/Math.max(1,interval));
            const fixedWidth=Math.max(...samples.map(sample=>sample.rect.w));
            const widths=samples.map((sample,index)=>cue.adaptiveZoom?Math.max(this.stage.width/(cue.maxZoom ?? 10),...samples.slice(Math.max(0,index-radius),Math.min(samples.length,index+radius+1)).map(s=>s.rect.w)):fixedWidth);
            if(cue.adaptiveZoom){
                const decay=Math.exp(-(cue.zoomSpeed ?? .35)*interval/1000);
                // A two-pass envelope anticipates expansion and limits contraction without clipping subjects.
                for(let i=1;i<widths.length;i++)widths[i]=Math.max(widths[i],widths[i-1]*decay);
                for(let i=widths.length-2;i>=0;i--)widths[i]=Math.max(widths[i],widths[i+1]*decay);
                if(widths.some(w=>w>this.stage.width/(cue.minZoom ?? .1)))throw Error('Selected characters exceed the minimum zoom limit. Lower Minimum zoom or select fewer characters.');
            }
            return samples.map((sample,index)=>{
                const width=widths[index],height=width*this.stage.height/this.stage.width;
                const nearby=samples.slice(Math.max(0,index-radius),Math.min(samples.length,index+radius+1));
                const future=samples[Math.min(samples.length-1,index+Math.round((cue.lookAhead || 0)*1000/Math.max(1,interval)))];
                const cx=nearby.reduce((sum,s)=>sum+s.rect.x+s.rect.w/2,0)/nearby.length+(future.rect.x+future.rect.w/2-sample.rect.x-sample.rect.w/2);
                const cy=nearby.reduce((sum,s)=>sum+s.rect.y+s.rect.h/2,0)/nearby.length;
                const b=sample.bounds;
                return {offset:sample.offset,rect:{x:Math.max(b.maxX-width,Math.min(b.minX,cx-width/2)),y:Math.max(b.maxY-height,Math.min(b.minY,cy-height/2)),w:width,h:height}};
            });
        },
        _editChoreographyTiming(recipe,edit,deltaMs) {
            const beat=recipe.beats[edit.beat];if(!beat)throw Error('Step no longer exists.');
            const delta=Math.round(deltaMs/100)/10;
            if(edit.kind==='wait'){beat.wait=Math.max(0,Math.min(120,Math.round((beat.wait+delta)*10)/10));return;}
            const item=beat.actions.find(item=>item.actorId===edit.actorId);if(!item)throw Error('Action no longer exists.');
            if(edit.kind==='move')item.delay=Math.max(0,Math.min(120,Math.round((item.delay+delta)*10)/10));
            else if(edit.kind==='resize'){if(item.step.kind==='head-turn')throw Error('Edit Head Turn duration, hold or cycles to change its timing.');if(item.step.kind==='travel-route')throw Error('Edit the travel seconds for each waypoint to change route timing.');item.step.duration=Math.max(.05,Math.min(120,Math.round((item.step.duration+delta/(item.step.kind==='movement'?item.step.cycles || 1:1))*100)/100));}
        },
        _renderChoreographyOverview(host,clip,onSeek,onEdit=null) {
            host.replaceChildren();host.classList.add('choreography-overview');
            host.setAttribute('role','region');host.setAttribute('aria-label','Choreography timing overview');host.tabIndex=0;
            const grid=document.createElement('div');grid.className='choreography-overview-grid';host.append(grid);
            const recipe=clip.recipe.choreography;
            const row=name=>{const label=document.createElement('strong');label.className='choreography-lane-label';label.textContent=name;const lane=document.createElement('div');lane.className='choreography-lane';grid.append(label,lane);return lane;};
            const bar=(lane,start,end,label,kind,beat,edit=null)=>{
                const button=document.createElement('button');button.className=`choreography-time-block ${kind}`;
                button.style.left=`${100*start/clip.durationMs}%`;button.style.width=`${Math.max(.05,100*(end-start)/clip.durationMs)}%`;
                button.textContent=label;button.title=`${label}: ${(start/1000).toFixed(2)} - ${(end/1000).toFixed(2)} s`;
                button.setAttribute('aria-label',`Seek ${button.title}`);button.onclick=()=>onSeek(start,beat);lane.append(button);
                if(edit && onEdit){
                    const handle=document.createElement('span');handle.className='choreography-resize-handle';handle.title=edit.kind==='wait'?'Resize wait':'Resize action';handle.setAttribute('aria-hidden','true');button.append(handle);
                    button.title+='; drag to adjust, arrow keys move, Shift+arrows resize';
                    button.onkeydown=event=>{if(!['ArrowLeft','ArrowRight'].includes(event.key))return;event.preventDefault();onEdit({...edit,kind:edit.kind==='wait'?'wait':event.shiftKey?'resize':'move'},event.key==='ArrowRight'?100:-100);};
                    button.onpointerdown=event=>{
                        if(event.button!==0)return;
                        const x=event.clientX,width=lane.getBoundingClientRect().width,originalWidth=button.style.width,kind=edit.kind==='wait'?'wait':event.target===handle?'resize':'move';let delta=0;
                        button.setPointerCapture(event.pointerId);
                        const reset=()=>{button.style.opacity='1';button.style.transform='';button.style.width=originalWidth;button.onpointermove=null;button.onpointerup=null;};
                        button.onpointermove=move=>{delta=(move.clientX-x)/width*clip.durationMs;const snapped=Math.round(delta/100)*100;button.style.opacity=Math.abs(delta)>50?'.65':'1';if(kind==='move')button.style.transform=`translateX(${snapped/clip.durationMs*width}px)`;else button.style.width=`${Math.max(.5,parseFloat(originalWidth)+snapped/clip.durationMs*100)}%`;};
                        button.onpointercancel=reset;
                        button.onpointerup=up=>{button.releasePointerCapture(up.pointerId);reset();if(Math.abs(delta)<50)return;button.onclick=event=>event.preventDefault();onEdit({...edit,kind},delta);};
                    };
                }
            };
            const axis=row('Time / Step');
            clip.schedule.forEach((segment,i)=>bar(axis,segment.start,segment.end,`${(segment.start/1000).toFixed(1)}s / ${i+1}`,'time',i));
            for(const actor of recipe.actors) {
                const lane=row(actor.name),timing=clip.actorSchedule.find(item=>item.actorId===actor.id);
                recipe.beats.forEach((beat,i)=>{
                    const item=beat.actions.find(item=>item.actorId===actor.id),segment=clip.schedule[i],active=timing.steps[i];
                    if(!item){bar(lane,segment.start,segment.end,'Hold','hold',i);return;}
                    if(active.start>segment.start)bar(lane,segment.start,active.start,'Wait','hold',i);
                    const label=item.step.kind==='movement'||item.step.kind==='pose'?String(item.step.key).replaceAll('-',' '):item.step.kind;
                    bar(lane,active.start,active.end,label,'action',i,{actorId:actor.id,beat:i,kind:'move'});
                    if(active.end<segment.end)bar(lane,active.end,segment.end,'Hold','hold',i);
                });
                const speech=clip.speech.filter(entry=>entry.rootId===actor.rootId);
                if(speech.length){const audioLane=row(`${actor.name} / Speech`);speech.forEach(entry=>bar(audioLane,entry.startMs,entry.endMs,'Speech','speech',recipe.beats.findIndex(beat=>beat.actions.some(item=>this._sequenceSpeechSteps([item.step]).some(s=>s.id===entry.stepId)))));}
            }
            const waits=row('Wait after step');
            recipe.beats.forEach((beat,i)=>{const segment=clip.schedule[i];bar(waits,Math.max(segment.start,segment.end-Math.max(100,beat.wait*1000)),segment.end,`${beat.wait.toFixed(1)}s`,'hold',i,{beat:i,kind:'wait'});});
            const camera=row('Camera');
            recipe.beats.forEach((beat,i)=>{
                for(const {cue,segment} of this._choreographyCameraShots(recipe,beat,clip.schedule[i])){
                const mode=cue?.mode || 'hold';
                const target=mode==='actor'?recipe.actors.find(actor=>actor.id===cue.actorId)?.name:mode==='selected'?recipe.actors.filter(actor=>cue.actorIds.includes(actor.id)).map(actor=>actor.name).join(' + '):mode==='group'?'All characters':mode==='full'?'Full stage':mode==='speaker'?'Speaker':'Keep shot';
                const label=`${cue?.tracking && mode!=='hold'?'Track: ':''}${target}${!['hold','full'].includes(mode)?` / ${cue.framing || 'full-body'}`:''}`;
                bar(camera,segment.start,segment.end,label,mode==='hold'?'hold':'camera',i);
                }
            });
            const total=document.createElement('div');total.className='choreography-duration';total.textContent=`Total: ${(clip.durationMs/1000).toFixed(2)} s`;host.append(total);
            const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Travel, pauses, speech and prop ownership';details.append(summary);host.append(details);
            this._renderSequenceTimingLanes(details,clip,(time,id)=>onSeek(time,Math.max(0,recipe.beats.findIndex(beat=>beat.actions.some(a=>this._sequenceSpeechSteps([a.step]).some(s=>s.id===id))))));
        },
        async _openSceneChoreography(saved=null,action=null) {
            if (this._choreographyCompiling || this._characterSequenceCompiling || this.animations.isPlaying || this.animations._exportingVideo) return;
            this._closeCharacterSequence?.(); this._closeSceneChoreography?.(); this._stopArmatureClipPreview();
            if (available().length<2 && !saved) { Utils.showToast('Add at least two characters to this scene.','warning'); return; }
            const recipe=copy(saved || this._newSceneChoreography());
            let speechRealigned=false;
            for(const beat of recipe.beats)for(const item of beat.actions)if(item.step.speech?.audioId && item.step.speech.timing!=='wait' && !(item.step.kind==='travel-route'&&item.step.speech.timing==='continue')) {
                item.step.speech.timing='wait';speechRealigned=true;
            }
            const panel=document.createElement('section'); panel.className='character-sequence-editor scene-choreography';
            panel.setAttribute('role','dialog'); panel.setAttribute('aria-label','Scene Choreography');
            panel.innerHTML='<header><strong>Scene Choreography</strong><button data-min title="Minimize" aria-label="Minimize"><i class="fas fa-minus"></i></button><button data-close title="Close" aria-label="Close"><i class="fas fa-times"></i></button></header><div class="sequence-content"><div class="sequence-fields"><label>Name<input data-name maxlength="100"></label><label>Timeline start (s)<input data-start type="number" min="0" max="86400" step=".1"></label></div><div class="sequence-library"><select data-template aria-label="Choreography templates"><option value="">Saved choreographies</option></select><button data-load title="Load template" aria-label="Load template"><i class="fas fa-folder-open"></i></button><button data-save title="Save template" aria-label="Save template"><i class="fas fa-save"></i></button><button data-delete-template title="Delete template" aria-label="Delete template"><i class="fas fa-trash"></i></button></div><div data-actors></div><button data-add-actor><i class="fas fa-user-plus"></i> Add Character</button><div data-beats></div><button data-add-beat><i class="fas fa-plus"></i> Add Step</button><footer><button data-review><i class="fas fa-list-check"></i> Review Timing</button><button data-preview><i class="fas fa-play"></i> Preview</button><button data-stop title="Stop and restore" aria-label="Stop and restore"><i class="fas fa-stop"></i></button><button data-apply><i class="fas fa-check"></i> Add to Timeline</button></footer><input data-seek type="range" min="0" max="1" step=".001" value="0" aria-label="Choreography playhead"><div data-timing></div><p role="status" aria-live="polite"></p></div>';
            document.body.append(panel); const drag=Utils._bindFloatingPanelDrag(panel,panel.querySelector('header'));
            const q=name=>panel.querySelector(`[data-${name}]`), status=text=>{panel.querySelector('[role=status]').textContent=text;};
            q('name').value=recipe.name; q('start').value=(action?.start ?? this.animations.currentTime ?? 0)/1000;
            if(action)q('apply').lastChild.textContent=' Update Timeline';
            let busy=false, closed=false, clip=null, snapshot=null, audioSnapshot=null, raf=0, previewStart=0;
            const cache=new Map();
            const stop=()=>{cancelAnimationFrame(raf);raf=0;window.app.audioTimeline.pause();if(snapshot){const restored=this._restoreArmatureActionSnapshot(snapshot,true);if(restored)this._restoreCharacterSequenceAudio(audioSnapshot);snapshot=null;audioSnapshot=null;}q('seek').value=0;};
            const invalidate=(keepHistory=false)=>{this._cancelMultiPointEdit?.();stop();clip=null;q('timing').replaceChildren();if(keepHistory!==true){undo.length=0;redo.length=0;undoButton.disabled=true;redoButton.disabled=true;}};
            const work=async task=>{
                if(busy||closed)return;busy=true;panel.setAttribute('aria-busy','true');panel.querySelector('.sequence-content').inert=true;
                const controls=[...panel.querySelectorAll('input,select,textarea,button')]; const disabled=controls.map(control=>control.disabled);controls.forEach(control=>control.disabled=true);
                try{await task();}catch(error){stop();status(error.message);}finally{busy=false;panel.removeAttribute('aria-busy');panel.querySelector('.sequence-content').inert=false;controls.forEach((control,i)=>{if(control.isConnected)control.disabled=disabled[i];});undoButton.disabled=!undo.length;redoButton.disabled=!redo.length;}
            };
            const close=()=>{if(busy)return;this._cancelMultiPointEdit?.();stop();closed=true;this._sequenceSpeechAbort?.abort();drag?.();panel.remove();if(this._closeSceneChoreography===close)this._closeSceneChoreography=null;this._syncCharacterSequenceAudioLinks?.();};
            this._closeSceneChoreography=close;q('close').onclick=close;
            q('min').onclick=()=>{q('min').setAttribute('aria-label',q('min').title=q('min').title==='Minimize'?'Expand':'Minimize');panel.classList.toggle('is-collapsed');panel.querySelector('.sequence-content').hidden=panel.classList.contains('is-collapsed');};
            q('stop').onclick=()=>{stop();status('Stopped. Starting poses and positions restored.');};
            q('name').onchange=()=>{invalidate();recipe.name=q('name').value.trim()||'Scene Choreography';};q('start').onchange=invalidate;
            const icon=(symbol,title,run)=>{const button=document.createElement('button');button.title=title;button.setAttribute('aria-label',title);button.innerHTML=`<i class="fas fa-${symbol}"></i>`;button.onclick=()=>work(run);return button;};
            const field=(host,title,control)=>{const label=document.createElement('label');label.append(document.createTextNode(title),control);host.append(label);return control;};
            const numeric=(host,object,property,title,min,max,step=.1)=>{const input=document.createElement('input');input.type='number';input.min=min;input.max=max;input.step=step;input.value=object[property]??'';field(host,title,input).onchange=()=>{invalidate();object[property]=input.value===''&&['distance','travelAngle'].includes(property)?null:input.valueAsNumber;};};
            const libraries=()=>{try{const entries=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(entries)?entries.filter(item=>item && item.version===1 && Array.isArray(item.actors) && Array.isArray(item.beats)):[];}catch(_){return [];}};
            const refreshLibrary=()=>{q('template').replaceChildren(new Option('Saved choreographies',''));libraries().forEach(item=>q('template').append(new Option(item.name,item.id)));};
            const examples=document.createElement('div');examples.className='sequence-library';
            const example=document.createElement('select');example.setAttribute('aria-label','Choreography example');example.append(new Option('Receive, carry and return','receive-carry-return'));
            const use=document.createElement('button');use.type='button';use.title='Use editable example';use.setAttribute('aria-label',use.title);use.innerHTML='<i class="fas fa-plus"></i>';
            use.onclick=()=>work(async()=>{if(!confirm('Replace the draft steps with this editable example? Existing timeline clips remain unchanged until you update.'))return;
                invalidate(true);Object.assign(recipe,await this._choreographyExample(recipe,example.value));await render();status('Example loaded. Check spacing and review timing.');});
            examples.append(example,use);q('template').closest('.sequence-library').after(examples);
            const undo=[],redo=[],timingTools=document.createElement('div');timingTools.className='sequence-library';
            const undoButton=icon('undo','Undo timing or camera preset edit',async()=>{if(!undo.length)return;invalidate(true);redo.push(copy(recipe));Object.assign(recipe,undo.pop());await render();await prepare();});
            const redoButton=icon('redo','Redo timing or camera preset edit',async()=>{if(!redo.length)return;invalidate(true);undo.push(copy(recipe));Object.assign(recipe,redo.pop());await render();await prepare();});
            timingTools.append(undoButton,redoButton);q('timing').before(timingTools);
            const presetTools=document.createElement('div');presetTools.className='sequence-library';const preset=document.createElement('select');preset.setAttribute('aria-label','Conversation camera preset');
            for(const [value,label] of [['speaker','Follow speakers'],['coverage','Group, speaker and listener'],['group','Group throughout']])preset.append(new Option(label,value));
            presetTools.append(preset,icon('video','Apply camera preset to all steps',async()=>{const before=copy(recipe);invalidate(true);this._applyChoreographyCameraPreset(recipe,preset.value);undo.push(before);redo.length=0;await render();status('Camera preset applied to the draft. Update Timeline to save.');}));q('beats').before(presetTools);
            const render=async()=>{
                undoButton.disabled=!undo.length;redoButton.disabled=!redo.length;
                const actors=q('actors');actors.replaceChildren();
                this._mountSequenceCaptionStyle?.(actors,recipe,invalidate,'Shared caption style');
                for(const actor of recipe.actors){const row=document.createElement('div');row.className='sequence-fields';
                    const name=document.createElement('input');name.value=actor.name;name.maxLength=60;field(row,'Role',name).onchange=()=>{actor.name=name.value;invalidate();work(render);};
                    const select=document.createElement('select');select.append(new Option('Choose character',''));available().forEach(item=>select.append(new Option(item.name,item.id)));select.value=actor.rootId;
                    field(row,'Character',select).onchange=()=>{invalidate();actor.rootId=select.value;if(select.value)actor.start=this._newCharacterSequence(this._choreographyRig(select.value));cache.clear();work(render);};
                    numeric(row,actor.start,'x','Start X',-100000,100000,1);numeric(row,actor.start,'y','Start Y',-100000,100000,1);
                    row.append(icon('camera','Capture current position and pose',async()=>{invalidate();actor.start=this._newCharacterSequence(this._choreographyRig(actor.rootId));cache.clear();await render();}),icon('user-minus','Remove character role',async()=>{invalidate();recipe.actors=recipe.actors.filter(item=>item!==actor);recipe.beats.forEach(beat=>{
                        beat.actions=beat.actions.filter(item=>item.actorId!==actor.id);
                        if(beat.camera?.mode==='actor' && beat.camera.actorId===actor.id)beat.camera.mode='hold';
                        if(beat.camera?.mode==='selected'){beat.camera.actorIds=beat.camera.actorIds.filter(id=>id!==actor.id);if(!beat.camera.actorIds.length)beat.camera.mode='hold';}
                        if(beat.camera?.mode==='speaker' && !beat.actions.some(item=>this._choreographySpeakingAction(item)))beat.camera.mode='hold';
                    });await render();}));actors.append(row);
                    this._mountSequenceCaptionStyle?.(actors,actor.start,invalidate,`${actor.name}: caption override`,recipe.captionStyle);
                }
                const beats=q('beats');beats.replaceChildren();const views=new Map(recipe.actors.map(actor=>[actor.id,actor.start.view]));
                for(const [index,beat] of recipe.beats.entries()){
                    const band=document.createElement('section');band.className='choreography-beat';const header=document.createElement('div');header.className='sequence-library';
                    const title=document.createElement('strong');title.textContent=`${index+1}. ${beat.name}`;header.append(title,
                        icon('arrow-up','Move step up',async()=>{if(!index)return;invalidate();[recipe.beats[index-1],recipe.beats[index]]=[beat,recipe.beats[index-1]];await render();}),
                        icon('arrow-down','Move step down',async()=>{if(index===recipe.beats.length-1)return;invalidate();[recipe.beats[index+1],recipe.beats[index]]=[beat,recipe.beats[index+1]];await render();}),
                        icon('copy','Duplicate step',async()=>{if(recipe.beats.length>=20)return;invalidate();const duplicate=copy(beat);duplicate.id=Utils.generateId('cue');if(duplicate.camera?.mode==='speaker'){duplicate.camera.actorId=duplicate.actions.find(item=>this._choreographySpeakingAction(item))?.actorId;duplicate.camera.mode=duplicate.camera.actorId?'actor':'hold';}duplicate.actions.forEach(item=>{item.step=this._duplicateSequenceStep(item.step);});recipe.beats.splice(index+1,0,duplicate);await render();}),
                        icon('trash','Remove step; keep audio',async()=>{invalidate();recipe.beats.splice(index,1);await render();}));band.append(header);
                    const beatFields=document.createElement('div');beatFields.className='sequence-fields';const name=document.createElement('input');name.value=beat.name;field(beatFields,'Step name',name).onchange=()=>{invalidate();beat.name=name.value;};numeric(beatFields,beat,'wait','Wait after everyone (s)',0,120);band.append(beatFields);
                    const camera=document.createElement('select');
                    for(const [value,label] of [['hold','Keep shot'],['full','Full stage'],['group','All characters'],['selected','Selected characters'],['actor','Character'],['speaker','Speaking character']])camera.append(new Option(label,value));
                    camera.value=beat.camera?.mode || 'hold';field(beatFields,'Camera',camera).onchange=()=>{invalidate();beat.camera={blend:.6,padding:20,tracking:false,smoothing:.3,actorIds:recipe.actors.slice(0,2).map(actor=>actor.id),actorId:recipe.actors[0]?.id,...beat.camera,mode:camera.value};work(render);};
                    if(beat.camera && beat.camera.mode!=='hold') {
                        numeric(beatFields,beat.camera,'blend','Camera transition (s)',.05,10,.05);
                        if(beat.camera.mode!=='full')numeric(beatFields,beat.camera,'padding','Framing margin (%)',0,100,5);
                        if(beat.camera.mode!=='full') {
                            const framing=document.createElement('select');for(const [value,label] of [['full-body','Full body'],['waist-up','Waist up'],['close-up','Close up']])framing.append(new Option(label,value));
                            framing.value=beat.camera.framing || 'full-body';field(beatFields,'Framing',framing).onchange=()=>{invalidate();beat.camera.framing=framing.value;};
                            const composition=document.createElement('details'),summary=document.createElement('summary'),fields=document.createElement('div');summary.textContent='Composition';fields.className='sequence-fields';composition.append(summary,fields);beatFields.append(composition);
                            for(const [property,label,min,max,step] of [['headroom','Headroom (%)',0,35,5],['offset','Horizontal offset (%)',-35,35,5],['lookAhead','Travel look ahead (s)',0,1.5,.1]]){beat.camera[property]??=0;numeric(fields,beat.camera,property,label,min,max,step);if(property==='lookAhead'&&!beat.camera.tracking)fields.lastElementChild.querySelector('input').disabled=true;}
                            if(beat.camera.coverage){const coverage=document.createElement('input');coverage.type='checkbox';coverage.checked=true;field(fields,'Automatic conversation shots',coverage).onchange=()=>{invalidate();beat.camera.coverage=coverage.checked;};}
                        }
                        if(beat.camera.mode==='actor') {const target=document.createElement('select');target.append(new Option('Choose character',''));recipe.actors.forEach(actor=>target.append(new Option(actor.name,actor.id)));target.value=beat.camera.actorId;field(beatFields,'Camera character',target).onchange=()=>{invalidate();beat.camera.actorId=target.value;};}
                        if(beat.camera.mode==='selected') {
                            const subjects=document.createElement('fieldset'),legend=document.createElement('legend');subjects.className='choreography-camera-subjects';legend.textContent='Camera subjects';subjects.append(legend);beatFields.append(subjects);
                            recipe.actors.forEach(actor=>{const check=document.createElement('input');check.type='checkbox';check.checked=beat.camera.actorIds.includes(actor.id);field(subjects,actor.name,check).onchange=()=>{invalidate();beat.camera.actorIds=check.checked?[...beat.camera.actorIds,actor.id]:beat.camera.actorIds.filter(id=>id!==actor.id);};});
                        }
                        if(beat.camera.mode!=='full') {
                            const track=document.createElement('input');track.type='checkbox';track.checked=beat.camera.tracking===true;field(beatFields,'Track movement',track).onchange=()=>{invalidate();beat.camera.tracking=track.checked;work(render);};
                            if(beat.camera.tracking) {
                                const adaptive=document.createElement('input');adaptive.type='checkbox';adaptive.checked=!!beat.camera.adaptiveZoom;field(beatFields,'Adaptive group zoom',adaptive).onchange=()=>{invalidate();beat.camera.adaptiveZoom=adaptive.checked;work(render);};
                                if(beat.camera.adaptiveZoom){for(const [property,label,value,min,max,step] of [['minZoom','Minimum zoom (x)',.1,.05,10,.05],['maxZoom','Maximum zoom (x)',10,.1,20,.1],['zoomSpeed','Zoom change rate',.35,.05,2,.05]]){beat.camera[property]??=value;numeric(beatFields,beat.camera,property,label,min,max,step);}}
                                const smoothing=document.createElement('input'),value=document.createElement('output');smoothing.type='range';smoothing.min=0;smoothing.max=1.5;smoothing.step=.05;smoothing.value=beat.camera.smoothing ?? .3;smoothing.title='Camera smoothing window in seconds';value.textContent=`${Number(smoothing.value).toFixed(2)} s`;
                                field(beatFields,'Tracking smoothness',smoothing).oninput=()=>{invalidate();beat.camera.smoothing=smoothing.valueAsNumber;value.textContent=`${beat.camera.smoothing.toFixed(2)} s`;};smoothing.parentElement.append(value);
                            }
                        }
                    }
                    for(const actor of recipe.actors){const section=document.createElement('details');section.className='choreography-role';const summary=document.createElement('summary');const item=beat.actions.find(item=>item.actorId===actor.id);summary.textContent=`${actor.name}: ${item?item.step.kind:'Hold previous pose'}`;section.append(summary);band.append(section);
                        const fields=document.createElement('div');fields.className='sequence-fields';section.append(fields);const active=document.createElement('input');active.type='checkbox';active.checked=!!item;
                        field(fields,'Assign action',active).onchange=()=>{invalidate();if(active.checked)beat.actions.push({actorId:actor.id,delay:0,step:this._newCharacterSequenceStep('wait')});else beat.actions=beat.actions.filter(item=>item.actorId!==actor.id);work(render);};
                        if(!item)continue;section.open=true;const step=item.step, view=views.get(actor.id);const rig=available().find(item=>item.id===actor.rootId)?.armature;if(!rig)continue;
                        const kind=document.createElement('select');['wait','pose','movement','head-turn','turn','resize','travel-route','handoff'].forEach(value=>{const option=new Option(value==='handoff'?'Hand over prop':value==='head-turn'?'Head Turn':value==='turn'?'Body Turn':value==='travel-route'?'Multi-Point Travel':value,value);option.disabled=value==='head-turn'&&!this._supportsIndependentSvgHeadTurn(rig,view);kind.append(option);});kind.value=step.kind;
                        field(fields,'Action type',kind).onchange=()=>{if(!this._canChangeSequenceStepKind(step,kind.value,status)){kind.value=step.kind;return;}invalidate();this._setSequenceActionKind(step,kind.value,view);work(render);};numeric(fields,item,'delay','Start delay (s)',0,120);
                        if(step.kind==='travel-route'){await this._mountTravelRouteFields(section,step,{rig,view,invalidate,render:()=>work(render),status,recipe:actor.start,alive:()=>!closed&&beat.actions.includes(item)});views.set(actor.id,this._travelRouteEndView(step.route,view));continue;}
                        if(['pose','movement'].includes(step.kind)){
                            const cacheKey=`${actor.rootId}:${view}`;if(!cache.has(cacheKey))cache.set(cacheKey,await this._characterSequenceCatalog(rig,view));const choices=cache.get(cacheKey)[step.kind];
                            const search=document.createElement('input');search.type='search';field(fields,'Search actions',search);const select=document.createElement('select');field(fields,'Action',select);
                            const filter=()=>{select.replaceChildren(new Option('Choose action',''));choices.filter(entry=>entry.key===step.key||`${entry.key} ${entry.name}`.toLowerCase().includes(search.value.toLowerCase())).forEach(entry=>select.append(new Option(entry.name,entry.key)));select.value=step.key;};search.oninput=filter;filter();select.onchange=()=>{invalidate();step.key=select.value;step.upperBody=!!choices.find(entry=>entry.key===step.key)?.gesture;work(render);};
                            numeric(fields,step,'transition','Blend (s)',0,5);numeric(fields,step,'cycles','Cycles',1,20,1);
                            if(step.kind==='movement'){numeric(fields,step,'distance','Travel (px)',-10000,10000,10);numeric(fields,step,'travelAngle','Travel angle offset',-180,180,5);}
                            for(const [property,label]of[['upperBody','Arms only / keep posture'],['kit','Activity kit']]){const check=document.createElement('input');check.type='checkbox';check.checked=!!step[property];field(fields,label,check).onchange=()=>{invalidate();step[property]=check.checked;work(render);};}
                        }
                        if(step.kind==='turn'){const select=document.createElement('select');['front','back','side:left','side:right','front-3q:left','front-3q:right','back-3q:left','back-3q:right'].forEach(value=>select.append(new Option(value,value)));select.value=step.target;field(fields,'Target view',select).onchange=()=>{invalidate();step.target=select.value;work(render);};views.set(actor.id,step.target);}
                        if(step.kind==='resize'){step.size??=100;numeric(fields,step,'size','Size (%)',10,300,5);step.anchor??='feet';step.easing??='smooth';}
                        if(step.kind==='handoff')this._mountHandoffStepFields(section,step,{rig,invalidate,render:()=>work(render),status,actors:recipe.actors});
                        if(step.kind==='turn')this._mountBodyTurnFields(section,step,invalidate);
                        if(step.kind!=='head-turn')numeric(fields,step,'duration',step.kind==='movement'?'Seconds per cycle':'Duration (s)',step.kind==='handoff'?2:.05,step.kind==='handoff'?8:120);
                        if(step.kind!=='handoff')this._mountSequenceHeadTurnFields(section,step,{rig,view,invalidate,render:()=>work(render)});
                        this._mountSequenceSpeechFields?.(section,step,{rig,recipe:actor.start,invalidate,render:()=>work(render),status,alive:()=>!closed&&beat.actions.includes(item)});
                        const timing=[...section.querySelectorAll('.sequence-speech select')].find(select=>[...select.options].some(option=>option.value==='independent'));
                        if(timing){[...timing.options].filter(option=>option.value!=='wait').forEach(option=>option.remove());timing.value='wait';}
                        this._mountSequencePropFields?.(section,step,{invalidate,status,alive:()=>!closed&&beat.actions.includes(item)});
                    }
                    beats.append(band);
                }
            };
            q('add-actor').onclick=()=>work(async()=>{if(recipe.actors.length>=8)return;const item=available().find(item=>!recipe.actors.some(actor=>actor.rootId===item.id));if(!item)throw Error('Add another character to the stage first.');invalidate();recipe.actors.push({id:Utils.generateId('role'),name:`Character ${recipe.actors.length+1}`,rootId:item.id,start:this._newCharacterSequence(item.armature)});await render();});
            q('add-beat').onclick=()=>work(async()=>{if(recipe.beats.length>=20)return;invalidate();recipe.beats.push({id:Utils.generateId('cue'),name:`Step ${recipe.beats.length+1}`,wait:0,actions:[]});await render();});
            q('save').onclick=()=>work(async()=>{this._validateChoreography(recipe);const entries=libraries();entries.push({...copy(recipe),id:Utils.generateId('choreography')});localStorage.setItem(key,JSON.stringify(entries.slice(-30)));refreshLibrary();status('Choreography template saved.');});
            q('load').onclick=()=>work(async()=>{const saved=libraries().find(item=>item.id===q('template').value);if(!saved)return;invalidate();Object.assign(recipe,copy(saved));q('name').value=recipe.name;cache.clear();await render();});
            q('delete-template').onclick=()=>work(async()=>{localStorage.setItem(key,JSON.stringify(libraries().filter(item=>item.id!==q('template').value)));refreshLibrary();});
            const prepare=async()=>{stop();status('Preparing character actions and shared timing...');clip=await this._compileSceneChoreography(recipe,action?.id);this._renderChoreographyOverview(q('timing'),clip,(time,index)=>{
                if(busy)return;try{cancelAnimationFrame(raf);window.app.audioTimeline.pause();if(!snapshot)mountPreview();sample(previewStart+time);q('seek').value=time/clip.durationMs;status(`Step ${index+1}: ${(time/1000).toFixed(2)} s`);}catch(error){stop();status(error.message);}
            },(edit,delta)=>work(async()=>{
                const before=copy(recipe);invalidate(true);
                try{this._editChoreographyTiming(recipe,edit,delta);await prepare();undo.push(before);if(undo.length>50)undo.shift();redo.length=0;await render();status('Timing adjusted; snapped to 0.1 seconds. Update Timeline to save.');}
                catch(error){Object.assign(recipe,before);await render();await prepare();throw error;}
            }));};
            const sample=t=>{this.animations.currentTime=t;this.animations.applyAnimationsAtTime(t,{timelinePreview:true});this.objects._resolvePins();this.stage.requestRender();};
            const mountPreview=()=>{const rigs=recipe.actors.map(actor=>this._choreographyRig(actor.rootId));previewStart=bounded(Number(q('start').value)*1000,0,86400000,'Timeline start');snapshot=this._choreographySnapshot(rigs);audioSnapshot=this._snapshotCharacterSequenceAudio();this._installSceneChoreography(clip,previewStart,Utils.generateId('choreography-preview'),action,true);};
            q('review').onclick=()=>work(async()=>{await prepare();status(`Timing ready: ${(clip.durationMs/1000).toFixed(2)} seconds.`);q('timing').scrollIntoView({block:'nearest'});});
            q('preview').onclick=()=>work(async()=>{await prepare();mountPreview();const started=performance.now(),ids=new Set(clip.speech.map(entry=>entry.audioId));const tick=()=>{if(closed||this.animations.isPlaying||this.animations._exportingVideo){stop();return;}try{const t=Math.min(clip.durationMs,performance.now()-started);sample(previewStart+t);this._previewCharacterSequenceAudio(previewStart+t,true,ids);q('seek').value=t/clip.durationMs;if(t<clip.durationMs)raf=requestAnimationFrame(tick);else{stop();status('Preview complete. All starting poses restored.');}}catch(error){stop();status(error.message);}};raf=requestAnimationFrame(tick);status('Previewing choreography.');});
            q('seek').oninput=()=>{if(busy||!clip)return;try{cancelAnimationFrame(raf);window.app.audioTimeline.pause();if(!snapshot)mountPreview();sample(previewStart+Number(q('seek').value)*clip.durationMs);}catch(error){stop();status(error.message);}};
            q('apply').onclick=()=>work(async()=>{await prepare();const start=Number(q('start').value)*1000,id=action?.id||Utils.generateId('choreography');eventBus.emit('history:flush');this._installSceneChoreography(clip,start,id,action);action=this._getArmatureRecordedAction(id);eventBus.emit('timeline:update');eventBus.emit('objects:updated');eventBus.emit('history:push');window.app?._saveCurrentSceneAudioOnly?.();q('apply').lastChild.textContent=' Update Timeline';status(`Choreography added: ${(clip.durationMs/1000).toFixed(2)} seconds.`);});
            refreshLibrary();await work(render);
            if(speechRealigned)status('Speech was moved separately. Update Timeline to align it with its choreography step again.');
            else if(action?.recipe?.speechNeedsRefresh)status('Speech audio changed. Update Timeline to rebuild lip sync, step timing and camera cues.');
            else if(action?.recipe?.cameraNeedsRefresh)status('Character or stage dimensions changed. Review start positions, then Update Timeline to rebuild camera shots.');
        }
    });
    const edit = JointSystem.prototype._editArmatureRecordedAction;
    JointSystem.prototype._editArmatureRecordedAction = function(id) {
        const action=this._getArmatureRecordedAction(id);
        return action?.recipe?.choreography ? this._openSceneChoreography(action.recipe.choreography,action) : edit.call(this,id);
    };
    const restore=JointSystem.prototype._restoreArmatureActionSnapshot;
    JointSystem.prototype._restoreArmatureActionSnapshot=function(snapshot,...args) {
        const restored=restore.call(this,snapshot,...args);
        if(restored && snapshot.choreographyCamera) {
            this.stage.cameraKeyframes=copy(snapshot.choreographyCamera.frames);
            this.stage.cameraEnabled=snapshot.choreographyCamera.enabled;
            if(Number.isFinite(snapshot.choreographyTime))this.animations.currentTime=snapshot.choreographyTime;
            this.stage.requestRender();
        }
        return restored;
    };
    JointSystem.prototype._syncChoreographyCamera=function() {
        if(this._choreographyCompiling || this._characterSequenceCompiling)return;
        const frames=[],actions=new Map(),windows=new Map();
        for(const frame of this.stage.cameraKeyframes || []) {
            if(!frame.choreographyId || frame.choreographyPreview){frames.push(frame);continue;}
            if(!actions.has(frame.choreographyId))actions.set(frame.choreographyId,this._getArmatureRecordedAction(frame.choreographyId));
            const action=actions.get(frame.choreographyId);
            if(!action)continue;
            if(!frame.choreographyLead) {
                const window=windows.get(frame.choreographyId) || {id:frame.choreographyId,start:action.start,end:action.start,oldStart:frame.time-frame.choreographyOffset};
                window.end=Math.max(window.end,action.start+frame.choreographyOffset);windows.set(frame.choreographyId,window);
            }
            frames.push({...frame,time:frame.choreographyLead?0:action.start+frame.choreographyOffset});
        }
        const sorted=[...windows.values()].sort((a,b)=>a.start-b.start);
        const manual=new Map();
        for(const frame of frames)if(!frame.choreographyId&&!frame.cameraSeed){const id=frame.manualCameraSectionId || 'default',window=manual.get(id)||{start:Infinity,end:-Infinity,generated:!!frame.characterCameraId};window.start=Math.min(window.start,frame.time);window.end=Math.max(window.end,frame.time);manual.set(id,window);}
        if(sorted.some((window,index)=>index && window.start<sorted[index-1].end || [...manual.values()].some(other=>other.generated?window.start<other.end&&window.end>other.start:window.start<=other.end&&window.end>=other.start))) {
            let moved=false;
            for(const window of sorted)if(window.start!==window.oldStart){moved=true;for(const obj of this.objects.objects)for(const track of obj.animations || [])if(track._armatureActionId===window.id)track.delay=(Number(track.delay)||0)+window.oldStart-window.start;}
            Utils.showToast('Camera sequences cannot overlap. The timeline move was restored.','warning');
            this._syncCharacterSequenceAudioLinks?.();if(moved)eventBus.emit('timeline:update');this.stage.requestRender();return;
        }
        this.stage.cameraKeyframes=this._composeChoreographyCameras(frames);this.stage.requestRender();
    };
    let cameraSyncPending=false;
    const syncCamera=()=>{
        if(cameraSyncPending)return;cameraSyncPending=true;
        queueMicrotask(()=>{cameraSyncPending=false;window.app?.jointSystem?._syncChoreographyCamera();});
    };
    eventBus.on('timeline:update',syncCamera);eventBus.on('camera:keyframes-changed',syncCamera);
    let refreshTimer,checkLiveEdit=false;
    for(const event of ['history:push','objects:updated','audio:updated','stage:resize'])eventBus.on(event,()=>{
        checkLiveEdit ||= event==='history:push';clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>{const live=checkLiveEdit;checkLiveEdit=false;window.app?.jointSystem?._checkChoreographyCameraRefresh(live);},250);
    });
})();
