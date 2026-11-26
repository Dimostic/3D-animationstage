export function enforceEditLocks(before,after,{lockOnly=false}={}){
    const old=new Map(before.nodes.map(n=>[n.id,n])),next=new Map(after.nodes.map(n=>[n.id,n]));
    const unlockedCopy=n=>{const c={...n};delete c.locked;return JSON.stringify(c);};
    if(lockOnly){if(before.nodes.length!==after.nodes.length||JSON.stringify({...before,nodes:[]})!==JSON.stringify({...after,nodes:[]}))throw Error('Lock commands can only change object locks');for(const n of before.nodes)if(!next.has(n.id)||unlockedCopy(n)!==unlockedCopy(next.get(n.id)))throw Error('Lock commands can only change object locks');return;}
    for(const n of before.nodes){let ancestors=[],at=n;while(at){ancestors.push(at);at=old.get(at.parent);}if(!ancestors.some(a=>a.locked))continue;const current=next.get(n.id);if(!current||JSON.stringify(current)!==JSON.stringify(n))throw Error(n.name+' is locked. Select it in the Scene list and unlock it first.');for(const a of ancestors.slice(1)){const b=next.get(a.id);if(!b||['position','rotation','scale','keys','parent'].some(k=>JSON.stringify(a[k])!==JSON.stringify(b[k])))throw Error('This group contains locked objects; unlock them before moving the group');}}
}
