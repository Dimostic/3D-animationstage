export const surfaceKinds=['box','plane','table','chair','cylinder'];
export function validateSurfaceLinks(p,ids){
    const finite=(n,a,b)=>typeof n==='number'&&Number.isFinite(n)&&n>=a&&n<=b;
    const linkedChairs=new Set(p.nodes.filter(n=>n.seat).map(n=>n.seat.chairId));
    for(const n of p.nodes){
        if(n.solid!==undefined&&typeof n.solid!=='boolean')throw Error('Solid for placement must be enabled or disabled');
        if(n.rest===undefined)continue;const r=n.rest;
        if(!r||!['box','sphere','cylinder','plane','chair','table','document','emoji','text','model','group'].includes(n.kind)||n.keys.length||n.attachment||n.seat||linkedChairs.has(n.id))throw Error('Surface links need a free object without transform keys, hand ownership or chair contact');
        if(!Array.isArray(r.point)||r.point.length!==3||!r.point.every(v=>finite(v,-10000,10000))||!Array.isArray(r.rotation)||r.rotation.length!==4||!r.rotation.every(v=>finite(v,-1,1))||Math.abs(r.rotation.reduce((sum,v)=>sum+v*v,0)-1)>.001||!Number.isInteger(r.meshIndex)||r.meshIndex<0)throw Error('Invalid surface contact point or rotation');
        const descendants=new Set([n.id]);let old;do{old=descendants.size;for(const child of p.nodes)if(descendants.has(child.parent))descendants.add(child.id);}while(old!==descendants.size);
        if(p.nodes.some(child=>descendants.has(child.id)&&(child.kind==='character'||child.attachment||child.seat||linkedChairs.has(child.id))))throw Error('Release character, hand and chair contacts before linking this group to a surface');
        for(let parent=n.parent?ids.get(n.parent):null;parent;parent=parent.parent?ids.get(parent.parent):null)if([parent,...parent.keys].some(t=>Math.max(...t.scale)-Math.min(...t.scale)>1e-6))throw Error('A resting object needs uniformly scaled parent groups');
        if(r.targetId===null){if(r.meshIndex!==0)throw Error('Invalid fixed surface plane');continue;}
        const target=ids.get(r.targetId),maxIndex=target?.kind==='table'?4:target?.kind==='chair'?5:0;
        if(!target||!surfaceKinds.includes(target.kind)||target.attachment||r.meshIndex>maxIndex||target.kind==='cylinder'&&target.shape?.radiusTop===0)throw Error('Choose a native flat surface with a solid top');
        for(let parent=target;parent;parent=parent.parent?ids.get(parent.parent):null)if([parent,...parent.keys].some(t=>Math.abs(t.rotation[0])+Math.abs(t.rotation[2])>1e-6)||parent.rest&&(Math.abs(parent.rest.rotation[0])+Math.abs(parent.rest.rotation[2])>1e-6))throw Error('Linked support surfaces must stay upright; turn them around Y only');
    }
    const visiting=new Set(),done=new Set();function visit(id){if(done.has(id))return;if(visiting.has(id))throw Error('Cyclic surface links or hierarchy');visiting.add(id);const n=ids.get(id);if(n.parent)visit(n.parent);if(n.rest?.targetId)visit(n.rest.targetId);visiting.delete(id);done.add(id);}for(const n of p.nodes)visit(n.id);
}
