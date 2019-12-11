#!/bin/sh

npm run package-linux
sudo rm -rf /usr/local/ezra-project-linux-x64
sudo cp -a release/ezra-project-linux-x64 /usr/local/ezra-project-linux-x64
