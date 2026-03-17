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

const TagStore = require('./tag_store.js');
const TagListFilter = require('./tag_list_filter.js');
const TagListRenderer = require('./tag_list_renderer.js');
const TagDialogManager = require('./tag_dialog_manager.js');
const TagOperationsManager = require('./tag_operations_manager.js');
const VerseBoxHelper = require('../../../helpers/verse_box_helper.js');
const { waitUntilIdle } = require('../../../helpers/ezra_helper.js');
const eventController = require('../../../controllers/event_controller.js');
require('../../emoji_button_trigger.js');

/**
 * The TagAssignmentPanel handles most functionality related to tagging of verses.
 * 
 * Like other components it is only initialized once. It is accessible at the
 * global object `app_controller.tag_assignment_panel`.
 * 
 * @category Component
 */
class TagAssignmentPanel {
  constructor() {
    this.tag_store = new TagStore();
    this.tag_list_filter = new TagListFilter();
    this.tag_list_renderer = new TagListRenderer(this);
    this.tag_dialog_manager = new TagDialogManager(this);
    this.tag_operations_manager = new TagOperationsManager(this);
    this.verse_box_helper = new VerseBoxHelper();

    this.new_tag_created = false;
    this.last_created_tag = '';

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
    return this.tag_operations_manager.updateAddTagToGroupTagList();
  }

  async addTagsToGroup(tagGroupId, tagList) {
    await this.tag_operations_manager.addTagsToGroup(tagGroupId, tagList);
  }

  /**
   * Update button state based on tag title validation
   * 
   * @param {string} tagTitle - The tag title
   * @param {string} buttonId - The button ID
   * @returns {boolean} Whether the tag exists
   */
  async updateButtonStateBasedOnTagTitleValidation(tagTitle, buttonId) {
    tagTitle = tagTitle.trim();
    const tagExisting = await this.tag_store.tagExists(tagTitle);
    const tagButton = document.getElementById(buttonId);

    if (tagExisting || tagTitle == '') {
      uiHelper.disableButton(tagButton);
    } else {
      uiHelper.enableButton(tagButton);
    }

    return tagExisting;
  }

  async assignLastTag() {
    await this.tag_operations_manager.assignLastTag();
  }

  async handleTagLabelClick(event) {
    await this.tag_operations_manager.handleTagLabelClick(event);
  }

  async clickCheckBoxTag(checkboxTag) {
    await this.tag_operations_manager.clickCheckBoxTag(checkboxTag);
  }

  toggleTagButton(checkboxTag) {
    this.tag_operations_manager.toggleTagButton(checkboxTag);
  }

  removeTagButtonNoHl(event) {
    this.tag_operations_manager.removeTagButtonNoHl(event);
  }

  async handleTagCbClick(event) {
    await this.tag_operations_manager.handleTagCbClick(event);
  }

  async handleCheckboxTagStateChange(checkboxTag) {
    await this.tag_operations_manager.handleCheckboxTagStateChange(checkboxTag);
  }
  
  getCheckboxTag(id) {
    return this.tag_operations_manager.getCheckboxTag(id);
  }

  updateTagVerseCount(id, verseBoxes, to_increment) {
    this.tag_operations_manager.updateTagVerseCount(id, verseBoxes, to_increment);
  }

  async changeVerseListTagInfo(tag_id, tag_title, verse_selection, action) {
    await this.tag_operations_manager.changeVerseListTagInfo(tag_id, tag_title, verse_selection, action);
  }

  sortTagList() {
    this.tag_operations_manager.sortTagList();
  }

  async getTagList(forceRefresh=true) {
    return this.tag_operations_manager.getTagList(forceRefresh);
  }

  async updateTagList(currentBook, tagGroupId=null, contentId=null, forceRefresh=false) {
    await this.tag_operations_manager.updateTagList(currentBook, tagGroupId, contentId, forceRefresh);
  }

  updateTagTitlesInVerseList(tag_id, is_global, title) {
    this.tag_operations_manager.updateTagTitlesInVerseList(tag_id, is_global, title);
  }

  async updateTagsViewAfterVerseSelection(force) {
    await this.tag_operations_manager.updateTagsViewAfterVerseSelection(force);
  }

  formatCheckboxElementBasedOnSelection(cb_element, selected_verse_tags) {
    this.tag_operations_manager.formatCheckboxElementBasedOnSelection(cb_element, selected_verse_tags);
  }

  uncheckAllCheckboxElements() {
    this.tag_operations_manager.uncheckAllCheckboxElements();
  }

  async removeTagById(tagId) {
    await this.tag_operations_manager.removeTagById(tagId);
  }

  updateTagInView(tagId, newTitle) {
    this.tag_operations_manager.updateTagInView(tagId, newTitle);
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

  updateTagCountAfterRendering(isBook=false) {
    this.tag_list_renderer.updateTagCountAfterRendering(isBook);
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

  tagGroupUsed() {
    return this.currentTagGroupId != null && this.currentTagGroupId > 0;
  }
}

module.exports = TagAssignmentPanel;