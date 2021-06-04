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

//FIXME: move styles from css/loader.css
const template = html`
<style>
  :host {
    min-height: 1.5em;
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
  <span id="label-text"></span><span id="count"></span>
</label>
<div id="description"></div>
`;

class AssistantCheckbox extends HTMLElement {
  static get observedAttributes() {
    return ['count', 'description'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.checked = false;
    this.code = "";
  }

  connectedCallback() {  
    this.shadowRoot.querySelector('#label-text').innerHTML = this.textContent;
    this.textContent = '';

    this.code = this.getAttribute('code');

    const checkbox = this.shadowRoot.querySelector('input[type="checkbox"]');
    this.checked = this.hasAttribute('checked');
    if (this.checked) {
      checkbox.setAttribute('checked', '');
    }
    checkbox.addEventListener('change', () => {
      this.checked = checkbox.checked;
      if (this.checked) {
        this.setAttribute('checked', '');
      } else {
        this.removeAttribute('checked');
      }
    });
  }

  attributeChangedCallback(name, oldValue, newValue) {
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
  update(elementId, value) {
    this.shadowRoot.querySelector(`#${elementId}`).textContent = value ? value : '';
  }

}

customElements.define('assistant-checkbox', AssistantCheckbox);
module.exports = AssistantCheckbox;