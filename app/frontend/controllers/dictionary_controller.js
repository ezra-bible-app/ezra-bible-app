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

const Mousetrap = require('mousetrap');
const DictionaryInfoBox = require('../components/dictionary_info_box.js');
const eventController = require('./event_controller.js');
const verseListController = require('../controllers/verse_list_controller.js');

let jsStrongs = null;


/**
 * The DictionaryController handles functionality for the lookup of dictionary information based on Strong's keys.
 * It handles the mouse move events when the user is hovering individual words in the text while holding SHIFT.
 * It handles the long presses on Android (alternative for mousemove).
 * It handles the state of the dictionary info box.
 * 
 * Like other controllers it is only initialized once. It is accessible at the
 * global object `app_controller.dictionary_controller`.
 * 
 * @category Controller
 */
class DictionaryController {
  constructor() {
    this._isDictionaryOpen = false;
    this._currentStrongsIds = null;
    this._currentStrongsElement = null;
    /**@type {HTMLElement} */
    this._currentVerseText = null;
    this.strongsBox = $('#strongs-box');
    this.shiftKeyPressed = false;
    this.strongsAvailable = false;
    this._dictionaryInfoBox = new DictionaryInfoBox(this);

    Mousetrap.bind('shift', () => {
      this.shiftKeyPressed = true;
    });

    $(document).on('keyup', (e) => {
      if (e.key == 'Shift') {
        this.shiftKeyPressed = false;
        this.removeHighlight();
      }
    });

    this.strongsBox.bind('mouseout', () => {
      this.hideStrongsBox();
    });

    document.body.addEventListener('touchmove', () => {
      this.hideStrongsBox();
    });

    window.addEventListener('scroll', () => {
      this.hideStrongsBox();
    });

    eventController.subscribe('on-bible-text-loaded', (tabIndex) => { 
      this.bindAfterBibleTextLoaded(tabIndex);
    });

    eventController.subscribe('on-tab-selected', () => {
      this.hideStrongsBox();
    });

    eventController.subscribe('on-tab-search-results-available', async () => {
      // We need to re-initialize the Strong's event handlers, because the search function rewrote the verse html elements
      await this.bindAfterBibleTextLoaded();
    });

    eventController.subscribe('on-tab-search-reset', async () => {
      // We need to re-initialize the Strong's event handlers, because the search function rewrote the verse html elements
      await this.bindAfterBibleTextLoaded();
    });

    eventController.subscribe('on-dictionary-panel-switched', isOpen => {
      this._isDictionaryOpen = isOpen;

      if (!isOpen) { 
        this.clearInfoBox();  
        this.hideStrongsBox(true);
      }
    });

    this.runAvailabilityCheck();
  }

  getJsStrongs() {
    if (jsStrongs == null) {
      jsStrongs = require('strongs');
    }

    return jsStrongs;
  }

  async runAvailabilityCheck() {
    this.strongsAvailable = await ipcNsi.strongsAvailable();
  }

  hideStrongsBox(removeHl=false) {
    if (this._currentStrongsElement != null && removeHl) {
      this._currentStrongsElement.removeClass('strongs-hl');
    }

    this.strongsBox.hide();
  }

  clearInfoBox() {
    this._dictionaryInfoBox.clearDictInfoBox();
  }

  async bindAfterBibleTextLoaded(tabIndex=undefined) {
    var currentTab = app_controller.tab_controller.getTab(tabIndex);
    if (currentTab == null) {
      return;
    }
    
    const currentBibleTranslationId = currentTab.getBibleTranslationId();
    const swordModuleHelper = require('../helpers/sword_module_helper.js');
    const translationHasStrongs = await swordModuleHelper.moduleHasStrongs(currentBibleTranslationId);
    if (!translationHasStrongs) { 
      return;
    }
    
    /**@type {HTMLElement}*/
    const currentVerseListFrame = verseListController.getCurrentVerseListFrame(tabIndex)[0];
    
    const verseTextElements = currentVerseListFrame.querySelectorAll('.verse-text');
    verseTextElements.forEach(verseElement => verseElement.addEventListener('mousemove', () => {
      var currentTab = app_controller.tab_controller.getTab();
      currentTab.tab_search.blurInputField();
      this.highlightStrongsInVerse(verseElement);
    }));

    var longpressController;
    if (platformHelper.isCordova()) {
      longpressController = require('./longpress_controller.js');
    }
    
    const wElements = currentVerseListFrame.querySelectorAll('w');

    wElements.forEach(wElement => { 
      wElement.classList.remove('strongs-hl');

      if (platformHelper.isCordova()) {
        longpressController.subscribe(wElement, (el) => {

          // TODO: Remove the previous strong's highlighting
          let currentVerseText = el.closest('.verse-text');
          app_controller.verse_selection.setVerseAsSelection(currentVerseText);
          this._handleStrongsWord(el);
        });
      } 

      wElement.addEventListener('mousemove', async (e) => {
        let currentTab = app_controller.tab_controller.getTab();
        currentTab.tab_search.blurInputField();
        await this._handleShiftMouseMove(e);
      });
    });
  }

  async getStrongsEntryWithRawKey(rawKey, normalizedKey=undefined) {
    if (normalizedKey == undefined) {
      normalizedKey = this.getNormalizedStrongsId(rawKey);
    }

    var strongsEntry = null;

    try {
      strongsEntry = await ipcNsi.getStrongsEntry(normalizedKey);
      //console.log(normalizedKey, strongsEntry);
      if (!strongsEntry.key) {
        throw(new Error());
      }

      strongsEntry['rawKey'] = rawKey;
    } catch (e) {
      console.log("DictionaryController.getStrongsEntryWithRawKey: Got exception when getting strongs entry for key " + normalizedKey);
    }

    return strongsEntry;
  }

  /**
   * 
   * @param {HTMLElement} strongsElement element to extract Strongs Numbers from
   * @returns {Array} an array of Strongs Ids or an empty array 
   */
  getStrongsIdsFromStrongsElement(strongsElement) {
    var strongsIds = [];

    if (strongsElement) {
      strongsElement.classList.forEach(cls => {
        if (cls.startsWith('strong:')) {
          const strongsId = cls.slice(7);
          strongsIds.push(strongsId);
        }
      });
    }

    return strongsIds;
  }

  getNormalizedStrongsId(strongsId) {
    if (strongsId == undefined) {
      return undefined;
    }

    var strongsNumber = parseInt(strongsId.substring(1));
    strongsId = strongsId[0] + strongsNumber;
    return strongsId;
  }

  isValidStrongsKey(strongsKey) {
    return strongsKey in this.getJsStrongs();
  }

  async showStrongsInfo(strongsIds, showStrongsBox=true) {
    var normalizedStrongsIds = [];

    for (var i = 0; i < strongsIds.length; i++) {
      var normalizedStrongsId = this.getNormalizedStrongsId(strongsIds[i]);
      normalizedStrongsIds.push(normalizedStrongsId);

      if (!this.isValidStrongsKey(normalizedStrongsId)) {
        console.log(normalizedStrongsId + " is not a valid Strong's key! Issue with rawKey " + strongsIds[i] + "?");
        return;
      }
    }

    var lemma = this.getJsStrongs()[normalizedStrongsIds[0]].lemma;
    var strongsShortInfo = lemma;

    try {
      var shortInfos = [];
      var firstStrongsEntry = null;
      var additionalStrongsEntries = [];

      for (let i = 0; i < normalizedStrongsIds.length; i++) {
        var strongsEntry = await this.getStrongsEntryWithRawKey(strongsIds[i], normalizedStrongsIds[i]);

        if (i == 0) {
          firstStrongsEntry = strongsEntry;
        } else {
          additionalStrongsEntries.push(strongsEntry);
        }

        var currentShortInfo = strongsEntry.rawKey + ": " + strongsEntry.transcription + " &mdash; " + strongsShortInfo;
        shortInfos.push(currentShortInfo);
      }

      if (shortInfos.length > 1) {
        strongsShortInfo = "<table>";

        for (let i = 0; i < shortInfos.length; i++) {
          strongsShortInfo += "<tr>";
          strongsShortInfo += "<td>" + shortInfos[i].split(":")[0] + ":</td>";
          strongsShortInfo += "<td style='text-align: left;'>" + shortInfos[i].split(":")[1] + "</td>";
          strongsShortInfo += "</tr>";
        }

        strongsShortInfo += "</table>";

      } else {
        strongsShortInfo = shortInfos[0];
      }

      this.strongsBox.html(strongsShortInfo);
      this._dictionaryInfoBox.updateDictInfoBox(firstStrongsEntry, additionalStrongsEntries, true);
    } catch (e) {
      console.log(e);
    }

    if (this._currentStrongsElement != null) {
      this._currentStrongsElement.bind('mouseout', () => {
        if (!this.shiftKeyPressed) {
          this.hideStrongsBox();
        }
      });

      if (showStrongsBox) {
        this.strongsBox.show().position({
          my: "bottom",
          at: "center top",
          of: this._currentStrongsElement
        });
      }
    }
  }

  async _handleShiftMouseMove(event) {
    if (!this._isDictionaryOpen) {
      return;
    }

    if (!this.shiftKeyPressed) {
      return;
    }

    await this._handleStrongsWord(event.currentTarget);
  }

  async _handleStrongsWord(strongsElement) {
    if (this.strongsAvailable) {
      var strongsIds = this.getStrongsIdsFromStrongsElement(strongsElement);
      
      if (this._currentStrongsElement != null && 
          this._currentStrongsElement[0] == strongsElement) {
        return;
      }

      this._currentStrongsIds = strongsIds;

      if (this._currentStrongsElement != null) {
        this._currentStrongsElement.removeClass('strongs-hl');
      }
        
      this._currentStrongsElement = $(strongsElement);

      if (strongsIds.length > 0) {
        this._currentStrongsElement.addClass('strongs-hl');    
        this.strongsBox.css({
          'fontSize': this._currentStrongsElement.css('fontSize')
        });

        await this.showStrongsInfo(strongsIds);
      }
    }
  }

  highlightStrongsInVerse(verseTextElement, force=false) {
    if (!this._isDictionaryOpen) {
      return;
    }

    if (!force && !this.shiftKeyPressed) {
      return;
    }

    if (this._currentVerseText != null) {
      this._currentVerseText.classList.remove('strongs-current-verse');
    }

    this._currentVerseText = verseTextElement;
    this._currentVerseText.classList.add('strongs-current-verse');
  }

  removeHighlight() {
    if (this._currentVerseText) {
      this._currentVerseText.classList.remove('strongs-current-verse');
    }
  }

  logDoubleStrongs() {
    var currentVerseList = verseListController.getCurrentVerseList();
    var currentWElements = currentVerseList.find('w');

    for (var i = 0; i < currentWElements.length; i++) {
      var el = currentWElements[i];
      var strongWord = $(el).text();
      var currentVerseBox = $(el).closest('.verse-box');
      var reference = currentVerseBox.find('.verse-reference-content').text();
      var classData = $(el).prop('class');

      var classes = classData.split(' ');
      if (classes.length > 1) {
        console.log(reference + ' | ' + strongWord + ' | ' + classData);
      }
    }
  }
}

module.exports = DictionaryController;