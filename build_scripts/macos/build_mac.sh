#!/bin/sh
# This script triggers all the steps necessary for building and packaging Ezra Bible App on macOS.

# Set minimum macOS version to 10.10 (Yosemite)
export MACOSX_DEPLOYMENT_TARGET=10.10

npm install
npm run compile-pug
npm run commit-info
npm run install-node-prune
npm install sqlite3@5.0.2 --build-from-source --runtime=electron --target=33.2.0 --dist-url=https://electronjs.org/headers
npm run prune-node-modules
npm run purge-build-artifacts
npm run package-mac
