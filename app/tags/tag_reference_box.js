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
   along with Ezra Project. See the file LICENSE.
   If not, see <http://www.gnu.org/licenses/>. */

class TagReferenceBox {
  constructor() {}

  initTagReferenceBox() {
    $('#tag-reference-box').dialog({
      width: 700,
      position: [200,200],
      autoOpen: false,
      dialogClass: 'ezra-dialog'
    });

    var currentBookFilter = "";
    currentBookFilter = "<input type='checkbox' id='only-currentbook-tagged-verses' style='margin-right: 0.2em;'></input>" + 
                        `<label id='only-currentbook-tagged-verses-label' for='only-currentbook-tagged-verses'>${i18n.t('tags.only-currentbook-tagged-verses')}</label>` +
                        "<span id='current-book-tagged-verses-count'></span>";
    
    $('#tag-reference-box').prev().append(currentBookFilter);                       

    this.getCurrentBookFilterCheckbox().bind('click', () => {
      this.handleCurrentBookFilterClick();
    });
  }

  getCurrentBookFilterCheckbox() {
    return $('#only-currentbook-tagged-verses');
  }

  getCurrentBookFilterCheckboxLabel() {
    return $('#only-currentbook-tagged-verses-label');
  }

  getCurrentBookTaggedVersesCountLabel() {
    return $('#current-book-tagged-verses-count');
  }

  getCurrentTextType() {
    var currentTextType = bible_browser_controller.tab_controller.getTab()?.getTextType();
    return currentTextType;
  }

  getCurrentBook() {
    var currentBook = bible_browser_controller.tab_controller.getTab().getBook();
    return currentBook;
  }

  getNumberOfVersesForCurrentBook() {
    var currentBook = this.getCurrentBook();
    var allVerses = document.getElementById('tag-reference-box-verse-list').querySelectorAll('.verse-box');
    var currentBookVerseCount = 0;

    for (var i = 0;  i < allVerses.length; i++) {
      var currentVerseBox = allVerses[i];
      var currentVerseBoxBook = currentVerseBox.querySelector('.verse-bible-book-short').innerText;

      if (currentVerseBoxBook == currentBook) {
        currentBookVerseCount++;
      }
    }

    return currentBookVerseCount;
  }

  handleCurrentBookFilterClick() {
    var currentBook = this.getCurrentBook();
    var isChecked = this.getCurrentBookFilterCheckbox().prop('checked');

    var tagReferenceBox = document.getElementById('tag-reference-box');
    var bookHeaders = tagReferenceBox.querySelectorAll('.tag-browser-verselist-book-header');
    var verseBoxes = tagReferenceBox.querySelectorAll('.verse-box');

    for (var i = 0; i < bookHeaders.length; i++) {
      var currentHeaderBookName = bookHeaders[i].getAttribute('bookname');

      if (!isChecked || isChecked && currentHeaderBookName == currentBook) {
        $(bookHeaders[i]).show();
      } else {
        $(bookHeaders[i]).hide();
      }
    }

    for (var i = 0; i < verseBoxes.length; i++) {
      var currentVerseBox = verseBoxes[i];
      var currentVerseBoxBook = currentVerseBox.querySelector('.verse-bible-book-short').innerText;

      if (!isChecked || isChecked && currentVerseBoxBook == currentBook) {
        $(currentVerseBox).show();
      } else {
        $(currentVerseBox).hide();
      }
    }
  }

  handleTagReferenceClick(event) {
    var verse_box = $(event.target).closest('.verse-box');
    var selected_tag = $(event.target).html().trim();
    selected_tag = selected_tag.replace(/&nbsp;/g, ' ');
    selected_tag = selected_tag.replace(/&amp;/g, '&');
    var tag_id = null;

    var tag_info_list = verse_box.find('.tag-global');
    for (var i = 0; i < tag_info_list.length; i++) {
      var current_tag_info = $(tag_info_list[i]);
      var current_tag_title = current_tag_info.find('.tag-title').text();

      if (current_tag_title == selected_tag) {
        tag_id = current_tag_info.find('.tag-id').text();
        break;
      }
    }

    var currentTabId = bible_browser_controller.tab_controller.getSelectedTabId();
    var currentTabIndex = bible_browser_controller.tab_controller.getSelectedTabIndex();

    bible_browser_controller.text_loader.requestVersesForSelectedTags(
      currentTabIndex,
      currentTabId,
      tag_id,
      (htmlVerses, verseCount) => { this.renderTaggedVerseListInReferenceBox(htmlVerses, verseCount); },
      'html',
      false
    );

    var box_position = this.getOverlayVerseBoxPosition(verse_box);
    var title = i18n.t("tags.verses-tagged-with") + ' "' + selected_tag + '"';

    $('#tag-reference-box').dialog({
      position: [box_position.left, box_position.top],
      title: title
    });

    var currentTextType = this.getCurrentTextType();
    var bookFilterCheckbox = this.getCurrentBookFilterCheckbox();
    var bookFilterCheckboxLabel = this.getCurrentBookFilterCheckboxLabel();
    var bookTaggedVersesCount = this.getCurrentBookTaggedVersesCountLabel();

    if (currentTextType == 'book') {
      bookFilterCheckbox.show();
      bookFilterCheckboxLabel.show();
      bookTaggedVersesCount.show();
    } else {
      bookFilterCheckbox.hide();
      bookFilterCheckboxLabel.hide();
      bookTaggedVersesCount.hide();
    }

    bookFilterCheckbox.prop('checked', false);

    $('#tag-reference-box-verse-list').hide();
    $('#tag-reference-box-verse-list').empty();
    $('#tag-references-loading-indicator').find('.loader').show();
    $('#tag-references-loading-indicator').show();
    $('#tag-reference-box').dialog("open");
  }

  getOverlayVerseBoxPosition(verse_box) {
    var currentVerseListComposite = bible_browser_controller.getCurrentVerseListComposite();

    var verse_box_position = verse_box.offset();
    var verse_box_class = verse_box.attr('class');
    var verse_nr = parseInt(verse_box_class.match(/verse-nr-[0-9]*/)[0].split('-')[2]);
    var next_verse_nr = verse_nr + 1;

    var next_verse_box = currentVerseListComposite.find('.verse-nr-' + next_verse_nr);
    var next_verse_box_position = next_verse_box.offset();
    if (next_verse_box_position == undefined) {
      next_verse_box_position = verse_box.offset();
    }
    var verse_list_height = currentVerseListComposite.height();
    var verse_list_position = currentVerseListComposite.offset();
    var screen_bottom = verse_list_position.top + verse_list_height;
    var cross_reference_box_height = 240;
    var overlay_box_position = null;

    var appContainerWidth = $(window).width();
    var offsetLeft = appContainerWidth - 700;

    if ((next_verse_box_position.top + cross_reference_box_height) <
        screen_bottom) {
      // The box does fit in the screen space between the beginning
      // of the next verse box and the bottom of the screen
      overlay_box_position = {
        top: next_verse_box_position.top + 7,
        left: offsetLeft
      };
    } else {
      // The box does NOT fit in the screen space between the beginning
      // of the next verse box and the bottom of the screen
      overlay_box_position = {
        top: verse_box_position.top - cross_reference_box_height - 120,
        left: offsetLeft
      };
    }

    return overlay_box_position;
  }

  renderTaggedVerseListInReferenceBox(htmlVerses, verseCount) {
    $('#tag-references-loading-indicator').hide();
    var tagReferenceBoxTitle = $('#tag-reference-box').dialog('option', 'title');
    tagReferenceBoxTitle += ' (' + verseCount + ')';

    $('#tag-reference-box').dialog({ title: tagReferenceBoxTitle });

    if (!bible_browser_controller.optionsMenu.xrefsSwitchChecked()) {
      $('#tag-reference-box-verse-list').addClass('verse-list-without-xrefs');
    }

    if (!bible_browser_controller.optionsMenu.footnotesSwitchChecked()) {
      $('#tag-reference-box-verse-list').addClass('verse-list-without-footnotes');
    }

    $('#tag-reference-box-verse-list').html(htmlVerses);

    if (this.getCurrentTextType() == 'book') {
      var currentBookVerseCount = this.getNumberOfVersesForCurrentBook();
      var bookTaggedVersesCountLabel = this.getCurrentBookTaggedVersesCountLabel();
      bookTaggedVersesCountLabel.text(` (${currentBookVerseCount})`);
    }

    bible_browser_controller.sword_notes.initForContainer($('#tag-reference-box-verse-list'));
    $('#tag-reference-box-verse-list').show();
  }
}

module.exports = TagReferenceBox;