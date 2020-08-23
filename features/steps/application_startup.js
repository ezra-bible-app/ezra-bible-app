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

Then('the application has disabled buttons, because no translations are installed yet', async function () {
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
