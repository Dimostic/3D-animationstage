/* Dialogue owns only its linked audio, captions and performance clips. */
(() => {
    'use strict';
    const clone = value => JSON.parse(JSON.stringify(value));
    const id = prefix => Utils.generateId(prefix);
    const clamp = (value, min, max, fallback) => Number.isFinite(Number(value)) ? Math.max(min, Math.min(max, Number(value))) : fallback;
    const signature = (turn, actor) => JSON.stringify([turn.text, actor?.voice, turn.delivery, turn.speed,
        ...(turn.language && turn.language !== 'en' ? [turn.language] : [])]);
    // Pin resolution can introduce subpixel floating-point noise between snapshots.
    const comparable = snapshot => JSON.stringify(snapshot, (key, value) => key === 'thumbnail' ? undefined
        : typeof value === 'number' && Number.isFinite(value) ? Number(value.toFixed(6)) : value);

    class ConversationTemplates {
        static languages = { en: 'English', ha: 'Hausa', ig: 'Igbo', yo: 'Yoruba' };
        speechProvider(data = this.current()?.conversation) { return ['openai','azure','elevenlabs','ttsmaker','browser'].includes(data?.speechProvider) ? data.speechProvider : 'local'; }
        localVoice(actor) { return actor?.localVoice || ({ onyx: 'libri-0', echo: 'libri-1', fable: 'libri-0' }[actor?.voice] || 'lj'); }
        selectedVoice(actor, provider = this.speechProvider()) {
            return provider === 'local' ? this.localVoice(actor) : provider === 'azure' ? actor?.azureVoice || 'en-NG-EzinneNeural'
                : provider === 'browser' ? actor?.browserVoice || '' : provider==='ttsmaker'?actor?.ttsmakerVoice || '':provider==='elevenlabs'?actor?.elevenVoice || '':actor?.voice;
        }
        speechSignature(turn, actor, data = this.current()?.conversation) {
            const provider = this.speechProvider(data);
            if (['azure','browser','elevenlabs','ttsmaker'].includes(provider)) return JSON.stringify([provider+'-v1',turn.text,this.selectedVoice(actor,provider),turn.speed,turn.language || 'en']);
            return this.speechProvider(data) === 'local'
                ? JSON.stringify(['local-piper-v1', turn.text, this.localVoice(actor), turn.speed, turn.language || 'en'])
                : signature(turn, actor);
        }
        needsSpeechGeneration(turn, actor, scene = this.current()) {
            if(this.speechProvider(scene?.conversation)==='browser') return false;
            const tracks = scene === this.current() ? this.app.audioTimeline.tracks : scene?.audioTrack?.tracks || [];
            return turn.source === 'sample'
                || !tracks.some(track => track.audioId === turn.audioId)
                || turn.audioSignature !== this.speechSignature(turn, actor, scene?.conversation);
        }
        async loadSpeechCapabilities() {
            if (globalThis.StudioExchange?.config.hostedServices === false) {
                this.speechCapabilities = null;
                this.speechCapabilitiesError = 'Speech generation is not configured in this studio. Upload audio, or use browser voices for listening only.';
                return false;
            }
            this.speechCapabilitiesError = '';
            for (let attempt = 0; attempt < 2; attempt++) {
                let retryable = true;
                try {
                    const provider = this.speechProvider();
                    const catalogue = ['elevenlabs','ttsmaker'].includes(provider);
                    const response = await fetch('api/voiceover/dialogue-speech.php'+(catalogue?'?voices='+provider:''), {
                        cache: 'no-store', signal: AbortSignal.timeout(catalogue?30000:12000)
                    });
                    retryable = response.status >= 500;
                    if (response.status === 401) throw new Error('Your session expired. Sign in again to check the voice service.');
                    if (response.status === 429) throw new Error('Too many voice requests. Wait a minute, then check the voice service again.');
                    if (!response.ok) throw new Error(`Voice service check failed (HTTP ${response.status}).`);
                    const data = await response.json();
                    if (typeof data?.providers?.local?.available !== 'boolean'
                        || typeof data?.providers?.openai?.available !== 'boolean') throw new Error('Voice service returned an invalid status. Check the service again.');
                    this.speechCapabilities = data;
                    this.speechCapabilitiesError = '';
                    return true;
                } catch (error) {
                    this.speechCapabilities = null;
                    this.speechCapabilitiesError = error.name === 'TimeoutError' || error.name === 'AbortError'
                        ? 'Voice service check timed out. Check the service again.'
                        : error instanceof TypeError ? 'Cannot reach the voice service. Check your connection and retry.' : error.message;
                    if (!retryable || attempt === 1) return false;
                }
            }
        }
        constructor(app) {
            this.app = app;
            this.templates = [];
            this.saved = [];
            this.audioCache = new Map();
            this.undoStack = [];
            this.redoStack = [];
            this.staging = new ConversationStaging(this);
            this.editor = new ConversationEditor(this);
        }

        async load() {
            if (!this.templates.length) {
                const response = await fetch('assets/conversations/templates.json?v=' + encodeURIComponent(window.__appAssetVersion || ''));
                if (!response.ok) throw new Error('Conversation templates could not be loaded.');
                this.templates = (await response.json()).templates;
            }
            const user = window.__STAGE_USER?.email || 'local';
            this.storageKey = `conversation-templates:${user}`;
            this.saved = await StorageIDB.get('autosaves', this.storageKey).catch(() => []) || [];
            return [...this.templates, ...this.saved];
        }

        current() { return this.app.scenes[this.app.currentSceneIndex]; }
        assertScene(scene) {
            if (this.current() !== scene) throw new Error('The scene changed. Reopen the Dialogue Editor; no audio was replaced.');
            if (this.controller?.signal.aborted) throw new DOMException('Cancelled', 'AbortError');
        }
        snapshot() {
            this.app._saveCurrentScene();
            return { scenes: clone(this.app.scenes), index: this.app.currentSceneIndex };
        }
        async restore(snapshot) {
            this.app.animations.stop();
            this.app.scenes = clone(snapshot.scenes);
            await this.app._loadScene(snapshot.index);
            this.app._scheduleAutosave?.();
        }
        remember(before) {
            this.undoStack.push({ before, after: this.snapshot() });
            if (this.undoStack.length > 6) this.undoStack.shift();
            this.redoStack = [];
        }
        async undo(redo = false) {
            const stack = redo ? this.redoStack : this.undoStack;
            const entry = stack[stack.length - 1];
            if (!entry) return;
            const expected = redo ? entry.before : entry.after;
            if (comparable(this.snapshot()) !== comparable(expected)) {
                throw new Error('The project has other edits. Use the stage Undo controls first to preserve those changes.');
            }
            stack.pop();
            await this.restore(redo ? entry.after : entry.before);
            (redo ? this.undoStack : this.redoStack).push(entry);
        }

        async run(label, work) {
            if (this.busy) return;
            this.busy = true;
            this.controller = new AbortController();
            this.editor.setBusy(true, label);
            const restoring = this.app._isRestoringSnapshot;
            this.app._isRestoringSnapshot = true;
            try { return await work(); }
            finally {
                this.app._isRestoringSnapshot = restoring;
                this.busy = false; this.controller = null;
                this.editor.setBusy(false);
                this.editor.render();
            }
        }

        async blobTrack(blob, name, sceneIndex, audioId = '') {
            if (!(blob instanceof Blob) || blob.size > 20000000) throw new Error('Choose an audio file smaller than 20 MB.');
            const audio = this.app.audioTimeline;
            const track = await audio._createLoadedTrack({ fileName: name, dataUrl: await audio._readBlobAsDataUrl(blob),
                mimeType: blob.type, audioId, arrayBuffer: await blob.arrayBuffer(),
                playScope: 'scene', rangeStartScene: sceneIndex, rangeEndScene: sceneIndex });
            if (!track.audioBuffer || !(track.durationMs > 100) || track.durationMs > 120000) throw new Error('Dialogue audio must be between 0.1 and 120 seconds long.');
            return track;
        }

        async sampleTrack(template, sceneIndex, turnIndex, turn) {
            const key = turn.audio?.dataUrl || `assets/conversations/${template.id}-${sceneIndex}-${turnIndex}.wav`;
            let blob = this.audioCache.get(key);
            if (!blob) {
                const response = await fetch(key, { signal: this.controller?.signal });
                if (!response.ok) throw new Error('Sample audio is unavailable. The template was not inserted.');
                blob = await response.blob();
                this.audioCache.set(key, blob);
            }
            return this.blobTrack(blob, 'Sample dialogue', this.app.currentSceneIndex);
        }

        async create(template) {
            if (template._aiScenePlan) template = AiScenePlan.validate(template, this);
            const before = this.snapshot();
            const empty = this.app.scenes.length === 1 && !this.app.objects.objects.length && !this.app.audioTimeline.tracks.length;
            const start = empty ? 0 : this.app.scenes.length;
            const groupId = id('conversation');
            const plan = clone(template);
            try {
                if (empty) this.app.scenes = [];
                for (let s = 0; s < plan.scenes.length; s++) {
                    this.editor.status(`Creating scene ${s + 1} of ${plan.scenes.length}...`);
                    if (this.controller.signal.aborted) throw new DOMException('Cancelled', 'AbortError');
                    const definition = plan.scenes[s];
                    const scene = { id: id('scene'), name: definition.name, objects: [],
                        stageData: clone(this.app.stage.getStageData()), audioTrack: null,
                        transitionIn: { type: s ? 'fade' : 'none', duration: 400 },
                        conversation: { version: 1, groupId, templateId: plan.id, set: definition.set,
                            audioMode: plan.audioMode === 'generate' ? 'generate' : 'sample',
                            seated: !!definition.seated, captions: definition.captions !== false,
                            captionProgression: ['full','sentence','word','reveal'].includes(definition.captionProgression) ? definition.captionProgression : 'sentence',
                            listening: definition.listening !== false, timing: definition.timing === 'fixed' ? 'fixed' : 'ripple',
                            speechProvider: this.speechProvider(definition),
                            cast: clone(plan.cast), turns: [] } };
                    this.staging.initialize(scene.conversation, definition);
                    // A new scene starts wide; do not inherit the previous scene's camera animation.
                    if (plan._aiScenePlan || definition.camera) {
                        scene.stageData.cameraKeyframes=[];
                        scene.stageData.cameraEnabled=true;
                    }
                    if (plan._aiScenePlan) {
                        scene.conversation.aiActions = clone(definition.actions);
                        scene.conversation.plannedDurationMs = definition.durationSeconds * 1000;
                        scene.conversation.cast.forEach(actor => {
                            if (definition.actions.some(action => action.actor === actor.id)) actor.handsBusy = true;
                        });
                    }
                    this.app._saveCurrentScene();
                    this.app.scenes.push(scene);
                    await this.app._loadScene(this.app.scenes.length - 1);
                    const artwork = BUILTIN_PROP_LIBRARY.scenes.find(item => item.id === definition.set);
                    if (!artwork) throw new Error(`Missing scene set: ${definition.set}`);
                    const set = clone(artwork);
                    set.groundY = 105;
                    if (Array.isArray(definition.propIds)) {
                        const selectedProps = new Set(definition.propIds);
                        set.pieces = set.pieces.filter(piece => selectedProps.has(piece.propId));
                    }
                    const seats = scene.conversation.cast.some(actor => actor.staging.posture === 'seated');
                    set.pieces = set.pieces.filter(piece => !seats || !['office-chair','chair','sofa','bench'].includes(piece.propId))
                        .map(piece => piece.ground ? { ...piece, w: piece.w * .8, h: piece.h * .8 } : piece);
                    this.app.objects._insertScene(set);
                    const W = this.app.stage.width, H = this.app.stage.height;
                    for (let a = 0; a < scene.conversation.cast.length; a++) {
                        const actor = scene.conversation.cast[a];
                        const config = { ...(actor.config || { preset: actor.preset }), name: actor.name,
                            styling: { ...(actor.config?.styling || {}),
                                view: actor.staging.view,
                                threeQuarterArtwork: 'experimental-drawn' } };
                        delete config.view;
                        const asset = config.assetCharacterId || String(actor.preset).replace(/-premium$/, '');
                        if (SvgAfricanAuthoredArtwork.getBundleForAsset(asset)) await SvgAfricanAuthoredArtworkLoader.ensureLoaded({ assetId: asset });
                        const rig = this.app.jointSystem.createSvgAfricanCharacter(config, { ignoreSelectionReference: true });
                        if (!rig?.root) throw new Error(`Could not create ${actor.name}.`);
                        const parts = this.app.jointSystem._getArmatureUniformScaleTargets(rig);
                        const bottom = Math.max(...parts.map(o => o.y + o.height));
                        const top = Math.min(...parts.map(o => o.y));
                        const castSize = scene.conversation.cast.length;
                        const targetHeight = castSize >= 5 ? .48 : castSize === 4 ? .53 : castSize === 3 ? .57 : .61;
                        const identity = rig.root._svgCharacterConfig;
                        const ageScale = identity.ageGroup === 'child' ? .68 : identity.ageGroup === 'teen' ? .88 : 1;
                        const heightScale = Number(identity.heightScale) || 1;
                        this.app.jointSystem._scaleArmatureUniform(rig, H * targetHeight * ageScale * heightScale / (bottom - top), { toast: false, pushHistory: false });
                        const x = W * (scene.conversation.cast.length === 3 ? [.22, .5, .78][a] : [.32, .68][a]);
                        this.app.jointSystem._placeSvgAfricanArmatureAt(rig, { x, y: H * .52 });
                        this.app.jointSystem._captureArmatureStageBasePosition?.(rig);
                        actor.rootId = rig.root.id;
                        actor.config = clone(rig.root._svgCharacterConfig);
                        plan.cast[a].config = clone(actor.config);
                        actor.handsBusy = !!actor.handsBusy;
                        this.app.jointSystem._captureArmatureStageBasePosition?.(rig);
                    }
                    await this.staging.apply(scene.conversation, scene.conversation.cast, true);
                    const tracks = [];
                    for (let t = 0; t < definition.turns.length; t++) {
                        const source = definition.turns[t];
                        const turn = Array.isArray(source) ? { speaker: source[0], text: source[1] } : clone(source);
                        const actor = scene.conversation.cast.find(a => a.id === turn.speaker);
                        if (!actor) throw new Error('A dialogue turn references an unknown speaker.');
                        const track = plan.audioMode === 'generate' ? null : await this.sampleTrack(plan, s, t, turn);
                        this.assertScene(scene);
                        Object.assign(turn, { id: id('turn'), audioId: track?.audioId || '', audioText: track ? turn.text : '',
                            pause: clamp(turn.pause, 0, 10, .45), delivery: turn.delivery || 'natural',
                            speed: clamp(turn.speed, .75, 1.25, 1), gestures: turn.gestures !== false,
                            source: track ? turn.source || 'sample' : 'draft' });
                        turn.audioSignature = track && turn.source !== 'sample' ? this.speechSignature(turn, actor, scene.conversation) : '';
                        delete turn.audio;
                        scene.conversation.turns.push(turn);
                        if (track) { track.characterId = actor.rootId; tracks.push(track); }
                    }
                    this.app.audioTimeline.tracks = tracks;
                    if (definition.camera) {
                        scene.conversation.aiCamera = AiScenePlan.validateCamera(definition.camera,scene.conversation.cast,scene.conversation.turns)
                            .map(cue=>({...cue,turnId:cue.turn===null ? null : scene.conversation.turns[cue.turn].id}));
                    }
                    this.app.audioTimeline._applyActiveTrack(tracks[0]);
                    await this.applyTimeline(scene);
                    this.app._saveCurrentScene();
                }
                await this.app._loadScene(start);
                this.remember(before);
                this.editor.tab = 'dialogue';
                this.editor.status('Conversation created.');
            } catch (error) { await this.restore(before); throw error; }
        }

        rigFor(rootId) {
            const pool = this.app.objects.objects.filter(o => o.id === rootId || String(o.pinnedTo || '') === rootId);
            return this.app.jointSystem._detectArmatureFromPool(pool);
        }
        sceneChecks() {
            const data=this.current()?.conversation;if(!data)return [];
            const objects=this.app.objects.objects,notes=[];
            if(data.turns.some(t=>t.action==='handoff'&&!this.app.audioTimeline.tracks.some(a=>a.audioId===t.audioId)))notes.push('The prop exchange chain will be built after every handoff line has speech audio.');
            const boxes=data.cast.map(actor=>{
                const rig=this.rigFor(actor.rootId);if(!rig){notes.push(`${actor.name}: character is missing.`);return null;}
                const parts=this.app.jointSystem._getArmatureObjects(rig),head=this.app.jointSystem._independentSvgHeadTurnHead(rig);
                const box={actor,x:Math.min(...parts.map(o=>o.x)),y:Math.min(...parts.map(o=>o.y)),right:Math.max(...parts.map(o=>o.x+o.width)),bottom:Math.max(...parts.map(o=>o.y+o.height))};
                if(box.x<0||box.right>this.app.stage.width||box.y<0||box.bottom>this.app.stage.height)notes.push(`${actor.name}: check stage bounds and entrance position.`);
                if(head)for(const prop of objects){
                    if(!prop.sceneAsset||prop.visible===false||(prop.opacity??1)<=0||objects.indexOf(prop)<objects.indexOf(head))continue;
                    if(prop.x<head.x+head.width&&prop.x+prop.width>head.x&&prop.y<head.y+head.height&&prop.y+prop.height>head.y)notes.push(`${actor.name}: check possible face obstruction by ${prop.name||'a prop'}.`);
                }
                return box;
            }).filter(Boolean);
            for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
                const a=boxes[i],b=boxes[j],intersection=Math.max(0,Math.min(a.right,b.right)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y));
                if(intersection>Math.min((a.right-a.x)*(a.bottom-a.y),(b.right-b.x)*(b.bottom-b.y))*.2)notes.push(`${a.actor.name} / ${b.actor.name}: check overlapping characters.`);
            }
            for(const [i,turn] of data.turns.entries()){
                const actor=data.cast.find(a=>a.id===turn.speaker);
                if(!this.app.audioTimeline.tracks.some(t=>t.audioId===turn.audioId))notes.push(`Line ${i+1}: speech audio is missing.`);
                else if(actor&&this.needsSpeechGeneration(turn,actor))notes.push(`Line ${i+1}: check that audio matches the dialogue text.`);
            }
            for(const prop of objects.filter(o=>o.sceneAsset?.activityRole&&o.visible!==false)){
                if(prop.x+prop.width<0||prop.y+prop.height<0||prop.x>this.app.stage.width||prop.y>this.app.stage.height)notes.push(`${prop.name||'Activity prop'}: outside the stage.`);
            }
            return [...new Set(notes)];
        }
        async previewTemplate(template, sceneIndex=0) {
            if(this.app.animations.isPlaying||this.app.animations._exportingVideo||this.app.objects._isRecording)throw Error('Stop playback or recording before previewing a template.');
            const before=this.snapshot(),undo=[...this.undoStack],redo=[...this.redoStack],tab=this.editor.tab;
            const objects=this.app.objects.objects.slice(),selected=[...this.app.objects.selectedIds];
            const time=this.app.animations.currentTime,originals=this.app.animations.originalStates;
            const armature=this.app.jointSystem._currentArmature;
            const autosave=this.app._scheduleAutosave,open=this.app.exporter._openHtmlInPreviewWindow;
            let html;
            try{
                this.app._scheduleAutosave=()=>{};
                const preview=clone(template);preview.audioMode='generate';preview.scenes=[preview.scenes[sceneIndex]];
                if(!preview.scenes[0])throw Error('Choose a preview scene.');
                await this.create(preview);
                const response=await fetch('assets/conversations/street-0-0.wav',{signal:this.controller?.signal});
                if(!response.ok)throw Error('The local preview sample is unavailable.');
                const blob=await response.blob();
                for(const turn of this.current().conversation.turns){
                    const track=await this.blobTrack(blob,'Silent preview timing',this.app.currentSceneIndex);
                    track.muted=true;track.audioElement.muted=true;this.app.audioTimeline.tracks.push(track);
                    turn.audioId=track.audioId;turn.audioText=turn.text;turn.source='uploaded';
                }
                await this.applyTimeline();
                for(const track of this.app.audioTimeline.tracks){track.muted=true;track.audioElement.muted=true;}
                this.app.exporter._openHtmlInPreviewWindow=value=>{html=value;return true;};
                this.app.exporter.exportHTML5({forceCurrentScene:true,openInWindow:true,includeControls:true,autoplay:true});
                if(!html)throw Error('Could not prepare the motion preview.');
            }finally{
                this.app.exporter._openHtmlInPreviewWindow=open;
                try{
                    await this.restore(before);
                    // Restore the live instances too: re-importing a rig can recalibrate
                    // its artwork, which a read-only template preview must never do.
                    this.app.objects.objects=objects;
                    this.app.animations.originalStates=originals;
                    this.app.animations.currentTime=time;
                    this.app.objects.select(selected);
                    this.app.jointSystem._currentArmature=armature;
                    this.app.objects._resolvePins();
                    eventBus.emit('objects:updated');eventBus.emit('timeline:update');
                    this.app.stage.requestRender();
                }finally{this.undoStack=undo;this.redoStack=redo;this.editor.tab=tab;this.app._scheduleAutosave=autosave;}
            }
            return html;
        }

        fitChair(rig, seat = 'chair') {
            const system = this.app.jointSystem;
            this.app.objects._resolvePins();
            const sources = Object.values(system._getArmatureContactSourceMap(rig)).filter(source => /foot$/.test(source.key));
            const ground = Math.max(...sources.map(source => system._getArmatureFootSole(source).y));
            const supports = sources.map(source => {
                const hip = system._getArmatureContactPointWorldPosition(source.obj, source.joints.find(j => /hip/.test(j.name)));
                const knee = system._getArmatureContactPointWorldPosition(source.obj, source.joints.find(j => /knee/.test(j.name)));
                // Support the upper thigh below the pelvis, not the projected knee.
                return { x: hip.x, y: hip.y + Math.max(0, knee.y - hip.y) * .12 + source.obj.width * Math.abs(source.obj.scaleX ?? 1) * .3 };
            });
            const x = supports.reduce((sum,p) => sum+p.x,0)/supports.length;
            const y = supports.reduce((sum,p) => sum+p.y,0)/supports.length;
            const backHeight = rig.root.height * .64;
            const height = ground - y + backHeight;
            const width = rig.root.height * .95;
            if (![x,y,height,width].every(Number.isFinite)) throw new Error('Could not fit the conversation chair.');
            const view = system._getUniversalCharacterCurrentViewSwitchKey(rig).replace(':','-').replace('front-3q','three-quarter');
            const art = system._activityChairArtwork(width, height, backHeight, view, seat === 'bench');
            const chair = new StageObject('image', { name: `Conversation ${seat}`, x:x-width/2, y:y-backHeight,
                width, height, imageSrc:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(art),
                sceneAsset: SceneDesign.metadata(seat), strokeWidth:0 });
            this.app.objects.addObject(chair);
            const index = this.app.objects.objects.indexOf(chair);
            this.app.objects.objects.splice(index,1);
            const members = new Set(system._getArmatureObjects(rig));
            const first = this.app.objects.objects.findIndex(obj=>members.has(obj));
            const last = this.app.objects.objects.findLastIndex(obj=>members.has(obj));
            this.app.objects.objects.splice(view.startsWith('back') ? last + 1 : first,0,chair);
            const actor = this.current().conversation?.cast.find(a => a.rootId === rig.root.id);
            if (actor) actor.stagingChairId = chair.id;
            return chair;
        }

        async applyTimeline(scene = this.current(), previousData = scene.conversation) {
            this.assertScene(scene);
            const data = scene.conversation;
            if (!data) return;
            const handoff=this.staging.handoffPlan(data);
            this.adoptCaptions(data, previousData);
            const audio = this.app.audioTimeline;
            audio._saveActiveTrack();
            const prepared = [];
            const entranceEnd = Math.max(0, ...data.cast.map(actor => this.staging.entryDuration(actor)));
            let cursor = entranceEnd + 250;
            for (const turn of data.turns) {
                const track = audio.tracks.find(track => track.audioId === turn.audioId);
                if (!track) continue;
                const actor = data.cast.find(actor => actor.id === turn.speaker);
                const rig = this.rigFor(actor?.rootId);
                if (!rig) throw new Error(`Reconnect ${actor?.name || 'the speaker'} to a character in this scene.`);
                const action=await this.staging.lineAction(data,actor,turn,track.trimEndMs-track.trimStartMs);
                const lead=action?.position==='before'?action.durationMs:0;
                const start = data.timing === 'fixed' ? clamp(turn.startMs, 0, 3600000, track.timelineStartMs) : cursor+lead;
                if(start-lead<entranceEnd)throw Error('Move this line later to leave room for its action and entrance.');
                if (start < entranceEnd && this.staging.entryDuration(actor) > start) throw new Error('This fixed start overlaps the speaker entrance. Move the dialogue later or use Sequential timing.');
                const end = start + track.trimEndMs - track.trimStartMs;
                const otherMotion = (actor.staging?.ambientMovement && actor.staging.ambientMovement !== 'idle') || (data.aiActions || []).some(action => action.actor === actor.id
                    && action.start * 1000 < end && (action.start + action.seconds * action.cycles) * 1000 > start)
                    || this.app.jointSystem._getArmatureObjects(rig).some(obj => (obj.animations || []).some(animation => {
                    if (animation._conversationId === data.groupId) return false;
                    const delay = Number(animation.delay) || 0;
                    const configs = Array.isArray(animation.generated) ? animation.generated : [animation.generated];
                    const duration = Math.max(0, ...configs.map(config => Number(config?.duration) || 0));
                    return delay < end && delay + duration > start;
                }));
                const draftTrack = { ...track, timelineStartMs: start, characterId: actor.rootId };
                const reservedHands=handoff?.actors.some(a=>a.id===actor.id);
                const reservedHandObjectIds=reservedHands?handoff.exchanges.flatMap(p=>p.actors.flatMap((a,i)=>a.id===actor.id?
                    [this.staging.handoffHand(rig,p.turn[i?'handoffReceiverHand':'handoffGiverHand']||'front-hand')?.obj.id]:[])).filter(Boolean):[];
                const face = this.app.jointSystem._getArmatureFaceAdapter(rig, { readOnly: true });
                const animation = face?.supportsFacialFeatures === false ? null : this.app.audioLipSync.buildDialogueAnimation(rig, draftTrack, {
                    text: turn.audioText || turn.text, speaker: actor.name, gestures: turn.gestures,
                    headTurn: (!!turn.headTurn && turn.headTurn !== 'none') || !!turn.attentionTarget || (turn.action==='nod'&&action?.position==='during'),
                    seated: actor.staging ? actor.staging.posture === 'seated' : data.seated,
                    reservedHandObjectIds,
                    handsBusy: actor.handsBusy || otherMotion || action?.position==='during' || (actor.staging && actor.staging.activity !== 'none'),
                    otherMotion: reservedHands || otherMotion || action?.position==='during' || (actor.staging && actor.staging.activity !== 'none'),
                    delivery: turn.delivery });
                if (animation) {
                    animation._conversationId = data.groupId;
                    animation._dialogueTurnId = turn.id;
                }
                const actionStart=action?(action.position==='before'?start-action.durationMs:action.position==='after'?end:start):null;
                prepared.push({ turn, track, actor, rig, start, end, animation,action,actionStart });
                cursor = end + (action?.position==='after'?action.durationMs:0) + clamp(turn.pause, 0, 10, .45) * 1000;
            }
            data.directionWindows=prepared.filter(p=>p.action).flatMap(p=>(p.action.handoff?handoff.exchanges.find(e=>e.turn.id===p.turn.id).actors:[p.actor]).map(actor=>({actor:actor.id,start:p.actionStart,end:p.actionStart+p.action.durationMs,turn:p.turn.id})));
            for(const w of data.directionWindows){
                if(prepared.some(p=>p.actor.id===w.actor&&p.turn.id!==w.turn&&p.start<w.end&&p.end>w.start))throw Error('A dialogue action overlaps another line for the same character. Adjust fixed timing.');
                if(data.directionWindows.some(v=>v!==w&&v.actor===w.actor&&v.start<w.end&&v.end>w.start))throw Error('Dialogue actions overlap for the same character. Adjust their timing.');
            }
            const sceneEnd=Math.max(cursor,data.plannedDurationMs||0,...data.directionWindows.map(w=>w.end),
                ...(data.aiActions||[]).map(action=>(action.start+action.seconds*action.cycles)*1000),...prepared.map(item=>item.end));
            const exchange=prepared.find(p=>p.action?.handoff);
            const handoffClip=exchange?await this.staging.handoffChain(data,handoff,prepared,sceneEnd):null;
            // Prepare all replacements before touching current tracks or clips.
            for (const obj of this.app.objects.objects) {
                if (this.staging.protectedProp(data, obj)) continue;
                obj.animations = (obj.animations || []).filter(a => a._conversationId !== data.groupId);
            }
            const segments = [];
            for (const {turn,start,end} of prepared) { turn.startMs = start; turn.durationMs = end-start; }
            await this.staging.timeline(data,sceneEnd);
            if (data.aiActions?.length) await AiScenePlan.installActions(this, data);
            for(const item of prepared)if(item.action&&!item.action.handoff)this.staging.install(data,item.action.clip,item.actionStart,`${item.actor.name} ${item.turn.action}`);
            if(handoffClip){
                this.staging.install(data,handoffClip,0,'Prop handoff');
                const prop=handoffClip.additions[0],objects=this.app.objects.objects;
                objects.splice(objects.indexOf(prop),1);
                const hands=handoffClip.handIds.map(id=>this.app.objects.getObjectById(id));
                objects.splice(Math.min(...hands.map(o=>objects.indexOf(o))),0,prop);
            }
            this.assertScene(scene);
            for (const item of prepared) {
                const { turn, track, actor, rig, start, end, animation } = item;
                track.timelineStartMs = start; track.characterId = actor.rootId;
                track.fileName = `${actor.name}: ${(turn.audioText || turn.text).slice(0, 55)}`;
                turn.startMs = start; turn.durationMs = end - start;
                if (animation) rig.root.animations.push(animation);
                await this.installDialogueHeadTurn(data, item);
                segments.push({ dialogueTurnId: turn.id, startMs: start, endMs: end, text: turn.audioText || turn.text,
                    language: turn.language || 'en' });
                if (data.listening) await this.addListening(data, item);
            }
            this.syncCaptions(data, segments);
            AiScenePlan.installCamera(this,data,prepared);
            audio._applyActiveTrack(audio.tracks.find(t => t.audioId === audio.activeAudioId) || audio.tracks[0]);
            audio._refreshTimelineUI(); audio.syncTimelinePresence();
            this.app.animations.originalStates = null;
            this.app.animations.calculateTotalDuration();
            this.app.objects.select([]);
            this.app.objects.updateObjectList();
            this.app.stage.needsRender = true;
            this.app._saveCurrentScene();
            eventBus.emit('timeline:update');
            eventBus.emit('history:push');
            this.app._scheduleAutosave?.();
        }

        adoptCaptions(data, previousData) {
            if (data.captionId) return;
            const captions = this.app.objects.objects.filter(o => o.type === 'caption');
            const prior = previousData.turns.filter(t => Number.isFinite(t.startMs) && Number.isFinite(t.durationMs));
            const matches = cue => prior.find(t => cue.startMs === t.startMs && cue.endMs === t.startMs + t.durationMs);
            const named = captions.filter(o => o.name === `Dialogue captions ${data.groupId}`);
            // Resolve legacy ownership before ripple changes any turn times. Never adopt by new timing.
            const timed = captions.filter(o => prior.length && o.segments?.length === prior.length && o.segments.every(matches));
            const caption = named[0] || (timed.length === 1 ? timed[0] : null);
            if (!caption) return;
            data.captionId = caption.id;
            for (const [index, cue] of (caption.segments || []).entries()) {
                const turn = matches(cue) || (named.includes(caption) && caption.segments.length === prior.length ? prior[index] : null);
                if (turn && !cue.dialogueTurnId) cue.dialogueTurnId = turn.id;
            }
        }

        syncCaptions(data, segments) {
            const objects = this.app.objects.objects;
            let caption = objects.find(o => o.type === 'caption' && o.id === data.captionId);
            if (!caption && data.captions && segments.length) {
                const stage = this.app.stage;
                caption = new StageObject('caption', { name: `Dialogue captions ${data.groupId}`,
                    x: stage.width * .08, y: stage.height * .84, width: stage.width * .84, height: stage.height * .14,
                    fontSize: Math.max(14, stage.height * .035), fontFamily: 'Inter', textAlign: 'center',
                    textColor: '#ffffff', textBackgroundEnabled: true, textBackgroundColor: 'rgba(0,0,0,.72)',
                    textBackgroundPadding: 8, captionVerticalAlign: 'middle', captionDelivery: 'both',
                    captionProfile: { textProgression: data.captionProgression || 'sentence' }, segments: [] });
                this.app.objects.addObject(caption);
            }
            if (!caption) return;
            data.captionId = caption.id;
            if (!data.captions) {
                if (!data.captionsHidden) data.captionVisible = caption.visible;
                data.captionsHidden = true; caption.visible = false;
            } else if (data.captionsHidden) {
                caption.visible = data.captionVisible !== false; delete data.captionsHidden; delete data.captionVisible;
            }
            const old = caption.segments || [], used = new Set();
            const previousTexts = data.captionTurnTexts || {};
            const next = [];
            for (const [index, source] of segments.entries()) {
                const sourceChanged = Object.hasOwn(previousTexts, source.dialogueTurnId)
                    && previousTexts[source.dialogueTurnId] !== source.text;
                const matches = old.filter(c => c.dialogueTurnId === source.dialogueTurnId || c.dialogueTurnIds?.includes(source.dialogueTurnId));
                if (!matches.length && !old.some(c => c.dialogueTurnId) && old[index]) matches.push(old[index]);
                if (!matches.length) {
                    next.push(CaptionRuntime.normalize({ ...source, generatedText: source.text,
                        generatedStartMs: source.startMs, generatedEndMs: source.endMs }));
                    continue;
                }
                for (const cue of matches) {
                    if (used.has(cue)) {
                        if (sourceChanged) next.find(c => c.id === cue.id).reviewNeeded = true;
                        continue;
                    }
                    used.add(cue);
                    const merged = { ...cue, dialogueTurnId: cue.dialogueTurnId || source.dialogueTurnId, language: source.language };
                    const structural = matches.length > 1 || cue.dialogueTurnIds?.length > 1;
                    const protectedText = structural || cue.edited || cue.reviewed || cue.secondary || !cue.generatedText || cue.text !== cue.generatedText;
                    if (!protectedText) merged.text = source.text;
                    // Only untouched generated boundaries follow ripple timing. Manual timing and word alignment stay intact.
                    if (!structural && !cue.edited && cue.startMs === cue.generatedStartMs && cue.endMs === cue.generatedEndMs) {
                        Object.assign(merged, CaptionRuntime.shift(merged, source.startMs - cue.startMs), { endMs: source.endMs });
                    }
                    if ((structural && sourceChanged)
                        || (!structural && cue.generatedText && cue.generatedText !== source.text && protectedText)) merged.reviewNeeded = true;
                    Object.assign(merged, { generatedText: source.text, generatedStartMs: source.startMs, generatedEndMs: source.endMs });
                    next.push(merged);
                }
            }
            for (const cue of old) if (!used.has(cue) && (cue.edited || cue.reviewed || cue.secondary || !cue.generatedText)) next.push(cue);
            caption.segments = next.sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);
            data.captionTurnTexts = Object.fromEntries(segments.map(source => [source.dialogueTurnId, source.text]));
        }

        async installDialogueHeadTurn(data, {actor, rig, turn, start, end}) {
            const mode=turn.headTurn&&turn.headTurn!=='none'?turn.headTurn:turn.attentionTarget?'partner':'none';
            if(mode==='none')return;
            if(!['partner','viewer'].includes(mode))throw Error('Choose a valid dialogue head turn.');
            if(turn.attentionTarget&&!data.cast.some(a=>a.id===turn.attentionTarget&&a.id!==actor.id))throw Error('Choose another cast member as the attention target.');
            const system=this.app.jointSystem;
            if(!system._supportsIndependentSvgHeadTurn(rig))return;
            const head=system._independentSvgHeadTurnHead(rig);
            if((head.animations||[]).some(a=>a._conversationId!==data.groupId&&(Number(a.delay)||0)<end
                &&(Number(a.delay)||0)+system._armatureTrackDuration(a)>start))return;
            const view=system._getUniversalCharacterCurrentViewSwitchKey(rig);
            const partners=data.cast.filter(a=>a.id!==actor.id&&(!turn.attentionTarget||a.id===turn.attentionTarget)).map(a=>this.app.objects.getObjectById(a.rootId)).filter(Boolean)
                .sort((a,b)=>Math.abs(a.x-rig.root.x)-Math.abs(b.x-rig.root.x));
            // A profile already faces its partner; viewer turns use the shared head adapter.
            if(!['front','back'].includes(view)&&mode==='partner'){
                if(turn.attentionTarget){
                    const direction=(partners[0]?.x??rig.root.x)>rig.root.x?1:-1;
                    head.animations.push({id:id('anim'),name:`Attention: ${actor.name}`,type:'continuous',delay:start,repeat:'1',trigger:'onLoad',afterPlayback:'return',
                        _conversationId:data.groupId,_dialogueTurnId:turn.id,params:{duration:(end-start)/1000},
                        generated:this.app.animations._generateSvgAfricanFaceMotion(head,{duration:(end-start)/1000},{gazeX:[[0,0],[.15,direction],[.85,direction],[1,0]]})});
                }
                return;
            }
            const direction=view.startsWith('side:')||view.startsWith('front-3q')?'viewer':view.startsWith('back-3q')?'profile'
                :mode==='viewer'?'front':(partners[0]?.x??rig.root.x)>rig.root.x?'right':'left';
            if(direction==='front')return;
            if(end-start<400)return;
            await system._enableIndependentSvgHeadTurn(rig);
            const face=this.app.animations._getSvgAfricanFaceState(head);
            const duration=Math.min(.55,(end-start)/3000);
            const track=system._independentHeadTurnTrack({direction,amount:.75,duration,hold:Math.max(0,(end-start)/1000-duration*2),return:true,eyes:true},face.frontHeadYaw||0,face.gazeX||0,face.gazeY||0);
            Object.assign(track,{delay:start,_conversationId:data.groupId,_dialogueTurnId:turn.id,name:`Dialogue head turn: ${actor.name}`});
            head.animations.push(track);
        }

        async addListening(data, { actor, start, end, turn }) {
            for (const listener of data.cast.filter(a => a.id !== actor.id)) {
                if(data.turns.some(t=>t.action==='handoff'&&(t.speaker===listener.id||t.handoffTo===listener.id)))continue;
                if((data.directionWindows||[]).some(w=>w.actor===listener.id&&w.start<end&&w.end>start))continue;
                if ((data.aiActions || []).some(action => action.actor === listener.id
                    && action.start * 1000 < end && (action.start + action.seconds * action.cycles) * 1000 > start)) continue;
                if (listener.staging?.activity && listener.staging.activity !== 'none') continue;
                if (listener.staging?.ambientMovement && listener.staging.ambientMovement !== 'idle') continue;
                const reaction = listener.staging?.reaction || 'nod';
                if (reaction === 'idle') continue;
                const rig = this.rigFor(listener.rootId);
                const head = rig?.parts?.['head-neck']?.obj;
                if (!rig) continue;
                const speaker = this.app.objects.getObjectById(actor.rootId);
                const direction = speaker?.x > rig.root.x ? 1 : -1;
                const duration = end - start;
                const overlapsSpeech = data.turns.some(t => t.speaker === listener.id && t.audioId
                    && (Number(t.startMs) || 0) < end && (Number(t.startMs) || 0) + (Number(t.durationMs) || 0) > start);
                if (overlapsSpeech) continue;
                if (this.app.jointSystem._getArmatureObjects(rig).some(o => o.animations.some(a =>
                    a._conversationId !== data.groupId && (Number(a.delay) || 0) < end
                    && (Number(a.delay) || 0) + this.app.jointSystem._armatureTrackDuration(a) > start))) continue;
                if (reaction === 'raise-hand') await this.staging.listeningGesture(data, listener, start, duration);
                if (!head?._svgCharacterPart) continue;
                head.animations.push({ id: id('anim'), name: `Listen: ${actor.name}`, type: 'dialogue-listen',
                    _conversationId: data.groupId, _dialogueTurnId: turn.id, delay: start, repeat: '1',
                    trigger: 'onLoad', startMode: 'withPrevious', afterPlayback: 'return', params: { duration: duration / 1000 },
                    generated: this.app.animations._generateSvgAfricanFaceMotion(head, { duration: duration / 1000 }, {
                        gazeX: [[0, 0], [.15, direction * 1.5], [.85, direction * 1.5], [1, 0]] }) });
                const neck = reaction === 'nod' ? head.joints?.find(joint => /neck/.test(joint.name)) : null;
                if (neck && duration > 1200) {
                    const side = String(listener.staging?.view || '').startsWith('side');
                    const index = [...head.joints].sort((a,b) => a.position-b.position).indexOf(neck);
                    const property = side ? `jointAngle_${index}` : `jointTiltX_${index}`;
                    const base = Number(side ? neck.angle : neck.tiltX) || 0;
                    const amount = side ? listener.staging.view.endsWith('left') ? -3 : 3 : -3;
                    head.animations.push({ id: id('anim'), type: 'continuous', name: `Listen nod: ${actor.name}`,
                        _conversationId: data.groupId, _dialogueTurnId: turn.id, delay: start, repeat: '1', trigger: 'onLoad',
                        afterPlayback: 'return', params: { duration: duration/1000 },
                        generated: { type:'continuous', duration, properties:[property], segmentEasing:'easeInOutQuad',
                            keyframes: [[0,base],[.35,base],[.45,base+amount],[.6,base],[1,base]].map(([t,value])=>({t,values:{[property]:value}})) } });
                }
            }
        }

        async edit(change) {
            const before = this.snapshot();
            try {
                const scene = this.current();
                await change(scene.conversation);
                this.assertScene(scene);
                if (comparable(this.snapshot()) === comparable(before)) return;
                if (this.current().conversation.turns.length > 50) throw new Error('Use up to 50 dialogue turns per scene.');
                const oldCast = before.scenes[before.index].conversation.cast;
                for (const actor of scene.conversation.cast) {
                    const old = oldCast.find(a => a.id === actor.id);
                    if (old?.name !== actor.name) {
                        const root = this.app.objects.getObjectById(actor.rootId);
                        if (root) root.name = actor.name;
                    }
                    for (const key of ['name','voice','localVoice','azureVoice','elevenVoice','ttsmakerVoice','browserVoice','handsBusy']) if (old?.[key] !== actor[key]) {
                        for (const other of this.app.scenes.filter(s => s !== scene && s.conversation?.groupId === scene.conversation.groupId)) {
                            const match = other.conversation.cast.find(a => a.id === actor.id);
                            if (match) match[key] = actor[key];
                            if (match && key === 'name') {
                                const root = other.objects.find(o => o.id === match.rootId);
                                if (root) root.name = actor.name;
                            }
                        }
                    }
                }
                await this.applyTimeline(scene, before.scenes[before.index].conversation); this.remember(before);
            }
            catch (error) { await this.restore(before); throw error; }
        }

        async replaceAudio(turnId, blob, source = 'upload') {
            const scene = this.current();
            const turn = scene.conversation.turns.find(t => t.id === turnId);
            const actor = scene.conversation.cast.find(a => a.id === turn.speaker);
            const requested = this.speechSignature(turn, actor);
            const track = await this.blobTrack(blob, actor.name, this.app.currentSceneIndex, turn.audioId);
            this.assertScene(scene);
            if (this.speechSignature(turn, actor) !== requested) throw new Error('The dialogue changed while audio was loading. Try again.');
            const before = this.snapshot();
            try {
                const audio = this.app.audioTimeline;
                const old = audio.tracks.find(t => t.audioId === turn.audioId);
                track.characterId = actor.rootId;
                track.timelineStartMs = old?.timelineStartMs || 0;
                track.audioRevision = (old?.audioRevision || 0) + 1;
                audio.tracks = audio.tracks.filter(t => t.audioId !== turn.audioId).concat(track);
                audio._applyActiveTrack(track);
                turn.audioId = track.audioId; turn.audioText = turn.text;
                turn.audioSignature = requested; turn.source = source;
                await this.applyTimeline(scene);
                this.remember(before);
            } catch (error) { await this.restore(before); throw error; }
        }

        async generate(turnId, consent = false, voiceRightsConfirmed = false) {
            if (globalThis.StudioExchange?.config.hostedServices === false) throw new Error('Speech generation is not configured. Upload audio for lip sync and export.');
            const scene = this.current();
            const provider = this.speechProvider(scene.conversation);
            if (provider === 'browser') throw new Error('Browser voices are listen-only. Choose a server voice or upload audio for lip sync and export.');
            if (provider !== 'local' && !consent) throw new Error('Confirm paid speech generation first.');
            if (['azure','elevenlabs','ttsmaker'].includes(provider) && this.speechCapabilities?.providers?.[provider]?.authorized!==true) throw new Error('This voice source is restricted to superadmin.');
            const turn = scene.conversation.turns.find(t => t.id === turnId);
            const actor = scene.conversation.cast.find(a => a.id === turn.speaker);
            if (!Object.hasOwn(ConversationTemplates.languages, turn.language || 'en')) throw new Error('Choose an available spoken language.');
            if (provider === 'local' && (turn.language || 'en') !== 'en') throw new Error('Installed local voices support English only. Upload or record this language, or explicitly select a paid provider.');
            if (provider === 'azure' && (turn.language || 'en') !== 'en') throw new Error('The curated Azure voices support English only. Nigerian English is not Hausa, Igbo or Yoruba.');
            if (provider==='ttsmaker' && ((turn.language || 'en')!=='en' || !this.selectedVoice(actor,provider))) throw new Error('Choose a TTSMaker voice and English dialogue.');
            if (provider==='elevenlabs') {
                if(!voiceRightsConfirmed) throw new Error('Confirm permission to use the selected ElevenLabs voice.');
                if((turn.language || 'en')!=='en') throw new Error('This ElevenLabs integration currently supports English only.');
                if(!this.selectedVoice(actor,provider)) throw new Error('Choose an ElevenLabs voice for this speaker.');
            }
            if (provider === 'local' && new TextEncoder().encode(turn.text).length > 1800) throw new Error('Split local dialogue into lines of at most 1800 UTF-8 bytes.');
            const key = this.speechSignature(turn, actor);
            let blob = this.audioCache.get(key);
            if (!blob) {
                const response = await fetch('api/voiceover/dialogue-speech.php', { method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': window.__STAGE_USER?.csrf_token || '' },
                    body: JSON.stringify({ provider, text: turn.text, voice: this.selectedVoice(actor,provider),
                        delivery: provider === 'openai' ? turn.delivery : 'natural', speed: turn.speed, language: turn.language || 'en', consent, voiceRightsConfirmed }),
                    signal: AbortSignal.any([this.controller.signal, AbortSignal.timeout(provider==='ttsmaker'?120000:100000)]) });
                if (!response.ok) {
                    const error = await response.json().catch(() => ({}));
                    throw new Error(error.error || error.message || 'Speech generation failed. Previous audio retained.');
                }
                blob = await response.blob();
            }
            this.assertScene(scene);
            if (this.speechSignature(turn, actor) !== key) throw new Error('The dialogue changed during generation. Previous audio retained.');
            await this.replaceAudio(turnId, blob, 'generated');
            this.audioCache.set(key, blob);
        }

        async saveTemplate(name) {
            this.app._saveCurrentScene();
            const current = this.current().conversation;
            const scenes = this.app.scenes.filter(s => s.conversation?.groupId === current.groupId);
            const preset = { id: id('saved'), name: String(name).trim().slice(0, 80), category: 'My templates',
                cast: clone(current.cast).map(actor => {
                    const root = this.app.objects.getObjectById(actor.rootId);
                    return { ...actor, rootId: undefined, config: clone(root?._svgCharacterConfig || actor.config) };
                }), scenes: scenes.map(scene => ({ name: scene.name, set: scene.conversation.set,
                    layout: scene.conversation.layout,
                    ...(scene.conversation.aiCamera ? {camera:scene.conversation.aiCamera.map(cue=>({
                        actor:cue.actor,start:cue.start,seconds:cue.seconds,zoom:cue.zoom,transition:cue.transition,
                        turn:cue.turnId ? scene.conversation.turns.findIndex(turn=>turn.id===cue.turnId) : null
                    })).filter(cue=>cue.turn===null || cue.turn>=0)} : {}),
                    speechProvider: this.speechProvider(scene.conversation),
                    staging: Object.fromEntries(scene.conversation.cast.map(actor => [actor.id, clone(actor.staging || {})])),
                    seated: scene.conversation.seated, timing: scene.conversation.timing,
                    captions: scene.conversation.captions, listening: scene.conversation.listening,
                    captionProgression: scene.conversation.captionProgression || 'sentence',
                    turns: scene.conversation.turns.map(turn => {
                        const audio = scene.audioTrack?.tracks?.find(t => t.audioId === turn.audioId);
                        if (!audio) throw new Error('Generate or upload audio for every turn before saving a template.');
                        return { ...turn, text: turn.audioText, audio: { dataUrl: audio.dataUrl } };
                    }) })) };
            if (!preset.name) throw new Error('Enter a template name.');
            const saved = this.saved.concat(preset);
            await StorageIDB.put('autosaves', this.storageKey, saved);
            this.saved = saved;
        }

        async aiDraft(prompt) {
            const scene = this.current(), data = scene.conversation;
            const ai = this.app.ai;
            const provider = ai.apiProvider === 'deepseek' ? 'deepseek' : 'openai';
            const connection = ai.getProviderConnection(provider);
            const response = await fetch('api/ai/proxy.php', { method: 'POST', headers: {
                'Content-Type': 'application/json', 'X-CSRF-Token': window.__STAGE_USER?.csrf_token || '' },
                signal: AbortSignal.any([this.controller.signal, AbortSignal.timeout(90000)]),
                body: JSON.stringify({ provider, apiKey: connection.apiKey || '', endpoint: connection.apiEndpoint || '',
                    payload: { model: provider === 'deepseek' ? 'deepseek-chat' : 'gpt-4o-mini', temperature: .7, max_tokens: 1400,
                        messages: [{ role: 'system', content: 'Write a short fictional conversation. Return only JSON: {"turns":[{"speaker":"cast-id","text":"spoken line"}]}. Use only these cast IDs: ' + data.cast.map(a => `${a.id} (${a.name})`).join(', ') + '. Maximum 12 turns, each under 500 characters. Do not give diagnoses or medical instructions.' },
                            { role: 'user', content: String(prompt).slice(0, 2000) }] } }) });
            if (!response.ok) throw new Error('AI dialogue generation failed. Existing dialogue retained.');
            const result = await response.json();
            const value = JSON.parse(String(result.choices?.[0]?.message?.content || '').replace(/^```(?:json)?\s*|\s*```$/g, ''));
            this.assertScene(scene);
            if (!Array.isArray(value.turns) || !value.turns.length || value.turns.length > 12 || value.turns.some(t =>
                !data.cast.some(a => a.id === t.speaker) || typeof t.text !== 'string' || !t.text.trim() || t.text.length > 500)) throw new Error('AI returned an invalid dialogue. Existing dialogue retained.');
            return value.turns.map(t => ({ id: id('turn'), speaker: t.speaker, text: t.text.trim(),
                pause: .45, speed: 1, delivery: 'natural', gestures: true }));
        }
    }
    window.ConversationTemplates = ConversationTemplates;
})();
