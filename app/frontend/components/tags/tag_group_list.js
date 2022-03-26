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

const { html, showErrorDialog } = require('../../helpers/ezra_helper.js');
const eventController = require('../../controllers/event_controller.js');
const TagGroupManager = require('./tag_group_manager.js');

const template = html`

<!-- FONT AWESOME STYLES -->
<link rel="preload" href="node_modules/@fortawesome/fontawesome-free/webfonts/fa-solid-900.woff2" as="font" type="font/woff2">
<link href="node_modules/@fortawesome/fontawesome-free/css/solid.min.css" rel="stylesheet" type="text/css" />
<link href="node_modules/@fortawesome/fontawesome-free/css/fontawesome.min.css" rel="stylesheet" type="text/css" />

<link href="css/main.css" media="screen" rel="stylesheet" type="text/css" />
<link href="css/tool_panel.css" media="screen" rel="stylesheet" type="text/css" />

<style>
:host {
  display: block;
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

.darkmode--activated #tag-group-list-content a:link,
.darkmode--activated #tag-group-list-content a:visited {
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
   
class TagGroupList extends HTMLElement {
  constructor() {
    super();

    let virtualTagGroups = [
      { id: -1, title: i18n.t('tags.all-tags') }
    ];

    this._editable = false;

    this._tagGroupManager = new TagGroupManager((event) => { this.handleTagGroupClick(event); },
                                                (itemId) => { this.handleTagGroupEdit(itemId); },
                                                (itemId) => { this.handleTagGroupDelete(itemId); },
                                                false,
                                                this._editable,
                                                'tag-group',
                                                virtualTagGroups);
  }

  connectedCallback() {
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(template.content.cloneNode(true));

    this.readAttributes();

    this._contentDiv = this.shadowRoot.getElementById('tag-group-list-content');
    this._tagGroupManager.setContentDiv(this._contentDiv);

    if (this._editable) {
      this._tagGroupManager.setEditable();
    }

    if (this._showTagCount) {
      this._tagGroupManager.showItemCount();
    }
  
    if (this._activationEvent != null) {
      eventController.subscribe(this._activationEvent, async () => {
        await this._tagGroupManager.populateItemList();
        this.showTagGroupList();
      });
    }

    if (this._persist) {
      eventController.subscribe('on-tag-group-creation', async (tagGroupTitle) => {
        let tagGroup = await this.createTagGroupInDb(tagGroupTitle);
        eventController.publishAsync('on-tag-group-created', tagGroup);
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
  }

  async createTagGroupInDb(tagGroupTitle) {
    let result = await ipcDb.createTagGroup(tagGroupTitle);
    if (!result.success) {
      var message = `The tag group <i>${tagGroupTitle}</i> could not be created.<br>
                     An unexpected database error occurred:<br><br>
                     ${result.exception}<br><br>
                     Please restart the app.`;

      await showErrorDialog('Database Error', message);
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
    const tagGroup = await this._tagGroupManager.getItemById(tagGroupId);

    this.hideTagGroupList();

    if (this._selectionEvent != null) {
      eventController.publishAsync(this._selectionEvent, tagGroup);
    }
  }

  async handleTagGroupEdit(itemId) {
    const dialogBoxTemplate = html`
    <div id="rename-tag-group-dialog" style="padding-top: 2em;">
      <span id="rename-tag-group-title-label" i18n="tags.title"></span>:
      <input id="rename-tag-group-title-input" type="text" maxlength="255" style="width: 25em;" />
      <emoji-button-trigger></emoji-button-trigger>
    </div>
    `;

    const tagGroup = await this._tagGroupManager.getItemById(itemId);

    return new Promise((resolve) => {
      document.querySelector('#boxes').appendChild(dialogBoxTemplate.content);
      const $dialogBox = $('#rename-tag-group-dialog');
      $dialogBox.localize();
      
      const width = 400;
      const height = 200;

      var buttons = {};
      buttons[i18n.t('general.cancel')] = function() {
        $(this).dialog('close');
      };
      buttons[i18n.t('general.save')] = () => {
        const newTagGroupTitle = document.getElementById('rename-tag-group-title-input').value;
        this.renameTagGroupInDb(itemId, newTagGroupTitle);
        $dialogBox.dialog('close');
      };

      const title = i18n.t('tags.rename-tag-group');
      document.getElementById('rename-tag-group-title-input').value = tagGroup.title;
    
      $dialogBox.dialog({
        width,
        height,
        position: [60,180],
        title: title,
        resizable: false,
        dialogClass: 'ezra-dialog',
        buttons: buttons,
        close() {
          $dialogBox.dialog('destroy');
          $dialogBox.remove();
          resolve();
        }
      });
    });
  }

  async renameTagGroupInDb(tagGroupId, newTitle) {
    var result = await ipcDb.updateTagGroup(tagGroupId, newTitle);

    if (result.success == false) {
      var message = `The tag group <i>${newTitle}</i> could not be updated.<br>
                     An unexpected database error occurred:<br><br>
                     ${result.exception}<br><br>
                     Please restart the app.`;

      await showErrorDialog('Database Error', message);
      return;
    } else {
      await eventController.publishAsync('on-tag-group-renamed', tagGroupId);
    }
  }

  async handleTagGroupDelete(tagGroupId) {
    const tagGroup = await this._tagGroupManager.getItemById(tagGroupId);
    const message = i18n.t('tags.really-delete-tag-group', { tagGroupTitle: tagGroup.title, interpolation: {escapeValue: false} });

    const dialogBoxTemplate = html`
    <div id="delete-tag-group-confirmation-dialog" style="padding-top: 2em;">
    ${message}
    </div>
    `;

    return new Promise((resolve) => {
      document.querySelector('#boxes').appendChild(dialogBoxTemplate.content);
      const $dialogBox = $('#delete-tag-group-confirmation-dialog');
      $dialogBox.localize();
      
      const width = 400;
      const height = 200;

      var buttons = {};
      buttons[i18n.t('general.cancel')] = function() {
        $(this).dialog('close');
      };
      buttons[i18n.t('tags.delete-tag-group')] = () => {
        this.deleteTagGroupInDb(tagGroupId);
        $dialogBox.dialog('close');
      };

      const title = i18n.t('tags.delete-tag-group');
    
      $dialogBox.dialog({
        width,
        height,
        position: [60,180],
        title: title,
        resizable: false,
        dialogClass: 'ezra-dialog',
        buttons: buttons,
        close() {
          $dialogBox.dialog('destroy');
          $dialogBox.remove();
          resolve();
        }
      });
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

      await showErrorDialog('Database Error', message);
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