globalThis.RecordingReplay = Object.freeze({
    actionPlan(evidence) {
        const entries = evidence?.replayPlans || [];
        if (!Array.isArray(entries)) throw new Error('Invalid replay plans.');
        const actions = [];
        for (const entry of entries) {
            if (entry?.plan?.format !== 'animstage-actions' || entry.plan.version !== 1 || !Array.isArray(entry.plan.actions)) throw new Error('Invalid replay plan format.');
            if (actions.length + entry.plan.actions.length > 1000) throw new Error('Replay exceeds 1000 actions.');
            actions.push(...entry.plan.actions);
        }
        if (!actions.length) return null;
        const text = JSON.stringify({ format: 'animstage-actions', version: 1, actions });
        if (text.length > 1024 * 1024) throw new Error('Replay plan exceeds 1 MB.');
        return JSON.parse(text);
    },
    snapshot(exporter) {
        const text = JSON.stringify(exporter.serializeProject());
        if (text.length > 64 * 1024 * 1024) throw new Error('Project snapshot exceeds 64 MB.');
        return JSON.parse(text);
    },
    async archive(start, end, evidence, options = {}) {
        if (!start || !end) throw new Error('Enable Project capture before recording, then stop recording first.');
        const projectStart = JSON.parse(JSON.stringify(start)), projectEnd = JSON.parse(JSON.stringify(end));
        const references = new Map(), manifest = [];
        const collect = value => {
            if (!value || typeof value !== 'object') return;
            for (const [key, child] of Object.entries(value)) {
                const mediaKey = /^(imageSrc|textureImageSrc|audioSrc|audioDataUrl|videoSrc|dataUrl|src)$/.test(key);
                const mediaTrack = /^(imageSrc|textureImageSrc)$/.test(value.property || value.key || '') && /^(from|to|value)$/.test(key);
                if (typeof child === 'string' && (mediaKey || mediaTrack) && child && !child.startsWith('data:')) {
                    const entries = references.get(child) || [];
                    entries.push({ object: value, key }); references.set(child, entries);
                } else if (child && typeof child === 'object') collect(child);
            }
        };
        collect(projectStart); collect(projectEnd);
        let totalBytes = 0;
        const deadline = Date.now() + 120000;
        for (const [src, entries] of references) {
            if (options.signal?.aborted) throw new Error('Replay bundle cancelled.');
            const record = { source: src, embedded: false }; manifest.push(record);
            try {
                if (Date.now() >= deadline || totalBytes >= 64 * 1024 * 1024) throw new Error('Media embedding budget reached.');
                const url = new URL(src, location.href);
                if (url.protocol !== 'blob:' && (url.origin !== location.origin || !/^https?:$/.test(url.protocol))) throw new Error('External asset retained as a reference.');
                const controller = new AbortController();
                const cancel = () => controller.abort();
                options.signal?.addEventListener('abort', cancel, { once: true });
                const timer = setTimeout(cancel, Math.min(15000, Math.max(1, deadline - Date.now())));
                try {
                    const response = await fetch(url, { credentials: 'same-origin', signal: controller.signal, redirect: 'error' });
                    if (!response.ok) throw new Error(`Asset request failed (${response.status}).`);
                    const type = (response.headers.get('Content-Type') || '').split(';')[0];
                    if (!/^(image|audio|video)\//.test(type)) throw new Error('Not an embeddable media response.');
                    const reader = response.body.getReader(), chunks = [];
                    let bytes = 0;
                    try {
                        while (true) {
                            const { value, done } = await reader.read(); if (done) break;
                            bytes += value.byteLength; totalBytes += value.byteLength;
                            if (bytes > 32 * 1024 * 1024 || totalBytes > 64 * 1024 * 1024) throw new Error('Media embedding limit reached.');
                            chunks.push(value);
                        }
                    } catch (error) { await reader.cancel(); throw error; }
                    const blob = new Blob(chunks, { type });
                    const data = await new Promise((resolve, reject) => {
                        const reader = new FileReader(); reader.onload = () => resolve(reader.result);
                        reader.onerror = () => reject(new Error('Media conversion failed.')); reader.readAsDataURL(blob);
                    });
                    for (const entry of entries) entry.object[entry.key] = data;
                    Object.assign(record, { embedded: true, bytes, type });
                } finally { clearTimeout(timer); options.signal?.removeEventListener('abort', cancel); }
            } catch (error) { record.reason = String(error.message || error); }
        }
        if (options.signal?.aborted) throw new Error('Replay bundle cancelled.');
        const startText = JSON.stringify(projectStart), endText = JSON.stringify(projectEnd), evidenceText = JSON.stringify(evidence);
        if (startText.length + endText.length + evidenceText.length > 128 * 1024 * 1024) throw new Error('Replay bundle exceeds 128 MB.');
        const zip = new JSZip();
        zip.file('start.animstage', startText); zip.file('end.animstage', endText);
        zip.file('property-evidence.json', evidenceText);
        const plan = this.actionPlan(evidence);
        if (plan) zip.file('replay-actions.json', JSON.stringify(plan, null, 2));
        zip.file('replay-scope.json', JSON.stringify({ version: 1, executablePlan: plan ? 'replay-actions.json' : null,
            targetIds: [...new Set(plan?.actions.map(action => action.target) || [])],
            instructions: 'Restore start.animstage, select the listed targets, and apply replay-actions.json in Restricted Actions (JSON) at timeline zero. The normal action validator must validate it before application.',
            limitations: ['Only successful applied numeric Code Mode plans are replayed. Test runs, other edits, generated gestures and arbitrary JavaScript are not replayed.',
                'Replay is not guaranteed to reproduce end.animstage when other edits occurred or targets were created after recording began.'],
            notices: evidence?.replayNotices || [] }, null, 2));
        zip.file('media-manifest.json', JSON.stringify({ version: 1, scope: 'Recognized project media fields and image/texture property tracks; embedded SVG/CSS references are not inspected.', complete: manifest.every(item => item.embedded), assets: manifest }, null, 2));
        const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' }, () => {
            if (options.signal?.aborted) throw new Error('Replay bundle cancelled.');
        });
        if (options.signal?.aborted) throw new Error('Replay bundle cancelled.');
        return { blob, manifest,
            incomplete: manifest.filter(item => !item.embedded).length };
    }
});
