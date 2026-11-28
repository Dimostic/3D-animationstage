# Camera Studio and visual tutorials

Local changes; not deployed. Open **Camera Studio** above the stage, or select a
camera bar → **Edit Start / Finish in Camera Studio**. Existing shot composer,
timeline timing and camera-inspector controls remain available.

## Findings and resulting workflow

Previously the editor view, saved camera and captured shot destinations were easy
to confuse. Moves hid their starting framing; exact shot End switched to the next
shot/gap; there was no simultaneous audience view or visual frame strip. Older
easing/destination edits could discard an explicit starting pose.

1. Select a saved shot or **New Camera Move**. New drafts start after the last
   saved shot to avoid overlaps. Set Start, End, Move duration and Speed together.
   Time remaining after movement holds Finish. Extend scene to fit controls saving
   beyond the current duration, up to 600 seconds.
2. **Edit Start View**, then Orbit/Pan/Zoom in the stage. The monitor follows the
   editor camera. Object picking/gizmo changes are blocked during composition.
   Click **Use Current Editor View** on the Start card to capture it.
3. Repeat for Finish. Exact position/target/lens controls are under each card.
   Cut/hold shots use only Finish; switching to Move exposes Start.
4. Scrub, step at 24/30/60 fps, Play This Shot or use Large Camera View. Draft
   Finish inspection is inclusive and does not jump to the next shot.
5. To change an intermediate framing, save and scrub to it, then **Split at Preview
   Frame**. The right segment opens there; edit its Start. Keep split boundary joined
   updates the previous Finish on this save. Splits preserve motion until the
   boundary is reauthored; inspect easing/speed through the join afterward.
6. Refresh Storyboard renders five actual camera pictures; click one to inspect
   that moment. It runs explicitly to limit CPU work. Edits invalidate the strip.
7. Save Camera Move / Save Camera Changes creates/updates the purple bar with
   Undo/Redo. Preview Saved Scene clears draft/shot-only overrides; use main Play
   to check all saved transitions and gaps.

Unsaved previews are labelled **UNSAVED DRAFT** and save buttons gain an asterisk.
They are excluded from saved projects and movie export. Invalid times/overlaps
keep the inputs and saved scene. Switching shots requires Save/Discard, explained
inline. Closing ends preview and restores ordinary camera/range behaviour; the
form draft remains for reopening. Opening a new project resets the studio.

Unchanged split shots retain their original easing source range. Endpoint/easing
reauthoring uses the visible Start/Finish. The older numeric camera inspector,
scene form and Replace Framing preserve the move's explicit start when updating
Finish; unrelated scene setting edits preserve split sources.

## Monitor, exact framing and limits

The monitor is another render pass from the **existing WebGL renderer**, not a
new graphics context. It renders the scene camera without editor helpers, then
draws captions. View-dependent character gaze is evaluated for the shot camera
with the editor pose restored after the extra pass. Choose landscape 16:9, portrait 9:16 or square 1:1. Large Camera
View letterboxes the same ratio; a thirds grid helps composition. Monitor width
adapts to stage height. Studio opening gives the stage usable space while keeping
the draggable divider and saved size preference. Disable the monitor to avoid its
extra render pass on slower computers.

Match movie export ratio and choose **Scene camera**, then save first. Preview
resolution, antialiasing and lighting quality can differ from final export.
Optional path guides connect camera endpoints (gold) and targets (blue); these
are helper geometry, not scene objects or collision-aware routes.

The scene format stays v17: motion source/destination, easing range and move
duration already exist. Camera shots interpolate position, target and field of
view. Targets are world-space snapshots, not automatic character tracking.
Travel-follow cameras remain separate. Curved camera splines, camera roll,
optical depth of field and camera collision avoidance are not implemented.

## Visual tutorials and safe practice

**Tutorials** opens `/assets/studio3d/tutorials/index.html`: plain text, an original
SVG infographic, actual rendered practice-frame PNGs, a workspace screenshot,
interactive schematic and troubleshooting. No audio or external service is used.
The page supports keyboard interaction and mobile layouts.

The practice link opens `index.html?lesson=camera-basics` in a separate tab:
wide hold 0–2 s, move closer 2–5 s, hold 5–7 s, return 7–10 s. Shot 2 opens in the
studio. Recovery reads and autosave writes are disabled in that tab; the ordinary
workspace and recovery copy are preserved. Manual project saving remains usable.
It is a real rendered 3D example, separate from the labelled schematic.

## Verification

Build, then `node scripts/smoke/native3d.mjs --camera-studio-only`. Included in
full native and future authorized hosted checks. Covers source-preserving edits,
split ranges, inclusive End, scrubbing/steps, protected composition, monitor
pixels versus captured camera frames, draft/export separation, storyboard,
aspect/history, shot playback, new-shot extension, overlap/close cleanup,
tutorial behaviour and practice recovery isolation. The native and codec suites
also check renderer/export integration. Test screenshots go to `tmp/`; selected
tutorial PNGs are checked into `assets/studio3d/tutorials/` and copied by build.
