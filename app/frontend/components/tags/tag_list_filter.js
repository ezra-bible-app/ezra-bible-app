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

const { waitUntilIdle, sleep } = require('../../helpers/ezra_helper.js');
const eventController = require('../../controllers/event_controller.js');

/**
 * The TagListFilter component implements the filter functionality of the tag list.
 * 
 * @category Component
 */
class TagListFilter {
  constructor() {
  }

  stringMatches(search_string, search_value) {
    if (search_value == "") {
      return true;
    }

    var result = eval("search_string.search(/" + search_value + "/i)");
    return result != -1;
  }

  handleFilterButtonClick(e) {
    eventController.publish('on-button-clicked');

    var position = $(e.target).offset();
    var filter_menu = $('#tag-filter-menu');

    if (filter_menu.is(':visible')) {
      filter_menu.css('display', 'none');
    } else {
      filter_menu.css('top', position.top + 20);
      filter_menu.css('left', position.left);
      filter_menu.show();
    }
  }

  addAlternatingClass(element, counter) {
    if (counter % 2 != 0) {
      element.classList.add('odd');
    } else {
      element.classList.add('even');
    }
  }

  addAlternatingClassAndIncrementCounter(checkboxTag, counter) {
    checkboxTag.classList.remove('hidden');
    this.addAlternatingClass(checkboxTag, counter);
    return (counter + 1);
  }

  async handleTagFilterTypeClick(e) {
    await waitUntilIdle();
    tags_controller.tag_list_filter.showTagSelectionFilterLoadingIndicator();
    await sleep(500);

    var selected_type = $(e.target)[0].value;
    var tags_content_global = $('#tags-content-global');

    if (selected_type != "all") {
      tags_controller.tag_list_filter.hideAllCheckboxTags();
    } else {
      tags_controller.tag_list_filter.showAllCheckboxTags();
    }

    $('#tag-list-filter-button-active').hide();

    var visibleCounter = 1;

    switch (selected_type) {
      case "assigned":
        tags_content_global.find('.checkbox-tag[book-assignment-count!="' + 0 + '"]').each((index, checkboxTag) => {
          visibleCounter = tags_controller.tag_list_filter.addAlternatingClassAndIncrementCounter(checkboxTag, visibleCounter);
        });

        $('#tag-list-filter-button-active').show();
        break;

      case "unassigned":
        tags_content_global.find('.checkbox-tag[book-assignment-count="' + 0 + '"]').each((index, checkboxTag) => {
          visibleCounter = tags_controller.tag_list_filter.addAlternatingClassAndIncrementCounter(checkboxTag, visibleCounter);
        });

        $('#tag-list-filter-button-active').show();
        break;
      
      case "recently-used":
        tags_content_global.find('.checkbox-tag').filter((index, element) => {
          return !tags_controller.tag_store.filterRecentlyUsedTags(element);
        }).each((index, checkboxTag) => {
          visibleCounter = tags_controller.tag_list_filter.addAlternatingClassAndIncrementCounter(checkboxTag, visibleCounter);
        });

        $('#tag-list-filter-button-active').show();
        break;

      case "all":
      default:
        break;
    }

    tags_controller.tag_list_filter.hideTagSelectionFilterLoadingIndicator();

    setTimeout(() => {
      tags_controller.tag_list_filter.hideTagFilterMenuIfInToolBar();
    }, 500);
  }

  hideTagFilterMenuIfInToolBar() {
    var tagFilterMenu = document.getElementById('tag-filter-menu');
    if (tagFilterMenu.parentNode.getAttribute('id') == 'boxes') {
      $('#tag-filter-menu').hide();
    }
  }

  showTagSelectionFilterLoadingIndicator() {
    var tagFilterMenu = document.getElementById('tag-filter-menu');
    if (tagFilterMenu.parentNode.getAttribute('id') != 'boxes') {
      $('#tag-selection-filter-loading-indicator').find('.loader').css('visibility', 'visible');
    }
  }

  hideTagSelectionFilterLoadingIndicator() {
    $('#tag-selection-filter-loading-indicator').find('.loader').css('visibility', 'hidden');
  }

  tagTitleMatchesFilter(tag_title, filter) {
    return tag_title.toLowerCase().indexOf(filter.toLowerCase()) != -1;
  }

  hideAllCheckboxTags() {
    var tags_content = document.getElementById('tags-content-global');

    tags_content.querySelectorAll('.checkbox-tag').forEach((el) => {
      el.classList.add('hidden');
      el.classList.remove('odd');
      el.classList.remove('even');
    });
  }

  showAllCheckboxTags() {
    var tags_content = document.getElementById('tags-content-global');

    tags_content.querySelectorAll('.checkbox-tag').forEach((el) => {
      el.classList.remove('hidden');
      el.classList.remove('odd');
      el.classList.remove('even');
    });
  }

  handleTagSearchInput(e) {
    clearTimeout(tags_controller.tag_search_timeout);
    var search_value = $(e.target).val();

    this.tag_search_timeout = setTimeout(() => {
      //console.time('filter-tag-list');
      this.hideAllCheckboxTags();

      var tags_content = document.getElementById('tags-content-global');
      var tag_labels = tags_content.querySelectorAll('.cb-label');
      var visibleCounter = 1;

      for (let i = 0; i < tag_labels.length; i++) {
        let current_label = $(tag_labels[i]);

        if (this.tagTitleMatchesFilter(current_label.text(), search_value)) {
          let checkboxTag = $(current_label.closest('.checkbox-tag'));
          checkboxTag.removeClass('hidden');

          if (search_value != "") {
            this.addAlternatingClass(checkboxTag[0], visibleCounter);
          }

          visibleCounter += 1;
        }
      }
      //console.timeEnd('filter-tag-list');
    }, 200);
  }
}

module.exports = TagListFilter;