#!/usr/bin/env bash
# Exit immediately if a command exits with a non-zero status
set -o errexit

echo "=== [1/2] Installing Backend Dependencies ==="
pip install --upgrade pip
pip install -r requirements.txt

echo "=== [2/2] Building React Frontend SPA ==="
cd client
npm install
npm run build
cd ..

echo "=== Build Complete! Static SPA ready in client/dist ==="

