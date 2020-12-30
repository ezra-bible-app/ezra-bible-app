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

class IpcGeneralHandler {
  constructor() {
    this._ipcMain = new IpcMain();
    this.initIpcInterface();
  }

  initIpcInterface() {
    this._ipcMain.add('general_getMajorOsVersion', async () => {
      var releaseVersion = require('os').release();
      var splittedVersion = releaseVersion.split('.');
      var majorDigit = parseInt(splittedVersion[0]);
      return majorDigit;
    });
  }
}

module.exports = IpcGeneralHandler;