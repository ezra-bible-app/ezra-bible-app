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


const { html } = require('../../helpers/ezra_helper.js');
const i18nHelper = require('../../helpers/i18n_helper.js');
const assistantHelper = require('./assistant_helper.js');
require('../loading_indicator.js');

const template = html`
<style>
  .feature-filter-wrapper {
    margin-bottom: 1em;
    display: none;
  }
  .intro {
    clear: both; 
    margin-bottom: 2em;
  }
</style>

<div id="module-list" class="scrollable">

  <p><b i18n="module-assistant.module-feature-filter"></b></p>

  <div id="bible-module-feature-filter" class="feature-filter-wrapper">
    <input id="headings-feature-filter" class="module-feature-filter" type="checkbox"/> 
    <label id="headings-feature-filter-label" for="headings-feature-filter" i18n="general.module-headings"></label>

    <input id="strongs-feature-filter" class="module-feature-filter" type="checkbox"/>
    <label id="strongs-feature-filter-label" for="strongs-feature-filter" i18n="general.module-strongs"></label>
  </div>

  <div id="dict-module-feature-filter" class="feature-filter-wrapper">
    <input id="hebrew-strongs-dict-feature-filter" class="module-feature-filter" type="checkbox"/>
    <label id="hebrew-strongs-dict-feature-filter-label" for="hebrew-strongs-dict-feature-filter" i18n="general.module-hebrew-strongs-dict"></label>
    
    <input id="greek-strongs-dict-feature-filter" class="module-feature-filter" type="checkbox"/>
    <label id="greek-strongs-dict-feature-filter-label" for="greek-strongs-dict-feature-filter" i18n="general.module-greek-strongs-dict"></label>
  </div>

  <p class="intro"></p>

  <div id="filtered-module-list"></div>
</div>

<div id="module-info" class="scrollable">
  <div id="module-info-content" i18n="module-assistant.click-to-show-detailed-module-info"></div>
  <loading-indicator style="display: none"></loading-indicator>
</div>
<p class="intro"></p>   
`;

class StepModules extends HTMLElement {
  constructor() {
    super();
    console.log('MODULES: step constructor');
    this.init();
  }

  async init() {
    this.moduleType = null;
    this.repositories = [];
    this.languageCodes = [];
    this._installedModules == null;

    console.log('MODULES: done with init');
  }

  set languages(codes) {
    console.log('MODULES: set languages prop');
    this.languageCodes = codes;

    this.uiLanguages = codes.map(code => {
      const languageName = i18nHelper.getLanguageName(code);
      return `<b>${languageName ? languageName : code}</b>`;
    });
  }

  async connectedCallback() {
    this.appendChild(template.content);
    this.localize();
    console.log('MODULES: started connectedCallback');

    this.querySelectorAll('.module-feature-filter').forEach(checkbox => checkbox.addEventListener('click', async () => {
      this.listFilteredModules();
    }));

    this._installedModules = await app_controller.translation_controller.getInstalledModules(this.moduleType);

    this.listModules();
  }

  get modules() {
    const selectedModules = assistantHelper.getSelelectedSettings(this);
    return selectedModules;
  }

  async listModules() {
    console.log('MODULES: listModules');
  
    if (this.moduleType == 'BIBLE') {
      this.querySelector("#bible-module-feature-filter").style.display = 'block';
    } else if (this.moduleType == 'DICT') {
      this.querySelector("#dict-module-feature-filter").style.display = 'block';
    }

    const uiRepositories = this.repositories.map(rep => `<b>${rep}</b>`);
    this.querySelector('.intro').innerHTML = `${i18n.t("module-assistant.the-selected-repositories")} (${uiRepositories.join(', ')}) 
      ${i18n.t("module-assistant.contain-the-following-modules")} (${this.uiLanguages.join(', ')})`;

    await this.listFilteredModules();
  }

  async listFilteredModules() {
    console.log('MODULES: listFilteredModules');

    var filteredModuleList = this.querySelector('#filtered-module-list');
    filteredModuleList.innerHTML = '';

    const headingsFilter = this.querySelector('#headings-feature-filter').checked;
    const strongsFilter = this.querySelector('#strongs-feature-filter').checked;

    const hebrewStrongsFilter = this.querySelector('#hebrew-strongs-dict-feature-filter').checked;
    const greekStrongsFilter = this.querySelector('#greek-strongs-dict-feature-filter').checked;

    let renderHeader = false;
    if (this.languageCodes.length > 1) {
      renderHeader = true;
    }

    for (let i = 0; i < this.languageCodes.length; i++) {
      const currentLanguage = this.languageCodes[i];
      const currentUiLanguage = this.uiLanguages[i];
      let currentLangModules = [];

      for (let j = 0; j < this.repositories.length; j++) {
        const currentRepo = this.repositories[j];
        let currentRepoLangModules = await ipcNsi.getRepoModulesByLang(currentRepo,
                                                                       currentLanguage,
                                                                       this.moduleType,
                                                                       headingsFilter,
                                                                       strongsFilter,
                                                                       hebrewStrongsFilter,
                                                                       greekStrongsFilter);

        // Append this repo's modules to the overall language list
        currentLangModules = currentLangModules.concat(currentRepoLangModules);
      }

      const modulesArr = currentLangModules.map(mod => ({
        code: mod.name,
        text: mod.description,
      }));
      modulesArr.sort(assistantHelper.sortByText);

      filteredModuleList.appendChild(assistantHelper.listCheckboxSection(modulesArr, 
                                                                         this._installedModules, 
                                                                         renderHeader ? currentUiLanguage : undefined, 
                                                                         {columns: 1, disableSelected: true}));
      // await this.listLanguageModules(currentUiLanguage, currentLangModules, renderHeader);
    }

    const moduleInfo = this.querySelector('#module-info');
    const moduleInfoContent = moduleInfo.querySelector('#module-info-content');
    const loadingIndicator = moduleInfo.querySelector('loading-indicator');

    filteredModuleList.querySelectorAll('.bible-module-info').forEach(el => el.addEventListener('click', function () {
      const moduleCode = el.textContent;
      
      moduleInfoContent.innerHTML = '';
      
      loadingIndicator.show();

      setTimeout(async () => {
        const swordModuleHelper = require('../../helpers/sword_module_helper.js');
        moduleInfoContent.innerHTML = await swordModuleHelper.getModuleInfo(moduleCode, true);
        loadingIndicator.hide();
      }, 200);
    }));

    $(filteredModuleList).find('.module-checkbox, .label').bind('mousedown', async (event) => {
      var checkbox = null;

      if (event.target.classList.contains('module-checkbox')) {
        checkbox = $(event.target);
      } else {
        checkbox = $(event.target).closest('.selectable-translation-module').find('.module-checkbox');
      }

      const moduleId = checkbox.parent().find('.bible-module-info').text();

      try {
        const swordModule = await ipcNsi.getRepoModule(moduleId);

        if (checkbox.prop('checked') == false) {
          if (swordModule.locked) {
            this.showUnlockDialog(swordModule, checkbox); // FIXME move to different module
          }
        } else {
          if (swordModule.locked) {
            // Checkbox unchecked!
            // Reset the unlock key for this module
            $('#unlock-key-input').val('');
            this._unlockKeys[moduleId] = '';   // FIXME move to different module
          }
        }
      } catch (e) {
        console.warn("Got exception while trying to check module unlock status: " + e);
      }
    });
  }

  async listLanguageModules(lang, modules, renderHeader) {
    const translationList = this.querySelector('#filtered-module-list');

    if (renderHeader) {
      const languageHeader = "<p style='font-weight: bold; margin-top: 2em;'>" + lang + "</p>";
      translationList.insertAdjacentHTML('beforeend', languageHeader);
    }

    for (const currentModule of modules) {
      let checkboxDisabled = "";
      let labelClass = "label";
      const moduleInstalled = await this.isModuleInstalled(currentModule.name);

      if (moduleInstalled) {
        checkboxDisabled = "disabled='disabled' checked";
        labelClass = "disabled-label";
      }

      let moduleTitle = "";
      if (currentModule.locked) {
        const moduleLockInfo = i18n.t("module-assistant.module-lock-info");
        moduleTitle = "title='" + moduleLockInfo + "'";
      }

      var currentModuleElement = `
        <p class="selectable-translation-module">
          <input class="module-checkbox" type="checkbox" ${checkboxDisabled}>
          <span ${moduleTitle} class="${labelClass}" id="${currentModule.name}">${currentModule.description}</span>&nbsp;&nbsp;
          [<span class="bible-module-info">${currentModule.name}</span>]
          ${currentModule.locked ? '<img style="margin-left: 0.5em; margin-bottom: -0.4em;" src="images/lock.png" width="20" height="20"/>' : ''}
        </p>`;

      translationList.insertAdjacentHTML('beforeend', currentModuleElement);
    }
  }

  localize() {
    this.querySelectorAll('[i18n]').forEach(element => {
      element.innerHTML = i18n.t(element.getAttribute('i18n'));
    });
  }
}

customElements.define('step-modules', StepModules);
module.exports = StepModules;