/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2026 Ezra Bible App Development Team <contact@ezrabibleapp.net>

   Ezra Bible App is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 2 of the License, or
   (at your option) any later version.

   Ezra Bible App is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
   See the GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Bible App. See the file LICENSE.
   If not, see <http://www.gnu.org/licenses/>. */

/**
 * The TagListRenderer handles rendering tag lists with lazy loading for improved performance.
 * 
 * @category Component
 */
class TagListRenderer {
  /**
   * Constructs a new TagListRenderer
   * 
   * @param {Object} tagsController - Reference to the tags controller
   */
  constructor(tagsController) {
    this.tagsController = tagsController;
    this.tagBatchSize = 50; // Number of tags to load at once
    this.currentTagIndex = 0; // Current position in the tag list
    this.fullTagList = []; // Complete list of tags
    this.fullTagStatistics = {}; // Complete tag statistics
    this.isLoadingTags = false; // Flag to prevent multiple load operations
    this.scrollListenerAdded = false; // Flag to track if scroll listener is added
    this.isBookView = false; // Flag to track if we're in book view
    this.virtualHeightContainer = null; // Container for virtual scrolling
    this.averageTagHeight = platformHelper.isMobile() ? 2.5 : 2; // Fixed estimate for tag height in em

    this.assignTagHint = i18n.t('tags.assign-tag-hint');
    this.removeTagAssignmentLabel = i18n.t('tags.remove-tag-assignment');
    this.assignTagLabel = i18n.t('tags.assign-tag');

    // Track which tags have been rendered to avoid duplicates
    this.renderedTagIds = new Set();
  }

  /**
   * Render the tags with lazy loading
   * 
   * @param {Array} tagList - The complete list of tags to render
   * @param {Object} tagStatistics - Tag statistics
   * @param {boolean} isBook - Whether we're in book view
   * @returns {Promise<void>}
   */
  async renderTags(tagList, tagStatistics, isBook=false) {
    const globalTagsBoxEl = document.getElementById('tags-content-global');
    
    // Store the full tag list and statistics for lazy loading
    this.fullTagList = tagList;
    this.fullTagStatistics = tagStatistics;
    this.currentTagIndex = 0;
    this.isBookView = isBook;
    
    // Clear the container and reset rendered tags tracking
    globalTagsBoxEl.innerHTML = '';
    this.renderedTagIds.clear();
    
    // Add scroll listener if not already added
    if (!this.scrollListenerAdded) {
      this.initLazyLoading();
      this.scrollListenerAdded = true;
    }
    
    // Load the first batch of tags
    await this.loadMoreTags();
    
    // Update UI elements
    await app_controller.tag_statistics.refreshBookTagStatistics(
      tagList, 
      tagStatistics, 
      app_controller.tab_controller.getTab().getBook()
    );
    
    uiHelper.configureButtonStyles('#tags-content');

    // Update tag states and counts
    this.tagsController.updateTagsViewAfterVerseSelection(true);
    this.updateTagCountAfterRendering(isBook);
    await this.tagsController.updateTagUiBasedOnTagAvailability(tagList.length);

    this.hideTagListLoadingIndicator();
  }

  getTagButtonTitle(versesSelected, isTagActiveInSelection) {
    let tagButtonTitle;

    if (!versesSelected) {
      // No verses selected - use hint text
      tagButtonTitle = this.assignTagHint;
    } else if (isTagActiveInSelection) {
      // Verses selected and tag is active
      tagButtonTitle = this.removeTagAssignmentLabel;
    } else {
      // Verses selected but tag is not active
      tagButtonTitle = this.assignTagLabel;
    }

    return tagButtonTitle;
  }

  /**
   * Generate HTML for a subset of tags
   * 
   * @param {Array} tagList - List of tags to render
   * @param {Object} tagStatistics - Tag statistics
   * @returns {string} HTML string
   */
  generateTagListHtml(tagList, tagStatistics) {
    // Get currently selected verse tags
    const versesSelected = app_controller.verse_selection.getSelectedVerseBoxes().length > 0;
    let selectedVerseTags = [];
    
    if (versesSelected) {
      selectedVerseTags = app_controller.verse_selection.getCurrentSelectionTags();
    }
    
    let html = '';
    tagList.forEach(tag => {
      const tagStats = tagStatistics[tag.id] || { bookCount: 0, globalCount: 0 };
      const bookCount = tagStats.bookAssignmentCount;
      const globalCount = tagStats.globalAssignmentCount;
      const isAssigned = bookCount > 0;
      const tagCounts = this.isBookView ? (bookCount + ' | ' + globalCount) : globalCount;
      const lastUsedTimestamp = parseInt(tag.lastUsed || 0);
      const cbId = 'tag-' + tag.id;
      
      // Check if this tag is in the current verse selection and if it's fully assigned
      let isTagActiveInSelection = false;
      let isTagPartialInSelection = false;
      let postfixHtml = '';
      
      if (versesSelected) {
        selectedVerseTags.forEach(selectedTag => {
          if (selectedTag.title === tag.title) {
            if (selectedTag.complete) {
              isTagActiveInSelection = true;
            } else {
              isTagPartialInSelection = true;
              postfixHtml = '&nbsp;*';
            }
          }
        });
      }
      
      // Determine tag button state and title
      let tagButtonTitle;

      tagButtonTitle = this.getTagButtonTitle(versesSelected, isTagActiveInSelection);

      // Set classes for the tag button
      const tagButtonClass = isTagActiveInSelection ? 'active' : '';
      
      // Add disabled class when no verses are selected
      const disabledClass = !versesSelected ? 'disabled' : '';
      
      const tagLabelClass = isAssigned ? 'cb-label-assigned' : '';
      const tagLabelUnderline = isTagPartialInSelection ? 'underline' : '';

      html += `
        <div class="checkbox-tag" tag-id="${tag.id}" book-assignment-count="${bookCount}" global-assignment-count="${globalCount}" last-used-timestamp="${lastUsedTimestamp}">
          <i id="${cbId}" class="fas fa-tag tag-button button-small ${tagButtonClass} ${disabledClass}" title="${tagButtonTitle}"></i>
          
          <div class="cb-input-label-stats">
            <span class="cb-label ${tagLabelClass} ${tagLabelUnderline}">${tag.title}</span>
            <span class="cb-label-tag-assignment-count" id="cb-label-tag-assignment-count-${tag.id}">(${tagCounts})</span>
            <span class="cb-label-postfix">${postfixHtml}</span>
          </div>
          
          <i title="${i18n.t('tags.edit-tag')}" class="fas fa-pen edit-icon edit-button button-small"></i>
          <i title="${i18n.t('tags.delete-tag')}" class="fas fa-trash-alt delete-icon delete-button button-small"></i>
        </div>
      `;
    });
    return html;
  }

  /**
   * Initialize lazy loading for tags
   */
  initLazyLoading() {
    const tagsPanel = document.getElementById('tags-content-global');
    
    // Calculate estimated total height based on tag count
    const estimatedTotalHeight = this.fullTagList.length * this.averageTagHeight;
    
    // Create a fixed-size virtual height container
    this.virtualHeightContainer = document.createElement('div');
    this.virtualHeightContainer.className = 'virtual-height-container';
    this.virtualHeightContainer.style.height = estimatedTotalHeight + 'em';
    this.virtualHeightContainer.style.position = 'absolute';
    this.virtualHeightContainer.style.visibility = 'hidden';
    this.virtualHeightContainer.style.top = '0';
    this.virtualHeightContainer.style.left = '0';
    this.virtualHeightContainer.style.width = '1px';
    this.virtualHeightContainer.style.pointerEvents = 'none';
    tagsPanel.appendChild(this.virtualHeightContainer);
    
    // Add scroll event listener with throttling
    let lastScrollTime = 0;
    const scrollThrottle = 50; // ms
    
    tagsPanel.addEventListener('scroll', () => {
      const now = Date.now();
      if (now - lastScrollTime < scrollThrottle || this.isLoadingTags) return;
      lastScrollTime = now;
      
      const scrollPosition = tagsPanel.scrollTop;
      const scrollHeight = tagsPanel.scrollHeight;
      
      // Calculate virtual position and ratio
      const virtualScrollPosition = (scrollPosition / scrollHeight) * estimatedTotalHeight;
      const virtualScrollRatio = virtualScrollPosition / estimatedTotalHeight;
      
      // Determine which chunk of tags should be loaded
      const targetTagIndex = Math.floor(virtualScrollRatio * this.fullTagList.length);
      
      // Load more tags if needed
      if (targetTagIndex + this.tagBatchSize > this.currentTagIndex && 
          this.currentTagIndex < this.fullTagList.length) {
        this.loadMoreTags(scrollPosition, virtualScrollRatio);
      }
    });
  }

  /**
   * Load more tags as the user scrolls
   * 
   * @param {number|null} savedScrollPosition - Current scroll position to maintain
   * @param {number|null} virtualScrollRatio - Ratio for calculating proper scroll position
   * @returns {Promise<void>}
   */
  async loadMoreTags(savedScrollPosition = null, virtualScrollRatio = null) {
    // Don't load if we're already loading or if we've loaded all tags
    if (this.isLoadingTags || this.currentTagIndex >= this.fullTagList.length) {
      return;
    }
    
    this.isLoadingTags = true;
    
    // Get the tags panel
    const tagsPanel = document.getElementById('tags-content-global');
    
    // Save current scroll metrics
    const viewportHeight = tagsPanel.clientHeight;
    const originalScrollTop = savedScrollPosition !== null ? savedScrollPosition : tagsPanel.scrollTop;
    
    // Calculate the batch of tags to load
    const endIndex = Math.min(this.currentTagIndex + this.tagBatchSize, this.fullTagList.length);
    const tagsToLoad = this.fullTagList.slice(this.currentTagIndex, endIndex);
    
    // Generate HTML for this batch
    const tagListHtml = this.generateTagListHtml(tagsToLoad, this.fullTagStatistics);
    
    // Append the new tags to the container, but skip duplicates
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = tagListHtml;

    while (tempContainer.firstChild) {
      const node = tempContainer.firstChild;
      // Ensure it is a tag element and check for duplicates
      const isCheckboxTag = node.classList && node.classList.contains('checkbox-tag');
      if (isCheckboxTag) {
        const tagIdAttr = node.getAttribute('tag-id');
        const tagId = tagIdAttr ? parseInt(tagIdAttr) : null;

        if (tagId !== null) {
          if (!this.renderedTagIds.has(tagId)) {
            this.renderedTagIds.add(tagId);
            tagsPanel.appendChild(node);
          } else {
            // Skip duplicate element
            tempContainer.removeChild(node);
            continue;
          }
        } else {
          // Fallback: append if we cannot determine ID
          tagsPanel.appendChild(node);
        }
      } else {
        // Non-tag node (should not happen), append safely
        tagsPanel.appendChild(node);
      }
    }
    
    // Update the current index
    this.currentTagIndex = endIndex;
    
    // Configure the new tag elements
    uiHelper.configureButtonStyles('#tags-content-global');
  
    // Preserve the scroll position
    if (virtualScrollRatio !== null) {
      // Calculate where the scroll position should be based on the virtual ratio
      const afterHeight = tagsPanel.scrollHeight;
      const scrollableHeight = afterHeight - viewportHeight;
      const targetScrollTop = Math.round(virtualScrollRatio * scrollableHeight);
      
      // Set the new scroll position
      tagsPanel.scrollTop = targetScrollTop;
    } else {
      // No virtual ratio provided, maintain absolute position
      tagsPanel.scrollTop = originalScrollTop;
    }

    // Reapply any filtering
    this.tagsController.tag_list_filter.reapplyCurrentFilter();
    
    this.isLoadingTags = false;
  }

  /**
   * Updates the virtual height container size based on the number of visible tags
   */
  updateVirtualContainerSize() {
    // Only proceed if virtualHeightContainer exists
    if (!this.virtualHeightContainer) return;
    
    // Count visible tags
    const tagsPanel = document.getElementById('tags-content-global');
    const visibleTags = tagsPanel.querySelectorAll('.checkbox-tag:not(.hidden)').length;
    
    // Get total tags for comparison
    const totalTags = this.fullTagList ? this.fullTagList.length : 0;
    
    if (visibleTags === 0 || totalTags === 0) return;
    
    // Calculate new height as a proportion of the original height
    const ratio = visibleTags / totalTags;
    const newHeight = Math.max(
      this.averageTagHeight * visibleTags, 
      ratio * (this.fullTagList.length * this.averageTagHeight)
    );
    
    // Apply the new height to the virtual container
    this.virtualHeightContainer.style.height = newHeight + 'em';
    
    // Update scrollbar if perfect-scrollbar is being used
    if (this.tagsController.ps) {
      setTimeout(() => {
        this.tagsController.ps.update();
      }, 50);
    }
  }

  /**
   * Show loading indicator for tag list
   */
  showTagListLoadingIndicator() {
    const tagsContentGlobal = document.getElementById('tags-content-global');
    let loadingIndicator = tagsContentGlobal.querySelector('loading-indicator');

    if (!loadingIndicator) {
      loadingIndicator = document.createElement('loading-indicator');
      tagsContentGlobal.appendChild(loadingIndicator);
    }

    const loader = loadingIndicator.querySelector('.loader');
    if (loader) {
      loader.style.display = 'block';
    }

    loadingIndicator.style.display = 'flex';
  }

  /**
   * Hide loading indicator for tag list
   */
  hideTagListLoadingIndicator() {
    const tagsContentGlobal = document.getElementById('tags-content-global');
    const loadingIndicator = tagsContentGlobal.querySelector('loading-indicator');

    if (loadingIndicator) {
      loadingIndicator.style.display = 'none';
    }
  }

  /**
   * Update tag count display in the UI
   * 
   * @param {boolean} isBook - Whether we're in book view
   */
  updateTagCountAfterRendering(isBook = false) {
    // Calculate counts based on the full tag list and statistics
    const globalTagCount = this.fullTagList ? this.fullTagList.length : 0;
    let globalUsedTagCount = 0;
    
    if (this.fullTagStatistics) {
      // Count tags that have at least one assignment
      for (const tagId in this.fullTagStatistics) {
        if (this.fullTagStatistics.hasOwnProperty(tagId)) {
          const stats = this.fullTagStatistics[tagId];
          if (isBook) {
            // For book view: count tags with book assignments
            if (stats.bookAssignmentCount > 0) {
              globalUsedTagCount++;
            }
          } else {
            // For global view: count tags with any assignments
            if (stats.globalAssignmentCount > 0) {
              globalUsedTagCount++;
            }
          }
        }
      }
    }
    
    // Update the tag list stats display
    const tagListStats = document.querySelector('#tags-content #tag-list-stats');
    if (tagListStats) {
      let tagListStatsContent = '';
      
      if (isBook) {
        tagListStatsContent += `${globalUsedTagCount} ${i18n.t('tags.stats-used')} / `;
      }
      
      tagListStatsContent += `${globalTagCount} ${i18n.t('tags.stats-total')}`;
      tagListStats.textContent = tagListStatsContent;
    }
  }
}

module.exports = TagListRenderer;