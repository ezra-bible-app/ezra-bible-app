# Dockerfile for Linux Mint 19.3 Build Enviroment for Ezra Project

FROM toklein/linux-mint:dev-0647ae0

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get install -y dialog build-essential libsword-dev libsqlite3-0 libcurl4-gnutls-dev libicu-dev \
                       pkg-config icu-devtools subversion git vim sudo curl python3-software-properties cmake

RUN apt-get install -y curl python3-software-properties
RUN curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -
RUN apt-get update
RUN apt-get install -y nodejs
RUN apt-get install -y unzip

RUN npm install -g electron-packager
RUN npm install -g electron-installer-debian

COPY build.sh /build.sh

ENTRYPOINT ["/build.sh"]
