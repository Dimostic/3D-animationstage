import {releaseGit} from './release-git.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
process.chdir(fileURLToPath(new URL('../', import.meta.url)));
const release = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '') + 'Z';
const key = process.env.STUDIO3D_SSH_KEY || path.join(os.homedir(), '.ssh', 'animationstage3d_ed25519');
const preview = process.argv[2] === '--preview';
const target = preview ? {user:'stage3d-preview', directory:'/srv/animationstage3d-preview', helper:'animationstage3d-preview', host:'preview.3d.animationstage.com'}
    : {user:'stage3d', directory:'/srv/animationstage3d', helper:'animationstage3d', host:'3d.animationstage.com'};
const run = (exe, args) => execFileSync(exe, args, { stdio: 'inherit' });
const node = args => execFileSync(process.execPath, args, {stdio:'inherit',env:{...process.env,STUDIO3D_TARGET:preview?'preview':'production'}});
if (process.argv.length !== (preview ? 3 : 2)) throw Error('Usage: npm run deploy or npm run deploy:preview (dedicated 3D VPS only)');
if (!fs.existsSync(key)) throw Error('Dedicated 3D SSH key missing');
const source=releaseGit({cwd:process.cwd()});source.preflight();const testedSource=source.snapshot();
node(['scripts/smoke/release-git.mjs']);
node(['scripts/build-studio.mjs']);
node(['scripts/smoke/realistic-3d-face.mjs', '--dist']);
node(['scripts/smoke/realistic-3d-library.mjs', '--dist']);
node(['scripts/smoke/gaze-discovery.mjs', '--verify']);
// Isolate codec checks from the long-lived editor regression browser.
// Both processes must pass before packaging or touching the VPS.
node(['scripts/smoke/native3d.mjs', '--skip-movie']);
node(['scripts/smoke/native3d.mjs', '--movie-only']);
const sourceCommit=source.publish(testedSource,{message:'Save validated 3D '+(preview?'preview':'production')+' release '+release});
console.log('PASS source committed and pushed: '+sourceCommit);
node(['scripts/package-vps.mjs', release]);
source.assertPublished(sourceCommit);
const manifest=JSON.parse(fs.readFileSync(path.join('tmp','vps-package',release,'manifest.json'),'utf8'));
if(manifest.sourceDirty||manifest.sourceCommit!==sourceCommit)throw Error('Release manifest does not match clean pushed source');
const archive = path.resolve('tmp', release + '.tar.gz');
const digest = crypto.createHash('sha256').update(fs.readFileSync(archive)).digest('hex');
const connection=target.user+'@2.25.19.84';
const productionBefore=preview?execFileSync('ssh',['-o','BatchMode=yes','-i',key,connection,'readlink /srv/animationstage3d/current'],{encoding:'utf8'}).trim():null;
run('scp', ['-i', key, archive, `${connection}:${target.directory}/incoming/${release}.tar.gz`]);
const remoteDigest = execFileSync('ssh', ['-o', 'BatchMode=yes', '-i', key, connection, `sha256sum ${target.directory}/incoming/${release}.tar.gz`], { encoding: 'utf8' }).split(/\s/)[0];
if (remoteDigest !== digest) throw Error('Uploaded archive checksum mismatch; release not activated');
run('ssh', ['-o', 'BatchMode=yes', '-i', key, connection, `sudo -n /usr/local/sbin/${target.helper}-activate ${release}`]);
try { node(['scripts/smoke/vps.mjs']); }
catch (error) {
    run('ssh', ['-o', 'BatchMode=yes', '-i', key, connection, `sudo -n /usr/local/sbin/${target.helper}-rollback`]);
    throw new Error('Hosted acceptance failed; previous release restored.', { cause: error });
}
if(preview){const after=execFileSync('ssh',['-o','BatchMode=yes','-i',key,connection,'readlink /srv/animationstage3d/current'],{encoding:'utf8'}).trim();if(after!==productionBefore)throw Error('Production release changed during preview deployment');console.log('PASS production release unchanged');}
console.log(`Deployed private release ${release} to https://${target.host}/`);
