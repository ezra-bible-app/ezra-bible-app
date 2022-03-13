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
<style>
#tag-group-list-content {
  display: flex;
  flex-direction: column;
  margin: 0.1em 0 0 0;
  padding: 0.5em;
  padding-bottom: 0.7em;
  user-select: none;
  box-sizing: border-box;
  border: 1px solid #dddddd;
  height: calc(100% - 5.5em);
  overflow-y: scroll;
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

.darkmode--activated #tag-group-list {
  border: 1px solid #555555;
}

</style>

<div id="tag-group-list-content" class="scrollable" style="display: none;">
</div>
`;
   
class TagGroupList extends HTMLElement {
  constructor() {
    super();

    let virtualTagGroups = [
      { id: -1, title: 'All tags' }
    ];

    this.tagGroupManager = new TagGroupManager('tag-group-list-content',
                                               (event) => { this.handleTagGroupClick(event); },
                                               (event) => { this.handleTagGroupEdit(event); },
                                               (event) => { this.handleTagGroupDelete(event); },
                                               false,
                                               true,
                                               'tag-group',
                                               virtualTagGroups);
  }

  connectedCallback() {  
    this.appendChild(template.content);

    eventController.subscribe('on-tag-group-list-activated', async () => {
      await this.tagGroupManager.populateItemList();
      this.showTagGroupList();
    });

    eventController.subscribe('on-tag-group-creation', async (tagGroupTitle) => {
      let tagGroup = await this.createTagGroupInDb(tagGroupTitle);
      await this.tagGroupManager.addItem(tagGroup);
      eventController.publishAsync('on-tag-group-created', tagGroup);
    });
  }

  async createTagGroupInDb(tagGroupTitle) {
    let result = await ipcDb.createTagGroup(tagGroupTitle);
    if (!result.success) {
      // FIXME: Add error handling
      return;
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
    const tagGroup = await this.tagGroupManager.getItemById(tagGroupId);

    this.hideTagGroupList();
    eventController.publishAsync('on-tag-group-selected', tagGroup);
  }

  async handleTagGroupEdit(itemId) {
    const dialogBoxTemplate = html`
    <div id="rename-tag-group-dialog" style="padding-top: 2em;">
      <span id="rename-tag-group-title-label" i18n="tags.title"></span>:
      <input id="rename-tag-group-title-input" type="text" maxlength="255" style="width: 25em;" />
      <emoji-button-trigger></emoji-button-trigger>
    </div>
    `;

    const tagGroup = await this.tagGroupManager.getItemById(itemId);

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
        this.renameTagGroup(itemId, newTagGroupTitle);
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

  async renameTagGroup(tagGroupId, newTitle) {
    var result = await ipcDb.updateTagGroup(tagGroupId, newTitle);

    if (result.success == false) {
      var message = `The tag group <i>${tagGroupId}</i> could not be updated.<br>
                     An unexpected database error occurred:<br><br>
                     ${result.exception}<br><br>
                     Please restart the app.`;

      await showErrorDialog('Database Error', message);
      return;
    } else {
      await this.tagGroupManager.populateItemList(true); 
    }
  }

  async handleTagGroupDelete(itemId) {
    console.log("Delete tag group " + itemId);
  }

  showTagGroupList() {
    this.getContentDiv().style.display = '';
  }

  hideTagGroupList() {
    this.getContentDiv().style.display = 'none';
  }

  getContentDiv() {
    return document.getElementById('tag-group-list-content');
  }
}

customElements.define('tag-group-list', TagGroupList);
module.exports = TagGroupList;