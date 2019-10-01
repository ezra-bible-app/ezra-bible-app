/* This file is part of Ezra Project.

   Copyright (C) 2019 Tobias Klein <contact@ezra-project.net>

   Ezra Project is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   Ezra Project is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Project. See the file COPYING.
   If not, see <http://www.gnu.org/licenses/>. */

class BookSelectionMenu {
  constructor() {
    this.book_menu_is_opened = false;
  }

  init() {
    var menu = $('#app-container').find('#book-selection-menu');
    var links = menu.find('a');

    menu.bind('click', bible_browser_controller.handle_body_click);

    for (var i = 0; i < links.length; i++) {
      var current_link = $(links[i]);
      var current_link_href = current_link.attr('href');
      var current_book_title = current_link.html();
      var new_link_href = "javascript:bible_browser_controller.book_selection_menu.select_bible_book('" + 
                          current_link_href + "','" + current_book_title + "')";

      current_link.attr('href', new_link_href);
    }
  }

  select_bible_book(book_code, book_title) {
    bible_browser_controller.book_selection_menu.highlightSelectedBookInMenu(book_code);

    var currentBibleTranslationId = bible_browser_controller.tab_controller.getTab().getBibleTranslationId();
    models.BibleTranslation.getBookList(currentBibleTranslationId).then(books => {
      if (!books.includes(book_code)) {
        return;
      }

      bible_browser_controller.book_selection_menu.hide_book_menu();
      bible_browser_controller.tag_selection_menu.hide_tag_menu();
      bible_browser_controller.tag_selection_menu.reset_tag_menu();
      bible_browser_controller.module_search.hide_search_menu();
      bible_browser_controller.module_search.reset_search();

      // Not needed at the moment
      //$('#outline-content').empty();

      // Set selected tags to null, since we just switched to a book
      var currentTab = bible_browser_controller.tab_controller.getTab();
      currentTab.setTextType('book');
      currentTab.setTagIdList(null);
      bible_browser_controller.tab_controller.setCurrentTabBook(book_code, book_title);

      var currentVerseList = bible_browser_controller.getCurrentVerseList();
      bible_browser_controller.book_search.setVerseList(currentVerseList);
      var currentTab = bible_browser_controller.tab_controller.getTab();

      var currentTabId = bible_browser_controller.tab_controller.getSelectedTabId();
      var currentBook = currentTab.getBook();

      bible_browser_controller.text_loader.prepareForNewText(true);
      bible_browser_controller.text_loader.requestTextUpdate(currentTabId, currentBook, null, null);
      tags_controller.communication_controller.request_tags();
    });
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
      bible_browser_controller.handle_body_click();
    } else {
      bible_browser_controller.tag_selection_menu.hide_tag_menu();
      bible_browser_controller.module_search.hide_search_menu();
      bible_browser_controller.optionsMenu.hideDisplayMenu();
      var currentVerseListMenu = bible_browser_controller.getCurrentVerseListMenu();
      var book_button = currentVerseListMenu.find('.book-select-button');
      book_button.addClass('ui-state-active');

      var book_button_offset = book_button.offset();
      var menu = $('#app-container').find('#book-selection-menu');
      var top_offset = book_button_offset.top + book_button.height() + 12;
      var left_offset = book_button_offset.left;

      menu.css('top', top_offset);
      menu.css('left', left_offset);

      $('#app-container').find('#book-selection-menu').slideDown();
      this.book_menu_is_opened = true;
      event.stopPropagation();
    }
  }

  highlightCurrentlySelectedBookInMenu(tabIndex=undefined) {
    var currentTab = bible_browser_controller.tab_controller.getTab(tabIndex);
    var bookCode = currentTab.getBook();
    if (bookCode != null) {
      this.highlightSelectedBookInMenu(bookCode);
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