# Timing changes and simple camera animation

The local timing fix keeps typed values when an edit is rejected and reports the
reason next to Apply Timing. It adds **Extend scene to fit**, enabled by default.

## Change a 9-second travel to 15 seconds

1. Select the travel block on the character's action track.
2. Set Length to 15. The readout shows the new end time and current scene end.
3. Keep Extend scene to fit checked, then Apply Timing.

A travel starting at 0 ends at 15; one starting at 4 ends at 19. Scene duration
grows if needed (maximum 600 seconds). Movement endpoint keys retime with the
action, keeping its waypoints, facing, speed and follow-camera settings. Undo
restores both the old timing and scene duration. Other tracks do not shift.

If a later action or unrelated transform key occupies that interval, the edit
is rejected. Move that action/key, shorten this clip or choose a free interval.
The typed length stays in the form with an inline explanation. Unchecking Extend
scene to fit requires the new end to stay inside the existing scene. Drag/trim
still respects the current scene bounds; the checkbox applies to Apply Timing.

## Face close-up, full body and scene overview

Open **Animation & Camera Timeline > Camera shots: face, full body & scene**.
Select a character, then use **Face Close-up** or **Full Body**. **Scene Overview**
fits the scene. These buttons arrange the editor camera only. They do not create
or replace a shot. Use Orbit/Pan/Zoom to refine the result.

Set the playhead to a shot's start, set Length, leave Shot framing at Current
editor view, then Add Camera Shot. Repeat for the next shot. Existing camera
shots cannot overlap. Set scene Duration long enough before adding new shots;
Apply Timing can then extend it when changing an existing shot.

For a direct change at the start of speech, capture a face shot there and keep
Camera movement at Cut to shot. For a gradual zoom/move, make the next shot
adjacent to the previous shot and choose Move camera during shot. That second
shot interpolates from the previous framing to its captured framing over its
entire length; Camera speed controls easing. Add another adjacent shot with the
same face framing to hold the close-up after the move.

Example:

- 0-2 s: Full Body, Cut to shot.
- 2-5 s: Face Close-up, Move camera during shot.
- 5-7 s: same Face Close-up, Cut to shot (holds the close-up).
- 7-10 s: Full Body, Move camera during shot.

To move around the scene, orbit/pan the editor to another angle and capture that
as the next adjacent shot. Use Replace Framing on a selected shot to update its
captured pose without changing timing. Camera View + Play previews the saved
animation; movie export must use Scene camera to include the camera track.
Independent preview also uses it. Editor view export uses the editor viewpoint.

Shots override travel follow cameras. Gaps use follow camera if active, otherwise
the saved scene camera; a smooth shot after a gap starts from the saved scene
framing. Unsaved manual camera previews can override shots in the editor: use
Reset Preview under Scene Camera Position / Target to clear them. No camera
obstacle avoidance or automatic speaker detection is added.

This milestone is local only and keeps project format v15. Run build, then
`node scripts/smoke/native3d.mjs --timing-camera-only`. Coverage includes the exact
9-to-15 change, linked keys, disabled-extension and overlap errors preserving
input, Undo/Redo, face/body/scene framing, explicit shot capture, adjacent smooth
camera sampling and native project roundtrip.

Release validation also exposed a VP9 final-flush stall after an MP4
encode/decode/re-export sequence on this browser. WebM now requests realtime
encoder latency to bound lookahead buffering, retaining explicit frame timestamps,
frame counts, bitrate settings and automatic hardware choice. The movie regression
verifies VP9/Opus re-export after MP4 decode and stops the release after 180 seconds
if the complete movie suite stalls. MP4 codec configuration is unchanged.
