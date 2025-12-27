/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2024 Tobias Klein <contact@ezra-project.net>

   Ezra Bible App is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 2 of the License, or
   (at your option) any later version.

   Ezra Bible App is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Project. See the file LICENSE.
   If not, see <http://www.gnu.org/licenses/>. */

console.log('Starting nodejs backend from cordova_main.js');

const PlatformHelper = require('./app/lib/platform_helper.js');
const IPC = require('./app/backend/ipc/ipc.js');
global.ipc = null;
global.sendCrashReports = true;

class Main {
  init(isDebug) {
    // Require the 'cordova-bridge' to enable communications between the
    // Node.js app and the Cordova app.
    console.log('Loading cordova-bridge');
    global.cordova = require('cordova-bridge');
    this.platformHelper = new PlatformHelper();
    this.isDebug = isDebug;
    this.androidVersion = null;

    /*if (!isDebug) {
      console.log('Initializing Sentry');
      this.initSentry();
    }*/

    console.log('Initializing app events');
    this.initAppEvents();

    console.log('Initializing non-persistent IPC');
    global.ipc = new IPC();
    global.ipc.initNonPersistentIpc();

    const dataDir = cordova.app.datadir();

    cordova.channel.send(`nodejs: cordova_main.js loaded / data dir: ${dataDir}`);
  }

  /*initSentry() {
    const pjson = require('./package.json');
    const version = pjson.version;

    const sentryPjson = require('@sentry/node/package.json');
    const sentryVersion = sentryPjson.version;

    console.log(`Configuring Sentry nodejs ${sentryVersion} with app version: ${version}`);

    try {
      // Loading Sentry in a try/catch block, because we have observed failures related to this step.
      // If it fails ... startup is broken. Why did it fail previously? After a sentry upgrade the
      // path to the sources had changed and the require statement did not work anymore.

      global.Sentry = require('@sentry/node');

      Sentry.init({
        dsn: 'https://977e321b83ec4e47b7d28ffcbdf0c6a1@sentry.io/1488321',
        release: version,
        beforeSend: (event) => global.sendCrashReports ? event : null
      });
    } catch (error) {
      console.error('Sentry initialization failed with an error!');
      console.log(error);
    }
  }*/

  initPersistentIpc(androidVersion=undefined) {
    console.log("Initializing persistent IPC!");

    this.androidVersion = androidVersion;

    this.initStorage(androidVersion);
    global.ipc.init(this.isDebug, undefined, androidVersion);

    return true;
  }

  async initDatabase(androidVersion=undefined, connectionType=undefined) {
    console.log("Initializing database!");
    console.log(`Connection type: ${connectionType}`);

    if (connectionType === undefined) {
      connectionType = global.connectionType;
    }

    let initDbResult = await global.ipc.initDatabase(this.isDebug, androidVersion, connectionType);

    return initDbResult;
  }

  async closeDatabase() {
    await global.ipc.closeDatabase();
  }

  initAppEvents() {
    // Handle the 'pause' and 'resume' events.
    // These are events raised automatically when the app switched to the
    // background/foreground.
    cordova.app.on('pause', async (pauseLock) => {
      console.log('[node] App paused. Closing database!');
      await this.closeDatabase();
      console.log('[node] Database closed!');
      pauseLock.release();
    });

    cordova.app.on('resume', () => {
      console.log(`[node] Resume: Re-initializing database on Android ${this.androidVersion}.`);

      this.initDatabase(this.androidVersion);

      console.log('[node] App resumed.');
      cordova.channel.post('engine', 'resumed');
    });
  }

  initStorage(androidVersion=undefined) {
    const fs = require('fs');
    var path = this.platformHelper.getUserDataPath(androidVersion);

    if (!fs.existsSync(path)) {
      console.log("Creating data directory for app at " + path);
      fs.mkdirSync(path, { recursive: true });
    }
  }
}

module.exports = Main;