/* This file is part of Ezra Project.

   Copyright (C) 2019 - 2020 Tobias Klein <contact@ezra-project.net>

   Ezra Project is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 2 of the License, or
   (at your option) any later version.

   Ezra Project is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Project. See the file LICENSE.
   If not, see <http://www.gnu.org/licenses/>. */

const fs = require('fs');

class PlatformHelper {
  constructor() {
  }

  isTest() {
    return process.argv.includes('--test-type=webdriver');
  }

  isMac() {
    return navigator.platform.match('Mac') !== null;
  }

  isLinux() {
    return navigator.platform.match('Linux') !== null;
  }

  isWin() {
    return navigator.platform.match('Win') !== null;
  }

  isCordova() {
    if (typeof window !== 'undefined' && !!window.cordova) {
      return true;
    }
    
    if (global.cordova !== 'undefined') {
      return true;
    }

    return false;
  }

  // https://github.com/electron/electron/issues/2288
  isElectron() {
    // Renderer process
    if (typeof window !== 'undefined' &&
        typeof window.process === 'object' &&
        window.process.type === 'renderer') {
        
      return true;
    }

    // Main process
    if (typeof process !== 'undefined' &&
        typeof process.versions === 'object' &&
        !!process.versions.electron) {
        
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

  addPlatformCssClass() {
    if (this.isMac()) {
      document.body.classList.add('OSX');
    } else if (this.isLinux()) {
      document.body.classList.add('Linux');
    } else if (this.isWin()) {
      document.body.classList.add('Windows');
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
    } catch(e) {}

    return isMojaveOrLater;
  }

  isWindowsTenOrLater() {
    if (!this.isWin()) {
      return false;
    }

    var isWinTenOrLater = false;

    try {
      var majorOsVersion = this.getMajorOsVersion();

      // see https://docs.microsoft.com/en-us/windows/win32/sysinfo/operating-system-version
      // Windows 10 starts with version 10.*
      isWinTenOrLater = (majorOsVersion >= 10);
    } catch (e) {}

    return isWinTenOrLater;
  }

  showVcppRedistributableMessageIfNeeded() {
    const dep1 = "C:\\Windows\\System32\\vcruntime140.dll";
    const dep2 = "C:\\Windows\\System32\\msvcp140.dll";

    if (!fs.existsSync(dep1) || !fs.existsSync(dep2)) {
      var loadingIndicator = $('#startup-loading-indicator');
      loadingIndicator.addClass('incompatible-windows');
      var loadingIndicatorText = $('.loading-indicator-text');
      var hint = "<h3 style='text-decoration: underline'>Compatibility with older Windows versions</h3>" +
                "Ezra Project needs additional software to run successfully.<br><br>" +
                "Please install <a class='external' href='https://www.microsoft.com/en-us/download/details.aspx?id=53840'>" +
                "Microsoft Visual C++ 2015 Redistributable</a> and restart Ezra Project afterwards.<br>" +
                "On the Microsoft download page, when asked to choose a file, please pick <b>vc_redist.x86.exe</b> for download.";

      loadingIndicatorText.html(hint);
      return true;
    } else {
      return false;
    }
  }
}

module.exports = PlatformHelper;