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

class TagStore {
  constructor() {
    this.tagList = null;
    this.bookTagStatistics = {};
  }

  async getTagList(forceRefresh=false) {
    if (this.tagList == null || forceRefresh) {
      this.tagList = await models.Tag.getAllTags();
    }

    return this.tagList;
  }

  async getBookTagStatistics(book, forceRefresh=false) {
    if (book === undefined) {
      var book = bible_browser_controller.tab_controller.getTab().getBook();
    }

    var bibleBook = await models.BibleBook.findOne({ where: { shortTitle: book }});
    
    var bibleBookId = 0;
    if (bibleBook != null) {
      bibleBookId = bibleBook.id;
    }

    if (!(bibleBookId in this.bookTagStatistics) || forceRefresh) {
      var tagListWithStats = await models.Tag.getAllTags(bibleBookId, false, true);
      var tagStatsDict = {};

      for (var i = 0; i < tagListWithStats.length; i++) {
        var currentTag = tagListWithStats[i];
        tagStatsDict[currentTag.id] = currentTag;
      }

      this.bookTagStatistics[bibleBookId] = tagStatsDict;
    }

    return this.bookTagStatistics[bibleBookId];
  }
}

module.exports = TagStore;