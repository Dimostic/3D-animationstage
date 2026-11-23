# Native speech and captions — local milestone

Open http://127.0.0.1:8783/assets/studio3d/index.html and refresh the tab.
This milestone is local; staging and production have not been updated.

## Common workflow

### Generate speech locally

Choose **Generate Speech**, select a speaker, enter text, choose a Windows
voice/speed and scene start, then **Generate & Add**. The generated WAV is
analyzed for mouth movement and embedded in the project, with optional captions
from the entered text. It appears in the timeline and works in saved projects,
playback and movie soundtracks. Caption timing spans the recording; this is
not word alignment or transcription.

The backend uses Windows SAPI desktop voices on the computer running
`npm start`, bound to 127.0.0.1. Restart that server after updating. It runs
on CPU without cloud keys; current installed voices are Hazel and Zira.
Limits: 2,000 characters, one generation at a time, 60 seconds/request and 20 MB
output. Text is spoken literally, never interpreted as XML. Cancel discards the
recording. Overlapping speech for one character is rejected transactionally.

Linux/VPS generation and neural cloud voices require a separate 3D voice service;
this backend is local Windows only. Portable recordings play without the service.
No 2D provider keys, cookies, credits or PHP endpoints are reused.

Attachment/generation semantics were reviewed with `npm run reference` against
pinned 2D commit `6db5dfe504c7397764a8e7eed09b48a9d6aa7fcd`, module
`js/character-sequence-speech.js`. The independent native implementation is in
`js/native3d/tts-ui.mjs`, `scripts/local-tts.mjs` and `scripts/local-tts.ps1`.
With the updated Windows local server running, execute
`node scripts/smoke/native3d-voice.mjs`. It verifies real audible WAV data,
speaker/viseme/caption linkage, saved audio, movie soundtrack, cancellation
rollback and request/origin validation.

### Import recordings

1. Select a character, then expand **Speech & Captions** under the timeline.
2. Choose **Import Speech Audio** and select a WAV, MP3, OGG, WebM or M4A file.
   It is decoded/analyzed in the browser and embedded in the project, not uploaded.
3. Set the speaker/start time and type caption text, then **Apply Speech**.
   Without a selected character, a clip is narration until assigned a speaker.
   New imports append after that speaker's existing speech or the current cursor,
   whichever is later. The scene duration extends automatically, up to 10 minutes.
4. Press **Play** to enable sound. Pause, scrub or **Go to Start** to review.
5. Save `.stage3d` to retain recordings, cues, captions, props and editable timing.

**Try Conversation Example** replaces the scene after confirmation. It reuses
the existing repository's Amaka/Tunde recordings and dialogue in a native scene:
separate chairs, a held document, alternating speech and linked captions. It is
not a legacy-project import or a new hosted voice service.

The clip row is a draft until Apply Speech. Moving its scene start keeps mouth
cues and caption segments linked. **Add caption segment** splits the final
caption interval to make room for another segment; edit the text/times as needed.
Caption timing is relative to the original recording. Advanced trimming uses
that same source clock, so captions outside the retained portion do not appear.
Segments within a clip must be ordered and non-overlapping.

Different characters can speak together and their captions stack. Speech clips
for one character cannot overlap. Narration needs no character. Caption and
speaker-name switches are saved scene settings. Caption text is rendered as
plain text, including in PNG snapshots; no HTML from project text is executed.

## Motion and sound

Lip sync is an estimated spectral/energy analysis with the pilot's rest, MBP, FV,
L, A, E and O/U shapes. It does not recognize words, transcribe speech or certify
phonetic alignment. Captions are typed/edited by the user. **Lip sync only** is
the default; **gentle gestures** adds small head/hand/expression motion.

Existing named gaze, explicit waves and held-hand ownership retain priority.
Seat contact is solved after speech motion. The listener's mouth rests when no
speech is assigned at that time. Seeking, replay and reopening recompute the
same visual frame instead of carrying the previous mouth pose forward.

Recordings play through Web Audio. AudioContext time is the playback master;
animation samples it at each render frame rather than running a separate clock.
Low graphics frame rates can still make the visible preview lag sound, so use
Draft quality if necessary. Software-rendered automation is not a hardware or
headset performance benchmark.

Pause/seek/project changes cancel scheduled sources and disconnect gains.
Resume creates sources at the current source offsets. Unchanged decoded buffers
are reused when editing scene geometry or captions. Browser sound policies may
require a direct Play click. Muting changes audibility, while mouth/captions
remain available for silent scene review.

## Format and limits

Native v3 adds `speech`, `captionSettings` and embedded `audio` assets. Native
v1/v2/v3/v4 projects upgrade in memory; current local projects save as v5 with action
tracks and camera shots. Source files are never overwritten on import.
Older hosted editors reject these newer files, so use the updated local workspace until
an explicit deployment is requested. Legacy `.animstage` remains separate.

Each audio asset stores a canonical data URI, decoded duration and estimated
viseme cues. Clips reference asset/actor IDs, scene start, source trim, volume,
mute/performance flags and relative-source caption segments. The supported
limits are 20 MB per imported recording, 10 minutes per recording/scene,
100 speech clips and the existing shared embedded-asset budget. Browser codec
support still determines which compressed recordings can be decoded.

There is no automatic transcription, cloud voice generation, spatial/VR
audio, time stretching, editable phoneme track or SRT import/export in this
milestone. Local [movie export](native-movie-export.md) includes mixed sound and
burned captions. GLB is a static scene snapshot and
does not contain the speech timeline; retain the `.stage3d` project.

## Verification and sources

`npm run test:native3d` includes native contact checks plus audio analysis,
caption/clip validation, the voiced example, actual PCM at a Web Audio analyser,
audio-clock sampling, speaker isolation, seat/hand priority, backwards seeks,
moving/trimming/muting, project save/reopen, decoder reuse, failure rollback,
file import and audio preservation when deleting scene objects. Evidence is
under ignored `tmp/native3d-speech*`, `tmp/native3d-audio-output.json` and
`tmp/native3d-captioned.png`.

Native speech analysis/viseme meanings draw on this repository's
`js/audio-lip-sync.js`; the native module is independent of its legacy editor
and SVG adapters. Existing native rig speech posing is reused. No sibling 2D
code or services were ported. Recordings/dialogue come from
`examples/teacher-colleague/`, retaining the existing provenance notes.
