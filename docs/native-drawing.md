# Native drawing

Available locally through **Draw** in the stage toolbar, **Draw on a plane** in
Scene, or **Add > Drawing**. Build with `npm.cmd run build` and open
http://127.0.0.1:8783/assets/studio3d/index.html after starting `npm start`.
This milestone has not been deployed.

1. Choose Freehand, Line, Arrow, Rectangle, Ellipse or Polyline.
2. Choose Floor (XZ), Front (XY), Side (YZ) or Facing editor view. Offset moves
   the plane along its normal, in metres. View-facing planes pass through the
   editor's orbit target and keep their orientation during the gesture.
3. Set stroke colour and thickness (centimetres), and optional closure/fill.
   Click **Start Drawing**, then drag on the stage. For a polyline, click each
   corner and use **Finish Polyline** or Enter. **Undo Last Point** / Backspace
   removes the last polyline point. Escape / right-click cancels without saving.
4. Each finished drawing becomes a selected scene object. Move, Rotate, Scale,
   Duplicate, Lock, Group, transform keys, scene context menu and Delete work
   through the existing tools. Use Undo/Redo to reverse these edits.

Select a drawing for its contextual **Drawing** inspector. Change stroke/fill
and use **Apply Drawing Style**. **Drag Points on Stage** exposes orange handles;
click a handle to highlight it, display its point number on stage and select the
same point in the Inspector. Drag on the drawing's plane to move it. Use the
visible **Delete Selected Point** button or Delete/Backspace while editing; use
**Finish Point Editing** or Escape when done. Lines, arrows, rectangles and
ellipses require both of their control points, so reshape those points instead
of removing them. Closed freehand/polyline paths need at least three points. Under **Control
points & simplify**, choose a point to edit its local X/Y coordinates numerically.
Freehand/polyline paths also support inserting/removing points and simplification
with a distance tolerance. Shape/point changes apply to the whole scene; use
transform keys to animate the drawing as a whole.

Drawings are metre-based geometry with round 3D strokes and optional flat fills,
not screen overlays. They save in `.stage3d`, duplicate/group as ordinary scene
objects, and appear in separate-window preview, PNG, GLB snapshots and movie
rendering. GLB is a baked mesh snapshot; retain `.stage3d` for editable points.
They default to pass-through so annotations do not block scene placement.

The plane is fixed in world space for each new gesture. Drawing does not paint
onto curved meshes, track a surface automatically or generate editable extruded
solids. Rotate/position the drawing onto another flat surface, and group it with
that surface if they should move together. Switching tools, playing/exporting,
loading another scene or cancelling discards the unfinished draft. Only finished
objects are saved. Drawings use unlit colours for clear marks; they have their own
style controls rather than texture/material presets.

Limits: 512 control points per drawing; 4096 rendered path points per scene;
0.1-100 cm stroke thickness. Filled paths must be closed, non-crossing and at most
256 rendered points. Ellipses use 48 segments. Simplify a dense stroke before
filling. These limits bound geometry and validation work on modest computers.
Version 13 stores drawings; native versions 1-12 upgrade on open. Older app
versions cannot open version 13. Advanced mesh editing, path/easing curves,
viewport multi-selection, VR sessions and game logic remain future work.

Run `npm.cmd run build` then `node scripts/smoke/native3d.mjs --drawing-only`.
The drawing regression is also included in the native suite and future authorized
hosted smoke checks. No automatic deployment is enabled.


## Crossing paths and navigation

If Fill detects crossings, it opens point editing and highlights the crossing
segments red. **Show Crossing Segments** also checks the closing segment that
Fill would add. Click the numbered handles to move or delete their points.
**Repair & Fill** explicitly reorders the existing points to remove simple
crossings, closes the path and fills it. This can change the outline; Undo
restores the original. It does not move points or replace a concave outline with
a convex hull. Coincident points/overlapping edges or a complex dense scribble
may still need manual editing or simplification. Failed repair leaves the saved
object unchanged. A new crossed stroke requested with Fill is retained without
fill so the work can be repaired rather than lost.

Use the mouse wheel to zoom between strokes or between polyline clicks; the
unfinished path and drawing plane stay in world space. Release the mouse before
zooming. Wheel input during an active stroke is ignored to keep that gesture
stable. Browser zoom / a window resize during a held gesture cancels that
unfinished gesture safely. Escape always restores the editing controls. Nearly
edge-on / distant plane intersections are bounded, and the interactive renderer
limits its drawing buffer to about four million pixels during large resizes.

## Shadows

Select an object or character and toggle **Cast shadow** in the Inspector. It
applies immediately to all its meshes, supports Undo/Redo, duplication and native
project saving. Old scenes keep their defaults (ground planes off, other mesh
objects on). Set each child separately in a group. Cameras/lights/groups do not
have a mesh-shadow switch. Balanced / High quality enables the shadow renderer;
Draft quality still suppresses shadows globally. Lighting and the receiving
surface determine whether the shadow is visible.

Additional regression: scripts/smoke/native3d-drawing-usability.mjs covers shadow
mesh flags/Undo, point selection/number sync/deletion, reversible crossing repair,
wheel zoom preserving a draft, safe resize cancellation and bounded render size.
