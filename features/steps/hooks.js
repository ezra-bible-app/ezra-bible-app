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

const { AfterAll, Before, After, Status, BeforeAll } = require("cucumber");

const chaiAsPromised = require("chai-as-promised");
const spectronHelper = require("../helpers/spectron_helper.js");
const nsiHelper = require("../helpers/nsi_helper.js");
const uiHelper = require("../helpers/ui_helper.js");

function hasTag(scenario, tag) {
  for (var i = 0; i < scenario.pickle.tags.length; i++) {
    var currentTag = scenario.pickle.tags[i];

    if (currentTag.name == tag) {
      return true;
    }
  }

  return false;
}

BeforeAll({ timeout: 2000 }, async function () {
  await spectronHelper.deleteUserDataDir();
});

Before({ timeout: 80000}, async function (scenario) {
  var args = [];

  var installKjv = true;

  var app = spectronHelper.getApp();

  if (hasTag(scenario, "@needs-asv-before")) {
    if (app && app.isRunning()) {
      var asvModule = await nsiHelper.getLocalModule('ASV');

      if (asvModule == null) {
        await app.stop();
        app = null;
      }
    }

    args.push('--install-asv');
  }

  if (hasTag(scenario, "@no-kjv-needed")) {
    installKjv = false;
  }

  if (installKjv) {
    if (app != null) {
      var kjvModule = await nsiHelper.getLocalModule('KJV');

      if (kjvModule == null) {
        args.push('--install-kjv');

        await app.stop();
        app = null;
      }
    } else {
      args.push('--install-kjv');
    }
  }

  if (app == null || !app.isRunning()) {
    app = spectronHelper.initApp(args, true);
    chaiAsPromised.transferPromiseness = app.transferPromiseness;
    await app.start();
    await app.browserWindow.maximize();
    await spectronHelper.sleep(2000);

    var startupCompleted = false;

    while (!startupCompleted) {
      startupCompleted = await app.webContents.executeJavaScript(`
        isStartupCompleted();
      `);

      await spectronHelper.sleep(1000);
    }
  }
});

After("@reset-book-loading-mode-after-scenario", async function() {
  var verseListTabs = await spectronHelper.getWebClient().$('#verse-list-tabs-1');
  var menuButton = await verseListTabs.$('.display-options-button');
  await menuButton.click();
  await spectronHelper.sleep();

  await uiHelper.setBookLoadingOption("Open books completely");
});

After("@remove-last-tag-after-scenario", async function() {
  if (this.currentTag == null) {
    return;
  }

  var tagDeleteButton = await this.currentTag.$('.delete-button'); 
  await tagDeleteButton.click();
  await spectronHelper.sleep();

  var deleteTagConfirmationDialog = await spectronHelper.getWebClient().$('#delete-tag-confirmation-dialog');
  var deleteTagConfirmationDialogContainer = await deleteTagConfirmationDialog.$('..');
  var deleteTagConfirmationButtons = await deleteTagConfirmationDialogContainer.$$('button');

  //console.log(`Got ${deleteTagConfirmationButtons.length} confirmation buttons!`);
  var confirmationButton = deleteTagConfirmationButtons[1];

  await confirmationButton.click();
  await spectronHelper.sleep(1000);
});

After("@remove-last-note-after-scenario", async function() {
  if (this.noteBox == null) {
    return;
  }

  await this.noteBox.click();
  await spectronHelper.sleep();

  await spectronHelper.getApp().webContents.executeJavaScript("app_controller.notes_controller.currentEditor.getDoc().setValue('')");

  var saveButton = await this.noteBox.$('a[class^="save"]');
  await saveButton.click();

  await spectronHelper.sleep();
});

After(async function(scenario) {
  if (scenario.result.status === Status.FAILED) {
    await spectronHelper.getWebClient().saveScreenshot('./test_screenshot.png');
  }
});

AfterAll({ timeout: 10000}, async function () {
  var app = spectronHelper.getApp();
  if (app && app.isRunning()) {
    var rendererLogs = await spectronHelper.getWebClient().getRenderProcessLogs();

    if (rendererLogs.length > 0) {
      console.log("\nRenderer logs:");
      rendererLogs.forEach(log => {
        console.log(log.message);
      });
    }

    var exitCode = await app.stop();
    return exitCode;
  }
});
