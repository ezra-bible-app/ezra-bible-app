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
const languageMapper = require('../../../lib/language_mapper.js');
const assistantHelper = require('./assistant_helper.js');
const swordModuleHelper = require('../../helpers/sword_module_helper.js');
require('../loading_indicator.js');

const template = html`
<style>
</style>
<loading-indicator></loading-indicator>
<p class="intro"></p>   
`;

class StepLanguages extends HTMLElement {
  get languages() {
    const selectedLanguages = assistantHelper.getSelelectedSettings(this);

    ipcSettings.set('selectedLanguages', selectedLanguages);
    
    return selectedLanguages;
  }

  constructor() {
    super();
    console.log('LANGS: step constructor');
    this.init();
  }

  init() {
    this._allLanguageCodes = new Set();
    this._repositories = assistantController.get('allRepositories');
    
    this._languageData = getAvailableLanguagesFromRepos(); 
    this._selectedLanguages = ipcSettings.get('selectedLanguages', []);

    console.log('LANGS: done with init');
  }

  async connectedCallback() {
    this.appendChild(template.content);
    console.log('LANGS: started connectedCallback');
    
    this.querySelector('loading-indicator').show();
  
    const uiRepositories = (await this._repositories).map(rep => `<b>${rep}</b>`);
    this.querySelector('.intro').innerHTML = i18n.t("module-assistant.pick-languages-from-repos") + uiRepositories.join(', ');

    this.listLanguages((await this._languageData).languages);
  }

  async listLanguages(languages) {
    console.log('LANGS: listLanguages!');
    
    for(const category in languages) {
      const languageArr = languages[category];
      if (languageArr.length > 0) {
        this.appendChild(assistantHelper.listCheckboxSection(languageArr, await this._selectedLanguages, i18n.t(`module-assistant.${category}`)));
      }
    }
    
    await this.updateLanguageCount();

    this.querySelector('loading-indicator').hide();
  }

  async updateLanguageCount() {
    const allLanguageCodes = (await this._languageData).allLanguageCodes;
    if (allLanguageCodes.size === 0 || !this._repositories) {
      return;
    }

    const languageModuleCount = await ipcNsi.getAllLanguageModuleCount(await this._repositories, 
                                                                       [...allLanguageCodes], 
                                                                       assistantController.get('moduleType'));
    console.log('LANGS: got languageModuleCount, trying to update', languageModuleCount);

    this.querySelectorAll('assistant-checkbox').forEach(checkbox => {
      checkbox.count = languageModuleCount[checkbox.code];
    });
  }
}

customElements.define('step-languages', StepLanguages);
module.exports = StepLanguages;

async function getAvailableLanguagesFromRepos() {
  console.log('LANGS: getAvailableLanguagesFromRepos');

  var appSystemLanguages = new Set([i18nController.getLocale(), i18nController.getSystemLocale(), ...(await getInstalledLanguages())]);
  var bibleLanguages = new Set(['grc', 'hbo']);
  var mostSpeakingLanguages = new Set(['en', 'zh', 'hi', 'es', 'ar', 'bn', 'fr', 'ru', 'pt', 'ur']); // source: https://en.wikipedia.org/wiki/List_of_languages_by_total_number_of_speakers
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
  
  var allLanguageCodes = new Set();

  const repositories = await assistantController.get('allRepositories');
  for (const currentRepo of repositories) {
    var repoLanguages = await ipcNsi.getRepoLanguages(currentRepo, assistantController.get('moduleType'));

    for (const currentLanguageCode of repoLanguages) {
      const languageInfo = languageMapper.getLanguageDetails(currentLanguageCode, i18nController.getLocale());

      if (appSystemLanguages.has(languageInfo.languageCode)) {
        addLanguage(languages['app-system-languages'], languageInfo, currentLanguageCode);
      } else if (bibleLanguages.has(languageInfo.languageCode)) {
        addLanguage(languages['bible-languages'], languageInfo, currentLanguageCode);
      } else if (mostSpeakingLanguages.has(languageInfo.languageCode)) {
        addLanguage(languages['most-speaking-languages'], languageInfo, currentLanguageCode);
      } else if (historicalLanguageTypes.has(languageInfo.type)) {
        addLanguage(languages['historical-languages'], languageInfo, currentLanguageCode);
      } else if (languageInfo.localized) {
        addLanguage(languages['known-languages'], languageInfo, currentLanguageCode);
      } else if (languageInfo.languageName) {
        addLanguage(languages['other-languages'], languageInfo, currentLanguageCode);
      } else {
        console.log("Unknown lang:", currentLanguageCode, languageInfo);
        addLanguage(languages['unknown-languages'], languageInfo, currentLanguageCode);          
      }

      allLanguageCodes.add(currentLanguageCode); 
    }
  }

  for(const category in languages) { 
    const languageArr = [...languages[category].values()];
    languages[category] = languageArr.sort(assistantHelper.sortByText);
  }

  return {
    languages,
    allLanguageCodes
  };
}

function addLanguage(languageMap, info, fullLanguageCode) {
  var descriptionArr = [];
  if (info.languageRegion) {
    descriptionArr.push(info.languageRegion);
  }
  if (info.languageScript) {
    descriptionArr.push(info.languageScript);
  }
  languageMap.set(fullLanguageCode,
                  {code: fullLanguageCode,
                   text: info.languageName,
                   description: descriptionArr.join(' – ') });
}

async function getInstalledLanguages() {
  const installedModules = await assistantController.get('installedModules');
  return Promise.all(installedModules.map(async moduleId => await swordModuleHelper.getModuleLanguage(moduleId)));
}