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
const DropboxHandler = require('../db_sync/dropbox_handler.js');
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

    this.dropboxHandler = new DropboxHandler();
    this.dropboxHandler.setPlatformHelper(this.platformHelper);

    this.initIpcInterface();
  }

  async initDatabase(isDebug, androidVersion, connectionType) {
    const DbHelper = require('../database/db_helper.js');
    let userDataDir = this.platformHelper.getUserDataPath(androidVersion);

    dbHelper = new DbHelper(userDataDir);
    this.dbDir = dbHelper.getDatabaseDir(isDebug);
    this.dropboxHandler.setDbContext(this.dbDir, dbHelper);
    this.dropboxHandler.setCallbacks(() => this.initModels(),
                                     () => this.triggerDatabaseReload());

    console.log(`Initializing database at ${this.dbDir}`);

    const fsLocal = require('fs');
    if (!fsLocal.existsSync(this.dbDir)) {
      try {
        fsLocal.mkdirSync(this.dbDir);
      } catch (e) {
        throw('Could not create db directory at ' + this.dbDir);
      }
    }

    let returnCode = 0;

    try {
      await dbHelper.initDatabase(this.dbDir);

      dbHelper.createDatabaseBackup();
    } catch (exception) {
      console.error(`ERROR: Could not initialize database at ${this.dbDir} (${exception.name}). Attempting to restore last backup while keeping the potentially corrupt file.`);
      returnCode = -1;

      let backupRestored = false;

      try {
        dbHelper.renameCorruptDatabase(1);
        backupRestored = dbHelper.restoreDatabaseBackup();

        if (!backupRestored) {
          console.log('No backup available. Restoring from template.');
        }

        await dbHelper.initDatabase(this.dbDir);
      } catch (exception2) {
        if (backupRestored) {
          console.error(`ERROR: Database initialization failed even based on restoring backup (${exception2.name}). Resetting database from empty template while keeping the potentially corrupt file.`);
          returnCode = -2;
        } else {
          console.error('FATAL: Resetting database from empty template failed!');
          returnCode = -3;
        }

        if (backupRestored) {
          try {
            dbHelper.renameCorruptDatabase(2);
            await dbHelper.initDatabase(this.dbDir);
          } catch (exception3) {
            console.error('FATAL: Resetting database from empty template failed!');
            returnCode = -3;
          }
        }
      }
    }

    await this.dropboxHandler.initDropboxAfterDatabaseInit(connectionType);

    this.initModels();
    return returnCode;
  }

  initModels() {
    if (this.dbDir != null) {
      global.models = require('../database/models')(this.dbDir);
    } else {
      console.error('ERROR: dbDir is null! Cannot init models.');
    }
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

  async closeDatabase() {
    this.dropboxHandler.cancelDropboxSyncTimeout();

    if (global.sequelize != null) {
      await global.sequelize.close();
      global.sequelize = null;
    }

    let result = await this.dropboxHandler.syncDatabaseWithDropbox(global.connectionType, false);
    console.log(`Last Dropbox sync result: ${result}`);
  }

  getDatabaseFilePath() {
    return this.dbDir + path.sep + 'ezra.sqlite';
  }

  async triggerDropboxSyncIfConfigured() {
    await this.dropboxHandler.triggerDropboxSyncIfConfigured();
  }

  initIpcInterface() {
    this._ipcMain.add('db_close', async() => {
      await this.closeDatabase();
    });

    this._ipcMain.add('db_syncDropbox', async(connectionType) => {
      if (this.dropboxHandler.hasValidDropboxConfig()) {
        let result = await this.dropboxHandler.syncDatabaseWithDropbox(connectionType, false);
        console.log(`Last Dropbox sync result: ${result}`);
      }
    });

    this._ipcMain.add('db_isDropboxAccessUpgradeNeeded', async() => {
      return this.dropboxHandler.isDropboxAccessUpgradeNeeded();
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

      await this.triggerDropboxSyncIfConfigured();

      return result;
    });

    this._ipcMain.add('db_removeTag', async (id, deleteNoteFile=false) => {
      let result = await global.models.Tag.destroyTag(id, deleteNoteFile);

      await this.triggerDropboxSyncIfConfigured();

      return result;
    });

    this._ipcMain.add('db_updateTag', async(id, newTitle, addTagGroups, removeTagGroups) => {
      let result = await global.models.Tag.updateTag(id, newTitle, addTagGroups, removeTagGroups);

      await this.triggerDropboxSyncIfConfigured();

      return result;
    });

    this._ipcMain.add('db_updateTagsOnVerses', async (tagId, verseObjects, versification, action) => {
      let result = await global.models.Tag.updateTagsOnVerses(tagId, verseObjects, versification, action);

      await this.triggerDropboxSyncIfConfigured();

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
