import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { chromium } from 'playwright';
import { createFile } from 'mp4box';
import { smoothSupportHeight } from '../../js/realistic-3d-walk.mjs';
import { groundPath } from '../../js/realistic-3d-path.mjs';
import { checkStudioExchange } from './studio-exchange.mjs';

const originPoint = {x:0,z:0};
for (const points of [[], [originPoint], Array(12).fill(originPoint)]) assert.throws(()=>groundPath(points,1),/waypoints/);
assert.throws(()=>groundPath([originPoint,null],1),/coordinates/);
assert.throws(()=>groundPath([originPoint,{x:1,z:2},{x:1,z:2}],1),/distinct/);
assert.throws(()=>groundPath([originPoint,{x:3,z:0},originPoint],1),/Stop and wait/);

const requiredSupport = Float64Array.of(0.023, 0.08, 0.13, 0.062);
const easedSupport = smoothSupportHeight(requiredSupport);
assert.equal(easedSupport[0], requiredSupport[0]);
assert.equal(easedSupport.at(-1), requiredSupport.at(-1));
assert.ok(easedSupport.every((value, i) => value >= requiredSupport[i]));

const root = path.resolve(process.argv.includes('--dist') ? 'dist' : '.');
const nonce = 'local-renderer-smoke';
const stageCsp = JSON.parse(fs.readFileSync('scripts/fixtures/stage-policy.json','utf8')).map(rule => rule.replace('{$nonce}', nonce)).join('; ');
assert.match(stageCsp, /connect-src 'self'[^;]*;/);
assert.doesNotMatch(stageCsp, /connect-src[^;]*blob:/);
const shell = fs.readFileSync('scripts/fixtures/preview-shell.html','utf8');
const shellCsp = JSON.parse(fs.readFileSync('scripts/fixtures/preview-policy.json','utf8'));
const server = http.createServer((req, res) => {
    const uri = new URL(req.url, 'http://localhost');
    if (uri.pathname === '/api/preview-shell.php') {
        return res.writeHead(200, { 'content-type': 'text/html', 'content-security-policy': shellCsp }).end(shell);
    }
    if (uri.pathname === '/playback-test') return res.writeHead(200, {
        'content-type': 'text/html',
        'content-security-policy': "default-src 'self' data: blob:; script-src 'self' 'unsafe-inline' data: blob:; style-src 'self' 'unsafe-inline'; frame-src 'self' data: blob:; connect-src 'self' data: blob:"
    }).end('<iframe style="position:fixed;inset:0;width:100%;height:100%;border:0" sandbox="allow-scripts allow-forms allow-downloads allow-popups"></iframe>');
    const previewAssets = { renderer: '/js/vendor/realistic-3d/renderer.js', amaka: '/assets/realistic-3d/amaka.glb', tunde: '/assets/realistic-3d/tunde.glb' };
    const relative = uri.pathname === '/api/realistic-3d-asset.php' ? previewAssets[uri.searchParams.get('file')] : decodeURIComponent(uri.pathname);
    if (!relative) return res.writeHead(404).end();
    if (uri.pathname === '/api/realistic-3d-asset.php') res.setHeader('Access-Control-Allow-Origin', '*');
    const file = path.resolve(root, `.${relative}`);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return res.writeHead(404).end();
    res.setHeader('Content-Type', ({ '.js': 'application/javascript', '.html': 'text/html', '.css': 'text/css', '.glb': 'model/gltf-binary' })[path.extname(file)] || 'application/octet-stream');
    if (uri.pathname === '/index.html' && uri.searchParams.has('stage-csp')) {
        res.setHeader('Content-Security-Policy', stageCsp);
        return res.end(fs.readFileSync(file, 'utf8').replace(/<script\b/gi, `<script nonce="${nonce}"`));
    }
    fs.createReadStream(file).pipe(res);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
    browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => { localStorage.setItem('frd-done', '1'); localStorage.setItem('animstage_onboarded', '1'); });
    await page.route('https://**/*', route => route.abort());
    await page.route('**/api/**', route => route.abort());
    const origin = `http://127.0.0.1:${server.address().port}`;
    await page.goto(`${origin}/index.html`);
    await page.waitForFunction(() => window.app?.exporter && window.Realistic3DLibrary);
    await page.evaluate(() => { app._scheduleAutosave = () => {}; });
    await checkStudioExchange(page);
    await checkArrivalRoutes(page);
    const open = () => page.evaluate(() => document.getElementById('btn-realistic-3d').click());
    const dialog = page.locator('#realistic-3d-library');
    const apply = dialog.locator('button[type=submit]:not([data-create-action])');
    await open();
    await dialog.locator('[data-create-action]:enabled').waitFor({ timeout: 45000 });
    await dialog.screenshot({ path: 'tmp/realistic-3d-library-desktop.png' });
    const recovery = await page.evaluate(async () => {
        const render = await import(Realistic3DLibrary.url);
        const canvas = document.createElement('canvas');
        canvas.width = 184; canvas.height = 256;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const obj = { x: 0, y: 0, width: 184, height: 256, realistic3D: { id: 'amaka' } };
        let buffer;
        const copy = ctx.drawImage.bind(ctx);
        ctx.drawImage = (source, ...args) => { buffer = source; copy(source, ...args); };
        ctx.save();
        ctx.scale(4, 4);
        render.draw(ctx, obj);
        ctx.restore();
        render.draw(ctx, obj);
        const recent = buffer.height;
        await new Promise(resolve => setTimeout(resolve, 1600));
        render.draw(ctx, obj);
        const reduced = buffer.height;
        const gl = buffer.getContext('webgl2');
        const extension = gl.getExtension('WEBGL_lose_context');
        if (!extension) throw new Error('Test browser cannot simulate context loss');
        const lost = new Promise(resolve => buffer.addEventListener('webglcontextlost', resolve, { once: true }));
        extension.loseContext();
        await lost;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let count = 0;
        let finish;
        const redrawn = new Promise(resolve => { finish = resolve; });
        const repaint = () => { count++; finish(render.draw(ctx, obj)); };
        const skipped = !render.draw(ctx, obj, repaint) && !render.draw(ctx, obj, repaint);
        // Chromium won't accept restoreContext during loss-event dispatch.
        setTimeout(() => extension.restoreContext(), 50);
        const ok = await Promise.race([redrawn, new Promise(resolve => setTimeout(() => resolve(false), 8000))]);
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        return { recent, reduced, skipped, count, ok, visible: pixels.some((v, i) => i % 4 === 3 && v > 128) };
    });
    assert.deepEqual(recovery, { recent: 1024, reduced: 256, skipped: true, count: 1, ok: true, visible: true });
    const pixelResult = await page.evaluate(async () => {
        const render = await import(Realistic3DLibrary.url);
        await render.preload(['amaka', 'tunde']);
        const canvas = document.createElement('canvas');
        canvas.width = 252; canvas.height = 350;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const gallery = document.createElement('canvas');
        gallery.width = 252 * 6; gallery.height = 350 * 2;
        const galleryCtx = gallery.getContext('2d');
        galleryCtx.fillStyle = '#41464e';
        galleryCtx.fillRect(0, 0, gallery.width, gallery.height);
        const armGallery = document.createElement('canvas');
        armGallery.width = 252 * 5; armGallery.height = 350 * 4;
        const armGalleryCtx = armGallery.getContext('2d');
        armGalleryCtx.fillStyle = '#41464e';
        armGalleryCtx.fillRect(0, 0, armGallery.width, armGallery.height);
        const gaitGallery = document.createElement('canvas');
        gaitGallery.width = 252 * 7; gaitGallery.height = 350 * 4;
        const gaitGalleryCtx = gaitGallery.getContext('2d');
        gaitGalleryCtx.fillStyle = '#41464e';
        gaitGalleryCtx.fillRect(0, 0, gaitGallery.width, gaitGallery.height);
        const variantGallery = document.createElement('canvas');
        variantGallery.width = 252 * 6; variantGallery.height = 350 * 6;
        const variantCtx = variantGallery.getContext('2d');
        variantCtx.fillStyle = '#41464e';
        variantCtx.fillRect(0, 0, variantGallery.width, variantGallery.height);
        const difference = (p, q) => p.map((v, i) => v - q[i]);
        const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
        function angle(a, b) {
            const cosine = a.reduce((sum, value, i) => sum + value * b[i], 0) / (Math.hypot(...a) * Math.hypot(...b));
            return Math.acos(Math.max(-1, Math.min(1, cosine))) * 180 / Math.PI;
        }
        function armValues(obj, side) {
            const [shoulder, elbow, wrist, hand, , , finger, distal] = render.sampleArmJoints(obj)[side];
            const upper = difference(elbow, shoulder), lower = difference(wrist, elbow);
            return { bend: angle(upper, lower), wristAngle: angle(lower, difference(hand, wrist)),
                curl: angle(difference(finger, hand), difference(distal, finger)),
                fore: wrist[2] - shoulder[2], height: wrist[1] - shoulder[1], joints: [shoulder, elbow, wrist, hand, finger, distal] };
        }
        function frame(obj) {
            ctx.clearRect(0, 0, 252, 350);
            if (!render.draw(ctx, obj)) throw Error('Renderer did not draw a character');
            const pixels = ctx.getImageData(0, 0, 252, 350).data;
            let visible = 0, minX = 252, maxX = 0, minY = 350, maxY = 0, hash = 1;
            for (let i = 0; i < pixels.length; i += 4) {
                if (pixels[i + 3] < 80) continue;
                const n = i / 4, x = n % 252, y = Math.floor(n / 252);
                minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
                visible++;
                hash = Math.imul(hash, 33) ^ (n + pixels[i] + pixels[i + 1] * 3 + pixels[i + 2] * 7);
            }
            let headHash = 1, centerArea = 0;
            for (let y = minY; y < minY + 30; y++) for (let x = 80; x < 172; x++) {
                const i = (y * 252 + x) * 4;
                headHash = Math.imul(headHash, 33) ^ (pixels[i] + pixels[i + 1] * 3 + pixels[i + 2] * 7 + pixels[i + 3] * 11);
            }
            for (let y = 128; y < 205; y++) for (let x = 83; x < 169; x++) {
                if (pixels[(y * 252 + x) * 4 + 3] >= 80) centerArea++;
            }
            return { visible, minX, maxX, minY, maxY, hash, headHash, centerArea };
        }
        const report = await Promise.all(['amaka', 'tunde'].map(async (id, row) => {
            const template = await render.prepare(id);
            for (const name of ['Body0', 'Body1', 'Outfit0', 'Outfit1', 'Shoes']) {
                const mesh = template.getObjectByName(name);
                if (mesh.morphTargetDictionary?.buildSlender == null || mesh.morphTargetDictionary?.buildFuller == null) {
                    throw Error(`${id}/${name} did not load both fitted morphs`);
                }
            }
            if (!template.getObjectByName('upperleg01_L').userData.buildOffsets.some(offset => offset.some(Math.abs))) {
                throw Error(`${id} has no adaptive hip pivots`);
            }
            const obj = { x: 0, y: 0, width: 252, height: 350, realistic3D: { id, outfit: 0 } };
            const views = Array.from({ length: 8 }, (_, i) => { obj.realistic3D.yaw = i * 45; return frame(obj); });
            obj.realistic3D.yaw = 0;
            const outfit = frame({ ...obj, realistic3D: { ...obj.realistic3D, outfit: 1 } });
            const wave = frame({ ...obj, realistic3DWave: 0.42 });
            const walk = frame({ ...obj, realistic3DWalk: 0.25 });
            const sit = frame({ ...obj, realistic3DSit: 1 });
            const jaw = frame({ ...obj, realistic3DMouth: 0.8 });
            const actions = [{}, { realistic3DWalk: 1 / 3 }, { realistic3DWalk: 0.5 }, { realistic3DWave: 0.42 }, { realistic3DSit: 1 }];
            [0, 90].forEach((yaw, view) => actions.forEach((channels, column) => {
                frame({ ...obj, ...channels, realistic3D: { id, yaw, outfit: view } });
                armGalleryCtx.drawImage(canvas, 252 * column, 350 * (row * 2 + view));
            }));
            [0, 0.18, 0.30, 0.47, 0.60, 0.80, 0.99].forEach((step, column) => {
                frame({ ...obj, realistic3DWalk: (2 + step) / 6, realistic3D: { id, yaw: 90, outfit: row } });
                gaitGalleryCtx.drawImage(canvas, 252 * column, 350 * (row * 2 + 1));
            });
            [0, 0.09, 0.18, 0.31, 0.48, 0.70, 0.99].forEach((step, column) => {
                frame({ ...obj, realistic3DWalk: step / 6, realistic3D: { id, yaw: 90, outfit: row } });
                gaitGalleryCtx.drawImage(canvas, 252 * column, 350 * row * 2);
            });
            ['realistic3DStroll', 'realistic3DStrut', 'realistic3DNaturalWalk'].forEach((channel, style) => {
                [0, 0.48, 1, 1.5, 2, 2.55].forEach((step, column) => {
                    frame({ ...obj, [channel]: step / 6, realistic3D: { id, yaw: row ? -90 : 90, outfit: row } });
                    variantCtx.drawImage(canvas, 252 * column, 350 * (row * 3 + style));
                });
            });
            const arms = [-1, 0, 1].map(build => {
                const actor = { ...obj, realistic3D: { id, build } };
                function largestPalmStep(channel, side) {
                    const moving = { ...actor };
                    let previous, largest = 0;
                    for (let frame = 0; frame <= 72; frame++) {
                        moving[channel] = frame / 72;
                        const [, , wrist, hand, index, pinky] = render.sampleArmJoints(moving)[side];
                        const palm = cross(difference(index, pinky), difference(hand, wrist));
                        if (previous) largest = Math.max(largest, angle(previous, palm));
                        previous = palm;
                    }
                    return largest;
                }
                return Object.fromEntries(['L', 'R'].map(side => [side, {
                    idle: armValues(actor, side),
                    outWalk: armValues({ ...actor, ...actions[1 + Number(side === 'R')] }, side),
                    backWalk: armValues({ ...actor, ...actions[1 + Number(side === 'L')] }, side),
                    wave: armValues({ ...actor, ...actions[3] }, side),
                    sit: armValues({ ...actor, ...actions[4] }, side),
                    reset: armValues({ ...actor, realistic3DWalk: 1, realistic3DWave: 1 }, side),
                    maxWalkPalmStep: largestPalmStep('realistic3DWalk', side), maxWavePalmStep: largestPalmStep('realistic3DWave', side)
                }]));
            });
            const builds = [0, 1].map(outfitIndex => {
                obj.realistic3D = { id, outfit: outfitIndex, yaw: 0 };
                const front = [-1, 0, 1].map((build, i) => {
                    obj.realistic3D.build = build;
                    const result = frame(obj);
                    galleryCtx.drawImage(canvas, 252 * (outfitIndex * 3 + i), row * 350);
                    return result;
                });
                obj.realistic3D.build = 0;
                const reset = frame(obj);
                const otherInstance = frame({ ...obj, realistic3D: { ...obj.realistic3D } });
                obj.realistic3D.yaw = 90;
                const side = [-1, 0, 1].map(build => frame({ ...obj, realistic3D: { ...obj.realistic3D, build } }));
                const posed = [-1, 1].flatMap(build => [
                    frame({ ...obj, realistic3D: { ...obj.realistic3D, build }, realistic3DSit: 1 }),
                    frame({ ...obj, realistic3D: { ...obj.realistic3D, build, yaw: 45 }, realistic3DWalk: 0.25, realistic3DWave: 0.42 })
                ]);
                return { front, reset, otherInstance, side, posed };
            });
            return { views, outfit, wave, walk, sit, jaw, builds, arms };
        }));
        return { report, gallery: gallery.toDataURL('image/png').split(',')[1], armGallery: armGallery.toDataURL('image/png').split(',')[1],
            gaitGallery: gaitGallery.toDataURL('image/png').split(',')[1], variants: variantGallery.toDataURL('image/png').split(',')[1] };
    });
    fs.writeFileSync('tmp/realistic-3d-build-gallery.png', Buffer.from(pixelResult.gallery, 'base64'));
    fs.writeFileSync('tmp/realistic-3d-arm-poses.png', Buffer.from(pixelResult.armGallery, 'base64'));
    fs.writeFileSync('tmp/realistic-3d-gait-poses.png', Buffer.from(pixelResult.gaitGallery, 'base64'));
    fs.writeFileSync('tmp/realistic-3d-walk-variants.png', Buffer.from(pixelResult.variants, 'base64'));
    for (const { views, outfit, wave, walk, sit, jaw, builds, arms } of pixelResult.report) {
        assert.equal(new Set(views.map(frame => frame.hash)).size, 8);
        for (const frame of [...views, outfit, wave, walk, sit, jaw]) {
            assert.ok(frame.visible > 2500, JSON.stringify(frame));
            assert.ok(frame.minX > 0 && frame.maxX < 251 && frame.minY > 0 && frame.maxY < 349, JSON.stringify(frame));
        }
        for (const frame of [outfit, wave, walk, sit, jaw]) assert.notEqual(frame.hash, views[0].hash);
        for (const build of arms) for (const [side, { idle, outWalk, backWalk, wave, sit, reset, maxWalkPalmStep, maxWavePalmStep }] of Object.entries(build)) {
            assert.ok(idle.bend >= 3 && idle.bend <= 7 && idle.wristAngle < 2, JSON.stringify({ side, idle }));
            assert.ok(outWalk.bend > 15 && outWalk.bend < 25 && backWalk.bend < 12 &&
                outWalk.fore - backWalk.fore > 1.1, JSON.stringify({ outWalk, backWalk }));
            assert.ok(outWalk.curl > 17 && outWalk.curl < 38, JSON.stringify({ side, outWalk }));
            assert.ok(side === 'R' ? wave.bend > 80 && wave.height > 0.5 : wave.bend < 7 && wave.height < -2, JSON.stringify({ side, wave }));
            assert.ok(sit.bend > 25 && sit.bend < 35 && sit.fore > 1, JSON.stringify(sit));
            assert.ok(reset.joints.every((point, i) => point.every((value, j) => Math.abs(value - idle.joints[i][j]) < 1e-5)), 'Action did not return to relaxed arms');
            assert.ok(maxWalkPalmStep < 18 && maxWavePalmStep < 25, JSON.stringify({ side, maxWalkPalmStep, maxWavePalmStep }));
        }
        for (const { front, reset, otherInstance, side, posed } of builds) {
            assert.ok(front[0].visible < front[1].visible && front[1].visible < front[2].visible, JSON.stringify(front));
            assert.ok(side[0].centerArea < side[1].centerArea && side[1].centerArea < side[2].centerArea, JSON.stringify(side));
            assert.equal(new Set(front.map(frame => frame.headHash)).size, 1, 'Build should preserve the face and hair');
            assert.ok(Math.max(...front.map(frame => frame.maxY)) - Math.min(...front.map(frame => frame.maxY)) <= 1, 'Build moved the feet');
            assert.equal(reset.hash, front[1].hash, 'Morph reset drifted');
            assert.equal(otherInstance.hash, front[1].hash, 'One actor changed the other actor sharing its asset');
            assert.equal(new Set(posed.map(frame => frame.hash)).size, 4);
            for (const frame of posed) assert.ok(frame.visible > 2500 && frame.minY > 0 && frame.maxY < 349, JSON.stringify(frame));
        }
    }
    const setBuild = value => dialog.locator('[name=build]').fill(String(value));
    await setBuild(-0.6);
    await dialog.locator('[name=action]').selectOption('wave');
    await dialog.locator('[data-create-action]').click();
    await page.evaluate(async () => {
        const canvas = document.getElementById('stage-canvas');
        const ctx = canvas.getContext('2d');
        const nextFrame = () => new Promise(resolve => requestAnimationFrame(resolve));
        const checksum = () => ctx.getImageData(0, 0, canvas.width, canvas.height).data
            .reduce((hash, byte, i) => i % 7 ? hash : Math.imul(33, hash) ^ byte, 1);
        app.stage.gridVisible = false;
        await nextFrame(); await nextFrame();
        const before = checksum();
        document.getElementById('tl-play').click();
        const limit = performance.now() + 3000;
        while (app.animations.currentTime < 650 && performance.now() < limit) await nextFrame();
        await nextFrame();
        const actor = app.objects.objects.find(obj => obj.realistic3D);
        if (!app.animations.isPlaying || actor.realistic3DWave < 0.25 || before === checksum()) {
            throw Error('The real Stage Play control did not draw the 3D wave');
        }
        document.getElementById('tl-stop').click();
        app.animations.seekToStart();
    });
    await open();
    await dialog.locator('button[type=submit]:enabled').waitFor();
    assert.equal(await dialog.locator('[name=build]').inputValue(), '-0.6');
    assert.equal(await dialog.locator('[name=action]').inputValue(),'wave');
    await dialog.locator('[data-recorded]').selectOption('');
    await dialog.locator('[name=action]').selectOption('turnRight');
    await dialog.locator('[name=seconds]').fill('1.1');
    await dialog.locator('[name=hold]').fill('0.9');
    await dialog.getByText('New: Turn right (2 s)',{exact:true}).waitFor();
    assert.equal(await dialog.locator('[data-keep-open]').isChecked(), false);
    await dialog.locator('[data-action]').click();
    await dialog.waitFor({state:'detached'});
    for(let i=0;i<2;i++){
        await page.locator('[data-saved-action] [data-replay]').click();
        await page.waitForFunction(()=>app.animations.isPlaying && app.objects.getSelectedObjects()[0].realistic3DTurn>10);
        await page.waitForFunction(()=>{
            const obj=app.objects.getSelectedObjects()[0],clip=obj.animations.at(-1);
            return !app.animations.isPlaying && app.animations.currentTime===clip.delay && Math.abs(obj.realistic3DTurn)<.01;
        });
    }
    await page.evaluate(()=>{
        const actor=app.objects.objects.find(o=>o.realistic3D),clip=actor.animations.at(-1);
        if(clip.generated[0].duration!==2000) throw Error('Turn duration did not include its hold');
        app.animations.applyAnimationsAtTime(clip.delay+1500,{timelinePreview:true});
        if(Math.abs(actor.realistic3DTurn-90)>.01) throw Error('Turn did not hold its final heading');
        app.animations.seekToStart();
        if(Math.abs(actor.realistic3DTurn)>.01) throw Error('Timeline reset retained the held turn');
    });
    await page.evaluate(() => app.objects.select([]));
    await open();
    await dialog.locator('[name=id]').selectOption('tunde');
    await dialog.locator('[name=outfit]').selectOption('1');
    await setBuild(0.65);
    await dialog.locator('[name=walkSpacing]').selectOption('narrow');
    await apply.click();
    const walkCheck = await page.evaluate(async () => {
        const renderer = await import(Realistic3DLibrary.url);
        const [amaka, tunde] = app.objects.objects.filter(obj => obj.realistic3D);
        amaka.x -= amaka.width * 0.6;
        tunde.x += tunde.width * 0.6;
        const interpolate = (frames, p) => {
            const j = frames.findIndex(frame => frame.t > p);
            if (j < 1) return frames.at(-1).value;
            const [a, b] = frames.slice(j - 1, j + 1);
            return a.value + (b.value - a.value) * (p - a.t) / (b.t - a.t);
        };
        let maxDrift = 0, lowestLift = Infinity, deepestPenetration = 0, farthestFloat = 0, maxSwingLift = 0, ankleTargetError = 0;
        let maxKneeChange = 0, maxHipDrop = 0, maxCruiseBob = 0, maxHeadBob = 0, mostToeOff = 0, mostHeelStrike = 0, kneeChangeAt;
        function range(values) { return Math.max(...values) - Math.min(...values); }
        function measureCruise(feet) {
            maxCruiseBob = Math.max(maxCruiseBob, range(feet.map(foot => foot.rootY)));
            maxHeadBob = Math.max(maxHeadBob, range(feet.map(foot => foot.headY)));
        }
        let launchDrop = 0, launchBend = 0, firstLift = Infinity, weightTransfer = Infinity;
        let firstArmOpposition = Infinity;
        let midstanceBend = 0, lateSwingBend = 0, lateLiftIncrease = 0, lateLiftAt;
        const bend = ({ joints: [hip, knee, ankle] }) => {
            const a = knee.map((x, i) => x - hip[i]), b = ankle.map((x, i) => x - knee[i]);
            const dot = a.reduce((sum, x, i) => sum + x * b[i], 0) / (Math.hypot(...a) * Math.hypot(...b));
            return Math.acos(Math.max(-1, Math.min(1, dot))) * 180 / Math.PI;
        };
        const checkLaunch = (idle, launch, lift, yaw) => {
            const delta = launch[1].joints[0].map((value, i) => value - idle[1].joints[0][i]);
            launchDrop = Math.max(launchDrop, -delta[1]);
            launchBend = Math.max(launchBend, bend(launch[1]) - bend(idle[1]));
            firstLift = Math.min(firstLift, lift[0].surface - idle[0].surface);
            weightTransfer = Math.min(weightTransfer, -delta[0] * Math.cos(yaw) + delta[2] * Math.sin(yaw));
        };
        function checkFirstArms(idle, moving, yaw) {
            const forward = ([shoulder, elbow]) => (elbow[0] - shoulder[0]) * Math.sin(yaw) + (elbow[2] - shoulder[2]) * Math.cos(yaw);
            firstArmOpposition = Math.min(firstArmOpposition, forward(moving.R) - forward(idle.R), forward(idle.L) - forward(moving.L));
        }
        function checkVariant(original, channel, yaw) {
            const obj = { ...original, realistic3D: { ...original.realistic3D, yaw, outfit:yaw<0?0:1 } };
            const idle = renderer.sampleWalkPose(obj);
            const initialArms = renderer.sampleArmJoints(obj);
            let lastAngles = idle.map(bend), lastDelta, lastArms = initialArms, lastArmDelta;
            let kneeSpeed = 0, kneeSnap = 0, kneeSnapAt, armStep = 0, armSnap = 0, armSnapAt;
            const travel = [];
            const theta = yaw * Math.PI / 180;
            const forward = point => point[0] * Math.sin(theta) + point[2] * Math.cos(theta);
            const lateral = ({ joints: [, , foot] }) => foot[0] * Math.cos(theta) - foot[2] * Math.sin(theta);
            const idleWidth = Math.abs(lateral(idle[0]) - lateral(idle[1]));
            let widthRatio = 0, bendDifference = 0, clearanceDifference = 0, forwardDifference = 0;
            const swingSamples = [];
            const torsoSamples = [], headSamples = [];
            const seatSamples = [];
            const hipDelta = idle[0].joints[0][1] - idle[1].joints[0][1];
            let peakFold = 0, heelBehindKnee = 0, terminalBend = 0, landingReach = Infinity, oppositeArmLead = Infinity;
            let loadedBend = 0, simultaneousFlex = 0;
            for (let frame = 1; frame <= 240; frame++) {
                obj[channel] = frame / 240;
                const inspectSeat = frame >= 80 && frame <= 160 && frame % 2 === 0;
                const feet = renderer.sampleWalkPose(obj,inspectSeat);
                const hipY = feet.map(f => f.joints[0][1]);
                if (Math.abs(hipY[0] - hipY[1] - hipDelta) > 1e-6) throw Error(`Split pelvis: ${channel}/${yaw}/${frame}`);
                if (inspectSeat) {
                    const [a,b]=feet.map(f=>f.seat);
                    if (!a || !b) throw Error('No rear clothing landmarks for '+obj.realistic3D.id);
                    const mid=a.map((v,i)=>(v+b[i])/2);
                    seatSamples.push([mid[0]*Math.cos(theta)-mid[2]*Math.sin(theta),mid[1],forward(mid),forward(a)-forward(b),a[1]-b[1],hipY[0]]);
                }
                const arms = renderer.sampleArmJoints(obj);
                // Compare left and right at the same phase of adjacent cruise
                // steps, in actor coordinates regardless of camera view.
                if (frame >= 81 && frame <= 160) {
                    const side = frame <= 120 ? 0 : 1;
                    const foot = feet[side];
                    torsoSamples.push(foot.rootY);
                    headSamples.push(foot.headY);
                    const [hip, knee, ankle] = foot.joints;
                    peakFold = Math.max(peakFold, bend(foot));
                    heelBehindKnee = Math.max(heelBehindKnee, forward(knee) - forward(ankle));
                    const phase = frame % 40 / 40;
                    if (phase >= 0.175 && phase <= 0.55) {
                        const stance = bend(feet[1 - side]);
                        loadedBend = Math.max(loadedBend, stance);
                        simultaneousFlex = Math.max(simultaneousFlex, Math.min(stance - lastAngles[1 - side], bend(foot) - lastAngles[side]));
                    }
                    if (frame % 40 === 0) {
                        terminalBend = Math.max(terminalBend, bend(foot));
                        landingReach = Math.min(landingReach, forward(ankle) - forward(hip));
                        const [near, far] = side ? [arms.L, arms.R] : [arms.R, arms.L];
                        oppositeArmLead = Math.min(oppositeArmLead, forward(near[2]) - forward(far[2]));
                    }
                    widthRatio = Math.max(widthRatio, Math.abs(lateral(feet[0]) - lateral(feet[1])) / idleWidth);
                    const sample = [bend(foot), foot.surface - idle[side].surface, forward(ankle) - forward(idle[side].joints[2])];
                    if (!side) swingSamples.push(sample);
                    else {
                        const left = swingSamples[frame - 121];
                        bendDifference = Math.max(bendDifference, Math.abs(left[0] - sample[0]));
                        clearanceDifference = Math.max(clearanceDifference, Math.abs(left[1] - sample[1]));
                        forwardDifference = Math.max(forwardDifference, Math.abs(left[2] - sample[2]));
                    }
                }
                const angles = feet.map(bend), delta = angles.map((value, i) => value - lastAngles[i]);
                if (frame > 80 && frame <= 160) {
                    const swingSide = frame <= 120 ? 0 : 1;
                    const firstHalf = (frame - 1) % 40 < 20;
                    if (firstHalf ? delta[swingSide] < -0.1 : delta[swingSide] > 0.1)
                        throw Error(`Knee reversed during swing: ${obj.realistic3D.id}/${channel}/${frame}`);
                }
                kneeSpeed = Math.max(kneeSpeed, ...delta.map(Math.abs));
                if (lastDelta) delta.forEach((value, side) => {
                    const jerk = Math.abs(value - lastDelta[side]);
                    if (jerk > kneeSnap) {
                        kneeSnap = jerk;
                        kneeSnapAt = { beat: frame / 40, side, incoming: lastDelta[side], outgoing: value };
                    }
                });
                const armDelta = ['L', 'R'].map((side, i) => {
                    const a = arms[side][3], b = lastArms[side][3];
                    const v = a.map((value, axis) => value - arms[side][0][axis] - b[axis] + lastArms[side][0][axis]);
                    armStep = Math.max(armStep, Math.hypot(...v));
                    if (lastArmDelta) {
                        const change = Math.hypot(...v.map((x, axis) => x - lastArmDelta[i][axis]));
                        if (change > armSnap) {
                            armSnap = change;
                            armSnapAt = { beat: frame / 40, side };
                        }
                    }
                    return v;
                });
                const [shoulder, , wrist] = arms.R;
                travel.push(forward(wrist) - forward(shoulder));
                if (feet.every((foot, i) => foot.surface > idle[i].surface + 0.065) || feet.some(foot => foot.error > 0.018)) {
                    throw Error(`Lost foot contact: ${obj.realistic3D.id}/${channel}/${frame}`);
                }
                if (frame === 240 && JSON.stringify(feet) !== JSON.stringify(idle)) throw Error('Variant did not finish at idle');
                lastAngles = angles;
                lastDelta = delta;
                lastArms = arms;
                lastArmDelta = armDelta;
            }
            if (range(torsoSamples) > 0.095 || range(headSamples) > 0.11) throw Error(`Mid-walk bounce: ${channel}/${yaw} torso=${range(torsoSamples)} head=${range(headSamples)}`);
            if (obj.realistic3D.id==='amaka' && range(torsoSamples)>0.025) throw Error(`Amaka torso bounce: ${channel}/${yaw} ${range(torsoSamples)}`);
            // Each support foot must have some rise at midstance, even when
            // the other leg and the other rig pass the upper-bound tests.
            for (const i of [0,40]) {
                if (torsoSamples[i+19]-torsoSamples[i+39]<.009 || range(headSamples.slice(i,i+40))<.012)
                    throw Error(`Flat cruise step on ${obj.realistic3D.id}/${channel}/${yaw}`);
            }
            const limits=[.31,.14,.22,.15,.30,.15];
            limits.forEach((limit,i)=>{
                const movement=range(seatSamples.map(s=>s[i]));
                if (movement>limit) throw Error(`Seat movement ${i} on ${obj.realistic3D.id}/${channel}/${yaw}: ${movement} > ${limit}`);
            });
            return { id: original.realistic3D.id, channel, yaw, loadedBend, simultaneousFlex, widthRatio, bendDifference, clearanceDifference, forwardDifference, peakFold, heelBehindKnee, terminalBend, landingReach, oppositeArmLead, kneeSpeed, kneeSnap, kneeSnapAt, armStep, armSnap, armSnapAt, travel: range(travel) };
        }
        const resize = { scaleX: 0.73, scaleY: 1.25, pivotX: 0.21, pivotY: 0.82 };
        for (const original of [amaka, tunde]) for (const [dx, dy, transform] of [[-140, 0], [90, -28], [0, 28],
            [490, 0], [90 * resize.scaleX, -28 * resize.scaleY, resize]]) {
            const obj = { ...original, ...transform };
            const neutral = renderer.sampleWalkPose(obj);
            const { anchor } = renderer.planWalk(obj, { x: obj.x, y: obj.y });
            const plan = renderer.planWalk(obj, { x: anchor.x + dx, y: anchor.y + dy });
            const feetAt = (phase) => {
                const time = (plan.turnTime + phase * (plan.seconds - plan.turnTime)) / plan.seconds;
                for (const [key, frames] of Object.entries(plan.tracks)) obj[key] = interpolate(frames, time);
                return renderer.sampleWalkPose(obj);
            };
            const alignedIdle = feetAt(0);
            const idleArms = renderer.sampleArmJoints(obj);
            const yaw = (plan.yawTo + (obj.realistic3D.yaw || 0)) * Math.PI / 180;
            checkLaunch(alignedIdle, feetAt(0.17 / plan.steps), feetAt(0.43 / plan.steps), yaw);
            feetAt(0.48 / plan.steps);
            checkFirstArms(idleArms, renderer.sampleArmJoints(obj), yaw);
            for (let k = 0; k < plan.steps; k++) {
                const [a, b, d] = [0.25, 0.45, 0.83].map(n => feetAt((k + n) / plan.steps));
                const moving = k % 2, planted = 1 - moving;
                // Test drift during flat support; an ankle deliberately moves
                // once the planted shoe rolls up onto the toe.
                maxDrift = Math.max(maxDrift, Math.hypot(a[planted].ankle[0] - b[planted].ankle[0], a[planted].ankle[1] - b[planted].ankle[1]));
                lowestLift = Math.min(lowestLift, b[moving].surface - b[planted].surface);
                const lateLift = d[moving].surface - b[moving].surface;
                if (lateLift > lateLiftIncrease) {
                    lateLiftIncrease = lateLift;
                    lateLiftAt = [original.realistic3D.id, dx, dy, k, plan.steps];
                }
                if (k > 0 && k < plan.steps - 1) {
                    midstanceBend = Math.max(midstanceBend, bend(b[planted]));
                    lateSwingBend = Math.max(lateSwingBend, bend(feetAt((k + 0.97) / plan.steps)[moving]));
                }
            }
            let previous = neutral;
            const cruiseHeights = [];
            for (let frame = 0; frame <= plan.steps * 32; frame++) {
                const feet = feetAt(frame / (plan.steps * 32));
                feet.forEach((foot, i) => {
                    ankleTargetError = Math.max(ankleTargetError, foot.error);
                    deepestPenetration = Math.max(deepestPenetration, neutral[i].surface - foot.surface);
                    maxSwingLift = Math.max(maxSwingLift, foot.surface - neutral[i].surface);
                    const change = Math.abs(bend(foot) - bend(previous[i]));
                    if (change > maxKneeChange) {
                        maxKneeChange = change;
                        kneeChangeAt = [original.realistic3D.id, dx, dy, i, frame / 32, bend(previous[i]), bend(foot)];
                    }
                    maxHipDrop = Math.max(maxHipDrop, neutral[i].rootY - foot.rootY);
                    mostToeOff = Math.max(mostToeOff, foot.pitch * 180 / Math.PI);
                    mostHeelStrike = Math.min(mostHeelStrike, foot.pitch * 180 / Math.PI);
                });
                farthestFloat = Math.max(farthestFloat, Math.min(...feet.map((foot, i) => foot.surface - neutral[i].surface)));
                if (frame >= 32 && frame <= (plan.steps - 1) * 32) cruiseHeights.push(feet[0]);
                previous = feet;
            }
            measureCruise(cruiseHeights);
            feetAt(1);
            if (Math.abs(obj.x - plan.to.x) + Math.abs(obj.y - plan.to.y) > 1e-6) throw Error('The route did not end at its destination');
            const idle = renderer.sampleWalkPose({ ...obj, realistic3DRouteProgress: 0 });
            if (JSON.stringify(idle) !== JSON.stringify(renderer.sampleWalkPose(obj))) throw Error('The walk did not end at idle');
        }
        for (const original of [amaka, tunde]) {
            const front = { ...original, realistic3D: { ...original.realistic3D, yaw: 0, walkSpacing: 'standard' } };
            const separation = () => {
                const [left, right] = renderer.sampleWalkPose(front);
                return left.ankle[0] - right.ankle[0];
            };
            const standing = separation();
            for (const phase of [2, 2.5, 3, 3.5, 4]) {
                front.realistic3DWalk = phase / 6;
                const ratio = separation() / standing;
                if (!(ratio > 0.4 && ratio < 0.75)) throw Error(`Unexpected front-view footprint spacing: ${ratio}`);
                front.realistic3D.walkSpacing = 'narrow';
                const narrow = separation() / standing;
                if (!(narrow > 0.4 && narrow < ratio - 0.015)) throw Error(`Narrow spacing: ${narrow} vs ${ratio}`);
                front.realistic3D.walkSpacing = 'standard';
            }
            const obj = { ...original, realistic3D: { ...original.realistic3D, yaw: -90 } };
            const idle = renderer.sampleWalkPose(obj);
            const idleArms = renderer.sampleArmJoints(obj);
            obj.realistic3DWalk = 0.17 / 6;
            const launch = renderer.sampleWalkPose(obj);
            obj.realistic3DWalk = 0.43 / 6;
            checkLaunch(idle, launch, renderer.sampleWalkPose(obj), -Math.PI / 2);
            obj.realistic3DWalk = 0.48 / 6;
            checkFirstArms(idleArms, renderer.sampleArmJoints(obj), -Math.PI / 2);
            const cruiseHeights = [];
            for (let frame = 0; frame <= 128; frame++) {
                obj.realistic3DWalk = frame / 128;
                const feet = renderer.sampleWalkPose(obj);
                ankleTargetError = Math.max(ankleTargetError, ...feet.map(foot => foot.error));
                if (frame >= 22 && frame <= 106) cruiseHeights.push(feet[0]);
                if (feet.every((foot, i) => foot.surface > idle[i].surface + 0.06)) throw Error('In-place walk left the floor');
                if ((frame === 0 || frame === 128) && JSON.stringify(feet) !== JSON.stringify(idle)) {
                    throw Error('In-place walking did not start and end in the same standing pose');
                }
            }
            measureCruise(cruiseHeights);
        }
        const { anchor } = renderer.planWalk(tunde, { x: tunde.x, y: tunde.y });
        for (const points of [[anchor], [null], [{x:anchor.x+10,y:anchor.y},{x:anchor.x+11,y:anchor.y}]]) {
            let message;
            try { renderer.planWalk(tunde,points); } catch(e) {message=e.message;}
            if (!message?.includes('two stage pixels apart')) throw Error('Invalid route was not rejected cleanly');
        }
        const yawDelta=(a,b)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)))*180/Math.PI;
        let maxSwingYawStep=0, maxPlantedYawStep=0;
        for (const sign of [-1,1]) {
            const obj={...tunde,width:290,height:400,realistic3D:{...tunde.realistic3D,yaw:0}};
            const origin=renderer.walkAnchor(obj), corner={x:origin.x+20*sign,y:origin.y-60};
            const route=renderer.planWalk(obj,[corner,{x:corner.x-120*sign,y:corner.y+18}]);
            let previous;
            for (let i=0;i<=route.steps*40;i++) {
                const t=(route.turnTime+(route.seconds-route.turnTime)*i/(route.steps*40))/route.seconds;
                for (const [key,frames] of Object.entries(route.tracks)) obj[key]=interpolate(frames,t);
                const feet=renderer.sampleWalkPose(obj);
                if (previous) {
                    const stance=1-Math.floor((i-1)/40)%2;
                    maxSwingYawStep=Math.max(maxSwingYawStep,...feet.map((f,j)=>yawDelta(f.shoeYaw,previous[j].shoeYaw)));
                    if (i%40>8 && i%40<=20) maxPlantedYawStep=Math.max(maxPlantedYawStep,yawDelta(feet[stance].shoeYaw,previous[stance].shoeYaw));
                }
                previous=feet;
            }
        }
        if (maxSwingYawStep>7 || maxPlantedYawStep>.25) throw Error(`Sharp corner shoe yaw: ${maxSwingYawStep}/${maxPlantedYawStep}`);
        const short = renderer.planWalk(tunde, { x: anchor.x + 3, y: anchor.y }, undefined, 'natural');
        if (short.steps !== 2 || Math.abs(short.to.x - tunde.x - 3) > 1e-6) throw Error('Short walk missed its destination');
        const point = { x: anchor.x - 160, y: anchor.y - 22 };
        for (const gait of ['walk','natural']) {
            const obj = {...tunde};
            const route = renderer.planWalk(obj,[point,{x:point.x-80,y:point.y+34}],undefined,gait);
            const sample = beat => {
                const t=(route.turnTime+(route.seconds-route.turnTime)*beat/route.steps)/route.seconds;
                for(const [key,frames] of Object.entries(route.tracks)) obj[key]=interpolate(frames,t);
                return renderer.sampleWalkPose(obj);
            };
            let drift=0, miss=Infinity;
            for(let i=0;i<route.steps;i++){
                const side=1-i%2;
                const [a,b]=[.25,.45].map(p=>sample(i+p)[side].ankle);
                drift=Math.max(drift,Math.hypot(a[0]-b[0],a[1]-b[1]));
                for(let k=0;k<16;k++) {
                    const beat=i+k/16;
                    const t=(route.turnTime+(route.seconds-route.turnTime)*beat/route.steps)/route.seconds;
                    miss=Math.min(miss,Math.hypot(interpolate(route.tracks.x,t)-tunde.x+anchor.x-point.x,
                        interpolate(route.tracks.y,t)-tunde.y+anchor.y-point.y));
                }
            }
            if(drift>.3 || miss>3) throw Error(`Corner ${gait}: planted foot drift=${drift}px, waypoint miss=${miss}px`);
        }
        const naturalRoute = renderer.planWalk(tunde, point, undefined, 'natural');
        if (!naturalRoute.tracks.realistic3DNaturalRoute || naturalRoute.tracks.realistic3DRouteProgress) throw Error('Natural route selected the wrong gait');
        const variants = [amaka, tunde].flatMap(original => [-135, -90, -45, 45, 90, 135].map(yaw =>
            ['realistic3DWalk', 'realistic3DStroll', 'realistic3DStrut', 'realistic3DNaturalWalk'].map(channel => checkVariant(original, channel, yaw))));
        return { maxDrift, ankleTargetError, lowestLift, deepestPenetration, farthestFloat, maxSwingLift, maxKneeChange, kneeChangeAt, maxHipDrop, maxCruiseBob, maxHeadBob,
            launchDrop, launchBend, firstLift, firstArmOpposition, weightTransfer, midstanceBend, lateSwingBend, lateLiftIncrease, lateLiftAt,
            mostToeOff, mostHeelStrike, maxSwingYawStep, maxPlantedYawStep, variants, point, screen: app.stage.stageToScreen(point.x, point.y), startX: tunde.x };
    });
    console.log('3D gait', JSON.stringify(walkCheck));
    assert.ok(walkCheck.maxDrift < 0.25 && walkCheck.ankleTargetError < 0.012, JSON.stringify(walkCheck));
    assert.ok(walkCheck.launchDrop < 0.05 && walkCheck.launchBend < 7 && walkCheck.firstLift > 0.06 &&
        walkCheck.weightTransfer > 0.032 && walkCheck.firstArmOpposition > 0.08, JSON.stringify(walkCheck));
    assert.ok(walkCheck.midstanceBend < 16 && walkCheck.lateSwingBend < 19, JSON.stringify(walkCheck));
    assert.ok(walkCheck.lowestLift > 0.15 && walkCheck.maxSwingLift < 0.48 && walkCheck.lateLiftIncrease < 0.035, JSON.stringify(walkCheck));
    assert.ok(walkCheck.deepestPenetration < 0.12 && walkCheck.farthestFloat < 0.12, JSON.stringify(walkCheck));
    assert.ok(walkCheck.maxKneeChange < 7.5 && walkCheck.maxHipDrop < 0.335 && walkCheck.maxCruiseBob < 0.31 &&
        walkCheck.maxHeadBob < 0.23, JSON.stringify(walkCheck));
    assert.ok(walkCheck.mostToeOff > 10 && walkCheck.mostToeOff < 20 && walkCheck.mostHeelStrike < -5, JSON.stringify(walkCheck));
    for (const [walk, stroll, strut, natural] of walkCheck.variants) {
        assert.ok(walk.travel < stroll.travel && stroll.travel < strut.travel, JSON.stringify([walk, stroll, strut]));
        assert.ok(natural.peakFold > 49 && natural.peakFold > walk.peakFold + 5 && natural.heelBehindKnee > walk.heelBehindKnee &&
            natural.terminalBend < 18 && natural.landingReach > 0.6 && natural.oppositeArmLead > 0.8, JSON.stringify({ walk, natural }));
        for (const mode of [walk, stroll, strut, natural]) {
            assert.ok(mode.loadedBend < 16 && mode.simultaneousFlex < 0.35, JSON.stringify(mode));
            assert.ok(mode.widthRatio < 0.75 && mode.bendDifference < 1 && mode.clearanceDifference < 0.015 && mode.forwardDifference < 0.025, JSON.stringify(mode));
            assert.ok(mode.kneeSpeed < 3.7 && mode.kneeSnap < 2 && mode.armSnap < 0.055, JSON.stringify(mode));
        }
    }
    await open();
    await dialog.locator('[name=action]').selectOption('walkToPoint');
    await dialog.locator('[name=yaw]').selectOption('-90');
    assert.equal(await dialog.locator('[data-action]').innerText(), 'Apply Appearance and Add Action');
    const pickWalk = dialog.locator('[data-pick-walk]');
    const guide = page.locator('.realistic-3d-route-guide');
    await pickWalk.click();
    await guide.waitFor();
    await page.keyboard.press('Escape');
    await dialog.locator('[role=status]').filter({ hasText: 'Destination selection canceled' }).waitFor();
    assert.equal(await guide.count(), 0);
    await pickWalk.click();
    await page.mouse.click(walkCheck.screen.x + 42, walkCheck.screen.y + 18);
    await dialog.locator('[role=status]').filter({ hasText: 'Destination selected' }).waitFor();
    await dialog.locator('[data-add-waypoint]').click();
    await page.mouse.move(walkCheck.screen.x, walkCheck.screen.y);
    await guide.locator('[data-waypoint="2"]').waitFor();
    for (const [n, dx, dy] of [[1,42,18],[2,0,0]]) {
        const box = await guide.locator(`[data-waypoint="${n}"]`).boundingBox();
        assert.ok(Math.abs(box.x + box.width/2 - walkCheck.screen.x - dx) < 1 &&
            Math.abs(box.y + box.height/2 - walkCheck.screen.y - dy) < 1, 'Guide marker missed the stage point');
    }
    await page.screenshot({path:'tmp/realistic-3d-waypoint-guide.png'});
    await page.mouse.click(walkCheck.screen.x, walkCheck.screen.y);
    await dialog.locator('[role=status]').filter({ hasText: 'Destination selected' }).waitFor();
    await dialog.getByLabel('Waypoint 2 behavior').selectOption('stop');
    await dialog.locator('[data-wait]').last().fill('0.5');
    await dialog.locator('[data-wait]').last().press('Tab');
    const seconds = dialog.locator('[name=seconds]');
    const automaticSeconds = await seconds.inputValue();
    await seconds.fill('8');
    await dialog.locator('[data-preview]').click();
    await page.locator('.realistic-3d-stage-status').filter({ hasText: 'Previewing Walk to Point' }).waitFor();
    assert.equal(await guide.count(), 0);
    await page.evaluate(async startX => {
        const actor = app.objects.objects.find(o => o.realistic3D?.id === 'tunde');
        const { ctx, canvas } = app.stage;
        const hash = () => ctx.getImageData(0, 0, canvas.width, canvas.height).data
            .reduce((a, byte, i) => i % 169 ? a : Math.imul(33, a) ^ byte, 1);
        const before = hash();
        await new Promise(resolve => setTimeout(resolve, 650));
        if (hash() === before) throw Error('Walk preview did not change the stage pixels');
        if (actor.x !== startX || actor.realistic3DRouteProgress !== 0 || actor.realistic3D.yaw !== 0) throw Error('A preview mutated the project');
    }, walkCheck.startX);
    await page.screenshot({ path: 'tmp/realistic-3d-walk-stage.png' });
    await page.keyboard.press('Escape');
    await dialog.locator('[role=status]').filter({ hasText: 'Preview stopped' }).waitFor();
    assert.equal(await page.evaluate(() => app.objects.objects.find(o => o.realistic3D?.id === 'tunde').x), walkCheck.startX);
    await seconds.fill(automaticSeconds);
    await dialog.locator('[data-keep-open]').check();
    await dialog.locator('[data-action]').click();
    await dialog.locator('[role=status]').filter({ hasText: 'Action added to timeline' }).waitFor();
    await dialog.locator('[name=action]').selectOption('wave');
    await dialog.locator('[data-action]').click();
    await dialog.locator('[data-close]').click();
    console.log(`PASS both 3D rigs hold stance to ${walkCheck.maxDrift.toFixed(4)} stage px across three directions`);
    const data = await page.evaluate(async () => {
        const actors = app.objects.objects.filter(obj => obj.realistic3D);
        const configs = actors.map(obj => StageObject.fromJSON(obj.toJSON()).realistic3D);
        const legacy = StageObject.fromJSON({ ...actors[0].toJSON(), realistic3D: { id: 'amaka' } });
        if (legacy.realistic3D.build !== 0) throw Error('An older project did not preserve the original shape');
        const clips = actors[0].animations;
        const character = app.audioTimeline._getAvailableCharacters().find(item => item.id === actors[0].id);
        const descriptor = app.audioLipSync._buildCharacterContext(character.armature).descriptor;
        const speech = { ...descriptor, duration: 1600, cues: [{ time: 400, viseme: 'A', strength: 1 }] };
        AudioLipSyncRuntime.applyRealistic3DSpeech(actors[0], speech, { channels: { jawOpen: 1, mouthOpen: 1 } }, {});
        if (actors[0]._realistic3DSpeech.jaw < 0.5) throw Error('The 3D jaw did not receive the speech channel');
        app.audioLipSync.clearFrameOverrides();
        if (actors[0]._realistic3DSpeech) throw Error('The temporary speech override was not cleared');
        const canvas = document.createElement('canvas');
        canvas.width = 640; canvas.height = 360;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const layers = [];
        app.animations.seekToStart();
        for (const time of [0, 800]) {
            await app.exporter._renderExportFrame(ctx, 640, 360, time);
            const pixels = ctx.getImageData(0, 0, 640, 360).data;
            layers.push(new Set(pixels.filter((_, i) => i % 4 === 0)).size);
        }
        if (actors[0].realistic3DWave < 0.3 || actors[0].realistic3DWave > 0.5) throw Error('Timeline seek did not interpolate the 3D channel');
        const route = actors[1].animations[0];
        const x = route?.generated.find(track => track.property === 'x');
        if (!x || !(actors[1].x < x.from && actors[1].x > x.to) || actors[1].realistic3DPathPhase <= 0) {
            throw Error('Export frame did not advance the 3D route');
        }
        app.animations.applyAnimationsAtTime(route.generated[0].duration - 300, { timelinePreview: true });
        if (Math.abs(actors[1].x - x.to) > 0.01 || actors[1].realistic3DPathPhase !== 1) {
            throw Error('Stage timeline did not reach the route destination');
        }
        app.animations.applyAnimationsAtTime(0, { timelinePreview: true });
        if (actors[0].realistic3DWave !== 0) throw Error('Timeline reset did not clear the 3D channel');
        if (actors[1].x !== x.from || actors[1].realistic3DPathPhase !== 0) throw Error('Timeline reset did not restore the 3D route');
        const openPreview = app.exporter._openHtmlInPreviewWindow;
        app.exporter._openHtmlInPreviewWindow = html => window.testPlayback = html;
        app.exporter.exportHTML5({ forceCurrentScene: true, openInWindow: true, autoplay: false, includeControls: true });
        app.exporter._openHtmlInPreviewWindow = openPreview;
        return { configs, clips, layers, html: window.testPlayback, walkMs: route.generated[0].duration };
    });
    assert.deepEqual(data.configs.map(c => [c.id, c.outfit, c.build]), [['amaka', 0, -0.6], ['tunde', 1, 0.65]]);
    assert.equal(data.configs[1].walkSpacing, 'narrow');
    assert.equal(data.configs[1].yaw, -90);
    assert.equal(data.clips[0]?.generated[0]?.property, 'realistic3DWave');
    assert.ok(data.layers.every(size => size > 40), JSON.stringify(data.layers));
    assert.ok(data.html.includes('realistic3D:'));
    const localWindows = [];
    const recordPopup = popup => localWindows.push(popup);
    page.on('popup', recordPopup);
    const localPreview = page.waitForEvent('popup');
    await page.evaluate(() => document.getElementById('btn-preview').click());
    const localWindow = await localPreview;
    const localFrame = await (await localWindow.locator('iframe').elementHandle()).contentFrame();
    await localFrame.waitForFunction(() => !!window.__realistic3DRenderer &&
        objects.some(obj => obj.realistic3DWave > 0.1 && obj.realistic3DWave < 1), null, { timeout: 30000 });
    await localFrame.waitForFunction(startX => objects.some(obj => obj.realistic3D?.id === 'tunde' &&
        obj.realistic3DPathPhase > 0.1 && obj.x < startX - 1), walkCheck.startX, { timeout: 10000 });
    assert.equal(localWindows.length, 1, 'Loopback preview must not launch the legacy fallback too');
    assert.equal(await localWindow.evaluate(() => window.opener), null);
    assert.ok(!(await localWindow.locator('iframe').getAttribute('sandbox')).includes('allow-same-origin'));
    page.off('popup', recordPopup);
    await localWindow.close();
    const playback = await context.newPage();
    playback.on('pageerror', error => errors.push(error.message));
    await playback.goto(`${origin}/playback-test`);
    await playback.evaluate(html => { document.querySelector('iframe').srcdoc = html; }, data.html);
    const frame = await (await playback.locator('iframe').elementHandle()).contentFrame();
    await frame.waitForFunction(() => !!window.__realistic3DRenderer, null, { timeout: 30000 });
    assert.deepEqual(await frame.evaluate(() => objects.filter(obj => obj.realistic3D).map(obj => obj.realistic3D.build)), [-0.6, 0.65]);
    await frame.waitForFunction(() => {
        const canvas = document.querySelector('canvas');
        if (!canvas) return false;
        const ctx = canvas.getContext('2d');
        if (!ctx) return false;
        const values = new Set(ctx.getImageData(0, 0, canvas.width, canvas.height).data.filter((_, i) => i % 4 === 0));
        return values.size > 50;
    });
    await playback.screenshot({ path: 'tmp/realistic-3d-library-playback.png' });
    if (process.argv.includes('--encode')) {
        const download = page.waitForEvent('download', { timeout: 90000 });
        const duration = Math.max(2000, Math.ceil(data.walkMs + 2000));
        await page.evaluate(ms => app.exporter.exportMediaRecorder('mp4', 640, 360, 12, 24, ms), duration);
        const file = await download;
        await file.saveAs('tmp/realistic-3d-waypoints-wave.mp4');
        assert.match(file.suggestedFilename(), /\.mp4$/i);
        const bytes = fs.readFileSync(await file.path());
        const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
        buffer.fileStart = 0;
        const mp4 = createFile();
        mp4.appendBuffer(buffer); mp4.flush();
        assert.ok(mp4.getInfo().tracks.some(track => track.type === 'video' && track.nb_samples >= Math.floor(duration * 12 / 1000)));
        console.log(`PASS two-character MP4 export with Walk to Point (${bytes.length} bytes)`);
    }
    await page.evaluate(() => app.animations.seekToStart());
    await open();
    await dialog.locator('[data-recorded]:enabled').waitFor();
    await dialog.locator('[data-recorded]').selectOption('');
    await dialog.locator('[name=action]').selectOption('strutToPoint');
    await pickWalk.click();
    await page.mouse.click(walkCheck.screen.x + 70, walkCheck.screen.y + 15);
    await dialog.locator('[role=status]').filter({ hasText: 'Destination selected' }).waitFor();
    await dialog.getByLabel('Waypoint 1 behavior').selectOption('stop');
    await dialog.locator('[data-wait]').fill('0.6');
    await dialog.locator('[data-wait]').press('Tab');
    await dialog.locator('[data-add-waypoint]').click();
    await page.mouse.click(walkCheck.screen.x + 120, walkCheck.screen.y + 10);
    await dialog.locator('[role=status]').filter({ hasText: 'Destination selected' }).waitFor();
    await dialog.locator('[data-keep-open]').check();
    await dialog.locator('[data-action]').click();
    await page.evaluate(() => {
        const actor = app.objects.objects.find(o => o.realistic3D?.id === 'tunde');
        const [a, wave, b, c] = actor.animations;
        const from = b?.generated.find(track => track.property === 'x')?.from;
        const firstEnd = a.generated.find(track => track.property === 'x').to;
        if (from !== firstEnd || b.delay !== wave.delay + wave.generated[0].duration) throw Error('The second route did not start after the greeting');
        app.animations.applyAnimationsAtTime(b.delay + b.generated[0].duration / 2, { timelinePreview: true });
        if (actor.x <= firstEnd || !(actor.realistic3DStrutRoute > 0 && actor.realistic3DStrutRoute < 1)) {
            throw Error('The second route did not take over with Strut');
        }
        const stopX=b.generated.find(track=>track.property==='x').to;
        app.animations.applyAnimationsAtTime(c.delay-350,{timelinePreview:true});
        if (actor.realistic3DStrutRoute!==1 || Math.abs(actor.x-stopX)>.01) throw Error('Intermediate wait moved the actor');
        app.animations.applyAnimationsAtTime(c.delay+c.generated[0].duration*.6,{timelinePreview:true});
        if (!(actor.realistic3DStrutRoute>0 && actor.realistic3DStrutRoute<1 && actor.x>stopX)) throw Error('Did not restart from the intermediate stop');
        app.animations.seekToStart();
    });
    await dialog.locator('[name=action]').selectOption('wave');
    await dialog.locator('[data-action]').click();
    await page.evaluate(()=>{
        const actor=app.objects.objects.find(o=>o.realistic3D?.id==='tunde'), wave=actor.animations.at(-1);
        app.animations.applyAnimationsAtTime(wave.delay+600,{timelinePreview:true});
        if (!(actor.realistic3DWave>0 && actor.realistic3DWave<1) || actor.realistic3DStrutRoute!==1) throw Error('Wave did not follow the completed route');
        app.animations.seekToStart();
    });
    await dialog.locator('[name=action]').selectOption('stroll');
    await dialog.locator('[name=seconds]').fill('8.4');
    await dialog.locator('[name=pace]').selectOption('1.5');
    await dialog.locator('[data-action]').click();
    await page.evaluate(() => {
        const actor = app.objects.objects.find(o => o.realistic3D?.id === 'tunde');
        const stroll = actor.animations.at(-1);
        app.animations.applyAnimationsAtTime(stroll.delay + 900, { timelinePreview: true });
        if (!(actor.realistic3DStroll > 0 && actor.realistic3DStroll < 1)) throw Error('Stroll cycle did not reach the stage');
        if(stroll.generated[0].duration!==8400 || actor.realistic3DCycleSteps!==18) throw Error('Stroll duration and pace were not applied independently');
        const restored = StageObject.fromJSON(actor.toJSON());
        if (restored.realistic3DStroll !== actor.realistic3DStroll) throw Error('Stroll was not saved');
        app.animations.seekToStart();
    });
    await dialog.locator('[data-close]').click();
    await page.evaluate(()=>{
        const actor=app.objects.objects.find(o=>o.realistic3D?.id==='tunde');
        Realistic3DLibrary.open(app,actor,actor.animations.at(-1).id);
    });
    await dialog.locator('[data-recorded]:enabled').waitFor();
    assert.equal(await dialog.locator('[name=pace]').inputValue(),'1.5');
    assert.equal(await dialog.getByLabel('Action duration (s)',{exact:true}).inputValue(),'8.4');
    await dialog.locator('[data-close]').click();
    const recordedRoute=await page.evaluate(()=>{
        const obj=app.objects.objects.find(o=>o.realistic3D?.id==='tunde');
        const [a,w,b,c,w2,stroll]=obj.animations;
        stroll.delay+=375;
        stroll.params.delay=stroll.delay/1000;
        if (!StageObject.fromJSON(obj.toJSON()).animations[2].params.realistic3DAction.points.length) throw Error('Waypoint source not saved');
        for(const clip of [a,w,b,c,w2]) delete clip.params.realistic3DAction;
        app.applyLayout('timeline-only');
        app.timeline.update();
        return {id:b.id,second:c.id,wave:w2.id,waveDelay:w2.delay,stroll:stroll.id,count:obj.animations.length};
    });
    const bar = id => page.locator(`.timeline-bar[data-anim-id="${id}"]`).first();
    await bar(recordedRoute.second).click();
    await dialog.getByRole('button',{name:'Update Timeline Action'}).waitFor();
    assert.equal(await dialog.locator('[data-recorded]').inputValue(),recordedRoute.id);
    assert.equal(await dialog.locator('.realistic-3d-waypoint').count(),2);
    assert.equal(await dialog.locator('[data-wait]').first().inputValue(),'0.6');
    await dialog.getByLabel('Waypoint 1 behavior').selectOption('pass');
    await dialog.locator('[name=action]').selectOption('naturalToPoint');
    await dialog.locator('[name=seconds]').fill('12');
    await dialog.locator('[data-keep-open]').check();
    await dialog.locator('[data-action]').click();
    await dialog.getByText('Timeline action updated.',{exact:true}).waitFor();
    await page.evaluate(old=>{
        const obj=app.objects.objects.find(o=>o.realistic3D?.id==='tunde');
        const route=obj.animations.find(c=>c.id===old.id),wave=obj.animations.find(c=>c.id===old.wave);
        if(obj.animations.length!==old.count-1 || route.params.realistic3DAction.points.length!==2 ||
            route.params.realistic3DAction.key!=='naturalToPoint' || Math.abs(wave.delay-route.delay-route.generated[0].duration)>1)
            throw Error('Editing did not replace the legacy stop group and retime the following wave');
        const stroll=obj.animations.find(c=>c.id===old.stroll);
        if (Math.abs(route.generated[0].duration-12000)>1 || Math.abs(wave.delay-old.waveDelay)<1 ||
            Math.abs(stroll.delay-wave.delay-wave.generated[0].duration-375)>1 || stroll.params.delay!==stroll.delay/1000)
            throw Error('Duration edit lost a later action or its intentional gap');
    },recordedRoute);
    await dialog.locator('[data-close]').click();
    await page.setViewportSize({width:1100,height:460});
    await bar(recordedRoute.id).click({button:'right'});
    const menu=page.locator('.context-menu.tl-scroll-menu');
    await menu.waitFor();
    assert.ok(await menu.evaluate(m=>m.scrollHeight>m.clientHeight));
    await menu.hover();
    await page.mouse.wheel(0,1000);
    await page.waitForFunction(()=>document.querySelector('.tl-scroll-menu')?.scrollTop>0);
    await menu.locator('[data-action="edit-3d"]').click();
    await dialog.getByRole('button',{name:'Update Timeline Action'}).waitFor();
    await dialog.locator('[data-close]').click();
    await page.setViewportSize({width:1280,height:900});
    await page.evaluate(()=>app.applyLayout('default'));
    await page.waitForFunction(()=>app.stage.canvas.getBoundingClientRect().height>100);
    const actorScreen=await page.evaluate(()=>{
        const obj=app.objects.objects.find(o=>o.realistic3D?.id==='tunde');
        return app.stage.stageToScreen(obj.x+obj.width/2,obj.y+obj.height/2);
    });
    await page.mouse.click(actorScreen.x,actorScreen.y,{button:'right'});
    await page.getByText('Edit 3D Action or Route',{exact:true}).click();
    await dialog.getByRole('button',{name:'Update Timeline Action'}).waitFor();
    await dialog.locator('[data-close]').click();
    await page.setViewportSize({ width: 390, height: 844 });
    await open();
    await dialog.locator('button[type=submit]:enabled').waitFor();
    const box = await dialog.boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= 390);
    await dialog.screenshot({ path: 'tmp/realistic-3d-library-mobile.png' });

    const production = await context.newPage({ viewport: { width: 1280, height: 900 } });
    production.on('pageerror', error => errors.push(error.message));
    await production.route('https://**/*', route => route.abort());
    await production.addInitScript(() => {
        window.__STAGE_USER = { csrf_token: 'browser-smoke-token' };
        window.__texturePolicyViolations = [];
        document.addEventListener('securitypolicyviolation', event => {
            if (event.blockedURI.startsWith('blob') && event.effectiveDirective === 'connect-src') window.__texturePolicyViolations.push(event.blockedURI);
        });
    });
    await production.goto(`${origin}/index.html?stage-csp=1`);
    await production.waitForFunction(() => window.app?.exporter && window.Realistic3DLibrary);
    let releaseModel;
    const modelGate = new Promise(resolve => { releaseModel = resolve; });
    await production.route('**/amaka.glb*', async route => { await modelGate; await route.continue(); });
    await production.evaluate(() => document.getElementById('btn-realistic-3d').click());
    const strictDialog = production.locator('#realistic-3d-library');
    const strictButton = strictDialog.locator('[data-create-action]:enabled');
    await strictDialog.locator('[data-model-notice]').getByText('Loading Amaka...').waitFor();
    assert.equal(await strictDialog.locator('[data-preview]').isDisabled(), true);
    releaseModel();
    await strictButton.waitFor({ timeout: 30000 });
    assert.equal(await strictDialog.locator('[data-model-notice]').isHidden(), true);
    assert.deepEqual(await production.evaluate(async () => {
        const renderer = await import(Realistic3DLibrary.url);
        const actor = await renderer.prepare('amaka');
        return { textureBlocks: window.__texturePolicyViolations, textured: ['Body0', 'Outfit0', 'Hair'].every(name => actor.getObjectByName(name).material.map.image.width > 0) };
    }), { textureBlocks: [], textured: true });
    await strictDialog.locator('[name=action]').selectOption('strut');
    await strictButton.click();
    const shellPopup = production.waitForEvent('popup');
    await production.evaluate(() => document.getElementById('btn-preview').click());
    const shellWindow = await shellPopup;
    shellWindow.on('pageerror', error => errors.push(error.message));
    const opaqueFrame = await (await shellWindow.locator('iframe').elementHandle()).contentFrame();
    await opaqueFrame.waitForFunction(() => !!window.__realistic3DRenderer && objects.some(obj => obj.realistic3DStrut > 0.1), null, { timeout: 30000 });
    assert.equal(await opaqueFrame.locator('#preview-3d-error').count(), 0);
    assert.ok(await opaqueFrame.evaluate(async () => {
        const scene = await window.__realistic3DRenderer.prepare('amaka');
        return scene.getObjectByName('Outfit0').material.map.image.width > 0;
    }));
    await shellWindow.close();

    let rejectModel;
    const failureGate = new Promise(resolve => { rejectModel = resolve; });
    const blockPreviewModel = async route => { await failureGate; await route.abort(); };
    const previewModel = url => url.pathname === '/api/realistic-3d-asset.php' && url.searchParams.get('file') === 'amaka';
    await context.route(previewModel, blockPreviewModel);
    const failedPopup = production.waitForEvent('popup');
    await production.evaluate(() => document.getElementById('btn-preview').click());
    const failedWindow = await failedPopup;
    const failedFrame = failedWindow.frameLocator('iframe');
    await failedFrame.locator('#preview-3d-loading').waitFor();
    rejectModel();
    await failedFrame.locator('#preview-3d-error').filter({ hasText: '3D characters could not load' }).waitFor();
    assert.equal(await failedFrame.locator('#preview-3d-loading').count(), 0);
    await failedWindow.close();
    await context.unroute(previewModel, blockPreviewModel);

    const noGPU = await context.newPage();
    await noGPU.addInitScript(() => {
        const get = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
            return kind.startsWith('webgl') ? null : get.call(this, kind, ...args);
        };
    });
    await noGPU.route('https://**/*', route => route.abort());
    await noGPU.goto(`${origin}/index.html`);
    await noGPU.waitForFunction(() => window.app?.exporter);
    await noGPU.evaluate(() => document.getElementById('btn-realistic-3d').click());
    await noGPU.locator('#realistic-3d-library [role=status]').filter({ hasText: '3D characters require WebGL 2.' }).waitFor();
    assert.deepEqual(errors, []);
    console.log('PASS 3D stage and popup playback, textured models under production policies, WebGL diagnostics, save, and mobile layout');
} finally {
    await browser?.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
}

async function checkArrivalRoutes(parent) {
    const page=await parent.context().newPage();
    try {
        // This isolated page exercises mocked voice endpoints, never a live service.
        await page.addInitScript(()=>{globalThis.STUDIO3D_CONFIG={studio2DUrl:'https://animationstage.com/',hostedServices:true};localStorage.setItem('frd-done','1');localStorage.setItem('animstage_onboarded','1');});
        await page.route('https://**/*',r=>r.abort());
        await page.goto(parent.url());
        await page.waitForFunction(()=>window.app?.exporter && window.Realistic3DLibrary);
        const dialog=page.locator('#realistic-3d-library');
        for(const id of ['amaka','tunde']){
            const points=await page.evaluate(async id=>{
                app._scheduleAutosave=()=>{};
                const obj=new StageObject('image',{name:id,x:app.stage.width*(id==='amaka'?.22:.54),y:app.stage.height*.2,
                    width:180,height:250,realistic3D:{id,yaw:90},strokeWidth:0});
                app.objects.addObject(obj); app.objects.select([obj.id]);
                await Realistic3DLibrary.preload([obj]);
                const m=await import(Realistic3DLibrary.url), anchor=m.walkAnchor(obj);
                for(const destinations of [
                    [{x:anchor.x+260,y:anchor.y}],
                    [{x:anchor.x+100,y:anchor.y},{x:anchor.x+260,y:anchor.y+12}]
                ]) {
                    const plan=seconds=>m.planWalk(obj,destinations,seconds,'jog');
                    const normal=plan(), fast=plan(normal.minSeconds), longer=plan(normal.seconds*1.6);
                    if (!(longer.steps>normal.steps && normal.steps>fast.steps && Math.abs((normal.seconds-normal.turnTime)/normal.steps-.4)<.025))
                        throw Error('Jog route cadence did not adapt: '+JSON.stringify({id,normal:normal.steps,fast:fast.steps,longer:longer.steps}));
                    for (const r of [fast,normal,longer]) {
                        const actor={...obj};
                        function poseAt(beat) {
                            const t=(r.turnTime+beat/r.steps*(r.seconds-r.turnTime))/r.seconds;
                            for(const [key,keys] of Object.entries(r.tracks)){
                                const j=keys.findIndex(f=>f.t>t);
                                actor[key]=j<1?keys.at(-1).value:keys[j-1].value+(keys[j].value-keys[j-1].value)*(t-keys[j-1].t)/(keys[j].t-keys[j-1].t);
                            }
                            return m.sampleWalkPose(actor);
                        }
                        for(let i=0;i<r.steps;i++){
                            const side=1-i%2, placed=poseAt(i+.21)[side].ankle, held=poseAt(i+.37)[side].ankle;
                            const slip=Math.hypot(held[0]-placed[0],held[1]-placed[1]);
                            if(slip>.06) throw Error('Jog stance slipped '+slip+' stage pixels: '+JSON.stringify({id,i,steps:r.steps}));
                            if(destinations.length===1 && i>=2 && i<r.steps-2){
                                const ankleLead=beat=>{
                                    const [hip,,ankle]=poseAt(beat)[side].joints;
                                    return ankle[0]-hip[0];
                                };
                                const landing=ankleLead(i), pushOff=-ankleLead(i+.78);
                                if(!(landing>0 && pushOff>landing*.8))
                                    throw Error('Side jog lacks trailing push-off: '+JSON.stringify({id,i,landing,pushOff}));
                            }
                        }
                        poseAt(r.steps);
                        if(Math.hypot(actor.x-r.to.x,actor.y-r.to.y)>.01) throw Error('Jog missed its destination');
                    }
                }
                const at=p=>m.sampleWalkPose({...obj, realistic3DJog:p}).map(l=>l.surface);
                const floor=at(0);
                const flight=at(2.89/6), stance=at(2.4/6);
                if(!flight.every((h,i)=>h>floor[i]+.015) || !stance.some((h,i)=>Math.abs(h-floor[i])<.04))
                    throw Error('Missing jog flight or support: '+JSON.stringify({id,flight,stance,floor}));
                const sample={...obj}, cycle=Array.from({length:81},(_,i)=>{
                    sample.realistic3DJog=(2+i/40)/6;
                    const feet=m.sampleWalkPose(sample,true);
                    const arms=m.sampleArmJoints(sample);
                    // This fixture faces +X. Measure the visible hip-to-shoulder line,
                    // not the local rotation of a spine bone that may sit near the neck.
                    const trunk=[0,1].map(k=>arms.L[0][k]+arms.R[0][k]-feet[0].joints[0][k]-feet[1].joints[0][k]);
                    const lean=Math.atan2(trunk[0],trunk[1])*180/Math.PI;
                    if(!(lean>=5 && lean<=11)) throw Error('Jog trunk lean: '+JSON.stringify({id,lean,i}));
                    return feet;
                });
                for(const side of [0,1]){
                    const span=values=>Math.max(...values)-Math.min(...values);
                    const lift=Math.max(...cycle.map(f=>f[side].surface-floor[side]));
                    const hip=span(cycle.map(f=>f[side].joints[0][1]));
                    const seat=span(cycle.map(f=>f[side].seat[1]));
                    const inclination=(a,b)=>Math.atan2(b[0]-a[0],a[1]-b[1])*180/Math.PI;
                    const thighs=cycle.map(f=>inclination(...f[side].joints.slice(0,2)));
                    const folds=cycle.map((f,i)=>thighs[i]-inclination(...f[side].joints.slice(1)));
                    const thigh=Math.max(...thighs), fold=Math.max(...folds);
                    const lag=(thighs.indexOf(thigh)-folds.indexOf(fold)+80)%80;
                    if(!(fold>88 && fold<106 && thigh>44 && thigh<55 && lag>0 && lag<20))
                        throw Error('Jog heel recovery must precede forward knee drive: '+JSON.stringify({id,side,thigh,fold,lag}));
                    if(lift<2.25 || hip>.18 || seat>.28 || cycle.some(f=>f[side].error>1e-5))
                        throw Error('Jog hip stability, clearance or IK failed: '+JSON.stringify({id,side,hip,seat,lift}));
                }
                if(id==='amaka'){
                    const audio=app.audioTimeline;
                    const wav=audio._audioBufferToWavBlob(new AudioBuffer({length:24000,sampleRate:8000,numberOfChannels:1}));
                    audio.tracks.push(await audio._createLoadedTrack({audioId:'doorway-line',characterId:obj.id,fileName:'Doorway line',
                        mimeType:'audio/wav',dataUrl:await audio._readBlobAsDataUrl(wav),arrayBuffer:await wav.arrayBuffer()}));
                    audio._applyActiveTrack(audio.tracks.at(-1));
                    const config={...app.audioLipSync._buildCharacterContext({root:obj,parts:{}}).descriptor,
                        type:'audio-lip-sync',duration:3000,sourceStartMs:0,sourceEndMs:3000,version:22,audioId:'doorway-line',strength:1,
                        cues:[{startMs:0,endMs:3000,viseme:'A',strength:1}]};
                    obj.animations=[{id:'doorway-speech',type:'audio-lip-sync',params:{duration:3},delay:0,repeat:1,
                        trigger:'onLoad',afterPlayback:'return',generated:[config]}];
                    const caption=new StageObject('caption',{name:'Doorway caption',segments:[{id:'line',startMs:0,endMs:3000,text:'Welcome!'}]});
                    CaptionRuntime.bind(caption,audio.tracks.at(-1));app.objects.addObject(caption);app.objects.select([obj.id]);
                }
                Realistic3DLibrary.open(app,obj);
                return [60,110,60,15].map(dx=>app.stage.stageToScreen(anchor.x+dx,anchor.y));
            },id);
            await dialog.locator('[data-action]:enabled').waitFor();
            await dialog.locator('[name=action]').selectOption('walkToPoint');
            for(const [i,p] of points.entries()){
                await dialog.locator(i?'[data-add-waypoint]':'[data-pick-walk]').click();
                await page.mouse.click(p.x,p.y);
                await dialog.getByText('Destination selected.',{exact:true}).waitFor();
                const arrival=dialog.getByLabel('Waypoint '+(i+1)+' arrival action');
                if(!i) assert.deepEqual(await arrival.locator('optgroup[label="Turn to face"] option').evaluateAll(opts=>opts.map(o=>o.value)),
                    ['faceFront','faceFrontRight','faceRight','faceBackRight','faceBack','faceBackLeft','faceLeft','faceFrontLeft']);
                await arrival.selectOption(['wave',id==='amaka'?'faceBackLeft':'turnLeft','sit','sit'][i]);
                if(i===1 && id==='amaka'){
                    const row=dialog.locator('.realistic-3d-waypoint').nth(1);
                    await row.getByRole('button',{name:'Add action'}).click();
                    await row.getByLabel('Waypoint 2 action 2 action duration in seconds').fill('1');
                    await row.getByLabel('Waypoint 2 action 2 action duration in seconds').press('Tab');
                    await row.getByRole('button',{name:'Move up at waypoint 2, action 2'}).click();
                    assert.equal(await arrival.inputValue(),'wave');
                    await row.getByRole('button',{name:'Move down at waypoint 2, action 1'}).click();
                    await row.getByRole('button',{name:'Add action'}).click();
                    await row.getByRole('button',{name:'Remove action at waypoint 2, action 3'}).click();
                    await row.locator('.sequence-speech > summary').click();
                    await row.getByLabel('Speech audio',{exact:true}).selectOption('doorway-line');
                    await row.getByLabel('Anchor speech to').selectOption({label:'2. Wave'});
                    await row.getByLabel('Start speech',{exact:true}).selectOption('before');
                    await row.getByLabel('Speech lead (s)').fill('1');
                    await row.getByLabel('Speech lead (s)').press('Tab');
                    await row.getByRole('button',{name:'Move up at waypoint 2, action 2'}).click();
                    assert.equal(await row.getByLabel('Anchor speech to').locator('option:checked').innerText(),'1. Wave');
                    await row.getByRole('button',{name:'Move down at waypoint 2, action 1'}).click();
                    await dialog.locator('[data-wait]').nth(1).fill('0.5');
                    await dialog.locator('[data-wait]').nth(1).press('Tab');
                }
                if(i===0){
                    const duration=dialog.getByLabel('Waypoint 1 action duration in seconds');
                    await duration.fill('4');
                    await duration.press('Tab');
                    await dialog.locator('[data-wait]').first().fill('1');
                    await dialog.locator('[data-wait]').first().press('Tab');
                }
                if(i===1) await dialog.getByLabel('Waypoint 1 departure gait').selectOption('stroll');
                if(i===1 && id==='tunde'){
                    const row=dialog.locator('.realistic-3d-waypoint').nth(1);
                    const wav=await page.evaluate(()=>app.audioTimeline.tracks.find(t=>t.audioId==='doorway-line').audioDataUrl.split(',')[1]);
                    await page.route('**/api/voiceover/dialogue-speech.php',r=>r.request().method()==='GET'
                        ? r.fulfill({json:{providers:{local:{available:true}}}})
                        : r.fulfill({contentType:'audio/wav',body:Buffer.from(wav,'base64')}));
                    await row.locator('.sequence-speech > summary').click();
                    await row.getByText('Generate speech from text',{exact:true}).click();
                    await row.getByLabel('Speech text').fill('Welcome to the clinic.');
                    await row.locator('[data-speech="refresh"]').click();
                    await row.locator('[data-speech="voice"]').selectOption({index:1});
                    await row.locator('[data-speech="generate"]').click();
                    await row.getByLabel('Create linked captions').check();
                    await row.getByLabel('Timing',{exact:true}).selectOption('continue');
                    await row.getByLabel('Anchor speech to').selectOption({label:'1. Turn left'});
                    await row.getByLabel('Start speech',{exact:true}).selectOption('end');
                    await row.getByLabel('Speech delay (s)').fill('0.3');
                    await row.getByLabel('Speech delay (s)').press('Tab');
                    await row.getByText('Caption style',{exact:true}).click();
                    await row.getByLabel('Use this style').check();
                    await row.getByLabel('Text progression').selectOption('word');
                }
                if(i===3) await dialog.getByLabel('Waypoint 3 departure gait').selectOption('jog');
            }
            if(id==='amaka'){
                await dialog.locator('[data-stop-preview]').nth(1).click();
                await page.getByText('Previewing waypoint 2',{exact:true}).waitFor();
                await dialog.getByText('Preview complete.',{exact:true}).waitFor();
                assert.equal(await page.evaluate(()=>app.objects.getSelectedObjects()[0].animations.length),1);
            }
            await dialog.locator('[data-keep-open]').check();
            await dialog.locator('[data-action]').click();
            await dialog.getByText('Action added to timeline.',{exact:true}).waitFor();
            await dialog.locator('[data-close]').click();
            if(id==='amaka'){
                await page.getByRole('button',{name:'Replay saved action'}).click();
                await page.waitForFunction(()=>{
                    const a=app.audioTimeline.tracks.find(t=>t.audioId==='doorway-line');
                    const obj=app.objects.getObjectById(a.characterId),t=app.animations.currentTime;
                    const caption=app.objects.objects.find(o=>o.captionAudioId===a.audioId);
                    const trace=window.savedReplayTrace ||= {};
                    if(app.animations.isPlaying){
                        trace.range=app.animations._playbackRange;
                        trace.lastTime=t;trace.audioStart=a.timelineStartMs;
                        trace.caption=caption?.segments?.[0];
                        trace.heard ||= !a.audioElement.paused && a.audioElement.currentTime>0;
                        trace.jaw=Math.max(trace.jaw||0,obj._realistic3DSpeech?.jaw||0);
                        trace.lips=obj.animations.filter(c=>c.type==='audio-lip-sync').map(c=>[c.delay,c.generated?.[0]?.adapterKind,c.generated?.[0]?.cues?.[0]?.viseme]);
                    }
                    return !a.audioElement.paused && a.audioElement.currentTime>0 && obj._realistic3DSpeech?.jaw>.1 &&
                        caption.segments.some(s=>s.text==='Welcome!' && s.startMs<=t && t<s.endMs);
                },null,{timeout:45000}).catch(async error=>{throw Error(error.message+' '+JSON.stringify(await page.evaluate(()=>window.savedReplayTrace)));});
                await page.waitForFunction(()=>!app.animations.isPlaying && app.animations.currentTime===0 &&
                    app.audioTimeline.tracks[0].audioElement.paused,null,{timeout:45000});
            }
            await page.evaluate(id=>{
                const actor=app.objects.objects.find(o=>o.name===id);
                const routes=actor.animations.filter(c=>c.params?.realistic3DAction);
                const [wave,turn,sit,jog]=routes;
                const track=(clip,key)=>clip.generated.find(t=>t.property===key);
                const end=c=>c.delay+c.generated[0].duration;
                const seek=t=>app.animations.applyAnimationsAtTime(t,{timelinePreview:true});
                const near=(a,b)=>Math.abs(a-b)<.01;
                seek(end(jog)-10);
                if(actor.realistic3DSit<.97) throw Error('Final seated pose lost');
                seek(jog.delay+600);
                if(!near(actor.realistic3DSit,.5) || !near(actor.x,track(jog,'x').from) || actor.realistic3DJogRoute>0)
                    throw Error('Character moved before standing');
                seek(end(wave)-3000);
                if(!near(actor.realistic3DWave,.5) || actor.realistic3DWaveCycles!==10 || !near(actor.x,track(wave,'x').to) || actor.realistic3DSit>.01)
                    throw Error('Wave is not standing at its destination: '+JSON.stringify({sit:actor.realistic3DSit,wave:actor.realistic3DWave}));
                seek(end(wave)-500);
                if(actor.realistic3DWave!==1 || !near(actor.x,track(wave,'x').to)) throw Error('Wait did not follow wave');
                if(track(wave,'realistic3DWaveCycles').to!==0) throw Error('Waypoint wave pace carried into the next action');
                const heading=track(turn,'realistic3DTurn'), absolute=id==='amaka';
                if(absolute){
                    const audio=app.audioTimeline.tracks.find(t=>t.audioId==='doorway-line');
                    if(Math.abs(audio.timelineStartMs-(end(turn)-3500))>1) throw Error('Speech not aligned to arrival');
                    const caption=app.objects.objects.find(o=>o.captionAudioId===audio.audioId);
                    if(caption?.segments[0]?.startMs!==audio.timelineStartMs || actor.animations.find(c=>c.id==='doorway-speech').delay!==audio.timelineStartMs)
                        throw Error('Linked lips or caption did not follow speech to the stop');
                    seek(end(turn)-2000);
                    if(!near(actor.realistic3DWave,.5)||!near(actor.realistic3DTurn,135) || !near(actor.x,track(turn,'x').to))
                        throw Error('Wave did not follow turn at the doorway');
                    seek(end(turn)-250);
                    // Incoming yaw is +90. Reach -135 via +135, not a -225 degree spin.
                    if(!near(actor.realistic3D.yaw+actor.realistic3DTurn,225) || !near(heading.to,135)) throw Error('Absolute facing lost during hold');
                }
                if(!absolute){
                    const audio=app.audioTimeline.tracks.find(t=>t.characterId===actor.id);
                    const caps=app.objects.objects.filter(o=>o.captionAudioId===audio?.audioId);
                    const lips=actor.animations.filter(c=>c.type==='audio-lip-sync');
                    if(!audio || audio.sequenceLink || caps.length!==1 || caps[0].segments[0].text!=='Welcome to the clinic.' ||
                        caps[0].captionProfile.textProgression!=='word' || lips.length!==1 || lips[0].delay!==audio.timelineStartMs ||
                        Math.abs(audio.timelineStartMs-(end(turn)+300))>1) throw Error('Generated speech did not start after the turn with its delay');
                }
                seek(end(turn)-(absolute?3000:500));
                if(!near(actor.realistic3DTurn,absolute?67.5:heading.to+45) || !near(actor.x,track(turn,'x').to))
                    throw Error('Waypoint turn did not preserve position');
                if(!near(track(sit,'realistic3DTurn').from,track(turn,'realistic3DTurn').to) || !track(turn,'realistic3DStrollRoute'))
                    throw Error('Departure lost facing or gait');
                const source=StageObject.fromJSON(actor.toJSON()).animations.filter(c=>c.params?.realistic3DAction).map(c=>c.params.realistic3DAction.points[0]);
                if(source.map(p=>p.arrival).join()!==('wave,'+(absolute?'faceBackLeft':'turnLeft')+',sit,sit') || source[2].nextGait!=='jog') throw Error('Save lost waypoint settings');
                app.animations.seekToStart();
                app.objects.select([actor.id]);
                document.getElementById('btn-realistic-3d').click();
            },id);
            await dialog.locator('[data-recorded]:enabled').waitFor();
            const summary=dialog.locator('[data-stop-summary]').nth(1);
            await summary.filter({hasText:'Speech'}).waitFor();
            await summary.click();
            assert.equal(await dialog.getByLabel('Waypoint 2 arrival action').inputValue(),id==='amaka'?'faceBackLeft':'turnLeft');
            if(id==='amaka'){
                assert.equal(await dialog.getByLabel('Waypoint 2 action 2 arrival action').inputValue(),'wave');
                assert.equal(await dialog.getByLabel('Speech audio',{exact:true}).nth(1).inputValue(),'doorway-line');
            }else{
                assert.equal(await dialog.getByLabel('Speech text').nth(1).inputValue(),'Welcome to the clinic.');
            }
            assert.equal(await dialog.getByLabel('Waypoint 3 arrival action').inputValue(),'sit');
            assert.equal(await dialog.getByLabel('Waypoint 3 departure gait').inputValue(),'jog');
            assert.equal(await dialog.locator('[data-wait]').first().inputValue(),'1');
            assert.equal(await dialog.getByLabel('Waypoint 1 action duration in seconds').inputValue(),'4');
            assert.equal(await dialog.locator('[name=seconds]').inputValue(),String(await page.evaluate(id=>{
                const clips=app.objects.objects.find(o=>o.name===id).animations.filter(c=>c.params?.realistic3DAction);
                return Number((clips.reduce((n,c)=>n+c.generated[0].duration,0)/1000).toFixed(3));
            },id)));
            assert.equal(await dialog.locator('[data-action]').innerText(),'Update Timeline Action');
            if(id==='tunde'){
                const row=dialog.locator('.realistic-3d-waypoint').nth(1);
                const before=await row.getByLabel('Speech audio',{exact:true}).inputValue();
                assert.equal(await row.getByLabel('Start speech',{exact:true}).inputValue(),'end');
                const startMs=await page.evaluate(id=>app.audioTimeline.tracks.find(t=>t.audioId===id).timelineStartMs,before);
                assert.equal(await row.locator('[data-speech-window]').textContent(),'Timeline: '+(startMs/1000).toFixed(3)+' s to '+((startMs+3000)/1000).toFixed(3)+' s');
                await row.getByText('Generate speech from text',{exact:true}).click();
                await row.getByLabel('Speech text').fill('Please come inside.');
                await row.locator('[data-speech="refresh"]').click();
                await row.locator('[data-speech="voice"]').selectOption({index:1});
                await row.locator('[data-speech="generate"]').click();
                await row.locator('.sequence-speech-generator:not([open])').waitFor({state:'attached'});
                await dialog.locator('[data-action]').click();
                await dialog.waitFor({state:'detached'});
                assert.deepEqual(await page.evaluate(id=>{
                    const track=app.audioTimeline.tracks.find(t=>t.audioId===id);
                    const actor=app.objects.objects.find(o=>o.id===track.characterId);
                    const caps=app.objects.objects.filter(o=>o.type==='caption'&&o.captionAudioId===id);
                    return [app.audioTimeline.tracks.length,actor.animations.filter(c=>c.type==='audio-lip-sync').length,
                        caps.length,caps[0]?.segments.map(c=>c.text).join(' ')];
                },before),[2,1,1,'Please come inside.']);
            }
            if(await dialog.isVisible()) await dialog.locator('[data-close]').click();
        }
        const popup=page.waitForEvent('popup');
        await page.evaluate(()=>document.getElementById('btn-preview').click());
        const player=await popup, frame=await (await player.locator('iframe').elementHandle()).contentFrame();
        await frame.waitForFunction(()=>document.querySelector('#preview-audio-start button') || (typeof objects!=='undefined' && objects.some(o=>o.realistic3DWave>.01)),null,{timeout:30000});
        const unlock=frame.getByRole('button',{name:'Play with sound'});
        if(await unlock.isVisible()) await unlock.click();
        await frame.waitForFunction(()=>{
            const seen=window.waypointSeen ||= {wave:new Set(),jog:new Set()};
            for(const o of objects.filter(o=>o.realistic3D)){
                if(o.realistic3DWave>.01 && o.realistic3DWave<.99 && !(o.realistic3DSit>.01))seen.wave.add(o.id);
                if(o.realistic3DJogRoute>.01 && o.realistic3DJogRoute<.99)seen.jog.add(o.id);
            }
            return seen.wave.size===2 && seen.jog.size===2;
        },null,{timeout:45000});
        await player.close();
        await checkStandaloneSpeech(page,dialog);
        if(process.argv.includes('--encode')){
            const ms=await page.evaluate(()=>Math.max(...app.objects.objects.filter(o=>o.realistic3D).flatMap(o=>o.animations.map(c=>c.delay+c.generated[0].duration))));
            const dl=page.waitForEvent('download',{timeout:180000});
            await page.evaluate(ms=>app.exporter.exportMediaRecorder('mp4',640,360,12,24,ms),ms);
            await (await dl).saveAs('tmp/realistic-3d-arrival-route.mp4');
            assert.ok(fs.statSync('tmp/realistic-3d-arrival-route.mp4').size>10000);
        }
        console.log('PASS both rigs: jog flight/contact, waypoint actions, reverse seeks, auto-stand, saved route editing');
    } finally { await page.close(); }
}

async function checkStandaloneSpeech(page,dialog){
    const id=await page.evaluate(async()=>{
        const base=app.objects.objects.find(o=>o.realistic3D),json=base.toJSON();
        const obj=StageObject.fromJSON({...json,id:Utils.generateId('obj'),name:'Wave with speech',animations:[]});
        app.objects.addObject(obj);app.objects.select([obj.id]);
        const audio=app.audioTimeline,src=audio.tracks.find(t=>t.audioId==='doorway-line');
        const wav=audio._audioBufferToWavBlob(src.audioBuffer);
        const track=await audio._createLoadedTrack({audioId:'wave-line',characterId:obj.id,fileName:'Wave line',
            mimeType:'audio/wav',dataUrl:await audio._readBlobAsDataUrl(wav),arrayBuffer:await wav.arrayBuffer()});
        audio.tracks.push(track);audio._applyActiveTrack(track);
        Realistic3DLibrary.open(app,obj);
        return obj.id;
    });
    await dialog.locator('[name=action]').selectOption('wave');
    await dialog.locator('[name=seconds]').fill('0.8');
    const speech=dialog.locator('[data-action-speech]');
    await speech.locator('.sequence-speech > summary').click();
    await speech.getByLabel('Speech audio',{exact:true}).selectOption('wave-line');
    await speech.getByLabel('Start speech',{exact:true}).selectOption('before');
    await speech.getByLabel('Speech lead (s)').fill('0.5');
    await speech.getByLabel('Create linked captions').check();
    await speech.getByLabel('Caption text (optional override)').fill('Hello again.');
    await page.waitForFunction(()=>document.querySelector('[data-timing-strip] svg')?.getAttribute('aria-label')===
        'Motion: 0.5 s to 1.3 s; Speech: 0 s to 3 s; Captions: 0 s to 3 s');
    // Capture the stable container; speech analysis replaces its SVG and the
    // dialog may need scrolling before the strip is inside the viewport.
    await dialog.locator('[data-timing-strip]').screenshot({path:'tmp/realistic-3d-action-timing.png'});
    await dialog.locator('[data-preview]').click();
    await page.getByText('Previewing Wave',{exact:true}).waitFor();
    await dialog.getByText('Preview complete.',{exact:true}).waitFor();
    await dialog.locator('[data-action]').click();
    await dialog.waitFor({state:'detached'});
    await page.evaluate(id=>{
        const obj=app.objects.getObjectById(id),clip=obj.animations.find(c=>c.params?.realistic3DAction);
        const p=clip.params.realistic3DAction;
        if(p.motionSeconds!==.8 || p.arrivalSeconds!==.5 || clip.generated[0].duration!==3000 ||
            !obj.animations.some(c=>c.type==='audio-lip-sync' && c.delay===0) ||
            !app.objects.objects.some(o=>o.captionAudioId==='wave-line' && o.segments[0]?.text==='Hello again.'))throw Error('Standalone wait/lead, lip sync or caption was not saved');
        Realistic3DLibrary.open(app,obj,clip.id);
    },id);
    await dialog.locator('[data-recorded]:enabled').waitFor();
    assert.equal(await dialog.locator('[name=seconds]').inputValue(),'0.8');
    await speech.getByLabel('Timing',{exact:true}).selectOption('continue');
    await speech.getByLabel('Start speech',{exact:true}).selectOption('end');
    await speech.getByLabel('Speech delay (s)').fill('0.2');
    await speech.getByLabel('Speech delay (s)').press('Tab');
    await dialog.locator('[data-action]').click();
    await dialog.waitFor({state:'detached'});
    const result=await page.evaluate(id=>{
        const obj=app.objects.getObjectById(id),clip=obj.animations.find(c=>c.params?.realistic3DAction);
        const line=app.audioTimeline.tracks.find(t=>t.audioId==='wave-line');
        const next=Realistic3DLibrary.addAction(app,obj,'sit',1);
        return [clip.generated[0].duration,line.timelineStartMs,next.delay,obj.animations.filter(c=>c.type==='audio-lip-sync').length];
    },id);
    assert.deepEqual(result,[800,1000,800,1]);
    console.log('PASS standalone wave speech: lead-in, same-scale motion/audio/caption strip, stage preview, reopen, after-action speech and overlapping next movement');
}
