call npm config ls
REM echo *** Building sqlite3 ***
REM call npm install sqlite3@5.1.6 --build-from-source --runtime=electron --target=32.2.3 --dist-url=https://electronjs.org/headers --target_arch=ia32
REM if %ERRORLEVEL% GEQ 1 EXIT /B 1
REM echo *** Installing all other dependencies ***
call npm install --arch=ia32
if %ERRORLEVEL% GEQ 1 EXIT /B 1
echo *** Generating commit info ***
call npm run add-github-workspace-to-safe-git-dirs
call npm run commit-info
