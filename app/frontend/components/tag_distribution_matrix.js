/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2022 Ezra Bible App Development Team <contact@ezrabibleapp.net>

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

const { html, getPlatform } = require('../helpers/ezra_helper.js');
const verseListController = require('../controllers/verse_list_controller.js');
const eventController = require('../controllers/event_controller.js');
const UiHelper = require('../helpers/ui_helper.js');

const template = html`

<!-- JQUERY STYLES -->
<link id="theme-css" href="css/jquery-ui/cupertino/jquery-ui.css" media="screen" rel="stylesheet" type="text/css" />

<style>
  table {
    table-layout: fixed;
  }

  td {
    text-align: right;
  }

  table, th, td {
    border: 1px solid gray;
    padding: 0.3em;
    width: 3.5em;
  }

  #matrix-tbody tr:nth-child(odd) {
    background-color: var(--background-color-darker)
  }

  td.tag-title {
    text-align: left;
    width: 15em;
  }

  #header-row th {
    transform: rotate(315deg);
    font-size: 80%;
    font-weight: normal;
    height: 5em;
    padding: 0;
  }
</style>

<div id="tag-distribution-matrix" style="margin-bottom: 1em;">
  <div id="table-wrapper">
    <table style="margin-left: 1em; margin-top: 1em; margin-bottom: 1em; border-spacing: 0; border-collapse: collapse;">
      <thead>
        <tr id="header-row">
        </tr>
      </thead>
      <tbody id="matrix-tbody">
      </tbody>
    </table>
  </div>

  <button id="copy-table-to-clipboard"
          class="fg-button ui-corner-all ui-state-default"
          style="margin-left: 1em; display: none;"
          i18n="bible-browser.copy-table-to-clipboard"></button>
</div>
`;

class TagDistributionMatrix extends HTMLElement {
  constructor() {
    super();

    this._uiHelper = new UiHelper();

    this._input = null;
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.localize();

    eventController.subscribe('on-locale-changed', () => {
      this.localize();
    });
  }

  localize() {
    let mainElement = this.shadowRoot.getElementById('tag-distribution-matrix');
    $(mainElement).localize();
  }

  connectedCallback() {
    this.shadowRoot.getElementById('copy-table-to-clipboard').addEventListener('click', () => {
      const tableWrapper = this.shadowRoot.getElementById('table-wrapper');
      const tableHtml = tableWrapper.innerHTML;
      const platform = getPlatform();
      platform.copyHtmlToClipboard(tableHtml);

      // eslint-disable-next-line no-undef
      iziToast.success({
        message: i18n.t('bible-browser.copy-table-to-clipboard-success'),
        position: 'bottomRight',
        timeout: 3000
      });
    });

    eventController.subscribe('on-theme-changed', (theme) => {
      if (theme == 'dark') {
        this._uiHelper.switchToDarkTheme(this.shadowRoot, 'tag-distribution-matrix');
      } else {
        this._uiHelper.switchToRegularTheme(this.shadowRoot, 'tag-distribution-matrix');
      }
    });
  }

  set input(value) {
    this._input = value;

    if (this._input == '') {
      this.reset();
    } else {
      this.refresh();
    }
  }

  reset() {
    let headerRow = this.shadowRoot.getElementById('header-row');
    headerRow.innerHTML = '';

    const matrixTBody = this.shadowRoot.getElementById('matrix-tbody');
    matrixTBody.innerHTML = '';

    this.shadowRoot.getElementById('copy-table-to-clipboard').style.display = 'none';
  }

  async refresh(tabIndex=undefined) {
    const tagIdList = app_controller.tab_controller.getTab(tabIndex).getTagIdList().split(',');
    const bibleBookStats = verseListController.getBibleBookStatsFromVerseList(tabIndex);
    const actualBooks = Object.keys(bibleBookStats);

    let headerRow = this.shadowRoot.getElementById('header-row');
    headerRow.innerHTML = '';
    let firstHeader = document.createElement('th');
    firstHeader.style.width = '15em';
    headerRow.appendChild(firstHeader);
    
    actualBooks.forEach((book) => {
      let bookHeader = document.createElement('th');
      bookHeader.innerText = book;
      headerRow.appendChild(bookHeader);
    });

    const matrixTBody = this.shadowRoot.getElementById('matrix-tbody');
    matrixTBody.innerHTML = '';

    for (let i = 0; i < tagIdList.length; i++) {
      let tagId = tagIdList[i];

      let currentTagRow = document.createElement('tr');
      let currentTag = await tags_controller.tag_store.getTag(tagId);
      let tagTitleCell = document.createElement('td');
      tagTitleCell.classList.add('tag-title');
      tagTitleCell.innerText = currentTag.title;
      currentTagRow.appendChild(tagTitleCell);

      let currentTagBookList = this.getTagOccurrencesPerBook(tagId);

      actualBooks.forEach((book) => {
        let bookCell = document.createElement('td');

        if (book in currentTagBookList) {
          bookCell.innerText = currentTagBookList[book];
        }

        currentTagRow.appendChild(bookCell);
      });

      matrixTBody.appendChild(currentTagRow);
    }

    if (platformHelper.isElectron()) {
      this.shadowRoot.getElementById('copy-table-to-clipboard').style.removeProperty('display');
    }
  }

  getTagOccurrencesPerBook(tagId) {
    let tagOccurrences = {};
    let tagElements = $(this._input).find(`.tag[tag-id=${tagId}]`);

    for (let i = 0; i < tagElements.length; i++) {
      let tagElement = $(tagElements[i]);
      let verseBox = tagElement.closest('.verse-box');
      let book = verseBox[0].getAttribute('verse-bible-book-short');

      if (book in tagOccurrences) {
        tagOccurrences[book] += 1;
      } else {
        tagOccurrences[book] = 1;
      }
    }

    return tagOccurrences;
  }
}

customElements.define('tag-distribution-matrix', TagDistributionMatrix);
module.exports = TagDistributionMatrix;
