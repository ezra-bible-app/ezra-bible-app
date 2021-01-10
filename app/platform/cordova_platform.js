/* This file is part of Ezra Project.

   Copyright (C) 2019 - 2020 Tobias Klein <contact@ezra-project.net>

   Ezra Project is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 2 of the License, or
   (at your option) any later version.

   Ezra Project is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Project. See the file LICENSE.
   If not, see <http://www.gnu.org/licenses/>. */

class CordovaPlatform {
  constructor() {}

  init() {
    console.log("Initializing app on Cordova platform ...");

    this.isFullScreenMode = false;

    // In the Cordova app the first thing we do is showing the global loading indicator.
    // This would happen later again, but only after the nodejs engine is started.
    // In the meanwhile the screen would be just white and that's what we would like to avoid.
    showGlobalLoadingIndicator();

    document.addEventListener('deviceready', async () => {
      try {
        await this.getPermissions();

        var isDebug = await this.isDebug();

        this.startNodeJsEngine(isDebug);

      } catch (error) {

        // TODO: Handle permissions error
        console.log(error);
      }
    }, false);
  }

  getPermissions() {
    // Note that the following code depends on having the cordova-plugin-android-permisssions available

    console.log("Getting permissions ...");

    return new Promise((resolve, reject) => {
      var permissions = cordova.plugins.permissions;

      permissions.checkPermission(permissions.WRITE_EXTERNAL_STORAGE, (status) => {
        if (!status.hasPermission) {
          permissions.requestPermission(permissions.WRITE_EXTERNAL_STORAGE,
            () => { // success
              resolve();
            },
            () => { // error
              reject("No permission to write on external storage");
            }
          );
        } else {
          resolve();
        }
      });
    });
  }

  isDebug() {
    // The following code depends on having the cordova-plugin-is-debug available

    return new Promise((resolve, reject) => {
      cordova.plugins.IsDebug.getIsDebug((isDebug) => {
        resolve(isDebug);
      }, (err) => {
        reject(err);
      });
    });
  }

  startNodeJsEngine(isDebug) {
    console.log("Starting up nodejs engine!");
    nodejs.channel.setListener(this.mainProcessListener);
    //nodejs.start('main.js', initApplication);

    nodejs.startWithScript(`
      const Main = require('main.js');

      var main = new Main();
      main.init(${isDebug});
    `, initApplication);
  }

  mainProcessListener(message) {
    console.log(message);
  }

  toggleFullScreen() {
    // Note that the following code depends on having the cordova-plugin-fullscreen available

    if (this.isFullScreenMode) {

      AndroidFullScreen.showSystemUI(() => {
        this.isFullScreenMode = false;
      }, () => {
        console.error("Could not leave immersive mode");
      });

    } else {

      AndroidFullScreen.immersiveMode(() => {
        this.isFullScreenMode = true;
      }, () => {
        console.error("Could not switch to immersive mode");
      });
    }
  }

  keepScreenAwake() {
    // Note that the following code depends on having the cordova-plugin-insomnia available
    window.plugins.insomnia.keepAwake();
  }

  allowScreenToSleep() {
    // Note that the following code depends on having the cordova-plugin-insomnia available
    window.plugins.insomnia.allowSleepAgain();
  }
}

module.exports = CordovaPlatform;