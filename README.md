# Animation Stage 3D

Open Animation Stage 3D.code-workspace, or this folder alone. This is an independent local studio, not a branch or worktree of Animation Stage 2D.

    npm ci
    npm run build
    npm start

Open http://127.0.0.1:8783 and select **3D Studio** in the top bar. Use the File menu to open or save .animstage projects. Import speech audio locally; hosted TTS, login and cloud storage are not configured. Browser autosaves on another site/port do not transfer automatically. Use a copy of an exported project for migration.

The shared editor shell still contains legacy menus and supporting JavaScript. This is a compatibility starting point, not a finished 3D-only user interface. The 2D character artwork catalogues and the production PHP backend are not installed here.

    npm test
    node scripts/smoke/realistic-3d-library.mjs --dist --encode
    npm run reference -- js/activity-kits.js

Build output is dist/. The local server serves only editor assets plus the preview shell and known 3D asset aliases. npm run deploy deliberately exits without connecting anywhere.

Before the public beta, connect an empty private 3D repository, set up dedicated credentials on the new VPS, configure HTTPS and access control, test backups and rollback, then configure DNS. Leave the original 2D site and existing mixed projects intact.
