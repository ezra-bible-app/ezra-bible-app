#!/bin/sh

VERSION=0.10.0

rm -rf /tmp/ezra-packages
mkdir /tmp/ezra-packages
cd /tmp/ezra-packages

echo "******** Getting latest files from GitHub ******** "
git clone https://github.com/tobias-klein/ezra-project.git ezra-project
cp -a ezra-project ezra-project-ubuntu1804
cp -a ezra-project ezra-project-ubuntu1904
cp -a ezra-project ezra-project-linux-mint18
cp -a ezra-project ezra-project-buster
cp -a ezra-project ezra-project-fedora29
cp -a ezra-project ezra-project-centos7
cp -a ezra-project ezra-project-centos8
cp -a ezra-project ezra-project-opensuse-leap

#echo ""
#echo "******** Building for Ubuntu 18.04 ******** "
#docker run --user $(id -u):$(id -g) -t -v /tmp:/tmp -w /tmp/ezra-packages/ezra-project-ubuntu1804 ubuntu1804.ezra:1.0 /tmp/ezra-packages/ezra-project-ubuntu1804/build.sh
#docker run --user $(id -u):$(id -g) -t -v /tmp:/tmp -w /tmp/ezra-packages/ezra-project-ubuntu1804 ubuntu1804.ezra:1.0 npm run deb_1804
#cp /tmp/ezra-packages/ezra-project-ubuntu1804/release/packages/ezra-project_${VERSION}_amd64.deb ezra-project_ubuntu1804_${VERSION}_amd64.deb

#echo ""
#echo "******** Building for Ubuntu 19.04 ******** "
#docker run --user $(id -u):$(id -g) -t -v /tmp:/tmp -w /tmp/ezra-packages/ezra-project-ubuntu1904 ubuntu1904.ezra:1.0 /tmp/ezra-packages/ezra-project-ubuntu1904/build.sh
#docker run --user $(id -u):$(id -g) -t -v /tmp:/tmp -w /tmp/ezra-packages/ezra-project-ubuntu1904 ubuntu1904.ezra:1.0 npm run deb_1904
#cp /tmp/ezra-packages/ezra-project-ubuntu1904/release/packages/ezra-project_${VERSION}_amd64.deb ezra-project_ubuntu1904_${VERSION}_amd64.deb

#echo ""
#echo "******** Building for Linux Mint 18 ******** "
#docker run --user $(id -u):$(id -g) -t -v /tmp:/tmp -w /tmp/ezra-packages/ezra-project-linux-mint18 linux-mint18.ezra:1.0 /tmp/ezra-packages/ezra-project-linux-mint18/build.sh
#docker run --user $(id -u):$(id -g) -t -v /tmp:/tmp -w /tmp/ezra-packages/ezra-project-linux-mint18 linux-mint18.ezra:1.0 npm run deb_mint18
#cp /tmp/ezra-packages/ezra-project-linux-mint18/release/packages/ezra-project_${VERSION}_amd64.deb ezra-project_mint18_${VERSION}_amd64.deb

#echo ""
#echo "******** Building for Debian 10 Buster ******** "
#docker run --user $(id -u):$(id -g) -t -v /tmp:/tmp -w /tmp/ezra-packages/ezra-project-buster debian10.ezra:1.0 /tmp/ezra-packages/ezra-project-buster/build.sh
#docker run --user $(id -u):$(id -g) -t -v /tmp:/tmp -w /tmp/ezra-packages/ezra-project-buster debian10.ezra:1.0 npm run deb_buster
#cp /tmp/ezra-packages/ezra-project-buster/release/packages/ezra-project_${VERSION}_amd64.deb ezra-project_debian10_${VERSION}_amd64.deb

#echo ""
#echo "******** Building for Fedora 29 ******** "
#docker run --user $(id -u):$(id -g) -t -v /tmp:/tmp -w /tmp/ezra-packages/ezra-project-fedora29 fedora.ezra:1.0 /tmp/ezra-packages/ezra-project-fedora29/build.sh
#docker run --user $(id -u):$(id -g) -t -v /tmp:/tmp -w /tmp/ezra-packages/ezra-project-fedora29 fedora.ezra:1.0 npm run rpm_fedora29
#cp /tmp/ezra-packages/ezra-project-fedora29/release/packages/ezra-project-${VERSION}-1.x86_64.rpm ezra-project_fedora29_${VERSION}.x86_64.rpm

#echo ""
#echo "******** Building for CentOS 7 ******** "
#docker run --user $(id -u):$(id -g) -t -v /tmp:/tmp -w /tmp/ezra-packages/ezra-project-centos7 centos7.ezra:1.0 scl enable devtoolset-3 \ /tmp/ezra-packages/ezra-project-centos7/build.sh
#docker run --user $(id -u):$(id -g) -t -v /tmp:/tmp -w /tmp/ezra-packages/ezra-project-centos7 centos7.ezra:1.0 npm run rpm_centos
#cp /tmp/ezra-packages/ezra-project-centos7/release/packages/ezra-project-${VERSION}-1.x86_64.rpm ezra-project_centos7_${VERSION}.x86_64.rpm

echo ""
echo "******** Building for CentOS 8 ******** "
docker run --user $(id -u):$(id -g) -t -v /tmp:/tmp -w /tmp/ezra-packages/ezra-project-centos8 centos8.ezra:1.0 /tmp/ezra-packages/ezra-project-centos8/build.sh
docker run --user $(id -u):$(id -g) -t -v /tmp:/tmp -w /tmp/ezra-packages/ezra-project-centos8 centos8.ezra:1.0 npm run rpm_centos
cp /tmp/ezra-packages/ezra-project-centos8/release/packages/ezra-project-${VERSION}-1.x86_64.rpm ezra-project_centos8_${VERSION}.x86_64.rpm

#echo ""
#echo "******** Building for OpenSuse Leap ******** "
#docker run --user $(id -u):$(id -g) -t -v /tmp:/tmp -w /tmp/ezra-packages/ezra-project-opensuse-leap opensuse-leap.ezra:1.0 /tmp/ezra-packages/ezra-project-opensuse-leap/build.sh
#docker run --user $(id -u):$(id -g) -t -v /tmp:/tmp -w /tmp/ezra-packages/ezra-project-opensuse-leap opensuse-leap.ezra:1.0 npm run rpm_opensuse_leap
#cp /tmp/ezra-packages/ezra-project-opensuse-leap/release/packages/ezra-project-${VERSION}-1.x86_64.rpm ezra-project_opensuse_leap_${VERSION}.x86_64.rpm

