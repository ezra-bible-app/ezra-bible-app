/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2025 Ezra Bible App Development Team <contact@ezrabibleapp.net>

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
const VerseBox = require("../ui_models/verse_box.js");

const template = html`
<style>
#verse-context-menu .fg-button {
  margin: 0.8em;
  padding: 0.5em;
}

#verse-context-menu .fg-button .fas {
  margin-right: 0.3em;
}
</style>

<div class="assign-last-tag-button fg-button ui-state-default ui-corner-all ui-state-disabled">
  <span i18n="tags.assign-last-tag"></span>
</div>

<div class="edit-note-button fg-button ui-state-default ui-corner-all ui-state-disabled">
  <i class="fas fa-comment-alt"></i>
  <span i18n="bible-browser.edit-note"></span>
</div>

<div class="delete-note-button fg-button ui-state-default ui-corner-all ui-state-disabled">
  <i class="fas fa-trash-alt"></i>
  <span i18n="bible-browser.delete-note"></span>
</div>

<div class="show-context-button fg-button ui-state-default ui-corner-all ui-state-disabled">
  <i class="fas fa-arrows-alt-v"></i><i class="fas fa-align-justify"></i>
  <span i18n="general.context"></span>
</div>

<div class="open-chapter-in-new-tab-button fg-button ui-state-default ui-corner-all ui-state-disabled">
  <i class="fas fa-book-open"></i>
  <span i18n="bible-browser.open-verse-in-new-tab"></span>
</div>
`;

var verseContextMenuInitDone = false;

class VerseContextMenu extends HTMLElement {
  constructor() {
    super();

    this.assignLastTagButton = new AssignLastTagButton();

    eventController.subscribe('on-verses-selected', (selectionDetails) => {
      this.toggleButtons(selectionDetails);
    });

    eventController.subscribe('on-tab-selected', (tabIndex) => {
      this.hideVerseContextMenuButton(tabIndex);
    });

    eventController.subscribeMultiple(['on-note-created', 'on-note-deleted'], () => {
      let selection = { 'selectedElements' : app_controller.verse_selection.getSelectedVerseBoxes() };
      this.toggleButtons(selection);
    });
  }

  connectedCallback() {
    this.innerHTML = template.innerHTML;
    this.initVerseContextButtons();
  }

  toggleButtons(selectionDetails) {
    var currentTab = app_controller.tab_controller.getTab();

    if (selectionDetails.selectedElements.length > 0) {
      this.enableVerseButtons();

      if (currentTab.isVerseList()) {
        this.enableContextButton();
      } else {
        this.disableContextButton();
      }

      const selectedVerseBoxes = app_controller.verse_selection.getSelectedVerseBoxes();

      if (selectedVerseBoxes.length > 0) {
        const firstVerseBox = selectedVerseBoxes[0];

        if (firstVerseBox != null && typeof(firstVerseBox.querySelector) == 'function') {
          const notesInfo = firstVerseBox.querySelector('.notes-info');
          
          if (notesInfo.classList != null && notesInfo.classList.contains('visible')) {
            this.enableDeleteNoteButton();
          } else {
            this.disableDeleteNoteButton();
          }
        } else {
          this.disableDeleteNoteButton();
        }
      } else {
        this.disableDeleteNoteButton();
      }

      this.enableOpenChapterButton();

    } else {
      this.disableVerseButtons();
    }
  }

  set currentTabIndex(tabIndex=undefined) {
    var currentVerseListMenu = app_controller.getCurrentVerseListMenu(tabIndex)[0];

    if (currentVerseListMenu != null) {
      var verseContextMenuButton = currentVerseListMenu.querySelector('.verse-context-menu-button');

      $(verseContextMenuButton).unbind('click').bind('click', (event) => {
        event.stopPropagation();

        var verseContextMenu = $('#verse-context-menu');

        if (!event.target.closest('.fg-button').classList.contains('ui-state-disabled')) {
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
  }

  set hidden(value) {
    if (value == true) {
      this.hideVerseContextMenuButton();
    }
  }

  hideVerseContextMenuButton(tabIndex=undefined) {
    var currentVerseListMenu = app_controller.getCurrentVerseListMenu(tabIndex);

    if (currentVerseListMenu != null) {
      var verseContextMenuButton = currentVerseListMenu[0].querySelector('.verse-context-menu-button');
      verseContextMenuButton.classList.remove('ui-state-active');
      document.getElementById('verse-context-menu').style.display = 'none';
    }

    this.verseContextMenuOpened = false;
  }

  enableVerseButtons() {
    var verseContextMenu = document.getElementById('verse-context-menu');
    var editNoteButton = verseContextMenu.querySelector('.edit-note-button');
    var deleteNoteButton = verseContextMenu.querySelector('.delete-note-button');
    editNoteButton.classList.remove('ui-state-disabled');
    deleteNoteButton.classList.remove('ui-state-disabled');
  }

  disableVerseButtons() {
    var verseContextMenu = document.getElementById('verse-context-menu');

    var editNoteButton = verseContextMenu.querySelector('.edit-note-button');
    var deleteNoteButton = verseContextMenu.querySelector('.delete-note-button');
    var contextButton = verseContextMenu.querySelector('.show-context-button');

    editNoteButton.classList.add('ui-state-disabled');
    deleteNoteButton.classList.add('ui-state-disabled');
    contextButton.classList.remove('ui-state-disabled');
  }

  enableDeleteNoteButton() {
    var verseContextMenu = document.getElementById('verse-context-menu');
    var deleteNoteButton = verseContextMenu.querySelector('.delete-note-button');
    deleteNoteButton.classList.remove('ui-state-disabled');
  }

  disableDeleteNoteButton() {
    var verseContextMenu = document.getElementById('verse-context-menu');
    var deleteNoteButton = verseContextMenu.querySelector('.delete-note-button');
    deleteNoteButton.classList.add('ui-state-disabled');
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

  enableOpenChapterButton() {
    var verseContextMenu = document.getElementById('verse-context-menu');
    var openChapterButton = verseContextMenu.querySelector('.open-chapter-in-new-tab-button');
    openChapterButton.classList.remove('ui-state-disabled');
  }

  disableOpenChapterButton() {
    var verseContextMenu = document.getElementById('verse-context-menu');
    var openChapterButton = verseContextMenu.querySelector('.open-chapter-in-new-tab-button');
    openChapterButton.classList.add('ui-state-disabled');
  }

  initVerseContextButtons() {
    if (verseContextMenuInitDone) {
      return;
    }

    var verseContextMenu = document.getElementById('verse-context-menu');
    var editNoteButton = verseContextMenu.querySelector('.edit-note-button');
    var deleteNoteButton = verseContextMenu.querySelector('.delete-note-button');
    var openChapterButton = verseContextMenu.querySelector('.open-chapter-in-new-tab-button');

    editNoteButton.addEventListener('click', (event) => {
      event.stopPropagation();

      if (!event.target.classList.contains('ui-state-disabled')) {
        app_controller.hideAllMenus();
        app_controller.notes_controller.editVerseNotesForCurrentlySelectedVerse();
      }
    });

    deleteNoteButton.addEventListener('click', (event) => {
      event.stopPropagation();

      if (!event.target.classList.contains('ui-state-disabled')) {
        app_controller.hideAllMenus();
        app_controller.notes_controller.deleteVerseNotesForCurrentlySelectedVerse();
      }
    });

    openChapterButton.addEventListener('click', async (event) => {
      event.stopPropagation();

      if (!event.target.classList.contains('ui-state-disabled')) {
        app_controller.hideAllMenus();
        const selectedVerseBox = app_controller.verse_selection.getFirstSelectedVerseBox();

        if (selectedVerseBox) {
          const verseBox = new VerseBox(selectedVerseBox);
          const book = verseBox.getBibleBookShortTitle();
          const chapter = verseBox.getChapter();
          const verse = verseBox.getVerseNumber();

          await app_controller.tab_controller.addTab();
          const newTab = app_controller.tab_controller.getTab();
          newTab.setBook(book, book, book, chapter);

          await app_controller.text_controller.requestTextUpdate(
            newTab.elementId,
            book,
            null,
            null,
            null,
            null,
            null,
            chapter,
            true
          );

          const verseElement = document.querySelector(`#${newTab.elementId} .verse-nr-${verse}`);

          if (verseElement) {
            verseElement.scrollIntoView();
            verseElement.querySelector('.verse-text-container').classList.add('ui-selected');
          }
        }
      }
    });

    this.assignLastTagButton.init();

    verseContextMenuInitDone = true;
  }
}

customElements.define('verse-context-menu', VerseContextMenu);
module.exports = VerseContextMenu;