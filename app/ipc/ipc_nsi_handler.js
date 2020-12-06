const { ipcMain } = require('electron');
const NSI = require('node-sword-interface');

class IpcNsiHandler {
  constructor() {
    this._nsi = new NSI();
    this._nsi.enableMarkup();
    this._nsi_getAllLocalModules_counter = 0;

    ipcMain.handle('nsi_getAllLocalModules', async (event, moduleType='BIBLE') => {
      this._nsi_getAllLocalModules_counter++;
      console.log('nsi_getAllLocalModules ' + this._nsi_getAllLocalModules_counter);
      var allLocalModules = this._nsi.getAllLocalModules(moduleType);
      return allLocalModules;
    });
  }
}

module.exports = IpcNsiHandler;