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

const { waitUntilIdle } = require('../../helpers/ezra_helper.js');
const eventController = require('../../controllers/event_controller.js');

class SelectOption extends HTMLSelectElement {
  constructor() {
    super();

    this._settingsKey = this.getAttribute('settingsKey');
    this._width = this.getAttribute('width');
    this._id = this.getAttribute('id');
    this._selectedValue = null;

    var style = document.createElement('style');
    style.innerHTML = `
      #${this._id}-button {
        margin-left: 1.5em;
        margin-bottom: 1em;
        text-align: center;
      }

      #${this._id}-menu {
        box-shadow: 2px 2px 3px #a0a0a088;
      }
 
      #${this._id}-menu,
      #${this._id}-menu li {
        background-color: #deedf7;
      }

      .darkmode--activated #${this._id}-menu,
      .darkmode--activated #${this._id}-menu li {
        background-color: #1e1e1e;
      }
    `;

    this.appendChild(style);

    this.localize();

    eventController.subscribe('on-locale-changed', () => {
      this.localize();
      this.initSelectMenu();
    });

    this.changedEvent = new CustomEvent("optionChanged", {
      bubbles: true,
      cancelable: false,
      composed: true
    });

    this._autoLoad = true;
    if (this.hasAttribute('autoLoad') && this.getAttribute('autoLoad') == "false") {
      this._autoLoad = false;
    }

    if (this._autoLoad) {
      (async () => {
        await this.loadOptionFromSettings();
        this.initSelectMenu();
      })();
    } else {
      this.initSelectMenu();
    }

    this._autoSave = true;
    if (this.hasAttribute('autoSave') && this.getAttribute('autoSave') == "false") {
      this._autoSave = false;
    }
  }

  initSelectMenu() {
    $(this).selectmenu({
      width: this._width,
      select: (event, ui) => {
        (async(event, ui) => {
          this.selectedValue = this.value;
          this.dispatchEvent(this.changedEvent);
          await waitUntilIdle();
        })(event, ui);
      }
    });
  }

  localize() {
    this.querySelectorAll('option').forEach((option) => {
      var i18nId = option.getAttribute('label');
      option.innerText = i18n.t(i18nId);
      option.setAttribute('i18n', i18nId);
    });
  }

  async loadOptionFromSettings() {
    var optionValue = await ipcSettings.get(this._settingsKey);
    this.updateSelectedValue(optionValue, false);
  }

  updateSelectedValue(value, updateSettings=true) {
    if (value !== false) {
      this._selectedValue = value;

      if (updateSettings) {
        (async() => {
          await ipcSettings.set(this._settingsKey, value);
        })();
      }

      for (let i = 0; i < this.options.length; i++) {
        if (this.options[i].value == value) {
          this.options[i].setAttribute('selected', 'selected');
        } else {
          this.options[i].removeAttribute('selected');
        }
      }

      this.initSelectMenu();
    }
  }

  /**
   * Sets the selected value of the widget and writes it to the settings
   * 
   * @param value - The value that shall be used for the update.
   */
  set selectedValue(value) {
    this.updateSelectedValue(value, this._autoSave);
  }

  /**
   * Returns the currently selected value.
   */
  get selectedValue() {
    return this._selectedValue;
  }

  /**
   * Checks whether the option has already been persisted. Returns a promise which eventually returns a Boolean.
   * 
   * @return {Promise}
   */
  get persisted() {
    return (async() => {
      var hasSetting = await ipcSettings.has(this._settingsKey);
      return hasSetting;
    })();
  }
}

customElements.define('select-option', SelectOption, {extends: 'select'});
module.exports = SelectOption;