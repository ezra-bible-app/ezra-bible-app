#!/bin/sh
# This script triggers all the steps necessary for building and packaging Ezra Bible App on macOS.

# Set minimum macOS version to 10.10 (Yosemite)
export MACOSX_DEPLOYMENT_TARGET=10.10

# Assume Node.js is already installed on the runner
npm install
npm run compile-pug
npm run commit-info
npm install sqlite3@5.0.2 --build-from-source --runtime=electron --target=32.2.3 --dist-url=https://electronjs.org/headers
npm run prune-node-modules
npm run purge-build-artifacts
npm run package-mac
