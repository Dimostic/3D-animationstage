import {sampleTransform} from './project.mjs';
export const keyEasings={linear:'Linear',easeIn:'Ease in',easeOut:'Ease out',easeInOut:'Smooth start / stop',hold:'Hold, then jump'};
export const sameTime=(a,b)=>Math.abs(a-b)<1e-6;
export function keyEditReason(p,n,key){
 if(!n)return 'Object no longer exists';
 for(let at=n;at;at=p.nodes.find(o=>o.id===at.parent))if(at.locked)return 'Unlock this object or its group in the Scene panel first';
 if(n.rest||n.attachment||n.seat)return 'This object uses a surface, hand or chair link. Edit its owning controls first';
 if(key?.travelRefs?.length||n.actionClips?.some(c=>c.travel&&key&&key.time>=c.start-1e-6&&key.time<=c.start+c.duration+1e-6))return 'Travel owns these movement keys. Edit the travel action timing or path instead';
 return '';
}
function resolve(p,refs){if(!refs.length)throw Error('Select one or more keyframe diamonds');return refs.map(r=>{const n=p.nodes.find(n=>n.id===r.nodeId),k=n?.keys.find(k=>sameTime(k.time,r.time));if(!k)throw Error('A selected key no longer exists');const why=keyEditReason(p,n,k);if(why)throw Error(why);return {n,k};});}
export function editKeys(p,refs,{type,delta=0,factor=1,pivot=0,time,field,axis,value,easing}={}){
 const selected=resolve(p,refs),result=[];
 if(type==='value'&&(!['position','rotation','scale'].includes(field)||![0,1,2].includes(axis)||!Number.isFinite(value)))throw Error('Choose a transform channel and a valid value');
 if(type==='ease'&&!Object.hasOwn(keyEasings,easing))throw Error('Choose a supported interpolation');
 if(type==='scale'&&(!Number.isFinite(factor)||factor<=0||factor>100))throw Error('Timing scale must be greater than 0 and at most 100');
 for(const {n,k}of selected){
  if(type==='delete'){n.keys=n.keys.filter(o=>o!==k);continue;}
  if(type==='ease')k.easing=easing;
  else if(type==='value')k[field][axis]=value;
  else if(type==='move'||type==='scale'||type==='time'){
   const next=type==='time'?time:type==='scale'?pivot+(k.time-pivot)*factor:k.time+delta;
   if(!Number.isFinite(next)||next<0||next>p.duration)throw Error('Key times must stay inside the scene');
   if(n.actionClips?.some(c=>c.travel&&next>=c.start-1e-6&&next<=c.start+c.duration+1e-6))throw Error('A travel action owns that time interval');
   k.time=Number(next.toFixed(6));
  }else throw Error('Unsupported keyframe operation');
  result.push({nodeId:n.id,time:k.time});
 }
 for(const n of new Set(selected.map(s=>s.n))){n.keys.sort((a,b)=>a.time-b.time);if(n.keys.some((k,i)=>i&&sameTime(k.time,n.keys[i-1].time)))throw Error('Two keys cannot occupy the same time on one object');}
 return result;
}
export function copyKeys(p,refs){return resolve(p,refs).map(({n,k})=>({nodeId:n.id,key:structuredClone(k)}));}
export function pasteKeys(p,data,at,destination){
 if(!data?.length)throw Error('Copy keys first');const earliest=Math.min(...data.map(d=>d.key.time)),single=new Set(data.map(d=>d.nodeId)).size===1,result=[];
 for(const d of data){const n=p.nodes.find(n=>n.id===(single&&destination?destination:d.nodeId));if(!n)throw Error('A copied object no longer exists; choose a destination object');const k=structuredClone(d.key);k.time=Number((at+k.time-earliest).toFixed(6));delete k.travelRefs;const why=keyEditReason(p,n,k);if(why)throw Error(why);if(k.time<0||k.time>p.duration||n.keys.some(o=>sameTime(o.time,k.time)))throw Error('Pasted keys must fit inside the scene without replacing existing keys');n.keys.push(k);n.keys.sort((a,b)=>a.time-b.time);result.push({nodeId:n.id,time:k.time});}return result;
}
export function addSampledKey(p,nodeId,time){const n=p.nodes.find(n=>n.id===nodeId);if(!n)throw Error('Select an object');const k={time,...sampleTransform(n,time)},why=keyEditReason(p,n,k);if(why)throw Error(why);if(n.keys.some(o=>sameTime(o.time,time)))throw Error('A transform key already exists at the playhead');n.keys.push(k);n.keys.sort((a,b)=>a.time-b.time);return [{nodeId:n.id,time}];}
