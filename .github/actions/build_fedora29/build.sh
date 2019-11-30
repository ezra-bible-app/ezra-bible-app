#!/bin/sh
# This script triggers all the steps necessary for building and packaging Ezra Project on Linux.

npm run build-unix
npm run fedora_29
cp release/packages/*.rpm $GITHUB_WORKSPACE/ezra-project_latest.rpm
