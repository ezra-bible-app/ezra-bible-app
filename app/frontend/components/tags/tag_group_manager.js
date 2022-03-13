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

const ItemListManager = require("./item_list_manager.js");
const eventController = require('../../controllers/event_controller.js');

class TagGroupManager extends ItemListManager {
  constructor(contentDivId,
              onClickHandler,
              onEditHandler,
              onDeleteHandler,
              selectable=false,
              editable=false,
              cssClass,
              virtualItems=[]) {

    let renameHintI18n = 'tags.rename-tag-group';
    let deleteHintI18n = 'tags.delete-tag-group';

    super(contentDivId,
          onClickHandler,
          onEditHandler,
          onDeleteHandler,
          selectable,
          editable,
          cssClass,
          renameHintI18n,
          deleteHintI18n,
          virtualItems);

    eventController.subscribe('on-tag-group-renamed', async () => {
      this.populateItemList(true);
    });
  }

  async getDbItems() {
    let dbItems = await ipcDb.getAllTagGroups();
    return dbItems;
  }
}

module.exports = TagGroupManager;