# Travel paths and easing

Local milestone. Add a character Travel action using **Travel to Point**, then
select the character and open **Inspector > Travel Path & Speed**.

- Choose the travel action if the character has several routes.
- Choose Constant speed, Gentle start, Gentle stop, or Gentle start and stop.
  Apply Path Settings saves these controls. Existing travel keeps its original
  behaviour until edited. Face direction is recommended for newly edited paths.
- Insert Waypoint After adds a midpoint after the selected point. Select it and
  type its world X/Y/Z, or choose Edit Path on Stage and drag its orange handle.
  Start and destination are editable; intermediate waypoints can be deleted.
- A selected handle turns green and shows its label on stage. The waypoint
  selector follows stage clicks. Dragging keeps that point on a horizontal plane;
  use numeric Y to change elevation. Scroll zooms; Escape or Finish Path Editing
  exits. Delete/Backspace deletes a selected intermediate point while editing.
- Face direction of travel aligns the body with the route. Turn smoothing blends
  the direction around corners; 0 is a sharp turn, up to 2 seconds gives broader
  turns. Route geometry remains straight segments; no spline or obstacle planner
  is included. Repeated points / vertical-only sections keep the authored facing
  where a horizontal direction cannot be determined.

Paths use distance along all segments, so constant speed does not slow down on
short segments or speed up on long ones. Gentle start/stop changes distance over
time, and the gait phase follows the same eased progress. The distance is measured
in the character parent's coordinate system. A uniformly scaled parent preserves
constant world speed; a nonuniform or animated parent can alter world speed.
Collision and linked chair/hand constraints still take priority over authored
travel. The displayed line is a route guide, not a guaranteed collision-free path.

The gait, start, duration, endpoints, waypoints and speed settings belong to one
action clip. Moving or resizing its timeline block retimes the entire route and
its linked endpoint keys. Changing a destination keeps intermediate points.
During an edited route, its position and automatic facing are controlled by the
path; edit waypoints instead of translating the character mid-route. Scale keys
and other scene tracks remain available. Routes support 32 intermediate points.

Camera shots already support movement. Select a camera clip in **Animation &
Camera Timeline**, choose **Move camera during shot**, then choose **Camera speed**
and apply. The same four presets control position, target and field of view.
Cut shots ignore easing. Existing smooth shots retain their previous smoothstep
motion; gaps retain the existing scene-camera behaviour.

Save .stage3d for editable routes. Preview-window playback and movie/PNG/static
GLB sampling use the shared native runtime. GLB remains a baked snapshot, not an
editable travel timeline. Undo/Redo, copying and custom props preserve path data.
Format v14 stores these additions; v1-v13 native projects upgrade on open. Older
app versions cannot open v14. VR sessions, game logic, spline editing and custom
Bezier easing curves remain future work.

Validation: build then run `node scripts/smoke/native3d.mjs --paths-only`.
The regression covers distance-based traversal, easing and corner-facing,
reverse seeks, timeline retiming, validation, v13 upgrade, camera sampling,
numeric and pointer waypoint edits, Undo/Redo, save/reopen and movie sampling.
