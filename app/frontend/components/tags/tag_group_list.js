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
  }

  async getTagGroups() {
    if (this._tagGroups == null) {
      this._tagGroups = [
        { title: 'All tags', id: '1'},
        { title: 'Sermons', id: '2' },
        { title: 'Book-related Studies', id: '3' }
      ];
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
      this.addTagGroup(tagGroup);
    });

    this.populated = true;
  }

  addTagGroup(tagGroup) {
    if (this._contentDiv == null) {
      this._contentDiv = this.getContentDiv();
    }

    let tagGroupLink = document.createElement('a');
    tagGroupLink.setAttribute('href', '');
    tagGroupLink.setAttribute('tagGroupId', tagGroup.id);
    tagGroupLink.innerText = tagGroup.title;
    tagGroupLink.addEventListener('click', (event) => {
      event.preventDefault();
      this.handleTagGroupClick(event);
    });

    this._contentDiv.appendChild(tagGroupLink);
  }

  async handleTagGroupClick(event) {
    const tagGroupId = parseInt(event.target.getAttribute('tagGroupId'));
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