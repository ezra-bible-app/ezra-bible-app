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

const { html } = require('../../helpers/ezra_helper.js');
const eventController = require('../../controllers/event_controller.js');
const TagGroupManager = require('./tag_group_manager.js');

const template = html`

<!-- FONT AWESOME STYLES -->
<link rel="preload" href="node_modules/@fortawesome/fontawesome-free/webfonts/fa-solid-900.woff2" as="font" type="font/woff2">
<link href="node_modules/@fortawesome/fontawesome-free/css/solid.min.css" rel="stylesheet" type="text/css" />
<link href="node_modules/@fortawesome/fontawesome-free/css/fontawesome.min.css" rel="stylesheet" type="text/css" />

<link href="css/main.css" media="screen" rel="stylesheet" type="text/css" />
<link href="css/tool_panel.css" media="screen" rel="stylesheet" type="text/css" />
<link href="css/mobile.css" media="screen" rel="stylesheet" type="text/css" />

<style>
:host {
  display: block;
  height: 95%;
}

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
  border-radius: 4px;
  height: 100%;
  overflow-y: scroll;
  background-color: var(--background-color);
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

/**
 * The TagGroupAssignmentList is a web component that lists tag groups for the purpose of selecting them in the context of a higher-level editor.
 * The respective element is <tag-group-assignment-list></tag-group-assignment-list>.
 * 
 * A on change handler can be assigned via the onChange attribute.
 */
class TagGroupAssignmentList extends HTMLElement {
  constructor() {
    super();

    this._tagGroupManager = new TagGroupManager((event) => { this.handleTagGroupClick(event); },
                                                null,
                                                null,
                                                true,
                                                false,
                                                'assignment-tag-group');

    eventController.subscribe('on-tag-group-created', async (tagGroup) => {
      await this._tagGroupManager.addItem(tagGroup);
    });
  }

  connectedCallback() {  
    if (!this.shadowRoot) {
      const shadow = this.attachShadow({ mode: 'open' });
      shadow.appendChild(template.content.cloneNode(true));
    }

    this._contentDiv = this.shadowRoot.getElementById('tag-group-assignment-list-content');
    platformHelper.addPlatformCssClass(this._contentDiv);
    this._tagGroupManager.setContentDiv(this._contentDiv);

    // cordova-plugin-ionic-keyboard event binding
    // eslint-disable-next-line no-unused-vars
    window.addEventListener('keyboardDidShow', (event) => {
      this._contentDiv.classList.add('keyboard-shown');
    });

    // cordova-plugin-ionic-keyboard event binding
    // eslint-disable-next-line no-unused-vars
    window.addEventListener('keyboardDidHide', (event) => {
      this._contentDiv.classList.remove('keyboard-shown');
    });

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
    let tag = await tag_assignment_panel.tag_store.getTag(tagId);
    let allItemElements = this._tagGroupManager.getAllItemElements();

    allItemElements.forEach((itemElement) => {
      this._tagGroupManager.disableItemElement(itemElement);

      if (tag.tagGroupList != null) {
        tag.tagGroupList.forEach((tagGroupId) => {
          this._tagGroupManager.enableElementIfIdMatches(itemElement, tagGroupId);
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

  get tagGroupManager() {
    return this._tagGroupManager;
  }
}

customElements.define('tag-group-assignment-list', TagGroupAssignmentList);
module.exports = TagGroupAssignmentList;