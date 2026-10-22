#!/bin/sh
set -e

REPO="https://github.com/Lifantel/milyoner.git"
DIR="$PWD/milyoner"
PORT=8000

echo "#################################################"
echo "İNGİLİZCE PERFORMANS ÖDEVİ"
echo "NURİ İL / ABDULHADİ ABUŞ / MEHMET FATİH GÜLTEKİN"
echo "#################################################"
echo "BSD Zero Clause 2026"
sleep 3

if ! command -v git >/dev/null 2>&1 || ! command -v python3 >/dev/null 2>&1; then
    echo "git ve python3 kuruluyor..."
    sudo apt-get update
    sudo apt-get install -y git python3
fi

if [ -d "$DIR/.git" ]; then
    git -C "$DIR" pull --ff-only
else
    git clone "$REPO" "$DIR"
fi

cd "$DIR"
echo "Site: http://localhost:$PORT  (durdurmak için Ctrl+C)"
(sleep 2; xdg-open "http://localhost:$PORT" >/dev/null 2>&1) &
exec python3 -m http.server "$PORT"
