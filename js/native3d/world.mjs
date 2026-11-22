import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import fontData from 'three/examples/fonts/helvetiker_regular.typeface.json';
import { createWorldActor } from '../realistic-3d-renderer.mjs';
import { sampleTransform } from './project.mjs';

const font = new FontLoader().parse(fontData);
const v = a => new THREE.Vector3().fromArray(a);
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
    let actor,mixer,clips=[];
    try {
        const c=node.color;
        if(node.kind==='character') {actor=await createWorldActor(node.preset);root.add(actor.group);actor.pose({outfit:node.outfit||0});}
        else if(node.kind==='model') {
            const buffer=dataBuffer(assets[node.asset].data);readGLB(buffer);
            const loader=new GLTFLoader();loader.register(parser=>{parser.textureLoader=new THREE.TextureLoader(parser.options.manager);return {name:'StageEmbeddedTextures'};});
            const gltf=await loader.parseAsync(buffer,'');root.add(gltf.scene);clips=gltf.animations;
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
            const geometry=node.kind==='sphere'?new THREE.SphereGeometry(.5,32,20):node.kind==='cylinder'?new THREE.CylinderGeometry(.5,.5,1,24):node.kind==='plane'?new THREE.PlaneGeometry(1,1):new THREE.BoxGeometry(1,1,1);
            const mesh=new THREE.Mesh(geometry,material(c));if(node.kind==='plane')mesh.rotation.x=-Math.PI/2;else mesh.position.y=.5;root.add(mesh);
        }
        root.traverse(o=>{if(o.isMesh){o.castShadow=node.kind!=='plane';o.receiveShadow=true;}});
        return {root,actor,mixer,clips,node,dispose(){mixer?.stopAllAction();actor?.dispose();disposeObject(root);}};
    }catch(error){actor?.dispose();disposeObject(root);throw error;}
}
function disposeObject(root) {
    const geometries=new Set(),materials=new Set(),textures=new Set();
    root.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);for(const m of [o.material].flat()){materials.add(m);for(const value of Object.values(m))if(value?.isTexture)textures.add(value);}}if(o.isLight)o.shadow?.dispose();});
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());root.removeFromParent();
}
export class World {
    constructor(canvas,{onSelect,onChange,onStats,onTime,onError}) {
        Object.assign(this,{canvas,onSelect,onChange,onStats,onTime,onError});this.entries=new Map();this.time=0;this.playing=false;this.cameraView=false;this.quality='balanced';
        this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
        this.scene=new THREE.Scene();this.content=new THREE.Group();this.scene.add(this.content);
        this.ambient=new THREE.HemisphereLight('#dbeafa','#657268',.8);this.scene.add(this.ambient);
        this.camera=new THREE.PerspectiveCamera(45,1,.05,500);this.camera.position.set(6,4,7);
        this.shot=new THREE.PerspectiveCamera(45,16/9,.05,500);
        this.orbit=new OrbitControls(this.camera,canvas);this.orbit.target.set(0,1,0);this.orbit.addEventListener('change',()=>this.request());
        this.helpers=new THREE.Group();this.scene.add(this.helpers);const grid=new THREE.GridHelper(20,20,'#60758c','#344859');grid.position.y=.003;this.helpers.add(grid,new THREE.AxesHelper(.7));
        this.gizmo=new TransformControls(this.camera,canvas);this.helpers.add(this.gizmo.getHelper());
        this.gizmo.addEventListener('change',()=>this.request());
        this.gizmo.addEventListener('dragging-changed',e=>{this.orbit.enabled=!e.value;if(!e.value&&this.selected){this.captureTransform();this.onChange();}});
        this.box=new THREE.Box3Helper(new THREE.Box3(),0x78c8ff);this.helpers.add(this.box);this.box.visible=false;
        this.gizmo.addEventListener('objectChange',()=>{this.updateBox();this.request();});
        const ray=new THREE.Raycaster();let down;
        canvas.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];});
        canvas.addEventListener('pointerup',e=>{
            if(!down||this.gizmo.dragging||this.gizmo.axis||Math.hypot(e.clientX-down[0],e.clientY-down[1])>4||this.playing)return;
            const r=canvas.getBoundingClientRect();ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),this.cameraView?this.shot:this.camera);
            for(const hit of ray.intersectObjects(this.content.children,true)){let o=hit.object;while(o&&!o.userData.nodeId)o=o.parent;if(o){this.onSelect(o.userData.nodeId);return;}}
            this.onSelect(null);
        });
        this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(canvas.parentElement);this.setQuality('balanced');
        const gl=this.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
        this.hardware=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);
        canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();this.playing=false;this.onError('Graphics context lost. Save your project and reload the workspace.');});
    }
    async load(project) {
        const staged=new Map();
        try{for(const node of project.nodes)staged.set(node.id,await makeObject(node,project.assets));}
        catch(error){staged.forEach(e=>e.dispose());throw error;}
        this.stop();this.gizmo.detach();this.entries.forEach(e=>e.dispose());this.entries=staged;this.project=project;this.selected=null;
        for(const e of staged.values())(e.node.parent?staged.get(e.node.parent).root:this.content).add(e.root);
        this.scene.background=new THREE.Color(project.background);this.ambient.intensity=project.ambient;
        this.camera.position.fromArray(project.view.position);this.orbit.target.fromArray(project.view.target);this.orbit.update();
        this.shot.position.fromArray(project.camera.position);this.shot.lookAt(v(project.camera.target));this.shot.fov=project.camera.fov;this.shot.updateProjectionMatrix();
        this.seek(0);this.select(null);this.request();
    }
    select(id) {this.selected=this.entries.has(id)?id:null;const entry=this.entries.get(this.selected);this.gizmo.detach();if(entry&&!this.cameraView&&!this.playing)this.gizmo.attach(entry.root);this.updateBox();this.request();}
    updateBox(){const e=this.entries.get(this.selected);this.box.visible=!!e&&!this.cameraView;if(e){e.root.updateWorldMatrix(true,true);this.box.box.setFromObject(e.root);if(this.box.box.isEmpty())this.box.box.setFromCenterAndSize(e.root.getWorldPosition(new THREE.Vector3()),new THREE.Vector3(.2,.2,.2));}}
    captureTransform(){const e=this.entries.get(this.selected);if(!e)return;for(const field of ['position','scale'])e.node[field]=e.root[field].toArray();e.node.rotation=e.root.rotation.toArray().slice(0,3);let key=e.node.keys.find(k=>Math.abs(k.time-this.time)<.001);if(!key&&e.node.keys.length){key={time:this.time};e.node.keys.push(key);e.node.keys.sort((a,b)=>a.time-b.time);}if(key)for(const field of ['position','rotation','scale'])key[field]=[...e.node[field]];}
    setMode(mode){this.gizmo.setMode(mode);this.request();}
    setQuality(quality){this.quality=quality;this.renderer.setPixelRatio(quality==='draft'?.75:quality==='high'?Math.min(devicePixelRatio,2):1);this.renderer.shadowMap.enabled=quality!=='draft';this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.resize();}
    resize(){const r=this.canvas.parentElement.getBoundingClientRect();this.renderer.setSize(Math.max(1,r.width),Math.max(1,r.height),false);this.camera.aspect=r.width/r.height;this.camera.updateProjectionMatrix();this.shot.aspect=r.width/r.height;this.shot.updateProjectionMatrix();this.request();}
    setCameraView(value){this.cameraView=value;this.helpers.visible=!value;this.orbit.enabled=!value;this.select(this.selected);this.request();}
    frameSelection(){const e=this.entries.get(this.selected);const bounds=new THREE.Box3().setFromObject(e?e.root:this.content);if(bounds.isEmpty())return;const center=bounds.getCenter(new THREE.Vector3()),size=Math.max(1,bounds.getSize(new THREE.Vector3()).length());this.orbit.target.copy(center);this.camera.position.copy(center).add(new THREE.Vector3(1,.65,1).normalize().multiplyScalar(size*1.1));this.orbit.update();this.request();}
    seek(time){this.time=Math.max(0,Math.min(this.project.duration,time));
        for(const e of this.entries.values()) {
            const n=e.node,t=sampleTransform(n,this.time);e.root.position.fromArray(t.position);e.root.rotation.fromArray(t.rotation);e.root.scale.fromArray(t.scale);e.root.visible=n.visible;
            if(e.actor){const a=n.action,p=Math.max(0,Math.min(1,(this.time-a.start)/a.duration)),channels={};
                if(a.name==='walk')channels.realistic3DWalk=p;
                if(a.name==='wave')channels.realistic3DWave=p;
                if(a.name==='sit')channels.realistic3DSit=p;
                if(a.name==='stand')channels.realistic3DSit=this.time<a.start?1:1-p;
                if(a.name==='nod')channels.realistic3DHeadPitch=Math.sin(p*Math.PI*4)*12;
                e.actor.pose({outfit:n.outfit||0},channels);
            }
            if(e.mixer){e.mixer.setTime(this.time);}
        }
        this.content.updateMatrixWorld(true);
        for(const e of this.entries.values())if(e.actor){const n=e.node;let point;
            if(n.gaze==='camera')point=(this.cameraView?this.shot:this.camera).position.clone();
            if(n.gaze==='character'){const other=this.entries.get(n.gazeTarget);if(other?.actor&&other.node.visible)point=other.actor.bone('head').getWorldPosition(new THREE.Vector3());}
            if(point)e.actor.aim(point);
        }
        this.updateBox();this.onTime(this.time);this.request();
    }
    play(){if(this.playing){this.stop();return;}if(this.time>=this.project.duration)this.seek(0);this.playing=true;this.gizmo.detach();this.started=performance.now()-this.time*1000;this.request();}
    stop(){this.playing=false;this.select(this.selected);}
    request(){if(this.pending)return;this.pending=requestAnimationFrame(now=>{this.pending=0;try{if(this.playing){const t=(now-this.started)/1000;this.seek(t);if(t>=this.project.duration)this.stop();}this.renderer.render(this.scene,this.cameraView?this.shot:this.camera);this.onStats({calls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles,geometries:this.renderer.info.memory.geometries,textures:this.renderer.info.memory.textures,hardware:this.hardware,quality:this.quality});if(this.playing)this.request();}catch(error){this.stop();this.onError(error.message);}});}
    async exportGLB(){const exporter=new GLTFExporter();return exporter.parseAsync(this.content,{binary:true,onlyVisible:true});}
    screenshot(){const visible=this.helpers.visible;this.helpers.visible=false;this.renderer.render(this.scene,this.cameraView?this.shot:this.camera);const url=this.canvas.toDataURL('image/png');this.helpers.visible=visible;this.request();return url;}
    dispose(){cancelAnimationFrame(this.pending);this.observer.disconnect();this.entries.forEach(e=>e.dispose());this.orbit.dispose();this.gizmo.dispose();disposeObject(this.helpers);this.renderer.dispose();}
}
