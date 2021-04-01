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

const { Given, When, Then } = require("cucumber");
const { expect } = require("chai");

Given('I have notes displayed', async function () {
  const showNotesCheckbox = await global.app.client.$('#verse-notes-switch-box');
  const checked = await showNotesCheckbox.getAttribute('checked');
  if (checked !== 'checked') {
    const verseListTabs = await global.app.client.$('#verse-list-tabs-1');
    const displayOptionsButton = await verseListTabs.$('.display-options-button');

    await displayOptionsButton.click();
    await spectronHelper.sleep(200);
    await showNotesCheckbox.click();
    await spectronHelper.sleep(200);
  }
});

Given('I click on {string} book note', async function (bookName) {
  var verseListTabs = await global.app.client.$('#verse-list-tabs-1');
  var verseBox = await verseListTabs.$('.book-notes');

  var classes = await verseBox.getAttribute('class');
  var verseNrClass = await getVerseBoxSelector(bookName);
  expect(classes.split(' ')).to.include(verseNrClass.slice(1));

  await verseBox.click();
  await spectronHelper.sleep(200);
});

Given('I enter markdown text', async function (docString) {
  await global.app.webContents.executeJavaScript("app_controller.notes_controller.currentEditor.getDoc().setValue(`" + docString + "`)");
});

When('I click note {string} button', async function (buttonClass) {
  var verseListTabs = await global.app.client.$('#verse-list-tabs-1');
  var statusBar = await verseListTabs.$('.verse-notes .verse-notes-text.edited ~ .verse-notes-status-bar');
  var button = await statusBar.$(`a[class^="${buttonClass.toLowerCase()}"]`);

  await button.click();
  await spectronHelper.sleep(200);
});

Then('the note assigned to {string} in the database starts with text {string}', async function (verseReference, startText) {
  await global.spectronHelper.initDatabase();

  var note = await global.models.Note.findByVerseReferenceId(await getDbVerseReferenceId(verseReference));

  expect(note.text.startsWith(startText)).to.be.true;
});

Then('the note assigned to {string} has {string} text {string}', async function (verseReference, tag, text) {
  var verseListTabs = await global.app.client.$('#verse-list-tabs-1');
  var verseBox = await verseListTabs.$(await getVerseBoxSelector(verseReference));
  var verseNotesText = await verseBox.$('.verse-notes-text');
  var element = await verseNotesText.$(tag);
  
  expect(await element.getText()).to.equal(text);
});

Then('the note assigned to {string} has {int} list items', async function (verseReference, num) {
  var verseListTabs = await global.app.client.$('#verse-list-tabs-1');
  var verseBox = await verseListTabs.$(await getVerseBoxSelector(verseReference));
  var verseNotesText = await verseBox.$('.verse-notes-text');
  var liElements = await verseNotesText.$$('li');
  
  expect(liElements.length).to.equal(num);
});

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

async function getVerseBoxSelector(verseReference) {
  var { absoluteVerseNumber } = await splitVerseReference(verseReference);
  return `.verse-nr-${absoluteVerseNumber}`;
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
