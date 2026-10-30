#!/usr/bin/env bash
# Extract plain text from staged uploads (PDF, Office) inside the smolVM.
set -euo pipefail

readonly DOCUMENT_EXTRACT_DIR="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"
readonly MAX_OUTPUT_BYTES=$((256 * 1024))
readonly MAX_PDF_PAGES=100

file="${1:?usage: document-extract FILE}"
[[ -f "$file" ]] || { echo "Fichier introuvable: $file" >&2; exit 1; }

ext="${file##*.}"
ext_lower=$(printf '%s' "$ext" | tr '[:upper:]' '[:lower:]')
mime=$(file --brief --mime-type -- "$file")
tmpdir=$(mktemp -d)
output="$tmpdir/output.txt"
trap 'rm -rf "$tmpdir"' EXIT

require_mime() {
  local expected="$1"
  [[ "$mime" =~ $expected ]] || {
    echo "Le contenu du fichier ne correspond pas à son extension .$ext_lower ($mime)." >&2
    exit 1
  }
}

emit_bounded() {
  local bytes
  bytes=$(wc -c < "$output")
  head -c "$MAX_OUTPUT_BYTES" "$output"
  if (( bytes > MAX_OUTPUT_BYTES )); then
    printf '\n\n[Extraction tronquée à %d octets]\n' "$MAX_OUTPUT_BYTES"
  fi
}

case "$ext_lower" in
  pdf)
    require_mime '^application/pdf$'
    pages=$(pdfinfo "$file" | awk -F: '/^Pages:/ { gsub(/[[:space:]]/, "", $2); print $2 }')
    [[ "$pages" =~ ^[0-9]+$ ]] || { echo "Nombre de pages PDF illisible." >&2; exit 1; }
    (( pages <= MAX_PDF_PAGES )) || {
      echo "Le PDF dépasse la limite de $MAX_PDF_PAGES pages." >&2
      exit 1
    }
    pdftotext -layout "$file" "$output"
    if ! grep -q '[^[:space:]]' "$output"; then
      : > "$output"
      for ((page = 1; page <= pages; page++)); do
        image="$tmpdir/page-$page"
        pdftoppm -f "$page" -l "$page" -singlefile -r 150 -jpeg "$file" "$image" >/dev/null
        tesseract "$image.jpg" stdout -l fra+eng 2>/dev/null >> "$output"
        printf '\n' >> "$output"
      done
    fi
    ;;
  docx | pptx)
    require_mime '^(application/zip|application/vnd\.openxmlformats-officedocument\.)'
    pandoc -t plain "$file" > "$output"
    ;;
  xlsx | xls | xlsm | xlsb)
    if [[ "$ext_lower" == "xls" ]]; then
      require_mime '^(application/vnd\.ms-excel|application/x-ole-storage|application/octet-stream)$'
    else
      require_mime '^(application/zip|application/vnd\.(openxmlformats-officedocument|ms-excel))'
    fi
    node "${DOCUMENT_EXTRACT_DIR}/extract-spreadsheet.mjs" "$file" > "$output"
    ;;
  *)
    echo "Format non supporté: .$ext_lower" >&2
    exit 1
    ;;
esac

emit_bounded
