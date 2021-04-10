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

const fs = require('fs');
const path = require('path');

class IpcI18nHandler {
  constructor() {
    this._platformHelper = new PlatformHelper();
    this._ipcMain = new IpcMain();
    this.initIpcInterface();
  }

  getLanguageFile(language) {
      var fileName = path.join(__dirname, `../../../locales/${language}/translation.json`);
      return fileName;
  }

  initIpcInterface() {
    this._ipcMain.add('i18n_get_translation', (language) => {
      var fileName = this.getLanguageFile(language);
      var translationObject = {};

      if (!fs.existsSync(fileName)) {
        console.log(`The file ${fileName} does not exist! Falling back to standard English translation.json.`);
        fileName = this.getLanguageFile('en');
      }

      if (fs.existsSync(fileName)) {
        var translationFileContent = fs.readFileSync(fileName);
        translationObject = JSON.parse(translationFileContent);
      } else {
        var message = `The file ${fileName} does not exist!`;

        Sentry.captureMessage(message);
        console.error(message);
      }

      return translationObject;
    });
  }
}

module.exports = IpcI18nHandler;