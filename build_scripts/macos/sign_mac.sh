#!/bin/bash

export DEBUG=electron-osx-sign*

node_modules/.bin/electron-osx-sign ./release/Ezra\ Bible\ App-darwin-x64/Ezra\ Bible\ App.app \
--type='distribution' \
--hardened-runtime \
--no-gatekeeper-assess \
--entitlements='./build_scripts/macos/entitlements.plist' \
--entitlements-inherit='./build_scripts/macos/entitlements.plist'
