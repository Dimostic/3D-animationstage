# Character development: adapted brief and first audit

Reviewed 2026-11-22. Work concerns Animation Stage 3D only. The dedicated private
beta, deployment process, two pilot actors and Studio Exchange already exist.
Do not rebuild them as a character-development milestone. Changes stay local
unless deployment is explicitly requested; planning or completing a phase alone
does not authorize deployment.

## Product goal

Build ready-to-animate human characters with particular attention to Nigerian
people, clothing, settings and everyday activities. Choosing a library character,
appearance, movement and speech must not require cutting images, tagging joints
or rigging. Photo import, generation and capture remain optional authoring tools.
Keep the existing Amaka/Tunde assets, gait, contact solver and speech adapter.
Any proposed rig or gait replacement must begin with a saved failing comparison.

The first acceptance scene is a teacher greeting a colleague, sitting and
discussing a document. It uses local recorded/generated test audio, without
hosted or paid generation. The current reference is
[examples/teacher-colleague](../examples/teacher-colleague/README.md).

## Evidence and status

Status meanings: **verified** has saved-project and rendered/test evidence;
**implemented but not verified** has code but lacks sufficient acceptance evidence;
**partial** works for a narrower case than the brief; **missing** has no current
3D implementation. Verification is limited to the cases named here, not a claim
that every activity or garment is production-ready.

| Capability | Status | Evidence / limit |
| --- | --- | --- |
| Choose distinct Amaka/Tunde actors without manual rigging | Verified | Both actors in reference project, stage, popup and MP4; same preset geometry across views |
| Arrival, stop, greeting and editable pause | Verified | Route source retained, wave clips at 4.8s / 6.4s, numerical no-travel check during stop; before/after MP4 |
| Walking/jogging foot planting, knee continuity and pelvis stability | Verified | Existing face/library smoke suite remains the regression baseline; no gait equations or rig assets changed |
| Sit/stand pose | Verified | Both actors transition and retain seated channels in the reference and existing route tests |
| Chair/seat/floor constraints and furniture occlusion | Partial | Owned 3D contact chairs replace the reference proxies; paired seat/sole contact and depth are tested. General cross-actor/furniture and cloth collisions remain missing. See [chair contact](chair-contact.md). |
| Alternating speech, silent listener mouth and linked captions | Verified | Embedded offline WAVs; sampled speaker isolation for both turns, saved audio IDs and popup/MP4 audio tracks |
| Distinct viseme shapes at face close-up and stage size | Verified | Existing face smoke tests compare MBP/FV/vowels, blink/gaze and reset on both rigs; audio analysis is heuristic, not certified phonetic alignment |
| Listener head movement independent of speaking | Verified | Independent nod/head/gaze property tracks; listener mouth remains at rest during the other speaker's turn |
| Named gaze targets: other speaker, document, camera | Pilot implemented | Explicit scene-character, document and camera selection; bounded head/eye aim, Look/Release tracks, save/reopen and sandboxed playback; no automatic active-speaker selection |
| Bone-attached document with hand ownership | Partial | New pilot document grip works for both hands/rigs/builds/views; explicit held hand ignores speech-arm channels, free hand can wave; no general pickup/release timeline or imported-prop grip editor yet |
| Phone, cup, microphone, book, functional table/chair activity kits | Missing | Legacy 2D assets/menus are not 3D contact implementations |
| Identity, skin tint, hair tint, body build and two outfits | Partial | Existing controls retained and sampled; garment collision and quality across all activities still need review |
| Cultural wardrobe, children, older adults and reviewed Nigerian packs | Missing | Pilot characters are not a representative completed catalogue; do not infer identity from one outfit or scaled adult mesh |
| Save/reopen, reverse scrub, popup and MP4 agreement | Verified | Reference script and existing 3D smoke tests; reference file embeds audio and keeps appearance values |
| Two actors and repeated preview open/close | Verified | Reference regression repeats popup lifecycle and records parent JS heap delta; renderer LRU bounded to 16; this does not certify total GPU memory on all hardware |
| Anatomical/wardrobe realism approved by human reviewers | Implemented but not verified | Rendered views are available, but numerical drift and pixels do not establish anatomical or cultural quality |

## Three most visible gaps and the selected change

1. **No held document:** the baseline discussion had empty hands. The selected
   change adds a 3D page to an explicit wrist/finger grip and reserves that hand.
   The comparison keeps the existing models, route, scene framing and dialogue.
2. **Furniture contact (initial gap):** proxy chairs could be placed approximately
   but did not bind an actor. The chair phase now provides an owned 3D seat and
   sampled sole/contact constraints. General furniture and garment collisions
   remain outside that contract.
3. **Gaze selection (initial gap):** named targets now follow a chosen character,
   held document or camera. Look/Release clips blend ownership with manual tracks.
   Automatic speaker selection and per-clip target switching remain future work.

The document is a deliberately narrow first prop. It is parented in 3D, uses
the actor's depth/lighting, and remains with its grip when the actor turns,
sits or walks. The free hand receives a wave when the right hand is occupied;
speech hand channels cannot reposition the held hand. Selecting None / release
in Appearance removes the prop. This is not a general two-hand reading solver,
finger-surface collision solver, timed pickup/release, or interchangeable prop kit.

Validation: `npm.cmd test` and `npm.cmd run test:conversation` passed. The grip
matrix contains 288 cases with maximum anchor drift about `2.04e-15` rig units.
Six popup open/close cycles retained about 2.9 MiB of parent JS heap after GC,
below the regression limit of 12 MiB. The before/after videos each contain 317
video samples at 12 fps plus audio. Extracted 13-second MP4 frames were reviewed
alongside the stage stills. These bounds are test evidence, not a claim of
perfect mesh-to-mesh contact or universal memory behavior.

Reference: pinned 2D commit `6db5dfe504c7397764a8e7eed09b48a9d6aa7fcd`,
`js/activity-kits.js`, inspected via `npm run reference`. Its grip/ownership
semantics informed the audit, but no SVG grip coordinates or draw-order tracks
were copied. New modules/coverage: `js/realistic-3d-renderer.mjs`,
`js/realistic-3d-library.js`, `scripts/smoke/conversation-reference.mjs`.

## Adapted phases and gates

| Phase | Next acceptance gate |
| --- | --- |
| A — Rig contract and proportion review | Use [the pilot rig contract](3d-rig-contract.md); compare front, profile, three-quarter and back at close-up and stage size. Resolve visible posture defects before replacing a rig. |
| B — Motion/contact | Owned chair/seat pilot implemented; retain both actors/builds/outfits and floor-contact tests while extending general furniture collision. Preserve the gait baseline. |
| C — Face, gaze and speech | Named gaze pilot implemented; retain target/contact/speech regressions while extending per-clip target switching. Review visemes and relaxed neutral faces visually. |
| D — Hands and activity kits | Expand the document pilot into editable grip frames and timed ownership; then chair/table/book/phone/cup/microphone. Test hand-to-prop contact, face clearance and explicit-action priority. |
| E — Modular appearance | Expose only reliable identity/build/skin/hair/outfit/accessory changes, with Reset. Validate clothing while seated, reaching, walking and raising arms; compatible skeletons, not arbitrary head/body swaps. |
| F — Nigerian library | Reviewed education, healthcare, market/community, farming/trades, office and ceremonial packs. Represent variation within each setting; seek knowledgeable review for culturally specific clothing. Use age-appropriate assets/motion, not resized adults. Record provenance/rights. |
| G — Direction | Editable waits, parallel performances, routes, speech windows, gaze and hand ownership. Moving B's chair/reply should not rebuild A's route. Add actor/pair camera tracking after the fixed-shot performance passes. |

Each significant change needs both actors, defect-revealing angles, face close-up
and stage-size evidence, contact/timing/discontinuity checks, save/reopen, reverse
seek, popup and export. Preview must not mutate project state. Explicit actions
and prop ownership outrank automatic gestures. Keep clips editable and test the
preview lifecycle before expanding the catalogue. Add motion capture or generated
motion only after mapping, contact correction and editable-key review exist.

Do not add paid generation, change authentication, promise lossless 2D/3D exchange,
or deploy as a side effect of a plan alone. The chair pilot is documented in
[chair-contact.md](chair-contact.md). Named gaze is documented in
[gaze-targets.md](gaze-targets.md). Next extensions include timed target switching
and general prop interaction; retain chair and document contact regressions.
