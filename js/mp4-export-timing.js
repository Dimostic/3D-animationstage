export async function normalizeMp4Timing(blob, durationMs, videoTiming = {}) {
    const vendorUrl = new URL('./vendor/mp4box/mp4box.all.js', import.meta.url);
    vendorUrl.search = new URL(import.meta.url).search;
    const { createFile } = await import(vendorUrl.href);
    const bytes = await blob.arrayBuffer();
    bytes.fileStart = 0;
    const source = createFile(true);
    let info;
    source.onReady = value => { info = value; };
    source.onError = error => { throw new Error(`MP4 timing parse failed: ${error}`); };
    source.appendBuffer(bytes);
    source.flush();
    if (!info?.videoTracks.length) throw new Error('Recorded MP4 has no video track.');
    const video = info.videoTracks[0];
    const videoSamples = source.getTrackById(video.id).samples;
    const videoEnd = videoSamples.reduce((end, sample) => Math.max(end, sample.cts + sample.duration), 0) / video.timescale;
    const captureFrames = Number(videoTiming.captureFrames) || 0;
    const fps = Number(videoTiming.fps) || 0;
    const finalHoldMs = fps > 0 ? 1000 / fps : 0;
    // A near-complete cadence distinguishes clock drift from a legitimate held
    // final image. Never stretch a sparsely encoded/static movie to fit audio.
    const repairVideo = captureFrames >= 20 && videoSamples.length >= captureFrames * .99
        && Math.abs(videoEnd * 1000 - durationMs) >= Math.max(250, finalHoldMs);
    const videoScale = repairVideo ? durationMs / (videoEnd * 1000) : 1;
    const audio = info.audioTracks[0];
    const audioSamples = audio ? source.getTrackById(audio.id).samples : [];
    const packetEnd = audio ? audioSamples.reduce((end, sample) => Math.max(end, sample.cts + sample.duration), 0) / audio.timescale : 0;
    const collapsed = audioSamples.filter(sample => sample.duration <= 0).length;
    const repairAudio = Boolean(audio && (collapsed || Math.abs(packetEnd * 1000 - durationMs) >= 250));
    const movieEnd = info.duration / info.timescale;
    const timingFailure = message => Object.assign(new Error(message), {
        code: 'MP4_TIMING_UNSAFE',
        exportTiming: {
            expectedDurationMs: durationMs, videoDurationMs: videoEnd * 1000,
            audioDurationMs: audio ? packetEnd * 1000 : null, movieDurationMs: movieEnd * 1000,
            captureFrames, encodedVideoFrames: videoSamples.length, fps, collapsedAudioPackets: collapsed
        }
    });
    if (repairVideo && (info.videoTracks.length !== 1 || Math.abs(videoScale - 1) > .02)) {
        throw timingFailure('Recorded video timing cannot be repaired safely.');
    }
    // Recorder shutdown can extend the container duration past otherwise valid
    // samples. Remux only a complete, edit-free capture without retiming payloads.
    const repairMovieDuration = captureFrames >= 20 && videoSamples.length >= captureFrames * .99
        && movieEnd * 1000 - durationMs >= 250
        && Math.abs(videoEnd * 1000 - durationMs) < 250
        && (!audio || (!collapsed && Math.abs(packetEnd * 1000 - durationMs) < 250))
        && info.videoTracks.length === 1 && info.audioTracks.length <= 1
        && info.tracks.length === info.videoTracks.length + info.audioTracks.length
        && info.tracks.every(track => !source.getTrackById(track.id).edts?.elst?.entries?.length);
    if (!repairAudio && !repairVideo && !repairMovieDuration) return blob;
    if (repairAudio && Math.abs(videoEnd * 1000 - durationMs) >= Math.max(100, finalHoldMs)) {
        throw timingFailure('Recorded audio and video clocks both drifted; MP4 timing cannot be repaired safely. Retry as WebM or in another browser.');
    }
    if (repairAudio && (info.audioTracks.length !== 1 || !audio.codec.startsWith('mp4a.40.2'))) {
        throw timingFailure('Recorded MP4 audio timing needs repair, but its codec is not supported.');
    }

    // Decode the real PCM length: recorder pauses can collapse AAC timestamps.
    // The encoded audio/video payloads are retained without re-encoding.
    const decoded = repairAudio ? await new OfflineAudioContext(1, 1, audio.timescale).decodeAudioData(bytes.slice(0)) : null;
    if (decoded && Math.abs(decoded.duration * 1000 - durationMs) >= 250) {
        throw timingFailure('Recorded audio is incomplete; its timing cannot be repaired safely.');
    }
    const framesPerPacket = decoded ? decoded.length / audioSamples.length : 0;
    if (decoded && Math.abs(framesPerPacket - 1024) > 2) throw timingFailure('Unexpected AAC packet framing.');
    const output = createFile();
    output.init({ timescale: 1000, duration: Math.round(durationMs), brands: ['iso6', 'mp41'] });
    const samples = [];
    for (const track of info.tracks) {
        const original = source.getTrackById(track.id);
        const entry = original.mdia.minf.stbl.stsd.entries[0];
        const isAudio = repairAudio && track.id === audio.id;
        const scale = track.id === video.id ? videoScale : 1;
        const mediaDuration = isAudio ? decoded.length : track.id === video.id
            ? Math.round(Math.max(durationMs / 1000, videoEnd * scale) * track.timescale)
            : original.samples.reduce((end, sample) => Math.max(end, sample.cts + sample.duration), 0);
        const id = output.addTrack({ type: entry.type, timescale: track.timescale,
            duration: Math.round(mediaDuration / track.timescale * 1000), media_duration: mediaDuration,
            hdlr: original.mdia.hdlr.handler, width: entry.width, height: entry.height,
            channel_count: entry.channel_count, samplerate: entry.samplerate, samplesize: entry.samplesize,
            language: original.mdia.mdhd.languageString || 'und', description_boxes: entry.boxes });
        if (!id) throw new Error(`Cannot preserve recorded MP4 track ${track.id}.`);
        original.samples.forEach((sample, index) => {
            const payload = source.getSample(original, index);
            if (!payload?.data) throw new Error('Recorded MP4 sample payload is missing.');
            const start = isAudio ? Math.round(index * framesPerPacket) : Math.round(sample.dts * scale);
            const end = isAudio ? Math.round((index + 1) * framesPerPacket)
                : index === original.samples.length - 1 && track.id === video.id ? Math.max(start + Math.round(sample.duration * scale), mediaDuration)
                    : Math.round((sample.dts + sample.duration) * scale);
            samples.push({ id, data: payload.data, seconds: start / track.timescale,
                options: { duration: end - start, dts: start, cts: isAudio ? start : Math.round(sample.cts * scale), is_sync: sample.is_sync } });
        });
    }
    samples.sort((a, b) => a.seconds - b.seconds);
    for (const sample of samples) output.addSample(sample.id, sample.data, sample.options);
    for (const box of output.boxes) box.computeSize();
    const repaired = new Blob([output.getBuffer().buffer], { type: 'video/mp4' });
    repaired._mp4TimingRepair = { collapsedAudioPackets: collapsed, originalAudioSeconds: packetEnd,
        repairedAudioSeconds: decoded?.duration ?? packetEnd, videoScale,
        movieDurationOnly: repairMovieDuration && !repairAudio && !repairVideo,
        originalMovieSeconds: movieEnd,
        originalVideoSeconds: videoEnd, repairedVideoSeconds: Math.max(videoEnd * videoScale, durationMs / 1000) };
    return repaired;
}
