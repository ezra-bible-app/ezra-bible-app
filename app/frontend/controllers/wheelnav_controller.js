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

var currentWheelNavElement = null;
var currentSvgMenu = null;

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

  app_controller.tag_assignment_menu.closePopup();
  this.closeWheelNav();
};

module.exports.closeWheelNav = function() {
  if (currentSvgMenu) {
    currentSvgMenu.close();
  }
};

function getVerseReferences() {
  var verseList = app_controller.getCurrentVerseList();
  var verseReferences = verseList[0].querySelectorAll('.verse-reference-content');
  return verseReferences;
}

function handleVerseReferenceClick(event) {
  clearMenu(event);
  setCurrentWheelNavElement(event);
  highlightCurrentVerseText(event);
  createWheelNavComponent();
}

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
  var verseText = event.target.parentElement.parentElement.querySelector('.verse-text');
  app_controller.verse_selection.setVerseAsSelection(verseText);
}

function createWheelNavComponent() {
  var menuItems = getMenuItems();

  currentSvgMenu = new RadialMenu({
    parent      : currentWheelNavElement,
    size        : 150,
    closeOnClick: true,
    menuItems   : menuItems,
    onClick: handleMenuClick,
    onClose: function () {
      app_controller.verse_selection.clear_verse_selection();
    }
  });

  currentSvgMenu.open();
}

function getMenuItems() {

  var items = [];

  items.push({
    id: 'compare',
    icon: '#compare'
  });

  if (!app_controller.optionsMenu._tagListOption.isChecked) {
    items.push({
      id: 'tags',
      icon: '#tags'
    });
  }

  items.push({
    id: 'assign_last_tag',
    icon: '#tag'
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
    case 'tags':
      setTimeout(() => {
        app_controller.tag_assignment_menu.showPopup();
        tags_controller.updateTagsViewAfterVerseSelection(false);
      }, 100);
      break;
    case 'assign_last_tag':
      app_controller.assign_last_tag_button.handleClick();
      break;
    default:
      console.log("Unknown item id " + item.id);
      break;
  }
}