#!/usr/bin/env bash
# Einmalige Root-Einrichtung eines ausschließlich per FileZilla nutzbaren Uploadkontos.
set -Eeuo pipefail

readonly DEPLOY_ROOT="/var/lib/thesis-deploy"
readonly INCOMING_DIR="$DEPLOY_ROOT/incoming"
readonly FAILED_DIR="$DEPLOY_ROOT/failed"
readonly UPLOAD_USER="thesis-upload"
readonly TRIGGER_SOURCE="/opt/thesis-match-maker/scripts/selfhosted/thesis-sftp-deploy-trigger"
readonly TRIGGER_TARGET="/usr/local/sbin/thesis-sftp-deploy-trigger"
readonly SYSTEMD_SERVICE="/etc/systemd/system/thesis-sftp-deploy.service"
readonly SYSTEMD_PATH="/etc/systemd/system/thesis-sftp-deploy.path"
readonly SSHD_SNIPPET="/etc/ssh/sshd_config.d/99-thesis-upload.conf"

require_root() {
  [[ "${EUID}" -eq 0 ]] || {
    printf '%s\n' 'Dieses Einrichtungswerkzeug muss als root ausgeführt werden.' >&2
    exit 1
  }
}

write_sshd_snippet() {
  cat >"$SSHD_SNIPPET" <<'EOF'
Match User thesis-upload
    ChrootDirectory /var/lib/thesis-deploy
    ForceCommand internal-sftp -d /incoming
    PermitTTY no
    AllowTcpForwarding no
    X11Forwarding no
    PermitTunnel no
    GatewayPorts no
EOF
}

write_systemd_units() {
  cat >"$SYSTEMD_SERVICE" <<'EOF'
[Unit]
Description=Kontrollierter Thesis Match FileZilla Deploy
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
ExecStart=/usr/local/sbin/thesis-sftp-deploy-trigger
EOF

  cat >"$SYSTEMD_PATH" <<'EOF'
[Unit]
Description=Beobachtet die bewusste Thesis Match Deploy-Freigabedatei

[Path]
PathChanged=/var/lib/thesis-deploy/incoming/DEPLOY.ready
Unit=thesis-sftp-deploy.service

[Install]
WantedBy=multi-user.target
EOF
}

main() {
  require_root
  command -v sshd >/dev/null 2>&1 || {
    printf '%s\n' 'OpenSSH-Server fehlt auf diesem VPS.' >&2
    exit 1
  }
  [[ -f "$TRIGGER_SOURCE" ]] || {
    printf '%s\n' 'Der Deploy-Auslöser fehlt im Projektordner.' >&2
    exit 1
  }

  id "$UPLOAD_USER" >/dev/null 2>&1 || useradd --system --home-dir "$DEPLOY_ROOT" --shell /usr/sbin/nologin "$UPLOAD_USER"
  install -o root -g root -m 755 -d "$DEPLOY_ROOT"
  install -o "$UPLOAD_USER" -g "$UPLOAD_USER" -m 750 -d "$INCOMING_DIR"
  install -o root -g root -m 700 -d "$FAILED_DIR"
  install -o root -g root -m 750 "$TRIGGER_SOURCE" "$TRIGGER_TARGET"

  install -d -m 755 /etc/ssh/sshd_config.d
  write_sshd_snippet
  sshd -t
  systemctl reload ssh

  write_systemd_units
  systemctl daemon-reload
  systemctl enable --now thesis-sftp-deploy.path

  printf '%s\n' 'FileZilla-Deployzugang ist vorbereitet.'
  printf '%s\n' 'Setzen Sie jetzt als root mit „passwd thesis-upload“ ein eigenes Upload-Passwort.'
  printf '%s\n' 'FileZilla lädt danach zuerst thesis-source.zip und erst anschließend DEPLOY.ready nach /incoming hoch.'
}

main "$@"
