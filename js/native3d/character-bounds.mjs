import {Box3,Vector3,Matrix4,Mesh} from 'three';
import {bodyParts} from './solidity.mjs';
const cache=new WeakMap(),point=new Vector3();
function region(name){name=(name||'').toLowerCase();if(/head|eye|neck|jaw|tongue/.test(name))return 'head';const side=/_l(?:\b|$)/.test(name)?'left':/_r(?:\b|$)/.test(name)?'right':null;if(side&&/arm|wrist|finger|clavicle|scapula/.test(name))return side+'Arm';if(side&&/leg|pelvis|foot|toe/.test(name))return side+'Leg';return 'torso';}
function prepared(mesh){const signature=(mesh.morphTargetInfluences||[]).join(','),old=cache.get(mesh);if(old?.signature===signature)return old;
    const groups=new Map(),position=mesh.geometry.attributes.position,index=mesh.geometry.attributes.skinIndex,weight=mesh.geometry.attributes.skinWeight;
    if(!index||!weight)return {signature,groups};
    const value=(a,i,j)=>a.getComponent(i,j);
    for(let i=0;i<position.count;i++){
        let dominant=0;for(let j=1;j<4;j++)if(value(weight,i,j)>value(weight,i,dominant))dominant=j;
        const part=region(mesh.skeleton.bones[value(index,i,dominant)]?.name);if(!groups.has(part))groups.set(part,new Map());const boxes=groups.get(part);
        Mesh.prototype.getVertexPosition.call(mesh,i,point);point.applyMatrix4(mesh.bindMatrix);
        for(let j=0;j<4;j++){if(value(weight,i,j)<=0)continue;const bone=value(index,i,j),inverse=mesh.skeleton.boneInverses[bone];if(!inverse)continue;if(!boxes.has(bone))boxes.set(bone,new Box3());boxes.get(bone).expandByPoint(point.clone().applyMatrix4(inverse));}
    }
    const result={signature,groups};cache.set(mesh,result);return result;
}
export function characterBounds(entry){
    const result=new Map(bodyParts.map(part=>[part,new Box3()]));entry.root.updateWorldMatrix(true,false);entry.root.updateMatrixWorld(true);
    entry.root.traverse(mesh=>{if(!mesh.isMesh)return;for(let o=mesh;o;o=o.parent)if(!o.visible)return;
        if(mesh.isSkinnedMesh){const data=prepared(mesh),prefix=new Matrix4().multiplyMatrices(mesh.matrixWorld,mesh.bindMatrixInverse);for(const [part,boxes]of data.groups)for(const [index,box]of boxes){const bone=mesh.skeleton.bones[index];if(bone)result.get(part).union(box.clone().applyMatrix4(prefix.clone().multiply(bone.matrixWorld)));}}
        else{if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();let bone=mesh.parent;while(bone&&!bone.isBone)bone=bone.parent;result.get(region(bone?.name)).union(mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld));}
    });
    return [...result].filter(([,box])=>!box.isEmpty()).map(([part,box])=>({part,box:box.expandByScalar(.003)}));
}
export function skinnedBounds(mesh){
    const box=new Box3(),prefix=new Matrix4().multiplyMatrices(mesh.matrixWorld,mesh.bindMatrixInverse);
    for(const boxes of prepared(mesh).groups.values())for(const [index,bounds]of boxes){const bone=mesh.skeleton.bones[index];if(bone)box.union(bounds.clone().applyMatrix4(prefix.clone().multiply(bone.matrixWorld)));}
    return box.expandByScalar(.003);
}

// Opt-in contact bounds: measure the posed skin rather than bone influence envelopes.
const contactCache=new WeakMap();
export function contactBounds(entry){
    const result=new Map(bodyParts.map(part=>[part,new Box3()]));entry.root.updateWorldMatrix(true,false);entry.root.updateMatrixWorld(true);
    entry.root.traverse(mesh=>{if(!mesh.isMesh)return;for(let o=mesh;o;o=o.parent)if(!o.visible)return;
        if(mesh.isSkinnedMesh){
            const relative=mesh.skeleton.bones.map(b=>new Matrix4().multiplyMatrices(mesh.bindMatrixInverse,b.matrixWorld).elements.map(v=>Math.round(v*1e8)).join(',')).join(';')+'|'+(mesh.morphTargetInfluences||[]).join(',');
            let data=contactCache.get(mesh);
            if(data?.signature!==relative){mesh.skeleton.update();const boxes=new Map(bodyParts.map(part=>[part,new Box3()])),indices=mesh.geometry.attributes.skinIndex,weights=mesh.geometry.attributes.skinWeight;
                for(let i=0;i<mesh.geometry.attributes.position.count;i++){let dominant=0;for(let j=1;j<4;j++)if(weights.getComponent(i,j)>weights.getComponent(i,dominant))dominant=j;const part=region(mesh.skeleton.bones[indices.getComponent(i,dominant)]?.name);mesh.getVertexPosition(i,point);boxes.get(part).expandByPoint(point);}
                data={signature:relative,boxes};contactCache.set(mesh,data);
            }
            for(const [part,box]of data.boxes)if(!box.isEmpty())result.get(part).union(box.clone().applyMatrix4(mesh.matrixWorld));
        }else{if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();let bone=mesh.parent;while(bone&&!bone.isBone)bone=bone.parent;result.get(region(bone?.name)).union(mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld));}
    });return [...result].filter(([,box])=>!box.isEmpty()).map(([part,box])=>({part,box:box.expandByScalar(.001)}));
}
