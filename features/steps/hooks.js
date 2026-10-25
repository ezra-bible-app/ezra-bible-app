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

const { Before, After } = require('@wdio/cucumber-framework');

const appHelper = require("../helpers/app_helper.js");
const uiHelper = require("../helpers/ui_helper.js");
const dbHelper = require('../helpers/db_helper.js');

Before({ timeout: 80000 }, async function () {
  await browser.waitUntil(async () => {
    return browser.execute(() => typeof isStartupCompleted === 'function' && isStartupCompleted());
  }, {
    timeout: 80000,
    timeoutMsg: 'The Electron app did not finish startup in time.'
  });
});

After("@reset-book-loading-mode-after-scenario", async function() {
  var verseListTabs = await appHelper.getWebClient().$('#verse-list-tabs-1');
  var menuButton = await verseListTabs.$('.display-options-button');
  await menuButton.click();
  await appHelper.sleep();

  await uiHelper.setBookLoadingOption("Open books completely");
});

After("@remove-last-tag-after-scenario", async function() {
  if (this.currentTag == null) {
    return;
  }

  var tagDeleteButton = await this.currentTag.$('.delete-button'); 
  await tagDeleteButton.click();
  await appHelper.sleep();

  var deleteTagConfirmationDialog = await appHelper.getWebClient().$('#delete-tag-confirmation-dialog');
  var deleteTagConfirmationDialogContainer = await deleteTagConfirmationDialog.$('xpath:..');
  var deleteTagConfirmationButtons = await deleteTagConfirmationDialogContainer.$$('button');

  //console.log(`Got ${deleteTagConfirmationButtons.length} confirmation buttons!`);
  var confirmationButton = deleteTagConfirmationButtons[1];

  await confirmationButton.click();
  await appHelper.sleep(1000);
});

After("@cleanup-after-scenario", async function() {
  await appHelper.getWebClient().execute(() => {
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

  await appHelper.sleep(500);

  await appHelper.getWebClient().execute(async () => {
    await tag_assignment_panel.updateTagsView(true);
    
    const eventController = require('./app/frontend/controllers/event_controller.js');
    await eventController.publishAsync('on-tag-group-renamed');
  });

  await appHelper.getWebClient().execute(() => {
    document.querySelector('#tag-panel-tag-list-menu').shadowRoot.querySelector('#tag-group-list-link').click();
  });

  await appHelper.sleep(500);

  await uiHelper.selectTagGroup('All tags');
});

After(async function(scenario) {
  if (scenario.result.status === 'FAILED') {
    await browser.saveScreenshot('./test_screenshot.png');
  }
});
