/* Local project exchange. No accounts, network transfer, or automatic conversion. */
(function (global) {
    'use strict';
    const types = new Set(('rectangle circle triangle star polygon line text image path diamond heart arrow doubleArrow curvedArrow scribble freeform icon caption symbol roundedRectangle parallelogram trapezium hexagon heptagon pie chord teardrop lShape can plaque cube doughnut blockArc brace bracket bentArrow uTurnArrow quadArrow upDownArrow upArrowCallout elbowArrowConnector').split(' '));
    const producer = Object.freeze({ studio: '3d', version: '0.1.0', exchangeVersion: 1 });
    const config = Object.freeze({ studio2DUrl: 'https://animationstage.com/', hostedServices: false, ...global.STUDIO3D_CONFIG });

    function inspect(data, target = '3d') {
        const issues = [], counts = { scenes: 0, objects: 0, actors3D: 0, audio: 0, captions: 0 };
        const add = (severity, message) => issues.push({ severity, message });
        if (data.version && data.version !== '1.0.0') add('warning', `Project version ${data.version} has not been verified with this studio.`);
        if (data.producer?.exchangeVersion > 1) add('error', 'This project requires a newer Studio Exchange version.');
        if (data.producer?.studio !== '3d') add('warning', 'This project comes from 2D or an unidentified studio. Open a copy and review playback before saving.');
        const scenes = data.scenes?.length ? data.scenes : [{ objects: data.objects || [], stageData: data.stage, audioTrack: data.audio, symbols: data.symbols }];
        counts.scenes = scenes.length;
        const seenRefs = new Set();
        function scan(value, where) {
            if (!value || typeof value !== 'object') return;
            for (const [key, entry] of Object.entries(value)) {
                if (typeof entry === 'string' && /(?:src|url)$/i.test(key) && entry && !entry.startsWith('data:')) {
                    const identity = where + ':' + entry;
                    if (seenRefs.has(identity)) continue;
                    seenRefs.add(identity);
                    if (/^(?:blob:|file:)/i.test(entry)) add('warning', `${where}: temporary or device-local media must be embedded or replaced before transfer.`);
                    else if (/^\/?assets\//i.test(entry) && !/^\/?assets\/(?:realistic-3d\/(?:amaka|tunde)\.glb|icon-(?:192|512)\.svg)(?:[?#]|$)/i.test(entry)) add('warning', `${where}: referenced catalogue artwork is not bundled in this 3D studio. Embed it in the source project.`);
                    else if (!/^\/?assets\/realistic-3d\//i.test(entry)) add('warning', `${where}: linked media depends on its original location; embed it for a portable copy.`);
                } else if (entry && typeof entry === 'object') scan(entry, where);
            }
        }
        scenes.forEach((scene, index) => {
            const where = `Scene ${index + 1}`;
            function object(obj, location) {
                counts.objects++;
                if (!types.has(obj.type)) add('error', `${location}: unsupported object type "${obj.type}". Opening would risk losing its appearance.`);
                if (obj.realistic3D) {
                    counts.actors3D++;
                    if (obj.type !== 'image' || !['amaka', 'tunde'].includes(obj.realistic3D.id)) add('error', `${location}: unsupported 3D character preset.`);
                } else if (obj.type === 'image' && !obj.imageSrc && !obj.src) add('warning', `${location}: image artwork is missing.`);
                if (obj.svgAvatar || obj.svgCharacter) add('warning', `${location}: 2D character editing depends on artwork and rig features; verify its appearance and animation.`);
                if (obj.type === 'caption') counts.captions++;
                if (obj.type === 'symbol' && !scene.symbols?.library?.[obj.symbolId]) add('warning', `${location}: symbol definition could not be located.`);
            }
            (scene.objects || []).forEach((obj, i) => object(obj, `${where}, object ${i + 1}`));
            for (const [id, symbol] of Object.entries(scene.symbols?.library || {})) {
                (symbol.items || []).forEach((obj, i) => object(obj, `${where}, symbol ${id}, item ${i + 1}`));
            }
            const audio = scene.audioTrack;
            counts.audio += audio?.tracks?.length || (audio?.dataUrl ? 1 : 0);
            const ids = new Set((scene.objects || []).map(obj => obj.id));
            for (const track of audio?.tracks || []) {
                if (track.characterId && !ids.has(track.characterId)) add('warning', `${where}: audio references a missing character.`);
                if (!track.dataUrl || track.hasAudio !== true) add('warning', `${where}: an audio track lacks its media or required audio flag and cannot be restored.`);
            }
            for (const obj of scene.objects || []) if (obj.type === 'caption' && obj.captionAudioId && !(audio?.tracks || []).some(track => track.audioId === obj.captionAudioId)) add('warning', `${where}: caption references a missing audio track.`);
            scan(scene, where);
        });
        if (target === '2d' && counts.actors3D) add('warning', 'This copy contains 3D characters. The destination 2D studio must support these presets and actions; they are not converted to 2D artwork.');
        if (counts.actors3D) add('info', 'Amaka and Tunde models are loaded separately. HTML playback also needs access to the exporting studio’s model assets.');
        add('info', 'Compatibility checks do not certify identical playback. Review audio, captions, timing, and rendering in the destination studio.');
        return { target, counts, issues, blocked: issues.some(issue => issue.severity === 'error') };
    }

    function reportText(report) {
        const c = report.counts;
        return `${c.scenes} scenes · ${c.objects} objects · ${c.actors3D} 3D characters · ${c.audio} audio tracks · ${c.captions} captions`;
    }
    function dialog(title, report) {
        const element = document.createElement('dialog'); element.className = 'studio-exchange';
        const heading = document.createElement('h2'); heading.textContent = title;
        const summary = document.createElement('p'); summary.textContent = reportText(report);
        const list = document.createElement('ul');
        for (const issue of report.issues.slice(0, 100)) {
            const item = document.createElement('li'); item.dataset.severity = issue.severity; item.textContent = issue.message; list.append(item);
        }
        if (report.issues.length > 100) { const item = document.createElement('li'); item.textContent = `${report.issues.length - 100} additional notices. Download the report to review all notices.`; list.append(item); }
        const actions = document.createElement('div'); actions.className = 'studio-exchange-actions';
        element.append(heading, summary, list, actions); document.body.append(element);
        element.setAttribute('aria-label', title);
        return { element, actions };
    }
    function button(actions, text, callback) {
        const b = document.createElement('button'); b.type = 'button'; b.textContent = text; b.addEventListener('click', callback); actions.append(b); return b;
    }
    function confirmImport(report) {
        return new Promise(resolve => {
            const { element, actions } = dialog('Review project before opening', report);
            let finished = false;
            const finish = accepted => { if (finished) return; finished = true; element.close(); element.remove(); resolve(accepted); };
            button(actions, 'Cancel', () => finish(false));
            button(actions, 'Download report', () => global.app.exporter.downloadBlob(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }), 'project-compatibility.json'));
            if (!report.blocked) button(actions, 'Open a copy', () => finish(true));
            element.addEventListener('cancel', event => { event.preventDefault(); finish(false); });
            element.showModal();
        });
    }
    function open() {
        const exporter = global.app?.exporter; if (!exporter) return;
        const data = exporter.serializeProject(), report = inspect(data, '2d');
        const { element, actions } = dialog('Studio Exchange', report);
        const note = document.createElement('p'); note.textContent = 'Download a project copy, then open it using File > Load in Animation Stage 2D. Login, browser autosaves, and cloud projects do not transfer.';
        actions.before(note);
        button(actions, 'Close', () => element.close());
        button(actions, 'Download compatibility report', () => exporter.downloadBlob(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }), 'project-compatibility.json'));
        const download = button(actions, 'Download handoff copy', () => {
            exporter.downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), `${exporter.sanitizeFilename(exporter.projectName)}-handoff.animstage`);
        }); download.disabled = report.blocked;
        const link = document.createElement('a'); link.textContent = 'Open 2D Studio'; link.href = config.studio2DUrl; link.target = '_blank'; link.rel = 'noopener noreferrer'; actions.append(link);
        element.addEventListener('close', () => element.remove(), { once: true }); element.showModal();
    }
    global.StudioExchange = Object.freeze({ producer, config, inspect, confirmImport, open });
    function bind() {
        document.getElementById('btn-studio-exchange')?.addEventListener('click', open);
        const link = document.getElementById('studio-2d-link'); if (link) link.href = config.studio2DUrl;
    }
    // This script also loads after DOMContentLoaded in the sequential editor loader.
    if (document.readyState !== 'loading') bind();
    else document.addEventListener('DOMContentLoaded', bind, { once: true });
})(globalThis);
