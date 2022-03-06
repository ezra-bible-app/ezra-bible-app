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

const eventController = require('../../controllers/event_controller.js');
const ezraHelper = require('../../helpers/ezra_helper.js');

class TagStore {
  constructor() {
    this.tagList = null;
    this.bookTagStatistics = {};
    this.latest_timestamp = null;
    this.oldest_recent_timestamp = null;
    this.latest_tag_id = null;

    eventController.subscribePrioritized('on-tag-created', async (newTagId) => {
      this.resetBookTagStatistics();

      var currentTimestamp = new Date(Date.now()).getTime();
      this.updateTagTimestamp(newTagId, currentTimestamp);

      await this.updateLatestAndOldestTagData();
    });

    eventController.subscribePrioritized('on-tag-deleted', async () => {
      this.resetBookTagStatistics();
      await this.updateLatestAndOldestTagData();
    });

    eventController.subscribePrioritized('on-tag-renamed', async ({ tagId, newTitle }) => {
      await this.renameTag(tagId, newTitle);
    });

    eventController.subscribePrioritized('on-tag-group-members-changed', async ({ tagId, addTagGroups, removeTagGroups }) => {
      await this.updateTagGroups(tagId, addTagGroups, removeTagGroups);
    });
  }

  resetBookTagStatistics() {
    this.bookTagStatistics = {};
  }

  updateTagTimestamp(id, timestamp) {
    for (let i = 0; i < this.tagList.length; i++) {
      if (this.tagList[i].id == id) {
        this.tagList[i].lastUsed = timestamp;
        break;
      }
    }
  }

  async refreshTagList() {
    await this.getTagList(true);
  }

  async getTagList(forceRefresh=false) {
    if (this.tagList == null || forceRefresh) {
      this.tagList = await ipcDb.getAllTags();
      await this.updateLatestAndOldestTagData();
    }

    return this.tagList;
  }

  async tagExists(tagTitle) {
    var tagList = await this.getTagList();

    for (let i = 0; i < tagList.length; i++) {
      let currentTag = tagList[i];
      if (currentTag.title == tagTitle) {
        return true;
      }
    }

    return false;
  }

  async renameTag(tagId, newTitle) {
    var tag = await this.getTag(tagId);
    tag.title = newTitle;
  }

  async updateTagGroups(tagId, addTagGroups, removeTagGroups) {
    var tag = await this.getTag(tagId);

    var tagGroupList = tag.tagGroupList;

    addTagGroups.forEach((tagGroupId) => {
      tagGroupList.push(tagGroupId);
    });

    removeTagGroups.forEach((tagGroupId) => {
      tag.tagGroupList = ezraHelper.removeItemFromArray(tagGroupList, tagGroupId);
    });
  }

  async getTag(tagId) {
    var tagList = await this.getTagList();

    for (let i = 0; i < tagList.length; i++) {
      let currentTag = tagList[i];
      if (currentTag.id == tagId) {
        return currentTag;
      }
    }

    return null;
  }

  async getBibleBookDbId(bookShortTitle) {
    var bibleBook = await ipcDb.getBibleBook(bookShortTitle);
    
    var bibleBookId = 0;
    if (bibleBook != null) {
      bibleBookId = bibleBook.id;
    }

    return bibleBookId;
  }

  async getBookTagStatistics(book, forceRefresh=false) {
    if (book === undefined) {
      book = app_controller.tab_controller.getTab().getBook();
    }

    var bibleBookId = await this.getBibleBookDbId(book);

    if (!(bibleBookId in this.bookTagStatistics) || forceRefresh) {
      let tagListWithStats = await ipcDb.getAllTags(bibleBookId, false, true);
      let tagStatsDict = {};

      for (let i = 0; i < tagListWithStats.length; i++) {
        let currentTag = tagListWithStats[i];
        tagStatsDict[currentTag.id] = currentTag;
      }

      this.bookTagStatistics[bibleBookId] = tagStatsDict;
    }

    return this.bookTagStatistics[bibleBookId];
  }

  async updateTagCount(tagId, bookList, count=1, increment=true) {
    var firstKey = Object.keys(this.bookTagStatistics)[0];
    if (firstKey === undefined) {
      return;
    }

    var firstBookTagStatistics = this.bookTagStatistics[firstKey];
    var globalAssignmentCount = firstBookTagStatistics[tagId].globalAssignmentCount;
    if (increment) {
      globalAssignmentCount += count;
    } else {
      globalAssignmentCount -= count;
    }

    bookList.forEach(async (book) => {
      var targetBookId = await this.getBibleBookDbId(book);

      for (const [bookId, tagStats] of Object.entries(this.bookTagStatistics)) {
        if (tagId in tagStats) {
          tagStats[tagId].globalAssignmentCount = globalAssignmentCount;

          if (bookId == targetBookId) {
            if (increment) {
              tagStats[tagId].bookAssignmentCount += count;
            } else {
              tagStats[tagId].bookAssignmentCount -= count;
            }
          }
        }
      }
    });
  }

  async updateLatestAndOldestTagData() {
    var all_timestamps = [];
    var tagList = await this.getTagList();

    for (let i = 0; i < tagList.length; i++) {
      let tag = tagList[i];
      let current_timestamp = parseInt(tag.lastUsed);

      if (!all_timestamps.includes(current_timestamp) && !Number.isNaN(current_timestamp)) {
        all_timestamps.push(current_timestamp);
      }
    }

    if (all_timestamps.length > 0) {
      all_timestamps.sort();
      var recent_timestamps_range = 15;
      var last_element_index = all_timestamps.length - 1;
      var oldest_recent_element_index = last_element_index - (recent_timestamps_range - 1);
      if (oldest_recent_element_index < 0) {
        oldest_recent_element_index = 0;
      }

      this.latest_timestamp = all_timestamps[last_element_index];
      this.oldest_recent_timestamp = all_timestamps[oldest_recent_element_index];
    }

    // Update latest tag based on latest timestamp
    var latest_tag_found = false;
    var previousLatestTagId = this.latest_tag_id;

    for (let i = 0; i < tagList.length; i++) {
      let tag = tagList[i];
      let current_timestamp = parseInt(tag.lastUsed);

      if (current_timestamp == this.latest_timestamp) {
        this.latest_tag_id = tag.id;

        if (tag.id != previousLatestTagId) {
          await eventController.publishAsync('on-latest-tag-changed', {
            'tagId': this.latest_tag_id,
            'added': true
          });
        }

        latest_tag_found = true;
        break;
      }
    }

    if (!latest_tag_found) {
      this.latest_tag_id = null;

      if (this.latest_tag_id != previousLatestTagId) {
        await eventController.publishAsync('on-latest-tag-changed', {
          'tagId': this.latest_tag_id,
          'added': true
        });
      }
    }
  }

  filterRecentlyUsedTags(element) {
    var tag_timestamp = parseInt($(element).attr('last-used-timestamp'));

    if (!Number.isNaN(tag_timestamp) &&
        !Number.isNaN(this.latest_timestamp) &&
        !Number.isNaN(this.oldest_recent_timestamp)) {
      
      let timestampInRange = (tag_timestamp >= this.oldest_recent_timestamp &&
                              tag_timestamp <= this.latest_timestamp);

      return !timestampInRange;
    } else {
      return true;
    }
  }
}

module.exports = TagStore;