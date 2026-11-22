# Animation Stage 3D

Private staging is at https://preview.3d.animationstage.com/; use
`npm.cmd run deploy:preview` for explicitly requested preview milestone releases.
Production deployments remain separate. See [staging operations](docs/staging.md).

The native 3D overhaul foundation is available at
http://127.0.0.1:8783/assets/studio3d/index.html (after build/start), or through
**3D Studio → Open Native 3D Workspace** in the existing editor. It provides a
shared 3D world, hierarchy, transform tools, objects, models, camera/lighting,
keyframes, portable `.stage3d` saving and quality settings. Speech/contact/video
migration remains in progress; the existing editor stays available. See
[implementation and migration gates](docs/native-3d-workspace.md).

Open Animation Stage 3D.code-workspace, or this folder alone. This is an independent local studio, not a branch or worktree of Animation Stage 2D.

    npm ci
    npm run build
    npm start

Open http://127.0.0.1:8783 and select **3D Studio** in the top bar. The panel offers **Add 3D Character**, **Edit Selected Character** and **Open Teacher & Colleague Example**. Opening the example replaces the project after confirmation; save your work first. Use the File menu to open or save .animstage projects. Import speech audio locally; hosted TTS, login and cloud storage are not configured. Browser autosaves on another site/port do not transfer automatically. Use a copy of an exported project for migration.

The shared editor shell still contains legacy menus and supporting JavaScript. This is a compatibility starting point, not a finished 3D-only user interface. The 2D character artwork catalogues and the production PHP backend are not installed here.

Character development uses the [teacher-and-colleague reference scene](examples/teacher-colleague/README.md) and [capability audit / adapted brief](docs/character-development.md). **Edit Selected Character** includes a bone-attached document under **Held prop**, **Chair contact** for placed characters, and **Gaze target** for camera, document or another scene character. Chairs have fixed floor position, facing, height, seat alignment and sole correction. Look/Release gaze actions blend the chosen target on the timeline. General furniture/cloth collisions remain incomplete; see [chair contact](docs/chair-contact.md), [gaze targets](docs/gaze-targets.md) and the [pilot rig contract](docs/3d-rig-contract.md).

Use **Go > Open 2D Studio** to open https://animationstage.com/ in another tab.
Use **File > Studio Exchange / Send to 2D** to review every scene and download
a separate `.animstage` handoff copy plus a compatibility report. Load the copy
in the destination studio. Files from 2D or an unidentified studio are reviewed
before opening; accepting opens a copy without retaining a writable source-file
handle. Unsupported object types and unknown 3D presets are blocked before the
current project changes. The exchange does not convert 3D characters to 2D.

Configuration lives in `js/studio-config.js`. Hosted speech, AI proxy, feedback,
credits and billing are disabled. The built-in command engine, uploaded audio,
local lip sync and manual/imported captions remain available. See
[the exchange and shared-service design](docs/studio-integration.md) and
[production preparation](docs/production-setup.md) for the remaining integration.
On Windows PowerShell, use `npm.cmd` if execution policy blocks `npm.ps1`.

    npm test
    node scripts/smoke/realistic-3d-library.mjs --dist --encode
    npm run reference -- js/activity-kits.js

Build output is dist/. The local server serves only editor assets plus the preview shell and known 3D asset aliases. The dedicated private beta is hosted at https://3d.animationstage.com/ on VPS 2.25.19.84. It uses its own access password, not a 2D login.

`npm run deploy` builds, tests, packages and uploads only to the dedicated 3D VPS using the `stage3d` account and `~/.ssh/animationstage3d_ed25519`. It verifies checksums, activates an immutable release, runs live acceptance tests and rolls back on failure. Live tests retrieve the beta password over the dedicated root SSH connection into memory. HTTPS, private access, daily local backups, health checks and rollback are configured; see [operations and access instructions](docs/production-setup.md). The dedicated source repository is https://github.com/Dimostic/3D-animationstage.git. Off-server backups of VPS configuration and secrets are still to be configured. Leave the original 2D site and existing mixed projects intact.
