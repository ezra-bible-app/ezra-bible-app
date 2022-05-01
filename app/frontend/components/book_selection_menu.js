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
      this.hideBookMenu();
    });

    this.initLinks();
    this.subscribeForEvents();
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
    eventController.subscribe('on-translation-changed', async () => {
      await this.updateAvailableBooks();
    });

    eventController.subscribe('on-translation-added', async (moduleCode) => {
      await this.updateAvailableBooks(undefined, moduleCode);
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
      this.localizeBookSelectionMenu();
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

  async selectBibleBook(bookCode, bookTitle, referenceBookTitle) {
    this.currentBibleTranslationId = app_controller.tab_controller.getTab().getBibleTranslationId();
    if (this.currentBibleTranslationId == null || this.currentBibleTranslationId == undefined) {
      return;
    }

    Sentry.addBreadcrumb({category: "app",
                          message: `Selected book ${bookCode} using translation ${this.currentBibleTranslationId}`,
                          level: Sentry.Severity.Info});
    
    var books = await ipcNsi.getBookList(this.currentBibleTranslationId);
    if (!books.includes(bookCode)) {
      return;
    }

    const selectChapterBeforeLoading = app_controller.optionsMenu._selectChapterBeforeLoadingOption;
    const bookChapterCount = await ipcNsi.getBookChapterCount(this.currentBibleTranslationId, bookCode);

    if (selectChapterBeforeLoading.isChecked && bookChapterCount > 1) {
      //console.log(`Showing chapter list for ${bookTitle} ` +
      //            `since its chapter count (${bookChapterCount}) is above the limit for instant loading!`);
      
      const bookMenu = document.getElementById('book-selection-menu');
      bookMenu.classList.add('select-chapter');

      this.currentBookCode = bookCode;
      this.currentBookTitle = bookTitle;
      this.currentReferenceBookTitle = referenceBookTitle;

      await this.loadChapterList(bookChapterCount);

    } else { // Load directly without first showing chapter list

      const instantLoad = await app_controller.translation_controller.isInstantLoadingBook(this.currentBibleTranslationId, bookCode);

      app_controller.text_controller.loadBook(bookCode,
                                              bookTitle,
                                              referenceBookTitle,
                                              instantLoad,
                                              1);
    }
  }

  async loadChapterList(bookChapterCount) {
    var menuChapterList = document.getElementById('book-selection-menu-chapter-list');
    menuChapterList.innerHTML = `
      <h2>${this.currentBookTitle}</h2>
      <div id='chapter-list-chapters'></div>
    `;

    var chapters = menuChapterList.querySelector('#chapter-list-chapters');

    for (let c = 1; c <= bookChapterCount; c++) {
      let newLink = document.createElement('a');
      newLink.href = c;
      newLink.innerText = c;
      chapters.appendChild(newLink);

      newLink.addEventListener('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();

        const selectedChapter = parseInt(event.target.getAttribute('href'));
        const instantLoad = await app_controller.translation_controller.isInstantLoadingBook(this.currentBibleTranslationId, this.currentBookCode);

        app_controller.text_controller.loadBook(this.currentBookCode,
                                                this.currentBookTitle,
                                                this.currentReferenceBookTitle,
                                                instantLoad,
                                                selectedChapter);
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
      event.stopPropagation();
    }
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
}

module.exports = BookSelectionMenu;