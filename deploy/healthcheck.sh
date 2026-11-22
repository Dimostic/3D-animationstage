#!/bin/bash
set -euo pipefail
systemctl is-active --quiet nginx php8.4-fpm
test -f /srv/animationstage3d/current/dist/index.html
test -f /srv/animationstage3d/current/manifest.json
curl --fail --silent --show-error --max-time 20 --netrc-file /etc/animationstage3d/health.netrc --resolve 3d.animationstage.com:443:127.0.0.1 https://3d.animationstage.com/ --output /dev/null
echo 'Private 3D HTTPS health check passed'
