import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import { createFile } from 'mp4box';

const base = 'https://3d.animationstage.com';
// Password stays in process memory. Never log it or the asset capability URLs.
const key = process.env.STUDIO3D_SSH_KEY || path.join(os.homedir(), '.ssh', 'animationstage3d_ed25519');
const password = execFileSync('ssh', ['-o', 'BatchMode=yes', '-i', key, 'root@2.25.19.84', 'cat /etc/animationstage3d/private-beta-password'], { encoding: 'utf8' }).trim();
for (const resource of ['/', '/index.html', '/api/preview-shell.php', '/js/vendor/realistic-3d/renderer.js', '/assets/realistic-3d/amaka.glb', '/api/realistic-3d-asset.php?file=renderer']) {
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
    await page.waitForFunction(() => window.app?.exporter && window.Realistic3DLibrary, null, { timeout: 60000 });
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
    const actorId = await page.evaluate(async () => {
        app._scheduleAutosave = () => {};
        const actor = new StageObject('image', { name: 'Hosted speech test', x: app.stage.width * .35, y: app.stage.height * .2, width: 240, height: 334, realistic3D: { id: 'amaka' } });
        app.objects.addObject(actor); app.objects.select([actor.id]);
        const other = new StageObject('image', { name: 'Hosted second rig', x: app.stage.width * .6, y: app.stage.height * .2, width: 240, height: 334, realistic3D: { id: 'tunde' } });
        app.objects.addObject(other); Realistic3DLibrary.addAction(app, other, 'wave', 2);
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
    await dialog.locator('[name=action]').selectOption('wave');
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
    await frame.waitForFunction(() => objects.some(o => o.realistic3DWave > .01), null, { timeout: 30000 });
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
    console.log('PASS live HTTPS studio: both rigs, nonce policy, signed sandbox preview, audio/lip sync, linked captions, save/reopen and MP4 video/audio tracks');
    await context.close();
} finally { await browser.close(); }
