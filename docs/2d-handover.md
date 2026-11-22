# Porting between studios

Baseline: Animation Stage release 20261122c, commit 6db5dfe504c7397764a8e7eed09b48a9d6aa7fcd. This is a source snapshot, not a link or merge subscription.

| Concern | Start here in this workspace |
| --- | --- |
| Amaka/Tunde assets, attribution and rebuild inputs | assets/realistic-3d/, scripts/assets/build-realistic-3d.mjs |
| Poses, gait, ground routes and rendering | js/realistic-3d-renderer.mjs, js/realistic-3d-walk.mjs, js/realistic-3d-path.mjs |
| Builder, action editing, speech scheduling | js/realistic-3d-library.js |
| Speech motion, visemes, gestures and linked captions | js/character-sequence-speech.js, js/audio-lip-sync.js, js/caption-runtime.js |
| Scene time and playback | js/timeline.js, js/animations.js, js/export.js |
| Tests | scripts/smoke/realistic-3d-face.mjs and realistic-3d-library.mjs |

For a request such as "bring seated reading from 2D", inspect the original with npm run reference -- js/activity-kits.js. The command retrieves committed text from the sibling repository, not unsaved edits. Set STAGE2D_REFERENCE to its location if moved. The 3D app and its build do not need that repository to run.

Reuse the action's timing, seated posture constraints, prop ownership and semantics. Reimplement grip and occlusion using 3D hand bones and depth, not SVG coordinates or 2D draw-order tracks. Test standing/seated transitions, save/reopen, popup playback and export before recording the port. To adopt newer 2D work, explicitly review and update the pinned revision; never follow main automatically.
