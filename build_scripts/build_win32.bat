REM On Windows we use Electron 8, because the latest sqlite3 (needed for Electron 9) does not run successfully yet.
call npm install --arch=ia32
call npm install electron@8.3.0 sqlite3@4.2.0 --arch=ia32
call node_modules\.bin\electron-rebuild.cmd --arch=ia32 -f -w node-sword-interface -v 8.3.0
call copy node_modules\node-sword-interface\build\sword-build-win32\lib\*.dll node_modules\node-sword-interface\build\Release\
call npm run install-node-prune-win
call npm run prune-node-modules
call npm run package-win
call npm run installer-win

if "%GITHUB_EVENT_NAME%"=="release" (
  node_modules\.bin\sentry-cli --auth-token %SENTRY_TOKEN% upload-dif -o tobias-klein -p ezra-project node_modules\node-sword-interface\build\Release\node_sword_interface.node
  node_modules\.bin\sentry-cli --auth-token %SENTRY_TOKEN% upload-dif -o tobias-klein -p ezra-project node_modules\node-sword-interface\build\Release\node_sword_interface.pdb
)