const PlatformHelper = require('../helpers/platform_helper.js');
const IpcI18nHandler = require('./ipc_i18n_handler.js');
const IpcNsiHandler = require('./ipc_nsi_handler.js');

class IPC {
  constructor() {
    this.ipcInitialized = false;
    this.platformHelper = new PlatformHelper();
  }

  async init(electronMainWindow=undefined) {
    if (!this.ipcInitialized) {
      this.ipcInitialized = true;

      global.ipcI18nHandler = new IpcI18nHandler();
      global.ipcNsiHandler = new IpcNsiHandler();

      if (this.platformHelper.isElectron()) {
        ipcNsiHandler.setMainWindow(electronMainWindow);
      }

      if (this.platformHelper.isElectron()) {
        const IpcDbHandler = require('./ipc_db_handler.js');
        global.ipcDbHandler = new IpcDbHandler();
        await ipcDbHandler.initDatabase();
      }

      if (this.platformHelper.isCordova()) {
        const IpcCordovaHandler = require('./ipc_cordova_handler.js');
        global.ipcCordovaHandler = new IpcCordovaHandler();
      }
    }
  }
}

module.exports = IPC;