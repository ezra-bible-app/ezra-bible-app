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

const ezraHelper = require('../../helpers/ezra_helper.js');

class ItemListManager {
  constructor(contentDiv,
              onClickHandler,
              onEditHandler,
              onDeleteHandler,
              selectable=false,
              editable=false,
              cssClass,
              renameHintI18n=null,
              deleteHintI18n=null,
              virtualItems=[]) {

    this._items = null;
    this._contentDiv = contentDiv;
    this._onClickHandler = onClickHandler;
    this._onEditHandler = onEditHandler;
    this._onDeleteHandler = onDeleteHandler;
    this._selectable = selectable;
    this._editable = editable;
    this._cssClass = cssClass;
    this._virtualItems = virtualItems;

    this._renameHintI18n = renameHintI18n;
    this._deleteHintI18n = deleteHintI18n;

    this._renameHint = i18n.t(this._renameHintI18n);
    this._deleteHint = i18n.t(this._deleteHintI18n);

    this._addList = [];
    this._removeList = [];
  }

  setContentDiv(contentDiv) {
    this._contentDiv = contentDiv;
  }

  async getItems(force=false) {
    if (this._items == null || force) {
      let dbItems = await this.getDbItems();
      this._items = this._virtualItems;
      this._items = this._items.concat(dbItems);
    }

    return this._items;
  }

  async getDbItems() {
    let dbItems = [];
    return dbItems;
  }

  async getDbItemIndex(itemId) {
    let dbItems = await this.getDbItems();

    for (let i = 0; i < dbItems.length; i++) {
      let currentItem = dbItems[i];

      if (currentItem.id == itemId) {
        return i;
      }
    }

    return -1;
  }

  async getItemById(itemId) {
    const items = await this.getItems();

    for (let i = 0; i < items.length; i++) {
      let item = items[i];
      if (item.id == itemId) {
        return item;
      }
    }
  }

  async refreshItemList() {
    await this.populateItemList(true);
  }

  async populateItemList(force=false) {
    if (this.populated && !force) {
      return;
    }

    if (force) {
      this.getContentDiv().innerHTML = "";
    }

    const items = await this.getItems(force);

    items.forEach((item) => {
      this.addItemElement(item);
    });

    this.populated = true;
  }

  async addItem(item) {
    if (this._items == null) {
      await this.getItems();
    }

    let dbItemIndex = await this.getDbItemIndex(item.id);
    let insertIndex = dbItemIndex + this._virtualItems.length;
    this._items.splice(insertIndex, 0, item);
    this.addItemElement(item, insertIndex);
  }

  getItemIdFromClickEvent(event) {
    let element = event.target.closest('.' + this._cssClass);
    let link = element.querySelector('a');
    let itemId = link.getAttribute('item-id');
    return parseInt(itemId);
  }

  addItemElement(item, index=null) {
    let itemElement = document.createElement('div');
    itemElement.setAttribute('class', this._cssClass);

    let itemIcon = null;
    let editButton = null;
    let deleteButton = null;

    if (this._selectable) {
      itemIcon = document.createElement('i');
      itemIcon.setAttribute('class', 'fas fa-tag tag-button button-small');
      itemIcon.addEventListener('click', (event) => {
        if (this._selectable) {
          this.toggleSelection(event);
        }

        if (this._onClickHandler != null) {
          this._onClickHandler(event);
        }
      });
    }

    if (this._editable) {
      editButton = document.createElement('i');
      editButton.setAttribute('class', 'fas fa-pen edit-icon edit-button button-small');
      editButton.setAttribute('i18n', '[title]' + this._renameHintI18n);
      editButton.setAttribute('title', this._renameHint);
      editButton.addEventListener('click', async (event) => {
        if (this._onEditHandler != null) {
          let itemId = this.getItemIdFromClickEvent(event);
          await this._onEditHandler(itemId);
        }
      });

      deleteButton = document.createElement('i');
      deleteButton.setAttribute('class', 'fas fa-trash-alt delete-icon delete-button button-small');
      deleteButton.setAttribute('i18n', '[title]' + this._deleteHintI18n);
      deleteButton.setAttribute('title', this._deleteHint);
      deleteButton.addEventListener('click', async (event) => {
        if (this._onDeleteHandler != null) {
          let itemId = this.getItemIdFromClickEvent(event);
          await this._onDeleteHandler(itemId);
        }
      });
    }

    let itemLink = document.createElement('a');
    itemLink.setAttribute('href', '');
    itemLink.setAttribute('item-id', item.id);
    itemLink.innerText = item.title;
    itemLink.addEventListener('click', (event) => {
      event.preventDefault();

      if (this._selectable) {
        this.toggleSelection(event);
      }

      if (this._onClickHandler != null) {
        this._onClickHandler(event);
      }
    });

    if (this._selectable) {
      itemElement.appendChild(itemIcon);
    }

    itemElement.appendChild(itemLink);

    if (item.id > 0 && this._editable) {
      itemElement.appendChild(editButton);
      itemElement.appendChild(deleteButton);
    }

    if (index == null) {
      this.getContentDiv().appendChild(itemElement);
    } else {
      let contentDiv = this.getContentDiv();
      contentDiv.insertBefore(itemElement, contentDiv.children[index]);
    }
  }

  toggleSelection(event) {
    let element = event.target.closest('.' + this._cssClass);
    let link = element.querySelector('a');
    let isActive = link.classList.contains('active');
    let itemId = link.getAttribute('item-id');

    if (isActive) {
      if (this._addList.includes(itemId)) {
        this._addList = ezraHelper.removeItemFromArray(this._addList, itemId);
      } else {
        this._removeList.push(itemId);
      }
    } else {
      if (this._removeList.includes(itemId)) {
        this._removeList = ezraHelper.removeItemFromArray(this._removeList, itemId);
      } else {
        this._addList.push(itemId);
      }
    }

    this.toggleElement(element);
  }

  toggleElement(element) {
    let link = element.querySelector('a');
    
    if (link.classList.contains('active')) {
      this.disableItemElement(element);
    } else {
      this.enableItemElement(element);
    }
  }

  enableElementById(element, id) {
    let link = element.querySelector('a');

    if (link.getAttribute('item-id') == id) {
      this.enableItemElement(element);
    }
  }

  enableItemElement(element) {
    let itemButton = element.querySelector('.tag-button');
    let link = element.querySelector('a');

    if (itemButton != null) {
      itemButton.classList.add('active');
    }

    link.classList.add('active');
  }

  disableItemElement(element) {
    let itemButton = element.querySelector('.tag-button');
    let link = element.querySelector('a');

    if (itemButton != null) {
      itemButton.classList.remove('active');
    }

    link.classList.remove('active');
  }

  getItemElementId(element) {
    let link = element.querySelector('a');
    return parseInt(link.getAttribute('item-id'));
  }

  getContentDiv() {
    return this._contentDiv;
  }

  getAllItemElements() {
    return this.getContentDiv().querySelectorAll('.' + this._cssClass);
  }

  removeItems(existingItemIds) {
    let allItems = this.getAllItemElements();

    allItems.forEach((item) => {
      let itemId = this.getItemElementId(item);

      if (existingItemIds.includes(itemId)) {
        item.remove();
      }
    });
  }
}

module.exports = ItemListManager;