'use strict';

/**
 * Fix electron-installer-redhat's RPM install command for Fedora CI builds.
 *
 * The installer stages application files under BUILD/usr, but its generated
 * spec uses the relative path usr/* during rpmbuild's %install phase. Modern
 * rpmbuild runs that phase from a package-specific build directory, where that
 * relative path does not exist. Point the spec at the staging directory under
 * %{_topdir} instead. The Fedora workflow runs this after installing the
 * pinned installer and before creating the RPM.
 *
 * Fail if the upstream template no longer has the expected command so an
 * installer update cannot silently skip this workaround.
 */
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
