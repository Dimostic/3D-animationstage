#!/usr/bin/python3
"""Non-mutating negative tests for the privileged release importer."""
import io
import json
from pathlib import Path
import subprocess
import tarfile
from datetime import datetime, timezone

base = Path('/srv/animationstage3d')
original = (base / 'current').resolve()
prefix = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
for index, kind in enumerate(['traversal', 'symlink', 'checksum']):
    release = prefix + '-reject' + str(index)
    archive = base / 'incoming' / (release + '.tar.gz')
    assert not archive.exists()
    with tarfile.open(archive, 'w:gz') as output:
        if kind == 'traversal':
            member = tarfile.TarInfo('dist/../../escape-test'); member.size = 1
            output.addfile(member, io.BytesIO(b'x'))
        elif kind == 'symlink':
            member = tarfile.TarInfo('dist/link'); member.type = tarfile.SYMTYPE; member.linkname = '/etc/passwd'
            output.addfile(member)
        else:
            manifest = json.loads((original / 'manifest.json').read_text())
            names = ['manifest.json'] + list(manifest['files'])
            for name in names:
                data = (original / name).read_bytes()
                if name == 'dist/asset-version.txt': data += b'checksum-test'
                member = tarfile.TarInfo(name); member.size = len(data)
                output.addfile(member, io.BytesIO(data))
    result = subprocess.run(['/usr/local/sbin/animationstage3d-activate', release], capture_output=True, text=True)
    assert result.returncode != 0, kind + ' was accepted'
    assert (base / 'current').resolve() == original
    assert not (base / 'releases' / release).exists()
    archive.unlink()
    print('PASS release importer rejects ' + kind + ' without modifying live state')
