#!/bin/bash

echo "Enter your Apple ID"
read APPLE_ID

echo "Enter your Apple ID password:"
read -s APPLE_ID_PW

rm -rf node_modules/node-sword-interface/sword node_modules/node-sword-interface/sword_build

node_modules/.bin/electron-packager . 'Ezra Project' --overwrite --platform=darwin --arch=x64 --prune=true --out=release --electron-version=4.2.0 \
--executable-name='ezra-project' \
--app-bundle-id='net.ezra-project.electronapp' \
--app-category-type='public.app-category.education' \
--osx-sign.hardened-runtime \
--osx-notarize.appleId="${APPLE_ID}" \
--osx-notarize.appleIdPassword="${APPLE_ID_PW}"