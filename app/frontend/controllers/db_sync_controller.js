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
const { html } = require('../helpers/ezra_helper.js');
const swordModuleHelper = require('../helpers/sword_module_helper.js');

const DROPBOX_CLIENT_ID = '6m7e5ri5udcbkp3';
const DROPBOX_TOKEN_SETTINGS_KEY = 'dropboxToken';
const DROPBOX_REFRESH_TOKEN_SETTINGS_KEY = 'dropboxRefreshToken';
const DROPBOX_LINK_STATUS_SETTINGS_KEY = 'dropboxLinkStatus';
const DROPBOX_ONLY_WIFI_SETTINGS_KEY = 'dropboxOnlyWifi';
const DROPBOX_SYNC_AFTER_CHANGES_KEY = 'dropboxSyncAfterChanges';
const DROPBOX_LAST_SYNC_RESULT_KEY = 'lastDropboxSyncResult';
const DROPBOX_LAST_SYNC_TIME_KEY = 'lastDropboxSyncTime';
const DROPBOX_FIRST_SYNC_DONE_KEY = 'firstDropboxSyncDone';
const DROPBOX_LAST_DOWNLOAD_TIME_KEY = 'lastDropboxDownloadTime';
const DROPBOX_LAST_UPLOAD_TIME_KEY = 'lastDropboxUploadTime';
const DROPBOX_SYNC_SWORD_CONFIG_KEY = 'dropboxSyncSwordConfig';

let dbSyncInitDone = false;
let dbSyncDropboxToken = null;
let dbSyncDropboxRefreshToken = null;
let dbSyncDropboxLinkStatus = null;
let dbSyncOnlyWifi = false;
let dbSyncAfterChanges = false;
let dbSyncSwordConfig = false;
let dbSyncFirstSyncDone = false;
let lastConnectionType = undefined;

let resetDropboxConfiguration = false;

let dbxAuth = getDropboxAuth();

module.exports.init = function() {
  eventController.subscribe('on-startup-completed', async () => {
    await syncSwordModuleConfig();
    await this.showModuleDiffDialog();
    await ipcNsi.persistLocalModulesData();
  });

  eventController.subscribeMultiple(['on-module-install-completed',
                                     'on-module-removal-completed'], async () => {
    await ipcNsi.persistLocalModulesData();
    await syncSwordModuleConfig();
  });

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
  dbSyncAfterChanges = await ipcSettings.get(DROPBOX_SYNC_AFTER_CHANGES_KEY, false);
  dbSyncSwordConfig = await ipcSettings.get(DROPBOX_SYNC_SWORD_CONFIG_KEY, false);
  dbSyncFirstSyncDone = await ipcSettings.get(DROPBOX_FIRST_SYNC_DONE_KEY, false);

  document.getElementById('only-sync-on-wifi').checked = dbSyncOnlyWifi;
  document.getElementById('sync-dropbox-after-changes').checked = dbSyncAfterChanges;
  document.getElementById('sync-dropbox-sword-config').checked = dbSyncSwordConfig;
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

  dbSyncOnlyWifi = document.getElementById('only-sync-on-wifi').checked;
  dbSyncAfterChanges = document.getElementById('sync-dropbox-after-changes').checked;
  dbSyncSwordConfig = document.getElementById('sync-dropbox-sword-config').checked;

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
  }

  await ipcSettings.set(DROPBOX_LINK_STATUS_SETTINGS_KEY, dbSyncDropboxLinkStatus);
  await ipcSettings.set(DROPBOX_ONLY_WIFI_SETTINGS_KEY, dbSyncOnlyWifi);
  await ipcSettings.set(DROPBOX_SYNC_AFTER_CHANGES_KEY, dbSyncAfterChanges);
  await ipcSettings.set(DROPBOX_SYNC_SWORD_CONFIG_KEY, dbSyncSwordConfig);

  if (dbSyncDropboxLinkStatus == 'LINKED' && !dbSyncFirstSyncDone) {
    await ipcDb.syncDropbox();

    if (dbSyncSwordConfig) {
      await ipcNsi.syncLocalModulesDataWithDropbox();
    }

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

async function syncSwordModuleConfig() {
  const dbSyncDropboxLinkStatus = await ipcSettings.get(DROPBOX_LINK_STATUS_SETTINGS_KEY, null);
  const dropboxSyncSwordConfig = await ipcSettings.get(DROPBOX_SYNC_SWORD_CONFIG_KEY, false);

  if (dbSyncDropboxLinkStatus == 'LINKED' && dropboxSyncSwordConfig) {
    console.log("Syncing SWORD modules configuration with Dropbox.");
    await ipcNsi.syncLocalModulesDataWithDropbox();
  }
}

async function getAllLocalModules() {
  let bibleModules = await ipcNsi.getAllLocalModules('BIBLE');
  let dictModules = await ipcNsi.getAllLocalModules('DICT');
  let commentaryModules = await ipcNsi.getAllLocalModules('COMMENTARY');

  if (bibleModules == null) bibleModules = [];
  if (dictModules == null) dictModules = [];
  if (commentaryModules == null) commentaryModules = [];

  let allModules = [...bibleModules, ...dictModules, ...commentaryModules];

  allModules = allModules.filter(function(module) {
    return module && module.repository !== '';
  });

  allModules.sort(swordModuleHelper.sortModules);

  return allModules;
}

function buildModuleDiff(persistedModules, currentModules) {
  let persistedNames = new Set();
  let currentNames = new Set();

  for (let module of persistedModules) {
    if (module != null && module.name != null) {
      persistedNames.add(module.name);
    }
  }

  for (let module of currentModules) {
    if (module != null && module.name != null) {
      currentNames.add(module.name);
    }
  }

  let modulesToInstall = [];
  let modulesToUninstall = [];

  for (let name of persistedNames) {
    if (!currentNames.has(name)) {
      let mod = persistedModules.find(m => m.name === name);
      if (mod != null) modulesToInstall.push(mod);
    }
  }

  for (let name of currentNames) {
    if (!persistedNames.has(name)) {
      let mod = currentModules.find(m => m.name === name);
      if (mod != null) modulesToUninstall.push(mod);
    }
  }

  modulesToInstall.sort(swordModuleHelper.sortModules);
  modulesToUninstall.sort(swordModuleHelper.sortModules);

  return { modulesToInstall, modulesToUninstall };
}

async function performModuleDiffSync(modulesToInstall, modulesToUninstall, dialogBox) {
  let installListBody = document.getElementById('module-diff-install-list-tbody');
  let uninstallListBody = document.getElementById('module-diff-uninstall-list-tbody');

  let installRows = installListBody != null ? installListBody.querySelectorAll('tr') : [];
  let uninstallRows = uninstallListBody != null ? uninstallListBody.querySelectorAll('tr') : [];

  function getStatusCellForRow(row) {
    return row.querySelector('.status');
  }

  function createSuccessIndicator() {
    let successIndicator = document.createElement('i');
    successIndicator.style.color = 'var(--checkmark-success-color)';
    successIndicator.classList.add('fas', 'fa-check', 'fa-lg');
    return successIndicator;
  }

  function createLoadingIndicator() {
    let loadingIndicator = document.createElement('loading-indicator');
    loadingIndicator.style.display = 'none';
    return loadingIndicator;
  }

  function ensureStatusCells(rows) {
    for (let i = 0; i < rows.length; i++) {
      let row = rows[i];
      let statusCell = getStatusCellForRow(row);

      if (!statusCell) {
        statusCell = document.createElement('td');
        statusCell.classList.add('status');
        statusCell.style.textAlign = 'center';
        row.appendChild(statusCell);
      }

      if (statusCell.childNodes.length === 0) {
        let loadingIndicator = createLoadingIndicator();
        statusCell.appendChild(loadingIndicator);
      }
    }
  }

  ensureStatusCells(installRows);
  ensureStatusCells(uninstallRows);

  // Install missing modules first
  for (let i = 0; i < modulesToInstall.length; i++) {
    let moduleToInstall = modulesToInstall[i];
    let row = Array.from(installRows).find(r => r.getAttribute('module-code') === moduleToInstall.name);

    if (row != null) {
      let statusCell = getStatusCellForRow(row);
      let loadingIndicator = statusCell.firstChild;

      if (loadingIndicator != null) {
        loadingIndicator.style.display = 'block';
      }

      await ipcNsi.installModule(moduleToInstall.name);

      if (loadingIndicator != null) {
        loadingIndicator.style.display = 'none';
      }

      statusCell.appendChild(createSuccessIndicator());
    } else {
      await ipcNsi.installModule(moduleToInstall.name);
    }
  }

  // Then uninstall modules that are not in persisted config
  for (let i = 0; i < modulesToUninstall.length; i++) {
    let moduleToUninstall = modulesToUninstall[i];
    let row = Array.from(uninstallRows).find(r => r.getAttribute('module-code') === moduleToUninstall.name);

    if (row != null) {
      let statusCell = getStatusCellForRow(row);
      let loadingIndicator = statusCell.firstChild;

      if (loadingIndicator != null) {
        loadingIndicator.style.display = 'block';
      }

      await ipcNsi.uninstallModule(moduleToUninstall.name);

      if (loadingIndicator != null) {
        loadingIndicator.style.display = 'none';
      }

      statusCell.appendChild(createSuccessIndicator());
    } else {
      await ipcNsi.uninstallModule(moduleToUninstall.name);
    }
  }

  // Refresh local module data and persist/sync to Dropbox
  swordModuleHelper.resetModuleCache();
  await ipcNsi.persistLocalModulesData();
  await ipcNsi.syncLocalModulesDataWithDropbox();

  let buttonSet = dialogBox.querySelector('.ui-dialog-buttonset');

  if (buttonSet != null) {
    let buttons = buttonSet.querySelectorAll('button');

    if (buttons.length > 1) {
      let cancelButton = buttons[1];
      cancelButton.firstChild.innerText = i18n.t('general.finish');
      cancelButton.classList.remove('ui-state-disabled');

      // After sync is finished, clicking the Finish button should close the dialog
      cancelButton.addEventListener('click', function() {
        let $dialogBox = $('#module-diff-dialog');
        if ($dialogBox.length > 0) {
          $dialogBox.dialog('destroy');
          $dialogBox.remove();
        }
      }, { once: true });
    }
  }

  let dialogCloseButton = dialogBox.querySelector('.ui-dialog-titlebar-close');
  if (dialogCloseButton != null) {
    dialogCloseButton.style.removeProperty('display');
  }
}

module.exports.showModuleDiffDialog = async function() {
  let persistedModules = await ipcNsi.getLocalModulesData();

  if (persistedModules == null) {
    return;
  }

  let currentModules = await getAllLocalModules();
  let { modulesToInstall, modulesToUninstall } = buildModuleDiff(persistedModules, currentModules);

  if (modulesToInstall.length === 0 && modulesToUninstall.length === 0) {
    return;
  }

  const dialogBoxTemplate = html`

  <link href="css/module_settings_assistant.css" media="screen" rel="stylesheet" type="text/css" />

  <div id="module-diff-dialog" class="module-settings-assistant">
    <div id="module-diff-dialog-content" class="container" style="padding-top: 0.5em">
      <div id="module-diff-step-1" class="module-settings-assistant-init">
        <section>
          <p i18n="[html]dropbox.module-sync-intro"></p>
        </section>

        <section class="module-settings-assistant-internet-usage">
          <p i18n="[html]module-assistant.internet-usage-note"></p>
        </section>

        <div class="module-assistant-type-buttons">
          <button id="sync-modules-button"
                  class="fg-button ui-corner-all ui-state-default"
                  i18n="dropbox.sync-modules"></button>
        </div>
      </div>
    </div>
  </div>
  `;

  const dialogBoxTemplateStep2 = html`
    <div id="module-diff-step-2">
      <p id="module-diff-header" style="margin-top: 1em; float: left; font-weight: bold; width: 100%;" i18n="dropbox.module-sync-details"></p>

      <div style="clear: both;"></div>

      <div id="module-diff-install-section" style="margin-top: 1em;">
        <p style="font-weight: bold;" i18n="dropbox.modules-to-install"></p>
        <table id="module-diff-install-list" style="clear: both;">
          <thead>
            <tr>
              <th i18n="general.module-name" style="text-align: left; min-width: 10em; padding-right: 0.5em;"></th>
              <th i18n="general.module-id" style="text-align: left; width: 6em; padding-right: 0.5em;"></th>
              <th i18n="module-assistant.repository_singular" style="text-align: left; width: 10em; padding-right: 0.5em;"></th>
              <th style="width: 5em;"></th>
            </tr>
          </thead>
          <tbody id="module-diff-install-list-tbody">
          </tbody>
        </table>
      </div>

      <div id="module-diff-uninstall-section" style="margin-top: 2em;">
        <p style="font-weight: bold;" i18n="dropbox.modules-to-uninstall"></p>
        <table id="module-diff-uninstall-list" style="clear: both;">
          <thead>
            <tr>
              <th i18n="general.module-name" style="text-align: left; min-width: 10em; padding-right: 0.5em;"></th>
              <th i18n="general.module-id" style="text-align: left; width: 6em; padding-right: 0.5em;"></th>
              <th i18n="module-assistant.repository_singular" style="text-align: left; width: 10em; padding-right: 0.5em;"></th>
              <th style="width: 5em;"></th>
            </tr>
          </thead>
          <tbody id="module-diff-uninstall-list-tbody">
          </tbody>
        </table>
      </div>
    </div>
  `;

  return new Promise((resolve) => {
    document.querySelector('#boxes').appendChild(dialogBoxTemplate.content);
    const $dialogBox = $('#module-diff-dialog');
    $dialogBox.localize();

    uiHelper.configureButtonStyles('#module-diff-step-1');

    const appContainerWidth = $(window).width() - 10;
    let dialogWidth = null;

    if (appContainerWidth < 900) {
      dialogWidth = appContainerWidth;
    } else {
      dialogWidth = 900;
    }

    let dialogHeight = $(window).height() * 0.8;

    let confirmed = false;
    const offsetLeft = ($(window).width() - dialogWidth) / 2;
    let fullscreen = platformHelper.isCordova();

    let dialogOptions = uiHelper.getDialogOptions(dialogWidth, dialogHeight, false, [offsetLeft, 80], false, fullscreen);
    dialogOptions.dialogClass = 'ezra-dialog module-diff-dialog';
    dialogOptions.title = i18n.t('dropbox.sync-modules-title');
    dialogOptions.draggable = true;
    dialogOptions.modal = true;
    dialogOptions.buttons = {};

    dialogOptions.close = () => {
      $dialogBox.dialog('destroy');
      $dialogBox.remove();
      resolve(confirmed);
    };

    Mousetrap.bind('esc', () => { $dialogBox.dialog('close'); });

    $dialogBox.dialog(dialogOptions);
    uiHelper.fixDialogCloseIconOnAndroid('module-diff-dialog');

    document.getElementById('sync-modules-button').addEventListener('click', () => {
      let dialogContent = document.getElementById('module-diff-dialog-content');
      dialogContent.innerHTML = dialogBoxTemplateStep2.innerHTML;
      $dialogBox.localize();

      let buttons = {};

      buttons[i18n.t('general.start')] = function(event) {
        if (event.target.closest('button').classList.contains('ui-state-disabled')) {
          return;
        }

        confirmed = true;

        let dialogElement = document.querySelector('.module-diff-dialog');
        let buttonSet = dialogElement.querySelector('.ui-dialog-buttonset');

        if (buttonSet != null) {
          let dialogButtons = buttonSet.querySelectorAll('button');
          let startButton = dialogButtons[0];
          let cancelButton = dialogButtons[1];

          startButton.classList.add('ui-state-disabled');
          cancelButton.classList.add('ui-state-disabled');
        }

        let dialogCloseButton = dialogElement.querySelector('.ui-dialog-titlebar-close');
        if (dialogCloseButton != null) {
          dialogCloseButton.style.display = 'none';
        }

        performModuleDiffSync(modulesToInstall, modulesToUninstall, dialogElement);
      };

      buttons[i18n.t('general.cancel')] = function() {
        if (!confirmed) {
          $dialogBox.dialog('destroy');
          $dialogBox.remove();
          resolve(confirmed);
        } else {
          // Sync already started and finished: close dialog on Finish
          $dialogBox.dialog('destroy');
          $dialogBox.remove();
          resolve(confirmed);
        }
      };

      $dialogBox.dialog('option', 'buttons', buttons);

      let installListBody = document.getElementById('module-diff-install-list-tbody');
      let uninstallListBody = document.getElementById('module-diff-uninstall-list-tbody');

      let installSection = document.getElementById('module-diff-install-section');
      let uninstallSection = document.getElementById('module-diff-uninstall-section');

      if (modulesToInstall.length === 0 && installSection != null) {
        installSection.style.display = 'none';
      }

      if (modulesToUninstall.length === 0 && uninstallSection != null) {
        uninstallSection.style.display = 'none';
      }

      modulesToInstall.forEach(function(module) {
        let row = document.createElement('tr');
        row.setAttribute('module-code', module.name);

        let nameCell = document.createElement('td');
        nameCell.style.paddingRight = '1em';
        nameCell.innerText = module.description != null ? module.description : module.name;

        let idCell = document.createElement('td');
        idCell.innerText = module.name;
        idCell.style.paddingRight = '1em';

        let repoCell = document.createElement('td');
        repoCell.innerText = module.repository;
        repoCell.style.paddingRight = '1em';

        let statusCell = document.createElement('td');
        statusCell.style.textAlign = 'center';
        statusCell.classList.add('status');

        row.appendChild(nameCell);
        row.appendChild(idCell);
        row.appendChild(repoCell);
        row.appendChild(statusCell);
        installListBody.appendChild(row);
      });

      modulesToUninstall.forEach(function(module) {
        let row = document.createElement('tr');
        row.setAttribute('module-code', module.name);

        let nameCell = document.createElement('td');
        nameCell.style.paddingRight = '1em';
        nameCell.innerText = module.description != null ? module.description : module.name;

        let idCell = document.createElement('td');
        idCell.innerText = module.name;
        idCell.style.paddingRight = '1em';

        let repoCell = document.createElement('td');
        repoCell.innerText = module.repository;
        repoCell.style.paddingRight = '1em';

        let statusCell = document.createElement('td');
        statusCell.style.textAlign = 'center';
        statusCell.classList.add('status');

        row.appendChild(nameCell);
        row.appendChild(idCell);
        row.appendChild(repoCell);
        row.appendChild(statusCell);
        uninstallListBody.appendChild(row);
      });
    });
  });
};
