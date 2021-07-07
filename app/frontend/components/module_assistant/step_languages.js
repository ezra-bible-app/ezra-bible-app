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


const { html, sleep } = require('../../helpers/ezra_helper.js');
const assistantController = require('./assistant_controller.js');
const i18nController = require('../../controllers/i18n_controller.js');
const languageMapper = require('../../../lib/language_mapper.js');
const assistantHelper = require('./assistant_helper.js');
const swordModuleHelper = require('../../helpers/sword_module_helper.js');
require('../loading_indicator.js');
require('../generic/fuzzy_search.js');

const template = html`
<style>
  step-languages .intro {
    margin: 0 5em 1em;
    text-align: center;
  }
  step-languages fuzzy-search {
    display: block;
    text-align: end;
    margin-top: 1.5em;
    margin-inline-end: 2em;
    font-size: 0.8em;
  }
  step-languages .search-result {
    height: auto;
    opacity: 1;
    transition: all 0.5s ease-in-out;
  }
</style>

<loading-indicator></loading-indicator>
<p class="intro" i18n="module-assistant.pick-languages-from-repos"></p> 
<div class="app-system-languages"></div>
<fuzzy-search max-result="12" style="display: none;" title="search-menu.search"></fuzzy-search>
<div class="search-result"></div>
<div class="all-languages"></div>
`;

/**
 * @module StepLanguages
 * component retrieves, sorts and displays all available languages for module installation
 * @example
 * <step-languages></step-languages>
 * @category Component
 */
class StepLanguages extends HTMLElement {
  
  constructor() {
    super();
    console.log('LANGS: step constructor');
    this._initialized = false;
  }

  connectedCallback() {
    console.log('LANGS: started connectedCallback', this.isConnected);
    this.appendChild(template.content.cloneNode(true));
    this._localize();
    this.querySelector('loading-indicator').show();
    this.addEventListener('itemChanged', (e) => this._handleCheckboxClick(e));
    this.addEventListener('searchResultsReady', (e) => this._handleSearchResult(e));
  }

  async init() {
    console.log('LANGS: init');
    
    assistantController.init('selectedLanguages', await ipcSettings.get('selectedLanguages', []));

    this._languageData = await getAvailableLanguagesFromRepos(); 
    
    this._initialized = true;
  }

  async listLanguages() {
    console.log('LANGS: listLanguages!');
    if (!this._initialized) {
      await this.init();
    }
    
    const selectedLanguages = assistantController.get('selectedLanguages');

    const appSystemLanguages = [...this._languageData.appSystemLanguages.values()].sort(assistantHelper.sortByText);
    this.querySelector('.app-system-languages').append(assistantHelper.listCheckboxSection(appSystemLanguages,
                                                                                           selectedLanguages, 
                                                                                           i18n.t('module-assistant.app-system-languages')));

    this._initSearch(this._languageData.allLanguages);

    const languageContainer = this.querySelector('.all-languages');

    const languages = this._languageData.languages;
    for(const category in languages) {
      const languageArr = [...languages[category].values()].sort(assistantHelper.sortByText);
      
      if (languageArr.length > 0) {
        const sectionHeader = ['bible-languages', 'most-speaking-languages', 'historical-languages'].includes(category) 
          ? i18n.t(`module-assistant.${category}`) : category === 'iso6391-languages' ? i18n.t('module-assistant.other-languages') : undefined;
        languageContainer.append(assistantHelper.listCheckboxSection(languageArr, selectedLanguages, sectionHeader));
      }
    }
    
    await this._updateLanguageCount();

    this.querySelector('loading-indicator').hide();
  }

  saveSelected() {
    ipcSettings.set('selectedLanguages', [...assistantController.get('selectedLanguages')]);
  }

  _handleCheckboxClick(event) {
    const languageCode = event.detail.code;
    const checked = event.detail.checked;

    this.querySelectorAll(`assistant-checkbox[code="${languageCode}"]`).forEach(checkbox => {
      if (checkbox !== event.target) {
        checkbox.checked = checked;
      }
    });
    
    if (checked) {
      assistantController.add('selectedLanguages', languageCode);
    } else {
      assistantController.remove('selectedLanguages', languageCode);
    }
  }

  async _updateLanguageCount() {
    const allLanguageCodes = [...this._languageData.allLanguages.keys()];

    if (allLanguageCodes.length === 0) {
      return;
    }
    const repositories = await assistantController.get('allRepositories');

    const languageModuleCount = await ipcNsi.getAllLanguageModuleCount(repositories, 
                                                                       allLanguageCodes, 
                                                                       assistantController.get('moduleType'));
    console.log('LANGS: got languageModuleCount, trying to update', languageModuleCount);

    this.querySelectorAll('assistant-checkbox').forEach(checkbox => {
      checkbox.count = languageModuleCount[checkbox.code];
    });
  }

  _initSearch(languages) {
    if (languages.size < 25) { // no need for search if language count is small
      return;
    }

    /**@type {import('../generic/fuzzy_search')} */
    const search = this.querySelector('fuzzy-search');
    search.style.display = 'block';

    search.init([...this._languageData.allLanguages.values()], 
                [{name: 'text', weight: 1}, 
                 {name: 'code', weight: 0.5}, 
                 {name: 'description', weight: 0.1}]);
  }

  _handleSearchResult(event) {
    const result = event.detail.results.map(r => r.item);

    const resultContainer = this.querySelector('.search-result');
    resultContainer.innerHTML = '';
    resultContainer.append(assistantHelper.listCheckboxSection(result, 
                                                               assistantController.get('selectedLanguages'), 
                                                               i18n.t('module-assistant.search-result')));
  }

  _localize() {
    const search = this.querySelector('fuzzy-search');
    var title = search && search.getAttribute('title');
    if (title) {
      search.setAttribute('title', i18n.t(title));
    }
    assistantHelper.localize(this);    
  }
}

customElements.define('step-languages', StepLanguages);
module.exports = StepLanguages;

async function getAvailableLanguagesFromRepos() {
  console.log('LANGS: getAvailableLanguagesFromRepos');

  var appSystemLanguageCodes = new Set([i18nController.getLocale(), i18nController.getSystemLocale(), ...(await getInstalledLanguages())]);
  var bibleLanguages = new Set(['grc', 'hbo']);
  var mostSpeakingLanguages = new Set(['en', 'zh', 'hi', 'es', 'ar', 'bn', 'fr', 'ru', 'pt', 'ur']); // source: https://en.wikipedia.org/wiki/List_of_languages_by_total_number_of_speakers
  const historicalLanguageTypes = new Set(['ancient', 'extinct', 'historical']);

  var appSystemLanguages = new Map();
  var languages = {
    'bible-languages': new Map(),
    'most-speaking-languages': new Map(),
    'historical-languages': new Map(),
    'iso6391-languages': new Map(),
    'iso6392T-languages': new Map(),
    'iso6393-languages': new Map(),
    'unknown-languages': new Map(),
  };
  
  var allLanguages = new Map();
  var repositories = [];

  while (repositories.length < 1) {
    repositories = await assistantController.get('allRepositories');
    await sleep(100);
    // FIXME: Add some sort of timeout to handle situation when repositories are never populated correctly.
  }

  console.log('LANGS: getAvailableLanguagesFromRepos: got repos', repositories);

  for (const currentRepo of repositories) {
    var repoLanguages = await ipcNsi.getRepoLanguages(currentRepo, assistantController.get('moduleType'));

    for (const currentLanguageCode of repoLanguages) {
      const languageInfo = languageMapper.getLanguageDetails(currentLanguageCode, i18nController.getLocale());

      if (appSystemLanguageCodes.has(languageInfo.languageCode)) {
        addLanguage(appSystemLanguages, languageInfo, currentLanguageCode);
      } 
      
      if (bibleLanguages.has(languageInfo.languageCode)) {
        addLanguage(languages['bible-languages'], languageInfo, currentLanguageCode);
      } else if (mostSpeakingLanguages.has(languageInfo.languageCode)) {
        addLanguage(languages['most-speaking-languages'], languageInfo, currentLanguageCode);
      } else if (historicalLanguageTypes.has(languageInfo.type)) {
        addLanguage(languages['historical-languages'], languageInfo, currentLanguageCode);
      } else if (languageInfo.iso6391) {
        addLanguage(languages['iso6391-languages'], languageInfo, currentLanguageCode);
      } else if (languageInfo.iso6392T) {
        addLanguage(languages['iso6392T-languages'], languageInfo, currentLanguageCode);
      } else if (languageInfo.iso6393) {
        addLanguage(languages['iso6393-languages'], languageInfo, currentLanguageCode);
      } else {
        console.log("Unknown lang:", currentLanguageCode, languageInfo);
        addLanguage(languages['unknown-languages'], languageInfo, currentLanguageCode);          
      }

      addLanguage(allLanguages, languageInfo, currentLanguageCode); 
    }
  }

  return {
    appSystemLanguages,
    languages,
    allLanguages
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
  const installedModules = assistantController.get('installedModules');
  return Promise.all(installedModules.map(async moduleId => await swordModuleHelper.getModuleLanguage(moduleId)));
}