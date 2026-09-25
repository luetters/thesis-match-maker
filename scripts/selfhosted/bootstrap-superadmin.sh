#!/usr/bin/env bash
# Kontrollierter lokaler Erstzugang bzw. Wiederherstellung eines Superadmin-Kontos.
# Das Kennwort wird nur verdeckt im Terminal gelesen und ausschließlich per stdin
# an den laufenden Anwendungscontainer weitergegeben.
set -Eeuo pipefail

readonly PROJECT_DIR="${PROJECT_DIR:-/opt/thesis-match-maker}"
readonly ENV_FILE="$PROJECT_DIR/deploy/.env"
readonly COMPOSE_FILE="$PROJECT_DIR/deploy/docker-compose.yml"
readonly CONTAINER_SCRIPT="/app/scripts/selfhosted/bootstrap-superadmin.mjs"

MODE=""
ACCOUNT_EMAIL=""
ACCOUNT_NAME=""
RESET_TWO_FACTOR="false"
password=""
password_confirmation=""

usage() {
  cat <<'USAGE'
Verwendung:
  sudo bootstrap-superadmin.sh --mode initial|recover --email name@example.org --name "Vor- und Nachname" [--reset-two-factor]

Modi:
  initial  Legt ein Superadmin-Konto ausschließlich an, wenn für die E-Mail-Adresse
           noch kein Datensatz existiert.
  recover  Stellt ausschließlich ein vorhandenes Superadmin-Konto wieder her und
           vergibt ein neues lokales Portalpasswort.

Das Kennwort wird verdeckt abgefragt, weder als Argument übergeben noch ausgegeben.
Der Aufruf verändert weder SMTP, DNS, Firewall, Datenbankstruktur noch andere Konten.
USAGE
}

cleanup() {
  unset password password_confirmation
}
trap cleanup EXIT

while [[ $# -gt 0 ]]; do
  case "$1" in
    --mode)
      MODE="${2:-}"
      shift 2
      ;;
    --email)
      ACCOUNT_EMAIL="${2:-}"
      shift 2
      ;;
    --name)
      ACCOUNT_NAME="${2:-}"
      shift 2
      ;;
    --reset-two-factor)
      RESET_TWO_FACTOR="true"
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      usage >&2
      exit 2
      ;;
  esac
done

[[ "$EUID" -eq 0 ]] || {
  printf 'Dieses Werkzeug muss mit sudo ausgeführt werden.\n' >&2
  exit 1
}

[[ "$MODE" == "initial" || "$MODE" == "recover" ]] || {
  printf 'Bitte --mode initial oder --mode recover angeben.\n' >&2
  exit 2
}

[[ "$RESET_TWO_FACTOR" == "false" || "$MODE" == "recover" ]] || {
  printf 'Die Zwei-Faktor-Authentifizierung kann nur bei einer Kontowiederherstellung zurückgesetzt werden.\n' >&2
  exit 2
}

[[ "$ACCOUNT_EMAIL" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+$ ]] || {
  printf 'Ungültige E-Mail-Adresse.\n' >&2
  exit 2
}

[[ ${#ACCOUNT_EMAIL} -le 320 && ${#ACCOUNT_NAME} -ge 2 && ${#ACCOUNT_NAME} -le 200 ]] || {
  printf 'Der Name muss zwischen 2 und 200 Zeichen lang sein.\n' >&2
  exit 2
}

[[ -f "$COMPOSE_FILE" && -f "$ENV_FILE" ]] || {
  printf 'Deploy-Konfiguration oder geschützte Laufzeitdatei fehlt. Keine Änderung ausgeführt.\n' >&2
  exit 1
}

command -v docker >/dev/null 2>&1 || {
  printf 'Docker ist nicht verfügbar. Keine Änderung ausgeführt.\n' >&2
  exit 1
}

compose() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

compose ps --services --status running | grep -qx 'app' || {
  printf 'Der Anwendungscontainer läuft nicht. Erst den lesenden Servercheck und den Health-Check abschließen.\n' >&2
  exit 1
}

if [[ "$MODE" == "initial" ]]; then
  expected_confirmation="SUPERADMIN_ERSTZUGANG"
  printf '%s\n' 'Es wird ausschließlich ein neues Superadmin-Konto für die angegebene E-Mail-Adresse angelegt, sofern kein Konto existiert.'
else
  expected_confirmation="SUPERADMIN_WIEDERHERSTELLEN"
  printf '%s\n' 'Es wird ausschließlich das vorhandene Konto für die angegebene E-Mail-Adresse wiederhergestellt und ein neues lokales Portalpasswort vergeben.'
fi
printf 'Zum Fortfahren exakt %s eingeben: ' "$expected_confirmation"
read -r confirmation
[[ "$confirmation" == "$expected_confirmation" ]] || {
  printf 'Bestätigung stimmt nicht überein. Keine Änderung ausgeführt.\n' >&2
  exit 1
}

if [[ "$RESET_TWO_FACTOR" == "true" ]]; then
  printf 'Zum Zurücksetzen der Zwei-Faktor-Authentifizierung exakt 2FA_ZURUECKSETZEN eingeben: '
  read -r two_factor_confirmation
  [[ "$two_factor_confirmation" == "2FA_ZURUECKSETZEN" ]] || {
    printf 'Bestätigung stimmt nicht überein. Keine Änderung ausgeführt.\n' >&2
    exit 1
  }
fi

printf 'Neues lokales Portalpasswort (verdeckt): '
read -r -s password
printf '\nPasswort wiederholen: '
read -r -s password_confirmation
printf '\n'
[[ "$password" == "$password_confirmation" ]] || {
  printf 'Die Passwörter stimmen nicht überein. Keine Änderung ausgeführt.\n' >&2
  exit 1
}

if [[ "$RESET_TWO_FACTOR" == "true" ]]; then
  printf '%s\n' "$password" | compose exec -T app node "$CONTAINER_SCRIPT" \
    --mode "$MODE" --email "$ACCOUNT_EMAIL" --name "$ACCOUNT_NAME" --reset-two-factor
else
  printf '%s\n' "$password" | compose exec -T app node "$CONTAINER_SCRIPT" \
    --mode "$MODE" --email "$ACCOUNT_EMAIL" --name "$ACCOUNT_NAME"
fi

printf 'Der lokale Superadmin-Zugang wurde kontrolliert verarbeitet. Melden Sie sich anschließend über die Portal-Anmeldeseite an.\n'
