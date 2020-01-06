#!/bin/sh

# This script uses the Python tool 'lizard' to generate metrics about lines of code and cyclomatic complexity.
# To install lizard run the following command as root: pip install https://github.com/terryyin/lizard/archive/master.zip

lizard -H -Tnloc=50 -Tcyclomatic_complexity=10 \
          app \
          build_scripts \
          models \
          migrations \
          main.js \
          node_modules/node-sword-interface/src \
          node_modules/node-sword-interface/*.js > complexity_metrics.html
