/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2026 Ezra Bible App Development Team <contact@ezrabibleapp.net>

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

module.exports.init = function() {
  // This feature only works on desktop
  if (platformHelper.isElectron()) {
    eventController.subscribe('on-bible-text-loaded', (tabIndex) => {
      initTransChangeTitlesForTab(tabIndex);
    });

    eventController.subscribe('on-locale-changed', () => {
      const tabCount = app_controller.tab_controller.getTabCount();

      for (let i = 0; i < tabCount; i++) {
        initTransChangeTitlesForTab(i);
      }
    });
  }
};

function initTransChangeTitlesForTab(tabIndex=undefined) {
  let transChangeElements = getCurrentTabTransChangeElements(tabIndex);
  initTransChangeElements(transChangeElements);
}

module.exports.initTransChangeTitlesForContainer = function(container) {
  let transChangeElements = container.querySelectorAll('transChange');
  initTransChangeElements(transChangeElements);
};

function initTransChangeElements(transChangeElements) {
  for (let i = 0; i < transChangeElements.length; i++) {
    let transChange = transChangeElements[i];
    let type = transChange.getAttribute('type');
    let i18nText = getI18nForType(type);

    if (i18nText !== undefined) {
      let localizedText = i18n.t(i18nText);
      transChange.setAttribute('title', localizedText);
    }
  }
}

function getCurrentTabTransChangeElements(tabIndex) {
  const verseList = verseListController.getCurrentVerseList(tabIndex);
  let transChangeElements = verseList[0].querySelectorAll('transChange');
  return transChangeElements;
}

function getI18nForType(type) {
  const mapping = {
    'added' : 'bible-browser.transchange.added',
    'amplified' : 'bible-browser.transchange.amplified',
    'changed' : 'bible-browser.transchange.changed',
    'deleted' : 'bible-browser.transchange.deleted',
    'implied' : 'bible-browser.transchange.implied',
    'moved' : 'bible-browser.transchange.moved',
    'tenseChange' : 'bible-browser.transchange.tense-change'
  };

  let i18nText = mapping[type];
  return i18nText;
}
