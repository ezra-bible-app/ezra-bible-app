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

const PlatformHelper = require('../../lib/platform_helper.js');
const IpcMain = require('./ipc_main.js');

class IpcGeneralHandler {
  constructor() {
    this._ipcMain = new IpcMain();
    this._platformHelper = new PlatformHelper();
    this.initIpcInterface();
  }

  initIpcInterface() {
    if (this._platformHelper.isCordova()) {
      this._ipcMain.add('general_initPersistentIpc', async() => {
        return global.main.initPersistentIpc();
      });

      this._ipcMain.add('general_initDatabase', async() => {
        return global.main.initDatabase();
      });
    }

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

      for (var book in bibleBookStats) {
        var isNtBook = models.BibleBook.isNtBook(book);

        if (!isNtBook) {
          ntOnly = false;
        }

        var isOtBook = models.BibleBook.isOtBook(book);
        if (!isOtBook) {
          otOnly = false;
        }
      }

      var nsi = ipcNsiHandler.getNSI();

      for (var i = 0; i < bookList.length; i++) {
        var book = bookList[i];
        var includeCurrentBook = false;
        var isNtBook = models.BibleBook.isNtBook(book);
        var isOtBook = models.BibleBook.isOtBook(book);

        if (ntOnly && isNtBook) {
          includeCurrentBook = true;
        } else if (otOnly && isOtBook) {
          includeCurrentBook = true;
        } else if (!otOnly && !ntOnly) {
          includeCurrentBook = true;
        }

        if (includeCurrentBook) {
          var translatedBook = nsi.getBookAbbreviation(bibleTranslationId, book, languageCode);
          labels.push(translatedBook);

          var value = 0;
          if (book in bibleBookStats) {
            value = bibleBookStats[book];
          }

          values.push(value);
        }
      };

      return [labels, values];
    });

    this._ipcMain.add('general_getBookNames', async(bibleBooks, languageCode) => {
      var bookNames = {};
      var nsi = ipcNsiHandler.getNSI();

      for (var i = 0; i < bibleBooks.length; i++) {
        var currentBook = bibleBooks[i];
        bookNames[currentBook.shortTitle] = nsi.getSwordTranslation(currentBook.longTitle, languageCode);
      }

      return bookNames;
    });
  }
}

module.exports = IpcGeneralHandler;