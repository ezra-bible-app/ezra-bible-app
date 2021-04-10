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

const Verse = require('./verse.js');

class VerseBox {
  constructor(verseBoxElement) {
    this.verseBoxElement = verseBoxElement;
  }

  getVerseObject() {
    var isBookNoteVerse = this.isBookNoteVerse();

    if (isBookNoteVerse) {
      var verse = new Verse(
        app_controller.tab_controller.getTab().getBook(),
        null,
        null,
        null,
        isBookNoteVerse
      );

    } else {
      var verse = new Verse(
        this.getBibleBookShortTitle(),
        this.getAbsoluteVerseNumber(),
        this.getChapter(),
        this.getVerseNumber(),
        isBookNoteVerse
      );

    }

    return verse;
  }

  isBookNoteVerse() {
    if (this.verseBoxElement == null) {
      return false;
    } else {
      return this.verseBoxElement.classList.contains('book-notes');
    }
  }

  getVerseReferenceId() {
    if (this.verseBoxElement == null) {
      return null;
    } else {
      return this.verseBoxElement.getAttribute('verse-reference-id');
    }
  }

  getAbsoluteVerseNumber() {
    if (this.verseBoxElement == null) {
      return null;
    } else {
      return parseInt(this.verseBoxElement.getAttribute('abs-verse-nr'));
    }
  }

  getBibleBookShortTitle() {
    if (this.verseBoxElement == null) {
      return null;
    } else {
      return this.verseBoxElement.getAttribute('verse-bible-book-short');
    }
  }

  getSplittedReference() {
    if (this.verseBoxElement == null) {
      return null;
    } else {
      var verseReference = this.verseBoxElement.querySelector('.verse-reference-content').innerText;
      var splittedReference = verseReference.split(reference_separator);
      return splittedReference;
    }
  }

  getChapter() {
    var splittedReference = this.getSplittedReference();

    if (splittedReference != null) {
      var chapter = parseInt(splittedReference[0]);
      return chapter;
    } else {
      return null;
    }
  }

  getVerseNumber() {
    var splittedReference = this.getSplittedReference();

    if (splittedReference != null) {
      var verseNumber = parseInt(splittedReference[1]);
      return verseNumber;
    } else {
      return null;
    }
  }

  async getMappedAbsoluteVerseNumber(sourceBibleTranslationId, targetBibleTranslationId) {
    var sourceVersification = await app_controller.translation_controller.getVersification(sourceBibleTranslationId);
    var targetVersification = await app_controller.translation_controller.getVersification(targetBibleTranslationId);

    var absoluteVerseNumbers = await ipcDb.getAbsoluteVerseNumbersFromReference(sourceVersification,
                                                                                this.getBibleBookShortTitle(),
                                                                                this.getAbsoluteVerseNumber(),
                                                                                this.getChapter(),
                                                                                this.getVerseNumber());

    var mappedAbsoluteVerseNr = null;
    if (targetVersification == 'HEBREW') {
      mappedAbsoluteVerseNr = absoluteVerseNumbers.absoluteVerseNrHeb;
    } else {
      mappedAbsoluteVerseNr = absoluteVerseNumbers.absoluteVerseNrEng;
    }

    return mappedAbsoluteVerseNr;
  }

  getTagTitleFromTagData() {
    if (this.verseBoxElement == null) {
      return null;
    }

    var tag_elements = $(this.verseBoxElement).find('.tag-global, .tag-book');

    var tag_title_array = Array();

    for (var i = 0; i < tag_elements.length; i++) {
      var current_tag_element = $(tag_elements[i]);
      var current_title = current_tag_element.find('.tag-title').html();
      var current_tag_is_book = current_tag_element.hasClass('tag-book');
      if (current_tag_is_book) current_title = current_title + '*';

      tag_title_array.push(current_title);
    }

    tag_title_array.sort();

    return tag_title_array.join(', ');
  }

  updateTagTooltip() {
    if (this.verseBoxElement == null) {
      return null;
    }

    var new_tooltip = this.getTagTitleFromTagData();
    $(this.verseBoxElement).find('.tag-info').attr('title', new_tooltip);
  }


  getTagTitleArray() {
    if (this.verseBoxElement == null) {
      return null;
    }

    return $(this.verseBoxElement).find('.tag-info').attr('title').split(', ');
  }

  updateVisibleTags(tag_title_array=undefined) {
    if (this.verseBoxElement == null) {
      return;
    }

    var tag_box = $(this.verseBoxElement).find('.tag-box');
    tag_box.empty();

    if (tag_title_array == undefined) {
      tag_title_array = this.getTagTitleArray();
    }

    for (var i = 0; i < tag_title_array.length; i++) {
      var current_tag_title = tag_title_array[i];
      var tag_html = this.htmlForVisibleTag(current_tag_title);
      tag_box.append(tag_html);
    }

    if (tag_title_array.length > 0) {
      $(this.verseBoxElement).find('.tag').bind('click', async (event) => {
        await app_controller.handleReferenceClick(event);
      });
    }
  }

  htmlForVisibleTag(tag_title) {
    return `<div class='tag' title='${i18n.t('bible-browser.tag-hint')}'>${tag_title}</div>`;
  }

  changeVerseListTagInfo(tag_id, tag_title, action) {
    if (this.verseBoxElement == null) {
      return;
    }

    var current_tag_info = this.verseBoxElement.querySelector('.tag-info');
    var current_tag_info_title = current_tag_info.getAttribute('title');

    var new_tag_info_title_array = this.getNewTagInfoTitleArray(current_tag_info_title, tag_title, action);
    var updated = this.updateTagInfoTitle(current_tag_info, new_tag_info_title_array, current_tag_info_title);

    if (updated) {
      this.updateTagDataContainer(tag_id, tag_title, action);
      this.updateVisibleTags(new_tag_info_title_array);
    }
  }

  getNewTagInfoTitleArray(tag_info_title, tag_title, action) {
    var already_there = false;
    var current_tag_info_title_array = new Array;
    if (tag_info_title != "" && tag_info_title != undefined) {
      current_tag_info_title_array = tag_info_title.split(', ');
    }

    switch (action) {
      case "assign":
        for (var j = 0; j < current_tag_info_title_array.length; j++) {
          if (current_tag_info_title_array[j] == tag_title) {
            already_there = true;
            break;
          }
        }

        if (!already_there) {
          current_tag_info_title_array.push(tag_title);
          current_tag_info_title_array.sort();
        }
        break;

      case "remove":
        for (var j = 0; j < current_tag_info_title_array.length; j++) {
          if (current_tag_info_title_array[j] == tag_title) {
            current_tag_info_title_array.splice(j, 1);
            break;
          }
        }
        
        break;
    }

    return current_tag_info_title_array;
  }

  updateTagInfoTitle(tag_info, new_title_array, old_title) {
    var new_tag_info_title = "";

    if (new_title_array.length > 1) {
      new_tag_info_title = new_title_array.join(', ');
    } else {
      if (new_title_array.length == 1) {
        new_tag_info_title = new_title_array[0];
      } else {
        new_tag_info_title = "";
      }
    }

    if (new_tag_info_title == old_title) {
      return false;

    } else {
      tag_info.setAttribute('title', new_tag_info_title);
      if (new_tag_info_title != "") {
        tag_info.classList.add('visible');
      } else {
        tag_info.classList.remove('visible');
      }

      return true;
    }
  }

  updateTagDataContainer(tag_id, tag_title, action) {
    if (this.verseBoxElement == null) {
      return;
    }

    var current_tag_data_container = $(this.verseBoxElement.querySelector('.tag-data'));

    switch (action) {
      case "assign":
        var new_tag_data_div = this.newTagDataHtml("tag-global", tag_title, tag_id);
        current_tag_data_container.append(new_tag_data_div);
        break;

      case "remove":
        var existing_tag_data_div = current_tag_data_container.find('.tag-id').filter(function(index){
          return ($(this).html() == tag_id);
        }).parent();
        
        existing_tag_data_div.detach();
        break;
    }
  }

  newTagDataHtml(tag_class, title, id) {
    var new_tag_data_div = "<div class='" + tag_class + "'>";
    new_tag_data_div += "<div class='tag-title'>" + title + "</div>";
    new_tag_data_div += "<div class='tag-id'>" + id + "</div>";
    new_tag_data_div += "</div>";

    return new_tag_data_div;
  }
}

module.exports = VerseBox;