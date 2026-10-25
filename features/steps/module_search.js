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

const { Given, When, Then } = require('@wdio/cucumber-framework');
const { assert } = require("chai");
const appHelper = require('../helpers/app_helper.js');
const uiHelper = require("../helpers/ui_helper.js");

Given('I enter the term {string}', async function (searchTerm) {
  var moduleSearchMenu = await appHelper.getWebClient().$('#module-search-menu');
  var moduleSearchInput = await moduleSearchMenu.$('#module-search-input');

  await moduleSearchInput.addValue(searchTerm);
});

Given('I select the search scope {string}', async function (scope) {
  const select = await appHelper.getWebClient().$('#module-search-menu #search-scope');
  await select.selectByAttribute('value', scope);
});

Given('I select the search results display mode {string}', async function (mode) {
  const select = await appHelper.getWebClient().$('#module-search-menu #search-results-display-mode');
  await select.selectByAttribute('value', mode);
});

When('I perform the search', {timeout: 50 * 1000}, async function () {
  const client = appHelper.getWebClient();
  var moduleSearchMenu = await client.$('#module-search-menu');
  var startSearchButton = await moduleSearchMenu.$('#start-module-search-button');

  await startSearchButton.click();
  await client.waitUntil(async () => {
    return client.execute(() => {
      const tab = app_controller.tab_controller.getTab();
      const results = tab && tab.getSearchResults();
      return Array.isArray(results) && results.length > 0;
    });
  }, {
    timeout: 50000,
    timeoutMsg: 'The module search did not return any results before timing out.'
  });
});

Then('there are {int} search results', {timeout: 10 * 1000}, async function (searchResultCount) {
  const actualResultCount = await appHelper.getWebClient().execute(() => {
    const tab = app_controller.tab_controller.getTab();
    const results = tab && tab.getSearchResults();
    return Array.isArray(results) ? results.length : 0;
  });
  assert(actualResultCount == searchResultCount, `The number of search results (${actualResultCount}) does not match the expectation (${searchResultCount})`);
});
