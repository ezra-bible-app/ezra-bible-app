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


/**
 * This controller manages the settings for database synchronization. 
 * @module dbSyncController
 * @category Controller
 */

const Mousetrap = require('mousetrap');
const Dropbox = require('dropbox');
const PlatformHelper = require('../../lib/platform_helper.js');
const platformHelper = new PlatformHelper();
const eventController = require('./event_controller.js');

const DROPBOX_CLIENT_ID = '6m7e5ri5udcbkp3';
const DROPBOX_TOKEN_SETTINGS_KEY = 'dropboxToken';
const DROPBOX_REFRESH_TOKEN_SETTINGS_KEY = 'dropboxRefreshToken';
const DROPBOX_LINK_STATUS_SETTINGS_KEY = 'dropboxLinkStatus';
const DROPBOX_ONLY_WIFI_SETTINGS_KEY = 'dropboxOnlyWifi';
const DROPBOX_SYNC_AFTER_CHANGES_KEY = 'dropboxSyncAfterChanges';
const DROPBOX_CUSTOM_MODULE_REPO_SETTINGS_KEY = 'dropboxCustomModuleRepo';
const DROPBOX_LAST_SYNC_RESULT_KEY = 'lastDropboxSyncResult';
const DROPBOX_LAST_SYNC_TIME_KEY = 'lastDropboxSyncTime';
const DROPBOX_FIRST_SYNC_DONE_KEY = 'firstDropboxSyncDone';
const DROPBOX_LAST_DOWNLOAD_TIME_KEY = 'lastDropboxDownloadTime';
const DROPBOX_LAST_UPLOAD_TIME_KEY = 'lastDropboxUploadTime';

let dbSyncInitDone = false;
let dbSyncDropboxToken = null;
let dbSyncDropboxRefreshToken = null;
let dbSyncDropboxLinkStatus = null;
let dbSyncOnlyWifi = false;
let dbSyncAfterChanges = false;
let dbSyncCustomModuleRepo = null;
let dbSyncFirstSyncDone = false;
let lastConnectionType = undefined;

let resetDropboxConfiguration = false;

let dbxAuth = getDropboxAuth();

module.exports.init = function() {
  if (platformHelper.isElectron()) {

    require('electron').ipcRenderer.on('dropbox-synced', () => {
      module.exports.showSyncResultMessage();
    });

    require('electron').ipcRenderer.on('database-updated', () => {
      eventController.publishAsync('on-db-refresh');
    });

  } else if (platformHelper.isCordova()) {

    // eslint-disable-next-line no-undef
    nodejs.channel.on('dropbox-synced', () => {
      module.exports.showSyncResultMessage();
    });

    nodejs.channel.on('database-updated', () => {
      eventController.publishAsync('on-db-refresh');
    });

    const CONNECTION_MONITORING_CYCLE_MS = 5000;

    setInterval(() => {

      if (dbSyncOnlyWifi &&
          lastConnectionType !== undefined &&
          lastConnectionType != 'wifi' &&
          navigator.connection.type == 'wifi') {

        ipcDb.syncDropbox();
      }

      ipcGeneral.setConnectionType(navigator.connection.type);
      lastConnectionType = navigator.connection.type;

    }, CONNECTION_MONITORING_CYCLE_MS);
  }
};

module.exports.showDbSyncConfigDialog = async function() {
  await initDbSync();

  Mousetrap.bind('esc', () => { $('#db-sync-box').dialog("close"); });
  $('#db-sync-box').dialog("open");
};

module.exports.showSyncResultMessage = async function() {
  let onlyWifi = await ipcSettings.get(DROPBOX_ONLY_WIFI_SETTINGS_KEY, false);
  if (onlyWifi && navigator.connection.type != 'wifi') {
    // We return directly and do not show any sync message if the only WiFi option is enabled and we are not on WiFi.
    return;
  }

  let lastDropboxSyncTime = '--';
  if (await ipcSettings.has(DROPBOX_LAST_SYNC_TIME_KEY)) {
    lastDropboxSyncTime = new Date(await ipcSettings.get(DROPBOX_LAST_SYNC_TIME_KEY));
    lastDropboxSyncTime = lastDropboxSyncTime.toLocaleDateString() + ' / ' + lastDropboxSyncTime.toLocaleTimeString();
  }

  const lastDropboxSyncResult = await ipcSettings.get(DROPBOX_LAST_SYNC_RESULT_KEY, '');
  console.log(`Last Dropbox sync result: ${lastDropboxSyncResult}`);

  if (lastDropboxSyncResult != null && lastDropboxSyncResult != "" && lastDropboxSyncResult != "NONE") {
    let msgPosition = platformHelper.getIziPosition();

    if (lastDropboxSyncResult.indexOf('FAILED') != -1) {
      // eslint-disable-next-line no-undef
      iziToast.error({
        title: i18n.t('dropbox.sync-msg-title'),
        message: i18n.t('dropbox.sync-failed-msg', { date: lastDropboxSyncTime, syncResult: lastDropboxSyncResult }),
        position: msgPosition,
        timeout: 10000
      });
    } else {
      // eslint-disable-next-line no-undef
      iziToast.success({
        title: i18n.t('dropbox.sync-msg-title'),
        message: i18n.t('dropbox.sync-success-msg', { date: lastDropboxSyncTime }),
        position: msgPosition,
        timeout: 5000
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
      //console.log('Got Dropbox auth callback with url: ' + eventData.url);
      handleRedirect(eventData.url);
    });

  } else if (platformHelper.isElectron()) {

    require('electron').ipcRenderer.on('dropbox-auth-callback', (event, url) => {
      //console.log('Got Dropbox auth callback with url: ' + url);
      handleRedirect(url);
    });

  }
}

async function initDbSync() {
  dbSyncDropboxToken = await ipcSettings.get(DROPBOX_TOKEN_SETTINGS_KEY, "");
  dbSyncDropboxRefreshToken = await ipcSettings.get(DROPBOX_REFRESH_TOKEN_SETTINGS_KEY, "");
  dbSyncDropboxLinkStatus = await ipcSettings.get(DROPBOX_LINK_STATUS_SETTINGS_KEY, null);
  dbSyncOnlyWifi = await ipcSettings.get(DROPBOX_ONLY_WIFI_SETTINGS_KEY, false);
  dbSyncCustomModuleRepo = await ipcSettings.get(DROPBOX_CUSTOM_MODULE_REPO_SETTINGS_KEY, "custom_module_repo");
  dbSyncFirstSyncDone = await ipcSettings.get(DROPBOX_FIRST_SYNC_DONE_KEY, false);

  document.getElementById('only-sync-on-wifi').checked = dbSyncOnlyWifi;
  document.getElementById('sync-dropbox-after-changes').checked = dbSyncAfterChanges;
  document.getElementById('custom-module-repo-folder').value = dbSyncCustomModuleRepo
  document.getElementById('sync-dropbox-after-changes').checked = dbSyncAfterChanges;
  updateDropboxLinkStatusLabel();

  if (dbSyncInitDone) {
    return;
  }

  initAuthCallbacks();

  var dialogWidth = 500;
  var dialogHeight = 600;
  var draggable = true;
  var position = [55, 120];

  let dbSyncDialogOptions = uiHelper.getDialogOptions(dialogWidth, dialogHeight, draggable, position);
  dbSyncDialogOptions.title = i18n.t("dropbox.setup-db-sync");
  dbSyncDialogOptions.dialogClass = 'ezra-dialog db-sync-dialog';
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

  $('#reset-dropbox-account-link').bind('click', async () => {
    resetDropboxConfiguration = true;
    updateDropboxLinkStatusLabel(true);
  });

  $('#db-sync-box').dialog(dbSyncDialogOptions);
  uiHelper.fixDialogCloseIconOnAndroid('db-sync-dialog');

  dbSyncInitDone = true;
}

async function handleDropboxConfigurationSave() {
  $('#db-sync-box').dialog("close");

  dbSyncCustomModuleRepo = document.getElementById('custom-module-repo-folder').value;

  if (!dbSyncCustomModuleRepo) {
    dbSyncCustomModuleRepo = "custom_module_repo";
  }
  dbSyncOnlyWifi = document.getElementById('only-sync-on-wifi').checked;
  dbSyncAfterChanges = document.getElementById('sync-dropbox-after-changes').checked;

  if (resetDropboxConfiguration) {
    dbSyncDropboxToken = null;
    dbSyncDropboxRefreshToken = null;
    dbSyncDropboxLinkStatus = null;

    await ipcSettings.delete(DROPBOX_LAST_SYNC_RESULT_KEY);
    await ipcSettings.delete(DROPBOX_LAST_SYNC_TIME_KEY);
    await ipcSettings.delete(DROPBOX_LAST_DOWNLOAD_TIME_KEY);
    await ipcSettings.delete(DROPBOX_LAST_UPLOAD_TIME_KEY);

    await ipcSettings.set(DROPBOX_FIRST_SYNC_DONE_KEY, false);
  }

  if (dbSyncDropboxLinkStatus == 'LINKED' || resetDropboxConfiguration == true) {
    await ipcSettings.set(DROPBOX_TOKEN_SETTINGS_KEY, dbSyncDropboxToken);
    await ipcSettings.set(DROPBOX_REFRESH_TOKEN_SETTINGS_KEY, dbSyncDropboxRefreshToken);
  await ipcSettings.set(DROPBOX_CUSTOM_MODULE_REPO_SETTINGS_KEY, dbSyncCustomModuleRepo);
  }

  await ipcSettings.set(DROPBOX_LINK_STATUS_SETTINGS_KEY, dbSyncDropboxLinkStatus);
  await ipcSettings.set(DROPBOX_ONLY_WIFI_SETTINGS_KEY, dbSyncOnlyWifi);
  await ipcSettings.set(DROPBOX_SYNC_AFTER_CHANGES_KEY, dbSyncAfterChanges);

  if (dbSyncDropboxLinkStatus == 'LINKED' && !dbSyncFirstSyncDone) {
    await ipcDb.syncDropbox();
    await eventController.publishAsync('on-db-refresh');
    await module.exports.showSyncResultMessage();
  }

  resetDropboxConfiguration = false;
}

function updateDropboxLinkStatusLabel(resetLink=false) {
  if (dbSyncDropboxLinkStatus == 'LINKED' && !resetLink) {
    $('#dropbox-link-status').attr('i18n', 'dropbox.dropbox-link-status-linked');
    $('#dropbox-link-status').text(i18n.t('dropbox.dropbox-link-status-linked'));
    $('#dropbox-link-status').addClass('success');
    $('#dropbox-link-status').removeClass('failed');

  } else if (dbSyncDropboxLinkStatus == 'FAILED' && !resetLink) {
    $('#dropbox-link-status').attr('i18n', 'dropbox.dropbox-link-status-linking-failed');
    $('#dropbox-link-status').text(i18n.t('dropbox.dropbox-link-status-linking-failed'));
    $('#dropbox-link-status').addClass('failed');
    $('#dropbox-link-status').removeClass('success');

  } else if (dbSyncDropboxLinkStatus === null || resetLink) {
    $('#dropbox-link-status').attr('i18n', 'dropbox.dropbox-link-status-not-linked');
    $('#dropbox-link-status').text(i18n.t('dropbox.dropbox-link-status-not-linked'));
    $('#dropbox-link-status').removeClass('success');
    $('#dropbox-link-status').removeClass('failed');
  }
}

// Parses the url and gets the access token if it is in the urls hash
function getCodeFromUrl(url) {
  const replacementRegex = /ezrabible.*code=/;
  let code = url.replace(replacementRegex, '');
  return code;
}

// If the user was just redirected from authenticating, the urls hash will
// contain the access token.
function hasRedirectedFromAuth(url) {
  return !!getCodeFromUrl(url);
}

function getRedirectUri() {
  return 'ezrabible://app';
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

  //console.log('Starting Dropbox authentication with this REDIRECT_URI: ' + REDIRECT_URI);

  dbxAuth.getAuthenticationUrl(REDIRECT_URI, undefined, 'code', 'offline', undefined, undefined, true)
    .then(authUrl => {
      window.sessionStorage.clear();

      // Relevant as part of a PKCE authentication flow (setting the Proof Key for Code Exchange)
      window.sessionStorage.setItem("codeVerifier", dbxAuth.codeVerifier);

      // Open the Dropbox authentication url in the system web browser.
      // The next step after this will be a redirect which will be handled by handleRedirect().
      uiHelper.openLinkInBrowser(authUrl);
    })
    .catch((error) => console.error(error));
}
