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
const nsiHelper = require("../helpers/nsi_helper.js");
const uiHelper = require("../helpers/ui_helper.js");

Given('I open the book selection menu', {timeout: 60 * 1000}, async function () {
  var verseListTabs = await spectronHelper.getWebClient().$('#verse-list-tabs-1');
  var bookSelectButton = await verseListTabs.$('.book-select-button');
  
  await uiHelper.buttonIsEnabled(bookSelectButton, timeoutMs=1000);
  await bookSelectButton.click();
  await spectronHelper.sleep(500);
});

When('I select the book Ephesians', {timeout: 20 * 1000}, async function () {
  var ephesiansButton = await spectronHelper.getWebClient().$('.book-Eph');
  var ephesiansLink = await ephesiansButton.$('a');
  await ephesiansLink.click();
  await uiHelper.waitUntilGlobalLoaderIsHidden();
});

Then('the tab title is {string}', async function (string) {
  var verseListTabs = await spectronHelper.getWebClient().$('#verse-list-tabs');
  var uiTabsNav = await verseListTabs.$('.ui-tabs-nav');
  var firstLink = await uiTabsNav.$('a');
  var firstLinkText = await firstLink.getText();

  assert(firstLinkText == string, `The tab title "${firstLinkText}" does not match the expectation "${string}"!`);
});

Then('the book of Ephesians is opened in the current tab', async function () {
  var verseListTabs = await spectronHelper.getWebClient().$('#verse-list-tabs-1');

  var verseBoxes = await verseListTabs.$$('.verse-box');
  assert(verseBoxes.length == 155, `The number of verses does not match the expectation for Ephesians (155): ${verseBoxes.length}`);

  var firstVerseBox = verseBoxes[0];
  var firstVerseText = await firstVerseBox.$('.verse-text');
  var firstVerseTextContent = await firstVerseText.getText();
  firstVerseTextContent = firstVerseTextContent.trim();

  var lastVerseBox = verseBoxes[verseBoxes.length - 1];
  var lastVerseText = await lastVerseBox.$('.verse-text');
  var lastVerseTextContent = await lastVerseText.getText();
  lastVerseTextContent = lastVerseTextContent.replace("\n", " ");
  lastVerseTextContent = lastVerseTextContent.trim();

  var ephesiansOneOne = "Paul, an apostle of Jesus Christ by the will of God, to the saints which are at Ephesus, and to the faithful in Christ Jesus:";
  var ephesiansSixTwentyFour = "Grace be with all them that love our Lord Jesus Christ in sincerity. Amen. Written from Rome unto the Ephesians by Tychicus.";

  assert(firstVerseTextContent == ephesiansOneOne, `The first verse does not match the expected content! Actual: "${firstVerseTextContent}" / Expected: "${ephesiansOneOne}"`);
  assert(lastVerseTextContent == ephesiansSixTwentyFour, `The last verse does not match the expected content! Actual: "${lastVerseTextContent}" / Expected: "${ephesiansSixTwentyFour}"`);
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
  this.selectedVerseText = await this.selectedVerseBox.$('.verse-text');

  await this.selectedVerseText.click();
  await spectronHelper.sleep();
});