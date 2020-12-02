const { AfterAll, BeforeAll, After } = require("cucumber");

const chaiAsPromised = require("chai-as-promised");
const SpectronHelper = require("./spectron_helper.js");

global.spectronHelper = new SpectronHelper();
global.app = spectronHelper.initAndGetApp();

BeforeAll({ timeout: 30000}, async function () {
  chaiAsPromised.transferPromiseness = global.app.transferPromiseness;
  await global.app.start();
});

AfterAll(async function () {
  if (global.app && global.app.isRunning()) {

    var rendererLogs = await global.app.client.getRenderProcessLogs();

    if (rendererLogs.length > 0) {
      console.log("\nRenderer logs:");
      rendererLogs.forEach(log => {
        console.log(log.message);
      });
    }

    return global.app.stop();
  }
});

After("@uninstall-kjv-after-scenario", async function() {
  const nsi = await global.spectronHelper.getNSI();

  await global.app.webContents.executeJavaScript("nsi.uninstallModule('KJV')");
  await spectronHelper.sleep(2000);
  await global.app.webContents.executeJavaScript("nsi.refreshLocalModules()");
  await spectronHelper.sleep(500);
  await global.app.webContents.executeJavaScript("app_controller.install_module_assistant.resetInstalledModules()");
  await global.app.webContents.executeJavaScript("app_controller.onTranslationRemoved('KJV')");
  await global.app.webContents.executeJavaScript("app_controller.onAllTranslationsRemoved()");
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