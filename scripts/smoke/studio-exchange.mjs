import assert from 'node:assert/strict';
import fs from 'node:fs';

// Synthetic projects exercising the snapshot's file format, not production user files.
export async function checkStudioExchange(page) {
    const result = await page.evaluate(async () => {
        const original = app.exporter.serializeProject();
        const image = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="red"/></svg>');
        const wav = new Uint8Array(16044), view = new DataView(wav.buffer);
        const label = (offset, value) => [...value].forEach((c, i) => { wav[offset + i] = c.charCodeAt(0); });
        label(0, 'RIFF'); view.setUint32(4, 16036, true); label(8, 'WAVE'); label(12, 'fmt ');
        view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
        view.setUint32(24, 8000, true); view.setUint32(28, 16000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
        label(36, 'data'); view.setUint32(40, 16000, true);
        const recording = 'data:audio/wav;base64,' + btoa(String.fromCharCode(...wav));
        const fixture = { format: 'animstage', version: '1.0.0', name: '2D exchange fixture',
            scenes: [{ id: 'first', name: '2D', stageData: { width: 960, height: 540 }, objects: [
                { id: 'shape', type: 'rectangle', x: 20, y: 30, width: 60, height: 80, animations: [{ id: 'move', type: 'fade-in', params: { duration: 2, delay: .5 }, generated: { property: 'opacity', from: 0, to: 1, duration: 2000, easing: 'linear' } }] },
                { id: 'art', type: 'image', imageSrc: image, width: 8, height: 8 },
                { id: 'words', type: 'caption', captionAudioId: 'voice', segments: [{ startMs: 500, endMs: 1500, text: 'Hello stage' }], text: 'Hello stage' }
            ], audioTrack: { tracks: [{ hasAudio: true, audioId: 'voice', characterId: 'art', dataUrl: recording, mimeType: 'audio/wav', fileName: 'fixture.wav', timelineStartMs: 500 }] } },
            { id: 'second', name: '3D', stageData: { width: 960, height: 540 }, objects: [
                { id: 'actor', type: 'image', width: 184, height: 256, realistic3D: { id: 'amaka', yaw: 35, build: .2 }, realistic3DWave: .4 }
            ] }], currentSceneIndex: 0 };
        const copy = JSON.stringify(fixture), checks = [];
        const report = StudioExchange.inspect(fixture);
        checks.push(!report.blocked && report.counts.scenes === 2 && report.counts.actors3D === 1 && report.counts.captions === 1 && report.counts.audio === 1);
        checks.push(StudioExchange.inspect(fixture, '2d').issues.some(i => i.message.includes('not converted')));
        checks.push(JSON.stringify(fixture) === copy);
        for (const invalid of [
            { type: 'future-mesh', id: 'unsupported' },
            { type: 'image', realistic3D: { id: 'unknown-preset' } }
        ]) {
            const bad = structuredClone(fixture); bad.scenes[1].objects.push(invalid);
            const before = app.objects.objects;
            try { app.exporter.deserializeProject(bad); checks.push(false); } catch { checks.push(app.objects.objects === before); }
        }
        const assetCases = ['assets/characters/missing.svg', 'blob:previous-browser', 'https://example.invalid/image.png', 'relative.png'];
        checks.push(assetCases.every(src => StudioExchange.inspect({ objects: [{ type: 'image', imageSrc: src }] }).issues.some(i => /artwork|media/.test(i.message))));
        const future = structuredClone(fixture); future.producer = { studio: '3d', exchangeVersion: 2 };
        checks.push(StudioExchange.inspect(future).blocked);
        const symbol = { objects: [], symbols: { library: { future: { items: [{ type: 'future-object' }] } } } };
        checks.push(StudioExchange.inspect(symbol).blocked);
        globalThis.exchangeFixture = fixture; globalThis.exchangeOriginal = original;
        return checks;
    });
    assert.ok(result.every(Boolean), 'compatibility checks must cover hidden scenes, symbols, media, and unsupported presets without mutating the project');

    // Cancel preserves the current scene; accepting detaches the source file handle.
    await page.evaluate(() => {
        globalThis.exchangeBefore = app.objects.objects;
        globalThis.exchangeLoad = app.exporter._loadProjectFile(new File([JSON.stringify(exchangeFixture)], '2d-original.animstage'), { name: '2d-original.animstage' });
    });
    const review = page.getByRole('dialog', { name: 'Review project before opening' });
    await review.getByRole('button', { name: 'Cancel', exact: true }).click();
    assert.equal(await page.evaluate(async () => { await exchangeLoad; return app.objects.objects === exchangeBefore; }), true);
    await page.evaluate(() => { globalThis.exchangeLoad = app.exporter._loadProjectFile(new File([JSON.stringify(exchangeFixture)], '2d-original.animstage'), { name: '2d-original.animstage' }); });
    await review.getByRole('button', { name: 'Open a copy', exact: true }).click();
    const restored = await page.evaluate(async () => {
        await exchangeLoad;
        const saved = app.exporter.serializeProject();
        const shape = saved.scenes[0].objects.find(o => o.id === 'shape');
        const actor = saved.scenes[1].objects[0];
        return { detached: app.exporter._fileHandle === null, producer: saved.producer.studio,
            scenes: saved.scenes.length, artwork: saved.scenes[0].objects.find(o => o.id === 'art').imageSrc === exchangeFixture.scenes[0].objects[1].imageSrc,
            animation: shape.animations[0].params, actor: actor.realistic3D.id,
            audio: saved.scenes[0].audioTrack.tracks[0],
            caption: saved.scenes[0].objects.find(o => o.id === 'words').segments[0].text };
    });
    assert.equal(restored.detached, true); assert.equal(restored.producer, '3d');
    assert.equal(restored.scenes, 2); assert.equal(restored.artwork, true);
    assert.equal(restored.animation.duration, 2); assert.equal(restored.animation.delay, .5);
    assert.equal(restored.actor, 'amaka'); assert.equal(restored.caption, 'Hello stage');
    assert.equal(restored.audio.audioId, 'voice'); assert.equal(restored.audio.timelineStartMs, 500);
    assert.match(restored.audio.dataUrl, /^data:audio\/wav;base64,/);
    await page.evaluate(() => {
        globalThis.exchangeHandle = { name: 'existing.animstage' }; app.exporter._fileHandle = exchangeHandle;
        StudioExchange.open();
    });
    const panel = page.getByRole('dialog', { name: 'Studio Exchange', exact: true });
    assert.equal(await panel.getByRole('link', { name: 'Open 2D Studio' }).getAttribute('href'), 'https://animationstage.com/');
    const downloadEvent = page.waitForEvent('download');
    await panel.getByRole('button', { name: 'Download handoff copy', exact: true }).click();
    const download = await downloadEvent;
    assert.match(download.suggestedFilename(), /-handoff\.animstage$/);
    const exported = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
    assert.equal(exported.producer.studio, '3d'); assert.equal(exported.scenes.length, 2);
    assert.equal(await page.evaluate(() => app.exporter._fileHandle === exchangeHandle), true);
    await panel.screenshot({ path: 'tmp/studio-exchange-desktop.png' });
    await page.setViewportSize({ width: 390, height: 844 });
    const bounds = await panel.boundingBox(); assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 390);
    await panel.screenshot({ path: 'tmp/studio-exchange-mobile.png' });
    await page.setViewportSize({ width: 1280, height: 900 });
    await panel.getByRole('button', { name: 'Close', exact: true }).click();
    await page.evaluate(async () => {
        app.exporter.deserializeProject(exchangeOriginal); await app.exporter._projectLoadReady;
        app.exporter._fileHandle = null;
    });
    assert.equal(await page.locator('a[href="index.php"], a[href="logout.php"], a[href="smartart.html"]').count(), 0);
    assert.equal(await page.locator('#btn-stage-feedback').isVisible(), false);
    await page.evaluate(() => {
        const unsupported = { format: 'animstage', objects: [{ id: 'new', type: 'future-object' }] };
        globalThis.exchangeBefore = app.objects.objects;
        globalThis.exchangeLoad = app.exporter._loadProjectFile(new File([JSON.stringify(unsupported)], 'unsupported.animstage'), null);
    });
    await review.waitFor({ state: 'visible' });
    assert.equal(await review.getByRole('button', { name: 'Open a copy', exact: true }).count(), 0);
    await review.getByRole('button', { name: 'Cancel', exact: true }).click();
    assert.equal(await page.evaluate(async () => { await exchangeLoad; return app.objects.objects === exchangeBefore; }), true);
    assert.equal(await page.evaluate(async () => {
        const data = { format: 'animstage', version: '1.0.0', producer: StudioExchange.producer, objects: [] };
        const handle = { name: 'native-3d.animstage' };
        await app.exporter._loadProjectFile(new File([JSON.stringify(data)], handle.name), handle);
        const retained = app.exporter._fileHandle === handle;
        app.exporter.deserializeProject(exchangeOriginal); await app.exporter._projectLoadReady;
        return retained;
    }), true);
    assert.equal(await page.evaluate(() => StudioExchange.config.hostedServices), false);
    assert.equal(await page.evaluate(() => {
        const section = document.createElement('section');
        JointSystem.prototype._mountSequenceSpeechGenerator(section, {}, {}, () => {});
        return section.textContent.includes('Upload a recording') && !section.querySelector('button');
    }), true);
    console.log('PASS Studio Exchange: review/cancel, copy protection, mixed scenes, embedded artwork, captions, timing, handoff download, unsupported data and legacy links');
}
