#!/usr/bin/env bash
# Downloads the OCR language packs into public/tessdata (skips existing files,
# so Vercel's build cache keeps subsequent builds fast).
# Sources: @tesseract.js-data packages (the current tesseract.js v7 data host).
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p public/tessdata

LANGS="eng chi_sim deu fra spa jpn"
for lang in $LANGS; do
  target="public/tessdata/$lang.traineddata.gz"
  if [ -f "$target" ] && [ -s "$target" ]; then
    echo "skip $lang (already present)"
    continue
  fi
  echo "downloading $lang…"
  curl -sL -o "$target" "https://cdn.jsdelivr.net/npm/@tesseract.js-data/$lang@1.0.0/4.0.0/$lang.traineddata.gz"
done
echo "language packs ready: $(du -sh public/tessdata | awk '{print $1}')"
