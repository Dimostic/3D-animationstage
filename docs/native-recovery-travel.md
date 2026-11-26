# Camera guides, recovery and travel actions

## Visible camera and live angles

Use **Show Scene Camera** beside Camera View. The editor shows a camera icon and a
short view-frustum guide, and frames the scene including the camera once when
switched on. The overlay reports camera yaw/pitch and the selected object's body
yaw and horizontal angle to the camera. Rotate a character or edit the camera to
see these values update. This is independent of switching into Camera View.

**Scene & Camera > Scene Camera Position / Target** previews position, look target
and FOV changes live. **Apply Camera** (or Apply Scene Settings) saves the draft;
**Reset Preview** returns to the active scene/shot camera. Draft camera settings
are not exported until applied. An active camera shot can override the saved base
framing. Guides and angle labels are editor-only and are omitted from exports. The frustum
follows the viewport aspect; use the movie dialog camera preview for exact export
dimensions. Home includes the camera when its guide is enabled.

## Finding and recovering objects

A Scene-list click selects; it deliberately does not reposition the view. Objects
may be off-screen, behind the editor camera, hidden by a parent, at another animated
position, or hidden by an unavailable support/owner. Very large objects could also
exceed the editor camera's old fixed clipping distance; framing now adjusts that
range. Collapsing the viewport now keeps camera aspect finite as well.

Double-click a Scene item, use **Show Selected on Stage**, or right-click >
**Show object on stage / Unhide**. These switch to the editor view and frame the
current evaluated bounds. Show also unhides the object and its ancestors when
editable. Framing does not move the object or change its animation. A hidden,
locked object must be unlocked before its authored visibility can change.

The context menu also provides Frame without visibility changes, Show at scene
start, Lock/Unlock, Duplicate, Clone, Hide/Show, Bring to stage centre, Reset scale,
Travel to Point, linked-owner/support framing, surface release, and Delete.
Unavailable actions are disabled. Keyboard users can press Shift+F10/Context Menu
on a Scene row, use arrow keys, and Escape to close.

Bring to centre and Reset scale are actual edits and can be undone. They respect
locks and active contacts, and reject a blocked recovery destination when Prevent
Overlap is enabled. For a missing support/holder, restore or release that contact;
framing cannot make a broken ownership link render geometry.

## Stage and timeline space

Drag the labelled **Stage / Timeline** separator to trade stage height for timeline
space. The stage can now be reduced further. **Collapse Stage** in the Workspace
bar hides the viewport and gives the central area to the timeline; **Show Stage**
restores it. The preference is local to the browser. Reset Layout restores the
normal layout. Recovery commands reveal a collapsed stage automatically.

## Travel modes and cloned characters

**Selection Tools > Travel to Point** offers Walk, Natural Walk, Stroll, Strut,
Jog, and Run. The action dropdown in Animation & Camera Timeline also lists each
“To Point” variant and opens the same destination controls. Pick the floor or
enter a world destination, choose duration, then Add Travel to Point. The start is
the playhead. **Suggest duration for gait** uses approximate metre-based speeds;
duration ultimately controls actual speed. Run currently uses the existing jog
rig with faster cadence; it is not a separate captured run cycle. Obstacles do not
produce automatic pathfinding: add intermediate travel segments around them.

Clones intentionally inherit existing animation. Previously, adding another Walk
at the same time appended an overlapping action and failed validation. The explicit
**Replace overlapping actions and their movement** option now replaces whole
overlapping clips and their owned keys, with Undo available. Disable it to retain
those clips and choose a free interval instead. Plain keys inside the replaced
interval are replaced too; keys outside it remain unless owned by a replaced
travel clip. **Extend scene duration to fit** avoids exceeding the scene end, up
to the existing 600-second limit. Both options are visible before adding travel.

Travel blocks are labelled **Natural Walk to Point**, **Jog to Point**, etc. They
are action blocks with linked endpoint movement keys. Drag/trim or edit their
start/duration to retime movement as well. Their clip editor also exposes the
world destination at the current parent pose. Adjacent routes share endpoint keys;
copies remap ownership to their new action IDs. Endpoint transform edits preserve
those links. Clearing movement keys turns travel labels into ordinary gait cycles.
If manual intermediate keys obstruct retiming, move/remove them first.

Older v1-v11 scenes upgrade to v12. An old gait plus exactly matching moving start
and end keys, with no interior keys, is recognised as travel. Ambiguous multi-key
motion is left unchanged. Keep originals if an older workspace is still in use.

Build and run `node scripts/smoke/native3d.mjs --recovery-travel-only` for camera
preview/angles, giant-object framing, context-menu locking/visibility, stage
collapse/restore, cloned legacy travel replacement, route labels/retiming,
adjacent shared endpoints, copy ownership, gait support and duration extension.
