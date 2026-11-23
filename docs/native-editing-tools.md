# Navigation, materials and placement

These tools are in the native local workspace:
http://127.0.0.1:8783/assets/studio3d/index.html.

## Navigate the stage

The collapsible **Navigate** box stays on the stage, including in **Expand Stage**.
Choose **Orbit**, **Pan** or **Zoom**, then drag with the left mouse button.
Pan moves the view without turning it; Zoom moves closer or farther.
Right-drag or Shift + left-drag also pans. Scrolling zooms.
On a touchpad, click/drag in Pan mode or use two-finger scrolling to zoom.
On a touchscreen, one finger orbits/pans; two fingers pinch and pan.

- **O / P / Z:** Orbit / Pan / Zoom.
- **Home:** fit the whole scene from an angled view.
- **F / Frame:** fit the selected object, or the scene if nothing is selected.
- **Views:** front, back, left, right, top and angled perspective views.
- **W / E / R:** return to editing the selected object's move/rotate/scale handles.

Pan/Zoom hide transform handles to avoid moving an object while navigating.
Navigating exits Camera View and finishes grip adjustment. Editor navigation does
not modify the authored scene camera, camera shots or object transforms.
Use **Use Editor View as Camera** when you want to record a camera framing.
All directional views currently use perspective projection.

## Materials & Textures

Select a shape, prop, furniture item, text or imported model and expand
**Materials & Textures** in the Inspector. Choose a preset, adjust the tint,
then **Apply Material**. **Surface settings** exposes roughness, metalness and
opacity. Wood, stone and fabric presets set the surface response; they do not
generate a pattern. Translucent is a simple transparent surface, without glass
refraction; overlapping transparent objects can show sorting artifacts.

**Add Texture** immediately embeds a local PNG, JPEG or WebP. Images must be
at most 8 MB and 2048 pixels per side. Set Repeat U/V and Apply Material to tile
the image. Texture placement uses the mesh's UV coordinates; UV editing comes
later. Save Project keeps the image in the portable `.stage3d` file. Exported
GLB snapshots include the texture. No texture URL or server upload is needed.

Furniture hardware, document lettering and emoji facial details keep their
accents. Imported model overrides affect standard PBR materials, preserving
other authored maps. Characters retain their authored skin/outfit materials.
**Remove Texture** removes the added image; an imported model then uses its
original map. **Reset Surface** restores the original surface response and maps,
while retaining the chosen tint for native props. Undo/Redo supports these edits.
Unused added images are removed when replacing/removing textures or deleting
objects, while images shared by duplicates remain available.

## Align & Snap

Select the object to move, expand **Align & Snap**, choose a reference object,
an axis and centre/minimum/maximum bounds, then **Align with Reference**.
This matches the selected centre/edge with the same reference centre/edge.
Use **Place on Floor** to put the lowest point at world Y = 0, or
**Centre on Stage** to centre the object's bounds on world X/Z = 0.
**Snap Position to Grid** rounds the object's origin in world coordinates.

**Snap settings**, beside the toolbar checkbox, chooses move/grid spacing,
rotation and scale increments. Enable **Snap** to constrain transform handles.
Placement tools respect parent transforms and write a key at the playhead when
the object already has transform keys. They support Undo/Redo and saved projects.
These tools use geometric bounds, not collision simulation or mesh editing.
Held and seated objects, and groups containing them, are protected: use Grip
Placement, detach the object, or move its linked chair. A reference must be
outside the selected object's ancestor/descendant hierarchy.

## Schema and regression coverage

Native format v6 adds optional `surface` settings and embedded `image` assets.
Versions 1–5 still open and upgrade. PBR values, image types, dimensions, repeat
values and image references are validated. Image decoding also checks actual
dimensions before committing a scene. Materials and textures are disposed with
their scene objects, including maps replaced on imported models.

Run `npm.cmd run build`, then
`node scripts/smoke/native3d.mjs --editing-only` for mouse navigation,
camera isolation, texture/GLB roundtrip, oversized image rollback, asset cleanup,
grouped/keyed alignment, Undo/Redo, grid increments and attachment protection.
The checks also run in the full native regression suite.
