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

const { waitUntilIdle } = require('../../helpers/ezra_helper.js');
const eventController = require('../../controllers/event_controller.js');

/**
 * The TagAssignmentMenu component implements the menu event handling and dynamic movement of the tag assignment menu,
 * which can move between the left toolbar and the dropdown button in the verse list menu.
 * 
 * @category Component
 */
class TagAssignmentMenu {
  constructor() {
    this.menuIsOpened = false;
    this._lastTagListContainer = "MENU";
    this._currentTagListContainer = "MENU";
    
    eventController.subscribe('on-tab-added', (tabIndex) => {
      this.init(tabIndex);
    });
    
    eventController.subscribe('on-locale-changed', async () => {
      this.initChangeTagPopup();
    });

    eventController.subscribe('on-fullscreen-changed', (isFullScreen) => {
      if (isFullScreen) {
        if (!app_controller.optionsMenu._tagListOption.isChecked) {
          this.moveTagAssignmentList("POPUP");
        }
      } else {
        this.closePopup();
        
        if (!app_controller.optionsMenu._tagListOption.isChecked) {
          this.moveTagAssignmentList("PREVIOUS");
        }
      }
    });

    this.initChangeTagPopup();
  }

  init(tabIndex=undefined) {
    if (app_controller.optionsMenu._tagListOption.isChecked) {
      this._lastTagListContainer = "SIDE_PANEL";
      this._currentTagListContainer = "SIDE_PANEL";
    }

    var currentVerseListMenu = app_controller.getCurrentVerseListMenu(tabIndex);
    currentVerseListMenu.find('.assign-tag-menu-button').bind('click', (event) => { this.handleMenuClick(event); });
  }

  initChangeTagPopup() {
    if (this._changeTagPopupInitDone) {
      return;
    }

    var changeTagDialogOptions = {
      title: i18n.t('tags.change-tags'),
      width: 550,
      height: 700,
      position: [60,180],
      autoOpen: false,
      dialogClass: 'ezra-dialog'
    };

    $('#change-tags-box').dialog(changeTagDialogOptions);
    this._changeTagPopupInitDone = true;
  }

  async showPopup() {
    $('#change-tags-box-content').hide();
    $('#change-tags-box').dialog('open');
    await waitUntilIdle();

    var tagsContainer = document.querySelector('#tags-content-global');
    tagsContainer.style.display = 'none';

    if (!app_controller.optionsMenu._tagListOption.isChecked) {
      $('#change-tags-box-content').show();
      await waitUntilIdle();
      app_controller.tag_assignment_menu.moveTagAssignmentList('POPUP');
    }
  }

  closePopup() {
    $('#change-tags-box').dialog('close');
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

  hideTagAssignmentMenuAfterDelay() {
    setTimeout(() => {
      this.hideTagAssignmentMenu();
    }, 600);
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

      menu.find('#tag-assignment-menu-taglist').show();
      overlay.hide();

      if (platformHelper.isElectron()) {
        // We're only focussing the search filter on Electron, because on Android it would trigger the screen keyboard right away
        // and that would be disturbing from a usability perspective.
        $('#tags-search-input').select();
      }

      this.menuIsOpened = true;
      event.stopPropagation();
    }
  }

  // FIXME: moving tags toolbar depending on screen size is not good from usability perspective
  /**
   * 
   * @param {string} target SIDE_PANEL | MENU | POPUP | PREVIOUS
   */
  async moveTagAssignmentList(target="SIDE_PANEL") {
    var tagsContainer = document.querySelector('#tags-content-global');
    var tagAssignmentMenu = document.querySelector('#tag-assignment-menu');
    var menuTagList = document.querySelector('#tag-assignment-menu-taglist');
    var menuTagListOverlay = document.querySelector('#tag-assignment-menu-taglist-overlay');
    var toolBar = document.querySelector('#tags-content');
    var tagFilterMenu = document.querySelector('#tag-filter-menu');
    var $tagFilterMenu =$(tagFilterMenu);
    var assignTagMenuButton = this.getCurrentMenuButton();
    var popup = document.querySelector('#change-tags-box-content');
    var currentVerseListMenu = app_controller.getCurrentVerseListMenu();

    if (target != this._currentTagListContainer) {
      if (target == "PREVIOUS") {
        target = this._lastTagListContainer;
      }

      if (this._currentTagListContainer != this._lastTagListContainer) {
        this._lastTagListContainer = this._currentTagListContainer;
      }
      
      this._currentTagListContainer = target;
    }

    if (target != "SIDE_PANEL") {
      assignTagMenuButton.show();
    } else {
      assignTagMenuButton.hide();
    }

    var updated = false;

    if ((tagsContainer.parentElement == toolBar || tagsContainer.parentElement == popup) && target == "MENU") {
      $('#tag-list-filter-button').unbind();

      var filter = document.querySelector('#tag-assignment-menu-filter');
      var tagsSearchInput = document.querySelector('#tags-search-input');

      if (tagsContainer.parentElement == popup) {
        // Move the complete filter box back to the tag assignment menu
        tagAssignmentMenu.prepend(filter);
        tagAssignmentMenu.append(menuTagListOverlay);

        // Remove the new tag button again - in menu mode the button is located in the menu
        var newTagButton = tagAssignmentMenu.querySelector('.new-standard-tag-button');
        newTagButton.remove();
      }

      menuTagList.appendChild(tagsContainer);

      filter.appendChild(tagsSearchInput);
      filter.appendChild(tagFilterMenu);

      $tagFilterMenu.find("br:not('#tag-filter-menu-separator')").hide();
      $tagFilterMenu.show();

      $('#tag-list-filter-button').unbind();
      $('#tag-list-filter-button').bind('click', (e) => { tags_controller.handleFilterButtonClick(e); });
      $tagFilterMenu.find('input').unbind();
      $tagFilterMenu.find('input').bind('click', (e) => { tags_controller.handleTagFilterTypeClick(e); });

      updated = true;

    } else if ((tagsContainer.parentElement == menuTagList || tagsContainer.parentElement == popup) && target == "SIDE_PANEL") {

      // Move tags search field back to side panel tag list header
      var tagsSearchInput = document.querySelector('#tags-search-input');
      var panelHeaderLink = document.getElementById('tags-content').querySelector('.ui-state-active').querySelector('a');
      panelHeaderLink.appendChild(tagsSearchInput);

      var boxes = document.getElementById('boxes');
      toolBar.appendChild(tagsContainer);
      $tagFilterMenu.hide();
      $tagFilterMenu.find("br:not('#tag-filter-menu-separator')").show();
      boxes.appendChild(tagFilterMenu);
      updated = true;

    } else if (target == "POPUP") {

      var filter = document.querySelector('#tag-assignment-menu-filter');
      var tagsSearchInput = document.querySelector('#tags-search-input');
      var tagAssignmentMenuFilter = document.querySelector('#tag-assignment-menu-filter');
      var newTagButton = currentVerseListMenu.find('.new-standard-tag-button')[0].cloneNode(true);

      tagsContainer.style.display = 'none';

      filter.appendChild(tagsSearchInput);
      filter.appendChild(tagFilterMenu);

      if (filter.querySelector('.new-standard-tag-button') == null) {
        filter.appendChild(newTagButton);

        newTagButton.classList.remove('events-configured');
        uiHelper.configureButtonStyles(filter);

        newTagButton.addEventListener('click', function() {
          tags_controller.handleNewTagButtonClick($(this), "standard");
        });
      }

      $tagFilterMenu.find("br:not('#tag-filter-menu-separator')").hide();
      $tagFilterMenu.show();

      popup.appendChild(tagAssignmentMenuFilter);
      popup.appendChild(menuTagListOverlay);

      menuTagListOverlay.style.display = 'flex';
      menuTagListOverlay.querySelector('.loader').style.display = 'block';

      await waitUntilIdle();
      popup.appendChild(tagsContainer);
      tagsContainer.style.display = 'block';
      menuTagListOverlay.style.display = 'none';

      updated = true;
    }

    return updated;
  }
}

module.exports = TagAssignmentMenu;