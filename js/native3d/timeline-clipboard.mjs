import {actionTrack} from './project.mjs';
import {findClip} from './clip-operations.mjs';
const end=c=>c.start+(c.sourceEnd===undefined?c.duration:c.sourceEnd-c.sourceStart);
export function copyTimelineClip(p,ref){
 const clip=findClip(p,ref);if(!clip)throw Error('Choose an independent action, speech clip or camera shot first');
 if(clip.travel)throw Error('Use Duplicate Character to copy a linked travel route');
 return {kind:ref.kind,clip:structuredClone(clip),asset:ref.kind==='speech'?structuredClone(p.assets[clip.assetId]):null};
}
export function pasteTimelineClip(p,data,start,actorId){
 if(!data)throw Error('Copy a timeline clip first');const c=structuredClone(data.clip),duration=end(c)-c.start;
 if(!Number.isFinite(start)||start<0||start+duration>600)throw Error('Paste must fit within 0–600 seconds');
 c.id=crypto.randomUUID();c.start=start;let list,ref={kind:data.kind,id:c.id};
 if(data.kind==='action'){
  const actor=p.nodes.find(n=>n.id===actorId&&n.kind==='character');if(!actor)throw Error('Choose a destination character');
  if(actor.seat&&['sit','stand'].includes(c.name))throw Error('Use this character’s linked chair timing for Sit and Stand');
  actor.actionClips??=structuredClone(actionTrack(actor,p.duration));list=actor.actionClips;ref.actorId=actor.id;
 }else if(data.kind==='shot'){list=p.cameraShots;c.name=(c.name+' copy').slice(0,160);}
 else if(data.kind==='speech'){
  if(actorId&&!p.nodes.some(n=>n.id===actorId&&n.kind==='character'))throw Error('Choose a destination speaker');
  c.actorId=actorId||null;list=p.speech;c.name=(c.name+' copy').slice(0,160);
  // A clipboard may outlive its source project; retain its own embedded recording.
  const same=p.assets[c.assetId]&&JSON.stringify(p.assets[c.assetId])===JSON.stringify(data.asset);
  if(!same){c.assetId=crypto.randomUUID();p.assets[c.assetId]=structuredClone(data.asset);}
 }else throw Error('Unsupported timeline clipboard');
 if(list.some(s=>(data.kind!=='speech'||c.actorId&&s.actorId===c.actorId)&&s.start<start+duration-1e-7&&end(s)>start+1e-7))throw Error('Paste overlaps an existing clip. Choose a free interval');
 list.push(c);list.sort((a,b)=>a.start-b.start);p.duration=Math.max(p.duration,start+duration);return ref;
}
