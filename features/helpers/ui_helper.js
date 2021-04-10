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

const spectronHelper = require('./spectron_helper.js');
const nsiHelper = require('./nsi_helper.js');

async function buttonHasClass(button, className, timeoutMs = 100) {
  await spectronHelper.getWebClient().waitUntil(async () => {
    var classList = await button.getAttribute('class');
    return classList.split(' ').includes(className);
  }, { timeout: timeoutMs });
}

async function buttonIsDisabled(button, timeoutMs = 100) {
  await buttonHasClass(button, 'ui-state-disabled', timeoutMs);
}

async function buttonIsEnabled(button, timeoutMs = 100) {
  await buttonHasClass(button, 'ui-state-default', timeoutMs);
}

async function getVerseBox(verseReference) {
  var verseListTabs = await spectronHelper.getWebClient().$('#verse-list-tabs-1');
  var { absoluteVerseNumber } = await nsiHelper.splitVerseReference(verseReference);
  return await verseListTabs.$(`.verse-nr-${absoluteVerseNumber}`);
}

async function waitUntilGlobalLoaderIsHidden(timeoutMs = 20000) {
  var verseListMenu = await spectronHelper.getWebClient().$('.verse-list-menu');
  var loader = await verseListMenu.$('.loader');

  await spectronHelper.getWebClient().waitUntil(async () => { // Wait until loader is hidden
    var loaderDisplay = await loader.getCSSProperty('display');
    await spectronHelper.getWebClient().saveScreenshot('./test_screenshot.png');
    await spectronHelper.sleep();

    return loaderDisplay.value == "none";
  }, { timeout: timeoutMs, timeoutMsg: `The loader has not disappeared after waiting ${timeoutMs}ms.` });
}

module.exports = {
  buttonIsDisabled,
  buttonIsEnabled,
  getVerseBox,
  waitUntilGlobalLoaderIsHidden,
}