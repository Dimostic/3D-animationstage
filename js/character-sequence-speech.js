/* Step links coordinate existing audio rows and lip-sync clips without owning body motion. */
(() => {
    const clone = value => Utils.deepClone(value);
    const audio = () => window.app?.audioTimeline;
    const lipSync = () => window.app?.audioLipSync;
    const configs = track => (Array.isArray(track.generated) ? track.generated : [track.generated]).filter(Boolean);
    const speechConfigs = track => configs(track).filter(config => config.type === 'audio-lip-sync');
    Object.assign(JointSystem.prototype, {
        _sequenceSpeechSteps(steps) { return steps.flatMap(step=>[step,...(step.kind==='travel-route'?step.route?.points||[]:[])]); },
        _sequenceCaptionUpdateStatus(audioId, text, replace = false) {
            const caption=this._sequenceCaptionForAudio(audioId);
            if(!caption)return 'New captions';
            if(replace)return 'Replace caption text and translations';
            if(caption.captionStale)return 'Audio changed; caption timing review required';
            const plain=value=>String(value||'').replace(/\s+/g,' ').trim();
            const source=caption.captionProfile?.sequenceGeneratedText;
            const edited=source==null||caption.segments.some(c=>c.edited||c.secondary||c.reviewed)
                ||plain(caption.segments.map(c=>c.text).join(' '))!==plain(source);
            if(edited)return plain(text)&&plain(text)!==plain(source)?'Speech changed; edited captions preserved - review required':'Edited captions preserved';
            return plain(text)&&plain(text)!==plain(source)?'Caption refresh pending':'Captions current';
        },
        _sequenceCaptionStyle(style) {
            if (!style?.enabled) return null;
            const defaults = { position: 'bottom', fontFamily: 'Inter', fontSize: Math.round(this.stage.height * .045),
                textColor: '#ffffff', background: '#171717', backgroundEnabled: true, backgroundOpacity: .85,
                highlight: false, highlightColor: '#f6c945', estimateHighlight: false, stackSpeakers: true, presentation: 'subtitles', textProgression: 'sentence' };
            const value = { ...defaults, ...style };
            value.maxWords = Math.max(0, Math.min(30, Math.round(Number(style.maxWords) || 0)));
            if (!['full','sentence','word','reveal'].includes(value.textProgression) || !['subtitles','bubble'].includes(value.presentation) || !['top','middle','bottom'].includes(value.position) || !['Inter','Arial','Georgia','Verdana'].includes(value.fontFamily)
                || !/^#[\da-f]{6}$/i.test(value.textColor) || !/^#[\da-f]{6}$/i.test(value.background) || !/^#[\da-f]{6}$/i.test(value.highlightColor)
                || !Number.isFinite(value.fontSize) || value.fontSize < 6 || value.fontSize > 180
                || !Number.isFinite(value.backgroundOpacity) || value.backgroundOpacity < 0 || value.backgroundOpacity > 1) {
                throw Error('Choose valid caption placement, font, colours and size (6-180).');
            }
            return value;
        },

        _applySequenceCaptionStyle(obj, style) {
            if (!style) return;
            const W=this.stage.width,H=this.stage.height;
            const rgb=style.background.match(/[\da-f]{2}/gi).map(n=>parseInt(n,16));
            Object.assign(obj,{fontFamily:style.fontFamily,fontSize:style.fontSize,textColor:style.textColor,
                textBackgroundEnabled:style.backgroundEnabled,textBackgroundColor:`rgba(${rgb.join(',')},${style.backgroundOpacity})`,
                captionVerticalAlign:style.position,x:W*.08,width:W*.84,height:H*.21});
            obj.y=style.position==='top'?H*.05:style.position==='middle'?(H-obj.height)/2:H*.95-obj.height;
            obj.captionHighlightEnabled = style.highlight === true;
            obj.captionHighlightColor = style.highlightColor;
            obj.captionProfile = { ...obj.captionProfile, estimateHighlight: style.estimateHighlight === true,
                presentation: style.presentation, textProgression: style.textProgression, maxWords: style.maxWords, bubbleStageWidth: W,
                stackSpeakers: style.stackSpeakers !== false, stackPlacement: style.position, stackStageHeight: H };
        },

        _mountSequenceCaptionStyle(host, recipe, invalidate, title = 'Caption style', inherited = {}) {
            const box=document.createElement('details'),summary=document.createElement('summary');summary.textContent=title;box.append(summary);host.append(box);
            const fields=document.createElement('div');fields.className='sequence-fields';box.append(fields);
            const defaults={enabled:false,position:'bottom',fontFamily:'Inter',fontSize:Math.round(this.stage.height*.045),textColor:'#ffffff',background:'#171717',backgroundOpacity:.85,backgroundEnabled:true,applyToExisting:false};
            const style={...defaults,maxWords:8,textProgression:'sentence',presentation:'subtitles',highlight:false,highlightColor:'#f6c945',estimateHighlight:false,stackSpeakers:true,...inherited,enabled:false,applyToExisting:false,...recipe.captionStyle};
            const change=(key,value)=>{invalidate();style[key]=value;recipe.captionStyle={...style};};
            const add=(title,key,type,options)=>{
                const label=document.createElement('label');label.append(document.createTextNode(title));
                const control=document.createElement(options?'select':'input');control.dataset.captionStyle=key;
                if(options)options.forEach(([value,name])=>control.append(new Option(name,value)));else control.type=type;
                if(type==='checkbox')control.checked=style[key];else control.value=style[key];
                if(key==='fontSize'){control.min=6;control.max=180;control.step=1;}
                if(key==='backgroundOpacity'){control.min=0;control.max=1;control.step=.05;}
                control.onchange=()=>change(key,type==='checkbox'?control.checked:type==='number'||type==='range'?Number(control.value):control.value);
                label.append(control);fields.append(label);return control;
            };
            add('Use this style','enabled','checkbox');
            const preset=document.createElement('select');preset.setAttribute('aria-label','Caption style preset');
            [['','Custom'],['classic','Classic'],['contrast','High contrast'],['light','Light panel']].forEach(([v,n])=>preset.append(new Option(n,v)));
            const label=document.createElement('label');label.append('Preset',preset);fields.append(label);
            preset.onchange=()=>{if(!preset.value)return;const p=preset.value==='light'?{textColor:'#171717',background:'#ffffff'}:{textColor:'#ffffff',background:preset.value==='contrast'?'#000000':'#171717'};
                change('enabled',true);Object.assign(style,p,{backgroundEnabled:true,backgroundOpacity:preset.value==='contrast'?1:.85});recipe.captionStyle={...style};
                fields.querySelectorAll('[data-caption-style]').forEach(c=>{if(c.type==='checkbox')c.checked=style[c.dataset.captionStyle];else c.value=style[c.dataset.captionStyle];});};
            add('Placement','position','select',[['bottom','Bottom'],['middle','Middle'],['top','Top']]);
            add('Display','presentation','select',[['subtitles','Subtitles'],['bubble','Speaker bubble']]);
            const progression=add('Text progression','textProgression','select',[['sentence','Sentence by sentence'],['reveal','Words build as spoken'],['word','One word at a time'],['full','Full caption text']]);
            progression.title='Uses aligned word timings when available; otherwise progression is approximate. Use Edit captions to refine timing.';
            const wordLimit=add('Maximum words per chunk (0 = unlimited)','maxWords','number');
            wordLimit.min=0;wordLimit.max=30;wordLimit.step=1;
            add('Separate overlapping speakers','stackSpeakers','checkbox');
            add('Font','fontFamily','select',['Inter','Arial','Georgia','Verdana'].map(v=>[v,v]));
            add('Font size','fontSize','number');add('Text colour','textColor','color');add('Background','backgroundEnabled','checkbox');
            add('Background colour','background','color');add('Background opacity','backgroundOpacity','range');
            add('Highlight spoken words','highlight','checkbox');
            add('Highlight colour','highlightColor','color');
            const estimate=add('Allow approximate word timing','estimateHighlight','checkbox');
            estimate.title='Uses estimated timing when aligned word timings are unavailable. Transcribe or refine timings in Captions for accuracy.';
            const replace=add('Restyle existing linked captions','applyToExisting','checkbox');
            replace.title='Updates placement and appearance only. Caption text and timings are preserved.';
        },

        _sequenceSpeechGestureSettings(settings = {}) {
            const mode = settings.gestures || 'off';
            if (!['off', 'auto', 'custom'].includes(mode)) throw Error('Choose a speech gesture mode.');
            const value = (key, fallback, min = 0, max = 1.5) => {
                const result = Number(settings[key] ?? fallback);
                if (!Number.isFinite(result) || result < min || result > max) throw Error(`Speech ${key} must be between ${min} and ${max}.`);
                return result;
            };
            return { mode, head: mode === 'off' ? 0 : mode === 'auto' ? .3 : value('headIntensity', .3),
                hands: mode === 'off' ? 0 : mode === 'auto' ? .5 : value('handIntensity', .5),
                body: mode === 'off' ? 0 : mode === 'auto' ? .12 : value('bodyIntensity', .12),
                speed: mode === 'custom' ? value('handSpeed', .65, .4, 1.6) : .65 };
        },

        _sequenceSpeechGestureWindow(rig, step, startMs) {
            const held = step.kind === 'wait', pose = this._snapshotArmaturePose(rig);
            const idle = this._resolveArmatureKeyframe({ pose: 'idle' }, rig, this._getActiveArmaturePoseCatalog(rig))?.angles || {};
            const blocked = new Set();
            const joints = this._getArmatureJointMap(rig);
            for (const [name, entry] of Object.entries(joints)) {
                if (!/shoulder|elbow|wrist/.test(name)) continue;
                const difference = Math.abs(((Number(pose.jointAngles[name] || 0) - Number(idle[name] || 0) + 540) % 360) - 180);
                const tilt = pose.jointTilts[name] || {};
                if (difference > 25 || Math.abs(tilt.x || 0) > 15 || Math.abs(tilt.y || 0) > 15) blocked.add(entry.obj.id);
            }
            // A prop may be attached through another object, not directly to the arm.
            const partIds = new Set(Object.values(rig.parts || {}).map(part => (part.obj || part.raw)?.id));
            for (const obj of this.objects.objects) {
                if (obj.visible === false || !obj.pinnedTo || partIds.has(obj.id)) continue;
                let parent = this.objects.getObjectById(obj.pinnedTo), seen = new Set();
                while (parent && !seen.has(parent.id)) {
                    seen.add(parent.id);
                    if (Object.values(joints).some(entry => entry.obj === parent && /arm/i.test(parent._svgCharacterPartKey || parent._armaturePartKey || parent.name || ''))) { blocked.add(parent.id); break; }
                    parent = this.objects.getObjectById(parent.pinnedTo);
                }
            }
            return { startMs, endMs: startMs, head: held && !step.headTurn, hands: held && !step.kit,
                body: held && !step.headTurn && !step.kit && !pose.seatDepth && !pose.kneelDepth && blocked.size === 0,
                eyes: held && !step.headTurn?.eyes, blockedObjectIds: [...blocked] };
        },

        _sequenceLinkedStep(action, id) {
            const steps=action?.recipe?.sequence?.steps||action?.recipe?.choreography?.beats.flatMap(beat=>beat.actions.map(item=>item.step))||[];
            return this._sequenceSpeechSteps(steps).find(step=>step.id===id);
        },
        _planCharacterSequenceSpeech(recipe, rig, options = {}) {
            const manager = audio(); manager?._saveActiveTrack();
            const used = new Set();
            return recipe.steps.filter(step => step.speech?.audioId).map(step => {
                const settings = step.speech;
                const gestures = this._sequenceSpeechGestureSettings(settings);
                if (used.has(settings.audioId)) throw Error('Attach an audio clip once; choose Continue while speaking to span several steps.');
                used.add(settings.audioId);
                if (!['wait', 'continue', 'independent'].includes(settings.timing)) throw Error('Choose a speech timing mode.');
                if (!Number.isFinite(settings.offset) || settings.offset < 0 || settings.offset > 600) throw Error('Speech delay must be between 0 and 600 seconds.');
                const track = manager?.tracks.find(item => item.audioId === settings.audioId);
                if (!track?.audioBuffer) throw Error(`Speech audio is missing or not decoded for step ${recipe.steps.indexOf(step) + 1}. Select an audio clip.`);
                if (track.sequenceLink && track.sequenceLink.actionId !== options.actionId) throw Error('This audio belongs to another sequence. Disconnect it first or use a different clip.');
                if (track.characterId && track.characterId !== rig.root.id && !settings.reassign) throw Error('This audio belongs to another character. Confirm reassignment when selecting it.');
                if (track.playScope === 'range') throw Error('Sequence speech requires scene-only audio. Change the audio scope before attaching it.');
                const duration = manager._getTrackClipDurationMs(track);
                if (!Number.isFinite(duration) || duration <= 0) throw Error('The selected speech clip is empty.');
                let existing = null;
                for (const obj of this.objects.objects) for (const animation of obj.animations || []) {
                    const config = speechConfigs(animation).find(value => value.audioId === track.audioId && value.rootId === rig.root.id);
                    if (config && !config.audioRefreshRequired && (Number(config.audioRevision) || 1) === (Number(track.audioRevision) || 1)) existing = clone(config);
                }
                const captions = { enabled: settings.captions?.enabled === true,
                    replaceExisting: settings.captions?.replaceExisting === true,
                    text: String(settings.captions?.text || settings.text || existing?.transcript || '').trim(),
                    style: this._sequenceCaptionStyle(recipe.captionStyle) };
                if (captions.enabled && !captions.text && !this._sequenceCaptionForAudio(track.audioId)) {
                    throw Error('Enter caption text for this speech, or transcribe its audio in Captions first.');
                }
                if (captions.text.length > 100000) throw Error('Caption text is too long. Split the speech into shorter clips.');
                return { audioId: track.audioId, stepId: step.id, waitStepId:step._speechWaitUntil, timing: settings.timing, offsetMs: settings.offset * 1000,
                    motion: settings.motion === 'face' ? 'face' : 'mouth-only', durationMs: duration,
                    independentStartMs: track.timelineStartMs || 0, revision: track.audioRevision, existing,
                    text: settings.text || '', rootId: rig.root.id,
                    captionHeadId: (rig.parts['head-neck']?.obj || rig.parts.headNeck?.obj || rig.parts.head?.obj)?.id,
                    gestures, captions };
            });
        },

        _captureCharacterSequenceSpeech(plan, step, rig, stepStart) {
            const entry = plan.find(item => item.stepId === step.id); if (!entry) return;
            const track = audio().tracks.find(item => item.audioId === entry.audioId);
            entry.startMs = stepStart + entry.offsetMs; entry.endMs = entry.startMs + entry.durationMs;
            const animation = lipSync().buildDialogueAnimation(rig, { ...track, timelineStartMs: entry.startMs }, { gestures: false, text: entry.text });
            const config = speechConfigs(animation)[0];
            // Retain manually refined mouth cues only when their source range matches the full clip.
            if (entry.existing && Math.abs(entry.existing.sourceStartMs - track.trimStartMs) < 1
                && Math.abs(entry.existing.sourceEndMs - track.trimEndMs) < 1) {
                for (const key of ['cues', 'strength', 'smoothingMs', 'mouthOpeningGain', 'svgMouthGain', 'showTeeth', 'teethVisibility',
                    'transcript', 'transcriptSegments', 'wordTimings', 'recognition', 'performancePlan']) {
                    if (entry.existing[key] !== undefined) config[key] = clone(entry.existing[key]);
                }
            }
            const gestures = entry.gestures;
            config.performance = { ...config.performance, motionMode: entry.motion === 'face' || gestures.mode !== 'off' ? 'full' : 'mouth-only',
                eyeIntensity: entry.motion === 'face' ? .3 : 0, expressionIntensity: entry.motion === 'face' ? .3 : 0,
                eyeMovement: entry.motion === 'face', facialExpression: entry.motion === 'face', headMovement: gestures.head > 0,
                handGestures: gestures.hands > 0, bodyMovement: gestures.body > 0, headIntensity: gestures.head, handIntensity: gestures.hands,
                bodyIntensity: gestures.body, handSpeed: gestures.speed, handPattern: 'alternating', semanticGestures: false };
            animation.params.performanceMode = config.performance.motionMode;
            entry.animation = animation; delete entry.existing;
        },

        _snapshotCharacterSequenceAudio() {
            const manager = audio(); if (!manager) return null;
            manager._saveActiveTrack();
            return { tracks: manager.tracks.map(track => ({ ...track, sequenceLink: clone(track.sequenceLink) })), activeId: manager.activeAudioId,
                captions: this.objects.objects.filter(obj => obj.type === 'caption').map(obj => ({ id: obj.id,
                    state: clone(obj.toJSON()) })) };
        },

        _restoreCharacterSequenceAudio(snapshot) {
            const manager = audio(); if (!manager || !snapshot) return;
            manager.pause(); manager.tracks = snapshot.tracks.map(track => ({ ...track, sequenceLink: clone(track.sequenceLink) }));
            for (const saved of snapshot.captions || []) {
                const obj = this.objects.getObjectById(saved.id); if (obj) Object.assign(obj, clone(saved.state));
            }
            manager._applyActiveTrack(manager.tracks.find(track => track.audioId === snapshot.activeId) || manager.tracks[0] || null);
            manager._refreshEditControls(); manager._refreshTimelineUI();
        },

        _previewCharacterSequenceAudio(time, playing, ids) {
            const manager = audio(); if (!manager) return;
            const tracks = manager.tracks;
            tracks.filter(track => !ids.has(track.audioId)).forEach(track => track.audioElement?.pause());
            try { manager.tracks = tracks.filter(track => ids.has(track.audioId)); manager._syncPlaybackAt(time, playing); }
            finally { manager.tracks = tracks; }
        },

        _detachCharacterSequenceAudio(track, options = {}) {
            const link = track.sequenceLink; if (!link) return;
            const action = this._getArmatureRecordedAction(link.actionId);
            const step = this._sequenceLinkedStep(action, link.stepId);
            if (options.clearStep && step?.speech?.audioId === track.audioId) step.speech = null;
            delete track.sequenceLink;
        },

        _onCharacterSequenceAudioEdit(track, previous, options) {
            const link = track.sequenceLink; if (!link) return;
            const action = this._getArmatureRecordedAction(link.actionId);
            const step = this._sequenceLinkedStep(action, link.stepId);
            const oldStart = typeof previous === 'number' ? previous : previous?.timelineStartMs;
            if (Number.isFinite(oldStart) && Math.abs(oldStart - track.timelineStartMs) > .5) {
                link.timing = 'independent';
                if (step?.speech) step.speech.timing = 'independent';
            }
            if (options.trimChanged || options.sourceReplaced || Math.abs(audio()._getTrackClipDurationMs(track) - link.durationMs) > 1) {
                if (action?.recipe) action.recipe.speechNeedsRefresh = true;
                if(action?.recipe?.choreography)eventBus.emit('audio:updated');
            }
        },

        _sequenceCaptionForAudio(audioId) {
            return this.objects.objects.find(obj => obj.type === 'caption' && obj.captionAudioId === audioId);
        },

        _installSequenceCaption(entry, track, objects=this.objects.objects) {
            // Audio binding is the shared identity: never duplicate or overwrite
            // a caption track edited in the regular workspace.
            if (!entry.captions?.enabled) return;
            const existing=objects.find(obj=>obj.type==='caption' && obj.captionAudioId===track.audioId);
            const plain = value => String(value || '').replace(/\s+/g,' ').trim();
            if(existing){
                existing.captionProfile ||= {};
                existing.captionProfile.bubbleTargetId=entry.captionHeadId || entry.rootId;
                if(entry.captions.style?.applyToExisting)this._applySequenceCaptionStyle(existing,entry.captions.style);
                const unedited = existing.captionProfile.sequenceGeneratedText != null
                    && plain(existing.segments.map(c=>c.text).join(' ')) === plain(existing.captionProfile.sequenceGeneratedText)
                    && !existing.segments.some(c=>c.edited || c.secondary || c.reviewed);
                if(!entry.captions.replaceExisting && !unedited)return;
            }
            const R = globalThis.CaptionRuntime;
            if (!R) throw Error('The caption editor is unavailable. Reload and retry.');
            const W = this.stage.width, H = this.stage.height;
            const profile = { maxChars: 42, maxLines: 2, maxWords: 8, textProgression: 'sentence', stackSpeakers: true, stackPlacement: 'bottom', stackStageHeight: H };
            const cue = R.normalize({ text: entry.captions.text, startMs: track.timelineStartMs,
                endMs: track.timelineStartMs + entry.durationMs, timingSource: 'estimated', reviewNeeded: true });
            const config = entry.animation && speechConfigs(entry.animation)[0];
            const words = config?.wordTimings || [];
            const compact = text => String(text || '').replace(/\s+/g, '');
            let cursor = 0;
            // Lip-sync words are clip-relative. Only reuse a complete matching transcript;
            // a caption override must never inherit unrelated speech word timings.
            const matching = words.length && compact(words.map(w => w.text).join(' ')) === compact(cue.text)
                && words.every(w => {
                    const valid = Number.isFinite(w.startMs) && Number.isFinite(w.endMs)
                        && w.startMs >= cursor && w.endMs > w.startMs && w.endMs <= entry.durationMs;
                    cursor = w.endMs; return valid;
                });
            if (matching) {
                cue.words = words.map(w => ({ text: w.text, startMs: cue.startMs + w.startMs,
                    endMs: cue.startMs + w.endMs, timingSource: w.timingSource || (config.recognition ? 'aligned' : 'estimated') }));
                cue.timingSource = cue.words.every(w => w.timingSource !== 'estimated') ? 'aligned' : 'estimated';
            }
            const voiced = (config?.cues || []).filter(c => c.viseme && c.viseme !== 'rest'
                && Number.isFinite(c.startMs) && Number.isFinite(c.endMs) && c.endMs > c.startMs);
            if (matching || voiced.length) {
                const spans = matching ? words : voiced;
                cue.startMs = Math.max(cue.startMs, track.timelineStartMs + Math.min(...spans.map(c => c.startMs)));
                cue.endMs = Math.min(cue.endMs, track.timelineStartMs + Math.max(...spans.map(c => c.endMs)));
            }
            const obj = new StageObject('caption', { name: `Captions: ${track.fileName || 'Speech'}`,
                x: W * .08, y: H * .74, width: W * .84, height: H * .21,
                fontSize: Math.round(H * .045), fontFamily: 'Inter', fontWeight: '600',
                textColor: '#ffffff', textBackgroundEnabled: true, textBackgroundColor: '#171717',
                captionVerticalAlign: 'bottom', textAlign: 'center', captionLanguage: 'en', captionDelivery: 'both',
                captionProfile: profile, segments: [cue] });
            this._applySequenceCaptionStyle(obj,entry.captions.style);
            obj.captionProfile.bubbleTargetId = entry.captionHeadId || entry.rootId;
            obj.captionProfile.bubbleStageWidth = W;
            obj.captionProfile.sequenceGeneratedText = cue.text;
            R.bind(obj, track);
            if(existing){
                for(const key of ['segments','captionAudioId','captionBinding','captionSourceSegments','captionStale'])existing[key]=clone(obj[key]);
                existing.captionProfile.sequenceGeneratedText=cue.text;
            } else objects.push(obj);
        },

        _installCharacterSequenceSpeech(clip, start, actionId, options = {}) {
            const manager = audio(); if (!manager) return;
            manager._saveActiveTrack();
            const entries = clip.speech || [], selected = new Set(entries.map(entry => entry.audioId));
            const deleting = options.removedAudio || new Set();
            for (const track of manager.tracks) {
                if (track.sequenceLink?.actionId === actionId && !selected.has(track.audioId)) this._detachCharacterSequenceAudio(track);
            }
            for (const audioId of deleting) {
                if (selected.has(audioId)) continue;
                const track = manager.tracks.find(item => item.audioId === audioId);
                if (!track) continue;
                track.audioElement?.pause();
                manager.tracks = manager.tracks.filter(item => item !== track);
                manager._removeLipSyncForAudio(audioId);
                this.objects.objects.filter(obj => obj.type === 'caption' && obj.captionAudioId === audioId).forEach(obj => globalThis.CaptionRuntime?.detach(obj));
            }
            for (const entry of entries) {
                const track = manager.tracks.find(item => item.audioId === entry.audioId);
                if (!track || track.audioRevision !== entry.revision || Math.abs(manager._getTrackClipDurationMs(track) - entry.durationMs) > 1) throw Error('Speech audio changed while preparing the sequence. Retry.');
                const previous = { ...track };
                track.timelineStartMs = entry.timing === 'independent' ? entry.independentStartMs : start + entry.startMs;
                const rootId = entry.rootId || clip.rootId;
                track.characterId = rootId;
                if (!options.route) track.sequenceLink = { actionId, rootId, stepId: entry.stepId, offsetMs: entry.startMs,
                    timing: entry.timing, durationMs: entry.durationMs };
                // Remove only this audio's lip sync and companions, leaving other speech untouched.
                const removed = new Set();
                this.objects.objects.forEach(obj => { obj.animations = obj.animations.filter(animation => {
                    if (!speechConfigs(animation).some(config => config.audioId === entry.audioId)) return true;
                    removed.add(animation.id); return false;
                }); });
                removed.forEach(id => lipSync()._removeSpeechPerformanceAnimations(id));
                const animation = clone(entry.animation); animation.id = options.route && removed.size===1 ? [...removed][0] : Utils.generateId('anim'); animation.delay = track.timelineStartMs;
                animation.name = `Speech: ${track.fileName || clip.name}`;
                speechConfigs(animation).forEach(config => { config.audioTimelineStartMs = track.timelineStartMs; config.timelineDelayMs = track.timelineStartMs; });
                speechConfigs(animation).forEach(config => {
                    if (!options.route && entry.gestures && entry.gestures.mode !== 'off') config.sequenceGestureWindows = (entry.gestureWindows || []).map(window => ({ ...window,
                        startMs: start + window.startMs - track.timelineStartMs, endMs: start + window.endMs - track.timelineStartMs }));
                });
                if (clip.recipe?.choreography) Object.assign(animation, {_armatureActionId:actionId, _armatureActionName:clip.name});
                const owner = this.objects.getObjectById(rootId); if (!owner) throw Error('The speaking character is missing.');
                owner.animations.push(animation);
                globalThis.CaptionRuntime?.sync(this.objects.objects, track, previous, {});
                this._installSequenceCaption(entry, track);
            }
            globalThis.CaptionRuntime?.arrangeSpeakers(this.objects.objects);
            manager._applyActiveTrack(manager.tracks.find(track => track.audioId === manager.activeAudioId) || manager.tracks[0] || null);
            if (!options.temporary) { manager._refreshEditControls(); manager._refreshTimelineUI(); this.objects.updateObjectList?.(); }
        },

        _syncCharacterSequenceAudioLinks() {
            if (this._syncingSequenceAudio || this._characterSequenceCompiling || this._armatureRecordingBusy || document.querySelector('.character-sequence-editor')) return;
            const manager = audio(); if (!manager) return;
            this._syncingSequenceAudio = true;
            let changed = false;
            try {
                manager._saveActiveTrack();
                for (const track of manager.tracks) {
                    const link = track.sequenceLink; if (!link) continue;
                    const action = this._getArmatureRecordedAction(link.actionId);
                    if (!action?.recipe?.sequence && !action?.recipe?.choreography) { delete track.sequenceLink; changed = true; continue; }
                    if (link.timing === 'independent') continue;
                    const next = action.start + link.offsetMs;
                    if (Math.abs(next - track.timelineStartMs) < .5) continue;
                    const previous = { ...track }; track.timelineStartMs = next;
                    manager._syncLinkedLipSyncTiming(track, previous, { sequenceChange: true }); changed = true;
                }
                if (changed) {
                    manager._applyActiveTrack(manager.tracks.find(track => track.audioId === manager.activeAudioId) || manager.tracks[0] || null);
                    manager._refreshTimelineUI(); window.app?._saveCurrentSceneAudioOnly?.();
                }
            } finally { this._syncingSequenceAudio = false; }
        },

        _chooseSequenceAudioRemoval() {
            return new Promise(resolve => {
                const dialog = document.createElement('dialog'); dialog.className = 'sequence-speech-confirm';
                dialog.innerHTML = '<h3>Remove step</h3><p>What should happen to its audio?</p><button data-choice="keep">Keep audio and unlink</button><button data-choice="delete">Delete audio too</button><button data-choice="cancel">Cancel</button>';
                const finish = value => { dialog.close(); dialog.remove(); resolve(value); };
                dialog.oncancel = event => { event.preventDefault(); finish('cancel'); };
                dialog.querySelectorAll('button').forEach(button => button.onclick = () => finish(button.dataset.choice));
                document.body.append(dialog); dialog.showModal();
            });
        },

        _mountSequenceSpeechFields(row, step, context) {
            const manager = audio(); if (!manager) return;
            manager._saveActiveTrack();
            const section = document.createElement('details'); section.className = 'sequence-speech'; section.open = !!step.speech?.audioId;
            const summary = document.createElement('summary'); summary.textContent = 'Speech'; section.append(summary);
            const fields = document.createElement('div'); fields.className = 'sequence-fields'; section.append(fields); row.append(section);
            const field = (label, control) => { const node = document.createElement('label'); if(!control.hasAttribute('aria-label'))control.setAttribute('aria-label',label); node.append(document.createTextNode(label), control); fields.append(node); return control; };
            const select = document.createElement('select'); select.setAttribute('aria-label', 'Speech audio'); select.append(new Option('No speech', ''));
            const eligible=manager.tracks.filter(track=>!context.allowTrack || context.allowTrack(track));
            eligible.forEach(track => select.append(new Option(`${track.fileName} (${(manager._getTrackClipDurationMs(track) / 1000).toFixed(1)} s)`, track.audioId)));
            if (step.speech?.audioId && !eligible.some(track => track.audioId === step.speech.audioId)) select.append(new Option('Unavailable audio - choose another clip', step.speech.audioId));
            select.value = step.speech?.audioId || '';
            const attach = async (audioId, metadata = {}) => {
                const track = manager.tracks.find(item => item.audioId === audioId);
                const reassign = !!track?.characterId && track.characterId !== context.rig.root.id;
                if (reassign && !confirm('Reassign this audio and its lip sync to the sequence character?')) { select.value = step.speech?.audioId || ''; return; }
                context.invalidate(); step.speech = audioId ? { timing: 'wait', offset: 0, motion: context.rig.root.realistic3D?'face':'mouth-only', ...step.speech,
                    text: '', audioId, reassign, ...metadata } : null;
                await context.render();
            };
            field('Audio clip', select).onchange = () => attach(select.value);
            if (step.speech?.audioId) {
                const settings = step.speech;
                const captions = document.createElement('input'); captions.type = 'checkbox'; captions.dataset.sequenceCaptions = '';
                captions.checked = settings.captions?.enabled === true;
                captions.title = 'Create audio-linked captions when added to the timeline. Existing caption edits are preserved.';
                field('Create linked captions', captions).onchange = () => {
                    context.invalidate(); settings.captions = { ...settings.captions, enabled: captions.checked }; void context.render();
                };
                if (captions.checked) {
                    const state=document.createElement('output');state.dataset.sequenceCaptionStatus='';state.setAttribute('aria-live','polite');fields.append(state);
                    const updateState=()=>{state.textContent=this._sequenceCaptionUpdateStatus(settings.audioId,settings.captions.text||settings.text,settings.captions.replaceExisting);};
                    updateState();
                    const replace=document.createElement('input');replace.type='checkbox';replace.checked=!!settings.captions?.replaceExisting;
                    field('Replace edited captions on update',replace).onchange=()=>{
                        if(replace.checked&&!confirm('Replace existing caption text, corrections and translations when this sequence is updated?')){replace.checked=false;return;}
                        context.invalidate();settings.captions.replaceExisting=replace.checked;
                        updateState();
                    };
                    const text = document.createElement('textarea'); text.rows = 3; text.maxLength = 100000;
                    text.dataset.sequenceCaptionText = ''; text.value = settings.captions?.text || '';
                    text.placeholder = settings.text || 'Caption text for uploaded audio';
                    field('Caption text (optional override)', text).oninput = () => {
                        context.invalidate(); settings.captions.text = text.value;
                        updateState();
                    };
                }
                const editCaptions = document.createElement('button'); editCaptions.type = 'button';
                editCaptions.innerHTML = '<i class="fas fa-closed-captioning"></i> Edit captions';
                editCaptions.title = 'Edit caption text, timing, position, font and background';
                editCaptions.onclick = async () => {
                    context.invalidate();
                    const obj = this._sequenceCaptionForAudio(settings.audioId);
                    if (!obj) { context.status('Add or update the sequence on the timeline with captions enabled, then choose Edit captions.'); return; }
                    await globalThis.CaptionWorkspace?.open(obj);
                };
                fields.append(editCaptions);
                const timing = document.createElement('select');
                [['wait', context.mountSpeechAnchor?'Wait here until speech finishes':'Finish speech before next step'], ['continue', context.mountSpeechAnchor?'Continue through following actions':'Continue while speaking'], ['independent', 'Independent timeline timing']].forEach(([value, text]) => timing.append(new Option(text, value)));
                timing.value = settings.timing; field('Timing', timing).onchange = () => { context.invalidate(); settings.timing = timing.value; context.timingChanged?.(); if(context.mountSpeechAnchor) context.render(); };
                context.mountSpeechAnchor?.(field,settings);
                const delay = document.createElement('input'); delay.type = 'number'; delay.min = 0; delay.max = 600; delay.step = .1; delay.value = settings.offset;
                delay.disabled=!!context.mountSpeechAnchor && settings.timing==='independent';
                field(context.mountSpeechAnchor && settings.edge==='before'?'Speech lead (s)':'Speech delay (s)', delay).onchange = () => { context.invalidate(); settings.offset = Number(delay.value); context.timingChanged?.(); };
                const motion = document.createElement('select'); motion.append(new Option('Lip sync only', 'mouth-only'), new Option('Lip sync, eyes and expression', 'face')); motion.value = settings.motion;
                field('Speech motion', motion).onchange = () => { context.invalidate(); settings.motion = motion.value; };
                const gestures = document.createElement('select'); gestures.dataset.sequenceGestures = '';
                gestures.title = 'Speech gestures pause during explicit actions. Occupied or posed arms, seated posture and head-turn overlays stay protected.';
                [['off','Off'],['auto','Auto (protect actions)'],['custom','Custom']].forEach(([value,text]) => gestures.append(new Option(text,value)));
                gestures.value = settings.gestures || 'off';
                field('Speech gestures', gestures).onchange = () => { context.invalidate(); settings.gestures = gestures.value; void context.render(); };
                if (settings.gestures === 'custom') {
                    for (const [key,title,fallback,min,max] of [['headIntensity','Head',.3,0,1.5],['handIntensity','Hands',.5,0,1.5],['bodyIntensity','Body',.12,0,1.5],['handSpeed','Hand speed',.65,.4,1.6]]) {
                        const control = document.createElement('input'); control.type = 'range'; control.min = min; control.max = max; control.step = key === 'handSpeed' ? .05 : .01; control.value = settings[key] ?? fallback;
                        control.dataset.sequenceGesture = key;
                        const output = document.createElement('output'); output.textContent = Number(control.value).toFixed(2);
                        field(title,control).parentElement.append(output);
                        control.oninput = () => { context.invalidate(); settings[key] = Number(control.value); output.textContent = Number(control.value).toFixed(2); };
                    }
                }
            }
            const toolbar = document.createElement('div'); toolbar.className = 'sequence-library'; section.append(toolbar);
            const button = (icon, title, handler) => { const node = document.createElement('button'); node.type = 'button'; node.title = title; node.setAttribute('aria-label', title); node.innerHTML = `<i class="fas fa-${icon}"></i>`; node.onclick = handler; toolbar.append(node); return node; };
            if (step.speech?.audioId && context.applySequence) {
                const apply = button('check', 'Apply speech and sequence actions to timeline', context.applySequence);
                apply.dataset.sequenceSpeechApply = '';
                apply.append(document.createTextNode(' Apply speech + actions'));
            }
            button('sync', 'Refresh audio list', () => context.render());
            button('play', 'Listen to selected speech', () => { const track = manager.tracks.find(item => item.audioId === select.value); if (!track) return;
                manager.pause(); const player = track.audioElement; player.currentTime = track.trimStartMs / 1000;
                player.ontimeupdate = () => { if (player.currentTime * 1000 >= track.trimEndMs) { player.pause(); player.ontimeupdate = null; } };
                player.play()?.catch(error => context.status(error.message)); });
            button('stop', 'Stop listening', () => manager.pause());
            const replacement = document.createElement('input'); replacement.type = 'checkbox'; replacement.checked = true;
            field('Replace selected speech audio', replacement);
            const loadOptions = () => {
                if(!replacement.checked || !step.speech?.audioId) return {pushHistory:true};
                const track=manager.tracks.find(t=>t.audioId===step.speech.audioId);
                if(!track || (context.allowTrack && !context.allowTrack(track))) throw Error('This clip is unavailable for replacement. Choose another clip or turn off replacement.');
                return {pushHistory:true,replaceAudioId:track.audioId};
            };
            button('upload', 'Upload speech audio', () => {
                const input = document.createElement('input'); input.type = 'file'; input.accept = 'audio/*';
                input.onchange = async () => { try {
                    if (!input.files[0] || !context.alive()) return; context.invalidate(); context.status('Loading speech audio...');
                    if (!await manager.loadAudioFile(input.files[0], loadOptions())) throw Error('Could not load audio.');
                    if (context.alive()) await attach(manager.activeAudioId);
                } catch (error) { context.status(error.message); } }; input.click();
            });
            this._mountSequenceSpeechGenerator(section, step, { ...context, loadOptions }, attach);
        },

        _mountSequenceSpeechGenerator(section, step, context, attach) {
            const details = document.createElement('details'); details.className = 'sequence-speech-generator';
            details.innerHTML = '<summary>Generate speech from text</summary><label>Text<textarea rows="3" maxlength="4000" aria-label="Speech text"></textarea></label><div class="sequence-fields"><label>Voice source<select data-speech="provider"><option value="local">Local server</option><option value="openai">OpenAI (paid)</option></select></label><label>Voice<select data-speech="voice"><option value="">Load voices</option></select></label><label>Language<select data-speech="language"><option value="en">English</option><option value="ha">Hausa</option><option value="ig">Igbo</option><option value="yo">Yoruba</option></select></label></div><div class="sequence-library"><button data-speech="refresh"><i class="fas fa-sync"></i> Load Voices</button><button data-speech="generate" disabled><i class="fas fa-volume-up"></i> Generate</button><button data-speech="cancel" title="Cancel generation" aria-label="Cancel generation"><i class="fas fa-stop"></i></button></div><p role="status"></p>';
            section.append(details);
            details.querySelectorAll('button').forEach(button=>{button.type='button';});
            let applyAfterGeneration = null;
            if (context.applySequence) {
                applyAfterGeneration = document.createElement('input'); applyAfterGeneration.type = 'checkbox'; applyAfterGeneration.checked = context.autoApply !== false;
                applyAfterGeneration.dataset.speech = 'applySequence';
                const label = document.createElement('label'); label.append(applyAfterGeneration, 'Apply sequence after generation');
                details.querySelector('.sequence-library').before(label);
                const update = () => { details.querySelector('[data-speech="generate"]').lastChild.textContent = applyAfterGeneration.checked ? ' Generate + apply sequence' : ' Generate'; };
                applyAfterGeneration.onchange = update; update();
            }
            const find = key => details.querySelector(`[data-speech="${key}"]`), message = details.querySelector('[role=status]'), text = details.querySelector('textarea');
            message.removeAttribute('role'); message.setAttribute('aria-live', 'polite');
            const draft = step.speechDraft || { text: step.speech?.text || '', provider: 'local', voice: '', language: 'en' };
            const speedLabel=document.createElement('label'),speed=document.createElement('input');
            const speedBounds=()=>find('provider').value==='local'?[.5,1.5]:[.75,1.25];
            const readSpeed=()=>{const [min,max]=speedBounds();return Math.max(min,Math.min(max,Number(speed.value)||1));};
            const updateSpeedBounds=()=>{[speed.min,speed.max]=speedBounds();speed.value=readSpeed();};
            speed.type='number';speed.step=.05;speed.dataset.speech='speed';
            speed.value=Number.isFinite(Number(draft.speed))?Number(draft.speed):1;
            speed.title='1 = normal speed. Regenerate speech to apply; uploaded audio is unchanged.';
            speedLabel.append('Speech speed',speed);details.querySelector('.sequence-fields').append(speedLabel);
            speed.onchange=()=>{draft.speed=readSpeed();speed.value=draft.speed;saveDraft();message.textContent='Speech speed changed. Regenerate speech to update the audio; the current clip is unchanged.';};
            const saveDraft = () => { step.speechDraft = draft; };
            text.value = draft.text || ''; text.oninput = () => { draft.text = text.value; saveDraft(); };
            if (!Array.from(find('provider').options).some(option => option.value === draft.provider)) find('provider').append(new Option(draft.provider, draft.provider));
            find('provider').value = draft.provider || 'local'; find('language').value = draft.language || 'en';
            updateSpeedBounds();
            find('language').onchange = () => { draft.language = find('language').value; saveDraft(); };
            find('voice').onchange = () => { draft.voice = find('voice').value; saveDraft(); };
            let capabilities = null, generating = false;
            const refresh = async () => {
                find('generate').disabled = true; message.textContent = 'Checking voice service...';
                try {
                    const provider = find('provider').value;
                    const response = await fetch('api/voiceover/dialogue-speech.php' + (['elevenlabs', 'ttsmaker'].includes(provider) ? `?voices=${provider}` : ''), { cache: 'no-store', signal: AbortSignal.timeout(30000) });
                    if (!response.ok) throw Error(`Voice service unavailable (HTTP ${response.status}).`);
                    capabilities = await response.json(); if (!context.alive()) return;
                    for (const [id, name] of [['azure', 'Azure'], ['elevenlabs', 'ElevenLabs'], ['ttsmaker', 'TTSMaker']]) {
                        if (capabilities.providers?.[id]?.authorized && ![...find('provider').options].some(option => option.value === id)) find('provider').append(new Option(`${name} (paid, superadmin)`, id));
                    }
                    const capability = capabilities.providers?.[provider];
                    const editor = window.app?.conversations?.editor;
                    const voices = editor?.voices.call({ manager: { speechCapabilities: capabilities } }, provider) || [];
                    find('voice').replaceChildren(new Option('Choose voice', ''));
                    voices.filter(voice => voice.ready !== false).forEach(voice => find('voice').append(new Option(voice.label || voice.id, voice.id)));
                    if (voices.length === 1) find('voice').value = voices[0].id;
                    if (voices.some(voice => voice.id === draft.voice)) find('voice').value = draft.voice;
                    find('generate').disabled = !capability?.available;
                    message.textContent = capability?.available ? (provider === 'local' ? 'Local generation: no provider fee.' : 'Provider charges apply; confirmation required.') : capability?.reason || 'Voice source unavailable.';
                } catch (error) { message.textContent = error.message; }
            };
            find('refresh').onclick = refresh; find('provider').onchange = () => { draft.provider = find('provider').value; draft.voice = ''; updateSpeedBounds();draft.speed=readSpeed(); saveDraft(); refresh(); };
            find('cancel').onclick = () => this._sequenceSpeechAbort?.abort();
            find('generate').onclick = async () => {
                if (generating) return;
                const provider = find('provider').value, voice = find('voice').value, language = find('language').value, content = text.value.trim();
                if (!content || !voice) { message.textContent = 'Enter speech text and choose a voice.'; return; }
                if (provider !== 'openai' && language !== 'en') { message.textContent = 'This voice source supports English here. Upload audio for other languages.'; return; }
                if (provider === 'local' && new TextEncoder().encode(content).length > 1800) { message.textContent = 'Local speech is limited to 1800 UTF-8 bytes per request.'; return; }
                if (!capabilities?.providers?.[provider]?.available) return;
                if (provider !== 'local' && !confirm(`Send this text to ${provider} to generate speech? Provider charges or AI credits apply.${provider === 'elevenlabs' ? ' Continue only if you own or have permission to use this voice.' : ''}`)) return;
                let loadOptions;
                try { loadOptions=context.loadOptions?.() || {pushHistory:true}; }
                catch(error){message.textContent=error.message;return;}
                generating = true; find('generate').disabled = true; message.textContent = 'Generating speech...'; context.invalidate();
                Object.assign(draft, { text: content, provider, voice, language, speed: readSpeed() });
                saveDraft();
                this._sequenceSpeechAbort?.abort(); const controller = this._sequenceSpeechAbort = new AbortController();
                const scene = window.app.scenes?.[window.app.currentSceneIndex];
                try {
                    const response = await fetch('api/voiceover/dialogue-speech.php', { method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': window.__STAGE_USER?.csrf_token || '' },
                        body: JSON.stringify({ provider, voice, text: content, language, speed: draft.speed, delivery: 'natural', consent: provider !== 'local', voiceRightsConfirmed: provider === 'elevenlabs' }),
                        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(120000)]) });
                    if (!response.ok) { const error = await response.json().catch(() => ({})); throw Error(error.error || error.message || `Speech generation failed (HTTP ${response.status}).`); }
                    const blob = await response.blob();
                    if (!blob.size || !/^(audio\/|application\/octet-stream)/.test(blob.type)) throw Error('Voice service did not return audio.');
                    if (controller.signal.aborted || !context.alive() || window.app.scenes?.[window.app.currentSceneIndex] !== scene) return;
                    const file = new File([blob], 'Sequence speech.' + (blob.type.includes('mpeg') ? 'mp3' : 'wav'), { type: blob.type });
                    if (!await audio().loadAudioFile(file, loadOptions)) throw Error('Could not load generated speech.');
                    if (context.alive()) {
                        await attach(audio().activeAudioId, { text: content });
                        context.status('Speech generated and attached. Add or update the sequence to apply lip sync.');
                        if (applyAfterGeneration?.checked && context.alive()) await context.applySequence();
                    }
                } catch (error) { message.textContent = error.name === 'AbortError' ? 'Generation cancelled.' : error.message; }
                finally { generating = false; if (details.isConnected) find('generate').disabled = false; if (this._sequenceSpeechAbort === controller) this._sequenceSpeechAbort = null; }
            };
        }
    });
    let scheduled = false;
    eventBus.on('timeline:update', () => {
        if (scheduled) return; scheduled = true;
        queueMicrotask(() => { scheduled = false; window.app?.jointSystem?._syncCharacterSequenceAudioLinks(); });
    });
    const remove = JointSystem.prototype._deleteArmatureTimelineAction;
    JointSystem.prototype._deleteArmatureTimelineAction = function(id) {
        const result = remove.call(this, id);
        if (result) { audio()?.tracks.filter(track => track.sequenceLink?.actionId === id).forEach(track => this._detachCharacterSequenceAudio(track)); window.app?._saveCurrentSceneAudioOnly?.(); }
        return result;
    };
})();
