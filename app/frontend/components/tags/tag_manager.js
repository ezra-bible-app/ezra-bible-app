/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2026 Ezra Bible App Development Team <contact@ezrabibleapp.net>

   Ezra Bible App is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 2 of the License, or
   (at your option) any later version.

   Ezra Bible App is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Bible App. See the file LICENSE.
   If not, see <http://www.gnu.org/licenses/>. */

const ItemListManager = require("./item_list_manager.js");
const eventController = require('../../controllers/event_controller.js');

/**
 * The TagManager is a special ItemListManager for a list of tags.
 * 
 * This class provides functionality to manage, display, and interact with tags in the application.
 * It extends the ItemListManager class and specializes in tag-specific operations such as:
 * - Handling tag selection and deselection
 * - Responding to tag clicks
 * - Filtering tags
 * - Managing the list of selected tags
 * - Updating the UI when tags are renamed or deleted
 * 
 * @class
 * @extends ItemListManager
 */
class TagManager extends ItemListManager {
  /**
   * Creates a new TagManager instance.
   * 
   * @param {Function} onClickHandler - Callback function that is invoked when a tag is clicked.
   *                                    The function receives the click event and selection state as parameters.
   * @param {boolean} selectable - Whether tags in this manager should be selectable. Defaults to false.
   * @param {boolean} editable - Whether tags in this manager should be editable (show edit/delete buttons). Defaults to false.
   * @param {string} cssClass - The CSS class that will be applied to each tag element in the list.
   * @param {Array} virtualItems - An optional array of virtual tag items to include at the beginning of the list.
   *                              Virtual items should have 'id' and 'title' properties. Defaults to empty array.
   */
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

  /**
   * Retrieves all tags from the database via the tag_store.
   * 
   * This method overrides the base getDbItems method from ItemListManager.
   * It fetches the current list of tags from the tag_store and returns them.
   * 
   * @async
   * @returns {Array} An array of tag objects, each containing at least 'id' and 'title' properties.
   * @override
   */
  async getDbItems() {
    let dbItems = await tag_assignment_panel.tag_store.getTagList();
    return dbItems;
  }
}

module.exports = TagManager;