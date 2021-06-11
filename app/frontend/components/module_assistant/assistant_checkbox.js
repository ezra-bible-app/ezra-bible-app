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

const template = html`
<style>
  :host {
    min-height: 1.5em;
    position: relative;
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
</style>
 
<label>  
  <input type="checkbox">
  <slot name="label-icon"></slot>
  <slot name="label-text">No text provided</slot><span id="count"></span>
</label>
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

    this.checked = false;
    this.disabled = false;
    this.code = "";

    this.checkbox = this.shadowRoot.querySelector('input[type="checkbox"]');
    this.checkbox.addEventListener('change', () => this.handleCheckboxChecked());
    this._checkedProcessed = true;
  }

  connectedCallback() {  
    this.code = this.getAttribute('code');
    
    this.disabled = this.hasAttribute('disabled');
    if (this.disabled) {
      this.checkbox.setAttribute('disabled', '');
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

  handleCheckedAttr(oldValue, newValue) {
    this.checked = newValue !== null;
    console.log('attribute checked', this.checked, '"'+oldValue+'"', '"'+newValue+'"');
    this.checkbox.checked = this.checked;
    // if (this.checked) {
    //   this.checkbox.setAttribute('checked', '');
    // } else {
    //   this.checkbox.removeAttribute('checked');
    // }
  }

  handleCheckboxChecked() {
    if (this.disabled) {
      return;
    }

    console.log('checkbox checked');

    this.checked = this.checkbox.checked;
    if (this.checked) {
      this.setAttribute('checked', '');
    } else {
      this.removeAttribute('checked');
    }

    this.dispatchEvent(new CustomEvent("itemSelected", {
      bubbles: true,
      detail: { 
        code: this.code,
        checked: this.checked
      }
    }));  
  }

  update(elementId, value) {
    this.shadowRoot.querySelector(`#${elementId}`).textContent = value ? value : '';
  }

}

customElements.define('assistant-checkbox', AssistantCheckbox);
module.exports = AssistantCheckbox;