/* ============================================
   Animation Stage - Timeline System
   Timeline UI, keyframes, playhead, scrubbing
   ============================================ */

class TimelineManager {
    constructor(stageManager, objectManager, animationEngine) {
        this.stage = stageManager;
        this.objects = objectManager;
        this.animations = animationEngine;
        
        this.pixelsPerSecond = 100;
        this.defaultPixelsPerSecond = 100;
        this.minPixelsPerSecond = 20;
        this.maxPixelsPerSecond = 500;
        this.zoomStep = 1.25;
        this.scrollOffset = 0;
        this.isResizing = false;
        this.isDraggingPlayhead = false;
        this.currentTime = 0;
        this.selectedAnimId = null;
        this.selectedAnimObjId = null;
        this.selectedAnimKeys = new Set();
        this.lastSelectedAnimKey = null;
        this.bulkShiftSelection = new Set();
        this.bulkShiftLocked = false;
        this.sequenceOrderMap = {};
        this.isDraggingBulkShift = false;
        this.bulkShiftDragData = null;
        this.isDraggingBarMarquee = false;
        this.barMarqueeData = null;
        this.pendingTrackPointer = null;

        // Bar/keyframe drag state
        this.isDraggingBar = false;
        this.isDraggingKeyframe = false;
        this.dragBarData = null;  // { animId, objId, startX, origDelay }
        this.dragKfData = null;   // { animId, objId, edge: 'start'|'end', startX, origDelay, origDuration }

        // Track visibility & collapse state (persists across rebuilds)
        this.collapsedTracks = new Set(); // obj IDs with collapsed lanes
        this.hiddenTracks = new Set();    // obj IDs hidden from view

        // Animation bar clipboard for copy/paste
        this._copiedAnim = null; // { animData, sourceObjId }

        // Range markers for in/out point editing
        this._rangeInMs = null;
        this._rangeOutMs = null;
        this.markerSnapEnabled = this._loadMarkerSnapPreference();
        this.recordOrderMode = 'same';
        
        this.init();
    }

    init() {
        this.buildRuler();
        this.bindEvents();
        this.bindTimelineResize();
        this.bindZoomControls();
        this.bindScrollSync();

        // Listen for updates
        eventBus.on('timeline:update', () => this.update());
        eventBus.on('timeline:time', (time) => this.updatePlayhead(time));
        eventBus.on('object:added', () => this.update());
        eventBus.on('object:removed', () => this.update());
        eventBus.on('selection:changed', () => this.update());
        eventBus.on('camera:keyframes-changed', () => this.update());
        eventBus.on('timeline:markers-updated', (markers) => {
            this.markers = Array.isArray(markers) ? markers : this.markers;
            this.update();
        });
        document.getElementById('tl-marker-snap')?.addEventListener('click', () => {
            this.markerSnapEnabled = !this.markerSnapEnabled;
            try { localStorage.setItem('animation-stage-marker-snap', String(this.markerSnapEnabled)); } catch (_) {}
            this._syncMarkerSnapButton();
            Utils.showToast(`Marker snapping ${this.markerSnapEnabled ? 'enabled' : 'disabled'}.`, 'info');
        });
        this._syncMarkerSnapButton();
    }

    getBarVisualMeta(anim = {}, config = {}) {
        const type = String(config.type || anim.type || '').toLowerCase();
        const name = String(anim.name || type || '').toLowerCase();
        if (type === 'audio-lip-sync' && config.audioRefreshRequired === true) {
            return { kind: 'audio-stale', icon: 'fa-rotate' };
        }
        if (type === 'audio-lip-sync') return { kind: 'audio', icon: 'fa-wave-square' };
        const effectTypes = ['shoot-pellets', 'break-apart', 'ripple-wave', 'sparkle-burst', 'echo-trail', 'glow-aura', 'focus-pulse', 'confetti-burst', 'orbit-swarm', 'smoke-puff', 'lightning-arc', 'magnet-pull', 'scan-beam', 'lens-flare', 'pixel-burst', 'impact-burst', 'wave-distort', 'liquid-motion', 'melt-drip', 'brush-reveal', 'swirl-tornado', 'fire-flicker', 'dust-away', 'freeze-crack', 'neon-trace', 'shadow-pop', 'explosion-smoke', 'paint-stroke', 'chromatic-glitch', 'shockwave-ring', 'magic-portal', 'glass-shatter', 'electric-charge', 'ink-bleed', 'motion-smear', 'stage-shake', 'mask-reveal', 'path-trail', 'particle-fountain', 'light-sweep', 'weather-effect', 'bubble-rise', 'meteor-shower', 'spotlight-sweep', 'radial-rays', 'outline-pulse', 'speed-lines', 'starfield-warp', 'color-wash', 'halo-burst', 'shadow-cast', 'energy-shield', 'magnify-lens', 'rainbow-arc', 'vignette-pulse', 'scan-grid', 'card-turn', 'page-turn', 'flap-swing'];
        if (effectTypes.includes(type) || name.includes('burst') || name.includes('liquid') || name.includes('melt') || name.includes('reveal')) {
            return { kind: 'effect', icon: 'fa-wand-magic-sparkles' };
        }
        if (type.startsWith('entry') || name.includes(' in')) return { kind: 'entry', icon: 'fa-sign-in-alt' };
        if (type.startsWith('exit') || name.includes(' out')) return { kind: 'exit', icon: 'fa-sign-out-alt' };
        if (type.includes('scale') || type.includes('rotation') || ['spin', 'flip', 'grow', 'shrink'].some(token => name.includes(token))) {
            return { kind: 'transform', icon: 'fa-sync-alt' };
        }
        if (type.includes('emph') || ['pulse', 'shake', 'flash', 'wobble', 'bounce'].some(token => name.includes(token))) {
            return { kind: 'emphasis', icon: 'fa-bolt' };
        }
        return { kind: 'movement', icon: 'fa-route' };
    }

    _getAudioLipSyncConfig(anim = {}) {
        const configs = Array.isArray(anim.generated) ? anim.generated : [anim.generated];
        return configs.find(config => config?.type === 'audio-lip-sync') || null;
    }

    _openAudioLipSyncAnimation(anim = {}) {
        const config = this._getAudioLipSyncConfig(anim);
        const audioId = String(config?.audioId || anim?.params?.audioId || '');
        if (!audioId) {
            Utils.showToast('This lip-sync clip is not linked to an audio track', 'warning');
            return false;
        }
        const opened = window.app?.audioTimeline?._launchLipSyncForTrack?.(audioId) === true;
        if (!opened) Utils.showToast('The linked audio track is unavailable', 'warning');
        return opened;
    }

    buildRuler() {
        const ruler = document.getElementById('timeline-ruler');
        if (!ruler) return;
        
        const totalSeconds = Math.ceil(this.animations.totalDuration / 1000);
        const totalWidth = totalSeconds * this.pixelsPerSecond;
        ruler.style.width = totalWidth + 'px';
        ruler.innerHTML = '';

        const canvas = document.createElement('canvas');
        canvas.width = totalWidth;
        canvas.height = 24;
        canvas.style.width = totalWidth + 'px';
        canvas.style.height = '24px';
        
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#1e1e32';
        ctx.fillRect(0, 0, totalWidth, 24);
        
        // Draw time markers
        for (let s = 0; s <= totalSeconds; s++) {
            const x = s * this.pixelsPerSecond;
            
            // Major tick at each second
            ctx.strokeStyle = '#3a3a5c';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, 14);
            ctx.lineTo(x, 24);
            ctx.stroke();
            
            ctx.fillStyle = '#a0a0b8';
            ctx.font = '10px Inter';
            ctx.textAlign = 'center';
            ctx.fillText(`${s}s`, x, 11);
            
            // Minor ticks (every 100ms)
            for (let i = 1; i < 10; i++) {
                const mx = x + (i * this.pixelsPerSecond / 10);
                ctx.strokeStyle = '#2a2a45';
                ctx.beginPath();
                ctx.moveTo(mx, i % 5 === 0 ? 16 : 19);
                ctx.lineTo(mx, 24);
                ctx.stroke();
            }
        }

        // Stage camera keyframe markers (yellow diamonds along the ruler)
        const stage = window.app?.stage;
        const camKfs = Array.isArray(stage?.cameraKeyframes) ? stage.cameraKeyframes : [];
        if (camKfs.length) {
            camKfs.forEach((kf) => {
                const cx = (kf.time / 1000) * this.pixelsPerSecond;
                if (cx < 0 || cx > totalWidth) return;
                const cy = 6;
                const r = 5;
                ctx.save();
                ctx.fillStyle = '#facc15';
                ctx.strokeStyle = '#92400e';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(cx, cy - r);
                ctx.lineTo(cx + r, cy);
                ctx.lineTo(cx, cy + r);
                ctx.lineTo(cx - r, cy);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            });
            // Make ruler interactive for camera markers (click jumps, drag retimes)
            this._wireCameraMarkerInteractions(canvas, camKfs);
        }

        ruler.appendChild(canvas);
    }

    _wireCameraMarkerInteractions(canvas, camKfs) {
        const HIT_R = 8;
        const stage = window.app?.stage;
        const findKfAt = (mouseX) => {
            for (let i = 0; i < camKfs.length; i++) {
                const cx = (camKfs[i].time / 1000) * this.pixelsPerSecond;
                if (Math.abs(mouseX - cx) <= HIT_R) return i;
            }
            return -1;
        };
        canvas.style.pointerEvents = 'auto';
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            if (rect.width === 0) return;
            const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
            const my = (e.clientY - rect.top) * (canvas.height / rect.height);
            if (my <= 12 && findKfAt(mx) >= 0) {
                if(camKfs[findKfAt(mx)].choreographyId || camKfs[findKfAt(mx)].characterCameraId){canvas.style.cursor='pointer';canvas.title='Generated camera shot: click to jump; edit through Camera or Scene Choreography';return;}
                canvas.style.cursor = 'ew-resize';
                canvas.title = 'Camera keyframe — click to jump, drag to retime, shift+click to delete';
            } else {
                canvas.style.cursor = '';
                canvas.title = '';
            }
        });
        canvas.addEventListener('mousedown', (e) => {
            const rect = canvas.getBoundingClientRect();
            if (rect.width === 0) return;
            const mx0 = (e.clientX - rect.left) * (canvas.width / rect.width);
            const my0 = (e.clientY - rect.top) * (canvas.height / rect.height);
            if (my0 > 12) return;
            const idx = findKfAt(mx0);
            if (idx < 0) return;
            e.stopPropagation();
            e.preventDefault();
            if(camKfs[idx].choreographyId || camKfs[idx].characterCameraId){
                this.animations.currentTime=camKfs[idx].time;
                eventBus.emit('timeline:time',camKfs[idx].time);eventBus.emit('timeline:scrub',camKfs[idx].time);
                if(e.shiftKey)Utils.showToast('Edit generated shots through Camera or Scene Choreography.','warning');
                return;
            }
            if (e.shiftKey) {
                const realIdx = stage.cameraKeyframes.indexOf(camKfs[idx]);
                if (realIdx >= 0) stage.cameraKeyframes.splice(realIdx, 1);
                eventBus.emit?.('camera:keyframes-changed');
                eventBus.emit?.('history:push');
                Utils?.showToast?.('Camera keyframe deleted', 'info');
                window.app?.stageCamera?._refreshPanel?.();
                stage.requestRender?.();
                return;
            }
            // Capture stable references — DO NOT rely on canvas rect after drag
            // because the ruler may rebuild and detach the canvas.
            const kf = camKfs[idx];
            const startClientX = e.clientX;
            const startTime = kf.time;
            const pps = this.pixelsPerSecond;
            const totalDur = this.animations.totalDuration;
            let moved = false, blocked = false;

            // Initial jump-to-time on click (so a pure click without movement
            // still scrubs the playhead).
            this.animations.currentTime = startTime;
            eventBus.emit?.('timeline:time', startTime);
            eventBus.emit?.('timeline:scrub', startTime);

            const onMove = (mv) => {
                const dxPx = mv.clientX - startClientX;
                if (!moved && Math.abs(dxPx) < 3) return; // dead zone
                moved = true;
                const dtMs = (dxPx / pps) * 1000;
                const newTime = Math.max(0, Math.min(totalDur, Math.round(startTime + dtMs)));
                if(window.app?.stageCamera?._manualCameraTimeAllowed?.(newTime,kf,false)===false){blocked=true;return;}
                blocked=false;
                kf.time = newTime;
                this.animations.currentTime = newTime;
                eventBus.emit?.('timeline:time', newTime);
                window.app?.stageCamera?._refreshPanel?.();
                stage.requestRender?.();
            };
            const onUp = () => {
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onUp);
                if(blocked)Utils.showToast('Camera sections cannot overlap. The marker stayed at its last valid time.','warning');
                if (moved) {
                    stage.cameraKeyframes.sort((a, b) => a.time - b.time);
                    eventBus.emit?.('camera:keyframes-changed');
                    eventBus.emit?.('history:push');
                }
            };
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
        });
    }

    bindEvents() {
        // Playback controls
        document.getElementById('tl-play')?.addEventListener('click', () => {
            this.animations.playAll();
        });
        document.getElementById('tl-stop')?.addEventListener('click', () => {
            this.animations.stop();
        });
        document.getElementById('tl-start')?.addEventListener('click', () => {
            this.jumpToStart();
        });
        document.getElementById('tl-end')?.addEventListener('click', () => {
            this.jumpToEnd();
        });
        document.getElementById('tl-loop')?.addEventListener('click', (e) => {
            this.animations.looping = !this.animations.looping;
            e.currentTarget.style.color = this.animations.looping ? '#6366f1' : '';
        });
        document.getElementById('tl-record')?.addEventListener('click', (e) => {
            this.toggleRecording(e.currentTarget);
        });

        // Continuous recording button
        document.getElementById('tl-record-continuous')?.addEventListener('click', (e) => {
            this.toggleContinuousRecording(e.currentTarget);
        });

        document.querySelectorAll('[data-record-order]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setRecordOrderMode(btn.dataset.recordOrder || 'same');
            });
        });

        // Delete selected animation in timeline
        document.getElementById('tl-delete-anim')?.addEventListener('click', () => {
            if (this.selectedAnimId && this.selectedAnimObjId) {
                this.deleteAnimation(this.selectedAnimObjId, this.selectedAnimId);
            } else {
                Utils.showToast('Click an animation bar in the timeline first', 'warning');
            }
        });
        document.getElementById('tl-copy-all-anims')?.addEventListener('click', () => {
            this.copyAllAnimations();
        });
        document.getElementById('tl-group-actions')?.addEventListener('click', (e) => {
            this._showSelectedBarsGroupMenu(e);
        });
        document.getElementById('tl-clear-all')?.addEventListener('click', () => {
            this.clearAllAnimations();
        });

        // Undo/Redo in timeline toolbar
        document.getElementById('tl-undo')?.addEventListener('click', () => {
            if (window.app?.history) window.app.history.undo();
        });
        document.getElementById('tl-redo')?.addEventListener('click', () => {
            if (window.app?.history) window.app.history.redo();
        });

        // Range marker buttons
        document.getElementById('tl-range-in')?.addEventListener('click', () => this.setRangeIn());
        document.getElementById('tl-range-out')?.addEventListener('click', () => this.setRangeOut());
        document.getElementById('tl-range-delete')?.addEventListener('click', () => this.deleteRange());
        document.getElementById('tl-range-clear')?.addEventListener('click', () => this.clearRange());

        // Delete key to remove selected animation
        document.addEventListener('keydown', (e) => {
            if (e.target.matches('input, textarea, select, [contenteditable]')) return;

            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (this._getSelectedAnimationTargets().length > 1) {
                    e.preventDefault();
                    this.deleteSelectedAnimations();
                } else if (this.selectedAnimId && this.selectedAnimObjId) {
                    e.preventDefault();
                    this.deleteAnimation(this.selectedAnimObjId, this.selectedAnimId);
                }
            }

            // Copy animation bar: Ctrl/Cmd+C (when a bar is selected)
            if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
                if (this._getSelectedAnimationTargets().length > 1) {
                    e.preventDefault();
                    this.copySelectedAnimations();
                } else if (this.selectedAnimId && this.selectedAnimObjId) {
                    e.preventDefault();
                    this.copyAnimation(this.selectedAnimObjId, this.selectedAnimId);
                }
            }

            // Paste animation bar: Ctrl/Cmd+V (onto selected object at playhead)
            if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
                if (this._copiedAnim) {
                    e.preventDefault();
                    this.pasteAnimation();
                }
            }

            // Duplicate animation bar: Ctrl/Cmd+D (when a bar is selected)
            if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
                if (this._getSelectedAnimationTargets().length > 1) {
                    e.preventDefault();
                    this.duplicateSelectedAnimations();
                } else if (this.selectedAnimId && this.selectedAnimObjId) {
                    e.preventDefault();
                    this.duplicateAnimation(this.selectedAnimObjId, this.selectedAnimId);
                }
            }

            // Timeline zoom shortcuts: + / - (also = for unshifted +)
            if (e.key === '+' || e.key === '=') {
                e.preventDefault();
                this.zoomIn();
            }
            if (e.key === '-' || e.key === '_') {
                e.preventDefault();
                this.zoomOut();
            }
            // 0 to reset zoom
            if (e.key === '0' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                this.zoomReset();
            }

            // Range markers: I = In, O = Out
            if (e.key === 'i' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                this.setRangeIn();
            }
            if (e.key === 'o' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                this.setRangeOut();
            }
            // Escape clears range markers
            if (e.key === 'Escape') {
                if (this._rangeInMs != null || this._rangeOutMs != null) {
                    this.clearRange();
                }
            }
            // S = split selected animation at playhead
            if (e.key === 's' && !e.ctrlKey && !e.metaKey) {
                if (this.selectedAnimId && this.selectedAnimObjId) {
                    e.preventDefault();
                    this.splitAnimation(this.selectedAnimObjId, this.selectedAnimId, this.animations.currentTime);
                }
            }
        });

        // Navigate between animations (prev / next)
        document.getElementById('tl-prev-anim')?.addEventListener('click', () => {
            this.jumpToAdjacentAnimation(-1);
        });
        document.getElementById('tl-next-anim')?.addEventListener('click', () => {
            this.jumpToAdjacentAnimation(1);
        });

        // Speed control
        document.getElementById('tl-speed-select')?.addEventListener('change', (e) => {
            this.animations.playbackSpeed = parseFloat(e.target.value);
        });

        // FPS control
        document.getElementById('tl-fps-select')?.addEventListener('change', (e) => {
            // FPS is used for export
        });

        // Timeline duration click-to-edit
        const durLabel = document.getElementById('tl-duration');
        const durInput = document.getElementById('tl-duration-input');
        if (durLabel && durInput) {
            durLabel.addEventListener('click', () => {
                durInput.value = Math.ceil(this.animations.minDuration / 1000);
                durLabel.classList.add('hidden');
                durInput.classList.remove('hidden');
                durInput.focus();
                durInput.select();
            });
            const commitDuration = () => {
                const newSec = Math.max(1, Math.min(600, parseInt(durInput.value) || 5));
                this.animations.minDuration = newSec * 1000;
                durInput.classList.add('hidden');
                durLabel.classList.remove('hidden');
                this.update();
            };
            durInput.addEventListener('blur', commitDuration);
            durInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); commitDuration(); }
                if (e.key === 'Escape') {
                    durInput.classList.add('hidden');
                    durLabel.classList.remove('hidden');
                }
            });
        }

        // Auto-return button
        document.getElementById('tl-auto-return')?.addEventListener('click', (e) => {
            this.animations.autoReturn = !this.animations.autoReturn;
            e.currentTarget.classList.toggle('active', this.animations.autoReturn);
            const msg = this.animations.autoReturn
                ? 'Auto-return ON: playhead returns to start after last animation'
                : 'Auto-return OFF: playhead runs through full timeline';
            Utils.showToast(msg, 'info');
        });

        // Playhead dragging on ruler
        const ruler = document.getElementById('timeline-ruler');
        if (ruler) {
            ruler.addEventListener('mousedown', (e) => {
                this.isDraggingPlayhead = true;
                this.scrubToPosition(e);
            });
        }

        // Track area click for playhead
        const trackArea = document.getElementById('timeline-track-area');
        if (trackArea) {
            trackArea.addEventListener('mousedown', (e) => {
                const onEmptyTrack = (e.target === trackArea || !!e.target.closest('.timeline-track'))
                    && !e.target.closest('.timeline-bar, .timeline-keyframe, .tl-bulk-shift-rail, .tl-marker-pin');
                if (!onEmptyTrack) return;
                this.pendingTrackPointer = {
                    startX: e.clientX,
                    startY: e.clientY,
                    additive: !!(e.shiftKey || e.ctrlKey || e.metaKey),
                    toggle: !!(e.ctrlKey || e.metaKey),
                    baseKeys: new Set(this.selectedAnimKeys)
                };
            });
        }

        document.addEventListener('mousemove', (e) => {
            if (this.pendingTrackPointer && !this.isDraggingBarMarquee) {
                const dx = Math.abs(e.clientX - this.pendingTrackPointer.startX);
                const dy = Math.abs(e.clientY - this.pendingTrackPointer.startY);
                if (dx > 4 || dy > 4) {
                    this._beginTimelineBarMarquee(e);
                }
            }
            if (this.isDraggingBarMarquee) {
                this._handleTimelineBarMarqueeDrag(e);
            } else if (this.isDraggingPlayhead) {
                this.scrubToPosition(e);
            } else if (this.isDraggingBulkShift) {
                if (!this._dragRafPending) {
                    this._dragRafPending = true;
                    this._lastDragEvent = e;
                    requestAnimationFrame(() => {
                        this._dragRafPending = false;
                        if (this.isDraggingBulkShift) this.handleBulkShiftDrag(this._lastDragEvent);
                    });
                } else {
                    this._lastDragEvent = e;
                }
            } else if (this.isDraggingBar) {
                if (!this._dragRafPending) {
                    this._dragRafPending = true;
                    this._lastDragEvent = e;
                    requestAnimationFrame(() => {
                        this._dragRafPending = false;
                        if (this.isDraggingBar) this.handleBarDrag(this._lastDragEvent);
                    });
                } else {
                    this._lastDragEvent = e;
                }
            } else if (this.isDraggingKeyframe) {
                if (!this._dragRafPending) {
                    this._dragRafPending = true;
                    this._lastDragEvent = e;
                    requestAnimationFrame(() => {
                        this._dragRafPending = false;
                        if (this.isDraggingKeyframe) this.handleKeyframeDrag(this._lastDragEvent);
                    });
                } else {
                    this._lastDragEvent = e;
                }
            }
        });

        document.addEventListener('mouseup', (event) => {
            if (this.isDraggingPlayhead) {
                this.isDraggingPlayhead = false;
            }
            if (this.isDraggingBarMarquee) {
                this._finishTimelineBarMarquee();
            } else if (this.pendingTrackPointer) {
                this.scrubToPosition({
                    clientX: this.pendingTrackPointer.startX,
                    clientY: this.pendingTrackPointer.startY
                });
            }
            this.pendingTrackPointer = null;
            if (this.isDraggingBulkShift) {
                this.isDraggingBulkShift = false;
                this.bulkShiftDragData = null;
                this._removeDragTooltip();
                document.body.style.cursor = '';
                eventBus.emit('history:push');
                this.update();
            }
            if (this.isDraggingBar) {
                // Selecting the actor can replace the timeline DOM between press and release.
                const drag = this.dragBarData;
                const released = event.target.closest?.('.timeline-bar');
                const edit3D = event.button === 0 && !event.ctrlKey && !event.shiftKey && !event.metaKey &&
                    this.selectedAnimKeys.size <= 1 && released?.dataset.animId === drag?.animId &&
                    released?.dataset.objId === drag?.objId &&
                    Math.abs(event.clientX - this._barDragStartX) <= 3 && Math.abs(event.clientY - this._barDragStartY) <= 3 &&
                    drag.edit3D;
                this.isDraggingBar = false;
                this.dragBarData = null;
                this._removeDragTooltip();
                document.body.style.cursor = '';
                eventBus.emit('history:push');
                this.update();
                if (edit3D) this._openAnimationSettings(drag.objId,drag.animId);
            }
            if (this.isDraggingKeyframe) {
                this.isDraggingKeyframe = false;
                this.dragKfData = null;
                this._removeDragTooltip();
                document.body.style.cursor = '';
                eventBus.emit('history:push');
                this.update();
            }
        });
    }

    bindScrollSync() {
        const labels = document.getElementById('timeline-labels');
        const tracks = document.getElementById('timeline-tracks');
        if (!labels || !tracks) return;

        let syncingSource = null;

        const syncScrollTop = (source, target, sourceName) => {
            if (syncingSource && syncingSource !== sourceName) return;
            if (target.scrollTop === source.scrollTop) return;

            syncingSource = sourceName;
            target.scrollTop = source.scrollTop;
            requestAnimationFrame(() => {
                if (syncingSource === sourceName) syncingSource = null;
            });
        };

        labels.addEventListener('scroll', () => {
            syncScrollTop(labels, tracks, 'labels');
        }, { passive: true });

        tracks.addEventListener('scroll', () => {
            syncScrollTop(tracks, labels, 'tracks');
        }, { passive: true });
    }

    scrubToPosition(e) {
        const tracks = document.getElementById('timeline-tracks');
        if (!tracks) return;
        
        const rect = tracks.getBoundingClientRect();
        const x = e.clientX - rect.left + tracks.scrollLeft;
        const rawTime = Utils.clamp((x / this.pixelsPerSecond) * 1000, 0, this.animations.totalDuration);
        const time = this._snapToMarker(rawTime);
        
        this.animations.currentTime = time;
        this.animations._preserveFinalPose = false;

        if (!this.animations.isPlaying) {
            this.animations._cancelAllPreviews?.();
            if (this.animations.previewTimelineAt) {
                this.animations.previewTimelineAt(time);
            } else {
                this.animations.applyAnimationsAtTime(time, { timelinePreview: true });
                this.stage.requestRender();
            }
        }
        
        this.updatePlayhead(time);
        document.getElementById('tl-time').textContent = Utils.formatTime(time);
    }

    // --- Bar dragging (move entire animation in time) ---
    handleBarDrag(e) {
        const d = this.dragBarData;
        if (!d) return;
        const dx = e.clientX - d.startX;
        const deltaMs = (dx / this.pixelsPerSecond) * 1000;

        if (Array.isArray(d.targets) && d.targets.length > 1) {
            const minDelay = Math.min(...d.targets.map(target => target.origDelay));
            const appliedDelta = Math.max(-minDelay, deltaMs);
            d.targets.forEach(target => {
                const roundedDelay = Math.round(this._snapToMarker(Math.max(0, target.origDelay + appliedDelta)));
                target.anim.params ||= {};
                target.anim.delay = roundedDelay;
                target.anim.params.delay = roundedDelay / 1000;
                if (target.barEl) {
                    target.barEl.style.left = ((roundedDelay / 1000) * this.pixelsPerSecond) + 'px';
                    target.barEl.classList.add('tl-dragging');
                }
                if (target.kfEls?.[0]) target.kfEls[0].style.left = ((roundedDelay / 1000) * this.pixelsPerSecond) + 'px';
                if (target.kfEls?.[1]) target.kfEls[1].style.left = (((roundedDelay + target.totalDur) / 1000) * this.pixelsPerSecond) + 'px';
            });
            document.body.style.cursor = 'grabbing';
            const firstDelay = Math.min(...d.targets.map(target => target.anim.delay || 0));
            const lastEnd = Math.max(...d.targets.map(target => (target.anim.delay || 0) + target.totalDur));
            this._showDragTooltip(e, firstDelay, lastEnd - firstDelay, `${d.targets.length} bars`);
            return;
        }

        const newDelay = this._snapToMarker(Math.max(0, d.origDelay + deltaMs));

        const obj = this.objects.getObjectById(d.objId);
        if (!obj) return;
        const anim = obj.animations.find(a => a.id === d.animId);
        if (!anim) return;
        if (!anim.params) anim.params = {};

        anim.delay = Math.round(newDelay);
        anim.params.delay = anim.delay / 1000;

        // Live-update using cached elements
        const bar = d._bar || (d._bar = document.querySelector(`.timeline-bar[data-anim-id="${d.animId}"]`));
        if (bar) {
            bar.style.left = ((anim.delay / 1000) * this.pixelsPerSecond) + 'px';
            bar.classList.add('tl-dragging');
        }

        const track = bar?.parentElement;
        if (track) {
            const kfs = d._kfs || (d._kfs = track.querySelectorAll(`.timeline-keyframe[data-anim-id="${d.animId}"]`));
            if (kfs[0]) kfs[0].style.left = bar.style.left;
            if (kfs[1]) {
                kfs[1].style.left = (((anim.delay + d.totalDur) / 1000) * this.pixelsPerSecond) + 'px';
            }
        }

        // Show time tooltip
        document.body.style.cursor = 'grabbing';
        this._showDragTooltip(e, anim.delay, d.totalDur);
    }

    handleBulkShiftDrag(e) {
        const data = this.bulkShiftDragData;
        if (!data) return;

        const desiredShiftMs = ((data.startX - e.clientX) / this.pixelsPerSecond) * 1000;
        const appliedShiftMs = Math.max(-data.minDelay, desiredShiftMs);

        data.targets.forEach(target => {
            const nextDelay = target.origDelay + appliedShiftMs;
            const roundedDelay = Math.round(nextDelay);
            target.anim.params ||= {};
            target.anim.delay = roundedDelay;
            target.anim.params.delay = roundedDelay / 1000;

            if (target.barEl) {
                target.barEl.style.left = ((roundedDelay / 1000) * this.pixelsPerSecond) + 'px';
                target.barEl.classList.add('tl-dragging');
            }
            if (target.kfEls?.[0]) {
                target.kfEls[0].style.left = ((roundedDelay / 1000) * this.pixelsPerSecond) + 'px';
            }
            if (target.kfEls?.[1]) {
                target.kfEls[1].style.left = (((roundedDelay + target.totalDur) / 1000) * this.pixelsPerSecond) + 'px';
            }
        });

        if (data.handleEl) {
            const dx = e.clientX - data.startX;
            const rawHandleLeft = data.handleStartLeft + dx;
            const clampedHandleLeft = Utils.clamp(rawHandleLeft, 0, data.railWidth);
            data.handleEl.style.left = clampedHandleLeft + 'px';
            data.handleEl.classList.add('is-active');
        }

        document.body.style.cursor = 'grabbing';
        this._showDragTooltip(e, Math.max(0, data.minDelay + appliedShiftMs), Math.max(0, data.maxEnd - data.minDelay), `${data.label} shift`);
    }

    // --- Keyframe dragging (start = change delay, end = change duration) ---
    handleKeyframeDrag(e) {
        const d = this.dragKfData;
        if (!d) return;
        const dx = e.clientX - d.startX;
        const deltaMs = (dx / this.pixelsPerSecond) * 1000;

        const obj = this.objects.getObjectById(d.objId);
        if (!obj) return;
        const anim = obj.animations.find(a => a.id === d.animId);
        if (!anim) return;
        if (!anim.params) anim.params = {};
        const configs = Array.isArray(anim.generated) ? anim.generated : [anim.generated];

        if (d.edge === 'start') {
            // Move start = change delay (and shorten/lengthen duration inversely)
            const newDelay = this._snapToMarker(Math.max(0, d.origDelay + deltaMs));
            const delayDiff = newDelay - d.origDelay;
            const newDuration = Math.max(100, d.origDuration - delayDiff);
            anim.delay = Math.round(newDelay);
            anim.params.delay = anim.delay / 1000;
            configs.forEach(cfg => { if (cfg) cfg.duration = Math.round(newDuration); });
            anim.params.duration = newDuration / 1000;
        } else {
            // Move end = change duration only
            // Scale delta by 1/repeatCount so the bar edge follows the cursor
            const scaledDelta = deltaMs / d.repeatCount;
            const rawEnd = d.origDelay + Math.max(100, d.origDuration + scaledDelta);
            const newDuration = Math.max(100, this._snapToMarker(rawEnd) - d.origDelay);
            configs.forEach(cfg => { if (cfg) cfg.duration = Math.round(newDuration); });
            anim.params.duration = newDuration / 1000;
        }

        // Compute maxEnd the same way the renderer does
        let maxEnd = 0;
        configs.forEach(cfg => { if (cfg && cfg.duration) maxEnd = Math.max(maxEnd, (cfg._stepDelay || 0) + cfg.duration); });
        const totalDur = maxEnd * d.repeatCount;

        // Live-update visuals using cached elements
        const bar = d._bar || (d._bar = document.querySelector(`.timeline-bar[data-anim-id="${d.animId}"]`));
        if (bar) {
            bar.style.left = ((anim.delay / 1000) * this.pixelsPerSecond) + 'px';
            bar.style.width = ((totalDur / 1000) * this.pixelsPerSecond) + 'px';
            bar.classList.add('tl-dragging');
        }
        const track = bar?.parentElement;
        if (track) {
            const kfs = d._kfs || (d._kfs = track.querySelectorAll(`.timeline-keyframe[data-anim-id="${d.animId}"]`));
            if (kfs[0]) kfs[0].style.left = ((anim.delay / 1000) * this.pixelsPerSecond) + 'px';
            if (kfs[1]) {
                kfs[1].style.left = (((anim.delay + totalDur) / 1000) * this.pixelsPerSecond) + 'px';
            }
        }

        // Show time tooltip (show single-cycle duration)
        document.body.style.cursor = 'ew-resize';
        this._showDragTooltip(e, anim.delay, totalDur);
    }

    updatePlayhead(time) {
        const playhead = document.getElementById('timeline-playhead');
        if (!playhead) return;
        
        const x = (time / 1000) * this.pixelsPerSecond;
        playhead.style.left = x + 'px';
    }

    _loadMarkerSnapPreference() {
        try { return localStorage.getItem('animation-stage-marker-snap') === 'true'; } catch (_) { return false; }
    }

    _syncMarkerSnapButton() {
        const button = document.getElementById('tl-marker-snap');
        if (!button) return;
        button.classList.toggle('active', this.markerSnapEnabled);
        button.setAttribute('aria-pressed', this.markerSnapEnabled ? 'true' : 'false');
        button.title = this.markerSnapEnabled
            ? 'Marker snapping is on - click to turn it off'
            : 'Snap playhead, animation bars, and keyframes to nearby audio markers';
    }

    _getMarkerTimesMs() {
        const markers = Array.isArray(this.markers) ? this.markers : (window.app?.audioMarkers || []);
        return markers.map(marker => Math.max(0, Number(marker?.time) || 0) * 1000).filter(Number.isFinite);
    }

    _snapToMarker(timeMs) {
        const value = Math.max(0, Number(timeMs) || 0);
        if (!this.markerSnapEnabled) return value;
        const threshold = Math.max(70, Math.round(12 / Math.max(0.01, this.pixelsPerSecond) * 1000));
        let closest = null;
        this._getMarkerTimesMs().forEach(markerTime => {
            if (Math.abs(markerTime - value) <= threshold && (closest === null || Math.abs(markerTime - value) < Math.abs(closest - value))) closest = markerTime;
        });
        return closest === null ? value : closest;
    }

    // --- Drag time tooltip ---
    _showDragTooltip(e, delayMs, durationMs, prefix) {
        let tip = this._dragTooltip;
        if (!tip) {
            tip = document.createElement('div');
            tip.className = 'tl-drag-tooltip';
            document.body.appendChild(tip);
            this._dragTooltip = tip;
        }
        const startSec = (delayMs / 1000).toFixed(2);
        const durSec = (durationMs / 1000).toFixed(2);
        const endSec = ((delayMs + durationMs) / 1000).toFixed(2);
        tip.textContent = `${prefix ? `${prefix}: ` : ''}${startSec}s → ${endSec}s  (${durSec}s)`;
        tip.style.left = (e.clientX + 14) + 'px';
        tip.style.top = (e.clientY - 28) + 'px';
    }

    _removeDragTooltip() {
        if (this._dragTooltip) {
            this._dragTooltip.remove();
            this._dragTooltip = null;
        }
        // Remove dragging class from all bars
        document.querySelectorAll('.timeline-bar.tl-dragging').forEach(b => b.classList.remove('tl-dragging'));
        document.querySelectorAll('.tl-bulk-shift-handle.is-active').forEach(el => el.classList.remove('is-active'));
    }

    _pruneBulkShiftSelection() {
        const validIds = new Set(this.objects.objects.map(obj => String(obj.id)));
        this.bulkShiftSelection.forEach(id => {
            if (!validIds.has(String(id))) this.bulkShiftSelection.delete(id);
        });
        if (!this.bulkShiftSelection.size) this.bulkShiftLocked = false;
    }

    _setBulkShiftSelection(ids) {
        this.bulkShiftSelection = new Set((ids || []).map(id => String(id)));
        if (!this.bulkShiftSelection.size) this.bulkShiftLocked = false;
    }

    _toggleBulkShiftObject(objId, checked) {
        const key = String(objId);
        if (checked) this.bulkShiftSelection.add(key);
        else this.bulkShiftSelection.delete(key);
        if (!this.bulkShiftSelection.size) this.bulkShiftLocked = false;
        this.buildTracks();
    }

    _toggleBulkShiftAll(checked) {
        if (checked) this._setBulkShiftSelection(this.objects.objects.map(obj => obj.id));
        else this._setBulkShiftSelection([]);
        this.buildTracks();
    }

    _getBulkShiftTargetIds() {
        this._pruneBulkShiftSelection();
        return Array.from(this.bulkShiftSelection);
    }

    _getAnimationTotalDuration(anim) {
        const configs = Array.isArray(anim.generated) ? anim.generated : [anim.generated];
        let maxEnd = 0;
        configs.forEach(config => {
            if (!config || !config.duration || config.property === '_chainType') return;
            if (config.type === 'audio-lip-sync' && config.audioRefreshRequired === true) return;
            maxEnd = Math.max(maxEnd, (config._stepDelay || 0) + config.duration);
        });
        return maxEnd * this._getAnimRepeatCount(anim);
    }

    _makeAnimSelectionKey(objId, animId) {
        return `${String(objId)}::${String(animId)}`;
    }

    _parseAnimSelectionKey(key) {
        const [objId, ...rest] = String(key || '').split('::');
        return { objId, animId: rest.join('::') };
    }

    _pruneSelectedAnimationBars() {
        const valid = new Set();
        this.objects.objects.forEach(obj => {
            (obj.animations || []).forEach(anim => {
                valid.add(this._makeAnimSelectionKey(obj.id, anim.id));
            });
        });
        this.selectedAnimKeys.forEach(key => {
            if (!valid.has(key)) this.selectedAnimKeys.delete(key);
        });
        if (this.lastSelectedAnimKey && !valid.has(this.lastSelectedAnimKey)) this.lastSelectedAnimKey = null;
        if (this.selectedAnimId && this.selectedAnimObjId) {
            const activeKey = this._makeAnimSelectionKey(this.selectedAnimObjId, this.selectedAnimId);
            if (!valid.has(activeKey)) {
                this.selectedAnimId = null;
                this.selectedAnimObjId = null;
            }
        }
    }

    _getAllAnimationBarKeysInTimelineOrder() {
        const entries = [];
        this.objects.objects.forEach((obj, objIndex) => {
            (obj.animations || []).forEach((anim, animIndex) => {
                entries.push({
                    key: this._makeAnimSelectionKey(obj.id, anim.id),
                    objId: obj.id,
                    animId: anim.id,
                    start: anim.delay || 0,
                    objIndex,
                    animIndex
                });
            });
        });
        return entries.sort((a, b) => a.start - b.start || a.objIndex - b.objIndex || a.animIndex - b.animIndex);
    }

    _selectAnimationBar(objId, animId, options = {}) {
        const key = this._makeAnimSelectionKey(objId, animId);
        const mode = options.mode || 'replace';
        if (mode === 'toggle') {
            if (this.selectedAnimKeys.has(key)) this.selectedAnimKeys.delete(key);
            else this.selectedAnimKeys.add(key);
        } else if (mode === 'range' && this.lastSelectedAnimKey) {
            const ordered = this._getAllAnimationBarKeysInTimelineOrder().map(entry => entry.key);
            const startIndex = ordered.indexOf(this.lastSelectedAnimKey);
            const endIndex = ordered.indexOf(key);
            if (startIndex >= 0 && endIndex >= 0) {
                const [from, to] = startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex];
                if (!options.preserveExisting) this.selectedAnimKeys.clear();
                ordered.slice(from, to + 1).forEach(itemKey => this.selectedAnimKeys.add(itemKey));
            } else {
                this.selectedAnimKeys = new Set([key]);
            }
        } else {
            this.selectedAnimKeys = new Set([key]);
        }

        if (!this.selectedAnimKeys.size) {
            this.selectedAnimId = null;
            this.selectedAnimObjId = null;
            this.lastSelectedAnimKey = null;
        } else {
            const active = this.selectedAnimKeys.has(key)
                ? { objId, animId }
                : (() => {
                    const keys = Array.from(this.selectedAnimKeys);
                    return this._parseAnimSelectionKey(keys[keys.length - 1]);
                })();
            this.selectedAnimId = active.animId;
            this.selectedAnimObjId = active.objId;
            this.lastSelectedAnimKey = this._makeAnimSelectionKey(active.objId, active.animId);
        }
        this._syncSelectedAnimationBarsUi();
    }

    _getTimelineTrackLocalPoint(clientX, clientY) {
        const trackArea = document.getElementById('timeline-track-area');
        if (!trackArea) return { x: 0, y: 0 };
        const rect = trackArea.getBoundingClientRect();
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }

    _beginTimelineBarMarquee(e) {
        const trackArea = document.getElementById('timeline-track-area');
        if (!trackArea || !this.pendingTrackPointer) return;
        const start = this._getTimelineTrackLocalPoint(this.pendingTrackPointer.startX, this.pendingTrackPointer.startY);
        const current = this._getTimelineTrackLocalPoint(e.clientX, e.clientY);
        const box = document.createElement('div');
        box.className = 'tl-bar-marquee';
        trackArea.appendChild(box);
        this.isDraggingBarMarquee = true;
        this.barMarqueeData = {
            start,
            current,
            box,
            additive: this.pendingTrackPointer.additive,
            toggle: this.pendingTrackPointer.toggle,
            baseKeys: new Set(this.pendingTrackPointer.baseKeys || [])
        };
        document.body.style.cursor = 'crosshair';
        this._handleTimelineBarMarqueeDrag(e);
    }

    _getTimelineBarKeysInMarquee(rect) {
        const trackArea = document.getElementById('timeline-track-area');
        if (!trackArea) return [];
        const areaRect = trackArea.getBoundingClientRect();
        const keys = [];
        trackArea.querySelectorAll('.timeline-bar[data-anim-id][data-obj-id]').forEach(bar => {
            if (bar.dataset.faceMergeId) return;
            const br = bar.getBoundingClientRect();
            const local = {
                left: br.left - areaRect.left,
                right: br.right - areaRect.left,
                top: br.top - areaRect.top,
                bottom: br.bottom - areaRect.top
            };
            const intersects = local.left <= rect.right
                && local.right >= rect.left
                && local.top <= rect.bottom
                && local.bottom >= rect.top;
            if (intersects) keys.push(this._makeAnimSelectionKey(bar.dataset.objId, bar.dataset.animId));
        });
        return keys;
    }

    _handleTimelineBarMarqueeDrag(e) {
        const data = this.barMarqueeData;
        if (!data?.box) return;
        data.current = this._getTimelineTrackLocalPoint(e.clientX, e.clientY);
        const rect = {
            left: Math.min(data.start.x, data.current.x),
            right: Math.max(data.start.x, data.current.x),
            top: Math.min(data.start.y, data.current.y),
            bottom: Math.max(data.start.y, data.current.y)
        };
        data.box.style.left = `${rect.left}px`;
        data.box.style.top = `${rect.top}px`;
        data.box.style.width = `${Math.max(1, rect.right - rect.left)}px`;
        data.box.style.height = `${Math.max(1, rect.bottom - rect.top)}px`;

        const hitKeys = new Set(this._getTimelineBarKeysInMarquee(rect));
        if (data.additive) {
            this.selectedAnimKeys = new Set(data.baseKeys || []);
            hitKeys.forEach(key => {
                if (data.toggle && this.selectedAnimKeys.has(key)) this.selectedAnimKeys.delete(key);
                else this.selectedAnimKeys.add(key);
            });
        } else {
            this.selectedAnimKeys = hitKeys;
        }
        const activeKey = Array.from(hitKeys).pop() || Array.from(this.selectedAnimKeys).pop() || null;
        if (activeKey) {
            const parsed = this._parseAnimSelectionKey(activeKey);
            this.selectedAnimId = parsed.animId;
            this.selectedAnimObjId = parsed.objId;
            this.lastSelectedAnimKey = activeKey;
        } else {
            this.selectedAnimId = null;
            this.selectedAnimObjId = null;
            this.lastSelectedAnimKey = null;
        }
        this._syncSelectedAnimationBarsUi();
    }

    _finishTimelineBarMarquee() {
        const data = this.barMarqueeData;
        if (data?.box?.parentElement) data.box.remove();
        this.isDraggingBarMarquee = false;
        this.barMarqueeData = null;
        this.pendingTrackPointer = null;
        document.body.style.cursor = '';
        const targets = this._getSelectedAnimationTargets();
        if (targets.length > 1) {
            Utils.showToast(`${targets.length} animation bars selected for group actions`, 'info');
        }
    }

    _syncSelectedAnimationBarsUi() {
        this._pruneSelectedAnimationBars();
        document.querySelectorAll('.timeline-bar').forEach(bar => {
            const key = this._makeAnimSelectionKey(bar.dataset.objId, bar.dataset.animId);
            bar.classList.toggle('selected', this.selectedAnimKeys.has(key));
            bar.classList.toggle('multi-selected', this.selectedAnimKeys.has(key) && this.selectedAnimKeys.size > 1);
        });
        const count = this.selectedAnimKeys.size;
        const button = document.getElementById('tl-group-actions');
        const countEl = document.getElementById('tl-group-count');
        if (button) {
            button.disabled = count < 2;
            button.classList.toggle('active', count > 1);
            button.title = count > 1
                ? `Group actions for ${count} selected animation bars`
                : 'Select multiple animation bars with Ctrl-click, Shift-click, or drag across bars';
        }
        if (countEl) countEl.textContent = String(count);
    }

    _getSelectedAnimationTargets() {
        this._pruneSelectedAnimationBars();
        const targets = [];
        this.selectedAnimKeys.forEach(key => {
            const { objId, animId } = this._parseAnimSelectionKey(key);
            const obj = this.objects.getObjectById(objId);
            const anim = obj?.animations?.find(a => String(a.id) === String(animId));
            if (!obj || !anim) return;
            targets.push({
                key,
                obj,
                objId,
                anim,
                animId,
                start: anim.delay || 0,
                totalDur: this._getAnimationTotalDuration(anim)
            });
        });
        return targets.sort((a, b) => a.start - b.start || String(a.objId).localeCompare(String(b.objId)));
    }

    _finishGroupAnimationEdit(message) {
        this.animations.calculateTotalDuration?.();
        this.animations.updateCodeOutput?.();
        this.animations.updateAppliedAnimationsList?.();
        this.stage?.requestRender?.();
        eventBus.emit('timeline:update');
        if (message) Utils.showToast(message, 'success');
    }

    _setAnimationSingleDuration(anim, durationMs) {
        const nextDuration = Math.max(50, Math.round(durationMs));
        const oldDuration = this._getAnimSingleDuration(anim);
        if (oldDuration <= 0) return false;
        this._scaleDuration(anim, nextDuration);
        const configs = Array.isArray(anim.generated) ? anim.generated : [anim.generated];
        configs.forEach(cfg => {
            if (!cfg || !cfg.duration) return;
            cfg.duration = Math.max(50, Math.round(cfg.duration));
        });
        if (!anim.params) anim.params = {};
        anim.params.duration = nextDuration / 1000;
        return true;
    }

    scaleSelectedAnimationDurations(scale) {
        const targets = this._getSelectedAnimationTargets();
        if (!targets.length) return false;
        const factor = Math.max(0.05, Number(scale) || 1);
        eventBus.emit('history:push');
        let changed = 0;
        targets.forEach(({ anim }) => {
            const oldDuration = this._getAnimSingleDuration(anim);
            if (oldDuration > 0 && this._setAnimationSingleDuration(anim, oldDuration * factor)) changed++;
        });
        this._finishGroupAnimationEdit(`Scaled duration for ${changed} selected animation${changed === 1 ? '' : 's'}`);
        return changed > 0;
    }

    setSelectedAnimationDuration(durationSec) {
        const targets = this._getSelectedAnimationTargets();
        const durationMs = Math.max(50, Number(durationSec) * 1000);
        if (!targets.length || !Number.isFinite(durationMs)) return false;
        eventBus.emit('history:push');
        let changed = 0;
        targets.forEach(({ anim }) => {
            if (this._setAnimationSingleDuration(anim, durationMs)) changed++;
        });
        this._finishGroupAnimationEdit(`Set duration for ${changed} selected animation${changed === 1 ? '' : 's'}`);
        return changed > 0;
    }

    setSelectedRepeatCount(value) {
        const targets = this._getSelectedAnimationTargets();
        if (!targets.length) return false;
        eventBus.emit('history:push');
        targets.forEach(({ anim }) => {
            anim.repeat = value;
            anim.params ||= {};
            anim.params.repeat = value;
        });
        this._finishGroupAnimationEdit(`Repeat count set for ${targets.length} selected animations`);
        return true;
    }

    setSelectedRepeatMode(mode) {
        const targets = this._getSelectedAnimationTargets();
        if (!targets.length) return false;
        const nextMode = mode === 'cycle' ? 'cycle' : 'restart';
        eventBus.emit('history:push');
        targets.forEach(({ anim }) => {
            anim.repeatMode = nextMode;
            anim.params ||= {};
            anim.params.repeatMode = nextMode;
        });
        this._finishGroupAnimationEdit(`Repeat style set to ${nextMode === 'cycle' ? 'Smooth Cycle' : 'Hard Reset'} for ${targets.length} animations`);
        return true;
    }

    duplicateSelectedAnimations() {
        const targets = this._getSelectedAnimationTargets();
        if (!targets.length) return false;
        eventBus.emit('history:push');
        const nextKeys = new Set();
        targets.forEach(({ obj, anim }) => {
            const cloned = JSON.parse(JSON.stringify(anim));
            cloned.id = Utils.generateId('anim');
            const shift = this._getAnimationTotalDuration(anim) || 1000;
            const delay = Math.round((anim.delay || 0) + shift);
            cloned.delay = delay;
            cloned.params ||= {};
            cloned.params.delay = delay / 1000;
            obj.animations.push(cloned);
            nextKeys.add(this._makeAnimSelectionKey(obj.id, cloned.id));
        });
        this.selectedAnimKeys = nextKeys;
        const nextKeyList = Array.from(nextKeys);
        const last = nextKeyList[nextKeyList.length - 1];
        if (last) {
            const parsed = this._parseAnimSelectionKey(last);
            this.selectedAnimObjId = parsed.objId;
            this.selectedAnimId = parsed.animId;
            this.lastSelectedAnimKey = last;
        }
        this._finishGroupAnimationEdit(`Duplicated ${targets.length} selected animation${targets.length === 1 ? '' : 's'}`);
        return true;
    }

    deleteSelectedAnimations() {
        const targets = this._getSelectedAnimationTargets();
        if (!targets.length) return false;
        eventBus.emit('history:push');
        targets.forEach(({ obj, animId, anim }) => {
            if (window.app?.jointSystem?._deleteArmatureTimelineAction(anim._armatureActionId)) return;
            const index = obj.animations.findIndex(a => String(a.id) === String(animId));
            if (index >= 0) {
                obj.animations.splice(index, 1);
                window.app?.jointSystem?.resetRemovedJointAnimationTarget?.(obj, anim);
                if (anim?.type === 'face-set' || anim?.type === 'face-set-motion') {
                    this.getFaceRigManager()?.resetFaceSetIfNoMotionTracksForObject?.(obj);
                }
            }
        });
        this.selectedAnimKeys.clear();
        this.selectedAnimId = null;
        this.selectedAnimObjId = null;
        this.lastSelectedAnimKey = null;
        this._finishGroupAnimationEdit(`Deleted ${targets.length} selected animation${targets.length === 1 ? '' : 's'}`);
        return true;
    }

    sequenceSelectedAnimations(gapMs = 0) {
        const targets = this._getSelectedAnimationTargets();
        if (targets.length < 2) return false;
        eventBus.emit('history:push');
        let cursor = targets[0].start;
        targets.forEach(target => {
            const delay = Math.max(0, Math.round(cursor));
            target.anim.delay = delay;
            target.anim.params ||= {};
            target.anim.params.delay = delay / 1000;
            cursor = delay + (target.totalDur || this._getAnimationTotalDuration(target.anim) || 0) + Math.max(0, Number(gapMs) || 0);
        });
        this._finishGroupAnimationEdit(`Sequenced ${targets.length} selected animation bars`);
        return true;
    }

    alignSelectedAnimationStarts(timeMs = this.animations.currentTime || 0) {
        const targets = this._getSelectedAnimationTargets();
        if (!targets.length) return false;
        const nextDelay = Math.max(0, Math.round(Number(timeMs) || 0));
        eventBus.emit('history:push');
        targets.forEach(({ anim }) => {
            anim.delay = nextDelay;
            anim.params ||= {};
            anim.params.delay = nextDelay / 1000;
        });
        this._finishGroupAnimationEdit(`Aligned ${targets.length} selected animation starts`);
        return true;
    }

    copySelectedAnimations() {
        const targets = this._getSelectedAnimationTargets();
        if (!targets.length) return false;
        const minStart = Math.min(...targets.map(target => target.start));
        const payload = {
            format: 'animstage-selected-timeline-animations',
            version: 1,
            count: targets.length,
            startOffset: minStart,
            animations: targets.map(target => ({
                objectId: target.objId,
                objectName: target.obj.name || '',
                animation: JSON.parse(JSON.stringify(target.anim))
            }))
        };
        this._copyTextToClipboard(
            JSON.stringify(payload, null, 2),
            `Copied ${targets.length} selected animation${targets.length === 1 ? '' : 's'}`
        );
        return true;
    }

    _getBulkShiftTargets() {
        const targetIds = new Set(this._getBulkShiftTargetIds());
        const targets = [];
        this.objects.objects.forEach(obj => {
            if (!targetIds.has(String(obj.id))) return;
            obj.animations.forEach(anim => {
                const barEl = document.querySelector(`.timeline-bar[data-anim-id="${anim.id}"][data-obj-id="${obj.id}"]`);
                const trackEl = barEl?.parentElement;
                const kfEls = trackEl ? trackEl.querySelectorAll(`.timeline-keyframe[data-anim-id="${anim.id}"][data-obj-id="${obj.id}"]`) : null;
                targets.push({
                    obj,
                    anim,
                    origDelay: anim.delay || 0,
                    totalDur: this._getAnimationTotalDuration(anim),
                    barEl,
                    kfEls
                });
            });
        });
        return targets;
    }

    _getBulkShiftSummary(targets) {
        if (!targets.length) {
            return { minDelay: 0, maxEnd: 0, label: 'No scope' };
        }
        const minDelay = Math.min(...targets.map(target => target.origDelay));
        const maxEnd = Math.max(...targets.map(target => target.origDelay + target.totalDur));
        const objCount = new Set(targets.map(target => String(target.obj.id))).size;
        const label = objCount === this.objects.objects.length ? 'All objects' : `${objCount} object${objCount === 1 ? '' : 's'}`;
        return { minDelay, maxEnd, label };
    }

    _getSequencedObjectStats() {
        return this.objects.objects
            .map(obj => {
                const animations = Array.isArray(obj.animations) ? obj.animations : [];
                if (!animations.length) return null;

                const validAnimations = animations
                    .map(anim => ({
                        anim,
                        start: anim.delay || 0,
                        totalDur: this._getAnimationTotalDuration(anim)
                    }))
                    .filter(entry => entry.totalDur > 0);

                if (!validAnimations.length) return null;

                const start = Math.min(...validAnimations.map(entry => entry.start));
                const end = Math.max(...validAnimations.map(entry => entry.start + entry.totalDur));
                return {
                    obj,
                    start,
                    end,
                    span: Math.max(0, end - start)
                };
            })
            .filter(Boolean);
    }

    _isFaceSetObject(obj) {
        return !!obj && (obj.faceSet || (Array.isArray(obj.tags) && obj.tags.includes('face-set')));
    }

    _isFaceSetTimelineMerged(obj) {
        return !!obj && this._isFaceSetObject(obj) && !!(obj.faceSet?.timelineMerged || obj._faceSetTimelineMerged);
    }

    _getMergedFaceSetTrackData(groupId, memberIds, objectTrackData) {
        const members = (memberIds || [])
            .map(id => this.objects.getObjectById?.(id) || this.objects.objects.find(obj => String(obj.id) === String(id)))
            .filter(obj => this._isFaceSetObject(obj));
        if (!members.length || !members.some(obj => this._isFaceSetTimelineMerged(obj))) return null;

        const entries = [];
        members.forEach(obj => {
            const data = objectTrackData[obj.id];
            if (!data || !Array.isArray(data.barEntries)) return;
            data.barEntries.forEach(entry => entries.push({ ...entry, sourceObj: obj }));
        });
        if (!entries.length) return null;

        const startMs = Math.min(...entries.map(entry => entry.startMs));
        const endMs = Math.max(...entries.map(entry => entry.endMs));
        const width = Math.max(8, ((endMs - startMs) / 1000) * this.pixelsPerSecond);
        const setName = members.find(obj => obj.faceSet?.timelineMergeName)?.faceSet.timelineMergeName
            || members.find(obj => obj._faceSetTimelineMergeName)?._faceSetTimelineMergeName
            || members.find(obj => obj.faceSet?.name)?.faceSet.name
            || this.objects.groupNames?.[groupId]
            || 'Face Set';

        return {
            type: 'face-set-merged',
            groupId,
            memberIds: members.map(obj => obj.id),
            setName,
            representativeObj: members[0],
            startMs,
            endMs,
            startX: (startMs / 1000) * this.pixelsPerSecond,
            width,
            animationCount: entries.length,
            partCount: members.length,
            displayHeight: 32
        };
    }

    _pruneSequenceOrderMap() {
        const validIds = new Set(this._getSequencedObjectStats().map(entry => String(entry.obj.id)));
        Object.keys(this.sequenceOrderMap || {}).forEach(objId => {
            if (!validIds.has(String(objId))) delete this.sequenceOrderMap[objId];
        });
    }

    _ensureSequenceOrderMap(sequenceStats) {
        const entries = sequenceStats?.length ? sequenceStats : this._getSequencedObjectStats();
        const validSet = new Set(entries.map(entry => String(entry.obj.id)));
        Object.keys(this.sequenceOrderMap || {}).forEach(objId => {
            if (!validSet.has(String(objId))) delete this.sequenceOrderMap[objId];
        });

        const defaults = [...entries].sort((a, b) => a.start - b.start || this.objects.objects.indexOf(a.obj) - this.objects.objects.indexOf(b.obj));
        const usedOrders = new Set();

        defaults.forEach((entry, index) => {
            const key = String(entry.obj.id);
            const currentOrder = parseInt(this.sequenceOrderMap[key], 10);
            if (currentOrder >= 1 && currentOrder <= entries.length && !usedOrders.has(currentOrder)) {
                this.sequenceOrderMap[key] = currentOrder;
                usedOrders.add(currentOrder);
                return;
            }

            let nextOrder = index + 1;
            while (usedOrders.has(nextOrder) && nextOrder <= entries.length) nextOrder += 1;
            this.sequenceOrderMap[key] = Math.min(nextOrder, entries.length);
            usedOrders.add(this.sequenceOrderMap[key]);
        });
    }

    _setSequenceOrder(objId, order, sequenceStats) {
        const entries = sequenceStats?.length ? sequenceStats : this._getSequencedObjectStats();
        if (!entries.length) return;

        this._ensureSequenceOrderMap(entries);

        const key = String(objId);
        const nextOrder = parseInt(order, 10);
        const currentOrder = parseInt(this.sequenceOrderMap[key], 10);
        if (!Number.isFinite(nextOrder) || currentOrder === nextOrder) return;

        const otherEntry = entries.find(entry => String(entry.obj.id) !== key && parseInt(this.sequenceOrderMap[String(entry.obj.id)], 10) === nextOrder);
        this.sequenceOrderMap[key] = nextOrder;
        if (otherEntry && Number.isFinite(currentOrder)) {
            this.sequenceOrderMap[String(otherEntry.obj.id)] = currentOrder;
        }

        this.buildTracks();
    }

    applySequenceOrder() {
        const sequenceStats = this._getSequencedObjectStats();
        if (sequenceStats.length < 2) {
            Utils.showToast('Need at least two animated objects to build a sequence', 'warning');
            return;
        }

        this._ensureSequenceOrderMap(sequenceStats);
        const ordered = [...sequenceStats].sort((a, b) => {
            const aOrder = parseInt(this.sequenceOrderMap[String(a.obj.id)], 10) || 0;
            const bOrder = parseInt(this.sequenceOrderMap[String(b.obj.id)], 10) || 0;
            return aOrder - bOrder;
        });

        const baselineStart = ordered[0].start;
        let nextStart = baselineStart;

        eventBus.emit('history:push');

        ordered.forEach(entry => {
            const shiftMs = nextStart - entry.start;
            entry.obj.animations.forEach(anim => {
                const nextDelay = Math.max(0, Math.round((anim.delay || 0) + shiftMs));
                anim.delay = nextDelay;
                anim.params ||= {};
                anim.params.delay = nextDelay / 1000;
            });
            nextStart += entry.span;
        });

        this.animations.calculateTotalDuration();
        this.animations.updateCodeOutput();
        eventBus.emit('timeline:update');
        Utils.showToast(`Animation Sequence applied to ${ordered.length} objects`, 'success');
    }

    // ========== Recording Mode ==========

    toggleRecording(btn) {
        this.isRecording = !this.isRecording;
        if (this.isRecording) {
            btn.classList.add('recording-active');
            eventBus.emit('recording:start', { orderMode: this.recordOrderMode });
            const modeText = this.recordOrderMode === 'sequence' ? 'Sequence' : 'Same Time';
            Utils.showToast(`Recording ON (${modeText}) — move, resize, rotate, or draw new objects to create keyframes`, 'info');
        } else {
            btn.classList.remove('recording-active');
            eventBus.emit('recording:stop');
            Utils.showToast('Step recording stopped', 'info');
        }
    }

    stopRecording() {
        this.isRecording = false;
        const btn = document.getElementById('tl-record');
        if (btn) btn.classList.remove('recording-active');
        eventBus.emit('recording:stop');
    }

    setRecordOrderMode(mode = 'same') {
        const nextMode = mode === 'sequence' ? 'sequence' : 'same';
        this.recordOrderMode = nextMode;
        if (this.objects) {
            this.objects._recordOrderMode = nextMode;
            if (nextMode === 'same') this.objects._recordSequenceCursorMs = null;
        }
        document.querySelectorAll('[data-record-order]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.recordOrder === nextMode);
        });
        eventBus.emit('recording:order-mode', nextMode);
        Utils.showToast(`Recording order: ${nextMode === 'sequence' ? 'Sequence' : 'Same Time'}`, 'info');
    }

    // ========== Continuous Recording ==========

    toggleContinuousRecording(btn) {
        if (this._contRecActive) {
            this._stopContinuousRecording(btn);
        } else {
            this._startContinuousRecording(btn);
        }
    }

    _startContinuousRecording(btn) {
        // Stop one-shot recording if active
        if (this.isRecording) {
            this.stopRecording();
        }

        const started = this.objects.startContinuousRecording();
        if (!started) return;

        this._contRecActive = true;
        this._contRecStart = performance.now();
        btn.classList.add('recording-active');

        // Show timer
        const timer = document.getElementById('tl-rec-timer');
        if (timer) timer.classList.remove('hidden');

        // Update timer display every 100ms
        this._contRecTimerId = setInterval(() => {
            const elapsed = performance.now() - this._contRecStart;
            const secs = Math.floor(elapsed / 1000);
            const tenths = Math.floor((elapsed % 1000) / 100);
            const mins = Math.floor(secs / 60);
            const s = secs % 60;
            const timerEl = document.getElementById('tl-rec-timer');
            if (timerEl) timerEl.textContent = `${String(mins).padStart(2,'0')}:${String(s).padStart(2,'0')}.${tenths}`;
        }, 100);

        Utils.showToast('Live recording started — move objects, draw new ones, or rig poses. Click again to stop.', 'info');
    }

    _stopContinuousRecording(btn) {
        clearInterval(this._contRecTimerId);
        this._contRecActive = false;
        btn.classList.remove('recording-active');

        // Hide timer
        const timer = document.getElementById('tl-rec-timer');
        if (timer) timer.classList.add('hidden');

        this.objects.stopContinuousRecording();

        this.update();
        eventBus.emit('timeline:update');
    }

    getPlayheadTime() {
        return this.animations.currentTime || 0;
    }

    jumpToStart() {
        const time = this.animations.seekToStart ? this.animations.seekToStart() : 0;
        this.updatePlayhead(time);
        document.getElementById('tl-time').textContent = Utils.formatTime(time);
        this.highlightAnimationAtTime(time, this.objects.objects || []);
        this.stage.requestRender();
        return time;
    }

    jumpToEnd() {
        const time = this.animations.seekToEnd
            ? this.animations.seekToEnd()
            : (this.animations.totalDuration || 5000);
        this.updatePlayhead(time);
        document.getElementById('tl-time').textContent = Utils.formatTime(time);
        this.highlightAnimationAtTime(time, this.objects.objects || []);
        this.stage.requestRender();
        return time;
    }

    // ========== Timeline Zoom ==========

    bindZoomControls() {
        document.getElementById('tl-zoom-in')?.addEventListener('click', () => this.zoomIn());
        document.getElementById('tl-zoom-out')?.addEventListener('click', () => this.zoomOut());
        document.getElementById('tl-zoom-fit')?.addEventListener('click', () => this.zoomToFit());
        document.getElementById('tl-zoom-level')?.addEventListener('click', () => this.zoomReset());

        // Mouse-wheel zoom on the timeline tracks area
        const tracks = document.getElementById('timeline-tracks');
        if (tracks) {
            tracks.addEventListener('wheel', (e) => {
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    // Get mouse position relative to tracks for zoom-toward-cursor
                    const rect = tracks.getBoundingClientRect();
                    const mouseX = e.clientX - rect.left + tracks.scrollLeft;
                    const timeBefore = mouseX / this.pixelsPerSecond;

                    if (e.deltaY < 0) {
                        this.setZoom(this.pixelsPerSecond * this.zoomStep);
                    } else {
                        this.setZoom(this.pixelsPerSecond / this.zoomStep);
                    }

                    // Adjust scroll to keep the same time under cursor
                    const mouseXAfter = timeBefore * this.pixelsPerSecond;
                    tracks.scrollLeft = mouseXAfter - (e.clientX - rect.left);
                }
            }, { passive: false });
        }
    }

    zoomIn() {
        const tracks = document.getElementById('timeline-tracks');
        const scrollCenter = tracks ? (tracks.scrollLeft + tracks.clientWidth / 2) : 0;
        const timeBefore = scrollCenter / this.pixelsPerSecond;

        this.setZoom(this.pixelsPerSecond * this.zoomStep);

        // Keep center of view stable
        if (tracks) {
            const scrollCenterAfter = timeBefore * this.pixelsPerSecond;
            tracks.scrollLeft = scrollCenterAfter - tracks.clientWidth / 2;
        }
    }

    zoomOut() {
        const tracks = document.getElementById('timeline-tracks');
        const scrollCenter = tracks ? (tracks.scrollLeft + tracks.clientWidth / 2) : 0;
        const timeBefore = scrollCenter / this.pixelsPerSecond;

        this.setZoom(this.pixelsPerSecond / this.zoomStep);

        if (tracks) {
            const scrollCenterAfter = timeBefore * this.pixelsPerSecond;
            tracks.scrollLeft = scrollCenterAfter - tracks.clientWidth / 2;
        }
    }

    zoomReset() {
        this.setZoom(this.defaultPixelsPerSecond);
    }

    zoomToFit() {
        const tracks = document.getElementById('timeline-tracks');
        if (!tracks) return;

        // Find the last animation end time
        let maxEnd = 0;
        this.objects.objects.forEach(obj => {
            obj.animations.forEach(anim => {
                const configs = Array.isArray(anim.generated) ? anim.generated : [anim.generated];
                configs.forEach(config => {
                    if (config && config.duration) {
                        const end = (anim.delay || 0) + config.duration;
                        const repeat = anim.repeat === '-1' ? 1 : (parseInt(anim.repeat) || 1);
                        maxEnd = Math.max(maxEnd, end * repeat);
                    }
                });
            });
        });

        if (maxEnd <= 0) {
            maxEnd = this.animations.totalDuration;
        }
        if (maxEnd <= 0) return;

        const availableWidth = tracks.clientWidth - 40; // leave padding
        const maxEndSec = maxEnd / 1000;
        const idealPps = availableWidth / maxEndSec;
        this.setZoom(Utils.clamp(idealPps, this.minPixelsPerSecond, this.maxPixelsPerSecond));
        tracks.scrollLeft = 0;
    }

    setZoom(newPps) {
        this.pixelsPerSecond = Utils.clamp(
            Math.round(newPps),
            this.minPixelsPerSecond,
            this.maxPixelsPerSecond
        );
        this.updateZoomDisplay();
        this.update();
        // Re-position playhead
        this.updatePlayhead(this.animations.currentTime);
    }

    updateZoomDisplay() {
        const pct = Math.round((this.pixelsPerSecond / this.defaultPixelsPerSecond) * 100);
        const label = document.getElementById('tl-zoom-level');
        if (label) label.textContent = pct + '%';

        // Disable buttons at limits
        const btnIn = document.getElementById('tl-zoom-in');
        const btnOut = document.getElementById('tl-zoom-out');
        if (btnIn) btnIn.disabled = this.pixelsPerSecond >= this.maxPixelsPerSecond;
        if (btnOut) btnOut.disabled = this.pixelsPerSecond <= this.minPixelsPerSecond;
    }

    bindTimelineResize() {
        const handle = document.getElementById('timeline-resize');
        const panel = document.getElementById('timeline-panel');
        if (!handle || !panel) return;

        let startY, startHeight;

        handle.addEventListener('mousedown', (e) => {
            this.isResizing = true;
            startY = e.clientY;
            startHeight = panel.offsetHeight;
            document.body.style.cursor = 'ns-resize';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!this.isResizing) return;
            const dy = startY - e.clientY;
            const newHeight = Utils.clamp(startHeight + dy, 100, 500);
            panel.style.height = newHeight + 'px';
            document.documentElement.style.setProperty('--timeline-height', newHeight + 'px');
            this.stage.resizeCanvas();
        });

        document.addEventListener('mouseup', () => {
            if (this.isResizing) {
                this.isResizing = false;
                document.body.style.cursor = '';
            }
        });
    }

    // Open animation settings panel for a specific animation bar
    _openAnimationSettings(objId, animId) {
        const obj = this.objects.getObjectById(objId);
        if (!obj) return;
        const anim = obj.animations.find(a => a.id === animId);
        if (!anim) return;
        const jointSystem = window.app?.jointSystem;
        if (window.Realistic3DLibrary?.canEdit(obj,anim)) {
            window.Realistic3DLibrary.open(window.app,obj,animId);
            return;
        }
        if (jointSystem?._getArmatureRecordedAction(anim._armatureActionId)?.recipe) {
            jointSystem._editArmatureRecordedAction(anim._armatureActionId);
            return;
        }

        // Switch to the Animate tab in the right panel
        const animTab = document.querySelector('#right-panel .panel-tab[data-tab="animations"]');
        if (animTab) animTab.click();

        // Load the animation into the editor for re-apply
        if (this.animations._loadAppliedAnimForEdit) {
            this.animations._loadAppliedAnimForEdit(obj, animId);
        }

        // Also highlight it in the applied animations list
        setTimeout(() => {
            const listItems = document.querySelectorAll('#applied-anim-list .applied-anim-item');
            listItems.forEach(item => {
                item.classList.toggle('selected', item.dataset.animId === animId);
            });
        }, 50);
    }

    update() {
        this._pruneBulkShiftSelection();
        this._pruneSequenceOrderMap();
        this.animations.calculateTotalDuration();
        this.buildRuler();
        this.buildTracks();
        this._updateRangeMarkers();
        this.animations.updateAppliedAnimationsList();
    }

    // ========== Animation Copy / Paste / Duplicate ==========

    /**
     * Copy a single animation bar to the clipboard.
     */
    copyAnimation(objId, animId) {
        const obj = this.objects.getObjectById(objId);
        if (!obj) return;
        const anim = obj.animations.find(a => a.id === animId);
        if (!anim) return;

        this._copiedAnim = {
            animData: JSON.parse(JSON.stringify(anim)),
            sourceObjId: objId
        };
        Utils.showToast(`Copied "${anim.name}" — Ctrl+V to paste`, 'success');
    }

    copyAllAnimations() {
        const animatedObjects = this.objects.objects
            .filter(obj => Array.isArray(obj.animations) && obj.animations.length > 0);
        const totalAnimations = animatedObjects.reduce((count, obj) => count + obj.animations.length, 0);
        if (!totalAnimations) {
            Utils.showToast('Timeline has no animations to copy', 'info');
            return;
        }

        const payload = {
            format: 'animstage-timeline-animations',
            version: 1,
            timelineDuration: this.animations.totalDuration || 0,
            totalAnimations,
            objectCount: animatedObjects.length,
            objects: animatedObjects.map(obj => ({
                id: obj.id,
                name: obj.name || '',
                type: obj.type || '',
                animations: JSON.parse(JSON.stringify(obj.animations))
            }))
        };

        this._copyTextToClipboard(
            JSON.stringify(payload, null, 2),
            `Copied ${totalAnimations} animation${totalAnimations === 1 ? '' : 's'} from ${animatedObjects.length} object${animatedObjects.length === 1 ? '' : 's'}`
        );
    }

    _copyTextToClipboard(text, successMessage = 'Copied to clipboard') {
        if (!text) {
            Utils.showToast('Nothing to copy', 'warning');
            return;
        }

        if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(text)
                .then(() => Utils.showToast(successMessage, 'success'))
                .catch(() => this._copyTextToClipboardFallback(text, successMessage));
            return;
        }

        this._copyTextToClipboardFallback(text, successMessage);
    }

    _copyTextToClipboardFallback(text, successMessage = 'Copied to clipboard') {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            Utils.showToast(successMessage, 'success');
        } catch {
            Utils.showToast('Could not copy to clipboard', 'error');
        } finally {
            document.body.removeChild(textarea);
        }
    }

    /**
     * Paste the copied animation onto the selected object (or source object)
     * at the current playhead position.
     */
    pasteAnimation(targetObjId, atTime) {
        if (!this._copiedAnim) {
            Utils.showToast('No animation copied. Select a bar and press Ctrl+C first.', 'warning');
            return;
        }

        // Determine target object
        const objId = targetObjId
            || (this.objects.selectedIds.length === 1 ? this.objects.selectedIds[0] : null)
            || this._copiedAnim.sourceObjId;
        const obj = this.objects.getObjectById(objId);
        if (!obj) {
            Utils.showToast('Select a target object to paste onto', 'warning');
            return;
        }

        const cloned = JSON.parse(JSON.stringify(this._copiedAnim.animData));
        cloned.id = Utils.generateId('anim');

        // Place at playhead time, or provided time
        const pasteTime = (atTime != null) ? atTime : (this.animations.currentTime || 0);
        cloned.delay = Math.round(pasteTime);
        if (cloned.params) cloned.params.delay = pasteTime / 1000;

        obj.animations.push(cloned);

        eventBus.emit('history:push');

        this.selectedAnimId = cloned.id;
        this.selectedAnimObjId = objId;

        this.animations.updateCodeOutput();
        eventBus.emit('timeline:update');
        Utils.showToast(`Pasted "${cloned.name}" at ${Utils.formatTime(pasteTime)}`, 'success');

        // Auto-revert to select cursor after 5 seconds
        if (this.objects._startAutoRevertToSelect) {
            this.objects._startAutoRevertToSelect(5000);
        }
    }

    /**
     * Duplicate a single animation bar, placing the copy right after the original.
     */
    duplicateAnimation(objId, animId) {
        const obj = this.objects.getObjectById(objId);
        if (!obj) return;
        const anim = obj.animations.find(a => a.id === animId);
        if (!anim) return;

        const cloned = JSON.parse(JSON.stringify(anim));
        cloned.id = Utils.generateId('anim');

        // Place the duplicate right after the original ends
        const configs = Array.isArray(anim.generated) ? anim.generated : [anim.generated];
        const dur = configs[0]?.duration || 1000;
        const repeatCount = anim.repeat === '-1' ? 1 : (anim.repeat === 'pingpong' ? 2 : Math.max(1, parseInt(anim.repeat) || 1));
        const totalDur = dur * repeatCount;
        const newDelay = (anim.delay || 0) + totalDur;

        cloned.delay = Math.round(newDelay);
        if (cloned.params) cloned.params.delay = newDelay / 1000;

        obj.animations.push(cloned);

        eventBus.emit('history:push');

        this.selectedAnimId = cloned.id;
        this.selectedAnimObjId = objId;

        this.animations.updateCodeOutput();
        eventBus.emit('timeline:update');
        Utils.showToast(`Duplicated "${cloned.name}"`, 'success');
    }

    /**
     * Repeat (loop) an animation N times by duplicating it end-to-end.
     */
    repeatAnimation(objId, animId, times) {
        const obj = this.objects.getObjectById(objId);
        if (!obj) return;
        const anim = obj.animations.find(a => a.id === animId);
        if (!anim) return;

        const configs = Array.isArray(anim.generated) ? anim.generated : [anim.generated];
        const dur = configs[0]?.duration || 1000;
        const repeatCount = anim.repeat === '-1' ? 1 : (anim.repeat === 'pingpong' ? 2 : Math.max(1, parseInt(anim.repeat) || 1));
        const totalDur = dur * repeatCount;

        for (let i = 1; i <= times; i++) {
            const cloned = JSON.parse(JSON.stringify(anim));
            cloned.id = Utils.generateId('anim');
            const newDelay = (anim.delay || 0) + totalDur * i;
            cloned.delay = Math.round(newDelay);
            if (cloned.params) cloned.params.delay = newDelay / 1000;
            obj.animations.push(cloned);
        }

        if (window.app?.history) {
            eventBus.emit('history:push');
        }

        this.animations.updateCodeOutput();
        eventBus.emit('timeline:update');
        Utils.showToast(`Repeated "${anim.name}" ×${times}`, 'success');
    }

    /**
     * Set the repeat mode (restart vs cycle) for an animation.
     */
    setRepeatMode(objId, animId, mode) {
        const obj = this.objects.getObjectById(objId);
        if (!obj) return;
        const anim = obj.animations.find(a => a.id === animId);
        if (!anim) return;

        anim.repeatMode = mode;
        if (anim.params) anim.params.repeatMode = mode;

        if (window.app?.history) eventBus.emit('history:push');
        this.animations.updateCodeOutput();
        eventBus.emit('timeline:update');
        Utils.showToast(`Repeat style: ${mode === 'cycle' ? 'Smooth Cycle' : 'Hard Reset'}`, 'success');
    }

    /**
     * Set the repeat count for an animation directly.
     */
    setRepeatCount(objId, animId, value) {
        const obj = this.objects.getObjectById(objId);
        if (!obj) return;
        const anim = obj.animations.find(a => a.id === animId);
        if (!anim) return;

        anim.repeat = value;
        if (anim.params) anim.params.repeat = value;

        if (window.app?.history) eventBus.emit('history:push');
        this.animations.updateCodeOutput();
        eventBus.emit('timeline:update');
        Utils.showToast(`Repeat count set to ${value === '-1' ? '∞' : value}`, 'success');
    }

    _showSelectedBarsGroupMenu(e) {
        const targets = this._getSelectedAnimationTargets();
        if (targets.length < 2) {
            Utils.showToast('Select multiple animation bars with Ctrl-click or Shift-click first.', 'info');
            return;
        }
        e?.preventDefault?.();
        e?.stopPropagation?.();

        document.querySelectorAll('.context-menu, .context-submenu').forEach(m => m.remove());

        const menu = document.createElement('div');
        menu.className = 'context-menu tl-group-action-menu tl-scroll-menu';
        menu.innerHTML = `
            <div class="context-menu-item ctx-heading">
                <i class="fas fa-layer-group"></i> ${targets.length} Selected Bars
            </div>
            <div class="context-menu-divider"></div>
            <div class="context-menu-item has-submenu" data-action="duration">
                <i class="fas fa-clock"></i> Duration
                <span class="ctx-arrow"><i class="fas fa-chevron-right"></i></span>
            </div>
            <div class="context-menu-item has-submenu" data-action="repeat-count">
                <i class="fas fa-redo"></i> Repeat Count
                <span class="ctx-arrow"><i class="fas fa-chevron-right"></i></span>
            </div>
            <div class="context-menu-item has-submenu" data-action="repeat-mode">
                <i class="fas fa-sync-alt"></i> Repeat Style
                <span class="ctx-arrow"><i class="fas fa-chevron-right"></i></span>
            </div>
            <div class="context-menu-divider"></div>
            <div class="context-menu-item" data-action="align-start">
                <i class="fas fa-align-left"></i> Start Together at Playhead
            </div>
            <div class="context-menu-item" data-action="sequence">
                <i class="fas fa-arrow-right-long"></i> Sequence Selected Bars
            </div>
            <div class="context-menu-divider"></div>
            <div class="context-menu-item" data-action="copy">
                <i class="fas fa-copy"></i> Copy Selected JSON
            </div>
            <div class="context-menu-item" data-action="duplicate">
                <i class="fas fa-clone"></i> Duplicate Selected
                <span class="ctx-shortcut">Ctrl+D</span>
            </div>
            <div class="context-menu-item" data-action="clear-selection">
                <i class="fas fa-times-circle"></i> Clear Selection
            </div>
            <div class="context-menu-divider"></div>
            <div class="context-menu-item" data-action="delete">
                <i class="fas fa-trash"></i> Delete Selected
                <span class="ctx-shortcut">Del</span>
            </div>
        `;

        const buttonRect = document.getElementById('tl-group-actions')?.getBoundingClientRect();
        const x = e?.clientX ?? buttonRect?.left ?? 16;
        const y = e?.clientY ?? buttonRect?.bottom ?? 48;
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        document.body.appendChild(menu);
        const rect = menu.getBoundingClientRect();
        if (rect.right > window.innerWidth) menu.style.left = (window.innerWidth - rect.width - 4) + 'px';
        if (rect.bottom > window.innerHeight) menu.style.top = (window.innerHeight - rect.height - 4) + 'px';

        const createSubmenu = (parentItem) => {
            if (parentItem._activeSubmenu && parentItem._activeSubmenu.isConnected) return parentItem._activeSubmenu;
            document.querySelectorAll('.context-submenu').forEach(s => s.remove());
            const sub = document.createElement('div');
            sub.className = 'context-submenu tl-scroll-menu';
            const itemRect = parentItem.getBoundingClientRect();
            sub.style.left = (itemRect.right + 2) + 'px';
            sub.style.top = itemRect.top + 'px';
            document.body.appendChild(sub);
            parentItem._activeSubmenu = sub;
            return sub;
        };
        const clampSubmenu = (sub, parentItem) => {
            const subRect = sub.getBoundingClientRect();
            const itemRect = parentItem.getBoundingClientRect();
            if (subRect.right > window.innerWidth) sub.style.left = (itemRect.left - subRect.width - 2) + 'px';
            if (subRect.bottom > window.innerHeight) sub.style.top = (window.innerHeight - subRect.height - 4) + 'px';
        };
        const closeMenus = () => document.querySelectorAll('.context-menu, .context-submenu').forEach(m => m.remove());
        const wireLeave = (parentItem) => {
            parentItem.addEventListener('mouseleave', () => {
                setTimeout(() => {
                    const sub = parentItem._activeSubmenu;
                    if (sub && sub.isConnected && !sub.matches(':hover') && !parentItem.matches(':hover')) {
                        sub.remove();
                        parentItem._activeSubmenu = null;
                    }
                }, 250);
            });
        };

        const durationItem = menu.querySelector('[data-action="duration"]');
        durationItem?.addEventListener('mouseenter', () => {
            const sub = createSubmenu(durationItem);
            sub.innerHTML = `
                <div class="context-menu-item" data-scale="0.5"><i class="fas fa-compress"></i> 50% Shorter</div>
                <div class="context-menu-item" data-scale="0.75"><i class="fas fa-compress"></i> 25% Shorter</div>
                <div class="context-menu-item" data-scale="1.25"><i class="fas fa-expand"></i> 25% Longer</div>
                <div class="context-menu-item" data-scale="1.5"><i class="fas fa-expand"></i> 50% Longer</div>
                <div class="context-menu-divider"></div>
                <div class="context-menu-item" data-duration="custom"><i class="fas fa-stopwatch"></i> Set Exact Duration...</div>
            `;
            clampSubmenu(sub, durationItem);
            sub.querySelectorAll('[data-scale]').forEach(item => {
                item.addEventListener('click', () => {
                    this.scaleSelectedAnimationDurations(parseFloat(item.dataset.scale));
                    closeMenus();
                });
            });
            sub.querySelector('[data-duration="custom"]')?.addEventListener('click', () => {
                const input = prompt('Set selected animation duration in seconds:', '1');
                if (input !== null) this.setSelectedAnimationDuration(parseFloat(input));
                closeMenus();
            });
        });
        if (durationItem) wireLeave(durationItem);

        const repeatCountItem = menu.querySelector('[data-action="repeat-count"]');
        repeatCountItem?.addEventListener('mouseenter', () => {
            const sub = createSubmenu(repeatCountItem);
            sub.innerHTML = [
                { val: '1', label: 'Once' },
                { val: '2', label: '2x' },
                { val: '3', label: '3x' },
                { val: '5', label: '5x' },
                { val: '10', label: '10x' },
                { val: '-1', label: 'Infinite' }
            ].map(item => `<div class="context-menu-item" data-repeat="${item.val}"><i class="fas fa-redo"></i> ${item.label}</div>`).join('')
                + `<div class="context-menu-divider"></div><div class="context-menu-item" data-repeat="custom"><i class="fas fa-hashtag"></i> Custom...</div>`;
            clampSubmenu(sub, repeatCountItem);
            sub.querySelectorAll('[data-repeat]').forEach(item => {
                item.addEventListener('click', () => {
                    let value = item.dataset.repeat;
                    if (value === 'custom') {
                        const input = prompt('Repeat count (number, or -1 for infinite):', '2');
                        if (input === null) return;
                        value = input.trim();
                    }
                    this.setSelectedRepeatCount(value);
                    closeMenus();
                });
            });
        });
        if (repeatCountItem) wireLeave(repeatCountItem);

        const repeatModeItem = menu.querySelector('[data-action="repeat-mode"]');
        repeatModeItem?.addEventListener('mouseenter', () => {
            const sub = createSubmenu(repeatModeItem);
            sub.innerHTML = `
                <div class="context-menu-item" data-mode="restart"><i class="fas fa-step-forward"></i> Hard Reset</div>
                <div class="context-menu-item" data-mode="cycle"><i class="fas fa-exchange-alt"></i> Smooth Cycle</div>
            `;
            clampSubmenu(sub, repeatModeItem);
            sub.querySelectorAll('[data-mode]').forEach(item => {
                item.addEventListener('click', () => {
                    this.setSelectedRepeatMode(item.dataset.mode);
                    closeMenus();
                });
            });
        });
        if (repeatModeItem) wireLeave(repeatModeItem);

        menu.querySelector('[data-action="align-start"]')?.addEventListener('click', () => {
            this.alignSelectedAnimationStarts(this.animations.currentTime || 0);
            closeMenus();
        });
        menu.querySelector('[data-action="sequence"]')?.addEventListener('click', () => {
            const input = prompt('Gap between selected bars in seconds:', '0');
            if (input !== null) this.sequenceSelectedAnimations(Math.max(0, parseFloat(input) || 0) * 1000);
            closeMenus();
        });
        menu.querySelector('[data-action="copy"]')?.addEventListener('click', () => {
            this.copySelectedAnimations();
            closeMenus();
        });
        menu.querySelector('[data-action="duplicate"]')?.addEventListener('click', () => {
            this.duplicateSelectedAnimations();
            closeMenus();
        });
        menu.querySelector('[data-action="clear-selection"]')?.addEventListener('click', () => {
            this.selectedAnimKeys.clear();
            this.selectedAnimId = null;
            this.selectedAnimObjId = null;
            this.lastSelectedAnimKey = null;
            this._syncSelectedAnimationBarsUi();
            closeMenus();
        });
        menu.querySelector('[data-action="delete"]')?.addEventListener('click', () => {
            this.deleteSelectedAnimations();
            closeMenus();
        });
    }

    /**
     * Show a context menu on right-click of a timeline bar.
     */
    _showBarContextMenu(e, objId, animId) {
        e.preventDefault();
        e.stopPropagation();

        // Remove any existing context menus
        document.querySelectorAll('.context-menu, .context-submenu').forEach(m => m.remove());

        const obj = this.objects.getObjectById(objId);
        const anim = obj?.animations.find(a => a.id === animId);
        if (!anim) return;

        const hasCopied = !!this._copiedAnim;
        const currentRepeatMode = anim.repeatMode || 'restart';
        const armatureAction = window.app?.jointSystem?._getArmatureRecordedAction(anim._armatureActionId);
        const lipSyncConfig = this._getAudioLipSyncConfig(anim);
        const lipSyncAction = lipSyncConfig
            ? `<div class="context-menu-item" data-action="edit-lip-sync">
                <i class="fas ${lipSyncConfig.audioRefreshRequired === true ? 'fa-rotate' : 'fa-wave-square'}"></i>
                ${lipSyncConfig.audioRefreshRequired === true ? 'Refresh' : 'Edit'} Lip Sync
            </div><div class="context-menu-divider"></div>`
            : '';

        const menu = document.createElement('div');
        menu.className = 'context-menu tl-scroll-menu';
        menu.innerHTML = `
            ${lipSyncAction}
            ${window.Realistic3DLibrary?.canEdit(obj, anim) ? '<div class="context-menu-item" data-action="edit-3d"><i class="fas fa-pen"></i> Edit 3D Action or Route</div><div class="context-menu-divider"></div>' : ''}
            ${armatureAction?.recipe ? `<div class="context-menu-item" data-action="edit-armature"><i class="fas fa-pen"></i> ${armatureAction.recipe.choreography ? 'Edit Choreography' : armatureAction.recipe.sequence ? 'Edit Character Sequence' : 'Edit Character Action'}</div><div class="context-menu-divider"></div>` : ''}
            ${armatureAction?.recipe?.spec?.kind === 'movement' && window.app?.jointSystem?._canUseArmatureDebugger?.() ? '<div class="context-menu-item" data-action="debug-armature"><i class="fas fa-bug"></i> Debug Movement Source</div>' : ''}
            <div class="context-menu-item" data-action="copy">
                <i class="fas fa-copy"></i> Copy Animation
                <span class="ctx-shortcut">⌘C</span>
            </div>
            <div class="context-menu-item${hasCopied ? '' : ' ctx-disabled'}" data-action="paste-here">
                <i class="fas fa-paste"></i> Paste Here (after this)
                <span class="ctx-shortcut">⌘V</span>
            </div>
            <div class="context-menu-divider"></div>
            <div class="context-menu-item" data-action="duplicate">
                <i class="fas fa-clone"></i> Duplicate
                <span class="ctx-shortcut">⌘D</span>
            </div>
            <div class="context-menu-item has-submenu" data-action="repeat">
                <i class="fas fa-redo"></i> Repeat…
                <span class="ctx-arrow"><i class="fas fa-chevron-right"></i></span>
            </div>
            <div class="context-menu-item has-submenu" data-action="repeat-mode">
                <i class="fas fa-sync-alt"></i> Repeat Style
                <span class="ctx-arrow"><i class="fas fa-chevron-right"></i></span>
            </div>
            <div class="context-menu-divider"></div>
            <div class="context-menu-item has-submenu" data-action="set-repeat-count">
                <i class="fas fa-hashtag"></i> Set Repeat Count…
                <span class="ctx-arrow"><i class="fas fa-chevron-right"></i></span>
            </div>
            <div class="context-menu-divider"></div>
            <div class="context-menu-item" data-action="split">
                <i class="fas fa-cut"></i> Split at Playhead
                <span class="ctx-shortcut">S</span>
            </div>
            <div class="context-menu-item" data-action="trim-start">
                <i class="fas fa-arrow-right"></i> Trim Start to Playhead
            </div>
            <div class="context-menu-item" data-action="trim-end">
                <i class="fas fa-arrow-left"></i> Trim End to Playhead
            </div>
            <div class="context-menu-item" data-action="combine">
                <i class="fas fa-link"></i> Combine with Next
            </div>
            <div class="context-menu-divider"></div>
            <div class="context-menu-item" data-action="delete">
                <i class="fas fa-trash"></i> Delete
                <span class="ctx-shortcut">Del</span>
            </div>
        `;

        // Position the menu
        menu.style.left = e.clientX + 'px';
        menu.style.top = e.clientY + 'px';
        document.body.appendChild(menu);

        // Clamp to viewport
        const rect = menu.getBoundingClientRect();
        if (rect.right > window.innerWidth) menu.style.left = (window.innerWidth - rect.width - 4) + 'px';
        if (rect.bottom > window.innerHeight) menu.style.top = (window.innerHeight - rect.height - 4) + 'px';

        // Action handlers
        menu.querySelector('[data-action="edit-3d"]')?.addEventListener('click', () => {
            menu.remove();
            window.Realistic3DLibrary.open(window.app,obj,anim.id);
        });
        menu.querySelector('[data-action="edit-lip-sync"]')?.addEventListener('click', () => {
            this._openAudioLipSyncAnimation(anim);
            menu.remove();
        });
        menu.querySelector('[data-action="copy"]').addEventListener('click', () => {
            this.copyAnimation(objId, animId);
            menu.remove();
        });

        menu.querySelector('[data-action="paste-here"]').addEventListener('click', () => {
            if (!this._copiedAnim) return;
            // Paste right after this bar ends
            const configs = Array.isArray(anim.generated) ? anim.generated : [anim.generated];
            const dur = configs[0]?.duration || 1000;
            const rpt = anim.repeat === '-1' ? 1 : (anim.repeat === 'pingpong' ? 2 : Math.max(1, parseInt(anim.repeat) || 1));
            const afterTime = (anim.delay || 0) + dur * rpt;
            this.pasteAnimation(objId, afterTime);
            menu.remove();
        });

        menu.querySelector('[data-action="duplicate"]').addEventListener('click', () => {
            this.duplicateAnimation(objId, animId);
            menu.remove();
        });

        // Helper: create submenu and position it relative to parent item
        const _createSubmenu = (parentItem) => {
            // If this parent already owns a submenu, just return it
            if (parentItem._activeSubmenu && parentItem._activeSubmenu.isConnected) {
                return parentItem._activeSubmenu;
            }
            document.querySelectorAll('.context-submenu').forEach(s => s.remove());
            const sub = document.createElement('div');
            sub.className = 'context-submenu tl-scroll-menu';
            const itemRect = parentItem.getBoundingClientRect();
            sub.style.left = (itemRect.right + 2) + 'px';
            sub.style.top = itemRect.top + 'px';
            document.body.appendChild(sub);
            parentItem._activeSubmenu = sub;
            return sub;
        };
        const _clampSubmenu = (sub, parentItem) => {
            const subRect = sub.getBoundingClientRect();
            const itemRect = parentItem.getBoundingClientRect();
            if (subRect.right > window.innerWidth) sub.style.left = (itemRect.left - subRect.width - 2) + 'px';
            if (subRect.bottom > window.innerHeight) sub.style.top = (window.innerHeight - subRect.height - 4) + 'px';
        };
        const _submenuLeave = (parentItem) => {
            parentItem.addEventListener('mouseleave', () => {
                setTimeout(() => {
                    const sub = parentItem._activeSubmenu;
                    if (sub && sub.isConnected && !sub.matches(':hover') && !parentItem.matches(':hover')) {
                        sub.remove();
                        parentItem._activeSubmenu = null;
                    }
                }, 250);
            });
        };

        // Repeat (duplicate N copies) submenu
        const repeatItem = menu.querySelector('[data-action="repeat"]');
        repeatItem.addEventListener('mouseenter', () => {
            const sub = _createSubmenu(repeatItem);
            sub.innerHTML = [2, 3, 4, 5, 8, 10].map(n =>
                `<div class="context-menu-item" data-repeat="${n}"><i class="fas fa-redo"></i> ×${n} (${n} copies)</div>`
            ).join('') + `<div class="context-menu-divider"></div>
            <div class="context-menu-item" data-repeat="custom"><i class="fas fa-hashtag"></i> Custom…</div>`;
            _clampSubmenu(sub, repeatItem);

            sub.querySelectorAll('[data-repeat]').forEach(item => {
                item.addEventListener('click', () => {
                    const val = item.dataset.repeat;
                    if (val === 'custom') {
                        const input = prompt('How many copies?', '3');
                        const n = parseInt(input);
                        if (n > 0 && n <= 100) {
                            this.repeatAnimation(objId, animId, n);
                        }
                    } else {
                        this.repeatAnimation(objId, animId, parseInt(val));
                    }
                    sub.remove();
                    menu.remove();
                });
            });
            sub.addEventListener('mouseleave', () => {
                setTimeout(() => {
                    if (sub.isConnected && !sub.matches(':hover') && !repeatItem.matches(':hover')) sub.remove();
                }, 250);
            });
        });
        _submenuLeave(repeatItem);

        // Repeat Style submenu (Hard Reset vs Smooth Cycle)
        const repeatModeItem = menu.querySelector('[data-action="repeat-mode"]');
        repeatModeItem.addEventListener('mouseenter', () => {
            const sub = _createSubmenu(repeatModeItem);
            sub.innerHTML = `
                <div class="context-menu-item${currentRepeatMode === 'restart' ? ' ctx-active' : ''}" data-mode="restart">
                    <i class="fas fa-step-forward"></i> Hard Reset
                    <span class="ctx-hint">Jumps back to start</span>
                </div>
                <div class="context-menu-item${currentRepeatMode === 'cycle' ? ' ctx-active' : ''}" data-mode="cycle">
                    <i class="fas fa-exchange-alt"></i> Smooth Cycle
                    <span class="ctx-hint">Smoothly reverses back</span>
                </div>
            `;
            _clampSubmenu(sub, repeatModeItem);

            sub.querySelectorAll('[data-mode]').forEach(item => {
                item.addEventListener('click', () => {
                    this.setRepeatMode(objId, animId, item.dataset.mode);
                    sub.remove();
                    menu.remove();
                });
            });
            sub.addEventListener('mouseleave', () => {
                setTimeout(() => {
                    if (sub.isConnected && !sub.matches(':hover') && !repeatModeItem.matches(':hover')) sub.remove();
                }, 250);
            });
        });
        _submenuLeave(repeatModeItem);

        // Set Repeat Count submenu (changes the repeat property directly)
        const setRepeatItem = menu.querySelector('[data-action="set-repeat-count"]');
        setRepeatItem.addEventListener('mouseenter', () => {
            const sub = _createSubmenu(setRepeatItem);
            const currentRepeat = anim.repeat || '1';
            sub.innerHTML = [
                { val: '1', label: 'Once (no repeat)' },
                { val: '2', label: '2×' },
                { val: '3', label: '3×' },
                { val: '5', label: '5×' },
                { val: '10', label: '10×' },
                { val: '-1', label: 'Infinite ∞' }
            ].map(o =>
                `<div class="context-menu-item${currentRepeat === o.val ? ' ctx-active' : ''}" data-rcount="${o.val}"><i class="fas fa-redo"></i> ${o.label}</div>`
            ).join('') + `<div class="context-menu-divider"></div>
            <div class="context-menu-item" data-rcount="custom"><i class="fas fa-hashtag"></i> Custom…</div>`;
            _clampSubmenu(sub, setRepeatItem);

            sub.querySelectorAll('[data-rcount]').forEach(item => {
                item.addEventListener('click', () => {
                    let val = item.dataset.rcount;
                    if (val === 'custom') {
                        const input = prompt('Repeat count (number, or -1 for infinite):', currentRepeat);
                        if (input === null) { sub.remove(); return; }
                        val = input.trim();
                    }
                    this.setRepeatCount(objId, animId, val);
                    sub.remove();
                    menu.remove();
                });
            });
            sub.addEventListener('mouseleave', () => {
                setTimeout(() => {
                    if (sub.isConnected && !sub.matches(':hover') && !setRepeatItem.matches(':hover')) sub.remove();
                }, 250);
            });
        });
        _submenuLeave(setRepeatItem);

        // --- Split at Playhead ---
        menu.querySelector('[data-action="split"]')?.addEventListener('click', () => {
            this.splitAnimation(objId, animId, this.animations.currentTime);
            menu.remove();
        });

        // --- Trim Start (move start to playhead) ---
        menu.querySelector('[data-action="trim-start"]')?.addEventListener('click', () => {
            this.trimAnimationStart(objId, animId, this.animations.currentTime);
            menu.remove();
        });

        // --- Trim End (move end to playhead) ---
        menu.querySelector('[data-action="trim-end"]')?.addEventListener('click', () => {
            this.trimAnimationEnd(objId, animId, this.animations.currentTime);
            menu.remove();
        });

        // --- Combine with Next ---
        menu.querySelector('[data-action="combine"]')?.addEventListener('click', () => {
            this.combineWithNext(objId, animId);
            menu.remove();
        });

        menu.querySelector('[data-action="delete"]').addEventListener('click', () => {
            this.deleteAnimation(objId, animId);
            menu.remove();
        });
        menu.querySelector('[data-action="edit-armature"]')?.addEventListener('click', () => {
            menu.remove();
            window.app.jointSystem._editArmatureRecordedAction(anim._armatureActionId);
        });
        menu.querySelector('[data-action="debug-armature"]')?.addEventListener('click', () => {
            menu.remove();
            window.app.jointSystem._debugArmatureRecordedAction(anim._armatureActionId);
        });
    }

    // ═══════════════════════════════════════════
    //  Split / Trim / Combine  — timeline editing
    // ═══════════════════════════════════════════

    /**
     * Compute the total duration (ms) of a single cycle of an animation
     * (i.e. the maxEnd across all generated configs).
     */
    _getAnimSingleDuration(anim) {
        const configs = Array.isArray(anim.generated) ? anim.generated : [anim.generated];
        let maxEnd = 0;
        configs.forEach(cfg => {
            if (!cfg || !cfg.duration) return;
            if (cfg.property === '_chainType') return;
            maxEnd = Math.max(maxEnd, (cfg._stepDelay || 0) + cfg.duration);
        });
        return maxEnd;
    }

    _getAnimRepeatCount(anim) {
        if (anim.repeat === '-1') return 3; // treat infinite as 3 for split/trim
        if (anim.repeat === 'pingpong') return 2;
        return Math.max(1, parseInt(anim.repeat) || 1);
    }

    /**
     * Split an animation bar at a given time (ms).
     * Creates two animations: one ending at splitTime, one starting at splitTime.
     */
    splitAnimation(objId, animId, splitTimeMs) {
        const obj = this.objects.getObjectById(objId);
        if (!obj) return;
        const anim = obj.animations.find(a => a.id === animId);
        if (!anim) return;

        const animStart = anim.delay || 0;
        const singleDur = this._getAnimSingleDuration(anim);
        const repeatCount = this._getAnimRepeatCount(anim);
        const totalDur = singleDur * repeatCount;
        const animEnd = animStart + totalDur;

        // Validate split point is inside the bar
        if (splitTimeMs <= animStart || splitTimeMs >= animEnd) {
            Utils.showToast('Playhead must be inside the animation bar to split', 'warning');
            return;
        }

        eventBus.emit('history:push');

        const leftDur = splitTimeMs - animStart;
        const rightDur = animEnd - splitTimeMs;

        // Clone for Left part (plays from original start, shorter duration)
        const leftAnim = JSON.parse(JSON.stringify(anim));
        leftAnim.id = Utils.generateId('anim');
        leftAnim.name = anim.name + ' (L)';
        leftAnim.repeat = '1';
        if (leftAnim.params) leftAnim.params.repeat = '1';
        this._scaleDuration(leftAnim, leftDur);

        // Clone for Right part (plays from splitTime, shorter duration)
        const rightAnim = JSON.parse(JSON.stringify(anim));
        rightAnim.id = Utils.generateId('anim');
        rightAnim.name = anim.name + ' (R)';
        rightAnim.delay = Math.round(splitTimeMs);
        rightAnim.repeat = '1';
        if (rightAnim.params) {
            rightAnim.params.delay = splitTimeMs / 1000;
            rightAnim.params.repeat = '1';
        }
        this._scaleDuration(rightAnim, rightDur);
        this._shiftAnimationProgress(rightAnim, leftDur / totalDur);

        // Replace original with the two halves
        const idx = obj.animations.findIndex(a => a.id === animId);
        obj.animations.splice(idx, 1, leftAnim, rightAnim);

        this.selectedAnimId = leftAnim.id;
        this.selectedAnimObjId = objId;

        this.animations.updateCodeOutput();
        eventBus.emit('timeline:update');
        Utils.showToast(`Split "${anim.name}" at ${Utils.formatTime(splitTimeMs)}`, 'success');
    }

    /**
     * Scale all generated config durations so the total anim duration equals newDurMs.
     */
    _scaleDuration(anim, newDurMs) {
        const oldDur = this._getAnimSingleDuration(anim);
        if (oldDur <= 0) return;
        const scale = newDurMs / oldDur;
        const configs = Array.isArray(anim.generated) ? anim.generated : [anim.generated];
        configs.forEach(cfg => {
            if (!cfg || !cfg.duration) return;
            cfg.duration = Math.round(cfg.duration * scale);
            if (cfg._stepDelay) cfg._stepDelay = Math.round(cfg._stepDelay * scale);
        });
        if (anim.params) {
            anim.params.duration = newDurMs / 1000;
        }
    }

    /**
     * For the "right half" after a split, shift the starting values to
     * where the animation would have been at the given progress (0–1).
     * Only affects property-based animations with numeric from/to.
     */
    _shiftAnimationProgress(anim, progress) {
        const configs = Array.isArray(anim.generated) ? anim.generated : [anim.generated];
        configs.forEach(cfg => {
            if (!cfg) return;
            // For standard property animations with numeric from/to
            if (cfg.from !== undefined && cfg.to !== undefined &&
                typeof cfg.from === 'number' && typeof cfg.to === 'number') {
                const newFrom = cfg.from + (cfg.to - cfg.from) * progress;
                cfg.from = newFrom;
            }
            // For keyframe-based animations, trim keyframes to the right portion
            if (cfg.keyframes && cfg.keyframes.length > 1) {
                const newKfs = [];
                cfg.keyframes.forEach(kf => {
                    if (kf.t >= progress) {
                        const newT = (kf.t - progress) / (1 - progress);
                        newKfs.push({ ...kf, t: Math.max(0, Math.min(1, newT)) });
                    }
                });
                // Ensure we have at least start/end
                if (newKfs.length === 0 || newKfs[0].t > 0) {
                    // Interpolate a keyframe at the split point
                    const kfs = cfg.keyframes;
                    for (let i = 0; i < kfs.length - 1; i++) {
                        if (progress >= kfs[i].t && progress <= kfs[i + 1].t) {
                            const localT = (progress - kfs[i].t) / (kfs[i + 1].t - kfs[i].t);
                            const interpKf = { t: 0 };
                            if (kfs[i].value !== undefined && kfs[i + 1].value !== undefined) {
                                interpKf.value = kfs[i].value + (kfs[i + 1].value - kfs[i].value) * localT;
                            }
                            if (kfs[i].values) {
                                interpKf.values = {};
                                for (const k of Object.keys(kfs[i].values)) {
                                    if (kfs[i + 1].values?.[k] !== undefined) {
                                        interpKf.values[k] = kfs[i].values[k] + (kfs[i + 1].values[k] - kfs[i].values[k]) * localT;
                                    }
                                }
                            }
                            newKfs.unshift(interpKf);
                            break;
                        }
                    }
                }
                if (newKfs.length >= 1) cfg.keyframes = newKfs;
            }
        });
    }

    /**
     * Trim animation so it starts at the playhead.
     * Removes the portion before the playhead.
     */
    trimAnimationStart(objId, animId, trimTimeMs) {
        const obj = this.objects.getObjectById(objId);
        if (!obj) return;
        const anim = obj.animations.find(a => a.id === animId);
        if (!anim) return;

        const animStart = anim.delay || 0;
        const singleDur = this._getAnimSingleDuration(anim);
        const repeatCount = this._getAnimRepeatCount(anim);
        const totalDur = singleDur * repeatCount;
        const animEnd = animStart + totalDur;

        if (trimTimeMs <= animStart || trimTimeMs >= animEnd) {
            Utils.showToast('Playhead must be inside the animation to trim', 'warning');
            return;
        }

        if (window.app?.history) eventBus.emit('history:push');

        const cutAmount = trimTimeMs - animStart;
        const progress = cutAmount / totalDur;

        // Shift from values and update delay
        this._shiftAnimationProgress(anim, progress);
        anim.delay = Math.round(trimTimeMs);
        if (anim.params) anim.params.delay = trimTimeMs / 1000;
        anim.repeat = '1';
        if (anim.params) anim.params.repeat = '1';
        this._scaleDuration(anim, animEnd - trimTimeMs);

        this.animations.updateCodeOutput();
        eventBus.emit('timeline:update');
        Utils.showToast(`Trimmed start of "${anim.name}" to ${Utils.formatTime(trimTimeMs)}`, 'success');
    }

    /**
     * Trim animation so it ends at the playhead.
     * Removes the portion after the playhead.
     */
    trimAnimationEnd(objId, animId, trimTimeMs) {
        const obj = this.objects.getObjectById(objId);
        if (!obj) return;
        const anim = obj.animations.find(a => a.id === animId);
        if (!anim) return;

        const animStart = anim.delay || 0;
        const singleDur = this._getAnimSingleDuration(anim);
        const repeatCount = this._getAnimRepeatCount(anim);
        const totalDur = singleDur * repeatCount;
        const animEnd = animStart + totalDur;

        if (trimTimeMs <= animStart || trimTimeMs >= animEnd) {
            Utils.showToast('Playhead must be inside the animation to trim', 'warning');
            return;
        }

        if (window.app?.history) eventBus.emit('history:push');

        const newDur = trimTimeMs - animStart;
        anim.repeat = '1';
        if (anim.params) anim.params.repeat = '1';
        this._scaleDuration(anim, newDur);

        // Trim keyframes beyond the new end
        const configs = Array.isArray(anim.generated) ? anim.generated : [anim.generated];
        const progress = newDur / totalDur;
        configs.forEach(cfg => {
            if (cfg?.keyframes && cfg.keyframes.length > 1) {
                cfg.keyframes = cfg.keyframes.filter(kf => kf.t <= 1);
            }
        });

        this.animations.updateCodeOutput();
        eventBus.emit('timeline:update');
        Utils.showToast(`Trimmed end of "${anim.name}" to ${Utils.formatTime(trimTimeMs)}`, 'success');
    }

    /**
     * Combine two adjacent animations of the same type into one.
     * Finds the next animation on the same object that starts at or near
     * this animation's end, and merges them.
     */
    combineWithNext(objId, animId) {
        const obj = this.objects.getObjectById(objId);
        if (!obj) return;
        const anim = obj.animations.find(a => a.id === animId);
        if (!anim) return;

        const animStart = anim.delay || 0;
        const singleDur = this._getAnimSingleDuration(anim);
        const repeatCount = this._getAnimRepeatCount(anim);
        const animEnd = animStart + singleDur * repeatCount;

        // Find the next animation of the same type that starts near animEnd
        const tolerance = 100; // 100ms tolerance
        const candidates = obj.animations.filter(a =>
            a.id !== animId &&
            a.type === anim.type &&
            Math.abs((a.delay || 0) - animEnd) <= tolerance
        );

        if (candidates.length === 0) {
            Utils.showToast('No adjacent animation of the same type found to combine', 'warning');
            return;
        }

        // Pick the nearest candidate
        candidates.sort((a, b) => Math.abs((a.delay || 0) - animEnd) - Math.abs((b.delay || 0) - animEnd));
        const nextAnim = candidates[0];

        if (window.app?.history) eventBus.emit('history:push');

        const nextDur = this._getAnimSingleDuration(nextAnim) * this._getAnimRepeatCount(nextAnim);
        const combinedDur = (animEnd - animStart) + nextDur;

        // For property-based animations, update the "to" value
        const configs = Array.isArray(anim.generated) ? anim.generated : [anim.generated];
        const nextConfigs = Array.isArray(nextAnim.generated) ? nextAnim.generated : [nextAnim.generated];

        configs.forEach((cfg, i) => {
            if (!cfg) return;
            const nextCfg = nextConfigs[i];
            if (nextCfg && cfg.to !== undefined && nextCfg.to !== undefined &&
                typeof cfg.to === 'number' && typeof nextCfg.to === 'number') {
                cfg.to = nextCfg.to;
            }
            // Merge keyframes if both have them
            if (cfg.keyframes && nextCfg?.keyframes) {
                const firstPortion = (animEnd - animStart) / combinedDur;
                // Re-scale existing keyframes to first portion
                const rescaled = cfg.keyframes.map(kf => ({ ...kf, t: kf.t * firstPortion }));
                // Add next anim's keyframes, scaled to second portion
                nextCfg.keyframes.forEach(kf => {
                    if (kf.t > 0) { // skip the duplicate t=0
                        rescaled.push({ ...kf, t: firstPortion + kf.t * (1 - firstPortion) });
                    }
                });
                cfg.keyframes = rescaled;
            }
        });

        // Scale to combined duration
        anim.repeat = '1';
        if (anim.params) anim.params.repeat = '1';
        this._scaleDuration(anim, combinedDur);
        anim.name = anim.name.replace(/ \(L\)$| \(R\)$/, '') + ' (combined)';

        // Remove the next animation
        const nextIdx = obj.animations.findIndex(a => a.id === nextAnim.id);
        if (nextIdx >= 0) obj.animations.splice(nextIdx, 1);

        this.animations.updateCodeOutput();
        eventBus.emit('timeline:update');
        Utils.showToast(`Combined "${anim.name}" with "${nextAnim.name}"`, 'success');
    }

    /**
     * Delete all animation content within the in/out range markers.
     * Splits, trims, or removes animations that overlap the range.
     * Also trims audio if loaded.
     */
    deleteRange() {
        const inTime = this._rangeInMs;
        const outTime = this._rangeOutMs;
        if (inTime == null || outTime == null || inTime >= outTime) {
            Utils.showToast('Set In and Out points first (use I and O keys)', 'warning');
            return;
        }

        if (window.app?.history) eventBus.emit('history:push');

        let deletedCount = 0;

        this.objects.objects.forEach(obj => {
            const toRemove = [];
            const toAdd = [];

            obj.animations.forEach(anim => {
                const start = anim.delay || 0;
                const dur = this._getAnimSingleDuration(anim) * this._getAnimRepeatCount(anim);
                const end = start + dur;

                if (end <= inTime || start >= outTime) {
                    // Completely outside range — keep as-is
                    return;
                }

                if (start >= inTime && end <= outTime) {
                    // Completely inside range — delete entirely
                    toRemove.push(anim.id);
                    deletedCount++;
                    return;
                }

                if (start < inTime && end > outTime) {
                    // Straddles both markers — split into two (before in, after out)
                    const leftAnim = JSON.parse(JSON.stringify(anim));
                    leftAnim.id = Utils.generateId('anim');
                    leftAnim.name = anim.name + ' (L)';
                    leftAnim.repeat = '1';
                    if (leftAnim.params) leftAnim.params.repeat = '1';
                    this._scaleDuration(leftAnim, inTime - start);

                    const rightAnim = JSON.parse(JSON.stringify(anim));
                    rightAnim.id = Utils.generateId('anim');
                    rightAnim.name = anim.name + ' (R)';
                    rightAnim.delay = Math.round(outTime);
                    rightAnim.repeat = '1';
                    if (rightAnim.params) {
                        rightAnim.params.delay = outTime / 1000;
                        rightAnim.params.repeat = '1';
                    }
                    const progress = (outTime - start) / dur;
                    this._shiftAnimationProgress(rightAnim, progress);
                    this._scaleDuration(rightAnim, end - outTime);

                    toRemove.push(anim.id);
                    toAdd.push(leftAnim, rightAnim);
                    deletedCount++;
                    return;
                }

                if (start < inTime) {
                    // Overlaps left edge — trim end to inTime
                    anim.repeat = '1';
                    if (anim.params) anim.params.repeat = '1';
                    this._scaleDuration(anim, inTime - start);
                    deletedCount++;
                    return;
                }

                if (end > outTime) {
                    // Overlaps right edge — trim start to outTime
                    const progress = (outTime - start) / dur;
                    this._shiftAnimationProgress(anim, progress);
                    anim.delay = Math.round(outTime);
                    if (anim.params) anim.params.delay = outTime / 1000;
                    anim.repeat = '1';
                    if (anim.params) anim.params.repeat = '1';
                    this._scaleDuration(anim, end - outTime);
                    deletedCount++;
                }
            });

            toRemove.forEach(id => {
                const idx = obj.animations.findIndex(a => a.id === id);
                if (idx >= 0) obj.animations.splice(idx, 1);
            });
            toAdd.forEach(a => obj.animations.push(a));
        });

        // Trim audio if loaded
        if (window.app?.audioTimeline?.isLoaded) {
            window.app.audioTimeline.trimRange(inTime, outTime);
        }

        // Clear range markers
        this._rangeInMs = null;
        this._rangeOutMs = null;
        this._updateRangeMarkers();

        this.animations.updateCodeOutput();
        eventBus.emit('timeline:update');
        Utils.showToast(`Deleted range ${Utils.formatTime(inTime)} — ${Utils.formatTime(outTime)} (${deletedCount} edits)`, 'success');
    }

    /**
     * Set the In-point range marker at the current playhead position.
     */
    setRangeIn() {
        this._rangeInMs = this.animations.currentTime;
        if (this._rangeOutMs != null && this._rangeInMs >= this._rangeOutMs) {
            this._rangeOutMs = null;
        }
        this._updateRangeMarkers();
        Utils.showToast(`In point: ${Utils.formatTime(this._rangeInMs)}`, 'info');
    }

    /**
     * Set the Out-point range marker at the current playhead position.
     */
    setRangeOut() {
        this._rangeOutMs = this.animations.currentTime;
        if (this._rangeInMs != null && this._rangeOutMs <= this._rangeInMs) {
            this._rangeInMs = null;
        }
        this._updateRangeMarkers();
        Utils.showToast(`Out point: ${Utils.formatTime(this._rangeOutMs)}`, 'info');
    }

    /**
     * Clear both range markers.
     */
    clearRange() {
        this._rangeInMs = null;
        this._rangeOutMs = null;
        this._updateRangeMarkers();
        Utils.showToast('Range markers cleared', 'info');
    }

    /**
     * Update the visual range marker overlays on the timeline.
     */
    _updateRangeMarkers() {
        const trackArea = document.getElementById('timeline-tracks');
        if (!trackArea) return;

        // Remove existing markers/overlay
        trackArea.querySelectorAll('.range-marker, .range-overlay').forEach(el => el.remove());

        const addMarker = (timeMs, type) => {
            if (timeMs == null) return;
            const x = (timeMs / 1000) * this.pixelsPerSecond;
            const marker = document.createElement('div');
            marker.className = `range-marker range-marker-${type}`;
            marker.style.left = x + 'px';
            marker.title = `${type === 'in' ? 'In' : 'Out'} point: ${Utils.formatTime(timeMs)}`;
            trackArea.appendChild(marker);
        };

        addMarker(this._rangeInMs, 'in');
        addMarker(this._rangeOutMs, 'out');

        // Add shaded overlay between markers
        if (this._rangeInMs != null && this._rangeOutMs != null) {
            const x1 = (this._rangeInMs / 1000) * this.pixelsPerSecond;
            const x2 = (this._rangeOutMs / 1000) * this.pixelsPerSecond;
            const overlay = document.createElement('div');
            overlay.className = 'range-overlay';
            overlay.style.left = x1 + 'px';
            overlay.style.width = (x2 - x1) + 'px';
            trackArea.appendChild(overlay);
        }
    }

    getFaceRigManager() {
        return window.app?.faceRig
            || window.app?.faceRigManager
            || window.faceRigManager
            || null;
    }

    deleteAnimation(objId, animId) {
        const obj = this.objects.getObjectById(objId);
        if (!obj) return;

        const animIndex = obj.animations.findIndex(a => a.id === animId);
        if (animIndex < 0) return;

        const removed = obj.animations[animIndex];
        if (window.app?.jointSystem?._deleteArmatureTimelineAction(removed._armatureActionId)) {
            this.selectedAnimKeys.clear(); this.selectedAnimId = null; this.selectedAnimObjId = null;
            this.lastSelectedAnimKey = null;
            return;
        }

        eventBus.emit('history:push');

        obj.animations.splice(animIndex, 1);
        window.app?.jointSystem?.resetRemovedJointAnimationTarget?.(obj, removed);
        if (removed?.type === 'face-set' || removed?.type === 'face-set-motion') {
            this.getFaceRigManager()?.resetFaceSetIfNoMotionTracksForObject?.(obj);
        }

        // Clear selection
        this.selectedAnimId = null;
        this.selectedAnimObjId = null;
        this.selectedAnimKeys.delete(this._makeAnimSelectionKey(objId, animId));
        if (!this.selectedAnimKeys.size) this.lastSelectedAnimKey = null;

        // Refresh
        this.animations.calculateTotalDuration?.();
        this.animations.updateAppliedAnimationsList?.();
        this.animations.updateCodeOutput();
        this.stage?.requestRender?.();
        eventBus.emit('timeline:update');
        Utils.showToast(`Deleted "${removed.name}" animation`, 'info');
    }

    async clearAllAnimations() {
        const objectsWithAnimations = this.objects.objects.filter(obj => Array.isArray(obj.animations) && obj.animations.length > 0);
        const totalAnimations = objectsWithAnimations.reduce((sum, obj) => sum + obj.animations.length, 0);
        if (!totalAnimations) {
            Utils.showToast('Timeline is already empty', 'info');
            return false;
        }

        const confirmed = await Utils.showConfirm(`Clear the entire timeline and delete all ${totalAnimations} animation${totalAnimations === 1 ? '' : 's'}?`);
        if (!confirmed) return false;

        this.animations.stop();
        eventBus.emit('history:push');

        objectsWithAnimations.forEach(obj => {
            obj.animations = [];
        });
        this.getFaceRigManager()?.resetAllFaceSetsToRest?.();

        this.selectedAnimId = null;
        this.selectedAnimObjId = null;
        this.selectedAnimKeys.clear();
        this.lastSelectedAnimKey = null;
        this._copiedAnim = null;

        this.animations.calculateTotalDuration();
        this.animations.updateAppliedAnimationsList();
        this.animations.updateCodeOutput();
        this.stage?.requestRender?.();
        eventBus.emit('timeline:update');

        Utils.showToast(`Cleared ${totalAnimations} animation${totalAnimations === 1 ? '' : 's'} from the timeline`, 'success');
        return true;
    }

    /**
     * Jump the playhead to the previous (-1) or next (+1) animation boundary.
     * Collects all animation start/end times across the selected object
     * (or all objects if none selected), then jumps to the nearest one
     * in the requested direction.
     */
    jumpToAdjacentAnimation(direction) {
        // Always search ALL objects so armature animations on child parts are found
        const objs = this.objects.objects;

        // Collect one interval per animation using the MAX duration across all configs
        const intervals = [];
        objs.forEach(obj => {
            obj.animations.forEach(anim => {
                const start = anim.delay || 0;
                const configs = Array.isArray(anim.generated) ? anim.generated : [anim.generated];
                let maxDur = 0;
                configs.forEach(cfg => {
                    if (cfg && cfg.duration) maxDur = Math.max(maxDur, cfg.duration);
                });
                if (maxDur > 0) {
                    const repeatCount = this._getAnimRepeatCount(anim);
                    intervals.push({ start, end: start + maxDur * repeatCount });
                }
            });
        });

        if (intervals.length === 0) {
            Utils.showToast('No animations to navigate', 'info');
            return;
        }

        const current = this.animations.currentTime;
        const epsilon = 10; // 10ms tolerance to avoid getting stuck

        let target = null;
        if (direction > 0) {
            // Next: jump to the END of the next animation whose end is after current
            // Sort by end time ascending, find first end beyond current
            const sorted = intervals.slice().sort((a, b) => a.end - b.end);
            const nextAnim = sorted.find(iv => iv.end > current + epsilon);
            if (nextAnim) {
                target = nextAnim.end;
            } else {
                // No next — jump to end of the last animation
                target = sorted[sorted.length - 1].end;
            }
        } else {
            // Previous: jump to the START of the previous animation whose start is before current
            // Sort by start time descending, find first start before current
            const sorted = intervals.slice().sort((a, b) => b.start - a.start);
            const prevAnim = sorted.find(iv => iv.start < current - epsilon);
            if (prevAnim) {
                target = prevAnim.start;
            } else {
                // No previous — jump to start of the earliest animation (or 0)
                const earliest = intervals.slice().sort((a, b) => a.start - b.start)[0];
                target = earliest ? earliest.start : 0;
            }
        }

        this.animations.currentTime = target;
        this.animations._preserveFinalPose = false;
        this.updatePlayhead(target);
        document.getElementById('tl-time').textContent = Utils.formatTime(target);

        // Preview the animations at this time
        if (!this.animations.isPlaying) {
            if (this.animations.previewTimelineAt) {
                this.animations.previewTimelineAt(target);
            } else {
                this.animations.applyAnimationsAtTime(target, { timelinePreview: true });
                this.stage.requestRender();
            }
        }

        // Highlight the animation bar at this time
        this.highlightAnimationAtTime(target, objs);
    }

    /**
     * Select/highlight the animation bar whose time range includes `time`.
     */
    highlightAnimationAtTime(time, objs) {
        const trackArea = document.getElementById('timeline-track-area');
        if (!trackArea) return;

        // Deselect all bars
        trackArea.querySelectorAll('.timeline-bar').forEach(b => b.classList.remove('selected'));
        this.selectedAnimId = null;
        this.selectedAnimObjId = null;
        this.selectedAnimKeys.clear();
        this.lastSelectedAnimKey = null;

        for (const obj of objs) {
            for (const anim of obj.animations) {
                const start = anim.delay || 0;
                const configs = Array.isArray(anim.generated) ? anim.generated : [anim.generated];
                const repeatCount = this._getAnimRepeatCount(anim);
                for (const cfg of configs) {
                    if (!cfg || !cfg.duration) continue;
                    if (cfg.type === 'audio-lip-sync' && cfg.audioRefreshRequired === true) continue;
                    const end = start + cfg.duration * repeatCount;
                    if (time >= start && time <= end + 10) {
                        // Find and highlight matching bar
                        const bar = trackArea.querySelector(
                            `.timeline-bar[data-anim-id="${anim.id}"][data-obj-id="${obj.id}"]`
                        );
                        if (bar) {
                            bar.classList.add('selected');
                            this.selectedAnimId = anim.id;
                            this.selectedAnimObjId = obj.id;
                            this.selectedAnimKeys.add(this._makeAnimSelectionKey(obj.id, anim.id));
                            this.lastSelectedAnimKey = this._makeAnimSelectionKey(obj.id, anim.id);
                            this._syncSelectedAnimationBarsUi();
                            this.objects.select([obj.id]);
                            return;
                        }
                    }
                }
            }
        }
    }

    _getProjectMarkers() {
        const app = window.app || {};
        const markers = Array.isArray(this.markers) ? this.markers
            : (Array.isArray(app.audioMarkers) ? app.audioMarkers
                : (Array.isArray(app.projectMarkers) ? app.projectMarkers : []));
        return markers
            .filter(Boolean)
            .map((marker, index) => {
                const rawTime = Number(marker.time ?? marker.timeSeconds ?? marker.seconds ?? 0);
                const timeMs = rawTime > 1000 ? rawTime : rawTime * 1000;
                return {
                    id: marker.id || `marker-${index}`,
                    label: marker.label || `Marker ${index + 1}`,
                    source: marker.source || 'manual',
                    timeMs: Math.max(0, Number.isFinite(timeMs) ? timeMs : 0)
                };
            })
            .sort((a, b) => a.timeMs - b.timeMs);
    }

    _renderMarkerLane(totalWidth = 0) {
        const markers = this._getProjectMarkers();
        const pins = markers.map((marker) => {
            const left = (marker.timeMs / 1000) * this.pixelsPerSecond;
            if (left < 0 || left > totalWidth + 8) return '';
            const isBeat = marker.source === 'generated-beat';
            const title = `${marker.label} · ${Utils.formatTime(marker.timeMs)}${isBeat ? ' · generated beat' : ''}`;
            return `<button class="tl-marker-pin${isBeat ? ' is-beat' : ''}" style="left:${left}px" data-marker-id="${Utils.escapeAttr(marker.id)}" title="${Utils.escapeAttr(title)}">
                <i class="fas ${isBeat ? 'fa-music' : 'fa-location-dot'}"></i>
                <span>${Utils.escapeHtml(marker.label)}</span>
            </button>`;
        }).join('');
        const status = markers.length ? `${markers.length} marker${markers.length === 1 ? '' : 's'}` : 'No markers';
        return {
            label: `<div class="timeline-label tl-marker-label-row" data-role="marker-label" style="height:36px">
                <i class="fas fa-map-marker-alt"></i>
                <span class="tl-marker-title">Markers</span>
                <small>${status}</small>
            </div>`,
            track: `<div class="timeline-track tl-marker-track" data-role="marker-track" style="height:36px">
                <div class="tl-marker-lane">${pins || '<span class="tl-marker-empty">Add markers from Tools > Audio Markers</span>'}</div>
            </div>`
        };
    }

    _bindMarkerLaneControls() {
        const trackArea = document.getElementById('timeline-track-area');
        if (!trackArea) return;
        trackArea.querySelectorAll('.tl-marker-pin').forEach((pin) => {
            pin.addEventListener('click', (event) => {
                event.stopPropagation();
                const marker = this._getProjectMarkers().find(item => String(item.id) === String(pin.dataset.markerId));
                if (!marker) return;
                this.animations.currentTime = marker.timeMs;
                this.currentTime = marker.timeMs;
                eventBus.emit('timeline:time', marker.timeMs);
                eventBus.emit('timeline:scrub', marker.timeMs);
                try {
                    this.animations.applyAnimationsAtTime(marker.timeMs, { timelinePreview: true });
                    this.stage?.requestRender?.();
                } catch (_) {}
                Utils.showToast(`Jumped to ${marker.label}`, 'info');
            });
        });
    }

    buildTracks() {
        if (this._isRenaming) return; // Don't rebuild during rename

        const labelsEl = document.getElementById('timeline-labels');
        const trackArea = document.getElementById('timeline-track-area');
        if (!labelsEl || !trackArea) return;

        const objects = this.objects.objects;
        this._pruneBulkShiftSelection();
        const totalSeconds = Math.ceil(this.animations.totalDuration / 1000);
        const totalWidth = totalSeconds * this.pixelsPerSecond;
        
        trackArea.style.width = totalWidth + 'px';

        const icons = {
            rectangle: 'fa-square', circle: 'fa-circle', triangle: 'fa-play',
            star: 'fa-star', polygon: 'fa-hexagon', line: 'fa-minus',
            diamond: 'fa-gem', heart: 'fa-heart',
            arrow: 'fa-long-arrow-alt-right', doubleArrow: 'fa-arrows-alt-h',
            curvedArrow: 'fa-share', scribble: 'fa-pencil-alt',
            freeform: 'fa-signature',
            text: 'fa-font', image: 'fa-image', path: 'fa-bezier-curve',
            caption: 'fa-closed-captioning'
        };

        // --- Lane assignment constants ---
        const LANE_HEIGHT = 22; // px per lane
        const LANE_PAD = 4;    // top/bottom padding in track
        const MIN_TRACK_H = 28; // minimum track height (single lane)
        const GROUP_HEADER_H = 26; // group header row height

        // Initialize collapsed timeline groups set
        if (!this._collapsedTimelineGroups) this._collapsedTimelineGroups = new Set();

        // Pre-compute per-object bar data with lane assignments
        const objectTrackData = {};
        objects.forEach(obj => {
            const barEntries = [];

            obj.animations.forEach(anim => {
                const configs = Array.isArray(anim.generated) ? anim.generated : [anim.generated];
                let repeatCount = 1;
                if (anim.repeat === '-1') repeatCount = 3;
                else if (anim.repeat === 'pingpong') repeatCount = 2;
                else repeatCount = Math.max(1, parseInt(anim.repeat) || 1);

                // Consolidate all configs into one bar per animation
                let maxEnd = 0;
                let anyKf = false;
                const lipSyncConfig = configs.find(config => config?.type === 'audio-lip-sync') || null;
                configs.forEach(config => {
                    if (!config || !config.duration) return;
                    if (config.property === '_chainType') return;
                    const cfgEnd = (config._stepDelay || 0) + config.duration;
                    maxEnd = Math.max(maxEnd, cfgEnd);
                    if (config.keyframes && config.keyframes.length > 2) anyKf = true;
                });
                if (maxEnd > 0) {
                    const startMs = anim.delay || 0;
                    const totalDur = maxEnd * repeatCount;
                    const endMs = startMs + totalDur;
                    const startX = (startMs / 1000) * this.pixelsPerSecond;
                    const singleWidth = (maxEnd / 1000) * this.pixelsPerSecond;
                    const width = singleWidth * repeatCount;
                    barEntries.push({
                        startMs, endMs, startX, width, singleWidth,
                        hasKf: anyKf, repeatCount, isInfinite: anim.repeat === '-1',
                        anim,
                        config: {
                            duration: maxEnd,
                            type: lipSyncConfig?.type || anim.type,
                            audioRefreshRequired: lipSyncConfig?.audioRefreshRequired === true,
                            audioRefreshReason: lipSyncConfig?.audioRefreshReason || ''
                        },
                        objId: obj.id,
                        isChain: anim.type === 'chain' || anim.type === 'recorded'
                    });
                }
            });

            // Sort bars by start time, then by duration (longer first)
            barEntries.sort((a, b) => a.startMs - b.startMs || (b.endMs - b.startMs) - (a.endMs - a.startMs));

            // Greedy lane assignment: each lane tracks its "end time"
            const laneEnds = []; // laneEnds[i] = end time of last bar in lane i
            barEntries.forEach(entry => {
                let assigned = -1;
                for (let i = 0; i < laneEnds.length; i++) {
                    if (entry.startMs >= laneEnds[i]) {
                        assigned = i;
                        break;
                    }
                }
                if (assigned === -1) {
                    assigned = laneEnds.length;
                    laneEnds.push(0);
                }
                laneEnds[assigned] = entry.endMs;
                entry.lane = assigned;
            });

            const numLanes = Math.max(1, laneEnds.length);
            const trackHeight = Math.max(MIN_TRACK_H, numLanes * LANE_HEIGHT + LANE_PAD * 2);

            const isHidden = this.hiddenTracks.has(obj.id);
            const isCollapsed = this.collapsedTracks.has(obj.id);
            let displayHeight;
            if (isHidden) displayHeight = 0;
            else if (isCollapsed && numLanes > 1) displayHeight = MIN_TRACK_H;
            else displayHeight = trackHeight;

            objectTrackData[obj.id] = { obj, barEntries, numLanes, trackHeight, displayHeight };
        });

        // Build ordered display structure: groups with children, ungrouped objects
        const displayRows = [];
        const renderedGroupIds = new Set();

        objects.forEach(obj => {
            if (obj.groupId && this.objects.groups[obj.groupId]) {
                if (renderedGroupIds.has(obj.groupId)) return;
                renderedGroupIds.add(obj.groupId);
                const groupId = obj.groupId;
                const memberIds = this.objects.groups[groupId];
                const groupName = this.objects.groupNames[groupId] || 'Group';
                const mergedFaceSetRow = this._getMergedFaceSetTrackData(groupId, memberIds, objectTrackData);
                if (mergedFaceSetRow) {
                    displayRows.push(mergedFaceSetRow);
                    return;
                }
                const isGroupCollapsed = this._collapsedTimelineGroups.has(groupId);
                displayRows.push({ type: 'group-header', groupId, groupName, isGroupCollapsed, memberIds });
                if (!isGroupCollapsed) {
                    memberIds.forEach(mid => {
                        if (objectTrackData[mid]) {
                            displayRows.push({ type: 'object', ...objectTrackData[mid], isChild: true });
                        }
                    });
                }
            } else {
                if (objectTrackData[obj.id]) {
                    displayRows.push({ type: 'object', ...objectTrackData[obj.id], isChild: false });
                }
            }
        });

        // Build labels and tracks HTML
        let labelsHTML = '';
        let tracksHTML = '';
        const audioTimeline = window.app?.audioTimeline;
        const hasAudioTrack = !!audioTimeline?.isLoaded;
        const markerLane = this._renderMarkerLane(totalWidth);

        if (hasAudioTrack) {
            const audioRows = audioTimeline.renderTimelineRows?.(this.pixelsPerSecond, totalWidth) || {};
            labelsHTML += audioRows.labelsHTML || '';
            tracksHTML += audioRows.tracksHTML || '';
        }

        labelsHTML += markerLane.label;
        tracksHTML += markerLane.track;

        const bulkSelectionIds = this._getBulkShiftTargetIds();
        const allChecked = objects.length > 0 && bulkSelectionIds.length === objects.length;
        const someChecked = bulkSelectionIds.length > 0 && bulkSelectionIds.length < objects.length;
        const bulkTargets = this._getBulkShiftTargets();
        const bulkSummary = this._getBulkShiftSummary(bulkTargets);
        const bulkRailDisabled = !this.bulkShiftLocked || bulkTargets.length === 0;
        const sequenceStats = this._getSequencedObjectStats();
        this._ensureSequenceOrderMap(sequenceStats);
        const sequenceCount = sequenceStats.length;
        const sequenceStatus = sequenceCount
            ? `${sequenceCount} animated object${sequenceCount === 1 ? '' : 's'} ready`
            : 'Add animations to enable sequencing';
        labelsHTML += `<div class="timeline-label tl-bulk-shift-row" data-role="bulk-shift" style="height:52px">
            <div class="tl-bulk-shift-head">
                <label class="tl-select-box tl-select-all-box" title="Select all objects for the Timeline Shift Rail">
                    <input type="checkbox" id="tl-bulk-select-all" ${allChecked ? 'checked' : ''} ${objects.length ? '' : 'disabled'}>
                    <span>All</span>
                </label>
                <label class="tl-lock-box" title="Lock the selected objects before dragging the Timeline Shift Rail">
                    <input type="checkbox" id="tl-bulk-lock" ${this.bulkShiftLocked ? 'checked' : ''} ${bulkTargets.length ? '' : 'disabled'}>
                    <span><i class="fas fa-lock"></i></span>
                </label>
            </div>
            <div class="tl-bulk-shift-meta">
                <div class="tl-bulk-shift-title">Timeline Shift Rail</div>
                <div class="tl-bulk-shift-status">${bulkTargets.length ? bulkSummary.label : 'Select objects to activate'}</div>
            </div>
        </div>`;

        labelsHTML += `<div class="timeline-label tl-sequence-row" data-role="sequence-order" style="height:44px">
            <div class="tl-sequence-meta">
                <div class="tl-sequence-title">Animation Sequence</div>
                <div class="tl-sequence-status">${sequenceStatus}</div>
            </div>
            <button id="tl-apply-sequence" class="tl-sequence-apply" ${sequenceCount > 1 ? '' : 'disabled'} title="Apply the selected animation sequence order">Reorder</button>
        </div>`;

        tracksHTML += `<div class="timeline-track tl-bulk-shift-track${bulkRailDisabled ? ' is-disabled' : ''}" style="height:52px" data-role="bulk-shift-track">
            <div class="tl-bulk-shift-rail" title="Drag left to add delay. Drag right to pull selected animations earlier.">
                <div class="tl-bulk-shift-handle${bulkRailDisabled ? ' is-disabled' : ''}" id="tl-bulk-shift-handle" style="left:50%" title="${bulkRailDisabled ? 'Select objects and lock the rail to activate it' : 'Drag left to add delay. Drag right to shift earlier.'}">
                    <i class="fas fa-arrows-left-right"></i>
                    <span>Shift Rail</span>
                </div>
            </div>
        </div>`;

        tracksHTML += `<div class="timeline-track tl-sequence-track${sequenceCount > 1 ? '' : ' is-disabled'}" style="height:44px" data-role="sequence-track">
            <div class="tl-sequence-guide">Assign order ${sequenceCount ? `1-${sequenceCount}` : 'values'} to animated objects, then click Reorder to place each object block immediately after the previous one.</div>
        </div>`;

        displayRows.forEach(row => {
            if (row.type === 'group-header') {
                const { groupId, groupName, isGroupCollapsed, memberIds } = row;
                labelsHTML += `<div class="timeline-label tl-group-header" style="height:${GROUP_HEADER_H}px" data-group-id="${groupId}">
                    <button class="tl-label-btn tl-group-toggle" data-group-id="${groupId}" title="${isGroupCollapsed ? 'Expand group' : 'Collapse group'}">
                        <i class="fas fa-chevron-${isGroupCollapsed ? 'right' : 'down'}"></i>
                    </button>
                    <i class="fas fa-object-group" style="color:var(--accent-primary)"></i>
                    <span class="tl-obj-name tl-group-name" data-group-id="${groupId}">${groupName} <small style="opacity:.5">(${memberIds.length})</small></span>
                </div>`;
                tracksHTML += `<div class="timeline-track tl-group-header-track" style="height:${GROUP_HEADER_H}px" data-group-id="${groupId}"></div>`;
            } else if (row.type === 'face-set-merged') {
                const { groupId, memberIds, setName, representativeObj, startX, width, displayHeight, animationCount, partCount } = row;
                const safeName = Utils.escapeHtml(setName);
                const objId = representativeObj?.id || memberIds[0] || groupId;
                labelsHTML += `<div class="timeline-label tl-face-set-merged-label" style="height:${displayHeight}px" data-face-merge-id="${groupId}">
                    <button class="tl-label-btn tl-face-unmerge-btn" data-face-merge-id="${groupId}" title="Unmerge this face-set timeline row">
                        <i class="fas fa-expand-alt"></i>
                    </button>
                    <i class="fas fa-face-smile" style="color:var(--accent-primary)"></i>
                    <span class="tl-obj-name tl-face-merged-name" data-face-merge-id="${groupId}">${safeName} <small style="opacity:.58">merged (${animationCount})</small></span>
                    <span class="tl-sequence-placeholder" title="${partCount} face parts hidden in this merged timeline row">set</span>
                </div>`;
                tracksHTML += `<div class="timeline-track tl-face-set-merged-track" style="height:${displayHeight}px" data-face-merge-id="${groupId}">
                    <div class="timeline-bar tl-kind-emphasis tl-face-merged-bar"
                        style="left:${startX}px; width:${width}px; top:5px; height:22px;"
                        title="${Utils.escapeAttr(`${setName}: merged face-set animation (${animationCount} bars hidden). Click to select the face set; use Unmerge to edit individual bars.`)}"
                        data-face-merge-id="${groupId}"
                        data-obj-id="${objId}"
                        data-anim-id="merged:${groupId}">
                        <span class="tl-bar-label"><i class="fas fa-compress-alt tl-bar-icon"></i>${safeName}</span>
                    </div>
                </div>`;
            } else {
                const { obj, numLanes, displayHeight, trackHeight, isChild } = row;
                const isHidden = this.hiddenTracks.has(obj.id);
                const isCollapsed = this.collapsedTracks.has(obj.id);
                const canCollapse = numLanes > 1;
                const bulkChecked = this.bulkShiftSelection.has(String(obj.id));
                const sequenceEntry = sequenceStats.find(entry => String(entry.obj.id) === String(obj.id));
                const sequenceValue = sequenceEntry ? (parseInt(this.sequenceOrderMap[String(obj.id)], 10) || '') : '';
                const sequenceOptions = sequenceStats.map((entry, index) => {
                    const optionValue = index + 1;
                    return `<option value="${optionValue}" ${sequenceValue === optionValue ? 'selected' : ''}>${optionValue}</option>`;
                }).join('');

                const visBtn = `<button class="tl-label-btn tl-vis-btn${isHidden ? ' is-hidden' : ''}" data-id="${obj.id}" title="${isHidden ? 'Show' : 'Hide'} object">
                    <i class="fas ${isHidden ? 'fa-eye-slash' : 'fa-eye'}"></i>
                </button>`;

                const collapseBtn = canCollapse
                    ? `<button class="tl-label-btn tl-collapse-btn${isCollapsed ? ' is-collapsed' : ''}" data-id="${obj.id}" title="${isCollapsed ? 'Expand' : 'Collapse'} animations">
                        <i class="fas fa-chevron-${isCollapsed ? 'right' : 'down'}"></i>
                    </button>`
                    : '';

                const h = isHidden ? MIN_TRACK_H : displayHeight;
                const hiddenClass = isHidden ? ' tl-label-hidden' : '';
                const childClass = isChild ? ' tl-label-child' : '';
                const sequenceBox = sequenceEntry
                    ? `<label class="tl-sequence-box" title="Sequence order for ${Utils.escapeAttr(obj.name)}">
                        <select class="tl-sequence-select" data-id="${obj.id}">${sequenceOptions}</select>
                    </label>`
                    : `<span class="tl-sequence-placeholder" title="This object has no timeline animations">--</span>`;

                labelsHTML += `<div class="timeline-label${hiddenClass}${childClass}" style="height:${h}px" data-id="${obj.id}">
                    ${collapseBtn}
                    <label class="tl-select-box" title="Include ${Utils.escapeAttr(obj.name)} in Timeline Shift Rail">
                        <input type="checkbox" class="tl-bulk-obj-check" data-id="${obj.id}" ${bulkChecked ? 'checked' : ''}>
                    </label>
                    <i class="fas ${icons[obj.type] || 'fa-cube'}" style="color:${obj.fill}"></i>
                    <span class="tl-obj-name" data-id="${obj.id}">${Utils.escapeHtml(obj.name)}${isCollapsed && canCollapse ? ` <small style="opacity:.5">(${numLanes})</small>` : ''}</span>
                    ${sequenceBox}
                    ${visBtn}
                </div>`;

                // Build track bars
                if (isHidden) {
                    tracksHTML += `<div class="timeline-track tl-track-hidden" style="height:${MIN_TRACK_H}px" data-id="${obj.id}"></div>`;
                } else {
                    let bars = '';
                    row.barEntries.forEach(entry => {
                        const { startX, width, singleWidth, hasKf, repeatCount, isInfinite, anim, config, lane, isChain } = entry;
                        const displayLane = (isCollapsed && numLanes > 1) ? 0 : lane;
                        const barTop = LANE_PAD + displayLane * LANE_HEIGHT;
                        const barH = LANE_HEIGHT - 2;

                        const kfClass = hasKf ? ' has-keyframes' : '';
                        const repeatClass = repeatCount > 1 ? ' repeating' : '';
                        const collapsedClass = (isCollapsed && numLanes > 1 && lane > 0) ? ' collapsed-bar' : '';
                        const chainClass = isChain ? ' chain-bar' : '';
                        const cycleClass = (anim.repeatMode === 'cycle' && repeatCount > 1) ? ' cycle-repeat' : '';

                        let kfIndicators = '';
                        if (hasKf && config.keyframes) {
                            config.keyframes.forEach(kf => {
                                if (kf.t > 0 && kf.t < 1) {
                                    kfIndicators += `<div class="kf-indicator" style="left:${kf.t * 100}%"></div>`;
                                }
                            });
                        }

                        let repeatMarkers = '';
                        if (repeatCount > 1) {
                            for (let r = 1; r < repeatCount; r++) {
                                repeatMarkers += `<div class="repeat-marker" style="left:${(r / repeatCount) * 100}%"></div>`;
                            }
                        }

                        const durationLabel = (config.duration / 1000).toFixed(1);
                        const repeatLabel = isInfinite ? '∞' : (repeatCount > 1 ? `×${repeatCount}` : '');
                        const cycleLabel = (anim.repeatMode === 'cycle' && repeatCount > 1) ? ' ⟳' : '';
                        const titleText = `${anim.name} (${durationLabel}s${repeatLabel ? ' ' + repeatLabel : ''}${anim.repeatMode === 'cycle' ? ' Smooth Cycle' : ''}) — drag to move, dbl-click for keyframes`;

                        const resolvedTitleText = config.audioRefreshRequired === true
                            ? `${anim.name} (${durationLabel}s) - refresh required; double-click to refresh lip sync`
                            : window.Realistic3DLibrary?.canEdit(obj,anim) ? `${anim.name} (${durationLabel}s) - click to edit 3D action or route, drag to move` : titleText;
                        const chainIcon = isChain ? '<i class="fas fa-link" style="font-size:7px;margin-right:2px;opacity:.6"></i>' : '';
                        const visualMeta = this.getBarVisualMeta(anim, config);
                        bars += `<div class="timeline-bar tl-kind-${visualMeta.kind}${kfClass}${repeatClass}${collapsedClass}${chainClass}${cycleClass}" 
                            style="left:${startX}px; width:${width}px; top:${barTop}px; height:${barH}px;"
                            title="${Utils.escapeAttr(resolvedTitleText)}"
                            data-anim-id="${anim.id}"
                            data-obj-id="${obj.id}"
                            data-lane="${lane}">
                            ${kfIndicators}
                            ${repeatMarkers}
                            <span class="tl-bar-label">${chainIcon}<i class="fas ${visualMeta.icon} tl-bar-icon"></i>${Utils.escapeHtml(anim.name)}${repeatLabel ? ' ' + repeatLabel : ''}${cycleLabel}</span>
                            <button class="tl-bar-delete" data-anim-id="${anim.id}" data-obj-id="${obj.id}" title="Delete animation">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>`;

                        const kfTop = barTop + barH / 2;
                        const hideKf = (isCollapsed && numLanes > 1 && lane > 0) ? '; display:none' : '';
                        bars += `<div class="timeline-keyframe" style="left:${startX}px; top:${kfTop}px${hideKf}" data-anim-id="${anim.id}" data-obj-id="${obj.id}" data-edge="start" title="Drag to change start time"></div>`;
                        bars += `<div class="timeline-keyframe" style="left:${startX + width}px; top:${kfTop}px${hideKf}" data-anim-id="${anim.id}" data-obj-id="${obj.id}" data-edge="end" title="Drag to change duration"></div>`;
                    });

                    tracksHTML += `<div class="timeline-track" style="height:${displayHeight}px" data-id="${obj.id}">${bars}</div>`;
                }
            }
        });

        labelsEl.innerHTML = labelsHTML;
        trackArea.innerHTML = tracksHTML;
        this._syncSelectedAnimationBarsUi();
        this._bindMarkerLaneControls();
        window.app?.audioTimeline?.syncTimelinePresence?.();
        window.app?.audioTimeline?.bindTimelineRows?.(labelsEl, trackArea);

        const selectAllInput = labelsEl.querySelector('#tl-bulk-select-all');
        if (selectAllInput) {
            selectAllInput.indeterminate = someChecked;
            selectAllInput.addEventListener('change', () => this._toggleBulkShiftAll(selectAllInput.checked));
            selectAllInput.addEventListener('click', (e) => e.stopPropagation());
        }

        const bulkLockInput = labelsEl.querySelector('#tl-bulk-lock');
        if (bulkLockInput) {
            bulkLockInput.addEventListener('change', () => {
                this.bulkShiftLocked = bulkLockInput.checked && bulkTargets.length > 0;
                this.buildTracks();
            });
            bulkLockInput.addEventListener('click', (e) => e.stopPropagation());
        }

        labelsEl.querySelectorAll('.tl-bulk-obj-check').forEach(input => {
            input.addEventListener('change', () => this._toggleBulkShiftObject(input.dataset.id, input.checked));
            input.addEventListener('click', (e) => e.stopPropagation());
        });

        labelsEl.querySelectorAll('.tl-sequence-select').forEach(select => {
            select.addEventListener('change', () => this._setSequenceOrder(select.dataset.id, select.value, sequenceStats));
            select.addEventListener('click', (e) => e.stopPropagation());
        });

        labelsEl.querySelector('#tl-apply-sequence')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.applySequenceOrder();
        });

        const bulkShiftHandle = trackArea.querySelector('#tl-bulk-shift-handle');
        if (bulkShiftHandle && !bulkRailDisabled) {
            bulkShiftHandle.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                const targets = this._getBulkShiftTargets();
                if (!targets.length || !this.bulkShiftLocked) return;
                const summary = this._getBulkShiftSummary(targets);
                const railEl = bulkShiftHandle.parentElement;
                const railRect = railEl?.getBoundingClientRect();
                const handleRect = bulkShiftHandle.getBoundingClientRect();
                const handleStartLeft = railRect
                    ? (handleRect.left - railRect.left) + (handleRect.width / 2)
                    : 0;
                this.isDraggingBulkShift = true;
                this.bulkShiftDragData = {
                    startX: e.clientX,
                    handleEl: bulkShiftHandle,
                    targets,
                    minDelay: summary.minDelay,
                    maxEnd: summary.maxEnd,
                    label: summary.label,
                    handleStartLeft,
                    railWidth: railRect?.width || 0
                };
            });
        }

        // Bind group header toggle buttons
        labelsEl.querySelectorAll('.tl-group-toggle').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const gid = btn.dataset.groupId;
                if (this._collapsedTimelineGroups.has(gid)) this._collapsedTimelineGroups.delete(gid);
                else this._collapsedTimelineGroups.add(gid);
                this.buildTracks();
            });
        });

        // Click group header to select all group members
        labelsEl.querySelectorAll('.tl-group-header').forEach(el => {
            el.addEventListener('click', (e) => {
                if (e.target.closest('.tl-group-toggle')) return;
                const gid = el.dataset.groupId;
                const memberIds = this.objects.groups[gid];
                if (memberIds) this.objects.select(memberIds);
            });
        });

        const unmergeFaceSet = (groupId) => {
            const memberIds = this.objects.groups?.[groupId] || [];
            let changed = 0;
            memberIds.forEach(id => {
                const obj = this.objects.getObjectById?.(id) || this.objects.objects.find(item => String(item.id) === String(id));
                if (!obj || !this._isFaceSetObject(obj)) return;
                obj.faceSet = { ...(obj.faceSet || {}), timelineMerged: false };
                delete obj._faceSetTimelineMerged;
                changed += 1;
            });
            if (!changed) return;
            eventBus.emit('timeline:update');
            eventBus.emit('history:push');
            Utils.showToast('Face-set timeline unmerged for editing.', 'success');
        };

        labelsEl.querySelectorAll('.tl-face-unmerge-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                unmergeFaceSet(btn.dataset.faceMergeId);
            });
        });

        labelsEl.querySelectorAll('.tl-face-set-merged-label, .tl-face-merged-name').forEach(el => {
            el.addEventListener('click', (e) => {
                if (e.target.closest('.tl-face-unmerge-btn')) return;
                const gid = el.dataset.faceMergeId;
                const memberIds = this.objects.groups?.[gid];
                if (memberIds) this.objects.select(memberIds);
            });
        });

        // Double-click group name to rename group
        labelsEl.querySelectorAll('.tl-group-name').forEach(nameSpan => {
            nameSpan.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                const gid = nameSpan.dataset.groupId;
                const currentName = this.objects.groupNames[gid] || 'Group';
                this._isRenaming = true;
                this.objects._isRenaming = true;

                const input = document.createElement('input');
                input.type = 'text';
                input.value = currentName;
                input.className = 'tl-rename-input';
                nameSpan.textContent = '';
                nameSpan.appendChild(input);
                input.focus();
                input.select();

                const commit = () => {
                    this._isRenaming = false;
                    this.objects._isRenaming = false;
                    const newName = input.value.trim() || currentName;
                    this.objects.groupNames[gid] = newName;
                    this.objects.updateObjectList();
                    this.buildTracks();
                    eventBus.emit('history:push');
                };

                input.addEventListener('blur', commit);
                input.addEventListener('keydown', (ke) => {
                    if (ke.key === 'Enter') { ke.preventDefault(); input.blur(); }
                    if (ke.key === 'Escape') { input.value = currentName; input.blur(); }
                });
                input.addEventListener('click', (ce) => ce.stopPropagation());
                input.addEventListener('mousedown', (ce) => ce.stopPropagation());
            });
        });

        // Bind collapse/expand buttons
        labelsEl.querySelectorAll('.tl-collapse-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                if (this.collapsedTracks.has(id)) {
                    this.collapsedTracks.delete(id);
                } else {
                    this.collapsedTracks.add(id);
                }
                this.buildTracks();
            });
        });

        // Bind hide/show buttons
        labelsEl.querySelectorAll('.tl-vis-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                if (this.hiddenTracks.has(id)) {
                    this.hiddenTracks.delete(id);
                } else {
                    this.hiddenTracks.add(id);
                }
                this.buildTracks();
            });
        });

        // Click labels to select (only object labels, not group headers)
        labelsEl.querySelectorAll('.timeline-label[data-id]').forEach(el => {
            el.addEventListener('click', (e) => {
                if (e.target.closest('.tl-label-btn') || e.target.closest('.tl-obj-name') || e.target.closest('.tl-select-box')) return;
                this.objects.select([el.dataset.id]);
            });
        });

        // Double-click object name to rename
        labelsEl.querySelectorAll('.tl-obj-name[data-id]').forEach(nameSpan => {
            nameSpan.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                const objId = nameSpan.dataset.id;
                const obj = this.objects.getObjectById(objId);
                if (!obj) return;

                const currentName = obj.name;
                this._isRenaming = true;
                this.objects._isRenaming = true;

                const input = document.createElement('input');
                input.type = 'text';
                input.value = currentName;
                input.className = 'tl-rename-input';
                nameSpan.textContent = '';
                nameSpan.appendChild(input);
                input.focus();
                input.select();

                const commit = () => {
                    if (commit._done) return;
                    commit._done = true;
                    this._isRenaming = false;
                    this.objects._isRenaming = false;
                    obj.name = input.value.trim() || currentName;
                    this.objects._afterRename();
                };

                input.addEventListener('blur', commit);
                input.addEventListener('keydown', (ke) => {
                    if (ke.key === 'Enter') { ke.preventDefault(); input.blur(); }
                    if (ke.key === 'Escape') { input.value = currentName; input.blur(); }
                });
                input.addEventListener('click', (ce) => ce.stopPropagation());
                input.addEventListener('mousedown', (ce) => ce.stopPropagation());
            });
            // Also prevent single-click on name from triggering label select
            nameSpan.addEventListener('click', (e) => e.stopPropagation());
        });

        // Click bar to select the animation (highlight) + drag to move
        trackArea.querySelectorAll('.timeline-bar').forEach(bar => {
            bar.addEventListener('mousedown', (e) => {
                if (e.button !== 0) return;
                if (e.target.closest('.tl-bar-delete')) return;
                e.stopPropagation(); // prevent playhead scrub

                if (bar.dataset.faceMergeId) {
                    const memberIds = this.objects.groups?.[bar.dataset.faceMergeId];
                    if (memberIds) this.objects.select(memberIds);
                    trackArea.querySelectorAll('.timeline-bar').forEach(b => b.classList.remove('selected'));
                    bar.classList.add('selected');
                    return;
                }

                const selectionKey = this._makeAnimSelectionKey(bar.dataset.objId, bar.dataset.animId);
                const selectionMode = e.shiftKey ? 'range' : ((e.ctrlKey || e.metaKey) ? 'toggle' : 'replace');
                const wasInMultiSelection = this.selectedAnimKeys.size > 1 && this.selectedAnimKeys.has(selectionKey);
                if (!(wasInMultiSelection && selectionMode === 'replace')) {
                    this._selectAnimationBar(bar.dataset.objId, bar.dataset.animId, { mode: selectionMode });
                }
                this.objects.select([bar.dataset.objId]);

                // Start drag
                const obj = this.objects.getObjectById(bar.dataset.objId);
                const anim = obj?.animations.find(a => a.id === bar.dataset.animId);
                if (anim) {
                    this.isDraggingBar = true;
                    this._barDragStartX = e.clientX;
                    this._barDragStartY = e.clientY;
                    const cfgs = Array.isArray(anim.generated) ? anim.generated : [anim.generated];
                    let mxEnd = 0;
                    cfgs.forEach(c => { if (c && c.duration) mxEnd = Math.max(mxEnd, (c._stepDelay || 0) + c.duration); });
                    let rpt = 1;
                    if (anim.repeat === '-1') rpt = 3;
                    else if (anim.repeat === 'pingpong') rpt = 2;
                    else rpt = Math.max(1, parseInt(anim.repeat) || 1);
                    const selectedTargets = this._getSelectedAnimationTargets();
                    const dragTargets = selectedTargets.length > 1 && this.selectedAnimKeys.has(selectionKey)
                        ? selectedTargets.map(target => {
                            const targetBar = trackArea.querySelector(`.timeline-bar[data-anim-id="${target.animId}"][data-obj-id="${target.objId}"]`);
                            const targetTrack = targetBar?.parentElement;
                            return {
                                ...target,
                                origDelay: target.anim.delay || 0,
                                totalDur: target.totalDur || this._getAnimationTotalDuration(target.anim),
                                barEl: targetBar,
                                kfEls: targetTrack ? targetTrack.querySelectorAll(`.timeline-keyframe[data-anim-id="${target.animId}"][data-obj-id="${target.objId}"]`) : null
                            };
                        })
                        : null;
                    this.dragBarData = {
                        animId: anim.id,
                        objId: bar.dataset.objId,
                        edit3D: window.Realistic3DLibrary?.canEdit(obj,anim),
                        startX: e.clientX,
                        origDelay: anim.delay || 0,
                        totalDur: (mxEnd || 1000) * rpt,
                        targets: dragTargets
                    };
                }
            });

            // Single-click (no drag) on bar → open animation settings for editing
            bar.addEventListener('mouseup', (e) => {
                if (e.button !== 0) return;
                if (e.target.closest('.tl-bar-delete')) return;
                if (bar.dataset.faceMergeId) return;
                if (e.ctrlKey || e.metaKey || e.shiftKey || this.selectedAnimKeys.size > 1) return;
                // Only trigger if the mouse didn't move (not a drag)
                const dx = Math.abs(e.clientX - (this._barDragStartX || 0));
                const dy = Math.abs(e.clientY - (this._barDragStartY || 0));
                if (dx > 3 || dy > 3) return; // was a drag, ignore

                const objId = bar.dataset.objId;
                const animId = bar.dataset.animId;
                const obj = this.objects.getObjectById(objId);
                if (window.Realistic3DLibrary?.canEdit(obj,obj?.animations.find(c=>c.id===animId))) return;
                this._openAnimationSettings(objId, animId);
            });

            // Right-click bar for context menu (copy/paste/duplicate/repeat)
            bar.addEventListener('contextmenu', (e) => {
                if (bar.dataset.faceMergeId) {
                    e.preventDefault();
                    const memberIds = this.objects.groups?.[bar.dataset.faceMergeId];
                    if (memberIds) this.objects.select(memberIds);
                    Utils.showToast('Use Unmerge to edit individual face-set animation bars.', 'info');
                    return;
                }
                const selectionKey = this._makeAnimSelectionKey(bar.dataset.objId, bar.dataset.animId);
                if (!this.selectedAnimKeys.has(selectionKey)) {
                    this._selectAnimationBar(bar.dataset.objId, bar.dataset.animId);
                }
                this.objects.select([bar.dataset.objId]);

                if (this._getSelectedAnimationTargets().length > 1) {
                    this._showSelectedBarsGroupMenu(e);
                } else {
                    this._showBarContextMenu(e, bar.dataset.objId, bar.dataset.animId);
                }
            });

            // Double-click bar to open keyframe curve editor
            bar.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                if (bar.dataset.faceMergeId) {
                    const memberIds = this.objects.groups?.[bar.dataset.faceMergeId];
                    if (memberIds) this.objects.select(memberIds);
                    Utils.showToast('Face-set animation is merged. Unmerge to edit individual bars.', 'info');
                    return;
                }
                const objId = bar.dataset.objId;
                const animId = bar.dataset.animId;
                const obj = this.objects.getObjectById(objId);
                const anim = obj?.animations.find(candidate => candidate.id === animId);
                if (window.Realistic3DLibrary?.canEdit(obj,anim)) {
                    window.Realistic3DLibrary.open(window.app,obj,animId);
                    return;
                }
                if (window.app?.jointSystem?._getArmatureRecordedAction(anim?._armatureActionId)?.recipe) {
                    window.app.jointSystem._editArmatureRecordedAction(anim._armatureActionId);
                    return;
                }
                if (this._getAudioLipSyncConfig(anim)) {
                    this._openAudioLipSyncAnimation(anim);
                    return;
                }
                if (window.app?.keyframeEditor) {
                    window.app.keyframeEditor.open(objId, animId);
                }
            });
        });

        // Keyframe drag to resize
        trackArea.querySelectorAll('.timeline-keyframe').forEach(kf => {
            kf.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                const animId = kf.dataset.animId;
                const objId = kf.dataset.objId;
                const edge = kf.dataset.edge;
                const obj = this.objects.getObjectById(objId);
                const anim = obj?.animations.find(a => a.id === animId);
                if (!anim) return;

                const configs = Array.isArray(anim.generated) ? anim.generated : [anim.generated];
                const dur = configs[0]?.duration || 1000;
                let mxEnd = 0;
                configs.forEach(c => { if (c && c.duration) mxEnd = Math.max(mxEnd, (c._stepDelay || 0) + c.duration); });
                let rpt = 1;
                if (anim.repeat === '-1') rpt = 3;
                else if (anim.repeat === 'pingpong') rpt = 2;
                else rpt = Math.max(1, parseInt(anim.repeat) || 1);

                this.isDraggingKeyframe = true;
                this.dragKfData = {
                    animId, objId, edge,
                    startX: e.clientX,
                    origDelay: anim.delay || 0,
                    origDuration: dur,
                    origMaxEnd: mxEnd || dur,
                    repeatCount: rpt
                };

                // Highlight this keyframe
                trackArea.querySelectorAll('.timeline-keyframe').forEach(k => k.classList.remove('selected'));
                kf.classList.add('selected');

                // Also select the parent bar
                trackArea.querySelectorAll('.timeline-bar').forEach(b => b.classList.remove('selected'));
                const bar = trackArea.querySelector(`.timeline-bar[data-anim-id="${animId}"]`);
                if (bar) bar.classList.add('selected');
                this._selectAnimationBar(objId, animId);
            });
        });

        // Delete button on each bar
        trackArea.querySelectorAll('.tl-bar-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const animId = btn.dataset.animId;
                const objId = btn.dataset.objId;
                this.deleteAnimation(objId, animId);
            });
        });
    }

    get duration() {
        return (this.animations.totalDuration || 5000) / 1000;
    }

    toJSON() {
        return {
            pixelsPerSecond: this.pixelsPerSecond,
            collapsedTracks: [...this.collapsedTracks],
            hiddenTracks: [...this.hiddenTracks],
            collapsedTimelineGroups: this._collapsedTimelineGroups ? [...this._collapsedTimelineGroups] : [],
            bulkShiftSelection: [...this.bulkShiftSelection],
            bulkShiftLocked: this.bulkShiftLocked,
            sequenceOrderMap: { ...this.sequenceOrderMap }
        };
    }

    loadFromData(data) {
        if (data?.pixelsPerSecond) this.pixelsPerSecond = data.pixelsPerSecond;
        if (data?.collapsedTracks) this.collapsedTracks = new Set(data.collapsedTracks);
        if (data?.hiddenTracks) this.hiddenTracks = new Set(data.hiddenTracks);
        if (data?.collapsedTimelineGroups) this._collapsedTimelineGroups = new Set(data.collapsedTimelineGroups);
        if (data?.bulkShiftSelection) this.bulkShiftSelection = new Set(data.bulkShiftSelection.map(id => String(id)));
        if (typeof data?.bulkShiftLocked === 'boolean') this.bulkShiftLocked = data.bulkShiftLocked;
        if (data?.sequenceOrderMap && typeof data.sequenceOrderMap === 'object') {
            this.sequenceOrderMap = Object.fromEntries(
                Object.entries(data.sequenceOrderMap).map(([id, order]) => [String(id), parseInt(order, 10)])
            );
        }
        this.update();
    }
}
