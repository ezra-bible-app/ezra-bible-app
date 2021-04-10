/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2021 Ezra Bible App Development Team <contact@ezrabibleapp.net>

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
const nsiHelper = require("./nsi_helper.js");
const spectronHelper = require("./spectron_helper.js");

var models;

async function initDatabase() {
  if (!global.models) {
    var userDataDir = await spectronHelper.getUserDataDir();
    models = require('../../app/backend/database/models')(userDataDir);
    global.models = models;
  }

  return global.models;
}

async function getDbVerseReferenceId(verseReference) {
  var { bookId, absoluteVerseNumber } = await nsiHelper.splitVerseReference(verseReference);

  var dbBibleBook = await models.BibleBook.findOne({ where: { shortTitle: bookId } });
  var dbVerseReference = await models.VerseReference.findOne({
    where: {
      bibleBookId: dbBibleBook.id,
      absoluteVerseNrEng: absoluteVerseNumber
    }
  });

  var allVerseReferences = await models.VerseReference.findAll();

  expect(dbVerseReference, `Could not find a db verse reference for the given book (${dbBibleBook.id}) and absoluteVerseNr (${absoluteVerseNumber}). Total # of verse references: ${allVerseReferences.length}`).to.not.be.null;

  return dbVerseReference.id;
}

module.exports = {
  initDatabase,
  getDbVerseReferenceId,
}