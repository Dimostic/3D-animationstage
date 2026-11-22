#!/bin/bash
set -euo pipefail
test "$(id -u)" = 0
test "$(hostname)" = srv2187126
test -f /srv/animationstage3d/current/manifest.json
for file in /srv/animationstage3d/current/server/*.php; do php -l "$file"; done
install -m 755 /tmp/stage3d-rollback.py /usr/local/sbin/animationstage3d-rollback
install -m 750 /tmp/stage3d-backup.sh /usr/local/sbin/animationstage3d-backup
printf '%s\n' 'stage3d ALL=(root) NOPASSWD: /usr/local/sbin/animationstage3d-activate *, /usr/local/sbin/animationstage3d-rollback ""' > /etc/sudoers.d/animationstage3d
chmod 440 /etc/sudoers.d/animationstage3d
visudo -cf /etc/sudoers.d/animationstage3d
install -m 644 /tmp/stage3d-nginx.conf /etc/nginx/sites-available/animationstage3d
install -m 644 /tmp/stage3d-php-pool.conf /etc/php/8.4/fpm/pool.d/stage3d.conf
php-fpm8.4 -t
nginx -t
printf '%s\n' '#!/bin/sh' 'nginx -t && systemctl reload nginx' > /etc/letsencrypt/renewal-hooks/deploy/animationstage3d
chmod 750 /etc/letsencrypt/renewal-hooks/deploy/animationstage3d
printf '%s\n' '[Unit]' 'Description=Animation Stage 3D backup' '[Service]' 'Type=oneshot' 'ExecStart=/usr/local/sbin/animationstage3d-backup' > /etc/systemd/system/animationstage3d-backup.service
printf '%s\n' '[Unit]' 'Description=Daily Animation Stage 3D backup' '[Timer]' 'OnCalendar=*-*-* 02:30:00 UTC' 'Persistent=true' '[Install]' 'WantedBy=timers.target' > /etc/systemd/system/animationstage3d-backup.timer
systemctl daemon-reload
systemctl enable --now animationstage3d-backup.timer
systemctl restart php8.4-fpm
systemctl reload nginx
/usr/local/sbin/animationstage3d-backup
ufw status
systemctl is-active nginx php8.4-fpm
