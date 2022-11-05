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

<!-- FONT AWESOME STYLES -->
<link rel="preload" href="node_modules/@fortawesome/fontawesome-free/webfonts/fa-solid-900.woff2" as="font" type="font/woff2">
<link href="node_modules/@fortawesome/fontawesome-free/css/solid.min.css" rel="stylesheet" type="text/css" />
<link href="node_modules/@fortawesome/fontawesome-free/css/fontawesome.min.css" rel="stylesheet" type="text/css" />

<link href="css/main.css" media="screen" rel="stylesheet" type="text/css" />

<style>
  :host {
    display: inline-block;
  }

  #text-field {
    width: 120%;
  }

  #input {
    border: 1px solid lightgray;
    border-radius: 4px;
    padding-right: 1.8em;
    width: 65%;
  }

  #delete-button {
    position: relative;
    right: 25px;
    color: var(--button-color);
  }

  #delete-button:hover {
    color: var(--accent-color);
    cursor: pointer;
  }

</style>
 
<div id="text-field">
  <input type="text" id="input" />
  <i id="delete-button" class="fa-solid fa-delete-left"></i>
</div>
`;

class TextField extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.input = this.shadowRoot.getElementById('input');
    this.deleteButton = this.shadowRoot.getElementById('delete-button');

    this.deleteButton.addEventListener('click', () => {
      this.input.value = '';
      this.dispatchEvent(new KeyboardEvent('keyup'));
      this.input.focus();
    });
  }

  connectedCallback() {
  }

  get value() {
    return this.shadowRoot.getElementById('input').value;
  }
  
  select() {
    this.shadowRoot.getElementById('input').select();
  }
}

customElements.define('text-field', TextField);
module.exports = TextField;
