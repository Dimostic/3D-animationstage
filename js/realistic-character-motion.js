/* Optional inspector. Load after app.js and the realistic-character/armature scripts. */
(function (global) {
    'use strict';
    const clone = value => structuredClone(value);
    const clamp = value => Math.max(0, Math.min(1, Number(value) || 0));

    function open(app, config) {
        if (!app?._createSvgAfricanBuilderMotionSandbox || !global.RealisticCharacter) {
            throw new Error('The character builder and RealisticCharacter must be loaded first.');
        }
        const source = clone(config);
        const data = global.RealisticCharacter.normalize(source?._realisticCharacter || source);
        if (!data) throw new Error('A valid realistic character configuration is required.');
        const views = global.RealisticCharacter.views.filter(view => data.views[view]);
        const dialog = document.createElement('dialog');
        dialog.className = 'rc-motion';
        dialog.setAttribute('aria-label', 'Character motion');
        dialog.innerHTML = `<style>
            .rc-motion{box-sizing:border-box;margin:auto;width:min(900px,96vw);max-width:96vw;max-height:94dvh;padding:16px;border:1px solid #939b99;border-radius:8px;background:#fff;color:#252c2a;font:14px Arial,sans-serif;letter-spacing:0}
            .rc-motion::backdrop{background:#0008}
            .rc-motion header,.rc-motion nav{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
            .rc-motion header{justify-content:space-between;margin-bottom:12px}
            .rc-motion h2{font-size:18px;margin:0}
            .rc-motion label{display:grid;gap:4px;min-width:0;flex:1 1 150px}
            .rc-motion select{width:100%;min-width:0;height:34px;color:inherit;background:#fff;border:1px solid #a8b2ae;border-radius:4px}
            .rc-motion button{width:36px;height:36px;flex:0 0 36px;border:1px solid #a8b2ae;border-radius:4px;background:#f3f6f4;color:#244b3e;cursor:pointer}
            .rc-motion button:disabled{opacity:.4;cursor:default}
            .rc-motion .rcm-surface{height:min(54dvh,510px);min-height:160px;margin:12px 0;background:#edf0f1;overflow:hidden}
            .rc-motion canvas{display:block;width:100%;height:100%}
            .rc-motion input{min-width:60px;flex:1;accent-color:#267054}
            .rc-motion output{display:block;min-height:20px;margin-top:8px;overflow-wrap:anywhere}
        </style><header><h2>Character motion</h2><button data-action="close" aria-label="Close" title="Close"><i class="fas fa-times" aria-hidden="true"></i></button></header>
        <nav aria-label="Motion selection"><label>View<select name="view"></select></label><label>Pose<select name="pose"></select></label><label>Walk movement<select name="movement"></select></label></nav>
        <nav aria-label="Joint inspection"><label>Joint check<select name="joint"><option value="">None</option></select></label><label>Bend angle<input name="bend" aria-label="Bend angle" type="range" min="-150" max="150" step="1" value="0"></label><span data-bend-value>0 degrees</span></nav>
        <div class="rcm-surface"><canvas role="img" aria-label="Character motion preview"></canvas></div>
        <nav aria-label="Playback"><button data-action="play" title="Play" aria-label="Play"><i class="fas fa-play" aria-hidden="true"></i></button><button data-action="pause" title="Pause" aria-label="Pause"><i class="fas fa-pause" aria-hidden="true"></i></button><button data-action="reset" title="Reset" aria-label="Reset"><i class="fas fa-undo" aria-hidden="true"></i></button><input name="progress" aria-label="Motion progress" type="range" min="0" max="1" step="0.001" value="0"></nav><output role="status" aria-live="polite">Loading...</output>`;
        const $ = selector => dialog.querySelector(selector);
        const viewSelect = $('[name=view]'), poses = $('[name=pose]'), moves = $('[name=movement]');
        const slider = $('[name=progress]'), status = $('output'), surface = $('.rcm-surface');
        const canvas = $('canvas');
        const jointSelect = $('[name=joint]'), bend = $('[name=bend]');
        let jointTargets = [];
        views.forEach(view => viewSelect.add(new Option(view.replaceAll('-', ' '), view)));
        viewSelect.value = views.includes(source.styling?.view || source.view) ? source.styling?.view || source.view : views[0];
        let state = { sandbox: null }, generation = 0, closed = false, playing = false;
        let raf = 0, lastTime = null, progress = 0, definition = null, poseCatalog = {}, movementCatalog = {};
        let drawing = false;
        const controls = () => {
            const ready = !!state.sandbox?.ready;
            poses.disabled = moves.disabled = !ready;
            jointSelect.disabled = !ready;
            bend.disabled = !ready || !jointSelect.value;
            $('[data-action=play]').disabled = !ready || !definition || playing;
            $('[data-action=pause]').disabled = !playing;
            $('[data-action=reset]').disabled = !ready;
            slider.disabled = !ready || !definition;
        };
        function pause() {
            playing = false;
            cancelAnimationFrame(raf);
            raf = 0; lastTime = null;
            controls();
        }
        function draw() {
            const sandbox = state.sandbox;
            if (closed || !sandbox?.ready || drawing) return;
            drawing = true;
            try {
                const ratio = Math.min(2, global.devicePixelRatio || 1);
                const width = Math.max(1, surface.clientWidth), height = Math.max(1, surface.clientHeight);
                const w = Math.ceil(width * ratio), h = Math.ceil(height * ratio);
                if (canvas.width !== w) canvas.width = w;
                if (canvas.height !== h) canvas.height = h;
                sandbox.pixelRatio = ratio;
                sandbox.targetBounds = { minX: 24, minY: 24, maxX: width - 24, maxY: height - 24 };
                app._renderSvgAfricanBuilderMotionSandbox(sandbox);
            } finally { drawing = false; }
        }
        function seek(value) {
            progress = clamp(value); slider.value = String(progress);
            const s = state.sandbox;
            if (!s?.ready) return;
            const r = s.runtime, rig = s.armature;
            // Always start from the detached idle baseline, making seeks order independent.
            r._applyArmaturePose(rig, clone(poseCatalog.idle || { jointAngles: {} }));
            if (jointSelect.value) {
                const target = jointTargets[Number(jointSelect.value) - 1];
                if (target) target.joint.angle = Number(bend.value);
            } else if (definition) {
                const frames = definition.frames;
                let index = 0;
                while (index < frames.length - 2 && progress > frames[index + 1].t) index++;
                const a = frames[index], b = frames[index + 1];
                const amount = clamp((progress - a.t) / (b.t - a.t || 1));
                const sample = r._interpolateArmatureStrideSample(a, b, amount);
                r._applyArmaturePose(rig, {
                    ...definition.entry, ...sample, jointAngles: sample.angles || sample.jointAngles,
                    attention: r._sampleArmatureAttentionTrack(definition.attention, progress)
                });
                r._syncArmatureGarmentMotion?.(rig, { moveKey: moves.value, cycleT: progress, localT: amount, easedT: amount, dy: sample.dy || 0 });
            } else {
                r._applyArmaturePose(rig, clone(poseCatalog[poses.value] || poseCatalog.idle || { jointAngles: {} }));
            }
            s.manager._resolvePins?.();
            draw();
        }
        function fail(error) {
            pause();
            status.textContent = error.message || 'Motion preview unavailable.';
        }
        function choose() {
            pause(); definition = null;
            try {
                const s = state.sandbox;
                if (!s?.ready) return;
                const r = s.runtime, rig = s.armature;
                if (moves.value) {
                    const key = moves.value;
                    const entry = clone(r._getDecoratedArmatureMovementEntry(key, movementCatalog[key], rig));
                    const raw = r._buildArmatureWalkPlaybackSampleFrames(key, entry, entry.keyframes, rig, poseCatalog);
                    const frames = raw.map((frame, index) => ({
                        ...r._resolveArmatureKeyframe(frame, rig, poseCatalog),
                        t: Number.isFinite(frame.t) ? frame.t : index / (raw.length - 1)
                    })).sort((a, b) => a.t - b.t);
                    definition = { entry, frames, duration: Math.max(100, Number(entry.duration) || 1800),
                        attention: r._getArmatureMovementAttentionTrack(key, entry, rig) };
                }
                seek(0);
                status.textContent = definition?.entry.name || poseCatalog[poses.value]?.name || 'Ready';
            } catch (error) { definition = null; fail(error); }
            controls();
        }
        function inspectJoint() {
            pause(); definition = null;
            moves.value = '';
            $('[data-bend-value]').textContent = `${bend.value} degrees`;
            seek(0); controls();
            status.textContent = jointSelect.value ? jointSelect.selectedOptions[0].textContent : 'Ready';
        }
        function play() {
            if (closed || !definition || !state.sandbox?.ready || playing) return;
            playing = true; lastTime = null; controls();
            const tick = time => {
                if (!playing || closed) return;
                try {
                    const delta = lastTime === null ? 0 : time - lastTime;
                    lastTime = time;
                    seek((progress + delta / definition.duration) % 1);
                    raf = requestAnimationFrame(tick);
                } catch (error) { fail(error); }
            };
            raf = requestAnimationFrame(tick);
        }
        async function loadView() {
            const token = ++generation;
            pause(); definition = null;
            jointTargets = []; jointSelect.replaceChildren(new Option('None', '')); bend.value = '0';
            $('[data-bend-value]').textContent = '0 degrees';
            app._disposeSvgAfricanBuilderMotionSandbox(state);
            const local = { sandbox: null }; state = local;
            controls(); status.textContent = 'Loading...'; dialog.setAttribute('aria-busy', 'true');
            try {
                const view = viewSelect.value;
                const candidate = source._realisticCharacter ? clone(source) : global.RealisticCharacter.config(clone(data), view);
                candidate._realisticCharacter = clone(data);
                candidate.view = view; candidate.sideFacing = view.endsWith('left') ? 'left' : 'right';
                candidate.styling = { ...candidate.styling, view, sideFacing: candidate.sideFacing };
                const normalized = global.SvgAfricanCharacterCatalog.normalizeConfig(candidate);
                const loader = global.SvgAfricanAuthoredArtworkLoader;
                const assetId = app._resolveSvgAfricanAuthoredAssetId(normalized);
                if (assetId && loader?.ensureLoaded && !loader.isLoaded?.(assetId)) await loader.ensureLoaded({ assetId, reason: 'realistic-motion' });
                if (closed || token !== generation) return false;
                local.sandbox = app._createSvgAfricanBuilderMotionSandbox(local, { config: normalized });
                const s = local.sandbox;
                if (!s || !await app._waitForSvgAfricanBuilderMotionImages(s, 10000)) throw new Error('Character artwork could not be loaded.');
                if (closed || token !== generation) return false;
                s.manager._resolvePins?.();
                s.stageBounds = app._getSvgAfricanBuilderMotionBounds(s.manager.objects);
                if (!s.stageBounds) throw new Error('Character bounds are unavailable.');
                s.canvas = canvas; s.host = surface; s.ready = true;
                // Disposal removes its canvas; reconnect the inspector-owned canvas on rebuild.
                surface.replaceChildren(canvas);
                poseCatalog = clone(s.runtime._getActiveArmaturePoseCatalog(s.armature));
                movementCatalog = clone(s.runtime._getActiveArmatureMovementCatalog(s.armature));
                for (const [role, part] of Object.entries(s.armature.parts)) {
                    const obj = part.obj || part.raw;
                    for (const joint of obj?.joints || []) {
                        if (!/(?:^|-)(elbow|knee|wrist|ankle)$/.test(joint.name)) continue;
                        jointTargets.push({ joint });
                        jointSelect.add(new Option(`${role.replaceAll('-', ' ')}: ${joint.name.replaceAll('-', ' ')}`, String(jointTargets.length)));
                    }
                }
                poses.replaceChildren(); moves.replaceChildren(new Option('None', ''));
                Object.entries(poseCatalog).filter(([key, entry]) =>
                    s.runtime._armaturePoseMatchesCurrentView(s.armature, { ...entry, key })
                ).forEach(([key, entry]) => poses.add(new Option(entry.name || key, key)));
                Object.entries(movementCatalog).filter(([key, entry]) =>
                    entry.keyframes?.length >= 2 && !entry.turnAround && !entry.frontBackTurnAround && !entry.flipInPlace
                    && s.runtime._armatureMovementMatchesCurrentView(s.armature, { ...entry, key })
                    && s.runtime._isArmatureWalkStrideMovement(key, entry)
                ).forEach(([key, entry]) => moves.add(new Option(entry.name || key, key)));
                poses.value = poseCatalog.idle ? 'idle' : poses.options[0]?.value || '';
                choose();
                s.stage.requestRender = draw;
                return true;
            } catch (error) {
                app._disposeSvgAfricanBuilderMotionSandbox(local);
                if (!closed && token === generation) fail(error);
                return false;
            } finally {
                if (!closed && token === generation) { dialog.removeAttribute('aria-busy'); controls(); }
            }
        }
        const observer = new ResizeObserver(draw);
        function containKeys(event) {
            if (!dialog.open || [...document.querySelectorAll('dialog[open]')].at(-1) !== dialog) return;
            // Rebuilding a select may temporarily focus body, outside the dialog subtree.
            event.stopImmediatePropagation();
            if (event.key === 'Escape' && event.type === 'keydown') { event.preventDefault(); close(); }
        }
        ['keydown', 'keyup', 'keypress'].forEach(type => global.addEventListener(type, containKeys, true));
        function close() {
            if (closed) return;
            closed = true; generation++; pause(); observer.disconnect();
            ['keydown', 'keyup', 'keypress'].forEach(type => global.removeEventListener(type, containKeys, true));
            app._disposeSvgAfricanBuilderMotionSandbox(state);
            if (dialog.open) dialog.close();
            dialog.remove();
        }
        dialog.addEventListener('close', close);
        // Editor shortcuts must not observe inspector keys (notably Escape/Delete).
        ['keydown', 'keyup', 'keypress'].forEach(type => dialog.addEventListener(type, event => event.stopPropagation()));
        dialog.addEventListener('cancel', event => { event.preventDefault(); event.stopPropagation(); close(); });
        $('[data-action=close]').onclick = close;
        $('[data-action=play]').onclick = play;
        $('[data-action=pause]').onclick = pause;
        function reset() { pause(); bend.value = '0'; $('[data-bend-value]').textContent = '0 degrees'; seek(0); }
        $('[data-action=reset]').onclick = reset;
        slider.oninput = () => { pause(); try { seek(slider.value); } catch (error) { fail(error); } };
        poses.onchange = () => { jointSelect.value = ''; moves.value = ''; choose(); };
        moves.onchange = () => { jointSelect.value = ''; choose(); };
        jointSelect.onchange = () => { bend.value = '0'; inspectJoint(); };
        bend.oninput = inspectJoint;
        viewSelect.onchange = () => { controller.ready = loadView(); };
        document.body.append(dialog); dialog.showModal(); observer.observe(surface);
        const controller = { dialog, close, play, pause, seek, reset, ready: null };
        controller.ready = loadView();
        return controller;
    }
    global.RealisticCharacterMotion = Object.freeze({ open });
})(window);
