/* Character sequences compile through the existing armature recorder and timeline. */
(() => {
    const clone = value => Utils.cloneProjectState(value);
    const views = ['front', 'side:right', 'side:left', 'back', 'front-3q:right', 'front-3q:left', 'back-3q:right', 'back-3q:left'];
    const turnViews = views;
    const label = view => view.replaceAll(':', ' ').replace('3q', '3/4');
    const storageKey = 'animationStage.characterSequences.v1';
    const number = (value, min, max, name) => {
        if (!Number.isFinite(value) || value < min || value > max) throw Error(`${name} must be between ${min} and ${max}.`);
        return value;
    };
    Object.assign(JointSystem.prototype, {
        _newTravelWaypoint() { return {id:Utils.generateId('waypoint'),x:null,y:null,key:'',duration:2,pause:0,turn:'keep',turnDuration:.5}; },
        _travelMovementChoices(catalog, view) {
            const lean = view.includes('3q') ? view.split(':')[1] : null;
            return catalog.movement.filter(entry => entry.routeTravel).sort((a,b) => {
                const score = entry => (lean && entry.key.includes('3q') && entry.key.endsWith(lean) ? 10 : 0)
                    + (/walk/.test(entry.key) ? 3 : /strut/.test(entry.key) ? 2 : 0);
                return score(b)-score(a);
            });
        },
        _travelMovementForView(choices, key) {
            if (choices.some(entry => entry.key === key)) return key;
            const gait = /run|sprint/.test(key || '') ? /run/ : /stroll/.test(key || '') ? /stroll/ : /strut/.test(key || '') ? /strut/ : /walk|strut/;
            return (choices.find(entry => gait.test(entry.key)) || choices[0])?.key || '';
        },
        _canChangeSequenceStepKind(step, kind, status) {
            if(kind==='handoff'&&step.headTurn){
                status('Move head turns to a separate step before selecting Hand over prop.');return false;
            }
            if(kind==='travel-route'&&step.headTurn){
                status('Remove the head turn before changing this step to Multi-Point Travel.');
                return false;
            }
            return true;
        },
        _editTravelRouteOnStage(route,rig,host,index,onChange) {
            this._cancelMultiPointEdit?.();
            if(this.animations.isPlaying||this.animations._exportingVideo||window.app.stageCamera?._editMode)throw Error('Stop playback and close the camera editor first.');
            const canvas=this.stage.canvas,panel=host.closest('[role="dialog"]')||host,hidden=panel.hidden,cursor=canvas.style.cursor;
            let dragging=null;
            const points=()=>[{...(route.start||this._crossViewAnchor(rig)),label:'S'},...route.points.map((p,i)=>({...p,label:String(i+1)}))];
const draw=ctx=>{if(this.animations.isPlaying||this.animations._exportingVideo)return;if(!host.isConnected){cleanup();return;}const list=points();ctx.save();ctx.lineWidth=2/this.stage.zoom;ctx.strokeStyle='#22d3ee';ctx.fillStyle='#111827';ctx.font=`${13/this.stage.zoom}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.beginPath();let previous=false;for(const p of list){if(!Number.isFinite(p.x)||!Number.isFinite(p.y)){previous=false;continue;}if(previous)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y);previous=true;}ctx.stroke();for(const p of list){if(!Number.isFinite(p.x)||!Number.isFinite(p.y))continue;ctx.fillStyle='#111827';ctx.beginPath();ctx.arc(p.x,p.y,12/this.stage.zoom,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#ffffff';ctx.fillText(p.label,p.x,p.y);}ctx.restore();};
            const assign=(i,p)=>{if(i===-1)route.start={x:p.x,y:p.y};else Object.assign(route.points[i],{x:p.x,y:p.y});this.stage.requestRender();};
            const cleanup=()=>{window.removeEventListener('mousedown',down,true);window.removeEventListener('mousemove',move,true);window.removeEventListener('mouseup',up,true);window.removeEventListener('keydown',key,true);eventBus.off('stage:render-overlay',draw);panel.hidden=hidden;canvas.style.cursor=cursor;this._cancelMultiPointEdit=null;this.stage.requestRender();};
            const finish=()=>{cleanup();onChange();};
            const down=e=>{if(e.button!==0||e.target!==canvas)return;e.preventDefault();e.stopImmediatePropagation();if(this.animations.isPlaying||this.animations._exportingVideo){finish();return;}const p=this.stage.screenToStage(e.clientX,e.clientY);if(index!=null){assign(index,p);finish();return;}const hit=points().findIndex(v=>Number.isFinite(v.x)&&Math.hypot(v.x-p.x,v.y-p.y)<18/this.stage.zoom);if(hit>=0)dragging=hit-1;};
            const move=e=>{if(dragging==null)return;e.preventDefault();e.stopImmediatePropagation();if(this.animations.isPlaying||this.animations._exportingVideo){finish();return;}assign(dragging,this.stage.screenToStage(e.clientX,e.clientY));};
            const up=e=>{if(dragging==null)return;e.preventDefault();e.stopImmediatePropagation();dragging=null;};
            const key=e=>{if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();finish();}};
            this._cancelMultiPointEdit=cleanup;panel.hidden=true;canvas.style.cursor='crosshair';
            window.addEventListener('mousedown',down,true);window.addEventListener('mousemove',move,true);window.addEventListener('mouseup',up,true);window.addEventListener('keydown',key,true);eventBus.on('stage:render-overlay',draw);this.stage.requestRender();
            Utils.showToast(index!=null?'Click a route point. Escape cancels.':'Drag numbered route points. Escape finishes editing.','info');
        },
        async _mountTravelRouteFields(host,step,{rig,view,invalidate,render,status,...context}) {
            step.route ||= {start:null,points:[this._newTravelWaypoint(),this._newTravelWaypoint()]};
            const route=step.route,box=document.createElement('div');box.className='sequence-travel-route';host.append(box);
            const speechContext={...context,rig,invalidate,render,status,alive:context.alive||(()=>host.isConnected)};
            const speechBox=document.createElement('div');box.append(speechBox);
            this._mountSequenceSpeechFields?.(speechBox,step,speechContext);
            const speechTitle=speechBox.querySelector('.sequence-speech > summary');if(speechTitle)speechTitle.textContent='Speech across route';
            const row=()=>{const el=document.createElement('div');el.className='sequence-fields';box.append(el);return el;};
            const field=(parent,title,input)=>{const label=document.createElement('label');label.append(title,input);parent.append(label);return input;};
            const button=(parent,icon,title,fn)=>{const b=document.createElement('button');b.type='button';b.title=title;b.setAttribute('aria-label',title);b.innerHTML=`<i class="fas fa-${icon}"></i>`;b.onclick=fn;parent.append(b);return b;};
            const update=()=>{invalidate();render();};
            route.points.forEach(p=>{p.id ||= Utils.generateId('waypoint');});
            const range=row();
            speechBox.querySelector('.sequence-speech')?.append(range);
            for(const [key,title]of [['from','Speech range start'],['to','Speech range end']]){
                const input=document.createElement('select');input.setAttribute('aria-label',title);
                input.append(new Option(key==='from'?'Route start':'Last arrival',''));
                route.points.forEach((p,i)=>input.append(new Option(`${key==='from'?'Travel to':'Arrival at'} destination ${i+1}`,p.id)));
                const value=route.speechRange?.[key]||'';
                if(value&&!route.points.some(p=>p.id===value))input.append(new Option('Removed waypoint - choose again',value));
                input.value=value;field(range,title,input).onchange=()=>{invalidate();route.speechRange||={};route.speechRange[key]=input.value||null;};
            }
            const pick=i=>{invalidate();try{this._editTravelRouteOnStage(route,rig,box,i,update);}catch(error){status(error.message);}};
            const tools=row(),count=document.createElement('input');count.type='number';count.min=2;count.max=12;count.step=1;count.value=route.points.length;
            field(tools,'Destinations',count).onchange=()=>{const n=count.valueAsNumber;if(!Number.isInteger(n)||n<2||n>12){count.value=route.points.length;status('Choose 2-12 destinations.');return;}while(route.points.length<n)route.points.push(this._newTravelWaypoint());route.points.length=n;update();};
            button(tools,'plus','Add waypoint',()=>{if(route.points.length<12){route.points.push(this._newTravelWaypoint());update();}});
            button(tools,'route','Edit route markers on stage',()=>pick(null));
            const start=row(),mode=document.createElement('select');mode.setAttribute('aria-label','Route start');mode.append(new Option('Current position at this step','current'),new Option('Picked start position','picked'));mode.value=route.start?'picked':'current';
            field(start,'Start',mode).onchange=()=>{if(mode.value==='current'){route.start=null;update();}else pick(-1);};
            button(start,'crosshairs','Pick route start',()=>pick(-1));
            const wait=document.createElement('input');wait.type='number';wait.min=0;wait.max=120;wait.step='.1';wait.value=step.wait??0;
            field(row(),'Wait after route (s)',wait).onchange=()=>{invalidate();step.wait=wait.valueAsNumber;};
            if(route.start){const value=document.createElement('output');value.textContent=`${route.start.x.toFixed(1)}, ${route.start.y.toFixed(1)}`;start.append(value);}
            let facing=view;
            for(const [i,p]of route.points.entries()){
                p.id ||= Utils.generateId('waypoint');
                const heading=document.createElement('strong');heading.textContent=`Destination ${i+1} - ${label(facing)}`;box.append(heading);const fields=row();
                for(const axis of ['x','y']){const input=document.createElement('input');input.type='number';input.step='1';input.value=p[axis]??'';field(fields,axis.toUpperCase(),input).onchange=()=>{invalidate();p[axis]=input.value===''?null:input.valueAsNumber;};}
                button(fields,'crosshairs',`Pick destination ${i+1}`,()=>pick(i));
                button(fields,'arrow-up',`Move waypoint ${i+1} up`,()=>{if(i){[route.points[i-1],route.points[i]]=[p,route.points[i-1]];update();}}).disabled=i===0;
                button(fields,'arrow-down',`Move waypoint ${i+1} down`,()=>{if(i<route.points.length-1){[route.points[i],route.points[i+1]]=[route.points[i+1],p];update();}}).disabled=i===route.points.length-1;
                button(fields,'trash',`Delete waypoint ${i+1}`,()=>{if(route.points.length>2){route.points.splice(i,1);update();}}).disabled=route.points.length<=2;
                const catalog=await this._characterSequenceCatalog(rig,facing);
                const choices=this._travelMovementChoices(catalog,facing);
                const action=document.createElement('select');action.append(new Option('Choose travel movement',''));choices.forEach(entry=>action.append(new Option(entry.name,entry.key)));
                p.key=this._travelMovementForView(choices,p.key);
                if(p.key&&!choices.some(e=>e.key===p.key))action.append(new Option(`${p.key} (check this view)`,p.key));action.value=p.key;
                field(fields,'Travel movement',action).onchange=()=>{invalidate();p.key=action.value;};
                for(const [key,title,min,max]of [['duration','Travel seconds',.05,120],['pause','Pause on arrival (s)',0,120],['turnDuration','Turn seconds',.15,10]]){const input=document.createElement('input');input.type='number';input.min=min;input.max=max;input.step='.1';input.value=p[key];field(fields,title,input).onchange=()=>{invalidate();p[key]=input.valueAsNumber;};}
                const turn=document.createElement('select');[['keep','Keep facing'],['flip','Flip'],...views.map(v=>[v,label(v)])].forEach(([value,title])=>turn.append(new Option(title,value)));turn.value=p.turn;
                field(fields,'After arrival',turn).onchange=()=>{p.turn=turn.value;update();};facing=this._travelWaypointView(p.turn,facing);
                const when=document.createElement('select');when.append(new Option('During travel to this point','departure'),new Option('On arrival','arrival'));when.value=p.speechAt||'departure';
                field(fields,'Speech starts',when).onchange=()=>{invalidate();p.speechAt=when.value;};
                const pointSpeech=document.createElement('div');box.append(pointSpeech);
                this._mountSequenceSpeechFields?.(pointSpeech,p,speechContext);
                const title=pointSpeech.querySelector('.sequence-speech > summary');if(title)title.textContent=`Speech at waypoint ${i+1}`;
            }
        },
        _travelRouteEndView(route, view) {
            for(const point of route?.points || [])view=this._travelWaypointView(point.turn,view);
            return view;
        },
        _travelWaypointView(turn, view) {
            if(!turn||turn==='keep')return view;
            if(turn!=='flip')return turn;
            return {front:'back',back:'front','side:right':'side:left','side:left':'side:right','front-3q:right':'back-3q:left','front-3q:left':'back-3q:right','back-3q:right':'front-3q:left','back-3q:left':'front-3q:right'}[view];
        },
        _validateTravelRoute(step) {
            const route=step.route;
            if(!route||!Array.isArray(route.points)||route.points.length<2||route.points.length>12)throw Error('Multi-Point Travel needs 2-12 destinations.');
            const point=(p,name)=>{if(!p)throw Error(`Choose ${name}.`);number(p.x,-100000,100000,`${name} X`);number(p.y,-100000,100000,`${name} Y`);};
            if(route.start)point(route.start,'route start');
            let duration=0;
            const waypointIds=new Set();
            route.points.forEach((p,i)=>{point(p,`destination ${i+1}`);if(typeof p.key!=='string'||!p.key)throw Error(`Choose a movement for destination ${i+1}.`);
                p.id ||= Utils.generateId('waypoint');
                if(waypointIds.has(p.id)||p.id===step.id)throw Error('Waypoint IDs must be unique.');waypointIds.add(p.id);
                if(!['departure','arrival'].includes(p.speechAt||'departure'))throw Error('Choose departure or arrival for waypoint speech.');
                number(p.duration,.05,120,'Leg duration');number(p.pause,0,120,'Arrival pause');number(p.turnDuration,.15,10,'Turn duration');
                if(!['keep','flip',...views].includes(p.turn))throw Error('Choose a valid arrival turn.');
                duration+=p.duration+p.pause+(p.turn==='keep'?0:p.turnDuration);
            });
            if(step.headTurn)throw Error('Place head turns in an adjacent sequence step, outside Multi-Point Travel.');
            const range=this._travelSpeechRange(route),first=route.points[range.from];
            if(step.speech?.audioId&&first.speech?.audioId&&first.speechAt!=='arrival')throw Error('Route speech and waypoint departure speech start together. Choose one, or start waypoint speech on arrival.');
            step.duration=duration;step.cycles=1;step.transition=0;
            return duration;
        },
        _travelSpeechRange(route) {
            const index=(key,fallback)=>{const id=route.speechRange?.[key];if(!id)return fallback;
                const i=route.points.findIndex(p=>p.id===id);if(i<0)throw Error('Speech range refers to a removed waypoint. Choose its start and end again.');return i;};
            const from=index('from',0),to=index('to',route.points.length-1);
            if(from>to)throw Error('Speech range must end at or after its starting destination.');
            return {from,to};
        },
        async _compileTravelRoutes(rig, recipe, options) {
            const expanded={...clone(recipe),steps:[]},groups=[],beforeStep={},stepEnds={},speechOwners=new Map(),ranges=[];
            let view=recipe.view;
            for(const [index,step]of recipe.steps.entries()){
                const items=[];
                if(step.kind!=='travel-route'){items.push(clone(step));if(step.kind==='turn')view=step.target;}
                else {
                    const legs=[];
                    for(const [i,p]of step.route.points.entries()){
                        const choices=this._travelMovementChoices(await this._characterSequenceCatalog(rig,view),view);
                        p.key=this._travelMovementForView(choices,p.key);
                        if(!p.key)throw Error(`No travelling movement is available for ${label(view)}.`);
                        const leg={...this._newCharacterSequenceStep('movement'),id:i===0?step.id:`${step.id}:leg:${i}`,key:p.key,duration:p.duration,transition:0,wait:p.pause,
                            travelTarget:{x:p.x,y:p.y},_routeStart:i===0?step.route.start:null};items.push(leg);legs.push(leg);
                        leg._timingName=`Travel to ${i+1}`;leg._sourceStepId=step.id;
                        if(p.speech?.audioId){
                            let spoken=leg;
                            if(p.speechAt==='arrival'){leg.wait=0;spoken={...this._newCharacterSequenceStep('wait'),id:`step:${p.id}:arrival`,duration:.05,wait:p.pause};items.push(spoken);}
                            spoken.speech=clone(p.speech);spoken._sourceStepId=step.id;speechOwners.set(spoken.id,p.id);
                        }
                        const target=this._travelWaypointView(p.turn,view);
                        if(p.turn!=='keep'){items.push({...this._newCharacterSequenceStep('turn'),id:`${step.id}:turn:${i}`,target,duration:p.turnDuration,transition:0,smoothBodyTurn:true,turnTiming:'quick',turnSeconds:p.turnDuration,turnPosture:'idle',_sourceStepId:step.id,_timingName:`Turn at ${i+1}`});view=target;}
                    }
                    items[0].id=step.id;items[0].clearProps=step.clearProps;
                    if(step.speech?.audioId){const range=this._travelSpeechRange(step.route),spoken=legs[range.from];
                        spoken.speech=clone(step.speech);spoken._speechWaitUntil=step.route.speechRange?legs[range.to].id:items.at(-1).id;speechOwners.set(spoken.id,step.id);
                        ranges.push({stepId:step.id,fromId:spoken.id,toId:legs[range.to].id,from:range.from,to:range.to});}
                    if(this._choreographyCompiling)for(const item of items)if(item.speech?.audioId&&item.speech.timing==='continue'){
                        item.speech.timing='wait';item._speechWaitUntil=items.at(-1).id;
                    }
                    items.at(-1).wait+=step.wait;
                }
                expanded.steps.push(...items);groups.push({id:step.id,index,ids:items.map(s=>s.id)});
                if(options.beforeStep?.[step.id]!=null)beforeStep[items[0].id]=options.beforeStep[step.id];
                if(options.stepEnds?.[step.id]!=null)stepEnds[items.at(-1).id]=options.stepEnds[step.id];
            }
            const clip=await this._compileCharacterSequence(rig,expanded,{...options,beforeStep,stepEnds,_expandedTravel:true});
            const detailed=clip.schedule;
            clip.schedule=groups.map(g=>{const entries=detailed.filter(e=>g.ids.includes(e.id));return {id:g.id,index:g.index,start:entries[0].start,end:entries.at(-1).end,view:entries.at(-1).view};});
            clip.routeSchedule=detailed;
            for(const entry of clip.speech||[])entry.stepId=speechOwners.get(entry.stepId)||entry.stepId;
            clip.speechRanges=ranges.map(range=>{const first=detailed.find(e=>e.id===range.fromId),last=detailed.find(e=>e.id===range.toId);
                const spoken=clip.speech.find(e=>e.stepId===range.stepId),end=last.motionEnd??last.end;
                if(spoken?.timing!=='independent'&&spoken?.endMs>end+1)clip.validation.warnings.push({message:`Speech exceeds its selected range (destinations ${range.from+1}-${range.to+1}) by ${((spoken.endMs-end)/1000).toFixed(2)} s. Extend travel/pause time or shorten the speech.`});
                return {...range,start:first.start,end,rootId:rig.root.id};});
            for(const step of clip.recipe.sequence.steps)if(step._travelFacingWarning)clip.validation.warnings.push({message:step._travelFacingWarning});
            clip.recipe.sequence=clone(recipe);clip.recipe.schedule=clip.schedule;
            return clip;
        },

        _smoothBodyTurnRoute(from, to, direction = 'shortest') {
            const ring = ['front', 'front-3q:right', 'side:right', 'back-3q:right', 'back', 'back-3q:left', 'side:left', 'front-3q:left'];
            const start = ring.indexOf(from), end = ring.indexOf(to);
            if (start < 0 || end < 0) throw Error('Unsupported body-turn view.');
            if (start === end) return [to];
            const forward = (end - start + ring.length) % ring.length;
            const sign = direction === 'right' ? 1 : direction === 'left' ? -1 : forward <= 4 ? 1 : -1;
            const result = [];
            for (let index = (start + sign + 8) % 8; ; index = (index + sign + 8) % 8) {
                result.push(ring[index]); if (index === end) return result;
            }
        },

        _mountBodyTurnFields(host, step, invalidate) {
            const fields = document.createElement('div'); fields.className = 'sequence-fields sequence-body-turn-fields'; host.append(fields);
            const toggle = document.createElement('input'); toggle.type = 'checkbox'; toggle.checked = !!step.smoothBodyTurn;
            toggle.title = 'Turn through drawn intermediate views using the selected posture.';
            const label = document.createElement('label'); label.append(toggle, document.createTextNode('Smooth body turn (experimental)')); fields.append(label);
            toggle.onchange = () => { step.smoothBodyTurn = toggle.checked; direction.disabled = lead.disabled = !toggle.checked; invalidate(); };
            const direction = document.createElement('select'); direction.setAttribute('aria-label', 'Body turn route');
            [['shortest', 'Shortest route'], ['left', 'Counterclockwise'], ['right', 'Clockwise']].forEach(([value, text]) => direction.append(new Option(text, value)));
            direction.value = step.turnDirection || 'shortest'; direction.disabled = !step.smoothBodyTurn;
            direction.onchange = () => { step.turnDirection = direction.value; invalidate(); }; fields.append(direction);
            const mode = document.createElement('select'); mode.setAttribute('aria-label', 'Body turn timing');
            mode.append(new Option('Quick pivot', 'quick'), new Option('Gradual turn', 'gradual'));
            mode.value = step.turnTiming || 'gradual'; fields.append(mode);
            const seconds = document.createElement('input'); seconds.type = 'number'; seconds.min = .15; seconds.max = 10; seconds.step = .05;
            seconds.value = step.turnSeconds ?? ''; seconds.placeholder = 'Step duration'; seconds.setAttribute('aria-label', 'Body turn duration (seconds)');
            seconds.title = 'Time spent turning. Remaining step time holds the destination pose. Short steps limit the turn to the available time.';
            const timingLabel = document.createElement('label'); timingLabel.append(document.createTextNode('Turn duration (s)'), seconds); fields.append(timingLabel);
            mode.onchange = () => { step.turnTiming = mode.value; if (mode.value === 'quick' && step.turnSeconds == null) { step.turnSeconds = .5; seconds.value = .5; } invalidate(); };
            seconds.onchange = () => { step.turnSeconds = seconds.value === '' ? null : seconds.valueAsNumber; invalidate(); };
            const posture = document.createElement('select'); posture.setAttribute('aria-label', 'Body turn posture');
            [['idle', 'Standing / idle'], ['current', 'Keep current pose'], ['seated', 'Seated'], ['walking', 'Walking pivot']].forEach(([value, text]) => posture.append(new Option(text, value)));
            posture.value = step.turnPosture || 'idle';
            posture.title = 'Seated characters stay seated. Standing characters turn first, then sit.';
            posture.onchange = () => { step.turnPosture = posture.value; invalidate(); }; fields.append(posture);
            const lead = document.createElement('input'); lead.type = 'checkbox'; lead.checked = !!step.turnHeadLead; lead.disabled = !step.smoothBodyTurn;
            lead.title = 'Optional anticipation during a body turn. Use a separate head-turn overlay to turn only the head.';
            const leadLabel = document.createElement('label'); leadLabel.append(lead, document.createTextNode('Head leads body turn')); fields.append(leadLabel);
            lead.onchange = () => { step.turnHeadLead = lead.checked; if (!lead.checked) { step.turnShoulderLead = false; shoulders.checked = false; } invalidate(); };
            const shoulders = document.createElement('input'); shoulders.type = 'checkbox'; shoulders.checked = !!step.turnShoulderLead;
            const shoulderLabel = document.createElement('label'); shoulderLabel.append(shoulders, document.createTextNode('Shoulders follow head')); fields.append(shoulderLabel);
            shoulders.onchange = () => { step.turnShoulderLead = shoulders.checked; if (shoulders.checked) { step.turnHeadLead = true; lead.checked = true; } invalidate(); };
            const coordination = document.createElement('select'); coordination.setAttribute('aria-label', 'Head and body coordination');
            [['legacy','Existing turn'],['together','Head and body together'],['head-first','Head first, then body'],['follow-head','Body follows existing head turn']].forEach(([value,text])=>coordination.append(new Option(text,value)));
            coordination.value=step.turnCoordination||'legacy'; fields.append(coordination);
            coordination.title='Together: turn head and body concurrently. Head first: lead with the head. Follow head: continue a preceding head-only turn into the body turn. Requires Smooth body turn.';
            const delay=document.createElement('input'); delay.type='number';delay.min=.1;delay.max=3;delay.step=.05;delay.value=step.turnHeadDelay??.4;delay.setAttribute('aria-label','Head lead time (seconds)');
            const delayLabel=document.createElement('label');delayLabel.append(document.createTextNode('Head lead time (s)'),delay);fields.append(delayLabel);
            coordination.onchange=()=>{step.turnCoordination=coordination.value;invalidate();};
            delay.onchange=()=>{step.turnHeadDelay=delay.valueAsNumber;invalidate();};
            for (const [key, title, min, max, initial] of [['turnTravel', 'Pivot travel (px)', 0, 2000, 60], ['turnTravelAngle', 'Pivot travel angle (degrees)', -180, 180, 0], ['turnWalkCycles', 'Pivot strides', 1, 8, 1]]) {
                const input = document.createElement('input'); input.type = 'number'; input.min = min; input.max = max; input.step = key === 'turnWalkCycles' ? 1 : key === 'turnTravelAngle' ? 5 : 10;
                input.value = step[key] ?? initial; input.dataset.walkingTurn = ''; input.disabled = !step.smoothBodyTurn || posture.value !== 'walking';
                if (key === 'turnTravelAngle') input.title = 'Clockwise offset from the default pivot path. Facing and limb motion stay unchanged.';
                const field = document.createElement('label'); field.append(document.createTextNode(title), input); fields.append(field);
                input.onchange = () => { step[key] = input.valueAsNumber; invalidate(); };
            }
            const update = () => {
                coordination.disabled=!step.smoothBodyTurn;
                delay.disabled=!step.smoothBodyTurn||coordination.value!=='head-first';
                direction.disabled = lead.disabled = !step.smoothBodyTurn;
                shoulders.disabled = !step.smoothBodyTurn;
                if(coordination.value!=='legacy'){lead.disabled=true;shoulders.disabled=true;}
                mode.disabled = seconds.disabled = !step.smoothBodyTurn || posture.value === 'walking';
                posture.querySelector('option[value="walking"]').disabled = !step.smoothBodyTurn;
                if (!step.smoothBodyTurn && posture.value === 'walking') { posture.value = 'current'; step.turnPosture = 'current'; }
                fields.querySelectorAll('[data-walking-turn]').forEach(input => input.disabled = !step.smoothBodyTurn || posture.value !== 'walking');
            };
            fields._updateBodyTurnControls = update;
            fields.addEventListener('change', update); update();
        },

        _remapBodyTurnPose(pose, from, to) {
            const physical = (name, view) => view.startsWith('side:') ? name.replace(/^(front|back)-/, (_, near) => ((near === 'front') === (view === 'side:right') ? 'right' : 'left') + '-') : name;
            const projected = name => to.startsWith('side:') ? name.replace(/^(left|right)-/, (_, side) => (side === to.split(':')[1] ? 'front' : 'back') + '-') : name;
            const result = clone(pose);
            for (const key of ['jointAngles', 'jointTilts', 'partAngles', 'partTilts']) {
                result[key] = Object.fromEntries(Object.entries(pose[key] || {}).map(([name, value]) => [projected(physical(name, from)), clone(value)]));
            }
            result.grounding = false;
            return result;
        },

        _bodyTurnHipAnchor(rig) {
            const points = Object.entries(this._getArmatureJointMap(rig)).filter(([name]) => /-hip$/.test(name))
                .map(([, entry]) => entry.obj.getJointWorldPosition(entry.jt));
            return points.length ? { x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
                y: points.reduce((sum, p) => sum + p.y, 0) / points.length } : { x: rig.root.x, y: rig.root.y };
        },

        async _sampleWalkingBodyTurn(rig, step, capture) {
            const sourceView = this._getUniversalCharacterCurrentViewSwitchKey(rig);
            const targets = this._smoothBodyTurnRoute(sourceView, step.target, step.turnDirection);
            const entryState = capture(rig);
            const referenceHeight = this._capturedViewReferenceHeight(rig), anchor = this._crossViewAnchor(rig);
            const startPose = this._snapshotArmaturePose(rig);
            const attachments = this._captureCrossViewAttachments(rig);
            const heldParents = new Set(attachments.map(item => item.parentId));
            const attachmentIds = new Set(attachments.map(item => item.id));
            const ring = ['front', 'front-3q:right', 'side:right', 'back-3q:right', 'back', 'back-3q:left', 'side:left', 'front-3q:left'];
            const startAngle = ring.indexOf(sourceView) * Math.PI / 4;
            const sign = targets[0] === sourceView ? 0 : (ring.indexOf(targets[0]) - ring.indexOf(sourceView) + 8) % 8 === 1 ? 1 : -1;
            const angle = sign * targets.length * Math.PI / 4, distance = step.turnTravel ?? 60;
            const travelAngle = (step.turnTravelAngle || 0) * Math.PI / 180;
            const path = progress => {
                const t = progress * progress * (3 - 2 * progress);
                const dx = angle ? distance * (Math.cos(startAngle) - Math.cos(startAngle + angle * t)) / angle : distance * Math.sin(startAngle) * t;
                const dy = angle ? distance * (Math.sin(startAngle + angle * t) - Math.sin(startAngle)) / angle : distance * Math.cos(startAngle) * t;
                return { x: anchor.x + dx * Math.cos(travelAngle) - dy * Math.sin(travelAngle),
                    y: anchor.y + dx * Math.sin(travelAngle) + dy * Math.cos(travelAngle) };
            };
            const sample = (viewRig, phases) => {
                this._resetArmatureToActiveCatalogIdle(viewRig);
                const idle = capture(viewRig), catalog = this._getActiveArmatureMovementCatalog(viewRig);
                const key = ['walk-natural-cycle', 'front-walk-cycle', 'walk-cycle', 'back-walk-cycle', 'walk-away'].find(key => catalog[key]);
                if (!key) throw Error('This view has no compatible walking pivot cycle.');
                const session = this._prepareArmatureDebuggerSession(viewRig, key, { prepared: true, movementEntry: catalog[key] });
                if (!session) throw Error('Could not prepare the walking pivot.');
                const view = this._getUniversalCharacterCurrentViewSwitchKey(viewRig), grip = this._remapBodyTurnPose(startPose, sourceView, view);
                const jointMap = this._getArmatureJointMap(viewRig);
                const gripPose = { grounding: false, jointAngles: {}, jointTilts: {} };
                for (const [name, entry] of Object.entries(jointMap)) if (heldParents.has(entry.obj.id) && /arm/.test(entry.obj._armaturePartKey || '')) {
                    gripPose.jointAngles[name] = grip.jointAngles[name] || 0;
                    gripPose.jointTilts[name] = grip.jointTilts[name] || { x: 0, y: 0 };
                }
                return phases.map(t => {
                    const cycle = t * (step.turnWalkCycles || 1), phase = t === 1 ? 1 : cycle % 1;
                    const result = this._applyArmatureDebuggerResolvedState(session, this._resolveArmatureDebuggerPlaybackState(session, phase));
                    if (!result?.ok) throw Error('Could not sample the walking pivot.');
                    const walking = capture(viewRig), ramp = Math.max(0, Math.min(1, t / .12, (1 - t) / .12));
                    const weight = ramp * ramp * (3 - 2 * ramp);
                    const resting = t < .12 && view === sourceView ? entryState : idle;
                    const eased = new Map([...walking].map(([id, value]) => [id, ArmatureViewState.interpolate(resting.get(id) || idle.get(id) || value, value, weight)]));
                    this._crossViewRestore(eased);
                    for (const id of eased.keys()) { const obj = this.objects.getObjectById(id); if (obj) obj._crossViewBlend = null; }
                    this.objects._resolvePins();
                    if (Object.keys(gripPose.jointAngles).length) {
                        const layer = this._armatureLayerMode;
                        try { this._armatureLayerMode = true; this._applyArmaturePose(viewRig, gripPose); }
                        finally { this._armatureLayerMode = layer; }
                    }
                    const foot = this._crossViewAnchor(viewRig), position = path(t);
                    this._setArmatureRootPosition(viewRig, viewRig.root.x + position.x - foot.x, viewRig.root.y + position.y - foot.y);
                    this.objects._resolvePins();
                    return capture(viewRig);
                });
            };
            const segments = [];
            for (const [index, target] of targets.entries()) {
                const count = Math.min(96, Math.max(8, Math.ceil(step.duration * 24 / targets.length), Math.ceil((step.turnWalkCycles || 1) * 24 / targets.length)));
                const phases = Array.from({ length: count + 1 }, (_, n) => (index + n / count) / targets.length);
                const before = sample(rig, phases);
                if (target !== this._getUniversalCharacterCurrentViewSwitchKey(rig)) {
                    rig = await this._switchArmatureCrossView(rig, target, new Set(), { referenceHeight, threeQuarterArtwork: 'experimental-drawn' });
                }
                const after = sample(rig, phases);
                const frames = phases.map((phase, n) => {
                    const progress = n / count, result = new Map();
                    for (const id of new Set([...before[n].keys(), ...after[n].keys()])) {
                        const hidden = value => { const state = JSON.parse(value); state.props.visible = false; return JSON.stringify(state); };
                        const to = after[n].get(id) || hidden(before[n].get(id)), from = before[n].get(id) || hidden(to);
                        const a = JSON.parse(from), b = JSON.parse(to), part = a.props._armaturePartKey || a.props._svgCharacterPartKey;
                        a.motionSegment = true;
                        a.smoothHeadLead = !!step.turnHeadLead && ['head-neck', 'headNeck', 'head'].includes(part);
                        a.smoothShoulderLead = !!step.turnShoulderLead && /torso|arm/.test(part || '');
                        const value = JSON.parse(ArmatureViewState.interpolate(JSON.stringify(a), to, Math.max(.000001, Math.min(.999999, progress))));
                        if (!n) value.props = a.props;
                        if (n === count) value.props = b.props;
                        if (!n || n === count) value.blend.weight = progress;
                        value.sampledTurn = true; value.motionSegment = true;
                        value.followTurnPin = attachmentIds.has(id);
                        if (value.followTurnPin) value.blend = null;
                        result.set(id, JSON.stringify(value));
                    }
                    return { t: progress, state: result };
                });
                segments.push({ frames, duration: step.duration * 1000 / targets.length });
            }
            this._captureArmatureStageBasePosition(rig);
            return { rig, segments };
        },

        _independentSvgHeadTurnHead(rig) {
            const head = this.animations._getSvgAfricanPremiumHeadObject(rig.root);
            return head && this._getArmatureObjects(rig).includes(head) && !head._svgCharacterConfig?._photoCharacter && (!head._svgCharacterConfig?._realisticCharacter || head._svgCharacterConfig._realisticCharacter.modules?.turns) ? head : null;
        },
        _supportsIndependentSvgHeadTurn(rig, view = this._getUniversalCharacterCurrentViewSwitchKey(rig)) {
            const head = this._independentSvgHeadTurnHead(rig);
            if (!head) return false;
            if(head._svgCharacterConfig?._realisticCharacter?.modules?.turns)return Object.keys(head._svgCharacterConfig._realisticCharacter.views).length===8;
            return ['front', 'back'].includes(view) || (/^side:(left|right)$/.test(view) && head._svgCharacterConfig?.styling?.headwear !== 'niqab') || (/^(front|back)-3q:(left|right)$/.test(view)
                && (head._svgCharacterConfig?.styling?.threeQuarterArtwork === 'experimental-drawn'
                    || String(head._svgCharacterPremiumAssetId || head._svgAfricanPremiumAssetId || head._svgCharacterConfig?.assetCharacterId).includes('--experimental-drawn-3q')));
        },
        async _enableIndependentSvgHeadTurn(rig) {
            const head = this._independentSvgHeadTurnHead(rig);
            if (!this._supportsIndependentSvgHeadTurn(rig)) throw Error('Head Turn needs a supported SVG head. Photo heads and covered side faces are not supported.');
            head._svgCharacterConfig = { ...head._svgCharacterConfig, _independentHeadTurn: true, _headTurnConstruction: head._svgCharacterConfig?._headTurnConstruction || (head._svgCharacterConfig?._independentHeadTurn ? 'legacy' : 'matched') };
            if (/^(back-3q|side:)/.test(this._getUniversalCharacterCurrentViewSwitchKey(rig))) head._svgCharacterConfig._headTurnConstruction = 'matched';
            head._svgAfricanLastFaceRenderKey = null;
            this.animations._renderSvgAfricanFaceStateToImage(head);
            await head._svgAfricanFacePendingImagePromise;
            return head;
        },

        _independentHeadTurnTrack(settings, initial = 0, initialGaze = 0, initialGazeY = 0) {
            const duration = number(Number(settings.duration ?? .6), .1, 10, 'Head turn duration');
            const hold = number(Number(settings.hold ?? 1), 0, 120, 'Head turn hold');
            const amount = number(Number(settings.amount ?? 1), 0, 1, 'Head turn amount') * (settings.look === 'full' ? 3 : settings.look === 'strong' ? 2 : 1);
            const cycles = number(Number(settings.cycles ?? 1), 1, 20, 'Head turn cycles');
            if (!Number.isInteger(cycles)) throw Error('Head turn cycles must be a whole number.');
            const cycleWait = number(Number(settings.cycleWait ?? 0), 0, 120, 'Wait between cycles');
            if (!['left', 'right', 'front', 'viewer', 'profile', 'rear', 'left-to-right', 'right-to-left'].includes(settings.direction)) throw Error('Choose a head turn direction.');
            const sweep = settings.direction === 'left-to-right' || settings.direction === 'right-to-left';
            const target = settings.direction === 'front' ? 0 : amount * (['left', 'rear', 'right-to-left'].includes(settings.direction) ? -1 : 1);
            const approach = sweep && Math.abs(initial + target) > .0001 ? duration : 0;
            const prop = 'svgAfricanFace_frontHeadYaw';
            const gazeTarget = settings.gazeTarget || 'follow';
            const gazeTargets = { viewer: [0, 0], left: [-3, 0], right: [3, 0], up: [0, -3], down: [0, 3] };
            if (settings.eyes && !['follow', 'custom', ...Object.keys(gazeTargets)].includes(gazeTarget)) throw Error('Choose a gaze target.');
            const customGaze = settings.eyes && gazeTarget === 'custom'
                ? [number(Number(settings.gazeX ?? 0), -4, 4, 'Horizontal gaze'), number(Number(settings.gazeY ?? 0), -4, 4, 'Vertical gaze')] : null;
            const gazeFor = yaw => customGaze || gazeTargets[gazeTarget] || [settings.direction === 'viewer' ? 0 : yaw * 2, initialGazeY];
            let total = 0;
            const frames = [[0, initial, initialGaze, initialGazeY]];
            const append = (seconds, yaw, gaze = gazeFor(yaw)) => {
                total += seconds; frames.push([total, yaw, ...gaze]);
            };
            if (approach) append(duration, -target);
            for (let cycle = 0; cycle < cycles; cycle++) {
                append(duration, target);
                if (hold) append(hold, target);
                if (cycle < cycles - 1) {
                    const restart = sweep ? -target : initial;
                    const gaze = sweep ? gazeFor(restart) : [initialGaze, initialGazeY];
                    append(duration, restart, gaze);
                    if (cycleWait) append(cycleWait, restart, gaze);
                } else if (settings.return !== false) append(duration, initial, [initialGaze, initialGazeY]);
            }
            const track = { id: Utils.generateId('anim'), name: 'SVG Head Turn (experimental)', type: 'continuous', trigger: 'onLoad', repeat: '1', delay: 0, afterPlayback: 'keep', params: { duration: total, afterPlayback: 'keep' },
                generated: { type: 'continuous', duration: total * 1000, properties: [prop], segmentEasing: 'easeInOutQuad', keyframes: frames.map(([t, value]) => ({ t: t / total, values: { [prop]: value } })) } };
            if (settings.eyes) {
                track.generated.properties.push('svgAfricanFace_gazeX');
                track.generated.keyframes.forEach((frame, index) => { frame.values.svgAfricanFace_gazeX = frames[index][2]; });
                if (gazeTarget !== 'follow') {
                    track.generated.properties.push('svgAfricanFace_gazeY');
                    track.generated.keyframes.forEach((frame, index) => { frame.values.svgAfricanFace_gazeY = frames[index][3]; });
                }
            }
            track.headTurnRecipe = { settings: clone(settings), initial, initialGaze, initialGazeY };
            return track;
        },

        _headTurnShoulderTracks(rig, headTrack, baselines = {}) {
            if (!headTrack.headTurnRecipe.settings.shoulders) return [];
            if (!['front','back'].includes(this._getUniversalCharacterCurrentViewSwitchKey(rig))) throw Error('Shoulder follow requires a front/back body.');
            const map = this._getArmatureJointMap(rig), result = [];
            for (const [key, sign] of [['right-shoulder',-1],['left-shoulder',1]]) {
                const entry = map[key];
                if (!entry?.obj || !entry.jt) throw Error('Shoulder joint unavailable for this character.');
                const index = entry.obj.joints.indexOf(entry.jt), property = `jointAngle_${index}`;
                const initial = baselines[entry.obj.id] ?? (Number(entry.jt.angle) || 0);
                const initialYaw = headTrack.generated.keyframes[0].values.svgAfricanFace_frontHeadYaw;
                const track = { ...clone(headTrack), id: Utils.generateId('anim'), name: 'Head turn: shoulder follow' };
                delete track.headTurnRecipe;
                track.generated.properties = [property];
                track.generated.keyframes = headTrack.generated.keyframes.map(frame => ({t:frame.t, values:{[property]:this._clampInternalJointAngle(entry.jt, initial + sign * (frame.values.svgAfricanFace_frontHeadYaw-initialYaw) * 1.5)}}));
                result.push({obj:entry.obj, track, property, initial});
            }
            headTrack.headTurnRecipe.shoulderBaselines = Object.fromEntries(result.map(entry=>[entry.obj.id,entry.initial]));
            return result;
        },

        _saveIndependentHeadTurn(rig, head, track, previous = null) {
            const companions = this._headTurnShoulderTracks(rig, track, previous?.headTurnRecipe?.shoulderBaselines);
            const entries = [{obj:head,track}, ...companions];
            const oldGroup = previous?._armatureActionId;
            for (const entry of entries) {
                if ((entry.obj.animations||[]).some(other => other !== previous && !(oldGroup && other._armatureActionId===oldGroup)
                    && other.generated?.properties?.some(prop=>entry.track.generated.properties.includes(prop))
                    && (Number(other.delay)||0)<track.delay+track.generated.duration
                    && (Number(other.delay)||0)+this._armatureTrackDuration(other)>track.delay)) throw Error('An overlapping animation controls the head or shoulders. Move the playhead or disable shoulder follow.');
            }
            if (oldGroup) this.objects.objects.forEach(obj=>{obj.animations=(obj.animations||[]).filter(other=>other===previous||other._armatureActionId!==oldGroup);});
            const group = oldGroup || Utils.generateId('head-turn');
            for (const entry of entries) {
                Object.assign(entry.track, {_armatureActionId:group, _armatureActionName:'Head turn', _headTurnStandalone:true,
                    _armatureActionRecipe:{version:1,headTurnId:track.id,headId:head.id,spec:{kind:'head-turn',rootId:rig.root.id}}});
                if (entry.obj===head && previous) Object.assign(previous,entry.track);
                else entry.obj.animations.push(entry.track);
            }
        },

        _mountSequenceHeadTurnFields(host, step, { rig, view, invalidate, render }) {
            const supported = step.kind !== 'turn' && this._supportsIndependentSvgHeadTurn(rig, view);
            if (!supported && !step.headTurn) return;
            const label = document.createElement('label'), toggle = document.createElement('input');
            toggle.type = 'checkbox'; toggle.checked = !!step.headTurn; toggle.dataset.sequenceHeadTurn = 'enabled';
            if (step.kind === 'head-turn') { toggle.checked = true; toggle.disabled = true; }
            toggle.title = 'Animate the head without changing the body view.';
            label.append(toggle, document.createTextNode(step.kind === 'head-turn' ? 'Head Turn (body pose held)' : 'Head-only turn (experimental)')); host.append(label);
            // Keep incompatible saved overlays removable after a body-view or action change.
            toggle.onchange = () => {
                invalidate();
                step.headTurn = toggle.checked && supported ? { direction: view.startsWith('front-3q') || view.startsWith('side:') ? 'viewer' : view.startsWith('back-3q') ? 'profile' : 'right', amount: 1, duration: .5, hold: .5, return: true, eyes: false } : null;
                render();
            };
            if (!supported) { toggle.title = 'Remove this head turn before using this body view or body-turn action.'; return; }
            if (step.headTurn) {
                const fields = document.createElement('div'); host.append(fields);
                this._mountHeadTurnFields(fields, step.headTurn, view);
                fields.addEventListener('change', invalidate);
            }
        },

        _mountHeadTurnFields(host, settings, view = 'front', standalone = false) {
            const fields = document.createElement('div'); fields.className = 'sequence-fields'; host.append(fields);
            settings.cycles ??= 1; settings.cycleWait ??= 0;
            if (['front', 'back'].includes(view) || view.startsWith('side:')) {
                const label = document.createElement('label'), select = document.createElement('select');
                label.append(document.createTextNode('Look'), select); select.dataset.headTurn = 'look';
                select.append(new Option('Subtle turn', 'subtle'));
                if(!view.startsWith('side:'))select.append(new Option(view === 'back' ? 'Over the shoulder' : 'Strong side look', 'strong'));
                if(view==='front'||view.startsWith('side:'))select.append(new Option(view==='front'?'Full side profile':'Full front-facing head','full'));
                select.value = settings.look || 'subtle'; select.onchange = () => { settings.look = select.value; }; fields.append(label);
                if (standalone && !view.startsWith('side:')) {
                    const shoulderLabel=document.createElement('label'), input=document.createElement('input');input.type='checkbox';input.dataset.headTurn='shoulders';input.checked=!!settings.shoulders;
                    shoulderLabel.append(document.createTextNode('Subtle shoulder follow'),input);input.onchange=()=>{settings.shoulders=input.checked;};fields.append(shoulderLabel);
                }
            }
            for (const [key, title, type] of [['direction', 'Direction', 'select'], ['amount', 'Turn amount', 'number'], ['duration', 'Turn duration (s)', 'number'], ['hold', 'Hold at target (s)', 'number'], ['cycles', 'Cycles', 'number'], ['cycleWait', 'Wait between cycles (s)', 'number'], ['return', 'Return after final cycle', 'checkbox'], ['eyes', 'Eyes follow turn', 'checkbox']]) {
                if (view === 'back' && key === 'eyes') continue;
                const input = document.createElement(type === 'select' ? 'select' : 'input'); input.dataset.headTurn = key;
                if (type === 'select') (view.startsWith('front-3q') || view.startsWith('side:') ? ['viewer', 'front'] : view.startsWith('back-3q') ? ['profile', 'rear', 'front'] : ['left', 'right', 'left-to-right', 'right-to-left', 'front']).forEach(value => input.append(new Option(value === 'profile' ? 'Reveal side face' : value === 'rear' ? 'Look away (back)' : value === 'left-to-right' ? 'Left to right' : value === 'right-to-left' ? 'Right to left' : value === 'viewer' ? (view.startsWith('side:') ? 'Turn toward viewer (3/4)' : 'Face viewer') : value === 'front' ? (view.startsWith('side:') ? 'Return to profile' : view.includes('-3q') ? 'Return to 3/4' : `Return to ${view}`) : value, value)));
                else input.type = type;
                if (type === 'number') { input.min = key === 'cycles' ? '1' : key === 'duration' ? '.1' : '0'; input.max = key === 'cycles' ? '20' : key === 'amount' ? '1' : ['hold', 'cycleWait'].includes(key) ? '120' : '10'; input.step = key === 'cycles' ? '1' : '.1'; }
                input.value = settings[key]; input.checked = !!settings[key];
                input.onchange = () => { settings[key] = type === 'checkbox' ? input.checked : type === 'number' ? input.valueAsNumber : input.value; };
                const label = document.createElement('label'); label.append(document.createTextNode(key === 'eyes' ? 'Animate eyes' : title), input); fields.append(label);
            }
            if (view !== 'back') {
                const target = document.createElement('select'); target.dataset.headTurn = 'gazeTarget';
                for (const [value, text] of [['follow', 'Follow head'], ['viewer', 'Viewer'], ['left', 'Left'], ['right', 'Right'], ['up', 'Up'], ['down', 'Down'], ['custom', 'Custom offset']]) target.append(new Option(text, value));
                target.value = settings.gazeTarget || 'follow';
                const label = document.createElement('label'); label.append('Gaze target', target); fields.append(label);
                target.onchange = () => { settings.gazeTarget = target.value; };
                for (const [key, title] of [['gazeX', 'Horizontal gaze'], ['gazeY', 'Vertical gaze']]) {
                    const input = document.createElement('input'); input.type = 'number'; input.min = -4; input.max = 4; input.step = .25;
                    input.dataset.headTurn = key; input.value = settings[key] ?? 0;
                    input.onchange = () => { settings[key] = input.valueAsNumber; };
                    const field = document.createElement('label'); field.append(title, input); fields.append(field);
                }
                const updateGaze = () => {
                    target.disabled = !settings.eyes;
                    for (const key of ['gazeX', 'gazeY']) fields.querySelector(`[data-head-turn="${key}"]`).disabled = !settings.eyes || target.value !== 'custom';
                };
                fields.addEventListener('change', updateGaze); updateGaze();
            }
        },

        async _openIndependentSvgHeadTurn(rig) {
            try {
                if (this.animations.isPlaying || this.animations._exportingVideo) throw Error('Stop playback first.');
                if (document.querySelector('[data-resize-animation][aria-busy="true"]')) throw Error('Wait for resize preparation to finish.');
                document.querySelector('[data-resize-animation] [data-close]')?.click();
                this._stopArmatureClipPreview();
                document.querySelector('[data-independent-head-panel]')?.querySelector('[data-close]')?.click();
                const head = await this._enableIndependentSvgHeadTurn(rig);
                const panel = document.createElement('section'); panel.className = 'character-sequence-editor'; panel.dataset.independentHeadPanel = '';
                panel.innerHTML = '<header><strong>Head Turn (experimental)</strong><button data-close title="Close" aria-label="Close"><i class="fas fa-times"></i></button></header><div class="sequence-content"></div>';
                const body = panel.querySelector('.sequence-content'), settings = { direction: 'right', amount: 1, duration: .6, hold: 1, return: true, eyes: false };
                {
                    const construction = document.createElement('select'); construction.setAttribute('aria-label', 'Head artwork construction');
                    construction.append(new Option('Matched-angle artwork (experimental)', 'matched'), new Option('Original artwork switch', 'legacy'));
                    if(['front','side:left','side:right'].includes(this._getUniversalCharacterCurrentViewSwitchKey(rig)))construction.append(new Option('Full-range matched artwork (experimental)','full'));
                    if (/^(back-3q|side:)/.test(this._getUniversalCharacterCurrentViewSwitchKey(rig))) {
                        construction.querySelector('[value="legacy"]').remove();
                        if (this._getUniversalCharacterCurrentViewSwitchKey(rig).startsWith('side:')) construction.options[0].text = 'Native profile turn (experimental)';
                    }
                    construction.value = head._svgCharacterConfig._headTurnFullRange && construction.querySelector('[value="full"]') ? 'full' : head._svgCharacterConfig.styling?.headArtwork === 'matched' ? 'matched' : head._svgCharacterConfig._headTurnConstruction;
                    construction.onchange = () => { stop(); head._svgCharacterConfig._headTurnFullRange=construction.value==='full';head._svgCharacterConfig._headTurnConstruction = construction.value==='legacy'?'legacy':'matched'; head._svgCharacterConfig.styling = { ...head._svgCharacterConfig.styling, headArtwork: construction.value !== 'legacy' ? 'matched' : 'original' }; head._svgAfricanLastFaceRenderKey = null; this.animations._renderSvgAfricanFaceStateToImage(head); this.stage.requestRender(); eventBus.emit('history:push'); };
                    body.append(construction);
                }
                if (/^(front-3q|side:)/.test(this._getUniversalCharacterCurrentViewSwitchKey(rig))) settings.direction = 'viewer';
                if (this._getUniversalCharacterCurrentViewSwitchKey(rig).startsWith('back-3q')) settings.direction = 'profile';
                this._mountHeadTurnFields(body, settings, this._getUniversalCharacterCurrentViewSwitchKey(rig), true);
                const status = document.createElement('p'); status.setAttribute('role', 'status'); let frame = 0, previewState = null, previewShoulders = [];
                const stop = () => { cancelAnimationFrame(frame); frame = 0; for (const entry of previewShoulders) this.animations._setAnimatedPropertyValue(entry.obj, entry.property, entry.initial); previewShoulders = []; this.objects._resolvePins(); if (previewState) { const face = this.animations._getSvgAfricanFaceState(head); for (const [key, value] of Object.entries(previewState)) face[key] = value; previewState = null; this.animations._renderSvgAfricanFaceStateToImage(head); this.stage.requestRender(); } };
                const clips = document.createElement('select'); clips.setAttribute('aria-label', 'Existing head-turn clip');
                const refreshClips = () => { clips.replaceChildren(new Option('New head turn', '')); head.animations.filter(track => track.headTurnRecipe && (!track._armatureActionId || track._headTurnStandalone)).forEach(track => clips.append(new Option(`${track.name} at ${(Number(track.delay || 0)/1000).toFixed(2)}s`, track.id))); };
                refreshClips(); body.prepend(clips);
                clips.onchange = () => { stop(); const track = head.animations.find(track => track.id === clips.value); if (!track?.headTurnRecipe) return; Object.assign(settings, { cycles: 1, cycleWait: 0, look: 'subtle', shoulders: false, gazeTarget: 'follow', gazeX: 0, gazeY: 0 }, clone(track.headTurnRecipe.settings)); for (const input of body.querySelectorAll('[data-head-turn]')) { input.value = settings[input.dataset.headTurn]; input.checked = !!settings[input.dataset.headTurn]; } body.querySelector('[data-head-turn="gazeTarget"]')?.dispatchEvent(new Event('change', { bubbles: true })); };
                for (const [title, icon, run] of [
                    ['Preview', 'play', () => { stop(); const current = this.animations._getSvgAfricanFaceState(head); previewState = { frontHeadYaw: current.frontHeadYaw }; if (settings.eyes) { previewState.gazeX = current.gazeX; previewState.gazeY = current.gazeY; } const track = this._independentHeadTurnTrack(settings, current.frontHeadYaw || 0, current.gazeX || 0, current.gazeY || 0), start = performance.now(); previewShoulders = this._headTurnShoulderTracks(rig, track);
                        const tick = now => { if (this.animations.isPlaying || this.animations._exportingVideo) { stop(); return; } const t = Math.min(1, (now-start)/track.generated.duration), k=track.generated.keyframes; let i=0; while(i<k.length-2&&k[i+1].t<t)i++; const a=k[i],b=k[i+1],p=Math.max(0,Math.min(1,(t-a.t)/(b.t-a.t||1))),ease=p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2;
                            for(const key of track.generated.properties)this.animations._setAnimatedPropertyValue(head,key,a.values[key]+(b.values[key]-a.values[key])*ease);
                            for (const entry of previewShoulders) { const frames = entry.track.generated.keyframes; this.animations._setAnimatedPropertyValue(entry.obj, entry.property, frames[i].values[entry.property] + (frames[i+1].values[entry.property]-frames[i].values[entry.property])*ease); }
                            this.objects._resolvePins();
                            this.animations._renderSvgAfricanFaceStateToImage(head);this.stage.requestRender();if(t<1)frame=requestAnimationFrame(tick);else stop(); };frame=requestAnimationFrame(tick); }],
                    ['Stop', 'stop', stop],
                    ['Update selected clip', 'save', () => { stop(); const old = head.animations.find(track => track.id === clips.value); if (!old?.headTurnRecipe) throw Error('Select a head-turn clip first.'); const recipe = old.headTurnRecipe; const track = this._independentHeadTurnTrack(settings, recipe.initial, recipe.initialGaze, recipe.initialGazeY || 0); track.id = old.id; track.delay = old.delay; this._saveIndependentHeadTurn(rig, head, track, old); eventBus.emit('timeline:update'); eventBus.emit('history:push'); refreshClips(); clips.value = old.id; status.textContent = 'Head-turn clip updated.'; }],
                    ['Add to Timeline', 'plus', () => { stop(); const current = this.animations._getSvgAfricanFaceState(head); const track = this._independentHeadTurnTrack(settings, current.frontHeadYaw || 0, current.gazeX || 0, current.gazeY || 0); track.delay = Math.max(0, this.animations.currentTime || 0); this._saveIndependentHeadTurn(rig, head, track); eventBus.emit('timeline:update'); eventBus.emit('history:push'); status.textContent = 'Head turn added at the timeline playhead.'; }]
                ]) {
                    const button = document.createElement('button'); button.innerHTML = `<i class="fas fa-${icon}"></i> ${title}`;
                    button.onclick = () => {
                        try {
                            if (title !== 'Stop') {
                                if (this.animations.isPlaying || this.animations._exportingVideo) throw Error('Stop playback first.');
                                if (this.objects.getObjectById(head.id) !== head || !this._supportsIndependentSvgHeadTurn(rig)) throw Error('Character or view changed. Reopen Head Turn.');
                                if (!['front','back'].includes(this._getUniversalCharacterCurrentViewSwitchKey(rig)) && (/-to-/.test(settings.direction) || settings.look === 'strong')) throw Error('Strong looks and sweeps require a front/back body.');
                                if (this._getUniversalCharacterCurrentViewSwitchKey(rig).startsWith('side:') && !['viewer','front'].includes(settings.direction)) throw Error('Side heads support Turn toward viewer or Return to profile.');
                                if(settings.look==='full'&&!['front','side:left','side:right'].includes(this._getUniversalCharacterCurrentViewSwitchKey(rig)))throw Error('Full-range turns require a front or side body view.');
                                this._independentHeadTurnTrack(settings);
                                if (settings.look === 'strong' || settings.look === 'full') {
                                    if(settings.look==='full')head._svgCharacterConfig._headTurnFullRange=true;
                                    head._svgCharacterConfig._headTurnConstruction = 'matched'; head._svgAfricanLastFaceRenderKey = null;
                                    body.querySelector('[aria-label="Head artwork construction"]').value = head._svgCharacterConfig._headTurnFullRange?'full':'matched';
                                    this.animations._renderSvgAfricanFaceStateToImage(head);
                                }
                            }
                            run(); const selected = clips.value; refreshClips(); clips.value = selected;
                        } catch(error) { stop(); status.textContent = error.message; }
                    };
                    body.append(button);
                }
                body.append(status); document.body.append(panel); const dispose=Utils._bindFloatingPanelDrag(panel,panel.querySelector('header'));
                panel.querySelector('[data-close]').onclick=()=>{stop();dispose?.();panel.remove();};
            } catch(error) { Utils.showToast(error.message, 'warning'); }
        },

        _validateCharacterSequence(recipe, expanded = false) {
            if (recipe?.version !== 1 || !Array.isArray(recipe.steps) || !recipe.steps.length || recipe.steps.length > (expanded?240:40)) throw Error('Sequence exceeds its step limit. Use fewer steps or destinations.');
            if (!views.includes(recipe.view)) throw Error('Invalid starting view.');
            number(recipe.x, -100000, 100000, 'Starting X'); number(recipe.y, -100000, 100000, 'Starting Y');
            const ids = new Set();
            for (const [index, step] of recipe.steps.entries()) {
                if (typeof step.id !== 'string' || !step.id || ids.has(step.id)) throw Error('Every sequence step needs a unique ID.');
                ids.add(step.id);
                if (!['pose', 'movement', 'wait', 'turn', 'resize','travel-route','head-turn','handoff'].includes(step.kind)) throw Error(`Invalid step ${index + 1}.`);
                if (step.kind === 'head-turn') {
                    if (!step.headTurn) throw Error('Configure the Head Turn action.');
                    step.duration = this._independentHeadTurnTrack(step.headTurn).generated.duration / 1000;
                    step.transition = 0; step.cycles = 1;
                    if (step.kit) throw Error('Place activity-kit actions in a separate step from Head Turn.');
                }
                if(step.kind==='travel-route'){
                    this._validateTravelRoute(step);
                    for(const point of step.route.points){if(ids.has(point.id))throw Error('Waypoint IDs must be unique across the sequence.');ids.add(point.id);}
                }
                if(step.kind==='handoff'&&(step.cycles!==1||step.kit))throw Error('Use one exchange per handoff step, without an activity kit.');
                if (step.kind === 'resize') {
                    number(step.size ?? 100, 10, 300, 'Character size (%)');
                    if (!['feet', 'center'].includes(step.anchor || 'feet')) throw Error('Choose a resize anchor.');
                    if (!['smooth', 'linear'].includes(step.easing || 'smooth')) throw Error('Choose a resize easing.');
                }
                number(step.duration, .05, ['travel-route','head-turn'].includes(step.kind)?3000:120, 'Duration'); number(step.wait, 0, 120, 'Wait');
                number(step.transition, 0, 5, 'Transition'); number(step.cycles, 1, 20, 'Cycles');
                if (!Number.isInteger(step.cycles)) throw Error('Cycles must be a whole number.');
                if (step.distance !== null) number(step.distance, -10000, 10000, 'Distance');
                if (step.travelAngle != null) number(step.travelAngle, -180, 180, 'Travel angle');
                if(step.travelTarget){number(step.travelTarget.x,-100000,100000,'Destination X');number(step.travelTarget.y,-100000,100000,'Destination Y');}
                if(step._routeStart){number(step._routeStart.x,-100000,100000,'Route start X');number(step._routeStart.y,-100000,100000,'Route start Y');}
                if (step.kind === 'turn' && !turnViews.includes(step.target)) throw Error('Choose a supported target view.');
                if (step.turnDirection && !['shortest', 'left', 'right'].includes(step.turnDirection)) throw Error('Choose a valid body-turn route.');
                if (step.turnPosture && !['idle', 'current', 'seated', 'walking'].includes(step.turnPosture)) throw Error('Choose a valid body-turn posture.');
                if (step.turnTiming != null && !['quick', 'gradual'].includes(step.turnTiming)) throw Error('Choose Quick pivot or Gradual turn.');
                if (step.turnSeconds != null) number(step.turnSeconds, .15, 10, 'Body turn duration');
                if(step.turnCoordination&&!['legacy','together','head-first','follow-head'].includes(step.turnCoordination))throw Error('Choose a valid head/body coordination mode.');
                if(step.turnHeadDelay!=null)number(step.turnHeadDelay,.1,3,'Head lead time');
                if (step.turnTravel != null) number(step.turnTravel, 0, 2000, 'Pivot travel');
                if (step.turnTravelAngle != null) number(step.turnTravelAngle, -180, 180, 'Pivot travel angle');
                if (step.turnWalkCycles != null) { number(step.turnWalkCycles, 1, 8, 'Pivot strides'); if (!Number.isInteger(step.turnWalkCycles)) throw Error('Pivot strides must be a whole number.'); }
                if (['pose', 'movement'].includes(step.kind) && (typeof step.key !== 'string' || !step.key)) throw Error(`Select an action for step ${index + 1}.`);
            }
            const total = recipe.steps.reduce((sum, s) => sum + s.duration * s.cycles + s.wait + s.transition, 0);
            if (total > 1800) throw Error('Sequences are limited to 30 minutes.');
            return recipe;
        },

        _readCharacterSequenceTemplate(text) {
            if (typeof text !== 'string' || text.length > 20 * 1024 * 1024) throw Error('Sequence templates must be under 20 MB.');
            const data = JSON.parse(text, (key, value) => {
                if (['__proto__', 'constructor', 'prototype'].includes(key)) throw Error('Invalid template property.');
                return value;
            });
            if (data?.format !== 'animstage-character-sequence' || data.version !== 1) throw Error('Choose an Animation Stage sequence template.');
            return clone(this._validateCharacterSequence(data.sequence));
        },

        _characterSequenceReview(clip, start) {
            const recipe = clip.recipe.sequence;
            const rows = clip.schedule.map(entry => {
                const step = recipe.steps[entry.index];
                const ids=new Set(this._sequenceSpeechSteps([step]).map(s=>s.id));
                const spokenEntries=(clip.speech||[]).filter(item=>ids.has(item.stepId));
                const details=[];
                for(const spoken of spokenEntries){
                    const speechStart=spoken.timing==='independent'?spoken.independentStartMs:start+spoken.startMs;
                    details.push(`Speech ${(speechStart/1000).toFixed(2)}-${((speechStart+spoken.durationMs)/1000).toFixed(2)} s`);
                    if(spoken.captions?.enabled)details.push(this._sequenceCaptionUpdateStatus(spoken.audioId,spoken.captions.text,spoken.captions.replaceExisting));
                    else details.push('Captions off');
                }
                if(step.headTurn)details.push(`Head: ${step.headTurn.direction}${step.headTurn.return!==false?' + return':''}`);
                if(step.kind==='turn')details.push(`Body: ${label(step.target)} (${step.turnCoordination||'legacy'})`);
                return { ...entry, name: step.kind==='handoff'?'Hand over prop':step.kind==='head-turn'?'Head Turn':step.kind==='travel-route'?`Multi-Point Travel (${step.route.points.length} destinations)`:step.kind === 'resize' ? `Resize to ${step.size ?? 100}%` : step.key || (step.kind === 'turn' ? `Turn to ${label(step.target)}` : 'Wait'),
                    details,
                    absoluteStart: start + entry.start, absoluteEnd: start + entry.end,
                    speech: spokenEntries[0], kit: !!step.kit };
            });
            const warnings = (clip.validation?.warnings || []).map(item => item.message);
            for(const row of rows)for(const detail of row.details)if(detail.includes('review required'))warnings.push(`Step ${row.index+1}: ${detail}.`);
            const speech = (clip.speech || []).map(item => ({ ...item, begin: item.timing === 'independent' ? item.independentStartMs : start + item.startMs }));
            for (let i = 0; i < speech.length; i++) for (let j = i + 1; j < speech.length; j++) {
                if (Math.max(speech[i].begin, speech[j].begin) < Math.min(speech[i].begin + speech[i].durationMs, speech[j].begin + speech[j].durationMs)) {
                    const owner=id=>recipe.steps.findIndex(step=>this._sequenceSpeechSteps([step]).some(s=>s.id===id))+1;
                    warnings.push(`Speech overlaps between steps ${owner(speech[i].stepId)} and ${owner(speech[j].stepId)}.`);
                }
            }
            let kept = false;
            for (const [index, step] of recipe.steps.entries()) {
                if (step.clearProps) kept = false;
                if (kept && step.kit) warnings.push(`Step ${index + 1} adds another kit while earlier props are kept. Check for duplicate props.`);
                if (step.kit) kept = !!step.keepProps;
            }
            return { rows, warnings: [...new Set(warnings)], durationMs: clip.durationMs, endMs: start + clip.durationMs };
        },

        _renderSequenceTimingLanes(host,clip,onSeek,showWarnings=true) {
            const box=document.createElement('div');box.className='choreography-overview';box.setAttribute('aria-label','Detailed action timing');host.append(box);
            const grid=document.createElement('div');grid.className='choreography-overview-grid';box.append(grid);
            const rows=new Map(),duration=Math.max(1,clip.durationMs);
            const actors=clip.recipe.choreography?.actors||[{rootId:clip.rootId,name:'Character'}];
            const actorName=id=>actors.find(a=>a.rootId===id)?.name||this.objects.getObjectById(id)?.name||'Character';
            const row=name=>{if(rows.has(name))return rows.get(name);const title=document.createElement('strong');title.className='choreography-lane-label';title.textContent=name;
                const lane=document.createElement('div');lane.className='choreography-lane';grid.append(title,lane);rows.set(name,lane);return lane;};
            const add=(name,start,end,text,kind,stepId)=>{
                if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)return;
                const button=document.createElement('button');button.type='button';button.className=`choreography-time-block ${kind}`;
                button.style.left=`${100*start/duration}%`;button.style.width=`${Math.max(.05,100*(Math.min(end,duration)-start)/duration)}%`;
                button.textContent=text;button.title=`${text}: ${(start/1000).toFixed(2)}-${(end/1000).toFixed(2)} s`;button.setAttribute('aria-label',`Seek ${button.title}`);
                button.onclick=()=>onSeek(start,stepId);row(name).append(button);
            };
            for(const entry of clip.routeSchedule||clip.schedule){
                const name=actorName(entry.rootId||clip.rootId),end=entry.motionEnd??entry.end,id=entry.sourceStepId||entry.id;
                add(`${name} / Actions`,entry.start,end,entry.name||entry.kind||'Action','action',id);
                add(`${name} / Pauses`,end,entry.end,'Wait / hold','hold',id);
            }
            // Separate overlapping speech blocks instead of concealing one under another.
            const lanes=new Map();
            for(const speech of [...(clip.speech||[])].sort((a,b)=>a.startMs-b.startMs)){
                if(speech.timing==='independent')continue;
                const key=speech.rootId,ends=lanes.get(key)||[];let index=ends.findIndex(end=>end<=speech.startMs);if(index<0)index=ends.length;
                ends[index]=speech.endMs;lanes.set(key,ends);
                add(`${actorName(key)} / Speech${index?` ${index+1}`:''}`,speech.startMs,speech.endMs,speech.text||'Speech','speech',speech.stepId);
            }
            for(const owner of clip.ownership||[])add('Prop ownership',owner.start,owner.end,`${actorName(owner.rootId)} / ${(owner.anatomicalHand||owner.hand).replaceAll('-',' ')}`,'camera',owner.stepId);
            if(showWarnings)for(const warning of clip.validation?.warnings||[]){const p=document.createElement('p');p.className='sequence-review-warning';p.textContent=warning.message;box.append(p);}
        },
        async _characterSequenceExample(rig,key) {
            if(!['walk-explain','stop-speak'].includes(key))throw Error('Choose a sequence example.');
            const recipe=this._newCharacterSequence(rig),anchor=this._crossViewAnchor(rig);
            const choices=this._travelMovementChoices(await this._characterSequenceCatalog(rig,recipe.view),recipe.view);
            if(!choices.length)throw Error('This view has no travelling movement.');
            const side=recipe.view.startsWith('side:'),dx=side?(recipe.view.endsWith('left')?-80:80):0,dy=side?0:recipe.view.startsWith('back')?-50:50;
            const route={...this._newCharacterSequenceStep('travel-route'),route:{points:[1,2].map(i=>({...this._newTravelWaypoint(),x:anchor.x+dx*i,y:anchor.y+dy*i,key:choices[0].key,duration:2}))}};
            const draft=text=>({text,provider:'local',voice:'',language:'en'});
            if(key==='walk-explain'){recipe.name='Walk and explain';route.speechDraft=draft('Come with me. I will explain each part as we walk.');}
            else{recipe.name='Stop and speak';route.route.points.forEach((point,i)=>{point.pause=2;point.speechAt='arrival';point.speechDraft=draft(i?'This is our next stop. Let us take a closer look.':'Let us stop here. This is the first part of our visit.');});}
            recipe.steps=[route];return recipe;
        },
        _newCharacterSequence(rig) {
            return { version: 1, name: 'Character Sequence', view: this._getUniversalCharacterCurrentViewSwitchKey(rig),
                x: rig.root.x, y: rig.root.y, startMode: 'captured', startPose: this._snapshotArmaturePose(rig), steps: [this._newCharacterSequenceStep('wait')] };
        },

        _newCharacterSequenceStep(kind = 'movement') {
            return { id: Utils.generateId('step'), kind, key: '', target: 'front', duration: kind === 'turn' ? .8 : 2,
                wait: 0, transition: .3, cycles: 1, distance: null, kit: false, upperBody: false,
                ...(kind === 'head-turn' ? { headTurn: this._newSequenceHeadTurn('front') } : {}),
                ...(kind === 'turn' ? { turnTiming: 'quick', turnSeconds: .5 } : {}) };
        },
        _duplicateSequenceStep(step) {
            const duplicate=clone(step);duplicate.id=Utils.generateId('step');duplicate.speech=null;
            const ids=new Map();
            for(const point of duplicate.route?.points||[]){const old=point.id;point.id=Utils.generateId('waypoint');ids.set(old,point.id);point.speech=null;}
            if(duplicate.route?.speechRange)for(const key of ['from','to'])if(ids.has(duplicate.route.speechRange[key]))duplicate.route.speechRange[key]=ids.get(duplicate.route.speechRange[key]);
            return duplicate;
        },
        _newSequenceHeadTurn(view) {
            return { direction: /^(front-3q|side:)/.test(view) ? 'viewer' : view.startsWith('back-3q') ? 'profile' : 'right',
                amount: 1, duration: .5, hold: .5, return: true, eyes: false };
        },
        _setSequenceActionKind(step, kind, view) {
            if (step.kind === 'head-turn' && kind !== 'head-turn') delete step.headTurn;
            step.kind = kind; step.key = ''; delete step.travelTarget;
            if(kind==='handoff'){step.kit=false;step.cycles=1;step.duration=Math.max(2,Math.min(8,step.duration));if(step.speech)step.speech.timing='wait';}
            if (kind === 'head-turn') { step.headTurn ||= this._newSequenceHeadTurn(view); step.kit = false; step.transition = 0; step.cycles = 1; }
            if (kind === 'turn' && step.turnTiming == null) { step.turnTiming = 'quick'; step.turnSeconds = .5; }
        },

        _resolveCharacterSequenceDestination(step, entry, rig) {
            if(!step.travelTarget)return;
            if(step.kind!=='movement'||!this._isArmatureWalkStrideMovement(step.key,entry)||entry.turnAround||entry.frontBackTurnAround||entry.flipInPlace)throw Error('A destination requires a one-way walking or running action, not a return trip.');
            const move=this._getDecoratedArmatureMovementEntry(step.key,entry,rig);
            const plan=this._prepareArmatureMovementForControls(step.key,move,rig).travelPlan;
            if(!plan?.enabled||Math.hypot(plan.totalDx,plan.totalDy)<.001)throw Error('Choose a travelling action before picking a destination.');
            const anchor=this._crossViewAnchor(rig),dx=step.travelTarget.x-anchor.x,dy=step.travelTarget.y-anchor.y;
            step.distance=Math.hypot(dx,dy);
            number(step.distance,0,10000,'Destination distance');
            const native=Math.abs(plan.totalDx)>=Math.abs(plan.totalDy)?Math.atan2(0,plan.totalDx):Math.atan2(plan.totalDy,0);
            step.travelAngle=step.distance<.001?0:((Math.atan2(dy,dx)-native)*180/Math.PI+540)%360-180;
            if(Math.abs(step.travelAngle)>60)step._travelFacingWarning='Travel direction differs from the authored gait. The character keeps its facing; add an arrival turn before this leg for forward walking.';
        },

        _configureCharacterSequenceGait(step, entry, rig) {
            if(step.kind!=='movement'||!this._isArmatureWalkStrideMovement(step.key,entry)||entry.flipInPlace||entry.selfContainedTravel)return null;
            const move=this._getDecoratedArmatureMovementEntry(step.key,entry,rig);
            const prepared=this._prepareArmatureMovementForControls(step.key,move,rig);
            const plan=prepared.travelPlan;
            if(!plan?.enabled)return null;
            const axis=Math.abs(plan.totalDx)>=Math.abs(plan.totalDy)?'x':'y';
            const nativeDistance=Math.abs(axis==='x'?plan.totalDx:plan.totalDy);
            if(nativeDistance<.001)return null;
            const desired=step.distance==null?nativeDistance*step.cycles:Math.abs(step.distance);
            if(desired===0)return null;
            if(axis==='x')this._armatureTravelDistancePx=desired;
            else this._armatureTravelDistanceYPx=desired;
            const fitted=this._prepareArmatureMovementForControls(step.key,move,rig).travelPlan;
            // Distance sets stride count before baking. Duration then retimes gait and travel together.
            const count=Math.max(1,fitted?.repeatCount||plan.repeatCount||1);
            const timed=Math.max(1,Math.round(step.duration*1000/Math.max(100,move.duration||1000)))*step.cycles;
            if(!entry.turnAround&&!entry.frontBackTurnAround){
                this._armatureActionCycles=step.distance==null?Math.max(count,timed):count;
            }else this._armatureActionCycles=null;
            return step.distance==null?desired:step.distance;
        },

        _setCharacterSequenceTravelDistance(clip, distance, rig) {
            if (distance == null) return;
            number(distance, -10000, 10000, 'Distance');
            const original = clip.originals.get(rig.root.id);
            const travel = (clip.tracks.get(rig.root.id) || []).filter(track => track.name?.startsWith('Armature Travel:') && track.generated?.keyframes?.length);
            const frames = travel.flatMap(track => track.generated.keyframes);
            const extent = axis => Math.max(0, ...frames.map(frame => Math.abs((frame.values[axis] ?? original?.[axis]) - original?.[axis])));
            const axis = extent('x') >= extent('y') ? 'x' : 'y';
            const span = extent(axis);
            if (!original || !Number.isFinite(span) || span < .001) throw Error('Travel distance needs a travelling movement, not an in-place action.');
            const scale = distance / span;
            clip._sequenceTravelAxis = axis;
            for (const frame of frames) if (Number.isFinite(frame.values[axis])) frame.values[axis] = original[axis] + (frame.values[axis] - original[axis]) * scale;
        },

        _redirectCharacterSequenceTravel(clip, angle, rig) {
            if (angle == null || angle === 0) return;
            const original = clip.originals.get(rig.root.id);
            const tracks = clip.tracks.get(rig.root.id) || [];
            const travel = tracks.filter(track => track.name?.startsWith('Armature Travel:') && track.generated?.keyframes?.length);
            const frames = travel.flatMap(track => track.generated.keyframes);
            const range = key => { const values = frames.map(frame => frame.values[key]).filter(Number.isFinite); return values.length ? Math.max(...values) - Math.min(...values) : 0; };
            const axis = clip._sequenceTravelAxis || (range('x') >= range('y') ? 'x' : 'y');
            if (!original || range(axis) < .001) throw Error('Travel angle needs a travelling walk/run action, not an in-place cycle.');
            const radians = angle * Math.PI / 180, cos = Math.cos(radians), sin = Math.sin(radians);
            // Redirect only the travel axis: preserve the perpendicular gait bob and all joint tracks.
            for (const track of travel) {
                for (const frame of track.generated.keyframes) {
                    const values = frame.values, distance = (values[axis] ?? original[axis]) - original[axis];
                    const x = values.x ?? original.x, y = values.y ?? original.y;
                    values.x = x + (axis === 'x' ? distance * (cos - 1) : -distance * sin);
                    values.y = y + (axis === 'x' ? distance * sin : distance * (cos - 1));
                }
                track.generated.properties = [...new Set([...track.generated.properties, 'x', 'y'])];
            }
        },

        async _characterSequenceCatalog(rig, view) {
            const snapshot = this._armatureActionSnapshot(rig);
            try {
                this._captureArmatureStageBasePosition(rig);
                if (this._getUniversalCharacterCurrentViewSwitchKey(rig) !== view) rig = await this._switchArmatureCrossView(rig, view);
                const list = (catalog, kind) => Object.entries(catalog).filter(([, entry]) => kind === 'pose'
                    ? this._armaturePoseMatchesCurrentView(rig, entry) : this._armatureMovementMatchesCurrentView(rig, entry)).map(([key, entry]) => ({ key, name: entry.name || key,
                    gesture: !!entry.armatureGesture, duration: entry.duration || 2000,
                    routeTravel: kind === 'movement' && this._isArmatureWalkStrideMovement(key,entry)
                        && !/(to.point|and.back|flip|turn|cycle|march|in.place)/i.test(`${key} ${entry.name}`)
                        && (['dx','dy','x','y','distanceX','distanceY'].some(axis => Math.abs(Number(entry.rootTravel?.[axis]) || 0)>.01)
                            || ['dx','dy'].some(axis => Math.abs((entry.keyframes?.at(-1)?.[axis] || 0)-(entry.keyframes?.[0]?.[axis] || 0))>.01)) }));
                return { pose: list(this._getActiveArmaturePoseCatalog(rig), 'pose'), movement: list(this._getActiveArmatureMovementCatalog(rig), 'movement') };
            } finally { this._restoreArmatureActionSnapshot(snapshot, true); }
        },

        async _compileCharacterSequence(rig, input, options = {}) {
            const recipe = this._validateCharacterSequence(clone(input),options._expandedTravel===true);
            if(recipe.steps.some(step=>step.kind==='handoff'))return this._compileHandoffCharacterSequence(rig,recipe,options);
            if(recipe.steps.some(step=>step.kind==='travel-route'))return this._compileTravelRoutes(rig,recipe,options);
            const speech = this._planCharacterSequenceSpeech?.(recipe, rig, options) || [];
            if (this._characterSequenceCompiling || this._armatureRecordingBusy || this.animations.isPlaying || this.animations._exportingVideo || this.objects._isRecording) throw Error('Stop playback or recording first.');
            if (recipe.steps.some(step => step.headTurn)) {
                const head = this._independentSvgHeadTurnHead(rig);
                if (!head) throw Error('Head-turn overlays require an SVG character.');
                // The starting view can be side-facing; eligibility is checked at the overlay step.
                head._svgCharacterConfig = { ...head._svgCharacterConfig, _independentHeadTurn: true, _headTurnConstruction: head._svgCharacterConfig?._headTurnConstruction || (head._svgCharacterConfig?._independentHeadTurn ? 'legacy' : 'matched') };
                if (recipe.steps.some(step => step.headTurn?.look === 'strong')) head._svgCharacterConfig._headTurnConstruction = 'matched';
                if (recipe.steps.some(step => step.headTurn?.look === 'full')) {head._svgCharacterConfig._headTurnConstruction='matched';head._svgCharacterConfig._headTurnFullRange=true;}
                head._svgAfricanLastFaceRenderKey = null;
            }
            this._stopArmatureClipPreview();
            this._stopArmatureMovement(rig);
            this._stopArmatureFacialMovement?.(rig);
            this._captureArmatureStageBasePosition(rig);
            const snapshot = this._armatureActionSnapshot(rig);
            const controls = Object.fromEntries(this._armatureEditableControlKeys().map(key => [key, clone(this[key])]));
            const selected = this._armatureSelectedAction, editing = this._armatureEditingAction;
            const kitSettings = clone(this._activityKitSettings(rig.root.id));
            const tracks = new Map(), originals = new Map(), additions = new Map(), schedule = [], gestureWindows = [];
            let time = 0, sequenceSize = 100;
            const append = (id, track) => { if (!tracks.has(id)) tracks.set(id, []); tracks.get(id).push(track); };
            const sequenceProps = new Set();
            const state = (current = rig) => new Map([...new Set([...this._crossViewObjects(current), ...[...sequenceProps].map(id => this.objects.getObjectById(id)).filter(Boolean)])].map(obj => [obj.id, ArmatureViewState.capture(obj, { reuseRealisticArtwork: true })]));
            const hideProps = () => {
                for (const id of sequenceProps) {
                    const obj = this.objects.getObjectById(id); if (!obj) continue;
                    obj.visible = false;
                    append(id, { id: Utils.generateId('anim'), type: 'continuous', name: 'Clear sequence prop', trigger: 'onLoad', repeat: '1', delay: time,
                        afterPlayback: 'keep', params: { duration: .001, afterPlayback: 'keep' }, generated: { type: 'continuous', duration: 1,
                            properties: ['visible'], keyframes: [{ t: 0, values: { visible: false } }, { t: 1, values: { visible: false } }] } });
                }
            };
            const hold = (before, after, duration, name, resize = null, turn = null) => {
                if (!duration) return;
                const pinned = new Set(turn ? this._captureCrossViewAttachments(rig).map(item => item.id) : []);
                for (const id of new Set([...before.keys(), ...after.keys()])) {
                    let to = after.get(id) || before.get(id);
                    const hidden = value => JSON.stringify({ ...JSON.parse(value), props: { ...JSON.parse(value).props, visible: false } });
                    let from = before.get(id) || hidden(to);
                    if (resize) from = JSON.stringify({ ...JSON.parse(from), resizeSegment: true, motionSegment: resize.easing === 'linear' });
                    if (turn) {
                        const value = JSON.parse(from);
                        const part = value.props._armaturePartKey || value.props._svgCharacterPartKey;
                        from = JSON.stringify({ ...value, smoothTurnIndex: turn.index, smoothTurnCount: turn.count,
                            quickPivot: turn.quick === true,
                            smoothShoulderLead: !!turn.shoulderLead && /torso|arm/.test(part || ''),
                            smoothHeadLead: !!turn.headLead && ['head-neck', 'headNeck', 'head'].includes(part) });
                    }
                    if (pinned.has(id)) {
                        from = JSON.stringify({ ...JSON.parse(from), followTurnPin: true });
                        to = JSON.stringify({ ...JSON.parse(to), followTurnPin: true });
                    }
                    append(id, { id: Utils.generateId('anim'), type: 'continuous', name, trigger: 'onLoad', repeat: '1', delay: time,
                        afterPlayback: 'keep', params: { duration: duration / 1000, afterPlayback: 'keep' },
                        generated: { type: 'continuous', duration, segmentEasing: 'linear', properties: ['armatureViewState'],
                            keyframes: [{ t: 0, values: { armatureViewState: from } }, { t: 1, values: { armatureViewState: to } }] } });
                }
                time += duration;
            };
            this._characterSequenceCompiling = true;
            this._armatureEditingAction = null;
            try {
                this.objects.objects.forEach(obj => { obj.animations = []; });
                this.animations.originalStates = new Map();
                this._setArmatureRootPosition(rig, recipe.x, recipe.y);
                this._setArmatureBasePosition(rig, recipe.x, recipe.y);
                if (this._getUniversalCharacterCurrentViewSwitchKey(rig) !== recipe.view) rig = await this._switchArmatureCrossView(rig, recipe.view);
                this._currentArmature = rig;
                const startingPose = recipe.startMode === 'idle' ? this._getActiveArmaturePoseCatalog(rig).idle : recipe.startPose;
                if (startingPose) this._applyArmaturePose(rig, { ...clone(startingPose), grounding: false });
                this._setArmatureRootPosition(rig, recipe.x, recipe.y);
                this._setArmatureBasePosition(rig, recipe.x, recipe.y);
                this.objects._resolvePins();
                const initial = state();
                initial.forEach((value, id) => {
                    const obj = this.objects.getObjectById(id);
                    originals.set(id, { ...clone(obj.toJSON()), animations: [] });
                });
                hold(initial, initial, 1, 'Sequence starting state'); time = 0;
                for (const [index, step] of recipe.steps.entries()) {
                    if (this.objects.getObjectById(snapshot.root.id) !== snapshot.root) throw Error('Character or scene changed.');
                    if (options.beforeStep?.[step.id]) {
                        const duration = number(options.beforeStep[step.id], 0, 120000, 'Step delay');
                        const held = state(); hold(held, held, duration, 'Wait for choreography cue');
                    }
                    if(step._routeStart){const anchor=this._crossViewAnchor(rig);this._setArmatureRootPosition(rig,rig.root.x+step._routeStart.x-anchor.x,rig.root.y+step._routeStart.y-anchor.y);this._captureArmatureStageBasePosition(rig);this.objects._resolvePins();}
                    const start = time;
                    if (step.clearProps) hideProps();
                    const gestureWindow = this._sequenceSpeechGestureWindow?.(rig, step, start);
                    this._captureCharacterSequenceSpeech?.(speech, step, rig, start);
                    this._characterSequenceProgress?.(`Preparing step ${index + 1} of ${recipe.steps.length}`);
                    if (step.kind === 'wait' || step.kind === 'head-turn') {
                        const held = state(); hold(held, held, step.duration * 1000, 'Hold pose');
                    } else if (step.kind === 'resize') {
                        const before = state(), bounds = this._getArmatureBounds(rig);
                        const anchor = box => ({ x: (box.minX + box.maxX) / 2, y: step.anchor === 'center' ? (box.minY + box.maxY) / 2 : box.maxY });
                        if (!bounds) throw Error('Cannot calculate character bounds for resizing.');
                        const fixed = anchor(bounds), factor = (step.size ?? 100) / sequenceSize;
                        if (!this._scaleArmatureUniform(rig, factor, { toast: false, pushHistory: false })) throw Error('Could not resize character.');
                        sequenceSize = step.size ?? 100;
                        const next = anchor(this._getArmatureBounds(rig));
                        this._setArmatureRootPosition(rig, rig.root.x + fixed.x - next.x, rig.root.y + fixed.y - next.y);
                        this.objects._resolvePins();
                        this._captureArmatureStageBasePosition(rig);
                        hold(before, state(), step.duration * 1000, 'Resize character', step);
                    } else if (step.kind === 'turn') {
                        const currentView = this._getUniversalCharacterCurrentViewSwitchKey(rig);
                        const coordinated=step.smoothBodyTurn&&step.turnCoordination&&step.turnCoordination!=='legacy';
                        let heldHead=null,headLeadTime=0;
                        if(coordinated){
                            const supported=(currentView==='front'&&/^side:(left|right)$/.test(step.target))||(/^side:(left|right)$/.test(currentView)&&step.target==='front');
                            const head=this._independentSvgHeadTurnHead(rig);
                            const pose=this._snapshotArmaturePose(rig);
                            if(!supported||!head||head._svgCharacterConfig?._photoCharacter||head._svgCharacterConfig?._realisticCharacter)throw Error('Head/body coordination requires a drawn SVG front-to-side or side-to-front turn.');
                            if(step.turnPosture==='walking')throw Error('Head/body coordination supports standing and seated turns, not walking pivots.');
                            head._svgCharacterConfig={...head._svgCharacterConfig,_independentHeadTurn:true,_headTurnFullRange:true,_headTurnConstruction:'matched',styling:{...head._svgCharacterConfig.styling,headArtwork:'matched'}};
                            const face=this.animations._getSvgAfricanFaceState(head);
                            const targetYaw=currentView==='front'?(step.target==='side:left'?-3:3):3;
                            const renderHead=()=>{
                                const svg=SvgAfricanPremiumAssets.renderPartSvg(head._svgCharacterPremiumAssetId,'head-neck',head._svgCharacterConfig,head.id,{faceState:face});
                                head.imageSrc='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
                            };
                            if(step.turnCoordination==='head-first'){
                                headLeadTime=(step.turnHeadDelay??.4)*1000;
                                const alreadySeated=pose.seatDepth>0||Object.entries(pose.jointAngles).filter(([key,angle])=>/-hip$/.test(key)&&Math.abs(angle)>45).length>=2
                                    &&Object.entries(pose.jointAngles).filter(([key,angle])=>/-knee$/.test(key)&&Math.abs(angle)>45).length>=2;
                                const available=step.duration*1000*(step.turnPosture==='seated'&&!alreadySeated ? .6 : 1);
                                if(headLeadTime>=available-150)throw Error('Increase step duration to leave time for the body after the head lead.');
                                const initialYaw=face.frontHeadYaw||0;
                                // Bake the real head geometry, keeping all body parts still.
                                renderHead();let before=state();
                                for(let n=1;n<=16;n++){
                                    const t=n/16;face.frontHeadYaw=initialYaw+(targetYaw-initialYaw)*t*t*(3-2*t);renderHead();
                                    const after=state();hold(before,after,headLeadTime/16,'Head leads body');before=after;
                                }
                            }else if(step.turnCoordination==='follow-head'&&Math.abs((face.frontHeadYaw||0)-targetYaw)>.15){
                                throw Error('Turn the head fully toward the destination first, or choose Head first, then body.');
                            }
                            if(step.turnCoordination!=='together'){renderHead();heldHead={id:head.id,props:JSON.parse(ArmatureViewState.capture(head, { reuseRealisticArtwork: true })).props};}
                        }
                        if (step.smoothBodyTurn && step.turnPosture === 'walking') {
                            if (rig.root._svgCharacterConfig?._photoCharacter || rig.root._svgCharacterConfig?._realisticCharacter) throw Error('Walking pivots require drawn SVG or Universal Characters.');
                            const walking = await this._sampleWalkingBodyTurn(rig, step, state);
                            rig = walking.rig; this._currentArmature = rig;
                            for (const segment of walking.segments) {
                                const ids = new Set(segment.frames.flatMap(frame => [...frame.state.keys()]));
                                for (const id of ids) append(id, { id: Utils.generateId('anim'), type: 'continuous', name: 'Walking body turn', trigger: 'onLoad', repeat: '1', delay: time,
                                    afterPlayback: 'keep', params: { duration: segment.duration / 1000, afterPlayback: 'keep' },
                                    generated: { type: 'continuous', duration: segment.duration, segmentEasing: 'linear', properties: ['armatureViewState'],
                                        keyframes: segment.frames.map(frame => ({ t: frame.t, values: { armatureViewState: frame.state.get(id) || segment.frames.find(f => f.state.has(id)).state.get(id) } })) } });
                                time += segment.duration;
                            }
                        } else {
                        const turnPose = this._snapshotArmaturePose(rig);
                        const seatedSource = turnPose.seatDepth > 0 || Object.entries(turnPose.jointAngles).filter(([key, angle]) => /-hip$/.test(key) && Math.abs(angle) > 45).length >= 2
                            && Object.entries(turnPose.jointAngles).filter(([key, angle]) => /-knee$/.test(key) && Math.abs(angle) > 45).length >= 2;
                        const sitAfterTurn = step.turnPosture === 'seated' && !seatedSource;
                        const preservePosture = step.turnPosture && step.turnPosture !== 'idle';
                        const turnBudget = step.duration * 1000 * (sitAfterTurn ? .6 : 1)-headLeadTime;
                        const quick = step.smoothBodyTurn && step.turnTiming === 'quick';
                        const turnDuration = step.smoothBodyTurn && step.turnSeconds != null ? Math.min(turnBudget, step.turnSeconds * 1000) : turnBudget;
                        const entryHold = quick ? turnDuration * .15 : 0;
                        if (entryHold) { const held = state(); hold(held, held, entryHold, 'Prepare body turn'); }
                        const referenceHeight = preservePosture ? this._capturedViewReferenceHeight(rig) : null;
                        const turnRoot = { x: rig.root.x, y: rig.root.y };
                        const seatedAnchor = seatedSource;
                        const anchorForTurn = rig => seatedAnchor ? this._bodyTurnHipAnchor(rig) : this._crossViewAnchor(rig);
                        const postureAnchor = preservePosture ? anchorForTurn(rig) : null;
                        let targets = [step.target];
                        if (currentView === 'front' && step.target.startsWith('side:')) targets = [`front-3q:${step.target.split(':')[1]}`, step.target];
                        if (currentView.startsWith('side:') && step.target === 'front') targets = [`front-3q:${currentView.split(':')[1]}`, 'front'];
                        if (step.smoothBodyTurn) {
                            if (rig.root._svgCharacterConfig?._photoCharacter || rig.root._svgCharacterConfig?._realisticCharacter) throw Error('Smooth body turns require drawn SVG or Universal Characters.');
                            targets = this._smoothBodyTurnRoute(currentView, step.target, step.turnDirection);
                        }
                        for (const [index, target] of targets.entries()) {
                            const before = state();
                            if (target !== this._getUniversalCharacterCurrentViewSwitchKey(rig)) {
                                rig = await this._switchArmatureCrossView(rig, target, new Set(), { ...(step.smoothBodyTurn ? { threeQuarterArtwork: 'experimental-drawn' } : {}), referenceHeight });
                                if (preservePosture) {
                                    let pose = step.turnPosture === 'seated' && !sitAfterTurn ? this._getArmatureGesturePostures(rig).seated
                                        : this._remapBodyTurnPose(turnPose, currentView, target);
                                    if (step.turnPosture === 'current' && seatedSource) {
                                        const seated = this._getArmatureGesturePostures(rig).seated;
                                        if (!seated) throw Error(`Seated turns are unavailable in ${label(target)}.`);
                                        pose = { ...pose, seatDepth: seated.seatDepth ?? 0 };
                                        for (const field of ['jointAngles', 'jointTilts', 'partAngles', 'partTilts']) {
                                            pose[field] = { ...pose[field], ...Object.fromEntries(Object.entries(seated[field] || {}).filter(([key]) => /-(hip|knee|ankle)$|leg$/.test(key))) };
                                        }
                                    }
                                    if (!pose) throw Error(`Seated turns are unavailable in ${label(target)}.`);
                                    this._setArmatureBasePosition(rig, turnRoot.x, turnRoot.y);
                                    this._applyArmaturePose(rig, { ...clone(pose), grounding: false });
                                    this._setArmatureRootPosition(rig, turnRoot.x, turnRoot.y);
                                    this._setArmatureBasePosition(rig, turnRoot.x, turnRoot.y);
                                    this.objects._resolvePins();
                                    const nextAnchor = anchorForTurn(rig);
                                    this._setArmatureRootPosition(rig, rig.root.x + postureAnchor.x - nextAnchor.x, rig.root.y + postureAnchor.y - nextAnchor.y);
                                    this._captureArmatureStageBasePosition(rig);
                                    this.objects._resolvePins();
                                }
                            }
                            this._currentArmature = rig;
                            if(coordinated){
                                const head=this._independentSvgHeadTurnHead(rig);
                                const face=this.animations._getSvgAfricanFaceState(head);face.frontHeadYaw=0;
                                head._svgCharacterConfig={...head._svgCharacterConfig,_independentHeadTurn:true,_headTurnFullRange:true,_headTurnConstruction:'matched',styling:{...head._svgCharacterConfig.styling,headArtwork:'matched'}};
                                head.imageSrc='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(SvgAfricanPremiumAssets.renderPartSvg(head._svgCharacterPremiumAssetId,'head-neck',head._svgCharacterConfig,head.id,{faceState:face}));
                            }
                            const afterTurn=state();
                            if(heldHead){
                                const preserveHead=(states)=>{
                                    const value=JSON.parse(states.get(heldHead.id));
                                    for(const key of ['imageSrc','_svgCharacterConfig','_svgCharacterPremiumAssetId','_svgAfricanFaceState'])value.props[key]=clone(heldHead.props[key]);
                                    states.set(heldHead.id,JSON.stringify(value));
                                };
                                preserveHead(before);
                                if(index<targets.length-1)preserveHead(afterTurn);
                            }
                            const fraction = quick && targets.length > 2 ? (index === 0 || index === targets.length - 1 ? 3 : 1) / (targets.length + 4) : 1 / targets.length;
                            hold(before, afterTurn, (turnDuration - entryHold) * fraction, 'Change character view', null,
                                step.smoothBodyTurn ? { index, count: targets.length, quick, headLead: !coordinated&&step.turnHeadLead, shoulderLead: !coordinated&&step.turnShoulderLead } : null);
                        }
                        if (sitAfterTurn) {
                            const seated = this._getArmatureGesturePostures(rig).seated;
                            if (!seated) throw Error(`Seated turns are unavailable in ${label(step.target)}.`);
                            this._captureArmatureStageBasePosition(rig);
                            const startPose = this._snapshotArmaturePose(rig), duration = step.duration * 1000 - turnBudget - headLeadTime;
                            const frames = [], count = Math.min(120, Math.max(24, Math.ceil(duration / 33)));
                            // Sample the real grounded pose solver: endpoint-only interpolation lifts the feet between poses.
                            for (let n = 0; n <= count; n++) {
                                const t = n / count, weight = t * t * (3 - 2 * t);
                                if (n) {
                                    const pose = { ...clone(seated), grounding: 'planted', dy: 0,
                                        seatDepth: (startPose.seatDepth || 0) * (1 - weight) + (seated.seatDepth || 0) * weight };
                                    for (const field of ['jointAngles', 'partAngles', 'jointTilts', 'partTilts']) {
                                        pose[field] = field.endsWith('Tilts') ? this._lerpArmatureTiltMaps(startPose[field] || {}, seated[field] || {}, weight)
                                            : this._lerpJointAngles(startPose[field] || {}, seated[field] || {}, weight);
                                    }
                                    this._applyArmaturePose(rig, pose); this.objects._resolvePins();
                                }
                                frames.push({ t, state: new Map([...state()].map(([id, value]) => [id, JSON.stringify({ ...JSON.parse(value), motionSegment: true })])) });
                            }
                            for (const id of new Set(frames.flatMap(frame => [...frame.state.keys()]))) append(id, {
                                id: Utils.generateId('anim'), type: 'continuous', name: 'Sit after turn', trigger: 'onLoad', repeat: '1', delay: time,
                                afterPlayback: 'keep', params: { duration: duration / 1000, afterPlayback: 'keep' },
                                generated: { type: 'continuous', duration, segmentEasing: 'linear', properties: ['armatureViewState'],
                                    keyframes: frames.map(frame => ({ t: frame.t, values: { armatureViewState: frame.state.get(id) } })) }
                            });
                            time += duration;
                            this._captureArmatureStageBasePosition(rig);
                        }
                        if (turnBudget > turnDuration) { const held = state(); hold(held, held, turnBudget - turnDuration, 'Hold turned pose'); }
                        }
                    } else {
                        const before = state();
                        this._currentArmature = rig;
                        const spec = this._armatureActionSpec(step.kind, step.key, rig);
                        const catalog = step.kind === 'pose' ? this._getActiveArmaturePoseCatalog(rig) : this._getActiveArmatureMovementCatalog(rig);
                        if (!catalog[step.key] || !(step.kind === 'pose' ? this._armaturePoseMatchesCurrentView(rig, catalog[step.key])
                            : this._armatureMovementMatchesCurrentView(rig, catalog[step.key]))) throw Error(`Step ${index + 1}: action is unavailable in ${label(spec.view)}.`);
                        if (step.cycles > 1 && !spec.supportsCycles) throw Error(`Step ${index + 1}: this action cannot repeat. Duplicate the step instead.`);
                        spec.armatureGesture ||= step.upperBody;
                        this._armatureSelectedAction = spec;
                        this._armatureActionDuration = step.duration * step.cycles;
                        this._armatureActionCycles = step.cycles;
                        this._armaturePoseTransition = Math.max(.05, Math.min(step.duration, step.transition));
                        this._armaturePoseHold = Math.max(0, step.duration - this._armaturePoseTransition);
                        this._armatureGesturePosture = 'current';
                        this._armatureTravelDistancePx = null;
                        this._armatureTravelDistanceYPx = null;
                        this._armatureTravelAngle = 0;
                        this._armatureSpeed = 1; this._armatureDistanceScale = 1;
                        this._resolveCharacterSequenceDestination(step,catalog[step.key],rig);
                        const gaitDistance=this._configureCharacterSequenceGait(step,catalog[step.key],rig);
                        for (const key of ['_armatureEndFacingKey', '_armatureFinishPoseKey', '_armatureFinishExpressionKey', '_armatureFinishGazeKey']) this[key] = '';
                        Object.assign(this._activityKitSettings(rig.root.id), { enabled: step.kit, keep: true, existing: '', chair: '', desk: '' });
                        // A preceding turn can leave a serialized view baseline from before the turn.
                        // The next action must restore the live view, not that stale baseline.
                        for(const obj of this._getArmatureViewTransitionObjects(rig)||[])if(obj.armatureViewState!==undefined)obj.armatureViewState=ArmatureViewState.capture(obj, { reuseRealisticArtwork: true });
                        this.objects.objects.forEach(obj => { obj.animations = []; });
                        this.animations.originalStates = new Map();
                        const clip = await this._compileArmatureActionDraft();
                        if (!clip) throw Error(`Step ${index + 1}: ${this._armatureActionMessage?.text || 'could not compile action'}`);
                        if (step.kind === 'movement') this._setCharacterSequenceTravelDistance(clip, gaitDistance ?? step.distance, rig);
                        if (step.distance !== 0 && step.travelAngle != null && step.travelAngle !== 0) {
                            if (!this._isArmatureWalkStrideMovement(step.key, catalog[step.key])) throw Error('Travel angle applies only to walking/running movements.');
                            this._redirectCharacterSequenceTravel(clip, step.travelAngle, rig);
                        }
                        await this._replaceCharacterSequenceProps?.(clip, step);
                        clip.additions.filter(obj => obj.sceneAsset?.activityRootId === rig.root.id).forEach(obj => sequenceProps.add(obj.id));
                        clip.additions.forEach(obj => additions.set(obj.id, obj));
                        this._installArmatureAction(clip, 0, 'sequence-build');
                        this.animations.applyAnimationsAtTime(0, { timelinePreview: true }); this.objects._resolvePins();
                        if (step.kind === 'movement' && step.transition) hold(before, state(), step.transition * 1000, 'Blend into movement');
                        clip.tracks.forEach((values, id) => values.forEach(track => append(id, { ...clone(track), delay: time + (Number(track.delay) || 0) })));
                        this.animations.applyAnimationsAtTime(clip.durationMs, { timelinePreview: true }); this.objects._resolvePins();
                        time += clip.durationMs;
                        rig = this._refreshDetectedArmatureReference(rig) || rig;
                        this._currentArmature = rig;
                        this._setArmatureBasePosition(rig, rig.root.x, rig.root.y);
                        clip.originals.forEach((value, id) => { if (!originals.has(id)) originals.set(id, clone(value)); });
                    }
                    this.objects.objects.forEach(obj => { if (!snapshot.states.has(obj.id)) additions.set(obj.id, obj); });
                    const motionEnd=time;
                    const speechEnd = Math.max(0,...speech.filter(entry => (entry.waitStepId||entry.stepId) === step.id && entry.timing === 'wait').map(entry=>entry.endMs||0));
                    if (speechEnd > time) { const held = state(); hold(held, held, speechEnd - time, 'Wait for speech'); }
                    if (step.wait) { const held = state(); hold(held, held, step.wait * 1000, 'Wait after action'); }
                    if (options.stepEnds?.[step.id] !== undefined) {
                        const end = number(options.stepEnds[step.id], 0, 86400000, 'Choreography step end');
                        if (end < time - 1) throw Error('Action timing changed. Review choreography timing again.');
                        if (end > time) { const held = state(); hold(held, held, end - time, 'Hold for other characters'); }
                    }
                    if (step.headTurn) {
                        if (step.kind === 'turn' || !this._supportsIndependentSvgHeadTurn(rig)) throw Error('Head-turn overlays require a supported SVG step without a body turn.');
                        if (!['front','back'].includes(this._getUniversalCharacterCurrentViewSwitchKey(rig)) && (/-to-/.test(step.headTurn.direction) || step.headTurn.look === 'strong')) throw Error('Strong looks and sweeps require a front/back body.');
                        if (this._getUniversalCharacterCurrentViewSwitchKey(rig).startsWith('side:') && !['viewer','front'].includes(step.headTurn.direction)) throw Error('Side heads support Turn toward viewer or Return to profile.');
                        if(step.headTurn.look==='full'&&!['front','side:left','side:right'].includes(this._getUniversalCharacterCurrentViewSwitchKey(rig)))throw Error('Full-range turns require a front or side body view.');
                        const head = this.animations._getSvgAfricanPremiumHeadObject(rig.root);
                        const currentFace = this.animations._getSvgAfricanFaceState(head);
                        const track = this._independentHeadTurnTrack(step.headTurn, currentFace.frontHeadYaw || 0, currentFace.gazeX || 0, currentFace.gazeY || 0);
                        if (track.generated.duration > time-start) throw Error(`Head turn in step ${index+1} is longer than the step. Increase step duration or shorten the head turn.`);
                        track.delay = start; append(head.id, track);
                        if(step.headTurn.shoulders){
                            if(!['head-turn','wait'].includes(step.kind))throw Error('Shoulder follow needs a Head Turn or Wait step so it does not overwrite body movement.');
                            for(const companion of this._headTurnShoulderTracks(rig,track)){
                                append(companion.obj.id,companion.track);
                                const index=Number(companion.property.split('_').at(-1));
                                companion.obj.joints[index].angle=companion.track.generated.keyframes.at(-1).values[companion.property];
                            }
                        }
                        const ending = track.generated.keyframes.at(-1).values;
                        const face = this.animations._getSvgAfricanFaceState(head);
                        face.frontHeadYaw = ending.svgAfricanFace_frontHeadYaw;
                        if (step.headTurn.eyes) face.gazeX = ending.svgAfricanFace_gazeX;
                        if (ending.svgAfricanFace_gazeY !== undefined) face.gazeY = ending.svgAfricanFace_gazeY;
                    }
                    if (step.kit && !step.keepProps) hideProps();
                    if (gestureWindow) gestureWindows.push({ ...gestureWindow, endMs: time });
                    schedule.push({ id: step.id, index, start, motionEnd, end: time, kind:step.kind, name:step._timingName||step.key||step.kind,
                        sourceStepId:step._sourceStepId||step.id,rootId:rig.root.id,view: this._getUniversalCharacterCurrentViewSwitchKey(rig) });
                }
                const speechEnd = Math.max(0, ...speech.filter(entry => entry.timing !== 'independent').map(entry => entry.endMs));
                if (speechEnd > time) {
                    const window = this._sequenceSpeechGestureWindow?.(rig, {kind:'wait'}, time);
                    const held = state(); hold(held, held, speechEnd - time, 'Finish sequence speech');
                    if (window) gestureWindows.push({...window,endMs:time});
                }
                speech.forEach(entry => { entry.gestureWindows = clone(gestureWindows); });
                for (const [id, obj] of additions) {
                    const hidden = JSON.parse(ArmatureViewState.capture(obj, { reuseRealisticArtwork: true })); hidden.props.visible = false;
                    const value = JSON.stringify(hidden);
                    originals.set(id, { ...clone(obj.toJSON()), animations: [], visible: false, armatureViewState: value });
                    const baseline = { id: Utils.generateId('anim'), type: 'continuous', name: 'Sequence hidden attachment baseline', trigger: 'onLoad', repeat: '1', delay: 0,
                        afterPlayback: 'keep', params: { duration: .001, afterPlayback: 'keep' }, generated: { type: 'continuous', duration: 1,
                            properties: ['armatureViewState'], keyframes: [{ t: 0, values: { armatureViewState: value } }, { t: 1, values: { armatureViewState: value } }] } };
                    tracks.set(id, [baseline, ...(tracks.get(id) || [])]);
                    obj.animations = [];
                }
                const validation = this._validateArmatureCompiledTracks(tracks);
                if (validation.errors.length) throw Error(validation.errors[0].message);
                return { name: recipe.name || 'Character Sequence', rootId: snapshot.root.id, tracks, additions: [...additions.values()], originals,
                    durationMs: time, schedule, validation, speech, recipe: { version: 1, sequence: recipe, schedule,
                        spec: { kind: 'sequence', name: recipe.name, rootId: snapshot.root.id, view: recipe.view }, controls: {}, activityOriginals: {} } };
            } finally {
                this._restoreArmatureActionSnapshot(snapshot, true);
                Object.assign(this, controls);
                Object.assign(this._activityKitSettings(snapshot.root.id), kitSettings);
                this._armatureSelectedAction = selected; this._armatureEditingAction = editing;
                this._characterSequenceCompiling = false;
            }
        },

        async _compileIndependentResize(rig, settings) {
            const recipe = this._newCharacterSequence(rig);
            recipe.name = 'Resize character'; recipe.startMode = 'captured'; recipe.startPose = this._snapshotArmaturePose(rig);
            recipe.steps = [{ ...this._newCharacterSequenceStep('resize'), size: Number(settings.size), duration: Number(settings.duration), anchor: settings.anchor, easing: settings.easing, transition: 0 }];
            return this._compileCharacterSequence(rig, recipe);
        },

        _openIndependentResize(rig) {
            if (this.animations.isPlaying || this.animations._exportingVideo || this._armatureRecordingBusy) { Utils.showToast('Stop playback first.', 'warning'); return; }
            const existing = document.querySelector('[data-resize-animation]');
            if (existing) { existing.querySelector('[data-size]')?.focus(); return; }
            document.querySelector('[data-independent-head-panel] [data-close]')?.click();
            const panel = document.createElement('section'); panel.className = 'character-sequence-editor'; panel.dataset.resizeAnimation = '';
            panel.innerHTML = '<header><strong>Resize animation</strong><button data-close aria-label="Close"><i class="fas fa-times"></i></button></header><div class="sequence-content"><div class="sequence-fields"><label>Target size (%)<input data-size type="number" min="10" max="300" step="5" value="150"></label><label>Duration (s)<input data-duration type="number" min="0.05" max="120" step="0.1" value="2"></label><label>Anchor<select data-anchor><option value="feet">Feet fixed</option><option value="center">Center fixed</option></select></label><label>Timing<select data-easing><option value="smooth">Smooth</option><option value="linear">Linear</option></select></label></div><button data-preview><i class="fas fa-play"></i> Preview</button><button data-stop><i class="fas fa-stop"></i> Stop</button><button data-add><i class="fas fa-plus"></i> Add to Timeline</button><p role="status"></p></div>';
            document.body.append(panel); const dispose = Utils._bindFloatingPanelDrag(panel, panel.querySelector('header'));
            let busy = false;
            const stop = () => this._stopArmatureClipPreview();
            panel.querySelector('[data-stop]').onclick = stop;
            panel.querySelector('[data-close]').onclick = () => { if (busy) return; stop(); dispose?.(); panel.remove(); };
            const run = async preview => {
                if (busy) return; busy = true;
                const status = panel.querySelector('[role="status"]');
                panel.setAttribute('aria-busy', 'true');
                panel.querySelectorAll('button').forEach(button => { button.disabled = true; });
                status.textContent = 'Preparing resize...';
                try {
                    if (this.animations.isPlaying || this.animations._exportingVideo) throw Error('Stop playback first.');
                    stop(); rig = this._refreshDetectedArmatureReference(rig) || rig;
                    if (!this.objects.getObjectById(rig.root.id)) throw Error('Character is no longer on the stage.');
                    const settings = Object.fromEntries(['size','duration','anchor','easing'].map(key => [key,panel.querySelector(`[data-${key}]`).value]));
                    const start = Math.max(0, this.animations.currentTime || 0), clip = await this._compileIndependentResize(rig, settings);
                    this._validateIndependentResizePlacement(clip, start);
                    if (preview) this._startArmatureClipPreview(clip, start, this._armatureActionSnapshot(rig), true, ({completed, restored}) => {
                        if (panel.isConnected) status.textContent = restored ? `${completed ? 'Preview complete' : 'Preview stopped'}. Starting size restored.` : 'Preview stopped. Character changed.';
                    });
                    else {
                        this._installArmatureAction(clip, start, Utils.generateId('armature-action'));
                        eventBus.emit('timeline:update'); eventBus.emit('history:push');
                    }
                    status.textContent = preview ? 'Previewing resize.' : 'Resize added to timeline.';
                } catch (error) { status.textContent = error.message; } finally { busy = false; panel.setAttribute('aria-busy', 'false'); panel.querySelectorAll('button').forEach(button => { button.disabled = false; }); }
            };
            panel.querySelector('[data-preview]').onclick = () => run(true);
            panel.querySelector('[data-add]').onclick = () => run(false);
        },

        _validateIndependentResizePlacement(clip, start) {
            const affected = [...clip.tracks.keys()];
            if (affected.some(id => (this.objects.getObjectById(id)?.animations || []).some(track => (Number(track.delay)||0) < start+clip.durationMs && (Number(track.delay)||0)+this._armatureTrackDuration(track) > start))) throw Error('Resize overlaps another character animation. Move the playhead or use a combined sequence.');
        },

        _openBodyTurnEditor(rig) {
            if (rig.root._svgCharacterConfig?._photoCharacter || rig.root._svgCharacterConfig?._realisticCharacter) {
                Utils.showToast('Body turns require drawn SVG or Universal characters.', 'warning'); return;
            }
            const live = this._refreshDetectedArmatureReference(rig) || rig, recipe = this._newCharacterSequence(live);
            recipe.name = 'Body turn';
            recipe.steps = [{ ...this._newCharacterSequenceStep('turn'), target: recipe.view === 'side:right' ? 'front' : 'side:right', duration: 1.2,
                smoothBodyTurn: true, turnDirection: 'shortest', turnPosture: 'current' }];
            return this._openCharacterSequenceEditor(live, recipe);
        },

        _mountCharacterSequenceControls(panel, rig) {
            const host = panel.querySelector('#armature-movement-blend');
            if (!host || panel.querySelector('[data-character-sequence]')) return;
            const button = document.createElement('button');
            button.className = 'btn-small'; button.dataset.characterSequence = 'open';
            button.innerHTML = '<i class="fas fa-list-ol"></i> Character Sequence';
            button.onclick = () => this._openCharacterSequenceEditor(this._refreshDetectedArmatureReference(rig) || rig);
            host.prepend(button);
            const routeButton=document.createElement('button');routeButton.className='btn-small';routeButton.dataset.multiPointTravel='';routeButton.innerHTML='<i class="fas fa-route"></i> Multi-Point Travel';
            routeButton.onclick=()=>{const live=this._refreshDetectedArmatureReference(rig)||rig,recipe=this._newCharacterSequence(live);recipe.name='Multi-Point Travel';recipe.steps=[this._newCharacterSequenceStep('travel-route')];this._openCharacterSequenceEditor(live,recipe);};host.prepend(routeButton);
            const choreography = document.createElement('button'); choreography.className = 'btn-small'; choreography.dataset.sceneChoreography = 'open';
            choreography.innerHTML = '<i class="fas fa-users"></i> Scene Choreography';
            choreography.onclick = () => this._openSceneChoreography(); host.prepend(choreography);
            const resizeButton = document.createElement('button'); resizeButton.className = 'btn-small'; resizeButton.dataset.resizeAnimationOpen = '';
            resizeButton.innerHTML = '<i class="fas fa-expand-arrows-alt"></i> Resize animation'; resizeButton.onclick = () => this._openIndependentResize(this._refreshDetectedArmatureReference(rig) || rig); host.prepend(resizeButton);
            if (rig.root._characterAppearanceProvider === 'svg-african-premium' && !rig.root._svgCharacterConfig?._photoCharacter && !rig.root._svgCharacterConfig?._realisticCharacter) {
                const bodyButton = document.createElement('button'); bodyButton.className = 'btn-small'; bodyButton.dataset.smoothBodyTurn = '';
                bodyButton.innerHTML = '<i class="fas fa-rotate"></i> Body Turn';
                bodyButton.onclick = () => this._openBodyTurnEditor(rig); host.prepend(bodyButton);
            }
            if (this._supportsIndependentSvgHeadTurn(rig)) {
                const headButton = document.createElement('button'); headButton.className = 'btn-small'; headButton.dataset.independentHeadTurn = '';
                headButton.innerHTML = '<i class="fas fa-user"></i> Head Turn'; headButton.onclick = () => this._openIndependentSvgHeadTurn(this._refreshDetectedArmatureReference(rig) || rig); host.prepend(headButton);
            }
        },

        async _openCharacterSequenceEditor(rig, saved = null, action = null) {
            if (this._choreographyCompiling || this._characterSequenceCompiling || this.animations.isPlaying || this.animations._exportingVideo) { Utils.showToast('Stop playback first.', 'warning'); return; }
            this._closeSceneChoreography?.();
            this._closeCharacterSequence?.();
            this._stopArmatureClipPreview();
            const recordedSequences = () => [...new Set(this.objects.objects.flatMap(obj => (obj.animations || []).map(track => track._armatureActionId)).filter(Boolean))]
                .map(id => this._getArmatureRecordedAction(id)).filter(entry => entry?.rootId === rig.root.id && entry.recipe?.sequence)
                .sort((a, b) => b.start - a.start);
            if (!saved && !action) {
                action = recordedSequences()[0] || null;
                if (action) saved = action.recipe.sequence;
            }
            const recipe = clone(saved || this._newCharacterSequence(rig));
            const dialog = document.createElement('section'); dialog.className = 'character-sequence-editor';
            dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-label', 'Character Sequence');
            dialog.innerHTML = `<header><strong>Character Sequence</strong><button data-seq="minimize" title="Minimize" aria-label="Minimize"><i class="fas fa-minus"></i></button><button data-seq="close" title="Close" aria-label="Close"><i class="fas fa-times"></i></button></header>
                <div class="sequence-content"><div class="sequence-fields"><label>Name<input data-seq="name" maxlength="100"></label><label>Start X<input data-seq="x" type="number" step="1"></label><label>Start Y<input data-seq="y" type="number" step="1"></label><button data-seq="position" title="Use current stage position"><i class="fas fa-crosshairs"></i></button><label>Starting pose<select data-seq="startMode"><option value="captured">Captured starting pose</option><option value="idle">Idle</option></select></label><button data-seq="capture" title="Capture current stage pose"><i class="fas fa-camera"></i> Capture Pose</button></div>
                <label>Timeline start (s)<input data-seq="timelineStart" type="number" min="0" max="86400" step="0.1"></label>
                <div class="sequence-library"><select data-seq="templates" aria-label="Saved sequences"><option value="">Saved sequences</option></select><button data-seq="load" title="Load template"><i class="fas fa-folder-open"></i></button><button data-seq="save" title="Save template"><i class="fas fa-save"></i></button><button data-seq="delete" title="Delete template"><i class="fas fa-trash"></i></button></div>
                <div class="sequence-library"><button data-seq="import" title="Import sequence template" aria-label="Import sequence template"><i class="fas fa-file-import"></i></button><button data-seq="export" title="Export sequence template" aria-label="Export sequence template"><i class="fas fa-download"></i></button><button data-seq="review"><i class="fas fa-list-check"></i> Review Timing</button></div>
                <div data-seq="reviewPanel" hidden></div>
                <div data-seq="steps"></div><button data-seq="add"><i class="fas fa-plus"></i> Add Step</button>
                <footer><button data-seq="preview"><i class="fas fa-play"></i> Preview</button><button data-seq="stop" title="Stop and restore" aria-label="Stop and restore"><i class="fas fa-stop"></i></button><button data-seq="apply"><i class="fas fa-check"></i> ${action ? 'Update' : 'Add to'} Timeline</button></footer>
                <input data-seq="seek" type="range" min="0" max="1" step="0.001" value="0" aria-label="Sequence playhead"><output data-seq="time"></output><p role="status" aria-live="polite"></p></div>`;
            document.body.append(dialog);
            const disposeDrag = Utils._bindFloatingPanelDrag(dialog, dialog.querySelector('header'));
            const clampDialog = () => Utils.clampFloatingPanel(dialog);
            window.addEventListener('resize', clampDialog);
            const find = name => dialog.querySelector(`[data-seq="${name}"]`), status = dialog.querySelector('[role=status]');
            const existing = document.createElement('select'); existing.dataset.seq = 'existing'; existing.setAttribute('aria-label', 'Timeline sequences');
            const existingLabel = document.createElement('label'); existingLabel.append('Timeline sequence', existing);
            dialog.querySelector('.sequence-content').prepend(existingLabel);
            const refreshExisting = () => {
                existing.replaceChildren(new Option('New sequence', ''));
                recordedSequences().forEach(entry => existing.append(new Option(`${entry.name || 'Sequence'} (${(entry.start / 1000).toFixed(2)} s)`, entry.id)));
                existing.value = action?.id || '';
            };
            refreshExisting();
            existing.onchange = async () => {
                if (busy) return;
                read();
                const selected = existing.value;
                if (JSON.stringify(recipe) !== cleanRecipe
                    && !confirm('Discard unapplied sequence edits?')) { existing.value = action?.id || ''; return; }
                const entry = selected ? this._getArmatureRecordedAction(selected) : null;
                if (selected && !entry?.recipe?.sequence) { setStatus('That sequence is no longer on the timeline.'); refreshExisting(); return; }
                await this._openCharacterSequenceEditor(rig, entry?.recipe.sequence || this._newCharacterSequence(rig), entry);
            };
            let cleanRecipe = null;
            find('name').value = recipe.name; find('x').value = recipe.x; find('y').value = recipe.y; find('startMode').value = recipe.startMode || 'captured';
            find('timelineStart').value = (action?.start ?? Math.max(0, this.animations.currentTime || 0)) / 1000;
            let busy = false, closed = false, previewSnapshot = null, previewAudio = null, clip = null, raf = null, previewPlaying = false;
            const removedAudio = new Set();
            const catalogCache = new Map();
            const setStatus = text => { status.textContent = text; };
            const stop = () => { cancelAnimationFrame(raf); raf = null; previewPlaying = false;
                window.app?.audioTimeline?.pause();
                window.app?.audioTimeline?.tracks.forEach(track => { if (track.audioElement) track.audioElement.ontimeupdate = null; });
                if (previewSnapshot) this._restoreArmatureActionSnapshot(previewSnapshot, true);
                if (previewAudio) this._restoreCharacterSequenceAudio?.(previewAudio);
                previewAudio = null;
                previewSnapshot = null; find('seek').value = 0; find('time').value = ''; };
            const read = () => { recipe.name = find('name').value.trim() || 'Character Sequence'; recipe.x = Number(find('x').value); recipe.y = Number(find('y').value); recipe.startMode = find('startMode').value; };
            const work = async fn => { if (busy) return; busy = true;
                const controls=[...dialog.querySelectorAll('button,input,select,textarea')],disabled=controls.map(el=>el.disabled);
                controls.forEach(el=>el.disabled=true);dialog.setAttribute('aria-busy','true');
                try { stop(); read(); await fn(); } catch (error) { setStatus(error.message); }
                finally { busy = false; if (!closed) { dialog.removeAttribute('aria-busy');controls.forEach((el,i)=>{if(el.isConnected)el.disabled=disabled[i];}); dialog.querySelectorAll('.sequence-body-turn-fields').forEach(el => el._updateBodyTurnControls?.()); } } };
            let cancelDestinationPick=null;
            const invalidate = () => { this._cancelMultiPointEdit?.(); cancelDestinationPick?.(); stop(); clip = null; find('reviewPanel').hidden = true; find('reviewPanel').replaceChildren(); };
            const templates = () => { try { const data = JSON.parse(localStorage.getItem(storageKey) || '{}'); return data && typeof data === 'object' && !Array.isArray(data) ? data : {}; } catch (_) { return {}; } };
            const refreshLibrary = () => { find('templates').replaceChildren(new Option('Saved sequences', '')); Object.entries(templates()).forEach(([id, r]) => find('templates').append(new Option(r.name || 'Sequence', id))); };
            const icon = (name, title, handler) => { const button = document.createElement('button'); button.type = 'button'; button.title = title; button.setAttribute('aria-label', title); button.innerHTML = `<i class="fas fa-${name}"></i>`; button.onclick = handler; return button; };
            const examples=document.createElement('div');examples.className='sequence-library';
            const example=document.createElement('select');example.setAttribute('aria-label','Sequence example');
            example.append(new Option('Walk and explain','walk-explain'),new Option('Stop and speak','stop-speak'));
            examples.append(example,icon('plus','Use editable example',()=>work(async()=>{
                if(!confirm('Replace the draft steps with this editable example? Existing timeline clips remain unchanged until you update.'))return;
                invalidate();Object.assign(recipe,await this._characterSequenceExample(rig,example.value));await render();setStatus('Example loaded. Select or generate speech, then review timing.');
            })));find('templates').closest('.sequence-library').after(examples);
            const render = async () => {
                find('reviewPanel').hidden = true; find('reviewPanel').replaceChildren();
                find('name').value = recipe.name; find('x').value = recipe.x; find('y').value = recipe.y; find('startMode').value = recipe.startMode || 'captured';
                const rows = find('steps'); rows.replaceChildren(); let view = recipe.view;
                this._mountSequenceCaptionStyle?.(rows,recipe,invalidate);
                for (const [index, step] of recipe.steps.entries()) {
                    const row = document.createElement('div'); row.className = 'sequence-step'; row.dataset.step = step.id;
                    const heading = document.createElement('div'); heading.className = 'sequence-step-heading';
                    const title = document.createElement('strong'); title.textContent = `${index + 1}. ${label(view)}`; heading.append(title);
                    heading.append(icon('play', 'Preview this step', () => play(index)),
                        icon('arrow-up', 'Move step up', () => { if (index) { invalidate(); [recipe.steps[index - 1], recipe.steps[index]] = [step, recipe.steps[index - 1]]; work(render); } }),
                        icon('arrow-down', 'Move step down', () => { if (index < recipe.steps.length - 1) { invalidate(); [recipe.steps[index + 1], recipe.steps[index]] = [step, recipe.steps[index + 1]]; work(render); } }),
                        icon('copy', 'Duplicate step', () => { if (recipe.steps.length >= 40) return; invalidate(); recipe.steps.splice(index + 1, 0, this._duplicateSequenceStep(step)); work(render); }),
                        icon('trash', 'Delete step', () => work(async () => { const spoken=this._sequenceSpeechSteps([step]).filter(s=>s.speech?.audioId);const choice = spoken.length ? await this._chooseSequenceAudioRemoval?.() : 'keep';
                            if (choice === 'cancel') return;
                            if (choice === 'delete') spoken.forEach(s=>removedAudio.add(s.speech.audioId));
                            clip = null; recipe.steps.splice(index, 1); await render(); })));
                    row.append(heading);
                    const fields = document.createElement('div'); fields.className = 'sequence-fields'; row.append(fields);
                    const field = (name, control) => { const labelNode = document.createElement('label'); labelNode.append(document.createTextNode(name), control); fields.append(labelNode); return control; };
                    const kind = document.createElement('select'); ['movement', 'pose', 'wait', 'head-turn', 'turn', 'resize','travel-route','handoff'].forEach(value => { const option=new Option(value==='handoff'?'Hand over prop':value==='head-turn'?'Head Turn':value==='turn'?'Body Turn':value==='travel-route'?'Multi-Point Travel':value,value); option.disabled=value==='head-turn'&&!this._supportsIndependentSvgHeadTurn(rig,view);kind.append(option); }); kind.value = step.kind;
                    field('Action type', kind).onchange = () => { if(!this._canChangeSequenceStepKind(step,kind.value,setStatus)){kind.value=step.kind;return;} invalidate(); this._setSequenceActionKind(step,kind.value,view); work(render); };
                    if (['movement', 'pose'].includes(step.kind)) {
                        if (!catalogCache.has(view)) catalogCache.set(view, await this._characterSequenceCatalog(rig, view));
                        const choices = catalogCache.get(view)[step.kind], select = document.createElement('select'); select.append(new Option('Choose action', ''));
                        select.setAttribute('aria-label', 'Action');
                        const search = document.createElement('input'); search.type = 'search'; search.placeholder = 'Search actions'; search.setAttribute('aria-label', 'Search actions');
                        field('Search actions', search);
                        const filterActions = () => {
                            const query = search.value.trim().toLowerCase();
                            select.replaceChildren(new Option('Choose action', ''));
                            choices.filter(item => item.key === step.key || `${item.name} ${item.key}`.toLowerCase().includes(query)).forEach(item => select.append(new Option(item.name, item.key)));
                            select.value = step.key;
                        };
                        search.oninput = filterActions; filterActions();
                        field('Action', select).onchange = () => { invalidate(); delete step.travelTarget; step.key = select.value; const entry = choices.find(item => item.key === step.key); step.upperBody = !!entry?.gesture; work(render); };
                    } else if (step.kind === 'turn') {
                        const select = document.createElement('select'); turnViews.forEach(value => select.append(new Option(label(value), value))); select.value = step.target;
                        field('Face', select).onchange = () => { invalidate(); step.target = select.value; work(render); }; view = step.target;
                        this._mountBodyTurnFields(row, step, invalidate);
                    }
                    if(step.kind==='travel-route'){await this._mountTravelRouteFields(row,step,{rig,view,invalidate,render:()=>work(render),status:setStatus,recipe,
                        applySequence:()=>find('apply').onclick(),alive:()=>!closed&&recipe.steps.includes(step)&&this.objects.getObjectById(rig.root.id)===rig.root});view=this._travelRouteEndView(step.route,view);rows.append(row);continue;}
                    const numeric = (key, name, min, max, increment) => { const control = document.createElement('input'); control.type = 'number'; control.min = min; control.max = max; control.step = increment; control.value = step[key] ?? '';
                        field(name, control).onchange = () => { invalidate(); if(['distance','travelAngle'].includes(key)){delete step.travelTarget;const target=fields.querySelector('[data-travel-destination]');if(target)target.value='';} step[key] = control.value === '' && ['distance', 'travelAngle'].includes(key) ? null : Number(control.value); }; };
                    if(step.kind!=='head-turn')numeric('duration', step.kind === 'movement' ? 'Seconds per cycle' : 'Duration (s)', step.kind==='handoff'?2:.05, step.kind==='handoff'?8:120, .1); numeric('wait', 'Wait after (s)', 0, 120, .1);
                    if (step.kind === 'resize') {
                        step.size ??= 100;
                        numeric('size', 'Size (% of starting size)', 10, 300, 5);
                        for (const [key, name, choices] of [['anchor', 'Anchor', [['feet', 'Feet fixed'], ['center', 'Center fixed']]], ['easing', 'Timing', [['smooth', 'Smooth'], ['linear', 'Linear']]]]) {
                            const input = document.createElement('select'); choices.forEach(([value, text]) => input.append(new Option(text, value))); input.value = step[key] || choices[0][0];
                            field(name, input).onchange = () => { invalidate(); step[key] = input.value; };
                        }
                    }
                    if(step.kind==='handoff')this._mountHandoffStepFields(row,step,{rig,invalidate,render:()=>work(render),status:setStatus});
                    if (['movement', 'pose'].includes(step.kind)) {
                        numeric('transition', 'Blend (s)', 0, 5, .1); numeric('cycles', 'Cycles', 1, 20, 1);
                        if (step.kind === 'movement') {
                            numeric('distance', 'Travel (px)', -10000, 10000, 10);
                            const entry = catalogCache.get(view)?.movement.find(item => item.key === step.key);
                            if (this._isArmatureWalkStrideMovement(step.key, entry)) {
                                numeric('travelAngle', 'Travel angle offset (degrees)', -180, 180, 5);
                                const control = fields.lastElementChild.querySelector('input'); control.placeholder = 'Default'; control.title = 'Clockwise rotation from the default travel path. Facing and limb motion stay unchanged.';
                                const destination=document.createElement('input');destination.dataset.travelDestination='';destination.readOnly=true;destination.value=step.travelTarget?`${step.travelTarget.x.toFixed(1)}, ${step.travelTarget.y.toFixed(1)}`:'';destination.placeholder='Not selected';field('Destination X, Y (feet)',destination);
                                fields.append(icon('crosshairs','Pick travel destination on stage',()=>{
                                    invalidate();read();
                                    if(this.animations.isPlaying||this.stageCamera?._editMode||window.app.stageCamera?._editMode){setStatus('Stop playback and close the camera editor first.');return;}
                                    const canvas=this.stage.canvas,previous=canvas.style.cursor,wasHidden=dialog.hidden;
                                    dialog.hidden=true;canvas.style.cursor='crosshair';
                                    Utils.showToast('Click the stage destination for the feet. Escape cancels.','info');
                                    const cleanup=()=>{canvas.removeEventListener('mousedown',pick,true);window.removeEventListener('keydown',escape,true);canvas.style.cursor=previous;dialog.hidden=wasHidden;cancelDestinationPick=null;};
                                    const escape=event=>{if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();cleanup();}};
                                    const pick=event=>{if(event.button!==0)return;event.preventDefault();event.stopImmediatePropagation();const point=this.stage.screenToStage(event.clientX,event.clientY);cleanup();
                                        const previousTarget=step.travelTarget;step.travelTarget={x:point.x,y:point.y};
                                        work(async()=>{try{const draft={...recipe,steps:recipe.steps.slice(0,index+1)};const measured=await this._compileCharacterSequence(rig,draft);const resolved=measured.recipe.sequence.steps[index];step.distance=resolved.distance;step.travelAngle=resolved.travelAngle;setStatus('Destination set. Preview or update the timeline to apply.');}catch(error){step.travelTarget=previousTarget;setStatus(error.message);}await render();});};
                                    cancelDestinationPick=cleanup;canvas.addEventListener('mousedown',pick,true);window.addEventListener('keydown',escape,true);
                                }),icon('times','Clear travel destination',()=>{invalidate();delete step.travelTarget;work(render);}));
                            }
                        }
                        for (const [key, text] of [['kit', 'Activity kit'], ['upperBody', 'Arms only / keep posture']]) {
                            const control = document.createElement('input'); control.type = 'checkbox'; control.checked = !!step[key]; field(text, control).onchange = () => { invalidate(); step[key] = control.checked; if (key === 'kit') work(render); };
                        }
                    }
                    this._mountSequenceSpeechFields?.(row, step, { rig, recipe, invalidate, render: () => work(render), status: setStatus,
                        applySequence: () => find('apply').onclick(),
                        alive: () => !closed && recipe.steps.includes(step) && this.objects.getObjectById(rig.root.id) === rig.root });
                    if(step.kind==='handoff'){
                        const timing=[...row.querySelectorAll('.sequence-speech select')].find(select=>[...select.options].some(option=>option.value==='independent'));
                        if(timing){[...timing.options].filter(option=>option.value!=='wait').forEach(option=>option.remove());timing.value='wait';}
                    }
                    if(step.kind!=='handoff')this._mountSequenceHeadTurnFields(row, step, { rig, view, invalidate, render: () => work(render) });
                    this._mountSequencePropFields?.(row, step, { invalidate, status: setStatus, alive: () => !closed && recipe.steps.includes(step) });
                    rows.append(row);
                }
            };
            const prepare = async (lastStep = null) => {
                find('reviewPanel').hidden = true; find('reviewPanel').replaceChildren();
                const start = Number(find('timelineStart').value);
                if (!Number.isFinite(start) || start < 0 || start > 86400) throw Error('Timeline start must be between 0 and 86400 seconds.');
                const before = this._armatureActionSnapshot(rig);
                try { if (action) this._removeArmatureActionTracks(action); clip = await this._compileCharacterSequence(rig,
                    lastStep === null ? recipe : { ...recipe, steps: recipe.steps.slice(0, lastStep + 1) }, { actionId: action?.id }); }
                finally { this._restoreArmatureActionSnapshot(before, true); }
                return clip;
            };
            const sample = value => {
                const start = Number(find('timelineStart').value) * 1000;
                if (!previewSnapshot) { previewSnapshot = this._armatureActionSnapshot(rig); previewAudio = this._snapshotCharacterSequenceAudio?.();
                    if (action) this._removeArmatureActionTracks(action); this._installArmatureAction(clip, start, 'preview');
                    this._installCharacterSequenceSpeech?.(clip, start, action?.id || 'preview', { temporary: true }); }
                const time = start + value * clip.durationMs;
                this.animations.currentTime = time;
                this.animations.applyAnimationsAtTime(time, { timelinePreview: true }); this.objects._resolvePins(); this.stage.requestRender();
                this._previewCharacterSequenceAudio?.(time, previewPlaying, new Set((clip.speech || []).map(entry => entry.audioId)));
                find('seek').value = value; find('time').value = `${(value * clip.durationMs / 1000).toFixed(2)} / ${(clip.durationMs / 1000).toFixed(2)} s`;
            };
            const close = () => { if (busy) return; closed = true; this._cancelMultiPointEdit?.(); cancelDestinationPick?.(); stop(); this._sequenceSpeechAbort?.abort(); disposeDrag?.(); window.removeEventListener('resize', clampDialog); dialog.remove(); this._closeCharacterSequence = null; this._characterSequenceProgress = null; };
            this._closeCharacterSequence = close; this._characterSequenceProgress = setStatus;
            find('close').onclick = close;
            find('minimize').setAttribute('aria-expanded', 'true');
            find('minimize').onclick = () => {
                const minimized = dialog.classList.toggle('minimized'), button = find('minimize');
                button.title = minimized ? 'Restore' : 'Minimize'; button.setAttribute('aria-label', button.title);
                button.setAttribute('aria-expanded', String(!minimized));
                button.innerHTML = `<i class="fas fa-${minimized ? 'window-restore' : 'minus'}"></i>`;
                clampDialog();
            };
            find('stop').onclick = stop;
            find('position').onclick = () => { invalidate(); find('x').value = rig.root.x; find('y').value = rig.root.y; work(render); };
            find('capture').onclick = () => { invalidate(); const live = this._refreshDetectedArmatureReference(rig) || rig;
                if (this._getUniversalCharacterCurrentViewSwitchKey(live) !== recipe.view) { setStatus('Switch the stage character to the sequence starting view before capturing its pose.'); return; }
                recipe.startPose = this._snapshotArmaturePose(live); find('startMode').value = 'captured'; setStatus('Starting pose captured.'); };
            find('add').onclick = () => { if (recipe.steps.length >= 40) return; invalidate(); recipe.steps.push(this._newCharacterSequenceStep()); work(render); };
            for (const key of ['name', 'x', 'y', 'startMode', 'timelineStart']) find(key).onchange = invalidate;
            find('save').onclick = () => work(async () => { this._validateCharacterSequence(recipe); const library = templates(), id = find('templates').value || Utils.generateId('sequence'); library[id] = clone(recipe); localStorage.setItem(storageKey, JSON.stringify(library)); refreshLibrary(); find('templates').value = id; setStatus('Template saved.'); });
            find('load').onclick = () => work(async () => { const entry = templates()[find('templates').value]; if (!entry) throw Error('Choose a template.'); this._validateCharacterSequence(entry); Object.assign(recipe, clone(entry), { x: rig.root.x, y: rig.root.y }); clip = null; await render(); });
            find('delete').onclick = () => work(async () => { const id = find('templates').value; if (!id || !confirm('Delete this sequence template?')) return; const library = templates(); delete library[id]; localStorage.setItem(storageKey, JSON.stringify(library)); refreshLibrary(); });
            find('export').onclick = () => work(async () => {
                this._validateCharacterSequence(recipe);
                const text = JSON.stringify({ format: 'animstage-character-sequence', version: 1, sequence: recipe }, null, 2);
                if (text.length > 20 * 1024 * 1024) throw Error('Template exceeds 20 MB. Use smaller prop images.');
                const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
                const link = document.createElement('a'); link.href = url; link.download = (recipe.name.replace(/[^a-z0-9_-]/gi, '_') || 'sequence') + '.sequence.json';
                document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
                setStatus('Template exported. Audio files remain separate.');
            });
            find('import').onclick = () => {
                const input = document.createElement('input'); input.type = 'file'; input.accept = '.json,application/json';
                input.onchange = () => work(async () => {
                    const file = input.files[0]; if (!file) return;
                    if (file.size > 20 * 1024 * 1024) throw Error('Sequence templates must be under 20 MB.');
                    const imported = this._readCharacterSequenceTemplate(await file.text());
                    if (closed || this.objects.getObjectById(rig.root.id) !== rig.root) return;
                    invalidate(); Object.assign(recipe, imported, { x: rig.root.x, y: rig.root.y }); removedAudio.clear();
                    await render();
                    const missing = this._sequenceSpeechSteps(recipe.steps).filter(step => step.speech?.audioId && !window.app?.audioTimeline?.tracks.some(track => track.audioId === step.speech.audioId));
                    setStatus(missing.length ? `Template imported. Select replacement audio for ${missing.length} step(s), then review timing.` : 'Template imported. Review timing before adding to the timeline.');
                }); input.click();
            };
            const review = () => {
                const data = this._characterSequenceReview(clip, Number(find('timelineStart').value) * 1000), panel = find('reviewPanel');
                panel.replaceChildren(); panel.hidden = false;
                const summary = document.createElement('strong'); summary.textContent = `Duration ${(data.durationMs / 1000).toFixed(2)} s / Timeline end ${(data.endMs / 1000).toFixed(2)} s`; panel.append(summary);
                this._renderSequenceTimingLanes(panel,clip,time=>{cancelAnimationFrame(raf);previewPlaying=false;try{sample(time/clip.durationMs);}catch(error){stop();setStatus(error.message);}},false);
                const table = document.createElement('table'); table.className = 'sequence-review-table';
                const head = table.createTHead().insertRow(); ['Step', 'Start (s)', 'End (s)', ''].forEach(text => { const cell = document.createElement('th'); cell.textContent = text; head.append(cell); });
                const body = table.createTBody();
                for (const entry of data.rows) {
                    const row = body.insertRow();
                    [`${entry.index + 1}. ${entry.name}${entry.speech ? ' / Speech' : ''}${entry.kit ? ' / Props' : ''}`, (entry.absoluteStart / 1000).toFixed(2), (entry.absoluteEnd / 1000).toFixed(2)].forEach(text => row.insertCell().textContent = text);
                    for(const detail of entry.details){const line=document.createElement('div');line.className='sequence-review-detail';line.textContent=detail;row.cells[0].append(line);}
                    row.insertCell().append(icon('crosshairs', `Jump to step ${entry.index + 1}`, () => { cancelAnimationFrame(raf); previewPlaying = false; try { sample(entry.start / clip.durationMs); } catch (error) { stop(); setStatus(error.message); } }));
                }
                panel.append(table);
                for (const text of data.warnings) { const warning = document.createElement('p'); warning.className = 'sequence-review-warning'; warning.textContent = text; panel.append(warning); }
                return data;
            };
            find('review').onclick = () => work(async () => { await prepare(); const data = review(); setStatus(data.warnings.length ? `Review found ${data.warnings.length} warning(s).` : 'Sequence timing checked.'); });
            const play = index => work(async () => { await prepare(index); previewPlaying = true; const offset = index === null ? 0 : clip.schedule[index].start;
                const started = performance.now() - offset;
                const tick = now => { if (closed) return; const value = Math.min(1, (now - started) / clip.durationMs);
                    try { sample(value); } catch (error) { stop(); setStatus(error.message); return; }
                    if (value < 1) raf = requestAnimationFrame(tick); else { previewPlaying = false; window.app?.audioTimeline?.pause(); setStatus('Preview complete. Stop restores the starting state.'); } }; raf = requestAnimationFrame(tick); });
            find('preview').onclick = () => play(null);
            find('seek').oninput = () => { cancelAnimationFrame(raf); previewPlaying = false; if (clip) sample(Number(find('seek').value)); };
            find('apply').onclick = () => work(async () => {
                const start = number(Number(find('timelineStart').value), 0, 86400, 'Timeline start') * 1000;
                await prepare(); const before = this._armatureActionSnapshot(rig), audioBefore = this._snapshotCharacterSequenceAudio?.(), id = action?.id || Utils.generateId('armature-action');
                try { eventBus.emit('history:flush'); if (action) this._removeArmatureActionTracks(action);
                    const installed = this._installArmatureAction(clip, start, id);
                    this._installCharacterSequenceSpeech?.(clip, start, id, { removedAudio }); action = this._getArmatureRecordedAction(id);
                    this._showArmatureStageReceipt(rig, { ...action, tracks: installed });
                } catch (error) { this._restoreArmatureActionSnapshot(before, true); if (audioBefore) this._restoreCharacterSequenceAudio?.(audioBefore); throw error; }
                removedAudio.clear(); window.app?._saveCurrentSceneAudioOnly?.();
                refreshExisting();
                cleanRecipe = JSON.stringify(recipe);
                eventBus.emit('timeline:update'); eventBus.emit('objects:updated'); eventBus.emit('history:push');
                find('apply').innerHTML = '<i class="fas fa-check"></i> Update Timeline'; setStatus(`Sequence added: ${(clip.durationMs / 1000).toFixed(2)} seconds.`);
            });
            refreshLibrary(); await work(render);
            cleanRecipe = JSON.stringify(recipe);
            if (action?.recipe?.speechNeedsRefresh) setStatus('Speech audio was trimmed or replaced. Update Timeline to rebuild lip sync and step timing.');
        }
    });
    const editAction = JointSystem.prototype._editArmatureRecordedAction;
    JointSystem.prototype._editArmatureRecordedAction = async function(id) {
        const action = this._getArmatureRecordedAction(id);
        if (action?.recipe?.headTurnId) {
            const root = this.objects.getObjectById(action.rootId); if (!root) return;
            this.objects.select([root.id]); const rig = this._detectArmature(); if (!rig) return;
            await this._openIndependentSvgHeadTurn(rig);
            const clips = document.querySelector('[data-independent-head-panel] [aria-label="Existing head-turn clip"]');
            if (clips) { clips.value = action.recipe.headTurnId; clips.dispatchEvent(new Event('change')); }
            return;
        }
        if (!action?.recipe?.sequence) return editAction.call(this, id);
        const root = this.objects.getObjectById(action.rootId); if (!root) return;
        this.objects.select([root.id]); const rig = this._detectArmature();
        if (rig) return this._openCharacterSequenceEditor(rig, action.recipe.sequence, action);
    };
})();
