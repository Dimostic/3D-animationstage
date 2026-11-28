# Saving, finding and timing multiple camera shots

The new shot composer and saved-shot list are local changes, not yet deployed.
The currently deployed Face Close-up / Full Body / Scene Overview buttons prepare
the editor view only. On that version, choose Length and Add Camera Shot in the
timeline toolbar to save a shot; clicking its bar opens Start and Length.

## New local workflow

1. Select the speaking character and open Animation & Camera Timeline > Camera
   shots: face, full body & scene. Choose Face Close-up, Full Body or Scene Overview.
2. The **New camera shot** form opens directly below the framing buttons. Enter
   Shot name, Start and End, and choose Cut or Move from previous shot.
3. Click **Save Shot to Timeline**. This creates a purple bar in **Camera shots**
   and a named entry with its time range in **Saved camera shots**. The timeline
   scrolls to the new bar. Merely preparing the framing does not create a bar.
4. Start/End then advance to the next interval. Choose another framing and click
   **Save Next Shot to Timeline**. Repeat as needed.

Example: save a face shot at 0-3 s, a full-body shot at 3-6 s, then a scene view at
6-9 s. Each creates a separate camera bar. Use Move from previous shot for a
smooth move from an adjacent shot; Cut switches immediately. To hold a close-up
after a move, save another shot with the same framing after the move ends.

Shots capture the current editor view. For a moving character, put the playhead
at the intended capture time before pressing a framing button. Timing controls
schedule the saved framing; they do not turn it into a live target-following shot.
Travel follow cameras remain settings on their travel actions, not saved shot bars.

## Edit an existing shot

Click its purple bar **or its Saved camera shots entry**. The selected-shot form
shows Start, End and Length. End and Length stay synchronized; changing Start
moves the interval while keeping Length. Click Apply Timing to save the edit.
This form edits the selected shot; the New/Next camera shot form creates another.
Use Replace Framing to update an existing shot's captured view.

A visible empty camera lane now explains when no shots have been saved. The
saved-shot list also helps find very short shots or ones outside the current
horizontal view. Toggle/resize the timeline and scroll as needed.

Shot intervals cannot overlap. An overlap error preserves the new-shot inputs;
choose another interval or edit the existing shot. Extend scene to fit (on by
default) grows the scene when needed, up to 600 seconds. Undo/Redo and .stage3d
saving retain the shots and timing. Scene-camera preview and movie export use
the saved camera track; editor guides and forms are not exported.

Run build, then `node scripts/smoke/native3d.mjs --shot-workflow-only`.
The regression covers preparation versus saving, three camera bars, explicit
Start/End, next-shot timing, scene extension, overlap errors, saved-list selection,
End/Length synchronization, Undo/Redo, save/reopen, independent preview and mobile
form sizing. The full native suite and future authorized hosted acceptance runs
include this check. Project format stays v15.
