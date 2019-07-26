call npm install electron@4.2.6 --arch=ia32
call npm install --arch=ia32
call node_modules\.bin\electron-rebuild.cmd --arch=ia32 -f -w node-sword-interface -v 4.2.6
call copy node_modules\node-sword-interface\build\sword-win32\lib\*.dll node_modules\node-sword-interface\build\Release\
