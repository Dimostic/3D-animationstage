#!/bin/bash
set -euo pipefail
test "$(id -u)" = 0
test "$(hostname)" = srv2187126
test -f /tmp/stage3d-deploy.pub
if test -e /srv/animationstage3d/current; then echo 'Already commissioned; use npm run deploy for updates.' >&2; exit 1; fi
systemctl mask --runtime nginx.service
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y nginx php8.4-fpm certbot ufw apache2-utils sudo openssl
id stage3d >/dev/null 2>&1 || useradd --create-home --shell /bin/bash stage3d
install -d -m 700 -o stage3d -g stage3d /home/stage3d/.ssh
install -m 600 -o stage3d -g stage3d /tmp/stage3d-deploy.pub /home/stage3d/.ssh/authorized_keys
install -d -m 755 /srv/animationstage3d /srv/animationstage3d/releases
install -d -m 750 -o stage3d -g stage3d /srv/animationstage3d/incoming
install -d -m 750 -o root -g www-data /etc/animationstage3d
install -d -m 700 /var/backups/animationstage3d
install -d -m 755 /var/lib/animationstage3d/acme
if ! test -f /etc/animationstage3d/asset-signing.key; then
    openssl rand -hex 32 > /etc/animationstage3d/asset-signing.key
    chown root:www-data /etc/animationstage3d/asset-signing.key
    chmod 640 /etc/animationstage3d/asset-signing.key
fi
if ! test -f /etc/animationstage3d/private-beta-password; then
    openssl rand -base64 24 > /etc/animationstage3d/private-beta-password
    chmod 600 /etc/animationstage3d/private-beta-password
    htpasswd -iBc /etc/animationstage3d/htpasswd studio3d < /etc/animationstage3d/private-beta-password
    chown root:www-data /etc/animationstage3d/htpasswd
    chmod 640 /etc/animationstage3d/htpasswd
fi
install -m 755 -o root -g root /tmp/stage3d-activate.py /usr/local/sbin/animationstage3d-activate
printf '%s\n' 'stage3d ALL=(root) NOPASSWD: /usr/local/sbin/animationstage3d-activate *' > /etc/sudoers.d/animationstage3d
chmod 440 /etc/sudoers.d/animationstage3d
visudo -cf /etc/sudoers.d/animationstage3d
install -m 644 /tmp/stage3d-bootstrap.conf /etc/nginx/sites-available/animationstage3d
if test -L /etc/nginx/sites-enabled/default; then unlink /etc/nginx/sites-enabled/default; fi
ln -sfn /etc/nginx/sites-available/animationstage3d /etc/nginx/sites-enabled/animationstage3d
nginx -t
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
systemctl unmask --runtime nginx.service
systemctl enable --now nginx php8.4-fpm certbot.timer
printf '\n3D base provisioned; editor not yet published.\n'
