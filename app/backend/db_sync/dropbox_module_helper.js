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
 * SWORD module type strings as returned by node-sword-interface.
 * These must be kept in sync with app/frontend/helpers/sword_module_helper.js
 */
const SWORD_MODULE_TYPE = {
  BIBLE: 'Biblical Texts',
  COMMENTARY: 'Commentaries',
  DICTIONARY: 'Lexicons / Dictionaries',
  IMAGES: 'Images',
  MAPS: 'Maps'
};

const DROPBOX_CLIENT_ID = '6m7e5ri5udcbkp3';

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
    const dropboxRefreshToken = global.ipc.ipcSettingsHandler.getConfig().get('dropboxRefreshToken');

    if (!dropboxToken) {
      console.log('[DropboxModuleHelper] Validation failed: Dropbox account not linked');
      return { valid: false, errorKey: 'dropbox.repo-validation-error-not-linked' };
    }

    if (!customModuleRepo || customModuleRepo.trim() === '') {
      console.log('[DropboxModuleHelper] Validation failed: Custom module repository path is empty');
      return { valid: false, errorKey: 'dropbox.repo-validation-error-empty-path' };
    }

    try {
      const dropboxSync = new DropboxSync(DROPBOX_CLIENT_ID, dropboxToken, dropboxRefreshToken);

      let repoPath = customModuleRepo.trim();
      if (!repoPath.startsWith('/')) repoPath = '/' + repoPath;
      if (repoPath.endsWith('/')) repoPath = repoPath.slice(0, -1);
      
      console.log('[DropboxModuleHelper] Normalized repo path:', repoPath);

      // List the repository folder contents - this checks if repo exists and gets contents in one API call
      console.log('[DropboxModuleHelper] Listing repository folder:', repoPath);
      let repoContents;
      try {
        const repoResult = await dropboxSync.listFolder(repoPath);
        repoContents = repoResult.entries;
        console.log(`[DropboxModuleHelper] Repository folder contains ${repoContents.length} items`);
      } catch (e) {
        if (e.error && e.error.error_summary && e.error.error_summary.indexOf('not_found') !== -1) {
          console.log('[DropboxModuleHelper] Validation failed: Repository folder not found');
          return { valid: false, errorKey: 'dropbox.repo-validation-error-not-found' };
        }
        console.error('[DropboxModuleHelper] Error listing repository folder:', e);
        throw e;
      }

      // Check if mods.d.tar.gz exists in the listing
      const modsIndexExists = repoContents.some(item => item.name === 'mods.d.tar.gz' && item['.tag'] === 'file');
      if (!modsIndexExists) {
        console.log('[DropboxModuleHelper] Validation failed: Index file not found');
        return { valid: false, errorKey: 'dropbox.repo-validation-error-index-not-found' };
      }
      console.log('[DropboxModuleHelper] Index file found');

      // Check if packages folder exists in the listing
      const packagesFolder = repoContents.find(item => item.name === 'packages' && item['.tag'] === 'folder');
      if (!packagesFolder) {
        console.log('[DropboxModuleHelper] Validation failed: packages folder not found');
        return { valid: false, errorKey: 'dropbox.repo-validation-error-packages-not-found' };
      }
      console.log('[DropboxModuleHelper] packages folder exists');

      // Check if packages folder is not empty (second API call)
      const packagesPath = `${repoPath}/packages`;
      console.log('[DropboxModuleHelper] Listing packages folder:', packagesPath);
      try {
        const packagesResult = await dropboxSync.listFolder(packagesPath);
        const folderContents = packagesResult.entries;
        console.log(`[DropboxModuleHelper] packages folder contains ${folderContents.length} items`);
        
        if (!folderContents || folderContents.length === 0) {
          console.log('[DropboxModuleHelper] Validation failed: packages folder is empty');
          return { valid: false, errorKey: 'dropbox.repo-validation-error-packages-empty' };
        }
      } catch (e) {
        console.error('[DropboxModuleHelper] Error listing packages folder:', e);
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
    const dropboxRefreshToken = global.ipc.ipcSettingsHandler.getConfig().get('dropboxRefreshToken');
    const useCustomModuleRepo = global.ipc.ipcSettingsHandler.getConfig().get('dropboxUseCustomModuleRepo');
    const customModuleRepo = global.ipc.ipcSettingsHandler.getConfig().get('dropboxCustomModuleRepo');

    if (!dropboxToken || !dropboxRefreshToken || !useCustomModuleRepo || !customModuleRepo) {
      // No Dropbox configuration, clear cache
      const cacheFile = this.getDropboxCacheFilePath();
      if (fs.existsSync(cacheFile)) {
        fs.unlinkSync(cacheFile);
      }
      return;
    }

    try {
      const dropboxSync = new DropboxSync(DROPBOX_CLIENT_ID, dropboxToken, dropboxRefreshToken);
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
             if (value === 'zText') config.type = SWORD_MODULE_TYPE.BIBLE;
             if (value === 'zCom') config.type = SWORD_MODULE_TYPE.COMMENTARY;
             if (value === 'zLD') config.type = SWORD_MODULE_TYPE.DICTIONARY;
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
    const dropboxRefreshToken = global.ipc.ipcSettingsHandler.getConfig().get('dropboxRefreshToken');
    
    const dropboxSync = new DropboxSync(DROPBOX_CLIENT_ID, dropboxToken, dropboxRefreshToken);
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

  async listZipFiles(dropboxToken, dropboxRefreshToken) {
    const dropboxSync = new DropboxSync(DROPBOX_CLIENT_ID, dropboxToken, dropboxRefreshToken);
    const rootPath = '';
    
    // Debug info collection
    const debugInfo = {
      foldersScanned: [],
      folderDetails: [],
      totalEntriesProcessed: 0,
      totalFilesFound: 0,
      totalFoldersFound: 0,
      zipFilesFound: 0,
      totalRetries: 0,
      totalPaginationCalls: 0,
      fileExtensions: {},
      startTime: Date.now(),
      endTime: null,
      errors: []
    };
    
    try {
      await dropboxSync.refreshAccessToken();
      
      // Recursive function to list files in a folder and its subfolders
      const listFilesRecursive = async (folderPath) => {
        const folderName = folderPath || '/';
        debugInfo.foldersScanned.push(folderName);
        
        let folderResult;
        try {
          folderResult = await dropboxSync.listFolder(folderPath);
        } catch (folderError) {
          debugInfo.errors.push({
            folder: folderName,
            error: folderError.message || String(folderError)
          });
          debugInfo.folderDetails.push({
            path: folderName,
            entries: 0,
            files: 0,
            folders: 0,
            zipFiles: 0,
            retries: 0,
            paginationCalls: 0,
            error: true
          });
          return [];
        }
        
        const entries = folderResult.entries;
        debugInfo.totalRetries += folderResult.retryCount;
        debugInfo.totalPaginationCalls += folderResult.paginationCalls;
        debugInfo.totalEntriesProcessed += entries.length;

        console.log('[listZipFiles] Folder "' + folderName + '": ' +
          entries.length + ' entries, ' +
          'retries=' + folderResult.retryCount + ', ' +
          'pagination=' + folderResult.paginationCalls);
        
        let zipFiles = [];
        let folderFilesCount = 0;
        let folderFoldersCount = 0;
        let folderZipCount = 0;
        
        for (const entry of entries) {
          if (entry['.tag'] === 'file') {
            debugInfo.totalFilesFound++;
            folderFilesCount++;
            
            // Track file extension
            const ext = (entry.name.includes('.') ? entry.name.split('.').pop().toLowerCase() : 'no-ext');
            debugInfo.fileExtensions[ext] = (debugInfo.fileExtensions[ext] || 0) + 1;
            
            if (entry.name.toLowerCase().endsWith('.zip')) {
              debugInfo.zipFilesFound++;
              folderZipCount++;
              zipFiles.push({
                name: entry.name,
                path: entry.path_display,
                size: entry.size
              });
            }
          } else if (entry['.tag'] === 'folder') {
            debugInfo.totalFoldersFound++;
            folderFoldersCount++;
            // Recursively search in subdirectories
            const subFolderZipFiles = await listFilesRecursive(entry.path_display);
            zipFiles = zipFiles.concat(subFolderZipFiles);
          }
        }
        
        debugInfo.folderDetails.push({
          path: folderName,
          entries: entries.length,
          files: folderFilesCount,
          folders: folderFoldersCount,
          zipFiles: folderZipCount,
          retries: folderResult.retryCount,
          paginationCalls: folderResult.paginationCalls
        });

        console.log('[listZipFiles] Folder "' + folderName + '" result: ' +
          'files=' + folderFilesCount + ', folders=' + folderFoldersCount +
          ', zips=' + folderZipCount);
        
        return zipFiles;
      };
      
      const zipFiles = await listFilesRecursive(rootPath);
      debugInfo.endTime = Date.now();

      console.log('[listZipFiles] Complete. Total zip files: ' + zipFiles.length +
        ', folders scanned: ' + debugInfo.foldersScanned.length +
        ', duration: ' + (debugInfo.endTime - debugInfo.startTime) + 'ms' +
        ', errors: ' + debugInfo.errors.length);
      
      return {
        files: zipFiles,
        debugInfo: debugInfo
      };
      
    } catch (error) {
      console.error('Error listing zip files from Dropbox:', error);
      debugInfo.endTime = Date.now();
      debugInfo.errors.push({
        folder: 'general',
        error: error.message || String(error)
      });
      
      // Provide more user-friendly error messages for common network issues
      if (error.code === 'EAI_AGAIN' || error.errno === 'EAI_AGAIN' || 
          error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT' ||
          error.type === 'system') {
        const networkError = new Error('Unable to connect to Dropbox. Please check your internet connection.');
        networkError.code = 'NETWORK_ERROR';
        networkError.originalError = error;
        networkError.debugInfo = debugInfo;
        throw networkError;
      }
      
      error.debugInfo = debugInfo;
      throw error;
    }
  }

  async validateModuleZip(dropboxPath, dropboxToken, dropboxRefreshToken) {
    const dropboxSync = new DropboxSync(DROPBOX_CLIENT_ID, dropboxToken, dropboxRefreshToken);
    const tempDir = this._platformHelper.getTempDir();
    const extractDir = path.join(tempDir, `extract_${Date.now()}`);
    
    // Extract filename from path
    const filename = path.basename(dropboxPath);
    
    try {
      console.log(`[validateModuleZip] Starting validation for: ${dropboxPath}`);
      await dropboxSync.refreshAccessToken();
      console.log(`[validateModuleZip] Access token refreshed, downloading file...`);
      
      // Download zip file to temp directory
      await dropboxSync.downloadFile(dropboxPath, tempDir);
      const zipFilePath = path.join(tempDir, filename);
      console.log(`[validateModuleZip] Downloaded to: ${zipFilePath}`);
      
      // Create extraction directory
      if (!fs.existsSync(extractDir)) {
        fs.mkdirSync(extractDir, { recursive: true });
      }
      
      // Extract zip to temp directory
      console.log(`[validateModuleZip] Extracting to: ${extractDir}`);
      const unzipSuccessful = this._nsi.unZip(zipFilePath, extractDir);
      
      if (!unzipSuccessful) {
        console.log(`[validateModuleZip] Unzip failed for: ${zipFilePath}`);
        // Clean up
        if (fs.existsSync(zipFilePath)) {
          fs.unlinkSync(zipFilePath);
        }
        if (fs.existsSync(extractDir)) {
          fs.rmdirSync(extractDir, { recursive: true });
        }
        return {
          valid: false,
          moduleId: null,
          alreadyInstalled: false,
          error: `Failed to extract zip file: ${zipFilePath}`
        };
      }
      
      console.log(`[validateModuleZip] Unzip successful, checking structure...`);
      
      // Check for required directories
      const modsDPath = path.join(extractDir, 'mods.d');
      const modulesPath = path.join(extractDir, 'modules');
      
      const hasModsD = fs.existsSync(modsDPath) && fs.statSync(modsDPath).isDirectory();
      const hasModules = fs.existsSync(modulesPath) && fs.statSync(modulesPath).isDirectory();
      
      console.log(`[validateModuleZip] hasModsD=${hasModsD}, hasModules=${hasModules}`);
      // Find .conf file in mods.d directory and extract module ID from its content
      let moduleId = null;
      if (hasModsD) {
        const files = fs.readdirSync(modsDPath);
        const confFile = files.find(f => f.endsWith('.conf'));
        if (confFile) {
          // Read the .conf file content to extract the actual module ID
          const confFilePath = path.join(modsDPath, confFile);
          const confContent = fs.readFileSync(confFilePath, 'utf8');
          
          // Extract module ID from the section header [ModuleID]
          const moduleIdMatch = confContent.match(/^\[([^\]]+)\]/m);
          if (moduleIdMatch) {
            moduleId = moduleIdMatch[1];
            console.log(`[validateModuleZip] Extracted module ID from .conf file: ${moduleId}`);
          } else {
            console.warn(`[validateModuleZip] Could not extract module ID from ${confFile}`);
          }
        }
      }
      
      // Check if module is already installed
      let alreadyInstalled = false;
      if (moduleId) {
        const localModule = this._nsi.getLocalModule(moduleId);
        console.log(`[validateModuleZip] Checking if ${moduleId} is installed:`, localModule);
        alreadyInstalled = localModule !== undefined && localModule !== null;
        console.log(`[validateModuleZip] Module ${moduleId} already installed: ${alreadyInstalled}`);
      }
      
      // Clean up temp files and directories
      if (fs.existsSync(zipFilePath)) {
        fs.unlinkSync(zipFilePath);
      }
      if (fs.existsSync(extractDir)) {
        fs.rmdirSync(extractDir, { recursive: true });
      }
      
      return {
        valid: hasModsD && hasModules && moduleId !== null,
        moduleId: moduleId,
        alreadyInstalled: alreadyInstalled,
        hasModsD: hasModsD,
        hasModules: hasModules
      };
      
    } catch (error) {
      console.error('Error validating module zip:', error);
      
      // Clean up on error
      try {
        const zipFilePath = path.join(tempDir, filename);
        if (fs.existsSync(zipFilePath)) {
          fs.unlinkSync(zipFilePath);
        }
        if (fs.existsSync(extractDir)) {
          fs.rmdirSync(extractDir, { recursive: true });
        }
      } catch (cleanupError) {
        console.error('Error during cleanup:', cleanupError);
      }
      
      return {
        valid: false,
        moduleId: null,
        alreadyInstalled: false,
        error: error.message
      };
    }
  }

  async installModuleFromZip(dropboxPath, dropboxToken, dropboxRefreshToken) {
    const dropboxSync = new DropboxSync(DROPBOX_CLIENT_ID, dropboxToken, dropboxRefreshToken);
    const tempDir = this._platformHelper.getTempDir();
    
    // Extract filename from path
    const filename = path.basename(dropboxPath);
    
    console.log(`[installModuleFromZip] Installing from: ${dropboxPath}`);
    
    try {
      await dropboxSync.refreshAccessToken();
      // Validate first
      const validation = await this.validateModuleZip(dropboxPath, dropboxToken, dropboxRefreshToken);
      
      console.log(`[installModuleFromZip] Validation result:`, validation);
      
      if (!validation.valid) {
        console.log(`[installModuleFromZip] Validation failed - invalid structure`);
        const errorDetails = `hasModsD=${validation.hasModsD}, hasModules=${validation.hasModules}, moduleId=${validation.moduleId}`;
        console.log(`[installModuleFromZip] Validation details: ${errorDetails}`);
        return {
          success: false,
          alreadyInstalled: false,
          error: 'Invalid module structure',
          errorDetails: validation.error || errorDetails
        };
      }
      
      if (validation.alreadyInstalled) {
        console.log(`[installModuleFromZip] Module ${validation.moduleId} is already installed - skipping`);
        return {
          success: false,
          alreadyInstalled: true,
          moduleId: validation.moduleId
        };
      }
      
      console.log(`[installModuleFromZip] Proceeding with installation of ${validation.moduleId}`);
      
      // Download zip file
      await dropboxSync.downloadFile(dropboxPath, tempDir);
      const zipFilePath = path.join(tempDir, filename);
      
      // Install to SWORD directory
      const swordPath = this._nsi.getSwordPath();
      console.log(`Installing module from ${zipFilePath} to ${swordPath}`);
      
      const unzipSuccessful = this._nsi.unZip(zipFilePath, swordPath);
      
      // Clean up temp file
      if (fs.existsSync(zipFilePath)) {
        fs.unlinkSync(zipFilePath);
      }
      
      if (unzipSuccessful) {
        this._nsi.refreshLocalModules();
        console.log(`Module ${validation.moduleId} installed successfully from zip.`);
        
        // Get the installed module to retrieve its type
        const installedModule = this._nsi.getLocalModule(validation.moduleId);
        const moduleType = installedModule ? installedModule.type : null;
        
        return {
          success: true,
          alreadyInstalled: false,
          moduleId: validation.moduleId,
          moduleType: moduleType
        };
      } else {
        console.log(`Failed to unzip module from ${filename}.`);
        return {
          success: false,
          alreadyInstalled: false,
          error: 'Failed to extract zip file',
          errorDetails: `zipFilePath=${zipFilePath}, swordPath=${swordPath}`
        };
      }
      
    } catch (error) {
      console.error('Error installing module from zip:', error);
      console.error('Error stack:', error.stack);
      return {
        success: false,
        alreadyInstalled: false,
        error: error.message,
        errorDetails: error.stack || error.code || 'No additional details'
      };
    }
  }
}

module.exports = DropboxModuleHelper;
