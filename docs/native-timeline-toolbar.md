# Native timeline buttons

Local implementation, not deployed. Open **Animation & Camera Timeline** below
the stage. The transport row and clip-edit row are visible; expand **Timeline
view & preview range** for the less frequent controls. Each control has hover
help. Drag the stage/timeline divider upward for more timeline space.

| Pinned 2D control / workflow | Native 3D equivalent |
| --- | --- |
| Play, Stop, Start, End | Play/Pause, Stop, Start, End, plus ±Frame and Previous/Next clip boundary |
| Loop, Auto-return | Loop scene or marked preview range; Auto-return to playback origin after reaching the end |
| In, Out, Clear range | Set In/Out at playhead, shaded ruler range, Clear range |
| Zoom in/out/fit/reset | ±Zoom, Fit scene, Reset zoom, existing numeric zoom selector; Ctrl/Cmd+wheel zoom |
| Marker snapping | Snap ruler scrubbing and clip drag/trim to visible clip edges, playhead and In/Out boundaries within 10 pixels |
| Delete, Duplicate, Repeat | Visible clip buttons, Repeat with 1–20 extra copies, existing right-click menu; all edits support Undo |
| Copy/paste animation | Copy independent action/speech/shot; Paste at playhead onto the Character selected above the tracks |
| Undo/Redo | Local timeline buttons mirror the shared scene history |
| Collapse animation rows | Arrow beside each track name; only the timeline row collapses |
| Focus timeline rows | Chosen character only and Show caption tracks; camera lane stays visible |

Step rate selects 24/30/60 fps for the two Frame buttons. It does not set movie
export rate. Start/End use scene bounds; Stop returns to In (or scene start).
Previous/Next use visible clip boundaries. Pause keeps the current time.

In/Out, Loop, Auto-return, track collapse, zoom and filters are editing-session
preferences, not scene animation. Preview ranges do not trim or delete content
and do not change exports. New/opened projects reset preview range and playback
switches. After a duration edit the effective range clamps to the new duration.
Audio uses the same preview clock and is scheduled only up to Out; looping
restarts audio at In. Seeking outside a range is still allowed; Play starts at
In if the playhead is outside it.

Copy/paste retains action phase, camera framing/motion, speech trim offsets,
captions and embedded audio. It creates new clip IDs and checks destination
overlaps. Paste and Repeat can extend the scene up to 600 seconds. Repeat is one
Undo step and fails as a whole if a copy cannot fit. Actions retain their native
action names. Paste speech onto the chosen character; use Speech & Captions to
change it to narration. The in-memory clipboard is independent of the source
project, including its audio asset. Clipboard contents do not use the system
clipboard or sync between tabs.

Linked chair Sit/Stand use their contact controls. Travel copies use Duplicate
Character so linked movement keys stay together; they may still be split. Locked
characters remain protected. Clipboard operations do not copy solidity bindings,
hand contacts, transform keys or another character's ownership rules.

Shortcuts while focus is **inside the timeline** (outside text/numeric fields):
Ctrl/Cmd+C/V/D copies/pastes/duplicates; +/− zoom; 0 resets zoom; I/O marks range.
Existing clip arrow-key timing/Delete and playhead keyboard controls still work.
These shortcuts do not replace viewport navigation shortcuts.

The reviewed 2D multi-object Shift Rail, animation grouping/reorder, destructive
range deletion and continuous recording are not represented as working native
tools. They need a native multi-selection/key-recording contract and treatment
of chair/hand/collision ownership before porting. Use existing **Add Transform
Key**, native character/group duplication and explicit per-clip edits meanwhile.
2D effects, SVG layer-order and face-set merging do not map to native scene tracks.

Regression: `npm run build`, then
`node scripts/smoke/native3d.mjs --timeline-toolbar-only`. Also included in the
full local and future authorized hosted checks. Covers copy/paste/repeat,
isolation/overlaps, shared history, transport/frame/boundary stepping, fit zoom,
collapse/filter/captions, snapping and real Web Audio range/loop/auto-return.
