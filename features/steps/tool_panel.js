/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2025 Ezra Bible App Development Team <contact@ezrabibleapp.net>

   Ezra Bible App is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 2 of the License, or
   (at your option) any later version.

   Ezra Bible App is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
   See the GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Bible App. See the file LICENSE.
   If not, see <http://www.gnu.org/licenses/>. */

const { When } = require('@wdio/cucumber-framework');
const spectronHelper = require('../helpers/spectron_helper.js');

When(/^I open the tag panel$/, async function() {
  const panelButtons = await spectronHelper.getWebClient().$('#app-container panel-buttons');
  const button = await panelButtons.$('#tag-panel-button');
  const classes = (await button.getAttribute('class'));

  if (!classes || classes.split(' ').includes('active')) {
    await button.click();
    await spectronHelper.sleep();
  }
});

When(/^I open the notes panel$/, async function() {
  const panelButtons = await spectronHelper.getWebClient().$('#app-container panel-buttons');
  const button = await panelButtons.$('#notes-panel-button');
  const classes = (await button.getAttribute('class'));

  if (!classes || classes.split(' ').includes('active')) {
    await button.click();
    await spectronHelper.sleep();
  }
});