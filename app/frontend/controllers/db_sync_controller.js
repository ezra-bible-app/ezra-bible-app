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

const DROPBOX_CLIENT_ID = 'omhgjqlxpfn2r8z';
const DROPBOX_TOKEN_SETTINGS_KEY = 'dropboxToken';
const DROPBOX_REFRESH_TOKEN_SETTINGS_KEY = 'dropboxRefreshToken';
const DROPBOX_LINK_STATUS_SETTINGS_KEY = 'dropboxLinkStatus';
const DROPBOX_FOLDER_SETTINGS_KEY = 'dropboxFolder';
const DROPBOX_ONLY_WIFI_SETTINGS_KEY = 'dropboxOnlyWifi';
const DROPBOX_SYNC_AFTER_CHANGES_KEY = 'dropboxSyncAfterChanges';

let dbSyncInitDone = false;
let dbSyncDropboxToken = null;
let dbSyncDropboxRefreshToken = null;
let dbSyncDropboxLinkStatus = null;
let dbSyncDropboxFolder = null;
let dbSyncOnlyWifi = false;
let dbSyncAfterChanges = false;

let dbxAuth = getDropboxAuth();

module.exports.init = function() {
  if (platformHelper.isElectron()) {
    require('electron').ipcRenderer.on('dropbox-synced', (event, message) => {
      module.exports.showSyncResultMessage();
    });
  } else if (platformHelper.isCordova()) {
    nodejs.channel.on('dropbox-synced', (message) => {
      module.exports.showSyncResultMessage();
    });

    const CONNECTION_MONITORING_CYCLE_MS = 10000;

    setInterval(() => {
      ipcGeneral.setConnectionType(navigator.connection.type);
    }, CONNECTION_MONITORING_CYCLE_MS);
  }
};

module.exports.showDbSyncConfigDialog = async function() {
  await initDbSync();

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
    let msgPosition = 'bottomRight';

    if (platformHelper.isCordova()) {
      msgPosition = 'topCenter';
    }

    if (lastDropboxSyncResult == 'FAILED') {
      // eslint-disable-next-line no-undef
      iziToast.error({
        title: i18n.t('dropbox.sync-msg-title'),
        message: i18n.t('dropbox.sync-failed-msg', { date: lastDropboxSyncTime }),
        position: msgPosition,
        timeout: 8000
      });
    } else {
      // eslint-disable-next-line no-undef
      iziToast.success({
        title: i18n.t('dropbox.sync-msg-title'),
        message: i18n.t('dropbox.sync-success-msg', { date: lastDropboxSyncTime }),
        position: msgPosition,
        timeout: 3000
      });
    }
  }
};

function getDropboxAuth() {
  let dbxAuth = new Dropbox.DropboxAuth({
    clientId: DROPBOX_CLIENT_ID,
  });

  return dbxAuth;
}

function initAuthCallbacks() {
  if (platformHelper.isCordova()) {

    // eslint-disable-next-line no-undef
    universalLinks.subscribe('launchedAppFromLink', (eventData) => {
      console.log('Got Dropbox auth callback with url: ' + eventData.url);
      handleRedirect(eventData.url);
    });

  } else if (platformHelper.isElectron()) {

    require('electron').ipcRenderer.on('dropbox-auth-callback', (event, url) => {
      console.log('Got Dropbox auth callback with url: ' + url);
      handleRedirect(url);
    });

  }
}

async function initDbSync() {
  dbSyncDropboxToken = await ipcSettings.get(DROPBOX_TOKEN_SETTINGS_KEY, "");
  dbSyncDropboxRefreshToken = await ipcSettings.get(DROPBOX_REFRESH_TOKEN_SETTINGS_KEY, "");
  dbSyncDropboxLinkStatus = await ipcSettings.get(DROPBOX_LINK_STATUS_SETTINGS_KEY, null);
  dbSyncDropboxFolder = await ipcSettings.get(DROPBOX_FOLDER_SETTINGS_KEY, 'ezra');
  dbSyncOnlyWifi = await ipcSettings.get(DROPBOX_ONLY_WIFI_SETTINGS_KEY, false);
  dbSyncAfterChanges = await ipcSettings.get(DROPBOX_SYNC_AFTER_CHANGES_KEY, false);

  $('#dropbox-sync-folder').val(dbSyncDropboxFolder);
  document.getElementById('only-sync-on-wifi').checked = dbSyncOnlyWifi;
  document.getElementById('sync-dropbox-after-changes').checked = dbSyncAfterChanges;
  updateDropboxLinkStatusLabel();

  if (dbSyncInitDone) {
    return;
  }

  initAuthCallbacks();

  var dialogWidth = 450;
  var dialogHeight = 500;
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
      handleDropboxConfigurationSave();
    }
  };

  dbSyncDialogOptions.buttons[i18n.t("general.cancel")] = {
    id: 'cancel-db-sync-config-button',
    text: i18n.t("general.cancel"),
    click: () => {
      $('#db-sync-box').dialog("close");
    }
  };

  $('#link-dropbox-account').bind('click', async () => {
    $('#dropbox-link-status').text();
    await setupDropboxAuthentication();
  });

  $('#db-sync-box').dialog(dbSyncDialogOptions);

  dbSyncInitDone = true;
}

async function handleDropboxConfigurationSave() {
  $('#db-sync-box').dialog("close");

  dbSyncDropboxFolder = $('#dropbox-sync-folder').val();
  dbSyncOnlyWifi = document.getElementById('only-sync-on-wifi').checked;
  dbSyncAfterChanges = document.getElementById('sync-dropbox-after-changes').checked;

  if (dbSyncDropboxLinkStatus == 'LINKED') {
    await ipcSettings.set(DROPBOX_TOKEN_SETTINGS_KEY, dbSyncDropboxToken);
    await ipcSettings.set(DROPBOX_REFRESH_TOKEN_SETTINGS_KEY, dbSyncDropboxRefreshToken);
  }

  await ipcSettings.set(DROPBOX_LINK_STATUS_SETTINGS_KEY, dbSyncDropboxLinkStatus);
  await ipcSettings.set(DROPBOX_FOLDER_SETTINGS_KEY, dbSyncDropboxFolder);
  await ipcSettings.set(DROPBOX_ONLY_WIFI_SETTINGS_KEY, dbSyncOnlyWifi);
  await ipcSettings.set(DROPBOX_SYNC_AFTER_CHANGES_KEY, dbSyncAfterChanges);
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
  let replacementString = null;

  if (platformHelper.isCordova()) {
    replacementString = 'ezrabible://app?code=';
  } else if (platformHelper.isElectron()) {
    replacementString = '/dropbox_auth?code=';
  }

  let code = url.replace(replacementString, '');
  return code;
}

// If the user was just redirected from authenticating, the urls hash will
// contain the access token.
function hasRedirectedFromAuth(url) {
  return !!getCodeFromUrl(url);
}

function getRedirectUri() {
  if (platformHelper.isCordova()) {
    return 'ezrabible://app';
  } else if (platformHelper.isElectron()) {
    return 'http://localhost:9999/dropbox_auth';
  }
}

function handleRedirect(url) {
  const REDIRECT_URI = getRedirectUri();

  if (hasRedirectedFromAuth(url)) {
    dbxAuth.setCodeVerifier(window.sessionStorage.getItem('codeVerifier'));

    dbxAuth.getAccessTokenFromCode(REDIRECT_URI, getCodeFromUrl(url))
      .then((response) => {
        dbSyncDropboxToken = response.result.access_token;
        dbSyncDropboxRefreshToken = response.result.refresh_token;
        dbSyncDropboxLinkStatus = 'LINKED';
        updateDropboxLinkStatusLabel();

        // This configuration will be permanently stored
        // once the user hits the save button of the Dropbox configuration dialog

      }).catch((error) => {
        dbSyncDropboxLinkStatus = 'FAILED';
        updateDropboxLinkStatusLabel();
        console.error(error);
      });
  }
}

async function setupDropboxAuthentication() {
  const REDIRECT_URI = getRedirectUri();

  console.log('Starting Dropbox authentication with this REDIRECT_URI: ' + REDIRECT_URI);

  if (platformHelper.isElectron()) {
    // On Electron the authentication code will come back through a local web server that we start here.
    // Once the user approves the Dropbox access, Dropbox will redirect the user to a web site served
    // by this local server. The code is then read in the backend (see ipc_general_handler.js) and
    // sent back via IPC on the channel dropbox-auth-callback, see the code in initAuthCallbacks().
    await ipcGeneral.startDropboxAuthServer();
  }

  dbxAuth.getAuthenticationUrl(REDIRECT_URI, undefined, 'code', 'offline', undefined, undefined, true)
    .then(authUrl => {
      window.sessionStorage.clear();

      // Relevant as part of a PKCE authentication flow (setting the Proof Key for Code Exchange)
      window.sessionStorage.setItem("codeVerifier", dbxAuth.codeVerifier);

      // Open the Dropbox authentication url in the system web browser.
      // The next step after this will be a redirect which will be handled by handleRedirect().
      let popup = window.open(authUrl, '_system');

      if (platformHelper.isElectron()) {
        let timer = setInterval(() => { 
          if(popup.closed) {
            clearInterval(timer);
            ipcGeneral.stopDropboxAuthServer();
          }
        }, 500);
      }
    })
    .catch((error) => console.error(error));
}
