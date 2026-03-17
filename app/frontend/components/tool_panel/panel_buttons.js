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

const { html } = require('../../helpers/ezra_helper.js');
const eventController = require('../../controllers/event_controller.js');
const PlatformHelper = require('../../../lib/platform_helper.js');

const SETTINGS_KEY = "activeToolPanel";

const template = html`
  <link href="css/mobile.css" media="screen" rel="stylesheet" type="text/css" />

  <style>
    :host {
       height: 100%;
    }
    #panel-switches {
     --icon-size: 1em; 
     --button-size: calc(var(--icon-size) + 1em);
     height: 100%;
     width: var(--button-size);
     display: flex;
     flex-direction: column;
     align-items: flex-start;
     margin-inline-end: 0.5em;
     margin-left: 0.2em;
   }
   
   ::slotted(button:not(.hidden)) {
     font-size: var(--icon-size) !important; /* There is an issue with ::slotted specificity: https://github.com/w3c/csswg-drafts/issues/6466 */
     display: block !important;  /* The unslotted buttons were hidden by default, because they already existed in the DOM before the Android permissions dialogue is shown. */

     color: #8e8e8e;
     width: var(--button-size);
     height: var(--button-size);
     background: none;
     padding: 0;
     border: 1px solid #8e8e8e;
     border-radius: var(--border-radius);
     margin-block-end: 0.5em;
     cursor: pointer;
   }

   /* PORTRAIT */
   @media screen and (max-aspect-ratio: 13/10) {
     #panel-switches {
       height: var(--button-size);
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
     color: white;
     border-color: var(--highlight-border-color);
     background: var(--accent-color);
   }

   ::slotted(button.no-hover) {
     color: #8e8e8e;
     border: 1px solid #8e8e8e;
     background: unset;
   }

   ::slotted(button:disabled) {
     color: var(--disabled-button-color);
     border-color: var(--disabled-button-color);
     background-color: transparent;
     opacity: 0.8;
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
    this._activePanel = null;
    this.panelEvents = {};
    this._disabledPanels = new Set();

    this._platformHelper = new PlatformHelper();
  }

  async connectedCallback() {
    this.toolPanelElement = document.querySelector('#tool-panel');
    let activePanelSetting = await ipcSettings.get(SETTINGS_KEY, null);

    if (typeof(activePanelSetting) == 'string') {
      this._activePanel = await ipcSettings.get(SETTINGS_KEY, null);
    }

    const slottedElements = this.shadowRoot.querySelector('slot').assignedElements();
    slottedElements.forEach(el => {
      this._initButton(el);
    });

    if (!this._activePanel || this._platformHelper.isMobile()) {
      this._activePanel = '';
      this.toolPanelElement.classList.add('hidden');
    } else {
      await this._togglePanel(this._activePanel, true);
    }

    // Subscribe to tab-added event to close panel in portrait mode on mobile/tablet
    eventController.subscribe('on-tab-added', () => {
      this._handleTabAdded().catch(err => {
        console.error('Error handling tab added event:', err);
      });
    });
    
  }

  _initButton(buttonElement) {
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

    const defaultOpen = (buttonElement.getAttribute('default') == 'true');
    if (this._activePanel === null && defaultOpen) {
      this._activePanel = targetPanel;
    }

    buttonElement.addEventListener('click', async (e) => {
      eventController.publish('on-button-clicked');
      e.preventDefault();
      await this._updatePanels(targetPanel);
    });
  }
  
  async _updatePanels(targetPanel, hideIfActive=true) {
    if (!targetPanel || this._disabledPanels.has(targetPanel)) return;

    // if active panel - hide the whole tool panel
    if (this._activePanel === targetPanel) {
      if (hideIfActive) {
        this._activePanel = '';
        this.toolPanelElement.classList.add('hidden');
        this._togglePanel(targetPanel, false);
      }
    } else {
      this._togglePanel(this._activePanel, false);

      this._activePanel = targetPanel;
      this._togglePanel(targetPanel, true);
      this.toolPanelElement.classList.remove('hidden');
    }

    await ipcSettings.set(SETTINGS_KEY, this._activePanel);
  }

  async _togglePanel(panelId, setActive) {
    if (!panelId) return;

    const buttonElement = this._getButtonForPanel(panelId);
    const panelElement = this.toolPanelElement.querySelector(`#${panelId}`);

    if (!buttonElement || !panelElement) {
      console.error(`Button or panel "${panelId} is not found in the DOM`);
      return;
    }  

    if (setActive) {
      if (this._platformHelper.isCordova()) {
        buttonElement.classList.remove('no-hover');
      }

      buttonElement.classList.add('active');
      panelElement.classList.add('active');
    } else {
      if (this._platformHelper.isCordova()) {
        buttonElement.classList.add('no-hover');
      }

      buttonElement.classList.remove('active');
      panelElement.classList.remove('active');
    }

    // Publish generic panel switched event for global listeners with a delay of 100ms
    setTimeout(async () => {
      await eventController.publishAsync('on-panel-switched', setActive);
    }, 100);

    // Publish specific panel event
    await eventController.publishAsync(this.panelEvents[panelId], setActive);
  }

  _getButtonForPanel(panelId) {
    const buttonElement = this.querySelector(`button[rel="${panelId}"]`);
    if (!buttonElement) {
      console.log(`Button for panel "#${panelId} is not found in the DOM`);
    }
    return buttonElement;
  }

  get activePanel() {
    return this._activePanel;
  }

  set activePanel(panelId) {
    this._updatePanels(panelId, false);
  }
  
  disable(panelId) {
    const button = this._getButtonForPanel(panelId);
    if (!button) return;

    if (panelId === this._activePanel) {
      const toSwitchButton = button.previousElementSibling || button.nextElementSibling;
      const toSwitchPanel = toSwitchButton ? toSwitchButton.getAttribute('rel') : panelId;
      this._updatePanels(toSwitchPanel);
    }

    button.disabled = true;
    this._disabledPanels.add(panelId);
  }

  enable(panelId) {
    const button = this._getButtonForPanel(panelId);
    if (!button) return;

    button.disabled = false;
    this._disabledPanels.delete(panelId);
  }

  async _handleTabAdded() {
    // Check if toolPanelElement is available
    if (!this.toolPanelElement) {
      return;
    }

    // Check if we're in portrait mode on a mobile/tablet device
    let isPortrait = false;
    
    // On Cordova (native mobile apps), use screen.orientation API
    // On desktop/web, always use aspect ratio for reliability
    if (this._platformHelper.isCordova() && typeof screen !== 'undefined' && screen.orientation && screen.orientation.type) {
      isPortrait = screen.orientation.type.startsWith('portrait');
    } else {
      // Check aspect ratio (portrait if height/width > 13/10)
      // This matches the CSS media query: max-aspect-ratio: 13/10
      const aspectRatio = window.innerHeight / window.innerWidth;
      isPortrait = aspectRatio > 13 / 10;
    }
    
    const isMobile = this._platformHelper.isMobile() || this._platformHelper.isCordova();
    const isPanelOpen = this._activePanel !== '' && !this.toolPanelElement.classList.contains('hidden');

    // Close the panel if in portrait mode on mobile and panel is open
    if (isPortrait && isMobile && isPanelOpen) {
      const currentPanel = this._activePanel;
      this._activePanel = '';
      this.toolPanelElement.classList.add('hidden');
      await this._togglePanel(currentPanel, false);
      await ipcSettings.set(SETTINGS_KEY, this._activePanel);
    }
  }

}

customElements.define('panel-buttons', PanelButtons);
module.exports = PanelButtons;

