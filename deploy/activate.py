#!/usr/bin/python3
"""Root-owned, narrowly scoped release activation; invoked by stage3d via sudo."""
import hashlib
import fcntl
import json
import os
from pathlib import Path
import re
import sys
import tarfile
import subprocess
import stat

BASE = Path('/srv/animationstage3d')
lock = (BASE / '.deployment.lock').open('a')
fcntl.flock(lock, fcntl.LOCK_EX)
if len(sys.argv) != 2 or not re.fullmatch(r'[0-9]{8}T[0-9]{6}Z(?:-[a-z0-9]+)?', sys.argv[1]):
    sys.exit('Usage: animationstage3d-activate YYYYMMDDTHHMMSSZ[-label]')
release = sys.argv[1]
archive = BASE / 'incoming' / (release + '.tar.gz')
target = BASE / 'releases' / release
if target.exists() or archive.is_symlink() or not archive.is_file():
    sys.exit('Release exists or archive is missing/invalid')
# Read archive bytes before validating, preventing a change between validation and extraction.
import io
with os.fdopen(os.open(archive, os.O_RDONLY | os.O_NOFOLLOW), 'rb') as source:
    if not stat.S_ISREG(os.fstat(source.fileno()).st_mode):
        sys.exit('Archive must be a regular file')
    content = source.read(512 * 1024 * 1024 + 1)
if len(content) > 512 * 1024 * 1024:
    sys.exit('Archive too large')
with tarfile.open(fileobj=io.BytesIO(content), mode='r:gz') as tar:
    members = []
    names = set()
    total = 0
    for member in tar:
        if len(members) >= 10000:
            sys.exit('Too many archive entries')
        members.append(member)
        name = member.name
        if name in names or not re.fullmatch(r'(?:dist|server)(?:/[A-Za-z0-9_./ -]*)?|manifest.json', name) or '..' in Path(name).parts or not (member.isfile() or member.isdir()):
            sys.exit('Unsafe archive entry: ' + repr(name))
        names.add(name)
        total += member.size
        if total > 1024 * 1024 * 1024 or (name == 'manifest.json' and member.size > 2 * 1024 * 1024):
            sys.exit('Expanded release or manifest too large')
    manifest = json.load(tar.extractfile('manifest.json'))
    files = {m.name for m in members if m.isfile() and m.name != 'manifest.json'}
    if files != set(manifest['files']):
        sys.exit('Manifest file list mismatch')
    required = {'dist/index.html', 'dist/js/vendor/realistic-3d/renderer.js', 'dist/assets/realistic-3d/amaka.glb', 'dist/assets/realistic-3d/tunde.glb', 'server/index.php', 'server/asset.php', 'server/preview.php'}
    if not required <= files:
        sys.exit('Release incomplete')
    for name, digest in manifest['files'].items():
        if hashlib.sha256(tar.extractfile(name).read()).hexdigest() != digest:
            sys.exit('Release checksum mismatch')
    target.mkdir(mode=0o755)
    for member in members:
        destination = target / member.name
        if member.isdir():
            destination.mkdir(parents=True, exist_ok=True)
        else:
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(tar.extractfile(member).read())
            destination.chmod(0o644)
for php_file in (target / 'server').glob('*.php'):
    subprocess.run(['/usr/bin/php', '-l', str(php_file)], check=True)
current = BASE / 'current'
old = current.resolve() if current.is_symlink() else None
if old:
    previous = BASE / 'previous.next'
    previous.unlink(missing_ok=True)
    previous.symlink_to(old)
    os.replace(previous, BASE / 'previous')
link = BASE / 'current.next'
link.unlink(missing_ok=True)
link.symlink_to(target)
os.replace(link, current)
print(json.dumps({'release': release, 'archiveSha256': hashlib.sha256(content).hexdigest(), 'files': len(manifest['files']), 'previous': str(old) if old else None}))
