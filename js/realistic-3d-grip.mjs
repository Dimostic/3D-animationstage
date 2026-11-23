import {Vector3,Quaternion,Matrix4} from 'three';
function handVertices(mesh,arm){
    arm.surfaceIndices??=new WeakMap();if(arm.surfaceIndices.has(mesh))return arm.surfaceIndices.get(mesh);
    const index=mesh.geometry.attributes.skinIndex,weights=mesh.geometry.attributes.skinWeight,list=[];
    for(let i=0;i<index.count;i++){let hand=0,thumb=0;for(let j=0;j<4;j++){const name=mesh.skeleton.bones[index.getComponent(i,j)]?.name||'',weight=weights.getComponent(i,j);if(name==='wrist_'+arm.side||name.startsWith('finger')&&name.endsWith('_'+arm.side))hand+=weight;if(name.startsWith('finger1-')&&name.endsWith('_'+arm.side))thumb+=weight;}if(hand>.35&&thumb<.15)list.push(i);}
    arm.surfaceIndices.set(mesh,list);return list;
}
export function prepareHandSurface(state,arm,style,outfit,pinch){
    arm.wrist.updateWorldMatrix(true,true);
    // This is the anatomical curl direction used by bindFingers. Inferring it
    // from wrist-to-knuckle versus fingertip directions can select the dorsum.
    const q=arm.wrist.getWorldQuaternion(new Quaternion()),normal=arm.palm.clone().applyQuaternion(q);
    const localNormal=normal.clone().applyQuaternion(q.clone().invert()),y=arm.hand.clone(),x=new Vector3().crossVectors(y,localNormal).normalize(),z=new Vector3().crossVectors(x,y).normalize();
    // A sheet is supported by the palmar surfaces, not by curled fingers which
    // would pass through it. Edge hold retains a little finger flexion.
    for(const finger of arm.fingers.slice(1))for(const bone of finger)bone.quaternion.slerp(new Quaternion(),style==='edge'?.8:1);
    state.actor.updateMatrixWorld(true);
    const mesh=state.nodes.get(outfit===1?'Body1':'Body0'),samples=[];
    for(const i of handVertices(mesh,arm)){const p=arm.wrist.worldToLocal(mesh.getVertexPosition(i,new Vector3()).applyMatrix4(mesh.matrixWorld));if(p.dot(y)>.08)samples.push(p);}
    const knuckles=arm.wrist.worldToLocal(arm.middle.getWorldPosition(new Vector3()).add(arm.index.getWorldPosition(new Vector3())).multiplyScalar(.5));
    const center=knuckles.multiplyScalar(.6);
    let depth=-Infinity;for(const p of samples)depth=Math.max(depth,p.dot(z));if(!Number.isFinite(depth))throw Error('Hand surface could not be measured');
    center.addScaledVector(z,depth+.035-center.dot(z));
    const thumbBase=arm.wrist.worldToLocal(arm.fingers[0][0].getWorldPosition(new Vector3())),direction=thumbBase.clone().sub(center).dot(x)<0?1:-1;
    arm.nativeFrame={point:center,rotation:new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(x,y,z)),normal:z,samples,style,direction};
    // Keep the thumb on the upper face of the supported sheet. Its root stays
    // outside the nearby paper edge; the fingers support the opposite face.
    const target=arm.wrist.localToWorld(center.clone().addScaledVector(z,.14));pinch(arm,target);state.actor.updateMatrixWorld(true);
    arm.nativeFrame.edge=thumbPlaneEdge(mesh,arm,center,style==='edge'?y:x,z,style==='edge'?1:direction);
}
function thumbPlaneEdge(mesh,arm,center,x,normal,direction){
    arm.thumbTriangles??=new WeakMap();let triangles=arm.thumbTriangles.get(mesh);const g=mesh.geometry,index=g.index,skin=g.attributes.skinIndex,weights=g.attributes.skinWeight;
    if(!triangles){triangles=[];for(let i=0;i<(index?index.count:g.attributes.position.count);i+=3){const ids=[0,1,2].map(j=>index?index.getX(i+j):i+j);if(ids.some(id=>[0,1,2,3].some(j=>{const name=mesh.skeleton.bones[skin.getComponent(id,j)]?.name||'';return weights.getComponent(id,j)>.25&&name.startsWith('finger1-')&&name.endsWith('_'+arm.side);})))triangles.push(ids);}arm.thumbTriangles.set(mesh,triangles);}
    const vertices=new Map(),get=i=>{if(!vertices.has(i))vertices.set(i,arm.wrist.worldToLocal(mesh.getVertexPosition(i,new Vector3()).applyMatrix4(mesh.matrixWorld)));return vertices.get(i);};let edge=0,found=false;
    for(const triangle of triangles){const ps=triangle.map(get),ds=ps.map(p=>p.clone().sub(center).dot(normal));for(let i=0;i<3;i++){const j=(i+1)%3;if(ds[i]*ds[j]>0||Math.abs(ds[j]-ds[i])<1e-9)continue;const point=ps[i].clone().lerp(ps[j],-ds[i]/(ds[j]-ds[i]));edge=Math.max(edge,direction*point.sub(center).dot(x));found=true;}}
    return found?edge+.02:0;
}
export function measuredGrip(arm){
    const frame=arm.nativeFrame;if(!frame)throw Error('Prepare the hand grip before attaching an object');
    const wrist=arm.wrist.getWorldPosition(new Vector3()),q=arm.wrist.getWorldQuaternion(new Quaternion());
    return {point:arm.wrist.localToWorld(frame.point.clone()),rotation:q.clone().multiply(frame.rotation),normal:frame.normal.clone().applyQuaternion(q),wrist,support:frame.samples.map(p=>arm.wrist.localToWorld(p.clone())),paperDirection:frame.direction,paperEdge:frame.edge*arm.wrist.getWorldScale(new Vector3()).x,style:frame.style};
}
