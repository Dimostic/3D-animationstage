#!/bin/bash
set -euo pipefail
systemctl is-active --quiet nginx php8.4-fpm
test -f /srv/animationstage3d-preview/current/manifest.json
test -S /run/php/php8.4-fpm-stage3d-preview.sock
for path in / /assets/studio3d/index.html; do
    curl --fail --silent --show-error --max-time 20 --netrc-file /etc/animationstage3d-preview/health.netrc --resolve preview.3d.animationstage.com:443:127.0.0.1 "https://preview.3d.animationstage.com$path" --output /dev/null
done
echo 'Private 3D staging HTTPS health check passed'
