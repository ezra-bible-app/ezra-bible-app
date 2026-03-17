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

const VerseBoxHelper = require('../helpers/verse_box_helper.js');
const VerseBox = require('../ui_models/verse_box.js');
const verseListController = require('../controllers/verse_list_controller.js');

/**
 * This controller handles the lifecycle of the ReferenceVerse box on top of the verse list, used both in case of x-refs as well as tagged verse lists.
 * @module referenceVerseController
 * @category Controller
 */

var verseBoxHelper = new VerseBoxHelper();

module.exports.showReferenceContainer = function() {
  if (app_controller.tab_controller.getTab().hasReferenceVerse()) {
    var currentVerseListFrame = verseListController.getCurrentVerseListFrame();
    var referenceVerseContainer = currentVerseListFrame[0].querySelector('.reference-verse');
    $(referenceVerseContainer).show();
  }
};

module.exports.getCurrentReferenceVerse = function(tabIndex=undefined) {
  var currentVerseListFrame = verseListController.getCurrentVerseListFrame(tabIndex);
  var referenceVerse = currentVerseListFrame.find('.reference-verse');
  return referenceVerse;
};

module.exports.getLocalizedReferenceVerse = async function(tabIndex=undefined) {
  var currentReferenceVerse = this.getCurrentReferenceVerse(tabIndex);
  var currentReferenceVerseBox = currentReferenceVerse[0].querySelector('.verse-box');
  var localizedReferenceVerse = "";

  if (currentReferenceVerseBox != null) {
    localizedReferenceVerse = await verseBoxHelper.getLocalizedVerseReference(currentReferenceVerseBox);
  }

  return localizedReferenceVerse;
};

module.exports.updateReferenceVerseTranslation = async function(oldBibleTranslationId, newBibleTranslationId) {
  var currentVerseListFrame = verseListController.getCurrentVerseListFrame();
  var currentTab = app_controller.tab_controller.getTab();
  var currentBibleTranslationId = currentTab.getBibleTranslationId();
  var referenceVerseContainer = currentVerseListFrame[0].querySelector('.reference-verse');
  var referenceVerseBox = new VerseBox(referenceVerseContainer.querySelector('.verse-box'));
  var bookShortTitle = referenceVerseBox.getBibleBookShortTitle();
  var mappedAbsoluteVerseNumber = await referenceVerseBox.getMappedAbsoluteVerseNumber(oldBibleTranslationId, newBibleTranslationId);

  try {
    var verses = await ipcNsi.getBookText(currentBibleTranslationId, bookShortTitle, mappedAbsoluteVerseNumber, 1);
    var verseText = referenceVerseContainer.querySelector('.verse-text');
    verseText.innerHTML = verses[0].content;
    app_controller.sword_notes.initForContainer(referenceVerseContainer);
    verseListController.bindEventsAfterBibleTextLoaded(undefined, false, $(referenceVerseContainer));
    app_controller.word_study_controller.bindAfterBibleTextLoaded();
  } catch (e) {
    console.warn('Could not update translation for reference verse: ' + e);
  }
};

module.exports.clearReferenceVerse = function(tabIndex=undefined) {
  var currentVerseListFrame = verseListController.getCurrentVerseListFrame(tabIndex);
  var referenceVerseContainer = currentVerseListFrame[0].querySelector('.reference-verse');

  referenceVerseContainer.innerHTML = '';
};

module.exports.renderReferenceVerse = async function(verseBox, tabIndex=undefined) {
  if (verseBox == null || verseBox.length != 1) return;

  var currentVerseListFrame = verseListController.getCurrentVerseListFrame(tabIndex);
  var currentVerseList = verseListController.getCurrentVerseList(tabIndex);
  var referenceVerseContainer = currentVerseListFrame[0].querySelector('.reference-verse');
  var classList = currentVerseList[0].classList;

  for (let i = 0; i < classList.length; i++) {
    let currentClass = classList[i];

    if (currentClass != "verse-list") {
      referenceVerseContainer.classList.add(currentClass);
    }
  }

  var clonedVerseBox = verseBox[0].cloneNode(true);
  var header = await verseBoxHelper.getLocalizedVerseReference(verseBox[0]);
  var referenceVerseHeader = "<div class='reference-header'>" + header + "</div>";
  referenceVerseContainer.innerHTML = referenceVerseHeader;
  referenceVerseContainer.appendChild(clonedVerseBox);
  referenceVerseContainer.innerHTML += "<br/><hr/>";

  var currentTab = app_controller.tab_controller.getTab(tabIndex);
  var textType = currentTab.getTextType();
  var textTypeHeader = "";

  if (textType == 'xrefs') {
    textTypeHeader = `<span i18n="general.module-xrefs">${i18n.t('general.module-xrefs')}</span>`;
  } else if (textType == 'tagged_verses') {
    textTypeHeader = `<span i18n="tags.verses-tagged-with">${i18n.t('tags.verses-tagged-with')}</span> <i>${currentTab.getTagTitleList()}</i>`;
  }

  referenceVerseContainer.innerHTML += "<div class='reference-verse-list-header'><h2>" + textTypeHeader + "</h2></div>";
  verseListController.bindEventsAfterBibleTextLoaded(undefined, false, $(referenceVerseContainer));
  app_controller.word_study_controller.bindAfterBibleTextLoaded(tabIndex);
};
