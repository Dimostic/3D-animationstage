# Named gaze targets

Open **3D Studio → Edit Selected Character**, or right-click a placed character
and choose **3D Appearance and Actions**. Under **Gaze target**, choose Camera,
Held document, or Character / speaker and select the other character by name.
Use **Apply Appearance** to save. Field preview does not change the project.

Camera follows the renderer's viewing direction. Document follows the actual
held page. Character follows the other actor's posed head, including movement,
body turns and chair binding. The character ID persists across save/reopen;
renaming the target does not break the binding. Selection is explicit: this does
not automatically select whoever has the current speech clip.

Gaze strength blends target ownership with manual head/eye channels. **Look at
gaze target** and **Release gaze target** are editable timeline actions using
`realistic3DGazeBlend` (0–1). The default is 1; manual mode ignores this channel.
Release returns control to manual tracks and speech motion. Named gaze owns head
direction and eye aim at full strength, while retaining a small speech nod.
It does not change body turns, mouth animation, hand ownership or chair contact.

Head yaw/pitch are bounded to 60/25 degrees and eye yaw/pitch to 22/12 degrees.
Targets outside that range need a body turn. The solver is deterministic at a
given pose; transitions should use Look/Release clips rather than changing
appearance during playback. There is one configured target per actor, not a
sequence of target switches. Missing/hidden/self character targets and a missing
document fall back to manual motion. Positive visible dimensions/scales are
required for scene-character targeting. Arbitrary prop targets and occlusion
avoidance are not included.

The renderer takes an explicit scene-object list, including in sandboxed popup
playback. Resolving a target's physical pose disables its own target lookup, so
mutual gaze cannot recurse and does not depend on draw order. Scene characters
use the same stage/ground projection as chair and walking placement. The builder
uses the original stage coordinates for scene targets while drawing its preview.

Run `npm run test:gaze` for discovery, example replacement/cancellation, editing,
288 actor/outfit/view/target/seated cases, moved-chair tracking, deterministic
repeats, limits/fallback, save/reopen, Look/Release tracks and sandboxed playback.
The reference conversation and MP4 are also exercised by `npm run test:chairs`.
Evidence: `examples/teacher-colleague/evidence/gaze-checks.json` and
`gaze-views.png`. The full face/gait/library and hosted checks remain release gates.

This is a new 3D implementation using the existing rig; no 2D source was ported.
