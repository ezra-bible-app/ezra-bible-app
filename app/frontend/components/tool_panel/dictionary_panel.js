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

  init() {
    this.refreshDictionaries();

    document.getElementById('dictionary-panel-info-button').addEventListener('click', () => {
      const selectedModuleCode = this.getSelectElement().value;
      app_controller.info_popup.showAppInfo(selectedModuleCode);
    });

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

    setTimeout(async () => {
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
    }, 500);
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
    let dictContent = await ipcNsi.getRawModuleEntry(currentDictionary, keyValue);

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
    key.scrollIntoViewIfNeeded();
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

    // Regular hyper links are used in the Vines dictionary to reference other entries.
    // These entries can either be from the same dictionary. E.g. <a href="sword://Vines/CLOTHING">CLOTHING</a>
    // Or they can be links to Strongs like this: <a href="sword://StrongsRealGreek/04652">4652</a>
    let aElements = this.getContentContainer().querySelectorAll('a');
    // Add click event listeners to all hyper links
    aElements.forEach((a) => {
      // Add title to Strongs links
      if (a.getAttribute('href').includes('Strongs')) {
        a.setAttribute('title', i18n.t('dictionary-panel.open-in-word-study'));
      }

      a.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();

        this.handleHyperLinkClick(event.target);
      });
    });

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

  async handleHyperLinkClick(link) {
    let href = link.getAttribute('href');

    if (href != null) {
      // Handle links like this one: <a href="sword://StrongsRealGreek/04652">4652</a>
      if (href.includes('Strongs')) {
        let strongsNumber = href.split('/').pop();
        strongsNumber = strongsNumber.replace(/^0+/, ''); // Remove leading zeros
        const isGreek = href.includes('Greek');
        const prefix = isGreek ? 'G' : 'H';
        const strongsKey = `${prefix}${strongsNumber}`;

        await app_controller.word_study_controller._wordStudyPanel.updateWithKey(strongsKey, true);
        this.switchToWordStudyPanel();

      } else {
        // Handle all other links like this one: <a href="sword://Vines/CLOTHING">CLOTHING</a>
        href = href.replace('sword://', '');

        if (href.indexOf('/') != -1) {
          let splitHref = href.split('/');
          let module = splitHref[0];
          let key = splitHref[1];

          this.openKeyFromTextReference(module, key);
        }
      }
    }
  }

  switchToWordStudyPanel() {
    const panelButtons = document.querySelector('panel-buttons');
    if (panelButtons) {
      panelButtons._updatePanels('word-study-panel', false);
    }
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
          let sectionId = this.getSectionIdFromDictKeyElement(dictKeyElement);
          let letterSectionLi = dictKeyElement.parentNode.parentNode;

          if (sectionId != this._currentSectionId) {
            this.handleSectionMarkerClick(letterSectionLi, allSections);
          }

          this.handleKeyClick(dictKeyElement);
          break;
        }
      }
    }
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
