#!/bin/bash

export DEBUG=electron-osx-sign*

node_modules/.bin/electron-osx-sign ./release/Ezra\ Project-darwin-x64/Ezra\ Project.app \
--type='distribution' \
--hardened-runtime \
--entitlements='./entitlements.plist' \
--entitlements-inherit='./entitlements.plist'