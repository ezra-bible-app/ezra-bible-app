/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2026 Ezra Bible App Development Team <contact@ezrabibleapp.net>

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
 * The TagSelectionMenu component implements the menu for selecting a tagged verse list.
 * 
 * @category Component
 */
class TagSelectionMenu {
  constructor() {
    this.tag_menu_is_opened = false;
    this.tag_menu_populated = false;
    this.currentTagGroupId = -1;

    this.bindUserEvents();
    this.subscribeAppEvents();
  }

  bindUserEvents() {
    $('#tag-selection-filter-input').bind('keyup', () => { this.handleTagSearchInput(); });

    // eslint-disable-next-line no-unused-vars
    $('#tag-selection-recently-used-checkbox').bind('click', (event) => {
      this.applyCurrentFilters();
    });

    $('#select-all-tags-button').bind('click', () => {
      this.selectAllTags();
    });

    $('#deselect-all-tags-button').bind('click', () => {
      this.deselectAllTags();
    });

    $('#confirm-tag-selection-button').bind('click', () => {
      this.handleConfirmButtonClick();
    });

    $('#tagSelectionBackButton').bind('click', () => {
      setTimeout(() => { this.hideTagMenu(); }, 100);
    });
  }

  subscribeAppEvents() {
    eventController.subscribe('on-tab-added', (tabIndex) => {
      this.initForTab(tabIndex);
    });

    eventController.subscribeMultiple(['on-tag-created', 'on-tag-deleted'], async () => {
      await this.requestTagsForMenu(this.currentTagGroupId, true);
    });

    eventController.subscribe('on-tag-renamed', async() => {
      await this.requestTagsForMenu(this.currentTagGroupId);
    });

    eventController.subscribe('on-tag-selection-menu-group-list-activated', () => {
      this.getTagListContainer()[0].style.display = 'none';
      document.getElementById('tag-selection-filter-buttons').style.display = 'none';
      document.getElementById('tag-selection-filter').style.display = 'none';
      document.getElementById('tag-selection-summary').style.display = 'none';
      document.getElementById('tag-selection-menu-tag-group-list').style.removeProperty('display');
    });

    eventController.subscribe('on-tag-selection-menu-group-selected', async (tagGroup) => {
      this.showTagGroup(tagGroup.id);
    });
  }

  initForTab(tabIndex=undefined) {
    var currentVerseListMenu = app_controller.getCurrentVerseListMenu(tabIndex);
    currentVerseListMenu.find('.tag-select-button').bind('click', (event) => { this.handleTagMenuClick(event); });
  }

  hideTagGroupList() {
    document.getElementById('tag-selection-menu-tag-group-list').style.display = 'none';
  }

  async showTagGroup(tagGroupId) {
    this.hideTagGroupList();

    this.currentTagGroupId = tagGroupId;
    await this.requestTagsForMenu(this.currentTagGroupId);
    await this.updateTagSelectionMenu();

    this.showTagListUi();
  }

  showTagListUi() {
    this.getTagListContainer()[0].style.removeProperty('display');
    document.getElementById('tag-selection-filter-buttons').style.display = 'flex';
    document.getElementById('tag-selection-filter').style.removeProperty('display');
    document.getElementById('tag-selection-summary').style.display = 'flex';
  }

  selectAllTags() {
    var tagListContainer = this.getTagListContainer()[0];
    tagListContainer.querySelectorAll('.tag-browser-tag-cb').forEach((cb) => { cb.checked = true; });
    this.handleTagSelection();

    var selectAllButton = document.getElementById('select-all-tags-button');
    selectAllButton.classList.add('ui-state-disabled');
  }

  deselectAllTags() {
    var tagListContainer = this.getTagListContainer()[0];
    tagListContainer.querySelectorAll('.tag-browser-tag-cb').forEach((cb) => { cb.checked = false; });
    this.handleTagSelection();

    var selectAllButton = document.getElementById('select-all-tags-button');
    selectAllButton.classList.remove('ui-state-disabled');
  }

  getTagListContainer() {
    return $('#tag-selection-taglist-global');
  }

  applyCurrentFilters() {
    this.showAllTags();
    
    this.applyTagSearchFilter();

    if ($('#tag-selection-recently-used-checkbox').prop('checked') == true) {
      this.filterRecentlyUsed();
    }
  }

  filterRecentlyUsed() {
    var tagListContainer = this.getTagListContainer();

    tagListContainer.find('.tag-browser-tag').filter(function() {
      return tag_assignment_panel.tag_store.filterRecentlyUsedTags(this);
    }).hide();
  }

  showAllTags() {
    var tagListContainer = this.getTagListContainer();
    tagListContainer.find('.tag-browser-tag').show();
  }

  async hideTagMenu() {
    if (this.tag_menu_is_opened) {
      document.getElementById('tag-selection-menu').style.display = 'none';
      document.getElementById('app-container').classList.remove('fullscreen-menu');

      let groupList = document.getElementById('tag-selection-menu-tag-group-list');
      let currentGroup = await groupList.tagGroupManager.getItemById(this.currentTagGroupId);

      eventController.publishAsync('on-tag-selection-menu-group-selected', currentGroup);

      var tag_button = $('#app-container').find('.tag-select-button');
      tag_button.removeClass('ui-state-active');

      this.tag_menu_is_opened = false;
    }
  }

  async handleTagMenuClick(event) {
    var currentVerseListMenu = app_controller.getCurrentVerseListMenu();
    var tagSelectButton = currentVerseListMenu.find('.tag-select-button');

    if (tagSelectButton.hasClass('ui-state-disabled')) {
      return;
    }

    if (this.tag_menu_is_opened) {
      app_controller.handleBodyClick();
    } else {
      app_controller.hideAllMenus();

      document.getElementById('app-container').classList.add('fullscreen-menu');

      tagSelectButton.addClass('ui-state-active');
      var tag_select_button_offset = tagSelectButton.offset();

      var menu = $('#app-container').find('#tag-selection-menu');
      var tagList = $('#app-container').find('#tag-selection-taglist-global');
      var tagListOverlay = $('#app-container').find('#tag-selection-taglist-overlay');

      var top_offset = tag_select_button_offset.top + tagSelectButton.height() + 1;
      var left_offset = tag_select_button_offset.left;

      menu.css('top', top_offset);
      menu.css('left', left_offset);

      // Show an overlay while the actual menu is rendering
      tagList.hide();
      tagListOverlay.css('display', 'flex');
      tagListOverlay.find('.loader').show();
      menu.show();

      await waitUntilIdle();
      await this.updateTagSelectionMenu();

      tagList.show();
      tagListOverlay.hide();
      this.showTagListUi();

      uiHelper.configureButtonStyles('#tag-selection-menu');

      if (platformHelper.isElectron()) {
        // We're only focussing the search filter on Electron, because on Android it would trigger the screen keyboard right away
        // and that would be disturbing from a usability perspective.
        $('#tag-selection-filter-input').select();
      }

      this.tag_menu_is_opened = true;
      event.stopPropagation();
    }
  }

  async requestTagsForMenu(tagGroupId=null, forceRefresh=false) {
    var tags = await tag_assignment_panel.getTagList(forceRefresh);

    if (tagGroupId != null && tagGroupId > 0) {
      tags = await tag_assignment_panel.tag_store.getTagGroupMembers(tagGroupId, tags);
    }

    this.renderTagsInMenu(tags);
    this.tag_menu_populated = true;
  }

  renderTagsInMenu(tags) {
    this.resetTagsInMenu();

    if (tags.length > 50) {
      document.getElementById('select-all-tags-button').style.display = 'none';
    } else {
      document.getElementById('select-all-tags-button').style.removeProperty('display');
    }

    var taglist_container = this.getTagListContainer();
    this.renderTagList(tags, taglist_container, false);
    this.bindClickToCheckboxLabels();
  }

  bindClickToCheckboxLabels() {
    $('.clickable-checkbox-label:not(.events-configured)').bind('click', function() {
      var closest_input = $(this).prevAll('input:first');

      if (closest_input.attr('type') == 'checkbox') {
        closest_input[0].click();
      }
    }).addClass('events-configured');
  }

  renderTagList(tag_list, target_container, only_local) {
    var target_element = target_container[0];
    var all_tags_html = "";

    for (var i = 0; i < tag_list.length; i++) {
      var current_tag = tag_list[i];
      var current_tag_title = current_tag.title;
      var current_tag_id = current_tag.id;
      var current_book_id = current_tag.bibleBookId;
      var current_assignment_count = current_tag.globalAssignmentCount;
      var current_tag_last_used = current_tag.lastUsed;

      if (only_local && (current_book_id == null)) {
        continue;
      }

      var current_tag_html = this.getHtmlForTag(current_tag_id,
                                                current_tag_title,
                                                current_assignment_count,
                                                current_tag_last_used);
      all_tags_html += current_tag_html;
    }

    target_element.innerHTML = all_tags_html;
    this.initTagCBs();
  }

  updateCheckedTags(target_container) {
    var selected_tag_list = this.getSelectedTagList();

    // Check all the previously selected tags in the list
    var all_tags = target_container[0].querySelectorAll('.tag-browser-tag-title-content');
    
    for (var i = 0; i < all_tags.length; i++) {
      var current_tag = all_tags[i];

      var current_tag_is_checked = false;
      if (selected_tag_list !== null) {
        current_tag_is_checked = selected_tag_list.includes(current_tag.textContent);
      }

      var tag_browser_tag = current_tag.closest('.tag-browser-tag');
      var tag_cb = tag_browser_tag.querySelector('.tag-browser-tag-cb'); 

      if (current_tag_is_checked) {
        tag_cb.checked = true;
      } else {
        tag_cb.checked = false;
      }
    }
  }

  getHtmlForTag(tag_id, tag_title, tag_assignment_count, tag_last_used) {
    return "<div id='tag-browser-tag-" + tag_id + 
           "' class='tag-browser-tag' last-used-timestamp='" + tag_last_used + "'>" + 
           "<div class='tag-browser-tag-id'>" + tag_id + "</div>" +
           "<input class='tag-browser-tag-cb' type='checkbox'></input>" +
           "<div class='tag-browser-tag-title clickable-checkbox-label'>" +
           "<span class='tag-browser-tag-title-content'>" + tag_title + "</span>" +
           "<span class='tag-browser-tag-assignment-count'>(" + tag_assignment_count + ")</span>" +
           "</div>" +
           "</div>";
  }

  applyTagSearchFilter() {
    //console.time('filter-tag-list');
    
    var search_value = $('#tag-selection-filter-input').val();
    var tagListContainer = this.getTagListContainer();

    var labels = tagListContainer.find('.tag-browser-tag-title-content');
    tagListContainer.find('.tag-browser-tag').hide();

    for (var i = 0; i < labels.length; i++) {
      var current_label = $(labels[i]);

      if (current_label.text().toLowerCase().indexOf(search_value.toLowerCase()) != -1) {
        var current_tag_box = current_label.closest('.tag-browser-tag');
        current_tag_box.show();
      }
    }
    //console.timeEnd('filter-tag-list');
  }

  handleTagSearchInput() {
    clearTimeout(this.tag_search_timeout);
    this.tag_search_timeout = setTimeout(() => { this.applyCurrentFilters(); }, 300);
  }

  resetTagsInMenu() {
    var taglist_container = this.getTagListContainer();
    while (taglist_container.firstChild) {
      taglist_container.removeChild(taglist_container.firstChild);
    }
  }

  getSelectedTagList() {
    var currentTab = app_controller.tab_controller.getTab();
    var currentTagIdList = currentTab.getTagIdList();
    var currentTextType = currentTab.getTextType();
    
    if (currentTextType == 'tagged_verses' && currentTagIdList != null) {
      var currentTagTitleList = app_controller.tab_controller.getTab().getTagTitleList();
      if (currentTagTitleList != null) {
        var tag_list = currentTagTitleList.split(', ');
        return tag_list;
      }
    }

    return null;
  }

  selectedTagIds() {
    var checked_cbs = $('.tag-browser-tag-cb:checked');
    var tag_list = "";

    for (var i = 0; i < checked_cbs.length; i++) {
      var current_tag_id = $(checked_cbs[i]).closest('.tag-browser-tag').find('.tag-browser-tag-id').html();
      tag_list += current_tag_id;

      if (i < (checked_cbs.length - 1)) tag_list += ",";
    }

    return tag_list;
  }

  selectedTagTitles() {
    var checked_cbs = $('.tag-browser-tag-cb:checked');
    var tag_list = "";

    for (var i = 0; i < checked_cbs.length; i++) {
      var current_tag_title = $(checked_cbs[i]).closest('.tag-browser-tag').find('.tag-browser-tag-title-content').text();
      tag_list += current_tag_title;

      if (i < (checked_cbs.length - 1)) tag_list += ", ";
    }

    return tag_list;
  }

  async handleConfirmButtonClick() {
    this.hideTagMenu();
    var currentTagIdList = this.selectedTagIds();
    var currentTagTitleList = this.selectedTagTitles();
    app_controller.openTaggedVerses(currentTagIdList, currentTagTitleList);
  }

  handleTagSelection() {
    var tagCountSelectedLabel = document.getElementById('tag-count-selected-label');
    var confirmButton = document.getElementById('confirm-tag-selection-button');
    var deselectAllButton = document.getElementById('deselect-all-tags-button');
    var selectAllButton = document.getElementById('select-all-tags-button');
    var currentTagIdList = this.selectedTagIds();
    var currentTagTitleList = this.selectedTagTitles();
    var selectedTagCount = 0;
   
    if (currentTagIdList != "") { 
      selectedTagCount = currentTagIdList.split(',').length;
    }

    var taglistContainer = this.getTagListContainer();
    var tagList = taglistContainer[0].querySelectorAll('.tag-browser-tag');

    if (selectedTagCount == tagList.length) {
      selectAllButton.classList.add('ui-state-disabled');
    } else {
      selectAllButton.classList.remove('ui-state-disabled');
    }

    if (selectedTagCount > 0) {
      confirmButton.classList.remove('ui-state-disabled');
      deselectAllButton.classList.remove('ui-state-disabled');
    } else {
      confirmButton.classList.add('ui-state-disabled');
      deselectAllButton.classList.add('ui-state-disabled');
    }

    var tagCountLabelText = i18n.t('tags.tag-count-selected', { count: selectedTagCount });
    tagCountSelectedLabel.textContent = tagCountLabelText;
    tagCountSelectedLabel.setAttribute('title', currentTagTitleList);
  }

  initTagCBs() {
    var cbs = document.querySelectorAll('.tag-browser-tag-cb');
    for (var i = 0; i < cbs.length; i++) {
      cbs[i].addEventListener('click', async () => { 
        this.handleTagSelection(); 
      });

      cbs[i].removeAttribute('checked');
      cbs[i].removeAttribute('disabled');
    }
  }
  
  resetTagMenu() {
    var taglist_container = this.getTagListContainer();
    var tag_cb_list = taglist_container[0].querySelectorAll('.tag-browser-tag-cb');

    for (var i = 0; i < tag_cb_list.length; i++) {
      tag_cb_list[i].checked = false;
    }
  }

  // eslint-disable-next-line no-unused-vars
  async updateTagSelectionMenu() {
    if (!this.tag_menu_populated) {
      await this.requestTagsForMenu();
    }

    var taglist_container = this.getTagListContainer();
    this.updateCheckedTags(taglist_container);
    
    this.applyCurrentFilters();
    this.handleTagSelection();
  }

  updateVerseCountInTagMenu(tag_title, new_count) {
    var tag_list = $('.tag-browser-tag');

    for (var i = 0; i < tag_list.length; i++) {
      var current_tag = $(tag_list[i]).find('.tag-browser-tag-title-content').text();
      if (current_tag == tag_title) {
        $(tag_list[i]).find('.tag-browser-tag-assignment-count').text('(' + new_count + ')');
        break;
      }
    }
  }

  updateLastUsedTimestamp(tagId, timestamp) {
    var tagElement = $('#tag-browser-tag-' + tagId);
    tagElement.attr('last-used-timestamp', timestamp);
  }
}

module.exports = TagSelectionMenu;
