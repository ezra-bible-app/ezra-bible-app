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

module.exports.bindEventsForVerseList = function(tabIndex=undefined) {
  var verseList = app_controller.getCurrentVerseList(tabIndex);
  var verseReferences = verseList[0].querySelectorAll('.verse-reference-content');

  verseReferences.forEach(verseReference => {
    verseReference.addEventListener('click', handleVerseReferenceClick);
  });
};

function handleVerseReferenceClick(event) {
  clearMenu(event);
  updateId(event);
  createWheelNav();
}

function updateId(event) {
  if (!event) {
    return;
  }

  if (currentWheelNavElement) {
    currentWheelNavElement.removeAttribute('id');
  }

  currentWheelNavElement = event.target;
  currentWheelNavElement.setAttribute('id', 'currentWheelNav');
}

function clearMenu(event) {
  if (currentSvgMenu) {
    currentSvgMenu.close();

    var menuHolder = currentWheelNavElement.querySelector('.menuHolder');
    menuHolder.parentElement.removeChild(menuHolder);
  }
}

function createWheelNav() {
  currentSvgMenu = new RadialMenu({
    parent      : currentWheelNavElement,
    size        : 180,
    closeOnClick: true,
    menuItems   : [
      {
        id: 'compare',
        title: 'Compare'
      },
      {
        id: 'tags',
        title: 'Change tags'
      },
      {
        id: 'assign_last_tag',
        title: 'Assign last tag'
      }
    ],
    onClick: function (item) {
      console.log('You have clicked:', item);
    }
 });

 currentSvgMenu.open();
}