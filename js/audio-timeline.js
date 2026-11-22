/* ============================================
   Animation Stage - Audio Timeline
   Audio track with waveform visualization
   and synced playback
   ============================================ */

class AudioTimeline {
    constructor(animationEngine, timelineManager) {
        this.animations = animationEngine;
        this.timeline = timelineManager;

        this.audioContext = null;
        this.audioBuffer = null;
        this.audioElement = null;
        this.isLoaded = false;
        this.fileName = '';
        this.audioDataUrl = '';
        this.audioMimeType = '';
        this.audioId = '';
        this.audioRevision = 0;
        this.durationMs = 0;
        this.volume = 1;
        this.trimStartMs = 0;
        this.trimEndMs = 0;
        this.timelineStartMs = 0;
        this.characterId = '';
        this.playScope = 'scene';
        this.rangeStartScene = 0;
        this.rangeEndScene = 0;
        this._loadToken = 0;
        this._playToken = 0;
        this.tracks = [];
        this.activeAudioId = '';
        this._nextUploadMode = 'append';
        this._isPlaying = false;
        this._audioDrag = null;
        this._audioDragRaf = 0;
        this._lastTimelineTimeMs = 0;
        this._characterOptionsCache = null;
        this._clipAuditionAudioId = '';
        this._clipAuditionFrame = 0;
        this._clipAuditionRestoreMuted = null;

        this.waveformCanvas = document.getElementById('audio-waveform-canvas');
        this.waveformCtx = this.waveformCanvas?.getContext('2d');
        this.container = document.getElementById('audio-track-container');
        this.labelRow = this._createLabelRow();
        this.trackSelector = this._createTrackSelector();
        this.scopeControls = this._createScopeControls();
        this.editControls = this._createEditControls();
        if (this.container) {
            const waveform = this.container.querySelector('.audio-waveform');
            if (this.trackSelector) this.container.insertBefore(this.trackSelector, waveform || this.container.firstChild);
            const removeBtn = document.getElementById('btn-audio-remove');
            if (this.scopeControls) this.container.insertBefore(this.scopeControls, removeBtn || null);
            if (this.editControls) this.container.insertBefore(this.editControls, removeBtn || null);
        }
        this.clipEditorModal = this._createClipEditorModal();

        this.init();
    }

    init() {
        this.bindEvents();
    }

    bindEvents() {
        // Upload button in timeline
        document.getElementById('tl-audio-upload')?.addEventListener('click', () => {
            this.requestFileUpload({ replace: false });
        });

        // File input change
        document.getElementById('file-input-audio')?.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files || []);
            const replace = this._nextUploadMode === 'replace';
            this._nextUploadMode = 'append';
            for (let index = 0; index < files.length; index++) {
                await this.loadAudioFile(files[index], {
                    pushHistory: index === files.length - 1,
                    replace: replace && index === 0
                });
            }
            e.target.value = '';
        });

        // Remove audio
        document.getElementById('btn-audio-remove')?.addEventListener('click', () => {
            this.removeAudio({ pushHistory: true });
        });

        // Sync with animation playback
        eventBus.on('playback:started', () => this.play());
        eventBus.on('playback:stopped', () => this.stop());
        eventBus.on('playback:paused', () => this.pause());
        eventBus.on('timeline:time', timeMs => {
            this._lastTimelineTimeMs = Math.max(0, Number(timeMs) || 0);
            this._syncPlaybackAt(this._lastTimelineTimeMs, this._isPlaying);
        });
        eventBus.on('object:removed', object => {
            if (window.app?.objects?._suppressHistory) return;
            this.disconnectCharacter(object?.id, {
                removedObject: object,
                pushHistory: false,
                silent: true
            });
        });

        document.addEventListener('mousemove', event => this._queueAudioDrag(event));
        document.addEventListener('mouseup', () => this._finishAudioDrag());

        window.addEventListener('resize', () => {
            if (this.isLoaded) this.drawWaveform();
        });
    }

    requestFileUpload(options = {}) {
        this._nextUploadMode = options.replace === true ? 'replace' : 'append';
        document.getElementById('file-input-audio')?.click();
    }

    _createTrackSelector() {
        const wrap = document.createElement('div');
        wrap.className = 'audio-track-picker';
        wrap.innerHTML = `
            <i class="fas fa-layer-group" aria-hidden="true"></i>
            <select class="audio-track-select" title="Select the audio track to edit; all tracks play together" aria-label="Select audio track to edit"></select>`;
        wrap.querySelector('.audio-track-select')?.addEventListener('change', event => {
            if (this.selectTrack(event.target.value)) this._refreshTimelineUI();
        });
        return wrap;
    }

    _createClipEditorModal() {
        if (typeof document === 'undefined' || !this.container) return null;
        const modal = document.createElement('div');
        modal.className = 'audio-clip-editor-modal hidden';
        modal.innerHTML = `
            <section class="audio-clip-editor-dialog" role="dialog" aria-modal="true" aria-labelledby="audio-clip-editor-title">
                <header class="audio-clip-editor-header">
                    <div><i class="fas fa-music"></i><span id="audio-clip-editor-title">Audio Clip</span></div>
                    <button type="button" class="audio-clip-editor-close" title="Close audio clip editor" aria-label="Close audio clip editor"><i class="fas fa-times"></i></button>
                </header>
                <div class="audio-clip-editor-body"></div>
            </section>`;
        modal.querySelector('.audio-clip-editor-body')?.appendChild(this.container);
        this.container.classList.remove('hidden');
        document.body.appendChild(modal);
        modal.querySelector('.audio-clip-editor-close')?.addEventListener('click', () => this.closeClipEditor());
        modal.addEventListener('mousedown', event => {
            if (event.target === modal) this.closeClipEditor();
        });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && !modal.classList.contains('hidden')) this.closeClipEditor();
        });
        return modal;
    }

    openClipEditor(audioId = this.activeAudioId) {
        if (audioId) this.selectTrack(audioId);
        const track = this.getActiveTrack();
        if (!track || !this.clipEditorModal) return false;
        this._refreshTrackSelector();
        this._refreshScopeControls();
        this._refreshEditControls();
        this._updateLabelRow();
        const title = this.clipEditorModal.querySelector('#audio-clip-editor-title');
        if (title) title.textContent = track.fileName || 'Audio Clip';
        this.clipEditorModal.classList.remove('hidden');
        requestAnimationFrame(() => this.drawWaveform());
        return true;
    }

    closeClipEditor() {
        this._stopClipAudition({ reset: true });
        this.clipEditorModal?.classList.add('hidden');
    }

    _formatClipAuditionTime(milliseconds) {
        const totalSeconds = Math.max(0, Math.floor((Number(milliseconds) || 0) / 1000));
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = String(totalSeconds % 60).padStart(2, '0');
        return `${minutes}:${seconds}`;
    }

    _refreshClipAuditionControls() {
        const button = this.editControls?.querySelector('.audio-preview-toggle');
        const time = this.editControls?.querySelector('.audio-preview-time');
        const track = this.tracks.find(item => item.audioId === this.activeAudioId) || null;
        const audioElement = track?.audioElement || null;
        const edit = track ? this._normalizeTrackEditState(track) : null;
        const durationMs = edit ? Math.max(0, edit.trimEndMs - edit.trimStartMs) : 0;
        const positionMs = edit && audioElement
            ? Math.max(0, Math.min(durationMs, (Number(audioElement.currentTime) || 0) * 1000 - edit.trimStartMs))
            : 0;
        const playing = !!(
            track
            && audioElement
            && this._clipAuditionAudioId === track.audioId
            && audioElement.paused === false
        );
        if (button) {
            button.disabled = !track || !audioElement;
            button.classList.toggle('is-playing', playing);
            button.title = playing ? 'Pause selected audio clip' : 'Play selected audio clip';
            button.setAttribute('aria-label', button.title);
            const icon = button.querySelector('i');
            const label = button.querySelector('span');
            if (icon) icon.className = `fas ${playing ? 'fa-pause' : 'fa-play'}`;
            if (label) label.textContent = playing ? 'Pause' : 'Play';
        }
        if (time) {
            time.textContent = `${this._formatClipAuditionTime(positionMs)} / ${this._formatClipAuditionTime(durationMs)}`;
        }
    }

    _stopClipAudition(options = {}) {
        if (this._clipAuditionFrame) cancelAnimationFrame(this._clipAuditionFrame);
        this._clipAuditionFrame = 0;
        const audioId = this._clipAuditionAudioId;
        const track = this.tracks.find(item => item.audioId === audioId) || null;
        const audioElement = track?.audioElement || null;
        this._clipAuditionAudioId = '';
        if (audioElement) {
            try { audioElement.pause(); } catch (_) {}
            if (this._clipAuditionRestoreMuted !== null) {
                audioElement.muted = this._clipAuditionRestoreMuted;
                track.muted = this._clipAuditionRestoreMuted;
            }
            if (options.reset === true) {
                const edit = this._normalizeTrackEditState(track);
                try { audioElement.currentTime = edit.trimStartMs / 1000; } catch (_) {}
            }
        }
        this._clipAuditionRestoreMuted = null;
        this._refreshClipAuditionControls();
    }

    _scheduleClipAuditionFrame() {
        if (this._clipAuditionFrame) cancelAnimationFrame(this._clipAuditionFrame);
        const tick = () => {
            this._clipAuditionFrame = 0;
            const track = this.tracks.find(item => item.audioId === this._clipAuditionAudioId) || null;
            const audioElement = track?.audioElement || null;
            if (!track || !audioElement) {
                this._stopClipAudition();
                return;
            }
            const edit = this._normalizeTrackEditState(track);
            if ((Number(audioElement.currentTime) || 0) * 1000 >= edit.trimEndMs - 8) {
                this._stopClipAudition();
                return;
            }
            this._refreshClipAuditionControls();
            if (audioElement.paused === false) {
                this._clipAuditionFrame = requestAnimationFrame(tick);
            } else {
                this._stopClipAudition();
            }
        };
        this._clipAuditionFrame = requestAnimationFrame(tick);
    }

    async _toggleClipAudition() {
        const track = this.getActiveTrack();
        const audioElement = track?.audioElement || null;
        if (!track || !audioElement) return false;
        if (this._clipAuditionAudioId === track.audioId && audioElement.paused === false) {
            this._stopClipAudition();
            return true;
        }

        this._stopClipAudition();
        this._isPlaying = false;
        this.tracks.forEach(item => {
            item._playToken = (item._playToken || 0) + 1;
            item._playPending = false;
            if (item.audioElement && item.audioElement !== audioElement) {
                try { item.audioElement.pause(); } catch (_) {}
            }
        });

        const edit = this._normalizeTrackEditState(track);
        const currentMs = (Number(audioElement.currentTime) || 0) * 1000;
        if (currentMs < edit.trimStartMs || currentMs >= edit.trimEndMs - 8) {
            try { audioElement.currentTime = edit.trimStartMs / 1000; } catch (_) {}
        }
        audioElement.volume = Math.max(0, Math.min(1, Number(track.volume ?? 1)));
        audioElement.playbackRate = 1;
        this._clipAuditionRestoreMuted = audioElement.muted === true;
        audioElement.muted = false;
        this._clipAuditionAudioId = track.audioId;
        this._refreshClipAuditionControls();
        try {
            await audioElement.play();
            this._refreshClipAuditionControls();
            this._scheduleClipAuditionFrame();
            return true;
        } catch (error) {
            this._stopClipAudition();
            Utils.showToast(`Unable to play audio preview: ${error?.message || error}`, 'warning');
            return false;
        }
    }

    _resetActiveFields() {
        this.audioElement = null;
        this.audioBuffer = null;
        this.audioDataUrl = '';
        this.audioMimeType = '';
        this.audioId = '';
        this.audioRevision = 0;
        this.durationMs = 0;
        this.volume = 1;
        this.trimStartMs = 0;
        this.trimEndMs = 0;
        this.timelineStartMs = 0;
        this.characterId = '';
        this.playScope = 'scene';
        this.rangeStartScene = this._getCurrentSceneIndex();
        this.rangeEndScene = this._getCurrentSceneIndex();
        this.fileName = '';
        this.activeAudioId = '';
    }

    _saveActiveTrack() {
        const track = this.tracks.find(item => item.audioId === this.activeAudioId);
        if (!track) return null;
        track.audioElement = this.audioElement;
        track.audioBuffer = this.audioBuffer;
        track.fileName = this.fileName;
        track.audioDataUrl = this.audioDataUrl;
        track.audioMimeType = this.audioMimeType;
        track.audioId = this.audioId;
        track.audioRevision = this.audioRevision;
        track.durationMs = this.durationMs;
        track.volume = this.volume;
        track.trimStartMs = this.trimStartMs;
        track.trimEndMs = this.trimEndMs;
        track.timelineStartMs = this.timelineStartMs;
        track.characterId = this.characterId;
        track.playScope = this.playScope;
        track.rangeStartScene = this.rangeStartScene;
        track.rangeEndScene = this.rangeEndScene;
        track.muted = this._clipAuditionAudioId === track.audioId && this._clipAuditionRestoreMuted !== null
            ? this._clipAuditionRestoreMuted
            : !!this.audioElement?.muted;
        return track;
    }

    _applyActiveTrack(track) {
        if (!track) {
            this._resetActiveFields();
            this.isLoaded = this.tracks.length > 0;
            return;
        }
        this.audioElement = track.audioElement || null;
        this.audioBuffer = track.audioBuffer || null;
        this.fileName = track.fileName || 'Soundtrack';
        this.audioDataUrl = track.audioDataUrl || '';
        this.audioMimeType = track.audioMimeType || '';
        this.audioId = track.audioId || '';
        this.audioRevision = Math.max(1, Number(track.audioRevision) || 1);
        this.durationMs = Math.max(0, Number(track.durationMs) || 0);
        this.volume = Math.max(0, Math.min(1, Number(track.volume ?? 1)));
        this.trimStartMs = Math.max(0, Number(track.trimStartMs) || 0);
        this.trimEndMs = Math.max(0, Number(track.trimEndMs) || 0);
        this.timelineStartMs = Math.max(0, Number(track.timelineStartMs) || 0);
        this.characterId = typeof track.characterId === 'string' ? track.characterId : '';
        this.playScope = track.playScope === 'range' ? 'range' : 'scene';
        this.rangeStartScene = Math.max(0, Number(track.rangeStartScene) || 0);
        this.rangeEndScene = Math.max(0, Number(track.rangeEndScene) || 0);
        this.activeAudioId = this.audioId;
        this.isLoaded = true;
    }

    getTracks() {
        this._saveActiveTrack();
        return this.tracks.slice();
    }

    getActiveTrack() {
        return this._saveActiveTrack()
            || this.tracks.find(track => track.audioId === this.activeAudioId)
            || this.tracks[0]
            || null;
    }

    selectTrack(audioId, options = {}) {
        const next = this.tracks.find(track => track.audioId === audioId);
        if (!next) return false;
        if (this._clipAuditionAudioId && this._clipAuditionAudioId !== next.audioId) {
            this._stopClipAudition({ reset: true });
        }
        this._saveActiveTrack();
        this._applyActiveTrack(next);
        this._refreshTrackSelector();
        this._refreshScopeControls();
        this._refreshEditControls();
        this._updateLabelRow();
        this.drawWaveform();
        const editorTitle = this.clipEditorModal?.querySelector('#audio-clip-editor-title');
        if (editorTitle) editorTitle.textContent = next.fileName || 'Audio Clip';
        try { window.app?.objects?.updateObjectList?.(); } catch (_) {}
        if (options.pushHistory === true) eventBus.emit('history:push');
        return true;
    }

    _refreshTrackSelector() {
        const select = this.trackSelector?.querySelector('.audio-track-select');
        if (!select) return;
        select.innerHTML = this.tracks.map((track, index) => {
            const label = `${index + 1}. ${track.fileName || 'Soundtrack'}`;
            return `<option value="${Utils.escapeAttr(track.audioId)}">${Utils.escapeHtml(label)}</option>`;
        }).join('');
        select.value = this.activeAudioId || this.tracks[0]?.audioId || '';
        select.disabled = this.tracks.length < 2;
        this.trackSelector.title = this.tracks.length > 1
            ? `${this.tracks.length} audio tracks`
            : 'Audio track';
    }

    _getSceneCount() {
        return Math.max(1, window.app?.scenes?.length || 1);
    }

    _getCurrentSceneIndex() {
        return Math.max(0, Math.min(this._getSceneCount() - 1, window.app?.currentSceneIndex || 0));
    }

    _normalizeScope(scope, startScene, endScene) {
        const count = this._getSceneCount();
        const current = this._getCurrentSceneIndex();
        const playScope = scope === 'range' ? 'range' : 'scene';
        let start = Number.isInteger(Number(startScene)) ? Number(startScene) : current;
        let end = Number.isInteger(Number(endScene)) ? Number(endScene) : current;
        start = Math.max(0, Math.min(count - 1, start));
        end = Math.max(0, Math.min(count - 1, end));
        if (end < start) [start, end] = [end, start];
        return { playScope, rangeStartScene: start, rangeEndScene: end };
    }

    _createScopeControls() {
        const wrap = document.createElement('div');
        wrap.className = 'audio-scope-controls';
        wrap.innerHTML = `
            <select class="audio-scope-select" title="Audio playback scope">
                <option value="scene">Scene only</option>
                <option value="range">Across scenes</option>
            </select>
            <input class="audio-scope-start" type="number" min="1" value="1" title="Start scene">
            <span class="audio-scope-sep">to</span>
            <input class="audio-scope-end" type="number" min="1" value="1" title="End scene">`;
        const persist = () => this._setScopeFromControls(true);
        wrap.querySelector('.audio-scope-select')?.addEventListener('change', persist);
        wrap.querySelector('.audio-scope-start')?.addEventListener('change', persist);
        wrap.querySelector('.audio-scope-end')?.addEventListener('change', persist);
        return wrap;
    }

    _setScopeFromControls(pushHistory = false) {
        if (!this.scopeControls) return;
        const select = this.scopeControls.querySelector('.audio-scope-select');
        const startInput = this.scopeControls.querySelector('.audio-scope-start');
        const endInput = this.scopeControls.querySelector('.audio-scope-end');
        const normalized = this._normalizeScope(
            select?.value,
            (parseInt(startInput?.value, 10) || 1) - 1,
            (parseInt(endInput?.value, 10) || 1) - 1
        );
        this.playScope = normalized.playScope;
        this.rangeStartScene = normalized.rangeStartScene;
        this.rangeEndScene = normalized.rangeEndScene;
        this._saveActiveTrack();
        this._refreshScopeControls();
        this._updateLabelRow();
        this._refreshTimelineUI();
        window.app?._saveCurrentSceneAudioOnly?.();
        if (pushHistory) eventBus.emit('history:push');
    }

    _createEditControls() {
        const wrap = document.createElement('div');
        wrap.className = 'audio-edit-controls';
        wrap.innerHTML = `
            <label class="audio-edit-field audio-volume-field" title="Audio volume">
                <span>Vol</span>
                <input class="audio-volume" type="range" min="0" max="100" value="100">
                <output class="audio-volume-value">100%</output>
            </label>
            <label class="audio-edit-field" title="Timeline start time in seconds">
                <span>At</span>
                <input class="audio-timeline-start" type="number" min="0" step="0.01" value="0">
            </label>
            <label class="audio-edit-field" title="Timeline end time in seconds">
                <span>End</span>
                <input class="audio-timeline-end" type="number" min="0" step="0.01" value="0">
            </label>
            <label class="audio-edit-field" title="Source in point in seconds">
                <span>In</span>
                <input class="audio-trim-start" type="number" min="0" step="0.01" value="0">
            </label>
            <label class="audio-edit-field" title="Source out point in seconds">
                <span>Out</span>
                <input class="audio-trim-end" type="number" min="0" step="0.01" value="0">
            </label>
            <label class="audio-edit-field audio-character-field" title="Character driven by this audio track">
                <span>Character</span>
                <select class="audio-character-select"><option value="">No character binding</option></select>
            </label>
            <button type="button" class="audio-character-disconnect" title="Disconnect this audio from its character" aria-label="Disconnect character from audio">
                <i class="fas fa-unlink"></i><span>Disconnect</span>
            </button>
            <button type="button" class="audio-preview-toggle" title="Play selected audio clip" aria-label="Play selected audio clip">
                <i class="fas fa-play"></i><span>Play</span>
            </button>
            <output class="audio-preview-time" aria-live="polite">0:00 / 0:00</output>
            <button type="button" class="audio-lip-sync-launch" title="Create lip sync for the selected character">
                <i class="fas fa-wave-square"></i><span>Lip Sync</span>
            </button>
            <button type="button" class="audio-replace-launch" title="Replace this audio file">
                <i class="fas fa-upload"></i><span>Replace</span>
            </button>`;
        const persist = event => this._setEditFromControls(true, event.target?.className || '');
        wrap.querySelector('.audio-volume')?.addEventListener('input', () => this._setEditFromControls(false));
        wrap.querySelector('.audio-volume')?.addEventListener('change', persist);
        wrap.querySelector('.audio-timeline-start')?.addEventListener('change', persist);
        wrap.querySelector('.audio-timeline-end')?.addEventListener('change', persist);
        wrap.querySelector('.audio-trim-start')?.addEventListener('change', persist);
        wrap.querySelector('.audio-trim-end')?.addEventListener('change', persist);
        wrap.querySelector('.audio-character-select')?.addEventListener('change', persist);
        wrap.querySelector('.audio-character-disconnect')?.addEventListener('click', () => {
            this.setTrackCharacterBinding(this.activeAudioId, '', { pushHistory: true });
        });
        wrap.querySelector('.audio-preview-toggle')?.addEventListener('click', () => {
            void this._toggleClipAudition();
        });
        wrap.querySelector('.audio-lip-sync-launch')?.addEventListener('click', () => {
            this._launchLipSyncForTrack(this.activeAudioId);
        });
        wrap.querySelector('.audio-replace-launch')?.addEventListener('click', () => this.requestFileUpload({ replace: true }));
        return wrap;
    }

    _normalizeEditState(volume = this.volume, trimStartMs = this.trimStartMs, trimEndMs = this.trimEndMs) {
        const fullDuration = this.getSourceDurationMs();
        const normalizedVolume = Math.max(0, Math.min(1, Number(volume)));
        let start = Math.max(0, Number(trimStartMs) || 0);
        let end = Math.max(0, Number(trimEndMs) || 0);
        if (fullDuration > 0) {
            start = Math.min(fullDuration, start);
            end = end > 0 ? Math.min(fullDuration, end) : fullDuration;
        }
        if (end <= start) end = fullDuration > start ? fullDuration : start;
        return {
            volume: Number.isFinite(normalizedVolume) ? normalizedVolume : 1,
            trimStartMs: start,
            trimEndMs: end
        };
    }

    _setEditFromControls(pushHistory = false, changedField = '') {
        if (!this.editControls) return;
        const volumeInput = this.editControls.querySelector('.audio-volume');
        const timelineStartInput = this.editControls.querySelector('.audio-timeline-start');
        const timelineEndInput = this.editControls.querySelector('.audio-timeline-end');
        const startInput = this.editControls.querySelector('.audio-trim-start');
        const endInput = this.editControls.querySelector('.audio-trim-end');
        const characterInput = this.editControls.querySelector('.audio-character-select');
        const previousTrackState = {
            timelineStartMs: this.timelineStartMs,
            trimStartMs: this.trimStartMs,
            trimEndMs: this.trimEndMs,
            audioRevision: this.audioRevision
        };
        const previousCharacterId = String(this.characterId || '');
        const requestedCharacterId = String(characterInput?.value || '');
        let requestedTrimEndMs = (parseFloat(endInput?.value) || 0) * 1000;
        const requestedTimelineStartMs = Math.max(0, (parseFloat(timelineStartInput?.value) || 0) * 1000);
        if (String(changedField).includes('audio-timeline-end')) {
            const requestedTimelineEndMs = Math.max(requestedTimelineStartMs + 100, (parseFloat(timelineEndInput?.value) || 0) * 1000);
            requestedTrimEndMs = ((parseFloat(startInput?.value) || 0) * 1000) + (requestedTimelineEndMs - requestedTimelineStartMs);
        }
        const next = this._normalizeEditState(
            (parseFloat(volumeInput?.value) || 0) / 100,
            (parseFloat(startInput?.value) || 0) * 1000,
            requestedTrimEndMs
        );
        const trimChanged = next.trimStartMs !== this.trimStartMs || next.trimEndMs !== this.trimEndMs;
        this.volume = next.volume;
        this.trimStartMs = next.trimStartMs;
        this.trimEndMs = next.trimEndMs;
        this.timelineStartMs = requestedTimelineStartMs;
        if (previousCharacterId !== requestedCharacterId) {
            this.setTrackCharacterBinding(this.activeAudioId, requestedCharacterId, {
                persist: false,
                pushHistory: false,
                refresh: false
            });
        } else {
            this.characterId = requestedCharacterId;
        }
        if (trimChanged) this.audioRevision = Math.max(1, Number(this.audioRevision) || 1) + 1;
        if (this.audioElement) this.audioElement.volume = this.volume;
        const track = this._saveActiveTrack();
        if (track && (previousTrackState.timelineStartMs !== this.timelineStartMs || trimChanged)) {
            this._syncLinkedLipSyncTiming(track, previousTrackState, { trimChanged });
        }
        this._refreshEditControls();
        this._updateLabelRow();
        this._refreshTimelineUI();
        window.app?._saveCurrentSceneAudioOnly?.();
        if (pushHistory) eventBus.emit('history:push');
    }

    _refreshEditControls() {
        if (!this.editControls) return;
        const state = this._normalizeEditState();
        this.volume = state.volume;
        this.trimStartMs = state.trimStartMs;
        this.trimEndMs = state.trimEndMs;
        this._saveActiveTrack();
        const sourceSeconds = Math.max(0, this.getSourceDurationMs() / 1000);
        const volumeInput = this.editControls.querySelector('.audio-volume');
        const volumeValue = this.editControls.querySelector('.audio-volume-value');
        const timelineStartInput = this.editControls.querySelector('.audio-timeline-start');
        const timelineEndInput = this.editControls.querySelector('.audio-timeline-end');
        const startInput = this.editControls.querySelector('.audio-trim-start');
        const endInput = this.editControls.querySelector('.audio-trim-end');
        const characterInput = this.editControls.querySelector('.audio-character-select');
        const disconnectButton = this.editControls.querySelector('.audio-character-disconnect');
        const lipSyncButton = this.editControls.querySelector('.audio-lip-sync-launch');
        if (volumeInput) volumeInput.value = String(Math.round(this.volume * 100));
        if (volumeValue) volumeValue.textContent = `${Math.round(this.volume * 100)}%`;
        [startInput, endInput].forEach(input => {
            if (!input) return;
            input.max = sourceSeconds.toFixed(2);
            input.disabled = !this.isLoaded;
        });
        if (startInput) startInput.value = (this.trimStartMs / 1000).toFixed(2);
        if (endInput) endInput.value = (this.trimEndMs / 1000).toFixed(2);
        if (timelineStartInput) timelineStartInput.value = (this.timelineStartMs / 1000).toFixed(2);
        if (timelineEndInput) timelineEndInput.value = ((this.timelineStartMs + this.getDurationMs()) / 1000).toFixed(2);
        this._populateCharacterSelect(characterInput);
        if (disconnectButton) disconnectButton.disabled = !this.isLoaded || !this.characterId;
        if (lipSyncButton) {
            const state = this._getLinkedLipSyncState(this.getActiveTrack());
            const label = lipSyncButton.querySelector('span');
            lipSyncButton.classList.toggle('has-lip-sync', state.count > 0 && state.stale === 0);
            lipSyncButton.classList.toggle('needs-refresh', state.stale > 0);
            lipSyncButton.title = state.stale > 0
                ? (state.reason || 'Audio changed. Refresh the linked lip sync.')
                : (state.count > 0 ? 'Edit linked lip sync' : 'Create lip sync for the selected character');
            if (label) label.textContent = state.stale > 0 ? 'Refresh Lip Sync' : 'Lip Sync';
        }
        this._refreshClipAuditionControls();
    }

    _refreshScopeControls() {
        if (!this.scopeControls) return;
        const count = this._getSceneCount();
        const normalized = this._normalizeScope(this.playScope, this.rangeStartScene, this.rangeEndScene);
        this.playScope = normalized.playScope;
        this.rangeStartScene = normalized.rangeStartScene;
        this.rangeEndScene = normalized.rangeEndScene;
        const select = this.scopeControls.querySelector('.audio-scope-select');
        const startInput = this.scopeControls.querySelector('.audio-scope-start');
        const endInput = this.scopeControls.querySelector('.audio-scope-end');
        if (select) select.value = this.playScope;
        [startInput, endInput].forEach(input => {
            if (!input) return;
            input.max = String(count);
            input.disabled = this.playScope !== 'range';
        });
        if (startInput) startInput.value = String(this.rangeStartScene + 1);
        if (endInput) endInput.value = String(this.rangeEndScene + 1);
    }

    _createLabelRow() {
        const label = document.createElement('div');
        label.id = 'audio-track-label-row';
        label.className = 'tl-audio-label-content hidden';
        label.innerHTML = `
            <span class="tl-audio-label-icon"><i class="fas fa-music"></i></span>
            <span class="tl-audio-label-meta">
                <span class="tl-audio-label-title">Soundtrack</span>
                <span class="tl-audio-label-subtitle">No audio loaded</span>
            </span>`;
        return label;
    }

    _updateLabelRow() {
        if (!this.labelRow) return;
        const title = this.labelRow.querySelector('.tl-audio-label-title');
        const subtitle = this.labelRow.querySelector('.tl-audio-label-subtitle');
        if (!subtitle) return;
        if (title) title.textContent = this.tracks.length > 1 ? `Audio (${this.tracks.length})` : 'Audio';
        const pieces = [];
        if (this.fileName) pieces.push(this.fileName);
        if (this.getDurationMs() > 0) pieces.push(Utils.formatTime(this.getDurationMs()));
        if (this.volume !== 1) pieces.push(`${Math.round(this.volume * 100)}%`);
        if (this.trimStartMs > 0 || this.trimEndMs < this.getSourceDurationMs()) {
            pieces.push(`${Utils.formatTime(this.trimStartMs)}-${Utils.formatTime(this.trimEndMs)}`);
        }
        if (this.playScope === 'range') pieces.push(`Scenes ${this.rangeStartScene + 1}-${this.rangeEndScene + 1}`);
        else pieces.push('Scene only');
        subtitle.textContent = pieces.join(' | ') || 'No audio loaded';
        this.labelRow.title = pieces.join(' | ') || 'Soundtrack';
    }

    syncTimelinePresence() {
        this._saveActiveTrack();
        this._updateLabelRow();
        this._refreshTrackSelector();
        this.labelRow?.classList.toggle('hidden', !this.isLoaded);
        this.container?.classList.toggle('hidden', !this.isLoaded);
        if (!this.isLoaded) {
            this.closeClipEditor();
            return;
        }
        this._refreshScopeControls();
        this._refreshEditControls();
        const removeButton = document.getElementById('btn-audio-remove');
        if (removeButton) removeButton.title = this.tracks.length > 1
            ? 'Remove selected audio track'
            : 'Remove audio track';
        this.drawWaveform();
    }

    renderTimelineRows(pixelsPerSecond = this.timeline?.pixelsPerSecond || 50) {
        this._saveActiveTrack();
        const scale = Math.max(1, Number(pixelsPerSecond) || 50);
        const characterNames = new Map((window.app?.objects?.objects || []).map(object => [
            String(object?.id || ''),
            String(object?.name || 'Character')
        ]));
        const rows = this.tracks.map((track, index) => {
            const startMs = Math.max(0, Number(track.timelineStartMs) || 0);
            const durationMs = this._getTrackClipDurationMs(track);
            const left = startMs / 1000 * scale;
            const width = Math.max(18, durationMs / 1000 * scale);
            const active = String(track.audioId) === String(this.activeAudioId);
            const muted = track.muted === true;
            const characterName = characterNames.get(String(track.characterId || '')) || '';
            const lipSyncState = this._getLinkedLipSyncState(track);
            const lipSyncClass = lipSyncState.stale > 0
                ? ' needs-refresh'
                : (lipSyncState.count > 0 ? ' has-lip-sync' : '');
            const lipSyncTitle = lipSyncState.stale > 0
                ? (lipSyncState.reason || 'Refresh lip sync after the audio edit')
                : (lipSyncState.count > 0 ? 'Edit linked lip sync' : 'Create lip sync');
            const lipSyncIcon = lipSyncState.stale > 0 ? 'fa-rotate' : 'fa-wave-square';
            const safeId = Utils.escapeAttr(track.audioId);
            const safeName = Utils.escapeHtml(track.fileName || `Audio ${index + 1}`);
            const timing = `${Utils.formatTime(startMs)} - ${Utils.formatTime(startMs + durationMs)}`;
            const meta = characterName ? `${timing} | ${characterName}` : timing;
            return {
                label: `<div class="timeline-label tl-audio-clip-label${active ? ' selected' : ''}" style="height:44px" data-audio-id="${safeId}">
                    <button type="button" class="tl-audio-action audio-row-mute" title="${muted ? 'Unmute' : 'Mute'} ${Utils.escapeAttr(track.fileName || 'audio')}" aria-label="${muted ? 'Unmute' : 'Mute'} ${Utils.escapeAttr(track.fileName || 'audio')}"><i class="fas ${muted ? 'fa-volume-mute' : 'fa-volume-up'}"></i></button>
                    <span class="tl-audio-clip-meta">
                        <span class="tl-audio-clip-name">${safeName}</span>
                        <span class="tl-audio-clip-timing">${Utils.escapeHtml(meta)}</span>
                    </span>
                    <button type="button" class="tl-audio-action audio-row-lipsync${lipSyncClass}" title="${Utils.escapeAttr(lipSyncTitle)}" aria-label="${Utils.escapeAttr(lipSyncTitle)} for ${Utils.escapeAttr(track.fileName || 'audio')}"><i class="fas ${lipSyncIcon}"></i></button>
                    <button type="button" class="tl-audio-action audio-row-edit" title="Edit audio clip" aria-label="Edit ${Utils.escapeAttr(track.fileName || 'audio')}"><i class="fas fa-sliders-h"></i></button>
                    <button type="button" class="tl-audio-action audio-row-remove" title="Remove audio clip" aria-label="Remove ${Utils.escapeAttr(track.fileName || 'audio')}"><i class="fas fa-times"></i></button>
                </div>`,
                track: `<div class="timeline-track tl-audio-clip-track" style="height:44px" data-audio-id="${safeId}">
                    <div class="audio-clip-bar${active ? ' selected' : ''}${muted ? ' muted' : ''}" style="left:${left}px;width:${width}px" data-audio-id="${safeId}" title="${Utils.escapeAttr(`${track.fileName || 'Audio'} | ${timing} | drag to move; drag edges to trim`)}">
                        <span class="audio-clip-handle audio-clip-handle-in" data-audio-edge="in" title="Trim start"></span>
                        <canvas class="audio-clip-waveform" aria-hidden="true"></canvas>
                        <span class="audio-clip-caption"><i class="fas fa-music"></i><span>${safeName}</span></span>
                        <span class="audio-clip-handle audio-clip-handle-out" data-audio-edge="out" title="Trim end"></span>
                    </div>
                </div>`
            };
        });
        return {
            labelsHTML: rows.map(row => row.label).join(''),
            tracksHTML: rows.map(row => row.track).join('')
        };
    }

    bindTimelineRows(labelsEl = document.getElementById('timeline-labels'), trackArea = document.getElementById('timeline-track-area')) {
        if (!labelsEl || !trackArea) return;
        const select = audioId => {
            if (this.selectTrack(audioId)) {
                labelsEl.querySelectorAll('.tl-audio-clip-label').forEach(row => row.classList.toggle('selected', row.dataset.audioId === audioId));
                trackArea.querySelectorAll('.audio-clip-bar').forEach(bar => bar.classList.toggle('selected', bar.dataset.audioId === audioId));
            }
        };
        labelsEl.querySelectorAll('.tl-audio-clip-label').forEach(row => {
            const audioId = row.dataset.audioId;
            row.addEventListener('click', event => {
                if (event.target.closest('button')) return;
                select(audioId);
            });
            row.querySelector('.tl-audio-clip-meta')?.addEventListener('dblclick', event => {
                event.stopPropagation();
                this.openClipEditor(audioId);
            });
            row.querySelector('.audio-row-mute')?.addEventListener('click', event => {
                event.stopPropagation();
                select(audioId);
                this.toggleMuted();
            });
            row.querySelector('.audio-row-lipsync')?.addEventListener('click', event => {
                event.stopPropagation();
                this._launchLipSyncForTrack(audioId);
            });
            row.querySelector('.audio-row-edit')?.addEventListener('click', event => {
                event.stopPropagation();
                this.openClipEditor(audioId);
            });
            row.querySelector('.audio-row-remove')?.addEventListener('click', event => {
                event.stopPropagation();
                select(audioId);
                this.removeAudio({ pushHistory: true });
            });
        });
        trackArea.querySelectorAll('.audio-clip-bar').forEach(bar => {
            const audioId = bar.dataset.audioId;
            const track = this.tracks.find(item => String(item.audioId) === String(audioId));
            if (!track) return;
            bar.addEventListener('click', event => {
                event.stopPropagation();
                select(audioId);
            });
            bar.addEventListener('dblclick', event => {
                event.stopPropagation();
                this.openClipEditor(audioId);
            });
            bar.addEventListener('mousedown', event => {
                if (event.button !== 0) return;
                event.stopPropagation();
                event.preventDefault();
                select(audioId);
                const edge = event.target.closest('[data-audio-edge]')?.dataset.audioEdge;
                this._startAudioDrag(event, track, bar, edge === 'in' ? 'trim-in' : (edge === 'out' ? 'trim-out' : 'move'));
            });
            this._drawTrackWaveformCanvas(track, bar.querySelector('.audio-clip-waveform'));
        });
    }

    _drawTrackWaveformCanvas(track, canvas) {
        const buffer = track?.audioBuffer;
        if (!buffer || !canvas) return;
        const cssWidth = Math.max(18, Math.round(canvas.clientWidth || canvas.parentElement?.clientWidth || 120));
        const cssHeight = Math.max(18, Math.round(canvas.clientHeight || canvas.parentElement?.clientHeight || 32));
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.max(1, Math.min(4096, Math.round(cssWidth * dpr)));
        canvas.height = Math.max(1, Math.min(128, Math.round(cssHeight * dpr)));
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const data = buffer.getChannelData(0);
        const sourceDuration = Math.max(1, this._getTrackSourceDurationMs(track));
        const edit = this._normalizeTrackEditState(track);
        const sampleStart = Math.max(0, Math.floor(data.length * edit.trimStartMs / sourceDuration));
        const sampleEnd = Math.max(sampleStart + 1, Math.min(data.length, Math.ceil(data.length * edit.trimEndMs / sourceDuration)));
        const width = canvas.width;
        const height = canvas.height;
        const mid = height / 2;
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = 'rgba(255,255,255,.28)';
        const step = Math.max(1, Math.ceil((sampleEnd - sampleStart) / width));
        for (let x = 0; x < width; x++) {
            let min = 1;
            let max = -1;
            const from = sampleStart + x * step;
            const to = Math.min(sampleEnd, from + step);
            for (let sampleIndex = from; sampleIndex < to; sampleIndex++) {
                const sample = data[sampleIndex] || 0;
                min = Math.min(min, sample);
                max = Math.max(max, sample);
            }
            const top = (1 + min) * mid;
            ctx.fillRect(x, top, 1, Math.max(1, (max - min) * mid));
        }
    }

    _startAudioDrag(event, track, bar, mode) {
        const edit = this._normalizeTrackEditState(track);
        this._audioDrag = {
            audioId: track.audioId,
            mode,
            bar,
            startX: event.clientX,
            lastX: event.clientX,
            shiftKey: event.shiftKey,
            originalTimelineStartMs: Math.max(0, Number(track.timelineStartMs) || 0),
            originalTrimStartMs: edit.trimStartMs,
            originalTrimEndMs: edit.trimEndMs,
            originalAudioRevision: Math.max(1, Number(track.audioRevision) || 1),
            sourceDurationMs: this._getTrackSourceDurationMs(track),
            changed: false,
            trimChanged: false
        };
        bar.classList.add('dragging');
        document.body.classList.add('audio-clip-dragging');
    }

    _queueAudioDrag(event) {
        if (!this._audioDrag) return;
        this._audioDrag.lastX = event.clientX;
        this._audioDrag.shiftKey = event.shiftKey;
        if (this._audioDragRaf) return;
        this._audioDragRaf = requestAnimationFrame(() => {
            this._audioDragRaf = 0;
            this._applyAudioDrag();
        });
    }

    _snapTimelineValue(valueMs, audioId, bypass = false) {
        const value = Math.max(0, Number(valueMs) || 0);
        if (bypass) return value;
        const scale = Math.max(1, Number(this.timeline?.pixelsPerSecond) || 50);
        const threshold = Math.max(20, 8 / scale * 1000);
        const candidates = [0];
        this.tracks.forEach(track => {
            if (String(track.audioId) === String(audioId)) return;
            candidates.push(Math.max(0, Number(track.timelineStartMs) || 0), this._getTrackTimelineEndMs(track));
        });
        let best = value;
        let distance = threshold + 1;
        candidates.forEach(candidate => {
            const nextDistance = Math.abs(candidate - value);
            if (nextDistance <= threshold && nextDistance < distance) {
                best = candidate;
                distance = nextDistance;
            }
        });
        return best;
    }

    _snapAudioMoveStart(startMs, durationMs, audioId, bypass = false) {
        const start = Math.max(0, Number(startMs) || 0);
        if (bypass) return start;
        const scale = Math.max(1, Number(this.timeline?.pixelsPerSecond) || 50);
        const threshold = Math.max(20, 8 / scale * 1000);
        const candidates = [0];
        this.tracks.forEach(track => {
            if (String(track.audioId) === String(audioId)) return;
            candidates.push(Math.max(0, Number(track.timelineStartMs) || 0), this._getTrackTimelineEndMs(track));
        });
        const anchors = [start, start + Math.max(0, Number(durationMs) || 0)];
        let bestDelta = 0;
        let bestDistance = threshold + 1;
        candidates.forEach(candidate => {
            anchors.forEach(anchor => {
                const delta = candidate - anchor;
                const distance = Math.abs(delta);
                if (distance <= threshold && distance < bestDistance) {
                    bestDelta = delta;
                    bestDistance = distance;
                }
            });
        });
        return Math.max(0, start + bestDelta);
    }

    _applyAudioDrag() {
        const drag = this._audioDrag;
        if (!drag) return;
        const track = this.tracks.find(item => String(item.audioId) === String(drag.audioId));
        if (!track) return;
        const scale = Math.max(1, Number(this.timeline?.pixelsPerSecond) || 50);
        const deltaMs = (drag.lastX - drag.startX) / scale * 1000;
        if (drag.mode === 'move') {
            let nextStart = Math.max(0, drag.originalTimelineStartMs + deltaMs);
            const duration = drag.originalTrimEndMs - drag.originalTrimStartMs;
            nextStart = this._snapAudioMoveStart(nextStart, duration, track.audioId, drag.shiftKey);
            track.timelineStartMs = Math.round(nextStart);
        } else if (drag.mode === 'trim-in') {
            let nextStart = Math.max(0, drag.originalTimelineStartMs + deltaMs);
            nextStart = this._snapTimelineValue(nextStart, track.audioId, drag.shiftKey);
            const appliedDelta = Math.max(-drag.originalTrimStartMs, Math.min(drag.originalTrimEndMs - drag.originalTrimStartMs - 100, nextStart - drag.originalTimelineStartMs));
            track.timelineStartMs = Math.round(drag.originalTimelineStartMs + appliedDelta);
            track.trimStartMs = Math.round(drag.originalTrimStartMs + appliedDelta);
            drag.trimChanged = true;
        } else {
            track.trimEndMs = Math.round(Math.max(
                drag.originalTrimStartMs + 100,
                Math.min(drag.sourceDurationMs || drag.originalTrimEndMs, drag.originalTrimEndMs + deltaMs)
            ));
            drag.trimChanged = true;
        }
        drag.changed = track.timelineStartMs !== drag.originalTimelineStartMs
            || track.trimStartMs !== drag.originalTrimStartMs
            || track.trimEndMs !== drag.originalTrimEndMs;
        const left = Math.max(0, Number(track.timelineStartMs) || 0) / 1000 * scale;
        const width = Math.max(18, this._getTrackClipDurationMs(track) / 1000 * scale);
        drag.bar.style.left = `${left}px`;
        drag.bar.style.width = `${width}px`;
        if (String(track.audioId) === String(this.activeAudioId)) {
            this._applyActiveTrack(track);
            this._refreshEditControls();
        }
    }

    _finishAudioDrag() {
        const drag = this._audioDrag;
        if (!drag) return;
        if (this._audioDragRaf) {
            cancelAnimationFrame(this._audioDragRaf);
            this._audioDragRaf = 0;
            this._applyAudioDrag();
        }
        drag.bar?.classList.remove('dragging');
        document.body.classList.remove('audio-clip-dragging');
        this._audioDrag = null;
        if (!drag.changed) return;
        const track = this.tracks.find(item => String(item.audioId) === String(drag.audioId));
        if (!track) return;
        if (drag.trimChanged) track.audioRevision = Math.max(1, Number(track.audioRevision) || 1) + 1;
        this._syncLinkedLipSyncTiming(track, {
            timelineStartMs: drag.originalTimelineStartMs,
            trimStartMs: drag.originalTrimStartMs,
            trimEndMs: drag.originalTrimEndMs,
            audioRevision: drag.originalAudioRevision
        }, { trimChanged: drag.trimChanged });
        if (String(track.audioId) === String(this.activeAudioId)) {
            this._applyActiveTrack(track);
            this._refreshEditControls();
        }
        window.app?._saveCurrentSceneAudioOnly?.();
        eventBus.emit('history:push');
        this._refreshTimelineUI();
    }

    _refreshTimelineUI() {
        this.animations?.calculateTotalDuration?.();
        eventBus.emit('timeline:update');
        try { window.app?.objects?.updateObjectList?.(); } catch (_) {}
    }

    _clearWaveform() {
        if (this.waveformCtx && this.waveformCanvas) {
            this.waveformCtx.clearRect(0, 0, this.waveformCanvas.width, this.waveformCanvas.height);
        }
    }

    _clearAudioState() {
        this._saveActiveTrack();
        this.tracks.forEach(track => {
            if (!track.audioElement) return;
            try { track.audioElement.pause(); } catch (_) {}
            track.audioElement.src = '';
        });
        this.tracks = [];
        this._resetActiveFields();
        this.isLoaded = false;

        this.labelRow?.classList.add('hidden');
        this.container?.classList.add('hidden');
        this.closeClipEditor();
        this._clearWaveform();
    }

    _normalizeSequenceLink(value) {
        if (!value || typeof value !== 'object' || typeof value.actionId !== 'string' || typeof value.stepId !== 'string'
            || typeof value.rootId !== 'string' || !Number.isFinite(value.offsetMs) || value.offsetMs < 0
            || !['wait', 'continue', 'independent'].includes(value.timing)) return null;
        return { actionId: value.actionId.slice(0, 160), stepId: value.stepId.slice(0, 160), rootId: value.rootId.slice(0, 160),
            timing: value.timing, offsetMs: value.offsetMs, durationMs: Math.max(0, Number(value.durationMs) || 0) };
    }

    _normalizeAudioState(data) {
        if (!data || typeof data !== 'object' || data.hasAudio !== true || !data.dataUrl) {
            return null;
        }

        return {
            fileName: typeof data.fileName === 'string' && data.fileName.trim()
                ? data.fileName.trim()
                : 'Soundtrack',
            ...Utils.normalizeAudioSource(data.dataUrl, typeof data.mimeType === 'string' ? data.mimeType : ''),
            audioId: typeof data.audioId === 'string' ? data.audioId : '',
            audioRevision: Math.max(1, Number(data.audioRevision) || 1),
            durationMs: Math.max(0, Number(data.sourceDurationMs) || Number(data.durationMs) || 0),
            volume: Math.max(0, Math.min(1, Number(data.volume ?? 1))),
            muted: data.muted === true,
            trimStartMs: Math.max(0, Number(data.trimStartMs) || 0),
            trimEndMs: Math.max(0, Number(data.trimEndMs) || 0),
            timelineStartMs: Math.max(0, Number(data.timelineStartMs) || 0),
            characterId: typeof data.characterId === 'string' ? data.characterId : '',
            sequenceLink: this._normalizeSequenceLink(data.sequenceLink),
            ...this._normalizeScope(data.playScope, data.rangeStartScene, data.rangeEndScene)
        };
    }

    _normalizeAudioCollection(data) {
        if (Array.isArray(data?.tracks)) {
            const tracks = data.tracks
                .map(track => this._normalizeAudioState(track))
                .filter(Boolean);
            return {
                tracks,
                activeAudioId: typeof data.activeAudioId === 'string' ? data.activeAudioId : ''
            };
        }
        const legacy = this._normalizeAudioState(data);
        return { tracks: legacy ? [legacy] : [], activeAudioId: legacy?.audioId || '' };
    }

    async loadAudioFile(file, options = {}) {
        if (!file) return false;

        try {
            const loadToken = ++this._loadToken;
            const [dataUrl, arrayBuffer] = await Promise.all([
                this._readBlobAsDataUrl(file),
                file.arrayBuffer()
            ]);

            return await this._applyLoadedAudioState({
                fileName: file.name,
                dataUrl,
                mimeType: file.type || this._inferMimeTypeFromDataUrl(dataUrl),
                durationMs: 0,
                timelineStartMs: Math.max(0, Number(this.animations?.currentTime) || 0),
                characterId: '',
                ...this._normalizeScope('scene', this._getCurrentSceneIndex(), this._getCurrentSceneIndex()),
                arrayBuffer,
                silent: false,
                pushHistory: options.pushHistory === true,
                replace: options.replace === true,
                replaceAudioId: options.replaceAudioId,
                loadToken
            });
        } catch (err) {
            Utils.showToast('Failed to load audio file: ' + err.message, 'error');
            return false;
        }
    }

    async loadFromData(data, options = {}) {
        const collection = this._normalizeAudioCollection(data);
        if (!collection.tracks.length) {
            this._loadToken += 1;
            this._clearAudioState();
            this._refreshTimelineUI();
            return false;
        }

        try {
            const loadToken = ++this._loadToken;
            const restoredTracks = [];
            const usedIds = new Set();
            for (const audioState of collection.tracks) {
                const arrayBuffer = await this._dataUrlToArrayBuffer(audioState.dataUrl);
                const track = await this._createLoadedTrack({ ...audioState, arrayBuffer });
                if (loadToken !== this._loadToken) {
                    try { track.audioElement?.pause?.(); } catch (_) {}
                    return false;
                }
                while (!track.audioId || usedIds.has(track.audioId)) track.audioId = Utils.generateId('audio');
                usedIds.add(track.audioId);
                restoredTracks.push(track);
            }

            this._clearAudioState();
            this.tracks = restoredTracks;
            const active = restoredTracks.find(track => track.audioId === collection.activeAudioId)
                || restoredTracks[0];
            this._applyActiveTrack(active);
            this._refreshTimelineUI();
            this.syncTimelinePresence();
            try { window.app?.objects?.updateObjectList?.(); } catch (_) {}
            if (options.silent === false) {
                Utils.showToast(`${restoredTracks.length} audio track${restoredTracks.length === 1 ? '' : 's'} restored`, 'success');
            }
            return true;
        } catch (err) {
            console.warn('[AudioTimeline] Failed to restore audio:', err);
            this._clearAudioState();
            this._refreshTimelineUI();
            return false;
        }
    }

    async _dataUrlToArrayBuffer(dataUrl) {
        const value = String(dataUrl || '');
        if (!value.startsWith('data:')) {
            const response = await fetch(value);
            return response.arrayBuffer();
        }
        const commaIndex = value.indexOf(',');
        if (commaIndex < 0) throw new Error('Invalid audio data URL');
        const meta = value.slice(0, commaIndex);
        const payload = value.slice(commaIndex + 1);
        if (/;base64/i.test(meta)) {
            const binary = atob(payload);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            return bytes.buffer;
        }
        const decoded = decodeURIComponent(payload);
        const bytes = new Uint8Array(decoded.length);
        for (let i = 0; i < decoded.length; i++) bytes[i] = decoded.charCodeAt(i);
        return bytes.buffer;
    }

    _getTrackSourceDurationMs(track) {
        if (!track) return 0;
        if (Number(track.durationMs) > 0) return Math.max(0, Number(track.durationMs) || 0);
        return Math.round((track.audioBuffer?.duration || track.audioElement?.duration || 0) * 1000);
    }

    _normalizeTrackEditState(track, volume = track?.volume, trimStartMs = track?.trimStartMs, trimEndMs = track?.trimEndMs) {
        const fullDuration = this._getTrackSourceDurationMs(track);
        const normalizedVolume = Math.max(0, Math.min(1, Number(volume)));
        let start = Math.max(0, Number(trimStartMs) || 0);
        let end = Math.max(0, Number(trimEndMs) || 0);
        if (fullDuration > 0) {
            start = Math.min(fullDuration, start);
            end = end > 0 ? Math.min(fullDuration, end) : fullDuration;
        }
        if (end <= start) end = fullDuration > start ? fullDuration : start;
        return {
            volume: Number.isFinite(normalizedVolume) ? normalizedVolume : 1,
            trimStartMs: start,
            trimEndMs: end
        };
    }

    _getTrackClipDurationMs(track) {
        if (!track) return 0;
        const sourceDuration = this._getTrackSourceDurationMs(track);
        const state = this._normalizeTrackEditState(track);
        return Math.max(0, state.trimEndMs - state.trimStartMs) || sourceDuration;
    }

    _getTrackTimelineEndMs(track) {
        return Math.max(0, Number(track?.timelineStartMs) || 0) + this._getTrackClipDurationMs(track);
    }

    _getAvailableCharacters() {
        const app = window.app;
        const system = app?.jointSystem;
        const objects = app?.objects?.objects || [];
        if (!system?._detectArmatureFromPool || !objects.length) return [];
        const byId = new Map(objects.map(object => [String(object?.id || ''), object]));
        const rootIds = new Set(objects.map(object => String(object?.pinnedTo || '')).filter(Boolean));
        const signature = Array.from(rootIds).sort().map(rootId => {
            const root = byId.get(rootId);
            const childIds = objects
                .filter(object => String(object?.pinnedTo || '') === rootId)
                .map(object => String(object?.id || ''))
                .sort()
                .join(',');
            const style = root?._ucCharacterStyleConfig || {};
            return `${rootId}:${root?.name || ''}:${style.gender || ''}:${style.view || ''}:${style.sideFacing || ''}:${root?._ucCharacterVariantKey || ''}:${childIds}`;
        }).join('|') + '|3D:' + objects.filter(object => object.realistic3D).map(object => `${object.id}:${object.name}`).join(',');
        if (this._characterOptionsCache?.objects === objects && this._characterOptionsCache.signature === signature) {
            return this._characterOptionsCache.characters;
        }
        const characters = objects.filter(object => object.realistic3D).map(root => ({
            id: String(root.id), name: `${root.name || '3D Character'} (3D)`, armature: { root, parts: {} }
        }));
        const seen = new Set(characters.map(character => character.id));
        let universalCount = 0;
        rootIds.forEach(rootId => {
            const root = byId.get(rootId);
            if (!root) return;
            const pool = [root, ...objects.filter(object => String(object?.pinnedTo || '') === rootId)];
            const armature = system._detectArmatureFromPool(pool);
            if (!armature?.root?.id || seen.has(armature.root.id)) return;
            // Enumeration runs during object-added events. Repairing an unfinished
            // face here adds more objects and recursively rebuilds the timeline.
            const faceAdapter = system._getArmatureFaceAdapter?.(armature, { readOnly: true });
            if (system._getArmatureFaceAdapter && (!faceAdapter?.headObj || faceAdapter.supportsFacialFeatures === false)) return;
            seen.add(armature.root.id);
            let name = String(armature.root.name || '').trim();
            if (faceAdapter?.kind === 'universal-features') {
                universalCount++;
                if (!name || /^torso$/i.test(name)) {
                    const style = armature.root._ucCharacterStyleConfig || {};
                    const gender = style.gender ? style.gender[0].toUpperCase() + style.gender.slice(1) : '';
                    const view = system._getUniversalCharacterVariantLabel?.(system._getUniversalCharacterVariantKey?.(armature)) || '';
                    const details = [gender, view].filter(Boolean).join(', ');
                    name = `Universal Character ${universalCount}${details ? ` (${details})` : ''}`;
                }
            }
            characters.push({
                id: String(armature.root.id),
                name: name || `Character ${characters.length + 1}`,
                armature
            });
        });
        characters.sort((a, b) => a.name.localeCompare(b.name));
        this._characterOptionsCache = { objects, signature, characters };
        return characters;
    }

    _resolveCharacterArmature(characterId) {
        const id = String(characterId || '');
        if (!id) return null;
        return this._getAvailableCharacters().find(character => character.id === id)?.armature || null;
    }

    _populateCharacterSelect(select) {
        if (!select) return;
        const characters = this._getAvailableCharacters();
        const selectedId = String(this.characterId || '');
        const options = ['<option value="">No character binding</option>'];
        characters.forEach(character => {
            options.push(`<option value="${Utils.escapeAttr(character.id)}">${Utils.escapeHtml(character.name)}</option>`);
        });
        if (selectedId && !characters.some(character => character.id === selectedId)) {
            options.push(`<option value="${Utils.escapeAttr(selectedId)}">Missing character</option>`);
        }
        select.innerHTML = options.join('');
        select.value = selectedId;
        select.disabled = !this.isLoaded;
    }

    _removeLipSyncForAudio(audioId, options = {}) {
        const targetAudioId = String(audioId || '');
        if (!targetAudioId) return 0;
        const liveOwners = window.app?.objects?.objects || [];
        const extraOwners = [options.removedObject, ...(options.extraOwners || [])].filter(Boolean);
        const owners = [...liveOwners];
        extraOwners.forEach(owner => {
            if (!owners.includes(owner)) owners.push(owner);
        });
        const removedAnimationIds = new Set();
        let removed = 0;

        owners.forEach(owner => {
            if (!Array.isArray(owner?.animations)) return;
            owner.animations = owner.animations.filter(animation => {
                const configs = Array.isArray(animation?.generated)
                    ? animation.generated
                    : [animation?.generated];
                const configMatch = configs.some(config => (
                    config?.type === 'audio-lip-sync'
                    && String(config.audioId || '') === targetAudioId
                ));
                const paramsMatch = animation?.type === 'audio-lip-sync'
                    && String(animation?.params?.audioId || '') === targetAudioId;
                if (!configMatch && !paramsMatch) return true;
                if (animation?.id) removedAnimationIds.add(animation.id);
                removed += 1;
                return false;
            });
        });

        if (!removed) return 0;
        const lipSyncManager = window.app?.audioLipSync;
        removedAnimationIds.forEach(animationId => {
            lipSyncManager?._removeSpeechPerformanceAnimations?.(animationId);
            liveOwners.forEach(owner => {
                if (!Array.isArray(owner?.animations)) return;
                owner.animations = owner.animations.filter(animation => (
                    animation?._audioLipSyncCompanionId !== animationId
                    && animation?.params?.audioLipSyncCompanionId !== animationId
                ));
            });
        });
        const activeExistingId = lipSyncManager?.context?.existing?.animation?.id;
        if (activeExistingId && removedAnimationIds.has(activeExistingId)) {
            lipSyncManager.stopPreview?.();
            lipSyncManager.context.existing = null;
        }
        lipSyncManager?.clearFrameOverrides?.();
        this.animations.originalStates = null;
        this.animations.calculateTotalDuration?.();
        eventBus.emit('timeline:update');
        eventBus.emit('objects:updated');
        window.app?.objects?.updateProperties?.();
        window.app?.stage?.requestRender?.();
        return removed;
    }

    setTrackCharacterBinding(audioId, characterId, options = {}) {
        const targetAudioId = String(audioId || this.activeAudioId || '');
        const track = this.tracks.find(item => String(item.audioId || '') === targetAudioId);
        if (!track) return false;
        const previousCharacterId = String(track.characterId || '');
        const nextCharacterId = String(characterId || '');
        if (previousCharacterId === nextCharacterId) return false;
        if (track.sequenceLink && nextCharacterId !== track.sequenceLink.rootId) {
            window.app?.jointSystem?._detachCharacterSequenceAudio?.(track, { clearStep: true });
        }

        const availableCharacters = this._getAvailableCharacters();
        const previousName = availableCharacters.find(character => character.id === previousCharacterId)?.name
            || options.removedObject?.name
            || 'character';
        const nextName = availableCharacters.find(character => character.id === nextCharacterId)?.name
            || 'character';
        this._removeLipSyncForAudio(track.audioId, { removedObject: options.removedObject });
        track.characterId = nextCharacterId;
        if (String(this.activeAudioId || '') === targetAudioId) {
            this.characterId = nextCharacterId;
        }
        this._characterOptionsCache = null;

        if (options.refresh !== false) {
            this._refreshEditControls();
            this._updateLabelRow();
            this._refreshTimelineUI();
        }
        if (options.persist !== false) window.app?._saveCurrentSceneAudioOnly?.();
        if (options.pushHistory === true) eventBus.emit('history:push');
        if (options.silent !== true) {
            if (!nextCharacterId) {
                Utils.showToast(`Audio disconnected from ${previousName}`, 'info');
            } else if (previousCharacterId) {
                Utils.showToast(`Audio reassigned to ${nextName}`, 'success');
            } else {
                Utils.showToast(`Audio connected to ${nextName}`, 'success');
            }
        }
        return true;
    }

    disconnectCharacter(characterId, options = {}) {
        const targetCharacterId = String(characterId || '');
        if (!targetCharacterId) return 0;
        const linkedTracks = this.tracks.filter(track => String(track.characterId || '') === targetCharacterId);
        linkedTracks.forEach(track => {
            this.setTrackCharacterBinding(track.audioId, '', {
                removedObject: options.removedObject,
                persist: false,
                pushHistory: false,
                refresh: false,
                silent: true
            });
        });
        if (!linkedTracks.length) return 0;

        this._refreshEditControls();
        this._updateLabelRow();
        this._refreshTimelineUI();
        window.app?._saveCurrentSceneAudioOnly?.();
        if (options.pushHistory === true) eventBus.emit('history:push');
        if (options.silent !== true) {
            const count = linkedTracks.length;
            Utils.showToast(`${count} audio track${count === 1 ? '' : 's'} disconnected`, 'info');
        }
        return linkedTracks.length;
    }

    _launchLipSyncForTrack(audioId) {
        if (audioId && !this.selectTrack(audioId)) return false;
        const track = this.getActiveTrack();
        const manager = window.app?.audioLipSync;
        if (!track || !manager?.open) {
            Utils.showToast('Audio lip sync is unavailable', 'warning');
            return false;
        }
        const opened = manager.open();
        if (!opened) return false;
        this.closeClipEditor();
        return true;
    }

    _getLinkedLipSyncState(track = this.getActiveTrack()) {
        const state = { count: 0, ready: 0, stale: 0, reason: '' };
        if (!track?.audioId) return state;
        const trackRevision = Math.max(1, Number(track.audioRevision) || 1);
        (window.app?.objects?.objects || []).forEach(owner => {
            (owner?.animations || []).forEach(animation => {
                const configs = Array.isArray(animation?.generated) ? animation.generated : [animation?.generated];
                configs.forEach(config => {
                    if (config?.type !== 'audio-lip-sync' || String(config.audioId || '') !== String(track.audioId)) return;
                    state.count += 1;
                    const revisionMismatch = Math.max(1, Number(config.audioRevision) || 1) !== trackRevision;
                    if (config.audioRefreshRequired === true || revisionMismatch) {
                        state.stale += 1;
                        if (!state.reason) state.reason = String(config.audioRefreshReason || 'Audio changed. Refresh the linked lip sync.');
                    } else {
                        state.ready += 1;
                    }
                });
            });
        });
        return state;
    }

    _syncLinkedLipSyncTiming(track, previousTrackState = track, options = {}) {
        if (!track?.audioId) return 0;
        if (!options.sequenceChange && track.sequenceLink) {
            window.app?.jointSystem?._onCharacterSequenceAudioEdit?.(track, previousTrackState, options);
        }
        const captionPrevious = typeof previousTrackState === 'number'
            ? { ...track, timelineStartMs: previousTrackState } : previousTrackState;
        globalThis.CaptionRuntime?.sync(window.app?.objects?.objects, track, captionPrevious, options);
        const previous = typeof previousTrackState === 'number'
            ? {
                timelineStartMs: previousTrackState,
                trimStartMs: track.trimStartMs,
                trimEndMs: track.trimEndMs,
                audioRevision: track.audioRevision
            }
            : (previousTrackState || {});
        const nextStart = Math.max(0, Number(track.timelineStartMs) || 0);
        const nextTrimStart = Math.max(0, Number(track.trimStartMs) || 0);
        const sourceDuration = this._getTrackSourceDurationMs(track);
        const nextTrimEnd = Math.max(nextTrimStart, Number(track.trimEndMs) || sourceDuration);
        const previousTrimStart = Math.max(0, Number(previous.trimStartMs) || 0);
        const previousRevision = Math.max(1, Number(previous.audioRevision) || 1);
        const nextRevision = Math.max(1, Number(track.audioRevision) || 1);
        const trimChanged = options.trimChanged === true
            || previousTrimStart !== nextTrimStart
            || Math.max(previousTrimStart, Number(previous.trimEndMs) || 0) !== nextTrimEnd;
        const sourceReplaced = options.sourceReplaced === true;
        let changed = 0;

        (window.app?.objects?.objects || []).forEach(owner => {
            (owner?.animations || []).forEach(animation => {
                const configs = Array.isArray(animation?.generated) ? animation.generated : [animation?.generated];
                configs.forEach(config => {
                    if (config?.type !== 'audio-lip-sync' || String(config.audioId || '') !== String(track.audioId)) return;
                    const offsetMs = Number(config.offsetMs) || 0;
                    const configuredLocalStart = Math.max(0, Number(config.timelineStartMs) || 0);
                    const sourceStartMs = Number.isFinite(Number(config.sourceStartMs))
                        ? Math.max(0, Number(config.sourceStartMs))
                        : previousTrimStart + configuredLocalStart;
                    const sourceEndMs = Number.isFinite(Number(config.sourceEndMs))
                        ? Math.max(sourceStartMs + 1, Number(config.sourceEndMs))
                        : sourceStartMs + Math.max(1, Number(config.duration) || 1);
                    const sourceMappedLocalStart = sourceStartMs - nextTrimStart;
                    const nextLocalStart = sourceReplaced ? configuredLocalStart : sourceMappedLocalStart;
                    const rangeCovered = sourceMappedLocalStart >= -0.5 && sourceEndMs <= nextTrimEnd + 0.5;
                    const savedDelay = Number(config.timelineDelayMs);
                    const currentDelay = Math.max(0, Number(animation.delay) || 0);
                    const manualOffset = Number.isFinite(savedDelay) ? currentDelay - savedDelay : 0;
                    const mappedDelay = nextStart + Math.max(0, nextLocalStart) + offsetMs + manualOffset;

                    animation.delay = Math.max(0, mappedDelay);
                    config.audioTimelineStartMs = nextStart;
                    config.audioTrimStartMs = nextTrimStart;
                    config.audioTrimEndMs = nextTrimEnd;
                    config.sourceStartMs = sourceStartMs;
                    config.sourceEndMs = sourceEndMs;
                    config.timelineStartMs = Math.max(0, nextLocalStart);
                    config.timelineDelayMs = animation.delay;

                    const configRevision = Math.max(1, Number(config.audioRevision) || 1);
                    if (sourceReplaced) {
                        config.audioRefreshRequired = true;
                        config.audioRefreshCause = 'source-replaced';
                        config.audioRefreshReason = 'Audio was replaced. Refresh lip sync to analyze the new speech.';
                    } else if (trimChanged && rangeCovered
                        && (configRevision === previousRevision || config.audioRefreshCause === 'trim-range')) {
                        config.audioRevision = nextRevision;
                        delete config.audioRefreshRequired;
                        delete config.audioRefreshCause;
                        delete config.audioRefreshReason;
                    } else if (trimChanged && !rangeCovered) {
                        config.audioRefreshRequired = true;
                        config.audioRefreshCause = 'trim-range';
                        config.audioRefreshReason = 'The audio trim excludes part of this speech range. Refresh lip sync.';
                    }

                    animation.params = animation.params || {};
                    animation.params.audioRefreshRequired = config.audioRefreshRequired === true;
                    if (config.audioRefreshReason) animation.params.audioRefreshReason = config.audioRefreshReason;
                    else delete animation.params.audioRefreshReason;
                    changed += 1;
                });
            });
        });
        return changed;
    }

    async _createLoadedTrack(state) {
        const {
            fileName,
            dataUrl,
            mimeType,
            audioId = '',
            audioRevision = 1,
            durationMs,
            volume = 1,
            muted = false,
            trimStartMs = 0,
            trimEndMs = 0,
            timelineStartMs = 0,
            characterId = '',
            playScope = 'scene',
            rangeStartScene = this._getCurrentSceneIndex(),
            rangeEndScene = this._getCurrentSceneIndex(),
            arrayBuffer
        } = state || {};

        if (!dataUrl || !(arrayBuffer instanceof ArrayBuffer)) throw new Error('Invalid audio track data');
        const source = Utils.normalizeAudioSource(dataUrl, mimeType);

        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        let decodedBuffer = null;
        if (AudioContextClass) {
            if (!this.audioContext) {
                this.audioContext = new AudioContextClass();
            }
            decodedBuffer = await this.audioContext.decodeAudioData(arrayBuffer.slice(0));
        }

        const scope = this._normalizeScope(playScope, rangeStartScene, rangeEndScene);
        const track = {
            audioBuffer: decodedBuffer,
            audioElement: null,
            fileName: fileName || 'Soundtrack',
            audioDataUrl: source.dataUrl,
            audioMimeType: source.mimeType,
            audioId: audioId || Utils.generateId('audio'),
            audioRevision: Math.max(1, Number(audioRevision) || 1),
            durationMs: Math.max(
            0,
            Number(durationMs) || Math.round((decodedBuffer?.duration || 0) * 1000)
            ),
            volume: 1,
            muted: muted === true,
            trimStartMs: 0,
            trimEndMs: 0,
            timelineStartMs: Math.max(0, Number(timelineStartMs) || 0),
            characterId: typeof characterId === 'string' ? characterId : '',
            sequenceLink: this._normalizeSequenceLink(state.sequenceLink),
            playScope: scope.playScope,
            rangeStartScene: scope.rangeStartScene,
            rangeEndScene: scope.rangeEndScene,
            _playToken: 0
        };
        const editState = this._normalizeTrackEditState(track, volume, trimStartMs, trimEndMs);
        track.volume = editState.volume;
        track.trimStartMs = editState.trimStartMs;
        track.trimEndMs = editState.trimEndMs;
        const audioElement = new Audio();
        audioElement.preload = 'auto';
        audioElement.src = source.dataUrl;
        audioElement.volume = track.volume;
        audioElement.muted = track.muted;
        audioElement.playbackRate = this.animations?.playbackSpeed || 1;
        audioElement.ontimeupdate = () => {
            const endSeconds = (track.trimEndMs || this._getTrackSourceDurationMs(track)) / 1000;
            if (endSeconds > 0 && audioElement.currentTime >= endSeconds) {
                try { audioElement.pause(); } catch (_) {}
            }
        };
        track.audioElement = audioElement;
        await this._awaitAudioMetadata(audioElement).catch(() => {});
        if (!(track.durationMs > 0)) track.durationMs = Math.round((audioElement.duration || 0) * 1000);
        return track;
    }

    async _applyLoadedAudioState(state) {
        const { silent = false, pushHistory = false, replace = false, loadToken = null } = state || {};
        const track = await this._createLoadedTrack(state);

        if (loadToken && loadToken !== this._loadToken) {
            try { track.audioElement?.pause?.(); } catch (_) {}
            return false;
        }

        this._saveActiveTrack();
        const replaceIndex = state.replaceAudioId
            ? this.tracks.findIndex(item => item.audioId === state.replaceAudioId)
            : replace
            ? this.tracks.findIndex(item => item.audioId === this.activeAudioId)
            : -1;
        if (state.replaceAudioId && replaceIndex < 0) {
            track.audioElement?.pause();
            throw new Error('The audio selected for replacement is no longer available.');
        }
        let replacedTrackState = null;
        if (replaceIndex >= 0) {
            const previous = this.tracks[replaceIndex];
            replacedTrackState = {
                timelineStartMs: previous.timelineStartMs,
                trimStartMs: previous.trimStartMs,
                trimEndMs: previous.trimEndMs,
                audioRevision: previous.audioRevision
            };
            try { previous.audioElement?.pause?.(); } catch (_) {}
            if (previous.audioElement) previous.audioElement.src = '';
            track.audioId = previous.audioId || track.audioId;
            track.audioRevision = Math.max(1, Number(previous.audioRevision) || 1) + 1;
            track.timelineStartMs = Math.max(0, Number(previous.timelineStartMs) || 0);
            track.characterId = typeof previous.characterId === 'string' ? previous.characterId : '';
            track.sequenceLink = this._normalizeSequenceLink(previous.sequenceLink);
            track.playScope = previous.playScope === 'range' ? 'range' : 'scene';
            track.rangeStartScene = Math.max(0, Number(previous.rangeStartScene) || 0);
            track.rangeEndScene = Math.max(0, Number(previous.rangeEndScene) || 0);
            track.volume = Math.max(0, Math.min(1, Number(previous.volume ?? 1)));
            track.muted = previous.muted === true;
            if (track.audioElement) {
                track.audioElement.volume = track.volume;
                track.audioElement.muted = track.muted;
            }
            this.tracks.splice(replaceIndex, 1, track);
        } else {
            this.tracks.push(track);
        }
        if (replacedTrackState) {
            this._syncLinkedLipSyncTiming(track, replacedTrackState, { sourceReplaced: true });
        }
        this._applyActiveTrack(track);
        this.isLoaded = true;
        this._refreshEditControls();
        this._refreshTimelineUI();
        this.syncTimelinePresence();
        window.app?._saveCurrentSceneAudioOnly?.();
        try { window.app?.objects?.updateObjectList?.(); } catch (_) {}

        if (pushHistory) eventBus.emit('history:push');
        if (!silent) {
            const lipSyncState = this._getLinkedLipSyncState(track);
            const needsRefresh = replaceIndex >= 0 && lipSyncState.stale > 0;
            Utils.showToast(
                needsRefresh
                    ? `Audio replaced: ${this.fileName}. Refresh the linked lip sync.`
                    : `${replaceIndex >= 0 ? 'Audio replaced' : 'Audio track added'}: ${this.fileName}`,
                needsRefresh ? 'warning' : 'success'
            );
        }
        return true;
    }

    drawWaveform() {
        if (!this.audioBuffer || !this.waveformCanvas || !this.waveformCtx) return;

        const canvas = this.waveformCanvas;
        const ctx = this.waveformCtx;

        // Size the canvas
        const container = canvas.parentElement;
        if (!container || container.clientWidth <= 0 || container.clientHeight <= 0) return;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = container.clientWidth * dpr;
        canvas.height = container.clientHeight * dpr;
        canvas.style.width = container.clientWidth + 'px';
        canvas.style.height = container.clientHeight + 'px';

        const w = canvas.width;
        const h = canvas.height;
        const data = this.audioBuffer.getChannelData(0); // mono or left channel
        const step = Math.ceil(data.length / w);
        const amp = h / 2;

        ctx.clearRect(0, 0, w, h);

        // Background
        ctx.fillStyle = 'rgba(99, 102, 241, 0.05)';
        ctx.fillRect(0, 0, w, h);

        // Center line
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, amp);
        ctx.lineTo(w, amp);
        ctx.stroke();

        // Waveform
        ctx.fillStyle = 'rgba(99, 102, 241, 0.5)';
        for (let i = 0; i < w; i++) {
            let min = 1.0, max = -1.0;
            for (let j = 0; j < step; j++) {
                const sample = data[i * step + j];
                if (sample === undefined) break;
                if (sample < min) min = sample;
                if (sample > max) max = sample;
            }
            const barHeight = Math.max(1, (max - min) * amp);
            const y = (1 + min) * amp;
            ctx.fillRect(i, y, 1, barHeight);
        }

        // File name label
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(this.fileName, 10, h - 8);
    }

    _syncPlaybackAt(timelineMs, shouldPlay = this._isPlaying) {
        if (!this.isLoaded) return;
        this._saveActiveTrack();
        const requestedMs = Math.max(0, Number(timelineMs) || 0);
        this.tracks.forEach(track => {
            const audioElement = track.audioElement;
            if (!audioElement) return;
            const startMs = Math.max(0, Number(track.timelineStartMs) || 0);
            const durationMs = this._getTrackClipDurationMs(track);
            const relativeMs = requestedMs - startMs;
            const insideClip = relativeMs >= 0 && relativeMs < durationMs;
            const edit = this._normalizeTrackEditState(track);
            audioElement.playbackRate = this.animations?.playbackSpeed || 1;
            audioElement.volume = Math.max(0, Math.min(1, Number(track.volume ?? 1)));
            audioElement.muted = track.muted === true;

            if (!insideClip) {
                track._playToken = (track._playToken || 0) + 1;
                track._playPending = false;
                if (!audioElement.paused) {
                    try { audioElement.pause(); } catch (_) {}
                }
                const boundaryMs = relativeMs < 0 ? edit.trimStartMs : edit.trimEndMs;
                const boundarySeconds = Math.max(0, boundaryMs / 1000);
                if (Math.abs((audioElement.currentTime || 0) - boundarySeconds) > 0.15) {
                    try { audioElement.currentTime = boundarySeconds; } catch (_) {}
                }
                return;
            }

            const targetSeconds = (edit.trimStartMs + relativeMs) / 1000;
            if (Math.abs((audioElement.currentTime || 0) - targetSeconds) > 0.15) {
                try { audioElement.currentTime = targetSeconds; } catch (_) {}
            }
            if (!shouldPlay || track.muted === true) {
                track._playToken = (track._playToken || 0) + 1;
                track._playPending = false;
                if (!audioElement.paused) {
                    try { audioElement.pause(); } catch (_) {}
                }
                return;
            }
            if (!audioElement.paused || track._playPending) return;
            const token = (track._playToken || 0) + 1;
            track._playToken = token;
            track._playPending = true;
            try {
                const result = audioElement.play();
                if (result && typeof result.then === 'function') {
                    result.then(() => {
                        if (track._playToken === token) track._playPending = false;
                    }).catch(error => {
                        if (track._playToken !== token) return;
                        track._playPending = false;
                        const name = error?.name || '';
                        const message = String(error?.message || error || '');
                        if (name !== 'AbortError' && !/interrupted/i.test(message)) {
                            console.warn('[AudioTimeline] Audio playback failed:', error);
                        }
                    });
                } else {
                    track._playPending = false;
                }
            } catch (error) {
                track._playPending = false;
                console.warn('[AudioTimeline] Audio playback failed:', error);
            }
        });
    }

    play() {
        if (!this.isLoaded) return;
        this._stopClipAudition();
        this._isPlaying = true;
        this._playToken += 1;
        const animationTime = Number(this.animations?.currentTime);
        const effectiveMs = Number.isFinite(animationTime)
            ? Math.max(0, animationTime)
            : Math.max(0, Number(this._lastTimelineTimeMs) || 0);
        this._syncPlaybackAt(effectiveMs, true);
    }

    pause() {
        this._stopClipAudition();
        this._isPlaying = false;
        this._playToken += 1;
        this.tracks.forEach(track => {
            track._playToken = (track._playToken || 0) + 1;
            track._playPending = false;
            if (track.audioElement && !track.audioElement.paused) track.audioElement.pause();
        });
    }

    stop() {
        this._stopClipAudition({ reset: true });
        this._isPlaying = false;
        this._playToken += 1;
        this.tracks.forEach(track => {
            track._playToken = (track._playToken || 0) + 1;
            track._playPending = false;
            if (!track.audioElement) return;
            track.audioElement.pause();
            try { track.audioElement.currentTime = Math.max(0, Number(track.trimStartMs) || 0) / 1000; } catch (_) {}
        });
    }

    isMuted() {
        return !!this.audioElement?.muted;
    }

    setMuted(muted) {
        if (this.audioElement) {
            this.audioElement.muted = !!muted;
        }
        const track = this.getActiveTrack();
        if (track) track.muted = !!muted;
        try { window.app?.objects?.updateObjectList?.(); } catch (_) {}
        window.app?._saveCurrentSceneAudioOnly?.();
        this._refreshTimelineUI();
    }

    toggleMuted() {
        this.setMuted(!this.isMuted());
    }

    removeAudio(options = {}) {
        const { silent = false, pushHistory = false, all = false } = options;
        (window.app?.objects?.objects || []).forEach(obj => {
            if (obj.type === 'caption' && obj.captionAudioId && (all || obj.captionAudioId === this.activeAudioId)) globalThis.CaptionRuntime?.detach(obj);
        });
        this._stopClipAudition();
        this._loadToken += 1;
        this._saveActiveTrack();
        if (all) {
            this.tracks.forEach(track => this._removeLipSyncForAudio(track.audioId));
            this._clearAudioState();
        } else {
            const index = this.tracks.findIndex(track => track.audioId === this.activeAudioId);
            if (index >= 0) {
                const [removed] = this.tracks.splice(index, 1);
                this._removeLipSyncForAudio(removed.audioId);
                try { removed.audioElement?.pause?.(); } catch (_) {}
                if (removed.audioElement) removed.audioElement.src = '';
            }
            const next = this.tracks[Math.min(index, this.tracks.length - 1)] || this.tracks[0] || null;
            this._applyActiveTrack(next);
            if (!next) {
                this.labelRow?.classList.add('hidden');
                this.container?.classList.add('hidden');
                this.closeClipEditor();
                this._clearWaveform();
            }
        }
        this._refreshTimelineUI();
        window.app?._saveCurrentSceneAudioOnly?.();
        try { window.app?.objects?.updateObjectList?.(); } catch (_) {}

        if (pushHistory) eventBus.emit('history:push');
        if (!silent) Utils.showToast(all ? 'All audio tracks removed' : 'Audio track removed', 'info');
    }

    /**
     * Trim (silence/remove) a range of audio between inMs and outMs.
     * Replaces the audio buffer with the sections before and after the range.
     */
    trimRange(inMs, outMs) {
        if (!this.audioBuffer || !this.audioContext) return;
        const previousTrackState = {
            timelineStartMs: this.timelineStartMs,
            trimStartMs: this.trimStartMs,
            trimEndMs: this.trimEndMs,
            audioRevision: this.audioRevision
        };

        const sampleRate = this.audioBuffer.sampleRate;
        const numChannels = this.audioBuffer.numberOfChannels;
        const inSample = Math.floor((inMs / 1000) * sampleRate);
        const outSample = Math.floor((outMs / 1000) * sampleRate);
        const totalSamples = this.audioBuffer.length;

        // Clamp
        const startCut = Math.max(0, Math.min(inSample, totalSamples));
        const endCut = Math.max(startCut, Math.min(outSample, totalSamples));

        // New length = everything before cut + everything after cut
        const newLength = totalSamples - (endCut - startCut);
        if (newLength <= 0) {
            this.removeAudio();
            return;
        }

        const newBuffer = this.audioContext.createBuffer(numChannels, newLength, sampleRate);

        for (let ch = 0; ch < numChannels; ch++) {
            const oldData = this.audioBuffer.getChannelData(ch);
            const newData = newBuffer.getChannelData(ch);
            // Copy before cut
            for (let i = 0; i < startCut; i++) {
                newData[i] = oldData[i];
            }
            // Copy after cut
            for (let i = endCut; i < totalSamples; i++) {
                newData[startCut + (i - endCut)] = oldData[i];
            }
        }

        this.audioBuffer = newBuffer;
        this.audioRevision = Math.max(1, Number(this.audioRevision) || 1) + 1;
        this.durationMs = Math.round(newBuffer.duration * 1000);
        this.trimStartMs = 0;
        this.trimEndMs = this.durationMs;
        const activeTrack = this._saveActiveTrack();
        this._syncLinkedLipSyncTiming(activeTrack, previousTrackState, { sourceReplaced: true });
        this._refreshEditControls();
        this.drawWaveform();
        this._refreshTimelineUI();
        void this._commitTrimmedAudioState(newBuffer, activeTrack);
        Utils.showToast(`Audio trimmed: removed ${((outMs - inMs) / 1000).toFixed(1)}s`, 'success');
    }

    async _commitTrimmedAudioState(buffer, track = this.getActiveTrack()) {
        const blob = this._audioBufferToWavBlob(buffer);
        const dataUrl = await this._readBlobAsDataUrl(blob);
        if (!track || track.audioBuffer !== buffer) return;

        try { track.audioElement?.pause?.(); } catch (_) {}
        track.audioDataUrl = dataUrl;
        track.audioMimeType = 'audio/wav';
        const replacement = new Audio();
        replacement.preload = 'auto';
        replacement.src = dataUrl;
        replacement.volume = track.volume;
        replacement.muted = track.muted === true;
        replacement.playbackRate = this.animations?.playbackSpeed || 1;
        replacement.ontimeupdate = () => {
            const endSeconds = (track.trimEndMs || this._getTrackSourceDurationMs(track)) / 1000;
            if (endSeconds > 0 && replacement.currentTime >= endSeconds) {
                try { replacement.pause(); } catch (_) {}
            }
        };
        track.audioElement = replacement;
        await this._awaitAudioMetadata(replacement).catch(() => {});
        if (track.audioId === this.activeAudioId) this._applyActiveTrack(track);
        this.syncTimelinePresence();
        window.app?._saveCurrentSceneAudioOnly?.();
    }

    _audioBufferToWavBlob(buffer) {
        const numChannels = buffer.numberOfChannels;
        const sampleRate = buffer.sampleRate;
        const length = buffer.length;

        // Encode to WAV
        const dataLength = length * numChannels * 2; // 16-bit PCM
        const bufferSize = 44 + dataLength;
        const arrayBuf = new ArrayBuffer(bufferSize);
        const view = new DataView(arrayBuf);

        // WAV header
        const writeStr = (offset, str) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); };
        writeStr(0, 'RIFF');
        view.setUint32(4, bufferSize - 8, true);
        writeStr(8, 'WAVE');
        writeStr(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true); // PCM
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * numChannels * 2, true);
        view.setUint16(32, numChannels * 2, true);
        view.setUint16(34, 16, true);
        writeStr(36, 'data');
        view.setUint32(40, dataLength, true);

        // Interleave channels
        let offset = 44;
        for (let i = 0; i < length; i++) {
            for (let ch = 0; ch < numChannels; ch++) {
                const sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
                view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
                offset += 2;
            }
        }

        return new Blob([arrayBuf], { type: 'audio/wav' });
    }

    _readBlobAsDataUrl(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error || new Error('Failed to read audio data'));
            reader.readAsDataURL(blob);
        });
    }

    _awaitAudioMetadata(audioElement) {
        if (!audioElement) return Promise.resolve();
        if (audioElement.readyState >= 1) return Promise.resolve();

        return new Promise((resolve, reject) => {
            const cleanup = () => {
                audioElement.removeEventListener('loadedmetadata', onReady);
                audioElement.removeEventListener('canplaythrough', onReady);
                audioElement.removeEventListener('error', onError);
            };
            const onReady = () => {
                cleanup();
                resolve();
            };
            const onError = () => {
                cleanup();
                reject(audioElement.error || new Error('Failed to read audio metadata'));
            };

            audioElement.addEventListener('loadedmetadata', onReady, { once: true });
            audioElement.addEventListener('canplaythrough', onReady, { once: true });
            audioElement.addEventListener('error', onError, { once: true });
        });
    }

    _inferMimeTypeFromDataUrl(dataUrl) {
        const match = /^data:([^;,]+)/i.exec(String(dataUrl || ''));
        return match ? match[1] : '';
    }

    getDurationMs() {
        if (!this.isLoaded) return 0;
        const sourceDuration = this.getSourceDurationMs();
        const state = this._normalizeEditState(this.volume, this.trimStartMs, this.trimEndMs);
        return Math.max(0, state.trimEndMs - state.trimStartMs) || sourceDuration;
    }

    getTimelineDurationMs() {
        this._saveActiveTrack();
        return this.tracks.reduce((longest, track) => {
            return Math.max(longest, this._getTrackTimelineEndMs(track));
        }, 0);
    }

    getSourceDurationMs() {
        if (!this.isLoaded && !this.durationMs) return 0;
        if (this.durationMs > 0) return this.durationMs;
        return Math.round((this.audioBuffer?.duration || 0) * 1000);
    }

    _serializeTrack(track) {
        if (!track?.audioDataUrl) return null;
        const edit = this._normalizeTrackEditState(track);
        const sourceDurationMs = this._getTrackSourceDurationMs(track);
        return {
            hasAudio: true,
            fileName: track.fileName || 'Soundtrack',
            dataUrl: track.audioDataUrl,
            mimeType: track.audioMimeType || '',
            audioId: track.audioId || '',
            audioRevision: Math.max(1, Number(track.audioRevision) || 1),
            durationMs: Math.max(0, edit.trimEndMs - edit.trimStartMs) || sourceDurationMs,
            sourceDurationMs,
            volume: edit.volume,
            muted: track.muted === true,
            trimStartMs: edit.trimStartMs,
            trimEndMs: edit.trimEndMs,
            timelineStartMs: Math.max(0, Number(track.timelineStartMs) || 0),
            characterId: typeof track.characterId === 'string' ? track.characterId : '',
            sequenceLink: this._normalizeSequenceLink(track.sequenceLink),
            playScope: track.playScope === 'range' ? 'range' : 'scene',
            rangeStartScene: Math.max(0, Number(track.rangeStartScene) || 0),
            rangeEndScene: Math.max(0, Number(track.rangeEndScene) || 0)
        };
    }

    // Serialization
    toJSON() {
        this._saveActiveTrack();
        const tracks = this.tracks.map(track => this._serializeTrack(track)).filter(Boolean);
        const active = tracks.find(track => track.audioId === this.activeAudioId) || tracks[0] || null;
        return {
            version: 3,
            hasAudio: tracks.length > 0,
            tracks,
            activeAudioId: active?.audioId || '',
            ...(active || {
                fileName: '', dataUrl: '', mimeType: '', audioId: '', audioRevision: 0,
                durationMs: 0, sourceDurationMs: 0, volume: 1, muted: false,
                trimStartMs: 0, trimEndMs: 0, timelineStartMs: 0, characterId: '', playScope: 'scene',
                rangeStartScene: this._getCurrentSceneIndex(), rangeEndScene: this._getCurrentSceneIndex()
            })
        };
    }
}
