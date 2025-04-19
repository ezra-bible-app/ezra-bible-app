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
const clipboardController = require('../controllers/clipboard_controller.js');
const VerseBox = require('../ui_models/verse_box.js');
const i18nHelper = require('../helpers/i18n_helper.js');

const template = html`
<style>
  #verse-context-menu {
    position: absolute;
    display: none;
    background-color: var(--background-color);
    border-radius: 6px;
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
    padding: 0.5em;
    z-index: 1000;
    transition: opacity 0.2s ease-in-out;
    opacity: 0;
  }

  .darkmode--activated #verse-context-menu {
    background-color: var(--background-color);
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.5);
  }

  #verse-context-menu.visible {
    display: flex;
    opacity: 1;
  }

  #verse-context-menu .action-button {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 2em;
    height: 2em;
    margin: 0.2em;
    border-radius: 50%;
    cursor: pointer;
    color: var(--text-color);
    background-color: var(--widget-bg-color);
    transition: background-color 0.2s ease-in-out;
  }

  #verse-context-menu .action-button:hover:not(.disabled) {
    background-color: var(--accent-color);
    color: white;
  }

  .darkmode--activated #verse-context-menu .action-button:hover:not(.disabled) {
    background-color: var(--accent-color-darkmode);
  }

  #verse-context-menu .action-button.disabled {
    display: none;
  }

  @media (max-width: 450px), (max-height: 450px) {
    /* Hide the open-in-new-tab button on mobile */
    #verse-context-menu .open-in-new-tab-button {
      display: none;
    }
  }

  .fa-stack {
    height: 1.5em;
    line-height: 1.8em;
  }

  .fa-stack-1x {
    text-align: right;
    left: -10px;
  }
</style>

<div class="assign-last-tag-button action-button disabled" i18n="[title]tags.assign-last-tag">
  <span class="fa-stack">
    <i class="fas fa-clock"></i>
    <i class="fas fa-tag fa-stack-1x"></i>
  </span>
</div>

<div class="copy-button action-button disabled" i18n="[title]bible-browser.copy">
  <i class="fas fa-copy"></i>
</div>

<div class="edit-note-button action-button disabled" i18n="[title]bible-browser.edit-note">
  <i class="fas fa-comment-alt"></i>
</div>

<div class="delete-note-button action-button disabled" i18n="[title]bible-browser.delete-note">
  <span class="fa-stack">
    <i class="fas fa-trash-alt"></i> <!-- Background trash icon -->
    <i class="fas fa-comment-alt fa-stack-1x"></i> <!-- Overlay comment icon -->
  </span>
</div>

<div class="show-context-button2 action-button disabled" i18n="[title]general.context">
  <i class="fas fa-arrows-alt-v"></i>
</div>

<div class="open-in-new-tab-button action-button" i18n="[title]bible-browser.open-in-new-tab">
  <i class="fas fa-arrow-up-right-from-square"></i>
</div>
`;

var contextMenuInitDone = false;

/**
 * The VerseContextMenu component implements a modern, icon-only menu that appears
 * automatically when verses are selected and is positioned near the selected verse.
 * 
 * @category Component
 */
class VerseContextMenu extends HTMLElement {
  constructor() {
    super();

    this.menuElement = null;
    this.hideTimeout = null;
    this.currentVerseElement = null;
    this.scrollHandler = null;
    this.resizeHandler = null;
    this.startupComplete = false;
    this.tabSwitchInProgress = false;
    this.isCurrentlyVisible = false;
    this.lastScrollTime = 0;
    this.scrollThrottleDelay = 100; // milliseconds
    this.cachedMenuHeight = null; // Store the menu height after first calculation
    this.cachedMenuWidth = null;  // Store the menu width after first calculation
    
    eventController.subscribe('on-verses-selected', async (selectionDetails) => {
      // Don't respond to verse selection events during tab switching
      if (!this.tabSwitchInProgress) {
        await this.handleVerseSelection(selectionDetails);
      }
    });

    eventController.subscribe('on-tab-selected', async (tabIndex) => {
      this.tabSwitchInProgress = true;
      this.hide(true); // Fully hide menu and clean up event handlers
      
      // Add a small delay to ensure all other tab-switch-related operations are complete
      setTimeout(async () => {
        // Check if there are verses selected in the newly selected tab
        if (this.startupComplete || app_controller.isStartupCompleted()) {
          this.startupComplete = true; // In case it wasn't set yet but app_controller reports it's complete
          
          const selectedVerseBoxes = app_controller.verse_selection.getSelectedVerseBoxes();
          if (selectedVerseBoxes.length > 0) {
            await this.handleVerseSelection({
              selectedElements: selectedVerseBoxes,
              selectedVerseTags: app_controller.verse_selection.getCurrentSelectionTags(),
              tabIndex: tabIndex
            });
          }
        }
        
        // Re-enable verse selection events
        this.tabSwitchInProgress = false;
      }, 300); // 300ms delay to let the tab switch complete
    });

    eventController.subscribe('on-tab-search-reset', () => {
      this.hide();
    });

    eventController.subscribe('on-hide-menu-request', () => {
      this.hide();
    });

    eventController.subscribe('on-menu-opened', (menuType) => {
      this.hide();
    });

    eventController.subscribeMultiple(['on-note-created', 'on-note-deleted'], () => {
      let selection = { 'selectedElements': app_controller.verse_selection.getSelectedVerseBoxes() };
      this.toggleButtons(selection);
    });
    
    eventController.subscribe('on-startup-completed', async () => {
      this.startupComplete = true;
      
      // Check if verses are already selected and show menu if needed
      const selectedVerseBoxes = app_controller.verse_selection.getSelectedVerseBoxes();
      if (selectedVerseBoxes.length > 0) {
        await this.handleVerseSelection({
          selectedElements: selectedVerseBoxes,
          selectedVerseTags: app_controller.verse_selection.getCurrentSelectionTags()
        });
      }
    });
  }

  connectedCallback() {
    this.innerHTML = template.innerHTML;
    this.id = 'verse-context-menu';
    this.menuElement = this;
    this.style.display = 'none'; // Ensure it's hidden initially
    this.initContextButtons();
  }

  async handleVerseSelection(selectionDetails) {
    if (selectionDetails.selectedElements.length > 0) {
      this.toggleButtons(selectionDetails);
      this.currentVerseElement = selectionDetails.selectedElements[0];
      
      // Only show menu if startup is complete
      if (this.startupComplete || app_controller.isStartupCompleted()) {
        this.startupComplete = true; // In case it wasn't set yet but app_controller reports it's complete
        
        await this.positionMenu(this.currentVerseElement);
        if (this.isVerseElementVisible(this.currentVerseElement)) {
          this.show();
          this.addScrollHandler();
          this.addResizeHandler();
        }
      }
    } else {
      this.hide();
      this.removeScrollHandler();
      this.removeResizeHandler();
    }
  }

  toggleButtons(selectionDetails) {
    const currentTab = app_controller.tab_controller.getTab();

    if (selectionDetails.selectedElements.length > 0) {
      this.enableButtons();

      if (currentTab.isVerseList()) {
        // Only enable context button if the selected verse is not already a context verse
        const firstVerseBox = selectionDetails.selectedElements[0];
        if (firstVerseBox && firstVerseBox.classList.contains('verse-context')) {
          this.disableContextButton();
        } else {
          this.enableContextButton();
        }
      } else {
        this.disableContextButton();
      }

      // Update assign last tag button
      const hasLastTag = tags_controller.tag_store.latest_tag_id !== null;
      const assignLastTagButton = this.querySelector('.assign-last-tag-button');
      
      if (hasLastTag) {
        assignLastTagButton.classList.remove('disabled');
      } else {
        assignLastTagButton.classList.add('disabled');
      }

      // Enable copy button
      const copyButton = this.querySelector('.copy-button');
      copyButton.classList.remove('disabled');

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
    // If startup is not complete, don't try to position the menu
    if (!this.startupComplete && !app_controller.isStartupCompleted()) {
      // Position at a safe default location until startup is complete
      this.style.top = '50px';
      this.style.left = '50px';
      return;
    }
    
    // Find the verse-text-container inside the verse box
    const verseTextContainer = verseElement.querySelector('.verse-text-container');
    const verseBox = verseElement.closest('.verse-box');
    
    // Get the rectangles
    const verseTextContainerRect = verseTextContainer ? verseTextContainer.getBoundingClientRect() : null;
    const verseBoxRect = verseBox.getBoundingClientRect();
    
    // Calculate menu dimensions only once and cache them
    if (this.cachedMenuHeight === null || this.cachedMenuWidth === null) {
      // To get accurate dimensions, we need to temporarily make the menu visible
      // but position it off-screen so users don't see it
      const originalDisplay = this.style.display;
      const originalVisibility = this.style.visibility;
      const originalPosition = this.style.position;
      
      this.style.visibility = 'hidden';
      this.style.position = 'absolute';
      this.style.display = 'flex';
      this.style.left = '-9999px';
      this.style.top = '-9999px';
      
      // Give browser time to render the menu so we can measure it
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Cache the menu dimensions
      this.cachedMenuHeight = this.offsetHeight;
      this.cachedMenuWidth = this.offsetWidth;
      
      // Restore original styles
      this.style.visibility = originalVisibility;
      this.style.position = originalPosition;
      this.style.display = originalDisplay;
    }
    
    // Calculate position
    // Position the menu above the verse box
    let top = verseBoxRect.top - this.cachedMenuHeight;
    
    // Horizontal alignment with verse-text-container if available
    let left = verseTextContainer && verseTextContainerRect ? verseTextContainerRect.left : verseBoxRect.left;
    
    // If there's not enough space above, position below the verse box
    if (top < 10) {
      top = verseBoxRect.bottom; // 10px gap below the verse
    }
    
    // Ensure the menu doesn't go off-screen horizontally
    if (left < 10) {
      left = 10;
    } else if (left + this.cachedMenuWidth > window.innerWidth - 10) {
      left = window.innerWidth - this.cachedMenuWidth - 10;
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

  hide(cleanup = true) {
    this.classList.remove('visible');
    
    // Clean up event listeners only if specifically requested
    if (cleanup) {
      this.removeScrollHandler();
      this.removeResizeHandler();
      this.currentVerseElement = null;
    }
    
    // Wait for transition to complete before setting display: none
    this.hideTimeout = setTimeout(() => {
      this.style.display = 'none';
      this.hideTimeout = null;
    }, 200);
  }

  disconnectedCallback() {
    // Clean up event listeners when component is removed from DOM
    this.removeScrollHandler();
    this.removeResizeHandler();
    
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
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
    const contextButton = this.querySelector('.show-context-button2');
    const copyButton = this.querySelector('.copy-button');
    
    editNoteButton.classList.add('disabled');
    deleteNoteButton.classList.add('disabled');
    contextButton.classList.add('disabled');
    copyButton.classList.add('disabled');
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
    const contextButton = this.querySelector('.show-context-button2');
    contextButton.classList.remove('disabled');
  }

  disableContextButton() {
    const contextButton = this.querySelector('.show-context-button2');
    contextButton.classList.add('disabled');
  }

  initContextButtons() {
    if (contextMenuInitDone) {
      return;
    }

    const editNoteButton = this.querySelector('.edit-note-button');
    const deleteNoteButton = this.querySelector('.delete-note-button');
    const showContextButton = this.querySelector('.show-context-button2');
    const openInNewTabButton = this.querySelector('.open-in-new-tab-button');
    const assignLastTagButton = this.querySelector('.assign-last-tag-button');
    const copyButton = this.querySelector('.copy-button');

    assignLastTagButton.addEventListener('click', async (event) => {
      event.stopPropagation();
      
      if (!event.currentTarget.classList.contains('disabled')) {
        tags_controller.assignLastTag();
      }
    });

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

    copyButton.addEventListener('click', (event) => {
      if (!event.currentTarget.classList.contains('disabled')) {
        clipboardController.copyTextToClipboard();
      }
    });

    contextMenuInitDone = true;
  }

  addScrollHandler() {
    if (this.scrollHandler) {
      return;
    }

    this.scrollHandler = () => {
      if (this.currentVerseElement) {
        // Check if verse is visible before positioning/showing menu
        if (this.isVerseElementVisible(this.currentVerseElement)) {
          this.positionMenu(this.currentVerseElement);
          this.show();
        } else {
          this.hide(false); // Hide menu but keep scroll handler active
        }
      }
    };

    window.addEventListener('scroll', this.scrollHandler, true);
  }

  removeScrollHandler() {
    if (this.scrollHandler) {
      window.removeEventListener('scroll', this.scrollHandler, true);
      this.scrollHandler = null;
    }
  }

  addResizeHandler() {
    if (this.resizeHandler) {
      return;
    }

    this.resizeHandler = () => {
      if (this.currentVerseElement) {
        if (this.isVerseElementVisible(this.currentVerseElement)) {
          this.positionMenu(this.currentVerseElement);
        } else {
          this.hide();
        }
      }
    };

    window.addEventListener('resize', this.resizeHandler);
  }

  removeResizeHandler() {
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }
  }

  isVerseElementVisible(verseElement) {
    if (!verseElement) {
      return false;
    }
    
    const rect = verseElement.getBoundingClientRect();
    const verseBox = verseElement.closest('.verse-box');
    const verseBoxRect = verseBox ? verseBox.getBoundingClientRect() : rect;
    
    // Check if the verse box is partly or fully outside the viewport
    const isPartlyOutside = 
      verseBoxRect.top < 0 ||
      verseBoxRect.left < 0 ||
      verseBoxRect.bottom > window.innerHeight ||
      verseBoxRect.right > window.innerWidth;
      
    // Check if the verse box is fully outside the viewport
    const isFullyOutside = 
      verseBoxRect.bottom < 0 ||
      verseBoxRect.top > window.innerHeight ||
      verseBoxRect.right < 0 ||
      verseBoxRect.left > window.innerWidth;
    
    // Return false if the verse is partly or fully outside the viewport
    return !(isPartlyOutside || isFullyOutside);
  }
}

customElements.define('verse-context-menu', VerseContextMenu);
module.exports = VerseContextMenu;
