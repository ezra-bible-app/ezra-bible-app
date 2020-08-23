const { AfterAll, BeforeAll } = require("cucumber");

const chaiAsPromised = require("chai-as-promised");
const SpectronHelper = require("./spectron_helper.js");

global.spectronHelper = new SpectronHelper();
global.app = spectronHelper.initAndGetApp();

BeforeAll({ timeout: 30000}, async function () {
  chaiAsPromised.transferPromiseness = global.app.transferPromiseness;
  await global.app.start();
});

AfterAll(function () {
  if (global.app && global.app.isRunning()) {
    return global.app.stop();
  }
});

