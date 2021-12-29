/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2021 Ezra Bible App Development Team <contact@ezrabibleapp.net>

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
const eventController = require('../controllers/event_controller.js');
const AssignLastTagButton = require("../components/tags/assign_last_tag_button.js");

const template = html`
<style>
#verse-context-menu .fg-button {
  margin: 0.8em;
  padding: 0.5em;
}
</style>

<div class="assign-last-tag-button fg-button ui-state-default ui-corner-all ui-state-disabled">
  <span i18n="tags-toolbar.assign-last-tag"></span>
</div>

<div class="edit-note-button fg-button ui-state-default ui-corner-all ui-state-disabled">
  <i class="fas fa-comment-alt"></i>
  <span i18n="bible-browser.edit-note"></span>
</div>

<div class="copy-clipboard-button fg-button ui-state-default ui-corner-all ui-state-disabled">
  <i class="fas fa-clipboard"></i>
  <span i18n="bible-browser.copy"></span>
</div>

<div class="show-context-button fg-button ui-state-default ui-corner-all ui-state-disabled">
  <i class="fas fa-arrows-alt-v"></i><i class="fas fa-align-justify"></i>
  <span i18n="tags-toolbar.context"></span>
</div>
`;

class VerseContextMenu extends HTMLElement {
  constructor() {
    super();
    this.innerHTML = template.innerHTML;
    this.assignLastTagButton = new AssignLastTagButton();

    eventController.subscribe('on-verses-selected', (selectionDetails) => {
      var currentTab = app_controller.tab_controller.getTab();

      if (selectionDetails.selectedElements.length > 0) {
        this.enableVerseButtons();

        if (currentTab.isVerseList()) {
          this.enableContextButton();
        } else {
          this.disableContextButton();
        }
      } else {
        this.disableVerseButtons();
      }
    });

    this.initVerseContextButtons();
  }

  set currentTabIndex(tabIndex=undefined) {
    var currentVerseListMenu = app_controller.getCurrentVerseListMenu(tabIndex);
    var verseContextMenuButton = currentVerseListMenu[0].querySelector('.verse-context-menu-button');

    verseContextMenuButton.addEventListener('click', (event) => {
      event.stopPropagation();

      var verseContextMenu = $('#verse-context-menu');

      if (!event.target.classList.contains('ui-state-disabled')) {
        if (this.verseContextMenuOpened) {
          this.hidden = true;
          this.verseContextMenuOpened = false;
        } else {
          app_controller.hideAllMenus();
          uiHelper.showButtonMenu($(verseContextMenuButton), verseContextMenu);
          uiHelper.configureButtonStyles(document.getElementById('verse-context-menu'));
          this.verseContextMenuOpened = true;
        }
      }
    });
  }

  set hidden(value) {
    if (value == true) {
      var currentVerseListMenu = app_controller.getCurrentVerseListMenu();
      var verseContextMenuButton = currentVerseListMenu[0].querySelector('.verse-context-menu-button');
      verseContextMenuButton.classList.remove('ui-state-active');
      document.getElementById('verse-context-menu').style.display = 'none';
      this.verseContextMenuOpened = false;
    }
  }

  enableVerseButtons() {
    var verseContextMenu = document.getElementById('verse-context-menu');
    var editNoteButton = verseContextMenu.querySelector('.edit-note-button');
    var copyButton = verseContextMenu.querySelector('.copy-clipboard-button');
    editNoteButton.classList.remove('ui-state-disabled');
    copyButton.classList.remove('ui-state-disabled');
  }

  disableVerseButtons() {
    var verseContextMenu = document.getElementById('verse-context-menu');

    var editNoteButton = verseContextMenu.querySelector('.edit-note-button');
    var copyButton = verseContextMenu.querySelector('.copy-clipboard-button');
    var contextButton = verseContextMenu.querySelector('.show-context-button');

    editNoteButton.classList.add('ui-state-disabled');
    copyButton.classList.add('ui-state-disabled');
    contextButton.classList.remove('ui-state-disabled');
  }

  enableContextButton() {
    var verseContextMenu = document.getElementById('verse-context-menu');
    var contextButton = verseContextMenu.querySelector('.show-context-button');
    contextButton.classList.remove('ui-state-disabled');
  }

  disableContextButton() {
    var verseContextMenu = document.getElementById('verse-context-menu');
    var contextButton = verseContextMenu.querySelector('.show-context-button');
    contextButton.classList.add('ui-state-disabled');
  }

  initVerseContextButtons() {
    var verseContextMenu = document.getElementById('verse-context-menu');
    var editNoteButton = verseContextMenu.querySelector('.edit-note-button');
    var copyButton = verseContextMenu.querySelector('.copy-clipboard-button');

    editNoteButton.addEventListener('click', (event) => {
      event.stopPropagation();

      if (!event.target.classList.contains('ui-state-disabled')) {
        app_controller.hideAllMenus();
        app_controller.notes_controller.editVerseNotesForCurrentlySelectedVerse();
      }
    });

    copyButton.addEventListener('click', (event) => {
      event.stopPropagation();

      if (!event.target.classList.contains('ui-state-disabled')) {
        app_controller.hideAllMenus();
        app_controller.verse_selection.copySelectedVerseTextToClipboard();
      }
    });

    this.assignLastTagButton.init();
  }
}

customElements.define('verse-context-menu', VerseContextMenu);
module.exports = VerseContextMenu;