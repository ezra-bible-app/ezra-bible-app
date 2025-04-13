/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2025 Ezra Bible App Development Team <contact@ezrabibleapp.net>

   Ezra Bible App is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 2 of the License, or
   (at your option) any later version.

   Ezra Bible App is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Bible App. See the file LICENSE.
   If not, see <http://www.gnu.org/licenses/>. */

const NodeSwordInterface = require('node-sword-interface');
const VerseReferenceHelper = require('../../app/frontend/helpers/verse_reference_helper.js');
const fs = require('fs-extra');

require('../../app/backend/database/models/biblebook.js');
const spectronHelper = require('./spectron_helper.js');

var nsi = null;

async function getNSI(refresh = false) {
  if (nsi == null || refresh) {
    try {
      var userDataDir = await spectronHelper.getUserDataDir();
      
      // Ensure the directory exists before initializing NSI
      if (!fs.existsSync(userDataDir)) {
        console.log('[TEST] Creating user data directory:', userDataDir);
        fs.mkdirSync(userDataDir, { recursive: true });
      }
      
      console.log('[TEST] Initializing NSI with directory:', userDataDir);
      nsi = new NodeSwordInterface(userDataDir);
    } catch (error) {
      console.error('[TEST] Error initializing NSI:', error.message);
      throw error;
    }
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
  try {
    // Use WebdriverIO's browser.execute instead of app.webContents.executeJavaScript
    const allLocalModules = await browser.execute((type) => {
      return window.ipcNsi.getAllLocalModulesSync(type);
    }, moduleType);

    if (!allLocalModules) {
      console.log('[TEST] Warning: getAllLocalModulesSync returned null or undefined');
      return null;
    }

    for (var i = 0; i < allLocalModules.length; i++) {
      var currentModule = allLocalModules[i];

      if (currentModule.name == moduleCode) {
        return currentModule;
      }
    }
    
    return null;
  } catch (error) {
    console.log('[TEST] Error in getLocalModule:', error.message);
    return null;
  }
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
