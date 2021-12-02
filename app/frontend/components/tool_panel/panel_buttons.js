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

const { html, waitUntilIdle } = require('../../helpers/ezra_helper.js');
const eventController = require('../../controllers/event_controller.js');

const SETTINGS_KEY = "activeToolPanel";

const template = html`
   <style>
     :host {
        height: 100%;
     }
     #panel-switches {
      --button-switch-size: 1.5em; 
      height: 100%;
      width: calc(2 * var(---button-switch-size));
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      margin-inline-end: 0.5em;
    }
    
    ::slotted(button) {
      font-size: var(--button-switch-size) !important; /* There is an issue with ::slotted specificity: https://github.com/w3c/csswg-drafts/issues/6466 */
      color: var(--accent-color);
      width: calc(var(--button-switch-size) + 8px);
      height: calc(var(--button-switch-size) + 8px);
      background: none;
      padding: 6px;
      border: var(--area-border);
      border-radius: var(--border-radius);
      margin-block-end: 0.5em;
      box-shadow: var(--highlight-shadow);
    }

    @media (orientation: portrait) {
      #panel-switches {
        height: calc(2 * var(---button-switch-size));
        width: 100%;
        flex-direction: row;
        margin-block-start: 0.5em;
        margin-inline-end: 0;
      }
      ::slotted(button) {
        margin-inline-end: 0.5em;
        margin-block-end: 0;
      }
    }

    ::slotted(button.active),
    ::slotted(button:hover)  {
      border-color: var(--highlight-border-color);
      border-width: 2px;
      background: var(--highlight-bg-color);
      box-shadow: none;
      transform: translateX(1px);
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

    this.toolPanelElement = null;
    this.activePanel = null;
    this.panelEvents = {};
  }

  async connectedCallback() {
    this.toolPanelElement = document.querySelector('#tool-panel');
    this.activePanel = await ipcSettings.get(SETTINGS_KEY, null);

    const slottedElements = this.shadowRoot.querySelector('slot').assignedElements();
    slottedElements.forEach(el => this.initButton(el));

    if (this.activePanel) {
      await this.togglePanel(this.activePanel, true);
    } else {
      this.toolPanelElement.classList.add('hidden');
    }
    
  }

  initButton(buttonElement) {
    if (!buttonElement.hasAttribute('rel')) {
      console.error('Attribute "rel" is required for panel buttons!');
      return;
    }
    const targetPanel = buttonElement.getAttribute('rel');

    if (!buttonElement.hasAttribute('event')) {
      console.error('Attribute "event" is required for panel buttons!');
      return;
    }
    this.panelEvents[targetPanel] = buttonElement.getAttribute('event');

    const defaultOpen = (buttonElement.getAttribute('default') == "true");
    if (this.activePanel === null && defaultOpen) {
      this.activePanel = targetPanel;
    }

    buttonElement.addEventListener('click', async (e) => {
      e.preventDefault();
      await this.updatePanel(targetPanel);
    });
  }
  
  async updatePanel(targetPanel) {

    // if active panel - hide the whole tool panel
    if (this.activePanel === targetPanel) {
      this.activePanel = "";
      this.toolPanelElement.classList.add('hidden');
      await this.togglePanel(targetPanel, false);
    } else {
      await this.togglePanel(this.activePanel, false);

      this.activePanel = targetPanel;
      await this.togglePanel(targetPanel, true);
      this.toolPanelElement.classList.remove('hidden');
    }

    await ipcSettings.set(SETTINGS_KEY, this.activePanel);
  }

  async togglePanel(panelId, isActive) {
    if (!panelId) return;

    console.info(`toggle panel ${panelId} isOpen=${isActive}`);
    const buttonElement = this.querySelector(`button[rel="${panelId}"]`);
    const panelElement = this.toolPanelElement.querySelector(`#${panelId}`);

    if (!buttonElement || !panelElement) {
      console.error(`Button or panel "${panelId} is not found in the DOM`);
      return;
    }  

    if (isActive) {
      buttonElement.classList.add('active');
      panelElement.classList.add('active');
    } else {
      buttonElement.classList.remove('active');
      panelElement.classList.remove('active');
    }

    await waitUntilIdle();
    await eventController.publishAsync(this.panelEvents[panelId], isActive);
  }
}

customElements.define('panel-buttons', PanelButtons);
module.exports = PanelButtons;

