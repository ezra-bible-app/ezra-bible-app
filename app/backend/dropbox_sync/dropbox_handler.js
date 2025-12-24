const DropboxSync = require('./dropbox_sync.js');
const path = require('path');

class DropboxHandler {
  constructor() {
    // eslint-disable-next-line no-undef
    this._config = global.ipc.ipcSettingsHandler.getConfig();
    this.platformHelper = null;
    this.dbDir = null;
    this.dbHelper = null;
    this._dropboxSyncTimeout = null;
    this._dropboxSyncInProgress = false;
    this._dropboxAccessUpgradeNeeded = false;
    this.initModelsCallback = null;
    this.triggerDatabaseReloadCallback = null;
  }

  setPlatformHelper(platformHelper) {
    this.platformHelper = platformHelper;
  }

  setDbContext(dbDir, dbHelper) {
    this.dbDir = dbDir;
    this.dbHelper = dbHelper;
  }

  setCallbacks(initModelsCallback, triggerDatabaseReloadCallback) {
    this.initModelsCallback = initModelsCallback;
    this.triggerDatabaseReloadCallback = triggerDatabaseReloadCallback;
  }

  isDropboxAccessUpgradeNeeded() {
    return this._dropboxAccessUpgradeNeeded;
  }

  hasValidDropboxConfig() {
    return this._config !== undefined &&
           this._config.has('dropboxToken') &&
           this._config.get('dropboxToken') != null &&
           this._config.get('dropboxToken') != '' &&
           !this._config.has('customDatabaseDir');
  }

  resetDropboxConfig() {
    this._config.set('lastDropboxSyncResult', '');
    this._config.set('lastDropboxSyncTime', '');
    this._config.set('lastDropboxDownloadTime', '');
    this._config.set('lastDropboxUploadTime', '');
    this._config.set('firstDropboxSyncDone', false);
    this._config.set('dropboxToken', '');
    this._config.set('dropboxRefreshToken', '');
    this._config.set('dropboxLinkStatus', null);
  }

  async initDropboxAfterDatabaseInit(connectionType) {
    if (!this.hasValidDropboxConfig()) {
      return;
    }

    let dropboxConfigValid = true;
    let lastUsedVersion = this._config.get('lastUsedVersion', '');
    if (lastUsedVersion != '') {
      lastUsedVersion = lastUsedVersion.split('.');
      let lastMajorVersion = parseInt(lastUsedVersion[0]);
      let lastMinorVersion = parseInt(lastUsedVersion[1]);

      if (lastMajorVersion == 1 && lastMinorVersion < 15) {
        console.log('WARNING: Resetting dropbox configuration, since this version of Ezra Bible App uses a new way to connect with Dropbox!');
        this.resetDropboxConfig();
        dropboxConfigValid = false;
        this._dropboxAccessUpgradeNeeded = true;
      }
    }

    if (dropboxConfigValid) {
      this.syncDatabaseWithDropbox(connectionType).then((result) => {
        console.log(`Last Dropbox sync result: ${result}`);
      });
    }
  }

  getDatabaseFilePath() {
    return this.dbDir + path.sep + 'ezra.sqlite';
  }

  initDropboxSync() {
    if (this._dropboxSync == null) {
      const DROPBOX_CLIENT_ID = '6m7e5ri5udcbkp3';

      this._dropboxToken = this._config.get('dropboxToken');
      if (this._dropboxToken == '' || this._dropboxToken == null) {
        throw('No Dropbox token found!');
      }

      const dropboxRefreshToken = this._config.get('dropboxRefreshToken');
      if (dropboxRefreshToken == '' || dropboxRefreshToken == null) {
        throw('No Dropbox refresh token found!');
      }

      this._dropboxSync = new DropboxSync(DROPBOX_CLIENT_ID, this._dropboxToken, dropboxRefreshToken);
    }
  }

  async syncDatabaseWithDropbox(connectionType, notifyFrontend) {
    if (this.dbDir == null) {
      console.error('ERROR: dbDir is null! Cannot sync database with Dropbox');
      return;
    }

    const firstDropboxSyncDone = this._config.get('firstDropboxSyncDone', false);

    let prioritizeRemote = false;
    if (!firstDropboxSyncDone) {
      prioritizeRemote = true;
    }

    this.initDropboxSync();

    const databaseFilePath = this.getDatabaseFilePath();
    const dropboxFilePath = '/ezra.sqlite';
    const initialLocalHash = await this._dropboxSync.getLocalFileHash(databaseFilePath);

    const result = await this.syncFileWithDropbox(databaseFilePath, dropboxFilePath, connectionType, prioritizeRemote);

    const finalLocalHash = await this._dropboxSync.getLocalFileHash(databaseFilePath);
    const fileHasChanged = finalLocalHash != initialLocalHash;

    let lastDropboxSyncResult = null;

    if (result == 1) {
      lastDropboxSyncResult = 'DOWNLOAD';
      this._config.set('lastDropboxDownloadTime', new Date());

      try {
        await this.dbHelper.initDatabase(this.dbDir);
      } catch (exception) {
        console.error('ERROR: Received Dropbox file appears corrupt. Initiating measures for recovery.');
        lastDropboxSyncResult = await this.handleCorruptDropboxFileDownload();
      }

      if (this.initModelsCallback != null) {
        this.initModelsCallback();
      }
      if (this.triggerDatabaseReloadCallback != null) {
        this.triggerDatabaseReloadCallback();
      }
    } else if (result == 2) {
      lastDropboxSyncResult = 'UPLOAD';
      this._config.set('lastDropboxUploadTime', new Date());
    } else if (result == 0) {
      lastDropboxSyncResult = 'NONE';
    } else if (result == -1) {
      lastDropboxSyncResult = 'DOWNLOAD FAILED';

      console.error('ERROR: The Dropbox download has failed.');

      if (fileHasChanged) {
        console.log('Since the database was changed based on a failed download: Initiate measures for recovery.');
        lastDropboxSyncResult = await this.handleFailedDropboxDownload();

        if (this.initModelsCallback != null) {
          this.initModelsCallback();
        }
        if (this.triggerDatabaseReloadCallback != null) {
          this.triggerDatabaseReloadCallback();
        }
      }
    } else if (result == -2) {
      lastDropboxSyncResult = 'UPLOAD FAILED';
    } else if (result == -3) {
      lastDropboxSyncResult = 'SYNC FAILED';
    } else if (result == -4) {
      lastDropboxSyncResult = 'UPLOAD FAILED | DROPBOX FILE CORRUPTED';
    } else if (result == -5) {
      lastDropboxSyncResult = 'AUTH FAILED';
    } else if (result < -5) {
      lastDropboxSyncResult = 'FAILED';
    }

    if (result >= 0 && !firstDropboxSyncDone) {
      this._config.set('firstDropboxSyncDone', true);
    }

    this._config.set('lastDropboxSyncResult', lastDropboxSyncResult);
    this._config.set('lastDropboxSyncTime', new Date());

    this._dropboxSyncInProgress = false;

    if (notifyFrontend && lastDropboxSyncResult != null && this.platformHelper != null) {
      if (this.platformHelper.isElectron()) {
        if (global.mainWindow != null && global.mainWindow.webContents != null) {
          global.mainWindow.webContents.send('dropbox-synced');
        }
      } else if (this.platformHelper.isCordova()) {
        // eslint-disable-next-line no-undef
        cordova.channel.post('dropbox-synced', '');
      }
    }

    return lastDropboxSyncResult;
  }

  async syncFileWithDropbox(localFilePath, dropboxFilePath, connectionType, prioritizeRemote=false) {
    let onlySyncOnWifi = this._config.get('dropboxOnlyWifi', false);

    if (connectionType !== undefined && onlySyncOnWifi && connectionType != 'wifi') {
      console.log(`Configured to only sync Dropbox on Wifi. Not syncing, since we are currently on ${connectionType}.`);
      return;
    }

    if (this._dropboxSyncInProgress) {
      return;
    }

    this._dropboxSyncInProgress = true;

    console.log(`Synchronizing file ${localFilePath} with Dropbox!`);


    let authenticated = false;

    try {
      let refreshedAccessToken = await this._dropboxSync.refreshAccessToken();

      if (refreshedAccessToken == this._dropboxToken) {
        console.log('Existing Dropbox token valid!');
      } else {
        console.log('Refreshed Dropbox access token!');
        this._dropboxToken = refreshedAccessToken;
        this._config.set('dropboxToken', refreshedAccessToken);
      }
    } catch (e) {
      console.log(e);
    }

    try {
      await this._dropboxSync.testAuthentication();
      authenticated = true;
    } catch (e) {
      console.log(e);
    }

    let result = null;

    if (authenticated) {
      console.log(`Dropbox authenticated! Attempting to synchronize local file ${localFilePath} with Dropbox!`);
      result = await this._dropboxSync.syncFileTwoWay(localFilePath, dropboxFilePath, prioritizeRemote);

    } else {
      console.warn('Dropbox could not be authenticated!');
      result = -5; // AUTH FAILED
    }

    return result;
  }

  async handleCorruptDropboxFileDownload() {
    let lastDropboxSyncResult = null;

    this.dbHelper.renameCorruptDatabase(1);
    let backupRestored = this.dbHelper.restoreDatabaseBackup();

    if (backupRestored) {
      lastDropboxSyncResult = 'DOWNLOAD FAILED | DROPBOX FILE CORRUPTED';
    } else {
      lastDropboxSyncResult = 'DOWNLOAD FAILED | LOCAL DB CORRUPTED | DATABASE RESET';
      this.dbHelper.renameCorruptDatabase(2);
    }

    try {
      await this.dbHelper.initDatabase(this.dbDir);
    } catch (exception) {
      lastDropboxSyncResult = 'DOWNLOAD FAILED | LOCAL DB CORRUPTED | DATABASE RESET FAILED';
    }

    return lastDropboxSyncResult;
  }

  async handleFailedDropboxDownload() {
    let lastDropboxSyncResult = null;

    let backupRestored = this.dbHelper.restoreDatabaseBackup();

    if (backupRestored) {
      try {
        await this.dbHelper.initDatabase(this.dbDir);
      } catch (exception) {
        this.dbHelper.renameCorruptDatabase(1);

        try {
          await this.dbHelper.initDatabase(this.dbDir);
          lastDropboxSyncResult = 'DOWNLOAD FAILED | DATABASE RESET';
        } catch (exception2) {
          lastDropboxSyncResult = 'DOWNLOAD FAILED | DATABASE RESET FAILED';
        }
      }
    } else {
      lastDropboxSyncResult = 'DOWNLOAD FAILED | LOCAL DB CORRUPTED | DATABASE RESET';

      this.dbHelper.renameCorruptDatabase(2);

      try {
        await this.dbHelper.initDatabase(this.dbDir);
      } catch (exception3) {
        lastDropboxSyncResult = 'DOWNLOAD FAILED | LOCAL DB CORRUPTED | DATABASE RESET FAILED';
      }
    }

    if (this.initModelsCallback != null) {
      this.initModelsCallback();
    }

    return lastDropboxSyncResult;
  }

  async triggerDropboxSyncIfConfigured() {
    const DROPBOX_SYNC_TIMEOUT_MS = 2 * 60 * 1000;

    if (!this.hasValidDropboxConfig()) {
      return;
    }

    if (this._config.has('dropboxSyncAfterChanges') &&
        this._config.get('dropboxSyncAfterChanges') == false) {
      return;
    }

    this.cancelDropboxSyncTimeout();

    console.log(`Starting new Dropbox sync in ${DROPBOX_SYNC_TIMEOUT_MS / 1000} seconds!`);
    this._dropboxSyncTimeout = setTimeout(async () => {
      console.log(`Syncing Dropbox based on timeout after ${DROPBOX_SYNC_TIMEOUT_MS / 1000} seconds!`);
      this.syncDatabaseWithDropbox(global.connectionType, true).then((result) => {
        console.log(`Last Dropbox sync result: ${result}`);
      });
    }, DROPBOX_SYNC_TIMEOUT_MS);
  }

  cancelDropboxSyncTimeout() {
    if (this._dropboxSyncTimeout !== null) {
      console.log('Cancelling existing Dropbox sync timeout!');
      clearTimeout(this._dropboxSyncTimeout);
      this._dropboxSyncTimeout = null;
    }
  }
}

module.exports = DropboxHandler;