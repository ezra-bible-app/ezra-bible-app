/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2022 Ezra Bible App Development Team <contact@ezrabibleapp.net>

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

    this.initIpcInterface();
  }

  async initDatabase(isDebug, androidVersion=undefined) {
    const DbHelper = require('../database/db_helper.js');
    let userDataDir = this.platformHelper.getUserDataPath(false, androidVersion);

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

    await dbHelper.initDatabase(this.dbDir, androidVersion);

    // eslint-disable-next-line no-undef
    let config = ipc.ipcSettingsHandler.getConfig();
    if (config !== undefined &&
        config.has('dropboxToken') &&
        config.get('dropboxToken') != "" &&
        !config.has('customDatabaseDir')) {

      console.log('Synchronizing database with Dropbox!');
      await this.syncDatabaseWithDropbox();
    }

    global.models = require('../database/models')(this.dbDir);
  }

  async syncDatabaseWithDropbox() {
    // eslint-disable-next-line no-undef
    let config = ipc.ipcSettingsHandler.getConfig();
    
    let dropboxToken = config.get('dropboxToken');
    if (dropboxToken == "") {
      return;
    }

    const dropboxRefreshToken = config.get('dropboxRefreshToken');
    if (dropboxRefreshToken == "") {
      return;
    }

    const DROPBOX_CLIENT_ID = 'omhgjqlxpfn2r8z';
    const dropboxFolder = config.get('dropboxFolder', 'ezra');
    const firstDropboxSyncDone = config.get('firstDropboxSyncDone', false);
    const databaseFilePath = this.getDatabaseFilePath();
    const dropboxFilePath = `/${dropboxFolder}/ezra.sqlite`;

    let prioritizeRemote = false;
    if (!firstDropboxSyncDone) {
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
        config.set('dropboxToken', refreshedAccessToken);
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

      let result = await dropboxSync.syncFileTwoWay(databaseFilePath, dropboxFilePath, prioritizeRemote);

      if (result == 1) {
        lastDropboxSyncResult = 'DOWNLOAD';
        config.set('lastDropboxDownloadTime', new Date());
      } else if (result == 2) {
        lastDropboxSyncResult = 'UPLOAD';
        config.set('lastDropboxUploadTime', new Date());
      } else if (result == 0) {
        lastDropboxSyncResult = 'NONE';
      } else if (result < 0) {
        lastDropboxSyncResult = 'FAILED';
      }

      if (result >= 0 && !firstDropboxSyncDone) {
        config.set('firstDropboxSyncDone', true);
      }
    } else {
      console.warn('Dropbox could not be authenticated!');
    }

    config.set('lastDropboxSyncResult', lastDropboxSyncResult);
    config.set('lastDropboxSyncTime', new Date());
  }

  async closeDatabase() {
    if (global.sequelize != null) {
      await global.sequelize.close();
      global.sequelize = null;
    }
  }

  getDatabaseFilePath() {
    return this.dbDir + path.sep + "ezra.sqlite";
  }

  initIpcInterface() {
    this._ipcMain.add('db_close', async() => {
      return await this.closeDatabase();
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

    this._ipcMain.add('db_createNewTag', async (newTagTitle, tagGroups) => {
      let result = await global.models.Tag.create_new_tag(newTagTitle);
      
      if (tagGroups != null) {
        for (let i = 0; i < tagGroups.length; i++) {
          let tagGroupId = tagGroups[i];
          
          if (tagGroupId != null && tagGroupId > 0) {
            let tagGroup = await global.models.TagGroup.findByPk(tagGroupId);
            await tagGroup.addTag(result.dbObject.id);
          }
        }
      }

      return result;
    });

    this._ipcMain.add('db_removeTag', async (id) => {
      return await global.models.Tag.destroy_tag(id);
    });

    this._ipcMain.add('db_updateTag', async(id, newTitle, addTagGroups, removeTagGroups) => {
      return await global.models.Tag.update_tag(id, newTitle, addTagGroups, removeTagGroups);
    });

    this._ipcMain.add('db_updateTagsOnVerses', async (tagId, verseObjects, versification, action) => {
      return await global.models.Tag.update_tags_on_verses(tagId, verseObjects, versification, action);
    });

    this._ipcMain.add('db_getTagCount', async () => {
      return await global.models.Tag.getTagCount();
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

    this._ipcMain.add('db_createTagGroup', async(title) => {
      return await global.models.TagGroup.createTagGroup(title);
    });

    this._ipcMain.add('db_updateTagGroup', async(id, title) => {
      return await global.models.TagGroup.updateTagGroup(id, title);
    });

    this._ipcMain.add('db_getAllTagGroups', async () => {
      var allSequelizeTagGroups = await global.models.TagGroup.findWithTagCount();
      var allTagGroups = this.makeSequelizeResultsSerializable(allSequelizeTagGroups);
      return allTagGroups;
    });

    this._ipcMain.add('db_deleteTagGroup', async(id) => {
      return await global.models.TagGroup.destroyTagGroup(id);
    });

    this._ipcMain.add('db_persistNote', async (noteValue, verseObject, versification) => {
      return await global.models.Note.persistNote(noteValue, verseObject, versification);
    });

    this._ipcMain.add('db_getVerseNotesByBook', async (bibleBookId, versification) => {
      var bibleBook = await global.models.BibleBook.findByPk(bibleBookId);
      var sequelizeNotes = await bibleBook.getNotes();
      var notes = this.makeSequelizeResultsSerializable(sequelizeNotes);
      var groupedVerseNotes = global.models.Note.groupNotesByVerse(notes, versification);
      return groupedVerseNotes;
    });

    this._ipcMain.add('db_getBookNotes', async (shortTitle) => {
      var bookNotes = null;
      var bookReference = await global.models.VerseReference.getBookReference(shortTitle);

      if (bookReference != null) {
        bookNotes = await global.models.Note.findByVerseReferenceId(bookReference.id);

        if (bookNotes != null) {
          bookNotes = bookNotes.dataValues;
        }
      }

      return bookNotes;
    });

    this._ipcMain.add('db_getNotesByVerseReferenceIds', async (verseReferenceIds, versification) => {
      var sequelizeNotes = await global.models.Note.findByVerseReferenceIds(verseReferenceIds.join(','));
      var notes = this.makeSequelizeResultsSerializable(sequelizeNotes);
      var groupedNotes = global.models.Note.groupNotesByVerse(notes, versification);
      return groupedNotes;
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