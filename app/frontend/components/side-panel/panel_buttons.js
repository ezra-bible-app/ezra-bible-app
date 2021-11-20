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

    ::slotted(button.bottom) {
      margin-block-start: auto;
      margin-block-end: 0;
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

    this.panelStates = {};
    this.slottedElements = [];

    eventController.subscribe('on-fullscreen-changed', (isFullScreen) => {
      this.slottedElements.forEach(el => {
        const shouldBeOpen = !isFullScreen;
        this.updatePanel(el, shouldBeOpen);
      });
    });
  }

  connectedCallback() {
    this.slottedElements = this.shadowRoot.querySelector('slot').assignedElements();
    this.slottedElements.forEach(el => this.initButton(el));
  }

  async initButton(buttonElement) {
    const settingsKey = buttonElement.getAttribute('settings-key');
    const defaultOpen = (buttonElement.getAttribute('default') == "true");
    const isBottomButton = buttonElement.classList.contains('bottom');
    const isOpen = uiHelper.isSmallScreen && isBottomButton ? false : await ipcSettings.get(settingsKey, defaultOpen);
    await this.updatePanel(buttonElement, isOpen, false);

    buttonElement.addEventListener('click', async (e) => {
      e.preventDefault();
      await this.updatePanel(buttonElement, !this.panelStates[settingsKey]);
    });
  }
  
  /**
   * @param {HTMLElement} buttonElement 
   * @param {boolean} isOpen 
   */
  async updatePanel(buttonElement, isOpen, saveSettings=true) {
    if (!buttonElement.hasAttribute('settings-key')) {
      console.error('Attribute "settings-key" is required for panel buttons!');
      return;
    }
    const settingsKey = buttonElement.getAttribute('settings-key');

    // if state is the same
    if (this.panelStates[settingsKey] === isOpen) return;

    if (!buttonElement.hasAttribute('event')) {
      console.error('Attribute "event" is required for panel buttons!');
      return;
    }
    const emitEvent = buttonElement.getAttribute('event');

    console.info(`Panel switch ${emitEvent} isOpen=${isOpen}`);
    this.panelStates[settingsKey] = isOpen;
    if (isOpen) {
      buttonElement.classList.add('active');
    } else {
      buttonElement.classList.remove('active');
    }

    await waitUntilIdle();

    if (saveSettings) {
      await ipcSettings.set(settingsKey, isOpen);
    }

    eventController.publishAsync(emitEvent, isOpen);
  }
}

customElements.define('panel-buttons', PanelButtons);
module.exports = PanelButtons;

