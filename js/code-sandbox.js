/* Isolated code may only return a data plan; the stage validates it separately. */
globalThis.CodeSandbox = Object.freeze({
    run(code, context, options = {}) {
        if (typeof code !== 'string' || code.length > 1024 * 1024) return Promise.reject(new Error('Code exceeds 1 MB.'));
        if (options.signal?.aborted) return Promise.reject(new Error('Code preparation cancelled.'));
        const timeoutMs = Math.max(100, Math.min(10000, Number(options.timeoutMs) || 5000));
        return new Promise((resolve, reject) => {
            const frame = document.createElement('iframe');
            frame.hidden = true;
            frame.setAttribute('sandbox', 'allow-scripts');
            frame.setAttribute('aria-hidden', 'true');
            const channel = new MessageChannel();
            let settled = false;
            const finish = (error, value) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                options.signal?.removeEventListener('abort', cancel);
                channel.port1.postMessage({ cancel: true });
                channel.port1.close();
                frame.remove();
                error ? reject(error) : resolve(value);
            };
            const cancel = () => finish(new Error('Code preparation cancelled. Nothing was applied.'));
            const timer = setTimeout(() => finish(new Error('Code preparation timed out. Nothing was applied.')), timeoutMs);
            options.signal?.addEventListener('abort', cancel, { once: true });
            // The opaque frame's CSP is inherited by its Blob worker. The parent
            // remains responsive even when user code loops indefinitely.
            const bootstrap = function () {
                addEventListener('message', function receive(event) {
                    if (event.source !== parent || !event.ports[0]) return;
                    removeEventListener('message', receive);
                    const port = event.ports[0];
                    let worker, url;
                    const cleanup = () => { worker?.terminate(); if (url) URL.revokeObjectURL(url); };
                    port.onmessage = event => { if (event.data?.cancel) cleanup(); };
                    try {
                        url = URL.createObjectURL(new Blob([event.data.workerSource], { type: 'text/javascript' }));
                        worker = new Worker(url);
                        worker.onmessage = event => { cleanup(); port.postMessage(event.data); };
                        worker.onerror = () => { cleanup(); port.postMessage({ error: 'Isolated code failed.' }); };
                        worker.postMessage({ code: event.data.code, context: event.data.context });
                    } catch (error) { cleanup(); port.postMessage({ error: String(error.message || error) }); }
                });
            };
            const workerMain = function () {
                onmessage = async event => {
                    const send = postMessage.bind(self);
                    try {
                        const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
                        const result = await new AsyncFunction('stage', '"use strict";\n' + event.data.code)(event.data.context);
                        const json = JSON.stringify(result);
                        if (typeof json !== 'string' || json.length > 1024 * 1024) throw new Error('Return an action plan no larger than 1 MB.');
                        send({ json });
                    } catch (error) { send({ error: String(error.message || error).slice(0, 500) }); }
                };
            };
            channel.port1.onmessage = event => {
                const data = event.data;
                if (typeof data?.error === 'string') return finish(new Error(data.error.slice(0, 500)));
                if (typeof data?.json !== 'string' || data.json.length > 1024 * 1024) return finish(new Error('Invalid isolated result.'));
                try { finish(null, JSON.parse(data.json)); } catch { finish(new Error('Invalid isolated JSON result.')); }
            };
            frame.onload = () => {
                if (settled) return;
                frame.contentWindow.postMessage({ code, context, workerSource: `(${workerMain.toString()})();` }, '*', [channel.port2]);
            };
            frame.srcdoc = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' blob:; worker-src blob:; connect-src 'none'; child-src blob:"><script>(${bootstrap.toString()})();<\/script>`;
            document.body.appendChild(frame);
        });
    }
});
