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

const eventController = require('../controllers/event_controller.js');
const i18nHelper = require('../helpers/i18n_helper.js');
const cacheController = require('../controllers/cache_controller.js');
const swordModuleHelper = require('../helpers/sword_module_helper.js');

/**
 * The BookSelectionMenu component implements all event handling for the book selection menu.
 * 
 * @category Component
 */
class BookSelectionMenu {
  constructor() {
    this.book_menu_is_opened = false;
    this.init_completed = false;
    this.recentPassagesKey = 'recentPassages';
  }

  async init() {
    if (this.init_completed) return;

    const menuBookList = document.querySelector('#app-container #book-selection-menu-book-list');
    menuBookList.addEventListener('click', app_controller.handleBodyClick);

    var cachedHtml = await cacheController.getCachedItem('bookSelectionMenuCache');

    if (cachedHtml) {
      menuBookList.innerHTML = cachedHtml;
    } else {
      console.log("Localizing book selection menu ...");
      await this.localizeBookSelectionMenu();
    }

    document.getElementById('bookMenuBackButton').addEventListener('click', () => {
      setTimeout(() => { this.hideBookMenu(); }, 100);
    });

    this.initLinks();
    this.subscribeForEvents();
    await this.renderRecentPassages(); // Render recent passages on initialization
    this.init_completed = true;
  }

  initLinks() {
    var menu = $('#app-container').find('#book-selection-menu-book-list');
    var links = menu.find('a');

    for (var i = 0; i < links.length; i++) {
      var current_link = $(links[i]);

      current_link.click((event) => {
        event.preventDefault();
        event.stopPropagation();

        var current_link_href = $(event.target).attr('href');
        var current_book_title = $(event.target).html();
        var current_reference_book_title = $(event.target).attr('book-name');

        this.selectBibleBook(current_link_href, current_book_title, current_reference_book_title);
      });
    }
  }

  subscribeForEvents() {
    eventController.subscribe('on-translation1-changed', async () => {
      await this.updateAvailableBooks();
    });

    eventController.subscribe('on-translation-added', async (moduleCode) => {
      const bibleModules = await ipcNsi.getAllLocalModules('BIBLE');

      if (bibleModules.length == 1) { // First Bible module added. In this case we need to update the book list
        await this.updateAvailableBooks(undefined, moduleCode);
      }
    });

    eventController.subscribe('on-tab-selected', async (tabIndex) => {
      var metaTab = app_controller.tab_controller.getTab(tabIndex);

      if (metaTab != null && metaTab.selectCount >= 2) {
        // Only perform the following action from the 2nd select (The first is done when the tab is created)
        this.clearSelectedBookInMenu();
      }

      await this.updateAvailableBooks(tabIndex);

      // Highlight currently selected book (only in book mode)
      if (metaTab != null) {
        const textType = metaTab.getTextType();
        if (textType == 'book') this.highlightCurrentlySelectedBookInMenu(tabIndex);
      }
    });

    eventController.subscribe('on-tab-added', async () => {
      this.clearSelectedBookInMenu();
    });

    eventController.subscribe('on-locale-changed', async () => {
      await this.localizeBookSelectionMenu();
      await this.renderRecentPassages();
    });
  }

  // This function is rather slow and it delays app startup! (~175ms)
  async localizeBookSelectionMenu() {
    var aElements = document.querySelectorAll("#book-selection-menu-book-list a");

    for (var i = 0; i < aElements.length; i++) {
      var currentBook = aElements[i];
      var currentBookName = currentBook.getAttribute('book-name');

      if (currentBookName != null) {
        var currentBookTranslation = await i18nHelper.getSwordTranslation(currentBookName);
        currentBook.textContent = currentBookTranslation;
      }
    }

    var html = document.getElementById("book-selection-menu-book-list").innerHTML;
    cacheController.setCachedItem('bookSelectionMenuCache', html);
  }

  async updateAvailableBooks(tabIndex=undefined, moduleCode=undefined) {
    var currentTab = app_controller.tab_controller.getTab(tabIndex);

    if (currentTab != null) {
      var currentBibleTranslationId = currentTab.getBibleTranslationId();

      if (moduleCode !== undefined) {
        currentBibleTranslationId = moduleCode;
      }

      var moduleHasApocryphalBooks = await swordModuleHelper.moduleHasApocryphalBooks(currentBibleTranslationId);

      if (currentBibleTranslationId != null) {
        const books = await ipcNsi.getBookList(currentBibleTranslationId);
        let bookLinks = document.getElementById('book-selection-menu-book-list').querySelectorAll('li');

        for (let i = 0; i < bookLinks.length; i++) {
          let currentBookLink = bookLinks[i];

          if (currentBookLink.getAttribute('class') != null) {
            let currentBook = currentBookLink.getAttribute('class').split(' ')[0];
            let currentBookId = currentBook.split('-')[1];

            if (books.includes(currentBookId)) {
              currentBookLink.classList.remove('book-unavailable');
              currentBookLink.classList.add('book-available');
            } else {
              currentBookLink.classList.add('book-unavailable');
              currentBookLink.classList.remove('book-available');
            }
          }
        }
      }

      let apocryphalBookList = document.getElementsByClassName('apocryphal-books')[0];

      if (apocryphalBookList != null) {
        if (moduleHasApocryphalBooks) {
          apocryphalBookList.style.display = '';
        } else {
          apocryphalBookList.style.display = 'none';
        }
      }
    }
  }

  /**
   * Selects a Bible book and optionally a chapter.
   * 
   * @param {string} bookCode - The short code of the book (e.g., "Gen" for Genesis).
   * @param {string} bookTitle - The localized title of the book.
   * @param {string} referenceBookTitle - The reference title of the book.
   * @param {number|null} currentChapter - The chapter to load (default is null, which loads the first chapter).
   * @param {boolean} interactive - Whether the selection is interactive (default is true).
   * @returns {Promise<void>}
   */
  async selectBibleBook(bookCode, bookTitle, referenceBookTitle, currentChapter = null, interactive=true) {
    const tab = app_controller.tab_controller.getTab();
    this.currentBibleTranslationId = tab.getBibleTranslationId();
    this.currentSecondBibleTranslationId = tab.getSecondBibleTranslationId();

    if (this.currentBibleTranslationId == null || this.currentBibleTranslationId == undefined) {
      return;
    }

    if (window.Sentry != null) {
      Sentry.addBreadcrumb({
        category: "app",
        message: `Selected book ${bookCode} using translation ${this.currentBibleTranslationId}`,
        level: "info",
      });
    }

    var books = await ipcNsi.getBookList(this.currentBibleTranslationId);
    if (!books.includes(bookCode)) {
      return;
    }

    const selectChapterBeforeLoading = app_controller.optionsMenu._selectChapterBeforeLoadingOption;
    const bookChapterCount = await ipcNsi.getBookChapterCount(this.currentBibleTranslationId, bookCode);

    if ((selectChapterBeforeLoading.isChecked || currentChapter != null) && bookChapterCount > 1 && interactive) {
      const bookMenu = document.getElementById('book-selection-menu');
      bookMenu.classList.add('select-chapter');

      this.currentBookCode = bookCode;
      this.currentBookTitle = bookTitle;
      this.currentReferenceBookTitle = referenceBookTitle;

      await this.loadChapterList(bookChapterCount, currentChapter);
    } else {
      const instantLoad = await app_controller.translation_controller.isInstantLoadingBook(
        this.currentBibleTranslationId,
        this.currentSecondBibleTranslationId,
        bookCode
      );

      const chapterToLoad = currentChapter || 1; // Use the selected chapter or default to 1
      app_controller.text_controller.loadBook(
        bookCode,
        bookTitle,
        referenceBookTitle,
        instantLoad,
        chapterToLoad
      );

      // Update recent passages with the correct chapter
      await this.updateRecentPassages(bookCode, chapterToLoad);
    }
  }

  async loadChapterList(bookChapterCount, currentChapter=null) {
    var menuChapterList = document.getElementById('book-selection-menu-chapter-list');
    menuChapterList.innerHTML = `
      <div class="mobileButtonNavigation" style="margin-left: 1em; margin-top: 1em;">
        <button id="chapterMenuBackButton" class="button" style="font-size: 0.9em">
          <i class="fas fa-angles-left"></i>
          <span i18n="general.back"></span>
        </button>
      </div>

      <h2>${this.currentBookTitle}</h2>
      <div id='chapter-list-chapters'></div>
    `;

    $(menuChapterList).localize();

    var chapters = menuChapterList.querySelector('#chapter-list-chapters');

    for (let c = 1; c <= bookChapterCount; c++) {
      let newLink = document.createElement('a');
      newLink.href = c;
      newLink.innerText = c;

      if (currentChapter != null && c == currentChapter) {
        newLink.setAttribute('class', 'current-chapter');
      }
      
      chapters.appendChild(newLink);

      newLink.addEventListener('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();

        const selectedChapter = parseInt(event.target.getAttribute('href'));
        const instantLoad = await app_controller.translation_controller.isInstantLoadingBook(this.currentBibleTranslationId, this.currentSecondBibleTranslationId, this.currentBookCode);

        app_controller.text_controller.loadBook(this.currentBookCode,
                                                this.currentBookTitle,
                                                this.currentReferenceBookTitle,
                                                instantLoad,
                                                selectedChapter);

        // Update recent passages with the correct chapter
        await this.updateRecentPassages(this.currentBookCode, selectedChapter);
      });
    }
  }

  hideBookMenu() {
    if (this.book_menu_is_opened) {
      document.getElementById('app-container').classList.remove('fullscreen-menu');

      var bookMenu = document.querySelector('#app-container #book-selection-menu');
      bookMenu.style.display = 'none';
      bookMenu.classList.remove('select-chapter');
      this.book_menu_is_opened = false;

      if (app_controller.getCurrentVerseListMenu() != null) {
        var currentVerseListMenu = app_controller.getCurrentVerseListMenu()[0];
        var bookButton = currentVerseListMenu.querySelector('.book-select-button');
        bookButton.classList.remove('ui-state-active');
      }
    }
  }

  handleBookMenuClick(event) {
    if ($('.book-select-button').hasClass('ui-state-disabled')) {
      return;
    }

    if (this.book_menu_is_opened) {
      app_controller.handleBodyClick();
    } else {
      app_controller.hideAllMenus();
      
      var currentVerseListMenu = app_controller.getCurrentVerseListMenu();
      var book_button = currentVerseListMenu.find('.book-select-button');
      var menu = $('#app-container').find('#book-selection-menu');

      document.getElementById('app-container').classList.add('fullscreen-menu');

      uiHelper.showButtonMenu(book_button, menu);

      this.book_menu_is_opened = true;

      if (event != null) {
        event.stopPropagation();
      }
    }
  }

  async openBookChapterList(bookCode, currentChapter) {
    let bookLongTitle = await ipcDb.getBookLongTitle(bookCode);
    let bookTitleTranslation = await ipcDb.getBookTitleTranslation(bookCode);

    this.handleBookMenuClick();
    await this.selectBibleBook(bookCode, bookTitleTranslation, bookLongTitle, currentChapter);
  }

  highlightCurrentlySelectedBookInMenu(tabIndex=undefined) {
    var currentTab = app_controller.tab_controller.getTab(tabIndex);
    
    if (currentTab != null) {
      var bookCode = currentTab.getBook();
      if (bookCode != null) {
        this.highlightSelectedBookInMenu(bookCode);
      }
    }
  }

  clearSelectedBookInMenu() {
    // Remove highlighting for previously selected book
    var selectedBook = document.getElementsByClassName('book-selected');
    if (selectedBook.length > 0) {
      selectedBook[0].classList.remove('book-selected');
    }
  }

  highlightSelectedBookInMenu(bookCode) {
    this.clearSelectedBookInMenu();
    
    // Highlight the newly selected book
    var bookId = '.book-' + bookCode;
    document.getElementById('book-selection-menu-book-list').querySelector(bookId).classList.add('book-selected');
  }

  async getLocalizedBookNames() {
    const bookElements = document.querySelectorAll('#book-selection-menu-book-list a');
    const localizedBookNames = {};

    bookElements.forEach((element) => {
      const shortTitle = element.getAttribute('href');
      const localizedTitle = element.textContent;
      localizedBookNames[shortTitle] = localizedTitle;
    });

    return localizedBookNames;
  }

  async renderRecentPassages() {
    const recentPassages = await ipcSettings.get(this.recentPassagesKey, []);
    const recentPassagesContainer = document.querySelector('.recently-opened-passages ul');
    const recentPassagesSection = document.querySelector('.recently-opened-passages');

    if (recentPassages.length <= 1) {
      recentPassagesSection.style.display = 'none'; // Hide if no entries or only one entry
      return;
    }

    recentPassagesSection.style.display = 'block'; // Show if there are entries
    recentPassagesContainer.innerHTML = '';

    // Retrieve localized book names
    const localizedBookNames = await this.getLocalizedBookNames();

    // Exclude the most recent entry (first in the list)
    recentPassages.slice(1).forEach((passage) => {
      const [bookCode, chapter] = passage.split(' ');
      const displayText = chapter
        ? `${localizedBookNames[bookCode] || bookCode} ${chapter}`
        : localizedBookNames[bookCode] || bookCode; // Include chapter if present

      const listItem = document.createElement('li');
      listItem.className = 'recent-passage';
      listItem.setAttribute('passage', passage);
      listItem.textContent = displayText;

      listItem.addEventListener('click', async () => {
        let bookLongTitle = await ipcDb.getBookLongTitle(bookCode);
        let bookTitleTranslation = await ipcDb.getBookTitleTranslation(bookCode);
        this.selectBibleBook(bookCode, bookTitleTranslation, bookLongTitle, chapter ? parseInt(chapter) : null, false);
      });

      recentPassagesContainer.appendChild(listItem);
    });
  }

  async updateRecentPassages(bookCode, chapter) {
    const passage = `${bookCode} ${chapter}`;
    let recentPassages = await ipcSettings.get(this.recentPassagesKey, []);

    // Remove any existing passage with the same book code
    recentPassages = recentPassages.filter((item) => !item.startsWith(`${bookCode} `));

    // Add the new passage to the beginning
    recentPassages.unshift(passage);

    // Ensure the list does not exceed the maximum
    const maxEntries = platformHelper.isMobile() ? 4 : 10;
    recentPassages = recentPassages.slice(0, maxEntries);

    // Save updated list to settings
    await ipcSettings.set(this.recentPassagesKey, recentPassages);

    // Re-render the recent passages
    await this.renderRecentPassages();
  }
}

module.exports = BookSelectionMenu;