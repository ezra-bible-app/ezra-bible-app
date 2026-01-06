/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2026 Ezra Bible App Development Team <contact@ezrabibleapp.net>

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
const DropboxSync = require('../db_sync/dropbox_sync.js');
const fs = require('fs');
const path = require('path');
const os = require('os');

class IpcNsiHandler {
  constructor(customSwordDir=undefined) {
    this._ipcMain = new IpcMain();
    this._platformHelper = new PlatformHelper();
    this._nsi = null;
    this._customSwordDir = customSwordDir;
    this._dropboxModulesCache = null;

    this.initNSI(this._customSwordDir);
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

  getLanguageModuleCount(selectedRepos, language, moduleType, dropboxModules=[]) {
    var count = 0;

    for (var i = 0; i < selectedRepos.length; i++) {
      var currentRepo = selectedRepos[i];
      if (currentRepo === 'Dropbox') {
         const filtered = dropboxModules.filter(m => {
            if (m.language !== language) return false;
            if (moduleType === 'BIBLE' && m.type !== 'Biblical Texts') return false;
            if (moduleType === 'COMMENTARY' && m.type !== 'Commentaries') return false;
            if (moduleType === 'DICTIONARY' && m.type !== 'Lexicons / Dictionaries') return false;
            return true;
         });
         count += filtered.length;
      } else {
        count += this._nsi.getRepoLanguageModuleCount(currentRepo, language, moduleType);
      }
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
      if (this._dropboxModulesCache) {
        return this._dropboxModulesCache = null;
      }

      var repoUpdateStatus = await this._nsi.updateRepositoryConfig(progressCB);
      return repoUpdateStatus;
    }, 'nsi_updateRepoConfigProgress');
    
    this._ipcMain.add('nsi_getRepoNames', async () => {
      let repoNames = this._nsi.getRepoNames();
      
      const dropboxToken = global.ipc.ipcSettingsHandler.getConfig().get('dropboxToken');
      const useCustomModuleRepo = global.ipc.ipcSettingsHandler.getConfig().get('dropboxUseCustomModuleRepo');
      const customModuleRepo = global.ipc.ipcSettingsHandler.getConfig().get('dropboxCustomModuleRepo');

      if (dropboxToken && useCustomModuleRepo && customModuleRepo) {
        repoNames.push('Dropbox');
      }

      return repoNames;
    });

    this._ipcMain.add('nsi_getRepoLanguages', async (repositoryName, moduleType) => {
      const dropboxToken = global.ipc.ipcSettingsHandler.getConfig().get('dropboxToken');
      const useCustomModuleRepo = global.ipc.ipcSettingsHandler.getConfig().get('dropboxUseCustomModuleRepo');
      const customModuleRepo = global.ipc.ipcSettingsHandler.getConfig().get('dropboxCustomModuleRepo');

      if (useCustomModuleRepo && repositoryName === 'Dropbox') {
        const modules = await this.getDropboxModules(dropboxToken, customModuleRepo);
        
        const languages = new Set();
        modules.forEach(m => {
          if (moduleType === 'BIBLE' && m.type === 'Biblical Texts') languages.add(m.language);
          if (moduleType === 'COMMENTARY' && m.type === 'Commentaries') languages.add(m.language);
          if (moduleType === 'DICTIONARY' && m.type === 'Lexicons / Dictionaries') languages.add(m.language);
        });
        
        return Array.from(languages);

      } else {

        return this._nsi.getRepoLanguages(repositoryName, moduleType);
      }
    });

    this._ipcMain.add('nsi_getAllRepoModules', async (repositoryName, moduleType) => {
      if (repositoryName === 'Dropbox') {
        const dropboxToken = global.ipc.ipcSettingsHandler.getConfig().get('dropboxToken');
        const useCustomModuleRepo = global.ipc.ipcSettingsHandler.getConfig().get('dropboxUseCustomModuleRepo');
        const customModuleRepo = global.ipc.ipcSettingsHandler.getConfig().get('dropboxCustomModuleRepo');
        const modules = await this.getDropboxModules(dropboxToken, useCustomModuleRepo && customModuleRepo ? customModuleRepo : null);
        
        return modules.filter(m => {
          if (moduleType === 'BIBLE') return m.type === 'Biblical Texts';
          if (moduleType === 'COMMENTARY') return m.type === 'Commentaries';
          if (moduleType === 'DICTIONARY') return m.type === 'Lexicons / Dictionaries';
          return true;
        });
      }

      return this._nsi.getAllRepoModules(repositoryName, moduleType);
    });

    this._ipcMain.add('nsi_getRepoModulesByLang', async (repositoryName, language, moduleType, headersFilter, strongsFilter, hebrewStrongsKeys, greekStrongsKeys) => {
      if (repositoryName === 'Dropbox') {
        const dropboxToken = global.ipc.ipcSettingsHandler.getConfig().get('dropboxToken');
        const useCustomModuleRepo = global.ipc.ipcSettingsHandler.getConfig().get('dropboxUseCustomModuleRepo');
        const customModuleRepo = global.ipc.ipcSettingsHandler.getConfig().get('dropboxCustomModuleRepo');
        const modules = await this.getDropboxModules(dropboxToken, useCustomModuleRepo && customModuleRepo ? customModuleRepo : null);
        
        return modules.filter(m => {
          if (m.language !== language) return false;
          
          if (moduleType === 'BIBLE' && m.type !== 'Biblical Texts') return false;
          if (moduleType === 'COMMENTARY' && m.type !== 'Commentaries') return false;
          if (moduleType === 'DICTIONARY' && m.type !== 'Lexicons / Dictionaries') return false;
          
          // Note: Additional filters (headers, strongs, etc.) are not fully supported for Dropbox modules 
          // as we don't have full metadata without installing, but we can check basic properties if available in config.
          // For now, we return all matching language/type.
          
          return true;
        });
      }
      return this._nsi.getRepoModulesByLang(repositoryName,
                                            language,
                                            moduleType,
                                            headersFilter,
                                            strongsFilter,
                                            hebrewStrongsKeys,
                                            greekStrongsKeys);
    });

    this._ipcMain.add('nsi_getRepoModule', async (moduleCode) => {
      if (moduleCode == null) {
        return null;
      } else {
        let module = null;
        
        if (this._nsi.isModuleAvailableInRepo(moduleCode)) {
          module = this._nsi.getRepoModule(moduleCode);
        }

        if (!module) {
           const dropboxToken = global.ipc.ipcSettingsHandler.getConfig().get('dropboxToken');
           const useCustomModuleRepo = global.ipc.ipcSettingsHandler.getConfig().get('dropboxUseCustomModuleRepo');
           const customModuleRepo = global.ipc.ipcSettingsHandler.getConfig().get('dropboxCustomModuleRepo');

           if (dropboxToken && useCustomModuleRepo && customModuleRepo) {
               const dropboxModules = await this.getDropboxModules(dropboxToken, customModuleRepo);
               module = dropboxModules.find(m => m.name === moduleCode);
               if (module) {
                   module.repositoryName = 'Dropbox';
               }
           }
        }

        return module;
      }
    });

    this._ipcMain.add('nsi_getAllLocalModules', (moduleType='BIBLE') => {
      return this._nsi.getAllLocalModules(moduleType);
    });

    this._ipcMain.addSync('nsi_getAllLocalModulesSync', (moduleType='BIBLE') => {
      return this._nsi.getAllLocalModules(moduleType);
    });

    this._ipcMain.add('nsi_getAllLanguageModuleCount', async (selectedRepos, languageCodeArray, moduleType='BIBLE') => {
      var allLanguageModuleCount = {};
      
      let dropboxModules = [];
      if (selectedRepos.includes('Dropbox')) {
         const dropboxToken = global.ipc.ipcSettingsHandler.getConfig().get('dropboxToken');
         const useCustomModuleRepo = global.ipc.ipcSettingsHandler.getConfig().get('dropboxUseCustomModuleRepo');
         const customModuleRepo = global.ipc.ipcSettingsHandler.getConfig().get('dropboxCustomModuleRepo');
         if (useCustomModuleRepo && customModuleRepo) {
           dropboxModules = await this.getDropboxModules(dropboxToken, customModuleRepo);
         }
      }

      for (let i = 0; i < languageCodeArray.length; i++) {
        const currentLanguageCode = languageCodeArray[i];

        const currentLanguageModuleCount = this.getLanguageModuleCount(selectedRepos, currentLanguageCode, moduleType, dropboxModules);
        allLanguageModuleCount[currentLanguageCode] = currentLanguageModuleCount;
      }

      return allLanguageModuleCount;
    });

    this._ipcMain.addWithProgressCallback('nsi_installModule', async (progressCB, moduleCode) => { 
      try {
        // Check if module is from Dropbox
        const dropboxToken = global.ipc.ipcSettingsHandler.getConfig().get('dropboxToken');
        const useCustomModuleRepo = global.ipc.ipcSettingsHandler.getConfig().get('dropboxUseCustomModuleRepo');
        const customModuleRepo = global.ipc.ipcSettingsHandler.getConfig().get('dropboxCustomModuleRepo');
        
        if (dropboxToken && useCustomModuleRepo && customModuleRepo) {
          const dropboxModules = await this.getDropboxModules(dropboxToken, customModuleRepo);
          const dropboxModule = dropboxModules.find(m => m.name === moduleCode);
          
          if (dropboxModule) {
            let result = await this.installDropboxModule(moduleCode, progressCB);
            return result;
          }
        }

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

  async getDropboxModules(dropboxToken, customModuleRepo) {
    if (!customModuleRepo) {
      return [];
    }

    if (this._dropboxModulesCache) {
      return this._dropboxModulesCache;
    }
    
    const dropboxSync = new DropboxSync('6m7e5ri5udcbkp3', dropboxToken, null);
    const tempDir = this._platformHelper.getTempDir();
    const modsFile = 'mods.d.tar.gz';
    
    let repoPath = customModuleRepo || '';
    repoPath = repoPath.trim();
    if (!repoPath.startsWith('/')) repoPath = '/' + repoPath;
    if (repoPath.endsWith('/')) repoPath = repoPath.slice(0, -1);
    
    const dropboxPath = `${repoPath}/${modsFile}`;
    
    try {
      await dropboxSync.downloadFile(dropboxPath, tempDir);
      const tarballPath = path.join(tempDir, modsFile);
      
      const extractDir = path.join(tempDir, 'dropbox_mods');
      if (!fs.existsSync(extractDir)) {
        fs.mkdirSync(extractDir);
      }
      
      this._nsi.unTarGZ(tarballPath, extractDir);
      
      const modules = [];
      const modsDDir = path.join(extractDir, 'mods.d');
      
      if (fs.existsSync(modsDDir)) {
        const files = fs.readdirSync(modsDDir);
        for (const file of files) {
          if (file.endsWith('.conf')) {
            const configPath = path.join(modsDDir, file);
            const moduleConfig = this.parseModuleConfig(configPath);
            if (moduleConfig) {
              moduleConfig.repository = 'Dropbox';
              modules.push(moduleConfig);
            }
          }
        }
      }
      
      this._dropboxModulesCache = modules;
      return modules;
    } catch (error) {
      console.error('Error fetching Dropbox modules:', error);
      return [];
    }
  }

  parseModuleConfig(configPath) {
    try {
      const content = fs.readFileSync(configPath, 'utf-8');
      const lines = content.split('\n');
      const config = {};
      let currentSection = null;

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('[') && trimmedLine.endsWith(']')) {
          currentSection = trimmedLine.substring(1, trimmedLine.length - 1);
          config.name = currentSection;
        } else if (trimmedLine.includes('=')) {
          const parts = trimmedLine.split('=');
          const key = parts[0].trim();
          const value = parts.slice(1).join('=').trim();
          
          if (key === 'Description') config.description = value;
          if (key === 'Lang') config.language = value;
          if (key === 'Version') config.version = value;
          if (key === 'About') config.about = value;
          if (key === 'InstallSize') config.size = parseInt(value);
          if (key === 'ModDrv') {
             if (value === 'zText') config.type = 'Biblical Texts';
             if (value === 'zCom') config.type = 'Commentaries';
             if (value === 'zLD') config.type = 'Lexicons / Dictionaries';
          }
        }
      }
      return config;
    } catch (e) {
      console.error('Error parsing module config:', e);
      return null;
    }
  }

  async installDropboxModule(moduleCode, progressCB) {
    const dropboxToken = global.ipc.ipcSettingsHandler.getConfig().get('dropboxToken');
    const customModuleRepo = global.ipc.ipcSettingsHandler.getConfig().get('dropboxCustomModuleRepo');
    
    const dropboxSync = new DropboxSync('6m7e5ri5udcbkp3', dropboxToken, null);
    const tempDir = this._platformHelper.getTempDir();
    
    let repoPath = customModuleRepo || '';
    repoPath = repoPath.trim();
    if (!repoPath.startsWith('/')) repoPath = '/' + repoPath;
    if (repoPath.endsWith('/')) repoPath = repoPath.slice(0, -1);

    let zipFile = `${moduleCode.toLowerCase()}.zip`;
    let dropboxPath = `${repoPath}/packages/${zipFile}`;

    try {
      if (progressCB) progressCB({ totalPercent: 10, message: '' });
      
      await dropboxSync.downloadFile(dropboxPath, tempDir);
      
      if (progressCB) progressCB({ totalPercent: 50, message: '' });
      
      const zipFilePath = path.join(tempDir, zipFile);
      const swordPath = this._nsi.getSwordPath();
      
      console.log(`Installing Dropbox module ${moduleCode} from ${zipFilePath} to ${swordPath}`);
      const unzipSuccessful = this._nsi.unZip(zipFilePath, swordPath);

      if (unzipSuccessful) {
        this._nsi.refreshLocalModules();
        console.log(`Dropbox module ${moduleCode} installed successfully.`);
        if (progressCB) progressCB({ totalPercent: 100, message: '' });
        return 0;
      } else {
        console.log(`Failed to unzip Dropbox module ${moduleCode}.`);
        return -1;
      }
      
    } catch (error) {
      console.error('Error installing Dropbox module:', error);
      return -1;
    }
  }

  setMainWindow(mainWindow) {
    this._ipcMain.setMainWindow(mainWindow);
  }
}

module.exports = IpcNsiHandler;