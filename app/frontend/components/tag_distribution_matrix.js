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

const { html } = require('../helpers/ezra_helper.js');
const verseListController = require('../controllers/verse_list_controller.js');

const template = html`
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
    width: 3em;
  }

  td.tag-title {
    text-align: left;
    width: 15em;
  }

  #header-row th {
    transform: rotate(270deg);
    font-size: 80%;
    font-weight: normal;
    height: 5em;
    padding: 0;
  }
</style>

<table style="margin-left: 1em; margin-top: 1em; margin-bottom: 1em; border-spacing: 0; border-collapse: collapse;">
  <thead>
    <tr id="header-row">
    </tr>
  </thead>
  <tbody id="matrix-tbody">
  </tbody>
</table>
`;

class TagDistributionMatrix extends HTMLElement {
  constructor() {
    super();

    this._input = null;

    this._shadowRoot = this.attachShadow({ mode: 'open' });
    this._shadowRoot.appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
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
    let headerRow = this._shadowRoot.getElementById('header-row');
    headerRow.innerHTML = '';

    const matrixTBody = this._shadowRoot.getElementById('matrix-tbody');
    matrixTBody.innerHTML = '';
  }

  async refresh(tabIndex=undefined) {
    const tagIdList = app_controller.tab_controller.getTab(tabIndex).getTagIdList().split(',');
    const bibleBookStats = verseListController.getBibleBookStatsFromVerseList(tabIndex);
    const actualBooks = Object.keys(bibleBookStats);

    let headerRow = this._shadowRoot.getElementById('header-row');
    headerRow.innerHTML = '';
    let firstHeader = document.createElement('th');
    firstHeader.style.width = '15em';
    headerRow.appendChild(firstHeader);
    
    actualBooks.forEach((book) => {
      let bookHeader = document.createElement('th');
      bookHeader.innerText = book;
      headerRow.appendChild(bookHeader);
    });

    const matrixTBody = this._shadowRoot.getElementById('matrix-tbody');
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
  }

  getTagOccurrencesPerBook(tagId) {
    let books = {};
    let tagElements = $(this._input).find(`.tag[tag-id=${tagId}]`);

    for (let i = 0; i < tagElements.length; i++) {
      let tagElement = $(tagElements[i]);
      let verseBox = tagElement.closest('.verse-box');
      let book = verseBox[0].getAttribute('verse-bible-book-short');

      if (book in books) {
        books[book] += 1;
      } else {
        books[book] = 1;
      }
    }

    return books;
  }
}

customElements.define('tag-distribution-matrix', TagDistributionMatrix);
module.exports = TagDistributionMatrix;
