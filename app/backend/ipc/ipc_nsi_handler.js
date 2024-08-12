/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2024 Ezra Bible App Development Team <contact@ezrabibleapp.net>

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
const webApi = require('node-sword-web-api');
const fs = require('fs');

class IpcNsiHandler {
  constructor(customSwordDir=undefined) {
    this._ipcMain = new IpcMain();
    this._platformHelper = new PlatformHelper();
    this._nsi = null;

    this.initNSI(customSwordDir);
    this.initIpcInterface();

    this._useWebApi = true;
    this._WEB_API_ROOT = 'http://ec2-13-48-148-192.eu-north-1.compute.amazonaws.com';
    //this._WEB_API_ROOT = 'http://localhost:3000';

    webApi.setApiRoot(this._WEB_API_ROOT);
  }

  initNSI(customSwordDir=undefined) {
    if (customSwordDir !== undefined) {
      console.log("Initializing node-sword-interface with custom SWORD directory: " + customSwordDir);
    }

    if (this._platformHelper.isTest()) {
      const userDataDir = this._platformHelper.getUserDataPath();
      this._nsi = this.createNsi(userDataDir);
    } else {
      this._nsi = this.createNsi(customSwordDir);
    }

    this._nsi.enableMarkup();
  }

  createNsi(customSwordDir=undefined) {
    var nsi = null;

    if (customSwordDir !== undefined) {
      // If the custom SWORD directory is not existing at this point ... create it!
      if (!fs.existsSync(customSwordDir)) {
        fs.mkdirSync(customSwordDir);
      }

      nsi = new NodeSwordInterface(customSwordDir);
    } else {
      nsi = new NodeSwordInterface();
    }

    return nsi;
  }

  getNSI() {
    return this._nsi;
  }

  async getAllLocalModules(moduleType) {
    if (!this._useWebApi) {
      return this._nsi.getAllLocalModules(moduleType);
    } else {
      return await webApi.getAllLocalModules(moduleType);
    }
  }

  getLanguageModuleCount(selectedRepos, language, moduleType) {
    var count = 0;

    for (var i = 0; i < selectedRepos.length; i++) {
      var currentRepo = selectedRepos[i];
      count += this._nsi.getRepoLanguageModuleCount(currentRepo, language, moduleType);
    }

    return count;
  }

  async getBookChapterCount(moduleCode, bookCode) {
    if (!this._useWebApi) {
      return this._nsi.getBookChapterCount(moduleCode, bookCode);
    } else {
      return await webApi.getBookChapterCount(moduleCode, bookCode);
    }
  }

  async getChapterVerseCount(moduleCode, bookCode, chapter) {
    if (!this._useWebApi) {
      return this._nsi.getChapterVerseCount(moduleCode, bookCode, chapter);
    } else {
      return await webApi.getChapterVerseCount(moduleCode, bookCode, chapter);
    }
  }

  async moduleHasBook(moduleCode, bookCode) {
    if (!this._useWebApi) {
      return this._nsi.moduleHasBook(moduleCode, bookCode);
    } else {
      return await webApi.moduleHasBook(moduleCode, bookCode);
    }
  }

  async getBookList(moduleCode) {
    if (!this._useWebApi) {
      return this._nsi.getBookList(moduleCode);
    } else {
      return await webApi.getBookList(moduleCode);
    }
  }

  /**
   * SWORD uses an underscore as a separator (like pt_BR), while i18next uses a hyphen.
   * So here we replace any hyphen in the localeCode with an underscore, so that this works with SWORD.
   */
  getSwordLocaleCode(localeCode) {
    return localeCode.replace('-', '_');
  }

  initIpcInterface() {
    this._ipcMain.add('nsi_repositoryConfigExisting', () => {
      return this._nsi.repositoryConfigExisting();
    });

    this._ipcMain.addWithProgressCallback('nsi_updateRepositoryConfig', async (progressCB) => {
      var repoUpdateStatus = await this._nsi.updateRepositoryConfig(progressCB);
      return repoUpdateStatus;
    }, 'nsi_updateRepoConfigProgress');
    
    this._ipcMain.add('nsi_getRepoNames', async () => {
      return this._nsi.getRepoNames();
    });

    this._ipcMain.add('nsi_getRepoLanguages', async (repositoryName, moduleType) => {
      return this._nsi.getRepoLanguages(repositoryName, moduleType);
    });

    this._ipcMain.add('nsi_getAllRepoModules', async (repositoryName, moduleType) => {
      return this._nsi.getAllRepoModules(repositoryName, moduleType);
    });

    this._ipcMain.add('nsi_getRepoModulesByLang', (repositoryName, language, moduleType, headersFilter, strongsFilter, hebrewStrongsKeys, greekStrongsKeys) => {
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

    this._ipcMain.add('nsi_getAllLocalModules', async (moduleType='BIBLE') => {
      return await this.getAllLocalModules(moduleType);
    });

    this._ipcMain.addSync('nsi_getAllLocalModulesSync', (moduleType='BIBLE') => {
      return this._nsi.getAllLocalModules(moduleType);
    });

    this._ipcMain.add('nsi_getAllLanguageModuleCount', (selectedRepos, languageCodeArray, moduleType='BIBLE') => {
      var allLanguageModuleCount = {};

      for (let i = 0; i < languageCodeArray.length; i++) {
        const currentLanguageCode = languageCodeArray[i];

        const currentLanguageModuleCount = this.getLanguageModuleCount(selectedRepos, currentLanguageCode, moduleType);
        allLanguageModuleCount[currentLanguageCode] = currentLanguageModuleCount;
      }

      return allLanguageModuleCount;
    });

    this._ipcMain.addWithProgressCallback('nsi_installModule', async (progressCB, moduleCode) => { 
      try {
        await this._nsi.installModule(moduleCode, progressCB); 
        return 0;
      } catch (e) {
        return -1;
      }
    }, 'nsi_updateInstallProgress');
    
    this._ipcMain.add('nsi_cancelInstallation', () => {
      return this._nsi.cancelInstallation();
    });

    this._ipcMain.addSync('nsi_installModuleSync', async (moduleCode) => {
      try {
        await this._nsi.installModule(moduleCode, undefined);
        return 0;
      } catch (e) {
        return -1;
      }
    });

    this._ipcMain.add('nsi_uninstallModule', async (moduleCode) => {
      try {
        await this._nsi.uninstallModule(moduleCode);
        return 0;
      } catch (e) {
        return -1;
      }
    });

    this._ipcMain.addSync('nsi_resetNsi', () => {
      return this.initNSI();
    });

    this._ipcMain.add('nsi_saveModuleUnlockKey', (moduleCode, key) => {
      try {
        this._nsi.saveModuleUnlockKey(moduleCode, key);
        return 0;
      } catch (e) {
        return -1;
      }
    });

    this._ipcMain.add('nsi_isModuleReadable', (moduleCode) => {
      return this._nsi.isModuleReadable(moduleCode);
    });

    this._ipcMain.add('nsi_getRawModuleEntry', async (moduleCode, key) => {
      if (!this._useWebApi) {
        return this._nsi.getRawModuleEntry(moduleCode, key);
      } else {
        return await webApi.getRawModuleEntry(moduleCode, key);
      }
    });

    this._ipcMain.add('nsi_getReferenceText', async (moduleCode, key) => {
      if (!this._useWebApi) {
        return this._nsi.getReferenceText(moduleCode, key);
      } else {
        return await webApi.getReferenceText(moduleCode, key);
      }
    });

    this._ipcMain.add('nsi_getChapterText', async (moduleCode, bookCode, chapter) => {
      if (!this._useWebApi) {
        return this._nsi.getChapterText(moduleCode, bookCode, chapter);
      } else {
        return await webApi.getChapterText(moduleCode, bookCode, chapter);
      }
    });

    this._ipcMain.add('nsi_getBookText', async (moduleCode, bookCode, startVerseNr=-1, verseCount=-1) => {
      if (!this._useWebApi) {
        return this._nsi.getBookText(moduleCode, bookCode, startVerseNr, verseCount);
      } else {
        return await webApi.getBookText(moduleCode, bookCode, startVerseNr, verseCount);
      }
    });

    this._ipcMain.add('nsi_getVersesFromReferences', async (moduleCode, references) => {
      if (!this._useWebApi) {
        return this._nsi.getVersesFromReferences(moduleCode, references);
      } else {
        return await webApi.getVersesFromReferences(moduleCode, references);
      }
    });

    this._ipcMain.add('nsi_getReferencesFromReferenceRange', async (referenceRange) => {
      if (!this._useWebApi) {
        return this._nsi.getReferencesFromReferenceRange(referenceRange);
      } else {
        return await webApi.getReferencesFromReferenceRange(referenceRange);
      }
    });

    this._ipcMain.add('nsi_getBookList', async (moduleCode) => {
      return await this.getBookList(moduleCode);
    });

    this._ipcMain.add('nsi_getBookChapterCount', async (moduleCode, bookCode) => {
      return await this.getBookChapterCount(moduleCode, bookCode);
    });

    this._ipcMain.add('nsi_getBookVerseCount', async (moduleCode, bookCode) => {
      if (!this._useWebApi) {
        return nsi.getBookVerseCount(moduleCode, bookCode);
      } else {
        return await webApi.getBookVerseCount(moduleCode, bookCode);
      }
    });

    this._ipcMain.add('nsi_getChapterVerseCount', async (moduleCode, bookCode, chapter) => {
      return await this.getChapterVerseCount(moduleCode, bookCode, chapter);
    });

    this._ipcMain.add('nsi_getAllChapterVerseCounts', async (moduleCode, bookCode) => {
      if (!this._useWebApi) {
        return this._nsi.getAllChapterVerseCounts(moduleCode, bookCode);
      } else {
        return await webApi.getAllChapterVerseCounts(moduleCode, bookCode);
      }
    });

    this._ipcMain.add('nsi_getBookIntroduction', async (moduleCode, bookCode) => {
      if (!this._useWebApi) {
        return this._nsi.getBookIntroduction(moduleCode, bookCode);
      } else {
        return await webApi.getBookIntroduction(moduleCode, bookCode);
      }
    });

    this._ipcMain.add('nsi_getBookHeaderList', async (moduleCode, bookCode, startVerseNumber=-1, verseCount=-1) => {
      if (!this._useWebApi) {
        return this._nsi.getBookHeaders(moduleCode, bookCode, startVerseNumber, verseCount);
      } else {
        return await webApi.getBookHeaders(moduleCode, bookCode, startVerseNumber, verseCount);
      }
    });

    this._ipcMain.add('nsi_moduleHasBook', async (moduleCode, bookCode) => {
      return await this.moduleHasBook(moduleCode, bookCode);
    });

    this._ipcMain.add('nsi_moduleHasApocryphalBooks', async (moduleCode) => {
      const books = await this.getBookList(moduleCode);

      for (let i = 0; i < books.length; i++) {
        let bookId = books[i];
        let isApocryphal = global.models.BibleBook.isApocryphalBook(bookId);

        if (isApocryphal) {
          return true;
        }
      }

      return false;
    });

    this._ipcMain.add('nsi_getModuleBookStatus', async (bookCode) => {
      let moduleBookStatus = {};

      if (!this._useWebApi) {
        const allModules = this._nsi.getAllLocalModules('BIBLE');
  
        for (let i = 0; i < allModules.length; i++) {
          const currentModuleName = allModules[i].name;
          const currentModuleHasBook = this._nsi.moduleHasBook(currentModuleName, bookCode);
          moduleBookStatus[currentModuleName] = currentModuleHasBook;
        }
      } else {
        moduleBookStatus = await webApi.getModuleBookStatus(bookCode);
      }

      return moduleBookStatus;
    });

    this._ipcMain.addWithProgressCallback(
      'nsi_getModuleSearchResults',
      async (progressCB,
             moduleCode,
             searchTerm,
             searchType,
             searchScope,
             isCaseSensitive,
             useExtendedVerseBoundaries) => {

        return await this._nsi.getModuleSearchResults(moduleCode,
                                                      searchTerm,
                                                      progressCB,
                                                      searchType,
                                                      searchScope,
                                                      isCaseSensitive,
                                                      useExtendedVerseBoundaries);
      },
      'nsi_updateSearchProgress'
    );

    this._ipcMain.add('nsi_terminateModuleSearch', () => {
      return this._nsi.terminateModuleSearch();
    });

    this._ipcMain.add('nsi_hebrewStrongsAvailable', async () => {
      if (!this._useWebApi) {
        return this._nsi.hebrewStrongsAvailable();
      } else {
        return await webApi.hebrewStrongsAvailable();
      }
    });

    this._ipcMain.add('nsi_greekStrongsAvailable', async () => {
      if (!this._useWebApi) {
        return this._nsi.greekStrongsAvailable();
      } else {
        return await webApi.greekStrongsAvailable();
      }
    });

    this._ipcMain.add('nsi_strongsAvailable', async () => {
      if (!this._useWebApi) {
        return this._nsi.strongsAvailable();
      } else {
        return await webApi.strongsAvailable();
      }
    });

    this._ipcMain.add('nsi_getStrongsEntry', async (strongsKey) => {
      if (!this._useWebApi) {
        return this._nsi.getStrongsEntry(strongsKey);
      } else {
        return await webApi.getStrongsEntry(strongsKey);
      }
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
      localeCode = this.getSwordLocaleCode(localeCode);
      return this._nsi.getSwordTranslation(originalString, localeCode);
    });

    this._ipcMain.add('nsi_getBookAbbreviation', (moduleCode, bookCode, localeCode) => {
      localeCode = this.getSwordLocaleCode(localeCode);
      return this._nsi.getBookAbbreviation(moduleCode, bookCode, localeCode);
    });

    this._ipcMain.add('nsi_getSwordVersion', () => {
      return this._nsi.getSwordVersion();
    });

    this._ipcMain.add('nsi_getSwordPath', () => {
      return this._nsi.getSwordPath();
    });
  }

  setMainWindow(mainWindow) {
    this._ipcMain.setMainWindow(mainWindow);
  }
}

module.exports = IpcNsiHandler;