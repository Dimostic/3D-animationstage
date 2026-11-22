# Dedicated 3D production preparation

Commissioned 2026-11-22 with user authorization: `https://3d.animationstage.com/`
on dedicated VPS `2.25.19.84` (`srv2187126`, Debian 13). DNS, HTTPS and private
access are configured. No Git remote is configured.
Do not use the 2D deployment scripts, `.env`, SSH configuration, cookies or storage.

## Access and operations

- Beta username: `studio3d`. The randomly generated beta password is stored only
  on the VPS at `/etc/animationstage3d/private-beta-password`, readable by root.
  It is separate from the root password. Retrieve it in your own SSH window with
  `cat /etc/animationstage3d/private-beta-password`; do not commit it or paste it
  into logs or project files.
- Dedicated SSH key: `~/.ssh/animationstage3d_ed25519`. `root` is available for
  administration and secret retrieval. Routine release uploads use `stage3d`.
  That account may sudo only the root-owned activation and rollback helpers.
- Deployment: `npm run deploy` (`npm.cmd run deploy` in Windows PowerShell).
  `STUDIO3D_SSH_KEY` may select the dedicated key path; host/account targets are
  fixed to the 3D VPS. This does not publish to Sites or to the 2D server.
- Releases: `/srv/animationstage3d/releases/<UTC-ID>`, root-owned. `current` and
  `previous` are atomic release pointers. Incoming archives are checksum verified,
  checked for unsafe paths/links and PHP syntax, then activated.
- Rollback: log in as `stage3d` and run
  `sudo /usr/local/sbin/animationstage3d-rollback`. This swaps current/previous.
- Nginx serves only built files, with a dedicated PHP 8.4 FPM pool supplying
  nonce-protected editor HTML, the sandboxed preview shell and signed assets.
  The development server is not running publicly. Firewall allows TCP 22/80/443.
- HTTPS renewal contact: `dimielens@gmail.com`. Certbot's timer renews the
  certificate; a deploy hook reloads Nginx. A renewal dry run is part of commissioning.
- Daily root-only backups run at 02:30 UTC (03:30 Africa/Lagos) into
  `/var/backups/animationstage3d/`. Release snapshots and configuration/secrets are
  separate archives. These are local VPS backups; copy them to encrypted off-server
  storage separately. No server-side user projects exist yet; projects remain in
  the user's browser/exported files.
- Health checks run every five minutes through
  `animationstage3d-healthcheck.timer`; failures are recorded in journald. No
  external alert delivery is configured. Nginx has dedicated access/error logs;
  asset capability URLs are omitted from access logs.

Use `systemctl status nginx php8.4-fpm`, `systemctl list-timers`, and
`journalctl -u animationstage3d-healthcheck.service` for routine checks.
`deploy/provision.sh` is a first-install procedure and refuses a commissioned
server. `deploy/commission.sh` installs host configuration; ordinary releases do
not replace it. Secrets and certificates are generated on the VPS and never
packaged with the application.

## Preview access

The editor, ordinary static assets and preview shell require the beta password.
Opaque-origin sandboxed players cannot use that browser authentication directly.
The authenticated editor therefore issues a signed 24-hour capability restricted
to the bundled renderer, Amaka and Tunde. The asset endpoint rejects missing,
forged, expired and non-allowlisted requests. It grants no editor, account,
filesystem or project access. Exported HTML uses these temporary links; reload
and re-export after expiry. Saved `.animstage` files contain no beta credentials
or asset tickets, and MP4 exports are independent of these links.

The beta password is not shared login. Hosted AI, generated speech, cloud storage
and billing remain off pending their dedicated services.

## Commissioning verification, 2026-11-22

- Initial verified release: `20261122T141201Z`, 218 packaged files.
- Uploaded archive SHA-256:
  `01a0b1b4efd772d29a921ffea548330e398291f817668373d987f2c12b5a8657`.
- `npm.cmd test` passed; the complete `npm.cmd run deploy` workflow then passed
  its build, face/library smoke checks, checksum validation, PHP lint, activation
  and live browser acceptance.
- Hosted acceptance verified rejected unauthenticated requests, forged tickets,
  nonce policy, both rigs, sandboxed popup playback, uploaded synthetic audio,
  lip sync, linked captions, save/reopen and MP4 video/audio tracks. Optional
  external Google fonts were excluded from browser acceptance to avoid a
  third-party network delay.
- Release importer rejection tests passed for traversal paths, symbolic links
  and corrupt checksums without changing live state.
- Final backup at `20261122T141724Z` was restored into a separate release using
  the hardened importer, compared to the original manifest, and rolled back.
  The original previous-release pointer was preserved.
- Certbot renewal dry run passed. Certificate renewal, daily backup and
  five-minute private health-check timers are active. Only Nginx handles public
  HTTP/HTTPS; no development server is exposed.
- Test artifacts are local under `tmp/hosted-3d-*`; they contain synthetic scene
  data, not user projects. Beta credentials and SSH private keys are not packaged.

## Release validation

From this checkout:

```sh
npm ci
npm test
node scripts/smoke/realistic-3d-library.mjs --dist --encode
node scripts/smoke/vps.mjs
```

On Windows, use `npm.cmd`. Browser test images and encoded test videos are under
`tmp/`; they are local evidence, not production content. `dist/` contains editor
assets only. The existing development server binds to loopback and must remain
private. It is not the public production server.

## Infrastructure requirements and commissioning checklist

1. Create an empty private 3D source repository and dedicated deployment identity.
2. Provision the selected VPS with a dedicated release directory and service
   account. Expose only built editor assets; deny source, Git, environment files,
   authoring inputs and project storage. Keep private beta access control in
   front of the editor and its asset/preview endpoints.
3. Configure HTTPS for the 3D hostname and test access control before changing
   public DNS. Use dedicated credentials and certificates appropriate to this host.
4. Implement the following production routes explicitly. A static upload alone
   does not implement the preview APIs expected by the editor.

| Route | Production requirement |
| --- | --- |
| `/` | Built `dist/index.html`, with a production security policy compatible with its script loader |
| `/js/`, `/css/`, `/assets/` | Built files with correct MIME types, version-aware caching and no directory listing |
| `/api/realistic-3d-asset.php?file=renderer` | Allowlisted renderer from `dist/js/vendor/realistic-3d/renderer.js` |
| Same route, `file=amaka` or `file=tunde` | Corresponding GLB from `dist/assets/realistic-3d/`; reject every other file value |
| `/api/preview-shell.php` | Preview shell and policy from `scripts/fixtures/preview-shell.html` and `preview-policy.json`, packaged explicitly for production |
| Other `/api/` routes | Explicit unavailable response until dedicated service adapters exist |

Preview policy and asset access must support the sandboxed player. Retain the
allowlisted asset behavior used by the local server; never accept arbitrary
filesystem paths from query parameters. Test popup playback, HTML playback and
MP4 export against the actual production origin and security headers. Do not
blindly copy a nonce-requiring fixture policy onto static HTML without supplying
matching nonces to every script.

5. Use immutable release directories and an atomic current-release switch.
   Record the source revision, dependency lockfile and validation results.
6. Test backup restoration and rollback to the previous release. When cloud
   projects are introduced, back up project revisions and owned assets separately
   and test restoring both together.
7. Add dedicated uptime/error monitoring without sending project contents or
   credentials. Configure logging only once its destination exists.
8. After private-origin validation succeeds, configure DNS and perform a private
   beta acceptance pass. Leave the original 2D deployment and mixed projects intact.

## Acceptance before enabling shared services

- Confirm the API and identity choices in `studio-integration.md` with the 2D owner.
- Verify isolation between two users, expired sessions, denied origins, upload
  limits, schema validation, revision conflicts and deleted/missing assets.
- Verify a real 2D export in 3D and a 3D handoff in deployed 2D, including audio,
  captions, save/reopen and exported playback. Record known unsupported features.
- Enable hosted features individually through explicit adapters. The current
  `hostedServices` flag is an off switch, not a substitute for backend provisioning.
