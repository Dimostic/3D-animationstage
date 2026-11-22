#!/bin/bash
set -euo pipefail
umask 077
release=$(readlink -f /srv/animationstage3d/current)
case "$release" in /srv/animationstage3d/releases/*) ;; *) exit 1 ;; esac
test -f "$release/manifest.json"
stamp=$(date -u +%Y%m%dT%H%M%SZ)
tar -czf "/var/backups/animationstage3d/$stamp-release.tar.gz" -C "$release" dist server manifest.json
tar -czf "/var/backups/animationstage3d/$stamp-config.tar.gz" /etc/animationstage3d /etc/nginx/sites-available/animationstage3d /etc/php/8.4/fpm/pool.d/stage3d.conf /etc/sudoers.d/animationstage3d /etc/systemd/system/animationstage3d-*.service /etc/systemd/system/animationstage3d-*.timer /usr/local/sbin/animationstage3d-* /etc/letsencrypt
printf '3D release and configuration backup completed: %s\n' "$stamp"
