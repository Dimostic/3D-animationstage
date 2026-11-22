import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const commit = '6db5dfe504c7397764a8e7eed09b48a9d6aa7fcd';
const repo = process.env.STAGE2D_REFERENCE || fileURLToPath(new URL('../../animation stage copy 2/', import.meta.url));
const [file, ...extra] = process.argv.slice(2);
if (!file || extra.length || !/^(js|css|docs|scripts\/smoke)\/(?:[\w-]+\/)*[\w.-]+\.(?:m?js|css|md)$/.test(file)) {
    console.error('Usage: npm run reference -- js/activity-kits.js (one source, document, or smoke test)');
    process.exit(2);
}
try {
    // Read a blob from the pinned commit, never the 2D working tree or its .env.
    execFileSync('git',['--no-optional-locks','-C',repo,'cat-file','blob',commit+':'+file],{stdio:'inherit'});
} catch { process.exitCode=1; }
