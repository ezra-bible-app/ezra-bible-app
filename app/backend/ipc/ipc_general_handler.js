/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2023 Ezra Bible App Development Team <contact@ezrabibleapp.net>

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
let expressApp = null;
let expressServer = null;

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

    this._ipcMain.add('general_getSearchStatisticChartData', async(bibleTranslationId, languageCode, bookList, bibleBookStats) => {
      var labels = [];
      var values = [];
      var ntOnly = true;
      var otOnly = true;

      for (let book in bibleBookStats) {
        let isNtBook = global.models.BibleBook.isNtBook(book);

        if (!isNtBook) {
          ntOnly = false;
        }

        let isOtBook = global.models.BibleBook.isOtBook(book);
        if (!isOtBook) {
          otOnly = false;
        }
      }

      var nsi = global.ipcNsiHandler.getNSI();

      for (let i = 0; i < bookList.length; i++) {
        let book = bookList[i];
        let includeCurrentBook = false;
        let isNtBook = global.models.BibleBook.isNtBook(book);
        let isOtBook = global.models.BibleBook.isOtBook(book);

        if (ntOnly && isNtBook) {
          includeCurrentBook = true;
        } else if (otOnly && isOtBook) {
          includeCurrentBook = true;
        } else if (!otOnly && !ntOnly) {
          includeCurrentBook = true;
        }

        if (includeCurrentBook) {
          let translatedBook = nsi.getBookAbbreviation(bibleTranslationId, book, languageCode);
          labels.push(translatedBook);

          var value = 0;
          if (book in bibleBookStats) {
            value = bibleBookStats[book];
          }

          values.push(value);
        }
      }

      return [labels, values];
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

    this._ipcMain.add('general_startDropboxAuthServer', async() => {
      console.log('Starting express server, listening on port 9999');

      const express = require('express');
      expressApp = express();

      expressApp.get('/dropbox_auth', function(req, res){
        let url = req.url;
        //console.log('Got request at ' + url);

        // Send a script that closes the window immediately
        res.send('<html><head><script type="text/javascript">window.close();</script></head><body></body></html>');

        global.mainWindow.webContents.send('dropbox-auth-callback', url);
        expressServer.close();
        expressServer = null;
      });

      expressServer = expressApp.listen(9999);
    });

    this._ipcMain.add('general_stopDropboxAuthServer', async() => {
      if (expressServer != null) {
        expressServer.close();
        expressServer = null;
      }
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
  }
}

module.exports = IpcGeneralHandler;