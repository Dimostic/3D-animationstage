/* ============================================
   Animation Stage - Audio Lip Sync
   Shared analysis, cue editing, and runtime
   adapters for Universal and SVG characters.
   ============================================ */

(function (global) {
    'use strict';

    function createAudioLipSyncRuntime() {
        const VISEMES = Object.freeze({
            rest: Object.freeze({ mouthOpen: 0, mouthWide: 0, mouthRound: 0, lipPress: 0, jawOpen: 0, upperLipLift: 0, lowerLipDrop: 0 }),
            MBP: Object.freeze({ mouthOpen: 0.01, mouthWide: -0.04, mouthRound: 0, lipPress: 0.88, jawOpen: 0, upperLipLift: -0.04, lowerLipDrop: -0.05 }),
            FV: Object.freeze({ mouthOpen: 0.20, mouthWide: 0.12, mouthRound: 0, lipPress: 0.20, jawOpen: 0.05, upperLipLift: 0.10, lowerLipDrop: 0.08 }),
            L: Object.freeze({ mouthOpen: 0.34, mouthWide: 0.10, mouthRound: 0.03, lipPress: 0, jawOpen: 0.18, upperLipLift: 0.13, lowerLipDrop: 0.42 }),
            A: Object.freeze({ mouthOpen: 0.78, mouthWide: 0.18, mouthRound: 0.04, lipPress: 0, jawOpen: 0.64, upperLipLift: 0.22, lowerLipDrop: 0.86 }),
            E: Object.freeze({ mouthOpen: 0.40, mouthWide: 0.72, mouthRound: 0, lipPress: 0, jawOpen: 0.20, upperLipLift: 0.12, lowerLipDrop: 0.36 }),
            O_U: Object.freeze({ mouthOpen: 0.55, mouthWide: -0.50, mouthRound: 0.90, lipPress: 0.03, jawOpen: 0.36, upperLipLift: 0.20, lowerLipDrop: 0.56 })
        });
        const CHANNELS = Object.freeze([
            'mouthOpen', 'mouthWide', 'mouthRound', 'lipPress', 'jawOpen',
            'upperLipLift', 'lowerLipDrop'
        ]);
        const SPEECH_STYLES = Object.freeze({
            natural: Object.freeze({ gaze: 1, head: 1, hands: 1, body: 1, expression: 1 }),
            formal: Object.freeze({ gaze: 0.82, head: 0.72, hands: 0.68, body: 0.58, expression: 0.62 }),
            warm: Object.freeze({ gaze: 1.05, head: 0.92, hands: 0.96, body: 0.82, expression: 1.18 }),
            energetic: Object.freeze({ gaze: 1.12, head: 1.24, hands: 1.32, body: 1.20, expression: 1.12 }),
            calm: Object.freeze({ gaze: 0.70, head: 0.56, hands: 0.52, body: 0.46, expression: 0.72 })
        });
        const SEMANTIC_PROFILES = Object.freeze({
            question: Object.freeze({ handMode: 'open', headMode: 'tilt', expression: 'curious' }),
            negative: Object.freeze({ handMode: 'single', headMode: 'shake', expression: 'firm' }),
            greeting: Object.freeze({ handMode: 'both', headMode: 'nod', expression: 'warm' }),
            gratitude: Object.freeze({ handMode: 'both', headMode: 'nod', expression: 'warm' }),
            enumeration: Object.freeze({ handMode: 'count', headMode: 'nod', expression: 'focused' }),
            deictic: Object.freeze({ handMode: 'point', headMode: 'follow', expression: 'focused' }),
            contrast: Object.freeze({ handMode: 'contrast', headMode: 'tilt', expression: 'skeptical' }),
            inclusive: Object.freeze({ handMode: 'both', headMode: 'nod', expression: 'warm' }),
            affirmation: Object.freeze({ handMode: 'single', headMode: 'nod', expression: 'confident' }),
            emphasis: Object.freeze({ handMode: 'single', headMode: 'nod', expression: 'confident' }),
            statement: Object.freeze({ handMode: 'beat', headMode: 'nod', expression: 'neutral' })
        });
        const EMOTION_PROFILES = Object.freeze({
            neutral: Object.freeze({ browRaise: 0, smile: 0, gazeX: 0, gazeY: 0, headNod: 0.08, headTilt: 0, bodyLean: 0.04, bodySway: 0, gestureGain: 1 }),
            warm: Object.freeze({ browRaise: 0.48, smile: 0.42, gazeX: 0, gazeY: 0.02, headNod: 0.24, headTilt: 0.16, bodyLean: 0.18, bodySway: 0.06, gestureGain: 1.04 }),
            confident: Object.freeze({ browRaise: 0.22, smile: 0.16, gazeX: 0, gazeY: -0.06, headNod: 0.52, headTilt: 0.04, bodyLean: 0.30, bodySway: 0.02, gestureGain: 1.12 }),
            excited: Object.freeze({ browRaise: 0.92, smile: 0.58, gazeX: 0.18, gazeY: -0.18, headNod: 0.78, headTilt: 0.26, bodyLean: 0.46, bodySway: 0.16, gestureGain: 1.25 }),
            serious: Object.freeze({ browRaise: -0.62, smile: -0.24, gazeX: 0, gazeY: 0.06, headNod: 0.28, headTilt: 0, bodyLean: 0.24, bodySway: 0, gestureGain: 0.82 }),
            concerned: Object.freeze({ browRaise: 0.42, smile: -0.34, gazeX: 0.12, gazeY: 0.20, headNod: 0.12, headTilt: 0.48, bodyLean: 0.20, bodySway: 0.08, gestureGain: 0.72 }),
            thoughtful: Object.freeze({ browRaise: 0.28, smile: -0.04, gazeX: 0.46, gazeY: -0.22, headNod: 0.10, headTilt: 0.62, bodyLean: 0.12, bodySway: 0.08, gestureGain: 0.65 }),
            curious: Object.freeze({ browRaise: 1.10, smile: 0.10, gazeX: 0.28, gazeY: -0.24, headNod: 0.32, headTilt: 0.72, bodyLean: 0.22, bodySway: 0.08, gestureGain: 0.86 }),
            focused: Object.freeze({ browRaise: 0.12, smile: 0.02, gazeX: 0, gazeY: 0.12, headNod: 0.40, headTilt: 0.02, bodyLean: 0.28, bodySway: 0, gestureGain: 0.90 }),
            skeptical: Object.freeze({ browRaise: 0.34, smile: -0.12, gazeX: 0.34, gazeY: 0.06, headNod: 0.08, headTilt: 0.72, bodyLean: 0.14, bodySway: 0.12, gestureGain: 0.70 }),
            firm: Object.freeze({ browRaise: -0.78, smile: -0.20, gazeX: 0, gazeY: 0.05, headNod: 0.48, headTilt: 0, bodyLean: 0.36, bodySway: 0, gestureGain: 0.92 })
        });
        const EMOTION_KINDS = Object.freeze(Object.keys(EMOTION_PROFILES));
        const HAND_MODES = Object.freeze([
            'beat', 'single', 'both', 'open', 'point', 'count', 'contrast',
            'wave', 'thumbs-up', 'present', 'shrug', 'hands-on-hips',
            'arms-crossed', 'prayer', 'celebrate', 'none'
        ]);
        const BILATERAL_HAND_MODES = Object.freeze([
            'both', 'shrug', 'hands-on-hips', 'arms-crossed', 'prayer', 'celebrate'
        ]);
        const HAND_PATTERNS = Object.freeze(['alternating', 'coordinated']);
        const normalizedCueCache = new WeakMap();
        const performancePlanCache = new WeakMap();
        const choreographyIndexCache = new WeakMap();

        function clamp(value, min, max, fallback = 0) {
            const numeric = Number(value);
            return Math.max(min, Math.min(max, Number.isFinite(numeric) ? numeric : fallback));
        }

        function normalizeViseme(value) {
            const raw = String(value || 'rest').trim().toUpperCase().replace(/[\s/-]+/g, '_');
            if (raw === 'O' || raw === 'U' || raw === 'OU' || raw === 'O_U') return 'O_U';
            if (raw === 'M' || raw === 'B' || raw === 'P' || raw === 'MBP') return 'MBP';
            if (raw === 'F' || raw === 'V' || raw === 'FV') return 'FV';
            if (raw === 'L' || raw === 'A' || raw === 'E') return raw;
            return 'rest';
        }

        function normalizeCue(cue = {}, index = 0) {
            const startMs = Math.max(0, Number(cue.startMs ?? cue.timeMs) || 0);
            const explicitEnd = Number(cue.endMs);
            const duration = Math.max(24, Number(cue.durationMs) || 80);
            const endMs = Number.isFinite(explicitEnd) && explicitEnd > startMs
                ? explicitEnd
                : startMs + duration;
            return {
                id: String(cue.id || `cue-${index}`),
                startMs,
                endMs,
                viseme: normalizeViseme(cue.viseme),
                strength: clamp(cue.strength, 0, 1.5, 1)
            };
        }

        function normalizeCues(cues = []) {
            return (Array.isArray(cues) ? cues : [])
                .map(normalizeCue)
                .filter(cue => cue.endMs > cue.startMs)
                .sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);
        }

        function channelsFor(viseme, strength = 1) {
            const shape = VISEMES[normalizeViseme(viseme)] || VISEMES.rest;
            const amount = clamp(strength, 0, 1.5, 1);
            return Object.fromEntries(CHANNELS.map(channel => [channel, shape[channel] * amount]));
        }

        function smoothstep(value) {
            const amount = clamp(value, 0, 1, 0);
            return amount * amount * (3 - 2 * amount);
        }

        function motionEase(value) {
            const amount = clamp(value, 0, 1, 0);
            return amount * amount * amount * (amount * (amount * 6 - 15) + 10);
        }

        function blendChannels(from, to, amount) {
            const t = clamp(amount, 0, 1, 0);
            return Object.fromEntries(CHANNELS.map(channel => {
                const fromValue = Number(from?.[channel]) || 0;
                const toValue = Number(to?.[channel]) || 0;
                let channelTime = t;
                if (channel === 'jawOpen' || channel === 'lowerLipDrop') {
                    const opening = toValue > fromValue;
                    channelTime = opening
                        ? clamp((t - 0.06) / 0.94, 0, 1, 0)
                        : clamp((t - 0.02) / 0.98, 0, 1, 0);
                } else if (channel === 'upperLipLift') {
                    channelTime = clamp((t + 0.035) / 1.035, 0, 1, 0);
                }
                return [channel, fromValue + (toValue - fromValue) * smoothstep(channelTime)];
            }));
        }

        function getPerformanceOptions(config = {}) {
            const performance = config.performance && typeof config.performance === 'object'
                ? config.performance
                : {};
            const motionMode = performance.motionMode === 'mouth-only' ? 'mouth-only' : 'full';
            const performanceEnabled = motionMode === 'full';
            const intensity = (value, legacy) => {
                if (!performanceEnabled) return 0;
                if (Number.isFinite(Number(value))) return clamp(value, 0, 1.5, 0);
                return legacy === true ? 1 : 0;
            };
            const eyeIntensity = intensity(performance.eyeIntensity, performance.eyeMovement);
            const headIntensity = intensity(performance.headIntensity, performance.headMovement);
            const handIntensity = intensity(performance.handIntensity, performance.handGestures);
            const bodyIntensity = intensity(performance.bodyIntensity, performance.bodyMovement);
            const expressionIntensity = performanceEnabled && Number.isFinite(Number(performance.expressionIntensity))
                ? clamp(performance.expressionIntensity, 0, 1.5, eyeIntensity)
                : eyeIntensity;
            const deliveryStyle = Object.hasOwn(SPEECH_STYLES, performance.deliveryStyle)
                ? performance.deliveryStyle
                : 'natural';
            const savedHandPattern = String(performance.handPattern || '');
            const legacyCoordinatedDefault = config.type === 'audio-lip-sync'
                && Number(config.version) > 0
                && Number(config.version) < 20
                && savedHandPattern === 'coordinated';
            const handPattern = legacyCoordinatedDefault
                ? 'alternating'
                : HAND_PATTERNS.includes(savedHandPattern)
                ? savedHandPattern
                : 'alternating';
            const handSpeed = clamp(performance.handSpeed, 0.4, 1.6, 0.8);
            return {
                motionMode,
                eyeIntensity,
                headIntensity,
                handIntensity,
                bodyIntensity,
                expressionIntensity,
                deliveryStyle,
                handPattern,
                handSpeed,
                styleProfile: SPEECH_STYLES[deliveryStyle],
                semanticGestures: performanceEnabled && performance.semanticGestures !== false,
                eyeMovement: eyeIntensity > 0,
                headMovement: headIntensity > 0,
                handGestures: handIntensity > 0,
                bodyMovement: bodyIntensity > 0,
                facialExpression: expressionIntensity > 0
            };
        }

        function coordinatePerformanceHands(config = {}, performance = {}, objectsById = null) {
            const handA = Number(performance.handA) || 0;
            const handB = Number(performance.handB) || 0;
            const handPattern = HAND_PATTERNS.includes(performance.handPattern)
                ? performance.handPattern
                : config.performance?.handPattern;

            // "One Arm at a Time" is a whole-character contract, not a side-view
            // special case. Removing the shared amount gives the outgoing arm a
            // complete return through idle before the incoming arm takes over.
            const authoredBilateral = performance.authoredGestureActive === true
                && BILATERAL_HAND_MODES.includes(String(performance.gestureMode || ''));
            if (handPattern === 'alternating' && !authoredBilateral) {
                const overlap = Math.min(handA, handB);
                return {
                    ...performance,
                    handA: Math.max(0, handA - overlap),
                    handB: Math.max(0, handB - overlap)
                };
            }

            let bilateral = config.performanceTargets?.handParticipation === 'bilateral-side';
            if (!bilateral && objectsById) {
                const candidates = [
                    objectsById?.[config.rootId],
                    ...Object.values(objectsById)
                ].filter(Boolean);
                bilateral = candidates.some(obj => {
                    const view = String(
                        obj._svgCharacterViewProfileKey
                        || obj._ucCharacterVariantKey
                        || ''
                    ).toLowerCase();
                    return /^side(?:[-:]|$)/.test(view)
                        || obj._armaturePromotedProfile === 'side-dual';
                });
            }
            if (!bilateral) return performance;

            const companionRatios = {
                beat: 0.72,
                both: 0.90,
                open: 0.68
            };
            const companionRatio = companionRatios[String(performance.gestureMode || 'beat')];
            const peak = Math.max(handA, handB);
            if (!Number.isFinite(companionRatio) || peak <= 0.001) return performance;
            return {
                ...performance,
                handA: Math.max(handA, peak * companionRatio),
                handB: Math.max(handB, peak * companionRatio)
            };
        }

        function amplifySvgMouthChannels(channels = {}, gain = 1.45, teethVisibility = .6) {
            const amount = clamp(gain, 0.75, 3.2, 1.45);
            const widthGain = 1 + (amount - 1) * 0.72;
            const roundGain = 1 + (amount - 1) * 0.62;
            return {
                mouthOpen: clamp((Number(channels.mouthOpen) || 0) * amount + (Number(channels.jawOpen) || 0) * 0.08, 0, 1),
                mouthWide: clamp((Number(channels.mouthWide) || 0) * widthGain, -1, 1),
                mouthRound: clamp((Number(channels.mouthRound) || 0) * roundGain, 0, 1),
                lipPress: clamp((Number(channels.lipPress) || 0) * (1 + (amount - 1) * 0.28), 0, 1),
                jawOpen: clamp((Number(channels.jawOpen) || 0) * amount, 0, 1),
                upperLipLift: clamp((Number(channels.upperLipLift) || 0) * amount, -1, 1),
                lowerLipDrop: clamp((Number(channels.lowerLipDrop) || 0) * amount, -1, 1),
                mouthOpeningGain: amount,
                teethVisibility: clamp(teethVisibility,0,1,.6)
            };
        }

        function getUniversalMouthFrame(frame = {}, gain = 1.45) {
            const viseme = normalizeViseme(frame.viseme);
            const sourceChannels = frame.channels && typeof frame.channels === 'object'
                ? frame.channels
                : channelsFor(viseme, frame.strength);
            const amplified = amplifySvgMouthChannels(sourceChannels, gain);
            const quantized = {};
            CHANNELS.forEach(channel => {
                const signed = channel === 'mouthWide' || channel === 'upperLipLift' || channel === 'lowerLipDrop';
                const value = clamp(amplified[channel], signed ? -1 : 0, 1, 0);
                quantized[channel] = Math.round(value * 4) / 4;
            });
            quantized.mouthOpeningGain = amplified.mouthOpeningGain;
            const channelKey = CHANNELS.map(channel => quantized[channel].toFixed(2)).join(':');
            const gainKey = Math.round(amplified.mouthOpeningGain * 100);
            const active = CHANNELS.some(channel => Math.abs(quantized[channel]) >= 0.125);
            return {
                key: `mouth-${viseme}-${gainKey}-${channelKey}`,
                viseme,
                channels: quantized,
                active
            };
        }

        function collectUniversalMouthFrames(config = {}) {
            const cues = normalizeCues(config.cues);
            if (!cues.length) return [];
            const smoothingMs = clamp(config.smoothingMs, 0, 260, 55);
            const masterStrength = clamp(config.strength, 0, 1.5, 1);
            const gain = config.mouthOpeningGain ?? config.svgMouthGain ?? 1.45;
            const frames = new Map();
            const addFrame = (viseme, channels, strength = 1) => {
                const descriptor = getUniversalMouthFrame({ viseme, channels, strength }, gain);
                if (descriptor.active) frames.set(descriptor.key, descriptor);
            };
            const addTransition = (fromCue, toCue, midpointMode = 'inclusive') => {
                const fromViseme = fromCue?.viseme || 'rest';
                const toViseme = toCue?.viseme || 'rest';
                const fromStrength = (Number(fromCue?.strength) || 0) * masterStrength;
                const toStrength = (Number(toCue?.strength) || 0) * masterStrength;
                const fromChannels = channelsFor(fromViseme, fromStrength);
                const toChannels = channelsFor(toViseme, toStrength);
                for (let step = 0; step <= 100; step += 1) {
                    const amount = step / 100;
                    const useToViseme = midpointMode === 'to'
                        || (midpointMode === 'inclusive' ? amount >= 0.5 : amount > 0.5);
                    addFrame(
                        useToViseme ? toViseme : fromViseme,
                        blendChannels(fromChannels, toChannels, amount),
                        useToViseme ? toStrength : fromStrength
                    );
                }
            };

            cues.forEach((cue, index) => {
                const cueStrength = cue.strength * masterStrength;
                addFrame(cue.viseme, channelsFor(cue.viseme, cueStrength), cueStrength);
                if (smoothingMs <= 0) return;

                const previous = cues[index - 1];
                const startSource = previous && previous.endMs >= cue.startMs - smoothingMs
                    ? previous
                    : null;
                addTransition(startSource, cue, startSource ? 'inclusive' : 'to');

                const next = cues[index + 1];
                const endTarget = next && next.startMs <= cue.endMs + smoothingMs
                    ? next
                    : null;
                addTransition(cue, endTarget, 'exclusive');
            });
            return [...frames.values()];
        }

        function resolveUniversalMouthSource(target = {}, frame = {}, gain = 1.45) {
            const descriptor = getUniversalMouthFrame(frame, gain);
            if (!descriptor.active) return target.sources?.rest || '';
            return target.frameSources?.[descriptor.key]
                || target.sources?.[descriptor.viseme]
                || target.sources?.rest
                || '';
        }

        function windowEnvelope(value, start, end, edge = 160) {
            if (value <= start || value >= end) return 0;
            const attack = motionEase((value - start) / Math.max(1, edge));
            const release = motionEase((end - value) / Math.max(1, edge));
            return Math.min(attack, release);
        }

        function eventPulse(value, center, attack = 150, release = 520) {
            if (value < center - attack || value > center + release) return 0;
            if (value <= center) return motionEase((value - center + attack) / Math.max(1, attack));
            return 1 - motionEase((value - center) / Math.max(1, release));
        }

        function parseTranscriptTimecode(value) {
            const parts = String(value || '').trim().replace(',', '.').split(':').map(Number);
            if (!parts.length || parts.some(part => !Number.isFinite(part))) return null;
            if (parts.length === 3) return ((parts[0] * 3600) + (parts[1] * 60) + parts[2]) * 1000;
            if (parts.length === 2) return ((parts[0] * 60) + parts[1]) * 1000;
            return parts[0] * 1000;
        }

        function parseTranscriptSegments(text, durationMs = 0) {
            const value = String(text || '').trim();
            const duration = Math.max(1, Number(durationMs) || 1);
            if (!value) return [];
            try {
                const parsed = JSON.parse(value);
                if (Array.isArray(parsed)) {
                    return parsed.map(item => ({
                        ...(typeof item.id === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(item.id) ? { id: item.id } : {}),
                        startMs: Number(item.startMs ?? item.start ?? item.timeMs) || 0,
                        endMs: Number(item.endMs ?? item.end) || 0,
                        text: String(item.text ?? item.word ?? item.label ?? '').trim()
                    })).filter(item => item.text && item.endMs > item.startMs && item.startMs <= duration);
                }
            } catch (_) {}

            // YouTube/transcript style: a bare timecode on its own line (e.g.
            // "0:03") followed by the caption text, with no "-->" arrows. The
            // timecode becomes the cue start; the next timecode (or the clip
            // duration) is the end, so the timestamps never leak into the text.
            if (!/-->/.test(value)) {
                const bareTimecode = /^[\[(]?\s*(\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d{1,3})?)\s*[\])]?$/;
                const blocks = [];
                value.split(/\r?\n/).forEach(raw => {
                    const line = raw.trim();
                    if (!line) return;
                    const match = line.match(bareTimecode);
                    if (match) {
                        blocks.push({ startMs: parseTranscriptTimecode(match[1]) ?? 0, parts: [] });
                    } else if (blocks.length) {
                        blocks[blocks.length - 1].parts.push(line.replace(/<[^>]+>/g, ''));
                    }
                });
                if (blocks.length >= 2) {
                    const stamped = [];
                    for (let index = 0; index < blocks.length; index++) {
                        const startMs = Math.max(0, Number(blocks[index].startMs) || 0);
                        const text = blocks[index].parts.join(' ').replace(/\s+/g, ' ').trim();
                        if (!text) continue;
                        let endMs = index + 1 < blocks.length
                            ? Math.max(0, Number(blocks[index + 1].startMs) || 0)
                            : duration;
                        if (!(endMs > startMs)) endMs = startMs + 1;
                        stamped.push({ startMs, endMs, text });
                    }
                    if (stamped.length) {
                        return stamped.filter(item => item.text && item.endMs > item.startMs && item.startMs <= duration);
                    }
                }
            }

            const timed = [];
            const lines = value.split(/\r?\n/);
            for (let index = 0; index < lines.length; index++) {
                const line = lines[index].trim();
                const arrow = line.match(/((?:\d{1,2}:)?\d{1,2}:\d{2}[.,]\d{1,3})\s*-->\s*((?:\d{1,2}:)?\d{1,2}:\d{2}[.,]\d{1,3})/);
                if (arrow) {
                    const captions = [];
                    for (let captionIndex = index + 1; captionIndex < lines.length; captionIndex++) {
                        const caption = lines[captionIndex].trim();
                        if (!caption || caption.includes('-->')) break;
                        if (/^\d+$/.test(caption) && !captions.length) continue;
                        captions.push(caption.replace(/<[^>]+>/g, ''));
                    }
                    const startMs = parseTranscriptTimecode(arrow[1]);
                    const endMs = parseTranscriptTimecode(arrow[2]);
                    if (captions.length && startMs != null && endMs != null) {
                        timed.push({ startMs, endMs, text: captions.join(' ') });
                    }
                    continue;
                }
                const bracket = line.match(/^\[?((?:\d{1,2}:){0,2}\d{1,2}(?:[.,]\d{1,3})?)\s*-\s*((?:\d{1,2}:){0,2}\d{1,2}(?:[.,]\d{1,3})?)\]?\s+(.+)$/);
                if (bracket) {
                    const startMs = parseTranscriptTimecode(bracket[1]);
                    const endMs = parseTranscriptTimecode(bracket[2]);
                    if (startMs != null && endMs != null) timed.push({ startMs, endMs, text: bracket[3] });
                }
            }
            return timed.filter(item => item.text && item.endMs > item.startMs && item.startMs <= duration);
        }

        function splitSemanticTranscript(text) {
            const cleaned = String(text || '')
                .replace(/^\s*WEBVTT.*$/gim, ' ')
                .replace(/^\s*\d+\s*$/gm, ' ')
                .replace(/^.*-->.*$/gm, ' ')
                .replace(/^\s*\[?(?:(?:\d{1,2}:){0,2}\d{1,2}(?:[.,]\d{1,3})?)\s*-\s*(?:(?:\d{1,2}:){0,2}\d{1,2}(?:[.,]\d{1,3})?)\]?\s*/gm, '')
                .replace(/<[^>]+>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            return (cleaned.match(/[^.!?;]+[.!?;]?/g) || [])
                .map(sentence => sentence.trim())
                .filter(Boolean);
        }

        function getSemanticProfile(kind = 'statement') {
            const normalized = Object.hasOwn(SEMANTIC_PROFILES, kind) ? kind : 'statement';
            return { kind: normalized, ...SEMANTIC_PROFILES[normalized] };
        }

        function normalizeEmotion(value, kind = 'statement') {
            const aliases = {
                happy: 'warm',
                energetic: 'excited',
                calm: 'neutral',
                assertive: 'confident',
                negative: 'serious'
            };
            const candidate = String(value || '').trim().toLowerCase();
            const normalized = aliases[candidate] || candidate;
            if (Object.hasOwn(EMOTION_PROFILES, normalized)) return normalized;
            const fallback = getSemanticProfile(kind).expression;
            return Object.hasOwn(EMOTION_PROFILES, fallback) ? fallback : 'neutral';
        }

        function getEmotionProfile(value = 'neutral', kind = 'statement') {
            const emotion = normalizeEmotion(value, kind);
            return { emotion, ...EMOTION_PROFILES[emotion] };
        }

        function normalizeHandMode(value, kind = 'statement') {
            const candidate = String(value || '').toLowerCase();
            return HAND_MODES.includes(candidate) ? candidate : getSemanticProfile(kind).handMode;
        }

        function normalizeWordAnchor(anchor) {
            if (!anchor || !['startWordId', 'endWordId'].every(key =>
                typeof anchor[key] === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(anchor[key]))) return null;
            return {
                startWordId: anchor.startWordId, endWordId: anchor.endWordId,
                offsetMs: clamp(anchor.offsetMs, -5000, 5000, 0)
            };
        }

        function normalizeSemanticEvent(event = {}, index = 0, durationMs = 0) {
            const duration = Math.max(1, Number(durationMs) || Number(event.endMs) || Number(event.timeMs) || 1);
            const profile = getSemanticProfile(event.kind);
            const startMs = clamp(event.startMs, 0, Math.max(0, duration - 1), 0);
            const endMs = Math.max(startMs + 1, clamp(event.endMs, startMs + 1, duration, Math.min(duration, startMs + 900)));
            const id = String(event.id || `semantic-${index}`);
            return {
                id,
                text: String(event.text || '').trim(),
                startMs,
                endMs,
                timeMs: clamp(event.timeMs, startMs, endMs, startMs + (endMs - startMs) * 0.48),
                timed: event.timed === true,
                kind: profile.kind,
                tags: Array.isArray(event.tags) ? event.tags.map(String) : [profile.kind],
                direction: Number(event.direction) < 0 ? -1 : 1,
                strength: clamp(event.strength, 0, 1.5, 0.72),
                handMode: normalizeHandMode(event.handMode, profile.kind),
                headMode: String(event.headMode || profile.headMode),
                expression: normalizeEmotion(event.expression || event.emotion || profile.expression, profile.kind),
                authored: event.authored === true || /^semantic-custom-/.test(id),
                wordAnchor: normalizeWordAnchor(event.wordAnchor)
            };
        }

        function normalizeSemanticEvents(events = [], durationMs = 0) {
            return (Array.isArray(events) ? events : [])
                .map((event, index) => normalizeSemanticEvent(event, index, durationMs))
                .filter(event => event.endMs > event.startMs)
                .sort((left, right) => left.startMs - right.startMs || left.timeMs - right.timeMs);
        }

        function retimeWordLinkedEvents(events = [], words = [], durationMs = 0) {
            const duration = Math.max(1, Number(durationMs) || 1);
            const byId = new Map();
            (Array.isArray(words) ? words : []).forEach((word, index) => {
                if (word?.id) byId.set(word.id, byId.has(word.id) ? null : { word, index });
            });
            const unresolvedIds = [];
            const resolved = (Array.isArray(events) ? events : []).map((raw, index) => {
                const event = normalizeSemanticEvent(raw, index, duration);
                const anchor = event.wordAnchor;
                if (!anchor) return event;
                const start = byId.get(anchor.startWordId);
                const end = byId.get(anchor.endWordId);
                if (!start || !end || start.index > end.index
                    || !Number.isFinite(start.word.startMs) || !Number.isFinite(end.word.endMs)
                    || end.word.endMs <= start.word.startMs) {
                    unresolvedIds.push(event.id);
                    return event;
                }
                const startMs = start.word.startMs + anchor.offsetMs;
                const endMs = end.word.endMs + anchor.offsetMs;
                if (endMs <= 0 || startMs >= duration) {
                    unresolvedIds.push(event.id);
                    return event;
                }
                return normalizeSemanticEvent({
                    ...event, startMs, endMs, timeMs: startMs + (endMs - startMs) * .48,
                    text: words.slice(start.index, end.index + 1).map(word => word.text).join(' '), timed: true
                }, index, duration);
            });
            return { events: resolved, unresolvedIds };
        }

        function classifySemanticText(text, index = 0) {
            const normalized = String(text || '').toLowerCase().replace(/\u2019/g, "'");
            const has = pattern => pattern.test(normalized);
            const tags = [];
            const add = (tag, pattern) => { if (has(pattern)) tags.push(tag); };
            add('question', /\?|^\s*(?:who|what|why|where|when|how|which|can|could|would|should|do|does|did|is|are|will)\b/);
            add('negative', /\b(?:no|not|never|cannot|can't|won't|don't|doesn't|isn't|aren't|without|avoid|stop)\b/);
            add('greeting', /\b(?:hello|hi|welcome|good morning|good afternoon|good evening|greetings)\b/);
            add('gratitude', /\b(?:thank you|thanks|appreciate|grateful)\b/);
            add('enumeration', /\b(?:first|second|third|fourth|next|finally|one|two|three|step \d+|\d+[.)])\b/);
            add('deictic', /\b(?:this|that|these|those|here|there|look|see|show|notice|observe)\b/);
            add('contrast', /\b(?:but|however|although|instead|whereas|yet|on the other hand)\b/);
            add('inclusive', /\b(?:we|us|our|ours|together|everyone|everybody|all of us)\b/);
            add('affirmation', /\b(?:yes|indeed|certainly|exactly|absolutely|correct|agreed)\b/);
            add('emphasis', /\b(?:important|key|critical|essential|must|remember|especially|significant|urgent)\b|!/);

            const priority = [
                'question', 'negative', 'greeting', 'gratitude', 'enumeration',
                'deictic', 'contrast', 'inclusive', 'affirmation', 'emphasis'
            ];
            const kind = priority.find(tag => tags.includes(tag)) || 'statement';
            const profile = getSemanticProfile(kind);
            const exclamation = (String(text || '').match(/!/g) || []).length;
            const uppercase = (String(text || '').match(/\b[A-Z]{2,}\b/g) || []).length;
            const strength = clamp(0.64 + Math.min(0.24, tags.length * 0.06) + Math.min(0.18, exclamation * 0.09 + uppercase * 0.04), 0.55, 1.12, 0.7);
            return {
                kind,
                tags,
                direction: index % 2 === 0 ? 1 : -1,
                strength,
                handMode: profile.handMode,
                headMode: profile.headMode,
                expression: profile.expression
            };
        }

        function buildSemanticEvents(transcript, durationMs, phrases = [], cues = [], options = {}) {
            if (options.semanticGestures === false || !String(transcript || '').trim()) return [];
            const duration = Math.max(1, Number(durationMs) || 1);
            const supplied = Array.isArray(options.transcriptSegments) ? options.transcriptSegments : [];
            const timed = supplied.length ? supplied : parseTranscriptSegments(transcript, duration);
            let units = timed.flatMap(item => {
                const startMs = clamp(item.startMs, 0, duration, 0);
                const endMs = clamp(item.endMs, 0, duration, duration);
                const sentences = splitSemanticTranscript(item.text);
                if (!sentences.length || endMs <= startMs) return [];
                const weights = sentences.map(sentence => Math.max(1, (sentence.match(/[\p{L}\p{N}']+/gu) || []).length));
                const totalWeight = Math.max(1, weights.reduce((sum, weight) => sum + weight, 0));
                let consumed = 0;
                return sentences.map((sentence, index) => {
                    const sentenceStart = startMs + (endMs - startMs) * consumed / totalWeight;
                    consumed += weights[index];
                    return {
                        text: sentence,
                        startMs: sentenceStart,
                        endMs: startMs + (endMs - startMs) * consumed / totalWeight,
                        timed: true
                    };
                });
            });

            if (!units.length) {
                const sentences = splitSemanticTranscript(transcript);
                const spans = phrases.length
                    ? phrases.map(phrase => ({ startMs: phrase.startMs, endMs: phrase.endMs }))
                    : [{ startMs: 0, endMs: duration }];
                const spokenDuration = Math.max(1, spans.reduce((sum, span) => sum + Math.max(1, span.endMs - span.startMs), 0));
                const timeAtRatio = ratio => {
                    let remaining = clamp(ratio, 0, 1, 0) * spokenDuration;
                    for (const span of spans) {
                        const length = Math.max(1, span.endMs - span.startMs);
                        if (remaining <= length) return span.startMs + remaining;
                        remaining -= length;
                    }
                    return spans[spans.length - 1]?.endMs || duration;
                };
                const weights = sentences.map(sentence => Math.max(1, (sentence.match(/[\p{L}\p{N}']+/gu) || []).length));
                const totalWeight = Math.max(1, weights.reduce((sum, weight) => sum + weight, 0));
                let consumed = 0;
                units = sentences.map((sentence, index) => {
                    const startRatio = consumed / totalWeight;
                    consumed += weights[index];
                    const endRatio = consumed / totalWeight;
                    return {
                        text: sentence,
                        startMs: timeAtRatio(startRatio),
                        endMs: timeAtRatio(endRatio),
                        timed: false
                    };
                });
            }

            const voiced = normalizeCues(cues).filter(cue => cue.viseme !== 'rest' && cue.strength > 0.04);
            return units.map((unit, index) => {
                const startMs = clamp(unit.startMs, 0, duration, 0);
                const endMs = Math.max(startMs + 1, clamp(unit.endMs, 0, duration, duration));
                const candidates = voiced.filter(cue => {
                    const midpoint = (cue.startMs + cue.endMs) * 0.5;
                    return midpoint >= startMs && midpoint <= endMs;
                });
                const strongest = candidates.reduce((best, cue) => (!best || cue.strength > best.strength ? cue : best), null);
                const timeMs = strongest
                    ? (strongest.startMs + strongest.endMs) * 0.5
                    : startMs + (endMs - startMs) * 0.48;
                return {
                    id: `semantic-${index}`,
                    text: unit.text,
                    startMs,
                    endMs,
                    timeMs: clamp(timeMs, startMs, endMs, startMs),
                    timed: unit.timed === true,
                    ...classifySemanticText(unit.text, index)
                };
            });
        }

        function buildProsodyEvents(phrases = [], semanticEvents = [], deliveryStyle = 'natural') {
            const styleEmotion = {
                formal: 'confident',
                warm: 'warm',
                energetic: 'excited',
                calm: 'neutral'
            };
            return (Array.isArray(phrases) ? phrases : []).map((phrase, index) => {
                const phraseStart = Number(phrase.startMs) || 0;
                const phraseEnd = Math.max(phraseStart + 1, Number(phrase.endMs) || phraseStart + 1);
                const semantic = (Array.isArray(semanticEvents) ? semanticEvents : [])
                    .map(event => {
                        const overlap = Math.max(0, Math.min(phraseEnd, event.endMs) - Math.max(phraseStart, event.startMs));
                        return { event, score: overlap * clamp(event.strength, 0.2, 1.5, 0.72) };
                    })
                    .filter(candidate => candidate.score > 0)
                    .sort((left, right) => right.score - left.score)[0]?.event || null;
                const cueStrengths = Array.isArray(phrase.cues)
                    ? phrase.cues.map(cue => clamp(cue.strength, 0, 1.5, 0)).filter(value => value > 0)
                    : [];
                const peak = cueStrengths.length
                    ? Math.max(...cueStrengths)
                    : clamp(phrase.strength, 0, 1.5, 0.65);
                const floor = cueStrengths.length ? Math.min(...cueStrengths) : peak;
                const dynamics = Math.max(0, peak - floor);
                let expression = semantic
                    ? normalizeEmotion(semantic.expression, semantic.kind)
                    : (styleEmotion[deliveryStyle] || (peak >= 1.02 ? 'confident' : 'neutral'));
                if (!semantic && deliveryStyle === 'natural' && peak >= 1.25) expression = 'excited';
                const strength = semantic
                    ? clamp(0.46 + semantic.strength * 0.30 + dynamics * 0.12, 0.42, 0.92, 0.65)
                    : clamp(0.30 + peak * 0.30 + dynamics * 0.18, 0.32, 0.76, 0.52);
                return {
                    id: `prosody-${index}`,
                    startMs: phraseStart,
                    endMs: phraseEnd,
                    timeMs: phraseStart + (phraseEnd - phraseStart) * 0.48,
                    expression,
                    direction: semantic ? semantic.direction : (index % 2 === 0 ? 1 : -1),
                    strength,
                    semantic: !!semantic
                };
            });
        }

        function buildGestureChoreography(events = [], durationMs = 0) {
            const duration = Math.max(1, Number(durationMs) || 1);
            const normalized = normalizeSemanticEvents(events, duration);
            const choreography = normalized.map((event, index) => {
                const span = Math.max(320, event.endMs - event.startMs);
                const strokeMs = clamp(event.timeMs, event.startMs, event.endMs, event.startMs + span * 0.48);
                const preparation = clamp(span * 0.28, 180, 420, 240);
                const hold = clamp(span * 0.10, 70, 180, 105);
                const recovery = clamp(span * 0.42, 320, 760, 460);
                return {
                    id: `choreography-${event.id || index}`,
                    eventId: event.id,
                    prepareMs: Math.max(0, Math.min(event.startMs - Math.min(90, event.startMs), strokeMs - preparation)),
                    strokeMs,
                    holdEndMs: Math.min(event.endMs + 80, strokeMs + hold),
                    recoverMs: Math.min(duration, Math.max(event.endMs + recovery, strokeMs + hold + recovery * 0.62)),
                    handRecoverMs: Math.min(duration, Math.max(event.endMs + recovery, strokeMs + hold + recovery * 0.62)),
                    connected: false
                };
            });

            choreography.forEach((event, index) => {
                const next = choreography[index + 1];
                if (!next || next.prepareMs - event.holdEndMs > 420) return;
                event.connected = true;
                event.recoverMs = Math.min(duration, Math.max(event.recoverMs, next.strokeMs + 80));
            });
            return choreography;
        }

        function choreographyEnvelope(localTimeMs, event = {}, leadMs = 0, recoveryLagMs = 0, recoveryOverrideMs = null) {
            const local = Number(localTimeMs) || 0;
            const prepare = (Number(event.prepareMs) || 0) - Math.max(0, Number(leadMs) || 0);
            const stroke = Math.max(prepare + 1, (Number(event.strokeMs) || prepare + 1) - Math.max(0, Number(leadMs) || 0));
            const holdEnd = Math.max(stroke, Number(event.holdEndMs) || stroke);
            const recoveryBase = recoveryOverrideMs !== null
                && recoveryOverrideMs !== undefined
                && Number.isFinite(Number(recoveryOverrideMs))
                ? Number(recoveryOverrideMs)
                : (Number(event.recoverMs) || holdEnd + 1);
            const recover = Math.max(holdEnd + 1, recoveryBase + Math.max(0, Number(recoveryLagMs) || 0));
            if (local <= prepare || local >= recover) return 0;
            if (local < stroke) return motionEase((local - prepare) / Math.max(1, stroke - prepare));
            if (local <= holdEnd) {
                return 1 - motionEase((local - stroke) / Math.max(1, holdEnd - stroke)) * 0.08;
            }
            return 0.92 * (1 - motionEase((local - holdEnd) / Math.max(1, recover - holdEnd)));
        }

        function evaluateGestureChoreography(event = {}, localTimeMs = 0, handSpeed = 1) {
            const speed = clamp(handSpeed, 0.4, 1.6, 1);
            const stroke = Number(event.strokeMs) || 0;
            const prepare = Number(event.prepareMs) || 0;
            const holdEnd = Math.max(stroke, Number(event.holdEndMs) || stroke);
            const handRecover = Math.max(holdEnd + 1, Number(event.handRecoverMs) || holdEnd + 1);
            const handEvent = speed === 1
                ? event
                : {
                    ...event,
                    prepareMs: Math.max(0, stroke - (stroke - prepare) / speed),
                    handRecoverMs: holdEnd + (handRecover - holdEnd) / speed
                };
            return {
                gaze: choreographyEnvelope(localTimeMs, event, 125, 20),
                head: choreographyEnvelope(localTimeMs, event, 70, 35),
                body: choreographyEnvelope(localTimeMs, event, 35, 80),
                hand: choreographyEnvelope(localTimeMs, handEvent, 0, 0, handEvent.handRecoverMs)
            };
        }

        function getChoreographyIndex(plan = {}) {
            if (!plan || typeof plan !== 'object') return new Map();
            let index = choreographyIndexCache.get(plan);
            if (!index) {
                index = new Map((plan.gestureChoreography || []).map(event => [event.eventId, event]));
                choreographyIndexCache.set(plan, index);
            }
            return index;
        }

        function buildPerformancePlan(cues = [], durationMs = 0, options = {}) {
            const normalized = normalizeCues(cues);
            const duration = Math.max(
                1,
                Number(durationMs) || 0,
                normalized.reduce((max, cue) => Math.max(max, cue.endMs), 0)
            );
            const voiced = normalized.filter(cue => cue.viseme !== 'rest' && cue.strength > 0.04);
            const phrases = [];
            voiced.forEach(cue => {
                const previous = phrases[phrases.length - 1];
                if (!previous || cue.startMs - previous.endMs > 240) {
                    phrases.push({
                        startMs: cue.startMs,
                        endMs: cue.endMs,
                        strength: cue.strength,
                        cues: [cue]
                    });
                    return;
                }
                previous.endMs = Math.max(previous.endMs, cue.endMs);
                previous.strength = Math.max(previous.strength, cue.strength);
                previous.cues.push(cue);
            });

            const beats = [];
            const addBeat = (timeMs, strength, kind = 'emphasis') => {
                const time = clamp(timeMs, 0, duration, 0);
                const amount = clamp(strength, 0.22, 1.35, 0.65);
                const nearby = beats.find(beat => Math.abs(beat.timeMs - time) < 460);
                if (nearby) {
                    if (amount > nearby.strength) {
                        nearby.timeMs = time;
                        nearby.strength = amount;
                        nearby.kind = kind;
                    }
                    return;
                }
                beats.push({ timeMs: time, strength: amount, kind });
            };

            phrases.forEach(phrase => {
                const span = Math.max(1, phrase.endMs - phrase.startMs);
                addBeat(phrase.startMs + Math.min(150, span * 0.18), phrase.strength * 0.84, 'phrase-start');
                for (let windowStart = phrase.startMs + 520; windowStart < phrase.endMs - 180; windowStart += 980) {
                    const windowEnd = Math.min(phrase.endMs, windowStart + 980);
                    const candidates = phrase.cues.filter(cue => {
                        const midpoint = (cue.startMs + cue.endMs) * 0.5;
                        return midpoint >= windowStart && midpoint < windowEnd;
                    });
                    const strongest = candidates.sort((left, right) => right.strength - left.strength)[0];
                    if (strongest) {
                        addBeat((strongest.startMs + strongest.endMs) * 0.5, strongest.strength, 'emphasis');
                    }
                }
                if (span > 1250) {
                    addBeat(phrase.endMs - Math.min(180, span * 0.12), phrase.strength * 0.72, 'phrase-end');
                }
            });
            beats.sort((left, right) => left.timeMs - right.timeMs);
            beats.forEach((beat, index) => {
                beat.direction = index % 2 === 0 ? 1 : -1;
                beat.hand = index % 2 === 0 ? 'A' : 'B';
            });

            const gazes = [];
            phrases.forEach((phrase, index) => {
                const span = Math.max(1, phrase.endMs - phrase.startMs);
                const addGaze = startMs => gazes.push({
                    startMs,
                    endMs: Math.min(phrase.endMs, startMs + 720),
                    direction: (index + gazes.length) % 2 === 0 ? 1 : -1
                });
                if (span > 780) addGaze(phrase.startMs + Math.min(620, span * 0.34));
                for (let startMs = phrase.startMs + 3300; startMs < phrase.endMs - 500; startMs += 3600) {
                    addGaze(startMs);
                }
            });

            const blinks = [];
            phrases.forEach((phrase, index) => {
                const next = phrases[index + 1];
                const pause = next ? next.startMs - phrase.endMs : duration - phrase.endMs;
                if (pause >= 150) blinks.push(Math.min(duration - 40, phrase.endMs + Math.min(100, pause * 0.35)));
                for (let target = phrase.startMs + 3600; target < phrase.endMs - 300; target += 3900) {
                    const nearest = phrase.cues.reduce((best, cue) => {
                        const midpoint = (cue.startMs + cue.endMs) * 0.5;
                        const score = Math.abs(midpoint - target) + cue.strength * 180;
                        return !best || score < best.score ? { score, timeMs: midpoint } : best;
                    }, null);
                    if (nearest) blinks.push(nearest.timeMs);
                }
            });

            const semanticEvents = Array.isArray(options.semanticEvents)
                ? normalizeSemanticEvents(options.semanticEvents, duration)
                : buildSemanticEvents(
                    options.transcript,
                    duration,
                    phrases,
                    normalized,
                    options
                );
            const prosodyEvents = buildProsodyEvents(
                phrases,
                semanticEvents,
                Object.hasOwn(SPEECH_STYLES, options.deliveryStyle) ? options.deliveryStyle : 'natural'
            );
            const gestureChoreography = buildGestureChoreography(semanticEvents, duration);

            return {
                version: 7,
                duration,
                phrases: phrases.map(({ cues: phraseCues, ...phrase }) => phrase),
                beats,
                gazes,
                blinks: blinks.sort((left, right) => left - right),
                semanticEvents,
                prosodyEvents,
                gestureChoreography
            };
        }

        function getPerformancePlan(config = {}) {
            if (config.performancePlan?.version >= 7) return config.performancePlan;
            let plan = performancePlanCache.get(config);
            if (!plan) {
                plan = buildPerformancePlan(config.cues, config.duration, {
                    transcript: config.transcript,
                    transcriptSegments: config.transcriptSegments,
                    semanticGestures: config.performance?.semanticGestures,
                    semanticEvents: config.performancePlan?.semanticEvents,
                    deliveryStyle: config.performance?.deliveryStyle
                });
                performancePlanCache.set(config, plan);
            }
            return plan;
        }

        function evaluatePerformance(config = {}, localTimeMs = 0) {
            const options = getPerformanceOptions(config);
            let sequenceWindow = null;
            if (Array.isArray(config.sequenceGestureWindows)) {
                sequenceWindow = config.sequenceGestureWindows.find(window => localTimeMs >= window.startMs && localTimeMs < window.endMs);
                const weight = sequenceWindow ? smoothstep(Math.min(1, Math.max(0, (localTimeMs - sequenceWindow.startMs) / 180), Math.max(0, (sequenceWindow.endMs - localTimeMs) / 180))) : 0;
                for (const [group, intensity, enabled] of [['head','headIntensity','headMovement'],['hands','handIntensity','handGestures'],['body','bodyIntensity','bodyMovement']]) {
                    options[intensity] *= sequenceWindow?.[group] ? weight : 0;
                    options[enabled] = options[intensity] > 0;
                }
                if (sequenceWindow?.eyes === false) { options.eyeIntensity = 0; options.eyeMovement = false; }
            }
            const style = options.styleProfile || SPEECH_STYLES.natural;
            const duration = Math.max(1, Number(config.duration) || 1);
            const local = Number(localTimeMs) || 0;
            const active = local >= 0 && local <= duration;
            const edge = active
                ? Math.min(1, Math.max(0, local / 180), Math.max(0, (duration - local) / 180))
                : 0;
            const plan = getPerformancePlan(config);
            let speechActivity = 0;
            (plan.phrases || []).forEach(phrase => {
                speechActivity = Math.max(
                    speechActivity,
                    windowEnvelope(local, phrase.startMs - 120, phrase.endMs + 220, 180)
                        * clamp(phrase.strength, 0.3, 1.2, 0.7)
                );
            });

            let gazeAmount = 0;
            let gazeDirection = 1;
            (plan.gazes || []).forEach(gaze => {
                const amount = windowEnvelope(local, gaze.startMs, gaze.endMs, 170);
                if (amount > gazeAmount) {
                    gazeAmount = amount;
                    gazeDirection = Number(gaze.direction) < 0 ? -1 : 1;
                }
            });

            let blink = 0;
            (plan.blinks || []).forEach(timeMs => {
                const distance = Math.abs(local - timeMs);
                if (distance < 84) blink = Math.max(blink, smoothstep(1 - distance / 84));
            });
            blink = options.eyeMovement && active ? blink : 0;

            let headNod = 0;
            let headTilt = 0;
            let handA = 0;
            let handB = 0;
            let alternatingCadenceA = 0;
            let alternatingCadenceB = 0;
            let bodySway = 0;
            let bodyLean = 0;
            let emphasis = 0;
            const handAttackMs = 340 / options.handSpeed;
            const handReleaseMs = 520 / options.handSpeed;
            const alternatingHandRoles = new Map();
            if (options.handPattern === 'alternating') {
                const minimumGap = handAttackMs + handReleaseMs + (120 / options.handSpeed);
                let lastHandBeat = -Infinity;
                let handIndex = 0;
                (plan.beats || []).forEach(beat => {
                    if ((Number(beat.timeMs) || 0) - lastHandBeat < minimumGap) return;
                    alternatingHandRoles.set(beat, handIndex % 2 === 0 ? 'A' : 'B');
                    lastHandBeat = Number(beat.timeMs) || 0;
                    handIndex++;
                });
            }
            (plan.beats || []).forEach(beat => {
                const pulse = eventPulse(local, beat.timeMs, 240, beat.kind === 'phrase-end' ? 580 : 760);
                const strength = clamp(beat.strength, 0.2, 1.35, 0.65);
                const direction = Number(beat.direction) < 0 ? -1 : 1;
                const alternatingRole = alternatingHandRoles.get(beat);
                const handPulse = options.handPattern !== 'alternating' || alternatingRole
                    ? eventPulse(local, beat.timeMs, handAttackMs, handReleaseMs)
                    : 0;
                if (pulse <= 0 && handPulse <= 0) return;
                const rebound = eventPulse(local, beat.timeMs + 340, 130, 360) * 0.24;
                const nodPulse = Math.max(-0.45, pulse - rebound);
                emphasis = Math.max(emphasis, pulse * strength);
                headNod += nodPulse * strength * 2.15;
                headTilt += pulse * direction * strength * 0.72;
                const handRole = options.handPattern === 'alternating' ? alternatingRole : beat.hand;
                const handAmount = handPulse * strength;
                if (handRole === 'B') {
                    handB = Math.max(handB, handAmount);
                    if (options.handPattern === 'alternating') {
                        alternatingCadenceB = Math.max(alternatingCadenceB, handAmount);
                    }
                } else {
                    handA = Math.max(handA, handAmount);
                    if (options.handPattern === 'alternating') {
                        alternatingCadenceA = Math.max(alternatingCadenceA, handAmount);
                    }
                }
                bodySway += pulse * direction * strength * 0.62;
                bodyLean += pulse * strength * 0.72;
            });

            let semanticWeight = 0;
            let semanticKind = 'none';
            let gestureMode = 'beat';
            let semanticHeadNod = 0;
            let semanticHeadTilt = 0;
            let semanticHeadShake = 0;
            let semanticHandA = 0;
            let semanticHandB = 0;
            let semanticBodySway = 0;
            let semanticBodyLean = 0;
            let semanticGazeX = 0;
            let semanticGazeY = 0;
            let browRaise = 0;
            let smile = 0;
            let emotionKind = 'neutral';
            let emotionWeight = 0;
            let emotionDirection = 1;
            let gestureMix = { beat: 1 };
            let gestureMixByHand = { handA: { beat: 1 }, handB: { beat: 1 } };
            let semanticWeightByHand = { handA: 0, handB: 0 };
            let semanticBodyBlend = 0;
            let authoredGestureActive = false;
            const gestureCandidates = [];
            const choreographyById = getChoreographyIndex(plan);
            (plan.prosodyEvents || []).forEach(event => {
                if (event.semantic === true && !options.semanticGestures) return;
                const span = Math.max(320, event.endMs - event.startMs);
                const envelope = windowEnvelope(
                    local,
                    event.startMs - 80,
                    event.endMs + 120,
                    Math.min(240, span * 0.24)
                );
                const amount = envelope * clamp(event.strength, 0.2, 1.2, 0.52);
                if (amount <= emotionWeight) return;
                emotionWeight = amount;
                emotionKind = normalizeEmotion(event.expression, 'statement');
                emotionDirection = Number(event.direction) < 0 ? -1 : 1;
            });
            if (options.semanticGestures) {
                (plan.semanticEvents || []).forEach(event => {
                    const span = Math.max(360, event.endMs - event.startMs);
                    const envelope = windowEnvelope(local, event.startMs - 90, event.endMs + 140, Math.min(260, span * 0.28));
                    const pulse = Math.max(
                        envelope * 0.38,
                        eventPulse(local, event.timeMs, Math.min(190, span * 0.24), Math.min(620, span * 0.52))
                    );
                    const choreography = choreographyById.get(event.id);
                    const phases = choreography
                        ? evaluateGestureChoreography(choreography, local, options.handSpeed)
                        : { gaze: pulse, head: pulse, body: pulse, hand: pulse };
                    const phasePeak = Math.max(phases.gaze, phases.head, phases.body, phases.hand, pulse);
                    if (phasePeak <= 0) return;
                    const strength = clamp(event.strength, 0.45, 1.2, 0.72);
                    const amount = phases.hand * strength;
                    const headAmount = phases.head * strength;
                    const bodyAmount = phases.body * strength;
                    const gazeGestureAmount = phases.gaze * strength;
                    const expressionAmount = Math.max(pulse, phases.head * 0.74) * strength;
                    const direction = Number(event.direction) < 0 ? -1 : 1;
                    const progress = clamp((local - event.startMs) / Math.max(1, event.endMs - event.startMs), 0, 1, 0);
                    const dominantGesture = amount > semanticWeight;
                    if (dominantGesture) {
                        semanticWeight = amount;
                        semanticKind = event.kind || 'statement';
                        gestureMode = normalizeHandMode(event.handMode, semanticKind);
                    }
                    if (expressionAmount > emotionWeight) {
                        emotionWeight = expressionAmount;
                        emotionKind = normalizeEmotion(event.expression, event.kind);
                        emotionDirection = direction;
                    }
                    let eventHandA = 0;
                    let eventHandB = 0;

                    switch (event.handMode) {
                        case 'none':
                            break;
                        case 'both':
                            if (event.authored === true) {
                                eventHandA = amount * 0.88;
                                eventHandB = amount * 0.80;
                            } else if (options.handPattern === 'alternating') {
                                if (direction > 0) eventHandA = amount * 0.88;
                                else eventHandB = amount * 0.88;
                            } else {
                                eventHandA = amount * 0.88;
                                eventHandB = amount * 0.80;
                            }
                            break;
                        case 'open':
                            if (direction > 0) {
                                eventHandA = amount * 0.82;
                                if (options.handPattern !== 'alternating') eventHandB = amount * 0.16;
                            } else {
                                if (options.handPattern !== 'alternating') eventHandA = amount * 0.16;
                                eventHandB = amount * 0.82;
                            }
                            break;
                        case 'point':
                            if (direction > 0) eventHandA = amount * 1.16;
                            else eventHandB = amount * 1.16;
                            semanticGazeX += direction * gazeGestureAmount * 0.92;
                            break;
                        case 'count': {
                            const secondBeat = eventPulse(local, event.timeMs + 250, 85, 330);
                            if (direction > 0) {
                                eventHandA = Math.max(amount, secondBeat * strength * 0.82);
                            } else {
                                eventHandB = Math.max(amount, secondBeat * strength * 0.82);
                            }
                            break;
                        }
                        case 'contrast': {
                            const alternating = options.handPattern === 'alternating';
                            const contrastAttack = (alternating ? 220 : 120) / options.handSpeed;
                            const contrastRelease = (alternating ? 320 : 340) / options.handSpeed;
                            const separation = alternating
                                ? contrastAttack + contrastRelease + (100 / options.handSpeed)
                                : 320;
                            const first = eventPulse(
                                local,
                                alternating ? event.timeMs - separation * 0.5 : event.timeMs - 130,
                                contrastAttack,
                                contrastRelease
                            ) * strength;
                            const second = eventPulse(
                                local,
                                alternating ? event.timeMs + separation * 0.5 : event.timeMs + 190,
                                contrastAttack,
                                alternating ? contrastRelease : (390 / options.handSpeed)
                            ) * strength;
                            eventHandA = first;
                            eventHandB = second;
                            semanticBodySway += (first - second) * 0.48;
                            break;
                        }
                        case 'wave': {
                            const waveAccent = 0.76 + Math.abs(Math.sin(progress * Math.PI * 3)) * 0.24;
                            if (direction > 0) eventHandA = amount * waveAccent;
                            else eventHandB = amount * waveAccent;
                            semanticHeadTilt -= direction * headAmount * 0.18;
                            break;
                        }
                        case 'thumbs-up':
                            if (direction > 0) eventHandA = amount * 0.98;
                            else eventHandB = amount * 0.98;
                            semanticHeadNod += headAmount * 0.34;
                            break;
                        case 'present':
                            if (direction > 0) {
                                eventHandA = amount * 0.94;
                                if (options.handPattern !== 'alternating') eventHandB = amount * 0.22;
                            } else {
                                if (options.handPattern !== 'alternating') eventHandA = amount * 0.22;
                                eventHandB = amount * 0.94;
                            }
                            semanticGazeX += direction * gazeGestureAmount * 0.52;
                            semanticBodyLean += bodyAmount * 0.22;
                            break;
                        case 'shrug':
                            eventHandA = amount * 0.86;
                            eventHandB = amount * 0.86;
                            semanticHeadTilt += direction * headAmount * 0.42;
                            break;
                        case 'hands-on-hips':
                            eventHandA = amount * 0.88;
                            eventHandB = amount * 0.88;
                            semanticBodyLean += bodyAmount * 0.28;
                            break;
                        case 'arms-crossed':
                            eventHandA = amount * 0.94;
                            eventHandB = amount * 0.94;
                            semanticBodyLean -= bodyAmount * 0.10;
                            break;
                        case 'prayer':
                            eventHandA = amount * 0.92;
                            eventHandB = amount * 0.92;
                            semanticHeadNod += headAmount * 0.48;
                            break;
                        case 'celebrate':
                            eventHandA = amount * 1.08;
                            eventHandB = amount * 1.08;
                            semanticBodyLean -= bodyAmount * 0.28;
                            break;
                        case 'single':
                            if (direction > 0) eventHandA = amount * 0.92;
                            else eventHandB = amount * 0.92;
                            break;
                        default:
                            if (direction > 0) eventHandA = amount * 0.72;
                            else eventHandB = amount * 0.72;
                            break;
                    }
                    if (amount > 0.001) {
                        gestureCandidates.push({
                            amount,
                            handA: eventHandA,
                            handB: eventHandB,
                            kind: event.kind || 'statement',
                            mode: normalizeHandMode(event.handMode, event.kind),
                            direction,
                            authored: event.authored === true
                        });
                    }

                    if (event.headMode === 'shake') {
                        const shake = Math.sin(progress * Math.PI * 4) * headAmount;
                        semanticHeadShake += shake * 2.5;
                        semanticHeadTilt += shake * 1.25;
                        semanticGazeX += shake * 0.28;
                    } else if (event.headMode === 'tilt') {
                        semanticHeadTilt += direction * headAmount * 1.45;
                        semanticHeadNod += headAmount * 0.52;
                    } else if (event.headMode === 'follow') {
                        semanticHeadTilt += direction * headAmount * 0.82;
                        semanticHeadNod += headAmount * 0.74;
                    } else {
                        const rebound = eventPulse(local, event.timeMs + 230, 75, 260) * 0.34;
                        semanticHeadNod += Math.max(-0.3, phases.head - rebound) * strength * 1.88;
                    }

                    semanticBodyLean += bodyAmount * (event.kind === 'greeting' || event.kind === 'gratitude' ? 0.92 : 0.58);
                    semanticBodySway += direction * bodyAmount * (event.kind === 'deictic' ? 0.58 : 0.24);
                    semanticBodyBlend += bodyAmount;
                });
            }

            if (gestureCandidates.length) {
                const authoredCandidates = gestureCandidates.filter(candidate => candidate.authored);
                const candidatePool = authoredCandidates.length ? authoredCandidates : gestureCandidates;
                candidatePool.sort((left, right) => right.amount - left.amount);
                const primary = candidatePool[0];
                const selected = candidatePool.slice(0, 4);
                authoredGestureActive = authoredCandidates.length > 0;
                const total = Math.max(0.0001, selected.reduce((sum, candidate) => sum + candidate.amount, 0));
                gestureMix = {};
                gestureMixByHand = { handA: {}, handB: {} };
                const handTotals = {
                    handA: Math.max(0.0001, selected.reduce((sum, candidate) => sum + candidate.handA, 0)),
                    handB: Math.max(0.0001, selected.reduce((sum, candidate) => sum + candidate.handB, 0))
                };
                semanticHandA = selected.reduce((value, candidate) => Math.max(value, candidate.handA), 0);
                semanticHandB = selected.reduce((value, candidate) => Math.max(value, candidate.handB), 0);
                semanticWeightByHand = {
                    handA: semanticHandA,
                    handB: semanticHandB
                };
                selected.forEach(candidate => {
                    const weight = candidate.amount / total;
                    gestureMix[candidate.mode] = (gestureMix[candidate.mode] || 0) + weight;
                    if (candidate.handA > 0) {
                        gestureMixByHand.handA[candidate.mode] = (gestureMixByHand.handA[candidate.mode] || 0)
                            + candidate.handA / handTotals.handA;
                    }
                    if (candidate.handB > 0) {
                        gestureMixByHand.handB[candidate.mode] = (gestureMixByHand.handB[candidate.mode] || 0)
                            + candidate.handB / handTotals.handB;
                    }
                });
                semanticWeight = primary.amount;
                semanticKind = primary.kind;
                gestureMode = primary.mode;
            }

            if (semanticBodyBlend > 1) {
                semanticBodyLean /= semanticBodyBlend;
                semanticBodySway /= semanticBodyBlend;
            }

            const genericWeight = Math.max(0.18, 1 - semanticWeight * 0.72);
            headNod = headNod * genericWeight + semanticHeadNod;
            headTilt = headTilt * genericWeight + semanticHeadTilt;
            handA = Math.max(handA * genericWeight, semanticHandA);
            handB = Math.max(handB * genericWeight, semanticHandB);
            bodySway = bodySway * genericWeight + semanticBodySway;
            bodyLean = bodyLean * genericWeight + semanticBodyLean;
            emphasis = Math.max(emphasis * genericWeight, semanticWeight);

            const emotion = getEmotionProfile(emotionKind, semanticKind);
            const emotionAmount = clamp(emotionWeight, 0, 1.3, 0);
            const emotionBlend = smoothstep(clamp(emotionAmount, 0, 1, 0));
            semanticGazeX += emotionDirection * emotion.gazeX * emotionAmount;
            semanticGazeY += emotion.gazeY * emotionAmount;
            headNod += emotion.headNod * emotionAmount;
            headTilt += emotionDirection * emotion.headTilt * emotionAmount;
            bodyLean += emotion.bodyLean * emotionAmount;
            bodySway += emotionDirection * emotion.bodySway * emotionAmount;
            const gestureGain = 1 + (emotion.gestureGain - 1) * emotionBlend;
            handA *= gestureGain;
            handB *= gestureGain;

            if (options.handPattern === 'alternating') {
                if (authoredGestureActive && semanticWeight > 0.001) {
                    // A timed authored cue owns its hand stroke. Automatic speech
                    // cadence resumes outside the cue instead of replacing a
                    // selected Point, Count, Single-hand, or No-hands action.
                    handA = semanticHandA * gestureGain;
                    handB = semanticHandB * gestureGain;
                } else {
                    const cadencePeak = Math.max(alternatingCadenceA, alternatingCadenceB);
                    if (cadencePeak > 0.0001) {
                        const expressivePeak = Math.max(handA, handB, cadencePeak);
                        const amplitude = Math.min(expressivePeak, cadencePeak * 1.22);
                        handA = amplitude * (alternatingCadenceA / cadencePeak);
                        handB = amplitude * (alternatingCadenceB / cadencePeak);
                        const activeChannel = alternatingCadenceA >= alternatingCadenceB ? 'handA' : 'handB';
                        gestureMixByHand = {
                            handA: activeChannel === 'handA' ? { ...gestureMix } : { beat: 1 },
                            handB: activeChannel === 'handB' ? { ...gestureMix } : { beat: 1 }
                        };
                        semanticWeightByHand = {
                            handA: activeChannel === 'handA' ? semanticWeight : 0,
                            handB: activeChannel === 'handB' ? semanticWeight : 0
                        };
                    } else {
                        // The cadence owns the rest interval so both arms fully
                        // return before the next automatic stroke begins.
                        handA = 0;
                        handB = 0;
                        semanticWeightByHand = { handA: 0, handB: 0 };
                    }
                }
            }
            browRaise += emotion.browRaise * emotionAmount;
            smile += emotion.smile * emotionAmount;

            const gazeScale = edge * options.eyeIntensity * style.gaze;
            const gazeX = clamp((gazeDirection * 1.4 * gazeAmount + semanticGazeX) * gazeScale, -3.2, 3.2, 0);
            const gazeY = clamp((-0.18 * gazeAmount + semanticGazeY) * gazeScale, -2.2, 2.2, 0);
            headNod = clamp(headNod * options.headIntensity * style.head * edge, -5.4, 5.4, 0);
            headTilt = clamp(headTilt * options.headIntensity * style.head * edge, -4.2, 4.2, 0);
            semanticHeadShake = clamp(semanticHeadShake * options.headIntensity * style.head * edge, -4.2, 4.2, 0);
            handA = clamp(handA * options.handIntensity * style.hands * edge, 0, 1.5, 0);
            handB = clamp(handB * options.handIntensity * style.hands * edge, 0, 1.5, 0);
            ({ handA, handB } = coordinatePerformanceHands(config, {
                gestureMode,
                authoredGestureActive,
                handPattern: options.handPattern,
                handA,
                handB
            }));
            bodySway = clamp(bodySway * options.bodyIntensity * style.body * edge, -1.5, 1.5, 0);
            bodyLean = clamp((bodyLean + speechActivity * 0.12) * options.bodyIntensity * style.body * edge, 0, 1.5, 0);
            browRaise = clamp(browRaise * options.expressionIntensity * style.expression * edge, -2, 2, 0);
            smile = clamp(smile * options.expressionIntensity * style.expression * edge, -0.35, 0.42, 0);
            semanticWeight = clamp(semanticWeight * edge, 0, 1.5, 0);
            emotionWeight = clamp(emotionWeight * edge, 0, 1.5, 0);
            const gazeState = Math.abs(gazeX) > 0.92
                ? (gazeX < 0 ? 'speech-left' : 'speech-right')
                : (Math.abs(gazeY) > 0.92 ? (gazeY < 0 ? 'speech-up' : 'speech-down') : 'open');
            return {
                eyeMovement: options.eyeMovement,
                blockedObjectIds: sequenceWindow?.blockedObjectIds || [],
                headMovement: options.headMovement,
                handGestures: options.handGestures,
                bodyMovement: options.bodyMovement,
                semanticGestures: options.semanticGestures,
                deliveryStyle: options.deliveryStyle,
                handPattern: options.handPattern,
                handSpeed: options.handSpeed,
                eyeIntensity: options.eyeIntensity,
                headIntensity: options.headIntensity,
                handIntensity: options.handIntensity,
                bodyIntensity: options.bodyIntensity,
                expressionIntensity: options.expressionIntensity,
                facialExpression: options.facialExpression,
                speechActivity,
                emphasis,
                semanticKind,
                semanticWeight,
                emotionKind,
                emotionWeight,
                gestureMode,
                authoredGestureActive,
                gestureMix,
                gestureMixByHand,
                semanticWeightByHand,
                gazeX: options.eyeMovement ? gazeX : 0,
                gazeY: options.eyeMovement ? gazeY : 0,
                gazeState,
                blink,
                headNod,
                headTilt,
                headShake: semanticHeadShake,
                handA,
                handB,
                bodySway,
                bodyLean,
                browRaise,
                smile
            };
        }

        function getUniversalEyeState(performance = {}) {
            if ((Number(performance.blink) || 0) >= 0.58) return 'closed';
            if (/^speech-(?:left|right|up|down)$/.test(String(performance.gazeState || ''))) {
                return performance.gazeState;
            }
            const gazeX = Number(performance.gazeX) || 0;
            const gazeY = Number(performance.gazeY) || 0;
            if (Math.abs(gazeY) > Math.abs(gazeX) && Math.abs(gazeY) >= 1.2) {
                return gazeY < 0 ? 'speech-up' : 'speech-down';
            }
            if (Math.abs(gazeX) >= 1) return gazeX < 0 ? 'speech-left' : 'speech-right';
            return 'open';
        }

        function getUniversalBrowState(performance = {}, variant = 'left') {
            const weight = Math.max(
                Number(performance.semanticWeight) || 0,
                Number(performance.emotionWeight) || 0
            );
            if (weight < 0.16) return 'neutral';
            if (performance.semanticKind === 'contrast' || performance.emotionKind === 'skeptical') {
                const tiltRight = (Number(performance.headTilt) || 0) >= 0;
                const high = tiltRight ? variant === 'right' : variant === 'left';
                return high ? 'skeptical-high' : 'skeptical-low';
            }
            const raise = Number(performance.browRaise) || 0;
            if (raise > 0.26) return 'raised';
            if (raise < -0.22) return 'lowered';
            return 'neutral';
        }

        function readTargetProperty(obj, property, helpers = {}) {
            if (typeof helpers.getProperty === 'function') {
                const value = Number(helpers.getProperty(obj, property));
                if (Number.isFinite(value)) return value;
            }
            const jointMatch = String(property || '').match(/^joint(Angle|TiltX|TiltY)_(\d+)$/);
            if (jointMatch && Array.isArray(obj?.joints)) {
                const joint = [...obj.joints].sort((left, right) => left.position - right.position)[Number(jointMatch[2])];
                const field = jointMatch[1] === 'Angle' ? 'angle' : (jointMatch[1] === 'TiltX' ? 'tiltX' : 'tiltY');
                const value = Number(joint?.[field]);
                if (Number.isFinite(value)) return value;
            }
            const value = Number(obj?.[property]);
            return Number.isFinite(value) ? value : 0;
        }

        function getPerformanceRigKey(config, objectsById) {
            const root = objectsById?.[config.rootId];
            if (!root) return '';
            const fields = ['_svgCharacterViewProfileKey', '_ucCharacterVariantKey',
                '_armatureFrontBackFacing', '_armatureFront3qLean',
                '_armatureFacingSide', '_armatureVisualFacingSide', '_armatureVisualBaseFacingSide'];
            return JSON.stringify([...fields.map(key => (Object.prototype.hasOwnProperty.call(root, key)
                ? root[key] : root[key.slice(1)]) ?? ''),
                Number(root.scaleX) < 0 ? -1 : 1]);
        }

        function applyPerformanceTargets(config, performance, objectsById, helpers = {}) {
            if (!performance || typeof helpers.setProperty !== 'function') return;
            const targets = config.performanceTargetsByRig?.[getPerformanceRigKey(config, objectsById)];
            if (targets) config = { ...config, performanceTargets: targets };
            const coordinatedPerformance = coordinatePerformanceHands(config, performance, objectsById);
            // A turn crossfades two different joint layouts. Ease speech out at
            // the layout switch, then resume on the destination rig, not its old angles.
            const turn = objectsById?.[config.rootId]?._crossViewBlend;
            const turnWeight = turn?.from && turn?.to && turn.from !== turn.to
                ? smoothstep(Math.abs(2 * clamp(turn.weight, 0, 1, 0) - 1)) : 1;
            const groupEnabled = {
                head: performance.headMovement !== false,
                hands: performance.handGestures !== false,
                body: performance.bodyMovement !== false
            };
            ['head', 'hands', 'body'].forEach(group => {
                if (!groupEnabled[group]) return;
                (config.performanceTargets?.[group] || []).forEach(target => {
                    const obj = objectsById?.[target.objectId];
                    if (!obj || !target.property || !target.channel) return;
                    if (performance.blockedObjectIds?.includes(target.objectId)) return;
                    if (group === 'hands' && config.reservedHandObjectIds?.includes(target.objectId)) return;
                    const channelValue = (Number(coordinatedPerformance[target.channel]) || 0) * turnWeight;
                    const baseScale = Number.isFinite(Number(target.scales?.beat))
                        ? Number(target.scales.beat)
                        : (Number.isFinite(Number(target.scale)) ? Number(target.scale) : 1);
                    const channelGestureMix = performance.gestureMixByHand?.[target.channel]
                        || performance.gestureMix;
                    const gestureMix = channelGestureMix && typeof channelGestureMix === 'object'
                        ? Object.entries(channelGestureMix)
                            .map(([mode, weight]) => ({ mode, weight: Math.max(0, Number(weight) || 0) }))
                            .filter(entry => entry.weight > 0 && Number.isFinite(Number(target.scales?.[entry.mode])))
                        : [];
                    const mixTotal = gestureMix.reduce((sum, entry) => sum + entry.weight, 0);
                    const profileScale = mixTotal > 0
                        ? gestureMix.reduce((sum, entry) => sum + Number(target.scales[entry.mode]) * entry.weight, 0) / mixTotal
                        : (Number.isFinite(Number(target.scales?.[performance.gestureMode]))
                            ? Number(target.scales[performance.gestureMode])
                            : baseScale);
                    const handSemanticWeight = group === 'hands'
                        ? Number(performance.semanticWeightByHand?.[target.channel])
                        : NaN;
                    const semanticBlend = target.scales
                        ? clamp(Number.isFinite(handSemanticWeight) ? handSemanticWeight : performance.semanticWeight, 0, 1, 0)
                        : 0;
                    const scale = baseScale + (profileScale - baseScale) * smoothstep(semanticBlend);
                    const current = readTargetProperty(obj, target.property, helpers);
                    const authoredBase = Number(target.baseValue);
                    const composeHandOverlay = group === 'hands'
                        && helpers.composeWithCurrent === true
                        && target.additive === true
                        && Number.isFinite(authoredBase);
                    const origin = helpers.composeWithCurrent === true && target.additive === true
                        ? current
                        : group === 'hands'
                        ? (Number.isFinite(authoredBase) ? authoredBase : current)
                        : (target.additive === true
                            ? current
                            : (Number.isFinite(authoredBase) ? authoredBase : 0));
                    let contribution = channelValue * scale;
                    if (target.scales && Number.isFinite(scale)) {
                        const profileLimit = Math.abs(scale) * 1.08;
                        contribution = clamp(contribution, -profileLimit, profileLimit, 0);
                    }
                    // Locomotion and speech share arm joints. Blend the active
                    // arm toward its authored speech pose instead of stacking
                    // its angle on top of the walk cycle; a zero channel leaves
                    // the current movement pose untouched.
                    let value = composeHandOverlay
                        ? current
                            + (authoredBase - current) * clamp(Math.abs(channelValue), 0, 1, 0)
                            + contribution
                        : origin + contribution;
                    if (Number.isFinite(Number(target.min))) value = Math.max(Number(target.min), value);
                    if (Number.isFinite(Number(target.max))) value = Math.min(Number(target.max), value);
                    helpers.setProperty(obj, target.property, value);
                });
            });
        }

        function evaluate(config = {}, localTimeMs = 0) {
            let cues = normalizedCueCache.get(config);
            if (!cues) {
                cues = normalizeCues(config.cues);
                normalizedCueCache.set(config, cues);
            }
            const local = Number(localTimeMs) || 0;
            const masterStrength = clamp(config.strength, 0, 1.5, 1);
            const smoothingMs = clamp(config.smoothingMs, 0, 260, 55);
            if (!cues.length || local < 0) {
                return { viseme: 'rest', strength: 0, channels: channelsFor('rest', 0), cueIndex: -1 };
            }

            let index = -1;
            let low = 0;
            let high = cues.length - 1;
            while (low <= high) {
                const mid = (low + high) >> 1;
                if (cues[mid].startMs <= local) {
                    index = mid;
                    low = mid + 1;
                } else {
                    high = mid - 1;
                }
            }

            const current = index >= 0 && local <= cues[index].endMs ? cues[index] : null;
            if (!current) {
                const next = cues[index + 1];
                if (next && smoothingMs > 0 && next.startMs - local < smoothingMs) {
                    const t = 1 - ((next.startMs - local) / smoothingMs);
                    return {
                        viseme: next.viseme,
                        strength: next.strength * masterStrength * t,
                        channels: blendChannels(channelsFor('rest', 0), channelsFor(next.viseme, next.strength * masterStrength), t),
                        cueIndex: index + 1
                    };
                }
                return { viseme: 'rest', strength: 0, channels: channelsFor('rest', 0), cueIndex: -1 };
            }

            const currentChannels = channelsFor(current.viseme, current.strength * masterStrength);
            if (smoothingMs <= 0) {
                return { viseme: current.viseme, strength: current.strength * masterStrength, channels: currentChannels, cueIndex: index };
            }

            const previous = cues[index - 1];
            if (local - current.startMs < smoothingMs) {
                const previousChannels = previous && previous.endMs >= current.startMs - smoothingMs
                    ? channelsFor(previous.viseme, previous.strength * masterStrength)
                    : channelsFor('rest', 0);
                const t = (local - current.startMs + smoothingMs) / (smoothingMs * 2);
                return {
                    viseme: t >= 0.5 ? current.viseme : (previous?.viseme || 'rest'),
                    strength: current.strength * masterStrength,
                    channels: blendChannels(previousChannels, currentChannels, t),
                    cueIndex: index
                };
            }

            const next = cues[index + 1];
            if (current.endMs - local < smoothingMs) {
                const nextChannels = next && next.startMs <= current.endMs + smoothingMs
                    ? channelsFor(next.viseme, next.strength * masterStrength)
                    : channelsFor('rest', 0);
                const t = 1 - ((current.endMs - local + smoothingMs) / (smoothingMs * 2));
                return {
                    viseme: t > 0.5 ? (next?.viseme || 'rest') : current.viseme,
                    strength: current.strength * masterStrength,
                    channels: blendChannels(currentChannels, nextChannels, t),
                    cueIndex: index
                };
            }

            return { viseme: current.viseme, strength: current.strength * masterStrength, channels: currentChannels, cueIndex: index };
        }

        function applyRealistic3DSpeech(obj, config, frame, performance) {
            if (!obj?.realistic3D) return;
            const mouth = amplifySvgMouthChannels(frame.channels, config.mouthOpeningGain ?? 1.45);
            obj._realistic3DSpeech = {
                jaw: Math.max(mouth.jawOpen * 0.95, mouth.mouthOpen * 0.58),
                wide: mouth.mouthWide, round: mouth.mouthRound, press: mouth.lipPress,
                upper: mouth.upperLipLift, lower: mouth.lowerLipDrop,
                tongue: frame.viseme === 'L' ? frame.strength : 0,
                blink: performance.eyeMovement ? performance.blink : 0,
                brow: performance.facialExpression ? performance.browRaise : 0,
                smile: performance.facialExpression ? performance.smile : 0,
                gazeX: performance.eyeMovement ? performance.gazeX : 0,
                gazeY: performance.eyeMovement ? performance.gazeY : 0,
                nod: performance.headMovement ? performance.headNod : 0,
                handA: performance.handGestures ? performance.handA : 0,
                handB: performance.handGestures ? performance.handB : 0,
                lean: performance.bodyMovement ? performance.bodyLean : 0,
                sway: performance.bodyMovement ? performance.bodySway : 0
            };
        }

        function applyExportFrame(config, localTimeMs, objectsById, helpers = {}) {
            const frame = evaluate(config, localTimeMs);
            const performance = evaluatePerformance(config, localTimeMs);
            if (config.adapterKind === 'realistic-3d') {
                applyRealistic3DSpeech(objectsById?.[config.rootId], config, frame, performance);
            } else if (config.adapterKind === 'universal-features') {
                (config.targets || []).forEach(target => {
                    const mouth = objectsById?.[target.objectId];
                    if (!mouth) return;
                    const source = resolveUniversalMouthSource(
                        target,
                        frame,
                        config.mouthOpeningGain ?? config.svgMouthGain ?? 1.45
                    );
                    if (source && typeof helpers.assignImageSource === 'function') {
                        helpers.assignImageSource(mouth, source);
                    }
                    if (performance.eyeMovement && typeof helpers.assignImageSource === 'function') {
                        const eyeState = getUniversalEyeState(performance);
                        (target.eyes || []).forEach(eyeTarget => {
                            const eye = objectsById?.[eyeTarget.objectId];
                            const eyeSource = eyeTarget.sources?.[eyeState] || eyeTarget.sources?.open;
                            if (eye && eyeSource) helpers.assignImageSource(eye, eyeSource);
                        });
                    }
                    if (performance.facialExpression && typeof helpers.assignImageSource === 'function') {
                        (target.brows || []).forEach(browTarget => {
                            const brow = objectsById?.[browTarget.objectId];
                            const browState = getUniversalBrowState(performance, browTarget.variant);
                            const browSource = browTarget.sources?.[browState] || browTarget.sources?.neutral;
                            if (brow && browSource) helpers.assignImageSource(brow, browSource);
                        });
                    }
                });
            } else if (config.adapterKind === 'svg-african-native') {
                const head = objectsById?.[config.targetHeadId]
                    || Object.values(objectsById || {}).find(obj => (
                        obj?._svgCharacterInstanceId === config.instanceId
                        && (obj?._svgCharacterPremiumPartKey || obj?._svgCharacterPartKey) === 'head-neck'
                ));
                if (head && typeof helpers.setProperty === 'function') {
                    const channels = amplifySvgMouthChannels(
                        frame.channels,
                        config.mouthOpeningGain ?? config.svgMouthGain ?? 1.45,
                        config.showTeeth === false ? 0 : config.teethVisibility ?? .6
                    );
                    Object.entries(channels).forEach(([channel, value]) => {
                        helpers.setProperty(head, `svgAfricanFace_${channel}`, value);
                    });
                    if (performance.eyeMovement) {
                        helpers.setProperty(head, 'svgAfricanFace_gazeX', performance.gazeX);
                        helpers.setProperty(head, 'svgAfricanFace_gazeY', performance.gazeY);
                        helpers.setProperty(head, 'svgAfricanFace_blink', performance.blink);
                    }
                    if (performance.headMovement) {
                        helpers.setProperty(head, 'svgAfricanFace_headNod', performance.headNod);
                        helpers.setProperty(head, 'svgAfricanFace_headTilt', performance.headTilt);
                    }
                    if (performance.facialExpression && config.faceBaseline) {
                        helpers.setProperty(
                            head,
                            'svgAfricanFace_browRaise',
                            (Number(config.faceBaseline.browRaise) || 0) + (Number(performance.browRaise) || 0)
                        );
                        helpers.setProperty(
                            head,
                            'svgAfricanFace_smile',
                            (Number(config.faceBaseline.smile) || 0) + (Number(performance.smile) || 0)
                        );
                    }
                }
            }
            applyPerformanceTargets(config, performance, objectsById, helpers);
            return { ...frame, performance };
        }

        function getStandaloneSource() {
            return `(function(g){g.AudioLipSyncRuntime=(${createAudioLipSyncRuntime.toString()})();})(window);`;
        }

        return Object.freeze({
            version: 22,
            visemes: VISEMES,
            channels: CHANNELS,
            speechStyles: SPEECH_STYLES,
            semanticProfiles: SEMANTIC_PROFILES,
            emotionProfiles: EMOTION_PROFILES,
            emotionKinds: EMOTION_KINDS,
            handModes: HAND_MODES,
            bilateralHandModes: BILATERAL_HAND_MODES,
            handPatterns: HAND_PATTERNS,
            normalizeViseme,
            normalizeCue,
            normalizeCues,
            channelsFor,
            evaluate,
            getPerformanceOptions,
            amplifySvgMouthChannels,
            getUniversalMouthFrame,
            collectUniversalMouthFrames,
            resolveUniversalMouthSource,
            parseTranscriptSegments,
            getSemanticProfile,
            normalizeEmotion,
            getEmotionProfile,
            normalizeHandMode,
            normalizeSemanticEvent,
            normalizeSemanticEvents,
            retimeWordLinkedEvents,
            classifySemanticText,
            buildSemanticEvents,
            buildProsodyEvents,
            buildGestureChoreography,
            evaluateGestureChoreography,
            buildPerformancePlan,
            evaluatePerformance,
            getUniversalEyeState,
            getUniversalBrowState,
            getPerformanceRigKey,
            applyPerformanceTargets,
            applyExportFrame,
            applyRealistic3DSpeech,
            getStandaloneSource
        });
    }

    const Runtime = createAudioLipSyncRuntime();
    global.AudioLipSyncRuntime = Runtime;

    class AudioLipSyncManager {
        constructor(app) {
            this.app = app;
            this.objects = app?.objects || null;
            this.stage = app?.stage || null;
            this.animations = app?.animations || null;
            this.audioTimeline = app?.audioTimeline || null;
            this.jointSystem = app?.jointSystem || null;
            this.context = null;
            this.draftCues = [];
            this.draftPerformanceEvents = [];
            this.performanceDraftReady = false;
            this.performanceDraftEdited = false;
            this.draftDirty = true;
            this.activeCueTab = 'mouth';
            this.imageCache = new Map();
            this.universalSourceCache = new Map();
            this._exportFaceSampleMsByConfig = null;
            this.previewFrame = null;
            this.activePerformancePreviewIndex = -1;
            this.modal = null;
            this._ensureUI();
        }

        _ensureUI() {
            if (this.modal || typeof document === 'undefined') return;
            const modal = document.createElement('div');
            modal.id = 'audio-lip-sync-modal';
            modal.className = 'als-modal hidden';
            modal.innerHTML = `
                <div class="als-dialog" role="dialog" aria-modal="true" aria-labelledby="als-title">
                    <header class="als-header">
                        <div><i class="fas fa-wave-square"></i><span id="als-title">Audio Lip Sync</span></div>
                        <div class="als-history-tools">
                            <button type="button" class="als-icon-btn" data-als-action="undo" title="Undo draft edit" aria-label="Undo draft edit" disabled><i class="fas fa-undo"></i></button>
                            <button type="button" class="als-icon-btn" data-als-action="redo" title="Redo draft edit" aria-label="Redo draft edit" disabled><i class="fas fa-redo"></i></button>
                            <button type="button" class="als-icon-btn" data-als-action="close" title="Close" aria-label="Close"><i class="fas fa-times"></i></button>
                        </div>
                    </header>
                    <div class="als-body">
                        <div class="als-summary">
                            <strong data-als-character>No character selected</strong>
                            <span data-als-audio>No soundtrack loaded</span>
                        </div>
                        <div class="als-mode" role="group" aria-label="Lip sync analysis mode">
                            <button type="button" data-als-mode="quick" class="active"><i class="fas fa-bolt"></i> Quick Audio</button>
                            <button type="button" data-als-mode="transcript"><i class="fas fa-align-left"></i> Accurate Speech</button>
                        </div>
                        <div class="als-grid als-range-grid">
                            <label><span>Start</span><input type="number" data-als-field="start" min="0" step="0.001"></label>
                            <label><span>End</span><input type="number" data-als-field="end" min="0" step="0.001"></label>
                            <label><span>Offset</span><input type="number" data-als-field="offset" step="10" value="0"><small>ms</small></label>
                        </div>
                        <div class="als-grid als-slider-grid">
                            <label><span>Mouth strength</span><input type="range" data-als-field="strength" min="0" max="150" value="100"><output>100%</output></label>
                            <label><span>Mouth smoothing</span><input type="range" data-als-field="smoothing" min="0" max="200" value="55"><output>55 ms</output></label>
                            <label><span>Mouth opening</span><input type="range" data-als-field="mouthClarity" min="75" max="320" value="145"><output>145%</output></label>
                            <label><input type="checkbox" data-als-field="showTeeth" checked> Show SVG teeth</label>
                            <label><span>Teeth visibility (SVG)</span><input type="range" data-als-field="teethVisibility" min="0" max="100" value="60"><output>60%</output></label>
                        </div>
                        <div class="als-performance-mode-row">
                            <span><i class="fas fa-layer-group"></i> Speech motion</span>
                            <div class="als-mode als-performance-mode" role="group" aria-label="Speech motion mode">
                                <button type="button" data-als-performance-mode="mouth-only" class="active" title="Animate the mouth without changing the current pose or movement"><i class="fas fa-comment"></i> Mouth only</button>
                                <button type="button" data-als-performance-mode="full" title="Add eye, head, hand, and body performance"><i class="fas fa-person-rays"></i> Full performance</button>
                            </div>
                        </div>
                        <fieldset class="als-performance">
                            <legend>Speech performance</legend>
                            <label><span><i class="fas fa-eye"></i> Eye &amp; gaze</span><input type="range" data-als-field="eyeIntensity" min="0" max="150" value="75"><output>75%</output></label>
                            <label><span><i class="fas fa-face-smile"></i> Expression</span><input type="range" data-als-field="expressionIntensity" min="0" max="150" value="75"><output>75%</output></label>
                            <label><span><i class="fas fa-arrows-up-down-left-right"></i> Head movement</span><input type="range" data-als-field="headIntensity" min="0" max="150" value="65"><output>65%</output></label>
                            <label><span><i class="fas fa-hands"></i> Hand gestures</span><input type="range" data-als-field="handIntensity" min="0" max="150" value="65"><output>65%</output></label>
                            <label><span><i class="fas fa-gauge-high"></i> Hand speed</span><input type="range" data-als-field="handSpeed" min="40" max="160" step="5" value="80"><output>80%</output></label>
                            <label><span><i class="fas fa-person"></i> Body movement</span><input type="range" data-als-field="bodyIntensity" min="0" max="150" value="40"><output>40%</output></label>
                        </fieldset>
                        <div class="als-delivery">
                            <label><span><i class="fas fa-sliders"></i> Delivery</span><select data-als-field="deliveryStyle">
                                <option value="natural">Natural</option>
                                <option value="formal">Formal</option>
                                <option value="warm">Warm</option>
                                <option value="energetic">Energetic</option>
                                <option value="calm">Calm</option>
                            </select></label>
                            <label><span><i class="fas fa-right-left"></i> Automatic hand pattern</span><select data-als-field="handPattern" title="Pattern used by generated speech gestures">
                                <option value="alternating">Alternate, One Arm at a Time</option>
                                <option value="coordinated">Coordinated / Both Arms</option>
                            </select></label>
                            <label class="als-semantic-toggle" title="Match gestures and expressions to transcript meaning">
                                <input type="checkbox" data-als-field="semanticGestures" checked disabled>
                                <span><i class="fas fa-comment-dots"></i> Meaning-aware gestures</span>
                            </label>
                        </div>
                        <label class="als-transcript hidden">
                            <span>Transcript or timed cues</span>
                            <textarea data-als-field="transcript" rows="5" placeholder="Paste dialogue, SRT, WebVTT, or timestamped words"></textarea>
                        </label>
                        <div class="als-toolbar">
                            <label class="als-transcription-language"><span>Spoken language</span><select data-als-field="transcriptionLanguage">${AudioLipSyncManager.transcriptionLanguageOptions()}</select></label>
                            <button type="button" data-als-action="generate"><i class="fas fa-wand-magic-sparkles"></i> Generate Cues</button>
                            <button type="button" data-als-action="transcribe" title="Word transcription: ${global.__STAGE_USER?.ai_config?.transcription?.local === true ? 'local server, no AI credits' : 'OpenAI, provider charges or AI credits'}. Completed sections are reused on retry."><i class="fas fa-microphone"></i> Transcribe Audio (${global.__STAGE_USER?.ai_config?.transcription?.local === true ? 'local server' : 'OpenAI, paid'})</button>
                            <button type="button" data-als-action="cancel-transcription" hidden title="Cancel transcription" aria-label="Cancel transcription"><i class="fas fa-stop" aria-hidden="true"></i></button>
                            <progress data-als-transcription-progress hidden aria-label="Transcription in progress"></progress>
                            <button type="button" data-als-action="preview"><i class="fas fa-play"></i> Preview</button>
                            <button type="button" data-als-action="captions" title="Add on-screen captions synced to this speech"><i class="fas fa-closed-captioning"></i> Add Captions</button>
                            <select data-als-caption-preset class="als-caption-preset" title="Caption style" aria-label="Caption style">
                                <option value="subtitle">Subtitle</option>
                                <option value="lower-third">Lower third</option>
                                <option value="banner">Banner</option>
                            </select>
                            <span class="als-status" data-als-status role="status" aria-live="polite"></span>
                        </div>
                        <div class="als-cue-tabs" role="tablist" aria-label="Lip sync cue editor">
                            <button type="button" data-als-cue-tab="review" role="tab" aria-selected="false"><i class="fas fa-wave-square"></i> Review</button>
                            <button type="button" data-als-cue-tab="words" role="tab" aria-selected="false" disabled><i class="fas fa-align-left"></i> Words</button>
                            <button type="button" class="active" data-als-cue-tab="mouth" role="tab" aria-selected="true"><i class="fas fa-comment"></i> Mouth Cues</button>
                            <button type="button" data-als-cue-tab="performance" role="tab" aria-selected="false"><i class="fas fa-person-rays"></i> Performance Cues</button>
                        </div>
                        <section class="als-cue-panel hidden" data-als-cue-panel="review">
                            <div class="als-review-tools">
                                <button type="button" class="als-icon-btn" data-als-action="review-play" title="Play from cursor" aria-label="Play from cursor"><i class="fas fa-play"></i></button>
                                <button type="button" class="als-icon-btn" data-als-action="review-stop" title="Stop audition" aria-label="Stop audition" disabled><i class="fas fa-stop"></i></button>
                                <output data-als-review-clock>0.000 s</output>
                                <span data-als-review-state></span>
                                <div class="als-review-zoom-tools">
                                    <button type="button" class="als-icon-btn" data-als-action="review-zoom-out" title="Zoom out" aria-label="Zoom out"><i class="fas fa-search-minus"></i></button>
                                    <output data-als-review-zoom>100%</output>
                                    <button type="button" class="als-icon-btn" data-als-action="review-zoom-in" title="Zoom in" aria-label="Zoom in"><i class="fas fa-search-plus"></i></button>
                                    <button type="button" class="als-icon-btn" data-als-action="review-fit" title="Fit timeline" aria-label="Fit timeline"><i class="fas fa-expand-arrows-alt"></i></button>
                                </div>
                            </div>
                            <div class="als-review-timeline">
                                <div class="als-review-labels" aria-hidden="true"><span>Time</span><span>Audio</span><span>Words</span><span>Mouth</span><span>Gestures</span></div>
                                <div class="als-review-scroll" data-als-review-scroll>
                                    <div class="als-review-world" data-als-review-world>
                                        <div class="als-review-ruler" data-als-review-ruler></div>
                                        <canvas class="als-review-waveform" data-als-review-waveform aria-label="Selected audio waveform"></canvas>
                                        <div class="als-review-lane" data-als-review-lane="words" aria-label="Word timing lane"></div>
                                        <div class="als-review-lane" data-als-review-lane="mouth" aria-label="Mouth cue lane"></div>
                                        <div class="als-review-lane" data-als-review-lane="performance" aria-label="Gesture cue lane"></div>
                                        <div class="als-review-playhead" data-als-review-playhead></div>
                                    </div>
                                </div>
                            </div>
                            <label class="als-review-seek"><span>Audio position</span><input type="range" data-als-review-seek min="0" max="1" step="1" value="0" aria-label="Audio review position in milliseconds"></label>
                            <div class="als-review-selection" data-als-review-selection aria-live="polite"></div>
                        </section>
                        <section class="als-cue-panel hidden" data-als-cue-panel="words">
                            <div class="als-performance-cue-tools als-word-tools">
                                <button type="button" data-als-action="add-word"><i class="fas fa-plus"></i> Add Word</button>
                                <button type="button" class="als-icon-btn" data-als-action="discard-words" title="Discard word edits" aria-label="Discard word edits"><i class="fas fa-rotate-left"></i></button>
                                <button type="button" data-als-action="apply-words"><i class="fas fa-wand-magic-sparkles"></i> Regenerate Cues</button>
                            </div>
                            <div class="als-cue-editor als-word-editor" data-als-word-editor></div>
                        </section>
                        <section class="als-cue-panel" data-als-cue-panel="mouth">
                            <div class="als-cue-strip" data-als-strip></div>
                            <div class="als-cue-editor" data-als-editor></div>
                        </section>
                        <section class="als-cue-panel hidden" data-als-cue-panel="performance">
                            <div class="als-performance-cue-tools">
                                <button type="button" data-als-action="add-performance" title="Add performance cue"><i class="fas fa-plus"></i> Add Cue</button>
                            </div>
                            <div class="als-cue-strip als-performance-strip" data-als-performance-strip></div>
                            <div class="als-cue-editor als-performance-editor" data-als-performance-editor></div>
                        </section>
                    </div>
                    <footer class="als-footer">
                        <button type="button" class="als-danger" data-als-action="remove"><i class="fas fa-trash"></i> Remove Clip</button>
                        <span></span>
                        <button type="button" data-als-action="cancel">Cancel</button>
                        <button type="button" class="als-primary" data-als-action="create"><i class="fas fa-link"></i> Create Lip Sync</button>
                    </footer>
                </div>`;
            document.body.appendChild(modal);
            this.modal = modal;
            this._setPerformanceMode('mouth-only');

            modal.addEventListener('click', event => {
                if (event.target === modal) {
                    this.close();
                    return;
                }
                const action = event.target.closest('[data-als-action]')?.dataset.alsAction;
                const mode = event.target.closest('[data-als-mode]')?.dataset.alsMode;
                const performanceMode = event.target.closest('[data-als-performance-mode]')?.dataset.alsPerformanceMode;
                const cueTab = event.target.closest('[data-als-cue-tab]')?.dataset.alsCueTab;
                const performancePreview = event.target.closest('[data-performance-preview]')?.dataset.performancePreview;
                const wordPreview = event.target.closest('[data-word-preview]')?.dataset.wordPreview;
                const wordRemove = event.target.closest('[data-word-remove]')?.dataset.wordRemove;
                const wordLink = event.target.closest('[data-word-link]')?.dataset.wordLink;
                if (mode) this._setMode(mode);
                if (performanceMode) this._setPerformanceMode(performanceMode);
                if (cueTab) this._setCueTab(cueTab);
                const reviewItem = event.target.closest('[data-review-kind]');
                if (reviewItem) {
                    this._selectReviewItem(reviewItem.dataset.reviewKind, reviewItem.dataset.reviewId);
                    return;
                }
                const reviewWorld = event.target.closest('[data-als-review-world]');
                if (reviewWorld) {
                    this.stopPreview();
                    const bounds = reviewWorld.getBoundingClientRect();
                    this._updateReviewCursor((event.clientX - bounds.left) / bounds.width * this._reviewDuration(), true);
                    return;
                }
                if (wordLink !== undefined) {
                    void this._addWordLinkedPerformanceCue(Number(wordLink));
                    return;
                }
                if (wordPreview !== undefined) {
                    void this._previewWord(Number(wordPreview));
                    return;
                }
                if (wordRemove !== undefined) {
                    this.stopPreview();
                    this.wordTimingEdits = this._wordTimingRows().map(word => ({ ...word }));
                    this.wordTimingEdits.splice(Number(wordRemove), 1);
                    this.wordEditsPending = true;
                    this._renderWordEditor();
                    this._setStatus('Word edits pending');
                    this._recordDraftHistory();
                    return;
                }
                if (performancePreview !== undefined) {
                    void this._previewPerformanceCue(Number(performancePreview));
                    return;
                }
                if (!action) return;
                if (action === 'undo') this._restoreDraftHistory(-1);
                if (action === 'redo') this._restoreDraftHistory(1);
                if (action === 'close' || action === 'cancel') this.close();
                if (action === 'generate') void this.generateDraft();
                if (action === 'transcribe') void this.transcribeAudio();
                if (action === 'cancel-transcription') { this._cancelTranscription(); this._setStatus('Transcription cancelled. Current cues and completed sections retained.'); }
                if (action === 'preview') void this.previewDraft();
                if (action === 'captions') void this.generateCaptions();
                if (action === 'review-play') void this.previewDraft({ audioTimeMs: this._reviewTimeMs || 0 });
                if (action === 'review-stop') this.stopPreview();
                if (action === 'review-edit') this._openReviewSelection();
                if (action === 'review-zoom-in') this._setReviewZoom((this._reviewZoom || 1) * 2);
                if (action === 'review-zoom-out') this._setReviewZoom((this._reviewZoom || 1) / 2);
                if (action === 'review-fit') this._setReviewZoom(1);
                if (action === 'create') void this.createOrUpdateClip();
                if (action === 'remove') this.removeClip();
                if (action === 'add-performance') this._addPerformanceCue();
                if (action === 'add-word') this._addWord();
                if (action === 'apply-words') void this.generateDraft({ preservePerformance: this.performanceDraftEdited });
                if (action === 'discard-words') {
                    this.wordTimingEdits = null;
                    this.wordEditsPending = false;
                    this._renderWordEditor();
                    this._setStatus('Word edits discarded');
                    this._recordDraftHistory();
                }
            });
            modal.addEventListener('input', event => {
                if (this._draftRendering || this._historyRestoring) return;
                if (event.target.matches('[data-als-review-seek]')) {
                    this.stopPreview();
                    this._updateReviewCursor(Number(event.target.value), true);
                    return;
                }
                const field = event.target.dataset?.alsField;
                if (field) this.stopPreview();
                if (['strength', 'smoothing', 'mouthClarity', 'teethVisibility', 'eyeIntensity', 'expressionIntensity', 'headIntensity', 'handIntensity', 'handSpeed', 'bodyIntensity'].includes(field)) {
                    this._syncSliderOutputs();
                }
                if (['start', 'end', 'transcript'].includes(field)) this.draftDirty = true;
                if (field === 'transcript') this.wordTimingEdited = false;
                const wordRow = event.target.closest('[data-word-index]');
                if (wordRow) this._updateWordFromRow(wordRow);
                const cueRow = event.target.closest('[data-cue-index]');
                if (cueRow) this._updateCueFromRow(cueRow);
                const performanceRow = event.target.closest('[data-performance-index]');
                if (performanceRow) this._updatePerformanceCueFromRow(performanceRow, event.target);
                this._recordDraftHistory(event.target);
                this._renderSpeechReview();
            });
            modal.addEventListener('change', event => {
                if (this._draftRendering || this._historyRestoring) return;
                const wordRow = event.target.closest('[data-word-index]');
                if (wordRow) this._updateWordFromRow(wordRow);
                const cueRow = event.target.closest('[data-cue-index]');
                if (cueRow) this._updateCueFromRow(cueRow);
                const performanceRow = event.target.closest('[data-performance-index]');
                if (performanceRow) this._updatePerformanceCueFromRow(performanceRow, event.target);
                this._recordDraftHistory(event.target);
                this._renderSpeechReview();
            });
            modal.addEventListener('focusout', () => { this._historyEditGroup = null; });
            document.addEventListener('keydown', event => {
                if (modal.classList.contains('hidden')) return;
                if (event.key === 'Escape') {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    this.close();
                }
                if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
                const key = event.key.toLowerCase();
                if (key !== 'z' && key !== 'y') return;
                // Keep native text undo, but never send a modal shortcut to Stage history.
                event.stopImmediatePropagation();
                if (event.target.closest?.('textarea, input:not([type="range"]), [contenteditable="true"]')) return;
                event.preventDefault();
                this._restoreDraftHistory(key === 'y' || event.shiftKey ? 1 : -1);
            }, true);
            global.addEventListener('beforeunload', event => {
                if (modal.classList.contains('hidden') || (!this._hasUnsavedDraft()
                    && !this.transcriptionRequest && !this._draftGenerationToken)) return;
                event.preventDefault();
                event.returnValue = '';
            });
            if (typeof ResizeObserver !== 'undefined') {
                this._reviewResizeObserver = new ResizeObserver(() => this._renderSpeechReview());
                this._reviewResizeObserver.observe(modal.querySelector('[data-als-review-scroll]'));
            }
        }

        _field(name) {
            return this.modal?.querySelector(`[data-als-field="${name}"]`) || null;
        }

        _setStatus(text, kind = '') {
            const node = this.modal?.querySelector('[data-als-status]');
            if (!node) return;
            node.textContent = text || '';
            node.dataset.kind = kind;
        }

        _setMode(mode, options = {}) {
            const normalized = mode === 'transcript' ? 'transcript' : 'quick';
            const previous = this._getMode();
            if (normalized === 'quick' && this.wordEditsPending) {
                if (!this._historyRestoring && !global.confirm('Discard pending word edits and switch to Quick Audio?')) return;
                this.wordTimingEdits = null;
                this.wordEditsPending = false;
                this._renderWordEditor();
            }
            this.modal?.querySelectorAll('[data-als-mode]').forEach(button => {
                button.classList.toggle('active', button.dataset.alsMode === normalized);
            });
            this.modal?.querySelector('.als-transcript')?.classList.toggle('hidden', normalized !== 'transcript');
            this._syncPerformanceAvailability();
            const wordsTab = this.modal?.querySelector('[data-als-cue-tab="words"]');
            if (wordsTab) wordsTab.disabled = normalized !== 'transcript';
            if (normalized !== 'transcript' && this.activeCueTab === 'words') this._setCueTab('mouth');
            if (options.markDirty !== false && previous !== normalized) this.draftDirty = true;
            this._recordDraftHistory();
            this._renderSpeechReview();
        }

        _getMode() {
            return this.modal?.querySelector('[data-als-mode].active')?.dataset.alsMode || 'quick';
        }

        _setPerformanceMode(mode) {
            const normalized = mode === 'full' ? 'full' : 'mouth-only';
            this.modal?.querySelectorAll('[data-als-performance-mode]').forEach(button => {
                button.classList.toggle('active', button.dataset.alsPerformanceMode === normalized);
                button.setAttribute('aria-pressed', button.dataset.alsPerformanceMode === normalized ? 'true' : 'false');
            });
            this._syncPerformanceAvailability();
            this._recordDraftHistory();
            this._renderSpeechReview();
        }

        _getPerformanceMode() {
            return this.modal?.querySelector('[data-als-performance-mode].active')?.dataset.alsPerformanceMode || 'mouth-only';
        }

        _syncPerformanceAvailability() {
            const disabled = this._getPerformanceMode() === 'mouth-only';
            ['eyeIntensity', 'expressionIntensity', 'headIntensity', 'handIntensity', 'handSpeed', 'bodyIntensity', 'deliveryStyle', 'handPattern'].forEach(field => {
                const input = this._field(field);
                if (input) input.disabled = disabled;
            });
            const semanticField = this._field('semanticGestures');
            if (semanticField) semanticField.disabled = disabled || this._getMode() !== 'transcript';
            this.modal?.querySelector('.als-performance')?.classList.toggle('is-disabled', disabled);
            this.modal?.querySelector('.als-delivery')?.classList.toggle('is-disabled', disabled);
            const performanceTab = this.modal?.querySelector('[data-als-cue-tab="performance"]');
            const addPerformance = this.modal?.querySelector('[data-als-action="add-performance"]');
            if (performanceTab) performanceTab.disabled = disabled;
            if (addPerformance) addPerformance.disabled = disabled;
            this.modal?.querySelectorAll('[data-word-link]').forEach(button => { button.disabled = disabled; });
            if (disabled && this.activeCueTab === 'performance') this._setCueTab('mouth');
        }

        _setCueTab(tab) {
            const performanceDisabled = this.modal?.querySelector('[data-als-cue-tab="performance"]')?.disabled === true;
            const normalized = tab === 'performance' && !performanceDisabled ? 'performance'
                : tab === 'words' && this._getMode() === 'transcript' ? 'words'
                : tab === 'review' ? 'review' : 'mouth';
            this.activeCueTab = normalized;
            this.modal?.querySelectorAll('[data-als-cue-tab]').forEach(button => {
                const active = button.dataset.alsCueTab === normalized;
                button.classList.toggle('active', active);
                button.setAttribute('aria-selected', active ? 'true' : 'false');
            });
            this.modal?.querySelectorAll('[data-als-cue-panel]').forEach(panel => {
                panel.classList.toggle('hidden', panel.dataset.alsCuePanel !== normalized);
            });
            this._renderSpeechReview();
        }

        _escapeHtml(value) {
            return String(value ?? '').replace(/[&<>"']/g, character => ({
                '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
            })[character]);
        }

        _syncSliderOutputs() {
            const teeth=this._field('teethVisibility');if(teeth?.nextElementSibling)teeth.nextElementSibling.textContent=teeth.value+'%';
            const strength = this._field('strength');
            const smoothing = this._field('smoothing');
            const mouthClarity = this._field('mouthClarity');
            if (strength?.nextElementSibling) strength.nextElementSibling.textContent = `${Math.round(Number(strength.value) || 0)}%`;
            if (smoothing?.nextElementSibling) smoothing.nextElementSibling.textContent = `${Math.round(Number(smoothing.value) || 0)} ms`;
            if (mouthClarity?.nextElementSibling) {
                mouthClarity.nextElementSibling.textContent = mouthClarity.disabled
                    ? 'Fixed'
                    : `${Math.round(Number(mouthClarity.value) || 0)}%`;
            }
            ['eyeIntensity', 'expressionIntensity', 'headIntensity', 'handIntensity', 'handSpeed', 'bodyIntensity'].forEach(field => {
                const input = this._field(field);
                if (input?.nextElementSibling) input.nextElementSibling.textContent = `${Math.round(Number(input.value) || 0)}%`;
            });
        }

        _resolveArmature(explicit = null) {
            const system = this.app?.jointSystem || this.jointSystem;
            const selected = this.objects?.getSelectedObjects?.() || [];
            const selectedRoot = !explicit && selected.length === 1 && selected[0].realistic3D ? selected[0] : null;
            const realisticRoot = explicit?.root?.realistic3D ? explicit.root : selectedRoot;
            if (realisticRoot) return this.objects?.objects?.includes(realisticRoot) ? { root: realisticRoot, parts: {} } : null;
            const candidate = explicit || system?._detectSelectedArmature?.();
            const objects = this.objects?.objects || [];
            const root = objects.find(obj => obj?.id === candidate?.root?.id);
            if (!root) return null;
            // A remembered rig may contain objects from a different scene, even
            // when a duplicated scene has the same object IDs. Re-detect locally.
            const pool = objects.filter(obj => obj === root || obj.pinnedTo === root.id);
            const live = system?._detectArmatureFromPool?.(pool);
            return live?.root === root ? live : null;
        }

        resetForSceneChange() {
            this.close({ force: true });
            this.context = null;
        }

        _isContextCurrent(context = this.context) {
            if (!context) return false;
            const binding = context.sceneBinding;
            if (!binding) return true;
            const audio = this.app?.audioTimeline || this.audioTimeline;
            return binding.scene === this.app?.scenes?.[this.app?.currentSceneIndex]
                && binding.audioId === audio?.audioId
                && binding.audioBuffer === audio?.audioBuffer
                && this.objects?.objects?.includes(context.root);
        }

        _characterKey(descriptor = {}) {
            return `${descriptor.adapterKind || 'unknown'}:${descriptor.familyId || descriptor.instanceId || descriptor.rootId || ''}`;
        }

        _buildCharacterContext(armature) {
            const system = this.app?.jointSystem || this.jointSystem;
            const live = this._resolveArmature(armature);
            if (live?.root?.realistic3D) {
                const descriptor = { adapterKind: 'realistic-3d', rootId: live.root.id, targetHeadId: live.root.id, targets: [] };
                descriptor.characterKey = this._characterKey(descriptor);
                return { armature: live, adapter: { kind: 'realistic-3d', headObj: live.root }, root: live.root, descriptor };
            }
            if (!live?.root || !system) return null;
            const adapter = system._getArmatureFaceAdapter?.(live, { ensure: true });
            if (!adapter?.headObj || adapter.supportsFacialFeatures === false) return null;

            if (adapter.kind === 'svg-african-native') {
                const instanceId = adapter.headObj._svgCharacterInstanceId
                    || live.root._svgCharacterInstanceId
                    || '';
                const descriptor = {
                    adapterKind: adapter.kind,
                    rootId: live.root.id,
                    targetHeadId: adapter.headObj.id,
                    instanceId,
                    familyId: '',
                    targets: []
                };
                descriptor.characterKey = this._characterKey(descriptor);
                return { armature: live, adapter, root: live.root, descriptor };
            }

            const members = system._getUniversalCharacterFamilyMemberArmatures?.(live) || [live];
            const targets = [];
            members.forEach(member => {
                const memberAdapter = system._getArmatureFaceAdapter?.(member, { ensure: true });
                const head = memberAdapter?.headObj;
                const mouthId = head?._facialFeatures?.mouth;
                const mouth = mouthId ? this.objects?.getObjectById?.(mouthId) : null;
                if (!head || !mouth || !head._facialDrawCtx) return;
                targets.push({
                    head,
                    mouth,
                    armature: member,
                    variantKey: system._getUniversalCharacterVariantKey?.(member) || member.root?.id || 'front'
                });
            });
            if (!targets.length) return null;
            const descriptor = {
                adapterKind: 'universal-features',
                rootId: live.root.id,
                targetHeadId: adapter.headObj.id,
                instanceId: '',
                familyId: system._getUniversalCharacterFamilyId?.(live) || '',
                targets: []
            };
            descriptor.characterKey = this._characterKey(descriptor);
            return { armature: live, adapter, root: live.root, descriptor, universalTargets: targets };
        }

        _findClip(characterKey, audioId = '') {
            let legacyMatch = null;
            for (const owner of this.objects?.objects || []) {
                for (const animation of owner.animations || []) {
                    const configs = Array.isArray(animation.generated) ? animation.generated : [animation.generated];
                    for (const config of configs) {
                        if (config?.type !== 'audio-lip-sync' || config.characterKey !== characterKey) continue;
                        if (!audioId || String(config.audioId || '') === String(audioId)) {
                            return { owner, animation, config };
                        }
                        if (!config.audioId && !legacyMatch) legacyMatch = { owner, animation, config };
                    }
                }
            }
            return legacyMatch;
        }

        open(options = {}) {
            const audio = this.app?.audioTimeline || this.audioTimeline;
            if (!audio?.isLoaded || !audio.audioBuffer) {
                Utils.showToast('Load a soundtrack before creating lip sync', 'warning');
                return false;
            }
            const characters = audio._getAvailableCharacters?.() || [];
            const linked = characters.find(character => character.id === String(audio.characterId || ''));
            let selected = this._resolveArmature(options.armature || null);
            if (!options.armature) {
                const selectedIds = new Set((this.objects?.getSelectedObjects?.() || []).map(obj => obj.id));
                const system = this.app?.jointSystem || this.jointSystem;
                const selectedCharacters = characters.filter(character =>
                    selectedIds.has(character.id) || (!character.armature.root.realistic3D &&
                        system?._getArmatureObjects?.(character.armature)?.some(obj => selectedIds.has(obj.id))));
                if (selectedCharacters.length > 1) selected = null;
            }
            const candidate = linked?.armature || selected || (characters.length === 1 ? characters[0].armature : null);
            const context = candidate || !characters.length ? this._buildCharacterContext(candidate) : null;
            if (!context) {
                if (characters.length > 1) {
                    audio.openClipEditor?.(audio.activeAudioId);
                    audio.editControls?.querySelector('.audio-character-select')?.focus();
                    Utils.showToast('Choose a character in this scene, then open Lip Sync', 'warning');
                } else Utils.showToast('Select a character with facial controls in this scene', 'warning');
                return false;
            }
            if (!this.modal?.classList.contains('hidden') && !this._confirmDiscardDraft()) return false;
            this._draftHistory = null;
            this.stopPreview();
            this._reviewTimeMs = 0;
            this._reviewZoom = 1;
            this._reviewSelection = null;
            const existing = this._findClip(context.descriptor.characterKey, audio.audioId || '');
            this._draftGenerationToken = null;
            this._cancelTranscription();
            this.context = { ...context, existing, sceneBinding: {
                scene: this.app?.scenes?.[this.app?.currentSceneIndex],
                audioId: audio.audioId,
                audioBuffer: audio.audioBuffer
            } };
            this.recognition = existing?.config?.recognition ? { ...existing.config.recognition } : null;
            this._field('transcriptionLanguage').value = this.recognition?.language || 'auto';
            if (!this._field('transcriptionLanguage').value) this._field('transcriptionLanguage').value = 'auto';
            this._field('transcriptionLanguage').title = 'Igbo translation is available in Captions; explicit Igbo transcription is not supported.';
            const transcribeButton = this.modal?.querySelector('[data-als-action="transcribe"]');
            if (transcribeButton) {
                const local = global.__STAGE_USER?.ai_config?.transcription?.local === true;
                transcribeButton.lastChild.textContent = ` Transcribe Audio (${local ? 'local server, no AI credits' : 'OpenAI, paid'})`;
                transcribeButton.title = `Word transcription: ${local ? 'local server, no AI credits' : 'OpenAI, provider charges or AI credits'}. Completed sections are reused on retry.`;
            }
            this.draftCues = existing ? Runtime.normalizeCues(existing.config.cues) : [];
            this.draftWordTimings = Array.isArray(existing?.config?.wordTimings)
                ? this._withWordIds(existing.config.wordTimings) : [];
            this.wordTimingEdits = null;
            this.wordEditsPending = false;
            this.wordTimingEdited = existing?.config?.wordTimingEdited === true;
            const savedPerformanceEvents = existing?.config?.performancePlan?.semanticEvents;
            this.draftPerformanceEvents = Array.isArray(savedPerformanceEvents)
                ? Runtime.normalizeSemanticEvents(savedPerformanceEvents, existing.config.duration)
                : [];
            this.performanceDraftReady = Array.isArray(savedPerformanceEvents);
            this.performanceDraftEdited = this.performanceDraftReady;
            this.draftDirty = !existing;

            const rangeIn = Number(this.app?.timeline?._rangeInMs);
            const rangeOut = Number(this.app?.timeline?._rangeOutMs);
            const fullDuration = Math.max(0, audio.getDurationMs?.() || 0);
            const audioTimelineStartMs = Math.max(0, Number(audio.timelineStartMs) || 0);
            const existingOffset = Number(existing?.config?.offsetMs) || 0;
            const existingDelay = Number(existing?.animation?.delay) || 0;
            const savedDelay = Number(existing?.config?.timelineDelayMs);
            const timelineMoved = Number.isFinite(savedDelay) && Math.abs(savedDelay - existingDelay) > 0.5;
            const startMs = existing
                ? Math.max(0, !timelineMoved && Number.isFinite(Number(existing.config.timelineStartMs))
                    ? Number(existing.config.timelineStartMs)
                    : existingDelay - existingOffset - audioTimelineStartMs)
                : (Number.isFinite(rangeIn) ? Math.max(0, rangeIn - audioTimelineStartMs) : 0);
            const endMs = existing
                ? startMs + Math.max(1, Number(existing.config.duration) || 0)
                : (Number.isFinite(rangeOut) && rangeOut > audioTimelineStartMs + startMs
                    ? Math.min(fullDuration, rangeOut - audioTimelineStartMs)
                    : fullDuration);

            const startField = this._field('start');
            const endField = this._field('end');
            if (startField) startField.value = (startMs / 1000).toFixed(3);
            if (endField) endField.value = (Math.max(startMs + 1, endMs) / 1000).toFixed(3);
            if (this._field('offset')) this._field('offset').value = String(existing?.config?.offsetMs || 0);
            if (this._field('strength')) this._field('strength').value = String(Math.round((existing?.config?.strength ?? 1) * 100));
            if (this._field('smoothing')) this._field('smoothing').value = String(Math.round(existing?.config?.smoothingMs ?? 55));
            if (this._field('mouthClarity')) {
                this._field('showTeeth').checked=existing?.config?.showTeeth ?? (existing?.config?.teethVisibility ?? .6)>0;
                this._field('teethVisibility').value=String(Math.round((existing?.config?.showTeeth !== undefined ? existing.config.teethVisibility ?? .6 : existing?.config?.teethVisibility || .6)*100));
                this._field('teethVisibility').nextElementSibling.textContent=this._field('teethVisibility').value+'%';
                const mouthClarity = this._field('mouthClarity');
                mouthClarity.value = String(Math.round((existing?.config?.mouthOpeningGain
                    ?? existing?.config?.svgMouthGain
                    ?? 1.45) * 100));
                mouthClarity.disabled = false;
                mouthClarity.title = 'Controls lip separation, dark mouth cavity depth, and jaw movement.';
            }
            if (this._field('transcript')) this._field('transcript').value = existing?.config?.transcript || '';
            const savedPerformance = existing?.config?.performance;
            const savedIntensity = (field, legacyField, fallback) => {
                const explicit = Number(savedPerformance?.[field]);
                if (Number.isFinite(explicit)) return Math.round(Math.max(0, Math.min(1.5, explicit)) * 100);
                if (existing && typeof savedPerformance?.[legacyField] === 'boolean') {
                    return savedPerformance[legacyField] ? 100 : 0;
                }
                return fallback;
            };
            if (this._field('eyeIntensity')) this._field('eyeIntensity').value = String(savedIntensity('eyeIntensity', 'eyeMovement', 75));
            if (this._field('expressionIntensity')) {
                const eyeFallback = savedIntensity('eyeIntensity', 'eyeMovement', 75);
                this._field('expressionIntensity').value = String(savedIntensity('expressionIntensity', 'facialExpression', eyeFallback));
            }
            if (this._field('headIntensity')) this._field('headIntensity').value = String(savedIntensity('headIntensity', 'headMovement', 65));
            if (this._field('handIntensity')) this._field('handIntensity').value = String(savedIntensity('handIntensity', 'handGestures', 65));
            if (this._field('handSpeed')) {
                const savedHandSpeed = Number(savedPerformance?.handSpeed);
                this._field('handSpeed').value = String(Math.round(
                    (Number.isFinite(savedHandSpeed) ? Math.max(0.4, Math.min(1.6, savedHandSpeed)) : 0.8) * 100
                ));
            }
            if (this._field('bodyIntensity')) this._field('bodyIntensity').value = String(savedIntensity('bodyIntensity', 'bodyMovement', 40));
            if (this._field('deliveryStyle')) {
                const savedStyle = String(savedPerformance?.deliveryStyle || 'natural');
                this._field('deliveryStyle').value = Object.hasOwn(Runtime.speechStyles, savedStyle) ? savedStyle : 'natural';
            }
            if (this._field('handPattern')) {
                const legacyCoordinatedDefault = existing?.config?.type === 'audio-lip-sync'
                    && Number(existing.config.version) > 0
                    && Number(existing.config.version) < 20
                    && savedPerformance?.handPattern === 'coordinated';
                const savedPattern = legacyCoordinatedDefault
                    ? 'alternating'
                    : String(savedPerformance?.handPattern || 'alternating');
                this._field('handPattern').value = Runtime.handPatterns.includes(savedPattern)
                    ? savedPattern
                    : 'alternating';
            }
            if (this._field('semanticGestures')) {
                this._field('semanticGestures').checked = savedPerformance?.semanticGestures !== false;
            }
            const savedMotionMode = existing
                ? (savedPerformance?.motionMode === 'mouth-only' ? 'mouth-only' : 'full')
                : 'mouth-only';
            this._setPerformanceMode(savedMotionMode);
            this._setMode(existing?.config?.mode || 'quick', { markDirty: false });
            this._wordTimingContext = this._getWordTimingContext();
            if (this.draftWordTimings.length && existing?.config) {
                const saved = existing.config;
                for (const key of ['audioId', 'audioRevision', 'sourceStartMs', 'sourceEndMs']) {
                    if (saved[key] != null) this._wordTimingContext[key] = saved[key];
                }
                if (saved.audioRefreshRequired) this._wordTimingContext.audioRevision = -1;
            }
            this._syncSliderOutputs();

            const characterName = characters.find(character => character.id === context.root.id)?.name
                || context.root.name || 'Selected character';
            const characterNode = this.modal?.querySelector('[data-als-character]');
            const audioNode = this.modal?.querySelector('[data-als-audio]');
            const sceneIndex = this.app?.currentSceneIndex || 0;
            const sceneName = this.app?.scenes?.[sceneIndex]?.name || `Scene ${sceneIndex + 1}`;
            if (characterNode) characterNode.textContent = `${sceneName} \u2192 ${characterName}`;
            if (audioNode) audioNode.textContent = `${audio.fileName || 'Soundtrack'} | ${Utils.formatTime(fullDuration)} at ${Utils.formatTime(audioTimelineStartMs)}`;
            const createButton = this.modal?.querySelector('[data-als-action="create"]');
            const removeButton = this.modal?.querySelector('[data-als-action="remove"]');
            if (createButton) createButton.innerHTML = existing
                ? '<i class="fas fa-rotate"></i> Update Lip Sync'
                : '<i class="fas fa-link"></i> Create Lip Sync';
            if (removeButton) removeButton.disabled = !existing;
            this._renderCueEditor();
            this._setCueTab('mouth');
            const audioChanged = !!existing && (
                existing.config.audioRefreshRequired === true
                || (existing.config.audioId && existing.config.audioId !== audio.audioId)
                || Number(existing.config.audioRevision || 1) !== Number(audio.audioRevision || 1)
            );
            if (audioChanged) this.draftDirty = true;
            this._setStatus(audioChanged
                ? (existing?.config?.audioRefreshReason || 'Soundtrack changed - regenerate cues')
                : (existing
                    ? `${this.draftCues.length} mouth cues | ${this.draftPerformanceEvents.length} performance cues`
                    : 'Ready'), audioChanged ? 'warning' : '');
            this.modal?.classList.remove('hidden');
            this._resetDraftHistory();
            return true;
        }

        _captureDraft() {
            const fields = {};
            this.modal?.querySelectorAll('[data-als-field]').forEach(input => {
                fields[input.dataset.alsField] = input.type === 'checkbox' ? input.checked : input.value;
            });
            return JSON.parse(JSON.stringify({
                fields, mode: this._getMode(), performanceMode: this._getPerformanceMode(),
                draftCues: this.draftCues, draftPerformanceEvents: this.draftPerformanceEvents,
                draftWordTimings: this.draftWordTimings || [], wordTimingEdits: this.wordTimingEdits || null,
                wordEditsPending: !!this.wordEditsPending, wordTimingEdited: !!this.wordTimingEdited,
                performanceDraftReady: this.performanceDraftReady, performanceDraftEdited: this.performanceDraftEdited,
                draftDirty: this.draftDirty, recognition: this.recognition || null,
                _wordTimingContext: this._wordTimingContext || null
            }));
        }

        _resetDraftHistory() {
            const state = this._captureDraft();
            this._draftBaseline = JSON.stringify(state);
            this._draftHistory = [{ state, tab: this.activeCueTab }];
            this._draftHistoryIndex = 0;
            this._historyEditGroup = null;
            this._syncDraftHistoryButtons();
        }

        _recordDraftHistory(group = null) {
            if (!this._draftHistory || this._historyRestoring) return;
            const state = this._captureDraft();
            if (JSON.stringify(state) === JSON.stringify(this._draftHistory[this._draftHistoryIndex].state)) return;
            this._draftHistory.splice(this._draftHistoryIndex + 1);
            const entry = { state, tab: this.activeCueTab };
            if (group && group === this._historyEditGroup && this._draftHistoryIndex > 0) {
                this._draftHistory[this._draftHistoryIndex] = entry;
            } else {
                this._draftHistory.push(entry);
                if (this._draftHistory.length > 60) this._draftHistory.shift();
                this._draftHistoryIndex = this._draftHistory.length - 1;
            }
            this._historyEditGroup = group;
            this._syncDraftHistoryButtons();
        }

        _syncDraftHistoryButtons() {
            const busy = !!this.transcriptionRequest || !!this._draftGenerationToken;
            const undo = this.modal?.querySelector('[data-als-action="undo"]');
            const redo = this.modal?.querySelector('[data-als-action="redo"]');
            if (undo) undo.disabled = busy || !this._draftHistory || this._draftHistoryIndex <= 0;
            if (redo) redo.disabled = busy || !this._draftHistory || this._draftHistoryIndex >= this._draftHistory.length - 1;
        }

        _restoreDraftHistory(direction) {
            if (!this._draftHistory || this.transcriptionRequest || this._draftGenerationToken) return false;
            this._recordDraftHistory();
            const index = this._draftHistoryIndex + direction;
            if (index < 0 || index >= this._draftHistory.length) return false;
            this.stopPreview();
            const { state, tab } = JSON.parse(JSON.stringify(this._draftHistory[index]));
            this._historyRestoring = true;
            try {
                const { fields, mode, performanceMode, ...draft } = state;
                Object.entries(fields).forEach(([name, value]) => {
                    const input = this._field(name);
                    if (!input) return;
                    if (input.type === 'checkbox') input.checked = value;
                    else input.value = value;
                });
                this.wordEditsPending = false;
                this._setMode(mode, { markDirty: false });
                this._setPerformanceMode(performanceMode);
                Object.assign(this, draft);
                this._syncSliderOutputs();
                this._renderCueEditor();
                this._setCueTab(tab);
                this._draftHistoryIndex = index;
                this._historyEditGroup = null;
                this._setStatus(direction < 0 ? 'Draft edit undone' : 'Draft edit redone');
            } finally {
                this._historyRestoring = false;
                this._syncDraftHistoryButtons();
            }
            return true;
        }

        _hasUnsavedDraft() {
            return !!this._draftHistory && JSON.stringify(this._captureDraft()) !== this._draftBaseline;
        }

        _confirmDiscardDraft() {
            return (!this._hasUnsavedDraft() && !this.transcriptionRequest && !this._draftGenerationToken)
                || global.confirm('Discard unsaved lip-sync edits and close this draft?');
        }

        close(options = {}) {
            if (!options.force && !this._confirmDiscardDraft()) return false;
            this._draftGenerationToken = null;
            this._cancelTranscription();
            this.stopPreview();
            this.modal?.classList.add('hidden');
            this._draftHistory = null;
            this._syncDraftHistoryButtons();
            return true;
        }

        _setTranscriptionBusy(busy) {
            if (busy) {
                this._transcriptionDisabledControls = new Map();
                this.modal?.querySelectorAll('button, input, select, textarea').forEach(control => {
                    if (['close', 'cancel', 'cancel-transcription'].includes(control.dataset.alsAction)) return;
                    this._transcriptionDisabledControls.set(control, control.disabled);
                    control.disabled = true;
                });
            } else {
                this._transcriptionDisabledControls?.forEach((disabled, control) => { control.disabled = disabled; });
                this._transcriptionDisabledControls = null;
            }
            this._syncDraftHistoryButtons();
            const cancel = this.modal?.querySelector('[data-als-action="cancel-transcription"]');
            const progress = this.modal?.querySelector('[data-als-transcription-progress]');
            if (cancel) cancel.hidden = !busy;
            if (progress) progress.hidden = !busy;
            this.modal?.querySelector('.als-dialog')?.setAttribute('aria-busy', busy ? 'true' : 'false');
        }

        _cancelTranscription() {
            clearTimeout(this.transcriptionRequest?.timeout);
            this.transcriptionRequest?.controller.abort();
            this.transcriptionRequest = null;
            this._setTranscriptionBusy(false);
        }

        _recognitionMatches(settings) {
            const audio = this.app?.audioTimeline || this.audioTimeline;
            const saved = this.recognition;
            return settings.mode === 'transcript' && !!saved && saved.transcript === settings.transcript
                && saved.audioId === String(audio?.audioId || '')
                && saved.audioRevision === Number(audio?.audioRevision || 1)
                && Math.abs(saved.sourceStartMs - settings.sourceStartMs) < 1
                && Math.abs(saved.sourceEndMs - settings.sourceEndMs) < 1;
        }

        async _transcriptionWav(buffer, settings) {
            const { samples, sampleRate } = this._extractMonoSamples(buffer, settings.sourceStartMs, settings.sourceEndMs);
            const OfflineContext = global.OfflineAudioContext || global.webkitOfflineAudioContext;
            if (!OfflineContext) throw new Error('This browser does not support audio transcription preparation.');
            const context = new OfflineContext(1, Math.max(1, Math.round(samples.length / sampleRate * 16000)), 16000);
            const source = context.createBufferSource();
            source.buffer = context.createBuffer(1, samples.length, sampleRate);
            source.buffer.copyToChannel(samples, 0);
            source.connect(context.destination);
            source.start();
            const resampled = await context.startRendering();
            const audio = this.app?.audioTimeline || this.audioTimeline;
            return audio._audioBufferToWavBlob(resampled);
        }

        _normalizeRecognizedWords(words, durationMs) {
            if (!Array.isArray(words) || words.length > 5000) return [];
            let cursor = 0;
            return words.flatMap(word => {
                const text = String(word?.text || '').trim();
                if (!text || text.length > 200 || !Number.isFinite(word?.startMs) || !Number.isFinite(word?.endMs)) return [];
                const startMs = Math.max(cursor, Math.round(Math.max(0, Math.min(durationMs, word.startMs))));
                const endMs = Math.round(Math.max(0, Math.min(durationMs, word.endMs)));
                if (endMs <= startMs) return [];
                cursor = endMs;
                return [{ text, startMs, endMs }];
            });
        }

        _transcriptionParts(durationMs, coreDurationMs = 58000) {
            const coreDuration = Math.max(1000, Math.min(58000, Math.round(Number(coreDurationMs) || 58000)));
            if (durationMs <= coreDuration) return [{ start: 0, end: durationMs, coreStart: 0, coreEnd: durationMs }];
            const parts = [];
            for (let coreStart = 0; coreStart < durationMs; coreStart += coreDuration) {
                const coreEnd = Math.min(durationMs, coreStart + coreDuration);
                parts.push({ start: Math.max(0, coreStart - 1000), end: Math.min(durationMs, coreEnd + 1000), coreStart, coreEnd });
            }
            return parts;
        }

        async _waitTranscriptionSlot(request) {
            // Match the server's five requests per minute without raising its limit.
            const last = Math.max(this.app?._lastLipSyncTranscriptionRequest || 0,
                global.CaptionWorkspace?.lastTranscriptionRequest || 0);
            const delay = Math.max(0, last + 13000 - Date.now());
            const signal = request.controller.signal;
            signal.throwIfAborted();
            if (delay) await new Promise((resolve, reject) => {
                const abort = () => { clearTimeout(timer); reject(new DOMException('Cancelled', 'AbortError')); };
                const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, delay);
                signal.addEventListener('abort', abort, { once: true });
            });
            signal.throwIfAborted();
            if (this.app) this.app._lastLipSyncTranscriptionRequest = Date.now();
            if (global.CaptionWorkspace) global.CaptionWorkspace.lastTranscriptionRequest = Date.now();
        }

        _mergeTranscriptionParts(parts, results, durationMs) {
            const words = parts.flatMap((part, index) => results.get(index).words.filter(word => {
                const midpoint = part.start + (word.startMs + word.endMs) / 2;
                return midpoint >= part.coreStart && midpoint < part.coreEnd;
            }).map(word => ({ ...word, startMs: part.start + word.startMs, endMs: part.start + word.endMs, part: index })))
                .sort((a, b) => a.startMs - b.startMs);
            const merged = [];
            const token = text => text.toLocaleLowerCase().replace(/[\s.,!?;:]+/g, '');
            for (const word of words) {
                const previous = merged[merged.length - 1];
                const overlap = previous ? Math.min(previous.endMs, word.endMs) - Math.max(previous.startMs, word.startMs) : 0;
                if (previous && previous.part !== word.part && token(previous.text) === token(word.text)
                    && overlap > .4 * Math.min(previous.endMs - previous.startMs, word.endMs - word.startMs)) {
                    previous.endMs = Math.max(previous.endMs, word.endMs);
                    continue;
                }
                const startMs = Math.max(previous?.endMs || 0, word.startMs);
                const endMs = Math.min(durationMs, word.endMs);
                if (endMs > startMs) merged.push({ ...word, startMs, endMs });
            }
            return merged.map(({ part, ...word }) => word);
        }

        async transcribeAudio() {
            if (!this.context || this.transcriptionRequest || this._transcriptionRecoveryLoading) return false;
            const ai = this.app?.ai;
            const apiKey = ai?.apiProvider === 'openai' ? String(ai?.apiKey || '').trim() : '';
            const local = global.__STAGE_USER?.ai_config?.transcription?.local === true;
            const serverOpenAI = global.__STAGE_USER?.ai_config?.providers?.openai?.configured === true;
            if (!local && !apiKey && !serverOpenAI) {
                this._setStatus('Select OpenAI and enter its API key in Settings to transcribe audio.', 'warning');
                return false;
            }
            if (!global.__STAGE_USER?.csrf_token) {
                this._setStatus('Sign in to the online app to transcribe audio.', 'warning');
                return false;
            }
            const audio = this.app?.audioTimeline || this.audioTimeline;
            const settings = this._readSettings();
            const language = this._field('transcriptionLanguage')?.value || 'auto';
            if (!audio?.audioBuffer || !Number.isFinite(settings.duration) || settings.duration <= 0
                || settings.sourceStartMs < 0 || settings.sourceEndMs > audio.audioBuffer.duration * 1000 + 1) {
                this._setStatus('Select a valid audio range within the recording for transcription.', 'warning');
                return false;
            }
            const chunkDuration = local ? 25000 : 58000;
            const parts = this._transcriptionParts(settings.duration, chunkDuration);
            const jobKey = JSON.stringify([audio.audioId, audio.audioRevision, settings.sourceStartMs, settings.sourceEndMs, language, local, chunkDuration]);
            let existingJob = this.transcriptionJob?.key === jobKey && this.transcriptionJob.buffer === audio.audioBuffer
                ? this.transcriptionJob : null;
            let recoveryKey = '';
            if (audio.audioDataUrl && global.StorageIDB?.isAvailable() && global.crypto?.subtle) {
                this._transcriptionRecoveryLoading = true;
                const buffer = audio.audioBuffer, context = this.context;
                try {
                    const digest = await global.crypto.subtle.digest('SHA-256', new TextEncoder().encode(audio.audioDataUrl));
                    recoveryKey = jobKey + ':' + Array.from(new Uint8Array(digest), n=>n.toString(16).padStart(2,'0')).join('');
                    const saved = await global.StorageIDB.get('autosaves', 'transcription-progress');
                    if (!existingJob && saved?.key === recoveryKey && Date.now()-saved.savedAt < 7*86400000 && Array.isArray(saved.results)) {
                        const results = new Map(saved.results.filter(([index, result])=>Number.isInteger(index) && index>=0 && index<parts.length && Array.isArray(result?.words)));
                        existingJob = {key:jobKey, buffer, results};
                    }
                } catch (error) { console.warn('Transcription recovery unavailable:', error.message); }
                finally { this._transcriptionRecoveryLoading = false; }
                if (audio.audioBuffer !== buffer || this.context !== context || !this.context) return false;
            }
            const remaining = parts.length - (existingJob?.results.size || 0);
            const confirmMsg = local
                ? `Transcribe the selected audio on the Animation Stage server in ${remaining} remaining section(s)? No external AI provider or AI credits will be used. The recognized words will replace this draft transcript, not the applied clip.`
                : apiKey
                ? `Send ${remaining} remaining section(s) of the selected audio to OpenAI for speech recognition? Provider charges may apply. The recognized words will replace this draft transcript, not the applied clip.`
                : `Send ${remaining} remaining section(s) of the selected audio to OpenAI for speech recognition? This uses your AI credits. The recognized words will replace this draft transcript, not the applied clip.`;
            if (!global.confirm(confirmMsg + (local && global.SpeechJobs ? '\n\n' + global.SpeechJobs.languageNotice(language) : ''))) return false;
            this._recordDraftHistory();
            this.stopPreview();
            const request = {
                controller: new AbortController(), context: this.context, audio,
                audioId: String(audio.audioId || ''), audioRevision: Number(audio.audioRevision || 1),
                buffer: audio.audioBuffer, settings
            };
            this.transcriptionRequest = request;
            const job = existingJob || { key: jobKey, buffer: audio.audioBuffer, results: new Map() };
            this.transcriptionJob = job;
            this._setTranscriptionBusy(true);
            const progress = this.modal?.querySelector('[data-als-transcription-progress]');
            if (progress) { progress.max = parts.length; progress.value = job.results.size; }
            this._setStatus('Preparing selected audio...', '');
            const isCurrent = () => this.transcriptionRequest === request && this.context === request.context
                && (this.app?.audioTimeline || this.audioTimeline) === audio
                && String(audio.audioId || '') === request.audioId
                && Number(audio.audioRevision || 1) === request.audioRevision
                && audio.audioBuffer === request.buffer
                && this._readSettings().sourceStartMs === settings.sourceStartMs
                && this._readSettings().sourceEndMs === settings.sourceEndMs
                && (this._field('transcriptionLanguage')?.value || 'auto') === language;
            const requestSection = async (part, label) => {
                request.controller.signal.throwIfAborted();
                const blob = await this._transcriptionWav(request.buffer, {
                    sourceStartMs: settings.sourceStartMs + part.start, sourceEndMs: settings.sourceStartMs + part.end });
                this._setStatus(`Waiting to submit ${label}...`, '');
                await this._waitTranscriptionSlot(request);
                if (!isCurrent()) throw new Error('The selected audio changed. Transcribe its new range again.');
                const form = new FormData();
                form.append('audio', blob, 'selected-speech.wav');
                form.append('language', language);
                form.append('allow_empty', '1');
                if (local) form.append('provider', 'local');
                if (!local) form.append('apiKey', apiKey);
                this._setStatus(`${local ? 'Recognizing speech on this server' : 'Recognizing speech with OpenAI'}: ${label}...`, '');
                request.timeout = setTimeout(() => { request.timedOut = true; request.controller.abort(); }, 105000);
                try {
                    const response = await fetch('/api/ai/transcribe.php', {
                        method: 'POST', credentials: 'same-origin', signal: request.controller.signal,
                        headers: { 'X-CSRF-Token': global.__STAGE_USER?.csrf_token || '' }, body: form
                    });
                    const responseText = await response.text();
                    let result = {};
                    try { result = responseText ? JSON.parse(responseText) : {}; } catch (_) {}
                    if (response.status === 429 && this.app) {
                        const seconds = Number(response.headers.get('Retry-After'));
                        if (Number.isFinite(seconds) && seconds > 0) {
                            this.app._lastLipSyncTranscriptionRequest = Date.now() + Math.min(seconds, 300) * 1000 - 13000;
                        }
                    }
                    if (!response.ok) {
                        const serverMessage = typeof result?.error === 'string' ? result.error : '';
                        const message = response.status === 504
                            ? 'The transcription server timed out (HTTP 504). Try again; completed sections are retained.'
                            : response.status >= 500
                                ? `The transcription server returned an error (HTTP ${response.status}). Try again; completed sections are retained.`
                                : serverMessage || `Transcription failed (HTTP ${response.status}). Current cues have been retained.`;
                        const error = new Error(serverMessage && response.status < 500 ? serverMessage : message);
                        error.status = response.status;
                        throw error;
                    }
                    if (result.job) {
                        clearTimeout(request.timeout);
                        if (!global.SpeechJobs) throw new Error('Reload the app to connect to background speech jobs.');
                        return await global.SpeechJobs.resolve(result, request.controller.signal, message=>this._setStatus(`${label}: ${message}`, ''));
                    }
                    return result;
                } finally { clearTimeout(request.timeout); }
            };
            try {
                for (const [index, part] of parts.entries()) {
                    request.controller.signal.throwIfAborted();
                    if (!isCurrent()) throw new Error('The selected audio changed. Transcribe its new range again.');
                    if (job.results.has(index)) continue;
                    let result;
                    try {
                        this._setStatus(`Preparing section ${index + 1} of ${parts.length}...`, '');
                        result = await requestSection(part, `section ${index + 1} of ${parts.length}`);
                    } catch (error) {
                        if (!local || (error.status !== 504 && !error.retryShorter) || part.coreEnd - part.coreStart <= 14000) throw error;
                        const splitAt = Math.round((part.coreStart + part.coreEnd) / 2);
                        const retryParts = [
                            { start: part.start, end: Math.min(part.end, splitAt + 500), coreStart: part.coreStart, coreEnd: splitAt },
                            { start: Math.max(part.start, splitAt - 500), end: part.end, coreStart: splitAt, coreEnd: part.coreEnd }
                        ];
                        const recoveredWords = [];
                        let retryEngine = '';
                        for (const [retryIndex, retryPart] of retryParts.entries()) {
                            this._setStatus(`Section ${index + 1} timed out; retrying shorter local audio (${retryIndex + 1}/2)...`, 'warning');
                            const retryResult = await requestSection(retryPart, `short retry ${retryIndex + 1}/2 for section ${index + 1}`);
                            retryEngine = retryResult.engine || retryEngine;
                            const retryWords = this._normalizeRecognizedWords(retryResult?.words, retryPart.end - retryPart.start);
                            if (!Array.isArray(retryResult?.words) || (retryResult.words.length && !retryWords.length)) {
                                throw new Error('Invalid timed speech returned for a shorter retry. Completed sections are retained.');
                            }
                            recoveredWords.push(...retryWords.filter(word => {
                                const midpoint = (word.startMs + word.endMs) / 2 + retryPart.start;
                                return midpoint >= retryPart.coreStart && midpoint < retryPart.coreEnd;
                            }).map(word => ({ ...word,
                                startMs: word.startMs + retryPart.start - part.start,
                                endMs: word.endMs + retryPart.start - part.start
                            })));
                        }
                        result = { words: recoveredWords, engine: retryEngine };
                    }
                    if (!isCurrent()) throw new Error('The selected audio changed. Transcribe its new range again.');
                    const words = this._normalizeRecognizedWords(result?.words, part.end - part.start);
                    if (!Array.isArray(result?.words) || (result.words.length && !words.length)) throw new Error('Invalid timed speech returned. Current cues retained.');
                    job.results.set(index, { words, engine: result.engine });
                    if (recoveryKey) {
                        try { await global.StorageIDB.put('autosaves', 'transcription-progress', {key:recoveryKey, savedAt:Date.now(), results:[...job.results]}); }
                        catch (error) { console.warn('Transcription progress could not be saved:', error.message); }
                    }
                    if (progress) progress.value = job.results.size;
                }
                const words = this._mergeTranscriptionParts(parts, job.results, settings.duration);
                if (!words.length) {
                    this.transcriptionJob = null;
                    throw new Error('No timed speech was detected. Current cues have been retained.');
                }
                const transcript = JSON.stringify(words, null, 2);
                this.recognition = {
                    engine: job.results.get(0)?.engine === 'faster-whisper-small' ? 'faster-whisper-small' : 'whisper-1', transcript, audioId: request.audioId, audioRevision: request.audioRevision,
                    sourceStartMs: settings.sourceStartMs, sourceEndMs: settings.sourceEndMs, language
                };
                this.transcriptionRequest = null;
                this._setTranscriptionBusy(false);
                this._setMode('transcript');
                this._field('transcript').value = transcript;
                this.wordTimingEdits = null;
                this.wordEditsPending = false;
                this.wordTimingEdited = false;
                this.draftDirty = true;
                request.transcriptReady = true;
                const generated = await this.generateDraft();
                if (generated) this.transcriptionJob = null;
                return generated;
            } catch (error) {
                if ((this.transcriptionRequest === request || (request.transcriptReady && this.context === request.context))
                    && (request.timedOut || error?.name !== 'AbortError')) {
                    this._setStatus(request.transcriptReady ? 'Words recognized, but cues could not be generated. Try Generate Cues.'
                        : `${request.timedOut ? 'Transcription timed out. Current cues have been retained.'
                            : (error?.message || 'Transcription failed. Current cues have been retained.')} ${this.transcriptionJob === job ? job.results.size : 0} of ${parts.length} sections retained for retry.`, 'error');
                }
                return false;
            } finally {
                clearTimeout(request.timeout);
                if (this.transcriptionRequest === request) {
                    this.transcriptionRequest = null;
                    this._setTranscriptionBusy(false);
                }
            }
        }

        _readSettings() {
            const audio = this.app?.audioTimeline || this.audioTimeline;
            const fullDuration = Math.max(1, audio?.getDurationMs?.() || 1);
            let startMs = Math.max(0, (Number(this._field('start')?.value) || 0) * 1000);
            let endMs = Math.max(0, (Number(this._field('end')?.value) || 0) * 1000);
            startMs = Math.min(fullDuration, startMs);
            endMs = Math.min(fullDuration, endMs || fullDuration);
            if (endMs <= startMs) endMs = Math.min(fullDuration, startMs + 1000);
            const mode = this._getMode();
            const performanceMode = this._getPerformanceMode();
            const deliveryStyle = String(this._field('deliveryStyle')?.value || 'natural');
            const handPattern = String(this._field('handPattern')?.value || 'alternating');
            return {
                mode,
                performanceMode,
                startMs,
                endMs,
                duration: Math.max(1, endMs - startMs),
                sourceStartMs: Math.max(0, (audio?.trimStartMs || 0) + startMs),
                sourceEndMs: Math.max(1, (audio?.trimStartMs || 0) + endMs),
                offsetMs: Math.round(Number(this._field('offset')?.value) || 0),
                strength: Math.max(0, Math.min(1.5, (Number(this._field('strength')?.value) || 100) / 100)),
                smoothingMs: Math.max(0, Math.min(260, Number(this._field('smoothing')?.value) || 0)),
                mouthClarity: Math.max(0.75, Math.min(3.2, (Number(this._field('mouthClarity')?.value) || 145) / 100)),
                showTeeth: this._field('showTeeth')?.checked !== false,
                teethVisibility: Number(this._field('teethVisibility')?.value ?? 60)/100,
                eyeIntensity: Math.max(0, Math.min(1.5, (Number(this._field('eyeIntensity')?.value) || 0) / 100)),
                expressionIntensity: Math.max(0, Math.min(1.5, (Number(this._field('expressionIntensity')?.value) || 0) / 100)),
                headIntensity: Math.max(0, Math.min(1.5, (Number(this._field('headIntensity')?.value) || 0) / 100)),
                handIntensity: Math.max(0, Math.min(1.5, (Number(this._field('handIntensity')?.value) || 0) / 100)),
                handSpeed: Math.max(0.4, Math.min(1.6, (Number(this._field('handSpeed')?.value) || 80) / 100)),
                bodyIntensity: Math.max(0, Math.min(1.5, (Number(this._field('bodyIntensity')?.value) || 0) / 100)),
                deliveryStyle: Object.hasOwn(Runtime.speechStyles, deliveryStyle) ? deliveryStyle : 'natural',
                handPattern: Runtime.handPatterns.includes(handPattern) ? handPattern : 'alternating',
                semanticGestures: mode === 'transcript' && this._field('semanticGestures')?.checked !== false,
                transcript: String(this._field('transcript')?.value || '').trim()
            };
        }

        _extractMonoSamples(buffer, sourceStartMs, sourceEndMs) {
            const sampleRate = buffer.sampleRate || 44100;
            const start = Math.max(0, Math.min(buffer.length, Math.floor(sourceStartMs * sampleRate / 1000)));
            const end = Math.max(start + 1, Math.min(buffer.length, Math.ceil(sourceEndMs * sampleRate / 1000)));
            const channels = Math.max(1, buffer.numberOfChannels || 1);
            const mono = new Float32Array(end - start);
            for (let channel = 0; channel < channels; channel++) {
                const data = buffer.getChannelData(channel);
                for (let index = start; index < end; index++) {
                    mono[index - start] += (data[index] || 0) / channels;
                }
            }
            return { samples: mono, sampleRate };
        }

        analyzeAudioBuffer(buffer, options = {}) {
            if (!buffer) return [];
            const sourceStartMs = Math.max(0, Number(options.sourceStartMs) || 0);
            const sourceEndMs = Math.max(sourceStartMs + 1, Number(options.sourceEndMs) || Math.round(buffer.duration * 1000));
            const { samples, sampleRate } = this._extractMonoSamples(buffer, sourceStartMs, sourceEndMs);
            const frameSize = Math.max(64, Math.round(sampleRate * 0.024));
            const hopSize = Math.max(32, Math.round(sampleRate * 0.020));
            const frames = [];
            let slow = 0;
            let fast = 0;

            for (let offset = 0; offset < samples.length; offset += hopSize) {
                const limit = Math.min(samples.length, offset + frameSize);
                let square = 0;
                let crossings = 0;
                let lowEnergy = 0;
                let highEnergy = 0;
                let previous = samples[offset] || 0;
                for (let index = offset; index < limit; index++) {
                    const sample = samples[index] || 0;
                    square += sample * sample;
                    if ((sample >= 0) !== (previous >= 0)) crossings++;
                    slow += 0.055 * (sample - slow);
                    fast += 0.28 * (sample - fast);
                    const high = sample - fast;
                    const mid = fast - slow;
                    lowEnergy += slow * slow;
                    highEnergy += high * high + mid * mid * 0.35;
                    previous = sample;
                }
                const count = Math.max(1, limit - offset);
                frames.push({
                    timeMs: offset * 1000 / sampleRate,
                    rms: Math.sqrt(square / count),
                    zcr: crossings / count,
                    low: lowEnergy / count,
                    high: highEnergy / count
                });
                if (limit >= samples.length) break;
            }
            if (!frames.length) return [];

            const levels = frames.map(frame => frame.rms).sort((a, b) => a - b);
            const percentile = ratio => levels[Math.min(levels.length - 1, Math.max(0, Math.floor((levels.length - 1) * ratio)))] || 0;
            const noise = percentile(0.18);
            const peak = Math.max(noise + 0.0001, percentile(0.96));
            const threshold = noise + (peak - noise) * 0.10;
            const smoothing = Math.max(0, Math.min(1, Number(options.smoothing) || 0.35));
            let smoothed = 0;
            let previousOpen = 0;
            let previousViseme = 'rest';
            let stableViseme = 'rest';
            let pendingViseme = 'rest';
            let pendingFrames = 0;
            const raw = [];

            // Spectral classifications are sampled every 20 ms. Requiring a
            // short run of agreement prevents adjacent vowel frames from
            // rapidly replacing one another while retaining crisp closures.
            const stabilizeViseme = candidate => {
                if (candidate === stableViseme) {
                    pendingViseme = candidate;
                    pendingFrames = 0;
                    return stableViseme;
                }
                if (candidate !== pendingViseme) {
                    pendingViseme = candidate;
                    pendingFrames = 1;
                } else {
                    pendingFrames++;
                }
                const requiredFrames = candidate === 'MBP' || stableViseme === 'rest'
                    ? 1
                    : (candidate === 'rest' ? 2 : 3);
                if (pendingFrames >= requiredFrames) {
                    stableViseme = candidate;
                    pendingFrames = 0;
                }
                return stableViseme;
            };

            frames.forEach(frame => {
                const normalized = Math.max(0, Math.min(1, (frame.rms - threshold) / Math.max(0.0001, peak - threshold)));
                const attack = normalized > smoothed ? 0.58 : (0.16 + (1 - smoothing) * 0.16);
                smoothed += (normalized - smoothed) * attack;
                let viseme = 'rest';
                if (smoothed > 0.035) {
                    const onset = smoothed - previousOpen;
                    const spectralRatio = frame.high / Math.max(0.0000001, frame.low);
                    if (onset > 0.22 && previousViseme === 'rest') viseme = 'MBP';
                    else if (frame.zcr > 0.19 || spectralRatio > 5.5) viseme = 'FV';
                    else if (spectralRatio > 2.1) viseme = 'E';
                    else if (spectralRatio < 0.58 && smoothed < 0.72) viseme = 'O_U';
                    else if (smoothed > 0.52) viseme = 'A';
                    else viseme = stableViseme === 'rest' ? 'L' : stableViseme;
                }
                viseme = stabilizeViseme(viseme);
                raw.push({
                    startMs: frame.timeMs,
                    endMs: frame.timeMs + (hopSize * 1000 / sampleRate),
                    viseme,
                    strength: viseme === 'rest' ? 0 : Math.max(0.24, Math.min(1.18, smoothed * 1.16))
                });
                previousOpen = smoothed;
                previousViseme = viseme;
            });
            return this._compactCues(raw, sourceEndMs - sourceStartMs);
        }

        _compactCues(rawCues, durationMs) {
            const cues = [];
            (rawCues || []).forEach(raw => {
                const cue = Runtime.normalizeCue(raw, cues.length);
                const previous = cues[cues.length - 1];
                const canMerge = previous
                    && previous.viseme === cue.viseme
                    && cue.startMs - previous.endMs <= 34
                    && cue.endMs - previous.startMs <= (cue.viseme === 'rest' ? 320 : 180);
                if (canMerge) {
                    const previousDuration = previous.endMs - previous.startMs;
                    const cueDuration = cue.endMs - cue.startMs;
                    previous.strength = ((previous.strength * previousDuration) + (cue.strength * cueDuration)) / Math.max(1, previousDuration + cueDuration);
                    previous.endMs = cue.endMs;
                } else {
                    cues.push(cue);
                }
            });
            const cleaned = cues.filter((cue, index) => {
                if (cue.viseme !== 'rest') return true;
                if (cue.endMs - cue.startMs >= 52) return true;
                return index === 0 || index === cues.length - 1;
            });
            if (!cleaned.length || cleaned[0].startMs > 0) cleaned.unshift(Runtime.normalizeCue({ startMs: 0, endMs: Math.min(80, durationMs), viseme: 'rest', strength: 0 }, 0));
            const last = cleaned[cleaned.length - 1];
            if (last.endMs < durationMs) cleaned.push(Runtime.normalizeCue({ startMs: last.endMs, endMs: durationMs, viseme: 'rest', strength: 0 }, cleaned.length));
            return cleaned.map((cue, index) => ({ ...cue, id: `cue-${index}` }));
        }

        parseTimedTranscript(text, durationMs) {
            return Runtime.parseTranscriptSegments(text, durationMs);
        }

        _textToVisemes(text) {
            const normalized = String(text || '').toLowerCase().replace(/[^\p{L}\p{N}' ]+/gu, ' ');
            const tokens = [];
            for (let index = 0; index < normalized.length; index++) {
                const char = normalized[index];
                const pair = normalized.slice(index, index + 2);
                if (/\s/.test(char)) {
                    tokens.push('rest');
                } else if ('mbp'.includes(char)) {
                    tokens.push('MBP');
                } else if ('fv'.includes(char) || pair === 'th' || pair === 'ph') {
                    tokens.push('FV');
                    if (pair === 'th' || pair === 'ph') index++;
                } else if (char === 'l' || 'tdnr'.includes(char)) {
                    tokens.push('L');
                } else if ('eiqy'.includes(char)) {
                    tokens.push('E');
                } else if ('ouw'.includes(char)) {
                    tokens.push('O_U');
                } else if (char === 'a') {
                    tokens.push('A');
                } else {
                    tokens.push(index % 2 ? 'E' : 'L');
                }
            }
            return tokens.filter((token, index) => token !== tokens[index - 1] || token === 'rest');
        }

        alignTranscriptWords(text, durationMs, envelopeCues = []) {
            const duration = Math.max(1, Number(durationMs) || 1);
            const words = String(text || '').match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*[.!?;:]?/gu) || [];
            if (!words.length) return [];
            const voiced = Runtime.normalizeCues(envelopeCues)
                .filter(cue => cue.viseme !== 'rest' && cue.strength > 0.04)
                .map(cue => ({ startMs: Math.max(0, cue.startMs), endMs: Math.min(duration, cue.endMs) }))
                .filter(cue => cue.endMs > cue.startMs);
            if (!voiced.length) return [];
            const spans = [];
            voiced.forEach(cue => {
                const last = spans[spans.length - 1];
                if (last && cue.startMs - last.endMs <= 32) last.endMs = Math.max(last.endMs, cue.endMs);
                else spans.push({ ...cue });
            });
            const spokenMs = spans.reduce((sum, span) => sum + span.endMs - span.startMs, 0);
            if (spokenMs < Math.min(120, duration * 0.16)) return [];
            const weights = words.map(word => {
                const syllables = (word.match(/[aeiouy]+/gi) || []).length;
                return 0.7 + Math.max(1, syllables) * 0.55 + Math.min(12, word.length) * 0.025;
            });
            const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
            const offsets = [0];
            weights.forEach(weight => offsets.push(offsets[offsets.length - 1] + spokenMs * weight / totalWeight));
            const pauseBoundaries = new Map();
            let elapsed = 0;
            const snapRange = Math.min(90, spokenMs / words.length * 0.38);
            spans.slice(0, -1).forEach((span, spanIndex) => {
                elapsed += span.endMs - span.startMs;
                let nearest = -1;
                let distance = snapRange;
                for (let index = 1; index < offsets.length - 1; index++) {
                    const delta = Math.abs(offsets[index] - elapsed);
                    if (delta <= distance) { nearest = index; distance = delta; }
                }
                if (nearest >= 0 && distance < (pauseBoundaries.get(nearest)?.distance ?? Infinity)) {
                    pauseBoundaries.set(nearest, { before: span.endMs, after: spans[spanIndex + 1].startMs, distance });
                }
            });
            const timeAt = (spokenOffset, startBoundary) => {
                let remaining = Math.max(0, Math.min(spokenMs, spokenOffset));
                for (let index = 0; index < spans.length; index++) {
                    const span = spans[index];
                    const length = span.endMs - span.startMs;
                    if (remaining < length || (!startBoundary && remaining <= length) || index === spans.length - 1) {
                        return span.startMs + Math.min(length, remaining);
                    }
                    remaining -= length;
                }
                return spans[spans.length - 1].endMs;
            };
            return words.map((word, index) => {
                const startMs = pauseBoundaries.get(index)?.after ?? timeAt(offsets[index], true);
                const endMs = pauseBoundaries.get(index + 1)?.before ?? timeAt(offsets[index + 1], false);
                return { text: word, startMs: Math.round(startMs), endMs: Math.max(Math.round(startMs) + 1, Math.round(endMs)) };
            });
        }

        buildTranscriptCues(text, durationMs, envelopeCues = []) {
            const timed = this.parseTimedTranscript(text, durationMs);
            const aligned = timed.length ? [] : this.alignTranscriptWords(text, durationMs, envelopeCues);
            const segments = timed.length
                ? timed
                : (aligned.length ? aligned : [{ startMs: 0, endMs: durationMs, text: String(text || '') }]);
            const previousWords = this._wordTimingContextMatches() ? this.draftWordTimings : [];
            this.draftWordTimings = this._withWordIds(timed.length ? timed : aligned, previousWords);
            const cues = [];
            segments.forEach(segment => {
                const tokens = this._textToVisemes(segment.text);
                if (!tokens.length) return;
                const speechTokens = tokens.filter(token => token !== 'rest');
                const voiced = (envelopeCues || []).map(cue => ({
                    ...cue,
                    startMs: Math.max(segment.startMs, cue.startMs),
                    endMs: Math.min(segment.endMs, cue.endMs)
                })).filter(cue => cue.viseme !== 'rest' && cue.endMs > cue.startMs);
                const voicedDuration = voiced.reduce((sum, cue) => sum + (cue.endMs - cue.startMs), 0);
                if (speechTokens.length && voicedDuration > 0) {
                    let consumed = 0;
                    voiced.forEach(envelope => {
                        const span = envelope.endMs - envelope.startMs;
                        const sliceCount = Math.max(1, Math.ceil(span / 90));
                        for (let slice = 0; slice < sliceCount; slice++) {
                            const startMs = envelope.startMs + span * slice / sliceCount;
                            const endMs = envelope.startMs + span * (slice + 1) / sliceCount;
                            const midpoint = consumed + (span * (slice + 0.5) / sliceCount);
                            const tokenIndex = Math.min(speechTokens.length - 1, Math.floor(midpoint / voicedDuration * speechTokens.length));
                            cues.push({
                                startMs,
                                endMs,
                                viseme: speechTokens[tokenIndex],
                                strength: Math.max(0.32, Number(envelope.strength) || 0.72)
                            });
                        }
                        consumed += span;
                    });
                } else {
                    const span = Math.max(1, segment.endMs - segment.startMs);
                    const unit = span / tokens.length;
                    tokens.forEach((viseme, index) => {
                        cues.push({
                            startMs: segment.startMs + unit * index,
                            endMs: segment.startMs + unit * (index + 1),
                            viseme,
                            strength: viseme === 'rest' ? 0 : 0.72
                        });
                    });
                }
            });
            return this._compactCues(cues, durationMs);
        }

        _getTranscriptSegments(settings) {
            if (!settings.semanticGestures) return [];
            const timed = Runtime.parseTranscriptSegments(settings.transcript, settings.duration);
            if (timed.length && !this._recognitionMatches(settings) && !this.wordTimingEdited) return timed;
            const words = this.draftWordTimings || [];
            const sentences = [];
            let current = [];
            words.forEach((word, index) => {
                current.push(word);
                if (/[.!?;:]$/.test(word.text) || index === words.length - 1) {
                    sentences.push({
                        startMs: current[0].startMs,
                        endMs: current[current.length - 1].endMs,
                        text: current.map(item => item.text).join(' ')
                    });
                    current = [];
                }
            });
            return sentences;
        }

        async generateDraft(options = {}) {
            if (!this.context || this.transcriptionRequest) return false;
            this._recordDraftHistory();
            const preservePerformance = options.preservePerformance === true || (this.wordEditsPending && this.performanceDraftEdited);
            if (!this._commitWordEdits()) return false;
            const settings = this._readSettings();
            if (settings.mode === 'transcript' && this.recognition?.transcript === settings.transcript
                && !this._recognitionMatches(settings)) {
                this._setStatus('Audio range or source changed. Transcribe again or replace the timed transcript.', 'warning');
                return false;
            }
            const audio = this.app?.audioTimeline || this.audioTimeline;
            const context = this.context;
            const buffer = audio.audioBuffer;
            const source = this._getWordTimingContext(settings);
            const generationToken = {};
            this._draftGenerationToken = generationToken;
            this._syncDraftHistoryButtons();
            this._setStatus('Analyzing...');
            await new Promise(resolve => setTimeout(resolve, 0));
            if (this._draftGenerationToken !== generationToken || this.context !== context) return false;
            this._draftGenerationToken = null;
            this._syncDraftHistoryButtons();
            const current = this._getWordTimingContext();
            if ((this.app?.audioTimeline || this.audioTimeline) !== audio || audio.audioBuffer !== buffer
                || Object.keys(source).some(key => source[key] !== current[key])) {
                this._setStatus('Audio or transcript changed. Generate cues again.', 'warning');
                return false;
            }
            const envelope = this.analyzeAudioBuffer(buffer, {
                sourceStartMs: settings.sourceStartMs,
                sourceEndMs: settings.sourceEndMs,
                smoothing: 0.35
            });
            this.draftCues = settings.mode === 'transcript' && settings.transcript
                ? this.buildTranscriptCues(settings.transcript, settings.duration, envelope)
                : envelope;
            if (settings.mode !== 'transcript' || !settings.transcript) this.draftWordTimings = [];
            const performancePlan = Runtime.buildPerformancePlan(this.draftCues, settings.duration, {
                transcript: settings.transcript,
                transcriptSegments: this._getTranscriptSegments(settings),
                semanticGestures: settings.semanticGestures,
                deliveryStyle: settings.deliveryStyle
            });
            const authored = this.draftPerformanceEvents.filter(event => event.authored || event.wordAnchor);
            const authoredIds = new Set(authored.map(event => event.id));
            if (!preservePerformance || !this.performanceDraftEdited) {
                this.draftPerformanceEvents = Runtime.normalizeSemanticEvents(
                    [...performancePlan.semanticEvents.filter(event => !authoredIds.has(event.id)), ...authored],
                    settings.duration
                );
                this.performanceDraftEdited = authored.length > 0;
            } else {
                const automatic = new Map(performancePlan.semanticEvents.map(event => [event.id, event]));
                this.draftPerformanceEvents = Runtime.normalizeSemanticEvents(
                    this.draftPerformanceEvents.flatMap(event => event.authored || event.wordAnchor ? [event]
                        : automatic.has(event.id) ? [automatic.get(event.id)] : []),
                    settings.duration
                );
            }
            this.performanceDraftReady = true;
            this._wordTimingContext = this._getWordTimingContext(settings);
            const linksValid = this._retimeWordLinkedPerformance();
            this.draftDirty = false;
            this._renderCueEditor();
            this._setStatus(
                `${this.draftCues.length} mouth cues | ${this.draftPerformanceEvents.length} performance cues${this.draftWordTimings?.length ? ` | ${this.draftWordTimings.length} ${this.wordTimingEdited ? 'edited word timings' : this._recognitionMatches(settings) ? 'recognized word timings' : this.parseTimedTranscript(settings.transcript, settings.duration).length ? 'timed segments' : 'estimated word timings'}` : ''}`,
                'success'
            );
            if (!linksValid) this._setStatus('A gesture needs an available, ordered word range. Relink it or select Manual time.', 'warning');
            this._recordDraftHistory();
            return this.draftCues.length > 0;
        }

        _setDraftEditorMarkup(editor, markup) {
            this._draftRendering = true;
            try {
                // Replacing a focused input can emit change with the old row's values.
                editor.innerHTML = markup;
            } finally {
                this._draftRendering = false;
            }
        }

        _reviewDuration() {
            const settings = this._readSettings();
            return Math.max(1, settings.duration + Math.max(0, settings.offsetMs));
        }

        _setReviewZoom(value) {
            this._reviewZoom = Math.max(1, Math.min(8, value));
            this._renderSpeechReview();
            this._updateReviewCursor(this._reviewTimeMs || 0, true);
        }

        _getReviewWaveform(settings) {
            const buffer = (this.app?.audioTimeline || this.audioTimeline)?.audioBuffer;
            if (!buffer) return [];
            const cached = this._reviewWaveform;
            if (cached?.buffer === buffer && cached.start === settings.sourceStartMs && cached.end === settings.sourceEndMs) return cached.peaks;
            const { samples } = this._extractMonoSamples(buffer, settings.sourceStartMs, settings.sourceEndMs);
            const count = Math.min(2048, samples.length);
            const peaks = Array.from({ length: count }, (_, index) => {
                const start = Math.floor(index * samples.length / count);
                const end = Math.floor((index + 1) * samples.length / count);
                let min = 0;
                let max = 0;
                for (let sample = start; sample < end; sample++) {
                    min = Math.min(min, samples[sample]);
                    max = Math.max(max, samples[sample]);
                }
                return { min, max };
            });
            this._reviewWaveform = { buffer, start: settings.sourceStartMs, end: settings.sourceEndMs, peaks };
            return peaks;
        }

        _renderSpeechReview() {
            if (this.activeCueTab !== 'review' || !this.context || this.modal?.classList.contains('hidden')) return;
            const settings = this._readSettings();
            const duration = this._reviewDuration();
            const scroll = this.modal.querySelector('[data-als-review-scroll]');
            const world = this.modal.querySelector('[data-als-review-world]');
            const zoom = this._reviewZoom || 1;
            const width = Math.max(1, scroll.clientWidth) * zoom;
            const rows = { words: this._wordTimingRows(), mouth: this.draftCues, performance: this.draftPerformanceEvents };
            const stale = this.draftDirty || (this.draftWordTimings?.length && !this._wordTimingContextMatches());
            const canvas = this.modal.querySelector('[data-als-review-waveform]');
            const color = getComputedStyle(canvas).color;
            const audio = this.app?.audioTimeline || this.audioTimeline;
            const layoutKey = JSON.stringify([width, duration, settings.sourceStartMs, settings.sourceEndMs,
                settings.offsetMs, rows, color, this._getMode(), this._getPerformanceMode(), !!stale,
                !!this.wordEditsPending, [...(this.unresolvedPerformanceLinks || [])]]);
            if (this._reviewLayoutKey === layoutKey && this._reviewWaveform?.buffer === audio?.audioBuffer) {
                this._renderReviewSelection();
                this._updateReviewCursor(this._reviewTimeMs || 0);
                return;
            }
            this._reviewLayoutKey = layoutKey;
            world.style.width = `${width}px`;
            const ruler = this.modal.querySelector('[data-als-review-ruler]');
            const ticks = Math.max(2, Math.min(80, Math.floor(width / 90)));
            ruler.innerHTML = Array.from({ length: ticks + 1 }, (_, index) =>
                `<span style="left:${index / ticks * 100}%">${(index / ticks * duration / 1000).toFixed(duration < 10000 ? 2 : 1)}s</span>`).join('');
            const dpr = Math.min(2, global.devicePixelRatio || 1);
            canvas.width = Math.max(1, Math.round(width * dpr));
            canvas.height = Math.round(60 * dpr);
            const ctx = canvas.getContext('2d');
            ctx.scale(dpr, dpr);
            ctx.fillStyle = color;
            const peaks = this._getReviewWaveform(settings);
            const audioWidth = width * settings.duration / duration;
            ctx.globalAlpha = .35;
            ctx.fillRect(0, 30, audioWidth, 1);
            ctx.globalAlpha = 1;
            peaks.forEach((peak, index) => {
                ctx.fillRect(index / peaks.length * audioWidth, 30 - peak.max * 27,
                    Math.max(1, audioWidth / peaks.length), Math.max(1, (peak.max - peak.min) * 27));
            });
            const heights = [];
            for (const [kind, items] of Object.entries(rows)) {
                const lane = this.modal.querySelector(`[data-als-review-lane="${kind}"]`);
                lane.classList.toggle('is-muted', (kind === 'performance' && this._getPerformanceMode() !== 'full')
                    || (kind === 'words' && this._getMode() !== 'transcript'));
                const trackEnds = [];
                const tracks = new Map();
                items.map((item, index) => ({ item, index })).filter(({ item }) =>
                    Number.isFinite(item.startMs) && Number.isFinite(item.endMs) && item.endMs > item.startMs)
                    .sort((a, b) => a.item.startMs - b.item.startMs || a.item.endMs - b.item.endMs)
                    .forEach(({ item, index }) => {
                        const start = Math.max(0, item.startMs + settings.offsetMs);
                        const end = Math.min(duration, item.endMs + settings.offsetMs);
                        if (end <= start) return;
                        let track = trackEnds.findIndex(end => end <= start);
                        if (track < 0) track = trackEnds.length;
                        trackEnds[track] = end;
                        tracks.set(index, track);
                    });
                const stride = kind === 'mouth' ? 28 : 32;
                const height = stride * Math.max(1, Math.min(4, trackEnds.length));
                lane.style.height = `${height}px`;
                lane.style.overflowY = trackEnds.length > 4 ? 'auto' : 'hidden';
                heights.push(height);
                lane.innerHTML = `<div class="als-review-track-stack" style="width:${width}px;height:${stride * Math.max(1, trackEnds.length)}px">${items.map((item, index) => {
                    if (!Number.isFinite(item.startMs) || !Number.isFinite(item.endMs) || item.endMs <= item.startMs) return '';
                    const start = Math.max(0, item.startMs + settings.offsetMs);
                    const end = Math.min(duration, item.endMs + settings.offsetMs);
                    if (end <= start) return '';
                    const label = kind === 'words' ? item.text : kind === 'mouth' ? item.viseme : item.handMode;
                    const title = `${label} | ${(start / 1000).toFixed(3)}-${(end / 1000).toFixed(3)} s`;
                    const unresolved = kind === 'performance' && this.unresolvedPerformanceLinks?.has(item.id);
                    return `<button type="button" class="als-review-marker${unresolved ? ' is-unresolved' : ''}" data-review-kind="${kind}" data-review-id="${this._escapeHtml(item.id || String(index))}" data-review-start="${start}" data-review-end="${end}" style="left:${start / duration * 100}%;width:${(end - start) / duration * 100}%;top:${tracks.get(index) * stride + 3}px;height:${stride - 6}px" title="${this._escapeHtml(title)}" aria-label="Select ${kind} cue ${index + 1}: ${this._escapeHtml(title)}">${this._escapeHtml(label)}</button>`;
                }).join('')}</div>`;
            }
            world.style.height = `${84 + heights.reduce((sum, height) => sum + height, 0)}px`;
            this.modal.querySelector('.als-review-labels').style.gridTemplateRows = `24px 60px ${heights.map(height => `${height}px`).join(' ')}`;
            this._reviewMarkers = [...world.querySelectorAll('[data-review-kind]')];
            this._reviewActiveMarkers = new Set();
            this.modal.querySelector('[data-als-review-zoom]').textContent = `${zoom * 100}%`;
            this.modal.querySelector('[data-als-action="review-zoom-out"]').disabled = zoom <= 1;
            this.modal.querySelector('[data-als-action="review-zoom-in"]').disabled = zoom >= 8;
            this.modal.querySelector('[data-als-review-seek]').max = String(duration);
            const status = this.modal.querySelector('[data-als-review-state]');
            status.textContent = stale ? 'Regenerate cues' : this.wordEditsPending ? 'Word edits pending'
                : this.unresolvedPerformanceLinks?.size ? 'Gesture link needs repair' : 'Cues current';
            status.classList.toggle('is-warning', !!stale || !!this.wordEditsPending || !!this.unresolvedPerformanceLinks?.size);
            this._renderReviewSelection();
            this._updateReviewCursor(this._reviewTimeMs || 0);
        }

        _reviewSelectedItem() {
            const selection = this._reviewSelection;
            if (!selection) return null;
            const items = selection.kind === 'words' ? this._wordTimingRows()
                : selection.kind === 'mouth' ? this.draftCues : this.draftPerformanceEvents;
            const index = items.findIndex((item, index) => String(item.id || index) === selection.id);
            return index < 0 ? null : { kind: selection.kind, index, item: items[index] };
        }

        _selectReviewItem(kind, id) {
            this.stopPreview();
            this._reviewSelection = { kind, id };
            const selected = this._reviewSelectedItem();
            if (!selected) return;
            this._updateReviewCursor(selected.item.startMs + this._readSettings().offsetMs, true);
            this._renderReviewSelection();
        }

        _renderReviewSelection() {
            const node = this.modal?.querySelector('[data-als-review-selection]');
            if (!node) return;
            const selected = this._reviewSelectedItem();
            const disabled = !selected || (selected.kind === 'performance' && this._getPerformanceMode() !== 'full')
                || (selected.kind === 'words' && this._getMode() !== 'transcript');
            const label = selected ? `${selected.kind === 'words' ? selected.item.text : selected.kind === 'mouth' ? selected.item.viseme : selected.item.handMode} | Speech ${(selected.item.startMs / 1000).toFixed(3)}-${(selected.item.endMs / 1000).toFixed(3)} s` : 'No cue selected';
            node.innerHTML = `<span>${this._escapeHtml(label)}</span><button type="button" class="als-icon-btn" data-als-action="review-edit" title="Edit selected cue" aria-label="Edit selected cue"${disabled ? ' disabled' : ''}><i class="fas fa-pen"></i></button>`;
            this._reviewMarkers?.forEach(marker => marker.classList.toggle('is-selected',
                marker.dataset.reviewKind === selected?.kind && marker.dataset.reviewId === this._reviewSelection?.id));
        }

        _openReviewSelection() {
            const selected = this._reviewSelectedItem();
            if (!selected || (selected.kind === 'performance' && this._getPerformanceMode() !== 'full')
                || (selected.kind === 'words' && this._getMode() !== 'transcript')) return;
            this._setCueTab(selected.kind);
            const field = selected.kind === 'words' ? 'word' : selected.kind === 'mouth' ? 'cue' : 'performance';
            const row = this.modal.querySelector(`[data-${field}-index="${selected.index}"]`);
            row?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            row?.querySelector('input, select')?.focus({ preventScroll: true });
        }

        _updateReviewCursor(timeMs, reveal = false) {
            this._reviewTimeMs = Math.max(0, Math.min(this._reviewDuration(), Number(timeMs) || 0));
            if (!this.modal) return;
            const duration = this._reviewDuration();
            const clock = this.modal.querySelector('[data-als-review-clock]');
            clock.textContent = `${(this._reviewTimeMs / 1000).toFixed(3)} s`;
            const settings = this._readSettings();
            clock.title = this._reviewTimeMs > settings.duration ? 'Silent lip-sync tail'
                : `Source ${((settings.sourceStartMs + this._reviewTimeMs) / 1000).toFixed(3)} s`;
            this.modal.querySelector('[data-als-review-seek]').value = String(this._reviewTimeMs);
            this.modal.querySelector('[data-als-review-playhead]').style.left = `${this._reviewTimeMs / duration * 100}%`;
            const active = new Set((this._reviewMarkers || []).filter(marker =>
                this._reviewTimeMs >= Number(marker.dataset.reviewStart) && this._reviewTimeMs < Number(marker.dataset.reviewEnd)));
            this._reviewActiveMarkers?.forEach(marker => { if (!active.has(marker)) marker.classList.remove('is-active'); });
            active.forEach(marker => { if (!this._reviewActiveMarkers?.has(marker)) marker.classList.add('is-active'); });
            this._reviewActiveMarkers = active;
            if (this.activeCueTab === 'review' && (reveal || this.previewFrame)) {
                const scroll = this.modal.querySelector('[data-als-review-scroll]');
                const world = this.modal.querySelector('[data-als-review-world]');
                const x = this._reviewTimeMs / duration * world.clientWidth;
                if (x < scroll.scrollLeft || x > scroll.scrollLeft + scroll.clientWidth - 12) {
                    scroll.scrollLeft = Math.max(0, x - scroll.clientWidth * .25);
                }
            }
        }

        _renderCueStrip() {
            this._renderSpeechReview();
            const strip = this.modal?.querySelector('[data-als-strip]');
            if (!strip) return;
            const duration = Math.max(1, this._readSettings().duration);
            const colors = { rest: '#64748b', MBP: '#ef4444', FV: '#f59e0b', L: '#22c55e', A: '#06b6d4', E: '#3b82f6', O_U: '#a855f7' };
            strip.innerHTML = this.draftCues.map(cue => {
                const left = Math.max(0, Math.min(100, cue.startMs / duration * 100));
                const width = Math.max(0.35, Math.min(100 - left, (cue.endMs - cue.startMs) / duration * 100));
                return `<span style="left:${left}%;width:${width}%;background:${colors[cue.viseme] || colors.rest}" title="${cue.viseme} | ${(cue.startMs / 1000).toFixed(2)}s"></span>`;
            }).join('');
        }

        _renderCueEditor() {
            this._renderWordEditor();
            const editor = this.modal?.querySelector('[data-als-editor]');
            if (!editor) return;
            this._renderCueStrip();
            this._renderPerformanceEditor();
            if (!this.draftCues.length) {
                this._setDraftEditorMarkup(editor, '<div class="als-empty">No cues generated</div>');
                return;
            }
            const visemeOptions = Object.keys(Runtime.visemes).map(viseme => `<option value="${viseme}">${viseme === 'O_U' ? 'O / U' : viseme}</option>`).join('');
            this._setDraftEditorMarkup(editor, `<table>
                <thead><tr><th>Start</th><th>End</th><th>Shape</th><th>Amount</th><th></th></tr></thead>
                <tbody>${this.draftCues.map((cue, index) => `<tr data-cue-index="${index}">
                    <td><input data-cue-field="startMs" type="number" min="0" step="10" value="${Math.round(cue.startMs)}"></td>
                    <td><input data-cue-field="endMs" type="number" min="1" step="10" value="${Math.round(cue.endMs)}"></td>
                    <td><select data-cue-field="viseme">${visemeOptions.replace(`value="${cue.viseme}"`, `value="${cue.viseme}" selected`)}</select></td>
                    <td><input data-cue-field="strength" type="range" min="0" max="150" value="${Math.round(cue.strength * 100)}"><output>${Math.round(cue.strength * 100)}%</output></td>
                    <td><button type="button" class="als-icon-btn" data-cue-remove="${index}" title="Delete cue"><i class="fas fa-times"></i></button></td>
                </tr>`).join('')}</tbody>
            </table>`);
            editor.querySelectorAll('[data-cue-remove]').forEach(button => {
                button.addEventListener('click', () => {
                    this.draftCues.splice(Number(button.dataset.cueRemove), 1);
                    this._renderCueEditor();
                    this._recordDraftHistory();
                });
            });
        }

        _updateCueFromRow(row) {
            const index = Number(row.dataset.cueIndex);
            const cue = this.draftCues[index];
            if (!cue) return;
            row.querySelectorAll('[data-cue-field]').forEach(input => {
                const field = input.dataset.cueField;
                if (field === 'viseme') cue.viseme = Runtime.normalizeViseme(input.value);
                else if (field === 'strength') {
                    cue.strength = Math.max(0, Math.min(1.5, Number(input.value) / 100));
                    if (input.nextElementSibling) input.nextElementSibling.textContent = `${Math.round(cue.strength * 100)}%`;
                } else cue[field] = Math.max(0, Number(input.value) || 0);
            });
            if (cue.endMs <= cue.startMs) cue.endMs = cue.startMs + 24;
            this.draftDirty = false;
            this._renderCueStrip();
        }

        _withWordIds(words = [], previous = []) {
            const used = new Set();
            return words.map((word, index) => {
                let id = typeof word.id === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(word.id) ? word.id : '';
                if (!id && previous?.[index]?.text === word.text) id = previous[index].id || '';
                if (!id || used.has(id)) {
                    do {
                        this._wordIdCounter = (this._wordIdCounter || 0) + 1;
                        id = `speech-word-${Date.now().toString(36)}-${this._wordIdCounter}`;
                    } while (used.has(id));
                }
                used.add(id);
                return { ...word, id };
            });
        }

        _getWordTimingContext(settings = this._readSettings()) {
            const audio = this.app?.audioTimeline || this.audioTimeline;
            return {
                audioId: String(audio?.audioId || ''), audioRevision: Number(audio?.audioRevision || 1),
                sourceStartMs: settings.sourceStartMs, sourceEndMs: settings.sourceEndMs,
                transcript: settings.transcript, mode: settings.mode
            };
        }

        _wordTimingContextMatches() {
            const current = this._getWordTimingContext();
            return !!this._wordTimingContext && Object.keys(current).every(key => current[key] === this._wordTimingContext[key]);
        }

        _wordTimingRows() {
            return this.wordTimingEdits || this.draftWordTimings || [];
        }

        _renderWordEditor() {
            this._renderSpeechReview();
            const editor = this.modal?.querySelector('[data-als-word-editor]');
            if (!editor) return;
            const discard = this.modal.querySelector('[data-als-action="discard-words"]');
            if (discard) discard.disabled = !this.wordEditsPending;
            const words = this._wordTimingRows();
            if (!words.length) {
                this._setDraftEditorMarkup(editor, '<div class="als-empty">No timed words</div>');
                return;
            }
            this._setDraftEditorMarkup(editor, `<table class="als-word-table">
                <thead><tr><th>Text</th><th>Start (ms)</th><th>End (ms)</th><th></th></tr></thead>
                <tbody>${words.map((word, index) => `<tr data-word-index="${index}">
                    <td><input type="text" data-word-field="text" aria-label="Text for segment ${index + 1}" maxlength="500" value="${this._escapeHtml(word.text)}"></td>
                    <td><input type="number" data-word-field="startMs" aria-label="Start for segment ${index + 1} in milliseconds" min="0" step="10" value="${Number.isFinite(word.startMs) ? Math.round(word.startMs) : ''}"></td>
                    <td><input type="number" data-word-field="endMs" aria-label="End for segment ${index + 1} in milliseconds" min="1" step="10" value="${Number.isFinite(word.endMs) ? Math.round(word.endMs) : ''}"></td>
                    <td><div class="als-performance-cue-actions">
                        <button type="button" class="als-icon-btn" data-word-link="${index}" title="Add a gesture linked to this segment (Full performance)" aria-label="Add a gesture linked to segment ${index + 1}"${this._getPerformanceMode() !== 'full' ? ' disabled' : ''}><i class="fas fa-link"></i></button>
                        <button type="button" class="als-icon-btn" data-word-preview="${index}" title="Play this segment" aria-label="Play segment ${index + 1}"><i class="fas fa-play"></i></button>
                        <button type="button" class="als-icon-btn" data-word-remove="${index}" title="Delete this segment" aria-label="Delete segment ${index + 1}"><i class="fas fa-times"></i></button>
                    </div></td>
                </tr>`).join('')}</tbody>
            </table>`);
        }

        _updateWordFromRow(row) {
            const index = Number(row.dataset.wordIndex);
            if (!this._wordTimingRows()[index]) return;
            this.stopPreview();
            if (!this.wordTimingEdits) this.wordTimingEdits = this._wordTimingRows().map(word => ({ ...word }));
            row.querySelectorAll('[data-word-field]').forEach(input => {
                const field = input.dataset.wordField;
                this.wordTimingEdits[index][field] = field === 'text' ? input.value
                    : input.value === '' ? NaN : Number(input.value);
                input.removeAttribute('aria-invalid');
            });
            this.wordEditsPending = true;
            const discard = this.modal?.querySelector('[data-als-action="discard-words"]');
            if (discard) discard.disabled = false;
            this._setStatus('Word edits pending');
        }

        _addWord() {
            if (this.transcriptionRequest) return;
            if (this._getMode() !== 'transcript') this._setMode('transcript');
            const words = this._wordTimingRows();
            if (!words.length && !this.wordEditsPending) this._wordTimingContext = this._getWordTimingContext();
            if (!this._wordTimingContextMatches()) {
                this._setStatus('Audio or transcript changed. Generate cues before editing words.', 'warning');
                return;
            }
            const duration = this._readSettings().duration;
            const startMs = words.length ? Number(words[words.length - 1].endMs) + 40 : 0;
            if (!Number.isFinite(startMs) || duration - startMs < 20) {
                this._setStatus('No room after the last segment. Adjust its end time first.', 'warning');
                return;
            }
            this.stopPreview();
            this.wordTimingEdits = words.map(word => ({ ...word }));
            this.wordTimingEdits.push(this._withWordIds([{ text: 'Word', startMs, endMs: Math.min(duration, startMs + 400) }])[0]);
            this.wordEditsPending = true;
            this._renderWordEditor();
            const field = this.modal?.querySelector('[data-als-word-editor] tr:last-child [data-word-field="text"]');
            field?.focus();
            field?.select();
            this._setStatus('Word edits pending');
            this._recordDraftHistory();
        }

        _commitWordEdits() {
            if (!this.wordEditsPending) return true;
            if (!this._wordTimingContextMatches()) {
                this._setStatus('Audio or transcript changed. Discard word edits and generate cues again.', 'warning');
                return false;
            }
            const words = this._wordTimingRows();
            const duration = this._readSettings().duration;
            let cursor = 0;
            const invalid = words.findIndex(word => {
                const text = String(word.text || '').trim();
                const valid = text.length > 0 && text.length <= 500 && Number.isFinite(word.startMs)
                    && Number.isFinite(word.endMs) && word.startMs >= cursor && word.startMs >= 0
                    && word.endMs > word.startMs && word.endMs <= duration;
                cursor = word.endMs;
                return !valid;
            });
            if (!words.length || invalid >= 0) {
                this.modal?.querySelectorAll(`[data-word-index="${invalid}"] input`).forEach(input => input.setAttribute('aria-invalid', 'true'));
                this._setStatus(!words.length ? 'Add at least one timed segment.'
                    : `Segment ${invalid + 1} needs text and non-overlapping start/end times within the selected range.`, 'error');
                this._setCueTab('words');
                return false;
            }
            this.stopPreview();
            const transcript = JSON.stringify(words.map(word => ({
                id: word.id, text: word.text.trim(), startMs: word.startMs, endMs: word.endMs
            })), null, 2);
            if (this._recognitionMatches(this._readSettings())) this.recognition = { ...this.recognition, transcript, edited: true };
            this._field('transcript').value = transcript;
            this.wordTimingEdited = true;
            this.wordTimingEdits = null;
            this.wordEditsPending = false;
            this.draftDirty = true;
            return true;
        }

        _getWordPreviewRange(index, durationMs, offsetMs = 0) {
            const word = this.draftWordTimings?.[index];
            if (!word) return null;
            const startMs = Math.max(0, -offsetMs, word.startMs - 120);
            const endMs = Math.min(durationMs, durationMs - offsetMs, word.endMs + 180);
            return endMs > startMs ? { kind: 'word', index, startMs, endMs } : null;
        }

        _previewWord(index) {
            if (!this._wordTimingRows()[index]) return false;
            if (!this._wordTimingContextMatches()) {
                this._setStatus('Audio or transcript changed. Generate cues before playing words.', 'warning');
                return false;
            }
            return this.previewDraft({ wordIndex: index });
        }

        _retimeWordLinkedPerformance() {
            const result = Runtime.retimeWordLinkedEvents(this.draftPerformanceEvents, this.draftWordTimings, this._readSettings().duration);
            this.draftPerformanceEvents = result.events;
            this.unresolvedPerformanceLinks = new Set(result.unresolvedIds);
            if (this.draftPerformanceEvents.some(event => event.wordAnchor) && !this._wordTimingContextMatches()) {
                this.draftPerformanceEvents.filter(event => event.wordAnchor).forEach(event => this.unresolvedPerformanceLinks.add(event.id));
            }
            return this.unresolvedPerformanceLinks.size === 0;
        }

        _validatePerformanceLinks() {
            if (this._getPerformanceMode() !== 'full') return true;
            if (this._retimeWordLinkedPerformance()) return true;
            this._renderPerformanceEditor();
            this._setCueTab('performance');
            this._setStatus('A gesture needs an available, ordered word range. Relink it or select Manual time.', 'warning');
            return false;
        }

        async _addWordLinkedPerformanceCue(index) {
            const wordId = this._wordTimingRows()[index]?.id;
            if (!wordId || this._getPerformanceMode() !== 'full') return false;
            if (!this._wordTimingContextMatches()) {
                this._setStatus('Audio or transcript changed. Generate cues before linking gestures.', 'warning');
                return false;
            }
            if (this.wordEditsPending || this.draftDirty) {
                if (!await this.generateDraft({ preservePerformance: true })) return false;
            }
            if (!this.draftWordTimings.some(word => word.id === wordId)) return false;
            this._addPerformanceCue({ wordAnchor: { startWordId: wordId, endWordId: wordId, offsetMs: 0 } });
            return true;
        }

        _renderPerformanceStrip() {
            this._renderSpeechReview();
            const strip = this.modal?.querySelector('[data-als-performance-strip]');
            if (!strip) return;
            const duration = Math.max(1, this._readSettings().duration);
            const colors = {
                question: '#38bdf8', negative: '#ef4444', greeting: '#34d399', gratitude: '#22c55e',
                enumeration: '#f59e0b', deictic: '#8b5cf6', contrast: '#ec4899', inclusive: '#14b8a6',
                affirmation: '#84cc16', emphasis: '#f97316', statement: '#64748b'
            };
            strip.innerHTML = this.draftPerformanceEvents.map((event, index) => {
                const left = Math.max(0, Math.min(100, event.startMs / duration * 100));
                const width = Math.max(0.55, Math.min(100 - left, (event.endMs - event.startMs) / duration * 100));
                const title = `${event.kind} | ${event.expression} | ${(event.startMs / 1000).toFixed(2)}s | ${event.handMode}`;
                return `<button type="button" data-performance-preview="${index}" style="left:${left}%;width:${width}%;background:${colors[event.kind] || colors.statement}" title="Preview ${this._escapeHtml(title)}" aria-label="Preview performance cue ${index + 1}: ${this._escapeHtml(title)}"></button>`;
            }).join('');
        }

        _renderPerformanceEditor() {
            const editor = this.modal?.querySelector('[data-als-performance-editor]');
            if (!editor) return;
            this._retimeWordLinkedPerformance();
            this._renderPerformanceStrip();
            if (!this.draftPerformanceEvents.length) {
                this._setDraftEditorMarkup(editor, '<div class="als-empty">No performance cues</div>');
                return;
            }
            const kindLabels = {
                statement: 'Statement', question: 'Question', negative: 'Negative', greeting: 'Greeting',
                gratitude: 'Gratitude', enumeration: 'Enumeration', deictic: 'Point / Show', contrast: 'Contrast',
                inclusive: 'Inclusive', affirmation: 'Affirmation', emphasis: 'Emphasis'
            };
            const modeLabels = {
                beat: 'Beat', single: 'Single hand', both: 'Both hands', open: 'Open palms',
                point: 'Point', count: 'Count', contrast: 'Contrast', wave: 'Wave',
                'thumbs-up': 'Thumbs up', present: 'Present / offer', shrug: 'Shrug',
                'hands-on-hips': 'Hands on hips', 'arms-crossed': 'Arms crossed',
                prayer: 'Prayer / thanks', celebrate: 'Celebrate', none: 'No hands'
            };
            const expressionLabels = {
                neutral: 'Neutral', warm: 'Warm', confident: 'Confident', excited: 'Excited',
                serious: 'Serious', concerned: 'Concerned', thoughtful: 'Thoughtful', curious: 'Curious',
                focused: 'Focused', skeptical: 'Skeptical', firm: 'Firm'
            };
            const optionMarkup = (entries, selected) => Object.entries(entries).map(([value, label]) => (
                `<option value="${value}"${value === selected ? ' selected' : ''}>${label}</option>`
            )).join('');
            const wordOptions = selected => {
                const words = this.draftWordTimings || [];
                const missing = selected && !words.some(word => word.id === selected);
                return `${missing ? `<option value="${this._escapeHtml(selected)}" selected>Missing segment</option>` : ''}${words.map((word, index) =>
                    `<option value="${this._escapeHtml(word.id)}"${word.id === selected ? ' selected' : ''} title="${this._escapeHtml(word.text)}">${index + 1}. ${this._escapeHtml(word.text.slice(0, 48))}</option>`).join('')}`;
            };
            this._setDraftEditorMarkup(editor, `<table class="als-performance-cue-table">
                <thead><tr><th>Timing</th><th>Start</th><th>End</th><th>Shift (ms)</th><th>Intent</th><th>Mood</th><th>Gesture</th><th>Arm</th><th>Amount</th><th></th></tr></thead>
                <tbody>${this.draftPerformanceEvents.map((event, index) => `<tr data-performance-index="${index}" class="${this.unresolvedPerformanceLinks.has(event.id) ? 'is-unresolved' : ''}" title="${this._escapeHtml(event.text || 'Custom performance cue')}">
                    <td><select data-performance-field="timingMode" aria-label="Gesture timing"><option value="manual"${!event.wordAnchor ? ' selected' : ''}>Manual time</option><option value="words"${event.wordAnchor ? ' selected' : ''}${!this.draftWordTimings?.length ? ' disabled' : ''}>Linked words</option></select></td>
                    <td>${event.wordAnchor ? `<select data-performance-field="startWordId" aria-label="First linked segment">${wordOptions(event.wordAnchor.startWordId)}</select>` : `<input data-performance-field="startMs" title="Start time in milliseconds" type="number" min="0" step="10" value="${Math.round(event.startMs)}">`}</td>
                    <td>${event.wordAnchor ? `<select data-performance-field="endWordId" aria-label="Last linked segment">${wordOptions(event.wordAnchor.endWordId)}</select>` : `<input data-performance-field="endMs" title="End time in milliseconds" type="number" min="1" step="10" value="${Math.round(event.endMs)}">`}</td>
                    <td><input data-performance-field="anchorOffsetMs" aria-label="Gesture shift in milliseconds" title="Negative values lead the linked speech; positive values follow it" type="number" min="-5000" max="5000" step="10" value="${event.wordAnchor?.offsetMs || 0}"${!event.wordAnchor ? ' disabled' : ''}></td>
                    <td><select data-performance-field="kind">${optionMarkup(kindLabels, event.kind)}</select></td>
                    <td><select data-performance-field="expression">${optionMarkup(expressionLabels, Runtime.normalizeEmotion(event.expression, event.kind))}</select></td>
                    <td><select data-performance-field="handMode">${optionMarkup(modeLabels, event.handMode)}</select></td>
                    <td><select data-performance-field="direction" title="Arm used by one-arm gestures"${Runtime.bilateralHandModes.includes(event.handMode) || event.handMode === 'none' ? ' disabled' : ''}><option value="1"${event.direction >= 0 ? ' selected' : ''}>Right arm</option><option value="-1"${event.direction < 0 ? ' selected' : ''}>Left arm</option></select></td>
                    <td><input data-performance-field="strength" type="range" min="0" max="150" value="${Math.round(event.strength * 100)}"><output>${Math.round(event.strength * 100)}%</output></td>
                    <td><div class="als-performance-cue-actions">
                        <button type="button" class="als-icon-btn" data-performance-preview="${index}" title="Preview this performance cue"><i class="fas fa-play"></i></button>
                        <button type="button" class="als-icon-btn" data-performance-remove="${index}" title="Delete performance cue"><i class="fas fa-times"></i></button>
                    </div></td>
                </tr>`).join('')}</tbody>
            </table>`);
            editor.querySelectorAll('[data-performance-remove]').forEach(button => {
                button.addEventListener('click', () => {
                    this.draftPerformanceEvents.splice(Number(button.dataset.performanceRemove), 1);
                    this.performanceDraftReady = true;
                    this.performanceDraftEdited = true;
                    this._renderPerformanceEditor();
                    this._recordDraftHistory();
                });
            });
        }

        _addPerformanceCue(options = {}) {
            if (this._getMode() !== 'transcript') this._setMode('transcript');
            const semanticField = this._field('semanticGestures');
            if (semanticField) semanticField.checked = true;
            const duration = Math.max(1, this._readSettings().duration);
            const span = Math.min(900, Math.max(120, duration * 0.16));
            const last = this.draftPerformanceEvents[this.draftPerformanceEvents.length - 1];
            const startMs = Math.max(0, Math.min(duration - span, last ? last.endMs + 120 : duration * 0.24));
            const profile = Runtime.getSemanticProfile('emphasis');
            this._performanceCueCounter = (this._performanceCueCounter || 0) + 1;
            const id = `semantic-custom-${Date.now()}-${this._performanceCueCounter}`;
            this.draftPerformanceEvents.push(Runtime.normalizeSemanticEvent({
                id,
                text: 'Custom emphasis',
                authored: true,
                startMs,
                endMs: Math.min(duration, startMs + span),
                timeMs: Math.min(duration, startMs + span * 0.48),
                direction: this.draftPerformanceEvents.length % 2 === 0 ? 1 : -1,
                strength: 0.78,
                wordAnchor: options.wordAnchor || null,
                ...profile
            }, this.draftPerformanceEvents.length, duration));
            this.draftPerformanceEvents.sort((left, right) => left.startMs - right.startMs);
            this.performanceDraftReady = true;
            this.performanceDraftEdited = true;
            this._renderPerformanceEditor();
            this._setCueTab('performance');
            const index = this.draftPerformanceEvents.findIndex(event => event.id === id);
            const field = options.wordAnchor ? 'startWordId' : 'startMs';
            this.modal?.querySelector(`[data-performance-index="${index}"] [data-performance-field="${field}"]`)?.focus();
            const editor = this.modal?.querySelector('[data-als-performance-editor]');
            if (editor) editor.scrollLeft = 0;
            this._recordDraftHistory();
        }

        _updatePerformanceCueFromRow(row, changedInput = null) {
            const index = Number(row.dataset.performanceIndex);
            const current = this.draftPerformanceEvents[index];
            if (!current) return;
            const changedField = changedInput?.dataset?.performanceField;
            const linkFields = ['timingMode', 'startWordId', 'endWordId', 'anchorOffsetMs'];
            if (linkFields.includes(changedField)) {
                if (!(changedField === 'timingMode' && changedInput.value === 'manual')
                    && (this.wordEditsPending || !this._wordTimingContextMatches() || !this.draftWordTimings?.length)) {
                    this._renderPerformanceEditor();
                    this._setStatus('Generate the current word draft before linking gestures.', 'warning');
                    return;
                }
                const updated = { ...current, authored: true };
                if (changedField === 'timingMode') {
                    if (changedInput.value === 'manual') updated.wordAnchor = null;
                    else {
                        const nearest = this.draftWordTimings.reduce((best, word) =>
                            Math.abs((word.startMs + word.endMs) * .5 - current.timeMs)
                                < Math.abs((best.startMs + best.endMs) * .5 - current.timeMs) ? word : best);
                        updated.wordAnchor = { startWordId: nearest.id, endWordId: nearest.id, offsetMs: 0 };
                    }
                } else if (current.wordAnchor) {
                    updated.wordAnchor = { ...current.wordAnchor, [changedField === 'anchorOffsetMs' ? 'offsetMs' : changedField]:
                        changedField === 'anchorOffsetMs' ? Number(changedInput.value) || 0 : changedInput.value };
                }
                this.draftPerformanceEvents[index] = Runtime.normalizeSemanticEvent(updated, index, this._readSettings().duration);
                this.performanceDraftReady = true;
                this.performanceDraftEdited = true;
                const valid = this._retimeWordLinkedPerformance();
                if (changedField === 'anchorOffsetMs') {
                    row.classList.toggle('is-unresolved', this.unresolvedPerformanceLinks.has(updated.id));
                    this._renderPerformanceStrip();
                } else {
                    this._renderPerformanceEditor();
                    this.modal?.querySelector(`[data-performance-index="${index}"] [data-performance-field="${changedField}"]`)?.focus();
                }
                this._setStatus(valid ? 'Gesture timing updated' : 'Select an available, ordered word range.', valid ? '' : 'warning');
                return;
            }
            const updated = { ...current };
            updated.authored = true;
            row.querySelectorAll('[data-performance-field]').forEach(input => {
                const field = input.dataset.performanceField;
                if (linkFields.includes(field)) return;
                if (field === 'strength') {
                    updated.strength = Math.max(0, Math.min(1.5, Number(input.value) / 100));
                    if (input.nextElementSibling) input.nextElementSibling.textContent = `${Math.round(updated.strength * 100)}%`;
                } else if (field === 'direction') {
                    updated.direction = Number(input.value) < 0 ? -1 : 1;
                } else if (field === 'startMs' || field === 'endMs') {
                    updated[field] = Math.max(field === 'endMs' ? 1 : 0, Number(input.value) || 0);
                } else {
                    updated[field] = String(input.value || '');
                }
            });
            if (updated.endMs <= updated.startMs) updated.endMs = updated.startMs + 24;
            updated.timeMs = updated.startMs + (updated.endMs - updated.startMs) * 0.48;
            const directionField = row.querySelector('[data-performance-field="direction"]');
            if (directionField) {
                directionField.disabled = Runtime.bilateralHandModes.includes(updated.handMode)
                    || updated.handMode === 'none';
            }
            const duration = Math.max(1, this._readSettings().duration);
            const profile = Runtime.getSemanticProfile(updated.kind);
            updated.headMode = profile.headMode;
            if (changedInput?.dataset?.performanceField === 'kind' || !updated.expression) {
                updated.expression = profile.expression;
                const expressionField = row.querySelector('[data-performance-field="expression"]');
                if (expressionField) expressionField.value = updated.expression;
            }
            this.draftPerformanceEvents[index] = Runtime.normalizeSemanticEvent(updated, index, duration);
            this._retimeWordLinkedPerformance();
            this.performanceDraftReady = true;
            this.performanceDraftEdited = true;
            this._renderPerformanceStrip();
        }

        _getPerformanceCuePreviewRange(index, durationMs) {
            const event = this.draftPerformanceEvents[Number(index)];
            if (!event) return null;
            const duration = Math.max(1, Number(durationMs) || Number(event.endMs) || 1);
            const startMs = Math.max(0, Math.min(duration, Number(event.startMs) - 360));
            const endMs = Math.max(
                startMs + 1,
                Math.min(duration, Math.max(Number(event.endMs) + 440, startMs + 900))
            );
            return { index: Number(index), startMs, endMs };
        }

        _previewPerformanceCue(index) {
            if (!this.draftPerformanceEvents[Number(index)]) return false;
            return this.previewDraft({ performanceIndex: Number(index) });
        }

        _buildUniversalTargets(context) {
            return (context.universalTargets || []).map(({ head, mouth, variantKey }) => ({
                objectId: mouth.id,
                headId: head.id,
                variantKey,
                eyes: Object.entries(head._facialFeatures || {})
                    .filter(([key]) => key.startsWith('eye-'))
                    .map(([key, objectId]) => ({
                        objectId,
                        variant: key.includes('left') ? 'left' : 'right'
                    })),
                brows: Object.entries(head._facialFeatures || {})
                    .filter(([key]) => key.startsWith('brow-'))
                    .map(([key, objectId]) => ({
                        objectId,
                        variant: key.includes('left') ? 'left' : 'right'
                    }))
            }));
        }

        _ensureUniversalTargetDrawContext(target) {
            const system = this.app?.jointSystem || this.jointSystem;
            const head = this.objects?.getObjectById?.(target?.headId);
            if (!head || !system) return null;
            if (head._facialProportions?.layoutVersion < 2 || !head._facialProportions?.layoutVersion) {
                const parent = this.objects?.getObjectById?.(head.pinnedTo);
                const pool = parent ? (this.objects?.objects || []).filter(obj => obj?.id === parent.id || obj?.pinnedTo === parent.id) : [];
                const rig = pool.length >= 3 ? system._detectArmatureFromPool?.(pool) : null;
                system._ucRepairGeneratedFaceLayout?.(rig, head);
            }
            const current = head._facialDrawCtx;
            const hasCharacterData = typeof current?.view === 'string';
            if (system._ucHasValidFacialDrawContext?.(current)
                || (!system._ucHasValidFacialDrawContext && hasCharacterData)) {
                return current;
            }

            const root = head.pinnedTo ? this.objects?.getObjectById?.(head.pinnedTo) : null;
            const pool = root
                ? (this.objects?.objects || []).filter(obj => obj?.id === root.id || obj?.pinnedTo === root.id)
                : [];
            const armature = pool.length >= 3 ? system._detectArmatureFromPool?.(pool) : null;
            return system._ucRepairFacialDrawContext?.(armature, head)
                || (hasCharacterData ? current : null);
        }

        _renderUniversalTargetSources(target, mouthOpeningGain = 1.45) {
            const system = this.app?.jointSystem || this.jointSystem;
            const stateNames = { rest: 'neutral', MBP: 'viseme-mbp', FV: 'viseme-fv', L: 'viseme-l', A: 'viseme-a', E: 'viseme-e', O_U: 'viseme-o' };
            const head = this.objects?.getObjectById?.(target?.headId);
            const mouth = this.objects?.getObjectById?.(target?.objectId);
            const drawContext = this._ensureUniversalTargetDrawContext(target);
            if (!head || !mouth || !drawContext) return target?.sources || {};
            const openingGain = Math.max(0.75, Math.min(3.2, Number(mouthOpeningGain) || 1.45));
            const d = { ...drawContext, _lipSyncMouthOpening: openingGain };
            const fsc = Number.isFinite(head._facialProportions?.faceScale) ? head._facialProportions.faceScale : 1;
            const baseStyleSignature = system?._ucGetFacialRenderStyleSignature?.(d, fsc) || String(target.variantKey || head.id);
            const styleSignature = `${baseStyleSignature}:mouth-opening-${openingGain.toFixed(2)}`;
            const cacheKey = `${head.id}:${mouth.id}:${mouth.width || 0}x${mouth.height || 0}:${styleSignature}`;
            if (this.universalSourceCache.has(cacheKey)) return this.universalSourceCache.get(cacheKey);
            const sources = {};
            Object.entries(stateNames).forEach(([viseme, state]) => {
                sources[viseme] = system?._ucGetOrRenderFacialFeatureDataUrl?.(
                    head,
                    mouth,
                    { type: 'mouth', state },
                    d,
                    fsc,
                    styleSignature
                ) || mouth.imageSrc;
            });
            Object.values(sources).forEach(source => this._preloadImage(source));
            this.universalSourceCache.set(cacheKey, sources);
            return sources;
        }

        _renderUniversalMouthFrameSource(target, frame, mouthOpeningGain = 1.45) {
            const descriptor = frame?.key && frame?.channels
                ? frame
                : Runtime.getUniversalMouthFrame(frame, mouthOpeningGain);
            const sources = target?.sources && Object.keys(target.sources).length
                ? target.sources
                : this._renderUniversalTargetSources(target, mouthOpeningGain);
            if (!descriptor.active) return sources?.rest || '';
            if (target?.frameSources?.[descriptor.key]) return target.frameSources[descriptor.key];

            const system = this.app?.jointSystem || this.jointSystem;
            const head = this.objects?.getObjectById?.(target?.headId);
            const mouth = this.objects?.getObjectById?.(target?.objectId);
            const drawContext = this._ensureUniversalTargetDrawContext(target);
            if (!head || !mouth || !drawContext || !system) {
                return sources?.[descriptor.viseme] || sources?.rest || '';
            }

            const openingGain = Math.max(0.75, Math.min(3.2, Number(mouthOpeningGain) || 1.45));
            const d = {
                ...drawContext,
                _lipSyncMouthOpening: openingGain,
                _lipSyncMouthChannels: descriptor.channels,
                _lipSyncViseme: descriptor.viseme
            };
            const fsc = Number.isFinite(head._facialProportions?.faceScale) ? head._facialProportions.faceScale : 1;
            const baseStyleSignature = system._ucGetFacialRenderStyleSignature?.(d, fsc) || String(target.variantKey || head.id);
            const styleSignature = `${baseStyleSignature}:coarticulation-${descriptor.key}`;
            const cacheKey = `mouth-frame:${head.id}:${mouth.id}:${mouth.width || 0}x${mouth.height || 0}:${styleSignature}`;
            if (!(this.universalSourceCache instanceof Map)) this.universalSourceCache = new Map();
            if (this.universalSourceCache.has(cacheKey)) return this.universalSourceCache.get(cacheKey);
            const source = system._ucGetOrRenderFacialFeatureDataUrl?.(
                head,
                mouth,
                { type: 'mouth', state: 'lip-sync-frame' },
                d,
                fsc,
                styleSignature
            ) || sources?.[descriptor.viseme] || sources?.rest || mouth.imageSrc || '';
            if (source) {
                this.universalSourceCache.set(cacheKey, source);
                this._preloadImage(source);
            }
            return source;
        }

        _renderUniversalMouthFrameSources(target, config = {}, frames = null) {
            const frameSources = {};
            const descriptors = Array.isArray(frames) ? frames : Runtime.collectUniversalMouthFrames(config);
            descriptors.forEach(frame => {
                const source = this._renderUniversalMouthFrameSource(
                    target,
                    frame,
                    config.mouthOpeningGain ?? config.svgMouthGain ?? 1.45
                );
                if (source) frameSources[frame.key] = source;
            });
            return frameSources;
        }

        _getUniversalVisemeSource(target, frameOrViseme, mouthOpeningGain = 1.45) {
            if (frameOrViseme && typeof frameOrViseme === 'object') {
                return this._renderUniversalMouthFrameSource(target, frameOrViseme, mouthOpeningGain);
            }
            const sources = target?.sources && Object.keys(target.sources).length
                ? target.sources
                : this._renderUniversalTargetSources(target, mouthOpeningGain);
            return sources?.[frameOrViseme] || sources?.rest || '';
        }

        _renderUniversalEyeSources(target, eyeTarget) {
            const system = this.app?.jointSystem || this.jointSystem;
            const head = this.objects?.getObjectById?.(target?.headId);
            const eye = this.objects?.getObjectById?.(eyeTarget?.objectId);
            const d = this._ensureUniversalTargetDrawContext(target);
            if (!head || !eye || !d) return eyeTarget?.sources || {};
            const fsc = Number.isFinite(head._facialProportions?.faceScale) ? head._facialProportions.faceScale : 1;
            const styleSignature = system?._ucGetFacialRenderStyleSignature?.(d, fsc) || String(target.variantKey || head.id);
            const variant = eyeTarget.variant || 'left';
            const cacheKey = `eye:${head.id}:${eye.id}:${eye.width || 0}x${eye.height || 0}:${variant}:${styleSignature}`;
            if (this.universalSourceCache.has(cacheKey)) return this.universalSourceCache.get(cacheKey);
            const sources = {};
            [
                'open', 'closed',
                'speech-left', 'speech-right', 'speech-up', 'speech-down'
            ].forEach(state => {
                sources[state] = system?._ucGetOrRenderFacialFeatureDataUrl?.(
                    head,
                    eye,
                    { type: 'eye', state, variant },
                    d,
                    fsc,
                    styleSignature
                ) || eye.imageSrc;
            });
            Object.values(sources).forEach(source => this._preloadImage(source));
            this.universalSourceCache.set(cacheKey, sources);
            return sources;
        }

        _getUniversalEyeSource(target, eyeTarget, state) {
            const sources = eyeTarget?.sources && Object.keys(eyeTarget.sources).length
                ? eyeTarget.sources
                : this._renderUniversalEyeSources(target, eyeTarget);
            return sources?.[state] || sources?.open || '';
        }

        _renderUniversalBrowSources(target, browTarget) {
            const system = this.app?.jointSystem || this.jointSystem;
            const head = this.objects?.getObjectById?.(target?.headId);
            const brow = this.objects?.getObjectById?.(browTarget?.objectId);
            const d = this._ensureUniversalTargetDrawContext(target);
            if (!head || !brow || !d) return browTarget?.sources || {};
            const fsc = Number.isFinite(head._facialProportions?.faceScale) ? head._facialProportions.faceScale : 1;
            const styleSignature = system?._ucGetFacialRenderStyleSignature?.(d, fsc) || String(target.variantKey || head.id);
            const variant = browTarget.variant || 'left';
            const cacheKey = `brow:${head.id}:${brow.id}:${brow.width || 0}x${brow.height || 0}:${variant}:${styleSignature}`;
            if (this.universalSourceCache.has(cacheKey)) return this.universalSourceCache.get(cacheKey);
            const sources = {};
            ['neutral', 'raised', 'lowered', 'skeptical-high', 'skeptical-low'].forEach(state => {
                sources[state] = system?._ucGetOrRenderFacialFeatureDataUrl?.(
                    head,
                    brow,
                    { type: 'brow', state, variant },
                    d,
                    fsc,
                    styleSignature
                ) || brow.imageSrc;
            });
            Object.values(sources).forEach(source => this._preloadImage(source));
            this.universalSourceCache.set(cacheKey, sources);
            return sources;
        }

        _getUniversalBrowSource(target, browTarget, state) {
            const sources = browTarget?.sources && Object.keys(browTarget.sources).length
                ? browTarget.sources
                : this._renderUniversalBrowSources(target, browTarget);
            return sources?.[state] || sources?.neutral || '';
        }

        _buildPerformanceTargets(context) {
            const system = this.app?.jointSystem || this.jointSystem;
            const armatures = (context?.universalTargets || []).map(target => target.armature).filter(Boolean);
            if (!armatures.length && context?.armature) armatures.push(context.armature);
            const head = [];
            const hands = [];
            const body = [];
            const seen = new Set();
            let targetViewKey = '';
            let usesSideView = false;

            const jointIndex = entry => {
                const joints = Array.isArray(entry?.obj?.joints) ? [...entry.obj.joints].sort((a, b) => a.position - b.position) : [];
                return joints.findIndex(joint => joint === entry?.jt
                    || (joint?.id && entry?.jt?.id && joint.id === entry.jt.id)
                    || (joint?.name === entry?.jt?.name && joint?.position === entry.jt?.position));
            };
            const addJointTarget = (group, entry, propertyType, channel, scaleOrProfiles) => {
                const index = jointIndex(entry);
                const scales = scaleOrProfiles && typeof scaleOrProfiles === 'object'
                    ? Object.fromEntries(Object.entries(scaleOrProfiles).map(([key, value]) => [key, Number(value) || 0]))
                    : null;
                const scale = scales
                    ? (Number(scales.beat) || Object.values(scales).find(value => Math.abs(value) >= 0.01) || 0)
                    : Number(scaleOrProfiles);
                if (!entry?.obj?.id || index < 0 || !Number.isFinite(scale) || Math.abs(scale) < 0.01) return;
                const property = `joint${propertyType}_${index}`;
                const key = `${group}:${entry.obj.id}:${property}:${channel}`;
                if (seen.has(key)) return;
                seen.add(key);
                const field = propertyType === 'Angle' ? 'angle' : (propertyType === 'TiltX' ? 'tiltX' : 'tiltY');
                const target = {
                    objectId: entry.obj.id,
                    property,
                    channel,
                    baseValue: Number(entry.jt?.[field]) || 0,
                    scale,
                    additive: true
                };
                if (scales) target.scales = scales;
                if (propertyType === 'Angle') {
                    if (Number.isFinite(Number(entry.jt?.minAngle))) target.min = Number(entry.jt.minAngle);
                    if (Number.isFinite(Number(entry.jt?.maxAngle))) target.max = Number(entry.jt.maxAngle);
                }
                group.push(target);
            };

            armatures.forEach(armature => {
                const jointMap = system?._getArmatureJointMap?.(armature, {}) || {};
                const neckEntry = jointMap.neck || jointMap.head || null;
                if (context?.descriptor?.adapterKind !== 'svg-african-native' && neckEntry) {
                    addJointTarget(head, neckEntry, 'Angle', 'headTilt', 0.9);
                    addJointTarget(head, neckEntry, 'TiltX', 'headNod', 1);
                }

                const source = this._getSpeechGestureMovement(armature);
                const poseCatalog = system?._getActiveArmaturePoseCatalog?.(armature) || {};
                const resolvedFrames = (source?.entry?.keyframes || []).map(frame => {
                    if (typeof system?._resolveArmatureKeyframe === 'function') {
                        return system._resolveArmatureKeyframe(frame, armature, poseCatalog);
                    }
                    return { angles: frame?.jointAngles || frame?.angles || {} };
                });
                const negateJointAngles = system?._shouldNegateSideArmatureMovementForVisualFlip?.(armature) === true;
                const appliedAngle = (name, entry, angle) => {
                    const runtime = typeof system?._getArmatureRuntimeAngle === 'function'
                        ? system._getArmatureRuntimeAngle(armature, name, angle)
                        : angle;
                    const directed = entry?.negate ? -runtime : runtime;
                    return typeof system?._resolveArmatureMovementJointAngleForFacing === 'function'
                        ? system._resolveArmatureMovementJointAngleForFacing(armature, name, directed, negateJointAngles)
                        : directed;
                };
                const viewKey = String(system?._getCurrentArmatureFixtureViewKey?.(armature) || '').toLowerCase();
                const isSideView = viewKey.startsWith('side-')
                    || system?._armatureUsesHumanSideCatalog?.(armature)
                    || system?._armatureUsesHumanSideDualArmCatalog?.(armature);
                if (!targetViewKey && viewKey) targetViewKey = viewKey;
                usesSideView = usesSideView || isSideView;
                const isBackView = viewKey === 'back' || viewKey.startsWith('back-3q-');
                const resolvePoseAngles = candidates => {
                    const key = candidates.find(candidate => poseCatalog[candidate]);
                    if (!key) return {};
                    if (typeof system?._resolveArmatureKeyframe === 'function') {
                        return system._resolveArmatureKeyframe({ pose: key }, armature, poseCatalog)?.angles || {};
                    }
                    return poseCatalog[key]?.jointAngles || poseCatalog[key]?.angles || {};
                };
                const idleAngles = resolvePoseAngles(['idle']);
                const profileAngles = {
                    open: resolvePoseAngles(['surrender', 'shrug', 'shrugging']),
                    point: resolvePoseAngles(isSideView
                        ? ['pointing-left', 'pointing-right', 'point-forward-side', 'point-right']
                        : (isBackView
                            ? ['pointing-up-left-arm', 'point-right', 'pointing-left', 'pointing-right']
                            : ['point-right', 'pointing-right', 'pointing-left', 'point-forward-side'])),
                    count: resolvePoseAngles(isSideView
                        ? ['point-up-side', 'reaching-up', 'pointing-up-left-arm', 'point-up']
                        : ['point-up', 'pointing-up-left-arm', 'point-up-side', 'reaching-up']),
                    wave: resolvePoseAngles(['waving', 'wave-side', 'wave-right', 'wave-both']),
                    'thumbs-up': resolvePoseAngles(['thumbs-up']),
                    present: resolvePoseAngles(isSideView
                        ? ['handshake-side-right']
                        : ['handshake-front', 'handshake']),
                    shrug: resolvePoseAngles(['shrug', 'shrugging']),
                    'hands-on-hips': resolvePoseAngles(['hands-on-hips', 'hands-on-hips-side']),
                    'arms-crossed': resolvePoseAngles(['arms-crossed', 'crossed-arms']),
                    prayer: resolvePoseAngles(['prayer-hands']),
                    celebrate: resolvePoseAngles(['excited-cheer', 'celebrate-side', 'celebrate', 'excited'])
                };
                const jointRole = name => {
                    if (/(?:^|-)(?:shoulder|upper-arm)$/.test(name)) return 'shoulder';
                    if (/(?:^|-)(?:elbow|forearm)$/.test(name)) return 'elbow';
                    if (/(?:^|-)(?:wrist|hand)$/.test(name)) return 'wrist';
                    return '';
                };
                const isSecondaryArm = name => /(?:^|-)(?:left|back|l)(?:-|$)/.test(name);
                const fallbackDelta = (name, mode, activateSecondary = false) => {
                    const role = jointRole(name);
                    const secondary = isSecondaryArm(name);
                    const directional = ['point', 'count', 'wave', 'thumbs-up', 'present'].includes(mode);
                    if (directional && secondary && !activateSecondary) return 0;
                    if (mode === 'point') {
                        return role === 'shoulder' ? -72 : (role === 'elbow' ? -14 : 2);
                    }
                    if (mode === 'count') {
                        return role === 'shoulder' ? -92 : (role === 'elbow' ? -30 : 8);
                    }
                    if (mode === 'wave') {
                        return role === 'shoulder' ? -112 : (role === 'elbow' ? -72 : (secondary ? -16 : 16));
                    }
                    if (mode === 'thumbs-up') {
                        return role === 'shoulder' ? -76 : (role === 'elbow' ? -96 : 8);
                    }
                    if (mode === 'present') {
                        return role === 'shoulder' ? -48 : (role === 'elbow' ? -38 : (secondary ? 10 : -10));
                    }
                    if (mode === 'open') {
                        if (role === 'shoulder') return isSideView ? (secondary ? 26 : -38) : -42;
                        if (role === 'elbow') return isSideView ? (secondary ? -42 : -62) : -68;
                        return secondary ? 12 : -12;
                    }
                    if (mode === 'shrug') {
                        if (role === 'shoulder') return isSideView ? (secondary ? 30 : -38) : -44;
                        if (role === 'elbow') return secondary ? -76 : -82;
                        return secondary ? 12 : -12;
                    }
                    if (mode === 'hands-on-hips') {
                        if (role === 'shoulder') return secondary ? 18 : 22;
                        if (role === 'elbow') return secondary ? -102 : -112;
                        return secondary ? -8 : 8;
                    }
                    if (mode === 'arms-crossed') {
                        if (role === 'shoulder') return secondary ? -36 : -44;
                        if (role === 'elbow') return secondary ? -118 : -128;
                        return secondary ? 10 : -10;
                    }
                    if (mode === 'prayer') {
                        if (role === 'shoulder') return secondary ? -20 : -26;
                        if (role === 'elbow') return secondary ? -108 : -116;
                        return secondary ? 8 : -8;
                    }
                    if (mode === 'celebrate') {
                        if (role === 'shoulder') return secondary ? -118 : -132;
                        if (role === 'elbow') return secondary ? -18 : -24;
                        return secondary ? -14 : 14;
                    }
                    if (isSideView) {
                        if (/front-/.test(name)) return role === 'shoulder' ? -24 : (role === 'elbow' ? -42 : -8);
                        return role === 'shoulder' ? 14 : (role === 'elbow' ? -24 : 7);
                    }
                    return role === 'shoulder' ? 26 : (role === 'elbow' ? 42 : -8);
                };
                const shortestDelta = value => {
                    let result = Number(value) || 0;
                    while (result > 180) result -= 360;
                    while (result < -180) result += 360;
                    return result;
                };
                const limits = {
                    beat: { shoulder: 36, elbow: 50, wrist: 14 },
                    open: { shoulder: 58, elbow: 78, wrist: 22 },
                    point: { shoulder: 82, elbow: 68, wrist: 20 },
                    count: { shoulder: 108, elbow: 82, wrist: 24 },
                    wave: { shoulder: 120, elbow: 110, wrist: 30 },
                    'thumbs-up': { shoulder: 105, elbow: 120, wrist: 30 },
                    present: { shoulder: 88, elbow: 96, wrist: 28 },
                    shrug: { shoulder: 68, elbow: 104, wrist: 30 },
                    'hands-on-hips': { shoulder: 72, elbow: 138, wrist: 32 },
                    'arms-crossed': { shoulder: 94, elbow: 148, wrist: 36 },
                    prayer: { shoulder: 84, elbow: 148, wrist: 36 },
                    celebrate: { shoulder: 148, elbow: 104, wrist: 36 }
                };
                const clampDelta = (name, value, mode) => {
                    const limit = limits[mode]?.[jointRole(name)] || 18;
                    return Math.max(-limit, Math.min(limit, value));
                };

                Object.entries(jointMap).forEach(([name, entry]) => {
                    if (!jointRole(name)) return;
                    const values = resolvedFrames
                        .map(frame => Number(frame?.angles?.[name]))
                        .filter(Number.isFinite);
                    const reference = values.length
                        ? ((values[0] + values[values.length - 1]) * 0.5)
                        : (Number(idleAngles[name]) || 0);
                    let beatDelta = values.reduce((largest, value) => (
                        Math.abs(value - reference) > Math.abs(largest) ? value - reference : largest
                    ), 0);
                    if (Math.abs(beatDelta) < 1.5) beatDelta = fallbackDelta(name, 'beat');
                    const profileDelta = (angles, mode) => {
                        const baseline = Number.isFinite(Number(idleAngles[name])) ? Number(idleAngles[name]) : reference;
                        const authored = Number(angles?.[name]);
                        let delta = Number.isFinite(authored)
                            ? shortestDelta(authored - baseline)
                            : fallbackDelta(name, mode);
                        if (['point', 'count', 'wave', 'thumbs-up', 'present'].includes(mode)
                            && Math.abs(delta) < 1.5) {
                            delta = fallbackDelta(name, mode, true);
                        }
                        return clampDelta(name, delta, mode);
                    };
                    const toScale = delta => (
                        appliedAngle(name, entry, reference + delta) - appliedAngle(name, entry, reference)
                    );
                    const beatScale = toScale(clampDelta(name, beatDelta, 'beat'));
                    const profileScales = Object.fromEntries(Object.entries(profileAngles).map(([mode, angles]) => [
                        mode,
                        toScale(profileDelta(angles, mode))
                    ]));
                    const channel = isSecondaryArm(name) ? 'handB' : 'handA';
                    addJointTarget(hands, entry, 'Angle', channel, {
                        beat: beatScale,
                        single: beatScale * 1.08,
                        both: profileScales.open * 0.92,
                        ...profileScales,
                        contrast: beatScale * 1.14,
                        none: 0
                    });
                });

                const waistEntry = jointMap.waist || jointMap.torso || null;
                if (waistEntry) {
                    const reference = 0;
                    const swayScale = appliedAngle('waist', waistEntry, reference + 3.2)
                        - appliedAngle('waist', waistEntry, reference);
                    addJointTarget(body, waistEntry, 'Angle', 'bodySway', swayScale);
                    addJointTarget(body, waistEntry, 'TiltX', 'bodyLean', 2.8);
                }
            });
            const handChannels = new Set(hands.map(target => target.channel));
            return {
                head,
                hands,
                body,
                viewKey: targetViewKey,
                handParticipation: usesSideView
                    && handChannels.has('handA')
                    && handChannels.has('handB')
                    ? 'bilateral-side'
                    : 'alternating'
            };
        }

        _getPerformanceRigObjects(config, sourceObjects = this.objects?.objects || []) {
            const ids = new Set([config.rootId]);
            ['head', 'hands', 'body'].forEach(group => {
                (config.performanceTargets?.[group] || []).forEach(target => ids.add(target.objectId));
            });
            return sourceObjects.filter(obj => ids.has(obj.id) || obj.pinnedTo === config.rootId);
        }

        _getPerformanceTargetsForRig(config, pool) {
            const system = this.app?.jointSystem || this.jointSystem;
            const key = Runtime.getPerformanceRigKey(config, Object.fromEntries(pool.map(obj => [obj.id, obj])));
            if (!key || !system?._detectArmatureFromPool) return config.performanceTargets;
            this._performanceRigTargets ||= new WeakMap();
            let cached = this._performanceRigTargets.get(config);
            const root = pool.find(obj => obj.id === config.rootId);
            const liveRoot = this.objects?.getObjectById?.(config.rootId);
            if (!cached || cached.root !== liveRoot || cached.authored !== config.performanceTargets) {
                cached = { root: liveRoot, authored: config.performanceTargets, profiles: new Map() };
                this._performanceRigTargets.set(config, cached);
            }
            if (cached.profiles.has(key)) return cached.profiles.get(key);
            // Derive catalog deltas on detached neutral joints. Sampling an active
            // speech/walk frame as the base would accumulate arm lift on each replay.
            const detached = pool.map(obj => ({ ...obj,
                joints: (obj.joints || []).map(joint => ({ ...joint, angle: 0, tiltX: 0, tiltY: 0 }))
            }));
            const armature = system._detectArmatureFromPool(detached);
            if (!root || armature?.root?.id !== config.rootId) return config.performanceTargets;
            const view = system._getCurrentArmatureFixtureViewKey(armature);
            const targets = view === config.performanceTargets?.viewKey
                ? config.performanceTargets
                : this._buildPerformanceTargets({ armature, descriptor: { adapterKind: config.adapterKind } });
            cached.profiles.set(key, targets);
            return targets;
        }

        _preparePerformanceRigProfiles(config, sourceObjects) {
            const pool = this._getPerformanceRigObjects(config, sourceObjects);
            const profiles = {};
            const capture = objects => {
                const key = Runtime.getPerformanceRigKey(config, Object.fromEntries(objects.map(obj => [obj.id, obj])));
                if (key) profiles[key] = this._getPerformanceTargetsForRig(config, objects);
            };
            capture(pool);
            // Bake all recorded layouts for the self-contained preview/export,
            // including projects recorded before view-aware speech was introduced.
            const events = new Map();
            pool.forEach(obj => (obj.animations || []).forEach(animation => {
                const configs = Array.isArray(animation.generated) ? animation.generated : [animation.generated];
                configs.filter(Boolean).forEach(clip => (clip.keyframes || []).forEach(frame => {
                    const value = frame.values?.armatureViewState;
                    if (!value) return;
                    try {
                        const state = JSON.parse(value);
                        if (state.version !== 1 || !state.props) return;
                        const time = (Number(animation.delay) || 0) + (Number(clip._stepDelay) || 0)
                            + (Number(frame.t) || 0) * (Number(clip.duration) || 0);
                        if (!events.has(time)) events.set(time, new Map());
                        events.get(time).set(obj.id, state.props);
                    } catch (_) { /* Ignore invalid recorded states, as playback does. */ }
                }));
            }));
            let snapshot = pool.map(obj => ({ ...obj }));
            [...events].sort(([a], [b]) => a - b).forEach(([, states]) => {
                snapshot = snapshot.map(obj => ({ ...obj, ...states.get(obj.id) }));
                capture(snapshot);
            });
            return profiles;
        }

        prepareConfigForExport(config = {}, sourceObjects = this.objects?.objects || []) {
            config = { ...config, performanceTargetsByRig: this._preparePerformanceRigProfiles(config, sourceObjects) };
            if (config.adapterKind !== 'universal-features') return { ...config };
            const mouthOpeningGain = config.mouthOpeningGain ?? config.svgMouthGain ?? 1.45;
            const mouthFrames = Runtime.collectUniversalMouthFrames(config);
            return {
                ...config,
                targets: (config.targets || []).map(target => ({
                    objectId: target.objectId,
                    headId: target.headId,
                    variantKey: target.variantKey,
                    sources: this._renderUniversalTargetSources(target, mouthOpeningGain),
                    frameSources: this._renderUniversalMouthFrameSources(target, config, mouthFrames),
                    eyes: (target.eyes || []).map(eyeTarget => ({
                        objectId: eyeTarget.objectId,
                        variant: eyeTarget.variant,
                        sources: this._renderUniversalEyeSources(target, eyeTarget)
                    })),
                    brows: (target.brows || []).map(browTarget => ({
                        objectId: browTarget.objectId,
                        variant: browTarget.variant,
                        sources: this._renderUniversalBrowSources(target, browTarget)
                    }))
                }))
            };
        }

        _getExportLipSyncEntries() {
            const entries = [];
            (this.objects?.objects || []).forEach(owner => {
                (owner?.animations || []).forEach(animation => {
                    const configs = Array.isArray(animation?.generated)
                        ? animation.generated
                        : [animation?.generated];
                    configs.forEach(config => {
                        if (config?.type === 'audio-lip-sync' && config.audioRefreshRequired !== true) {
                            entries.push({ owner, animation, config });
                        }
                    });
                });
            });
            return entries;
        }

        _resolveSvgLipSyncHead(owner, config = {}) {
            return this.objects?.getObjectById?.(config.targetHeadId)
                || this.animations?._getSvgAfricanPremiumHeadObject?.(owner)
                || (this.objects?.objects || []).find(obj => (
                    obj?._svgCharacterInstanceId === config.instanceId
                    && (obj?._svgCharacterPremiumPartKey || obj?._svgCharacterPartKey) === 'head-neck'
                ));
        }

        _trimMapToLimit(map, limit) {
            if (!(map instanceof Map)) return;
            while (map.size > limit) {
                map.delete(map.keys().next().value);
            }
        }

        async _prewarmUniversalMouthFrames(config = {}, timeoutMs = 900) {
            if (config.adapterKind !== 'universal-features') return 0;
            const gain = config.mouthOpeningGain ?? config.svgMouthGain ?? 1.45;
            const mouthFrames = Runtime.collectUniversalMouthFrames(config);
            const images = new Set();
            (config.targets || []).forEach(target => {
                const sources = this._renderUniversalTargetSources(target, gain);
                const frameSources = this._renderUniversalMouthFrameSources(target, config, mouthFrames);
                Object.values({ ...(sources || {}), ...(frameSources || {}) }).forEach(source => {
                    const image = this._preloadImage(source);
                    if (image) images.add(image);
                });
            });
            const pending = [...images]
                .map(image => image?._audioLipSyncReadyPromise)
                .filter(Boolean);
            if (!pending.length) return images.size;
            let timeoutId = null;
            await Promise.race([
                Promise.allSettled(pending),
                new Promise(resolve => {
                    timeoutId = setTimeout(resolve, Math.max(80, Number(timeoutMs) || 900));
                })
            ]);
            if (timeoutId != null) clearTimeout(timeoutId);
            return images.size;
        }

        async prepareForVideoExport(options = {}) {
            const entries = this._getExportLipSyncEntries();
            if (!entries.length) return null;

            const token = {
                previousSampleMap: this._exportFaceSampleMsByConfig,
                heads: [],
                warmedFrames: 0
            };
            this._activeVideoExportPreparation = token;
            this._exportFaceSampleMsByConfig = new Map();
            const requestedDuration = Number(options.durationMs);
            const exportDurationLimit = Number.isFinite(requestedDuration) && requestedDuration > 0
                ? requestedDuration
                : Infinity;
            const getWarmDuration = config => Math.min(
                exportDurationLimit,
                Math.max(1, Number(config?.duration) || 1)
            );

            const universalImages = new Set();
            entries.forEach(({ config }) => {
                if (config.adapterKind !== 'universal-features') return;
                const mouthOpeningGain = config.mouthOpeningGain ?? config.svgMouthGain ?? 1.45;
                const mouthFrames = Runtime.collectUniversalMouthFrames(config);
                (config.targets || []).forEach(target => {
                    const sources = this._renderUniversalTargetSources(target, mouthOpeningGain);
                    const frameSources = this._renderUniversalMouthFrameSources(target, config, mouthFrames);
                    Object.values({ ...(sources || {}), ...(frameSources || {}) }).forEach(source => {
                        const image = this._preloadImage(source);
                        if (image) universalImages.add(image);
                    });
                    (target.eyes || []).forEach(eyeTarget => {
                        const eyeSources = this._renderUniversalEyeSources(target, eyeTarget);
                        Object.values(eyeSources || {}).forEach(source => {
                            const image = this._preloadImage(source);
                            if (image) universalImages.add(image);
                        });
                    });
                    (target.brows || []).forEach(browTarget => {
                        const browSources = this._renderUniversalBrowSources(target, browTarget);
                        Object.values(browSources || {}).forEach(source => {
                            const image = this._preloadImage(source);
                            if (image) universalImages.add(image);
                        });
                    });
                });
            });

            const entriesByHead = new Map();
            entries.forEach(entry => {
                if (entry.config.adapterKind !== 'svg-african-native') return;
                const head = this._resolveSvgLipSyncHead(entry.owner, entry.config);
                if (!head) return;
                const group = entriesByHead.get(head) || [];
                group.push(entry);
                entriesByHead.set(head, group);
            });

            entriesByHead.forEach((headEntries, head) => {
                const totalDuration = headEntries.reduce((sum, entry) => (
                    sum + getWarmDuration(entry.config)
                ), 0);
                const requestedFps = Math.max(1, Number(options.fps) || 30);
                const maximumFaceFps = Math.min(15, requestedFps);
                // Bound preloading, not speech cadence. Long clips must not hold
                // a viseme for seconds merely to fit the warm-up cache.
                const sampleMs = options.exactFrames === true ? 0 : 1000 / maximumFaceFps;
                const warmFrameLimit = (head._svgCharacterConfig?._photoCharacter || head._svgCharacterConfig?._realisticCharacter) ? 24 : 420;
                headEntries.forEach(entry => {
                    this._exportFaceSampleMsByConfig.set(entry.config, sampleMs);
                });
                token.heads.push({
                    head,
                    entries: headEntries,
                    sampleMs,
                    warmFrameLimit,
                    baseline: { ...(this.animations?._getSvgAfricanFaceState?.(head) || head._svgAfricanFaceState || {}) },
                    previousLimit: head._svgAfricanFaceCacheLimit
                });
                const anticipatedFrames = sampleMs > 0
                    ? Math.min(warmFrameLimit, Math.ceil(totalDuration / sampleMs)) + 4
                    : 96;
                head._svgAfricanFaceCacheLimit = Math.min(640, Math.max(96, anticipatedFrames));
            });

            const universalReady = [...universalImages]
                .map(image => image?._audioLipSyncReadyPromise)
                .filter(Boolean);
            if (universalReady.length) await Promise.allSettled(universalReady);

            for (const headInfo of token.heads) {
                const { head, entries: headEntries, sampleMs, baseline, warmFrameLimit } = headInfo;
                // Timestamped export awaits the actual frame's decoded image.
                if (sampleMs === 0) continue;
                let remainingFrames = warmFrameLimit;
                for (const entry of headEntries) {
                    if (remainingFrames <= 0) break;
                    const duration = getWarmDuration(entry.config);
                    for (let timeMs = 0; timeMs <= duration && remainingFrames > 0; timeMs += sampleMs) {
                        head._svgAfricanFaceState = { ...baseline };
                        this._applyConfig(entry.owner, entry.config, timeMs, {
                            faceOnly: true,
                            forceFaceSampleMs: sampleMs
                        });
                        this.animations?._flushSvgAfricanFaceStateRenders?.();
                        token.warmedFrames++;
                        remainingFrames--;
                        if (token.warmedFrames % 16 === 0) {
                            await new Promise(resolve => setTimeout(resolve, 0));
                        }
                    }
                }
            }

            const svgReady = token.heads.flatMap(({ head }) => (
                [...(head._svgAfricanFaceImageCache?.values?.() || [])]
                    .map(record => record?.ready)
                    .filter(Boolean)
            ));
            if (svgReady.length) {
                let timeoutId = null;
                await Promise.race([
                    Promise.allSettled(svgReady),
                    new Promise(resolve => {
                        timeoutId = setTimeout(resolve, 15000);
                    })
                ]);
                if (timeoutId != null) clearTimeout(timeoutId);
            }

            token.heads.forEach(({ head, baseline }) => {
                head._svgAfricanFaceState = { ...baseline };
                head._svgAfricanFaceTransientActive = false;
                head._svgAfricanFaceTransientRender = false;
                delete head._audioLipSyncImageElement;
            });
            return token;
        }

        releaseVideoExportPreparation(token) {
            if (!token) return;
            this._exportFaceSampleMsByConfig = token.previousSampleMap || null;
            (token.heads || []).forEach(({ head, baseline, previousLimit }) => {
                if (!head) return;
                head._svgAfricanFaceState = { ...(baseline || {}) };
                head._svgAfricanFaceTransientActive = false;
                head._svgAfricanFaceTransientRender = false;
                delete head._audioLipSyncImageElement;
                if (previousLimit === undefined) delete head._svgAfricanFaceCacheLimit;
                else head._svgAfricanFaceCacheLimit = previousLimit;
                this._trimMapToLimit(head._svgAfricanFaceRenderCache, 96);
                this._trimMapToLimit(head._svgAfricanFaceImageCache, 96);
            });
            this.clearFrameOverrides();
            if (this._activeVideoExportPreparation === token) {
                this._activeVideoExportPreparation = null;
            }
        }

        _buildConfig(settings, audioOverride = null) {
            const context = this.context;
            const audio = audioOverride || this.app?.audioTimeline || this.audioTimeline;
            const descriptor = context.descriptor;
            const performanceMode = settings.performanceMode === 'full' ? 'full' : 'mouth-only';
            const cues = Runtime.normalizeCues(this.draftCues);
            const transcriptSegments = this._getTranscriptSegments(settings);
            const semanticEvents = this.performanceDraftReady
                ? Runtime.normalizeSemanticEvents(Runtime.retimeWordLinkedEvents(
                    this.draftPerformanceEvents, this.draftWordTimings, settings.duration
                ).events, settings.duration)
                : undefined;
            const performancePlan = Runtime.buildPerformancePlan(cues, settings.duration, {
                transcript: settings.transcript,
                transcriptSegments,
                semanticGestures: settings.semanticGestures,
                semanticEvents,
                deliveryStyle: settings.deliveryStyle
            });
            let faceBaseline = null;
            if (descriptor.adapterKind === 'svg-african-native') {
                const current = this.animations?._getSvgAfricanFaceState?.(context.adapter?.headObj)
                    || context.adapter?.headObj?._svgAfricanFaceState
                    || {};
                faceBaseline = {
                    smile: Number.isFinite(Number(current.smile)) ? Number(current.smile) : 0.22,
                    browRaise: Number.isFinite(Number(current.browRaise)) ? Number(current.browRaise) : 0
                };
            }
            return {
                type: 'audio-lip-sync',
                version: 22,
                duration: settings.duration,
                adapterKind: descriptor.adapterKind,
                characterKey: descriptor.characterKey,
                rootId: descriptor.rootId,
                familyId: descriptor.familyId,
                instanceId: descriptor.instanceId,
                targetHeadId: descriptor.targetHeadId,
                targets: descriptor.adapterKind === 'universal-features' ? this._buildUniversalTargets(context) : [],
                performance: {
                    motionMode: performanceMode,
                    eyeIntensity: settings.eyeIntensity,
                    expressionIntensity: settings.expressionIntensity,
                    headIntensity: settings.headIntensity,
                    handIntensity: settings.handIntensity,
                    handSpeed: settings.handSpeed,
                    bodyIntensity: settings.bodyIntensity,
                    deliveryStyle: settings.deliveryStyle,
                    handPattern: settings.handPattern,
                    semanticGestures: settings.semanticGestures,
                    eyeMovement: performanceMode === 'full' && settings.eyeIntensity > 0,
                    facialExpression: performanceMode === 'full' && settings.expressionIntensity > 0,
                    headMovement: performanceMode === 'full' && settings.headIntensity > 0,
                    handGestures: performanceMode === 'full' && settings.handIntensity > 0,
                    bodyMovement: performanceMode === 'full' && settings.bodyIntensity > 0
                },
                performanceTargets: descriptor.adapterKind === 'realistic-3d' ? {} : this._buildPerformanceTargets(context),
                performancePlan,
                faceBaseline,
                mouthOpeningGain: settings.mouthClarity,
                showTeeth: settings.showTeeth !== false,
                teethVisibility: settings.teethVisibility ?? .6,
                svgMouthGain: settings.mouthClarity,
                audioId: audio.audioId || '',
                audioRevision: Number(audio.audioRevision) || 1,
                audioTimelineStartMs: Math.max(0, Number(audio.timelineStartMs) || 0),
                audioTrimStartMs: Math.max(0, Number(audio.trimStartMs) || 0),
                audioTrimEndMs: Math.max(0, Number(audio.trimEndMs) || 0),
                timelineStartMs: settings.startMs,
                sourceStartMs: settings.sourceStartMs,
                sourceEndMs: settings.sourceEndMs,
                offsetMs: settings.offsetMs,
                mode: settings.mode,
                transcript: settings.transcript,
                transcriptSegments,
                wordTimings: (this.draftWordTimings || []).map(word => ({ ...word })),
                wordTimingEdited: this.wordTimingEdited === true,
                recognition: this._recognitionMatches(settings) ? { ...this.recognition } : null,
                strength: settings.strength,
                smoothingMs: settings.smoothingMs,
                cues
            };
        }

        buildDialogueAnimation(armature, track, options = {}) {
            const context = this._buildCharacterContext(armature);
            if (!context || !track?.audioBuffer) throw new Error('This speaker needs a character with facial controls and decoded audio.');
            const keys = ['context', 'draftCues', 'draftWordTimings', 'draftPerformanceEvents',
                'performanceDraftReady', 'wordTimingEdited', 'recognition'];
            const saved = Object.fromEntries(keys.map(key => [key, this[key]]));
            try {
                const duration = track.trimEndMs - track.trimStartMs;
                const settings = { mode: 'quick', performanceMode: options.gestures === false ? 'mouth-only' : 'full',
                    duration, startMs: 0, endMs: duration, sourceStartMs: track.trimStartMs, sourceEndMs: track.trimEndMs,
                    offsetMs: 0, strength: 1, smoothingMs: 85, mouthClarity: 1.7, eyeIntensity: options.otherMotion || options.headTurn ? 0 : .45,
                    expressionIntensity: .4, headIntensity: options.otherMotion || options.headTurn ? 0 : .3, handIntensity: options.handsBusy ? 0 : .35,
                    handSpeed: .65, bodyIntensity: options.seated || options.otherMotion ? 0 : .12,
                    deliveryStyle: Object.hasOwn(Runtime.speechStyles, options.delivery) ? options.delivery : 'natural',
                    handPattern: 'alternating', semanticGestures: false, transcript: String(options.text || '') };
                this.context = context;
                this.draftCues = this.analyzeAudioBuffer(track.audioBuffer, {
                    sourceStartMs: settings.sourceStartMs, sourceEndMs: settings.sourceEndMs, smoothing: .35 });
                this.draftWordTimings = [];
                this.draftPerformanceEvents = [];
                this.performanceDraftReady = false;
                this.wordTimingEdited = false;
                this.recognition = null;
                const config = this._buildConfig(settings, track);
                config.reservedHandObjectIds = [...new Set(options.reservedHandObjectIds || [])];
                config.timelineDelayMs = track.timelineStartMs;
                return { id: Utils.generateId('anim'), type: 'audio-lip-sync', name: `Dialogue: ${options.speaker || context.root.name}`,
                    params: { duration: duration / 1000, audioId: track.audioId, characterKey: config.characterKey,
                        performanceMode: settings.performanceMode, afterPlayback: 'return' },
                    delay: track.timelineStartMs, repeat: '1', trigger: 'onLoad', startMode: 'withPrevious',
                    afterPlayback: 'return', generated: [config] };
            } finally { Object.assign(this, saved); }
        }

        _getSpeechGestureMovement(armature) {
            const system = this.app?.jointSystem || this.jointSystem;
            const catalog = system?._getActiveArmatureMovementCatalog?.(armature) || {};
            const viewKey = String(system?._getCurrentArmatureFixtureViewKey?.(armature) || '').toLowerCase();
            const lean = String(system?._getArmatureFront3qLean?.(armature) || '').toLowerCase();
            let candidates;
            if (viewKey === 'back-3q-left') {
                candidates = ['present-explain-alternate-back-3q-left', 'present-explain-back-3q-left', 'present-explain-alternate-back', 'present-explain-back'];
            } else if (viewKey === 'back-3q-right') {
                candidates = ['present-explain-alternate-back-3q-right', 'present-explain-back-3q-right', 'present-explain-alternate-back', 'present-explain-back'];
            } else if (viewKey === 'back') {
                candidates = ['present-explain-alternate-back', 'present-explain-back'];
            } else if (viewKey.startsWith('side-') || system?._armatureUsesHumanSideCatalog?.(armature)
                || system?._armatureUsesHumanSideDualArmCatalog?.(armature)) {
                candidates = ['present-explain-alternate', 'present-explain'];
            } else {
                candidates = lean === 'left'
                    ? ['present-explain-alternate-left', 'present-explain-alternate-right', 'present-explain']
                    : ['present-explain-alternate-right', 'present-explain-alternate-left', 'present-explain'];
            }
            candidates.push('talking-gesture', 'talking-gestures', 'hf-talking-gesture');
            const key = candidates.find(candidate => catalog[candidate]?.keyframes?.length);
            return key ? { key, entry: catalog[key] } : null;
        }

        _removeSpeechPerformanceAnimations(companionId) {
            if (!companionId) return 0;
            let removed = 0;
            (this.objects?.objects || []).forEach(obj => {
                if (!Array.isArray(obj.animations)) return;
                const before = obj.animations.length;
                obj.animations = obj.animations.filter(animation => (
                    animation?._audioLipSyncCompanionId !== companionId
                    && animation?.params?.audioLipSyncCompanionId !== companionId
                ));
                removed += before - obj.animations.length;
            });
            return removed;
        }

        _getCaptionPreset() {
            const value = String(this.modal?.querySelector('[data-als-caption-preset]')?.value || 'subtitle');
            return ['subtitle', 'lower-third', 'banner'].includes(value) ? value : 'subtitle';
        }

        _captionPresetGeometry(preset, stageWidth, stageHeight) {
            const W = Math.max(1, Number(stageWidth) || 1280);
            const H = Math.max(1, Number(stageHeight) || 720);
            if (preset === 'lower-third') {
                const fontSize = Math.max(14, Math.round(H * 0.04));
                const width = Math.round(W * 0.6);
                const height = Math.round(H * 0.16);
                return { x: Math.round(W * 0.06), y: Math.round(H * 0.64), width, height, fontSize, textAlign: 'left', captionVerticalAlign: 'middle' };
            }
            if (preset === 'banner') {
                const fontSize = Math.max(14, Math.round(H * 0.045));
                const width = Math.round(W * 0.9);
                const height = Math.round(H * 0.16);
                return { x: Math.round((W - width) / 2), y: Math.round(H * 0.05), width, height, fontSize, textAlign: 'center', captionVerticalAlign: 'middle' };
            }
            const fontSize = Math.max(14, Math.round(H * 0.045));
            const width = Math.round(W * 0.8);
            const height = Math.round(H * 0.2);
            return { x: Math.round((W - width) / 2), y: Math.round(H - height - H * 0.05), width, height, fontSize, textAlign: 'center', captionVerticalAlign: 'bottom' };
        }

        // Builds timeline-absolute caption segments (with per-word timing for
        // karaoke highlighting) from the current transcript/word-timing draft.
        _buildCaptionSegments(settings, baseMs) {
            const base = Math.max(0, Number(baseMs) || 0);
            const duration = Math.max(1, Number(settings.duration) || 1);
            const MAX_CHARS = 42;
            const MAX_WORDS = 10;
            // Strip subtitle structure, not spoken times such as "10:30".
            const cleanText = value => String(value || '')
                .replace(/(?:^|\n)\s*(?:\d+\s*\n)?\s*\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d{1,3})?\s*-->\s*\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d{1,3})?[^\n]*(?:\n|$)/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();

            // Split a text span into caption-sized lines, distributing the time
            // range proportionally by word count.
            const chunkSpan = (text, startMs, endMs) => {
                const words = cleanText(text).split(/\s+/).filter(Boolean);
                if (!words.length) return [];
                const lineGroups = [];
                let current = [];
                words.forEach(word => {
                    const tentative = current.concat(word).join(' ');
                    if (current.length && (tentative.length > MAX_CHARS || current.length >= MAX_WORDS)) {
                        lineGroups.push(current);
                        current = [word];
                    } else {
                        current.push(word);
                    }
                });
                if (current.length) lineGroups.push(current);
                const totalWords = words.length;
                const span = Math.max(1, endMs - startMs);
                let consumed = 0;
                return lineGroups.map(group => {
                    const s = startMs + span * (consumed / totalWords);
                    consumed += group.length;
                    const e = startMs + span * (consumed / totalWords);
                    const lineStart = s;
                    const lineEnd = Math.max(s + 1, e);
                    // Distribute the line's time across its words for highlighting.
                    const wordSpan = (lineEnd - lineStart) / group.length;
                    const lineWords = group.map((word, index) => ({
                        text: word,
                        startMs: lineStart + wordSpan * index,
                        endMs: lineStart + wordSpan * (index + 1)
                    }));
                    return { startMs: lineStart, endMs: lineEnd, text: group.join(' '), words: lineWords };
                });
            };

            const timed = Runtime.parseTranscriptSegments(settings.transcript, duration) || [];
            const words = (this.draftWordTimings || [])
                .map(word => ({ text: String(word.text || '').trim(), startMs: Number(word.startMs) || 0, endMs: Number(word.endMs) || 0 }))
                .filter(word => word.text && word.endMs > word.startMs);

            let rawSegments = [];
            if (timed.length && !words.length) {
                rawSegments = timed.flatMap(segment => chunkSpan(
                    segment.text,
                    Number(segment.startMs) || 0,
                    Math.max((Number(segment.startMs) || 0) + 1, Number(segment.endMs) || 0)
                ));
            } else if (words.length) {
                const groups = [];
                let group = [];
                words.forEach((word, index) => {
                    const previous = words[index - 1];
                    const joined = group.map(item => item.text).concat(word.text).join(' ');
                    if (group.length && (word.startMs - previous.endMs > 650 || group.length >= MAX_WORDS || joined.length > MAX_CHARS)) {
                        groups.push(group);
                        group = [];
                    }
                    group.push(word);
                });
                if (group.length) groups.push(group);
                rawSegments = groups.map(group => ({
                    startMs: group[0].startMs,
                    endMs: group[group.length - 1].endMs,
                    text: group.map(item => item.text).join(' '),
                    words: group.map(item => ({ text: item.text, startMs: item.startMs, endMs: item.endMs }))
                }));
            } else {
                const clean = cleanText(settings.transcript);
                if (!clean) return [];
                const sentences = (clean.match(/[^.!?]+[.!?]*/g) || [clean]).map(s => s.trim()).filter(Boolean);
                const weights = sentences.map(sentence => Math.max(1, sentence.split(/\s+/).length));
                const totalWeight = weights.reduce((sum, weight) => sum + weight, 0) || 1;
                let consumed = 0;
                rawSegments = sentences.flatMap((sentence, index) => {
                    const segStart = duration * (consumed / totalWeight);
                    consumed += weights[index];
                    const segEnd = duration * (consumed / totalWeight);
                    return chunkSpan(sentence, segStart, Math.max(segStart + 1, segEnd));
                });
            }

            return rawSegments
                .map(segment => {
                    const startMs = base + (Number(segment.startMs) || 0);
                    const endMs = base + Math.max((Number(segment.startMs) || 0) + 1, Number(segment.endMs) || 0);
                    const out = { startMs, endMs, text: String(segment.text || '').trim(),
                        timingSource: words.length && (this.wordTimingEdited || this._recognitionMatches?.(settings))
                            ? (this.wordTimingEdited ? 'aligned' : 'recognized') : 'estimated' };
                    if (Array.isArray(segment.words) && segment.words.length) {
                        out.words = segment.words.map(word => ({
                            text: word.text,
                            startMs: base + word.startMs,
                            endMs: base + word.endMs
                        }));
                    }
                    return out;
                })
                .filter(segment => segment.text && segment.endMs > segment.startMs);
        }

        async generateCaptions() {
            if (!this.context) return false;
            if (this.wordEditsPending || this.draftDirty) {
                const generated = await this.generateDraft({ preservePerformance: this.performanceDraftEdited });
                if (!generated) return false;
            }
            const settings = this._readSettings();
            const audio = this.app?.audioTimeline || this.audioTimeline;
            const audioTimelineStartMs = Math.max(0, Number(audio?.timelineStartMs) || 0);
            const base = Math.max(0, audioTimelineStartMs + (Number(settings.startMs) || 0) + (Number(settings.offsetMs) || 0));
            const segments = this._buildCaptionSegments(settings, base);
            if (!segments.length) {
                this._setStatus('Add a transcript or recognize speech to build captions');
                Utils.showToast('No timed speech available for captions. Use Accurate Speech or Transcribe Audio first.', 'warning');
                return false;
            }

            const stage = this.app?.stage || this.stage;
            const preset = this._getCaptionPreset();
            const geo = this._captionPresetGeometry(preset, stage?.width, stage?.height);
            const audioId = String(audio?.audioId || '');
            const objectsManager = this.app?.objects;
            const existing = (objectsManager?.objects || []).find(obj =>
                obj?.type === 'caption' && audioId && String(obj.captionAudioId || '') === audioId);

            if (existing) {
                const previous = existing.segments || [];
                existing.segments = globalThis.CaptionRuntime ? globalThis.CaptionRuntime.merge(existing.segments || [], segments,
                    { startMs: base, endMs: base + settings.duration }) : segments;
                if (existing.captionBinding) globalThis.CaptionRuntime?.saveEdits(existing, previous);
                else globalThis.CaptionRuntime?.bind(existing, audio);
                objectsManager?.updateObjectList?.();
                this.app?.stage?.requestRender?.();
                eventBus.emit('timeline:update');
                eventBus.emit('history:push');
                this._setStatus(`Captions updated (${segments.length} lines)`);
                Utils.showToast(`Captions updated (${segments.length} lines). Double-click them on stage to edit.`, 'success');
                return true;
            }

            const caption = new StageObject('caption', {
                name: `Captions: ${audio?.fileName || 'Speech'}`,
                x: geo.x, y: geo.y, width: geo.width, height: geo.height,
                segments,
                captionAudioId: audioId,
                captionPreset: preset,
                captionHighlightEnabled: false,
                captionDelivery: 'both',
                captionHighlightColor: '#f6c945',
                captionVerticalAlign: geo.captionVerticalAlign,
                textAlign: geo.textAlign,
                textColor: '#ffffff',
                fontFamily: 'Inter',
                fontWeight: '600',
                fontSize: geo.fontSize,
                textBackgroundEnabled: true,
                textBackgroundColor: 'rgba(0,0,0,0.6)',
                textBackgroundPadding: Math.max(6, Math.round(geo.fontSize * 0.35)),
                textBackgroundRadius: 8,
                textStrokeColor: '#000000',
                textStrokeWidth: Math.max(0, Math.round(geo.fontSize * 0.06))
            });
            globalThis.CaptionRuntime?.bind(caption, audio);
            objectsManager?.addObject?.(caption);
            this._setStatus(`Captions added (${segments.length} lines)`);
            Utils.showToast(`Captions added to stage (${segments.length} lines). Double-click them to edit.`, 'success');
            return true;
        }

        async createOrUpdateClip() {
            const context = this.context;
            if (!this._isContextCurrent(context)) {
                this._setStatus('Scene, audio or character changed. Reopen Lip Sync.', 'warning');
                return false;
            }
            if (this.wordEditsPending || this.draftDirty || !this.draftCues.length) {
                const generated = await this.generateDraft({ preservePerformance: this.performanceDraftEdited });
                if (!generated) return false;
            }
            if (this.context !== context || !this._isContextCurrent(context)) return false;
            if (!this._validatePerformanceLinks()) return false;
            const settings = this._readSettings();
            const config = this._buildConfig(settings);
            const existing = this.context.existing;
            const owner = existing?.owner || this.context.root;
            owner.animations = Array.isArray(owner.animations) ? owner.animations : [];
            const animation = existing?.animation || {
                id: Utils.generateId('anim'),
                type: 'audio-lip-sync',
                name: '',
                params: {},
                repeat: '1',
                trigger: 'onLoad',
                startMode: 'withPrevious',
                afterPlayback: 'return',
                generated: []
            };
            animation.name = `Lip Sync: ${(this.app?.audioTimeline || this.audioTimeline)?.fileName || 'Soundtrack'}`;
            const audioTimelineStartMs = Math.max(0, Number((this.app?.audioTimeline || this.audioTimeline)?.timelineStartMs) || 0);
            animation.delay = Math.max(0, audioTimelineStartMs + settings.startMs + settings.offsetMs);
            config.timelineDelayMs = animation.delay;
            animation.params = {
                duration: settings.duration / 1000,
                mode: settings.mode,
                performanceMode: settings.performanceMode,
                strength: settings.strength,
                smoothingMs: settings.smoothingMs,
                mouthClarity: settings.mouthClarity,
                showTeeth: settings.showTeeth !== false,
                teethVisibility: settings.teethVisibility ?? .6,
                eyeIntensity: settings.eyeIntensity,
                expressionIntensity: settings.expressionIntensity,
                headIntensity: settings.headIntensity,
                handIntensity: settings.handIntensity,
                handSpeed: settings.handSpeed,
                bodyIntensity: settings.bodyIntensity,
                deliveryStyle: settings.deliveryStyle,
                handPattern: settings.handPattern,
                semanticGestures: settings.semanticGestures,
                audioId: config.audioId,
                characterKey: config.characterKey,
                afterPlayback: 'return'
            };
            animation.generated = [config];
            if (!existing) owner.animations.push(animation);
            this._removeSpeechPerformanceAnimations(animation.id);
            this.context.existing = { owner, animation, config };
            const audio = this.app?.audioTimeline || this.audioTimeline;
            const track = audio?.getActiveTrack?.();
            if (track && String(track.audioId) === String(config.audioId)) {
                track.characterId = context.root.id;
                audio.characterId = context.root.id;
                audio._saveActiveTrack?.();
                audio._refreshEditControls?.();
                this.app?._saveCurrentSceneAudioOnly?.();
            }
            this.animations.originalStates = null;
            this.animations.calculateTotalDuration?.();
            eventBus.emit('timeline:update');
            eventBus.emit('objects:updated');
            eventBus.emit('history:push');
            this.objects?.updateProperties?.();
            const removeButton = this.modal?.querySelector('[data-als-action="remove"]');
            if (removeButton) removeButton.disabled = false;
            this._setStatus(`Saved ${config.cues.length} cues`, 'success');
            if (settings.performanceMode === 'full'
                && settings.handIntensity > 0
                && !(config.performanceTargets?.hands || []).length) {
                Utils.showToast('Lip sync saved; hand gestures are unavailable for this character view', 'warning');
            } else {
                Utils.showToast('Audio lip sync added to the timeline', 'success');
            }
            this.close({ force: true });
            if (config.adapterKind === 'universal-features') {
                setTimeout(() => { void this._prewarmUniversalMouthFrames(config, 700); }, 0);
            }
            return true;
        }

        removeClip() {
            const existing = this.context?.existing;
            if (!existing) return false;
            this._removeSpeechPerformanceAnimations(existing.animation.id);
            const index = existing.owner.animations?.findIndex(animation => animation.id === existing.animation.id) ?? -1;
            if (index >= 0) existing.owner.animations.splice(index, 1);
            this.context.existing = null;
            this.animations.originalStates = null;
            this.animations.calculateTotalDuration?.();
            eventBus.emit('timeline:update');
            eventBus.emit('objects:updated');
            eventBus.emit('history:push');
            const removeButton = this.modal?.querySelector('[data-als-action="remove"]');
            if (removeButton) removeButton.disabled = true;
            this._setStatus('Clip removed');
            Utils.showToast('Audio lip sync removed', 'info');
            return true;
        }

        _preloadImage(source) {
            if (!source || this.imageCache.has(source) || typeof Image === 'undefined') return this.imageCache.get(source) || null;
            const image = new Image();
            let resolveReady;
            image._audioLipSyncReadyPromise = new Promise(resolve => { resolveReady = resolve; });
            image.onload = () => {
                resolveReady(image);
                this.stage?.requestRender?.();
            };
            image.onerror = () => resolveReady(null);
            image.src = source;
            this.imageCache.set(source, image);
            return image;
        }

        _applyPreloadedImage(obj, image, source, stateProperty, stateValue) {
            if (!obj || !image || !source) return false;
            // Mark the feature as active before decoding completes. The frame
            // renderer can then retain the last ready image instead of briefly
            // revealing the authored/rest feature between speech frames.
            obj._audioLipSyncFrameActive = true;
            obj._audioLipSyncPendingSource = source;
            const apply = () => {
                if (obj._audioLipSyncPendingSource !== source) return false;
                if (!(image.complete && (image.naturalWidth || image.width))) return false;
                obj._audioLipSyncImageElement = image;
                if (stateProperty) obj[stateProperty] = stateValue;
                this.stage?.requestRender?.();
                return true;
            };
            if (apply()) return true;
            void image._audioLipSyncReadyPromise?.then(() => apply());
            return false;
        }

        _setPerformanceProperty(obj, property, value) {
            if (!obj || !property) return;
            if (typeof this.animations?._setAnimatedPropertyValue === 'function') {
                this.animations._setAnimatedPropertyValue(obj, property, value);
                return;
            }
            obj[property] = value;
            const jointMatch = String(property).match(/^jointAngle_(\d+)$/);
            const tiltMatch = String(property).match(/^jointTilt([XY])_(\d+)$/);
            if (jointMatch && Array.isArray(obj.joints)) {
                const joint = [...obj.joints].sort((a, b) => a.position - b.position)[Number(jointMatch[1])];
                if (joint) joint.angle = value;
            } else if (tiltMatch && Array.isArray(obj.joints)) {
                const joint = [...obj.joints].sort((a, b) => a.position - b.position)[Number(tiltMatch[2])];
                if (joint) joint[tiltMatch[1] === 'X' ? 'tiltX' : 'tiltY'] = value;
            }
        }

        _applyPerformanceTargets(config, performance, options = {}) {
            const pool = this._getPerformanceRigObjects(config);
            config = { ...config, performanceTargets: this._getPerformanceTargetsForRig(config, pool) };
            const objectsById = {};
            const root = this.objects?.getObjectById?.(config.rootId);
            if (root) objectsById[root.id] = root;
            ['head', 'hands', 'body'].forEach(group => {
                (config.performanceTargets?.[group] || []).forEach(target => {
                    const obj = this.objects?.getObjectById?.(target.objectId);
                    if (obj) objectsById[target.objectId] = obj;
                });
            });
            Runtime.applyPerformanceTargets(config, performance, objectsById, {
                setProperty: (obj, property, value) => this._setPerformanceProperty(obj, property, value),
                composeWithCurrent: options.composeWithCurrent === true
            });
        }

        _restorePerformanceTargets(config) {
            config = { ...config, performanceTargets: this._getPerformanceTargetsForRig(config, this._getPerformanceRigObjects(config)) };
            const performance = Runtime.getPerformanceOptions(config);
            const groupEnabled = {
                head: performance.headMovement,
                hands: performance.handGestures,
                body: performance.bodyMovement
            };
            ['head', 'hands', 'body'].forEach(group => {
                if (!groupEnabled[group]) return;
                (config?.performanceTargets?.[group] || []).forEach(target => {
                    const obj = this.objects?.getObjectById?.(target.objectId);
                    if (obj) this._setPerformanceProperty(obj, target.property, Number(target.baseValue) || 0);
                });
            });
        }

        _applyConfig(owner, config, localTimeMs, options = {}) {
            const configuredSampleMs = options.forceFaceSampleMs
                ?? this._exportFaceSampleMsByConfig?.get(config)
                ?? 0;
            const faceSampleMs = Math.max(0, Number(configuredSampleMs) || 0);
            const duration = Math.max(1, Number(config.duration) || 1);
            const faceTimeMs = config.adapterKind === 'svg-african-native' && faceSampleMs > 0
                ? Math.min(duration, Math.round(Math.max(0, localTimeMs) / faceSampleMs) * faceSampleMs)
                : localTimeMs;
            const frame = Runtime.evaluate(config, faceTimeMs);
            const performance = Runtime.evaluatePerformance(config, localTimeMs);
            const facePerformance = faceTimeMs === localTimeMs
                ? performance
                : Runtime.evaluatePerformance(config, faceTimeMs);
            if (config.adapterKind === 'realistic-3d') {
                const obj = this.objects?.getObjectById?.(config.rootId);
                Runtime.applyRealistic3DSpeech(obj, config, frame, facePerformance);
                this.stage?.requestRender?.();
            } else if (config.adapterKind === 'universal-features') {
                (config.targets || []).forEach(target => {
                    const mouth = this.objects?.getObjectById?.(target.objectId);
                    const source = this._getUniversalVisemeSource(
                        target,
                        frame,
                        config.mouthOpeningGain ?? config.svgMouthGain ?? 1.45
                    );
                    if (!mouth || !source) return;
                    const image = this._preloadImage(source);
                    this._applyPreloadedImage(mouth, image, source, '_audioLipSyncViseme', frame.viseme);
                    if (performance.eyeMovement) {
                        const eyeState = Runtime.getUniversalEyeState(performance);
                        (target.eyes || []).forEach(eyeTarget => {
                            const eye = this.objects?.getObjectById?.(eyeTarget.objectId);
                            const eyeSource = this._getUniversalEyeSource(target, eyeTarget, eyeState);
                            if (!eye || !eyeSource) return;
                            const eyeImage = this._preloadImage(eyeSource);
                            this._applyPreloadedImage(eye, eyeImage, eyeSource, '_audioLipSyncEyeState', eyeState);
                        });
                    }
                    if (performance.facialExpression) {
                        (target.brows || []).forEach(browTarget => {
                            const brow = this.objects?.getObjectById?.(browTarget.objectId);
                            const browState = Runtime.getUniversalBrowState(performance, browTarget.variant);
                            const browSource = this._getUniversalBrowSource(target, browTarget, browState);
                            if (!brow || !browSource) return;
                            const browImage = this._preloadImage(browSource);
                            this._applyPreloadedImage(brow, browImage, browSource, '_audioLipSyncBrowState', browState);
                        });
                    }
                });
            } else {
                const head = this._resolveSvgLipSyncHead(owner, config);
                if (head) {
                    const state = this.animations?._getSvgAfricanFaceState?.(head) || {};
                    const channels = Runtime.amplifySvgMouthChannels(
                        frame.channels,
                        config.mouthOpeningGain ?? config.svgMouthGain ?? 1.45,
                        config.showTeeth === false ? 0 : config.teethVisibility ?? .6
                    );
                    Object.entries(channels).forEach(([channel, value]) => {
                        state[channel] = this.animations?._clampSvgAfricanFaceValue?.(channel, value) ?? value;
                    });
                    if (facePerformance.eyeMovement) {
                        ['gazeX', 'gazeY', 'blink'].forEach(channel => {
                            const value = facePerformance[channel];
                            state[channel] = this.animations?._clampSvgAfricanFaceValue?.(channel, value) ?? value;
                        });
                    }
                    if (facePerformance.headMovement) {
                        ['headNod', 'headTilt'].forEach(channel => {
                            const value = facePerformance[channel];
                            state[channel] = this.animations?._clampSvgAfricanFaceValue?.(channel, value) ?? value;
                        });
                    }
                    if (facePerformance.facialExpression && config.faceBaseline) {
                        const semanticFace = {
                            browRaise: (Number(config.faceBaseline.browRaise) || 0) + (Number(facePerformance.browRaise) || 0),
                            smile: (Number(config.faceBaseline.smile) || 0) + (Number(facePerformance.smile) || 0)
                        };
                        Object.entries(semanticFace).forEach(([channel, value]) => {
                            state[channel] = this.animations?._clampSvgAfricanFaceValue?.(channel, value) ?? value;
                        });
                    }
                    head._svgAfricanFaceState = { ...state };
                    head._svgAfricanFaceTransientActive = true;
                    this.animations?._queueSvgAfricanFaceStateRender?.(head, { transient: true });
                }
            }
            if (!options.faceOnly) this._applyPerformanceTargets(config, performance, options);
            return { ...frame, performance };
        }

        applyTimelineClips(frames = []) {
            const latestByCharacter = new Map();
            frames.forEach(frame => {
                const key = frame?.config?.characterKey || `${frame?.owner?.id || ''}`;
                latestByCharacter.set(key, frame);
            });
            latestByCharacter.forEach(frame => this._applyConfig(
                frame.owner,
                frame.config,
                frame.localTimeMs,
                { composeWithCurrent: true }
            ));
        }

        clearFrameOverrides() {
            (this.objects?.objects || []).forEach(obj => {
                if (obj?._svgAfricanFaceImageCache instanceof Map
                    || Object.prototype.hasOwnProperty.call(obj || {}, '_svgAfricanFaceTransientActive')) {
                    obj._svgAfricanFaceTransientActive = false;
                }
                delete obj._realistic3DSpeech;
                delete obj._audioLipSyncImageElement;
                delete obj._audioLipSyncFrameActive;
                delete obj._audioLipSyncPendingSource;
                delete obj._audioLipSyncViseme;
                delete obj._audioLipSyncEyeState;
                delete obj._audioLipSyncBrowState;
            });
        }

        async waitForFrameReady(timeoutMs = 800) {
            this.animations?._flushSvgAfricanFaceStateRenders?.();
            const pending = [];
            this.imageCache.forEach(image => {
                if (image?._audioLipSyncReadyPromise) pending.push(image._audioLipSyncReadyPromise);
            });
            (this.objects?.objects || []).forEach(obj => {
                if (obj?._svgAfricanFacePendingImagePromise) pending.push(obj._svgAfricanFacePendingImagePromise);
            });
            const unique = [...new Set(pending)];
            if (!unique.length) return true;
            let timeoutId = null;
            await Promise.race([
                Promise.allSettled(unique),
                new Promise(resolve => {
                    timeoutId = setTimeout(resolve, Math.max(50, Number(timeoutMs) || 800));
                })
            ]);
            if (timeoutId != null) clearTimeout(timeoutId);
            return true;
        }

        async previewDraft(options = {}) {
            if (!this.context) return false;
            if (this.wordEditsPending || this.draftDirty || !this.draftCues.length) {
                const generated = await this.generateDraft({ preservePerformance: this.performanceDraftEdited });
                if (!generated) return false;
            }
            if (!this._validatePerformanceLinks()) return false;
            this.stopPreview();
            const settings = this._readSettings();
            const config = this._buildConfig(settings);
            const previewContext = this.context;
            const previewAudio = this.app?.audioTimeline || this.audioTimeline;
            const previewBuffer = previewAudio?.audioBuffer;
            const previewSource = this._getWordTimingContext(settings);
            const previewToken = {};
            this._previewRequestToken = previewToken;
            if (config.adapterKind === 'universal-features') {
                this._setStatus('Preparing smooth mouth motion...');
                await this._prewarmUniversalMouthFrames(config);
            }
            if (this._previewRequestToken !== previewToken || this.context !== previewContext) return false;
            const currentSource = this._getWordTimingContext();
            if ((this.app?.audioTimeline || this.audioTimeline) !== previewAudio
                || previewAudio?.audioBuffer !== previewBuffer
                || Object.keys(previewSource).some(key => previewSource[key] !== currentSource[key])
                || JSON.stringify(settings) !== JSON.stringify(this._readSettings())) {
                this.stopPreview();
                this._setStatus('Audio or settings changed. Preview again.', 'warning');
                return false;
            }
            const audio = this.app?.audioTimeline || this.audioTimeline;
            const audioElement = audio?.audioElement;
            const svgHead = config.adapterKind === 'svg-african-native'
                ? this.objects?.getObjectById?.(config.targetHeadId)
                : null;
            const savedSvgState = svgHead ? Utils.deepClone(this.animations?._getSvgAfricanFaceState?.(svgHead) || {}) : null;
            const cueRange = Number.isInteger(options.wordIndex)
                ? this._getWordPreviewRange(options.wordIndex, settings.duration, settings.offsetMs)
                : Number.isInteger(options.performanceIndex)
                ? this._getPerformanceCuePreviewRange(options.performanceIndex, settings.duration)
                : Number.isFinite(options.audioTimeMs)
                ? {
                    kind: 'timeline', index: -1,
                    startMs: Math.max(0, Math.min(this._reviewDuration() - 1, options.audioTimeMs)) - settings.offsetMs,
                    endMs: this._reviewDuration() - settings.offsetMs
                }
                : null;
            if (Number.isInteger(options.wordIndex) && !cueRange) {
                this._setStatus('This segment is outside the audio after the offset. Adjust the offset to play it.', 'warning');
                return false;
            }
            const previewStartMs = cueRange?.startMs || 0;
            const previewEndMs = cueRange?.endMs || settings.duration;
            let startedAt = null;
            let audioPausedAtRangeEnd = false;
            const previewDuration = cueRange
                ? Math.max(1, previewEndMs - previewStartMs)
                : settings.duration + Math.max(0, settings.offsetMs);
            if (audioElement) {
                try {
                    audioElement.pause();
                    const cueSourceOffset = cueRange ? previewStartMs + settings.offsetMs : 0;
                    const sourceTimeMs = Math.max(
                        settings.sourceStartMs,
                        Math.min(settings.sourceEndMs, settings.sourceStartMs + cueSourceOffset)
                    );
                    audioElement.currentTime = sourceTimeMs / 1000;
                    audioElement.volume = audio.volume;
                    if (sourceTimeMs < settings.sourceEndMs) void audioElement.play().catch(() => {});
                } catch (_) {}
            }
            this.activeWordPreviewIndex = cueRange?.kind === 'word' ? cueRange.index : -1;
            this.activePerformancePreviewIndex = cueRange && cueRange.kind !== 'word' ? cueRange.index : -1;
            this.modal?.classList.toggle('als-cue-auditioning', !!cueRange && cueRange.kind !== 'timeline');
            this.modal?.querySelectorAll('[data-performance-index]').forEach(row => {
                row.classList.toggle('is-previewing', Number(row.dataset.performanceIndex) === this.activePerformancePreviewIndex);
            });
            this.modal?.querySelectorAll('[data-word-index]').forEach(row => {
                row.classList.toggle('is-previewing', Number(row.dataset.wordIndex) === this.activeWordPreviewIndex);
            });
            this._updateReviewCursor(cueRange ? previewStartMs + settings.offsetMs : 0, true);
            this.modal?.querySelector('[data-als-action="review-stop"]')?.removeAttribute('disabled');
            const tick = timestamp => {
                if (startedAt == null) startedAt = timestamp;
                const elapsed = timestamp - startedAt;
                const localTimeMs = cueRange
                    ? previewStartMs + elapsed
                    : elapsed - settings.offsetMs;
                const audioPreviewDuration = cueRange
                    ? Math.min(previewDuration, Math.max(0, settings.duration - previewStartMs - settings.offsetMs))
                    : settings.duration;
                if (!audioPausedAtRangeEnd && elapsed >= audioPreviewDuration) {
                    audioPausedAtRangeEnd = true;
                    try { audioElement?.pause?.(); } catch (_) {}
                }
                if (elapsed >= previewDuration) {
                    this._updateReviewCursor(cueRange ? previewEndMs + settings.offsetMs : this._reviewDuration(), true);
                    this.stopPreview({ svgHead, savedSvgState, config });
                    return;
                }
                this._restorePerformanceTargets(config);
                this._applyConfig(this.context.root, config, localTimeMs);
                this.animations?._flushSvgAfricanFaceStateRenders?.();
                this.objects?._resolvePins?.();
                this.stage?.requestRender?.();
                this._updateReviewCursor(localTimeMs + settings.offsetMs);
                this.previewFrame = requestAnimationFrame(tick);
            };
            this.previewFrame = requestAnimationFrame(tick);
            this._previewRestore = { svgHead, savedSvgState, config };
            this._setStatus(cueRange?.kind === 'timeline' ? 'Previewing from cursor...'
                : cueRange ? `Previewing ${cueRange.kind === 'word' ? 'segment' : 'performance cue'} ${cueRange.index + 1}...` : 'Previewing...');
            return true;
        }

        stopPreview(restore = this._previewRestore) {
            this._previewRequestToken = null;
            if (this.previewFrame) cancelAnimationFrame(this.previewFrame);
            this.previewFrame = null;
            const audioElement = (this.app?.audioTimeline || this.audioTimeline)?.audioElement;
            try { audioElement?.pause?.(); } catch (_) {}
            this.clearFrameOverrides();
            if (restore?.svgHead && restore.savedSvgState) {
                restore.svgHead._svgAfricanFaceState = Utils.deepClone(restore.savedSvgState);
                this.animations?._renderSvgAfricanFaceStateToImage?.(restore.svgHead);
            }
            if (restore?.config) this._restorePerformanceTargets(restore.config);
            this._previewRestore = null;
            this.activePerformancePreviewIndex = -1;
            this.activeWordPreviewIndex = -1;
            this.modal?.querySelector('[data-als-action="review-stop"]')?.setAttribute('disabled', '');
            this.modal?.classList.remove('als-cue-auditioning');
            this.modal?.querySelectorAll('[data-performance-index].is-previewing, [data-word-index].is-previewing').forEach(row => {
                row.classList.remove('is-previewing');
            });
            this.stage?.requestRender?.();
            if (this.modal && !this.modal.classList.contains('hidden')) {
                this._setStatus(`${this.draftCues.length} mouth cues | ${this.draftPerformanceEvents.length} performance cues`);
            }
        }
    }

    AudioLipSyncManager.transcriptionLanguageOptions = () => Object.entries({
        auto: 'Automatic', en: 'English', fr: 'French', ar: 'Arabic', pt: 'Portuguese', es: 'Spanish',
        sw: 'Swahili', yo: 'Yoruba', ha: 'Hausa', af: 'Afrikaans', am: 'Amharic', so: 'Somali', sn: 'Shona'
    }).map(([code, label]) => `<option value="${code}">${label}</option>`).join('');
    global.AudioLipSyncManager = AudioLipSyncManager;
})(typeof globalThis !== 'undefined' ? globalThis : window);
