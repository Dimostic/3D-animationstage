# Animation Stage 3D

Unqualified requests in this workspace concern Animation Stage 3D only. Change and test this repository, not the sibling 2D project. Do not deploy, commit, or push to the 2D target.

Develop locally by default. Deploy only when the user explicitly requests deployment; earlier VPS setup and deployment authorization do not authorize publishing each new change.

Private staging is preview.3d.animationstage.com, with its own stage3d-preview deployment account and release/configuration directories on the dedicated 3D VPS. Use npm run deploy:preview for an authorized staging release. Never promote to production automatically; see docs/staging.md.

Product direction: a standalone, approachable and interactive 3D modelling/scene/animation editor, with a foundation for later VR and optional simple games. Keep common tasks easy, use direct manipulation and plain labels, and reveal advanced controls progressively. Put general functionality in the main workspace and contextual inspector rather than overloading character menus. Preserve metre-based scenes, portable assets and separation of editor UI from the runtime. See docs/native-3d-workspace.md for product principles, modelling scope and staged migration gates. Do not describe planned VR, physics, game logic or advanced mesh editing as implemented.

Read README.md for commands and docs/2d-handover.md before porting a 2D idea. Use npm run reference for pinned upstream source; do not import a sibling path into the running app, install a junction, or synchronise changes automatically. Document intentional ports with source commit, relevant modules and new 3D regression coverage.

The production hostname is 3d.animationstage.com on the dedicated VPS 2.25.19.84, commissioned with user authorization. Use only the dedicated animationstage3d_ed25519 key and stage3d deployment account; see docs/production-setup.md. The dedicated Git origin is https://github.com/Dimostic/3D-animationstage.git. Do not borrow the 2D .env, storage, authentication cookies, deployment scripts or SSH configuration. Do not enable public hosting of the development server.
