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
require('../loading_indicator.js');

const template = html`
<style>
</style>
<loading-indicator></loading-indicator>
<p class="intro"></p>   
`;

class StepLanguages extends HTMLElement {
  constructor() {
    super();
    console.log('LANGS: step constructor');
    this.init();
  }

  async init() {
    this.moduleType = null;
    this._repositories = [];
    this._languages = null;
    this.selectedLanguages = await ipcSettings.get('selectedLanguages', []);
    console.log('LANGS: done with init');
  }

  async connectedCallback() {
    this.innerHTML = template.innerHTML;
    console.log('LANGS: started connectedCallback');
    
    this.querySelector('loading-indicator').show();
  
    const uiRepositories = this._repositories.map(rep => `<b>${rep}</b>`);
    this.querySelector('.intro').innerHTML = i18n.t("module-assistant.pick-languages-from-repos") + uiRepositories.join(', ');
  }

  set repositories (repos) {
    this._repositories = repos;
    console.log('LANGS: setting repos property');
    this.getAvailableLanguagesFromSelectedRepos(repos).then(async languagesByCategories => {
      console.log('LANGS: got all languages');
      
      const allLanguages = languagesByCategories.flat();
      const languageModuleCount = await ipcNsi.getAllLanguageModuleCount(repos, allLanguages, this.moduleType);
      this.listLanguages(languagesByCategories, languageModuleCount);
    }); 
  }

  async listLanguages(languages, languageModuleCount) {
    console.log('listLanguages!');
    const [knownLanguages, unknownLanguages] = languages;

    await this.listLanguageArray(knownLanguages, languageModuleCount);

    var otherLanguagesHeader = "<p style='padding-top: 2em; clear: both; font-weight: bold;'>Other languages</p>";

    if (unknownLanguages.length > 0) {
      this.append(otherLanguagesHeader);
      await this.listLanguageArray(unknownLanguages, languageModuleCount);
    }

    this.querySelector('loading-indicator').hide();
  }

  async listLanguageArray(languageArray, languageModuleCount) {

    for (const {languageCode, languageName} of languageArray) {
      const isChecked = (await this.selectedLanguages).includes(languageCode);
      const translationCount = (await languageModuleCount)[languageCode];
      
      if(translationCount > 0) {
        const languageHTML = `
          <p style="float: left; width: 17em;">
            <input type="checkbox" ${isChecked ? 'checked' : ''}>
            <span class="label" id="${languageCode}">${languageName} (${translationCount})</span>
          </p>`;
        this.insertAdjacentHTML('beforeend', languageHTML);
      }
    }
  }

  async getAvailableLanguagesFromSelectedRepos(selectedRepositories) {
    var knownLanguageCodes = [];
    var unknownLanguageCodes = [];
    var knownLanguages = [];
    var unknownLanguages = [];

    for (var i = 0;  i < selectedRepositories.length; i++) {
      var currentRepo = selectedRepositories[i];
      var repoLanguages = await ipcNsi.getRepoLanguages(currentRepo, this._currentModuleType);

      for (let j = 0; j < repoLanguages.length; j++) {
        const currentLanguageCode = repoLanguages[j];
        const currentLanguageName = i18nHelper.getLanguageName(currentLanguageCode);

        if (currentLanguageName) {
          if (!knownLanguageCodes.includes(currentLanguageCode)) {
            knownLanguageCodes.push(currentLanguageCode);
            knownLanguages.push({
              "languageCode": currentLanguageCode,
              "languageName": currentLanguageName
            });
          }
        } else {
          console.log("Unknown lang: " + currentLanguageCode);
          if (!unknownLanguageCodes.includes(currentLanguageCode)) {
            unknownLanguageCodes.push(currentLanguageCode);
            unknownLanguages.push({
              "languageCode": currentLanguageCode,
              "languageName": currentLanguageCode
            });
          }
        }
      }
    }

    knownLanguages = knownLanguages.sort(this.sortBy('languageName'));
    unknownLanguages = unknownLanguages.sort(this.sortBy('languageCode'));

    return [ knownLanguages, unknownLanguages ];
  }

  sortBy(field) {
    return function(a, b) {
      if (a[field] < b[field]) {
        return -1;
      } else if (a[field] > b[field]) {
        return 1;
      }
      return 0;
    };
  }

}

customElements.define('step-languages', StepLanguages);
module.exports = StepLanguages;