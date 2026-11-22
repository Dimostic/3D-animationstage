# Contact chair: first furniture constraint

Each character can own one 3D chair at a fixed stage floor point. The chair and
its character render in the same depth pass, replacing the reference scene's
illustrative rectangles. Models, gait curves and existing projects are preserved.

## Use

1. Place Amaka or Tunde and open **3D Appearance and Actions**.
2. Choose the saved Sit action. Under **Chair contact**, choose **Contact chair**
   or click **Place chair behind this action** to use its standing point/facing.
3. Adjust **Chair floor X/Y**, **Chair facing** and **Chair height**, then use
   **Apply Appearance**. Previewing fields does not change the saved chair.
4. Use the existing Sit and Stand actions. Sit aligns the body with the seat and
   corrects the shoes to the same ground plane. Stand releases contact; the chair
   stays in place. None removes the chair.

Coordinates are stage pixels, independent of the current walking frame. Moving
the chair repositions a fully seated actor without modifying its stored route,
speech or captions. Large position/facing edits require adjusting the approach
and turn before Sit; the builder warns about that mismatch. Automatic approach
steps are not generated. Height is bounded to 90–110% of the measured lower leg
and sole offset. A chair is edited through its owning character.

## Contact contract

`realistic3D.chair = none | standard`; `chairX`, `chairY`, `chairYaw` and
`chairHeight` persist in appearance. Old projects default to none.
`chairPlacement` projects a chair behind the standing footprints using the pilot's
leg dimensions and the existing ground projection. During Sit/Stand, sampled
garment regions at both hips blend toward the seat. The existing leg IK aims
the ankles; deformed tread vertices provide the final sole correction. Default
footprints remain fixed through the transition. Backwards seeks recompute poses.

A bounded dimension cache and a single solved-pose cache avoid repeated mesh
work for an unchanged seated pose. Chair resources are disposed on LRU eviction.
The offscreen projection expands to include the fixed chair during an approach;
texture dimensions remain capped at 2048. Actors without chairs keep their
original pose/rendering behavior. Zero-size/nonpositive-scale actors cannot
provide a valid chair placement.

## Verification

Run `npm run test:chairs` (`npm.cmd` on Windows). The 228 contact cases cover both
actors/outfits, three builds, eight views, three heights and reverse Sit/Stand
seeks. Tests check sampled clothing contact, deformed sole height, fixed default
footprints, a stationary chair during actor movement, moved-chair binding,
save/reopen, non-mutating field preview, Apply Appearance, popup lifecycle and
MP4 video/audio. `sampleChairContact` and `sampleWalkPose` expose the measurements.

Evidence is under `examples/teacher-colleague/evidence/chair-*`.
`chair-before.png`/`.mp4` retain the old proxy scene; `chair-after` uses real chairs
with the same voices, arrival, captions and document. `reference.animstage` is
updated. The face/gait/library suite and authenticated live checks are required
before deployment.

## Limits and next phase

This is an owned chair/character constraint, not a general furniture catalogue or
rigid-body world. Different actors and stage props still follow object ordering
across separate render passes. The hip contact is a sampled garment region,
not full cloth collision. Arbitrary meshes, armrests, tabletops, obstacles,
reach/pickup collisions and automatic approach steps are not implemented.
Use the placement button and review edited approaches.

The next direction feature is named gaze targets (speaker, document, camera),
while retaining these chair and document contact regressions.
