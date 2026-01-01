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

const Mousetrap = require('mousetrap');
const WordStudyPanel = require('../components/tool_panel/word_study_panel.js');
const eventController = require('./event_controller.js');
const verseListController = require('./verse_list_controller.js');
const VerseBox = require('../ui_models/verse_box.js');

let jsStrongs = null;


/**
 * The WordStudyController handles functionality for the lookup of dictionary information based on Strong's keys.
 * It handles the mouse move events when the user is hovering individual words in the text while holding SHIFT.
 * It handles the state of the word study panel.
 * 
 * Like other controllers it is only initialized once. It is accessible at the
 * global object `app_controller.word_study_controller`.
 * 
 * @category Controller
 */
class WordStudyController {
  constructor() {
    this._isDictionaryOpen = false;
    this._currentStrongsIds = null;
    this._currentStrongsElement = null;
    /**@type {HTMLElement} */
    this._currentVerseText = null;
    this.strongsBox = $('#strongs-box');
    this.shiftKeyPressed = false;
    this.strongsAvailable = false;
    this._wordStudyPanel = new WordStudyPanel(this);
    this._lastSelection = null;
    this._lastClickedReference = null;

    this.bindEvents();
    this.runAvailabilityCheck();
  }

  bindEvents() {
    Mousetrap.bind('shift', () => {
      this.shiftKeyPressed = true;
      this._lastClickedReference = null;
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

    window.addEventListener('selectionchange', () => {
      const selection = window.getSelection();
      let textSelected = selection && selection.rangeCount > 0 && !selection.isCollapsed;

      if (textSelected) {
        this.hideStrongsBox();
      }
    });

    eventController.subscribe('on-dictionary-added', () => {
      this.runAvailabilityCheck();
    });

    eventController.subscribe('on-bible-text-loaded', (tabIndex) => {
      this.bindAfterBibleTextLoaded(tabIndex);
    });

    eventController.subscribe('on-tab-selected', () => {
      this.hideStrongsBox();
    });

    eventController.subscribe('on-tab-search-results-available', async () => {
      // We need to re-initialize the Strong's event handlers, because the search function rewrote the verse html elements
      await this.initMouseMoveOnWElements();
    });

    eventController.subscribe('on-tab-search-reset', async () => {
      // We need to re-initialize the Strong's event handlers, because the search function rewrote the verse html elements
      await this.initMouseMoveOnWElements();
    });

    eventController.subscribe('on-word-study-panel-switched', isOpen => {
      this._isDictionaryOpen = isOpen;

      if (isOpen) {
        if (this._lastSelection != null) {
          this.highlightStrongsFromSelection(this._lastSelection);
        }
      } else {
        this.clearInfoBox();  
        this.hideStrongsBox(true);
        this.removeHighlight();
      }
    });

    eventController.subscribe('on-verses-selected', (selectionDetails) => {
      this._lastClickedReference = null;
      this._lastSelection = selectionDetails;
      this.removeHighlight();
      this.highlightStrongsFromSelection(selectionDetails);
    });
  }

  getJsStrongs() {
    if (jsStrongs == null) {
      jsStrongs = require('strongs');
    }

    return jsStrongs;
  }

  async runAvailabilityCheck() {
    var oldStatus = this.strongsAvailable;
    this.strongsAvailable = await ipcNsi.strongsAvailable();

    if (this.strongsAvailable != oldStatus) {
      this._wordStudyPanel.clear();
    }
  }

  hideStrongsBox(removeHl=false) {
    if (this._currentStrongsElement != null && removeHl) {
      this._currentStrongsElement.removeClass('strongs-hl');
    }

    this.strongsBox.hide();
  }

  clearInfoBox() {
    this._wordStudyPanel.clear();
  }

  async bindAfterBibleTextLoaded(tabIndex=undefined) {
    var currentTab = app_controller.tab_controller.getTab(tabIndex);
    if (currentTab == null) {
      return;
    }
    
    const currentBibleTranslationId = currentTab.getBibleTranslationId();
    const secondBibleTranslationId = currentTab.getSecondBibleTranslationId();
    const swordModuleHelper = require('../helpers/sword_module_helper.js');

    const firstTranslationHasStrongs = await swordModuleHelper.moduleHasStrongs(currentBibleTranslationId);
    const secondTranslationHasStrongs = await swordModuleHelper.moduleHasStrongs(secondBibleTranslationId);

    if (!firstTranslationHasStrongs && !secondTranslationHasStrongs) { 
      return;
    }
    
    if (platformHelper.isElectron()) {
      /**@type {HTMLElement}*/
      const currentVerseListFrame = verseListController.getCurrentVerseListFrame(tabIndex)[0];
      const verseTextElements = currentVerseListFrame.querySelectorAll('.verse-text');

      for (let i = 0; i < verseTextElements.length; i++) {
        let verseElement = verseTextElements[i];

        verseElement.addEventListener('mousemove', (event) => {
          var currentTab = app_controller.tab_controller.getTab();
          currentTab.tab_search.blurInputField();
          this.highlightStrongsInVerse(verseElement);
        });

        verseElement.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();

          const reference = this.getReferenceFromVerseText(event.target);

          if (this._lastClickedReference == reference) {
            this._lastClickedReference = null;
          } else {
            this._lastClickedReference = reference;
          }
        });
      }
    }

    this.initMouseMoveOnWElements(tabIndex);
  }

  initMouseMoveOnWElements(tabIndex=undefined) {
    /**@type {HTMLElement}*/
    const currentVerseListFrame = verseListController.getCurrentVerseListFrame(tabIndex)[0];

    if (currentVerseListFrame != null) {
      const wElements = currentVerseListFrame.querySelectorAll('w');

      for (let i = 0; i < wElements.length; i++) {
        let wElement = wElements[i];

        wElement.classList.remove('strongs-hl');

        wElement.addEventListener('mousemove', async (e) => {
          const reference = this.getReferenceFromVerseText(wElement.closest('.verse-text'));

          let currentTab = app_controller.tab_controller.getTab();
          currentTab.tab_search.blurInputField();

          if (platformHelper.isCordova() || reference != this._lastClickedReference) {
            await this._handleMouseMove(e);
          }
        });

        this.initStrongsSup(wElement);
      }
    }
  }

  getReferenceFromVerseText(verseText) {
    let reference = null;

    if (verseText != null) {
      let verseBox = verseText.closest('.verse-box');
      let verseBoxObject = new VerseBox(verseBox);
      reference = verseBoxObject.getVerseReferenceId();
    }

    return reference;
  }

  initStrongsForContainer(container) {
    if (container == null) {
      return;
    }

    let wElements = container.querySelectorAll('w');
    wElements.forEach(wElement => {
      this.initStrongsSup(wElement);
    });
  }

  initStrongsSup(wElement) {
    if (!wElement.classList.contains('strongsInitDone')) {
      let strongsIds = this.getStrongsIdsFromStrongsElement(wElement);
      for (let i = strongsIds.length - 1; i >= 0; i--) {
        let strongsSup = document.createElement('sup');
        strongsSup.classList.add('strongs');
        strongsSup.innerText = strongsIds[i];
        wElement.insertAdjacentElement('afterend', strongsSup);
      }

      wElement.classList.add('strongsInitDone');
    }
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
      console.log("WordStudyController.getStrongsEntryWithRawKey: Got exception when getting strongs entry for key " + normalizedKey);
    }

    return strongsEntry;
  }

  /**
   * 
   * @param {HTMLElement} strongsElement element to extract Strongs Numbers from
   * @returns {Array} an array of Strongs Ids or an empty array 
   */
  getStrongsIdsFromStrongsElement(strongsElement) {
    let strongsIds = [];

    if (strongsElement) {
      strongsElement.classList.forEach(cls => {
        if (cls.startsWith('strong:')) {
          let strongsId = cls.slice(7);

          // In some translations like the KJV, the Hebrew Strong's id markup in the text contains
          // leading zeros in front of the actual Strong's number. Here we check for that
          // condition and fix the strongsId accordingly.
          if (strongsId.startsWith('H0')) {
            strongsId = strongsId.replace('H0', 'H');
          }

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
      this._wordStudyPanel.update(firstStrongsEntry, additionalStrongsEntries, true);
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

  currentVerseSelected(verseText) {
    if (verseText == null) {
      return false;
    } else {
      return verseText.classList.contains('ui-selected');
    }
  }

  async _handleMouseMove(event) {
    if (!this._isDictionaryOpen) {
      return;
    }

    // We do not handle mouse move for verses that are not selected, unless the shift key is pressed.
    if (!this.shiftKeyPressed && !this.currentVerseSelected(event.target.closest('.verse-text-container'))) {
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

  highlightStrongsFromSelection(selectionDetails) {
    if (selectionDetails == null || selectionDetails.selectedElements == null) {
      return;
    }
    
    if (selectionDetails.selectedElements.length == 1) {
      this.highlightStrongsInVerse(selectionDetails.selectedElements[0], true);
    }
  }

  highlightStrongsInVerse(verseTextElement, force=false) {
    if (!this._isDictionaryOpen) {
      return;
    }

    if (!force && !this.shiftKeyPressed && !this.currentVerseSelected(verseTextElement)) {
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

module.exports = WordStudyController;