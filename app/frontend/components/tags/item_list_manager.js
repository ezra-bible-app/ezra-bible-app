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

class ItemListManager {
  constructor(contentDivId, onClickHandler, selectable=false, editable=false, cssClass, virtualItems=[]) {
    this._items = null;
    this._contentDivId = contentDivId;
    this._onClickHandler = onClickHandler;
    this._selectable = selectable;
    this._editable = editable;
    this._cssClass = cssClass;
    this._virtualItems = virtualItems;

    this._renameHintI18n = 'tags.rename-tag-group';
    this._deleteHintI18n = 'tags.delete-tag-group';

    this._renameHint = i18n.t(this._renameHintI18n);
    this._deleteHint = i18n.t(this._deleteHintI18n);
  }

  async getItems() {
    if (this._items == null) {
      let dbTagGroups = await ipcDb.getAllTagGroups();
      this._items = this._virtualItems;
      this._items = this._items.concat(dbTagGroups);
    }

    return this._items;
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

  async populateItemList() {
    if (this.populated) {
      return;
    }

    const items = await this.getItems();

    items.forEach((item) => {
      this.addItemElement(item);
    });

    this.populated = true;
  }

  async addItem(item) {
    this._items.push(item);
    this.addItemElement(item);
  }

  addItemElement(item) {
    if (this._contentDiv == null) {
      this._contentDiv = this.getContentDiv();
    }

    let itemElement = document.createElement('div');
    itemElement.setAttribute('class', this._cssClass);

    let itemIcon = null;
    let editButton = null;
    let deleteButton = null;

    if (this._selectable) {
      itemIcon = document.createElement('i');
      itemIcon.setAttribute('class', 'fas fa-tag tag-button button-small');
      itemIcon.addEventListener('click', (event) => {
        this._onClickHandler(event);
        this.toggleSelection(event);
      });
    }

    if (this._editable) {
      editButton = document.createElement('i');
      editButton.setAttribute('class', 'fas fa-pen edit-icon edit-button button-small');
      editButton.setAttribute('i18n', '[title]' + this._renameHintI18n);
      editButton.setAttribute('title', this._renameHint);

      deleteButton = document.createElement('i');
      deleteButton.setAttribute('class', 'fas fa-trash-alt delete-icon delete-button button-small');
      deleteButton.setAttribute('i18n', '[title]' + this._deleteHintI18n);
      deleteButton.setAttribute('title', this._deleteHint);
    }

    let itemLink = document.createElement('a');
    itemLink.setAttribute('href', '');
    itemLink.setAttribute('item-id', item.id);
    itemLink.innerText = item.title;
    itemLink.addEventListener('click', (event) => {
      event.preventDefault();

      this._onClickHandler(event);

      if (this._selectable) {
        this.toggleSelection(event);
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

    this._contentDiv.appendChild(itemElement);
  }

  toggleSelection(event) {
    let element = event.target.closest('.' + this._cssClass);
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

  getContentDiv() {
    return document.getElementById(this._contentDivId);
  }

  getAllItemElements() {
    return this._contentDiv.querySelectorAll('.' + this._cssClass);
  }
}

module.exports = ItemListManager;