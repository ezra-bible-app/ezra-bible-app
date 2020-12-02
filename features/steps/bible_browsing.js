const { Given, When, Then } = require("cucumber");
const { assert } = require("chai");

Given('I open the book selection menu', async function () {
  var verseListTabs = await global.app.client.$('#verse-list-tabs-1');
  var bookSelectButton = await verseListTabs.$('.book-select-button');
  
  await global.spectronHelper.buttonIsEnabled(bookSelectButton, timeoutMs=1000);
  await bookSelectButton.click();
  await spectronHelper.sleep(500);
});

When('I select the book Ephesians', {timeout: 20 * 1000}, async function () {
  var ephesiansButton = await global.app.client.$('.book-Eph');
  var ephesiansLink = await ephesiansButton.$('a');
  await ephesiansLink.click();

  var verseListTabs = await global.app.client.$('#verse-list-tabs-1');
  var loader = await verseListTabs.$('.loader');

  await global.app.client.waitUntil(async () => { // Wait until loader is hidden
    var loaderDisplay = await loader.getCSSProperty('display');
    await global.app.client.saveScreenshot('./test_screenshot.png');
    await spectronHelper.sleep(200);

    return loaderDisplay.value == "none";
  }, { timeout: 20000, timeoutMsg: "The loader has not disappeared after waiting 20s." });
});

Then('the tab title is {string}', async function (string) {
  var verseListTabs = await global.app.client.$('#verse-list-tabs');
  var uiTabsNav = await verseListTabs.$('.ui-tabs-nav');
  var firstLink = await uiTabsNav.$('a');
  var firstLinkText = await firstLink.getText();

  assert(firstLinkText == string, `The tab title "${firstLinkText}" does not match the expectation "${string}"!`);
});

Then('the book of Ephesians is opened in the current tab', async function () {
  var verseListTabs = await global.app.client.$('#verse-list-tabs-1');

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
  this.selectedBookId = global.spectronHelper.getBookShortTitle(book);
  var verseReferenceHelper = await global.spectronHelper.getVerseReferenceHelper();
  var absoluteVerseNumber = verseReferenceHelper.referenceStringToAbsoluteVerseNr('KJV', this.selectedBookId, verseReferenceString);

  var verseListTabs = await global.app.client.$('#verse-list-tabs-1');
  this.selectedVerseBox = await verseListTabs.$('.verse-nr-' + absoluteVerseNumber);
  this.selectedVerseText = await this.selectedVerseBox.$('.verse-text');

  await this.selectedVerseText.click();
  await spectronHelper.sleep(200);
});