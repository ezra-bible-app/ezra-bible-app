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

const eventController = require('../../controllers/event_controller.js');
const verseListController = require('../../controllers/verse_list_controller.js');

class TagStatistics {
  constructor() {
    this._frequentTagsList = [];

    eventController.subscribe('on-bible-text-loaded', async (tabIndex) => {
      this.disableIfNeeded(tabIndex);
      this.clearTagStatisticsPanelIfNeeded(tabIndex);
    });

    eventController.subscribe('on-tab-selected', (tabIndex) => {
      this.disableIfNeeded(tabIndex);

      if (this.getContentBox().style.display == 'none') {
        this.clearTagStatisticsPanelIfNeeded(tabIndex);
      } else {
        this.showTagStatistics();
      }
    });

    eventController.subscribeMultiple(['on-tag-deleted', 'on-latest-tag-changed'], async () => {
      await this.updateBookTagStatistics();
    });

    eventController.subscribe('on-tag-group-list-activated', () => {
      this.getContentBox().style.display = 'none';
      document.getElementById('tag-statistics-panel-tag-group-list').style.removeProperty('display');
    });

    eventController.subscribe('on-tag-group-selected', async () => {
      this.showTagStatistics();
    });
  }

  getContentBox() {
    return document.getElementById('tag-statistics-panel-content');
  }

  hideTagGroupList() {
    document.getElementById('tag-statistics-panel-tag-group-list').style.display = 'none';
  }

  async showTagStatistics() {
    this.hideTagGroupList();
    this.getContentBox().style.removeProperty('display');
    await this.updateBookTagStatistics();
  }

  clearTagStatisticsPanelIfNeeded(tabIndex) {
    var tab = app_controller.tab_controller.getTab(tabIndex);

    if (tab.getTextType() != 'book') {
      this.getContentBox().innerHTML = '';
    }
  }

  disableIfNeeded(tabIndex) {
    var panelButtons = document.getElementById('panel-buttons');
    var tab = app_controller.tab_controller.getTab(tabIndex);

    if (!tab.isBook()) {
      panelButtons.disable('tag-statistics-panel');
    } else {
      panelButtons.enable('tag-statistics-panel');
    }
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

  getOverallTagCount(bookTagStatistics) {
    var overallTagCount = 0;

    for (var tag in bookTagStatistics) {
      let tagVerseCount = bookTagStatistics[tag];
      overallTagCount += tagVerseCount;
    }

    return overallTagCount;
  }

  getTagPercentage(bookTagStatistics, tagTitle, overallTagCount) {
    let taggedVerseCount = bookTagStatistics[tagTitle];
    let taggedVersePercent = Math.round((taggedVerseCount / overallTagCount) * 100);
    return taggedVersePercent;
  }

  getHighFrequencyClusters(overallTagCount) {
    const MAX_CLUSTERS = 4;

    var clusters = [];
    var maxClusterPercentage = 0;

    for (let i = 0; i < this._tagsByVerseCount.length; i++) {
      let tagTitle = this._tagsByVerseCount[i];
      let taggedVersePercent = this.getTagPercentage(this._currentBookTagStatistics, tagTitle, overallTagCount);
      
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

  async refreshBookTagStatistics(tag_list, tag_statistics, current_book) {
    var book_tag_statistics = [];
    
    for (var i = 0; i < tag_list.length; i++) {
      var currentTag = tag_list[i];
      var currentTagStatistics = tag_statistics[currentTag.id];

      if (currentTagStatistics != null) {
        var is_used_in_current_book = (currentTagStatistics.bookAssignmentCount > 0) ? true : false;

        if (current_book != null && is_used_in_current_book) {
          book_tag_statistics[currentTag.title] = parseInt(currentTagStatistics.bookAssignmentCount);
        }
      }
    }

    if (current_book != null) {
      await this.updateBookTagStatistics(book_tag_statistics);
    }
  }

  async updateBookTagStatistics(bookTagStatistics=undefined) {
    var currentBook = app_controller.tab_controller.getTab().getBook();
    if (currentBook == null) {
      return;
    }

    if (bookTagStatistics === undefined) {
      this._currentBookTagStatistics = this.getBookTagStatistics();
    } else {
      this._currentBookTagStatistics = bookTagStatistics;
    }

    this._frequentTagsList = [];

    this._tagsByVerseCount = this.getTagsByVerseCount(this._currentBookTagStatistics);
    this._overallTagCount = this.getOverallTagCount(this._currentBookTagStatistics);

    var currentBibleTranslationId = app_controller.tab_controller.getTab().getBibleTranslationId();
    var chapterCount = await ipcNsi.getBookChapterCount(currentBibleTranslationId, currentBook);
    var allChapterVerseCounts = await ipcNsi.getAllChapterVerseCounts(currentBibleTranslationId, currentBook);

    var bookTagStatisticsBoxContent = this.getContentBox();

    if (this.isEmpty()) {
      let helpInstructionPart1 = i18n.t('tag-statistics-panel.help-instruction-part1', { interpolation: {escapeValue: false} });
      let helpInstructionPart2 = '';

      if (tag_assignment_panel.tagGroupUsed()) {
        helpInstructionPart2 = i18n.t('tag-statistics-panel.help-instruction-part2-tag-group', { interpolation: {escapeValue: false} });
      } else {
        helpInstructionPart2 = i18n.t('tag-statistics-panel.help-instruction-part2', { interpolation: {escapeValue: false} });
      }

      let helpInstructionPart3 = i18n.t('tag-statistics-panel.help-instruction-part3', { interpolation: {escapeValue: false} });
      bookTagStatisticsBoxContent.innerHTML = `
        <p>${helpInstructionPart1}<br/><br/>${helpInstructionPart2} ${helpInstructionPart3}</p>
      `;
    }

    if (chapterCount == null || allChapterVerseCounts == null || this.isEmpty()) {
      return;
    }

    var tagStatisticsHTML = "<table class='tag-statistics'>";
    tagStatisticsHTML += `<tr><th style='text-align: left;'>${i18n.t('tags.tag')}</th>`
                        +  "<th style='text-align: left; width: 2em;'>#</th>"
                        +  "<th style='text-align: left; width: 2em;'>%</th></tr>";
    
    var [clusters, maxClusterPercentage] = this.getHighFrequencyClusters(this._overallTagCount);
    var MIN_CLUSTER_PERCENT = 2;

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

      let taggedVersePercent = this.getTagPercentage(this._currentBookTagStatistics, tag_title, this._overallTagCount);
      let isLessFrequent = taggedVersePercent < MIN_CLUSTER_PERCENT || !clusters.includes(taggedVersePercent);
      let currentRowHTML = "";

      if (i == 0) {
        currentRowHTML += `<tr><td style='font-weight: bold; font-style: italic; padding-top: 0.5em;' colspan='3'>${i18n.t('tags.most-frequently-used')}</td></tr>`;
      } else if (wasMoreFrequent && isLessFrequent) {
        currentRowHTML += `<tr><td style='font-weight: bold; font-style: italic; padding-top: 1em;' colspan='3'>${i18n.t('tags.less-frequently-used')}</td></tr>`;
      }

      currentRowHTML = currentRowHTML + `
        <tr>
          <td style='width: 22em;'><a class='tagLink' title='${i18n.t('bible-browser.tag-hint')}' href=''>${tag_title}</a></td>
          <td>${taggedVerseCount}</td>
          <td>${taggedVersePercent}</td>
        </tr>
      `;

      tagStatisticsHTML += currentRowHTML;
      
      wasMoreFrequent = taggedVersePercent >= MIN_CLUSTER_PERCENT && clusters.includes(taggedVersePercent);
      
      if (wasMoreFrequent) {
        this._frequentTagsList.push(tag_title);
      }
    }

    tagStatisticsHTML += "</table>";

    bookTagStatisticsBoxContent.innerHTML = tagStatisticsHTML;

    this.bindEvents();
    this.highlightFrequentlyUsedTags();
  }

  bindEvents() {
    const bookTagStatisticsBoxContent = this.getContentBox();
    let tagLinks = bookTagStatisticsBoxContent.querySelectorAll('.tagLink');

    tagLinks.forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        app_controller.verse_list_popup.openVerseListPopup(event, 'TAGGED_VERSES', true);
      });
    });
  }

  highlightFrequentlyUsedTags() {
    var currentVerseList = verseListController.getCurrentVerseList()[0];
    var allTags = currentVerseList.querySelectorAll('.tag');

    allTags.forEach((tag) => {
      let tagTitle = tag.textContent;

      if (this._frequentTagsList.includes(tagTitle)) {
        tag.classList.add('tag-highly-frequent');
      } else {
        tag.classList.remove('tag-highly-frequent');
      }
    });
  }

  isEmpty() {
    return this._tagsByVerseCount.length == 0;
  }
}

module.exports = TagStatistics;