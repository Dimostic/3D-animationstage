import {createProject,createNode,validateProject} from './project.mjs';
export const PROP_FORMAT='animationstage-prop',PROP_VERSION=1;
const clone=value=>JSON.parse(JSON.stringify(value));
function assetsUsed(p){const used=new Set();for(const n of p.nodes){if(n.kind==='model'){if(typeof n.asset!=='string')throw Error('Invalid prop model reference');used.add(n.asset);}if(n.surface?.texture!==undefined&&n.surface.texture!==null){if(typeof n.surface.texture!=='string')throw Error('Invalid prop texture reference');used.add(n.surface.texture);}}for(const c of p.speech){if(typeof c.assetId!=='string')throw Error('Invalid prop recording reference');used.add(c.assetId);}return used;}
function requiredDuration(p){let end=1;for(const n of p.nodes){end=Math.max(end,n.action.start,...n.keys.map(k=>k.time),n.collision?.mode==='range'?n.collision.end:0);if(n.kind==='character'&&n.action.name!=='idle')end=Math.max(end,Math.min(p.duration,n.action.start+n.action.duration));for(const c of n.actionClips||[])end=Math.max(end,c.start+c.duration);if(n.seat)end=Math.max(end,n.seat.start+n.seat.sitDuration,n.seat.standAt===null?0:n.seat.standAt+n.seat.standDuration);if(n.attachment)end=Math.max(end,n.attachment.start,n.attachment.end??0);}for(const c of p.speech)end=Math.max(end,c.start+c.sourceEnd-c.sourceStart);return Math.min(600,end);}

export function exportCustomProp(project,id,anchor=[0,0,0]){
    const selected=project.nodes.find(n=>n.id===id);if(selected?.kind!=='group')throw Error('Select a group to save as a custom prop');
    if(!Array.isArray(anchor)||anchor.length!==3||anchor.some(v=>!Number.isFinite(v)))throw Error('Invalid prop origin');
    const ids=new Set([id]);let previous;do{previous=ids.size;for(const n of project.nodes)if(ids.has(n.parent))ids.add(n.id);}while(previous!==ids.size);
    for(const n of project.nodes.filter(n=>ids.has(n.id))){if(n.rest?.targetId&&!ids.has(n.rest.targetId))throw Error(`Include ${n.name}'s supporting surface before saving this prop.`);if(n.seat&&!ids.has(n.seat.chairId))throw Error(`Include ${n.name}'s linked chair before saving this prop.`);if(n.attachment&&!ids.has(n.attachment.actorId))throw Error(`Include ${n.name}'s holding character before saving this prop.`);if(n.gaze==='character'&&!ids.has(n.gazeTarget))throw Error(`Include ${n.name}'s gaze target or choose Forward before saving this prop.`);}
    let top=selected;while(top.parent){top=project.nodes.find(n=>n.id===top.parent);ids.add(top.id);}
    if(ids.size>=300)throw Error('A portable prop needs a container: save at most 299 objects, including parent groups');
    const name=selected.name.trim()||'Custom prop',container=createNode('group',{name}),p=createProject();p.name=name;p.duration=project.duration;p.nodes=project.nodes.filter(n=>ids.has(n.id)).map(clone);p.speech=project.speech.filter(c=>ids.has(c.actorId)).map(clone);
    const outer=p.nodes.find(n=>n.id===top.id);outer.parent=container.id;for(const t of [outer,...outer.keys])t.position=t.position.map((v,i)=>v-anchor[i]);p.nodes.push(container);for(const n of p.nodes)if(n.rest&&n.rest.targetId===null)n.rest.point=n.rest.point.map((v,i)=>v-anchor[i]);
    for(const n of p.nodes)if(n.collision?.ignore)n.collision.ignore=n.collision.ignore.filter(id=>ids.has(id));
    const used=assetsUsed(p);p.assets=Object.fromEntries([...used].map(assetId=>[assetId,clone(project.assets[assetId])]));p.duration=requiredDuration(p);
    return validateCustomProp({format:PROP_FORMAT,version:PROP_VERSION,name,rootId:container.id,project:p});
}
export function validateCustomProp(input){
    if(!input||input.format!==PROP_FORMAT||input.version!==PROP_VERSION||typeof input.name!=='string'||!input.name.trim()||input.name.length>160)throw Error('Choose a supported .stage3dprop file');
    const p=validateProject(input.project),root=p.nodes.find(n=>n.id===input.rootId);
    if(root?.kind!=='group'||root.parent!==null||root.keys.length||root.position.some(v=>v!==0)||root.rotation.some(v=>v!==0)||root.scale.some(v=>v!==1)||p.nodes.some(n=>n.id!==root.id&&n.parent===null))throw Error('The custom prop needs one neutral group container');
    if(p.speech.some(c=>c.actorId===null))throw Error('Custom prop speech must belong to an included character');
    if(p.cameraShots.length)throw Error('Custom props cannot contain scene camera shots');
    for(const n of p.nodes)if(n.gaze==='character'&&!p.nodes.some(target=>target.id===n.gazeTarget&&target.kind==='character'))throw Error('Missing custom prop gaze target');
    const used=assetsUsed(p);if(Object.keys(p.assets).some(id=>!used.has(id)))throw Error('Custom prop contains unrelated assets');
    return {format:PROP_FORMAT,version:PROP_VERSION,name:input.name,rootId:root.id,project:p};
}
function sameAsset(a,b){return a.type===b.type&&a.data===b.data&&(a.type!=='image'||a.width===b.width&&a.height===b.height)&&(a.type!=='audio'||a.duration===b.duration&&JSON.stringify(a.cues)===JSON.stringify(b.cues));}
export function importCustomProp(project,input,position=[0,0,0]){
    const prop=validateCustomProp(input),source=prop.project;
    if(!Array.isArray(position)||position.length!==3||position.some(v=>!Number.isFinite(v)||Math.abs(v)>10000))throw Error('Choose a prop position within 10,000 metres');
    if(project.nodes.length+source.nodes.length>300||project.speech.length+source.speech.length>100)throw Error('This import would exceed 300 objects or 100 speech clips');
    const ids=new Map(source.nodes.map(n=>[n.id,crypto.randomUUID()])),assetIds=new Map(),assets={...project.assets};let reusedAssets=0;
    for(const [id,a]of Object.entries(source.assets)){const existing=Object.entries(assets).find(([,b])=>sameAsset(a,b));if(existing){assetIds.set(id,existing[0]);reusedAssets++;}else{const next=crypto.randomUUID();assetIds.set(id,next);assets[next]=clone(a);}}
    const nodes=source.nodes.map(original=>{const n=clone(original);n.id=ids.get(n.id);if(n.collision?.ignore)n.collision.ignore=n.collision.ignore.map(id=>ids.get(id));n.parent=n.parent===null?null:ids.get(n.parent);if(n.kind==='model')n.asset=assetIds.get(n.asset);if(n.surface?.texture!==undefined&&n.surface.texture!==null)n.surface.texture=assetIds.get(n.surface.texture);if(n.rest){if(n.rest.targetId)n.rest.targetId=ids.get(n.rest.targetId);else n.rest.point=n.rest.point.map((v,i)=>v+position[i]);}if(n.seat)n.seat.chairId=ids.get(n.seat.chairId);if(n.attachment)n.attachment.actorId=ids.get(n.attachment.actorId);if(n.gazeTarget)n.gazeTarget=ids.get(n.gazeTarget)||'';n.actionClips?.forEach(c=>{const old=c.id;c.id=crypto.randomUUID();if(n.collision?.mode==='action'&&n.collision.actionId===old)n.collision.actionId=c.id;});if(original.id===prop.rootId){n.position=[...position];n.name=prop.name;}return n;});
    const speech=source.speech.map(c=>({...clone(c),id:crypto.randomUUID(),actorId:ids.get(c.actorId),assetId:assetIds.get(c.assetId)}));
    const candidate=validateProject({...project,duration:Math.max(project.duration,source.duration),assets,nodes:[...project.nodes,...nodes],speech:[...project.speech,...speech]});
    return {project:candidate,selected:ids.get(prop.rootId),count:nodes.length,reusedAssets};
}
