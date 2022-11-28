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

const eventController = require('../controllers/event_controller.js');
const { html } = require('../helpers/ezra_helper.js');

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
  <div id="module-update-dialog">
    <div id="module-update-dialog-content" style="padding-top: 0.5em">

      <update-repositories></update-repositories>

      <p id="module-update-header" style="margin-top: 1em; float: left;" i18n="general.module-updates-available"></p>
      <p id="module-update-header-up-to-date" style="display: none; margin-top: 1em; float: left;" i18n="general.modules-up-to-date"></p>
      <loading-indicator id="module-update-loading-indicator" style="display: none; float: right;"></loading-indicator>

      <table id="module-update-list" style="clear: both; display: none;">
        <thead>
          <tr>
            <th i18n="general.module-name" style="text-align: left; min-width: 13em"></th>
            <th i18n="general.module-current-version" style="text-align: left; width: 8em;"></th>
            <th i18n="general.module-new-version" style="text-align: left; width: 8em;"></th>
            <th style="width: 5em;"></th>
          </tr>
        </thead>
        <tbody id="module-update-list-tbody">
        </tbody>
      </table>
    </div>
  </div>
  `;

  moduleUpdateInitiated = false;

  return new Promise((resolve) => {

    document.querySelector('#boxes').appendChild(dialogBoxTemplate.content);
    const $dialogBox = $('#module-update-dialog');
    $dialogBox.localize();

    var confirmed = false;
    const width = 800;
    const height = 600;
    const offsetLeft = ($(window).width() - width)/2;

    let dialogOptions = uiHelper.getDialogOptions(width, height, false, [offsetLeft, 120]);
    dialogOptions.dialogClass = 'ezra-dialog module-update-dialog';
    dialogOptions.title = i18n.t('general.update-modules');
    dialogOptions.draggable = true;
    dialogOptions.buttons = {};

    dialogOptions.close = () => {
      $dialogBox.dialog('destroy');
      $dialogBox.remove();
      resolve(confirmed);
    };

    dialogOptions.buttons[i18n.t('general.update')] = function(event) {
      if (event.target.classList.contains('ui-state-disabled')) {
        return;
      }

      performModuleUpdate();
      confirmed = true;
    };

    dialogOptions.buttons[i18n.t('general.cancel')] = function() {
      if (!moduleUpdateInitiated || moduleUpdateCompleted) {
        $dialogBox.dialog('destroy');
        $dialogBox.remove();
        resolve(confirmed);
      }
    };

    if (!repoUpdateInProgress) {
      refreshUpdatedModuleList();
    }
  
    $dialogBox.dialog(dialogOptions);

    disableDialogButtons();
  });
};

function clearUpdatedModuleList() {
  document.getElementById('module-update-header').style.display = 'none';
  document.getElementById('module-update-header-up-to-date').style.display = 'none';
  document.getElementById('module-update-list').style.display = 'none';

  let moduleUpdateList = document.getElementById('module-update-list-tbody');
  moduleUpdateList.innerHTML = '';
}

function refreshUpdatedModuleList() {
  document.getElementById('module-update-loading-indicator').style.display = 'block';

  setTimeout(() => {
    ipcNsi.getUpdatedModules().then((updatedModules) => {
      let moduleUpdateList = document.getElementById('module-update-list-tbody');

      if (updatedModules.length == 0) {

        document.getElementById('module-update-header').style.display = 'none';
        document.getElementById('module-update-header-up-to-date').style.display = 'block';

      } else {
        document.getElementById('module-update-header-up-to-date').style.display = 'none';

        updatedModules.forEach(async (module) => {
          let moduleRow = document.createElement('tr');
          moduleRow.setAttribute('module-code', module.name);

          let nameCell = document.createElement('td');
          nameCell.style.paddingRight = '1em';
          nameCell.innerText = module.description;

          let oldVersionCell = document.createElement('td');
          let localModule = await ipcNsi.getLocalModule(module.name);
          oldVersionCell.innerText = localModule.version;
          
          let newVersionCell = document.createElement('td');
          newVersionCell.innerText = module.version;

          let statusCell = document.createElement('td');
          statusCell.style.textAlign = 'center';
          statusCell.classList.add('status');

          let loadingIndicator = document.createElement('loading-indicator');
          loadingIndicator.style.display = 'none';
          statusCell.appendChild(loadingIndicator);

          moduleRow.appendChild(nameCell);
          moduleRow.appendChild(oldVersionCell);
          moduleRow.appendChild(newVersionCell);
          moduleRow.appendChild(statusCell);
          moduleUpdateList.appendChild(moduleRow);
        });

        document.getElementById('module-update-header').style.display = 'block';
        document.getElementById('module-update-list').style.display = 'block';
      }

      document.getElementById('module-update-loading-indicator').style.display = 'none';

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
    let dialogButtons = moduleUpdateDialog.querySelector('.ui-dialog-buttonset').querySelectorAll('button');
    let updateButton = dialogButtons[0];
    let cancelButton = dialogButtons[1];
    let dialogCloseButton = moduleUpdateDialog.querySelector('.ui-dialog-titlebar-close');
    let updateRepoDataButton = moduleUpdateDialog.querySelector('.update-repo-data');

    updateButton.classList.add('ui-state-disabled');
    cancelButton.classList.add('ui-state-disabled');
    updateRepoDataButton.classList.add('ui-state-disabled');
    dialogCloseButton.style.display = 'none';
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

  enableDialogCloseButton();
  enableFinishButton();
}
