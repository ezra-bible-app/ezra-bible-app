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

const path = require('path');
const Application = require('spectron').Application;
const chaiAsPromised = require('chai-as-promised');
const chai = require('chai');
const fs = require('fs-extra');
const os = require('os');

/** @type {Application | null} */
var app = null;

function initializeSpectron(additionalArgs = []) {
  let xvfbMaybePath = path.join(__dirname, "../../node_modules", ".bin", "xvfb-maybe");
  let electronPath = path.join(__dirname, "../../node_modules", ".bin", "electron");
  const appPath = path.join(__dirname, "../../");
  if (process.platform === "win32") {
    electronPath += ".cmd";
  }

  var args = [electronPath, appPath];
  args.push(...additionalArgs);

  return new Application({
    path: xvfbMaybePath,
    args: args,
    env: {
      ELECTRON_ENABLE_LOGGING: true,
      ELECTRON_ENABLE_STACK_DUMPING: true,
      NODE_ENV: "development",
      EZRA_TESTING: true
    },
    startTimeout: 20000,
    chromeDriverLogPath: './chromedriverlog.txt',
    webdriverOptions: ({
      deprecationWarnings : false
    })
  });
}

module.exports.initApp = function(additionalArgs = [], force = false) {
  if (app == null || force) {
    chai.should();
    chai.use(chaiAsPromised);
    app = initializeSpectron(additionalArgs);
  }
  
  return app;
};

module.exports.getApp = () => app;
module.exports.getWebClient = () => app.client; // https://webdriver.io/docs/api

module.exports.sleep = function(time = 200) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, time);
  });
};

module.exports.getUserDataDir = async function(appDataPath=null) {
  if (!appDataPath) {
    var electronApp = app.electron.remote.app;
    appDataPath = await electronApp.getPath('appData');
  }

  var pjson = require('../../package.json');
  var userDataDir = path.join(appDataPath, pjson.name + '-test');
  return userDataDir;
};

module.exports.deleteUserDataDir = async function() {
  var appDataPath = null;

  if (os.type() == 'Linux') {
    appDataPath = process.env.HOME + '/.config';
  } else if (os.type() == 'Darwin') {
    appDataPath = process.env.HOME + '/Library/Application Support';
  } else {
    throw "Unsupported OS for testing";
  }

  const userDataDir = await this.getUserDataDir(appDataPath);

  try {
    fs.removeSync(userDataDir);
  } catch (e) {
    console.log(`Could not delete user data dir ${userDataDir}!`);
  }
};