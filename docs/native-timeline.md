# Visual animation timeline (local)

Open **Animation & Camera Timeline** below the native stage. Drag the Timeline
divider upward for more room. Tracks scroll horizontally/vertically; Play/Pause
remains at the top of the panel.

The bright playhead line has a large draggable handle and a live time badge.
Drag the handle or anywhere on the time ruler to scrub; playback pauses.
Dragging near the track edges scrolls horizontally, and playback/seek changes
keep the playhead in view. Focus the handle for Left/Right steps of 0.1 seconds
(Shift: one second), Home/End for scene bounds, or Escape to cancel a drag.
Scrubbing changes the preview time, not scene data or Undo history.

Choose a character, action and Length, move the playhead, then **Add Action**.
Repeat to build a sequence. Drag blocks to move them and either edge to change
their start/end. Click a block for exact timing, action type and Delete controls.
**Apply Timing** commits numeric edits. Undo/Redo restores changes.

Drag steps are 0.1 seconds (Alt: 0.01). Focus a block and use Left/Right for
0.1-second moves (Shift: one second); Delete removes it. Escape cancels a drag.
Clips on one character cannot overlap or leave the scene. Drag edits stop at
neighbours; exact timing can move a block to another free gap. Increase scene
Duration before placing clips beyond the current end. Edits pause playback.

Actions: Idle, Walk cycle, Wave, Sit, Stand and Nod. Walk poses the character;
use transform keys for travel. Gaps return to idle, except completed Sit/Stand
retain their final posture until another action replaces them. Linked chairs
show editable **Sit** and **Stand** blocks with a **Seated** range between them. Add Sit/Stand
for a linked character to edit chair timing; drag those blocks or Apply Timing
to update the same link as the Inspector. Delete Sit unlinks the chair.
Remove Stand keeps the actor seated unless Walk requires an automatic stand.
Walk now schedules **Auto Stand** to finish by its start, overriding a later
scheduled Stand; the Inspector explains effective timing. Move Walk later for
a longer transition. Walk overlapping the Sit transition is rejected. A table
does not block walking: collision/path planning is not implemented. Walk is an
in-place cycle; transform keys control travel. Document holding
and speech retain their existing posing priorities.

Speech blocks and caption lanes appear for imported recordings. Moving speech
moves captions/lip sync together. Drag speech edges to trim its source; Length
changes its audio out point, without stretching sound. Caption text/times stay
in source-audio coordinates; only the untrimmed portions appear on the lane.
Double-click speech or click a caption to open **Speech & Captions** for text,
speaker, source timing, volume and mute. Overlapping recordings are allowed for
different characters or narration, but not on one character.

Choose Current editor view, Saved scene camera or a camera object under Shot
framing, then **Add Camera Shot** at the playhead. Select a shot to rename it,
change timing or **Replace Framing** from the chosen source. Shots store position,
target and FOV snapshots: subsequent edits/deletion of source cameras do not
change shots. Camera objects capture their evaluated world pose at that moment.
Shots cannot overlap. Cut to shot switches immediately; Move camera during shot
blends from the previous adjacent shot, with Camera speed easing. Gaps use an
active travel follow camera or the saved scene camera. See the
[timing and camera walkthrough](native-timing-camera.md) for close-ups, full-body
shots and simple moves, including the new local framing presets.
Use **Camera View**, then Play to preview shots with sound. Movie export with
**Scene camera** uses that camera track; Current editor view ignores shot cuts.
GLB remains a static snapshot, not an animation timeline export.

Native `.stage3d` v4 adds optional `character.actionClips` and `cameraShots`.
These are ordered arrays with unique IDs, start and duration; actions have a
name, shots a name and framing. Limits: 200 clips per character, 200 shots per
scene, existing 600-second maximum. Validation rejects overlaps, invalid
framing and timing beyond the scene. All new work is local and 3D only.

Native v1–v3 projects upgrade in memory. Legacy single actions keep their
original playback until the character's track is edited; a visible non-idle
range is then copied into the track. Chair-controlled Sit/Stand are not copied.
Deleting the last tracked action leaves an explicit empty/idle track. The
Inspector's single-action fields hide once a character has a timeline track.
Current local projects save as v5, adding hand poses and general object attachment.
Native v1–v4 projects upgrade. Save a new copy: older hosted editors cannot open v5 files.

Run `npm run test:native3d`, or build then run
`node scripts/smoke/native3d.mjs --timeline-only`. Checks cover v1–v3 upgrades,
validation, action/posture sampling, drag/trim/keyboard timing, Undo/Redo,
reverse seeks, camera gaps/cuts in actual video export, save/reopen, linked
speech/captions and mobile scrolling. Evidence is under ignored
`tmp/native3d-timeline*` and `tmp/native3d-visual-timeline.png`.
