/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2026 Ezra Bible App Development Team <contact@ezrabibleapp.net>

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
const uiHelper = require('../helpers/ui_helper.js');

Given('I go to the list of tag groups', async function () {
  await spectronHelper.getWebClient().execute(() => {
    document.querySelector('#tag-panel-tag-list-menu').shadowRoot.querySelector('#tag-group-list-link').click();
  });

  this.currentTagGroupListSelector = '#tag-panel-tag-group-list';
  this.currentTagGroupSelector = '.tag-group';
});

When('I create a tag group {string}', async function (tagGroupTitle) {
  await spectronHelper.getWebClient().execute(() => {
    document.querySelector('#tag-panel-tag-list-menu').shadowRoot.querySelector('#add-tag-group-button').click();
  });

  var newTagGroupTitleInput = await spectronHelper.getWebClient().$('#tag-group-title-value');
  await newTagGroupTitleInput.setValue(tagGroupTitle);

  await spectronHelper.getWebClient().keys('Enter');
  await spectronHelper.sleep(500);
});

Then('the tag group {string} is listed in the tag group list', async function (tagGroupTitle) {
  let tagGroupListed = await spectronHelper.getWebClient().execute((tagGroupTitle, tagGroupListSelector, tagGroupSelector) => {
    var tagGroups = document.querySelector(tagGroupListSelector).shadowRoot.querySelectorAll(tagGroupSelector);

    let hasTagGroup = (expectedTitle) => {
      let tagGroupExisting = false;

      tagGroups.forEach((tagGroup) => {
        let link = tagGroup.querySelector('a');
        let title = link.innerText;

        if (title == expectedTitle) {
          tagGroupExisting = true;
        }
      });

      return tagGroupExisting;
    };

    return hasTagGroup(tagGroupTitle);
  }, tagGroupTitle, this.currentTagGroupListSelector, this.currentTagGroupSelector);

  assert(tagGroupListed == true, `Tag group ${tagGroupTitle} is not in the list!`);
});

When('I go the tag group list of the tag selection menu', async function () {
  await spectronHelper.getWebClient().execute(() => {
    let tagListMenu = document.querySelector('#tag-selection-menu').querySelector('tag-list-menu');
    tagListMenu.shadowRoot.querySelector('#tag-group-list-link').click();
  });

  this.currentTagGroupListSelector = '#tag-selection-menu-tag-group-list';
  this.currentTagGroupSelector = '.tag-group';
});

When('I open the tag group {string}', async function (tagGroupTitle) {
  await uiHelper.selectTagGroup(tagGroupTitle);
});

When('I open the edit dialog of the tag {string}', async function (tagTitle) {
  let tagsList = await spectronHelper.getWebClient().$('#tags-content-global');
  let allTags = await tagsList.$$('.checkbox-tag');

  for (let i = 0; i < allTags.length; i++) {
    let currentTag = allTags[i];
    let currentLabel = await currentTag.$('.cb-label');
    let currentLabelText = await currentLabel.getText();

    if (currentLabelText == tagTitle) {
      this.currentTagGroupListSelector = '#tag-group-assignment';
      this.currentTagGroupSelector = '.assignment-tag-group';

      let editButton = await currentTag.$('.edit-button');
      await editButton.click();
      return;
    }
  }
});

Then('the tag group {string} is existing in the database', async function (tagGroupTitle) {
  let models = await dbHelper.initDatabase();
  let tagGroups = await models.TagGroup.findAll();

  assert(tagGroups.length == 1, `Did not get 1 tag group, but ${tagGroups.length} tag groups!`);

  let firstTagGroup = tagGroups[0];
  assert(firstTagGroup.title == tagGroupTitle, `DB tag group title is not ${tagGroupTitle}, but ${firstTagGroup.title}`);
});

Given('I choose to add existing tags to the current tag group', async function () {
  let addExistingTagsLink = await spectronHelper.getWebClient().$('#add-existing-tags-to-tag-group-link');
  await addExistingTagsLink.click();
  await spectronHelper.sleep(500);
});

Given('I select the tag {string} to be added to the current tag group', async function (tagTitle) {
  let addTagsToTagGroupList = await spectronHelper.getWebClient().$('#add-tags-to-group-tag-list');
  let tagItems = await addTagsToTagGroupList.$$('.tag-item');

  for (let i = 0; i < tagItems.length; i++) {
    let link = await tagItems[i].$('a');
    let linkText = await link.getText();

    if (linkText == tagTitle) {
      await link.click();
      await spectronHelper.sleep(500);
      break;
    }
  }
});

When('I add the selected tags to the group', async function () {
  let addTagsToGroupButton = await spectronHelper.getWebClient().$('#add-tags-to-group-button');
  await addTagsToGroupButton.click();
  await spectronHelper.sleep(2000);
});

Then('the following tags are assigned to the tag group {string}', async function (tagGroup, dataTable) {
  let models = await dbHelper.initDatabase();
  let dbTagGroup = await models.TagGroup.findOne({ where: { title: tagGroup, }});
  let tagGroupMembers = await models.TagGroupMember.findAll({ where: { tagGroupId: dbTagGroup.id } });

  let expectedTagList = dataTable.rawTable;
  let allTagsFound = true;

  for (let i = 0; i < expectedTagList.length; i++) {
    let expectedTag = expectedTagList[i][0];
    let dbTag = await models.Tag.findOne({ where: {title: expectedTag }});
    let tagFound = false;

    for (let j = 0; j < tagGroupMembers.length; j++) {
      let tagGroupMember = tagGroupMembers[j];

      if (tagGroupMember.dataValues.tagId == dbTag.id) {
        tagFound = true;
      }
    }

    if (!tagFound) {
      allTagsFound = false;
    }
  }

  assert(allTagsFound == true, "Not all expected tag group members were found in the database!");
});

Then('{int} verses are shown with tags in the Bible browser', async function(expectedTaggedVerseCount) {
  let taggedVerseCount = await spectronHelper.getWebClient().execute(() => {
    let verseListTabs = document.querySelector('#verse-list-tabs-1');
    let verseBoxes = verseListTabs.querySelectorAll('.verse-box');
    let taggedVerseCount = 0;

    for (let i = 0; i < verseBoxes.length; i++) {
      let currentVerseBox = verseBoxes[i];

      let visibleTags = currentVerseBox.querySelectorAll('.tag:not(.hidden)');
      let tagCount = visibleTags.length;

      if (tagCount > 0) {
        taggedVerseCount += 1;
      }
    }

    return taggedVerseCount;
  });

  assert(taggedVerseCount == expectedTaggedVerseCount,
         `Did not find ${expectedTaggedVerseCount} tagged verses, but rather ${taggedVerseCount}.`);
});

When('I delete the tag group {string}', async function (tagGroupTitle) {
  let tagGroupFound = await spectronHelper.getWebClient().execute(async (tagGroupTitle) => {
    let tagGroupList = document.querySelector('#tag-panel-tag-group-list').shadowRoot.querySelector('#tag-group-list-content');
    let allTagGroups = tagGroupList.querySelectorAll('.tag-group');
    let tagGroupFound = false;

    for (let i = 0; i < allTagGroups.length; i++) {
      let currentTagGroup = allTagGroups[i];
      let currentTitle = currentTagGroup.querySelector('a').innerText;
      if (currentTitle == tagGroupTitle) {
        tagGroupFound = true;
        let currentDeleteButton = currentTagGroup.querySelector('.delete-button');
        currentDeleteButton.click();

        setTimeout(() => {
          let tagGroupDeleteConfirmButton = document.querySelector('#delete-tag-group-button');
          tagGroupDeleteConfirmButton.click();
        }, 200);

        break;
      }
    }

    return tagGroupFound;
  }, tagGroupTitle);

  assert(tagGroupFound == true, `The tag group ${tagGroupTitle} could not be found in the list!`);
  await spectronHelper.sleep(500);
});

Then('there are {int} tag groups in the database', async function (tagGroupCount) {
  let models = await dbHelper.initDatabase();
  let dbTagGroups = await models.TagGroup.findAll();
  let actualCount = dbTagGroups.length;

  assert(actualCount == tagGroupCount, `Did not find ${tagGroupCount} in the DB, but ${actualCount}`);
});

When('I rename the tag group {string} to {string}', async function (tagGroupTitle, newTagGroupTitle) {
  let tagGroupFound = await spectronHelper.getWebClient().execute(async (tagGroupTitle) => {
    let tagGroupList = document.querySelector('#tag-panel-tag-group-list').shadowRoot.querySelector('#tag-group-list-content');
    let allTagGroups = tagGroupList.querySelectorAll('.tag-group');
    let tagGroupFound = false;

    for (let i = 0; i < allTagGroups.length; i++) {
      let currentTagGroup = allTagGroups[i];
      let currentTitle = currentTagGroup.querySelector('a').innerText;
      if (currentTitle == tagGroupTitle) {
        tagGroupFound = true;
        let currentEditButton = currentTagGroup.querySelector('.edit-button');
        currentEditButton.click();
        break;
      }
    }

    return tagGroupFound;
  }, tagGroupTitle);

  assert(tagGroupFound == true, `The tag group ${tagGroupTitle} could not be found in the list!`);
  await spectronHelper.sleep(200);

  let titleInput = await spectronHelper.getWebClient().$('#rename-tag-group-title-input');
  await titleInput.setValue(newTagGroupTitle);

  let tagGroupRenameConfirmButton = await spectronHelper.getWebClient().$('#edit-tag-group-save-button');
  await tagGroupRenameConfirmButton.click();
});