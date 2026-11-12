#!/bin/sh
# Builds the Chrome Web Store upload: dist/github-carousel-<version>.zip
set -eu
cd "$(dirname "$0")/.."
version=$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' manifest.json)
out="dist/github-carousel-$version.zip"
mkdir -p dist
rm -f "$out"
zip -rq -X "$out" manifest.json src options icons -x '*.DS_Store'
echo "$out"
