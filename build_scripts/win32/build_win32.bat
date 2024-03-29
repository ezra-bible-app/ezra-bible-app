REM echo *** Changing NPM configuration to use Python 2.7 ***
REM call npm config set python python2.7
call npm config ls
echo *** Building sqlite3 ***
call npm install sqlite3@5.1.6 --build-from-source --runtime=electron --target=17.1.0 --dist-url=https://electronjs.org/headers --target_arch=ia32
if %ERRORLEVEL% GEQ 1 EXIT /B 1
echo *** Installing all other dependencies ***
call npm install --arch=ia32
if %ERRORLEVEL% GEQ 1 EXIT /B 1
echo *** Rebuilding node-sword-interface ***
call node_modules\.bin\electron-rebuild.cmd --arch=ia32 -f -o node-sword-interface -v 17.1.0
call copy node_modules\node-sword-interface\build\sword-build-win32\lib\*.dll node_modules\node-sword-interface\build\Release\
echo *** Generating commit info ***
call npm run commit-info