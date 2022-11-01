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

const template = html`
<style>
  table {
    table-layout: fixed;
  }

  td {
    white-space: nowrap;
    font-size: 80%;
    text-align: right;
  }

  table, th, td {
    border: 1px solid black;
  }

  #header-row th {
    transform: rotate(270deg);
    font-size: 70%;
    font-weight: normal;
    height: 4em;
    padding: 0;
  }
</style>

<table style="border-spacing: 0; border-collapse: collapse;">
  <thead>
    <tr id="header-row">
      <th></th>
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
    //this.innerHTML = template.innerHTML;
  }

  set input(value) {
    this._input = value;
    this.refresh();
  }

  async refresh(tabIndex=undefined) {
    console.log(this._input);

    const currentTranslation = app_controller.tab_controller.getTab(tabIndex).getBibleTranslationId();
    const bookList = await ipcNsi.getBookList(currentTranslation);
    const tagIdList = app_controller.tab_controller.getTab(tabIndex).getTagIdList().split(',');

    let headerRow = this._shadowRoot.getElementById('header-row');
    
    bookList.forEach((book) => {
      let bookHeader = document.createElement('th');
      bookHeader.innerText = book;
      headerRow.appendChild(bookHeader);
    });

    const matrixTBody = this._shadowRoot.getElementById('matrix-tbody');

    for (let i = 0; i < tagIdList.length; i++) {
      let tagId = tagIdList[i];

      let currentTagRow = document.createElement('tr');
      let currentTag = await tags_controller.tag_store.getTag(tagId);
      let tagTitleCell = document.createElement('td');
      tagTitleCell.innerText = currentTag.title;
      currentTagRow.appendChild(tagTitleCell);

      let currentTagBookList = this.getTagBookList(tagId);
      console.log(currentTagBookList);

      bookList.forEach((book) => {
        let bookCell = document.createElement('td');

        if (book in currentTagBookList) {
          bookCell.innerText = currentTagBookList[book];
        }

        currentTagRow.appendChild(bookCell);
      });

      matrixTBody.appendChild(currentTagRow);
    }

    //console.log(bookList);
  }

  getTagBookList(tagId) {
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
