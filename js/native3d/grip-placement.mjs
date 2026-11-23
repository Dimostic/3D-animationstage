import * as THREE from 'three';
export function gripAnchor(entry,grip){const a=entry.node.attachment;if(a?.anchor)return new THREE.Vector3().fromArray(a.anchor);if(entry.node.kind==='document'){const scale=entry.root.getWorldScale(new THREE.Vector3());return grip.style==='edge'?new THREE.Vector3(0,-grip.paperEdge/scale.y,0):new THREE.Vector3(-grip.paperDirection*(.105+grip.paperEdge/scale.x),.045,0);}entry.gripCenter??=localObjectCenter(entry.root);return entry.gripCenter.clone();}
export function clearPaper(entry,grip,position,rotation,scale,actorScale){
    if(entry.node.kind!=='document')return {correction:0,minClearance:null,samples:0};
    const inverse=rotation.clone().invert(),normal=new THREE.Vector3(0,0,1).applyQuaternion(rotation),side=normal.dot(grip.normal)>=0?1:-1,clearance=.0015*actorScale,maxX=.105,maxY=.297,half=.0015*scale.z;
    let correction=0,samples=0,minClearance=Infinity;
    for(const point of grip.support){const local=point.clone().sub(position).applyQuaternion(inverse).divide(scale);if(Math.abs(local.x)>maxX||local.y<0||local.y>maxY)continue;samples++;const gap=-local.z*side*scale.z-half;minClearance=Math.min(minClearance,gap);correction=Math.max(correction,clearance-gap);}
    if(correction>0)position.addScaledVector(normal,side*correction);
    return {correction,minClearance:samples?minClearance+correction:null,samples};
}
export function localObjectCenter(root){const box=new THREE.Box3();root.updateWorldMatrix(true,true);const inverse=root.matrixWorld.clone().invert();root.traverse(o=>{if(!o.isMesh)return;o.geometry.computeBoundingBox();const bounds=o.geometry.boundingBox,matrix=inverse.clone().multiply(o.matrixWorld);if(bounds)box.union(bounds.clone().applyMatrix4(matrix));});return box.isEmpty()?new THREE.Vector3():box.getCenter(new THREE.Vector3());}
