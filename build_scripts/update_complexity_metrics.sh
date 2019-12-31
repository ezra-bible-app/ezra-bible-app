#!/bin/sh

lizard -H app \
          build_scripts \
          models \
          migrations \
          main.js \
          node_modules/node-sword-interface/src \
          node_modules/node-sword-interface/*.js > complexity_metrics.html
