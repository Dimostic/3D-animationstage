import {validateProject} from './project.mjs';

// Copy a complete subtree. Only references inside the subtree acquire new IDs.
export function copyGroup(project,id){
    const root=project.nodes.find(n=>n.id===id);if(root?.kind!=='group')throw Error('Select a group first');
    const ids=new Set([id]);let previous;do{previous=ids.size;for(const n of project.nodes)if(ids.has(n.parent))ids.add(n.id);}while(previous!==ids.size);
    const source=project.nodes.filter(n=>ids.has(n.id)),speech=project.speech.filter(c=>ids.has(c.actorId));
    if(project.nodes.length+source.length>300||project.speech.length+speech.length>100)throw Error('This copy would exceed the scene limit of 300 objects or 100 speech clips');
    for(const n of source){
        if(n.rest?.targetId&&!ids.has(n.rest.targetId))throw Error(`Include ${n.name}'s supporting surface before duplicating this group, or release the link.`);
        if(n.seat&&!ids.has(n.seat.chairId))throw Error(`Include ${n.name}'s linked chair in this group before duplicating it, or unlink the chair.`);
        if(n.attachment&&!ids.has(n.attachment.actorId))throw Error(`Include ${n.name}'s holding character in this group before duplicating it, or detach the object.`);
    }
    const remap=new Map(source.map(n=>[n.id,crypto.randomUUID()])),clone=value=>JSON.parse(JSON.stringify(value));
    const nodes=source.map(original=>{const n=clone(original);n.id=remap.get(original.id);n.parent=remap.get(n.parent)||n.parent;
        if(n.collision?.ignore)n.collision.ignore=n.collision.ignore.map(id=>remap.get(id)||id);
        if(n.rest){if(n.rest.targetId)n.rest.targetId=remap.get(n.rest.targetId);else n.rest.point[0]+=.5;}
        if(n.seat)n.seat.chairId=remap.get(n.seat.chairId);
        if(n.attachment)n.attachment.actorId=remap.get(n.attachment.actorId);
        if(remap.has(n.gazeTarget))n.gazeTarget=remap.get(n.gazeTarget);
        n.actionClips?.forEach(c=>{const old=c.id;c.id=crypto.randomUUID();if(n.collision?.mode==='action'&&n.collision.actionId===old)n.collision.actionId=c.id;});
        if(original.id===id){n.name=n.name.slice(0,155)+' copy';n.position[0]+=.5;for(const k of n.keys)k.position[0]+=.5;}
        return n;
    });
    const clips=speech.map(original=>({...clone(original),id:crypto.randomUUID(),actorId:remap.get(original.actorId)}));
    const candidate=validateProject({...project,nodes:[...project.nodes,...nodes],speech:[...project.speech,...clips]});
    return {project:candidate,rootId:remap.get(id),count:nodes.length,speechCount:clips.length};
}
