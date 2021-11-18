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

const { html } = require('../helpers/ezra_helper.js');

const template = html`
   <style>
     #panel-switches {
      --button-switch-size: 2em; 
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    
    #panel-switches button {
      height: var(---button-switch-size);
      width: var(---button-switch-size);
      text-align: center;
      background: none;
      box-shadow: none;
    }
   </style>
    
   <nav id="panel-switches">
     <button id="switch-tags-panel"><i class="fa fa-tags"></i></button>
     <button id="switch-dictionary-panel"><i class="fa fa-hat"></i></button>
  </nav>
   `;

class PanelButtons extends HTMLElement {
  constructor() {
    super();
    this.appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
  }

  show() {
    this.style.display = 'block';
  }

  hide() {
    this.style.display = 'none';
  }
}

customElements.define('panel-buttons', PanelButtons);
module.exports = PanelButtons;