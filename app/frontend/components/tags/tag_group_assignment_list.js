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

const { html } = require('../../helpers/ezra_helper.js');
const eventController = require('../../controllers/event_controller.js');
const TagGroupManager = require('./tag_group_manager.js');

const template = html`
<style>
#tag-group-assignment-list-content {
  display: flex;
  flex-direction: column;
  margin: 0.1em 0 0 0;
  padding: 0.5em;
  padding-top: 0.7em;
  padding-bottom: 0.7em;
  user-select: none;
  box-sizing: border-box;
  border: 1px solid #dddddd;
  height: 11em;
  overflow-y: scroll;
  background-color: white;
}

.assignment-tag-group {
  display: flex;
  flex-direction: row;
  margin: 0.2em;
  padding: 0.3em;
}

.assignment-tag-group:nth-child(odd) {
  background: var(--background-color-darker);
}

#tag-group-assignment-list-content a.active {
  font-weight: bold;
}

#tag-group-assignment-list-content a:link,
#tag-group-assignment-list-content a:visited {
  text-decoration: none;
  color: var(--text-color);
}

.darkmode--activated #tag-group-assignment-list {
  border: 1px solid #555555;
}

</style>

<div id="tag-group-assignment-list-content" class="scrollable">
</div>
`;

class TagGroupAssignmentList extends HTMLElement {
  constructor() {
    super();

    this._tagGroupManager = new TagGroupManager((event) => { this.handleTagGroupClick(event); },
                                                null,
                                                null,
                                                true,
                                                false,
                                                'assignment-tag-group');
  }

  connectedCallback() {  
    this.appendChild(template.content);

    this._contentDiv = document.getElementById('tag-group-assignment-list-content');
    this._tagGroupManager.setContentDiv(this._contentDiv);

    eventController.subscribe('on-tag-group-created', async (tagGroup) => {
      await this._tagGroupManager.addItem(tagGroup);
    });

    (async () => {
      await this._tagGroupManager.populateItemList();
    })();

    if (this.getAttribute('onChange') != null) {
      this._onChangeHandler = this.getAttribute('onChange');
    }
  }

  set tagid(value) {
    this._tagGroupManager._removeList = [];
    this._tagGroupManager._addList = [];

    this.setTagId(parseInt(value));
  }

  async setTagId(tagId) {
    let tag = await tags_controller.tag_store.getTag(tagId);
    let allItemElements = this._tagGroupManager.getAllItemElements();

    allItemElements.forEach((itemElement) => {
      this._tagGroupManager.disableItemElement(itemElement);

      if (tag.tagGroupList != null) {
        tag.tagGroupList.forEach((tagGroupId) => {
          this._tagGroupManager.enableElementById(itemElement, tagGroupId);
        });
      }
    });
  }

  set onChange(value) {
    this._onChangeHandler = value;
  }

  // eslint-disable-next-line no-unused-vars
  handleTagGroupClick(event) {
    if (this._onChangeHandler != null) {
      this._onChangeHandler();
    }
  }

  get removeList() {
    return this._tagGroupManager._removeList;
  }

  get addList() {
    return this._tagGroupManager._addList;
  }

  get isChanged() {
    return this._tagGroupManager._removeList.length != 0 || this._tagGroupManager._addList.length != 0;
  }
}

customElements.define('tag-group-assignment-list', TagGroupAssignmentList);
module.exports = TagGroupAssignmentList;