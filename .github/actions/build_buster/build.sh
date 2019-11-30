#!/bin/sh
# This script triggers all the steps necessary for building and packaging Ezra Project on Linux.

npm run build-unix
npm run deb_buster
cp release/packages/*.deb $GITHUB_WORKSPACE/ezra-project_latest.deb
