# Reuse a group

Select a **Group** in the Scene list and choose **Duplicate Group** below it.
The copy appears beside the original, offset 0.5 m along its parent's X axis.
Its nested objects remain editable individually through the Scene list.

The copy includes nested groups, shape dimensions, materials, transform keys,
character actions and embedded model references. Only the outer group's position
and position keys receive the offset. The original stays unchanged. Internal chair,
hand-attachment and character-gaze links point to the copied objects. Gaze toward
characters outside the group continues to use those existing characters.

Speech assigned to characters inside the group is copied with the same timing,
captions and settings, assigned to the new characters. Both setups therefore speak
at the same time unless you move or mute their speech clips. Narration and scene
camera shots are not duplicated. Images, GLBs and recordings share the project's
existing embedded assets rather than repeat their file data; later material and
object settings can be edited independently.

For reliable contact, include a seated character's chair and a held object's owner
in the group. If either is outside, duplication explains what to include or unlink
and leaves the scene unchanged. Copies must fit the existing limit of 300 objects
and 100 speech clips. Empty groups and groups nested under another group can also
be copied. **Create Group…** in the Scene panel now offers a checklist that keeps
world placement; **Ungroup** reverses grouping where transforms can be preserved.
See [group organisation](native-grouping.md). The Inspector's Parent field remains
available and retains local transforms; manual Parent changes can change placement.

Undo/Redo reverses a whole group copy. Saving a `.stage3d` project keeps all IDs and
links, without changing the project format version. Deleting a group with children
asks for confirmation and removes its characters' linked speech too. Shared assets
remain if still used. Deleting a single character keeps the existing behaviour of
retaining its speech as narration. Undo can restore a deleted group and its speech.

Run `npm.cmd run build`, then
`node scripts/smoke/native3d.mjs --groups-only`. Coverage includes nested ID/link
remapping, unchanged originals, keyed motion and actions, chair/hand contacts during
forward/reverse seeks, shared assets, speech copying, external-contact and capacity
guards, nested/empty groups, Undo/Redo, deletion and saved-file roundtrip. These checks
also run in the native suite.
