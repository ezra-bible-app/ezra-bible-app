const IpcRenderer = require('./ipc_renderer.js');

class IpcNsi {
  constructor() {
    this._ipcRenderer = new IpcRenderer();
  }

  async repositoryConfigExisting() {
    return await this._ipcRenderer.call('nsi_repositoryConfigExisting');
  }

  async updateRepositoryConfig(progressCallback) {
    return await this._ipcRenderer.callWithProgressCallback('nsi_updateRepositoryConfig',
                                                            'nsi_updateRepoConfigProgress',
                                                            progressCallback);
  }

  async getRepoNames() {
    return await this._ipcRenderer.call('nsi_getRepoNames');
  }

  async getRepoLanguages(repositoryName, moduleType) {
    return await this._ipcRenderer.call('nsi_getRepoLanguages', repositoryName, moduleType);
  }

  async getAllRepoModules(repositoryName, moduleType) {
    return await this._ipcRenderer.call('nsi_getAllRepoModules', repositoryName, moduleType);
  }

  async getRepoModulesByLang(repositoryName,
                             language,
                             moduleType,
                             headersFilter,
                             strongsFilter,
                             hebrewStrongsKeys,
                             greekStrongsKeys) {

    return await this._ipcRenderer.call('nsi_getRepoModulesByLang',
                                        repositoryName,
                                        language,
                                        moduleType,
                                        headersFilter,
                                        strongsFilter,
                                        hebrewStrongsKeys,
                                        greekStrongsKeys);
  }

  async getRepoModule(moduleCode) {
    return await this._ipcRenderer.call('nsi_getRepoModule', moduleCode);
  }

  async getAllLocalModules(moduleType='BIBLE') {
    return await this._ipcRenderer.call('nsi_getAllLocalModules', moduleType);
  }

  async getRepoLanguageModuleCount(repositoryName, language, moduleType='BIBLE') {
    return await this._ipcRenderer.call('nsi_getRepoLanguageModuleCount', repositoryName, language, moduleType);
  }

  async installModule(moduleCode, progressCallback) {
    return await this._ipcRenderer.callWithProgressCallback('nsi_installModule',
                                                            'nsi_updateInstallProgress',
                                                            progressCallback,
                                                            moduleCode);
  }

  async cancelInstallation() {
    return await this._ipcRenderer.call('nsi_cancelInstallation');
  }

  async uninstallModule(moduleCode) {
    return await this._ipcRenderer.call('nsi_uninstallModule', moduleCode);
  }

  async getBookText(moduleCode, bookCode, startVerseNr=-1, verseCount=-1) {
    return await this._ipcRenderer.call('nsi_getBookText', moduleCode, bookCode, startVerseNr, verseCount);
  }
}

module.exports = IpcNsi;