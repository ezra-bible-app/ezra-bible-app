call npm install electron@9.1.0 --arch=ia32
call npm install --arch=ia32
echo "Rebuilding sqlite3"
call node_modules\.bin\electron-rebuild.cmd --arch=ia32 -f -o sqlite3 -v 9.1.0
echo "Rebuilding node-sword-interface"
call node_modules\.bin\electron-rebuild.cmd --arch=ia32 -f -o node-sword-interface -v 9.1.0
call copy node_modules\node-sword-interface\build\sword-build-win32\lib\*.dll node_modules\node-sword-interface\build\Release\
call npm run install-node-prune-win
call npm run prune-node-modules
call npm run package-win
call npm run installer-win

if "%GITHUB_EVENT_NAME%"=="release" (
  node_modules\.bin\sentry-cli --auth-token %SENTRY_TOKEN% upload-dif -o tobias-klein -p ezra-project node_modules\node-sword-interface\build\Release\node_sword_interface.node
  node_modules\.bin\sentry-cli --auth-token %SENTRY_TOKEN% upload-dif -o tobias-klein -p ezra-project node_modules\node-sword-interface\build\Release\node_sword_interface.pdb
)