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

class TagStatistics {
  constructor() {}

  getBookTagStatistics() {
    var global_tags_box_el = $('#tags-content-global');
    var checkbox_tags = global_tags_box_el.find('.checkbox-tag');
    var book_tag_statistics = [];

    for (var i = 0; i < checkbox_tags.length; i++) {
      var current_checkbox_tag = $(checkbox_tags[i]);
      var current_checkbox_title = current_checkbox_tag.find('.cb-label').text();
      var current_book_assignment_count = parseInt(current_checkbox_tag.attr('book-assignment-count'));
      book_tag_statistics[current_checkbox_title] = current_book_assignment_count;
    }

    return book_tag_statistics;
  }

  async updateBookTagStatisticsBox(book_tag_statistics=undefined) {
    if (book_tag_statistics === undefined) {
      book_tag_statistics = this.getBookTagStatistics();
    }

    var tags_by_verse_count = Object.keys(book_tag_statistics).sort(
      function(a,b) {
        return book_tag_statistics[b] - book_tag_statistics[a];
      }
    );

    var currentBibleTranslationId = app_controller.tab_controller.getTab().getBibleTranslationId();
    var currentBook = app_controller.tab_controller.getTab().getBook();
    if (currentBook == null) {
      return;
    }

    var chapterCount = await ipcNsi.getBookChapterCount(currentBibleTranslationId, currentBook);
    var allChapterVerseCounts = await ipcNsi.getAllChapterVerseCounts(currentBibleTranslationId, currentBook);

    if (chapterCount == null || allChapterVerseCounts == null) {
      return;
    }

    var overall_verse_count = 0;
    for (let i = 0; i < chapterCount; i++) {
      let currentChapterVerseCount = allChapterVerseCounts[i];
      overall_verse_count += currentChapterVerseCount;
    }

    var tag_statistics_html = "<table class='tag-statistics'>";
    tag_statistics_html += "<tr><th style='text-align: left;'>Tag</th>"
                        +  "<th style='text-align: left; width: 2em;'>#</th>"
                        +  "<th style='text-align: left; width: 2em;'>%</th></tr>";
    
    const MAX_CLUSTERS = 6;
    var MIN_CLUSTER_PERCENT = 3;

    var clusters = [];
    var maxClusterPercentage = 0;

    for (let i = 0; i < tags_by_verse_count.length; i++) {
      let tag_title = tags_by_verse_count[i];
      let tagged_verse_count = book_tag_statistics[tag_title];
      let tagged_verse_percent = Math.round((tagged_verse_count / overall_verse_count) * 100);
      
      if (!clusters.includes(tagged_verse_percent) && clusters.length < MAX_CLUSTERS) {
        if (tagged_verse_percent > maxClusterPercentage) {
          maxClusterPercentage = tagged_verse_percent;
        }

        clusters.push(tagged_verse_percent);
      }

      if (clusters.length >= MAX_CLUSTERS) {
        break;
      }
    }

    if (maxClusterPercentage == MIN_CLUSTER_PERCENT) {
      MIN_CLUSTER_PERCENT -= 1;
    }

    var wasMoreFrequent = true;

    for (let i = 0; i < tags_by_verse_count.length; i++) {
      let tag_title = tags_by_verse_count[i];
      let tagged_verse_count = book_tag_statistics[tag_title];
      if (tagged_verse_count == 0) {
        continue;
      }

      let tagged_verse_percent = Math.round((tagged_verse_count / overall_verse_count) * 100);
      let current_row_html = "";

      let isLessFrequent = tagged_verse_percent < MIN_CLUSTER_PERCENT || !clusters.includes(tagged_verse_percent);

      if (i == 0) {
        current_row_html += `<tr><td style='font-weight: bold; font-style: italic; padding-top: 0.5em;' colspan='3'>${i18n.t('tags.most-frequently-used')}</td></tr>`;
      } else if (wasMoreFrequent && isLessFrequent) {
        current_row_html += `<tr><td style='font-weight: bold; font-style: italic; padding-top: 1em;' colspan='3'>${i18n.t('tags.less-frequently-used')}</td></tr>`;
      }

      current_row_html = current_row_html + `<tr><td style="width: 20em;">${tag_title}</td><td>${tagged_verse_count}</td><td>${tagged_verse_percent}</td></tr>`;
      tag_statistics_html += current_row_html;
      
      wasMoreFrequent = tagged_verse_percent >= MIN_CLUSTER_PERCENT && clusters.includes(tagged_verse_percent);
    }

    tag_statistics_html += "</table>";

    var bookTagStatisticsBoxContent = document.getElementById('book-tag-statistics-box-content');
    bookTagStatisticsBoxContent.innerHTML = tag_statistics_html;
  }

  async toggleBookTagStatisticsButton(index=undefined) {
    var verseListTabs = document.getElementById('verse-list-tabs');
    var book_tag_statistics_button = $(verseListTabs).find('.show-book-tag-statistics-button');

    if (index === undefined) {
      index = app_controller.tab_controller.getSelectedTabIndex();
    }
    
    var currentTab = app_controller.tab_controller.getTab(index);

    if (currentTab != null && currentTab.getTextType() == 'book') {
      var tagsCount = await ipcDb.getTagCount();

      if (tagsCount > 0) {
        book_tag_statistics_button.removeClass('ui-state-disabled');
        book_tag_statistics_button.removeClass('events-configured');
      }

      book_tag_statistics_button.unbind('click');
      book_tag_statistics_button.bind('click', (event) => {
        if (!$(event.target).hasClass('ui-state-disabled')) {
          this.openBookTagStatistics();
        }
      });
      book_tag_statistics_button.show();
    } else {
      book_tag_statistics_button.unbind();
      book_tag_statistics_button.addClass('ui-state-disabled');
      book_tag_statistics_button.addClass('events-configured');
    }

    uiHelper.configureButtonStyles('.verse-list-menu');
  };

  async openBookTagStatistics() {
    var currentVerseList = app_controller.getCurrentVerseList();
    var verse_list_position = currentVerseList.offset();
    var currentTab = app_controller.tab_controller.getTab();
    var currentBookTranslation = await ipcDb.getBookTitleTranslation(currentTab.getBook());

    $('#book-tag-statistics-box').dialog({
      dialogClass: 'ezra-dialog',
      position: [verse_list_position.left + 50, verse_list_position.top + 50],
      width: 350,
      title: currentBookTranslation + ' - ' + i18n.t("bible-browser.tag-statistics")
    });
  }
}

module.exports = TagStatistics;