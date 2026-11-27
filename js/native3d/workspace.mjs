import {mountPathEditor} from './path-ui.mjs';
import {mountShadows} from './shadow-ui.mjs';
import {mountDrawing} from './drawing-ui.mjs';
import {mountSceneContext} from './scene-context-ui.mjs';
import {mountCameraRig} from './camera-rig-ui.mjs';
import {retimeTravel,removeTravelKeys,travelGaits,putTransformKey} from './travel.mjs';
import {mountCaptionStyle} from './caption-style-ui.mjs';
import {mountWindowPreview} from './window-preview.mjs';
import {mountArrange} from './arrange-ui.mjs';
import {mountAuthoring} from './authoring-ui.mjs';
import {enforceEditLocks} from './edit-locks.mjs';
import {remapExceptions} from './solidity.mjs';
import {mountContactUI} from './contact-ui.mjs';
import {mountSolidityUI} from './solidity-ui.mjs';
import {mountPlacementUI} from './placement-ui.mjs';
import {mountCustomProps} from './custom-props-ui.mjs';
import {mountPropLibrary} from './prop-library-ui.mjs';
import {mountGroupingUI} from './grouping-ui.mjs';
import {copyGroup} from './group-copy.mjs';
import {mountEditingUI} from './editing-ui.mjs';
import {mountShapeUI} from './shape-ui.mjs';
import {World,readGLB} from './world.mjs';
import {createProject,createNode,validateProject,demoProject,sampleTransform,sampleAction,actionTrack,seatForActions,grippableKinds} from './project.mjs';
import {createSpeechUI} from './speech-ui.mjs';
import {createMovieUI} from './movie-ui.mjs';
import {setupLayout} from './layout.mjs';
import {createTimelineUI} from './timeline.mjs';
import {mountGripUI} from './grip-ui.mjs';
import {mountAttachUI} from './attach-ui.mjs';
const $=s=>document.querySelector(s), copy=o=>JSON.parse(JSON.stringify(o));
const status=(text,error=false)=>{ $('#status').textContent=text;$('#status').dataset.error=String(error); };
let world,project,selected=null,busy=false,dirty=false,history=[],cursor=-1,recovery=null,contactUiState='',inspectorActionSnapshot=null;
const form=$('#object-form'), sf=$('#scene-form');
setupLayout();
for(const [field,label] of [['position','Pos'],['rotation','Rot'],['scale','Size']]) {
    const row=document.createElement('label');row.textContent=label;const triple=document.createElement('span');triple.className='triple';
    for(const [i,axis]of ['X','Y','Z'].entries()){const input=document.createElement('input');input.type='number';input.step='any';input.name=field+i;input.setAttribute('aria-label',`${field} ${axis}`);input.required=true;triple.append(input);}row.append(triple);$('#transform-fields').append(row);
}
function error(e){status(e.message||String(e),true);console.error(e);}
function loading(value){busy=value;$('#loading').hidden=!value;document.querySelector('main').inert=value;$('.projectbar').inert=value;document.querySelectorAll('header button,.projectbar button,.scene-actions button,#add,#import').forEach(el=>el.disabled=value);}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function fileName(ext){return (project.name.replace(/[<>:"/\\|?*]/g,'-')||'scene')+ext;}
function checkpoint(){
    const value=JSON.stringify(project);if(history[cursor]===value)return;
    history=history.slice(0,cursor+1);history.push(value);cursor=history.length-1;
    while(history.length>2&&(history.length>20||history.reduce((n,s)=>n+s.length,0)>32*1024*1024)){history.shift();cursor--;}
    dirty=true;$('#save-state').textContent='Unsaved changes';
    try{if(value.length<4*1024*1024)localStorage.setItem('animationstage.native3d.autosave.v1',value);else{localStorage.removeItem('animationstage.native3d.autosave.v1');$('#save-state').textContent='Large scene · save to file';}}catch{$('#save-state').textContent='Save to file · browser storage unavailable';}
    $('#undo').disabled=cursor<=0;$('#redo').disabled=cursor>=history.length-1;
}
async function install(next,{record=true,reset=false}={}){
    if(world?.exporting)throw Error('Finish or cancel movie export before changing the scene');
    if(busy)return false;const candidate=validateProject(next),time=reset?0:world.time;
    if(!reset)candidate.view={position:world.camera.position.toArray(),target:world.orbit.target.toArray()};loading(true);
    try{await world.load(candidate);world.seek(time);project=candidate;if(reset){history=[];cursor=-1;}if(record)checkpoint();refresh();return true;}
    finally{loading(false);$('#undo').disabled=cursor<=0;$('#redo').disabled=cursor>=history.length-1;}
}
function select(id){selected=project?.nodes.some(n=>n.id===id)?id:null;world.select(selected);refreshHierarchy();refreshInspector();refreshKeys();timelineUI.syncSelection?.(selected);}
function refresh(){ $('#project-name').value=project.name;$('#duration').value=project.duration;$('#time').max=project.duration;
    sf.elements.background.value=project.background;sf.elements.ambient.value=project.ambient;sf.elements.fov.value=project.camera.fov;
    ['X','Y','Z'].forEach((a,i)=>sf.elements['viewer'+a].value=project.viewerStart.position[i]);sf.elements.viewerYaw.value=project.viewerStart.yaw*180/Math.PI;sf.elements.eyeHeight.value=project.viewerStart.eyeHeight;
    select(project.nodes.some(n=>n.id===selected)?selected:null);$('#play').textContent=world.playing?'❚❚ Pause':'▶ Play';
    speechUI.refresh();speechUI.renderCaptions();captionStyleUI.refresh();cameraRigUI.refresh();timelineUI.refresh();
}
function refreshHierarchy(){
    const tree=$('#hierarchy');tree.replaceChildren();$('#object-count').textContent=project.nodes.length;
    function append(parent,depth){for(const n of project.nodes.filter(n=>n.parent===parent)){
        const button=document.createElement('button');button.type='button';button.role='treeitem';button.dataset.id=n.id;button.setAttribute('aria-selected',String(n.id===selected));button.setAttribute('aria-level',depth+1);button.style.paddingLeft=(8+depth*12)+'px';
        const icon=document.createElement('span');icon.textContent=n.kind==='character'?'♟':n.kind==='group'?'▱':n.kind==='light'?'☼':n.kind==='camera'?'▣':'◇';
        const name=document.createElement('span');name.textContent=(n.locked?'[Locked] ':'')+n.name;const badge=document.createElement('small');badge.textContent=n.visible?n.kind:'hidden';button.append(icon,name,badge);button.onclick=()=>select(n.id);tree.append(button);append(n.id,depth+1);
    }}append(null,0);
    groupingUI.refresh();customPropsUI.refresh();if($('#show-selected-stage'))$('#show-selected-stage').disabled=!selected;$('#duplicate').disabled=!selected||busy;$('#delete').disabled=!selected||busy;const grouped=project.nodes.find(n=>n.id===selected)?.kind==='group';$('#duplicate').textContent=grouped?'Duplicate Group':'Duplicate';$('#duplicate').title=grouped?'Copy this group, its nested objects, animation, internal contacts and character speech.':'Copy the selected object.';
}
function contactControls(){
    const f=form.elements,seat=!!f.seatChair.value,hold=!!f.holdActor.value;
    const tracked=project?.nodes.find(n=>n.id===selected)?.actionClips!==undefined;
    f.action.closest('label').hidden=false;
    f.gazeTarget.closest('label').hidden=f.gaze.value!=='character';
    f.actionStart.closest('.paired').hidden=f.action.value==='idle';
    for(const item of f.seatChair.closest('fieldset').querySelectorAll('.paired,details,p'))item.hidden=!seat;
    f.holdHand.closest('label').hidden=!hold;f.holdStart.closest('details').hidden=!hold;
    for(const option of f.action.options)option.disabled=seat&&['sit','stand'].includes(option.value);
}
function refreshInspector(){
    contactUiState=selected+':'+!!world.constrained(selected);
    const n=project.nodes.find(n=>n.id===selected);pathUI.refresh(n);drawingUI.refresh(n);shadowUI.refresh();$('#key').disabled=!n||!!n.rest;placementUI.refresh(n);solidityUI.refresh(n);contactUI.refresh(n);authoringUI.refresh(n);arrangeUI.refresh(n);form.hidden=!n;$('#empty-selection').hidden=!!n;if(!n)return;
    form.elements.name.value=n.name;form.elements.visible.checked=n.visible;form.elements.color.value=n.color;
    const transform=sampleTransform(n,world.time);for(const k of ['position','rotation','scale'])transform[k].forEach((v,i)=>form.elements[k+i].value=Number((k==='rotation'?v*180/Math.PI:v).toFixed(4)));
    form.elements.parent.replaceChildren(new Option('World',''));
    const descendants=new Set([n.id]);let old;do{old=descendants.size;project.nodes.filter(o=>descendants.has(o.parent)).forEach(o=>descendants.add(o.id));}while(old!==descendants.size);
    for(const group of project.nodes.filter(o=>o.kind==='group'&&!descendants.has(o.id)))form.elements.parent.add(new Option(group.name,group.id));form.elements.parent.value=n.parent||'';
    $('[data-text]').hidden=n.kind!=='text';form.elements.text.value=n.text||'';
    $('[data-character]').hidden=n.kind!=='character';form.elements.outfit.value=n.outfit||0;const activeAction=n.kind==='character'?sampleAction(n,world.time):n.action;inspectorActionSnapshot={...activeAction};form.elements.action.value=activeAction.name;form.elements.actionStart.value=activeAction.start;form.elements.actionDuration.value=activeAction.duration;
    const f=form.elements;
    f.seatChair.replaceChildren(new Option('No linked chair',''));for(const chair of project.nodes.filter(o=>o.kind==='chair')){const owner=project.nodes.find(o=>o.id!==n.id&&o.seat?.chairId===chair.id),option=new Option(chair.name+(owner?' (used by '+owner.name+')':''),chair.id);option.disabled=!!owner;f.seatChair.add(option);}f.seatChair.value=n.seat?.chairId||'';
    const seatTiming=seatForActions(n),seatHint=f.seatChair.closest('fieldset').querySelector('p.hint');seatHint.textContent='Move the chair to reposition its seated character. Linked actors need uniform scale and upright rotation.'+(seatTiming?.autoStand?' Walk requires an earlier Stand: '+seatTiming.standAt.toFixed(2)+'–'+(seatTiming.standAt+seatTiming.standDuration).toFixed(2)+' s (Auto Stand in the timeline overrides the scheduled Stand below).':'');f.sitStart.value=n.seat?.start??Math.min(world.time,Math.max(0,project.duration-1.2));f.sitDuration.value=n.seat?.sitDuration??1.2;f.standAt.value=n.seat?.standAt??'';f.standDuration.value=n.seat?.standDuration??1.2;
    for(const option of f.action.options)option.disabled=!!n.seat&&['sit','stand'].includes(option.value);
    form.elements.gaze.value=n.gaze||'manual';form.elements.gazeTarget.replaceChildren(new Option('Choose a character',''));for(const other of project.nodes.filter(o=>o.kind==='character'&&o.id!==n.id))form.elements.gazeTarget.add(new Option(other.name,other.id));form.elements.gazeTarget.value=n.gazeTarget||'';
    $('[data-document]').hidden=!grippableKinds.includes(n.kind);f.holdActor.replaceChildren(new Option('Free scene object',''));for(const actor of project.nodes.filter(o=>o.kind==='character'))f.holdActor.add(new Option(actor.name,actor.id));f.holdActor.value=n.attachment?.actorId||attachUI.targetFor(n)?.actorId||'';f.holdHand.value=n.attachment?.hand||attachUI.targetFor(n)?.hand||'left';f.holdStart.value=n.attachment?.start??0;f.holdEnd.value=n.attachment?.end??'';
    $('#detach-document').disabled=!n.attachment;
    gripUI.refresh(n);attachUI.refresh(n);editingUI.refresh(n);shapeUI.refresh(n);
    const held=world.activeAttachments?.has(n.id),seated=!!n.seat&&world.constrained(n.id),resting=!!n.rest;
    for(const field of ['position','rotation','scale'])for(let i=0;i<3;i++)f[field+i].disabled=held||seated||resting||!!(n.actionClips?.find(c=>c.travel&&(c.travel.waypoints!==undefined||c.travel.easing!==undefined||c.travel.faceDirection!==undefined)&&world.time>c.start+.000001&&world.time<c.start+c.duration-.000001)&&(field==='position'||field==='rotation'&&n.actionClips.find(c=>c.travel&&world.time>=c.start&&world.time<c.start+c.duration)?.travel.faceDirection));
    $('#contact-note').hidden=!held&&!seated&&!resting;$('#contact-note').textContent=resting?'This object follows a support. Use Surface Placement to release its link before moving it.':held?'This document follows the hand. Use Grip Placement to move/tilt it within the hand, or Detach at Current Pose for free scene movement.':seated?'This character follows the linked chair while sitting. Select and move the chair to reposition the seated character.':'';
    $('[data-light]').hidden=n.kind!=='light';form.elements.intensity.value=n.intensity??2;
    $('[data-model]').hidden=n.kind!=='model';form.elements.clip.replaceChildren(new Option('No animation','-1'));world.entries.get(n.id)?.clips.forEach((clip,i)=>form.elements.clip.add(new Option(clip.name||`Clip ${i+1}`,String(i))));form.elements.clip.value=String(n.clip??0);
    $('[data-material]').hidden=n.kind!=='light';$('#key-warning').hidden=!n.keys.length;
    contactControls();
}
function refreshKeys(){const list=$('#key-list');list.replaceChildren();const node=project.nodes.find(n=>n.id===selected);if(!node?.keys.length){list.textContent='Select an object and add keys to animate its transform.';return;}for(const key of node.keys){const button=document.createElement('button');button.textContent=`◆ ${key.time.toFixed(2)} s`;button.onclick=()=>{world.stop();world.seek(key.time);refreshInspector();};list.append(button);}}
async function change(update,options={}){if(world.exporting)throw Error('Finish or cancel movie export before editing');if(busy)return;world.stop();const next=copy(project);update(next);enforceEditLocks(project,next,options);await install(next);}
async function add(){const kind=$('#add-kind').value;if(kind==='drawing'){drawingUI.open();return;}let n;
    if(['amaka','tunde'].includes(kind))n=createNode('character',{preset:kind,name:kind==='amaka'?'Amaka':'Tunde'});
    else n=createNode(kind,{...(kind==='text'?{text:'3D Text'}:{}),...(kind==='light'?{position:[3,5,3],intensity:2}:{}),...(kind==='plane'?{shape:{width:10,depth:10}}:{}),...(kind==='camera'?{position:[0,1.65,4]}:{})});
    selected=n.id;await change(p=>p.nodes.push(n));status(`Added ${n.name}. Use Move, Rotate or Scale in the viewport.`);
}
function register(selector,handler){$(selector).addEventListener('click',()=>Promise.resolve().then(handler).catch(error));}
const captionStyleUI=mountCaptionStyle({getWorld:()=>world,change,status});
const speechUI=createSpeechUI({getProject:()=>project,getWorld:()=>world,getSelected:()=>selected,change,install,status,busy:()=>busy});
const movieUI=createMovieUI({getProject:()=>project,getWorld:()=>world,download,fileName,status,busy:()=>busy});
const timelineUI=createTimelineUI({getProject:()=>project,getWorld:()=>world,getSelected:()=>selected,change,select,status});
const gripUI=mountGripUI({getSelected:()=>selected,getWorld:()=>world,getHoldOptions:()=>attachUI.read(),change,status});
const attachUI=mountAttachUI({getSelected:()=>selected,getWorld:()=>world,change,status});
const editingUI=mountEditingUI({getSelected:()=>selected,getWorld:()=>world,change,status});
const placementUI=mountPlacementUI({getSelected:()=>selected,getWorld:()=>world,change,status});
const contactUI=mountContactUI({getSelected:()=>selected,getWorld:()=>world,change,status});
const solidityUI=mountSolidityUI({getSelected:()=>selected,getWorld:()=>world,change,status});
const arrangeUI=mountArrange({getWorld:()=>world,getSelected:()=>selected,change,status});
const cameraRigUI=mountCameraRig({getWorld:()=>world,getSelected:()=>selected,change,status});
const authoringUI=mountAuthoring({getWorld:()=>world,getSelected:()=>selected,change,select,status});
const shadowUI=mountShadows({getWorld:()=>world,getSelected:()=>selected,change,status});
const pathUI=mountPathEditor({getWorld:()=>world,getSelected:()=>selected,change,status});
const drawingUI=mountDrawing({getWorld:()=>world,getSelected:()=>selected,change,select,status});
const shapeUI=mountShapeUI({getSelected:()=>selected,getWorld:()=>world,change,status});
mountPropLibrary({getSelected:()=>selected,getWorld:()=>world,apply:async result=>{selected=result.selected;await change(p=>Object.assign(p,result.project));},status});
const customPropsUI=mountCustomProps({getSelected:()=>selected,getWorld:()=>world,download,status,apply:async result=>{const previous=selected;selected=result.selected;try{await change(p=>Object.assign(p,result.project));}catch(e){selected=previous;select(previous);throw e;}}});
mountSceneContext({getWorld:()=>world,getSelected:()=>selected,change,select,status});
const groupingUI=mountGroupingUI({getSelected:()=>selected,getWorld:()=>world,apply:async result=>{selected=result.selected;await change(p=>Object.assign(p,result.project));},status});
try{
    world=new World($('#viewport'),{onGripMode:()=>{gripUI.refresh(project?.nodes.find(n=>n.id===selected));$('#camera-view').setAttribute('aria-pressed',world.cameraView);$('#view-mode').textContent=world.cameraView?'· Camera':'· Editor';document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===world.gizmo.getMode())));},onSelect:select,onChange:()=>{checkpoint();refreshInspector();refreshKeys();},onTime:t=>{$('#time').value=t;$('#time-label').textContent=t.toFixed(2)+' s';$('#play').textContent=world?.playing?'❚❚ Pause':'▶ Play';speechUI.renderCaptions();timelineUI.renderTime(t);shapeUI.updateSize();placementUI.render();solidityUI.render();contactUI.render();authoringUI.render();cameraRigUI.render();pathUI.render();if(project&&project===world?.project){const state=selected+':'+world.constrained(selected);if(state!==contactUiState){contactUiState=state;refreshInspector();}}},onError:text=>status(text,true),onStats:s=>{$('#stats').textContent=`${s.quality} · ${s.calls} draws · ${Math.round(s.triangles/1000)}k triangles`;$('#stats').title=s.hardware;cameraRigUI.render();pathUI.render();}});
    try{recovery=localStorage.getItem('animationstage.native3d.autosave.v1');}catch{}
    await install(demoProject(),{reset:true});dirty=false;$('#save-state').textContent='Example · save a copy';status('Native 3D workspace ready. Add objects, select them and edit their transforms.');
    try{if(recovery)localStorage.setItem('animationstage.native3d.autosave.v1',recovery);else localStorage.removeItem('animationstage.native3d.autosave.v1');}catch{}
    $('#recover').hidden=!recovery;
}catch(e){error(e);$('#loading').hidden=true;}
if(world){
    for(const value of ['natural','stroll','strut','jog','run'])form.elements.action.add(new Option(value,value));form.elements.gaze.add(new Option('Scene camera (export framing)','sceneCamera'));
    form.addEventListener('change',event=>{if(['seatChair','holdActor','gaze','action'].includes(event.target.name))contactControls();});
    register('#add',add);register('#import',()=>$('#model-file').click());register('#open',()=>$('#project-file').click());
    register('#recover',async()=>{if(dirty&&!confirm('Restore the browser recovery copy? Save current work first.'))return;await install(JSON.parse(recovery),{reset:true});status('Restored browser recovery copy. Save it to a project file.');});
    register('#new',async()=>{if(dirty&&!confirm('Create a new scene? Save your current project first.'))return;selected=null;const p=createProject();p.nodes=[createNode('plane',{name:'Ground',shape:{width:10,depth:10},color:'#9caeb5'}),createNode('light',{name:'Key light',position:[3,5,4],intensity:2,color:'#fff3dd'})];await install(p,{reset:true});status('New native 3D scene.');});
    register('#example',async()=>{if(dirty&&!confirm('Open the native classroom? Save your current project first.'))return;selected=null;await install(demoProject(),{reset:true});status('Native classroom: independent furniture and two characters share one 3D world. Speech remains in the existing editor.');});
    register('#save',()=>{project.view={position:world.camera.position.toArray(),target:world.orbit.target.toArray()};const data=validateProject(project);download(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),fileName('.stage3d'));dirty=false;$('#save-state').textContent='Project file downloaded';status('Saved portable .stage3d project with embedded imported assets.');});
    register('#export',async()=>{if($('#export-type').value==='movie'){await movieUI.open();return;}world.stop();if($('#export-type').value==='png'){const bytes=Uint8Array.from(atob(world.screenshot().split(',')[1]),c=>c.charCodeAt(0));download(new Blob([bytes],{type:'image/png'}),fileName('.png'));status('Exported viewport image without editor helpers.');}else{loading(true);try{download(new Blob([await world.exportGLB()],{type:'model/gltf-binary'}),fileName('.glb'));status('Exported GLB snapshot. Editable animation stays in the .stage3d project.');}finally{loading(false);}}});
    register('#delete',async()=>{if(!selected||busy)return;const ids=new Set([selected]);let previous;do{previous=ids.size;project.nodes.filter(n=>ids.has(n.parent)).forEach(n=>ids.add(n.id));}while(previous!==ids.size);if(ids.size>1&&!confirm(`Delete this group, its ${ids.size-1} child objects and their linked speech clips?`))return;selected=null;await change(p=>{p.nodes=p.nodes.filter(n=>!ids.has(n.id));for(const n of p.nodes){if(n.seat&&ids.has(n.seat.chairId))delete n.seat;if(n.attachment&&ids.has(n.attachment.actorId)){const root=world.entries.get(n.id).root;n.position=root.position.toArray();n.rotation=root.rotation.toArray().slice(0,3);n.scale=root.scale.toArray();n.keys=[];delete n.attachment;}if(n.rest&&ids.has(n.rest.targetId)){const root=world.entries.get(n.id).root;Object.assign(n,world.placement.snapshot(n.id));n.visible=root.visible;n.keys=[];delete n.rest;}if(ids.has(n.gazeTarget))delete n.gazeTarget;if(n.collision?.ignore){n.collision.ignore=n.collision.ignore.filter(id=>!ids.has(id));if(n.collision.exceptionTiming)n.collision.exceptionTiming=Object.fromEntries(Object.entries(n.collision.exceptionTiming).filter(([id])=>!ids.has(id)));}}if(ids.size>1)p.speech=p.speech.filter(clip=>!ids.has(clip.actorId));else for(const clip of p.speech)if(ids.has(clip.actorId))clip.actorId=null;const used=new Set([...p.nodes.flatMap(n=>[n.asset,n.surface?.texture]),...p.speech.map(c=>c.assetId)]);for(const id of Object.keys(p.assets))if(!used.has(id))delete p.assets[id];});status('Deleted selection and released its links. Undo is available.');});
    register('#duplicate',async()=>{const n=project.nodes.find(n=>n.id===selected);if(!n)return;if(n.kind==='group'){const result=copyGroup(project,n.id);selected=result.rootId;await change(p=>Object.assign(p,result.project));status(`Duplicated group: ${result.count} objects and ${result.speechCount} speech clips. Undo is available.`);return;}const duplicate=copy(n);duplicate.id=crypto.randomUUID();duplicate.name+=' copy';if(duplicate.actionClips)duplicate.actionClips.forEach(c=>c.id=crypto.randomUUID());delete duplicate.seat;if(duplicate.attachment||duplicate.rest){const root=world.entries.get(n.id).root;duplicate.position=root.position.toArray();duplicate.rotation=root.rotation.toArray().slice(0,3);duplicate.scale=root.scale.toArray();duplicate.keys=[];delete duplicate.attachment;delete duplicate.rest;}remapExceptions([n],[duplicate],new Map([[n.id,duplicate.id]]));duplicate.position[0]+=.5;for(const clip of duplicate.actionClips||[])if(clip.travel)for(const point of [clip.travel.from,...(clip.travel.waypoints||[]),clip.travel.to])point[0]+=.5;duplicate.keys=duplicate.keys.map(k=>({...k,position:[k.position[0]+.5,...k.position.slice(1)]}));selected=duplicate.id;await change(p=>p.nodes.push(duplicate));});
    register('#detach-document',()=>change(p=>{const n=p.nodes.find(n=>n.id===selected);if(!n?.attachment)return;const root=world.entries.get(n.id).root;n.position=root.position.toArray();n.rotation=root.rotation.toArray().slice(0,3);n.scale=root.scale.toArray();n.keys=[];delete n.attachment;status('Detached at the current pose. Undo restores the attachment and its transform keys.');}));
    async function travel(delta){if(busy)return;const index=cursor+delta;if(index<0||index>=history.length)return;await install(JSON.parse(history[index]),{record:false});cursor=index;dirty=true;try{if(history[index].length<4*1024*1024)localStorage.setItem('animationstage.native3d.autosave.v1',history[index]);else localStorage.removeItem('animationstage.native3d.autosave.v1');}catch{}$('#undo').disabled=cursor<=0;$('#redo').disabled=cursor>=history.length-1;$('#save-state').textContent='Unsaved changes';}
    register('#undo',()=>travel(-1));register('#redo',()=>travel(1));
    register('#frame',()=>world.frameSelection());register('#play',async()=>{await world.play();$('#play').textContent=world.playing?'❚❚ Pause':'▶ Play';});register('#rewind',()=>{world.stop();world.seek(0);refreshInspector();});
    $('#time').oninput=event=>{if(!busy){const time=Number(event.currentTarget.value);world.stop();world.seek(time);refreshInspector();}};
    $('#quality').onchange=()=>{world.setQuality($('#quality').value);status('Viewport quality changed. Project geometry and saved scene are unchanged.');};
    document.querySelectorAll('[data-mode]').forEach(button=>button.onclick=()=>{world.setMode(button.dataset.mode);document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===world.gizmo.getMode())));});
    $('#snap').onchange=editingUI.updateSnap;
    register('#camera-view',()=>{world.setCameraView(!world.cameraView);$('#camera-view').setAttribute('aria-pressed',world.cameraView);$('#view-mode').textContent=world.cameraView?'· Camera':'· Editor';world.seek(world.time);});
    register('#use-view',()=>change(p=>{p.camera.position=world.camera.position.toArray();p.camera.target=world.orbit.target.toArray();}));
    register('#use-camera',()=>change(p=>{const entry=world.entries.get(selected);if(entry?.node.kind!=='camera')throw Error('Select a camera object first');const camera=entry.root.children[0],point=camera.getWorldPosition(world.camera.position.clone());p.camera.position=point.toArray();p.camera.target=point.add(camera.getWorldDirection(point.clone()).multiplyScalar(5)).toArray();}));
    register('#key',()=>change(p=>{const n=p.nodes.find(n=>n.id===selected);if(!n)throw Error('Select an object first');const t=Number(world.time.toFixed(2)),transform=sampleTransform(n,t);if(!n.keys.length&&t>0)n.keys.push({time:0,position:[...n.position],rotation:[...n.rotation],scale:[...n.scale]});putTransformKey(n,transform,t);}));
    register('#clear-keys',()=>change(p=>{const n=p.nodes.find(n=>n.id===selected);if(n){const t=sampleTransform(n,world.time);Object.assign(n,t);n.keys=[];for(const clip of n.actionClips||[])delete clip.travel;}}));
    $('#project-name').onchange=()=>change(p=>p.name=$('#project-name').value).catch(error);
    $('#duration').onchange=()=>change(p=>{const length=Number($('#duration').value);if(p.nodes.some(n=>n.keys.some(k=>k.time>length)||n.action.start>length))throw Error('Move or remove keys/actions beyond the new duration first');p.duration=length;}).catch(error);
    form.onsubmit=event=>{event.preventDefault();let blockedFeedback=null;change(p=>{const n=p.nodes.find(n=>n.id===selected);if(!n)return;solidityUI.applyPending(p);const f=form.elements;n.name=f.name.value;n.visible=f.visible.checked;n.parent=f.parent.value||null;n.color=f.color.value;
        for(const k of ['position','rotation','scale'])n[k]=[0,1,2].map(i=>Number(f[k+i].value)*(k==='rotation'?Math.PI/180:1));
        if(!n.rest){if(n.parent!==world.entries.get(n.id).node.parent&&(world.placement.settings.prevent||world.placement.settings.snap))throw Error('Turn off placement modes before changing Parent, or use Create Group to preserve placement.');Object.assign(n,world.placement.adjusted(n.id,n));blockedFeedback=world.placement.feedback;}
        if(n.keys.length&&['position','rotation','scale'].some(field=>n[field].some((v,i)=>Math.abs(v-sampleTransform(world.entries.get(n.id).node,world.time)[field][i])>.0001))){putTransformKey(n,{position:n.position,rotation:n.rotation,scale:n.scale},world.time);}
        if(n.kind==='character'){n.outfit=Number(f.outfit.value);const editedAction={name:f.action.value,start:Number(f.actionStart.value),duration:Number(f.actionDuration.value)};if(n.actionClips&&['name','start','duration'].some(k=>editedAction[k]!==inspectorActionSnapshot?.[k])){const id=inspectorActionSnapshot?.id||'inspector-'+n.id;const previous=n.actionClips.find(c=>c.id===id);n.actionClips=n.actionClips.filter(c=>c.id!==id);if(editedAction.name!=='idle'){const clip={...previous,id,...editedAction};if(clip.travel&&!travelGaits.includes(clip.name)){removeTravelKeys(n,new Set([id]));delete clip.travel;}else if(clip.travel&&(Math.abs(clip.start-previous.start)>.000001||Math.abs(clip.duration-previous.duration)>.000001))retimeTravel(n,clip);n.actionClips.push(clip);}else removeTravelKeys(n,new Set([id]));n.actionClips.sort((a,b)=>a.start-b.start);}n.action=editedAction;n.gaze=f.gaze.value;n.gazeTarget=f.gazeTarget.value;
            if(f.seatChair.value){n.seat={chairId:f.seatChair.value,start:Number(f.sitStart.value),sitDuration:Number(f.sitDuration.value),standAt:f.standAt.value===''?null:Number(f.standAt.value),standDuration:Number(f.standDuration.value)};if(['sit','stand'].includes(n.action.name))n.action.name='idle';}else delete n.seat;
        }
        if(grippableKinds.includes(n.kind)){if(f.holdActor.value)n.attachment={actorId:f.holdActor.value,hand:f.holdHand.value,start:Number(f.holdStart.value),end:f.holdEnd.value===''?null:Number(f.holdEnd.value),...(n.attachment?.anchor?{anchor:n.attachment.anchor}:{}),...attachUI.read(),...gripUI.read()};else delete n.attachment;}
        if(n.kind==='text')n.text=f.text.value;if(n.kind==='light')n.intensity=Number(f.intensity.value);if(n.kind==='model')n.clip=Number(f.clip.value);
    }).then(()=>{if(blockedFeedback){world.placement.restoreFeedback(blockedFeedback);world.request();contactUI.render();}}).catch(error);};
    sf.onsubmit=event=>{event.preventDefault();change(p=>{const f=sf.elements;if(world.cameraDraft)p.camera=structuredClone(world.cameraDraft);p.background=f.background.value;p.ambient=Number(f.ambient.value);p.camera.fov=Number(f.fov.value);p.viewerStart={position:['X','Y','Z'].map(a=>Number(f['viewer'+a].value)),yaw:Number(f.viewerYaw.value)*Math.PI/180,eyeHeight:Number(f.eyeHeight.value)};}).catch(error);};
    $('#project-file').onchange=async event=>{const file=event.target.files[0];event.target.value='';if(!file)return;try{if(file.size>190*1024*1024)throw Error('Project exceeds the 190 MB file limit');const candidate=validateProject(JSON.parse(await file.text()));if(dirty&&!confirm('Open this project? Save your current work first.'))return;selected=null;await install(candidate,{reset:true});dirty=false;$('#save-state').textContent='Opened '+file.name;status('Native 3D project opened.');}catch(e){error(e);}};
    $('#model-file').onchange=async event=>{const file=event.target.files[0];event.target.value='';if(!file)return;try{if(file.size>32*1024*1024)throw Error('Import a GLB smaller than 32 MB');const buffer=await file.arrayBuffer();readGLB(buffer);const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve('data:model/gltf-binary;base64,'+reader.result.split(',')[1]);reader.onerror=reject;reader.readAsDataURL(new Blob([buffer]));});const id=crypto.randomUUID(),node=createNode('model',{name:file.name,asset:id,clip:0});selected=node.id;await change(p=>{p.assets[id]={name:file.name,type:'glb',data};p.nodes.push(node);});status('Imported embedded GLB. Transform and animation clip settings are in the inspector.');}catch(e){error(e);}};
    window.addEventListener('keydown',event=>{if(busy||world.exporting||document.querySelector('dialog[open]')||event.target.closest('input,select,textarea'))return;const command=event.ctrlKey||event.metaKey;if(command&&event.key.toLowerCase()==='s'){event.preventDefault();$('#save').click();return;}if(command&&event.key.toLowerCase()==='z'){event.preventDefault();travel(event.shiftKey?1:-1).catch(error);return;}if(event.key===' '&&!event.target.closest('button,summary,a')){event.preventDefault();$('#play').click();}if(['w','e','r'].includes(event.key.toLowerCase()))document.querySelector(`[data-mode="${({w:'translate',e:'rotate',r:'scale'})[event.key.toLowerCase()]}"]`).click();if(event.key.toLowerCase()==='f')world.frameSelection();if(event.key==='Delete')$('#delete').click();});
    window.addEventListener('beforeunload',e=>{if(dirty||world?.exporting){e.preventDefault();e.returnValue='';}});
    const windowPreview=mountWindowPreview({getWorld:()=>world,getProject:()=>project,install,status});document.addEventListener('preview-window-request',()=>windowPreview.open());
    window.Native3D=Object.freeze({get project(){return project;},get world(){return world;},select,install,validateProject,exportMovie:movieUI.export});
}
