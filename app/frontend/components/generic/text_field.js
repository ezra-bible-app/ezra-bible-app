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

const eventController = require('../../controllers/event_controller.js');
const { html } = require('../../helpers/ezra_helper.js');

const template = html`

<!-- FONT AWESOME STYLES -->
<link rel="preload" href="node_modules/@fortawesome/fontawesome-free/webfonts/fa-solid-900.woff2" as="font" type="font/woff2">
<link href="node_modules/@fortawesome/fontawesome-free/css/solid.min.css" rel="stylesheet" type="text/css" />
<link href="node_modules/@fortawesome/fontawesome-free/css/fontawesome.min.css" rel="stylesheet" type="text/css" />

<!-- JQUERY STYLES -->
<link id="theme-css" href="css/jquery-ui/cupertino/jquery-ui.css" media="screen" rel="stylesheet" type="text/css" />

<link href="css/main.css" media="screen" rel="stylesheet" type="text/css" />

<style>
  :host {
    display: inline-block;
    --input-height: auto;
  }

  .text-field {
    width: 115%;
  }

  .text-field input {
    border: 1px solid lightgray;
    border-radius: 4px;
    padding-right: 1.8em;
    width: 65%;
    height: var(--input-height);
  }

  #delete-button {
    position: relative;
    right: 25px;
    color: var(--button-color);
    vertical-align: middle;
  }

  #delete-button:hover {
    color: var(--accent-color);
    cursor: pointer;
  }

</style>
 
<div id="text-field" class="text-field">
  <input type="text" id="input" inputmode="search" />
  <i id="delete-button" class="fa-solid fa-delete-left"></i>
</div>
`;

/**
 * The TextField component <text-field></text-field> is a more fancy version of the standard html input element.
 * It adds some styling as well as a delete button that can be used to delete the content of the text field.
 */
class TextField extends HTMLElement {
  static get observedAttributes() {
    return ['placeholder'];
  }

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
    eventController.subscribe('on-theme-changed', (theme) => {
      if (theme == 'dark') {
        uiHelper.switchToDarkTheme(this.shadowRoot, 'text-field');
      } else {
        uiHelper.switchToRegularTheme(this.shadowRoot, 'text-field');
      }
    });

    this._updatePlaceholder();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'placeholder') {
      this._updatePlaceholder();
    }
  }

  _updatePlaceholder() {
    this.input.placeholder = this.getAttribute('placeholder') || '';
  }

  set value(value) {
    this.input.value = value;
  }

  get value() {
    return this.input.value;
  }
  
  select() {
    this.input.select();
  }
}

customElements.define('text-field', TextField);
module.exports = TextField;
