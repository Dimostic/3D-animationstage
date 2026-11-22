import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
const release = process.argv[2];
if (!/^\d{8}T\d{6}Z(?:-[a-z0-9]+)?$/.test(release || '')) throw Error('Supply a UTC release ID: YYYYMMDDTHHMMSSZ[-label]');
const destination = path.resolve('tmp', 'vps-package', release);
fs.mkdirSync(destination, { recursive: true });
for (const [source, target] of [['dist', 'dist'], ['deploy/server', 'server']]) fs.cpSync(source, path.join(destination, target), { recursive: true });
for (const file of ['stage-policy.json', 'preview-policy.json', 'preview-shell.html']) fs.copyFileSync(path.join('scripts/fixtures', file), path.join(destination, 'server', file));
const files = {};
function scan(directory) {
    for (const entry of fs.readdirSync(path.join(destination, directory), { withFileTypes: true })) {
        const name = directory + '/' + entry.name;
        if (entry.isDirectory()) scan(name);
        else if (entry.isFile()) files[name] = crypto.createHash('sha256').update(fs.readFileSync(path.join(destination, name))).digest('hex');
        else throw Error('Links are not permitted in releases');
    }
}
scan('dist'); scan('server');
const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const sourceDirty = !!execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim();
fs.writeFileSync(path.join(destination, 'manifest.json'), JSON.stringify({ release, sourceCommit, sourceDirty, builtAt: new Date().toISOString(), files }, null, 2));
const archive = path.resolve('tmp', release + '.tar.gz');
execFileSync('tar', ['-czf', archive, 'dist', 'server', 'manifest.json'], { cwd: destination });
console.log(JSON.stringify({ release, archive, files: Object.keys(files).length, sha256: crypto.createHash('sha256').update(fs.readFileSync(archive)).digest('hex') }));
