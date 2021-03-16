/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2021 Tobias Klein <contact@ezra-project.net>

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

window.app = null;

// Platform Helper
var PlatformHelper = null;
var StartupController = null;

if (isDev) {
  PlatformHelper = require('./app/lib/platform_helper.js');
  StartupController = require('./app/frontend/controllers/startup_controller.js');
} else {
  PlatformHelper = require('../lib/platform_helper.js');
  StartupController = require('./controllers/startup_controller.js');
}

window.platformHelper = new PlatformHelper();
window.startup_controller = new StartupController();
window.cordovaPlatform = null;

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

    console.log("Initializing app on Electron platform ...");
    startup_controller.initApplication();

  } else {

    console.error("FATAL: Unknown platform");
    startup_controller.initApplication();
  }
});

if (platformHelper.isCordova() || platformHelper.isTest()) {
  $('#loading-subtitle').show();
}
