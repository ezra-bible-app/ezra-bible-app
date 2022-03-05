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
#tag-group-list-content {
  display: flex;
  flex-direction: column;
  margin: 0.1em 0 0 0;
  padding: 0.5em;
  padding-top: 0.7em;
  padding-bottom: 0.7em;
  user-select: none;
  box-sizing: border-box;
  border: 1px solid #dddddd;
  height: calc(100% - 5.5em);
}

#tag-group-list-content a {
  margin-bottom: 0.5em;
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

<div id="tag-group-list-content" style="display: none;">
</div>
`;
   
class TagGroupList extends HTMLElement {
  constructor() {
    super();

    this.populated = false;
  }

  connectedCallback() {  
    this.appendChild(template.content);

    eventController.subscribe('on-tag-group-list-activated', async () => {
      await this.populateTagGroupList();
      this.showTagGroupList();
    });

    eventController.subscribe('on-tag-group-create', async (tagGroupTitle) => {
      await this.addTagGroup(tagGroupTitle);
    });
  }

  async getTagGroups() {
    if (this._tagGroups == null) {
      let dbTagGroups = await ipcDb.getAllTagGroups();
      this._tagGroups = [
        { id: -1, title: 'All tags' }
      ];

      this._tagGroups = this._tagGroups.concat(dbTagGroups);
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

  async populateTagGroupList() {
    if (this.populated) {
      return;
    }

    const tagGroups = await this.getTagGroups();

    tagGroups.forEach((tagGroup) => {
      this.addTagGroupElement(tagGroup);
    });

    this.populated = true;
  }

  async addTagGroup(tagGroupTitle) {
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

    this._tagGroups.push(tagGroup);
    this.addTagGroupElement(tagGroup);
  }

  addTagGroupElement(tagGroup) {
    if (this._contentDiv == null) {
      this._contentDiv = this.getContentDiv();
    }

    let tagGroupLink = document.createElement('a');
    tagGroupLink.setAttribute('href', '');
    tagGroupLink.setAttribute('tag-group-id', tagGroup.id);
    tagGroupLink.innerText = tagGroup.title;
    tagGroupLink.addEventListener('click', (event) => {
      event.preventDefault();
      this.handleTagGroupClick(event);
    });

    this._contentDiv.appendChild(tagGroupLink);
  }

  async handleTagGroupClick(event) {
    const tagGroupId = parseInt(event.target.getAttribute('tag-group-id'));
    const tagGroup = await this.getTagGroupById(tagGroupId);

    console.log(tagGroup);

    this.hideTagGroupList();
    eventController.publishAsync('on-tag-group-selected', tagGroup);
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