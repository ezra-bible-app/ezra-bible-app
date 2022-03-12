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
const TagManager = require('./tag_manager.js');

const template = html`
<style>
#tag-list-content {
  display: flex;
  flex-direction: column;
  margin: 0.1em 0 0 0;
  padding: 0.5em;
  padding-bottom: 0.7em;
  user-select: none;
  box-sizing: border-box;
  border: 1px solid #dddddd;
  overflow-y: scroll;
  height: 98%;
}

.tag-item {
  display: flex;
  flex-direction: row;
  margin: 0.2em;
  padding: 0.1em;
  padding-left: 0.5em;
  min-height: 2em;
  align-items: center;
  content-visibility: auto;
}

.tag-item * {
  content-visibility: auto;
}

.tag-item:nth-child(odd) {
  background: var(--background-color-darker);
}

#tag-list-content a:link,
#tag-list-content a:visited {
  text-decoration: none;
  color: var(--text-color);
}

#tag-list-content a.active {
  font-weight: bold;
}

.darkmode--activated #tag-list-content a:link,
.darkmode--activated #tag-list-content a:visited {
  color: var(--accent-color-darkmode);
}

.darkmode--activated #tag-list {
  border: 1px solid #555555;
}

</style>

<div id="tag-list-content" class="scrollable">
</div>
`;

class TagList extends HTMLElement {
  constructor() {
    super();

    this._tagManager = new TagManager('tag-list-content',
                                      () => { },
                                      true,
                                      false,
                                      'tag-item');
  }

  connectedCallback() {  
    this.appendChild(template.content);
  }

  get addList() {
    return this._tagManager._addList;
  }

  get isChanged() {
    return this._tagManager._addList.length != 0;
  }

  get tagManager() {
    return this._tagManager;
  }

  getContentDiv() {
    return document.getElementById('tag-list-content');
  }
}

customElements.define('tag-list', TagList);
module.exports = TagList;