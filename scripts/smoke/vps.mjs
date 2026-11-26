import {checkDrawingUsability} from './native3d-drawing-usability.mjs';
import {checkDrawing} from './native3d-drawing.mjs';
import {checkRecoveryTravel} from './native3d-recovery-travel.mjs';
import {checkAuthoring} from './native3d-authoring.mjs';
import {checkTimedExceptions} from './native3d-timed-exceptions.mjs';
import {checkSliding} from './native3d-sliding.mjs';
import {checkContactPlacement} from './native3d-contact-placement.mjs';
import {checkExceptions} from './native3d-exceptions.mjs';
import {checkSolidity} from './native3d-solidity.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import { createFile } from 'mp4box';
import {checkGroups} from './native3d-groups.mjs';
import {checkGrouping} from './native3d-grouping.mjs';
import {checkProps} from './native3d-props.mjs';

if(process.env.STUDIO3D_TARGET&&!['preview','production'].includes(process.env.STUDIO3D_TARGET))throw Error('Unknown 3D test target');
const previewTarget=process.env.STUDIO3D_TARGET==='preview';
const base = previewTarget?'https://preview.3d.animationstage.com':'https://3d.animationstage.com';
// Password stays in process memory. Never log it or the asset capability URLs.
const key = process.env.STUDIO3D_SSH_KEY || path.join(os.homedir(), '.ssh', 'animationstage3d_ed25519');
const password = execFileSync('ssh', ['-o', 'BatchMode=yes', '-i', key, 'root@2.25.19.84', `cat /etc/${previewTarget?'animationstage3d-preview':'animationstage3d'}/private-beta-password`], { encoding: 'utf8' }).trim();
for (const resource of ['/', '/index.html', '/api/preview-shell.php', '/js/vendor/realistic-3d/renderer.js', '/assets/realistic-3d/amaka.glb', '/assets/examples/teacher-colleague.animstage', '/assets/studio3d/index.html', '/assets/studio3d/audio/amaka.wav', '/api/realistic-3d-asset.php?file=renderer']) {
    assert.equal((await fetch(base + resource)).status, 401, 'Private resource must reject unauthenticated access: ' + resource);
}
assert.equal((await fetch(base + '/api/realistic-3d-asset.php?file=renderer&ticket=9999999999.' + '0'.repeat(64))).status, 401);
assert.equal((await fetch(base + '/api/realistic-3d-asset.php?file=../../etc/passwd')).status, 404);
console.log('PASS hosted access control: editor, models, preview shell, invalid tickets and asset allowlist');
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
    const context = await browser.newContext({ httpCredentials: { username: 'studio3d', password, origin: base }, viewport: { width: 1280, height: 900 } });
    const page = await context.newPage(), errors = [];
    // Optional Google fonts must not delay functional acceptance of the studio.
    await page.route('https://fonts.googleapis.com/**', route => route.abort());
    await page.route('https://fonts.gstatic.com/**', route => route.abort());
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => { localStorage.setItem('frd-done', '1'); localStorage.setItem('animstage_onboarded', '1'); });
    const response = await page.goto(base + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    assert.equal(response.status(), 200);
    console.log('PASS HTTPS editor response');
    assert.match(response.headers()['content-security-policy'], /nonce-/);
    assert.match(response.headers()['cache-control'], /no-store/);
    try {
        await page.waitForFunction(() => window.app?.exporter && window.Realistic3DLibrary && window.Studio3DHome, null, { timeout: 60000 });
    } catch {
        const diagnostic = await page.evaluate(() => ({app:!!window.app, exporter:!!window.app?.exporter, library:!!window.Realistic3DLibrary, home:!!window.Studio3DHome, message:document.body.innerText.slice(0,500)}));
        throw Error('Hosted editor startup failed: '+JSON.stringify({diagnostic,errors}).replace(/\d{10}\.[a-f0-9]{64}/g,'[asset-ticket]'));
    }
    assert.match(await page.evaluate(() => window.__appAssetVersion), /^\d{8}T\d{6}Z(?:-[a-z0-9]+)?$/);
    const security = await page.evaluate(async () => {
        const renderer = await import(Realistic3DLibrary.url); await renderer.preload(['amaka', 'tunde']);
        const unsigned = new URL(Realistic3DLibrary.previewUrl); unsigned.searchParams.delete('ticket');
        const valid = await fetch(Realistic3DLibrary.previewUrl);
        return { valid: valid.status, signed: new URL(Realistic3DLibrary.previewUrl).searchParams.has('ticket'), noAccount: !window.__STAGE_USER,
            allNonce: [...document.querySelectorAll('script')].every(s => !!s.nonce) };
    });
    assert.equal(security.valid, 200); assert.equal(security.signed, true); assert.equal(security.noAccount, true); assert.equal(security.allNonce, true);
    console.log('PASS hosted nonce policy, authenticated rigs and signed asset response');
    if(previewTarget){
        const productionPassword=execFileSync('ssh',['-o','BatchMode=yes','-i',key,'root@2.25.19.84','cat /etc/animationstage3d/private-beta-password'],{encoding:'utf8'}).trim();
        const html=await(await fetch('https://3d.animationstage.com/',{headers:{Authorization:'Basic '+Buffer.from('studio3d:'+productionPassword).toString('base64')}})).text();
        const match=html.match(/__STUDIO3D_ASSET_TICKET=("[^"]+")/);
        if(!match)throw Error('Production capability bootstrap missing');
        const productionTicket=JSON.parse(match[1]);
        const previewTicket=await page.evaluate(()=>window.__STUDIO3D_ASSET_TICKET);
        const asset=(host,ticket)=>host+'/api/realistic-3d-asset.php?file=renderer&ticket='+encodeURIComponent(ticket);
        assert.equal((await fetch(asset('https://3d.animationstage.com',productionTicket))).status,200);
        assert.equal((await fetch(asset(base,productionTicket))).status,401,'Production ticket must not authorize staging assets');
        assert.equal((await fetch(asset('https://3d.animationstage.com',previewTicket))).status,401,'Staging ticket must not authorize production assets');
        console.log('PASS staging/production capability isolation');
    }
    await page.locator('#studio-3d-library').click();
    await page.locator('#studio-3d-home [data-open-example]').waitFor();
    await page.locator('#studio-3d-home [data-close]').click();
    const exampleActors = await page.evaluate(async () => {
        const response = await fetch('assets/examples/teacher-colleague.animstage');
        if (!response.ok) throw Error('Hosted example missing');
        return (await response.json()).objects.filter(o => o.realistic3D).length;
    });
    assert.equal(exampleActors, 2);
    const actorId = await page.evaluate(async () => {
        app._scheduleAutosave = () => {};
        const actor = new StageObject('image', { name: 'Hosted speech test', x: app.stage.width * .35, y: app.stage.height * .2, width: 240, height: 334, realistic3D: { id: 'amaka', heldProp: 'documentLeft', gaze:'document' } });
        const renderer = await import(Realistic3DLibrary.url);
        Object.assign(actor.realistic3D, renderer.chairPlacement(actor));
        app.objects.addObject(actor); app.objects.select([actor.id]);
        const other = new StageObject('image', { name: 'Hosted second rig', x: app.stage.width * .6, y: app.stage.height * .2, width: 240, height: 334, realistic3D: { id: 'tunde', gaze:'character', gazeTarget:actor.id } });
        Object.assign(other.realistic3D, renderer.chairPlacement(other));
        app.objects.addObject(other); Realistic3DLibrary.addAction(app, other, 'wave', 2);
        Realistic3DLibrary.addAction(app, other, 'sit', 1);
        const audio = app.audioTimeline;
        const ac = new AudioContext(), buffer = ac.createBuffer(1, 24000, 8000), channel = buffer.getChannelData(0);
        for (let i = 0; i < channel.length; i++) channel[i] = Math.sin(i / 8000 * Math.PI * 2 * 180) * .15;
        const wav = audio._audioBufferToWavBlob(buffer); await ac.close();
        const track = await audio._createLoadedTrack({ audioId: 'hosted-line', characterId: actor.id, fileName: 'Hosted synthetic audio', mimeType: 'audio/wav', dataUrl: await audio._readBlobAsDataUrl(wav), arrayBuffer: await wav.arrayBuffer() });
        audio.tracks.push(track); audio._applyActiveTrack(track);
        Realistic3DLibrary.open(app, actor);
        return actor.id;
    });
    const dialog = page.locator('#realistic-3d-library');
    await dialog.locator('[data-recorded]:enabled').waitFor();
    assert.equal(await dialog.locator('[name=chair]').inputValue(), 'standard');
    await dialog.locator('[name=gaze]').selectOption('camera');
    await dialog.locator('[name=action]').selectOption('sit');
    await dialog.locator('[name=seconds]').fill('1');
    const speech = dialog.locator('[data-action-speech]');
    await speech.locator('.sequence-speech > summary').click();
    await speech.getByLabel('Speech audio', { exact: true }).selectOption('hosted-line');
    await speech.getByLabel('Create linked captions').check();
    await speech.getByLabel('Caption text (optional override)').fill('Private 3D studio test.');
    await dialog.locator('[data-action]').click();
    await dialog.waitFor({ state: 'detached' });
    const project = await page.evaluate(async id => {
        const actor = app.objects.getObjectById(id);
        if (!actor.animations.some(a => a.type === 'audio-lip-sync')) throw Error('Lip sync missing');
        const data = app.exporter.serializeProject();
        app.exporter.deserializeProject(data); await app.exporter._projectLoadReady;
        const roundtrip = app.exporter.serializeProject();
        const renderer = await import(Realistic3DLibrary.url);
        if (!app.objects.objects.filter(o=>o.realistic3D).every(o=>renderer.sampleGaze(o,app.objects.objects))) throw Error('Hosted gaze roundtrip failed');
        for (const value of roundtrip.objects.filter(o => o.realistic3D)) {
            const seated = StageObject.fromJSON(value); seated.realistic3DSit = 1;
            const contact = renderer.sampleChairContact(seated), soles = renderer.sampleWalkPose(seated);
            if (!contact || contact.error > .0001 || soles.some(foot => Math.abs(foot.surface - contact.floor) > .0001)) throw Error('Hosted chair contact failed');
        }
        if (roundtrip.audio.tracks[0].audioId !== 'hosted-line' || !roundtrip.objects.some(o => o.type === 'caption' && o.captionAudioId === 'hosted-line')) throw Error('Audio/caption roundtrip failed');
        return roundtrip;
    }, actorId);
    fs.writeFileSync('tmp/hosted-studio-regression.animstage', JSON.stringify(project));
    console.log('PASS hosted speech, captions and project roundtrip');
    const popupEvent = page.waitForEvent('popup');
    await page.locator('#btn-preview').click();
    const popup = await popupEvent;
    const previewErrors = [];
    const redact = text => text.replace(/\d{10}\.[a-f0-9]{64}/g, '[asset-ticket]');
    popup.on('pageerror', error => previewErrors.push(redact(error.message)));
    popup.on('console', message => { if (message.type() === 'error') previewErrors.push(redact(message.text())); });
    const frame = await (await popup.locator('iframe').elementHandle()).contentFrame();
    await frame.waitForFunction(() => document.querySelector('#preview-audio-start button') || window.__realistic3DRenderer, null, { timeout: 30000 });
    const unlock = frame.getByRole('button', { name: 'Play with sound' });
    if (await unlock.isVisible()) await unlock.click();
    try {
        await frame.waitForFunction(() => window.__realistic3DRenderer && typeof objects !== 'undefined' && objects.some(o => o.realistic3D), null, { timeout: 60000 });
    } catch {
        const status = await frame.evaluate(() => document.body.innerText.slice(0, 800));
        throw Error('Hosted preview failed: ' + JSON.stringify({ status: redact(status), errors: previewErrors }));
    }
    await frame.waitForFunction(() => objects.some(o => o.realistic3DSit > .99), null, { timeout: 30000 });
    await frame.waitForFunction(() => {
        const actor = objects.find(o => o.realistic3D?.id === 'amaka');
        return actor && window.__realistic3DRenderer.sampleChairContact(actor)?.error < .0001;
    }, null, { timeout: 60000 });
    await frame.waitForFunction(() => {try{return objects.filter(o=>o.realistic3D).every(o=>window.__realistic3DRenderer.sampleGaze(o,objects));}catch{return false;}}, null, {timeout:30000});
    await popup.screenshot({ path: 'tmp/hosted-3d-preview.png' });
    await popup.close();
    console.log('PASS sandboxed hosted preview playback');
    const downloaded = page.waitForEvent('download', { timeout: 120000 });
    await page.evaluate(() => app.exporter.exportMediaRecorder('mp4', 640, 360, 12, 24, 3500));
    const file = await downloaded; await file.saveAs('tmp/hosted-3d-export.mp4');
    const bytes = fs.readFileSync('tmp/hosted-3d-export.mp4'), binary = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength); binary.fileStart = 0;
    const mp4 = createFile(); mp4.appendBuffer(binary); mp4.flush();
    assert.ok(mp4.getInfo().tracks.some(t => t.type === 'video' && t.nb_samples >= 30));
    assert.ok(mp4.getInfo().tracks.some(t => t.type === 'audio'));
    await page.screenshot({ path: 'tmp/hosted-3d-studio.png' });
    assert.deepEqual(errors, []);
    const native = await context.newPage(), nativeErrors=[];
    native.on('pageerror',error=>nativeErrors.push(error.message));
    await native.goto(base+'/assets/studio3d/index.html',{waitUntil:'domcontentloaded',timeout:60000});
    await native.waitForFunction(()=>window.Native3D?.project.nodes.length===11,null,{timeout:60000});
    assert.equal(await native.locator('#hierarchy [role=treeitem]').count(),11);
    await native.selectOption('#add-kind','emoji');await native.click('#add');
    await native.waitForFunction(()=>Native3D.project.nodes.some(n=>n.kind==='emoji'));
    assert.equal(await native.evaluate(()=>Native3D.project.units),'metres');
    await native.selectOption('#quality','draft');await native.screenshot({path:'tmp/hosted-native3d.png'});
    native.once('dialog',dialog=>dialog.accept());await native.click('#conversation-example');
    await native.waitForFunction(()=>Native3D.project.speech.length===2,null,{timeout:60000});
    await native.evaluate(()=>Native3D.world.seek(Native3D.project.speech[0].start+.8));
    assert.equal(await native.evaluate(()=>Native3D.world.captionEntries.length),1);
    await native.click('#play');await native.waitForFunction(()=>Native3D.world.playing&&Native3D.world.audio.context.state==='running'&&Native3D.world.audio.sources.size>0);
    await native.click('#play');assert.equal(await native.evaluate(()=>Native3D.world.audio.sources.size),0);
    const nativeMovie=await native.evaluate(async()=>{const start=Native3D.project.speech[0].start,result=await Native3D.exportMovie({width:320,height:180,fps:12,start,end:start+.17,quality:'draft',format:'auto',sound:true,captions:true});return {bytes:result.blob.size,frames:result.frames,audio:result.audio,restored:!Native3D.world.exporting};});
    assert.ok(nativeMovie.bytes>1000);assert.equal(nativeMovie.frames,3);assert.equal(nativeMovie.audio,true);assert.equal(nativeMovie.restored,true);
    await checkGroups(native);
    await checkGrouping(native);
    await checkProps(native);
    await checkSolidity(native);
    await checkExceptions(native);
    await checkTimedExceptions(native);
    await checkContactPlacement(native);
    await checkSliding(native);
    await checkAuthoring(native);
    await checkDrawing(native);await checkDrawingUsability(native);
    await checkRecoveryTravel(native);
    assert.deepEqual(nativeErrors,[]);await native.close();
    console.log('PASS live native 3D workspace: shared world, models, hierarchy, metre units, 3D objects, quality, native speech and captions');
    console.log('PASS live HTTPS studio: example discovery, named gaze, both rigs, chair seat/sole contact, document, nonce policy, sandbox preview, speech/captions, save/reopen and MP4 video/audio');
    await context.close();
} finally { await browser.close(); }
