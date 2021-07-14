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
require('./update_repositories.js');
require('../loading_indicator.js');
require('../generic/fuzzy_search.js');

const template = html`
<style>
  #language-step-wrapper {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  #language-list-wrapper {
    border-radius: 5px;
    flex-grow: 1;
  }
  #language-list-wrapper .intro {
    margin: 0 3em 1em;
    text-align: center;
  }
  #language-list-wrapper .update-repository-data-failed {
    text-align: center;
  }
  #language-list-wrapper fuzzy-search {
    display: block;
    text-align: end;
    margin-top: 1.5em;
    margin-inline-end: 2em;
    font-size: 0.8em;
  }
  #language-list-wrapper .search-result {
    height: auto;
    opacity: 1;
    transition: all 0.5s ease-in-out;
  }
</style>

<div id="language-step-wrapper">
  <update-repositories></update-repositories>

  <div id="language-list-wrapper" class="scrollable">
    <p class="intro" i18n="module-assistant.step-languages.select-language"></p> 
    <p class="assistant-note" i18n="module-assistant.step-languages.total-modules-language"></p>

    <loading-indicator></loading-indicator>
    <p class="loading-text" i18n="module-assistant.step-languages.loading-languages"></p>
    <p class="update-repository-data-failed error" style="display: none" i18n="module-assistant.update-data.update-repository-data-failed"></p>

    <div class="app-system-languages"></div>

    <fuzzy-search max-result="12" style="display: none;" title="search-menu.search" style="display: none;"></fuzzy-search>
    <div class="search-result"></div>

    <div class="all-languages"></div>
  </div>

</div>
`;

const SETTINGS_KEY = 'selectedLanguages';
const ICON_STAR = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><!-- Font Awesome Free 5.15.3 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) --><path d="M259.3 17.8L194 150.2 47.9 171.5c-26.2 3.8-36.7 36.1-17.7 54.6l105.7 103-25 145.5c-4.5 26.3 23.2 46 46.4 33.7L288 439.6l130.7 68.7c23.2 12.2 50.9-7.4 46.4-33.7l-25-145.5 105.7-103c19-18.5 8.5-50.8-17.7-54.6L382 150.2 316.7 17.8c-11.7-23.6-45.6-23.9-57.4 0z"/></svg>
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
  }

  connectedCallback() {
    console.log('LANGS: started connectedCallback', this.isConnected);
    this.appendChild(template.content.cloneNode(true));
    
    this._loading = this.querySelector('loading-indicator');
    this._loadingText = this.querySelector('.loading-text');
    this._errorText = this.querySelector('.update-repository-data-failed');
    this._appLanguages = this.querySelector('.app-system-languages');
    /**@type {import('../generic/fuzzy_search')} */
    this._search = this.querySelector('fuzzy-search');
    this._searchResults = this.querySelector('.search-result');
    this._allLanguages = this.querySelector('.all-languages');

    this._localize();

    /** @type {import('./update_repositories')} */
    this.updateRepositories = this.querySelector('update-repositories');

    this.addEventListener('itemChanged', (e) => this._handleCheckboxClick(e));
    this.addEventListener('searchResultsReady', (e) => this._handleSearchResult(e));

    assistantController.onStartRepositoriesUpdate(async () => await this.resetView());
    assistantController.onCompletedRepositoriesUpdate(async status => {
      if (status == 0) {
        this._languageData = await getAvailableLanguagesFromRepos(); 
        await this.listLanguages();
      } else {
        this._loadingText.style.display = 'none';
        this._loading.hide();
        this._errorText.style.display = 'block';
      }
    });

    this._savedLanguagesPromise = ipcSettings.get(SETTINGS_KEY, []);
  }

  async resetView() {
    console.log('LANGS: resetView');
    assistantController.init('selectedLanguages', []);

    this._allLanguages.innerHTML = '';
    this._searchResults.innerHTML = '';
    this._appLanguages.innerHTML = '';
    this._search.style.display = 'none';
    this._errorText.style.display = 'none';
    
    this._loading.show();
    this._loadingText.style.display = 'block';
  }

  async listLanguages() {
    console.log('LANGS: listLanguages!');
    
    if (!this._languageData) {
      return;
    }
    assistantController.init('selectedLanguages', await this._savedLanguagesPromise);
    assistantController.init('languageRepositories', this._languageData.languageRepositories);
    
    this._loadingText.style.display = 'none';
    
    const selectedLanguages = assistantController.get('selectedLanguages');

    this._appLanguages.append(assistantHelper.listCheckboxSection(this._languageData.appSystemLanguages,
                                                                  selectedLanguages, 
                                                                  i18n.t('module-assistant.step-languages.app-system-languages'),
                                                                  {extraIndent: true}));

    this._initSearch(this._languageData.allLanguages);

    const languages = this._languageData.languages;
    for(const category in languages) {
      
      if (languages[category].size > 0) {
        const sectionHeader = ['bible-languages', 'most-spoken-languages', 'historical-languages'].includes(category) 
          ? i18n.t(`module-assistant.step-languages.${category}`) : category === 'iso6391-languages' ? i18n.t('module-assistant.step-languages.other-languages') : undefined;
        this._allLanguages.append(assistantHelper.listCheckboxSection(languages[category], selectedLanguages, sectionHeader));
      }
    }
    
    await this._updateLanguageCount();
    this._loading.hide();
  }

  saveSelected() {
    ipcSettings.set(SETTINGS_KEY, [...assistantController.get('selectedLanguages')]);
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
    const repositories = assistantController.get('allRepositories');

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

    this._search.style.display = 'block';

    this._search.init([...this._languageData.allLanguages.values()], 
                      [{name: 'text', weight: 1}, 
                       {name: 'code', weight: 0.5}, 
                       {name: 'description', weight: 0.1}]);
  }

  _handleSearchResult(event) {
    const result = event.detail.results.map(r => r.item);

    this._searchResults.innerHTML = '';
    this._searchResults.append(assistantHelper.listCheckboxSection(result, 
                                                                   assistantController.get('selectedLanguages'), 
                                                                   i18n.t('module-assistant.step-languages.language-search-results')));
  }

  _localize() {
    var title = this._search && this._search.getAttribute('title');
    if (title) {
      this._search.setAttribute('title', i18n.t(title));
    }

    assistantHelper.localizeContainer(this, assistantController.get('moduleType'));    
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
    'most-spoken-languages': new Map(),
    'historical-languages': new Map(),
    'iso6391-languages': new Map(),
    'iso6392T-languages': new Map(),
    'iso6393-languages': new Map(),
    'unknown-languages': new Map(),
  };
  
  var allLanguages = new Map();
  var languageRepositories = {};

  const repositories = assistantController.get('allRepositories');

  console.log('LANGS: getAvailableLanguagesFromRepos: got repos', repositories);

  for (const currentRepo of repositories) {
    var repoLanguages = await ipcNsi.getRepoLanguages(currentRepo, assistantController.get('moduleType'));

    for (const currentLanguageCode of repoLanguages) {
      const languageInfo = languageMapper.getLanguageDetails(currentLanguageCode, i18nController.getLocale());

      let starred = false;

      if (appSystemLanguageCodes.has(languageInfo.languageCode)) {
        starred = true;
        addLanguage(appSystemLanguages, languageInfo, currentLanguageCode, starred);
      } 
      
      if (bibleLanguages.has(languageInfo.languageCode)) {
        addLanguage(languages['bible-languages'], languageInfo, currentLanguageCode, starred);
      } else if (mostSpeakingLanguages.has(languageInfo.languageCode)) {
        addLanguage(languages['most-spoken-languages'], languageInfo, currentLanguageCode, starred);
      } else if (historicalLanguageTypes.has(languageInfo.type)) {
        addLanguage(languages['historical-languages'], languageInfo, currentLanguageCode, starred);
      } else if (languageInfo.iso6391) {
        addLanguage(languages['iso6391-languages'], languageInfo, currentLanguageCode, starred);
      } else if (languageInfo.iso6392T) {
        addLanguage(languages['iso6392T-languages'], languageInfo, currentLanguageCode, starred);
      } else if (languageInfo.iso6393) {
        addLanguage(languages['iso6393-languages'], languageInfo, currentLanguageCode, starred);
      } else {
        console.log("Unknown lang:", currentLanguageCode, languageInfo);
        addLanguage(languages['unknown-languages'], languageInfo, currentLanguageCode, starred);          
      }

      addLanguage(allLanguages, languageInfo, currentLanguageCode, false); 

      languageRepositories[currentLanguageCode] = languageRepositories[currentLanguageCode] || [];
      languageRepositories[currentLanguageCode].push(currentRepo);
  
    }
  }

  return {
    appSystemLanguages,
    languages,
    allLanguages,
    languageRepositories,
  };
}

function addLanguage(languageMap, info, fullLanguageCode, starred=false, keyAsLanguageName=true) {
  var descriptionArr = [];
  if (info.languageRegion) {
    descriptionArr.push(info.languageRegion);
  }
  if (info.languageScript) {
    descriptionArr.push(info.languageScript);
  }

  const checkboxInfo = {
    code: fullLanguageCode,
    text: info.languageName,
    description: descriptionArr.join(' – ') 
  };
  if (starred) {
    checkboxInfo.icon = ICON_STAR;
  }
  
  const key = keyAsLanguageName ? info.languageName + (info.languageScript || '') + (info.languageRegion || '') : fullLanguageCode;
  languageMap.set(key, checkboxInfo);
}

async function getInstalledLanguages() {
  const installedModules = assistantController.get('installedModules');
  return Promise.all(installedModules.map(async moduleId => await swordModuleHelper.getModuleLanguage(moduleId)));
}