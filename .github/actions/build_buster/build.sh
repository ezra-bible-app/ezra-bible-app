#!/bin/sh
# This script triggers all the steps necessary for building and packaging Ezra Project on Linux.

npm run build-linux
npm run deb_buster

echo "GITHUB_EVENT_NAME"
echo $GITHUB_EVENT_NAME
echo "GITHUB_REF"
echo $GITHUB_REF

cp release/packages/*.deb $GITHUB_WORKSPACE/ezra-project_latest.deb
