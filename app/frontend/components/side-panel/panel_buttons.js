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
        height: 100%;
     }
     #panel-switches {
      --button-switch-size: 1.5em; 
      height: 100%;
      display: flex;
      flex-direction: column;
      margin-inline-end: 0.5em;
    }
    
    #panel-switches button {
      font-size: var(--button-switch-size);
      color: var(--accent-color);
      background: none;
      padding: 6px;
      border: var(--area-border);
      border-radius: var(--border-radius);
      margin-block-end: 0.5em;
    }
   </style>
    
   <nav id="panel-switches">
     <slot></slot>
   </nav>
   `;

class PanelButtons extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
  }
}

customElements.define('panel-buttons', PanelButtons);
module.exports = PanelButtons;