import {Matrix4,Vector3,Quaternion,Euler} from 'three';
import {createNode,validateProject} from './project.mjs';
const copy=o=>JSON.parse(JSON.stringify(o));
const matrix=t=>new Matrix4().compose(new Vector3(...t.position),new Quaternion().setFromEuler(new Euler(...t.rotation)),new Vector3(...t.scale));
const near=(a,b)=>a.every((v,i)=>Math.abs(v-b[i])<1e-9);

export function groupObjects(project,selection,name,pivot=[0,0,0]){
    const ids=new Set(selection),nodes=project.nodes.filter(n=>ids.has(n.id));
    if(!nodes.length||nodes.length!==ids.size)throw Error('Choose at least one existing object');
    if(nodes.some(n=>n.parent!==nodes[0].parent))throw Error('Choose objects in the same parent group');
    if(project.nodes.length>=300)throw Error('The scene limit is 300 objects; remove an object before creating a group');
    const group=createNode('group',{name:name.trim()||'New group',parent:nodes[0].parent,position:[...pivot]}),p=copy(project);
    for(const n of p.nodes)if(ids.has(n.id)){n.parent=group.id;for(const t of [n,...n.keys])t.position=t.position.map((v,i)=>v-pivot[i]);}
    p.nodes.push(group);return {project:validateProject(p),selected:group.id,count:nodes.length};
}

export function ungroupObjects(project,id){
    const group=project.nodes.find(n=>n.id===id);if(group?.kind!=='group')throw Error('Select a group to ungroup');
    if(group.keys.length)throw Error('This group has transform animation. Keep it grouped to preserve its motion; ungrouping animated groups comes later.');
    const p=copy(project),children=p.nodes.filter(n=>n.parent===id),uniform=near(group.scale,[group.scale[0],group.scale[0],group.scale[0]]),simple=near(group.rotation,[0,0,0])&&uniform,m=matrix(group);
    for(const n of children){
        if(!simple&&n.keys.length&&n.keys.some(k=>!near(k.rotation,n.keys[0].rotation)))throw Error(`${n.name} has animated rotation. Keep this rotated/scaled group to preserve interpolation, or restore the group's rotation to zero and use uniform scale.`);
        for(const t of [n,...n.keys]){
            if(simple){t.position=t.position.map((v,i)=>group.position[i]+v*group.scale[0]);t.scale=t.scale.map(v=>v*group.scale[0]);continue;}
            const combined=m.clone().multiply(matrix(t)),position=new Vector3(),rotation=new Quaternion(),scale=new Vector3();combined.decompose(position,rotation,scale);
            const check=new Matrix4().compose(position,rotation,scale);
            if(combined.elements.some((v,i)=>Math.abs(v-check.elements[i])>1e-7*Math.max(1,Math.abs(v))))throw Error(`Ungrouping ${n.name} would distort its shape. Use uniform group scale or keep the group.`);
            // Preserve the upright Y representation even beyond 90 degrees.
            // Canonical XYZ decomposition can otherwise introduce X/Z half turns.
            const upright=Math.abs(group.rotation[0])+Math.abs(group.rotation[2])+Math.abs(t.rotation[0])+Math.abs(t.rotation[2])<1e-9,y=group.rotation[1]+t.rotation[1];
            t.position=position.toArray();const e=new Euler().setFromQuaternion(rotation);t.rotation=upright?[0,y,0]:[e.x,e.y,e.z];t.scale=scale.toArray();
        }
        n.parent=group.parent;n.visible=n.visible&&group.visible;
    }
    p.nodes=p.nodes.filter(n=>n.id!==id);
    return {project:validateProject(p),selected:children[0]?.id||group.parent,count:children.length};
}
