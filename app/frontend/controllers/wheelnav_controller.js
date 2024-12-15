/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2024 Ezra Bible App Development Team <contact@ezrabibleapp.net>

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

const eventController = require('../controllers/event_controller.js');
const verseListController = require('../controllers/verse_list_controller.js');

/**
 * This controller handles the lifecycle of the circular wheel navigation which becomes active in fullscreen mode.
 * @module wheelnavController
 * @category Controller
 */

var currentWheelNavElement = null;
var currentSvgMenu = null;

module.exports.init = function() {
  if (!platformHelper.isMobile()) {
    eventController.subscribe('on-fullscreen-changed', (isFullScreen) => {
      if (isFullScreen) {
        this.bindEvents();
      } else {
        this.unbindAndClose();
      }
    });
  }
};

module.exports.bindEvents = function() {
  var verseReferences = getVerseReferences();

  verseReferences.forEach(verseReference => {
    verseReference.addEventListener('click', handleVerseReferenceClick);
  });
};

module.exports.unbindAndClose = function() {
  var verseReferences = getVerseReferences();

  verseReferences.forEach(verseReference => {
    verseReference.removeEventListener('click', handleVerseReferenceClick);
  });

  this.closeWheelNav();
};

module.exports.closeWheelNav = function() {
  if (currentSvgMenu) {
    currentSvgMenu.close();
  }
};

function getVerseReferences() {
  var verseList = verseListController.getCurrentVerseList();
  var verseReferences = verseList[0].querySelectorAll('.verse-reference-content');
  return verseReferences;
}

function handleVerseReferenceClick(event) {
  clearMenu(event);
  setCurrentWheelNavElement(event);
  highlightCurrentVerseText(event);
  createWheelNavComponent();
}

// eslint-disable-next-line no-unused-vars
function clearMenu(event) {
  if (currentSvgMenu) {
    currentSvgMenu.close();

    var menuHolder = currentWheelNavElement.querySelector('.menuHolder');

    if (menuHolder != null) {
      menuHolder.parentElement.removeChild(menuHolder);
    }
  }
}

function setCurrentWheelNavElement(event) {
  if (!event) {
    return;
  }

  if (currentWheelNavElement) {
    currentWheelNavElement.removeAttribute('id');
  }

  currentWheelNavElement = event.target;
  currentWheelNavElement.setAttribute('id', 'currentWheelNav');
}

function highlightCurrentVerseText(event) {
  if (event.target.parentElement != null &&
      event.target.parentElement.parentElement != null) {

    let verseText = event.target.parentElement.parentElement.querySelector('.verse-text-container');
    app_controller.verse_selection.setVerseAsSelection(verseText);
  }
}

function createWheelNavComponent() {
  var menuItems = getMenuItems();

  // eslint-disable-next-line no-undef
  currentSvgMenu = new RadialMenu({
    parent      : currentWheelNavElement,
    size        : 170,
    closeOnClick: true,
    menuItems   : menuItems,
    onClick: handleMenuClick,
    onClose: function () {
      app_controller.verse_selection.clearVerseSelection();
    }
  });

  currentSvgMenu.open();
}

function getMenuItems() {

  var items = [];

  items.push({
    id: 'assign_last_tag',
    icon: '#tag-icon'
  });

  items.push({
    id: 'edit_note',
    icon: '#note-icon'
  });

  items.push({
    id: 'copy_to_clipboard',
    icon: '#clipboard-icon'
  });

  return items;
}

function handleMenuClick(item) {
  switch (item.id) {
    case 'compare':
      if (app_controller.translationComparison.isButtonEnabled()) {
        app_controller.translationComparison.handleButtonClick();
      }
      break;
    case 'assign_last_tag':
      tags_controller.assignLastTag();
      break;
    case 'copy_to_clipboard':
      app_controller.verse_selection.copySelectedVerseTextToClipboard();
      break;
    case 'edit_note':
      app_controller.notes_controller.editVerseNotesForCurrentlySelectedVerse();
      break;
    default:
      console.log("Unknown item id " + item.id);
      break;
  }
}