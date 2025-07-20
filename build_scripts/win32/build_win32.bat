call npm config ls
echo *** Install sqlite3 ***
call npm install sqlite3@5.1.7 --target_arch=ia32
if %ERRORLEVEL% GEQ 1 EXIT /B 1
echo *** Installing all other dependencies ***
call npm install --arch=ia32
if %ERRORLEVEL% GEQ 1 EXIT /B 1
echo *** Generating commit info ***
call npm run add-github-workspace-to-safe-git-dirs
call npm run commit-info
