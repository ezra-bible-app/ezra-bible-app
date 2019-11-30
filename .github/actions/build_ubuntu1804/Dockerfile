# Dockerfile for Ubuntu 18.04 Build Enviroment for Ezra Project

FROM ubuntu:18.04

ENV DEBIAN_FRONTEND=noninteractive

RUN sed -i -e 's/:\/\/(archive.ubuntu.com\|security.ubuntu.com)/old-releases.ubuntu.com/g' /etc/apt/sources.list

RUN apt-get update
RUN apt-get install -y dialog apt-utils build-essential libsword-dev libsqlite3-0 libcurl4-gnutls-dev libicu-dev \
                       pkg-config icu-devtools subversion git vim sudo curl python3-software-properties cmake

RUN curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -
RUN apt-get update
RUN apt-get install -y nodejs

RUN npm install -g electron-packager
RUN npm install -g electron-installer-debian
RUN apt-get install -y unzip

COPY build.sh /build.sh

ENTRYPOINT ["/build.sh"]
