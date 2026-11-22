import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { chromium } from 'playwright';
import { createFile } from 'mp4box';

const baseline = process.argv.includes('--baseline');
const label = baseline ? 'before' : 'after';
const directory = 'examples/teacher-colleague';
fs.mkdirSync(directory + '/evidence', { recursive: true });
const root = path.resolve('dist');
const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    let name = decodeURIComponent(url.pathname);
    if (name === '/api/preview-shell.php') {
        res.writeHead(200, { 'Content-Type': 'text/html', 'Content-Security-Policy': JSON.parse(fs.readFileSync('scripts/fixtures/preview-policy.json')) });
        return res.end(fs.readFileSync('scripts/fixtures/preview-shell.html'));
    }
    if (name === '/api/realistic-3d-asset.php') {
        name = { renderer: '/js/vendor/realistic-3d/renderer.js', amaka: '/assets/realistic-3d/amaka.glb', tunde: '/assets/realistic-3d/tunde.glb' }[url.searchParams.get('file')];
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
    if (!name) return res.writeHead(404).end();
    if (name === '/') name = '/index.html';
    const file = path.resolve(root, '.' + name);
    if (!file.startsWith(root + path.sep) || !fs.statSync(file, { throwIfNoEntry: false })?.isFile()) return res.writeHead(404).end();
    res.setHeader('Content-Type', ({ '.js': 'application/javascript', '.mjs': 'application/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary', '.html': 'text/html' })[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await context.route('https://**/*', r => r.abort());
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => { localStorage.setItem('frd-done', '1'); localStorage.setItem('animstage_onboarded', '1'); });
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.waitForFunction(() => window.app?.exporter && window.Realistic3DLibrary);
    const audio = ['amaka', 'tunde'].map(id => fs.readFileSync(`${directory}/audio/${id}.wav`).toString('base64'));
    const scene = await page.evaluate(async ({ audio, baseline }) => {
        app._scheduleAutosave = () => {};
        app.exporter.deserializeProject({ format: 'animstage', producer: StudioExchange.producer, name: 'Teacher and colleague — lesson plan', objects: [], stage: { width: 1280, height: 720, bgType: 'solid', bgColor: '#e8edf1' } });
        await app.exporter._projectLoadReady;
        const renderer = await import(Realistic3DLibrary.url); await renderer.preload(['amaka', 'tunde']);
        function add(type, props) { const o = new StageObject(type, props); app.objects.addObject(o); return o; }
        add('rectangle', { name: 'Classroom wall', x: 0, y: 0, width: 1280, height: 720, fill: '#e8edf1' });
        add('rectangle', { name: 'Classroom floor', x: 0, y: 475, width: 1280, height: 245, fill: '#c5c4b8' });
        add('rectangle', { name: 'Lesson noticeboard', x: 860, y: 80, width: 300, height: 175, fill: '#2e5e53', borderRadius: 8 });
        add('text', { name: 'Classroom sign', x: 880, y: 110, width: 260, height: 100, text: 'LESSON PLANNING\nPractical activities', fontSize: 28, fill: '#ffffff' });
        // Furniture is deliberately a stage proxy. It does not claim 3D contact solving.
        for (const [name, x] of [['Amaka chair', 400], ['Tunde chair', 710]]) {
            add('rectangle', { name: name + ' back (proxy)', x, y: 330, width: 145, height: 70, fill: '#785542' });
            add('rectangle', { name: name + ' seat (proxy)', x: x - 10, y: 400, width: 165, height: 14, fill: '#533b30' });
            for (const dx of [0, 132]) add('rectangle', { name: name + ' leg (proxy)', x: x + dx, y: 414, width: 13, height: 90, fill: '#533b30' });
        }
        const amaka = add('image', { id: 'teacher-amaka', name: 'Amaka — teacher', x: 340, y: 200, width: 240, height: 334, realistic3D: { id: 'amaka', outfit: 1, yaw: 15, heldProp: baseline ? 'none' : 'documentLeft' } });
        const tunde = add('image', { id: 'colleague-tunde', name: 'Tunde — colleague', x: 780, y: 200, width: 240, height: 334, realistic3D: { id: 'tunde', outfit: 0, yaw: -45 } });
        function tracks(obj, name, delay, duration, values, source) {
            const generated = Object.entries(values).map(([property, value]) => ({ property, duration, easing: 'easeInOut', from: value[0], to: value.at(-1),
                ...(value.length > 2 ? { keyframes: value.map((v, i) => ({ t: i / (value.length - 1), value: v })) } : {}) }));
            const clip = { id: Utils.generateId('anim'), type: 'custom', name, delay, repeat: 1, trigger: 'onLoad', afterPlayback: 'keep', params: { duration: duration / 1000, delay: delay / 1000, afterPlayback: 'keep', ...(source ? { realistic3DAction: source } : {}), configs: generated.map(t => ({ ...t, type: 'property' })) }, generated };
            obj.animations.push(clip); return clip;
        }
        const anchor = renderer.walkAnchor(tunde), destination = { x: anchor.x - 160, y: anchor.y };
        const plan = renderer.planWalk(tunde, destination, 4.5, 'walk');
        const route = tracks(tunde, 'Arrival — walk to colleague (3D)', 0, plan.seconds * 1000, {}, { key: 'walkToPoint', seconds: plan.seconds, points: [{ ...destination, stop: true, wait: 0 }] });
        route.generated = Object.entries(plan.tracks).map(([property, keyframes]) => ({ property, keyframes, from: keyframes[0].value, to: keyframes.at(-1).value, duration: plan.seconds * 1000, easing: 'linear' }));
        route.params.configs = route.generated.map(t => ({ ...t, type: 'property' }));
        function action(obj, key, at, seconds, hold = 0) {
            const clip = Realistic3DLibrary.addAction(app, obj, key, seconds, '1', hold);
            clip.delay = at; clip.params.delay = at / 1000;
            return clip;
        }
        action(amaka, 'wave', 4800, 1.2); action(tunde, 'wave', 6400, 1.2);
        action(amaka, 'sit', 8200, 1.3); action(tunde, 'sit', 8500, 1.3);
        tracks(amaka, 'Notice colleague — independent head and gaze', 1800, 1800, { realistic3DHead: [0, 24], realistic3DGazeX: [0, 10] });
        tracks(tunde, 'Turn to face colleague', 7700, 500, { realistic3DTurn: [plan.yawTo, 20] });
        tracks(amaka, 'Read document — lower gaze', 10000, 800, { realistic3DHeadPitch: [0, 15], realistic3DGazeY: [0, 9], realistic3DHead: [24, 0] });
        tracks(tunde, 'Listener nod — independent of mouth', 12000, 3000, { realistic3DHeadPitch: [0, 5, 0, 5, 0] });
        const lines = [
            [amaka, 'Good morning, Tunde. Shall we review the lesson plan together?', 11000],
            [tunde, 'Good morning, Amaka. Yes. The practical activity on this page should help our students.', 0]
        ];
        let end = 0;
        for (const [i, entry] of lines.entries()) {
            const [actor, text] = entry, dataUrl = 'data:audio/wav;base64,' + audio[i];
            const arrayBuffer = Uint8Array.from(atob(audio[i]), c => c.charCodeAt(0)).buffer;
            const track = await app.audioTimeline._createLoadedTrack({ audioId: 'conversation-' + i, characterId: actor.id, fileName: actor.name + '.wav', mimeType: 'audio/wav', dataUrl, arrayBuffer, timelineStartMs: i ? end + 700 : entry[2] });
            app.audioTimeline.tracks.push(track);
            const clip = app.audioLipSync.buildDialogueAnimation({ root: actor, parts: {} }, track, { text, speaker: actor.name, seated: true, headTurn: true, gestures: true });
            actor.animations.push(clip);
            const caption = add('caption', { name: actor.name + ' — linked caption', x: 80, y: 620, width: 1120, height: 70, fontSize: 28, textBackgroundEnabled: true, textBackgroundColor: '#17242b', textColor: '#ffffff',
                segments: [{ id: 'caption-' + i, startMs: track.timelineStartMs, endMs: track.timelineStartMs + track.durationMs, text }] });
            CaptionRuntime.bind(caption, track); end = track.timelineStartMs + track.durationMs;
        }
        app.audioTimeline._applyActiveTrack(app.audioTimeline.tracks[0]);
        app.animations.totalDuration = end + 1500; app.animations.minDuration = end + 1500;
        app.timeline.update(); app.objects.updateObjectList(); app.animations.seekToStart();
        const project = app.exporter.serializeProject();
        return { project, duration: end + 1500, plan, baseline };
    }, { audio, baseline });
    fs.writeFileSync(`${directory}/evidence/${label}.animstage`, JSON.stringify(scene.project));
    if (!baseline) fs.writeFileSync(`${directory}/reference.animstage`, JSON.stringify(scene.project));
    const still = await page.evaluate(async () => {
        const canvas = document.createElement('canvas'); canvas.width = 1280; canvas.height = 720;
        await app.exporter._renderExportFrame(canvas.getContext('2d'), 1280, 720, 13000);
        return canvas.toDataURL();
    });
    fs.writeFileSync(`${directory}/evidence/${label}.png`, Buffer.from(still.split(',')[1], 'base64'));
    const result = await page.evaluate(async () => {
        const renderer = await import(Realistic3DLibrary.url), actors = app.objects.objects.filter(o => o.realistic3D);
        const snapshots = [];
        for (const ms of [0, 2000, 4500, 6000, 9000, ...Array.from({ length: 55 }, (_, i) => 11000 + i * 250), 13000, 0]) {
            app.animations.currentTime = ms;
            app.animations.applyAnimationsAtTime(ms, { timelinePreview: true });
            snapshots.push({ ms, actors: actors.map(o => ({ id: o.realistic3D.id, x: o.x, y: o.y, seated: o.realistic3DSit, jaw: o._realistic3DSpeech?.jaw || 0,
                prop: renderer.sampleHeldProp?.(o) || null })) });
        }
        const data = app.exporter.serializeProject(); app.exporter.deserializeProject(data); await app.exporter._projectLoadReady;
        return { snapshots, audio: app.audioTimeline.tracks.length, captions: app.objects.objects.filter(o => o.type === 'caption').length,
            props: app.objects.objects.filter(o => o.realistic3D).map(o => o.realistic3D.heldProp || 'none') };
    });
    assert.equal(result.audio, 2); assert.equal(result.captions, 2);
    fs.writeFileSync(`${directory}/evidence/${label}-checks.json`, JSON.stringify(result, null, 2));
    const firstLine = result.snapshots.filter(s => s.ms >= 11000 && s.ms < 16693);
    assert.ok(firstLine.some(s => s.actors[0].jaw > .01));
    assert.ok(firstLine.every(s => s.actors[1].jaw === 0));
    const reply = result.snapshots.filter(s => s.ms >= 17393 && s.ms < 24856);
    assert.ok(reply.some(s => s.actors[1].jaw > .01));
    assert.ok(reply.every(s => s.actors[0].jaw === 0));
    const arrival = result.snapshots.find(s => s.ms === 4500).actors[1];
    const stopped = result.snapshots.find(s => s.ms === 6000).actors[1];
    assert.ok(Math.hypot(arrival.x - stopped.x, arrival.y - stopped.y) < 1e-8, 'Actor moved backwards or slid during the greeting wait');
    if (!baseline) {
        assert.equal(result.props[0], 'documentLeft');
        assert.ok(result.snapshots.every(s => s.actors[0].prop?.drift < 1e-8));
        const grip = await page.evaluate(async () => {
            const renderer = await import(Realistic3DLibrary.url), rows = [];
            for (const id of ['amaka', 'tunde']) for (const hand of ['documentLeft', 'documentRight']) for (const build of [-1, 0, 1]) for (const yaw of [0, 45, 90, 135, 180, -45, -90, -135]) {
                const actor = new StageObject('image', { width: 184, height: 256, realistic3D: { id, heldProp: hand, build, yaw } });
                for (const seated of [0, .5, 1]) {
                    actor.realistic3DSit = seated; actor.realistic3DWave = .4; actor.realistic3DWalk = seated === 0 ? .4 : 0;
                    const before = renderer.sampleHeldProp(actor), arms = renderer.sampleArmJoints(actor);
                    actor.realistic3DWave = 0;
                    const resting = renderer.sampleArmJoints(actor);
                    actor.realistic3DWave = .4;
                    actor._realistic3DSpeech = { handA: 1.5, handB: 1.5 };
                    const during = renderer.sampleHeldProp(actor), spoken = renderer.sampleArmJoints(actor);
                    rows.push({ id, hand, build, yaw, seated, walking: seated === 0, drift: during.drift, active: during.activeInstances,
                        heldUnchanged: JSON.stringify(arms[during.owner]) === JSON.stringify(spoken[during.owner]),
                        freeWave: during.waveHand !== during.owner,
                        freeWaveMoved: Math.hypot(...arms[during.waveHand][2].map((n, i) => n - resting[during.waveHand][2][i])) > .1 });
                    actor._realistic3DSpeech = undefined;
                }
                actor.realistic3D.heldProp = 'none';
                if (renderer.sampleHeldProp(actor) !== null) throw Error('Release did not remove document');
            }
            return rows;
        });
        assert.ok(grip.every(r => r.drift < 1e-8 && r.heldUnchanged && r.freeWave && r.freeWaveMoved && r.active <= 16));
        fs.writeFileSync(`${directory}/evidence/grip-checks.json`, JSON.stringify({ cases: grip.length, maxDrift: Math.max(...grip.map(r => r.drift)), rows: grip }, null, 2));
        const sheet = await page.evaluate(async () => {
            const renderer = await import(Realistic3DLibrary.url);
            const sheet = document.createElement('canvas'); sheet.width = 1280; sheet.height = 1664;
            const ctx = sheet.getContext('2d'); ctx.fillStyle = '#e8edf1'; ctx.fillRect(0, 0, 1280, 1664);
            let row = 0;
            for (const id of ['amaka', 'tunde']) for (const heldProp of ['documentLeft', 'documentRight']) {
                for (const [col, yaw] of [0, 55, 90, 180].entries()) {
                    const actor = new StageObject('image', { width: 552, height: 768, realistic3D: { id, heldProp, yaw } });
                    const view = document.createElement('canvas'); view.width = 552; view.height = 768;
                    renderer.draw(view.getContext('2d'), actor);
                    ctx.drawImage(view, 76, 0, 400, 520, col * 320 + 10, row * 416 + 22, 300, 390);
                    ctx.fillStyle = '#17242b'; ctx.font = '16px sans-serif'; ctx.fillText(`${id} ${heldProp} ${yaw}°`, col * 320 + 8, row * 416 + 18);
                }
                row++;
            }
            return sheet.toDataURL();
        });
        fs.writeFileSync(`${directory}/evidence/hand-views.png`, Buffer.from(sheet.split(',')[1], 'base64'));
    }
    await page.evaluate(() => app.animations.seekToStart());
    const session = await context.newCDPSession(page);
    const heap = async () => {
        await session.send('HeapProfiler.collectGarbage');
        return (await session.send('Runtime.getHeapUsage')).usedSize;
    };
    const heapBefore = await heap(), iterations = baseline ? 1 : 6;
    for (let i = 0; i < iterations; i++) {
        const popupEvent = page.waitForEvent('popup'); await page.locator('#btn-preview').click();
        const popup = await popupEvent, frame = await (await popup.locator('iframe').elementHandle()).contentFrame();
        await frame.waitForFunction(() => document.querySelector('#preview-audio-start button') || window.__realistic3DRenderer);
        const unlock = frame.getByRole('button', { name: 'Play with sound' }); if (await unlock.isVisible()) await unlock.click();
        await frame.waitForFunction(() => window.__realistic3DRenderer, null, { timeout: 45000 });
        await popup.close();
    }
    const heapAfter = await heap();
    assert.ok(heapAfter - heapBefore < 12 * 1024 * 1024, 'Repeated previews retained too much parent-page JS heap');
    fs.writeFileSync(`${directory}/evidence/${label}-memory.json`, JSON.stringify({ iterations, heapBefore, heapAfter, delta: heapAfter - heapBefore, limit: 12 * 1024 * 1024 }, null, 2));
    const event = page.waitForEvent('download', { timeout: 180000 });
    await page.evaluate(duration => app.exporter.exportMediaRecorder('mp4', 640, 360, 12, Math.ceil(duration / 1000 * 12), duration), scene.duration);
    const download = await event; await download.saveAs(`${directory}/evidence/${label}.mp4`);
    const bytes = fs.readFileSync(`${directory}/evidence/${label}.mp4`), data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength); data.fileStart = 0;
    const mp4 = createFile(); mp4.appendBuffer(data); mp4.flush();
    const output = mp4.getInfo().tracks.map(t => ({ type: t.type, samples: t.nb_samples }));
    assert.ok(output.some(t => t.type === 'video' && t.samples >= Math.floor(scene.duration / 1000 * 12)));
    assert.ok(output.some(t => t.type === 'audio' && t.samples > 0));
    fs.writeFileSync(`${directory}/evidence/${label}-output.json`, JSON.stringify({ durationMs: scene.duration, fps: 12, tracks: output, bytes: bytes.length }, null, 2));
    assert.deepEqual(errors, []);
    console.log(`PASS ${label}: reference scene, two offline voices, speaker isolation, backwards seeks, save/reopen, popup and MP4 (${bytes.length} bytes)`);
} finally { await browser.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
