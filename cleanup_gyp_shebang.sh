#!/bin/sh

find node_modules/node-gyp/gyp -name *.py -exec sed -i 's/\/usr\/bin\/env python/\/usr\/bin\/env python2/g' {} \;

exit 0
