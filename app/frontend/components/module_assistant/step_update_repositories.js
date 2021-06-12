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
const assistantHelper = require('./assistant_helper.js');
require('../loading_indicator.js');

const template = html`
<style>
</style>

<loading-indicator></loading-indicator>

<div class="update-view"> 
  <p i18n="module-assistant.updating-repository-data"></p>
  <div id="repo-update-progress-bar" class="progress-bar">
    <div class="progress-label" i18n="module-assistant.updating"></div>
  </div>
  <p id="update-failed" style="display: none" i18n="module-assistant.update-repository-data-failed"></p>
</div>  

<p class="loading-repos" i18n="module-assistant.loading-repositories"></p>

<div class="info-view">
  <p class="intro"></p>   
  <p style="clear: both; padding-top: 1em;">
    <span class="update-info"></span>
    <button id="update-repo-data" class="fg-button ui-state-default ui-corner-all" i18n="module-assistant.update-now"></button>
  </p>
  <p style="margin-top: 2em;" i18n="module-assistant.more-repo-information-needed"></p>
</div>
`;

class StepUpdateRepositories extends HTMLElement {
  constructor() {
    super();
    console.log('UPDATE: step constructor');
    this.lastUpdate = null;
  }

  async connectedCallback() {
    this.appendChild(template.content);
    this.localize();
    console.log('UPDATE: started connectedCallback');
    
    this.loadingIndicator = this.querySelector('loading-indicator');
    this.infoView = this.querySelector('.info-view');
    this.updateView = this.querySelector('.update-view');
    this.repositoryList = this.querySelector('.repository-list');

    this.loadingIndicator.show();
  
    this.querySelector('#update-repo-data').addEventListener('click', async () => {
      await this.updateRepositoryConfig();
    });

    if (await this.wasUpdated()) {
      this.showUpdateInfo();
    } else {
      this.updateRepositoryConfig();
    }
  }

  async wasUpdated() {
    const lastUpdate = await ipcSettings.get('lastSwordRepoUpdate', undefined);
    
    if (lastUpdate !== undefined) {
      this.lastUpdate = new Date(Date.parse(lastUpdate)).toLocaleDateString(i18nController.getLocale());
      return true;
    }

    return false;
  }

  async showUpdateInfo() {
    console.log('UPDATE: showUpdateInfo');
    this.updateView.style.display = 'none';

    this.infoView.style.display = 'block';

    this.querySelector('.update-info').textContent = i18n.t("module-assistant.repo-data-last-updated", { date: this.lastUpdate });
    uiHelper.configureButtonStyles(this);
    this.querySelector('.loading-repos').style.display = 'none';
  }

  async updateRepositoryConfig() {
    console.log('UPDATE: updateRepositoryConfig');

    var listRepoTimeoutMs = 500;
    var repoConfigExisting = await ipcNsi.repositoryConfigExisting();

    if (!repoConfigExisting) {
      this.infoView.style.display = 'none';
      this.updateView.style.display = 'block';
      this.loadingIndicator.show();
      this.querySelector('loading-repos').style.display = 'block';

      uiHelper.initProgressBar($('#repo-update-progress-bar'));

      var ret = await ipcNsi.updateRepositoryConfig((progress) => {
        var progressBar = $('#repo-update-progress-bar');
        var progressPercent = progress.totalPercent;
        progressBar.progressbar("value", progressPercent);
      });

      if (ret == 0) {
        await ipcSettings.set('lastSwordRepoUpdate', new Date());
      } else {
        console.log("Failed to update the repository configuration!");
        listRepoTimeoutMs = 3000;
        this.querySelector('#update-failed').style.display = 'block';     
      }
    }

    setTimeout(async () => { this.showUpdateInfo(); }, listRepoTimeoutMs);
  }

  localize() {
    let moduleTypeText = "";
    const moduleType = assistantController.get('moduleType');
    if (moduleType == "BIBLE") {
      moduleTypeText = i18n.t("module-assistant.module-type-bible");
    } else if (moduleType == "DICT") {
      moduleTypeText = i18n.t("module-assistant.module-type-dict");
    }
    this.querySelector('.intro').innerHTML = i18n.t("module-assistant.repo-selection-info-text", {module_type: moduleTypeText});

    assistantHelper.localize(this);
  }
}

customElements.define('step-update-repositories', StepUpdateRepositories);
module.exports = StepUpdateRepositories;
