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
 * This controller manages the configuration of custom SWORD repositories.
 * @module customRepoController
 * @category Controller
 */

const Mousetrap = require('mousetrap');
const PlatformHelper = require('../../lib/platform_helper.js');
const platformHelper = new PlatformHelper();
const { html } = require('../helpers/ezra_helper.js');

module.exports.showCustomRepoDialog = async function() {
  const dialogBoxTemplate = html`
  <div id="custom-repo-dialog" style="padding: 1em;">
    <div id="custom-repo-list-section">
      <div id="custom-repo-list"></div>
    </div>
    <hr style="margin: 1em 0;"/>
    <div id="custom-repo-add-section">
      <h3>${i18n.t('custom-repositories.add-repository')}</h3>
      <table style="border-collapse: separate; border-spacing: 0 0.5em;">
        <tr>
          <td style="padding-right: 1em;"><label>${i18n.t('custom-repositories.protocol')}</label></td>
          <td>
            <label style="margin-right: 1em;"><input type="radio" name="custom-repo-protocol" value="FTP" checked> FTP</label>
            <label style="margin-right: 1em;"><input type="radio" name="custom-repo-protocol" value="HTTP"> HTTP</label>
            <label><input type="radio" name="custom-repo-protocol" value="HTTPS"> HTTPS</label>
          </td>
        </tr>
        <tr>
          <td style="padding-right: 1em;"><label>${i18n.t('custom-repositories.name')}</label></td>
          <td><text-field id="custom-repo-name" style="width: 20em;"></text-field></td>
        </tr>
        <tr>
          <td style="padding-right: 1em;"><label>${i18n.t('custom-repositories.host')}</label></td>
          <td><text-field id="custom-repo-host" style="width: 20em;"></text-field></td>
        </tr>
        <tr>
          <td style="padding-right: 1em;"><label>${i18n.t('custom-repositories.path')}</label></td>
          <td><text-field id="custom-repo-path" style="width: 20em;" placeholder="/pub/sword/raw"></text-field></td>
        </tr>
      </table>
    </div>
    <div style="margin-top: 0.75em;">
      <button id="custom-repo-add-button" class="fg-button ui-corner-all ui-state-default">${i18n.t('custom-repositories.add')}</button>
    </div>
    <div id="custom-repo-loading" style="display: none; margin-top: 0.75em;">
      <loading-indicator></loading-indicator>
      <span id="custom-repo-loading-message" style="margin-left: 0.5em;">${i18n.t('custom-repositories.adding-repository')}</span>
    </div>
  </div>
  `;

  document.querySelector('#boxes').appendChild(dialogBoxTemplate.content);
  const $dialogBox = $('#custom-repo-dialog');

  const width = 600;
  const height = 480;

  let dialogOptions = uiHelper.getDialogOptions(width, height, true);
  dialogOptions.title = i18n.t('custom-repositories.dialog-title');
  dialogOptions.dialogClass = 'ezra-dialog custom-repo-dialog';
  dialogOptions.close = () => {
    $dialogBox.dialog('destroy');
    $dialogBox.remove();
  };

  dialogOptions.buttons = {};

  $dialogBox.dialog(dialogOptions);
  uiHelper.configureButtonStyles(document.getElementById('custom-repo-dialog'));
  uiHelper.fixDialogCloseIconOnCordova('custom-repo-dialog');
  Mousetrap.bind('esc', () => { $dialogBox.dialog('close'); });

  await refreshRepoList();

  document.getElementById('custom-repo-add-button').addEventListener('click', async () => {
    await addCustomRepo();
  });

  uiHelper.configureButtonStyles(document.getElementById('custom-repo-add-section'));

  async function refreshRepoList() {
    const repos = await ipcNsi.getCustomRepositories();
    const listContainer = document.getElementById('custom-repo-list');

    if (!repos || repos.length === 0) {
      listContainer.innerHTML = `<p style="color: #666;">${i18n.t('custom-repositories.no-custom-repos')}</p>`;
      return;
    }

    listContainer.innerHTML = '';
    const table = document.createElement('table');
    table.style.cssText = 'width: 100%; border-collapse: collapse;';

    repos.forEach(repo => {
      const row = document.createElement('tr');
      row.innerHTML =
        `<td style="padding: 0.3em 0.5em;">${repo.protocol}</td>` +
        `<td style="padding: 0.3em 0.5em; font-weight: bold;">${repo.name}</td>` +
        `<td style="padding: 0.3em 0.5em;">${repo.host}</td>` +
        `<td style="padding: 0.3em 0.5em;">${repo.path}</td>` +
        `<td style="padding: 0.3em 0.5em;">` +
        `<button class="remove-custom-repo-button fg-button ui-corner-all ui-state-default" data-name="${repo.name}">` +
        `${i18n.t('custom-repositories.remove')}` +
        `</button></td>`;
      table.appendChild(row);
    });

    listContainer.appendChild(table);

    $(listContainer).find('.remove-custom-repo-button').on('click', async function() {
      const name = $(this).data('name');
      await removeCustomRepo(name);
    });

    uiHelper.configureButtonStyles(listContainer);
  }

  async function addCustomRepo() {
    const protocol = $('input[name="custom-repo-protocol"]:checked').val();
    const name = document.getElementById('custom-repo-name').value.trim();
    const host = document.getElementById('custom-repo-host').value.trim();
    const repoPath = document.getElementById('custom-repo-path').value.trim();

    if (!name || !host || !repoPath) {
      // eslint-disable-next-line no-undef
      iziToast.error({
        title: i18n.t('custom-repositories.dialog-title'),
        message: i18n.t('custom-repositories.error-empty-fields'),
        position: platformHelper.getIziPosition(),
        timeout: 5000
      });
      return;
    }

    const addButton = document.getElementById('custom-repo-add-button');
    addButton.disabled = true;
    const loadingEl = document.getElementById('custom-repo-loading');
    loadingEl.style.display = 'block';
    const result = await ipcNsi.addCustomRepository(protocol, name, host, repoPath);
    loadingEl.style.display = 'none';
    addButton.disabled = false;

    if (!result || !result.success) {
      const errorKey = (result && result.error === 'duplicate-name')
        ? 'custom-repositories.error-duplicate-name'
        : 'custom-repositories.error-invalid-config';

      // eslint-disable-next-line no-undef
      iziToast.error({
        title: i18n.t('custom-repositories.dialog-title'),
        message: i18n.t(errorKey),
        position: platformHelper.getIziPosition(),
        timeout: 5000
      });
      return;
    }

    // eslint-disable-next-line no-undef
    iziToast.success({
      title: i18n.t('custom-repositories.dialog-title'),
      message: i18n.t('custom-repositories.success-added', { name: name }),
      position: platformHelper.getIziPosition(),
      timeout: 3000
    });

    document.getElementById('custom-repo-name').value = '';
    document.getElementById('custom-repo-host').value = '';
    document.getElementById('custom-repo-path').value = '';
    $('input[name="custom-repo-protocol"][value="FTP"]').prop('checked', true);

    await refreshRepoList();
  }

  async function removeCustomRepo(name) {
    await ipcNsi.removeCustomRepository(name);
    await refreshRepoList();
  }
};
