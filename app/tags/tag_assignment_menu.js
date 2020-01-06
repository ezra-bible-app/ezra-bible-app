/* This file is part of Ezra Project.

   Copyright (C) 2019 - 2020 Tobias Klein <contact@ezra-project.net>

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


class TagAssignmentMenu {
  constructor() {
    this.menuIsOpened = false;
  }

  init(tabIndex=undefined) {
    var currentVerseListMenu = bible_browser_controller.getCurrentVerseListMenu(tabIndex);
    currentVerseListMenu.find('.assign-tag-menu-button').bind('click', (event) => { this.handleMenuClick(event); });
  }

  hideTagAssignmentMenu() {
    if (this.menuIsOpened) {
      $('#app-container').find('#tag-assignment-menu').hide();
      this.menuIsOpened = false;

      var assignTagMenuButton = $('#app-container').find('.assign-tag-menu-button');
      assignTagMenuButton.removeClass('ui-state-active');
    }
  }

  async handleMenuClick(event) {
    var currentVerseListMenu = bible_browser_controller.getCurrentVerseListMenu();
    var assignTagMenuButton = currentVerseListMenu.find('.assign-tag-menu-button');

    if (assignTagMenuButton.hasClass('ui-state-disabled')) {
      return;
    }

    if (this.menuIsOpened) {
      bible_browser_controller.handleBodyClick();
    } else {
      bible_browser_controller.book_selection_menu.hide_book_menu();
      bible_browser_controller.tag_selection_menu.hideTagMenu();
      bible_browser_controller.module_search.hideSearchMenu();
      bible_browser_controller.optionsMenu.hideDisplayMenu();

      assignTagMenuButton.addClass('ui-state-active');
      var buttonOffset = assignTagMenuButton.offset();
      var menu = $('#app-container').find('#tag-assignment-menu');
      var topOffset = buttonOffset.top + assignTagMenuButton.height() + 12;
      var leftOffset = buttonOffset.left;

      menu.css('top', topOffset);
      menu.css('left', leftOffset);

      /*if (!this.tag_menu_populated) {
        await this.updateTagSelectionMenu();
      }*/

      menu.show();
      this.menuIsOpened = true;
      event.stopPropagation();
    }
  }
}

module.exports = TagAssignmentMenu;