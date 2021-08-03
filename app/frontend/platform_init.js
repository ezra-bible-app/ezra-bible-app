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
 * This is the entry point to Ezra Bible App. The entry function is
 * `initPlatform()`. The script runs some initial platform compatibility checks.
 * On Android it shows a message box if the used webview component is not supported.
 * Note that the code in this script cannot make use of any modern JavaScript features,
 * because on Android it needs to at least successfully run on older webview components to
 * show the respective info message. Once the compatibility checks are completed this script
 * then dynamically loads the module `ezra_init.js`.
 * @module platform_init
 * @category Startup
 */



const CHROMIUM_VERSION_MIN = 57; // Do not support Chromium/WebView below the version that supports ES2017 and CSS grid
const CHROMIUM_VERSION_UP_TO_DATE = 83; // Version that works without extra hacks

window.initPlatform = function() {
  if (isAndroidWebView()) {
    const webViewVersion = getChromiumMajorVersion();
    
    if (webViewVersion) {
      if (webViewVersion >=  CHROMIUM_VERSION_MIN) {
        loadScript('cordova.js');

        console.log("Using customizable theme.css!");
        document.getElementById("cordova-theme-css").href = "file:///sdcard/Android/data/net.ezrabibleapp.cordova/theme.css";

        window.isDev = false;

        loadScript('dist/ezra_init.js');

      } else {
        console.log(`Android WebView is too old (< ${CHROMIUM_VERSION_MIN}). Cannot continue!`);

        window.addEventListener('load', showOutdatedWebviewMessage);
      }
    } else {
      // This should never happen!!!

      console.error("Could not check whether ES2017 is supported or not!");

      window.addEventListener('load', showIncompatibleWebviewMessage);
    }
  } else { // Electron!

    window.isDev = false;

    if (typeof window !== 'undefined' &&
        typeof window.process === 'object' &&
        window.process.type === 'renderer') {
      
      // We only require these modules when running on Electron
      require('v8-compile-cache');
      require('log-timestamp');

      window.isDev = require('electron-is-dev');
    }

    if (isDev) {
      console.log("DEV mode: Loading app/frontend/ezra_init.js");
      loadScript('app/frontend/ezra_init.js');
    } else {
      console.log('PRODUCTION mode: Loading dist/ezra_init.js');
      loadScript('dist/ezra_init.js');
    }
  }
};

window.loadScript = function(script) {
  var head = document.getElementsByTagName('head')[0];
  var js = document.createElement("script");
  js.type = "text/javascript";
  js.src = script;
  head.appendChild(js);
};

window.getChromiumVersion = function() {
  var userAgent = navigator.userAgent;
  var splittedUserAgent = userAgent.split(' ');
  var chromiumVersion = null;

  for (var i = 0; i < splittedUserAgent.length; i++) {
    if (splittedUserAgent[i].indexOf('Chrome/') != -1) {
      chromiumVersion = splittedUserAgent[i].replace('Chrome/', '');
      break;
    }
  }

  return chromiumVersion;
};

window.isChromiumOlder = function() {
  return window.getChromiumMajorVersion() < CHROMIUM_VERSION_UP_TO_DATE;
};

function getChromiumMajorVersion() {
  var chromiumVersion = window.getChromiumVersion();
  var splittedVersion = chromiumVersion.split('.');
  chromiumVersion = parseInt(splittedVersion[0]);
  return chromiumVersion;
}

function isAndroidWebView() {
  return navigator.userAgent.indexOf('; wv') != -1;
}

function getOutdatedWebViewMessage() {
  var chromiumVersion = getChromiumMajorVersion();

  var generalInfoBoxMessage = `
Your Android WebView component is too old (${chromiumVersion}) and does not support Ezra Bible App.<br><br>
To run Ezra Bible App you need a newer version of the <b>Android System WebView</b> component, at least version ${CHROMIUM_VERSION_MIN}.<br><br>
You can install a newer version of that app from the Play Store!`;

  return generalInfoBoxMessage;
}

function showOutdatedWebviewMessage() {
  var title = 'Android WebView not compatible!';
  var message = getOutdatedWebViewMessage();

  showMessage(title, message);
}

function showIncompatibleWebviewMessage() {
  var title = "Android WebView not compatible!";
  var message = "The exact Android WebView version is not available for some reason. Compatibility is unclear.<br>" +
                "Try to install a newer version of the <b>Android System WebView</b> component from the Play Store.";

  showMessage(title, message);
}

function showMessage(title, message) {
  var loadingIndicator = $('#startup-loading-indicator');
  loadingIndicator.hide();
  $('#main-content').show();

  var generalInfoBoxBox = $('#general-info-box');
  var generalInfoBoxBoxContent = $('#general-info-box-content');

  generalInfoBoxBoxContent.html(message);

  generalInfoBoxBox.dialog({
    title: title,
    width: 400,
    autoOpen: true,
    dialogClass: 'ezra-dialog dialog-without-close-button android-dialog-large-fontsize',
    modal: true,
    resizable: false
  });
}
