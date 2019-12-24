# Dockerfile for OpenSuse Build Enviroment for Ezra Project

FROM opensuse/leap:15.1

RUN zypper --gpg-auto-import-keys refresh

RUN zypper install -y sudo gcc-c++ make vim git subversion cmake nodejs npm rpm-build unzip curl
RUN zypper install -y libcurl-devel libicu-devel sqlite3-devel

RUN npm install -g https://github.com/electron-userland/electron-installer-redhat/tarball/master

COPY build.sh /build.sh

ENTRYPOINT ["/build.sh"]
