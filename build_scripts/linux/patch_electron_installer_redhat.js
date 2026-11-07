'use strict';

const fs = require('fs');
const path = require('path');

const specTemplatePath = path.join(
  __dirname,
  '../../node_modules/electron-installer-redhat/resources/spec.ejs'
);
const originalInstallCommand = 'usr/* %{buildroot}/usr/';
const patchedInstallCommand = '%{_topdir}/BUILD/usr/* %{buildroot}/usr/';

const specTemplate = fs.readFileSync(specTemplatePath, 'utf8');
const occurrences = specTemplate.split(originalInstallCommand).length - 1;

if (occurrences !== 1) {
  throw new Error(
    `Expected one '${originalInstallCommand}' in ${specTemplatePath}, found ${occurrences}`
  );
}

fs.writeFileSync(
  specTemplatePath,
  specTemplate.replace(originalInstallCommand, patchedInstallCommand)
);
