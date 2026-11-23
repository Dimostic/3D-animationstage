# Native 3D prop library

Open **Prop Library…** in the native workspace's Scene panel. The first catalogue
contains **Bookcase**, **Sofa**, **Bed**, **Potted plant**, **Lectern** and **Bench**.
These are lightweight 3D assemblies made from this app's native primitives.
No downloads, external models, image textures or additional renderer are needed.

Choose a prop, set its width/height/depth in metres and its main colour, then
choose placement and **Add Prop**. Each type has bounded dimensions, shown in the
number controls' help. Height includes the headboard for a bed and the foliage for
a plant. The image shows the default preset; it is not a live size/colour preview.

Placement choices:

- **Floor at view centre:** X/Z follow the editor's orbit target; Y is zero.
- **Beside selected object:** on the floor, 0.25 m beyond the selection's maximum
  world X edge, centred on its Z. This does not check other scene obstacles.
- **On top of selected object:** centred on its world X/Z bounds, with the prop's
  base at its maximum Y at the current pose. It does not follow future motion.
- **Custom position:** enter the group's world X/Y/Z in metres.

The selection-based choices are unavailable without selected geometry. Placement
does not simulate collisions, attach a prop to a hand or perform an animated pickup.

## Edit and reuse

The selected result is a group with independent parts listed underneath it in the
Scene panel. Move/Rotate/Scale the group as a whole. Select a part to change its
native Shape Dimensions or Materials & Textures. The main colour affects the wood,
upholstery, blanket or pot as appropriate; books, foliage, bedding and hardware
keep their accent colours. No live preset connection remains after insertion.

Duplicate Group, Ungroup, transform keys, Undo/Redo and `.stage3d` saving work with
these assemblies. The props are stored as ordinary group/box/sphere/cylinder nodes,
so no project format change or special runtime factory is required. GLB snapshots
include their actual geometry. Insertion leaves existing objects, speech, cameras
and assets unchanged, and respects the 300-object scene limit. Cancel leaves the
project unchanged.

Furniture presets are visual scene props. Native linked seating still uses the
existing **Chair** objects; sofas, beds and benches do not gain seat contacts or
physics from this catalogue. A plant's foliage is stylised geometry, rather than
an imported botanical model.

## Preview assets and verification

The six PNG thumbnails under `assets/studio3d/props/` are renders of the actual
procedural models. Regenerate from a current build with:

```sh
npm.cmd run build
node scripts/build-prop-thumbnails.mjs
npm.cmd run build
```

The generator starts a loopback-only temporary server and uses one native renderer.
It creates no hosted resources and downloads no assets. Run
`node scripts/smoke/native3d.mjs --props-only` for all presets, size limits and
measured bounds, floor anchoring, independent instances, real thumbnails, main
colour, custom/top/beside placement, Undo/Redo, saved files, group operations,
capacity guards and mobile/cancel behaviour. These checks also run in the native suite.
