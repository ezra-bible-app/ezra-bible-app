#!/bin/sh
# This script triggers all the steps necessary for building and packaging Ezra Bible App on Linux.

npm install
npm run compile-pug
npm run add-github-workspace-to-safe-git-dirs
npm run commit-info
npm i node-pre-gyp
#npm run rebuild
npm run prune-node-modules
rm -rf /tmp/electron-packager &> /dev/null
npm run purge-build-artifacts
npm run package-linux
