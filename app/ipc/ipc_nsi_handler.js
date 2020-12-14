const NSI = require('node-sword-interface');
const IpcMain = require('./ipc_main.js');

class IpcNsiHandler {
  constructor() {
    this._ipcMain = new IpcMain();
    this._nsi = new NSI();
    this._nsi.enableMarkup();

    this._ipcMain.add('nsi_repositoryConfigExisting', () => {
      return this._nsi.repositoryConfigExisting();
    });

    this._ipcMain.addWithProgressCallback('nsi_updateRepositoryConfig',
                                          async (progressCB) => { await this._nsi.updateRepositoryConfig(progressCB); },
                                          'nsi_updateRepoConfigProgress');
    
    this._ipcMain.add('nsi_getRepoNames', () => {
      return this._nsi.getRepoNames();
    });

    this._ipcMain.add('nsi_getRepoLanguages', (repositoryName, moduleType) => {
      return this._nsi.getRepoLanguages(repositoryName, moduleType);
    });

    this._ipcMain.add('nsi_getAllRepoModules', (repositoryName, moduleType) => {
      return this._nsi.getAllRepoModules(repositoryName, moduleType);
    });

    this._ipcMain.add('nsi_getRepoModulesByLang',
                      (repositoryName,
                       language,
                       moduleType,
                       headersFilter,
                       strongsFilter,
                       hebrewStrongsKeys,
                       greekStrongsKeys) => {

      return this._nsi.getRepoModulesByLang(repositoryName,
                                            language,
                                            moduleType,
                                            headersFilter,
                                            strongsFilter,
                                            hebrewStrongsKeys,
                                            greekStrongsKeys);
    });

    this._ipcMain.add('nsi_getRepoModule', (moduleCode) => {
      return this._nsi.getRepoModule(moduleCode);
    });

    this._ipcMain.add('nsi_getAllLocalModules', (moduleType='BIBLE') => {
      return this._nsi.getAllLocalModules(moduleType);
    });

    this._ipcMain.add('nsi_getRepoLanguageModuleCount', (repositoryName, language, moduleType='BIBLE') => {
      return this._nsi.getRepoLanguageModuleCount(repositoryName, language, moduleType);
    });

    this._ipcMain.addWithProgressCallback('nsi_installModule',
                                          async (progressCB, moduleCode) => { await this._nsi.installModule(progressCB, moduleCode); },
                                          'nsi_updateInstallProgress');
    
    this._ipcMain.add('nsi_cancelInstallation', () => {
      return this._nsi.cancelInstallation();
    })

    this._ipcMain.add('nsi_uninstallModule', (moduleCode) => {
      return this._nsi.uninstallModule(moduleCode);
    });

    this._ipcMain.add('nsi_getBookText', (moduleCode, bookCode, startVerseNr=-1, verseCount=-1) => {
      return this._nsi.getBookText(moduleCode, bookCode, startVerseNr, verseCount);
    });
  }

  setMainWindow(mainWindow) {
    this._ipcMain.setMainWindow(mainWindow);
  }
}

module.exports = IpcNsiHandler;