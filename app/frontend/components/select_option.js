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

const { waitUntilIdle } = require('../helpers/ezra_helper.js');

class SelectOption extends HTMLSelectElement {
  constructor() {
    super();

    this._settingsKey = this.getAttribute('settingsKey');
    this._width = this.getAttribute('width');
    this._id = this.getAttribute('id');

    var style = document.createElement('style');
    style.innerHTML = `
      #${this._id}-button {
        margin-left: 1.5em;
        margin-bottom: 1em;
        text-align: center;
      }
 
      #${this._id}-menu,
      #${this._id}-menu li {
        background-color: #deedf7;
      }
    `;

    this.appendChild(style);

    this.localize();

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
  }

  initSelectMenu() {
    $(this).selectmenu({
      width: this._width,
      select: (event, ui) => {
        (async() => {
          await ipcSettings.set(this._settingsKey, this.value);
          this.dispatchEvent(this.changedEvent);
          await waitUntilIdle();
        })();
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

    if (optionValue !== false) {
      for (let i = 0; i < this.options.length; i++) {
        if (this.options[i].value == optionValue) {
          this.options[i].setAttribute('selected', 'selected');
        } else {
          this.options[i].removeAttribute('selected');
        }
      }

      this.value = optionValue;
    }
  }
}

customElements.define('select-option', SelectOption, {extends: 'select'});
module.exports = SelectOption;