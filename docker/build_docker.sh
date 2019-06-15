#!/bin/bash

docker build --build-arg HOST_USER=${USER} -t ubuntu1804.ezra:1.0 -f Ubuntu1804_Dockerfile .
docker build --build-arg HOST_USER=${USER} -t ubuntu1904.ezra:1.0 -f Ubuntu1904_Dockerfile .
