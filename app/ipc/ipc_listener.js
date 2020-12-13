const PlatformDetector = require('./platform_detector.js');

class IpcListener {
  constructor() {
    this._mainWindow = null;
    var platformDetector = new PlatformDetector();
    this._isElectron = platformDetector.isElectron();
    this._isCordova = platformDetector.isCordova();
    this._callCounters = {};

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
        console.log(functionName + ' ' + this._callCounters[functionName]);
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
        console.log(functionName + ' ' + this._callCounters[functionName]);
        return callbackFunction((progress) => {
          this.message(progressChannel, progress.totalPercent);
        });
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

module.exports = IpcListener;