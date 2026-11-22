# Private 3D staging

Preview: https://preview.3d.animationstage.com/

Native workspace:
https://preview.3d.animationstage.com/assets/studio3d/index.html

Production remains https://3d.animationstage.com/. Both hosts use the dedicated
3D VPS, 2.25.19.84. They use one source repository and independent deployments.
No changes to Animation Stage 2D are involved.

## Workflow

Continue development locally. When the user requests a hosted milestone test:

    npm.cmd run deploy:preview

This builds, runs the existing and native regression checks, creates a manifest
with source commit/dirty state and checksums, uploads to the preview deployment
account, activates a preview-only immutable release and runs authenticated live
checks. A failed acceptance rolls back preview to its preceding release when
one exists. The production release pointer is checked before/after a successful
preview deployment. There is no automatic promotion or scheduled deployment.

Use preview for hosted acceptance/review, not for the user's only copy of a
project. Browser project storage is origin-specific: local, preview and production
do not share autosaves. Save/export a project file to move work between them.

The same tested archive can be promoted on an explicit production request;
promotion should verify the immutable preview release and its checksums, rather
than rebuild local changes. `npm.cmd run deploy` still builds a new production
release; it is not an archive-promotion shortcut. Production publication remains
a separate, explicitly authorized operation.

## Isolation and access

Preview initially uses the existing dedicated 3D username (`studio3d`) and password
for convenience, copied to separate preview login files. Passwords stay in
root-only configuration files, never in this repository. The Basic Auth realm
identifies staging. A separately generated asset-signing key means signed
capabilities from either host cannot authorize assets on the other host.

| Component | Preview |
| --- | --- |
| Deployment user | `stage3d-preview` |
| PHP worker user | `stage3d-preview-web` |
| Releases/current/incoming | `/srv/animationstage3d-preview/` |
| Configuration | `/etc/animationstage3d-preview/` |
| PHP pool/socket | `stage3d-preview` / `/run/php/php8.4-fpm-stage3d-preview.sock` |
| Future server storage | `/srv/animationstage3d-preview/storage/` (no upload/storage API enabled) |
| PHP temporary files | `/var/lib/animationstage3d-preview/tmp/` |
| Backups | `/var/backups/animationstage3d-preview/` |

The dedicated 3D SSH key is authorized for the preview deployment account. Its
sudo allowlist contains only the preview activate/rollback helpers. Preview PHP
has its own OS identity, environment and open_basedir, with no permission to read
production's signing key. Server wrappers read `STUDIO3D_CONFIG_DIR` from the
trusted PHP pool environment; production's default path remains unchanged.

The host requires private login, redirects HTTP to HTTPS, uses a separate
Let's Encrypt certificate and sends `X-Robots-Tag: noindex, nofollow`. The existing
certificate renewal timer and nginx reload hook cover this certificate too.

## Operations

Root-only commands:

    /usr/local/sbin/animationstage3d-preview-healthcheck
    /usr/local/sbin/animationstage3d-preview-backup

Health checks run every five minutes. Preview backups run daily at 03:00 UTC
(04:00 Africa/Lagos). Backups are on this VPS; off-server backup remains a
separate operations task. Preview has its own activate/rollback helpers and
deployment lock. Retained archives include the exact packaged build, PHP wrappers
and manifest. Configuration, certificate and job definitions are backed up
separately with root-only access.

Infrastructure sources are under `deploy/preview/`. Commissioning requires the
dedicated VPS root identity and validates its hostname and production baseline.
It preserves production's active release and nginx virtual host. Templates are
uploaded as LF files under `/tmp/stage3d-preview-setup/`; commission.sh installs
the preview account, pool, vhost, certificate, helpers and inactive monitoring
timers. Enable the preview timers after the first release passes acceptance.

Verification uses `STUDIO3D_TARGET=preview` with `scripts/smoke/vps.mjs`. Only the
two fixed 3D hosts are accepted, and the deployment script sets the target
explicitly. Live checks include private access, production/staging capability
separation, legacy/editor playback, speech/captions/save/export and the native
world workspace. Production remains untouched by preview feature deployments.
