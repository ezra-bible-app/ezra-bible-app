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

    document.addEventListener('deviceready', () => {
      var hasPermissions = await this.hasPermissions();

      if (hasPermissions) {
        this.startNodeJsEngine();
      } else {
        this.showPermissionsInfo();
      }

      return;

      this.getPermissions(() => {
        // SUCCESS

        this.startNodeJsEngine();

      }, () => {
        // ERROR

        var loadingIndicator = $('#startup-loading-indicator');
        loadingIndicator.addClass('permissions-issue');
        loadingIndicator.find('.loader').hide();

        var loadingIndicatorText = $('.loading-indicator-text');

        var hint = "<h3 style='text-decoration: underline'>Write permissions required</h3>" +
                   "Ezra Project needs write permissions to store SWORD modules and its database.<br><br>" +
                   "<button id='request-write-permissions'>Request write permissions</button>";

        loadingIndicatorText.html(hint);

        $('#request-write-permissions').click(() => {
          this.getPermissions(() => { 

            var loadingIndicator = $('#startup-loading-indicator');
            loadingIndicator.removeClass('permissions-issue');
            
            var loadingIndicatorText = $('.loading-indicator-text');
            loadingIndicatorText.html('');

            showGlobalLoadingIndicator();

            this.startNodeJsEngine(); 
          });
        });
      });
        
    }, false);
  }

  async hasPermissions() {

    var permissionCheck = new Promise((resolve, reject) => {
      var permissions = cordova.plugins.permissions;

      permissions.checkPermission(permissions.WRITE_EXTERNAL_STORAGE, (status) => {
        if (status.hasPermission) {
          resolve();
        } else {
          reject("Currently no permissions to write external storage!");
        }
      }, () => {
        reject("Failed to check permissions!");
      })
    });

    try {
      await permissionCheck();
      return true;

    } catch (error) {

      return false;
    }
  }

  getPermissions(resolve, reject) {
    // Note that the following code depends on having the cordova-plugin-android-permisssions available

    console.log("Getting permissions ...");

    var permissions = cordova.plugins.permissions;

    return permissions.checkPermission(permissions.WRITE_EXTERNAL_STORAGE, (status) => {
      if (!status.hasPermission) {
        return permissions.requestPermission(permissions.WRITE_EXTERNAL_STORAGE,
          (status) => { // success
            if ( status.hasPermission ) {
              resolve();
            } else {
              reject("User did not give permission to use external storage");
            }
          },
          () => { // error
            reject("Failed to request permission to write on external storage");
          }
        );
      } else {
        resolve();
      }
    }, () => {
      reject("Failed to check permissions");
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

  getPermissionsBox() {
    return $('#permissions-box');
  }

  showPermissionsInfo() {
    this.getPermissionsBox().dialog({
      title: "Welcome to Ezra Project!",
      width: 400,
      height: 300,
      autoOpen: true,
      dialogClass: 'ezra-dialog',
      modal: true
    });
  }

  async startNodeJsEngine() {
    var isDebug = await this.isDebug();

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