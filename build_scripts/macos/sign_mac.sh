#!/bin/bash

# Set architecture from first argument, default to x64
ARCH=${1:-x64}

# Validate architecture
if [ "$ARCH" != "x64" ] && [ "$ARCH" != "arm64" ]; then
  echo "Error: Invalid architecture. Use 'x64' or 'arm64'"
  exit 1
fi

echo "Signing for architecture: $ARCH"

export DEBUG=electron-osx-sign*

node_modules/.bin/electron-osx-sign ./release/Ezra\ Bible\ App-darwin-$ARCH/Ezra\ Bible\ App.app \
--type='distribution' \
--hardened-runtime \
--no-gatekeeper-assess \
--entitlements='./build_scripts/macos/entitlements.plist' \
--entitlements-inherit='./build_scripts/macos/entitlements.plist'
