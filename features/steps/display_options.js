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

const { Given } = require("cucumber");
const spectronHelper = require('../helpers/spectron_helper.js');

Given('I have the {display_option} {state}', { timeout: 40 * 1000 }, async function (displayOptionSelector, state) {
  const configOption = await spectronHelper.getWebClient().$(displayOptionSelector);
  const checkbox = await configOption.$('.toggle-config-option-switch');
  const checked = await checkbox.getAttribute('checked');

  if (state && !checked || !state && checked) {
    const verseListTabs = await spectronHelper.getWebClient().$('#verse-list-tabs-1');
    const displayOptionsButton = await verseListTabs.$('.display-options-button');

    await displayOptionsButton.click();
    await spectronHelper.sleep(500);
    await checkbox.click();
    await spectronHelper.sleep(500);
  }
});
