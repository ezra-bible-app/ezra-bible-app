/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2026 Ezra Bible App Development Team <contact@ezrabibleapp.net>

   Ezra Bible App is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 2 of the License, or
   (at your option) any later version.

   Ezra Bible App is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Bible App. See the file LICENSE.
   If not, see <http://www.gnu.org/licenses/>. */

const { waitUntilIdle, sleep } = require('../../../helpers/ezra_helper.js');
const eventController = require('../../../controllers/event_controller.js');

/**
 * The TagListFilter component implements the filter functionality of the tag list.
 * 
 * @category Component
 */
class TagListFilter {
  constructor() {
  }

  /**
   * Reapplies the current filter to the tag list.
   * When called without parameters, the method automatically detects the current filter state.
   * @param {string} searchValue - Optional: Current search input value
   * @param {boolean} isFilterActive - Optional: Whether a filter is currently active
   * @param {string} filterType - Optional: The type of filter ('all', 'assigned', 'unassigned', 'recently-used')
   */
  reapplyCurrentFilter(searchValue = null, isFilterActive = null, filterType = null) {
    // If parameters aren't provided, get the current filter state from the DOM
    if (searchValue === null || isFilterActive === null || filterType === null) {
      const tagsSearchInput = document.getElementById('tags-search-input');
      searchValue = tagsSearchInput ? tagsSearchInput.value : '';
      
      const filterButtonActive = document.getElementById('tag-list-filter-button-active');
      isFilterActive = filterButtonActive && filterButtonActive.style.display !== 'none';
      
      const activeFilterOption = document.querySelector('#tag-filter-menu input:checked');
      filterType = activeFilterOption ? activeFilterOption.value : 'all';
    }

    // Apply search filter if there's a search value
    if (searchValue && searchValue.length > 0) {
      const tagsSearchInput = document.getElementById('tags-search-input');
      tagsSearchInput.value = searchValue;
      this.handleTagSearchInput({target: tagsSearchInput});
    } 
    // Apply tag filter type if filter is active and not set to 'all'
    else if (isFilterActive && filterType !== 'all') {
      // Make sure the filter button is active
      const filterButtonActive = document.getElementById('tag-list-filter-button-active');
      const filterButtonInactive = document.getElementById('tag-list-filter-button');
      
      if (filterButtonActive.style.display === 'none') {
        // Activate the filter button
        filterButtonActive.style.display = '';
        filterButtonInactive.style.display = 'none';
      }
      
      // Set the radio button in the filter menu
      const filterInput = document.querySelector(`#tag-filter-menu input[value="${filterType}"]`);
      if (filterInput) {
        filterInput.checked = true;
        this.handleTagFilterTypeClick({target: filterInput});
      }
    } else {
      // Make sure the loading indicator is hidden in any case
      tag_assignment_panel.hideTagListLoadingIndicator();
    }
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
    tag_assignment_panel.tag_list_filter.showTagSelectionFilterLoadingIndicator();
    await sleep(500);

    var selected_type = $(e.target)[0].value;
    var tags_content_global = $('#tags-content-global');

    if (selected_type != "all") {
      tag_assignment_panel.tag_list_filter.hideAllCheckboxTags();
    } else {
      tag_assignment_panel.tag_list_filter.showAllCheckboxTags();
    }

    $('#tag-list-filter-button-active').hide();

    var visibleCounter = 1;

    switch (selected_type) {
      case "assigned":
        tags_content_global.find('.checkbox-tag[book-assignment-count!="' + 0 + '"]').each((index, checkboxTag) => {
          visibleCounter = tag_assignment_panel.tag_list_filter.addAlternatingClassAndIncrementCounter(checkboxTag, visibleCounter);
        });

        $('#tag-list-filter-button-active').show();
        break;

      case "unassigned":
        tags_content_global.find('.checkbox-tag[book-assignment-count="' + 0 + '"]').each((index, checkboxTag) => {
          visibleCounter = tag_assignment_panel.tag_list_filter.addAlternatingClassAndIncrementCounter(checkboxTag, visibleCounter);
        });

        $('#tag-list-filter-button-active').show();
        break;
      
      case "recently-used":
        tags_content_global.find('.checkbox-tag').filter((index, element) => {
          return !tag_assignment_panel.tag_store.filterRecentlyUsedTags(element);
        }).each((index, checkboxTag) => {
          visibleCounter = tag_assignment_panel.tag_list_filter.addAlternatingClassAndIncrementCounter(checkboxTag, visibleCounter);
        });

        $('#tag-list-filter-button-active').show();
        break;

      case "all":
      default:
        break;
    }

    tag_assignment_panel.tag_list_filter.hideTagSelectionFilterLoadingIndicator();
    
    // Make sure the main loading indicator is hidden
    tag_assignment_panel.hideTagListLoadingIndicator();
    
    // Update the virtual height container to match visible tags
    tag_assignment_panel.updateVirtualContainerSize();

    setTimeout(() => {
      tag_assignment_panel.tag_list_filter.hideTagFilterMenuIfInToolBar();
    }, 500);
  }

  hideTagFilterMenuIfInToolBar() {
    var tagFilterMenu = document.getElementById('tag-filter-menu');
    if (tagFilterMenu.parentNode.getAttribute('id') == 'boxes') {
      $('#tag-filter-menu').hide();
    }
  }

  hideTagFilterMenu() {
    var tagFilterMenu = document.getElementById('tag-filter-menu');
    if (tagFilterMenu) {
      tagFilterMenu.style.display = 'none';
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
      this.performFullTagSearch(currentFilterString);
    }
    
    // Update the scrollbar after filtering
    if (tag_assignment_panel && tag_assignment_panel.ps) {
      tag_assignment_panel.ps.update();
    }
    
    // Make sure the loading indicator is hidden
    tag_assignment_panel.hideTagListLoadingIndicator();
    
    // Update the virtual height container to match visible tags
    tag_assignment_panel.updateVirtualContainerSize();
  }
  
  performFullTagSearch(searchString) {
    const tagsContentGlobal = document.getElementById('tags-content-global');
    
    // First, hide all currently visible tags
    this.hideAllCheckboxTags();
    
    // Keep track of how many tags match
    let matchedTags = [];
    
    // Search through the full tag list to find matches
    if (tag_assignment_panel && tag_assignment_panel.tag_list_renderer.fullTagList) {
      tag_assignment_panel.tag_list_renderer.fullTagList.forEach(tag => {
        if (this.tagTitleMatchesFilter(tag.title, searchString)) {
          matchedTags.push(tag.id);
        }
      });
    }
    
    // Show matching tags
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
      
      // Check if we need to load more tags by comparing loaded tag IDs with all matched tag IDs
      const loadedTagIds = Array.from(loadedTags).map(tag => parseInt(tag.getAttribute('tag-id')));
      const tagsToLoad = matchedTags.filter(id => !loadedTagIds.includes(id));
      
      if (tagsToLoad.length > 0) {
        // Load the additional matching tags that aren't currently in the DOM
        this.loadMatchingTags(tagsToLoad);
      }
    }
    
    // Update the scrollbar after filtering, with a small delay to allow DOM updates
    if (tag_assignment_panel && tag_assignment_panel.ps) {
      setTimeout(() => {
        tag_assignment_panel.ps.update();
      }, 50);
    }
  }
  
  async loadMatchingTags(tagIds) {
    if (!tag_assignment_panel || !tag_assignment_panel.tag_list_renderer.fullTagList) return;

    const tagsPanel = document.getElementById('tags-content-global');
    if (!tagsPanel) return;

    const existingTagElements = tagsPanel.querySelectorAll('.checkbox-tag');
    const existingTagIds = Array.from(existingTagElements).map(tag => parseInt(tag.getAttribute('tag-id')));

    const uniqueTagIds = tagIds.filter(id => !existingTagIds.includes(id));

    if (uniqueTagIds.length === 0) return;

    const tagsToLoad = tag_assignment_panel.tag_list_renderer.fullTagList.filter(tag => uniqueTagIds.includes(tag.id));
    if (tagsToLoad.length === 0) return;

    const tagListHtml = tag_assignment_panel.generateTagListHtml(
      tagsToLoad,
      tag_assignment_panel.tag_list_renderer.fullTagStatistics
    );

    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = tagListHtml;

    let visibleCounter = document.querySelectorAll('#tags-content-global .checkbox-tag:not(.hidden)').length + 1;

    while (tempContainer.firstChild) {
      const node = tempContainer.firstChild;
      tagsPanel.appendChild(node);

      const addedTag = tagsPanel.lastChild;
      if (addedTag && addedTag.classList) {
        addedTag.classList.remove('hidden');
        this.addAlternatingClass(addedTag, visibleCounter);
        visibleCounter++;

        // Register the tag ID as rendered to avoid lazy loader duplicating it
        const tagIdAttr = addedTag.getAttribute('tag-id');
        const tagId = tagIdAttr ? parseInt(tagIdAttr) : null;
        if (tagId !== null && tag_assignment_panel.tag_list_renderer && tag_assignment_panel.tag_list_renderer.renderedTagIds) {
          tag_assignment_panel.tag_list_renderer.renderedTagIds.add(tagId);
        }
      }
    }

    uiHelper.configureButtonStyles('#tags-content-global');
  }
}

module.exports = TagListFilter;