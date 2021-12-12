const NodeSwordInterface = require('node-sword-interface');
const VerseReferenceHelper = require('../../app/frontend/helpers/verse_reference_helper.js');

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

module.exports.getBookChapterVerseCount = async function(moduleCode, bookCode, chapter) {
  const nsi = await getNSI();
  const chapterVerseCount = nsi.getChapterVerseCount(moduleCode, bookCode, chapter);
  return chapterVerseCount;
}

module.exports.getChapterLastVerseContent = async function(moduleCode, bookCode, chapter) {
  const nsi = await getNSI();
  const verseReferenceHelper = await this.getVerseReferenceHelper();
  const chapterVerseCount = await this.getBookChapterVerseCount(moduleCode, bookCode, chapter);
  const absoluteVerseNumber = await verseReferenceHelper.referenceToAbsoluteVerseNr(moduleCode,
                                                                                    bookCode,
                                                                                    chapter,
                                                                                    chapterVerseCount);
  const verses = nsi.getBookText(moduleCode, bookCode, absoluteVerseNumber, 1);
  return verses[0].content;
}

module.exports.getLocalModule = async function(moduleCode, moduleType='BIBLE') {
  var app = spectronHelper.getApp();

  if (app) {
    var allLocalModules = await app.webContents.executeJavaScript(`ipcNsi.getAllLocalModulesSync('${moduleType}')`);

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
