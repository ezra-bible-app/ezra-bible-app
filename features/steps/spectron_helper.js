const path = require('path');
const Application = require('spectron').Application;
const chaiAsPromised = require("chai-as-promised");
const chai = require("chai");
const assert = require('chai').assert;

class SpectronHelper {
  constructor() {
    this.app = null;
    this.nsi = null;
  }

  initializeSpectron() {
    let xvfbMaybePath = path.join(__dirname, "../../node_modules", ".bin", "xvfb-maybe");
    let electronPath = path.join(__dirname, "../../node_modules", ".bin", "electron");
    const appPath = path.join(__dirname, "../../");
    if (process.platform === "win32") {
        electronPath += ".cmd";
    }

    return new Application({
        path: xvfbMaybePath,
        args: [electronPath, appPath],
        env: {
            ELECTRON_ENABLE_LOGGING: true,
            ELECTRON_ENABLE_STACK_DUMPING: true,
            NODE_ENV: "development"
        },
        startTimeout: 20000,
        chromeDriverLogPath: '../chromedriverlog.txt'
    });
  }

  initAndGetApp() {
    if (this.app == null) {
      chai.should();
      chai.use(chaiAsPromised);
      this.app = this.initializeSpectron();
    }

    return this.app;
  }

  async getNSI(refresh=false) {
    if (this.nsi == null || refresh) {
      const NodeSwordInterface = require('node-sword-interface');
      const electronApp = this.app.electron.remote.app;
      const userDataDir = await electronApp.getPath('userData');
      this.nsi = new NodeSwordInterface(userDataDir);
    }

    return this.nsi;
  }

  async buttonHasClass(button, className, timeoutMs=100) {
    await global.app.client.waitUntil(async () => {
      var classList = await button.getAttribute('class');
      return classList.split(' ').includes(className);
    }, { timeout: timeoutMs });
  }

  async buttonIsDisabled(button, timeoutMs=100) {
    await this.buttonHasClass(button, 'ui-state-disabled', timeoutMs);
  }

  async buttonIsEnabled(button, timeoutMs=100) {
    await this.buttonHasClass(button, 'ui-state-default', timeoutMs);
  }

  sleep(time) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve();
      }, time);
    });
  }
}

module.exports = SpectronHelper;