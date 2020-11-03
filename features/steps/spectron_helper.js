const path = require('path');
const Application = require('spectron').Application;
const chaiAsPromised = require("chai-as-promised");
const chai = require("chai");
const assert = require('chai').assert;
const VerseReferenceHelper = require('../../app/helpers/verse_reference_helper');
require('../../models/biblebook');

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

  async getUserDataDir() {
    var electronApp = this.app.electron.remote.app;
    var userDataDir = await electronApp.getPath('userData');
    return userDataDir;
  }

  async getNSI(refresh=false) {
    if (this.nsi == null || refresh) {
      const NodeSwordInterface = require('node-sword-interface');
      var userDataDir = await this.getUserDataDir();
      this.nsi = new NodeSwordInterface(userDataDir);
    }

    return this.nsi;
  }

  async getVerseReferenceHelper() {
    var nsi = await global.spectronHelper.getNSI();
    var bibleChapterVerseCounts = nsi.getBibleChapterVerseCounts('KJV');
    var verseReferenceHelper = new VerseReferenceHelper(bibleChapterVerseCounts, ':');

    return verseReferenceHelper;
  }

  async initDatabase() {
    var userDataDir = await this.getUserDataDir();
    global.models = require('../../models')(userDataDir);
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

  getBookShortTitle(book_long_title) {
    for (var i = 0; i < bible_books.length; i++) {
      var current_book = bible_books[i];
      if (current_book.long_title == book_long_title) {
        return current_book.short_title;
      }
    }

    return -1;
  };

  sleep(time) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve();
      }, time);
    });
  }
}

module.exports = SpectronHelper;