#!/bin/sh
# This script triggers all the steps necessary for building and packaging Ezra Project on macOS.

npm install
npm run compile-pug
npm run install-node-prune
npm run rebuild
npm run prune-node-modules
npm run purge-build-artifacts
npm run package-mac

if test "$GITHUB_EVENT_NAME" = "release"
then
  node_modules/.bin/sentry-cli --auth-token $SENTRY_TOKEN upload-dif -o tobias-klein -p ezra-project node_modules/node-sword-interface/build/Release/node_sword_interface.node
fi