/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2023 Ezra Bible App Development Team <contact@ezrabibleapp.net>

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

const ItemListManager = require("./item_list_manager.js");
const eventController = require('../../controllers/event_controller.js');
const { waitUntilIdle } = require("../../helpers/ezra_helper.js");

/**
 * The tag group manager is a special ItemListManager for a list of tag groups.
 */
class TagGroupManager extends ItemListManager {
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

    eventController.subscribe('on-tag-group-members-changed', async () => {
      this.refreshItemList();
    });

    eventController.subscribe('on-tag-group-deleted', async (tagGroupId) => {
      this.removeItems([ tagGroupId ]);
    });
  }

  setBookFilter(bookFilter) {
    this._bookFilter = bookFilter;
  }

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