# 3D Character Library artwork

Amaka and Tunde are fictional pilot characters. Their models are built from the
[MakeHuman base mesh, macro targets and rig data](https://github.com/makehumancommunity/makehuman/tree/a8bc2d54ff0ac92e78ff71431b1023eda42bf482),
and selected garments, hairstyles and textures from the
[MakeHuman CC0 system asset pack](https://www.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html).
These source assets are licensed under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).
The MakeHuman application is not included or executed at runtime.

To rebuild from a checkout of that source revision, install project dependencies
and make FFmpeg available on `PATH`. From the project root:

```sh
node scripts/assets/fetch-realistic-3d-sources.mjs
node scripts/assets/build-realistic-3d.mjs path/to/makehuman/makehuman/data
node build.js
```

The editor stores only the preset ID, appearance and timeline values. The models
are loaded on demand. Browser preview and HTML playback load the public models
and renderer from the app server; HTML playback is not an offline package. The
legacy photographic workspace and its project data are separate.

The Build slider blends conservative MakeHuman weight targets at constant
height. Each outfit and shoe mesh is refitted against the same target body,
and the skeleton uses matching rest positions; no per-actor model data is
embedded in project or animation files. Projects without a build value use the
original mesh.

## Walking reference

The data used in this project was obtained from [mocap.cs.cmu.edu](https://mocap.cs.cmu.edu/).
The database was created with funding from NSF EIA-0196217.

The 3D gait uses compact retargeted profiles from subject 69, trial 69_01
(120 Hz). The [source archive terms](https://mocap.cs.cmu.edu/) permit including
the data in products. Only the derived curves are bundled, not the capture files.
The sampled cruise was about 104 steps per minute and 0.64 leg lengths per step.
The app scales that stride down for the rig and footwear, and preserves saved
route destinations and durations. This is an animation reference, not a standard
that all human walks must follow.

To reproduce the profiles, obtain
[`69.asf`](https://mocap.cs.cmu.edu/subjects/69/69.asf) and
[`69_01.amc`](https://mocap.cs.cmu.edu/subjects/69/69_01.amc), then run:

```sh
node scripts/assets/extract-realistic-walk.mjs path/to/69.asf path/to/69_01.amc --profile
```

For walking, the runtime retargets the curves to the character, keeps at least one foot
planted, and uses an independent standing launch and settling step.

**Walk cycle**, **Stroll cycle**, and **Strut cycle** share the same contact
solver. Stroll uses a slower cadence with a more visible swing; Strut uses a
brisker cadence, a longer step, and a wider swing. The corresponding
**to Point** actions use the same styles while travelling to a stage target.
**Jog cycle** and **Jog to Point** use a shorter stance, a brief airborne phase,
more knee recovery, and bent elbows. The trunk inclines from its base as the
jog builds. The heel folds up behind the hip before the thigh reaches its
forward peak; neither the planted footprints nor the route endpoints change.
The lean fades out on the final step.

Jog to Point uses closer footprints than the maximum reach of the rig. Its
automatic duration uses the same 0.40-second footfall as the default six-step
in-place jog. Editing the route duration recalculates the step count within
stride and cadence limits; very slow timings can still produce slow motion.
To apply new footfall planning to an existing recording, reopen the route and
choose **Update Timeline Action**. Saved timing and destinations are otherwise preserved.

The slow-running comparison is [Fukuchi et al., Table 4](https://doi.org/10.7717/peerj.3298)
(mean peak knee flexion 93.5 degrees at 2.5 m/s). Trunk posture also varies
between runners and conditions ([AminiAghdam et al.](https://pubmed.ncbi.nlm.nih.gov/34077302/)).
The rig angles are animation targets, not a universal running standard.

Both hip sockets follow one support-height track throughout the gait, including
the handoff between feet. The leg solver can adjust reach by up to 2.3% to keep
the knee moving smoothly without raising one hip independently. Shoe size and
foot targets are unchanged, and the rig returns to its authored scale at idle.
Walk styles share the same lateral weight transfer intentionally; cadence, step
length, clearance, arm swing and trunk rotation distinguish them. Trunk filtering
can be calibrated per rig without changing the planted-foot solver.

For a placed actor, choose a **to Point** action in **3D Appearance and Actions**,
pick the first destination, then use **+ Waypoint** to extend it (up to ten
points). Click a point's coordinates to move it, or the trash button to remove
it. While picking, a dashed guide connects the actor's starting position and
the numbered points in order. Circles mark pass-through points; squares mark
stops and the finish. This guide is not part of the scene or export.
A pass-through point rounds the corner without restarting the stride.
During a bend, a planted shoe holds its heading and the airborne shoe turns
toward its landing footprint over the swing, including across the back-facing angle.
For an in-place gait or wave, **Action duration (s)** sets timeline length;
**Pace** sets how quickly the steps or hand movements repeat within that time.
For example, a 4.8-second jog at Normal uses twelve steps, while a 2.4-second
jog uses six. Short clips round to whole footfalls. **One performance, fit to
duration** keeps the old stretch-to-fit behavior. For a standalone Sit, Stand,
or Turn, set **Transition duration (s)** and **Hold after (s)** separately:
a one-second turn and a four-second hold reserve five seconds before the next action.

Choose **Stop and wait** for a pause or a tight reversal. **Action at stop**
can be None, Wave, Sit, a relative 90-degree turn, or **Turn to face** one of
the eight stage views (front, back, either profile, or any three-quarter view).
For example, **Face front** takes the shortest turn toward the viewer regardless
of the incoming direction. The character holds that facing during the wait,
then turns toward its next destination if there is one. The wait starts after
the action finishes. The waypoint's **Action duration (s)** controls the action
itself. A four-second wave and a one-second wait reserve five seconds after
arrival; changing the wave duration adjusts the total rather than taking
time from travel. At an intermediate stop, **Continue with** changes the gait
for the following stretch. A seated character stands before travelling again;
a final Sit remains seated. **Seconds** includes travel, actions, stands and waits.

For example, choose **Walk to Point** and pick the doorway. Set **Action at
stop** to **Wave** and the wait to one second. Add the chair as a second point,
set the doorway's **Continue with** to **Stroll** and the chair's **Action at
stop** to **Sit**. The character faces the next destination before leaving.
The chair is a scene prop and must be placed separately.

For a greeting at a doorway, choose **Face front**, click **Add action**, and
select **Wave**. The list plays from top to bottom. Set each duration, use the
arrows to reorder, or remove a row. The wait follows the entire list. **Preview
this stop** plays the last part of the approach, the actions, the wait, and the
first departing step, without recording anything.

Open **Speech** at the stop. Select scene audio, upload a recording, or expand
**Generate speech from text**, enter the line, load voices, choose a voice and
speed, and generate. Enable **Create linked captions** to use the spoken text
or enter your own wording. **Caption style** includes placement, bubbles, font,
background, highlighting, text progression and a maximum words per chunk.
Use **Edit captions** for detailed edits after recording. Choose whether to
wait, continue moving, or keep independent timeline timing. **Speech delay**
offsets arrival-linked speech. Saving creates lip sync and binds the audio and
captions without duplicating the line; reopening restores the text and settings.
Select **No speech** to unlink the clip without deleting it from the scene.

To change a recorded action, click its timeline bar, or right-click it and
choose **Edit 3D Action or Route**. Clicking either leg of an intact multi-stop
route opens the entire route. Reopening the library with a recorded character
selected restores the selected timeline recording, the action under a nonzero
playhead, or the last edited/added recording. After loading a project, the
latest recording is used if nothing else is selected. To append instead,
choose **New action** from **Timeline action**. You can also right-click the character on the stage,
choose **Edit 3D Action or Route**, then select a recording under **Timeline action**.
Click a numbered coordinate to pick a replacement
on stage, or change the gait, stops, waits, or total seconds. **Update Timeline
Action** replaces the recording; **New action** in the **Timeline action**
selector switches back to appending. Following consecutive 3D actions shift with
the edit, preserving the gaps between them. Audio and other actors do not move.
