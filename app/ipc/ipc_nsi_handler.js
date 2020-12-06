const { ipcMain } = require('electron');
const NSI = require('node-sword-interface');

class IpcNsiHandler {
  constructor() {
    this._nsi = new NSI();
    this._nsi.enableMarkup();

    ipcMain.handle('nsi_getAllLocalModules', async (event, moduleType='BIBLE') => {
      var allLocalModules = this._nsi.getAllLocalModules(moduleType);
      return allLocalModules;
    });
  }
}

module.exports = IpcNsiHandler;