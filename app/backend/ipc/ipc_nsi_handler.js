/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2025 Ezra Bible App Development Team <contact@ezrabibleapp.net>

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
const path = require('path');

class IpcNsiHandler {
  constructor(customSwordDir=undefined) {
    this._ipcMain = new IpcMain();
    this._platformHelper = new PlatformHelper();
    this._nsi = null;

    this.initNSI(customSwordDir);
    this.initIpcInterface();
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

    if (this._platformHelper.isElectron()) {
      // Enable strongs with non-breaking space for Electron.
      // Check first if the method exists, since it was not available in earlier versions of node-sword-interface.
      if (this._nsi.enableStrongsWithNbsp != null) {
        this._nsi.enableStrongsWithNbsp();
      }
    }
  }

  createNsi(customSwordDir=undefined) {
    var nsi = null;

    var basePath = undefined;
    if (this._platformHelper.isWin()) {
      if (global.isDev) {
        basePath = path.join(__dirname, '../../../node_modules/node-sword-interface');
      } else {
        if (process.resourcesPath != null) {
          // In production mode on Windows, the basePath is inside app.asar.unpacked
          basePath = path.join(process.resourcesPath, 'app.asar.unpacked/node_modules/node-sword-interface');
        }
      }
    }

    if (customSwordDir !== undefined) {
      // If the custom SWORD directory is not existing at this point ... create it!
      if (!fs.existsSync(customSwordDir)) {
        fs.mkdirSync(customSwordDir);
      }

      if (basePath !== undefined) {
        console.log(`Initializing NSI with special basePath ${basePath}.`);
        nsi = new NodeSwordInterface(customSwordDir, basePath);
      } else {
        nsi = new NodeSwordInterface(customSwordDir);
      }
    } else {
      if (basePath !== undefined) {
        nsi = new NodeSwordInterface(undefined, basePath);
      } else {
        nsi = new NodeSwordInterface();
      }
    }

    return nsi;
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

    // New IPC handler: export metadata of all local modules to JSON
    this._ipcMain.add('nsi_persistLocalModulesData', async () => {
      try {
        const moduleTypes = ['BIBLE', 'DICT', 'COMMENTARY'];
        let allModules = [];

        for (let i = 0; i < moduleTypes.length; i++) {
          const currentType = moduleTypes[i];
          const modulesOfType = this._nsi.getAllLocalModules(currentType) || [];

          const mappedModules = modulesOfType.map((mod) => {
            return {
              name: mod.name,
              type: mod.type,
              language: mod.language,
              version: mod.version
            };
          });

          allModules = allModules.concat(mappedModules);
        }

        const userDataDir = this._platformHelper.getUserDataPath();
        const targetFile = path.join(userDataDir, 'local_modules.json');

        if (!fs.existsSync(userDataDir)) {
          fs.mkdirSync(userDataDir, { recursive: true });
        }

        fs.writeFileSync(targetFile, JSON.stringify(allModules, null, 2), 'utf8');

        return 0;
      } catch (e) {
        console.error('Error while persisting local modules metadata:', e);
        return -1;
      }
    });

    this._ipcMain.add('nsi_getRepoNames', () => {
      return this._nsi.getRepoNames();
    });

    this._ipcMain.add('nsi_getRepoLanguages', (repositoryName, moduleType) => {
      return this._nsi.getRepoLanguages(repositoryName, moduleType);
    });

    this._ipcMain.add('nsi_getAllRepoModules', (repositoryName, moduleType) => {
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

    this._ipcMain.add('nsi_getAllLocalModules', (moduleType='BIBLE') => {
      return this._nsi.getAllLocalModules(moduleType);
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

    this._ipcMain.add('nsi_getRawModuleEntry', (moduleCode, key) => {
      return this._nsi.getRawModuleEntry(moduleCode, key);
    });

    this._ipcMain.add('nsi_getReferenceText', (moduleCode, key) => {
      return this._nsi.getReferenceText(moduleCode, key);
    });

    this._ipcMain.add('nsi_getChapterText', (moduleCode, bookCode, chapter) => {
      return this._nsi.getChapterText(moduleCode, bookCode, chapter);
    });

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

    this._ipcMain.add('nsi_getBookVerseCount', (moduleCode, bookCode) => {
      return this._nsi.getBookVerseCount(moduleCode, bookCode);
    });

    this._ipcMain.add('nsi_getChapterVerseCount', (moduleCode, bookCode, chapter) => {
      return this._nsi.getChapterVerseCount(moduleCode, bookCode, chapter);
    });

    this._ipcMain.add('nsi_getAllChapterVerseCounts', (moduleCode, bookCode) => {
      return this._nsi.getAllChapterVerseCounts(moduleCode, bookCode);
    });

    this._ipcMain.add('nsi_getBookIntroduction', (moduleCode, bookCode) => {
      return this._nsi.getBookIntroduction(moduleCode, bookCode);
    });

    this._ipcMain.add('nsi_getBookHeaderList', (moduleCode, bookCode, startVerseNumber=-1, verseCount=-1) => {
      return this._nsi.getBookHeaderList(moduleCode, bookCode, startVerseNumber, verseCount);
    });

    this._ipcMain.add('nsi_moduleHasBook', (moduleCode, bookCode) => {
      return this._nsi.moduleHasBook(moduleCode, bookCode);
    });

    this._ipcMain.add('nsi_getDictModuleKeys', (moduleCode) => {
      return this._nsi.getDictModuleKeys(moduleCode);
    });

    this._ipcMain.add('nsi_moduleHasApocryphalBooks', (moduleCode) => {
      const books = this._nsi.getBookList(moduleCode);

      for (let i = 0; i < books.length; i++) {
        let bookId = books[i];
        let isApocryphal = global.models.BibleBook.isApocryphalBook(bookId);

        if (isApocryphal) {
          return true;
        }
      }

      return false;
    });

    this._ipcMain.add('nsi_getModuleBookStatus', (bookCode) => {
      var allModules = this._nsi.getAllLocalModules('BIBLE');
      var moduleBookStatus = {};

      for (let i = 0; i < allModules.length; i++) {
        const currentModuleName = allModules[i].name;
        const currentModuleHasBook = this._nsi.moduleHasBook(currentModuleName, bookCode);
        moduleBookStatus[currentModuleName] = currentModuleHasBook;
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
             useWordBoundaries,
             useExtendedVerseBoundaries) => {

        const results = await this._nsi.getModuleSearchResults(moduleCode,
                                                               searchTerm,
                                                               progressCB,
                                                               searchType,
                                                               searchScope,
                                                               isCaseSensitive,
                                                               useExtendedVerseBoundaries,
                                                               useWordBoundaries);

        return results;
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