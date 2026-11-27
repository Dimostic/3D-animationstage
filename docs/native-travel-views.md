# Travel path visibility, body direction and follow camera

Available locally through **Inspector > Travel Path & Speed > Direction & Camera
View**. Select a character with a Travel action; choose the action in the panel.
A leg is the segment from Start or an intermediate waypoint to the next point.
Selecting Destination selects the final leg for these settings.

## See the route

The stage toolbar now has **Show/Hide Travel Path** and **Frame Travel Path**.
The selected route stays visible in editor view during playback without entering
point-edit mode. It includes direction arrows, Start (S), numbered intermediate
points and End. Green marks the selected point; cyan marks the next point on the
active leg. Click a marker or select its number in the Inspector to highlight it.
Use **Edit Path on Stage** to drag points. **Frame Travel Path** fits the whole
route, including points currently outside the viewport.

These guides are editor helpers. They are hidden in Camera View and excluded
from exported images/movies/GLB and independent scene preview. Showing/hiding them
does not modify scene data or the authored camera. Guides follow parent groups.

## Body direction and camera viewpoint are independent

A natural forward walk uses **Face direction of travel**. Front/side/back views
normally come from positioning the camera around that forward-walking body.

For a deliberate sideways/backward-facing body, choose a waypoint, choose
**Fixed heading**, enter parent-local degrees and **Apply Body Facing to Leg**.
Alternatively choose Front/Left side/Right side/Back to camera, click **Capture
Camera-relative Heading**, then apply. Capturing reads the current scene camera
at that point once; the body does not keep tracking the camera. Custom leg
headings enable route-facing control; unassigned legs follow the route. Turn
smoothing blends the heading at corners. This uses the existing forward gait;
it is not a new sidestep/backward-walk animation or automatic foot planting.

## Follow the walking character

Enable **Follow this character with the scene camera during this travel**.
Choose a view and **Apply Camera to Whole Route** for a consistent angle:

- Front: the camera stays ahead and looks back at the character's front.
- Left / Right: it tracks alongside the corresponding side.
- Behind: it follows behind and shows the character's back.

Or set views per leg with **Apply Camera to This Leg**: for example, front on
Start-to-Waypoint 1, left on Waypoint 1-to-Waypoint 2, and back on the final leg.
Set distance, camera height, look-at height (all world metres) and view-change
blend (0-2 approximate seconds). Blend applies to view changes within a route;
separate travel clips switch settings at their boundaries. **Preview This Leg in
Camera View** seeks to the middle of that leg and switches to the scene camera.
Turn Camera View off to return to orbiting and editing the route.

The camera follows the final collision-adjusted body position and orientation,
with no accumulated frame-dependent lag, so reverse seeks, movie frames and
separate-window previews use the same framing. Manual editor navigation remains
independent. Explicit camera-shot clips take priority; a live unsaved camera
preview also takes priority in the editor. Outside the travel interval the
existing shot/saved scene camera is used. If several visible characters request
follow simultaneously, the most recently started travel wins; equal starts use
Scene order. The Inspector reports the character currently being followed.
The camera has no automatic obstacle avoidance or occlusion handling.

## Persistence and checks

Undo/Redo and native project saving preserve per-leg headings/views. Inserting a
waypoint splits that leg and copies its heading/view to both halves. Deleting a
waypoint keeps the incoming leg's settings for the merged leg. Copying and
retiming keep these settings attached to the route. Camera settings refer to the
owning actor, so no external actor IDs need remapping.

Native format v15 saves these additions; v1-v14 scenes upgrade on open. Keep a
copy for the currently deployed v14 app until deployment is requested. This
milestone does not deploy automatically or add VR sessions/game logic.

Run build, then `node scripts/smoke/native3d.mjs --travel-views-only`.
Regression covers passive guide/toggle/frame, per-leg front/side/back, grouped
actors, reverse seeks, fixed headings, split-leg data, validation, Undo/save,
movie framing, independent preview and explicit-shot precedence. It is included
in the full native suite and future authorized hosted acceptance checks.
