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
const DropboxSync = require('../db_sync/dropbox_sync.js');
const path = require('path');
const fs = require('fs');

let dbHelper = null;

class IpcDbHandler {
  constructor() {
    this._ipcMain = new IpcMain();
    this.platformHelper = new PlatformHelper();
    this.dbDir = null;
    // eslint-disable-next-line no-undef
    this._config = global.ipc.ipcSettingsHandler.getConfig();
    this._dropboxSyncTimeout = null;
    this._dropboxSyncInProgress = false;
    this._dropboxAccessUpgradeNeeded = false;

    this.initIpcInterface();
  }

  hasValidDropboxConfig() {
    return this._config !== undefined &&
           this._config.has('dropboxToken') &&
           this._config.get('dropboxToken') != null &&
           this._config.get('dropboxToken') != "" &&
           !this._config.has('customDatabaseDir');
  }

  async initDatabase(isDebug, androidVersion=undefined, connectionType=undefined) {
    const DbHelper = require('../database/db_helper.js');
    let userDataDir = this.platformHelper.getUserDataPath(androidVersion);

    dbHelper = new DbHelper(userDataDir);
    this.dbDir = dbHelper.getDatabaseDir(isDebug);

    console.log(`Initializing database at ${this.dbDir}`);

    const fs = require('fs');
    if (!fs.existsSync(this.dbDir)) {
      try {
        fs.mkdirSync(this.dbDir);
      } catch (e) {
        throw("Could not create db directory at " + this.dbDir);
      }
    }

    let returnCode = 0;

    try {
      await dbHelper.initDatabase(this.dbDir);

      // Asynchronously create a database backup in case we have an issue with the production database in the future
      dbHelper.createDatabaseBackup();

    } catch (exception) {
      console.error(`ERROR: Could not initialize database at ${this.dbDir} (${exception.name}). Attempting to restore last backup while keeping the potentially corrupt file.`);
      returnCode = -1;

      let backupRestored = false;

      try {

        dbHelper.renameCorruptDatabase(1);
        backupRestored = dbHelper.restoreDatabaseBackup();

        if (!backupRestored) {
          console.log('No backup available. Restoring from template.')
        }

        await dbHelper.initDatabase(this.dbDir);

      } catch (exception) {

        if (backupRestored) {
          console.error(`ERROR: Database initialization failed even based on restoring backup (${exception.name}). Resetting database from empty template while keeping the potentially corrupt file.`)
          returnCode = -2;
        } else {
          console.error(`FATAL: Resetting database from empty template failed!`);
          returnCode = -3;
        }

        if (backupRestored) {
          try {
            dbHelper.renameCorruptDatabase(2);
            await dbHelper.initDatabase(this.dbDir);

          } catch (exception) {
            console.error(`FATAL: Resetting database from empty template failed!`);
            returnCode = -3;
          }
        }
      }
    }

    if (this.hasValidDropboxConfig()) {
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
        // We run this operation asynchronously, so that startup is not blocked in case of issues (like if there is no internet connection)
        this.syncDatabaseWithDropbox(connectionType).then((result) => {
          console.log(`Last Dropbox sync result: ${result}`);
        });
      }
    }

    this.initModels();
    return returnCode;
  }

  initModels() {
    if (this.dbDir != null) {
      global.models = require('../database/models')(this.dbDir);
    } else {
      console.error('ERROR: dbDir is null! Cannot init models.')
    }
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

  async isDatabaseEmpty() {
    try {
      const noteCount = await global.models.Note.count();
      const tagCount = await global.models.Tag.count();
      const verseReferenceCount = await global.models.VerseReference.count();
      const verseTagCount = await global.models.VerseTag.count();

      const isEmpty = noteCount === 0 && tagCount === 0 && verseReferenceCount === 0 && verseTagCount === 0;

      if (isEmpty) {
        console.log('Local database is empty (0 Notes, Tags, VerseReferences, and VerseTags).');
      } else {
        console.log(`Local database content: ${noteCount} Notes, ${tagCount} Tags, ${verseReferenceCount} VerseReferences, ${verseTagCount} VerseTags.`);
      }

      return isEmpty;
    } catch (e) {
      console.error('Error checking if database is empty:', e);
      // If we cannot determine emptiness, assume it's not empty to be safe
      return false;
    }
  }

  async syncDatabaseWithDropbox(connectionType=undefined, notifyFrontend=false) {
    let onlySyncOnWifi = this._config.get('dropboxOnlyWifi', false);

    if (this.dbDir == null) {
      console.error('ERROR: dbDir is null! Cannot sync database with Dropbox');
      return;
    }

    if (connectionType !== undefined && onlySyncOnWifi && connectionType != 'wifi') {
      console.log(`Configured to only sync Dropbox on Wifi. Not syncing, since we are currently on ${connectionType}.`);
      return;
    }

    let dropboxToken = this._config.get('dropboxToken');
    if (dropboxToken == "" || dropboxToken == null) {
      return;
    }

    const dropboxRefreshToken = this._config.get('dropboxRefreshToken');
    if (dropboxRefreshToken == "" || dropboxRefreshToken == null) {
      return;
    }

    if (this._dropboxSyncInProgress) {
      return;
    }

    this._dropboxSyncInProgress = true;

    console.log('Synchronizing database with Dropbox!');

    const DROPBOX_CLIENT_ID = '6m7e5ri5udcbkp3';
    const firstDropboxSyncDone = this._config.get('firstDropboxSyncDone', false);
    const databaseFilePath = this.getDatabaseFilePath();
    const dropboxFilePath = `/ezra.sqlite`;

    let prioritizeRemote = false;
    if (!firstDropboxSyncDone) {
      prioritizeRemote = true;
    }

    // Check if local database is empty - if so, prioritize remote to prevent overwriting remote data
    const localDbEmpty = await this.isDatabaseEmpty();
    if (localDbEmpty) {
      console.log('Local database is empty. Will prioritize remote database if it exists.');
      prioritizeRemote = true;
    }

    let dropboxSync = new DropboxSync(DROPBOX_CLIENT_ID, dropboxToken, dropboxRefreshToken);

    let authenticated = false;
    let lastDropboxSyncResult = null;

    try {
      let refreshedAccessToken = await dropboxSync.refreshAccessToken();

      if (refreshedAccessToken == dropboxToken) {
        console.log('Existing Dropbox token valid!');
      } else {
        console.log('Refreshed Dropbox access token!');
        dropboxToken = refreshedAccessToken;
        this._config.set('dropboxToken', refreshedAccessToken);
      }
    } catch (e) {
      console.log(e);
    }

    try {
      await dropboxSync.testAuthentication();
      authenticated = true;
    } catch (e) {
      console.log(e);
    }

    if (authenticated) {
      console.log(`Dropbox authenticated! Attempting to synchronize local file ${databaseFilePath} with Dropbox!`);

      const initialLocalHash = await dropboxSync.getLocalFileHash(databaseFilePath);

      let result = await dropboxSync.syncFileTwoWay(databaseFilePath, dropboxFilePath, prioritizeRemote);

      const finalLocalHash = await dropboxSync.getLocalFileHash(databaseFilePath);
      const fileHasChanged = finalLocalHash != initialLocalHash;

      if (result == 1) {
        lastDropboxSyncResult = 'DOWNLOAD';
        this._config.set('lastDropboxDownloadTime', new Date());

        try {
          await dbHelper.initDatabase(this.dbDir);

        } catch (exception) {

          console.error('ERROR: Received Dropbox file appears corrupt. Initiating measures for recovery.')
          lastDropboxSyncResult = await this.handleCorruptDropboxFileDownload();
        }

        // Reload models after 
        this.initModels();
        this.triggerDatabaseReload();

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

          // Reload models after 
          this.initModels();
          this.triggerDatabaseReload();
        }

      } else if (result == -2) {
        lastDropboxSyncResult = 'UPLOAD FAILED';
      } else if (result == -3) {
        lastDropboxSyncResult = 'SYNC FAILED';
      } else if (result == -4) {
        lastDropboxSyncResult = 'UPLOAD FAILED | DROPBOX FILE CORRUPTED';
      } else if (result < -4) {
        lastDropboxSyncResult = 'FAILED';
      }

      if (result >= 0 && !firstDropboxSyncDone) {
        this._config.set('firstDropboxSyncDone', true);
      }
    } else {
      console.warn('Dropbox could not be authenticated!');
      lastDropboxSyncResult = 'AUTH FAILED';
    }

    this._config.set('lastDropboxSyncResult', lastDropboxSyncResult);
    this._config.set('lastDropboxSyncTime', new Date());

    this._dropboxSyncInProgress = false;

    if (notifyFrontend && lastDropboxSyncResult != null) {
      if (this.platformHelper.isElectron()) {
        if (global.mainWindow != null && global.mainWindow.webContents != null) {
          global.mainWindow.webContents.send('dropbox-synced');
        }
      } else if (this.platformHelper.isCordova()) {
        cordova.channel.post('dropbox-synced', '');
      }
    }

    return lastDropboxSyncResult;
  }

  triggerDatabaseReload() {
    if (this.platformHelper.isElectron()) {
      setTimeout(() => {
        console.log('Triggering database reload ...');
        if (global.mainWindow != null && global.mainWindow.webContents != null) {
          global.mainWindow.webContents.send('database-updated');
        }
      }, 2000);
    } else if (this.platformHelper.isCordova()) {
      setTimeout(() => {
        console.log('Triggering database reload ...');
        cordova.channel.post('database-updated', '');
      }, 10000);
    }
  }

  async handleCorruptDropboxFileDownload() {
    let lastDropboxSyncResult = null;

    dbHelper.renameCorruptDatabase(1);
    let backupRestored = dbHelper.restoreDatabaseBackup();

    if (backupRestored) {
      lastDropboxSyncResult = 'DOWNLOAD FAILED | DROPBOX FILE CORRUPTED';
    } else {
      lastDropboxSyncResult = 'DOWNLOAD FAILED | LOCAL DB CORRUPTED | DATABASE RESET';
      dbHelper.renameCorruptDatabase(2);
    }

    try {
      await dbHelper.initDatabase(this.dbDir);
    } catch (exception) {
      lastDropboxSyncResult = 'DOWNLOAD FAILED | LOCAL DB CORRUPTED | DATABASE RESET FAILED';
    }

    return lastDropboxSyncResult;
  }

  async handleFailedDropboxDownload() {
    let lastDropboxSyncResult = null;

    // The download has failed - we attempt to restore the backup database.
    let backupRestored = dbHelper.restoreDatabaseBackup();

    if (backupRestored) {
      try {
        await dbHelper.initDatabase(this.dbDir);

      } catch (exception) {
        dbHelper.renameCorruptDatabase(1);

        try {
          await dbHelper.initDatabase(this.dbDir);
          lastDropboxSyncResult = 'DOWNLOAD FAILED | DATABASE RESET';

        } catch (exception) {
          lastDropboxSyncResult = 'DOWNLOAD FAILED | DATABASE RESET FAILED';
        }
      }
    } else {
      lastDropboxSyncResult = 'DOWNLOAD FAILED | LOCAL DB CORRUPTED | DATABASE RESET';

      dbHelper.renameCorruptDatabase(2);

      try {
        await dbHelper.initDatabase(this.dbDir);
      } catch (exception) {
        lastDropboxSyncResult = 'DOWNLOAD FAILED | LOCAL DB CORRUPTED | DATABASE RESET FAILED';
      }
    }

    // Reload models after 
    this.initModels();

    return lastDropboxSyncResult;
  }

  async closeDatabase() {
    this.cancelDropboxSyncTimeout();

    if (global.sequelize != null) {
      await global.sequelize.close();
      global.sequelize = null;
    }

    let result = await this.syncDatabaseWithDropbox(global.connectionType);
    console.log(`Last Dropbox sync result: ${result}`);
  }

  getDatabaseFilePath() {
    return this.dbDir + path.sep + "ezra.sqlite";
  }

  async triggerDropboxSyncIfConfigured() {
    const DROPBOX_SYNC_TIMEOUT_MS = 2 * 60 * 1000;

    if (!this.hasValidDropboxConfig()) {
      return;
    }

    if (this._config.has('dropboxEnableBackgroundSync') &&
        this._config.get('dropboxEnableBackgroundSync') == false) {
      
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

  initIpcInterface() {
    this._ipcMain.add('db_close', async() => {
      await this.closeDatabase();
    });

    this._ipcMain.add('db_syncDropbox', async(connectionType) => {
      if (this.hasValidDropboxConfig()) {
        let result = await this.syncDatabaseWithDropbox(connectionType);
        console.log(`Last Dropbox sync result: ${result}`);
      }
    });

    this._ipcMain.add('db_isDropboxAccessUpgradeNeeded', async() => {
      return this._dropboxAccessUpgradeNeeded;
    });

    this._ipcMain.add('db_getDatabasePath', async() => {
      return this.getDatabaseFilePath();
    });

    this._ipcMain.add('db_getDatabaseSize', async() => {
      let filePath = this.getDatabaseFilePath();
      let size = fs.statSync(filePath).size;
      let sizeMb = Number(size / (1024 * 1024)).toFixed(2);

      return sizeMb;
    });

    this._ipcMain.add('db_createNewTag', async (newTagTitle, createNoteFile=false, tagGroups=null) => {
      let result = await global.models.Tag.createNewTag(newTagTitle, createNoteFile);
      
      if (tagGroups != null) {
        for (let i = 0; i < tagGroups.length; i++) {
          let tagGroupId = tagGroups[i];
          
          if (tagGroupId != null && tagGroupId > 0) {
            let tagGroup = await global.models.TagGroup.findByPk(tagGroupId);
            await tagGroup.addTag(result.dbObject.id);
          }
        }
      }

      this.triggerDropboxSyncIfConfigured();

      return result;
    });

    this._ipcMain.add('db_removeTag', async (id, deleteNoteFile=false) => {
      let result = await global.models.Tag.destroyTag(id, deleteNoteFile);

      this.triggerDropboxSyncIfConfigured();

      return result;
    });

    this._ipcMain.add('db_updateTag', async(id, newTitle, addTagGroups, removeTagGroups) => {
      let result = await global.models.Tag.updateTag(id, newTitle, addTagGroups, removeTagGroups);

      this.triggerDropboxSyncIfConfigured();

      return result;
    });

    this._ipcMain.add('db_updateTagsOnVerses', async (tagId, verseObjects, versification, action) => {
      let result = await global.models.Tag.updateTagsOnVerses(tagId, verseObjects, versification, action);

      this.triggerDropboxSyncIfConfigured();

      return result;
    });

    this._ipcMain.add('db_getTagCount', async (bibleBookId=0) => {
      return await global.models.Tag.getTagCount(bibleBookId);
    });

    this._ipcMain.add('db_getAllTags', async (bibleBookId, lastUsed, onlyStats) => {
      var allSequelizeTags = await global.models.Tag.getAllTags(bibleBookId, lastUsed, onlyStats);
      var allTags = this.makeSequelizeResultsSerializable(allSequelizeTags);

      for (let i = 0; i < allTags.length; i++) {
        let currentTag = allTags[i];

        if (currentTag.tagGroupList != null) {
          let tagGroupListArray = currentTag.tagGroupList.split(',');
          currentTag.tagGroupList = tagGroupListArray;
        }
      }

      return allTags;
    });

    this._ipcMain.add('db_getBookVerseTags', async (bibleBookId, versification) => {
      var bibleBook = await global.models.BibleBook.findByPk(bibleBookId);
      var sequelizeVerseTags = await bibleBook.getVerseTags();
      var verseTags = this.makeSequelizeResultsSerializable(sequelizeVerseTags);
      var groupedVerseTags = global.models.VerseTag.groupVerseTagsByVerse(verseTags, versification);
      return groupedVerseTags;
    });

    this._ipcMain.add('db_getVerseTagsByVerseReferenceIds', async (verseReferenceIds, versification) => {
      var sequelizeVerseTags = await global.models.VerseTag.findByVerseReferenceIds(verseReferenceIds.join(','));
      var verseTags = this.makeSequelizeResultsSerializable(sequelizeVerseTags);
      var groupedVerseTags = global.models.VerseTag.groupVerseTagsByVerse(verseTags, versification);
      return groupedVerseTags;
    });

    this._ipcMain.add('db_getTagNote', async (tagId) => {
      if (tagId == null) {
        console.error('Missing parameter for db_getTagNote');
        return null;
      }

      let tagNote = await global.models.TagNote.findOne({ where: { tagId: tagId } });

      if (tagNote == null) {
        return null;
      } else {
        return tagNote.dataValues;
      }
    });

    this._ipcMain.add('db_persistTagNoteIntroduction', async (tagId, introduction) => {
      if (tagId == null || introduction == null) {
        console.error('Missing parameters for db_persistTagNoteIntroduction');
        return null;
      }

      let tagNote = await global.models.TagNote.persistIntroduction(tagId, introduction);
      await global.models.MetaRecord.updateLastModified();
      this.triggerDropboxSyncIfConfigured();
      return tagNote;
    });

    this._ipcMain.add('db_persistTagNoteConclusion', async (tagId, conclusion) => {
      if (tagId == null || conclusion == null) {
        console.error('Missing parameters for db_persistTagNoteConclusion');
        return null;
      }

      let tagNote = await global.models.TagNote.persistConclusion(tagId, conclusion);
      await global.models.MetaRecord.updateLastModified();
      this.triggerDropboxSyncIfConfigured();
      return tagNote;
    });

    this._ipcMain.add('db_createTagGroup', async(title) => {
      let result = await global.models.TagGroup.createTagGroup(title);

      this.triggerDropboxSyncIfConfigured();

      return result;
    });

    this._ipcMain.add('db_updateTagGroup', async(id, title) => {
      let result = await global.models.TagGroup.updateTagGroup(id, title);

      this.triggerDropboxSyncIfConfigured();

      return result;
    });

    this._ipcMain.add('db_getAllTagGroups', async (bibleBookId=0) => {
      var allSequelizeTagGroups = await global.models.TagGroup.findWithTagCount(bibleBookId);
      var allTagGroups = this.makeSequelizeResultsSerializable(allSequelizeTagGroups);
      return allTagGroups;
    });

    this._ipcMain.add('db_deleteTagGroup', async(id) => {
      let result = await global.models.TagGroup.destroyTagGroup(id);

      this.triggerDropboxSyncIfConfigured();

      return result;
    });

    this._ipcMain.add('db_isTagGroupUsedInBook', async(tagGroupId, bibleBookId) => {
      if (tagGroupId == null || bibleBookId == null) {
        console.error('Missing parameters for db_isTagGroupUsedInBook');
        return false;
      }

      const allTagGroups = await global.models.TagGroup.findWithTagCount(bibleBookId);
      let tagGroupUsed = false;

      for (let i = 0; i < allTagGroups.length; i++) {
        let tagGroup = allTagGroups[i];

        if (tagGroup.dataValues.id == tagGroupId) {
          tagGroupUsed = true;
          break;
        }
      }

      return tagGroupUsed;
    });

    this._ipcMain.add('db_persistNote', async (noteValue, verseObject, versification, noteFileId=null) => {
      if (noteFileId == null) {
        noteFileId = global.ipc.ipcSettingsHandler.getConfig().get('activeNoteFileId', 0);
      }

      let result = await global.models.Note.persistNote(noteValue, verseObject, versification, noteFileId);

      this.triggerDropboxSyncIfConfigured();

      return result;
    });

    this._ipcMain.add('db_getVerseNotesByBook', async (bibleBookId, versification) => {
      var bibleBook = await global.models.BibleBook.findByPk(bibleBookId);
      var activeNoteFile = global.ipc.ipcSettingsHandler.getConfig().get('activeNoteFileId', 0);
      var sequelizeNotes = await bibleBook.getNotes(activeNoteFile);
      var notes = this.makeSequelizeResultsSerializable(sequelizeNotes);
      var groupedVerseNotes = global.models.Note.groupNotesByVerse(notes, versification);
      return groupedVerseNotes;
    });

    this._ipcMain.add('db_getBookNotes', async (shortTitle) => {
      var bookNotes = null;
      var bookReference = await global.models.VerseReference.getBookReference(shortTitle);
      var activeNoteFile = global.ipc.ipcSettingsHandler.getConfig().get('activeNoteFileId', 0);

      if (bookReference != null) {
        bookNotes = await global.models.Note.findByVerseReferenceId(bookReference.id, activeNoteFile);

        if (bookNotes != null) {
          bookNotes = bookNotes.dataValues;
        }
      }

      return bookNotes;
    });

    this._ipcMain.add('db_getNotesByVerseReferenceIds', async (verseReferenceIds, versification, noteFileId=null) => {
      if (noteFileId == null) {
        noteFileId = global.ipc.ipcSettingsHandler.getConfig().get('activeNoteFileId', 0);
      }

      let sequelizeNotes = await global.models.Note.findByVerseReferenceIds(verseReferenceIds.join(','), noteFileId);
      let notes = this.makeSequelizeResultsSerializable(sequelizeNotes);
      let groupedNotes = global.models.Note.groupNotesByVerse(notes, versification);

      return groupedNotes;
    });

    this._ipcMain.add('db_getAllNoteFiles', async () => {
      let allSequelizeNoteFiles = await global.models.NoteFile.findAll({
        order: [['title', 'ASC']]
      });

      let allNoteFiles = this.makeSequelizeResultsSerializable(allSequelizeNoteFiles);
      return allNoteFiles;
    });

    this._ipcMain.add('db_createNoteFile', async (noteFileTitle) => {
      let result = await global.models.NoteFile.createNoteFile(noteFileTitle);

      this.triggerDropboxSyncIfConfigured();

      return result;
    });

    this._ipcMain.add('db_deleteNoteFile', async (id) => {
      let result = await global.models.NoteFile.destroyNoteFile(id);

      this.triggerDropboxSyncIfConfigured();

      return result;
    });

    this._ipcMain.add('db_updateNoteFile', async (id, newTitle) => {
      let result = await global.models.NoteFile.update({ title: newTitle }, { where: { id: id } });
      await global.models.MetaRecord.updateLastModified();

      this.triggerDropboxSyncIfConfigured();

      return {
        success: true
      };
    });

    this._ipcMain.add('db_getBibleBook', async (shortTitle) => {
      var sequelizeBibleBook = await global.models.BibleBook.findOne({ where: { shortTitle: shortTitle }});
      var bibleBook = null;
      
      if (sequelizeBibleBook != null) {
        bibleBook = sequelizeBibleBook.dataValues;
      }
      
      return bibleBook;
    });

    this._ipcMain.add('db_getBibleBooksFromSearchResults', async (searchResults) => {
      var sequelizeBibleBooks = await global.models.BibleBook.findBySearchResults(searchResults);
      var bibleBooks = this.makeSequelizeResultsSerializable(sequelizeBibleBooks);
      return bibleBooks;
    });

    this._ipcMain.add('db_getBibleBooksFromTagIds', async (tagIds) => {
      var sequelizeBibleBooks = await global.models.BibleBook.findByTagIds(tagIds);
      var bibleBooks = this.makeSequelizeResultsSerializable(sequelizeBibleBooks);
      return bibleBooks;
    });

    this._ipcMain.add('db_getBibleBooksFromXrefs', async (xrefs) => {
      var sequelizeBibleBooks = await global.models.BibleBook.findByXrefs(xrefs);
      var bibleBooks = this.makeSequelizeResultsSerializable(sequelizeBibleBooks);
      return bibleBooks;
    });

    this._ipcMain.add('db_getBookTitleTranslation', async (shortTitle, language) => {
      return await global.models.BibleBook.getBookTitleTranslation(shortTitle, language);
    });

    this._ipcMain.add('db_getBookLongTitle', async (shortTitle) => {
      return await global.models.BibleBook.getBookLongTitle(shortTitle);
    });

    this._ipcMain.add('db_findBookTitle', async(title) => {
      return await global.models.BibleBook.findBookTitle(title);
    });

    this._ipcMain.add('db_isNtBook', async (bookCode) => {
      return global.models.BibleBook.isNtBook(bookCode);
    });

    this._ipcMain.add('db_isOtBook', async (bookCode) => {
      return global.models.BibleBook.isOtBook(bookCode);
    });

    this._ipcMain.add('db_isApocryphalBook', async (bookCode) => {
      return global.models.BibleBook.isApocryphalBook(bookCode);
    });

    this._ipcMain.add('db_getVerseReferencesByBookAndAbsoluteVerseNumber', async (bookShortTitle, absoluteVerseNr, versification) => {
      var sequelizeVerseReferences = await global.models.VerseReference.findByBookAndAbsoluteVerseNumber(bookShortTitle, absoluteVerseNr, versification);
      var verseReferences = this.makeSequelizeResultsSerializable(sequelizeVerseReferences);
      return verseReferences;
    });

    this._ipcMain.add('db_getVerseReferencesFromVerseObjects', async (verseObjects, versification) => {
      var allVerseReferences = [];

      for (let i = 0; i < verseObjects.length; i++) {
        var currentVerseObject = verseObjects[i];

        var sequelizeVerseReferences = await global.models.VerseReference.findByBookAndAbsoluteVerseNumber(
          currentVerseObject._bibleBookShortTitle,
          currentVerseObject._absoluteVerseNr,
          versification
        );

        var currentVerseReferences = this.makeSequelizeResultsSerializable(sequelizeVerseReferences);

        if (currentVerseReferences.length > 0) {
          allVerseReferences.push(currentVerseReferences[0].id);
        }
      }

      return allVerseReferences;
    });

    this._ipcMain.add('db_getVerseReferencesByTagIds', async (tagIds) => {
      var sequelizeVerseReferences = await global.models.VerseReference.findByTagIds(tagIds);
      var verseReferences = this.makeSequelizeResultsSerializable(sequelizeVerseReferences);
      return verseReferences;
    });

    this._ipcMain.add('db_getVerseReferencesByXrefs', async (xrefs) => {
      var sequelizeVerseReferences = await global.models.VerseReference.findByXrefs(xrefs);
      var verseReferences = this.makeSequelizeResultsSerializable(sequelizeVerseReferences);
      return verseReferences;
    });

    this._ipcMain.add('db_getAbsoluteVerseNumbersFromReference', async (sourceVersification, bookCode, absoluteVerseNr, chapter, verseNr) => {
      var absoluteVerseNumbers = global.models.VerseReference.getAbsoluteVerseNrs(sourceVersification,
                                                                                  bookCode,
                                                                                  absoluteVerseNr,
                                                                                  chapter,
                                                                                  verseNr);
      return absoluteVerseNumbers;
    });

    this._ipcMain.add('db_isBookWithOffset', async (bookCode) => {
      return global.models.VerseReference.isBookWithOffset(bookCode);
    });

    this._ipcMain.add('db_getLastMetaRecordUpdate', async() => {
      var lastUpdate = await global.models.MetaRecord.getLastUpdate();
      return lastUpdate;
    });

    this._ipcMain.add('db_exportUserData', async(csvFilePath=undefined) => {
      var verseReferences = await global.models.VerseReference.findAllWithUserData();
      const createCsvWriter = require('csv-writer').createObjectCsvWriter;

      if (csvFilePath === undefined) {
        const homeDir = require('os').homedir();
        csvFilePath = path.join(homeDir, 'ezra_user_data_export.csv');
      }

      const csvWriter = createCsvWriter({
        path: csvFilePath,
        header: [
          {id: 'bibleBookShortTitle', title: 'Book'},
          {id: 'absoluteVerseNrEng', title: 'Absolute Verse Nr (ENG)'},
          {id: 'absoluteVerseNrHeb', title: 'Absolute Verse Nr (HEB)'},
          {id: 'chapter', title: 'Chapter'},
          {id: 'verseNr', title: 'Verse Nr'},
          {id: 'tagList', title: 'Tags'},
          {id: 'tagGroupList', title: 'Tag Groups'},
          {id: 'noteText', title: 'Notes'},
        ],
        alwaysQuote: true
      });

      await csvWriter.writeRecords(verseReferences);
    });
  }

  makeSequelizeResultsSerializable(sequelizeResults) {
    var results = [];

    sequelizeResults.forEach((result) => {
      results.push(result.dataValues);
    });

    return results;
  }
}

module.exports = IpcDbHandler;
