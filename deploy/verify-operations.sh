#!/bin/bash
set -euo pipefail
test "$(id -u)" = 0
original=$(readlink -f /srv/animationstage3d/current)
old_previous=$(readlink -f /srv/animationstage3d/previous)
backup=''
for candidate in /var/backups/animationstage3d/*-release.tar.gz; do backup=$candidate; done
test -f "$backup"
restoreid="$(date -u +%Y%m%dT%H%M%SZ)-restorecheck"
install -m 600 -o stage3d -g stage3d "$backup" "/srv/animationstage3d/incoming/$restoreid.tar.gz"
/usr/local/sbin/animationstage3d-activate "$restoreid"
cmp "$original/manifest.json" /srv/animationstage3d/current/manifest.json
/usr/local/sbin/animationstage3d-rollback
test "$(readlink -f /srv/animationstage3d/current)" = "$original"
ln -sfn "$old_previous" /srv/animationstage3d/previous
echo 'PASS backup restored into a verified release and rollback restored the original release'
install -m 750 /tmp/stage3d-healthcheck.sh /usr/local/sbin/animationstage3d-healthcheck
umask 077
{ printf 'machine 3d.animationstage.com login studio3d password '; cat /etc/animationstage3d/private-beta-password; } > /etc/animationstage3d/health.netrc
printf '%s\n' '[Unit]' 'Description=Private Animation Stage 3D HTTPS health check' '[Service]' 'Type=oneshot' 'ExecStart=/usr/local/sbin/animationstage3d-healthcheck' > /etc/systemd/system/animationstage3d-healthcheck.service
printf '%s\n' '[Unit]' 'Description=Check private 3D HTTPS every five minutes' '[Timer]' 'OnBootSec=2min' 'OnUnitActiveSec=5min' '[Install]' 'WantedBy=timers.target' > /etc/systemd/system/animationstage3d-healthcheck.timer
systemctl daemon-reload
systemctl enable --now animationstage3d-healthcheck.timer
/usr/local/sbin/animationstage3d-healthcheck
if [[ "${1:-}" != '--skip-renewal' ]]; then certbot renew --dry-run --non-interactive; fi
