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
 * The TagSelectionMenu component implements the menu for selecting a tagged verse list.
 * 
 * @category Component
 */
class TagSelectionMenu {
  constructor() {
    this.tag_menu_is_opened = false;
    this.tag_menu_populated = false;
  }

  init(tabIndex=undefined) {
    var currentVerseListMenu = app_controller.getCurrentVerseListMenu(tabIndex);
    currentVerseListMenu.find('.tag-select-button').bind('click', (event) => { this.handleTagMenuClick(event); });
    $('#tag-selection-filter-input').bind('keyup', () => { this.handleTagSearchInput(); });

    $('#tag-selection-recently-used-checkbox').bind('click', (event) => {
      this.applyCurrentFilters();
    });
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
      return tags_controller.tag_store.filterRecentlyUsedTags(this);
    }).hide();
  }

  showAllTags() {
    var tagListContainer = this.getTagListContainer();
    tagListContainer.find('.tag-browser-tag').show();
  }

  hideTagMenu() {
    if (this.tag_menu_is_opened) {
      $('#app-container').find('#tag-selection-menu').hide();
      this.tag_menu_is_opened = false;

      var tag_button = $('#app-container').find('.tag-select-button');
      tag_button.removeClass('ui-state-active');
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

      if (!this.tag_menu_populated) {
        await this.updateTagSelectionMenu();
      }

      tagList.show();
      tagListOverlay.hide();
      $('#tag-selection-filter-input').select();

      this.tag_menu_is_opened = true;
      event.stopPropagation();
    }
  }

  async requestTagsForMenu(forceRefresh=false) {
    var tags = await tags_controller.getTagList(forceRefresh);
    this.renderTagsInMenu(tags);
    this.tag_menu_populated = true;
  }

  renderTagsInMenu(tags) {
    this.resetTagsInMenu();
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
    this.bindTagCbEvents();
  }

  updateCheckedTags(target_container) {
    var selected_tag_list = this.getSelectedTagList();

    // Check all the previously selected tags in the list
    var all_tags = target_container[0].querySelectorAll('.tag-browser-tag-title-content');
    
    for (var i = 0; i < all_tags.length; i++) {
      var current_tag = all_tags[i];

      var current_tag_is_checked = false;
      if (selected_tag_list !== null) {
        current_tag_is_checked = selected_tag_list.includes(current_tag.innerText);
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

      if (i < (checked_cbs.length - 1)) tag_list += ","
    }

    return tag_list;
  }

  selectedTagTitles() {
    var checked_cbs = $('.tag-browser-tag-cb:checked');
    var tag_list = "";

    for (var i = 0; i < checked_cbs.length; i++) {
      var current_tag_title = $(checked_cbs[i]).closest('.tag-browser-tag').find('.tag-browser-tag-title-content').text();
      tag_list += current_tag_title;

      if (i < (checked_cbs.length - 1)) tag_list += ", "
    }

    return tag_list;
  }

  async handleTagCbClick() {
    var currentTagIdList = this.selectedTagIds();
    var currentTagTitleList = this.selectedTagTitles();
    app_controller.openTaggedVerses(currentTagIdList, currentTagTitleList);
  }

  bindTagCbEvents() {
    var cbs = document.querySelectorAll('.tag-browser-tag-cb');
    for (var i = 0; i < cbs.length; i++) {
      cbs[i].addEventListener('click', async () => { this.handleTagCbClick(); });
      cbs[i].removeAttribute('checked');
      cbs[i].removeAttribute('disabled');
    }
  }
  
  resetTagMenu() {
    var taglist_container = this.getTagListContainer();
    var tag_cb_list = taglist_container.find('.tag-browser-tag-cb');

    for (var i = 0; i < tag_cb_list.length; i++) {
      $(tag_cb_list[i]).removeAttr('checked');
    }
  }

  async updateTagSelectionMenu(tabIndex) {
    if (!this.tag_menu_populated) {
      await this.requestTagsForMenu();
    }

    var taglist_container = this.getTagListContainer();
    this.updateCheckedTags(taglist_container);
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
