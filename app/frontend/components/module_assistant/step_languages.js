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
const languageMapper = require('../../../lib/language_mapper.js');
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
    this._repositories = null;
    this._languages = null;
    this._allLanguageCodes = new Set();

    this._selectedLanguages = await ipcSettings.get('selectedLanguages', []);
    console.log('LANGS: done with init');
  }

  async connectedCallback() {
    this.appendChild(template.content);
    console.log('LANGS: started connectedCallback');
    
    this.querySelector('loading-indicator').show();
  
    const uiRepositories = this._repositories.map(rep => `<b>${rep}</b>`);
    this.querySelector('.intro').innerHTML = i18n.t("module-assistant.pick-languages-from-repos") + uiRepositories.join(', ');

    this.listLanguages(await this._languages);
  }

  set repositories(repos) {
    this._repositories = repos;
    console.log('LANGS: setting repos property');
    this._languages = this.getAvailableLanguagesFromRepos(repos); 
  }

  get languages() {
    const selectedCheckboxes = Array.from(this.querySelectorAll('assistant-checkbox[checked]'));
    const selectedLanguages = selectedCheckboxes.map(cb => cb.code);

    ipcSettings.set('selectedLanguages', selectedLanguages);
    
    return selectedLanguages;
  }

  async listLanguages(languages) {
    console.log('LANGS: listLanguages!');
    
    for(const category in languages) {
      const languageMap = languages[category];
      if (languageMap.size > 0) {
        this.appendChild(listCheckboxSection(languageMap, await this._selectedLanguages, i18n.t(`module-assistant.${category}`)));
      }
    }
    
    await this.updateLanguageCount();

    this.querySelector('loading-indicator').hide();
  }

  async updateLanguageCount() {
    if (this._allLanguageCodes.size === 0 || !this._repositories) {
      return;
    }

    const languageModuleCount = await ipcNsi.getAllLanguageModuleCount(this._repositories, [...this._allLanguageCodes], this.moduleType);
    console.log('LANGS: got languageModuleCount, trying to update', languageModuleCount);

    this.querySelectorAll('assistant-checkbox').forEach(checkbox => {
      console.log('updating', checkbox.code, languageModuleCount[checkbox.code]);
      checkbox.count = languageModuleCount[checkbox.code];
    });
  }

  async getAvailableLanguagesFromRepos(repositories) {
    console.log('LANGS: getAvailableLanguagesFromRepos');

    var appSystemLanguages = new Set([i18nController.getLocale(), i18nController.getSystemLocale(), ]);
    var bibleLanguages = new Set(['grc', 'hbo']);
    var mostSpeakingLanguages = new Set(['en', 'cmn', 'hi', 'es', 'arb', 'bn', 'fr', 'ru', 'pt', 'ur']); // source: https://en.wikipedia.org/wiki/List_of_languages_by_total_number_of_speakers
    const historicalLanguageTypes = new Set(['ancient', 'extinct', 'historical']);
  
    var languages = {
      'app-system-languages': new Map(),
      'bible-languages': new Map(),
      'most-speaking-languages': new Map(),
      'historical-languages': new Map(),
      'known-languages': new Map(),
      'other-languages': new Map(),
      'unknown-languages': new Map(),
    };

  
    for (const currentRepo of repositories) {
      var repoLanguages = await ipcNsi.getRepoLanguages(currentRepo, this.moduleType);
  
      for (const currentLanguageCode of repoLanguages) {
        const languageInfo = languageMapper.getLanguageDetails(currentLanguageCode, i18nController.getLocale());
  
        if (appSystemLanguages.has(languageInfo.languageCode)) {
          this.addLanguage(languages['app-system-languages'], languageInfo, currentLanguageCode);
        } else if (bibleLanguages.has(languageInfo.languageCode)) {
          this.addLanguage(languages['bible-languages'], languageInfo, currentLanguageCode);
        } else if (mostSpeakingLanguages.has(languageInfo.languageCode)) {
          this.addLanguage(languages['most-speaking-languages'], languageInfo, currentLanguageCode);
        } else if (historicalLanguageTypes.has(languageInfo.type)) {
          this.addLanguage(languages['historical-languages'], languageInfo, currentLanguageCode);
        } else if (languageInfo.localized) {
          this.addLanguage(languages['known-languages'], languageInfo, currentLanguageCode);
        } else if (languageInfo.languageName) {
          this.addLanguage(languages['other-languages'], languageInfo, currentLanguageCode);
        } else {
          console.log("Unknown lang:", languageInfo);
          this.addLanguage(languages['unknown-languages'], languageInfo, currentLanguageCode);          
        }

        this._allLanguageCodes.add(currentLanguageCode); 
      }
    }
  
    // knownLanguages = knownLanguages.sort(sortBy('text'));
    // unknownLanguages = unknownLanguages.sort(sortBy('code'));
  
    return languages;
  }

  addLanguage(languageMap, info, fullLanguageCode) {
    languageMap.set(fullLanguageCode, info.languageName);
    // if (languageMap.has(info.languageCode) && info.languageCode !== fullLanguageCode) {
    //   // TODO
    // } else {
    //   languageMap.set(info.languageCode, info.languageName);
    // }

  }
}

customElements.define('step-languages', StepLanguages);
module.exports = StepLanguages;


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

function listCheckboxSection(valuesMap, selected, sectionTitle = "") {

  var checkboxes = [];
  for (let [code, value] of valuesMap) {
    const text = value;
    const cb = `<assistant-checkbox code="${code}" ${selected.includes(code) ? 'checked' : ''}>${text ? text : code}</assistant-checkbox>`;
    checkboxes.push(cb);
  }

  const template = html`
    <h3>${sectionTitle}</h3>
    <div style="display: grid; grid-template-columns: repeat(2, 1fr); grid-gap: 0.5em; padding: 0.5em;">
      ${checkboxes}
    </div>`;
  return template.content;
}
