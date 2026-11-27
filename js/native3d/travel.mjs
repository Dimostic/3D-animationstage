import {sampleRoute,controlsFacing} from './motion-path.mjs';
﻿import {sampleTransform,actionTrack} from './project.mjs';
export const travelGaits=['walk','natural','stroll','strut','jog','run'];
export const gaitNames={walk:'Walk',natural:'Natural Walk',stroll:'Stroll',strut:'Strut',jog:'Jog',run:'Run'};
export function actionLabel(clip){return (gaitNames[clip.name]||clip.name[0].toUpperCase()+clip.name.slice(1))+(clip.travel?(clip.travel.waypoints?.length?' along Path':' to Point'):'');}
const refs=k=>k.travelRefs|| (k.travelId?[{id:k.travelId,edge:k.travelEdge}]:[]);
export function removeTravelKeys(node,ids){node.keys=node.keys.filter(k=>{const before=refs(k);if(!before.some(r=>ids.has(r.id)))return true;const kept=before.filter(r=>!ids.has(r.id));delete k.travelId;delete k.travelEdge;if(kept.length){k.travelRefs=kept;return true;}if(k.travelBase){delete k.travelRefs;delete k.travelBase;return true;}return false;});}
function putKey(node,pose,time,id,edge){let key=node.keys.find(k=>Math.abs(k.time-time)<.000001);if(key){const previous=refs(key);delete key.travelBase;for(const ref of previous){const clip=node.actionClips?.find(c=>c.id===ref.id);if(clip?.travel)clip.travel[ref.edge==='start'?'from':'to']=[...pose.position];}Object.assign(key,structuredClone(pose),{time,travelRefs:[...previous.filter(r=>r.id!==id),{id,edge}]});}else{key={time,...structuredClone(pose),travelRefs:[{id,edge}]};node.keys.push(key);}return key;}
export function addTravel(project,id,{start,duration,gait,position,rotation,replace=true,extend=false}){
    const previousDuration=project.duration,n=project.nodes.find(n=>n.id===id),end=start+duration;if(!n||n.kind!=='character'||!travelGaits.includes(gait)||!Number.isFinite(start)||!Number.isFinite(duration)||start<0||duration<.1||end>(extend?600:project.duration)+.000001)throw Error('Choose a character, gait and travel interval inside the scene');
    const from=sampleTransform(n,start),clips=structuredClone(actionTrack(n,project.duration)),overlap=clips.filter(c=>c.start<end-.000001&&c.start+c.duration>start+.000001);
    if(!replace&&(overlap.length||n.keys.some(k=>k.time>start&&k.time<end)))throw Error('This interval already has animation. Enable Replace overlapping animation, or choose a later start.');
    if(extend)project.duration=Math.max(project.duration,end);
    const removed=new Set(overlap.map(c=>c.id)),clip={id:crypto.randomUUID(),name:gait,start,duration,travel:{from:[...from.position],to:[...position]}};
    n.actionClips=clips.filter(c=>!removed.has(c.id));n.actionClips.push(clip);n.actionClips.sort((a,b)=>a.start-b.start);removeTravelKeys(n,removed);
    n.keys=n.keys.filter(k=>!(k.time>start+.000001&&k.time<end-.000001));
    if(!n.keys.length&&start>0)n.keys.push({time:0,...structuredClone(from)});
    putKey(n,{...from,rotation:[...rotation]},start,clip.id,'start');putKey(n,{...from,position:[...position],rotation:[...rotation]},end,clip.id,'end');n.keys.sort((a,b)=>a.time-b.time);
    return {clip,replaced:overlap.length,extended:project.duration>previousDuration};
}
export function retimeTravel(node,clip){
    if(!clip.travel)return;const start=node.keys.find(k=>refs(k).some(r=>r.id===clip.id&&r.edge==='start')),end=node.keys.find(k=>refs(k).some(r=>r.id===clip.id&&r.edge==='end'));if(!start||!end)throw Error('Travel movement keys are missing. Recreate this travel action.');
    const startPose=structuredClone(start),endPose=structuredClone(end),stop=clip.start+clip.duration;
    const crossing=node.keys.filter(k=>k.time>clip.start+.000001&&k.time<stop-.000001&&!refs(k).some(r=>r.id===clip.id));if(crossing.length)throw Error('Travel timing crosses other movement keys. Move or remove those keys first.');
    removeTravelKeys(node,new Set([clip.id]));delete startPose.time;delete startPose.travelRefs;delete startPose.travelBase;delete endPose.time;delete endPose.travelRefs;delete endPose.travelBase;startPose.position=[...clip.travel.from];endPose.position=[...clip.travel.to];putKey(node,startPose,clip.start,clip.id,'start');putKey(node,endPose,stop,clip.id,'end');node.keys.sort((a,b)=>a.time-b.time);syncRouteFacing(node,clip);
}

function syncRouteFacing(node,clip){if(!clip.travel||!controlsFacing(clip.travel))return;for(const key of node.keys){const edge=refs(key).find(r=>r.id===clip.id);if(edge){const route=sampleRoute(clip.travel,edge.edge==='start'?0:1,clip.duration);if(route.yaw!==null)key.rotation[1]=route.yaw;}}}
export function syncTravelEndpoint(node,key){for(const ref of refs(key)){const clip=node.actionClips?.find(c=>c.id===ref.id);if(clip?.travel){clip.travel[ref.edge==='start'?'from':'to']=[...key.position];syncRouteFacing(node,clip);}}}
export function putTransformKey(node,transform,time){let key=node.keys.find(k=>Math.abs(k.time-time)<.00001);if(key)Object.assign(key,structuredClone(transform),{time});else{key={time,...structuredClone(transform)};node.keys.push(key);}syncTravelEndpoint(node,key);node.keys.sort((a,b)=>a.time-b.time);}
