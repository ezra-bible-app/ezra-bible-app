/* This file is part of Ezra Project.

   Copyright (C) 2019 - 2020 Tobias Klein <contact@ezra-project.net>

   Ezra Project is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   Ezra Project is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Project. See the file COPYING.
   If not, see <http://www.gnu.org/licenses/>. */

class VerseSelection {
  constructor() {
    this.selected_verse_references = null;
    this.selected_verse_boxes = null;
  }

  init(tabIndex) {
    var currentVerseListFrame = bible_browser_controller.getCurrentVerseListFrame(tabIndex);
    var currentVerseList = bible_browser_controller.getCurrentVerseList(tabIndex);
    if (currentVerseList.hasClass('ui-selectable')) {
      currentVerseList.selectable('destroy');
    }

    currentVerseList.selectable({
      filter: '.verse-text',
      cancel: '.verse-notes, #currently-edited-notes, .section-header-box, .verse-content-edited, .tag-box, .tag, .load-book-results',

      start: (event, ui) => {
        this.selected_verse_references = new Array;
        this.selected_verse_boxes = new Array;
        // Notes controller disabled
        //notes_controller.restore_currently_edited_notes();
      },

      stop: (event, ui) => {
        this.updateViewsAfterVerseSelection();
      },

      selected: (event, ui) => {
        var verse_box = $(ui.selected).closest('.verse-box');
        this.addVerseToSelected(verse_box);
      }
    });

    // This event handler ensures that the selection is cancelled
    // if the user clicks somewhere else in the verse list
    currentVerseListFrame.bind('click', (e) => {
      if (e.target.matches('.tag-box') ||
          e.target.matches('.verse-box') ||
          e.target.matches('.verse-list-frame')) {
        
        this.clear_verse_selection();
      }
    });
  }

  addVerseToSelected(verse_box) {
    var verse_reference = verse_box.find('a:first').attr('name');
    this.selected_verse_references.push(verse_reference);
    this.selected_verse_boxes.push(verse_box);
  }

  clear_verse_selection(updateViews=true) {
    this.selected_verse_references = new Array;
    this.selected_verse_boxes = new Array;
    $('.verse-text').removeClass('ui-selectee ui-selected ui-state-highlight');

    if (updateViews) {
      this.updateViewsAfterVerseSelection();
    }
  }

  async getSelectedBooks() {
    var selectedBooks = [];

    for (var i = 0; i < this.selected_verse_boxes.length; i++) {
      var currentVerseBox = $(this.selected_verse_boxes[i]);
      if (currentVerseBox.length > 1) {
        currentVerseBox = $(currentVerseBox[0]);
      }

      var currentBookShortName = currentVerseBox.find('.verse-bible-book-short').text();

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
      
      for (var j = 0; j < this.selected_verse_boxes.length; j++) {
        var currentVerseBox = $(this.selected_verse_boxes[j]);
        if (currentVerseBox.length > 1) {
          currentVerseBox = $(currentVerseBox[0]);
        }

        var currentVerseBibleBookShortName = currentVerseBox.find('.verse-bible-book-short').text();

        if (currentVerseBibleBookShortName == currentBookShortName) {
          var currentVerseReference = currentVerseBox.find('a:first').attr('name');
          currentBookVerseReferences.push(currentVerseReference);
        }
      }

      var formatted_verse_list = this.format_verse_list_for_view(currentBookVerseReferences, true);
      var currentBookName = models.BibleBook.getBookTitleTranslation(currentBookShortName);
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

  format_single_verse_block(list, start_index, end_index, turn_into_link) {
    if (start_index > (list.length - 1)) start_index = list.length - 1;
    if (end_index > (list.length - 1)) end_index = list.length - 1;

    var start_reference = list[start_index];
    var end_reference = list[end_index];

    var formatted_passage = "";

    if (start_reference != undefined && end_reference != undefined) {
      var currentBook = bible_browser_controller.tab_controller.getTab().getBook();
      formatted_passage = this.format_passage_reference_for_view(currentBook,
                                                                 start_reference,
                                                                 end_reference);

      if (turn_into_link) {
        formatted_passage = "<a href=\"javascript:bible_browser_controller.jumpToReference('" + start_reference + "', true);\">" + formatted_passage + "</a>";
      }
    }

    return formatted_passage;
  }

  reference_to_absolute_verse_nr(bible_book, chapter, verse) {
    var verse_nr = 0;
  
    for (var i = 0; i < chapter - 1; i++) {
      if (bible_chapter_verse_counts[bible_book][i] != undefined) {
        verse_nr += bible_chapter_verse_counts[bible_book][i];
      }
    }
    
    verse_nr += Number(verse);
    return verse_nr;
  }
  
  reference_to_verse_nr(bible_book_short_title, reference, split_support) {
    if (reference == null) {
      return;
    }
  
    var split_support = false;
    if (reference.search(/b/) != -1) {
      split_support = true;
    }
    reference = reference.replace(/[a-z]/g, '');
    var ref_chapter = Number(reference.split(reference_separator)[0]);
    var ref_verse = Number(reference.split(reference_separator)[1]);
  
    var verse_nr = this.reference_to_absolute_verse_nr(bible_book_short_title, ref_chapter, ref_verse);
    if (split_support) verse_nr += 0.5;
  
    return verse_nr;
  }

  verse_reference_list_to_absolute_verse_nr_list(list) {
    var new_list = new Array;
    var short_book_title = bible_browser_controller.tab_controller.getTab().getBook();

    for (var i = 0; i < list.length; i++) {
      new_list.push(Number(this.reference_to_verse_nr(short_book_title, list[i])));
    }

    return new_list;
  }

  format_verse_list_for_view(selected_verse_array, link_references) {
    var absolute_nr_list = this.verse_reference_list_to_absolute_verse_nr_list(selected_verse_array);
    var verse_list_for_view = "";

    if (selected_verse_array.length > 0) {
      if (this.verse_list_has_gaps(absolute_nr_list)) {
        var current_start_index = 0;

        for (var i = 0; i < absolute_nr_list.length; i++) {
          if (absolute_nr_list[i] - absolute_nr_list[i-1] > 1) {

            var current_end_index = i - 1;
            
            verse_list_for_view += this.format_single_verse_block(selected_verse_array,
                                                                  current_start_index,
                                                                  current_end_index,
                                                                  link_references);

            verse_list_for_view += "; ";

            if (i == (absolute_nr_list.length - 1)) {
              verse_list_for_view += this.format_single_verse_block(selected_verse_array,
                                                                    i,
                                                                    i,
                                                                    link_references);
            }

            current_start_index = i;
          } else {
            if (i == (absolute_nr_list.length - 1)) {
              verse_list_for_view += this.format_single_verse_block(selected_verse_array,
                                                                    current_start_index,
                                                                    i,
                                                                    link_references)
            }
          }
        }
      } else { // verse_list doesn't have gaps!
        verse_list_for_view += this.format_single_verse_block(selected_verse_array,
                                                              0,
                                                              selected_verse_array.length - 1,
                                                              link_references);
      }
    }

    return verse_list_for_view;
  }

  format_passage_reference_for_view(book_short_title, start_reference, end_reference) {
    // This first split is necessary, because there's a verse list id in the anchor that we do not
    // want to show
    start_reference = start_reference.split(" ")[1];
    end_reference = end_reference.split(" ")[1];
  
    var start_chapter = start_reference.split(reference_separator)[0];
    var start_verse = start_reference.split(reference_separator)[1];
    var end_chapter = end_reference.split(reference_separator)[0];
    var end_verse = end_reference.split(reference_separator)[1];
  
    var passage = start_chapter + reference_separator + start_verse;
  
    if (book_short_title != null &&
        start_verse == "1" &&
        end_verse == bible_chapter_verse_counts[book_short_title][end_chapter]) {
  
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
      var verse_box = $(element_list[i]).closest('.verse-box');
      var verse_reference = verse_box.find('.verse-reference-content').html();
      var verse_reference_id = "";
      if (verse_box.find('.verse-reference-id').length > 0) {
        verse_reference_id = verse_box.find('.verse-reference-id').html();
      }
      var verse_id = verse_box.find('.verse-id').html();
      var verse_bible_book = "";
      if (verse_box.find('.verse-bible-book').length > 0) {
        verse_bible_book = verse_box.find('.verse-bible-book').html();
      }

      var verse_part = verse_box.find('.verse-part').html();
      var abs_verse_nr = verse_box.find('.abs-verse-nr').html();

      xml_verse_list += "<verse>";
      xml_verse_list += "<verse-id>" + verse_id + "</verse-id>";
      xml_verse_list += "<verse-bible-book>" + verse_bible_book + "</verse-bible-book>";
      xml_verse_list += "<verse-reference>" + verse_reference + "</verse-reference>";
      xml_verse_list += "<verse-reference-id>" + verse_reference_id + "</verse-reference-id>";
      xml_verse_list += "<verse-part>" + verse_part + "</verse-part>";
      xml_verse_list += "<abs-verse-nr>" + abs_verse_nr + "</abs-verse-nr>";
      xml_verse_list += "</verse>";
    }

    xml_verse_list += "</verse-list>";

    return xml_verse_list;
  }

  current_verse_selection_as_xml() {
    var selected_verse_elements = this.selected_verse_boxes;

    return (this.element_list_to_xml_verse_list(selected_verse_elements));
  }

  current_verse_selection_as_verse_ids() {
    var selected_verse_ids = new Array;
    var selected_verse_elements = this.selected_verse_boxes;
    
    for (var i = 0; i < selected_verse_elements.length; i++) {
      var verse_box = $(selected_verse_elements[i]);
      var verse_id = verse_box.find('.verse-id').html();

      selected_verse_ids.push(verse_id);
    }

    return selected_verse_ids;
  }

  async updateViewsAfterVerseSelection() {
    var selectedVerseDisplayText = await this.getSelectedVerseDisplayText();
    $('#selected-verses').html(selectedVerseDisplayText);

    await tags_controller.update_tags_view_after_verse_selection(false);

    if (this.selected_verse_boxes.length > 0) { // Verses are selected!
      bible_browser_controller.translationComparison.enableComparisonButton();
    } else { // No verses selected!
      bible_browser_controller.translationComparison.disableComparisonButton();
    }
  }
}

module.exports = VerseSelection;