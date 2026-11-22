// Encode timeline samples, not wall-clock playback. Slow rendering must not
// change the duration of either track or skip a speech/animation frame.
export async function readTimelineAudioBytes(source) {
    const value = String(source || '');
    if (!value) throw new Error('Missing audio source');
    if (/^data:/i.test(value)) {
        // Embedded project audio is already local. Fetching it is prohibited by
        // the editor's connect-src policy even though media-src permits playback.
        const comma = value.indexOf(',');
        if (comma < 0) throw new Error('Invalid audio data URL');
        const meta = value.slice(0, comma), payload = value.slice(comma + 1);
        if (/%(?![0-9a-f]{2})/i.test(payload)) throw new Error('Invalid audio byte escape');
        const binary = /;base64\s*$/i.test(meta)
            ? atob(decodeURIComponent(payload))
            : payload.replace(/%([0-9a-f]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return bytes.buffer;
    }
    const response = await fetch(value);
    if (!response.ok) throw new Error(`Audio request returned HTTP ${response.status}`);
    return response.arrayBuffer();
}

export async function createTimelineMp4(canvas, fps, segments, subtitles = []) {
    if (!globalThis.VideoEncoder || !globalThis.AudioEncoder || !globalThis.OfflineAudioContext) return null;
    const url = new URL('./vendor/mediabunny/mediabunny.js', import.meta.url);
    url.search = new URL(import.meta.url).search;
    let media;
    try { media = await import(url.href); }
    catch (cause) {
        throw Object.assign(new Error('The MP4 encoder could not be loaded. Reload the editor while online and retry.', { cause }), { code: 'EXPORT_ENCODER_LOAD' });
    }
    const audioInfos = segments.flatMap(segment => segment.audio || []).filter(info => !info.audioTrack.muted && info.audioTrack.volume > 0);
    const videoOptions = { width: canvas.width, height: canvas.height, frameRate: fps, bitrate: Math.max(1500000, Math.min(16000000, canvas.width * canvas.height * fps * .12)) };
    if (!await media.canEncodeVideo('avc', videoOptions)
        || audioInfos.length && !await media.canEncodeAudio('aac', { sampleRate: 48000, numberOfChannels: 2, bitrate: 192000 })) return null;
    const durationMs = segments.reduce((sum, segment) => sum + segment.duration, 0);
    const sampleRate = 48000, totalSamples = Math.round(durationMs * sampleRate / 1000);
    const decoded = new Map(), decoder = new OfflineAudioContext(2, 1, sampleRate);
    for (const [index, info] of audioInfos.entries()) {
        const source = info.audioTrack.dataUrl;
        if (decoded.has(source)) continue;
        let bytes;
        try { bytes = await readTimelineAudioBytes(source); }
        catch (cause) {
            throw Object.assign(new Error(`Audio clip ${index + 1} could not be loaded for MP4 export. Reopen the saved project or re-import this audio clip.`, { cause }), { code: 'EXPORT_AUDIO_LOAD' });
        }
        try { decoded.set(source, await decoder.decodeAudioData(bytes)); }
        catch (cause) {
            throw Object.assign(new Error(`Audio clip ${index + 1} could not be decoded for MP4 export. Re-import a playable audio file.`, { cause }), { code: 'EXPORT_AUDIO_DECODE' });
        }
    }
    const parts = [];
    // This bundled muxer cannot finalize fragmented WebVTT tracks. Keep the
    // streaming path for ordinary exports; subtitle exports use a seekable target.
    const subtitleTarget = subtitles.length ? new media.BufferTarget() : null;
    const output = new media.Output({
        format: new media.Mp4OutputFormat({ fastStart: subtitleTarget ? false : 'fragmented' }),
        target: subtitleTarget || new media.AppendOnlyStreamTarget(new WritableStream({
            write(data) { parts.push(new Blob([data])); }
        }))
    });
    const video = new media.CanvasSource(canvas, { codec: 'avc', bitrate: videoOptions.bitrate, keyFrameInterval: 2 });
    // Explicit timestamps include partial scene/end frames. Declaring a fixed
    // track cadence quantizes those frames and can truncate the final hold.
    output.addVideoTrack(video);
    const audio = audioInfos.length ? new media.AudioBufferSource({ codec: 'aac', bitrate: 192000 }) : null;
    if (audio) output.addAudioTrack(audio);
    const subtitleSources = subtitles.map(track => {
        const source = new media.TextSubtitleSource('webvtt');
        const codes = { en: 'eng', fr: 'fra', es: 'spa', de: 'deu', pt: 'por', ar: 'ara', zh: 'zho', ja: 'jpn', ko: 'kor', hi: 'hin', yo: 'yor', ig: 'ibo', ha: 'hau', he: 'heb', ur: 'urd', ru: 'rus', it: 'ita' };
        const language = String(track.language || '').toLowerCase().split('-')[0];
        output.addSubtitleTrack(source, { languageCode: codes[language] || (/^[a-z]{3}$/.test(language) ? language : 'und'), name: track.language || 'Captions', disposition: { default: false } });
        return { source, cues: track.cues, cursor: 0 };
    });
    let audioCursor = 0, frameCount = 0, videoEndMs = 0;
    const addAudioThrough = async timeMs => {
        if (!audio) return;
        const target = Math.min(totalSamples, Math.ceil(timeMs * sampleRate / 1000));
        while (audioCursor < target) {
            const length = Math.min(sampleRate, totalSamples - audioCursor);
            const buffer = new AudioBuffer({ length, sampleRate, numberOfChannels: 2 });
            let segmentStart = 0;
            for (const segment of segments) {
                const segmentEnd = segmentStart + segment.duration;
                const begin = Math.max(audioCursor, Math.round(segmentStart * sampleRate / 1000));
                const end = Math.min(audioCursor + length, Math.round(segmentEnd * sampleRate / 1000));
                for (const info of segment.audio || []) {
                    const track = info.audioTrack, source = decoded.get(track.dataUrl);
                    if (!source || track.muted || track.volume <= 0 || end <= begin) continue;
                    const trim = Math.round(track.trimStartMs * sampleRate / 1000);
                    const shift = Math.round((track.trimStartMs + (info.offsetMs || 0) - track.timelineStartMs - segmentStart) * sampleRate / 1000);
                    const duration = track.durationMs > 0 ? track.durationMs : source.duration * 1000;
                    const trimEnd = track.trimEndMs > track.trimStartMs ? track.trimEndMs : track.trimStartMs + duration;
                    const stop = Math.min(source.length, Math.round(trimEnd * sampleRate / 1000), trim + Math.round(duration * sampleRate / 1000));
                    const first = Math.max(begin, trim - shift), last = Math.min(end, stop - shift);
                    for (let channel = 0; channel < 2; channel++) {
                        const src = source.getChannelData(Math.min(channel, source.numberOfChannels - 1));
                        const dst = buffer.getChannelData(channel);
                        for (let i = first; i < last; i++) dst[i - audioCursor] += src[i + shift] * track.volume;
                    }
                }
                segmentStart = segmentEnd;
            }
            await audio.add(buffer);
            audioCursor += length;
        }
    };
    try { await output.start(); } catch (error) { await output.cancel(); throw error; }
    try {
        for (const { source } of subtitleSources) await source.add('WEBVTT\n\n');
    } catch (error) { await output.cancel(); throw error; }
    const addSubtitlesThrough = async timeMs => {
        for (const track of subtitleSources) {
            while (track.cursor < track.cues.length && track.cues[track.cursor].startMs <= timeMs) {
                const cue = track.cues[track.cursor++];
                const clean = String(cue.text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                const stamp = ms => { const value = Math.max(0, Math.round(ms)); return `${String(Math.floor(value / 3600000)).padStart(2, '0')}:${String(Math.floor(value / 60000) % 60).padStart(2, '0')}:${String(Math.floor(value / 1000) % 60).padStart(2, '0')}.${String(value % 1000).padStart(3, '0')}`; };
                await track.source.add(`${stamp(cue.startMs)} --> ${stamp(cue.endMs)}\n${clean}\n\n`);
            }
        }
    };
    return {
        async addFrame(timeMs, frameDurationMs) {
            if (Math.abs(timeMs - videoEndMs) > .01 || frameDurationMs <= 0) throw new Error('MP4 timeline contains a missing or overlapping frame.');
            await addAudioThrough(timeMs + frameDurationMs);
            await addSubtitlesThrough(timeMs + frameDurationMs);
            await video.add(timeMs / 1000, frameDurationMs / 1000);
            frameCount++;
            videoEndMs = timeMs + frameDurationMs;
        },
        async finish() {
            if (!frameCount || Math.abs(videoEndMs - durationMs) > .01) throw new Error('MP4 timeline did not reach the final frame.');
            await addAudioThrough(durationMs);
            await addSubtitlesThrough(durationMs);
            subtitleSources.forEach(track => track.source.close());
            video.close(); audio?.close();
            await output.finalize();
            decoded.clear();
            const blob = new Blob(subtitleTarget ? [subtitleTarget.buffer] : parts, { type: 'video/mp4' });
            parts.length = 0;
            blob._timelineEncoding = { durationMs, frames: frameCount, audioSamples: audio ? audioCursor : 0, sampleRate };
            return blob;
        },
        async cancel() {
            try { await output.cancel(); } finally { decoded.clear(); parts.length = 0; }
        }
    };
}
