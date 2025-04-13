/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2025 Ezra Bible App Development Team <contact@ezrabibleapp.net>

   Ezra Bible App is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 2 of the License, or
   (at your option) any later version.

   Ezra Bible App is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Bible App. See the file LICENSE.
   If not, see <http://www.gnu.org/licenses/>. */

const { Status } = require('cucumber');
const { BeforeAll, Before, After, AfterAll } = require('@wdio/cucumber-framework');
const chaiAsPromised = require('chai-as-promised');
const wdioHelper = require('../helpers/wdio_helper.js');
const nsiHelper = require('../helpers/nsi_helper.js');
const uiHelper = require('../helpers/ui_helper.js');
const dbHelper = require('../helpers/db_helper.js');

function hasTag(scenario, tag) {
  for (var i = 0; i < scenario.pickle.tags.length; i++) {
    var currentTag = scenario.pickle.tags[i];

    if (currentTag.name == tag) {
      return true;
    }
  }

  return false;
}

// BeforeAll hook removed - user data directory cleanup now happens in wdio.conf.js beforeSession

Before({ timeout: 80000}, async function (scenario) {
  // Define app arguments based on scenario tags
  let appArgs = [];
  let installKjv = true;

  if (hasTag(scenario, '@needs-asv-before')) {
    const asvModule = await nsiHelper.getLocalModule('ASV');
    if (asvModule == null) {
      appArgs.push('--install-asv');
    }
  }

  if (hasTag(scenario, '@no-kjv-needed')) {
    installKjv = false;
  }

  if (installKjv) {
    const kjvModule = await nsiHelper.getLocalModule('KJV');
    if (kjvModule == null) {
      appArgs.push('--install-kjv');
    }
  }

  // Set app arguments in capabilities for next startup
  if (appArgs.length > 0) {
    // In WebdriverIO with Electron service, we must set app arguments differently
    browser.options.capabilities['wdio:electronServiceOptions'].appArgs = appArgs;
  }

  // Wait for the app startup to complete
  await wdioHelper.waitForStartupComplete();
  
  // Set window size to a reasonable default instead of maximizing
  // This avoids the Browser.getWindowForTarget error in Electron
  try {
    await browser.setWindowSize(1280, 800);
  } catch (e) {
    console.log('Could not set window size, continuing with default size');
  }
  
  await wdioHelper.sleep(2000);
});

After('@reset-book-loading-mode-after-scenario', async function() {
  var verseListTabs = await browser.$('#verse-list-tabs-1');
  var menuButton = await verseListTabs.$('.display-options-button');
  await menuButton.click();
  await wdioHelper.sleep();

  await uiHelper.setBookLoadingOption('Open books completely');
});

After('@remove-last-tag-after-scenario', async function() {
  if (this.currentTag == null) {
    return;
  }

  var tagDeleteButton = await this.currentTag.$('.delete-button'); 
  await tagDeleteButton.click();
  await wdioHelper.sleep();

  var deleteTagConfirmationDialog = await browser.$('#delete-tag-confirmation-dialog');
  var deleteTagConfirmationDialogContainer = await deleteTagConfirmationDialog.$('..');
  var deleteTagConfirmationButtons = await deleteTagConfirmationDialogContainer.$$('button');

  var confirmationButton = deleteTagConfirmationButtons[1];

  await confirmationButton.click();
  await wdioHelper.sleep(1000);
});

After('@cleanup-after-scenario', async function() {
  await browser.execute(() => {
    $('.ui-dialog-content').dialog('close');
  });

  let models = await dbHelper.initDatabase();
  let tags = await models.Tag.findAll();
  let tagGroups = await models.TagGroup.findAll();

  for (let i = 0; i < tags.length; i++) {
    await models.Tag.destroyTag(tags[i].id);
  }

  for (let i = 0; i < tagGroups.length; i++) {
    await models.TagGroup.destroyTagGroup(tagGroups[i].id);
  }

  await wdioHelper.sleep(500);

  await browser.execute(async () => {
    await tags_controller.updateTagsView(true);
    
    const eventController = require('./app/frontend/controllers/event_controller.js');
    await eventController.publishAsync('on-tag-group-renamed');
  });

  await browser.execute(() => {
    document.querySelector('#tag-panel-tag-list-menu').shadowRoot.querySelector('#tag-group-list-link').click();
  });

  await wdioHelper.sleep(500);

  await uiHelper.selectTagGroup('All tags');
});

After(async function(scenario) {
  if (scenario.result.status === Status.FAILED) {
    await wdioHelper.takeScreenshot('test_failed');
  }
});

AfterAll({ timeout: 10000}, async function () {
  const logs = await browser.getLogs('browser');
  if (logs.length > 0) {
    console.log('\nRenderer logs:');
    logs.forEach(log => {
      console.log(log.message);
    });
  }
});
