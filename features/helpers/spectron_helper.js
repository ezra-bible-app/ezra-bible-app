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

function startupProfilingEnabled() {
  return ['1', 'true', 'yes'].includes(String(process.env.EZRA_STARTUP_PROFILING || '').toLowerCase());
}

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
      EZRA_TESTING: true,
      EZRA_STARTUP_PROFILING: startupProfilingEnabled() ? 'true' : 'false'
    },
    // We explicitly instruct ChromeDriver on how to boot Chrome inside Docker/CI
    chromeDriverArgs: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--remote-debugging-port=9222' // Forces Webdriver to find the active port mapping reliably
    ],
    startTimeout: 30000, // Elevated timeout to allow modern Chrome environments to spin up inside CI framebuffers
    chromeDriverLogPath: './chromedriverlog.txt',
    webdriverOptions: {
      deprecationWarnings: false,
      capabilities: {
        browserName: 'chrome',
        'goog:chromeOptions': {
          // Fallback arguments for newer webdriver environments
          args: [
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
          ]
        }
      }
    }
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

// Guard against a completely failed initialization preventing downstream script hook exceptions
module.exports.getWebClient = () => {
  return (app && app.client) ? app.client : { saveScreenshot: () => console.log("Skipping screenshot: web client not active.") };
};

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
