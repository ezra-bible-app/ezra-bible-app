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

const VerseBox = require("../ui_models/verse_box.js");
const i18nHelper = require('../helpers/i18n_helper.js');
const eventController = require('../controllers/event_controller.js');
const { getPlatform } = require('../helpers/ezra_helper.js');
const verseListController = require('../controllers/verse_list_controller.js');
const VerseBoxHelper = require('../helpers/verse_box_helper.js');
const sectionLabelHelper = require('../helpers/section_label_helper.js');

const MAX_VERSES_FOR_DETAILED_LABEL = 5;

/**
 * The VerseSelection component implements the label that shows the currently selected verses 
 * and it provides an API and an event (on-verses-selected) that other components can use to get the current verse selection.
 * 
 * @category Component
 */
class VerseSelection {
  constructor() {
    this.selectedVerseBoxElements = [];
    this.selectedVerseReferences = null;
    this.previousVerseCount = null;
    this.verseReferenceHelper = null;
    this.previousSelectionIndex = -1;
    this.verseBoxHelper = new VerseBoxHelper();

    eventController.subscribe('on-locale-changed', async () => {
      let currentTab = app_controller.tab_controller.getTab();
      let textType = currentTab.getTextType();

      if (textType != 'tagged_verses' && textType != 'search_results') {
        await this.updateSelectedVersesLabel();
      }

      if (this.allVersesSelected() || this.someVersesSelected()) {
        let selectionLocaleText = '';
        
        if (textType == 'search_results') {

          if (this.allVersesSelected()) {
            selectionLocaleText = 'bible-browser.all-search-results';
          } else if (this.someVersesSelected()) {
            selectionLocaleText = 'bible-browser.some-search-results';
          }
        } else if (textType == 'tagged_verses') {

          if (this.allVersesSelected()) {
            selectionLocaleText = 'bible-browser.all-verses';
          } else if (this.someVersesSelected()) {
            selectionLocaleText = 'bible-browser.all-verses';
          }
        }

        this.updateSelected();
        this.updateViewsAfterVerseSelection(i18n.t(selectionLocaleText));
      }
    });

    eventController.subscribe('on-bible-text-loaded', (tabIndex) => {
      this.init(tabIndex);
    });

    eventController.subscribe('on-tab-selected', (tabIndex) => {
      let verseListFrame = verseListController.getCurrentVerseListFrame(tabIndex);
      this.updateSelected(verseListFrame);
      this.updateViewsAfterVerseSelection();
      this.publishVersesSelected();
    });

    eventController.subscribe('on-all-translations-removed', () => {
      this.clearVerseSelection();
    });
  }

  getSelectedVerseBoxes() {
    return this.selectedVerseBoxElements;
  }

  initSelectable(verseList) {
    if (verseList.hasClass('ui-selectable')) {
      verseList.selectable('destroy');
    }

    verseList.selectable({
      filter: '.verse-text-container',
      cancel: '.ui-selected, .verse-reference-content, .sword-xref-marker, .verse-notes, .tag-box, .tag, .load-book-results, .select-all-verses-button, tag-distribution-matrix',

      // eslint-disable-next-line no-unused-vars
      start: (event, ui) => {
        // Only reset existing selection if metaKey and ctrlKey are not pressed.
        // If one of these keys is pressed that indicates that the user wants to select individual non-consecutive verses.
        // And in this case the start event is fired for each individual verse.
        if (event.metaKey == false && event.ctrlKey == false) {
          this.selectedVerseReferences = new Array;
          this.selectedVerseBoxElements = new Array;
        }

        app_controller.handleBodyClick(event);
      },

      // eslint-disable-next-line no-unused-vars
      stop: (event, ui) => {
        this.updateSelected(verseList);
        this.updateViewsAfterVerseSelection();
        this.publishVersesSelected();

        if (this.selectedVerseBoxElements.length > 0) {
          this.previousVerseCount = this.selectedVerseBoxElements.length;
        } else {
          this.previousVerseCount = 0;
        }
      },

      // Solution taken from https://stackoverflow.com/a/14469388/1269556
      // This implements shift-based selection
      // (adding verses between the first clicked verse and the last clicked verse while holding shift)
      selecting: (e, ui) => { // on select
        let currentSelectionIndex = $(ui.selecting.tagName, e.target).index(ui.selecting); // get selecting item index

        if (this.previousVerseCount != null && this.previousVerseCount > 1) {
          currentSelectionIndex = currentSelectionIndex - this.previousVerseCount;
        }

        // if shift key was pressed and there is a previous selection - select all verses between the two clicked verses
        if(e.shiftKey && this.previousSelectionIndex > -1) { 
          let startIndex = Math.min(this.previousSelectionIndex, currentSelectionIndex) - 5;
          let endIndex = Math.max(this.previousSelectionIndex, currentSelectionIndex) + 5;
          let $selectedElements = $(ui.selecting.tagName, e.target).slice(startIndex, endIndex);

          for (let i = 0; i < $selectedElements.length; i++) {
            let currentElement = $selectedElements[i];

            if (currentElement.classList.contains('verse-text-container')) {
              currentElement.classList.add('ui-selected');
            }
          }

          this.previousSelectionIndex = -1; // and reset previousSelection
        } else {
          this.previousSelectionIndex = currentSelectionIndex; // othervise just save previousSelection
        }
      },

      // eslint-disable-next-line no-unused-vars
      selected: (event, ui) => {
        // Not needed anymore!
      }
    });
  }

  getFirstSelectedVerseBox() {
    if (this.selectedVerseBoxElements != null && this.selectedVerseBoxElements.length > 0) {
      return this.selectedVerseBoxElements[0];
    } else {
      return null;
    }
  }

  async publishVersesSelected(tabIndex=undefined) {
    await eventController.publishAsync('on-verses-selected', {
      'selectedElements': this.selectedVerseBoxElements,
      'selectedVerseTags': this.getCurrentSelectionTags(),
      'tabIndex': tabIndex
    });
  }

  init(tabIndex) {
    var currentVerseListFrame = verseListController.getCurrentVerseListFrame(tabIndex);
    this.initSelectable(currentVerseListFrame);

    // This event handler ensures that the selection is cancelled
    // if the user clicks somewhere else in the verse list
    currentVerseListFrame.bind('click', (e) => {
      if (e.target.matches('.tag-box') ||
          e.target.matches('.verse-box') ||
          e.target.matches('.verse-list-frame')) {
        
        this.clearVerseSelection();
        app_controller.handleBodyClick(e);
      }
    });
  }

  versesSelected() {
    return this.selectedVerseBoxElements.length > 0;
  }

  async setVerseAsSelection(verseTextContainer) {
    if (verseTextContainer != null) {
      this.clearVerseSelection(false, undefined);
      verseTextContainer.classList.add('ui-selected');
      verseTextContainer.classList.add('ui-selectee');
      this.selectedVerseBoxElements.push(verseTextContainer);

      let verseList = $(verseTextContainer.closest('.verse-list-content'));

      this.updateSelected(verseList);
      await this.updateViewsAfterVerseSelection();
      await this.publishVersesSelected();
    }
  }

  updateSelected(verseListFrame=undefined) {
    if (verseListFrame == undefined) {
      verseListFrame = verseListController.getCurrentVerseListFrame();
    }

    this.selectedVerseBoxElements = verseListFrame.find('.ui-selected').closest('.verse-box');
    var selectedVerseReferences = [];

    for (let i = 0; i < this.selectedVerseBoxElements.length; i++) {
      var verseBox = $(this.selectedVerseBoxElements[i]);
      var currentVerseReferenceAnchor = verseBox.find('a:first').attr('name');

      var splittedVerseReference = currentVerseReferenceAnchor.split(" ");
      var currentVerseReference = splittedVerseReference[splittedVerseReference.length - 1];

      selectedVerseReferences.push(currentVerseReference);
    }

    this.selectedVerseReferences = selectedVerseReferences;
  }

  clearVerseSelection(updateViews=true, tabIndex=undefined) {
    this.previousSelectionIndex = -1;
    this.selectedVerseReferences = new Array;
    this.selectedVerseBoxElements = new Array;

    var verseList = verseListController.getCurrentVerseList(tabIndex);
    verseList[0].querySelectorAll('.ui-selected').forEach((verseText) => {
      verseText.classList.remove('ui-selectee');
      verseText.classList.remove('ui-selected');
      verseText.classList.remove('ui-state-highlight');
    });

    if (updateViews) {
      this.updateViewsAfterVerseSelection();
      this.publishVersesSelected(tabIndex);
    }
  }

  getSelectedBooks() {
    var selectedBooks = [];

    for (let i = 0; i < this.selectedVerseBoxElements.length; i++) {
      var currentVerseBox = this.selectedVerseBoxElements[i];
      var currentBookShortName = new VerseBox(currentVerseBox).getBibleBookShortTitle();

      if (!selectedBooks.includes(currentBookShortName)) {
        selectedBooks.push(currentBookShortName);
      }
    }

    return selectedBooks;
  }

  elementListToXmlVerseList(element_list) {
    var xml_verse_list = "<verse-list>";

    for (let i = 0; i < element_list.length; i++) {
      var verse_box_element = $(element_list[i]).closest('.verse-box')[0];
      var verse_reference = verse_box_element.querySelector('.verse-reference-content').innerText;
      var verse_reference_id = "";
      var verse_box = new VerseBox(verse_box_element);

      verse_reference_id = verse_box.getVerseReferenceId();

      var verse_bible_book = verse_box.getBibleBookShortTitle();
      var abs_verse_nr = verse_box.getAbsoluteVerseNumber();

      xml_verse_list += "<verse>";
      xml_verse_list += "<verse-bible-book>" + verse_bible_book + "</verse-bible-book>";
      xml_verse_list += "<verse-reference>" + verse_reference + "</verse-reference>";
      xml_verse_list += "<verse-reference-id>" + verse_reference_id + "</verse-reference-id>";
      xml_verse_list += "<abs-verse-nr>" + abs_verse_nr + "</abs-verse-nr>";
      xml_verse_list += "</verse>";
    }

    xml_verse_list += "</verse-list>";

    return xml_verse_list;
  }

  getSelectionAsXml() {
    var selected_verse_elements = this.selectedVerseBoxElements;

    return (this.elementListToXmlVerseList(selected_verse_elements));
  }

  async getSelectionAsVerseObjects(sourceBibleTranslationId=undefined, targetBibleTranslationId=undefined) {
    let elementList = this.selectedVerseBoxElements;
    let verseObjects = [];
    let absoluteVerseNumbers = [];

    for (let i = 0; i < elementList.length; i++) {
      let verseBoxElement = elementList[i].closest('.verse-box');
      let verseBox = new VerseBox(verseBoxElement);

      let currentVerseObject = await verseBox.getVerseObject(window.reference_separator,
                                                             sourceBibleTranslationId,
                                                             targetBibleTranslationId);

      if (!absoluteVerseNumbers.includes(currentVerseObject._absoluteVerseNr)) {
        absoluteVerseNumbers.push(currentVerseObject._absoluteVerseNr);
        verseObjects.push(currentVerseObject);
      }
    }

    return verseObjects;
  }

  applySelectionFromVerseObjects(verseObjects) {
    const currentVerseList = verseListController.getCurrentVerseList();

    if (verseObjects.length > 0) {
      verseObjects.forEach((verseObject) => {
        let currentVerseBox = currentVerseList[0].querySelector('.verse-nr-' + verseObject._absoluteVerseNr);

        if (currentVerseBox != null) {
          let currentVerseText = currentVerseBox.querySelector('.verse-text-container');
          currentVerseText.classList.add('ui-selected');
        }
      });

      this.updateSelected();
      this.updateViewsAfterVerseSelection();
      this.publishVersesSelected();
    }
  }

  getSelectionAsVerseReferenceIds() {
    var selected_verse_ids = new Array;
    var selected_verse_elements = this.selectedVerseBoxElements;
    
    for (let i = 0; i < selected_verse_elements.length; i++) {
      var verse_box_element = selected_verse_elements[i];
      var verse_box = new VerseBox(verse_box_element);
      var verse_reference_id = verse_box.getVerseReferenceId();

      selected_verse_ids.push(verse_reference_id);
    }

    return selected_verse_ids;
  }

  async getSelectedVerseLabelText(selectedVerseDisplayText=undefined, useShortBookTitles=false) {
    var preDefinedText = false;

    if (!this.someVersesSelected()) {
      if (selectedVerseDisplayText == undefined && !this.someVersesSelected()) {
        const selectedBooks = await this.getSelectedBooks();
        const referenceSeparator = ':';
        selectedVerseDisplayText = await sectionLabelHelper.getVerseDisplayText(selectedBooks, this.selectedVerseBoxElements, false, useShortBookTitles, referenceSeparator);
      } else {
        preDefinedText = true;
      }
    }

    var selectedVersesLabel = this.getSelectedVersesLabel();
    var selectedVersesLabelText = selectedVersesLabel.text();
    var allSearchResultsText = i18n.t('bible-browser.all-search-results');
    var someSearchResultsText = i18n.t('bible-browser.some-search-results');
    var selectedVerseReferenceCount = this.selectedVerseReferences.length;

    if ((selectedVersesLabelText == allSearchResultsText || selectedVersesLabelText == someSearchResultsText) && selectedVerseReferenceCount > 1 && !preDefinedText) {
      selectedVerseDisplayText = i18n.t('bible-browser.some-search-results');
    }

    return selectedVerseDisplayText;
  }

  async updateSelectedVersesLabel(selectedVerseDisplayText=undefined) {
    selectedVerseDisplayText = await this.getSelectedVerseLabelText(selectedVerseDisplayText);
    this.getSelectedVersesLabel().html(selectedVerseDisplayText);
  }

  async updateViewsAfterVerseSelection(selectedVerseDisplayText=undefined) {
    await this.updateSelectedVersesLabel(selectedVerseDisplayText);

    var tabId = app_controller.tab_controller.getSelectedTabId();
    if (tabId !== undefined) {
      uiHelper.configureButtonStyles('#' + tabId);
    }
  }

  getSelectedVersesLabel() {
    var currentVerseListMenu = app_controller.getCurrentVerseListMenu();
    return $(currentVerseListMenu.find('.selected-verses')[0]);
  }

  async getSelectedVerseText(html=false) {
    const bibleTranslationId = app_controller.tab_controller.getTab().getBibleTranslationId();
    const separator = await i18nHelper.getReferenceSeparator(bibleTranslationId);
    
    const selectedBooks = await this.getSelectedBooks();
    let verseReferenceText = await sectionLabelHelper.getVerseDisplayText(selectedBooks, this.selectedVerseBoxElements, true);
    
    // Check the user's preference for reference placement
    const referenceBeforeText = await app_controller.optionsMenu._copyVerseReferenceBeforeTextOption.isCheckedAsync();
    
    let selectedText = await this.verseBoxHelper.getVerseTextFromVerseElements(
      this.selectedVerseBoxElements, 
      verseReferenceText, 
      html, 
      separator,
      referenceBeforeText
    );

    return selectedText;
  }

  async copySelectedVerseTextToClipboard() {
    let selectedVerseText = await this.getSelectedVerseText();
    let selectedVerseTextHtml = await this.getSelectedVerseText(true);

    getPlatform().copyToClipboard(selectedVerseText, selectedVerseTextHtml);

    uiHelper.showSuccessMessage(i18n.t('bible-browser.copy-verse-text-to-clipboard-success'));
  }

  getCurrentSelectionTags() {
    var verse_selection_tags = new Array;

    if (this.selectedVerseBoxElements == null) {
      return verse_selection_tags;
    }

    for (let i = 0; i < this.selectedVerseBoxElements.length; i++) {
      let current_verse_box = $(this.selectedVerseBoxElements[i]);
      let current_tag_list = current_verse_box.find('.tag-data').children();

      for (let j = 0; j < current_tag_list.length; j++) {
        let current_tag = $(current_tag_list[j]);
        let current_tag_title = current_tag.find('.tag-title').html();
        let tag_obj = null;

        for (let k = 0; k < verse_selection_tags.length; k++) {
          let current_tag_obj = verse_selection_tags[k];

          if (current_tag_obj.title == current_tag_title &&
              current_tag_obj.category == current_tag.attr('class')) {

            tag_obj = current_tag_obj;
            break;
          }
        }

        if (tag_obj == null) {
          tag_obj = {
            title: current_tag_title,
            category: current_tag.attr('class'),
            count: 0
          };

          verse_selection_tags.push(tag_obj);
        }

        tag_obj.count += 1;
      }
    }

    for (let i = 0; i < verse_selection_tags.length; i++) {
      let current_tag_obj = verse_selection_tags[i];
      current_tag_obj.complete = (current_tag_obj.count == this.selectedVerseBoxElements.length);
    }

    return verse_selection_tags;
  }

  getSelectedElements() {
    return this.selectedVerseBoxElements;
  }

  selectAllVerses(selectionLocaleText) {
    const currentVerseList = verseListController.getCurrentVerseList();

    let allVerseTextElements = currentVerseList[0].querySelectorAll('.verse-text-container');
    allVerseTextElements.forEach((verseTextElement) => {
      verseTextElement.classList.add('ui-selected');
    });

    this.updateSelected();
    this.updateViewsAfterVerseSelection(i18n.t(selectionLocaleText));
    this.publishVersesSelected();
  }

  allVersesSelected() {
    const currentVerseList = verseListController.getCurrentVerseList();

    let allVerseTextElements = currentVerseList[0].querySelectorAll('.verse-text-container');
    let allSelectedElements = currentVerseList[0].querySelectorAll('.ui-selected');

    return allVerseTextElements.length == allSelectedElements.length != 0;
  }

  someVersesSelected() {
    const currentVerseList = verseListController.getCurrentVerseList();
    let someVersesSelected = false;

    if (currentVerseList != null && currentVerseList[0] != null) {
      let allSelectedElements = currentVerseList[0].querySelectorAll('.ui-selected');
      someVersesSelected = allSelectedElements.length > MAX_VERSES_FOR_DETAILED_LABEL;
    }

    return someVersesSelected;
  }
}

module.exports = VerseSelection;