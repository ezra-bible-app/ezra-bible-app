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

const template = html`
<style>
</style>


<p class="intro"></p>   
<div class="update-view"> 
  <p i18n="module-assistant.updating-repository-data"></p>
  <div id="repo-update-progress-bar" class="progress-bar">
    <div class="progress-label" i18n="module-assistant.updating"></div>
  </div>
  <p class="loading-repos" i18n="module-assistant.loading-repositories"></p>
</div>  

<div class="info-view">
  <p style="clear: both; padding-top: 1em;">
    <span class="update-info"></span>
    <button id="update-repo-data" class="fg-button ui-state-default ui-corner-all" i18n="module-assistant.update-now"></button>
  </p>
</div>

<p id="update-failed" style="display: none" i18n="module-assistant.update-repository-data-failed"></p>
<p style="margin-top: 2em;" i18n="module-assistant.more-repo-information-needed"></p>
`;

class StepUpdateRepositories extends HTMLElement {
  constructor() {
    super();
    console.log('UPDATE: step constructor');
    this.lastUpdate = null;

    this.appendChild(template.content);
    this._localize();

    this._infoView = this.querySelector('.info-view');
    this._updateView = this.querySelector('.update-view');
  
    this.querySelector('#update-repo-data').addEventListener('click', async () => await this._updateRepositoryConfig());
  }

  async connectedCallback() {
    console.log('UPDATE: started connectedCallback');
  }

  async init() {
    if (await this._wasUpdated()) {
      this._showUpdateInfo();
    } else {
      this._updateRepositoryConfig();
    }
  }

  async _wasUpdated() {
    const repoConfigExists = await ipcNsi.repositoryConfigExisting();

    const lastUpdate = await ipcSettings.get('lastSwordRepoUpdate', undefined);
    
    if (repoConfigExists && lastUpdate !== undefined) {
      this.updateDate(new Date(Date.parse(lastUpdate))); 
      return true;
    }

    return false;
  }

  async _showUpdateInfo() {
    console.log('UPDATE: showUpdateInfo');
    this._updateView.style.display = 'none';
    this._infoView.style.display = 'block';

    this.querySelector('.update-info').textContent = i18n.t("module-assistant.repo-data-last-updated", { date: this.lastUpdate });
    uiHelper.configureButtonStyles(this);
  }

  async _updateRepositoryConfig() {
    console.log('UPDATE: updateRepositoryConfig');
    this._infoView.style.display = 'none';
    this._updateView.style.display = 'block';

    var listRepoTimeoutMs = 500;

    uiHelper.initProgressBar($('#repo-update-progress-bar'));
    var ret = await ipcNsi.updateRepositoryConfig((progress) => {
      var progressBar = $('#repo-update-progress-bar');
      var progressPercent = progress.totalPercent;
      progressBar.progressbar("value", progressPercent);
    });

    if (ret == 0) {
      const today = new Date();
      this.updateDate(today);
      await ipcSettings.set('lastSwordRepoUpdate', today);
      await assistantController.updateAllRepositoryData();
    } else {
      console.log("Failed to update the repository configuration!");
      listRepoTimeoutMs = 3000;
      this.querySelector('#update-failed').style.display = 'block';     
    }

    setTimeout(async () => { this._showUpdateInfo(); }, listRepoTimeoutMs);
  }

  updateDate(date) {
    this.lastUpdate = date.toLocaleDateString(i18nController.getLocale());
  }

  _localize() {
    let moduleTypeText = "";
    const moduleType = assistantController.get('moduleType');
    if (moduleType == "BIBLE") {
      moduleTypeText = i18n.t("module-assistant.module-type-bible");
    } else if (moduleType == "DICT") {
      moduleTypeText = i18n.t("module-assistant.module-type-dict");
    }
    this.querySelector('.intro').innerHTML = i18n.t("module-assistant.update-data-info-text", {module_type: moduleTypeText});

    assistantHelper.localize(this);
  }
}

customElements.define('step-update-repositories', StepUpdateRepositories);
module.exports = StepUpdateRepositories;
