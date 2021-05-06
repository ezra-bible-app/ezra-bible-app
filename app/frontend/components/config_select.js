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

class ConfigSelect extends HTMLElement {
  constructor() {
    super();

    this.innerHTML = html`
      <style>
        .config-select {
          width: 100%;
        }
      </style>

      <div class="switch-box">
        <div class="select-label"></div>
        <select name="config-select" class="config-select">
          <option>Option 1</option>
          <option>Option 2</option>
        </select>
      </div>
    `;

    this.selectEl = this.querySelector('.config-select');

    $(this.selectEl).selectmenu({
      change: () => this._handleChange(),
    });

    this.changeEvent = new CustomEvent("optionChanged", {
      bubbles: true,
      cancelable: false,
      composed: true
    });

    this._settingsKey = this.getAttribute('settingsKey');
    this._autoLoad = true;
    if (this.hasAttribute('autoLoad') && this.getAttribute('autoLoad') == "false") {
      this._autoLoad = false;
    }

    this._localize();

    // if (this._autoLoad) {
    //   this.loadOptionFromSettings();
    // }
  }

  async _handleChange() {
    await waitUntilIdle();
    // await ipcSettings.set(this._settingsKey, this.selectEl.value);
    console.log('select changed', this._settingsKey, this.selectEl.value);
    this.dispatchEvent(this.changeEvent);

  }

  _localize() {
    var labelId = this.getAttribute('label');
    this.querySelector('.select-label').innerText = i18n.t(labelId);
  }

  _isChecked(force = false) {
    if (force) {
      return true;
    } else {
      return $(this.querySelector('.toggle-config-option-switch')).prop('checked');
    }
  }

  get isChecked() {
    return this._isChecked();
  }

  set enabled(value) {
    if (value == true) {
      this.enableOption();
    }
  }

  enableOption() {
    $(this.querySelector('.toggle-config-option-switch')).attr('checked', 'checked');
    $(this.querySelector('.toggle-config-option-switch')).removeAttr('disabled');
    $(this.querySelector('.switch-box')).addClass('ui-state-active');
  }

  disableOption() {
    $(this.querySelector('.toggle-config-option-switch')).removeAttr('checked');
    $(this.querySelector('.switch-box')).removeClass('ui-state-active');
  }

  async loadOptionFromSettings() {
    var optionValue = this.enabledByDefault;
    var optionAvailable = await ipcSettings.has(this._settingsKey);

    if (optionAvailable) {
      optionValue = await ipcSettings.get(this._settingsKey, this.enabledByDefault);
    }

    if (optionValue == true) {
      this.enableOption();
    } else {
      this.disableOption();
    }
  }
}

customElements.define('config-select', ConfigSelect);
module.exports = ConfigSelect;