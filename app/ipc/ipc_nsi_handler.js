const NSI = require('node-sword-interface');
const IpcListener = require('./ipc_listener.js');

class IpcNsiHandler {
  constructor() {
    this._ipcListener = new IpcListener();
    this._nsi = new NSI();
    this._nsi.enableMarkup();

    this._ipcListener.add('nsi_getAllLocalModules', (moduleType='BIBLE') => {
      var allLocalModules = this._nsi.getAllLocalModules(moduleType);
      return allLocalModules;
    });

    this._ipcListener.add('nsi_getBookText', (moduleCode, bookCode, startVerseNr=-1, verseCount=-1) => {
      var bookText = this._nsi.getBookText(moduleCode, bookCode, startVerseNr, verseCount);
      return bookText;
    });

    this._ipcListener.add('nsi_repositoryConfigExisting', () => {
      return this._nsi.repositoryConfigExisting();
    });

    this._ipcListener.addWithProgressCallback('nsi_updateRepositoryConfig',
                                              async (progressCB) => {
                                                await this._nsi.updateRepositoryConfig(progressCB);
                                              },
                                              'update-repo-config-progress');
  }

  setMainWindow(mainWindow) {
    this._ipcListener.setMainWindow(mainWindow);
  }
}

module.exports = IpcNsiHandler;