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


/**
 * This controller manages the settings for database synchronization. 
 * @module dbSyncController
 * @category Controller
 */

const Dropbox = require('dropbox');
const PlatformHelper = require('../../lib/platform_helper.js');
const platformHelper = new PlatformHelper();

const DROPBOX_TOKEN_SETTINGS_KEY = 'dropboxToken';
const DROPBOX_LINK_STATUS_SETTINGS_KEY = 'dropboxLinkStatus';
const DROPBOX_FOLDER_SETTINGS_KEY = 'dropboxFolder';
const DROPBOX_ONLY_WIFI_SETTINGS_KEY = 'dropboxOnlyWifi';

let dbSyncInitDone = false;
let dbSyncDropboxToken = null;
let dbSyncDropboxLinkStatus = null;
let dbSyncDropboxFolder = null;
let dbSyncOnlyWifi = false;

module.exports.showDbSyncConfigDialog = async function() {
  await initDbSyncDialog();

  $('#db-sync-box').dialog("open");
};

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

async function initDbSyncDialog() {
  dbSyncDropboxToken = await ipcSettings.get(DROPBOX_TOKEN_SETTINGS_KEY, "");
  dbSyncDropboxLinkStatus = await ipcSettings.get(DROPBOX_LINK_STATUS_SETTINGS_KEY, null);
  dbSyncDropboxFolder = await ipcSettings.get(DROPBOX_FOLDER_SETTINGS_KEY, 'ezra');
  dbSyncOnlyWifi = await ipcSettings.get(DROPBOX_ONLY_WIFI_SETTINGS_KEY, false);

  $('#dropbox-sync-folder').val(dbSyncDropboxFolder);
  document.getElementById('only-sync-on-wifi').checked = dbSyncOnlyWifi;
  updateDropboxLinkStatusLabel();

  if (dbSyncInitDone) {
    return;
  }

  var dialogWidth = 450;
  var dialogHeight = 480;
  var draggable = true;
  var position = [55, 120];

  let dbSyncDialogOptions = uiHelper.getDialogOptions(dialogWidth, dialogHeight, draggable, position);
  dbSyncDialogOptions.title = i18n.t("dropbox.setup-db-sync");
  dbSyncDialogOptions.autoOpen = false;
  dbSyncDialogOptions.buttons = {};

  dbSyncDialogOptions.buttons[i18n.t("general.save")] = {
    id: 'save-db-sync-config-button',
    text: i18n.t("general.save"),
    click: async () => {
      $('#db-sync-box').dialog("close");

      if (dbSyncDropboxLinkStatus == 'LINKED') {
        await ipcSettings.set(DROPBOX_TOKEN_SETTINGS_KEY, dbSyncDropboxToken);
      }

      dbSyncDropboxFolder = $('#dropbox-sync-folder').val();
      dbSyncOnlyWifi = document.getElementById('only-sync-on-wifi').checked;

      await ipcSettings.set(DROPBOX_LINK_STATUS_SETTINGS_KEY, dbSyncDropboxLinkStatus);
      await ipcSettings.set(DROPBOX_FOLDER_SETTINGS_KEY, dbSyncDropboxFolder);
      await ipcSettings.set(DROPBOX_ONLY_WIFI_SETTINGS_KEY, dbSyncOnlyWifi);
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
    $('#dropbox-link-status').text();
    setupDropboxAuthentication();
  });

  $('#db-sync-box').dialog(dbSyncDialogOptions);

  dbSyncInitDone = true;
}

function updateDropboxLinkStatusLabel() {
  if (dbSyncDropboxLinkStatus == 'LINKED') {
    $('#dropbox-link-status').text(i18n.t('dropbox.dropbox-link-status-linked'));
    $('#dropbox-link-status').addClass('success');
    $('#dropbox-link-status').removeClass('failed');

  } else if (dbSyncDropboxLinkStatus == 'FAILED') {
    $('#dropbox-link-status').text(i18n.t('dropbox.dropbox-link-status-linking-failed'));
    $('#dropbox-link-status').addClass('failed');
    $('#dropbox-link-status').removeClass('success');

  } else if (dbSyncDropboxLinkStatus === null) {
    $('#dropbox-link-status').text(i18n.t('dropbox.dropbox-link-status-not-linked'));
  }
}

// Parses the url and gets the access token if it is in the urls hash
function getCodeFromUrl(url) {
  var code = url.replace('ezrabible://app?code=', '');
  return code;
}

// If the user was just redirected from authenticating, the urls hash will
// contain the access token.
function hasRedirectedFromAuth(url) {
  return !!getCodeFromUrl(url);
}

function setupDropboxAuthentication() {
  const REDIRECT_URI = 'ezrabible://app';
  const CLIENT_ID = 'ivkivdw70sfvwo2';

  let dbxAuth = new Dropbox.DropboxAuth({
    clientId: CLIENT_ID,
  });

  if (platformHelper.isCordova()) {
    // eslint-disable-next-line no-undef
    universalLinks.subscribe('launchedAppFromLink', (eventData) => {
      console.log('Launched from link: ' + eventData.url);

      if (hasRedirectedFromAuth(eventData.url)) {
        dbxAuth.setCodeVerifier(window.sessionStorage.getItem('codeVerifier'));
        dbxAuth.getAccessTokenFromCode(REDIRECT_URI, getCodeFromUrl(eventData.url))
          .then((response) => {
            dbSyncDropboxToken = response.result.access_token;
            dbSyncDropboxLinkStatus = 'LINKED';
            updateDropboxLinkStatusLabel();

          }).catch((error) => {
            dbSyncDropboxLinkStatus = 'FAILED';
            updateDropboxLinkStatusLabel();
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
