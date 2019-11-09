#!/bin/sh

echo '# Ezra Project LOC Metrics' > LOC_METRICS.md
cloc --md app \
          build_scripts \
          css \
          html \
          locales \
          models \
          migrations \
          package_config \
          seeders \
          templates \
          index.html \
          main.js \
          package.json \
          node_modules/node-sword-interface/src \
          node_modules/node-sword-interface/*.md \
          node_modules/node-sword-interface/*.sh \
          node_modules/node-sword-interface/*.bat \
          node_modules/node-sword-interface/*.js \
          *.md | tail -n +4 >> LOC_METRICS.md

echo "" >> LOC_METRICS.md
echo "The above metrics include both the frontend (mostly JavaScript) \
and the [backend](https://github.com/tobias-klein/node-sword-interface) (mostly C++)." >> LOC_METRICS.md

DATE=`date`
echo "" >> LOC_METRICS.md
printf "Generated on ${DATE} using [cloc](https://github.com/AlDanial/cloc)." >> LOC_METRICS.md