(function() {
    'use strict';

    class DomTutorialRunner {
        constructor(options = {}) {
            this.appName = options.appName || 'Tutorials';
            this.buttonLabel = options.buttonLabel || 'Tutorials';
            this.buttonId = options.buttonId || 'dom-open-tutorials';
            this.buttonClassName = options.buttonClassName || '';
            this.buttonIconClass = options.buttonIconClass || 'fas fa-person-chalkboard';
            this.panelId = options.panelId || 'dom-tutorial-panel';
            this.panelTitle = options.panelTitle || 'Recorded Tutorials';
            this.panelSubtitle = options.panelSubtitle || 'Run scripted UI walkthroughs, then screen-record them with your own narration.';
            this.pathLabel = options.pathLabel || 'Learning path';
            this.panelTop = options.panelTop || '72px';
            this.panelRight = options.panelRight || '20px';
            this.stopLabel = options.stopLabel || 'Stop Tutorial';
            this.tutorials = [];
            this.context = options.context || {};
            this.defaultStepDelay = options.defaultStepDelay || 350;
            this.readingPauseBaseMs = options.readingPauseBaseMs || 300;
            this.readingPausePerWordMs = options.readingPausePerWordMs || 35;
            this.readingPauseMinMs = options.readingPauseMinMs || 450;
            this.readingPauseMaxMs = options.readingPauseMaxMs || 1600;
            this.paceOptions = options.paceOptions || [
                { value: 'normal', label: 'Normal', multiplier: 1 },
                { value: 'slow', label: 'Slow', multiplier: 1.65 },
                { value: 'very-slow', label: 'Very Slow', multiplier: 2.3 }
            ];
            this.defaultPace = options.defaultPace || 'slow';
            this.paceStorageKey = options.paceStorageKey || ('dom-tutorial-pace:' + this.appName.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
            this.pathStorageKey = options.pathStorageKey || ('dom-tutorial-path:' + this.appName.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
            this.defaultPathFilter = options.defaultPathFilter || 'all';
            this.virtualPaths = Array.isArray(options.virtualPaths)
                ? options.virtualPaths
                    .map(entry => entry && typeof entry === 'object' && entry.id ? {
                        id: String(entry.id),
                        title: String(entry.title || entry.id),
                        summary: String(entry.summary || '').trim(),
                        order: Number.isFinite(Number(entry.order)) ? Number(entry.order) : 0,
                        tutorialIds: Array.isArray(entry.tutorialIds) ? entry.tutorialIds.map(String) : []
                    } : null)
                    .filter(Boolean)
                : [];
            this.voiceoverBasePath = options.voiceoverBasePath || 'assets/tutorial-audio';
            this.voiceoverExtensions = Array.isArray(options.voiceoverExtensions) && options.voiceoverExtensions.length
                ? options.voiceoverExtensions.map(ext => String(ext || '').trim().replace(/^\./, '')).filter(Boolean)
                : ['mp3', 'm4a', 'wav', 'ogg'];
            this.voiceoverVolume = Math.max(0, Math.min(1, Number(options.voiceoverVolume) || 0.95));
            this.ttsMakerEndpoint = options.ttsMakerEndpoint || '/api/voiceover/ttsmaker-tts.php';
            this.enableTtsMaker = options.enableTtsMaker !== false;
            this.googleTtsEndpoint = options.googleTtsEndpoint || '/api/voiceover/google-tts.php';
            this.enableGoogleTts = options.enableGoogleTts !== false;
            this.enableSpeechSynthesis = options.enableSpeechSynthesis !== false;
            this.warmAllTtsTutorialsOnOpen = options.warmAllTtsTutorialsOnOpen === true;
            this.autoWarmAllTtsTutorialsOnMount = options.autoWarmAllTtsTutorialsOnMount === true;
            this.enablePersistentVoiceoverCache = options.enablePersistentVoiceoverCache !== false;
            this.voiceoverPersistentCacheName = options.voiceoverPersistentCacheName
                || ('dom-tutorial-voiceovers:' + this.appName.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
            this._pace = this._readStoredPace();
            this._pathFilter = this._readStoredPathFilter();
            this._button = null;
            this._panel = null;
            this._select = null;
            this._description = null;
            this._status = null;
            this._paceSelect = null;
            this._pathSelect = null;
            this._pathSummary = null;
            this._timingSummary = null;
            this._coverage = null;
            this._nextButton = null;
            this._shell = null;
            this._cursor = null;
            this._cursorMode = 'default';
            this._spotlight = null;
            this._surfaceLabel = null;
            this._tooltip = null;
            this._tooltipTitle = null;
            this._tooltipBadge = null;
            this._tooltipProgressLabel = null;
            this._tooltipProgressMeta = null;
            this._tooltipProgressBar = null;
            this._tooltipText = null;
            this._loadingNotice = null;
            this._loadingNoticeText = null;
            this._pauseButton = null;
            this._overlayPauseButton = null;
            this._stopButton = null;
            this._panelHeader = null;
            this._panelDragCleanup = null;
            this._playing = false;
            this._paused = false;
            this._aborted = false;
            this._currentTutorialId = '';
            this._voiceoverAudio = null;
            this._voiceoverMode = 'none';
            this._voiceoverLoadToken = 0;
            this._voiceoverUtterance = null;
            this._voiceoverSpeechToken = 0;
            this._voiceoverInfo = null;
            this._voiceoverDiagnostics = null;
            this._voiceoverStatusCache = new Map();
            this._voiceoverStepSourceCache = new Map();
            this._voiceoverStatusToken = 0;
            this._ttsMakerStatus = null;
            this._ttsMakerStatusPromise = null;
            this._ttsMakerAudioCache = new Map();
            this._tutorialVoiceoverWarmPromises = new Map();
            this._tutorialVoiceoverWarmStates = new Map();
            this._allTutorialVoiceoverWarmPromise = null;
            this._googleTtsStatus = null;
            this._googleTtsStatusPromise = null;
            this._googleTtsAudioCache = new Map();
            this._persistentVoiceoverCachePromise = null;
            this._initialVoiceoverWarmQueued = false;
            this._voiceoverDebugState = {
                provider: 'none',
                cache: 'unknown',
                detail: '',
                stepLabel: ''
            };
            this._tutorialProgressState = null;
            this._tutorialProgressTimer = null;
            this._preGenerateButton = null;
            this._preGenerating = false;
        }

        _readStoredPace() {
            const defaultPace = this.paceOptions.find(option => option.value === this.defaultPace)?.value || this.paceOptions[0]?.value || 'normal';
            try {
                const stored = localStorage.getItem(this.paceStorageKey);
                if (this.paceOptions.some(option => option.value === stored)) return stored;
            } catch (_) {}
            return defaultPace;
        }

        _writeStoredPace(value) {
            try {
                localStorage.setItem(this.paceStorageKey, value);
            } catch (_) {}
        }

        _readStoredPathFilter() {
            const fallback = this.defaultPathFilter || 'all';
            try {
                return localStorage.getItem(this.pathStorageKey) || fallback;
            } catch (_) {
                return fallback;
            }
        }

        _writeStoredPathFilter(value) {
            try {
                localStorage.setItem(this.pathStorageKey, value || this.defaultPathFilter || 'all');
            } catch (_) {}
        }

        _getPaceOption(value = this._pace) {
            return this.paceOptions.find(option => option.value === value) || this.paceOptions[0] || { value: 'normal', label: 'Normal', multiplier: 1 };
        }

        _getTutorialById(id = this._currentTutorialId) {
            return this.tutorials.find(item => item.id === id) || null;
        }

        _normalizeTutorialPath(path, fallbackOrder = 999) {
            if (typeof path === 'string') {
                const trimmed = path.trim();
                if (trimmed) {
                    return {
                        id: trimmed,
                        title: trimmed,
                        summary: '',
                        order: fallbackOrder
                    };
                }
            }
            if (path && typeof path === 'object' && path.id) {
                return {
                    id: String(path.id),
                    title: String(path.title || path.id),
                    summary: String(path.summary || '').trim(),
                    order: Number.isFinite(Number(path.order)) ? Number(path.order) : fallbackOrder
                };
            }
            return {
                id: 'ungrouped',
                title: 'Other Tutorials',
                summary: 'Additional tutorials that do not belong to a named learning path yet.',
                order: fallbackOrder
            };
        }

        _getTutorialPath(tutorial) {
            const fallbackOrder = this.tutorials.findIndex(item => item.id === tutorial?.id);
            return this._normalizeTutorialPath(tutorial?.path, fallbackOrder >= 0 ? fallbackOrder : 999);
        }

        _getPathOptions() {
            const pathMap = new Map();
            this.tutorials.forEach((tutorial, index) => {
                const path = this._normalizeTutorialPath(tutorial?.path, index);
                if (!pathMap.has(path.id)) pathMap.set(path.id, path);
            });
            const virtualOptions = this.virtualPaths
                .filter(vp => vp.tutorialIds.some(id => this._getTutorialById(id)))
                .map(vp => ({ id: vp.id, title: vp.title, summary: vp.summary, order: vp.order }));
            return [
                {
                    id: 'all',
                    title: 'All Tutorials',
                    summary: 'Browse every tutorial available in this workspace.',
                    order: -1
                },
                ...virtualOptions,
                ...Array.from(pathMap.values()).sort((left, right) => left.order - right.order || left.title.localeCompare(right.title))
            ];
        }

        _getVirtualPath(pathId) {
            return this.virtualPaths.find(vp => vp.id === pathId) || null;
        }

        _getPathOptionById(id = this._pathFilter) {
            return this._getPathOptions().find(option => option.id === id) || this._getPathOptions()[0] || null;
        }

        _getTutorialsForPath(pathId) {
            const virtualPath = this._getVirtualPath(pathId);
            if (virtualPath) {
                const ordered = [];
                const seen = new Set();
                virtualPath.tutorialIds.forEach(id => {
                    if (seen.has(id)) return;
                    const tutorial = this._getTutorialById(id);
                    if (tutorial) {
                        ordered.push(tutorial);
                        seen.add(id);
                    }
                });
                return ordered;
            }
            const pathTutorials = this.tutorials.filter(tutorial => this._getTutorialPath(tutorial).id === pathId);
            if (pathTutorials.length <= 1) return pathTutorials;

            const tutorialIds = new Set(pathTutorials.map(tutorial => tutorial.id));
            const successorIds = new Set();
            const nextById = new Map();
            pathTutorials.forEach(tutorial => {
                const nextId = tutorial?.nextTutorialId;
                if (!nextId || !tutorialIds.has(nextId)) return;
                successorIds.add(nextId);
                nextById.set(tutorial.id, nextId);
            });

            const ordered = [];
            const visited = new Set();
            const startingTutorials = pathTutorials.filter(tutorial => !successorIds.has(tutorial.id));
            const visitChain = (tutorial) => {
                let current = tutorial;
                while (current && !visited.has(current.id)) {
                    ordered.push(current);
                    visited.add(current.id);
                    const nextId = nextById.get(current.id);
                    current = nextId ? pathTutorials.find(candidate => candidate.id === nextId) || null : null;
                }
            };

            startingTutorials.forEach(visitChain);
            pathTutorials.forEach(visitChain);
            return ordered;
        }

        _getOrderedTutorials() {
            const virtualIds = new Set(this.virtualPaths.map(vp => vp.id));
            const pathOrder = this._getPathOptions()
                .filter(path => path.id !== 'all' && !virtualIds.has(path.id))
                .sort((left, right) => left.order - right.order || left.title.localeCompare(right.title));
            return pathOrder.flatMap(path => this._getTutorialsForPath(path.id));
        }

        _getFilteredTutorials() {
            if (!this._pathFilter || this._pathFilter === 'all') return this._getOrderedTutorials();
            return this._getTutorialsForPath(this._pathFilter);
        }

        _getTutorialCoverage(tutorial) {
            const raw = Array.isArray(tutorial?.toolCoverage)
                ? tutorial.toolCoverage
                : Array.isArray(tutorial?.tools)
                    ? tutorial.tools
                    : [];
            return raw.map(item => String(item || '').trim()).filter(Boolean);
        }

        _getNextTutorial(tutorial = this._getTutorialById()) {
            if (!tutorial) return null;
            const virtualPath = this._getVirtualPath(this._pathFilter);
            if (virtualPath) {
                const ordered = this._getTutorialsForPath(virtualPath.id);
                const idx = ordered.findIndex(item => item.id === tutorial.id);
                if (idx >= 0) return ordered[idx + 1] || null;
            }
            if (tutorial.nextTutorialId) {
                return this._getTutorialById(tutorial.nextTutorialId) || null;
            }
            const pathId = this._getTutorialPath(tutorial).id;
            const samePath = this.tutorials.filter(item => this._getTutorialPath(item).id === pathId);
            const index = samePath.findIndex(item => item.id === tutorial.id);
            return index >= 0 ? samePath[index + 1] || null : null;
        }

        _setPathFilter(value, options = {}) {
            const nextValue = this._getPathOptionById(value)?.id || 'all';
            this._pathFilter = nextValue;
            if (this._pathSelect) this._pathSelect.value = nextValue;
            if (options.persist !== false) this._writeStoredPathFilter(nextValue);
            this._refreshTutorialOptions();
            if (!options.silent) {
                const path = this._getPathOptionById(nextValue);
                this._setStatus((path?.title || 'Tutorial path') + ' selected.');
            }
        }

        playNext() {
            const nextTutorial = this._getNextTutorial();
            if (!nextTutorial) return;
            const nextPathId = this._getTutorialPath(nextTutorial).id;
            const onVirtual = !!this._getVirtualPath(this._pathFilter);
            if (!onVirtual && this._pathFilter !== 'all' && this._pathFilter !== nextPathId) {
                this._setPathFilter(nextPathId, { silent: true });
            }
            this.play(nextTutorial.id);
        }

        _setPace(value, options = {}) {
            const next = this._getPaceOption(value).value;
            this._pace = next;
            if (this._paceSelect) this._paceSelect.value = next;
            if (options.persist !== false) this._writeStoredPace(next);
            if (!options.silent) this._setStatus('Playback pace set to ' + this._getPaceOption().label + '.');
            if (options.refreshUi !== false) {
                this._refreshTutorialOptionLabels();
                this._updatePanelMeta();
                this._renderTutorialProgress();
            }
        }

        _applyTutorialDefaultPace(tutorial, options = {}) {
            const hasTutorialDefault = tutorial && this.paceOptions.some(option => option.value === tutorial.defaultPace);
            const nextPace = hasTutorialDefault ? tutorial.defaultPace : this._readStoredPace();
            this._setPace(nextPace, {
                persist: false,
                silent: options.silent !== false,
                refreshUi: options.refreshUi !== false
            });
        }

        _paceMs(ms) {
            return Math.max(0, Math.round((ms || 0) * (this._getPaceOption().multiplier || 1)));
        }

        async _paceWait(ms) {
            await this._wait(this._paceMs(ms));
        }

        _countWords(text) {
            return String(text || '').trim().split(/\s+/).filter(Boolean).length;
        }

        _formatDurationCompact(ms) {
            const totalSeconds = Math.max(0, Math.round((Number(ms) || 0) / 1000));
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            if (hours > 0) {
                return hours + ':' + String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
            }
            return minutes + ':' + String(seconds).padStart(2, '0');
        }

        _formatDurationText(ms) {
            const totalSeconds = Math.max(0, Math.round((Number(ms) || 0) / 1000));
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            if (hours > 0) {
                return hours + 'h ' + minutes + 'm';
            }
            if (minutes > 0) {
                return minutes + 'm ' + seconds + 's';
            }
            return seconds + 's';
        }

        _getNarrationEstimateMs(text, options = {}) {
            const value = String(text || '').trim();
            if (!value) return 0;

            const wordCount = this._countWords(value);
            if (!wordCount) return 0;

            let estimate = 260 + wordCount * 165;
            const weight = String(options.weight || '').trim().toLowerCase();
            if (weight === 'short') estimate *= 0.92;
            else if (weight === 'long') estimate *= 1.24;
            else if (weight === 'extra-long') estimate *= 1.42;
            if (options.continuous) estimate *= 1.1;

            return Math.max(options.continuous ? 2400 : 1100, Math.round(estimate));
        }

        _getStepEstimatedMs(step) {
            if (!step) return 0;

            if (typeof step.estimatedMs === 'number' && Number.isFinite(step.estimatedMs)) {
                return this._paceMs(Math.max(0, step.estimatedMs));
            }

            const action = step.action || 'wait';
            const readingMs = this._getReadingPauseMs(step);
            const narrationMs = this._getNarrationEstimateMs(this._getStepVoiceoverText(step), {
                weight: step.readingWeight
            });
            const stepMs = Math.max(0, Number(step.ms) || 0);
            const waitBeforeMs = Math.max(0, Number(step.waitBefore) || 0);
            const waitAfterMs = Math.max(0, Number(step.waitAfter) || 0);
            const pacedReadingMs = this._paceMs(readingMs);
            const pacedStepMs = this._paceMs(stepMs);
            const pacedWaitBeforeMs = this._paceMs(waitBeforeMs);
            const pacedWaitAfterMs = this._paceMs(waitAfterMs);
            const hasTarget = Boolean(step.selector);
            const prepareMs = hasTarget && step.ensureVisible !== false && action !== 'wait' ? this._paceMs(220) : 0;
            const narrationBlockMs = Math.max(
                narrationMs,
                this._paceMs(waitBeforeMs || (action === 'wait' ? 0 : 250)),
                pacedReadingMs
            );

            let estimate = 0;
            switch (action) {
                case 'call':
                    estimate = Math.max(300, pacedStepMs, pacedWaitBeforeMs, pacedWaitAfterMs, pacedReadingMs, narrationMs);
                    break;
                case 'wait':
                    estimate = Math.max(this._paceMs(stepMs || this.defaultStepDelay), pacedReadingMs, narrationMs);
                    break;
                case 'tip':
                    if (!hasTarget) {
                        estimate = Math.max(this._paceMs(stepMs || this.defaultStepDelay), pacedReadingMs, narrationMs);
                        break;
                    }
                    estimate = prepareMs + narrationBlockMs + Math.max(this._paceMs(stepMs || this.defaultStepDelay), pacedReadingMs);
                    break;
                case 'scroll':
                    estimate = prepareMs + narrationBlockMs + Math.max(this._paceMs(waitAfterMs || 450), this._paceMs(280));
                    break;
                case 'click':
                case 'clickMatching':
                    estimate = prepareMs + narrationBlockMs + Math.max(this._paceMs(waitAfterMs || 500), this._paceMs(320));
                    break;
                case 'gesture':
                    estimate = prepareMs + narrationBlockMs + Math.max(
                        this._paceMs(step.durationMs || waitAfterMs || 900),
                        this._paceMs(420)
                    );
                    break;
                case 'input': {
                    const value = String(step.value ?? '');
                    const typingMs = (step.mode || 'instant') === 'type'
                        ? this._paceMs(value.length * Math.max(0, Number(step.typeDelay) || 22))
                        : 0;
                    estimate = prepareMs + narrationBlockMs + this._paceMs(120) + typingMs + Math.max(this._paceMs(waitAfterMs || 500), this._paceMs(320));
                    break;
                }
                case 'waitFor':
                    estimate = Math.max(600, Math.min(Number(step.timeout) || 1200, 2000));
                    break;
                default:
                    estimate = Math.max(this._paceMs(stepMs || this.defaultStepDelay), pacedReadingMs, narrationMs);
                    break;
            }

            return estimate;
        }

        _getTutorialEstimatedDuration(tutorial) {
            if (!tutorial) return { totalMs: 0, totalSteps: 0 };

            const steps = Array.isArray(tutorial.steps) ? tutorial.steps.length : 0;
            const measuredDuration = Number(tutorial.measuredDurationMs ?? tutorial.observedDurationMs);
            if (Number.isFinite(measuredDuration) && measuredDuration > 0) {
                return {
                    totalMs: Math.max(0, Math.round(measuredDuration)),
                    totalSteps: steps
                };
            }

            const explicitDuration = Number(tutorial.estimatedDurationMs ?? tutorial.durationMs);
            if (Number.isFinite(explicitDuration) && explicitDuration > 0) {
                return {
                    totalMs: this._paceMs(explicitDuration),
                    totalSteps: steps
                };
            }

            const tutorialSteps = Array.isArray(tutorial.steps) ? tutorial.steps : [];
            let totalMs = tutorialSteps.reduce((sum, step) => sum + this._getStepEstimatedMs(step), 0);
            if (!this._hasStepVoiceover(tutorial)) {
                totalMs = Math.max(
                    totalMs,
                    this._getNarrationEstimateMs(tutorial.voiceoverScript, { continuous: true })
                );
            }

            if (tutorialSteps.length) {
                const interactionCount = tutorialSteps.filter(step => ['click', 'clickMatching', 'gesture', 'input', 'scroll'].includes(step?.action || '')).length;
                const heuristicBufferMs = this._paceMs(1200 + (tutorialSteps.length * 280) + (interactionCount * 220));

                // Heuristic durations should lean conservative because the UI label is guidance only,
                // and panel-heavy walkthroughs consistently take longer than raw narration math suggests.
                totalMs = Math.round(totalMs * 1.22) + heuristicBufferMs;
            }

            return {
                totalMs: Math.max(tutorialSteps.length ? 1000 : 0, totalMs),
                totalSteps: tutorialSteps.length
            };
        }

        _getTutorialOptionLabel(tutorial) {
            if (!tutorial) return '';
            const estimate = this._getTutorialEstimatedDuration(tutorial);
            if (!estimate.totalMs) return tutorial.title;
            return tutorial.title + ' [' + this._formatDurationText(estimate.totalMs) + ']';
        }

        _refreshTutorialOptionLabels() {
            if (!this._select) return;
            const filteredTutorials = this._getFilteredTutorials();
            Array.from(this._select.options || []).forEach((option, index) => {
                const tutorial = filteredTutorials[index];
                if (!tutorial) return;
                option.textContent = this._getTutorialOptionLabel(tutorial);
                option.selected = tutorial.id === this._currentTutorialId;
            });
        }

        _beginTutorialProgress(tutorial) {
            if (!tutorial) return;
            this._clearTutorialProgress();

            const estimate = this._getTutorialEstimatedDuration(tutorial);
            this._tutorialProgressState = {
                tutorialId: tutorial.id,
                title: tutorial.title,
                totalMs: estimate.totalMs,
                totalSteps: estimate.totalSteps,
                currentStepIndex: -1,
                currentStepMs: 0,
                stepStartedAt: null,
                startedAt: null,
                pausedAt: null,
                pausedTotalMs: 0,
                completedAt: null
            };

            this._tutorialProgressTimer = window.setInterval(() => {
                this._renderTutorialProgress();
            }, 250);

            this._renderTutorialProgress();
        }

        _setTutorialProgressStep(stepIndex, totalSteps, step = null) {
            if (!this._tutorialProgressState) return;
            if (!this._tutorialProgressState.startedAt) {
                this._tutorialProgressState.startedAt = Date.now();
            }
            this._tutorialProgressState.currentStepIndex = stepIndex;
            this._tutorialProgressState.totalSteps = Math.max(totalSteps || 0, this._tutorialProgressState.totalSteps || 0);
            this._tutorialProgressState.currentStepMs = Math.max(250, this._getStepEstimatedMs(step));
            this._tutorialProgressState.stepStartedAt = Date.now();
            this._renderTutorialProgress();
        }

        _setTutorialProgressPaused(isPaused) {
            if (!this._tutorialProgressState) return;

            if (isPaused) {
                if (!this._tutorialProgressState.pausedAt) {
                    this._tutorialProgressState.pausedAt = Date.now();
                }
            } else if (this._tutorialProgressState.pausedAt) {
                this._tutorialProgressState.pausedTotalMs += Date.now() - this._tutorialProgressState.pausedAt;
                this._tutorialProgressState.pausedAt = null;
            }

            this._renderTutorialProgress();
        }

        _completeTutorialProgress() {
            if (!this._tutorialProgressState) return;
            if (!this._tutorialProgressState.startedAt) {
                this._tutorialProgressState.startedAt = Date.now();
            }
            if (this._tutorialProgressState.pausedAt) {
                this._tutorialProgressState.pausedTotalMs += Date.now() - this._tutorialProgressState.pausedAt;
                this._tutorialProgressState.pausedAt = null;
            }
            this._tutorialProgressState.completedAt = Date.now();
            this._renderTutorialProgress();
        }

        _clearTutorialProgress() {
            if (this._tutorialProgressTimer) {
                window.clearInterval(this._tutorialProgressTimer);
                this._tutorialProgressTimer = null;
            }
            this._tutorialProgressState = null;
            this._renderTutorialProgress();
        }

        _getTutorialProgressElapsedMs(state, now = Date.now()) {
            if (!state?.startedAt) return 0;
            const referenceTime = state.completedAt || now;
            const pausedMs = state.pausedTotalMs + (state.pausedAt ? Math.max(0, referenceTime - state.pausedAt) : 0);
            return Math.max(0, referenceTime - state.startedAt - pausedMs);
        }

        _getCurrentStepElapsedMs(state, now = Date.now()) {
            if (!state?.stepStartedAt) return 0;
            const referenceTime = state.completedAt || now;
            const tutorialPauseMs = state.pausedAt ? Math.max(0, referenceTime - state.pausedAt) : 0;
            return Math.max(0, referenceTime - state.stepStartedAt - tutorialPauseMs);
        }

        _renderTutorialProgress() {
            if (!this._tooltipProgressLabel || !this._tooltipProgressMeta || !this._tooltipProgressBar) return;

            const state = this._tutorialProgressState;
            if (!state) {
                if (this._tooltipTitle) {
                    const selectedTutorial = this._getTutorialById();
                    this._tooltipTitle.textContent = selectedTutorial?.title || 'Tutorial';
                }
                this._tooltipProgressLabel.textContent = 'Tutorial progress';
                this._tooltipProgressMeta.textContent = '';
                this._tooltipProgressBar.style.width = '0%';
                return;
            }

            if (this._tooltipTitle) {
                this._tooltipTitle.textContent = String(state.title || this._getTutorialById(state.tutorialId)?.title || 'Tutorial');
            }

            const elapsedMs = this._getTutorialProgressElapsedMs(state);
            const totalMs = Math.max(1000, Number(state.totalMs) || 0);
            const totalSteps = Math.max(1, Number(state.totalSteps) || 0);
            const currentStepIndex = Math.max(0, Number(state.currentStepIndex) || 0);
            const currentStepMs = Math.max(250, Number(state.currentStepMs) || 0);
            const currentStepElapsedMs = this._getCurrentStepElapsedMs(state);
            const currentStepRatio = state.completedAt
                ? 1
                : Math.max(0, Math.min(0.97, currentStepElapsedMs / currentStepMs));
            const percent = state.completedAt
                ? 100
                : Math.max(0, Math.min(99, ((currentStepIndex + currentStepRatio) / totalSteps) * 100));
            const stepPrefix = state.currentStepIndex >= 0 && state.totalSteps
                ? 'Step ' + (state.currentStepIndex + 1) + ' of ' + state.totalSteps + ' · '
                : '';

            if (state.completedAt) {
                this._tooltipProgressLabel.textContent = 'Tutorial complete';
                this._tooltipProgressMeta.textContent = this._formatDurationCompact(elapsedMs) + ' actual · est. ' + this._formatDurationCompact(totalMs);
            } else if (!state.startedAt) {
                this._tooltipProgressLabel.textContent = 'Tutorial progress';
                this._tooltipProgressMeta.textContent = 'About ' + this._formatDurationCompact(totalMs) + ' total';
            } else {
                this._tooltipProgressLabel.textContent = 'Tutorial progress';
                this._tooltipProgressMeta.textContent = stepPrefix + this._formatDurationCompact(elapsedMs) + ' elapsed · about ' + this._formatDurationCompact(totalMs) + ' total';
            }

            this._tooltipProgressBar.style.width = percent + '%';
        }

        setContext(context = {}) {
            this.context = { ...this.context, ...context };
        }

        registerTutorials(tutorials) {
            (tutorials || []).forEach(tutorial => this.registerTutorial(tutorial));
            this._refreshTutorialOptions();
            this._queueInitialVoiceoverWarm();
        }

        registerTutorial(tutorial) {
            if (!tutorial || !tutorial.id) return;
            const next = {
                steps: [],
                ...tutorial
            };
            const existingIndex = this.tutorials.findIndex(item => item.id === next.id);
            if (existingIndex >= 0) {
                this.tutorials.splice(existingIndex, 1, next);
            } else {
                this.tutorials.push(next);
            }
            if (!this._currentTutorialId) this._currentTutorialId = next.id;
        }

        mountControls({ container } = {}) {
            const mountPoint = typeof container === 'string' ? document.querySelector(container) : container;
            if (!mountPoint) return null;
            if (this._button) return this._button;

            const button = document.createElement('button');
            button.type = 'button';
            button.id = this.buttonId;
            if (this.buttonClassName) button.className = this.buttonClassName;
            button.innerHTML = '<i class="' + this.buttonIconClass + '"></i> ' + this.buttonLabel;
            button.addEventListener('click', () => this.togglePanel());
            mountPoint.appendChild(button);
            this._button = button;

            this._buildPanel();
            this._refreshTutorialOptions();
            this._queueInitialVoiceoverWarm();
            return button;
        }

        _queueInitialVoiceoverWarm() {
            if (!this.autoWarmAllTtsTutorialsOnMount || !this.warmAllTtsTutorialsOnOpen || this._initialVoiceoverWarmQueued) return;
            this._initialVoiceoverWarmQueued = true;

            void this._schedulePriorityTutorialVoiceoverWarm();

            const scheduleWarm = () => {
                const runWarm = () => this._scheduleAllTutorialVoiceoverWarm(this._resolvePriorityTutorialForWarm());
                if (typeof window.requestIdleCallback === 'function') {
                    window.requestIdleCallback(runWarm, { timeout: 1500 });
                    return;
                }
                window.setTimeout(runWarm, 220);
            };

            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', scheduleWarm, { once: true });
                return;
            }
            scheduleWarm();
        }

        togglePanel(forceOpen) {
            if (!this._panel) return;
            const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : this._panel.style.display !== 'block';
            this._panel.style.display = shouldOpen ? 'block' : 'none';
            if (shouldOpen) {
                void this._schedulePriorityTutorialVoiceoverWarm();
                this._scheduleAllTutorialVoiceoverWarm(this._resolvePriorityTutorialForWarm());
                window.requestAnimationFrame(() => {
                    this._constrainPanelToViewport({ resetHorizontal: true });
                    this._updatePanelMeta();
                });
            }
        }

        _showLoadingNotice(message) {
            if (!this._loadingNotice || !this._loadingNoticeText) return;
            this._loadingNoticeText.textContent = message || 'Please wait while the tutorial loads.';
            this._loadingNotice.style.display = 'block';
        }

        _hideLoadingNotice() {
            if (!this._loadingNotice) return;
            this._loadingNotice.style.display = 'none';
        }

        async play(id) {
            while (this._runFinished) {
                this.stop({ silent: true });
                await this._runFinished;
            }
            const tutorialId = id || this._select?.value || this._currentTutorialId;
            const tutorial = this._getTutorialById(tutorialId);
            if (!tutorial) return;

            let finishRun;
            this._runFinished = new Promise(resolve => { finishRun = resolve; });

            this.stop({ silent: true });
            this._playing = true;
            this._paused = false;
            this._aborted = false;
            if (id && this._select && this._select.value !== tutorial.id) {
                this._currentTutorialId = tutorial.id;
                this._select.value = tutorial.id;
                this._applyTutorialDefaultPace(tutorial, { silent: true });
                this._updatePanelMeta();
            }
            this._currentTutorialId = tutorial.id;
            this.togglePanel(false);
            this._setStatus('Playing ' + tutorial.title + '...');
            this._buildShell();
            this._beginTutorialProgress(tutorial);
            this._syncPlaybackControls();
            this._showLoadingNotice('Loading tutorial. Please wait while the workspace and voiceover are prepared.');

            try {
                if (typeof tutorial.beforeStart === 'function') {
                    const readiness = await tutorial.beforeStart(this, tutorial);
                    if (readiness?.prerequisite) {
                        this._setStatus(readiness.prerequisite);
                        this.togglePanel(true);
                        window.Utils?.showToast?.(readiness.prerequisite, 'info');
                        return;
                    }
                }

                const voiceoverSource = await this._detectVoiceoverSource(tutorial, ++this._voiceoverStatusToken);
                if (voiceoverSource?.type === 'ttsmaker' && this._getTutorialWarmState(tutorial) !== 'ready') {
                    this._showPreparationNotice(tutorial, 'Preparing tutorial voiceover. Using cached Alex voice where available.');
                    // Only block on the first step's audio so the tour can start quickly.
                    // Remaining steps warm in the background (parallel) while step 1 plays.
                    const jobs = this._getStepVoiceoverJobs(tutorial);
                    if (jobs.length) {
                        try {
                            await this._fetchTtsMakerAudioBlob(jobs[0].text, tutorial, jobs[0].step, jobs[0].stepIndex);
                        } catch (_) { /* fall through; _playTtsMakerSegment will retry per step */ }
                    }
                    void this._warmTutorialVoiceover(tutorial, { source: voiceoverSource });
                }

                await this._startVoiceover(tutorial, this._voiceoverLoadToken);
                this._hideLoadingNotice();
                const totalSteps = tutorial.steps.length;
                for (let index = 0; index < totalSteps; index += 1) {
                    this._checkAborted();
                    await this._executeStep(tutorial.steps[index], index, totalSteps, tutorial);
                }
                this._completeTutorialProgress();
                this._setStatus('Finished ' + tutorial.title + '.');
                this._showCompletion(tutorial.title + ' complete');
            } catch (error) {
                if (!this._aborted) {
                    console.warn('Tutorial run failed:', error);
                    this._setStatus('Tutorial stopped: ' + (error?.message || 'unknown error'));
                    if (window.Utils?.showToast) {
                        window.Utils.showToast('Tutorial stopped: ' + (error?.message || 'unknown error'), 'error');
                    }
                }
            } finally {
                // Demo objects and panels must also be restored after Stop or a failed step.
                if (typeof tutorial.afterFinish === 'function') {
                    const cleanupRunner = Object.create(this);
                    cleanupRunner._wait = ms => this._sleepRaw(ms);
                    try { await tutorial.afterFinish(cleanupRunner, tutorial); }
                    catch (error) {
                        console.warn('Tutorial cleanup failed:', error);
                        this._setStatus('Tutorial cleanup failed: ' + (error?.message || 'unknown error'));
                        window.Utils?.showToast?.('Tutorial cleanup could not finish. Check the stage before continuing.', 'warning');
                    }
                }
                this._stopVoiceover();
                this._playing = false;
                this._paused = false;
                this._aborted = false;
                this._syncPlaybackControls();
                this._clearTutorialProgress();
                this._teardownShell();
                this._runFinished = null;
                finishRun();
            }
        }

        stop(options = {}) {
            this._voiceoverLoadToken += 1;
            this._stopVoiceover();
            this._aborted = true;
            this._playing = false;
            this._paused = false;
            this._syncPlaybackControls();
            this._clearTutorialProgress();
            this._teardownShell();
            if (!options.silent) this._setStatus('Tutorial stopped.');
        }

        pause(options = {}) {
            if (!this._playing || this._paused) return;
            this._paused = true;
            this._pauseVoiceover();
            this._setTutorialProgressPaused(true);
            this._syncPlaybackControls();
            if (!options.silent) {
                const title = this._getTutorialById()?.title || 'Tutorial';
                this._setStatus(title + ' paused.');
            }
        }

        resume(options = {}) {
            if (!this._playing || !this._paused) return;
            this._paused = false;
            this._resumeVoiceover();
            this._setTutorialProgressPaused(false);
            this._syncPlaybackControls();
            if (!options.silent) {
                const title = this._getTutorialById()?.title || 'Tutorial';
                this._setStatus('Resumed ' + title + '.');
            }
        }

        togglePause() {
            if (this._paused) this.resume();
            else this.pause();
        }

        async _executeStep(step, index, totalSteps, tutorial) {
            const action = step?.action || 'wait';
            this._setTutorialProgressStep(index, totalSteps, step);
            if (typeof tutorial?.beforeStep === 'function') {
                await tutorial.beforeStep(this, tutorial, step, index, totalSteps);
            }
            if (action === 'call') {
                await step.run?.(this, tutorial, step, index, totalSteps);
                return;
            }
            if (action === 'wait') {
                if (Object.prototype.hasOwnProperty.call(step, 'surfaceLabel')) {
                    this._showSurfaceLabel(step.surfaceLabel || '', null, step);
                }
                this._showTooltip(index, totalSteps, step.tip || 'Waiting...', null, step, tutorial);
                await this._syncStepVoiceover(step, tutorial, index, Math.max(step.ms || this.defaultStepDelay, this._getReadingPauseMs(step)));
                return;
            }

            let element = null;
            try {
                if (step.selector) {
                    if (Object.prototype.hasOwnProperty.call(step, 'textMatch')) {
                        element = await this._waitForMatchingElement(step.selector, step.textMatch, step.timeout);
                    } else {
                        element = await this._waitForElement(step.selector, step.timeout);
                    }
                }
            } catch (error) {
                const message = String(error?.message || '');
                const missingTarget = message.startsWith('Element not found: ')
                    || message.startsWith('Matching element not found for selector: ');
                if (action !== 'tip' || !missingTarget) {
                    throw error;
                }
                console.warn('Tutorial tip target missing, showing the tip without a highlight:', error);
            }

            if (action === 'waitFor') return;

            if (element) {
                await this._prepareElement(element, step, index, totalSteps, tutorial);
            } else if (step.tip) {
                if (Object.prototype.hasOwnProperty.call(step, 'surfaceLabel')) {
                    this._showSurfaceLabel(step.surfaceLabel || '', null, step);
                }
                this._showTooltip(index, totalSteps, step.tip, null, step, tutorial);
            }

            switch (action) {
                case 'tip':
                    if (!element) {
                        await this._syncStepVoiceover(step, tutorial, index, Math.max(step.ms || this.defaultStepDelay, this._getReadingPauseMs(step)));
                        break;
                    }
                    await this._paceWait(Math.max(step.ms || this.defaultStepDelay, this._getReadingPauseMs(step)));
                    break;
                case 'scroll':
                    this._scrollElement(element, step);
                    await this._paceWait(step.waitAfter || 450);
                    break;
                case 'click':
                case 'clickMatching':
                    this._simulateClick(element);
                    await this._paceWait(step.waitAfter || 500);
                    break;
                case 'gesture':
                    await this._playGesture(step, element, tutorial, index, totalSteps);
                    await this._paceWait(step.waitAfter || 450);
                    break;
                case 'input':
                    await this._fillInput(element, step);
                    await this._paceWait(step.waitAfter || 500);
                    break;
                default:
                    throw new Error('Unsupported tutorial action: ' + action);
            }
        }

        async _prepareElement(element, step, index, totalSteps, tutorial) {
            if (step.ensureVisible !== false) {
                element.scrollIntoView({ behavior: 'smooth', block: step.block || 'center', inline: 'center' });
                await this._paceWait(220);
            }
            this._setCursorMode('default');
            this._moveCursor(element);
            this._spotlightElement(element, step.pad || 10);
            if (Object.prototype.hasOwnProperty.call(step, 'surfaceLabel')) {
                this._showSurfaceLabel(step.surfaceLabel || '', element, step);
            }
            this._showTooltip(index, totalSteps, step.tip || '', element, step, tutorial);
            await this._syncStepVoiceover(step, tutorial, index, Math.max(step.waitBefore || 250, this._getReadingPauseMs(step)));
        }

        _showSurfaceLabel(text, element, step = null) {
            if (!this._surfaceLabel) return;

            const label = String(text || '').trim();
            if (!label) {
                this._surfaceLabel.textContent = '';
                this._surfaceLabel.style.opacity = '0';
                this._surfaceLabel.style.transform = 'translateY(8px)';
                return;
            }

            this._surfaceLabel.textContent = label;

            const margin = 16;
            const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
            const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
            const rect = element ? element.getBoundingClientRect() : null;
            const labelWidth = Math.min(this._surfaceLabel.offsetWidth || 220, viewportWidth - margin * 2);
            const labelHeight = Math.min(this._surfaceLabel.offsetHeight || 40, viewportHeight - margin * 2);
            const explicitTop = Number(step?.surfaceLabelTop);
            const hasExplicitTop = Number.isFinite(explicitTop);

            let left = margin;
            let top = margin;
            if (rect) {
                left = Math.min(Math.max(rect.left, margin), Math.max(margin, viewportWidth - labelWidth - margin));
                top = hasExplicitTop ? explicitTop : rect.top - labelHeight - 12;
                if (!hasExplicitTop && top < margin) {
                    top = Math.min(rect.bottom + 12, Math.max(margin, viewportHeight - labelHeight - margin));
                }
            }

            this._surfaceLabel.style.left = left + 'px';
            this._surfaceLabel.style.top = Math.min(Math.max(top, margin), Math.max(margin, viewportHeight - labelHeight - margin)) + 'px';
            this._surfaceLabel.style.opacity = '1';
            this._surfaceLabel.style.transform = 'translateY(0)';
        }

        _getReadingPauseMs(step) {
            if (!step) return 0;
            if (typeof step.readingMs === 'number' && Number.isFinite(step.readingMs)) {
                return Math.max(0, step.readingMs);
            }

            const tip = String(step.tip || '').trim();
            if (!tip) return 0;

            const wordCount = tip.split(/\s+/).filter(Boolean).length;
            let readingMs = this.readingPauseBaseMs + wordCount * this.readingPausePerWordMs;

            const weight = String(step.readingWeight || '').trim().toLowerCase();
            if (weight === 'short') readingMs *= 0.85;
            else if (weight === 'long') readingMs *= 1.4;
            else if (weight === 'extra-long') readingMs *= 1.8;

            return Math.max(this.readingPauseMinMs, Math.min(this.readingPauseMaxMs, Math.round(readingMs)));
        }

        _getStepVoiceoverText(step) {
            if (!step) return '';
            if (Object.prototype.hasOwnProperty.call(step, 'voiceover')) {
                if (step.voiceover === false || step.voiceover == null) return '';
                return String(step.voiceover || '').trim();
            }
            return String(step.tip || '').trim();
        }

        async _syncStepVoiceover(step, tutorial, stepIndex, fallbackMs = 0) {
            const minWait = Math.max(0, Number(fallbackMs) || 0);
            const voiceoverText = this._getStepVoiceoverText(step);

            if (this._voiceoverMode === 'step-audio') {
                const played = await Promise.all([
                    this._playStepAudioSegment(step, tutorial, stepIndex),
                    minWait ? this._paceWait(minWait) : Promise.resolve()
                ]).then(result => result[0]);
                if (played) {
                    return;
                }
            }

            if (this._voiceoverMode === 'ttsmaker') {
                const played = await Promise.all([
                    this._playTtsMakerSegment(step, tutorial, stepIndex),
                    minWait ? this._paceWait(minWait) : Promise.resolve()
                ]).then(result => result[0]);
                if (played) {
                    return;
                }

                if (voiceoverText && this._voiceoverMode === 'ttsmaker' && this._playing && !this._aborted && !this._paused && this._canUseSpeechSynthesis()) {
                    const previousMode = this._voiceoverMode;
                    this._voiceoverMode = 'speech';
                    try {
                        this._setVoiceoverInfo('Voiceover: browser speech', 'TTSMaker fallback for this step');
                        this._setVoiceoverDebugState({
                            provider: 'browser speech',
                            cache: 'fallback',
                            detail: 'TTSMaker was unavailable for this step, so browser speech was used.',
                            stepLabel: tutorial.title + ' · Step ' + String(stepIndex + 1)
                        });
                        await Promise.all([
                            this._speakSpeechSegment(voiceoverText, tutorial),
                            minWait ? this._paceWait(minWait) : Promise.resolve()
                        ]);
                        return;
                    } finally {
                        if (this._voiceoverMode === 'speech') {
                            this._voiceoverMode = previousMode;
                        }
                    }
                }
            }

            if (this._voiceoverMode === 'google') {
                const played = await Promise.all([
                    this._playGoogleTtsSegment(step, tutorial, stepIndex),
                    minWait ? this._paceWait(minWait) : Promise.resolve()
                ]).then(result => result[0]);
                if (played) {
                    return;
                }

                if (voiceoverText && this._voiceoverMode === 'google' && this._playing && !this._aborted && !this._paused && this._canUseSpeechSynthesis()) {
                    const previousMode = this._voiceoverMode;
                    this._voiceoverMode = 'speech';
                    try {
                        this._setVoiceoverInfo('Voiceover: browser speech', 'Google Cloud TTS fallback for this step');
                        this._setVoiceoverDebugState({
                            provider: 'browser speech',
                            cache: 'fallback',
                            detail: 'Google Cloud TTS was unavailable for this step, so browser speech was used.',
                            stepLabel: tutorial.title + ' · Step ' + String(stepIndex + 1)
                        });
                        await Promise.all([
                            this._speakSpeechSegment(voiceoverText, tutorial),
                            minWait ? this._paceWait(minWait) : Promise.resolve()
                        ]);
                        return;
                    } finally {
                        if (this._voiceoverMode === 'speech') {
                            this._voiceoverMode = previousMode;
                        }
                    }
                }
            }

            if (this._voiceoverMode === 'speech' && voiceoverText) {
                await Promise.all([
                    this._speakSpeechSegment(voiceoverText, tutorial),
                    minWait ? this._paceWait(minWait) : Promise.resolve()
                ]);
                return;
            }

            if (minWait) await this._paceWait(minWait);
        }

        async _fillInput(element, step) {
            const value = String(step.value ?? '');
            element.focus();
            this._simulateClick(element);
            await this._paceWait(120);
            if ((step.mode || 'instant') === 'type') {
                await this._typeInto(element, value, step.typeDelay || 22);
            } else {
                this._setElementValue(element, value);
            }
        }

        async _typeInto(element, value, typeDelay) {
            this._setElementValue(element, '');
            for (const character of value) {
                this._checkAborted();
                this._setElementValue(element, String(element.value || '') + character, false);
                element.dispatchEvent(new Event('input', { bubbles: true }));
                await this._paceWait(typeDelay);
            }
            element.dispatchEvent(new Event('change', { bubbles: true }));
        }

        _setElementValue(element, value, emitChange = true) {
            element.value = value;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            if (emitChange) element.dispatchEvent(new Event('change', { bubbles: true }));
        }

        _scrollElement(element, step) {
            if (!element) return;
            if (typeof step.scrollTop === 'number' && typeof element.scrollTo === 'function') {
                element.scrollTo({ top: step.scrollTop, behavior: 'smooth' });
                return;
            }
            element.scrollIntoView({ behavior: 'smooth', block: step.block || 'center', inline: 'nearest' });
        }

        _simulateClick(element) {
            if (!element) return;
            const previousMode = this._cursor?.dataset?.mode || 'default';
            this._setCursorMode('click');
            this._moveCursor(element);
            const rect = element.getBoundingClientRect();
            this._showClickRipple(rect.left + rect.width / 2, rect.top + rect.height / 2);
            window.setTimeout(() => {
                if (this._cursor?.dataset?.mode === 'click') {
                    this._setCursorMode(previousMode);
                }
            }, 220);
            ['mousedown', 'mouseup', 'click'].forEach(type => {
                element.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
            });
        }

        async _playGesture(step, element, tutorial, index, totalSteps) {
            const descriptor = typeof step.getGesture === 'function'
                ? await step.getGesture(this, tutorial, step, index, totalSteps, element)
                : (step.gesture && typeof step.gesture === 'object' ? step.gesture : null);

            const rawPoints = Array.isArray(descriptor?.points)
                ? descriptor.points
                : [descriptor?.from, descriptor?.to];
            const points = rawPoints
                .map(point => this._normalizeGesturePoint(point, element))
                .filter(Boolean);

            if (!points.length) {
                const fallbackPoint = this._normalizeGesturePoint(step.point || null, element);
                if (!fallbackPoint) return;
                points.push(fallbackPoint);
            }

            const cursorMode = descriptor?.cursorMode || step.cursorMode || (points.length > 1 ? 'drag' : 'click');
            const durationMs = Math.max(180, Number(descriptor?.durationMs ?? step.durationMs) || (points.length > 1 ? 900 : 260));
            const holdMs = Math.max(0, Number(descriptor?.holdMs ?? step.holdMs) || 0);
            const showTrail = points.length > 1 && descriptor?.showTrail !== false;
            const trailElements = showTrail ? this._showGestureTrail(points, cursorMode) : [];

            this._setCursorMode(cursorMode);
            this._moveCursorToPoint(points[0].x, points[0].y);

            if (descriptor?.startClick !== false) {
                this._showClickRipple(points[0].x, points[0].y);
            }

            if (typeof descriptor?.onStart === 'function') {
                await descriptor.onStart(this, descriptor, step, tutorial, index, totalSteps);
            }

            if (points.length > 1) {
                let elapsedMs = 0;
                let lastFrameAt = performance.now();

                while (elapsedMs < durationMs) {
                    this._checkAborted();
                    if (this._paused) {
                        lastFrameAt = performance.now();
                        await this._sleepRaw(48);
                        continue;
                    }

                    const now = performance.now();
                    elapsedMs += now - lastFrameAt;
                    lastFrameAt = now;

                    const progress = Math.min(1, durationMs <= 0 ? 1 : elapsedMs / durationMs);
                    const point = this._interpolateGesturePoint(points, progress);
                    this._moveCursorToPoint(point.x, point.y);

                    if (typeof descriptor?.onProgress === 'function') {
                        descriptor.onProgress(progress, this, descriptor, step, tutorial, index, totalSteps);
                    }

                    await this._sleepRaw(16);
                }
            }

            const endPoint = points[points.length - 1];
            this._moveCursorToPoint(endPoint.x, endPoint.y);

            if (typeof descriptor?.onComplete === 'function') {
                await descriptor.onComplete(this, descriptor, step, tutorial, index, totalSteps);
            }

            if (descriptor?.endClick !== false) {
                this._showClickRipple(endPoint.x, endPoint.y);
            }

            if (holdMs) {
                await this._paceWait(holdMs);
            }

            trailElements.forEach(elementNode => {
                elementNode.style.opacity = '0';
                window.setTimeout(() => elementNode.remove(), 220);
            });
        }

        _isElementVisible(element) {
            if (!element || !element.isConnected) return false;

            let current = element;
            while (current && current.nodeType === Node.ELEMENT_NODE) {
                if (current.hidden || current.classList?.contains('hidden')) return false;
                const style = window.getComputedStyle(current);
                if (!style) return false;
                if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') {
                    return false;
                }
                current = current.parentElement;
            }

            const rect = element.getBoundingClientRect();
            return rect.width > 0 || rect.height > 0;
        }

        async _waitForElement(selector, timeout = 10000) {
            let elapsed = 0;
            while (elapsed < timeout) {
                this._checkAborted();
                if (this._paused) {
                    await this._sleepRaw(80);
                    continue;
                }
                const element = document.querySelector(selector);
                if (this._isElementVisible(element)) return element;
                await this._sleepRaw(120);
                if (!this._paused) elapsed += 120;
            }
            throw new Error('Element not found: ' + selector);
        }

        async _waitForMatchingElement(selector, textMatch, timeout = 10000) {
            const matchesText = this._makeTextMatcher(textMatch);
            let elapsed = 0;
            while (elapsed < timeout) {
                this._checkAborted();
                if (this._paused) {
                    await this._sleepRaw(80);
                    continue;
                }
                const candidates = Array.from(document.querySelectorAll(selector));
                const match = candidates.find(element => this._isElementVisible(element) && matchesText((element.textContent || '').trim()));
                if (match) return match;
                await this._sleepRaw(120);
                if (!this._paused) elapsed += 120;
            }
            throw new Error('Matching element not found for selector: ' + selector);
        }

        _makeTextMatcher(textMatch) {
            if (textMatch instanceof RegExp) {
                return text => textMatch.test(text);
            }
            const needle = String(textMatch || '').trim().toLowerCase();
            return text => !needle || text.toLowerCase().includes(needle);
        }

        _sleepRaw(ms) {
            return new Promise(resolve => setTimeout(resolve, Math.max(0, ms || 0)));
        }

        _wait(ms) {
            return new Promise(async (resolve, reject) => {
                try {
                    let remaining = Math.max(0, ms || 0);
                    while (remaining > 0) {
                        this._checkAborted();
                        if (this._paused) {
                            await this._sleepRaw(80);
                            continue;
                        }
                        const slice = Math.min(remaining, 80);
                        await this._sleepRaw(slice);
                        if (!this._paused) remaining -= slice;
                    }
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
        }

        _checkAborted() {
            if (this._aborted) throw new Error('aborted');
        }

        async _waitForVoiceoverPlaybackReady() {
            while (this._paused) {
                this._checkAborted();
                await this._sleepRaw(80);
            }
            this._checkAborted();
            return this._playing && !this._aborted;
        }

        _normalizeVoiceoverPath(src) {
            const value = String(src || '').trim();
            if (!value) return '';
            if (/^(https?:)?\/\//i.test(value) || value.startsWith('/') || value.startsWith('./') || value.startsWith('../')) {
                return value;
            }
            return this.voiceoverBasePath.replace(/\/$/, '') + '/' + value.replace(/^\//, '');
        }

        _getVoiceoverCandidates(tutorial) {
            const explicit = [];
            const declared = Array.isArray(tutorial?.voiceoverAudio)
                ? tutorial.voiceoverAudio
                : (tutorial?.voiceoverAudio ? [tutorial.voiceoverAudio] : []);
            declared.forEach(src => {
                const normalized = this._normalizeVoiceoverPath(src);
                if (normalized && !explicit.includes(normalized)) explicit.push(normalized);
            });

            const tutorialKey = String(tutorial?.voiceoverId || tutorial?.id || '').trim();
            if (!tutorialKey) return explicit;

            const conventional = this.voiceoverExtensions.map(ext => (
                this.voiceoverBasePath.replace(/\/$/, '') + '/' + tutorialKey + '.' + ext
            ));
            conventional.forEach(src => {
                if (src && !explicit.includes(src)) explicit.push(src);
            });
            return explicit;
        }

        _getStepVoiceoverCandidates(tutorial, step, stepIndex) {
            const explicit = [];
            const declared = Array.isArray(step?.voiceoverAudio)
                ? step.voiceoverAudio
                : (step?.voiceoverAudio ? [step.voiceoverAudio] : []);
            declared.forEach(src => {
                const normalized = this._normalizeVoiceoverPath(src);
                if (normalized && !explicit.includes(normalized)) explicit.push(normalized);
            });

            const tutorialKey = String(tutorial?.voiceoverId || tutorial?.id || '').trim();
            if (!tutorialKey) return explicit;

            const numericStepKey = String(stepIndex + 1).padStart(2, '0');
            const namedStepKey = String(step?.voiceoverId || step?.id || '').trim()
                .replace(/\s+/g, '-')
                .replace(/[^a-zA-Z0-9_-]/g, '-');

            const conventionalKeys = [numericStepKey];
            if (namedStepKey && !conventionalKeys.includes(namedStepKey)) conventionalKeys.push(namedStepKey);

            conventionalKeys.forEach(stepKey => {
                this.voiceoverExtensions.forEach(ext => {
                    const src = this.voiceoverBasePath.replace(/\/$/, '') + '/' + tutorialKey + '--step-' + stepKey + '.' + ext;
                    if (src && !explicit.includes(src)) explicit.push(src);
                });
            });

            return explicit;
        }

        _getStepVoiceoverCacheKey(tutorial, stepIndex) {
            return String(tutorial?.id || '') + '::' + String(stepIndex);
        }

        _getGoogleTtsCacheKey(tutorial, step, stepIndex, text) {
            return [
                String(tutorial?.id || ''),
                String(step?.voiceoverId || step?.id || stepIndex),
                String(text || '').trim()
            ].join('::');
        }

        _getTtsMakerCacheKey(status, tutorial, step, stepIndex, text) {
            return [
                'ttsmaker',
                String(status?.voiceId || ''),
                String(status?.audioFormat || ''),
                this._getGoogleTtsCacheKey(tutorial, step, stepIndex, text)
            ].join('::');
        }

        _getGoogleProviderCacheKey(status, tutorial, step, stepIndex, text) {
            return [
                'google',
                String(status?.voiceName || status?.languageCode || ''),
                String(status?.audioEncoding || ''),
                this._getGoogleTtsCacheKey(tutorial, step, stepIndex, text)
            ].join('::');
        }

        _supportsPersistentVoiceoverCache() {
            return this.enablePersistentVoiceoverCache
                && typeof window !== 'undefined'
                && !!window.caches
                && typeof window.caches.open === 'function';
        }

        async _getPersistentVoiceoverCache() {
            if (!this._supportsPersistentVoiceoverCache()) return null;
            if (this._persistentVoiceoverCachePromise) return this._persistentVoiceoverCachePromise;

            this._persistentVoiceoverCachePromise = window.caches.open(this.voiceoverPersistentCacheName)
                .catch(() => null)
                .then(cache => {
                    if (!cache) this._persistentVoiceoverCachePromise = null;
                    return cache;
                });
            return this._persistentVoiceoverCachePromise;
        }

        _getPersistentVoiceoverCacheUrl(cacheKey) {
            const origin = window.location?.origin || '';
            const basePath = String(window.location?.pathname || '/').replace(/[^/]*$/, '');
            return origin + basePath + '__tutorial_voiceover_cache__/' + encodeURIComponent(String(cacheKey || 'voiceover'));
        }

        async _readPersistentVoiceoverBlob(cacheKey) {
            const cache = await this._getPersistentVoiceoverCache();
            if (!cache) return null;

            const response = await cache.match(this._getPersistentVoiceoverCacheUrl(cacheKey)).catch(() => null);
            if (!response) return null;

            const blob = await response.blob().catch(() => null);
            if (!blob || !blob.size) return null;

            return {
                blob,
                cacheStatus: String(response.headers.get('X-Voiceover-Cache') || 'persistent').trim().toLowerCase() || 'persistent',
                voiceLabel: String(response.headers.get('X-Voiceover-Voice-Label') || '').trim(),
                voiceId: String(response.headers.get('X-Voiceover-Voice-Id') || '').trim()
            };
        }

        async _writePersistentVoiceoverBlob(cacheKey, result) {
            const cache = await this._getPersistentVoiceoverCache();
            if (!cache || !(result?.blob instanceof Blob) || !result.blob.size) return false;

            const headers = new Headers({
                'Content-Type': result.blob.type || 'audio/mpeg',
                'Cache-Control': 'private, max-age=31536000, immutable',
                'X-Voiceover-Cache': String(result.cacheStatus || 'persistent').trim().toLowerCase() || 'persistent',
                'X-Voiceover-Voice-Label': String(result.voiceLabel || '').trim(),
                'X-Voiceover-Voice-Id': String(result.voiceId || '').trim()
            });

            await cache.put(this._getPersistentVoiceoverCacheUrl(cacheKey), new Response(result.blob, { headers })).catch(() => null);
            return true;
        }

        _getCsrfToken() {
            const stageToken = String((window.__STAGE_USER && window.__STAGE_USER.csrf_token) || '').trim();
            if (stageToken) return stageToken;

            try {
                const raw = sessionStorage.getItem('animstage_stage_user_context');
                if (!raw) return '';
                const parsed = JSON.parse(raw);
                return String(parsed?.csrf_token || '').trim();
            } catch (_) {
                return '';
            }
        }

        async _getTtsMakerStatus(force = false) {
            if (!this.enableTtsMaker || !this.ttsMakerEndpoint) return null;
            if (!force && this._ttsMakerStatus) return this._ttsMakerStatus;
            if (!force && this._ttsMakerStatusPromise) return this._ttsMakerStatusPromise;

            const request = fetch(this.ttsMakerEndpoint + '?mode=status', {
                method: 'GET',
                credentials: 'same-origin',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            }).then(async response => {
                if (!response.ok) return null;
                const data = await response.json().catch(() => null);
                if (!data || data.ok === false || !data.enabled) {
                    this._ttsMakerStatus = null;
                    return null;
                }
                this._ttsMakerStatus = data;
                return data;
            }).catch(() => null).finally(() => {
                this._ttsMakerStatusPromise = null;
            });

            this._ttsMakerStatusPromise = request;
            return request;
        }

        async _fetchTtsMakerAudioBlob(text, tutorial, step, stepIndex, options = {}) {
            const script = String(text || '').trim();
            if (!script || !this.enableTtsMaker || !this.ttsMakerEndpoint) return null;

            const status = await this._getTtsMakerStatus();
            if (!status?.enabled) return null;

            const cacheKey = this._getTtsMakerCacheKey(status, tutorial, step, stepIndex, script);
            if (!options.skipMemoryCache && this._ttsMakerAudioCache.has(cacheKey)) {
                const cached = this._ttsMakerAudioCache.get(cacheKey) || null;
                return cached ? { ...cached, cacheStatus: 'memory' } : null;
            }

            if (!options.skipMemoryCache) {
                const persistent = await this._readPersistentVoiceoverBlob(cacheKey);
                if (persistent?.blob) {
                    const result = {
                        blob: persistent.blob,
                        cacheStatus: 'persistent',
                        voiceLabel: persistent.voiceLabel || String(status.voiceLabel || '').trim(),
                        voiceId: persistent.voiceId || String(status.voiceId || '').trim()
                    };
                    this._ttsMakerAudioCache.set(cacheKey, result);
                    return result;
                }
            }

            const csrfToken = this._getCsrfToken();
            if (!csrfToken) return null;

            const response = await fetch(this.ttsMakerEndpoint, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({
                    mode: 'synthesize',
                    tutorialId: String(tutorial?.id || ''),
                    stepIndex,
                    stepId: String(step?.voiceoverId || step?.id || ''),
                    text: script
                })
            });

            if (!response.ok) {
                if (response.status === 429) {
                    const retryAfterHeader = response.headers.get('Retry-After');
                    let retryAfterMs = 30000;
                    const parsed = parseInt(retryAfterHeader || '', 10);
                    if (Number.isFinite(parsed) && parsed > 0) retryAfterMs = parsed * 1000;
                    return { blob: null, rateLimited: true, retryAfterMs, status: 429 };
                }
                return { blob: null, status: response.status };
            }

            const blob = await response.blob().catch(() => null);
            if (!blob || !blob.size) return { blob: null, status: response.status };

            const result = {
                blob,
                cacheStatus: String(response.headers.get('X-Voiceover-Cache') || 'unknown').trim().toLowerCase(),
                voiceLabel: String(response.headers.get('X-Voiceover-Voice-Label') || status.voiceLabel || '').trim(),
                voiceId: String(response.headers.get('X-Voiceover-Voice-Id') || status.voiceId || '').trim()
            };
            this._ttsMakerAudioCache.set(cacheKey, result);
            await this._writePersistentVoiceoverBlob(cacheKey, result);
            return result;
        }

        async _detectTtsMakerSource(tutorial) {
            if (!this._hasStepVoiceover(tutorial)) return null;
            if (!this._getCsrfToken()) return null;
            const status = await this._getTtsMakerStatus();
            if (!status?.enabled) return null;

            const detail = String(status.voiceLabel || status.voiceName || status.label || 'Configured voice').trim();
            return {
                type: 'ttsmaker',
                label: 'Voiceover: TTSMaker',
                detail
            };
        }

        async _getGoogleTtsStatus(force = false) {
            if (!this.enableGoogleTts || !this.googleTtsEndpoint) return null;
            if (!force && this._googleTtsStatus) return this._googleTtsStatus;
            if (!force && this._googleTtsStatusPromise) return this._googleTtsStatusPromise;

            const request = fetch(this.googleTtsEndpoint + '?mode=status', {
                method: 'GET',
                credentials: 'same-origin',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            }).then(async response => {
                if (!response.ok) return null;
                const data = await response.json().catch(() => null);
                if (!data || data.ok === false || !data.enabled) {
                    this._googleTtsStatus = null;
                    return null;
                }
                this._googleTtsStatus = data;
                return data;
            }).catch(() => null).finally(() => {
                this._googleTtsStatusPromise = null;
            });

            this._googleTtsStatusPromise = request;
            return request;
        }

        async _fetchGoogleTtsAudioBlob(text, tutorial, step, stepIndex) {
            const script = String(text || '').trim();
            if (!script || !this.enableGoogleTts || !this.googleTtsEndpoint) return null;

            const status = await this._getGoogleTtsStatus();
            if (!status?.enabled) return null;

            const cacheKey = this._getGoogleProviderCacheKey(status, tutorial, step, stepIndex, script);
            if (this._googleTtsAudioCache.has(cacheKey)) {
                return this._googleTtsAudioCache.get(cacheKey) || null;
            }

            const persistent = await this._readPersistentVoiceoverBlob(cacheKey);
            if (persistent?.blob) {
                this._googleTtsAudioCache.set(cacheKey, persistent.blob);
                return persistent.blob;
            }

            const csrfToken = this._getCsrfToken();
            if (!csrfToken) return null;

            const response = await fetch(this.googleTtsEndpoint, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({
                    mode: 'synthesize',
                    tutorialId: String(tutorial?.id || ''),
                    stepIndex,
                    stepId: String(step?.voiceoverId || step?.id || ''),
                    text: script
                })
            });

            if (!response.ok) return null;

            const blob = await response.blob().catch(() => null);
            if (!blob || !blob.size) return null;
            await this._writePersistentVoiceoverBlob(cacheKey, {
                blob,
                cacheStatus: String(response.headers.get('X-Voiceover-Cache') || 'persistent').trim().toLowerCase() || 'persistent',
                voiceLabel: String(response.headers.get('X-Voiceover-Voice-Name') || status.voiceName || status.languageCode || '').trim(),
                voiceId: String(response.headers.get('X-Voiceover-Language-Code') || status.languageCode || '').trim()
            });
            this._googleTtsAudioCache.set(cacheKey, blob);
            return blob;
        }

        _createVoiceoverAudioFromBlob(blob) {
            if (!(blob instanceof Blob)) return null;
            const url = URL.createObjectURL(blob);
            const audio = new Audio();
            audio.preload = 'auto';
            audio.volume = this.voiceoverVolume;
            audio.src = url;
            audio.__voiceoverObjectUrl = url;
            return audio;
        }

        async _detectGoogleTtsSource(tutorial) {
            if (!this._hasStepVoiceover(tutorial)) return null;
            const status = await this._getGoogleTtsStatus();
            if (!status?.enabled) return null;

            const detail = String(status.voiceName || status.languageCode || status.label || 'Configured voice').trim();
            return {
                type: 'google',
                label: 'Voiceover: Google Cloud TTS',
                detail
            };
        }

        _canUseSpeechSynthesis() {
            return this.enableSpeechSynthesis
                && typeof window !== 'undefined'
                && 'speechSynthesis' in window
                && typeof window.SpeechSynthesisUtterance !== 'undefined';
        }

        _clearVoiceoverAudio() {
            const audio = this._voiceoverAudio;
            if (audio) {
                try { audio.pause(); } catch (_) {}
                try { audio.currentTime = 0; } catch (_) {}
                if (audio.__voiceoverObjectUrl) {
                    try { URL.revokeObjectURL(audio.__voiceoverObjectUrl); } catch (_) {}
                }
                try {
                    audio.removeAttribute('src');
                    audio.load();
                } catch (_) {}
            }
            this._voiceoverAudio = null;
            this._voiceoverSrc = '';
        }

        async _resolveStepVoiceoverSource(tutorial, step, stepIndex, token, tokenKey = '_voiceoverLoadToken') {
            const cacheKey = this._getStepVoiceoverCacheKey(tutorial, stepIndex);
            if (this._voiceoverStepSourceCache.has(cacheKey)) {
                return this._voiceoverStepSourceCache.get(cacheKey) || '';
            }

            const candidates = this._getStepVoiceoverCandidates(tutorial, step, stepIndex);
            for (const src of candidates) {
                if (token !== this[tokenKey]) return '';
                const audio = await this._loadVoiceoverAudio(src, token, tokenKey);
                if (!audio) continue;
                try {
                    audio.pause();
                    audio.removeAttribute('src');
                    audio.load();
                } catch (_) {}
                this._voiceoverStepSourceCache.set(cacheKey, src);
                return src;
            }

            this._voiceoverStepSourceCache.set(cacheKey, '');
            return '';
        }

        async _detectStepAudioVoiceover(tutorial, token, tokenKey = '_voiceoverStatusToken') {
            const steps = Array.isArray(tutorial?.steps) ? tutorial.steps : [];
            for (let index = 0; index < steps.length; index += 1) {
                if (token !== this[tokenKey]) return null;
                const src = await this._resolveStepVoiceoverSource(tutorial, steps[index], index, token, tokenKey);
                if (!src) continue;
                return {
                    type: 'step-audio',
                    label: 'Voiceover: uploaded audio',
                    detail: 'Step-synced segment audio',
                    src
                };
            }
            return null;
        }

        async _loadVoiceoverAudio(src, token, tokenKey = '_voiceoverLoadToken') {
            return new Promise(resolve => {
                const audio = new Audio();
                let settled = false;
                const cleanup = () => {
                    audio.removeEventListener('loadedmetadata', handleReady);
                    audio.removeEventListener('canplay', handleReady);
                    audio.removeEventListener('error', handleError);
                    clearTimeout(timeoutId);
                };
                const finish = result => {
                    if (settled) return;
                    settled = true;
                    cleanup();
                    resolve(result);
                };
                const handleReady = () => {
                    if (token !== this[tokenKey]) {
                        finish(null);
                        return;
                    }
                    audio.volume = this.voiceoverVolume;
                    finish(audio);
                };
                const handleError = () => finish(null);
                const timeoutId = setTimeout(() => finish(null), 2200);

                audio.preload = 'metadata';
                audio.volume = this.voiceoverVolume;
                audio.addEventListener('loadedmetadata', handleReady, { once: true });
                audio.addEventListener('canplay', handleReady, { once: true });
                audio.addEventListener('error', handleError, { once: true });
                audio.src = src;
                try { audio.load(); } catch (_) { finish(null); }
            });
        }

        async _detectVoiceoverSource(tutorial, token) {
            const tutorialId = String(tutorial?.id || '').trim();
            if (!tutorialId) return { type: 'none', label: 'Voiceover unavailable' };

            const cached = this._voiceoverStatusCache.get(tutorialId);
            if (cached) return cached;

            const stepAudio = await this._detectStepAudioVoiceover(tutorial, token, '_voiceoverStatusToken');
            if (stepAudio) {
                this._voiceoverStatusCache.set(tutorialId, stepAudio);
                return stepAudio;
            }

            const candidates = this._getVoiceoverCandidates(tutorial);
            for (const src of candidates) {
                if (token !== this._voiceoverStatusToken) return null;
                const audio = await this._loadVoiceoverAudio(src, token, '_voiceoverStatusToken');
                if (!audio) continue;
                try {
                    audio.pause();
                    audio.removeAttribute('src');
                    audio.load();
                } catch (_) {}
                const result = {
                    type: 'audio',
                    label: 'Voiceover: uploaded audio',
                    detail: src.split('/').pop() || src,
                    src
                };
                this._voiceoverStatusCache.set(tutorialId, result);
                return result;
            }

            const ttsMaker = await this._detectTtsMakerSource(tutorial);
            if (ttsMaker) {
                this._voiceoverStatusCache.set(tutorialId, ttsMaker);
                return ttsMaker;
            }

            const googleTts = await this._detectGoogleTtsSource(tutorial);
            if (googleTts) {
                this._voiceoverStatusCache.set(tutorialId, googleTts);
                return googleTts;
            }

            if ((this._hasStepVoiceover(tutorial) || String(tutorial?.voiceoverScript || '').trim()) && this._canUseSpeechSynthesis()) {
                const result = {
                    type: 'speech',
                    label: 'Voiceover: browser speech',
                    detail: this._hasStepVoiceover(tutorial) ? 'Step-synced built-in narration' : 'Built-in scripted narration'
                };
                this._voiceoverStatusCache.set(tutorialId, result);
                return result;
            }

            const result = {
                type: 'none',
                label: 'Voiceover unavailable',
                detail: 'No audio file or built-in speech source detected'
            };
            this._voiceoverStatusCache.set(tutorialId, result);
            return result;
        }

        _setVoiceoverInfo(label, detail = '') {
            this._voiceoverInfo = this._voiceoverInfo || this._panel?.querySelector('[data-role="voiceover"]') || null;
            if (!this._voiceoverInfo) return;
            this._voiceoverInfo.innerHTML = [
                '<strong style="display:block;font-size:12px;font-weight:700;color:#bfdbfe;">' + (label || 'Voiceover') + '</strong>',
                detail ? '<span style="display:block;margin-top:4px;font-size:12px;line-height:1.5;color:rgba(226, 232, 240, 0.82);">' + detail + '</span>' : ''
            ].join('');
        }

        _setVoiceoverDebugState(state = {}) {
            this._voiceoverDebugState = {
                ...this._voiceoverDebugState,
                ...state
            };
            this._renderVoiceoverDiagnostics();
        }

        _renderVoiceoverDiagnostics() {
            this._voiceoverDiagnostics = this._voiceoverDiagnostics || this._panel?.querySelector('[data-role="voiceover-diagnostics"]') || null;
            if (!this._voiceoverDiagnostics) return;

            const provider = String(this._voiceoverDebugState.provider || 'none');
            const cache = String(this._voiceoverDebugState.cache || 'unknown');
            const detail = String(this._voiceoverDebugState.detail || '').trim();
            const stepLabel = String(this._voiceoverDebugState.stepLabel || '').trim();

            this._voiceoverDiagnostics.innerHTML = [
                '<div style="font-size:12px;font-weight:700;color:#cbd5f5;letter-spacing:0.02em;">Voiceover Diagnostics</div>',
                '<div style="margin-top:8px;font-size:12px;line-height:1.55;color:rgba(226, 232, 240, 0.84);">Provider: ' + provider + '</div>',
                '<div style="margin-top:4px;font-size:12px;line-height:1.55;color:rgba(226, 232, 240, 0.84);">Cache: ' + cache + '</div>',
                stepLabel ? '<div style="margin-top:4px;font-size:12px;line-height:1.55;color:rgba(226, 232, 240, 0.84);">Step: ' + stepLabel + '</div>' : '',
                detail ? '<div style="margin-top:4px;font-size:12px;line-height:1.55;color:rgba(148, 163, 184, 0.96);">' + detail + '</div>' : ''
            ].join('');
        }

        _getStepVoiceoverJobs(tutorial) {
            const steps = Array.isArray(tutorial?.steps) ? tutorial.steps : [];
            return steps.map((step, stepIndex) => ({
                step,
                stepIndex,
                text: this._getStepVoiceoverText(step)
            })).filter(job => Boolean(job.text));
        }

        _getTutorialWarmState(tutorial) {
            const tutorialId = String(tutorial?.id || '').trim();
            if (!tutorialId) return 'idle';
            return this._tutorialVoiceoverWarmStates.get(tutorialId) || 'idle';
        }

        _showPreparationNotice(tutorial, message) {
            const totalSteps = Math.max(1, Array.isArray(tutorial?.steps) ? tutorial.steps.length : 1);
            this._showSurfaceLabel('', null);
            if (this._tooltipBadge && this._tooltipText) {
                this._tooltipBadge.textContent = 'Preparing Tutorial';
                this._tooltipText.textContent = message;
                this._showTooltip(0, totalSteps, message, null);
            }
            this._showLoadingNotice(message);
            this._setStatus(message);
        }

        async _warmTutorialVoiceover(tutorial, options = {}) {
            const tutorialId = String(tutorial?.id || '').trim();
            if (!tutorialId) return false;

            const existingPromise = this._tutorialVoiceoverWarmPromises.get(tutorialId);
            if (existingPromise) return existingPromise;

            const source = options.source || this._voiceoverStatusCache.get(tutorialId) || null;
            if (source && source.type !== 'ttsmaker') {
                this._tutorialVoiceoverWarmStates.set(tutorialId, 'skipped');
                return false;
            }

            const jobs = this._getStepVoiceoverJobs(tutorial);
            if (!jobs.length) {
                this._tutorialVoiceoverWarmStates.set(tutorialId, 'ready');
                return true;
            }

            this._tutorialVoiceoverWarmStates.set(tutorialId, 'warming');
            const warmPromise = (async () => {
                try {
                    // Warm step audio in parallel with a small concurrency cap so the
                    // tutorial becomes ready quickly on slow links without flooding the
                    // TTSMaker endpoint.
                    const concurrency = Math.max(1, Math.min(6, jobs.length));
                    let cursor = 0;
                    let anyFailed = false;
                    const workers = Array.from({ length: concurrency }, async () => {
                        while (true) {
                            const idx = cursor++;
                            if (idx >= jobs.length) return;
                            const job = jobs[idx];
                            try {
                                const result = await this._fetchTtsMakerAudioBlob(job.text, tutorial, job.step, job.stepIndex);
                                if (!result?.blob) anyFailed = true;
                            } catch (_) {
                                anyFailed = true;
                            }
                        }
                    });
                    await Promise.all(workers);
                    this._tutorialVoiceoverWarmStates.set(tutorialId, anyFailed ? 'failed' : 'ready');
                    return !anyFailed;
                } catch (_) {
                    this._tutorialVoiceoverWarmStates.set(tutorialId, 'failed');
                    return false;
                } finally {
                    this._tutorialVoiceoverWarmPromises.delete(tutorialId);
                }
            })();

            this._tutorialVoiceoverWarmPromises.set(tutorialId, warmPromise);
            return warmPromise;
        }

        _scheduleTutorialVoiceoverWarm(tutorial, source = null) {
            const tutorialId = String(tutorial?.id || '').trim();
            if (!tutorialId) return;
            if (this._getTutorialWarmState(tutorial) === 'ready') return;
            if (this._tutorialVoiceoverWarmPromises.has(tutorialId)) return;
            void this._warmTutorialVoiceover(tutorial, { source });
        }

        _resolvePriorityTutorialForWarm(tutorial = null) {
            if (tutorial?.id) return tutorial;

            const tutorialId = String(
                tutorial
                || this._select?.value
                || this._currentTutorialId
                || this.tutorials[0]?.id
                || ''
            ).trim();

            if (!tutorialId) return null;
            return this._getTutorialById(tutorialId) || this.tutorials[0] || null;
        }

        async _schedulePriorityTutorialVoiceoverWarm(tutorial = null) {
            const activeTutorial = this._resolvePriorityTutorialForWarm(tutorial);
            if (!activeTutorial) return false;

            const warmState = this._getTutorialWarmState(activeTutorial);
            if (warmState === 'ready' || warmState === 'warming') return warmState === 'ready';

            const source = this._voiceoverStatusCache.get(activeTutorial.id)
                || await this._detectVoiceoverSource(activeTutorial, ++this._voiceoverStatusToken);
            if (!source || source.type !== 'ttsmaker') return false;

            this._scheduleTutorialVoiceoverWarm(activeTutorial, source);
            return true;
        }

        _scheduleAllTutorialVoiceoverWarm(priorityTutorial = null) {
            if (!this.warmAllTtsTutorialsOnOpen) return;
            if (this._allTutorialVoiceoverWarmPromise) return;

            this._allTutorialVoiceoverWarmPromise = (async () => {
                try {
                    const ttsMakerStatus = await this._getTtsMakerStatus();
                    if (!ttsMakerStatus?.enabled) return;

                    const tutorials = Array.isArray(this.tutorials) ? this.tutorials.slice() : [];
                    const prioritizedTutorial = this._resolvePriorityTutorialForWarm(priorityTutorial);
                    if (prioritizedTutorial) {
                        const prioritizedIndex = tutorials.findIndex(tutorial => tutorial.id === prioritizedTutorial.id);
                        if (prioritizedIndex > 0) {
                            tutorials.unshift(tutorials.splice(prioritizedIndex, 1)[0]);
                        }
                    }

                    for (const tutorial of tutorials) {
                        const warmState = this._getTutorialWarmState(tutorial);
                        if (warmState === 'ready' || warmState === 'warming') continue;

                        const source = this._voiceoverStatusCache.get(tutorial.id)
                            || await this._detectVoiceoverSource(tutorial, ++this._voiceoverStatusToken);
                        if (!source || source.type !== 'ttsmaker') continue;
                        await this._warmTutorialVoiceover(tutorial, { source });
                    }
                } finally {
                    this._allTutorialVoiceoverWarmPromise = null;
                }
            })();
        }

        async _bakeStaticTutorialAudio(tutorial, stepIndex, blob, audioFormat) {
            try {
                const tutorialId = String(tutorial?.id || '').trim();
                if (!tutorialId || !blob) return false;
                const csrfToken = this._getCsrfToken();
                if (!csrfToken) {
                    console.warn('[bake-static-audio] no CSRF token — user not signed in?');
                    return false;
                }

                // Convert blob -> base64 (no data: prefix).
                const base64 = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onerror = () => reject(reader.error || new Error('FileReader error'));
                    reader.onload = () => {
                        const text = String(reader.result || '');
                        const comma = text.indexOf(',');
                        resolve(comma >= 0 ? text.slice(comma + 1) : text);
                    };
                    reader.readAsDataURL(blob);
                });

                const response = await fetch('api/voiceover/bake-static-audio.php', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-Token': csrfToken,
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    body: JSON.stringify({
                        tutorialId,
                        stepIndex,
                        audioFormat: String(audioFormat || 'mp3').toLowerCase(),
                        audioBase64: base64
                    })
                });

                if (!response.ok) {
                    const errBody = await response.text().catch(() => '');
                    console.warn('[bake-static-audio] HTTP ' + response.status + ' for ' + tutorialId + ' step ' + (stepIndex + 1) + ': ' + errBody.slice(0, 300));
                    return false;
                }
                const data = await response.json().catch(() => null);
                if (!data?.ok) {
                    console.warn('[bake-static-audio] non-ok response:', data);
                    return false;
                }
                return true;
            } catch (err) {
                console.warn('[bake-static-audio] exception:', err);
                return false;
            }
        }

        async _preGenerateVoiceovers() {
            if (this._preGenerating) return;

            const ttsMakerStatus = await this._getTtsMakerStatus();
            if (!ttsMakerStatus?.enabled) {
                this._setStatus('Pre-generation unavailable: TTSMaker is not configured.');
                return;
            }

            const tutorials = Array.isArray(this.tutorials) ? this.tutorials.slice() : [];
            const jobs = [];
            const sourceTally = {};
            const skippedNoText = [];

            // Clear potentially-stale source cache so detection runs fresh.
            // The auto-warm at panel mount can race with token bumps and cache 'none'
            // for tutorials that actually have ttsmaker voiceover.
            this._voiceoverStatusCache.clear();
            // Also clear per-step source cache so we accurately detect which steps
            // already have a baked static file (and can be skipped).
            if (this._voiceoverStepSourceCache?.clear) {
                this._voiceoverStepSourceCache.clear();
            }

            for (const tutorial of tutorials) {
                // Bypass _detectVoiceoverSource cache races; check ttsmaker directly.
                const hasText = this._hasStepVoiceover(tutorial);
                if (!hasText) {
                    sourceTally['no-text'] = (sourceTally['no-text'] || 0) + 1;
                    skippedNoText.push(tutorial.id);
                    continue;
                }
                // NOTE: don't skip tutorials whose first step is already baked —
                // later steps may still be missing. Per-step skip happens in the loop below.
                const ttsMaker = await this._detectTtsMakerSource(tutorial);
                const sourceType = ttsMaker?.type || 'no-ttsmaker';
                sourceTally[sourceType] = (sourceTally[sourceType] || 0) + 1;
                if (!ttsMaker || ttsMaker.type !== 'ttsmaker') continue;
                this._getStepVoiceoverJobs(tutorial).forEach(job => {
                    jobs.push({ tutorial, ...job });
                });
            }

            if (!jobs.length) {
                console.warn('[pre-generate] No ttsmaker jobs. Source breakdown:', sourceTally,
                    'tutorials:', tutorials.length,
                    'csrf:', Boolean(this._getCsrfToken()),
                    'ttsStatus:', await this._getTtsMakerStatus());
                if (skippedNoText.length) {
                    console.warn('[pre-generate] First few tutorials skipped for "no voiceover text":', skippedNoText.slice(0, 5));
                }
                this._setStatus('No TTSMaker-backed tutorial steps need pre-generation. Source breakdown: '
                    + Object.entries(sourceTally).map(([k, v]) => k + '=' + v).join(', '));
                return;
            }

            this._preGenerating = true;
            if (this._preGenerateButton) {
                this._preGenerateButton.disabled = true;
                this._preGenerateButton.textContent = 'Pre-generating...';
            }

            let cacheHits = 0;
            let freshSynths = 0;
            let failures = 0;
            let rateLimitedFailures = 0;
            let alreadyBakedSkips = 0;
            let staticBaked = 0;
            let staticFailures = 0;

            const userRole = String(window.__STAGE_USER?.role || '').toLowerCase();
            const canBakeStatic = userRole === 'admin' || userRole === 'superadmin';
            const bakeFormat = String(ttsMakerStatus?.audioFormat || 'mp3').toLowerCase();

            try {
                for (let index = 0; index < jobs.length; index += 1) {
                    const job = jobs[index];
                    const label = job.tutorial.title + ' · Step ' + String(job.stepIndex + 1);

                    // Skip steps that already have a baked static file on disk.
                    if (canBakeStatic) {
                        const existingSrc = await this._resolveStepVoiceoverSource(
                            job.tutorial, job.step, job.stepIndex,
                            this._voiceoverStatusToken, '_voiceoverStatusToken'
                        );
                        if (existingSrc) {
                            alreadyBakedSkips += 1;
                            continue;
                        }
                    }

                    this._setStatus('Pre-generating voiceovers ' + (index + 1) + '/' + jobs.length + ': ' + label
                        + (alreadyBakedSkips ? ' (skipped already-baked: ' + alreadyBakedSkips + ')' : ''));
                    this._setVoiceoverDebugState({
                        provider: 'TTSMaker',
                        cache: 'checking',
                        stepLabel: label,
                        detail: 'Checking cache or synthesizing if missing.'
                    });

                    let result = await this._fetchTtsMakerAudioBlob(job.text, job.tutorial, job.step, job.stepIndex, { skipMemoryCache: true });

                    // Retry-with-backoff on 429.
                    let retryAttempts = 0;
                    while (result && result.rateLimited && retryAttempts < 3) {
                        retryAttempts += 1;
                        const backoffMs = Math.min(result.retryAfterMs || 30000, 60000);
                        console.warn('[pre-generate] 429 rate-limited, backing off ' + backoffMs + 'ms (attempt ' + retryAttempts + '/3) for ' + label);
                        this._setStatus('TTSMaker rate-limited; waiting ' + Math.round(backoffMs / 1000) + 's before retry…');
                        await this._sleepRaw(backoffMs);
                        result = await this._fetchTtsMakerAudioBlob(job.text, job.tutorial, job.step, job.stepIndex, { skipMemoryCache: true });
                    }

                    if (!result?.blob) {
                        if (result?.rateLimited) rateLimitedFailures += 1;
                        failures += 1;
                        // After repeated rate-limit failures, abort the rest — let the user retry later.
                        if (rateLimitedFailures >= 3) {
                            console.warn('[pre-generate] Aborting after ' + rateLimitedFailures + ' rate-limit failures. ' + (jobs.length - index - 1) + ' jobs remain.');
                            this._setStatus('Pre-generation paused: TTSMaker rate-limit reached. Remaining: ' + (jobs.length - index - 1) + '. Retry in a few minutes.');
                            break;
                        }
                        continue;
                    }

                    const cacheStatus = String(result.cacheStatus || 'unknown');
                    if (cacheStatus === 'hit') cacheHits += 1;
                    else if (cacheStatus === 'miss') freshSynths += 1;

                    this._setVoiceoverDebugState({
                        provider: 'TTSMaker',
                        cache: cacheStatus,
                        stepLabel: label,
                        detail: String(result.voiceLabel || ttsMakerStatus.voiceLabel || 'Configured voice')
                    });

                    if (canBakeStatic) {
                        const baked = await this._bakeStaticTutorialAudio(job.tutorial, job.stepIndex, result.blob, bakeFormat);
                        if (baked) staticBaked += 1; else staticFailures += 1;
                    }

                    if (cacheStatus === 'miss') {
                        // Fresh synth — throttle harder to stay under TTSMaker quota.
                        await this._sleepRaw(2200);
                    } else {
                        // Cache hit — still pace requests modestly.
                        await this._sleepRaw(150);
                    }
                }

                const skippedSummary = alreadyBakedSkips ? ' Already-baked steps skipped: ' + alreadyBakedSkips + '.' : '';
                const bakedSummary = canBakeStatic
                    ? ' Static files baked: ' + staticBaked + (staticFailures ? ' (failed: ' + staticFailures + ')' : '') + '.'
                    : '';
                this._setStatus('Pre-generation complete. Fresh synths: ' + freshSynths + ', cache hits: ' + cacheHits + (failures ? ', failures: ' + failures + (rateLimitedFailures ? ' (rate-limited: ' + rateLimitedFailures + ')' : '') : '') + '.' + skippedSummary + bakedSummary);
            } finally {
                this._preGenerating = false;
                if (this._preGenerateButton) {
                    this._preGenerateButton.disabled = false;
                    this._preGenerateButton.textContent = 'Pre-generate TTS';
                }
                this._updatePanelMeta();
            }
        }

        async _refreshVoiceoverInfo(tutorial = this._getTutorialById()) {
            const activeTutorial = tutorial;
            if (!activeTutorial) {
                this._setVoiceoverInfo('Voiceover unavailable', 'No tutorial selected');
                this._setVoiceoverDebugState({ provider: 'none', cache: 'unknown', detail: 'No tutorial selected', stepLabel: '' });
                return;
            }

            if (this._playing && activeTutorial.id === this._currentTutorialId) {
                if (this._voiceoverMode === 'audio') {
                    this._setVoiceoverInfo('Voiceover: uploaded audio', this._voiceoverSrc.split('/').pop() || this._voiceoverSrc);
                    this._setVoiceoverDebugState({ provider: 'uploaded audio', cache: 'n/a', detail: this._voiceoverSrc.split('/').pop() || this._voiceoverSrc, stepLabel: '' });
                    return;
                }
                if (this._voiceoverMode === 'step-audio') {
                    this._setVoiceoverInfo('Voiceover: uploaded audio', this._voiceoverSrc ? 'Step-synced segment: ' + (this._voiceoverSrc.split('/').pop() || this._voiceoverSrc) : 'Step-synced segment audio');
                    this._setVoiceoverDebugState({ provider: 'uploaded step audio', cache: 'n/a', detail: this._voiceoverSrc ? (this._voiceoverSrc.split('/').pop() || this._voiceoverSrc) : 'Step-synced segment audio', stepLabel: '' });
                    return;
                }
                if (this._voiceoverMode === 'ttsmaker') {
                    this._setVoiceoverInfo('Voiceover: TTSMaker', this._voiceoverSrc || String(this._ttsMakerStatus?.voiceLabel || this._ttsMakerStatus?.voiceName || 'Configured voice'));
                    this._setVoiceoverDebugState({ provider: 'TTSMaker', cache: this._voiceoverDebugState.cache || 'unknown', detail: this._voiceoverSrc || String(this._ttsMakerStatus?.voiceLabel || this._ttsMakerStatus?.voiceName || 'Configured voice'), stepLabel: this._voiceoverDebugState.stepLabel || '' });
                    return;
                }
                if (this._voiceoverMode === 'google') {
                    this._setVoiceoverInfo('Voiceover: Google Cloud TTS', this._voiceoverSrc || String(this._googleTtsStatus?.voiceName || this._googleTtsStatus?.languageCode || 'Configured voice'));
                    this._setVoiceoverDebugState({ provider: 'Google Cloud TTS', cache: 'n/a', detail: this._voiceoverSrc || String(this._googleTtsStatus?.voiceName || this._googleTtsStatus?.languageCode || 'Configured voice'), stepLabel: '' });
                    return;
                }
                if (this._voiceoverMode === 'speech') {
                    this._setVoiceoverInfo('Voiceover: browser speech', this._hasStepVoiceover(activeTutorial) ? 'Step-synced built-in narration' : 'Built-in scripted narration');
                    this._setVoiceoverDebugState({ provider: 'browser speech', cache: 'n/a', detail: this._hasStepVoiceover(activeTutorial) ? 'Step-synced built-in narration' : 'Built-in scripted narration', stepLabel: '' });
                    return;
                }
            }

            this._setVoiceoverInfo('Checking voiceover...', 'Looking for uploaded audio or built-in narration');
            const token = ++this._voiceoverStatusToken;
            const result = await this._detectVoiceoverSource(activeTutorial, token);
            if (!result || token !== this._voiceoverStatusToken) return;
            this._setVoiceoverInfo(result.label, result.detail || '');
            this._setVoiceoverDebugState({ provider: result.label.replace(/^Voiceover:\s*/i, ''), cache: result.type === 'ttsmaker' ? 'ready' : 'n/a', detail: result.detail || '', stepLabel: '' });
            if (result.type === 'ttsmaker') {
                this._scheduleTutorialVoiceoverWarm(activeTutorial, result);
            }
        }

        async _prepareVoiceoverAudio(tutorial, token) {
            this._clearVoiceoverAudio();
            const candidates = this._getVoiceoverCandidates(tutorial);
            for (const src of candidates) {
                if (token !== this._voiceoverLoadToken) return null;
                const audio = await this._loadVoiceoverAudio(src, token);
                if (!audio) continue;
                if (token !== this._voiceoverLoadToken) {
                    try { audio.pause(); } catch (_) {}
                    return null;
                }
                this._voiceoverAudio = audio;
                this._voiceoverSrc = src;
                return audio;
            }
            return null;
        }

        async _playStepAudioSegment(step, tutorial, stepIndex) {
            if (this._voiceoverMode !== 'step-audio') return false;
            const token = this._voiceoverLoadToken;
            const src = await this._resolveStepVoiceoverSource(tutorial, step, stepIndex, token);
            if (!src || token !== this._voiceoverLoadToken || this._voiceoverMode !== 'step-audio') return false;

            this._clearVoiceoverAudio();
            const audio = await this._loadVoiceoverAudio(src, token);
            if (!audio || token !== this._voiceoverLoadToken || this._voiceoverMode !== 'step-audio') return false;

            let completed = false;
            const finish = () => { completed = true; };
            audio.addEventListener('ended', finish, { once: true });
            audio.addEventListener('error', finish, { once: true });

            try {
                this._voiceoverAudio = audio;
                this._voiceoverSrc = src;
                this._setVoiceoverInfo('Voiceover: uploaded audio', 'Step-synced segment: ' + (src.split('/').pop() || src));
                this._setVoiceoverDebugState({
                    provider: 'uploaded step audio',
                    cache: 'n/a',
                    detail: src.split('/').pop() || src,
                    stepLabel: tutorial.title + ' · Step ' + String(stepIndex + 1)
                });
                await this._waitForVoiceoverPlaybackReady();
                audio.currentTime = 0;
                await audio.play();

                while (!completed) {
                    this._checkAborted();
                    if (token !== this._voiceoverLoadToken || this._voiceoverMode !== 'step-audio') break;
                    await this._sleepRaw(80);
                    if (audio.ended) completed = true;
                }
            } catch (_) {
                if (this._voiceoverAudio === audio) this._clearVoiceoverAudio();
                return false;
            }

            if (this._voiceoverAudio === audio) this._clearVoiceoverAudio();
            return true;
        }

        async _playTtsMakerSegment(step, tutorial, stepIndex) {
            if (this._voiceoverMode !== 'ttsmaker') return false;

            const text = this._getStepVoiceoverText(step);
            if (!text) return false;

            const result = await this._fetchTtsMakerAudioBlob(text, tutorial, step, stepIndex);
            if (!result?.blob || this._voiceoverMode !== 'ttsmaker') return false;

            this._clearVoiceoverAudio();
            const audio = this._createVoiceoverAudioFromBlob(result.blob);
            if (!audio) return false;

            let completed = false;
            const finish = () => { completed = true; };
            audio.addEventListener('ended', finish, { once: true });
            audio.addEventListener('error', finish, { once: true });

            try {
                this._voiceoverAudio = audio;
                const voiceLabel = String(result.voiceLabel || this._ttsMakerStatus?.voiceLabel || this._ttsMakerStatus?.voiceName || 'Configured voice');
                this._voiceoverSrc = voiceLabel;
                this._setVoiceoverInfo('Voiceover: TTSMaker', voiceLabel);
                this._setVoiceoverDebugState({
                    provider: 'TTSMaker',
                    cache: result.cacheStatus || 'unknown',
                    detail: voiceLabel + (result.voiceId ? ' · Voice ID ' + result.voiceId : ''),
                    stepLabel: tutorial.title + ' · Step ' + String(stepIndex + 1)
                });
                await this._waitForVoiceoverPlaybackReady();
                audio.currentTime = 0;
                await audio.play();

                while (!completed) {
                    this._checkAborted();
                    if (this._voiceoverMode !== 'ttsmaker') break;
                    await this._sleepRaw(80);
                    if (audio.ended) completed = true;
                }
            } catch (_) {
                if (this._voiceoverAudio === audio) this._clearVoiceoverAudio();
                return false;
            }

            if (this._voiceoverAudio === audio) this._clearVoiceoverAudio();
            return true;
        }

        async _playGoogleTtsSegment(step, tutorial, stepIndex) {
            if (this._voiceoverMode !== 'google') return false;

            const text = this._getStepVoiceoverText(step);
            if (!text) return false;

            const blob = await this._fetchGoogleTtsAudioBlob(text, tutorial, step, stepIndex);
            if (!blob || this._voiceoverMode !== 'google') return false;

            this._clearVoiceoverAudio();
            const audio = this._createVoiceoverAudioFromBlob(blob);
            if (!audio) return false;

            let completed = false;
            const finish = () => { completed = true; };
            audio.addEventListener('ended', finish, { once: true });
            audio.addEventListener('error', finish, { once: true });

            try {
                this._voiceoverAudio = audio;
                const voiceLabel = String(this._googleTtsStatus?.voiceName || this._googleTtsStatus?.languageCode || 'Configured voice');
                this._voiceoverSrc = voiceLabel;
                this._setVoiceoverInfo('Voiceover: Google Cloud TTS', voiceLabel);
                await this._waitForVoiceoverPlaybackReady();
                audio.currentTime = 0;
                await audio.play();

                while (!completed) {
                    this._checkAborted();
                    if (this._voiceoverMode !== 'google') break;
                    await this._sleepRaw(80);
                    if (audio.ended) completed = true;
                }
            } catch (_) {
                if (this._voiceoverAudio === audio) this._clearVoiceoverAudio();
                return false;
            }

            if (this._voiceoverAudio === audio) this._clearVoiceoverAudio();
            return true;
        }

        _hasStepVoiceover(tutorial) {
            return Array.isArray(tutorial?.steps)
                && tutorial.steps.some(step => Boolean(this._getStepVoiceoverText(step)));
        }

        async _speakSpeechSegment(text, tutorial) {
            if (this._voiceoverMode !== 'speech' || !this._canUseSpeechSynthesis()) return false;
            const script = String(text || '').trim();
            if (!script) return false;

            const token = ++this._voiceoverSpeechToken;
            let completed = false;

            try {
                await this._waitForVoiceoverPlaybackReady();
                window.speechSynthesis.cancel();
                const utterance = new window.SpeechSynthesisUtterance(script);
                utterance.rate = Math.max(0.75, Math.min(1.2, Number(tutorial?.voiceoverSpeechRate) || 0.96));
                utterance.pitch = Math.max(0.8, Math.min(1.2, Number(tutorial?.voiceoverSpeechPitch) || 1));
                utterance.volume = this.voiceoverVolume;
                utterance.onend = () => { completed = true; };
                utterance.onerror = () => { completed = true; };
                this._voiceoverUtterance = utterance;
                window.speechSynthesis.speak(utterance);

                while (!completed) {
                    this._checkAborted();
                    if (token !== this._voiceoverSpeechToken || this._voiceoverMode !== 'speech') break;
                    await this._sleepRaw(80);
                    if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending && !window.speechSynthesis.paused) {
                        completed = true;
                    }
                }

                if (token === this._voiceoverSpeechToken) this._voiceoverUtterance = null;
                return true;
            } catch (_) {
                if (token === this._voiceoverSpeechToken) this._voiceoverUtterance = null;
                return false;
            }
        }

        _startContinuousSpeechVoiceover(tutorial) {
            if (!this._canUseSpeechSynthesis()) return false;
            const script = String(tutorial?.voiceoverScript || '').trim();
            if (!script) return false;
            try {
                window.speechSynthesis.cancel();
                const utterance = new window.SpeechSynthesisUtterance(script);
                utterance.rate = Math.max(0.75, Math.min(1.2, Number(tutorial?.voiceoverSpeechRate) || 0.96));
                utterance.pitch = Math.max(0.8, Math.min(1.2, Number(tutorial?.voiceoverSpeechPitch) || 1));
                utterance.volume = this.voiceoverVolume;
                this._voiceoverUtterance = utterance;
                this._voiceoverMode = 'speech';
                window.speechSynthesis.speak(utterance);
                return true;
            } catch (_) {
                this._voiceoverUtterance = null;
                this._voiceoverMode = 'none';
                return false;
            }
        }

        _startSpeechVoiceover(tutorial) {
            if (!this._canUseSpeechSynthesis()) return false;
            this._voiceoverSpeechToken += 1;
            this._voiceoverUtterance = null;

            if (this._hasStepVoiceover(tutorial)) {
                try { window.speechSynthesis.cancel(); } catch (_) {}
                this._voiceoverMode = 'speech';
                return true;
            }

            return this._startContinuousSpeechVoiceover(tutorial);
        }

        async _startVoiceover(tutorial, token) {
            this._voiceoverMode = 'none';
            this._voiceoverUtterance = null;

            const stepAudio = await this._detectStepAudioVoiceover(tutorial, token, '_voiceoverLoadToken');
            if (stepAudio) {
                this._voiceoverMode = 'step-audio';
                this._voiceoverSrc = stepAudio.src || '';
                this._setVoiceoverInfo('Voiceover: uploaded audio', 'Step-synced segment audio');
                this._setVoiceoverDebugState({ provider: 'uploaded step audio', cache: 'n/a', detail: 'Step-synced segment audio', stepLabel: '' });
                return;
            }

            const audio = await this._prepareVoiceoverAudio(tutorial, token);
            if (audio) {
                try {
                    audio.currentTime = 0;
                    await audio.play();
                    this._voiceoverMode = 'audio';
                    this._setVoiceoverInfo('Voiceover: uploaded audio', this._voiceoverSrc.split('/').pop() || this._voiceoverSrc);
                    this._setVoiceoverDebugState({ provider: 'uploaded audio', cache: 'n/a', detail: this._voiceoverSrc.split('/').pop() || this._voiceoverSrc, stepLabel: '' });
                    return;
                } catch (_) {
                    this._clearVoiceoverAudio();
                }
            }

            const ttsMaker = await this._detectTtsMakerSource(tutorial);
            if (ttsMaker) {
                this._ttsMakerStatus = await this._getTtsMakerStatus() || this._ttsMakerStatus;
                this._voiceoverMode = 'ttsmaker';
                this._voiceoverSrc = ttsMaker.detail || '';
                this._setVoiceoverInfo(ttsMaker.label, ttsMaker.detail || 'Configured voice');
                this._setVoiceoverDebugState({ provider: 'TTSMaker', cache: 'ready', detail: ttsMaker.detail || 'Configured voice', stepLabel: '' });
                return;
            }

            const googleTts = await this._detectGoogleTtsSource(tutorial);
            if (googleTts) {
                this._googleTtsStatus = await this._getGoogleTtsStatus() || this._googleTtsStatus;
                this._voiceoverMode = 'google';
                this._voiceoverSrc = googleTts.detail || '';
                this._setVoiceoverInfo(googleTts.label, googleTts.detail || 'Configured voice');
                this._setVoiceoverDebugState({ provider: 'Google Cloud TTS', cache: 'n/a', detail: googleTts.detail || 'Configured voice', stepLabel: '' });
                return;
            }

            if (this._startSpeechVoiceover(tutorial)) {
                this._setVoiceoverInfo('Voiceover: browser speech', this._hasStepVoiceover(tutorial) ? 'Step-synced built-in narration' : 'Built-in scripted narration');
                this._setVoiceoverDebugState({ provider: 'browser speech', cache: 'n/a', detail: this._hasStepVoiceover(tutorial) ? 'Step-synced built-in narration' : 'Built-in scripted narration', stepLabel: '' });
                return;
            }
            this._setVoiceoverInfo('Voiceover unavailable', 'No audio file or built-in speech source detected');
            this._setVoiceoverDebugState({ provider: 'none', cache: 'unknown', detail: 'No audio file or built-in speech source detected', stepLabel: '' });
        }

        _pauseVoiceover() {
            if (this._voiceoverMode === 'audio' || this._voiceoverMode === 'step-audio' || this._voiceoverMode === 'ttsmaker' || this._voiceoverMode === 'google') {
                if (this._voiceoverAudio && !this._voiceoverAudio.paused) this._voiceoverAudio.pause();
                return;
            }
            if (this._voiceoverMode === 'speech' && this._canUseSpeechSynthesis() && window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
                try { window.speechSynthesis.pause(); } catch (_) {}
            }
        }

        _resumeVoiceover() {
            if (this._voiceoverMode === 'audio' || this._voiceoverMode === 'step-audio' || this._voiceoverMode === 'ttsmaker' || this._voiceoverMode === 'google') {
                this._voiceoverAudio?.play?.().catch(() => {});
                return;
            }
            if (this._voiceoverMode === 'speech' && this._canUseSpeechSynthesis() && window.speechSynthesis.paused) {
                try { window.speechSynthesis.resume(); } catch (_) {}
            }
        }

        _stopVoiceover() {
            if (this._voiceoverMode === 'audio' || this._voiceoverMode === 'step-audio' || this._voiceoverMode === 'ttsmaker' || this._voiceoverMode === 'google') {
                if (this._voiceoverAudio) {
                    try { this._voiceoverAudio.pause(); } catch (_) {}
                    try { this._voiceoverAudio.currentTime = 0; } catch (_) {}
                }
                this._clearVoiceoverAudio();
            }
            if (this._voiceoverMode === 'speech' && this._canUseSpeechSynthesis()) {
                this._voiceoverSpeechToken += 1;
                try { window.speechSynthesis.cancel(); } catch (_) {}
            }
            this._voiceoverMode = 'none';
            this._voiceoverUtterance = null;
            this._refreshVoiceoverInfo();
        }

        _buildPanel() {
            const panel = document.createElement('div');
            panel.id = this.panelId;
            panel.style.cssText = [
                'display:none',
                'position:fixed',
                'top:' + this.panelTop,
                'right:' + this.panelRight,
                'z-index:20000',
                'width:min(360px, calc(100vw - 32px))',
                'min-width:300px',
                'max-width:calc(100vw - 16px)',
                'height:min(680px, calc(100vh - 32px))',
                'min-height:260px',
                'max-height:calc(100vh - 16px)',
                'padding:16px',
                'overflow:auto',
                'resize:both',
                'box-sizing:border-box',
                'border-radius:16px',
                'background:rgba(15, 23, 42, 0.94)',
                'border:1px solid rgba(148, 163, 184, 0.24)',
                'box-shadow:0 24px 60px rgba(2, 6, 23, 0.42)',
                'backdrop-filter:blur(14px)',
                'color:#e5eefc',
                'font-family:Inter, sans-serif'
            ].join(';');
            panel.innerHTML = [
                '<div data-role="panel-header" style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px;cursor:move;user-select:none;">',
                '<div>',
                '<div style="font-size:15px;font-weight:700;">' + this.panelTitle + '</div>',
                '<div style="margin-top:4px;font-size:12px;line-height:1.5;color:rgba(226, 232, 240, 0.78);">' + this.panelSubtitle + '</div>',
                '</div>',
                '<button type="button" data-close="1" style="width:34px;height:34px;border:none;border-radius:10px;background:rgba(51, 65, 85, 0.92);color:#e2e8f0;cursor:pointer;"><i class="fas fa-times"></i></button>',
                '</div>',
                '<label style="display:block;font-size:12px;font-weight:600;letter-spacing:0.02em;color:rgba(191, 219, 254, 0.9);margin-bottom:6px;">Playback pace</label>',
                '<select data-role="pace" style="width:100%;padding:12px 14px;border-radius:12px;border:1px solid rgba(148, 163, 184, 0.28);background:rgba(15, 23, 42, 0.9);color:#f8fafc;font:inherit;outline:none;"></select>',
                '<label style="display:block;font-size:12px;font-weight:600;letter-spacing:0.02em;color:rgba(191, 219, 254, 0.9);margin:12px 0 6px;">' + this.pathLabel + '</label>',
                '<select data-role="path" style="width:100%;padding:12px 14px;border-radius:12px;border:1px solid rgba(148, 163, 184, 0.28);background:rgba(15, 23, 42, 0.9);color:#f8fafc;font:inherit;outline:none;"></select>',
                '<div data-role="path-summary" style="margin-top:10px;padding:12px 14px;border-radius:12px;background:rgba(8, 15, 29, 0.72);border:1px solid rgba(59, 130, 246, 0.18);font-size:12px;line-height:1.6;color:rgba(191, 219, 254, 0.92);"></div>',
                '<label style="display:block;font-size:12px;font-weight:600;letter-spacing:0.02em;color:rgba(191, 219, 254, 0.9);margin-bottom:6px;">Choose tutorial</label>',
                '<select data-role="select" style="width:100%;padding:12px 14px;border-radius:12px;border:1px solid rgba(148, 163, 184, 0.28);background:rgba(15, 23, 42, 0.9);color:#f8fafc;font:inherit;outline:none;"></select>',
                '<div data-role="description" style="margin-top:12px;padding:12px 14px;border-radius:12px;background:rgba(30, 41, 59, 0.82);font-size:13px;line-height:1.6;color:rgba(226, 232, 240, 0.84);"></div>',
                '<div data-role="timing" style="margin-top:10px;padding:12px 14px;border-radius:12px;background:rgba(8, 15, 29, 0.76);border:1px solid rgba(125, 211, 252, 0.18);font-size:12px;line-height:1.6;color:rgba(191, 219, 254, 0.9);"></div>',
                '<div data-role="coverage" style="margin-top:10px;padding:12px 14px;border-radius:12px;background:rgba(15, 23, 42, 0.72);border:1px solid rgba(148, 163, 184, 0.2);font-size:12px;line-height:1.6;color:rgba(226, 232, 240, 0.82);"></div>',
                '<div data-role="voiceover" style="margin-top:10px;padding:12px 14px;border-radius:12px;background:rgba(15, 23, 42, 0.72);border:1px solid rgba(148, 163, 184, 0.2);"></div>',
                '<div data-role="voiceover-diagnostics" style="margin-top:10px;padding:12px 14px;border-radius:12px;background:rgba(2, 6, 23, 0.68);border:1px solid rgba(59, 130, 246, 0.18);"></div>',
                '<div data-role="status" style="margin-top:10px;font-size:12px;color:rgba(125, 211, 252, 0.92);min-height:18px;"></div>',
                '<div style="display:flex;gap:10px;margin-top:14px;">',
                '<button type="button" data-play="1" style="flex:1;padding:12px 14px;border:none;border-radius:12px;background:linear-gradient(135deg, #0ea5e9, #2563eb);color:#fff;font:inherit;font-weight:700;cursor:pointer;">Play Tutorial</button>',
                '<button type="button" data-pause="1" style="padding:12px 14px;border:none;border-radius:12px;background:rgba(15, 23, 42, 0.92);border:1px solid rgba(125, 211, 252, 0.28);color:#f8fafc;font:inherit;font-weight:600;cursor:pointer;">Pause</button>',
                '<button type="button" data-stop="1" style="padding:12px 14px;border:none;border-radius:12px;background:rgba(51, 65, 85, 0.95);color:#f8fafc;font:inherit;font-weight:600;cursor:pointer;">Stop</button>',
                '</div>',
                '<button type="button" data-next="1" style="width:100%;margin-top:10px;padding:12px 14px;border:none;border-radius:12px;background:rgba(37, 99, 235, 0.18);border:1px solid rgba(96, 165, 250, 0.26);color:#dbeafe;font:inherit;font-weight:700;cursor:pointer;">Play Next Tutorial</button>',
                '<button type="button" data-pregen="1" style="width:100%;margin-top:10px;padding:12px 14px;border:none;border-radius:12px;background:rgba(15, 23, 42, 0.92);border:1px solid rgba(74, 222, 128, 0.26);color:#dcfce7;font:inherit;font-weight:700;cursor:pointer;">Pre-generate TTS</button>'
            ].join('');
            document.body.appendChild(panel);

            panel.querySelector('[data-close="1"]')?.addEventListener('click', () => this.togglePanel(false));
            panel.querySelector('[data-play="1"]')?.addEventListener('click', () => this.play());
            panel.querySelector('[data-pause="1"]')?.addEventListener('click', () => this.togglePause());
            panel.querySelector('[data-stop="1"]')?.addEventListener('click', () => this.stop());
            panel.querySelector('[data-next="1"]')?.addEventListener('click', () => this.playNext());
            panel.querySelector('[data-pregen="1"]')?.addEventListener('click', () => this._preGenerateVoiceovers());

            this._panel = panel;
            this._paceSelect = panel.querySelector('[data-role="pace"]');
            this._pathSelect = panel.querySelector('[data-role="path"]');
            this._select = panel.querySelector('[data-role="select"]');
            this._pathSummary = panel.querySelector('[data-role="path-summary"]');
            this._description = panel.querySelector('[data-role="description"]');
            this._timingSummary = panel.querySelector('[data-role="timing"]');
            this._coverage = panel.querySelector('[data-role="coverage"]');
            this._voiceoverInfo = panel.querySelector('[data-role="voiceover"]');
            this._voiceoverDiagnostics = panel.querySelector('[data-role="voiceover-diagnostics"]');
            this._status = panel.querySelector('[data-role="status"]');
            this._pauseButton = panel.querySelector('[data-pause="1"]');
            this._nextButton = panel.querySelector('[data-next="1"]');
            this._preGenerateButton = panel.querySelector('[data-pregen="1"]');
            this._panelHeader = panel.querySelector('[data-role="panel-header"]');
            if (this._paceSelect) {
                this._paceSelect.innerHTML = this.paceOptions.map(option => {
                    const selected = option.value === this._pace ? ' selected' : '';
                    return '<option value="' + option.value + '"' + selected + '>' + option.label + '</option>';
                }).join('');
                this._paceSelect.addEventListener('change', () => {
                    this._setPace(this._paceSelect.value);
                });
            }
            if (this._pathSelect) {
                this._pathSelect.addEventListener('change', () => {
                    this._setPathFilter(this._pathSelect.value);
                });
            }
            this._select?.addEventListener('change', () => {
                this._currentTutorialId = this._select.value;
                this._applyTutorialDefaultPace(this._getTutorialById(), { silent: true });
                this._updatePanelMeta();
                void this._schedulePriorityTutorialVoiceoverWarm();
            });

            document.addEventListener('click', event => {
                if (!this._panel || this._panel.style.display !== 'block') return;
                if (this._panel.contains(event.target) || this._button?.contains(event.target)) return;
                this.togglePanel(false);
            });

            this._enablePanelInteractions();
            this._renderVoiceoverDiagnostics();
        }

        _enablePanelInteractions() {
            if (!this._panel || !this._panelHeader) return;
            if (typeof this._panelDragCleanup === 'function') {
                this._panelDragCleanup();
                this._panelDragCleanup = null;
            }

            const panel = this._panel;
            const header = this._panelHeader;
            const dragStart = event => {
                if (!panel || event.button !== 0) return;
                if (event.target && event.target.closest('button, select, input, textarea, a, label')) return;

                const rect = panel.getBoundingClientRect();
                const offsetX = event.clientX - rect.left;
                const offsetY = event.clientY - rect.top;

                panel.style.left = rect.left + 'px';
                panel.style.top = rect.top + 'px';
                panel.style.right = 'auto';
                panel.style.bottom = 'auto';

                const dragMove = moveEvent => {
                    const nextLeft = moveEvent.clientX - offsetX;
                    const nextTop = moveEvent.clientY - offsetY;
                    panel.style.left = nextLeft + 'px';
                    panel.style.top = nextTop + 'px';
                    this._constrainPanelToViewport();
                };

                const dragEnd = () => {
                    window.removeEventListener('pointermove', dragMove);
                    window.removeEventListener('pointerup', dragEnd);
                    window.removeEventListener('pointercancel', dragEnd);
                    try { header.releasePointerCapture(event.pointerId); } catch (_) {}
                };

                try { header.setPointerCapture(event.pointerId); } catch (_) {}
                window.addEventListener('pointermove', dragMove);
                window.addEventListener('pointerup', dragEnd);
                window.addEventListener('pointercancel', dragEnd);
                event.preventDefault();
            };

            const resizeHandler = () => this._constrainPanelToViewport();
            header.addEventListener('pointerdown', dragStart);
            window.addEventListener('resize', resizeHandler);

            this._panelDragCleanup = () => {
                header.removeEventListener('pointerdown', dragStart);
                window.removeEventListener('resize', resizeHandler);
            };

            this._constrainPanelToViewport();
        }

        _constrainPanelToViewport(options = {}) {
            if (!this._panel) return;
            if (this._panel.style.display === 'none') return;

            const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
            const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
            if (!viewportWidth || !viewportHeight) return;

            const margin = 8;
            const preferredMinWidth = 300;
            const preferredMinHeight = 260;
            const maxWidth = Math.max(220, viewportWidth - margin * 2);
            const maxHeight = Math.max(220, viewportHeight - margin * 2);
            const minWidth = Math.min(preferredMinWidth, maxWidth);
            const minHeight = Math.min(preferredMinHeight, maxHeight);

            this._panel.style.maxWidth = maxWidth + 'px';
            this._panel.style.maxHeight = maxHeight + 'px';
            this._panel.style.minWidth = minWidth + 'px';
            this._panel.style.minHeight = minHeight + 'px';

            const rect = this._panel.getBoundingClientRect();
            const width = Math.min(Math.max(rect.width, minWidth), maxWidth);
            const height = Math.min(Math.max(rect.height, minHeight), maxHeight);
            this._panel.style.width = width + 'px';
            this._panel.style.height = height + 'px';

            const nextRect = this._panel.getBoundingClientRect();
            let left = Number.parseFloat(this._panel.style.left);
            let top = Number.parseFloat(this._panel.style.top);

            if (options.resetHorizontal) {
                left = viewportWidth - nextRect.width - 20;
                this._panel.style.right = 'auto';
            } else if (!Number.isFinite(left)) {
                left = Math.max(margin, viewportWidth - nextRect.width - 20);
                this._panel.style.left = left + 'px';
                this._panel.style.right = 'auto';
            }
            if (!Number.isFinite(top)) {
                top = Math.max(margin, Math.min(nextRect.top, viewportHeight - nextRect.height - margin));
                this._panel.style.top = top + 'px';
            }

            const maxLeft = Math.max(margin, viewportWidth - nextRect.width - margin);
            const maxTop = Math.max(margin, viewportHeight - nextRect.height - margin);
            this._panel.style.left = Math.min(Math.max(left, margin), maxLeft) + 'px';
            this._panel.style.top = Math.min(Math.max(top, margin), maxTop) + 'px';
        }

        _refreshTutorialOptions() {
            if (this._pathSelect) {
                this._pathSelect.innerHTML = this._getPathOptions().map(path => {
                    const selected = path.id === this._pathFilter ? ' selected' : '';
                    return '<option value="' + path.id + '"' + selected + '>' + path.title + '</option>';
                }).join('');
                this._pathSelect.value = this._getPathOptionById(this._pathFilter)?.id || 'all';
            }
            if (!this._select) return;
            const filteredTutorials = this._getFilteredTutorials();
            if (!filteredTutorials.length && this._pathFilter !== 'all') {
                this._pathFilter = 'all';
                this._writeStoredPathFilter('all');
                return this._refreshTutorialOptions();
            }
            this._select.innerHTML = filteredTutorials.map(tutorial => {
                const selected = tutorial.id === this._currentTutorialId ? ' selected' : '';
                return '<option value="' + tutorial.id + '"' + selected + '>' + this._getTutorialOptionLabel(tutorial) + '</option>';
            }).join('');
            if (!filteredTutorials.some(tutorial => tutorial.id === this._currentTutorialId)) {
                this._currentTutorialId = filteredTutorials[0]?.id || '';
            }
            if (!this._currentTutorialId && filteredTutorials[0]) {
                this._currentTutorialId = filteredTutorials[0].id;
                this._select.value = this._currentTutorialId;
            }
            if (this._select && this._currentTutorialId) this._select.value = this._currentTutorialId;
            this._applyTutorialDefaultPace(this._getTutorialById(), { silent: true, refreshUi: false });
            this._updatePanelMeta();
            this._syncPlaybackControls();
        }

        _updatePanelMeta() {
            if (!this._description) return;
            const path = this._getPathOptionById(this._pathFilter);
            if (this._pathSummary) {
                this._pathSummary.innerHTML = path
                    ? '<strong style="display:block;font-size:12px;font-weight:700;color:#bfdbfe;">' + path.title + '</strong>' +
                        '<span style="display:block;margin-top:4px;">' + (path.summary || 'Browse a grouped set of tutorials that should be taken together.') + '</span>'
                    : 'Browse the currently available tutorials.';
            }
            const tutorial = this.tutorials.find(item => item.id === (this._select?.value || this._currentTutorialId));
            if (!tutorial) {
                this._description.textContent = 'No tutorials available yet.';
                if (this._timingSummary) this._timingSummary.innerHTML = 'Estimated timing will appear here once a tutorial is selected.';
                if (this._coverage) this._coverage.innerHTML = 'Tool coverage will appear here once a tutorial is selected.';
                this._setVoiceoverInfo('Voiceover unavailable', 'No tutorial selected');
                this._setVoiceoverDebugState({ provider: 'none', cache: 'unknown', detail: 'No tutorial selected', stepLabel: '' });
                return;
            }
            const tutorialPath = this._getTutorialPath(tutorial);
            const coverage = this._getTutorialCoverage(tutorial);
            const recommendedNext = this._getNextTutorial(tutorial);
            const estimate = this._getTutorialEstimatedDuration(tutorial);
            const durationText = this._formatDurationText(estimate.totalMs);
            const measuredDuration = Number(tutorial.measuredDurationMs);
            const observedDuration = Number(tutorial.observedDurationMs);
            const hasMeasuredDuration = Number.isFinite(measuredDuration) && measuredDuration > 0;
            const hasObservedDuration = Number.isFinite(observedDuration) && observedDuration > 0;
            const audience = String(tutorial.audience || '').trim();
            const format = String(tutorial.format || tutorial.kind || '').trim();
            this._description.innerHTML = [
                tutorial.description ? '<div>' + tutorial.description + '</div>' : '',
                '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;">',
                '<span style="display:inline-flex;align-items:center;padding:4px 8px;border-radius:999px;background:rgba(14, 165, 233, 0.16);color:#7dd3fc;font-size:11px;font-weight:700;">' + tutorialPath.title + '</span>',
                estimate.totalMs ? '<span style="display:inline-flex;align-items:center;padding:4px 8px;border-radius:999px;background:rgba(56, 189, 248, 0.12);color:#bae6fd;font-size:11px;font-weight:700;">' + durationText + '</span>' : '',
                format ? '<span style="display:inline-flex;align-items:center;padding:4px 8px;border-radius:999px;background:rgba(59, 130, 246, 0.12);color:#bfdbfe;font-size:11px;font-weight:700;">' + format + '</span>' : '',
                audience ? '<span style="display:inline-flex;align-items:center;padding:4px 8px;border-radius:999px;background:rgba(16, 185, 129, 0.12);color:#a7f3d0;font-size:11px;font-weight:700;">' + audience + '</span>' : '',
                '</div>',
                recommendedNext ? '<div style="margin-top:10px;font-size:12px;line-height:1.6;color:rgba(191, 219, 254, 0.88);">Next recommended tutorial: <strong style="color:#eff6ff;">' + recommendedNext.title + '</strong></div>' : ''
            ].filter(Boolean).join('');
            if (this._timingSummary) {
                this._timingSummary.innerHTML = estimate.totalMs
                    ? (hasMeasuredDuration
                        ? '<strong style="display:block;font-size:12px;font-weight:700;color:#bfdbfe;">Benchmarked Duration</strong>' +
                            '<span style="display:block;margin-top:4px;">About ' + durationText + ' based on recent smoke runs for this tutorial.</span>' +
                            '<span style="display:block;margin-top:4px;color:rgba(148, 163, 184, 0.96);">Other tutorials still use the playback-pace estimator until they have benchmarked timings.</span>'
                        : hasObservedDuration
                            ? '<strong style="display:block;font-size:12px;font-weight:700;color:#bfdbfe;">Typical Duration</strong>' +
                                '<span style="display:block;margin-top:4px;">About ' + durationText + ' based on recent real playback of this tutorial.</span>' +
                                '<span style="display:block;margin-top:4px;color:rgba(148, 163, 184, 0.96);">This keeps the listed time closer to what users actually experience during the full walkthrough.</span>'
                        : '<strong style="display:block;font-size:12px;font-weight:700;color:#bfdbfe;">Estimated Duration</strong>' +
                            '<span style="display:block;margin-top:4px;">About ' + durationText + ' at ' + this._getPaceOption().label + ' pace.</span>' +
                            '<span style="display:block;margin-top:4px;color:rgba(148, 163, 184, 0.96);">List timings update with the selected playback pace and actual playback may vary slightly.</span>')
                    : '<strong style="display:block;font-size:12px;font-weight:700;color:#bfdbfe;">Estimated Duration</strong>' +
                        '<span style="display:block;margin-top:4px;">Timing is not available for this tutorial yet.</span>';
            }
            if (this._coverage) {
                this._coverage.innerHTML = coverage.length
                    ? '<strong style="display:block;font-size:12px;font-weight:700;color:#bfdbfe;">Tool Coverage</strong><span style="display:block;margin-top:4px;">' + coverage.join(' · ') + '</span>'
                    : '<strong style="display:block;font-size:12px;font-weight:700;color:#bfdbfe;">Tool Coverage</strong><span style="display:block;margin-top:4px;">This tutorial is organized around a workflow rather than a short tool list.</span>';
            }
            this._refreshVoiceoverInfo(tutorial);
        }

        _setStatus(message) {
            if (this._status) this._status.textContent = message || '';
        }

        _buildShell() {
            this._teardownShell();

            const shell = document.createElement('div');
            shell.id = 'dom-tutorial-shell';
            shell.style.cssText = 'position:fixed;inset:0;z-index:19000;pointer-events:none;';

            const spotlight = document.createElement('div');
            spotlight.style.cssText = [
                'position:fixed',
                'border:2px solid rgba(125, 211, 252, 0.95)',
                'border-radius:18px',
                'background:rgba(14, 165, 233, 0.04)',
                'box-shadow:0 0 0 1px rgba(125, 211, 252, 0.2), 0 10px 28px rgba(14, 165, 233, 0.16), 0 18px 40px rgba(2, 6, 23, 0.14)',
                'transition:all 220ms ease',
                'opacity:0'
            ].join(';');

            const cursor = document.createElement('div');
            cursor.innerHTML = '&#10148;';
            cursor.style.cssText = [
                'position:fixed',
                'left:0',
                'top:0',
                'z-index:2',
                'font-size:30px',
                'line-height:1',
                'color:#f8fafc',
                'text-shadow:0 4px 14px rgba(2, 6, 23, 0.52)',
                'transform:translate(-999px,-999px)',
                'transition:transform 180ms ease, color 140ms ease, font-size 140ms ease'
            ].join(';');

            const surfaceLabel = document.createElement('div');
            surfaceLabel.style.cssText = [
                'position:fixed',
                'left:16px',
                'top:16px',
                'z-index:3',
                'display:inline-flex',
                'align-items:center',
                'justify-content:center',
                'max-width:min(320px, calc(100vw - 32px))',
                'padding:8px 14px',
                'border-radius:999px',
                'background:rgba(15, 23, 42, 0.96)',
                'border:1px solid rgba(125, 211, 252, 0.32)',
                'box-shadow:0 18px 44px rgba(2, 6, 23, 0.34)',
                'color:#e0f2fe',
                'font:800 11px/1 Inter, sans-serif',
                'letter-spacing:0.18em',
                'text-transform:uppercase',
                'pointer-events:none',
                'opacity:0',
                'transform:translateY(8px)',
                'transition:opacity 160ms ease, transform 160ms ease'
            ].join(';');

            const tooltip = document.createElement('div');
            tooltip.style.cssText = [
                'position:fixed',
                'max-width:min(320px, calc(100vw - 24px))',
                'max-height:calc(100vh - 120px)',
                'overflow-y:auto',
                '-webkit-overflow-scrolling:touch',
                'padding:14px 16px',
                'border-radius:16px',
                'background:rgba(15, 23, 42, 0.97)',
                'border:1px solid rgba(125, 211, 252, 0.32)',
                'box-shadow:0 24px 60px rgba(2, 6, 23, 0.38)',
                'color:#eff6ff',
                'font-family:Inter, sans-serif',
                'pointer-events:auto',
                'opacity:0',
                'transform:translateY(10px)',
                'transition:opacity 180ms ease, transform 180ms ease'
            ].join(';');
            tooltip.innerHTML = [
                '<div data-role="tooltip-title" style="font-size:14px;font-weight:800;line-height:1.4;color:#eff6ff;"></div>',
                '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">',
                '<div id="dom-tutorial-badge" style="display:inline-flex;align-items:center;padding:4px 8px;border-radius:999px;background:rgba(14, 165, 233, 0.16);color:#7dd3fc;font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;">Tutorial</div>',
                '<div style="display:inline-flex;align-items:center;gap:8px;">',
                '<button type="button" data-role="tooltip-pause" style="padding:7px 10px;border:none;border-radius:999px;background:rgba(30, 41, 59, 0.96);box-shadow:0 10px 24px rgba(2, 6, 23, 0.24);color:#f8fafc;font:600 12px Inter, sans-serif;cursor:pointer;">Pause</button>',
                '<button type="button" data-role="tooltip-stop" style="padding:7px 10px;border:none;border-radius:999px;background:rgba(30, 41, 59, 0.96);box-shadow:0 10px 24px rgba(2, 6, 23, 0.24);color:#f8fafc;font:600 12px Inter, sans-serif;cursor:pointer;">' + this.stopLabel + '</button>',
                '</div>',
                '</div>',
                '<div style="margin-top:10px;">',
                '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">',
                '<div data-role="tooltip-progress-label" style="font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#bfdbfe;">Tutorial progress</div>',
                '<div data-role="tooltip-progress-meta" style="font-size:11px;line-height:1.4;color:rgba(191, 219, 254, 0.92);"></div>',
                '</div>',
                '<div style="margin-top:8px;height:8px;border-radius:999px;background:rgba(30, 41, 59, 0.94);overflow:hidden;">',
                '<div data-role="tooltip-progress-bar" style="width:0%;height:100%;border-radius:999px;background:linear-gradient(90deg, #38bdf8, #2563eb);transition:width 180ms ease;"></div>',
                '</div>',
                '</div>',
                '<div id="dom-tutorial-text" style="margin-top:10px;font-size:13px;line-height:1.6;color:#e2e8f0;"></div>'
            ].join('');

            const loadingNotice = document.createElement('div');
            loadingNotice.style.cssText = [
                'position:fixed',
                'left:50%',
                'top:50%',
                'z-index:4',
                'display:none',
                'min-width:280px',
                'max-width:min(420px, calc(100vw - 32px))',
                'padding:18px 20px',
                'border-radius:18px',
                'background:rgba(15, 23, 42, 0.97)',
                'border:1px solid rgba(125, 211, 252, 0.34)',
                'box-shadow:0 24px 60px rgba(2, 6, 23, 0.42)',
                'color:#eff6ff',
                'font-family:Inter, sans-serif',
                'transform:translate(-50%, -50%)',
                'text-align:center'
            ].join(';');
            loadingNotice.innerHTML = [
                '<div style="display:inline-flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:999px;background:rgba(14, 165, 233, 0.16);color:#7dd3fc;font-size:18px;"><i class="fas fa-spinner fa-spin"></i></div>',
                '<div style="margin-top:12px;font-size:14px;font-weight:700;color:#e0f2fe;">Loading Tutorial</div>',
                '<div data-role="loading-text" style="margin-top:8px;font-size:13px;line-height:1.6;color:#dbeafe;"></div>'
            ].join('');

            shell.appendChild(spotlight);
            shell.appendChild(cursor);
            shell.appendChild(surfaceLabel);
            shell.appendChild(tooltip);
            shell.appendChild(loadingNotice);
            document.body.appendChild(shell);

            const pauseButton = tooltip.querySelector('[data-role="tooltip-pause"]');
            const stopButton = tooltip.querySelector('[data-role="tooltip-stop"]');
            pauseButton?.addEventListener('click', () => this.togglePause());
            stopButton?.addEventListener('click', () => this.stop());

            this._shell = shell;
            this._cursor = cursor;
            this._setCursorMode('default');
            this._spotlight = spotlight;
            this._surfaceLabel = surfaceLabel;
            this._tooltip = tooltip;
            this._tooltipTitle = tooltip.querySelector('[data-role="tooltip-title"]');
            this._tooltipBadge = tooltip.querySelector('#dom-tutorial-badge');
            this._tooltipProgressLabel = tooltip.querySelector('[data-role="tooltip-progress-label"]');
            this._tooltipProgressMeta = tooltip.querySelector('[data-role="tooltip-progress-meta"]');
            this._tooltipProgressBar = tooltip.querySelector('[data-role="tooltip-progress-bar"]');
            this._tooltipText = tooltip.querySelector('#dom-tutorial-text');
            this._loadingNotice = loadingNotice;
            this._loadingNoticeText = loadingNotice.querySelector('[data-role="loading-text"]');
            this._overlayPauseButton = pauseButton;
            this._stopButton = stopButton;
            this._renderTutorialProgress();
            this._syncPlaybackControls();
        }

        _teardownShell() {
            this._shell?.remove();
            this._shell = null;
            this._cursor = null;
            this._spotlight = null;
            this._surfaceLabel = null;
            this._tooltip = null;
            this._tooltipTitle = null;
            this._tooltipBadge = null;
            this._tooltipProgressLabel = null;
            this._tooltipProgressMeta = null;
            this._tooltipProgressBar = null;
            this._tooltipText = null;
            this._loadingNotice = null;
            this._loadingNoticeText = null;
            this._overlayPauseButton = null;
            this._stopButton = null;
        }

        _syncPlaybackControls() {
            const pauseLabel = this._paused ? 'Resume' : 'Pause';
            const pauseTitle = this._paused ? 'Resume tutorial playback' : 'Pause tutorial playback';
            const nextTutorial = this._getNextTutorial();
            [this._pauseButton, this._overlayPauseButton].forEach(button => {
                if (!button) return;
                button.textContent = pauseLabel;
                button.title = pauseTitle;
                button.disabled = !this._playing;
                button.style.opacity = this._playing ? '1' : '0.6';
            });
            if (this._nextButton) {
                const blocked = this._playing || !nextTutorial;
                this._nextButton.disabled = blocked;
                this._nextButton.style.opacity = blocked ? '0.6' : '1';
                this._nextButton.textContent = nextTutorial ? 'Play Next: ' + nextTutorial.title : 'No Next Tutorial In This Path';
            }
            if (this._preGenerateButton) {
                const blocked = this._playing || this._preGenerating;
                this._preGenerateButton.disabled = blocked;
                this._preGenerateButton.style.opacity = blocked ? '0.6' : '1';
            }
        }

        _setCursorMode(mode = 'default') {
            if (!this._cursor) return;
            const normalized = mode === 'drag'
                ? 'drag'
                : (mode === 'click' ? 'click' : 'default');
            this._cursorMode = normalized;
            this._cursor.dataset.mode = normalized;

            switch (normalized) {
                case 'drag':
                    this._cursor.innerHTML = '&#9757;';
                    this._cursor.style.fontSize = '36px';
                    this._cursor.style.color = '#bfdbfe';
                    break;
                case 'click':
                    this._cursor.innerHTML = '&#9757;';
                    this._cursor.style.fontSize = '34px';
                    this._cursor.style.color = '#f8fafc';
                    break;
                default:
                    this._cursor.innerHTML = '&#10148;';
                    this._cursor.style.fontSize = '30px';
                    this._cursor.style.color = '#f8fafc';
                    break;
            }
        }

        _moveCursorToPoint(x, y) {
            if (!this._cursor || !Number.isFinite(x) || !Number.isFinite(y)) return;
            const mode = this._cursor?.dataset?.mode || this._cursorMode || 'default';
            const offsetX = mode === 'default' ? -4 : -10;
            const offsetY = mode === 'drag' ? -26 : (mode === 'click' ? -24 : -4);
            const rotation = mode === 'drag' ? '-10deg' : (mode === 'click' ? '-8deg' : '0deg');
            const scale = mode === 'drag' ? '1.08' : '1';
            this._cursor.style.transform = 'translate(' + (x + offsetX) + 'px,' + (y + offsetY) + 'px) rotate(' + rotation + ') scale(' + scale + ')';
        }

        _moveCursor(element) {
            if (!this._cursor || !element) return;
            const rect = element.getBoundingClientRect();
            const x = rect.left + rect.width * 0.5 - 4;
            const y = rect.top + rect.height * 0.5 - 4;
            this._moveCursorToPoint(x, y);
        }

        _normalizeGesturePoint(point, element = null) {
            if (Array.isArray(point) && point.length >= 2) {
                const x = Number(point[0]);
                const y = Number(point[1]);
                return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
            }

            if (point && Number.isFinite(point.x) && Number.isFinite(point.y)) {
                return { x: Number(point.x), y: Number(point.y) };
            }

            if (point && Number.isFinite(point.stageX) && Number.isFinite(point.stageY) && typeof window.app?.stage?.stageToScreen === 'function') {
                return window.app.stage.stageToScreen(Number(point.stageX), Number(point.stageY));
            }

            if (point?.selector) {
                const target = document.querySelector(point.selector);
                if (!target) return null;
                const rect = target.getBoundingClientRect();
                const anchorX = Number.isFinite(point.anchorX) ? Number(point.anchorX) : 0.5;
                const anchorY = Number.isFinite(point.anchorY) ? Number(point.anchorY) : 0.5;
                const offsetX = Number(point.offsetX) || 0;
                const offsetY = Number(point.offsetY) || 0;
                return {
                    x: rect.left + rect.width * anchorX + offsetX,
                    y: rect.top + rect.height * anchorY + offsetY
                };
            }

            if (element) {
                const rect = element.getBoundingClientRect();
                return {
                    x: rect.left + rect.width * 0.5,
                    y: rect.top + rect.height * 0.5
                };
            }

            return null;
        }

        _interpolateGesturePoint(points, progress) {
            if (!Array.isArray(points) || points.length === 0) return null;
            if (points.length === 1) return points[0];

            const segments = [];
            let totalLength = 0;
            for (let index = 1; index < points.length; index++) {
                const start = points[index - 1];
                const end = points[index];
                const length = Math.hypot(end.x - start.x, end.y - start.y);
                segments.push({ start, end, length });
                totalLength += length;
            }

            if (totalLength <= 0.001) return points[points.length - 1];

            let remaining = totalLength * Math.min(Math.max(progress, 0), 1);
            for (const segment of segments) {
                if (remaining <= segment.length || segment === segments[segments.length - 1]) {
                    const ratio = segment.length <= 0.001 ? 1 : remaining / segment.length;
                    return {
                        x: segment.start.x + (segment.end.x - segment.start.x) * ratio,
                        y: segment.start.y + (segment.end.y - segment.start.y) * ratio
                    };
                }
                remaining -= segment.length;
            }

            return points[points.length - 1];
        }

        _showGestureTrail(points, cursorMode = 'drag') {
            if (!this._shell || !Array.isArray(points) || points.length < 2) return [];
            const stroke = cursorMode === 'drag'
                ? 'rgba(191, 219, 254, 0.92)'
                : 'rgba(125, 211, 252, 0.92)';

            const trails = [];
            for (let index = 1; index < points.length; index++) {
                const start = points[index - 1];
                const end = points[index];
                const length = Math.hypot(end.x - start.x, end.y - start.y);
                if (length <= 4) continue;

                const angle = Math.atan2(end.y - start.y, end.x - start.x) * 180 / Math.PI;
                const trail = document.createElement('div');
                trail.style.cssText = [
                    'position:fixed',
                    'left:' + start.x + 'px',
                    'top:' + (start.y - 2) + 'px',
                    'width:' + length + 'px',
                    'height:4px',
                    'border-radius:999px',
                    'background:linear-gradient(90deg, rgba(125, 211, 252, 0), ' + stroke + ')',
                    'box-shadow:0 0 0 1px rgba(125, 211, 252, 0.12), 0 0 18px rgba(125, 211, 252, 0.26)',
                    'opacity:0.88',
                    'transform-origin:left center',
                    'transform:rotate(' + angle + 'deg)',
                    'transition:opacity 180ms ease',
                    'pointer-events:none'
                ].join(';');
                this._shell.appendChild(trail);
                trails.push(trail);
            }
            return trails;
        }

        _spotlightElement(element, pad = 10) {
            if (!this._spotlight || !element) return;
            const rect = element.getBoundingClientRect();
            this._spotlight.style.left = (rect.left - pad) + 'px';
            this._spotlight.style.top = (rect.top - pad) + 'px';
            this._spotlight.style.width = (rect.width + pad * 2) + 'px';
            this._spotlight.style.height = (rect.height + pad * 2) + 'px';
            this._spotlight.style.opacity = '1';
        }

        _getTooltipOverlapArea(rectA, rectB) {
            if (!rectA || !rectB) return 0;
            const overlapWidth = Math.max(0, Math.min(rectA.right, rectB.right) - Math.max(rectA.left, rectB.left));
            const overlapHeight = Math.max(0, Math.min(rectA.bottom, rectB.bottom) - Math.max(rectA.top, rectB.top));
            return overlapWidth * overlapHeight;
        }

        _normalizeTooltipPlacementKey(value = '') {
            const normalized = String(value || '').trim().toLowerCase().replace(/[\s_]+/g, '-');
            switch (normalized) {
                case 'top-left':
                case 'corner-top-left':
                    return 'corner-top-left';
                case 'top-right':
                case 'corner-top-right':
                    return 'corner-top-right';
                case 'bottom-left':
                case 'corner-bottom-left':
                    return 'corner-bottom-left';
                case 'bottom-right':
                case 'corner-bottom-right':
                    return 'corner-bottom-right';
                case 'top':
                case 'bottom':
                case 'left':
                case 'right':
                    return normalized;
                default:
                    return '';
            }
        }

        _resolveTooltipPlacement(step = null, tutorial = null) {
            const stepPlacement = this._normalizeTooltipPlacementKey(step?.tooltipPlacement);
            if (stepPlacement) return stepPlacement;
            return this._normalizeTooltipPlacementKey(tutorial?.tooltipPlacement);
        }

        _pickTooltipPosition(elementRect, tooltipWidth, tooltipHeight, margin, options = {}) {
            const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
            const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
            const lockedPlacement = this._normalizeTooltipPlacementKey(options.placement);

            const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
            const buildRect = (left, top) => ({
                left,
                top,
                right: left + tooltipWidth,
                bottom: top + tooltipHeight
            });

            const candidates = [
                { left: margin, top: margin, kind: 'corner-top-left' },
                { left: viewportWidth - tooltipWidth - margin, top: margin, kind: 'corner-top-right' },
                { left: margin, top: viewportHeight - tooltipHeight - margin, kind: 'corner-bottom-left' },
                { left: viewportWidth - tooltipWidth - margin, top: viewportHeight - tooltipHeight - margin, kind: 'corner-bottom-right' }
            ];

            if (elementRect) {
                candidates.push(
                    {
                        left: elementRect.right + margin,
                        top: clamp(elementRect.top, margin, viewportHeight - tooltipHeight - margin),
                        kind: 'right'
                    },
                    {
                        left: elementRect.left - tooltipWidth - margin,
                        top: clamp(elementRect.top, margin, viewportHeight - tooltipHeight - margin),
                        kind: 'left'
                    },
                    {
                        left: clamp(elementRect.left, margin, viewportWidth - tooltipWidth - margin),
                        top: elementRect.bottom + margin,
                        kind: 'bottom'
                    },
                    {
                        left: clamp(elementRect.left, margin, viewportWidth - tooltipWidth - margin),
                        top: elementRect.top - tooltipHeight - margin,
                        kind: 'top'
                    }
                );
            }

            const scoringCandidates = lockedPlacement
                ? candidates.filter(candidate => candidate.kind === lockedPlacement)
                : candidates;
            const candidatesToScore = scoringCandidates.length ? scoringCandidates : candidates;

            let bestCandidate = {
                left: margin,
                top: margin,
                score: Number.POSITIVE_INFINITY
            };

            const paddedElementRect = elementRect ? {
                left: elementRect.left - 18,
                top: elementRect.top - 18,
                right: elementRect.right + 18,
                bottom: elementRect.bottom + 18
            } : null;

            candidatesToScore.forEach(candidate => {
                const left = clamp(candidate.left, margin, viewportWidth - tooltipWidth - margin);
                const top = clamp(candidate.top, margin, viewportHeight - tooltipHeight - margin);
                const rect = buildRect(left, top);

                const overlapWithTarget = paddedElementRect ? this._getTooltipOverlapArea(rect, paddedElementRect) : 0;
                const distancePenalty = elementRect
                    ? Math.hypot(
                        (rect.left + rect.right) * 0.5 - (elementRect.left + elementRect.right) * 0.5,
                        (rect.top + rect.bottom) * 0.5 - (elementRect.top + elementRect.bottom) * 0.5
                    ) * -0.02
                    : 0;

                const score = overlapWithTarget * 10 + distancePenalty;
                if (score < bestCandidate.score) {
                    bestCandidate = { left, top, score };
                }
            });

            return bestCandidate;
        }

        _showTooltip(stepIndex, totalSteps, text, element, step = null, tutorial = null) {
            if (!this._tooltip || !this._tooltipBadge || !this._tooltipText) return;
            this._tooltipBadge.textContent = 'Step ' + (stepIndex + 1) + ' / ' + totalSteps;
            this._tooltipText.textContent = text || '';

            const margin = 16;
            this._tooltip.style.left = margin + 'px';
            this._tooltip.style.top = margin + 'px';
            this._tooltip.style.opacity = '0';
            this._tooltip.style.transform = 'translateY(10px)';

            const tooltipWidth = Math.min(this._tooltip.offsetWidth || 320, window.innerWidth - margin * 2);
            const tooltipHeight = Math.min(this._tooltip.offsetHeight || 120, window.innerHeight - margin * 2);
            const targetRect = element ? element.getBoundingClientRect() : null;
            const position = this._pickTooltipPosition(targetRect, tooltipWidth, tooltipHeight, margin, {
                placement: this._resolveTooltipPlacement(step, tutorial)
            });

            this._tooltip.style.left = Math.max(margin, position.left) + 'px';
            this._tooltip.style.top = Math.max(margin, position.top) + 'px';
            this._tooltip.style.opacity = '1';
            this._tooltip.style.transform = 'translateY(0)';
        }

        _showClickRipple(x, y) {
            if (!this._shell) return;
            const ripple = document.createElement('div');
            ripple.style.cssText = [
                'position:fixed',
                'left:' + (x - 16) + 'px',
                'top:' + (y - 16) + 'px',
                'width:32px',
                'height:32px',
                'border-radius:999px',
                'border:2px solid rgba(125, 211, 252, 0.92)',
                'background:rgba(125, 211, 252, 0.16)',
                'transform:scale(0.35)',
                'opacity:1',
                'transition:transform 260ms ease, opacity 260ms ease'
            ].join(';');
            this._shell.appendChild(ripple);
            requestAnimationFrame(() => {
                ripple.style.transform = 'scale(1.6)';
                ripple.style.opacity = '0';
            });
            setTimeout(() => ripple.remove(), 280);
        }

        _showCompletion(message) {
            if (window.Utils?.showToast) {
                window.Utils.showToast(message, 'success');
                return;
            }
            this._setStatus(message);
        }
    }

    window.DomTutorialRunner = DomTutorialRunner;
})();
