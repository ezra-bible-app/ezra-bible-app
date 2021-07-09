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
  .update-repository-data-wrapper {
    padding: 5px 2.5%;
    height: 3em;
    box-sizing: border-box;
    display: grid;
    place-items: center;
    background: var(--widget-bg-color, #eee);
    border-radius: 5px;
    margin-bottom: 1em;
  }
  #update-repository-data-info {
    text-align: center;
  }
  #update-repository-data-info button {
    height: 2em;
    padding-left: 1em;
    padding-right: 1em;
    margin-left: 1em;
  }
  #update-repository-data-progress {
    width: 100%;
  }
  #update-repository-data-progress .progress-bar, #update-repository-data-failed{
    margin: 0;
  }
  #update-repository-data-failed {
    color: red;
  }
</style>

<section class="update-repository-data-wrapper">
  
  <div id="update-repository-data-info" class="info-view">
    <span class="update-info"></span>
    <button id="update-repo-data" class="fg-button ui-state-default ui-corner-all" i18n="module-assistant.update-now"></button>
  </div>
  
  <div id="update-repository-data-progress" class="update-view"> 
    <div id="repo-update-progress-bar" class="progress-bar">
      <div class="progress-label" i18n="module-assistant.updating-repo-data"></div>
    </div>
  </div>  
  <p id="update-repository-data-failed" style="display: none" i18n="module-assistant.update-repository-data-failed"></p>

</section>
`;

class UpdateRepositories extends HTMLElement {
  constructor() {
    super();
    console.log('UPDATE: step constructor');
    this._lastUpdate = null;
    this._initialized = false;
  }

  async connectedCallback() {
    console.log('UPDATE: started connectedCallback');
    if (!this._initialized) {
      this.appendChild(template.content.cloneNode(true));
  
      this.querySelector('#update-repo-data').addEventListener('click', async () => await assistantController.updateRepositories());
      assistantController.onStartRepositoriesUpdate(() => this.prepareProgressBar());
      assistantController.onProgressRepositoriesUpdate(process => this.handleUpdateProgress(process));
      assistantController.onCompletedRepositoriesUpdate(result => this.updateDateInfo(result));
      this._initialized = true;
    }  

    assistantHelper.localize(this);
    if (assistantController.get('reposUpdated')) {
      this._showUpdateInfo();
    } else {
      await assistantController.updateRepositories();
    }
  }

  _showUpdateInfo() {
    console.log('UPDATE: showUpdateInfo');
    this._toggleViews('INFO');

    var date = assistantController.get('reposUpdated');
    if (date) {
      date = date.toLocaleDateString(i18nController.getLocale());
      this.querySelector('.update-info').textContent = i18n.t("module-assistant.repo-data-last-updated", { date });
    }
    uiHelper.configureButtonStyles(this);
  }

  prepareProgressBar() {
    this._toggleViews('UPDATE');
    uiHelper.initProgressBar($('#repo-update-progress-bar'));
  }

  handleUpdateProgress(progress) {
    const progressBar = this.querySelector('#repo-update-progress-bar');
    const progressPercent = progress.totalPercent;
    $(progressBar).progressbar("value", progressPercent);
  }

  updateDateInfo(result) {
    console.log('UPDATE: updateCompleted');

    if (result != 0) {
      console.log("Failed to update the repository configuration!");
      this._toggleViews('ERROR');
    }
    setTimeout(() => { this._showUpdateInfo(); }, result == 0 ? 500 : 3000);
  }

  _toggleViews(view='INFO') {
    const infoView = this.querySelector('.info-view');
    const updateView = this.querySelector('.update-view');
    const errorView = this.querySelector('#update-repository-data-failed');     
    if (view === 'UPDATE') {
      infoView.style.display = 'none';
      errorView.style.display = 'none';
      updateView.style.display = 'block';  
    } else if (view === 'ERROR') {
      updateView.style.display = 'none';
      infoView.style.display = 'none';
      errorView.style.display = 'block';
    } else {
      updateView.style.display = 'none';
      errorView.style.display = 'none';
      infoView.style.display = 'block';
    }
  }

}

customElements.define('update-repositories', UpdateRepositories);
module.exports = UpdateRepositories;
