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

const { html, waitUntilIdle } = require('../helpers/ezra_helper.js');
const locales = i18nHelper.getAvailableLocales();

const template = html`
  <style>
    #language-switch-box {
      margin-top: 4em;
    }
    .config-select {
      width: 100%;
    }
  </style>

  <div id="language-switch-box" class="switch-box">
    <div class="options-header"></div>
    <select name="config-select" class="config-select">
      ${locales.map(locale => `<option value="${locale.code}" ${locale.code === i18nHelper.getLanguage() ? 'selected' : ''}>${locale.languageName}</option>`)}
    </select>
  </div>
  `;

class LocaleSwitch extends HTMLElement {
  constructor() {
    super();

    this.innerHTML = template.innerHTML;

    this.selectEl = this.querySelector('.config-select');

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

    if (this._autoLoad) {
      this.loadOptionFromSettings();
    }

    $(this.selectEl).selectmenu({
      width: 247, // FIXME: magic number that works with jQuery UI
      change: () => this._handleChange(),
    });
  }

  async _handleChange() {
    await waitUntilIdle();
    await ipcSettings.set(this._settingsKey, this.selectEl.value);
    this.dispatchEvent(this.changeEvent);
  }

  _localize() {
    var i18nId = this.getAttribute('label');
    var labelEl = this.querySelector('.options-header');
    labelEl.innerText = i18n.t(i18nId);
    labelEl.setAttribute('i18n', i18nId);
  }

  get value() {
    return this.selectEl.value;
  }

  async loadOptionFromSettings() {
    this.selectEl.value = await ipcSettings.get(this._settingsKey, "");
  }
}

customElements.define('locale-switch', LocaleSwitch);
module.exports = LocaleSwitch;