#!/bin/sh

rm -rf node_modules/node-sword-interface/sword
rm -rf node_modules/node-sword-interface/sword_build
rm -rf node_modules/sqlite3/deps
rm -f node_modules/sqlite3/build/Release/sqlite3.a

find node_modules -name obj -exec rm -rf {} >/dev/null 2>&1 \;
find node_modules -name obj.target -exec rm -rf {} >/dev/null 2>&1 \;
