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
const VerseBoxHelper = require('../helpers/verse_box_helper.js');
const VerseBox = require('../ui_models/verse_box.js');
require('../components/emoji_button_trigger.js');
const { waitUntilIdle } = require('../helpers/ezra_helper.js');
const eventController = require('./event_controller.js');
const verseListController = require('../controllers/verse_list_controller.js');
const { showDialog } = require('../helpers/ezra_helper.js');

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
    loadScript('app/templates/tag_list.js');

    this.tag_store = new TagStore();
    this.tag_list_filter = new TagListFilter();

    this.verse_box_helper = new VerseBoxHelper();

    this.new_standard_tag_button = document.getElementById('new-standard-tag-button');
    this.verse_selection_blocked = false;
    this.verses_were_selected_before = false;

    this.assign_tag_label = i18n.t('tags.assign-tag');
    this.unassign_tag_label = i18n.t('tags.remove-tag-assignment');
    this.assign_tag_hint = i18n.t('tags.assign-tag-hint');

    this.tag_to_be_deleted = null;
    this.tag_to_be_deleted_title = null;
    this.tag_to_be_deleted_is_global = false;
    this.permanently_delete_tag = true;

    this.remove_tag_assignment_job = null;
    this.new_tag_created = false;
    this.last_created_tag = '';

    this.edit_tag_id = null;

    this.loading_indicator = '<img class="loading-indicator" style="float: left; margin-left: 0.5em;" ' +
                             'width="16" height="16" src="images/loading_animation.gif" />';

    this.selected_verse_references = [];
    this.selected_verse_boxes = [];

    this.initialRenderingDone = false;
    this.newTagDialogInitDone = false;
    this.addTagsToGroupDialogInitDone = false;
    this.deleteTagConfirmationDialogInitDone = false;
    this.removeTagAssignmentConfirmationDialogInitDone = false;
    this.editTagDialogInitDone = false;
    this.lastContentId = null;
    this.currentTagGroupId = null;
    this.currentTagGroupTitle = null;

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
        await this.updateTagList(tab.getBook(), tagGroupId, tab.getContentId(), true);
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
    this.initNewTagDialog(true);
    this.initAddTagsToGroupDialog(true);
    this.initEditTagDialog(true);
    this.initRemoveTagAssignmentConfirmationDialog(true);
    this.initDeleteTagConfirmationDialog(true);
  }

  initNewTagDialog(force=false) {
    if (!force && this.newTagDialogInitDone) {
      return;
    }

    this.newTagDialogInitDone = true;

    const dialogWidth = 450;
    const dialogHeight = 470;
    const draggable = true;
    const position = [55, 120];

    const new_standard_tag_dlg_options = uiHelper.getDialogOptions(dialogWidth, dialogHeight, draggable, position);
    new_standard_tag_dlg_options.dialogClass = 'ezra-dialog new-tag-dialog';
    new_standard_tag_dlg_options.title = i18n.t('tags.new-tag');
    new_standard_tag_dlg_options.autoOpen = false;
    new_standard_tag_dlg_options.buttons = {};

    new_standard_tag_dlg_options.buttons[i18n.t('general.cancel')] = function() {
      setTimeout(() => {
        $(this).dialog('close');
      }, 100);
    };

    new_standard_tag_dlg_options.buttons[i18n.t('tags.create-tag')] = {
      id: 'create-tag-button',
      text: i18n.t('tags.create-tag'),
      click: function() {
        tags_controller.saveNewTag(this);
      }
    };

    document.getElementById('create-note-file-checkbox').addEventListener('change', function() {
      tags_controller.createNoteFile = this.checked;
    });

    document.getElementById('add-existing-tags-to-tag-group-link').addEventListener('click', async (event) => {
      event.preventDefault();

      tags_controller.initAddTagsToGroupDialog();

      const addTagsToGroupFilterInput = document.getElementById('add-tags-to-group-filter-input');
      addTagsToGroupFilterInput.value = '';

      const addTagsToGroupTagList = document.getElementById('add-tags-to-group-tag-list');
      addTagsToGroupTagList.style.removeProperty('display');

      if (platformHelper.isCordova()) {
        // eslint-disable-next-line no-undef
        if (Keyboard.isVisible) {
          const currentWindowHeight = window.innerHeight;

          $('#add-tags-to-group-dialog').dialog('option', 'height', currentWindowHeight - 18);
        }
      }

      $('#new-standard-tag-dialog').dialog('close');
      $('#add-tags-to-group-dialog').dialog('open');
      await waitUntilIdle();
    });

    $('#new-standard-tag-dialog').dialog(new_standard_tag_dlg_options);
    uiHelper.fixDialogCloseIconOnAndroid('new-tag-dialog');

    const tagTitleInput = document.getElementById('new-standard-tag-title-input');
    if (!tagTitleInput.classList.contains('bound')) {
      tagTitleInput.classList.add('bound');

      tagTitleInput.addEventListener('keypress', async (event) => {
        if (event.which === 13) {
          const tag_title = tagTitleInput.value;
          const tagExisting = await this.updateButtonStateBasedOnTagTitleValidation(tag_title, 'create-tag-button');

          if (tagExisting) {
            return;
          }

          $('#new-standard-tag-dialog').dialog('close');
          tags_controller.saveNewTag(event);
        }
      });

      tagTitleInput.addEventListener('keyup', async () => {
        const tag_title = tagTitleInput.value;
        await this.updateButtonStateBasedOnTagTitleValidation(tag_title, 'create-tag-button');
      });
    }
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

  initAddTagsToGroupDialog(force=false) {
    if (!force && this.addTagsToGroupDialogInitDone) {
      return;
    }

    this.addTagsToGroupDialogInitDone = true;

    var dialogWidth = 450;
    var dialogHeight = 480;
    var draggable = true;
    var position = [55, 120];

    let addTagsToGroupDialogOptions = uiHelper.getDialogOptions(dialogWidth, dialogHeight, draggable, position);
    addTagsToGroupDialogOptions.dialogClass = 'ezra-dialog add-tags-to-group-dialog';
    addTagsToGroupDialogOptions.title = i18n.t("tags.add-tags-to-group");
    addTagsToGroupDialogOptions.autoOpen = false;
  
    addTagsToGroupDialogOptions.buttons = {};
    addTagsToGroupDialogOptions.buttons[i18n.t("general.cancel")] = function() {
      $(this).dialog("close");
    };
    addTagsToGroupDialogOptions.buttons[i18n.t("tags.add-tags-to-group")] = {
      id: 'add-tags-to-group-button',
      text: i18n.t("tags.add-tags-to-group"),
      click: function() {
        $(this).dialog("close");

        const addTagsToGroupTagList = document.getElementById('add-tags-to-group-tag-list');
        tags_controller.addTagsToGroup(tags_controller.currentTagGroupId, addTagsToGroupTagList.addList);
      }
    };

    document.getElementById('add-tags-to-group-filter-input').addEventListener('keyup', () => {
      let currentFilterString = document.getElementById('add-tags-to-group-filter-input').value;
      const addTagsToGroupTagList = document.getElementById('add-tags-to-group-tag-list');
      addTagsToGroupTagList.filter = currentFilterString;
    });

    $('#add-tags-to-group-dialog').dialog(addTagsToGroupDialogOptions);
    uiHelper.fixDialogCloseIconOnAndroid('add-tags-to-group-dialog');
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

  initDeleteTagConfirmationDialog(force=false) {
    if (!force && this.deleteTagConfirmationDialogInitDone) {
      return;
    }

    this.deleteTagConfirmationDialogInitDone = true;

    var dialogWidth = 400;
    var dialogHeight = null;
    var draggable = true;
    var position = [55, 120];

    let delete_tag_confirmation_dlg_options = uiHelper.getDialogOptions(dialogWidth, dialogHeight, draggable, position);
    delete_tag_confirmation_dlg_options.dialogClass = 'ezra-dialog delete-tag-confirmation-dialog';
    delete_tag_confirmation_dlg_options.title = i18n.t("tags.delete-tag");
    delete_tag_confirmation_dlg_options.autoOpen = false;
  
    delete_tag_confirmation_dlg_options.buttons = {};
    delete_tag_confirmation_dlg_options.buttons[i18n.t("general.cancel")] = function() {
      setTimeout(() => { $(this).dialog("close"); }, 100);
    };
    delete_tag_confirmation_dlg_options.buttons[i18n.t("tags.delete-tag")] = function() {
      tags_controller.deleteTagAfterConfirmation();
    };

    document.getElementById('permanently-delete-tag').addEventListener('change', function() {
      let permanentlyDeleteTagWarning = document.getElementById('permanently-delete-tag-warning');

      if (this.checked) {
        permanentlyDeleteTagWarning.style.visibility = 'visible';
      } else {
        permanentlyDeleteTagWarning.style.visibility = 'hidden';
      }
    });

    $('#delete-tag-confirmation-dialog').dialog(delete_tag_confirmation_dlg_options);
    uiHelper.fixDialogCloseIconOnAndroid('delete-tag-confirmation-dialog');
  }

  initRemoveTagAssignmentConfirmationDialog(force=false) {
    if (!force && this.removeTagAssignmentConfirmationDialogInitDone) {
      return;
    }

    this.removeTagAssignmentConfirmationDialogInitDone = true;

    let remove_tag_assignment_confirmation_dlg_options = uiHelper.getDialogOptions(360, null, true, [55, 120]);
    remove_tag_assignment_confirmation_dlg_options.dialogClass = 'ezra-dialog remove-tag-assignment-confirmation-dialog';
    remove_tag_assignment_confirmation_dlg_options.autoOpen = false;
    remove_tag_assignment_confirmation_dlg_options.title = i18n.t("tags.remove-tag-assignment");
  
    remove_tag_assignment_confirmation_dlg_options.buttons = {};
    remove_tag_assignment_confirmation_dlg_options.buttons[i18n.t("general.cancel")] = function() {
      tags_controller.remove_tag_assignment_job.tag_button.addClass('active');
      tags_controller.remove_tag_assignment_job = null;
  
      $(this).dialog("close");
    };

    remove_tag_assignment_confirmation_dlg_options.buttons[i18n.t("tags.remove-tag-assignment")] = function() {
      tags_controller.removeTagAssignmentAfterConfirmation();
    };

    $('#remove-tag-assignment-confirmation-dialog').dialog(remove_tag_assignment_confirmation_dlg_options);
    uiHelper.fixDialogCloseIconOnAndroid('remove-tag-assignment-confirmation-dialog');

    // eslint-disable-next-line no-unused-vars
    $('#remove-tag-assignment-confirmation-dialog').bind('dialogbeforeclose', function(event) {
      if (!tags_controller.persistence_ongoing && tags_controller.remove_tag_assignment_job != null) {
        tags_controller.remove_tag_assignment_job.tag_button.addClass('active');
        tags_controller.remove_tag_assignment_job = null;
      }
    });
  }

  initEditTagDialog(force=false) {
    if (!force && this.editTagDialogInitDone) {
      return;
    }

    this.editTagDialogInitDone = true;

    var dialogWidth = 450;
    var dialogHeight = 400;
    var draggable = true;
    var position = [55, 120];

    let edit_tag_dlg_options = uiHelper.getDialogOptions(dialogWidth, dialogHeight, draggable, position);
    edit_tag_dlg_options.dialogClass = 'ezra-dialog edit-tag-dialog';
    edit_tag_dlg_options.title = i18n.t("tags.edit-tag");
    edit_tag_dlg_options.autoOpen = false;

    edit_tag_dlg_options.buttons = {};
    edit_tag_dlg_options.buttons[i18n.t("general.cancel")] = function() {
      setTimeout(() => { $(this).dialog("close"); }, 100);
    };

    edit_tag_dlg_options.buttons[i18n.t("general.save")] = {
      id: 'edit-tag-button',
      text: i18n.t("general.save"),
      click: function() {
        tags_controller.closeDialogAndUpdateTag();
      }
    };

    $('#edit-tag-dialog').dialog(edit_tag_dlg_options);
    uiHelper.fixDialogCloseIconOnAndroid('edit-tag-dialog');
  
    // Handle the enter key in the tag title field and rename the tag when it is pressed
    $('#rename-tag-title-input:not(.bound)').addClass('bound').on("keypress", (event) => {
      if (event.which == 13) {
        tags_controller.closeDialogAndUpdateTag();
      }
    // eslint-disable-next-line no-unused-vars
    }).on("keyup", (event) => {
      this.handleEditTagChange();
    });
  }

  async closeDialogAndUpdateTag() {
    var oldTitle = tags_controller.edit_tag_title;
    var newTitle = $('#rename-tag-title-input').val();
    newTitle = newTitle.trim();

    if (newTitle != oldTitle) {
      let tagExisting = await this.updateButtonStateBasedOnTagTitleValidation(newTitle, 'edit-tag-button');

      if (tagExisting) {
        return;
      }
    }

    var tagGroupAssignment = document.getElementById('tag-group-assignment');
    var addTagGroups = tagGroupAssignment.addList;
    var removeTagGroups = tagGroupAssignment.removeList;

    $('#edit-tag-dialog').dialog('close');
    var checkboxTag = this.getCheckboxTag(tags_controller.edit_tag_id);
    var isGlobal = (checkboxTag.parent().attr('id') == 'tags-content-global');
    
    var result = await ipcDb.updateTag(tags_controller.edit_tag_id, newTitle, addTagGroups, removeTagGroups);
    if (result.success == false) {
      var message = `The tag <i>${tags_controller.edit_tag_title}</i> could not be updated.<br>
                     An unexpected database error occurred:<br><br>
                     ${result.exception}<br><br>
                     Please restart the app.`;

      await showDialog('Database Error', message);
      uiHelper.hideTextLoadingIndicator();
      return;
    }

    if (newTitle != oldTitle) {
      await eventController.publishAsync(
        'on-tag-renamed',
        {
          tagId: tags_controller.edit_tag_id,
          oldTitle: tags_controller.edit_tag_title,
          newTitle: newTitle
        }
      );

      tags_controller.updateTagInView(tags_controller.edit_tag_id, newTitle);
      tags_controller.updateTagTitlesInVerseList(tags_controller.edit_tag_id, isGlobal, newTitle);

      tags_controller.sortTagLists();
      await tags_controller.updateTagsViewAfterVerseSelection(true);
    }

    if (addTagGroups.length > 0 || removeTagGroups.length > 0) {
      await eventController.publishAsync('on-tag-group-member-changed', {
        tagId: tags_controller.edit_tag_id,
        addTagGroups,
        removeTagGroups
      });

      await eventController.publishAsync('on-tag-group-multiple-members-changed');

      if (this.tagGroupUsed()) {
        const currentTabIndex = app_controller.tab_controller.getSelectedTabIndex();
        await this.updateTagsView(currentTabIndex, true);
      }
    }

    await eventController.publishAsync('on-latest-tag-changed', {
      'tagId': tags_controller.edit_tag_id,
      'added': false
    });

    await waitUntilIdle();
    checkboxTag = this.getCheckboxTag(tags_controller.edit_tag_id);
    checkboxTag.effect('bounce', 'fast');
  }

  updateTagInView(id, title) {
    // Rename tag in tag list on the left side
    const checkboxTag = this.getCheckboxTag(id);
    const label = checkboxTag.querySelector('.cb-label');
    label.textContent = title;

    // Rename tag in tag selection menu above bible browser
    const tagSelectionEntry = document.querySelector(`#tag-browser-tag-${id} .tag-browser-tag-title-content`);
    if (tagSelectionEntry) {
      tagSelectionEntry.textContent = title;
    }
  }

  async saveNewTag(e) {
    uiHelper.showTextLoadingIndicator();
    $(e).dialog("close");

    await waitUntilIdle(); // Give the dialog some time to close

    var new_tag_title = $('#new-standard-tag-title-input').val();
    tags_controller.new_tag_created = true;
    this.last_created_tag = new_tag_title;
    new_tag_title = new_tag_title.trim();

    let tagGroupAssignment = document.getElementById('new-tag-dialog-tag-group-assignment');
    let tagGroups = tagGroupAssignment.addList;

    var result = await ipcDb.createNewTag(new_tag_title, tags_controller.createNoteFile, tagGroups);
    if (result.success == false) {
      var message = `The new tag <i>${new_tag_title}</i> could not be saved.<br>
                     An unexpected database error occurred:<br><br>
                     ${result.exception}<br><br>
                     Please restart the app.`;

      await showDialog('Database Error', message);
      uiHelper.hideTextLoadingIndicator();
      return;
    }

    if (this.tagGroupUsed()) {
      await eventController.publishAsync('on-tag-group-member-changed', {
        tagId: result.dbObject.id,
        addTagGroups: [ this.currentTagGroupId ],
        removeTagGroups: []
      });

      await eventController.publishAsync('on-tag-group-multiple-members-changed');
    }

    await eventController.publishAsync('on-latest-tag-changed', {
      'tagId': result.dbObject.id,
      'added': true
    });

    var tab = app_controller.tab_controller.getTab();
    await tags_controller.updateTagList(tab.getBook(), this.currentTagGroupId, tab.getContentId(), true);
    await tags_controller.updateTagsViewAfterVerseSelection(true);

    await eventController.publishAsync('on-tag-created', result.dbObject.id);
    uiHelper.hideTextLoadingIndicator();
  }

  async handleNewTagButtonClick(event) {
    if (event.target.classList.contains('ui-state-disabled')) {
      return;
    }

    eventController.publish('on-button-clicked');

    await waitUntilIdle();
    tags_controller.initNewTagDialog();

    const tagInput = document.getElementById('new-standard-tag-title-input');
    tagInput.value = '';

    // Reset the create note file checkbox
    document.getElementById('create-note-file-checkbox').checked = false;

    var $dialogContainer = $('#new-standard-tag-dialog');
    $dialogContainer.dialog('open');

    await waitUntilIdle();

    let allTagGroups = await ipcDb.getAllTagGroups();
    let tagGroupAssignmentSection = document.getElementById('tag-group-assignment-section');
    let tagGroupAssignment = document.getElementById('new-tag-dialog-tag-group-assignment');
    tagGroupAssignment.tagGroupManager._addList = [];

    if (allTagGroups.length == 0) {
      tagGroupAssignmentSection.style.display = 'none';
    } else {
      tagGroupAssignmentSection.style.removeProperty('display');

      await tagGroupAssignment.tagGroupManager.refreshItemList();

      if (this.tagGroupUsed()) {
        tagGroupAssignment.tagGroupManager.enableElementById(this.currentTagGroupId);
        tagGroupAssignment.tagGroupManager._addList = [ this.currentTagGroupId ];
      }
    }

    this.updateButtonStateBasedOnTagTitleValidation('', 'create-tag-button');
    let addExistingTagsLink = document.getElementById('add-existing-tags-to-tag-group-link').parentNode;

    if (this.tagGroupUsed()) {
      let remainingTagCount = await this.updateAddTagToGroupTagList();

      if (remainingTagCount > 0) {
        addExistingTagsLink.style.removeProperty('display');
      } else {
        addExistingTagsLink.style.display = 'none';
      }
    } else {
      addExistingTagsLink.style.display = 'none';
    }

    if (platformHelper.isCordova()) {
      // Focus the input field (and show the screen keyboard) a little bit delayed
      // to give the layout engine some time to render the input field.
      setTimeout(async () => {
        await waitUntilIdle();
        tagInput.focus();
      }, 1000);
    } else {
      tagInput.focus();
    }
  }

  async handleDeleteTagButtonClick(event) {
    eventController.publish('on-button-clicked');
    tags_controller.initDeleteTagConfirmationDialog();

    var checkboxTag = $(event.target).closest('.checkbox-tag');
    var tag_id = checkboxTag.attr('tag-id');
    var parent_id = checkboxTag.parent().attr('id');
    var label = checkboxTag.find('.cb-label').html();

    tags_controller.tag_to_be_deleted_is_global = (parent_id == 'tags-content-global');
    tags_controller.tag_to_be_deleted_title = label;
    tags_controller.tag_to_be_deleted = tag_id;
    tags_controller.permanently_delete_tag = tags_controller.tagGroupUsed() ? false : true;
    
    var number_of_tagged_verses = checkboxTag.attr('global-assignment-count');
    var tagObject = await this.tag_store.getTag(tag_id);
    var noteFileId = tagObject.noteFileId;

    let deleteTagFromGroupExplanation = document.getElementById('delete-tag-from-group-explanation');
    let reallyDeleteTagExplanation = document.getElementById('really-delete-tag-explanation');
    let permanentlyDeleteTagBox = document.getElementById('permanently-delete-tag-box');
    let permanentlyDeleteTagWarning = document.getElementById('permanently-delete-tag-warning');
    let permanentlyDeleteNoteFileWarning = document.getElementById('permanently-delete-note-file-warning');
    let tagGroup = this.currentTagGroupTitle;

    let permanentlyDeleteCheckbox = document.getElementById('permanently-delete-tag');
    permanentlyDeleteCheckbox.checked = false;

    if (noteFileId) {
      permanentlyDeleteNoteFileWarning.style.display = 'block';
    } else {
      permanentlyDeleteNoteFileWarning.style.display = 'none';
    }

    if (this.tagGroupUsed()) {
      // Tag group used

      reallyDeleteTagExplanation.style.display = 'none';
      permanentlyDeleteTagWarning.style.visibility = 'hidden';
      permanentlyDeleteTagBox.style.removeProperty('display');

      deleteTagFromGroupExplanation.innerHTML = i18n.t('tags.delete-tag-from-group-explanation', { tag: label, group: tagGroup, interpolation: {escapeValue: false}});
      deleteTagFromGroupExplanation.style.display = 'block';
    } else {
      // All tags - no tag group

      deleteTagFromGroupExplanation.style.display = 'none';
      permanentlyDeleteTagWarning.style.visibility = 'visible';
      permanentlyDeleteTagBox.style.display = 'none';
      reallyDeleteTagExplanation.style.display = 'block';
    }

    $('#delete-tag-name').html(label);
    $('#delete-tag-number-of-verses').html(number_of_tagged_verses); // FIXME
    $('#delete-tag-confirmation-dialog').dialog('open');
  }

  deleteTagAfterConfirmation() {
    $('#delete-tag-confirmation-dialog').dialog('close');

    tags_controller.permanently_delete_tag = document.getElementById('permanently-delete-tag').checked;
    let deleteNoteFile = true;
   
    setTimeout(async () => {
      let result = null;

      if (!tags_controller.tagGroupUsed() || tags_controller.permanently_delete_tag) {
        // Permanently delete tag
        result = await ipcDb.removeTag(tags_controller.tag_to_be_deleted, deleteNoteFile);
      } else {
        // Remove tag from current tag group
        result = await ipcDb.updateTag(tags_controller.tag_to_be_deleted,
                                       tags_controller.tag_to_be_deleted_title,
                                       [],
                                       [ tags_controller.currentTagGroupId ]);
      }

      if (result.success == false) {
        var message = `The tag <i>${tags_controller.tag_to_be_deleted_title}</i> could not be deleted.<br>
                      An unexpected database error occurred:<br><br>
                      ${result.exception}<br><br>
                      Please restart the app.`;

        await showDialog('Database Error', message);
        uiHelper.hideTextLoadingIndicator();
        return;
      }

      if (tags_controller.tagGroupUsed()) {
        await eventController.publishAsync('on-tag-group-member-changed', {
          tagId: tags_controller.tag_to_be_deleted,
          addTagGroups: [],
          removeTagGroups: [ this.currentTagGroupId ]
        });

        await eventController.publishAsync('on-tag-group-multiple-members-changed');
      }

      if (!tags_controller.tagGroupUsed() || tags_controller.permanently_delete_tag) {
        await eventController.publishAsync('on-tag-deleted', tags_controller.tag_to_be_deleted);
      }

      await tags_controller.removeTagById(tags_controller.tag_to_be_deleted, tags_controller.tag_to_be_deleted_title);

      await tags_controller.updateTagsViewAfterVerseSelection(true);
      await tags_controller.updateTagUiBasedOnTagAvailability();
    }, 50);
  }

  async removeTagById(tag_id, tag_title) {
    var checkboxTag = tags_controller.getCheckboxTag(tag_id);
    checkboxTag.detach();

    if (!tags_controller.tagGroupUsed() || tags_controller.permanently_delete_tag) {
      if (this.tag_store.latest_tag_id != null && this.tag_store.latest_tag_id == tag_id) {
        this.tag_store.latest_tag_id = null;
        await this.tag_store.refreshTagList();
      }
    }

    tags_controller.updateTagCountAfterRendering();

    // eslint-disable-next-line no-unused-vars
    var tag_data_elements = $('.tag-id').filter(function(index){
      return ($(this).html() == tag_id);
    });

    if (!tags_controller.tagGroupUsed() || tags_controller.permanently_delete_tag) {
      var verse_list = $.create_xml_doc(
        app_controller.verse_selection.elementListToXmlVerseList(tag_data_elements)
      );

      tags_controller.changeVerseListTagInfo(tag_id, tag_title, verse_list, "remove");
    }
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

      tags_controller.remove_tag_assignment_job = {
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
        tags_controller.initRemoveTagAssignmentConfirmationDialog();

        $('#remove-tag-assignment-name').html(cb_label);
        $('#remove-tag-assignment-confirmation-dialog').dialog('open');
      } else {
        await tags_controller.removeTagAssignmentAfterConfirmation();
        await tags_controller.updateTagsViewAfterVerseSelection(true);
      }
    }
  }
  
  getCheckboxTag(id) {
    var checkboxTag = $('#tags-content-global').find('.checkbox-tag[tag-id="' + id + '"]');
    return checkboxTag;
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
    tags_controller.persistence_ongoing = true;
    $('#remove-tag-assignment-confirmation-dialog').dialog('close');

    var job = tags_controller.remove_tag_assignment_job;
    tags_controller.changeVerseListTagInfo(job.id,
                                           job.cb_label,
                                           job.xml_verse_selection,
                                           "remove");

    job.tag_button.attr('title', i18n.t("tags.assign-tag"));
    job.checkboxTag.append(tags_controller.loading_indicator);

    var verse_boxes = [];

    var currentVerseList = verseListController.getCurrentVerseList();

    for (let i = 0; i < job.verse_ids.length; i++) {
      var currentVerseReferenceId = job.verse_ids[i];
      var currentVerseBox = currentVerseList[0].querySelector('.verse-reference-id-' + currentVerseReferenceId);
      verse_boxes.push(currentVerseBox);
    }

    var result = await ipcDb.removeTagFromVerses(job.id, verse_boxes);
    if (result.success == false) {
      var message = `The tag <i>${job.cb_label}</i> could not be removed from the selected verses.<br>
                    An unexpected database error occurred:<br><br>
                    ${result.exception}<br><br>
                    Please restart the app.`;

      await showDialog('Database Error', message);
      uiHelper.hideTextLoadingIndicator();
      return;
    }

    await eventController.publishAsync('on-latest-tag-changed', {
      'tagId': job.id,
      'added': false
    });

    var currentBook = app_controller.tab_controller.getTab().getBook();
    tags_controller.updateTagCountAfterRendering(currentBook != null);
    tags_controller.updateTagUiBasedOnTagAvailability();

    tags_controller.remove_tag_assignment_job = null;
    tags_controller.persistence_ongoing = false;
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
    var global_tags_box = $('#tags-content-global');
    var sort_function = function(a,b) {
      return ($(a).find('.cb-label').text().toLowerCase() > $(b).find('.cb-label').text().toLowerCase()) ? 1 : -1;
    };

    global_tags_box.find('.checkbox-tag').sort_elements(sort_function);
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
    //console.time("renderTags");
    var current_book = app_controller.tab_controller.getTab().getBook();
    var global_tags_box_el = document.getElementById('tags-content-global');

    // Assume that verses were selected before, because otherwise the checkboxes may not be properly cleared
    this.verses_were_selected_before = true;

    // eslint-disable-next-line no-undef
    var all_tags_html = tagListTemplate({
      tags: tag_list,
      tagStatistics: tag_statistics,
      current_book: current_book,
      current_filter: $('#tags-search-input').val(),
      edit_tag_label: i18n.t("tags.edit-tag"),
      delete_tag_label: i18n.t("tags.delete-tag"),
    });

    global_tags_box_el.innerHTML = '';
    global_tags_box_el.innerHTML = all_tags_html;

    await app_controller.tag_statistics.refreshBookTagStatistics(tag_list, tag_statistics, current_book);
    uiHelper.configureButtonStyles('#tags-content');

    tags_controller.updateTagsViewAfterVerseSelection(true);
    tags_controller.updateTagCountAfterRendering(is_book);
    await tags_controller.updateTagUiBasedOnTagAvailability(tag_list.length);

    var old_tags_search_input_value = $('#tags-search-input')[0].value;    
    if (this.new_tag_created && old_tags_search_input_value != "") {
      // If the newly created tag doesn't match the current search input
      // we remove the current search condition. Otherwise the new tag
      // wouldn't show up in the list as expected.
      if (!tags_controller.tag_list_filter.stringMatches(this.last_created_tag,
                                                         $('#tags-search-input')[0].value)) {
        $('#tags-search-input')[0].value = "";
        old_tags_search_input_value = "";
      }
    }    
    this.new_tag_created = false;

    tags_controller.hideTagListLoadingIndicator();
    //console.timeEnd("renderTags");
  }

  async handleEditTagClick(event) {
    eventController.publish('on-button-clicked');
    tags_controller.initEditTagDialog();

    var checkboxTag = $(event.target).closest('.checkbox-tag');
    var cb_label = checkboxTag.find('.cb-label').text();

    tags_controller.edit_tag_id = parseInt(checkboxTag.attr('tag-id'));
    tags_controller.edit_tag_title = cb_label;

    const $tagInput = $('#rename-tag-title-input');
    let tagButton = document.getElementById('edit-tag-button');
    uiHelper.disableButton(tagButton);

    $tagInput.val(cb_label);

    $('#edit-tag-dialog').dialog('open');

    var tagGroupAssignment = document.getElementById('tag-group-assignment');
    await tagGroupAssignment.tagGroupManager.refreshItemList();

    tagGroupAssignment.tagid = tags_controller.edit_tag_id;
    tagGroupAssignment.onChange = () => {
      this.handleEditTagChange();
    };

    if (!platformHelper.isMobile()) {
      $('#rename-tag-title-input').focus();
    }
  }

  handleEditTagChange() {
    let tagGroupAssignment = document.getElementById('tag-group-assignment');
    let tagButton = document.getElementById('edit-tag-button');
    var oldTitle = tags_controller.edit_tag_title;
    var newTitle = document.getElementById('rename-tag-title-input').value;

    if (newTitle != oldTitle || tagGroupAssignment.isChanged) {
      uiHelper.enableButton(tagButton);
    } else {
      uiHelper.disableButton(tagButton);
    }

    if (!tagGroupAssignment.isChanged) {
      this.updateButtonStateBasedOnTagTitleValidation(newTitle, 'edit-tag-button');
    }
  }

  updateTagCountAfterRendering(is_book=false) {
    var global_tag_count = $('#tags-content-global').find('.checkbox-tag').length;
    var global_used_tag_count = $('#tags-content-global').find('.cb-label-assigned').length;
    var tag_list_stats = $($('#tags-content').find('#tag-list-stats'));
    var tag_list_stats_content = "";

    if (is_book) {
      tag_list_stats_content += global_used_tag_count + ' ' + i18n.t('tags.stats-used') + ' / ';
    }

    tag_list_stats_content += global_tag_count + ' ' + i18n.t('tags.stats-total');
    tag_list_stats.html(tag_list_stats_content);
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
    var tags_box = document.getElementById('tags-content-global');

    tags_box.addEventListener('click', async function(event) {
      // Use event delegation, so that we do not have to add an event listener to each element.

      const CLICK_TIMEOUT = 100;

      if (event.target.matches('.delete-icon') || event.target.matches('.delete-button')) {
        setTimeout(() => { tags_controller.handleDeleteTagButtonClick(event); }, CLICK_TIMEOUT);
      } else if (event.target.matches('.edit-icon') || event.target.matches('.edit-button')) {
        setTimeout(() => { tags_controller.handleEditTagClick(event); }, CLICK_TIMEOUT);
      } else if (event.target.matches('.tag-button')) {
        await waitUntilIdle();
        await tags_controller.handleTagCbClick(event);
      } else if (event.target.matches('.cb-label')) {
        await waitUntilIdle();
        await tags_controller.handleTagLabelClick(event);
      } else {
        return;
      }
    }, false);
  }

  updateTagTitlesInVerseList(tag_id, is_global, title) {
    var tag_class = is_global ? "tag-global" : "tag-book";

    // eslint-disable-next-line no-unused-vars
    var tag_data_elements = $('.tag-id').filter(function(index) {
      return (($(this).html() == tag_id) && ($(this).parent().hasClass(tag_class)));
    }).closest('.' + tag_class);

    for (let i = 0; i < tag_data_elements.length; i++) {
      var current_tag_data = $(tag_data_elements[i]);
      current_tag_data.find('.tag-title').html(title);

      var current_verse_box = new VerseBox(current_tag_data.closest('.verse-box')[0]);
      current_verse_box.updateTagTooltip();
      current_verse_box.updateVisibleTags();
    }
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
    var current_tag_button = cb_element.querySelector('.tag-button');
    var current_title_element = cb_element.querySelector('.cb-label');
    var current_title = current_title_element.innerHTML;
    var current_title_element_postfix = cb_element.querySelector('.cb-label-postfix');
    var match_found = false;

    for (let j = 0; j < selected_verse_tags.length; j++) {
      var current_tag_obj = selected_verse_tags[j];

      if (current_tag_obj.title == current_title) {
        if (current_tag_obj.complete) {
          current_tag_button.setAttribute('title', this.unassign_tag_label);
          current_tag_button.classList.add('active');
          current_title_element_postfix.innerHTML = '';
          current_title_element.classList.remove('underline');
        } else {
          current_tag_button.setAttribute('title', this.assign_tag_label);
          current_tag_button.classList.remove('active');
          current_title_element_postfix.innerHTML = '&nbsp;*';
          current_title_element.classList.add('underline');
        }

        match_found = true;
      }
    }

    if (!match_found) {
      current_tag_button.classList.remove('active');
      current_tag_button.setAttribute('title', this.assign_tag_label);
      current_title_element.classList.remove('underline');
      current_title_element_postfix.innerHTML = '';
    }

    if (!this.verses_were_selected_before) {
      current_tag_button.classList.remove('disabled');
    }
  }

  uncheckAllCheckboxElements() {
    var all_checkbox_elements = document.querySelectorAll('.checkbox-tag');

    if (all_checkbox_elements.length > 0) {
      for (let i = 0; i < all_checkbox_elements.length; i++) {
        var current_checkbox_element = all_checkbox_elements[i];

        var current_tag_button = current_checkbox_element.querySelector('.tag-button');
        current_tag_button.setAttribute('title', this.assign_tag_hint);
        current_tag_button.classList.add('disabled');
        current_tag_button.classList.remove('active');

        var current_title_element = current_checkbox_element.querySelector('.cb-label');
        current_title_element.classList.remove('underline');

        var current_title_element_postfix = current_checkbox_element.querySelector('.cb-label-postfix');
        current_title_element_postfix.innerHTML = '';
      }
    }
  }

  initTagsUI() {
    $('#tag-list-filter-button').bind('click', (e) => { this.tag_list_filter.handleFilterButtonClick(e); });

    $('#tags-content-global').bind('mouseover', () => { this.tag_list_filter.hideTagFilterMenuIfInToolBar(); });
    $('#tag-filter-menu').find('input').bind('click', (e) => { tags_controller.tag_list_filter.handleTagFilterTypeClick(e); });

    $('#tags-search-input').bind('keyup', (e) => { this.tag_list_filter.handleTagSearchInput(e); });
    $('#tags-search-input').bind('keydown', (e) => {
      e.stopPropagation();
    });

    $('#tags-search-input').bind('mouseup', (e) => {
      e.stopPropagation();
      $('#tags-search-input').select();
    });

    tags_controller.bindTagEvents();
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
    let tagsContentGlobal = document.getElementById('tags-content-global');
    let loadingIndicator = tagsContentGlobal.querySelector('loading-indicator');

    if (loadingIndicator == null) {
      let element = document.createElement('loading-indicator');
      tagsContentGlobal.appendChild(element);
      loadingIndicator = tagsContentGlobal.querySelector('loading-indicator');
    }

    $(loadingIndicator).find('.loader').show();
    $(loadingIndicator).show();
  }

  hideTagListLoadingIndicator() {
    let tagsContentGlobal = document.getElementById('tags-content-global');
    let loadingIndicator = tagsContentGlobal.querySelector('loading-indicator');
    $(loadingIndicator).hide();
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

      this.hideTagListLoadingIndicator();
    }

    await this.updateTagUiBasedOnTagAvailability(tagCount);
  }
}

module.exports = TagsController;
