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

class ConfigOption extends HTMLElement {
  constructor() {
    super();

    this.innerHTML = html`
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
        
        .Android .switch-box input {
          margin: 0.2em;
        }
      </style>

      <div class="switch-box fg-button fg-button-toggleable ui-corner-all ui-state-default">
        <input class="toggle-config-option-switch" type="checkbox"></input>
        <div class="switch-label"></div>
      </div>
    `;

    this.changeEvent = new CustomEvent("optionChanged", {
      bubbles: true,
      cancelable: false,
      composed: true
    });

    this._settingsKey = this.getAttribute('settingsKey');
    this._enabledByDefault = (this.getAttribute('enabledByDefault') == "true");
    this._autoLoad = true;
    if (this.hasAttribute('autoLoad') && this.getAttribute('autoLoad') == "false") {
      this._autoLoad = false;
    }

    $(this.querySelector('.switch-box')).bind('change', async () => {
      await waitUntilIdle();
      await ipcSettings.set(this._settingsKey, this._isChecked());
      this.dispatchEvent(this.changeEvent);
    });

    this.localize();

    if (this._autoLoad) {
      this.loadOptionFromSettings();
    }
  }

  localize() {
    var labelId = this.getAttribute('label');
    this.querySelector('.switch-label').innerText = i18n.t(labelId);
  }

  _isChecked(force=false) {
    if (force) {
      return true;
    } else {
      return $(this.querySelector('.toggle-config-option-switch')).prop('checked');
    }
  }

  get isChecked() {
    return this._isChecked();
  }

  get enabledByDefault() {
    return this._enabledByDefault;
  }

  set enabled(value) {
    if (value == true) {
      this.enableOption();
    }
  }

  set enabledByDefault(value) {
    if (value == true) {
      ipcSettings.has(this._settingsKey).then((isAvailable) => {
        if (!isAvailable) {
          this._enabledByDefault = true;
          this.enableOption();
        }
      });
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

customElements.define('config-option', ConfigOption);
module.exports = ConfigOption;