# Porting between studios

Baseline: Animation Stage release 20261122c, commit 6db5dfe504c7397764a8e7eed09b48a9d6aa7fcd. This is a source snapshot, not a link or merge subscription.

| Concern | Start here in this workspace |
| --- | --- |
| Amaka/Tunde assets, attribution and rebuild inputs | assets/realistic-3d/, scripts/assets/build-realistic-3d.mjs |
| Poses, gait, ground routes and rendering | js/realistic-3d-renderer.mjs, js/realistic-3d-walk.mjs, js/realistic-3d-path.mjs |
| Builder, action editing, speech scheduling | js/realistic-3d-library.js |
| Speech motion, visemes, gestures and linked captions | js/character-sequence-speech.js, js/audio-lip-sync.js, js/caption-runtime.js |
| Scene time and playback | js/timeline.js, js/animations.js, js/export.js |
| Tests | scripts/smoke/realistic-3d-face.mjs and realistic-3d-library.mjs |

For a request such as "bring seated reading from 2D", inspect the original with npm run reference -- js/activity-kits.js. The command retrieves committed text from the sibling repository, not unsaved edits. Set STAGE2D_REFERENCE to its location if moved. The 3D app and its build do not need that repository to run.

Reuse the action's timing, seated posture constraints, prop ownership and semantics. Reimplement grip and occlusion using 3D hand bones and depth, not SVG coordinates or 2D draw-order tracks. Test standing/seated transitions, save/reopen, popup playback and export before recording the port. To adopt newer 2D work, explicitly review and update the pinned revision; never follow main automatically.

## Native drawing port (version 13)

Source reference: pinned commit `6db5dfe504c7397764a8e7eed09b48a9d6aa7fcd`,
`js/objects.js` primitive drag, scribble/freeform and path-point drawing workflows.
Only the interaction ideas are adopted: drag a shape, sample a freehand stroke,
click polyline points, edit/simplify points, style, duplicate and undo. No 2D SVG
node, coordinate transform, render loop or sibling import is used by the runtime.

New 3D modules: `js/native3d/drawing-data.mjs` (portable plane-local points and
bounded validation), `drawing-geometry.mjs` (merged stroke meshes, fill and arrow
head), `drawing-ui.mjs` (workplanes, direct drawing, point dragging and style).
They use the shared native world, history, project format and export paths.
See [drawing controls and limits](native-drawing.md).

Regression: `scripts/smoke/native3d-drawing.mjs`, invoked by `--drawing-only`, the
full native suite and future hosted smoke runs. Covers six pointer tools,
metre-based plane orientation, cancellation, style/fill, numeric/dragged points,
undo/redo, JSON/custom-prop roundtrip, lock/duplicate, all four planes, independent
window preview, PNG/GLB geometry, a movie render frame and cancelled-draft resource
cleanup. No 2D files or
hosting targets were changed.

## Native travel paths and easing (version 14)

Reference reviewed: pinned commit `6db5dfe504c7397764a8e7eed09b48a9d6aa7fcd`,
`js/easing-editor.js`. The selected ideas are plain speed presets and immediate
preview. The 2D cubic-Bezier editor, SVG path coordinates and animation loop are
not imported. Native `motion-path.mjs` implements bounded metre-based polylines,
distance-based sampling, four deterministic easing presets and tangent facing.
`path-ui.mjs` adds world-coordinate numeric/dragged waypoints to the existing
native Travel action and linked endpoint-key timeline contract.

Regression: `scripts/smoke/native3d-paths.mjs` (`--paths-only`, full native suite,
future authorized hosted checks). See [native paths](native-paths.md). No sibling
2D files, deployment targets, runtime imports or automatic synchronization change.
