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
const PlatformHelper = require('../helpers/platform_helper.js');

class IpcCordovaHandler {
  constructor() {
    this._ipcMain = new IpcMain();
    this.platformHelper = new PlatformHelper();
    this.initIpcInterface();
  }

  initStorage() {
    const fs = require('fs');
    var path = this.platformHelper.getUserDataPath();
    console.log("Creating data directory for app at " + path);
    return fs.mkdirSync(path, { recursive: true });
  }

  initIpcInterface() {
    this._ipcMain.add('cordova_initStorage', async () => {
      this.initStorage();
    });

    this._ipcMain.add('cordova_listFiles', async(dir) => {
      const { spawn } = require("child_process");
      const ls = spawn("ls", ["-la", dir]);

      ls.stdout.on("data", data => {
        var dataString = data.toString();
        cordova.channel.send(dataString);
      });
    });
  }
}

module.exports = IpcCordovaHandler;