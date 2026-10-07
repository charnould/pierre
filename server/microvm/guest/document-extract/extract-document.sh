#!/usr/bin/env bash
# Extract plain text from staged uploads (PDF, Office) inside the smolVM.
set -euo pipefail

readonly DOCUMENT_EXTRACT_DIR="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"

file="${1:?usage: document-extract FILE}"
[[ -f "$file" ]] || { echo "Fichier introuvable: $file" >&2; exit 1; }

ext="${file##*.}"
ext_lower=$(printf '%s' "$ext" | tr '[:upper:]' '[:lower:]')

case "$ext_lower" in
  pdf)
    pdftotext -layout "$file" -
    ;;
  docx | pptx)
    pandoc -t plain "$file"
    ;;
  xlsx | xls | xlsm | xlsb)
    node "${DOCUMENT_EXTRACT_DIR}/extract-spreadsheet.mjs" "$file"
    ;;
  *)
    echo "Format non supporté: .$ext_lower" >&2
    exit 1
    ;;
esac
