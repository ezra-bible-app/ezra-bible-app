/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2025 Ezra Bible App Development Team <contact@ezrabibleapp.net>

   Ezra Bible App is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 2 of the License, or
   (at your option) any later version.

   Ezra Bible App is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Bible App. See the file LICENSE.
   If not, see <http://www.gnu.org/licenses/>. */

const path = require('path');
const fs = require('fs-extra');
const os = require('os');

// In modern WebdriverIO with Electron service, we don't need to use Spectron anymore
// Instead, we use the browser object directly
// This helper now adapts the old Spectron API to work with modern WebdriverIO + Electron

// New approach for WedriverIO v9 with Electron
module.exports.initApp = function() {
  // Log the environment variable to verify it's set correctly
  console.log('EZRA_TESTING environment variable:', process.env.EZRA_TESTING);
  
  // Nothing to do here - WebdriverIO initializes the app for us
  return browser;
};

module.exports.getApp = () => browser;

// In WebdriverIO v9 with Electron, the client is just browser
module.exports.getWebClient = () => browser;

module.exports.sleep = function(time = 200) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, time);
  });
};

module.exports.getUserDataDir = async function(appDataPath=null) {
  if (!appDataPath) {
    // Use a hardcoded path for the test since we can't access electron app directly
    if (os.type() === 'Linux') {
      appDataPath = process.env.HOME + '/.config';
    } else if (os.type() === 'Darwin') {
      appDataPath = process.env.HOME + '/Library/Application Support';
    } else {
      throw "Unsupported OS for testing";
    }
  }

  var pjson = require('../../package.json');
  var userDataDir = path.join(appDataPath, pjson.name + '-test');
  return userDataDir;
};

module.exports.deleteUserDataDir = async function() {
  var appDataPath = null;

  if (os.type() === 'Linux') {
    appDataPath = process.env.HOME + '/.config';
  } else if (os.type() === 'Darwin') {
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