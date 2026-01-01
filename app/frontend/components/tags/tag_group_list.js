/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2026 Ezra Bible App Development Team <contact@ezrabibleapp.net>

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

const { html, showDialog } = require('../../helpers/ezra_helper.js');
const eventController = require('../../controllers/event_controller.js');
const TagGroupManager = require('./tag_group_manager.js');
const tagGroupValidator = require('./tag_group_validator.js');

const template = html`

<!-- FONT AWESOME STYLES -->
<link rel="preload" href="node_modules/@fortawesome/fontawesome-free/webfonts/fa-solid-900.woff2" as="font" type="font/woff2">
<link href="node_modules/@fortawesome/fontawesome-free/css/solid.min.css" rel="stylesheet" type="text/css" />
<link href="node_modules/@fortawesome/fontawesome-free/css/fontawesome.min.css" rel="stylesheet" type="text/css" />

<link href="css/main.css" media="screen" rel="stylesheet" type="text/css" />
<link href="css/tool_panel.css" media="screen" rel="stylesheet" type="text/css" />
<link href="css/mobile.css" media="screen" rel="stylesheet" type="text/css" />

<link id="theme-css" href="css/jquery-ui/cupertino/jquery-ui.css" media="screen" rel="stylesheet" type="text/css" />

<style>
:host {
  display: block;
  height: 95%;
}

#tag-group-list-content {
  display: flex;
  flex-direction: column;
  margin: 0.1em 0 0 0;
  padding: 0.5em;
  padding-bottom: 0.7em;
  user-select: none;
  box-sizing: border-box;
  border: 1px solid var(--border-color);
  height: 100%;
  overflow-y: scroll;
}

#tag-group-list-content.rounded-bottom-corners {
  border-bottom-left-radius: 6px;
  border-bottom-right-radius: 6px;
}

#tag-group-list-content.rounded-corners {
  border-radius: 6px;
}

#tag-group-list-content.hidden-top-border {
  border-top: 0;
}

.tag-group {
  display: flex;
  flex-direction: row;
  margin: 0.2em;
  padding: 0.1em;
  padding-left: 0.5em;
  min-height: 2em;
  align-items: center;
}

.Cordova .tag-group {
  height: 2.5em;
  padding-top: 0.8em;
}

.tag-group:nth-child(odd) {
  background: var(--background-color-darker);
}

#tag-group-list-content a:link,
#tag-group-list-content a:visited {
  text-decoration: none;
  color: var(--accent-color);
}

#tag-group-list-content a:hover {
  text-decoration: underline;
}

#tag-group-list-content.darkmode--activated a:link,
#tag-group-list-content.darkmode--activated a:visited {
  color: var(--accent-color-darkmode);
}

.item-count {
  color: #808080;
  margin-left: 0.5em;
}

</style>

<div id="tag-group-list-content" class="scrollable" style="display: none;">
</div>
`;

const TAG_GROUP_ALL_TAGS = -1;

/**
 * The TagGroupList is a web component that lists all tag groups.
 * 
 * The respective element is <tag-group-list></tag-group-list>.
 * 
 * The following attributes are supported:
 * - editable: A Boolean attribute that determines whether the list shows edit buttons.
 * - persist: A Boolean attribute that determines whether changes of the list shall be written to the database or not.
 * - activation-event: The event used for populating the list and then showing it.
 * - selection-event: The event that shall be fired when an item is selected.
 * - select-all-event: The event used for quickly navigating to the "All tags" item.
 * - show-tag-count: A Boolean attribute that determines whether the tag count shall be shown behind each tag group.
 * - hide-top-border: A Boolean attribute that determines whether the top border shall be hidden.
 * - rounded-corners: A Boolean attribute that determines whether the borders of the box shall be rounded.
 * - rounded-bottom-corners: A Boolean attribute that determines whether the bottom corners of the box shall be rounded.
 * - book-filter: A boolean attribute that determines whether the tag group list should be filtered based on the current book.
 */
class TagGroupList extends HTMLElement {
  constructor() {
    super();

    this._virtualTagGroups = [
      { id: TAG_GROUP_ALL_TAGS, title: i18n.t('tags.all-tags') }
    ];

    this._editable = false;
    this._subscriptionDone = false;
    this._bookFilter = false;
    this._deleteTagGroupId = null;

    this._tagGroupManager = new TagGroupManager((event) => { this.handleTagGroupClick(event); },
                                                (itemId) => { this.handleTagGroupEdit(itemId); },
                                                (itemId) => { this.handleTagGroupDelete(itemId); },
                                                false,
                                                this._editable,
                                                'tag-group',
                                                this._virtualTagGroups);
  }

  connectedCallback() {
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(template.content.cloneNode(true));

    this.readAttributes();

    this._contentDiv = this.shadowRoot.getElementById('tag-group-list-content');
    platformHelper.addPlatformCssClass(this._contentDiv);
    this._tagGroupManager.setContentDiv(this._contentDiv);

    if (this._editable) {
      this._tagGroupManager.setEditable();
    }

    if (this._showTagCount) {
      this._tagGroupManager.showItemCount();
    }

    this.subscribeEvents();
  }

  subscribeEvents() {
    if (this._subscriptionDone) {
      return;
    }

    this._subscriptionDone = true;

    eventController.subscribe('on-theme-changed', (theme) => {
      if (theme == 'dark') {
        uiHelper.switchToDarkTheme(this.shadowRoot, 'tag-group-list-content');
      } else {
        uiHelper.switchToRegularTheme(this.shadowRoot, 'tag-group-list-content');
      }
    });

    if (this._activationEvent != null) {
      eventController.subscribe(this._activationEvent, async () => {
        const currentBook = this.getCurrentBook();
        let bibleBookId = 0;

        if (this._bookFilter && currentBook != null) {
          this._tagGroupManager.setBookFilter(currentBook);
          const dbBibleBook = await ipcDb.getBibleBook(currentBook);
          bibleBookId = dbBibleBook.id;
        }

        this._virtualTagGroups[0].count = await ipcDb.getTagCount(bibleBookId);
        await this._tagGroupManager.populateItemList();
        this.showTagGroupList();
      });
    }

    if (this._persist) {
      eventController.subscribe('on-tag-group-creation', async (tagGroupTitle) => {
        let tagGroup = await this.createTagGroupInDb(tagGroupTitle);
        eventController.publishAsync('on-tag-group-created', tagGroup);
      });

      // Subscribe to the on-enter-pressed event to handle enter key press while the dialog is open
      eventController.subscribe('on-enter-pressed', () => {
        if ($('#delete-tag-group-confirmation-dialog').dialog('isOpen') &&
            this._deleteTagGroupId != null) {

          this.deleteTagGroupInDb(this._deleteTagGroupId);

          const $dialogBox = $('#delete-tag-group-confirmation-dialog');
          $dialogBox.dialog('close');
          this._deleteTagGroupId = null;
        }
      });
      
      // Subscribe to the on-esc-pressed event to close the dialog when escape key is pressed
      eventController.subscribe('on-esc-pressed', () => {
        if ($('#delete-tag-group-confirmation-dialog').dialog('isOpen')) {
          const $dialogBox = $('#delete-tag-group-confirmation-dialog');
          $dialogBox.dialog('close');
        }
      });
    }

    eventController.subscribe('on-tag-group-created', async (tagGroup) => {
      if (tagGroup != null) {
        if (tagGroup.count === undefined) {
          tagGroup.count = 0;
        }

        await this._tagGroupManager.addItem(tagGroup);
      }
    });

    eventController.subscribeMultiple(['on-tag-created', 'on-tag-deleted'], async () => {
      const currentBook = this.getCurrentBook();
      await this.updateTagCountAndRefreshList(currentBook);
    });

    eventController.subscribe(this._selectAllEvent, async() => {
      await this.selectTagGroup(TAG_GROUP_ALL_TAGS);
    });

    if (this._bookFilter) {
      eventController.subscribeMultiple(['on-verse-list-init', 'on-tab-selected'], async (tabIndex) => {
        const currentBook = this.getCurrentBook(tabIndex);

        if (currentBook != null) {
          let tagGroupUsedInBook = true;

          if (tag_assignment_panel.tagGroupUsed()) {
            const currentTagGroupId = tag_assignment_panel.currentTagGroupId;

            const dbBibleBook = await ipcDb.getBibleBook(currentBook);
            const bibleBookId = dbBibleBook.id;
            tagGroupUsedInBook = await ipcDb.isTagGroupUsedInBook(currentTagGroupId, bibleBookId);
          }

          if (tagGroupUsedInBook) {
            this._tagGroupManager.setBookFilter(currentBook);
            await this.updateTagCountAndRefreshList(currentBook);
          } else {
            // Switch back to all tags because the selected tag group is not present in the current book
            await this.selectTagGroup(TAG_GROUP_ALL_TAGS);
          }
        }
      });
    }
  }

  getCurrentBook(tabIndex=undefined) {
    const currentTab = app_controller.tab_controller.getTab(tabIndex);
    const currentBook = currentTab.getBook();
    const currentTextType = currentTab.getTextType();

    if (currentTextType == 'book' && currentBook != null) {
      return currentBook;
    } else {
      return null;
    }
  }

  async updateTagCountAndRefreshList(currentBook) {
    let bibleBookId = 0;

    if (this._bookFilter && currentBook != null) {
      const dbBibleBook = await ipcDb.getBibleBook(currentBook);
      bibleBookId = dbBibleBook.id;
    }

    this._virtualTagGroups[0].count = await ipcDb.getTagCount(bibleBookId);
    await this._tagGroupManager.refreshItemList();
  }

  readAttributes() {
    this._persist = false;
    this._editable = false;
    this._activationEvent = null;
    this._selectionEvent = null;
    this._showTagCount = null;
    this._roundedBottomCorners = null;

    if (this.hasAttribute('editable')) {
      this._editable = this.getAttribute('editable') == 'true';
    }
    
    if (this.hasAttribute('persist')) {
      this._persist = this.getAttribute('persist') == "true";
    }

    if (this.hasAttribute('activation-event')) {
      this._activationEvent = this.getAttribute('activation-event');
    }

    if (this.hasAttribute('selection-event')) {
      this._selectionEvent = this.getAttribute('selection-event');
    }

    if (this.hasAttribute('select-all-event')) {
      this._selectAllEvent = this.getAttribute('select-all-event')
    }

    if (this.hasAttribute('show-tag-count')) {
      this._showTagCount = this.getAttribute('show-tag-count') == "true";
    }

    if (this.hasAttribute('hide-top-border')) {
      if (this.getAttribute('hide-top-border') == 'true') {
        this.getContentDiv().classList.add('hidden-top-border');
      }
    }

    if (this.hasAttribute('rounded-corners')) {
      if (this.getAttribute('rounded-corners') == 'true') {
        this.getContentDiv().classList.add('rounded-corners');
      }
    }

    if (this.hasAttribute('rounded-bottom-corners')) {
      if (this.getAttribute('rounded-bottom-corners') == 'true') {
        this.getContentDiv().classList.add('rounded-bottom-corners');
      }
    }

    if (this.hasAttribute('book-filter')) {
      if (this.getAttribute('book-filter') == 'true') {
        this._bookFilter = true;
      } else {
        this._bookFilter = false;
      }
    }
  }

  async createTagGroupInDb(tagGroupTitle) {
    tagGroupTitle = tagGroupTitle.trim();

    let result = await ipcDb.createTagGroup(tagGroupTitle);
    if (!result.success) {
      var message = `The tag group <i>${tagGroupTitle}</i> could not be created.<br>
                     An unexpected database error occurred:<br><br>
                     ${result.exception}<br><br>
                     Please restart the app.`;

      await showDialog('Database Error', message);
      return null;
    }

    let newId = result.dbObject.id;

    let tagGroup = {
      title: tagGroupTitle,
      id: newId
    };

    return tagGroup;
  }

  async handleTagGroupClick(event) {
    const tagGroupId = parseInt(event.target.getAttribute('item-id'));
    await this.selectTagGroup(tagGroupId);
  }

  async selectTagGroup(tagGroupId) {
    if (tagGroupId == null) {
      return;
    }

    const tagGroup = await this._tagGroupManager.getItemById(tagGroupId);
    this.hideTagGroupList();

    if (this._selectionEvent != null) {
      eventController.publishAsync(this._selectionEvent, tagGroup);
    }
  }

  async handleTagGroupEdit(itemId) {
    const dialogBoxTemplate = html`
    <div id="rename-tag-group-dialog" style="padding-top: 2em;">
      <span id="rename-tag-group-title-label" i18n="general.title"></span>:
      <input id="rename-tag-group-title-input" type="text" maxlength="255" style="width: 25em;" />
      <emoji-button-trigger></emoji-button-trigger>
    </div>
    `;

    const tagGroup = await this._tagGroupManager.getItemById(itemId);

    return new Promise((resolve) => {
      document.querySelector('#boxes').appendChild(dialogBoxTemplate.content);
      const $dialogBox = $('#rename-tag-group-dialog');
      $dialogBox.localize();
      
      var width = 400;
      var height = 200;
      var position = [55, 120];
      var draggable = true;

      let dialogOptions = uiHelper.getDialogOptions(width, height, draggable, position);
      dialogOptions.title = i18n.t('tags.rename-tag-group');
      dialogOptions.buttons = {};
      dialogOptions.dialogClass = 'ezra-dialog rename-tag-group-dialog';

      dialogOptions.buttons[i18n.t('general.cancel')] = function() {
        $(this).dialog('close');
      };

      dialogOptions.buttons[i18n.t('general.save')] = {
        text: i18n.t('general.save'),
        id: 'edit-tag-group-save-button',
        click: () => {
          this.renameTagGroupAndCloseDialog(itemId, $dialogBox);
        }
      };

      dialogOptions.close = () => {
        $dialogBox.dialog('destroy');
        $dialogBox.remove();
        resolve();
      };

      document.getElementById('rename-tag-group-title-input').value = tagGroup.title;
      
      document.getElementById('rename-tag-group-title-input').addEventListener('keyup', async (event) => {
        await tagGroupValidator.validateNewTagGroupTitle('rename-tag-group-title-input', 'edit-tag-group-save-button');

        if (event.key == 'Enter') {
          if (!$('#edit-tag-group-save-button').hasClass('ui-state-disabled')) {
            this.renameTagGroupAndCloseDialog(itemId, $dialogBox);
          }
        }
      });
    
      $dialogBox.dialog(dialogOptions);
      uiHelper.fixDialogCloseIconOnAndroid('rename-tag-group-dialog');

      tagGroupValidator.validateNewTagGroupTitle('rename-tag-group-title-input', 'edit-tag-group-save-button');

      document.getElementById('rename-tag-group-title-input').focus();
    });
  }

  renameTagGroupAndCloseDialog(itemId, $dialogBox) {
    const newTagGroupTitle = document.getElementById('rename-tag-group-title-input').value;
    this.renameTagGroupInDb(itemId, newTagGroupTitle);
    $dialogBox.dialog('close');
  }

  async renameTagGroupInDb(tagGroupId, newTitle) {
    newTitle = newTitle.trim();

    var result = await ipcDb.updateTagGroup(tagGroupId, newTitle);

    if (result.success == false) {
      var message = `The tag group <i>${newTitle}</i> could not be updated.<br>
                     An unexpected database error occurred:<br><br>
                     ${result.exception}<br><br>
                     Please restart the app.`;

      await showDialog('Database Error', message);
      return;
    } else {
      await eventController.publishAsync('on-tag-group-renamed', tagGroupId);
    }
  }

  async handleTagGroupDelete(tagGroupId) {
    const tagGroup = await this._tagGroupManager.getItemById(tagGroupId);
    const message = i18n.t('tags.really-delete-tag-group', { tagGroupTitle: tagGroup.title, interpolation: {escapeValue: false} });

    this._deleteTagGroupId = tagGroupId;

    const dialogBoxTemplate = html`
    <div id="delete-tag-group-confirmation-dialog" style="padding-top: 2em;">
    ${message}
    </div>
    `;

    return new Promise((resolve) => {
      document.querySelector('#boxes').appendChild(dialogBoxTemplate.content);
      const $dialogBox = $('#delete-tag-group-confirmation-dialog');
      $dialogBox.localize();
      
      var width = 400;
      var height = 200;
      var position = [55, 120];
      var draggable = true;

      let dialogOptions = uiHelper.getDialogOptions(width, height, draggable, position);
      dialogOptions.title = i18n.t('tags.delete-tag-group');
      dialogOptions.dialogClass = 'ezra-dialog delete-tag-group-confirmation-dialog';
      dialogOptions.buttons = {};

      dialogOptions.buttons[i18n.t('general.cancel')] = function() {
        $(this).dialog('close');
      };

      dialogOptions.buttons[i18n.t('tags.delete-tag-group')] = {
        id: 'delete-tag-group-button',
        text: i18n.t('tags.delete-tag-group'),
        click: () => {
          this.deleteTagGroupInDb(tagGroupId);
          $dialogBox.dialog('close');
        }
      };

      dialogOptions.close = () => {
        $dialogBox.dialog('destroy');
        $dialogBox.remove();
        resolve();
      };

      $dialogBox.dialog(dialogOptions);
      uiHelper.fixDialogCloseIconOnAndroid('delete-tag-group-confirmation-dialog');
    });
  }

  async deleteTagGroupInDb(tagGroupId) {
    var result = ipcDb.deleteTagGroup(tagGroupId);

    if (result.success == false) {
      const tagGroup = await this._tagGroupManager.getItemById(tagGroupId);

      var message = `The tag group <i>${tagGroup.title}</i> could not be deleted.<br>
                     An unexpected database error occurred:<br><br>
                     ${result.exception}<br><br>
                     Please restart the app.`;

      await showDialog('Database Error', message);
      return;
    } else {
      await eventController.publishAsync('on-tag-group-deleted', tagGroupId);
    }
  }

  showTagGroupList() {
    this.getContentDiv().style.display = '';
  }

  hideTagGroupList() {
    this.getContentDiv().style.display = 'none';
  }

  getContentDiv() {
    return this.shadowRoot.getElementById('tag-group-list-content');
  }

  get tagGroupManager() {
    return this._tagGroupManager;
  }
}

customElements.define('tag-group-list', TagGroupList);
module.exports = TagGroupList;