/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2021 Ezra Bible App Development Team <contact@ezrabibleapp.net>

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

if (isDev) {
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

window.sleep = function(time) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, time);
  });
}

window.waitUntilIdle = function() {
  return new Promise(resolve => {
    window.requestIdleCallback(() => {
      resolve();
    });
  });
}

// based on https://stackoverflow.com/questions/3115150/how-to-escape-regular-expression-special-characters-using-javascript
window.escapeRegExp = function(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

// Extend NodeList with the forEach function from Array
NodeList.prototype.forEach = Array.prototype.forEach;

$.create_xml_doc = function(string)
{
  var doc = (new DOMParser()).parseFromString(string, 'text/xml');
  return doc;
}

window.getReferenceSeparator = async function(moduleCode=undefined) {
  if (moduleCode == undefined) {
    
    return reference_separator;

  } else {
    var moduleReferenceSeparator = reference_separator;
    
    try {
      var localModule = await ipcNsi.getLocalModule(moduleCode);
      moduleReferenceSeparator = await i18nHelper.getSpecificTranslation(localModule.language, 'general.chapter-verse-separator');
    } catch (e) {}
    
    return moduleReferenceSeparator;
  }
}

window.addEventListener('load', function() {
  console.log("load event fired!");

  if (platformHelper.isCordova()) {

    var CordovaPlatform = require('./platform/cordova_platform.js');
    cordovaPlatform = new CordovaPlatform();
    cordovaPlatform.init();

  } else if (platformHelper.isElectron()) {

    var ElectronPlatform = null;

    if (isDev) {
      ElectronPlatform = require('./app/frontend/platform/electron_platform.js');
    } else {
      ElectronPlatform = require('./platform/electron_platform.js');
    }

    electronPlatform = new ElectronPlatform();

    console.log("Initializing app on Electron platform ...");
    startup.initApplication();

  } else {

    console.error("FATAL: Unknown platform");
    startup.initApplication();
  }
});

if (platformHelper.isCordova() || platformHelper.isTest()) {
  $('#loading-subtitle').show();
}
