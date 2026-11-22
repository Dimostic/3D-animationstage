# Teacher and colleague: lesson-plan discussion

Open `reference.animstage` in an **updated 3D build** using File > Load.
The project embeds both WAVs, captions and editable clips; the models still load
from the studio. The studio must include the Held prop control to display the
document. The example project is kept in the repository, rather than served as
a public project file by the private beta.

| Beat | Time | What to inspect |
| --- | --- | --- |
| Arrival | 0–4.5 s | Tunde walks to the marked destination and holds position |
| Greeting | 4.8–7.6 s | Amaka waves, then Tunde responds after an editable gap |
| Sitting | 8.2–9.8 s | Both actors align with owned 3D chairs; soles are corrected to the chairs' ground plane |
| First line | 11–16.693 s | Amaka speaks; Tunde listens/nods with a resting mouth |
| Reply | 17.393–24.856 s | Tunde replies; Amaka's mouth rests |
| End hold | Through 26.356 s | Stable seated scene and document grip |

Amaka carries the page in her left hand. In the character's Appearance controls,
choose Held prop > Document — right hand to try the other grip, or None / release.
Waves use the unoccupied hand. The setting applies to the actor's appearance;
it is not yet a timed pickup/release action or a general two-hand reading kit.
Head and eye tracks are separately authored, not named gaze targets.

The current reference uses **Chair contact** in each actor's appearance. Chair
floor coordinates stay fixed during the approach; moving a chair repositions its
seated owner. The previous proxy scene is preserved in `chair-before` evidence.
General furniture and garment collisions are still incomplete; see
[chair-contact.md](../../docs/chair-contact.md). The camera stays fixed, and this
fixture does not claim anatomically or culturally reviewed clothing.

## Reproduce

```sh
npm run build
node scripts/smoke/conversation-reference.mjs --baseline
node scripts/smoke/conversation-reference.mjs
npm run test:conversation
npm run test:chairs
npm test
```

`npm run test:chairs` regenerates the current chair reference and its contact,
editing and export checks. `test:conversation` retains the earlier document-only
comparison; it does not overwrite the current reference project.
`npm run test:conversation` combines the build and the after-scene regression;
the direct Node command is useful when the build is already current.
On Windows PowerShell use `npm.cmd`. `--baseline` disables the document, matching
the original empty-hand capability; `after` enables the new grip with the same
scene geometry, framing, timing, captions and voices. Initial before evidence was
captured before renderer changes. Gait and rigs were not replaced.

Kept under `evidence/`: before/after projects, stage PNGs and MP4s; per-sample scene
checks; a close hand/view sheet; grip matrix checks; and repeated-preview parent
JS heap measurements. The final project is also copied to `reference.animstage`.
MP4 tests inspect video/audio tracks. Numeric attachment checks do not establish
perfect finger/cloth surface contact; review the angle sheet alongside them.

## Audio provenance

These are locally synthesized test lines, generated offline on Windows using
Microsoft Hazel Desktop and Microsoft George. They are not recordings of real
people and do not represent Nigerian accents. No paid or hosted provider is used.
Raw WAVs are in `audio/`; replace them through the normal scene audio/speech UI
when making your own scene. The transcript is included in the caption clips.

## Next acceptance work

The audit and adapted development phases are in
[character-development.md](../../docs/character-development.md). The next priority
is named gaze targets, with general furniture/cloth collision still pending.
Keep both chair and document regressions while extending direction.
