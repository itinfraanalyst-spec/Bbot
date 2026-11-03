#!/usr/bin/env bash
# Exit immediately if a command exits with a non-zero status
set -o errexit

echo "=== [1/2] Installing Backend Dependencies ==="
pip install --upgrade pip
pip install -r requirements.txt

echo "=== [2/2] Checking Frontend SPA Assets ==="
if [ -d "client/dist" ] && [ -f "client/dist/index.html" ]; then
    echo "Pre-built client/dist verified! Skipping memory-heavy npm build."
else
    echo "Building React frontend from source..."
    cd client
    npm install
    npm run build
    cd ..
fi

echo "=== Build Complete! Static SPA ready in client/dist ==="
