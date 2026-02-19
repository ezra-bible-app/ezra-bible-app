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
 * This controller manages the installation of SWORD modules from Dropbox zip files. 
 * @module dropboxZipInstallController
 * @category Controller
 */

const Mousetrap = require('mousetrap');
const PlatformHelper = require('../../lib/platform_helper.js');
const platformHelper = new PlatformHelper();
const eventController = require('./event_controller.js');
const { html } = require('../helpers/ezra_helper.js');
const dbSyncController = require('./db_sync_controller.js');
const swordModuleHelper = require('../helpers/sword_module_helper.js');

module.exports.showDropboxZipInstallDialog = async function() {
  const dbSyncInitDone = await dbSyncController.isInitDone();
  if (!dbSyncInitDone) {
    await dbSyncController.init();
  }

  const dropboxLinkStatus = await ipcSettings.get('dropboxLinkStatus', null);

  // Check if Dropbox is linked
  if (!dropboxLinkStatus || dropboxLinkStatus !== 'LINKED') {
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
  uiHelper.fixDialogCloseIconOnCordova('dropbox-zip-install-dialog');
  Mousetrap.bind('esc', () => { $dialogBox.dialog('close'); });

  // Load zip files from Dropbox
  await loadDropboxZipFiles();

  async function loadDropboxZipFiles() {
    try {
      const response = await ipcGeneral.dropboxListZipFiles();
      
      console.log('Received response:', response);
      
      // Build debug info HTML if setting is enabled
      let debugInfoHtml = '';
      const showDevInfo = await ipcSettings.get('dropboxShowDevInfo', false);
      if (showDevInfo && response.debugInfo) {
        const debugInfo = response.debugInfo;
        const durationMs = debugInfo.endTime - debugInfo.startTime;
        
        // Per-folder details as table
        let folderDetailsStr = '';
        if (debugInfo.folderDetails && debugInfo.folderDetails.length > 0) {
          folderDetailsStr = '<table style="width:calc(100% - 2em); font-size:0.85em; border-collapse:collapse; margin:0.5em 1em;">' +
            '<tr style="border-bottom:1px solid #ccc;">' +
            '<th style="text-align:left; padding:2px 4px;">Path</th>' +
            '<th style="text-align:right; padding:2px 4px;">Entries</th>' +
            '<th style="text-align:right; padding:2px 4px;">Files</th>' +
            '<th style="text-align:right; padding:2px 4px;">Folders</th>' +
            '<th style="text-align:right; padding:2px 4px;">Zips</th>' +
            '</tr>' +
            debugInfo.folderDetails.map(f => 
              '<tr' + (f.error ? ' style="color:red;"' : '') + '>' +
              '<td style="padding:2px 4px;">' + f.path + '</td>' +
              '<td style="text-align:right; padding:2px 4px;">' + f.entries + '</td>' +
              '<td style="text-align:right; padding:2px 4px;">' + f.files + '</td>' +
              '<td style="text-align:right; padding:2px 4px;">' + f.folders + '</td>' +
              '<td style="text-align:right; padding:2px 4px;">' + f.zipFiles + '</td>' +
              '</tr>'
            ).join('') +
            '</table>';
        } else {
          folderDetailsStr = debugInfo.foldersScanned.map(f => '&nbsp;&nbsp;' + f).join('<br/>');
        }
        
        const errorsStr = debugInfo.errors.length > 0 
          ? debugInfo.errors.map(e => e.folder + ': ' + e.error).join('; ')
          : 'None';
        
        // File extensions breakdown
        const extStr = debugInfo.fileExtensions 
          ? Object.entries(debugInfo.fileExtensions)
              .sort((a, b) => b[1] - a[1])
              .map(([ext, count]) => ext + ': ' + count)
              .join(', ')
          : 'N/A';
        
        debugInfoHtml = 
          '<div style="font-size: 0.9em; color: #666; margin-top: 1em;">' +
          '<b>Debug Info</b><br/>' +
          '<b>Duration:</b> ' + durationMs + 'ms<br/>' +
          '<b>Total retries:</b> ' + (debugInfo.totalRetries || 0) + '<br/>' +
          '<b>Total pagination calls:</b> ' + (debugInfo.totalPaginationCalls || 0) + '<br/>' +
          '<b>Total entries:</b> ' + debugInfo.totalEntriesProcessed + '<br/>' +
          '<b>Files found:</b> ' + debugInfo.totalFilesFound + '<br/>' +
          '<b>Folders found:</b> ' + debugInfo.totalFoldersFound + '<br/>' +
          '<b>Zip files:</b> ' + debugInfo.zipFilesFound + '<br/>' +
          '<b>File extensions:</b> ' + extStr + '<br/>' +
          '<b>Errors:</b> ' + errorsStr + '<br/>' +
          '<b>Folders scanned:</b> ' + debugInfo.foldersScanned.length + '<br/>' + folderDetailsStr +
          '</div>';
      }
      
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


      // Render file list
      zipFiles.forEach((file) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'zip-file-item';
        fileItem.style.padding = '0.5em';
        fileItem.style.borderBottom = '1px solid #ccc';
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

      // Append debug info if available
      if (debugInfoHtml) {
        const debugDiv = document.createElement('div');
        debugDiv.innerHTML = debugInfoHtml;
        zipFileList.appendChild(debugDiv);
      }

      // Enable/disable install button based on selection
      function updateInstallButtonState() {
        const checked = document.querySelectorAll('.zip-file-checkbox:checked').length > 0;
        if (checked) {
          $('#install-zip-modules-button').button('enable');
        } else {
          $('#install-zip-modules-button').button('disable');
        }
      }
      // Attach event listeners
      zipFileList.querySelectorAll('.zip-file-checkbox').forEach(cb => {
        cb.addEventListener('change', updateInstallButtonState);
      });
      // Initial state
      updateInstallButtonState();

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

    // Always disable install button during installation
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
              <th style="text-align: left; padding: 0.5em; max-width: 200px;">Module</th>
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
          <td style="padding: 0.5em; max-width: 200px; word-break: break-word; overflow-wrap: break-word;">${displayPath}</td>
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

        // Log the full result for debugging
        console.log(`[DropboxZipInstall] Installation result for ${displayPath}:`, JSON.stringify(result, null, 2));

        // Update row with result
        const statusCell = row.querySelector('td:last-child');
        if (result.success) {
          successCount++;
          statusCell.innerHTML = '<span style="color: green;">✓ Installed</span>';
          
          // Raise appropriate event based on module type
          if (swordModuleHelper.isBibleModule(result.moduleType)) {
            await eventController.publishAsync('on-translation-added', result.moduleId);
          } else if (swordModuleHelper.isDictionaryModule(result.moduleType)) {
            await eventController.publishAsync('on-dictionary-added', result.moduleId);
          } else if (swordModuleHelper.isCommentaryModule(result.moduleType)) {
            await eventController.publishAsync('on-commentary-added', result.moduleId);
          }
        } else if (result.alreadyInstalled) {
          skippedCount++;
          statusCell.innerHTML = '<span style="color: #888;">⊘ Already installed</span>';
        } else {
          failedCount++;
          const errorMsg = result.error || 'Unknown error';
          const errorDetails = result.errorDetails || '';
          const fullError = errorDetails ? `${errorMsg}: ${errorDetails}` : errorMsg;
          console.error(`[DropboxZipInstall] Failed to install ${displayPath}: ${fullError}`);
          statusCell.innerHTML = `<span style="color: red;" title="${fullError}">✗ Failed: ${errorMsg}</span>`;
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
        await app_controller.translation_controller.initTranslationsMenu();
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
