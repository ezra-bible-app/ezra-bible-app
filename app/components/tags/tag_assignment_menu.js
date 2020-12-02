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

/**
 * The TagAssignmentMenu component implements the menu event handling and dynamic movement of the tag assignment menu,
 * which can move between the left toolbar and the dropdown button in the verse list menu.
 * 
 * @category Component
 */
class TagAssignmentMenu {
  constructor() {
    this.menuIsOpened = false;
  }

  init(tabIndex=undefined) {
    var currentVerseListMenu = app_controller.getCurrentVerseListMenu(tabIndex);
    currentVerseListMenu.find('.assign-tag-menu-button').bind('click', (event) => { this.handleMenuClick(event); });
  }

  getMenu() {
    return $('#app-container').find('#tag-assignment-menu');
  }

  getCurrentMenuButton() {
    var currentVerseListMenu = app_controller.getCurrentVerseListMenu();
    var assignTagMenuButton = currentVerseListMenu.find('.assign-tag-menu-button');
    return assignTagMenuButton;  
  }

  hideTagAssignmentMenu() {
    if (this.menuIsOpened) {
      this.getMenu().hide();
      this.menuIsOpened = false;

      var assignTagMenuButton = $('#app-container').find('.assign-tag-menu-button');
      assignTagMenuButton.removeClass('ui-state-active');
    }
  }

  async handleMenuClick(event) {
    var assignTagMenuButton = this.getCurrentMenuButton();

    if (assignTagMenuButton.hasClass('ui-state-disabled')) {
      return;
    }

    if (this.menuIsOpened) {
      app_controller.handleBodyClick();
    } else {
      app_controller.book_selection_menu.hide_book_menu();
      app_controller.tag_selection_menu.hideTagMenu();
      app_controller.module_search.hideSearchMenu();
      app_controller.optionsMenu.hideDisplayMenu();

      assignTagMenuButton.addClass('ui-state-active');
      var buttonOffset = assignTagMenuButton.offset();
      var menu = this.getMenu();
      var topOffset = buttonOffset.top + assignTagMenuButton.height() + 12;
      var leftOffset = buttonOffset.left;

      menu.css('top', topOffset);
      menu.css('left', leftOffset);

      menu.show();
      this.menuIsOpened = true;
      event.stopPropagation();
    }
  }

  getTagsContainer() {
    return document.getElementById('tags-content-global');
  }

  getTagsContainerParentId() {
    var tagsContainer = this.getTagsContainer();
    return tagsContainer.parentNode.getAttribute('id');
  }

  moveTagAssignmentList(moveToMenu=false) {
    var tagsContainer = this.getTagsContainer();
    var parentId = this.getTagsContainerParentId();
    var toolBarId = 'tags-content';
    var menuId = 'tag-assignment-menu-taglist';
    var filterId = 'tag-assignment-menu-filter';

    var assignTagMenuButton = this.getCurrentMenuButton();

    if (moveToMenu) {
      assignTagMenuButton.show();
    } else {
      assignTagMenuButton.hide();
    }

    var updated = false;

    if (parentId == toolBarId && moveToMenu) {
      var menu = document.getElementById(menuId);
      menu.appendChild(tagsContainer);
      var filter = document.getElementById(filterId);
      var tagsSearchInput = document.getElementById('tags-search-input');
      filter.appendChild(tagsSearchInput);
      updated = true;

    } else if (parentId == menuId && !moveToMenu) {
      tags_controller.handle_tag_accordion_change();
      var toolBar = document.getElementById(toolBarId);
      toolBar.appendChild(tagsContainer);
      updated = true;

    }

    return updated;
  }
}

module.exports = TagAssignmentMenu;