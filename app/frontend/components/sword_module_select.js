/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2023 Ezra Bible App Development Team <contact@ezrabibleapp.net>

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
const eventController = require('../controllers/event_controller.js');
const i18nHelper = require('../helpers/i18n_helper.js');

const template = html`

  <style>
    .sword-module-select-container {
      width: 100%;
      display: flex;
    }
    .sword-module-select-container .ui-selectmenu {
      width: auto;
    }
    .sword-module-select-container .ui-selectmenu-menu-dropdown {
      font-size: 1em;
      text-align: left;
      background-color: #deedf7;
      width: 240px !important;
      box-shadow: 2px 2px 3px #a0a0a088;
    }
    .darkmode--activated .sword-module-select-container .ui-selectmenu-menu-dropdown {
      background-color: #1e1e1e;
    }
  </style>

  <div class="sword-module-select-container">
    <select class="sword-module-select">
    </select>
  </div>
  `;

class SwordModuleSelect extends HTMLElement {
  constructor() {
    super();

    this.innerHTML = template.innerHTML;
    this.selectEl = this.querySelector('.sword-module-select');

    this._width = this.getAttribute('width');
    this._currentModuleId = this.getAttribute('current-module-id');
    this._name = this.getAttribute('name');

    if (this._name != null) {
      this.selectEl.setAttribute('name', this._name);
    }

    this.localize();
    this.initSelectMenu();
  }

  async init() {
  }

  async initSelectMenu() {
    var moduleSelect = null;

    moduleSelect = $(this.selectEl);
    moduleSelect.empty();

    let allLocalBibleModules = await ipcNsi.getAllLocalModules('BIBLE');
    let allLocalDictModules = await ipcNsi.getAllLocalModules('DICT');
    let allLocalCommentaryModules = await ipcNsi.getAllLocalModules('COMMENTARY');

    let modules = [...allLocalBibleModules, ...allLocalDictModules, ...allLocalCommentaryModules];

    modules.sort(this.sortModules);

    await this.addLanguageGroupsToSelectMenu(modules);

    if (modules == null) modules = [];

    this.addModulesToSelectMenu(modules);

    eventController.subscribe('on-locale-changed', locale => this.updateLanguages(locale, moduleSelect));

    moduleSelect.selectmenu({
      width: platformHelper.isMobile() ? 110 : undefined,
      change: () => {
        this.handleChange();
      }
    });
  }

  sortModules(a,b) {
    const isMobile = platformHelper.isMobile();
    let aDescription = isMobile ? a.name : a.description;
    aDescription = aDescription.toLowerCase();
  
    let bDescription = isMobile ? b.name : b.description;
    bDescription = bDescription.toLowerCase();
  
    if (aDescription < bDescription) {
      return -1;
    } else if (aDescription > bDescription) {
      return 1;
    } else {
      return 0;
    }
  }

  async addLanguageGroupsToSelectMenu(localModules=undefined) {
    var moduleSelect = $(this.selectEl);
    if (moduleSelect == null) {
      return;
    }

    var languages = await this.getLanguages('BIBLE', localModules);

    for (let i = 0; i < languages.length; i++) {
      let currentLang = languages[i];

      let newOptGroup = "<optgroup class='module-select-" + currentLang.languageCode + "-modules' label='" + currentLang.languageName + "'></optgroup>";
      moduleSelect.append(newOptGroup);
    }
  }

  async getLanguages(moduleType='BIBLE', localModules=undefined) {
    if (localModules == undefined) {
      localModules = await ipcNsi.getAllLocalModules(moduleType);
    }

    if (localModules == null) {
      return [];
    }
    
    var languages = [];
    var languageCodes = [];

    for (let i = 0; i < localModules.length; i++) {
      const module = localModules[i];
      const languageName = i18nHelper.getLanguageName(module.language);

      if (!languageCodes.includes(module.language)) {
        languages.push({
          'languageName': languageName,
          'languageCode': module.language
        });
        languageCodes.push(module.language);
      }
    }

    return languages;
  }

  addModulesToSelectMenu(modules) {
    var moduleSelect = this.selectEl;
    if (moduleSelect == null) {
      return;
    }

    for (let module of modules) {
      var currentTranslationEl = document.createElement('option');
      currentTranslationEl.value = module.name;

      if (platformHelper.isMobile()) {
        currentTranslationEl.innerText = module.name;
      } else {
        currentTranslationEl.innerText = module.description;
      }

      if (this._currentModuleId == module.name) {
        currentTranslationEl.selected = "selected";
      }

      var optGroup = moduleSelect.querySelector('.module-select-' + module.language + '-modules');
      optGroup.append(currentTranslationEl);
    }
  }

  updateLanguages(localeCode, moduleSelect) {
    if (moduleSelect === null) {
      return;
    }

    let optGroups = moduleSelect.find('optgroup');

    for (let i = 0; i < optGroups.length; i++) {
      let optgroup = optGroups[i];
      const code = optgroup.getAttribute('class').split('-')[2];
      optgroup.setAttribute('label', i18nHelper.getLanguageName(code, false, localeCode));
    }

    // Refresh the selectmenu widget
    moduleSelect.selectmenu();
  }

  async handleChange() {
    await waitUntilIdle();

    this.dispatchEvent(new CustomEvent("moduleChanged", {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail: { 
        module: this.selectEl.value
      }
    }));
  }

  localize() {
  }

  get value() {
    return this.selectEl.value;
  }
}

customElements.define('sword-module-select', SwordModuleSelect);
module.exports = SwordModuleSelect;