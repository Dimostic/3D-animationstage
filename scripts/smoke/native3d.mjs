import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {chromium} from 'playwright';
import {createProject,createNode,validateProject,sampleTransform,demoProject} from '../../js/native3d/project.mjs';
const p=demoProject();assert.equal(validateProject(p).units,'metres');
const bad=structuredClone(p);bad.nodes[0].parent=bad.nodes[0].id;assert.throws(()=>validateProject(bad),/cyclic/);
const duplicate=structuredClone(p);duplicate.nodes.push({...duplicate.nodes[0]});assert.throws(()=>validateProject(duplicate),/duplicate/);
const wrong=structuredClone(p);wrong.nodes[0].position[0]=Infinity;assert.throws(()=>validateProject(wrong),/Invalid/);
const missing=structuredClone(p);missing.nodes[0].parent='missing';assert.throws(()=>validateProject(missing),/Missing/);
assert.throws(()=>validateProject({format:'animstage'}),/existing editor/);
const n=createNode('box');n.keys=[{time:0,position:[0,0,0],rotation:[0,170*Math.PI/180,0],scale:[1,1,1]},{time:2,position:[2,0,0],rotation:[0,-170*Math.PI/180,0],scale:[2,2,2]}];
assert.equal(sampleTransform(n,1).position[0],1);assert.ok(Math.abs(sampleTransform(n,1).rotation[1]-Math.PI)<1e-8);
const root=path.resolve('dist');
const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost'),file=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(root+path.sep)||!fs.statSync(file,{throwIfNoEntry:false})?.isFile())return res.writeHead(404).end();res.setHeader('Content-Type',({'.js':'application/javascript','.html':'text/html','.css':'text/css','.glb':'model/gltf-binary'})[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
    const page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('favicon'))errors.push(m.text());});
    await page.addInitScript(()=>{window.contexts=0;const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(type==='webgl2')window.contexts++;return original.call(this,type,...args);};});
    await page.goto(`http://127.0.0.1:${server.address().port}/assets/studio3d/index.html`);
    await page.waitForFunction(()=>window.Native3D?.project?.nodes.length===11,null,{timeout:60000});
    assert.equal(await page.evaluate(()=>window.contexts),1,'Native workspace must use one WebGL renderer');
    assert.equal(await page.locator('#hierarchy [role=treeitem]').count(),11);
    await page.screenshot({path:'tmp/native3d-desktop.png'});
    const rig=await page.evaluate(()=>{
        const world=Native3D.world,actors=[...world.entries.values()].filter(e=>e.actor);
        return actors.map(e=>({name:e.node.name,head:e.actor.bone('head').getWorldPosition(world.camera.position.clone()).toArray(),parent:e.root.parent===world.content}));
    });assert.equal(rig.length,2);assert.ok(rig.every(a=>a.parent&&a.head[1]>1.2&&a.head[1]<2.5),'Actors must use metre scale in the same scene');
    await page.selectOption('#add-kind','box');await page.click('#add');await page.waitForFunction(()=>Native3D.project.nodes.length===12);
    await page.locator('[name=name]').fill('Animated cube');await page.locator('[name=position0]').fill('1');await page.locator('#object-form [type=submit]').click();
    await page.waitForFunction(()=>Native3D.project.nodes.some(n=>n.name==='Animated cube'&&n.position[0]===1));
    await page.click('#key');await page.waitForFunction(()=>Native3D.project.nodes.find(n=>n.name==='Animated cube').keys.length===1);
    await page.locator('#time').evaluate(el=>{el.value='2';el.dispatchEvent(new Event('input',{bubbles:true}));});
    await page.locator('[name=position0]').fill('3');await page.locator('#object-form [type=submit]').click();
    await page.waitForFunction(()=>Native3D.project.nodes.find(n=>n.name==='Animated cube').keys.length===2);
    const seek=await page.evaluate(()=>{const w=Native3D.world,n=Native3D.project.nodes.find(n=>n.name==='Animated cube');return [1,2,0,1].map(t=>{w.seek(t);return w.entries.get(n.id).root.position.x;});});assert.deepEqual(seek,[2,3,1,2]);
    const save=page.waitForEvent('download');await page.click('#save');const projectDownload=await save;await projectDownload.saveAs('tmp/native3d-roundtrip.stage3d');
    const saved=JSON.parse(fs.readFileSync('tmp/native3d-roundtrip.stage3d'));assert.equal(saved.units,'metres');assert.equal(saved.viewerStart.eyeHeight,1.65);
    await page.click('#delete');await page.waitForFunction(()=>Native3D.project.nodes.length===11);await page.click('#undo');await page.waitForFunction(()=>Native3D.project.nodes.length===12);await page.click('#redo');await page.waitForFunction(()=>Native3D.project.nodes.length===11);
    page.once('dialog',d=>d.accept());await page.locator('#project-file').setInputFiles('tmp/native3d-roundtrip.stage3d');await page.waitForFunction(()=>Native3D.project.nodes.length===12);
    // GLB export/import must preserve real scene geometry as embedded data.
    await page.selectOption('#export-type','glb');const glb=page.waitForEvent('download',{timeout:60000});await page.click('#export');const glbFile=await glb;await glbFile.saveAs('tmp/native3d-snapshot.glb');assert.ok(fs.statSync('tmp/native3d-snapshot.glb').size>1000);
    await page.locator('#model-file').setInputFiles('tmp/native3d-snapshot.glb');await page.waitForFunction(()=>Native3D.project.nodes.length===13,null,{timeout:60000});
    assert.equal(await page.evaluate(()=>Object.keys(Native3D.project.assets).length),1);
    // A GLB that references external files must fail before network access or scene mutation.
    const json=Buffer.from(JSON.stringify({asset:{version:'2.0'},buffers:[{uri:'https://example.invalid/model.bin',byteLength:4}]}));const padded=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]),buffer=Buffer.alloc(20+padded.length);buffer.writeUInt32LE(0x46546c67,0);buffer.writeUInt32LE(2,4);buffer.writeUInt32LE(buffer.length,8);buffer.writeUInt32LE(padded.length,12);buffer.writeUInt32LE(0x4e4f534a,16);padded.copy(buffer,20);
    await page.locator('#model-file').setInputFiles({name:'external.glb',mimeType:'model/gltf-binary',buffer});await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('external URLs'));assert.equal(await page.evaluate(()=>Native3D.project.nodes.length),13);
    // The expected rejected import is reported deliberately, not a rendering failure.
    errors.splice(0,errors.length,...errors.filter(s=>!s.includes('external URLs')));
    const before=await page.evaluate(()=>Native3D.world.renderer.info.memory.geometries);
    await page.evaluate(async()=>{const scene=JSON.parse(JSON.stringify(Native3D.project));for(let i=0;i<4;i++)await Native3D.install(scene);});
    const after=await page.evaluate(()=>Native3D.world.renderer.info.memory.geometries);assert.ok(after<=before+8,'Repeated scene loads leaked GPU geometry');
    await page.selectOption('#quality','draft');assert.equal(await page.evaluate(()=>Native3D.world.renderer.getPixelRatio()),.75);
    await page.selectOption('#export-type','png');const png=page.waitForEvent('download');await page.click('#export');await(await png).saveAs('tmp/native3d-image.png');
    await page.setViewportSize({width:390,height:844});await page.screenshot({path:'tmp/native3d-mobile.png',fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true);
    await page.evaluate(async()=>{const p=JSON.parse(JSON.stringify(Native3D.project));p.name='Recovery test';p.nodes=p.nodes.filter(n=>n.kind!=='model');p.assets={};await Native3D.install(p);});
    page.once('dialog',d=>d.accept());await page.reload();await page.waitForFunction(()=>window.Native3D,null,{timeout:60000});
    await page.locator('#recover').waitFor({state:'visible'});await page.click('#recover');await page.waitForFunction(()=>Native3D.project.name==='Recovery test');
    const camera=await page.evaluate(()=>Native3D.project.camera);await page.click('#camera-view');assert.equal(await page.evaluate(()=>Native3D.world.helpers.visible),false);assert.deepEqual(await page.evaluate(()=>Native3D.world.shot.position.toArray()),camera.position);
    assert.deepEqual(errors,[]);console.log('PASS native 3D: one shared renderer, metre-scaled rigs, hierarchy, transforms, reversible keyframes, undo/redo, save/reopen, embedded GLB import/export, external URI rejection, resource cleanup, quality, PNG and mobile layout');
}finally{await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
