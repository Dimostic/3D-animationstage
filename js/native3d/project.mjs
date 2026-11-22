export const FORMAT = 'animationstage-world';
export const VERSION = 1;
export const kinds = ['box','sphere','cylinder','plane','chair','table','document','emoji','text','character','camera','light','group','model'];
export const actions = ['idle','walk','wave','sit','stand','nod'];
const clone = value => JSON.parse(JSON.stringify(value));
const finite = (n,min,max) => typeof n === 'number' && Number.isFinite(n) && n>=min && n<=max;
const vector = (v,min=-10000,max=10000) => Array.isArray(v)&&v.length===3&&v.every(n=>finite(n,min,max));
const color = v => typeof v==='string'&&/^#[a-f\d]{6}$/i.test(v);
const label = (s,n=160) => typeof s==='string'&&s.length<=n;
export function createNode(kind, options={}) {
    if (!kinds.includes(kind)) throw Error('Unsupported 3D object');
    return {id:crypto.randomUUID(),name:kind[0].toUpperCase()+kind.slice(1),kind,parent:null,visible:true,
        position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],color:'#6495ed',
        ...clone(options),keys:options.keys||[],action:options.action||{name:'idle',start:0,duration:3}};
}
export function createProject() {
    return {format:FORMAT,version:VERSION,name:'Untitled 3D scene',units:'metres',up:'Y',duration:10,
        background:'#172432',ambient:.8,view:{position:[6,4,7],target:[0,1,0]},
        camera:{position:[5,2.8,6],target:[0,1,0],fov:45},
        viewerStart:{position:[0,0,4],yaw:0,eyeHeight:1.65},assets:{},nodes:[]};
}
export function validateProject(input) {
    if (!input || input.format!==FORMAT || input.version!==VERSION) throw Error('This is not a supported native 3D project. Legacy .animstage files stay in the existing editor.');
    if (input.units!=='metres'||input.up!=='Y'||!label(input.name)||!finite(input.duration,.1,600)||!color(input.background)||!finite(input.ambient,0,5)) throw Error('Invalid scene settings');
    if (!vector(input.view?.position)||!vector(input.view?.target)||!vector(input.camera?.position)||!vector(input.camera?.target)||!finite(input.camera?.fov,10,100)) throw Error('Invalid camera');
    if(!vector(input.viewerStart?.position)||!finite(input.viewerStart?.yaw,-1000,1000)||!finite(input.viewerStart?.eyeHeight,.5,2.5))throw Error('Invalid viewer start');
    if(!Array.isArray(input.nodes)||input.nodes.length>300||!input.assets||Array.isArray(input.assets)||typeof input.assets!=='object')throw Error('Invalid scene objects/assets');
    const p=clone(input), ids=new Map();
    let bytes=0;
    for(const [id,a] of Object.entries(p.assets)) {
        if(!label(id)||!a||!label(a.name)||a.type!=='glb'||typeof a.data!=='string'||!/^data:model\/gltf-binary;base64,[A-Za-z0-9+/]+=*$/.test(a.data))throw Error('Only embedded GLB assets are supported');
        bytes+=a.data.length;if(bytes>180*1024*1024)throw Error('Embedded asset budget exceeded (approximately 128 MB)');
    }
    for(const n of p.nodes) {
        if(!label(n.id)||!n.id||ids.has(n.id)||!label(n.name)||!kinds.includes(n.kind)||!vector(n.position)||!vector(n.rotation,-1000,1000)||!vector(n.scale,.001,1000)||!color(n.color)||typeof n.visible!=='boolean'||(n.parent!==null&&!label(n.parent)))throw Error('Invalid or duplicate 3D object');
        if(n.kind==='character'&&!['amaka','tunde'].includes(n.preset))throw Error('Unknown character');
        if(n.kind==='model'&&!Object.hasOwn(p.assets,n.asset))throw Error('Missing embedded model');
        if(n.kind==='text'&&!label(n.text,100))throw Error('3D text is limited to 100 characters');
        if(n.outfit!==undefined&&![0,1].includes(n.outfit))throw Error('Invalid outfit');
        if(n.heldDocument!==undefined&&typeof n.heldDocument!=='boolean')throw Error('Invalid document attachment');
        if(n.gaze && !['manual','camera','character'].includes(n.gaze))throw Error('Invalid native gaze target');
        if(n.gazeTarget!==undefined&&!label(n.gazeTarget))throw Error('Invalid gaze target');
        if(n.kind==='light'&&!finite(n.intensity??2,0,20))throw Error('Invalid light intensity');
        if(n.clip!==undefined&&(!Number.isInteger(n.clip)||n.clip< -1||n.clip>1000))throw Error('Invalid model clip');
        if(!Array.isArray(n.keys)||n.keys.length>1000)throw Error('Invalid transform keyframes');
        let last=-1;
        for(const k of n.keys) {
            if(!finite(k.time,0,p.duration)||k.time<=last||!vector(k.position)||!vector(k.rotation,-1000,1000)||!vector(k.scale,.001,1000))throw Error('Invalid or unsorted transform keyframes');
            last=k.time;
        }
        if(!n.action||!actions.includes(n.action.name)||!finite(n.action.start,0,p.duration)||!finite(n.action.duration,.1,600))throw Error('Invalid character action');
        ids.set(n.id,n);
    }
    for(const n of p.nodes) {
        const visited=new Set([n.id]);let parent=n.parent;
        while(parent!==null){if(!ids.has(parent)||visited.has(parent))throw Error('Missing parent or cyclic hierarchy');visited.add(parent);parent=ids.get(parent).parent;}
        if(n.parent&&ids.get(n.parent).kind!=='group')throw Error('Objects can be parented only to groups in this version');
    }
    return p;
}
export function sampleTransform(node,time) {
    const keys=node.keys;
    if(!keys.length)return {position:[...node.position],rotation:[...node.rotation],scale:[...node.scale]};
    const b=keys.find(k=>k.time>=time)||keys.at(-1), i=keys.indexOf(b), a=i>0?keys[i-1]:b;
    const t=a===b?0:Math.max(0,Math.min(1,(time-a.time)/(b.time-a.time)));
    const result={};for(const key of ['position','rotation','scale'])result[key]=a[key].map((v,j)=>{
        let delta=b[key][j]-v;if(key==='rotation')delta=((delta+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;
        return v+delta*t;
    });return result;
}
export function demoProject() {
    const p=createProject();p.name='Classroom • native 3D';
    const floor=createNode('plane',{name:'Classroom floor',scale:[12,1,10],color:'#adb9b6'});
    const wall=createNode('box',{name:'Back wall',position:[0,1.5,-3],scale:[10,3,.15],color:'#e3e0d3'});
    const board=createNode('box',{name:'Teaching board',position:[0,1.9,-2.9],scale:[3.4,1.3,.06],color:'#264a45'});
    const a=createNode('character',{name:'Amaka • teacher',preset:'amaka',position:[-1,0,0],rotation:[0,.4,0],outfit:1});
    const b=createNode('character',{name:'Tunde • colleague',preset:'tunde',position:[1,0,0],rotation:[0,-.4,0],outfit:1});
    a.gaze='character';a.gazeTarget=b.id;b.gaze='character';b.gazeTarget=a.id;
    p.nodes=[floor,wall,board,a,b,createNode('chair',{name:'Teacher chair',position:[-1,0,-.6],color:'#be8755'}),createNode('chair',{name:'Colleague chair',position:[1,0,-.6],color:'#be8755'}),createNode('table',{name:'Lesson table',position:[0,0,1.1],color:'#b78157'}),createNode('document',{name:'Lesson plan',position:[0,.77,1.1],rotation:[-Math.PI/2,0,0],scale:[.8,.8,.8],color:'#fff4d9'}),createNode('text',{name:'Classroom title',text:'Animation Stage',position:[-1.6,2.65,-2.77],color:'#faf2d7'}),createNode('light',{name:'Key light',position:[3,5,4],color:'#fff3dd',intensity:2.5})];
    return p;
}
