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

const ICON_INFO = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!-- Font Awesome Free 5.15.3 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) --><path d="M256 8C119.043 8 8 119.083 8 256c0 136.997 111.043 248 248 248s248-111.003 248-248C504 119.083 392.957 8 256 8zm0 110c23.196 0 42 18.804 42 42s-18.804 42-42 42-42-18.804-42-42 18.804-42 42-42zm56 254c0 6.627-5.373 12-12 12h-88c-6.627 0-12-5.373-12-12v-24c0-6.627 5.373-12 12-12h12v-64h-12c-6.627 0-12-5.373-12-12v-24c0-6.627 5.373-12 12-12h64c6.627 0 12 5.373 12 12v100h12c6.627 0 12 5.373 12 12v24z"/></svg>`;

const template = html`
<style>
  :host {
    min-height: 1.5em;
    position: relative;
  }
  #label-wrapper {
    display: flex;
    align-items: center;
  }
  [name="label-icon"]::slotted(*) {
    position: absolute;
    left: -1em;
    top: 0.1em;
    height: 0.8em;
    width: 0.8em;
    fill: var(--accent-color, gray);
  }
  #count {
    opacity: 0.8;
  }
  #description {
    font-size: 0.8em;
    opacity: 0.8;
    margin-top: -0.5em;
    margin-bottom: -0.5em;
    margin-inline-start: 2.2em;
  }
  #info {
    display: none;
    margin-left: 0.5em;
    padding-bottom: 2px;
    border-bottom: 1px dashed gray;
  }
  #info svg {
    height: 1.2em;
    fill: var(--accent-color, gray);
  }
</style>
 
<div id="label-wrapper">
  <label>  
    <input type="checkbox">
    <slot name="label-icon"></slot>
    <slot name="label-text">No text provided</slot>
    <span id="count"></span>
  </label>
  <a id="info" href="#">${ICON_INFO}</a>
</div>
<div id="description"></div>
`;

class AssistantCheckbox extends HTMLElement {
  static get observedAttributes() {
    return ['count', 'description', 'checked'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this._checked = false;
    this._disabled = false;
    this.code = "";

    this.checkbox = this.shadowRoot.querySelector('input[type="checkbox"]');
    this.checkbox.addEventListener('change', () => this.handleCheckboxChecked());
  }

  connectedCallback() {  
    this.code = this.getAttribute('code');
    
    this._disabled = this.hasAttribute('disabled');
    if (this._disabled) {
      this.checkbox.setAttribute('disabled', '');
    }

    if (this.hasAttribute('info')) {
      const infoElement = this.shadowRoot.querySelector('#info');
      const infoHint = this.getAttribute('info');
      if (infoHint !== '') {
        infoElement.setAttribute('title', infoHint);
      }

      infoElement.style.display = 'block';
      infoElement.addEventListener('click', () => this.handleInfoClick());
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'checked') {
      this.handleCheckedAttr(oldValue, newValue);
      return;
    }

    if (name === 'count' && newValue) {
      newValue = ` (${newValue})`;
    }

    this.update(name, newValue);
  }

  set count(n) {
    if (n) {
      this.setAttribute('count', n);
    } else {
      this.removeAttribute('count');
    }
  }

  set description(text) {
    if (text) {
      this.setAttribute('description', text);
    } else {
      this.removeAttribute('description');
    }
  }

  set checked(isChecked) {
    if (isChecked) {
      this.setAttribute('checked', '');
    } else {
      this.removeAttribute('checked');
    }
  }

  handleCheckedAttr(oldValue, newValue) {
    this._checked = newValue !== null;
    this.checkbox.checked = this._checked;
  }

  handleCheckboxChecked() {
    if (this._disabled) {
      return;
    }

    this._checked = this.checkbox.checked;
    if (this._checked) {
      this.setAttribute('checked', '');
    } else {
      this.removeAttribute('checked');
    }

    this.dispatchEvent(new CustomEvent("itemSelected", {
      bubbles: true,
      detail: { 
        code: this.code,
        checked: this._checked
      }
    }));  
  }

  handleInfoClick() {
    this.dispatchEvent(new CustomEvent("itemInfoRequested", {
      bubbles: true,
      detail: { 
        code: this.code,
      }
    }));  
  }

  update(elementId, value) {
    this.shadowRoot.querySelector(`#${elementId}`).textContent = value ? value : '';
  }

}

customElements.define('assistant-checkbox', AssistantCheckbox);
module.exports = AssistantCheckbox;