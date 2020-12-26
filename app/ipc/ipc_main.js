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

const PlatformHelper = require('../helpers/platform_helper.js');

class IpcMain {
  constructor() {
    this._mainWindow = null;
    var platformHelper = new PlatformHelper();
    this._isElectron = platformHelper.isElectron();
    this._isCordova = platformHelper.isCordova();
    this._callCounters = {};
    this._showDebugOutput = true;

    if (this._isElectron) {
      const { ipcMain } = require('electron');
      this._electronIpcMain = ipcMain;
    }
  }

  setMainWindow(mainWindow) {
    this._mainWindow = mainWindow;
  }

  add(functionName, callbackFunction) {
    this._callCounters[functionName] = 0;

    if (this._isElectron) {
      return this._electronIpcMain.handle(functionName, async (event, ...args) => {
        this._callCounters[functionName] += 1;
        if (this._showDebugOutput) { console.log(functionName + ' ' + this._callCounters[functionName]); }
        return await callbackFunction(...args);
      });
    } else if (this._isCordova) {
      // TODO
    }
  }

  addWithProgressCallback(functionName, callbackFunction, progressChannel) {
    this._callCounters[functionName] = 0;

    if (this._isElectron) {
      return this._electronIpcMain.handle(functionName, async (event, ...args) => {
        this._callCounters[functionName] += 1;
        if (this._showDebugOutput) { console.log(functionName + ' ' + this._callCounters[functionName]); }
        return callbackFunction((progress) => { 
          this.message(progressChannel, progress); 
        }, ...args);
      });
    } else if (this._isCordova) {
      // TODO
    }
  }

  addSync(functionName, callbackFunction) {
    this._callCounters[functionName] = 0;

    if (this._isElectron) {
      return this._electronIpcMain.on(functionName, async (event, ...args) => {
        this._callCounters[functionName] += 1;
        if (this._showDebugOutput) { console.log(functionName + ' ' + this._callCounters[functionName]); }
        var returnValue = await callbackFunction(...args);
        event.returnValue = returnValue;
      });
    } else if (this._isCordova) {
      // TODO
    }
  }

  async message(channel, message) {
    if (this._isElectron) {
      return this.electronIpcMessage(channel, message);
    } else if (this._isCordova) {
      return this.cordovaIpcMessage(channel, message);
    }
  }

  async electronIpcMessage(channel, message) {
    if (this._mainWindow != null) {
      return this._mainWindow.webContents.send(channel, message);
    }
  }

  async cordovaIpcMessage(channel, message) {
    // TODO
  }
}

module.exports = IpcMain;