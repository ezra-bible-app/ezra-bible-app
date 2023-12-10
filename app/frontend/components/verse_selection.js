/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2023 Ezra Bible App Development Team <contact@ezrabibleapp.net>

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
const VerseReferenceHelper = require("../helpers/verse_reference_helper.js");
const i18nHelper = require('../helpers/i18n_helper.js');
const eventController = require('../controllers/event_controller.js');
const { getPlatform } = require('../helpers/ezra_helper.js');
const verseListController = require('../controllers/verse_list_controller.js');

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
    this.previousSelectionExisting = false;
    this.previousFirstVerseReference = null;
    this.previousVerseCount = null;
    this.verseReferenceHelper = null;
    this.previousSelectionIndex = -1;

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
      this.clearVerseSelection(true, tabIndex);
    });

    eventController.subscribe('on-all-translations-removed', () => {
      this.clearVerseSelection();
    });
  }

  getSelectedVerseBoxes() {
    return this.selectedVerseBoxElements;
  }

  initHelper(nsi) {
    this.verseReferenceHelper = new VerseReferenceHelper(nsi);
  }

  initSelectable(verseList) {
    if (verseList.hasClass('ui-selectable')) {
      verseList.selectable('destroy');
    }

    verseList.selectable({
      filter: '.verse-text',
      cancel: '.verse-reference-content, .sword-xref-marker, .verse-notes, .tag-box, .tag, .load-book-results, .select-all-verses-button, tag-distribution-matrix',

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

        let currentFirstVerseReference = this.getFirstSelectedVerseReferenceId();
        let currentVerseCount = this.selectedVerseBoxElements.length;

        if (this.previousSelectionExisting && 
            currentFirstVerseReference == this.previousFirstVerseReference &&
            currentVerseCount == this.previousVerseCount) {

          this.clearVerseSelection(true, undefined);
          this.updateViewsAfterVerseSelection();
          this.previousSelectionExisting = false;
        } else {
          this.updateViewsAfterVerseSelection();
          this.publishVersesSelected();
          this.previousSelectionExisting = true;

          if (this.selectedVerseBoxElements.length > 0) {
            this.previousFirstVerseReference = this.getFirstSelectedVerseReferenceId();
            this.previousVerseCount = this.selectedVerseBoxElements.length;
          } else {
            this.previousVerseCount = 0;
            this.previousFirstVerseReference = null;
          }
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

            if (currentElement.classList.contains('verse-text')) {
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

  getFirstSelectedVerseReferenceId() {
    if (this.selectedVerseBoxElements != null && this.selectedVerseBoxElements.length > 0) {
      return this.selectedVerseBoxElements[0].getAttribute('verse-reference-id');
    } else {
      return null;
    }
  }

  publishVersesSelected(tabIndex=undefined) {
    eventController.publishAsync('on-verses-selected', {
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

  getVerseReferenceFromAnchor(anchorText) {
    var splittedVerseReference = anchorText.split(" ");
    var currentVerseReference = splittedVerseReference[splittedVerseReference.length - 1];
    return currentVerseReference;
  }

  setVerseAsSelection(verseText) {
    if (verseText != null) {
      this.clearVerseSelection(false, undefined);
      verseText.classList.add('ui-selected');
      verseText.classList.add('ui-selectee');
      this.selectedVerseBoxElements.push(verseText);

      this.updateSelected();
      this.updateViewsAfterVerseSelection();
      this.publishVersesSelected();
    }
  }

  updateSelected(verseList=undefined) {
    if (verseList == undefined) {
      verseList = verseListController.getCurrentVerseList();
    }

    this.selectedVerseBoxElements = verseList.find('.ui-selected').closest('.verse-box');
    var selectedVerseReferences = [];

    for (var i = 0; i < this.selectedVerseBoxElements.length; i++) {
      var verseBox = $(this.selectedVerseBoxElements[i]);
      var currentVerseReferenceAnchor = verseBox.find('a:first').attr('name');
      var currentVerseReference = this.getVerseReferenceFromAnchor(currentVerseReferenceAnchor);
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

  async getSelectedBooks() {
    var selectedBooks = [];

    for (var i = 0; i < this.selectedVerseBoxElements.length; i++) {
      var currentVerseBox = this.selectedVerseBoxElements[i];
      var currentBookShortName = new VerseBox(currentVerseBox).getBibleBookShortTitle();

      if (!selectedBooks.includes(currentBookShortName)) {
        selectedBooks.push(currentBookShortName);
      }
    }

    return selectedBooks;
  }

  async getSelectedVerseDisplayText() {
    var selectedBooks = await this.getSelectedBooks();
    var selected_verses_content = [];

    for (var i = 0; i < selectedBooks.length; i++) {
      var currentBookShortName = selectedBooks[i];
      var currentBookVerseReferences = [];
      
      for (var j = 0; j < this.selectedVerseBoxElements.length; j++) {
        var currentVerseBox = this.selectedVerseBoxElements[j];

        var currentVerseBibleBookShortName = new VerseBox(currentVerseBox).getBibleBookShortTitle();

        if (currentVerseBibleBookShortName == currentBookShortName) {
          var currentVerseReference = this.getVerseReferenceFromAnchor($(currentVerseBox).find('a:first').attr('name'));
          currentBookVerseReferences.push(currentVerseReference);
        }
      }

      var formatted_verse_list = await this.format_verse_list_for_view(currentBookVerseReferences, false, currentBookShortName);
      var currentBookName = await (currentBookShortName == 'Ps' ? i18nHelper.getPsalmTranslation() : ipcDb.getBookTitleTranslation(currentBookShortName));
      var currentBookVerseReferenceDisplay = currentBookName + ' ' + formatted_verse_list;
      selected_verses_content.push(currentBookVerseReferenceDisplay);
    }

    if (selected_verses_content.length > 0) {
      return selected_verses_content.join('; ');
    } else {
      return i18n.t("tags.none-selected");
    }
  }

  verse_list_has_gaps(list) {
    var has_gaps = false;

    for (var i = 1; i < list.length; i++) {
      if ((list[i] - list[i-1]) > 1) {
        has_gaps = true;
        break;
      }
    }

    return has_gaps;
  }

  async format_single_verse_block(list, start_index, end_index, turn_into_link, bookId=undefined) {
    if (bookId == undefined) {
      bookId = app_controller.tab_controller.getTab().getBook();
    }

    if (start_index > (list.length - 1)) start_index = list.length - 1;
    if (end_index > (list.length - 1)) end_index = list.length - 1;

    var start_reference = list[start_index];
    var end_reference = list[end_index];

    var formatted_passage = "";

    if (start_reference != undefined && end_reference != undefined) {
      formatted_passage = await this.format_passage_reference_for_view(bookId,
                                                                       start_reference,
                                                                       end_reference,
                                                                       ':');

      /*if (turn_into_link) {
        formatted_passage = "<a href=\"javascript:app_controller.jumpToReference('" + start_reference + "', true);\">" + formatted_passage + "</a>";
      }*/
    }

    return formatted_passage;
  }

  async verse_reference_list_to_absolute_verse_nr_list(list, bookId=undefined) {
    if (this.verseReferenceHelper == null) {
      return [];
    }

    let new_list = new Array;
    let translationId = app_controller.tab_controller.getTab().getBibleTranslationId();
    
    if (bookId == undefined) {
      bookId = app_controller.tab_controller.getTab().getBook();
    }

    for (let i = 0; i < list.length; i++) {
      let absoluteVerseNr = await this.verseReferenceHelper.referenceStringToAbsoluteVerseNr(translationId, bookId, list[i], false, ':');
      new_list.push(Number(absoluteVerseNr));
    }

    return new_list;
  }

  async format_verse_list_for_view(selected_verse_array, link_references, bookId=undefined) {
    var absolute_nr_list = await this.verse_reference_list_to_absolute_verse_nr_list(selected_verse_array, bookId);
    var verse_list_for_view = "";

    if (selected_verse_array.length > 0) {
      if (this.verse_list_has_gaps(absolute_nr_list)) {
        var current_start_index = 0;

        for (var i = 0; i < absolute_nr_list.length; i++) {
          if (absolute_nr_list[i] - absolute_nr_list[i-1] > 1) {

            var current_end_index = i - 1;
            
            verse_list_for_view += await this.format_single_verse_block(selected_verse_array,
                                                                        current_start_index,
                                                                        current_end_index,
                                                                        link_references,
                                                                        bookId);

            verse_list_for_view += "; ";

            if (i == (absolute_nr_list.length - 1)) {
              verse_list_for_view += await this.format_single_verse_block(selected_verse_array,
                                                                          i,
                                                                          i,
                                                                          link_references,
                                                                          bookId);
            }

            current_start_index = i;
          } else {
            if (i == (absolute_nr_list.length - 1)) {
              verse_list_for_view += await this.format_single_verse_block(selected_verse_array,
                                                                          current_start_index,
                                                                          i,
                                                                          link_references,
                                                                          bookId);
            }
          }
        }
      } else { // verse_list doesn't have gaps!
        verse_list_for_view += await this.format_single_verse_block(selected_verse_array,
                                                                    0,
                                                                    selected_verse_array.length - 1,
                                                                    link_references,
                                                                    bookId);
      }
    }

    return verse_list_for_view;
  }

  async format_passage_reference_for_view(book_short_title, start_reference, end_reference, reference_separator=undefined) {
    var bibleTranslationId = app_controller.tab_controller.getTab().getBibleTranslationId();

    if (reference_separator == null) {
      reference_separator = await i18nHelper.getReferenceSeparator(bibleTranslationId);
    }

    var start_chapter = parseInt(start_reference.split(reference_separator)[0]);
    var start_verse = parseInt(start_reference.split(reference_separator)[1]);
    var end_chapter = parseInt(end_reference.split(reference_separator)[0]);
    var end_verse = parseInt(end_reference.split(reference_separator)[1]);
  
    var passage = start_chapter + window.reference_separator + start_verse;
    var endChapterVerseCount = await ipcNsi.getChapterVerseCount(bibleTranslationId, book_short_title, end_chapter);
  
    if (book_short_title != null &&
        start_verse == 1 &&
        end_verse == endChapterVerseCount) {
  
      /* Whole chapter sections */
      
      if (start_chapter == end_chapter) {
        passage = 'Chap. ' + start_chapter;
      } else {
        passage = 'Chaps. ' + start_chapter + ' - ' + end_chapter;
      }
  
    } else {
  
      /* Sections don't span whole chapters */
  
      if (start_chapter == end_chapter) {
        if (start_verse != end_verse) {
          passage += '-' + end_verse;
        }
      } else {
        passage += ' - ' + end_chapter + window.reference_separator + end_verse;
      }
    }
  
    return passage;
  }

  element_list_to_xml_verse_list(element_list) {
    var xml_verse_list = "<verse-list>";

    for (var i = 0; i < element_list.length; i++) {
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

  current_verse_selection_as_xml() {
    var selected_verse_elements = this.selectedVerseBoxElements;

    return (this.element_list_to_xml_verse_list(selected_verse_elements));
  }

  current_verse_selection_as_verse_reference_ids() {
    var selected_verse_ids = new Array;
    var selected_verse_elements = this.selectedVerseBoxElements;
    
    for (var i = 0; i < selected_verse_elements.length; i++) {
      var verse_box_element = selected_verse_elements[i];
      var verse_box = new VerseBox(verse_box_element);
      var verse_reference_id = verse_box.getVerseReferenceId();

      selected_verse_ids.push(verse_reference_id);
    }

    return selected_verse_ids;
  }

  async getSelectedVerseLabelText(selectedVerseDisplayText=undefined) {
    var preDefinedText = false;

    if (!this.someVersesSelected()) {
      if (selectedVerseDisplayText == undefined && !this.someVersesSelected()) {
        selectedVerseDisplayText = await this.getSelectedVerseDisplayText();
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
  
  getLineBreak(html=false) {
    if (html) {
      return "<br/>";
    } else {
      if (platformHelper.isElectron() && process.platform === 'win32') {
        return "\r\n";
      } else {
        return "\n";
      }
    }
  }

  convertTransChangeToItalic(textElement) {
    let transChangeElements = textElement.find('transChange');
    transChangeElements.each((index, transChange) => {
      let italicElement = document.createElement('i');
      italicElement.innerText = transChange.innerText;
      transChange.replaceWith(italicElement); 
    });
  }

  convertSwordQuoteJesusToSpanElement(textElement) {
    let swordQuoteJesusElements = textElement.find('.sword-quote-jesus');
    swordQuoteJesusElements.each((index, swordQuoteJesus) => {
      let spanElement = document.createElement('span');
      spanElement.innerText = swordQuoteJesus.innerText;
      spanElement.setAttribute('style', 'color: #FF0000;');
      swordQuoteJesus.replaceWith(spanElement);
    });
  }

  sanitizeHtmlCode(htmlCode) {
    const sanitizeHtml = require('sanitize-html');

    htmlCode = sanitizeHtml(htmlCode, {
      allowedTags: ['i', 'span', 'br'],
      allowedAttributes: {
        'span': ['style']
      },
      allowedStyles: {
        '*': {
          // Match HEX and RGB
          'color': [/^#(0x)?[0-9a-f]+$/i, /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/],
        },
      }
    });

    return htmlCode;
  }

  async getSelectedVerseText(html=false) {
    const bibleTranslationId = app_controller.tab_controller.getTab().getBibleTranslationId();
    const separator = await i18nHelper.getReferenceSeparator(bibleTranslationId);
    
    let selectedVerseBoxes = this.selectedVerseBoxElements;
    
    var selectedText = "";
    const selectionHasMultipleVerses = selectedVerseBoxes.length > 1;

    const paragraphsOption = app_controller.optionsMenu._paragraphsOption;

    for (let i = 0; i < selectedVerseBoxes.length; i++) {
      let currentVerseBox = $(selectedVerseBoxes[i]);
      let verseReferenceContent = currentVerseBox.find('.verse-reference-content').text();
      let currentVerseNr = verseReferenceContent.split(separator)[1];
      let currentText = currentVerseBox.find('.verse-text').clone();

      if (paragraphsOption.isChecked) {
        let paragraphBreaks = this.getLineBreak(html) + this.getLineBreak(html) + this.getLineBreak(html) + this.getLineBreak(html);
        currentText.find('.sword-paragraph-end').replaceWith(paragraphBreaks);
      }

      currentText.find('.sword-markup').filter(":not('.sword-quote-jesus')").remove();

      if (html) {
        this.convertTransChangeToItalic(currentText);

        const redLetterOption = app_controller.optionsMenu._redLetterOption;
        if (redLetterOption.isChecked) {
          this.convertSwordQuoteJesusToSpanElement(currentText);
        }
      }

      if (selectionHasMultipleVerses) {
        selectedText += currentVerseNr + " ";
      }

      selectedText += currentText.html().replace(/&nbsp;/g, ' ') + " ";
    }

    const parser = new DOMParser();
    let htmlText = parser.parseFromString("<div>" + selectedText + "</div>", 'text/html');

    selectedText = html ? htmlText.querySelector('div').innerHTML : htmlText.querySelector('div').innerText;
    selectedText += " " + this.getLineBreak(html) + this.getLineBreak(html) + app_controller.verse_selection.getSelectedVersesLabel().text();

    if (html) {
      selectedText = this.sanitizeHtmlCode(selectedText);
    }

    return selectedText;
  }

  async copySelectedVerseTextToClipboard() {
    let selectedVerseText = await this.getSelectedVerseText();
    let selectedVerseTextHtml = await this.getSelectedVerseText(true);

    getPlatform().copyToClipboard(selectedVerseText, selectedVerseTextHtml);
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

    let allVerseTextElements = currentVerseList[0].querySelectorAll('.verse-text');
    allVerseTextElements.forEach((verseTextElement) => {
      verseTextElement.classList.add('ui-selected');
    });

    this.updateSelected();
    this.updateViewsAfterVerseSelection(i18n.t(selectionLocaleText));
  }

  allVersesSelected() {
    const currentVerseList = verseListController.getCurrentVerseList();

    let allVerseTextElements = currentVerseList[0].querySelectorAll('.verse-text');
    let allSelectedElements = currentVerseList[0].querySelectorAll('.ui-selected');

    return allVerseTextElements.length == allSelectedElements.length != 0;
  }

  someVersesSelected() {
    const currentVerseList = verseListController.getCurrentVerseList();

    let allSelectedElements = currentVerseList[0].querySelectorAll('.ui-selected');

    return allSelectedElements.length > MAX_VERSES_FOR_DETAILED_LABEL;
  }
}

module.exports = VerseSelection;