(() => {
    'use strict';
    const escape = value => Utils.escapeHtml(String(value ?? ''));
    const button = (action, icon, label, extra = '') => `<button type="button" data-action="${action}" title="${label}" aria-label="${label}" ${extra}><i class="fas fa-${icon}" aria-hidden="true"></i></button>`;
    const option = (value, label, selected) => `<option value="${escape(value)}" ${value === selected ? 'selected' : ''}>${escape(label)}</option>`;
    const privateSources = { azure:'Azure Speech', elevenlabs:'ElevenLabs', ttsmaker:'TTSMaker' };
    const localVoices = [
        { id: 'lj', label: 'LJ — adult female voice, US English', profile: 'Adult female voice · US English', gender:'female', age:'adult' },
        { id: 'libri-0', label: 'LibriTTS speaker 0 — profile unspecified', profile: 'Gender and age not specified · US English' },
        { id: 'libri-1', label: 'LibriTTS speaker 1 — profile unspecified', profile: 'Gender and age not specified · US English' }
    ];
    const openAiVoices = ['alloy','echo','fable','onyx','nova','shimmer'].map(id => ({
        id, label: `${id} — profile unspecified`, profile: 'Gender and age not specified by provider'
    }));
    const azureVoices = [
        {id:'en-NG-EzinneNeural',name:'Ezinne',lang:'en-NG',gender:'female',age:'unknown'},
        {id:'en-NG-AbeoNeural',name:'Abeo',lang:'en-NG',gender:'male',age:'unknown'},
        {id:'en-US-AnaNeural',name:'Ana',lang:'en-US',gender:'female',age:'child'},
        {id:'en-GB-MaisieNeural',name:'Maisie',lang:'en-GB',gender:'female',age:'child'}
    ].map(v=>({...v,label:`${v.name} - ${v.lang}, ${v.gender}${v.age==='child'?', child':''}`,profile:`${v.lang} / ${v.gender} / ${v.age==='unknown'?'age unspecified':v.age}`}));

    class ConversationEditor {
        constructor(manager) {
            this.manager = manager; this.tab = 'templates'; this.filter = ''; this.category = '';
            this.templateDraft = null;
            this.selectedTurns = new Set();
            this.voiceFilters = {lang:'',gender:'',age:'',export:''};
            this.browserVoices = [];
            this.refreshBrowserVoices = () => {
                this.browserVoices = (window.speechSynthesis?.getVoices() || []).map(voice => {
                    const known = azureVoices.find(v=>voice.lang===v.lang && (voice.name===v.id || voice.name===`Microsoft ${v.name} Online (Natural) - ${v.lang==='en-NG'?'English (Nigeria)':v.lang==='en-US'?'English (United States)':'English (United Kingdom)'}`));
                    return {id:JSON.stringify([voice.voiceURI,voice.name,voice.lang]),name:voice.name,lang:voice.lang,
                        gender:known?.gender || 'unknown',age:known?.age || 'unknown',voice,
                        label:`${voice.name} (${voice.lang}) - ${voice.localService?'device':'online'} - listen only`,
                        profile:`${voice.lang} / ${known?.gender || 'gender unspecified'} / ${known?.age==='child'?'child':'age unspecified'} / listen only`};
                }).sort((a,b)=>(b.lang==='en-NG')-(a.lang==='en-NG') || a.label.localeCompare(b.label));
                // Voice discovery is asynchronous; do not replace unsaved dialogue inputs.
                if (!this.manager.busy && this.manager.speechProvider()==='browser') {
                    const languages=this.modal.querySelector('[data-voice-filter="lang"]');
                    if(languages) {
                        const values=[...new Set(this.browserVoices.map(v=>v.lang).concat(this.voiceFilters.lang || []))];
                        languages.innerHTML=option('','All',this.voiceFilters.lang)+values.map(lang=>option(lang,lang,this.voiceFilters.lang)).join('');
                    }
                    this.modal.querySelectorAll('[data-cast="browserVoice"]').forEach(select=>{
                        const actor=this.manager.current()?.conversation?.cast.find(a=>a.id===select.closest('[data-actor]').dataset.actor);
                        select.innerHTML=this.voiceOptions('browser',actor?.browserVoice || '');
                        select.closest('[data-actor]').querySelector('[data-action="preview-voice"]').disabled=!this.browserVoices.some(v=>v.id===actor?.browserVoice);
                    });
                }
            };
            const entry = document.createElement('button');
            entry.id = 'btn-conversations'; entry.type = 'button'; entry.title = 'Conversation templates and dialogue';
            entry.setAttribute('aria-label', 'Conversations');
            entry.setAttribute('aria-haspopup', 'dialog');
            entry.setAttribute('aria-controls', 'conversation-dialog');
            entry.innerHTML = '<i class="fas fa-comments" aria-hidden="true"></i>';
            document.querySelector('.scene-bar-actions')?.append(entry);
            entry.addEventListener('click', () => void this.open());
            this.modal = document.createElement('div');
            this.modal.className = 'conversation-overlay hidden';
            this.modal.innerHTML = `<section id="conversation-dialog" class="conversation-dialog" role="dialog" aria-modal="true" aria-labelledby="conversation-title">
                <header><h2 id="conversation-title">Conversations</h2>${button('undo', 'undo', 'Undo dialogue change')}${button('redo', 'redo', 'Redo dialogue change')}${button('close', 'xmark', 'Close')}</header>
                <nav aria-label="Conversation views"><button data-action="templates">Templates</button><button data-action="dialogue">Dialogue</button><button data-action="staging">Staging</button></nav>
                <main></main><footer><progress hidden aria-label="Conversation processing"></progress><span role="status" aria-live="polite">Ready</span>${button('cancel', 'stop', 'Cancel operation', 'hidden')}</footer>
                <input type="file" accept="audio/*" data-upload hidden>
            </section>`;
            document.body.append(this.modal);
            window.speechSynthesis?.addEventListener('voiceschanged', this.refreshBrowserVoices);
            this.refreshBrowserVoices();
            this.modal.addEventListener('click', event => {
                const control = event.target.closest('[data-action]');
                if (control) void this.action(control.dataset.action, control.closest('[data-turn]')?.dataset.turn, control);
            });
            this.modal.addEventListener('change', event => void this.change(event.target));
            this.modal.addEventListener('input', event => {
                if (event.target.matches('[data-search]')) { this.filter = event.target.value; this.renderLibraryResults(); }
                if (event.target.matches('[data-stage-field="distance"]')) event.target.closest('label').querySelector('output').textContent = event.target.value;
                if (event.target.matches('[data-draft]')) this.updateTemplateDraft(event.target);
                if (event.target.matches('[data-draft-cast]')) this.updateTemplateDraft(event.target);
                if (event.target.matches('[data-draft-scene-field]')) this.updateTemplateDraft(event.target);
                if (event.target.matches('[data-draft-turn-field]')) this.updateTemplateDraft(event.target);
            });
            this.modal.addEventListener('keydown', event => {
                event.stopPropagation();
                if (event.key === 'Escape' && !manager.busy) this.close();
                if (event.key === 'Tab') {
                    const nodes = [...this.modal.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled)')].filter(n => n.offsetParent !== null);
                    const first = nodes[0], last = nodes[nodes.length - 1];
                    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
                    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
                }
            });
        }
        selectionKey(sceneId, turnId) { return JSON.stringify([sceneId, turnId]); }
        updateTemplateDraft(input) {
            const draft = this.templateDraft;
            if (!draft) return;
            if (input.dataset.draft) draft[input.dataset.draft] = input.value;
            if (input.dataset.draftCast) {
                const actor = draft.cast.find(item => item.id === input.closest('[data-draft-actor]').dataset.draftActor);
                actor[input.dataset.draftCast] = input.value;
                if (input.dataset.draftCast === 'preset') actor.config = { preset: input.value };
            }
            if (input.dataset.draftSceneField) {
                const scene = draft.scenes[Number(input.closest('[data-draft-scene]').dataset.draftScene)];
                const value = input.type === 'checkbox' ? input.checked : input.value;
                scene[input.dataset.draftSceneField] = value;
                if (input.dataset.draftSceneField === 'seated') {
                    scene.staging = Object.fromEntries(draft.cast.map(actor => [actor.id, { ...(draft._aiScenePlan ? scene.staging?.[actor.id] : {}), posture: value ? 'seated' : 'standing' }]));
                }
                if (draft._aiScenePlan && input.dataset.draftSceneField === 'layout') {
                    scene.staging = Object.fromEntries(draft.cast.map((actor,index)=>[actor.id,this.manager.staging.defaults(value,index,draft.cast.length)]));
                    this.renderTemplateDraft();
                }
                if (input.dataset.draftSceneField === 'set') {
                    const set = BUILTIN_PROP_LIBRARY.scenes.find(item => item.id === value);
                    scene.propIds = (set?.pieces || []).map(piece => piece.propId);
                    this.renderTemplateDraft();
                }
            }
            if (input.dataset.draftTurnField) {
                const sceneIndex = Number(input.closest('[data-draft-scene]').dataset.draftScene);
                const turnIndex = Number(input.closest('[data-draft-turn]').dataset.draftTurn);
                const scene = draft.scenes[sceneIndex];
                const source = scene.turns[turnIndex];
                const turn = Array.isArray(source) ? { speaker: source[0], text: source[1] } : source;
                turn[input.dataset.draftTurnField] = input.value;
                scene.turns[turnIndex] = turn;
            }
            if (input.dataset.draftProp) {
                const scene = draft.scenes[Number(input.closest('[data-draft-scene]').dataset.draftScene)];
                const set = BUILTIN_PROP_LIBRARY.scenes.find(item => item.id === scene.set);
                const all = (set?.pieces || []).map(piece => piece.propId);
                const chosen = new Set(Array.isArray(scene.propIds) ? scene.propIds : all);
                if (input.checked) chosen.add(input.dataset.draftProp); else chosen.delete(input.dataset.draftProp);
                scene.propIds = [...chosen];
            }
        }
        updateBatchControls() {
            const button = this.modal.querySelector('[data-action="generate-selected"]');
            const count = this.modal.querySelector('[data-batch-count]');
            if (button) {
                button.disabled = this.selectedTurns.size === 0;
                button.textContent = `Generate selected (${this.selectedTurns.size})`;
            }
            if (count) count.textContent = `${this.selectedTurns.size} row${this.selectedTurns.size === 1 ? '' : 's'} selected`;
        }
        voices(provider) {
            if (Object.hasOwn(privateSources,provider)) {
                const capability=this.manager.speechCapabilities?.providers?.[provider];
                if(capability?.authorized!==true) return [];
                return provider==='azure'?azureVoices:capability.voiceProfiles || [];
            }
            return provider==='browser'?this.browserVoices:provider==='local'?localVoices.map(v=>({...v,lang:'en-US'})):openAiVoices;
        }
        privateSourceOptions(selected) {
            return Object.entries(privateSources).map(([id,label])=>this.manager.speechCapabilities?.providers?.[id]?.authorized===true
                ?option(id,label+' - paid, superadmin',selected):selected===id?`<option value="${id}" selected disabled>Restricted voice source</option>`:'').join('');
        }
        voiceOptions(provider, selected) {
            const all=this.voices(provider),f=this.voiceFilters;
            const matches=v=>(!f.lang || (v.lang || 'unknown')===f.lang) && (!f.gender || (v.gender || 'unknown')===f.gender)
                && (!f.age || (v.age || 'unknown')===f.age) && (!f.export || (provider==='browser'?'listen':'export')===f.export);
            const filtered=all.filter(matches);
            const current=all.find(v=>v.id===selected);
            const missing=selected && !current ? option(selected,`Saved voice unavailable on this ${Object.hasOwn(privateSources,provider)?'account':'device'}`,selected) : '';
            const kept=current && !matches(current) ? option(current.id,`${current.label} (selected; outside filter)`,selected) : '';
            return `${!selected?option('','Choose a voice',selected):''}${missing}${kept}${filtered.map(v=>`<option value="${escape(v.id)}" ${v.id===selected?'selected':''} ${v.ready===false?'disabled':''}>${escape(v.label)}</option>`).join('')}${!filtered.length?'<option disabled>No matching voices</option>':''}`;
        }
        voiceProfile(provider, voice) {
            const entry = this.voices(provider).find(item => item.id === voice);
            return entry?.profile || 'Gender and age not specified by provider';
        }
        listenBrowser(actorId, turn = null) {
            this.stopAudio();
            const data=this.manager.current()?.conversation;
            const actor=data?.cast.find(a=>a.id===actorId);
            const entry=this.browserVoices.find(v=>v.id===actor?.browserVoice);
            if (!entry || !window.speechSynthesis) {this.status('Select an available browser voice. Saved voices may not exist on another device.');return;}
            if (turn && entry.lang.split('-')[0] !== (turn.language || 'en')) {this.status('Choose a browser voice matching this line\'s spoken language.');return;}
            if (!entry.voice.localService && !confirm('This browser voice uses an online service. Send this text to the browser speech service to listen? No timeline audio will be created.')) return;
            const utterance=new SpeechSynthesisUtterance(turn?.text || 'Hello, this is a short voice preview.');
            utterance.voice=entry.voice;utterance.lang=entry.lang;utterance.rate=turn?.speed || 1;
            this.browserUtterance=utterance;
            utterance.onend=()=>{if(this.browserUtterance===utterance){this.browserUtterance=null;this.status('Browser listening finished. Timeline audio unchanged.');}};
            utterance.onerror=event=>{if(this.browserUtterance===utterance){this.browserUtterance=null;this.status(`Browser speech unavailable (${event.error || 'unknown error'}). Timeline audio unchanged.`);}};
            this.status('Listening with browser voice. No lip sync or export audio is generated.');
            window.speechSynthesis.speak(utterance);
        }
        async previewVoice(actorId) {
            const m = this.manager;
            const data = m.current()?.conversation;
            const actor = data?.cast.find(item => item.id === actorId);
            if (!actor) return;
            const provider = m.speechProvider(data);
            if (provider === 'browser') {this.listenBrowser(actorId);return;}
            const local = provider === 'local';
            this.stopAudio();
            if (Object.hasOwn(privateSources,provider) && m.speechCapabilities?.providers?.[provider]?.authorized!==true) {this.status('This voice source is restricted to superadmin.');return;}
            if (!local && !confirm(`Previewing a ${privateSources[provider] || 'OpenAI'} voice sends a short sample for generation. This uses AI credits and may incur provider charges.${provider==='elevenlabs'?' Confirm you own this voice or have permission to use it.':''} Continue?`)) return;
            await this.perform(`Previewing ${actor.name}'s voice...`, async () => {
                const response = await fetch('api/voiceover/dialogue-speech.php', {
                    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': window.__STAGE_USER?.csrf_token || '' },
                    body: JSON.stringify({ provider, text: 'Hello, this is a short voice preview.',
                        voice: m.selectedVoice(actor,provider), delivery: 'natural', speed: 1,
                        language: 'en', consent: !local, voiceRightsConfirmed:provider==='elevenlabs' }),
                    signal: AbortSignal.any([m.controller.signal, AbortSignal.timeout(100000)])
                });
                if (!response.ok) {
                    const error = await response.json().catch(() => ({}));
                    throw new Error(error.error || error.message || 'Voice preview failed.');
                }
                const url = URL.createObjectURL(await response.blob());
                const audio = new Audio(url);
                this.voicePreview = audio;
                try {
                    await new Promise((resolve, reject) => {
                        const signal = m.controller.signal;
                        const cleanup = () => signal.removeEventListener('abort', abort);
                        const abort = () => { audio.pause(); cleanup(); reject(new DOMException('Cancelled', 'AbortError')); };
                        audio.addEventListener('ended', () => { cleanup(); resolve(); }, { once: true });
                        audio.addEventListener('error', () => { cleanup(); reject(new Error('The voice preview could not be played.')); }, { once: true });
                        signal.addEventListener('abort', abort, { once: true });
                        audio.play().catch(error => { cleanup(); reject(error); });
                    });
                } finally {
                    audio.pause(); URL.revokeObjectURL(url);
                    if (this.voicePreview === audio) this.voicePreview = null;
                }
            });
        }
        async generateBatch(targets) {
            const m = this.manager;
            const app = m.app;
            const invalid = targets.find(target => {
                const provider = m.speechProvider(target.scene.conversation);
                const actor = target.scene.conversation.cast.find(item => item.id === target.turn.speaker);
                return provider === 'browser' || Object.hasOwn(privateSources,provider) && ((target.turn.language || 'en') !== 'en' || m.speechCapabilities?.providers?.[provider]?.authorized!==true)
                    || ['elevenlabs','ttsmaker'].includes(provider) && !this.voices(provider).some(v=>v.id===m.selectedVoice(actor,provider) && v.ready)
                    || !m.speechCapabilities?.providers?.[provider]?.available
                    || provider === 'local' && ((target.turn.language || 'en') !== 'en'
                    || new TextEncoder().encode(target.turn.text).length > 1800 || !m.speechCapabilities?.providers?.local?.available)
                    || provider === 'openai' && !m.speechCapabilities?.providers?.openai?.available
                    || !actor;
            });
            if (invalid) {
                const provider = m.speechProvider(invalid.scene.conversation);
                const turn = invalid.turn;
                const message = provider === 'local' && (turn.language || 'en') !== 'en'
                    ? 'Local voices support English only. Upload or record audio for other languages.'
                    : provider === 'local' && new TextEncoder().encode(turn.text).length > 1800
                        ? 'Split local dialogue into lines of at most 1800 UTF-8 bytes.'
                        : provider==='browser'?'Browser voices are listen-only. Choose a server voice or upload audio for lip sync and export.'
                        : provider==='azure' && (turn.language || 'en')!=='en'?'These Azure voices support English only, not Hausa, Igbo or Yoruba.'
                        : 'A required voice service is unavailable, or a speaker is not assigned to this line.';
                this.status(message); return;
            }
            const paidCount = targets.filter(target => ['openai','azure','elevenlabs','ttsmaker'].includes(m.speechProvider(target.scene.conversation))).length;
            const eleven = targets.some(target=>m.speechProvider(target.scene.conversation)==='elevenlabs');
            if (paidCount && !confirm(`Generate ${paidCount} selected line${paidCount === 1 ? '' : 's'} with the selected paid providers? This uses AI credits and may incur provider charges.${eleven?' Confirm you own each selected ElevenLabs voice or have permission to use it.':''} Completed lines are kept if another line fails.`)) return;
            const originalIndex = app.currentSceneIndex;
            let completed = 0;
            const failures = [];
            await this.perform('Generating selected speech...', async () => {
                try {
                    for (let i = 0; i < targets.length; i++) {
                        const target = targets[i];
                        if (m.controller.signal.aborted) break;
                        const index = app.scenes.indexOf(target.scene);
                        if (index < 0) { failures.push(`${target.sceneName}: scene was removed`); continue; }
                        if (app.currentSceneIndex !== index) {
                            app._saveCurrentScene();
                            await app._loadScene(index);
                        }
                        const scene = m.current();
                        const turn = scene.conversation?.turns.find(item => item.id === target.turnId);
                        if (!turn) { failures.push(`${scene.name}: dialogue row was removed`); continue; }
                        const actor = scene.conversation.cast.find(item => item.id === turn.speaker);
                        this.status(`Generating ${i + 1} of ${targets.length}: ${actor?.name || 'speaker'} · ${scene.name}`);
                        try {
                            await m.generate(turn.id, ['openai','azure','elevenlabs','ttsmaker'].includes(m.speechProvider(scene.conversation)), eleven);
                            completed++;
                            this.selectedTurns.delete(target.key);
                        } catch (error) {
                            if (error.name === 'AbortError') break;
                            failures.push(`${scene.name}: ${error.message}`);
                        }
                    }
                } finally {
                    if (app.currentSceneIndex !== originalIndex) {
                        app._saveCurrentScene();
                        await app._loadScene(originalIndex);
                    }
                }
                this.status(`Generated ${completed} of ${targets.length} line${targets.length === 1 ? '' : 's'}.${failures.length ? ` ${failures.length} failed: ${failures.slice(0, 2).join('; ')}` : ''}`);
            });
        }
        status(text) { this.modal.querySelector('[role="status"]').textContent = text; }
        speechStatus() {
            const provider = this.manager.speechProvider();
            if (provider === 'browser') return 'Browser voices: listen only. Existing timeline audio is unchanged; no lip sync or export audio is generated.';
            const capability = this.manager.speechCapabilities?.providers?.[provider];
            if (capability?.available) return provider === 'local' ? 'Local voice service ready. No AI credits required.' : `${privateSources[provider] || 'OpenAI'} voice service ready. Provider charges apply.${capability.reason?' '+capability.reason:''}`;
            return this.manager.speechCapabilitiesError || capability?.reason
                || 'Voice service availability could not be confirmed. Check the voice service again.';
        }
        setBusy(busy, label) {
            this.modal.querySelector('progress').hidden = !busy;
            this.modal.querySelector('[data-action="cancel"]').hidden = !busy;
            this.modal.querySelectorAll('button,input,select,textarea').forEach(el => {
                if (el.dataset.action === 'cancel') return;
                if (busy) { el.dataset.busyDisabled = String(el.disabled); el.disabled = true; }
                else if (el.dataset.busyDisabled !== undefined) {
                    el.disabled = el.dataset.busyDisabled === 'true'; delete el.dataset.busyDisabled;
                }
            });
            if (label) this.status(label);
        }
        async open() {
            this.previousFocus = document.activeElement;
            this.manager.app.animations.stop();
            this.modal.classList.remove('hidden');
            this.modal.querySelector('[data-action="close"]').focus();
            try {
                await this.manager.load();
                await this.manager.loadSpeechCapabilities();
                this.tab = this.manager.current()?.conversation ? 'dialogue' : 'templates';
                this.render();
            } catch (error) { this.status(error.message); }
        }
        close() {
            if (this.manager.busy) return;
            this.stopAudio();
            if (this.recorder?.state === 'recording') { this.discardRecording = true; this.recorder.stop(); }
            this.modal.classList.add('hidden'); this.previousFocus?.focus?.();
        }
        stopAudio() {
            this.audition?.pause(); this.audition = null; this.voicePreview?.pause();
            if(this.browserUtterance){this.browserUtterance=null;window.speechSynthesis?.cancel();}
        }
        preview() {
            if (this.manager.busy || this.recordingPending || this.recorder?.state === 'recording') return;
            const engine = this.manager.app.animations;
            engine.stop();
            this.close();
            engine.playAll();
        }
        render() {
            const main = this.modal.querySelector('main');
            const expandedDirections=new Set([...main.querySelectorAll('[data-turn] .conversation-line-direction[open]')].map(section=>section.closest('[data-turn]').dataset.turn));
            const scene = this.manager.current();
            this.modal.querySelector('[data-action="dialogue"]').disabled = !scene?.conversation;
            this.modal.querySelector('[data-action="staging"]').disabled = !scene?.conversation;
            this.modal.querySelector('[data-action="undo"]').disabled = !this.manager.undoStack.length;
            this.modal.querySelector('[data-action="redo"]').disabled = !this.manager.redoStack.length;
            this.modal.querySelectorAll('nav button').forEach(b => b.setAttribute('aria-current', b.dataset.action === this.tab ? 'page' : 'false'));
            if (this.tab === 'templates' || !scene?.conversation) {
                if (this.templateDraft) { this.renderTemplateDraft(); return; }
                const categories = [...new Set([...this.manager.templates, ...this.manager.saved].map(t => t.category))];
                main.innerHTML = `<div class="conversation-filters"><input data-search type="search" aria-label="Search templates" placeholder="Search templates" value="${escape(this.filter)}"><select data-category aria-label="Template category">${option('', 'All settings', this.category)}${categories.map(c => option(c,c,this.category)).join('')}</select></div><div class="conversation-grid"></div>`;
                this.renderLibraryResults(); return;
            }
            const data = scene.conversation;
            const provider = this.manager.speechProvider(data);
            const local = provider === 'local';
            const capability = this.manager.speechCapabilities?.providers?.[provider];
            const providerLabel = local ? 'Local server - no AI credits' : privateSources[provider]?privateSources[provider]+' - paid':provider==='browser'?'Browser - listen only':'OpenAI - paid';
            const voiceField = local?'localVoice':provider==='ttsmaker'?'ttsmakerVoice':provider==='elevenlabs'?'elevenVoice':provider==='azure'?'azureVoice':provider==='browser'?'browserVoice':'voice';
            if (this.tab === 'staging') { this.renderStaging(data); return; }
            const characters = this.manager.app.audioTimeline._getAvailableCharacters();
            const connected = data.cast.filter(actor => actor.rootId && !characters.some(c => c.id === actor.rootId)
                && this.manager.app.objects.getObjectById(actor.rootId));
            const characterOptions = [...characters, ...connected.map(actor => ({ id: actor.rootId, name: actor.name }))];
            const scenes = this.manager.app.scenes.filter(s => s.conversation?.groupId === data.groupId);
            main.innerHTML = `<div class="conversation-controls">
                <label>Scene<select data-scene>${scenes.map(s => option(s.id, s.name, scene.id)).join('')}</select></label>
                <label>Timing<select data-setting="timing">${option('ripple','Sequential',data.timing)}${option('fixed','Keep start times',data.timing)}</select></label>
                <label>Voice source<select data-setting="speechProvider">${option('local','Local server - no AI credits',provider)}${option('openai','OpenAI - paid',provider)}${this.privateSourceOptions(provider)}${option('browser','Browser voices - listen only',provider)}</select></label>
                <label><input type="checkbox" data-setting="captions" ${data.captions ? 'checked':''}> Captions</label>
                <label><input type="checkbox" data-setting="listening" ${data.listening ? 'checked':''}> Listening reactions</label>
                ${button('preview','play','Preview scene')}${button('save-template','floppy-disk','Save as my template')}
                ${button('scene-checks','clipboard-check','Check scene')}
                ${data.aiCamera?.length ? button('camera','video','Edit stage camera') : ''}
                <button data-action="generate-all" aria-describedby="conversation-voice-status" title="${escape(this.speechStatus())}" ${capability?.available ? '' : 'disabled'}><i class="fas fa-volume-high"></i> Generate changed in this scene</button>
            </div>
            ${data.aiCameraStatus ? `<p role="status">${escape(data.aiCameraStatus)}</p>` : ''}
            <p class="conversation-speech-support" id="conversation-voice-status" aria-live="polite">${escape(this.speechStatus())} ${local ? 'English voices. No child voice is installed; some model profiles do not specify gender or age.' : provider==='ttsmaker'?'English catalogue; Nigerian voices listed first. Provider quota applies.':provider==='elevenlabs'?'Private account voices. English generation; profile labels are supplied by the account, not independently verified.':provider==='openai'?'OpenAI voice profiles do not specify gender or age.':provider==='azure'?'Nigerian English: Ezinne and Abeo. Child voices: Ana (US), Maisie (UK). English only.':'Availability varies by device. Online voices send text to the browser speech service.'} ${button('check-voices','rotate','Refresh voices')}</p>
            <div class="conversation-voice-filters">
                <label>Language / accent<select data-voice-filter="lang">${option('','All',this.voiceFilters.lang)}${[...new Set(this.voices(provider).map(v=>v.lang || 'unknown'))].map(lang=>option(lang,lang==='unknown'?'Unspecified':lang,this.voiceFilters.lang)).join('')}</select></label>
                <label>Gender<select data-voice-filter="gender">${Object.entries({'':'All',female:'Female',male:'Male',unknown:'Unspecified'}).map(([v,l])=>option(v,l,this.voiceFilters.gender)).join('')}</select></label>
                <label>Age group<select data-voice-filter="age">${Object.entries({'':'All',child:'Child',adult:'Adult',unknown:'Unspecified'}).map(([v,l])=>option(v,l,this.voiceFilters.age)).join('')}</select></label>
                <label>Output<select data-voice-filter="export">${Object.entries({'':'All',export:'Exportable audio',listen:'Listen only'}).map(([v,l])=>option(v,l,this.voiceFilters.export)).join('')}</select></label>
            </div>
            <details class="conversation-cast" open><summary>Cast and voices</summary><div>${data.cast.map(actor => {
                const selectedVoice = this.manager.selectedVoice(actor,provider);
                return `<fieldset data-actor="${escape(actor.id)}"><legend>${escape(actor.name)}</legend>
                <label>Name<input data-cast="name" value="${escape(actor.name)}" maxlength="60"></label>
                <label>Character<select data-cast="rootId">${option('','Not connected',actor.rootId)}${characterOptions.map(c => option(c.id,c.name,actor.rootId)).join('')}</select></label>
                <label>Voice<select data-cast="${voiceField}">${this.voiceOptions(provider,selectedVoice)}</select></label>
                <p class="conversation-voice-profile">${escape(this.voiceProfile(provider, selectedVoice))}</p>
                <div class="conversation-turn-actions">${button('preview-voice','play','Listen to this speaker voice', provider==='browser' ? (this.browserVoices.some(v=>v.id===selectedVoice)?'':'disabled') : capability?.available && (!['elevenlabs','ttsmaker'].includes(provider) || this.voices(provider).some(v=>v.id===selectedVoice && v.ready)) ? '' : 'disabled')}${button('stop','stop','Stop listening')}</div>
                <label><input type="checkbox" data-cast="handsBusy" ${actor.handsBusy?'checked':''}> Hands occupied</label>${button('edit-character','user-pen','Edit character appearance')}</fieldset>`;
            }).join('')}</div></details>
            <section class="conversation-batch" aria-label="Batch dialogue generation">
                <div><strong>Batch generation</strong><span data-batch-count>${this.selectedTurns.size} row${this.selectedTurns.size === 1 ? '' : 's'} selected</span>
                    <p>Choose rows here or switch scenes; selected rows stay selected across scenes.</p></div>
                <div><button type="button" data-action="select-changed-scene">Select changed in this scene</button>
                    <button type="button" data-action="select-changed-all">Select changed in all scenes</button>
                    <button type="button" data-action="clear-batch" ${this.selectedTurns.size ? '' : 'disabled'}>Clear selection</button>
                    <button type="button" data-action="generate-selected" ${this.selectedTurns.size ? '' : 'disabled'}>Generate selected (${this.selectedTurns.size})</button></div>
            </section>
            <div class="conversation-turns">${data.turns.map((turn, index) => {
                const actor = data.cast.find(a => a.id === turn.speaker);
                const hasAudio = this.manager.app.audioTimeline.tracks.some(t => t.audioId === turn.audioId);
                const stale = this.manager.needsSpeechGeneration(turn, actor);
                const key = this.selectionKey(scene.id, turn.id);
                return `<article data-turn="${escape(turn.id)}"><div class="conversation-turn-top"><label class="conversation-batch-check"><input type="checkbox" data-batch-select data-selection-key="${escape(key)}" ${this.selectedTurns.has(key) ? 'checked' : ''}><span>Select</span></label><strong>${index + 1}</strong>
                    <select data-turn-field="speaker" aria-label="Speaker">${data.cast.map(a => option(a.id,a.name,turn.speaker)).join('')}</select>
                    <span>${hasAudio ? turn.source === 'sample' ? 'Sample audio' : stale ? 'Audio needs update' : turn.source === 'generated' ? 'AI-generated audio' : 'Audio ready' : 'No audio'}</span>
                    ${button('up','arrow-up','Move turn up',index===0?'disabled':'')}${button('down','arrow-down','Move turn down',index===data.turns.length-1?'disabled':'')}${button('delete','trash','Delete turn')}</div>
                    <textarea data-turn-field="text" maxlength="1800" aria-label="Dialogue text">${escape(turn.text)}</textarea>
                    <div class="conversation-turn-settings"><label>Spoken language<select data-turn-field="language">${Object.entries(ConversationTemplates.languages).map(([code,name])=>option(code,name,turn.language || 'en')).join('')}</select></label>
                    <label>Delivery<select data-turn-field="delivery" ${provider!=='openai' ? 'disabled' : ''}>${(provider!=='openai' ? ['natural'] : ['natural','calm','energetic','serious']).map(v=>option(v,v,provider!=='openai' ? 'natural' : turn.delivery)).join('')}</select></label>
                    <label>Speech speed<input data-turn-field="speed" type="number" min="0.75" max="1.25" step="0.05" value="${turn.speed}"></label>
                    <label>Pause (s)<input data-turn-field="pause" type="number" min="0" max="10" step="0.1" value="${turn.pause}"></label>
                    <label>Start (s)<input data-turn-field="startMs" type="number" min="0" max="3600" step="0.1" value="${((turn.startMs||0)/1000).toFixed(2)}" ${data.timing==='fixed'?'':'disabled'}></label>
                    <label><input type="checkbox" data-turn-field="gestures" ${turn.gestures?'checked':''}> Gestures</label>
                    <details class="conversation-line-direction" ${expandedDirections.has(turn.id)?'open':''}><summary>Direction and actions</summary><div class="conversation-turn-settings">
                    <label>Head turn<select data-turn-field="headTurn">${[['none','None'],['partner','Toward partner'],['viewer','Toward viewer']].map(([value,name])=>option(value,name,turn.headTurn||'none')).join('')}</select></label>
                    <label>Attention<select data-turn-field="attentionTarget">${option('','Automatic',turn.attentionTarget||'')}${data.cast.filter(a=>a.id!==turn.speaker).map(a=>option(a.id,a.name,turn.attentionTarget)).join('')}</select></label>
                    <label>Action<select data-turn-field="action">${[['none','None'],['wave','Wave'],['raise-hand','Raise hand'],['explain','Explain'],['nod','Nod'],['handoff','Hand over prop (side views)'],['turn-front','Turn front and return'],['turn-left','Turn left and return'],['turn-right','Turn right and return']].map(([v,n])=>option(v,n,turn.action||'none')).join('')}</select></label>
                    ${turn.action==='handoff'?`<label>Receiver<select data-turn-field="handoffTo">${data.cast.filter(a=>a.id!==turn.speaker).map(a=>option(a.id,a.name,turn.handoffTo)).join('')}</select></label><label>Prop<select data-turn-field="handoffProp">${[['notebook','Notebook'],['activity-folder','Document folder'],['activity-parcel','Small parcel']].map(([v,n])=>option(v,n,turn.handoffProp||'notebook')).join('')}</select></label>`:''}
                    ${turn.action==='handoff'?this.handoffFields(turn,data):''}
                    <label>Action timing<select data-turn-field="actionTiming">${['before','during','after'].map(v=>`<option value="${v}" ${(turn.actionTiming||(turn.action==='handoff'?'after':'before'))===v?'selected':''} ${turn.action==='handoff'&&v==='during'?'disabled':''}>${v}</option>`).join('')}</select></label>
                    <label>Action seconds<input data-turn-field="actionSeconds" type="number" min="${turn.action==='handoff'?2:.6}" max="8" step="0.1" value="${escape(turn.actionSeconds??(turn.action==='handoff'?3:2))}"></label>
                    </div></details>
                    <span>${((turn.durationMs||0)/1000).toFixed(1)} s</span></div>
                    <p class="conversation-speech-support">${local ? ((turn.language || 'en') === 'en' ? 'Local AI voice - no AI credits.' : 'No local voice installed for this language. Upload or record audio.') : provider==='browser'?'Browser listening does not replace this line\'s audio.':provider==='ttsmaker'?'TTSMaker - paid; English only. Provider character quota applies.':provider==='elevenlabs'?'ElevenLabs - paid; English only. Permission to use the selected voice is required.':provider==='azure'?'Azure Speech - paid; curated voices support English only.':((turn.language || 'en') === 'en' ? 'OpenAI voice - paid.' : 'OpenAI - paid; this language is unverified for TTS. Check pronunciation.')}</p>
                    <div class="conversation-turn-actions">${provider==='browser'?button('listen-browser','headphones','Listen to text with browser voice'):''}${button('play','play','Listen to audio')}${button('stop','stop','Stop audio')}${button('upload','upload','Upload replacement audio')}${button('record','microphone','Record audio')}${button('generate','volume-high',`Generate speech (${providerLabel})`, !capability?.available || (['local','azure','elevenlabs','ttsmaker'].includes(provider) && (turn.language || 'en') !== 'en') || ['elevenlabs','ttsmaker'].includes(provider) && !this.voices(provider).some(v=>v.id===this.manager.selectedVoice(actor,provider) && v.ready) ? 'disabled' : '')}</div></article>`;
            }).join('')}</div>
            <div class="conversation-bottom"><button data-action="add"><i class="fas fa-plus"></i> Add Turn</button></div>
            <details class="conversation-ai"><summary>AI dialogue draft</summary><textarea data-prompt aria-label="Conversation idea" maxlength="2000" placeholder="Conversation topic"></textarea><button data-action="ai"><i class="fas fa-wand-magic-sparkles"></i> Draft Dialogue</button><div data-ai-draft></div></details>`;
            this.updateBatchControls();
            const firstHandoff=data.turns.find(t=>t.action==='handoff');
            for(const row of this.modal.querySelectorAll('[data-turn]')){
                const turn=data.turns.find(t=>t.id===row.dataset.turn);
                if(turn?.action!=='handoff'||turn===firstHandoff)continue;
                row.querySelectorAll('[data-turn-field="handoffProp"],[data-turn-field="handoffScale"],[data-turn-field="handoffGiverGripX"],[data-turn-field="handoffGiverGripY"],[data-handoff-upload],[data-handoff-image],[data-action="handoff-reset"]').forEach(control=>{
                    control.disabled=true;control.title='Inherited from the previous exchange';
                });
            }
        }
        handoffFields(turn,data) {
            const giver=data.cast.find(a=>a.id===turn.speaker),receiver=data.cast.find(a=>a.id===turn.handoffTo);
            const right=(giver?.staging?.x??0)<(receiver?.staging?.x??1);
            const hands=[['front-hand','Near hand'],['back-hand','Far hand'],['left-hand','Left hand'],['right-hand','Right hand']];
            let fields=['Giver','Receiver'].map((role,i)=>`<label>${role} hand<select data-turn-field="handoff${role}Hand">${hands.map(([v,n])=>option(v,n,turn[`handoff${role}Hand`]||'front-hand')).join('')}</select></label>`+
                ['X','Y'].map(axis=>`<label>${role} grip ${axis} (%)<input data-turn-field="handoff${role}Grip${axis}" type="number" min="0" max="100" step="1" value="${escape(turn[`handoff${role}Grip${axis}`]??(axis==='Y'?68:(i===0?right:!right)?15:85))}"></label>`).join('')).join('');
            fields+=`<label>Prop scale<input data-turn-field="handoffScale" type="number" min="0.5" max="2" step="0.05" value="${escape(turn.handoffScale??1)}"></label><label>Upload prop<input data-handoff-upload type="file" accept="image/png,image/jpeg,image/webp"></label>`;
            fields+=`<label>Stage image (copy)<select data-handoff-image><option value="">Choose image</option>${this.manager.app.objects.objects.filter(o=>o.type==='image'&&o.imageSrc&&!o.joints?.length&&!o.sceneAsset?.conversationHandoff).map(o=>option(o.id,o.name||o.id,'')).join('')}</select></label>`;
            fields+=button('handoff-grips','crosshairs','Preview grip points')+button('handoff-reset','rotate-left','Reset prop and grips');
            if(turn.handoffArtwork)fields+=`<span>${escape(turn.handoffArtwork.name)}</span>`;
            return fields;
        }
        renderStaging(data) {
            const draft = Utils.deepClone(data);
            this.manager.staging.initialize(draft);
            this.stagingDraft = draft;
            const pick = (field, values, selected) => `<select data-stage-field="${field}">${Object.entries(values).map(([key,label]) => option(key,label,selected)).join('')}</select>`;
            this.modal.querySelector('main').innerHTML = `<div class="conversation-controls">
                <label>Layout<select data-layout>${Object.entries(ConversationStaging.layouts).map(([key,label]) => option(key,label,draft.layout)).join('')}</select></label>
                <button data-action="apply-staging"><i class="fas fa-check"></i> Apply Staging</button>
                ${button('preview','play','Preview scene')}
            </div><div class="conversation-staging-cast">${draft.cast.map(actor => {
                const s = actor.staging;
                const speaks = draft.turns.some(turn => turn.speaker === actor.id);
                const ambient = s.view.startsWith('side-')
                    ? { idle: 'Stay in place', 'walk-right': 'Walk across right', 'walk-left': 'Walk across left' }
                    : { idle: 'Stay in place' };
                return `<fieldset data-stage-actor="${escape(actor.id)}"><legend>${escape(actor.name)} <small>${speaks ? 'Speaker' : 'Background character'}</small></legend>
                    <label>View${pick('view',ConversationStaging.views,s.view)}</label>
                    <label>Posture${pick('posture',{standing:'Standing',seated:'Seated'},s.posture)}</label>
                    <label>Seat${pick('seat',{chair:'Chair',bench:'Bench',none:'Existing seat / none'},s.seat)}</label>
                    <label>Activity${pick('activity',ConversationStaging.activities,s.activity)}</label>
                    <label>When others speak${pick('reaction',{nod:'Look and nod', 'raise-hand':'Wave / raise a hand',idle:'Stay still'},s.reaction || 'nod')}</label>
                    <label>Background movement${pick('ambientMovement',ambient,s.ambientMovement || 'idle')}</label>
                    <label>Entrance${pick('entrance',{none:'Already in position',walk:'Walk in',sit:'Sit down','walk-sit':'Walk in and sit'},s.entrance)}</label>
                    <label>Exit${pick('exit',{none:'Stay in position',walk:'Walk away',stand:'Stand up','stand-walk':'Stand and walk away'},s.exit)}</label>
                    <label>Body turn after dialogue${pick('closingTurn',{none:'None',front:'Face front',back:'Face back','side:right':'Face right','side:left':'Face left'},s.closingTurn||'none')}</label>
                    <label><input data-stage-field="pauseForSpeech" type="checkbox" ${s.pauseForSpeech!==false?'checked':''}> Pause activity while speaking</label>
                    <label>Walking time (s)<input data-stage-field="actionSeconds" type="number" min="1.5" max="8" step="0.1" value="${escape(s.actionSeconds)}"></label>
                    <label><span>Travel (<output>${escape(s.distance)}</output>% of stage)</span><input data-stage-field="distance" type="range" min="5" max="25" step="1" value="${escape(s.distance)}"></label>
                </fieldset>`;
            }).join('')}</div>`;
            for (const actor of draft.cast) {
                const rig = this.manager.rigFor(actor.rootId);
                if (!rig || rig.root._svgCharacter) continue;
                const field = [...this.modal.querySelectorAll('[data-stage-actor]')].find(el => el.dataset.stageActor === actor.id);
                field.querySelectorAll('[data-stage-field="view"] option').forEach(option => { option.disabled = option.value.startsWith('back'); });
            }
        }
        renderLibraryResults() {
            const grid = this.modal.querySelector('.conversation-grid');
            if (!grid) return;
            const templates = [...this.manager.templates, ...this.manager.saved].filter(t =>
                (!this.category || t.category === this.category) && `${t.name} ${t.category}`.toLowerCase().includes(this.filter.toLowerCase()));
            const propNames = new Map(Object.values(BUILTIN_PROP_LIBRARY.items).flat().map(item => [item.id, item.name]));
            grid.innerHTML = templates.map(t => {
                const set = BUILTIN_PROP_LIBRARY.scenes.find(s => s.id === t.scenes[0].set);
                const image = set ? 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(BUILTIN_PROP_LIBRARY.sceneSvg(set)) : '';
                const scenePreview = t.scenes.map(scene => {
                    const sceneSet = BUILTIN_PROP_LIBRARY.scenes.find(item => item.id === scene.set);
                    const layout = ConversationStaging.layouts[scene.layout] || 'Template staging';
                    const props = (sceneSet?.pieces || []).map(piece => propNames.get(piece.propId)).filter(Boolean);
                    const dialogue = scene.turns.slice(0, 2).map(source => {
                        const turn = Array.isArray(source) ? { speaker: source[0], text: source[1] } : source;
                        const speaker = t.cast.find(actor => actor.id === turn.speaker)?.name || turn.speaker;
                        return `<p><strong>${escape(speaker)}:</strong> ${escape(turn.text)}</p>`;
                    }).join('');
                    return `<li><strong>${escape(scene.name)}</strong><span>${escape(sceneSet?.name || scene.set)} · ${escape(layout)}</span>${props.length ? `<span>Scene props: ${escape([...new Set(props)].join(', '))}</span>` : ''}${dialogue}</li>`;
                }).join('');
                const previewControls = `<label>Motion preview<select data-preview-scene>${t.scenes.map((scene,index)=>option(String(index),scene.name,'0')).join('')}</select></label><button data-action="template-preview" data-template="${escape(t.id)}"><i class="fas fa-play"></i> Silent motion preview</button>`;
                const audioNote = previewControls + (t.audioMode === 'generate'
                    ? '<p class="conversation-template-audio">Dialogue is included as text. Generate matching voice audio after creation.</p>'
                    : '<p class="conversation-template-audio">Includes sample audio. Generate speech after editing the dialogue.</p>');
                const hasQuickVersion = t.scenes.every(scene => Array.isArray(scene.quickTurns) && scene.quickTurns.length > 0);
                const castNames = t.cast.map(actor => actor.name).join(', ');
                const speakers = new Set(t.scenes.flatMap(scene => (scene.turns || []).map(turn => Array.isArray(turn) ? turn[0] : turn.speaker))).size;
                return `<article><img src="${escape(image)}" alt="${escape(t.name)} setting"><h3>${escape(t.name)}</h3><p>${t.cast.length} characters · ${speakers} speaking · ${t.scenes.length} scene${t.scenes.length===1?'':'s'}</p><p class="conversation-template-cast">Cast: ${escape(castNames)}</p>${t.summary ? `<p class="conversation-template-summary">${escape(t.summary)}</p>` : ''}<details class="conversation-template-preview"><summary>Preview scenes and dialogue</summary><ol>${scenePreview}</ol>${audioNote}${hasQuickVersion ? '<p class="conversation-template-audio">A shorter version is also available; it generates speech for the shortened lines.</p>' : ''}</details>${hasQuickVersion ? `<label>Dialogue length<select data-template-length>${option('full','Full conversation','full')}${option('quick','Quick conversation','full')}</select></label>` : ''}<label>Layout<select data-template-layout>${option('','Template staging','')}${Object.entries(ConversationStaging.layouts).map(([key,label])=>option(key,label,'')).join('')}</select></label><div class="conversation-template-actions"><button data-action="customize" data-template="${escape(t.id)}"><i class="fas fa-sliders"></i> Customize</button><button data-action="create" data-template="${escape(t.id)}"><i class="fas fa-plus"></i> Create Conversation</button></div></article>`;
            }).join('') || '<p>No matching templates.</p>';
        }
        renderTemplateDraft() {
            const main = this.modal.querySelector('main');
            const draft = this.templateDraft;
            const props = Object.values(BUILTIN_PROP_LIBRARY.items).flat();
            const presets = SvgAfricanCharacterCatalog.listPresets();
            const sets = BUILTIN_PROP_LIBRARY.scenes;
            main.innerHTML = `<div class="conversation-template-editor-head"><button data-action="cancel-customize"><i class="fas fa-arrow-left"></i> Templates</button><div><h3>Customize ${escape(draft.name)}</h3><p>Adjust the cast, scene setup, props and dialogue before creating anything.</p></div><button data-action="create-customized"><i class="fas fa-plus"></i> Create scenes</button></div>
                <label>Conversation title<input data-draft="name" value="${escape(draft.name)}" maxlength="80"></label>
                <section class="conversation-template-cast-edit"><h3>Cast and roles</h3>${draft.cast.map(actor => `<fieldset data-draft-actor="${escape(actor.id)}"><legend>${escape(actor.id)}</legend><label>Speaker name / role<input data-draft-cast="name" value="${escape(actor.name)}" maxlength="60"></label><label>Character style<select data-draft-cast="preset">${presets.map(preset => option(preset.id,preset.name,actor.preset)).join('')}</select></label></fieldset>`).join('')}</section>
                <section class="conversation-template-scenes">${draft.scenes.map((scene, sceneIndex) => {
                    const set = sets.find(item => item.id === scene.set);
                    const availableProps = (set?.pieces || []).map(piece => props.find(prop => prop.id === piece.propId)).filter(Boolean);
                    const allowed = Array.isArray(scene.propIds) ? scene.propIds : availableProps.map(prop => prop.id);
                    return `<fieldset data-draft-scene="${sceneIndex}"><legend>Scene ${sceneIndex + 1}</legend><div class="conversation-template-scene-fields"><label>Scene name<input data-draft-scene-field="name" value="${escape(scene.name)}" maxlength="80"></label><label>Setting<select data-draft-scene-field="set">${sets.map(item => option(item.id,item.name,scene.set)).join('')}</select></label><label>Layout<select data-draft-scene-field="layout">${option('','Template staging',scene.layout || '')}${Object.entries(ConversationStaging.layouts).map(([key,label])=>option(key,label,scene.layout || '')).join('')}</select></label><label class="conversation-template-check"><input type="checkbox" data-draft-scene-field="seated" ${scene.seated?'checked':''}> Seated scene</label></div><div class="conversation-template-props"><strong>Set props</strong>${availableProps.map(prop => `<label><input type="checkbox" data-draft-prop="${escape(prop.id)}" ${allowed.includes(prop.id)?'checked':''}> ${escape(prop.name)}</label>`).join('') || '<span>No selectable props for this setting.</span>'}</div><div class="conversation-template-lines"><strong>Dialogue</strong>${scene.turns.map((source, turnIndex) => { const turn = Array.isArray(source) ? { speaker: source[0], text: source[1] } : source; return `<div class="conversation-template-line" data-draft-turn="${turnIndex}"><select data-draft-turn-field="speaker" aria-label="Speaker">${draft.cast.map(actor => option(actor.id,actor.name,turn.speaker)).join('')}</select><textarea data-draft-turn-field="text" maxlength="1800" aria-label="Dialogue">${escape(turn.text)}</textarea><button data-action="remove-draft-turn" title="Remove dialogue line" aria-label="Remove dialogue line"><i class="fas fa-trash"></i></button></div>`; }).join('')}<button data-action="add-draft-turn"><i class="fas fa-plus"></i> Add dialogue line</button></div></fieldset>`;
                }).join('')}</section>`;
            if (typeof AiScenePlan !== 'undefined') AiScenePlan.renderEditor(this);
        }
        async perform(label, work) {
            try {
                this.stopAudio();
                await this.manager.run(label, work);
                if (this.modal.querySelector('[role="status"]').textContent === label) this.status(/voice/i.test(label) ? 'Voice preview finished.' : 'Updated.');
                return true;
            }
            catch (error) { this.status(error.name === 'AbortError' ? 'Cancelled. Existing audio retained.' : error.message); return false; }
        }
        async change(input) {
            if(input.dataset.voiceFilter){this.voiceFilters[input.dataset.voiceFilter]=input.value;this.render();return;}
            if(input.dataset.setting==='speechProvider' || input.dataset.cast || input.matches('[data-scene]')) this.stopAudio();
            if(input.dataset.setting==='speechProvider') this.voiceFilters={lang:'',gender:'',age:'',export:''};
            const m = this.manager;
            if (this.recorder?.state === 'recording') { this.status('Stop the recording before editing dialogue.'); this.render(); return; }
            if (input.matches('[data-draft-cast],[data-draft-scene-field],[data-draft-turn-field],[data-draft-prop]')) {
                this.updateTemplateDraft(input);
                return;
            }
            if (input.matches('[data-upload]')) {
                const file = input.files[0], turnId = this.uploadTurn;
                input.value = '';
                if (file) await this.perform('Importing audio...', () => m.replaceAudio(turnId,file));
                return;
            }
            if (input.matches('[data-batch-select]')) {
                const key = input.dataset.selectionKey;
                if (input.checked) this.selectedTurns.add(key);
                else this.selectedTurns.delete(key);
                this.updateBatchControls(); return;
            }
            if (input.matches('[data-category]')) { this.category = input.value; this.renderLibraryResults(); return; }
            if (input.matches('[data-layout]')) {
                const draft = this.stagingDraft;
                m.staging.chooseLayout(draft, input.value);
                this.renderStaging(draft); return;
            }
            if (input.matches('[data-stage-field]')) {
                const actor = this.stagingDraft.cast.find(a => a.id === input.closest('[data-stage-actor]').dataset.stageActor);
                actor.staging[input.dataset.stageField] = input.type === 'checkbox' ? input.checked : ['number','range'].includes(input.type) ? Number(input.value) : input.value;
                return;
            }
            if (input.matches('[data-scene]')) {
                await this.perform('Opening scene...', async () => {
                    m.app._saveCurrentScene(); await m.app._loadScene(m.app.scenes.findIndex(s=>s.id===input.value));
                }); return;
            }
            if(input.matches('[data-handoff-upload],[data-handoff-image]')){
                const file=input.files?.[0],id=input.closest('[data-turn]').dataset.turn,scene=m.current();
                const source=input.matches('[data-handoff-image]')?m.app.objects.getObjectById(input.value):null;
                if(!file&&!source)return;
                await this.perform('Preparing handoff prop...',async()=>{
                    if(file&&(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>10*1024*1024))throw Error('Choose a PNG, JPEG or WebP image under 10 MB.');
                    const url=file?URL.createObjectURL(file):source.imageSrc;
                    try{
                        const src=await m.app.jointSystem._sequencePropImage(url),image=new Image();image.src=src;await image.decode();
                        if(m.current()!==scene)throw Error('The scene changed. Upload the prop again.');
                        await m.edit(data=>{const turn=data.turns.find(t=>t.id===id);if(!turn)throw Error('This dialogue line was removed.');
                            turn.handoffArtwork={src,name:file?.name||source.name||'Custom prop',width:image.naturalWidth,height:image.naturalHeight};});
                    }finally{if(file)URL.revokeObjectURL(url);}
                });return;
            }
            if (!input.dataset.setting && !input.dataset.cast && !input.dataset.turnField) return;
            const value = input.type === 'checkbox' ? input.checked : input.type === 'number' ? Number(input.value) : input.value;
            await this.perform('Updating dialogue...', () => m.edit(data => {
                if (input.dataset.setting) data[input.dataset.setting] = value;
                if (input.dataset.cast) {
                    const actor = data.cast.find(a => a.id === input.closest('[data-actor]').dataset.actor);
                    if (input.dataset.cast === 'rootId' && data.cast.some(a => a !== actor && a.rootId === value)) throw new Error('Each speaker needs a different character.');
                    actor[input.dataset.cast] = value;
                }
                if (input.dataset.turnField) {
                    const turn = data.turns.find(t => t.id === input.closest('[data-turn]').dataset.turn);
                    const field = input.dataset.turnField;
                    if (field === 'language' && !Object.hasOwn(ConversationTemplates.languages, value)) throw new Error('Choose an available spoken language.');
                    if (field === 'headTurn' && !['none','partner','viewer'].includes(value)) throw new Error('Choose a valid head turn.');
                    if (field === 'text' && !String(value).trim()) throw new Error('Enter dialogue text.');
                    if (input.type === 'number' && (!Number.isFinite(value) || value < Number(input.min) || value > Number(input.max))) throw new Error('Enter a value within the displayed range.');
                    turn[field] = field === 'startMs' ? value * 1000 : value;
                    if(field==='action'&&value==='handoff'){
                        turn.actionTiming='after';turn.actionSeconds=3;turn.handoffProp||='notebook';
                        if(!data.cast.some(a=>a.id===turn.handoffTo&&a.id!==turn.speaker))turn.handoffTo=data.cast.find(a=>a.id!==turn.speaker)?.id||'';
                    }
                    if(field==='speaker'&&turn.attentionTarget===value)turn.attentionTarget='';
                }
            }));
            if(input.dataset.setting==='speechProvider' && ['elevenlabs','ttsmaker'].includes(value)) {
                await this.perform('Loading '+privateSources[value]+' voices...',()=>m.loadSpeechCapabilities());
            }
        }
        async action(action, turnId, control) {
            const m = this.manager;
            if(action==='scene-checks'){
                const notes=m.sceneChecks();
                const panel=document.createElement('dialog');panel.className='conversation-checks';
                const title=document.createElement('h3');title.textContent='Scene checks';panel.append(title);
                for(const note of notes.length?notes:['No issues found by these placement and audio checks.']){const p=document.createElement('p');p.textContent=note;panel.append(p);}
                const close=document.createElement('button');close.textContent='Close';close.onclick=()=>{panel.close();panel.remove();};panel.append(close);panel.oncancel=()=>panel.remove();document.body.append(panel);panel.showModal();return;
            }
            if(action==='template-preview'){
                const template=[...m.templates,...m.saved].find(t=>t.id===control.dataset.template);
                const index=Number(control.closest('article').querySelector('[data-preview-scene]').value);
                await this.perform('Preparing silent motion preview...',async()=>{
                    const html=await m.previewTemplate(template,index);
                    const panel=document.createElement('dialog');panel.className='conversation-motion-preview';
                    const title=document.createElement('h3');title.textContent='Silent motion preview';
                    const frame=document.createElement('iframe');frame.title=template.name;frame.name=Utils.generateId('conversation-preview');
                    const close=document.createElement('button');close.textContent='Close';close.onclick=()=>{panel.close();panel.remove();};panel.oncancel=()=>panel.remove();
                    panel.append(title,frame,close);document.body.append(panel);panel.showModal();
                    const token=window.__STAGE_USER?.csrf_token;
                    if(token){
                        // Use the existing preview endpoint so the embedded runtime gets
                        // the preview CSP rather than inheriting the stage's nonce policy.
                        const form=document.createElement('form');form.method='POST';form.action='api/preview.php';form.target=frame.name;form.hidden=true;
                        for(const [name,value] of [['csrf_token',token],['html',html]]){const field=document.createElement('textarea');field.name=name;field.value=value;form.append(field);}
                        document.body.append(form);
                        try{form.submit();}finally{form.remove();}
                    }else frame.srcdoc=html;
                });return;
            }
            if (action === 'cancel') { m.controller?.abort(); return; }
            if (m.busy) return;
            if (this.recorder?.state === 'recording' && !['record','close'].includes(action)) {
                this.status('Stop the recording before editing dialogue.'); return;
            }
            if (action === 'close') { this.close(); return; }
            if (action === 'check-voices') {
                this.refreshBrowserVoices();
                await this.perform('Checking voice service...', () => m.loadSpeechCapabilities());
                this.status(this.speechStatus()); return;
            }
            if (['templates','dialogue','staging'].includes(action)) { this.stopAudio();this.tab=action; this.render(); return; }
            if (action === 'customize') {
                const source = [...m.templates,...m.saved].find(item => item.id === control.dataset.template);
                this.templateDraft = Utils.deepClone(source);
                const card = control.closest('article');
                const length = card.querySelector('[data-template-length]')?.value || 'full';
                if (length === 'quick') {
                    this.templateDraft.scenes.forEach(scene => { scene.turns = scene.quickTurns || scene.turns; delete scene.quickTurns; });
                    this.templateDraft.audioMode = 'generate';
                } else this.templateDraft.scenes.forEach(scene => { delete scene.quickTurns; });
                const layout = card.querySelector('[data-template-layout]')?.value;
                if (layout) this.templateDraft.scenes.forEach(scene => { scene.layout = layout; delete scene.staging; });
                this.render(); return;
            }
            if (action === 'cancel-customize') { this.templateDraft = null; this.render(); return; }
            if (action === 'add-draft-turn') {
                const scene = this.templateDraft?.scenes[Number(control.closest('[data-draft-scene]').dataset.draftScene)];
                if (scene && this.templateDraft.cast.length) { scene.turns.push({ speaker: this.templateDraft.cast[0].id, text: '' }); this.renderTemplateDraft(); }
                return;
            }
            if (action === 'remove-draft-turn') {
                const scene = this.templateDraft?.scenes[Number(control.closest('[data-draft-scene]').dataset.draftScene)];
                if (scene) { scene.turns.splice(Number(control.closest('[data-draft-turn]').dataset.draftTurn), 1); this.renderTemplateDraft(); }
                return;
            }
            if (action === 'create-customized') {
                if (!this.templateDraft?.scenes.every(scene => (scene.turns.length || this.templateDraft._aiScenePlan) && scene.turns.every(turn => String(Array.isArray(turn) ? turn[1] : turn.text || '').trim()))) {
                    this.status('Each scene needs at least one complete dialogue line.'); return;
                }
                const draft = this.templateDraft;
                this.selectedTurns.clear();
                if (await this.perform('Creating conversation...', () => m.create(draft))) {
                    this.templateDraft = null;
                    this.tab = 'dialogue';
                    this.render();
                }
                return;
            }
            if (action === 'create') {
                this.selectedTurns.clear();
                const t=Utils.deepClone([...m.templates,...m.saved].find(t=>t.id===control.dataset.template));
                const length=control.closest('article').querySelector('[data-template-length]')?.value || 'full';
                if (length === 'quick') {
                    t.scenes.forEach(scene => { scene.turns = scene.quickTurns; delete scene.quickTurns; });
                    t.audioMode = 'generate';
                } else t.scenes.forEach(scene => { delete scene.quickTurns; });
                const layout=control.closest('article').querySelector('[data-template-layout]').value;
                if (layout) t.scenes.forEach(scene=>{scene.layout=layout;delete scene.staging;});
                if (layout) t.cast.forEach(actor=>{delete actor.staging;});
                await this.perform('Creating conversation...',()=>m.create(t)); return;
            }
            if (action === 'undo' || action === 'redo') { await this.perform('Restoring dialogue...',()=>m.undo(action==='redo')); return; }
            if (action === 'upload') { this.uploadTurn=turnId; this.modal.querySelector('[data-upload]').click(); return; }
            if (action === 'stop') { this.stopAudio(); return; }
            const data = m.current()?.conversation;
            if (!data) return;
            if(action==='handoff-reset'){
                await this.perform('Resetting handoff fit...',()=>m.edit(draft=>{
                    const turn=draft.turns.find(t=>t.id===turnId);
                    for(const key of ['handoffArtwork','handoffScale','handoffGiverGripX','handoffGiverGripY','handoffReceiverGripX','handoffReceiverGripY'])delete turn[key];
                }));return;
            }
            if(action==='handoff-grips'){
                const turn=data.turns.find(t=>t.id===turnId),item=Object.values(BUILTIN_PROP_LIBRARY.items).flat().find(p=>p.id===(turn.handoffProp||'notebook'));
                const right=data.cast.find(a=>a.id===turn.speaker)?.staging.x<data.cast.find(a=>a.id===turn.handoffTo)?.staging.x;
                const dialog=document.createElement('dialog'),surface=document.createElement('div'),image=new Image();
                const heading=document.createElement('h3');heading.textContent='Handoff grip points';dialog.append(heading);
                surface.style.cssText='position:relative;width:320px;max-width:70vw;margin:20px auto';
                image.src=turn.handoffArtwork?.src||'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(item.svg);
                image.alt='Handoff prop';image.style.cssText='display:block;width:100%;height:auto';surface.append(image);
                for(const [i,role]of ['Giver','Receiver'].entries()){
                    const marker=document.createElement('span');marker.textContent=i?'R':'G';marker.title=role+' grip';
                    const x=turn[`handoff${role}GripX`]??((i===0?right:!right)?15:85),y=turn[`handoff${role}GripY`]??68;
                    marker.style.cssText=`position:absolute;left:${x}%;top:${y}%;transform:translate(-50%,-50%);border:2px solid white;border-radius:50%;width:24px;height:24px;text-align:center;background:${i?'#166534':'#9f1239'};color:white`;
                    surface.append(marker);
                }
                const close=document.createElement('button');close.textContent='Close';close.onclick=()=>{dialog.close();dialog.remove();};
                dialog.append(surface,close);dialog.oncancel=()=>dialog.remove();document.body.append(dialog);dialog.showModal();return;
            }
            if (action === 'apply-staging' || (action === 'preview' && this.tab === 'staging')) {
                const draft = Utils.deepClone(this.stagingDraft);
                const existing = Utils.deepClone(data);
                m.staging.initialize(existing);
                if (existing.layout === draft.layout && existing.cast.every(actor =>
                    JSON.stringify(actor.staging) === JSON.stringify(draft.cast.find(a => a.id === actor.id)?.staging))) {
                    if (action === 'preview') this.preview();
                    else this.status('Staging is unchanged.');
                    return;
                }
                const success = await this.perform('Arranging conversation...', () => m.edit(async data => {
                    const arrange = data.layout !== draft.layout;
                    const changed = data.cast.filter(actor => arrange || JSON.stringify(actor.staging) !== JSON.stringify(draft.cast.find(a => a.id === actor.id).staging));
                    data.layout = draft.layout;
                    data.cast.forEach(actor => { actor.staging = draft.cast.find(a => a.id === actor.id).staging; });
                    await m.staging.apply(data, changed, arrange);
                }));
                if (success && action === 'preview') this.preview();
                return;
            }
            if (action === 'edit-character') {
                const actor = data.cast.find(a => a.id === control.closest('[data-actor]').dataset.actor);
                const rig = m.rigFor(actor?.rootId);
                if (!rig?.root?._svgCharacter) { this.status('Use the character controls on stage to edit this character.'); return; }
                this.close(); m.app.openSvgAfricanCharacterLibrary({ mode: 'edit', armature: rig }); return;
            }
            if (action === 'camera') {
                this.close();m.app.stageCamera?.enter();return;
            }
            if (action === 'preview-voice') {
                const actorId = control.closest('[data-actor]')?.dataset.actor;
                if (actorId) await this.previewVoice(actorId);
                return;
            }
            if (action === 'select-changed-scene' || action === 'select-changed-all') {
                const scenes = action === 'select-changed-scene' ? [m.current()]
                    : m.app.scenes.filter(candidate => candidate.conversation?.groupId === data.groupId);
                for (const candidate of scenes) for (const candidateTurn of candidate.conversation.turns) {
                    const speaker = candidate.conversation.cast.find(actor => actor.id === candidateTurn.speaker);
                    if (m.needsSpeechGeneration(candidateTurn, speaker, candidate)) {
                        this.selectedTurns.add(this.selectionKey(candidate.id, candidateTurn.id));
                    }
                }
                this.render(); this.status(`${this.selectedTurns.size} dialogue row${this.selectedTurns.size === 1 ? '' : 's'} selected.`); return;
            }
            if (action === 'clear-batch') { this.selectedTurns.clear(); this.render(); this.status('Batch selection cleared.'); return; }
            const turn = data.turns.find(t=>t.id===turnId);
            if(action==='listen-browser'){this.listenBrowser(turn.speaker,turn);return;}
            if (action === 'play') {
                this.stopAudio(); const track=m.app.audioTimeline.tracks.find(t=>t.audioId===turn.audioId);
                if (!track) { this.status('Generate or upload audio for this turn.'); return; }
                this.audition=new Audio(track.audioDataUrl); this.audition.currentTime=track.trimStartMs/1000;
                this.audition.ontimeupdate=()=>{if(this.audition?.currentTime>=track.trimEndMs/1000)this.stopAudio();};
                this.audition.play().catch(e=>this.status(e.message)); return;
            }
            if (action === 'preview') { this.preview(); return; }
            if (action === 'record') { await this.record(turnId,control); return; }
            if (action === 'generate' || action === 'generate-all' || action === 'generate-selected') {
                let targets;
                if (action === 'generate') targets = [{ scene: m.current(), sceneName: m.current().name, turn, turnId: turn.id,
                    key: this.selectionKey(m.current().id, turn.id) }];
                else if (action === 'generate-all') targets = data.turns
                    .filter(item => m.needsSpeechGeneration(item, data.cast.find(actor => actor.id === item.speaker)))
                    .map(item => ({ scene: m.current(), sceneName: m.current().name, turn: item, turnId: item.id,
                        key: this.selectionKey(m.current().id, item.id) }));
                else targets = m.app.scenes.filter(candidate => candidate.conversation?.groupId === data.groupId)
                    .flatMap(candidate => candidate.conversation.turns.filter(item => this.selectedTurns.has(this.selectionKey(candidate.id, item.id)))
                        .map(item => ({ scene: candidate, sceneName: candidate.name, turn: item, turnId: item.id,
                            key: this.selectionKey(candidate.id, item.id) })));
                if (!targets.length) { this.status(action === 'generate-selected' ? 'Select one or more dialogue rows first.' : 'All dialogue audio is current.'); return; }
                await this.generateBatch(targets); return;
            }
            if (action === 'save-template') {
                const name=prompt('Template name',m.current().name); if(name)await this.perform('Saving template...',async()=>{await m.saveTemplate(name);this.status('Saved in My templates on this browser.');});return;
            }
            if (action === 'ai') {
                const promptText=this.modal.querySelector('[data-prompt]').value.trim();
                if(!promptText || !confirm('Send this topic and cast names to your configured AI provider? AI credits and provider charges may apply.'))return;
                this.aiTurns=null;
                await this.perform('Drafting dialogue...',async()=>{this.aiTurns=await m.aiDraft(promptText);});
                if(this.aiTurns){this.modal.querySelector('.conversation-ai').open=true;this.modal.querySelector('[data-ai-draft]').innerHTML=this.aiTurns.map(t=>`<p><strong>${escape(data.cast.find(a=>a.id===t.speaker)?.name)}:</strong> ${escape(t.text)}</p>`).join('')+'<button data-action="append-draft">Append Draft Turns</button>'; }return;
            }
            await this.perform('Updating dialogue...',()=>m.edit(async data=>{
                const index=data.turns.findIndex(t=>t.id===turnId);
                if(action==='add')data.turns.push({id:Utils.generateId('turn'),speaker:data.cast[0].id,text:'New dialogue line.',pause:.45,speed:1,delivery:'natural',gestures:true});
                if(action==='append-draft'&&this.aiTurns){data.turns.push(...this.aiTurns);this.aiTurns=null;}
                if(action==='up'&&index>0)[data.turns[index-1],data.turns[index]]=[data.turns[index],data.turns[index-1]];
                if(action==='down'&&index<data.turns.length-1)[data.turns[index+1],data.turns[index]]=[data.turns[index],data.turns[index+1]];
                if(action==='delete'){
                    const audio=m.app.audioTimeline; audio.tracks=audio.tracks.filter(t=>t.audioId!==turn.audioId);
                    audio._applyActiveTrack(audio.tracks[0]||null); data.turns.splice(index,1);
                }
            }));
        }
        async record(turnId, control) {
            if (this.recorder?.state==='recording') { this.recorder.stop(); return; }
            if (this.recordingPending) return;
            this.recordingPending=true;
            let stream;
            try {
                const scene=this.manager.current();
                stream=await navigator.mediaDevices.getUserMedia({audio:true});
                if (scene !== this.manager.current() || this.modal.classList.contains('hidden')) {
                    stream.getTracks().forEach(t=>t.stop()); return;
                }
                this.discardRecording=false;
                const recorder=new MediaRecorder(stream); this.recorder=recorder;
                const chunks=[]; recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
                const timeout=setTimeout(()=>{if(recorder.state==='recording')recorder.stop();},120000);
                recorder.onerror=()=>{
                    this.discardRecording=true;clearTimeout(timeout);stream.getTracks().forEach(t=>t.stop());
                    this.status('Recording failed. Existing audio retained.');
                };
                recorder.onstop=()=>{
                    clearTimeout(timeout);stream.getTracks().forEach(t=>t.stop());this.recorder=null;
                    if(this.discardRecording||scene!==this.manager.current()){this.status('Recording discarded.');return;}
                    void this.perform('Importing recording...',()=>this.manager.replaceAudio(turnId,new Blob(chunks,{type:recorder.mimeType}),'recorded'));
                };
                recorder.start(); control.innerHTML='<i class="fas fa-stop"></i>'; control.title='Stop recording';
                control.setAttribute('aria-label','Stop recording');
                this.status('Recording. Select the stop button to finish.');
            } catch(error){stream?.getTracks().forEach(t=>t.stop());this.status(error.message);}
            finally{this.recordingPending=false;}
        }
    }
    window.ConversationEditor=ConversationEditor;
})();
