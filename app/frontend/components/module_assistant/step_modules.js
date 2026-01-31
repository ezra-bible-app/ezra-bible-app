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
const assistantController = require('./assistant_controller.js');
const i18nHelper = require('../../helpers/i18n_helper.js');
const assistantHelper = require('./assistant_helper.js');
require('../generic/loading_indicator.js');


const ICON_INFO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!-- Font Awesome Free 5.15.3 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) --><path d="M256 8C119.043 8 8 119.083 8 256c0 136.997 111.043 248 248 248s248-111.003 248-248C504 119.083 392.957 8 256 8zm0 110c23.196 0 42 18.804 42 42s-18.804 42-42 42-42-18.804-42-42 18.804-42 42-42zm56 254c0 6.627-5.373 12-12 12h-88c-6.627 0-12-5.373-12-12v-24c0-6.627 5.373-12 12-12h12v-64h-12c-6.627 0-12-5.373-12-12v-24c0-6.627 5.373-12 12-12h64c6.627 0 12 5.373 12 12v100h12c6.627 0 12 5.373 12 12v24z"/></svg>`;

var unlockInfo = {};

const template = html`
<style>
  #module-step-wrapper {
    display: flex;
    height: 100%;
    border-radius: 5px;
    overflow: hidden;
  }
  #module-list#module-list {
    width: 100%;
    padding-right: 1em;
  }
  .feature-filter-wrapper {
    margin-bottom: 1em;
    display: none;
  }
  #module-list > p:first-child {
    margin-top: 0;
  }
  #module-list-intro {
    clear: both; 
    margin-bottom: 2em;
  }

  #module-info {
    overflow-y: auto;
    display: block;
    padding: 1em;
    position: relative;
    z-index: 10;
    color: #696969;
    width: 100%;
  }
  .darkmode--activated #module-info, .darkmode--activated #module-info p {
    color: #929292;
  }
  #module-info .background {
    position: absolute;
    z-index: -1;
    width: 17em;
    margin-top: -4em;
    margin-left: -4em;
    opacity: 0.1;
    fill: #696969;
  }

  #dict-feature-select {
    border-radius: 3px;
  }
</style>

<div id="module-step-wrapper">
  <div id="module-list" class="scrollable">
    <p id="module-list-intro" class="intro" i18n="module-assistant.step-modules.select-module"></p>
    
    <p><b id="module-display-preferences-header" i18n="module-assistant.step-modules.module-display-preferences"></b></p>

    <div id="bible-module-feature-filter" class="feature-filter-wrapper">
      <label>
        <input id="headings-feature-filter" class="module-feature-filter" type="checkbox"/> 
        <span id="headings-feature-filter-label" for="headings-feature-filter" i18n="$t(module-assistant.step-modules.module-with, {'feature_type': 'general.module-headings'})"></span>
      </label>
      <label>
        <input id="strongs-feature-filter" class="module-feature-filter" type="checkbox"/>
        <span id="strongs-feature-filter-label" for="strongs-feature-filter" i18n="$t(module-assistant.step-modules.module-with, {'feature_type': 'general.module-strongs'})"></span>
      </label>
    </div>

    <div id="dict-module-feature-filter" class="feature-filter-wrapper">
      <select id="dict-feature-select" class="module-feature-filter">
        <option value="all" i18n="module-assistant.step-modules.all-modules"></option>
        <option value="regular-dicts" i18n="module-assistant.step-modules.regular-dicts"></option>
        <option value="hebrew-strongs" i18n="$t(module-assistant.step-modules.module-with, {'feature_type': 'general.module-hebrew-strongs-dict'})"></option>
        <option value="greek-strongs" i18n="$t(module-assistant.step-modules.module-with, {'feature_type': 'general.module-greek-strongs-dict'})"></option>
      </select>
    </div>

    <div id="filtered-module-list"></div>
  </div>  

  <div id="module-info" class="scrollable">
    <div class="background">${ICON_INFO}</div>
    <div id="module-info-content" i18n="module-assistant.step-modules.show-detailed-module-info"></div>
    <loading-indicator style="display: none"></loading-indicator>
  </div>
</div>
`;

/**
 * component displays available for installation modules from selected repositories and languages
 * @module StepModules
 * @example
 * <step-modules></step-modules>
 * @category Component
 */
class StepModules extends HTMLElement {

  constructor() {
    super();

    /** @type {import('./unlock_dialog')} */
    this.unlockDialog = null;
  }

  async connectedCallback() {
    this.appendChild(template.content.cloneNode(true));
    assistantHelper.localizeContainer(this, assistantController.get('moduleType'));
    const moduleType = assistantController.get('moduleType');

    if (moduleType == 'DICT') {
      this.querySelector('#dict-feature-select').addEventListener('change', async () => {
        this._listFilteredModules();
      });
    } else {
      this.querySelectorAll('.module-feature-filter').forEach(checkbox => checkbox.addEventListener('click', async () => {
        this._listFilteredModules();
      }));
    }
    
    const filteredModuleList = this.querySelector('#filtered-module-list');
    filteredModuleList.addEventListener('itemChanged', (e) => this._handleCheckboxClick(e));
  }
  
  async listModules() {
    const moduleType = assistantController.get('moduleType');
    if (moduleType == 'BIBLE') {
      this.querySelector("#bible-module-feature-filter").style.display = 'block';
    } else if (moduleType == 'DICT') {
      this.querySelector("#dict-module-feature-filter").style.display = 'block';
    } else {
      this.querySelector("#module-display-preferences-header").style.display = 'none';
    }

    await this._listFilteredModules();
  }

  async _listFilteredModules() {
    const filteredModuleList = this.querySelector('#filtered-module-list');
    filteredModuleList.innerHTML = '';

    const headingsFilter = this.querySelector('#headings-feature-filter').checked;
    const strongsFilter = this.querySelector('#strongs-feature-filter').checked;

    const dictFeatureSelect = this.querySelector('#dict-feature-select').value;
    const regularDictFilter = dictFeatureSelect === 'regular-dicts';
    const hebrewStrongsFilter = dictFeatureSelect === 'hebrew-strongs';
    const greekStrongsFilter = dictFeatureSelect === 'greek-strongs';

    const languageCodes = [...assistantController.get('selectedLanguages')].sort((codeA, codeB) => {
      return assistantHelper.sortByText(i18nHelper.getLanguageName(codeA), i18nHelper.getLanguageName(codeB));
    });

    let renderHeader = false;
    if (languageCodes.length > 1) {
      renderHeader = true;
    }

    const repositories = [...assistantController.get('selectedRepositories')];

    const installedModules = new Set(assistantController.get('installedModules'));

    const sectionOptions = {columns: 1, 
                            rowGap: '1.5em',
                            extraIndent: true, 
                            info: true};

    for (const language of languageCodes) {
      let modules = [];

      if (regularDictFilter) {
        modules = await getModulesByLang(language, 
                                         repositories, 
                                         installedModules, 
                                         false, 
                                         false, 
                                         false,
                                         false);
        let filteredModules = new Map();

        modules.forEach((module) => {
          if (!module.hasGreekStrongsKeys && !module.hasHebrewStrongsKeys) {
            filteredModules.set(module.code, module);
          }
        });

        modules = filteredModules;

      } else {
        modules = await getModulesByLang(language, 
                                         repositories, 
                                         installedModules, 
                                         headingsFilter, 
                                         strongsFilter, 
                                         hebrewStrongsFilter, 
                                         greekStrongsFilter);
      }

      
      if (modules.size > 0) {
        const langModuleSection = assistantHelper.listCheckboxSection(modules,
                                                                      installedModules,
                                                                      renderHeader ? i18nHelper.getLanguageName(language) : undefined,
                                                                      sectionOptions);
        filteredModuleList.append(langModuleSection);
        filteredModuleList.querySelectorAll('.module-info-button').forEach(element => {
          element.addEventListener('click', (e) => this._handleInfoClick(e));
        });
      }  
    }
  }

  _handleCheckboxClick(event) {
    const checkbox = event.target;
    const moduleId = event.detail.code;
    const checked = event.detail.checked;
    const repository = checkbox.getAttribute('repository');

    if (!checkbox.hasAttribute('locked')) {

      this._handleModuleToggling(checked, moduleId, repository, checkbox);

    } else {
      if (checked) {
        this.unlockDialog.show(moduleId, unlockInfo[moduleId], checkbox, () => {
          this._handleModuleToggling(checked, moduleId, repository, checkbox);
        });
      } else {
        // Checkbox unchecked!
        // Reset the unlock key for this module
        this.unlockDialog.resetKey(moduleId);
        this._handleModuleToggling(checked, moduleId, repository, checkbox);
      }
    }
  }

  _handleModuleToggling(checked, moduleId, repository, checkbox) {
    if (checked) {
      // Check if this module ID is already selected (possibly from a different repository)
      const selectedModules = assistantController.get('selectedModules');
      if (selectedModules.has(moduleId)) {
        const existingRepo = selectedModules.get(moduleId);
        if (existingRepo !== repository) {
          // Module with same ID already selected from different repo - prevent selection
          checkbox.checked = false;
          const position = platformHelper.getIziPosition();
          
          iziToast.warning({
            title: i18n.t('module-assistant.step-modules.duplicate-module-title'),
            message: i18n.t('module-assistant.step-modules.duplicate-module-message', { moduleId: moduleId, repository: existingRepo }),
            position: position,
            timeout: 10000
          });
          return;
        }
      }
      assistantController.add('selectedModules', moduleId, repository);
    } else {
      assistantController.remove('selectedModules', moduleId);
    }
  }

  _handleInfoClick(event) {

    const checkbox = event.currentTarget.parentElement.firstElementChild;
    const moduleCode = checkbox.code;
    const repositoryName = checkbox.getAttribute('repository');

    const moduleInfo = this.querySelector('#module-info');
    if (moduleInfo.getAttribute('code') !== moduleCode) {
      moduleInfo.setAttribute('code', moduleCode);

      const moduleInfoContent = moduleInfo.querySelector('#module-info-content');
      const loadingIndicator = moduleInfo.querySelector('loading-indicator');

      moduleInfoContent.innerHTML = '';
      loadingIndicator.show();

      setTimeout(async () => {
        const swordModuleHelper = require('../../helpers/sword_module_helper.js');
        moduleInfoContent.innerHTML = await swordModuleHelper.getModuleInfo(moduleCode, true, true, repositoryName);
        loadingIndicator.hide();
      }, 100);
    }  
  }
}

customElements.define('step-modules', StepModules);
module.exports = StepModules;

async function getModulesByLang(languageCode, repositories, installedModules, headingsFilter, strongsFilter, hebrewStrongsFilter, greekStrongsFilter) {
  let currentLangModules = new Map();
  const currentModuleType = assistantController.get('moduleType');

  for (const currentRepo of repositories) {
    const currentRepoLangModules = await ipcNsi.getRepoModulesByLang(currentRepo,
                                                                     languageCode,
                                                                     currentModuleType,
                                                                     headingsFilter,
                                                                     strongsFilter,
                                                                     hebrewStrongsFilter,
                                                                     greekStrongsFilter);
    
    const hiddenModules = [
      'GerHfa2002',     // The GerHfa2002 (Hoffnung für alle) is excluded from the list, since you cannot purchase an unlock key anymore.
      'GerHfaLex2002',  // The GerHfaLex2002 (Hoffnung für alle Lexikon) is excluded from the list, since you cannot purchase an unlock key anymore.
      'Personal',       // The Personal Commentary module is not useful in the context of Ezra Bible App.
      'NaveLinked'      // The NaveLinked Dictionary module does not work in the context of Ezra Bible App.
    ];

    // We do not support these categories
    const unsupportedCategories = [
      'Images',
      'Maps',
      'Daily Devotional'
    ];

    for (const swordModule of currentRepoLangModules) {

      if (hiddenModules.includes(swordModule.name)) {
        continue;
      }

      if (unsupportedCategories.includes(swordModule.category)) {
        continue;
      }

      // Exclude Morphology modules from the list in case of dictionary modules
      if (currentModuleType == 'DICT' && swordModule.description.indexOf('Morph') != -1) {
        continue;
      }

      let moduleInfo = {
        code: swordModule.name,
        text: `${swordModule.description} [${swordModule.name}]`,
        description: `${swordModule.repository}; ${i18n.t('general.module-version')}: ${swordModule.version}; ${i18n.t("general.module-size")}: ${Math.round(swordModule.size / 1024)} KB`,
        repository: swordModule.repository,
        hasHebrewStrongsKeys: swordModule.hasHebrewStrongsKeys,
        hasGreekStrongsKeys: swordModule.hasGreekStrongsKeys
      };

      if (swordModule.locked) {
        unlockInfo[swordModule.name] = swordModule.unlockInfo;

        moduleInfo['icon'] = 'lock';
        moduleInfo['locked'] = "locked";
        moduleInfo['title'] = assistantHelper.localizeText("module-assistant.unlock.module-lock-info", 
                                                           currentModuleType);
      }
      
      if (installedModules.has(swordModule.name)) {
        moduleInfo['disabled'] = true;
        moduleInfo['title'] = assistantHelper.localizeText("module-assistant.step-modules.module-already-installed", 
                                                           currentModuleType);
      }

      currentLangModules.set(swordModule.description, moduleInfo);
    }
  }

  return currentLangModules;
}