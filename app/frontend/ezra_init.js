/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2026 Ezra Bible App Development Team <contact@ezrabibleapp.net>

   Ezra Bible App is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 2 of the License, or
   (at your option) any later version.

   Ezra Bible App is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Bible App. See the file LICENSE.
   If not, see <http://www.gnu.org/licenses/>. */

/**
 * This module is the second one loaded (after platform_init.js) and handles the app's `load` event.
 * It then detects whether we are running on Electron or Cordova and initiates the corresponding startup logic.
 * @module ezra_init
 * @category Startup 
 */

window.app = null;

// Platform Helper
var PlatformHelper = null;
var Startup = null;

if (window.isElectron) {
  PlatformHelper = require('./app/lib/platform_helper.js');
  Startup = require('./app/frontend/startup.js');
} else {
  PlatformHelper = require('../lib/platform_helper.js');
  Startup = require('./startup.js');
}

window.platformHelper = new PlatformHelper();
window.startup = new Startup();
window.cordovaPlatform = null;
window.electronPlatform = null;

// Extend NodeList with the forEach function from Array
NodeList.prototype.forEach = Array.prototype.forEach;

$.create_xml_doc = function(string)
{
  var doc = (new DOMParser()).parseFromString(string, 'text/xml');
  return doc;
};

window.addEventListener('load', function() {
  console.log("load event fired!");

  window.startup.earlyRestoreLocalizedString();

  if (platformHelper.isCordova()) {

    const CordovaPlatform = require('./platform/cordova_platform.js');
    window.cordovaPlatform = new CordovaPlatform();
    window.cordovaPlatform.init();

  } else if (platformHelper.isElectron()) {

    const ElectronPlatform = require('./app/frontend/platform/electron_platform.js');
    window.electronPlatform = new ElectronPlatform();

    console.log("Initializing app on Electron platform ...");
    window.startup.initApplication();

  } else {

    console.error("FATAL: Unsupported platform");
    window.startup.initApplication();
  }
});

if (platformHelper.isCordova() || platformHelper.isTest()) {
  $('#loading-subtitle').show();
}
