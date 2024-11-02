/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2024 Ezra Bible App Development Team <contact@ezrabibleapp.net>

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

class DictionaryPanel {
  constructor() {
    this._initDone = false;
    this._currentKey = null;

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
    this._initDone = true;
  }

  async refreshDictionaries() {
    let modules = await this.getDictModules();
    let helpContainer = document.getElementById('dictionary-panel-help-no-dicts');
    let selectEl = this.getSelectElement();
    let selectMenu = document.getElementById('dictionary-panel-select-button');

    if (modules.length == 0) {
      helpContainer.classList.remove('hidden');
      selectEl.classList.add('hidden');
      this.getKeyContainer().innerHTML = '';

      if (selectMenu != null) {
        selectMenu.classList.add('hidden');
      }

      return;
    }

    helpContainer.classList.add('hidden');
    selectEl.innerHTML = "";

    for (let i = 0; i < modules.length; i++) {
      let module = modules[i];
      let option = document.createElement('option');

      option.innerText = module.description;
      option.value = module.name;
      if (i == 0) {
        option.selected = "selected";
      }

      selectEl.append(option);
    }

    selectEl.classList.remove('hidden');

    if (selectMenu != null) {
      selectMenu.classList.remove('hidden');
    }

    $(selectEl).selectmenu({
      width: 200,
      change: () => {
        let selectedModuleCode = selectEl.value;
        this.handleDictionaryChange(selectedModuleCode);
      }
    });

    await this.handleDictionaryChange(modules[0].name);
  }

  async handleDictionaryChange(selectedModule) {
    this._currentDict = selectedModule;

    this.closeDictEntry();

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

  handleSectionMarkerClick(liElement, allSections) {
    this._currentSectionId = liElement.getAttribute('id');
    let section = liElement.querySelector('.alphabetical-section');

    if (section.classList.contains('hidden')) {
      allSections.forEach((section) => {
        section.classList.add('hidden');
      });

      section.classList.remove('hidden');


      let allKeys = section.querySelectorAll('.dict-key');
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

    } else {
      section.classList.add('hidden');
    }

    liElement.scrollIntoViewIfNeeded();
  }

  async handleKeyClick(key) {
    const currentDictionary = this.getSelectElement().value;
    const keyValue = key.innerText;

    let dictHeader = `<div id='dict-entry-header'>${keyValue}</div>`;
    let closeIcon = `<div class='close-icon icon'><i class='fa-solid fa-rectangle-xmark'></i></div><br id='dict-entry-header-separator' />`;
    let dictContent = await ipcNsi.getRawModuleEntry(currentDictionary, keyValue);

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

    let referenceElements = this.getContentContainer().querySelectorAll('ref');
    referenceElements.forEach((reference) => {
      reference.addEventListener('click', (event) => {
        this._referenceBoxHelper.handleReferenceClick(event, false);
      });
    });

    let scripRefElements = this.getContentContainer().querySelectorAll('scripref');
    scripRefElements.forEach((scripRef) => {
      scripRef.addEventListener('click', (event) => {
        this._referenceBoxHelper.handleReferenceClick(event, false);
      });
    });

    let aElements = this.getContentContainer().querySelectorAll('a');
    aElements.forEach((a) => {
      a.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();

        this.handleHyperLinkClick(event.target);
      });
    });

    let termElements = this.getContentContainer().querySelectorAll('term');
    termElements.forEach((term) => {
      term.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();

        let key = event.target.innerText;
        this.openKeyFromTextReference(this._currentDict, key);
      });
    });

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

  handleHyperLinkClick(link) {
    let href = link.getAttribute('href');

    if (href.startsWith('sword://')) {
      href = href.replace('sword://', '');

      if (href.indexOf('/') != -1) {
        let splitHref = href.split('/');
        let module = splitHref[0];
        let key = splitHref[1];

        this.openKeyFromTextReference(module, key);
      }
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

        if (keyValue == key || cleanedKeys.includes(key)) {
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

    modules.forEach((module) => {
      const hasStrongs = module.hasHebrewStrongsKeys || module.hasGreekStrongsKeys;

      if (!hasStrongs) {
        filteredModules.push(module);
      }
    });

    return filteredModules;
  }
}

module.exports = DictionaryPanel;
