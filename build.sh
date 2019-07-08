#!/bin/sh

npm install
npm run rebuild
rm -rf /tmp/electron-packager &> /dev/null
npm run purge-build-artifacts
npm run package-linux
