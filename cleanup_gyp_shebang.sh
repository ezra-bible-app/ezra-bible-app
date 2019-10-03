#!/bin/sh

if [ -f /usr/bin/python2 ]
then
    find node_modules/node-gyp/gyp -name *.py -exec sed -i 's/\/usr\/bin\/env python$/\/usr\/bin\/env python2/g' {} \;
    sed -i 's/\/usr\/bin\/python$/\/usr\/bin\/python2/g' node_modules/node-gyp/gyp/samples/samples
fi

exit 0
