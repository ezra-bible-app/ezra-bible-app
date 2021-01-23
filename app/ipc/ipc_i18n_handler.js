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

const IpcMain = require('./ipc_main.js');

const fs = require('fs');
const path = require('path');

class IpcI18nHandler {
  constructor() {
    this._ipcMain = new IpcMain();
    this.initIpcInterface();
  }

  initIpcInterface() {
    this._ipcMain.add('i18n_get_translation', (language) => {
      var fileName = path.join(__dirname, `../../locales/${language}/translation.json`);
      var translationObject = {};

      if (fs.existsSync(fileName)) {
        var translationFileContent = fs.readFileSync(fileName);
        translationObject = JSON.parse(translationFileContent);
      } else {
        console.error(`The file ${fileName} does not exist!`);
      }

      return translationObject;
    });
  }
}

module.exports = IpcI18nHandler;