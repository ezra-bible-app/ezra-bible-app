#!/bin/bash

docker build --build-arg HOST_USER=${USER} -t ubuntu1804.ezra:1.0 -f Ubuntu1804_Dockerfile .
docker build --build-arg HOST_USER=${USER} -t ubuntu1904.ezra:1.0 -f Ubuntu1904_Dockerfile .
docker build --build-arg HOST_USER=${USER} -t linux-mint18.ezra:1.0 -f LinuxMint_Dockerfile .
docker build --build-arg HOST_USER=${USER} -t centos.ezra:1.0 -f CentOS_Dockerfile .
docker build --build-arg HOST_USER=${USER} -t fedora.ezra:1.0 -f Fedora_Dockerfile .
docker build --build-arg HOST_USER=${USER} -t opensuse-leap.ezra:1.0 -f OpenSuse_Dockerfile .
