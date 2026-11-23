import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {chromium} from 'playwright';
import {createProject,createNode} from '../js/native3d/project.mjs';
import {propCatalogue,makeProp} from '../js/native3d/prop-library.mjs';

// Reproducible previews of the actual geometry, using one shared native renderer.
const root=path.resolve('dist'),destination=path.resolve('assets/studio3d/props');fs.mkdirSync(destination,{recursive:true});
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep)||!fs.statSync(file,{throwIfNoEntry:false})?.isFile())return res.writeHead(404).end();res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{const page=await browser.newPage({viewport:{width:1200,height:900}});await page.goto(`http://127.0.0.1:${server.address().port}/assets/studio3d/index.html`);await page.waitForFunction(()=>window.Native3D,null,{timeout:60000});
    for(const spec of propCatalogue){const p=createProject(),prop=makeProp(spec.id);p.nodes=[...prop.nodes,createNode('plane',{name:'Preview floor',shape:{width:20,depth:20},color:'#263443'}),createNode('light',{position:[3,5,4],intensity:3,color:'#fff2dd'})];p.ambient=1.6;p.view={position:[4,3,5],target:[0,.8,0]};
        const png=await page.evaluate(async({p,id})=>{await Native3D.install(p,{reset:true});const w=Native3D.world;Native3D.select(id);w.renderer.setPixelRatio(1);w.renderer.setSize(480,360,false);w.camera.aspect=4/3;w.camera.updateProjectionMatrix();w.frameSelection();return w.screenshot().split(',')[1];},{p,id:prop.rootId});fs.writeFileSync(path.join(destination,spec.id+'.png'),Buffer.from(png,'base64'));
    }console.log('Rendered '+propCatalogue.length+' native prop previews. Rebuild to include them in dist.');
}finally{await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
