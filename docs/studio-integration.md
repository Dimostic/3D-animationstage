# Connecting Animation Stage 2D and 3D

## Implemented local exchange

2D destination: `https://animationstage.com/`. 3D production destination:
`https://3d.animationstage.com/` (dedicated password-protected private beta).
`js/studio-config.js` owns the 3D destination configuration and disabled service
flag. No 2D session, storage, credentials or filesystem paths are used at runtime.

File > Studio Exchange serializes a snapshot, reviews all scenes and symbol
definitions, and downloads a separate `-handoff.animstage` file. Downloading does
not change the current save target. Open the downloaded file in 2D using its
existing File > Load command. The 2D application has not been changed; a reciprocal
link and equivalent compatibility review must be implemented there separately.

New 3D saves include additive metadata:

```json
{"format":"animstage","version":"1.0.0","producer":{"studio":"3d","version":"0.1.0","exchangeVersion":1}}
```

Existing project fields are unchanged. Missing producer metadata identifies a
legacy or unknown source; it does not prove a file was authored in 2D. An unknown
project version produces a warning; a newer exchange version, unsupported object
type or unknown 3D preset blocks import before live state changes. Supported
imports with warnings require an explicit Open a copy action. Cancellation
preserves the current project. Imported copies discard the source file handle;
Save prompts for a destination or downloads a new file.

The report checks external/temporary media references, unbundled 2D artwork,
missing images, audio flags, missing audio/caption character links, and 3D model
dependencies. It does not fetch links, embed remote artwork, convert characters,
or certify arbitrary animation types or identical rendering. Embed artwork and
audio in the source studio when possible. Browser autosaves stay on their origin.
HTML playback still requires the exporting studio's renderer and GLB assets.
On the private beta, exported HTML uses renderer/model links that expire after
24 hours. Reload the studio and export again to renew those links. MP4 and saved
project files do not depend on those temporary links. The beta access password
is independent of 2D accounts and does not implement shared sign-in.

## Compatibility evidence

Reference baseline: 2D release `20261122c`, commit
`6db5dfe504c7397764a8e7eed09b48a9d6aa7fcd`, reviewed using
`npm run reference -- js/export.js`. Its serializer uses `animstage` version
`1.0.0`, scenes, objects, audio, symbols and timeline data. The reference helper
uses a command-scoped Git ownership exception for the selected repository; it
does not change global Git configuration or read uncommitted files.

This work adds a 3D exchange layer; it does not port a new 2D animation feature.
Relevant modules: `js/studio-exchange.js`, `js/studio-config.js`, `js/export.js`.
Regression coverage: `scripts/smoke/studio-exchange.mjs`, called by the existing
3D library smoke suite. Synthetic fixtures cover mixed scenes, embedded image and
WAV data, captions, animation timing, hidden-scene presets, symbol objects,
future exchange versions, cancel, detached source handles and handoff downloads.
Existing 3D tests cover routes, speech/captions, playback and MP4 encoding.

| Transfer | Coverage | Remaining validation |
| --- | --- | --- |
| Legacy 2D-shaped JSON into 3D | Synthetic multi-scene fixture | Real exported 2D projects and visual comparison |
| 3D / mixed projects in 3D | Local save/reopen and playback checks | User project sampling |
| 3D handoff download | Metadata, contents and independent save target | Open in current deployed 2D and verify all features |
| Missing/unsupported dependencies | Review and blocking checks | Resolve each source project's references |

Do not advertise lossless round trips until a real project has been opened,
played, saved and reopened in both current applications. Keep original exports.

## Shared-service contract proposed for implementation

Keep the editors independently deployed. Add a versioned project API only after
the 2D owner agrees on its schema and authentication. Proposed resources:

| Resource | Required behavior |
| --- | --- |
| `GET /v1/capabilities` | Exchange versions, supported presets/actions, upload limits and available services |
| `GET /v1/projects` | Only projects the authenticated user can access |
| `POST /v1/projects` | Create a project copy with source studio and schema metadata |
| `GET /v1/projects/{id}` | Authorized project snapshot with revision/ETag and asset manifest |
| `PUT /v1/projects/{id}` | Require `If-Match`; return 409/412 on concurrent edits rather than overwrite |
| Asset upload/download | Authorized, size/type-limited immutable assets referenced by IDs/checksums |

Use a dedicated 3D client with authorization code + PKCE and narrowly scoped
project access. Keep tokens out of project JSON and URLs. Do not share or widen
2D authentication cookies to make this work. The chosen identity service must
issue a dedicated audience for the project API. Every API operation must enforce
ownership; browser origin checks alone are insufficient.

Maintain a versioned asset manifest: asset ID, media type, checksum, size and
storage ownership. Preserve original snapshots and revisions. A handoff should
create a copy by default and report unsupported capabilities before editing.
Configure only the exact 2D and 3D HTTPS origins for CORS and validate all imports
server-side. Secrets, storage access and provider calls belong on the dedicated
backend, never in this static configuration or exported project.

Hosted services remain off until these endpoints and their dedicated credentials
exist. Setting a flag does not implement authentication, storage, billing, speech
generation or the API. Provider adapters and authorization tests are still needed.
