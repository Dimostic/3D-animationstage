#!/usr/bin/python3
import os
import fcntl
from pathlib import Path
import sys
base = Path('/srv/animationstage3d')
lock = (base / '.deployment.lock').open('a')
fcntl.flock(lock, fcntl.LOCK_EX)
if len(sys.argv) != 1:
    sys.exit('No arguments accepted')
current, previous = (base / name for name in ['current', 'previous'])
if not current.is_symlink() or not previous.is_symlink():
    sys.exit('Two releases are required for rollback')
old, target = current.resolve(), previous.resolve()
for candidate in [old, target]:
    if candidate.parent != base / 'releases' or not (candidate / 'manifest.json').is_file():
        sys.exit('Invalid release target')
for name, destination in [('current', target), ('previous', old)]:
    link = base / (name + '.next')
    link.unlink(missing_ok=True)
    link.symlink_to(destination)
    os.replace(link, base / name)
print('Active release: ' + target.name)
