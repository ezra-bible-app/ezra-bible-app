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

const DropboxSync = require('./dropbox_sync.js');
const fs = require('fs');
const path = require('path');

/**
 * DropboxModuleHelper provides functionality for managing SWORD Bible modules
 * stored in a custom Dropbox repository.
 * 
 * This helper class handles:
 * - Validation of custom Dropbox module repository structure
 * - Caching and retrieval of available modules from Dropbox
 * - Parsing of SWORD module configuration files
 * - Installation of modules from Dropbox to the local SWORD directory
 * 
 * The custom repository is expected to have the following structure:
 * - /mods.d.tar.gz - Compressed archive containing mods.d directory with module configuration files
 * - /packages/ - Directory containing module installation packages (.zip files)
 * 
 * @class DropboxModuleHelper
 */
class DropboxModuleHelper {
  constructor(platformHelper, nsi) {
    this._platformHelper = platformHelper;
    this._nsi = nsi;
  }

  getDropboxCacheFilePath() {
    const userDataDir = this._platformHelper.getUserDataPath();
    return path.join(userDataDir, 'dropbox_modules_cache.json');
  }

  async validateCustomModuleRepo(customModuleRepo) {
    console.log('[DropboxModuleHelper] Starting validation of custom module repo:', customModuleRepo);
    
    const dropboxToken = global.ipc.ipcSettingsHandler.getConfig().get('dropboxToken');

    if (!dropboxToken) {
      console.log('[DropboxModuleHelper] Validation failed: Dropbox account not linked');
      return { valid: false, errorKey: 'dropbox.repo-validation-error-not-linked' };
    }

    if (!customModuleRepo || customModuleRepo.trim() === '') {
      console.log('[DropboxModuleHelper] Validation failed: Custom module repository path is empty');
      return { valid: false, errorKey: 'dropbox.repo-validation-error-empty-path' };
    }

    try {
      const dropboxSync = new DropboxSync('6m7e5ri5udcbkp3', dropboxToken, null);

      let repoPath = customModuleRepo.trim();
      if (!repoPath.startsWith('/')) repoPath = '/' + repoPath;
      if (repoPath.endsWith('/')) repoPath = repoPath.slice(0, -1);
      
      console.log('[DropboxModuleHelper] Normalized repo path:', repoPath);

      // Check if the repository folder exists
      console.log('[DropboxModuleHelper] Checking if repository folder exists:', repoPath);
      try {
        const repoMetadata = await dropboxSync.getFileMetaData(repoPath);
        if (repoMetadata['.tag'] !== 'folder') {
          console.log('[DropboxModuleHelper] Validation failed: Repository path is not a folder');
          return { valid: false, errorKey: 'dropbox.repo-validation-error-not-a-folder' };
        }
        console.log('[DropboxModuleHelper] Repository folder exists');
      } catch (e) {
        if (e.error && e.error.error_summary && e.error.error_summary.indexOf('not_found') !== -1) {
          console.log('[DropboxModuleHelper] Validation failed: Repository folder not found');
          return { valid: false, errorKey: 'dropbox.repo-validation-error-not-found' };
        }
        console.error('[DropboxModuleHelper] Error checking repository folder:', e);
        throw e;
      }

      // Check if mods.d.tar.gz exists
      const modsIndexPath = `${repoPath}/mods.d.tar.gz`;
      console.log('[DropboxModuleHelper] Checking for index file:', modsIndexPath);
      const modsIndexExists = await dropboxSync.isDropboxFileExisting(modsIndexPath);
      
      if (!modsIndexExists) {
        console.log('[DropboxModuleHelper] Validation failed: Index file not found');
        return { valid: false, errorKey: 'dropbox.repo-validation-error-index-not-found' };
      }
      
      console.log('[DropboxModuleHelper] Index file found');

      // Check if packages folder exists
      const packagesPath = `${repoPath}/packages`;
      console.log('[DropboxModuleHelper] Checking for packages folder:', packagesPath);
      
      try {
        const metadata = await dropboxSync.getFileMetaData(packagesPath);
        
        if (metadata['.tag'] !== 'folder') {
          console.log('[DropboxModuleHelper] Validation failed: packages is not a folder');
          return { valid: false, errorKey: 'dropbox.repo-validation-error-packages-not-a-folder' };
        }
        
        console.log('[DropboxModuleHelper] packages folder exists');
        
        // Check if packages folder is not empty
        const folderContents = await dropboxSync.listFolder(packagesPath);
        console.log(`[DropboxModuleHelper] packages folder contains ${folderContents.length} items`);
        
        if (!folderContents || folderContents.length === 0) {
          console.log('[DropboxModuleHelper] Validation failed: packages folder is empty');
          return { valid: false, errorKey: 'dropbox.repo-validation-error-packages-empty' };
        }
      } catch (e) {
        if (e.error && e.error.error_summary && e.error.error_summary.indexOf('not_found') !== -1) {
          console.log('[DropboxModuleHelper] Validation failed: packages folder not found');
          return { valid: false, errorKey: 'dropbox.repo-validation-error-packages-not-found' };
        }
        console.error('[DropboxModuleHelper] Error checking packages folder:', e);
        throw e;
      }

      console.log('[DropboxModuleHelper] Validation successful - all checks passed');
      return { valid: true, errorKey: '' };

    } catch (error) {
      console.error('[DropboxModuleHelper] Error validating custom module repo:', error);
      return { valid: false, errorKey: 'dropbox.repo-validation-error-unknown', errorParams: { error: error.message || 'Unknown error' } };
    }
  }

  async updateDropboxModulesCache() {
    const dropboxToken = global.ipc.ipcSettingsHandler.getConfig().get('dropboxToken');
    const useCustomModuleRepo = global.ipc.ipcSettingsHandler.getConfig().get('dropboxUseCustomModuleRepo');
    const customModuleRepo = global.ipc.ipcSettingsHandler.getConfig().get('dropboxCustomModuleRepo');

    if (!dropboxToken || !useCustomModuleRepo || !customModuleRepo) {
      // No Dropbox configuration, clear cache
      const cacheFile = this.getDropboxCacheFilePath();
      if (fs.existsSync(cacheFile)) {
        fs.unlinkSync(cacheFile);
      }
      return;
    }

    try {
      const dropboxSync = new DropboxSync('6m7e5ri5udcbkp3', dropboxToken, null);
      const tempDir = this._platformHelper.getTempDir();
      const modsFile = 'mods.d.tar.gz';
      
      let repoPath = customModuleRepo.trim();
      if (!repoPath.startsWith('/')) repoPath = '/' + repoPath;
      if (repoPath.endsWith('/')) repoPath = repoPath.slice(0, -1);
      
      const dropboxPath = `${repoPath}/${modsFile}`;
      
      await dropboxSync.downloadFile(dropboxPath, tempDir);
      
      const tarballPath = path.join(tempDir, modsFile);
      const extractDir = path.join(tempDir, 'dropbox_mods');
      
      if (!fs.existsSync(extractDir)) {
        fs.mkdirSync(extractDir, { recursive: true });
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
            } else {
              console.warn('[Dropbox] Failed to parse config for:', file);
            }
          }
        }
      } else {
        console.warn('[Dropbox] mods.d directory not found after extraction');
      }
      
      // Save to persistent cache
      const cacheFile = this.getDropboxCacheFilePath();
      fs.writeFileSync(cacheFile, JSON.stringify(modules, null, 2), 'utf-8');
      
    } catch (error) {
      console.error('[Dropbox] Error updating Dropbox modules cache:', error);
    }
  }

  async getDropboxModules() {
    // Read from persistent cache
    const cacheFile = this.getDropboxCacheFilePath();
    
    if (fs.existsSync(cacheFile)) {
      try {
        const content = fs.readFileSync(cacheFile, 'utf-8');
        const modules = JSON.parse(content);
        return modules;
      } catch (error) {
        console.error('[Dropbox] Error reading Dropbox modules cache:', error);
        return [];
      }
    }
    
    return [];
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
          if (key === 'GlobalOptionFilter') {
            if (value === 'OSISStrongs') {
              config.hasStrongs = true;
            }
            if (value === 'OSISHeadings') {
              config.hasHeadings = true;
            }
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
}

module.exports = DropboxModuleHelper;
