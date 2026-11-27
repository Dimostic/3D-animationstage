# Portable custom props

Open **Custom Props** below **Prop Library…** in the Scene panel.
Select a group and choose **Save Selected Group…** to download a `.stage3dprop`
file. Use **Import Custom Prop…** in any native scene to review that file, choose
its X/Y/Z position and add it without replacing the scene. Store these files in
your own resource folder; this milestone does not add a browser or cloud library.

## What is included

The file contains the selected group and its descendants, native shape/material
settings, model clips, transform and action keys, internal chair/hand/gaze links
and speech assigned to its characters, including captions. Required GLBs, images
and recordings are embedded. Unused assets, other objects, narration, camera shots
and source scene settings are excluded.

When a group has parents, its ancestor group transforms are retained as wrappers,
without their other children. This preserves inherited movement and rotation
without flattening animation. One neutral outer group gives the imported prop a
placement handle. Because this adds a node, the saved subset, including ancestor
groups, can contain at most 299 objects under the existing 300-object scene limit.

For a self-contained prop, include its linked chairs, holding characters and
character gaze targets in the selected group. Save explains missing dependencies
and leaves the scene unchanged. Gaze toward the camera follows the destination
scene's camera. Save does not change the source project, its keys or playhead.

## Placement and timing

Save measures the selected group's bounds at scene time zero, then centres its
starting pose on X/Z and places its base at Y = 0. Parent transforms and complete
animation paths remain relative to that reference. Import places this floor centre
at the chosen world coordinates. For empty geometry, the selected group's origin
provides the reference. Hidden geometry can still contribute to the measured bounds.

Animation and speech retain their original times, starting from scene time zero;
they are not shifted to the current playhead. The saved range includes required
keys, actions, contacts and speech rather than the source's unused trailing time.
The destination's duration grows if necessary, within its 600-second limit.
Its camera, shots, background, captions settings and existing objects remain intact.

Imported objects, action clips and speech receive new IDs. Internal links point
to the imported copies, including when importing into the original scene. Identical
embedded assets already present in the destination are reused; audio reuse requires
matching duration and mouth cues, and image reuse requires matching dimensions.
Different assets receive new IDs, so file-local IDs cannot overwrite existing data.

## Editing, validation and limits

The imported result is an ordinary editable group. Move/Rotate/Scale, Duplicate
Group, Ungroup, Undo/Redo and normal `.stage3d` saving continue to work. Repeated
imports create independent object/animation copies; their speech can play at the
same times unless you retime or mute it. Editing an imported copy does not update
the reusable file: save the group again for a new version.

The file picker accepts `.stage3dprop` JSON up to 190 MB. Native validation enforces
object/speech/embedded asset budgets, canonical embedded formats and complete links.
The envelope is `animationstage-prop` version 1, containing a validated native
project and one neutral group root. The destination project format is v12, with native v1-v14 compatibility.
There are no remote asset downloads or executable scripts in this file format.
Malformed data is rejected, and a runtime asset decoding failure restores the
existing scene and selection. Cancel makes no scene changes.

## Verification

Build with `npm.cmd run build`, then run
`node scripts/smoke/native3d.mjs --custom-props-only`.
Coverage includes subset and ancestor extraction, required timing, new IDs and
internal contacts, asset reuse, real GLB/PNG decoding, speech ownership, original
project/camera preservation, duration growth, Undo/Redo, mobile/cancel and malformed
model rollback. These checks also run in the native regression suite.

Surface links are retained when their native support is included. Fixed floor
links are translated with the prop; see [surface placement](native-surface-placement.md).
