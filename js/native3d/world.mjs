import {addDrawingGeometry} from './drawing-geometry.mjs';
import {syncTravelEndpoint} from './travel.mjs';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import fontData from 'three/examples/fonts/helvetiker_regular.typeface.json';
import { createWorldActor } from '../realistic-3d-renderer.mjs';
import { sampleTransform,seatBlend,seatForActions,attachmentActive,sampleAction,cameraAt,grippableKinds } from './project.mjs';
import {SpeechPlayer,speechAt,drawCaptions} from './speech.mjs';
import {createGripEditor} from './grip-edit.mjs';
import {gripAnchor,clearPaper} from './grip-placement.mjs';
import {mountNavigation} from './navigation.mjs';
import {applySurface} from './surface.mjs';
import {shapeValues} from './shapes.mjs';
import {createPlacement} from './placement.mjs';

const font = new FontLoader().parse(fontData);
const v = a => new THREE.Vector3().fromArray(a);
const visible=root=>{for(let item=root;item;item=item.parent)if(!item.visible)return false;return true;};
function material(color) {return new THREE.MeshStandardMaterial({color,roughness:.8});}
function box(group,size,position,color) {const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),material(color));mesh.position.fromArray(position);group.add(mesh);return mesh;}
export function readGLB(buffer) {
    const view=new DataView(buffer);
    if(buffer.byteLength<20||view.getUint32(0,true)!==0x46546c67||view.getUint32(4,true)!==2||view.getUint32(8,true)!==buffer.byteLength||view.getUint32(16,true)!==0x4e4f534a)throw Error('Choose a valid GLB 2.0 file');
    const length=view.getUint32(12,true);
    if(length>buffer.byteLength-20)throw Error('Invalid GLB JSON chunk');
    const data=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,20,length)).trim());
    for(const resource of [...(data.buffers||[]),...(data.images||[])])if(resource.uri&&!resource.uri.startsWith('data:'))throw Error('GLB must embed all buffers and textures; external URLs are not loaded');
    if(data.extensionsRequired?.some(n=>['KHR_draco_mesh_compression','EXT_meshopt_compression','KHR_texture_basisu'].includes(n)))throw Error('This GLB needs a compression decoder. Export an uncompressed GLB for this first workspace.');
    return data;
}
export function dataBuffer(data) {const text=atob(data.split(',')[1]);return Uint8Array.from(text,c=>c.charCodeAt(0)).buffer;}
export async function makeObject(node,assets) {
    const root=new THREE.Group();root.name=node.name;root.userData.nodeId=node.id;
    let actor,mixer,clips=[];const retired=new Set();
    try {
        const c=node.color;
        if(node.kind==='drawing') {addDrawingGeometry(root,node);}
        else if(node.kind==='character') {actor=await createWorldActor(node.preset);root.add(actor.group);actor.pose({outfit:node.outfit||0});}
        else if(node.kind==='model') {
            const buffer=dataBuffer(assets[node.asset].data);readGLB(buffer);
            const loader=new GLTFLoader();loader.register(parser=>{parser.textureLoader=new THREE.TextureLoader(parser.options.manager);return {name:'StageEmbeddedTextures'};});
            const gltf=await loader.parseAsync(buffer,'');gltf.scene.traverse(o=>{delete o.userData.nodeId;});root.add(gltf.scene);clips=gltf.animations;
            if(clips.length){mixer=new THREE.AnimationMixer(gltf.scene);const index=node.clip??0;if(clips[index])mixer.clipAction(clips[index]).play();}
        }
        else if(node.kind==='chair') {
            box(root,[.48,.055,.48],[0,.46,0],c);box(root,[.48,.5,.055],[0,.75,-.215],c);
            for(const x of [-.19,.19])for(const z of [-.19,.19])box(root,[.045,.44,.045],[x,.22,z],'#48525e');
        } else if(node.kind==='table') {
            box(root,[1.5,.06,.85],[0,.74,0],c);for(const x of [-.65,.65])for(const z of [-.33,.33])box(root,[.06,.71,.06],[x,.355,z],'#48525e');
        } else if(node.kind==='document') {
            box(root,[.21,.297,.003],[0,.1485,0],c);for(let i=0;i<6;i++)box(root,[i?.155:.12,.003,.001],[0,.25-i*.025,.002],'#47566a');
        } else if(node.kind==='emoji') {
            const mesh=new THREE.Mesh(new THREE.SphereGeometry(.3,32,20),material('#ffd34e'));root.add(mesh);mesh.position.y=.3;
            for(const x of [-.105,.105]){const eye=new THREE.Mesh(new THREE.SphereGeometry(.027,12,8),material('#243045'));eye.position.set(x,.36,.275);root.add(eye);}
            const smile=new THREE.Mesh(new THREE.TorusGeometry(.125,.014,8,32,Math.PI),material('#243045'));smile.rotation.z=Math.PI;smile.position.set(0,.28,.28);root.add(smile);
        } else if(node.kind==='text') {
            const mesh=new THREE.Mesh(new TextGeometry(node.text||'3D Text',{font,size:.22,depth:.025,curveSegments:4,bevelEnabled:false}),material(c));root.add(mesh);
        } else if(node.kind==='light') {const light=new THREE.DirectionalLight(c,node.intensity??2);light.castShadow=true;light.shadow.mapSize.set(1024,1024);light.shadow.camera.left=-8;light.shadow.camera.right=8;light.shadow.camera.top=8;light.shadow.camera.bottom=-8;light.shadow.normalBias=.03;root.add(light);}
        else if(node.kind==='camera') {const camera=new THREE.PerspectiveCamera(45,16/9,.05,500);root.add(camera);}
        else if(node.kind!=='group') {
            const s=shapeValues(node);
            const geometry=node.kind==='sphere'?new THREE.SphereGeometry(s.radius,32,20):node.kind==='cylinder'?new THREE.CylinderGeometry(s.radiusTop,s.radiusBottom,s.height,24):node.kind==='plane'?new THREE.PlaneGeometry(s.width,s.depth):new THREE.BoxGeometry(s.width,s.height,s.depth);
            const mesh=new THREE.Mesh(geometry,material(c));if(node.kind==='plane')mesh.rotation.x=-Math.PI/2;else mesh.position.y=node.kind==='sphere'?s.radius:s.height/2;root.add(mesh);
        }
        await applySurface(root,node,assets,retired);
        root.traverse(o=>{if(o.isMesh){o.castShadow=node.castShadow??node.kind!=='plane';o.receiveShadow=true;}});
        return {root,actor,mixer,clips,node,dispose(){mixer?.stopAllAction();actor?.dispose();disposeObject(root,retired);}};
    }catch(error){actor?.dispose();disposeObject(root,retired);throw error;}
}
function disposeObject(root,extras=[]) {
    const geometries=new Set(),materials=new Set(),textures=new Set(extras);
    root.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);for(const m of [o.material].flat()){materials.add(m);for(const value of Object.values(m))if(value?.isTexture)textures.add(value);}}if(o.isLight)o.shadow?.dispose();});
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());root.removeFromParent();
}
export class World {
    constructor(canvas,{onSelect,onChange,onStats,onTime,onError,onGripMode}) {
        Object.assign(this,{canvas,onSelect,onChange,onStats,onTime,onError,onGripMode});this.entries=new Map();this.time=0;this.playing=false;this.cameraView=false;this.quality='balanced';
        this.audio=new SpeechPlayer();this.playRequest=0;this.starting=false;this.captionEntries=[];
        this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
        this.scene=new THREE.Scene();this.content=new THREE.Group();this.scene.add(this.content);
        this.ambient=new THREE.HemisphereLight('#dbeafa','#657268',.8);this.scene.add(this.ambient);
        this.camera=new THREE.PerspectiveCamera(45,1,.05,500);this.camera.position.set(6,4,7);
        this.shot=new THREE.PerspectiveCamera(45,16/9,.05,500);
        this.orbit=new OrbitControls(this.camera,canvas);this.orbit.target.set(0,1,0);this.orbit.addEventListener('change',()=>this.request());
        this.helpers=new THREE.Group();this.scene.add(this.helpers);const grid=new THREE.GridHelper(20,20,'#60758c','#344859');grid.position.y=.003;this.helpers.add(grid,new THREE.AxesHelper(.7));
        this.gizmo=new TransformControls(this.camera,canvas);this.helpers.add(this.gizmo.getHelper());
        this.gizmo.addEventListener('change',()=>this.request());
        this.gizmo.addEventListener('dragging-changed',e=>{this.orbit.enabled=!e.value&&!this.cameraView;if(e.value)this.gripEditor?.startTransform();if(!e.value&&this.selected&&!this.gripEditor?.endTransform()){this.captureTransform();this.onChange();}});
        this.box=new THREE.Box3Helper(new THREE.Box3(),0x78c8ff);this.helpers.add(this.box);this.box.visible=false;
        this.gizmo.addEventListener('objectChange',()=>{this.captureTransform();this.seek(this.time);});
        this.gripEditor=createGripEditor(this);
        this.navigation=mountNavigation(this);
        this.placement=createPlacement(this);
        this.facingArrow=new THREE.ArrowHelper(new THREE.Vector3(0,0,1),new THREE.Vector3(),1,0x55caff);this.cameraArrow=new THREE.ArrowHelper(new THREE.Vector3(0,0,1),new THREE.Vector3(),1,0xffcc66);this.helpers.add(this.facingArrow,this.cameraArrow);this.facingArrow.visible=this.cameraArrow.visible=false;
        const ray=new THREE.Raycaster();let down;
        canvas.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];});
        canvas.addEventListener('pointerup',e=>{
            if(this.suppressPick){this.suppressPick=false;return;}if(!down||this.gizmo.dragging||this.gizmo.axis||Math.hypot(e.clientX-down[0],e.clientY-down[1])>4||this.playing)return;
            const r=canvas.getBoundingClientRect();ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),this.cameraView?this.shot:this.camera);
            for(const hit of ray.intersectObjects(this.content.children,true)){let o=hit.object;while(o&&!o.userData.nodeId)o=o.parent;if(o&&!this.editLocked(o.userData.nodeId)){this.onSelect(o.userData.nodeId);return;}}
            this.onSelect(null);
        });
        this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(canvas.parentElement);this.setQuality('balanced');
        const gl=this.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
        this.hardware=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);
        canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();this.playing=false;this.onError('Graphics context lost. Save your project and reload the workspace.');});
    }
    async load(project) {this.drawingCleanup?.();
        if(this.exporting)throw Error('Finish or cancel movie export before changing the scene');
        this.gripEditor.finish();this.gripPreview=null;this.stop();
        const staged=new Map();
        let audioBuffers;
        try{for(const node of project.nodes)staged.set(node.id,await makeObject(node,project.assets));for(const entry of staged.values())if(entry.mixer&&entry.node.clip!==-1)for(let n=entry.node;n;n=n.parent?project.nodes.find(o=>o.id===n.parent):null)if(n.rest)throw Error('Choose No animation for models inside a surface-linked object');audioBuffers=await this.audio.prepare(project);}
        catch(error){staged.forEach(e=>e.dispose());throw error;}
        this.stop();this.gizmo.detach();this.entries.forEach(e=>e.root.removeFromParent());this.entries.forEach(e=>e.dispose());this.entries=staged;this.project=project;this.placement.settings.prevent=project.collisionProtection===true;this.selected=null;this.facingGuide=null;this.cameraDraft=null;
        this.audio.commit(project,audioBuffers);
        this.uniformIds=new Set();this.uprightIds=new Set();
        const mark=(id,uniform,upright)=>{let node=project.nodes.find(n=>n.id===id);while(node){if(uniform)this.uniformIds.add(node.id);if(upright)this.uprightIds.add(node.id);uniform=true;node=project.nodes.find(n=>n.id===node.parent);}};
        for(const n of project.nodes){if(n.seat){mark(n.id,true,true);mark(n.seat.chairId,false,true);}if(n.attachment){mark(n.attachment.actorId,true,false);if(n.parent)mark(n.parent,true,false);}}
        for(const n of project.nodes)if(n.rest){for(let parent=n.parent?staged.get(n.parent)?.node:null;parent;parent=parent.parent?staged.get(parent.parent)?.node:null)this.uniformIds.add(parent.id);for(let support=n.rest.targetId?staged.get(n.rest.targetId)?.node:null;support;support=support.parent?staged.get(support.parent)?.node:null)this.uprightIds.add(support.id);}
        for(const e of staged.values())(e.node.parent?staged.get(e.node.parent).root:this.content).add(e.root);
        this.scene.background=new THREE.Color(project.background);this.ambient.intensity=project.ambient;
        this.camera.position.fromArray(project.view.position);this.orbit.target.fromArray(project.view.target);this.orbit.update();
        this.shot.position.fromArray(project.camera.position);this.shot.lookAt(v(project.camera.target));this.shot.fov=project.camera.fov;this.shot.updateProjectionMatrix();
        this.seek(0);this.select(null);this.request();
    }
    previewGrip(info){if(this.exporting)throw Error('Finish export first');this.gripEditor.finish();this.stop();if(info){if(!['left','right'].includes(info.hand)||!['palm','edge'].includes(info.gripStyle)||!grippableKinds.includes(this.entries.get(info.objectId)?.node.kind))throw Error('Choose a movable object, hand and grip style');const actor=this.entries.get(info.actorId);if(!actor?.actor)throw Error('Choose a character first');for(const [id,a]of this.activeAttachments||[])if(a.actorId===info.actorId&&id!==info.objectId)throw Error('This character already holds an object at this time. Detach it or change its Hold timing.');}this.gripPreview=info;this.seek(this.time);this.request();}
    rayForPoint(x,y,r){const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2(x/r.width*2-1,-(y/r.height)*2+1),this.cameraView?this.shot:this.camera);return ray.ray;}
    updateFacing(){const e=this.entries.get(this.facingGuide);const show=!!e&&this.facingGuide===this.selected&&!this.cameraView;this.facingArrow.visible=this.cameraArrow.visible=show;if(!show)return;e.root.updateWorldMatrix(true,true);const origin=e.root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,1,0));for(const [arrow,direction]of [[this.facingArrow,new THREE.Vector3(0,0,1).transformDirection(e.root.matrixWorld)],[this.cameraArrow,this.shot.position.clone().sub(origin).normalize()]]){arrow.position.copy(origin);arrow.setDirection(direction);arrow.setLength(1,.18,.1);}}
    editLocked(id){let n=this.entries.get(id)?.node;while(n){if(n.locked)return true;n=n.parent?this.entries.get(n.parent)?.node:null;}return [...this.entries.values()].some(e=>e.node.locked&&this.placement.subtree(id).has(e.node.id));}
    constrained(id){const e=this.entries.get(id);return !!(e&&(e.node.rest||this.activeAttachments?.has(id)||e.node.seat&&seatBlend(seatForActions(e.node),this.time)>0));}
    select(id) {if(id!==this.selected){this.placement?.clearFeedback();this.facingGuide=null;}if(this.gripEditor?.id&&id!==this.gripEditor.id)this.gripEditor.finish();this.selected=this.entries.has(id)?id:null;const entry=this.entries.get(this.selected);this.gizmo.detach();if(entry&&!this.editLocked(id)&&!this.drawingActive&&this.navigationMode==='orbit'&&!this.cameraView&&!this.playing&&(!this.constrained(id)||this.gripEditor?.id===id))this.gizmo.attach(this.gripEditor?.id===id?this.gripEditor.proxy:entry.root);this.updateBox();this.request();}
    updateBox(){const e=this.entries.get(this.selected);this.box.visible=!!e&&!this.cameraView;if(e){e.root.updateWorldMatrix(true,true);this.box.box.setFromObject(e.root);if(this.box.box.isEmpty())this.box.box.setFromCenterAndSize(e.root.getWorldPosition(new THREE.Vector3()),new THREE.Vector3(.2,.2,.2));}}
    captureTransform(){if(this.editLocked(this.selected)){this.seek(this.time);return;}if(this.gripEditor?.id){this.gripEditor.capture();return;}const e=this.entries.get(this.selected);if(!e)return;if(e.node.rest){this.placement.applyRests();return;}e.root.scale.max(new THREE.Vector3(.001,.001,.001));if(this.uniformIds?.has(e.node.id)){const values=e.root.scale.toArray(),axis=values.map((v,i)=>Math.abs(v-e.node.scale[i])).indexOf(Math.max(...values.map((v,i)=>Math.abs(v-e.node.scale[i]))));e.root.scale.setScalar(values[axis]);}if(this.uprightIds?.has(e.node.id)){const forward=new THREE.Vector3(0,0,1).applyQuaternion(e.root.quaternion);e.root.rotation.set(0,Math.atan2(forward.x,forward.z),0);}this.placement.enforce(e.node.id,sampleTransform(e.node,this.time));for(const field of ['position','scale'])e.node[field]=e.root[field].toArray();e.node.rotation=e.root.rotation.toArray().slice(0,3);let key=e.node.keys.find(k=>Math.abs(k.time-this.time)<.001);if(!key&&e.node.keys.length){key={time:this.time};e.node.keys.push(key);e.node.keys.sort((a,b)=>a.time-b.time);}if(key){for(const field of ['position','rotation','scale'])key[field]=[...e.node[field]];syncTravelEndpoint(e.node,key);}}
    setMode(mode){if(this.navigationMode!=='orbit')this.navigation.mode('orbit');if(this.gripEditor?.id&&mode==='scale'){this.onError('Grip mode supports Move and Rotate. Finish adjusting the grip before scaling.');return;}this.gizmo.setMode(mode);this.request();}
    setQuality(quality){this.quality=quality;this.renderer.shadowMap.enabled=quality!=='draft';this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.resize();}
    resize(){if(this.exporting){this.resizeAfterExport=true;return;}const r=this.canvas.parentElement.getBoundingClientRect(),preferred=this.quality==='draft'?.75:this.quality==='high'?Math.min(devicePixelRatio,2):1,ratio=Math.min(preferred,Math.sqrt(4000000/Math.max(1,r.width*r.height)),8192/Math.max(1,r.width,r.height));if(this.renderer.getPixelRatio()!==ratio)this.renderer.setPixelRatio(ratio);this.renderer.setSize(Math.max(1,r.width),Math.max(1,r.height),false);this.camera.aspect=Math.max(1,r.width)/Math.max(1,r.height);this.camera.updateProjectionMatrix();this.shot.aspect=this.camera.aspect;this.shot.updateProjectionMatrix();this.request();}
    setCameraView(value){this.cameraView=value;this.helpers.visible=!value;this.orbit.enabled=!value;this.select(this.selected);this.navigation?.sync();this.request();}
    frameSelection(){this.navigation.fit();}
    seek(time,internal=false){if(Math.abs(time-this.time)>1e-9)this.placement?.clearFeedback();if(this.exporting&&!internal)throw Error('Finish or cancel movie export before seeking');if(this.gripPreview&&Math.abs(time-this.time)>1e-9)this.gripPreview=null;if(this.gripEditor?.id&&Math.abs(time-this.time)>1e-9)this.gripEditor.finish();if(this.playing&&!internal)this.stop();this.time=Math.max(0,Math.min(this.project.duration,time));
        const framing=!this.exporting&&this.cameraDraft||cameraAt(this.project,this.time);this.shot.position.fromArray(framing.position);this.shot.lookAt(new THREE.Vector3().fromArray(framing.target));this.shot.fov=framing.fov;this.shot.updateProjectionMatrix();
        const speech=speechAt(this.project,this.time);this.speechFrames=speech.frames;this.captionEntries=speech.captions;
        for(const e of this.entries.values()) {
            const n=e.node,t=sampleTransform(n,this.time);e.root.position.fromArray(t.position);e.root.rotation.fromArray(t.rotation);e.root.scale.fromArray(t.scale);e.root.visible=n.visible;
        }
        this.content.updateMatrixWorld(true);
        this.activeAttachments=new Map();const hands=new Map();
        for(const e of this.entries.values())if(attachmentActive(e.node,this.time)&&visible(e.root)){const actor=this.entries.get(e.node.attachment.actorId);if(actor&&visible(actor.root)){this.activeAttachments.set(e.node.id,e.node.attachment);hands.set(actor.node.id,{...e.node.attachment,gripStyle:e.node.attachment.gripStyle||(e.node.kind==='document'?'palm':'edge')});}}
        if(this.gripPreview){const current=hands.get(this.gripPreview.actorId);if(!current||this.activeAttachments.has(this.gripPreview.objectId))hands.set(this.gripPreview.actorId,this.gripPreview);}
        for(const e of this.entries.values()) {
            const n=e.node;
            if(e.actor){const a=sampleAction(n,this.time),p=Math.max(0,Math.min(1,(this.time-a.start)/a.duration)),channels={};e.actionSample={...a,progress:p};
                if(a.name==='walk')channels.realistic3DWalk=p;
                if(a.name==='stroll')channels.realistic3DStroll=p;if(a.name==='strut')channels.realistic3DStrut=p;if(a.name==='jog'||a.name==='run')channels.realistic3DJog=p;if(a.name==='natural')channels.realistic3DNaturalWalk=p;if(a.name==='run')channels.realistic3DCycleSteps=Math.max(2,Math.round(a.duration*5));if(a.travel){const distance=e.root.parent.localToWorld(new THREE.Vector3().fromArray(a.travel.to)).distanceTo(e.root.parent.localToWorld(new THREE.Vector3().fromArray(a.travel.from))),stride=(a.name==='run'?.5:a.name==='jog'?.7:.55)*e.root.getWorldScale(new THREE.Vector3()).x;channels.realistic3DCycleSteps=Math.max(2,Math.min(100,Math.round(distance/Math.max(.05,stride))));}
                if(a.name==='wave')channels.realistic3DWave=p;
                if(a.name==='sit')channels.realistic3DSit=p;
                if(a.name==='stand')channels.realistic3DSit=this.time<a.start?1:1-p;
                if(a.name==='nod')channels.realistic3DHeadPitch=Math.sin(p*Math.PI*4)*12;
                let seat=null;
                if(n.seat){const chair=this.entries.get(n.seat.chairId).root;seat={floor:chair.localToWorld(new THREE.Vector3()),top:chair.localToWorld(new THREE.Vector3(0,.4875,0)),forward:new THREE.Vector3(0,0,1).transformDirection(chair.matrixWorld)};channels.realistic3DSit=seatBlend(seatForActions(n),this.time);e.actionSample.sitting=channels.realistic3DSit;}
                const held=hands.get(n.id),hand=held?.hand;
                const voice=this.speechFrames.get(n.id);if(voice){const strength=n.lipSyncStrength??.65;voice.jaw*=strength;voice.lower*=strength;voice.upper*=Math.sqrt(strength);if(Number.isFinite(voice.tongue))voice.tongue*=strength;}
                e.actor.pose({outfit:n.outfit||0,holdStyle:held?.gripStyle==='edge'?'edge':'palm',heldProp:hand==='left'?'documentLeft':hand==='right'?'documentRight':'none'},channels,seat,this.speechFrames.get(n.id)||null);
            }
            if(e.mixer){e.mixer.setTime(this.time);}
        }
        this.applyAttachments();this.placement.applyRests();this.gripEditor?.sync();
        if(!this.playing&&!this.gizmo.dragging&&!this.exporting){this.gizmo.detach();if(this.selected&&!this.editLocked(this.selected)&&!this.drawingActive&&this.navigationMode==='orbit'&&!this.cameraView&&(!this.constrained(this.selected)||this.gripEditor?.id===this.selected))this.gizmo.attach(this.gripEditor?.id===this.selected?this.gripEditor.proxy:this.entries.get(this.selected).root);}
        this.applyGaze();this.placement.protectPlayback();this.updateBox();if(!this.exporting)this.onTime(this.time);this.request();
    }
    applyAttachments(){
        this.attachmentChecks=[];
        for(const [id,attachment]of this.activeAttachments||[]){
            const e=this.entries.get(id),actor=this.entries.get(attachment.actorId),grip=actor.actor.grip(attachment.hand);
            const scale=e.root.getWorldScale(new THREE.Vector3());
            const rotation=grip.rotation.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(...(attachment.rotation||[0,0,0]))));
            const target=grip.point.clone().add(v(attachment.offset||[0,0,0]).multiply(actor.root.getWorldScale(new THREE.Vector3())).applyQuaternion(grip.rotation));
            const localAnchor=gripAnchor(e,grip),position=target.clone().sub(localAnchor.clone().multiply(scale).applyQuaternion(rotation));
            const clearance=clearPaper(e,grip,position,rotation,scale,actor.root.getWorldScale(new THREE.Vector3()).x);target.addScaledVector(new THREE.Vector3(0,0,1).applyQuaternion(rotation),new THREE.Vector3(0,0,1).applyQuaternion(rotation).dot(grip.normal)>=0?clearance.correction:-clearance.correction);
            const matrix=new THREE.Matrix4().compose(position,rotation,scale);
            e.root.parent.updateWorldMatrix(true,false);matrix.premultiply(e.root.parent.matrixWorld.clone().invert());matrix.decompose(e.root.position,e.root.quaternion,e.root.scale);e.root.updateWorldMatrix(false,true);
            const anchor=e.root.localToWorld(localAnchor);
            this.attachmentChecks.push({id,actorId:actor.node.id,hand:attachment.hand,grip:grip.point.toArray(),target:target.toArray(),anchor:anchor.toArray(),pinchDistance:grip.distance,clearance:clearance.minClearance,supportCount:clearance.samples,correction:clearance.correction,error:anchor.distanceTo(target)});
        }
    }
    applyGaze(){
        if(!this.project)return;
        this.content.updateMatrixWorld(true);
        for(const e of this.entries.values())if(e.actor){const n=e.node;let point;
            if(n.gaze==='camera')point=(this.cameraView?this.shot:this.camera).position.clone();
            if(n.gaze==='sceneCamera')point=this.shot.position.clone();
            if(n.gaze==='character'){const other=this.entries.get(n.gazeTarget);if(other?.actor&&visible(other.root))point=other.actor.bone('head').getWorldPosition(new THREE.Vector3());}
            if(n.gaze==='document'){const doc=[...(this.activeAttachments||[])].find(([,a])=>a.actorId===n.id);if(doc)point=this.entries.get(doc[0]).root.localToWorld(new THREE.Vector3(0,.1485,0));}
            if(point)e.actor.aim(point);
        }
    }
    async play(){this.drawingCleanup?.();this.gripPreview=null;this.gripEditor?.finish();if(this.exporting)throw Error('Finish or cancel movie export before playback');if(this.playing||this.starting){this.stop();return;}if(this.time>=this.project.duration)this.seek(0);const token=++this.playRequest;this.starting=true;
        try{await this.audio.start(this.project,this.time,()=>token===this.playRequest);if(token!==this.playRequest)return;this.playing=true;this.gizmo.detach();this.started=performance.now()-this.time*1000;this.request();}finally{if(token===this.playRequest)this.starting=false;}
    }
    stop(){this.playRequest++;this.starting=false;this.playing=false;this.audio?.stop();this.select(this.selected);if(this.project)this.onTime(this.time);}
    request(){if(this.pending||this.exporting)return;this.pending=requestAnimationFrame(now=>{this.pending=0;if(this.exporting)return;try{if(this.playing){const audioTime=this.audio.time(),t=audioTime??(now-this.started)/1000;this.clockSample={audioTime,time:t};this.seek(t,true);if(t>=this.project.duration)this.stop();}this.applyGaze();this.placement.updateDebug();this.updateFacing();this.updateCameraRig?.();this.renderer.render(this.scene,this.cameraView?this.shot:this.camera);this.onStats({calls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles,geometries:this.renderer.info.memory.geometries,textures:this.renderer.info.memory.textures,hardware:this.hardware,quality:this.quality});if(this.playing)this.request();}catch(error){this.stop();this.onError(error.message);}});}
    movieSession(options){this.drawingCleanup?.();
        if(this.exporting)throw Error('A movie export is already running');this.gripPreview=null;this.gripEditor?.finish();this.stop();
        const state={time:this.time,selected:this.selected,size:this.renderer.getSize(new THREE.Vector2()),ratio:this.renderer.getPixelRatio(),shadows:this.renderer.shadowMap.enabled,helpers:this.helpers.visible,cameraView:this.cameraView,orbit:this.orbit.enabled,cameraAspect:this.camera.aspect,shotAspect:this.shot.aspect};
        this.exporting=true;cancelAnimationFrame(this.pending);this.pending=0;let restored=false;
        const restore=()=>{if(restored)return;restored=true;
            try{this.renderer.setSize(state.size.x,state.size.y,false);this.renderer.setPixelRatio(state.ratio);this.renderer.shadowMap.enabled=state.shadows;this.helpers.visible=state.helpers;this.cameraView=state.cameraView;this.orbit.enabled=state.orbit;this.camera.aspect=state.cameraAspect;this.shot.aspect=state.shotAspect;this.camera.updateProjectionMatrix();this.shot.updateProjectionMatrix();}
            finally{this.exporting=false;this.seek(state.time);this.select(state.selected);if(this.resizeAfterExport){this.resizeAfterExport=false;this.resize();}this.request();}
        };
        try{this.gizmo.detach();this.helpers.visible=false;this.orbit.enabled=false;this.cameraView=options.camera==='scene';this.renderer.setPixelRatio(1);this.renderer.setSize(options.width,options.height,false);this.renderer.shadowMap.enabled=options.quality!=='draft';const camera=this.cameraView?this.shot:this.camera;camera.aspect=options.width/options.height;camera.updateProjectionMatrix();
            return {restore,render:(time,canvas,captions=true)=>{if(restored)throw Error('Movie render session has ended');if(this.renderer.getContext().isContextLost())throw Error('Graphics context lost during export. Reload the workspace and retry.');this.seek(time,true);this.applyGaze();this.renderer.render(this.scene,camera);const ctx=canvas.getContext('2d');ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(this.canvas,0,0,canvas.width,canvas.height);if(captions){const settings={...this.project.captionSettings,enabled:true},entries=this.project.captionSettings.enabled?this.captionEntries:speechAt({...this.project,captionSettings:settings},time).captions;drawCaptions(ctx,canvas.width,canvas.height,entries,settings);}}};
        }catch(error){restore();throw error;}
    }
    async exportGLB(){this.drawingCleanup?.();const exporter=new GLTFExporter();return exporter.parseAsync(this.content,{binary:true,onlyVisible:true});}
    screenshot(){this.drawingCleanup?.();const visible=this.helpers.visible;this.helpers.visible=false;this.renderer.render(this.scene,this.cameraView?this.shot:this.camera);const image=document.createElement('canvas');image.width=this.canvas.width;image.height=this.canvas.height;const ctx=image.getContext('2d');ctx.drawImage(this.canvas,0,0);drawCaptions(ctx,image.width,image.height,this.captionEntries,this.project.captionSettings);const url=image.toDataURL('image/png');this.helpers.visible=visible;this.request();return url;}
    dispose(){this.drawingCleanup?.();this.placement?.dispose();this.navigation?.dispose();this.gripEditor?.finish();this.gripEditor?.dispose();cancelAnimationFrame(this.pending);this.audio.dispose();this.observer.disconnect();this.entries.forEach(e=>e.root.removeFromParent());this.entries.forEach(e=>e.dispose());this.orbit.dispose();this.gizmo.dispose();disposeObject(this.helpers);this.renderer.dispose();}
}
