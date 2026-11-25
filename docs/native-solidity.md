# Solid objects, characters and timed protection

The earlier editor guard excluded characters. That meant a box could be moved
over Amaka even with Prevent Overlap enabled. Characters now participate as solid
obstacles, using pose-aware bounds that include their skin, hair and visible outfit.
Held props also block unrelated objects; intentional hand/chair relationships keep
their existing contact rules.

## Everyday use

Enable **Prevent Overlap** in the viewport toolbar, then move the box toward
Amaka: the box stops outside her protected bounds. The switch is now saved with
the scene, so save/reopen and Undo/Redo retain it. It enables both editor guards
and protected playback. Old projects upgrade with protection off, preserving their
authored arrangement until you enable it.

Select an object or character and expand **Solid Object** in the Inspector:

- **Always solid:** the object blocks other solid objects throughout the scene.
- **Pass-through / not solid:** it does not participate in collision protection.
- **Solid between times:** choose a start and end in seconds; start is inclusive,
  end is exclusive.
- **Solid during a character action:** bind to a visual action clip or the legacy
  character action. Moving/trimming that clip changes its solid window too. If the
  referenced action is removed, that window becomes inactive until reassigned.

**Apply Solidity** stores the settings and enables scene protection for a solid
mode. **Apply Changes** also saves edited solidity fields, so either Apply button
works. Use these controls for permanent, timed or partial protection.

An object already intersecting another can be moved out or corrected with
**Resolve Selected Overlap**. The tool keeps it above the floor and tries an exit
that clears other solid bounds. The Inspector reports overlaps while its panel is
open. This is useful for projects created before character protection existed.

## Selective pass-through exceptions

Select an object or character, expand **Solid Object > Ignore selected objects**,
check the objects it may pass through, then use **Apply Changes** or **Apply Solidity**.
The rule works both ways: Tunde ignoring a wall also lets that wall move through
Tunde. Other solid pairs continue to block editing and protected playback.
Uncheck the pair from either Inspector to restore protection. Undo/Redo and saved
projects retain the list. Group exceptions include their descendants on both sides.

Exceptions affect collision checks, overlap reports and Resolve Selected Overlap.
They do not disable the floor, detach props or override chair/hand/surface links.
Surface snapping and deliberate placement links still provide their own contact
behavior. Each checked pair now has **Exception timing**: Always, Between times, or During
a character action. Start is inclusive; end is exclusive. Choose a character and
action from the scene. Moving or trimming that action changes the exception window;
deleting it makes the rule inactive. The row reports whether the saved exception
is active at the playhead. Editing another solidity setting preserves incoming
exception timing. Changing a pair from either Inspector updates that pair only.

Deleting an object removes references to it; Undo restores them. Copying a group
remaps internal pairs and retains outgoing exceptions to other scene objects.
Portable custom props retain internal pairs and omit exceptions to objects outside
the exported selection; importing remaps the retained IDs.

## Partially solid variants

**Protected area → Whole object** uses a safe enclosure. For characters, that
enclosure covers all visible regions and can also cover empty space between limbs.

Choose **Selected parts** to protect only selected regions of a native character:
head/neck, torso/clothing, left/right arm and hand, or left/right leg and foot.
Unchecked regions are intentionally pass-through. Other objects expose their mesh
parts: for example, a table's tabletop can be pass-through while its legs remain
solid. A single-mesh box does not acquire geometric holes from a checkbox; build
separate parts/groups when an opening needs independently controlled geometry.

For a group, the part list controls its child objects. Only explicitly changed
children receive new Always/Pass-through settings; unchanged child timing settings
remain intact. A group's inactive solid window disables its children too. Edit a
part directly for its own timed mode. **Show protected bounds** provides an editor
overlay of the selected active enclosures; it is excluded from exported images,
GLBs and movies.

## Closer contact and adjustable clearance

**Contact fit** defaults to Safe bounds for existing scenes. On characters,
**Closer fit** measures the currently posed skin into separate body-region boxes
instead of one broad enclosure. This reduces empty protected space around the
body without deliberately shrinking through the skin. Posed measurements are
cached until the pose changes; this option costs more CPU during animation.
Objects retain their per-mesh bounds.

**Extra clearance (m)** adds 0 to 1 metre outside each protected part. Start at
0 for close contact, or 0.01 for an extra centimetre. Both objects contribute their
own clearance. This is extra padding, not a negative inset: reducing protection
inside the skin would allow visible penetration. Show protected bounds to inspect
the fit. Even Closer fit uses boxes, so curved, rotated and hollow geometry can
still leave gaps; it does not promise exact mesh-to-mesh contact.

## Playback response

- **Auto:** keyframed movement, free character actions and active model clips can
  receive position corrections. Ordinary stationary objects act as obstacles.
- **Fixed obstacle:** retain the authored position and block responsive objects.
- **Allow position correction:** permit correction even without transform keys.

Protection evaluates saved times deterministically, including reverse seeking.
Keyframed translation follows its authored segments with swept bounds, so a fast
box cannot simply skip through Amaka or a thin wall. Intersections are separated
using conservative bounds. Corrections affect the evaluated pose, not saved keys.
Disabling protection restores the authored animation. Surface-linked dependants
and held props remain with their owner when that free assembly is corrected.

Reserved chair, hand and resting contacts take priority: their constrained setups
are not displaced by the general motion guard. Fixed objects are not automatically
rearranged against other fixed objects. If a layout contains unavoidable or
intentional overlaps, use the Inspector's overlap report, Resolve Selected Overlap,
part settings or a different playback response.

These are kinematic bounds-based safeguards, not a rigid-body engine. There is no
gravity, weight, bounce, cloth collision or exact triangle contact. Curves and
hollow objects can be kept farther apart than their detailed geometry requires.
Very crowded or impossible configurations can still require layout changes;
the feature should not be treated as a guarantee for every arbitrary imported rig
or constrained animation.

## Format and verification

Native v9 adds `collisionProtection` to the scene and optional per-node `collision`
settings (mode, response, times/action binding, selected parts, fit, clearance and
optional reciprocal `ignore` object IDs). Native v10 adds per-pair `exceptionTiming` windows. Native v1-v9 projects
upgrade; use the updated workspace to read saved v10 files. Group duplication
and custom-prop import remap action bindings along with object/action IDs. Custom
props include their saved solidity settings without enabling protection in an
unrelated destination scene automatically.

Character enclosures are built from visible skinned vertices and contributing
bone-local bounds. Runtime pose updates transform those cached enclosures instead
of reskinning every vertex for each mouse movement. Imported skinned mesh parts
use the same pose-aware technique. This keeps the correction usable on the CPU
development machine without adding another renderer.

Build with `npm.cmd run build`, then run
`node scripts/smoke/native3d.mjs --solidity-only`. The regression reproduces selecting
Amaka, enabling protection and moving a box over her. Other coverage includes posed
skin/outfit coverage, resolving existing intersections, timed/action windows,
key preservation/reverse seeks, partial bodies/mesh parts, copied action bindings,
saved scene settings and profiles. These checks also run in the native suite.

Run `node scripts/smoke/native3d.mjs --exceptions-only` for selective pair coverage.

Timed pair regression: `node scripts/smoke/native3d.mjs --timed-exceptions-only`.
The rules use current scene time in editor, playback, reverse seeks and exports.
They do not animate a route or detach hand/chair/surface links. Protection resumes
when a window ends; clear the obstacle before that boundary to avoid a corrective
position change. Portable props omit rules whose action owner is outside the prop.
Missing action owners remain inactive until a valid action is chosen.
