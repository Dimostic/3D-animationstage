# Timeline editing and camera focus-frame controls

Local changes; not yet deployed. Open Animation & Camera Timeline and select a
bar. Right-click it (or focus it and press Shift+F10 / the Context Menu key).

## Timeline menu

- Edit / Show saved controls scrolls to the selected clip editor.
- Jump to start/end moves the playhead without changing data.
- Split at playhead divides a clip at the current time; right-click preserves
  the playhead. Split at entered time allows an exact numeric location.
- Duplicate after this clip copies into the following free interval and can
  extend the scene. Travel routes are copied with the character instead; their
  linked movement cannot be duplicated independently here.
- Speech clips offer mute/unmute. Camera clips offer scene-camera preview and
  Adjust framing on stage.
- Delete clip removes the selected animation or shot, with Undo available. The
  editor also has an explicit Delete button and keyboard Delete remains available.

Splits need at least 0.1 s on each side (speech: 0.01 s). Action phases, travel
path progress, gait phase, speech source offsets and camera movement ranges are
retained. A split travel shows the corresponding partial route; its stored
source sampling preserves the authored motion. Camera move/hold shots keep their
move and hold portions. Linked chair Sit/Stand blocks cannot be split or copied
independently; edit their owning contact timing. Automatic Stand cannot be deleted
while Walk requires it. Clips bound to action-based solidity/pass-through windows
must use a time-based window before splitting to avoid changing that rule silently.
Locked actors stay protected. Normal scene/collision validation still applies.

Editing a split travel's geometry, speed, turn or body-facing settings reauthors
that segment from its visible route. Camera-only settings preserve its sampling.
Undo restores the original. Source snapshots are bounded (one level, up to 32
waypoints); they are not new runtime objects or extra assets.

## Save an existing camera shot

Click its bar or Saved camera shots entry. After Start/End/Length, camera movement
and speed, a sticky **Save Camera Changes** footer and **Delete Camera Shot**
button appear. The save label gains an asterisk while controls are edited. Saving
applies all these fields; changing the dropdown alone does not save it.

Choose **Move camera during shot**, use **Gentle start and stop**, and set a
suitable Move duration (2-4 seconds is a useful starting point for large moves).
Move duration must fit in the shot; any remaining shot time holds the destination
framing. Increase End/Length first if needed. A one-second clip still makes a fast
move regardless of easing. Use adjacent shots for predictable transitions.

When converting a cut to a move, the editor captures the camera immediately
before the shot as the move's starting pose, including an active travel follow
camera. At scene time zero, the saved scene camera is the source. Existing smooth
shots retain their prior interpolation unless edited. Split move sources are
stored so reverse seeking and movie export reproduce the same trajectory.

## Adjust the camera's view on stage

From a shot's right-click menu or saved-shot editor choose **Adjust Camera Frame
on Stage**. The camera inspector identifies the selected shot. A yellow rectangle
shows the view at its look-at plane, using the current viewport aspect ratio.

- Drag a corner to widen/tighten the view (field of view, 10-100 degrees).
- Move Camera attaches arrows to the camera position; the target stays fixed.
- Move Focus Target attaches arrows to the green look-at point.
- Save Framing to Camera Shot stores this shot's new position, target and FOV.
- Cancel Frame Edit / Escape discards the draft. Selecting other tools or starting
  playback/export also ends the draft. Numeric position/target/FOV controls remain
  available.

This is a 3D framing plane, not a screen-space crop or a physical focus-depth
simulation. It uses the current viewport aspect; an export with another aspect
can show a wider/narrower area. Editor helpers are excluded from exported files.
Framing changes affect the selected camera shot, while ordinary Scene Camera
editing applies to the saved base camera. Camera shots continue to override
travel follow cameras. There is no new camera collision/occlusion avoidance.

Split-source persistence was introduced in native v16. Animation tools now use
v17; v1-v16 scenes upgrade on open. Older apps cannot open new v17 files.

Regression: build then `node scripts/smoke/native3d.mjs --clip-tools-only`.
Tests include exact authored travel/gait and move/hold camera split sampling,
context-menu split/delete/Undo, playhead preservation, explicit save/easing,
move duration, focus-frame resizing/cancel and selected-shot framing save. The
full native and future authorized hosted suites include these checks.
