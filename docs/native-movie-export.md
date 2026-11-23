# Native movie export (local)

Open the native workspace at http://127.0.0.1:8783/assets/studio3d/index.html.
Choose **Movie · video & audio** beside **Export**, then **Export**. Use
**Preview Camera** to check framing, choose the range and export. This milestone
is local; staging and production have not been updated.

Automatic selects MP4 (AVC/AAC) when the browser supports the requested video
and soundtrack, otherwise WebM (VP9/Opus). Use a current Chrome or Edge on
localhost or HTTPS. Unsupported encoders produce an error rather than silently
omitting sound. WebCodecs is required; there is no real-time recording fallback.

Settings include landscape, portrait and square output, 12/24/30 fps, quality,
scene camera or current editor view, start/end times, sound and burned captions.
The scene camera follows timeline camera shots, with direct cuts at their start
times and the saved scene camera in gaps. Current editor view ignores shot cuts.
Draft disables shadows for faster rendering. A CPU-based computer can export:
rendering may take longer than playback, but every frame is sampled explicitly.

The selected range becomes movie time zero. Animation, chair/document contact,
gaze and speech posing use scene time. Every frame has an explicit timestamp and
duration, including a shortened final frame. Sound mixes local speech clips at
48 kHz stereo, respecting source trims, offsets, volume, mute and overlap. Mono
is duplicated to stereo; recordings with more than two channels require a
stereo mix first. Silence between clips is preserved. Overlapping sound can
clip; the completion message reports this so volumes can be lowered. Compressed
audio can contain a few milliseconds of codec padding at the end.

Captions are burned into the image when selected, using the existing speaker
and caption segments. They cannot be switched off in the resulting movie.
PNG and GLB snapshot exports remain available in the same export selector.
Movies are flat video, not stereoscopic, 360-degree or interactive VR exports.
Projects remain portable `.stage3d` files (v4 adds action tracks and camera shots).

Playback pauses for export. The renderer hides editor helpers, uses the exact
output dimensions, and restores editor position, selection, quality and camera
after success, cancellation or failure. Export leaves playback paused. Progress
shows frame count and elapsed time; **Cancel Export** or Escape cancels safely.
Only completed files are downloaded. Browser exports have a 512 MiB limit;
choose shorter ranges or lower quality for large scenes. Size estimates are
approximate, and available browser memory can impose a lower practical limit.

## Implementation and checks

`js/native3d/movie-export.mjs` handles deterministic frames, codec selection and
chunked PCM mixing. `movie-ui.mjs` owns settings/progress. `world.mjs` supplies an
isolated render session without changing saved scene data.

Run `npm run test:movie` for encoded MP4/WebM timing, decoded motion and sound,
caption pixels, trimmed/resampled audio, partial final frames, cancellation,
failure recovery and an actual UI download. `npm run test:native3d` includes
these checks alongside the workspace, contacts and speech regressions.

The native encoder uses pinned Mediabunny 1.61.0 with a narrowly scoped Matroska
patch: video BlockGroups carry explicit BlockDuration, preserving the duration
of a partial final frame. `scripts/build-native-codecs.mjs` checks the version
and exact source match before applying it in memory during build. It bundles
the package's compiled ES modules because its npm TypeScript sources omit
shared dependencies. The original encoder used by the existing editor is
unchanged. The modified module, original TypeScript source and MPL 2.0 license
are distributed under `js/vendor/native3d/codec-sources/`; the native app also
links `ENCODER-NOTICE.txt`. Review the patch when upgrading the dependency.
