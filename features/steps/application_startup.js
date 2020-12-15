/* This file is part of Ezra Project.

   Copyright (C) 2019 - 2020 Tobias Klein <contact@ezra-project.net>

   Ezra Project is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 2 of the License, or
   (at your option) any later version.

   Ezra Project is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Project. See the file LICENSE.
   If not, see <http://www.gnu.org/licenses/>. */

const { Given, When, Then } = require("cucumber");
const { assert } = require("chai");

Given('the application is started', async function () {
  await global.app.client.waitUntilWindowLoaded(20000);
});

Then('one window is opening', async function () {
  return await global.app.client.getWindowCount().should.eventually.equal(1);
});

Then('the window title is Ezra Project + the version number', async function () {
  const electronApp = global.app.electron.remote.app;
  const appVersion = await electronApp.getVersion();
  const title = await global.app.client.browserWindow.getTitle();

  await title.should.equal('Ezra Project ' + appVersion);
});

Then('the logs are not showing any errors', async function () {
  var renderLogs = await global.app.client.getMainProcessLogs();
  var message = "Expected 0 logs, got " + renderLogs.length + " logs: ";
  renderLogs.forEach(function (log) {
    message += log + "\n";
  });

  assert(renderLogs.length == 0, message);

  renderLogs.forEach(function (log) {
    //assert(log.level == "Errors", "Log mess has Info level");
    //console.log(log.level + " " + log.source + " " + log.message)
  });
});

Then('the application has disabled buttons, because no translations are installed at this point', async function () {
  var verseListTabs = await global.app.client.$('#verse-list-tabs-1');
  var bookSelectButton = await verseListTabs.$('.book-select-button');
  var bibleTranslationInfoButton = await verseListTabs.$('.bible-translation-info-button');
  var showBookTagStatisticsButton = await verseListTabs.$('.show-book-tag-statistics-button');
  var showParallelTranslationsButton = await verseListTabs.$('.show-parallel-translations-button');

  await global.spectronHelper.buttonIsDisabled(bookSelectButton, timeoutMs=10000);
  await global.spectronHelper.buttonIsDisabled(bibleTranslationInfoButton, timeoutMs=1000);
  await global.spectronHelper.buttonIsDisabled(showBookTagStatisticsButton, timeoutMs=1000);
  await global.spectronHelper.buttonIsDisabled(showParallelTranslationsButton, timeoutMs=1000);
});
