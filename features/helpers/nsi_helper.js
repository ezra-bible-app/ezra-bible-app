const copydir = require('copy-dir');
const fs = require('fs');
const NodeSwordInterface = require('node-sword-interface');
const VerseReferenceHelper = require('../../app/frontend/helpers/verse_reference_helper.js');
const { assert } = require("chai");
require('../../app/backend/database/models/biblebook.js');

const spectronHelper = require('./spectron_helper.js');

var nsi = null;

async function getNSI(refresh = false) {
  if (nsi == null || refresh) {
    var userDataDir = await spectronHelper.getUserDataDir();
    nsi = new NodeSwordInterface(userDataDir);
  }

  return nsi;
}

module.exports.getVerseReferenceHelper = async function() {
  var verseReferenceHelper = new VerseReferenceHelper(await getNSI());
  verseReferenceHelper.setReferenceSeparator(':');
  return verseReferenceHelper;
};

module.exports.getBookShortTitle = function(book_long_title) {
  for (var i = 0; i < global.bible_books.length; i++) {
    var current_book = global.bible_books[i];
    if (current_book.long_title == book_long_title) {
      return current_book.short_title;
    }
  }

  return -1;
};

async function isAsvAvailable(refreshNsi = false) {
  const nsi = await getNSI(refreshNsi);
  var allLocalModules = nsi.getAllLocalModules();
  var asvFound = false;

  allLocalModules.forEach((module) => {
    if (module.name == 'ASV') asvFound = true;
  });

  return asvFound;
}

module.exports.backupSwordDir = async function() {
  var userDataDir = await spectronHelper.getUserDataDir();
  var swordDir = userDataDir + '/.sword';
  var backupDir = userDataDir + '/.swordBackup';

  copydir.sync(swordDir, backupDir);
};

module.exports.installASV = async function() {
  var userDataDir = await spectronHelper.getUserDataDir();
  var swordDir = userDataDir + '/.sword';
  var backupDir = userDataDir + '/.swordBackup';

  if (fs.existsSync(backupDir)) {
    copydir.sync(backupDir, swordDir);
    await spectronHelper.sleep(500);
  }

  var asvFound = await isAsvAvailable(true);

  if (!asvFound) {
    const nsi = await getNSI(true);
    await nsi.updateRepositoryConfig();
    await nsi.installModule(undefined, 'ASV');

    var asvAvailable = await isAsvAvailable();
    assert(asvAvailable);

    await this.backupSwordDir();
  }

  await spectronHelper.sleep(500);
};

module.exports.getLocalModule = async function(moduleCode) {
  var app = spectronHelper.getApp();

  if (app) {
    var allLocalModules = await app.webContents.executeJavaScript("ipcNsi.getAllLocalModulesSync()");

    for (var i = 0; i < allLocalModules.length; i++) {
      var currentModule = allLocalModules[i];

      if (currentModule.name == moduleCode) {
        return currentModule;
      }
    }
  }

  return null;
};

module.exports.splitVerseReference = async function(verseReference, translation = 'KJV') {
  var [book, verseReferenceString] = verseReference.split(' ');
  var bookId = this.getBookShortTitle(book);

  var verseReferenceHelper = await this.getVerseReferenceHelper();
  var absoluteVerseNumber = await verseReferenceHelper.referenceStringToAbsoluteVerseNr(translation, bookId, verseReferenceString);

  return {
    bookId,
    absoluteVerseNumber
  };
};
