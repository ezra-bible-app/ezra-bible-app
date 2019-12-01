call npm install electron@7.1.1 --arch=ia32
call npm install --arch=ia32
call npm run install-node-prune
call node_modules\.bin\electron-rebuild.cmd --arch=ia32 -f -w node-sword-interface -v 7.1.1
call npm run prune-node-modules
call copy node_modules\node-sword-interface\build\sword-win32\lib\*.dll node_modules\node-sword-interface\build\Release\
call npm run package-win
call npm run installer-win
