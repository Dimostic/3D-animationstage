(function (global) {
    'use strict';
    const labels = Object.freeze({ amaka: 'Amaka', tunde: 'Tunde' });
    const version = global.__appAssetVersion;
    const url = new URL('js/vendor/realistic-3d/renderer.js', document.baseURI);
    const previewUrl = new URL('api/realistic-3d-asset.php?file=renderer', document.baseURI);
    if (global.__STUDIO3D_ASSET_TICKET) previewUrl.searchParams.set('ticket', global.__STUDIO3D_ASSET_TICKET);
    if (version) url.searchParams.set('v', version);
    if (version) previewUrl.searchParams.set('v', version);
    const actions = Object.freeze({
        walk: { label: 'Walk cycle', property: 'realistic3DWalk', value: 1, seconds: 3.5 },
        natural: { label: 'Energetic Natural Walk cycle', property: 'realistic3DNaturalWalk', value: 1, seconds: 3.0 },
        stroll: { label: 'Stroll cycle', property: 'realistic3DStroll', value: 1, seconds: 4.2 },
        strut: { label: 'Strut cycle', property: 'realistic3DStrut', value: 1, seconds: 3.2 },
        jog: { label: 'Jog cycle', property: 'realistic3DJog', value: 1, seconds: 2.4 },
        wave: { label: 'Wave', property: 'realistic3DWave', value: 1, seconds: 2 },
        sit: { label: 'Sit', property: 'realistic3DSit', value: 1, seconds: 1.2 },
        stand: { label: 'Stand', property: 'realistic3DSit', from: 1, value: 0, seconds: 1.2 },
        turnLeft: { label: 'Turn left', property: 'realistic3DTurn', value: -90, seconds: 1 },
        turnRight: { label: 'Turn right', property: 'realistic3DTurn', value: 90, seconds: 1 }
    });
    const routeActions = Object.freeze({
        walkToPoint: { label: 'Walk to Point', gait: 'walk', property: 'realistic3DRouteProgress' },
        naturalToPoint: { label: 'Energetic Natural Walk to Point', gait: 'natural', property: 'realistic3DNaturalRoute' },
        strollToPoint: { label: 'Stroll to Point', gait: 'stroll', property: 'realistic3DStrollRoute' },
        strutToPoint: { label: 'Strut to Point', gait: 'strut', property: 'realistic3DStrutRoute' },
        jogToPoint: { label: 'Jog to Point', gait: 'jog', property: 'realistic3DJogRoute' }
    });
    const facings = [
        ['faceFront','Front',0], ['faceFrontRight','Front right 3/4',45],
        ['faceRight','Right profile',90], ['faceBackRight','Back right 3/4',135],
        ['faceBack','Back',180], ['faceBackLeft','Back left 3/4',-135],
        ['faceLeft','Left profile',-90], ['faceFrontLeft','Front left 3/4',-45]
    ];
    const stopActions = Object.assign(Object.create(null), {
        wave:actions.wave, sit:actions.sit, stand:actions.stand, turnLeft:actions.turnLeft, turnRight:actions.turnRight
    }, Object.fromEntries(facings.map(([key,,yaw])=>[key,{property:'realistic3DTurn',yaw,seconds:1}])));
    function arrivalDelta(action, appearance, incomingTurn) {
        if (action.yaw === undefined) return action.value;
        const difference = action.yaw - (appearance.yaw || 0) - incomingTurn;
        return ((difference % 360 + 540) % 360) - 180;
    }
    function stopSteps(point) {
        const rows=Array.isArray(point.steps)?point.steps:(point.arrival?[{key:point.arrival,seconds:point.actionSeconds}]:[]);
        return rows.filter(s=>stopActions[s?.key]).map(({key,seconds,id},i)=>({
            id:id||'step-'+i,key,seconds:bounded(Number(seconds)||stopActions[key].seconds,.2,60)
        }));
    }
    function speechOffset(point) {
        const settings=point.speech||{}, steps=stopSteps(point);
        const i=settings.anchorStep?steps.findIndex(s=>s.id===settings.anchorStep):-1;
        if(settings.anchorStep && i<0) throw Error('Choose an available action for speech timing.');
        const before=steps.slice(0,i<0?0:i).reduce((n,s)=>n+s.seconds,0);
        const length=i<0?(point.motionSeconds??steps.reduce((n,s)=>n+s.seconds,0)):steps[i].seconds;
        const offset=Number(settings.offset)||0;
        return before+(settings.edge==='end'?length:0)+(settings.edge==='before'?-offset:offset);
    }
    function speechWindow(app,obj,point,arrivalMs) {
        if(!point?.audioId) return null;
        const track=speechTracks(app,obj).find(t=>t.audioId===point.audioId);
        if(!track) throw Error('This speech is no longer available. Choose another clip or remove the link.');
        const start=point.speech?.timing==='independent' ? (track.timelineStartMs||0) : Math.round(arrivalMs+1000*speechOffset(point));
        if(start<0) throw Error('Speech would start before the scene. Reduce the lead time or choose a later action.');
        return {track,start,end:start+app.audioTimeline._getTrackClipDurationMs(track)};
    }
    function speechTracks(app,obj) {
        return (app.audioTimeline?.tracks || []).filter(t=>(!t.characterId || t.characterId===obj.id) && !t.sequenceLink && t.playScope!=='range');
    }
    function prepareSpeech(app,target,points){
        const result=new Map(), rig={root:target,parts:{}}, system=app.jointSystem;
        for(const [i,p] of points.entries()){
            if(!p.speech?.audioId || p.legacySpeech) continue;
            const step={id:'waypoint-'+i,speech:p.speech};
            if(result.has(p.speech.audioId)) throw Error('Use a speech clip at only one waypoint.');
            const plan=system._planCharacterSequenceSpeech({steps:[step],captionStyle:p.captionStyle},rig);
            system._captureCharacterSequenceSpeech(plan,step,rig,0);
            result.set(p.speech.audioId,plan[0]);
        }
        return result;
    }
    const repeatable = key => key === 'wave' || Object.values(routeActions).some(r=>r.gait===key);
    function motionTiming(key, seconds, pace) {
        if (!repeatable(key)) return null;
        const wave=key==='wave', base=wave?5:6;
        const count=pace==='once' ? base : seconds*(Number(pace)||1)*base/actions[key].seconds;
        return {property:wave?'realistic3DWaveCycles':'realistic3DCycleSteps',
            count:wave?Math.max(.25,count):Math.max(2,Math.round(count))};
    }
    function countFrames(count) {
        // The pose is neutral at completion. Release the override so a following legacy clip retains its cadence.
        return [{t:0,value:count},{t:1-1e-8,value:count},{t:1,value:0}];
    }
    const locomotionProperties = [
        ...Object.values(routeActions).map(route => actions[route.gait].property),
        ...Object.values(routeActions).map(route => route.property), 'realistic3DPathPhase'
    ];
    const channels = Object.freeze([...new Set(Object.values(actions).map(action => action.property)),
        ...Object.values(routeActions).map(route => route.property),
        'realistic3DHead', 'realistic3DHeadPitch', 'realistic3DGazeX', 'realistic3DGazeY', 'realistic3DMouth',
        'realistic3DWaveCycles','realistic3DCycleSteps',
        'realistic3DRouteOffset', 'realistic3DRouteDistance', 'realistic3DRouteSteps', 'realistic3DPathPhase',
        'realistic3DPathCount','realistic3DPathStride','realistic3DPathStyle',
        ...Array.from({length:10}, (_,i) => ['realistic3DPathX'+i,'realistic3DPathZ'+i]).flat()]);
    const bounded = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
    const stagePreviews = new WeakMap();
    const previewCaptionIds = new WeakMap();
    const recentRecording = new WeakMap();
    let module;
    let pending;
    function normalize(raw) {
        if (!Object.hasOwn(labels, raw?.id)) return null;
        return {
            id: raw.id, outfit: Number(raw.outfit) === 1 ? 1 : 0,
            yaw: bounded(raw.yaw, -180, 180), tone: bounded(raw.tone, -1, 1),
            build: bounded(Number.isFinite(Number(raw.build)) ? raw.build : 0, -1, 1),
            walkSpacing: raw.walkSpacing === 'narrow' ? 'narrow' : 'standard',
            heldProp: ['documentLeft', 'documentRight'].includes(raw.heldProp) ? raw.heldProp : 'none',
            hair: typeof raw.hair === 'string' && /^#[0-9a-f]{6}$/i.test(raw.hair) ? raw.hair : '#ffffff'
        };
    }
    function load() {
        if (!pending) pending = import(url.href).then(result => (module = result)).catch(error => { pending = null; throw error; });
        return pending;
    }
    let stageLoadFailed = false;
    let stageLoading = false;
    function draw(ctx, obj, repaint) {
        if (module) {
            const preview = stagePreviews.get(obj);
            if (!preview || ctx !== preview.context) return module.draw(ctx, obj, repaint);
            const { pose } = preview;
            // The stage already applied the real object's pivot and scale.
            // Draw only the temporary pose there, without mutating project state.
            const compensate = (axis, size, pivot, scale) => obj[axis] + (pose[axis] - obj[axis]
                + (pose[size] * (1 - pose[scale]) - obj[size] * (1 - obj[scale])) * (obj[pivot] ?? 0.5)) / obj[scale];
            ctx.save();
            try {
                ctx.translate(compensate('x', 'width', 'pivotX', 'scaleX'), compensate('y', 'height', 'pivotY', 'scaleY'));
                ctx.scale(pose.scaleX / obj.scaleX, pose.scaleY / obj.scaleY);
                return module.draw(ctx, pose, repaint, 0, 0);
            } finally {
                ctx.restore();
            }
        }
        if (!stageLoadFailed && !stageLoading) {
            stageLoading = true;
            load().then(() => repaint?.(), error => {
                stageLoadFailed = true;
                console.warn('[3D Characters]', error);
            }).finally(() => { stageLoading = false; });
        }
        return false;
    }
    async function preload(objects) {
        const ids = (objects || []).map(obj => normalize(obj?.realistic3D)?.id).filter(Boolean);
        if (ids.length) await (await load()).preload(ids);
    }

    const tracksOf = clip => [clip.generated].flat().filter(Boolean);
    const clipEnd = clip => (Number(clip.delay) || 0)
        + Math.max(0, ...tracksOf(clip).map(track => Number(track.duration) || 0)) * Math.max(1, Number(clip.repeat) || 1);

    function makeClip(label, duration, tracks, delay, source) {
        return {
            id: Utils.generateId('anim'), type: 'custom', name: `${label} (3D)`,
            params: { realistic3DAction:source, duration: duration / 1000, delay: delay / 1000, afterPlayback: 'keep', configs: tracks.map(track => ({ ...track, type: 'property' })) },
            delay, repeat: 1, afterPlayback: 'keep', trigger: 'onLoad', generated: tracks
        };
    }
    function notifyEdit(app, obj) {
        eventBus.emit('animation:applied', { type: 'custom', objects: [obj] });
        eventBus.emit('timeline:update');
        eventBus.emit('history:push');
        app.animations?.updateAppliedAnimationsList?.();
        app.animations?.updateCodeOutput?.();
    }

    const routeStartProperties = new Set(['x', 'y', 'width', 'height', 'scaleX', 'scaleY', 'rotation',
        'tiltX', 'tiltY', 'depth', 'realistic3DSit', 'realistic3DTurn']);
    function actionStart(app, obj, clips = obj.animations || []) {
        const start = { ...obj, ...app.animations?.originalStates?.get(obj.id), realistic3D: obj.realistic3D };
        for (const clip of [...clips].sort((a, b) => clipEnd(a) - clipEnd(b))) {
            if (clip.afterPlayback !== 'keep') continue;
            for (const track of tracksOf(clip)) {
                if (Number.isFinite(track.to) && routeStartProperties.has(track.property)) start[track.property] = track.to;
            }
        }
        return start;
    }

    function nextActionDelay(clips, linked = new Set()) {
        const overlays=new Set(linked);
        for(const c of clips) for(const p of c.params?.realistic3DAction?.points||[]){
            if(p.audioId && !p.waitSpeech) overlays.add(p.audioId);
        }
        return Math.max(0,...clips.filter(c=>!tracksOf(c).some(t=>t.type==='audio-lip-sync' && overlays.has(t.audioId))).map(clipEnd).filter(Number.isFinite));
    }
    function addAction(app, obj, actionKey, seconds, pace='1', hold=0) {
        if (!obj?.realistic3D || !Object.hasOwn(actions, actionKey)) return;
        const list = obj.animations ||= [];
        const delay = nextActionDelay(list);
        const [clip] = buildAction(app,obj,{key:actionKey,seconds,pace,hold},actionStart(app,obj),delay,obj.realistic3D);
        list.push(clip);
        notifyEdit(app,obj);
        return clip;
    }

    function planRoute(app, obj, destination, route, appearance, seconds, start = actionStart(app,obj), saved) {
        if (!app.objects.objects.includes(obj)) throw new Error('The character is no longer on this stage.');
        if (!destination.length) throw new Error('Pick a destination on the stage.');
        start.realistic3D = appearance;
        const groups = [];
        let cursor = start, points = [], gait = route.gait;
        for (const [i, p] of destination.entries()) {
            points.push(p);
            if (!p.stop && i < destination.length - 1) continue;
            const run = module.planWalk(cursor, points, undefined, gait);
            const steps=stopSteps(p);
            const actionSeconds=steps.reduce((n,s)=>n+s.seconds,0);
            let speechSeconds=0;
            if(p.audioId){
                const track=speechTracks(app,obj).find(t=>t.audioId===p.audioId);
                if(!track) throw Error('This speech is no longer available. Choose another clip or remove the link.');
                if(destination.filter(v=>v.audioId===p.audioId).length>1) throw Error('A speech clip can start at only one waypoint.');
                speechSeconds=app.audioTimeline._getTrackClipDurationMs(track)/1000+speechOffset(p);
            }
            const stand = bounded(cursor.realistic3DSit,0,1) * actions.stand.seconds;
            const wait = p.stop ? bounded(p.wait,0,30) : 0;
            groups.push({start:cursor, points, run, gait, stand, steps, endIndex:i,
                extra:stand+Math.max(actionSeconds,p.waitSpeech?speechSeconds:0)+wait});
            cursor = {...cursor, ...run.to, realistic3DSit:0,realistic3DTurn:run.yawTo};
            for(const {key} of steps){
                const action=stopActions[key];
                if(action.property==='realistic3DTurn') cursor.realistic3DTurn+=arrivalDelta(action,appearance,cursor.realistic3DTurn);
                if(action.property==='realistic3DSit') cursor.realistic3DSit=action.value;
            }
            if (p.stop && Object.values(routeActions).some(r=>r.gait===p.nextGait)) gait=p.nextGait;
            points = [];
        }
        const minimum = groups.reduce((a,g)=>a+g.run.minSeconds+g.extra,0);
        const minSeconds = Math.ceil(minimum*10-1e-8)/10;
        const auto = Math.max(minSeconds,Math.round(groups.reduce((a,g)=>a+g.run.seconds+g.extra,0)*10)/10);
        seconds ??= Math.min(60,auto);
        if (minSeconds > 60 || seconds < minSeconds || seconds > 60) throw Error(`Route needs at least ${minSeconds.toFixed(1)} seconds; maximum 60. Shorten the route or waits.`);
        let elapsed = 0;
        const spare = groups.reduce((a,g)=>a+Math.max(.01,g.run.seconds-g.run.minSeconds),0);
        const hasSeating=groups.some(g=>g.stand || g.steps.some(s=>s.key==='sit'||s.key==='stand'));
        const hasWave=groups.some(g=>g.steps.some(s=>s.key==='wave'));
        // A restored stage pose may yield a slightly different automatic stride estimate.
        // Keep the recorded travel intervals when the itinerary and available time still match.
        const sameSchedule=saved && routeActions[saved.key]===route && saved.members.length===groups.length &&
            Math.abs(saved.end-saved.delay-seconds*1000)<1 && groups.every((g,i)=>{
                const c=saved.members[i],src=c.params?.realistic3DAction,pts=src?.points;
                const travel=src?.arrivalSeconds-g.stand;
                return travel>=g.run.minSeconds-1e-8 && Math.abs((clipEnd(c)-c.delay)/1000-(travel+g.extra))<.001 &&
                    pts?.length===g.points.length && pts.every((p,j)=>p.x===g.points[j].x && p.y===g.points[j].y && p.nextGait===g.points[j].nextGait);
            });
        const phases=new Set(groups.flatMap(g=>Object.keys(g.run.tracks).filter(k=>locomotionProperties.includes(k))));
        const runs = groups.map(({start,points,run,gait,stand,steps,endIndex,extra},i) => {
            const duration = sameSchedule ? Math.max(run.minSeconds,saved.members[i].params.realistic3DAction.arrivalSeconds-stand)
                : run.minSeconds + Math.max(0,seconds-minimum)*Math.max(.01,run.seconds-run.minSeconds)/spare;
            if (Math.abs(run.seconds-duration) > 1e-8) run = module.planWalk(start, points, duration, gait);
            const length = run.seconds+extra, land=(stand+run.seconds)/length;
            // Explicit holds let a direct seek reconstruct the action without playing the incoming walk.
            const put=(frames,t,value)=>{
                if (Math.abs(frames.at(-1)?.t-t)<1e-10) frames.at(-1).value=value;
                else frames.push({t,value});
            };
            if (extra) for (const frames of Object.values(run.tracks)) {
                for (const f of frames) f.t=(stand+f.t*run.seconds)/length;
                if (stand) frames.unshift({t:0,value:frames[0].value});
            }
            if (hasSeating) {
                const sit=run.tracks.realistic3DSit=[{t:0,value:bounded(start.realistic3DSit,0,1)}];
                put(sit,stand/length,0);
            }
            if (hasWave) {
                run.tracks.realistic3DWave=[{t:0,value:0}];
                run.tracks.realistic3DWaveCycles=[{t:0,value:0}];
            }
            for (const phase of phases) run.tracks[phase] ||= [{t:0,value:0}];
            let at=land;
            for (const {key,seconds} of steps) {
                const arrival=stopActions[key];
                const frames=run.tracks[arrival.property] ||= [{t:0,value:0}];
                const from=frames.at(-1).value;
                const wave=key==='wave', startValue=wave?0:from;
                // End the previous wave at neutral before restarting its phase.
                if(wave && from===1) {
                    const last=frames.at(-1);
                    if(last.t===at) last.t-=1e-8;
                    else put(frames,at-1e-8,1);
                }
                put(frames,at,startValue);
                if(wave){
                    const counts=run.tracks.realistic3DWaveCycles;
                    if(at>counts.at(-1).t+1e-8) put(counts,at-1e-8,counts.at(-1).value);
                    put(counts,at,motionTiming('wave',seconds,1).count);
                }
                const delta=arrival.property==='realistic3DTurn'?arrivalDelta(arrival,appearance,from):arrival.value-startValue;
                const n=arrival.property==='realistic3DTurn'?12:1;
                for(let j=1;j<=n;j++){
                    const u=j/n;
                    put(frames,at+seconds*u/length,startValue+delta*(n===1?u:u*u*(3-2*u)));
                }
                at+=seconds/length;
            }
            const counts=run.tracks.realistic3DWaveCycles;
            if(counts?.at(-1).value){
                put(counts,1-1e-8,counts.at(-1).value);
                put(counts,1,0);
            }
            for(const frames of Object.values(run.tracks)) put(frames,1,frames.at(-1).value);
            const segment = {tracks:run.tracks, points, begin:elapsed, seconds:length,endIndex,
                arrivalSeconds:stand+run.seconds, firstStep:stand+run.turnTime+(run.seconds-run.turnTime)/run.steps};
            elapsed += length;
            return segment;
        });
        return {start, runs, seconds, minSeconds, label:route.label};
    }

    function actionInfo(clip) {
        const source = clip?.params?.realistic3DAction;
        if (source && (Object.hasOwn(actions,source.key) || Object.hasOwn(routeActions,source.key))) return source;
        const m = /^(.*?)\s*(?: (\d+)\/(\d+))? \(3D\)$/.exec(clip?.name || '');
        if (!m || clip.type !== 'custom') return null;
        const entry = Object.entries({...actions,...routeActions}).find(([,a])=>a.label===m[1]);
        if (!entry || !tracksOf(clip).some(t=>t.property===entry[1].property ||
            (entry[1].gait && t.property==='realistic3DPathPhase'))) return null;
        return {key:entry[0], index:Number(m[2]||1)-1, count:Number(m[3]||1)};
    }
    function actionGroups(obj) {
        // A speech overlay can start between route segments without splitting their editable group.
        const clips = (obj.animations || []).filter(c=>!tracksOf(c).some(t=>t.type==='audio-lip-sync')).sort((a,b)=>a.delay-b.delay), groups=[];
        for (let i=0;i<clips.length;) {
            const first=clips[i++], info=actionInfo(first), members=[first];
            if (info?.index===0 && info.count>1) {
                const rest=clips.slice(i,i+info.count-1);
                if (rest.length===info.count-1 && rest.every((c,j)=>{
                    const s=actionInfo(c);
                    return s?.key===info.key && s.index===j+1 && s.count===info.count && s.group===info.group &&
                        Math.abs(c.delay-clipEnd(j?rest[j-1]:first))<1;
                })) { members.push(...rest); i+=rest.length; }
            }
            groups.push({members,key:info?.key,delay:first.delay || 0,end:clipEnd(members.at(-1))});
        }
        return groups;
    }
    function readAction(group, start) {
        const points=[];
        if (routeActions[group.key]) for (const [i,c] of group.members.entries()) {
            const source=c.params?.realistic3DAction;
            if (Array.isArray(source?.points)) points.push(...Utils.deepClone(source.points));
            else {
                const tracks=tracksOf(c), recovered=module.savedWalkPoints(start,tracks);
                const phase=tracks.find(t=>t.property==='realistic3DPathPhase' || t.property===routeActions[group.key].property);
                const end=phase?.keyframes?.find(f=>f.value===1)?.t ?? 1;
                const wait=Math.round((1-end)*phase.duration)/1000;
                points.push(...recovered.map((p,j)=>({...p,stop:j===recovered.length-1 && (wait>0 || i<group.members.length-1),wait:j===recovered.length-1?wait:0})));
            }
        }
        const info=group.members[0].params?.realistic3DAction;
        const hold=bounded(info?.hold,0,60);
        return {key:group.key,points:routeActions[group.key]?points:Utils.deepClone(info?.points||[]),seconds:info?.motionSeconds??((group.end-group.delay)/1000-hold),pace:info?.pace??'once',hold};
    }
    function actionSchedule(app,obj,point,delay,motion,hold) {
        point={...point,motionSeconds:motion/1000};
        const lead=point.audioId && point.speech?.timing!=='independent' ? Math.max(0,-delay-Math.round(speechOffset(point)*1000)):0;
        const start=delay+lead,end=start+motion,voice=speechWindow(app,obj,point,start);
        return {point,lead,start,end,voice,duration:Math.max(end+hold,point.waitSpeech && voice?voice.end:0)-delay};
    }
    function buildAction(app,obj,spec,start,delay,appearance,saved) {
        const {key,seconds}=spec, route=routeActions[key];
        if (!route) {
            const {label,property,value,seconds:fallback,from:rest}=actions[key];
            const motion=bounded(Number(seconds)||fallback,.2,60)*1000;
            const hold=repeatable(key)?0:bounded(spec.hold,0,60);
            const schedule=actionSchedule(app,obj,spec.points?.[0],delay,motion,hold*1000);
            const {duration,lead}=schedule;
            const from=property==='realistic3DTurn' ? Number(start[property])||0 : rest??0;
            const to=property==='realistic3DTurn' ? from+value : value;
            const keyframes=[{t:0,value:from}];
            if(lead) keyframes.push({t:lead/duration,value:from});
            keyframes.push({t:(lead+motion)/duration,value:to});
            if(duration>lead+motion) keyframes.push({t:1,value:to});
            const tracks=[{property,from,to,duration,easing:'linear',keyframes}];
            const pace=spec.pace??'once', timing=motionTiming(key,motion/1000,pace);
            if(timing) tracks.push({property:timing.property,from:timing.count,to:0,duration,easing:'linear',keyframes:countFrames(timing.count)});
            const src=timing?{key,pace}:{key,hold};
            if(schedule.point.audioId || schedule.point.speechDraft) Object.assign(src,{motionSeconds:motion/1000,arrivalSeconds:lead/1000,points:[Utils.deepClone(schedule.point)]});
            return [makeClip(label,duration,tracks,delay,src)];
        }
        const plan=planRoute(app,obj,spec.points,route,appearance,seconds,start,saved), group=Utils.generateId('route');
        return plan.runs.map((r,index)=>{
            speechWindow(app,obj,r.points.at(-1),delay+(r.begin+r.arrivalSeconds)*1000);
            const duration=r.seconds*1000, count=plan.runs.length;
            const tracks=Object.entries(r.tracks).map(([property,keyframes])=>({
                property,from:keyframes[0].value,to:keyframes.at(-1).value,duration,easing:'linear',keyframes
            }));
            return makeClip(count>1?`${route.label} ${index+1}/${count}`:route.label,duration,tracks,delay+r.begin*1000,
                {key,group,index,count,arrivalSeconds:r.arrivalSeconds,points:r.points.map(p=>{
                    const steps=stopSteps(p);
                    return {x:p.x,y:p.y,stop:p.stop,wait:p.wait,nextGait:p.nextGait,steps,arrival:steps[0]?.key,
                        actionSeconds:steps[0]?.seconds,audioId:p.audioId,waitSpeech:p.waitSpeech,
                        ...Utils.deepClone({speech:p.speech,speechDraft:p.speechDraft,captionStyle:p.captionStyle,legacySpeech:p.legacySpeech})};
                })});
        });
    }
    function editableGroup(g) {
        return g.members.every(c=>Number(c.repeat || 1)===1 && c.trigger==='onLoad' && c.afterPlayback==='keep');
    }
    function replaceAction(app,obj,id,spec,appearance) {
        const groups=actionGroups(obj), index=groups.findIndex(g=>g.members.some(c=>c.id===id));
        if (index<0) throw Error('This timeline action no longer exists.');
        const prefix=groups.slice(0,index).flatMap(g=>g.members), replacements=new Map();
        let shift=0;
        for (const [j,g] of groups.slice(index).entries()) {
            // Only ripple the consecutive 3D action sequence; external tracks have independent timing.
            if (!g.key) break;
            if (!editableGroup(g)) throw Error('Set the action and following 3D actions to play once on load before editing.');
            const start=actionStart(app,obj,prefix);
            const oldStart=actionStart(app,obj,groups.slice(0,index+j).flatMap(v=>v.members));
            const replan=!j || (shift && !routeActions[g.key] && g.members[0].params?.realistic3DAction?.points?.[0]?.audioId) || (routeActions[g.key] ? [...routeStartProperties].some(k=>start[k]!==oldStart[k]) ||
                JSON.stringify(appearance)!==JSON.stringify(obj.realistic3D) : actions[g.key].property==='realistic3DTurn' && start.realistic3DTurn!==oldStart.realistic3DTurn);
            let clips;
            try { clips=replan ? buildAction(app,obj,j?readAction(g,oldStart):spec,start,g.delay+shift,appearance,j?null:g)
                : g.members.map(c=>shift ? {...c,delay:c.delay+shift,params:{...c.params,delay:(c.delay+shift)/1000}} : c); }
            catch(error) { throw Error(j ? `Following action "${g.members[0].name}": ${error.message} No changes saved.` : error.message); }
            clips.forEach((c,k)=>{if(g.members[k]) c.id=g.members[k].id;});
            g.members.forEach((c,k)=>replacements.set(c,k?[]:clips));
            prefix.push(...clips);
            shift=clipEnd(clips.at(-1))-g.end;
        }
        obj.animations=obj.animations.flatMap(c=>replacements.get(c)??[c]);
    }

    function waypointGuide(stage, origin, points, index) {
        const element = name => document.createElementNS('http://www.w3.org/2000/svg', name);
        const svg = element('svg'), line = element('polyline');
        svg.classList.add('realistic-3d-route-guide');
        svg.setAttribute('aria-hidden', 'true');
        svg.append(line);
        const count = Math.max(points.length, index + 1);
        const marks = Array.from({length: count + 1}, (_, i) => {
            const group = element('g');
            const stop = i > 0 && (points[i-1]?.stop || i === count);
            const shape = element(stop ? 'rect' : 'circle');
            if (stop) {
                for (const [key,value] of Object.entries({x:-10,y:-10,width:20,height:20,rx:2})) shape.setAttribute(key, value);
            } else shape.setAttribute('r', i ? 10 : 5);
            group.append(shape);
            if (i > 0) {
                const text = element('text');
                text.textContent = i;
                group.append(text);
                group.dataset.waypoint = i;
            }
            if (i === index + 1) group.classList.add('is-picking');
            svg.append(group);
            return group;
        });
        document.body.append(svg);
        let pointer, frame = 0;
        function render() {
            frame = 0;
            const rect = stage.viewport.getBoundingClientRect();
            Object.assign(svg.style, {left: rect.left+'px', top: rect.top+'px', width: rect.width+'px', height: rect.height+'px'});
            const candidate = pointer && stage.screenToStage(pointer.x, pointer.y);
            const inside = candidate && candidate.x >= 0 && candidate.y >= 0 && candidate.x <= stage.width && candidate.y <= stage.height;
            const vertices = [];
            marks.forEach((mark, i) => {
                const p = !i ? origin : i === index + 1 && inside ? candidate : points[i-1];
                mark.style.display = p ? '' : 'none';
                if (!p) return;
                const screen = stage.stageToScreen(p.x, p.y);
                const x = screen.x - rect.left, y = screen.y - rect.top;
                mark.setAttribute('transform', `translate(${x} ${y})`);
                vertices.push(x + ',' + y);
            });
            line.setAttribute('points', vertices.join(' '));
        }
        function queue() { if (!frame) frame = requestAnimationFrame(render); }
        function move(event) { pointer = {x:event.clientX, y:event.clientY}; queue(); }
        function leave() { pointer = null; queue(); }
        render();
        const listeners = new AbortController();
        const options = {signal:listeners.signal, passive:true};
        stage.canvas.addEventListener('pointermove', move, options);
        stage.canvas.addEventListener('pointerleave', leave, options);
        stage.viewport.addEventListener('wheel', queue, options);
        window.addEventListener('resize', queue, options);
        window.addEventListener('scroll', queue, {...options, capture:true});
        return () => { listeners.abort(); cancelAnimationFrame(frame); svg.remove(); };
    }

    let dismissReplay;
    function offerReplay(app, target, clipId) {
        dismissReplay?.();
        const find = () => app.objects.objects.includes(target) && actionGroups(target).find(g=>g.members.some(c=>c.id===clipId));
        const saved = find();
        if (!saved) return;
        const notice=document.createElement('div');
        notice.className='realistic-3d-stage-status';
        notice.setAttribute('data-saved-action','');
        notice.innerHTML='<span role="status"></span><button type="button" data-replay><i class="fas fa-play" aria-hidden="true"></i> Replay saved action</button><button type="button" data-dismiss aria-label="Dismiss replay" title="Dismiss"><i class="fas fa-times" aria-hidden="true"></i></button>';
        notice.querySelector('span').textContent=(actions[saved.key]||routeActions[saved.key]).label+' saved';
        const replay=notice.querySelector('[data-replay]');
        replay.onclick=()=>{
            const group=find();
            if (!group) { close(); return; }
            let start=group.delay,end=group.end;
            for(const clip of group.members){
                const id=clip.params?.realistic3DAction?.points?.at(-1)?.audioId;
                const track=id && speechTracks(app,target).find(t=>t.audioId===id);
                if(track){start=Math.min(start,track.timelineStartMs||0);end=Math.max(end,(track.timelineStartMs||0)+app.audioTimeline._getTrackClipDurationMs(track));}
            }
            app.animations.playAll(false,{start,end});
        };
        const verify=()=>{if (!find()) close();};
        function close(){
            for(const [name,fn] of listeners) eventBus.off(name,fn);
            notice.remove(); dismissReplay=null;
        }
        const listeners=[['scene:changed',close],['object:removed',verify],['timeline:update',verify],
            ['selection:changed',()=>{if(!app.objects.getSelectedObjects().includes(target)) close();}]];
        for(const [name,fn] of listeners) eventBus.on(name,fn);
        notice.querySelector('[data-dismiss]').onclick=close;
        dismissReplay=close;
        document.body.append(notice);
    }
    function open(app, explicitTarget, editId) {
        const existing = document.getElementById('realistic-3d-library');
        if (existing) return;
        dismissReplay?.();
        const selected = app.objects.getSelectedObjects();
        const candidate = explicitTarget && app.objects.objects.includes(explicitTarget) ? explicitTarget : selected.length === 1 ? selected[0] : null;
        const target = normalize(candidate?.realistic3D) ? candidate : null;
        const groups=target?actionGroups(target):[];
        const recordings=groups.filter(g=>g.key);
        const byId=id=>id && recordings.find(g=>g.members.some(c=>c.id===id));
        const selectedId=target && app.timeline?.selectedAnimObjId===target.id && app.timeline.selectedAnimId;
        const time=app.animations?.currentTime || 0;
        let editing=byId(editId) || byId(selectedId) ||
            (time>0 && recordings.find(g=>g.delay<=time && time<g.end)) ||
            byId(recentRecording.get(target)) || recordings.at(-1);
        const draftStart=()=>actionStart(app,target,editing?groups.slice(0,groups.indexOf(editing)).flatMap(g=>g.members):undefined);
        const dlg = document.createElement('dialog');
        dlg.id = 'realistic-3d-library';
        dlg.className = 'realistic-3d-library';
        dlg.setAttribute('aria-labelledby', 'realistic-3d-title');
        dlg.innerHTML = `<header><h2 id="realistic-3d-title">3D Character Library</h2>
            <button type="button" data-close aria-label="Close" title="Close"><i class="fas fa-times" aria-hidden="true"></i></button></header>
            <div class="realistic-3d-workspace"><div class="realistic-3d-viewport"><canvas width="320" height="420" aria-label="Character preview"></canvas>
            <div data-model-notice role="status"><progress aria-label="Loading character"></progress><span></span></div></div>
            <form><fieldset><legend>Appearance</legend><label>Character<select name="id"><option value="amaka">Amaka</option><option value="tunde">Tunde</option></select></label>
            <label>Outfit<select name="outfit"><option value="0">Casual</option><option value="1">Formal</option></select></label>
            <label>Facing<select name="yaw">${facings.map(([,label,yaw])=>`<option value="${yaw}">${label}</option>`).join('')}</select></label>
            <label>Build<input name="build" type="range" min="-1" max="1" step="0.05"><span class="realistic-3d-scale"><span>Slender</span><span>Fuller</span></span></label>
            <label>Skin tone<input name="tone" type="range" min="-1" max="1" step="0.05"></label>
            <label>Hair tint<input name="hair" type="color"></label>
            <label>Held prop<select name="heldProp"><option value="none">None / release</option><option value="documentLeft">Document — left hand</option><option value="documentRight">Document — right hand</option></select></label>
            <p>The document hand is reserved. Waves and speech gestures use the free hand.</p>
            ${target ? '<button type="submit" disabled>Apply Appearance</button>' : ''}</fieldset>
            <fieldset><legend>Motion</legend>
            <label>Walk spacing<select name="walkSpacing"><option value="standard">Standard</option><option value="narrow">Narrow</option></select></label>
            ${target?'<label>New or saved timeline action<select data-recorded><option value="">New action</option></select></label>':''}
            <div class="realistic-3d-actions"><label>Action<select name="action">
            ${Object.entries(target ? { ...actions, ...routeActions } : actions).map(([key, value]) => `<option value="${key}">${value.label}</option>`).join('')}</select></label>
            <label><span data-time-label>Action duration (s)</span><input name="seconds" type="number" min="0.2" max="60" step="0.1" value="${actions.walk.seconds}"></label>
            <label data-pace>Pace<select name="pace"><option value="0.5">Half speed</option><option value="0.75">0.75x</option><option value="1" selected>Normal (1x)</option><option value="1.5">1.5x</option><option value="2">Double speed</option><option value="once">One performance, fit to duration</option></select></label>
            <label data-hold hidden>Hold after (s)<input name="hold" type="number" min="0" max="60" step="0.1" value="0" disabled></label></div>
            ${target ? '<div data-route hidden><div class="realistic-3d-buttons"><button type="button" data-pick-walk><i class="fas fa-crosshairs" aria-hidden="true"></i> Pick destination</button><button type="button" data-add-waypoint hidden><i class="fas fa-plus"></i> Waypoint</button></div><div data-destination></div></div>' : ''}
            <strong data-action-summary></strong>
            ${target?'<div data-action-speech></div><div data-timing-strip></div>':''}
            ${target ? '<label class="realistic-3d-keep"><input type="checkbox" data-keep-open> Keep builder open after saving to timeline</label>' : ''}
            <div class="realistic-3d-buttons"><button type="button" disabled data-preview title="Preview action" aria-label="Preview action"><i class="fas fa-play" aria-hidden="true"></i></button>
            ${target ? '<button type="button" disabled data-action>Add Action to Timeline</button>' : ''}</div>
            </fieldset><output role="status" aria-live="polite"></output>${target ? '' : '<button type="submit" disabled>Add to Stage</button>'}
            ${target ? '' : '<button type="submit" data-create-action disabled>Add to Stage with Action</button>'}</form></div>`;
        document.body.append(dlg);
        const form = dlg.querySelector('form');
        const fields = form.elements;
        const status = dlg.querySelector('output');
        const submitButtons = [...form.querySelectorAll('[type=submit], [data-action], [data-preview]')];
        const modelNotice = dlg.querySelector('[data-model-notice]');
        function modelState(message, loading = false) {
            modelNotice.hidden = !message;
            modelNotice.querySelector('progress').hidden = !loading;
            modelNotice.querySelector('span').textContent = message;
            dlg.querySelector('canvas').setAttribute('aria-busy', String(loading));
        }
        const context = dlg.querySelector('canvas').getContext('2d');
        const preview = { x: 9, y: 0, width: 302, height: 420 };
        const config = normalize(target?.realistic3D) || normalize({ id: 'amaka' });
        if (![...fields.yaw.options].some(o=>Number(o.value)===config.yaw))
            fields.yaw.add(new Option(`Custom (${config.yaw} degrees)`,String(config.yaw)));
        Object.entries(config).forEach(([key, val]) => { fields[key].value = val; });
        let serial = 0;
        let raf = 0;
        let ready = false;
        let parked = false;
        let destination = [];
        let actionSpeech={};
        const speechPoints=()=>routeActions[fields.action.value]?destination:[actionSpeech];
        function draftDelay(){
            const attached=new Set(speechPoints().map(p=>p.audioId).filter(Boolean));
            return editing?.delay??nextActionDelay(target.animations||[],attached);
        }
        function intervalLabel(range){
            return 'Timeline: '+(range.start/1000).toFixed(3)+' s to '+(range.end/1000).toFixed(3)+' s';
        }
        function timingStrip(host,motion,voices){
            if(!motion.length)return;
            const captions=[];
            for(const {range,point} of voices){
                const obj=app.jointSystem._sequenceCaptionForAudio(range.track.audioId);
                if(obj && !point.speech?.captions?.replaceExisting){
                    const delta=range.start-(range.track.timelineStartMs||0);
                    for(const seg of obj.segments||[]) captions.push([seg.startMs+delta,seg.endMs+delta]);
                }else if(point.speech?.captions?.enabled) captions.push([range.start,range.end]);
            }
            const rows=[['Motion',motion,'#25867e'],['Speech',voices.map(({range})=>[range.start,range.end]),'#477bc3'],['Captions',captions,'#a06432']];
            const spans=rows.flatMap(r=>r[1]),lo=Math.min(...spans.map(s=>s[0])),hi=Math.max(...spans.map(s=>s[1]));
            if(!(hi>lo))return;
            const sec=v=>Number((v/1000).toFixed(3))+' s';
            const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
            svg.setAttribute('viewBox','0 0 280 76');svg.setAttribute('width','100%');svg.setAttribute('role','img');
            svg.setAttribute('aria-label',rows.map(([name,spans])=>name+': '+(spans.map(s=>s.map(sec).join(' to ')).join(', ')||'none')).join('; '));
            function element(tag,attrs,text){
                const el=document.createElementNS(ns,tag);
                for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);
                if(text)el.textContent=text;svg.append(el);return el;
            }
            const x=t=>62+216*(t-lo)/(hi-lo);
            const label=(x,y,text,anchor='start')=>element('text',{x,y,'text-anchor':anchor,'font-size':11,fill:'currentColor'},text);
            label(62,12,sec(lo));label(278,12,sec(hi),'end');
            rows.forEach(([name,spans,color],i)=>{
                const y=20+i*19;
                label(0,y+9,name);
                element('rect',{x:62,y,width:216,height:10,rx:2,fill:'currentColor',opacity:'.12'});
                for(const [start,end] of spans){
                    const rect=element('rect',{x:x(start),y,width:Math.max(.5,x(end)-x(start)),height:10,rx:2,fill:color});
                    const title=document.createElementNS(ns,'title');title.textContent=name+': '+sec(start)+' to '+sec(end);rect.append(title);
                }
            });
            host.replaceChildren(svg);
        }
        function mountSpeech(host,p,steps,sync){
            const standalone=p===actionSpeech;
            const render=()=>{
                sync();host.replaceChildren();
                const system=app.jointSystem;
                system._mountSequenceSpeechFields(host,p,{
                    mountSpeechAnchor:(field,settings)=>{
                        if(settings.timing!=='independent'){
                            const edge=document.createElement('select');
                            if(!standalone){
                                const ref=document.createElement('select');
                                ref.add(new Option('All actions at this stop',''));
                                steps.forEach((s,j)=>ref.add(new Option((j+1)+'. '+(stopActions[s.key].label||'Face '+facings.find(([key])=>key===s.key)[1]),s.id)));
                                ref.value=settings.anchorStep||'';
                                field('Anchor speech to',ref).onchange=()=>{settings.anchorStep=ref.value;p.legacySpeech=false;render();};
                            }
                            for(const [v,label] of [['before','Before start'],['start','At start'],['end','After end']])edge.add(new Option(label,v));
                            edge.value=settings.edge||'start';
                            field('Start speech',edge).onchange=()=>{settings.edge=edge.value;p.legacySpeech=false;render();};
                        }
                        const out=document.createElement('output');out.dataset.speechWindow='';out.setAttribute('aria-live','polite');field('Speech interval',out);
                    },
                    rig:{root:target,parts:{}},autoApply:false,
                    allowTrack:t=>speechTracks(app,target).includes(t) && !speechPoints().some(other=>other!==p && other.audioId===t.audioId)
                        && !(target.animations||[]).some(c=>!editing?.members.includes(c) && c.params?.realistic3DAction?.points?.some(v=>v.audioId===t.audioId)),
                    alive:()=>dlg.open && speechPoints().includes(p) && app.objects.objects.includes(target),
                    status:text=>{status.textContent=text;},invalidate:()=>{p.legacySpeech=false;},
                    timingChanged:sync,render,applySequence:()=>dlg.querySelector('[data-action]').click()
                });
                if(p.speech?.captions?.enabled)system._mountSequenceCaptionStyle(host.querySelector('.sequence-speech'),p,()=>{p.legacySpeech=false;});
            };
            render();
        }
        function renderActionSpeech(){
            if(!target)return;
            const host=dlg.querySelector('[data-action-speech]');host.replaceChildren();
            if(routeActions[fields.action.value])return;
            const p=actionSpeech;
            mountSpeech(host,p,[],()=>{
                p.audioId=p.speech?.audioId||'';p.waitSpeech=p.speech?.timing==='wait';queueRouteSummary();
            });
        }
        const expandedPoints=new WeakMap();
        let summaryFrame=0;
        function queueRouteSummary(){
            if(summaryFrame) return;
            summaryFrame=requestAnimationFrame(()=>{
                summaryFrame=0;
                const route=routeActions[fields.action.value];
                if(!target || !dlg.isConnected) return;
                const strip=dlg.querySelector('[data-timing-strip]');
                strip.replaceChildren();
                if(!route){
                    const out=dlg.querySelector('[data-action-speech] [data-speech-window]');
                    const seconds=Number(fields.seconds.value);
                    if(!seconds || !ready)return;
                    try {
                        const s=actionSchedule(app,target,actionSpeech,draftDelay(),seconds*1000,fields.hold.disabled?0:Number(fields.hold.value)*1000);
                        if(out && s.voice)out.textContent=intervalLabel(s.voice);
                        timingStrip(strip,[[s.start,s.end]],s.voice?[{range:s.voice,point:actionSpeech}]:[]);
                    }catch(e){if(out)out.textContent=e.message;}
                    return;
                }
                if(!destination.length)return;
                let runs=[];
                if(ready) try {
                    runs=planRoute(app,target,destination,route,preview.realistic3D,Number(fields.seconds.value),draftStart(),editing).runs;
                } catch { /* Incomplete drafts still have a readable sequence, without estimated times. */ }
                let gait=route.gait;
                const voices=[],motion=[],base=draftDelay();
                dlg.querySelectorAll('[data-stop-summary]').forEach((summary,i)=>{
                    const p=destination[i],run=runs.find(r=>r.endIndex===i);
                    if(!p) return;
                    if(run)motion.push([base+run.begin*1000,base+(run.begin+run.arrivalSeconds+stopSteps(p).reduce((n,s)=>n+s.seconds,0))*1000]);
                    const parts=[actions[gait].label.replace(/ cycle$/,'')+(run?' (arrive at '+(run.begin+run.arrivalSeconds).toFixed(1)+' s)':'')];
                    for(const s of stopSteps(p)){
                        const facing=facings.find(([key])=>key===s.key);
                        parts.push((facing?'Face '+facing[1].toLowerCase():stopActions[s.key].label)+' '+s.seconds+' s');
                    }
                    if(p.audioId) {
                        let timing='Set a valid route duration to see speech times.';
                        if(run) try{
                            const range=speechWindow(app,target,p,draftDelay()+1000*(run.begin+run.arrivalSeconds));
                            timing=intervalLabel(range);
                            voices.push({range,point:p});
                            if(range.end>draftDelay()+Number(fields.seconds.value)*1000) timing+=' (continues after route)';
                        } catch(e){timing=e.message;}
                        parts.push((p.speech?.captions?.enabled?'Speech + captions':'Speech')+' | '+timing);
                        const out=summary.parentElement.querySelector('[data-speech-window]');
                        if(out) out.textContent=timing;
                    }
                    if(p.stop && p.wait) parts.push('Wait '+p.wait+' s');
                    summary.textContent=(i+1)+'. '+parts.join(' / ');
                    if(p.stop && actions[p.nextGait]) gait=p.nextGait;
                });
                timingStrip(strip,motion,voices);
            });
        }
        const recorded=dlg.querySelector('[data-recorded]');
        function describeAction(){
            queueRouteSummary();
            const key=fields.action.value;
            const duration=Number(fields.seconds.value)+(fields.hold.disabled?0:Number(fields.hold.value));
            dlg.querySelector('[data-action-summary]').textContent=(editing?'Edit: ':'New: ')+(routeActions[key]||actions[key]).label+
                (duration>0?' ('+Number(duration.toFixed(2))+' s)':'');
        }
        form.addEventListener('input',()=>queueMicrotask(describeAction));
        function syncTimingControls(){
            const key=fields.action.value, route=routeActions[key];
            dlg.querySelector('[data-time-label]').textContent=route?'Total route duration (s)':repeatable(key)?'Action duration (s)':'Transition duration (s)';
            dlg.querySelector('[data-pace]').hidden=!repeatable(key);
            fields.pace.disabled=!repeatable(key);
            fields.hold.disabled=!!route || repeatable(key);
            dlg.querySelector('[data-hold]').hidden=fields.hold.disabled;
        }
        function updateTitle(){
            dlg.querySelector('h2').textContent=editing?'Edit 3D Action or Route':target?'3D Appearance and Actions':'3D Character Library';
        }
        updateTitle();
        function listActions() {
            recorded.length=1;
            for (const g of groups.filter(v=>v.key)) {
                recorded.add(new Option(`Edit: ${(routeActions[g.key]||actions[g.key]).label} at ${(g.delay/1000).toFixed(1)}s`,g.members[0].id));
            }
            recorded.value=editing?.members[0].id||'';
        }
        function loadSelection() {
            cancelAnimationFrame(raf);
            editing=groups.find(g=>g.members[0].id===recorded.value);
            updateTitle();
            if(editing) recentRecording.set(target,editing.members[0].id);
            destination=[];
            actionSpeech={};
            fields.seconds.min=.2;
            if (editing) {
                const spec=readAction(editing,draftStart());
                fields.action.value=spec.key;
                if(routeActions[spec.key])destination=spec.points;else actionSpeech=spec.points[0]||{};
                fields.seconds.value=Number(spec.seconds.toFixed(3));
                fields.pace.value=spec.pace;
                fields.hold.value=spec.hold;
            } else {
                fields.action.value='walk'; fields.seconds.value=actions.walk.seconds; fields.pace.value='1'; fields.hold.value=0;
            }
            dlg.querySelector('[data-route]').hidden=!routeActions[fields.action.value];
            syncTimingControls();
            renderActionSpeech();
            describeAction();
            showPoints();
            dlg.querySelector('[data-action]').textContent=editing?'Update Timeline Action':'Add Action to Timeline';
        }
        if (recorded) {
            listActions();
            recorded.disabled=true;
            if(editing && (!routeActions[editing.key] || editing.members.every(c=>Array.isArray(c.params?.realistic3DAction?.points)))) loadSelection();
            recorded.onchange=()=>{try {loadSelection();status.textContent='';} catch(e){status.textContent=e.message;}};
        }
        function showPoints() {
            const add = dlg.querySelector('[data-add-waypoint]');
            add.hidden = !destination.length;
            add.disabled = destination.length >= 10;
            dlg.querySelector('[data-pick-walk]').hidden = !!destination.length;
            const list = dlg.querySelector('[data-destination]');
            list.replaceChildren();
            destination.forEach((p,i) => {
                const details=document.createElement('details');
                details.className='realistic-3d-stop';
                details.open=expandedPoints.get(p)??(i===0);
                details.ontoggle=()=>expandedPoints.set(p,details.open);
                const summary=document.createElement('summary');
                summary.setAttribute('data-stop-summary','');
                summary.textContent='Waypoint '+(i+1);
                const row = document.createElement('div');
                row.className = 'realistic-3d-waypoint';
                row.innerHTML = `<button type="button" data-edit title="Pick position for waypoint ${i+1}">#${i+1} (${Math.round(p.x)}, ${Math.round(p.y)})</button>
                    <select aria-label="Waypoint ${i+1} behavior"><option value="pass">${i===destination.length-1?'Finish':'Pass through'}</option><option value="stop">Stop and wait</option></select>
                    <div data-stop-panel><div data-step-list></div>
                        <button type="button" data-add-step><i class="fas fa-plus"></i> Add action</button>
                        <button type="button" data-stop-preview><i class="fas fa-play"></i> Preview this stop</button>
                        <div data-waypoint-speech></div></div>
                    <label>Wait after action (s)<input data-wait type="number" min="0" max="30" step="0.1"></label>
                    <label>Continue with<select data-next-gait aria-label="Waypoint ${i+1} departure gait"><option value="">Current gait</option>${Object.values(routeActions).map(r=>`<option value="${r.gait}">${actions[r.gait].label.replace(' cycle','')}</option>`).join('')}</select></label>
                    <button type="button" data-remove aria-label="Remove waypoint ${i+1}" title="Remove waypoint"><i class="fas fa-trash"></i></button>`;
                const mode=row.querySelector('select'), wait=row.querySelector('[data-wait]');
                mode.value=p.stop?'stop':'pass'; wait.value=p.wait;
                wait.parentElement.hidden=!p.stop; wait.disabled=!p.stop;
                const nextGait=row.querySelector('[data-next-gait]'), panel=row.querySelector('[data-stop-panel]');
                panel.hidden=!p.stop && i<destination.length-1;
                nextGait.value=p.nextGait||'';
                nextGait.parentElement.hidden=!p.stop || i===destination.length-1;
                const steps=stopSteps(p);
                const occupied=()=>{
                    const track=p.waitSpeech && speechTracks(app,target).find(t=>t.audioId===p.audioId);
                    return Math.max(stopSteps(p).reduce((n,s)=>n+s.seconds,0),
                        track?app.audioTimeline._getTrackClipDurationMs(track)/1000+speechOffset(p):0);
                };
                function change(edit) {
                    const before=occupied(); edit(); p.steps=steps;
                    delete p.arrival; delete p.actionSeconds;
                    if(steps.length || p.audioId) p.stop=true;
                    showPoints();retime(occupied()-before);
                }
                const items=steps.length?steps:[{key:'',seconds:1}];
                items.forEach((s,j)=>{
                    const item=document.createElement('div'), name='Waypoint '+(i+1)+(j?' action '+(j+1):'');
                    item.className='realistic-3d-stop-step';
                    item.innerHTML=`<label>${j?'Action '+(j+1):'Action at stop'}<select data-arrival aria-label="${name} arrival action">
                        <option value="">None</option><option value="wave">Wave</option><option value="sit">Sit</option><option value="stand">Stand</option>
                        <optgroup label="Turn by"><option value="turnLeft">Turn left 90 degrees</option><option value="turnRight">Turn right 90 degrees</option></optgroup>
                        <optgroup label="Turn to face">${facings.map(([key,label])=>`<option value="${key}">Face ${label.toLowerCase()}</option>`).join('')}</optgroup></select></label>
                        <label>Action duration (s)<input data-action-seconds aria-label="${name} action duration in seconds" type="number" min="0.2" max="60" step="0.1" required></label>
                        <div data-step-tools></div>`;
                    const select=item.querySelector('select'),duration=item.querySelector('input');
                    select.value=s.key;duration.value=s.seconds;
                    duration.disabled=!s.key || panel.hidden;duration.parentElement.hidden=!s.key;
                    select.onchange=()=>{
                        if(!select.value && p.speech?.anchorStep===s.id && s.id){select.value=s.key;status.textContent='Choose a different speech anchor before removing this action.';return;}
                        change(()=>steps.splice(j,1,...(select.value?[{id:s.id||Utils.generateId('step'),key:select.value,seconds:stopActions[select.value].seconds}]:[])));
                    };
                    duration.onchange=()=>{if(duration.reportValidity()) change(()=>{s.seconds=Number(duration.value);});};
                    const tools=item.querySelector('[data-step-tools]');
                    if(s.key) for(const [label,icon,d,disabled] of [['Move up','arrow-up',-1,!j],['Move down','arrow-down',1,j===steps.length-1],['Remove action','trash',0,false]]){
                        const btn=document.createElement('button'); btn.type='button';btn.disabled=disabled;
                        btn.title=label;btn.setAttribute('aria-label',label+' at waypoint '+(i+1)+', action '+(j+1));
                        btn.innerHTML='<i class="fas fa-'+icon+'" aria-hidden="true"></i>';
                        btn.onclick=()=>{if(!d && p.speech?.anchorStep===s.id){status.textContent='Choose a different speech anchor before removing this action.';return;}
                            change(()=>{steps.splice(j,1);if(d) steps.splice(j+d,0,s);});}; tools.append(btn);
                    }
                    panel.querySelector('[data-step-list]').append(item);
                });
                panel.querySelector('[data-add-step]').onclick=()=>{change(()=>steps.push({id:Utils.generateId('step'),key:'wave',seconds:actions.wave.seconds}));
                    list.children[i]?.querySelectorAll('[data-arrival]')[steps.length-1]?.focus();};
                panel.querySelector('[data-stop-preview]').onclick=()=>playback(i);
                if(!panel.hidden){
                    if(p.audioId && !p.speech){
                        p.speech={audioId:p.audioId,timing:p.waitSpeech?'wait':'continue',offset:0,motion:'mouth-only'};
                        p.legacySpeech=true;
                    }
                    const host=panel.querySelector('[data-waypoint-speech]');
                    let previous=occupied();
                    const sync=()=>{
                        queueRouteSummary();
                        p.audioId=p.speech?.audioId||'';p.waitSpeech=p.speech?.timing==='wait';
                        if(p.audioId)p.stop=true;
                        const current=occupied();
                        if(current!==previous){retime(current-previous);previous=current;}
                    };
                    mountSpeech(host,p,steps,()=>{
                        sync();mode.value=p.stop?'stop':'pass';wait.disabled=!p.stop;wait.parentElement.hidden=!p.stop;
                    });
                }
                nextGait.onchange=()=>{p.nextGait=nextGait.value;retime();};
                row.querySelector('[data-edit]').onclick=()=>pickDestination(i);
                row.querySelector('[data-remove]').onclick=()=>{destination.splice(i,1); showPoints(); retime();};
                mode.onchange=()=>{p.stop=mode.value==='stop'; if(!p.stop){delete p.arrival;delete p.actionSeconds;delete p.steps;delete p.audioId;delete p.waitSpeech;delete p.speech;delete p.legacySpeech;delete p.nextGait;} showPoints(); retime();};
                wait.onchange=()=>{if(wait.reportValidity()){const prev=p.wait||0;p.wait=Number(wait.value);retime(p.wait-prev);}};
                details.append(summary,row);
                list.append(details);
            });
            describeAction();
        }
        function retime(extraDelta) {
            if (!destination.length) {fields.seconds.min=0.2;describeAction();return;}
            try {
                const p=planRoute(app,target,destination,routeActions[fields.action.value],preview.realistic3D,undefined,draftStart());
                const total=Number(fields.seconds.value);
                fields.seconds.min=p.minSeconds;
                fields.seconds.value=Number.isFinite(extraDelta) && total>0 ? Math.max(p.minSeconds,Math.round((total+extraDelta)*10)/10) : p.seconds;
                status.textContent='';
            } catch(error){status.textContent=error.message;}
            describeAction();
        }

        function stageStatus(message, cancel) {
            const notice = document.createElement('div');
            notice.className = 'realistic-3d-stage-status';
            const label = document.createElement('span');
            label.setAttribute('role', 'status');
            label.textContent = message;
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = 'Cancel';
            button.addEventListener('click', cancel);
            notice.append(label, button);
            document.body.append(notice);
            button.focus({ preventScroll: true });
            return notice;
        }
        function closeForStage() {
            if (app.animations?.isPlaying || app.animations?.isPaused) throw new Error('Stop timeline playback first.');
            cancelAnimationFrame(raf);
            parked = true;
            dlg.close();
        }
        function returnToDialog(message) {
            parked = false;
            if (!dlg.isConnected) return;
            status.textContent = message;
            dlg.showModal();
        }
        function pickDestination(index) {
            if (!ready) return;
            const route = routeActions[fields.action.value];
            if (!route) return;
            let anchor;
            try {
                anchor = module.walkAnchor({...draftStart(), realistic3D:preview.realistic3D});
                closeForStage();
            } catch (error) {
                status.textContent = error.message;
                return;
            }
            const { canvas } = app.stage;
            const cursor = canvas.style.cursor;
            canvas.style.cursor = 'crosshair';
            const clearGuide = waypointGuide(app.stage, anchor, destination, index);
            const notice = stageStatus(`Pick waypoint ${index+1} on the stage.`, () => finish('Destination selection canceled.'));
            function finish(message) {
                clearGuide();
                notice.remove();
                canvas.style.cursor = cursor;
                canvas.removeEventListener('click', pick, true);
                canvas.removeEventListener('pointerdown', block, true);
                canvas.removeEventListener('mousedown', block, true);
                window.removeEventListener('keydown', cancel, true);
                returnToDialog(message);
            }
            function block(event) {
                event.preventDefault();
                event.stopImmediatePropagation();
            }
            function pick(event) {
                if (event.button !== 0) return;
                block(event);
                const point = app.stage.screenToStage(event.clientX, event.clientY);
                try {
                    if (point.x < 0 || point.y < 0 || point.x > app.stage.width || point.y > app.stage.height) {
                        throw new Error('Pick a point inside the stage.');
                    }
                    const next = destination.slice();
                    next[index] = {...(next[index] || {stop:false,wait:0}), ...point};
                    const plan = planRoute(app, target, next, route, preview.realistic3D,undefined,draftStart());
                    destination = next;
                    expandedPoints.set(next[index],true);
                    fields.seconds.min = plan.minSeconds;
                    fields.seconds.value = plan.seconds;
                    showPoints();
                    finish('Destination selected.');
                } catch (error) {
                    finish(error.message);
                }
            }
            function cancel(event) {
                if (event.key !== 'Escape') return;
                block(event);
                finish('Destination selection canceled.');
            }
            canvas.addEventListener('click', pick, true);
            canvas.addEventListener('pointerdown', block, true);
            canvas.addEventListener('mousedown', block, true);
            window.addEventListener('keydown', cancel, true);
        }
        function previewRoute(plan, waypoint) {
            if (target.scaleX <= 0 || target.scaleY <= 0 || target.flipH || target.flipV ||
                target.rotation || target.tiltX || target.tiltY || target.depth) {
                throw new Error('Reset the character transform or return to the start of the timeline to preview.');
            }
            const prepared=prepareSpeech(app,target,speechPoints());
            const baseMs=draftDelay();
            const pose = { ...plan.start, realistic3DWave: 0 };
            locomotionProperties.forEach(key => { pose[key] = 0; });
            const index=plan.runs.findIndex(r=>r.endIndex===waypoint), stop=plan.runs[index], next=plan.runs[index+1];
            const windows=plan.runs.map(r=>speechWindow(app,target,r.points.at(-1),baseMs+(r.begin+r.arrivalSeconds)*1000));
            const relevant=(stop?[windows[index]]:windows).filter(Boolean);
            const begin=Math.min(stop?stop.begin+Math.max(0,stop.arrivalSeconds-.8):0,...relevant.map(w=>(w.start-baseMs)/1000));
            const end=Math.max(stop?stop.begin+stop.seconds+(next?.firstStep||0):plan.seconds,...relevant.map(w=>(w.end-baseMs)/1000));
            const duration = end * 1000;
            const captions=[];
            const speech=windows.flatMap(w=>{
                if(!w) return [];
                const {track}=w,entry=prepared.get(track.audioId);
                const start=(w.start-baseMs)/1000,length=(w.end-w.start)/1000;
                if(start>=end || start+length<=begin) return [];
                const existing=app.jointSystem._sequenceCaptionForAudio(track.audioId);
                const draftTrack={...track,timelineStartMs:Math.round(baseMs+start*1000)};
                if(existing){
                    const copy=StageObject.fromJSON(existing.toJSON());
                    global.CaptionRuntime.sync([copy],draftTrack,track);captions.push(copy);
                }
                if(entry) app.jointSystem._installSequenceCaption(entry,draftTrack,captions);
                const configs=entry?tracksOf(entry.animation).map(t=>({t,offset:0})):(target.animations||[]).flatMap(c=>tracksOf(c)
                    .filter(t=>t.type==='audio-lip-sync' && t.adapterKind==='realistic-3d' && t.audioId===track.audioId)
                    .map(t=>({t,offset:(c.delay||0)-(track.timelineStartMs||0)})));
                return [{track,start,length,configs}];
            });
            closeForStage();
            stagePreviews.set(target, { pose, context: app.stage.ctx });
            const time=performance.now()-begin*1000;
            const notice=stageStatus(stop?`Previewing waypoint ${waypoint+1}`:`Previewing ${plan.label}`,()=>finish('Preview stopped.'));
            const renderCaptions=ctx=>{
                const ms=baseMs+Math.min(duration,performance.now()-time);
                ctx.save();
                try{for(const c of captions) if(c.visible!==false) global.CaptionRuntime.paint(ctx,c,c.x,c.y,ms,{objects:[pose,...captions]});}
                finally{ctx.restore();}
            };
            if(captions.length){
                previewCaptionIds.set(app.stage.ctx,new Set(captions.map(c=>c.captionAudioId)));
                eventBus.on('stage:render-overlay',renderCaptions);
            }
            function finish(message) {
                previewCaptionIds.delete(app.stage.ctx);
                eventBus.off('stage:render-overlay',renderCaptions);
                for(const cue of speech) cue.player?.pause();
                notice.remove();
                window.removeEventListener('keydown', cancel, true);
                cancelAnimationFrame(raf);
                stagePreviews.delete(target);
                app.stage.requestRender();
                returnToDialog(message);
            }
            function cancel(event) {
                if (event.key !== 'Escape') return;
                event.preventDefault();
                event.stopImmediatePropagation();
                finish('Preview stopped.');
            }
            function tick(now) {
                if (app.animations?.isPlaying || !app.objects.objects.includes(target)) {
                    finish('Preview stopped.');
                    return;
                }
                const elapsed = Math.min(duration,now - time);
                const run = plan.runs.find(r=>elapsed/1000 < r.begin+r.seconds) || plan.runs.at(-1);
                const progress = bounded((elapsed/1000-run.begin)/run.seconds, 0, 1);
                locomotionProperties.forEach(key=>{pose[key]=0;});
                pose.realistic3DSit=plan.standalone?(plan.start.realistic3DSit||0):0;
                pose.realistic3DWave=0;
                for (const [key, frames] of Object.entries(run.tracks)) {
                    const next = frames.findIndex(frame => frame.t > progress);
                    pose[key] = next < 1 ? frames.at(-1).value
                        : Utils.lerp(frames[next - 1].value, frames[next].value, (progress - frames[next - 1].t) / (frames[next].t - frames[next - 1].t));
                }
                delete pose._realistic3DSpeech;
                for(const cue of speech){
                    const local=elapsed/1000-cue.start;
                    if(local<0 || local>=cue.length){cue.player?.pause();continue;}
                    if(!cue.player && cue.track.audioElement){
                        const player=cue.player=cue.track.audioElement.cloneNode();
                        player.currentTime=(cue.track.trimStartMs||0)/1000+local;
                        player.volume=bounded(cue.track.volume??1,0,1);player.muted=!!cue.track.muted;
                        player.play().catch(()=>{if(notice.isConnected) notice.querySelector('span').textContent='Motion preview (audio unavailable)';});
                    }
                    for(const {t,offset} of cue.configs){
                        const ms=local*1000-offset;
                        if(ms>=0 && ms<t.duration) global.AudioLipSyncRuntime?.applyExportFrame(t,ms,{[target.id]:pose});
                    }
                }
                app.stage.requestRender();
                if (now-time >= duration + 300) finish('Preview complete.');
                else raf = requestAnimationFrame(tick);
            }
            window.addEventListener('keydown', cancel, true);
            raf = requestAnimationFrame(tick);
        }

        function paint() {
            context.clearRect(0, 0, 320, 420);
            if (ready) return draw(context, preview, () => {
                if (dlg.isConnected) refresh();
            });
            return false;
        }
        async function refresh() {
            const next = normalize(Object.fromEntries(new FormData(form)));
            if (target) {
                const previous = normalize(target.realistic3D);
                dlg.querySelector('[data-action]').textContent = editing ? 'Update Timeline Action' : Object.keys(next).some(key => next[key] !== previous[key])
                    ? 'Apply Appearance and Add Action' : 'Add Action to Timeline';
            }
            const size = Math.round(Math.abs(next.build) * 100);
            fields.build.setAttribute('aria-valuetext', size ? `${size}% toward ${next.build < 0 ? 'slender' : 'fuller'}` : 'Original build');
            if (ready && preview.realistic3D.id === next.id) {
                preview.realistic3D = next;
                paint();
                return;
            }
            cancelAnimationFrame(raf);
            const generation = ++serial;
            preview.realistic3D = next;
            channels.forEach(key => { preview[key] = 0; });
            ready = false;
            submitButtons.forEach(button => { button.disabled = true; });
            status.textContent = '';
            modelState('Loading ' + labels[next.id] + '...', true);
            paint();
            try {
                await preload([preview]);
                if (generation !== serial) return;
                ready = true;
                if (!paint()) {
                    ready = false;
                    modelState('Waiting for browser graphics to recover...', true);
                    return;
                }
                submitButtons.forEach(button => { button.disabled = false; });
                modelState('');
                describeAction();
                status.textContent = '';
                if (recorded?.disabled) {
                    recorded.disabled=false;
                    if (editing) loadSelection();
                }
            } catch (error) {
                if (generation !== serial) return;
                ready = false;
                modelState(error?.code === 'webgl-unavailable' ? error.message
                    : 'Could not load the 3D character or its textures. Reload the editor and try again.');
                console.warn('[3D Characters]', error);
            }
        }
        form.addEventListener('input', event => {
            if (event.target.name === 'action') {
                fields.pace.value='1';
                fields.hold.value=0;
                syncTimingControls();
                const route = routeActions[fields.action.value];
                if (target) dlg.querySelector('[data-route]').hidden = !route;
                renderActionSpeech();
                fields.seconds.min = 0.2;
                fields.seconds.value = actions[route?.gait || fields.action.value].seconds;
                if (route && destination.length) {
                    try {
                        const plan = planRoute(app, target, destination, route, preview.realistic3D,undefined,draftStart());
                        fields.seconds.min = plan.minSeconds;
                        fields.seconds.value = plan.seconds;
                    } catch (error) {
                        status.textContent = error.message;
                    }
                }
            }
            else if (event.target.name && !['seconds','pace','hold'].includes(event.target.name)) refresh();
        });
        function playback(waypoint) {
            if (!ready || !form.reportValidity()) return;
            const route = routeActions[fields.action.value];
            if (route) {
                try {
                    previewRoute(planRoute(app, target, destination, route, preview.realistic3D, Number(fields.seconds.value),draftStart(),editing),waypoint);
                } catch (error) {
                    status.textContent = error.message;
                }
                return;
            }
            if(target && actionSpeech.audioId){
                try{
                    const start=draftStart(),spec={key:fields.action.value,seconds:Number(fields.seconds.value),pace:fields.pace.value,hold:fields.hold.value,points:[actionSpeech]};
                    start.realistic3D=preview.realistic3D;
                    const [clip]=buildAction(app,target,spec,start,draftDelay(),start.realistic3D),src=clip.params.realistic3DAction;
                    const seconds=clip.generated[0].duration/1000;
                    previewRoute({standalone:true,label:actions[spec.key].label,start,seconds,runs:[{points:src.points,begin:0,seconds,arrivalSeconds:src.arrivalSeconds,
                        tracks:Object.fromEntries(clip.generated.map(t=>[t.property,t.keyframes]))}]},null);
                }catch(error){status.textContent=error.message;}
                return;
            }
            cancelAnimationFrame(raf);
            const action = actions[fields.action.value];
            const duration = Number(fields.seconds.value) * 1000;
            const start = performance.now();
            channels.forEach(key => { preview[key] = 0; });
            const timing=motionTiming(fields.action.value,duration/1000,fields.pace.value);
            if(timing) preview[timing.property]=timing.count;
            function tick(now) {
                const p = bounded((now - start) / duration, 0, 1);
                preview[action.property] = (action.from || 0) * (1 - p) + p * action.value;
                paint();
                if (now-start < duration+(fields.hold.disabled?0:Number(fields.hold.value)*1000)) raf = requestAnimationFrame(tick);
            }
            raf = requestAnimationFrame(tick);
        }
        dlg.querySelector('[data-pick-walk]')?.addEventListener('click', ()=>pickDestination(0));
        dlg.querySelector('[data-add-waypoint]')?.addEventListener('click', ()=>pickDestination(destination.length));
        dlg.querySelector('[data-preview]').addEventListener('click', playback);
        dlg.querySelector('[data-action]')?.addEventListener('click', () => {
            if (!ready || !form.reportValidity() || !app.objects.objects.includes(target)) return;
            try {
                const spec={key:fields.action.value,seconds:Number(fields.seconds.value),pace:fields.pace.value,hold:fields.hold.value,points:speechPoints()};
                const appearance={...preview.realistic3D};
                const oldId=editing?.members[0].id;
                const original=new Set(target.animations || []);
                const linked=new Set(spec.points.map(p=>p.audioId).filter(Boolean));
                for(const clip of original){
                    if(!editing?.members.includes(clip) && clip.params?.realistic3DAction?.points?.some(p=>p.audioId && linked.has(p.audioId)))
                        throw Error('That speech clip already starts on another action or route. Unlink it there first.');
                }
                const prepared=prepareSpeech(app,target,spec.points);
                let savedId=oldId;
                if (oldId) replaceAction(app,target,oldId,spec,appearance);
                else {
                    const list=target.animations ||= [];
                    const clips=buildAction(app,target,spec,draftStart(),nextActionDelay(list,linked),appearance);
                    list.push(...clips);
                    savedId=clips[0].id;
                }
                let movedSpeech=false;
                for(const clip of target.animations){
                    if(original.has(clip)) continue;
                    const src=clip.params?.realistic3DAction, audioId=src?.points?.at(-1)?.audioId;
                    if(!audioId) continue;
                    const audio=app.audioTimeline, track=speechTracks(app,target).find(t=>t.audioId===audioId);
                    if(!track) continue;
                    const entry=prepared.get(audioId), point=src.points.at(-1);
                    const {start}=speechWindow(app,target,point,clip.delay+src.arrivalSeconds*1000);
                    if(entry){
                        entry.startMs=0;
                        app.jointSystem._installCharacterSequenceSpeech({speech:[entry],rootId:target.id,name:routeActions[spec.key]?'Waypoint speech':'Action speech'},
                            start,clip.id,{temporary:true,route:true});
                        movedSpeech=true;continue;
                    }
                    const old=track.timelineStartMs||0;
                    if(old===start) continue;
                    track.timelineStartMs=start;
                    audio._syncLinkedLipSyncTiming(track,old);
                    if(audio.activeAudioId===audioId){audio._applyActiveTrack(track);audio._refreshEditControls();}
                    movedSpeech=true;
                }
                if(movedSpeech){app._saveCurrentSceneAudioOnly?.();app.audioTimeline._refreshEditControls();app.audioTimeline._refreshTimelineUI();}
                recentRecording.set(target,savedId);
                target.realistic3D=appearance;
                notifyEdit(app,target);
                groups.splice(0,groups.length,...actionGroups(target));
                editing=oldId && groups.find(g=>g.members[0].id===oldId);
                listActions();
                if (!editing) {destination=[];actionSpeech={};renderActionSpeech();showPoints();fields.seconds.min=.2;}
            } catch (error) {
                status.textContent = error.message;
                return;
            }
            app.stage.requestRender();
            dlg.querySelector('[data-action]').textContent = editing?'Update Timeline Action':'Add Action to Timeline';
            status.textContent = editing?'Timeline action updated.':'Action added to timeline.';
            if (!dlg.querySelector('[data-keep-open]').checked) {
                dlg.close();
            }
            describeAction();
            offerReplay(app,target,recentRecording.get(target));
        });
        dlg.querySelector('[data-close]').addEventListener('click', () => dlg.close());
        dlg.addEventListener('close', () => {
            if (parked || dlg.open) return;
            serial++;
            cancelAnimationFrame(summaryFrame);
            cancelAnimationFrame(raf);
            dlg.remove();
        });
        form.addEventListener('submit', event => {
            event.preventDefault();
            if (!ready) return;
            const appearance = { ...preview.realistic3D };
            if (target && app.objects.objects.includes(target)) {
                target.realistic3D = appearance;
                app.stage.requestRender();
                eventBus.emit('history:push');
            } else if (!target) {
                const size = app.stage;
                const height = Math.round(size.height * 0.72);
                const width = Math.round(height * 0.72);
                const props = { realistic3D: appearance, name: labels[appearance.id], width, height,
                    x: (size.width - width) / 2, y: (size.height - height) / 2, strokeWidth: 0 };
                const obj = new StageObject('image', props);
                app.objects.addObject(obj);
                app.objects.select([obj.id]);
                if (event.submitter?.hasAttribute('data-create-action')) {
                    const clip=addAction(app, obj, fields.action.value, fields.seconds.value,fields.pace.value,fields.hold.value);
                    if (clip) offerReplay(app,obj,clip.id);
                }
            }
            dlg.close();
        });
        dlg.showModal();
        if(!editing)renderActionSpeech();
        describeAction();
        refresh();
    }

    function editRecorded(app, obj) {
        open(app,obj);
    }
    global.Realistic3DLibrary = Object.freeze({ url: url.href, previewUrl: previewUrl.href, normalize, channels, draw, preload, open, addAction, editRecorded,
        isPreviewingCaption:(ctx,id)=>previewCaptionIds.get(ctx)?.has(id),
        canEdit:(obj,clip)=>!!(obj?.realistic3D && actionInfo(clip)) });
})(globalThis);
