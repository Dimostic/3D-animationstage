import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createProject,createNode,validateProject,VERSION} from '../../js/native3d/project.mjs';
import {shapeValues,shapeSize} from '../../js/native3d/shapes.mjs';

export async function checkShapes(page){
    const p=createProject();p.nodes=['box','plane','sphere','cylinder'].map((kind,i)=>createNode(kind,{id:'shape-'+kind,name:'Shape '+kind,position:[i*2,0,0]}));
    for(const version of [1,2,3,4,5,6]){const old=structuredClone(p);old.version=version;const upgraded=validateProject(old);assert.equal(upgraded.version,VERSION);assert.deepEqual(shapeSize(upgraded.nodes[0]),[1,1,1]);assert.equal(shapeValues(upgraded.nodes[2]).radius,.5);}
    for(const shape of [{width:0,height:1,depth:1},{width:Infinity,height:1,depth:1},{width:1,height:1,depth:1,extra:1},{width:1,height:1},{width:1001,height:1,depth:1}]){const bad=structuredClone(p);bad.nodes[0].shape=shape;assert.throws(()=>validateProject(bad),/shape dimensions/);}
    const bad=structuredClone(p);bad.nodes[3].shape={radiusTop:0,radiusBottom:0,height:1};assert.throws(()=>validateProject(bad),/nonzero/);bad.nodes[0].kind='group';bad.nodes[0].shape={width:1,height:1,depth:1};assert.throws(()=>validateProject(bad),/shape dimensions/);
    const saved=await page.evaluate(()=>JSON.parse(JSON.stringify(Native3D.project)));
    await page.setViewportSize({width:1500,height:1000});await page.evaluate(async p=>{await Native3D.install(p,{reset:true});Native3D.select('shape-box');},p);
    await page.locator('#shape-panel').evaluate(el=>el.open=true);
    assert.equal(await page.locator('#shape-panel').evaluate(el=>el.parentElement.id),'object-form');
    assert.equal(await page.locator('#object-form').evaluate(el=>el.checkValidity()),true,'Dimension inputs must not block the main Apply Changes form');
    const set=async(key,value)=>page.locator(`[data-dimension="${key}"]`).fill(String(value));
    const wait=()=>page.waitForFunction(()=>document.querySelector('#loading').hidden);
    const bounds=()=>page.evaluate(()=>{const w=Native3D.world,e=w.entries.get(w.selected);e.root.updateWorldMatrix(true,true);const b=new w.box.box.constructor().setFromObject(e.root);return {min:b.min.toArray(),size:b.getSize(w.camera.position.clone()).toArray()};});
    await page.evaluate(()=>{const mesh=Native3D.world.entries.get('shape-box').root.children[0];mesh.geometry.addEventListener('dispose',()=>window.shapeGeometryDisposed=true);});
    await set('width',2);await set('height',3);await set('depth',4);await page.click('#shape-apply');await page.waitForFunction(()=>Native3D.project.nodes[0].shape?.height===3);
    assert.deepEqual((await bounds()).size,[2,3,4]);assert.equal((await bounds()).min[1],0);assert.equal(await page.evaluate(()=>window.shapeGeometryDisposed),true);
    await page.click('#undo');await page.waitForFunction(()=>!Native3D.project.nodes[0].shape);assert.deepEqual((await bounds()).size,[1,1,1]);await page.click('#redo');await page.waitForFunction(()=>Native3D.project.nodes[0].shape?.width===2);
    await set('height',-1);await page.click('#shape-apply');await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Invalid shape'));assert.equal(await page.evaluate(()=>Native3D.project.nodes[0].shape.height),3);await set('height',3);
    const download=page.waitForEvent('download');await page.click('#save');await(await download).saveAs('tmp/native3d-shapes.stage3d');const file=JSON.parse(fs.readFileSync('tmp/native3d-shapes.stage3d'));assert.equal(file.version,VERSION);assert.deepEqual(file.nodes[0].shape,{width:2,height:3,depth:4});
    await page.locator('#project-file').setInputFiles('tmp/native3d-shapes.stage3d');await wait();await page.evaluate(()=>Native3D.select('shape-box'));assert.deepEqual((await bounds()).size,[2,3,4]);
    await page.evaluate(()=>Native3D.select('shape-plane'));await set('width',6);await set('depth',8);await page.click('#shape-apply');await page.waitForFunction(()=>Native3D.project.nodes[1].shape?.width===6);const floor=await bounds();assert.ok(Math.abs(floor.size[0]-6)<1e-5&&Math.abs(floor.size[2]-8)<1e-5&&floor.size[1]<1e-5);
    await page.evaluate(()=>Native3D.select('shape-sphere'));await set('radius',.75);await page.click('#shape-apply');await page.waitForFunction(()=>Native3D.project.nodes[2].shape?.radius===.75);assert.deepEqual((await bounds()).size,[1.5,1.5,1.5]);assert.equal((await bounds()).min[1],0);
    await page.evaluate(()=>Native3D.select('shape-cylinder'));await set('radiusTop',0);await set('radiusBottom',.8);await set('height',2.5);await page.click('#shape-apply');await page.waitForFunction(()=>Native3D.project.nodes[3].shape?.radiusTop===0);const cone=await bounds();assert.ok(Math.abs(cone.size[0]-1.6)<1e-6);assert.equal(cone.size[1],2.5);assert.equal(cone.min[1],0);
    // Exported mesh, rather than metadata alone, must carry the dimensions.
    assert.ok(await page.evaluate(async()=>{const w=Native3D.world,buffer=await w.exportGLB(),dv=new DataView(buffer),json=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,20,dv.getUint32(12,true))).trim());return json.accessors.some(a=>a.type==='VEC3'&&a.min?.[0]===-1&&a.max?.[0]===1&&a.max?.[1]===1.5);}));
    await page.evaluate(async()=>{const p=JSON.parse(JSON.stringify(Native3D.project)),n=p.nodes[0];n.keys=[{time:0,position:[1,0,0],rotation:[0,0,0],scale:[1,1,1]},{time:4,position:[3,0,0],rotation:[0,.5,0],scale:[2,2,2]}];const group={...JSON.parse(JSON.stringify(n)),id:'shape-parent',kind:'group',name:'Parent',keys:[],position:[1,0,1],rotation:[0,.3,0],scale:[2,2,2]};delete group.shape;p.nodes.push(group);n.parent=group.id;await Native3D.install(p);Native3D.world.seek(4);Native3D.select(n.id);window.shapeKeys=JSON.stringify(Native3D.project.nodes[0].keys);});
    await set('width',3);await page.click('#shape-apply');await page.waitForFunction(()=>Native3D.project.nodes[0].shape.width===3);assert.equal(await page.evaluate(()=>JSON.stringify(Native3D.project.nodes[0].keys)===window.shapeKeys),true);assert.match(await page.locator('#shape-size').textContent(),/6 × 6 × 8 m/);await page.evaluate(()=>Native3D.world.seek(0));assert.match(await page.locator('#shape-size').textContent(),/3 × 3 × 4 m/);
    await page.click('#shape-reset');await page.waitForFunction(()=>!Native3D.project.nodes[0].shape);assert.equal(await page.evaluate(()=>JSON.stringify(Native3D.project.nodes[0].keys)===window.shapeKeys),true);
    await page.evaluate(async p=>{await Native3D.install(p,{reset:true});Native3D.select(p.nodes.find(n=>n.kind==='character').id);},saved);assert.equal(await page.locator('#shape-panel').isVisible(),false);
    // Saved grip anchors must not silently become invalid after reshaping.
    await page.evaluate(async()=>{const p=JSON.parse(JSON.stringify(Native3D.project)),doc=p.nodes.find(n=>n.attachment);doc.kind='box';doc.keys=[];await Native3D.install(p);Native3D.select(doc.id);});assert.equal(await page.locator('#shape-apply').isDisabled(),true);
    await page.evaluate(async p=>{await Native3D.install(p,{reset:true});},saved);
    console.log('PASS primitive dimensions: v1–v6 compatibility, validation/rollback, four shapes/cones, base anchoring, geometry disposal, Undo/Redo, save/reopen, GLB geometry, grouped scale/keys, live size readout and grip protection');
}
