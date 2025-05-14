/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2025 Ezra Bible App Development Team <contact@ezrabibleapp.net>

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

const TagStore = require('../components/tags/tag_store.js');
const TagListFilter = require('../components/tags/tag_list_filter.js');
const TagListRenderer = require('../components/tags/tag_list_renderer.js');
const TagDialogManager = require('../components/tags/tag_dialog_manager.js');
const VerseBoxHelper = require('../helpers/verse_box_helper.js');
const VerseBox = require('../ui_models/verse_box.js');
const { waitUntilIdle } = require('../helpers/ezra_helper.js');
const eventController = require('./event_controller.js');
const verseListController = require('../controllers/verse_list_controller.js');
const { showDialog } = require('../helpers/ezra_helper.js');
require('../components/emoji_button_trigger.js');

/**
 * The TagsController handles most functionality related to tagging of verses.
 * 
 * Like all other controllers it is only initialized once. It is accessible at the
 * global object `app_controller.tags_controller`.
 * 
 * @category Controller
 */
class TagsController {
  constructor() {
    this.tag_store = new TagStore();
    this.tag_list_filter = new TagListFilter();
    this.tag_list_renderer = new TagListRenderer(this);
    this.tag_dialog_manager = new TagDialogManager(this);
    this.verse_box_helper = new VerseBoxHelper();

    this.verse_selection_blocked = false;
    this.verses_were_selected_before = false;

    this.assign_tag_label = i18n.t('tags.assign-tag');
    this.unassign_tag_label = i18n.t('tags.remove-tag-assignment');
    this.assign_tag_hint = i18n.t('tags.assign-tag-hint');

    this.new_tag_created = false;
    this.last_created_tag = '';

    this.loading_indicator = '<img class="loading-indicator" style="float: left; margin-left: 0.5em;" ' +
                             'width="16" height="16" src="images/loading_animation.gif" />';

    this.initialRenderingDone = false;
    this.lastContentId = null;
    this.currentTagGroupId = null;
    this.currentTagGroupTitle = null;
    
    // Flag to prevent double filter application
    this.skipFilterDuringUpdate = false;

    this.subscribeEvents();
  }

  async handleTagPanelSwitched(isOpen) {
    if (isOpen) {
      await this.updateTagsView(undefined, !this.initialRenderingDone);
    } else if (platformHelper.isCordova() || platformHelper.isMobile()) {
      // Reset tag list on mobile when switching off the tag panel
      this.initialRenderingDone = false;
      document.getElementById('tags-content-global').innerHTML = "";
    }
  }

  subscribeEvents() {
    eventController.subscribe('on-tag-panel-switched', async (isOpen) => {
      await this.handleTagPanelSwitched(isOpen);
    });

    eventController.subscribePrioritized('on-tag-statistics-panel-switched', async (isOpen) => {
      await this.handleTagPanelSwitched(isOpen);
    });

    eventController.subscribePrioritized('on-tab-selected', async (tabIndex) => {
      const currentTab = app_controller.tab_controller.getTab(tabIndex);

      if (currentTab != null && this.isTagPanelActive()) {
        // Assume that verses were selected before, because otherwise the checkboxes may not be properly cleared
        this.verses_were_selected_before = true;

        await this.updateTagsView(tabIndex, !this.initialRenderingDone);
      }
    });

    eventController.subscribe('on-locale-changed', async () => {
      this.updateTagsView(undefined, true);
      this.refreshTagDialogs();
    });

    eventController.subscribeMultiple(['on-translation-added', 'on-translation-removed'], async () => {
      await this.updateTagUiBasedOnTagAvailability();
    });

    eventController.subscribe('on-verses-selected', async () => {
      await this.updateTagsViewAfterVerseSelection(false);
    });

    eventController.subscribe('on-tag-group-list-activated', () => {
      this.tag_list_filter.reset();
      document.getElementById('tags-content-global').style.display = 'none';
      document.getElementById('tag-list-stats').style.visibility = 'hidden';
      document.getElementById('tag-panel-tag-group-list').style.removeProperty('display');
      document.getElementById('tag-list-filter-button').style.display = 'none';
      document.getElementById('tags-search-input').value = "";
      document.getElementById('tags-search-input').style.display = 'none';
    });

    eventController.subscribe('on-tag-group-selected', async (tagGroup) => {
      let tab = app_controller.tab_controller.getTab();
      let tagGroupId = tagGroup ? tagGroup.id : null;
      this.currentTagGroupId = tagGroupId;
      this.currentTagGroupTitle = tagGroup ? tagGroup.title : null;
      ipcSettings.set('lastUsedTagGroupId', tagGroupId);

      document.getElementById('tags-search-input').style.removeProperty('display');
      document.getElementById('tag-list-filter-button').style.removeProperty('display');
      document.getElementById('tag-panel-tag-group-list').style.display = 'none';
      document.getElementById('tags-content-global').innerHTML = "";
      document.getElementById('tags-content-global').style.display = '';
      document.getElementById('tag-list-stats').style.visibility = 'visible';

      if (this.isTagPanelActive()) {
        this.showTagListLoadingIndicator();
        await waitUntilIdle();
        
        // Set flag to prevent automatic filter application during tag list update
        this.skipFilterDuringUpdate = true;
        
        await this.updateTagList(tab.getBook(), tagGroupId, tab.getContentId(), true);
        
        // Reset the flag
        this.skipFilterDuringUpdate = false;
        
        // Apply the filter once, after the tag list is fully updated
        this.tag_list_filter.reapplyCurrentFilter();
        
        this.hideTagListLoadingIndicator();
      }
    });

    eventController.subscribeMultiple(['on-db-refresh', 'on-all-translations-removed'], async () => {
      const currentTabIndex = app_controller.tab_controller.getSelectedTabIndex();
      document.getElementById('tags-content-global').innerHTML = "";
      await this.updateTagsView(currentTabIndex, true);
    });

    eventController.subscribe('on-body-clicked', () => {
      const tagsSearchInput = document.getElementById('tags-search-input');
      tagsSearchInput.blur();
    });
  }

  tagPanelIsActive() {
    const tagPanelButton = document.getElementById('tag-panel-button');
    const isActive = tagPanelButton.classList.contains('active');
    return isActive;
  }

  getCurrentTagGroup() {
    let currentTagGroup = null;

    if (this.currentTagGroupId !== null) {
      currentTagGroup = {
        title: this.currentTagGroupTitle,
        id: this.currentTagGroupId
      };
    }

    return currentTagGroup;
  }

  isTagPanelActive() {
    const panelButtons = document.getElementById('panel-buttons');
    let activePanel = panelButtons.activePanel;
    return activePanel != '' && (activePanel == 'tag-panel' || activePanel == 'tag-statistics-panel');
  }

  /**
   * This is used to refresh the dialogs after the locale changed
   */
  refreshTagDialogs() {
    this.tag_dialog_manager.refreshTagDialogs();
  }

  handleNewTagButtonClick(event) {
    this.tag_dialog_manager.handleNewTagButtonClick(event);
  }

  handleDeleteTagButtonClick(event) {
    this.tag_dialog_manager.handleDeleteTagButtonClick(event);
  }

  handleEditTagClick(event) {
    this.tag_dialog_manager.handleEditTagClick(event);
  }

  async updateAddTagToGroupTagList() {
    const addTagsToGroupTagList = document.getElementById('add-tags-to-group-tag-list');
    addTagsToGroupTagList.tagManager.reset();
    addTagsToGroupTagList.tagManager.setFilter('');
    await addTagsToGroupTagList.tagManager.refreshItemList();
    let tagList = await this.tag_store.getTagList();
    let tagIdList = await this.tag_store.getTagGroupMemberIds(this.currentTagGroupId, tagList);
    addTagsToGroupTagList.tagManager.setExcludeItems(tagIdList);
    addTagsToGroupTagList.tagManager.excludeItems();

    let tagCount = addTagsToGroupTagList.tagManager.getAllItemElements().length;
    return tagCount;
  }

  async addTagsToGroup(tagGroupId, tagList) {
    let successCount = 0;

    for (let i = 0; i < tagList.length; i++) {
      let tagId = tagList[i];
      let tag = await this.tag_store.getTag(tagId);

      let result = await ipcDb.updateTag(tagId, tag.title, [ tagGroupId ], []);

      if (result.success == false) {
        var message = `The tag <i>${tag.title}</i> could not be updated.<br>
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

    if (this.tagGroupUsed()) {
      const currentTabIndex = app_controller.tab_controller.getSelectedTabIndex();
      await this.updateTagsView(currentTabIndex, true);
    }
  }

  tagGroupUsed() {
    return this.currentTagGroupId != null && this.currentTagGroupId > 0;
  }

  async updateButtonStateBasedOnTagTitleValidation(tagTitle, buttonId) {
    tagTitle = tagTitle.trim();
    const tagExisting = await this.tag_store.tagExists(tagTitle);
    let tagButton = document.getElementById(buttonId);

    if (tagExisting || tagTitle == "") {
      uiHelper.disableButton(tagButton);
    } else {
      uiHelper.enableButton(tagButton);
    }

    return tagExisting;
  }

  async assignLastTag() {
    app_controller.hideAllMenus();
    uiHelper.showTextLoadingIndicator();
    await waitUntilIdle();

    if (this.tag_store.latest_tag_id != null) {
      var checkboxTag = this.getCheckboxTag(this.tag_store.latest_tag_id);
      await this.clickCheckBoxTag(checkboxTag);
    }

    uiHelper.hideTextLoadingIndicator();
  }

  async handleTagLabelClick(event) {
    var checkboxTag = $(event.target).closest('.checkbox-tag');
    await this.clickCheckBoxTag(checkboxTag);
  }

  async clickCheckBoxTag(checkboxTag) {
    var current_verse_list = app_controller.verse_selection.selectedVerseReferences;

    if (!tags_controller.is_blocked && current_verse_list.length > 0) {
      this.toggleTagButton(checkboxTag);
      await tags_controller.handleCheckboxTagStateChange(checkboxTag);
    }
  }

  toggleTagButton(checkboxTag) {
    var tag_button = checkboxTag[0].querySelector('.tag-button');
    var isActive = tag_button.classList.contains('active');

    if (isActive) {
      tag_button.classList.remove('active');
      tag_button.classList.add('no-hl');

      if (platformHelper.isElectron()) {
        tag_button.addEventListener('mouseleave', tags_controller.removeTagButtonNoHl);
      }
    } else {
      tag_button.classList.add('active');
    }
  }

  removeTagButtonNoHl(event) {
    event.target.classList.remove('no-hl');
    event.target.removeEventListener('mouseleave', tags_controller.removeTagButtonNoHl);
  }

  async handleTagCbClick(event) {
    await waitUntilIdle();

    var checkboxTag = $(event.target).closest('.checkbox-tag');
    this.toggleTagButton(checkboxTag);
    await tags_controller.handleCheckboxTagStateChange(checkboxTag);
  }

  async handleCheckboxTagStateChange(checkboxTag) {
    var current_verse_list = app_controller.verse_selection.selectedVerseReferences;

    if (tags_controller.is_blocked || current_verse_list.length == 0) {
      return;
    }

    tags_controller.is_blocked = true;
    setTimeout(function() {
      tags_controller.is_blocked = false;
    }, 300);

    var id = parseInt(checkboxTag.attr('tag-id'));
    var tag_button = checkboxTag[0].querySelector('.tag-button');
    var cb_label = checkboxTag.find('.cb-label').html();
    var tag_button_is_active = tag_button.classList.contains('active');

    var current_verse_selection = app_controller.verse_selection.getSelectionAsXml(); 
    var current_verse_reference_ids = app_controller.verse_selection.getSelectionAsVerseReferenceIds();

    checkboxTag.find('.cb-label').removeClass('underline');
    checkboxTag.find('.cb-label-postfix').html('');

    var is_global = false;
    if (checkboxTag.find('.is-global').html() == 'true') {
      is_global = true;
    }

    if (tag_button_is_active) {
      // Update last used timestamp
      var current_timestamp = new Date(Date.now()).getTime();
      checkboxTag.attr('last-used-timestamp', current_timestamp);

      this.tag_store.updateTagTimestamp(id, current_timestamp);
      await this.tag_store.updateLatestAndOldestTagData();

      app_controller.tag_selection_menu.updateLastUsedTimestamp(id, current_timestamp);
      app_controller.tag_selection_menu.applyCurrentFilters();

      $(tag_button).attr('title', i18n.t("tags.remove-tag-assignment"));

      var filteredVerseBoxes = [];
      var currentVerseList = verseListController.getCurrentVerseList();

      // Create a list of filtered ids, that only contains the verses that do not have the selected tag yet
      for (let i = 0; i < current_verse_reference_ids.length; i++) {
        var currentVerseReferenceId = current_verse_reference_ids[i];
        var currentVerseBox = currentVerseList[0].querySelector('.verse-reference-id-' + currentVerseReferenceId);

        if (currentVerseBox != null) {
          var existingTagIdElements = currentVerseBox.querySelectorAll('.tag-id');
          var existingTagIds = [];
          
          for (let j = 0; j < existingTagIdElements.length; j++) {
            var currentTagId = parseInt(existingTagIdElements[j].innerText);
            existingTagIds.push(currentTagId);
          }

          if (!existingTagIds.includes(id)) {
            filteredVerseBoxes.push(currentVerseBox);
          }
        }
      }

      var result = await ipcDb.assignTagToVerses(id, filteredVerseBoxes);
      if (result.success == false) {
        var message = `The tag <i>${cb_label}</i> could not be assigned to the selected verses.<br>
                      An unexpected database error occurred:<br><br>
                      ${result.exception}<br><br>
                      Please restart the app.`;

        await showDialog('Database Error', message);
        uiHelper.hideTextLoadingIndicator();
        return;
      }

      tags_controller.changeVerseListTagInfo(id,
                                             cb_label,
                                             $.create_xml_doc(current_verse_selection),
                                             "assign");

      await eventController.publishAsync('on-latest-tag-changed', {
        'tagId': id,
        'added': true
      });

      var currentBook = app_controller.tab_controller.getTab().getBook();

      tags_controller.updateTagCountAfterRendering(currentBook != null);
      await tags_controller.updateTagsViewAfterVerseSelection(true);
      await tags_controller.updateTagUiBasedOnTagAvailability();

    } else {

      tags_controller.setRemoveTagAssignmentJob({
        'id': id,
        'is_global': is_global,
        'cb_label': cb_label,
        'checkboxTag': checkboxTag,
        'verse_list': current_verse_list,
        'verse_ids': current_verse_reference_ids,
        'xml_verse_selection': $.create_xml_doc(current_verse_selection),
        'tag_button': $(tag_button)
      });

      if (current_verse_list.length > 1) {
        tags_controller.tag_dialog_manager.initRemoveTagAssignmentConfirmationDialog();

        $('#remove-tag-assignment-name').html(cb_label);
        $('#remove-tag-assignment-confirmation-dialog').dialog('open');
      } else {
        await tags_controller.removeTagAssignmentAfterConfirmation();
        await tags_controller.updateTagsViewAfterVerseSelection(true);
      }
    }
  }
  
  getCheckboxTag(id) {
    const tagsContentGlobal = document.getElementById('tags-content-global');
    if (!tagsContentGlobal) {
      return $();
    }

    const checkboxTag = tagsContentGlobal.querySelector(`.checkbox-tag[tag-id="${id}"]`);
    return checkboxTag ? $(checkboxTag) : $();
  }

  updateTagVerseCount(id, verseBoxes, to_increment) {
    var count = verseBoxes.length;
    var checkboxTag = tags_controller.getCheckboxTag(id);
    var cb_label_element = checkboxTag.find('.cb-label');
    var tag_title = cb_label_element.text();
    var tag_assignment_count_element = checkboxTag.find('.cb-label-tag-assignment-count');
    var tag_assignment_count_values = tag_assignment_count_element.text().substring(
      1, tag_assignment_count_element.text().length - 1
    );

    var current_book_count = 0;
    var current_global_count = 0;
    var new_book_count = 0;
    var new_global_count = 0;

    var currentBook = app_controller.tab_controller.getTab().getBook();

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

    var new_label = "";
    if (currentBook == null) {
      new_label = "(" + new_global_count + ")";
    } else {
      new_label = "(" + new_book_count + " | " + new_global_count + ")";
    }

    tag_assignment_count_element.text(new_label);

    // Update tag count in tag store statistics
    var bookList = this.verse_box_helper.getBookListFromVerseBoxes(verseBoxes);
    tags_controller.tag_store.updateTagCount(id, bookList, count, to_increment);

    // Update tag count in tag selection menu as well
    app_controller.tag_selection_menu.updateVerseCountInTagMenu(tag_title, new_global_count);
  }

  async removeTagAssignmentAfterConfirmation() {
    this.tag_dialog_manager.removeTagAssignmentAfterConfirmation();
  }

  setRemoveTagAssignmentJob(job) {
    this.tag_dialog_manager.remove_tag_assignment_job = job;
  }

  /**
   * This function updates the tag info in existing verse lists after tags have been assigned/removed.
   * It does this for the currently opened tab and also within all other tabs where the corresponding verse is loaded.
   */
  async changeVerseListTagInfo(tag_id,
                               tag_title,
                               verse_selection,
                               action) {

    verse_selection = $(verse_selection);
    var selected_verses = verse_selection.find('verse');
    var current_verse_list_frame = verseListController.getCurrentVerseListFrame();

    for (let i = 0; i < selected_verses.length; i++) {
      let current_verse_reference_id = $(selected_verses[i]).find('verse-reference-id').text();
      let current_verse_box = current_verse_list_frame[0].querySelector('.verse-reference-id-' + current_verse_reference_id);

      let verseBoxObj = new VerseBox(current_verse_box);
      let highlight = (action == "assign");

      verseBoxObj.changeVerseListTagInfo(tag_id, tag_title, action, highlight);
    }

    for (let i = 0; i < selected_verses.length; i++) {
      let current_verse_reference_id = $(selected_verses[i]).find('verse-reference-id').text();
      let current_verse_box = current_verse_list_frame[0].querySelector('.verse-reference-id-' + current_verse_reference_id);

      await this.verse_box_helper.iterateAndChangeAllDuplicateVerseBoxes(current_verse_box, { tag_id: tag_id, tag_title: tag_title, action: action }, (changedValue, targetVerseBox) => {
        let verseBoxObj = new VerseBox(targetVerseBox);
        verseBoxObj.changeVerseListTagInfo(changedValue.tag_id, changedValue.tag_title, changedValue.action);
      });
    }
  }

  sortTagLists() {
    const globalTagsBox = document.getElementById('tags-content-global');
    const tags = Array.from(globalTagsBox.querySelectorAll('.checkbox-tag'));

    tags.sort((a, b) => {
      const textA = a.querySelector('.cb-label').textContent.toLowerCase();
      const textB = b.querySelector('.cb-label').textContent.toLowerCase();
      return textA > textB ? 1 : -1;
    });

    tags.forEach(tag => globalTagsBox.appendChild(tag));
  }

  async getTagList(forceRefresh=true) {
    var tagList = await this.tag_store.getTagList(forceRefresh);
    return tagList;
  }

  async updateTagList(currentBook, tagGroupId=null, contentId=null, forceRefresh=false) {
    if (tagGroupId == null) {
      tagGroupId = this.currentTagGroupId;
    }

    if (forceRefresh) {
      this.initialRenderingDone = false;
    }

    if (contentId == null) {
      contentId = currentBook;
    }

    if (contentId != this.lastContentId || forceRefresh) {
      var tagList = await this.tag_store.getTagList(forceRefresh);
      if (tagGroupId != null && tagGroupId > 0) {
        tagList = await this.tag_store.getTagGroupMembers(tagGroupId, tagList);
      }

      var tagStatistics = await this.tag_store.getBookTagStatistics(currentBook, forceRefresh);
      await this.renderTags(tagList, tagStatistics, currentBook != null);
      this.initialRenderingDone = true;
      await waitUntilIdle();

      this.lastContentId = contentId;
    } else {
      app_controller.tag_statistics.highlightFrequentlyUsedTags();
    }
  }

  async renderTags(tag_list, tag_statistics, is_book=false) {
    // Delegate rendering to the TagListRenderer component
    await this.tag_list_renderer.renderTags(tag_list, tag_statistics, is_book);
    
    // Additional controller-specific logic after rendering
    var old_tags_search_input_value = $('#tags-search-input')[0].value;    
    if (this.new_tag_created && old_tags_search_input_value != '') {
      // If the newly created tag doesn't match the current search input
      // we remove the current search condition. Otherwise the new tag
      // wouldn't show up in the list as expected.
      if (!this.tag_list_filter.stringMatches(this.last_created_tag,
                                              $('#tags-search-input')[0].value)) {
        $('#tags-search-input')[0].value = '';
      }
    }    
    this.new_tag_created = false;
  }

  updateTagCountAfterRendering(is_book = false) {
    this.tag_list_renderer.updateTagCountAfterRendering(is_book);
  }

  removeEventListeners(element_list, type, listener) {
    for (let i = 0; i < element_list.length; i++) {
      element_list[i].removeEventListener(type, listener);
    }
  }

  addEventListeners(element_list, type, listener) {
    for (let i = 0; i < element_list.length; i++) {
      element_list[i].addEventListener(type, listener);
    }
  }

  bindTagEvents() {
    const tagsBox = document.getElementById('tags-content-global');

    tagsBox.addEventListener('click', async (event) => {
      const CLICK_TIMEOUT = 100;

      if (event.target.matches('.delete-icon') || event.target.matches('.delete-button')) {
        setTimeout(() => { this.handleDeleteTagButtonClick(event); }, CLICK_TIMEOUT);
      } else if (event.target.matches('.edit-icon') || event.target.matches('.edit-button')) {
        setTimeout(() => { this.handleEditTagClick(event); }, CLICK_TIMEOUT);
      } else if (event.target.matches('.tag-button')) {
        await waitUntilIdle();
        await this.handleTagCbClick(event);
      } else if (event.target.matches('.cb-label')) {
        await waitUntilIdle();
        await this.handleTagLabelClick(event);
      }
    });
  }

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

  async updateTagsViewAfterVerseSelection(force) {
    //console.time('updateTagsViewAfterVerseSelection');
    if (tags_controller.verse_selection_blocked && force !== true) {
      return;
    }

    tags_controller.verse_selection_blocked = true;
    setTimeout(function() {
      tags_controller.verse_selection_blocked = false;
    }, 300);

    var versesSelected = app_controller.verse_selection.getSelectedVerseBoxes().length > 0;
    var selected_verse_tags = [];

    if (versesSelected) { // Verses are selected

      selected_verse_tags = app_controller.verse_selection.getCurrentSelectionTags();
      var checkboxTags = document.querySelectorAll('.checkbox-tag');

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

    //console.timeEnd('updateTagsViewAfterVerseSelection');
  }

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

  initTagsUI() {
    const tagListFilterButton = document.getElementById('tag-list-filter-button');
    const tagsContentGlobal = document.getElementById('tags-content-global');
    const tagFilterMenuInputs = document.querySelectorAll('#tag-filter-menu input');
    const tagsSearchInput = document.getElementById('tags-search-input');

    tagListFilterButton.addEventListener('click', (e) => {
      this.tag_list_filter.handleFilterButtonClick(e);
    });

    tagsContentGlobal.addEventListener('mouseover', () => {
      this.tag_list_filter.hideTagFilterMenuIfInToolBar();
    });

    tagFilterMenuInputs.forEach((input) => {
      input.addEventListener('click', (e) => {
        this.tag_list_filter.handleTagFilterTypeClick(e);
      });
    });

    tagsSearchInput.addEventListener('keyup', (e) => {
      this.tag_list_filter.handleTagSearchInput(e);
    });

    tagsSearchInput.addEventListener('keydown', (e) => {
      e.stopPropagation();
    });

    tagsSearchInput.addEventListener('mouseup', (e) => {
      e.stopPropagation();
      tagsSearchInput.select();
    });

    this.bindTagEvents();
  }

  async updateTagUiBasedOnTagAvailability(tagCount=undefined) {
    var translationCount = app_controller.translation_controller.getTranslationCount();
    if (tagCount === undefined) {
      tagCount = await ipcDb.getTagCount();
    }

    var textType = app_controller.tab_controller.getTab().getTextType();

    if (tagCount == 0) {
      $('.tag-select-button').addClass('ui-state-disabled');
      $('.show-book-tag-statistics-button').addClass('ui-state-disabled');

      if (translationCount > 0) {
        $('#new-standard-tag-button').removeClass('ui-state-disabled');
        $('#tags-content-global').html(i18n.t("help.help-text-no-tags-book-opened", { interpolation: {escapeValue: false} }));
      } else {
        $('#new-standard-tag-button').addClass('ui-state-disabled');
        $('#tags-content-global').html(i18n.t("help.help-text-no-tags-no-book-opened"));
      }
    } else {
      $('.tag-select-button').removeClass('ui-state-disabled');
      $('#new-standard-tag-button').removeClass('ui-state-disabled');

      if (textType == 'book') {
        $('.show-book-tag-statistics-button').removeClass('ui-state-disabled');
      }
    }
  }

  showTagListLoadingIndicator() {
    this.tag_list_renderer.showTagListLoadingIndicator();
  }

  hideTagListLoadingIndicator() {
    this.tag_list_renderer.hideTagListLoadingIndicator();
  }

  async updateTagsView(tabIndex, forceRefresh = false) {
    var currentTab = app_controller.tab_controller.getTab(tabIndex);
    var tagCount = await ipcDb.getTagCount();

    if (currentTab !== undefined) {
      if (tagCount > 0) {
        this.showTagListLoadingIndicator();
      }

      await waitUntilIdle();

      var currentTabBook = currentTab.getBook();
      var currentTabContentId = currentTab.getContentId();
      await this.updateTagList(currentTabBook, this.currentTagGroupId, currentTabContentId, forceRefresh);
      
      // Simply reapply the filter - the TagListFilter will detect the current state
      if (!this.skipFilterDuringUpdate) {
        this.tag_list_filter.reapplyCurrentFilter();
      }

      this.hideTagListLoadingIndicator();
    }

    await this.updateTagUiBasedOnTagAvailability(tagCount);
  }

  generateTagListHtml(tagList, tagStatistics) {
    return this.tag_list_renderer.generateTagListHtml(tagList, tagStatistics);
  }

  updateVirtualContainerSize() {
    this.tag_list_renderer.updateVirtualContainerSize();
  }
}

module.exports = TagsController;
