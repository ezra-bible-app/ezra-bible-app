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

const i18nHelper = require('../helpers/i18n_helper.js');
const i18nController = require('../controllers/i18n_controller.js');
const cacheController = require('../controllers/cache_controller.js');

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

    this.initLinks();
    this.subscribeForLocaleUpdates();
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

        app_controller.book_selection_menu.selectBibleBook(current_link_href, current_book_title, current_reference_book_title);
      });
    }
  }

  subscribeForLocaleUpdates() {
    i18nController.addLocaleChangeSubscriber(async () => {
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

  async updateAvailableBooks(tabIndex=undefined) {
    var currentTab = app_controller.tab_controller.getTab(tabIndex);

    if (currentTab != null) {
      var currentBibleTranslationId = currentTab.getBibleTranslationId();

      if (currentBibleTranslationId != null) {
        var books = await ipcNsi.getBookList(currentBibleTranslationId);
        var book_links = document.getElementById('book-selection-menu-book-list').querySelectorAll('li');

        for (var i = 0; i < book_links.length; i++) {
          var current_book_link = book_links[i];
          var current_link_book = current_book_link.getAttribute('class').split(' ')[0];
          var current_book_id = current_link_book.split('-')[1];
          
          if (books.includes(current_book_id)) {
            current_book_link.classList.remove('book-unavailable');
            current_book_link.classList.add('book-available');
          } else {
            current_book_link.classList.add('book-unavailable');
            current_book_link.classList.remove('book-available');
          }
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
      var bookMenu = document.querySelector('#app-container #book-selection-menu');
      bookMenu.style.display = 'none';
      bookMenu.classList.remove('select-chapter');
      this.book_menu_is_opened = false;

      var bookButton = document.querySelector('#app-container .book-select-button');
      bookButton.classList.remove('ui-state-active');

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