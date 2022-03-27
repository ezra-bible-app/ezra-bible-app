/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2022 Ezra Bible App Development Team <contact@ezrabibleapp.net>

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
  this.currentTagGroupListSelector = '#tag-panel-tag-group-list';

  await spectronHelper.getWebClient().execute((expectedTitle, tagGroupListSelector) => {
    var tagGroups = document.querySelector(tagGroupListSelector).shadowRoot.querySelectorAll('.tag-group');

    tagGroups.forEach((tagGroup) => {
      let link = tagGroup.querySelector('a');
      let title = link.innerText;

      if (title == expectedTitle) {
        link.click();
      }
    });
  }, tagGroupTitle, this.currentTagGroupListSelector);
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