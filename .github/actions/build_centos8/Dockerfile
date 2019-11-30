# Dockerfile for CentOS 8 Build Enviroment for Ezra Project

FROM centos:8

RUN yum update -y
RUN yum install -y sudo
RUN yum install -y nodejs
RUN yum -y install epel-release
RUN dnf group install -y "Development Tools"

RUN yum install -y libsqlite3x-devel.x86_64 libicu-devel libcurl-devel subversion unzip cmake

RUN yum install -y python2
RUN ln -s /usr/bin/python2 /usr/bin/python

RUN yum install -y rpm-build
RUN npm install -g electron-installer-redhat

COPY build.sh /build.sh

ENTRYPOINT ["/build.sh"]
