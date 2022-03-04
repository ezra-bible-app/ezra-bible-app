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
#tag-group-selection {
  margin: 0.1em 0 0 0;
  padding: 0.5em;
  padding-top: 0.7em;
  padding-bottom: 0.7em;
  user-select: none;
  box-sizing: border-box;
  border: 1px solid #dddddd;
}

.darkmode--activated #tag-group-selection {
  border: 1px solid #555555;
}

#tag-group-selection a:link,
#tag-group-selection a:visited {
  text-decoration: none;
  color: var(--accent-color);
}

.darkmode--activated #tag-group-selection a:link,
.darkmode--activated #tag-group-selection a:visited {
  color: var(--accent-color-darkmode);
}

#tag-group-selection a:hover {
  text-decoration: underline;
}

#tag-group-list-link.list-tag-groups:link,
#tag-group-list-link.list-tag-groups:visited,
#tag-group-list-link.list-tag-groups:hover {
  color: black;
  text-decoration: none;
  cursor: default;
}

#add-tag-group-button {
  float: right;
  padding: 0.2em;
  display: none;
}

</style>

<div id="tag-group-selection">
  <a id="tag-group-list-link" href="">Tag groups</a> <span id="tag-group-nav-arrow">&rarr;</span> <span id="tag-group-label">All tags</span>

  <button id="add-tag-group-button" i18n="tags.add-tag-group" class="fg-button ui-state-default ui-corner-all"></button>
</div>
`;

class TagGroupSelection extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {  
    this.appendChild(template.content);

    this.getTagGroupListLink().addEventListener('click', (event) => {
      event.preventDefault();
      this.onTagGroupListLinkClicked();
    });

    this.getAddTagGroupButton().addEventListener('click', () => {
      this.onAddTagGroupButtonClicked();
    });

    eventController.subscribe('on-tag-group-selected', (tagGroup) => {
      this.selectTagGroup(tagGroup);
    });

    eventController.subscribe('on-locale-changed', async () => {
      this.localize();
    });
  }

  localize() {
    $('#tag-group-selection').localize();
  }

  onTagGroupListLinkClicked() {
    this.hideTagGroupDisplay();
    this.getTagGroupListLink().classList.add('list-tag-groups');
    this.showAddTagGroupButton();
    eventController.publishAsync('on-tag-group-list-activated');
  }

  async onAddTagGroupButtonClicked() {
    const addTagGroupTitle = i18n.t('tags.title');

    const dialogBoxTemplate = html`
    <div id="add-tag-group-dialog" style="padding-top: 2em;">
      <label id="add-tag-group-title">${addTagGroupTitle}:</label>
      <input type="text" label="" style="width: 15em;"/>
    </div>
    `;

    return new Promise((resolve) => {

      document.querySelector('#boxes').appendChild(dialogBoxTemplate.content);
      const $dialogBox = $('#add-tag-group-dialog');
      
      const width = 300;
      const height = 200;

      var buttons = {};
      buttons[i18n.t('general.cancel')] = function() {
        $(this).dialog('close');
      };
      buttons[i18n.t('tags.create-tag-group')] = function() {
        $(this).dialog('close');
      };

      const title = i18n.t('tags.add-tag-group');
   
      $dialogBox.dialog({
        width,
        height,
        position: [80, 120],
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

  selectTagGroup(tagGroup) {
    if (tagGroup != null) {
      this.getTagGroupListLink().classList.remove('list-tag-groups');
      this.getTagGroupLabel().innerText = tagGroup.title;
      this.showTagGroupDisplay();
      this.hideAddTagGroupButton();
    } else {
      console.warn("TagGroupSelection.selectTagGroup / Received null");
    }
  }

  hideTagGroupDisplay() {
    this.getTagGroupNavArrow().style.display = 'none';
    this.getTagGroupLabel().style.display = 'none';
  }

  showTagGroupDisplay() {
    this.getTagGroupNavArrow().style.display = '';
    this.getTagGroupLabel().style.display = '';
  }

  showAddTagGroupButton() {
    this.getAddTagGroupButton().style.display = 'block';
  }

  hideAddTagGroupButton() {
    this.getAddTagGroupButton().style.display = 'none';
  }

  getTagGroupListLink() {
    return document.getElementById('tag-group-list-link');
  }

  getTagGroupLabel() {
    return document.getElementById('tag-group-label');
  }

  getTagGroupNavArrow() {
    return document.getElementById('tag-group-nav-arrow');
  }

  getAddTagGroupButton() {
    return document.getElementById('add-tag-group-button');
  }
}

customElements.define('tag-group-selection', TagGroupSelection);
module.exports = TagGroupSelection;