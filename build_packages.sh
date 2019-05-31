#!/bin/sh

VERSION=0.8.0

mkdir /tmp/ezra-packages
cd /tmp/ezra-packages

echo "******** Getting latest files from github ******** "
git clone https://github.com/tobias-klein/ezra-project.git ezra-project
cp -a ezra-project ezra-project-ubuntu1804
cp -a ezra-project ezra-project-ubuntu1904
cp -a ezra-project ezra-project-fedora29
cp -a ezra-project ezra-project-centos7

echo ""
echo "******** Building for Ubuntu 18.04 ******** "
docker run -t -v /tmp:/tmp -w /tmp/ezra-packages/ezra-project-ubuntu1804 ubuntu1804.ezra:1.0 /tmp/ezra-packages/ezra-project-ubuntu1804/build.sh
docker run -t -v /tmp:/tmp -w /tmp/ezra-packages/ezra-project-ubuntu1804 ubuntu1804.ezra:1.0 npm run deb_1804
cp /tmp/ezra-packages/ezra-project-ubuntu1804/release/packages/ezra-project-ubuntu1804_${VERSION}_amd64.deb ezra-project_ubuntu1804_${VERSION}_amd64.deb

echo ""
echo "******** Building for Ubuntu 19.04 ******** "
docker run -t -v /tmp:/tmp -w /tmp/ezra-packages/ezra-project-ubuntu1904 ubuntu1904.ezra:1.0 /tmp/ezra-packages/ezra-project-ubuntu1904/build.sh
docker run -t -v /tmp:/tmp -w /tmp/ezra-packages/ezra-project-ubuntu1904 ubuntu1904.ezra:1.0 npm run deb_1904
cp /tmp/ezra-packages/ezra-project-ubuntu1904/release/packages/ezra-project-ubuntu1904_${VERSION}_amd64.deb ezra-project_ubuntu1904_${VERSION}_amd64.deb

echo ""
echo "******** Building for Fedora 29 ******** "
docker run -t -v /tmp:/tmp -w /tmp/ezra-packages/ezra-project-fedora29 fedora.ezra:1.0 /tmp/ezra-packages/ezra-project-fedora29/build.sh
docker run -t -v /tmp:/tmp -w /tmp/ezra-packages/ezra-project-fedora29 fedora.ezra:1.0 npm run rpm_fedora29
cp /tmp/ezra-packages/ezra-project-fedora29/release/packages/ezra-project-${VERSION}.x86_64.rpm ezra-project_fedora29_${VERSION}.x86_64.rpm

echo ""
echo "******** Building for CentOS 7 ******** "
docker run -t -v /tmp:/tmp -w /tmp/ezra-packages/ezra-project-centos7 centos.ezra:1.0 scl enable devtoolset-3 \ /tmp/ezra-packages/ezra-project-centos7/build.sh
docker run -t -v /tmp:/tmp -w /tmp/ezra-packages/ezra-project-centos7 centos.ezra:1.0 npm run rpm_centos7
cp /tmp/ezra-packages/ezra-project-centos7/release/packages/ezra-project-${VERSION}.x86_64.rpm ezra-project_centos7_${VERSION}.x86_64.rpm

