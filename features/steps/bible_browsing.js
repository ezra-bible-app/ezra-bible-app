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
const spectronHelper = require('../helpers/spectron_helper.js');
const nsiHelper = require("../helpers/nsi_helper.js");
const uiHelper = require("../helpers/ui_helper.js");

Given('I open the {first_tab_menu} menu/dialog', {timeout: 15 * 1000}, async function (buttonSelector) {
  const client = spectronHelper.getWebClient();
  const verseListTabs = await client.$('#verse-list-tabs-1');
  const matchingButtons = await verseListTabs.$$(buttonSelector);
  let menuButton;

  for (const candidate of matchingButtons) {
    if (await candidate.isDisplayed()) {
      const classList = (await candidate.getAttribute('class')).split(' ');
      if (classList.includes('ui-state-default') && !classList.includes('ui-state-disabled')) {
        menuButton = candidate;
        break;
      }
    }
  }

  if (!menuButton && matchingButtons.length === 1) {
    menuButton = matchingButtons[0];
  }

  if (!menuButton) {
    throw new Error(`No visible enabled menu button found for ${buttonSelector}.`);
  }

  await client.execute(() => app_controller.hideAllMenus());
  await menuButton.click();
  await client.waitUntil(async () => uiHelper.buttonIsActive(menuButton), {
    timeout: 5000,
    timeoutMsg: `The menu button ${buttonSelector} did not become active after clicking.`
  });

  if (buttonSelector === '.book-select-button') {
    const bookMenu = await client.$('#book-selection-menu');
    await bookMenu.waitForDisplayed({ timeout: 5000 });
  }
});

Given('I set the book loading option to {string}', async function (bookLoadingMode) {
  await uiHelper.setBookLoadingOption(bookLoadingMode);
});

Then('I close the {first_tab_menu} menu/dialog', {timeout: 60 * 1000}, async function (buttonSelector) {
  const client = spectronHelper.getWebClient();
  const verseListTabs = await client.$('#verse-list-tabs-1');
  const matchingButtons = await verseListTabs.$$(buttonSelector);

  for (const menuButton of matchingButtons) {
    if (await menuButton.isDisplayed() && await uiHelper.buttonIsActive(menuButton)) {
      await menuButton.click();
      await client.waitUntil(async () => !(await uiHelper.buttonIsActive(menuButton)), {
        timeout: 5000,
        timeoutMsg: `The menu button ${buttonSelector} did not close after clicking.`
      });
      break;
    }
  }
});

When('I select the book {bible_book}', {timeout: 20 * 1000}, async function (bookName) {
  var bookLink = await spectronHelper.getWebClient().$(`a[book-name="${bookName}"]`);
  await bookLink.click();
  await uiHelper.waitUntilGlobalLoaderIsHidden();
});

Then('the tab title is {string}', async function (string) {
  const client = spectronHelper.getWebClient();
  const verseListTabs = await client.$('#verse-list-tabs');
  const uiTabsNav = await verseListTabs.$('.ui-tabs-nav');
  const selectedTabIndex = await client.execute(() => app_controller.tab_controller.getSelectedTabIndex());
  const tabLinks = await uiTabsNav.$$('li a');
  const activeTabTitle = await tabLinks[selectedTabIndex].getText();

  assert(activeTabTitle == string, `The tab title "${activeTabTitle}" does not match the expectation "${string}"!`);
});

Then('the book of Ephesians is opened in the current tab', async function () {
  var verseListTabs = await spectronHelper.getWebClient().$('#verse-list-tabs-1');

  var verseBoxes = await verseListTabs.$$('.verse-box');
  assert(verseBoxes.length == 155, `The number of verses does not match the expectation for Ephesians (155): ${verseBoxes.length}`);

  var firstVerseBox = verseBoxes[0];
  var firstVerseText = await firstVerseBox.$('.first-bible-text');
  var firstVerseTextContent = await firstVerseText.getText();
  firstVerseTextContent = firstVerseTextContent.trim();

  var lastVerseBox = verseBoxes[verseBoxes.length - 1];
  var lastVerseText = await lastVerseBox.$('.first-bible-text');
  var lastVerseTextContent = await lastVerseText.getText();
  lastVerseTextContent = lastVerseTextContent.replace("\n", " ");
  lastVerseTextContent = lastVerseTextContent.trim();

  var ephesiansOneOne = "Paul, an apostle of Jesus Christ by the will of God, to the saints which are at Ephesus, and to the faithful in Christ Jesus:";
  var ephesiansSixTwentyFour = "Grace be with all them that love our Lord Jesus Christ in sincerity. Amen. Written from Rome unto the Ephesians by Tychicus.";

  assert(firstVerseTextContent == ephesiansOneOne, `The first verse does not match the expected content! Actual: "${firstVerseTextContent}" / Expected: "${ephesiansOneOne}"`);
  assert(lastVerseTextContent == ephesiansSixTwentyFour, `The last verse does not match the expected content! Actual: "${lastVerseTextContent}" / Expected: "${ephesiansSixTwentyFour}"`);
});

Then('{bible_book} chapter {int} is opened in the current tab', async function (bible_book, chapter) {
  const bookShortTitle = await nsiHelper.getBookShortTitle(bible_book);
  const expectedBookChapterVerseCount = await nsiHelper.getBookChapterVerseCount("KJV", bookShortTitle, chapter);

  var verseListTabs = await spectronHelper.getWebClient().$('#verse-list-tabs-1');
  var verseBoxes = await verseListTabs.$$('.verse-box');
  assert(verseBoxes.length == expectedBookChapterVerseCount,
    `The number of verses does not match the expectation for Ephesians chapter ${chapter} (${expectedBookChapterVerseCount}): ${verseBoxes.length}`);

  const expectedLastVerseContent = await nsiHelper.getChapterLastVerseContent("KJV", bookShortTitle, chapter);
  const actualLastVerseElement = await verseBoxes[verseBoxes.length - 1].$('.first-bible-text');
  const actualLastVerseContent = await actualLastVerseElement.getText();

  assert(actualLastVerseContent == expectedLastVerseContent,
    `The content of the last verse of ${bible_book} chapter ${chapter} does NOT match:\n\n` + 
    `ACTUAL: ${actualLastVerseContent} EXPECTED: ${expectedLastVerseContent}`);
});

When('I click on chapter {int}', async function (chapter) {
  var verseListTabs = await spectronHelper.getWebClient().$('#verse-list-tabs-1');
  var navigationPane = await verseListTabs.$('.navigation-pane');
  var allChapterLinks = await navigationPane.$$('.chapter-link');
  var selectedChapterLink = allChapterLinks[chapter - 1];

  await selectedChapterLink.click();
  await uiHelper.waitUntilGlobalLoaderIsHidden();
});

Given('I select the verse {string}', async function (selectedVerse) {
  var splittedSelectedVerse = selectedVerse.split(' ');
  var book = splittedSelectedVerse[0];
  var verseReferenceString = splittedSelectedVerse[1];
  this.selectedBookId = nsiHelper.getBookShortTitle(book);
  var verseReferenceHelper = await nsiHelper.getVerseReferenceHelper();
  var absoluteVerseNumber = await verseReferenceHelper.referenceStringToAbsoluteVerseNr('KJV', this.selectedBookId, verseReferenceString);

  var verseListTabs = await spectronHelper.getWebClient().$('#verse-list-tabs-1');
  this.selectedVerseBox = await verseListTabs.$('.verse-nr-' + absoluteVerseNumber);
  this.selectedVerseText = await this.selectedVerseBox.$('.first-bible-text');

  await this.selectedVerseText.click();
  await spectronHelper.sleep();
});