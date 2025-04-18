#!/bin/bash

rm -rf node_modules/node-sword-interface/sword node_modules/node-sword-interface/sword_build

node_modules/.bin/electron-packager . 'Ezra Bible App' \
--overwrite \
--platform=darwin \
--arch=x64 \
--prune=true \
--out=release \
--electron-version=32.2.3 \
--executable-name='Ezra Bible App' \
--app-bundle-id='net.ezrabibleapp.electron' \
--app-category-type='public.app-category.education' \
--protocol=ezrabible \
--protocol-name='Ezra Bible App' \
--icon=icons/ezra.icns
