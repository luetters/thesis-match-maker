#!/usr/bin/env bash
set -euo pipefail

# Prüft die im Portal fest referenzierten öffentlichen Markenmedien über den
# lokalen Storage-Proxy. Der Standard nutzt die ausschließlich lokale App-
# Bindung des selbst gehosteten Docker-Deployments.
BASE_URL="${1:-http://127.0.0.1:3000}"
BASE_URL="${BASE_URL%/}"

assets=(
  "logo-icon_b7dba00c.webp"
  "logo-sidebar_8dd3989f.webp"
  "icon-female_612c1055.webp"
  "icon-male2_9e670c3a.webp"
  "icon-allgender_64b60a63.webp"
  "thesis-logo-512_6fcdaa04.png"
  "ThesisMatchMaker_b92cd3c0.jpg"
  "htw-banner_7aece4c8.jpg"
  "InfrarotinBibliothek_458a4f63.mp4"
  "doppelhelix_11919ca4.mp4"
  "zahnrad_5a03ea50.mp4"
  "Riesenrad_ad8a7edc.mp4"
  "Zellen_a463c072.mp4"
  "blossom_ceaee23f.mp4"
  "thesis-match-einstieg_6541f57a.mp4"
  "thesis-match-maker-student-guide_4615c09b.pdf"
  "thesis-match-maker-erste-pruefung-leitfaden_ed9fe14a.pdf"
  "thesis-match-maker-zweite-pruefung-leitfaden_afa12c86.pdf"
  "thesis-match-maker-verwaltung-leitfaden_7ca2f6a1.pdf"
  "thesis-match-maker-erste-pruefung-leitfaden-druckversion_ef38f151.pdf"
  "thesis-match-maker-zweite-pruefung-leitfaden-druckversion_aa7dfb2c.pdf"
  "thesis-match-maker-verwaltung-leitfaden-druckversion_a89cde2d.pdf"
)

failed=0
for asset in "${assets[@]}"; do
  url="$BASE_URL/manus-storage/$asset"
  if curl --fail --silent --show-error --location --output /dev/null "$url"; then
    printf '[OK] %s\n' "$asset"
  else
    printf '[FEHLT] %s\n' "$asset" >&2
    failed=1
  fi
done

if [[ "$failed" -ne 0 ]]; then
  echo "[verify-public-media] Mindestens eine öffentliche Medienreferenz ist nicht lokal verfügbar." >&2
  exit 1
fi

printf '[verify-public-media] %s öffentliche Medien sind über %s erreichbar.\n' "${#assets[@]}" "$BASE_URL"
