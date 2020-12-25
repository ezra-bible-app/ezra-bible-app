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

const PlatformDetector = require('./platform_detector.js');

class IpcRenderer {
  constructor() {
    var platformDetector = new PlatformDetector();
    this._isElectron = platformDetector.isElectron();
    this._isCordova = platformDetector.isCordova();

    if (this._isElectron) {
      const { ipcRenderer } = require('electron');
      this._electronIpcRenderer = ipcRenderer;
    }
  }

  async call(functionName, ...args) {
    if (this._isElectron) {
      return this.electronIpcCall(functionName, ...args);
    } else if (this._isCordova) {
      return this.cordovaIpcCall(functionName, ...args);
    }
  }

  async callWithProgressCallback(functionName, callbackChannel, callbackFunction, ...args) {
    this.addElectronListenerWithCallback(callbackChannel, callbackFunction);

    if (this._isElectron) {
      return this.electronIpcCall(functionName, ...args);
    } else if (this._isCordova) {
      return this.cordovaIpcCall(functionName, ...args);
    }
  }

  async electronIpcCall(functionName, ...args) {
    return this._electronIpcRenderer.invoke(functionName, ...args);
  }

  async cordovaIpcCall(functionName, ...args) {
    // TODO
  }

  addElectronListenerWithCallback(channel, callbackFunction) {
    this._electronIpcRenderer.on(channel, (event, message) => {
      callbackFunction(message);
    });
  }
}

module.exports = IpcRenderer;