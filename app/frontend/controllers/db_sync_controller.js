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
const DROPBOX_ENABLE_BACKGROUND_SYNC_KEY = 'dropboxEnableBackgroundSync';
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
let dbSyncEnableBackgroundSync = true;
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

module.exports.isInitDone = function() {
  return dbSyncInitDone;
};

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

module.exports.isDropboxLinked = async function() {
  const linkStatus = await ipcSettings.get(DROPBOX_LINK_STATUS_SETTINGS_KEY, null);
  return linkStatus === 'LINKED';
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
  // Reset the resetDropboxConfiguration flag to ensure clean state when dialog is opened
  // This handles the case where the user clicked Reset but then cancelled the dialog
  resetDropboxConfiguration = false;

  dbSyncDropboxToken = await ipcSettings.get(DROPBOX_TOKEN_SETTINGS_KEY, "");
  dbSyncDropboxRefreshToken = await ipcSettings.get(DROPBOX_REFRESH_TOKEN_SETTINGS_KEY, "");
  dbSyncDropboxLinkStatus = await ipcSettings.get(DROPBOX_LINK_STATUS_SETTINGS_KEY, null);
  dbSyncOnlyWifi = await ipcSettings.get(DROPBOX_ONLY_WIFI_SETTINGS_KEY, false);
  dbSyncEnableBackgroundSync = await ipcSettings.get(DROPBOX_ENABLE_BACKGROUND_SYNC_KEY, true);
  dbSyncUseCustomModuleRepo = await ipcSettings.get(DROPBOX_USE_CUSTOM_MODULE_REPO_SETTINGS_KEY, false);
  dbSyncCustomModuleRepo = await ipcSettings.get(DROPBOX_CUSTOM_MODULE_REPO_SETTINGS_KEY, "custom_module_repo");
  dbSyncFirstSyncDone = await ipcSettings.get(DROPBOX_FIRST_SYNC_DONE_KEY, false);

  document.getElementById('only-sync-on-wifi').checked = dbSyncOnlyWifi;
  document.getElementById('database-sync').checked = dbSyncEnableBackgroundSync;
  document.getElementById('sync-dropbox-after-changes').checked = dbSyncAfterChanges;
  document.getElementById('use-custom-module-repo').checked = dbSyncUseCustomModuleRepo;
  document.getElementById('custom-module-repo-folder').value = dbSyncCustomModuleRepo
  document.getElementById('sync-dropbox-after-changes').checked = dbSyncAfterChanges;
  updateCustomModuleRepoVisibility();
  updateDropboxLinkStatusLabel();
  updateDropboxOptionsState();

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
    
    // Disable custom module repo when link is reset
    document.getElementById('use-custom-module-repo').checked = false;
    updateCustomModuleRepoVisibility();
    updateDropboxOptionsState();
    
    // Clear validation state
    lastValidatedRepoPath = null;
    lastValidationResult = null;
    clearTimeout(validationDebounceTimer);
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
    
    // Don't validate if Dropbox link is being reset
    if (!resetDropboxConfiguration && useCustomModuleRepo && dbSyncDropboxLinkStatus == 'LINKED' && customModuleRepo && customModuleRepo.trim() !== '') {
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
    
    // Don't validate if Dropbox link is being reset
    if (!resetDropboxConfiguration && useCustomModuleRepo && dbSyncDropboxLinkStatus == 'LINKED' && customModuleRepo && customModuleRepo.trim() !== '') {
      await validateRepoPath(customModuleRepo);
    }
  });

  $('#validate-custom-repo-button').bind('click', async () => {
    // Clear any pending debounced validation
    clearTimeout(validationDebounceTimer);
    
    // Trigger validation immediately
    const useCustomModuleRepo = document.getElementById('use-custom-module-repo').checked;
    const customModuleRepo = document.getElementById('custom-module-repo-folder').value;
    
    // Don't validate if Dropbox link is being reset
    if (!resetDropboxConfiguration && useCustomModuleRepo && dbSyncDropboxLinkStatus == 'LINKED' && customModuleRepo && customModuleRepo.trim() !== '') {
      await validateRepoPath(customModuleRepo);
    }
  });

  $('#db-sync-box').dialog(dbSyncDialogOptions);
  uiHelper.fixDialogCloseIconOnAndroid('db-sync-dialog');

  dbSyncInitDone = true;
}

function updateDropboxOptionsState() {
  const isLinked = dbSyncDropboxLinkStatus == 'LINKED' && !resetDropboxConfiguration;
  
  // List of all checkbox IDs that should be disabled when Dropbox is not linked
  const checkboxIds = [
    'database-sync',
    'sync-dropbox-after-changes',
    'only-sync-on-wifi',
    'use-custom-module-repo'
  ];
  
  checkboxIds.forEach(id => {
    const checkbox = document.getElementById(id);
    if (checkbox) {
      checkbox.disabled = !isLinked;
      
      // Toggle disabled-option class on parent element for visual feedback
      const parentDiv = checkbox.parentElement;
      if (parentDiv) {
        if (!isLinked) {
          parentDiv.classList.add('disabled-option');
        } else {
          parentDiv.classList.remove('disabled-option');
        }
      }
    }
  });
  
  // Handle custom module repo specific elements
  const customRepoFolder = document.getElementById('custom-module-repo-folder');
  const validateButton = document.getElementById('validate-custom-repo-button');
  
  if (customRepoFolder) {
    customRepoFolder.disabled = !isLinked;
  }
  
  if (validateButton) {
    validateButton.disabled = !isLinked;
    if (!isLinked) {
      validateButton.classList.add('ui-state-disabled');
    } else {
      validateButton.classList.remove('ui-state-disabled');
    }
  }
  
  // If Dropbox is not linked, uncheck the custom module repo checkbox and hide settings
  const useCustomModuleRepoCheckbox = document.getElementById('use-custom-module-repo');
  if (useCustomModuleRepoCheckbox && !isLinked && useCustomModuleRepoCheckbox.checked) {
    useCustomModuleRepoCheckbox.checked = false;
    updateCustomModuleRepoVisibility();
  }
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

  // Validate custom module repo if enabled and not resetting Dropbox
  if (!resetDropboxConfiguration && useCustomModuleRepo && dbSyncDropboxLinkStatus == 'LINKED') {
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
  dbSyncEnableBackgroundSync = document.getElementById('database-sync').checked;
  dbSyncAfterChanges = document.getElementById('sync-dropbox-after-changes').checked;

  if (resetDropboxConfiguration) {
    dbSyncDropboxToken = null;
    dbSyncDropboxRefreshToken = null;
    dbSyncDropboxLinkStatus = null;
    
    // Disable custom module repo when Dropbox link is reset
    dbSyncUseCustomModuleRepo = false;

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
  await ipcSettings.set(DROPBOX_ENABLE_BACKGROUND_SYNC_KEY, dbSyncEnableBackgroundSync);
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
  
  updateDropboxOptionsState();
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
      .then(async (response) => {
        dbSyncDropboxToken = response.result.access_token;
        dbSyncDropboxRefreshToken = response.result.refresh_token;
        dbSyncDropboxLinkStatus = 'LINKED';
        updateDropboxLinkStatusLabel();
        updateDropboxOptionsState();

        // Save the Dropbox configuration immediately so that custom module repo validation can access it
        await ipcSettings.set(DROPBOX_TOKEN_SETTINGS_KEY, dbSyncDropboxToken);
        await ipcSettings.set(DROPBOX_REFRESH_TOKEN_SETTINGS_KEY, dbSyncDropboxRefreshToken);
        await ipcSettings.set(DROPBOX_LINK_STATUS_SETTINGS_KEY, dbSyncDropboxLinkStatus);

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
