#!/bin/bash
set -euo pipefail
umask 077
release=$(readlink -f /srv/animationstage3d-preview/current)
case "$release" in /srv/animationstage3d-preview/releases/*) ;; *) exit 1 ;; esac
test -f "$release/manifest.json"
stamp=$(date -u +%Y%m%dT%H%M%SZ)
tar -czf "/var/backups/animationstage3d-preview/$stamp-release.tar.gz" -C "$release" dist server manifest.json
tar -czf "/var/backups/animationstage3d-preview/$stamp-config.tar.gz" /etc/animationstage3d-preview /etc/nginx/sites-available/animationstage3d-preview /etc/php/8.4/fpm/pool.d/stage3d-preview.conf /etc/sudoers.d/animationstage3d-preview /etc/systemd/system/animationstage3d-preview-* /usr/local/sbin/animationstage3d-preview-* /etc/letsencrypt/live/preview.3d.animationstage.com /etc/letsencrypt/archive/preview.3d.animationstage.com /etc/letsencrypt/renewal/preview.3d.animationstage.com.conf
echo "Preview release and configuration backup completed: $stamp"
