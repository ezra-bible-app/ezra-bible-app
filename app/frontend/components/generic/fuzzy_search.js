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
const Fuse = require('fuse.js');

const template = html`
<style>
</style>
<div class="search-wrapper">
  <input type="search">
</div>
`;

/**
 * @module FuzzySearch
 * component displays search input field and triggers 'searchResultReady'
 * @example
 * <fuzzy-search min-length="2"></fuzzy-search>
 * @category Component
 */
class FuzzySearch extends HTMLElement {

  constructor() {
    super();

    /**@type {Fuse} */
    this._fuse = null;
    this._searchTimeout = undefined;

    /**min lens of the input to trigger search */
    this.minLength = 2;
    /** max number of result items */
    this.maxResult = 100;
    /**delay between triggering keyup events */
    this.searchDelay = 200;
    /**threshold param for the search (https://fusejs.io/api/options.html#threshold) */
    this.threshold = 0.6;
    /**distance param for the search (https://fusejs.io/api/options.html#distance) */
    this.distance = 20;

    this.attachShadow({mode: 'open'});
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.shadowRoot.querySelector('.search-wrapper input[type="search"]').addEventListener('keyup', (e) => this._handleKeyup(e));
  }

  async connectedCallback() {
    if (this.hasAttribute('min-length')) {
      this.minLength = parseInt(this.getAttribute('min-length'));
    }
    if (this.hasAttribute('max-result')) {
      this.maxResult = parseInt(this.getAttribute('max-result'));
    }
    if (this.hasAttribute('search-delay')) {
      this.searchDelay = parseInt(this.getAttribute('search-delay'));
    }
    if (this.hasAttribute('threshold')) {
      this.threshold = parseInt(this.getAttribute('threshold'));
    }
    if (this.hasAttribute('distance')) {
      this.distance = parseInt(this.getAttribute('distance'));
    }
  }

  init(dataArr, keys=[]) {
    this._fuse = new Fuse(dataArr, { includeScore: true,  threshold: this.threshold, distance: this.distance, minMatchCharLength: 2, keys });
  }

  _handleKeyup(event) {
    clearTimeout(this._searchTimeout);
    if (!this._fuse) {
      return;
    }
    const value = event.target.value.trim();
    this._searchTimeout = setTimeout(() => {
      const searchResult = value.length < this.minLength ? [] : this._fuse.search(value);

      this.dispatchEvent(new CustomEvent("searchResultReady", {
        bubbles: true,
        detail: { 
          result: searchResult.slice(0, this.maxResult),
        }
      }));
    }, this.searchDelay);
  }
}

customElements.define('fuzzy-search', FuzzySearch);
module.exports = FuzzySearch;