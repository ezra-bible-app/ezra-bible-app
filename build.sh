#!/bin/sh

npm install
npm run rebuild-linux
rm -rf /tmp/electron-packager &> /dev/null
npm run package-linux
