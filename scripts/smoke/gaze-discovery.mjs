import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { chromium } from 'playwright';

const root = path.resolve('dist');
const evidence = process.argv.includes('--verify') ? 'tmp' : 'examples/teacher-colleague/evidence';
const server = http.createServer((req,res) => {
    const url = new URL(req.url,'http://localhost');
    if (url.pathname === '/api/preview-shell.php') return res.writeHead(200, {'content-type':'text/html', 'content-security-policy':JSON.parse(fs.readFileSync('scripts/fixtures/preview-policy.json'))}).end(fs.readFileSync('scripts/fixtures/preview-shell.html'));
    const aliases = {renderer:'/js/vendor/realistic-3d/renderer.js',amaka:'/assets/realistic-3d/amaka.glb',tunde:'/assets/realistic-3d/tunde.glb'};
    const name = url.pathname === '/api/realistic-3d-asset.php' ? aliases[url.searchParams.get('file')] : url.pathname === '/' ? '/index.html' : url.pathname;
    if (!name) return res.writeHead(404).end();
    const file = path.resolve(root,'.'+name);
    if (!file.startsWith(root+path.sep) || !fs.statSync(file,{throwIfNoEntry:false})?.isFile()) return res.writeHead(404).end();
    res.setHeader('content-type', ({'.js':'application/javascript','.css':'text/css','.html':'text/html','.glb':'model/gltf-binary'})[path.extname(file)] || 'application/octet-stream');
    res.setHeader('access-control-allow-origin','*');
    fs.createReadStream(file).pipe(res);
});
await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
const browser = await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
    const page = await browser.newPage({viewport:{width:1280,height:900}}), errors = [];
    page.on('pageerror',error => errors.push(error.message));
    await page.route('https://**/*',route => route.abort());
    await page.addInitScript(() => {localStorage.setItem('frd-done','1');localStorage.setItem('animstage_onboarded','1');});
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.waitForFunction(() => window.app?.exporter && window.Realistic3DLibrary && window.Studio3DHome);
    await page.evaluate(() => {app._scheduleAutosave=()=>{};});
    await page.locator('#studio-3d-library').click();
    const hub = page.locator('#studio-3d-home');
    await hub.waitFor();
    await hub.screenshot({path:'tmp/3d-studio-home.png'});
    await page.setViewportSize({width:390,height:844});
    assert.equal(await hub.evaluate(el=>el.getBoundingClientRect().width<=innerWidth && el.scrollWidth<=el.clientWidth+2),true,'Studio panel overflows mobile width');
    await page.setViewportSize({width:1280,height:900});
    assert.equal(await hub.locator('[data-edit-character]').isDisabled(),true);
    // Cancelling example replacement must leave the current project intact.
    const before = await page.evaluate(() => app.exporter.projectName);
    page.once('dialog',dialog => dialog.dismiss());
    await hub.locator('[data-open-example]').click();
    assert.equal(await page.evaluate(() => app.exporter.projectName), before);
    page.once('dialog',dialog => dialog.accept());
    await hub.locator('[data-open-example]').click();
    await hub.waitFor({state:'detached'});
    await page.waitForFunction(() => app.objects.objects.filter(o=>o.realistic3D).length === 2);
    const results = await page.evaluate(async () => {
        const renderer = await import(Realistic3DLibrary.url); await renderer.preload(['amaka','tunde']);
        const actors = app.objects.objects.filter(o=>o.realistic3D), checks=[];
        for (const id of ['amaka','tunde']) for (const outfit of [0,1]) for (const yaw of [-180,-135,-90,-45,0,45,90,135]) {
            const a = new StageObject('image',{x:200,y:150,width:240,height:334,realistic3D:{id,outfit,yaw,heldProp:'documentLeft',gaze:'camera'}});
            const b = new StageObject('image',{x:440,y:150,width:240,height:334,realistic3D:{id:id==='amaka'?'tunde':'amaka',gaze:'character',gazeTarget:a.id}});
            for (const gaze of ['camera','document','character']) {
                Object.assign(a.realistic3D,{gaze,gazeTarget:b.id});
                for (const sitting of [0,.5,1]) {
                    Object.assign(a.realistic3D,renderer.chairPlacement(a)); a.realistic3DSit=sitting;
                    const c=renderer.sampleGaze(a,[a,b]);
                    if (!c || !Object.values(c).filter(v=>typeof v==='number').every(Number.isFinite) || Math.abs(c.headYaw)>60.001 || Math.abs(c.headPitch)>25.001 || Math.abs(c.eyeYaw)>22.001 || Math.abs(c.eyePitch)>12.001) throw Error('Gaze limits/target resolution failed');
                    const repeat=renderer.sampleGaze(a,[a,b]);
                    if (JSON.stringify(c)!==JSON.stringify(repeat)) throw Error('Gaze depends on render history');
                    checks.push({id,outfit,yaw,sitting,...c});
                }
            }
            a.realistic3D.gaze='manual'; a.realistic3DSit=0;
            if (renderer.sampleGaze(a,[a,b])!==null) throw Error('Manual gaze changed');
            a.realistic3D.gaze='character'; a.realistic3D.gazeTarget='missing';
            if (renderer.sampleGaze(a,[a,b])!==null) throw Error('Missing target did not fall back');
            a.realistic3D.gazeTarget=b.id; b.visible=false;
            if (renderer.sampleGaze(a,[a,b])!==null) throw Error('Hidden target did not fall back');
            b.visible=true; a.realistic3DGazeBlend=0;
            if (renderer.sampleGaze(a,[a,b])!==null) throw Error('Released gaze retained ownership');
            a.realistic3DGazeBlend=1; a.realistic3D.gaze='document'; a.realistic3D.heldProp='none';
            if (renderer.sampleGaze(a,[a,b])!==null) throw Error('Missing document did not fall back');
        }
        const a=actors[0], b=actors[1];
        a.realistic3D.gaze='character'; a.realistic3D.gazeTarget=b.id;
        b.realistic3D.gaze='character'; b.realistic3D.gazeTarget=a.id;
        const initial=renderer.sampleGaze(a,actors); b.realistic3D.chairX+=100;
        const moved=renderer.sampleGaze(a,actors); b.realistic3D.chairX-=100;
        if (Math.abs(initial.target[0]-moved.target[0])<1) throw Error('Gaze did not follow moved target');
        for (const t of [13000,18000,5000,13000]) {app.animations.currentTime=t;app.animations.applyAnimationsAtTime(t,{timelinePreview:true}); renderer.sampleGaze(a,actors);}
        const data=app.exporter.serializeProject();app.exporter.deserializeProject(data);await app.exporter._projectLoadReady;
        const restored=app.objects.objects.filter(o=>o.realistic3D);
        if (restored[0].realistic3D.gazeTarget!==restored[1].id) throw Error('Gaze target identity lost on reopen');
        const look=Realistic3DLibrary.addAction(app,restored[0],'look',.5), release=Realistic3DLibrary.addAction(app,restored[0],'releaseGaze',.5);
        for (const [clip,from,to] of [[look,0,1],[release,1,0]]) if(clip.generated[0].property!=='realistic3DGazeBlend'||clip.generated[0].from!==from||clip.generated[0].to!==to) throw Error('Gaze action track failed');
        for(const [t,expected] of [[look.delay,0],[look.delay+250,.5],[release.delay+250,.5],[release.delay+500,0],[look.delay+250,.5]]) {
            app.animations.currentTime=t;app.animations.applyAnimationsAtTime(t,{timelinePreview:true});
            if(Math.abs(restored[0].realistic3DGazeBlend-expected)>.001) throw Error('Timed gaze blend/reverse seek failed');
        }
        restored[0].animations=restored[0].animations.filter(c=>c!==look&&c!==release);
        app.animations.seekToStart();
        app.objects.select([restored[0].id]);
        return checks;
    });
    fs.writeFileSync(`${evidence}/gaze-checks.json`,JSON.stringify(results,null,2));
    await page.locator('#studio-3d-library').click();
    await hub.locator('[data-edit-character]').click();
    const editor=page.locator('#realistic-3d-library');
    await editor.locator('[name=gaze]').selectOption('document');
    assert.equal(await page.evaluate(() => app.objects.getSelectedObjects()[0].realistic3D.gaze),'character');
    await editor.getByRole('button',{name:'Apply Appearance',exact:true}).click();
    await editor.waitFor({state:'detached'});
    assert.equal(await page.evaluate(() => app.objects.getSelectedObjects()[0].realistic3D.gaze),'document');
    // Show the camera/document/character choices together for a visual review.
    const sheet=await page.evaluate(async () => {
        const renderer=await import(Realistic3DLibrary.url), canvas=document.createElement('canvas');canvas.width=1200;canvas.height=900;
        const ctx=canvas.getContext('2d');ctx.fillStyle='#e8edf1';ctx.fillRect(0,0,1200,900);
        let n=0;
        for(const id of ['amaka','tunde']) for(const gaze of ['camera','document','character']) {
            const a=new StageObject('image',{x:0,y:0,width:300,height:417,realistic3D:{id,yaw:25,heldProp:'documentLeft',gaze}});
            const b=new StageObject('image',{x:100,y:0,width:300,height:417,realistic3D:{id:id==='amaka'?'tunde':'amaka'}});a.realistic3D.gazeTarget=b.id;
            const tile=document.createElement('canvas');tile.width=300;tile.height=417;renderer.draw(tile.getContext('2d'),a,undefined,0,0,[a,b]);
            const x=n%3*400,y=Math.floor(n/3)*450;ctx.drawImage(tile,x+50,y+25);ctx.fillStyle='#17242b';ctx.font='18px sans-serif';ctx.fillText(id+' — '+gaze,x+20,y+24);n++;
        }
        return canvas.toDataURL();
    });
    fs.writeFileSync(`${evidence}/gaze-views.png`,Buffer.from(sheet.split(',')[1],'base64'));
    const popupEvent=page.waitForEvent('popup');await page.locator('#btn-preview').click();const popup=await popupEvent;
    const frame=await (await popup.locator('iframe').elementHandle()).contentFrame();
    await frame.waitForFunction(()=>document.querySelector('#preview-audio-start button') || window.__realistic3DRenderer,null,{timeout:60000});
    const unlock=frame.getByRole('button',{name:'Play with sound'});if(await unlock.isVisible())await unlock.click();
    await frame.waitForFunction(()=>window.__realistic3DRenderer,null,{timeout:60000});
    await frame.waitForFunction(()=>{try{return objects.filter(o=>o.realistic3D).every(o=>!!window.__realistic3DRenderer.sampleGaze(o,objects));}catch{return false;}},null,{timeout:30000});
    await popup.close();assert.deepEqual(errors,[]);
    console.log(`PASS 3D discovery: example open/cancel, selected character editing; ${results.length} gaze cases, movement, fallback, limits, save/reopen, timeline actions and sandboxed popup`);
} finally {await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
