#!/bin/sh
# Kim Milyoner Olmak İster? - indir ve çalıştır (Debian)
set -e

REPO="https://github.com/Lifantel/milyoner.git"
DIR="$PWD/milyoner"
PORT=8000

echo "##############################"
echo "İNGİLİZCE PERFORMANS ÖDEVİ"
echo "##############################"
sleep 3

# Gerekli paketler
if ! command -v git >/dev/null 2>&1 || ! command -v python3 >/dev/null 2>&1; then
    echo "git ve python3 kuruluyor..."
    sudo apt-get update
    sudo apt-get install -y git python3
fi

# İndir veya güncelle
if [ -d "$DIR/.git" ]; then
    git -C "$DIR" pull --ff-only
else
    git clone "$REPO" "$DIR"
fi

# Çalıştır
cd "$DIR"
echo "Site: http://localhost:$PORT  (durdurmak için Ctrl+C)"
(sleep 2; xdg-open "http://localhost:$PORT" >/dev/null 2>&1) &
exec python3 -m http.server "$PORT"
