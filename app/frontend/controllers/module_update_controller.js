/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2026 Ezra Bible App Development Team <contact@ezrabibleapp.net>

   Ezra Bible App is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 2 of the License, or
   (at your option) any later version.

   Ezra Bible App is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
   See the GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Bible App. See the file LICENSE.
   If not, see <http://www.gnu.org/licenses/>. */

const Mousetrap = require('mousetrap');
const eventController = require('../controllers/event_controller.js');
const { html } = require('../helpers/ezra_helper.js');
const swordModuleHelper = require('../helpers/sword_module_helper.js');

/**
 * This controller manages the update of SWORD modules. 
 * @module moduleUpdateController
 * @category Controller
 */

var repoUpdateInProgress = false;
var moduleUpdateInitiated = false;
var moduleUpdateCompleted = false;

module.exports.init = function() {
  eventController.subscribe('on-repo-update-started', () => {
    disableDialogButtons();
    repoUpdateInProgress = true;
    clearUpdatedModuleList();
  });

  eventController.subscribe('on-repo-update-completed', () => {
    refreshUpdatedModuleList();
    repoUpdateInProgress = false;
  });
};

module.exports.showModuleUpdateDialog = async function() {
  const dialogBoxTemplate = html`

  <link href="css/module_settings_assistant.css" media="screen" rel="stylesheet" type="text/css" />

  <div id="module-update-dialog" class="module-settings-assistant">
    <div id="module-update-dialog-content" class="container" style="padding-top: 0.5em">

      <div id="module-update-step-1" class="module-settings-assistant-init">
        <section>
          <p i18n="[html]module-assistant.intro-text"
             data-i18n-options='{ "module_type" : "$t(module-assistant.module-type-generic)" }'></p>
          <p class="repository-explanation assistant-note"
             i18n="[html]module-assistant.step-repositories.what-is-repository"
             data-i18n-options='{ "module_type" : "$t(module-assistant.module-type-generic)" }'></p>
        </section>

        <section class="module-settings-assistant-internet-usage">
          <p i18n="[html]module-assistant.internet-usage-note"></p>
        </section>

        <div class="module-assistant-type-buttons">
          <button id="update-modules-button"
                  class="fg-button ui-corner-all ui-state-default"
                  i18n="module-assistant.update-modules"
                  data-i18n-options='{ "module_type" : "$t(module-assistant.module-type-generic)" }'></button>
        </div>
      </div>
    </div>
  </div>
  `;

  const dialogBoxTemplateStep2 = html`
    <div id="module-update-step-2">
      <update-repositories></update-repositories>

      <p id="module-update-header" style="display: none; margin-top: 1em; float: left;" i18n="general.module-updates-available"></p>
      <p id="module-update-header-up-to-date" style="display: none; margin-top: 4em; float: left; font-weight: bold; text-align: center; width: 100%;">
        <span i18n="general.modules-up-to-date"></span>
        <i class="fa-solid fa-check"></i>
      </p>
      <loading-indicator id="module-update-loading-indicator" style="display: none; float: right;"></loading-indicator>

      <table id="module-update-list" style="clear: both; display: none;">
        <thead>
          <tr>
            <th i18n="general.module-name" style="text-align: left; min-width: 10em; padding-right: 0.5em;"></th>
            <th id="module-id-header" i18n="general.module-id" style="text-align: left; width: 6em; padding-right: 0.5em; display: none;"></th>
            <th i18n="general.module-current-version" style="text-align: left; width: 6em; padding-right: 0.5em;"></th>
            <th i18n="general.module-new-version" style="text-align: left; width: 6em; padding-right: 0.5em;"></th>
            <th id="module-version-info-header" i18n="general.module-version-info" style="text-align: left; width: 20em; padding-right: 0.5em; display: none;"></th>
            <th id="module-repo-header" i18n="module-assistant.repository_singular" style="text-align: left; width: 10em; display: none;"></th>
            <th style="width: 5em;"></th>
          </tr>
        </thead>
        <tbody id="module-update-list-tbody">
        </tbody>
      </table>
    </div>
  `;

  moduleUpdateInitiated = false;

  return new Promise((resolve) => {

    document.querySelector('#boxes').appendChild(dialogBoxTemplate.content);
    const $dialogBox = $('#module-update-dialog');
    $dialogBox.localize();

    uiHelper.configureButtonStyles('#module-update-step-1');

    const appContainerWidth = $(window).width() - 10;
    var dialogWidth = null;

    if (appContainerWidth < 1100) {
      dialogWidth = appContainerWidth;
    } else {
      dialogWidth = 1100;
    }

    var dialogHeight = $(window).height() * 0.8;

    var confirmed = false;
    const offsetLeft = ($(window).width() - dialogWidth)/2;
    let fullscreen = platformHelper.isCordova();

    let dialogOptions = uiHelper.getDialogOptions(dialogWidth, dialogHeight, false, [offsetLeft, 80], false, fullscreen);
    dialogOptions.dialogClass = 'ezra-dialog module-update-dialog';
    dialogOptions.title = i18n.t('general.update-modules');
    dialogOptions.draggable = true;
    dialogOptions.modal = true;
    dialogOptions.buttons = {};

    dialogOptions.close = () => {
      $dialogBox.dialog('destroy');
      $dialogBox.remove();
      resolve(confirmed);
    };

    Mousetrap.bind('esc', () => { $dialogBox.dialog("close"); });

    $dialogBox.dialog(dialogOptions);
    uiHelper.fixDialogCloseIconOnAndroid('module-update-dialog');

    document.getElementById('update-modules-button').addEventListener('click', () => {
      let dialogContent = document.getElementById('module-update-dialog-content');
      dialogContent.innerHTML = dialogBoxTemplateStep2.innerHTML;
      $dialogBox.localize();

      let buttons = {};

      buttons[i18n.t('general.update')] = function(event) {
        if (event.target.closest('button').classList.contains('ui-state-disabled')) {
          return;
        }

        performModuleUpdate();
        confirmed = true;
      };

      buttons[i18n.t('general.cancel')] = function() {
        if (!moduleUpdateInitiated || moduleUpdateCompleted) {
          $dialogBox.dialog('destroy');
          $dialogBox.remove();
          resolve(confirmed);
        }
      };

      $dialogBox.dialog("option", "buttons", buttons);

      if (!repoUpdateInProgress) {
        refreshUpdatedModuleList();
      }

      disableDialogButtons();
    });
  });
};

function clearUpdatedModuleList() {
  document.getElementById('module-update-header').style.display = 'none';
  document.getElementById('module-update-header-up-to-date').style.display = 'none';
  document.getElementById('module-update-list').style.display = 'none';

  let moduleUpdateList = document.getElementById('module-update-list-tbody');
  moduleUpdateList.innerHTML = '';
}

function getLoadingIndicator() {
  return document.getElementById('module-update-loading-indicator');
}

function refreshUpdatedModuleList() {
  getLoadingIndicator().style.display = 'block';

  // Determine if platform is mobile
  let isMobileDevice = platformHelper.isMobile();
  
  // Show/hide the id column and repository column headers based on platform
  if (!isMobileDevice) {
    document.getElementById('module-id-header').style.display = 'table-cell';
    document.getElementById('module-repo-header').style.display = 'table-cell';
    document.getElementById('module-version-info-header').style.display = 'table-cell';
  }

  setTimeout(() => {
    ipcNsi.getUpdatedModules().then((updatedModules) => {
      let moduleUpdateList = document.getElementById('module-update-list-tbody');
      let moduleUpdateHeader = document.getElementById('module-update-header');
      let moduleUpdateHeaderUpToDate = document.getElementById('module-update-header-up-to-date');

      if (moduleUpdateHeader == null || moduleUpdateHeaderUpToDate == null) {
        return;
      }

      if (updatedModules.length == 0) {

        moduleUpdateHeader.style.display = 'none';
        moduleUpdateHeaderUpToDate.style.display = 'block';

      } else {
        moduleUpdateHeaderUpToDate.style.display = 'none';

        updatedModules.forEach(async (module) => {
          let moduleRow = document.createElement('tr');
          moduleRow.setAttribute('module-code', module.name);

          let nameCell = document.createElement('td');
          nameCell.style.paddingRight = '1em';
          nameCell.innerText = module.description;
          
          let idCell = document.createElement('td');
          idCell.innerText = module.name;
          idCell.style.paddingRight = '1em';
          if (isMobileDevice) {
            idCell.style.display = 'none';
          }

          let oldVersionCell = document.createElement('td');
          let localModule = await ipcNsi.getLocalModule(module.name);
          oldVersionCell.innerText = localModule.version;
          
          let newVersionCell = document.createElement('td');
          newVersionCell.innerText = module.version;
          
          // Add version info cell
          let versionInfoCell = document.createElement('td');
          versionInfoCell.style.paddingRight = '1em';
          versionInfoCell.style.fontSize = '0.9em';
          
          // Get version info using the helper function
          let versionInfo = await swordModuleHelper.getModuleVersionInfo(module.name, module.version, true);
          versionInfoCell.innerText = versionInfo;
          
          if (isMobileDevice) {
            versionInfoCell.style.display = 'none';
          }
          
          let repoCell = document.createElement('td');
          repoCell.innerText = module.repository;
          if (isMobileDevice) {
            repoCell.style.display = 'none';
          }

          let statusCell = document.createElement('td');
          statusCell.style.textAlign = 'center';
          statusCell.classList.add('status');

          let loadingIndicator = document.createElement('loading-indicator');
          loadingIndicator.style.display = 'none';
          statusCell.appendChild(loadingIndicator);

          moduleRow.appendChild(nameCell);
          moduleRow.appendChild(idCell);
          moduleRow.appendChild(oldVersionCell);
          moduleRow.appendChild(newVersionCell);
          moduleRow.appendChild(versionInfoCell);
          moduleRow.appendChild(repoCell);
          moduleRow.appendChild(statusCell);
          moduleUpdateList.appendChild(moduleRow);
        });

        moduleUpdateHeader.style.display = 'block';
        document.getElementById('module-update-list').style.display = 'block';
      }

      getLoadingIndicator().style.display = 'none';

      enableDialogButtons();

      if (updatedModules.length == 0) {
        disableUpdateButton();
      }
    });
  }, 100);
}

function disableDialogButtons() {
  let moduleUpdateDialog = document.querySelector('.module-update-dialog');

  if (moduleUpdateDialog != null) {
    let buttonSet = moduleUpdateDialog.querySelector('.ui-dialog-buttonset');

    if (buttonSet != null) {
      let dialogButtons = buttonSet.querySelectorAll('button');
      let updateButton = dialogButtons[0];
      let cancelButton = dialogButtons[1];
      updateButton.classList.add('ui-state-disabled');
      cancelButton.classList.add('ui-state-disabled');
    }

    let dialogCloseButton = moduleUpdateDialog.querySelector('.ui-dialog-titlebar-close');
    let updateRepoDataButton = moduleUpdateDialog.querySelector('.update-repo-data');

    if (updateRepoDataButton != null) {
      updateRepoDataButton.classList.add('ui-state-disabled');
    }

    if (dialogCloseButton != null) {
      dialogCloseButton.style.display = 'none';
    }
  }
}

function enableDialogButtons() {
  let moduleUpdateDialog = document.querySelector('.module-update-dialog');

  if (moduleUpdateDialog != null) {
    let dialogButtons = moduleUpdateDialog.querySelector('.ui-dialog-buttonset').querySelectorAll('button');
    let updateButton = dialogButtons[0];
    let cancelButton = dialogButtons[1];
    let dialogCloseButton = moduleUpdateDialog.querySelector('.ui-dialog-titlebar-close');
    let updateRepoDataButton = moduleUpdateDialog.querySelector('.update-repo-data');

    updateButton.classList.remove('ui-state-disabled');
    cancelButton.classList.remove('ui-state-disabled');
    updateRepoDataButton.classList.remove('ui-state-disabled');
    dialogCloseButton.style.removeProperty('display');
  }
}

function enableFinishButton() {
  let moduleUpdateDialog = document.querySelector('.module-update-dialog');

  if (moduleUpdateDialog != null) {
    let dialogButtons = moduleUpdateDialog.querySelector('.ui-dialog-buttonset').querySelectorAll('button');
    let cancelButton = dialogButtons[1];

    cancelButton.firstChild.innerText = i18n.t('general.finish');
    cancelButton.classList.remove('ui-state-disabled');
  }
}

function enableDialogCloseButton() {
  let moduleUpdateDialog = document.querySelector('.module-update-dialog');

  if (moduleUpdateDialog != null) {
    let dialogCloseButton = moduleUpdateDialog.querySelector('.ui-dialog-titlebar-close');
    dialogCloseButton.style.removeProperty('display');
  }
}

function disableUpdateButton() {
  let moduleUpdateDialog = document.querySelector('.module-update-dialog');

  if (moduleUpdateDialog != null) {
    let dialogButtons = moduleUpdateDialog.querySelector('.ui-dialog-buttonset').querySelectorAll('button');
    let updateButton = dialogButtons[0];
    updateButton.classList.add('ui-state-disabled');
  }
}

async function performModuleUpdate() {
  if (moduleUpdateInitiated) {
    return;
  }

  moduleUpdateInitiated = true;
  let moduleUpdateList = document.getElementById('module-update-list-tbody');
  let rows = moduleUpdateList.querySelectorAll('tr');
  let previousLoadingIndicator = null;

  disableDialogButtons();

  for (let i = 0; i < rows.length; i++) {
    let tr = rows[i];

    let moduleCode = tr.getAttribute('module-code');
    let statusCell = tr.querySelector('.status');
    let loadingIndicator = statusCell.firstChild;
    previousLoadingIndicator = loadingIndicator;

    loadingIndicator.style.display = 'block';

    // Installation on top of an existing installation is buggy!
    // Therefore, the explicit uninstall step is quite important!
    await ipcNsi.uninstallModule(moduleCode);

    await ipcNsi.installModule(moduleCode);

    if (previousLoadingIndicator != null) {
      previousLoadingIndicator.style.display = 'none';

      let successIndicator = document.createElement('i');
      successIndicator.style.color = 'var(--checkmark-success-color)';
      successIndicator.classList.add('fas', 'fa-check', 'fa-lg');
      statusCell.appendChild(successIndicator);
    }
  }

  moduleUpdateCompleted = true;

  // The sword module helper may still have a cached version of one of the upgraded modules.
  // Therefore it is important to reset it.
  swordModuleHelper.resetModuleCache();

  enableDialogCloseButton();
  enableFinishButton();
}
