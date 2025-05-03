/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2025 Ezra Bible App Development Team <contact@ezrabibleapp.net>

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

  reset() {
    $('#tag-list-filter-button-active').hide();
    let tagFilterAllTagsOption = document.getElementById('tag-filter-all-tags');
    tagFilterAllTagsOption.click();
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

  handleTagSearchInput(event) {
    let currentFilterString = document.getElementById('tags-search-input').value;
    
    // If there's an active tag filter menu, hide it
    if (document.getElementById('tag-filter-menu') && 
        document.getElementById('tag-filter-menu').style.display == 'block') {
      this.hideTagFilterMenu();
    }
    
    // Reset the filter menu button to show normal state
    const filterButton = document.getElementById('tag-list-filter-button');
    const filterButtonActive = document.getElementById('tag-list-filter-button-active');
    
    if (filterButton) {
      filterButton.style.display = '';
    }
    
    if (filterButtonActive) {
      filterButtonActive.style.display = 'none';
    }
    
    // Clear all the filter radio buttons and check the "all" filter
    const allTagsFilter = document.getElementById('all-tags-filter');
    if (allTagsFilter) {
      // Get all filter radio buttons
      const filterRadios = document.querySelectorAll('#tag-filter-menu input[type="radio"]');
      for (let i = 0; i < filterRadios.length; i++) {
        filterRadios[i].checked = false;
      }
      
      // Check the "all" filter
      allTagsFilter.checked = true;
    }
    
    if (currentFilterString == '') {
      // No filter - show all tags
      this.showAllCheckboxTags();
    } else {
      // If the tag controller has full tag list, perform search against all tags
      if (tags_controller && tags_controller.fullTagList && tags_controller.fullTagList.length > 0) {
        this.performFullTagSearch(currentFilterString);
      } else {
        // Fall back to filtering only visible tags
        this.performVisibleTagsSearch(currentFilterString);
      }
    }
    
    // Update the scrollbar after filtering
    if (tags_controller && tags_controller.ps) {
      tags_controller.ps.update();
    }
  }
  
  performFullTagSearch(searchString) {
    const tagsContentGlobal = document.getElementById('tags-content-global');
    
    // First, hide all currently visible tags
    this.hideAllCheckboxTags();
    
    // Keep track of how many tags match
    let matchedTags = [];
    
    // Search through the full tag list to find matches
    if (tags_controller && tags_controller.fullTagList) {
      tags_controller.fullTagList.forEach(tag => {
        if (this.tagTitleMatchesFilter(tag.title, searchString)) {
          matchedTags.push(tag.id);
        }
      });
    }
    
    // Clear the tags container and load all matching tags at once
    if (matchedTags.length > 0) {
      // Get all currently loaded tags
      const loadedTags = tagsContentGlobal.querySelectorAll('.checkbox-tag');
      
      // Show the ones that match
      let visibleCounter = 1;
      loadedTags.forEach(tagElement => {
        const tagId = parseInt(tagElement.getAttribute('tag-id'));
        
        if (matchedTags.includes(tagId)) {
          tagElement.classList.remove('hidden');
          this.addAlternatingClass(tagElement, visibleCounter);
          visibleCounter++;
        } else {
          tagElement.classList.add('hidden');
        }
      });
      
      // Check if we need to load more tags
      const loadedTagIds = Array.from(loadedTags).map(tag => parseInt(tag.getAttribute('tag-id')));
      const tagsToLoad = matchedTags.filter(id => !loadedTagIds.includes(id));
      
      if (tagsToLoad.length > 0) {
        // Load the additional matching tags
        this.loadMatchingTags(tagsToLoad);
      }
    }
    
    // Update the scrollbar after filtering
    if (tags_controller && tags_controller.ps) {
      setTimeout(() => {
        tags_controller.ps.update();
      }, 10);
    }
  }
  
  async loadMatchingTags(tagIds) {
    if (!tags_controller || !tags_controller.fullTagList) return;
    
    // Get tags that match the IDs
    const tagsToLoad = tags_controller.fullTagList.filter(tag => tagIds.includes(tag.id));
    
    if (tagsToLoad.length === 0) return;
    
    // Generate HTML for these tags
    const tagListHtml = tags_controller.generateTagListHtml(tagsToLoad, tags_controller.fullTagStatistics);
    
    // Add these tags to the container
    const tagsPanel = document.getElementById('tags-content-global');
    if (!tagsPanel) return;
    
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = tagListHtml;
    
    // Append each tag individually to maintain event binding
    let visibleCounter = document.querySelectorAll('#tags-content-global .checkbox-tag:not(.hidden)').length + 1;
    
    while (tempContainer.firstChild) {
      tagsPanel.appendChild(tempContainer.firstChild);
      
      // Get the tag we just added and make sure it exists before modifying it
      const addedTag = tagsPanel.lastChild;
      if (addedTag && addedTag.classList) {
        addedTag.classList.remove('hidden');
        this.addAlternatingClass(addedTag, visibleCounter);
        visibleCounter++;
      }
    }
    
    // Configure the new tag elements
    uiHelper.configureButtonStyles('#tags-content-global');
  }
  
  performVisibleTagsSearch(searchString) {
    // This is the original method for filtering only visible tags
    this.hideAllCheckboxTags();
    
    const tagLabels = document.querySelectorAll('#tags-content-global .cb-label');
    let visibleCounter = 1;
    
    for (let i = 0; i < tagLabels.length; i++) {
      const currentLabel = $(tagLabels[i]);
      
      if (this.tagTitleMatchesFilter(currentLabel.text(), searchString)) {
        const checkboxTag = $(currentLabel.closest('.checkbox-tag'));
        checkboxTag.removeClass('hidden');
        
        this.addAlternatingClass(checkboxTag[0], visibleCounter);
        visibleCounter += 1;
      }
    }
  }
}

module.exports = TagListFilter;