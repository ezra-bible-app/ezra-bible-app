#!/bin/sh

VERSION=0.12.1

rm -rf /tmp/ezra-packages
mkdir /tmp/ezra-packages
cd /tmp/ezra-packages

echo "******** Getting latest files from GitHub ******** "
git clone https://github.com/tobias-klein/ezra-project.git ezra-project
cp -a ezra-project ezra-project-ubuntu1804
cp -a ezra-project ezra-project-ubuntu1910
cp -a ezra-project ezra-project-linux-mint18
cp -a ezra-project ezra-project-linux-mint19
cp -a ezra-project ezra-project-buster
cp -a ezra-project ezra-project-fedora29
cp -a ezra-project ezra-project-fedora31
cp -a ezra-project ezra-project-centos8
cp -a ezra-project ezra-project-opensuse-leap

echo ""
echo "******** Building for Ubuntu 18.04 ******** "
docker run --user $(id -u):$(id -g) -t -v /tmp:/tmp -w /tmp/ezra-packages/ezra-project-ubuntu1804 ubuntu1804.ezra:1.0 /tmp/ezra-packages/ezra-project-ubuntu1804/build_scripts/build.sh
docker run --user $(id -u):$(id -g) -t -v /tmp:/tmp -w /tmp/ezra-packages/ezra-project-ubuntu1804 ubuntu1804.ezra:1.0 npm run deb_1804
mv /tmp/ezra-packages/ezra-project-ubuntu1804/release/packages/*.deb /tmp/ezra-packages/ezra-project_ubuntu1804_${VERSION}_amd64.deb

echo ""
echo "******** Building for Ubuntu 19.10 ******** "
docker run --user $(id -u):$(id -g) -t -v /tmp:/tmp -w /tmp/ezra-packages/ezra-project-ubuntu1910 ubuntu1910.ezra:1.0 /tmp/ezra-packages/ezra-project-ubuntu1910/build_scripts/build.sh
docker run --user $(id -u):$(id -g) -t -v /tmp:/tmp -w /tmp/ezra-packages/ezra-project-ubuntu1910 ubuntu1910.ezra:1.0 npm run deb_1910
mv /tmp/ezra-packages/ezra-project-ubuntu1910/release/packages/*.deb /tmp/ezra-packages/ezra-project_ubuntu1910_${VERSION}_amd64.deb

echo ""
echo "******** Building for Linux Mint 18 ******** "
docker run --user $(id -u):$(id -g) -t -v /tmp:/tmp -w /tmp/ezra-packages/ezra-project-linux-mint18 linux-mint18.ezra:1.0 /tmp/ezra-packages/ezra-project-linux-mint18/build_scripts/build.sh
docker run --user $(id -u):$(id -g) -t -v /tmp:/tmp -w /tmp/ezra-packages/ezra-project-linux-mint18 linux-mint18.ezra:1.0 npm run deb_mint18
mv /tmp/ezra-packages/ezra-project-linux-mint18/release/packages/*.deb ezra-project_mint18_${VERSION}_amd64.deb

echo ""
echo "******** Building for Linux Mint 19 ******** "
docker run --user $(id -u):$(id -g) -t -v /tmp:/tmp -w /tmp/ezra-packages/ezra-project-linux-mint19 linux-mint19.ezra:1.0 /tmp/ezra-packages/ezra-project-linux-mint19/build_scripts/build.sh
docker run --user $(id -u):$(id -g) -t -v /tmp:/tmp -w /tmp/ezra-packages/ezra-project-linux-mint19 linux-mint19.ezra:1.0 npm run deb_1804
mv /tmp/ezra-packages/ezra-project-linux-mint19/release/packages/*.deb ezra-project_mint19_${VERSION}_amd64.deb

echo ""
echo "******** Building for Debian 10 Buster ******** "
docker run --user $(id -u):$(id -g) -t -v /tmp:/tmp -w /tmp/ezra-packages/ezra-project-buster debian10.ezra:1.0 /tmp/ezra-packages/ezra-project-buster/build_scripts/build.sh
docker run --user $(id -u):$(id -g) -t -v /tmp:/tmp -w /tmp/ezra-packages/ezra-project-buster debian10.ezra:1.0 npm run deb_buster
mv /tmp/ezra-packages/ezra-project-buster/release/packages/*.deb ezra-project_debian10_${VERSION}_amd64.deb

echo ""
echo "******** Building for Fedora 29 ******** "
docker run --user $(id -u):$(id -g) -t -v /tmp:/tmp -w /tmp/ezra-packages/ezra-project-fedora29 fedora.ezra:1.0 /tmp/ezra-packages/ezra-project-fedora29/build_scripts/build.sh
docker run --user $(id -u):$(id -g) -t -v /tmp:/tmp -w /tmp/ezra-packages/ezra-project-fedora29 fedora.ezra:1.0 npm run rpm_fedora29
mv /tmp/ezra-packages/ezra-project-fedora29/release/packages/*.rpm ezra-project_fedora29_${VERSION}.x86_64.rpm

echo ""
echo "******** Building for Fedora 31 ******** "
docker run --user $(id -u):$(id -g) -t -v /tmp:/tmp -w /tmp/ezra-packages/ezra-project-fedora31 fedora31.ezra:1.0 /tmp/ezra-packages/ezra-project-fedora31/build_scripts/build.sh
docker run --user $(id -u):$(id -g) -t -v /tmp:/tmp -w /tmp/ezra-packages/ezra-project-fedora31 fedora31.ezra:1.0 npm run rpm_fedora29
mv /tmp/ezra-packages/ezra-project-fedora31/release/packages/*.rpm ezra-project_fedora31_${VERSION}.x86_64.rpm

echo ""
echo "******** Building for CentOS 8 ******** "
docker run --user $(id -u):$(id -g) -t -v /tmp:/tmp -w /tmp/ezra-packages/ezra-project-centos8 centos8.ezra:1.0 /tmp/ezra-packages/ezra-project-centos8/build_scripts/build.sh
docker run --user $(id -u):$(id -g) -t -v /tmp:/tmp -w /tmp/ezra-packages/ezra-project-centos8 centos8.ezra:1.0 npm run rpm_centos
mv /tmp/ezra-packages/ezra-project-centos8/release/packages/*.rpm ezra-project_centos8_${VERSION}.x86_64.rpm

echo ""
echo "******** Building for OpenSuse Leap ******** "
docker run --user $(id -u):$(id -g) -t -v /tmp:/tmp -w /tmp/ezra-packages/ezra-project-opensuse-leap opensuse-leap.ezra:1.0 /tmp/ezra-packages/ezra-project-opensuse-leap/build_scripts/build.sh
docker run --user $(id -u):$(id -g) -t -v /tmp:/tmp -w /tmp/ezra-packages/ezra-project-opensuse-leap opensuse-leap.ezra:1.0 npm run rpm_opensuse_leap
mv /tmp/ezra-packages/ezra-project-opensuse-leap/release/packages/*.rpm ezra-project_opensuse_leap_${VERSION}.x86_64.rpm

