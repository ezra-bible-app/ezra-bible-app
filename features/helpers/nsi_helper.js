const path = require('path');
const copydir = require('copy-dir');
const fs = require('fs');
const NodeSwordInterface = require('node-sword-interface');
const VerseReferenceHelper = require('../../app/frontend/helpers/verse_reference_helper.js');
require('../../app/backend/database/models/biblebook.js');

const spectronHelper = require('./spectron_helper.js');

var nsi = null;

async function getUserDataDir() {
  var electronApp = spectronHelper.getApp().electron.remote.app;
  var pjson = require('../../package.json');
  var appDataPath = await electronApp.getPath('appData');
  var userDataDir = path.join(appDataPath, pjson.name + '-test');
  return userDataDir;
}

async function getNSI(refresh = false) {
  if (nsi == null || refresh) {
    var userDataDir = await getUserDataDir();
    nsi = new NodeSwordInterface(userDataDir);
  }

  return nsi;
}

async function getVerseReferenceHelper() {
  var verseReferenceHelper = new VerseReferenceHelper(await getNSI());
  verseReferenceHelper.setReferenceSeparator(':');
  return verseReferenceHelper;
}

function getBookShortTitle(book_long_title) {
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

async function backupSwordDir() {
  var userDataDir = await getUserDataDir();
  var swordDir = userDataDir + '/.sword';
  var backupDir = userDataDir + '/.swordBackup';

  copydir.sync(swordDir, backupDir);
}

async function installASV() {
  var userDataDir = await getUserDataDir();
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

    await backupSwordDir();
  }

  await spectronHelper.sleep(500);
}

async function getLocalModule(moduleCode) {
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
}

async function splitVerseReference(verseReference, translation = 'KJV') {
  var [book, verseReferenceString] = verseReference.split(' ');
  var bookId = getBookShortTitle(book);

  var verseReferenceHelper = await getVerseReferenceHelper();
  var absoluteVerseNumber = await verseReferenceHelper.referenceStringToAbsoluteVerseNr(translation, bookId, verseReferenceString);

  return {
    bookId,
    absoluteVerseNumber
  }
}


module.exports = {
  getVerseReferenceHelper,
  getBookShortTitle,
  getUserDataDir,
  backupSwordDir,
  installASV,
  getLocalModule,
  splitVerseReference,
}