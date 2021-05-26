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

const { waitUntilIdle } = require('../helpers/ezra_helper.js');
const i18nHelper = require('../helpers/i18n_helper.js');
const i18nController = require('../controllers/i18n_controller.js');
const cacheController = require('../controllers/cache_controller.js');

const INSTANT_LOADING_CHAPTER_LIMIT = 15;
   
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

  async isInstantLoad(bibleTranslationId, bookCode) {
    const bookChapterCount = await ipcNsi.getBookChapterCount(bibleTranslationId, bookCode);
    const bookLoadingModeOption = app_controller.optionsMenu._bookLoadingModeOption;

    var instantLoad = false;

    switch (bookLoadingModeOption.value) {
      case 'load-complete-book':
        instantLoad = true;
        break;

      case 'load-chapters-large-books':
        if (bookChapterCount <= INSTANT_LOADING_CHAPTER_LIMIT) {
          instantLoad = true;
        }
        break;
    }

    return instantLoad;
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

    if (selectChapterBeforeLoading.isChecked) {
      //console.log(`Showing chapter list for ${bookTitle} ` +
      //            `since its chapter count (${bookChapterCount}) is above the limit for instant loading!`);
      
      var menuBookList = document.getElementById('book-selection-menu-book-list');
      menuBookList.style.display = 'none';

      this.currentBookCode = bookCode;
      this.currentBookTitle = bookTitle;
      this.currentReferenceBookTitle = referenceBookTitle;

      await this.loadChapterList(bookChapterCount);

    } else {
      var instantLoad = await this.isInstantLoad(this.currentBibleTranslationId, bookCode);

      this.loadBook(bookCode,
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

        let selectedChapter = parseInt(event.target.getAttribute('href'));
        var instantLoad = await this.isInstantLoad(this.currentBibleTranslationId, this.currentBookCode);

        this.loadBook(this.currentBookCode,
                      this.currentBookTitle,
                      this.currentReferenceBookTitle,
                      instantLoad,
                      selectedChapter);
      });
    }

    chapters.style.display = 'flex';
    menuChapterList.style.display = 'block';
  }

  async loadBook(bookCode, bookTitle, referenceBookTitle, instantLoad=true, chapter=undefined) {
    app_controller.book_selection_menu.hideBookMenu();
    app_controller.book_selection_menu.highlightSelectedBookInMenu(bookCode);

    var currentTab = app_controller.tab_controller.getTab();
    currentTab.setTextType('book');
    app_controller.tab_controller.setCurrentTabBook(bookCode, bookTitle, referenceBookTitle, chapter);

    app_controller.tag_selection_menu.resetTagMenu();
    app_controller.module_search_controller.resetSearch();

    await app_controller.text_controller.prepareForNewText(true, false);

    setTimeout(async () => {
      // Set selected tags and search term to null, since we just switched to a book
      var currentTab = app_controller.tab_controller.getTab();
      currentTab.setTagIdList(null);
      currentTab.setSearchTerm(null);
      currentTab.setXrefs(null);
      currentTab.setReferenceVerseElementId(null);

      var currentVerseList = app_controller.getCurrentVerseList();
      currentTab.tab_search.setVerseList(currentVerseList);

      var currentTabId = app_controller.tab_controller.getSelectedTabId();
      var currentBook = currentTab.getBook();

      await app_controller.text_controller.requestTextUpdate(currentTabId,
                                                             currentBook,
                                                             null,
                                                             null,
                                                             null,
                                                             null,
                                                             null,
                                                             chapter,
                                                             instantLoad);

      await waitUntilIdle();
      tags_controller.updateTagList(currentBook);
    }, 50);
  }

  hideBookMenu() {
    if (this.book_menu_is_opened) {
      $('#app-container').find('#book-selection-menu').hide();
      this.book_menu_is_opened = false;

      var book_button = $('#app-container').find('.book-select-button');
      book_button.removeClass('ui-state-active');

      var menuBookList = document.getElementById('book-selection-menu-book-list');
      menuBookList.style.display = 'block';

      var menuChapterList = document.getElementById('book-selection-menu-chapter-list');
      menuChapterList.style.display = 'none';
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
    $('.book-selected').removeClass('book-selected');
  };

  highlightSelectedBookInMenu(bookCode) {
    this.clearSelectedBookInMenu();
    
    // Highlight the newly selected book
    var bookId = '.book-' + bookCode;
    $('#book-selection-menu-book-list').find(bookId).addClass('book-selected');
  }
}

module.exports = BookSelectionMenu;