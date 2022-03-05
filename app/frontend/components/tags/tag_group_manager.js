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

class TagGroupManager {
  constructor(contentDivId, onClickHandler, selectable=false, cssClass, virtualTagGroups=[]) {
    this._tagGroups = null;
    this._contentDivId = contentDivId;
    this._onClickHandler = onClickHandler;
    this._selectable = selectable;
    this._cssClass = cssClass;
    this._virtualTagGroups = virtualTagGroups;
  }

  async getTagGroups() {
    if (this._tagGroups == null) {
      let dbTagGroups = await ipcDb.getAllTagGroups();
      this._tagGroups = this._virtualTagGroups;
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

  async addTagGroup(tagGroup) {
    this._tagGroups.push(tagGroup);
    this.addTagGroupElement(tagGroup);
  }

  addTagGroupElement(tagGroup) {
    if (this._contentDiv == null) {
      this._contentDiv = this.getContentDiv();
    }

    let tagGroupElement = document.createElement('div');
    tagGroupElement.setAttribute('class', this._cssClass);

    let tagGroupIcon = null;

    if (this._selectable) {
      tagGroupIcon = document.createElement('i');
      tagGroupIcon.setAttribute('class', 'fas fa-tag tag-button button-small');
      tagGroupIcon.addEventListener('click', (event) => {
        this.toggleSelection(event);
        this._onClickHandler(event);
      });
    }

    let tagGroupLink = document.createElement('a');
    tagGroupLink.setAttribute('href', '');
    tagGroupLink.setAttribute('tag-group-id', tagGroup.id);
    tagGroupLink.innerText = tagGroup.title;
    tagGroupLink.addEventListener('click', (event) => {
      event.preventDefault();

      if (this._selectable) {
        this.toggleSelection(event);
      }
      this._onClickHandler(event);
    });

    if (this._selectable) {
      tagGroupElement.appendChild(tagGroupIcon);
    }

    tagGroupElement.appendChild(tagGroupLink);
    this._contentDiv.appendChild(tagGroupElement);
  }

  toggleSelection(event) {
    let tagButton = event.target.closest('.' + this._cssClass).querySelector('.tag-button');
    let link = event.target.closest('.' + this._cssClass).querySelector('a');
    
    if (link.classList.contains('active')) {
      if (tagButton != null) {
        tagButton.classList.remove('active');
      }

      link.classList.remove('active');
    } else {
      if (tagButton != null) {
        tagButton.classList.add('active');
      }

      link.classList.add('active');
    }
  }

  getContentDiv() {
    return document.getElementById(this._contentDivId);
  }
}

module.exports = TagGroupManager;