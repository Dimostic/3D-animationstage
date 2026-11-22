# Native 3D overhaul — foundation milestone

Open `/assets/studio3d/index.html`, or **3D Studio → Open Native 3D Workspace**.
Local: http://127.0.0.1:8783/assets/studio3d/index.html.
The existing editor remains at `/` during migration. The native workspace does
not load the legacy editor shell or any sibling 2D source.

## Implemented

- One Three.js/WebGL2 scene and renderer: characters, furniture, geometry,
  dimensional emoji, extruded text, cameras and lights share depth and shadows.
- Orbit/pan/zoom; raycast selection; Move/Rotate/Scale gizmos and snapping;
  hierarchy with group parenting, inspector, visibility, duplicate and deletion.
- Metres, Y-up, stable IDs, local transforms and a versioned `.stage3d` format.
- Transform keyframes, shortest-angle interpolation, deterministic reverse seeks,
  play/pause, native character idle/walk/wave/sit/stand/nod and embedded GLB clips.
- Explicit camera view/capture, Draft/Balanced/High resolution/shadow settings,
  on-demand idle rendering and draw/triangle diagnostics. Graphics adapter
  information is available in the statistics tooltip.
- Embedded GLB import, portable project save/open, bounded undo history and
  explicit small-project browser recovery. Large projects require file saving.
- PNG export and GLB static scene snapshot export. GLB snapshots do not retain
  the editor's editable procedural timeline; save `.stage3d` for that.
- A native classroom example with separate chair, table, document and character
  objects. This is a foundation example, not a conversion of the voiced legacy
  Teacher & Colleague project.
- Future VR viewer floor position, facing and eye height persist in scene data.
  No WebXR session or headset/controller support is enabled in this milestone.

## Scene/runtime boundary

`js/native3d/project.mjs` defines pure data and validation. Unknown project
versions, invalid transforms, duplicate IDs, cycles/missing parents, missing
assets and malformed keyframes are rejected. Only groups can be parents in this
milestone. Non-uniform scale is supported for geometry; character bone aiming
is intended for uniform character scale.

`world.mjs` builds runtime scene nodes transactionally: a failed asset leaves
the current scene intact. It owns viewport controls and explicit geometry,
material, texture, animation-mixer and skeleton lifetimes. Imported assets must
be self-contained GLB 2.0 (32 MB per imported file). External resource URLs and
decoder-dependent compressed GLBs are rejected before loading. Assets are
embedded in project files (approximately 128 MB total budget, 300 objects).

`workspace.mjs` owns editor interactions, project history and file operations.
UI/gizmos/grid are separate from exported world content. Camera and viewer start
are independent. GLB models' original dimensions are preserved: check imported
models against the metre grid and adjust scale as needed.

The existing 3D rig module now has an explicit `createWorldActor` adapter.
It produces real skinned scene nodes, uses the shared native renderer, poses
in the rig's original units, then places them at metre scale. It does not create
the legacy offscreen renderer. This is reuse of this repository's 3D rig code;
no 2D implementation was ported. Three.js and the bundled text font retain their
licenses in the build; existing character provenance remains under
`assets/realistic-3d/`.

## Next migration gates

1. Move independent native props into explicit hand/seat constraints; preserve
   separate chair positions while adding contact, attachment and timed ownership.
   Sit currently changes pose, not a native chair constraint.
2. Migrate the voiced Teacher & Colleague example, speech/captions and named
   document gaze into this runtime. Native gaze currently supports camera and
   another character; character actions are one action range per actor.
3. Add deterministic video/audio export, multi-clip tracks and an explicit legacy
   project migration review. `.animstage` imports are deliberately rejected by the
   native editor; existing projects stay in the existing editor.
4. Make the native workspace the default once those migration regressions pass.
5. Add a WebXR player with headset testing, floor-space origin, controller input,
   comfortable locomotion, interaction metadata and device performance budgets.
   A saved viewer start is groundwork, not a claim of VR compatibility.

## Verification

Run `npm run test:native3d`. Tests cover data validation, hierarchy cycles,
shortest-angle interpolation, a single WebGL context, physical character scale,
transforms, reverse seeks, undo/redo, project save/reopen, GLB snapshot reimport,
external dependency rejection, repeated scene resource cleanup, quality settings,
PNG output, camera helpers, recovery and mobile width. Screenshots/projects are
written under ignored `tmp/`. Automated graphics checks use software rendering;
they do not establish hardware performance or headset frame rates.

`npm run deploy` now includes the native checks and authenticated live workspace
checks alongside the existing editor regression suite. Only the dedicated 3D
VPS is targeted. No changes to the standalone 2D app are required.
