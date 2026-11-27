# Native 3D overhaul — foundation milestone

Open `/assets/studio3d/index.html`, or **3D Studio → Open Native 3D Workspace**.
Local: http://127.0.0.1:8783/assets/studio3d/index.html.
The existing editor remains at `/` during migration. The native workspace does
not load the legacy editor shell or any sibling 2D source.

## Product principles — user direction, 2026-11-22

The goal is a simple, interactive standalone 3D creation app with the relevant
tools for modelling, composing scenes and animation, then VR and optionally
simple games. A beginner should be able to add an object, manipulate it, apply
an action and preview the result without understanding renderer terminology.
Keep the normal workflow visible and reveal advanced controls only when needed.

- Use direct viewport manipulation, sensible defaults, snapping/alignment,
  immediate visual feedback, contextual help and dependable Undo/Redo.
- Organize the main workspace around Add, Scene, Inspector, Animate and Preview.
  General object, furniture, material and interaction tools belong there, rather
  than in a growing character-specific menu.
- Build reusable starter scenes, materials, props and activity templates with
  editable parameters. Prefer a few understandable controls to many unexplained
  options. Include presets and a clear reset path.
- Distinguish scene assembly from mesh modelling. Current primitives and imported
  GLBs are a foundation, not a complete modeller. Stage future shape dimensions,
  material/texture tools, alignment, duplication and grouping first; plan mesh
  operations such as extrude, bevel and Boolean editing as a later modelling
  layer. Detailed sculpting, retopology and UV workflows remain separate scope.
- Keep one portable scene model and an editor-independent player boundary.
  Animation/film, interactive walkthrough and later VR/game previews should reuse
  assets and transforms while exposing controls appropriate to each workflow.
- Plan a shared interaction layer for later VR and simple games: selectable or
  grabbable objects, triggers, collision/physics, player controls and approachable
  rules such as "When clicked → open door". These are planned capabilities, not
  current features. Avoid requiring code for common interactions.
- Measure performance on the integrated-graphics development computer and later
  on the GPU computer/headset. Keep draft quality and asset budgets available.
- Continue locally by default. Publish to the dedicated 3D VPS only on an explicit
  user deployment request.

## Implemented foundation

- A persistent Workspace bar toggles Scene, Inspector, Timeline, Tools and
  Project menus independently. Expand Stage temporarily hides panels and keeps
  a Play/Pause control; Restore Workspace or Escape restores the prior layout.
  Full Screen is optional browser full screen. Reset Layout restores defaults.
  Inspector sections use keyboard-accessible disclosures. Layout/disclosure
  preferences persist only in browser storage; stage expansion is temporary.
  Buttons and fields offer hover/focus help, including dynamic controls and
  movie dialogs. Collapsing panels resizes the existing renderer.
  Gripped panel edges support pointer/touch dragging and keyboard arrows
  (Shift for larger steps; Home/End for bounds). Escape cancels an active drag;
  double-click resets that edge. Scene/Inspector widths and Timeline height
  persist in browser preferences, with vertical resizing for stacked mobile
  panels. Reset Layout clears sizes. Side panels, expanded subsections and
  dialogs scroll independently; dialogs also have a corner resize handle.

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
- Local contact milestone: independent chair links with Sit/Stand timing, actual
  sampled garment/sole correction, document hand ownership with optional timed
  ranges, detach at current pose, and named gaze toward the held document.
  These additions have not been deployed to staging or production.
  See [native contact controls and limits](native-contacts.md). Projects save as
  native format v15; existing native v1-v14 files upgrade on open.
- Local speech milestone: embedded audio import, estimated visemes, optional
  gentle speech gestures, linked caption segments, trimming/volume/mute,
  audio-clock playback and a voiced Teacher & Colleague example. Caption overlays
  are included in PNG export and local MP4/WebM movie export. See
  [native speech controls and limits](native-speech.md).
- Native plane drawing: freehand, lines, arrows, rectangles, ellipses and
  polylines as editable, portable mesh objects; stroke/fill styling, direct point
  dragging, numeric point editing and simplification. This drawing milestone is
  local only. See [drawing controls and limits](native-drawing.md).
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

1. Native chair/document contact pilot implemented locally. Retain the contact
   matrix while extending animated reach/pickup/drop and general prop constraints;
   current ownership ranges switch attachment rather than animate a pickup.
2. Voiced Teacher & Colleague and speech/captions are implemented locally.
   Native gaze supports camera, another character and
   the held document. Local visual action tracks now support multiple clips per
   character alongside independent seat timing and document ownership windows.
3. Deterministic video/audio export is implemented locally; see
   [movie export](native-movie-export.md). Multi-clip action tracks, linked speech/
   caption lanes and camera cuts are implemented locally; see [timeline](native-timeline.md).
   Add an explicit legacy
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
PNG output, camera helpers, recovery, mobile width, native contact/speech and
encoded MP4/WebM movies with decoded sound, motion, captions and cancel/retry.
Screenshots/projects are
written under ignored `tmp/`. Automated graphics checks use software rendering;
they do not establish hardware performance or headset frame rates.

`npm run deploy` now includes the native checks and authenticated live workspace
checks alongside the existing editor regression suite. Only the dedicated 3D
VPS is targeted. No changes to the standalone 2D app are required.

Navigation, surface materials/textures and bounds alignment are implemented in the
native workspace. See [editing tools](native-editing-tools.md) for controls, limits
and regression coverage. These scene-assembly tools precede later mesh editing.

Primitive shape dimensions are implemented locally for boxes, floors, spheres
and cylinders/cones. See [shape dimensions](native-shape-dimensions.md).

Complete group duplication is implemented locally, including nested animation,
internal contact/gaze links and character speech, with shared embedded assets.
See [group copying](native-group-copy.md) for controls and limits.

Checklist-based group creation and placement-preserving ungrouping are implemented
locally, with animation/shear guards. See [group organisation](native-grouping.md).

The native prop library now supplies six editable primitive assemblies with
metre dimensions, colour, placement and rendered thumbnails. These are visual
props, without new seat contacts or physics. See [prop library](native-prop-library.md).

Portable custom `.stage3dprop` files now save/import self-contained groups,
including ancestor transforms, animation, contacts and embedded assets/speech.
See [custom props](native-custom-props.md) for controls, validation and timing.

Native v8 surface placement adds mesh-based snapping, optional editor overlap
guards and persistent upright support links. See [surface placement](native-surface-placement.md).

Native v9 fixes character exclusion in solid protection and adds timed/action-linked
solidity, selected body/mesh regions and kinematic playback guards. See [solid protection](native-solidity.md).
