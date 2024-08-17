/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2024 Ezra Bible App Development Team <contact@ezrabibleapp.net>

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

const PlatformHelper = require('../../lib/platform_helper.js');
const IpcMain = require('./ipc_main.js');

global.connectionType = undefined;

class IpcGeneralHandler {
  constructor() {
    this._ipcMain = new IpcMain();
    this._platformHelper = new PlatformHelper();
    this.initIpcInterface();
  }

  initIpcInterface() {
    if (this._platformHelper.isCordova()) {
      this._ipcMain.add('general_initPersistentIpc', async(androidVersion=undefined) => {
        return global.main.initPersistentIpc(androidVersion);
      });

      this._ipcMain.add('general_initDatabase', async(androidVersion=undefined, connectionType=undefined) => {
        global.connectionType = connectionType;
        return global.main.initDatabase(androidVersion, connectionType);
      });
    }

    this._ipcMain.add('general_setConnectionType', async (connectionType) => {
      global.connectionType = connectionType;
    });

    this._ipcMain.add('general_getMajorOsVersion', async () => {
      var releaseVersion = require('os').release();
      var splittedVersion = releaseVersion.split('.');
      var majorDigit = parseInt(splittedVersion[0]);
      return majorDigit;
    });

    this._ipcMain.add('general_getAppVersion', async () => {
      var pjson = require('../../../package.json');
      var appVersion = pjson.version;
      return appVersion;
    });

    this._ipcMain.add('general_isTest', async() => {
      return this._platformHelper.isTest();
    });



    this._ipcMain.add('general_getBookNames', async(bibleBooks, languageCode) => {
      var bookNames = {};
      var nsi = global.ipcNsiHandler.getNSI();

      for (var i = 0; i < bibleBooks.length; i++) {
        var currentBook = bibleBooks[i];
        bookNames[currentBook.shortTitle] = nsi.getSwordTranslation(currentBook.longTitle, languageCode);
      }

      return bookNames;
    });

    this._ipcMain.add('general_getSystemFonts', async() => {
      let fonts = [];

      if (this._platformHelper.isElectronMain()) {
        const fontList = require('font-list');
        fonts = await fontList.getFonts();
      }

      return fonts;
    });

    this._ipcMain.add('general_getIpcCallStats', async() => {
      var fullStats = global.callCounters;
      var filteredStats = {};

      for (const [key, value] of Object.entries(fullStats)) {
        if (value > 0) {
          filteredStats[key] = value;
        }
      }

      return filteredStats;
    });

    this._ipcMain.add('general_resetIpcCallStats', async() => {
      // eslint-disable-next-line no-unused-vars
      for (const [key, value] of Object.entries(global.callCounters)) {
        global.callCounters[key] = 0;
      }
    });

    this._ipcMain.add('general_setSendCrashReports', async(sendCrashReports) => {
      global.sendCrashReports = sendCrashReports;

      console.log(`sendCrashReports: ${global.sendCrashReports}`);
    });
  }
}

module.exports = IpcGeneralHandler;