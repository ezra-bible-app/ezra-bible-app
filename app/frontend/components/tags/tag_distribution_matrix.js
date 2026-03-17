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

const { html, getPlatform } = require('../../helpers/ezra_helper.js');
const verseListController = require('../../controllers/verse_list_controller.js');
const eventController = require('../../controllers/event_controller.js');
const UiHelper = require('../../helpers/ui_helper.js');

const template = html`

<!-- JQUERY STYLES -->
<link id="theme-css" href="css/jquery-ui/cupertino/jquery-ui.css" media="screen" rel="stylesheet" type="text/css" />

<style>
  table {
    table-layout: fixed;
    border-collapse: collapse;
  }

  td {
    text-align: right;
  }

  table, th, td {
    border: 1px solid gray;
    padding: 0.3em;
    width: 3.5em;
  }

  td:not(.tag-title) {
    color: black;
    font-weight: bold;
    font-size: 80%;
  }

  td.tag-title {
    text-align: left;
    width: 15em;
  }

  #header-row th {
    transform: rotate(315deg);
    font-size: 80%;
    font-weight: bold;
    height: 5em;
    padding: 0;
  }

  #copy-table-to-clipboard {
    padding: 0.2em;
    padding-left: 0.5em;
    padding-right: 0.5em;
    cursor: pointer;
  }

  /* Mobile styles */
  @media screen and (max-width: 450px), (max-height: 450px) {
    #tag-distribution-matrix {
      font-size: 70% !important;
    }

    #tag-distribution-matrix th.first-header,
    #tag-distribution-matrix td.tag-title {
      width: 12em !important;
      padding-left: 0.2em !important;
    }

    #tag-distribution-matrix table,
    #tag-distribution-matrix th,
    #tag-distribution-matrix td {
      padding-left: unset !important;
      padding-right: 0.1em;
      padding-top: 0.1em;
      padding-bottom: 0.1em;
    }

    #tag-distribution-matrix #header-row th {
      transform: rotate(270deg);
      width: 3em;
    }
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

    // Generated here: https://www.learnui.design/tools/data-color-picker.html#single
    this.colorRange = [
      '#dadada',
      '#b4c1ce',
      '#8ca8c2',
      '#6190b6',
      '#2779aa'
    ];
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

      window.uiHelper.showSuccessMessage(i18n.t('bible-browser.copy-table-to-clipboard-success'));
    });

    eventController.subscribe('on-theme-changed', (theme) => {
      if (theme == 'dark') {
        this._uiHelper.switchToDarkTheme(this.shadowRoot, 'tag-distribution-matrix');
      } else {
        this._uiHelper.switchToRegularTheme(this.shadowRoot, 'tag-distribution-matrix');
      }
    });

    this._uiHelper.configureButtonStyles(this.shadowRoot.getElementById('tag-distribution-matrix'));
  }

  async setInputAndRefresh(input, tabIndex=undefined) {
    this._input = input;
    await this.refresh(tabIndex);
  }

  reset() {
    this._input = '';

    let headerRow = this.shadowRoot.getElementById('header-row');
    headerRow.innerHTML = '';

    const matrixTBody = this.shadowRoot.getElementById('matrix-tbody');
    matrixTBody.innerHTML = '';

    this.shadowRoot.getElementById('tag-distribution-matrix').style.display = 'none';
    this.shadowRoot.getElementById('copy-table-to-clipboard').style.display = 'none';
  }

  async refresh(tabIndex=undefined) {
    const tagIdListString = app_controller.tab_controller.getTab(tabIndex).getTagIdList();

    if (tagIdListString == null || tagIdListString == "") {
      this.reset();
      return;
    }

    const tagIdList = tagIdListString.split(',');
    const bibleBookStats = verseListController.getBibleBookStatsFromVerseList(tabIndex);
    const actualBooks = Object.keys(bibleBookStats);

    if (actualBooks.length < 2) {
      this.reset();
      return;
    }

    let headerRow = this.shadowRoot.getElementById('header-row');
    headerRow.innerHTML = '';
    let firstHeader = document.createElement('th');
    firstHeader.classList.add('first-header');
    firstHeader.style.width = '15em';
    headerRow.appendChild(firstHeader);
    
    actualBooks.forEach((book) => {
      let bookHeader = document.createElement('th');
      bookHeader.innerText = book;
      headerRow.appendChild(bookHeader);
    });

    const matrixTBody = this.shadowRoot.getElementById('matrix-tbody');
    matrixTBody.innerHTML = '';
    let tagOccurrences = {};
    let maxValue = 0;

    for (let i = 0; i < tagIdList.length; i++) {
      let tagId = tagIdList[i];
      let currentTagBookList = this.getTagOccurrencesPerBook(tagId);
      tagOccurrences[tagId] = currentTagBookList;

      let currentValues = Object.values(currentTagBookList);
      let currentMaxValue = Math.max(...currentValues);
      
      if (currentMaxValue > maxValue) {
        maxValue = currentMaxValue;
      }
    }

    for (let i = 0; i < tagIdList.length; i++) {
      let tagId = tagIdList[i];

      let currentTagRow = document.createElement('tr');
      let currentTag = await tag_assignment_panel.tag_store.getTag(tagId);

      if (currentTag == null) {
        continue;
      }

      let tagTitleCell = document.createElement('td');
      tagTitleCell.classList.add('tag-title');
      tagTitleCell.innerText = currentTag.title;
      currentTagRow.appendChild(tagTitleCell);

      let currentTagBookList = tagOccurrences[tagId];

      actualBooks.forEach((book) => {
        let bookCell = document.createElement('td');

        if (book in currentTagBookList) {
          bookCell.innerText = currentTagBookList[book];
          bookCell.style.backgroundColor = this.getColorForNumber(currentTagBookList[book], maxValue);
        }

        currentTagRow.appendChild(bookCell);
      });

      matrixTBody.appendChild(currentTagRow);
    }

    if (platformHelper.isElectron()) {
      this.shadowRoot.getElementById('tag-distribution-matrix').style.removeProperty('display');
      this.shadowRoot.getElementById('copy-table-to-clipboard').style.removeProperty('display');
    }
  }

  getColorForNumber(value, maxValue) {
    let percentage = (parseInt(value) / maxValue) * 100;
    let index = 0;
    
    if (percentage >= 0 && percentage <= 20) {
      index = 0;
    } else if (percentage > 20 && percentage <= 40) {
      index = 1;
    } else if (percentage > 40 && percentage <= 60) {
      index = 2;
    } else if (percentage > 60 && percentage <= 80) {
      index = 3;
    } else if (percentage > 80 && percentage <= 100) {
      index = 4;
    }

    return this.colorRange[index];
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
