set SENTRY_AUTH_TOKEN=%SENTRY_TOKEN%
call node_modules\.bin\sentry-cli upload-dif -o tobias-klein -p ezra-bible-app node_modules\node-sword-interface\build\Release\node_sword_interface.node
call node_modules\.bin\sentry-cli upload-dif -o tobias-klein -p ezra-bible-app node_modules\node-sword-interface\build\Release\sword.dll
call node_modules\.bin\sentry-cli upload-dif -o tobias-klein -p ezra-bible-app node_modules\node-sword-interface\build\sword-build-win32\lib\node_sword_interface.pdb
call node_modules\.bin\sentry-cli upload-dif -o tobias-klein -p ezra-bible-app node_modules\node-sword-interface\build\sword-build-win32\lib\sword.pdb