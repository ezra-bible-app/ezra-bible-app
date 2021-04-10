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

const { Given, When, Then } = require("cucumber");
const { assert } = require("chai");
const spectronHelper = require('../helpers/spectron_helper.js');
const dbHelper = require("../helpers/db_helper.js");

Given('I create the tag {string}', async function (tagName) {
  var verseListTabs = await spectronHelper.getWebClient().$('#verse-list-tabs-1');
  var newTagButton = await verseListTabs.$('.new-standard-tag-button');
  await newTagButton.click();

  var newTagTitleInput = await spectronHelper.getWebClient().$('#new-standard-tag-title-input');
  await newTagTitleInput.setValue(tagName);

  await spectronHelper.getWebClient().keys('Enter');
  await spectronHelper.sleep(500);
});

When('I assign the tag {string} to the current verse selection', async function (tagName) {
  var tagsList = await spectronHelper.getWebClient().$('#tags-content-global');
  var allTags = await tagsList.$$('.checkbox-tag');
  var tagCount = allTags.length;
  var tagFound = false;

  assert(tagCount == 1, `The tagCount is not 1, but ${tagCount}`);

  for (var i = 0; i < allTags.length; i++) {
    this.currentTag = allTags[i];

    var currentLabel = await this.currentTag.$('.cb-label');
    var currentLabelText = await currentLabel.getText();

    if (currentLabelText == tagName) {
      tagFound = true;
      this.currentTagCheckbox = await this.currentTag.$('.tag-cb');
      await this.currentTagCheckbox.click();
      break;
    }
  }

  assert(tagFound, `The tag '${tagName}' could not be found in the list!`);
});

Then('the tag {string} is assigned to {string} in the database', async function (tagName, verseReference) {
  var models = await dbHelper.initDatabase();
  var tags = await models.Tag.getAllTags();

  assert(tags.length == 1, `Did not get 1 tag, but ${tags.length} tags!`);

  var firstTag = tags[0];
  assert(firstTag.title == tagName, `DB tag title is not ${tagName}, but ${firstTag.title}`);

  var verseTags = await models.VerseTag.findByVerseReferenceIds(await dbHelper.getDbVerseReferenceId(verseReference));

  assert(verseTags.length == 1, `Expected 1 verse tag, but got ${verseTags.length}`);

  var verseTagId = verseTags[0].tagId;
  assert(verseTagId == firstTag.id, `VerseTag associated with wrong tag id ${verseTagId}, expected ${firstTag.id}`);
});

Then('the tag {string} is visible in the bible browser at the selected verse', async function (tagName) {
  var tagBox = await this.selectedVerseBox.$('.tag-box');
  var tags = await tagBox.$$('.tag');

  assert(tags.length == 1, `Expected 1 tag, but got ${tags.length}`);

  var firstTagTitle = await tags[0].getText();
  assert(firstTagTitle == tagName, `Expected browser tag with title '${tagName}', but got '${firstTagTitle}'`);
});
