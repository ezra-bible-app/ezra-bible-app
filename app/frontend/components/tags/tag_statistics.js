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
  constructor() {
    this._frequentTagsList = [];
  }

  getBookTagStatistics() {
    var globalTagsBoxEl = $('#tags-content-global');
    var checkboxTags = globalTagsBoxEl.find('.checkbox-tag');
    var bookTagStatistics = [];

    for (var i = 0; i < checkboxTags.length; i++) {
      var currentCheckboxTag = $(checkboxTags[i]);
      var currentCheckboxTitle = currentCheckboxTag.find('.cb-label').text();
      var currentBookAssignmentCount = parseInt(currentCheckboxTag.attr('book-assignment-count'));
      bookTagStatistics[currentCheckboxTitle] = currentBookAssignmentCount;
    }

    return bookTagStatistics;
  }

  getTagsByVerseCount(bookTagStatistics) {
    var tagsByVerseCount = Object.keys(bookTagStatistics).sort(
      function(a,b) {
        return bookTagStatistics[b] - bookTagStatistics[a];
      }
    );

    return tagsByVerseCount;
  }

  getHighFrequencyClusters(overallVerseCount) {
    const MAX_CLUSTERS = 6;

    var clusters = [];
    var maxClusterPercentage = 0;

    for (let i = 0; i < this._tagsByVerseCount.length; i++) {
      let tagTitle = this._tagsByVerseCount[i];
      let taggedVerseCount = this._currentBookTagStatistics[tagTitle];
      let taggedVersePercent = Math.round((taggedVerseCount / overallVerseCount) * 100);
      
      if (!clusters.includes(taggedVersePercent) && clusters.length < MAX_CLUSTERS) {
        if (taggedVersePercent > maxClusterPercentage) {
          maxClusterPercentage = taggedVersePercent;
        }

        clusters.push(taggedVersePercent);
      }

      if (clusters.length >= MAX_CLUSTERS) {
        break;
      }
    }

    return [ clusters, maxClusterPercentage ];
  }

  async updateBookTagStatistics(bookTagStatistics=undefined) {
    if (bookTagStatistics === undefined) {
      this._currentBookTagStatistics = this.getBookTagStatistics();
    } else {
      this._currentBookTagStatistics = bookTagStatistics;
    }

    this._frequentTagsList = [];

    this._tagsByVerseCount = this.getTagsByVerseCount(this._currentBookTagStatistics);

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

    var overallVerseCount = 0;
    for (let i = 0; i < chapterCount; i++) {
      let currentChapterVerseCount = allChapterVerseCounts[i];
      overallVerseCount += currentChapterVerseCount;
    }

    var tagStatisticsHTML = "<table class='tag-statistics'>";
    tagStatisticsHTML += "<tr><th style='text-align: left;'>Tag</th>"
                        +  "<th style='text-align: left; width: 2em;'>#</th>"
                        +  "<th style='text-align: left; width: 2em;'>%</th></tr>";
    
    var [clusters, maxClusterPercentage] = this.getHighFrequencyClusters(overallVerseCount);
    var MIN_CLUSTER_PERCENT = 3;

    if (maxClusterPercentage == MIN_CLUSTER_PERCENT) {
      MIN_CLUSTER_PERCENT -= 1;
    }

    var wasMoreFrequent = true;

    for (let i = 0; i < this._tagsByVerseCount.length; i++) {
      let tag_title = this._tagsByVerseCount[i];
      let taggedVerseCount = this._currentBookTagStatistics[tag_title];
      if (taggedVerseCount == 0) {
        continue;
      }

      let taggedVersePercent = Math.round((taggedVerseCount / overallVerseCount) * 100);
      let isLessFrequent = taggedVersePercent < MIN_CLUSTER_PERCENT || !clusters.includes(taggedVersePercent);
      let currentRowHTML = "";

      if (i == 0) {
        currentRowHTML += `<tr><td style='font-weight: bold; font-style: italic; padding-top: 0.5em;' colspan='3'>${i18n.t('tags.most-frequently-used')}</td></tr>`;
      } else if (wasMoreFrequent && isLessFrequent) {
        currentRowHTML += `<tr><td style='font-weight: bold; font-style: italic; padding-top: 1em;' colspan='3'>${i18n.t('tags.less-frequently-used')}</td></tr>`;
      }

      currentRowHTML = currentRowHTML + `<tr><td style="width: 20em;">${tag_title}</td><td>${taggedVerseCount}</td><td>${taggedVersePercent}</td></tr>`;
      tagStatisticsHTML += currentRowHTML;
      
      wasMoreFrequent = taggedVersePercent >= MIN_CLUSTER_PERCENT && clusters.includes(taggedVersePercent);
      
      if (wasMoreFrequent) {
        this._frequentTagsList.push(tag_title);
      }
    }

    tagStatisticsHTML += "</table>";

    var bookTagStatisticsBoxContent = document.getElementById('book-tag-statistics-box-content');
    bookTagStatisticsBoxContent.innerHTML = tagStatisticsHTML;

    this.highlightFrequentlyUsedTags();
  }

  highlightFrequentlyUsedTags() {
    var currentVerseList = app_controller.getCurrentVerseList()[0];
    var allTags = currentVerseList.querySelectorAll('.tag');

    allTags.forEach((tag) => {
      let tagTitle = tag.innerText;

      if (this._frequentTagsList.includes(tagTitle)) {
        tag.classList.add('tag-highly-frequent');
      } else {
        tag.classList.remove('tag-highly-frequent');
      }
    });
  }

  async toggleBookTagStatisticsButton(index=undefined) {
    var verseListTabs = document.getElementById('verse-list-tabs');
    var bookTagStatistics_button = $(verseListTabs).find('.show-book-tag-statistics-button');

    if (index === undefined) {
      index = app_controller.tab_controller.getSelectedTabIndex();
    }
    
    var currentTab = app_controller.tab_controller.getTab(index);

    if (currentTab != null && currentTab.getTextType() == 'book') {
      var tagsCount = await ipcDb.getTagCount();

      if (tagsCount > 0) {
        bookTagStatistics_button.removeClass('ui-state-disabled');
        bookTagStatistics_button.removeClass('events-configured');
      }

      bookTagStatistics_button.unbind('click');
      bookTagStatistics_button.bind('click', (event) => {
        if (!$(event.target).hasClass('ui-state-disabled')) {
          this.openBookTagStatistics();
        }
      });
      bookTagStatistics_button.show();
    } else {
      bookTagStatistics_button.unbind();
      bookTagStatistics_button.addClass('ui-state-disabled');
      bookTagStatistics_button.addClass('events-configured');
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