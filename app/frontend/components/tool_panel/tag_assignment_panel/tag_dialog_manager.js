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

const { waitUntilIdle, showDialog } = require('../../../helpers/ezra_helper.js');
const eventController = require('../../../controllers/event_controller.js');
const verseListController = require('../../../controllers/verse_list_controller.js');

/**
 * The TagDialogManager handles all functionality related to tag dialogs.
 * 
 * @category Component
 */
class TagDialogManager {
  /**
   * Constructs a new TagDialogManager
   * 
   * @param {Object} tagsController - Reference to the tags controller
   */
  constructor(tagsController) {
    this.tagsController = tagsController;
    
    this.newTagDialogInitDone = false;
    this.addTagsToGroupDialogInitDone = false;
    this.editTagDialogInitDone = false;
    this.deleteTagConfirmationDialogInitDone = false;
    this.removeTagAssignmentConfirmationDialogInitDone = false;
    
    this.createNoteFile = false;
    this.edit_tag_id = null;
    this.edit_tag_title = null;
    
    this.tag_to_be_deleted = null;
    this.tag_to_be_deleted_title = null;
    this.tag_to_be_deleted_is_global = false;
    this.permanently_delete_tag = true;
    
    this.remove_tag_assignment_job = null;
    this.persistence_ongoing = false;
  }
  
  /**
   * Refresh all dialogs (used after locale changes)
   */
  refreshTagDialogs() {
    this.initNewTagDialog(true);
    this.initAddTagsToGroupDialog(true);
    this.initEditTagDialog(true);
    this.initRemoveTagAssignmentConfirmationDialog(true);
    this.initDeleteTagConfirmationDialog(true);
  }

  /**
   * Initialize the new tag dialog
   * 
   * @param {boolean} force - Whether to force initialization even if already done
   */
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
        tag_assignment_panel.tag_dialog_manager.saveNewTag(this);
      }
    };

    document.getElementById('create-note-file-checkbox').addEventListener('change', (event) => {
      this.createNoteFile = event.target.checked;
    });

    document.getElementById('add-existing-tags-to-tag-group-link').addEventListener('click', async (event) => {
      event.preventDefault();

      this.initAddTagsToGroupDialog();

      const addTagsToGroupFilterInput = document.getElementById('add-tags-to-group-filter-input');
      addTagsToGroupFilterInput.value = '';

      const addTagsToGroupTagList = document.getElementById('add-tags-to-group-tag-list');
      addTagsToGroupTagList.style.removeProperty('display');
      addTagsToGroupTagList._tagManager.resetAndRefresh();

      const addButton = document.getElementById('add-tags-to-group-button');
      uiHelper.disableButton(addButton);

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
          const tagExisting = await this.tagsController.updateButtonStateBasedOnTagTitleValidation(tag_title, 'create-tag-button');

          if (tagExisting) {
            return;
          }
          
          // Only proceed if the save button is enabled
          if (!$('#create-tag-button').hasClass('ui-state-disabled')) {
            $('#new-standard-tag-dialog').dialog('close');
            this.saveNewTag(event);
          }
        }
      });

      tagTitleInput.addEventListener('keyup', async () => {
        const tag_title = tagTitleInput.value;
        await this.tagsController.updateButtonStateBasedOnTagTitleValidation(tag_title, 'create-tag-button');
      });
    }
  }

  /**
   * Initialize the add tags to group dialog
   * 
   * @param {boolean} force - Whether to force initialization even if already done
   */
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
    addTagsToGroupDialogOptions.title = i18n.t('tags.add-tags-to-group');
    addTagsToGroupDialogOptions.autoOpen = false;
  
    addTagsToGroupDialogOptions.buttons = {};
    addTagsToGroupDialogOptions.buttons[i18n.t('general.cancel')] = function() {
      $(this).dialog('close');
    };
    addTagsToGroupDialogOptions.buttons[i18n.t('tags.add-tags-to-group')] = {
      id: 'add-tags-to-group-button',
      text: i18n.t('tags.add-tags-to-group'),
      click: function() {
        $(this).dialog('close');

        const addTagsToGroupTagList = document.getElementById('add-tags-to-group-tag-list');
        tag_assignment_panel.addTagsToGroup(tag_assignment_panel.currentTagGroupId, addTagsToGroupTagList.addList);
      }
    };

    document.getElementById('add-tags-to-group-filter-input').addEventListener('keyup', () => {
      let currentFilterString = document.getElementById('add-tags-to-group-filter-input').value;
      const addTagsToGroupTagList = document.getElementById('add-tags-to-group-tag-list');
      addTagsToGroupTagList.filter = currentFilterString;
    });

    $('#add-tags-to-group-dialog').dialog(addTagsToGroupDialogOptions);
    uiHelper.fixDialogCloseIconOnAndroid('add-tags-to-group-dialog');
    
    // Initially disable the Add tags to group button
    uiHelper.disableButton(document.getElementById('add-tags-to-group-button'));
    
    // Subscribe to changes in the tag list selection
    document.getElementById('add-tags-to-group-tag-list').addEventListener('selectionChanged', function() {
      const addTagsToGroupTagList = document.getElementById('add-tags-to-group-tag-list');
      const addButton = document.getElementById('add-tags-to-group-button');
      
      if (addTagsToGroupTagList.addList && addTagsToGroupTagList.addList.length > 0) {
        uiHelper.enableButton(addButton);
      } else {
        uiHelper.disableButton(addButton);
      }
    });

    // Subscribe to the on-enter-pressed event to handle enter key press while the dialog is open
    eventController.subscribe('on-enter-pressed', () => {
      if ($('#add-tags-to-group-dialog').dialog('isOpen')) {
        const addTagsToGroupTagList = document.getElementById('add-tags-to-group-tag-list');
        tag_assignment_panel.addTagsToGroup(tag_assignment_panel.currentTagGroupId, addTagsToGroupTagList.addList);
        $('#add-tags-to-group-dialog').dialog('close');
      }
    });
  }

  /**
   * Initialize the edit tag dialog
   * 
   * @param {boolean} force - Whether to force initialization even if already done
   */
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
    edit_tag_dlg_options.title = i18n.t('tags.edit-tag');
    edit_tag_dlg_options.autoOpen = false;

    edit_tag_dlg_options.buttons = {};
    edit_tag_dlg_options.buttons[i18n.t('general.cancel')] = function() {
      setTimeout(() => { $(this).dialog('close'); }, 100);
    };

    edit_tag_dlg_options.buttons[i18n.t('general.save')] = {
      id: 'edit-tag-button',
      text: i18n.t('general.save'),
      click: () => {
        this.closeDialogAndUpdateTag();
      }
    };

    $('#edit-tag-dialog').dialog(edit_tag_dlg_options);
    uiHelper.fixDialogCloseIconOnAndroid('edit-tag-dialog');
  
    // Handle the enter key in the tag title field and rename the tag when it is pressed
    $('#rename-tag-title-input:not(.bound)').addClass('bound').on('keypress', (event) => {
      if (event.which == 13) {
        // Only proceed if the save button is enabled
        if (!$('#edit-tag-button').hasClass('ui-state-disabled')) {
          this.closeDialogAndUpdateTag();
        }
      }
    // eslint-disable-next-line no-unused-vars
    }).on('keyup', (event) => {
      this.handleEditTagChange();
    });
  }

  /**
   * Initialize the delete tag confirmation dialog
   * 
   * @param {boolean} force - Whether to force initialization even if already done
   */
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
    delete_tag_confirmation_dlg_options.title = i18n.t('tags.delete-tag');
    delete_tag_confirmation_dlg_options.autoOpen = false;
  
    delete_tag_confirmation_dlg_options.buttons = {};
    delete_tag_confirmation_dlg_options.buttons[i18n.t('general.cancel')] = function() {
      setTimeout(() => { $(this).dialog('close'); }, 100);
    };
    delete_tag_confirmation_dlg_options.buttons[i18n.t('tags.delete-tag')] = () => {
      this.deleteTagAfterConfirmation();
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
    
    // Subscribe to the on-enter-pressed event to handle enter key press while the dialog is open
    eventController.subscribe('on-enter-pressed', () => {
      if ($('#delete-tag-confirmation-dialog').dialog('isOpen')) {
        this.deleteTagAfterConfirmation();
      }
    });
    
    // Subscribe to the on-esc-pressed event to close the dialog when escape key is pressed
    eventController.subscribe('on-esc-pressed', () => {
      if ($('#delete-tag-confirmation-dialog').dialog('isOpen')) {
        $('#delete-tag-confirmation-dialog').dialog('close');
      }
    });
  }

  /**
   * Initialize the remove tag assignment confirmation dialog
   * 
   * @param {boolean} force - Whether to force initialization even if already done
   */
  initRemoveTagAssignmentConfirmationDialog(force=false) {
    if (!force && this.removeTagAssignmentConfirmationDialogInitDone) {
      return;
    }

    this.removeTagAssignmentConfirmationDialogInitDone = true;

    let remove_tag_assignment_confirmation_dlg_options = uiHelper.getDialogOptions(360, null, true, [55, 120]);
    remove_tag_assignment_confirmation_dlg_options.dialogClass = 'ezra-dialog remove-tag-assignment-confirmation-dialog';
    remove_tag_assignment_confirmation_dlg_options.autoOpen = false;
    remove_tag_assignment_confirmation_dlg_options.title = i18n.t('tags.remove-tag-assignment');
  
    remove_tag_assignment_confirmation_dlg_options.buttons = {};
    remove_tag_assignment_confirmation_dlg_options.buttons[i18n.t('general.cancel')] = () => {
      this.remove_tag_assignment_job.tag_button.addClass('active');
      this.remove_tag_assignment_job = null;
  
      $('#remove-tag-assignment-confirmation-dialog').dialog('close');
    };

    remove_tag_assignment_confirmation_dlg_options.buttons[i18n.t('tags.remove-tag-assignment')] = () => {
      this.removeTagAssignmentAfterConfirmation();
    };

    $('#remove-tag-assignment-confirmation-dialog').dialog(remove_tag_assignment_confirmation_dlg_options);
    uiHelper.fixDialogCloseIconOnAndroid('remove-tag-assignment-confirmation-dialog');

    // Subscribe to the on-enter-pressed event to handle enter key press while the dialog is open
    eventController.subscribe('on-enter-pressed', () => {
      if ($('#remove-tag-assignment-confirmation-dialog').dialog('isOpen')) {
        this.removeTagAssignmentAfterConfirmation();
      }
    });
    
    // Subscribe to the on-esc-pressed event to close the dialog when escape key is pressed
    eventController.subscribe('on-esc-pressed', () => {
      if ($('#remove-tag-assignment-confirmation-dialog').dialog('isOpen')) {
        $('#remove-tag-assignment-confirmation-dialog').dialog('close');
      }
    });

    // eslint-disable-next-line no-unused-vars
    $('#remove-tag-assignment-confirmation-dialog').bind('dialogbeforeclose', (event) => {
      if (!this.persistence_ongoing && this.remove_tag_assignment_job != null) {
        this.remove_tag_assignment_job.tag_button.addClass('active');
        this.remove_tag_assignment_job = null;
      }
    });
  }

  /**
   * Delete a tag after user confirmation
   */
  deleteTagAfterConfirmation() {
    $('#delete-tag-confirmation-dialog').dialog('close');

    this.permanently_delete_tag = document.getElementById('permanently-delete-tag').checked;
    let deleteNoteFile = true;
   
    setTimeout(async () => {
      let result = null;

      if (!this.tagsController.tagGroupUsed() || this.permanently_delete_tag) {
        // Permanently delete tag
        result = await ipcDb.removeTag(this.tag_to_be_deleted, deleteNoteFile);
      } else {
        // Remove tag from current tag group
        result = await ipcDb.updateTag(this.tag_to_be_deleted,
                                       this.tag_to_be_deleted_title,
                                       [],
                                       [ this.tagsController.currentTagGroupId ]);
      }

      if (result.success == false) {
        var message = `The tag <i>${this.tag_to_be_deleted_title}</i> could not be deleted.<br>
                      An unexpected database error occurred:<br><br>
                      ${result.exception}<br><br>
                      Please restart the app.`;

        await showDialog('Database Error', message);
        uiHelper.hideTextLoadingIndicator();
        return;
      }

      if (this.tagsController.tagGroupUsed()) {
        await eventController.publishAsync('on-tag-group-member-changed', {
          tagId: this.tag_to_be_deleted,
          addTagGroups: [],
          removeTagGroups: [ this.tagsController.currentTagGroupId ]
        });

        await eventController.publishAsync('on-tag-group-multiple-members-changed');
      }

      if (!this.tagsController.tagGroupUsed() || this.permanently_delete_tag) {
        await eventController.publishAsync('on-tag-deleted', this.tag_to_be_deleted);
      }

      await this.tagsController.removeTagById(this.tag_to_be_deleted);

      await this.tagsController.updateTagsViewAfterVerseSelection(true);
      await this.tagsController.updateTagUiBasedOnTagAvailability();
    }, 50);
  }

  /**
   * Save changes after editing a tag
   */
  async closeDialogAndUpdateTag() {
    var oldTitle = this.edit_tag_title;
    var newTitle = $('#rename-tag-title-input').val();
    newTitle = newTitle.trim();

    if (newTitle != oldTitle) {
      let tagExisting = await this.tagsController.updateButtonStateBasedOnTagTitleValidation(newTitle, 'edit-tag-button');

      if (tagExisting) {
        return;
      }
    }

    var tagGroupAssignment = document.getElementById('tag-group-assignment');
    var addTagGroups = tagGroupAssignment.addList;
    var removeTagGroups = tagGroupAssignment.removeList;

    $('#edit-tag-dialog').dialog('close');
    var checkboxTag = this.tagsController.getCheckboxTag(this.edit_tag_id);
    var isGlobal = (checkboxTag.parent().attr('id') == 'tags-content-global');
    
    var result = await ipcDb.updateTag(this.edit_tag_id, newTitle, addTagGroups, removeTagGroups);
    if (result.success == false) {
      var message = `The tag <i>${this.edit_tag_title}</i> could not be updated.<br>
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
          tagId: this.edit_tag_id,
          oldTitle: this.edit_tag_title,
          newTitle: newTitle
        }
      );

      this.tagsController.updateTagInView(this.edit_tag_id, newTitle);
      this.tagsController.updateTagTitlesInVerseList(this.edit_tag_id, isGlobal, newTitle);

      this.tagsController.sortTagList();
      await this.tagsController.updateTagsViewAfterVerseSelection(true);
    }

    if (addTagGroups.length > 0 || removeTagGroups.length > 0) {
      await eventController.publishAsync('on-tag-group-member-changed', {
        tagId: this.edit_tag_id,
        addTagGroups,
        removeTagGroups
      });

      await eventController.publishAsync('on-tag-group-multiple-members-changed');

      if (this.tagsController.tagGroupUsed()) {
        const currentTabIndex = app_controller.tab_controller.getSelectedTabIndex();
        await this.tagsController.updateTagsView(currentTabIndex, true);
      }
    }

    await eventController.publishAsync('on-latest-tag-changed', {
      'tagId': this.edit_tag_id,
      'added': false
    });

    await waitUntilIdle();
    checkboxTag = this.tagsController.getCheckboxTag(this.edit_tag_id);
    checkboxTag.effect('bounce', 'fast');
  }

  /**
   * Handle UI state changes when editing a tag
   */
  handleEditTagChange() {
    let tagGroupAssignment = document.getElementById('tag-group-assignment');
    let tagButton = document.getElementById('edit-tag-button');
    var oldTitle = this.edit_tag_title;
    var newTitle = document.getElementById('rename-tag-title-input').value;

    if (newTitle != oldTitle || tagGroupAssignment.isChanged) {
      uiHelper.enableButton(tagButton);
    } else {
      uiHelper.disableButton(tagButton);
    }

    if (!tagGroupAssignment.isChanged) {
      this.tagsController.updateButtonStateBasedOnTagTitleValidation(newTitle, 'edit-tag-button');
    }
  }

  /**
   * Create a new tag dialog
   */
  async handleNewTagButtonClick(event) {
    if (event.target.classList.contains('ui-state-disabled')) {
      return;
    }

    eventController.publish('on-button-clicked');

    await waitUntilIdle();
    this.initNewTagDialog();

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

      if (this.tagsController.tagGroupUsed()) {
        tagGroupAssignment.tagGroupManager.enableElementById(this.tagsController.currentTagGroupId);
        tagGroupAssignment.tagGroupManager._addList = [ this.tagsController.currentTagGroupId ];
      }
    }

    this.tagsController.updateButtonStateBasedOnTagTitleValidation('', 'create-tag-button');
    let addExistingTagsLink = document.getElementById('add-existing-tags-to-tag-group-link').parentNode;

    if (this.tagsController.tagGroupUsed()) {
      let remainingTagCount = await this.tagsController.updateAddTagToGroupTagList();

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

  /**
   * Handle the delete tag button click
   */
  async handleDeleteTagButtonClick(event) {
    eventController.publish('on-button-clicked');
    this.initDeleteTagConfirmationDialog();

    var checkboxTag = $(event.target).closest('.checkbox-tag');
    var tag_id = checkboxTag.attr('tag-id');
    var parent_id = checkboxTag.parent().attr('id');
    var label = checkboxTag.find('.cb-label').html();

    this.tag_to_be_deleted_is_global = (parent_id == 'tags-content-global');
    this.tag_to_be_deleted_title = label;
    this.tag_to_be_deleted = tag_id;
    this.permanently_delete_tag = this.tagsController.tagGroupUsed() ? false : true;
    
    var number_of_tagged_verses = checkboxTag.attr('global-assignment-count');
    var tagObject = await this.tagsController.tag_store.getTag(tag_id);
    var noteFileId = tagObject.noteFileId;

    let deleteTagFromGroupExplanation = document.getElementById('delete-tag-from-group-explanation');
    let reallyDeleteTagExplanation = document.getElementById('really-delete-tag-explanation');
    let permanentlyDeleteTagBox = document.getElementById('permanently-delete-tag-box');
    let permanentlyDeleteTagWarning = document.getElementById('permanently-delete-tag-warning');
    let permanentlyDeleteNoteFileWarning = document.getElementById('permanently-delete-note-file-warning');
    let tagGroup = this.tagsController.currentTagGroupTitle;

    let permanentlyDeleteCheckbox = document.getElementById('permanently-delete-tag');
    permanentlyDeleteCheckbox.checked = false;

    if (noteFileId) {
      permanentlyDeleteNoteFileWarning.style.display = 'block';
    } else {
      permanentlyDeleteNoteFileWarning.style.display = 'none';
    }

    if (this.tagsController.tagGroupUsed()) {
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
    $('#delete-tag-number-of-verses').html(number_of_tagged_verses);
    $('#delete-tag-confirmation-dialog').dialog('open');
  }

  /**
   * Handle the edit tag button click
   */
  async handleEditTagClick(event) {
    eventController.publish('on-button-clicked');
    this.initEditTagDialog();

    var checkboxTag = $(event.target).closest('.checkbox-tag');
    var cb_label = checkboxTag.find('.cb-label').text();

    this.edit_tag_id = parseInt(checkboxTag.attr('tag-id'));
    this.edit_tag_title = cb_label;

    const $tagInput = $('#rename-tag-title-input');
    let tagButton = document.getElementById('edit-tag-button');
    uiHelper.disableButton(tagButton);

    $tagInput.val(cb_label);

    $('#edit-tag-dialog').dialog('open');

    var tagGroupAssignment = document.getElementById('tag-group-assignment');
    await tagGroupAssignment.tagGroupManager.refreshItemList();

    tagGroupAssignment.tagid = this.edit_tag_id;
    tagGroupAssignment.onChange = () => {
      this.handleEditTagChange();
    };

    if (!platformHelper.isMobile()) {
      $('#rename-tag-title-input').focus();
    }
  }

  /**
   * Save a new tag
   */
  async saveNewTag(e) {
    uiHelper.showTextLoadingIndicator();
    $(e).dialog('close');

    await waitUntilIdle(); // Give the dialog some time to close

    var new_tag_title = $('#new-standard-tag-title-input').val();
    this.tagsController.new_tag_created = true;
    this.tagsController.last_created_tag = new_tag_title;
    new_tag_title = new_tag_title.trim();

    let tagGroupAssignment = document.getElementById('new-tag-dialog-tag-group-assignment');
    let tagGroups = tagGroupAssignment.addList;

    var result = await ipcDb.createNewTag(new_tag_title, this.createNoteFile, tagGroups);
    if (result.success == false) {
      var message = `The new tag <i>${new_tag_title}</i> could not be saved.<br>
                     An unexpected database error occurred:<br><br>
                     ${result.exception}<br><br>
                     Please restart the app.`;

      await showDialog('Database Error', message);
      uiHelper.hideTextLoadingIndicator();
      return;
    }

    if (this.tagsController.tagGroupUsed()) {
      await eventController.publishAsync('on-tag-group-member-changed', {
        tagId: result.dbObject.id,
        addTagGroups: [ this.tagsController.currentTagGroupId ],
        removeTagGroups: []
      });

      await eventController.publishAsync('on-tag-group-multiple-members-changed');
    }

    await eventController.publishAsync('on-latest-tag-changed', {
      'tagId': result.dbObject.id,
      'added': true
    });

    var tab = app_controller.tab_controller.getTab();
    await this.tagsController.updateTagList(tab.getBook(), this.tagsController.currentTagGroupId, tab.getContentId(), true);
    await this.tagsController.updateTagsViewAfterVerseSelection(true);

    await eventController.publishAsync('on-tag-created', result.dbObject.id);
    uiHelper.hideTextLoadingIndicator();
  }

  /**
   * Remove tag assignment after user confirmation
   */
  async removeTagAssignmentAfterConfirmation() {
    this.persistence_ongoing = true;
    $('#remove-tag-assignment-confirmation-dialog').dialog('close');

    var job = this.remove_tag_assignment_job;
    this.tagsController.changeVerseListTagInfo(job.id,
                                          job.cb_label,
                                          job.xml_verse_selection,
                                          'remove');

    job.tag_button.attr('title', i18n.t('tags.assign-tag'));
    job.checkboxTag.append(this.tagsController.loading_indicator);

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
    this.tagsController.updateTagCountAfterRendering(currentBook != null);
    await this.tagsController.updateTagUiBasedOnTagAvailability();

    this.remove_tag_assignment_job = null;
    this.persistence_ongoing = false;
  }
}

module.exports = TagDialogManager;