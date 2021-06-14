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
  #module-list {
    height: 60%;
  }
  #module-info {
    height: 40%;
    margin-top: 0.5em;
    border-top: 1px solid gray;
    padding: 1em;
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

const ICON_LOCKED = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><!-- Font Awesome Free 5.15.3 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) --><path d="M400 224h-24v-72C376 68.2 307.8 0 224 0S72 68.2 72 152v72H48c-26.5 0-48 21.5-48 48v192c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V272c0-26.5-21.5-48-48-48zm-104 0H152v-72c0-39.7 32.3-72 72-72s72 32.3 72 72v72z"/></svg>';

class StepModules extends HTMLElement {
  get modules() {
    const selectedModules = assistantHelper.getSelelectedSettings(this);
    return selectedModules;
  }

  constructor() {
    super();
    console.log('MODULES: step constructor');
  }

  async connectedCallback() {
    this.appendChild(template.content);
    assistantHelper.localize(this);
    console.log('MODULES: started connectedCallback');

    this.querySelectorAll('.module-feature-filter').forEach(checkbox => checkbox.addEventListener('click', async () => {
      this.listFilteredModules();
    }));

    this.filteredModuleList = this.querySelector('#filtered-module-list');
    this.filteredModuleList.addEventListener('itemSelected', (e) => this.handleCheckboxClick(e));
    this.filteredModuleList.addEventListener('itemInfoRequested', (e) => this.handleInfoClick(e));

    this.listModules();
  }

  async listModules() {
    console.log('MODULES: listModules');

    const moduleType = assistantController.get('moduleType');
    if (moduleType == 'BIBLE') {
      this.querySelector("#bible-module-feature-filter").style.display = 'block';
    } else if (moduleType == 'DICT') {
      this.querySelector("#dict-module-feature-filter").style.display = 'block';
    }

    const uiRepositories = (await assistantController.get('selectedRepositories')).map(rep => `<b>${rep}</b>`);
    this.querySelector('.intro').innerHTML = `${i18n.t("module-assistant.the-selected-repositories")} (${uiRepositories.join(', ')}) 
      ${i18n.t("module-assistant.contain-the-following-modules")}`;

    await this.listFilteredModules();
  }

  async listFilteredModules() {
    console.log('MODULES: listFilteredModules');

    this.filteredModuleList.innerHTML = '';

    const headingsFilter = this.querySelector('#headings-feature-filter').checked;
    const strongsFilter = this.querySelector('#strongs-feature-filter').checked;

    const hebrewStrongsFilter = this.querySelector('#hebrew-strongs-dict-feature-filter').checked;
    const greekStrongsFilter = this.querySelector('#greek-strongs-dict-feature-filter').checked;

    const languageCodes = await assistantController.get('selectedLanguages');

    let renderHeader = false;
    if (languageCodes.length > 1) {
      renderHeader = true;
    }

    const repositories = await assistantController.get('selectedRepositories');

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
                                                                    await assistantController.get('installedModules'),
                                                                    renderHeader ? i18nHelper.getLanguageName(currentLanguageCode) : undefined,
                                                                    { columns: 1, disableSelected: true, info: true });
      this.filteredModuleList.appendChild(langModuleSection);
    }
  }

  handleCheckboxClick(event) {
    const checkbox = event.target;
    const moduleId = event.detail.code;

    if (!checkbox.hasAttribute('locked')) {
      return;
    }
    
    if (event.detail.checked) {
      console.log('MODULE checkbox locked checked', event.detail, event.target);
      this.unlockDialog.show(moduleId, checkbox.getAttribute('unlock-info'), checkbox);
    } else {
      // Checkbox unchecked!
      // Reset the unlock key for this module
      this.unlockDialog.resetKey(moduleId);
    }
  }

  handleInfoClick(event) {
    const moduleCode = event.target.code;

    const moduleInfo = this.querySelector('#module-info');
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