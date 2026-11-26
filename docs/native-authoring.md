# Native authoring controls

This update is native 3D work. It does not import or synchronise the sibling 2D
studio. Stroll, Strut and Jog use the existing 3D renderer gait channels; the new
regression exercises their native scene/timeline validation. Other legacy actions
have not been silently copied into the native studio.

## Copy, clone and lock

Each Position, Rotation and Size row has a Copy / paste disclosure. Copy all three
values or an individual X/Y/Z value, then select another object and Paste the
matching parameter. This clipboard belongs to the current workspace tab. Paste
uses scene validation, contact restrictions and collision protection, and can be
undone. Rotation is displayed/copied in degrees; sizes are scale multipliers.

Duplicate offsets a copy; Selection Tools > Clone in place copies the authored
placement. Clones can overlap. Collision-protected animated copies may be corrected
during playback. Linked single objects clone at their current pose without their
hand/chair/surface ownership; complete group copies preserve internal links.

Selection Tools > Lock object saves an edit lock. Locked objects are skipped by
stage picking, cannot acquire transform handles, and reject scene edits. The Scene
list still selects them for Unlock. A locked group protects descendants; groups
containing locked descendants cannot move them indirectly. Playback continues.
Locks and all authored settings survive save/reopen and Undo/Redo.

## Facing and camera

Show facing / camera displays a blue forward arrow and a gold direction to the
scene camera, plus a body-angle readout. Object front is local +Z. Turn toward
scene camera changes body rotation; Look at scene camera aims character head/eyes
within the rig's supported limits. These are separate operations. The pre-existing
Forward / manual and Viewing camera gaze options remain available. Guides are
editor helpers and do not appear in exports.

Camera shots already supported cuts. Select a shot and use Camera movement > Move
camera during shot for continuous eased position, look-target and FOV movement
from the preceding adjacent shot framing (or saved scene camera after a gap). After a shot ends a gap
still returns to the saved scene camera. Capture the desired end framing first;
keep shots adjacent when a continuous sequence is wanted. This is not an orbit
path editor.

## Movement, alignment and action tracks

Walk to Point accepts world X/Y/Z or a picked floor point, a duration, and the
current playhead as the start. It creates editable endpoint transform keys plus a
Walk clip. Existing keys inside that interval must be moved first; overlapping
actions are rejected. It does not find a path around obstacles: preview the route
and add intermediate keys/segments as needed. Surface/chair/hand constraints retain
priority. Stroll, Strut and Jog are additional pose cycles; use travel keys to move.

The Inspector now edits the active character action track instead of writing a
hidden legacy value when a track exists. In a track gap, choosing an action adds
one at the entered time. Select a character in the Scene or timeline dropdown to
keep the timeline character selection aligned. Existing chair timing remains in
its Sit / Stand lane.

Align / Distribute Objects uses the selected object as an alignment reference.
Check additional objects, choose horizontal X, vertical Y or depth Z, and align
centres/minimum/maximum edges, or distribute with a chosen gap between bounds.
Distribution keeps the first object along that axis fixed. It operates in world
space, preserves rotations/scales, respects locks and active contact restrictions,
and rejects a solid destination overlap. Do not select a group and its own child.

## Help, search and captions

Find a tool or setting searches control names/descriptions. Clicking a result opens
its disclosures, scrolls to it and briefly highlights it. Unavailable contextual
controls may still require selecting the appropriate object first.

Help: On gives delayed hover/focus explanations. First / after idle limits repeat
explanations; Off disables them. Preferences are local to the browser. Pausing over
a transform handle shows its axis/plane meaning (red X, green Y, blue Z; XYZ is
uniform scale). These controls supplement keyboard and touch-accessible fields.

Caption Style / Pacing supports whole saved captions, sentences or short phrases,
word count, size, text/background colours and top/bottom placement. Splits estimate
timing by word count within the authored caption interval; this is not speech
transcription or word alignment. Edit caption timings for precise alignment.
Preview and movie exports use the saved style. Mouth strength defaults to 0.65;
Selection Tools changes it per character from 0 to 1 without moving audio cues.

## Separate preview and format

Preview in New Window opens an independent snapshot with Play/Pause, Start,
scrubbing, audio/captions and Movie Export. It uses scene-camera framing, camera
motion and the same renderer, not the editor camera. Parent playback pauses;
later edits require opening a fresh snapshot. Browser popup permission may be
needed, and two renderer instances use additional memory. No preview project is
uploaded. The movie dialog also offers the new-window preview.

Native v11 stores locks, mouth strength, caption style and smooth camera shot
settings. Native v1-v10 projects upgrade. Keep an original file if using an older
workspace; use v11 to open new saves.

Build, then run `node scripts/smoke/native3d.mjs --authoring-only`. Coverage includes
clipboard/clone, locks, facing/gaze, travel keys, Inspector/timeline consistency,
search/help, alignment/spacing, captions, measured jaw reduction, camera sampling,
independent popup preview and saved settings. The native suite includes this pass.

Travel timing, clone replacement and object recovery have since been extended in
[native v12](native-recovery-travel.md). The Travel to Point controls now offer all
supported gait variants; camera guides and Scene-list context commands are available.
