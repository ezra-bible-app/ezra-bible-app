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
const os = require('os');

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
    if (process.platform === 'win32') {
      appDataPath = process.env.APPDATA;
    } else if (process.platform === 'darwin') {
      appDataPath = path.join(os.homedir(), 'Library', 'Application Support');
    } else {
      appDataPath = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
    }
  }

  var pjson = require('../../package.json');
  var appName = process.platform === 'win32' ? pjson.productName : pjson.name;
  var userDataDir = path.join(appDataPath, appName + '-test');
  return userDataDir;
};
