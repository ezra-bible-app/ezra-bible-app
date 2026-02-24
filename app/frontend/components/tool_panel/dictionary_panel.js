/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2026 Ezra Bible App Development Team <contact@ezrabibleapp.net>

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

const eventController = require('../../controllers/event_controller.js');
const swordModuleHelper = require('../../helpers/sword_module_helper.js');
const ReferenceBoxHelper = require('./reference_box_helper.js');
const swordUrlHandler = require('../../helpers/sword_url_handler.js');

/**
 * The DictionaryPanel component implements a tool panel that shows dictionary entries from generic dictionaries.
 * It supports the handling of dictionary references and scripture references.
 * 
 * @category Component
 */
class DictionaryPanel {
  constructor() {
    this._initDone = false;
    this._currentKey = null;
    this._filterTimeout = null;

    eventController.subscribe('on-dictionary-panel-switched', (isOpen) => {
      if (isOpen && !this._initDone) {
        this.init();
      }

      if (isOpen) {
        setTimeout(() => {
          this.getKeyContainer().style.display = 'block';
        }, 50);
      } else {
        this.getKeyContainer().style.display = 'none';
      }
    });

    
    eventController.subscribeMultiple(['on-dictionary-added', 'on-dictionary-removed'], (moduleCode) => {
      this.refreshDictionaries();
    });

    this._referenceBoxHelper = new ReferenceBoxHelper(this.getPanel(), this.getReferenceBox());

    document.getElementById('dictionary-panel-info-button').addEventListener('click', () => {
      const selectedModuleCode = this.getSelectElement().value;
      app_controller.info_popup.showAppInfo(selectedModuleCode);
    });

    const filterInput = document.getElementById('dictionary-panel-filter');
    filterInput.setAttribute('placeholder', i18n.t('dictionary-panel.filter-placeholder'));

    filterInput.addEventListener('keyup', (event) => {
      clearTimeout(this._filterTimeout);
      this._filterTimeout = setTimeout(() => {
        this.filterKeys(event.target.value);
      }, 300);
    });
  }

  isPanelActive() {
    let panelButtons = document.getElementById('panel-buttons');
    return panelButtons.activePanel == 'dictionary-panel';
  }

  getSelectElement() {
    return document.getElementById('dictionary-panel-select');
  }

  getPanel() {
    return document.getElementById('dictionary-panel');
  }

  getKeyContainer() {
    return document.getElementById('dictionary-panel-keys');
  }

  getContentContainer() {
    return document.getElementById('dictionary-panel-content');
  }

  getReferenceBox() {
    return document.getElementById('dictionary-panel-reference-box');
  }

  async init() {
    await this.refreshDictionaries();
    this._initDone = true;
  }

  async refreshDictionaries() {
    let modules = await this.getDictModules();
    let helpContainer = document.getElementById('dictionary-panel-help-no-dicts');
    let navigation = document.getElementById('dictionary-panel-navigation');
    let selectEl = this.getSelectElement();
    let selectMenu = document.getElementById('dictionary-panel-select-button');

    if (modules.length == 0) {
      navigation.classList.add('hidden');
      helpContainer.classList.remove('hidden');
      selectEl.classList.add('hidden');
      this.getKeyContainer().innerHTML = '';

      if (selectMenu != null) {
        selectMenu.classList.add('hidden');
      }

      return;
    }

    // Show the navigation container
    navigation.classList.remove('hidden');

    // Hide the help container and clear the select element
    helpContainer.classList.add('hidden');
    selectEl.innerHTML = "";

    // Populate the select element with dictionary modules
    for (let i = 0; i < modules.length; i++) {
      let module = modules[i];
      let option = document.createElement('option');

      if (platformHelper.isMobile()) {
        option.innerText = module.name;
      } else {
        option.innerText = module.description;
      }

      option.value = module.name;

      // Select the first option by default
      if (i == 0) {
        option.selected = "selected";
      }

      selectEl.append(option);
    }

    // Show the select element
    selectEl.classList.remove('hidden');

    // Show the select menu if it exists
    if (selectMenu != null) {
      selectMenu.classList.remove('hidden');
    }

    // Retrieve the saved dictionary from settings
    let savedDictionary = await ipcSettings.get('selectedDictionary', null);

    // If a saved dictionary exists and is in the modules list, select it
    if (savedDictionary && modules.some(module => module.name === savedDictionary)) {
      selectEl.value = savedDictionary;
      await this.handleDictionaryChange(savedDictionary);
    } else {
      // Otherwise, select the first module by default
      await this.handleDictionaryChange(modules[0].name);
    }

    // Initialize the jQuery selectmenu widget
    $(selectEl).selectmenu({
      width: platformHelper.isMobile() ? 110 : 200,
      change: () => {
        let selectedModuleCode = selectEl.value;
        this.handleDictionaryChange(selectedModuleCode);
      }
    });
  }

  async handleDictionaryChange(selectedModule) {
    this._currentDict = selectedModule;
    this._currentKeyList = null; // Clear old keys to prevent stale data in _waitForKeyListLoaded
    await ipcSettings.set('selectedDictionary', selectedModule); // Save the selected dictionary

    this.closeDictEntry();

    const filterInput = document.getElementById('dictionary-panel-filter');
    filterInput.value = ''; // Clear the filter text

    this.getKeyContainer().innerHTML = `
    <div class='loader' style='margin-left: 40%; margin-top: 2.5em;'>
      <div class='bounce1'></div>
      <div class='bounce2'></div>
      <div class='bounce3'></div>
    </div>
    `;

    // Use an awaitable delay so that callers can properly wait for this method to complete
    await new Promise(resolve => setTimeout(resolve, 500));

    let keys = await ipcNsi.getDictModuleKeys(selectedModule);
    this._currentKeyList = keys;

    let htmlList = "<ul id='dictionary-section-list' class='panel-content'>";

    if (keys.length > 0) {
      let firstCharacter = keys[0][0];
      let lastItemCharacter = "";

      // Create HTML list of dictionary keys grouped by their first character
      for (let i = 0; i < keys.length; i++) {
        let key = keys[i];
        firstCharacter = key[0];

        if (firstCharacter != lastItemCharacter) {
          if (i > 0) {
            htmlList += '</ul></li>';
          }

          htmlList += `<li id='dict-letter-${firstCharacter.toLowerCase()}'>`;
          htmlList += `<div class='dictionary-section-marker'>`;
          htmlList += '<i class="fa-solid fa-circle-chevron-right dictionary-accordion-button"></i>';
          htmlList += firstCharacter;
          htmlList += '</div>'
          htmlList += `<ul class='alphabetical-section hidden'>`
        }

        let currentItem = `<li class='dict-key'>${key}</li>`;
        htmlList += currentItem;

        lastItemCharacter = firstCharacter;
      }

      htmlList += "</ul></li></ul>";
    } else {

      htmlList += "</ul>";
    }

    this.getKeyContainer().innerHTML = htmlList;
    this.getKeyContainer().scrollTop = 0;

    let allMarkers = this.getKeyContainer().querySelectorAll('.dictionary-section-marker');
    let allSections = this.getKeyContainer().querySelectorAll('.alphabetical-section');

    // Add click event listeners to all section markers
    allMarkers.forEach((marker) => {
      marker.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        let liElement = event.target.closest('li');
        this.handleSectionMarkerClick(liElement, allSections);
      });
    });
  }

  updateSectionButton(section) {
    let button = section.parentNode.querySelector('.dictionary-accordion-button');

    if (section.classList.contains('hidden')) {
      button.classList.remove('fa-circle-chevron-down');
      button.classList.add('fa-circle-chevron-right');
    } else {
      button.classList.remove('fa-circle-chevron-right');
      button.classList.add('fa-circle-chevron-down');
    }
  }

  handleSectionMarkerClick(liElement, allSections) {
    this._currentSectionId = liElement.getAttribute('id');
    let section = liElement.querySelector('.alphabetical-section');

    if (section.classList.contains('hidden')) {
      allSections.forEach((section) => {
        section.classList.add('hidden');
        this.updateSectionButton(section);
      });

      section.classList.remove('hidden');
      this.updateSectionButton(section);

      const allDictKeys = this.getKeyContainer().querySelectorAll('.dict-key');
      allDictKeys.forEach((key) => {
        key.style.display = '';
      });

      const filterInput = document.getElementById('dictionary-panel-filter');
      filterInput.value = '';

      this.updateSectionEventHandlers(section);
    } else {
      section.classList.add('hidden');
      this.updateSectionButton(section);
    }

    liElement.scrollIntoViewIfNeeded();
  }

  updateSectionEventHandlers(section) {
    let allKeys = section.querySelectorAll('.dict-key');
    // Add click event listeners to all dictionary keys in the section
    allKeys.forEach((key) => {
      const EVENT_CLASS = 'event-init-done';

      if (!key.classList.contains(EVENT_CLASS)) {
        key.classList.add(EVENT_CLASS);
        key.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          this.handleKeyClick(event.target);
        });
      }
    });
  }

  async handleKeyClick(key) {
    const currentDictionary = this.getSelectElement().value;
    const keyValue = key.innerText.trim();

    let dictHeader = `<div id='dict-entry-header'>${keyValue}</div>`;
    let closeIcon = `<div class='close-icon icon'><i class='fa-solid fa-rectangle-xmark'></i></div><br id='dict-entry-header-separator' />`;
    let dictContent = await ipcNsi.getRawModuleEntry(currentDictionary, keyValue, true);

    if (dictContent == null) {
      return;
    }

    dictContent = dictContent.replaceAll('<lb', '<p');
    dictContent = dictContent.replaceAll('lb>', 'p>');
    dictContent = dictContent.replaceAll('<list>', '<ul>');
    dictContent = dictContent.replaceAll('</list>', '</ul>');
    dictContent = dictContent.replaceAll('<item>', '<li>');
    dictContent = dictContent.replaceAll('</item>', '</li>');

    this.getPanel().classList.add('dict-entry-shown');
    this.getContentContainer().setAttribute('module-context', this._currentDict + ' – ' + keyValue);
    this.getContentContainer().innerHTML = dictHeader + closeIcon + `<div class='dict-entry panel-content'>${dictContent}</div>`;
    this.getContentContainer().scrollTop = 0;
    this._referenceBoxHelper.hideReferenceBox();

    this.initReferences();

    this.getContentContainer().querySelector('.close-icon').addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();

      this.closeDictEntry();
    });

    if (this._currentKey != null) {
      this._currentKey.classList.remove('selected');
    }

    this._currentKey = key;
    key.classList.add('selected');

    // Defer scrolling so it works even when the panel is not yet visible
    // (e.g., when triggered programmatically via sword:// link before panel switch).
    setTimeout(() => {
      key.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 200);
  }

  initReferences() {
    let referenceElements = this.getContentContainer().querySelectorAll('ref');
    // Add click event listeners to all ref elements
    // ref elements can either be scripture references or references to other dictionary entries
    referenceElements.forEach((reference) => {
      reference.addEventListener('click', (event) => {

        let target = event.target.getAttribute('target');

        if (target != null && target.indexOf(':') != -1) {
          // Handle dictionary reference (e.g. <ref target="Nave:PRAISE">PRAISE</ref>)

          target = target.split(':')[1];
          this.openKeyFromTextReference(this._currentDict, target);

        } else {
          // Handle scripture reference
          this._referenceBoxHelper.handleReferenceClick(event, false);
        }
      });
    });

    let scripRefElements = this.getContentContainer().querySelectorAll('scripref');
    // Add click event listeners to all scripture reference elements
    scripRefElements.forEach((scripRef) => {
      scripRef.addEventListener('click', (event) => {
        this._referenceBoxHelper.handleReferenceClick(event, false);
      });
    });

    // Regular hyper links are used in various dictionaries to reference other entries or modules.
    // These can be sword:// URLs like: <a href="sword://Vines/CLOTHING">CLOTHING</a>
    // Or links to Strongs like: <a href="sword://StrongsRealGreek/04652">4652</a>
    // Or links to maps like: <a href="sword://NETmap/Map08">Map08</a>
    swordUrlHandler.initSwordUrlLinks(this.getContentContainer(), this._referenceBoxHelper);

    // <term> references are used in the Thompson Chain Topics dictionary.
    let termElements = this.getContentContainer().querySelectorAll('term');
    // Add click event listeners to all term elements
    termElements.forEach((term) => {
      term.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();

        let key = event.target.innerText;
        this.openKeyFromTextReference(this._currentDict, key);
      });
    });

    // <sync> references are used in the American Tract Society Bible Dictionary
    let syncElements = this.getContentContainer().querySelectorAll('sync');
    // Add click event listeners to all sync elements
    syncElements.forEach((sync) => {
      sync.addEventListener('click', (event) => {
        let key = event.target.innerText;
        this.openKeyFromTextReference(this._currentDict, key);
      });
    });
  }

  /**
   * Open a specific entry from a dictionary module.
   * If the module differs from the currently selected dictionary,
   * it switches the dropdown to that module first.
   * @param {string} moduleCode - The dictionary module code (e.g., 'NETmap', 'Vines')
   * @param {string} key - The entry key to open
   */
  async openModuleEntry(moduleCode, key) {
    if (moduleCode == null || key == null || key == '') {
      return;
    }

    // Ensure the panel is initialized (dropdown populated) before proceeding.
    // This handles the case where the user clicks a sword:// link before
    // ever opening the Dictionary Panel manually.
    if (!this._initDone) {
      await this.init();
    }

    // If the target module is not the currently selected dictionary, switch to it
    if (moduleCode != this._currentDict) {
      let allDictModules = await ipcNsi.getAllLocalModules('DICT');
      let targetModule = allDictModules.find(m => m.name == moduleCode);

      if (targetModule == null) {
        return;
      }

      // If the module is not in the filtered list (e.g., a Strongs module), we cannot open it here.
      // Strongs modules are handled by the Word Study Panel.
      let hasStrongs = targetModule.hasHebrewStrongsKeys || targetModule.hasGreekStrongsKeys;
      if (hasStrongs) {
        return;
      }

      // Add module to select dropdown if not already present
      let selectEl = this.getSelectElement();
      let optionExists = false;

      for (let i = 0; i < selectEl.options.length; i++) {
        if (selectEl.options[i].value == moduleCode) {
          optionExists = true;
          break;
        }
      }

      if (!optionExists) {
        // Module is installed but not yet in the dropdown (shouldn't normally happen, but handle gracefully)
        return;
      }

      selectEl.value = moduleCode;
      $(selectEl).selectmenu('refresh');
      await this.handleDictionaryChange(moduleCode);
    }

    // Wait for the key list to be loaded after handleDictionaryChange
    await this._waitForKeyListLoaded();

    let entryOpened = this.openKeyFromTextReference(moduleCode, key);

    // Fallback: if the standard key matching did not find the entry,
    // try a direct DOM-based lookup with case-insensitive matching.
    if (!entryOpened) {
      let dictKeyElement = this._findKeyElementFuzzy(key);

      if (dictKeyElement != null) {
        const allSections = this.getKeyContainer().querySelectorAll('.alphabetical-section');
        let letterSectionLi = dictKeyElement.parentNode.parentNode;
        let sectionId = this.getSectionIdFromDictKeyElement(dictKeyElement);

        if (sectionId != this._currentSectionId) {
          this.handleSectionMarkerClick(letterSectionLi, allSections);
        }

        await this.handleKeyClick(dictKeyElement);
      }
    }
  }

  /**
   * Wait until the current key list has been loaded after a dictionary change.
   * handleDictionaryChange loads keys asynchronously with a 500ms setTimeout.
   * @returns {Promise} Resolves when key list is available
   */
  _waitForKeyListLoaded() {
    return new Promise((resolve) => {
      if (this._currentKeyList && this._currentKeyList.length > 0) {
        resolve();
        return;
      }

      let attempts = 0;
      let interval = setInterval(() => {
        attempts++;
        if ((this._currentKeyList && this._currentKeyList.length > 0) || attempts > 20) {
          clearInterval(interval);
          resolve();
        }
      }, 200);
    });
  }

  /**
   * Find a dictionary key DOM element using case-insensitive and partial matching.
   * Used as a fallback when the standard key matching in openKeyFromTextReference fails.
   * @param {string} key - The key to search for
   * @returns {HTMLElement|null} The matching DOM element, or null if not found
   */
  _findKeyElementFuzzy(key) {
    if (key == null || key == '') {
      return null;
    }

    let allDictKeys = this.getKeyContainer().querySelectorAll('.dict-key');
    let lowerKey = key.toLowerCase();

    // Try exact match first
    for (let i = 0; i < allDictKeys.length; i++) {
      if (allDictKeys[i].innerText.trim() == key) {
        return allDictKeys[i];
      }
    }

    // Try case-insensitive exact match
    for (let i = 0; i < allDictKeys.length; i++) {
      if (allDictKeys[i].innerText.trim().toLowerCase() == lowerKey) {
        return allDictKeys[i];
      }
    }

    // Try case-insensitive starts-with match
    for (let i = 0; i < allDictKeys.length; i++) {
      if (allDictKeys[i].innerText.trim().toLowerCase().startsWith(lowerKey)) {
        return allDictKeys[i];
      }
    }

    return null;
  }

  openKeyFromTextReference(module, key) {
    if (module == this._currentDict && key != null && key != "") {
      const allSections = this.getKeyContainer().querySelectorAll('.alphabetical-section');

      // Go through the dict key elements to see if it includes the key we're looking for.
      // Then open the key and if needed the corresponding section.
      for (let i = 0; i < this._currentKeyList.length; i++) {
        let keyValue = this._currentKeyList[i];
        let currentKeys = null;

        if (keyValue.indexOf(', ') != -1) {
          currentKeys = keyValue.split(', ');
        } else if (keyValue.indexOf('-') != -1) {
          currentKeys = keyValue.split('-');
        } else if (keyValue.indexOf(' OR ') != -1) {
          currentKeys = keyValue.split(' OR ');
        } else {
          currentKeys = [ keyValue ];
        }

        // At this point the keys may still contain a portion in parenthesis after the key.
        // e.g. DESERT (NOUN AND ADJECTIVE).
        // However, the references typically only contain the first portion like "see DESERT".
        // Therefore we need to clean up the entry and remove the second part
        let cleanedKeys = [];
        currentKeys.forEach((rawKey) => {
          if (rawKey.indexOf(' (') != -1) {
            let cleanedKey = rawKey.split(' ')[0];
            cleanedKeys.push(cleanedKey);
          } else {
            cleanedKeys.push(rawKey);
          }
        });

        if (keyValue == key || keyValue.startsWith(key) || cleanedKeys.includes(key)) {
          let dictKeyElement = this.getDictKeyElementFromKeyString(keyValue);

          if (dictKeyElement == null) {
            continue;
          }

          let sectionId = this.getSectionIdFromDictKeyElement(dictKeyElement);
          let letterSectionLi = dictKeyElement.parentNode.parentNode;

          if (sectionId != this._currentSectionId) {
            this.handleSectionMarkerClick(letterSectionLi, allSections);
          }

          this.handleKeyClick(dictKeyElement);
          return true;
        }
      }
    }

    return false;
  }

  getDictKeyElementFromKeyString(keyString) {
    const allDictKeys = this.getKeyContainer().querySelectorAll('.dict-key');

    // Find the dictionary key element that matches the given key string
    for (let i = 0; i < allDictKeys.length; i++) {
      let currentDictKey = allDictKeys[i];
      let currentKeyText = allDictKeys[i].innerText;

      if (currentKeyText == keyString) {
        return currentDictKey;
      }
    }
  }

  getSectionIdFromDictKeyElement(dictKeyElement) {
    let sectionId = '';

    if (dictKeyElement != null) {
      const dictLetterLi = dictKeyElement.parentNode.parentNode;
      sectionId = dictLetterLi.getAttribute('id');
    }

    return sectionId;
  }

  closeDictEntry() {
    if (this._currentKey != null) {
      this._currentKey.classList.remove('selected');
      this.getPanel().classList.remove('dict-entry-shown');
      this.getContentContainer().innerHTML = '';
    }

    this._currentKey = null;
  }

  async getDictModules() {
    let modules = await ipcNsi.getAllLocalModules('DICT');
    modules.sort(swordModuleHelper.sortModules);

    let filteredModules = [];
    // Filter out modules that have Strongs keys
    modules.forEach((module) => {
      const hasStrongs = module.hasHebrewStrongsKeys || module.hasGreekStrongsKeys;

      if (!hasStrongs) {
        filteredModules.push(module);
      }
    });

    return filteredModules;
  }

  filterKeys(filterText) {
    const allDictKeys = this.getKeyContainer().querySelectorAll('.dict-key');
    const allSections = this.getKeyContainer().querySelectorAll('.alphabetical-section');

    // Filter dictionary keys based on the filter text
    allDictKeys.forEach((key) => {
      const section = key.closest('.alphabetical-section');

      if (key.innerText.toLowerCase().includes(filterText.toLowerCase())) {
        key.style.display = '';
        section.classList.remove('hidden');
        this.updateSectionButton(section);
      } else {
        key.style.display = 'none';
      }
    });

    // Hide sections that have no visible keys
    allSections.forEach((section) => {
      const visibleKeys = section.querySelectorAll('.dict-key:not([style*="display: none"])');

      if (visibleKeys.length === 0 || filterText === '') {
        section.classList.add('hidden');
      } else {
        section.classList.remove('hidden');
        this.updateSectionButton(section);
        this.updateSectionEventHandlers(section);
      }
    });
  }
}

module.exports = DictionaryPanel;
