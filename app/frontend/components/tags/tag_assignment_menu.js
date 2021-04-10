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
      app_controller.hideAllMenus();

      assignTagMenuButton.addClass('ui-state-active');
      var buttonOffset = assignTagMenuButton.offset();
      var menu = this.getMenu();

      var topOffset = buttonOffset.top + assignTagMenuButton.height() + 1;
      var leftOffset = buttonOffset.left;

      menu.css('top', topOffset);
      menu.css('left', leftOffset);

      var overlay = menu.find('#tag-assignment-menu-taglist-overlay');

      // Show an overlay while the actual menu is rendering
      menu.find('#tag-assignment-menu-taglist').hide();
      overlay.show();
      overlay.find('.loader').show();
      menu.show();

      await waitUntilIdle();

      menu.find('#tags-content-global').css('height', 'unset');
      menu.find('#tag-assignment-menu-taglist').show();
      overlay.hide();
      $('#tags-search-input').select();

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
    var tagFilterMenuId = 'tag-filter-menu';
    var tagFilterMenu = document.getElementById(tagFilterMenuId);
    var assignTagMenuButton = this.getCurrentMenuButton();

    if (moveToMenu) {
      assignTagMenuButton.show();
    } else {
      assignTagMenuButton.hide();
    }

    var updated = false;

    if (parentId == toolBarId && moveToMenu) {
      $('#tag-list-filter-button').unbind();

      var menu = document.getElementById(menuId);
      menu.appendChild(tagsContainer);

      var filter = document.getElementById(filterId);
      var tagsSearchInput = document.getElementById('tags-search-input');

      filter.appendChild(tagsSearchInput);
      filter.appendChild(tagFilterMenu);

      $('#tag-filter-menu').find("br:not('#tag-filter-menu-separator')").hide();
      $('#tag-filter-menu').show();

      $('#tag-list-filter-button').unbind();
      $('#tag-list-filter-button').bind('click', tags_controller.handleFilterButtonClick);
      $('#tag-filter-menu').find('input').unbind();
      $('#tag-filter-menu').find('input').bind('click', tags_controller.handleTagFilterTypeClick);

      updated = true;

    } else if (parentId == menuId && !moveToMenu) {
      tags_controller.handleTagAccordionChange();
      var toolBar = document.getElementById(toolBarId);
      var boxes = document.getElementById('boxes');
      toolBar.appendChild(tagsContainer);
      $('#tag-filter-menu').hide();
      $('#tag-filter-menu').find("br:not('#tag-filter-menu-separator')").show();
      boxes.appendChild(tagFilterMenu);
      updated = true;
    }

    return updated;
  }
}

module.exports = TagAssignmentMenu;