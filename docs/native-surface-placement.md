# Surface placement and solid bounds

The native workspace now has **Surface Snap** and **Prevent Overlap** switches in
the viewport toolbar, plus **Surface Placement** in the selected object's Inspector.
These are scene-editing tools, not gravity, bouncing or a general physics engine.

## Put an object on a table or floor

1. Select the free object and expand **Surface Placement**.
2. Choose its support: **Floor**, a table, a grouped prop or another scene object.
3. Use **Place Once** for a single placement, or **Rest on Surface** to follow it.

Move the object over the support in X/Z first. Placement casts downward onto
actual upward-facing mesh triangles under its bounds centre, then puts its lowest
bound at that height. Choosing a table explicitly places on its top even when the
object starts below it. Grouped furniture resolves to the part actually hit.
Floor means the fixed world plane at Y = 0; selecting a real raised floor uses
that object's surface instead.

**Surface Snap** magnetises editor transforms within **Snap distance** (default
0.2 m). Auto chooses a nearby upward-facing top at or below the object's bottom
plus that distance; it does not jump to a distant ceiling. An explicit Support
limits snapping to that object. Auto uses the upper surface rather than a hidden
table-leg cap underneath a tabletop. Use Place Once to drop from a larger height.
Place Once on a keyed object updates a transform key at the playhead.

## Rest on a moving support

Rest on Surface places and links the object. It follows the support's movement
and Y turning, including keyed animation and reverse seeking. It keeps its own
size when the support scales, and updates its base height as the support grows.
Stacked links are supported, for example book → tray → table. The contact point
stays on the selected native part and clamps inward if that part shrinks.

Linked objects have locked transform handles/fields. **Release Surface Link**
keeps the current pose and makes the object free again. Animate the support to
move a linked object. Clear the object's own transform keys before linking it;
existing keys are never silently removed. Parent groups must use uniform scale.
Characters, held objects, linked chairs and groups containing those contacts
continue to use their existing chair/hand controls. Active embedded model clips
must be set to **No animation** before their assembly can be surface-linked.

Persistent supports currently use native boxes, planes, tables, chairs and flat
cylinder caps, including these parts inside grouped library props. Supports and
their ancestors must stay upright; Y turns and non-uniform support scaling are
supported. Imported meshes can be placed/snapped once, but are not persistent
supports in this milestone. A cone without a flat top cannot support a link.
Support visibility also controls the resting object's rendered visibility.

This uses the object's bounds and a centre support point. It does not calculate
weight, balance or stability; overhangs remain possible. Surface links preserve
contact with their chosen support during playback, but do not resolve impacts
against other animated objects.

## Prevent overlap while editing

Turn on **Prevent Overlap** to stop Move/Rotate/Scale and Inspector transforms at
solid bounds. It is optional and defaults off for existing projects. **Solid Object**
in the Inspector controls permanent, timed and partial protection; choose
Pass-through for decorative/ghost geometry. A non-solid group disables its parts.
Surface Snap and snap distance are browser preferences. Prevent Overlap is now
saved with the scene and also protects eligible animation; see [solid protection](native-solidity.md).

Collision checks use a box for each mesh. A native table's tabletop and legs are
separate obstacles, leaving its under-table gap usable. Continuous box sweeps stop
fast straight moves through thin obstacles, and the floor prevents new downward
penetration. Rotation and scale use sampled intermediate transforms and reject a
blocked edit. Surface-linked dependants move with their support in these checks.

The checks are conservative for curves, hollow meshes and rotated shapes: boxes
can keep objects apart where their detailed geometry would fit. Use **Resolve Selected
Overlap** to clear an existing intersection, or move the object to correct it. Scene imports,
hierarchy operations and geometry/material edits do not run a general collision
solver. Eligible moving animation now has bounds-based protection; constrained
contact setups retain their own controls. Turn off the mode when intentionally building
intersecting geometry. Characters participate through pose-aware bounds; seated and
hand-attached relationships retain their contact controls.

## Files, history and lifecycle

Native v8 introduced `solid` and `rest`; v9 adds character/timed protection. Native v1–v8 projects open
unchanged; v10 adds timed pair exceptions. Use an updated workspace to open saved
v10 files. Links validate their
target, native mesh index, contact point, unit quaternion, hierarchy and dependency
graph. Cycles, missing supports and conflicting hand/chair ownership are rejected.

Undo/Redo and save/reopen preserve links. Deleting a support releases surviving
resting objects at their current pose. Duplicating an assembly remaps internal
supports; include an external support or release that link first. Single-object
duplicates are free copies. Release a linked group before ungrouping the container.

Custom `.stage3dprop` files retain internal links. Fixed floor links translate with
the saved/imported prop and become fixed planes at the chosen placement height;
link to a real table afterwards if it should follow that table. Static GLB and movie
snapshots contain the resolved placement; `.stage3d` preserves the editable links.

## Verification

Build with `npm.cmd run build`, then run
`node scripts/smoke/native3d.mjs --surfaces-only`. Coverage includes old projects,
validation/cycles, tabletop ray hits, non-uniform and turning/keyed supports, stacked
links and reverse seeks, movie poses, release/deletion/history/files, group/custom
portability, thin-wall sweeps, floor/rotation/scale/typed guards, non-solid opt-out,
table gaps/legs and snapping to the upper tabletop. These checks also run in the
native regression suite.

## Place beside / against and blocker feedback

Select a free object, character or group, then open **Place Beside / Against** in
the Inspector. Choose a separate target, a world-axis side (Right +X, Left -X,
Front +Z, Back -Z), and spacing in metres. Zero spacing brings the protected
bounds together. Height can match the target base or keep the current height.
The command centres the object across the selected side and preserves its
rotation and scale, including transforms under rotated/scaled parent groups.
It places directly at the destination; it does not animate the route there.

The operation uses active protected bounds, including clearance, with geometric
bounds as a fallback for pass-through objects. Curves can still leave visible
gaps. Choose Closer fit for characters where appropriate. Other solid objects
can reject the destination when Prevent Overlap is enabled; pair exceptions are
respected. The floor stays protected. Release constrained hand/chair/surface
contacts or move their owner instead. Existing keys are retained, with a key
created or updated at the playhead. Undo/Redo and scene saving retain the result.

When a protected editor move is blocked, an amber outline marks the obstacle,
a lighter small box marks the nearby bounds contact area, and a stage message
names the blocker. Typed Inspector transforms and failed placement commands also
report blockers. Feedback clears on a successful new move, selection change or
time change, and is hidden in Camera View and playback. Highlights are helpers
and do not appear in PNG, GLB or movie exports. They indicate bounds contact,
not exact mesh contact. Pair exceptions support time ranges and action-linked
windows under Solid Object; see [solid protection](native-solidity.md).

Regression command: `node scripts/smoke/native3d.mjs --contact-placement-only`.
Coverage includes four sides/spacing, blocked destinations, drag/typed feedback,
camera isolation, exceptions, grouped/keyed transforms, Undo/Redo, save/reopen,
and free characters.

## Slide along solid obstacles

With **Prevent Overlap** enabled, an editor Move drag or typed translation now
slides along blocked faces. Motion stops at the first swept contact, removes the
component going into that face, then checks the remaining motion again. The
floor and additional walls still block it; a corner can stop both directions.
The stage feedback says **Sliding along** when tangential movement continued.
No additional switch is required.

Pair exceptions, partial protection, clearance, and existing contact ownership
still apply. Translation is evaluated in world space, including objects under
rotated/scaled parents. Rotation and scaling keep the existing rejection guard.
Playback keeps its existing deterministic collision behavior; this change does
not rewrite animation routes or add physical friction, gravity or mesh collision.
The evaluated placement can be saved and undone through the usual controls.

Run `node scripts/smoke/native3d.mjs --sliding-only` for diagonal, direct, parallel
and away moves, floors/corners, exceptions, grouped transforms, free characters,
typed Inspector updates, feedback, and Undo/Redo.

Native v11 adds authoring controls and opens v1-v10 scenes. See
[authoring controls](native-authoring.md) for current save compatibility.
