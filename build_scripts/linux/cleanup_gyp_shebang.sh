#!/bin/sh

# The package node-gyp (Node.js native addon build tool) still depends on Python 2. However, this causes problems with rpm-build.
# The following snippet basically changes all plain Python shebangs of the node-gyp Python scripts to a specific Python 2 shebang

echo "Converting generic Python shebangs in node_modules/node-gyp/* to explicit Python 2 shebangs ..."

find node_modules/node-gyp/gyp -name *.py -exec sed -i 's/\/usr\/bin\/env python$/\/usr\/bin\/env python2/g' {} \;
sed -i 's/\/usr\/bin\/python$/\/usr\/bin\/python2/g' node_modules/node-gyp/gyp/samples/samples

find node_modules/sqlite3/node_modules/node-gyp/gyp -name *.py -exec sed -i 's/\/usr\/bin\/env python$/\/usr\/bin\/env python2/g' {} \;
sed -i 's/\/usr\/bin\/python$/\/usr\/bin\/python2/g' node_modules/sqlite3/node_modules/node-gyp/gyp/samples/samples

exit 0
