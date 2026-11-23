# Native chair and document contact — local milestone

Open http://127.0.0.1:8783/assets/studio3d/index.html and refresh the tab.
These changes are local. Staging and production retain their previous releases.

## Paper support and attaching objects

Select a movable object and expand **Hold / Attach Object** in the Inspector.
Choose a character, hand and pose: **Palm Support** holds a sheet against the
open palmar/finger surfaces, while **Edge Hold** supports its edge between the
thumb and fingers. **Apply Hold Preset** resets an attached object's offset,
rotation and anchor to that preset. Existing documents use Palm Support by default.

The native rig measures the deformed hand mesh, not a guessed bone offset.
Four-finger pose, palm surface clearance and thumb opposition are coordinated.
The paper edge is placed beyond the thumb's intersections with the support plane
so the thumb can wrap around the edge. A paper-specific surface check lifts the
sheet outside the supporting hand mesh when adjusted. This is not a general
rigid-body/cloth collision or arbitrary-object grasp solver. Thumb-safe edges
are calibrated for the presets; manual rotations/offsets need visual review.
Free adjustments can lose contact, and non-paper props use manual placement.

### Preview, position, then Attach

1. Select a free document, shape, prop, text, emoji or imported GLB.
2. Choose its character/hand/pose, then **Preview Grip**. The hand pose/guide
   changes without attaching or changing the saved project.
3. Choose **Snap object to grip**, or move the free object near the posed hand
   and choose **Keep current placement**.
4. Click **Attach to Grip**. Keep placement requires the object to be within
   30 cm of the hand; paper clearance can lift a colliding sheet. Other objects
   preserve their placement using an explicit local anchor.

**Cancel Preview** closes the temporary hand preview. Only one object can be
held by one character at a time. Chair/character attachment cycles are rejected.
A chair must be unlinked from seated characters before it can be held.

### Adjust while attached

**Grip Placement → Adjust Grip in Viewport** enables direct paper/object
dragging and Move/Rotate handles without detaching. Rotation pivots around the
contact point. **Hand area** now allows 8 × 12 × 10 cm half extents; choose
**Extended** for up to 30 cm on each axis; the range selection applies immediately. The range follows
character scale; paper clearance can lift a sheet beyond its requested offset.
Numeric offsets/angles and Reset Grip remain available. Reset also clears a
custom anchor, restoring the selected preset.

Each completed drag supports Undo/Redo. Escape cancels a drag; Escape again,
**Finish Grip**, or **Finish Adjusting Grip** closes the temporary mode. Changing
selection/time, playing or exporting exits it. Normal scene transforms stay
locked while held; only attachment offsets/rotation change. Scene transforms
and authored keys are preserved. Guides and hand previews are excluded from
saved projects and exports. Adjustments apply inside the Hold timing range.

For free scene movement, **Detach at Current Pose** preserves the current
placement, releases the hand and enables Move/Rotate. It clears the object's
transform keys; Undo restores the attachment and keys.

### Format and checks

Native v5 adds `gripStyle`, `adjustRange` and optional object-local `anchor`
to attachments, and permits movable props/models as well as documents. Native
v1–v4 projects upgrade in memory. Save a new copy; older editors cannot open v5.
Run the native suite, or build then use `--grip-only`, `--direct-grip-only`
and `--attach-only` with `node scripts/smoke/native3d.mjs`. Checks cover actual
mesh clearance, thumb/paper triangle intersections, both rigs/hands/outfits,
poses/scales, preview/Attach/Keep Placement, extended adjustment, Undo/Redo,
save/reopen, detach and movie export. Evidence stays under ignored `tmp/`.

## Sit on an independent chair

Amaka now sits with knees and ankles together in both outfits. The leg solver
uses a separate inward knee target and shoe-measured clearance; it preserves
the skirt mesh, skinning weights and texture. Feet draw together smoothly
during Sit and return during Stand. The same posture applies to standalone
Sit. Tunde retains his existing stance. Contact checks cover seat height,
floor clearance and deterministic reverse seeks; no cloth simulation is added.

Select a character in the scene, then under **Sit on a chair** choose a chair.
Set **Sit at** and **Sit duration**. Expand **Stand timing** to set a stand time,
or leave it blank to remain seated. Apply Changes saves the link. The character's
separate action can still wave or nod; linked timing owns its Sit/Stand pose.

Select and move the chair to reposition its seated character. The character's
authored transform and route keys stay intact. Its transform controls are
disabled while seat contact owns the pose. Chairs remain independent scene
objects, and can have their own transforms/keyframes. One character can own a
chair at a time. Deleting a chair removes its links; Undo restores them.

The solver aligns sampled clothing regions with the actual chair seat top,
positions the legs with the existing IK and corrects deformed soles to the
chair's floor level. It works in 3D metres, with positive uniform character and
group scale, upright chairs/characters/groups and Y-axis turns. A chair may have
different width/depth/height scales. Gizmos preserve these transform rules;
invalid imported or typed constraint transforms are rejected.

This is an explicit seat constraint, not automatic walking to the chair or a
general collision/cloth simulator. Adjust the approach and facing before Sit.
Chair floor means the level of its base, including a raised platform; this does
not detect or create a supporting platform. Hiding a chair does not remove its
seat constraint. General obstacle, table and garment-surface collisions remain
future work.

## Hold an independent document

Select a document, choose its **Character** and **Hand** under **Hold document**,
then Apply Changes. The prop stays a separate scene object with its own identity,
material and saved free transform. Its chosen hand is reserved; a wave uses the
free hand. One document can be held by a character at a time.

For the common case, keep the document held throughout the scene. Optional
**Hold timing** specifies a start/end window. Outside that window, the prop uses
its authored scene transform/keyframes. This switches ownership at the boundary;
it does not generate a reaching, pickup or dropping animation. Place the free
pose/keys deliberately if a timed switch is used.

While held, transform controls are disabled. **Detach at Current Pose** bakes its
current transform into the existing parent group, clears its free transform keys
and releases the hand. Undo restores the previous attachment and keys. Deleting
an owner also releases its documents at their current poses. Duplicating a held
document creates a free copy instead of claiming the occupied hand.

Hidden documents do not reserve hands, and documents cannot bind to a hidden
character/group. Their free transforms are used while the owner is hidden.
Character **Look at → Held document** follows the currently owned page, falling
back to manual aim outside the hold range. Arbitrary imported-prop grips,
two-handed reading, animated grip changes and finger-surface collision are not
included in this pilot.

## Data and runtime

Native `.stage3d` version 3 stores `character.seat` with `chairId`, `start`,
`sitDuration`, `standAt` (nullable) and `standDuration`. Document `attachment`
stores `actorId`, `hand`, `start` and nullable `end`. IDs are stable across saves.
Current local projects save as v5; native v1/v2/v3/v4 files upgrade when opened.
The previous hosted v1 editor rejects
newer files instead of silently discarding their contact/speech semantics. Legacy
`.animstage` projects remain in the existing editor.

Runtime posing applies all authored transforms before resolving contacts, then
poses characters, attaches documents and resolves gaze. No frame-history state
is needed, so backwards seeks and reopening produce the same result. Props
remain scene nodes rather than being copied into a character renderer. GLB
snapshot export includes their resolved poses; `.stage3d` retains editable links.

The native adapter reuses this repository's 3D seat/hand solver with explicit
world-to-rig frame conversion and per-instance lifetime. It creates no hidden
duplicate chair or document meshes. Existing editor behavior retains its
original projection and props. No sibling 2D code was ported.

## Checks

`npm run test:native3d` now includes 384 contact cases: two rigs, two outfits,
eight facings, three chair heights, two actor scales and both hands, with a
translated/rotated/scaled parent group. It checks seat/sole/grip error, moved
chairs, timed ownership boundaries, reserved hands, reverse seeks, save/reopen,
detachment, Undo and deletion cleanup. Evidence is written to ignored
`tmp/native3d-contact-checks.json` and `tmp/native3d-contacts.png`.

`npm test` and the existing chair regression remain required after shared-rig
changes. Automated tests use software rendering; they do not certify headset or
integrated-GPU performance.

Run `node scripts/smoke/conversation-reference.mjs --chairs --verify` after a
build to check the existing editor without rewriting its saved reference/evidence;
verification outputs go to `tmp/teacher-colleague-verification/`.
