export const bodyParts=['head','torso','leftArm','rightArm','leftLeg','rightLeg'];
export function solidNow(node,time){
    const c=node.collision;if(!c)return node.solid!==false;if(c.parts&&c.parts.length===0)return false;
    if(c.mode==='never')return false;
    if(c.mode==='range')return time>=c.start&&time<c.end;
    if(c.mode==='action'){const clip=c.actionId==='legacy'?node.action:node.actionClips?.find(a=>a.id===c.actionId);return !!clip&&clip.name!=='idle'&&time>=clip.start&&time<clip.start+clip.duration;}
    return true;
}
export function validateSolidity(p){
    const finite=(n,min,max)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
    if(p.collisionProtection!==undefined&&typeof p.collisionProtection!=='boolean')throw Error('Invalid scene solid protection');
    const nodes=new Map(p.nodes.map(n=>[n.id,n]));
    for(const n of p.nodes){const c=n.collision;if(c===undefined)continue;
        if(!c||!['always','never','range','action'].includes(c.mode)||!['auto','fixed','move'].includes(c.response))throw Error('Choose a valid solid mode and playback response');
        if(c.ignore!==undefined&&(!Array.isArray(c.ignore)||c.ignore.length>299||new Set(c.ignore).size!==c.ignore.length||c.ignore.some(id=>typeof id!=='string'||id===n.id||!nodes.has(id)||['camera','light'].includes(nodes.get(id).kind))))throw Error('Choose existing objects or characters for collision exceptions');
        if(c.fit!==undefined&&!['safe','close'].includes(c.fit))throw Error('Choose a valid contact fit');
        if(c.clearance!==undefined&&!finite(c.clearance,0,1))throw Error('Extra clearance must be between 0 and 1 metre');
        if(c.mode==='range'&&(!finite(c.start,0,p.duration)||!finite(c.end,c.start+.001,p.duration)))throw Error('Solid timing needs a start and later end within the scene');
        if(c.mode==='action'&&(n.kind!=='character'||typeof c.actionId!=='string'||!c.actionId||c.actionId.length>160))throw Error('Action-linked solidity needs a character action');
        if(c.parts!==undefined&&(!Array.isArray(c.parts)||c.parts.length>256||new Set(c.parts).size!==c.parts.length||n.kind==='group'||c.parts.some(part=>typeof part!=='string'||(n.kind==='character'?!bodyParts.includes(part):!/^\d+(?:\.\d+){0,31}$/.test(part)||part.split('.').some(i=>Number(i)>4096)))))throw Error('Choose valid solid body regions or mesh parts');
    }
}
