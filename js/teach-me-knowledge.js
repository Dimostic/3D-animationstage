/* ============================================
   Teach Me — Centralized Knowledge Base
   ============================================
   
   HOW TO UPDATE:
   When adding a new feature to the app, add a new entry to 
   TEACH_ME_KNOWLEDGE below. Each entry needs:
   
   - keywords:  array of match terms (plain words or regex-like with .*)
   - title:     short title for the topic
   - answer:    HTML string shown in the built-in chat (use <h4>, <ol>, <li>, <strong>, <code>, .tip-box)
   - summary:   plain-text summary used in the LLM system prompt (keep it concise, 2-5 lines max)
   - category:  grouping key (e.g. 'objects', 'animation', 'tools', 'export', etc.)
   
   The TeachMe class auto-builds:
   1. The built-in keyword matcher from 'keywords'
   2. The LLM system prompt from 'summary' fields
   
   No other file needs editing — just add entries here.
   ============================================ */

const TEACH_ME_KNOWLEDGE = [

    ...[
        ['animate-menu', 'Animate: Character and Scene Tools', 'animate menu character sequence scene choreographer head body turn movement debugger seated turn',
            'The stage toolbar Animate menu directly opens Pose & Movement, Character Sequence, Scene Choreographer, Head Turn, Body Turn and Movement Debugger. New smooth body turns default to Quick pivot with a 0.5-second turn; remaining step time holds the final pose. Gradual turn remains available. Turn duration is limited by the available step time, with seating time reserved. Walking pivots use their gait timing instead. Existing saved turns retain their timing until edited. Seated body turns work with or without experimental smoothing: standing characters turn first then sit, while already seated characters retain their seated posture. Select one character for character tools or multiple characters for choreography. Existing Pose Armature shortcuts remain.',
            ['Select a character, then choose Animate above the stage. Character Sequence orders actions for one actor; Scene Choreographer coordinates multiple actors and camera cues.', 'Right-click a character for Pose & Movement, Character Sequence, Head Turn where supported, or Body Turn. With multiple characters selected, choose Choreograph Selected Characters.', 'Right-click a recorded timeline clip and choose Edit Character Sequence or Edit Choreography to reopen its saved recipe. Head Turn is independent of Body Turn and remains available as a sequence overlay.', 'In Body Turn, choose Seated to finish seated, or Keep current pose to preserve your starting posture. Smooth body turn controls intermediate artwork, not whether seating is applied.', 'Within a speech step choose Speech gestures: Auto or Custom. For seated conversation, add a Wait step after sitting; explicit actions and occupied hands remain protected.']],
        ['strong-head-look', 'Strong Side Look and Over the Shoulder', 'over shoulder strong side look profile back head turn',
            'In Pose Armature Head Turn, front SVG bodies offer Look: Strong side look and back SVG bodies offer Look: Over the shoulder. These opt-in actions use matched-angle artwork, extend the turn beyond the subtle range and expose a side profile on a back body. The torso and shoulders remain fixed. Left/right, sweeps, cycles, holds and return settings still apply. The back profile is hidden during idle and ordinary subtle turns.',
            ['Select a front or back SVG character and open Head Turn.', 'Choose Strong side look or Over the shoulder in Look, then choose left or right and a turn amount.', 'Preview and Add to Timeline. A back profile has a small speaking-mouth cue, not a complete front-facing face. Universal and photo heads are not supported by this head-artwork control.']],
        ['independent-head-turn', 'Independent SVG Head Turn', 'head turn front left right three quarter independent head sequence overlay',
            'Front/back and experimental front 3/4 SVG characters have a Head Turn button beside Character Sequence in Pose Armature. Matched-angle artwork interpolates a shared SVG head construction without turning the body. Front/back bodies also offer Left to right and Right to left sweeps through centre. Turn duration applies to each leg. Cycles selects 1-20 repetitions. Hold at target pauses at the destination on every cycle. Between cycles, sweeps smoothly travel back to their starting side; one-direction turns return to their initial pose. Wait between cycles pauses there before the next turn. Return after final cycle controls only the final return to the original direction. No extra wait is appended after the last cycle. The complete duration must fit a sequence step. Original artwork switch remains available. Back turns are subtle, with no automatic face reveal.',
            ['Select a supported SVG character, open Pose Armature, then Head Turn. Front/back bodies offer left/right and Return to front/back. Experimental front 3/4 bodies offer Face viewer and Return to 3/4. Preview, then Add to Timeline at the playhead. Select a saved standalone head-turn clip in the same panel to change its settings and Update selected clip. Overlapping head-turn or gaze tracks are rejected.', 'Within Character Sequence, enable Head turn overlay on a supported step. Its duration plus hold and optional return must fit within that step. Body-turn steps cannot have this overlay, but a side-to-front turn can precede it. Sequence clips are edited in Character Sequence.', 'New head turns use Matched-angle artwork (experimental): face landmarks interpolate continuously while hair and headgear retain one construction. This is stylized 2D turning, not a 3D model. Its neutral head can differ from the original preset. Choose Original artwork switch to retain the earlier drawings. Existing projects without a construction setting retain the earlier mode. Blinking remains independent of turn amount.', 'Front and front 3/4 head turns retain mouth animation. Following eyes return to their original gaze. Subtle back turns keep face and mouth hidden. Select Over the shoulder explicitly for a stronger back turn with a side profile and small speaking-mouth cue; shoulders remain stationary.', 'Photo/realistic heads, Universal Characters, side bodies, projected 3/4 and back 3/4 bodies are not supported by this experimental control. Older standalone head-turn clips without saved settings can still be adjusted in the timeline keyframe editor.']],
        ['sequence-travel-angle', 'Diagonal Sequence Travel', 'diagonal angle walking running stroll strut sequence direction travel',
            'Travelling walk/run sequence steps offer Travel angle offset (degrees); Pose Armature Movement Blend also provides Travel angle. Blank or zero preserves the default path. Positive values rotate travel clockwise on the stage; negative values rotate counterclockwise. Facing, joint angles and gait bob are retained. Sequence Travel (px) sets the distance along the main path, including vertical front/back travel. For to-point-and-back it sets the outward distance, not the round-trip total. Zero keeps travel in place, negative reverses it, and blank uses the original distance. In-place source cycles without travel cannot be redirected.',
            ['Choose a travelling walk/run action in Character Sequence. Set Travel distance as usual.', 'Set Travel angle offset, from -180 to 180 degrees, or leave Default. For rightward travel, +45 goes down-right and -45 goes up-right. Leftward travel rotates from the leftward default instead.', 'The character view does not change with the path. Use a separate Turn step when needed. This is 2D path direction, not automatic perspective or terrain tracking.', 'Preview the full sequence, then Add to Timeline or Update Timeline. A to-point-and-back action returns along the redirected path.']],
        ['sequence-resize', 'Animate Character Size', 'resize grow shrink animated character scale feet center sequence size',
            'Pose Armature has an independent Resize animation button with target size, duration, Feet fixed or Center fixed anchor, Smooth or Linear timing, Preview, Stop and Add to Timeline. Target size is relative to the current character size. Overlapping character animations are rejected; use a combined sequence when needed. Character Sequence also has a Resize action type, relative to the sequence starting size. The resize scales the rig and preserves its joint pose. In a sequence, a later Resize to 100% returns to the starting scale.',
            ['Add a Character Sequence step and choose resize under Action type.', 'Set Size (% of starting size): 150 grows to one and a half times the starting size; 100 returns to the starting scale. Choose duration and optional wait.', 'Feet fixed holds the bottom-center of the character bounds in place; Center fixed holds the bounds center. Neither changes joint angles.', 'Preview or scrub to check the transition, then Add to Timeline or Update Timeline. Saved templates retain resize settings.', 'This is a character-size change, not a camera zoom. Scene furniture and replacement prop artwork are not resized by this step.']],
        ['sequence-speech-edit', 'Edit Sequence Speech', 'sequence edit generated speech text regenerate replace upload audio search actions',
            'Character Sequence and Scene Choreographer keep speech text, voice and Speech speed in each step. Expand Generate speech from text to edit and regenerate. Local speech speed ranges from 0.5 to 1.5; paid sources retain 0.75 to 1.25. A speed of 1 is normal; regenerate to apply it. Uploaded recordings are unchanged. Replace selected speech audio is checked by default, so generation or upload updates the same audio row while preserving step timing. Caption style and Edit captions offer Maximum words per chunk: new sequence captions use 8, and 0 means unlimited. This limits long sentences and progressive reveal without changing the transcript. Paired bilingual cues require manual splitting. Search actions filters each pose/movement list without changing its current selection.',
            ['Expand Speech and Generate speech from text on the step. Edit the retained text, load voices and generate. Paid providers still require confirmation.', 'Keep Replace selected speech audio checked to update the selected clip, or uncheck it to create a separate row. Upload speech audio uses the same replacement choice.', 'Preview, then Add to Timeline or Update Timeline to rebuild lip sync and step timing for the new audio duration.', 'Type into Search actions above the Action list. The currently selected action stays available even when it does not match. Clear the search to show all actions for that view.']],
        ['prop-artwork-fit', 'Fit Custom Prop Artwork', 'flip mirror custom prop reset fit size offset rotation basket gun',
            'Both regular Activity Kit replacement and Character Sequence Props support horizontal and vertical artwork flips. Flips change the image, not the grip, movement or object layer order. Reset prop fit keeps the uploaded image and restores size, offsets, rotation and flips.',
            ['Upload or select replacement artwork, then choose its role under Replace kit item.', 'Use Flip horizontally or Flip vertically to orient the artwork. Preview the movement to check its grip.', 'Adjust size, offsets and rotation. Invalid values are rejected without changing the saved fit.', 'Reset prop fit retains your uploaded image. Restore built-in prop removes it instead.', 'Add or update the timeline action to apply edits. Flipping an image does not generate a different view or recognize a new hand contact.']],
        ['character-sequence', 'Character Sequence Animator', 'character sequence steps wait pause walk turn sit seated gesture timeline template',
            'Character Sequence combines poses, movements, waits and supported front/side/front-3/4 turns into one editable action. Step speech can finish before advancing, continue across steps, or retain independent audio timing. Activity kit items can use copied stage images or uploads, with artwork fitting and keep/clear controls.',
            ['Right-click an SVG or Universal Character and choose Character Sequence, or open it from Pose Armature.', 'Set starting X/Y and Timeline start. Add, reorder, duplicate or delete Movement, Pose, Wait or Turn steps.', 'Duration is per cycle for movements; Wait after holds the ending pose. Travel distance uses stage pixels. Arms only / keep posture preserves a seated pose during gestures.', 'Expand Speech on a step. Select or upload an audio clip, or generate speech using configured voices. Paid providers require confirmation. Select finish speech before next step, continue while speaking, or independent timeline timing.', 'Lip sync only leaves body animation to the sequence. Optional eyes and expression add facial motion without replacing arm gestures. Attach each audio once to span multiple steps without restarting it.', 'Preview or scrub; Stop restores the stage and audio. Add to Timeline applies both. Reopen the action to edit. Moving linked audio manually makes its timing independent; after trimming or replacing audio, update the sequence to rebuild its speech timing.', 'Deleting a speaking step offers keep/unlink or delete audio. Sequence templates reference existing scene audio, not embedded files; choose replacement audio when reusing in another scene. Expand Props to replace supported kit items and control their lifetime.']],
        ['activity-prop-replacement', 'Replace Activity Kit Props', 'upload activity kit basket gun custom prop replace regular pose armature',
            'The regular Pose Armature Activity Kit panel supports custom replacement artwork. Select an activity, enable Include activity props, then use Replace prop > Upload Prop or choose a stage image copy. Replacements and fitting settings are scoped to the activity and retained in editable timeline actions.',
            ['Select a pose or movement with a matching Activity Kit. Open Activity Kit and enable Include activity props.', 'Under Replace prop, choose Held tool for a basket, gun or other handheld item. Other roles include Chair, Table, Plate and Board when the activity provides them.', 'Click Upload Prop for PNG, JPEG or WebP, or select a stage image copy. Use transparent, tightly cropped images. Original stage objects are not modified.', 'Adjust artwork size, horizontal/vertical offset and rotation, then Preview. The built-in grip and movement are reused; grip recognition and unseen views are not generated automatically.', 'Use Save activity fit to retain the replacement with this character, or Save kit for a browser preset. Adding to the timeline retains it for later action editing and export.', 'Restore built-in prop removes the replacement for the selected role. Choose another activity to use its own fit rather than carrying the same replacement across unrelated actions.']],
        ['sequence-review', 'Sequence Timing and Templates', 'character sequence review timing jump step overlap import export template share',
            'Review Timing compiles a sequence without adding it, displaying exact timeline start/end times per step and the total duration. It warns about overlapping sequence speech and retained props followed by another kit. Export/import .sequence.json templates include custom prop images but not audio files.',
            ['Open Character Sequence, set Timeline start and click Review Timing. Correct any missing actions or audio before adding to the timeline.', 'Use the crosshair button beside a reviewed step to seek to its start. Stop restores the original stage state. Editing settings invalidates the timing review; run it again.', 'Speech overlap warnings refer to speech attached within this sequence. Review other timeline audio separately. Clear earlier props before another kit when you do not want duplicates.', 'Export a template with the download icon; import it with the file-import icon. The imported sequence starts at the selected character position. Its captured pose and requested views remain part of the template.', 'Templates include custom prop artwork but reference audio by clip ID. Select replacement audio for missing clips after importing into another project. Run Review Timing, then Add to Timeline or Update Timeline.', 'Template import is limited to 20 MB and does not run scripts. Large embedded prop images can exceed browser saved-template storage; reduce image size or retain the exported file.']],
        ['sequence-props', 'Custom Sequence Props', 'character sequence custom prop upload replacement tool chair table keep clear grip',
            'Enable Activity kit for a supported sequence action, then expand Props. Replace a kit item using a copied stage image or PNG/JPEG/WebP upload. The existing contact solver drives the replacement; this does not infer a new grip or generate unseen views. Keep props across steps or clear them explicitly.',
            ['Open Character Sequence and enable Activity kit on a supported action. Expand Props and choose the item role, such as Held tool, Chair or Table.', 'Select an image already on stage or upload PNG, JPEG or WebP. The source object stays unchanged. The copy is prepared as a PNG up to 2048 pixels on its longest edge; transparent, tightly cropped images give the best fit.', 'Preview the step and adjust artwork size, horizontal/vertical offset and rotation. Artwork maps to the built-in prop footprint; this is not automatic grip recognition. Restore built-in prop removes that replacement.', 'Keep props after this step retains them during later waits and supported movement. Clear props from earlier steps hides all props created by this sequence. Use Clear before creating a fresh kit to avoid duplicate tools or furniture.', 'Custom artwork stays the same through turns; it does not synthesize the opposite side. Check its orientation in each view. Unsupported roles are rejected before adding the sequence.', 'Custom prop images are embedded in saved sequences and project files. Large images can exceed browser template storage; reduce image size or save the project instead.']],
        ['voice-providers', 'Voice Sources, Access and Costs', 'voices ttsmaker elevenlabs azure browser local piper nigerian gender child superadmin',
            'Conversations assigns voices per speaker. Local server voices produce exportable English audio without provider charges; browser voices are listen-only. TTSMaker, ElevenLabs and Azure require configured services and superadmin access. Voice labels depend on provider metadata, not inferred gender or age.',
            ['Open Conversations and choose the voice source. Check its status before generating; a disabled button can mean no changed rows, no valid voice, or an unavailable service.', 'Choose a voice for each cast member. Filter by language/accent, gender and age where metadata is available. Unspecified does not mean male, female or child.', 'Browser voices depend on the browser and operating system. They cannot supply recorded audio for timeline lip sync or export.', 'TTSMaker has Nigerian English voices Abigail and Samuel when returned by the account catalogue. Azure Ezinne and Abeo require a working Azure Speech key and matching region. An accent is not support for every Nigerian language.', 'ElevenLabs lists the voices accessible to the configured account, including permitted clones. A missing catalogue can mean the key lacks voice-list permission. Use cloned voices only with permission.', 'Select the dialogue rows and scene scope, review the provider and cost confirmation, then generate. Local generation has server resource costs even though it has no provider fee.']],
        ['speaker-camera', 'Speaker Framing and AI Scene Review', 'camera speaker zoom closeup ai scene plan framing animate stage',
            'AI scene plans need review of cast, staging, action timing and dialogue before creation. Use stage camera framing for a speaker close-up and return to a wider composition between turns; this is separate from scaling the character rig.',
            ['Describe the setting, character views, who speaks, seated or standing actions and timing in AI Mode. Ask explicitly for a wide opening, a short speaker close-up and a return to the wide shot.', 'Review the generated plan rather than assuming every requested camera instruction was authored. Correct views, props, speaker assignments and timing before creating scenes.', 'Open Stage Camera to inspect or author framing at the dialogue times. Keep faces, captions and hand gestures within frame.', 'Preview all scenes with audio before export. Camera zoom changes the composition; it should not resize body parts.']],
        ['ai-scene-plan', 'AI Scene and Character Plans', 'ai mode generate scenes svg character animation scene plan dialogue timing',
            'AI Mode can propose catalog-based scenes with SVG cast, settings, dialogue, staging and timed gestures. Review the plan before creating scenes. Audio remains draft until explicitly generated in Conversations. Unsupported actions are rejected; arbitrary animation code is not executed.',
            ['In AI Mode, describe a scene, its SVG characters and supported actions, then Generate with your configured provider. Planning may use provider credits.', 'Open the Scene Plan review. Adjust cast, settings, dialogue, views, activities and movement timing. Walking uses side views; reading, writing and typing use seated activities.', 'Choose Create scenes, then Preview in Conversations or the stage. Use Conversations Undo to undo the complete scene creation.', 'Choose voices per speaker in Conversations and explicitly generate the selected dialogue rows. This adds linked audio and lip sync. Local audio has no provider charge when available; paid generation requires confirmation.', 'Plans are bounded to four scenes, six characters and supported catalog actions. Existing character edits still use the character designer; scene plans create a new cast.']],
        ['character-builder', 'SVG Character Builder and Views', 'svg builder skin hair headgear outfit tie jewelry resize experimental three quarter back side',
            'Create editable SVG characters with view-specific artwork, body and face controls, clothing, hair, headgear and accessories. The established and experimental 3/4 options are separate choices.',
            ['Open SVG Character Builder for a new character. To change an existing character, right-click it and choose Edit SVG.', 'Choose a preset and view, then adjust body, face, skin, hair, clothing and accessories. Check the relevant body part in the preview.', 'Use the view controls to compare front, back, side and 3/4 artwork where available. Keep the established 3/4 option if you prefer it to experimental artwork.', 'Add the character to the stage. Use the character resize control to resize the whole rig instead of resizing individual parts.']],
        ['pose-recording', 'Poses, Movement Recording and Cycles', 'pose armature record timeline duration repeat cycles sit stand eating back',
            'Click a pose or movement to preview it; recording and adding to the timeline are separate actions. Duration and cycles control timing. Seated eating is available for front, side and rear character views.',
            ['Select the character and open Pose Armature, including from its right-click menu.', 'Choose a pose or movement to preview. Use the entries appropriate to the current view.', 'Adjust duration and cycles before adding to the timeline. Watch the recording status and completion indicator.', 'Select the resulting timeline action to edit its available settings. Preview again after changing timing.', 'Try Sitting + Eating for a held pose or Eat / Hand to Mouth for movement. Sit to Stand rises once; Sit Down / Stand Up includes both directions.']],
        ['cross-view', 'Cross-View Sequences and Character Layers', 'cross view sequence turn flip walk point back layer z order whole character',
            'Cross-view sequences coordinate supported turns and movement; ordinary side-view switching is restricted to left/right. Whole-character stacking is separate from internal body-part layering.',
            ['Position and resize the character before choosing a cross-view sequence.', 'Choose a supported start/end view and movement, then preview the turn before recording.', 'For simple side-view changes use left/right facing. Use an explicit cross-view sequence to combine side and front movement.', 'Use whole-character layer controls to place one person behind another. Do not reorder individual limbs to change which person is in front.']],
        ['activity-kits', 'Activity Kits and Props', 'activity kit props broom mop spoon book laptop microphone phone chair table eating',
            'Activity kits attach supported props and furniture to compatible actions. Validated scenario kits also support 3/4 views; older unsupported kits remain restricted. Check contact placement and scale with the selected character.',
            ['Select a supported pose or movement in Pose Armature and enable Activity Kit.', 'Preview the action with its props: for example reading, eating, typing, sweeping or mopping.', 'Check hand grips, chair and table placement, and prop size. Adjust available kit settings before recording.', 'Add the action to the timeline and review it there. A kit is not available for every action, and 3/4 activity kits are intentionally unavailable.']],
        ['audio-rows', 'Audio Rows and Character Connections', 'audio row multiple clips trim start end disconnect unlink speaker character scene',
            'Each audio clip has its own timeline row and timing. Lip sync must link the clip to the intended character in its scene. Deleting a character disconnects its linked audio.',
            ['Import audio into the intended scene. Each clip has a separate row, so clips may overlap or play sequentially.', 'Open the audio edit window to listen, adjust start time, trim and volume.', 'In the audio or lip-sync controls, choose the intended character from the current scene. Check the connection for each speaker and scene.', 'Use the disconnect control to remove the character link without deleting the audio, then choose another character and apply lip sync again.']],
        ['lip-sync', 'Lip Sync: Mouth Only or Full Performance', 'lip sync mouth opening teeth speech hand gestures speed smoothing full performance mouth only',
            'Lip sync supports SVG and Universal Characters. Mouth only avoids conflicts with separately animated body movement. Full performance adds adjustable speech gestures; mouth opening can be increased.',
            ['Select a character and an audio clip, then open Audio Lip Sync.', 'Choose Mouth only when the character already has walking, seated gestures or another body animation.', 'Choose Full performance to add speech-related head, eye, hand and body movements. Adjust strength, smoothing and hand speed; strength is not speed.', 'Use mouth-opening controls to make speech more visible. Preview the actual character view before applying.', 'Apply, then check the stage and new-window preview. A rear-facing mouth may be hidden by the head; do not expect visible lips in every rear view.']],
        ['performance-cues', 'Timed Speech Performance Cues', 'performance cues emphasis point pointing one arm alternating gesture cue timing',
            'Performance cues add timed gestures or overrides to a speech performance. They do not replace the audio and should be reviewed at the cue time after applying the changes.',
            ['Open the linked audio in Audio Lip Sync and choose Full performance for body gestures.', 'Open Performance Cues, add a cue and choose its gesture, start time and duration within the clip.', 'Set the available cue strength or arm options. Keep a cue inside the selected audio range.', 'Apply the updated lip sync and replay from before the cue. Compare the timed cue with the automatic gestures outside it.']],
        ['local-transcription', 'Local Transcription and Background Jobs', 'transcription speech recognition whisper queued processing timeout retry cancel long audio 60 seconds izon igbo',
            'Local speech recognition runs on the configured server without provider charges. Long audio is sectioned; background jobs report queued/processing status and preserve completed sections for retry. Recognition language coverage is limited.',
            ['Choose the audio range in Audio Lip Sync and open transcription. Select the local provider when available.', 'Choose a supported spoken language and start. Long recordings are processed in sections rather than being limited to one 60-second recording.', 'Wait for queued or processing status. If interrupted, retry the same audio and settings to reuse retained completed sections.', 'Cancel stops waiting and discards the active job result; already-running inference may finish internally.', 'Review the words and timings before applying. Automatic language detection does not add unsupported languages; do not assume Izon or Igbo recognition is supported. OpenAI is a separate paid option requiring confirmation.']],
        ['translation-captions', 'Captions, Translation and Word Highlighting', 'captions subtitle word highlight merge lines translation hausa igbo yoruba local free',
            'Caption translation is separate from speech recognition and voice generation. Local text translation supports English, Hausa, Igbo and Yoruba; language accuracy still needs human review.',
            ['Open the caption workspace and select the transcript or captions to edit.', 'Review word timings, line breaks and merged lines, then preview word highlighting against the audio.', 'Choose source and target languages and the local translation provider when available. Select the captions to translate.', 'Wait for the background job and review the translated draft before applying it. Retry interrupted batches without discarding completed work.', 'Translation changes text, not the spoken audio. Generate or upload new speech separately if you need another spoken language.']],
        ['conversation-templates', 'Conversation Templates and Per-Speaker Voices', 'conversation template classroom community african nigerian speakers voice male female batch generate rows scenes local free',
            'Conversation templates create scenes with actors, props and dialogue. Voices are chosen per speaker; selected dialogue rows can be generated in batches. Local voice generation is free of provider fees but currently English only.',
            ['Open Conversations beside the scene controls and choose a template.', 'Review character arrangement, poses, movement and non-speaking actors in every scene.', 'Edit each dialogue line and assign its speaker. Choose and audition each speaker voice before generation.', 'Select the rows and scene scope to generate, then use the generation action for changed or selected dialogue. Check the displayed provider and cost notice.', 'Preview all scenes and verify each audio row is linked to the character in that scene. If local generation is unavailable, check the service status; paid generation is a separate choice.']],
        ['ai-photo', 'AI Photo Character Output Options', 'ai photo designer reconstruct vector likeness glasses consent landmarks preset approximation',
            'Photo Character Designer offers Photo likeness + SVG body, Fully vectorized character, Advanced photo cutting and SVG preset approximation. These outputs differ; a preset approximation is not a face clone.',
            ['Open AI Character Designer, upload one clear front-facing person and confirm permission for the image.', 'Crop and remove the background if needed, then analyze the photo. Review readiness and landmarks before reconstruction.', 'Choose Photo likeness + SVG body to retain photo detail, Fully vectorized character for editable vector reconstruction, Advanced photo cutting for manual parts, or SVG preset approximation for the closest existing preset.', 'For glasses, choose photographed frames, editable replacement frames or approximate removal. Inspect the eyes afterwards.', 'Reconstruct, inspect face edges and the neck, then add to stage. Side/back views inferred from a front photo are approximations, not recovered photographs.']],
        ['photo-presets', 'Save a Photo Character as a Personal Preset', 'save reconstructed photo character personal preset private account hair headgear',
            'My photo presets stores a reconstructed character in the user account with explicit storage consent. A personal preset is distinct from the shared built-in character catalog.',
            ['Finish reconstruction and review the character before saving.', 'Expand My photo presets in the designer and enter a new preset name.', 'Confirm consent to store photo-derived images in your private account presets, then choose Save new preset.', 'To reuse it, select the saved preset and choose Load preset. Review the character and add it to the stage.', 'Use editable hair/headgear and clothing controls where the output supports them. Photo pixels are not automatically editable vector strands or garments.']],
        ['realistic-workspace', 'Realistic Characters: Image Preparation and Rigging', 'realistic character head photographic hybrid crop erase brush landmarks outline attachment zoom face test blink gaze mouth speaking close-up reshape jaw breadth eye size mouth width',
            'Realistic Characters supports library starters, uploaded artwork and realistic-head/SVG-body combinations. Assemble character combines three photographic head packs with feminine or masculine pre-dressed body families across eight views; modest build adjustments and outfit tints are saved in presets. Experimental photographic head turns use discrete supplied views with aligned neck anchors, not continuous 3D. Left-facing views are mirrored. Confirm permission (optionally for all package views) and complete Quality review after assembly. Inspect has a Face test with close-up, view, mouth, blink, gaze and supported turn controls plus a silent speaking preview. These tests do not record animation; use Audio Lip Sync or Head Turn sequence actions. Photographic faces do not yet have full eyebrow or facial-muscle control. Outlines define cutout boundaries; landmarks and attachments define rig placement. Supplied photographic views need individual review.',
            ['Open Realistic Characters and choose a library starter or upload an image. Record consent for your own image.', 'Choose Photographic body or Realistic head + SVG body. Paid generation is optional, not required for library starters.', 'Use crop handles to frame the image. Select erase/restore and adjust brush size; inspect the cursor and active tool before painting. Zoom with the wheel for edge work.', 'Fit and inspect landmarks. Move joint/attachment points to the anatomical locations; edit the part outline separately. An attachment must lie within its part outline.', 'Face shape (all views) adjusts face/jaw breadth, eye size and mouth width with bounded 2D warping. Inspect previews the prepared result; source landmarks remain unwarped. Reset restores neutral shape settings. Rear views omit eye/mouth shaping. This does not replace hair, age or nose/eyebrow modelling.', 'Review each view, compile the rig and check bends, hair, face and clothing. Preview poses and lip sync before saving or adding to stage. Hidden body regions cannot be recovered by cloning visible pixels.']],
        ['preview-export', 'Preview, Export and Recovery Checks', 'export mp4 webm failed audio sync preview all scenes autosave recovery',
            'Check audio and character connections in each scene before previewing all scenes or exporting. Export errors must not be treated as successful downloads. Local recovery and saved projects protect work.',
            ['Save your project before long exports. Keep a native .animstage copy for editing.', 'Preview the current scene and then all scenes, checking audio, lips, gestures, captions and transitions.', 'If a browser blocks sound, use the playback interaction to enable audio. Also check mute, clip timing and the speaker connection.', 'Export with the tab visible. Wait for completion and open the downloaded file to check its beginning, end and scene changes.', 'If export fails, keep the technical details and project for diagnosis; a progress value of 100% does not by itself confirm encoding completed.']]
    ].map(([guideId, title, terms, summary, steps]) => ({
        guideId, title, category: 'current workflows',
        keywords: [title.toLowerCase(), ...terms.split(' ')], summary,
        answer: `<h4>${title}</h4><p>${summary}</p><ol>${steps.map(step => `<li>${step}</li>`).join('')}</ol>`
    })),

    {
        keywords: ['what is animation stage', 'about the app', 'what does this app do', 'app overview', 'what can this app do', 'overview'],
        title: 'Animation Stage Overview',
        category: 'overview',
        summary: 'Animation Stage is a browser-based 2D animation studio for scene design, character animation, SmartArt diagrams, timeline editing, export, reusable assets, AI-assisted creation, and multi-scene projects. It combines drawing tools, rigging workflows, AI Mode, Teach Me help, and export pipelines in one workspace.',
        answer: `<h4>What Animation Stage Is</h4>
<p><strong>Animation Stage</strong> is a browser-based 2D animation studio for creating scenes, animating objects and characters, building SmartArt diagrams, and exporting finished motion content.</p>
<ol>
    <li>Design on the <strong>stage canvas</strong> with shapes, icons, text, images, and templates.</li>
    <li>Animate with the <strong>timeline</strong>, easing tools, keyframes, and reusable presets.</li>
    <li>Use <strong>AI Mode</strong> for natural-language scene building and workflow shortcuts.</li>
    <li>Use <strong>Teach Me</strong>, the <strong>manual</strong>, and the <strong>Tutorial Hub</strong> when you need guidance.</li>
    <li>Export to <strong>HTML5, MP4, WebM, GIF, JavaScript, Python,</strong> or the native <strong>.animstage</strong> project format.</li>
</ol>
<div class="tip-box">💡 Tell me what you are trying to make and I can recommend the best workflow instead of just listing features.</div>`
    },

    {
        keywords: ['use case', 'use cases', 'who is it for', 'best for', 'good for', 'suitable for', 'applicability', 'can i use this for'],
        aliases: ['what is animation stage best for', 'what are the best use cases for animation stage', 'best use cases', 'best use case for animation stage'],
        title: 'Use Cases and Applicability',
        category: 'overview',
        summary: 'Animation Stage is well suited for explainers, classroom lessons, pitch decks, product demos, training animations, social promos, character shorts, and animated diagrams. It is especially strong when the work mixes scene composition, motion graphics, diagrams, and character workflows in one browser-based tool.',
        answer: `<h4>When Animation Stage Is a Good Fit</h4>
<ol>
    <li><strong>Education and e-learning</strong>: animated lessons, explainers, and concept walkthroughs.</li>
    <li><strong>Marketing and social media</strong>: promos, branded motion graphics, and short campaign clips.</li>
    <li><strong>Business communication</strong>: animated diagrams, pitch visuals, timelines, and process flows.</li>
    <li><strong>Training and onboarding</strong>: repeatable explainers, safety content, and HR training materials.</li>
    <li><strong>Character storytelling</strong>: cutout characters, poses, facial expressions, and staged scenes.</li>
</ol>
<p>If your project needs <strong>visual composition + motion + export + reusable assets</strong> in one browser workflow, this app is a strong fit.</p>
<div class="tip-box">Ask me something like <strong>"Is this app good for classroom explainers?"</strong> or <strong>"Which workflow fits a product demo?"</strong> for a more specific recommendation.</div>`
    },

    {
        keywords: ['which workflow', 'body stencil or smart cut', 'smart cut or body stencil', 'guided assembly or smart cut', 'image deform or joints', 'which character workflow', 'best character workflow', 'assemble selected parts', 'already cut parts'],
        title: 'Choosing the Right Character Workflow',
        category: 'characters',
        summary: 'Use Universal Character when you want a generated, rigged parametric character with front, side, or back views. Use Body Stencil for one full human image when you want a fast guided fit. Use Smart Cut when you need traced part boundaries from one image. Use Assemble Selected Parts when body parts are already cut or imported and you just need to label, group, and animate them, including partial rigs. Use Guided Assembly when you want a step-by-step separated-part wizard. Use Image Deform when you want to warp a single flat image rather than assemble cutout parts. Use Flex Rig Mode only as a visual pose layer over existing Pose Armature joints.',
        answer: `<h4>Which Character Workflow Should You Use?</h4>
<ol>
    <li><strong>Universal Character</strong>: best when you want a <strong>generated rigged character</strong> with body, head, hair, headwear, eyes, clothing, body-angle options, and linked front/side/back view options.</li>
    <li><strong>Body Stencil</strong>: best when you have <strong>one full human image</strong> and want the fastest guided cut-and-assemble path.</li>
    <li><strong>Smart Cut</strong>: best when you have <strong>one image</strong> but need more control over traced body-part boundaries.</li>
    <li><strong>Assemble Selected Parts</strong>: best when the <strong>body parts are already cut or imported</strong> and you want to label selected objects, allow missing parts, and animate a partial or full body rig.</li>
    <li><strong>Guided Assembly / Joint Assembly</strong>: best when separated parts need a more guided, step-by-step joint setup.</li>
    <li><strong>Image Deform</strong>: best when you want to <strong>warp one flat image directly</strong> instead of cutting it into articulated parts.</li>
    <li><strong>Flex Tool</strong>: best for <strong>arc bending</strong> one selected object.</li>
    <li><strong>Flex Rig Mode</strong>: best for quickly posing an existing <strong>Pose Armature</strong> by adjusting joint angle and Z tilt handles; it does not create a separate rig.</li>
</ol>
<div class="tip-box">💡 A simple rule: <strong>one full character image</strong> usually means Body Stencil or Smart Cut. <strong>Already cut/imported parts</strong> usually means Assemble Selected Parts.</div>`
    },

    {
        keywords: ['help resources', 'where can i learn', 'teach me', 'manual', 'tutorial', 'home assistant', 'prompt guide'],
        aliases: ['teach me', 'manual', 'tutorial hub', 'help'],
        title: 'Help and Learning Resources',
        category: 'help',
        summary: 'Animation Stage has four main help surfaces: the home-page assistant for product questions, Teach Me inside the studio for feature guidance, the AI Mode Prompt Writing Guide for prompt structure and workflow examples, and the full manual/tutorial hub for broader reference. They share the same core knowledge, including compression rig workflows, preview/save behavior, guided-motion contour behavior, layout guidance, and right-click workflow notes.',
        answer: `<h4>Where to Get Help</h4>
<ol>
    <li><strong>Home-page assistant</strong>: ask what the app does, which workflows fit, and which use cases it supports before signing in.</li>
    <li><strong>Teach Me</strong>: use the in-app chat panel for step-by-step feature guidance while working in the studio.</li>
    <li><strong>AI Mode Help</strong>: use the <strong>Help</strong> button inside AI Mode to open the prompt-writing guide and workflow examples, including stage settings, preview/export, layouts, assets, and copy/export tools.</li>
    <li><strong>Tutorial Hub</strong> and <strong>manual</strong>: use these when you want a structured walkthrough or full reference.</li>
</ol>
<p>These help surfaces share the same core product knowledge so the guidance stays aligned.</p>`
    },

    {
        keywords: ['bake flex', 'what is bake flex', 'what does bake flex do', 'flex bake', 'bake.*flex', 'preserve texture', 'flex tool', 'what is flex tool', 'flex rig', 'flex rig mode', 'z tilt', 'z axis bending', 'pose handles', 'armature handles'],
        aliases: ['bake flex', 'flex tool', 'flex mode', 'preserve texture', 'flex rig', 'flex rig mode', 'z tilt'],
        title: 'Flex Tool, Flex Rig Mode, and Bake Flex',
        category: 'tools',
        summary: 'Flex Tool bends a selected object along horizontal or vertical anchors. Flex Rig Mode is an editor-only pose interface for existing Pose Armature joints: use handles or numeric controls to adjust joint Angle, Z Tilt X, and Z Tilt Y without replacing the rigging, animation, preview, export, or contour systems. Preserve Texture keeps images, gradients, and patterns bending like a continuous surface. Bake Flex stamps the current bent result into a raster image at the actual bent position so you can keep that deformed look as a static asset or run Auto Trace on it afterward.',
        answer: `<h4>Flex Tool, Flex Rig Mode, and Bake Flex</h4>
<p><strong>Flex Tool</strong> bends a selected object with anchor points so the object curves instead of staying rigid.</p>
<ol>
    <li>Select one supported object, then open the <strong>Flex</strong> section in the Properties panel.</li>
    <li>Click <strong>Flex Mode</strong> and place bend anchors on the object.</li>
    <li>Drag the anchor handles to curve the object, or fine-tune the bend with the sliders.</li>
    <li>Leave <strong>Preserve Texture</strong> on when you want images, gradients, and patterns to bend like one continuous surface.</li>
</ol>
<h4>What Flex Rig Mode Does</h4>
<p><strong>Flex Rig Mode</strong> is for selected <strong>Pose Armature</strong> characters. It shows editor-only handles over detected armature joints and writes to the same joint values the normal rig uses.</p>
<ol>
    <li>Select a Pose Armature part or generated Universal Character part.</li>
    <li>Open <strong>Properties → Flex</strong>, then click <strong>Flex Rig Mode</strong>.</li>
    <li>Choose <strong>Angle</strong>, <strong>Z Tilt X</strong>, or <strong>Z Tilt Y</strong> in the Flex Rig panel.</li>
    <li>Drag joint handles or type values to pose shoulders, elbows, wrists, hips, knees, ankles, neck, and similar joints.</li>
    <li>Click <strong>Accept</strong> to leave the mode, or <strong>Reset Rig Pose</strong> to clear detected angle and Z tilt values.</li>
</ol>
<p>Flex Rig Mode does <strong>not</strong> create a second rig and does <strong>not</strong> replace joint contours, animations, preview, export, Tune Joints, or Pose Armature. It is a faster visual way to edit existing joint <code>angle</code>, <code>tiltX</code>, and <code>tiltY</code> values.</p>
<h4>What Bake Flex Does</h4>
<p><strong>Bake Flex</strong> captures the object in its current bent state and turns that visual result into a <strong>raster image</strong> placed at the actual bent position.</p>
<ol>
    <li>Use it when you want to keep the bent look as a static result instead of continuing to edit live flex anchors.</li>
    <li>Use it before <strong>Auto Trace</strong> when you want to vectorize the object in the shape it is bent into right now.</li>
    <li>It is especially useful for flex-bent shapes whose visible curved result differs from the original underlying geometry.</li>
</ol>
<div class="tip-box">💡 A simple rule: <strong>Flex Tool</strong> bends one object. <strong>Flex Rig Mode</strong> poses an existing armature. <strong>Bake Flex</strong> snapshots a live bend into an image.</div>`
    },

    {
        keywords: ['compression rig', 'compression', 'pair rig', 'single compression', 'mouth compression', 'blink compression', 'compression preset', 'compression keyframe', 'universal face compression', 'lip compression', 'eyelid compression'],
        aliases: ['compression rig', 'pair compression', 'compression presets', 'compression keyframes'],
        title: 'Compression Rig (Single + Pair)',
        category: 'rigging',
        summary: 'Compression Rig adds edge-aware squash/compression controls for selected objects. Use single compression for one object or pair rig for linked closures such as lips and eyelids. Presets include Mouth and Blink, keyframe capture is built in, and Universal Face shortcuts can auto-map selected lip/eyelid roles into pair compression.',
        answer: `<h4>Compression Rig (Single + Pair)</h4>
<p><strong>Compression Rig</strong> gives you controlled squash/compression behavior with timeline-ready keyframes.</p>
<ol>
    <li>Select one object and open compression controls in the object properties area.</li>
    <li>Use <strong>single compression</strong> when only one shape needs edge-aware squeeze behavior.</li>
    <li>Use <strong>pair rig</strong> when two shapes should close toward each other (for example top/bottom lip, upper/lower eyelid).</li>
    <li>Apply presets like <strong>Mouth</strong> or <strong>Blink</strong> for faster setup.</li>
    <li>Capture keyframes at timeline positions to animate closure, reopen, and timing accents.</li>
    <li>In Universal Face workflows, use the shortcut actions to auto-map selected lip/eyelid roles into pair compression wiring.</li>
</ol>
<p>Compression data is preserved for live stage playback and new-window preview, while save/export sanitization only strips transient runtime state at the persistence boundary.</p>
<div class="tip-box">💡 Use pair rig for closure mechanics (lips/eyelids) and keep single compression for one-part squash controls.</div>`
    },

    {
        keywords: ['guided motion contour', 'shoulder contour', 'shoulder joint contour', 'joint contour shoulder', 'contours not showing shoulder', 'guided motion shoulders'],
        aliases: ['shoulder contours', 'guided motion shoulder contours'],
        title: 'Guided Motion Shoulder Contours',
        category: 'rigging',
        summary: 'Joint contour rendering now includes shoulders in both stage playback and new-window preview/export paths. If hip contours appear but shoulder contours were missing before, that behavior has been corrected so shoulder contour adjustments are visible and editable.',
        answer: `<h4>Guided Motion Shoulder Contours</h4>
<p>Shoulder contour rendering is supported the same way as hip contours.</p>
<ol>
    <li>Select the assembled/pinned character part you want to tune.</li>
    <li>Open the main <strong>Joints</strong> contour controls and adjust contour visibility, size, and fill mode.</li>
    <li>When working on shoulders, the contour should now appear and update live while you change values.</li>
    <li>Preview in a new window to confirm the same shoulder contour behavior in export-style playback.</li>
</ol>
<p>If a contour seems missing, verify you selected the correct assembled chain/root part before editing contour style.</p>`
    },

    {
        keywords: ['toolbar buttons', 'top toolbar', 'what does this button do', 'which tool is on the toolbar', 'main toolbar', 'quick actions'],
        aliases: ['new project', 'save', 'save as', 'load', 'preview', 'export', 'templates', 'assets', 'layout', 'capture stage', 'teach me', 'search', 'settings', 'install app', 'demo tour', 'clear stage', 'restart', 'refresh', 'smartart'],
        title: 'Toolbar Buttons and Quick Actions',
        category: 'overview',
        summary: 'The main toolbar provides quick access to project actions, preview/export, SmartArt, templates, assets, layout presets, stage capture, Teach Me, search, install app, settings, and onboarding. These labels should resolve directly when a user asks about the exact button text they see in the UI.',
        answer: `<h4>Toolbar Buttons and Quick Actions</h4>
<p>The top toolbar and quick-action area give you direct access to the app's main tools:</p>
<ul>
    <li><strong>New Project / Save / Save As / Load</strong> — project file actions</li>
    <li><strong>Preview</strong> — open a live preview window</li>
    <li><strong>Export</strong> — export video, GIF, HTML5, code, or project files</li>
    <li><strong>SmartArt</strong> — open the structured diagram editor</li>
    <li><strong>Templates</strong> — load reusable animation starters</li>
    <li><strong>Assets</strong> — browse reusable uploaded media and object packages</li>
    <li><strong>Layout</strong> — switch workspace arrangements</li>
    <li><strong>Capture Stage</strong> — capture the stage view as an image or reference</li>
    <li><strong>Teach Me</strong> — open the in-app help assistant</li>
    <li><strong>Search</strong> — find tools, sections, and controls quickly</li>
    <li><strong>Install App</strong> — install the app as a desktop PWA when supported</li>
    <li><strong>Settings</strong> — open theme, AI, and performance settings</li>
    <li><strong>Demo Tour</strong> — launch the onboarding walkthrough</li>
    <li><strong>Clear Stage / Restart / Refresh</strong> — reset or refresh the current workspace state</li>
</ul>
<div class="tip-box">💡 Ask me about any exact toolbar label you see, like <strong>"what is Capture Stage?"</strong> or <strong>"what does Layout do?"</strong>, and I will explain that specific tool.</div>`
    },

    // ═══════════════════════════════════════════
    //  OBJECTS & CREATION
    // ═══════════════════════════════════════════

    {
        keywords: ['create.*shape', 'draw.*shape', 'add.*shape', 'make.*shape', 'add.*rectangle', 'add.*circle', 'add.*triangle', 'add.*star', 'add.*polygon', 'add.*line', 'add.*diamond', 'add.*heart', 'add.*arrow', 'create.*object', 'draw.*object'],
        title: 'Creating Objects',
        category: 'objects',
        summary: 'Shape tools in the left panel Tools tab. Shortcuts: R=Rectangle, C=Circle, T=Triangle, S=Star, L=Line, P=Polygon, D=Draw Path, X=Text, I=Image. Click-drag on stage to draw. Hold Shift for perfect proportions. The tool panels now also include rounded rectangle, parallelogram, trapezium, hexagon, heptagon, pie, chord, teardrop, L-shape, can, plaque, cube, doughnut, block arc, brace, bracket, bent arrow, U-turn arrow, quad arrow, up-down arrow, up arrow callout, and elbow arrow connector, and these advanced shapes can now be used with Edit Points and Boolean Operations.',
        answer: `<h4>How to Create Objects</h4>
<ol>
    <li>Open the <strong>Tools tab</strong> in the left panel</li>
    <li>Choose a shape tool — or use keyboard shortcuts: <code>R</code> = Rectangle, <code>C</code> = Circle, <code>T</code> = Triangle, <code>S</code> = Star, <code>L</code> = Line, <code>P</code> = Polygon, <code>D</code> = Draw Path, <code>X</code> = Text, <code>I</code> = Image</li>
    <li><strong>Click and drag</strong> on the stage canvas to draw the shape</li>
    <li>Hold <code>Shift</code> while dragging for perfect square/circle proportions</li>
    <li>After creating, use the <strong>Properties panel</strong> (right side) to adjust size, color, position, and more</li>
    <li>For the extended shape set, open the additional <strong>Advanced Shapes</strong> and expanded <strong>Lines &amp; Arrows</strong> groups in the Tools tab</li>
</ol>
<p>Additional shapes in the Tools panel: <strong>Diamond, Heart, Arrow, Double Arrow, Curved Arrow, Scribble, Freeform Shape</strong></p>
<p><strong>Edit Points</strong> and <strong>Boolean Operations</strong> also work with the advanced shape set, so you can reshape or combine them after drawing.</p>
<div class="tip-box">💡 You can also use the <strong>Objects panel</strong> on the left to browse and manage all objects on stage.</div>`
    },

    {
        keywords: ['icon', 'add icon', 'icon library', 'built-in icon', 'svg icon', 'people icon', 'animal icon'],
        title: 'Using the Icon Library',
        category: 'objects',
        summary: 'Icon Library: 80+ built-in SVG icons in 9 categories (People, Gestures, Animals, Transport, Business, Objects, Nature, Symbols, Custom). Access via Tools tab → Icon Library. Search by name. Click to place. Icons are vector shapes — resize, recolor, animate like any object. Save any object as a custom icon via right-click → Save as Icon.',
        answer: `<h4>How to Use the Icon Library</h4>
<ol>
    <li>Open the <strong>Tools tab</strong> in the left panel</li>
    <li>Expand the <strong>Icon Library</strong> section</li>
    <li>Browse 9 categories: <strong>People, Gestures, Animals, Transport, Business, Objects, Nature, Symbols, Custom</strong></li>
    <li>Use the <strong>search box</strong> to filter icons by name</li>
    <li>Click any icon to add it to the stage — it appears as an SVG vector shape</li>
    <li>Resize, recolor, and animate icons just like any other shape</li>
</ol>
<div class="tip-box">💡 To create your own icons: select any object → right-click → <strong>Save as Icon</strong>. Your custom icons appear in the "Custom" category.</div>`
    },

    {
        keywords: ['text', 'add text', 'type', 'font', 'font.*size', 'bold', 'italic', 'underline', 'text.*color'],
        title: 'Working with Text',
        category: 'objects',
        summary: 'Text tool: Press X or select in Tools tab. Click on stage to add text. Properties include expanded font families, presets, case subtools, curve, outline, shadow, background labels, size, weight, alignment, vertical align, line-height, letter-spacing, word-spacing, and color. Text objects support typewriter, letter-spin, word-fade, line-reveal animations. New-window Preview matches stage rendering for these text controls.',
        answer: `<h4>Working with Text</h4>
<ol>
    <li>Press <code>X</code> or select the <strong>Text tool</strong> from the Tools tab</li>
    <li>Click on the stage — a text object appears</li>
    <li>Type your text directly</li>
    <li>Use the <strong>Properties panel</strong> (right) to customize:</li>
</ol>
<ul>
    <li><strong>Font Family</strong>: Inter, Manrope, Poppins, Montserrat, DM Sans, Oswald, Bebas Neue, Playfair Display, Merriweather, JetBrains Mono, plus classic system fonts</li>
    <li><strong>Font Size</strong> (8–200), <strong>Weight</strong> (Light / Regular / Medium / Semi Bold / Bold)</li>
    <li><strong>Style</strong>: Bold (<code>Ctrl+B</code>), Italic (<code>Ctrl+I</code>), Underline (<code>Ctrl+U</code>), Strikethrough</li>
    <li><strong>Subtools</strong>: heading/subheading/body/mono presets, case controls (Aa / UPPER / lower / Title), curved arc control, text shadow toggle, text background toggle</li>
    <li><strong>Outline</strong>: separate text outline color and width controls</li>
    <li><strong>Background Label</strong>: background colour, padding, and corner radius controls for pill and caption styles</li>
    <li><strong>Alignment</strong>: Left, Center, Right plus <strong>Vertical Align</strong> (Top, Middle, Bottom)</li>
    <li><strong>Line Height</strong> (0.5-5), <strong>Letter Spacing</strong> (-5 to 20px), <strong>Word Spacing</strong> (-10 to 40px), <strong>Curve</strong> (-180 to 180)</li>
</ul>
<div class="tip-box">💡 Text objects support special animations: <strong>Typewriter</strong>, <strong>Letter Spin</strong>, <strong>Word Fade</strong>, and <strong>Line Reveal</strong>. Preview in a new window mirrors the same text styling as the stage.</div>`
    },

    {
        keywords: ['image', 'photo', 'picture', 'upload.*image', 'drag.*drop.*image', 'add.*image'],
        title: 'Working with Images',
        category: 'objects',
        summary: 'Add images: Press I, use Image tool, or drag-and-drop image files onto the stage. Properties panel image tools: Remove Background, Replace Image, Crop Image, Image Eraser, Image Deform, Body Stencil, Smart Cut, and Auto Trace. For character animation, use Body Stencil or Smart Cut to create cutout joints, then animate from the Joints section. Image Deform is the advanced fallback for warping one flat image directly.',
        answer: `<h4>Working with Images</h4>
<ol>
    <li>Press <code>I</code>, click the <strong>Image</strong> button in the Tools tab, or <strong>drag and drop</strong> an image file onto the stage</li>
    <li>The image appears as an object you can move, resize, and animate</li>
    <li>Image tools in the <strong>Properties panel</strong>:</li>
</ol>
<ul>
    <li><strong>Remove Background</strong> — adjust tolerance slider (1–100), then Apply</li>
    <li><strong>Replace Image</strong> — swap with a new image file</li>
    <li><strong>Crop Image</strong> — set Left/Top/Right/Bottom crop percentages</li>
    <li><strong>Image Eraser</strong> — paint to remove parts (adjust brush size and hardness)</li>
    <li><strong>Image Deform</strong> — advanced single-image mesh deformation for squash, stretch, and localized warping</li>
    <li><strong>Body Stencil</strong> — fit a ready-made body map to one character image, cut parts, and assemble them with joints</li>
    <li><strong>Smart Cut</strong> — trace body parts from one image, then auto-assemble them with joints</li>
    <li><strong>Auto Trace</strong> — turn a raster image into editable vector shapes. Use <strong>Outline / Silhouette</strong> for one editable freeform outline, or <strong>Color Regions</strong> for grouped vector parts. Optional background removal and Edit After Create are built in.</li>
</ul>
<div class="tip-box">💡 For characters, the main path is <strong>Body Stencil / Smart Cut → Joint Assembly → Movements / Poses</strong>. Use <strong>Image Deform</strong> only when you need to warp a single flat image directly.</div>
<p><strong>Image Filters</strong> (Properties panel → Color & Correction):</p>
<ul>
    <li>Brightness, Contrast, Saturation, Hue Rotate, Blur, Grayscale, Sepia, Invert, Tint</li>
    <li>Use the <strong>Reset All Filters</strong> button to clear all adjustments</li>
</ul>`
    },

    {
        keywords: ['import', 'svg', 'eps', 'vector', 'pdf', 'ai file', 'import.*vector', 'import.*svg', 'downscale', 'large image', 'resize.*import'],
        title: 'Importing Vectors',
        category: 'objects',
        summary: 'Import Vector: Supports SVG, EPS, AI, PDF files. Access via Properties panel → Import Vector button (or when stage is empty). SVG groups auto-convert to app groups. EPS/AI parsed from PostScript paths. Imported shapes are fully editable — resize, recolor, animate. When a raster image is larger than 2048px on its long edge, a confirm dialog offers an opt-in downscale (transparency preserved).',
        answer: `<h4>Importing Vector Files</h4>
<ol>
    <li>Click the <strong>Import Vector</strong> button in the Properties panel (or the empty stage prompt)</li>
    <li>Select a file: <strong>SVG, EPS, AI, or PDF</strong></li>
    <li>The file is parsed and imported as editable shapes on the stage</li>
    <li>SVG groups automatically convert to app groups</li>
    <li>You can then select, resize, recolor, and animate the imported shapes</li>
</ol>
<h4>Large Image Downscale (Opt-In)</h4>
<p>When you import a raster image larger than <strong>2048px</strong> on its long edge, a dialog appears showing the original and downscaled dimensions. Choose <strong>Downscale</strong> to resize to 2048px (PNG stays PNG, JPEG stays JPEG at quality 0.92, alpha preserved) or <strong>Keep original</strong> for full resolution. The choice applies to that single import.</p>
<div class="tip-box">💡 For best results, use clean SVG files. Complex EPS/AI files are parsed from PostScript paths.</div>`
    },

    // ═══════════════════════════════════════════
    //  ANIMATION
    // ═══════════════════════════════════════════

    {
        keywords: ['animate', 'animation', 'how.*animate', 'apply.*animation', 'add.*animation', 'animate.*object'],
        title: 'Animating Objects',
        category: 'animation',
        summary: 'Select object(s) → Animate tab in left panel → browse/search 70+ animations in categories (Basic: Entry/Exit/Emphasis; Properties: Movement/Rotation/Scale/Opacity/Text; Advanced: Combos/Custom/Chain/Path/Stage Sequence). Advanced Combos now include X tilt, Y tilt, and dual-axis tilt orbit for images, icons, rectangles, and rounded rectangles. Click animation to apply. Timeline at bottom for timing. Applied animation entries now show property chips such as X Tilt, Y Tilt, and Depth.',
        answer: `<h4>How to Animate Objects</h4>
<ol>
    <li><strong>Select</strong> one or more objects on the stage (click or drag-select)</li>
    <li>Go to the <strong>Animate tab</strong> in the left panel</li>
    <li>The Animate tab has <strong>3 sub-tabs</strong>:</li>
</ol>
<ul>
    <li><strong>Basic</strong>: Entry animations (15), Exit animations (16), Emphasis animations (10)</li>
    <li><strong>Properties</strong>: Movement (12), Rotation (7), Scale (8), Opacity (6), Text Effects (4)</li>
    <li><strong>Advanced</strong>: Combos (10, including X Tilt, Y Tilt, and Tilt Orbit for images, icons, rectangles, and rounded rectangles), Custom Animation Builder, Chain Animations, Path Animation, Stage Sequence</li>
</ul>
<ol start="4">
    <li><strong>Click an animation</strong> to apply it to selected objects</li>
    <li>Adjust timing in the <strong>Timeline</strong> at the bottom — drag bars to change duration and delay</li>
    <li>Fine-tune in the <strong>Properties panel</strong>: duration, easing, repeat, delay, direction, distance, degrees, scale</li>
</ol>
<div class="tip-box">💡 Select multiple objects and apply an animation — they'll auto-stagger with delays for a cascading effect!</div>`
    },

    {
        keywords: ['entry.*animation', 'appear', 'entrance', 'fly.*in', 'fade.*in', 'zoom.*in', 'wipe.*in', 'bounce.*in'],
        title: 'Entry Animations',
        category: 'animation',
        summary: 'Entry animations (Animate tab → Basic → Entry): entry-fade, entry-zoom, entry-fly-left/right/top/bottom, entry-bounce, entry-spin, entry-flip, entry-wipe, entry-strips, entry-wheel, entry-wedge, plus Tilt In Left and Tilt In Right for supported faux-tilt objects. Objects appear on stage with the effect.',
        answer: `<h4>Entry Animations (Object Appears)</h4>
<p>Select an object → <strong>Animate tab → Basic → Entry</strong>:</p>
<ol>
    <li><strong>Fade In</strong> — Subtle fade with movement</li>
    <li><strong>Zoom In</strong> — Scale from 0 to full size</li>
    <li><strong>Fly In Left / Right / Top / Bottom</strong> — Fly in from offscreen</li>
    <li><strong>Bounce In</strong> — Bounce into view</li>
    <li><strong>Spin In</strong> — Spin while growing</li>
    <li><strong>Flip In</strong> — Flip into view</li>
    <li><strong>Wipe In</strong> — Curtain-like reveal</li>
    <li><strong>Strips / Wheel / Wedge</strong> — Clip-based reveals</li>
    <li><strong>Tilt In Left / Tilt In Right</strong> — Perspective-style entrance for images, icons, rectangles, and rounded rectangles</li>
</ol>
<div class="tip-box">💡 Chain entry with emphasis: Apply entry-fly-left, then add emph-pulse with a delay matching the entry duration.</div>`
    },

    {
        keywords: ['exit.*animation', 'disappear', 'leave', 'fly.*out', 'fade.*out', 'remove.*animation', 'exit'],
        title: 'Exit Animations',
        category: 'animation',
        summary: 'Exit animations (Animate tab → Basic → Exit): Fade Out, Zoom Out, Fly Out Left/Right/Top/Bottom, Shrink Out, Spin Out, Flip Out, Collapse, Wipe Out, Strips Out, Wheel Out, Wedge Out, plus Tilt Out Left and Tilt Out Right for supported faux-tilt objects. Objects leave/disappear from stage.',
        answer: `<h4>Exit Animations (Object Leaves)</h4>
<p>Select an object → <strong>Animate tab → Basic → Exit</strong>:</p>
<ul>
    <li><strong>Fade Out</strong>, <strong>Zoom Out</strong>, <strong>Shrink Out</strong></li>
    <li><strong>Fly Out Left / Right / Top / Bottom</strong> — fly offscreen</li>
    <li><strong>Spin Out</strong>, <strong>Flip Out</strong>, <strong>Collapse</strong></li>
    <li><strong>Wipe Out</strong>, <strong>Strips Out</strong>, <strong>Wheel Out</strong>, <strong>Wedge Out</strong></li>
    <li><strong>Tilt Out Left / Tilt Out Right</strong> — Perspective-style exit for images, icons, rectangles, and rounded rectangles</li>
</ul>`
    },

    {
        keywords: ['emphasis', 'pulse', 'shake', 'wobble', 'attention', 'highlight', 'heartbeat', 'jello', 'tada', 'flash', 'rubber.*band'],
        title: 'Emphasis Animations',
        category: 'animation',
        summary: 'Emphasis animations (Animate tab → Basic → Emphasis): Pulse, Shake, Wobble, Bounce, Flash, Rubber Band, Tada, Jello, Heartbeat, Swing. Draw attention without moving objects away. Set repeat:-1 for continuous.',
        answer: `<h4>Emphasis Animations (Draw Attention)</h4>
<p>Select an object → <strong>Animate tab → Basic → Emphasis</strong>:</p>
<ul>
    <li><strong>Pulse</strong> — Scale up and down</li>
    <li><strong>Shake</strong> — Rapid left-right shake</li>
    <li><strong>Wobble</strong> — Tilt side to side</li>
    <li><strong>Bounce</strong> — Bouncing effect</li>
    <li><strong>Flash</strong> — Flash opacity</li>
    <li><strong>Rubber Band</strong> — Stretch and snap</li>
    <li><strong>Tada</strong> — Pop with slight rotation</li>
    <li><strong>Jello</strong> — Jelly wiggle</li>
    <li><strong>Heartbeat</strong> — Double-bump pulse</li>
    <li><strong>Swing</strong> — Pendulum swing</li>
</ul>
<div class="tip-box">💡 Set <code>repeat: -1</code> (Infinite) for continuous emphasis. Great for call-to-action elements!</div>`
    },

    {
        keywords: ['movement', 'linear.*move', 'slide', 'drop', 'float', 'roll', 'topple', 'orbit.*anim', 'move.*animation', 'move.*to.*point', 'target.*x.*y', 'x.*y.*coord', 'diagonal.*move', 'move.*coordinate'],
        title: 'Movement Animations',
        category: 'animation',
        summary: 'Movement animations (Animate tab → Properties → Movement): Linear, Move To Point (any X/Y), Bounce, Pendulum, Slide In, Slide Out, Zigzag, Orbit, Float, Shake, Drop, Topple, Roll. Direction-based animations support 8 compass directions (4 cardinal + 4 diagonals). Use Move To Point for any-angle motion to exact stage coordinates.',
        answer: `<h4>Movement Animations</h4>
<p>Select an object → <strong>Animate tab → Properties → Movement</strong>:</p>
<ul>
    <li><strong>Linear</strong> — Straight-line movement in 8 compass directions (4 cardinal + 4 diagonals at 45°)</li>
    <li><strong>Move To Point</strong> — Animates the object to an exact <strong>X / Y</strong> stage coordinate at any angle (true diagonal). Type the coordinates or click the <i class="fas fa-crosshairs"></i> button next to <em>Target Y</em> and click anywhere on the stage to set them.</li>
    <li><strong>Bounce</strong> — Bouncing movement</li>
    <li><strong>Pendulum</strong> — Swinging back and forth</li>
    <li><strong>Slide In / Slide Out</strong> — Slide from/to offscreen</li>
    <li><strong>Zigzag</strong> — Zigzag pattern movement</li>
    <li><strong>Orbit</strong> — Circular orbital movement</li>
    <li><strong>Float</strong> — Gentle floating motion</li>
    <li><strong>Drop</strong> — Falling with gravity</li>
    <li><strong>Topple</strong> — Falls and rotates</li>
    <li><strong>Roll</strong> — Rolls along a line</li>
</ul>
<p>For direction-based animations, adjust <strong>direction</strong> (8 options) and <strong>distance</strong>. For <strong>Move To Point</strong>, set <strong>Target X</strong> and <strong>Target Y</strong> directly — perfect for moving an object to any specific spot on the stage, straight or diagonal.</p>`
    },

    {
        keywords: ['rotation', 'spin', 'rotate.*animation', 'half.*turn', 'flip.*animation'],
        title: 'Rotation Animations',
        category: 'animation',
        summary: 'Rotation animations (Animate tab → Properties → Rotation): Spin CW, Spin CCW, Wobble, Half Turn, Flip X, Flip Y, Swing. Degrees parameter controls rotation amount.',
        answer: `<h4>Rotation Animations</h4>
<p>Select an object → <strong>Animate tab → Properties → Rotation</strong>:</p>
<ul>
    <li><strong>Spin CW / CCW</strong> — Continuous clockwise or counter-clockwise spin</li>
    <li><strong>Wobble</strong> — Slight rotational wobble</li>
    <li><strong>Half Turn</strong> — 180° flip</li>
    <li><strong>Flip X / Flip Y</strong> — Flip on horizontal/vertical axis</li>
    <li><strong>Swing</strong> — Pendulum-like rotation swing</li>
</ul>
<p>Set <strong>degrees</strong> in the parameters panel (360 = full turn, 720 = two turns).</p>`
    },

    {
        keywords: ['scale.*animation', 'grow', 'shrink', 'squash', 'stretch', 'breathe', 'pop.*in', 'pop.*out'],
        title: 'Scale Animations',
        category: 'animation',
        summary: 'Scale animations (Animate tab → Properties → Scale): Grow, Shrink, Pulse, Squash & Stretch, Pop In, Pop Out, Breathe, Rubber Band. Scale parameter controls factor (1=normal, 2=double).',
        answer: `<h4>Scale Animations</h4>
<p>Select an object → <strong>Animate tab → Properties → Scale</strong>:</p>
<ul>
    <li><strong>Grow / Shrink</strong> — Increase or decrease size</li>
    <li><strong>Pulse</strong> — Scale up and back down</li>
    <li><strong>Squash & Stretch</strong> — Cartoon-style deformation</li>
    <li><strong>Pop In / Pop Out</strong> — Quick scale snap</li>
    <li><strong>Breathe</strong> — Gentle expanding/contracting</li>
    <li><strong>Rubber Band</strong> — Elastic stretch and snap</li>
</ul>`
    },

    {
        keywords: ['opacity.*animation', 'fade', 'blink', 'dissolve', 'flicker', 'glow.*pulse', 'visibility.*animation'],
        title: 'Opacity & Fade Animations',
        category: 'animation',
        summary: 'Opacity/Fade animations (Animate tab → Properties → Opacity): Fade In, Fade Out, Blink, Dissolve, Flicker, Glow Pulse. Controls visibility over time.',
        answer: `<h4>Opacity & Fade Animations</h4>
<p>Select an object → <strong>Animate tab → Properties → Opacity</strong>:</p>
<ul>
    <li><strong>Fade In / Fade Out</strong> — Gradual appear/disappear</li>
    <li><strong>Blink</strong> — Rapid on/off blinking</li>
    <li><strong>Dissolve</strong> — Slow cinematic fade</li>
    <li><strong>Flicker</strong> — Rapid flickering like a failing light</li>
    <li><strong>Glow Pulse</strong> — Oscillating opacity for a glow effect</li>
</ul>`
    },

    {
        keywords: ['text.*animation', 'typewriter', 'letter.*spin', 'word.*fade', 'line.*reveal'],
        title: 'Text Animations',
        category: 'animation',
        summary: 'Text-specific animations (Animate tab → Properties → Text Effects): Typewriter (char-by-char, cps control), Letter Spin (spin each letter in), Word Fade (word-by-word fade), Line Reveal (line-by-line). Only work on text objects.',
        answer: `<h4>Text Animations</h4>
<p>Select a <strong>text object</strong> → <strong>Animate tab → Properties → Text Effects</strong>:</p>
<ul>
    <li><strong>Typewriter</strong> — Characters appear one by one. Adjust <code>cps</code> (characters per second): 10=normal, 20=fast</li>
    <li><strong>Letter Spin</strong> — Each letter spins into place</li>
    <li><strong>Word Fade</strong> — Words fade in one at a time</li>
    <li><strong>Line Reveal</strong> — Text revealed line by line (direction: left/right/up/down)</li>
</ul>
<div class="tip-box">💡 These only work on text objects. Use them for titles, quotes, or lyric reveals!</div>`
    },

    {
        keywords: ['combo.*animation', 'bounce.*spin', 'fade.*move', 'spiral', 'jelly', 'swing.*fade', 'zoom.*slide', 'scale.*rotate'],
        title: 'Combo Animations',
        category: 'animation',
        summary: 'Combo animations (Animate tab → Advanced → Combos): Bounce+Spin, Fade+Move, Scale+Spin, Spiral In, Zoom+Slide, Jelly, Swing+Fade, Tilt Sway X, Tilt Sway Y, and Tilt Orbit. Tilt combos are intended for images, icons, rectangles, and rounded rectangles. These combine multiple animation properties simultaneously.',
        answer: `<h4>Combo Animations</h4>
<p>Select an object → <strong>Animate tab → Advanced → Combos</strong>:</p>
<ul>
    <li><strong>Bounce + Spin</strong> — Bouncing with rotation</li>
    <li><strong>Fade + Move</strong> — Fade in while moving from a direction</li>
    <li><strong>Scale + Spin</strong> — Scale and rotate together</li>
    <li><strong>Spiral In</strong> — Spiral inward combining scale, rotation, and fade</li>
    <li><strong>Zoom + Slide</strong> — Zoom in while sliding</li>
    <li><strong>Jelly</strong> — Elastic wobbly entrance</li>
    <li><strong>Swing + Fade</strong> — Pendulum swing while fading in</li>
</ul>`
    },

    {
        keywords: ['motion.*path', 'path.*animation', 'along.*path', 'move.*along', 'orbit', 'spiral', 'wave', 'zigzag', 'figure.*8', 'pendulum.*path'],
        title: 'Motion Path Animations',
        category: 'animation',
        summary: 'Motion Paths (Animate tab → Properties → Movement, or Advanced → Move Along Shape): Built-in paths: circle, figure-8, square, triangle, arc, zigzag, wave, spiral, orbit, pendulum, bounce-path, custom. For custom path: create a path shape on stage → select mover + path → Advanced tab → Move Along Shape → set start/end %, duration, speed, align-to-path → Apply.',
        answer: `<h4>Motion Path Animations</h4>
<p>Move objects along geometric paths:</p>
<h4>Built-in Motion Paths</h4>
<ol>
    <li>Select your object on the stage</li>
    <li>Go to <strong>Animate tab → Properties → Movement</strong> or the motion paths category</li>
    <li>Choose: <strong>circle, figure-8, square, triangle, arc, zigzag, wave, spiral, orbit, pendulum, bounce-path</strong></li>
    <li>Adjust <strong>radius</strong>, <strong>duration</strong>, and <strong>repeat</strong> in the Properties panel</li>
</ol>
<h4>Custom Path Animation (Move Along Shape)</h4>
<ol>
    <li>Create a path or shape on stage (this is the route)</li>
    <li>Go to <strong>Animate tab → Advanced → Move Along Shape</strong></li>
    <li>Click <strong>Pick Path Shape</strong> and click the path</li>
    <li>Click <strong>Pick Object</strong> and click the mover</li>
    <li>Set <strong>Start %</strong> and <strong>End %</strong> (or click Pick Start/End to click positions on the path)</li>
    <li>Set Duration, Speed, Easing, and check <strong>Align to Path</strong> if you want the object to rotate along the direction</li>
    <li>Click <strong>Apply</strong></li>
</ol>`
    },

    {
        keywords: ['sequence', 'in.*order', 'one.*after.*another', 'one.*by.*one', 'chain.*animation', 'stagger', 'cascad', 'stage.*sequence'],
        title: 'Sequencing & Staggering Animations',
        category: 'animation',
        summary: 'Sequence/stagger: Select multiple objects → apply animation → they auto-stagger. Fine-tune in Timeline by dragging bars. Also: Advanced tab → Stage Sequence (ordered entry for multiple objects, Entry Style dropdown, delay-between, duration-each). Chain Animations (Advanced tab): link objects for shape morphing with trigger/duration/easing/property checkboxes.',
        answer: `<h4>How to Animate Objects in Sequence</h4>
<h4>Quick Stagger (Auto)</h4>
<ol>
    <li><strong>Select all the objects</strong> you want to animate (<code>Shift+Click</code> or drag-select)</li>
    <li>Go to the <strong>Animate tab</strong> → click any animation — it auto-applies with <strong>staggered delays</strong></li>
    <li>Fine-tune timing in the <strong>Timeline</strong>: drag each animation bar left/right to offset timing</li>
    <li>Adjust the <strong>delay</strong> value in the Properties panel for precise control</li>
</ol>
<h4>Stage Sequence (Advanced)</h4>
<ol>
    <li>Go to <strong>Animate tab → Advanced → Stage Sequence</strong></li>
    <li>Select your objects in the desired order</li>
    <li>Choose an <strong>Entry Style</strong> from the dropdown (14 options, including Tilt In Left and Tilt In Right)</li>
    <li>Set <strong>Delay Between</strong> objects and <strong>Duration Each</strong></li>
    <li>Click Apply — objects animate in the order you selected</li>
</ol>
<h4>Chain Animations</h4>
<ol>
    <li>Go to <strong>Animate tab → Advanced → Chain Animations</strong></li>
    <li>Link objects together for sequential shape/position/opacity morphing</li>
    <li>Set <strong>Trigger</strong> (onLoad, onClick, onHover, onScroll), Duration, Easing</li>
    <li>Choose which properties to chain: Shape, Position, Size, Rotation, Opacity, Color, Scale</li>
</ol>
<div class="tip-box">💡 <strong>Quick stagger:</strong> Select all objects → apply any animation → they automatically get increasing delays.</div>`
    },

    {
        keywords: ['custom.*animation', 'animation.*builder', 'build.*animation', 'custom.*property'],
        title: 'Custom Animation Builder',
        category: 'animation',
        summary: 'Custom Animation Builder (Animate tab → Advanced): Add animated properties dynamically (pick which properties to animate and their keyframe values). Includes transform properties such as Rotation, Depth, X Tilt, Y Tilt, Scale X/Y, and Opacity. Depth renders as extrusion on closed shapes and as faux z-distance on images/icons; tilt rendering is supported on images, icons, rectangles, and rounded rectangles. Preview and Apply. Build complex animations property-by-property.',
        answer: `<h4>Custom Animation Builder</h4>
<ol>
    <li>Select an object on the stage</li>
    <li>Go to <strong>Animate tab → Advanced → Custom Animation Builder</strong></li>
    <li>Add animated properties (e.g., x, y, rotation, opacity, scaleX, scaleY, etc.)</li>
    <li>Define start and end values for each property</li>
    <li>Click <strong>Preview</strong> to test, then <strong>Apply</strong> to save</li>
</ol>
<div class="tip-box">💡 This is the most flexible animation tool — combine any properties for unique effects that aren't in the preset library.</div>`
    },

    // ═══════════════════════════════════════════
    //  ANIMATION PARAMETERS
    // ═══════════════════════════════════════════

    {
        keywords: ['easing', 'ease', 'bounce.*ease', 'elastic.*ease', 'smooth', 'bezier', 'easing.*curve', 'easing.*editor'],
        title: 'Easing Functions',
        category: 'animation',
        summary: 'Easing options: linear, easeIn, easeOut, easeInOut, bounce, elastic, back, steps, custom bezier. Set in animation parameters. Custom Bezier: click "Custom Bezier" in easing dropdown to open the Easing Curve Editor modal with preset curves (Linear, Ease, Ease-In/Out, Back, Bounce, Elastic), interactive P1/P2 control points, and live preview.',
        answer: `<h4>Easing Functions</h4>
<p>Easing controls the acceleration curve of animations. Set it in the animation parameters panel:</p>
<ul>
    <li><strong>linear</strong> — Constant speed</li>
    <li><strong>easeIn</strong> — Starts slow, accelerates</li>
    <li><strong>easeOut</strong> — Starts fast, decelerates (most natural for entries)</li>
    <li><strong>easeInOut</strong> — Slow start and end (smooth, professional)</li>
    <li><strong>bounce</strong> — Bounces at the end like a ball</li>
    <li><strong>elastic</strong> — Overshoots and springs back</li>
    <li><strong>back</strong> — Slight overshoot before settling</li>
    <li><strong>steps</strong> — Discrete frame-by-frame steps</li>
    <li><strong>Custom Bezier</strong> — opens the <strong>Easing Curve Editor</strong> modal</li>
</ul>
<p>The Easing Curve Editor lets you drag P1/P2 control points on an interactive canvas, use presets (Linear, Ease, Ease-In, Ease-Out, Back, Bounce, Elastic), and preview the curve live.</p>`
    },

    {
        keywords: ['repeat', 'loop', 'infinite', 'pingpong', 'ping.*pong', 'repeat.*animation'],
        title: 'Repeat & Loop Animations',
        category: 'animation',
        summary: 'Repeat options in animation parameters: Once, 2x, 3x, 5x, Infinite, Ping-Pong. Repeat Style: Hard Reset (jumps back to start) or Smooth Cycle (seamless loop). Set in parameters panel after applying animation. Ping-pong reverses the animation each cycle.',
        answer: `<h4>Repeat & Loop Animations</h4>
<p>After applying an animation, set the <strong>Repeat</strong> option in the parameters panel:</p>
<ul>
    <li><strong>Once</strong> — Plays one time</li>
    <li><strong>2x, 3x, 5x</strong> — Plays a set number of times</li>
    <li><strong>Infinite</strong> — Loops forever</li>
    <li><strong>Ping-Pong</strong> — Alternates forward and backward</li>
</ul>
<p><strong>Repeat Style</strong> (how it restarts):</p>
<ul>
    <li><strong>Hard Reset</strong> — Jumps back to start position instantly</li>
    <li><strong>Smooth Cycle</strong> — Seamless continuous loop</li>
</ul>`
    },

    {
        keywords: ['trigger', 'on.*click', 'on.*hover', 'on.*load', 'on.*scroll', 'click.*trigger', 'hover.*trigger'],
        title: 'Animation Triggers',
        category: 'animation',
        summary: 'Trigger options for animations: On Load (plays automatically), On Click (plays when object is clicked), On Hover (plays when mouse hovers), Manual (triggered by code). Also Start options: After Previous, With Previous, From Start + delay offset.',
        answer: `<h4>Animation Triggers</h4>
<p>Set when an animation starts using the <strong>Trigger</strong> dropdown in the parameters panel:</p>
<ul>
    <li><strong>On Load</strong> — Plays automatically when the animation starts</li>
    <li><strong>On Click</strong> — Plays when the object is clicked</li>
    <li><strong>On Hover</strong> — Plays when the mouse hovers over the object</li>
    <li><strong>Manual</strong> — Only triggered by code</li>
</ul>
<p><strong>Start</strong> options control sequencing with other animations:</p>
<ul>
    <li><strong>After Previous</strong> — Starts after the previous animation finishes</li>
    <li><strong>With Previous</strong> — Starts at the same time as the previous</li>
    <li><strong>From Start</strong> — Starts at a fixed delay from time zero</li>
</ul>`
    },

    // ═══════════════════════════════════════════
    //  TIMELINE
    // ═══════════════════════════════════════════

    {
        keywords: ['timeline', 'timing', 'delay', 'duration'],
        title: 'Using the Timeline',
        category: 'timeline',
        summary: 'Timeline at bottom of workspace. Each object has a track with animation bars. Drag bars left/right to adjust delay. Drag bar edges to adjust duration. Click bar to select and edit. Playhead scrubbing. Controls: Play/Pause (Space), Stop, Go to Start/End, Loop toggle, Speed (0.25x–4x), FPS (24/30/60). In/Out Points: I=set in, O=set out, Delete Range. Right-click bar for: Copy, Paste, Duplicate, Repeat (x2–x10, Custom), Split at Playhead, Trim Start/End, Combine, Delete.',
        answer: `<h4>Working with the Timeline</h4>
<ol>
    <li>The <strong>Timeline</strong> is at the bottom of the workspace</li>
    <li>Each object has a <strong>track</strong> with colored <strong>animation bars</strong></li>
    <li><strong>Drag a bar</strong> left/right to change when it starts (delay)</li>
    <li><strong>Drag the edges</strong> of a bar to change its duration</li>
    <li>Click a bar to select it and edit its parameters in the Properties panel</li>
</ol>
<p><strong>Timeline Controls:</strong></p>
<ul>
    <li><code>Space</code> — Play/Pause</li>
    <li>Go to Start, Previous/Next Animation, Play/Pause, Stop, Go to End</li>
    <li><strong>Loop</strong> toggle, <strong>Speed</strong> (0.25x to 4x), <strong>FPS</strong> (24/30/60)</li>
    <li><strong>In/Out Points</strong>: <code>I</code> = Set In Point, <code>O</code> = Set Out Point, then Delete Range</li>
</ul>
<p><strong>Right-click an animation bar</strong> for: Copy, Paste, Duplicate, Repeat (×2 to ×10 or Custom), Split at Playhead, Trim Start/End to Playhead, Combine with Next, Delete.</p>
<div class="tip-box">💡 Use the timeline zoom controls to zoom in for precise timing adjustments.</div>`
    },

    {
        keywords: ['record', 'recording', 'capture.*animation', 'record.*movement', 'continuous.*record'],
        title: 'Recording Animations',
        category: 'timeline',
        summary: 'Recording: Single-shot Record button (captures one transform action as keyframes, including Depth and X Tilt/Y Tilt on images, icons, rectangles, and rounded rectangles). Depth playback is visual: closed shapes extrude, while images/icons use lighter faux-depth scaling. Continuous Record captures ongoing movement with timer. After recording, choose Keep or Revert with preview. Also: Rigging Record Pose mode auto-records pin deformation keyframes.',
        answer: `<h4>Recording Animations</h4>
<h4>Single-Shot Record</h4>
<ol>
    <li>Select an object on the stage</li>
    <li>Click the <strong>Record</strong> button (circle icon) in the Timeline controls</li>
    <li>Perform an action (move, resize, rotate the object)</li>
    <li>The action is captured as animation keyframes</li>
    <li>Choose <strong>Keep</strong> or <strong>Revert</strong> when prompted</li>
</ol>
<h4>Continuous Record</h4>
<ol>
    <li>Click the <strong>Continuous Record</strong> button in the Timeline controls</li>
    <li>Move the object freely — all movements are captured in real-time (timer visible)</li>
    <li>Click Stop to end recording</li>
    <li>The entire movement path is saved as one animation</li>
</ol>
<div class="tip-box">💡 Continuous recording is great for creating natural motion paths — just drag the object around and the movement is captured!</div>`
    },

    {
        keywords: ['keyframe', 'keyframe.*editor', 'keyframe.*curve', 'intermediate.*keyframe', 'animation.*curve'],
        title: 'Keyframe Editor',
        category: 'timeline',
        summary: 'Keyframe Curve Editor: Open from an applied animation to edit intermediate keyframes. Property selector dropdown. Interactive canvas: double-click to add/remove keyframes, drag to reposition. Buttons: Add Keyframe, Reset, Cancel, Save Keyframes. Fine-grained control over animation property curves over time.',
        answer: `<h4>Keyframe Curve Editor</h4>
<ol>
    <li>Apply an animation to an object</li>
    <li>Click the animation in the <strong>Applied Animations</strong> list to expand it</li>
    <li>Click the <strong>keyframe/curve icon</strong> to open the <strong>Keyframe Curve Editor</strong> modal</li>
    <li>Select a <strong>property</strong> from the dropdown (e.g., x, y, rotation, opacity)</li>
    <li><strong>Double-click</strong> on the curve canvas to add intermediate keyframes</li>
    <li><strong>Drag</strong> keyframe points to adjust their time and value</li>
    <li>Click <strong>Save Keyframes</strong> to apply your edits</li>
</ol>
<div class="tip-box">💡 Keyframes let you create complex animation curves — e.g., an object that speeds up, pauses in the middle, then continues.</div>`
    },

    // ═══════════════════════════════════════════
    //  STAGE CAMERA
    // ═══════════════════════════════════════════

    {
        keywords: ['stage camera', 'animate stage', 'camera animation', 'pan and zoom', 'pan zoom', 'viewport animation', 'camera keyframe', 'cinematic camera', 'ken burns', 'zoom into object', 'follow shot', 'cinematic pan'],
        aliases: ['stage camera', 'animate stage camera', 'camera pan zoom', 'how do I animate the camera'],
        title: 'Stage Camera — Animated Pan & Zoom',
        category: 'animation',
        summary: 'The Stage Camera animates the viewport itself with pan-and-zoom keyframes. Open it from the top toolbar (Animate Stage button, video icon) or via App Search. A cyan rectangle appears on the stage — drag it to pan, drag corner handles or the centre handle to zoom (centre handle scales from the middle, preserving aspect). Scrub the timeline (or use the panel ◀ 1s / 1s ▶ buttons), reframe, then click Add Keyframe. Yellow diamond markers appear on the timeline ruler at every camera keyframe — click a diamond to jump, drag to retime, shift+click to delete. Edit keyframe time directly via the panel time input. Click Apply to save (Cancel to discard). Camera is visible during playback AND when scrubbing the playhead manually. Camera animation is included in HTML5 preview/export and per-scene snapshots. Keyframe edits are covered by Undo/Redo.',
        answer: `<h4>Stage Camera — Animated Viewport</h4>
<p>The <strong>Stage Camera</strong> turns your stage into a virtual camera you can pan and zoom over the timeline — like a Ken Burns effect, a cinematic dolly-in on a character, or a follow shot across a SmartArt diagram.</p>
<h4>Opening the Camera</h4>
<ol>
    <li>Click <strong>Animate Stage</strong> (video icon) in the top toolbar — or open <strong>App Search</strong> (<code>Ctrl+/</code>) and type "stage camera".</li>
    <li>A cyan dashed rectangle appears on the stage. The area outside it is dimmed — that's what the camera will frame.</li>
    <li>The Stage Camera floating panel opens on the right with the keyframe list, time HUD, and controls.</li>
</ol>
<h4>Adjusting the Frame</h4>
<ul>
    <li><strong>Pan</strong> — drag inside the rectangle.</li>
    <li><strong>Zoom from a corner</strong> — drag any of the four corner handles (aspect ratio is locked to your stage).</li>
    <li><strong>Zoom from the centre</strong> — drag the cyan circle with four arrows in the middle of the frame.</li>
    <li><strong>Mouse wheel</strong> — wheel inside the frame zooms in/out around the cursor.</li>
    <li><strong>Fill</strong> button resets the current frame to the full stage at this time.</li>
</ul>
<h4>Adding Keyframes</h4>
<ol>
    <li>Position the playhead — scrub the timeline, click a yellow diamond, or use the <strong>◀ 1s</strong> / <strong>1s ▶</strong> buttons in the panel.</li>
    <li>Adjust the frame for that moment.</li>
    <li>Click <strong>Add Keyframe</strong>. If a keyframe already exists at the current time, the playhead auto-advances 1 s so each click captures a distinct frame.</li>
</ol>
<h4>Editing Keyframes on the Timeline</h4>
<ul>
    <li>Yellow diamond markers appear along the timeline ruler at every camera keyframe.</li>
    <li><strong>Click</strong> a diamond — playhead jumps to that time.</li>
    <li><strong>Drag</strong> a diamond — retime the keyframe smoothly.</li>
    <li><strong>Shift + click</strong> a diamond — delete the keyframe.</li>
    <li>You can also edit a keyframe's time directly in the panel's time input field.</li>
</ul>
<h4>Save / Discard</h4>
<ul>
    <li><strong>Apply</strong> — commit and exit edit mode (saves to the scene; pushes a single Undo entry).</li>
    <li><strong>Cancel</strong> — discard all changes since you opened the camera.</li>
    <li><strong>Esc</strong> = Cancel, <strong>Enter</strong> = Apply.</li>
</ul>
<h4>Playback &amp; Export</h4>
<ul>
    <li>The camera animates during playback <em>and</em> when you scrub the playhead manually.</li>
    <li>Camera transforms are baked into the standalone HTML5 preview and export.</li>
    <li>Each scene has its own camera keyframes — they round-trip with your project file.</li>
    <li>Undo/Redo (<code>Ctrl+Z</code> / <code>Ctrl+Shift+Z</code>) covers all camera keyframe changes.</li>
</ul>
<h4>Easing</h4>
<p>Pick the default easing for new keyframes from the dropdown in the panel header (Linear, Ease In, Ease Out, Ease In-Out). Each keyframe stores its own easing — change one in the list to retune that single transition.</p>
<div class="tip-box">💡 For a Ken Burns effect, drop a wide keyframe at 0 s and a tighter one at the end. For a "follow shot", add 3–5 keyframes that travel across the stage. Keep camera moves slow (≥1.5 s per beat) to avoid motion sickness.</div>`
    },

    // ═══════════════════════════════════════════
    //  TOOLS & FEATURES
    // ═══════════════════════════════════════════

    {
        keywords: ['select', 'selection', 'multi.*select', 'select.*all', 'marquee'],
        title: 'Selecting Objects',
        category: 'tools',
        summary: 'Selection: V = Select tool. Click object to select. Shift+Click to add/remove from selection. Drag on empty stage to create a marquee selection rectangle. Ctrl+A = select all. Selected objects show handles for resize (corners/edges) and rotation (above).',
        answer: `<h4>Selecting Objects</h4>
<ol>
    <li>Press <code>V</code> for the <strong>Selection tool</strong></li>
    <li><strong>Click</strong> an object to select it</li>
    <li><strong>Shift+Click</strong> to add/remove from selection</li>
    <li><strong>Drag</strong> on empty stage to create a marquee selection rectangle</li>
    <li><code>Ctrl+A</code> to select all objects</li>
</ol>
<p>Selected objects show <strong>handles</strong> for resize (corners/edges) and rotation (above the object).</p>`
    },

    {
        keywords: ['resize', 'scale', 'transform', 'rotate', 'move', 'position', 'nudge', 'flip.*horizontal', 'flip.*vertical'],
        title: 'Transforming Objects',
        category: 'tools',
        summary: 'Transform: Drag to move. Arrow keys nudge 1px, Shift+arrows nudge 10px. Drag handles to resize (Shift=lock aspect). Most objects also have an Aspect Lock button in Transform for proportional resizing. Rotation handle above object (Shift=15° snap). Properties panel: exact X, Y, Width, Height, Rotation, Stage Angle readouts, Down → 0° to align a limb/object to straight down and bake that as the new baseline, Set 0° to bake the current angle as the new zero baseline, Opacity. Flip Horizontal/Vertical buttons. Copy Position and Copy Size buttons.',
        answer: `<h4>Transforming Objects</h4>
<ul>
    <li><strong>Move</strong>: Drag the object, or use arrow keys (<code>↑↓←→</code> = 1px, <code>Shift+Arrow</code> = 10px)</li>
    <li><strong>Resize</strong>: Drag corner/edge handles. Hold <code>Shift</code> to maintain aspect ratio</li>
    <li><strong>Aspect Lock</strong>: For most resizable objects, use <strong>Aspect Lock</strong> in Transform to keep width and height linked during resize and numeric size edits</li>
    <li><strong>Stage Angle</strong>: Read the object’s current visible direction on stage as <strong>0–360°</strong>, <strong>±180°</strong>, or <strong>From Down</strong> for limb-style posing</li>
    <li><strong>Down → 0°</strong>: Rotates the selected object so its visible direction points straight down, then makes that downward pose the new <strong>0°</strong> baseline. Best for front-facing limbs that should hang down at rest</li>
    <li><strong>Set 0°</strong>: After rotating an object into the orientation you want, click <strong>Set 0°</strong> next to <strong>Z Rotation</strong> to bake that current angle into the object and reset its rotation baseline to zero</li>
    <li><strong>Rotate</strong>: Drag the rotation handle (above the object). Hold <code>Shift</code> for 15° snapping</li>
    <li><strong>Flip</strong>: Use the <strong>Flip Horizontal</strong> / <strong>Flip Vertical</strong> buttons in the Properties panel</li>
    <li><strong>Precise values</strong>: Enter exact X, Y, Width, Height, Rotation in the Properties panel</li>
    <li><strong>Copy Position</strong>: Click the button, then click another object to match its position</li>
    <li><strong>Copy Size</strong>: Click the button, then click another object to match its size</li>
</ul>`
    },

    {
        keywords: ['color', 'fill', 'gradient', 'pattern', 'stroke', 'outline', 'border.*radius', 'dash'],
        title: 'Colors, Fills & Strokes',
        category: 'tools',
        summary: 'Fill (Properties panel): Solid color, Linear Gradient (start/end colors + angle), Radial Gradient, Pattern (stripes/dots/crosshatch/checkerboard with color + scale). Stroke/Outline: color, width (0-50), line style (solid/dashed/dotted/dash-dot), cap (butt/round/square), join (miter/round/bevel). Border radius (0-200). Color Picker tool: K shortcut.',
        answer: `<h4>Colors, Fills & Strokes</h4>
<ol>
    <li>Select an object on the stage</li>
    <li>In the <strong>Properties panel</strong>, find the <strong>Fill</strong> section:</li>
</ol>
<ul>
    <li><strong>Solid</strong> — Single color (click the swatch to pick)</li>
    <li><strong>Linear Gradient</strong> — Start/end colors with angle control (0–360°)</li>
    <li><strong>Radial Gradient</strong> — Circular gradient from center</li>
    <li><strong>Pattern</strong> — Stripes, Dots, Crosshatch, or Checkerboard with color and scale</li>
</ul>
<p><strong>Stroke/Outline</strong> settings:</p>
<ul>
    <li><strong>Color</strong> and <strong>Width</strong> (0–50)</li>
    <li><strong>Style</strong>: Solid, Dashed, Dotted, Dash-Dot</li>
    <li><strong>Cap</strong>: Butt, Round, Square</li>
    <li><strong>Join</strong>: Miter, Round, Bevel</li>
</ul>
<p><strong>Border Radius</strong> (0–200) for rounded corners on rectangles.</p>
<p>Use the <strong>Color Picker tool</strong> (<code>K</code>) to sample colors from the stage.</p>`
    },

    {
        keywords: ['effect', 'shadow', 'glow', 'reflection', 'bevel'],
        title: 'Object Effects',
        category: 'tools',
        summary: 'Effects (Properties panel → Effects): Shadow (toggle + color, blur, offset X/Y), Glow (toggle + color, size), Reflection (toggle + opacity, gap), Bevel (toggle + size, highlight color, shadow color). Each can be toggled on/off independently.',
        answer: `<h4>Applying Effects</h4>
<ol>
    <li>Select an object on the stage</li>
    <li>Open the <strong>Properties panel</strong> → scroll to the <strong>Effects</strong> section</li>
    <li>Toggle each effect on/off:</li>
</ol>
<ul>
    <li><strong>Shadow</strong> — Drop shadow with Color, Blur, Offset X, Offset Y</li>
    <li><strong>Glow</strong> — Outer glow with Color and Size</li>
    <li><strong>Reflection</strong> — Mirror reflection with Opacity and Gap</li>
    <li><strong>Bevel</strong> — 3D edge with Size, Highlight Color, Shadow Color</li>
</ul>
<div class="tip-box">💡 Combine shadow + glow for a neon effect. Add <code>emph-glow-pulse</code> animation for a breathing neon sign!</div>`
    },

    {
        keywords: ['group', 'grouping', 'ungroup', 'group.*edit', 'enter.*group', 'combine.*objects'],
        title: 'Grouping Objects',
        category: 'tools',
        summary: 'Group: Select multiple objects → Ctrl+G (or right-click → Group). Ungroup: Ctrl+Shift+G. Double-click group to enter group edit mode (edit individual members). Click outside to exit. Group alignment tools available in group edit mode. Groups animate as a single unit.',
        answer: `<h4>Grouping Objects</h4>
<ol>
    <li><strong>Select multiple objects</strong> (<code>Shift+Click</code> or drag-select)</li>
    <li>Press <code>Ctrl+G</code> (or right-click → <strong>Group</strong>)</li>
    <li>The group now moves, scales, and animates as one unit</li>
    <li>To <strong>edit inside a group</strong>: double-click to enter group edit mode, edit individual objects, click outside to exit</li>
    <li>To <strong>ungroup</strong>: select group → <code>Ctrl+Shift+G</code></li>
</ol>
<p>In group edit mode, you can also use <strong>group alignment</strong> tools (Align Left/Center/Right/Top/Middle/Bottom, Distribute).</p>
<div class="tip-box">💡 Groups are great for animated characters — group body parts and animate the whole character together.</div>`
    },

    {
        keywords: ['layer', 'layers', 'z-order', 'bring.*front', 'send.*back', 'ordering', 'z.*index', 'reorder'],
        title: 'Working with Layers',
        category: 'tools',
        summary: 'Layers panel (left panel → Layers tab): Objects listed top-to-bottom (top=front). Drag to reorder z-order. Eye icon = show/hide. Lock icon = lock/unlock. Add Layer, Group, Delete Layer buttons. Also: right-click object → Bring Forward / Send Backward. Objects panel also supports drag reordering.',
        answer: `<h4>Working with Layers & Z-Order</h4>
<ol>
    <li>Open the <strong>Layers tab</strong> in the left panel</li>
    <li>Objects are listed top-to-bottom (top = frontmost)</li>
    <li><strong>Drag to reorder</strong> — change which objects appear in front</li>
    <li>Click the <strong>eye icon</strong> to hide/show a layer</li>
    <li>Click the <strong>lock icon</strong> to prevent accidental edits</li>
</ol>
<p>Quick z-order: right-click an object → <strong>Bring Forward</strong> / <strong>Send Backward</strong></p>
<p>You can also reorder objects in the <strong>Objects tab</strong> by dragging them up/down.</p>`
    },

    {
        keywords: ['pin', 'parent', 'attach', 'follow', 'stick', 'pin.*to', 'inherit.*rotation', 'parent.*joint', 'pin.*joint', 'joint.*rotation'],
        title: 'Pin System',
        category: 'tools',
        summary: 'Object Attachment (Properties panel → Object Attachment section): Select child object → choose Parent Object, optionally choose Parent Joint, set Pin Offset, and choose the Rotation Mode. Parent Anchor targets a parent surface point. Parent Joint targets a specific joint world position/rotation. Use Joint mode for additive cutout-part motion. Unpin by setting parent to "None".',
        answer: `<h4>Pin System (Parent-Child Linking)</h4>
<ol>
    <li>Select the <strong>child object</strong> (the one that should follow)</li>
    <li>In the <strong>Properties panel</strong>, find the <strong>Object Attachment</strong> section</li>
    <li>Choose the <strong>Parent Object</strong> from the dropdown</li>
    <li>Optionally choose a <strong>Parent Joint</strong> if you want the child to follow a specific joint instead of only the parent object's surface anchor</li>
    <li>Adjust the <strong>Pin Offset</strong> for precise positioning relative to the chosen anchor or joint target</li>
    <li>Choose <strong>Align with Parent</strong>, <strong>Independent</strong>, or <strong>Joint</strong> rotation mode depending on how the child should behave</li>
    <li>To unpin: set the parent dropdown back to "None"</li>
</ol>
<p><strong>Rotation Mode</strong>:</p>
<ul>
    <li><strong>Independent</strong>: child keeps its own rotation</li>
    <li><strong>Align with Parent</strong>: child matches the parent target angle</li>
    <li><strong>Joint</strong>: child adds its own local <code>Joint Angle</code> on top of the parent target angle</li>
</ul>
<div class="tip-box">💡 Great for building characters: pin a head, prop, or accessory to a specific torso/arm joint so it follows both position and joint rotation.</div>`
    },

    {
        keywords: ['boolean', 'union', 'subtract', 'intersect', 'fragment', 'combine.*shape', 'xor', 'cut.*shape'],
        title: 'Boolean Operations',
        category: 'tools',
        summary: 'Boolean Ops (Properties panel, or right-click → Boolean): Select 2+ shapes. Union = merge into one. Subtract = cut top from bottom. Intersect = keep only overlap. Combine/XOR = keep everything except overlap. Fragment = split into all separate pieces.',
        answer: `<h4>Boolean Shape Operations</h4>
<ol>
    <li>Select <strong>2 or more shapes</strong> on the stage</li>
    <li>In the <strong>Properties panel</strong> (or right-click → <strong>Boolean</strong>):</li>
</ol>
<ul>
    <li><strong>Union</strong> — Merge shapes into one combined shape</li>
    <li><strong>Subtract</strong> — Cut the top shape from the bottom</li>
    <li><strong>Intersect</strong> — Keep only the overlapping area</li>
    <li><strong>Combine (XOR)</strong> — Keep everything except the overlap</li>
    <li><strong>Fragment</strong> — Split into all separate pieces</li>
</ul>
<div class="tip-box">💡 Use Union to build complex shapes. Use Subtract to cut holes (e.g., a donut from two circles).</div>`
    },

    {
        keywords: ['rig', 'rigging', 'bone', 'pin.*deform', 'mesh', 'pose', 'deform', 'puppet'],
        title: 'Rigging & Deformation',
        category: 'tools',
        summary: 'Rigging is now the advanced single-image deform workflow: Properties panel → Image Tools → Image Deform. Use Deform Pin, Influence Bone, Select Bone, and Deform to warp one flat image. Add Keyframe, Record Pose, Reset Pose, and Revert to Rest still work for deform animation. For characters, use Body Stencil or Smart Cut first, then animate with the Joint Assembly system.',
        answer: `<h4>Image Deform — Advanced Single-Image Warping</h4>
<p>Use this tool when you need to <strong>warp one flat image directly</strong> with pins and mesh deformation.</p>
<div class="tip-box">💡 For characters, the recommended workflow is <strong>Body Stencil</strong> or <strong>Smart Cut</strong>, then <strong>Joint Assembly</strong>. That gives more reliable elbows, knees, poses, and movement presets.</div>
<h4>Step 1 — Enter Image Deform</h4>
<ol>
    <li>Select an <strong>image</strong> object on the stage (rigging only works on images)</li>
    <li>In the <strong>Properties panel</strong>, find the <strong>Image Tools</strong> section</li>
    <li>Click <strong>Image Deform</strong> — the deform toolbar appears</li>
</ol>
<h4>Step 2 — Place Deform Pins</h4>
<ol>
    <li>The <strong>Deform Pin</strong> tool is active by default</li>
    <li><strong>Click on the image</strong> to place control pins (2–3 minimum recommended)</li>
    <li>Place pins where you need local control over the image warp</li>
    <li>Adjust <strong>Deform Mesh Density</strong> for smoother warping</li>
</ol>
<h4>Step 3 — Connect Influence Bones (Optional)</h4>
<ol>
    <li>Switch to the <strong>Influence Bone</strong> tool</li>
    <li>Click a pin, then click another to connect them</li>
    <li>These connections help organize related image sections and influence falloff</li>
</ol>
<h4>Step 4 — Deform the Image</h4>
<ol>
    <li>Switch to the <strong>Deform</strong> tool</li>
    <li>Drag pins to squash, stretch, bend, or locally warp the image mesh</li>
    <li>Use <strong>Select Bone</strong> and the <strong>Influence Bone List</strong> if you need to rename or tune influence relationships</li>
</ol>
<h4>Step 5 — Pose & Animate</h4>
<ol>
    <li><strong>Drag pins</strong> to create the deform pose</li>
    <li>Click <strong>Add Keyframe</strong> to save the pose at the current timeline position</li>
    <li>Move the playhead forward, create a new pose, add another keyframe</li>
    <li>Or click <strong>Record Pose</strong> for auto-keyframing as you drag</li>
    <li>Click <strong>Done</strong> to exit rig mode</li>
</ol>
<div class="tip-box">💡 <strong>Revert to Rest</strong> records a keyframe at the default position, and <strong>Show Influence Labels</strong> can be toggled for a cleaner canvas while editing.</div>`
    },

    {
        keywords: ['joint', 'joints', 'bend', 'skeletal', 'hinge'],
        title: 'Joints (Shape Bending)',
        category: 'tools',
        summary: 'Joints (Properties panel → Joints section): Add bendable hinge points to shapes. Set Chain Direction to top→bottom, bottom→top, left→right, or right→left. Click Add Joint then click on object to place. Clear All removes joints. Animate segment rotation for bending motion. Good for flags, arms, legs, tentacles, ropes.',
        answer: `<h4>Using Joints on Shapes</h4>
<p>Joints let you <strong>bend shapes</strong> at specific points — like a hinge or a knee.</p>
<ol>
    <li>Select a shape on the stage</li>
    <li>In the <strong>Properties panel</strong>, find the <strong>Joints</strong> section</li>
    <li>Set the <strong>Chain Direction</strong>: Top→Bottom, Bottom→Top, Left→Right, or Right→Left</li>
    <li>Click <strong>Add Joint</strong>, then click on the object where you want the bend point</li>
    <li>Add multiple joints as needed</li>
    <li>Animate rotation of segments in the timeline for bending motion</li>
</ol>
<div class="tip-box">💡 Joints are great for waving flags, swinging arms, bending legs, or animating tentacles.</div>`
    },

    {
        keywords: ['joint.*mechanic', 'how.*joint.*work', 'bend.*mechanic', 'tiltX', 'tiltY', 'tilt.*x', 'tilt.*y', 'cross.*offset', 'joint.*angle', 'joint.*perspective', 'joint.*3d', 'segment.*clip', 'joint.*hinge', 'creative.*movement', 'movement.*recipe', 'tentacle', 'rubber.*hose', 'snake.*undulat', 'walk.*cycle.*angle', 'joint.*tip', 'joint.*design', 'non.*human.*movement', 'stylized.*movement', 'cartoon.*bend'],
        title: 'Joint Mechanics & Creative Movement Guide',
        category: 'tools',
        summary: 'How the joint system works under the hood and creative recipes for human and non-human movement. Each joint has Angle (±180°, the bend), Tilt X/Y (±45°, faux-3D perspective), and Cross-Offset (0–1, shifts hinge across the limb). The renderer clips the object into segments and rotates each around its hinge. Combine these controls for walks, runs, waves, tentacle undulation, quadruped gaits, bird flaps, rubber-hose cartoon, mechanical robots, and more.',
        answer: `<h4>Joint Mechanics — How Bending Works</h4>
<p>The renderer splits the object into <strong>segments</strong> between joint positions. Each segment is clipped and drawn with cumulative transforms from all preceding joints — like links in a chain rotating at hinge points.</p>

<h5>Per-Joint Controls</h5>
<table>
<tr><th>Control</th><th>Range</th><th>What It Does</th></tr>
<tr><td><strong>Angle</strong></td><td>±180°</td><td>Bends the limb at the hinge — positive/negative for opposite directions</td></tr>
<tr><td><strong>Tilt X</strong></td><td>±45°</td><td>Shears horizontally, simulating a forward/backward lean into 3D. Squashes vertically (cos) + shears (tan × 0.18)</td></tr>
<tr><td><strong>Tilt Y</strong></td><td>±45°</td><td>Shears vertically, simulating a left/right twist into 3D. Squashes horizontally + shears</td></tr>
<tr><td><strong>Cross-Offset</strong></td><td>0–1</td><td>Shifts the hinge left/right (vertical chain) or up/down (horizontal chain). 0.5 = centered, 0 or 1 = edge</td></tr>
</table>
<p><strong>Flex Rig Mode</strong> gives Pose Armature characters a visual handle interface for these same angle and Z tilt values. It is a posing control layer, not a separate renderer or new contour system.</p>

<h5>Chain Direction</h5>
<p>Determines which axis joints follow: <strong>vertical-tb</strong> (top→bottom, default), <strong>vertical-bt</strong>, <strong>horizontal-lr</strong>, or <strong>horizontal-rl</strong>. Match it to the limb — a horizontal tail uses <code>horizontal-lr</code>, a vertical spine uses <code>vertical-tb</code>.</p>

<h4>Creative Movement Recipes</h4>

<h5>Human Movements</h5>
<ul>
<li><strong>Walk cycle:</strong> Hips ±30°, knees 40–60° on trailing leg, arms swing opposite. Add torso tilt Y ±5° for weight shift.</li>
<li><strong>Run:</strong> Hips ±45°, knees 80–90°, arms pump higher. Torso tilt X 5–10° for forward lean.</li>
<li><strong>Wave:</strong> Shoulder 80–90°, elbow 30–40°, hand tilt Y oscillation ±10° for a twisting wave.</li>
<li><strong>Jump:</strong> Knees 60–70° (crouch) → 0° (launch), vertical root travel. Torso tilt X: -5° crouch, +5° air.</li>
<li><strong>Breathing/idle:</strong> Torso tilt X ±2–3° slowly, knees ±5°, head ±3°. Subtle oscillation sells "alive".</li>
</ul>

<h5>Non-Human & Stylized</h5>
<ul>
<li><strong>Tentacle/snake:</strong> 4–6 joints, stagger sine-wave angles (+15°, -15°, +15°…) shifting phase over time. Cross-offset 0.3 or 0.7 for asymmetric curves.</li>
<li><strong>Quadruped trot:</strong> Diagonal leg pairs; ±20° calm, ±45° gallop. Body tilt Y ±8° for rolling gait.</li>
<li><strong>Bird flap:</strong> Shoulder oscillates ±60°, wing-tip leads by a phase offset. Tilt X ±15° on feathers for foreshortening.</li>
<li><strong>Spider skitter:</strong> 8 legs with rapid ±15° angles, each leg's phase offset slightly for a ripple. Body stays still.</li>
<li><strong>Robot/mechanical:</strong> Sharp jumps (0° → 90° abruptly), no easing, tilt locked at 0°. Uniform segment fractions.</li>
<li><strong>Rubber hose/cartoon:</strong> Push past natural limits (elbows to -90°, backward knees). Tilt X/Y ±30° for squash-and-stretch. Cross-offset 0.2 or 0.8 for off-kilter bends.</li>
<li><strong>Fish swim:</strong> 3–4 joints, increasing amplitude toward tail (±5° body → ±25° tail). Tilt Y ±5° adds shimmer.</li>
</ul>

<h4>Design Tips</h4>
<ul>
<li><strong>Combine tilt X + tilt Y</strong> for diagonal foreshortening — looks like a limb reaching toward/away from the camera</li>
<li><strong>Cross-offset off-center</strong> creates asymmetric bends for wrists, necks, and tails</li>
<li><strong>Contour discs</strong> (auto-colored) hide clipping seams — enable for organic, disable for mechanical</li>
<li><strong>Joint count:</strong> 1 = hinge (elbow/knee), 2–3 = flexible curve (spine/tail), 4+ = fluid organic (tentacles/ribbons)</li>
<li><strong>Phase offsets</strong> between joints create wave propagation (flags, snakes, tentacles)</li>
<li><strong>Tilt without angle</strong> makes a limb point toward/away from the viewer without bending it</li>
</ul>
<div class="tip-box">💡 Start simple: get the angles right first, then layer in tilt for depth and cross-offset for character.</div>`
    },

    {
        keywords: ['assembly', 'assemble', 'joint.*assembly', 'character.*assembly', 'body.*part', 'auto.*detect', 'name.*match'],
        title: 'Joint Assembly (Multi-Part Characters)',
        category: 'tools',
        summary: 'Joint Assembly is the main character-animation workflow. Use Assembly for separated parts, or start from Body Stencil / Smart Cut when you only have one full image. Choose a preset type, assign parts to slots, optionally enable joint contours, assemble them with parent-child pivots and anchors, then animate with Movements, Poses, Copy Across, Mirror, IK, Tune Joints, Skeleton overlay, and more. Assembled joints now rotate freely from -180° to 180°.',
        answer: `<h4>Joint Assembly — Build Articulated Characters</h4>
<p>This is the <strong>main workflow for character animation</strong>.</p>
<p>Use it directly for separated body-part images, or first run <strong>Body Stencil</strong> / <strong>Smart Cut</strong> if you only have one full character image.</p>
<h5>Step-by-Step</h5>
<ol>
    <li>Click <strong>Assembly</strong> in the Joints section of Properties panel</li>
    <li>Choose a character <strong>preset type</strong> (Human Front, Human Side, Quadruped, Bird, Spider, Fish)</li>
    <li><strong>Assign parts</strong> — drag stage objects to body-part slots, or click <strong>Auto-Detect</strong> to let the system match by name</li>
    <li>Click <strong>Assemble</strong> — parts are pinned together with correct hierarchy</li>
</ol>
<h5>Auto-Detection (Name Matching)</h5>
<p>The system intelligently matches your image names to preset slots:</p>
<ul>
    <li>Expands abbreviations: <strong>R→right</strong>, <strong>L→left</strong>, <strong>rt→right</strong>, <strong>lt→left</strong></li>
    <li>Resolves aliases: <strong>arm→upper arm</strong>, <strong>thigh→upper leg</strong>, <strong>shin→lower leg</strong>, <strong>calf→lower leg</strong></li>
    <li>Fuzzy matching across multiple name forms</li>
</ul>
<h5>After Assembly</h5>
<ul>
    <li><strong>Movements</strong> — 32 pre-built animations (see Joint Movements entry)</li>
    <li><strong>Poses</strong> — save/load joint poses</li>
    <li><strong>Copy Across</strong> — select one side, then copy the mirrored joint pose to the opposite side without changing the source side</li>
    <li><strong>Mirror</strong> — swap the left and right sides of the current pose</li>
    <li><strong>Tune Joints</strong> — visually adjust anchors and pivots, either from the assembly done step or later from the main Joints section</li>
    <li><strong>Flex Rig Mode</strong> — pose existing Pose Armature joints with handles for Angle, Z Tilt X, and Z Tilt Y without changing the rig structure</li>
    <li><strong>Contours</strong> — toggle contour discs on assembled child joints for clearer contact points</li>
    <li><strong>Joint Rotation Range</strong> — assembled joints now have a full <code>-180°</code> to <code>180°</code> arc for manual posing</li>
    <li><strong>Skeleton</strong> — toggle bone overlay</li>
    <li><strong>Re-assign</strong> — change part assignments</li>
</ul>
<div class="tip-box">💡 Name your images clearly (e.g. "R Upper Arm", "Head", "L Foot") for best auto-detection results.</div>`
    },

    {
        keywords: ['movement', 'joint.*movement', 'walk.*cycle', 'wave', 'clap', 'dance', 'jump', 'punch', 'kick', 'bow', 'celebrate', 'jumping.*jack', 'head.*shake', 'nod', 'shrug', 'idle', 'flex', 'strongman', 'confident', 'crossed arms', 'boxing guard', 'power punch', 'star jump'],
        title: 'Joint Movements (50 Pre-built Animations)',
        category: 'tools',
        summary: 'Joint Movements: 50 pre-built motion animations for assembled joint characters. Open the movement picker from the Assembly done step. Movements auto-create per-part timeline bars with joint rotation, optional X/Y tilt motion, and optional root-part X/Y travel such as torso lift during jumps. Human Front now has 32 movement presets: 20 core animated actions plus 12 animated pose-hold versions of the Human Front pose library. Human Side (7): Walk, Run, Kick, Crouch, Punch, Bow, Jump. Quadruped (4): Walk, Run, Sit, Tail Wag. Bird (3): Flap, Glide, Peck. Spider (2): Walk, Idle. Fish (2): Swim, Idle.',
        answer: `<h4>Joint Movements — 50 Pre-built Animations</h4>
<p>Apply animations to assembled joint characters. Click <strong>Movements</strong> in the done step.</p>
<h5>Human Front Core Moves (20)</h5>
<p>Wave, Clap, Walk / March, Hands on Hips, Idle Breathe, Jump, Dance, Nod Yes, Shrug, Punch, Front Kick, Bow, Think / Head Scratch, Point, Arms Crossed, Jumping Jacks, Head Shake No, Cheer / Celebrate, Combat Idle, Strongman Flex</p>
<h5>Human Front Pose-Hold Moves (12)</h5>
<p>Pose: Confident, Pose: Crossed Arms, Pose: Sad / Exhausted, Pose: Friendly Wave, Pose: Pointing / Accusing, Pose: Shocked / Hands on Cheeks, Pose: Thinking / Scratching Chin, Pose: Boxing Guard / Defense, Pose: Power Punch (Right Hook), Pose: Star Jump (Mid-Air), Pose: Walk: Right Foot Forward, Pose: Walk: Left Foot Forward</p>
<h5>Human Side (7)</h5>
<p>Walk, Run, Kick, Crouch, Punch, Bow, Jump</p>
<h5>Other Presets</h5>
<ul>
    <li><strong>Quadruped</strong> — Walk (diagonal gait), Run (gallop), Sit, Tail Wag</li>
    <li><strong>Bird</strong> — Wing Flap, Glide, Peck</li>
    <li><strong>Spider</strong> — Walk (tetrapod gait), Idle (leg twitches)</li>
    <li><strong>Fish</strong> — Swim (tail undulation), Idle (fin drift)</li>
</ul>
<h5>How They Work</h5>
<ul>
    <li>Each movement creates <strong>per-part timeline bars</strong> with joint motion keyframes</li>
    <li>Bars appear on the timeline immediately after applying</li>
    <li>Each part animates its <code>jointBaseAngle</code> and can also animate <code>tiltX</code> / <code>tiltY</code> over time</li>
    <li>Root parts such as the torso can also animate <code>x</code> / <code>y</code> travel inside a movement, for example lift and drop during a jump</li>
    <li>Movements are fully exportable in HTML5, video, and GIF formats</li>
</ul>
<div class="tip-box">💡 You can apply multiple movements to different body sections — e.g. a walk cycle on the legs while the arm waves.</div>`
    },

    {
        keywords: ['tune.*joint', 'adjust.*joint', 'pivot.*adjust', 'anchor.*adjust', 'joint.*tune', 'joint.*adjust'],
        title: 'Tune Joints (Post-Assembly Adjustment)',
        category: 'tools',
        summary: 'Tune Joints: After assembly, click Tune Joints to enter visual adjustment mode for anchors and pivots. You can reopen it later from the main Joints section. Blue diamond handles adjust anchor positions (where a part connects to its parent). Orange circle handles adjust pivot positions (where a part rotates from). Assembled joints rotate across the full -180° to 180° range. The floating panel now includes Current Angle, X/Y Tilt, pinOffset, pinAnchor, pivotOnSelf, and contour styling controls including size, solid color, pattern, gradient, or picture fill. Flex Rig Mode is separate: it is for quick pose adjustment of existing Pose Armature joint angle and Z tilt values, not anchor/pivot tuning. Click Save as Template to store tuned values for reuse.',
        answer: `<h4>Tune Joints — Visual Joint Adjustment</h4>
<p>Fine-tune how parts connect and rotate after assembly.</p>
<ol>
    <li>Click <strong>Tune Joints</strong> in the assembly done step, or use the <strong>Tune</strong> button in the main Joints section later</li>
    <li>Overlay handles appear on each joint:</li>
</ol>
<ul>
    <li><strong>Blue diamonds</strong> — drag to adjust <strong>anchor positions</strong> (where a child attaches to its parent)</li>
    <li><strong>Orange circles</strong> — drag to adjust <strong>pivot positions</strong> (where a part rotates from)</li>
</ul>
<h5>Tune Panel</h5>
<p>A floating panel shows numeric inputs for the selected joint:</p>
<ul>
    <li><strong>Current Angle</strong> — directly type the current joint rotation in degrees</li>
    <li><strong>X Tilt / Y Tilt</strong> — add 2.5D tilt on supported part types such as images and icons</li>
    <li><strong>Pin Offset X/Y</strong> — distance offset between parent and child</li>
    <li><strong>Pin Anchor X/Y</strong> — normalized anchor position on the parent</li>
    <li><strong>Pivot On Self X/Y</strong> — normalized rotation center on the child</li>
    <li><strong>Joint Contour</strong> — toggle the contour disc, adjust its size, and choose Auto, Solid, Pattern, Linear Gradient, Radial Gradient, or Picture fill</li>
</ul>
<p>Click <strong>Save as Template</strong> to store your tuned values in localStorage for automatic reuse on future assemblies of the same character type.</p>
<p>Use <strong>Tune Joints</strong> when a joint connects or rotates from the wrong place. Use <strong>Flex Rig Mode</strong> when the rig is already connected correctly and you only need faster pose handles for Angle, Z Tilt X, or Z Tilt Y.</p>
<div class="tip-box">💡 Tune mode is the best way to fix arms or legs that don't pivot correctly after automatic assembly.</div>`
    },

    {
        keywords: ['body tag', 'body tags', 'landmark', 'character tag', 'facial points', 'fingertip', 'toe tag'],
        title: 'Body Tags',
        category: 'tools',
        summary: 'Body Tags are persistent character landmarks for assembled characters, loose named body parts, or a single selected character object. Use them to mark reference points such as eyes, nose, sternum, waist, hips, fingertips, toes, paws, wing tips, and other contact points. Auto-Tag Parts now works on assembled characters and on selected loose parts by matching them to a preset, and the panel shows matched-part context clearly. Tags stay relative to the tagged body part as poses and movements rotate the character.',
        answer: `<h4>Body Tags</h4>
<p><strong>Body Tags</strong> are landmark points attached to character parts. They are useful when you need stable reference positions for posing, contact logic, future movement rules, AI awareness, or export.</p>
<h5>What They Do</h5>
<ul>
    <li>Store a landmark as a <strong>relative X/Y point</strong> on a character part</li>
    <li>Move automatically with the tagged part during <strong>joint posing</strong> and <strong>movement playback</strong></li>
    <li>Support preset landmarks for built-in characters such as <strong>Human Front</strong>, <strong>Human Side</strong>, <strong>Quadruped</strong>, <strong>Bird</strong>, <strong>Spider</strong>, and <strong>Fish</strong></li>
    <li>Support <strong>custom tags</strong> placed manually by clicking the character on stage</li>
</ul>
<h5>How to Use</h5>
<ol>
    <li>Select one assembled body part to target the whole assembled character, or select multiple loose named parts first</li>
    <li>Open <strong>Body Tags</strong> from the <strong>Joints</strong> section</li>
    <li>Choose a template and click <strong>Auto-Tag Parts</strong>, or click <strong>Add Custom</strong> and place a new point on the stage</li>
    <li>Use the context pills to confirm the detected preset and matched parts, then drag any tag directly on the canvas to refine it or edit its relative X/Y values in the panel</li>
</ol>
<h5>Practical Examples</h5>
<ul>
    <li>Add <strong>left-waist</strong> and <strong>right-waist</strong> tags if you want hands-on-hips poses to land exactly on the waist you drew</li>
    <li>Add a <strong>sternum</strong> tag if bows, crossed-arm poses, or prayer-like poses should aim toward the middle of the chest</li>
    <li>Add a <strong>temple</strong> or <strong>cheek</strong> tag if a thinking pose should place the hand on a specific face landmark</li>
    <li>Refine <strong>toe</strong> or <strong>fingertip</strong> tags when the default template is close but not anatomically exact for your artwork</li>
</ul>
<p>Assembled preset characters are auto-seeded with template Body Tags the first time they are assembled. On-canvas labels now stay quiet until a tag is hovered or selected, which keeps dense characters easier to read.</p>
<p>If a pose or movement uses <strong>Contact Targets</strong>, any Body Tag you add or reposition will affect the next preview or playback automatically because contacts resolve from the live tags on the current character.</p>`
    },

    {
        keywords: ['contact target', 'contact targets', 'reach target', 'hand to body tag', 'foot to body tag'],
        title: 'Contact Targets',
        category: 'tools',
        summary: 'Contact Targets let a pose or movement pull a hand or foot toward a live Body Tag on the current character. Add or move the tag, then the next preview or playback uses that updated location automatically.',
        answer: `<h4>Contact Targets</h4>
<p><strong>Contact Targets</strong> connect a pose or movement to a <strong>Body Tag</strong>. They are useful when a hand should land on the waist, chest, cheek, hip, or any custom landmark you defined on the character.</p>
<h5>How They Work</h5>
<ul>
    <li><strong>Body Tags</strong> define the landmark positions on the character</li>
    <li><strong>Contact Targets</strong> tell a pose or movement which limb should reach which tag</li>
    <li>The solver uses the <strong>live tags on the current character</strong>, so tag edits affect the next preview or playback automatically</li>
</ul>
<h5>Simple Workflow</h5>
<ol>
    <li>Auto-tag the character or add custom Body Tags first</li>
    <li>Open a pose or movement library</li>
    <li>Click the <strong>Contact Targets</strong> button next to the pose or movement</li>
    <li>Choose the source limb, then choose the target tag</li>
    <li>Use <strong>dx</strong> and <strong>dy</strong> only for small final adjustments</li>
    <li>Click <strong>Save</strong> when the preview looks right</li>
</ol>
<h5>Practical Examples</h5>
<ul>
    <li><strong>Hands on hips:</strong> assign <strong>left-hand -&gt; left-waist</strong> and <strong>right-hand -&gt; right-waist</strong></li>
    <li><strong>Thinking pose:</strong> assign <strong>right-hand -&gt; temple</strong> or <strong>cheek</strong></li>
    <li><strong>Bow:</strong> assign a hand toward <strong>sternum</strong> so the arm settles toward the chest during the bend</li>
    <li><strong>Custom creature:</strong> add a <strong>beak-tip</strong>, <strong>paw</strong>, or <strong>wing-tip</strong> tag and target it from a matching limb chain</li>
</ul>
<p>If the target you need is not listed, that usually means the character does not have that live Body Tag yet. Add the tag first, then reopen Contact Targets.</p>`
    },

    {
        keywords: ['copy.*propert', 'paste.*clone', 'copy.*all.*propert', 'spreadsheet', 'clone.*object'],
        title: 'Copy Properties & Paste as Clone',
        category: 'tools',
        summary: 'Copy Properties: Right-click an object → Copy Properties. Copies a human-readable text summary plus a hidden JSON payload (base64-encoded) to the clipboard, including stage angle readouts, joint angle, X/Y tilt, Body Tags, and pin data such as Pin Target, Parent Joint, Pin Offset, and Rotation Mode. Paste as Clone: Right-click empty stage → Paste as Clone. Creates an exact duplicate of the copied object at the click position. Copy All Properties: Right-click empty stage → Copy All Properties. Exports a tab-separated table of all objects (49 columns, including Stage Angle, Stage ±180, From Down, pin fields, joint details, transformed corners, and Body Tags) — paste into any spreadsheet.',
        answer: `<h4>Copy Properties & Paste as Clone</h4>
<h5>Copy Properties</h5>
<p>Right-click an object → <strong>Copy Properties</strong>. Copies:</p>
<ul>
    <li>Human-readable text summary (name, type, position, size, stage angle readouts, colors, joint angle, X tilt, Y tilt, Body Tags, pin target, parent joint, pin offset, rotation mode, etc.)</li>
    <li>Hidden JSON payload for exact reconstruction</li>
</ul>
<h5>Paste as Clone</h5>
<p>Right-click on empty stage → <strong>Paste as Clone</strong>. Creates an exact duplicate at the click position with all properties preserved (animations, rigging, pin data, body parts).</p>
<h5>Copy All Properties</h5>
<p>Right-click on empty stage → <strong>Copy All Properties</strong>. Exports a <strong>tab-separated table</strong> of every object on stage (49 columns), including <code>Stage Angle</code>, <code>Stage ±180</code>, <code>From Down</code>, <code>Pin Target</code>, <code>Parent Joint</code>, <code>Pin Offset</code>, <code>Pin Rotation</code>, <code>Joint Details</code>, transformed corner coordinates, and <code>Body Tags</code>. Paste directly into Excel, Google Sheets, or any spreadsheet.</p>
<div class="tip-box">💡 Use Copy All Properties to audit or document your entire scene in a spreadsheet.</div>`
    },

    {
        keywords: ['measure', 'ruler', 'distance', 'spacing.*tool', 'measure.*tool', 'pixel.*distance'],
        title: 'Measure Tool',
        category: 'tools',
        summary: 'Measure Tool: Shows pixel distances between objects and stage edges. Select the Measure tool from the Tools panel. Hover over objects to see distance labels from each side to stage edges and gaps between nearby objects. Useful for precise layout and spacing verification.',
        answer: `<h4>Measure Tool</h4>
<p>Displays pixel distances for precise layout work.</p>
<ol>
    <li>Select the <strong>Measure Tool</strong> from the Tools panel</li>
    <li>Hover over objects to see:</li>
</ol>
<ul>
    <li><strong>Edge distances</strong> — pixels from each side of the object to the stage edges</li>
    <li><strong>Gap distances</strong> — pixels between the hovered object and nearby objects</li>
</ul>
<p>Measurements appear as floating labels with pixel values.</p>
<div class="tip-box">💡 Great for verifying consistent spacing and margins in your layouts.</div>`
    },

    {
        keywords: ['app.*search', 'search.*tool', 'find.*tool', 'spotlight', 'ctrl.*slash', 'command.*search', 'search.*button', 'search.*animation'],
        title: 'App Search (Ctrl+/)',
        category: 'tools',
        summary: 'App Search: Press Ctrl+/ (Cmd+/ on Mac) to open a Spotlight-style search finder. Searches all tools, animations, buttons, sections, tabs, properties, and inputs. Click a result to scroll to and highlight it. For tool buttons, clicking also activates the tool. Indexes the entire UI — any visible element with text is searchable.',
        answer: `<h4>App Search — Find Anything Instantly</h4>
<p>Press <strong>Ctrl+/</strong> (Cmd+/ on Mac) to open the search overlay.</p>
<h5>What You Can Search</h5>
<ul>
    <li><strong>Tools</strong> — shape tools, select, hand, zoom, etc.</li>
    <li><strong>Animations</strong> — any animation button</li>
    <li><strong>Actions</strong> — boolean ops, alignment buttons</li>
    <li><strong>Sections</strong> — panel headings (Joints, Rigging, etc.)</li>
    <li><strong>Tabs</strong> — panel tabs, sub-tabs</li>
    <li><strong>Properties</strong> — any labeled property field</li>
    <li><strong>Inputs</strong> — named inputs, selects, textareas</li>
</ul>
<p>Click a result to <strong>scroll to and highlight</strong> the element. Press <strong>Escape</strong> to close.</p>
<div class="tip-box">💡 App Search indexes the live DOM — every visible UI element with text is findable, even dynamically created ones.</div>`
    },

    {
        keywords: ['assets library', 'save to assets library', 'upload asset', 'import asset', 'search assets', 'list assets', 'asset folder'],
        aliases: ['assets', 'assets button', 'asset library'],
        title: 'Assets Library',
        category: 'tools',
        summary: 'Assets Library: filesystem-backed asset browser for reusable images, GIFs, JSON object packages, and thumbnails. Save by right-clicking an object → Save to Assets Library. Open the Assets button in the top toolbar to search, preview, upload, delete, or import. AI mode can list, search, and import library items by name.',
        answer: `<h4>Assets Library</h4>
<p>The <strong>Assets Library</strong> stores reusable media and stage objects in the project under <code>assets/library/</code> instead of only in browser storage.</p>
<h5>How to Save</h5>
<ol>
    <li>Right-click a stage object and choose <strong>Save to Assets Library</strong></li>
    <li>Pick an existing folder from the searchable folder list, or type a new folder path</li>
    <li>Enter a unique asset name. Duplicate names are blocked</li>
    <li>Save — the asset package, manifest entry, and preview thumbnail are created automatically</li>
</ol>
<h5>How to Import</h5>
<ol>
    <li>Click <strong>Assets</strong> in the top toolbar</li>
    <li>Search by name, folder, or label</li>
    <li>Click an asset card to preview it in the side preview pane</li>
    <li>Click <strong>Import</strong> to place it on stage</li>
</ol>
<h5>Upload From Computer</h5>
<ul>
    <li>Open <strong>Assets</strong> → click <strong>Upload</strong></li>
    <li>Choose images, GIFs, or supported JSON packages</li>
    <li>The uploaded files become searchable in the same library immediately</li>
</ul>
<h5>AI Examples</h5>
<ul>
    <li><code>list assets</code></li>
    <li><code>search assets for torso</code></li>
    <li><code>import torso on stage</code></li>
</ul>
<div class="tip-box">💡 Use folders such as <strong>torso/body-parts</strong>, <strong>characters/front</strong>, or <strong>props/vehicles</strong> so both the normal UI and AI search stay organized.</div>`
    },

    {
        aliases: ['layers panel', 'add layer', 'group layer', 'delete layer'],
        keywords: ['pose armature skin', 'character skin', 'place overlay', 'sample selected', 'save skin template', 'fit shapes', 'armature overlay'],
        title: 'Pose Armature Skin & Overlay',
        category: 'tools',
        summary: 'Pose Armature skinning: Place Overlay adds a temporary semi-transparent image over the rig for manual alignment. Sample Selected takes the currently selected image or overlay and bakes sampled textures into the armature parts. Save Template stores the resulting look for reuse on similar front or side armatures. Fit Shapes lets you resize or point-edit armature parts to match the source art before sampling.',
        answer: `<h4>Pose Armature — Character Skin Workflow</h4>
<h5>What is the difference?</h5>
<ul>
    <li><strong>Place Overlay</strong> — imports a temporary overlay image on top of the armature so you can line it up visually. It does <strong>not</strong> change the armature parts by itself</li>
    <li><strong>Sample Selected</strong> — reads the currently selected image (usually that overlay, or any other stage image) and <strong>bakes sampled textures</strong> into the armature parts</li>
</ul>
<h5>Typical Workflow</h5>
<ol>
    <li>Open <strong>Pose Armature</strong></li>
    <li>Click <strong>Place Overlay</strong> and choose a character image</li>
    <li>Drag/resize the overlay until it matches the rig</li>
    <li>Use <strong>Fit Shapes</strong> if needed:
        <ul>
            <li><strong>Select for Resize</strong> to resize a rig part with normal stage handles</li>
            <li><strong>Edit Points</strong> for irregular reshaping</li>
        </ul>
    </li>
    <li>Click <strong>Sample Selected</strong> to transfer the artwork onto the armature parts</li>
    <li>Optionally click <strong>Save Template</strong> so the skin can be reapplied later</li>
</ol>
<h5>Practical Example</h5>
<p>If you already have a character PNG on the stage, you can skip <strong>Place Overlay</strong>. Select that image directly, align it over the armature, then click <strong>Sample Selected</strong>.</p>
<p>For front-view characters, the quickest reusable setup is <strong>Joints → Front Dummy</strong> or the same <strong>Front Dummy</strong> button inside <strong>Pose Armature</strong>. That creates a torso, head/neck, left/right arms, and left/right legs so the front pose catalog, walk/run cycles, and skin templates all match the rig structure.</p>
<p>For side-view characters, the quickest reusable setup is <strong>Joints → Side Dummy</strong> or the same <strong>Side Dummy</strong> button inside <strong>Pose Armature</strong>. That creates a torso, head/neck, one side arm, and front/back legs so the side pose catalog, walk/run cycles, and skin templates all match the rig structure.</p>
<p>If a profile character needs both visible arms, use <strong>Side 2 Arms</strong>. That creates <strong>Front Arm</strong> and <strong>Back Arm</strong> chains plus front/back legs, and if one profile arm or leg is hidden in the source image the sampler can reuse the visible counterpart as fallback.</p>
<p>Inside <strong>Pose Armature</strong>, use <strong>Transparent</strong> to keep the dummy low-fill with visible borders for alignment, or <strong>Solid</strong> if you want the rig blocks to show as filled shapes again.</p>
<div class="tip-box">💡 <strong>Place Overlay</strong> is for alignment. <strong>Sample Selected</strong> is the actual skin transfer step.</div>`
    },

    {
        keywords: ['pose armature template', 'armature template', 'save armature template', 'apply armature template', 'reuse armature skin', 'skin template'],
        title: 'Pose Armature Skin Templates',
        category: 'tools',
        summary: 'Pose Armature skin templates let you save a finished skinned rig look and reapply it later. Templates are filtered by armature profile such as Human Front, Human Side, or Generic, so the Apply list stays relevant to the current rig.',
        answer: `<h4>Pose Armature — Save Template / Apply</h4>
<p>After a rig has been skinned once, you can save that appearance and reuse it on similar armatures without repeating the full overlay workflow.</p>
<h5>What Save Template Stores</h5>
<ul>
    <li>The current appearance of each armature part after sampling</li>
    <li>Texture or image sources used on those parts</li>
    <li>Related appearance settings such as fills, patterns, stroke, and image adjustments where relevant</li>
    <li>The armature profile type: <strong>Human Front</strong>, <strong>Human Side</strong>, or <strong>Generic</strong></li>
</ul>
<p><strong>Save Template</strong> saves the look of the current rig parts. It does not rebuild the rig structure itself.</p>
<h5>How to Save</h5>
<ol>
    <li>Skin the armature first using <strong>Place Overlay</strong> and/or <strong>Sample Selected</strong></li>
    <li>Enter a name in the template field</li>
    <li>Click <strong>Save Template</strong></li>
</ol>
<h5>How to Apply</h5>
<ol>
    <li>Open another armature of a similar type</li>
    <li>Choose a saved item from the template dropdown</li>
    <li>Click <strong>Apply</strong></li>
</ol>
<h5>Profile Filtering</h5>
<ul>
    <li>Front-facing armatures mainly show front-facing saved templates</li>
    <li>Side-facing armatures mainly show side-facing saved templates</li>
    <li><strong>Generic</strong> templates are available more broadly</li>
</ul>
<h5>Practical Example</h5>
<p>Build one front-facing guard character, sample the art, and save it as <strong>Male Guard Front</strong>. Later, open another front-facing armature and click <strong>Apply</strong> to reuse that saved skin in one step.</p>
<div class="tip-box">💡 Best workflow: <strong>Fit Shapes → Sample Selected → Save Template</strong>.</div>`
    },

    {
        keywords: ['reset joints', 'reset all 0', 'clear timeline', 'delete all animations', 'timeline clear', 'joint reset'],
        title: 'Reset Joints & Clear Timeline',
        category: 'tools',
        summary: 'Reset All 0° in the Joints section resets all selected object joints and assembly joints back to zero without deleting them. Clear Timeline removes every animation bar from the timeline after a confirmation prompt.',
        answer: `<h4>Reset Joints & Clear Timeline</h4>
<h5>Reset All 0°</h5>
<ol>
    <li>Select one or more jointed or assembled objects</li>
    <li>Open the <strong>Joints</strong> section in the left panel</li>
    <li>Click <strong>Reset All 0°</strong></li>
</ol>
<p>This resets internal joints such as elbow, wrist, knee, and ankle, and also assembly joints such as shoulder and hip, without removing the rig.</p>
<h5>Clear Timeline</h5>
<ol>
    <li>Go to the timeline controls</li>
    <li>Click the <strong>Clear Timeline</strong> trash button</li>
    <li>Confirm the alert</li>
</ol>
<p>All animation bars on the timeline are removed at once.</p>`
    },

    {
        keywords: ['train.*stage', 'capture.*stage', 'train.*pose', 'teach.*assembly', 'save.*joint.*template'],
        title: 'Train from Stage (Joint Assembly Learning)',
        category: 'tools',
        summary: 'Train from Stage: After assembling and manually tuning a character, click Train from Stage to capture pinOffset, pinAnchor, and pivotOnSelf values for each body part. Uses fuzzy name matching so trained data works across projects. Future assemblies of the same character type automatically apply the trained values from localStorage.',
        answer: `<h4>Train from Stage — Teach Better Joint Defaults</h4>
<p>Capture your manually positioned character as training data for future assemblies.</p>
<ol>
    <li>Assemble a character using Joint Assembly</li>
    <li>Manually position and <strong>tune the joints</strong> until the character looks right</li>
    <li>Click <strong>Train from Stage</strong></li>
    <li>The system captures pinOffset, pinAnchor, and pivotOnSelf for each part</li>
    <li>Data is saved to localStorage with fuzzy name matching</li>
    <li>Future assemblies <strong>automatically apply</strong> the trained values</li>
</ol>
<div class="tip-box">💡 Train once, benefit every time — your trained positions persist across browser sessions and work even if image names differ slightly.</div>`
    },

    {
        keywords: ['point.*edit', 'vertex', 'anchor', 'bezier', 'path.*edit', 'edit.*point', 'freeform.*edit'],
        title: 'Point Editing',
        category: 'tools',
        summary: 'Point Editing: Select freeform/polygon/path object → press E (or Edit Points button). Drag vertices to reshape. Click segment to add point. Right-click point: Delete Point, Smooth/Corner. Point X/Y inputs for precise positioning. Simplify Path button reduces point count. Use Done, Escape, or V to exit.',
        answer: `<h4>Point Editing (Vertices & Paths)</h4>
<ol>
    <li>Select a <strong>freeform, polygon, or path</strong> object</li>
    <li>Press <code>E</code> or click <strong>Edit Points</strong> in the Properties panel</li>
    <li><strong>Drag vertices</strong> to reshape the object</li>
    <li><strong>Click on a segment</strong> to add a new point</li>
    <li>Right-click a point for: <strong>Delete Point</strong>, <strong>Smooth/Corner</strong> toggle</li>
    <li>Use the <strong>Point X/Y</strong> inputs in Properties for precise positioning</li>
    <li><strong>Simplify Path</strong> button reduces the number of points</li>
    <li>Click <strong>Done</strong>, or press <code>Escape</code> or <code>V</code> to exit point editing</li>
</ol>`
    },

    {
        keywords: ['slice', 'cut.*object', 'split.*object', 'slice.*tool'],
        title: 'Slice Tool',
        category: 'tools',
        summary: 'Slice Tool: Press J. Click on an object to place cut points. A floating toolbar appears with point count, Undo Point, Apply Slice, Cancel. Apply splits the object along the cut line. Creates separate pieces from the original shape.',
        answer: `<h4>Slice Tool</h4>
<ol>
    <li>Press <code>J</code> or select the <strong>Slice Tool</strong> from the Tools tab</li>
    <li>Click on an object to place <strong>cut points</strong></li>
    <li>A floating toolbar appears showing point count</li>
    <li>Click <strong>Apply Slice</strong> to cut the object along the line</li>
    <li>The object is split into separate pieces</li>
</ol>
<p>Use <strong>Undo Point</strong> to remove the last placed point, or <strong>Cancel</strong> to abort.</p>`
    },

    {
        keywords: ['align', 'distribute', 'center.*object', 'align.*left', 'align.*right', 'align.*top', 'align.*bottom', 'spacing'],
        title: 'Alignment & Distribution',
        category: 'tools',
        summary: 'Alignment tools on the Stage Toolbar (above canvas): Align Left, Center Horizontal, Align Right, Align Top, Center Vertical, Align Bottom, Distribute Horizontal, Distribute Vertical, Distribute Gap (custom pixel spacing). Works on 2+ selected objects.',
        answer: `<h4>Alignment & Distribution</h4>
<ol>
    <li>Select <strong>2 or more objects</strong></li>
    <li>Use the <strong>alignment buttons</strong> on the Stage Toolbar (above the canvas):</li>
</ol>
<ul>
    <li><strong>Align Left / Center H / Right</strong> — Horizontal alignment</li>
    <li><strong>Align Top / Center V / Bottom</strong> — Vertical alignment</li>
    <li><strong>Distribute Horizontal / Vertical</strong> — Even spacing</li>
    <li><strong>Distribute Gap</strong> — Custom pixel spacing between objects</li>
</ul>`
    },

    {
        keywords: ['format.*paint', 'copy.*format', 'paste.*format', 'style.*copy'],
        title: 'Format Painter',
        category: 'tools',
        summary: 'Format Painter (Properties panel action buttons): Select source object → click Copy Format (captures fill, stroke, shadow, glow, opacity, etc.) → select target object(s) → click Paste Format. Applies the visual formatting without changing size/position.',
        answer: `<h4>Format Painter</h4>
<ol>
    <li>Select the <strong>source object</strong> with the formatting you want to copy</li>
    <li>Click <strong>Copy Format</strong> in the Properties panel action buttons</li>
    <li>Select the <strong>target object(s)</strong></li>
    <li>Click <strong>Paste Format</strong></li>
</ol>
<p>Copies: fill color/gradient/pattern, stroke, shadow, glow, opacity, and other visual properties. Does not copy size or position.</p>`
    },

    {
        keywords: ['select.*similar', 'same.*shape', 'same.*color', 'same.*size', 'find.*similar'],
        title: 'Select Similar',
        category: 'tools',
        summary: 'Select Similar (Properties panel action buttons): Select one object → click Select Similar dropdown → choose: Same Shape, Same Color, Same Size, Same Stroke, Same Opacity. Selects all matching objects on stage.',
        answer: `<h4>Select Similar Objects</h4>
<ol>
    <li>Select one object as a reference</li>
    <li>Click <strong>Select Similar</strong> in the Properties panel</li>
    <li>Choose a matching criteria:</li>
</ol>
<ul>
    <li><strong>Same Shape</strong> — All objects of the same type</li>
    <li><strong>Same Color</strong> — All objects with the same fill color</li>
    <li><strong>Same Size</strong> — All objects with similar dimensions</li>
    <li><strong>Same Stroke</strong> — All objects with the same stroke/outline</li>
    <li><strong>Same Opacity</strong> — All objects at the same opacity level</li>
</ul>`
    },

    {
        keywords: ['swap', 'swap.*object', 'switch.*position'],
        title: 'Swap Objects',
        category: 'tools',
        summary: 'Swap Objects (Properties panel action buttons): Select exactly 2 objects → click Swap. Swaps their positions on stage.',
        answer: `<h4>Swap Objects</h4>
<ol>
    <li>Select exactly <strong>2 objects</strong> on the stage</li>
    <li>Click <strong>Swap Objects</strong> in the Properties panel action buttons</li>
    <li>The two objects swap their positions</li>
</ol>`
    },

    {
        keywords: ['copy.*animation', 'paste.*animation', 'paint.*animation', 'animation.*painter', 'transfer.*animation'],
        title: 'Animation Copy & Paint',
        category: 'tools',
        summary: 'Animation clipboard (Properties panel): Copy Anims copies all animations from selected object. Paste Anims applies copied animations to selected object. Paint Anims enters a click-to-paint mode — click objects one by one to apply the copied animations.',
        answer: `<h4>Copy & Paint Animations</h4>
<ol>
    <li>Select the object with animations you want to copy</li>
    <li>Click <strong>Copy Anims</strong> in the Properties panel</li>
    <li>Select the target object(s) and click <strong>Paste Anims</strong></li>
</ol>
<p>Or use <strong>Paint Anims</strong> mode: after copying, click Paint Anims and then click on objects one by one — each click applies the copied animations.</p>`
    },

    {
        keywords: ['pivot', 'pivot.*point', 'rotation.*center', 'origin', 'anchor.*point'],
        title: 'Pivot Point',
        category: 'tools',
        summary: 'Pivot Point (Properties panel → Pivot section): Controls the center of rotation/scaling. Show Pivot checkbox to display on canvas. 9-point preset grid (top-left to bottom-right). Custom PX/PY inputs (0-1 normalized). Drag pivot directly on canvas when visible.',
        answer: `<h4>Pivot Point (Rotation Center)</h4>
<ol>
    <li>Select an object on the stage</li>
    <li>In the <strong>Properties panel</strong>, find the <strong>Pivot Point</strong> section</li>
    <li>Check <strong>Show Pivot</strong> to display it on the canvas</li>
    <li>Choose a position from the <strong>9-point preset grid</strong> (top-left, center, bottom-right, etc.)</li>
    <li>Or enter custom <strong>PX/PY</strong> values (0 = left/top, 1 = right/bottom, 0.5 = center)</li>
    <li>You can also <strong>drag</strong> the pivot point directly on the canvas</li>
</ol>
<div class="tip-box">💡 Moving the pivot point changes where the object rotates and scales from. Set it at the base for a pendulum effect!</div>`
    },

    {
        keywords: ['hide', 'show', 'visibility', 'hide.*object', 'show.*object', 'stage.*control'],
        title: 'Hide/Show Objects',
        category: 'tools',
        summary: 'Hide/Show: Right-click object → Hide/Show. Or: Properties panel → Stage Controls → activate Hide/Show mode, then use hide/show buttons on the stage toolbar. Also: Layers panel eye icon toggles visibility. Lock: right-click → Lock, or Layers lock icon.',
        answer: `<h4>Hide/Show Objects</h4>
<ul>
    <li><strong>Right-click</strong> an object → <strong>Hide</strong> or <strong>Show</strong></li>
    <li><strong>Layers panel</strong>: click the <strong>eye icon</strong> to toggle visibility</li>
    <li><strong>Stage Controls</strong>: In Properties panel, click the Hide/Show activation button → the stage toolbar shows Hide Selected/Show Selected/Reset buttons</li>
    <li><strong>Lock</strong>: right-click → Lock, or use the lock icon in the Layers panel</li>
</ul>`
    },

    // ═══════════════════════════════════════════
    //  STAGE & WORKSPACE
    // ═══════════════════════════════════════════

    {
        keywords: ['stage.*size', 'canvas.*size', 'dimension', 'landscape', 'portrait', 'square.*canvas', 'resolution', 'background'],
        title: 'Stage Settings',
        category: 'stage',
        summary: 'Stage Settings (Tools tab → Stage section): Preset sizes — Landscape 1920×1080, Portrait 1080×1920, Square 1080×1080, Custom. Background: Solid Color, Transparent (propagates to all export formats), Linear Gradient (start/end + angle), Radial Gradient, Pattern (stripes/dots/crosshatch/checkerboard), Image (upload with fit mode: cover/contain/stretch/tile). Background opacity slider. Current scene stage settings, including background opacity, are used by preview and export.',
        answer: `<h4>Stage Settings</h4>
<ol>
    <li>Open the <strong>Tools tab</strong> in the left panel</li>
    <li>Find the <strong>Stage Settings</strong> section</li>
    <li>Choose an <strong>orientation</strong>: Landscape (1920×1080), Portrait (1080×1920), Square (1080×1080), or Custom dimensions</li>
    <li>Set the <strong>background type</strong>:</li>
</ol>
<ul>
    <li><strong>Solid Color</strong> — Single background color</li>
    <li><strong>Transparent</strong> — Checkerboard transparency (automatically propagates to all export formats)</li>
    <li><strong>Linear Gradient</strong> — Start/end colors with angle</li>
    <li><strong>Radial Gradient</strong> — Circular gradient</li>
    <li><strong>Pattern</strong> — Stripes, Dots, Crosshatch, Checkerboard</li>
    <li><strong>Image</strong> — Upload an image with fit modes: Cover, Contain, Stretch, Tile</li>
</ul>
<p>Adjust <strong>Background Opacity</strong> with the slider.</p>
<p><strong>Preview and export use the live stage settings</strong> for the current scene, including background color, gradient, pattern, image, and opacity. HTML5 preview/export shows transparent or semi-transparent stage backgrounds over a checkerboard shell outside the canvas so opacity stays visible.</p>`
    },

    {
        keywords: ['collapse.*panel', 'collapsed.*panel', 'panel.*collapsed', 'submenu.*collapsed', 'default.*collapsed', 'expand.*panel.*section'],
        aliases: ['collapsed panels', 'collapsed sections', 'panel sections'],
        title: 'Panel Sections & Default Collapse',
        category: 'stage',
        summary: 'On app startup, the collapsible sections and nested submenus in the left and right panels start collapsed by default. Expand only the sections you need. The side panels themselves are still toggled with [ and ].',
        answer: `<h4>Panel Sections & Default Collapse</h4>
<ol>
    <li>When the app loads, the collapsible sections and nested submenus in the <strong>left</strong> and <strong>right</strong> panels start <strong>collapsed</strong> by default.</li>
    <li>Open only the sections you need as you work.</li>
    <li>Use <code>[</code> to toggle the whole left panel and <code>]</code> to toggle the whole right panel.</li>
</ol>
<p>This keeps the workspace cleaner on startup while preserving the same tools and controls underneath.</p>`
    },

    {
        keywords: ['grid', 'snap', 'ruler', 'guide', 'grid.*size', 'snap.*to.*grid'],
        title: 'Grid, Snap & Rulers',
        category: 'stage',
        summary: 'Grid: G toggles grid visibility. Grid size adjustable (5-200px). Snap to grid toggle with strength (1-20). Rulers: Ctrl+R toggles. Horizontal + vertical rulers with corner toggle. Objects snap to grid points, other object edges, and stage center.',
        answer: `<h4>Grid, Snap & Rulers</h4>
<ul>
    <li>Press <code>G</code> to toggle the <strong>grid</strong> overlay</li>
    <li>Adjust <strong>Grid Size</strong> (5–200px) in Stage Settings</li>
    <li>Toggle <strong>Snap to Grid</strong> with adjustable snap strength (1–20)</li>
    <li>Press <code>Ctrl+R</code> to toggle <strong>rulers</strong></li>
    <li>Objects snap to: grid points, other objects' edges, and the stage center</li>
</ul>`
    },

    {
        keywords: ['zoom', 'pan', 'hand.*tool', 'fit.*to.*view', 'zoom.*in', 'zoom.*out', 'focus.*on'],
        title: 'Zoom & Pan',
        category: 'stage',
        summary: 'Zoom: Ctrl+= zoom in, Ctrl+- zoom out, Ctrl+0 fit to view, mouse wheel zoom. Focus on Selected button centers view on selected object. Pan: press H for the Hand tool, use right-drag while Hand/Pan mode is active, use middle mouse button, hold Space, or toggle Pan Mode on the stage toolbar.',
        answer: `<h4>Zoom & Pan</h4>
<ul>
    <li><code>Ctrl+=</code> — Zoom In, <code>Ctrl+-</code> — Zoom Out, <code>Ctrl+0</code> — Fit to View</li>
    <li><strong>Mouse wheel</strong> to zoom in/out</li>
    <li><strong>Focus on Selected</strong> button (stage toolbar) centers the view on your selected object</li>
    <li><strong>Pan</strong>: Press <code>H</code> for the hand tool and drag, right-drag while Hand/Pan mode is active, hold <code>Space</code>, or use middle mouse button</li>
    <li><strong>Box Select</strong>: Use the <strong>Select</strong> tool and drag on empty stage</li>
    <li><strong>Pan Mode</strong> button on the stage toolbar toggles persistent panning</li>
</ul>`
    },

    {
        keywords: ['layout', 'workspace.*layout', 'panel.*toggle', 'focus.*stage', 'compact', 'hide.*panel'],
        aliases: ['layout', 'layout menu', 'focus stage', 'compact left', 'stage timeline'],
        title: 'Workspace Layouts',
        category: 'stage',
        summary: 'Layout Switcher (top toolbar → Layout button or Ctrl+L): 5 presets — Default (panels + stage + timeline), Stage|Timeline (side-by-side), Focus Stage (maximized canvas), Stage+Timeline (no panels), Compact Left (panels stacked left). Panel visibility toggles: Left Panel ([), Right Panel (]), Stage, Timeline. The Stage + Timeline layout gives a clean no-panels editing view.',
        answer: `<h4>Workspace Layouts</h4>
<ol>
    <li>Click <strong>Layout</strong> in the top toolbar (or press <code>Ctrl+L</code>)</li>
    <li>Choose a layout preset:</li>
</ol>
<ul>
    <li><strong>Default</strong> — Left Panel | Stage | Right Panel, Timeline at bottom</li>
    <li><strong>Stage | Timeline</strong> — Side-by-side editing</li>
    <li><strong>Focus Stage</strong> — Maximized canvas, everything hidden</li>
    <li><strong>Stage + Timeline</strong> — Canvas and timeline only, panels hidden</li>
    <li><strong>Compact Left</strong> — Panels stacked on left, Stage right</li>
</ul>
<p>Toggle individual panels: <code>[</code> = Left Panel, <code>]</code> = Right Panel. Or use the checkboxes in the Layout dropdown.</p>
<p><strong>Stage + Timeline</strong> is the cleanest layout when you want to work without the side panels open.</p>`
    },

    {
        keywords: ['playback', 'play', 'pause', 'stop', 'preview', 'stage.*playback', 'test.*animation'],
        aliases: ['preview', 'preview window', 'play pause'],
        title: 'Playback & Preview',
        category: 'stage',
        summary: 'Playback: Space = Play/Pause. Stage toolbar has: Jump to Start, Previous Animation, Play/Pause, Next Animation, Jump to End. Timeline controls: Play/Pause, Stop, Loop, Speed (0.25x–4x), FPS (24/30/60). Preview button in top toolbar opens a full preview in a new window and uses the current stage settings, including background opacity.',
        answer: `<h4>Playback & Preview</h4>
<ul>
    <li><code>Space</code> — Play/Pause animation on the stage</li>
    <li><strong>Stage toolbar</strong>: Jump to Start, Previous/Next Animation, Play/Pause, Jump to End</li>
    <li><strong>Timeline controls</strong>: Play/Pause, Stop, Loop toggle</li>
    <li><strong>Speed</strong>: 0.25x, 0.5x, 1x, 2x, 4x</li>
    <li><strong>FPS</strong>: 24, 30, or 60 frames per second</li>
    <li><strong>Preview</strong> button (top toolbar) opens a full preview in a new window</li>
</ul>
<p>The preview window reflects the <strong>current scene\'s stage settings</strong>, including solid colors, gradients, patterns, background images, and background opacity. For transparent or semi-transparent HTML5 backgrounds, the preview uses a checkerboard shell behind the canvas so transparency stays visible.</p>
<p>For multi-scene work, use <strong>Preview All Scenes</strong> from the export dialog to check the full sequence.</p>`
    },

    // ═══════════════════════════════════════════
    //  EXPORT & SAVE
    // ═══════════════════════════════════════════

    {
        keywords: ['export', 'save', 'download', 'video', 'mp4', 'gif', 'html', 'webm', 'share', 'export.*format'],
        aliases: ['export', 'export button'],
        title: 'Exporting Animations',
        category: 'export',
        summary: 'Export (top toolbar → Export): MP4 Video (resolution + FPS), GIF (dithering, max colors 64/128/256, transparent background), WebM, HTML5 (controls, autoplay, loop, responsive), JavaScript (Vanilla/GSAP/Anime.js, with comments option), Python (Manim/Pygame/Tkinter), .animstage project file. Export All Scenes toggle for multi-scene export. Preview All Scenes button. Transparent Background option auto-checked when stage BG is transparent. HTML5 preview/export also preserves current stage background opacity and scene-specific stage settings.',
        answer: `<h4>Exporting Your Animation</h4>
<ol>
    <li>Click <strong>Export</strong> in the top toolbar</li>
    <li>Choose your format:</li>
</ol>
<ul>
    <li><strong>MP4 Video</strong> — Resolution (Original/75%/50%), FPS (10/15/24/30/60)</li>
    <li><strong>GIF</strong> — Animated GIF with dithering toggle, max colors (64/128/256), transparent background support (1-bit transparency)</li>
    <li><strong>WebM</strong> — Web-optimized video</li>
    <li><strong>HTML5</strong> — Standalone HTML with options: Include Controls, Autoplay, Loop, Responsive</li>
    <li><strong>JavaScript</strong> — Code in Vanilla JS, GSAP, or Anime.js format (with optional comments)</li>
    <li><strong>Python</strong> — Code for Manim, Pygame, or Tkinter</li>
    <li><strong>.animstage</strong> — Project file (can be reopened later)</li>
</ul>
<p>Toggle <strong>Export All Scenes</strong> for multi-scene export.</p>
<p><strong>Preview All Scenes</strong> is available when your project has multiple scenes.</p>
<p><strong>HTML5 preview/export uses the live stage settings</strong> for the scene being exported, including background color, gradient, pattern, image, and opacity. Transparent or semi-transparent HTML5 playback uses a checkerboard shell outside the canvas so the stage background opacity remains visible.</p>
<div class="tip-box">💡 Use <strong>Preview</strong> to check your animation before exporting.</div>`
    },

    {
        keywords: ['save.*project', 'load.*project', 'open.*project', 'animstage', 'project.*file'],
        aliases: ['new project', 'save', 'save as', 'load', 'project name'],
        title: 'Save & Load Projects',
        category: 'export',
        summary: 'Save: Ctrl+S or File → Save. Uses File System Access API if available, otherwise downloads .animstage file. Save As for new filename. Load: Ctrl+O or File → Load (accepts .animstage or .json). New: creates blank project. Project name editable in toolbar center.',
        answer: `<h4>Save & Load Projects</h4>
<ul>
    <li><strong>Save</strong>: <code>Ctrl+S</code> or click Save in the toolbar — saves as .animstage project</li>
    <li><strong>Save As</strong>: Save with a new filename</li>
    <li><strong>Load</strong>: <code>Ctrl+O</code> or click Load — open .animstage or .json files</li>
    <li><strong>New</strong>: Create a blank project</li>
    <li><strong>Project name</strong>: Click the title in the top-center toolbar to rename</li>
</ul>
<div class="tip-box">💡 <strong>Auto-save</strong> (on by default in Settings) saves your work to IndexedDB and localStorage every 60s and after every change (debounced). The topbar shows a "Saved Xs ago" indicator so you always know when the last save happened. On reload, if a newer autosave exists you'll be prompted to restore it.</div>`
    },

    {
        keywords: ['code', 'code.*panel', 'code.*tab', 'javascript.*code', 'python.*code', 'code.*template', 'run.*code'],
        title: 'Code Panel',
        category: 'export',
        summary: 'Code Tab (right panel → Code): Live-generated animation code in JavaScript or Python with built-in syntax highlighting (keywords, strings, numbers, comments, function names colorized). Copy Code, Run Code, Export Code buttons. Code Templates: Bounce Animation, Orbit Animation, Particle System, Wave Motion, Stagger Sequence. Language selector: JS/Python. AI Mode generated code is also syntax-highlighted in the same colors.',
        answer: `<h4>Code Panel</h4>
<ol>
    <li>Open the <strong>Code tab</strong> in the right panel</li>
    <li>See the <strong>live-generated code</strong> for your current animations, with syntax highlighting (keywords, strings, numbers, comments, and function names color-coded)</li>
    <li>Switch between <strong>JavaScript</strong> and <strong>Python</strong> using the language selector</li>
    <li>Use buttons: <strong>Copy Code</strong>, <strong>Run Code</strong>, <strong>Export Code</strong></li>
</ol>
<p>The same syntax highlighting is applied to the AI Mode <strong>Execution Preview</strong> code block. While editing AI code, the highlighting is removed for a clean cursor and re-applied when you click Done.</p>
<p><strong>Code Templates</strong> for quick starts:</p>
<ul>
    <li>Bounce Animation, Orbit Animation, Particle System, Wave Motion, Stagger Sequence</li>
</ul>`
    },

    // ═══════════════════════════════════════════
    //  SCENES
    // ═══════════════════════════════════════════

    {
        keywords: ['scene', 'slide', 'multi.*scene', 'transition', 'presentation', 'add.*scene', 'scene.*bar'],
        aliases: ['scene bar', 'add scene', 'duplicate scene', 'delete scene'],
        title: 'Working with Scenes',
        category: 'scenes',
        summary: 'Scenes (Scene Bar below workspace, above timeline): Add Scene (+), Duplicate Scene, Delete Scene. Click scene thumbnail to switch. Drag to reorder. Each scene has its own objects and animations. Transitions between scenes. Navigate: PageDown (next), PageUp (previous). Export All Scenes for multi-scene export.',
        answer: `<h4>Multi-Scene Animations</h4>
<ol>
    <li>Look at the <strong>Scene Bar</strong> below the workspace</li>
    <li>Click <strong>+</strong> to add a new scene</li>
    <li>Each scene has its own objects and animations (like slides)</li>
    <li>Click a scene <strong>thumbnail</strong> to switch to it</li>
    <li><strong>Drag</strong> scenes to reorder them</li>
    <li>Right-click a scene for: <strong>Duplicate, Delete, Rename</strong></li>
    <li>Navigate with <code>PageDown</code> (next) / <code>PageUp</code> (previous)</li>
</ol>
<p>Add <strong>transitions</strong> between scenes for smooth scene changes.</p>
<div class="tip-box">💡 Use <strong>Export All Scenes</strong> in the Export modal to export a multi-scene animation.</div>`
    },

    // ═══════════════════════════════════════════
    //  TEMPLATES & ANIMATED PARTS
    // ═══════════════════════════════════════════

    {
        keywords: ['template', 'preset', 'start.*from', 'logo.*reveal', 'slide.*deck', 'banner', 'loading.*screen'],
        aliases: ['templates', 'template library'],
        title: 'Using Templates',
        category: 'templates',
        summary: 'Templates (top toolbar → Templates): Pre-built animation templates: Logo Reveal, Slide Deck, Attention Pulse, Cinematic Entry, Typewriter Intro, Bounce In, Spin & Grow, Wave Sequence, and more. Click to preview, click Apply to load onto stage. All objects and animations are fully editable after applying. Supports stagger.',
        answer: `<h4>Using Animation Templates</h4>
<ol>
    <li>Click <strong>Templates</strong> in the top toolbar</li>
    <li>Browse the template library: Logo Reveal, Slide Deck, Attention Pulse, Cinematic Entry, Typewriter Intro, Bounce In, Spin & Grow, Wave Sequence, and more</li>
    <li>Click a template to <strong>preview</strong> it</li>
    <li>Click <strong>Apply</strong> to load it onto your stage</li>
    <li>All objects and animations are <strong>fully editable</strong> after applying</li>
</ol>
<div class="tip-box">💡 Templates are a great starting point — apply one, then customize colors, text, and timing to match your needs.</div>`
    },

    {
        keywords: ['character', 'walk', 'run', 'person', 'man', 'woman', 'baby', 'animated.*part', 'limb', 'crawl'],
        title: 'Animated Characters & Parts',
        category: 'templates',
        summary: 'Animated Parts (Tools tab → Animated Parts): Categories: Saved Presets, Full Characters (Male Walk/Run, Female Walk/Run, Baby Crawl), Limbs & Body Parts (Walking Legs M/F, Running Legs M/F, Arms Wave, Arms Swing), Face & Expression (Face Blink, Mouth Talk), Animal Parts (Tail Wag, Wing Flap), Actions & Gestures. Settings: speed, distance, bounce, approach depth/scale/lift, head/torso pitch. Edit Pieces, Save Preset.',
        answer: `<h4>Animated Characters & Body Parts</h4>
<ol>
    <li>Open the <strong>Tools tab</strong> in the left panel</li>
    <li>Expand the <strong>Animated Parts</strong> section</li>
    <li>Browse categories:</li>
</ol>
<ul>
    <li><strong>Full Characters</strong>: Male Walk, Female Walk, Male Run, Female Run, Baby Crawl</li>
    <li><strong>Limbs</strong>: Walking Legs (M/F), Running Legs (M/F), Arms Wave, Arms Swing</li>
    <li><strong>Face & Expression</strong>: Face Blink, Mouth Talk</li>
    <li><strong>Animal Parts</strong>: Tail Wag, Wing Flap</li>
    <li><strong>Actions & Gestures</strong>: Various action presets</li>
    <li><strong>Saved Presets</strong>: Your custom saved parts</li>
</ul>
<p><strong>Settings</strong>: Speed, Distance, Bounce, Approach Depth, Far/Near Scale, Approach Lift, Head/Torso Pitch</p>
<p>Click <strong>Edit Pieces</strong> to customize individual parts. Click <strong>Save Preset</strong> to save your configuration.</p>
<div class="tip-box">💡 These create multi-piece grouped objects. Double-click the group to customize individual parts.</div>`
    },

    // ═══════════════════════════════════════════
    //  AI MODE
    // ═══════════════════════════════════════════

    {
        keywords: ['ai mode', 'ai.*generate', 'natural.*language', 'ai.*command', 'describe.*animation', 'ai.*prompt'],
        title: 'Using AI Mode',
        category: 'ai',
        summary: 'AI Mode: Switch from mode dropdown in top toolbar. Natural language prompt → Generate (or Cmd/Ctrl+Enter). AI Prompt Guide with examples. Help text also covers inspection and workflow topics like stage settings, preview/export, layouts, Copy Properties, Copy All Properties, and Parent Joint pinning. Stage Awareness panel shows objects/stage info. Generated code can be: Previewed, Applied, Edited, Reapplied, Copied, Saved as Template. Recent AI Animations cache. LLM providers: Built-in (no API key), DeepSeek, OpenAI, Custom (configure in Settings → AI Settings).',
        answer: `<h4>Using AI Mode</h4>
<ol>
    <li>Switch to <strong>AI Mode</strong> from the mode dropdown in the top toolbar</li>
    <li>Type a natural language description in the <strong>AI Prompt box</strong>:<br>
        <code>"make the circle bounce forever"</code>, <code>"spin the star slowly"</code>, <code>"fly in all objects from the left"</code></li>
    <li>Click <strong>Generate</strong> (or <code>Cmd/Ctrl+Enter</code>)</li>
    <li>Review the generated code</li>
    <li>Click <strong>Apply</strong> to apply the animation, or <strong>Preview</strong> to test first</li>
</ol>
<p>Additional features: <strong>Suggest</strong> (AI suggests animations), <strong>Help</strong> (prompt writing guide with creation, animation, stage settings, preview/export, layout, copy/export, and pin/joint workflow examples), <strong>Reapply</strong> (edit and regenerate), <strong>Save as Template</strong>.</p>
<div class="tip-box">💡 For better AI results: Settings → AI Settings → choose DeepSeek or OpenAI and add your API key. Built-in engine works without a key but is more limited.</div>`
    },

    {
        keywords: ['ai.*character', 'ai.*assemble', 'ai.*build.*human', 'ai.*body.*part', 'ai.*template', 'character.*assembly', 'assemble.*character', 'build.*human', 'build.*character'],
        title: 'AI Character Assembly',
        category: 'ai',
        summary: 'AI mode can assemble characters from your saved body-part templates. Say "build a human", "assemble a dog", or "build a car". It matches saved templates (Head, Torso, Limb, etc.) to anatomy slots, scales them proportionally, and arranges them in correct positions. Say "list templates" to see what\'s available, or "add the Head template" to place a single template.',
        answer: `<h4>AI Character Assembly</h4>
<p>AI mode can automatically assemble characters from your <strong>saved body-part templates</strong>:</p>
<h4>Step 1: Create Body Part Templates</h4>
<ol>
    <li>Create shapes with <strong>joints</strong> for each body part (head, torso, arms, legs)</li>
    <li>Right-click each → <strong>"Save as Template"</strong></li>
    <li>Name them clearly: "Head", "Torso", "Universal Limb", "Arm Joints", "Leg Joints"</li>
</ol>
<h4>Step 2: Assemble via AI</h4>
<ol>
    <li>Switch to <strong>AI Mode</strong></li>
    <li>Type: <code>"build a human"</code>, <code>"assemble a dog"</code>, or <code>"build a car"</code></li>
    <li>Click <strong>Generate</strong>, then <strong>Apply</strong></li>
    <li>The AI matches your templates to body slots, scales them proportionally, and positions them anatomically</li>
</ol>
<h4>Template Matching</h4>
<ul>
    <li><strong>Head</strong> slot → templates named "head", "skull", "face"</li>
    <li><strong>Torso</strong> slot → templates named "torso", "body", "chest"</li>
    <li><strong>Arms/Legs</strong> → named "arm", "leg", or a <strong>"universal limb"</strong> reused for all limbs</li>
</ul>
<h4>Other AI Template Commands</h4>
<ul>
    <li><code>"list templates"</code> — shows all saved templates</li>
    <li><code>"add the Head template"</code> — places a single template on stage</li>
</ul>
<div class="tip-box">💡 Joints are fully preserved! After assembly, each body part retains its joints and can be animated immediately.</div>`
    },

    // ═══════════════════════════════════════════
    //  TAGS
    // ═══════════════════════════════════════════

    {
        keywords: ['tag', 'position.*tag', 'object.*tag', 'zone.*tag', 'label', 'marker'],
        title: 'Tags System',
        category: 'tools',
        summary: 'Tags (left panel → Tags tab): Position Tags — name + Add button, places colored markers on stage. Object Tags — tag selected objects with custom labels. Zone Tags — Draw Zone button (click+drag on stage to define rectangle area). Tags help organize and reference objects/positions in animations.',
        answer: `<h4>Tags System</h4>
<p>Open the <strong>Tags tab</strong> in the left panel:</p>
<h4>Position Tags</h4>
<ol>
    <li>Enter a name and click <strong>Add</strong></li>
    <li>A colored marker appears on the stage at the current position</li>
    <li>Use position tags to mark specific stage locations for reference</li>
</ol>
<h4>Object Tags</h4>
<ol>
    <li>Select an object, then add a custom label/tag to it</li>
    <li>Tagged objects can be referenced by name in AI mode prompts</li>
</ol>
<h4>Zone Tags</h4>
<ol>
    <li>Click <strong>Draw Zone</strong></li>
    <li>Click and drag on the stage to define a rectangular zone</li>
    <li>Zones help organize spatial areas for animation targeting</li>
</ol>`
    },

    // ═══════════════════════════════════════════
    //  AUDIO
    // ═══════════════════════════════════════════

    {
        keywords: ['audio', 'music', 'sound', 'soundtrack', 'waveform', 'audio.*track'],
        title: 'Audio Timeline',
        category: 'timeline',
        summary: 'Audio (Timeline → Audio Upload button): Upload an audio file to add a soundtrack. Waveform visualization displayed in timeline. Audio syncs with animation playback. Remove Audio button to clear. Useful for syncing animations to music/narration.',
        answer: `<h4>Audio Timeline</h4>
<ol>
    <li>Click the <strong>Audio Upload</strong> button in the Timeline controls</li>
    <li>Select an audio file (MP3, WAV, OGG)</li>
    <li>The <strong>waveform</strong> appears in the timeline, synced with animation playback</li>
    <li>Use the waveform to visually sync animation bars with beats or narration</li>
    <li>Click <strong>Remove Audio</strong> to clear the audio track</li>
</ol>
<div class="tip-box">💡 Align animation bars with audio peaks in the timeline for perfectly synced motion!</div>`
    },

    // ═══════════════════════════════════════════
    //  SETTINGS & GENERAL
    // ═══════════════════════════════════════════

    {
        keywords: ['setting', 'configure', 'theme', 'api.*key', 'provider', 'dark.*mode', 'light.*mode', 'auto.*save', 'hardware.*acceleration'],
        aliases: ['settings', 'gear icon', 'theme toggle'],
        title: 'App Settings',
        category: 'settings',
        summary: 'Settings (gear icon, top-right): General — Theme (Dark/Light), Auto-save toggle. AI — Provider (Built-in/DeepSeek/OpenAI/Custom), API Key, API Endpoint. Performance — Hardware Acceleration toggle, Max Objects (50-5000).',
        answer: `<h4>App Settings</h4>
<ol>
    <li>Click the <strong>gear icon</strong> in the top-right toolbar</li>
    <li>Available settings:</li>
</ol>
<ul>
    <li><strong>Theme</strong> — Dark or Light mode</li>
    <li><strong>Auto-save</strong> — Automatically save your project periodically</li>
    <li><strong>AI Provider</strong> — Built-in, DeepSeek, OpenAI, or Custom endpoint</li>
    <li><strong>API Key</strong> — Your LLM API key (required for DeepSeek/OpenAI)</li>
    <li><strong>API Endpoint</strong> — Custom API URL</li>
    <li><strong>Hardware Acceleration</strong> — GPU rendering toggle</li>
    <li><strong>Max Objects</strong> — Performance limit (50–5000)</li>
</ul>`
    },

    {
        keywords: ['keyboard', 'shortcut', 'hotkey', 'key.*binding'],
        title: 'Keyboard Shortcuts',
        category: 'settings',
        summary: 'All shortcuts — Tools: V Select, M Move, R Rect, C Circle, T Triangle, S Star, X Text, I Image, L Line, P Polygon, D Draw, H Hand, Z Zoom, K Color Picker, E Edit Points, J Slice. Actions: Ctrl+Z Undo, Ctrl+Y Redo, Ctrl+S Save, Ctrl+O Open, Ctrl+A Select All, Ctrl+D Duplicate, Delete Remove, Ctrl+G Group, Ctrl+Shift+G Ungroup, Ctrl+C/V/X Copy/Paste/Cut, Ctrl+B Bold, Ctrl+I Italic, Ctrl+U Underline. View: Space Play/Pause, G Grid, Ctrl+R Rulers, Ctrl+= Zoom In, Ctrl+- Zoom Out, Ctrl+0 Fit, [ Left Panel, ] Right Panel, Ctrl+L Layout. Scenes: PageDown/Up. Timeline: I In Point, O Out Point. ? opens shortcuts modal.',
        answer: `<h4>Keyboard Shortcuts</h4>
<p><strong>Tools:</strong></p>
<ul>
    <li><code>V</code> Select · <code>M</code> Move · <code>R</code> Rectangle · <code>C</code> Circle · <code>T</code> Triangle · <code>S</code> Star · <code>X</code> Text · <code>I</code> Image</li>
    <li><code>L</code> Line · <code>P</code> Polygon · <code>D</code> Draw · <code>H</code> Hand · <code>Z</code> Zoom · <code>K</code> Color Picker · <code>E</code> Edit Points · <code>J</code> Slice</li>
</ul>
<p><strong>Actions:</strong></p>
<ul>
    <li><code>Ctrl+Z</code> Undo · <code>Ctrl+Y</code> Redo · <code>Ctrl+S</code> Save · <code>Ctrl+O</code> Open</li>
    <li><code>Ctrl+C/V/X</code> Copy/Paste/Cut · <code>Ctrl+D</code> Duplicate · <code>Delete</code> Remove</li>
    <li><code>Ctrl+G</code> Group · <code>Ctrl+Shift+G</code> Ungroup · <code>Ctrl+A</code> Select All</li>
    <li><code>Ctrl+B</code> Bold · <code>Ctrl+I</code> Italic · <code>Ctrl+U</code> Underline</li>
</ul>
<p><strong>View:</strong></p>
<ul>
    <li><code>Space</code> Play/Pause · <code>G</code> Grid · <code>Ctrl+R</code> Rulers · <code>?</code> Show Shortcuts</li>
    <li><code>Ctrl+=</code> Zoom In · <code>Ctrl+-</code> Zoom Out · <code>Ctrl+0</code> Fit · <code>Ctrl+L</code> Layout</li>
    <li><code>[</code> Left Panel · <code>]</code> Right Panel · <code>\</code> Bottom Panel · <code>Ctrl+M</code> Mute</li>
</ul>
<p><strong>Timeline:</strong> <code>I</code> Set In Point · <code>O</code> Set Out Point</p>
<p><strong>Scenes:</strong> <code>PageDown</code> Next · <code>PageUp</code> Previous</p>
<p>Press <code>?</code> any time to open the full shortcuts modal — now includes Cut/Copy/Paste, Save As, Bottom panel and Mute rows.</p>`
    },

    {
        keywords: ['undo', 'redo', 'history', 'revert', 'mistake'],
        title: 'Undo & Redo',
        category: 'settings',
        summary: 'Undo: Ctrl+Z. Redo: Ctrl+Y. Also available as buttons in top toolbar and timeline controls. History tracks: object creation/deletion, property changes, animation adds/removes, group/ungroup, move, resize, etc.',
        answer: `<h4>Undo & Redo</h4>
<ul>
    <li><code>Ctrl+Z</code> — <strong>Undo</strong> the last action</li>
    <li><code>Ctrl+Y</code> — <strong>Redo</strong> (bring back undone action)</li>
    <li>Also available as <strong>↩ Undo</strong> / <strong>↪ Redo</strong> buttons in the top toolbar</li>
    <li>Timeline has its own undo/redo buttons</li>
</ul>
<p>History tracks: object creation, deletion, property changes, moves, resizes, animation adds/removes, group/ungroup, and more.</p>`
    },

    {
        keywords: ['copy', 'paste', 'duplicate', 'clone', 'cut'],
        title: 'Copy, Paste & Duplicate',
        category: 'settings',
        summary: 'Ctrl+C Copy, Ctrl+V Paste (slightly offset), Ctrl+X Cut, Ctrl+D Duplicate in place. Also via right-click context menu. "Paste as Image" pastes from system clipboard as image object. "Save as Image" downloads an object render.',
        answer: `<h4>Copy, Paste & Duplicate</h4>
<ul>
    <li><code>Ctrl+C</code> — Copy selected objects</li>
    <li><code>Ctrl+V</code> — Paste (slightly offset from original)</li>
    <li><code>Ctrl+X</code> — Cut</li>
    <li><code>Ctrl+D</code> — Duplicate in place</li>
    <li>Right-click → <strong>Paste as Image</strong> — paste image from system clipboard</li>
    <li>Right-click → <strong>Save as Image</strong> — download object render as image file</li>
</ul>`
    },

    {
        keywords: ['context.*menu', 'right.*click', 'right.*click.*menu'],
        title: 'Context Menus',
        category: 'tools',
        summary: 'Right-click on object: Rename, Duplicate, Delete, Copy, Cut, Paste, Paste as Image, Save as Image, Save as Icon, Flip H/V, Bring Forward/Send Backward, Group/Ungroup, Edit Group, Animate submenu (Entry/Exit/Emphasis), Copy/Paste/Paint Animations, Remove All Animations (with confirmation), Lock, Hide, Focus, Add Tag, Boolean ops (2+ shapes). Right-click empty stage: Paste, Select All, Add Position Tag. Right-click timeline bar: Copy/Paste/Duplicate, Repeat, Split/Trim, Combine, Delete.',
        answer: `<h4>Context Menus (Right-Click)</h4>
<h4>Right-Click on Object</h4>
<ul>
    <li><strong>Rename, Duplicate, Delete, Copy, Cut, Paste</strong></li>
    <li><strong>Paste as Image</strong> (from clipboard), <strong>Save as Image</strong>, <strong>Save as Icon</strong></li>
    <li><strong>Flip Horizontal / Vertical</strong></li>
    <li><strong>Bring Forward / Send Backward</strong></li>
    <li><strong>Group / Ungroup / Edit Group</strong></li>
    <li><strong>Animate →</strong> submenu: Entry, Exit, Emphasis animation categories</li>
    <li><strong>Copy/Paste/Paint Animations</strong></li>
    <li><strong>Remove All Animations</strong> — clears all animations from that object after a confirmation prompt</li>
    <li><strong>Lock / Hide / Focus</strong></li>
    <li><strong>Add Tag</strong>, <strong>Boolean Operations</strong> (2+ shapes selected)</li>
</ul>
<h4>Right-Click on Empty Stage</h4>
<ul>
    <li><strong>Paste</strong>, <strong>Select All</strong>, <strong>Add Position Tag</strong></li>
</ul>
<h4>Right-Click on Timeline Bar</h4>
<ul>
    <li><strong>Copy, Paste, Duplicate</strong></li>
    <li><strong>Repeat</strong> (×2 to ×10, Custom), <strong>Set Repeat Count</strong></li>
    <li><strong>Split at Playhead, Trim Start/End, Combine with Next, Delete</strong></li>
</ul>`
    },

    {
        keywords: ['pwa', 'install.*app', 'desktop.*app', 'offline'],
        aliases: ['install app', 'desktop app'],
        title: 'Install as Desktop App',
        category: 'settings',
        summary: 'PWA (Progressive Web App): When available, an "Install App" button appears in the top toolbar. Click to install Animation Stage as a standalone desktop application with offline support.',
        answer: `<h4>Install as Desktop App</h4>
<ol>
    <li>When available, the <strong>Install App</strong> button appears in the top toolbar</li>
    <li>Click it to install Animation Stage as a <strong>standalone desktop application</strong></li>
    <li>The app works offline and launches from your desktop/dock</li>
</ol>`
    },

    {
        aliases: ['smartart', 'smart art'],
        keywords: ['background.*remov', 'remove.*background', 'transparent.*background', 'cutout'],
        title: 'Background Removal',
        category: 'tools',
        summary: 'Background Removal (image objects only): Select image → Properties panel → Image Tools → Remove Background. Adjust Tolerance slider (1-100) for sensitivity. Click Apply. Works by detecting and removing similar-colored regions.',
        answer: `<h4>Remove Image Background</h4>
<ol>
    <li>Select an <strong>image</strong> object on the stage</li>
    <li>In the Properties panel → <strong>Image Tools</strong> section</li>
    <li>Click <strong>Remove Background</strong></li>
    <li>Adjust the <strong>Tolerance</strong> slider (1–100) — higher = more aggressive removal</li>
    <li>Click <strong>Apply</strong> to confirm, or <strong>Cancel</strong> to abort</li>
</ol>`
    },

    {
        keywords: ['crop', 'image.*crop', 'trim.*image'],
        title: 'Image Crop',
        category: 'tools',
        summary: 'Image Crop (image objects only): Select image → Properties panel → Image Tools → Crop Image. Set Left/Top/Right/Bottom crop percentages. Right-clicking an image now also includes Auto-Crop, which trims transparent borders first and opens the crop editor for refinement.',
        answer: `<h4>Crop an Image</h4>
<ol>
    <li>Select an <strong>image</strong> object on the stage</li>
    <li>In the Properties panel → <strong>Image Tools</strong> → click <strong>Crop Image</strong></li>
    <li>Adjust the <strong>Left, Top, Right, Bottom</strong> crop percentage sliders</li>
    <li>Click <strong>Apply</strong> to confirm the crop</li>
</ol>
<p><strong>Auto-Crop:</strong> Right-click an image → <strong>Auto-Crop</strong>. The app trims transparent borders automatically, then opens the crop editor so you can refine the result if needed.</p>`
    },

    {
        keywords: ['eraser', 'image.*eraser', 'erase.*part', 'remove.*part'],
        title: 'Image Eraser',
        category: 'tools',
        summary: 'Image Eraser (image objects only): Select image → Properties panel → Image Tools → Image Eraser. Paint over areas to erase. Adjust Brush Size (2-200) and Hardness (0-100). Click Apply when done.',
        answer: `<h4>Image Eraser</h4>
<ol>
    <li>Select an <strong>image</strong> object on the stage</li>
    <li>In the Properties panel → <strong>Image Tools</strong> → click <strong>Image Eraser</strong></li>
    <li>Adjust <strong>Brush Size</strong> (2–200) and <strong>Hardness</strong> (0–100%)</li>
    <li><strong>Paint over areas</strong> you want to erase</li>
    <li>Click <strong>Apply</strong> when done, or <strong>Cancel</strong> to revert</li>
</ol>`
    },

    {
        keywords: ['ai.*trace', 'trace.*image', 'vector.*trace', 'image.*to.*vector', 'convert.*vector', 'vectorize', 'auto.*trace'],
        title: 'Auto Trace (Image to Vector)',
        category: 'tools',
        summary: 'Auto Trace converts raster images into editable vector shapes. Select image → Properties panel → Image Tools → Auto Trace. Choose Outline / Silhouette for one editable outline or Color Regions for grouped vector parts. Sensitivity, optional background removal, smoothing, and Edit After Create help refine the result.',
        answer: `<h4>Auto Trace — Image to Vector</h4>
<ol>
    <li>Select an <strong>image</strong> object on the stage</li>
    <li>In the Properties panel → <strong>Image Tools</strong> → click <strong>Auto Trace</strong></li>
    <li>Adjust settings:</li>
</ol>
<ul>
    <li><strong>Mode</strong> — <strong>Outline / Silhouette</strong> creates one editable freeform outline; <strong>Color Regions</strong> splits the image into grouped vector shapes</li>
    <li><strong>Detail</strong> (Low / Medium / High) — path simplification level</li>
    <li><strong>Sensitivity</strong> — raises foreground and edge sensitivity so fine or low-contrast borders are easier to detect</li>
    <li><strong>Colors</strong> (Color Regions mode) — number of palette colors to extract</li>
    <li><strong>Min Region</strong> — minimum traced area in pixels (filters out tiny specks)</li>
    <li><strong>Auto Remove Background Before Tracing</strong> — non-destructively clears edge-connected background based on corner colors</li>
    <li><strong>BG Tolerance</strong> — sensitivity for automatic background removal</li>
    <li><strong>Smooth Paths</strong> — applies Chaikin corner-cutting for smoother curves</li>
    <li><strong>Edit After Create</strong> — opens Edit Points immediately when one outline is created</li>
    <li><strong>Remove Original</strong> — delete the image after tracing</li>
</ul>
<ol start="4">
    <li>Click <strong>Preview</strong> to inspect the traced result on the image</li>
    <li>Click <strong>Apply</strong> to create the vector shape(s). Color Regions results are automatically grouped.</li>
    <li>Click <strong>Cancel</strong> to discard</li>
</ol>
<p><strong>Tips:</strong> Use <strong>Outline / Silhouette</strong> for one clean editable border around a subject. Use <strong>Color Regions</strong> for logos, icons, and poster-style art. If trace detection is weak, raise <strong>Sensitivity</strong> first, then lower <strong>Min Region</strong> if needed. If the image has a flat background, leave background removal on and then refine the result with <strong>Edit Points</strong>.</p>`
    },

    {
        keywords: ['image.*filter', 'brightness', 'contrast', 'saturation', 'hue', 'blur.*filter', 'grayscale', 'sepia', 'invert', 'tint'],
        title: 'Image Filters',
        category: 'tools',
        summary: 'Image Filters (image objects only, Properties panel → Color & Correction): Brightness (-100 to 100), Contrast (-100 to 100), Saturation (-100 to 100), Hue Rotate (0-360°), Blur (0-20), Grayscale (0-100), Sepia (0-100), Invert (0-100), Tint (color + amount 0-100%). Reset All Filters button.',
        answer: `<h4>Image Filters</h4>
<ol>
    <li>Select an <strong>image</strong> object</li>
    <li>In the Properties panel → <strong>Color & Correction</strong> section</li>
    <li>Adjust filters:</li>
</ol>
<ul>
    <li><strong>Brightness</strong> (-100 to 100)</li>
    <li><strong>Contrast</strong> (-100 to 100)</li>
    <li><strong>Saturation</strong> (-100 to 100)</li>
    <li><strong>Hue Rotate</strong> (0–360°)</li>
    <li><strong>Blur</strong> (0–20)</li>
    <li><strong>Grayscale</strong> (0–100%)</li>
    <li><strong>Sepia</strong> (0–100%)</li>
    <li><strong>Invert</strong> (0–100%)</li>
    <li><strong>Tint</strong> — color + amount (0–100%)</li>
</ul>
<p>Click <strong>Reset All Filters</strong> to clear all adjustments.</p>`
    },

    // ─── App Overview ─────────────────────────────────────
    {
        keywords: ['what is animation stage', 'overview', 'about.*app', 'introduction', 'what can.*do', 'features', 'capabilities', 'app.*description'],
        title: 'App Overview',
        category: 'stage',
        summary: 'Animation Stage is a professional browser-based 2D canvas animation app. Key capabilities: 17 shape types, 70+ built-in animations across 10+ categories, timeline with drag-to-edit bars and recording, AI Mode with natural language commands and LLM integration, multi-scene support with transitions, export to HTML5/MP4/WebM/GIF/JS/Python/native project files, Image Deform for advanced single-image warping, Joints & Assembly for cutout character animation and shape bending, path animation along shape outlines, 12 built-in templates, and PWA support for offline use.',
        answer: `<h4>What is Animation Stage?</h4>
<p><strong>Animation Stage</strong> is a professional browser-based 2D canvas animation application.</p>
<h5>Key Capabilities</h5>
<ul>
    <li><strong>17 shape types</strong> with full transform, fill, stroke, and effects controls</li>
    <li><strong>70+ built-in animations</strong> across 10+ categories</li>
    <li><strong>Timeline</strong> with drag-to-edit animation bars, recording, playback speed control</li>
    <li><strong>AI Mode</strong> with natural language commands and LLM integration</li>
    <li><strong>Multi-scene</strong> support with transitions</li>
    <li><strong>Export</strong> to HTML5, MP4, WebM, GIF, JavaScript, Python, and native project files</li>
    <li><strong>Image Deform</strong> for advanced single-image warping and mesh deformation</li>
    <li><strong>Joints &amp; Assembly</strong> for cutout character animation and hinge-based shape bending</li>
    <li><strong>Path animation</strong> to move objects along any shape outline</li>
    <li><strong>12 built-in templates</strong> for quick starts</li>
    <li><strong>PWA support</strong> — installable as a desktop app with offline capability</li>
</ul>`
    },

    // ─── Getting Started ──────────────────────────────────
    {
        keywords: ['get.*start', 'first.*animation', 'beginner', 'how.*begin', 'tutorial', 'quick.*start', 'new.*user', 'how.*use.*app', 'sample.*project', 'try.*sample'],
        title: 'Getting Started',
        category: 'stage',
        summary: 'Getting started: Open index.html in a modern browser. Steps to create your first animation: 1) Draw a shape — select a tool (e.g. press R for rectangle) and click-drag on stage. 2) Apply animation — switch to Animate tab in left panel, select object, click an animation. 3) Preview — press Space to play/pause or click Preview for full preview window. 4) Export — click Export and choose output format. New: when the stage is empty, the Properties panel shows a Sample Project button that loads a few colourful shapes so you can immediately try animations.',
        answer: `<h4>Getting Started</h4>
<h5>Opening the App</h5>
<p>Animation Stage runs in any modern web browser. Open <strong>index.html</strong> from your web server or directly in a browser.</p>
<h5>Creating Your First Animation</h5>
<ol>
    <li><strong>Draw a shape</strong>: Select a shape tool (e.g., press <kbd>R</kbd> for rectangle) and click-drag on the stage</li>
    <li><strong>Apply an animation</strong>: Switch to the <strong>Animate tab</strong> in the left panel, select your object, and click an animation</li>
    <li><strong>Preview</strong>: Press <kbd>Space</kbd> to play/pause, or click <strong>Preview</strong> in the toolbar for a full preview window</li>
    <li><strong>Export</strong>: Click <strong>Export</strong> in the toolbar and choose your output format</li>
</ol>
<div class="tip-box">💡 In a hurry? When the stage is empty, the Properties panel shows a <strong>Sample Project</strong> button that loads a small scene (a title plus a row of circles and a rounded rectangle) so you can jump straight to applying animations.</div>`
    },

    // ─── Objects Panel ────────────────────────────────────
    {
        keywords: ['objects.*panel', 'objects.*tab', 'object.*list', 'rename.*object', 'z.*order', 'reorder.*object', 'lock.*object', 'visibility.*object', 'object.*management', 'batch.*rename', 'bulk.*rename', 'rename.*pattern', 'search.*object', 'filter.*object', 'find.*object'],
        title: 'Objects Panel',
        category: 'objects',
        summary: 'Objects Panel (left panel → Objects tab): Shows all objects on stage. Features: search/filter box (by name, type, or tag — Esc clears), object list with type icons, selection sync (click name to select on stage), rename (double-click name), batch rename via the Rename toolbar button using patterns like "Box {n}" (placeholders {n} {nn} {nnn} {type} {old}), visibility toggle (eye icon), locking toggle (lock icon to prevent edits), z-order drag to reorder front/back, and delete via Delete key or trash button.',
        answer: `<h4>Objects Panel</h4>
<p>The <strong>Objects tab</strong> in the left panel shows all objects currently on the stage.</p>
<h5>Features</h5>
<ul>
    <li><strong>Search / filter</strong>: Type in the search box at the top of the panel to filter by object name, type, or tag. Groups auto-expand to reveal matches. Press <kbd>Esc</kbd> to clear.</li>
    <li><strong>Object list</strong>: All objects listed by name with type icons</li>
    <li><strong>Selection sync</strong>: Click an object name to select it on stage; stage selection highlights in the list</li>
    <li><strong>Rename</strong>: Double-click an object name to rename it</li>
    <li><strong>Batch Rename</strong>: Click the <strong>Rename</strong> button in the toolbar above the list to rename all selected objects (or all objects if none are selected) using a pattern. Placeholders: <code>{n}</code> counter, <code>{nn}</code> / <code>{nnn}</code> zero-padded, <code>{type}</code> object type, <code>{old}</code> previous name. Example: <code>Hero {nn}</code> → Hero 01, Hero 02…</li>
    <li><strong>Visibility</strong>: Toggle eye icon to hide/show objects</li>
    <li><strong>Locking</strong>: Toggle lock icon to prevent accidental edits</li>
    <li><strong>Z-order</strong>: Drag objects up/down in the list to reorder (front ↔ back)</li>
    <li><strong>Delete</strong>: Select and press <kbd>Delete</kbd>, or use the trash button</li>
</ul>`
    },

    // ─── Properties Panel ─────────────────────────────────
    {
        keywords: ['properties.*panel', 'properties.*tab', 'transform.*properties', 'fill.*type', 'stroke.*style', 'outline.*properties', 'shadow.*effect', 'glow.*effect', 'reflection.*effect', 'bevel.*effect', 'shape.*specific', 'border.*radius', 'inner.*radius', 'sides.*polygon'],
        title: 'Properties Panel',
        category: 'objects',
        summary: 'Properties Panel (right panel): Displays/edits selected object properties. Sections: Transform (X, Y, Width, Height, Aspect Lock for most resizable objects, Z Rotation -360–360°, Stage Angle readouts in 0–360°, ±180°, and From Down forms, Down → 0° to align the object visually downward and bake that as the new baseline, plus Set 0° to bake the current angle as the new zero baseline, Depth/Extrusion with a Handle toggle, X Tilt/Y Tilt for images, icons, rectangles, and rounded rectangles, Opacity 0–100%, Flip H/V), Pivot Point (3×3 grid or custom 0–1), Fill & Appearance (Solid/Linear Gradient/Radial Gradient/Pattern, gradient angle 0–360°, patterns: Stripes/Dots/Crosshatch/Checkerboard), Outline/Stroke (color, width 0–50px, style: Solid/Dashed/Dotted/Dash-Dot, line cap/join, border radius 0–200px for rectangles), Effects (Shadow with blur 0–100 and offset, Glow size 1–80, Reflection, Bevel size 1–20), Shape-specific (Star points/inner radius, Polygon sides, Doughnut hole size, Pie/Chord/Block Arc angles, advanced arrow body width and head length, plus a reset-to-default action for the current shape).',
        answer: `<h4>Properties Panel</h4>
<p>The <strong>Properties tab</strong> in the right panel displays and edits properties of the selected object.</p>
<h5>Transform Properties</h5>
<ul>
    <li><strong>X / Y</strong> — Position in pixels</li>
    <li><strong>Width / Height</strong> — Size in pixels</li>
    <li><strong>Aspect Lock</strong> — Keeps width and height proportional during resize for most object types</li>
    <li><strong>Z Rotation</strong> — -360° to 360° in the 2D canvas plane</li>
    <li><strong>Stage Angle</strong> — the visible on-stage direction measured as 0–360° where right = 0°, down = 90°, left = 180°, up = 270°</li>
    <li><strong>Stage ±180</strong> — the same visible direction normalized to -180°..180°</li>
    <li><strong>From Down</strong> — the visible direction relative to straight down, useful for limbs because straight down reads as 0°</li>
    <li><strong>Down → 0°</strong> — rotates the selected object so its visible direction points straight down, then bakes that downward pose as the new 0° baseline</li>
    <li><strong>Set 0°</strong> — bakes the object’s current visual orientation into the object and resets the displayed Z rotation to zero, useful for limbs and cutout parts that need a new resting baseline</li>
    <li><strong>Depth</strong> — Adds extrusion on closed shapes so they gain box-like thickness; images and icons use a lighter faux-depth scaling effect. Use the <strong>Handle</strong> button beside Depth to show or hide the on-canvas depth handle when you want direct dragging. It stays in the same layer order unless you reorder it separately</li>
    <li><strong>X Tilt / Y Tilt</strong> — -45° to 45° faux 2.5D tilt for images, icons, rectangles, and rounded rectangles</li>
    <li><strong>Opacity</strong> — 0–100%</li>
    <li><strong>Flip Horizontal / Vertical</strong> — Toggle mirrors</li>
</ul>
<h5>Pivot Point</h5>
<p>Controls center of rotation/scaling. Use the 3×3 grid or set custom X/Y (0–1).</p>
<h5>Fill & Appearance</h5>
<ul>
    <li><strong>Fill Type</strong>: Solid, Linear Gradient, Radial Gradient, Pattern</li>
    <li><strong>Gradient</strong>: Start/end color, angle 0–360°</li>
    <li><strong>Pattern</strong>: Stripes, Dots, Crosshatch, Checkerboard — with color and scale</li>
</ul>
<h5>Outline (Stroke)</h5>
<ul>
    <li><strong>Color</strong>, <strong>Width</strong> (0–50 px), <strong>Style</strong> (Solid, Dashed, Dotted, Dash-Dot)</li>
    <li><strong>Line Cap</strong> (Butt, Round, Square), <strong>Line Join</strong> (Miter, Round, Bevel)</li>
    <li><strong>Border Radius</strong> (0–200 px, rectangles only)</li>
</ul>
<h5>Effects</h5>
<ul>
    <li><strong>Shadow</strong>: Color, Blur (0–100), Offset X/Y (-50 to 50)</li>
    <li><strong>Glow</strong>: Color, Size (1–80)</li>
    <li><strong>Reflection</strong>: Opacity, Gap</li>
    <li><strong>Bevel</strong>: Size (1–20), Highlight/Shadow color</li>
</ul>
<h5>Shape-Specific</h5>
<ul>
    <li><strong>Star</strong>: Point count and inner radius</li>
    <li><strong>Polygon</strong>: Number of sides</li>
    <li><strong>Doughnut</strong>: Hole size</li>
    <li><strong>Pie / Chord / Block Arc</strong>: Start angle and sweep</li>
    <li><strong>Block Arc</strong>: Arc thickness</li>
    <li><strong>Advanced arrow variants</strong>: Body width and head length</li>
    <li><strong>Rectangle</strong>: Border radius</li>
</ul>`
    },

    // ─── Chain Animations ─────────────────────────────────
    {
        keywords: ['chain.*anim', 'morph', 'morph.*shape', 'chain.*sequence', 'morph.*between', 'shape.*morph', 'property.*morph', 'chain.*state', 'chain.*step.*timing', 'separate.*chain', 'merged.*chain'],
        title: 'Chain Animations',
        category: 'animation',
        summary: 'Chain Animations (Animate tab → Advanced → Chain Animation): Morph an object through a sequence of states. Add objects to the chain, configure which properties to morph (shape type, position, size, rotation, opacity, color, scale), set duration per step and easing, choose trigger (On Load, On Click, On Hover, On Scroll). The Output dropdown switches between Merged (default — one consolidated bar containing every step, compact in the Applied Animations list) and Separate (one timeline bar per step on the source object so each step can be dragged and retimed independently).',
        answer: `<h4>Chain Animations</h4>
<p>Chain Animations let you <strong>morph an object through a sequence of states</strong>.</p>
<h5>How to Use</h5>
<ol>
    <li>Open the <strong>Animate tab → Advanced → Chain Animation</strong></li>
    <li>Add objects to the chain sequence</li>
    <li>Configure which properties to morph between:
        <ul>
            <li>Shape type</li>
            <li>Position (x, y)</li>
            <li>Size (width, height)</li>
            <li>Rotation</li>
            <li>Opacity</li>
            <li>Color</li>
            <li>Scale</li>
        </ul>
    </li>
    <li>Set the <strong>duration per step</strong> and <strong>easing</strong></li>
    <li>Choose a <strong>trigger</strong>: On Load, On Click, On Hover, On Scroll</li>
    <li>Pick an <strong>Output</strong> mode:
        <ul>
            <li><em>Merged (single bar)</em> — default. All steps live inside one timeline bar on the source object. Compact and easy to move as a unit.</li>
            <li><em>Separate bars per step</em> — every step becomes its own draggable timeline bar (named "Chain 1/N → Target", "Chain 2/N → Target", …). Use this when you need to fine-tune the timing or duration of each individual morph step after applying.</li>
        </ul>
    </li>
</ol>
<div class="tip-box">💡 Switch to <strong>Separate</strong> if you want to slow down a particular morph step without changing the others — each step becomes a regular animation bar you can drag, resize, or split.</div>`
    },

    // ─── Stage Sequence Builder ───────────────────────────
    {
        keywords: ['stage.*sequence', 'stagger.*entry', 'auto.*stagger', 'sequence.*builder', 'stagger.*animation', 'appear.*order', 'entry.*sequence', 'merged.*sequence', 'separate.*sequence'],
        title: 'Stage Sequence Builder',
        category: 'animation',
        summary: 'Stage Sequence (Animate tab → Advanced → Stage Sequence): Automatically creates staggered entry animations for multiple objects. Select objects in desired appear order, choose entry style (Fade In, Zoom In, Fly In from 4 directions, Bounce In, Spin In, Float from 4 directions), configure delay between (0–10s), duration each (0.1–10s), and easing. The Output dropdown switches between Separate (default — one timeline bar per object so each entry can be retimed independently by dragging) and Merged (all entries share one group name for a cleaner Applied Animations list).',
        answer: `<h4>Stage Sequence Builder</h4>
<p>Stage Sequence automatically creates <strong>staggered entry animations</strong> for multiple objects.</p>
<h5>How to Use</h5>
<ol>
    <li>Open the <strong>Animate tab → Advanced → Stage Sequence</strong></li>
    <li>Select objects in the order you want them to appear</li>
    <li>Choose an <strong>entry style</strong>: Fade In, Zoom In, Fly In (4 directions), Bounce In, Spin In, Float (4 directions)</li>
    <li>Configure parameters:</li>
</ol>
<ul>
    <li><strong>Delay Between</strong>: 0–10 seconds</li>
    <li><strong>Duration Each</strong>: 0.1–10 seconds</li>
    <li><strong>Easing</strong>: Ease Out, Ease In, Ease In-Out, Bounce, Elastic</li>
    <li><strong>Output</strong>:
        <ul>
            <li><em>Separate bars per object</em> (default) — each object gets its own draggable bar in the timeline so you can retime any individual entry after applying.</li>
            <li><em>Merged</em> — entries are still applied to each object (so they all animate) but share a common group name, keeping the Applied Animations list compact.</li>
        </ul>
    </li>
</ul>
<div class="tip-box">💡 Pick <strong>Separate</strong> when you want to fine-tune each object's appearance time after the sequence is applied.</div>`
    },

    // ─── SmartArt ─────────────────────────────────────────
    {
        keywords: ['smart.*art', 'smartart', 'diagram', 'structured.*layout', 'animated.*diagram'],
        title: 'SmartArt',
        category: 'tools',
        summary: 'SmartArt (top toolbar → SmartArt button): Create structured animated diagrams — flowcharts, process diagrams, org charts, timelines, pyramids, Venn diagrams, and more. Supports AI-powered generation from natural language descriptions.',
        answer: `<h4>SmartArt</h4>
<p>Animation Stage includes a <strong>SmartArt</strong> module for creating structured animated diagrams and layouts.</p>
<h5>How to Access</h5>
<ul>
    <li>Click the <strong>SmartArt</strong> button in the top toolbar</li>
    <li>A dedicated SmartArt editor opens</li>
</ul>
<h5>Diagram Types</h5>
<ul>
    <li><strong>Flowchart</strong> — process flows with decision nodes</li>
    <li><strong>Org Chart</strong> — hierarchical organization diagrams</li>
    <li><strong>Process</strong> — step-by-step process diagrams</li>
    <li><strong>Timeline</strong> — chronological event sequences</li>
    <li><strong>Pyramid</strong> — layered pyramid diagrams</li>
    <li><strong>Venn</strong> — overlapping set diagrams</li>
    <li><strong>Cycle</strong> — circular process diagrams</li>
    <li><strong>Matrix</strong> — grid-based category diagrams</li>
</ul>
<h5>AI Generation</h5>
<p>Describe what you want in natural language and the AI generates the diagram structure, layout, and content automatically.</p>
<h5>Features</h5>
<ul>
    <li>Pre-built templates for common diagram types</li>
    <li>Animated transitions between nodes</li>
    <li>Custom colors, fonts, and styles</li>
    <li>Export as part of your animation project</li>
</ul>`
    },

    // ═══════════════════════════════════════════
    //  TIMELINE IMPROVEMENTS
    // ═══════════════════════════════════════════

    {
        keywords: ['timeline.*drag', 'drag.*bar', 'smooth.*drag', 'bar.*drag', 'time.*tooltip', 'drag.*performance', 'timeline.*smooth'],
        title: 'Timeline Drag Improvements',
        category: 'timeline',
        summary: 'Timeline bar dragging uses requestAnimationFrame throttling and element caching for smooth, responsive interaction. CSS transitions are disabled during drag. A time tooltip shows the current position while dragging. Duration drag (right/left edge) correctly handles repeat count — the bar edge tracks your cursor 1:1 even for repeating animations.',
        answer: `<h4>Timeline Drag Improvements</h4>
<h5>Smooth Bar Dragging</h5>
<ul>
    <li><strong>rAF Throttling</strong> — Drag updates use requestAnimationFrame for buttery-smooth movement</li>
    <li><strong>Element Caching</strong> — DOM elements are cached during drag to avoid repeated lookups</li>
    <li><strong>CSS Transition Disable</strong> — Transitions are temporarily disabled during drag to prevent visual lag</li>
    <li><strong>Time Tooltip</strong> — A floating tooltip shows the current time position as you drag bars</li>
</ul>
<h5>Duration Drag with Repeat Count</h5>
<p>When dragging the right or left edge of a bar to change its duration, the system correctly accounts for the animation's <strong>repeat count</strong>. The bar edge tracks your cursor 1:1 — the actual per-cycle duration is scaled by the inverse of the repeat count so the visual bar width always matches what you see.</p>
<div class="tip-box">💡 This means repeating animations (2×, 3×, etc.) can be resized just as intuitively as single-play animations.</div>`
    },

    // ═══════════════════════════════════════════
    //  TRANSPARENT BACKGROUND & EXPORT
    // ═══════════════════════════════════════════

    {
        keywords: ['transparent.*export', 'export.*transparent', 'gif.*transparent', 'transparent.*gif', 'transparent.*background.*export', 'alpha.*export', 'transparent.*video'],
        title: 'Transparent Background Export',
        category: 'export',
        summary: 'All export formats support transparent backgrounds. When stage background is set to "Transparent", the export dialog auto-checks the Transparent Background option. GIF uses 1-bit transparency (alpha < 128 = transparent). MP4/WebM render without background fill. HTML5 omits background. Preview window shows CSS checkerboard as visual indicator.',
        answer: `<h4>Transparent Background Export</h4>
<p>When the stage background is set to <strong>Transparent</strong> in Stage Settings, transparency is automatically propagated to all export formats.</p>
<h5>How It Works</h5>
<ol>
    <li>Set the stage background to <strong>Transparent</strong> in the Tools tab → Stage Settings</li>
    <li>Open the <strong>Export</strong> dialog — the Transparent Background checkbox is auto-checked</li>
    <li>Export in your desired format</li>
</ol>
<h5>Format-Specific Behavior</h5>
<ul>
    <li><strong>GIF</strong> — Uses 1-bit GIF transparency. Pixels with alpha &lt; 128 become fully transparent</li>
    <li><strong>MP4 / WebM</strong> — Canvas is rendered without a background fill</li>
    <li><strong>HTML5</strong> — No background is included in the generated HTML</li>
    <li><strong>SVG</strong> — No background element is drawn</li>
</ul>
<h5>Preview</h5>
<p>The <strong>Preview</strong> window shows a CSS checkerboard pattern behind the canvas as a visual indicator of transparency — the checkerboard is <em>not</em> baked into the exported pixels.</p>
<div class="tip-box">💡 You can also manually toggle the Transparent Background checkbox in the export dialog, regardless of stage settings.</div>`
    },

    {
        keywords: ['submenu', 'context.*menu.*hover', 'menu.*disappear', 'hover.*menu', 'right.*click.*submenu'],
        title: 'Context Menu Submenus',
        category: 'tools',
        summary: 'Context menu submenus (e.g. Animate → Entry/Exit/Emphasis) use a hover bridge system for stable display. The submenu stays open with a 250ms timeout and bidirectional hover detection, preventing accidental disappearance when moving the mouse between the parent menu and its submenu.',
        answer: `<h4>Context Menu Submenus</h4>
<p>Right-click context menus include expandable submenus (e.g., <strong>Animate →</strong> with Entry, Exit, and Emphasis categories).</p>
<h5>Stable Hover Behavior</h5>
<ul>
    <li>A <strong>hover bridge</strong> connects the parent menu item to the submenu, preventing accidental closure</li>
    <li><strong>250ms timeout</strong> before closing — gives you time to move the mouse</li>
    <li><strong>Bidirectional hover detection</strong> — submenu stays open as long as you're hovering either the parent item or the submenu itself</li>
    <li>Submenus are <strong>reused</strong> rather than destroyed and recreated, avoiding flickering</li>
</ul>`
    },

    // ── Rig Presets & Movements ──
    {
        keywords: ['rig.*preset', 'skeleton.*preset', 'preset.*rig', 'human.*rig', 'quadruped.*rig', 'dragon.*rig', 'spider.*rig', 'bird.*rig', 'snake.*rig', 'fish.*rig', 'insect.*rig', 'centaur.*rig', 'mech.*rig'],
        title: 'Rig Presets (Legacy Search)',
        category: 'tools',
        summary: 'The old full-image rig preset workflow is no longer the recommended character path. For characters, use Body Stencil or Smart Cut to cut one image into parts, or use Assembly for already-separated parts. Image Deform remains available for manual single-image warping.',
        answer: `<h4>Rig Presets — Use Joint Assembly Instead</h4>
<p>The old full-image rig preset flow is no longer the recommended way to animate characters.</p>
<ul>
    <li><strong>One full image</strong> — use <strong>Body Stencil</strong> or <strong>Smart Cut</strong> first</li>
    <li><strong>Separated body parts</strong> — use <strong>Assembly</strong> in the Joints section</li>
    <li><strong>Warp-only work</strong> — use <strong>Image Deform</strong> manually on the flat image</li>
</ul>
<div class="tip-box">💡 If you are looking for preset character structure, the main path is <strong>Body Stencil / Smart Cut → Joint Assembly → Movements / Poses</strong>.</div>`
    },

    {
        keywords: ['rig.*movement', 'movement.*rig', 'walk.*cycle', 'run.*cycle', 'idle.*anim', 'rig.*animation', 'speed.*control'],
        title: 'Rig Movements -> Joint Movements',
        category: 'tools',
        summary: 'Character preset movement now belongs to the Joint Assembly workflow. After assembly, use the Joints section Movements button to apply pre-built walk, wave, dance, punch, kick, and other animations. Image Deform is for manual warp animation, not preset character movement.',
        answer: `<h4>Rig Movements — Use Joint Movements</h4>
<p>Preset character movement now belongs to the <strong>Joint Assembly</strong> workflow.</p>
<ol>
    <li>Build the character with <strong>Assembly</strong>, or start from <strong>Body Stencil</strong> / <strong>Smart Cut</strong></li>
    <li>Open the <strong>Joints</strong> section</li>
    <li>Click <strong>Movements</strong> to apply pre-built character animation</li>
</ol>
<div class="tip-box">💡 Use <strong>Image Deform</strong> only when you want to animate mesh warping directly with deform keyframes.</div>`
    },

    {
        keywords: ['pose.*library', 'save.*pose', 'load.*pose', 'blend.*pose', 'rig.*pose'],
        title: 'Character Pose Library',
        category: 'tools',
        summary: 'Use the Joint pose library for assembled characters. Open Poses from the Joints section to save, load, blend, and reuse cutout-character poses. Human Front includes a built-in static pose library with standing, expressive, combat, and locomotion contact poses. Those same Human Front poses also have animated hold versions in the Movements picker.',
        answer: `<h4>Character Pose Library</h4>
<p>Save and recall <strong>static poses</strong> for assembled characters from the <strong>Joints</strong> section.</p>
<ul>
    <li><strong>Built-in Poses</strong> — Human Front includes ready-made poses like Confident, Crossed Arms, Friendly Wave, Boxing Guard, Star Jump, and walk contact poses</li>
    <li><strong>Save Pose</strong> — store the current joint angles with a custom name</li>
    <li><strong>Load Pose</strong> — restore a saved character pose</li>
    <li><strong>Blend Poses</strong> — interpolate between any two compatible poses</li>
    <li><strong>Delete Pose</strong> — remove a saved pose</li>
    <li><strong>Reuse</strong> — apply the same pose across similar assembled characters</li>
</ul>
<p>For timeline animation, use <strong>Movements</strong>. The Human Front built-in poses also appear there as animated <strong>Pose:</strong> entries.</p>
<div class="tip-box">💡 If you are in <strong>Image Deform</strong>, use deform keyframes for one-off warp poses. For reusable character poses, use <strong>Joint Assembly</strong>.</div>`
    },

    {
        keywords: ['mirror.*pose', 'flip.*pose', 'swap.*left.*right', 'copy.*across', 'copy.*opposite', 'copy.*left.*right', 'rig.*mirror'],
        title: 'Mirror and Copy Across Character Pose',
        category: 'tools',
        summary: 'Mirror and Copy Across belong to the Joint Assembly workflow. Mirror swaps left and right joint angles. Copy Across duplicates the selected source-side joints onto the opposite side while keeping the source unchanged.',
        answer: `<h4>Mirror and Copy Across Character Pose</h4>
<p>Use these from the <strong>Joints</strong> section on assembled characters.</p>
<ul>
    <li><strong>Mirror</strong> swaps left and right sides of the whole current pose</li>
    <li><strong>Copy Across</strong> is one-way: select the source joints on one side, then click it to copy a mirrored version onto the opposite side</li>
    <li>Use <strong>Copy Across</strong> when you want to keep the source limb exactly as it is</li>
    <li>The system matches left and right body parts by name</li>
</ul>`
    },

    {
        keywords: ['ragdoll', 'gravity.*drop', 'physics.*drop', 'rig.*ragdoll', 'rig.*physics'],
        title: 'Character Ragdoll',
        category: 'tools',
        summary: 'Ragdoll drop now belongs to the Joint Assembly workflow. Use the Ragdoll button in the Joints section to apply a gravity drop to an assembled character.',
        answer: `<h4>Character Ragdoll</h4>
<p>Simulate physics-based gravity on an assembled character.</p>
<ul>
    <li>Click <strong>Ragdoll</strong> in the <strong>Joints</strong> section</li>
    <li>Gravity pulls the assembled character downward</li>
    <li>Damping gradually slows motion</li>
    <li>Parts bounce and settle while respecting the joint chain</li>
    <li>The root stays anchored as the rest of the chain reacts</li>
</ul>
<div class="tip-box">💡 Great for creating natural falling, collapsing, or ragdoll-style animations.</div>`
    },

    {
        keywords: ['smart.*cut', 'cut.*body.*part', 'trace.*cut', 'edge.*snap', 'auto.*assemble', 'cut.*assemble'],
        title: 'Smart Cut (Trace & Cut Body Parts)',
        category: 'tools',
        summary: 'Smart Cut: Trace around body parts on a single image with edge-snapping, or use Automatic Smart Cut on supported presets to auto-trace the silhouette, seed preset body-part regions, correct them in Training Mode, and then auto-cut and assemble with joints. Saved training examples are reused on future images of the same preset.',
        answer: `<h4>Smart Cut — Trace & Cut Body Parts</h4>
<p>Take a <strong>single image</strong> of a character and cut it into separate body parts that are automatically assembled with joints.</p>
<h5>Step 1 — Choose Character Type</h5>
<p>Select the preset type (Human, Quadruped, Bird, Insect, Robot, Vehicle).</p>
<h5>Step 2 — Trace & Label</h5>
<ol>
    <li>Click to place trace points — the tool <strong>snaps to image edges</strong></li>
    <li>Double-click or click near start to close the path</li>
    <li>Label the region from the dropdown (only unassigned parts shown)</li>
    <li>Click <strong>Confirm</strong> — repeat for each body part</li>
</ol>
<p><strong>Automatic Smart Cut:</strong> On supported presets such as <strong>Human (Front)</strong> and <strong>Human (Side)</strong>, click <strong>Auto Trace Parts</strong> to trace the silhouette and seed all preset regions at once. Click <strong>Train Layout</strong> to enter training mode, where you can drag whole regions, drag points, and add/remove points before cutting. After a successful cut, click <strong>Save Training</strong> so Smart Cut can reuse that approved layout on similar silhouettes later.</p>
<h5>Step 3 — Cut & Assemble</h5>
<p>Click <strong>Cut & Assemble</strong> — each region is clipped at 2× resolution, trimmed, and auto-pinned. Joint contour discs are enabled on the assembled child parts so elbow, knee, wrist, and ankle seams stay cleaner.</p>
<h5>Features</h5>
<ul>
    <li><strong>Edge snapping</strong> — trace points snap to alpha boundaries</li>
    <li><strong>Automatic Smart Cut</strong> — silhouette tracing + preset region seeding on supported presets</li>
    <li><strong>Training Mode</strong> — drag parts and points to correct the seeded cut layout before cutting</li>
    <li><strong>Saved examples</strong> — approved Smart Cut layouts are reused on future auto-trace runs for the same preset</li>
    <li><strong>Colored regions</strong> — each confirmed region gets a unique color overlay</li>
    <li><strong>Region labels</strong> — body part names shown on each region</li>
    <li><strong>Live trace path</strong> — real-time visualization as you click</li>
    <li><strong>Auto-assembly</strong> — correct parent-child joint hierarchy</li>
</ul>
<div class="tip-box">💡 Smart Cut uses alpha edge detection — it works best on images with clear outlines against a transparent or contrasting background.</div>`
    },
    {
        keywords: ['body.*stencil', 'stencil.*body', 'pre.*traced', 'stencil.*cut', 'stencil.*adjust', 'stencil.*drag', 'stencil.*point', 'stencil.*overlap'],
        title: 'Body Stencil (Pre-Traced Character Cutting)',
        category: 'tools',
        summary: 'Body Stencil overlays a pre-traced human body outline on your character image. Adjust the stencil by dragging points, dragging whole parts (click inside), or adding new points (double-click edges). One-click cut produces positioned, pinned body parts. Parts stay where the stencil placed them. Arrow keys nudge pinned parts. Overlap 5-10% at joints for seamless animation. Access via Body Stencil in Image Tools or the Joints section.',
        answer: `<h4>Body Stencil — Pre-Traced Character Cutting</h4>
<p>Overlays a <strong>pre-traced body outline</strong> on your character image so you can cut all body parts at once without manual tracing.</p>
<h5>Workflow</h5>
<ol>
    <li>Select a character image → click <strong>Body Stencil</strong> in the Joints section</li>
    <li>Choose a view: <strong>Human (Front)</strong> (16 parts) or <strong>Human (Side)</strong> (8 parts)</li>
    <li>Adjust the stencil to fit your character</li>
    <li>Click <strong>Capture & Assemble</strong> to cut all parts</li>
</ol>
<h5>Stencil Interactions</h5>
<table>
    <tr><th>Action</th><th>What It Does</th></tr>
    <tr><td><strong>Drag a point</strong></td><td>Move a single control point</td></tr>
    <tr><td><strong>Click inside a part</strong></td><td>Drag the whole part + its children</td></tr>
    <tr><td><strong>Double-click an edge</strong></td><td>Insert a new control point on that edge</td></tr>
    <tr><td><strong>Reset button</strong></td><td>Restore the default stencil layout</td></tr>
</table>
<h5>After Cutting</h5>
<ul>
    <li>Parts stay <strong>exactly where the stencil placed them</strong> — no scattering</li>
    <li>All parts are auto-pinned with correct joint hierarchy</li>
    <li><strong>Arrow keys</strong> nudge selected parts by 1 px (Shift = 10 px)</li>
    <li>Arrow nudge works correctly on pinned parts (adjusts pin offset)</li>
</ul>
<h5>Overlap Best Practice</h5>
<p>Connected parts should <strong>overlap 5–10 %</strong> at their joints. Without overlap, small gaps appear when parts rotate. The parent draws behind the child, so the overlap is hidden.</p>
<h5>Practical Example</h5>
<ol>
    <li>Import a front-facing character PNG</li>
    <li><strong>Body Stencil → Human (Front)</strong></li>
    <li>Click inside the <strong>torso</strong> to drag it into position (children follow)</li>
    <li>Adjust each limb by clicking inside and dragging</li>
    <li>Fine-tune with individual point drags</li>
    <li>Double-click an edge on the <strong>head</strong> part to add detail points</li>
    <li>Verify ~5 % overlap at each joint</li>
    <li><strong>Capture & Assemble</strong> → 16 pinned parts appear in place</li>
    <li>Select a foot → Arrow Up to fine-tune position</li>
</ol>
<div class="tip-box">💡 Fit the <strong>torso first</strong> — moving it repositions all connected limbs automatically, saving you time.</div>`
    },
    {
        keywords: ['color.*palette', 'palette.*dashboard', 'color.*swatch', 'color.*correction.*palette', 'color.*grade', 'palette.*click'],
        title: 'Color Palette Dashboard',
        category: 'tools',
        summary: 'The Color Palette dashboard generates 16 clickable swatches from color correction settings (brightness, contrast, hue, saturation, etc.). Click any swatch to instantly apply that color look to a selected object. Great for exploring color moods and grading scenes quickly without manually adjusting sliders.',
        answer: `<h4>Color Palette Dashboard</h4>
<p>Generates <strong>16 clickable color swatches</strong> derived from the color-correction sliders (brightness, contrast, hue, saturation, sepia, invert, blur, grayscale).</p>
<h5>How It Works</h5>
<ol>
    <li>Select an object on the stage</li>
    <li>Open the <strong>Image Filters</strong> section and expand <strong>Color Correction</strong></li>
    <li>Click <strong>Color Palette</strong> to open the dashboard</li>
    <li>16 swatches appear — each is a unique combination of filter values</li>
    <li><strong>Click any swatch</strong> to apply its color settings to the selected object instantly</li>
</ol>
<h5>Practical Example — Color-Grading a Scene</h5>
<ol>
    <li>Import a background image (e.g., a park scene)</li>
    <li>Select it → open <strong>Color Correction → Color Palette</strong></li>
    <li>Click a warm-toned swatch to give it a sunset mood</li>
    <li>Import a character → select it → open the palette again</li>
    <li>Click the same warm swatch to match the character's color to the scene</li>
    <li>Fine-tune with the individual sliders if needed</li>
</ol>
<h5>Features</h5>
<ul>
    <li>Swatches preview the color result on a sample gradient</li>
    <li>One-click apply — no manual slider adjustment needed</li>
    <li>Each swatch label describes the look (e.g., "Warm Vintage", "Cool Blue")</li>
    <li>Works on any object with image filters support</li>
</ul>
<div class="tip-box">💡 Use the Color Palette to quickly match the color mood across all objects in a scene — click the same swatch on background, characters, and props.</div>`
    },

    // ═══════════════════════════════════════════
    //  CHARACTER CREATION WORKFLOWS
    // ═══════════════════════════════════════════

    // ─── Guided Assembly ─────────────────────────────────
    {
        keywords: ['guided.*assembly', 'guided.*rig', 'guide.*rigging', 'step.*by.*step.*rig', 'wizard.*rig'],
        title: 'Guided Assembly',
        category: 'tools',
        summary: 'Guided Assembly (Properties → Joints → Build & Cut → Guided Assembly): Step-by-step wizard that walks you through rigging separated body parts into a jointed character. Use Assemble Selected Parts instead when you want the faster label-and-animate path for already cut or imported parts, especially partial rigs.',
        answer: `<h4>Guided Assembly</h4>
<p>The <strong>Guided Assembly</strong> wizard walks you through rigging separated body parts into a jointed character, step by step.</p>
<h5>When to Use</h5>
<ul>
    <li>You have <strong>pre-cut body parts</strong> (head, torso, arms, legs) as separate objects on the stage</li>
    <li>You want a <strong>guided workflow</strong> rather than manually placing joints</li>
</ul>
<div class="tip-box">💡 If you already selected cut/imported parts and only need to label them quickly, use <strong>Assemble Selected Parts</strong>. It also works when the body is incomplete, such as head/neck only or upper body only.</div>
<h5>How It Works</h5>
<ol>
    <li>Select all body parts on stage</li>
    <li>Open <strong>Properties → Joints → Build & Cut → Guided Assembly</strong></li>
    <li>The wizard asks you to identify each part (head, torso, etc.)</li>
    <li>It automatically places joints at the correct connection points</li>
    <li>Review and adjust joint positions if needed</li>
    <li>Your character is ready for movements and animation</li>
</ol>
<div class="tip-box">💡 Name your body parts clearly (e.g., "Head", "Torso", "L Upper Arm") for faster auto-detection.</div>`
    },

    // ─── Assemble Selected Parts ─────────────────────────
    {
        keywords: ['assemble.*selected.*parts', 'selected.*parts.*assembly', 'already.*cut.*parts', 'imported.*body.*parts', 'label.*body.*parts', 'partial.*body.*rig', 'partial.*character.*rig', 'head.*neck.*only', 'upper.*body.*only', 'animate.*selected.*parts', 'manual.*body.*assembly'],
        title: 'Assemble Selected Parts',
        category: 'tools',
        summary: 'Assemble Selected Parts labels already cut or imported body-part objects and turns them into an animation-ready rig. Missing parts are allowed, so users can animate partial bodies such as head/neck only, arms plus trunk, or upper body only. Compatible movements are filtered to the body parts that exist.',
        answer: `<h4>Assemble Selected Parts</h4>
<p><strong>Assemble Selected Parts</strong> is the fastest route when your character parts already exist as separate stage objects.</p>
<h5>When to Use</h5>
<ul>
    <li>You already cut parts with Smart Cut, Clone Part, Body Slicer, another editor, or imported separate image pieces</li>
    <li>You only have some body parts, such as <strong>head/neck</strong>, <strong>arms and trunk</strong>, or <strong>upper body</strong></li>
    <li>You want to label selected objects and immediately use compatible movement animations</li>
</ul>
<h5>How It Works</h5>
<ol>
    <li>Select the body-part objects on the stage</li>
    <li>Open <strong>Properties → Joints → Build & Cut → Assemble Selected Parts</strong>, or open Movements when selected parts are not assembled yet</li>
    <li>Match each selected object to a part label, such as Head / Neck, Torso, Left Upper Arm, Right Lower Arm, or Left Upper Leg</li>
    <li>Click <strong>Assemble</strong></li>
    <li>Open <strong>Movements</strong> or <strong>Poses</strong>; the app shows movements that can use the parts you actually provided</li>
</ol>
<div class="tip-box">💡 Missing parts are OK. If only head and neck are assembled, full walk cycles will not appear, but head/neck movements can still be applied.</div>`
    },

    // ─── Universal Character ─────────────────────────────
    {
        keywords: ['universal.*character', 'parametric.*character', 'generate.*character', 'UC.*builder', 'character.*generator', 'pinned.*clothing', 'clothing.*parts', 'headwear', 'hat', 'eye.*color', 'linked.*views'],
        title: 'Universal Character',
        category: 'tools',
        summary: 'Universal Character (Properties → Joints → Build & Cut → Universal Character): Generate a fully rigged parametric character from scratch with customizable body proportions, front/side/back views, human-like head and body styles, facial features, eye color, hair, separate hats/headgear, clothing, and optional linked view sets. Clothing can be painted onto body parts or generated as pinned torso/arm/leg garment components that follow the matching rig parts.',
        answer: `<h4>Universal Character</h4>
<p>The <strong>Universal Character</strong> builder generates a fully rigged parametric character from scratch — no images needed.</p>
<h5>Features</h5>
<ul>
    <li><strong>Body proportions</strong> — adjust height, build, head size, limb length, and more human-like body types including stronger muscular arms and forearms</li>
    <li><strong>Front / Side / Back views</strong> — three canonical views with full animation catalog support</li>
    <li><strong>Facial features</strong> — eyes, eye color, mouth, eyebrows, and expression support</li>
    <li><strong>Hair</strong> — representative hair presets including short, afro, curly, braids, locs/locks, and long styles</li>
    <li><strong>Hats and headgear</strong> — separate from hair so headwear can cover the scalp/top/sides while keeping the forehead visible from the eyebrow down</li>
    <li><strong>Clothing</strong> — top, bottom, footwear, and outfit presets with shoulder/neck coverage and representative long garments</li>
    <li><strong>Clothing Mode</strong> — use <strong>Painted</strong> for built-in body coloring or <strong>Pinned Parts</strong> for separate garment layers pinned to torso, arms, and legs</li>
    <li><strong>Linked views</strong> — generate coordinated front, side, and back-facing variants when the scene needs multiple directions</li>
    <li><strong>Pre-rigged</strong> — comes with joints already placed at correct positions</li>
    <li><strong>Movement-ready</strong> — can immediately use 50+ joint movements (walk, run, wave, etc.)</li>
    <li><strong>Expression support</strong> — use the Expressions picker to change facial expressions</li>
</ul>
<h5>How to Use</h5>
<ol>
    <li>Go to <strong>Properties → Joints → Build & Cut → Universal Character</strong></li>
    <li>Choose front, side, or back view, then configure body type, proportions, and colors in the dialog</li>
    <li>Choose hair and hats/headgear separately when the character needs both hairstyle and head covering control</li>
    <li>Choose <strong>Clothing Mode → Pinned Parts</strong> when you want transparent garment components that move with matching torso, arm, and leg parts</li>
    <li>Click <strong>Generate</strong> to create the character on stage</li>
    <li>Use <strong>Animate & Pose → Movements</strong> to apply walk, idle, or other animations</li>
</ol>
<p><strong>Pinned clothing</strong> creates separate garment objects for body regions such as torso, upper arms, forearms, upper legs, and lower legs. Those pieces are pinned to the matching Universal Character parts so clothing follows character poses and movements without replacing the underlying rig.</p>
<div class="tip-box">💡 You can also say "create a universal character" or "generate character" in AI Mode (Ctrl+M).</div>`
    },

    // ─── Body Slicer ─────────────────────────────────────
    {
        keywords: ['body.*slicer', 'slicer', 'curve.*slic', 'coarse.*cut', 'slice.*character', 'slice.*body'],
        title: 'Body Slicer',
        category: 'tools',
        summary: 'Body Slicer (Properties → Joints → Build & Cut → Body Slicer): Curve-based cutting tool that slices a single character image into body parts (head, torso, arms, legs) using adjustable curve guides. Supports learned layouts that can be saved and reused.',
        answer: `<h4>Body Slicer</h4>
<p>The <strong>Body Slicer</strong> cuts a single character image into body parts using adjustable curve guides.</p>
<h5>When to Use</h5>
<ul>
    <li>You have a <strong>single full-body character image</strong></li>
    <li>You want <strong>coarse, fast cuts</strong> (head, torso, arms, legs)</li>
    <li>You prefer a <strong>visual curve-based</strong> approach over manual tracing</li>
</ul>
<h5>How It Works</h5>
<ol>
    <li>Select the character image on stage</li>
    <li>Open <strong>Properties → Joints → Build & Cut → Body Slicer</strong></li>
    <li>Drag the curve guides to match your character's proportions</li>
    <li>Click <strong>Slice</strong> to cut the image into separate parts</li>
    <li>Parts are automatically assembled with joints</li>
</ol>
<h5>Learned Layouts</h5>
<p>Save a layout after adjusting curves. Next time you use the slicer on a similar character, the saved layout is applied automatically.</p>
<div class="tip-box">💡 Body Slicer is faster than Smart Cut or Body Stencil for quick prototyping. Refine with Tune Joints afterwards.</div>`
    },

    // ─── IK (Inverse Kinematics) ─────────────────────────
    {
        keywords: ['inverse.*kinematic', 'IK', 'ik.*solv', 'ccd.*solver', 'shift.*drag.*joint', 'ik.*chain'],
        title: 'Inverse Kinematics (IK)',
        category: 'tools',
        summary: 'IK / Inverse Kinematics: Hold Shift + drag a body part to automatically solve the entire joint chain. Uses a CCD (Cyclic Coordinate Descent) solver to compute natural-looking joint angles from the drag target position.',
        answer: `<h4>Inverse Kinematics (IK)</h4>
<p><strong>IK</strong> lets you drag the end of a joint chain (e.g., a hand or foot) and all joints in the chain adjust automatically for a natural pose.</p>
<h5>How to Use</h5>
<ol>
    <li>Select an assembled character with joints</li>
    <li>Hold <strong>Shift</strong> and <strong>drag a body part</strong> (e.g., a hand)</li>
    <li>The entire arm chain (shoulder → elbow → wrist) adjusts automatically</li>
    <li>Release to set the pose</li>
</ol>
<h5>Technical Details</h5>
<ul>
    <li>Uses <strong>CCD (Cyclic Coordinate Descent)</strong> algorithm</li>
    <li>Respects joint angle constraints/limits</li>
    <li>Works with any joint chain length</li>
    <li>Can be combined with manual joint rotation for fine-tuning</li>
</ul>
<div class="tip-box">💡 IK is great for quickly posing characters — drag hands to the hips for an arms-akimbo pose, or drag feet for walking positions.</div>`
    },

    // ─── Joint Contours ──────────────────────────────────
    {
        keywords: ['contour', 'joint.*contour', 'contour.*disc', 'bridge.*segment', 'contour.*fill', 'contour.*size'],
        title: 'Joint Contours',
        category: 'tools',
        summary: 'Joint Contours: Rounded discs drawn at joint pivot points to bridge bone segments, hiding gaps between body parts. Configure size, rotation, fill mode (solid, pattern, gradient, picture), and colors.',
        answer: `<h4>Joint Contours</h4>
<p><strong>Joint Contours</strong> are rounded discs drawn at each joint pivot point to bridge the gap between connected body segments.</p>
<h5>Enabling Contours</h5>
<ol>
    <li>Select the jointed object</li>
    <li>In <strong>Properties → Joints → Joint Editing</strong>, check <strong>Joint Contours</strong></li>
    <li>Expand the contour options to customize</li>
</ol>
<h5>Options</h5>
<ul>
    <li><strong>Size</strong> — multiplier for the contour disc radius</li>
    <li><strong>Rotation</strong> — rotate the disc independently</li>
    <li><strong>Fill Mode</strong> — Auto, Solid, Pattern, Linear Gradient, Radial Gradient, or Picture</li>
    <li><strong>Base Color</strong> — fill color for solid mode</li>
    <li><strong>Pattern</strong> — stripes, dots, crosshatch, or checkerboard with accent color and scale</li>
    <li><strong>Gradient</strong> — start/end colors with angle control</li>
    <li><strong>Picture</strong> — uses the selected image part when available</li>
</ul>
<div class="tip-box">💡 Contours are especially useful with Body Stencil and Smart Cut characters where joint seams might be visible.</div>`
    },

    // ─── Depth & Tilt ────────────────────────────────────
    {
        keywords: ['depth', 'extrusion', '3d.*effect', 'tilt', 'tilt.*x', 'tilt.*y', 'perspective', 'pseudo.*3d'],
        title: 'Depth & Tilt',
        category: 'tools',
        summary: 'Depth creates a pseudo-3D extrusion effect behind the object. Tilt X and Tilt Y apply perspective transforms. All three can be animated via the timeline, custom animation builder, or recording.',
        answer: `<h4>Depth & Tilt</h4>
<h5>Depth (Extrusion)</h5>
<p>The <strong>Depth</strong> property creates a pseudo-3D extrusion effect behind the object.</p>
<ul>
    <li>Find it in <strong>Properties → Transform → Depth</strong></li>
    <li>Drag the depth handle or type a value (0–200)</li>
    <li>The depth direction follows the object's rotation</li>
    <li>Animate depth via timeline recording or Custom Animation Builder</li>
</ul>
<h5>Tilt X & Tilt Y</h5>
<p><strong>Tilt X</strong> and <strong>Tilt Y</strong> apply CSS perspective transforms to simulate 3D rotation.</p>
<ul>
    <li>Tilt X — rotates around the horizontal axis (lean forward/backward)</li>
    <li>Tilt Y — rotates around the vertical axis (turn left/right)</li>
    <li>Range: -90° to 90°</li>
    <li>Combine with Depth for convincing 3D card-flip or book-page effects</li>
</ul>
<div class="tip-box">💡 Use Tilt Sway X/Y animations (Combo tab) for gentle rocking motion. Record tilt changes in the timeline for custom 3D animations.</div>`
    },

    // ─── AI Character Creation ───────────────────────────
    {
        keywords: ['ai.*character', 'ai.*create.*character', 'ai.*animate.*character', 'prompt.*character', 'ai.*rig', 'create.*walking.*character', 'create.*dancing'],
        title: 'AI Character Creation',
        category: 'ai',
        summary: 'AI Mode can create and animate characters via natural language prompts. Say "create a walking character" to build a shape-based human with walk animation, or "open body stencil" to launch cutting tools. AI Mode also supports template assembly, joint movements, poses, expressions, and all rigging operations.',
        answer: `<h4>AI Character Creation</h4>
<p>Use <strong>AI Mode (Ctrl+M)</strong> to create and animate characters with natural language prompts.</p>
<h5>Create Characters</h5>
<ul>
    <li><strong>"build a human"</strong> — creates a shape-based character from basic shapes or saved templates</li>
    <li><strong>"create a walking character"</strong> — builds a character AND applies walk movement</li>
    <li><strong>"create a dancing person"</strong> — builds + applies dance movement</li>
    <li><strong>"generate a universal character"</strong> — opens the Universal Character builder</li>
</ul>
<h5>Cutting & Rigging Tools</h5>
<ul>
    <li><strong>"open body stencil"</strong> — overlay a human outline on your image to cut parts</li>
    <li><strong>"open body slicer"</strong> — curve-based body cutting tool</li>
    <li><strong>"open smart cut"</strong> — trace & cut body parts</li>
    <li><strong>"assemble selected parts"</strong> — label already cut/imported parts and make a partial or full rig</li>
    <li><strong>"open guided assembly"</strong> — step-by-step joint setup wizard</li>
</ul>
<h5>Animation & Pose Commands</h5>
<ul>
    <li><strong>"show movements"</strong> — opens the 50+ joint movement picker</li>
    <li><strong>"show poses"</strong> — opens the pose library</li>
    <li><strong>"open expressions"</strong> — facial expression picker</li>
    <li><strong>"mirror pose"</strong> / <strong>"copy across"</strong> — adjust poses</li>
    <li><strong>"toggle skeleton"</strong> / <strong>"toggle arcs"</strong> — visualization</li>
    <li><strong>"ragdoll"</strong> / <strong>"randomize pose"</strong> / <strong>"reset pose"</strong></li>
</ul>
<h5>Full Workflow Example</h5>
<ol>
    <li>Press <strong>Ctrl+M</strong> to open AI Mode</li>
    <li>Type <strong>"create a walking character"</strong></li>
    <li>Click <strong>Apply</strong> — a shape character appears and the walk movement picker opens</li>
    <li>Or: Import an image, then type <strong>"open body stencil"</strong> to cut it into parts</li>
    <li>Then type <strong>"show movements"</strong> to apply walk, run, or idle animations</li>
</ol>
<div class="tip-box">💡 Use "build a human" for quick shape characters, import real artwork and use "open body stencil/slicer/smart cut" for one full image, or use "assemble selected parts" when the pieces are already separated.</div>`
    },

    // ─── Panel Docking ───────────────────────────────────
    {
        keywords: ['dock', 'panel.*dock', 'floating.*panel', 'undock', 'auto.*dock', 'right.*panel.*dock', 'movement.*panel.*drag', 'panel.*hidden.*menu', 'draggable.*panel'],
        aliases: ['panel docking', 'dock panel', 'undock'],
        title: 'Panel Docking',
        category: 'tools',
        summary: 'Teach Me and many setup panels can dock into the right panel or undock into floating windows. Movement implementation panels such as Movements, Pose Library, Contact Targets, and Assemble Selected Parts open as draggable floating panels by default so they stay visible while editing the stage. Floating panels are clamped below the top toolbar.',
        answer: `<h4>Panel Docking</h4>
<p>Panels can either dock into the right panel or float over the stage, depending on the workflow.</p>
<h5>How It Works</h5>
<ul>
    <li><strong>Teach Me</strong> and many setup panels can dock into the right panel</li>
    <li><strong>Movements</strong>, <strong>Pose Library</strong>, <strong>Contact Targets</strong>, and <strong>Assemble Selected Parts</strong> open as floating panels by default so they do not disappear inside the side panel while you work</li>
    <li>Drag a floating panel by its header to move it</li>
    <li>Floating panels stay below the top toolbar and are clamped inside the visible workspace</li>
    <li>Click the <strong>↗ undock button</strong> where available to pop a docked panel out as a floating window</li>
    <li>The dock area auto-hides when no panels are docked</li>
</ul>`
    },

    {
        keywords: ['animated gif', 'import gif', 'gif import', 'import.*gif', 'gif.*frame'],
        aliases: ['import animated gif', 'gif import'],
        title: 'Import Animated GIF',
        category: 'objects',
        summary: 'Import Animated GIF loads a GIF as a multi-frame animated asset in the app. The toolbar and Tools panel expose the GIF import action so users can bring looping motion assets straight onto the stage.',
        answer: `<h4>Import Animated GIF</h4>
<ol>
    <li>Click <strong>Import Animated GIF</strong> from the toolbar or Tools panel.</li>
    <li>Choose a GIF file from your computer.</li>
    <li>The GIF is added to the stage as an animated asset you can move, resize, and include in scenes.</li>
    <li>Preview or export as normal after placing it.</li>
</ol>
<div class="tip-box">💡 Use animated GIF import when you want ready-made looped motion without rebuilding it frame by frame inside the editor.</div>`
    },

    {
        keywords: ['face rig', 'facial rig', 'face rig workflow', 'how to use face rig', 'auto fit face', 'apply library face rig', 'record face expression', 'record talk', 'face landmarks', 'face rig tutorial'],
        aliases: ['face rig workflow', 'how do i rig a face', 'how do i animate facial expressions'],
        title: 'Face Rig Workflow (Practical)',
        category: 'characters',
        summary: 'Face Rig (Properties -> Image Tools -> Face Rig) is the practical path for one-face expression animation: Auto Fit landmarks, apply or assign face parts, preview expression/talk, then record to timeline. Use Replace Style when intentionally regenerating generated library parts on an already-rigged face.',
        answer: `<h4>Face Rig Workflow (Practical)</h4>
<ol>
    <li>Select a face image, then open <strong>Face Rig</strong>.</li>
    <li>Click <strong>Auto Fit</strong> to place landmarks and regions.</li>
    <li>Choose a style preset and click <strong>Apply Library</strong>.</li>
    <li>Run <strong>Check Parts</strong> to confirm mouth, eyes, and brows are ready.</li>
    <li>Use <strong>Preview Expression</strong> or <strong>Preview Talk</strong> to test motion.</li>
    <li>Click <strong>Record Expression</strong> or <strong>Record Talk</strong> to write to timeline.</li>
</ol>
<p><strong>Important:</strong> when the face is already rigged, library apply is duplicate-safe. Use <strong>Replace Style</strong> only when you intentionally want to regenerate generated face parts.</p>
<div class="tip-box">💡 Start in <strong>Simple</strong> mode for first setup, then switch to <strong>Core</strong> or <strong>Expert</strong> for tuning, QA, and repair tools.</div>`
    },

    {
        keywords: ['face rig mode', 'simple core expert', 'face rig duplicate', 'replace style', 'face rig qa', 'runtime qa face rig'],
        aliases: ['face rig simple core expert', 'face rig duplicate fix', 'face rig replace style'],
        title: 'Face Rig Modes, Replace Style, and QA',
        category: 'characters',
        summary: 'Simple mode is guided setup, Core mode is everyday production controls, Expert mode adds repair/QA/pivot tools. Apply Library is duplicate-safe on already-rigged faces; Replace Style is the explicit regenerate path. Use Export QA/Runtime QA before final delivery.',
        answer: `<h4>Face Rig Modes and Safe Regeneration</h4>
<ol>
    <li><strong>Simple</strong>: fastest guided flow (fit, apply, preview, record).</li>
    <li><strong>Core</strong>: adds regular production controls for part management and tuning.</li>
    <li><strong>Expert</strong>: adds advanced repair, pivot, and QA controls.</li>
</ol>
<p><strong>Apply Library</strong> should be your default style action. It updates settings safely on a rigged face. Use <strong>Replace Style</strong> when you explicitly want fresh generated parts.</p>
<ol>
    <li>Run <strong>Check Parts</strong> during setup.</li>
    <li>Run <strong>Export QA</strong> before export.</li>
    <li>Run <strong>Runtime QA</strong> when validating preview/export pipeline behavior.</li>
</ol>
<div class="tip-box">💡 If roles are flipped, use assignment review tools like <strong>Swap L/R</strong> before recording.</div>`
    },

    {
        keywords: ['capture stage', 'stage capture', 'snapshot stage', 'camera.*stage', 'capture.*canvas'],
        aliases: ['capture stage'],
        title: 'Capture Stage',
        category: 'stage',
        summary: 'Capture Stage creates a quick captured image of the current stage view for reference, previews, or reusable still snapshots without going through the full export flow.',
        answer: `<h4>Capture Stage</h4>
<ol>
    <li>Click <strong>Capture Stage</strong> in the top toolbar.</li>
    <li>The app captures the current stage view as a quick image snapshot.</li>
    <li>Use it when you need a fast still reference without opening the full export workflow.</li>
</ol>
<div class="tip-box">💡 Capture Stage is best for quick still grabs. Use <strong>Export</strong> when you need full animation output.</div>`
    },

    {
        keywords: ['onion skin', 'onion skinning', 'ghost frames', 'in-between frames', 'show previous frames', 'show next frames', 'inbetweening'],
        aliases: ['onion skin', 'ghost frames'],
        title: 'Onion Skin',
        category: 'animation',
        summary: 'Onion Skin shows ghost frames from before and after the current playhead as semi-transparent overlays so you can see the path of motion. Toggle with the clone icon in the timeline toolbar or press O.',
        answer: `<h4>Onion Skin — Ghost Frames</h4>
<ol>
    <li>Click the <i class="fas fa-clone"></i> clone icon in the timeline toolbar (or press <kbd>O</kbd>) to toggle.</li>
    <li>Pink / red ghosts = past frames. Blue ghosts = future frames. Ghosts fade with distance from the current time.</li>
    <li><strong>Right-click</strong> the toolbar button (or <kbd>Shift</kbd>+click) to open the settings popover: frames before / after (0–8 each), step in milliseconds, max opacity, and color tint on/off.</li>
    <li>Onion skin is auto-disabled during playback — pause the timeline to see the ghosts.</li>
</ol>
<div class="tip-box">💡 Pair onion skin with the Dope Sheet for serious frame-by-frame in-betweening. The ghosts are computed by seeking the animation engine to each offset time and rendering the pose to a low-opacity overlay.</div>`
    },

    {
        keywords: ['demo tour', 'tour', 'welcome demo', 'onboarding', 'first run demo'],
        aliases: ['demo tour'],
        title: 'Demo Tour',
        category: 'help',
        summary: 'Demo Tour opens the guided onboarding walkthrough for the app, showing new users the main workspace, tools, and common workflows step by step.',
        answer: `<h4>Demo Tour</h4>
<ol>
    <li>Click <strong>Demo Tour</strong> in the toolbar.</li>
    <li>The guided onboarding walkthrough opens and highlights the main workspace areas.</li>
    <li>Use it when you want a fast orientation to the stage, panels, timeline, and primary tools.</li>
</ol>
<div class="tip-box">💡 Demo Tour is the quickest introduction for first-time users before diving into Templates, SmartArt, AI Mode, or character workflows.</div>`
    },

    {
        keywords: ['dope sheet', 'dopesheet', 'keyframe grid', 'cross-object timeline', 'all keyframes view', 'open dope sheet'],
        aliases: ['dope sheet view'],
        title: 'Dope Sheet',
        category: 'animation',
        summary: 'The Dope Sheet is a full-screen grid of every animation in the scene with one row per (object, animation, property). Click diamonds to seek, drag to retime, Delete to remove.',
        answer: `<h4>Dope Sheet — Cross-Object Keyframe Grid</h4>
<ol>
    <li>Click the <i class="fas fa-table"></i> <strong>table</strong> icon in the timeline toolbar (or open App Search and type "dope sheet").</li>
    <li>Each row shows one animated property. Diamond colors: <strong style="color:#34d399">green</strong> = start, <strong style="color:#60a5fa">blue</strong> = end, <strong style="color:#facc15">yellow</strong> = intermediate keyframe.</li>
    <li><strong>Click</strong> any diamond to seek to that time. <strong>Drag</strong> a green/blue endpoint to retime, drag a yellow keyframe to move it.</li>
    <li><kbd>Delete</kbd> removes the selected keyframe. <kbd>Esc</kbd> closes the sheet.</li>
</ol>
<div class="tip-box">💡 Best for orchestrating long, multi-object scenes. All edits go through Undo / Redo and live-refresh on timeline changes.</div>`
    },

    {
        keywords: ['custom bezier easing', 'cubic bezier per animation', 'custom easing curve', 'easing handles', 'per-animation easing'],
        aliases: ['custom curve', 'bezier curve easing'],
        title: 'Custom Bezier Easing',
        category: 'animation',
        summary: 'Each animation can store its own custom cubic-bezier timing curve. Choose Custom in the easing dropdown and drag the two handles in the Easing Editor to design any curve.',
        answer: `<h4>Custom Bezier Easing (per-animation)</h4>
<ol>
    <li>On any animation bar, change the easing dropdown to <strong>Custom</strong>.</li>
    <li>The Easing Editor opens with two draggable handles. Drag them to draw the curve you want.</li>
    <li>Click <strong>Apply</strong>. The curve is stored on that animation only as a <code>cubic-bezier(x1, y1, x2, y2)</code> string.</li>
    <li>Different animations can have different custom curves. Curves persist through Save / Load, Undo / Redo, and HTML5 / video / Lottie export.</li>
</ol>
<div class="tip-box">💡 Reopening the editor on any animation reseeds the handles from that animation's stored values, so you can keep tweaking.</div>`
    },

    {
        keywords: ['symbols', 'reusable components', 'symbol library', 'master and instance', 'flash symbols', 'convert to symbol', 'edit master', 'symbols panel'],
        aliases: ['component library', 'reusable component'],
        title: 'Symbols (Reusable Components)',
        category: 'objects',
        summary: 'Symbols are reusable component instances. Edit one master and every instance on stage updates automatically. Open the library with the shapes icon in the timeline toolbar.',
        answer: `<h4>Symbols — Reusable Components</h4>
<ol>
    <li>Open the Symbols panel: click the <i class="fas fa-shapes"></i> shapes icon in the timeline toolbar.</li>
    <li>Select objects on the stage, then click <strong>Convert Selection to Symbol</strong> and name it. The originals are replaced with one linked instance.</li>
    <li><strong>Place</strong> <i class="fas fa-plus"></i> drops more instances. Each instance can be moved, animated, grouped, layered, copied/pasted independently.</li>
    <li><strong>Edit master</strong> <i class="fas fa-pen"></i> swaps the stage to the symbol contents (purple banner appears). Make changes, click <strong>Save</strong>, and every instance refreshes on the next frame.</li>
    <li><strong>Delete</strong> <i class="fas fa-trash"></i> removes the symbol AND every instance (with confirmation).</li>
</ol>
<div class="tip-box">💡 Symbols are perfect for repeating UI badges, icons, characters, or callouts you want to update in one place across the whole project.</div>`
    },

    {
        keywords: ['lottie export', 'bodymovin', 'lottie json', 'export to lottie', 'lottie web', 'react native animation export', 'after effects bodymovin'],
        aliases: ['lottie', 'bodymovin export'],
        title: 'Lottie / Bodymovin Export',
        category: 'export',
        summary: 'Export the animation as a Lottie JSON file ready for lottie-web, lottie-react-native, Flutter, or After Effects bodymovin import. Each object becomes an image layer with animated transform keyframes.',
        answer: `<h4>Lottie / Bodymovin Export</h4>
<ol>
    <li>Open the Export dialog and pick the <i class="fas fa-bezier-curve"></i> <strong>Lottie</strong> tile.</li>
    <li>Set the FPS (used for the Lottie composition <code>fr</code>).</li>
    <li>Click Export — saves <code>&lt;project&gt;.json</code>.</li>
</ol>
<p><strong>How it works:</strong> each visible stage object is rendered to a base64-embedded PNG and added as a Lottie image layer (<code>ty:2</code>) with animated transform keyframes — position, rotation, scale, opacity. Named easings and custom <code>cubic-bezier</code> curves convert to Lottie bezier handles.</p>
<div class="tip-box">💡 Image-layer Lottie trades file size for fidelity — every object type (rounded rect, brace, joint armature, traced path, gradient, shadow, glow, text, image) exports pixel-perfect with no per-type reimplementation.</div>`
    }
];

// The manual and Tutorial Hub share the same maintained workflow instructions.
if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-feature-guides]').forEach(container => {
        for (const entry of TEACH_ME_KNOWLEDGE.filter(item => item.guideId)) {
            const section = document.createElement('section');
            section.id = `guide-${entry.guideId}`;
            section.innerHTML = entry.answer;
            container.append(section);
        }
    });
});
