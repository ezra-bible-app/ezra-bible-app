/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2025 Ezra Bible App Development Team <contact@ezrabibleapp.net>

   Ezra Bible App is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 2 of the License, or
   (at your option) any later version.

   Ezra Bible App is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Bible App. See the file LICENSE.
   If not, see <http://www.gnu.org/licenses/>. */

const { html } = require('../helpers/ezra_helper.js');
const eventController = require('../controllers/event_controller.js');
const verseListController = require('../controllers/verse_list_controller.js');
const AssignLastTagButton = require('../components/tags/assign_last_tag_button.js');
const VerseBox = require('../ui_models/verse_box.js');
const i18nHelper = require('../helpers/i18n_helper.js');

const template = html`
<div class="assign-last-tag-button action-button disabled" i18n="[title]tags.assign-last-tag">
  <i class="fas fa-tag"></i>
</div>

<div class="separator"></div>

<div class="edit-note-button action-button disabled" i18n="[title]bible-browser.edit-note">
  <i class="fas fa-comment-alt"></i>
</div>

<div class="delete-note-button action-button disabled" i18n="[title]bible-browser.delete-note">
  <i class="fas fa-trash-alt"></i>
</div>

<div class="separator"></div>

<div class="show-context-button action-button disabled" i18n="[title]general.context">
  <i class="fas fa-arrows-alt-v"></i>
</div>

<div class="separator"></div>

<div class="open-in-new-tab-button action-button" i18n="[title]bible-browser.open-in-new-tab">
  <i class="fas fa-arrow-up-right-from-square"></i>
</div>
`;

var floatingContextMenuInitDone = false;

/**
 * The FloatingVerseContextMenu component implements a modern, icon-only menu that appears
 * automatically when verses are selected and is positioned near the selected verse.
 * 
 * @category Component
 */
class FloatingVerseContextMenu extends HTMLElement {
  constructor() {
    super();

    this.assignLastTagButton = new AssignLastTagButton();
    this.menuElement = null;
    this.hideTimeout = null;
    
    eventController.subscribe('on-verses-selected', async (selectionDetails) => {
      await this.handleVerseSelection(selectionDetails);
    });

    eventController.subscribeMultiple(['on-tab-selected', 'on-tab-search-reset', 'on-body-clicked'], () => {
      this.hide();
    });

    eventController.subscribeMultiple(['on-note-created', 'on-note-deleted'], () => {
      let selection = { 'selectedElements': app_controller.verse_selection.getSelectedVerseBoxes() };
      this.toggleButtons(selection);
    });
  }

  connectedCallback() {
    this.innerHTML = template.innerHTML;
    this.id = 'floating-verse-context-menu';
    this.menuElement = this;
    this.style.display = 'none'; // Ensure it's hidden initially
    this.initContextButtons();
  }

  async handleVerseSelection(selectionDetails) {
    if (selectionDetails.selectedElements.length > 0) {
      this.toggleButtons(selectionDetails);
      await this.positionMenu(selectionDetails.selectedElements[0]);
      this.show();
    } else {
      this.hide();
    }
  }

  toggleButtons(selectionDetails) {
    const currentTab = app_controller.tab_controller.getTab();

    if (selectionDetails.selectedElements.length > 0) {
      this.enableButtons();

      if (currentTab.isVerseList()) {
        this.enableContextButton();
      } else {
        this.disableContextButton();
      }

      // Update assign last tag button
      const assignLastTagButton = this.querySelector('.assign-last-tag-button');
      const hasLastTag = tags_controller.tag_store.latest_tag_id !== null;
      
      if (hasLastTag) {
        assignLastTagButton.classList.remove('disabled');
      } else {
        assignLastTagButton.classList.add('disabled');
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
    } else {
      this.disableButtons();
    }
  }

  async positionMenu(verseElement) {
    const verseRect = verseElement.getBoundingClientRect();
    const menuWidth = this.offsetWidth;
    const menuHeight = this.offsetHeight;
    
    // Position the menu centered above the verse
    let top = verseRect.top - menuHeight - 10;
    let left = verseRect.left + (verseRect.width / 2) - (menuWidth / 2);
    
    // Make sure the menu stays within the viewport
    if (top < 10) {
      // Position below the verse if there's no room above
      top = verseRect.bottom + 10;
    }
    
    // Ensure the menu doesn't go off-screen horizontally
    if (left < 10) {
      left = 10;
    } else if (left + menuWidth > window.innerWidth - 10) {
      left = window.innerWidth - menuWidth - 10;
    }
    
    this.style.top = `${top}px`;
    this.style.left = `${left}px`;
  }

  show() {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
    
    this.style.display = 'flex'; // Set display before adding visible class for smooth transition
    
    requestAnimationFrame(() => {
      this.classList.add('visible');
    });
  }

  hide() {
    this.classList.remove('visible');
    
    // Wait for transition to complete before setting display: none
    this.hideTimeout = setTimeout(() => {
      this.style.display = 'none';
      this.hideTimeout = null;
    }, 200);
  }

  enableButtons() {
    const editNoteButton = this.querySelector('.edit-note-button');
    const deleteNoteButton = this.querySelector('.delete-note-button');
    
    editNoteButton.classList.remove('disabled');
    deleteNoteButton.classList.remove('disabled');
  }

  disableButtons() {
    const editNoteButton = this.querySelector('.edit-note-button');
    const deleteNoteButton = this.querySelector('.delete-note-button');
    const contextButton = this.querySelector('.show-context-button');
    
    editNoteButton.classList.add('disabled');
    deleteNoteButton.classList.add('disabled');
    contextButton.classList.add('disabled');
  }

  enableDeleteNoteButton() {
    const deleteNoteButton = this.querySelector('.delete-note-button');
    deleteNoteButton.classList.remove('disabled');
  }

  disableDeleteNoteButton() {
    const deleteNoteButton = this.querySelector('.delete-note-button');
    deleteNoteButton.classList.add('disabled');
  }

  enableContextButton() {
    const contextButton = this.querySelector('.show-context-button');
    contextButton.classList.remove('disabled');
  }

  disableContextButton() {
    const contextButton = this.querySelector('.show-context-button');
    contextButton.classList.add('disabled');
  }

  initContextButtons() {
    if (floatingContextMenuInitDone) {
      return;
    }

    const editNoteButton = this.querySelector('.edit-note-button');
    const deleteNoteButton = this.querySelector('.delete-note-button');
    const showContextButton = this.querySelector('.show-context-button');
    const openInNewTabButton = this.querySelector('.open-in-new-tab-button');
    const assignLastTagButton = this.querySelector('.assign-last-tag-button');

    assignLastTagButton.addEventListener('click', async (event) => {
      event.stopPropagation();
      
      if (!event.currentTarget.classList.contains('disabled')) {
        tags_controller.assignLastTag();
      }
    });

    // Initialize the assign last tag button with icon-only mode
    this.assignLastTagButton.init(undefined, true);

    editNoteButton.addEventListener('click', (event) => {
      event.stopPropagation();

      if (!event.currentTarget.classList.contains('disabled')) {
        app_controller.notes_controller.editVerseNotesForCurrentlySelectedVerse();
      }
    });

    deleteNoteButton.addEventListener('click', (event) => {
      event.stopPropagation();

      if (!event.currentTarget.classList.contains('disabled')) {
        app_controller.notes_controller.deleteVerseNotesForCurrentlySelectedVerse();
      }
    });

    showContextButton.addEventListener('click', (event) => {
      event.stopPropagation();

      if (!event.currentTarget.classList.contains('disabled')) {
        app_controller.verse_context_controller.handleButtonClick();
      }
    });

    openInNewTabButton.addEventListener('click', async (event) => {
      event.stopPropagation();

      if (!event.currentTarget.classList.contains('disabled')) {
        const selectedVerseBox = app_controller.verse_selection.getFirstSelectedVerseBox();

        if (selectedVerseBox) {
          const tab = app_controller.tab_controller.getTab();
          const bibleTranslationId = tab.getBibleTranslationId();
          const secondBibleTranslationId = tab.getSecondBibleTranslationId();

          const verseBox = new VerseBox(selectedVerseBox);
          const book = verseBox.getBibleBookShortTitle();
          const separator = await i18nHelper.getReferenceSeparator(bibleTranslationId);

          const chapter = verseBox.getChapter(separator);
          const absoluteVerseNr = verseBox.getAbsoluteVerseNumber();

          const bookLongTitle = await ipcDb.getBookLongTitle(book);
          const bookTitleTranslation = await ipcDb.getBookTitleTranslation(book);

          const newTab = await app_controller.tab_controller.addTab();
          newTab.setBibleTranslationId(bibleTranslationId);
          newTab.setSecondBibleTranslationId(secondBibleTranslationId);

          const instantLoad = await app_controller.translation_controller.isInstantLoadingBook(bibleTranslationId,
                                                                                             secondBibleTranslationId,
                                                                                             book);

          await app_controller.text_controller.loadBook(book,
                                                      bookTitleTranslation,
                                                      bookLongTitle,
                                                      instantLoad,
                                                      chapter);

          const verseList = verseListController.getCurrentVerseList()[0];
          const verseElement = verseList.querySelector(`.verse-nr-${absoluteVerseNr}`);
          const verseTextContainer = verseElement.querySelector('.verse-text-container');

          if (verseTextContainer) {
            verseElement.scrollIntoView();
            await app_controller.verse_selection.setVerseAsSelection(verseTextContainer);
          }
        }
      }
    });

    this.assignLastTagButton.init();
    
    floatingContextMenuInitDone = true;
  }
}

customElements.define('floating-verse-context-menu', FloatingVerseContextMenu);
module.exports = FloatingVerseContextMenu;