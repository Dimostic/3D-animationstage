# Create and ungroup assemblies

In the native workspace's **Scene** panel, choose **Create Group…**. Give the
group a name, choose **Objects in** (World or an existing group), then check the
objects to include. **Select All** and **Clear** help with larger lists. The
currently selected object is checked initially. The list scrolls independently.
Only siblings appear together, which keeps placement and animation predictable.

Choose **Create Group**. The new group is selected and its handle is centred on
the chosen objects' bounds at the current time. Their placement, visibility,
transform animation and existing contact links stay intact. The group can now
be moved, rotated, scaled or duplicated as an assembly. For reusable character
setups, include their linked chairs and held props as well.

Choose a group and click **Ungroup** to remove its container while retaining
its objects, speech, materials, IDs and contact links. Direct children move to
the removed group's parent; nested groups remain intact. A hidden group's children
remain hidden. Empty groups can also be removed this way.

Both operations support Undo/Redo and portable `.stage3d` saving without a format
change. Cancel closes the creation dialog without editing the scene. Creating a
group requires space within the existing 300-object limit.

## Preserving animation and shape

Creating a group shifts each chosen object's base position and position keys by
the new pivot offset. The new group supplies the opposite translation, preserving
the full animation path rather than only the current pose.

Ungrouping combines a static group's transform with each direct child's transform
and keys. A translated group, or a group with zero rotation and uniform scale,
supports animated child rotations too. Rotated groups support static objects and
children whose keyed rotation stays constant.

The editor leaves the project unchanged and explains the issue when:

- The group itself has transform keys. Its animated container must be retained.
- Combining non-uniform scale and child rotation would introduce shear and distort
  the object. Use uniform group scale or retain the group.
- A rotated/scaled group contains changing child rotation keys whose interpolation
  cannot be preserved exactly. Keep the group, or restore its rotation to zero and
  use uniform scale.

This is scene organisation; it does not merge meshes or bake animation into new
geometry. The Inspector's Parent field remains available for manual organisation
and retains its existing local-transform behaviour.

## Verification

Build with `npm.cmd run build`, then run
`node scripts/smoke/native3d.mjs --grouping-only`.
Tests compare world matrices at intermediate animation times and cover centred
pivots, transformed parents, ungrouped static rotation/scale, animation and shear
guards, visibility, empty groups, capacity, live contact/speech preservation,
Undo/Redo, project roundtrip, mobile layout and cancellation. The checks also run
in the native regression suite.
