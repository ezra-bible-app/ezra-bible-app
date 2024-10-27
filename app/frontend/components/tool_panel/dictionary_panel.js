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

class DictionaryPanel {
  constructor() {
    this._initDone = false;

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
  }

  isPanelActive() {
    let panelButtons = document.getElementById('panel-buttons');
    return panelButtons.activePanel == 'dictionary-panel';
  }

  getSelectElement() {
    return document.getElementById('dictionary-panel-select');
  }

  getKeyContainer() {
    return document.getElementById('dictionary-panel-keys');
  }

  init() {
    this.refreshDictionaries();
    this._initDone = true;
  }

  async refreshDictionaries() {
    let modules = await this.getDictModules();

    if (modules.length == 0) {
      return;
    }

    let selectEl = this.getSelectElement();

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

    $(selectEl).selectmenu({
      width: 300,
      change: () => {
        let selectedModuleCode = selectEl.value;
        this.handleDictionaryChange(selectedModuleCode);
      }
    });

    await this.handleDictionaryChange(modules[0].name);
  }

  async handleDictionaryChange(selectedModule) {
    setTimeout(async () => {
      let keys = await ipcNsi.getDictModuleKeys(selectedModule);


      let htmlList = "<ul id='dictionary-section-list'>";

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

            htmlList += '<li>';
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
      }

      htmlList += "</ul></li></ul>";

      this.getKeyContainer().innerHTML = htmlList;
      this.getKeyContainer().scrollTop = 0;

      let allMarkers = this.getKeyContainer().querySelectorAll('.dictionary-section-marker');
      let allSections = this.getKeyContainer().querySelectorAll('.alphabetical-section');

      allMarkers.forEach((marker) => {
        marker.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();

          this.handleSectionMarkerClick(event, allSections);

        });
      });

    }, 500);
  }

  handleSectionMarkerClick(event, allSections) {
    let liElement = event.target.closest('li');
    let section = liElement.querySelector('.alphabetical-section');

    if (section.classList.contains('hidden')) {
      allSections.forEach((section) => {
        section.classList.add('hidden');
      });

      section.classList.remove('hidden');
    } else {
      section.classList.add('hidden');
    }

    liElement.scrollIntoView();
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
