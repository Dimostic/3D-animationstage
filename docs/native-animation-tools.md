# Native animation tools

Expand **Animation Tools · keys, ghost poses & trails** beneath Animation & Camera
Timeline. These controls use the native shared 3D world. They are separate from
the existing action, speech and camera-shot bars.

## Dope Sheet

Open **Dope Sheet** to see transform keys across objects, including props and
groups. One row per keyed object represents its position/rotation/scale keys.
Click a diamond to select and seek. Shift/Ctrl/Cmd-click selects more; drag
selected diamonds to retime them together. Drag uses 0.1 s steps (Alt: 0.01 s).
Escape cancels a drag. Object and channel names are native, not SVG properties.

- **Shift Selected** moves the selection by an exact number of seconds.
- **Scale Timing** expands/contracts relative to its earliest key; 2 doubles gaps.
- **Copy Keys / Paste at Playhead** preserves relative spacing and transform data.
  A single source object pastes onto the chosen Object; a multi-object selection
  pastes back onto its original objects. Overwriting existing keys is rejected.
- **Delete Keys** removes selected keys. **Add Key at Playhead** samples the chosen
  object's transform. Time edits affect all nine transform components together.
- Undo/Redo buttons and Ctrl/Cmd+Z / Shift+Z (or Y) work inside the editor. Changes
  use scene history, save/reopen and the independent player/export runtime.

Keys must remain unique and inside scene duration. Rejected edits preserve scene
data. Locked objects/groups and keys owned by travel, chair, hand or surface links
are protected. Edit their owning controls instead. The dope sheet does not retime
action clips, speech, contact windows or camera shots: those remain on the main
timeline. Deleting a final key leaves the object's saved base transform.

## Graph Editor

Choose an Object and position/rotation/scale axis. Rotation is displayed in
degrees, stored in radians and sampled with the native shortest-arc rule. Drag
a diamond to change time and its channel value; numeric Time/Channel value gives
exact edits. **Save Key Changes** also saves outgoing interpolation.

Interpolation choices: Linear, Ease in, Ease out, Smooth start/stop and Hold then
jump. This setting applies to the complete outgoing transform segment, not an
independent channel spline. Other component values are preserved when editing a
single axis. The curve uses the same sampler as playback and movie export.
Travel paths retain their own speed/facing sampling and cannot be reauthored by
dragging their linked transform keys. Custom Bezier tangent handles, independent
channel key times and skeletal bone-key authoring remain future work.

The project format is **v17** to persist outgoing interpolation. Native v1-v16
files upgrade without changing their linear transform interpolation. Custom prop
and scene copies retain interpolation. Older apps cannot open v17 scene files.

## Ghost Poses / Onion Skin

Select an object/character and enable the checkbox. Pink is past; blue is future.
Defaults are one pose either side, 0.2 seconds apart and 22% opacity. Advanced
settings allow 0–3 poses per side, spacing and opacity. Poses sample real deformed
mesh positions, including rig actions and evaluated parent/contact transforms,
using the existing renderer. They are not flat screenshots or added scene nodes.

Ghosts represent the selected object's visible subtree. Separately owned props
are not included automatically with a character; select those props to inspect
their contact motion. Instanced meshes are not baked. A 250,000-vertex total
budget limits CPU/memory cost and reports omitted meshes. Ghosts stay off by
default, and hide during playback, camera view, export and active viewport edits.
Sampling restores the current time, evaluated pose and camera without changing
scene data, speech playback, history or the selected object.

## Motion Trail

Select an object and enable **Motion Trail**. It samples its evaluated world-space
origin across the scene or the configured From/To range, including travel, moving
parents, chair/hand contacts and protected placement. Dots are equally spaced in
time; close dots indicate slower motion. Green/orange mark start/end; labels show
sample times. Choose 17, 33 (default) or 65 samples. This is a motion review guide;
use Travel Path to author route waypoints. It does not trace individual limbs.

Both guides are browser-session tools, reset when a new project is opened, and
excluded from PNG, movie, GLB and portable scene files. Changing preview range
does not silently change trail range. The existing one-renderer contract stays
intact. Pose libraries, animation layers and skeletal/IK editing are not added.

Regression: `npm run build` then
`node scripts/smoke/native3d.mjs --animation-tools-only`; included in full native
and authorized hosted acceptance. Checks native easing/validation, key operations,
multi-object timing, graph dragging, history/roundtrip, protected travel/locks,
actual skinned ghost differences, world-space timed trails, live-state restoration,
playback/movie hiding and disposal when guides are switched off.
