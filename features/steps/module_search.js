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