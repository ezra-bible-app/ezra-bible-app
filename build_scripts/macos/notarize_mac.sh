#!/bin/bash

ARCH=${1:-x64}

if [ -z "$APPLE_ID" ]; then
  echo "Enter your Apple ID:"
  read APPLE_ID
fi

if [ -z "$APPLE_ID_PW" ]; then
  echo ""
  echo "Enter your Apple ID password:"
  read APPLE_ID_PW
fi

if [ -z "$APPLE_TEAM_ID" ]; then
  echo ""
  echo "Enter your Apple Team ID (get this from https://developer.apple.com/account):"
  read APPLE_TEAM_ID
fi

echo ""

export APPLE_ID="${APPLE_ID}"
export APPLE_ID_PW="${APPLE_ID_PW}"
export APPLE_TEAM_ID="${APPLE_TEAM_ID}"
export ARCH="${ARCH}"

node build_scripts/macos/notarize_mac.js "${ARCH}"

if [ $? -eq 0 ]; then
    echo "App was notarized successfully!"
else
    echo "Notarization failed!"
fi

