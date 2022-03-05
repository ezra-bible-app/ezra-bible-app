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

    this.populated = false;
    this._contentDiv = null;

    eventController.subscribe('on-tag-group-created', async (tagGroupTitle) => {
      await this.addTagGroup(tagGroupTitle);
    });
  }

  connectedCallback() {  
    this.appendChild(template.content);

    (async () => {
      await this.populateTagGroupAssignmentList();
    })();
  }

  async getTagGroups() {
    if (this._tagGroups == null) {
      this._tagGroups = await ipcDb.getAllTagGroups();
    }

    return this._tagGroups;
  }

  async getTagGroupById(tagGroupId) {
    const tagGroups = await this.getTagGroups();

    for (let i = 0; i < tagGroups.length; i++) {
      let tagGroup = tagGroups[i];
      if (tagGroup.id == tagGroupId) {
        return tagGroup;
      }
    }
  }

  async populateTagGroupAssignmentList() {
    if (this.populated) {
      return;
    }

    const tagGroups = await this.getTagGroups();

    tagGroups.forEach((tagGroup) => {
      this.addTagGroupElement(tagGroup);
    });

    this.populated = true;
  }

  async addTagGroup(tagGroup) {
    this._tagGroups.push(tagGroup);
    this.addTagGroupElement(tagGroup);
  }

  addTagGroupElement(tagGroup) {
    if (this._contentDiv == null) {
      this._contentDiv = this.getContentDiv();
    }

    let tagGroupElement = document.createElement('div');
    tagGroupElement.setAttribute('class', 'assignment-tag-group');

    let tagGroupIcon = document.createElement('i');
    tagGroupIcon.setAttribute('class', 'fas fa-tag tag-button button-small');

    let tagGroupLink = document.createElement('a');
    tagGroupLink.setAttribute('href', '');
    tagGroupLink.setAttribute('tag-group-id', tagGroup.id);
    tagGroupLink.innerText = tagGroup.title;
    tagGroupLink.addEventListener('click', (event) => {
      event.preventDefault();
      this.handleTagGroupClick(event);
    });

    tagGroupElement.appendChild(tagGroupIcon);
    tagGroupElement.appendChild(tagGroupLink);
    this._contentDiv.appendChild(tagGroupElement);
  }

  getContentDiv() {
    return document.getElementById('tag-group-assignment-list-content');
  }
}

customElements.define('tag-group-assignment-list', TagGroupAssignmentList);
module.exports = TagGroupAssignmentList;