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

class TagStatistics {
  constructor() {}

  get_book_tag_statistics() {
    var global_tags_box_el = $('#tags-content-global');
    var checkbox_tags = global_tags_box_el.find('.checkbox-tag');
    var book_tag_statistics = [];

    for (var i = 0; i < checkbox_tags.length; i++) {
      var current_checkbox_tag = $(checkbox_tags[i]);
      var current_checkbox_title = current_checkbox_tag.find('.cb-label').text();
      var current_book_assignment_count = parseInt(current_checkbox_tag.find('.book-assignment-count').text());
      book_tag_statistics[current_checkbox_title] = current_book_assignment_count;
    }

    return book_tag_statistics;
  }

  update_book_tag_statistics_box(book_tag_statistics=undefined) {
    if (book_tag_statistics === undefined) {
      book_tag_statistics = this.get_book_tag_statistics();
    }

    var tags_by_verse_count = Object.keys(book_tag_statistics).sort(
      function(a,b) {
        return book_tag_statistics[b] - book_tag_statistics[a];
      }
    );

    var currentBook = bible_browser_controller.tab_controller.getTab().getBook();
    var chapter_verse_counts = bible_chapter_verse_counts[currentBook];

    if (chapter_verse_counts != null) {
      var overall_verse_count = 0;
      for (var chapter of chapter_verse_counts) {
        if (chapter != 'nil') {
          overall_verse_count += chapter;
        }
      }

      var tag_statistics_html = "<table class='tag-statistics'>";
      tag_statistics_html += "<tr><th style='text-align: left;'>Tag</th>"
                          +  "<th style='text-align: left; width: 2em;'>#</th>"
                          +  "<th style='text-align: left; width: 2em;'>%</th></tr>";

      for (var i = 0; i < tags_by_verse_count.length; i++) {
        var tag_title = tags_by_verse_count[i];
        var tagged_verse_count = book_tag_statistics[tag_title];
        var tagged_verse_percent = Math.round((tagged_verse_count / overall_verse_count) * 100);

        var current_row_html = "<tr><td style='width: 20em;'>" + tag_title
                                          + "</td><td>" 
                                          + tagged_verse_count
                                          + "</td><td>"
                                          + tagged_verse_percent
                                          + "</td></tr>";
        tag_statistics_html += current_row_html;
      }
      tag_statistics_html += "</table>";

      $('#book-tag-statistics-box-content').empty();
      $('#book-tag-statistics-box-content').html(tag_statistics_html);
    }
  }

  async toggle_book_tags_statistics_button(index=undefined) {
    var book_tag_statistics_button = $('.show-book-tag-statistics-button');
    if (index === undefined) {
      index = bible_browser_controller.tab_controller.getSelectedTabIndex();
    }
    
    var currentTab = bible_browser_controller.tab_controller.getTab(index);

    if (currentTab != null && currentTab.getTextType() == 'book') {
      var tagsCount = await models.Tag.getTagCount();

      if (tagsCount > 0) {
        book_tag_statistics_button.removeClass('ui-state-disabled');
        book_tag_statistics_button.removeClass('events-configured');
      }

      book_tag_statistics_button.bind('click', (event) => {
        if (!$(event.target).hasClass('ui-state-disabled')) {
          this.open_book_tag_statistics();
        }
      });
      book_tag_statistics_button.show();
    } else {
      book_tag_statistics_button.unbind()
      book_tag_statistics_button.addClass('ui-state-disabled');
      book_tag_statistics_button.addClass('events-configured');
    }

    uiHelper.configureButtonStyles('.verse-list-menu');
  };

  open_book_tag_statistics() {
    var currentVerseList = bible_browser_controller.getCurrentVerseList();
    var verse_list_position = currentVerseList.offset();
    var currentTab = bible_browser_controller.tab_controller.getTab();
    var currentBookTranslation = models.BibleBook.getBookTitleTranslation(currentTab.getBook());

    $('#book-tag-statistics-box').dialog({
      dialogClass: 'ezra-dialog',
      position: [verse_list_position.left + 50, verse_list_position.top + 50],
      width: 350,
      title: currentBookTranslation + ' - ' + i18n.t("bible-browser.tag-statistics")
    });
  }
}

module.exports = TagStatistics;