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
const spectronHelper = require('../helpers/spectron_helper.js');
const { expect } = require("chai");

When('I change to the {string} locale', async function (localeNative) {
  const dropdownButton = await spectronHelper.getWebClient().$('.locale-switch-container .ui-selectmenu');
  await dropdownButton.click();
  await spectronHelper.sleep();

  const dropdownList = await spectronHelper.getWebClient().$('.locale-switch-container .ui-selectmenu-menu-dropdown');
  const firstLocaleOption = await dropdownList.$(`./li/a[contains(text(), '${localeNative}')]`);
  await firstLocaleOption.click();
  await spectronHelper.sleep(500);
});

Then('the {interface_element} text is {string}', async function (selector, text) {
  // const elementText = await spectronHelper.getWebClient().getText(selector);
  const element = await spectronHelper.getWebClient().$(selector);
  const elementText = await element.getProperty("innerText");

  expect(elementText, `${selector} text doesn't match`).to.equal(text);
  await spectronHelper.sleep(500);
});