/* Assisted motion capture. Video pixels stay on this device. */
(() => {
    const ids = { 'left-ear':7,'right-ear':8,'left-shoulder':11,'right-shoulder':12,'left-elbow':13,'right-elbow':14,'left-wrist':15,'right-wrist':16,
        'left-hip':23,'right-hip':24,'left-knee':25,'right-knee':26,'left-ankle':27,'right-ankle':28 };
    const chains = [['left-shoulder','left-elbow','left-wrist'],['right-shoulder','right-elbow','right-wrist'],
        ['left-hip','left-knee','left-ankle'],['right-hip','right-knee','right-ankle']];
    const copy = value => JSON.parse(JSON.stringify(value));
    const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
    const derivedNames=['neck','waist','pelvis'];
    const landmarkNames=Object.keys(ids).concat(derivedNames);
    const completeLandmarks=points=>{
        const mix=(name,a,b,t)=>{
            if(points[name]?.corrected||!a||!b)return;
            points[name]={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,visibility:Math.min(a.visibility,b.visibility),estimated:true};
        };
        mix('neck',points['left-shoulder'],points['right-shoulder'],.5);
        mix('pelvis',points['left-hip'],points['right-hip'],.5);
        mix('waist',points.neck,points.pelvis,.7);
        return points;
    };
    class VideoMotionCapture {
        static reduceFittedFrames(frames,duration,tolerance=5,target=0){
            tolerance=Math.max(1,Math.min(25,Number(tolerance)||5));target=Math.max(0,Math.min(100,Math.floor(Number(target)||0)));
            if(frames.length<3)return{frames:copy(frames),original:copy(frames),maxError:0};
            const channels=f=>{
                const values={};
                for(const key of ['jointAngles','partAngles'])for(const [name,value] of Object.entries(f[key]||{}))values[key+name]=value;
                for(const key of ['jointTilts','partTilts'])for(const [name,value] of Object.entries(f[key]||{}))for(const axis of ['x','y'])values[key+name+axis]=value[axis]||0;
                for(const key of ['dx','dy'])values[key]=f[key]||0;
                return values;
            };
            const values=frames.map(channels),names=[...new Set(values.flatMap(Object.keys))];
            const difference=(a,b)=>Math.max(0,...names.map(k=>Math.abs((a[k]||0)-(b[k]||0))));
            const fixed=new Set([0,frames.length-1]);let hold=null;
            frames.forEach((f,i)=>{if(f._videoKeep)fixed.add(i);});
            for(let i=1;i<frames.length;i++){
                const still=difference(values[i],values[i-1])<.5;
                if(still&&hold===null)hold=i-1;
                if(hold!==null&&(!still||i===frames.length-1)){
                    const end=still?i:i-1;if((frames[end].t-frames[hold].t)*duration>=150){fixed.add(hold);fixed.add(end);}hold=null;
                }
            }
            const run=limit=>{
                const kept=new Set(fixed),split=(a,b)=>{
                    let worst=limit,index=-1;
                    for(let i=a+1;i<b;i++){
                        const u=(frames[i].t-frames[a].t)/Math.max(1e-9,frames[b].t-frames[a].t);
                        const error=Math.max(0,...names.map(k=>Math.abs((values[i][k]||0)-((values[a][k]||0)*(1-u)+(values[b][k]||0)*u))));
                        if(error>worst){worst=error;index=i;}
                    }
                    if(index>=0){kept.add(index);split(a,index);split(index,b);}
                };
                const anchors=[...fixed].sort((a,b)=>a-b);for(let i=1;i<anchors.length;i++)split(anchors[i-1],anchors[i]);
                return [...kept].sort((a,b)=>a-b);
            };
            // A requested count may relax precision only within the user's error budget.
            let indices=run(target?tolerance/4:tolerance);
            if(target)for(let step=2;step<=4&&indices.length>target;step++)indices=run(tolerance*step/4);
            let maxError=0;
            for(let j=1;j<indices.length;j++)for(let i=indices[j-1]+1;i<indices[j];i++){
                const a=indices[j-1],b=indices[j],u=(frames[i].t-frames[a].t)/(frames[b].t-frames[a].t);
                maxError=Math.max(maxError,...names.map(k=>Math.abs((values[i][k]||0)-((values[a][k]||0)*(1-u)+(values[b][k]||0)*u))));
            }
            return{frames:indices.map(i=>copy(frames[i])),original:copy(frames),maxError,targetExceeded:target>0&&indices.length>target};
        }
        static frontWalkSignals(frames){
            const raw=frames.map(f=>{
                const p=f.points,legs=['left-ankle','left-hip','right-ankle','right-hip'];
                if(legs.every(n=>Number.isFinite(p[n]?.z)&&!p[n].corrected))return (p['left-ankle'].z-p['left-hip'].z)-(p['right-ankle'].z-p['right-hip'].z);
                return null;
            });
            if(raw.some(v=>v===null))throw new Error('Front walking needs depth landmarks. Retrack the clip, or use Mostly 2D for manually tagged frames.');
            const smoothed=raw.map((_,i)=>{
                let sum=0,weight=0;for(let j=0;j<raw.length;j++){const dt=Math.abs(frames[j].time-frames[i].time);if(dt>.75)continue;const w=Math.exp(-dt*dt/(2*.3*.3));sum+=raw[j]*w;weight+=w;}return sum/weight;
            });
            const sorted=smoothed.slice().sort((a,b)=>a-b),lo=sorted[Math.floor(sorted.length*.1)],hi=sorted[Math.floor((sorted.length-1)*.9)],center=(hi+lo)/2,range=(hi-lo)/2;
            if(range<.025)throw new Error('Forward/backward leg motion is uncertain. Use Mostly 2D or review the source landmarks.');
            return smoothed.map(v=>Math.max(-1,Math.min(1,(v-center)/range)));
        }
        static validSubjectBox(box){return box&&['x','y','width','height'].every(k=>Number.isFinite(box[k]))&&box.x>=0&&box.y>=0&&box.width>=.02&&box.height>=.02&&box.x+box.width<=1.00001&&box.y+box.height<=1.00001;}
        static subjectDescriptor(points){
            const core=[11,12,23,24].map(i=>points[i]);
            if(core.some(p=>!p||![p.x,p.y].every(Number.isFinite)||(p.visibility??0)<.55))return null;
            const center={x:core.reduce((n,p)=>n+p.x,0)/4,y:core.reduce((n,p)=>n+p.y,0)/4};
            const height=(distance(core[0],core[2])+distance(core[1],core[3]))/2;
            if(height<.025)return null;
            const visible=points.filter(p=>p&&(p.visibility??0)>=.55&&Number.isFinite(p.x+p.y));
            const x=Math.max(0,Math.min(...visible.map(p=>p.x))-.04),y=Math.max(0,Math.min(...visible.map(p=>p.y))-.05);
            const right=Math.min(1,Math.max(...visible.map(p=>p.x))+.04),bottom=Math.min(1,Math.max(...visible.map(p=>p.y))+.05);
            const legs=[[23,25,27],[24,26,28]].filter(chain=>chain.every(i=>points[i]?.visibility>=.6)).map(chain=>(distance(points[chain[0]],points[chain[1]])+distance(points[chain[1]],points[chain[2]]))/height);
            const box={x,y,width:right-x,height:bottom-y};if(!this.validSubjectBox(box))return null;
            return{points,center,height,legRatio:legs.length?legs.reduce((a,b)=>a+b,0)/legs.length:null,box};
        }
        static chooseSubject(candidates,box,previous=null,time=0){
            const dt=previous?(time-previous.time||.001):0;
            const expected=previous?{x:previous.center.x+(previous.velocity?.x||0)*Math.max(-.3,Math.min(dt,.3)),y:previous.center.y+(previous.velocity?.y||0)*Math.max(-.3,Math.min(dt,.3))}:{x:box.x+box.width*.5,y:box.y+box.height*.4};
            const ranked=[];
            for(const candidate of candidates){
                if(!candidate)continue;
                const {center,height}=candidate;
                if(!previous){
                    if(center.x<box.x||center.x>box.x+box.width||center.y<box.y||center.y>box.y+box.height)continue;
                    if([11,12,23,24].filter(i=>{const p=candidate.points[i];return p.x>=box.x&&p.x<=box.x+box.width&&p.y>=box.y&&p.y<=box.y+box.height;}).length<3)continue;
                }
                const shift=distance(center,expected)/(previous?.height||Math.max(.05,box.height*.3));
                const scale=previous?Math.abs(Math.log(height/previous.height)):0;
                const proportions=previous?.legRatio&&candidate.legRatio?Math.abs(Math.log(candidate.legRatio/previous.legRatio)):0;
                const appearance=previous?.signature&&candidate.signature?candidate.signature.reduce((sum,n,i)=>sum+Math.abs(n-previous.signature[i]),0)/6:0;
                if(previous&&(shift>Math.min(1.2,.55+Math.abs(dt)*2)||scale>.45||proportions>.6||appearance>.55))continue;
                ranked.push({candidate,score:shift+scale*.6+proportions*.3+appearance});
            }
            ranked.sort((a,b)=>a.score-b.score);
            if(!ranked.length)return{error:'Selected subject lost or obscured.'};
            if(ranked.length>1&&ranked[1].score-ranked[0].score<.35)return{error:'Subjects overlap or the match is ambiguous.'};
            const next={...ranked[0].candidate,time};
            next.velocity=previous?{x:(next.center.x-previous.center.x)/dt,y:(next.center.y-previous.center.y)/dt}:{x:0,y:0};
            if(previous?.signature)next.signature=previous.signature;
            return{subject:next};
        }
        static normalizeView(view){return String(view||'').replace(/-(left|right)$/,':$1');}
        static materializeViews(frames,startView){
            if(!frames.some(f=>f.view))return frames;
            let view=this.normalizeView(startView);return frames.map(f=>{view=f.view||view;return{...f,view};});
        }
        static compactViews(frames,startView){
            let view=this.normalizeView(startView);
            return frames.map(frame=>{const f={...frame},next=f.view||view;if(next===view)delete f.view;else f.view=next;view=next;return f;});
        }
        static viewSegments(frames,startView){
            let view=this.normalizeView(startView);const segments=[];
            for(const frame of frames){
                if(frame.view)view=this.normalizeView(frame.view);
                if(!/^(front|side:(left|right)|front-3q:(left|right))$/.test(view))throw new Error('Mixed-view capture supports front, front 3/4 and side views only.');
                if(segments.at(-1)?.view!==view)segments.push({view,frames:[]});
                segments.at(-1).frames.push(frame);
            }
            for(const segment of segments)if(segment.frames.length<2)throw new Error(`Keep at least two frames in each view segment (${segment.view}).`);
            for(let i=1;i<segments.length;i++){
                const a=segments[i-1].view.split(':')[1],b=segments[i].view.split(':')[1];
                if(a&&b&&a!==b)throw new Error('Add a front-view segment between opposite-facing views. Review reordered view markers.');
            }
            return segments;
        }
        static async reduceKeyPoses(system,session,tolerance=5){
            tolerance=Math.max(1,Math.min(25,Number(tolerance)||5));
            const prior=session._keyPoseResult;
            const unchanged=prior&&JSON.stringify(session.frames)===JSON.stringify(session._keyPoseVariant==='original'?prior.original:prior.frames);
            const original=copy(unchanged?prior.original:session.frames);
            if(original.length<3)throw new Error('At least three keyframes are needed for reduction.');
            const snapshot=system._armatureActionSnapshot(session.armature),rig=session.armature;
            const testSession={...session,errors:[],move:{...session.move}};
            const sample=(frames,t)=>{
                if(session._keyPoseCancel||system._activeArmatureDebuggerSession!==session)throw new Error('Key-pose reduction cancelled.');
                testSession.frames=frames;
                const state=system._resolveArmatureDebuggerPlaybackState(testSession,t);
                const applied=system._applyArmatureDebuggerResolvedState(testSession,state);
                if(!applied?.ok)throw new Error('Could not evaluate captured movement.');
                const points=Object.values(system._getArmatureJointMap(rig)).map(({obj,jt})=>obj.getJointWorldPosition(jt));
                const channels={};
                for(const field of ['angles','partAngles'])for(const [key,value] of Object.entries(state.resolved[field]||{}))channels[field+key]=value;
                for(const field of ['jointTilts','partTilts'])for(const [key,value] of Object.entries(state.resolved[field]||{}))for(const axis of ['x','y'])channels[field+key+axis]=value[axis]||0;
                return{points,channels};
            };
            const error=(a,b)=>({pixels:Math.max(0,...a.points.map((p,i)=>distance(p,b.points[i]))),degrees:Math.max(0,...Object.keys(a.channels).map(k=>Math.abs(a.channels[k]-(b.channels[k]||0))))});
            const pause=async()=>{system._restoreArmatureActionSnapshot(snapshot,true);await new Promise(resolve=>setTimeout(resolve,0));};
            const refs=[],kept=new Set([0,original.length-1]);let evaluations=0;
            try{
                for(let i=0;i<original.length;i++){
                    refs.push(sample(original,original[i].t));
                    if(original[i]._videoKeep)kept.add(i);
                    if(i%24===0)await pause();
                }
                // Preserve sustained holds and significant image-plane reversals.
                let holdStart=null;
                for(let i=1;i<original.length;i++){
                    const e=error(refs[i],refs[i-1]),still=e.pixels<.75&&e.degrees<.5;
                    if(still&&holdStart===null)holdStart=i-1;
                    if(holdStart!==null&&(!still||i===original.length-1)){
                        const end=still?i:i-1;
                        if((original[end].t-original[holdStart].t)*session.move.duration>=150){kept.add(holdStart);kept.add(end);}
                        holdStart=null;
                    }
                    if(i<original.length-1&&refs[i].points.some((p,j)=>{
                        const a=refs[i-1].points[j],b=refs[i+1].points[j],u={x:p.x-a.x,y:p.y-a.y},v={x:b.x-p.x,y:b.y-p.y};
                        return Math.hypot(u.x,u.y)>tolerance&&Math.hypot(v.x,v.y)>tolerance&&u.x*v.x+u.y*v.y<0;
                    }))kept.add(i);
                }
                const mids=[];
                for(let i=0;i<original.length-1;i++){mids.push(sample(original,(original[i].t+original[i+1].t)/2));if(i%24===0)await pause();}
                const split=async(a,b)=>{
                    if(b-a<2)return;
                    const pair=[original[a],original[b]];let worst=1,index=-1;
                    for(let i=a;i<b;i++){
                        for(const [t,reference,candidate] of [[original[i].t,refs[i],i],[(original[i].t+original[i+1].t)/2,mids[i],i===a?i+1:i]]){
                            const e=error(sample(pair,t),reference),ratio=Math.max(e.pixels,e.degrees)/tolerance;
                            if(ratio>worst&&candidate>a&&candidate<b){worst=ratio;index=candidate;}
                            if(++evaluations%48===0)await pause();
                        }
                    }
                    if(index>=0){kept.add(index);await split(a,index);await split(index,b);}
                };
                const anchors=[...kept].sort((a,b)=>a-b);
                for(let i=1;i<anchors.length;i++)await split(anchors[i-1],anchors[i]);
                const frames=[...kept].sort((a,b)=>a-b).map(i=>original[i]);
                let maxPixels=0,maxDegrees=0;
                for(let i=0;i<original.length;i++){
                    const tests=[[original[i].t,refs[i]]];if(i<mids.length)tests.push([(original[i].t+original[i+1].t)/2,mids[i]]);
                    for(const [t,reference] of tests){const e=error(sample(frames,t),reference);maxPixels=Math.max(maxPixels,e.pixels);maxDegrees=Math.max(maxDegrees,e.degrees);}
                    if(i%24===0)await pause();
                }
                if(!Number.isFinite(maxPixels+maxDegrees)||Math.max(maxPixels,maxDegrees)>tolerance+.001)throw new Error('Reduction exceeded the chosen tolerance. Original frames were retained.');
                if(session._keyPoseCancel)throw new Error('Key-pose reduction cancelled.');
                return{original,frames:copy(frames),maxPixels,maxDegrees,tolerance,samples:original.length+mids.length};
            }finally{if(system._activeArmatureDebuggerSession===session)system._restoreArmatureActionSnapshot(snapshot,true);}
        }
        static open(system, rig) {
            if (!system._canUseArmatureDebugger()) return;
            if (system.animations.isPlaying || system.animations.isPaused || system.animations._exportingVideo || system._armatureRecordingBusy) {
                Utils.showToast('Stop playback and recording before motion capture.', 'warning'); return;
            }
            this.active?.close();
            system._closeCapturedViewEditor?.();
            system._closeArmatureMovementDebugger(); system._stopArmatureClipPreview?.(); system._stopArmatureMovement(rig);
            this.active = new VideoMotionCapture(system, rig);
        }
        constructor(system, rig) {
            this.system=system;this.rig=rig;this.frames=[];this.index=0;this.version=0;this.zoom=1;this.sharedCorrections={};this.subjectAnchors=[];this.subjectRevision=0;
            this.view=system._getUniversalCharacterCurrentViewSwitchKey(rig);
            const panel=document.createElement('dialog');this.panel=panel;panel.className='vmc-dialog';
            panel.innerHTML=`<header><strong>Video Motion Capture <small>Experimental</small></strong><button data-action="close" title="Close"><i class="fas fa-times"></i></button></header>
                <div class="vmc-toolbar"><label>Video / GIF <input data-field="file" type="file" accept="video/*,image/gif,.gif"></label>
                <label><input data-field="consent" type="checkbox"> I have permission to use this media</label></div>
                <div class="vmc-layout"><div class="vmc-view"><div class="vmc-toolbar vmc-review"><button data-action="prev" title="Previous landmark frame" aria-label="Previous landmark frame"><i class="fas fa-step-backward"></i> Previous frame</button><output data-field="frame" aria-live="polite">No frames</output><button data-action="next" title="Next landmark frame" aria-label="Next landmark frame"><i class="fas fa-step-forward"></i> Next frame</button></div><div class="vmc-toolbar"><button data-action="zoom-out" title="Zoom out" aria-label="Zoom out"><i class="fas fa-search-minus"></i></button><output data-field="zoom">100%</output><button data-action="zoom-in" title="Zoom in" aria-label="Zoom in"><i class="fas fa-search-plus"></i></button><button data-action="zoom-fit" title="Fit video" aria-label="Fit video"><i class="fas fa-expand"></i></button></div><div class="vmc-canvas-scroll"><canvas width="720" height="720"></canvas></div><video muted playsinline preload="auto"></video>
                <div class="vmc-toolbar"><input data-field="seek" type="range" min="0" max="1" step="0.001" value="0" aria-label="Video time"><output data-field="time">0.00 s</output></div></div>
                <section><label>Movement name<input data-field="name" value="Captured movement" maxlength="120"></label>
                <label>Source view<select data-field="view">${['front','back','side-right','side-left','front-3q-right','front-3q-left','back-3q-right','back-3q-left'].map(v=>`<option>${v}</option>`).join('')}</select></label>
                <div class="vmc-toolbar"><button data-action="subject" aria-pressed="false" title="Draw a box around the intended person's full body"><i class="fas fa-vector-square"></i> Select Subject</button><button data-action="clear-subject" title="Clear the selected subject and captured frames" aria-label="Clear selected subject"><i class="fas fa-times"></i></button><output data-field="subject-state">Automatic (single subject)</output></div>
                <div class="vmc-toolbar"><button data-action="retrack" title="Replace tracking from the reviewed time to End; earlier and later frames stay unchanged"><i class="fas fa-redo"></i> Retrack From Here</button></div>
                <div class="vmc-toolbar"><label>Start (s)<input data-field="start" type="number" min="0" step="0.1" value="0"></label><label>End (s)<input data-field="end" type="number" min="0" step="0.1" value="6"></label></div>
                <label>Samples / second<select data-field="fps"><option>6</option><option selected>12</option><option>24</option></select></label>
                <label>Landmark<select data-field="joint">${landmarkNames.map(n=>`<option>${n}</option>`).join('')}</select></label>
                <label title="Keep this frame during automatic key-pose reduction"><input data-field="keep" type="checkbox"> Keep as key pose</label>
                <label>View from this frame<select data-field="frame-view"><option value="">Continue previous view</option><option value="front">Front</option><option value="front-3q:right">Front 3/4 right</option><option value="front-3q:left">Front 3/4 left</option><option value="side:right">Side right</option><option value="side:left">Side left</option></select></label>
                <label>Turn duration (s)<input data-field="turn" type="number" min="0.2" max="2" step="0.1" value="0.8"></label>
                <label>Turn anchor<select data-field="contact"><option value="root">Body position</option><option value="left">Left foot</option><option value="right">Right foot</option><option value="left-hand">Left hand</option><option value="right-hand">Right hand</option></select></label>
                <div class="vmc-toolbar"><button data-action="copy-edits" title="Hold manually edited landmarks at their current positions across all frames"><i class="fas fa-copy"></i> Apply Edits to All Frames</button><button data-action="undo-copy" title="Undo applying edits to all frames" aria-label="Undo applying edits to all frames"><i class="fas fa-undo"></i></button></div>
                <label><input data-field="mirror" type="checkbox"> Swap anatomical left / right</label>
                <label>Capture limbs<select data-field="scope"><option value="auto">Moving limbs only</option><option value="arms">Both arms</option><option value="right">Right arm</option><option value="left">Left arm</option><option value="all">All limbs</option></select></label>
                <label><input data-field="depth" type="checkbox"> Estimate depth from foreshortening</label>
                <label>Motion fitting<select data-field="fitting"><option value="auto">Automatic</option><option value="2d">Mostly 2D</option><option value="front-walk">Front walking (constrained tilt)</option></select></label>
                <label title="Reduce fitted animation poses; original tracked landmarks remain available"><input data-field="keyposes" type="checkbox"> Keep key poses only</label>
                <label title="Maximum change in fitted angles (degrees) or travel (pixels); higher values keep fewer poses">Key-pose tolerance<input data-field="key-tolerance" type="range" min="1" max="25" step="1" value="5"></label>
                <label title="0 means automatic. More poses are retained when needed to preserve holds and the selected tolerance">Target maximum poses<input data-field="key-target" type="number" min="0" max="100" step="1" value="0"></label>
                <label><input data-field="travel" type="checkbox"> Include whole-body travel (fixed camera)</label>
                <label title="Fits visible 2D head angle relative to the torso; does not infer head turning in depth"><input data-field="head" type="checkbox"> Capture head movement (2D)</label>
                <label title="Fits visible neck-to-waist bending; does not infer torso twisting in depth"><input data-field="torso" type="checkbox"> Capture torso bending (2D)</label>
                <label>Smoothing<input data-field="smooth" type="range" min="0" max="0.9" step="0.1" value="0.3"></label>
                <div class="vmc-toolbar"><button data-action="sheet"><i class="fas fa-th"></i> Frame Sheets</button></div>
                <div class="vmc-toolbar"><button data-action="tag"><i class="fas fa-map-marker-alt"></i> Add Manual Frame</button><button data-action="delete" title="Delete current landmark frame"><i class="fas fa-trash"></i> Delete Frame</button><button data-action="undo-delete" title="Undo frame deletion"><i class="fas fa-undo"></i></button><button data-action="track"><i class="fas fa-crosshairs"></i> Track Clip</button><button data-action="cancel" disabled><i class="fas fa-stop"></i> Cancel</button></div>
                <div class="vmc-toolbar"><button data-action="fit"><i class="fas fa-person"></i> Fit &amp; Open Debugger</button><button data-action="export"><i class="fas fa-download"></i> Export Landmarks</button><button data-action="import"><i class="fas fa-upload"></i> Load Landmarks</button><input data-field="session" type="file" accept=".json,application/json" hidden></div>
                <progress max="1" value="0"></progress><p role="status" aria-live="polite">Select a video. Single subject, fixed camera. Maximum 30 seconds per capture.</p></section></div>`;
            document.body.append(panel);panel.showModal();
            this.canvas=panel.querySelector('canvas');this.ctx=this.canvas.getContext('2d');this.video=panel.querySelector('video');
            this.videoElement=this.video;
            this.viewport=panel.querySelector('.vmc-canvas-scroll');
            this.resizeObserver=new ResizeObserver(()=>this.setZoom(this.zoom));this.resizeObserver.observe(this.viewport);
            panel.querySelector('[data-action="zoom-in"]').onclick=()=>this.setZoom(this.zoom+.25);
            panel.querySelector('[data-action="zoom-out"]').onclick=()=>this.setZoom(this.zoom-.25);
            panel.querySelector('[data-action="zoom-fit"]').onclick=()=>{this.setZoom(1);this.viewport.scrollTo(0,0);};
            panel.querySelector('[data-action="copy-edits"]').onclick=()=>this.copyEditsToAllFrames();
            panel.querySelector('[data-action="undo-copy"]').onclick=()=>{
                if(!this.bulkUndo||this.busyNow||this.reviewSeeking)return;
                this.frames=this.bulkUndo.frames;this.sharedCorrections=this.bulkUndo.sharedCorrections;this.bulkUndo=null;this.draw();this.status('Applied landmark edits undone.');
            };
            this.field('view').value=this.view;
            if (!this.field('view').value) {const option=new Option(this.view,this.view);this.field('view').add(option);this.field('view').value=this.view;}
            panel.addEventListener('cancel',event=>{event.preventDefault();if(this.subjectMode){this.subjectMode=false;this.subjectDraft=null;this.draw();}else this.close();});
            panel.querySelector('[data-action="close"]').onclick=()=>this.close();
            this.field('file').onchange=()=>this.guard(()=>this.load());
            panel.querySelector('[data-action="track"]').onclick=()=>this.guard(()=>this.track());
            panel.querySelector('[data-action="subject"]').onclick=()=>{this.subjectMode=!this.subjectMode;this.subjectDraft=null;this.draw();};
            panel.querySelector('[data-action="clear-subject"]').onclick=()=>{
                if(this.frames.length&&!confirm('Clear this subject and all captured frames? Export landmarks first to keep this capture.'))return;
                this.subjectAnchors=[];this.subjectIssue=null;this.subjectOverlay=null;this.frames=[];this.sharedCorrections={};this.deletedFrameSet=this.bulkUndo=null;this.subjectMode=false;this.draw();
            };
            panel.querySelector('[data-action="retrack"]').onclick=()=>this.guard(()=>this.track({fromHere:true}));
            panel.querySelector('[data-action="sheet"]').onclick=()=>this.openFrameSheet();
            panel.querySelector('[data-action="cancel"]').onclick=()=>{this.version++;this.stopWorker();};
            panel.querySelector('[data-action="tag"]').onclick=()=>this.guard(()=>this.manual());
            panel.querySelector('[data-action="delete"]').onclick=()=>this.guard(async()=>{
                if(this.busyNow||this.reviewSeeking||this.frames.length<=2)return;
                const index=this.frames.findIndex(f=>Math.abs(f.time-this.video.currentTime)<.0001);
                if(index<0)return;
                this.bulkUndo=null;
                this.deletedFrameSet={frames:this.frames.slice(),time:this.video.currentTime};
                this.frames=VideoMotionCapture.materializeViews(this.frames,this.field('view').value);
                this.frames.splice(index,1);
                this.frames=VideoMotionCapture.compactViews(this.frames,this.field('view').value);
                await this.reviewSeek(this.frames[Math.min(index,this.frames.length-1)].time);
                this.status(`${this.frames.length} frames retained. Remaining timestamps are preserved; fitting bridges the gap.`);
            });
            panel.querySelector('[data-action="undo-delete"]').onclick=()=>this.guard(async()=>{
                if(!this.deletedFrameSet||this.busyNow||this.reviewSeeking)return;
                const saved=this.deletedFrameSet;this.deletedFrameSet=null;this.bulkUndo=null;this.frames=saved.frames;await this.reviewSeek(saved.time);
            });
            panel.querySelector('[data-action="fit"]').onclick=()=>this.guard(()=>this.fit());
            panel.querySelector('[data-action="export"]').onclick=()=>this.export();
            panel.querySelector('[data-action="import"]').onclick=()=>this.field('session').click();
            this.field('session').onchange=()=>this.guard(()=>this.import());
            for(const action of ['prev','next']) panel.querySelector(`[data-action="${action}"]`).onclick=()=>this.guard(()=>this.stepReview(action==='prev'?-1:1));
            this.field('seek').onchange=()=>this.guard(()=>this.reviewSeek(Number(this.field('seek').value)));
            this.canvas.onpointerdown=event=>this.subjectMode?this.selectSubject(event):this.edit(event);
            this.field('fps').onchange=()=>this.updateReviewControls();
            this.field('keep').onchange=()=>{const frame=this.frames.find(f=>Math.abs(f.time-this.video.currentTime)<.0001);if(frame)frame.keep=this.field('keep').checked;};
            this.field('frame-view').onchange=()=>{const frame=this.frames.find(f=>Math.abs(f.time-this.video.currentTime)<.0001);if(frame){if(this.field('frame-view').value){frame.view=this.field('frame-view').value;frame.keep=true;}else delete frame.view;this.draw();}};
            for(const name of ['scope','mirror','head','torso','joint'])this.field(name).onchange=()=>this.draw();
            this.updateReviewControls();
        }
        setZoom(value){
            this.zoom=Math.max(.5,Math.min(4,value));
            const maxHeight=innerHeight*(innerWidth<=700?.45:.6);
            const baseWidth=Math.min(this.viewport.clientWidth,maxHeight*this.canvas.width/this.canvas.height);
            this.canvas.style.width=`${baseWidth*this.zoom}px`;
            this.viewport.style.height=`${baseWidth*this.canvas.height/this.canvas.width}px`;
            this.field('zoom').value=`${Math.round(this.zoom*100)}%`;
            this.panel.querySelector('[data-action="zoom-in"]').disabled=this.busyNow||this.zoom>=4;
            this.panel.querySelector('[data-action="zoom-out"]').disabled=this.busyNow||this.zoom<=.5;
        }
        sourceName(name){return this.field('mirror').checked?name.replace(/^(left|right)/,v=>v==='left'?'right':'left'):name;}
        selectedChains(){const scope=this.field('scope').value;return chains.filter(chain=>['auto','all'].includes(scope)||scope==='arms'&&chain[0].endsWith('shoulder')||chain[0]===scope+'-shoulder');}
        requiredLandmarks(){return [...new Set(this.selectedChains().flat().map(n=>this.sourceName(n)).concat(['left-shoulder','right-shoulder','left-hip','right-hip'],this.field('head').checked?['left-ear','right-ear','neck']:[],this.field('torso').checked?derivedNames:[]))];}
        copyEditsToAllFrames(){
            if(this.busyNow||this.reviewSeeking)return;
            const frame=this.frames.find(f=>Math.abs(f.time-this.video.currentTime)<.0001);
            const edits=Object.fromEntries(Object.entries(frame?.points||{}).filter(([,p])=>p.corrected));
            if(!Object.keys(edits).length){this.status('Edit a landmark on the current frame first.');return;}
            if(!window.confirm(`Apply these edited landmarks to every frame: ${Object.keys(edits).join(', ')}? Their positions will stay fixed, including when you track again. Moving landmarks should not be included.`))return;
            this.bulkUndo={frames:copy(this.frames),sharedCorrections:copy(this.sharedCorrections)};
            Object.assign(this.sharedCorrections,copy(edits));
            this.frames.forEach(f=>{Object.assign(f.points,copy(edits));completeLandmarks(f.points);});
            this.deletedFrameSet=null;this.draw();this.status(`Applied ${Object.keys(edits).length} edited landmarks to ${this.frames.length} frames.`);
        }
        field(name){return this.panel.querySelector(`[data-field="${name}"]`);}
        openFrameSheet(){
            if(this.sheet||this.busyNow||this.reviewSeeking||!this.url||!this.frames.length)return;
            const dialog=document.createElement('dialog');dialog.className='vmc-dialog vmc-sheet';
            dialog.innerHTML=`<header><strong>Frame Sheets</strong><button data-sheet="close" title="Close frame sheets" aria-label="Close frame sheets"><i class="fas fa-times"></i></button></header>
                <div class="vmc-toolbar"><label>Frames per sheet<select data-sheet="size"><option>12</option><option selected>24</option><option>48</option><option>96</option></select></label><button data-sheet="prev" title="Previous sheet" aria-label="Previous sheet"><i class="fas fa-chevron-left"></i></button><output data-sheet="page"></output><button data-sheet="next" title="Next sheet" aria-label="Next sheet"><i class="fas fa-chevron-right"></i></button></div>
                <div class="vmc-toolbar"><button data-sheet="select"><i class="fas fa-check-square"></i> Select This Sheet</button><button data-sheet="clear"><i class="fas fa-square"></i> Clear Selection</button><output data-sheet="count"></output><button data-sheet="delete"><i class="fas fa-trash"></i> Delete Selected</button><button data-sheet="undo" title="Undo frame deletion" aria-label="Undo frame deletion"><i class="fas fa-undo"></i></button></div>
                <div class="vmc-toolbar"><button data-sheet="duplicate"><i class="fas fa-copy"></i> Duplicate Selected</button><button data-sheet="first"><i class="fas fa-step-backward"></i> Move to Start</button><button data-sheet="last"><i class="fas fa-step-forward"></i> Move to End</button></div>
                <p data-sheet="status" role="status"></p><div class="vmc-sheet-grid"></div><video muted playsinline preload="auto"></video>`;
            document.body.append(dialog);dialog.showModal();
            const video=dialog.querySelector('video'),get=name=>dialog.querySelector(`[data-sheet="${name}"]`);
            const state={dialog,video,page:0,selected:new Set(),loading:false,cancel:null};this.sheet=state;
            const close=()=>{if(this.sheet!==state)return;this.sheet=null;state.cancel?.();video.pause();video.removeAttribute('src');video.load();dialog.remove();this.draw();};
            state.close=close;get('close').onclick=close;dialog.oncancel=e=>{e.preventDefault();close();};
            const waitFor=(event,action)=>new Promise((resolve,reject)=>{
                let timer,callback,settled=false;
                const useCallback=event==='seeked'&&typeof video.requestVideoFrameCallback==='function';
                const done=error=>{if(settled)return;settled=true;clearTimeout(timer);if(callback!==undefined)video.cancelVideoFrameCallback(callback);video.removeEventListener(event,ready);video.removeEventListener('error',failed);state.cancel=null;error?reject(error):resolve();};
                const ready=()=>done(),failed=()=>done(new Error('Could not decode this video frame.'));
                state.cancel=()=>done(new Error('Frame sheet closed.'));
                if(useCallback)callback=video.requestVideoFrameCallback(ready);else video.addEventListener(event,ready,{once:true});video.addEventListener('error',failed,{once:true});
                timer=setTimeout(()=>done(new Error('Video frame decoding timed out. Try reopening Frame Sheets.')),8000);action();
            });
            const update=()=>{
                const size=Number(get('size').value),pages=Math.max(1,Math.ceil(this.frames.length/size));
                get('page').value=`Sheet ${state.page+1} / ${pages}`;get('count').value=`${state.selected.size} selected / ${this.frames.length}`;
                get('prev').disabled=state.loading||state.page===0;get('next').disabled=state.loading||state.page>=pages-1;
                get('size').disabled=state.loading;get('select').disabled=state.loading;get('clear').disabled=!state.selected.size;
                get('delete').disabled=state.loading||!state.selected.size||this.frames.length-state.selected.size<2;
                get('undo').disabled=state.loading||!this.deletedFrameSet;
                for(const name of ['duplicate','first','last'])get(name).disabled=state.loading||!state.selected.size;
                dialog.querySelectorAll('input[type=checkbox]').forEach(input=>{input.checked=state.selected.has(Number(input.dataset.time));});
            };
            const render=async()=>{
                if(state.loading||this.sheet!==state)return;
                state.loading=true;state.page=Math.min(state.page,Math.max(0,Math.ceil(this.frames.length/Number(get('size').value))-1));update();
                const grid=dialog.querySelector('.vmc-sheet-grid');grid.replaceChildren();
                const size=Number(get('size').value),start=state.page*size,frames=this.frames.slice(start,start+size);
                let sheetView=VideoMotionCapture.normalizeView(this.field('view').value);
                this.frames.slice(0,start).forEach(f=>{if(f.view)sheetView=f.view;});
                try{
                    if(!this.gif&&video.readyState<2)await waitFor('loadeddata',()=>{video.src=this.url;});
                    for(const [i,frame] of frames.entries()){
                        if(this.sheet!==state)return;
                        const sourceTime=frame.sourceTime??frame.time;
                        if(!this.gif&&Math.abs(video.currentTime-sourceTime)>.00001)await waitFor('seeked',()=>{video.currentTime=sourceTime;});
                        if(this.sheet!==state)return;
                        const label=document.createElement('label');label.className='vmc-sheet-frame';
                        label.draggable=true;label.title='Drag before another frame; use Move to End for the final position';
                        label.ondragstart=e=>{if(state.loading){e.preventDefault();return;}state.dragTime=frame.time;e.dataTransfer.setData('text/plain',String(frame.time));e.dataTransfer.effectAllowed='move';};
                        label.ondragover=e=>{if(!state.loading&&state.dragTime!==undefined)e.preventDefault();};
                        label.ondrop=e=>{e.preventDefault();if(state.loading||state.dragTime===undefined)return;const from=state.dragTime;state.dragTime=undefined;void this.guard(()=>editFrames('move',frame.time,new Set([from])));};
                        label.ondragend=()=>{state.dragTime=undefined;};
                        const source=this.gif?this.gifFrameAt(sourceTime).canvas:video;
                        const width=this.video.videoWidth,height=this.video.videoHeight;
                        const canvas=document.createElement('canvas'),scale=Math.min(240/width,180/height);canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));
                        canvas.getContext('2d').drawImage(source,0,0,canvas.width,canvas.height);
                        if(frame.subjectBox){const b=frame.subjectBox,ctx=canvas.getContext('2d');ctx.strokeStyle='#34d399';ctx.lineWidth=2;ctx.strokeRect(b.x*canvas.width,b.y*canvas.height,b.width*canvas.width,b.height*canvas.height);}
                        const input=document.createElement('input');input.type='checkbox';input.dataset.time=String(frame.time);input.checked=state.selected.has(frame.time);
                        input.setAttribute('aria-label',`Select frame ${start+i+1} at ${frame.time.toFixed(3)} seconds`);
                        input.onchange=()=>{input.checked?state.selected.add(frame.time):state.selected.delete(frame.time);update();};
                        if(frame.view)sheetView=frame.view;
                        const caption=document.createElement('span');caption.textContent=`${start+i+1} | ${frame.time.toFixed(3)} s${this.frames.some(f=>f.view)?` | ${sheetView}`:''}${frame.sourceTime!==undefined?` | source ${sourceTime.toFixed(3)} s`:''}`;
                        label.append(canvas,input,caption);grid.append(label);get('status').textContent=`Loading frames ${i+1} / ${frames.length}`;
                    }
                    get('status').textContent='';
                }catch(error){if(this.sheet===state)get('status').textContent=error.message;}
                finally{state.loading=false;if(this.sheet===state)update();}
            };
            get('prev').onclick=()=>{state.page--;void render();};get('next').onclick=()=>{state.page++;void render();};
            get('size').onchange=()=>{state.page=0;void render();};
            get('select').onclick=()=>{const size=Number(get('size').value);this.frames.slice(state.page*size,(state.page+1)*size).forEach(f=>state.selected.add(f.time));update();};
            get('clear').onclick=()=>{state.selected.clear();update();};
            // Reordering changes pose content at time slots, not the clip duration.
            const editFrames=async(action,target,selection=state.selected)=>{
                if(state.loading||!selection.size)return;
                const original=this.frames,chosen=original.filter(f=>selection.has(f.time));
                if(!chosen.length)return;
                let ordered;
                if(action==='duplicate')ordered=original.flatMap(f=>selection.has(f.time)?[f,{...copy(f),keep:true}]:[f]);
                else{
                    if(selection.has(target))return;
                    ordered=original.filter(f=>!selection.has(f.time));
                    const at=target==='start'?0:target==='end'?ordered.length:ordered.findIndex(f=>f.time===target);
                    if(at<0)return;ordered.splice(at,0,...chosen);
                }
                this.deletedFrameSet={frames:copy(original),time:this.video.currentTime};this.bulkUndo=null;
                const start=original[0].time,end=original.at(-1).time;
                let inherited=VideoMotionCapture.normalizeView(this.field('view').value);const views=new Map();
                original.forEach(f=>{inherited=f.view||inherited;views.set(f.time,inherited);});
                this.frames=ordered.map((f,i)=>({...copy(f),...(original.some(f=>f.view)?{view:views.get(f.time)}:{}),sourceTime:f.sourceTime??f.time,manual:true,time:action==='duplicate'?start+(end-start)*i/(ordered.length-1):original[i].time}));
                this.frames=VideoMotionCapture.compactViews(this.frames,this.field('view').value);
                state.selected.clear();
                if(action==='duplicate')ordered.forEach((f,i)=>{if(!original.includes(f))state.selected.add(this.frames[i].time);});
                this.index=0;state.loading=true;update();
                try{await this.reviewSeek(this.frames[0].time);}finally{state.loading=false;}
                await render();try{if(this.frames.some(f=>f.view))VideoMotionCapture.viewSegments(this.frames,this.field('view').value);this.status('Frame order updated. Clip duration retained; duplication redistributes time slots. Review transitions in the debugger.');}catch(error){this.status(error.message);}
            };
            get('duplicate').onclick=()=>this.guard(()=>editFrames('duplicate'));
            get('first').onclick=()=>this.guard(()=>editFrames('move','start'));
            get('last').onclick=()=>this.guard(()=>editFrames('move','end'));
            get('delete').onclick=()=>this.guard(async()=>{
                if(state.loading||!state.selected.size||this.frames.length-state.selected.size<2)return;
                if(!window.confirm(`Delete ${state.selected.size} selected frames? At least two frames will remain. Remaining timestamps are preserved.`))return;
                state.loading=true;update();
                this.deletedFrameSet={frames:this.frames.slice(),time:this.video.currentTime};this.bulkUndo=null;
                this.frames=VideoMotionCapture.materializeViews(this.frames,this.field('view').value).filter(f=>!state.selected.has(f.time));state.selected.clear();
                this.frames=VideoMotionCapture.compactViews(this.frames,this.field('view').value);
                this.index=Math.min(this.index,this.frames.length-1);
                try{await this.reviewSeek(this.frames[this.index].time);}finally{state.loading=false;if(this.sheet===state)update();}
                await render();this.status(`${this.frames.length} frames retained after bulk deletion.`);
            });
            get('undo').onclick=()=>this.guard(async()=>{
                if(state.loading||!this.deletedFrameSet)return;
                state.loading=true;update();
                const saved=this.deletedFrameSet;this.deletedFrameSet=null;this.bulkUndo=null;this.frames=saved.frames;state.selected.clear();
                try{await this.reviewSeek(saved.time);}finally{state.loading=false;if(this.sheet===state)update();}
                await render();
            });
            void render();
        }
        status(text){this.panel.querySelector('[role="status"]').textContent=text;}
        async guard(fn){try{await fn();}catch(error){if(this.panel.isConnected)this.status(error.message || 'Capture failed');}}
        stopWorker(){this.worker?.terminate();this.worker=null;this.rejectPending?.(new Error('Capture cancelled'));this.rejectPending=null;}
        close(){this.sheet?.close();this.version++;this.stopWorker();this.resizeObserver?.disconnect();this.videoElement.pause();this.videoElement.removeAttribute('src');this.videoElement.load();this.releaseGif();if(this.url)URL.revokeObjectURL(this.url);this.panel.remove();if(VideoMotionCapture.active===this)VideoMotionCapture.active=null;}
        releaseGif(){if(this.gif){this.gif.frames.forEach(f=>{f.canvas.width=f.canvas.height=1;});if(this.video!==this.videoElement)this.video.width=this.video.height=1;}this.gif=null;this.video=this.videoElement;}
        gifFrameAt(time){return this.gif.frames.find(f=>time<f.end-.0000001)||this.gif.frames.at(-1);}
        async trackingBitmap(box=null){
            if(!this.gif&&!box)return createImageBitmap(this.video);
            box||={x:0,y:0,width:1,height:1};
            const w=this.video.videoWidth,h=this.video.videoHeight,scale=Math.min(1,1024/Math.max(w*box.width,h*box.height));
            const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(w*box.width*scale));canvas.height=Math.max(1,Math.round(h*box.height*scale));
            const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(this.video,box.x*w,box.y*h,box.width*w,box.height*h,0,0,canvas.width,canvas.height);
            try{return await createImageBitmap(canvas);}finally{canvas.width=canvas.height=1;}
        }
        busy(value){this.busyNow=value;this.panel.querySelectorAll('input,select,button').forEach(el=>{el.disabled=value;});this.panel.querySelector('[data-action="close"]').disabled=false;this.panel.querySelector('[data-action="cancel"]').disabled=!value;this.updateReviewControls();}
        updateReviewControls(){
            const time=this.video.currentTime||0,blocked=this.busyNow||this.reviewSeeking||!this.url;
            const reviewFrames=this.frames.length?this.frames:this.gif?.frames||[];
            const prev=reviewFrames.length?reviewFrames.some(f=>f.time<time-.00001):time>0;
            const next=reviewFrames.length?reviewFrames.some(f=>f.time>time+.00001):time<this.video.duration-.001;
            this.panel.querySelector('[data-action="prev"]').disabled=!!blocked||!prev;
            this.panel.querySelector('[data-action="next"]').disabled=!!blocked||!next;
            this.field('seek').disabled=!!blocked;
            for(const name of ['tag','delete','fit','track','import'])this.panel.querySelector(`[data-action="${name}"]`).disabled=!!(this.busyNow||this.reviewSeeking);
            this.field('file').disabled=!!(this.busyNow||this.reviewSeeking);
            const exact=this.frames.findIndex(f=>Math.abs(f.time-time)<.0001);
            this.panel.querySelector('[data-action="delete"]').disabled=!!(blocked||exact<0||this.frames.length<=2);
            this.panel.querySelector('[data-action="undo-delete"]').disabled=!!(blocked||!this.deletedFrameSet);
            this.panel.querySelector('[data-action="copy-edits"]').disabled=!!(blocked||exact<0||!Object.values(this.frames[exact]?.points||{}).some(p=>p.corrected));
            this.panel.querySelector('[data-action="undo-copy"]').disabled=!!(blocked||!this.bulkUndo);
            this.panel.querySelector('[data-action="sheet"]').disabled=!!(blocked||!this.frames.length);
            this.field('keep').disabled=!!(blocked||exact<0);this.field('keep').checked=!!this.frames[exact]?.keep;
            this.field('fps').disabled=!!(this.busyNow||this.gif);
            this.field('fps').title=this.gif?'GIF capture uses original frame timestamps':'Video samples per second';
            for(const name of ['subject','retrack'])this.panel.querySelector(`[data-action="${name}"]`).disabled=!!blocked;
            this.panel.querySelector('[data-action="clear-subject"]').disabled=!!blocked||!this.subjectAnchors.length;
            this.panel.querySelector('[data-action="subject"]').setAttribute('aria-pressed',String(!!this.subjectMode));
            this.field('subject-state').value=this.subjectMode?'Draw subject box':this.subjectIssue?'Subject review needed':this.subjectAnchors.length?'Selected subject':'Automatic (single subject)';
            this.field('frame-view').disabled=!!(blocked||exact<0);this.field('frame-view').value=this.frames[exact]?.view||'';
            this.field('frame').value=this.frames.length?(exact>=0?`Frame ${exact+1} / ${this.frames.length}`:`Between frames (${this.frames.length})`):(this.gif?`GIF frame ${this.gif.frames.indexOf(this.gifFrameAt(time))+1} / ${this.gif.frames.length}`:this.url?`Sample step: 1/${this.field('fps').value} s`:'No frames');
        }
        async reviewSeek(time){
            if(this.reviewSeeking||this.busyNow)return;
            this.reviewSeeking=true;this.updateReviewControls();
            try{await this.seek(time);}finally{this.reviewSeeking=false;this.updateReviewControls();}
        }
        async stepReview(direction){
            const time=this.video.currentTime;
            if(this.frames.length){
                const target=direction<0?[...this.frames].reverse().find(f=>f.time<time-.00001):this.frames.find(f=>f.time>time+.00001);
                if(target)await this.reviewSeek(target.time);
            }else if(this.gif){const target=direction<0?[...this.gif.frames].reverse().find(f=>f.time<time-.00001):this.gif.frames.find(f=>f.time>time+.00001);if(target)await this.reviewSeek(target.time);}
            else await this.reviewSeek(time+direction/Number(this.field('fps').value));
        }
        async load(){
            const file=this.field('file').files[0];if(!file)return;
            if(file.size>250*1024*1024)throw new Error('Video must be under 250 MB.');
            const isGif=file.type==='image/gif'||/\.gif$/i.test(file.name);
            if(isGif&&file.size>25*1024*1024)throw new Error('GIF must be under 25 MB.');
            const token=++this.version;this.stopWorker();this.sheet?.close();this.videoElement.pause();this.videoElement.removeAttribute('src');this.videoElement.load();this.releaseGif();if(this.url)URL.revokeObjectURL(this.url);
            this.source={name:file.name,size:file.size};this.field('consent').checked=false;
            this.subjectAnchors=[];this.subjectOverlay=this.subjectIssue=this.subjectDraft=null;this.subjectMode=false;
            this.url=URL.createObjectURL(file);this.frames=[];this.deletedFrameSet=null;this.bulkUndo=null;this.sharedCorrections={};
            const sourceUrl=this.url;
            this.busy(true);this.status(isGif?'Decoding GIF frames...':'Loading video...');
            try{
                if(isGif){
                    const bytes=await file.arrayBuffer();await new Promise(resolve=>setTimeout(resolve,0));
                    if(token!==this.version)throw new Error('Loading cancelled.');
                    const decoded=GIFDecoder.decode(bytes,{maxFrames:1000,maxFramePixels:4000000,maxTotalPixels:32000000});
                    if(decoded.frames.length<2)throw new Error('This GIF has only one frame. Choose an animated GIF.');
                    let ms=0;decoded.frames.forEach(f=>{f.time=ms/1000;ms+=f.delay;f.end=ms/1000;});this.gif=decoded;
                    // A drawable canvas with the existing media metadata contract keeps
                    // fitting and landmark sessions identical for video and GIF sources.
                    const surface=document.createElement('canvas');surface.width=decoded.width;surface.height=decoded.height;
                    Object.assign(surface,{videoWidth:decoded.width,videoHeight:decoded.height,duration:ms/1000,currentTime:0,readyState:2});this.video=surface;
                    surface.getContext('2d').drawImage(decoded.frames[0].canvas,0,0);
                }else{
                    this.video.src=this.url;
                    await new Promise((resolve,reject)=>{this.video.onloadeddata=resolve;this.video.onerror=()=>reject(new Error('This browser could not decode the video. Try MP4 H.264.'));});
                }
                if(token!==this.version)throw new Error('Loading cancelled.');
            if(!Number.isFinite(this.video.duration))throw new Error('Video duration is unavailable.');
            this.canvas.width=720;this.canvas.height=Math.round(720*this.video.videoHeight/this.video.videoWidth);
            this.setZoom(1);this.viewport.scrollTo(0,0);
            this.field('seek').max=this.video.duration;this.field('end').value=Math.min(30,this.video.duration);this.field('start').value=0;
            this.draw();this.status(this.gif?`GIF ready: ${this.gif.frames.length} frames, ${this.video.duration.toFixed(2)} seconds, one loop. ${Math.min(this.video.videoWidth,this.video.videoHeight)<160||this.gif.frames.length<4?'Low-detail source: tracking may need manual corrections.':''}`:`${this.video.duration.toFixed(2)} seconds. Local processing only; video is not uploaded. Drag landmarks after tracking, or add manual frames.`);
            }catch(error){if(this.url===sourceUrl){this.releaseGif();URL.revokeObjectURL(this.url);this.url=null;this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);}throw error;}
            finally{if(this.panel.isConnected&&(this.url===sourceUrl||!this.url))this.busy(false);}
        }
        async seek(time){
            if(!this.url)throw new Error('Select a video first.');
            time=Math.max(0,Math.min(this.video.duration-.001,time));
            if(this.gif){this.video.currentTime=time;const ctx=this.video.getContext('2d');ctx.clearRect(0,0,this.video.width,this.video.height);ctx.drawImage(this.gifFrameAt(time).canvas,0,0);}
            else if(Math.abs(this.video.currentTime-time)>.00001){
                await new Promise((resolve,reject)=>{
                    let handle;const timer=setTimeout(()=>{if(handle)this.video.cancelVideoFrameCallback(handle);reject(new Error('Video frame decoding timed out.'));},8000);
                    if(this.video.requestVideoFrameCallback)handle=this.video.requestVideoFrameCallback(()=>{clearTimeout(timer);resolve();});
                    else this.video.onseeked=()=>{clearTimeout(timer);requestAnimationFrame(()=>requestAnimationFrame(resolve));};
                    this.video.currentTime=time;
                });
            }
            this.field('seek').value=time;this.field('time').value=`${time.toFixed(2)} s`;
            if(this.frames.length)this.index=this.frames.reduce((best,f,i)=>Math.abs(f.time-time)<Math.abs(this.frames[best].time-time)?i:best,0);
            this.draw();
        }
        draw(){
            this.updateReviewControls();
            const c=this.ctx,w=this.canvas.width,h=this.canvas.height;c.clearRect(0,0,w,h);if(this.video.readyState>=2)c.drawImage(this.video,0,0,w,h);
            const time=this.video.currentTime||0,review=this.frames.find(f=>Math.abs(f.time-time)<.06);
            const anchor=[...this.subjectAnchors].reverse().find(a=>a.time<=time+.001)||this.subjectAnchors[0];
            const box=this.subjectDraft||(this.busyNow?this.subjectOverlay:null)||review?.subjectBox||anchor?.box;
            if(box){c.save();c.strokeStyle=this.subjectIssue?'#ffbf47':'#34d399';c.lineWidth=3;c.setLineDash(this.subjectDraft?[8,4]:[]);c.strokeRect(box.x*w,box.y*h,box.width*w,box.height*h);c.restore();}
            const frame=this.frames[this.index];if(!frame || Math.abs(frame.time-this.video.currentTime)>.06)return;
            completeLandmarks(frame.points);
            const selected=new Set(this.requiredLandmarks());
            for(const chain of chains.concat([['neck','waist','pelvis']]))for(let i=0;i<2;i++){const a=frame.points[chain[i]],b=frame.points[chain[i+1]];if(!a||!b)continue;c.globalAlpha=selected.has(chain[i])&&selected.has(chain[i+1])?1:.2;c.strokeStyle=Math.min(a.visibility,b.visibility)<.6?'#ef4444':'#14b88b';c.lineWidth=3;c.beginPath();c.moveTo(a.x*w,a.y*h);c.lineTo(b.x*w,b.y*h);c.stroke();}
            for(const [name,p] of Object.entries(frame.points)){c.globalAlpha=selected.has(name)||name===this.field('joint').value?1:.2;c.fillStyle=name===this.field('joint').value?'#fff':'#ffcf35';c.beginPath();c.arc(p.x*w,p.y*h,6,0,Math.PI*2);c.fill();}
            c.globalAlpha=1;
            c.font='14px sans-serif';c.fillStyle='#fff';c.strokeStyle='#111';c.lineWidth=3;
            for(const name of derivedNames){const p=frame.points[name];if(!p)continue;const label=name+(p.estimated?' (estimated)':'');c.strokeText(label,p.x*w+9,p.y*h-8);c.fillText(label,p.x*w+9,p.y*h-8);}
        }
        manual(){
            if(!this.url)throw new Error('Select a video first.');
            this.bulkUndo=null;
            let frame=this.frames.find(f=>Math.abs(f.time-this.video.currentTime)<.04);
            if(!frame){
                const points={};for(const [name] of Object.entries(ids)){const left=name.startsWith('left');const joint=name.split('-')[1];points[name]={x:left?.6:.4,y:({ear:.17,shoulder:.28,elbow:.43,wrist:.56,hip:.55,knee:.73,ankle:.91})[joint],visibility:0};}
                frame={time:this.video.currentTime,points,manual:true};this.frames.push(frame);this.frames.sort((a,b)=>a.time-b.time);
            }
            this.index=this.frames.indexOf(frame);this.draw();this.status('Select a landmark and click its position, or drag an existing point. Yellow points need review; manual placements are retained when tracking.');
        }
        edit(event){
            if(this.busyNow||this.reviewSeeking)return;
            const frame=this.frames[this.index];if(!frame||Math.abs(frame.time-this.video.currentTime)>.06)return;
            const rect=this.canvas.getBoundingClientRect(),pos=e=>({x:Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width)),y:Math.max(0,Math.min(1,(e.clientY-rect.top)/rect.height))});
            const p=pos(event),nearest=Object.keys(frame.points).sort((a,b)=>distance(frame.points[a],p)-distance(frame.points[b],p)).find(n=>Math.hypot((frame.points[n].x-p.x)*rect.width,(frame.points[n].y-p.y)*rect.height)<14);
            const name=nearest||this.field('joint').value;this.field('joint').value=name;
            const update=e=>{this.bulkUndo=null;frame.points[name]={...pos(e),visibility:1,corrected:true};completeLandmarks(frame.points);frame.manual=true;this.draw();};
            this.canvas.setPointerCapture(event.pointerId);update(event);this.canvas.onpointermove=update;
            this.canvas.onpointerup=this.canvas.onpointercancel=()=>{this.canvas.onpointermove=null;};
        }
        selectSubject(event){
            if(this.busyNow||this.reviewSeeking||!this.url)return;
            const rect=this.canvas.getBoundingClientRect(),point=e=>({x:Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width)),y:Math.max(0,Math.min(1,(e.clientY-rect.top)/rect.height))}),start=point(event);
            const update=e=>{const p=point(e);this.subjectDraft={x:Math.min(start.x,p.x),y:Math.min(start.y,p.y),width:Math.abs(p.x-start.x),height:Math.abs(p.y-start.y)};this.draw();};
            this.canvas.setPointerCapture(event.pointerId);update(event);this.canvas.onpointermove=update;
            this.canvas.onpointercancel=()=>{this.canvas.onpointermove=null;this.subjectDraft=null;this.draw();};
            this.canvas.onpointerup=e=>{
                update(e);this.canvas.onpointermove=null;const box=this.subjectDraft;this.subjectDraft=null;
                if(!VideoMotionCapture.validSubjectBox(box)){this.status('Draw a larger box around the full character.');this.draw();return;}
                if(!this.subjectAnchors.length&&this.frames.length){
                    if(!confirm('Selecting a subject clears the previous capture. Export its landmarks first to keep it. Continue?')){this.draw();return;}
                    this.frames=[];this.sharedCorrections={};this.deletedFrameSet=this.bulkUndo=null;
                }
                const time=this.video.currentTime;
                this.subjectAnchors=this.subjectAnchors.filter(a=>Math.abs(a.time-time)>.001).concat({time,box}).sort((a,b)=>a.time-b.time);
                this.subjectRevision++;this.sharedCorrections={};this.deletedFrameSet=this.bulkUndo=null;
                const pending=this.subjectIssue;
                this.subjectMode=false;this.subjectIssue={time:Math.min(time,pending?.time??time),end:Math.max(time,Number(this.field('end').value),pending?.end??time),reason:'Selection changed; retrack before fitting.'};
                this.draw();this.status(`Subject selected at ${time.toFixed(2)} s. Track Clip, or Retrack From Here to replace only this section.`);
            };
        }
        subjectSignature(points){
            const core=[11,12,23,24].map(i=>points[i]),x=Math.max(0,Math.min(...core.map(p=>p.x))),y=Math.max(0,Math.min(...core.map(p=>p.y)));
            const w=Math.max(.01,Math.min(1-x,Math.max(...core.map(p=>p.x))-x)),h=Math.max(.01,Math.min(1-y,Math.max(...core.map(p=>p.y))-y));
            const canvas=document.createElement('canvas');canvas.width=canvas.height=16;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.fillStyle='#fff';ctx.fillRect(0,0,16,16);
            ctx.drawImage(this.video,x*this.video.videoWidth,y*this.video.videoHeight,w*this.video.videoWidth,h*this.video.videoHeight,0,0,16,16);
            const pixels=ctx.getImageData(0,0,16,16).data,histogram=Array(12).fill(0);
            for(let i=0;i<pixels.length;i+=4)for(let c=0;c<3;c++)histogram[c*4+Math.min(3,Math.floor(pixels[i+c]/64))]+=1/256;
            return histogram;
        }
        async scanSubject(box,previous,time){
            const padding=.15,x=Math.max(0,box.x-box.width*padding),y=Math.max(0,box.y-box.height*padding);
            const crop={x,y,width:Math.min(1,box.x+box.width*(1+padding))-x,height:Math.min(1,box.y+box.height*(1+padding))-y};
            const poses=await this.detect(await this.trackingBitmap(crop),{multiple:true});
            const candidates=poses.map(pose=>VideoMotionCapture.subjectDescriptor(pose.map(p=>({...p,x:crop.x+p.x*crop.width,y:crop.y+p.y*crop.height,z:Number.isFinite(p.z)?p.z*crop.width:undefined})))).filter(Boolean);
            candidates.forEach(candidate=>candidate.signature=this.subjectSignature(candidate.points));
            return VideoMotionCapture.chooseSubject(candidates,box,previous,time);
        }
        detect(bitmap,options={}){
            if(!this.worker)this.worker=new Worker('js/video-motion-worker.js?v='+encodeURIComponent(window.__appAssetVersion||'dev'));
            return new Promise((resolve,reject)=>{
                const timer=setTimeout(()=>{this.stopWorker();reject(new Error('Pose analysis timed out. Try a shorter clip.'));},45000);
                this.rejectPending=error=>{clearTimeout(timer);reject(error);};
                this.worker.onmessage=({data})=>{clearTimeout(timer);this.rejectPending=null;data.error?reject(new Error(data.error)):resolve(options.multiple?(data.poses||[]):data.points);};
                this.worker.onerror=()=>{clearTimeout(timer);this.worker?.terminate();this.worker=null;this.rejectPending=null;reject(new Error('Pose worker failed. Manual tagging remains available.'));};
                this.worker.postMessage({bitmap,multiple:options.multiple===true,base:new URL('assets/character-vision/',location.href).href},[bitmap]);
            });
        }
        async trackSubject(start,end,fps){
            const original=this.frames.slice(),oldIssue=this.subjectIssue;
            if(original.some(f=>f.sourceTime!==undefined&&Math.abs(f.sourceTime-f.time)>.001))throw new Error('Retrack before rearranging captured frames, or undo the rearrangement first.');
            const anchors=this.subjectAnchors.filter(a=>a.time>=start&&a.time<end);
            const prior=[...original].reverse().find(f=>f.time<=start&&start-f.time<.25&&f.subjectBox&&f.subjectRevision===this.subjectRevision);
            if(!anchors.length&&!prior)throw new Error('Select the subject at the start of this range before tracking.');
            const seedTime=anchors[0]?.time??start,seedBox=anchors[0]?.box??prior.subjectBox;
            const rawTimes=this.gif?[start,...this.gif.frames.map(f=>f.time).filter(t=>t>start&&t<end),end-.001]:Array.from({length:Math.ceil((end-start)*fps)+1},(_,i)=>Math.min(end-.001,start+i/fps));
            const protectedTimes=original.filter(f=>f.time>=start&&f.time<end&&(f.manual||f.keep||f.view)).map(f=>f.time);
            const times=[...new Set([...rawTimes,...anchors.map(a=>a.time),...protectedTimes,seedTime].map(t=>Math.round(t*1e6)/1e6))].sort((a,b)=>a-b);
            if(times.length>1000)throw new Error('Choose a shorter range with at most 1000 samples.');
            const token=++this.version,accepted=new Map();let stopped=null,lastTime=seedTime,seed=null;
            this.busy(true);this.subjectMode=false;this.subjectDraft=null;this.bulkUndo=this.deletedFrameSet=null;
            const visit=async(time,previous,box)=>{
                if(token!==this.version)throw new Error('Tracking cancelled. Completed subject samples retained.');
                lastTime=time;await this.seek(time);
                const result=await this.scanSubject(box,previous,time);
                if(token!==this.version)throw new Error('Tracking cancelled. Completed subject samples retained.');
                if(!result.subject){stopped={time,end,reason:result.error};return null;}
                const subject=result.subject,points={};
                Object.entries(ids).forEach(([name,id])=>{const p=subject.points[id];if(p)points[name]={x:p.x,y:p.y,...(Number.isFinite(p.z)?{z:p.z}:{}),visibility:p.visibility??0};});
                const old=original.find(f=>Math.abs(f.time-time)<.00001),frame={time,points:completeLandmarks(points),subjectBox:copy(subject.box),subjectSignature:subject.signature,subjectRevision:this.subjectRevision};
                if(old){if(old.view)frame.view=old.view;frame.keep=!!old.keep;
                    if(old.subjectRevision===this.subjectRevision){const edits=Object.fromEntries(Object.entries(old.points).filter(([,p])=>p.corrected));Object.assign(frame.points,copy(this.sharedCorrections),copy(edits));frame.manual=!!old.manual;}
                }
                accepted.set(time,frame);this.subjectOverlay=subject.box;this.draw();
                this.panel.querySelector('progress').value=accepted.size/times.length;this.status(`Tracking selected subject: ${accepted.size}/${times.length}`);
                return subject;
            };
            try{
                let reference=null;
                if(!anchors.length&&prior){const points=[];Object.entries(ids).forEach(([name,id])=>{points[id]=prior.points[name];});reference=VideoMotionCapture.subjectDescriptor(points);if(reference){reference.time=prior.time;reference.signature=prior.subjectSignature;}}
                seed=await visit(seedTime,reference,seedBox);
                if(seed){
                    let previous=seed;
                    for(const time of times.filter(t=>t>seedTime)){
                        const anchor=anchors.find(a=>Math.abs(a.time-time)<.00001);
                        previous=await visit(time,anchor?null:previous,anchor?.box||previous.box);if(!previous)break;
                    }
                    if(!stopped){previous={...seed,velocity:{x:0,y:0}};
                        for(const time of times.filter(t=>t<seedTime).reverse()){previous=await visit(time,previous,previous.box);if(!previous)break;}
                    }
                }
            }catch(error){stopped={time:lastTime,end,reason:error.message};}
            finally{
                this.frames=original.filter(f=>f.time<start-.00001||f.time>=end).concat([...accepted.values()]).sort((a,b)=>a.time-b.time);
                if(stopped)this.subjectIssue=stopped;
                else this.subjectIssue=oldIssue&&(start>oldIssue.time+.001||end<oldIssue.end-.001)?oldIssue:null;
                this.stopWorker();this.subjectOverlay=null;this.busy(false);
            }
            if(!this.panel.isConnected)return;
            await this.reviewSeek(stopped?.time??start);
            this.status(stopped?`${stopped.reason} Tracking stopped at ${stopped.time.toFixed(2)} s; ${accepted.size} samples retained. Select the same person here and retrack. No substitute was accepted.`:this.subjectIssue?'This section is complete. The earlier subject review is still unresolved.':`Selected subject tracked: ${accepted.size} samples. Frames outside this range were preserved.`);
        }
        async track(options={}){
            if(!this.field('consent').checked)throw new Error('Confirm permission to use this video.');
            const start=options.fromHere?this.video.currentTime:Number(this.field('start').value),end=Number(this.field('end').value),fps=Number(this.field('fps').value);
            if(!this.url||!Number.isFinite(start+end)||start<0||end>this.video.duration||end<=start||end-start>30)throw new Error('Choose a valid clip up to 30 seconds.');
            if(this.subjectAnchors.length)return this.trackSubject(start,end,fps);
            const outside=this.frames.filter(f=>f.time<start-.00001||f.time>=end);
            const token=++this.version,manual=this.frames.filter(f=>f.manual||f.keep||f.view),frames=[],scopeLabel=this.field('scope').selectedOptions[0].textContent;
            this.bulkUndo=null;this.busy(true);
            try{
                const times=this.gif?[...new Set([start,...this.gif.frames.map(f=>f.time).filter(t=>t>start&&t<end),end-.001])].sort((a,b)=>a-b):Array.from({length:Math.ceil((end-start)*fps)+1},(_,i)=>Math.min(end-.001,start+i/fps));
                const count=times.length;
                if(count>1000)throw new Error('Choose a shorter range with at most 1000 samples.');
                for(let i=0;i<count;i++){
                    if(token!==this.version)throw new Error('Capture cancelled. Completed samples retained.');
                    await this.seek(times[i]);
                    const detected=await this.detect(await this.trackingBitmap());
                    const points={};Object.entries(ids).forEach(([name,id])=>{const p=detected[id];if(p)points[name]={x:p.x,y:p.y,...(Number.isFinite(p.z)?{z:p.z}:{}),visibility:p.visibility??0};});
                    frames.push({time:this.video.currentTime,points:completeLandmarks(points)});this.panel.querySelector('progress').value=(i+1)/count;this.status(`Tracking ${scopeLabel}: ${i+1}/${count}`);
                }
            }finally{
                // Retain corrected landmarks, not entire old frames: other joints must keep tracking.
                for(const f of frames){
                    const m=manual.find(m=>Math.abs(m.time-f.time)<.04);
                    const edits=Object.fromEntries(Object.entries(m?.points||{}).filter(([,p])=>Number.isFinite(m?.sourceTime)||p.corrected));
                    Object.assign(f.points,copy(this.sharedCorrections),copy(edits));completeLandmarks(f.points);f.manual=!!m?.manual;f.keep=!!m?.keep;if(m?.view)f.view=m.view;if(Number.isFinite(m?.sourceTime))f.sourceTime=m.sourceTime;
                }
                this.deletedFrameSet=null;this.frames=frames.concat(manual.filter(m=>m.time>=start&&m.time<end&&!frames.some(f=>Math.abs(m.time-f.time)<.04)),outside).sort((a,b)=>a.time-b.time);this.stopWorker();this.busy(false);
            }
            await this.seek(start);
            const required=this.requiredLandmarks(),uncertain=this.frames.filter(f=>required.some(n=>!f.points[n]||f.points[n].visibility<.6)).length;
            this.status(`${scopeLabel}: ${this.frames.length} samples; ${uncertain} need confidence review. Other detected limbs are dimmed and excluded from this limb selection. Body reference points are retained.`);
        }
        export(){
            if(!this.frames.length){this.status('Track or tag frames first.');return;}
            const fitting={mode:this.field('fitting').value,keyposes:this.field('keyposes').checked,tolerance:Number(this.field('key-tolerance').value),target:Number(this.field('key-target').value)};
            const blob=new Blob([JSON.stringify({format:'animstage-video-landmarks',version:1,source:this.source,view:this.field('view').value,scope:this.field('scope').value,fitting,subjects:{anchors:this.subjectAnchors,revision:this.subjectRevision,issue:this.subjectIssue||null},viewTransitions:{turnMs:Math.max(200,Math.min(2000,Number(this.field('turn').value)*1000||800)),anchor:this.field('contact').value},width:this.video.videoWidth,height:this.video.videoHeight,sharedCorrections:this.sharedCorrections,frames:this.frames},null,2)],{type:'application/json'});
            const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='video-landmarks.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
        }
        async import(){
            const file=this.field('session').files[0];this.field('session').value='';if(!file)return;
            if(!this.url)throw new Error('Load the original video first.');
            if(file.size>4*1024*1024)throw new Error('Landmark session must be under 4 MB.');
            const data=JSON.parse(await file.text());
            if(data.format!=='animstage-video-landmarks'||data.version!==1||!Array.isArray(data.frames)||data.frames.length>1000||data.frames.length<2)throw new Error('Invalid landmark session.');
            if(data.source?.name!==this.source?.name||data.source?.size!==this.source?.size||data.width!==this.video.videoWidth||data.height!==this.video.videoHeight)throw new Error('This session belongs to a different video. Load its original file first.');
            if(![...this.field('view').options].some(o=>o.value===data.view))throw new Error('Unsupported source view.');
            if(data.scope!==undefined&&![...this.field('scope').options].some(o=>o.value===data.scope))throw new Error('Unsupported capture limb selection.');
            const fitting=data.fitting||{mode:'auto',keyposes:false,tolerance:5,target:0};
            if(!['auto','2d','front-walk'].includes(fitting.mode)||typeof fitting.keyposes!=='boolean'||!Number.isFinite(fitting.tolerance)||fitting.tolerance<1||fitting.tolerance>25||!Number.isInteger(fitting.target)||fitting.target<0||fitting.target>100)throw new Error('Invalid fitting settings.');
            if(data.viewTransitions&&(!Number.isFinite(data.viewTransitions.turnMs)||data.viewTransitions.turnMs<200||data.viewTransitions.turnMs>2000||![...this.field('contact').options].some(o=>o.value===data.viewTransitions.anchor)))throw new Error('Invalid view transition settings.');
            const subjects=data.subjects||{anchors:[],revision:0,issue:null};
            if(!Array.isArray(subjects.anchors)||subjects.anchors.length>1000||!Number.isInteger(subjects.revision)||subjects.revision<0)throw new Error('Invalid subject selection.');
            let anchorTime=-1;
            for(const anchor of subjects.anchors){if(!Number.isFinite(anchor.time)||anchor.time<=anchorTime||anchor.time<0||anchor.time>=this.video.duration||!VideoMotionCapture.validSubjectBox(anchor.box))throw new Error('Invalid subject box or time.');anchorTime=anchor.time;}
            if(subjects.issue&&(!Number.isFinite(subjects.issue.time)||subjects.issue.time<0||subjects.issue.time>=this.video.duration||!Number.isFinite(subjects.issue.end)||subjects.issue.end<subjects.issue.time||subjects.issue.end>this.video.duration||typeof subjects.issue.reason!=='string'||subjects.issue.reason.length>1000))throw new Error('Invalid subject review marker.');
            const shared={};
            for(const [name,p] of Object.entries(data.sharedCorrections||{})){
                if(!landmarkNames.includes(name)||!p||![p.x,p.y,p.visibility].every(Number.isFinite)||Math.abs(p.x)>2||Math.abs(p.y)>2||p.visibility<0||p.visibility>1||p.corrected!==true)throw new Error('Invalid shared landmark correction.');
                shared[name]={x:p.x,y:p.y,visibility:p.visibility,corrected:true};
            }
            let last=-1;
            const frames=data.frames.map(f=>{
                if(!Number.isFinite(f.time)||f.time<0||f.time<=last||f.time>=this.video.duration)throw new Error('Invalid frame timestamp.');last=f.time;
                const points={};for(const [name,p]of Object.entries(f.points||{})){
                    if(!landmarkNames.includes(name)||![p.x,p.y,p.visibility].every(Number.isFinite)||Math.abs(p.x)>2||Math.abs(p.y)>2||p.visibility<0||p.visibility>1)throw new Error('Invalid landmark coordinates.');
                    if(p.z!==undefined&&(!Number.isFinite(p.z)||Math.abs(p.z)>10))throw new Error('Invalid landmark depth.');
                    points[name]={x:p.x,y:p.y,...(Number.isFinite(p.z)?{z:p.z}:{}),visibility:p.visibility,corrected:p.corrected===true};
                }
                if(f.view&&!/^(front|side:(left|right)|front-3q:(left|right))$/.test(f.view))throw new Error('Unsupported frame view.');
                if(f.subjectBox&&!VideoMotionCapture.validSubjectBox(f.subjectBox))throw new Error('Invalid tracked subject box.');
                if(f.subjectSignature&&(!Array.isArray(f.subjectSignature)||f.subjectSignature.length!==12||f.subjectSignature.some(n=>!Number.isFinite(n)||n<0||n>1)))throw new Error('Invalid subject appearance signature.');
                if(f.subjectRevision!==undefined&&(!Number.isInteger(f.subjectRevision)||f.subjectRevision<0))throw new Error('Invalid subject revision.');
                return{time:f.time,points:completeLandmarks(points),manual:f.manual===true,keep:f.keep===true,...(f.subjectBox?{subjectBox:copy(f.subjectBox),subjectSignature:f.subjectSignature,subjectRevision:f.subjectRevision}:{}),...(f.view?{view:f.view}:{}),...(Number.isFinite(f.sourceTime)&&f.sourceTime>=0&&f.sourceTime<=this.video.duration?{sourceTime:f.sourceTime}:{})};
            });
            if(frames.at(-1).time-frames[0].time>30)throw new Error('Session exceeds the 30-second capture limit.');
            this.subjectAnchors=copy(subjects.anchors);this.subjectRevision=subjects.revision;this.subjectIssue=subjects.issue?copy(subjects.issue):null;this.subjectOverlay=null;this.subjectMode=false;
            this.field('fitting').value=fitting.mode;this.field('keyposes').checked=fitting.keyposes;this.field('key-tolerance').value=fitting.tolerance;this.field('key-target').value=fitting.target;
            if(data.viewTransitions){this.field('turn').value=data.viewTransitions.turnMs/1000;this.field('contact').value=data.viewTransitions.anchor;}
            this.deletedFrameSet=null;this.bulkUndo=null;this.sharedCorrections=shared;this.frames=frames;this.field('view').value=data.view;if(data.scope!==undefined)this.field('scope').value=data.scope;await this.seek(frames[0].time);this.status(`Loaded ${frames.length} reviewed frames.`);
        }
        async fit(options={}){
            if(!this.field('consent').checked)throw new Error('Confirm permission to use this video.');
            if(this.subjectIssue)throw new Error(`Resolve subject tracking at ${this.subjectIssue.time.toFixed(2)} s before fitting. Select the same person and retrack the affected range.`);
            if(this.frames.length<2)throw new Error('Track or tag at least two frames.');
            if(this.system.objects.getObjectById(this.rig.root.id)!==this.rig.root)throw new Error('The target character has changed. Reopen capture.');
            if(VideoMotionCapture.normalizeView(this.field('view').value)!==VideoMotionCapture.normalizeView(this.view))throw new Error('Source and target views must match. Change the character view and reopen capture.');
            if(!options.returnMove&&this.frames.some(f=>f.view))return this.fitViews();
            if(this.frames.at(-1).time-this.frames[0].time>30||this.frames.length>1000)throw new Error('Choose up to 30 seconds and 1000 samples.');
            this.frames.forEach(f=>completeLandmarks(f.points));
            const captureHead=this.field('head').checked,captureTorso=this.field('torso').checked;
            const required=this.requiredLandmarks();
            if(this.frames.some(f=>required.some(n=>!f.points[n]||f.points[n].visibility<.6)))throw new Error('Correct missing or low-confidence landmarks before fitting, or delete unusable samples.');
            const s=this.system,rig=this.rig,snapshot=s._armatureActionSnapshot(rig),token=++this.version;
            const map=s._getArmatureJointMap(rig);
            if(captureHead&&!map.neck||captureTorso&&!map.waist)throw new Error('The target rig is missing the selected neck or waist joint.');
            const jointKey=n=>map[n]?n:n.replace(/^(left|right)/,side=>side===(VideoMotionCapture.normalizeView(this.view)==='side:left'?'left':'right')?'front':'back');
            const mode=this.field('fitting').value,walking=mode==='front-walk';
            if(walking&&VideoMotionCapture.normalizeView(this.view)!=='front')throw new Error('Front walking fitting requires a front-view segment. Use Automatic for mixed-view clips.');
            const swap=this.field('mirror').checked,depth=mode!=='2d'&&(walking||this.field('depth').checked),smoothing=Number(this.field('smooth').value);
            const walkSignals=walking?VideoMotionCapture.frontWalkSignals(this.frames):null;
            const walkTemplate=walking?JointMovements.hfWalkCycleTilt():null;
            const point=(f,n)=>{if(swap)n=n.replace(/^(left|right)/,v=>v==='left'?'right':'left');const p=f.points[n];return{x:p.x*this.video.videoWidth,y:p.y*this.video.videoHeight};};
            const scope=this.field('scope').value;
            const reference=this.frames[0];
            const torsoScale=Math.max(1,distance(point(reference,'left-shoulder'),point(reference,'left-hip')));
            const moving=chain=>this.frames.some(f=>chain.slice(1).some(n=>{
                const a=point(f,chain[0]),b=point(f,n),c=point(reference,chain[0]),d=point(reference,n);
                return Math.hypot(b.x-a.x-d.x+c.x,b.y-a.y-d.y+c.y)>torsoScale*.08;
            }));
            const hasMotion=scope!=='auto'||chains.some(moving);
            const active=chains.filter(chain=>chain.every(n=>map[jointKey(n)])&&
                (scope==='all'||scope==='auto'&&(moving(chain)||options.allowStill&&!hasMotion)||scope==='arms'&&chain[0].endsWith('shoulder')||chain[0]===scope+'-shoulder'));
            if(!active.length&&!captureHead&&!captureTorso)throw new Error('No moving compatible limbs found. Choose specific limbs or review the landmarks.');
            const pose=s._snapshotArmaturePose(rig),keys=active.flatMap(c=>c.slice(0,2).map(jointKey)),angles={...pose.jointAngles},tilts=copy(pose.jointTilts||{});
            const world=n=>{const m=s._getArmatureJointMap(rig)[jointKey(n)];return m.obj.getJointWorldPosition(m.jt);};
            const lengths=active.map(chain=>[distance(world(chain[0]),world(chain[1])),distance(world(chain[1]),world(chain[2]))]);
            const center=(f,a,b)=>{const p=point(f,a),q=point(f,b);return{x:(p.x+q.x)/2,y:(p.y+q.y)/2};};
            const first=this.frames[0],origin=point(first,'pelvis');
            const sourceTorso=Math.max(1,distance(origin,center(first,'left-shoulder','right-shoulder')));
            const targetTorso=distance(world('left-hip'),world('left-shoulder'));
            const shoulderScale=distance(world('left-shoulder'),world('right-shoulder'))/Math.max(1,distance(point(first,'left-shoulder'),point(first,'right-shoulder')));
            const axis=(a,b)=>Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI;
            const torsoAngle=f=>axis(point(f,'waist'),point(f,'neck'));
            const headAngle=f=>axis(point(f,'neck'),center(f,'left-ear','right-ear'));
            const delta=(a,b)=>((a-b+540)%360)-180;
            if(this.frames.some(f=>(captureTorso&&distance(point(f,'waist'),point(f,'neck'))<1)||(captureHead&&distance(point(f,'neck'),center(f,'left-ear','right-ear'))<1)))throw new Error('Separate the neck, waist and head landmarks before fitting.');
            const maxLengths=active.map(chain=>[0,1].map(j=>Math.max(1,...this.frames.map(f=>distance(point(f,chain[j]),point(f,chain[j+1]))))));
            const apply=()=>{s._applyArmaturePose(rig,{...pose,jointAngles:angles,jointTilts:tilts,grounding:false});s.objects._resolvePins();};
            const frames=[];let totalError=0,previous;
            this.busy(true);
            try{
                for(const [index,f] of this.frames.entries()){
                    if(token!==this.version)throw new Error('Fitting cancelled.');
                    const dt=index>0?f.time-this.frames[index-1].time:1/12;
                    const blend=index>0?Math.pow(walking?Math.max(.5,smoothing):smoothing,dt*12):0;
                    let walkPrior=null;
                    if(walking){
                        const signal=walkSignals[index]*(swap?-1:1),contact=walkTemplate.keyframes[signal>=0?0:2].tilts;
                        walkPrior=JointSystem._convertHumanFrontTiltsToArmaturePoseData(contact).jointTilts;
                        for(const value of Object.values(walkPrior)){value.x*=Math.abs(signal);value.y=0;}
                    }
                    const torsoDelta=captureTorso?Math.max(-60,Math.min(60,delta(torsoAngle(f),torsoAngle(first)))):0;
                    if(captureTorso)angles.waist=(pose.jointAngles.waist||0)+torsoDelta*(map.waist.negate?-1:1);
                    if(captureHead)angles.neck=(pose.jointAngles.neck||0)+Math.max(-45,Math.min(45,delta(headAngle(f),headAngle(first))-torsoDelta))*(map.neck.negate?-1:1);
                    if(previous)for(const key of [captureTorso?'waist':null,captureHead?'neck':null].filter(Boolean))angles[key]=angles[key]*(1-blend)+previous.jointAngles[key]*blend;
                    const vectors=active.map((chain,k)=>[0,1].map(j=>{
                        const a=point(f,chain[j]),b=point(f,chain[j+1]),len=Math.max(.01,distance(a,b));
                        const target=lengths[k][j]*(depth?Math.min(1,len/maxLengths[k][j]):1);
                        return{x:(b.x-a.x)/len*target,y:(b.y-a.y)/len*target};
                    }));
                    const endpoints=active.map((chain,k)=>{
                        const v={x:vectors[k][0].x+vectors[k][1].x,y:vectors[k][0].y+vectors[k][1].y};
                        if(chain[0].endsWith('shoulder')&&this.view==='front'){
                            const a=point(f,chain[0]),b=point(f,chain[2]);
                            // Retain cross-body reach on rigs with wider shoulders / shorter arms.
                            if(Math.abs(b.x-a.x)>Math.abs(v.x)/Math.max(.001,shoulderScale))v.x=(b.x-a.x)*shoulderScale;
                            const limit=(lengths[k][0]+lengths[k][1])*.98,scale=Math.min(1,limit/Math.max(.01,Math.hypot(v.x,v.y)));
                            v.x*=scale;v.y*=scale;
                        }
                        return v;
                    });
                    const loss=()=>{apply();let error=0;active.forEach((chain,k)=>{
                        for(let j=0;j<2;j++){const a=world(chain[j]),b=world(chain[j+1]),v=vectors[k][j];error+=(b.x-a.x-v.x)**2+(b.y-a.y-v.y)**2;}
                        const a=world(chain[0]),b=world(chain[2]),v=endpoints[k];
                        error+=8*((b.x-a.x-v.x)**2+(b.y-a.y-v.y)**2);
                    });return error;};
                    const objective=()=>loss()+keys.reduce((sum,key)=>sum+['x','y'].reduce((n,axis)=>{
                        const baseline=pose.jointTilts[key]?.[axis]||0,prior=walking?baseline+(walkPrior[key]?.[axis]||0):baseline;
                        return n+((tilts[key]?.[axis]||0)-prior)**2*(walking?8:.12)+(previous&&depth?((tilts[key]?.[axis]||0)-(previous.jointTilts[key]?.[axis]||0))**2*.35:0);
                    },0),0);
                    // Solve planar motion first from the baseline. Carrying the previous 3D
                    // solution alone can trap the shoulder while the elbow folds across it.
                    for(const key of keys){angles[key]=pose.jointAngles[key]||0;tilts[key]=copy(pose.jointTilts[key]||{x:0,y:0});if(walking)tilts[key].x=(tilts[key].x||0)+(walkPrior[key]?.x||0);}
                    let best=objective();
                    for(const fitDepth of depth?[false,true]:[false])
                    for(const step of [24,12,6,3,1])for(let pass=0;pass<4;pass++)for(const key of keys){
                        const original=Number(angles[key])||0;let selected=original;
                        const centerAngle=pose.jointAngles[key]||0,limit=walking?(key.endsWith('shoulder')?4:2):170;
                        for(const sign of [-1,1]){angles[key]=Math.max(walking?centerAngle-limit:-170,Math.min(walking?centerAngle+limit:170,original+sign*step));const value=objective();if(value<best){best=value;selected=angles[key];}}
                        angles[key]=selected;
                        if(fitDepth){const originalTilt={...(tilts[key]||{x:0,y:0})};let selectedTilt=originalTilt;
                            for(const axis of walking?['x']:['x','y'])for(const sign of [-1,1]){const baseline=pose.jointTilts[key]?.[axis]||0,prior=baseline+(walkPrior?.[key]?.[axis]||0);tilts[key]={...originalTilt,[axis]:Math.max(walking?prior-6:-55,Math.min(walking?prior+6:55,(originalTilt[axis]||0)+sign*step))};const value=objective();if(value<best){best=value;selectedTilt={...tilts[key]};}}
                            tilts[key]=selectedTilt;
                        }
                    }
                    if(previous)for(const key of keys){
                        angles[key]=angles[key]*(1-blend)+previous.jointAngles[key]*blend;
                        if(depth)for(const axis of ['x','y']){tilts[key]||={x:0,y:0};tilts[key][axis]=(tilts[key][axis]||0)*(1-blend)+(previous.jointTilts[key]?.[axis]||0)*blend;}
                        if(depth){
                            const cap=(walking?60:180)*dt,old=previous.jointAngles[key]||0;
                            angles[key]=old+Math.max(-cap,Math.min(cap,delta(angles[key],old)));
                            for(const axis of ['x','y']){const prior=previous.jointTilts[key]?.[axis]||0;tilts[key][axis]=prior+Math.max(-cap,Math.min(cap,tilts[key][axis]-prior));}
                        }
                    }
                    apply();
                    active.forEach((chain,k)=>{for(let j=0;j<2;j++){const a=world(chain[j]),b=world(chain[j+1]),v=vectors[k][j];totalError+=(b.x-a.x-v.x)**2+(b.y-a.y-v.y)**2;}});
                    const frame={t:(f.time-this.frames[0].time)/(this.frames.at(-1).time-this.frames[0].time),jointAngles:copy(angles),jointTilts:copy(tilts),_videoKeep:f.keep===true};
                    if(walking&&index>0&&index<this.frames.length-1&&(walkSignals[index]-walkSignals[index-1])*(walkSignals[index+1]-walkSignals[index])<0)frame._videoKeep=true;
                    if(this.field('travel').checked){const p=point(f,'pelvis');frame.dx=(p.x-origin.x)*targetTorso/sourceTorso;frame.dy=(p.y-origin.y)*targetTorso/sourceTorso;}
                    frames.push(frame);previous=frame;
                    this.panel.querySelector('progress').value=(index+1)/this.frames.length;this.status(`Fitting ${index+1}/${this.frames.length}`);await new Promise(resolve=>setTimeout(resolve,0));
                }
            }finally{s._restoreArmatureActionSnapshot(snapshot,true);if(!this.fittingViews)this.busy(false);}
            if(token!==this.version)return;
            const rms=active.length?Math.sqrt(totalError/(this.frames.length*active.length*2)):0;
            const move={key:Utils.generateId('video-motion'),name:this.field('name').value.trim()||'Captured movement',duration:Math.max(50,(this.frames.at(-1).time-this.frames[0].time)*1000),easing:'linear',category:'Video Capture',_videoCaptureView:this.view,_videoCaptureResidualPx:rms,keyframes:frames};
            move._videoCaptureFitting=mode;
            move.capabilities={stride:false,source:'video-capture'};
            if(this.field('keyposes').checked){
                const reduced=VideoMotionCapture.reduceFittedFrames(frames,move.duration,this.field('key-tolerance').value,this.field('key-target').value);
                move.keyframes=reduced.frames;move._videoCaptureOriginalFrames=reduced.original;
                move._videoCaptureReduction={from:frames.length,to:reduced.frames.length,maxChannelError:reduced.maxError,targetExceeded:reduced.targetExceeded===true};
            }
            if(options.returnMove)return move;
            const opened=s._openArmatureMovementDebugger(rig,move.key,{prepared:true,movementEntry:move});
            if(opened){
                const session=s._activeArmatureDebuggerSession;
                if(move._videoCaptureReduction){
                    session._keyPoseResult={original:copy(frames),frames:copy(session.frames),channelOnly:true,maxDegrees:move._videoCaptureReduction.maxChannelError,samples:frames.length};
                    session._keyPoseVariant='simplified';session.originalFrames=copy(frames);
                    session._debuggerOriginalFrameIndices=session.frames.map(f=>frames.findIndex(original=>original.t===f.t));
                    s._renderArmatureDebuggerPanel(session,s._applyArmatureDebuggerFrame(session,0));
                }
                const reduction=move._videoCaptureReduction;
                this.close();Utils.showToast(`Capture fitted (${rms.toFixed(1)} px RMS segment residual). ${reduction?`${reduction.from} samples reduced to ${reduction.to} poses. ${reduction.targetExceeded?'Extra poses retained to protect motion. ':''}`:''}Review in debugger and Save Template. Depth and contacts remain estimates.`, 'info');
            }
        }
        async fitViews(){
            const segments=VideoMotionCapture.viewSegments(this.frames,this.field('view').value);
            if(segments[0].view!==VideoMotionCapture.normalizeView(this.view))throw new Error('The first view marker must match the selected character.');
            const s=this.system,original={frames:this.frames,rig:this.rig,view:this.view,source:this.field('view').value},snapshot=s._armatureActionSnapshot(this.rig),recipe={version:1,name:this.field('name').value.trim()||'Captured view sequence',segments:[]};
            this.fittingViews=true;this.busy(true);
            try{
                for(const segment of segments){
                    if(!this.panel.isConnected)throw new Error('Capture cancelled.');
                    if(VideoMotionCapture.normalizeView(this.view)!==segment.view)this.rig=await s._switchArmatureCrossView(this.rig,segment.view);
                    this.view=segment.view;this.frames=segment.frames;
                    if(![...this.field('view').options].some(o=>o.value===segment.view))this.field('view').add(new Option(segment.view,segment.view));
                    this.field('view').value=segment.view;
                    const move=await this.fit({returnMove:true,allowStill:true});
                    if(!move)throw new Error('Capture cancelled.');
                    move.keyframes[0]._videoKeep=true;move.keyframes.at(-1)._videoKeep=true;
                    recipe.segments.push({view:segment.view,move,turnMs:Math.max(200,Math.min(2000,Number(this.field('turn').value)*1000||800)),anchor:this.field('contact').value});
                }
            }finally{
                s._restoreArmatureActionSnapshot(snapshot,true);this.rig=original.rig;this.view=original.view;this.frames=original.frames;this.field('view').value=original.source;this.fittingViews=false;this.busy(false);
            }
            this.close();await s._openCapturedViewSequenceEditor(original.rig,recipe);
        }
    }
    window.VideoMotionCapture=VideoMotionCapture;
})();
