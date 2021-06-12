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
const i18nController = require('../../controllers/i18n_controller.js');
const i18nHelper = require('../../helpers/i18n_helper.js');
const assistantHelper = require('./assistant_helper.js');
require('../loading_indicator.js');

const template = html`
<style>
</style>

<loading-indicator></loading-indicator>

<p class="loading-repos" i18n="module-assistant.loading-repositories"></p>

<div class="list-view">
  <p class="intro"></p>   
  <div class="repository-list"></div>
</div>
`;

class StepRepositories extends HTMLElement {
  constructor() {
    super();
    console.log('REPOS: step constructor');
    this.init();
  }

  async init() {
    this.lastUpdate = null;

    this.selectedRepositories = await ipcSettings.get('selectedRepositories', []);
    console.log('REPOS: done with init');
  }

  async connectedCallback() {
    this.appendChild(template.content);
    assistantHelper.localize(this);
    console.log('REPOS: started connectedCallback');
    
    this.loadingIndicator = this.querySelector('loading-indicator');
    this.listView = this.querySelector('.list-view');
    this.updateView = this.querySelector('.update-view');
    this.repositoryList = this.querySelector('.repository-list');

    this.loadingIndicator.show();
  
    this.listRepositories();
  }

  get repositories() {
    const selectedRepositories = assistantHelper.getSelelectedSettings(this);

    ipcSettings.set('selectedRepositories', selectedRepositories);

    return selectedRepositories;
  }

  async listRepositories() {
    console.log('REPOS: listRepositories');

    let moduleTypeText = "";
    const moduleType = assistantController.get('moduleType');
    if (moduleType == "BIBLE") {
      moduleTypeText = i18n.t("module-assistant.module-type-bible");
    } else if (moduleType == "DICT") {
      moduleTypeText = i18n.t("module-assistant.module-type-dict");
    }
    this.querySelector('.intro').innerHTML = i18n.t("module-assistant.repo-selection-info-text", {module_type: moduleTypeText});

    const repositoriesArr = await Promise.all(
      (await assistantController.get('allRepositories')).map(getRepoModuleDetails));

    this.repositoryList.innerHTML = '';
    this.repositoryList.appendChild(assistantHelper.listCheckboxSection(repositoriesArr, await this.selectedRepositories));

    this.querySelector('loading-indicator').hide();
    this.querySelector('.loading-repos').style.display = 'none';
  }
}

customElements.define('step-repositories', StepRepositories);
module.exports = StepRepositories;

async function getRepoModuleDetails(repo) {
  const moduleType = assistantController.get('moduleType');
  const allRepoModules = await ipcNsi.getAllRepoModules(repo, moduleType);
  const selectedLanguages = await assistantController.get('selectedLanguages');
  
  var repoLanguageCodes = new Set();
  var count = 0;

  for(const module of allRepoModules) {
    if (selectedLanguages.includes(module.language)) {
      count++;
      repoLanguageCodes.add(module.language);
    }
  }  

  const repoLanguages = [...repoLanguageCodes].map(lang => i18nHelper.getLanguageName(lang)).sort(assistantHelper.sortByText);

  return {
    code: repo,
    description: repoLanguages.join(', '),
    count,
  };
}
