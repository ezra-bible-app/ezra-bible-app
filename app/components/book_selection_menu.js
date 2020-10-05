/* This file is part of Ezra Project.

   Copyright (C) 2019 - 2020 Tobias Klein <contact@ezra-project.net>

   Ezra Project is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 2 of the License, or
   (at your option) any later version.

   Ezra Project is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Project. See the file LICENSE.
   If not, see <http://www.gnu.org/licenses/>. */

class BookSelectionMenu {
  constructor() {
    this.book_menu_is_opened = false;
    this.init_completed = false;
  }

  init() {
    if (this.init_completed) return;

    this.localizeBookSelectionMenu();

    var menu = $('#app-container').find('#book-selection-menu');
    var links = menu.find('a');

    menu.bind('click', bible_browser_controller.handleBodyClick);

    for (var i = 0; i < links.length; i++) {
      var current_link = $(links[i]);
      var current_link_href = current_link.attr('href');
      var current_book_title = current_link.html();
      var new_link_href = "javascript:bible_browser_controller.book_selection_menu.select_bible_book('" + 
                          current_link_href + "','" + current_book_title + "')";

      current_link.attr('href', new_link_href);
    }

    this.init_completed = true;
  }

  // This function is rather slow and it delays app startup! (~175ms)
  localizeBookSelectionMenu() {
    var aElements = document.getElementById("book-selection-menu").querySelectorAll('a');

    for (var i = 0; i < aElements.length; i++) {
      var currentBook = aElements[i];
      var currentBookTranslation = i18nHelper.getSwordTranslation(currentBook.innerText);
      currentBook.innerText = currentBookTranslation;
    }
  }

  updateAvailableBooks(tabIndex=undefined) {
    var currentTab = bible_browser_controller.tab_controller.getTab(tabIndex);

    if (currentTab != null) {
      var currentBibleTranslationId = currentTab.getBibleTranslationId();
      if (currentBibleTranslationId != null) {
        var books = nsi.getBookList(currentBibleTranslationId);
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

  select_bible_book(book_code, book_title) {
    var currentBibleTranslationId = bible_browser_controller.tab_controller.getTab().getBibleTranslationId();

    Sentry.addBreadcrumb({category: "BookSelectionMenu.select_bible_book",
                          message: `Selected book ${book_code} using translation ${currentBibleTranslationId}`,
                          level: Sentry.Severity.Info});
    
    var books = nsi.getBookList(currentBibleTranslationId);
    if (!books.includes(book_code)) {
      return;
    }

    bible_browser_controller.book_selection_menu.hide_book_menu();
    bible_browser_controller.book_selection_menu.highlightSelectedBookInMenu(book_code);

    var currentTab = bible_browser_controller.tab_controller.getTab();
    currentTab.setTextType('book');
    bible_browser_controller.tab_controller.setCurrentTabBook(book_code, book_title);

    bible_browser_controller.tag_selection_menu.hideTagMenu();
    bible_browser_controller.tag_selection_menu.resetTagMenu();
    bible_browser_controller.module_search.hideSearchMenu();
    bible_browser_controller.module_search.resetSearch();
    bible_browser_controller.tag_assignment_menu.hideTagAssignmentMenu();

    bible_browser_controller.text_loader.prepareForNewText(true, false);

    setTimeout(async () => {
      // Set selected tags and search term to null, since we just switched to a book
      var currentTab = bible_browser_controller.tab_controller.getTab();
      currentTab.setTagIdList(null);
      currentTab.setSearchTerm(null);
      currentTab.setXrefs(null);
      currentTab.setVerseReferenceId(null);

      var currentVerseList = bible_browser_controller.getCurrentVerseList();
      bible_browser_controller.tab_search.setVerseList(currentVerseList);

      var currentTabId = bible_browser_controller.tab_controller.getSelectedTabId();
      var currentBook = currentTab.getBook();

      await bible_browser_controller.text_loader.requestTextUpdate(currentTabId,
                                                                   currentBook,
                                                                   null,
                                                                   null,
                                                                   null,
                                                                   null,
                                                                   null);

      await waitUntilIdle();
      tags_controller.update_tag_list(currentBook);
    }, 50);
  }

  hide_book_menu() {
    if (this.book_menu_is_opened) {
      $('#app-container').find('#book-selection-menu').hide();
      this.book_menu_is_opened = false;

      var book_button = $('#app-container').find('.book-select-button');
      book_button.removeClass('ui-state-active');
    }
  }

  handle_book_menu_click(event) {
    if ($('.book-select-button').hasClass('ui-state-disabled')) {
      return;
    }

    if (this.book_menu_is_opened) {
      bible_browser_controller.handleBodyClick();
    } else {
      bible_browser_controller.tag_selection_menu.hideTagMenu();
      bible_browser_controller.module_search.hideSearchMenu();
      bible_browser_controller.optionsMenu.hideDisplayMenu();
      bible_browser_controller.tag_assignment_menu.hideTagAssignmentMenu();
      
      var currentVerseListMenu = bible_browser_controller.getCurrentVerseListMenu();
      var book_button = currentVerseListMenu.find('.book-select-button');
      book_button.addClass('ui-state-active');

      var book_button_offset = book_button.offset();
      var menu = $('#app-container').find('#book-selection-menu');
      var top_offset = book_button_offset.top + book_button.height() + 12;
      var left_offset = book_button_offset.left;

      menu.css('top', top_offset);
      menu.css('left', left_offset);

      $('#app-container').find('#book-selection-menu').show();
      this.book_menu_is_opened = true;
      event.stopPropagation();
    }
  }

  highlightCurrentlySelectedBookInMenu(tabIndex=undefined) {
    var currentTab = bible_browser_controller.tab_controller.getTab(tabIndex);
    
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