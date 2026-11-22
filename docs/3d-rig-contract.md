# Pilot humanoid rig contract

Applies to Amaka/Tunde and the current renderer, not arbitrary imported GLBs.
Source assets and attribution: [asset README](../assets/realistic-3d/README.md).

## Coordinates and rest data

- Authoring units are the existing mesh units, not metres. `VIEW_HEIGHT = 21.5`,
  `VIEW_ASPECT = .72`; the orthographic camera looks toward the origin from +Z
  and +Y at `WALK_PITCH = pi/15` (12 degrees).
- +Y is up, +X projects stage-right, front is +Z at zero yaw. Yaw is about +Y.
  Character-local anatomical L/R are named in the skeleton; do not infer a hand
  from screen-left after a turn or mirror the model to fake another view.
- Stage x/y/width/height are pixels. Ground routes use x/z rig units and the
  renderer's projection. Use `walkAnchor` / `planWalk` for conversion.
- Bind directions come from the authored bone positions and inverse matrices.
  Do not assume a standard T-pose or overlay imported Euler angles on a bind bend.
  The runtime relaxed pose comes from zero motion channels in `poseArm`/`pose`.
- Floor height comes from the authored shoes' lower bounds. `sampleWalkPose`
  reports the deformed shoe surface, joint targets and contact error. A projected
  floor rectangle is not a shared physical ground plane.

## Roles and contacts

| Role | Current names / convention |
| --- | --- |
| Actor/world transform | Renderer `actor` group; yaw + `realistic3DTurn`, root vertical sitting offset |
| Trunk | `spine05`, `spine01`; gait lean/pitch and speech lean/sway compose here |
| Head / eyes | `head`, `eye_L`, `eye_R`; separate manual head/eye channels; named camera/document/character targets with bounded head/eye sharing and `realistic3DGazeBlend` Look/Release tracks |
| Pelvis and leg | `pelvis_L/R`, `upperleg01_L/R`, `lowerleg01_L/R`, `foot_L/R`; same support-height solver, named left/right limbs |
| Arm | `upperarm01_L/R`, `lowerarm01_L/R`, `wrist_L/R`; directions derived with `bindDirection` |
| Fingers | `finger1-1` through `finger5-3` with `_L/R`; index = finger2, middle = finger3, pinky = finger5 |
| Pilot document grip | Midpoint of index/middle first joints; wrist-local frame uses hand direction and palm normal. Paper is a child of the owning wrist, not a stage overlay. |
| Seat | Owned chair at `chairX/Y`, facing `chairYaw`; sampled garment regions target its seat while the soles share its ground. See [chair contact](chair-contact.md). |

The page is a code-authored `1.7 x 2.4 x .025` box in rig units. The grip is near
its lower edge; orientation follows the hand. New appearance values are
`heldProp: none | documentLeft | documentRight`. Old projects default to none.
No model or image bytes are added to saved actors. Bone transforms are derived
at every sample, including reverse seeks; no accumulated prop transform is saved.

## Ownership, build and lifecycle

An owned hand uses the explicit carrying pose and ignores speech lift channels.
Waves select the free hand. This changes neither the pelvis/leg solver nor the
route timebase. Appearance None releases the page; timed release and adjustable
grip replacement are not implemented. The grip is a bone anchor, not a guarantee
of perfect finger-to-paper surface contact or collision-free clothing.

Build morphs move the relevant joint rest positions and inverse matrices before
posing. Grip placement is recomputed from actual finger joints, not cached pixel
coordinates. Each runtime actor owns its page geometry/materials; these are
disposed with an evicted actor. The existing LRU remains bounded to 16 instances.

The reference regression samples both rigs, both hands, three builds, eight views,
standing/walking and seated/transition states. It checks grip drift, held-hand
priority, actual free-hand wave movement, release, cache bound and save/reopen.
Rendered angle sheets accompany those checks. A new rig must pass these contact
and ownership checks plus the existing face/gait suite before being advertised
as compatible.
