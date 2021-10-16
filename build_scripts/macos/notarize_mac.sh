#!/bin/bash

echo "Enter your Apple ID"
read APPLE_ID

echo ""
echo "Enter your Apple ID password:"
read APPLE_ID_PW

echo ""

export APPLE_ID="${APPLE_ID}"
export APPLE_ID_PW="${APPLE_ID_PW}"

echo "Notarizing app ..."
node build_scripts/macos/notarize_mac.js

if [ $? -eq 0 ]; then
    echo "App was notarized successfully!"
else
    echo "Notarization failed!"
fi

