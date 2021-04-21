/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2021 Ezra Bible App Development Team <contact@ezrabibleapp.net>

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

const IpcGeneral = require('../ipc/ipc_general.js');
const IpcI18n = require('../ipc/ipc_i18n.js');

/**
 * This class controls Cordova platform specific functionality and it also contains the entry point to startup on Cordova (init):
 * - Init code with permission handling and nodejs startup
 * - Cordova-specific fullscreen toggling
 * - Code to keep screen awake (keep the display turned on)
 */
class CordovaPlatform {
  constructor() {}

  init() {
    console.log("Initializing app on Cordova platform ...");

    this._isFullScreenMode = false;

    // In the Cordova app the first thing we do is showing the global loading indicator.
    // This would happen later again, but only after the nodejs engine is started.
    // In the meanwhile the screen would be just white and that's what we would like to avoid.
    uiHelper.showGlobalLoadingIndicator();

    document.addEventListener('deviceready', async () => {
      var isDebug = await this.isDebug();
      // Enable to test Sentry in debug version
      // isDebug = false;

      if (!isDebug) {
        var version = await cordova.getAppVersion.getVersionNumber();
        console.log("Configuring Sentry (WebView) with app version: " + version);

        window.Sentry = require('@sentry/browser/dist');

        Sentry.init({
          dsn: 'https://977e321b83ec4e47b7d28ffcbdf0c6a1@sentry.io/1488321',
          release: version
        });
      }

      this.startNodeJsEngine();
    }, false);
  }

  async hasPermission() {
    return new Promise((resolve, reject) => {
      var permissions = cordova.plugins.permissions;

      return permissions.checkPermission(permissions.WRITE_EXTERNAL_STORAGE, (status) => {
        resolve(status.hasPermission);
      }, () => {
        reject("Failed to check permissions!");
      })
    });
  }

  onRequestPermissionClick() {
    this.permissionRequestTime = new Date();

    this.requestPermission().then((permissionsGranted) => { 

      if (permissionsGranted) {
        this.onPermissionGranted();
      } else {
        this.onPermissionDenied();
      }

    }, (error) =>  {
      console.log(error);
    });
  }

  onPermissionGranted() {
    console.log("Permission to access storage has been GRANTED!");
    this.getPermissionBox().dialog('close');
    uiHelper.showGlobalLoadingIndicator();

    this.initPersistenceAndStart();
  }

  onPermissionDenied() {
    console.log("Permission to access storage has been DENIED!");

    var noSystemPermissionsDialogShownTiming = 500;
    var timeSinceRequest = new Date() - this.permissionRequestTime;

    if (timeSinceRequest < noSystemPermissionsDialogShownTiming) {
      // If the request came back in a very short time we assume that the user permanently denied the permission
      // and show a corresponding message.

      var permanentPermissionDecisionInfoPart1 = i18n.t('cordova.permanent-permission-decision-part1');
      var permanentPermissionDecisionInfoPart2 = i18n.t('cordova.permanent-permission-decision-part2');

      $('#permission-decision').html(`
        ${permanentPermissionDecisionInfoPart1}
        <br>
        <br>
        ${permanentPermissionDecisionInfoPart2}
      `);

      $('#enable-access').html('');

    } else {

      var storagePermissionDenied = i18n.t('cordova.storage-permission-denied');
      $('#permission-decision').html(storagePermissionDenied);
    }
  }

  requestPermission() {
    // Note that the following code depends on having the cordova-plugin-android-permisssions available

    console.log("Getting permissions ...");

    return new Promise((resolve, reject) => {
      var permissions = cordova.plugins.permissions;

      return permissions.requestPermission(permissions.WRITE_EXTERNAL_STORAGE,
        (status) => { // success
          if ( status.hasPermission ) {
            resolve(true);
          } else {
            resolve(false);
          }
        },
        () => { // error
          reject("Failed to request permission to write on external storage");
        }
      );

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

  getPermissionBox() {
    return $('#permissions-box');
  }

  getPermissionInfoMessage() {
    var storageJustification = i18n.t('cordova.storage-justification');
    var enableAccessButtonLabel = i18n.t('cordova.enable-storage-access');

    var infoMessage = `
      <br>
      ${storageJustification}

      <p id='permission-decision' style='color: red;'></p>

      <p id='enable-access' style='text-align: center; margin-top: 2em; margin-bottom: 2em;'>

        <button id='request-write-permissions'
                class='fg-button ui-corner-all ui-state-default'
                style='height: 3em;'>

          ${enableAccessButtonLabel}

        </button>

      </p>
    `;

    return infoMessage;
  }

  showPermissionInfo() {
    console.log("Showing permissions info!");

    var infoMessage = this.getPermissionInfoMessage();
    this.getPermissionBox().find('#permissions-box-content').html(infoMessage);

    $('#request-write-permissions').click(() => {
      this.onRequestPermissionClick();
    });

    uiHelper.hideGlobalLoadingIndicator();

    var welcomeTitle = i18n.t("cordova.welcome-to-ezra-bible-app");

    this.getPermissionBox().dialog({
      title: welcomeTitle,
      width: 400,
      autoOpen: true,
      dialogClass: 'ezra-dialog dialog-without-close-button android-dialog-large-fontsize',
      modal: true,
      resizable: false
    });
  }

  async startNodeJsEngine() {
    var isDebug = await this.isDebug();

    console.log("Starting up nodejs engine!");
    nodejs.channel.setListener(this.mainProcessListener);

    nodejs.startWithScript(`

      const Main = require('main.js');

      global.main = new Main();
      main.init(${isDebug});

    `, async () => {

      uiHelper.updateLoadingSubtitle("Initializing i18n");

      window.ipcI18n = new IpcI18n();
      await startup.initI18N();

      this.hasPermission().then((result) => {
        if (result == true) {
          this.initPersistenceAndStart();
        } else {
          this.showPermissionInfo();
        }
      }, () => {
        console.log("Failed to check existing permissions ...");
      });
    });
  }

  async initPersistenceAndStart() {
    window.ipcGeneral = new IpcGeneral();

    uiHelper.updateLoadingSubtitle("Initializing SWORD");
    await ipcGeneral.initPersistentIpc();

    uiHelper.updateLoadingSubtitle("Initializing database");
    await ipcGeneral.initDatabase();

    await startup.initApplication();
  }

  mainProcessListener(message) {
    console.log(message);
  }

  toggleFullScreen() {
    // Note that the following code depends on having the cordova-plugin-fullscreen available

    if (this._isFullScreenMode) {
      this._isFullScreenMode = false;

      AndroidFullScreen.showSystemUI(() => {
        // console.log("Left fullscreen mode");
      }, () => {
        console.error("Could not leave immersive mode");
      });

    } else {
      this._isFullScreenMode = true;

      AndroidFullScreen.immersiveMode(() => {
        // console.log("Entered immersive / fullscreen mode");
      }, () => {
        console.error("Could not switch to immersive mode");
      });
    }
  }

  isFullScreen() {
    return this._isFullScreenMode;
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
