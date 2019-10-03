#!/bin/sh

rm -rf node_modules/node-sword-interface/sword >/dev/null 2>&1
rm -rf node_modules/node-sword-interface/sword_build >/dev/null 2>&1
rm -f node_modules/sqlite3/build/Release/sqlite3.a >/dev/null 2>&1

find node_modules -name obj -exec rm -rf {} >/dev/null 2>&1 \;
find node_modules -name obj.target -exec rm -rf {} >/dev/null 2>&1 \;

exit 0
