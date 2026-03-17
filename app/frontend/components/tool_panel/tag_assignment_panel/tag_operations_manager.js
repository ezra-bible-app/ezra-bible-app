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

const VerseBoxHelper = require('../../../helpers/verse_box_helper.js');
const VerseBox = require('../../../ui_models/verse_box.js');
const { waitUntilIdle, showDialog } = require('../../../helpers/ezra_helper.js');
const eventController = require('../../../controllers/event_controller.js');
const verseListController = require('../../../controllers/verse_list_controller.js');

/**
 * The TagOperationsManager handles tag assignment, removal, selection state management,
 * and other operations on tags.
 * 
 * @category Component
 */
class TagOperationsManager {
  /**
   * Constructs a new TagOperationsManager
   * 
   * @param {Object} tagsController - Reference to the tags controller
   */
  constructor(tagsController) {
    this.tagsController = tagsController;
    this.verse_box_helper = new VerseBoxHelper();
    
    // Selection state properties
    this.verse_selection_blocked = false;
    this.verses_were_selected_before = false;
    this.is_blocked = false;

    // Labels for tag UI
    this.assign_tag_label = i18n.t('tags.assign-tag');
    this.unassign_tag_label = i18n.t('tags.remove-tag-assignment');
    this.assign_tag_hint = i18n.t('tags.assign-tag-hint');
    
    // Loading indicator for operations
    this.loading_indicator = '<img class="loading-indicator" style="float: left; margin-left: 0.5em;" ' +
                            'width="16" height="16" src="images/loading_animation.gif" />';
  }

  /*********************
   * Selection Methods *
   *********************/

  /**
   * Update the tags view based on the current verse selection
   * 
   * @param {boolean} force - Whether to force the update even if selection is blocked
   */
  async updateTagsViewAfterVerseSelection(force) {
    if (this.verse_selection_blocked && force !== true) {
      return;
    }

    this.verse_selection_blocked = true;
    setTimeout(() => {
      this.verse_selection_blocked = false;
    }, 300);

    const versesSelected = app_controller.verse_selection.getSelectedVerseBoxes().length > 0;
    let selected_verse_tags = [];

    if (versesSelected) { // Verses are selected
      selected_verse_tags = app_controller.verse_selection.getCurrentSelectionTags();
      const checkboxTags = document.querySelectorAll('.checkbox-tag');

      for (let i = 0; i < checkboxTags.length; i++) {
        this.formatCheckboxElementBasedOnSelection(checkboxTags[i], selected_verse_tags);
      }

      this.verses_were_selected_before = true;

    } else { // No verses are selected!
      if (this.verses_were_selected_before) {
        this.uncheckAllCheckboxElements();
      }

      this.verses_were_selected_before = false;
    }
  }

  /**
   * Format a checkbox element based on the current verse selection
   * 
   * @param {HTMLElement} cb_element - The checkbox element
   * @param {Array} selected_verse_tags - The tags associated with the current verse selection
   */
  formatCheckboxElementBasedOnSelection(cb_element, selected_verse_tags) {
    const currentTagButton = cb_element.querySelector('.tag-button');
    const currentTitleElement = cb_element.querySelector('.cb-label');
    const currentTitle = currentTitleElement.innerHTML;
    const currentTitleElementPostfix = cb_element.querySelector('.cb-label-postfix');
    let matchFound = false;

    selected_verse_tags.forEach(currentTagObj => {
      if (currentTagObj.title === currentTitle) {
        if (currentTagObj.complete) {
          currentTagButton.setAttribute('title', this.unassign_tag_label);
          currentTagButton.classList.add('active');
          currentTitleElementPostfix.innerHTML = '';
          currentTitleElement.classList.remove('underline');
        } else {
          currentTagButton.setAttribute('title', this.assign_tag_label);
          currentTagButton.classList.remove('active');
          currentTitleElementPostfix.innerHTML = '&nbsp;*';
          currentTitleElement.classList.add('underline');
        }
        matchFound = true;
      }
    });

    if (!matchFound) {
      currentTagButton.classList.remove('active');
      currentTagButton.setAttribute('title', this.assign_tag_label);
      currentTitleElement.classList.remove('underline');
      currentTitleElementPostfix.innerHTML = '';
    }

    if (!this.verses_were_selected_before) {
      currentTagButton.classList.remove('disabled');
    }
  }

  /**
   * Uncheck all checkbox elements when no verses are selected
   */
  uncheckAllCheckboxElements() {
    const allCheckboxElements = document.querySelectorAll('.checkbox-tag');

    allCheckboxElements.forEach(currentCheckboxElement => {
      const currentTagButton = currentCheckboxElement.querySelector('.tag-button');
      currentTagButton.setAttribute('title', this.assign_tag_hint);
      currentTagButton.classList.add('disabled');
      currentTagButton.classList.remove('active');

      const currentTitleElement = currentCheckboxElement.querySelector('.cb-label');
      currentTitleElement.classList.remove('underline');

      const currentTitleElementPostfix = currentCheckboxElement.querySelector('.cb-label-postfix');
      currentTitleElementPostfix.innerHTML = '';
    });
  }

  /**********************
   * Tag Click Handlers *
   **********************/

  /**
   * Handle a click on a tag label
   * 
   * @param {Event} event - The click event
   */
  async handleTagLabelClick(event) {
    const checkboxTag = $(event.target).closest('.checkbox-tag');
    await this.clickCheckBoxTag(checkboxTag);
  }

  /**
   * Handle a click on a tag checkbox
   * 
   * @param {Event} event - The click event
   */
  async handleTagCbClick(event) {
    await waitUntilIdle();

    const checkboxTag = $(event.target).closest('.checkbox-tag');
    this.toggleTagButton(checkboxTag);
    await this.handleCheckboxTagStateChange(checkboxTag);
  }

  /**
   * Handle a click on a checkbox tag
   * 
   * @param {JQuery} checkboxTag - The checkbox tag element
   */
  async clickCheckBoxTag(checkboxTag) {
    const current_verse_list = app_controller.verse_selection.selectedVerseReferences;

    if (!this.is_blocked && current_verse_list.length > 0) {
      this.toggleTagButton(checkboxTag);
      await this.handleCheckboxTagStateChange(checkboxTag);
    }
  }

  /**
   * Toggle the tag button state
   * 
   * @param {JQuery} checkboxTag - The checkbox tag element
   */
  toggleTagButton(checkboxTag) {
    const tag_button = checkboxTag[0].querySelector('.tag-button');
    const isActive = tag_button.classList.contains('active');

    if (isActive) {
      tag_button.classList.remove('active');
      tag_button.classList.add('no-hl');

      if (platformHelper.isElectron()) {
        tag_button.addEventListener('mouseleave', this.removeTagButtonNoHl);
      }
    } else {
      tag_button.classList.add('active');
    }
  }

  /**
   * Remove the no-highlight class from a tag button
   * 
   * @param {Event} event - The mouseleave event
   */
  removeTagButtonNoHl(event) {
    event.target.classList.remove('no-hl');
    event.target.removeEventListener('mouseleave', this.removeTagButtonNoHl);
  }

  /**
   * Handle the state change of a checkbox tag
   * 
   * @param {JQuery} checkboxTag - The checkbox tag element
   */
  async handleCheckboxTagStateChange(checkboxTag) {
    const current_verse_list = app_controller.verse_selection.selectedVerseReferences;

    if (this.is_blocked || current_verse_list.length === 0) {
      return;
    }

    this.is_blocked = true;
    setTimeout(() => {
      this.is_blocked = false;
    }, 300);

    const id = parseInt(checkboxTag.attr('tag-id'));
    const tag_button = checkboxTag[0].querySelector('.tag-button');
    const cb_label = checkboxTag.find('.cb-label').html();
    const tag_button_is_active = tag_button.classList.contains('active');

    const current_verse_selection = app_controller.verse_selection.getSelectionAsXml(); 
    const current_verse_reference_ids = app_controller.verse_selection.getSelectionAsVerseReferenceIds();

    checkboxTag.find('.cb-label').removeClass('underline');
    checkboxTag.find('.cb-label-postfix').html('');

    let is_global = false;
    if (checkboxTag.find('.is-global').html() === 'true') {
      is_global = true;
    }

    if (tag_button_is_active) {
      await this.assignTagToVerses(id, cb_label, current_verse_selection, current_verse_reference_ids, checkboxTag);
    } else {
      this.tagsController.tag_dialog_manager.remove_tag_assignment_job = {
        'id': id,
        'is_global': is_global,
        'cb_label': cb_label,
        'checkboxTag': checkboxTag,
        'verse_list': current_verse_list,
        'verse_ids': current_verse_reference_ids,
        'xml_verse_selection': $.create_xml_doc(current_verse_selection),
        'tag_button': $(tag_button)
      };

      if (current_verse_list.length > 1) {
        this.tagsController.tag_dialog_manager.initRemoveTagAssignmentConfirmationDialog();

        $('#remove-tag-assignment-name').html(cb_label);
        $('#remove-tag-assignment-confirmation-dialog').dialog('open');
      } else {
        await this.tagsController.tag_dialog_manager.removeTagAssignmentAfterConfirmation();
        await this.updateTagsViewAfterVerseSelection(true);
      }
    }
  }

  /***********************
   * Tag Operation Methods *
   ***********************/

  /**
   * Assign a tag to verses
   * 
   * @param {number} id - The tag ID
   * @param {string} cb_label - The tag label
   * @param {string} current_verse_selection - The current verse selection as XML
   * @param {Array} current_verse_reference_ids - The current verse reference IDs
   * @param {JQuery} checkboxTag - The checkbox tag element
   */
  async assignTagToVerses(id, cb_label, current_verse_selection, current_verse_reference_ids, checkboxTag) {
    // Update last used timestamp
    const current_timestamp = new Date(Date.now()).getTime();
    checkboxTag.attr('last-used-timestamp', current_timestamp);

    this.tagsController.tag_store.updateTagTimestamp(id, current_timestamp);
    await this.tagsController.tag_store.updateLatestAndOldestTagData();

    app_controller.tag_selection_menu.updateLastUsedTimestamp(id, current_timestamp);
    app_controller.tag_selection_menu.applyCurrentFilters();

    $(checkboxTag[0].querySelector('.tag-button')).attr('title', i18n.t('tags.remove-tag-assignment'));

    const filteredVerseBoxes = [];
    const currentVerseList = verseListController.getCurrentVerseList();

    // Create a list of filtered ids, that only contains the verses that do not have the selected tag yet
    for (let i = 0; i < current_verse_reference_ids.length; i++) {
      const currentVerseReferenceId = current_verse_reference_ids[i];
      const currentVerseBox = currentVerseList[0].querySelector('.verse-reference-id-' + currentVerseReferenceId);

      if (currentVerseBox != null) {
        const existingTagIdElements = currentVerseBox.querySelectorAll('.tag-id');
        const existingTagIds = [];
        
        for (let j = 0; j < existingTagIdElements.length; j++) {
          const currentTagId = parseInt(existingTagIdElements[j].innerText);
          existingTagIds.push(currentTagId);
        }

        if (!existingTagIds.includes(id)) {
          filteredVerseBoxes.push(currentVerseBox);
        }
      }
    }

    const result = await ipcDb.assignTagToVerses(id, filteredVerseBoxes);
    if (result.success === false) {
      const message = `The tag <i>${cb_label}</i> could not be assigned to the selected verses.<br>
                      An unexpected database error occurred:<br><br>
                      ${result.exception}<br><br>
                      Please restart the app.`;

      await showDialog('Database Error', message);
      uiHelper.hideTextLoadingIndicator();
      return;
    }

    this.changeVerseListTagInfo(id,
                              cb_label,
                              $.create_xml_doc(current_verse_selection),
                              'assign');

    await eventController.publishAsync('on-latest-tag-changed', {
      'tagId': id,
      'added': true
    });

    const currentBook = app_controller.tab_controller.getTab().getBook();

    this.tagsController.updateTagCountAfterRendering(currentBook != null);
    await this.updateTagsViewAfterVerseSelection(true);
    await this.tagsController.updateTagUiBasedOnTagAvailability();
  }

  /**
   * Assign the last used tag to the current selection
   */
  async assignLastTag() {
    app_controller.hideAllMenus();
    uiHelper.showTextLoadingIndicator();
    await waitUntilIdle();

    if (this.tagsController.tag_store.latest_tag_id != null) {
      const checkboxTag = this.getCheckboxTag(this.tagsController.tag_store.latest_tag_id);
      await this.clickCheckBoxTag(checkboxTag);
    }

    uiHelper.hideTextLoadingIndicator();
  }

  /**
   * Get a checkbox tag by ID
   * 
   * @param {number} id - The tag ID
   * @returns {JQuery} The checkbox tag element
   */
  getCheckboxTag(id) {
    const tagsContentGlobal = document.getElementById('tags-content-global');
    if (!tagsContentGlobal) {
      return $();
    }

    const checkboxTag = tagsContentGlobal.querySelector(`.checkbox-tag[tag-id="${id}"]`);
    return checkboxTag ? $(checkboxTag) : $();
  }

  /**
   * Update a tag in the view
   * 
   * @param {number} tagId - The tag ID
   * @param {string} newTitle - The new tag title
   */
  updateTagInView(tagId, newTitle) {
    const checkboxTag = this.getCheckboxTag(tagId);
    if (checkboxTag.length === 0) return;
    
    const labelElement = checkboxTag.find('.cb-label');
    if (labelElement.length > 0) {
      labelElement.text(newTitle);
    }
  }

  /**
   * Update tag titles in the verse list
   * 
   * @param {number} tag_id - The tag ID
   * @param {boolean} is_global - Whether the tag is global
   * @param {string} title - The tag title
   */
  updateTagTitlesInVerseList(tag_id, is_global, title) {
    const tagClass = is_global ? 'tag-global' : 'tag-book';
    const tagDataElements = Array.from(document.querySelectorAll(`.${tagClass} .tag-id`))
      .filter(element => parseInt(element.textContent, 10) === tag_id)
      .map(element => element.closest(`.${tagClass}`));

    tagDataElements.forEach(tagDataElement => {
      const tagTitleElement = tagDataElement.querySelector('.tag-title');
      tagTitleElement.textContent = title;

      const verseBoxElement = tagDataElement.closest('.verse-box');
      const verseBoxObj = new VerseBox(verseBoxElement);
      verseBoxObj.updateTagTooltip();
      verseBoxObj.updateVisibleTags();
    });
  }

  /**
   * Update the verse count for a tag
   * 
   * @param {number} id - The tag ID
   * @param {Array} verseBoxes - The verse boxes
   * @param {boolean} to_increment - Whether to increment the count (true) or decrement it (false)
   */
  updateTagVerseCount(id, verseBoxes, to_increment) {
    const count = verseBoxes.length;
    const checkboxTag = this.getCheckboxTag(id);
    const cb_label_element = checkboxTag.find('.cb-label');
    const tag_title = cb_label_element.text();
    const tag_assignment_count_element = checkboxTag.find('.cb-label-tag-assignment-count');
    const tag_assignment_count_values = tag_assignment_count_element.text().substring(
      1, tag_assignment_count_element.text().length - 1
    );

    let current_book_count = 0;
    let current_global_count = 0;
    let new_book_count = 0;
    let new_global_count = 0;

    const currentBook = app_controller.tab_controller.getTab().getBook();

    if (currentBook == null) {
      current_global_count = parseInt(tag_assignment_count_values);
    } else {
      current_book_count = parseInt(tag_assignment_count_values.split('|')[0]);
      current_global_count = parseInt(tag_assignment_count_values.split('|')[1]);
    }

    if (to_increment) {
      new_book_count = current_book_count + count;
      new_global_count = current_global_count + count;
    } else {
      new_book_count = current_book_count - count;
      new_global_count = current_global_count - count;
    }

    if (new_book_count > 0) {
      cb_label_element.addClass('cb-label-assigned');
    } else {
      cb_label_element.removeClass('cb-label-assigned');
    }

    checkboxTag.attr('book-assignment-count', new_book_count);
    checkboxTag.attr('global-assignment-count', new_global_count);

    let new_label = '';
    if (currentBook == null) {
      new_label = '(' + new_global_count + ')';
    } else {
      new_label = '(' + new_book_count + ' | ' + new_global_count + ')';
    }

    tag_assignment_count_element.text(new_label);

    // Update tag count in tag store statistics
    const bookList = this.verse_box_helper.getBookListFromVerseBoxes(verseBoxes);
    this.tagsController.tag_store.updateTagCount(id, bookList, count, to_increment);

    // Update tag count in tag selection menu as well
    app_controller.tag_selection_menu.updateVerseCountInTagMenu(tag_title, new_global_count);
  }

  /**
   * Remove a tag by ID
   * 
   * @param {number} tagId - The tag ID
   */
  async removeTagById(tagId) {
    const tagsContentGlobal = document.getElementById('tags-content-global');
    const checkboxTag = tagsContentGlobal.querySelector(`.checkbox-tag[tag-id="${tagId}"]`);
    
    if (checkboxTag) {
      tagsContentGlobal.removeChild(checkboxTag);
    }
    
    await waitUntilIdle();
    
    const currentTab = app_controller.tab_controller.getSelectedTabIndex();
    await this.tagsController.updateTagsView(currentTab, true);
  }

  /**
   * Update the tag list in the existing verse lists when tags have been assigned/removed
   * 
   * @param {number} tag_id - The tag ID
   * @param {string} tag_title - The tag title
   * @param {XMLDocument} verse_selection - The verse selection as an XML document
   * @param {string} action - The action ('assign' or 'remove')
   */
  async changeVerseListTagInfo(tag_id, tag_title, verse_selection, action) {
    await verseListController.changeVerseListTagInfo(tag_id, tag_title, verse_selection, action);
  }

  /**
   * Sort the tag list
   */
  sortTagList() {
    const globalTagsBox = document.getElementById('tags-content-global');
    const tags = Array.from(globalTagsBox.querySelectorAll('.checkbox-tag'));

    tags.sort((a, b) => {
      const textA = a.querySelector('.cb-label').textContent.toLowerCase();
      const textB = b.querySelector('.cb-label').textContent.toLowerCase();
      return textA > textB ? 1 : -1;
    });

    tags.forEach(tag => globalTagsBox.appendChild(tag));
  }

  /**
   * Get the tag list
   * 
   * @param {boolean} forceRefresh - Whether to force a refresh
   * @returns {Array} The tag list
   */
  async getTagList(forceRefresh=true) {
    const tagList = await this.tagsController.tag_store.getTagList(forceRefresh);
    return tagList;
  }

  /**
   * Update the tag list
   * 
   * @param {string} currentBook - The current book
   * @param {number} tagGroupId - The tag group ID
   * @param {string} contentId - The content ID
   * @param {boolean} forceRefresh - Whether to force a refresh
   */
  async updateTagList(currentBook, tagGroupId=null, contentId=null, forceRefresh=false) {
    if (tagGroupId == null) {
      tagGroupId = this.tagsController.currentTagGroupId;
    }

    if (forceRefresh) {
      this.tagsController.initialRenderingDone = false;
    }

    if (contentId == null) {
      contentId = currentBook;
    }

    if (contentId != this.tagsController.lastContentId || forceRefresh) {
      let tagList = await this.tagsController.tag_store.getTagList(forceRefresh);
      if (tagGroupId != null && tagGroupId > 0) {
        tagList = await this.tagsController.tag_store.getTagGroupMembers(tagGroupId, tagList);
      }

      const tagStatistics = await this.tagsController.tag_store.getBookTagStatistics(currentBook, forceRefresh);
      await this.tagsController.tag_list_renderer.renderTags(tagList, tagStatistics, currentBook != null);
      this.tagsController.initialRenderingDone = true;
      await waitUntilIdle();

      this.tagsController.lastContentId = contentId;
    } else {
      app_controller.tag_statistics.highlightFrequentlyUsedTags();
    }
  }

  /**
   * Update the tag list for adding tags to a group
   * 
   * @returns {number} The tag count
   */
  async updateAddTagToGroupTagList() {
    const addTagsToGroupTagList = document.getElementById('add-tags-to-group-tag-list');
    addTagsToGroupTagList.tagManager.reset();
    addTagsToGroupTagList.tagManager.setFilter('');
    await addTagsToGroupTagList.tagManager.refreshItemList();
    const tagList = await this.tagsController.tag_store.getTagList();
    const tagIdList = await this.tagsController.tag_store.getTagGroupMemberIds(this.tagsController.currentTagGroupId, tagList);
    addTagsToGroupTagList.tagManager.setExcludeItems(tagIdList);
    addTagsToGroupTagList.tagManager.excludeItems();

    const tagCount = addTagsToGroupTagList.tagManager.getAllItemElements().length;
    return tagCount;
  }

  /**
   * Add tags to a group
   * 
   * @param {number} tagGroupId - The tag group ID
   * @param {Array} tagList - The tag list
   */
  async addTagsToGroup(tagGroupId, tagList) {
    let successCount = 0;

    for (let i = 0; i < tagList.length; i++) {
      const tagId = tagList[i];
      const tag = await this.tagsController.tag_store.getTag(tagId);

      const result = await ipcDb.updateTag(tagId, tag.title, [ tagGroupId ], []);

      if (result.success == false) {
        const message = `The tag <i>${tag.title}</i> could not be updated.<br>
                        An unexpected database error occurred:<br><br>
                        ${result.exception}<br><br>
                        Please restart the app.`;

        await showDialog('Database Error', message);
        uiHelper.hideTextLoadingIndicator();
        return;
      } else {
        successCount += 1;

        await eventController.publishAsync('on-tag-group-member-changed', {
          tagId: tagId,
          addTagGroups: [ tagGroupId ],
          removeTagGroups: []
        });
      }
    }

    if (successCount >= 1) {
      await eventController.publishAsync('on-tag-group-multiple-members-changed');
    }

    if (this.tagsController.tagGroupUsed()) {
      const currentTabIndex = app_controller.tab_controller.getSelectedTabIndex();
      await this.tagsController.updateTagsView(currentTabIndex, true);
    }
  }
}

module.exports = TagOperationsManager;