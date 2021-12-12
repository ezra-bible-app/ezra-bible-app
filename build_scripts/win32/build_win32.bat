echo *** Changing NPM configuration to use Python 2.7 ***
call npm config set python python2.7
call npm config ls
echo *** Building sqlite3 ***
call npm install sqlite3@5.0.0 --build-from-source --runtime=electron --target=13.2.3 --dist-url=https://electronjs.org/headers --target_arch=ia32
echo *** Installing all other dependencies ***
call npm install --arch=ia32
echo *** Rebuilding node-sword-interface ***
call node_modules\.bin\electron-rebuild.cmd --arch=ia32 -f -o node-sword-interface -v 13.2.3
call copy node_modules\node-sword-interface\build\sword-build-win32\lib\*.dll node_modules\node-sword-interface\build\Release\
echo *** Generating commit info ***
call npm run commit-info