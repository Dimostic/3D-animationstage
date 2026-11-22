#!/bin/bash
set -euo pipefail
umask 077
test "$(id -u)" = 0
test "$(hostname)" = srv2187126
test -f /srv/animationstage3d/current/manifest.json
production_before=$(readlink -f /srv/animationstage3d/current)
production_config_before=$(sha256sum /etc/nginx/sites-available/animationstage3d)
id stage3d-preview >/dev/null 2>&1 || useradd --create-home --shell /bin/bash stage3d-preview
id stage3d-preview-web >/dev/null 2>&1 || useradd --system --no-create-home --shell /usr/sbin/nologin stage3d-preview-web
install -d -m 700 -o stage3d-preview -g stage3d-preview /home/stage3d-preview/.ssh
install -m 600 -o stage3d-preview -g stage3d-preview /home/stage3d/.ssh/authorized_keys /home/stage3d-preview/.ssh/authorized_keys
install -d -m 755 /srv/animationstage3d-preview /srv/animationstage3d-preview/releases
install -d -m 750 -o stage3d-preview -g stage3d-preview /srv/animationstage3d-preview/incoming
install -d -m 700 -o stage3d-preview-web -g stage3d-preview-web /srv/animationstage3d-preview/storage /var/lib/animationstage3d-preview/tmp
install -d -m 711 -o root -g root /etc/animationstage3d-preview
install -d -m 700 /var/backups/animationstage3d-preview
install -d -m 755 /var/lib/animationstage3d-preview/acme
if ! test -f /etc/animationstage3d-preview/asset-signing.key; then
    openssl rand -hex 32 > /etc/animationstage3d-preview/asset-signing.key
fi
chown root:stage3d-preview-web /etc/animationstage3d-preview/asset-signing.key
chmod 640 /etc/animationstage3d-preview/asset-signing.key
# Separate login files, initially using the user's existing dedicated 3D login.
if ! test -f /etc/animationstage3d-preview/private-beta-password; then
    install -m 600 /etc/animationstage3d/private-beta-password /etc/animationstage3d-preview/private-beta-password
    install -m 640 -o root -g www-data /etc/animationstage3d/htpasswd /etc/animationstage3d-preview/htpasswd
fi
printf 'machine preview.3d.animationstage.com login studio3d password %s\n' "$(cat /etc/animationstage3d-preview/private-beta-password)" > /etc/animationstage3d-preview/health.netrc
chmod 600 /etc/animationstage3d-preview/health.netrc
python3 - <<'PY'
from pathlib import Path
for source, name in [('activate.py','activate'),('rollback.py','rollback')]:
    text=Path('/tmp/stage3d-preview-setup/'+source).read_text().replace('/srv/animationstage3d','/srv/animationstage3d-preview').replace('animationstage3d-activate','animationstage3d-preview-activate')
    target=Path('/usr/local/sbin/animationstage3d-preview-'+name)
    target.write_text(text);target.chmod(0o755)
PY
install -m 750 /tmp/stage3d-preview-setup/healthcheck.sh /usr/local/sbin/animationstage3d-preview-healthcheck
install -m 750 /tmp/stage3d-preview-setup/backup.sh /usr/local/sbin/animationstage3d-preview-backup
printf '%s\n' 'stage3d-preview ALL=(root) NOPASSWD: /usr/local/sbin/animationstage3d-preview-activate *, /usr/local/sbin/animationstage3d-preview-rollback ""' > /etc/sudoers.d/animationstage3d-preview
chmod 440 /etc/sudoers.d/animationstage3d-preview
visudo -cf /etc/sudoers.d/animationstage3d-preview
install -m 644 /tmp/stage3d-preview-setup/php-pool.conf /etc/php/8.4/fpm/pool.d/stage3d-preview.conf
php-fpm8.4 -t
if ! test -f /etc/letsencrypt/live/preview.3d.animationstage.com/fullchain.pem; then
    cat > /etc/nginx/sites-available/animationstage3d-preview <<'NGINX'
server {
    listen 80;
    listen [::]:80;
    server_name preview.3d.animationstage.com;
    location ^~ /.well-known/acme-challenge/ { root /var/lib/animationstage3d-preview/acme; }
    location / { return 404; }
}
NGINX
    ln -sfn /etc/nginx/sites-available/animationstage3d-preview /etc/nginx/sites-enabled/animationstage3d-preview
    nginx -t
    systemctl reload nginx
    certbot certonly --webroot -w /var/lib/animationstage3d-preview/acme -d preview.3d.animationstage.com --email dimielens@gmail.com --agree-tos --non-interactive
fi
install -m 644 /tmp/stage3d-preview-setup/nginx.conf /etc/nginx/sites-available/animationstage3d-preview
ln -sfn /etc/nginx/sites-available/animationstage3d-preview /etc/nginx/sites-enabled/animationstage3d-preview
nginx -t
systemctl reload php8.4-fpm
systemctl reload nginx
for kind in healthcheck backup; do
    cat > "/etc/systemd/system/animationstage3d-preview-$kind.service" <<EOF
[Unit]
Description=Animation Stage 3D preview $kind
[Service]
Type=oneshot
ExecStart=/usr/local/sbin/animationstage3d-preview-$kind
EOF
done
cat > /etc/systemd/system/animationstage3d-preview-healthcheck.timer <<'UNIT'
[Unit]
Description=Check private 3D preview every five minutes
[Timer]
OnBootSec=2min
OnUnitActiveSec=5min
[Install]
WantedBy=timers.target
UNIT
cat > /etc/systemd/system/animationstage3d-preview-backup.timer <<'UNIT'
[Unit]
Description=Daily private 3D preview backup
[Timer]
OnCalendar=*-*-* 03:00:00 UTC
Persistent=true
[Install]
WantedBy=timers.target
UNIT
systemctl daemon-reload
test "$production_before" = "$(readlink -f /srv/animationstage3d/current)"
test "$production_config_before" = "$(sha256sum /etc/nginx/sites-available/animationstage3d)"
printf 'Preview infrastructure configured. Production release and virtual host unchanged. Deploy preview before enabling its timers.\n'
