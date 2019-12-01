#!/bin/sh
# This script triggers all the steps necessary for building and packaging Ezra Project on macOS.

npm install
npm run compile-pug
npm run install-node-prune
npm run rebuild
npm run prune-node-modules
npm run purge-build-artifacts
npm run package-mac

electron-rebuild -f -w macos-alias -v 7.1.1
npm run dmg-mac