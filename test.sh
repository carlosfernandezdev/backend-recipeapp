#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:4000}"
PASS="${PASS:-Abcdef12}"
NAME="${NAME:-Valeria}"

# Email único por corrida (funciona en Git Bash/MSYS2)
TS=$(date +%s 2>/dev/null || echo 9999999999)
RND=${RANDOM:-$TS}
EMAIL="${EMAIL:-demo+$TS$RND@recipes.com}"

echo "=== EMAIL de prueba: $EMAIL ==="

json_escape() {
  # escapa comillas para inline JSON
  printf '%s' "$1" | sed 's/"/\\"/g'
}

# ---------- REGISTER ----------
echo
echo "=== REGISTER ==="
REG_PAYLOAD="{\"email\":\"$(json_escape "$EMAIL")\",\"password\":\"$(json_escape "$PASS")\",\"name\":\"$(json_escape "$NAME")\"}"
REG=$(curl -s -i -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "$REG_PAYLOAD")

HTTP_CODE=$(printf '%s' "$REG" | awk 'BEGIN{RS="\r\n\r\n"} NR==1{for (i=1;i<=NF;i++) if ($i ~ /^HTTP\/1\.[01]/) print $(i+1)}')
BODY=$(printf '%s' "$REG" | awk 'BEGIN{RS="\r\n\r\n"} NR==2{print}')

echo "Register status: $HTTP_CODE"
echo "Register body:   $BODY"
echo

# Si 409 (email ya tomado) intentamos login; si 201 seguimos con el body de register
if [ "$HTTP_CODE" = "409" ]; then
  echo "=== LOGIN (email ya existente) ==="
  LOGIN_PAYLOAD="{\"email\":\"$(json_escape "$EMAIL")\",\"password\":\"$(json_escape "$PASS")\"}"
  BODY=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "$LOGIN_PAYLOAD")
  echo "Login body: $BODY"
elif [ "$HTTP_CODE" != "201" ]; then
  echo "✘ Registro falló con HTTP $HTTP_CODE. Aborto."
  exit 1
fi

# ---------- EXTRAER TOKENS ----------
ACCESS=$(printf '%s' "$BODY"  | perl -ne 'print $1 if /"accessToken"\s*:\s*"([^"]+)"/')
REFRESH=$(printf '%s' "$BODY" | perl -ne 'print $1 if /"refreshToken"\s*:\s*"([^"]+)"/')

echo
echo "ACCESS len: ${#ACCESS}"
echo "REFRESH len: ${#REFRESH}"

if [ -z "${ACCESS:-}" ] || [ -z "${REFRESH:-}" ]; then
  echo "✘ No se extrajeron tokens. Revisa JSON arriba: ¿tu endpoint devuelve {accessToken,refreshToken}?"
  exit 1
fi

# ---------- /users/me con ACCESS ----------
echo
echo "=== /users/me con ACCESS ==="
curl -i "$BASE_URL/users/me" -H "Authorization: Bearer $ACCESS"
echo
echo

# ---------- /auth/refresh ----------
echo "=== /auth/refresh → NEW_ACCESS ==="
NEW=$(curl -s -X POST "$BASE_URL/auth/refresh" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$(json_escape "$REFRESH")\"}")
echo "Refresh body: $NEW"

NEW_ACCESS=$(printf '%s' "$NEW" | perl -ne 'print $1 if /"accessToken"\s*:\s*"([^"]+)"/')
echo "NEW_ACCESS len: ${#NEW_ACCESS}"
if [ -z "${NEW_ACCESS:-}" ]; then
  echo "✘ No se pudo extraer NEW_ACCESS. Revisa JSON arriba."
  exit 1
fi

echo
echo "=== /users/me con NEW_ACCESS ==="
curl -i "$BASE_URL/users/me" -H "Authorization: Bearer $NEW_ACCESS"
echo
