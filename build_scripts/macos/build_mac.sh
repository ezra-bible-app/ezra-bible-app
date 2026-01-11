#!/bin/sh
# This script triggers all the steps necessary for building and packaging Ezra Bible App on macOS.

# Set architecture from first argument, default to x64
ARCH=${1:-x64}

# Validate architecture
if [ "$ARCH" != "x64" ] && [ "$ARCH" != "arm64" ]; then
  echo "Error: Invalid architecture. Use 'x64' or 'arm64'"
  exit 1
fi

echo "Building for architecture: $ARCH"

# Set minimum macOS version to 10.10 (Yosemite)
export MACOSX_DEPLOYMENT_TARGET=10.10

npm install --target-arch=$ARCH
npm run compile-pug
npm run commit-info
npm install sqlite3@5.1.7 --target-arch=$ARCH --build-from-source --runtime=electron --target=32.2.3 --dist-url=https://electronjs.org/headers
npm run prune-node-modules
npm run purge-build-artifacts
npm run package-mac-$ARCH
