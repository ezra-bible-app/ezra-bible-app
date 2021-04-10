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
      var menu = $('#app-container').find('#book-selection-menu');

      menu.innerHTML = cachedHtml;

    } else {
      console.log("Localizing book selection menu ...")
      await this.localizeBookSelectionMenu();
    }

    this.initLinks();
    this.init_completed = true;
  }

  initLinks() {
    var menu = $('#app-container').find('#book-selection-menu');
    var links = menu.find('a');

    for (var i = 0; i < links.length; i++) {
      var current_link = $(links[i]);

      current_link.click((event) => {
        event.preventDefault();
        event.stopPropagation();

        var current_link_href = $(event.target).attr('href');
        var current_book_title = $(event.target).html();

        app_controller.book_selection_menu.selectBibleBook(current_link_href, current_book_title);
      });
    }
  }

  // This function is rather slow and it delays app startup! (~175ms)
  async localizeBookSelectionMenu() {
    var aElements = document.getElementById("book-selection-menu").querySelectorAll('a');

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
        var book_links = document.getElementById('book-selection-menu').querySelectorAll('li');

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

  async selectBibleBook(book_code, book_title) {
    var currentBibleTranslationId = app_controller.tab_controller.getTab().getBibleTranslationId();
    if (currentBibleTranslationId == null || currentBibleTranslationId == undefined) {
      return;
    }

    Sentry.addBreadcrumb({category: "app",
                          message: `Selected book ${book_code} using translation ${currentBibleTranslationId}`,
                          level: Sentry.Severity.Info});
    
    var books = await ipcNsi.getBookList(currentBibleTranslationId);
    if (!books.includes(book_code)) {
      return;
    }

    app_controller.book_selection_menu.hideBookMenu();
    app_controller.book_selection_menu.highlightSelectedBookInMenu(book_code);

    var currentTab = app_controller.tab_controller.getTab();
    currentTab.setTextType('book');
    app_controller.tab_controller.setCurrentTabBook(book_code, book_title);

    app_controller.tag_selection_menu.hideTagMenu();
    app_controller.tag_selection_menu.resetTagMenu();
    app_controller.module_search_controller.hideSearchMenu();
    app_controller.module_search_controller.resetSearch();
    app_controller.tag_assignment_menu.hideTagAssignmentMenu();

    await app_controller.text_controller.prepareForNewText(true, false);

    setTimeout(async () => {
      // Set selected tags and search term to null, since we just switched to a book
      var currentTab = app_controller.tab_controller.getTab();
      currentTab.setTagIdList(null);
      currentTab.setSearchTerm(null);
      currentTab.setXrefs(null);
      currentTab.setVerseReferenceId(null);

      var currentVerseList = app_controller.getCurrentVerseList();
      app_controller.tab_search.setVerseList(currentVerseList);

      var currentTabId = app_controller.tab_controller.getSelectedTabId();
      var currentBook = currentTab.getBook();

      await app_controller.text_controller.requestTextUpdate(currentTabId,
                                                             currentBook,
                                                             null,
                                                             null,
                                                             null,
                                                             null,
                                                             null);

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

  highlightSelectedBookInMenu(book_code) {
    this.clearSelectedBookInMenu();
    
    // Highlight the newly selected book
    var bookId = '.book-' + book_code;
    $('#book-selection-menu').find(bookId).addClass('book-selected');
  }
}

module.exports = BookSelectionMenu;