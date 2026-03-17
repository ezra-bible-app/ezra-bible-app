/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2026 Ezra Bible App Development Team <contact@ezrabibleapp.net>

   Ezra Bible App is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 2 of the License, or
   (at your option) any later version.

   Ezra Bible App is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Bible App. See the file LICENSE.
   If not, see <http://www.gnu.org/licenses/>. */

const ItemListManager = require("./item_list_manager.js");
const eventController = require('../../controllers/event_controller.js');
const { waitUntilIdle } = require("../../helpers/ezra_helper.js");

/**
 * The TagGroupManager is a special ItemListManager for a list of tag groups.
 * 
 * This class provides functionality to manage, display, and interact with tag groups in the application.
 * It extends the ItemListManager class and specializes in tag group-specific operations such as:
 * - Handling tag group selection and display
 * - Filtering tag groups by Bible book
 * - Responding to tag group changes (rename, delete, member changes)
 * - Managing the list of available tag groups
 * 
 * @class
 * @extends ItemListManager
 */
class TagGroupManager extends ItemListManager {
  /**
   * Creates a new TagGroupManager instance.
   * 
   * @param {Function} onClickHandler - Callback function that is invoked when a tag group is clicked.
   * @param {Function} onEditHandler - Callback function that is invoked when the edit button for a tag group is clicked.
   * @param {Function} onDeleteHandler - Callback function that is invoked when the delete button for a tag group is clicked.
   * @param {boolean} selectable - Whether tag groups in this manager should be selectable. Defaults to false.
   * @param {boolean} editable - Whether tag groups in this manager should be editable (show edit/delete buttons). Defaults to false.
   * @param {string} cssClass - The CSS class that will be applied to each tag group element in the list.
   * @param {Array} virtualItems - An optional array of virtual tag group items to include at the beginning of the list.
   *                              Virtual items should have 'id' and 'title' properties. Defaults to empty array.
   */
  constructor(onClickHandler,
              onEditHandler,
              onDeleteHandler,
              selectable=false,
              editable=false,
              cssClass,
              virtualItems=[]) {

    let renameHintI18n = 'tags.rename-tag-group';
    let deleteHintI18n = 'tags.delete-tag-group';

    super(null,
          onClickHandler,
          onEditHandler,
          onDeleteHandler,
          selectable,
          editable,
          cssClass,
          renameHintI18n,
          deleteHintI18n,
          virtualItems);

    this._bookFilter = null;

    eventController.subscribe('on-tag-group-renamed', async (tagGroupId) => {
      await this.refreshItemList();
      await waitUntilIdle();
      this.highlightItem(tagGroupId);
    });

    eventController.subscribe('on-tag-group-multiple-members-changed', async () => {
      await this.refreshItemList();
    });

    eventController.subscribe('on-tag-group-deleted', async (tagGroupId) => {
      this.removeItems([ tagGroupId ]);
    });
  }

  /**
   * Sets a filter to only show tag groups used in a specific Bible book.
   * 
   * @param {string} bookFilter - The book code (e.g., 'Gen', 'Exod', 'Matt') to filter by.
   *                              When set, only tag groups used in this book will be shown.
   */
  setBookFilter(bookFilter) {
    this._bookFilter = bookFilter;
  }

  /**
   * Retrieves all tag groups from the database, optionally filtered by Bible book.
   * 
   * This method overrides the base getDbItems method from ItemListManager.
   * If a book filter is set, it will only return tag groups used in that book.
   * 
   * @async
   * @returns {Array} An array of tag group objects, each containing 'id', 'title' and potentially 'count' properties.
   * @override
   */
  async getDbItems() {
    var bibleBook = null;
    var bibleBookId = 0;

    if (this._bookFilter != null) {
      bibleBook = await ipcDb.getBibleBook(this._bookFilter);
      bibleBookId = bibleBook.id;
    }

    let dbItems = await ipcDb.getAllTagGroups(bibleBookId);
    return dbItems;
  }
}

module.exports = TagGroupManager;