# Shape dimensions

In the native 3D workspace, add or select a **Box**, **Ground plane**, **Sphere**
or **Cylinder**, then expand **Shape Dimensions** in the Inspector.

- Box: width (X), height (Y) and depth (Z).
- Ground plane: width (X) and depth (Z).
- Sphere: radius.
- Cylinder: top radius, bottom radius and height. Set one radius to zero for a cone.

Enter dimensions in metres and choose **Apply Dimensions**. **Reset Dimensions**
restores the original primitive sizes: a 1 m box or plane, a 0.5 m sphere radius,
or a 1 m high cylinder with 0.5 m radii. The shape's base stays at its local
origin, so an upright shape on the floor remains on the floor when resized.

Dimensions describe geometry before transform Scale. A 2 m wide box with X Scale
2 is 4 m wide along its own X axis. The size readout includes the object's scale
at the playhead, before parent scale, and updates during playback/scrubbing.
Existing scenes retain their original dimensions and scales. Newly added ground
planes start at 10 × 10 m with Scale 1.

Dimensions apply throughout the scene; editing them does not create animation
keys or change existing transform keys. Use **Scale** and transform keys for an
animated size change. Move/Rotate/Scale, materials, textures, alignment, duplicate,
Undo/Redo, project saving and GLB snapshots continue to work with resized shapes.
Texture repeat remains unchanged; adjust it in Materials & Textures if needed.

Attached objects must be detached before changing dimensions, then attached again
to establish the intended grip. Other object types keep their existing controls:
this milestone edits primitive dimensions, not arbitrary model meshes, furniture
construction, character anatomy or sculpted geometry.

Dimensions range from 0.001 to 1000 m; radii are capped at 500 m. A cylinder can
have one zero radius, but not two. Fixed geometry detail keeps the tool usable
on the integrated-graphics computer. Native format v7 stores optional `shape`
parameters and still opens versions 1–6 without changing their geometry.

Run `npm.cmd run build`, then
`node scripts/smoke/native3d.mjs --shapes-only`. Coverage includes old projects,
invalid dimension rollback, all four primitives/cones, base anchoring, geometry
disposal, Undo/Redo, saved files, exported GLB geometry, keyed/grouped scale,
live size readout and grip protection. These checks also run in the full suite.
