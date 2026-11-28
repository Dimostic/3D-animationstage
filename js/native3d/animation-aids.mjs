import * as THREE from 'three';
const dispose=g=>{for(const child of [...g.children]){child.traverse(o=>{o.geometry?.dispose();const materials=Array.isArray(o.material)?o.material:[o.material];materials.forEach(m=>{m?.map?.dispose();m?.dispose();});});g.remove(child);}};
function timeLabel(time,point){const canvas=document.createElement('canvas');canvas.width=128;canvas.height=40;const ctx=canvas.getContext('2d');ctx.fillStyle='#152538dd';ctx.fillRect(0,0,128,40);ctx.font='24px sans-serif';ctx.fillStyle='#ffdf87';ctx.textAlign='center';ctx.fillText(time.toFixed(2)+' s',64,29);const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(canvas),depthTest:false,transparent:true}));sprite.position.copy(point).add(new THREE.Vector3(0,.12,0));sprite.scale.set(.48,.15,1);sprite.name='Motion trail time';sprite.raycast=()=>{};return sprite;}
export function createAnimationAids(w){
 const group=new THREE.Group();group.name='Animation editor aids';w.helpers.add(group);const ghosts=new THREE.Group(),trail=new THREE.Group();group.add(ghosts,trail);
 const settings={ghosts:false,trail:false,before:1,after:1,spacing:.2,opacity:.22,start:0,end:null,samples:33};let dirty=true,signature='',project=null,trailSignature='',message='';
 function clear(){dispose(ghosts);dispose(trail);signature=trailSignature='';message='';dirty=true;}
 function snapshot(root,color,opacity,budget){
  root.updateWorldMatrix(true,true);root.traverseVisible(o=>{if(!o.isMesh||o.isInstancedMesh||!o.geometry?.attributes.position)return;const count=o.geometry.attributes.position.count;if(count>budget.left){message='Ghost detail limit reached; some meshes are omitted';return;}budget.left-=count;const a=new Float32Array(count*3),v=new THREE.Vector3();for(let i=0;i<count;i++){o.getVertexPosition(i,v);v.applyMatrix4(o.matrixWorld);v.toArray(a,i*3);}const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(a,3));if(o.geometry.index)geometry.setIndex(o.geometry.index.clone());const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2,side:THREE.DoubleSide}));mesh.name='Ghost pose';mesh.userData={sampleTime:w.time,sourceUuid:o.uuid};mesh.raycast=()=>{};ghosts.add(mesh);});
 }
 function update(){
  group.visible=!!w.project&&!w.playing&&!w.starting&&!w.exporting&&!w.cameraView&&!w.gizmo.dragging&&!w.drawingActive&&!w.gripPreview&&!w.gripEditor?.id;
  if(!group.visible||!w.project)return;const selected=w.entries.get(w.selected);if(!selected){dispose(ghosts);dispose(trail);signature=trailSignature='';return;}
  if(project!==w.project){clear();project=w.project;}
  const next=JSON.stringify([w.selected,w.time,settings]);if(!dirty&&signature===next)return;dirty=false;signature=next;message='';
  ghosts.visible=settings.ghosts;trail.visible=settings.trail;if(!settings.ghosts)dispose(ghosts);if(!settings.trail){dispose(trail);trailSignature='';}
  if(!settings.ghosts&&!settings.trail)return;
  const current=w.time,previousSampling=w.animationSampling;w.animationSampling=true;
  try{
   if(settings.ghosts){dispose(ghosts);const budget={left:250000};for(const [direction,count,color]of [[-1,settings.before,0xff6688],[1,settings.after,0x66bbff]])for(let step=1;step<=count;step++){const time=current+direction*step*settings.spacing;if(time<0||time>w.project.duration)continue;w.seek(time,true);snapshot(selected.root,color,settings.opacity/(1+(step-1)*.5),budget);}}
   // World-space samples include evaluated parents, travel and contact placement.
   const key=JSON.stringify([w.selected,settings.start,settings.end,settings.samples,w.project.nodes.map(n=>[n.id,n.parent,n.position,n.rotation,n.scale,n.keys,n.action,n.actionClips,n.seat,n.attachment,n.rest,n.collision]),w.project.collisionProtection]);
   if(settings.trail&&key!==trailSignature){dispose(trail);trailSignature=key;const points=[],a=Math.min(settings.start,w.project.duration),b=Math.min(settings.end??w.project.duration,w.project.duration),count=settings.samples;
    if(b>a)for(let i=0;i<count;i++){const time=a+(b-a)*i/(count-1);w.seek(time,true);selected.root.updateWorldMatrix(true,false);const point=selected.root.getWorldPosition(new THREE.Vector3());points.push(point);const marker=new THREE.Mesh(new THREE.SphereGeometry(.035,6,4),new THREE.MeshBasicMaterial({color:i===0?0x66ee99:i===count-1?0xffaa55:0xffdd66,depthTest:false}));marker.position.copy(point);marker.userData.sampleTime=time;marker.name='Motion trail sample';marker.raycast=()=>{};trail.add(marker);}
    if(points.length){const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0xffdd66,transparent:true,opacity:.8}));line.name='Motion trail';line.raycast=()=>{};trail.add(line);points.forEach((point,i)=>{if(i%Math.ceil((count-1)/8)===0||i===count-1)trail.add(timeLabel(a+(b-a)*i/(count-1),point));});}
   }
  }finally{w.seek(current,true);w.animationSampling=previousSampling;dirty=false;}
 }
 return {settings,group,ghosts,trail,update,clear,get message(){return message;},invalidate(){dirty=true;},configure(values){Object.assign(settings,values);settings.before=Math.max(0,Math.min(3,Math.round(settings.before)));settings.after=Math.max(0,Math.min(3,Math.round(settings.after)));settings.spacing=Math.max(.02,Math.min(10,settings.spacing));settings.opacity=Math.max(.05,Math.min(.6,settings.opacity));dirty=true;w.request();},dispose(){clear();group.removeFromParent();}};
}
