const NSI = require('node-sword-interface');
const IpcMain = require('./ipc_main.js');

class IpcNsiHandler {
  constructor() {
    this._ipcMain = new IpcMain();
    this._nsi = new NSI();
    this._nsi.enableMarkup();

    this._ipcMain.add('nsi_getAllLocalModules', (moduleType='BIBLE') => {
      var allLocalModules = this._nsi.getAllLocalModules(moduleType);
      return allLocalModules;
    });

    this._ipcMain.add('nsi_getBookText', (moduleCode, bookCode, startVerseNr=-1, verseCount=-1) => {
      var bookText = this._nsi.getBookText(moduleCode, bookCode, startVerseNr, verseCount);
      return bookText;
    });

    this._ipcMain.add('nsi_repositoryConfigExisting', () => {
      return this._nsi.repositoryConfigExisting();
    });

    this._ipcMain.addWithProgressCallback('nsi_updateRepositoryConfig',
                                          async (progressCB) => { await this._nsi.updateRepositoryConfig(progressCB); },
                                          'nsi_updateRepoConfigProgress');
  }

  setMainWindow(mainWindow) {
    this._ipcMain.setMainWindow(mainWindow);
  }
}

module.exports = IpcNsiHandler;