/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2021 Tobias Klein <contact@ezra-project.net>

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

const { AfterAll, BeforeAll, Before, After } = require("cucumber");

const chaiAsPromised = require("chai-as-promised");
const SpectronHelper = require("./spectron_helper.js");

global.spectronHelper = new SpectronHelper();
global.app = null;

function hasTag(scenario, tag) {
  for (var i = 0; i < scenario.pickle.tags.length; i++) {
    var currentTag = scenario.pickle.tags[i];

    if (currentTag.name == tag) {
      return true;
    }
  }

  return false;
}

Before({ timeout: 80000}, async function (scenario) {
  args = [];

  installKjv = true;
  appStopped = false;

  if (hasTag(scenario, "@needs-asv-before")) {
    if (global.app && global.app.isRunning()) {
      var asvModule = await spectronHelper.getLocalModule('ASV');

      if (asvModule == null) {
        await global.app.stop();
        global.app = null;
        appStopped = true;
      }
    }

    args.push('--install-asv');
  }

  if (hasTag(scenario, "@no-kjv-needed")) {
    installKjv = false;
  }

  if (installKjv) {
    if (global.app != null && !appStopped) {
      var kjvModule = await spectronHelper.getLocalModule('KJV');

      if (kjvModule == null) {
        args.push('--install-kjv');

        await global.app.stop();
        global.app = null;
        appStopped = true;
      }
    } else {
      args.push('--install-kjv');
      appStopped = true;
    }
  }

  if (global.app == null || !global.app.isRunning()) {
    global.app = spectronHelper.initAndGetApp(args, true);

    chaiAsPromised.transferPromiseness = global.app.transferPromiseness;
    await global.app.start();
  }
});

After("@remove-last-tag-after-scenario", async function() {
  if (this.currentTag == null) {
    return;
  }

  var tagDeleteButton = await this.currentTag.$('.tag-delete-button'); 
  await tagDeleteButton.click();
  await spectronHelper.sleep(200);

  var deleteTagConfirmationDialog = await global.app.client.$('#delete-tag-confirmation-dialog');
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
  await spectronHelper.sleep(200);

  await global.app.webContents.executeJavaScript("app_controller.notes_controller.currentEditor.getDoc().setValue('')");

  var saveButton = await this.noteBox.$('a[class^="save"]');
  await saveButton.click();

  await spectronHelper.sleep(200);
});

AfterAll({ timeout: 10000}, async function () {
  if (global.app && global.app.isRunning()) {
    var rendererLogs = await global.app.client.getRenderProcessLogs();

    if (rendererLogs.length > 0) {
      console.log("\nRenderer logs:");
      rendererLogs.forEach(log => {
        console.log(log.message);
      });
    }

    var exitCode = await global.app.stop();
    return exitCode;
  }
});
