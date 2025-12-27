/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2025 Ezra Bible App Development Team <contact@ezrabibleapp.net>

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

class PlatformHelper {
  constructor() {
  }

  isTest() {
    if (this.isElectron()) {
      return process.env.EZRA_TESTING == "true";
    } else {
      return false;
    }
  }

  async isDebug() {
    if (this.isElectron()) {

      if (this.isElectronMain()) {
        return global.isDev;
      } else {
        return window.isDev;
      }

    } else if (this.isCordovaFrontend()) {

      var CordovaPlatform = require('../frontend/platform/cordova_platform.js');
      var cordovaPlatform = new CordovaPlatform();
      return await cordovaPlatform.isDebug();

    } else if (this.isCordovaBackend()) {

      return global.main.isDebug;
    }
  }

  isMac() {
    if (typeof navigator !== 'undefined') {
      return navigator.platform.match('Mac') !== null;
    } else if (typeof process !== 'undefined') {
      return process.platform === 'darwin';
    }

    return false;
  }

  isLinux() {
    if (typeof navigator !== 'undefined') {
      return navigator.platform.match('Linux') !== null &&
      navigator.platform.match('arm') === null; // This is to ensure that we do not treat Android as "Linux"
    } else {
      return process.platform === 'linux';
    }
  }

  isWin() {
    if (typeof navigator !== 'undefined') {
      return navigator.platform.match('Win') !== null;
    } else {
      return process.platform === 'win32';
    }
  }

  isAndroid() {
    if (typeof navigator !== 'undefined') {
      return navigator.userAgent.match('Android') !== null;
    } else if (this.isCordova()) {
      return device.platform === 'Android';
    }

    return false;
  }

  isIOS() {
    if (typeof navigator !== 'undefined') {
      return navigator.userAgent.match('iPhone') !== null || navigator.userAgent.match('iPad') !== null;
    } else if (this.isCordova()) {
      return device.platform === 'iOS';
    }

    return false;
  }

  isCordova() {
    if (this.isCordovaFrontend() || this.isCordovaBackend()){
      return true;
    } 
    
    return false;
  }

  isCordovaBackend() {
    return (typeof global !== 'undefined' && !!global.cordova);
  } 

  isCordovaFrontend() {
    return (typeof window !== 'undefined' && !!window.cordova);
  }

  isElectronRenderer() {
    return typeof window !== 'undefined' &&
           typeof window.process === 'object' &&
           window.process.type === 'renderer';
  }

  isElectronMain() {
    return typeof process !== 'undefined' &&
           typeof process.versions === 'object' &&
           !!process.versions.electron;
  }

  // https://github.com/electron/electron/issues/2288
  isElectron() {
    // Renderer process
    if (this.isElectronRenderer()) {
      return true;
    }

    // Main process
    if (this.isElectronMain()) {
      return true;
    }

    // Detect the user agent when the `nodeIntegration` option is set to true
    if (typeof navigator === 'object' &&
        typeof navigator.userAgent === 'string'
        && navigator.userAgent.indexOf('Electron') >= 0) {
      
      return true;
    }

    return false;
  }

  isSupportedPlatform() {
    return this.isElectron() || this.isCordova();
  }

  isMobile() {
    const MAX_MOBILE_PIXELS = 450;
    return window.innerWidth <= MAX_MOBILE_PIXELS || window.innerHeight <= MAX_MOBILE_PIXELS;
  }

  isSmallScreen() {
    const MAX_SMALL_SCREEN_PIXELS = 650;
    return window.innerWidth <= MAX_SMALL_SCREEN_PIXELS || window.innerHeight <= MAX_SMALL_SCREEN_PIXELS;
  }

  addPlatformCssClass(element=undefined) {
    if (element === undefined) {
      element = document.body;
    }

    if (this.isMac()) {
      element.classList.add('OSX');
    } else if (this.isCordova()) {
      element.classList.add('Cordova');
      if (window.isChromiumOlder()) {
        element.classList.add('webview-older'); // in Android it's possible to have lower versions of WebView
      }

      if (this.isAndroid()) {
        element.classList.add('Android');
      } else if (this.isIOS()) {
        element.classList.add('IOS');
      }

    } else if (this.isLinux()) {
      element.classList.add('Linux');
    } else if (this.isWin()) {
      element.classList.add('Windows');
    }
  }

  getMajorOsVersion() {
    var releaseVersion = require('os').release();
    var splittedVersion = releaseVersion.split('.');
    var majorDigit = parseInt(splittedVersion[0]);
    return majorDigit;
  }

  isMacOsMojaveOrLater() {
    if (!this.isMac()) {
      return false;
    }

    var isMojaveOrLater = false;

    try {
      var majorOsVersion = this.getMajorOsVersion();

      // see https://en.wikipedia.org/wiki/Darwin_(operating_system)#Release_history
      // macOS Mojave starts with the Darwin kernel version 18.0.0
      isMojaveOrLater = (majorOsVersion >= 18);

    // eslint-disable-next-line no-empty
    } catch (e) {}

    return isMojaveOrLater;
  }

  async isWindowsTenOrLater() {
    if (!this.isWin()) {
      return false;
    }

    var isWinTenOrLater = false;

    try {
      var majorOsVersion = this.getMajorOsVersion();
      if (majorOsVersion == undefined) {
        return undefined;
      }

      // see https://docs.microsoft.com/en-us/windows/win32/sysinfo/operating-system-version
      // Windows 10 starts with version 10.*
      isWinTenOrLater = (majorOsVersion >= 10);
    } catch (e) {
      return undefined;
    }

    return isWinTenOrLater;
  }

  showVcppRedistributableMessageIfNeeded() {
    const fs = require('fs');

    const dep1 = "C:\\Windows\\System32\\vcruntime140.dll";
    const dep2 = "C:\\Windows\\System32\\msvcp140.dll";

    if (!fs.existsSync(dep1) || !fs.existsSync(dep2)) {
      var loadingIndicator = $('#startup-loading-indicator');
      loadingIndicator.addClass('incompatible-windows');
      var loadingIndicatorText = $('.loading-indicator-text');
      var hint = "<h3 style='text-decoration: underline'>Compatibility with older Windows versions</h3>" +
                "Ezra Bible App needs additional software to run successfully.<br><br>" +
                "Please install <a class='external' href='https://www.microsoft.com/en-us/download/details.aspx?id=53840'>" +
                "Microsoft Visual C++ 2015 Redistributable</a> and restart Ezra Bible App afterwards.<br>" +
                "On the Microsoft download page, when asked to choose a file, please pick <b>vc_redist.x86.exe</b> for download.";

      loadingIndicatorText.html(hint);
      return true;
    } else {
      return false;
    }
  }

  getUserDataPath(androidVersion=undefined) {
    if (this.isElectron()) {

      const { app } = require('electron');
      const path = require('path');
      let pjson = null;

      try {
        pjson = require('../../package.json');
      } catch (error) {
        pjson = null;
        console.warn('Could not read package.json!');
      }

      let appName = null;

      if (pjson == null) {
        // This happened on Windows before (see the exception catching above!);
        appName = 'ezra-bible-app';

      } else if (this.isWin()) {
        // On Windows we use productName (containing spaces) for the user data path.
        appName = pjson.productName; 

      } else {
        // On other platforms we use the name attribute, which is more unix-style.
        appName = pjson.name;
      }

      if (this.isTest()) {
        appName += '-test';
      }

      const userDataDir = path.join(app.getPath('appData'), appName);
      return userDataDir;

    } else if (this.isCordova()) {

      let userDataDir = "";

      if (androidVersion !== undefined && androidVersion >= 11) {
        userDataDir = cordova.app.datadir() + '/ezra';
      } else {
        const appId = 'net.ezrabibleapp.cordova';
        // TODO adapt this for ios later
        userDataDir = `/sdcard/Android/data/${appId}`;
      }

      return userDataDir;
    }
  }

  getSearchResultPerformanceLimit() {
    if (this.isElectron()) {
      return 500;
    } else if (this.isCordova()) {
      return 100;
    } 
  }

  getIziPosition() {
    let msgPosition = 'bottomRight';

    if (this.isCordova()) {
      msgPosition = 'topCenter';
    }

    return msgPosition;
  }
}

module.exports = PlatformHelper;
