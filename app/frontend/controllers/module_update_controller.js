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
      <p i18n="general.module-update-header"></p>
      <table>
        <thead>
          <tr>
            <th i18n="general.module-name" style="text-align: left;"></th>
            <th i18n="general.module-version" style="text-align: left;"></th>
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
    const width = 640;
    const height = 480;
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

    dialogOptions.buttons[i18n.t('general.ok')] = function() {
      confirmed = true;
      $(this).dialog('close');
    };
  
    $dialogBox.dialog(dialogOptions);

    setTimeout(() => {
      ipcNsi.getUpdatedRepoModules().then((updatedModules) => {
        console.log(`Got ${updatedModules.length} updated modules!`);

        let moduleUpdateList = document.getElementById('module-update-list-tbody');

        updatedModules.forEach((module) => {
          let moduleRow = document.createElement('tr');

          let nameCell = document.createElement('td');
          nameCell.style.paddingRight = '1em';
          nameCell.innerText = module.description;
          
          let versionCell = document.createElement('td');
          versionCell.innerText = module.version;

          moduleRow.appendChild(nameCell);
          moduleRow.appendChild(versionCell);
          moduleUpdateList.appendChild(moduleRow);
        });
      });
    }, 100);
  });
};