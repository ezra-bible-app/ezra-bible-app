<<<<<<< HEAD
REM On Windows we use Electron 8, because the latest sqlite3 (needed for Electron 9) does not run successfully yet.
call npm install --arch=ia32
call npm install electron@8.3.0 sqlite3@4.2.0 --arch=ia32
call node_modules\.bin\electron-rebuild.cmd --arch=ia32 -f -w node-sword-interface -v 8.3.0
=======
call npm config set msvs_version 2017
call npm install electron@9.1.0 --arch=ia32
call npm install --arch=ia32
call npm install sqlite3 --build-from-source --runtime=electron --target=9.1.0 --dist-url=https://electronjs.org/headers
REM echo "Rebuilding sqlite3"
REM call node_modules\.bin\electron-rebuild.cmd --arch=ia32 -f -o sqlite3 -v 9.1.0
echo "Rebuilding node-sword-interface"
call node_modules\.bin\electron-rebuild.cmd --arch=ia32 -f -o node-sword-interface -v 9.1.0
>>>>>>> 0ad7e35ce98576b0a7abed9b55e9072f1db5ed5d
call copy node_modules\node-sword-interface\build\sword-build-win32\lib\*.dll node_modules\node-sword-interface\build\Release\
call npm run install-node-prune-win
call npm run prune-node-modules
call npm run package-win
call npm run installer-win

if "%GITHUB_EVENT_NAME%"=="release" (
  node_modules\.bin\sentry-cli --auth-token %SENTRY_TOKEN% upload-dif -o tobias-klein -p ezra-project node_modules\node-sword-interface\build\Release\node_sword_interface.node
  node_modules\.bin\sentry-cli --auth-token %SENTRY_TOKEN% upload-dif -o tobias-klein -p ezra-project node_modules\node-sword-interface\build\Release\node_sword_interface.pdb
)