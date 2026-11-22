import {World,readGLB} from './world.mjs';
import {createProject,createNode,validateProject,demoProject,sampleTransform} from './project.mjs';
const $=s=>document.querySelector(s), copy=o=>JSON.parse(JSON.stringify(o));
const status=(text,error=false)=>{ $('#status').textContent=text;$('#status').dataset.error=String(error); };
let world,project,selected=null,busy=false,dirty=false,history=[],cursor=-1,recovery=null;
const form=$('#object-form'), sf=$('#scene-form');
for(const [field,label] of [['position','Pos'],['rotation','Rot'],['scale','Size']]) {
    const row=document.createElement('label');row.textContent=label;const triple=document.createElement('span');triple.className='triple';
    for(const [i,axis]of ['X','Y','Z'].entries()){const input=document.createElement('input');input.type='number';input.step=field==='rotation'?'5':'.1';input.name=field+i;input.setAttribute('aria-label',`${field} ${axis}`);input.required=true;triple.append(input);}row.append(triple);$('#transform-fields').append(row);
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
    if(busy)return false;const candidate=validateProject(next),time=reset?0:world.time;
    if(!reset)candidate.view={position:world.camera.position.toArray(),target:world.orbit.target.toArray()};loading(true);
    try{await world.load(candidate);world.seek(time);project=candidate;if(reset){history=[];cursor=-1;}if(record)checkpoint();refresh();return true;}
    finally{loading(false);$('#undo').disabled=cursor<=0;$('#redo').disabled=cursor>=history.length-1;}
}
function select(id){selected=project?.nodes.some(n=>n.id===id)?id:null;world.select(selected);refreshHierarchy();refreshInspector();refreshKeys();}
function refresh(){ $('#project-name').value=project.name;$('#duration').value=project.duration;$('#time').max=project.duration;
    sf.elements.background.value=project.background;sf.elements.ambient.value=project.ambient;sf.elements.fov.value=project.camera.fov;
    ['X','Y','Z'].forEach((a,i)=>sf.elements['viewer'+a].value=project.viewerStart.position[i]);sf.elements.viewerYaw.value=project.viewerStart.yaw*180/Math.PI;sf.elements.eyeHeight.value=project.viewerStart.eyeHeight;
    select(project.nodes.some(n=>n.id===selected)?selected:null);$('#play').textContent=world.playing?'❚❚ Pause':'▶ Play';
}
function refreshHierarchy(){
    const tree=$('#hierarchy');tree.replaceChildren();$('#object-count').textContent=project.nodes.length;
    function append(parent,depth){for(const n of project.nodes.filter(n=>n.parent===parent)){
        const button=document.createElement('button');button.type='button';button.role='treeitem';button.dataset.id=n.id;button.setAttribute('aria-selected',String(n.id===selected));button.setAttribute('aria-level',depth+1);button.style.paddingLeft=(8+depth*12)+'px';
        const icon=document.createElement('span');icon.textContent=n.kind==='character'?'♟':n.kind==='group'?'▱':n.kind==='light'?'☼':n.kind==='camera'?'▣':'◇';
        const name=document.createElement('span');name.textContent=n.name;const badge=document.createElement('small');badge.textContent=n.visible?n.kind:'hidden';button.append(icon,name,badge);button.onclick=()=>select(n.id);tree.append(button);append(n.id,depth+1);
    }}append(null,0);
    $('#duplicate').disabled=!selected||busy;$('#delete').disabled=!selected||busy;
}
function refreshInspector(){
    const n=project.nodes.find(n=>n.id===selected);form.hidden=!n;$('#empty-selection').hidden=!!n;if(!n)return;
    form.elements.name.value=n.name;form.elements.visible.checked=n.visible;form.elements.color.value=n.color;
    const transform=sampleTransform(n,world.time);for(const k of ['position','rotation','scale'])transform[k].forEach((v,i)=>form.elements[k+i].value=Number((k==='rotation'?v*180/Math.PI:v).toFixed(4)));
    form.elements.parent.replaceChildren(new Option('World',''));
    const descendants=new Set([n.id]);let old;do{old=descendants.size;project.nodes.filter(o=>descendants.has(o.parent)).forEach(o=>descendants.add(o.id));}while(old!==descendants.size);
    for(const group of project.nodes.filter(o=>o.kind==='group'&&!descendants.has(o.id)))form.elements.parent.add(new Option(group.name,group.id));form.elements.parent.value=n.parent||'';
    $('[data-text]').hidden=n.kind!=='text';form.elements.text.value=n.text||'';
    $('[data-character]').hidden=n.kind!=='character';form.elements.outfit.value=n.outfit||0;form.elements.action.value=n.action.name;form.elements.actionStart.value=n.action.start;form.elements.actionDuration.value=n.action.duration;
    form.elements.gaze.value=n.gaze||'manual';form.elements.gazeTarget.replaceChildren(new Option('Choose a character',''));for(const other of project.nodes.filter(o=>o.kind==='character'&&o.id!==n.id))form.elements.gazeTarget.add(new Option(other.name,other.id));form.elements.gazeTarget.value=n.gazeTarget||'';
    $('[data-light]').hidden=n.kind!=='light';form.elements.intensity.value=n.intensity??2;
    $('[data-model]').hidden=n.kind!=='model';form.elements.clip.replaceChildren(new Option('No animation','-1'));world.entries.get(n.id)?.clips.forEach((clip,i)=>form.elements.clip.add(new Option(clip.name||`Clip ${i+1}`,String(i))));form.elements.clip.value=String(n.clip??0);
    $('[data-material]').hidden=['character','model','group','camera'].includes(n.kind);$('#key-warning').hidden=!n.keys.length;
}
function refreshKeys(){const list=$('#key-list');list.replaceChildren();const node=project.nodes.find(n=>n.id===selected);if(!node?.keys.length){list.textContent='Select an object and add keys to animate its transform.';return;}for(const key of node.keys){const button=document.createElement('button');button.textContent=`◆ ${key.time.toFixed(2)} s`;button.onclick=()=>{world.stop();world.seek(key.time);refreshInspector();};list.append(button);}}
async function change(update){if(busy)return;world.stop();const next=copy(project);update(next);await install(next);}
async function add(){const kind=$('#add-kind').value;let n;
    if(['amaka','tunde'].includes(kind))n=createNode('character',{preset:kind,name:kind==='amaka'?'Amaka':'Tunde'});
    else n=createNode(kind,{...(kind==='text'?{text:'3D Text'}:{}),...(kind==='light'?{position:[3,5,3],intensity:2}:{}),...(kind==='plane'?{scale:[10,1,10]}:{}),...(kind==='camera'?{position:[0,1.65,4]}:{})});
    selected=n.id;await change(p=>p.nodes.push(n));status(`Added ${n.name}. Use Move, Rotate or Scale in the viewport.`);
}
function register(selector,handler){$(selector).addEventListener('click',()=>Promise.resolve().then(handler).catch(error));}
try{
    world=new World($('#viewport'),{onSelect:select,onChange:()=>{checkpoint();refreshInspector();refreshKeys();},onTime:t=>{$('#time').value=t;$('#time-label').textContent=t.toFixed(2)+' s';$('#play').textContent=world?.playing?'❚❚ Pause':'▶ Play';},onError:text=>status(text,true),onStats:s=>{$('#stats').textContent=`${s.quality} · ${s.calls} draws · ${Math.round(s.triangles/1000)}k triangles`;$('#stats').title=s.hardware;}});
    try{recovery=localStorage.getItem('animationstage.native3d.autosave.v1');}catch{}
    await install(demoProject(),{reset:true});dirty=false;$('#save-state').textContent='Example · save a copy';status('Native 3D workspace ready. Add objects, select them and edit their transforms.');
    try{if(recovery)localStorage.setItem('animationstage.native3d.autosave.v1',recovery);else localStorage.removeItem('animationstage.native3d.autosave.v1');}catch{}
    $('#recover').hidden=!recovery;
}catch(e){error(e);$('#loading').hidden=true;}
if(world){
    register('#add',add);register('#import',()=>$('#model-file').click());register('#open',()=>$('#project-file').click());
    register('#recover',async()=>{if(dirty&&!confirm('Restore the browser recovery copy? Save current work first.'))return;await install(JSON.parse(recovery),{reset:true});status('Restored browser recovery copy. Save it to a project file.');});
    register('#new',async()=>{if(dirty&&!confirm('Create a new scene? Save your current project first.'))return;selected=null;const p=createProject();p.nodes=[createNode('plane',{name:'Ground',scale:[10,1,10],color:'#9caeb5'}),createNode('light',{name:'Key light',position:[3,5,4],intensity:2,color:'#fff3dd'})];await install(p,{reset:true});status('New native 3D scene.');});
    register('#example',async()=>{if(dirty&&!confirm('Open the native classroom? Save your current project first.'))return;selected=null;await install(demoProject(),{reset:true});status('Native classroom: independent furniture and two characters share one 3D world. Speech remains in the existing editor.');});
    register('#save',()=>{project.view={position:world.camera.position.toArray(),target:world.orbit.target.toArray()};const data=validateProject(project);download(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),fileName('.stage3d'));dirty=false;$('#save-state').textContent='Project file downloaded';status('Saved portable .stage3d project with embedded imported assets.');});
    register('#export',async()=>{world.stop();if($('#export-type').value==='png'){const bytes=Uint8Array.from(atob(world.screenshot().split(',')[1]),c=>c.charCodeAt(0));download(new Blob([bytes],{type:'image/png'}),fileName('.png'));status('Exported viewport image without editor helpers.');}else{loading(true);try{download(new Blob([await world.exportGLB()],{type:'model/gltf-binary'}),fileName('.glb'));status('Exported GLB snapshot. Editable animation stays in the .stage3d project.');}finally{loading(false);}}});
    register('#delete',async()=>{if(!selected||busy)return;const ids=new Set([selected]);let previous;do{previous=ids.size;project.nodes.filter(n=>ids.has(n.parent)).forEach(n=>ids.add(n.id));}while(previous!==ids.size);if(ids.size>1&&!confirm(`Delete this group and its ${ids.size-1} child objects?`))return;selected=null;await change(p=>{p.nodes=p.nodes.filter(n=>!ids.has(n.id));const used=new Set(p.nodes.map(n=>n.asset));for(const id of Object.keys(p.assets))if(!used.has(id))delete p.assets[id];});status('Deleted selection. Undo is available.');});
    register('#duplicate',async()=>{const n=project.nodes.find(n=>n.id===selected);if(!n)return;if(n.kind==='group')throw Error('Duplicate individual objects in this first workspace; group duplication comes later.');const duplicate=copy(n);duplicate.id=crypto.randomUUID();duplicate.name+=' copy';duplicate.position[0]+=.5;duplicate.keys=duplicate.keys.map(k=>({...k,position:[k.position[0]+.5,...k.position.slice(1)]}));selected=duplicate.id;await change(p=>p.nodes.push(duplicate));});
    async function travel(delta){if(busy)return;const index=cursor+delta;if(index<0||index>=history.length)return;await install(JSON.parse(history[index]),{record:false});cursor=index;dirty=true;try{if(history[index].length<4*1024*1024)localStorage.setItem('animationstage.native3d.autosave.v1',history[index]);else localStorage.removeItem('animationstage.native3d.autosave.v1');}catch{}$('#undo').disabled=cursor<=0;$('#redo').disabled=cursor>=history.length-1;$('#save-state').textContent='Unsaved changes';}
    register('#undo',()=>travel(-1));register('#redo',()=>travel(1));
    register('#frame',()=>world.frameSelection());register('#play',()=>{world.play();$('#play').textContent=world.playing?'❚❚ Pause':'▶ Play';});register('#rewind',()=>{world.stop();world.seek(0);refreshInspector();});
    $('#time').oninput=()=>{if(!busy){world.stop();world.seek(Number($('#time').value));refreshInspector();}};
    $('#quality').onchange=()=>{world.setQuality($('#quality').value);status('Viewport quality changed. Project geometry and saved scene are unchanged.');};
    document.querySelectorAll('[data-mode]').forEach(button=>button.onclick=()=>{world.setMode(button.dataset.mode);document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));});
    $('#snap').onchange=()=>{const active=$('#snap').checked;world.gizmo.setTranslationSnap(active?.1:null);world.gizmo.setRotationSnap(active?Math.PI/12:null);world.gizmo.setScaleSnap(active?.1:null);};
    register('#camera-view',()=>{world.setCameraView(!world.cameraView);$('#camera-view').setAttribute('aria-pressed',world.cameraView);$('#view-mode').textContent=world.cameraView?'· Camera':'· Editor';world.seek(world.time);});
    register('#use-view',()=>change(p=>{p.camera.position=world.camera.position.toArray();p.camera.target=world.orbit.target.toArray();}));
    register('#use-camera',()=>change(p=>{const entry=world.entries.get(selected);if(entry?.node.kind!=='camera')throw Error('Select a camera object first');const camera=entry.root.children[0],point=camera.getWorldPosition(world.camera.position.clone());p.camera.position=point.toArray();p.camera.target=point.add(camera.getWorldDirection(point.clone()).multiplyScalar(5)).toArray();}));
    register('#key',()=>change(p=>{const n=p.nodes.find(n=>n.id===selected);if(!n)throw Error('Select an object first');const t=Number(world.time.toFixed(2)),transform=sampleTransform(n,t);if(!n.keys.length&&t>0)n.keys.push({time:0,position:[...n.position],rotation:[...n.rotation],scale:[...n.scale]});n.keys=n.keys.filter(k=>Math.abs(k.time-t)>.001);n.keys.push({time:t,...transform});n.keys.sort((a,b)=>a.time-b.time);}));
    register('#clear-keys',()=>change(p=>{const n=p.nodes.find(n=>n.id===selected);if(n){const t=sampleTransform(n,world.time);Object.assign(n,t);n.keys=[];}}));
    $('#project-name').onchange=()=>change(p=>p.name=$('#project-name').value).catch(error);
    $('#duration').onchange=()=>change(p=>{const length=Number($('#duration').value);if(p.nodes.some(n=>n.keys.some(k=>k.time>length)||n.action.start>length))throw Error('Move or remove keys/actions beyond the new duration first');p.duration=length;}).catch(error);
    form.onsubmit=event=>{event.preventDefault();change(p=>{const n=p.nodes.find(n=>n.id===selected);if(!n)return;const f=form.elements;n.name=f.name.value;n.visible=f.visible.checked;n.parent=f.parent.value||null;n.color=f.color.value;
        for(const k of ['position','rotation','scale'])n[k]=[0,1,2].map(i=>Number(f[k+i].value)*(k==='rotation'?Math.PI/180:1));
        if(n.keys.length){n.keys=n.keys.filter(k=>Math.abs(k.time-world.time)>.001);n.keys.push({time:world.time,position:[...n.position],rotation:[...n.rotation],scale:[...n.scale]});n.keys.sort((a,b)=>a.time-b.time);}
        if(n.kind==='character'){n.outfit=Number(f.outfit.value);n.action={name:f.action.value,start:Number(f.actionStart.value),duration:Number(f.actionDuration.value)};n.gaze=f.gaze.value;n.gazeTarget=f.gazeTarget.value;}
        if(n.kind==='text')n.text=f.text.value;if(n.kind==='light')n.intensity=Number(f.intensity.value);if(n.kind==='model')n.clip=Number(f.clip.value);
    }).catch(error);};
    sf.onsubmit=event=>{event.preventDefault();change(p=>{const f=sf.elements;p.background=f.background.value;p.ambient=Number(f.ambient.value);p.camera.fov=Number(f.fov.value);p.viewerStart={position:['X','Y','Z'].map(a=>Number(f['viewer'+a].value)),yaw:Number(f.viewerYaw.value)*Math.PI/180,eyeHeight:Number(f.eyeHeight.value)};}).catch(error);};
    $('#project-file').onchange=async event=>{const file=event.target.files[0];event.target.value='';if(!file)return;try{if(file.size>190*1024*1024)throw Error('Project exceeds the 190 MB file limit');const candidate=validateProject(JSON.parse(await file.text()));if(dirty&&!confirm('Open this project? Save your current work first.'))return;selected=null;await install(candidate,{reset:true});dirty=false;$('#save-state').textContent='Opened '+file.name;status('Native 3D project opened.');}catch(e){error(e);}};
    $('#model-file').onchange=async event=>{const file=event.target.files[0];event.target.value='';if(!file)return;try{if(file.size>32*1024*1024)throw Error('Import a GLB smaller than 32 MB');const buffer=await file.arrayBuffer();readGLB(buffer);const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve('data:model/gltf-binary;base64,'+reader.result.split(',')[1]);reader.onerror=reject;reader.readAsDataURL(new Blob([buffer]));});const id=crypto.randomUUID(),node=createNode('model',{name:file.name,asset:id,clip:0});selected=node.id;await change(p=>{p.assets[id]={name:file.name,type:'glb',data};p.nodes.push(node);});status('Imported embedded GLB. Transform and animation clip settings are in the inspector.');}catch(e){error(e);}};
    window.addEventListener('keydown',event=>{if(busy||event.target.closest('input,select,textarea'))return;const command=event.ctrlKey||event.metaKey;if(command&&event.key.toLowerCase()==='s'){event.preventDefault();$('#save').click();return;}if(command&&event.key.toLowerCase()==='z'){event.preventDefault();travel(event.shiftKey?1:-1).catch(error);return;}if(event.key===' '){event.preventDefault();$('#play').click();}if(['w','e','r'].includes(event.key.toLowerCase()))document.querySelector(`[data-mode="${({w:'translate',e:'rotate',r:'scale'})[event.key.toLowerCase()]}"]`).click();if(event.key.toLowerCase()==='f')world.frameSelection();if(event.key==='Delete')$('#delete').click();});
    window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
    window.Native3D=Object.freeze({get project(){return project;},get world(){return world;},select,install,validateProject});
}
