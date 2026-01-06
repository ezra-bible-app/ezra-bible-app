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
const { html } = require('../helpers/ezra_helper.js');

const DROPBOX_CLIENT_ID = '6m7e5ri5udcbkp3';
const DROPBOX_TOKEN_SETTINGS_KEY = 'dropboxToken';
const DROPBOX_REFRESH_TOKEN_SETTINGS_KEY = 'dropboxRefreshToken';
const DROPBOX_LINK_STATUS_SETTINGS_KEY = 'dropboxLinkStatus';
const DROPBOX_ONLY_WIFI_SETTINGS_KEY = 'dropboxOnlyWifi';
const DROPBOX_SYNC_AFTER_CHANGES_KEY = 'dropboxSyncAfterChanges';
const DROPBOX_USE_CUSTOM_MODULE_REPO_SETTINGS_KEY = 'dropboxUseCustomModuleRepo';
const DROPBOX_CUSTOM_MODULE_REPO_SETTINGS_KEY = 'dropboxCustomModuleRepo';
const DROPBOX_CUSTOM_MODULE_REPO_VALIDATED_SETTINGS_KEY = 'dropboxCustomModuleRepoValidated';
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
let dbSyncUseCustomModuleRepo = false;
let dbSyncCustomModuleRepo = null;
let dbSyncFirstSyncDone = false;
let lastConnectionType = undefined;

let resetDropboxConfiguration = false;
let lastValidatedRepoPath = null;
let lastValidationResult = null;
let validationDebounceTimer = null;

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
  dbSyncUseCustomModuleRepo = await ipcSettings.get(DROPBOX_USE_CUSTOM_MODULE_REPO_SETTINGS_KEY, false);
  dbSyncCustomModuleRepo = await ipcSettings.get(DROPBOX_CUSTOM_MODULE_REPO_SETTINGS_KEY, "custom_module_repo");
  dbSyncFirstSyncDone = await ipcSettings.get(DROPBOX_FIRST_SYNC_DONE_KEY, false);

  document.getElementById('only-sync-on-wifi').checked = dbSyncOnlyWifi;
  document.getElementById('sync-dropbox-after-changes').checked = dbSyncAfterChanges;
  document.getElementById('use-custom-module-repo').checked = dbSyncUseCustomModuleRepo;
  document.getElementById('custom-module-repo-folder').value = dbSyncCustomModuleRepo
  document.getElementById('sync-dropbox-after-changes').checked = dbSyncAfterChanges;
  updateCustomModuleRepoVisibility();
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
  dbSyncDialogOptions.title = i18n.t("dropbox.setup-dropbox");
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

  $('#use-custom-module-repo').bind('change', () => {
    updateCustomModuleRepoVisibility();
  });

  $('#custom-module-repo-folder').bind('input', () => {
    // Clear validation cache when path changes
    lastValidatedRepoPath = null;
    lastValidationResult = null;
    hideValidationStatus();
    
    // Debounced validation on input
    clearTimeout(validationDebounceTimer);
    
    const useCustomModuleRepo = document.getElementById('use-custom-module-repo').checked;
    const customModuleRepo = document.getElementById('custom-module-repo-folder').value;
    
    if (useCustomModuleRepo && dbSyncDropboxLinkStatus == 'LINKED' && customModuleRepo && customModuleRepo.trim() !== '') {
      validationDebounceTimer = setTimeout(async () => {
        await validateRepoPath(customModuleRepo);
      }, 1000);
    }
  });

  $('#custom-module-repo-folder').bind('blur', async () => {
    // Clear any pending debounced validation
    clearTimeout(validationDebounceTimer);
    
    // Validate immediately on blur
    const useCustomModuleRepo = document.getElementById('use-custom-module-repo').checked;
    const customModuleRepo = document.getElementById('custom-module-repo-folder').value;
    
    if (useCustomModuleRepo && dbSyncDropboxLinkStatus == 'LINKED' && customModuleRepo && customModuleRepo.trim() !== '') {
      await validateRepoPath(customModuleRepo);
    }
  });

  $('#validate-custom-repo-button').bind('click', async () => {
    // Clear any pending debounced validation
    clearTimeout(validationDebounceTimer);
    
    // Trigger validation immediately
    const useCustomModuleRepo = document.getElementById('use-custom-module-repo').checked;
    const customModuleRepo = document.getElementById('custom-module-repo-folder').value;
    
    if (useCustomModuleRepo && dbSyncDropboxLinkStatus == 'LINKED' && customModuleRepo && customModuleRepo.trim() !== '') {
      await validateRepoPath(customModuleRepo);
    }
  });

  $('#db-sync-box').dialog(dbSyncDialogOptions);
  uiHelper.fixDialogCloseIconOnAndroid('db-sync-dialog');

  dbSyncInitDone = true;
}

function updateCustomModuleRepoVisibility() {
  const useCustomModuleRepo = document.getElementById('use-custom-module-repo').checked;
  const customModuleRepoSettings = document.getElementById('custom-module-repo-settings');
  
  if (useCustomModuleRepo) {
    customModuleRepoSettings.style.display = 'block';
  } else {
    customModuleRepoSettings.style.display = 'none';
    hideValidationStatus();
    
    // Enable save button when custom module repo is disabled (no validation required)
    const saveButton = document.getElementById('save-db-sync-config-button');
    if (saveButton) {
      saveButton.disabled = false;
      saveButton.classList.remove('ui-state-disabled');
    }
  }
}

function showValidationLoading() {
  document.getElementById('custom-repo-validation-loading').style.display = 'block';
  document.getElementById('custom-repo-validation-status').style.visibility = 'hidden';
  
  // Disable save button during validation
  const saveButton = document.getElementById('save-db-sync-config-button');
  if (saveButton) {
    saveButton.disabled = true;
    saveButton.classList.add('ui-state-disabled');
  }
}

function hideValidationLoading() {
  document.getElementById('custom-repo-validation-loading').style.display = 'none';
  
  // Re-enable save button after validation
  const saveButton = document.getElementById('save-db-sync-config-button');
  if (saveButton) {
    saveButton.disabled = false;
    saveButton.classList.remove('ui-state-disabled');
  }
}

function showValidationSuccess() {
  const statusDiv = document.getElementById('custom-repo-validation-status');
  const messageSpan = document.getElementById('custom-repo-validation-message');
  
  messageSpan.textContent = '✓ ' + i18n.t('dropbox.repo-validation-success');
  messageSpan.style.color = 'green';
  statusDiv.style.visibility = 'visible';
  
  // Enable save button on successful validation
  const saveButton = document.getElementById('save-db-sync-config-button');
  if (saveButton) {
    saveButton.disabled = false;
    saveButton.classList.remove('ui-state-disabled');
  }
}

function showValidationError(errorKey, errorParams = {}) {
  const statusDiv = document.getElementById('custom-repo-validation-status');
  const messageSpan = document.getElementById('custom-repo-validation-message');
  
  const errorMessage = i18n.t(errorKey, errorParams);
  messageSpan.textContent = '✗ ' + errorMessage;
  messageSpan.style.color = 'red';
  statusDiv.style.visibility = 'visible';
  
  // Disable save button on validation error
  const saveButton = document.getElementById('save-db-sync-config-button');
  if (saveButton) {
    saveButton.disabled = true;
    saveButton.classList.add('ui-state-disabled');
  }
}

function hideValidationStatus() {
  document.getElementById('custom-repo-validation-status').style.visibility = 'hidden';
  document.getElementById('custom-repo-validation-loading').style.display = 'none';
  
  // Disable save button when validation status is hidden (no validation yet)
  const saveButton = document.getElementById('save-db-sync-config-button');
  if (saveButton) {
    saveButton.disabled = true;
    saveButton.classList.add('ui-state-disabled');
  }
}

async function validateRepoPath(customModuleRepo) {
  // Check cache first
  if (lastValidatedRepoPath === customModuleRepo && lastValidationResult !== null) {
    // Use cached result
    if (lastValidationResult.valid) {
      showValidationSuccess();
    } else {
      showValidationError(lastValidationResult.errorKey, lastValidationResult.errorParams);
    }
    return lastValidationResult;
  }

  showValidationLoading();
  
  try {
    const validationResult = await ipcNsi.validateCustomModuleRepo(customModuleRepo);
    
    hideValidationLoading();
    
    if (!validationResult.valid) {
      showValidationError(validationResult.errorKey, validationResult.errorParams);
    } else {
      showValidationSuccess();
    }
    
    // Cache the validation result
    lastValidatedRepoPath = customModuleRepo;
    lastValidationResult = validationResult;
    
    return validationResult;
    
  } catch (error) {
    hideValidationLoading();
    const errorResult = { valid: false, errorKey: 'dropbox.repo-validation-error-unknown', errorParams: { error: error.message } };
    showValidationError(errorResult.errorKey, errorResult.errorParams);
    
    // Cache the error result
    lastValidatedRepoPath = customModuleRepo;
    lastValidationResult = errorResult;
    
    return errorResult;
  }
}

async function handleDropboxConfigurationSave() {
  const useCustomModuleRepo = document.getElementById('use-custom-module-repo').checked;
  const customModuleRepo = document.getElementById('custom-module-repo-folder').value;

  // Validate custom module repo if enabled
  if (useCustomModuleRepo && dbSyncDropboxLinkStatus == 'LINKED') {
    const validationResult = await validateRepoPath(customModuleRepo);
    
    if (!validationResult.valid) {
      return; // Don't close dialog, validation failed
    }
  }

  // Validation passed or not required, proceed with save
  $('#db-sync-box').dialog("close");

  dbSyncUseCustomModuleRepo = useCustomModuleRepo;
  dbSyncCustomModuleRepo = customModuleRepo;

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
  }

  await ipcSettings.set(DROPBOX_LINK_STATUS_SETTINGS_KEY, dbSyncDropboxLinkStatus);
  await ipcSettings.set(DROPBOX_ONLY_WIFI_SETTINGS_KEY, dbSyncOnlyWifi);
  await ipcSettings.set(DROPBOX_SYNC_AFTER_CHANGES_KEY, dbSyncAfterChanges);
  await ipcSettings.set(DROPBOX_USE_CUSTOM_MODULE_REPO_SETTINGS_KEY, dbSyncUseCustomModuleRepo);
  await ipcSettings.set(DROPBOX_CUSTOM_MODULE_REPO_SETTINGS_KEY, dbSyncCustomModuleRepo);
  
  // Only mark as validated if custom repo is enabled and validation passed
  if (dbSyncUseCustomModuleRepo && lastValidationResult && lastValidationResult.valid) {
    await ipcSettings.set(DROPBOX_CUSTOM_MODULE_REPO_VALIDATED_SETTINGS_KEY, true);
  } else {
    await ipcSettings.set(DROPBOX_CUSTOM_MODULE_REPO_VALIDATED_SETTINGS_KEY, false);
  }

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
module.exports.showDropboxZipInstallDialog = async function() {
  await initDbSync();

  // Check if Dropbox is linked
  if (!dbSyncDropboxLinkStatus || dbSyncDropboxLinkStatus !== 'LINKED') {
    // eslint-disable-next-line no-undef
    iziToast.error({
      title: i18n.t('dropbox.install-from-zip'),
      message: i18n.t('dropbox.dropbox-not-linked'),
      position: platformHelper.getIziPosition(),
      timeout: 7000
    });
    return;
  }

  // Create dialog HTML
  const dialogBoxTemplate = html`
  <div id="dropbox-zip-install-dialog" style="padding: 1em;">
    <p style="margin-top: 0;">${i18n.t('dropbox.install-from-zip-explanation')}</p>
    <div id="zip-file-list" style="max-height: 300px; overflow-y: auto; margin: 1em 0;">
      <div style="display: flex; align-items: center; justify-content: center; padding: 2em;">
        <p style="margin: 0 1em 0 0;">${i18n.t('dropbox.loading-zip-files')}</p>
        <loading-indicator></loading-indicator>
      </div>
    </div>
  </div>
  `;

  document.querySelector('#boxes').appendChild(dialogBoxTemplate.content);
  const $dialogBox = $('#dropbox-zip-install-dialog');

  const width = 600;
  const height = 500;

  let dialogOptions = uiHelper.getDialogOptions(width, height, true);
  dialogOptions.title = i18n.t('dropbox.install-from-zip');
  dialogOptions.dialogClass = 'ezra-dialog dropbox-zip-install-dialog';
  dialogOptions.close = () => {
    $dialogBox.dialog('destroy');
    $dialogBox.remove();
  };

  dialogOptions.buttons = {};
  dialogOptions.buttons[i18n.t('general.cancel')] = function() {
    $dialogBox.dialog('close');
  };
  dialogOptions.buttons[i18n.t('general.install')] = {
    id: 'install-zip-modules-button',
    text: i18n.t('general.install'),
    click: async () => {
      await installSelectedZipModules();
    }
  };

  $dialogBox.dialog(dialogOptions);
  uiHelper.fixDialogCloseIconOnAndroid('dropbox-zip-install-dialog');
  Mousetrap.bind('esc', () => { $dialogBox.dialog('close'); });

  // Load zip files from Dropbox
  await loadDropboxZipFiles();

  async function loadDropboxZipFiles() {
    try {
      const response = await ipcGeneral.dropboxListZipFiles();
      
      console.log('Received response:', response);
      
      const zipFileList = document.getElementById('zip-file-list');
      zipFileList.innerHTML = '';

      // Check if response indicates an error
      if (!response.success) {
        zipFileList.innerHTML = `
          <div style="padding: 2em; text-align: center;">
            <p style="color: #d00; margin-bottom: 1em;">${i18n.t('dropbox.error-loading-files')}</p>
            <p style="color: #666; font-size: 0.9em; margin-bottom: 1.5em;">${response.error}</p>
            <button id="retry-load-files">
              ${i18n.t('general.retry')}
            </button>
          </div>
        `;
        $('#install-zip-modules-button').button('disable');
        
        $('#retry-load-files').button().click(async () => {
          const zipFileList = document.getElementById('zip-file-list');
          zipFileList.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; padding: 2em;">
              <p style="margin: 0 1em 0 0;">${i18n.t('dropbox.loading-zip-files')}</p>
              <loading-indicator></loading-indicator>
            </div>
          `;
          await loadDropboxZipFiles();
        });
        return;
      }

      const zipFiles = response.files;
      if (!zipFiles || !Array.isArray(zipFiles) || zipFiles.length === 0) {
        zipFileList.innerHTML = `<p style="text-align: center; color: #888;">${i18n.t('dropbox.no-zip-files-found')}</p>`;
        $('#install-zip-modules-button').button('disable');
        return;
      }

      zipFiles.forEach((file) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'zip-file-item';
        fileItem.style.padding = '0.5em';
        fileItem.style.borderBottom = '1px solid #ccc';
        
        // Show relative path (remove /Apps/Ezra Bible App prefix and leading slash for display)
        let displayPath = file.path;
        if (displayPath.startsWith('/')) {
          displayPath = displayPath.substring(1);
        }
        
        fileItem.innerHTML = `
          <label style="cursor: pointer; display: flex; align-items: center;">
            <input type="checkbox" class="zip-file-checkbox" data-filepath="${file.path}" style="margin-right: 0.5em;">
            <span style="flex: 1;">${displayPath}</span>
            <span class="validation-status" style="margin-left: auto; font-size: 0.9em;"></span>
          </label>
        `;
        zipFileList.appendChild(fileItem);
      });

    } catch (error) {
      console.error('Error loading Dropbox zip files:', error);
      const zipFileList = document.getElementById('zip-file-list');
      zipFileList.innerHTML = `
        <div style="padding: 2em; text-align: center;">
          <p style="color: #d00; margin-bottom: 1em;">${i18n.t('dropbox.error-loading-files')}</p>
          <p style="color: #666; font-size: 0.9em; margin-bottom: 1.5em;">${error.message}</p>
          <button id="retry-load-files" class="ui-button ui-widget ui-corner-all" style="padding: 0.5em 1em;">
            ${i18n.t('general.retry')}
          </button>
        </div>
      `;
      $('#install-zip-modules-button').button('disable');
      
      // Add click handler for retry button
      document.getElementById('retry-load-files').addEventListener('click', async () => {
        const zipFileList = document.getElementById('zip-file-list');
        zipFileList.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: center; padding: 2em;">
            <p style="margin: 0 1em 0 0;">${i18n.t('dropbox.loading-zip-files')}</p>
            <loading-indicator></loading-indicator>
          </div>
        `;
        await loadDropboxZipFiles();
      });
    }
  }

  async function installSelectedZipModules() {
    const checkboxes = document.querySelectorAll('.zip-file-checkbox:checked');
    if (checkboxes.length === 0) {
      return;
    }

    const selectedFiles = Array.from(checkboxes).map(cb => cb.dataset.filepath);

    // Disable install button during installation, change cancel to close
    $('#install-zip-modules-button').button('disable');
    $dialogBox.dialog('option', 'buttons', [
      {
        text: i18n.t('general.finish'),
        click: function() {
          $(this).dialog('close');
        }
      }
    ]);

    // Show installation progress table
    const zipFileList = document.getElementById('zip-file-list');
    const originalContent = zipFileList.innerHTML;
    zipFileList.innerHTML = `
      <div style="padding: 1em;">
        <p style="margin-bottom: 1em;">${i18n.t('dropbox.installing-modules')}</p>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 2px solid #ccc;">
              <th style="text-align: left; padding: 0.5em;">Module</th>
              <th style="text-align: left; padding: 0.5em; width: 120px;">Status</th>
            </tr>
          </thead>
          <tbody id="installation-status-table">
          </tbody>
        </table>
      </div>
    `;

    let successCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    try {
      const statusTable = document.getElementById('installation-status-table');

      // Process each file
      for (const filepath of selectedFiles) {
        const displayPath = filepath.replace('/Apps/Ezra Bible App/', '').replace(/^\//, '');
        const moduleId = `module-${selectedFiles.indexOf(filepath)}`;
        
        // Add row to table with pending status
        const row = document.createElement('tr');
        row.id = moduleId;
        row.style.borderBottom = '1px solid #eee';
        row.innerHTML = `
          <td style="padding: 0.5em;">${displayPath}</td>
          <td style="padding: 0.5em;">
            <span style="display: flex; align-items: center;">
              <loading-indicator style="width: 16px; height: 16px;"></loading-indicator>
              <span style="margin-left: 0.5em;">Processing...</span>
            </span>
          </td>
        `;
        statusTable.appendChild(row);

        // Install the module
        const result = await ipcGeneral.dropboxInstallZipModule(filepath);

        // Update row with result
        const statusCell = row.querySelector('td:last-child');
        if (result.success) {
          successCount++;
          statusCell.innerHTML = '<span style="color: green;">✓ Installed</span>';
        } else if (result.alreadyInstalled) {
          skippedCount++;
          statusCell.innerHTML = '<span style="color: #888;">⊘ Already installed</span>';
        } else {
          failedCount++;
          const errorMsg = result.error || 'Unknown error';
          statusCell.innerHTML = `<span style="color: red;">✗ Failed</span>`;
          statusCell.title = errorMsg;
        }
      }

      // Add summary row
      const summaryRow = document.createElement('tr');
      summaryRow.style.borderTop = '2px solid #ccc';
      summaryRow.style.fontWeight = 'bold';
      summaryRow.innerHTML = `
        <td style="padding: 1em 0.5em;">Summary</td>
        <td style="padding: 1em 0.5em;">
          <div style="font-size: 0.9em;">
            ${successCount > 0 ? `<div style="color: green;">${successCount} installed</div>` : ''}
            ${skippedCount > 0 ? `<div style="color: #888;">${skippedCount} skipped</div>` : ''}
            ${failedCount > 0 ? `<div style="color: red;">${failedCount} failed</div>` : ''}
          </div>
        </td>
      `;
      statusTable.appendChild(summaryRow);

      // Refresh module list if any modules were installed
      if (successCount > 0) {
        eventController.publishAsync('on-locale-changed');
      }

    } catch (error) {
      console.error('Error installing zip modules:', error);
      
      zipFileList.innerHTML = originalContent;
      
      // eslint-disable-next-line no-undef
      iziToast.error({
        title: i18n.t('dropbox.install-from-zip'),
        message: error.message || 'Installation failed',
        position: platformHelper.getIziPosition(),
        timeout: 7000
      });

      // Re-enable buttons
      $('#install-zip-modules-button').button('enable');
      $('.ui-dialog-buttonpane button:contains("Cancel")').button('enable');
    }
  }
};
