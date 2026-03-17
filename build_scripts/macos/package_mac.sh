#!/bin/bash

# Set architecture from first argument, default to x64
ARCH=${1:-x64}

# Validate architecture
if [ "$ARCH" != "x64" ] && [ "$ARCH" != "arm64" ]; then
  echo "Error: Invalid architecture. Use 'x64' or 'arm64'"
  exit 1
fi

echo "Building for architecture: $ARCH"

rm -rf node_modules/node-sword-interface/sword node_modules/node-sword-interface/sword_build

node_modules/.bin/electron-packager . 'Ezra Bible App' \
--overwrite \
--platform=darwin \
--arch=$ARCH \
--prune=true \
--out=release \
--electron-version=32.2.3 \
--executable-name='Ezra Bible App' \
--app-bundle-id='net.ezrabibleapp.electron' \
--app-category-type='public.app-category.education' \
--protocol=ezrabible \
--protocol-name='Ezra Bible App' \
--icon=icons/ezra.icns
