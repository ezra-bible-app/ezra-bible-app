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

const { html } = require('../helpers/ezra_helper.js');

module.exports.showModuleUpdateDialog = async function() {
  const dialogBoxTemplate = html`
  <div id="module-update-dialog">
    <div id="module-update-dialog-content" style="padding-top: 0.5em">
      <p style="float: left;" i18n="general.module-update-header"></p>
      <loading-indicator id="module-update-loading-indicator" style="float: right;"></loading-indicator>
      <table id="module-update-list" style="clear: both; display: none;">
        <thead>
          <tr>
            <th i18n="general.module-name" style="text-align: left;"></th>
            <th i18n="general.module-current-version" style="text-align: left; width: 8em;"></th>
            <th i18n="general.module-new-version" style="text-align: left; width: 8em;"></th>
          </tr>
        </thead>
        <tbody id="module-update-list-tbody">
        </tbody>
      </table>
    </div>
  </div>
  `;

  return new Promise((resolve) => {

    document.querySelector('#boxes').appendChild(dialogBoxTemplate.content);
    const $dialogBox = $('#module-update-dialog');
    $dialogBox.localize();

    var confirmed = false;
    const width = 800;
    const height = 600;
    const offsetLeft = ($(window).width() - width)/2;

    let dialogOptions = uiHelper.getDialogOptions(width, height, false, [offsetLeft, 120]);
    dialogOptions.dialogClass = 'ezra-dialog';
    dialogOptions.title = i18n.t('general.update-modules');
    dialogOptions.draggable = true;
    dialogOptions.buttons = {};

    dialogOptions.close = () => {
      $dialogBox.dialog('destroy');
      $dialogBox.remove();
      resolve(confirmed);
    };

    dialogOptions.buttons[i18n.t('general.update')] = function() {
      confirmed = true;
      $dialogBox.dialog('destroy');
      $dialogBox.remove();
      resolve(confirmed);
    };

    dialogOptions.buttons[i18n.t('general.cancel')] = function() {
      $dialogBox.dialog('destroy');
      $dialogBox.remove();
      resolve(confirmed);
    };
  
    $dialogBox.dialog(dialogOptions);

    setTimeout(() => {
      ipcNsi.getUpdatedRepoModules().then((updatedModules) => {
        let moduleUpdateList = document.getElementById('module-update-list-tbody');

        updatedModules.forEach(async (module) => {
          let moduleRow = document.createElement('tr');

          let nameCell = document.createElement('td');
          nameCell.style.paddingRight = '1em';
          nameCell.innerText = module.description;

          let oldVersionCell = document.createElement('td');
          let localModule = await ipcNsi.getLocalModule(module.name);
          oldVersionCell.innerText = localModule.version;
          
          let newVersionCell = document.createElement('td');
          newVersionCell.innerText = module.version;

          moduleRow.appendChild(nameCell);
          moduleRow.appendChild(oldVersionCell);
          moduleRow.appendChild(newVersionCell);
          moduleUpdateList.appendChild(moduleRow);
        });

        document.getElementById('module-update-list').style.display = 'block';
        document.getElementById('module-update-loading-indicator').style.display = 'none';
      });
    }, 100);
  });
};