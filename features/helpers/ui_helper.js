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

const appHelper = require('./app_helper.js');
const nsiHelper = require('./nsi_helper.js');

async function buttonHasClass(button, className) {
  const classList = await button.getAttribute('class');
  return classList.split(' ').includes(className);
}

async function waitUntilButtonHasClass(button, className, timeoutMs = 100) {
  await appHelper.getWebClient().waitUntil(async () => 
    buttonHasClass(button, className)
  , { timeout: timeoutMs });
}

module.exports.buttonIsDisabled = async function(button, timeoutMs = 100) {
  await waitUntilButtonHasClass(button, 'ui-state-disabled', timeoutMs);
};

module.exports.buttonIsEnabled = async function(button, timeoutMs = 100) {
  await waitUntilButtonHasClass(button, 'ui-state-default', timeoutMs);
};

module.exports.buttonIsActive = async function(button) {
  return await buttonHasClass(button, 'ui-state-active');
};

module.exports.getVerseBox = async function(verseReference) {
  var verseListTabs = await appHelper.getWebClient().$('#verse-list-tabs-1');
  var { absoluteVerseNumber } = await nsiHelper.splitVerseReference(verseReference);
  return await verseListTabs.$(`.verse-nr-${absoluteVerseNumber}`);
};

module.exports.waitUntilGlobalLoaderIsHidden = async function(timeoutMs = 20000) {
  var verseListMenu = await appHelper.getWebClient().$('.verse-list-menu');
  var loader = await verseListMenu.$('#desktop-loader');

  await appHelper.getWebClient().waitUntil(async () => { // Wait until loader is hidden
    var loaderDisplay = await loader.getCSSProperty('display');
    await appHelper.sleep();

    return loaderDisplay.value == "none";
  }, { timeout: timeoutMs, timeoutMsg: `The loader has not disappeared after waiting ${timeoutMs}ms.` });
};

module.exports.setBookLoadingOption = async function(selectedOptionText) {
  const dropdownButton = await appHelper.getWebClient().$('#bookLoadingModeOption-button');
  await dropdownButton.click();
  await appHelper.sleep();

  const dropdownList = await appHelper.getWebClient().$('#bookLoadingModeOption-menu');
  const selectedOption = await dropdownList.$(`xpath:./li/a[contains(text(), '${selectedOptionText}')]`);
  await selectedOption.click();
  await appHelper.sleep();
};

module.exports.selectTagGroup = async function(tagGroupTitle) {
  this.currentTagGroupListSelector = '#tag-panel-tag-group-list';

  await appHelper.getWebClient().execute((expectedTitle, tagGroupListSelector) => {
    var tagGroups = document.querySelector(tagGroupListSelector).shadowRoot.querySelectorAll('.tag-group');

    tagGroups.forEach((tagGroup) => {
      let link = tagGroup.querySelector('a');
      let title = link.innerText;

      if (title == expectedTitle) {
        link.click();
      }
    });
  }, tagGroupTitle, this.currentTagGroupListSelector);
};