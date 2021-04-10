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

   const IpcRenderer = require('./ipc_renderer.js');

   class IpcGeneral {
    constructor() {
      this._ipcRenderer = new IpcRenderer();
    }

    async initPersistentIpc() {
      var timeoutMs = 15000;
      console.time('initPersistentIpc');
      var result = await this._ipcRenderer.callWithTimeout('general_initPersistentIpc', timeoutMs);
      console.timeEnd('initPersistentIpc');
      return result;
    }

    async initDatabase() {
      var timeoutMs = 15000;
      console.time('initDatabase');
      var result = await this._ipcRenderer.callWithTimeout('general_initDatabase', timeoutMs);
      console.timeEnd('initDatabase');
      return result;
    }

    async getMajorOsVersion() {
      return await this._ipcRenderer.call('general_getMajorOsVersion');
    }

    async getAppVersion() {
      return await this._ipcRenderer.call('general_getAppVersion');
    }

    async isTest() {
      return await this._ipcRenderer.call('general_isTest');
    }

    async getSearchStatisticChartData(bibleTranslationId, bookList, bibleBookStats, languageCode=i18n.language) {
      return await this._ipcRenderer.call('general_getSearchStatisticChartData', bibleTranslationId, languageCode, bookList, bibleBookStats);
    } 

    async getBookNames(bibleBooks, languageCode=i18n.language) {
      return await this._ipcRenderer.call('general_getBookNames', bibleBooks, languageCode);
    }
   }

   module.exports = IpcGeneral;
