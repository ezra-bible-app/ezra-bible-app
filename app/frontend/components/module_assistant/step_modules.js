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
const assistantController = require('./assistant_controller.js');
const i18nHelper = require('../../helpers/i18n_helper.js');
const assistantHelper = require('./assistant_helper.js');
const UnlockDialog = require('./unlock_dialog.js');
require('../loading_indicator.js');


const ICON_LOCKED = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><!-- Font Awesome Free 5.15.3 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) --><path d="M400 224h-24v-72C376 68.2 307.8 0 224 0S72 68.2 72 152v72H48c-26.5 0-48 21.5-48 48v192c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V272c0-26.5-21.5-48-48-48zm-104 0H152v-72c0-39.7 32.3-72 72-72s72 32.3 72 72v72z"/></svg>';

const ICON_INFO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!-- Font Awesome Free 5.15.3 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) --><path d="M256 8C119.043 8 8 119.083 8 256c0 136.997 111.043 248 248 248s248-111.003 248-248C504 119.083 392.957 8 256 8zm0 110c23.196 0 42 18.804 42 42s-18.804 42-42 42-42-18.804-42-42 18.804-42 42-42zm56 254c0 6.627-5.373 12-12 12h-88c-6.627 0-12-5.373-12-12v-24c0-6.627 5.373-12 12-12h12v-64h-12c-6.627 0-12-5.373-12-12v-24c0-6.627 5.373-12 12-12h64c6.627 0 12 5.373 12 12v100h12c6.627 0 12 5.373 12 12v24z"/></svg>`;

const template = html`
<style>
  .feature-filter-wrapper {
    margin-bottom: 1em;
    display: none;
  }
  #module-list-intro {
    clear: both; 
    margin-bottom: 2em;
  }
  #module-step-wrapper {
    display: flex;
    height: 100%;
    margin-right: -2.5%;
    margin-top: -2.5%;
    overflow: hidden;
  }
  #module-list {
    overflow-y: auto;
    width: 50%;
    padding-right: 1em;
  }
  #module-info {
    display: block;
    width: 50%;
    overflow-y: auto !important;
    padding: 1em;
    position: relative;
    z-index: 10;
  }
  #module-info .background {
    position: absolute;
    z-index: -1;
    width: 17em;
    margin-top: -4em;
    margin-left: -4em;
    opacity: 0.1;
    fill: dimgray;
  }
</style>

<div id="module-step-wrapper">
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

    <p id="module-list-intro" class="intro"></p>

    <div id="filtered-module-list"></div>
  </div>

  <div id="module-info" class="scrollable">
    <div class="background">${ICON_INFO}</div>
    <div id="module-info-content"></div>
    <loading-indicator style="display: none"></loading-indicator>
  </div>
</div>
`;

/**
 * @module StepModules
 * component displays available for installation modules from selected repositories and languages
 * @example
 * <step-modules></step-modules>
 * @category Component
 */
class StepModules extends HTMLElement {
  get modules() {
    const selectedModules = assistantHelper.getSelelectedSettings(this);
    return selectedModules;
  }

  constructor() {
    super();
    console.log('MODULES: step constructor');

    /** @type {UnlockDialog} */
    this.unlockDialog = null;
  }

  async connectedCallback() {
    console.log('MODULES: started connectedCallback');
    this.appendChild(template.content.cloneNode(true));
    assistantHelper.localize(this);

    this.querySelectorAll('.module-feature-filter').forEach(checkbox => checkbox.addEventListener('click', async () => {
      this._listFilteredModules();
    }));

    const filteredModuleList = this.querySelector('#filtered-module-list');
    filteredModuleList.addEventListener('itemSelected', (e) => this._handleCheckboxClick(e));
    filteredModuleList.addEventListener('itemInfoRequested', (e) => this._handleInfoClick(e));
  }

  async listModules() {
    console.log('MODULES: listModules');

    const moduleType = assistantController.get('moduleType');
    if (moduleType == 'BIBLE') {
      this.querySelector("#bible-module-feature-filter").style.display = 'block';
    } else if (moduleType == 'DICT') {
      this.querySelector("#dict-module-feature-filter").style.display = 'block';
    }

    const uiRepositories = [...assistantController.get('selectedRepositories')].map(rep => `<b>${rep}</b>`);
    this.querySelector('.intro').innerHTML = `${i18n.t("module-assistant.the-selected-repositories")} (${uiRepositories.join(', ')}) 
      ${i18n.t("module-assistant.contain-the-following-modules")}`;

    await this._listFilteredModules();
  }

  async _listFilteredModules() {
    console.log('MODULES: listFilteredModules');

    const filteredModuleList = this.querySelector('#filtered-module-list');
    filteredModuleList.innerHTML = '';

    const headingsFilter = this.querySelector('#headings-feature-filter').checked;
    const strongsFilter = this.querySelector('#strongs-feature-filter').checked;

    const hebrewStrongsFilter = this.querySelector('#hebrew-strongs-dict-feature-filter').checked;
    const greekStrongsFilter = this.querySelector('#greek-strongs-dict-feature-filter').checked;

    const languageCodes = [...assistantController.get('selectedLanguages')];

    let renderHeader = false;
    if (languageCodes.length > 1) {
      renderHeader = true;
    }

    const repositories = [...assistantController.get('selectedRepositories')];

    for (const currentLanguageCode of languageCodes) {
      let currentLangModules = [];

      for (const currentRepo of repositories) {
        const currentRepoLangModules = await ipcNsi.getRepoModulesByLang(currentRepo,
                                                                         currentLanguageCode,
                                                                         assistantController.get('moduleType'),
                                                                         headingsFilter,
                                                                         strongsFilter,
                                                                         hebrewStrongsFilter,
                                                                         greekStrongsFilter);

        const modulesArr = currentRepoLangModules.map(swordModule => {
          let moduleInfo = {
            code: swordModule.name,
            text: `${swordModule.description} [${swordModule.name}]`,
            description: `${i18n.t('general.module-version')}: ${swordModule.version}; ${swordModule.repository}`,
          };

          if (swordModule.locked) {
            moduleInfo['icon'] = ICON_LOCKED;
            moduleInfo['title'] = i18n.t("module-assistant.module-lock-info");
            moduleInfo['locked'] = "locked";
            moduleInfo['unlock-info'] = swordModule.unlockInfo;
          }

          return moduleInfo;
        });

        // Append this repo's modules to the overall language list
        currentLangModules = currentLangModules.concat(modulesArr);
      }

      currentLangModules.sort(assistantHelper.sortByText);

      const langModuleSection = assistantHelper.listCheckboxSection(currentLangModules,
                                                                    new Set(assistantController.get('installedModules')),
                                                                    renderHeader ? i18nHelper.getLanguageName(currentLanguageCode) : undefined,
                                                                    { columns: 1, disableSelected: true, info: true, extraIndent: true });
      filteredModuleList.append(langModuleSection);
    }
  }

  _handleCheckboxClick(event) {
    const checkbox = event.target;
    const moduleId = event.detail.code;
    const checked = event.detail.checked;
    
    if (checked) {
      assistantController.add('selectedModules', moduleId);
    } else {
      assistantController.remove('selectedModules', moduleId);
    }

    if (!checkbox.hasAttribute('locked')) {
      return;
    }
    
    if (checked) {
      console.log('MODULE checkbox locked checked', event.detail, event.target);
      this.unlockDialog.show(moduleId, checkbox.getAttribute('unlock-info'), checkbox);
    } else {
      // Checkbox unchecked!
      // Reset the unlock key for this module
      this.unlockDialog.resetKey(moduleId);
    }
  }

  _handleInfoClick(event) {
    
    const moduleCode = event.detail.code;

    const moduleInfo = this.querySelector('#module-info');
    // moduleInfo.style.display = 'block';
    // event.target.scrollIntoView({behavior: 'smooth', block: 'end'});

    const moduleInfoContent = moduleInfo.querySelector('#module-info-content');
    const loadingIndicator = moduleInfo.querySelector('loading-indicator');

    moduleInfoContent.innerHTML = '';
    loadingIndicator.show();

    setTimeout(async () => {
      const swordModuleHelper = require('../../helpers/sword_module_helper.js');
      moduleInfoContent.innerHTML = await swordModuleHelper.getModuleInfo(moduleCode, true);
      loadingIndicator.hide();
    }, 200);

  }
}

customElements.define('step-modules', StepModules);
module.exports = StepModules;