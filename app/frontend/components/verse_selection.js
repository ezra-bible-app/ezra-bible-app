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

const VerseBox = require("../ui_models/verse_box.js");
const VerseReferenceHelper = require("../helpers/verse_reference_helper.js");

/**
 * The VerseSelection component implements the label that shows the currently selected verses.
 * 
 * @category Component
 */
class VerseSelection {
  constructor() {
    this.selected_verse_references = null;
    this.selected_verse_box_elements = null;
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
      cancel: '.sword-xref-marker, .verse-notes, .verse-content-edited, .tag-box, .tag, .load-book-results, .select-all-search-results-button',

      start: (event, ui) => {
        // Only reset existing selection if metaKey and ctrlKey are not pressed.
        // If one of these keys is pressed that indicates that the user wants to select individual non-consecutive verses.
        // And in this case the start event is fired for each individual verse.
        if (event.metaKey == false && event.ctrlKey == false) {
          this.selected_verse_references = new Array;
          this.selected_verse_box_elements = new Array;
        }

        app_controller.handleBodyClick(event);
      },

      stop: (event, ui) => {
        this.updateSelected(verseList);
        this.updateViewsAfterVerseSelection();
      },

      selected: (event, ui) => {
        // Not needed anymore!
      }
    });
  }

  init(tabIndex) {
    var currentVerseListFrame = app_controller.getCurrentVerseListFrame(tabIndex);
    this.initSelectable(currentVerseListFrame);

    // This event handler ensures that the selection is cancelled
    // if the user clicks somewhere else in the verse list
    currentVerseListFrame.bind('click', (e) => {
      if (e.target.matches('.tag-box') ||
          e.target.matches('.verse-box') ||
          e.target.matches('.verse-list-frame')) {
        
        this.clear_verse_selection();
        app_controller.handleBodyClick(e);
      }
    });
  }

  getVerseReferenceFromAnchor(anchorText) {
    var splittedVerseReference = anchorText.split(" ");
    var currentVerseReference = splittedVerseReference[splittedVerseReference.length - 1];
    return currentVerseReference;
  }

  updateSelected(verseList=undefined) {
    if (verseList == undefined) {
      var verseList = app_controller.getCurrentVerseList();
    }

    this.selected_verse_box_elements = verseList.find('.ui-selected').closest('.verse-box');
    var selectedVerseReferences = [];

    for (var i = 0; i < this.selected_verse_box_elements.length; i++) {
      var verseBox = $(this.selected_verse_box_elements[i]);
      var currentVerseReferenceAnchor = verseBox.find('a:first').attr('name');
      var currentVerseReference = this.getVerseReferenceFromAnchor(currentVerseReferenceAnchor);
      selectedVerseReferences.push(currentVerseReference);
    }

    this.selected_verse_references = selectedVerseReferences;
  }

  clear_verse_selection(updateViews=true) {
    this.selected_verse_references = new Array;
    this.selected_verse_box_elements = new Array;
    $('.verse-text').removeClass('ui-selectee ui-selected ui-state-highlight');

    if (updateViews) {
      this.updateViewsAfterVerseSelection();
    }
  }

  async getSelectedBooks() {
    var selectedBooks = [];

    for (var i = 0; i < this.selected_verse_box_elements.length; i++) {
      var currentVerseBox = this.selected_verse_box_elements[i];
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
      
      for (var j = 0; j < this.selected_verse_box_elements.length; j++) {
        var currentVerseBox = this.selected_verse_box_elements[j];

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
                                                                       end_reference);

      /*if (turn_into_link) {
        formatted_passage = "<a href=\"javascript:app_controller.jumpToReference('" + start_reference + "', true);\">" + formatted_passage + "</a>";
      }*/
    }

    return formatted_passage;
  }

  async verse_reference_list_to_absolute_verse_nr_list(list, bookId=undefined) {
    var new_list = new Array;

    var translationId = app_controller.tab_controller.getTab().getBibleTranslationId();
    
    if (bookId == undefined) {
      bookId = app_controller.tab_controller.getTab().getBook();
    }

    for (var i = 0; i < list.length; i++) {
      var absoluteVerseNr = await this.verseReferenceHelper.referenceStringToAbsoluteVerseNr(translationId, bookId, list[i]);
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
                                                                          bookId)
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

  async format_passage_reference_for_view(book_short_title, start_reference, end_reference) {
    var bibleTranslationId = app_controller.tab_controller.getTab().getBibleTranslationId();
    var source_separator = await getReferenceSeparator(bibleTranslationId);

    var start_chapter = parseInt(start_reference.split(source_separator)[0]);
    var start_verse = parseInt(start_reference.split(source_separator)[1]);
    var end_chapter = parseInt(end_reference.split(source_separator)[0]);
    var end_verse = parseInt(end_reference.split(source_separator)[1]);
  
    var passage = start_chapter + reference_separator + start_verse;
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
        passage += ' - ' + end_chapter + reference_separator + end_verse;
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
    var selected_verse_elements = this.selected_verse_box_elements;

    return (this.element_list_to_xml_verse_list(selected_verse_elements));
  }

  current_verse_selection_as_verse_reference_ids() {
    var selected_verse_ids = new Array;
    var selected_verse_elements = this.selected_verse_box_elements;
    
    for (var i = 0; i < selected_verse_elements.length; i++) {
      var verse_box_element = selected_verse_elements[i];
      var verse_box = new VerseBox(verse_box_element);
      var verse_reference_id = verse_box.getVerseReferenceId();

      selected_verse_ids.push(verse_reference_id);
    }

    return selected_verse_ids;
  }

  async updateViewsAfterVerseSelection(selectedVerseDisplayText=undefined) {
    var preDefinedText = false;

    if (selectedVerseDisplayText == undefined) {
      selectedVerseDisplayText = await this.getSelectedVerseDisplayText();
    } else {
      preDefinedText = true;
    }

    var selectedVersesLabel = this.getSelectedVersesLabel();
    var selectedVersesLabelText = selectedVersesLabel.text();
    var allSearchResultsText = i18n.t('bible-browser.all-search-results');
    var someSearchResultsText = i18n.t('bible-browser.some-search-results');
    var selectedVerseReferenceCount = this.selected_verse_references.length;

    if ((selectedVersesLabelText == allSearchResultsText || selectedVersesLabelText == someSearchResultsText) && selectedVerseReferenceCount > 1 && !preDefinedText) {
      selectedVerseDisplayText = i18n.t('bible-browser.some-search-results');
    }

    this.getSelectedVersesLabel().html(selectedVerseDisplayText);

    await tags_controller.updateTagsViewAfterVerseSelection(false);
    
    var currentTab = app_controller.tab_controller.getTab();

    if (this.selected_verse_box_elements.length > 0) { // Verses are selected!
      app_controller.translationComparison.enableComparisonButton();

      if (currentTab.isVerseList()) {
        app_controller.verse_context_controller.enableContextButton();
      }
    } else { // No verses selected!
      app_controller.translationComparison.disableComparisonButton();
      app_controller.verse_context_controller.disableContextButton();
    }

    var tabId = app_controller.tab_controller.getSelectedTabId();
    if (tabId !== undefined) {
      uiHelper.configureButtonStyles('#' + tabId);
    }
  }

  getSelectedVersesLabel() {
    var currentVerseListMenu = app_controller.getCurrentVerseListMenu();
    return $(currentVerseListMenu.find('.selected-verses')[0]);
  }
}

module.exports = VerseSelection;