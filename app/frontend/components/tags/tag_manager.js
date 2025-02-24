/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2025 Ezra Bible App Development Team <contact@ezrabibleapp.net>

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

/**
 * The TagManager is a special ItemListManager for a list of tags.
 */
class TagManager extends ItemListManager {
  constructor(onClickHandler,
              selectable=false,
              editable=false,
              cssClass,
              virtualItems=[]) {

    super(null,
          onClickHandler,
          null, // onEditHandler
          null, // onDeleteHandler
          selectable,
          editable,
          cssClass,
          null, // editHint
          null, // deleteHint
          virtualItems);

    eventController.subscribe('on-tag-renamed', async () => {
      this.refreshItemList();
    });

    eventController.subscribe('on-tag-deleted', async (tagId) => {
      this.removeItems([ tagId ]);
    });
  }

  async getDbItems() {
    let dbItems = await tags_controller.tag_store.getTagList();
    return dbItems;
  }
}

module.exports = TagManager;