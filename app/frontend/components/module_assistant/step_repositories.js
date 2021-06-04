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
const i18nController = require('../../controllers/i18n_controller.js');
const assistantHelper = require('./assistant_helper.js');
require('../loading_indicator.js');

const template = html`
<style>
</style>

<loading-indicator></loading-indicator>

<div class="update-view" style="display: none">
  <p i18n="module-assistant.updating-repository-data"></p>
  <div id="repo-update-progress-bar" class="progress-bar">
    <div class="progress-label" i18n="module-assistant.updating"></div>
  </div>
  <p id="update-failed" style="display: none" i18n="module-assistant.update-repository-data-failed"></p>
</div>  

<p class="loading-repos" i18n="module-assistant.loading-repositories"></p>

<div class="list-view">
  <p class="intro"></p>   
  <div class="repository-list"></div>
  <p style="clear: both; padding-top: 1em;">
    <span class="update-info"></span>
    <button id="update-repo-data" class="fg-button ui-state-default ui-corner-all" i18n="module-assistant.update-now"></button>
  </p>
  <p style="margin-top: 2em;" i18n="module-assistant.more-repo-information-needed"></p>
</div>
`;

class StepRepositories extends HTMLElement {
  constructor() {
    super();
    console.log('REPOS: step constructor');
    this.init();
  }

  async init() {
    this.moduleType = null;
    this.allRepositories = [];
    this.languages = [];
    this.lastUpdate = null;

    this.selectedRepositories = await ipcSettings.get('selectedRepositories', []);
    console.log('REPOS: done with init');
  }

  async connectedCallback() {
    this.appendChild(template.content);
    this.localize();
    console.log('REPOS: started connectedCallback');
    
    this.loadingIndicator = this.querySelector('loading-indicator');
    this.listView = this.querySelector('.list-view');
    this.updateView = this.querySelector('.update-view');
    this.repositoryList = this.querySelector('.repository-list');

    this.loadingIndicator.show();
  
    this.querySelector('#update-repo-data').addEventListener('click', async () => {
      await this.updateRepositoryConfig();
    });

    if (await this.wasUpdated()) {
      this.listRepositories();
    } else {
      this.updateRepositoryConfig();
    }
  }

  get repositories() {
    const selectedRepositories = assistantHelper.getSelelectedSettings(this);

    ipcSettings.set('selectedRepositories', selectedRepositories);

    return selectedRepositories;
  }

  async wasUpdated() {
    const lastUpdate = await ipcSettings.get('lastSwordRepoUpdate', undefined);
    
    if (lastUpdate !== undefined) {
      this.lastUpdate = new Date(Date.parse(lastUpdate)).toLocaleDateString(i18nController.getLocale());
      return true;
    }

    return false;
  }

  async listRepositories() {
    console.log('REPOS: listRepositories');
    this.updateView.style.display = 'none';

    let moduleTypeText = "";
    if (this.moduleType == "BIBLE") {
      moduleTypeText = i18n.t("module-assistant.module-type-bible");
    } else if (this.moduleType == "DICT") {
      moduleTypeText = i18n.t("module-assistant.module-type-dict");
    }
    this.querySelector('.intro').innerHTML = i18n.t("module-assistant.repo-selection-info-text", {module_type: moduleTypeText});

    this.listView.style.display = 'block';

    const repositoriesArr = await Promise.all(
      this.allRepositories.map(async repo => ({
        code: repo,
        count: await this.getRepoModuleCount(repo)
      })));

    this.repositoryList.innerHTML = '';
    this.repositoryList.appendChild(assistantHelper.listCheckboxSection(repositoriesArr, await this.selectedRepositories));

    this.querySelector('.update-info').textContent = i18n.t("module-assistant.repo-data-last-updated", { date: this.lastUpdate });
    uiHelper.configureButtonStyles('#module-settings-assistant-add-p-1');

    this.querySelector('loading-indicator').hide();
    this.querySelector('.loading-repos').style.display = 'none';
  }

  async updateRepositoryConfig() {
    console.log('REPOS: updateRepositoryConfig');

    var listRepoTimeoutMs = 500;
    var repoConfigExisting = await ipcNsi.repositoryConfigExisting();

    if (!repoConfigExisting) {
      this.listView.style.display = 'none';
      this.updateView.style.display = 'block';
      this.loadingIndicator.show();
      this.querySelector('loading-repos').style.display = 'block';

      uiHelper.initProgressBar($('#repo-update-progress-bar'));

      try {
        await ipcNsi.updateRepositoryConfig((progress) => {
          const progressbar = $('#repo-update-progress-bar');
          const progressPercent = progress.totalPercent;
          progressbar.progressbar("value", progressPercent);
        });

        await ipcSettings.set('lastSwordRepoUpdate', new Date());
      } catch(e) {
        console.log("Caught exception while updating repository config: " + e);
        listRepoTimeoutMs = 3000;
        this.querySelector('#update-failed').style.display = 'block';
      }
    }

    setTimeout(async () => { this.listRepositories(); }, listRepoTimeoutMs);
  }

  localize() {
    this.querySelectorAll('[i18n]').forEach(element => {
      element.innerHTML = i18n.t(element.getAttribute('i18n'));
    });
  }

  async getRepoModuleCount(repo) {
    const allRepoModules = await ipcNsi.getAllRepoModules(repo, this.moduleType);
    const langModules = allRepoModules.filter(module => this.languages.includes(module.language));
    return langModules.length;
  }

}

customElements.define('step-repositories', StepRepositories);
module.exports = StepRepositories;