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

const { Given, When, Then, defineParameterType } = require("cucumber");
const { expect } = require("chai");

defineParameterType({
  name: 'display_option',
  regexp: /tags|notes|indicators|xrefs|footnotes/,
  transformer: s => {
    switch (s) {
      case 'tags':
        return '#tags-switch';
      case 'notes':
        return '#verse-notes-switch';
      case 'indicators':
        return '#user-data-indicators-switch';
      case 'xrefs':
        return '#xrefs-switch';
      case 'footnotes':
        return '#footnotes-switch';
    }
  }
});

defineParameterType({
  name: 'state',
  regexp: /displayed|hidden/,
  type: 'boolean',
  transformer: s => s == 'displayed'
});


Given('I have {display_option} {state}', { timeout: 40 * 1000 }, async function (displayOptionId, state) {
  const checkbox = await global.app.client.$(displayOptionId);
  const checked = await checkbox.getAttribute('checked');
  if (state && !checked || !state && checked) {
    const verseListTabs = await global.app.client.$('#verse-list-tabs-1');
    const displayOptionsButton = await verseListTabs.$('.display-options-button');

    await displayOptionsButton.click();
    await spectronHelper.sleep(200);
    await checkbox.click();
    await spectronHelper.sleep(200);
  }
});

Given('I click on {string} note', async function (verseReference) {
  var verseBox = await getVerseBox(verseReference);
  var classes = await verseBox.getAttribute('class');

  if(classes.split(' ').includes('book-notes')) {
    this.noteBox = verseBox;
  } else {
    this.noteBox = await verseBox.$('.verse-notes');
  }

  await this.noteBox.click();
  await spectronHelper.sleep(200);
});

Given('I click on note indicator for the verse {string}', async function (verseReference) {
  var verseBox = await getVerseBox(verseReference);
  var noteIndicator = await verseBox.$('.notes-info');
  noteIndicator.click()
  await spectronHelper.sleep(200);

  this.noteBox = await verseBox.$('.verse-notes');
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

When('I click outside of the note editor', async function () {
  var verseListTabs = await global.app.client.$('#verse-list-tabs-1');
  var noteTextBox = await verseListTabs.$('.verse-notes .verse-notes-text.edited');
  var verseContent = await (await noteTextBox.parentElement()).parentElement();
  var verseText = await verseContent.$('.verse-text');

  await verseText.click();
  await spectronHelper.sleep(200);
});

Then('the note assigned to {string} in the database starts with text {string}', async function (verseReference, startText) {
  await global.spectronHelper.initDatabase();

  var note = await global.models.Note.findByVerseReferenceId(await getDbVerseReferenceId(verseReference));

  expect(note.text.startsWith(startText)).to.be.true;
});

Then('the note assigned to {string} has {string} text {string}', async function (verseReference, tag, text) {
  var verseBox = await getVerseBox(verseReference);
  var verseNotesText = await verseBox.$('.verse-notes-text');

  if(!(await verseNotesText.isDisplayed())) {
    var noteIndicator = await verseBox.$('.notes-info');
    noteIndicator.click()
    await spectronHelper.sleep(200);  
  }

  var element = await verseNotesText.$(tag);
  expect(await element.getText()).to.equal(text);
});

Then('the note assigned to {string} has {int} list items', async function (verseReference, num) {
  var verseBox = await getVerseBox(verseReference);
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

async function getVerseBox(verseReference) {
  var verseListTabs = await global.app.client.$('#verse-list-tabs-1');
  return await verseListTabs.$(await getVerseBoxSelector(verseReference));
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
