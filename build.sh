#!/bin/sh

npm install
npm run rebuild
rm -rf /tmp/electron-packager &> /dev/null
npm run package-linux
