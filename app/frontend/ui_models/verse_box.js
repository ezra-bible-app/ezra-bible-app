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

const { waitUntilIdle } = require('../helpers/ezra_helper.js');
const i18nHelper = require('../helpers/i18n_helper.js');
const Verse = require('./verse.js');

class VerseBox {
  constructor(verseBoxElement) {
    this.verseBoxElement = verseBoxElement;
  }

  async getVerseObject(referenceSeparator=window.reference_separator,
                       sourceBibleTranslationId=undefined,
                       targetBibleTranslationId=undefined) {

    var isBookNoteVerse = this.isBookNoteVerse();
    var verse = undefined;

    if (isBookNoteVerse) {
      verse = new Verse(
        app_controller.tab_controller.getTab().getBook(),
        null,
        null,
        null,
        isBookNoteVerse
      );

    } else {
      let absoluteVerseNumber = null;

      if (sourceBibleTranslationId != null && targetBibleTranslationId != null) {
        absoluteVerseNumber = await this.getMappedAbsoluteVerseNumber(sourceBibleTranslationId, targetBibleTranslationId);
      } else {
        absoluteVerseNumber = this.getAbsoluteVerseNumber();
      }

      verse = new Verse(
        this.getBibleBookShortTitle(),
        absoluteVerseNumber,
        this.getChapter(referenceSeparator),
        this.getVerseNumber(referenceSeparator),
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

  getReference() {
    if (this.verseBoxElement == null) {
      return null;
    } else {
      var verseReferenceElement = this.verseBoxElement.querySelector('.verse-reference-content');
      var verseReference = null;
      
      if (verseReferenceElement != null) {
        verseReference = verseReferenceElement.innerText;
      }

      return verseReference;
    }
  }

  getSplittedReference(referenceSeparator=window.reference_separator) {
    if (this.verseBoxElement == null) {
      return null;
    } else {
      var verseReference = this.getReference();
      var splittedReference = verseReference.split(referenceSeparator);
      return splittedReference;
    }
  }

  getChapter(referenceSeparator=window.reference_separator) {
    var splittedReference = this.getSplittedReference(referenceSeparator);

    if (splittedReference != null) {
      var chapter = parseInt(splittedReference[0]);
      return chapter;
    } else {
      return null;
    }
  }

  getVerseNumber(referenceSeparator=window.reference_separator) {
    var splittedReference = this.getSplittedReference(referenceSeparator);

    if (splittedReference != null) {
      var verseNumber = parseInt(splittedReference[1]);
      return verseNumber;
    } else {
      return null;
    }
  }

  async getMappedAbsoluteVerseNumber(sourceBibleTranslationId, targetBibleTranslationId) {
    const swordModuleHelper = require('../helpers/sword_module_helper.js');
    const sourceVersification = await swordModuleHelper.getVersification(sourceBibleTranslationId);
    const targetVersification = await swordModuleHelper.getVersification(targetBibleTranslationId);
    const referenceSeparator = await i18nHelper.getReferenceSeparator(sourceBibleTranslationId);

    const absoluteVerseNumbers = await ipcDb.getAbsoluteVerseNumbersFromReference(sourceVersification,
                                                                                 this.getBibleBookShortTitle(),
                                                                                 this.getAbsoluteVerseNumber(),
                                                                                 this.getChapter(referenceSeparator),
                                                                                 this.getVerseNumber(referenceSeparator));

    let mappedAbsoluteVerseNr = null;
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

  async updateVisibleTags(tag_title_array=undefined) {
    if (this.verseBoxElement == null) {
      return;
    }

    let tagGroupFilterOption = app_controller.optionsMenu._tagGroupFilterOption;
    let tagGroupId = tag_assignment_panel.currentTagGroupId;
    let filterTags = true;
    let tagGroupMemberIds = [];

    if (tagGroupId == null || tagGroupId < 0 || !tagGroupFilterOption.isChecked) {
      filterTags = false;
    } else {
      tagGroupMemberIds = await tag_assignment_panel.tag_store.getTagGroupMemberIds(tagGroupId);
    }

    var tag_box = $(this.verseBoxElement).find('.tag-box');
    tag_box.empty();

    if (tag_title_array == undefined) {
      tag_title_array = this.getTagTitleArray();
    }

    for (let i = 0; i < tag_title_array.length; i++) {
      let current_tag_title = tag_title_array[i];
      let current_tag = await tag_assignment_panel.tag_store.getTagByTitle(current_tag_title);

      if (current_tag != null) {
        let visible = true;

        if (filterTags && !tagGroupMemberIds.includes(current_tag.id)) {
          visible = false;
        }

        let tag_html = this.htmlForVisibleTag(current_tag_title, current_tag.id, visible);
        tag_box.append(tag_html);
      }
    }

    if (tag_title_array.length > 0) {
      $(this.verseBoxElement).find('.tag').bind('click', async (event) => {
        const verseListController = require('../controllers/verse_list_controller.js');
        await verseListController.handleReferenceClick(event);
      });
    }
  }

  async highlightTag(tagId) {
    let color = 'var(--highlight-object-color)';
    
    if (await theme_controller.isNightModeUsed()) {
      color = 'var(--highlight-object-color-dark)';
    }

    $(this.verseBoxElement).find(`.tag[tag-id='${tagId}']`).effect("highlight", {color: color}, 3000);
  }

  htmlForVisibleTag(tag_title, newTagId, visible=true) {
    let cssClass = visible ? 'tag' : 'tag hidden';
    let tagHtml = `<div class='${cssClass}' title='${i18n.t('bible-browser.tag-hint')}'`;

    if (newTagId !== undefined) {
      tagHtml += ` tag-id='${newTagId}'`;
    }

    tagHtml += `>${tag_title}</div>`;

    return tagHtml;
  }

  async changeVerseListTagInfo(tag_id, tag_title, action, highlight=false) {
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

      if (highlight) {
        await waitUntilIdle();
        await this.highlightTag(tag_id);
      }
    }
  }

  getNewTagInfoTitleArray(tag_info_title, tag_title, action) {
    var already_there = false;
    var current_tag_info_title_array = new Array;
    var original_tag_title = tag_title;

    // If the tag title itself contains a comma then we need to replace it with
    // something else while we generate the new tag info title array,
    // because we use the comma as separator there.
    while (tag_title.indexOf(',') != -1) {
      tag_title = tag_title.replace(',', '|');
    }

    tag_info_title = tag_info_title.replace(original_tag_title, tag_title);

    if (tag_info_title != "" && tag_info_title != undefined) {
      current_tag_info_title_array = tag_info_title.split(', ');
    }

    switch (action) {
      case "assign":
        for (let j = 0; j < current_tag_info_title_array.length; j++) {
          if (current_tag_info_title_array[j] == tag_title) {
            already_there = true;
            break;
          }
        }

        if (!already_there) {
          current_tag_info_title_array.push(original_tag_title);
          current_tag_info_title_array.sort();
        }
        break;

      case "remove":
        for (let j = 0; j < current_tag_info_title_array.length; j++) {
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
        // eslint-disable-next-line no-unused-vars
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