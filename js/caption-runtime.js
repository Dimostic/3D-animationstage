/* Shared caption data, layout and standalone playback. Keep this factory self-contained. */
(function (global) {
    'use strict';
    function createCaptionRuntime() {
        const copy = value => JSON.parse(JSON.stringify(value));
        const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
        const uid = () => globalThis.crypto?.randomUUID?.() || `cue-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const text = value => String(value || '').replace(/\r\n?/g, '\n').trim();
        const graphemes = value => typeof Intl.Segmenter === 'function'
            ? Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(value), item => item.segment) : Array.from(value);
        function normalize(cue) {
            const startMs = Math.max(0, number(cue.startMs));
            const endMs = Math.max(startMs + 1, number(cue.endMs, startMs + 2000));
            return { ...copy(cue), id: text(cue.id) || uid(), startMs, endMs, text: text(cue.text),
                secondary: text(cue.secondary), speaker: text(cue.speaker), kind: cue.kind === 'sound' ? 'sound' : 'speech',
                reviewed: cue.reviewed === true, timingSource: cue.timingSource || 'estimated' };
        }
        function shift(cue, delta) {
            return { ...copy(cue), startMs: cue.startMs + delta, endMs: cue.endMs + delta,
                words: cue.words?.map(word => ({ ...word, startMs: word.startMs + delta, endMs: word.endMs + delta })) };
        }
        const label = (cue, secondary = false) => {
            const value = text(secondary ? cue.secondary : cue.text);
            if (!value) return '';
            return cue.kind === 'sound' ? (/^\[.*\]$/.test(value) ? value : `[${value}]`)
                : (cue.speaker ? `${cue.speaker}: ${value}` : value);
        };
        function merge(existing, incoming, range = null) {
            // A partial pass cannot replace a cue that extends beyond its range.
            const scoped = cue => !range || (cue.startMs >= range.startMs && cue.endMs <= range.endMs);
            const normalized = existing.map(normalize);
            const old = normalized.filter(scoped), outside = normalized.filter(cue => !scoped(cue)), used = new Set();
            const nextCues = incoming.map(normalize), consumed = new Set(), repaired = [];
            for (const prior of old) {
                if (wordRanges(prior).length >= tokens(prior.text).length) continue;
                const pieces = nextCues.filter(c => !consumed.has(c.id) && c.timingSource === 'recognized' && c.words?.length
                    && c.startMs >= prior.startMs && c.endMs <= prior.endMs && (!c.speaker || !prior.speaker || c.speaker === prior.speaker))
                    .sort((a, b) => a.startMs - b.startMs);
                if (pieces.length < 2 || compact(pieces.map(c => c.text).join(' ')) !== compact(prior.text)) continue;
                repaired.push({ ...prior, words: pieces.flatMap(c => c.words.map(w => ({ ...w, timingSource: 'recognized' }))), timingSource: 'aligned', reviewNeeded: true });
                used.add(prior.id); pieces.forEach(c => consumed.add(c.id));
            }
            const result = nextCues.filter(c => !consumed.has(c.id)).map(next => {
                const prior = old.find(cue => !used.has(cue.id) && (cue.id === next.id
                    || (Math.abs(cue.startMs - next.startMs) < 30 && Math.abs(cue.endMs - next.endMs) < 30)
                    || (cue.startMs < next.endMs && cue.endMs > next.startMs && (cue.text === next.text || cue.generatedText === next.text))));
                if (!prior) return { ...next, generatedText: next.text };
                used.add(prior.id);
                // Legacy cues have no provenance; preserving them is safer than guessing.
                if (prior.edited || prior.reviewed || prior.secondary || !prior.generatedText) {
                    // A fresh transcription can repair highlighting without changing
                    // protected wording, translation or manually chosen cue boundaries.
                    if (compact(prior.text) === compact(next.text) && next.words?.length && next.timingSource === 'recognized'
                        && wordRanges(prior).length < tokens(prior.text).length) {
                        const words = next.words.filter(w => w.startMs >= prior.startMs && w.endMs <= prior.endMs)
                            .map(w => ({ ...w, timingSource: 'recognized' }));
                        if (words.length) return { ...prior, words, timingSource: 'aligned', reviewNeeded: true };
                    }
                    return prior;
                }
                return { ...next, id: prior.id, generatedText: next.text, speaker: prior.speaker, kind: prior.kind };
            });
            result.push(...repaired, ...outside);
            old.forEach(cue => {
                if (!used.has(cue.id) && (cue.edited || cue.reviewed || cue.secondary || !cue.generatedText)) {
                    result.push({ ...cue, reviewNeeded: true });
                }
            });
            return result.sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);
        }
        function bind(obj, track) {
            if (!track) return;
            obj.captionAudioId = track.audioId;
            obj.captionBinding = { timelineStartMs: number(track.timelineStartMs), trimStartMs: number(track.trimStartMs), revision: number(track.audioRevision, 1) };
            const delta = obj.captionBinding.trimStartMs - obj.captionBinding.timelineStartMs;
            obj.captionSourceSegments = (obj.segments || []).map(cue => shift(normalize(cue), delta));
            obj.captionStale = '';
        }
        function saveEdits(obj, previous = [], options = {}) {
            if (!obj.captionAudioId || !obj.captionBinding) return;
            const visibleIds = new Set(previous.map(cue => cue.id));
            const nextIds = new Set((obj.segments || []).map(cue => cue.id));
            const hidden = options.replace ? [] : (obj.captionSourceSegments || []).filter(cue => !visibleIds.has(cue.id) && !nextIds.has(cue.id));
            const delta = obj.captionBinding.trimStartMs - obj.captionBinding.timelineStartMs;
            obj.captionSourceSegments = [...hidden, ...(obj.segments || []).map(cue => {
                const old = previous.find(item => item.id === cue.id), master = obj.captionSourceSegments?.find(item => item.id === cue.id);
                if (old && master && JSON.stringify(old) === JSON.stringify(cue)) return master;
                const updated = shift(cue, delta);
                if (old && master && old.startMs === cue.startMs && old.endMs === cue.endMs) {
                    updated.startMs = master.startMs; updated.endMs = master.endMs;
                    if (old.text === cue.text && JSON.stringify(old.words) === JSON.stringify(cue.words)) updated.words = master.words;
                }
                return updated;
            })].sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);
        }
        function arrangeSpeakers(objects) {
            const groups = new Map();
            for (const obj of objects || []) {
                const p = obj.captionProfile;
                if (obj.type !== 'caption' || p?.presentation === 'bubble' || !p?.stackSpeakers || !(p.stackStageHeight > 0) || obj.visible === false) continue;
                const key = `${p.stackStageHeight}:${p.stackPlacement || 'bottom'}`;
                if (!groups.has(key)) groups.set(key, []);
                groups.get(key).push(obj);
            }
            for (const group of groups.values()) {
                const lanes = [];
                const overlaps = (a, b) => (a.segments || []).some(x => (b.segments || []).some(y => x.startMs < y.endMs && y.startMs < x.endMs));
                // Stable object order keeps rows deterministic across save/load and renderers.
                for (const obj of group) {
                    let lane = lanes.findIndex(items => items.every(other => !overlaps(obj, other)));
                    if (lane < 0) { lane = lanes.length; lanes.push([]); }
                    lanes[lane].push(obj);
                }
                const H = group[0].captionProfile.stackStageHeight, gap = H * .015;
                const height = Math.min(H * .21, Math.max(1, (H * .9 - gap * (lanes.length - 1)) / lanes.length));
                const total = height * lanes.length + gap * (lanes.length - 1);
                const placement = group[0].captionProfile.stackPlacement || 'bottom';
                const top = placement === 'top' ? H * .05 : placement === 'middle' ? (H - total) / 2 : H * .95 - total;
                lanes.forEach((items, index) => items.forEach(obj => {
                    obj.height = height;
                    obj.y = top + (placement === 'bottom' ? lanes.length - 1 - index : index) * (height + gap);
                }));
            }
        }
        function sync(objects, track, previous, options = {}) {
            for (const obj of objects || []) {
                if (obj.type !== 'caption' || !obj.captionAudioId || obj.captionAudioId !== track.audioId) continue;
                if (!obj.captionBinding) bind(obj, { ...previous, audioId: track.audioId });
                if (options.sourceReplaced) {
                    obj.captionStale = 'Audio replaced: review or regenerate captions.';
                    [obj.segments, obj.captionSourceSegments].forEach(list => (list || []).forEach(cue => { cue.reviewed = false; cue.reviewNeeded = true; }));
                    continue;
                }
                const trim = number(track.trimStartMs), end = number(track.trimEndMs) || number(track.sourceDurationMs, Infinity);
                const delta = number(track.timelineStartMs) - trim;
                obj.segments = (obj.captionSourceSegments || []).filter(c => c.endMs > trim && c.startMs < end).map(cue => {
                    const clipped = { ...cue, startMs: Math.max(trim, cue.startMs), endMs: Math.min(end, cue.endMs) };
                    if (cue.words) clipped.words = cue.words.filter(w => w.endMs > trim && w.startMs < end)
                        .map(w => ({ ...w, startMs: Math.max(trim, w.startMs), endMs: Math.min(end, w.endMs) }));
                    if (clipped.startMs !== cue.startMs || clipped.endMs !== cue.endMs) clipped.reviewNeeded = true;
                    return shift(clipped, delta);
                });
                obj.captionBinding = { timelineStartMs: number(track.timelineStartMs), trimStartMs: trim, revision: number(track.audioRevision, 1) };
            }
            arrangeSpeakers(objects);
        }
        function detach(obj) {
            obj.captionAudioId = ''; obj.captionBinding = null; obj.captionSourceSegments = []; obj.captionStale = '';
        }
        function warnings(cue, profile = {}, bounds = {}) {
            profile ||= {};
            const issues = [], duration = (cue.endMs - cue.startMs) / 1000;
            const maxChars = number(profile.maxChars, 42), maxCps = number(profile.maxCps, 20), maxLines = number(profile.maxLines, 2);
            for (const value of [label(cue), text(cue.secondary)].filter(Boolean)) {
                const chars = graphemes(value.replace(/\n/g, ' ')).length;
                if (chars / duration > maxCps) issues.push('Fast reading speed');
                if (value.split('\n').some(line => graphemes(line).length > maxChars)) issues.push('Long line');
                if (value.split('\n').length > maxLines) issues.push('Too many lines');
            }
            if (duration < .833) issues.push('Very short cue');
            if (duration > 7) issues.push('Long display duration');
            if (cue.startMs < number(bounds.startMs) || cue.endMs > number(bounds.endMs, Infinity)) issues.push('Outside audio range');
            if (cue.timingSource === 'estimated') issues.push('Estimated timing');
            if (!cue.words?.length && cue.kind !== 'sound') issues.push('No word timings');
            if (cue.reviewNeeded) issues.push('Review alignment');
            if (!cue.reviewed) issues.push('Not reviewed');
            return [...new Set(issues)];
        }
        const tokens = value => text(value).split(/\s+/).filter(Boolean);
        const compact = value => text(value).replace(/\s+/g, '').toLocaleLowerCase();
        function estimateWords(cue) {
            const list = tokens(cue.text), step = (cue.endMs - cue.startMs) / Math.max(1, list.length);
            return list.map((value, i) => ({ text: value, startMs: cue.startMs + i * step, endMs: cue.startMs + (i + 1) * step, timingSource: 'estimated' }));
        }
        function wordRanges(cue, allowEstimated = false) {
            const source = compact(cue.text), prefix = Math.max(0, compact(label(cue)).length - source.length);
            let cursor = 0;
            return (cue.words?.length ? cue.words : allowEstimated ? estimateWords(cue) : []).flatMap(word => {
                const value = compact(word.text);
                const hinted = Number.isInteger(word.charOffset) && source.slice(word.charOffset, word.charOffset + value.length) === value ? word.charOffset : -1;
                const index = hinted >= cursor ? hinted : source.indexOf(value, cursor);
                if (!value || index < 0) return [];
                cursor = index + value.length;
                const estimated = (word.timingSource || cue.timingSource) === 'estimated';
                if (estimated && !allowEstimated || !Number.isFinite(word.startMs) || !Number.isFinite(word.endMs)) return [];
                return [{ ...word, from: prefix + index, to: prefix + cursor }];
            });
        }
        function joinCues(cues) {
            const sorted = [...cues].sort((a, b) => a.startMs - b.startMs);
            const dialogueTurnIds = [...new Set(sorted.flatMap(c => [c.dialogueTurnId, ...(c.dialogueTurnIds || [])]).filter(Boolean))];
            let offset = 0;
            const words = sorted.flatMap(c => {
                const prefix = Math.max(0, compact(label(c)).length - compact(c.text).length);
                const result = wordRanges(c, true).map(w => ({ text: w.text, startMs: w.startMs, endMs: w.endMs,
                    timingSource: w.timingSource || c.timingSource, charOffset: offset + w.from - prefix }));
                offset += compact(c.text).length;
                return result;
            });
            return normalize({ ...sorted[0], text: sorted.map(c => c.text).join(' '), secondary: sorted.map(c => c.secondary).join(' ').trim(),
                ...(dialogueTurnIds.length ? { dialogueTurnIds } : {}),
                startMs: sorted[0].startMs, endMs: Math.max(...sorted.map(c => c.endMs)), reviewed: false, reviewNeeded: true, edited: true,
                timingSource: sorted.every(c => c.timingSource === 'recognized') ? 'recognized' : 'aligned',
                words });
        }
        function splitCue(cue, timeMs) {
            if (cue.endMs - cue.startMs <= 2) throw new Error('This cue is too short to split. Extend its timing first.');
            const list = tokens(cue.text);
            if (list.length < 2) throw new Error('At least two words are needed to split.');
            let index = Math.max(1, Math.min(list.length - 1, Math.round(list.length * (timeMs - cue.startMs) / (cue.endMs - cue.startMs))));
            let boundary = timeMs;
            const words = cue.words || [];
            const aligned = words.length === list.length && words.every((w, i) => compact(w.text) === compact(list[i]));
            if (aligned) {
                const candidates = words.slice(1).map((w, i) => ({ index: i + 1, time: w.startMs }))
                    .filter(b => b.time > cue.startMs && b.time < cue.endMs && words[b.index - 1].endMs <= b.time);
                if (candidates.length) {
                    const best = candidates.reduce((a, b) => Math.abs(a.time - timeMs) <= Math.abs(b.time - timeMs) ? a : b);
                    index = best.index; boundary = best.time;
                }
            }
            boundary = Math.max(cue.startMs + 1, Math.min(cue.endMs - 1, boundary));
            const translation = tokens(cue.secondary), ti = Math.round(translation.length * index / list.length);
            const base = { ...cue, edited: true, reviewed: false, reviewNeeded: true };
            const leftWords = aligned ? words.slice(0, index).filter(w => w.endMs <= boundary) : undefined;
            const rightWords = aligned ? words.slice(index).filter(w => w.startMs >= boundary).map(w => ({ ...w,
                charOffset: Number.isInteger(w.charOffset) ? w.charOffset - compact(list.slice(0, index).join(' ')).length : undefined })) : undefined;
            return [normalize({ ...base, text: list.slice(0, index).join(' '), secondary: translation.slice(0, ti).join(' '), endMs: boundary, words: leftWords }),
                normalize({ ...base, id: '', text: list.slice(index).join(' '), secondary: translation.slice(ti).join(' '), startMs: boundary, words: rightWords })];
        }
        function splitLong(cue, profile = {}) {
            const limit = Math.max(15, number(profile?.maxChars, 42)) * Math.max(1, number(profile?.maxLines, 2));
            const out = []; let rest = cue;
            while (graphemes(rest.text).length > limit && tokens(rest.text).length > 1) {
                const list = tokens(rest.text); let count = 1;
                while (count < list.length - 1 && graphemes(list.slice(0, count + 1).join(' ')).length <= limit) count++;
                const at = rest.words?.length === list.length ? rest.words[count].startMs : rest.startMs + (rest.endMs - rest.startMs) * count / list.length;
                const [left, right] = splitCue(rest, at); out.push(left); rest = right;
            }
            return [...out, rest].map(c => ({ ...c, text: balance(c.text, profile?.maxChars) }));
        }
        function displaySegments(obj) {
            const mode = obj.captionProfile?.textProgression || 'full';
            const maxWords = Math.max(0, Math.min(30, Math.floor(number(obj.captionProfile?.maxWords))));
            return (obj.segments || []).flatMap(original => {
                const cue = { ...original };
                const candidates = wordRanges(cue, true);
                const aligned = compact(candidates.map(w => w.text).join(' ')) === compact(cue.text) ? candidates : [];
                if (aligned.length) {
                    cue.startMs = Math.max(cue.startMs, aligned[0].startMs);
                    cue.endMs = Math.min(cue.endMs, aligned.at(-1).endMs);
                }
                if (!(cue.endMs > cue.startMs)) return [];
                // Translation text has no reliable word correspondence to the primary
                // language. Keep paired cues intact until they are explicitly split.
                if (mode === 'full' && !maxWords || cue.kind === 'sound' || obj.bilingual && cue.secondary) return [cue];
                const words = aligned.length ? aligned : estimateWords(cue);
                if (mode === 'reveal') return words.map((word, i) => ({ ...cue, id: `${cue.id}:reveal:${i}`,
                    text: words.slice(maxWords ? Math.floor(i/maxWords)*maxWords : 0, i + 1).map(w => w.text).join(' '),
                    startMs: Math.max(cue.startMs, word.startMs),
                    endMs: Math.min(cue.endMs, words[i + 1]?.startMs ?? cue.endMs),
                    words: words.slice(maxWords ? Math.floor(i/maxWords)*maxWords : 0, i + 1).map(({from, to, charOffset, ...w}) => w),
                    timingSource: aligned.length ? cue.timingSource : 'estimated' })).filter(c => c.endMs > c.startMs);
                // Do not attach a partial/mismatched timing list to edited text.
                if (compact(words.map(w => w.text).join(' ')) !== compact(cue.text)) return [cue];
                const groups = [];
                for (const word of words) {
                    if (mode === 'word' || !groups.length || maxWords && groups.at(-1).length >= maxWords || mode === 'sentence' && /[.!?]["')\]]*$/.test(groups.at(-1).at(-1).text)) groups.push([]);
                    groups.at(-1).push(word);
                }
                return groups.map((group, i) => ({ ...cue, id: `${cue.id}:display:${i}`,
                    text: group.map(w => w.text).join(' '),
                    startMs: Math.max(cue.startMs, group[0].startMs), endMs: Math.min(cue.endMs, group.at(-1).endMs),
                    words: group.map(({from, to, charOffset, ...word}) => word),
                    timingSource: aligned.length ? cue.timingSource : 'estimated' })).filter(c => c.endMs > c.startMs);
            });
        }
        function balance(value, maxChars = 42) {
            const words = text(value).replace(/\s+/g, ' ').split(' ');
            if (text(value).length <= maxChars || words.length < 2) return text(value);
            let best = null;
            for (let i = 1; i < words.length; i++) {
                const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
                const penalty = Math.max(0, a.length - maxChars, b.length - maxChars) * 100
                    + Math.abs(a.length - b.length) + (/[,:;.!?]$/.test(a) ? -12 : 0)
                    + (/\b(a|an|the|my|your|his|her|their|to)$/i.test(a) ? 35 : 0);
                if (!best || penalty < best.penalty) best = { penalty, value: `${a}\n${b}` };
            }
            return best?.value || text(value);
        }
        function sequential(cues) {
            const sorted = cues.filter(c => c.text && c.endMs > c.startMs);
            const edges = [...new Set(sorted.flatMap(c => [Math.max(0, c.startMs), c.endMs]))].sort((a, b) => a - b);
            const out = [];
            for (let i = 0; i < edges.length - 1; i++) {
                const startMs = edges[i], endMs = edges[i + 1];
                const active = sorted.filter(c => c.startMs < endMs && c.endMs > startMs);
                const value = [...new Set(active.map(c => c.text))].join('\n');
                if (!value) continue;
                const last = out[out.length - 1];
                if (last && last.text === value && last.endMs === startMs) last.endMs = endMs;
                else out.push({ startMs, endMs, text: value });
            }
            return out;
        }
        function timecode(ms, vtt = false) {
            ms = Math.max(0, Math.round(ms));
            const pad = (v, n = 2) => String(v).padStart(n, '0');
            return `${pad(Math.floor(ms / 3600000))}:${pad(Math.floor(ms / 60000) % 60)}:${pad(Math.floor(ms / 1000) % 60)}${vtt ? '.' : ','}${pad(ms % 1000, 3)}`;
        }
        function format(cues, type = 'srt') {
            const clean = value => type === 'vtt' ? value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : value;
            if (type === 'txt') return cues.map(c => `${timecode(c.startMs)}  ${c.text}`).join('\n\n');
            return (type === 'vtt' ? 'WEBVTT\n\n' : '') + sequential(cues).map((c, i) => `${i + 1}\n${timecode(c.startMs, type === 'vtt')} --> ${timecode(c.endMs, type === 'vtt')}\n${clean(c.text)}\n`).join('\n');
        }
        function parseTimed(value, baseMs = 0) {
            const source = String(value).replace(/^\uFEFF/, '').replace(/\r/g, '');
            if (!source.includes('-->')) return null;
            const timestamp = value => {
                const match = value.match(/^(?:(\d+):)?(\d{2}):(\d{2})[.,](\d{3})$/);
                if (!match || Number(match[2]) > 59 || Number(match[3]) > 59) throw new Error('Invalid caption timestamp. Existing captions retained.');
                return ((Number(match[1] || 0) * 3600 + Number(match[2]) * 60 + Number(match[3])) * 1000) + Number(match[4]);
            };
            const cues = [];
            for (const block of source.split(/\n[ \t]*\n/)) {
                const lines = block.trim().split('\n'), index = lines.findIndex(line => line.includes('-->'));
                if (index < 0 || /^(NOTE|STYLE|REGION)(\s|$)/.test(lines[0])) continue;
                const parts = lines[index].trim().split(/\s+-->\s+/);
                if (parts.length !== 2) throw new Error('Invalid caption timing line.');
                const startMs = timestamp(parts[0]) + baseMs, endMs = timestamp(parts[1].split(/\s+/)[0]) + baseMs;
                const raw = lines.slice(index + 1).join('\n');
                const speaker = raw.match(/<v(?:\.[^ >]+)?\s+([^>]+)>/)?.[1] || '';
                const clean = raw.replace(/<[^>]*>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
                if (endMs <= startMs || !clean.trim()) throw new Error('Each imported cue needs text and an end after its start.');
                cues.push(normalize({ startMs, endMs, text: clean, speaker, timingSource: 'imported', generatedText: clean }));
            }
            if (!cues.length) throw new Error('No valid timed captions found. Existing captions retained.');
            return cues;
        }
        function layout(ctx, obj, cue) {
            const width = Math.max(1, number(obj.width, 400)), height = Math.max(1, number(obj.height, 100));
            const pad = Math.max(2, number(obj.textBackgroundPadding, 8));
            const maxW = Math.max(1, width - pad * 2), maxH = Math.max(1, height - pad * 2);
            const family = obj.fontFamily || 'Inter', weight = obj.fontWeight || '600';
            const font = size => `${obj.fontStyle === 'italic' ? 'italic ' : ''}${weight} ${size}px ${family}, sans-serif`;
            const wrap = (value, size) => {
                ctx.font = font(size);
                const lines = [];
                String(value).split('\n').forEach(par => {
                    let line = '';
                    for (const word of par.split(/\s+/).filter(Boolean)) {
                        if (line && ctx.measureText(`${line} ${word}`).width > maxW) { lines.push(line); line = ''; }
                        if (ctx.measureText(word).width > maxW) {
                            for (const char of graphemes(word)) {
                                if (line && ctx.measureText(line + char).width > maxW) { lines.push(line); line = ''; }
                                line += char;
                            }
                        } else line += (line ? ' ' : '') + word;
                    }
                    if (line) lines.push(line);
                });
                return lines;
            };
            const requested = Math.max(6, number(obj.fontSize, 28));
            const minimum = Math.min(requested, Math.max(12, number(obj.captionProfile?.minFontSize, Math.max(18, requested * .75))));
            let fs = requested, primary, secondary, lineH, gap, secondaryFs, totalH;
            do {
                secondaryFs = fs * number(obj.secondaryFontScale, .85);
                primary = wrap(label(cue), fs);
                secondary = obj.bilingual ? wrap(label(cue, true), secondaryFs) : [];
                lineH = fs * number(obj.lineHeight, 1.3);
                gap = primary.length && secondary.length ? number(obj.secondaryGap, 6) : 0;
                totalH = primary.length * lineH + secondary.length * secondaryFs * number(obj.lineHeight, 1.3) + gap;
                if (totalH <= maxH || fs <= minimum) break;
                fs = Math.max(minimum, fs - 1);
            } while (true);
            return { width, height, pad, fs, secondaryFs, primary, secondary, lineH, gap, totalH, font, clipped: totalH > maxH,
                overflow: totalH > maxH || fs < number(obj.fontSize, 28) || primary.length > number(obj.captionProfile?.maxLines, 2)
                    || secondary.length > number(obj.captionProfile?.maxLines, 2) };
        }
        const api = { normalize, shift, label, merge, bind, saveEdits, sync, detach, warnings, balance, sequential, timecode, format, parseTimed, layout,
            estimateWords, wordRanges, joinCues, splitCue, splitLong, arrangeSpeakers, displaySegments,
            outputMode: '', viewerLanguage: 'primary' };
        function viewer(obj) {
            if (typeof document === 'undefined') return;
            let control = document.getElementById('caption-language-control');
            if (!control) {
                control = document.createElement('select'); control.id = 'caption-language-control';
                control.setAttribute('aria-label', 'Captions');
                control.style.cssText = 'position:fixed;right:12px;top:12px;z-index:99999;max-width:180px;padding:7px;background:#171717;color:white;border:1px solid #888;border-radius:4px';
                for (const [value, name] of [['off', 'Captions off'], ['primary', 'Original captions'], ['both', 'Bilingual captions']]) control.add(new Option(name, value));
                control.value = api.viewerLanguage;
                control.onchange = () => {
                    api.viewerLanguage = control.value;
                    if (typeof drawRuntimeSceneFrame === 'function') drawRuntimeSceneFrame();
                };
                document.body.append(control);
            }
            for (const locale of [obj.captionLanguage || 'en', obj.bilingual ? obj.secondaryLang : ''].filter(Boolean)) {
                if (!Array.from(control.options).some(o => o.value === locale)) control.add(new Option(locale, locale));
            }
        }
        let accessibleCache = null;
        function updateAccessible(objects, timeMs) {
            if (typeof document === 'undefined') return;
            const tracks = (objects || []).filter(o => o.type === 'caption' && o.visible !== false);
            let panel = document.getElementById('caption-transcript');
            if (!tracks.length && !panel) return;
            if (!panel) {
                panel = document.createElement('details'); panel.id = 'caption-transcript';
                panel.style.cssText = 'position:fixed;right:12px;top:54px;z-index:99998;max-width:min(440px,90vw);max-height:45vh;overflow:auto;background:#171717;color:#fff;padding:8px;border:1px solid #888;border-radius:4px;font:16px Arial';
                const summary = document.createElement('summary'); summary.textContent = 'Transcript'; panel.append(summary);
                const live = document.createElement('div'); live.dataset.captionLive = ''; live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite'); live.setAttribute('aria-atomic', 'true');
                live.style.cssText = 'position:fixed;width:1px;height:1px;clip-path:inset(50%);overflow:hidden'; document.body.append(live);
                const list = document.createElement('ol'); panel.append(list); document.body.append(panel);
            }
            panel.hidden = !tracks.length;
            const signature = tracks.flatMap(o => [o, o.segments, o.captionProfile?.textProgression, o.captionProfile?.maxWords, o.captionLanguage, o.secondaryLang, o.bilingual, o.captionDelivery]);
            signature.push(api.viewerLanguage);
            const cached = accessibleCache && signature.length === accessibleCache.signature.length && signature.every((v, i) => v === accessibleCache.signature[i]);
            const entries = cached ? accessibleCache.entries : tracks.flatMap(obj => {
                if (obj.captionDelivery !== 'burn-in') viewer(obj);
                const language = obj.captionDelivery === 'burn-in' ? 'both' : api.viewerLanguage;
                if (language === 'off') return [];
                return displaySegments(obj).flatMap(c => {
                    const primary = language === 'both' || language === 'primary' || language === (obj.captionLanguage || 'en');
                    const secondary = obj.bilingual && (language === 'both' || language === obj.secondaryLang);
                    const value = [primary ? label(c) : '', secondary ? label(c, true) : ''].filter(Boolean).join('\n');
                    return value ? [{ id: `${obj.id}:${c.id}`, text: value, startMs: c.startMs, endMs: c.endMs }] : [];
                });
            }).sort((a, b) => a.startMs - b.startMs);
            const key = cached ? accessibleCache.key : JSON.stringify(entries);
            accessibleCache = { signature, entries, key };
            if (panel._captionKey !== key) {
                panel._captionKey = key;
                const list = panel.querySelector('ol'); list.replaceChildren();
                entries.forEach(c => { const li = document.createElement('li'); li.textContent = `${timecode(c.startMs)}  ${c.text}`; li.style.whiteSpace = 'pre-wrap'; list.append(li); });
            }
            const live = document.querySelector('[data-caption-live]');
            const current = entries.filter(c => timeMs >= c.startMs && timeMs < c.endMs).map(c => c.text).join('\n');
            if (live.textContent !== current) live.textContent = current;
            const control = document.getElementById('caption-language-control'); if (control) control.hidden = !tracks.some(o => o.captionDelivery !== 'burn-in');
        }
        function bubbleBounds(obj, objects) {
            const p = obj.captionProfile;
            if (p?.presentation !== 'bubble') return null;
            const target = (objects || []).find(item => item.id === p.bubbleTargetId && item.visible !== false);
            const W = number(p.bubbleStageWidth), H = number(p.stackStageHeight);
            if (!target || !(W > 0 && H > 0)) return null;
            const width = Math.min(W * .4, Math.max(120, W * .32)), height = Math.min(H * .28, Math.max(60, H * .2));
            const anchorX = number(target.x) + number(target.width) / 2;
            const anchorY = number(target.y) + number(target.height) / 2;
            const top = anchorY - Math.abs(number(target.height) * number(target.scaleY, 1)) / 2;
            const gap = H * .025, pad = W * .02;
            const x = Math.max(pad, Math.min(W - width - pad, anchorX - width / 2));
            const y = Math.max(H * .02, Math.min(H - height - H * .02, top - height - gap));
            return { x, y, width, height, anchorX, anchorY };
        }
        api.bubbleBounds = bubbleBounds;
        api.layoutObject = (obj, objects) => {
            const bounds = bubbleBounds(obj, objects);
            return bounds ? { ...obj, width: bounds.width, height: bounds.height, captionVerticalAlign: 'middle' } : obj;
        };
        api.fitSegments = (ctx, obj, cues) => {
            const fit = cue => {
                if (!layout(ctx,obj,cue).clipped || tokens(cue.text).length < 2 || cue.endMs-cue.startMs<=2) return [cue];
                return splitCue(cue,(cue.startMs+cue.endMs)/2).flatMap(fit);
            };
            return cues.flatMap(fit);
        };
        let bubbleCache = null;
        function bubbleLayouts(objects, timeMs, options = {}) {
            const signature = [timeMs, !!options.browser, !!options.bubbleGrid, api.outputMode, api.viewerLanguage,
                ...(objects || []).flatMap(o=>[o,o.id,o.x,o.y,o.width,o.height,o.scaleY,o.visible,o.opacity,o.captionDelivery,o.captionLanguage,o.secondaryLang,o.bilingual,
                    o.captionProfile?.presentation,o.captionProfile?.textProgression,o.captionProfile?.maxWords,o.captionProfile?.bubbleTargetId,o.captionProfile?.bubbleStageWidth,o.captionProfile?.stackStageHeight,
                    ...(o.segments || []).flatMap(c=>[c,c.startMs,c.endMs,c.text,c.secondary,c.words])])];
            if(bubbleCache&&signature.length===bubbleCache.signature.length&&signature.every((v,i)=>v===bubbleCache.signature[i]))return bubbleCache.result;
            const result = new Map(), placed = [];
            const captions = (objects || []).filter(obj => obj.type === 'caption' && obj.visible !== false
                && number(obj.opacity, 1) > 0 && !(api.outputMode === 'video' && obj.captionDelivery === 'selectable')
                && displaySegments(obj).some(c => timeMs >= c.startMs && timeMs < c.endMs)
                && !(options.browser && obj.captionDelivery !== 'burn-in' && (api.viewerLanguage === 'off'
                    || !['both', 'primary', obj.captionLanguage || 'en'].includes(api.viewerLanguage)
                    && !(obj.bilingual && obj.secondaryLang === api.viewerLanguage))))
                .sort((a, b) => String(a.id) < String(b.id) ? -1 : String(a.id) > String(b.id) ? 1 : 0);
            for (const obj of captions) {
                const base = bubbleBounds(obj, objects); if (!base) continue;
                const W = number(obj.captionProfile.bubbleStageWidth), H = number(obj.captionProfile.stackStageHeight);
                const gap = Math.max(4, Math.min(W, H) * .015), tail = Math.min(16, base.height * .15);
                const minX = W * .02, maxX = Math.max(minX, W * .98 - base.width);
                const minY = H * .02, maxY = Math.max(minY, H * .98 - base.height - tail);
                const xs = [base.x, minX, maxX], ys = [base.y, minY, maxY];
                for (const other of placed) {
                    xs.push(other.x - base.width - gap, other.x + other.width + gap);
                    ys.push(other.y - base.height - tail - gap, other.y + other.height + other.tail + gap);
                }
                if (options.bubbleGrid) {
                    xs.length = 0; ys.length = 0;
                    for (let x = minX; x <= maxX + .001; x += base.width + gap) xs.push(x);
                    for (let y = minY; y <= maxY + .001; y += base.height + tail + gap) ys.push(y);
                }
                let best = null;
                for (const rawX of xs) for (const rawY of ys) {
                    const x = Math.max(minX, Math.min(maxX, rawX)), y = Math.max(minY, Math.min(maxY, rawY));
                    const overlap = placed.reduce((sum, other) => sum
                        + Math.max(0, Math.min(x + base.width + gap, other.x + other.width) - Math.max(x - gap, other.x))
                        * Math.max(0, Math.min(y + base.height + tail + gap, other.y + other.height + other.tail) - Math.max(y - gap, other.y)), 0);
                    const distance = (x - base.x) ** 2 + (y - base.y) ** 2;
                    if (!best || overlap < best.overlap || overlap === best.overlap && distance < best.distance)
                        best = { ...base, x, y, tail, overlap, distance, crowded: overlap > 0 };
                }
                placed.push(best); result.set(obj.id, best);
            }
            // Greedy near-speaker placement can fragment free space. Repack into
            // fixed slots before accepting overlap in a genuinely crowded scene.
            if (!options.bubbleGrid && placed.some(box => box.crowded)) {
                const packed=bubbleLayouts(objects,timeMs,{...options,bubbleGrid:true});bubbleCache={signature,result:packed};return packed;
            }
            bubbleCache={signature,result};
            return result;
        }
        api.bubbleLayouts = bubbleLayouts;
        function paint(ctx, obj, x, y, timeMs, options = {}) {
            if (api.outputMode === 'video' && obj.captionDelivery === 'selectable') return;
            if (options.browser && obj.captionDelivery !== 'burn-in') viewer(obj);
            const language = options.browser && obj.captionDelivery !== 'burn-in' ? api.viewerLanguage : 'both';
            if (language === 'off') return;
            const active = displaySegments(obj).filter(c => timeMs >= c.startMs && timeMs < c.endMs);
            if (!active.length) return;
            const scene = options.objects || [];
            const bubble = obj.captionProfile?.presentation === 'bubble'
                ? bubbleLayouts(scene.some(item => item.id === obj.id) ? scene : [...scene, obj], timeMs, options).get(obj.id) : null;
            if (bubble) {
                x += bubble.x - number(obj.x); y += bubble.y - number(obj.y);
                obj = { ...obj, width: bubble.width, height: bubble.height, captionVerticalAlign: 'middle' };
            }
            let cue = active[0];
            if (active.length > 1) {
                let offset = 0;
                const words = active.flatMap(c => {
                    const result = wordRanges(c, true).map(w => ({ ...w, timingSource: w.timingSource || c.timingSource, charOffset: offset + w.from }));
                    offset += compact(label(c)).length; return result;
                });
                cue = { text: active.map(c => label(c)).join('\n'), secondary: active.map(c => label(c, true)).filter(Boolean).join('\n'), words, timingSource: 'aligned' };
            }
            let renderCue = cue, renderObj = obj;
            if (language !== 'both') {
                    renderObj = { ...obj, bilingual: false };
                if (language !== 'primary') {
                    if (language !== (obj.captionLanguage || 'en')) {
                        if (language !== obj.secondaryLang || !obj.bilingual) return;
                        renderCue = { ...cue, text: cue.secondary || '', words: undefined };
                        renderObj.captionLanguage = obj.secondaryLang;
                    }
                }
            }
            const l = layout(ctx, renderObj, renderCue);
            ctx.save();
            if (bubble && obj.textBackgroundEnabled) {
                const tailX = x + Math.max(12, Math.min(l.width - 12, bubble.anchorX - bubble.x));
                ctx.fillStyle = obj.textBackgroundColor || 'rgba(0,0,0,.8)';
                ctx.beginPath();ctx.moveTo(tailX-8,y+l.height-1);ctx.lineTo(tailX+8,y+l.height-1);
                ctx.lineTo(tailX,y+l.height+Math.min(16,l.height*.15));ctx.closePath();ctx.fill();
            }
            ctx.beginPath(); ctx.rect(x, y, l.width, l.height); ctx.clip();
            if (obj.textBackgroundEnabled) {
                ctx.fillStyle = obj.textBackgroundColor || 'rgba(0,0,0,.8)';
                ctx.fillRect(x, y, l.width, l.height);
            }
            const align = obj.textAlign || 'center';
            ctx.textAlign = 'left'; ctx.textBaseline = 'top';
            const valign = obj.captionVerticalAlign || 'bottom';
            let top = y + Math.max(l.pad, valign === 'top' ? l.pad : valign === 'middle' ? (l.height - l.totalH) / 2 : l.height - l.totalH - l.pad);
            const highlight = obj.captionHighlightEnabled && renderCue.kind !== 'sound';
            const ranges = highlight ? wordRanges(renderCue, !!obj.captionProfile?.estimateHighlight).filter(w => timeMs >= w.startMs && timeMs < w.endMs) : [];
            let index = 0;
            const draw = (lines, fs, color, mark, locale) => {
                ctx.font = l.font(fs);
                for (const line of lines) {
                    let left = x + (align === 'left' ? l.pad : align === 'right' ? l.width - l.pad - ctx.measureText(line).width : (l.width - ctx.measureText(line).width) / 2);
                    const rtl = /^(ar|he|fa|ur)(-|$)/i.test(locale || '');
                    ctx.direction = rtl ? 'rtl' : 'ltr'; ctx.textAlign = rtl ? 'right' : 'left';
                    const anchor = rtl ? left + ctx.measureText(line).width : left;
                    ctx.fillStyle = color;
                    if (obj.textStrokeWidth > 0) { ctx.lineWidth = obj.textStrokeWidth; ctx.strokeStyle = obj.textStrokeColor || '#000'; ctx.strokeText(line, anchor, top); }
                    ctx.fillText(line, anchor, top);
                    // Clip a second complete-line draw to preserve shaping and ligatures, including RTL.
                    for (const match of line.matchAll(/\S+/g)) {
                        const end = index + compact(match[0]).length;
                        if (mark && ranges.some(w => w.from < end && w.to > index)) {
                            const before = ctx.measureText(line.slice(0, match.index)).width, width = ctx.measureText(match[0]).width;
                            ctx.save(); ctx.beginPath(); ctx.rect(rtl ? anchor - before - width : anchor + before, top, width, fs * number(obj.lineHeight, 1.3)); ctx.clip();
                            ctx.fillStyle = obj.captionHighlightColor || '#f6c945'; ctx.fillText(line, anchor, top); ctx.restore();
                        }
                        index = end;
                    }
                    top += fs * number(obj.lineHeight, 1.3);
                }
            };
            draw(l.primary, l.fs, obj.textColor || '#fff', true, renderObj.captionLanguage);
            top += l.gap; draw(l.secondary, l.secondaryFs, obj.secondaryTextColor || '#cfe8ff', false, renderObj.secondaryLang);
            ctx.restore();
        }
        api.paint = paint;
        api.updateAccessible = updateAccessible;
        return api;
    }
    global.CaptionRuntime = createCaptionRuntime();
    global.CaptionRuntime.getStandaloneSource = () => `globalThis.CaptionRuntime = (${createCaptionRuntime.toString()})();`;
})(globalThis);
