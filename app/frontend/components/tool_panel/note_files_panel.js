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

const eventController = require('../../controllers/event_controller.js');
const { html } = require('../../helpers/ezra_helper.js');

/**
 * The NoteFilesPanel component represents the panel for managing note files.
 * 
 * @category Component
 */
class NoteFilesPanel {
  constructor() {
    this._initDone = false;
    this._activeNoteFileId = null;

    eventController.subscribe('on-startup-completed', () => {
      this.init();
    });

    let reloadNoteFiles = async (tabIndex=undefined) => {
      if (this._initDone) {
        let noteFileId = await app_controller.tab_controller.getCurrentTabNoteFileId(tabIndex);
        await this.loadActiveNoteFile(noteFileId);
        await this.refreshNoteFiles();
      }
    };

    eventController.subscribe('on-tab-selected', async (tabIndex) => {
      reloadNoteFiles(tabIndex);
    });

    eventController.subscribe('on-bible-text-loaded', async () => {
      reloadNoteFiles();
    });

    let refreshWithTagId = async (tagId) => {
      const tagObject = await tag_assignment_panel.tag_store.getTag(tagId);

      if (tagObject.noteFileId != null) {
        this.refreshNoteFiles();
      }
    };

    eventController.subscribe('on-tag-created', async (tagId) => {
      await refreshWithTagId(tagId);
    });

    eventController.subscribePrioritized('on-tag-deleted', async (tagId) => {
      await refreshWithTagId(tagId);
    });

    eventController.subscribe('on-db-refresh', () => {
      this.refreshNoteFiles();
    });
  }

  async init() {
    const enableNoteFilesPanel = await ipcSettings.get('enableNoteFilesPanel', false);

    if (enableNoteFilesPanel) {
      const noteFilesPanelButton = document.getElementById('note-files-panel-button');
      noteFilesPanelButton.classList.remove('hidden');
    }

    let noteFileId = await app_controller.tab_controller.getCurrentTabNoteFileId();
    await this.loadActiveNoteFile(noteFileId);
    this.refreshNoteFiles();
    this._initDone = true;

    const addButton = document.getElementById('add-note-file-button');
    addButton.addEventListener('click', () => {
      this.showAddNoteFileDialog();
    });
  }

  async loadActiveNoteFile(noteFileId=null) {
    if (noteFileId == null) {
      noteFileId = await ipcSettings.get('activeNoteFileId', 0);
    }

    if (noteFileId == null) {
      noteFileId = 0;
    }

    this._activeNoteFileId = parseInt(noteFileId, 10);
  }

  async saveActiveNoteFile() {
    await ipcSettings.set('activeNoteFileId', this._activeNoteFileId);
  }

  showAddNoteFileDialog() {
    const addNoteFileTitle = i18n.t('general.title');

    const dialogBoxTemplate = html`
    <div id="add-note-file-dialog" style="padding-top: 2em;">
      <label id="add-note-file-title">${addNoteFileTitle}:</label>
      <input id="note-file-title-value" type="text" label="" style="width: 25em; border: 1px solid lightgray; border-radius: 4px;"/>
      <div id="note-file-title-error" style="color: red; display: none;">Title already exists</div>
    </div>
    `;

    return new Promise((resolve) => {
      document.querySelector('#boxes').appendChild(dialogBoxTemplate.content);
      const $dialogBox = $('#add-note-file-dialog');
      
      var width = 400;
      var height = 200;
      var draggable = true;
      var position = [55, 120];

      let dialogOptions = uiHelper.getDialogOptions(width, height, draggable, position);
      dialogOptions.title = i18n.t('notes-panel.add-note-file');
      dialogOptions.dialogClass = 'ezra-dialog add-note-file-dialog';
      dialogOptions.close = () => {
        $dialogBox.dialog('destroy');
        $dialogBox.remove();
        resolve();
      };

      let createNoteFile = async () => {
        let noteFileTitle = document.getElementById('note-file-title-value').value;
        const noteFiles = await ipcDb.getAllNoteFiles();
        const titleExists = noteFiles.some(noteFile => noteFile.title === noteFileTitle);

        if (titleExists) {
          document.getElementById('note-file-title-error').style.display = 'block';
        } else {
          await ipcDb.createNoteFile(noteFileTitle);
          this.refreshNoteFiles();
          $dialogBox.dialog('close');
        }
      };

      dialogOptions.buttons = {};

      dialogOptions.buttons[i18n.t('general.cancel')] = function() {
        $dialogBox.dialog('close');
      };

      dialogOptions.buttons[i18n.t('notes-panel.create-note-file')] = {
        id: 'create-note-file-button',
        text: i18n.t('notes-panel.create-note-file'),
        click: () => {
          createNoteFile();
        }
      };
      
      document.getElementById('note-file-title-value').addEventListener('keyup', (event) => {
        if (event.key == 'Enter') {
          createNoteFile();
        }
      });

      $dialogBox.dialog(dialogOptions);
      uiHelper.fixDialogCloseIconOnCordova('add-note-file-dialog');

      document.getElementById('note-file-title-value').focus();
    });
  }

  async handleNoteFileSelected(noteFileId) {
    const currentNoteFileId = await app_controller.tab_controller.getCurrentTabNoteFileId();

    // Only change the active note file if the current note file is null
    if (currentNoteFileId == null) {
      this.setActiveNoteFile(noteFileId);
    }
  }

  async refreshNoteFiles() {
    const noteFiles = await ipcDb.getAllNoteFiles();
    const noteFilesContainer = document.getElementById('notes-panel-content');
    noteFilesContainer.innerHTML = '';

    const table = document.createElement('table');
    table.className = 'note-files-table';

    const headerRow = document.createElement('tr');
    const titleHeader = document.createElement('th');
    titleHeader.innerText = 'Title';
    const createdAtHeader = document.createElement('th');
    createdAtHeader.innerText = 'Created At';
    const actionsHeader = document.createElement('th');
    actionsHeader.innerText = 'Actions';
    headerRow.appendChild(titleHeader);
    headerRow.appendChild(createdAtHeader);
    headerRow.appendChild(actionsHeader);
    table.appendChild(headerRow);

    // Add the fixed first line for the standard note file
    const standardNoteFileRow = document.createElement('tr');
    standardNoteFileRow.setAttribute('note-file-id', 0);
    standardNoteFileRow.className = this._activeNoteFileId === 0 ? 'ui-selected' : '';
    standardNoteFileRow.addEventListener('click', () => {
      this.handleNoteFileSelected(0);
    });

    const standardTitleCell = document.createElement('td');
    standardTitleCell.innerText = i18n.t('notes-panel.standard-note-file');
    const standardCreatedAtCell = document.createElement('td');
    standardCreatedAtCell.innerText = '-';
    const standardActionsCell = document.createElement('td');
    standardActionsCell.innerText = '-';

    standardNoteFileRow.appendChild(standardTitleCell);
    standardNoteFileRow.appendChild(standardCreatedAtCell);
    standardNoteFileRow.appendChild(standardActionsCell);
    table.appendChild(standardNoteFileRow);

    noteFiles.forEach(noteFile => {
      const row = document.createElement('tr');
      row.setAttribute('note-file-id', noteFile.id);
      row.className = noteFile.id === this._activeNoteFileId ? 'ui-selected' : '';
      row.addEventListener('click', () => {
        this.handleNoteFileSelected(noteFile.id);
      });

      const titleCell = document.createElement('td');
      titleCell.innerText = noteFile.title;
      const createdAtCell = document.createElement('td');
      createdAtCell.innerText = new Date(noteFile.createdAt).toLocaleDateString();

      const actionsCell = document.createElement('td');

      const editButton = document.createElement('button');
      editButton.innerHTML = '<i class="fas fa-pen"></i>';
      editButton.className = 'edit-note-file-button';
      editButton.addEventListener('click', (event) => {
        event.stopPropagation();
        this.showEditNoteFileDialog(noteFile.id, noteFile.title);
      });

      const deleteButton = document.createElement('button');
      deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i>';
      deleteButton.className = 'delete-note-file-button';
      deleteButton.addEventListener('click', async (event) => {
        event.stopPropagation();
        const noteFileId = event.target.closest('tr').getAttribute('note-file-id');
        this.showDeleteNoteFileConfirmationDialog(noteFileId, noteFile.title);
      });

      actionsCell.appendChild(editButton);
      actionsCell.appendChild(deleteButton);

      row.appendChild(titleCell);
      row.appendChild(createdAtCell);
      row.appendChild(actionsCell);
      table.appendChild(row);
    });

    noteFilesContainer.appendChild(table);
  }

  showDeleteNoteFileConfirmationDialog(noteFileId, noteFileTitle) {
    const dialogBoxTemplate = html`
    <div id="delete-note-file-confirmation-dialog" style="padding-top: 2em;">
      <p>${i18n.t('notes-panel.do-you-really-want-to-delete', { noteFileTitle: noteFileTitle })}</p>
    </div>
    `;

    return new Promise((resolve) => {
      document.querySelector('#boxes').appendChild(dialogBoxTemplate.content);
      const $dialogBox = $('#delete-note-file-confirmation-dialog');
      
      var width = 400;
      var height = 250;
      var draggable = true;
      var position = [55, 120];

      let dialogOptions = uiHelper.getDialogOptions(width, height, draggable, position);
      dialogOptions.title = i18n.t('notes-panel.delete-note-file');
      dialogOptions.dialogClass = 'ezra-dialog delete-note-file-dialog';
      dialogOptions.close = () => {
        $dialogBox.dialog('destroy');
        $dialogBox.remove();
        resolve();
      };

      dialogOptions.buttons = {};

      dialogOptions.buttons[i18n.t('general.cancel')] = function() {
        $dialogBox.dialog('close');
      };

      dialogOptions.buttons[i18n.t('notes-panel.delete-note-file')] = () => {
        (async () => {
          await ipcDb.deleteNoteFile(noteFileId);
          await eventController.publish('on-note-file-deleted', noteFileId);

          if (noteFileId == this._activeNoteFileId) {
            this.setActiveNoteFile(0);
          }

          await this.refreshNoteFiles();
          $dialogBox.dialog('close');
        })();
      };

      $dialogBox.dialog(dialogOptions);
      uiHelper.fixDialogCloseIconOnCordova('delete-note-file-dialog');
    });
  }

  async setActiveNoteFile(noteFileId, publishAndPersist=true) {
    this._activeNoteFileId = noteFileId;

    if (publishAndPersist) {
      await this.saveActiveNoteFile();
      eventController.publish('on-note-file-changed', noteFileId);
    }

    this.refreshNoteFiles();
  }

  showEditNoteFileDialog(noteFileId, currentTitle) {
    const editNoteFileTitle = i18n.t('general.title');

    const dialogBoxTemplate = html`
    <div id="edit-note-file-dialog" style="padding-top: 2em;">
      <label id="edit-note-file-title">${editNoteFileTitle}:</label>
      <input id="edit-note-file-title-value" type="text" value="${currentTitle}" style="width: 25em; border: 1px solid lightgray; border-radius: 4px;"/>
      <div id="edit-note-file-title-error" style="color: red; display: none;">Title already exists</div>
    </div>
    `;

    return new Promise((resolve) => {
      document.querySelector('#boxes').appendChild(dialogBoxTemplate.content);
      const $dialogBox = $('#edit-note-file-dialog');
      
      var width = 400;
      var height = 200;
      var draggable = true;
      var position = [55, 120];

      let dialogOptions = uiHelper.getDialogOptions(width, height, draggable, position);
      dialogOptions.title = i18n.t('notes-panel.edit-note-file');
      dialogOptions.dialogClass = 'ezra-dialog edit-note-file-dialog';
      dialogOptions.close = () => {
        $dialogBox.dialog('destroy');
        $dialogBox.remove();
        resolve();
      };

      let updateNoteFile = async () => {
        let newTitle = document.getElementById('edit-note-file-title-value').value;
        const noteFiles = await ipcDb.getAllNoteFiles();
        const titleExists = noteFiles.some(noteFile => noteFile.title === newTitle && noteFile.id !== noteFileId);

        if (titleExists) {
          document.getElementById('edit-note-file-title-error').style.display = 'block';
        } else {
          await ipcDb.updateNoteFile(noteFileId, newTitle);
          this.refreshNoteFiles();
          $dialogBox.dialog('close');
        }
      };

      dialogOptions.buttons = {};

      dialogOptions.buttons[i18n.t('general.cancel')] = function() {
        $dialogBox.dialog('close');
      };

      dialogOptions.buttons[i18n.t('notes-panel.update-note-file')] = {
        id: 'update-note-file-button',
        text: i18n.t('notes-panel.update-note-file'),
        click: () => {
          updateNoteFile();
        }
      };
      
      document.getElementById('edit-note-file-title-value').addEventListener('keyup', (event) => {
        if (event.key == 'Enter') {
          updateNoteFile();
        }
      });

      $dialogBox.dialog(dialogOptions);
      uiHelper.fixDialogCloseIconOnCordova('edit-note-file-dialog');

      const inputField = document.getElementById('edit-note-file-title-value');
      inputField.focus();
      inputField.setSelectionRange(inputField.value.length, inputField.value.length);
    });
  }
}

module.exports = NoteFilesPanel;
