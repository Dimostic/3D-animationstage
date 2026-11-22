import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
process.chdir(fileURLToPath(new URL('../', import.meta.url)));
const release = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '') + 'Z';
const key = process.env.STUDIO3D_SSH_KEY || path.join(os.homedir(), '.ssh', 'animationstage3d_ed25519');
const run = (exe, args) => execFileSync(exe, args, { stdio: 'inherit' });
const node = args => run(process.execPath, args);
if (process.argv.length !== 2) throw Error('Usage: npm run deploy (dedicated 3D VPS only; no target overrides)');
if (!fs.existsSync(key)) throw Error('Dedicated 3D SSH key missing');
node(['scripts/build-studio.mjs']);
node(['scripts/smoke/realistic-3d-face.mjs', '--dist']);
node(['scripts/smoke/realistic-3d-library.mjs', '--dist']);
node(['scripts/package-vps.mjs', release]);
const archive = path.resolve('tmp', release + '.tar.gz');
const digest = crypto.createHash('sha256').update(fs.readFileSync(archive)).digest('hex');
run('scp', ['-i', key, archive, `stage3d@2.25.19.84:/srv/animationstage3d/incoming/${release}.tar.gz`]);
const remoteDigest = execFileSync('ssh', ['-o', 'BatchMode=yes', '-i', key, 'stage3d@2.25.19.84', `sha256sum /srv/animationstage3d/incoming/${release}.tar.gz`], { encoding: 'utf8' }).split(/\s/)[0];
if (remoteDigest !== digest) throw Error('Uploaded archive checksum mismatch; release not activated');
run('ssh', ['-o', 'BatchMode=yes', '-i', key, 'stage3d@2.25.19.84', `sudo -n /usr/local/sbin/animationstage3d-activate ${release}`]);
try { node(['scripts/smoke/vps.mjs']); }
catch (error) {
    run('ssh', ['-o', 'BatchMode=yes', '-i', key, 'stage3d@2.25.19.84', 'sudo -n /usr/local/sbin/animationstage3d-rollback']);
    throw new Error('Hosted acceptance failed; previous release restored.', { cause: error });
}
console.log(`Deployed private release ${release} to https://3d.animationstage.com/`);
