const { Given, When, Then } = require("cucumber");

async function clickCheckbox(selector) {
  var label = await global.app.client.$(selector);
  await global.app.client.waitUntil(async () => { return await label.isExisting(); }, { timeout: 40000 });
  var checkbox = await label.$('../child::input');
  await checkbox.click();
}

async function getNavLinks() {
  var moduleSettingsWizardAdd = await global.app.client.$('#module-settings-wizard-add');
  var actionsDiv = await moduleSettingsWizardAdd.$('.actions');
  var navLinks = await actionsDiv.$$('a');
  return navLinks;
}

async function clickNext() {
  var navLinks = await getNavLinks();
  var nextButton = navLinks[1];
  await nextButton.click();
}

async function getFirstLocalModule() {
  const nsi = await global.spectronHelper.getNSI();
  var allLocalModules = nsi.getAllLocalModules();
  await allLocalModules.length.should.equal(1);
  var firstLocalModule = allLocalModules[0];
  return firstLocalModule;
}

Given('I open the module installation wizard', {timeout: 40 * 1000}, async function () {
  var verseListTabs = await global.app.client.$('#verse-list-tabs-1');
  var displayOptionsButton = await verseListTabs.$('.display-options-button');
  var translationSettingsButton = await global.app.client.$('#show-translation-settings-button');
  var addModulesButton = await global.app.client.$('#add-modules-button');

  await displayOptionsButton.click();
  await translationSettingsButton.click();
  await addModulesButton.click();
});

Given('I select the CrossWire repository', {timeout: 40 * 1000}, async function () {
  await clickCheckbox('#CrossWire');
  await clickNext();
});

Given('I select the English language', {timeout: 40 * 1000}, async function () {
  await clickCheckbox('#en');
  await clickNext();
});

Given('I select the KJV module', {timeout: 40 * 1000}, async function () {
  await clickCheckbox('#KJV');
  await clickNext();
});

When('the installation is completed', {timeout: 100 * 1000}, async function () {
  var navLinks = await getNavLinks();
  var finishButton = navLinks[2];
  var finishButtonLi = await finishButton.$('..');

  await global.app.client.waitUntil(async () => {
    var finishbuttonLiClass = await finishButtonLi.getAttribute('class');
    return finishbuttonLiClass != 'disabled';
  }, { timeout: 120000 });

  await finishButton.click();
});

Then('the KJV is available as a local module', async function () {
  var firstLocalModule = await getFirstLocalModule();
  await firstLocalModule.name.should.equal('KJV');

  var verseListTabs = await global.app.client.$('#verse-list-tabs-1');
  var bibleSelectBlock = await verseListTabs.$('.bible-select-block');
  var selectMenuStatus = await bibleSelectBlock.$('.ui-selectmenu-status');
  var selectMenuStatusText = await selectMenuStatus.getText();

  await selectMenuStatusText.should.equal(firstLocalModule.description);
});

Then('the KJV is selected as the current translation', async function () {
  var firstLocalModule = await getFirstLocalModule();

  var verseListTabs = await global.app.client.$('#verse-list-tabs-1');
  var bibleSelectBlock = await verseListTabs.$('.bible-select-block');
  var selectMenuStatus = await bibleSelectBlock.$('.ui-selectmenu-status');
  var selectMenuStatusText = await selectMenuStatus.getText();

  await selectMenuStatusText.should.equal(firstLocalModule.description);
});

Then('the relevant buttons in the menu are enabled', async function() {
  var verseListTabs = await global.app.client.$('#verse-list-tabs-1');
  var bookSelectButton = await verseListTabs.$('.book-select-button');
  var moduleSearchButton = await verseListTabs.$('.module-search-button');
  var bibleTranslationInfoButton = await verseListTabs.$('.bible-translation-info-button');
  await global.spectronHelper.buttonIsEnabled(bookSelectButton);
  await global.spectronHelper.buttonIsEnabled(moduleSearchButton);
  await global.spectronHelper.buttonIsEnabled(bibleTranslationInfoButton);
});