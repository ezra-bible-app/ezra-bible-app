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


class TagSelectionMenu {
  constructor() {
    this.tag_menu_is_opened = false;
    this.tag_menu_populated = false;
  }

  init(tabIndex=undefined) {
    var currentVerseListMenu = bible_browser_controller.getCurrentVerseListMenu(tabIndex);
    currentVerseListMenu.find('.tag-select-button').bind('click', (event) => { this.handleTagMenuClick(event); });
    $('#tag-selection-filter-input').bind('keyup', this.handleTagSearchInput);
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
    var currentVerseListMenu = bible_browser_controller.getCurrentVerseListMenu();
    var tagSelectButton = currentVerseListMenu.find('.tag-select-button');

    if (tagSelectButton.hasClass('ui-state-disabled')) {
      return;
    }

    if (this.tag_menu_is_opened) {
      bible_browser_controller.handleBodyClick();
    } else {
      bible_browser_controller.book_selection_menu.hide_book_menu();
      bible_browser_controller.module_search.hideSearchMenu();
      bible_browser_controller.optionsMenu.hideDisplayMenu();
      tagSelectButton.addClass('ui-state-active');

      var tag_select_button_offset = tagSelectButton.offset();
      var menu = $('#app-container').find('#tag-selection-menu');
      var top_offset = tag_select_button_offset.top + tagSelectButton.height() + 12;
      var left_offset = tag_select_button_offset.left;

      menu.css('top', top_offset);
      menu.css('left', left_offset);

      if (!this.tag_menu_populated) {
        await this.updateTagSelectionMenu();
      }

      var tagSelectionMenu = $('#tag-selection-menu');
      tagSelectionMenu.show();
      this.tag_menu_is_opened = true;
      event.stopPropagation();
    }
  }

  async requestTagsForMenu() {
    var tags = await models.Tag.getGlobalAndBookTags();
    this.renderTagsInMenu(tags);
    this.tag_menu_populated = true;
  }

  renderTagsInMenu(tags) {
    this.resetTagsInMenu();
    var taglist_container = $('#tag-selection-taglist-global');
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

      if (only_local && (current_book_id == null)) {
        continue;
      }

      var current_tag_html = this.getHtmlForTag(current_tag_id,
                                                current_tag_title,
                                                current_assignment_count);
      all_tags_html += current_tag_html;
    }

    target_element.innerHTML = all_tags_html;
    this.bindTagCbEvents();
  }

  updateCheckedTags(target_container) {
    var selected_tag_list = this.getSelectedTagList();

    // Check all the previously selected tags in the list
    var all_tags = target_container.find('.tag-browser-tag-title-content');
    
    for (var i = 0; i < all_tags.length; i++) {
      var current_tag = $(all_tags[i]);

      var current_tag_is_checked = false;
      if (selected_tag_list !== null) {
        current_tag_is_checked = selected_tag_list.includes(current_tag.text());
      }

      var tag_browser_tag = current_tag.closest('.tag-browser-tag');
      var tag_cb = tag_browser_tag.find('.tag-browser-tag-cb'); 

      if (current_tag_is_checked) {
        tag_cb.attr('checked','checked');
      } else {
        tag_cb.removeAttr('checked');
      }
    }
  }

  getHtmlForTag(tag_id, tag_title, tag_assignment_count) {
    return "<div id='tag-browser-tag-" + tag_id + 
           "' class='tag-browser-tag'>" + 
           "<div class='tag-browser-tag-id'>" + tag_id + "</div>" +
           "<input class='tag-browser-tag-cb' type='checkbox'></input>" +
           "<div class='tag-browser-tag-title clickable-checkbox-label'>" +
           "<span class='tag-browser-tag-title-content'>" + tag_title + "</span>" +
           "<span class='tag-browser-tag-assignment-count'>(" + tag_assignment_count + ")</span>" +
           "</div>" +
           "</div>";
  }

  handleTagSearchInput(e) {
    clearTimeout(this.tag_search_timeout);
    var search_value = $(this).val();

    this.tag_search_timeout = setTimeout(function filter_tag_list() {
      //console.time('filter-tag-list');
      var labels = $('#tag-selection-taglist-global').find('.tag-browser-tag-title-content');
      $('#tag-selection-taglist-global').find('.tag-browser-tag').hide();

      for (var i = 0; i < labels.length; i++) {
        var current_label = $(labels[i]);

        if (current_label.text().toLowerCase().indexOf(search_value.toLowerCase()) != -1) {
          var current_tag_box = current_label.closest('.tag-browser-tag');
          current_tag_box.show();
        }
      }
      //console.timeEnd('filter-tag-list');
    }, 300);
  }

  resetTagsInMenu() {
    var taglist_container = $('#tag-selection-taglist-global');
    while (taglist_container.firstChild) {
      taglist_container.removeChild(taglist_container.firstChild);
    }
  }

  getSelectedTagList() {
    var currentTab = bible_browser_controller.tab_controller.getTab();
    var currentTagIdList = currentTab.getTagIdList();
    var currentTextType = currentTab.getTextType();
    
    if (currentTextType == 'tagged_verses' && currentTagIdList != null) {
      var currentTagTitleList = bible_browser_controller.tab_controller.getTab().getTagTitleList();
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

  handleTagCbClick(event) {
    var currentTagIdList = this.selectedTagIds();
    var currentTagTitleList = this.selectedTagTitles();
    var currentTab = bible_browser_controller.tab_controller.getTab();
    currentTab.setTextType('tagged_verses');
    currentTab.setTagIdList(currentTagIdList);
    bible_browser_controller.tab_controller.setCurrentTagTitleList(currentTagTitleList);

    // Set book and search term to null, since we just switched to a tag
    currentTab.setBook(null, null);
    currentTab.setSearchTerm(null);
    
    if (currentTagIdList != "") {
      setTimeout(() => {
        this.hideTagMenu();
      }, 700);
    }

    bible_browser_controller.getTaggedVerses();
  }

  bindTagCbEvents() {
    var cbs = document.querySelectorAll('.tag-browser-tag-cb');
    for (var i = 0; i < cbs.length; i++) {
      cbs[i].addEventListener('click', (event) => { this.handleTagCbClick(event); });
      cbs[i].removeAttribute('checked');
      cbs[i].removeAttribute('disabled');
    }
  }
  
  resetTagMenu() {
    var taglist_container = $('#tag-selection-taglist-global');
    var tag_cb_list = taglist_container.find('.tag-browser-tag-cb');

    for (var i = 0; i < tag_cb_list.length; i++) {
      $(tag_cb_list[i]).removeAttr('checked');
    }
  }

  async updateTagSelectionMenu(tabIndex) {
    if (!this.tag_menu_populated) {
      await this.requestTagsForMenu();
    }

    var taglist_container = $('#tag-selection-taglist-global');
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
}

module.exports = TagSelectionMenu;
