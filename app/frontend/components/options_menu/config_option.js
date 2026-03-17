/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2026 Ezra Bible App Development Team <contact@ezrabibleapp.net>

   Ezra Bible App is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 2 of the License, or
   (at your option) any later version.

   Ezra Bible App is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
   See the GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Bible App. See the file LICENSE.
   If not, see <http://www.gnu.org/licenses/>. */

const { html, waitUntilIdle } = require('../../helpers/ezra_helper.js');
const { Mutex } = require('async-mutex');

const template = html`
<style>
  .switch-box {
    clear: both;
    width: 85%;
    margin-bottom: 1em;
    margin-left: auto;
    margin-right: auto;
    text-align: center;
  }
  
  .switch-box input,
  .switch-box button {
    padding: 0.3em;
  }
  
  .switch-box input {
    float: left;
    margin: 0.4em;
  }
  
  .Cordova .switch-box input {
    margin: 0.2em;
  }
</style>

<div class="switch-box fg-button fg-button-toggleable ui-corner-all ui-state-default">
  <input class="toggle-config-option-switch" type="checkbox"></input>
  <div class="switch-label"></div>
</div>
`;

class ConfigOption extends HTMLElement {
  constructor() {
    super();

    this.innerHTML = template.innerHTML;
    this.mutex = new Mutex();

    this.changeEvent = new CustomEvent("optionChanged", {
      bubbles: true,
      cancelable: false,
      composed: true
    });

    this._settingsKey = this.getAttribute('settingsKey');
    this._checkedByDefault = (this.getAttribute('checkedByDefault') == "true");
    this._autoLoad = true;
    if (this.hasAttribute('autoLoad') && this.getAttribute('autoLoad') == "false") {
      this._autoLoad = false;
    }

    $(this.querySelector('.switch-box')).bind('click', (event) => {
      if (!this.enabled) {
        event.preventDefault();
      }
    });

    $(this.querySelector('.switch-box')).bind('change', async () => {
      await waitUntilIdle();
      await ipcSettings.set(this._settingsKey, await this._isChecked());
      this.dispatchEvent(this.changeEvent);
    });

    this.localize();

    if (this._autoLoad) {
      this.loadOptionFromSettings();
    }
  }

  localize() {
    var i18nId = this.getAttribute('label');
    var labelEl = this.querySelector('.switch-label');
    labelEl.innerText = i18n.t(i18nId);
    labelEl.setAttribute('i18n', i18nId);
  }

  async _isChecked() {
    const release = await this.mutex.acquire();

    try {
      let checkboxChecked = this.querySelector('.toggle-config-option-switch').checked;
      return checkboxChecked && this.enabled;
    } finally {
      release();
    }
  }

  get isChecked() {
    // We need to handle this synchronously since it's a getter
    let checkboxChecked = this.querySelector('.toggle-config-option-switch').checked;
    return checkboxChecked && this.enabled;
  }

  // Add an async method for safely checking the state
  async isCheckedAsync() {
    return await this._isChecked();
  }

  get checkedByDefault() {
    return this._checkedByDefault;
  }

  set checked(value) {
    this._setCheckedAsync(value);
  }

  async _setCheckedAsync(value) {
    const release = await this.mutex.acquire();

    try {
      if (value == true) {
        this._setOptionCheckedInternal();
      } else {
        this._setOptionUncheckedInternal();
      }
    } finally {
      release();
    }
  }

  _setOptionCheckedInternal() {
    $(this.querySelector('.toggle-config-option-switch')).attr('checked', 'checked');
    $(this.querySelector('.toggle-config-option-switch')).removeAttr('disabled');
    $(this.querySelector('.switch-box')).addClass('ui-state-active');
  }

  _setOptionUncheckedInternal() {
    $(this.querySelector('.toggle-config-option-switch')).removeAttr('checked');
    $(this.querySelector('.switch-box')).removeClass('ui-state-active');
  }

  async setOptionChecked() {
    const release = await this.mutex.acquire();

    try {
      this._setOptionCheckedInternal();
    } finally {
      release();
    }
  }

  set enabled(value) {
    if (value == true) {
      this.setOptionEnabled();
    } else {
      this.setOptionDisabled();
    }
  }

  get enabled() {
    var isEnabled = !this.querySelector('.switch-box').classList.contains('ui-state-disabled');
    return isEnabled;
  }

  set checkedByDefault(value) {
    if (value == true) {
      ipcSettings.has(this._settingsKey).then((isAvailable) => {
        if (!isAvailable) {
          this._checkedByDefault = true;
          this.setOptionChecked();
        }
      });
    }
  }

  setOptionEnabled() {
    $(this.querySelector('.switch-box')).removeClass('ui-state-disabled');
    $(this.querySelector('.switch-box')).addClass('fg-button-toggleable');

    if (this.isChecked) {
      $(this.querySelector('.switch-box')).addClass('ui-state-active');
    }
  }

  setOptionDisabled() {
    $(this.querySelector('.switch-box')).addClass('ui-state-disabled');
    $(this.querySelector('.switch-box')).removeClass('fg-button-toggleable');
    $(this.querySelector('.switch-box')).removeClass('ui-state-active');
  }

  async loadOptionFromSettings() {
    var optionValue = await ipcSettings.get(this._settingsKey, this.checkedByDefault);

    const release = await this.mutex.acquire();
    try {
      if (optionValue == true) {
        this._setOptionCheckedInternal();
      } else {
        this._setOptionUncheckedInternal();
      }
    } finally {
      release();
    }
  }
}

customElements.define('config-option', ConfigOption);
module.exports = ConfigOption;