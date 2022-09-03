/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2022 Ezra Bible App Development Team <contact@ezrabibleapp.net>

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

const DROPBOX_TOKEN_SETTINGS_KEY = 'dropboxToken';
const Dropbox = require('dropbox');
const PlatformHelper = require('../../lib/platform_helper.js');
const platformHelper = new PlatformHelper();

let dbSyncDialogInitDone = false;

async function initDbSyncDialog() {
  if (dbSyncDialogInitDone) {
    return;
  }

  var dialogWidth = 450;
  var dialogHeight = 400;
  var draggable = true;
  var position = [55, 120];

  let dbSyncDialogOptions = uiHelper.getDialogOptions(dialogWidth, dialogHeight, draggable, position);
  dbSyncDialogOptions.title = i18n.t("dropbox.setup-db-sync");
  dbSyncDialogOptions.autoOpen = false;
  dbSyncDialogOptions.buttons = {};

  let dropboxTokenValue = await ipcSettings.get(DROPBOX_TOKEN_SETTINGS_KEY, "");
  $('#dropbox-token').val(dropboxTokenValue);

  dbSyncDialogOptions.buttons[i18n.t("general.save")] = {
    id: 'save-db-sync-config-button',
    text: i18n.t("general.save"),
    click: () => {
      $('#db-sync-box').dialog("close");
      this.saveDbSyncConfiguration();
    }
  };

  dbSyncDialogOptions.buttons[i18n.t("general.cancel")] = {
    id: 'cancel-db-sync-config-button',
    text: i18n.t("general.cancel"),
    click: () => {
      $('#db-sync-box').dialog("close");
    }
  };

  $('#link-dropbox-account').bind('click', () => {
    setupDropboxAuthentication();
  });

  $('#db-sync-box').dialog(dbSyncDialogOptions);
}

/**
 * This controller manages the settings for database synchronization. 
 * @module dbSyncController
 * @category Controller
 */

module.exports.showDbSyncConfigDialog = async function() {
  await initDbSyncDialog();

  $('#db-sync-box').dialog("open");
};

// Parses the url and gets the access token if it is in the urls hash
module.exports.getCodeFromUrl = function(url) {
  var code = url.replace('ezrabible://app?code=', '');
  return code;
};

// If the user was just redirected from authenticating, the urls hash will
// contain the access token.
module.exports.hasRedirectedFromAuth = function(url) {
  return !!this.getCodeFromUrl(url);
};

function setupDropboxAuthentication() {
  var REDIRECT_URI = 'ezrabible://app';
  var CLIENT_ID = 'ivkivdw70sfvwo2';
  var dbxAuth = new Dropbox.DropboxAuth({
    clientId: CLIENT_ID,
  });

  if (platformHelper.isCordova()) {
    // eslint-disable-next-line no-undef
    universalLinks.subscribe('launchedAppFromLink', (eventData) => {
      console.log('Launched from link: ' + eventData.url);

      if (this.hasRedirectedFromAuth(eventData.url)) {
        dbxAuth.setCodeVerifier(window.sessionStorage.getItem('codeVerifier'));
        dbxAuth.getAccessTokenFromCode(REDIRECT_URI, this.getCodeFromUrl(eventData.url))
          .then((response) => {

            // eslint-disable-next-line no-undef
            iziToast.success({
              title: i18n.t('dropbox.linking-msg-title'),
              message: i18n.t('dropbox.linking-success-msg'),
              position: 'topCenter',
              timeout: 5000
            });

            console.log("Saving Dropbox token!");
            return ipcSettings.set(DROPBOX_TOKEN_SETTINGS_KEY, response.result.access_token);

          }).catch((error) => {
            // eslint-disable-next-line no-undef
            iziToast.error({
              title: i18n.t('dropbox.linking-msg-title'),
              message: i18n.t('dropbox.linking-failed-msg'),
              position: 'topCenter',
              timeout: 5000
            });

            console.error(error);
          });
      }
    });
  }

  dbxAuth.getAuthenticationUrl(REDIRECT_URI, undefined, 'code', 'offline', undefined, undefined, true)
    .then(authUrl => {
      window.sessionStorage.clear();
      window.sessionStorage.setItem("codeVerifier", dbxAuth.codeVerifier);

      // Open the Dropbox authentication url in the system web browser
      window.open(authUrl, '_system');
    })
    .catch((error) => console.error(error));
}

module.exports.showSyncResultMessage = async function() {
  let lastDropboxSyncTime = '--';
  if (await ipcSettings.has('lastDropboxSyncTime')) {
    lastDropboxSyncTime = new Date(await ipcSettings.get('lastDropboxSyncTime'));
    lastDropboxSyncTime = lastDropboxSyncTime.toLocaleDateString() + ' / ' + lastDropboxSyncTime.toLocaleTimeString();
  }

  const lastDropboxSyncResult = await ipcSettings.get('lastDropboxSyncResult', '');

  if (lastDropboxSyncResult != "") {

    if (lastDropboxSyncResult == 'FAILED') {
      // eslint-disable-next-line no-undef
      iziToast.error({
        title: i18n.t('dropbox.sync-msg-title'),
        message: i18n.t('dropbox.sync-failed-msg', { date: lastDropboxSyncTime }),
        position: 'topCenter',
        timeout: 3000
      });
    } else {
      // eslint-disable-next-line no-undef
      iziToast.success({
        title: i18n.t('dropbox.sync-msg-title'),
        message: i18n.t('dropbox.sync-success-msg', { date: lastDropboxSyncTime }),
        position: 'topCenter',
        timeout: 5000
      });
    }
  }
};
