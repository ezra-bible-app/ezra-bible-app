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

    var menu = $('#app-container').find('#book-selection-menu');
    menu.bind('click', app_controller.handleBodyClick);

    var cacheInvalid = await app_controller.isCacheInvalid();

    var hasCachedBookSelectionMenu = await ipcSettings.has('bookSelectionMenuCache', 'html-cache');

    if (!cacheInvalid && hasCachedBookSelectionMenu) {
      var cachedHtml = await ipcSettings.get('bookSelectionMenuCache');
      var menuBookList = $('#app-container').find('#book-selection-menu-book-list');

      menuBookList.innerHTML = cachedHtml;

    } else {
      console.log("Localizing book selection menu ...")
      await this.localizeBookSelectionMenu();
    }

    this.initLinks();
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
        var current_bookTitle = $(event.target).html();

        app_controller.book_selection_menu.selectBibleBook(current_link_href, current_bookTitle);
      });
    }
  }

  // This function is rather slow and it delays app startup! (~175ms)
  async localizeBookSelectionMenu() {
    var aElements = document.getElementById("book-selection-menu-book-list").querySelectorAll('a');

    for (var i = 0; i < aElements.length; i++) {
      var currentBook = aElements[i];
      var currentBookTranslation = await i18nHelper.getSwordTranslation(currentBook.textContent);
      currentBook.textContent = currentBookTranslation;
    }
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

  async selectBibleBook(bookCode, bookTitle) {
    var currentBibleTranslationId = app_controller.tab_controller.getTab().getBibleTranslationId();
    if (currentBibleTranslationId == null || currentBibleTranslationId == undefined) {
      return;
    }

    Sentry.addBreadcrumb({category: "app",
                          message: `Selected book ${bookCode} using translation ${currentBibleTranslationId}`,
                          level: Sentry.Severity.Info});
    
    var books = await ipcNsi.getBookList(currentBibleTranslationId);
    if (!books.includes(bookCode)) {
      return;
    }

    const bookChapterCount = await ipcNsi.getBookChapterCount(currentBibleTranslationId, bookCode);

    if (bookChapterCount <= INSTANT_LOADING_CHAPTER_LIMIT) {

      console.log(`Instantly loading ${bookTitle} (Chapter count: ${bookChapterCount})`);
      this.loadBook(bookCode, bookTitle);

    } else {
      
      this.loadBook(bookCode, bookTitle, 1);

      /*console.log(`Showing chapter list for ${bookTitle} ` +
                  `since its chapter count (${bookChapterCount}) is above the limit for instant loading!`);
      
      var menuBookList = document.getElementById('book-selection-menu-book-list');
      menuBookList.style.display = 'none';

      this.currentBookCode = bookCode;
      this.currentBookTitle = bookTitle;

      this.loadChapterList(bookChapterCount);*/
    }
  }

  loadChapterList(bookChapterCount) {
    var menuChapterList = document.getElementById('book-selection-menu-chapter-list');
    menuChapterList.innerHTML = '';

    for (let c = 1; c <= bookChapterCount; c++) {
      let newLink = document.createElement('a');
      newLink.href = c;
      newLink.innerText = c;
      menuChapterList.appendChild(newLink);

      newLink.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();

        let selectedChapter = parseInt(event.target.getAttribute('href'));
        this.loadBook(this.currentBookCode, this.currentBookTitle, selectedChapter);
      });
    }

    menuChapterList.style.display = 'flex';
  }

  async loadBook(bookCode, bookTitle, chapter=undefined) {
    app_controller.book_selection_menu.hideBookMenu();
    app_controller.book_selection_menu.highlightSelectedBookInMenu(bookCode);

    var currentTab = app_controller.tab_controller.getTab();
    currentTab.setTextType('book');
    app_controller.tab_controller.setCurrentTabBook(bookCode, bookTitle, chapter);

    app_controller.tag_selection_menu.resetTagMenu();
    app_controller.module_search_controller.resetSearch();

    await app_controller.text_controller.prepareForNewText(true, false);

    setTimeout(async () => {
      // Set selected tags and search term to null, since we just switched to a book
      var currentTab = app_controller.tab_controller.getTab();
      currentTab.setTagIdList(null);
      currentTab.setSearchTerm(null);
      currentTab.setXrefs(null);
      currentTab.setVerseReferenceId(null);

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
                                                             chapter);

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
      book_button.addClass('ui-state-active');

      var book_button_offset = book_button.offset();
      var menu = $('#app-container').find('#book-selection-menu');
      var top_offset = book_button_offset.top + book_button.height() + 1;
      var left_offset = book_button_offset.left;

      menu.css('top', top_offset);
      menu.css('left', left_offset);

      $('#app-container').find('#book-selection-menu').show();
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