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
const { assert } = require("chai");

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

Given('I click on a book note', async function () {
  var verseListTabs = await global.app.client.$('#verse-list-tabs-1');
  var displayOptionsButton = await verseListTabs.$('.book-notes');

  await displayOptionsButton.click();
  await spectronHelper.sleep(200);
});

Given('I enter markdown text', { timeout: 40000 }, async function (docString) {
  // var focused = await global.app.client.getActiveElement();
  // var input = await global.app.client.$(focused);
  // var res = await input.setValue('test');
  var res = await global.app.webContents.executeJavaScript("app_controller.notes_controller.currentEditor.getDoc().setValue(`"+ docString + "`)");
  console.log(res);
  // await editor.getDoc().setValue(docString);
  await spectronHelper.sleep(2000);
});

When('I click note {string} button', function (string) {
  // Write code here that turns the phrase above into concrete actions
  return 'pending';
});

Then('the book level note is in the database', function () {
  // Write code here that turns the phrase above into concrete actions
  return 'pending';
});

Then('the note has {string} text {string}', function (tag, string) {
  // Write code here that turns the phrase above into concrete actions
  return 'pending';
});

Then('the note has {int} list items', function (int) {
  // Write code here that turns the phrase above into concrete actions
  return 'pending';
});