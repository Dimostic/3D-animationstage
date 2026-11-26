import {VISEMES,clipDuration} from './speech.mjs';
import {surfaceKinds} from './surface.mjs';
import {validateShape} from './shapes.mjs';
import {validateSurfaceLinks} from './surface-contract.mjs';
import {validateSolidity} from './solidity.mjs';
export const FORMAT = 'animationstage-world';
export const VERSION = 12;
export const kinds = ['box','sphere','cylinder','plane','chair','table','document','emoji','text','character','camera','light','group','model'];
export const actions = ['idle','walk','natural','stroll','strut','jog','run','wave','sit','stand','nod'];
export const grippableKinds=['document','box','sphere','cylinder','emoji','text','model','chair','table'];
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
        background:'#172432',ambient:.8,collisionProtection:false,view:{position:[6,4,7],target:[0,1,0]},
        camera:{position:[5,2.8,6],target:[0,1,0],fov:45},
        viewerStart:{position:[0,0,4],yaw:0,eyeHeight:1.65},assets:{},nodes:[],speech:[],cameraShots:[],captionSettings:{enabled:true,showSpeaker:true}};
}
export function validateProject(input) {
    if (!input || input.format!==FORMAT || ![1,2,3,4,5,6,7,8,9,10,11,VERSION].includes(input.version)) throw Error('This is not a supported native 3D project. Legacy .animstage files stay in the existing editor.');
    if (input.units!=='metres'||input.up!=='Y'||!label(input.name)||!finite(input.duration,.1,600)||!color(input.background)||!finite(input.ambient,0,5)) throw Error('Invalid scene settings');
    if (!vector(input.view?.position)||!vector(input.view?.target)||!vector(input.camera?.position)||!vector(input.camera?.target)||!finite(input.camera?.fov,10,100)) throw Error('Invalid camera');
    if(!vector(input.viewerStart?.position)||!finite(input.viewerStart?.yaw,-1000,1000)||!finite(input.viewerStart?.eyeHeight,.5,2.5))throw Error('Invalid viewer start');
    if(!Array.isArray(input.nodes)||input.nodes.length>300||!input.assets||Array.isArray(input.assets)||typeof input.assets!=='object')throw Error('Invalid scene objects/assets');
    const p=clone(input), ids=new Map();p.version=VERSION;
    p.collisionProtection??=false;p.speech??=[];p.cameraShots??=[];p.captionSettings??={enabled:true,showSpeaker:true};
    if(!Array.isArray(p.cameraShots)||p.cameraShots.length>200)throw Error('Invalid camera shots');
    const shotIds=new Set();let shotEnd=0;
    for(const shot of p.cameraShots){if(shot?.transition!==undefined&&!['cut','smooth'].includes(shot.transition))throw Error('Invalid camera transition');if(!shot||!label(shot.id)||!shot.id||shotIds.has(shot.id)||!label(shot.name)||!finite(shot.start,Math.max(0,shotEnd-.000001),p.duration)||!finite(shot.duration,.1,p.duration)||shot.start+shot.duration>p.duration+.000001||!vector(shot.position)||!vector(shot.target)||!finite(shot.fov,10,100)||shot.position.every((v,i)=>v===shot.target[i]))throw Error('Camera shots need unique IDs, valid framing and ordered, non-overlapping times inside the scene');shotEnd=shot.start+shot.duration;shotIds.add(shot.id);}
    const cs=p.captionSettings;if(cs.fontSize!==undefined&&!finite(cs.fontSize,12,72)||cs.maxWords!==undefined&&(!Number.isInteger(cs.maxWords)||!finite(cs.maxWords,1,20))||cs.pacing!==undefined&&!['full','sentence','phrase'].includes(cs.pacing)||cs.position!==undefined&&!['bottom','top'].includes(cs.position)||cs.color!==undefined&&!/^#[0-9a-f]{6}$/i.test(cs.color)||cs.background!==undefined&&!/^#[0-9a-f]{6}$/i.test(cs.background))throw Error('Invalid caption style');
    if(!Array.isArray(p.speech)||p.speech.length>100||typeof p.captionSettings.enabled!=='boolean'||typeof p.captionSettings.showSpeaker!=='boolean')throw Error('Invalid speech or caption settings');
    let bytes=0;
    for(const [id,a] of Object.entries(p.assets)) {
        if(!label(id)||!a||!label(a.name)||!['glb','audio','image'].includes(a.type)||typeof a.data!=='string')throw Error('Only embedded GLB/audio/image assets are supported');
        if(a.type==='image'&&(!/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(a.data)||a.data.length>12*1024*1024||!Number.isInteger(a.width)||!Number.isInteger(a.height)||!finite(a.width,1,2048)||!finite(a.height,1,2048)))throw Error('Textures need embedded PNG, JPEG or WebP images up to 2048 pixels');
        if(a.type==='glb'&&!/^data:model\/gltf-binary;base64,[A-Za-z0-9+/]+=*$/.test(a.data))throw Error('Invalid embedded GLB');
        if(a.type==='audio'){
            if(!/^data:audio\/(?:wav|mpeg|ogg|webm|mp4);base64,[A-Za-z0-9+/]+=*$/.test(a.data)||!finite(a.duration,.01,600)||!Array.isArray(a.cues)||a.cues.length>30000)throw Error('Invalid embedded audio or mouth cues');
            let end=0;for(const cue of a.cues){if(!finite(cue.start,end-1e-6,a.duration)||!finite(cue.end,cue.start+.00001,a.duration+.001)||!Object.hasOwn(VISEMES,cue.viseme)||!finite(cue.strength,0,1.2))throw Error('Invalid speech cue timing/shape');end=cue.end;}
        }
        bytes+=a.data.length;if(bytes>180*1024*1024)throw Error('Embedded asset budget exceeded (approximately 128 MB)');
    }
    for(const n of p.nodes) {
        if(!label(n.id)||!n.id||ids.has(n.id)||!label(n.name)||!kinds.includes(n.kind)||!vector(n.position)||!vector(n.rotation,-1000,1000)||!vector(n.scale,.001,1000)||!color(n.color)||typeof n.visible!=='boolean'||(n.parent!==null&&!label(n.parent)))throw Error('Invalid or duplicate 3D object');
        if(n.kind==='character'&&!['amaka','tunde'].includes(n.preset))throw Error('Unknown character');
        if(n.kind==='model'&&p.assets[n.asset]?.type!=='glb')throw Error('Missing embedded model');
        if(n.locked!==undefined&&typeof n.locked!=='boolean')throw Error('Invalid object lock');
        if(n.lipSyncStrength!==undefined&&!finite(n.lipSyncStrength,0,1))throw Error('Mouth strength must be between 0 and 1');
        validateShape(n);
        if(n.surface!==undefined){const s=n.surface;if(!s||!surfaceKinds.includes(n.kind)||!finite(s.roughness,0,1)||!finite(s.metalness,0,1)||!finite(s.opacity,.05,1)||!(s.texture===null||p.assets[s.texture]?.type==='image')||!Array.isArray(s.repeat)||s.repeat.length!==2||!s.repeat.every(v=>finite(v,.1,100)))throw Error('Invalid material or missing texture');}
        if(n.kind==='text'&&!label(n.text,100))throw Error('3D text is limited to 100 characters');
        if(n.outfit!==undefined&&![0,1].includes(n.outfit))throw Error('Invalid outfit');
        if(n.heldDocument!==undefined&&typeof n.heldDocument!=='boolean')throw Error('Invalid document attachment');
        if(n.gaze && !['manual','camera','sceneCamera','character','document'].includes(n.gaze))throw Error('Invalid native gaze target');
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
        if(n.actionClips!==undefined){
            if(n.kind!=='character'||!Array.isArray(n.actionClips)||n.actionClips.length>200)throw Error('Only characters can have action tracks (up to 200 clips)');
            let end=0;const clipIds=new Set();for(const clip of n.actionClips){if(!clip||!label(clip.id)||!clip.id||clipIds.has(clip.id)||!actions.includes(clip.name)||!finite(clip.start,Math.max(0,end-.000001),p.duration)||!finite(clip.duration,.1,p.duration)||clip.start+clip.duration>p.duration+.000001||n.seat&&['sit','stand'].includes(clip.name))throw Error('Actions on one character cannot overlap or exceed the scene; linked chairs control Sit/Stand');if(clip.travel!==undefined&&(!clip.travel||!['walk','natural','stroll','strut','jog','run'].includes(clip.name)||!vector(clip.travel.from)||!vector(clip.travel.to)))throw Error('Invalid travel target');end=clip.start+clip.duration;clipIds.add(clip.id);}
        }
        // Earlier Travel to Point authored two ordinary keys plus a gait action.
        // Recognise only an unambiguous, moving two-endpoint segment when upgrading.
        if(input.version<=11&&n.kind==='character'){
            const gaits=['walk','natural','stroll','strut','jog','run'],clips=n.actionClips|| (gaits.includes(n.action.name)?[{...n.action,id:'legacy-'+n.id}]:[]);let migrated=false;
            for(const c of clips){if(c.travel||!gaits.includes(c.name))continue;const end=c.start+c.duration,a=n.keys.find(k=>Math.abs(k.time-c.start)<.000001),b=n.keys.find(k=>Math.abs(k.time-end)<.000001);if(!a||!b||n.keys.some(k=>k.time>c.start+.000001&&k.time<end-.000001)||a.position.every((v,i)=>Math.abs(v-b.position[i])<.000001))continue;c.travel={from:[...a.position],to:[...b.position]};for(const [key,edge]of [[a,'start'],[b,'end']]){key.travelRefs??=[];key.travelRefs.push({id:c.id,edge});}migrated=true;}
            if(migrated&&!n.actionClips)n.actionClips=clips;
        }
        ids.set(n.id,n);
    }
    for(const n of p.nodes) {
        const visited=new Set([n.id]);let parent=n.parent;
        while(parent!==null){if(!ids.has(parent)||visited.has(parent))throw Error('Missing parent or cyclic hierarchy');visited.add(parent);parent=ids.get(parent).parent;}
        if(n.parent&&ids.get(n.parent).kind!=='group')throw Error('Objects can be parented only to groups in this version');
    }
    const seats=new Set(),holds=[];
    const speechIds=new Set();
    for(const clip of p.speech){const asset=p.assets[clip.assetId];
        if(!label(clip.id)||!clip.id||speechIds.has(clip.id)||!label(clip.name)||asset?.type!=='audio'||!(clip.actorId===null||ids.get(clip.actorId)?.kind==='character')||!finite(clip.start,0,p.duration)||!finite(clip.sourceStart,0,asset.duration)||!finite(clip.sourceEnd,clip.sourceStart+.01,asset.duration+.001)||clip.start+clipDuration(clip)>p.duration+.001||!finite(clip.volume,0,1)||typeof clip.muted!=='boolean'||typeof clip.performance!=='boolean'||!Array.isArray(clip.captions)||clip.captions.length>300)throw Error('Choose a character or narration, valid speech timing and volume');
        let end=0;for(const cap of clip.captions){if(!finite(cap.start,end-1e-6,asset.duration)||!finite(cap.end,cap.start+.01,asset.duration+.001)||!label(cap.text,5000)||!cap.text.trim())throw Error('Caption segments need text and ordered, non-overlapping audio times');end=cap.end;}
        if(clip.actorId&&p.speech.some(other=>other!==clip&&other.actorId===clip.actorId&&Math.max(other.start,clip.start)<Math.min(other.start+clipDuration(other),clip.start+clipDuration(clip))-.0001))throw Error('Speech clips for the same character cannot overlap');
        speechIds.add(clip.id);
    }
    const upright=n=>{
        for(let item=n;item;item=item.parent?ids.get(item.parent):null){
            if([item,...item.keys].some(t=>Math.abs(t.rotation[0])>1e-6||Math.abs(t.rotation[2])>1e-6))throw Error('Chair contact needs upright characters, chairs and groups; use Y rotation to turn them');
            if(item.kind!=='chair'&&[item,...item.keys].some(t=>Math.max(...t.scale)-Math.min(...t.scale)>1e-6))throw Error('Linked characters and their groups need uniform scale');
        }
    };
    const uniformParents=n=>{for(let item=n;item;item=item.parent?ids.get(item.parent):null)if([item,...item.keys].some(t=>Math.max(...t.scale)-Math.min(...t.scale)>1e-6))throw Error('Hand attachments need uniform character and group scale');};
    for(const n of p.nodes){
        if(n.seat){const s=n.seat,chair=ids.get(s.chairId);
            if(n.kind!=='character'||chair?.kind!=='chair'||!finite(s.start,0,p.duration)||!finite(s.sitDuration,.2,10)||s.start+s.sitDuration>p.duration||!(s.standAt===null||finite(s.standAt,s.start+s.sitDuration,p.duration))||!finite(s.standDuration,.2,10)||(s.standAt!==null&&s.standAt+s.standDuration>p.duration))throw Error('Choose an available chair and valid Sit/Stand times inside the scene');
            if(seats.has(s.chairId))throw Error('A chair can be linked to only one character');seats.add(s.chairId);upright(n);upright(chair);
            for(const clip of n.actionClips||[])if(['walk','natural','stroll','strut','jog','run'].includes(clip.name)&&clip.start<s.start+s.sitDuration-.000001&&clip.start+clip.duration>s.start+.000001)throw Error('Walk overlaps the Sit transition. Move Walk after Sit finishes, or move Sit later.');
        }
        if(n.attachment){const a=n.attachment,actor=ids.get(a.actorId);
            if(n.kind==='chair'&&p.nodes.some(other=>other.seat?.chairId===n.id))throw Error('Unlink this chair from seated characters before attaching it to a hand');
            if(!grippableKinds.includes(n.kind)||actor?.kind!=='character'||!['left','right'].includes(a.hand)||!finite(a.start,0,p.duration)||!(a.end===null||finite(a.end,a.start+.01,p.duration)))throw Error('Choose a character, hand and valid object hold range');
            uniformParents(actor);if(n.parent)uniformParents(ids.get(n.parent));
            if(a.offset!==undefined&&!vector(a.offset,-.3,.3)||a.rotation!==undefined&&!vector(a.rotation,-Math.PI,Math.PI))throw Error('Grip adjustment needs offsets within 30 cm and angles within 180 degrees');
            if(a.adjustRange!==undefined&&!['hand','extended'].includes(a.adjustRange))throw Error('Choose a valid grip adjustment range');
            if(a.gripStyle!==undefined&&!['palm','edge'].includes(a.gripStyle)||a.anchor!==undefined&&!vector(a.anchor,-1000,1000))throw Error('Choose a valid grip style and object anchor');
            if(holds.some(h=>h.actorId===a.actorId&&Math.max(h.start,a.start)<Math.min(h.end??Infinity,a.end??Infinity)))throw Error('A character can hold one object at a time; adjust the hold ranges');holds.push(a);
        }
    }
    validateSurfaceLinks(p,ids);
    validateSolidity(p);
    return p;
}
export function seatBlend(seat,time){
    if(!seat)return 0;
    // Rig posing applies its own smooth transition to this normalized progress.
    const ease=n=>Math.max(0,Math.min(1,n));
    if(time<seat.start)return 0;
    if(seat.standAt!==null&&time>=seat.standAt)return 1-ease((time-seat.standAt)/seat.standDuration);
    return ease((time-seat.start)/seat.sitDuration);
}
export function seatForActions(node){
    if(!node.seat)return null;const seat={...node.seat},sitEnd=seat.start+seat.sitDuration;
    const walk=actionTrack(node,600).find(c=>['walk','natural','stroll','strut','jog','run'].includes(c.name)&&c.start>=sitEnd-.000001);
    if(walk&&(seat.standAt===null||seat.standAt+seat.standDuration>walk.start+.000001)){
        seat.standDuration=Math.min(seat.standDuration,Math.max(.000001,walk.start-sitEnd));seat.standAt=walk.start-seat.standDuration;seat.autoStand=true;
    }
    return seat;
}
export function sampleAction(node,time){
    if(!node.actionClips)return node.action;
    const active=node.actionClips.find(c=>time>=c.start&&time<c.start+c.duration);
    if(active)return active;
    const previous=node.actionClips.filter(c=>c.start+c.duration<=time).at(-1);
    return previous&&['sit','stand'].includes(previous.name)?previous:{name:'idle',start:0,duration:1};
}
export function cameraAt(project,time){const shot=project.cameraShots?.find(c=>time>=c.start&&time<c.start+c.duration);if(!shot)return project.camera;if(shot.transition!=='smooth')return shot;const preceding=project.cameraShots.filter(s=>s.start<shot.start).at(-1),previous=preceding&&Math.abs(preceding.start+preceding.duration-shot.start)<.000001?preceding:project.camera,t=Math.max(0,Math.min(1,(time-shot.start)/shot.duration)),a=t*t*(3-2*t);return {...shot,position:shot.position.map((v,i)=>previous.position[i]+(v-previous.position[i])*a),target:shot.target.map((v,i)=>previous.target[i]+(v-previous.target[i])*a),fov:previous.fov+(shot.fov-previous.fov)*a};}
export function actionTrack(node,duration){
    if(!node)return [];
    if(node.actionClips)return node.actionClips;
    const action=node.action,end=Math.min(duration,action.start+action.duration);
    return action.name!=='idle'&&!(node.seat&&['sit','stand'].includes(action.name))&&end-action.start>=.1?[{...action,id:'legacy-'+node.id,duration:end-action.start}]:[];
}
export function attachmentActive(node,time){return !!node.attachment&&time>=node.attachment.start&&(node.attachment.end===null||time<node.attachment.end);}
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
    a.seat={chairId:p.nodes[5].id,start:2,sitDuration:1.2,standAt:8,standDuration:1.2};
    b.seat={chairId:p.nodes[6].id,start:2,sitDuration:1.2,standAt:8,standDuration:1.2};
    p.nodes[8].attachment={actorId:a.id,hand:'left',start:0,end:null};
    return p;
}
