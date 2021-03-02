#!/bin/bash

rm -rf node_modules/node-sword-interface/sword node_modules/node-sword-interface/sword_build

node_modules/.bin/electron-packager . ezra-bible-app --overwrite --platform=darwin --arch=x64 --prune=true --out=release --electron-version=9.2.1 \
--executable-name='ezra-bible-app' \
--app-bundle-id='net.ezrabibleapp.electron' \
--app-category-type='public.app-category.education' \
--icon=icons/ezra.icns
