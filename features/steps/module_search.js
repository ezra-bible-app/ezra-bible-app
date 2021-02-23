/* This file is part of Ezra Bible Software.

   Copyright (C) 2019 - 2021 Tobias Klein <contact@ezra-project.net>

   Ezra Bible Software is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 2 of the License, or
   (at your option) any later version.

   Ezra Bible Software is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Bible Software. See the file LICENSE.
   If not, see <http://www.gnu.org/licenses/>. */

const { Given, When, Then } = require("cucumber");
const { assert } = require("chai");

Given('I open the search menu', async function () {
  var verseListTabs = await global.app.client.$('#verse-list-tabs-1');
  var moduleSearchButton = await verseListTabs.$('.module-search-button');
  
  await global.spectronHelper.buttonIsEnabled(moduleSearchButton, timeoutMs=1000);
  await moduleSearchButton.click();
  await spectronHelper.sleep(500);
});

Given('I enter the term {string}', async function (searchTerm) {
  var moduleSearchMenu = await global.app.client.$('#module-search-menu');
  var moduleSearchInput = await moduleSearchMenu.$('#module-search-input');

  await moduleSearchInput.setValue(searchTerm);
});

When('I perform the search', {timeout: 50 * 1000}, async function () {
  var moduleSearchMenu = await global.app.client.$('#module-search-menu');
  var startSearchButton = await moduleSearchMenu.$('#start-module-search-button');

  await startSearchButton.click();
  await spectronHelper.waitUntilGlobalLoaderIsHidden(50000);
});

Then('there are {int} search results', async function (searchResultCount) {
  var verseListTabs = await global.app.client.$('#verse-list-tabs-1');

  var verseBoxes = await verseListTabs.$$('.verse-box');
  assert(verseBoxes.length == searchResultCount, `The number of verses (${verseBoxes.length}) does not match the expectation for the number of search results (${searchResultCount})`);
});