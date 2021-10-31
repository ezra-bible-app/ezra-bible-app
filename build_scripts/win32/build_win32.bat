call npm install --arch=ia32
call node_modules\.bin\electron-rebuild.cmd --arch=ia32 -f -o node-sword-interface -v 13.2.3
call copy node_modules\node-sword-interface\build\sword-build-win32\lib\*.dll node_modules\node-sword-interface\build\Release\
call npm config set python C:\Python27\python.exe
call node_modules\.bin\electron-rebuild.cmd --arch=ia32 -f -o sqlite3 -v 13.2.3
call npm run commit-info
