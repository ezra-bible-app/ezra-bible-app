/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2021 Tobias Klein <contact@ezra-project.net>

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

const { expect } = require("chai");

async function splitVerseReference(verseReference, translation = 'KJV') {
  var [book, verseReferenceString] = verseReference.split(' ');
  var bookId = global.spectronHelper.getBookShortTitle(book);

  var verseReferenceHelper = await global.spectronHelper.getVerseReferenceHelper();
  var absoluteVerseNumber = await verseReferenceHelper.referenceStringToAbsoluteVerseNr(translation, bookId, verseReferenceString);

  return {
    bookId,
    absoluteVerseNumber
  }
}

async function getDbVerseReferenceId(verseReference) {
  var { bookId, absoluteVerseNumber } = await splitVerseReference(verseReference);

  var dbBibleBook = await global.models.BibleBook.findOne({ where: { shortTitle: bookId } });
  var dbVerseReference = await global.models.VerseReference.findOne({
    where: {
      bibleBookId: dbBibleBook.id,
      absoluteVerseNrEng: absoluteVerseNumber
    }
  });

  var allVerseReferences = await global.models.VerseReference.findAll();

  expect(dbVerseReference, `Could not find a db verse reference for the given book (${dbBibleBook.id}) and absoluteVerseNr (${absoluteVerseNumber}). Total # of verse references: ${allVerseReferences.length}`).to.not.be.null;

  return dbVerseReference.id;
}

module.exports = {
  splitVerseReference,
  getDbVerseReferenceId,
}