call npm config set PYTHON C:\Python27\python.exe
call npm config ls
call npm install sqlite3@5.0.0 --arch=ia32 --build-from-source --runtime=electron --target=13.2.3 --dist-url=https://electronjs.org/headers --python=C:\\Python27\\python.exe
call node_modules\.bin\electron-rebuild.cmd --arch=ia32 -f -o node-sword-interface -v 13.2.3
call copy node_modules\node-sword-interface\build\sword-build-win32\lib\*.dll node_modules\node-sword-interface\build\Release\
call npm run commit-info