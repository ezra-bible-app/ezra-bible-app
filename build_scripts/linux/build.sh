#!/bin/sh
# This script triggers all the steps necessary for building and packaging Ezra Bible App on Linux.

npm install
npm run compile-pug
npm run commit-info
npm run install-node-prune
npm i node-pre-gyp rebuild
#npm run rebuild
npm run prune-node-modules
rm -rf /tmp/electron-packager &> /dev/null
npm run purge-build-artifacts

if which rpm >/dev/null; then
    if [ -n "$(rpm -qa)" ] 2>/dev/null; then
        # The rpm package database has some content, we assume we're on an rpm-based system.
        # Here we need to clean up the gyp shebangs, because otherwise we will get these error messages during packaging:
        # *** ERROR: ambiguous python shebang in /usr/lib/ezra-project/resources/app/node_modules/node-gyp/gyp/samples/samples: #!/usr/bin/python.
        # Change it to python3 (or python2) explicitly.
        npm run cleanup-gyp-shebang
    fi
fi

npm run package-linux
