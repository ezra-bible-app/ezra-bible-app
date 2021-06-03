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
require('./assistant_checkbox.js');

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
    this._selectedLanguages = await ipcSettings.get('selectedLanguages', []);
    console.log('LANGS: done with init');
  }

  async connectedCallback() {
    this.appendChild(template.content);
    console.log('LANGS: started connectedCallback');
    
    this.querySelector('loading-indicator').show();
  
    const uiRepositories = this._repositories.map(rep => `<b>${rep}</b>`);
    this.querySelector('.intro').innerHTML = i18n.t("module-assistant.pick-languages-from-repos") + uiRepositories.join(', ');
  }

  set repositories(repos) {
    this._repositories = repos;
    console.log('LANGS: setting repos property');
    getAvailableLanguagesFromSelectedRepos(repos).then(async languagesByCategories => {
      console.log('LANGS: got all languages', languagesByCategories);
      
      const allLanguages = languagesByCategories.flat();
      const languageModuleCount = await ipcNsi.getAllLanguageModuleCount(repos, allLanguages, this.moduleType);
      this.listLanguages(languagesByCategories, languageModuleCount);
    }); 
  }

  get languages() {
    const selectedCheckboxes = Array.from(this.querySelectorAll('assistant-checkbox[checked]'));
    const selectedLanguages = selectedCheckboxes.map(cb => cb.code);

    ipcSettings.set('selectedLanguages', selectedLanguages);
    
    return selectedLanguages;
  }

  async listLanguages(languages, languageModuleCount) {
    console.log('listLanguages!');
    const [knownLanguages, unknownLanguages] = languages.map(langCategory => 
      langCategory.map(({languageCode, languageName}) => {
        return {
          code: languageCode,
          text: languageName,
        };
      })
    );

    this.appendChild(listCheckboxArray(knownLanguages, languageModuleCount, await this._selectedLanguages));

    var otherLanguagesHeader = "<p style='padding-top: 2em; clear: both; font-weight: bold;'>Other languages</p>";

    if (unknownLanguages.length > 0) {
      this.append(otherLanguagesHeader);
      this.appendChild(listCheckboxArray(unknownLanguages, languageModuleCount, await this._selectedLanguages));
    }

    this.querySelector('loading-indicator').hide();
  }
}

customElements.define('step-languages', StepLanguages);
module.exports = StepLanguages;

async function getAvailableLanguagesFromSelectedRepos(selectedRepositories) {
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

  knownLanguages = knownLanguages.sort(sortBy('languageName'));
  unknownLanguages = unknownLanguages.sort(sortBy('languageCode'));

  return [ knownLanguages, unknownLanguages ];
}

function sortBy(field) {
  return function(a, b) {
    if (a[field] < b[field]) {
      return -1;
    } else if (a[field] > b[field]) {
      return 1;
    }
    return 0;
  };
}

function listCheckboxArray(arr, counts, selected) {

  const checkboxes = arr.map(({code, text}) => 
    `<assistant-checkbox code="${code}" count="${counts[code]}" ${selected.includes(code) ? 'checked' : ''}>${text ? text : code}</assistant-checkbox>`
  );

  const template = html`
    <div style="display: grid; grid-template-columns: repeat(2, 1fr); grid-gap: 0.5em; padding: 0.5em;">
      ${checkboxes}
    </div>`;
  return template.content;
}
