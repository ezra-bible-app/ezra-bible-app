/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2021 Ezra Bible App Development Team <contact@ezrabibleapp.net>

   Ezra Bible App is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 2 of the License, or
   (at your option) any later version.

   Ezra Bible App is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Bible App. See the file LICENSE.
   If not, see <http://www.gnu.org/licenses/>. */

const IpcMain = require('./ipc_main.js');
const PlatformHelper = require('../../lib/platform_helper.js');
const NodeSwordInterface = require('node-sword-interface');
const fs = require('fs');

class IpcNsiHandler {
  constructor() {
    this._ipcMain = new IpcMain();
    this._platformHelper = new PlatformHelper();
    this._nsi = null;

    this.initNSI();
    this.initIpcInterface();
  }

  initNSI() {
    if (this._platformHelper.isTest()) {

      const userDataDir = this._platformHelper.getUserDataPath();

      // If the user data directory is not existing at this point ... create it!
      if (!fs.existsSync(userDataDir)) {
        fs.mkdirSync(userDataDir);
      }

      this._nsi = new NodeSwordInterface(userDataDir);

    } else {

      this._nsi = new NodeSwordInterface();
    }

    this._nsi.enableMarkup();
  }

  getNSI() {
    return this._nsi;
  }

  getLanguageModuleCount(selectedRepos, language, moduleType) {
    var count = 0;

    for (var i = 0; i < selectedRepos.length; i++) {
      var currentRepo = selectedRepos[i];
      count += this._nsi.getRepoLanguageModuleCount(currentRepo, language, moduleType);
    }

    return count;
  }

  initIpcInterface() {
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
      if (moduleCode == null) {
        return null;
      } else {
        return this._nsi.getRepoModule(moduleCode);
      }
    });

    this._ipcMain.add('nsi_getAllLocalModules', (moduleType='BIBLE') => {
      return this._nsi.getAllLocalModules(moduleType);
    });

    this._ipcMain.addSync('nsi_getAllLocalModulesSync', (moduleType='BIBLE') => {
      return this._nsi.getAllLocalModules(moduleType);
    });

    this._ipcMain.add('nsi_getAllLanguageModuleCount', (selectedRepos, languageArray, moduleType='BIBLE') => {
      var allLanguageModuleCount = {};

      for (var i = 0; i < languageArray.length; i++) {
        var currentLanguage = languageArray[i];
        var currentLanguageCode = currentLanguage.languageCode;

        var currentLanguageModuleCount = this.getLanguageModuleCount(selectedRepos, currentLanguageCode, moduleType);
        allLanguageModuleCount[currentLanguageCode] = currentLanguageModuleCount;
      }

      return allLanguageModuleCount;
    });

    this._ipcMain.addWithProgressCallback('nsi_installModule',
                                          async (progressCB, moduleCode) => { 
                                            await this._nsi.installModule(progressCB, moduleCode); 
                                          },
                                          'nsi_updateInstallProgress');
    
    this._ipcMain.add('nsi_cancelInstallation', () => {
      return this._nsi.cancelInstallation();
    })

    this._ipcMain.addSync('nsi_installModuleSync', async (moduleCode) => {
      await this._nsi.installModule(undefined, moduleCode);
    });

    this._ipcMain.add('nsi_uninstallModule', (moduleCode) => {
      return this._nsi.uninstallModule(moduleCode);
    });

    this._ipcMain.addSync('nsi_resetNsi', () => {
      return this.initNSI();
    });

    this._ipcMain.add('nsi_saveModuleUnlockKey', (moduleCode, key) => {
      return this._nsi.saveModuleUnlockKey(moduleCode, key);
    });

    this._ipcMain.add('nsi_isModuleReadable', (moduleCode) => {
      return this._nsi.isModuleReadable(moduleCode);
    })

    this._ipcMain.add('nsi_getRawModuleEntry', (moduleCode, key) => {
      return this._nsi.getRawModuleEntry(moduleCode, key);
    });

    this._ipcMain.add('nsi_getChapterText', (moduleCode, bookCode, chapter) => {
      return this._nsi.getChapterText(moduleCode, bookCode, chapter);
    }) 

    this._ipcMain.add('nsi_getBookText', (moduleCode, bookCode, startVerseNr=-1, verseCount=-1) => {
      return this._nsi.getBookText(moduleCode, bookCode, startVerseNr, verseCount);
    });

    this._ipcMain.add('nsi_getVersesFromReferences', (moduleCode, references) => {
      return this._nsi.getVersesFromReferences(moduleCode, references);
    });

    this._ipcMain.add('nsi_getReferencesFromReferenceRange', (referenceRange) => {
      return this._nsi.getReferencesFromReferenceRange(referenceRange);
    });

    this._ipcMain.add('nsi_getBookList', (moduleCode) => {
      return this._nsi.getBookList(moduleCode);
    });

    this._ipcMain.add('nsi_getBookChapterCount', (moduleCode, bookCode) => {
      return this._nsi.getBookChapterCount(moduleCode, bookCode);
    });

    this._ipcMain.add('nsi_getChapterVerseCount', (moduleCode, bookCode, chapter) => {
      return this._nsi.getChapterVerseCount(moduleCode, bookCode, chapter);
    });

    this._ipcMain.add('nsi_getBookIntroduction', (moduleCode, bookCode) => {
      return this._nsi.getBookIntroduction(moduleCode, bookCode);
    });

    this._ipcMain.addWithProgressCallback(
      'nsi_getModuleSearchResults',
      async (progressCB,
             moduleCode,
             searchTerm,
             searchType,
             isCaseSensitive,
             useExtendedVerseBoundaries) => {

        return await this._nsi.getModuleSearchResults(progressCB,
                                                      moduleCode,
                                                      searchTerm,
                                                      searchType,
                                                      isCaseSensitive,
                                                      useExtendedVerseBoundaries);
      },
      'nsi_updateSearchProgress'
    );

    this._ipcMain.add('nsi_terminateModuleSearch', () => {
      return this._nsi.terminateModuleSearch();
    });

    this._ipcMain.add('nsi_hebrewStrongsAvailable', () => {
      return this._nsi.hebrewStrongsAvailable();
    });

    this._ipcMain.add('nsi_greekStrongsAvailable', () => {
      return this._nsi.greekStrongsAvailable();
    });

    this._ipcMain.add('nsi_strongsAvailable', () => {
      return this._nsi.strongsAvailable();
    });

    this._ipcMain.add('nsi_getStrongsEntry', (strongsKey) => {
      return this._nsi.getStrongsEntry(strongsKey);
    });

    this._ipcMain.add('nsi_getLocalModule', (moduleCode) => {
      if (moduleCode == null) {
        return null;
      } else {
        return this._nsi.getLocalModule(moduleCode);
      }
    });

    this._ipcMain.add('nsi_isModuleInUserDir', (moduleCode) => {
      return this._nsi.isModuleInUserDir(moduleCode);
    });

    this._ipcMain.add('nsi_getSwordTranslation', (originalString, localeCode) => {
      return this._nsi.getSwordTranslation(originalString, localeCode);
    });

    this._ipcMain.add('nsi_getBookAbbreviation', (moduleCode, bookCode, localeCode) => {
      return this._nsi.getBookAbbreviation(moduleCode, bookCode, localeCode);
    });

    this._ipcMain.add('nsi_getSwordVersion', () => {
      return this._nsi.getSwordVersion();
    });
  }

  setMainWindow(mainWindow) {
    this._ipcMain.setMainWindow(mainWindow);
  }
}

module.exports = IpcNsiHandler;