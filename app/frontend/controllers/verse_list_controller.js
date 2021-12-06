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

const VerseBox = require('../ui_models/verse_box.js');
const { getPlatform } = require('../helpers/ezra_helper.js');
const wheelnavController = require('../controllers/wheelnav_controller.js');
const eventController = require('../controllers/event_controller.js');

function init() {
  eventController.subscribe('on-bible-text-loaded', (tabIndex) => { bindEventsAfterBibleTextLoaded(tabIndex); });
  eventController.subscribe('on-all-translations-removed', async () => { onAllTranslationsRemoved(); });
}

function getCurrentVerseListFrame(tabIndex=undefined) {
  var currentVerseListTabs = app_controller.getCurrentVerseListTabs(tabIndex);
  var currentVerseListFrame = currentVerseListTabs.find('.verse-list-frame');
  return currentVerseListFrame;
}

function getCurrentVerseList(tabIndex=undefined) {
  var currentVerseListFrame = getCurrentVerseListFrame(tabIndex);
  var verseList = currentVerseListFrame[0].querySelector('.verse-list');
  return $(verseList);
}

function getCurrentVerseListHeader(tabIndex=undefined) {
  var currentVerseListFrame = getCurrentVerseListFrame(tabIndex);
  var verseListHeader = currentVerseListFrame.find('.verse-list-header');
  return verseListHeader;
}

function getCurrentSearchProgressBar(tabIndex=undefined) {
  var currentVerseListFrame = getCurrentVerseListFrame(tabIndex);
  var searchProgressBar = currentVerseListFrame.find('.search-progress-bar');
  return searchProgressBar;
}

function getCurrentSearchCancelButtonContainer(tabIndex=undefined) {
  var currentVerseListFrame = getCurrentVerseListFrame(tabIndex);
  var searchCancelButton = currentVerseListFrame.find('.cancel-module-search-button-container');
  return searchCancelButton;
}

function hideSearchProgressBar(tabIndex=undefined) {
  var searchProgressBar = getCurrentSearchProgressBar(tabIndex);
  searchProgressBar.hide();

  var cancelSearchButtonContainer = getCurrentSearchCancelButtonContainer(tabIndex);
  cancelSearchButtonContainer.hide();
}

function getCurrentVerseListLoadingIndicator(tabIndex=undefined) {
  var currentVerseListFrame = getCurrentVerseListFrame(tabIndex);
  var loadingIndicator = currentVerseListFrame.find('.verse-list-loading-indicator');
  return loadingIndicator;
}

function showVerseListLoadingIndicator(tabIndex=undefined, message=undefined, withLoader=true) {
  var loadingIndicator = getCurrentVerseListLoadingIndicator(tabIndex);
  var loadingText = loadingIndicator.find('.verse-list-loading-indicator-text');
  if (message === undefined) {
    message = i18n.t("bible-browser.loading-bible-text");
  }

  loadingText.html(message);

  if (withLoader) {
    loadingIndicator.find('.loader').show();
  } else {
    loadingIndicator.find('.loader').hide();
  }

  loadingIndicator.show();
}

function hideVerseListLoadingIndicator(tabIndex=undefined) {
  var loadingIndicator = getCurrentVerseListLoadingIndicator(tabIndex);
  loadingIndicator.hide();
}

function getBibleBookStatsFromVerseList(tabIndex) {
  var bibleBookStats = {};    
  var currentVerseList = getCurrentVerseList(tabIndex)[0];
  var verseBoxList = currentVerseList.querySelectorAll('.verse-box');

  for (var i = 0; i < verseBoxList.length; i++) {
    var currentVerseBox = verseBoxList[i];
    var bibleBookShortTitle = new VerseBox(currentVerseBox).getBibleBookShortTitle();

    if (bibleBookStats[bibleBookShortTitle] === undefined) {
      bibleBookStats[bibleBookShortTitle] = 1;
    } else {
      bibleBookStats[bibleBookShortTitle] += 1;
    }
  }

  return bibleBookStats;
}

function resetVerseListView() {
  var textType = app_controller.tab_controller.getTab().getTextType();
  if (textType != 'xrefs' && textType != 'tagged_verses') {
    var currentReferenceVerse = getCurrentVerseListFrame().find('.reference-verse');
    currentReferenceVerse[0].innerHTML = "";
  }

  var currentVerseList = getCurrentVerseList()[0];
  if (currentVerseList != undefined) {
    currentVerseList.innerHTML = "";
  }

  app_controller.docxExport.disableExportButton();
}

function getVerseListBookNumber(bibleBookLongTitle, bookHeaders=undefined) {
  var bibleBookNumber = -1;

  if (bookHeaders === undefined) {
    var currentVerseListFrame = getCurrentVerseListFrame();
    bookHeaders = currentVerseListFrame.find('.tag-browser-verselist-book-header');
  }

  for (let i = 0; i < bookHeaders.length; i++) {
    var currentBookHeader = $(bookHeaders[i]);
    var currentBookHeaderText = currentBookHeader.text();

    if (currentBookHeaderText.includes(bibleBookLongTitle)) {
      bibleBookNumber = i + 1;
      break;
    }
  }

  return bibleBookNumber;
}

function bindEventsAfterBibleTextLoaded(tabIndex=undefined, preventDoubleBinding=false, verseList=undefined) {
  if (verseList == undefined) {
    verseList = getCurrentVerseList(tabIndex);
  }

  var tagBoxes = verseList.find('.tag-box');
  var tags = verseList.find('.tag');
  var xref_markers = verseList.find('.sword-xref-marker');

  if (preventDoubleBinding) {
    tagBoxes = tagBoxes.filter(":not('.tag-events-configured')");
    tags = tags.filter(":not('.tag-events-configured')");
    xref_markers = xref_markers.filter(":not('.events-configured')");
  }

  tagBoxes.bind('mousedown', tags_controller.clear_verse_selection).addClass('tag-events-configured');

  tags.bind('mousedown', async (event) => {
    event.stopPropagation();
    await handleReferenceClick(event);
  }).addClass('tag-events-configured');

  xref_markers.bind('mousedown', async (event) => {
    event.stopPropagation();
    await handleReferenceClick(event);
  }).addClass('events-configured');

  verseList.find('.verse-box').bind('mouseover', (e) => { onVerseBoxMouseOver(e); });

  if (platformHelper.isElectron()) {
    app_controller.verse_context_controller.init_verse_expand_box(tabIndex);
  }

  if (getPlatform().isFullScreen()) {
    wheelnavController.bindEvents();
  }
}
  
function bindXrefEvents(tabIndex=undefined) {
  var verseList = getCurrentVerseList(tabIndex);
  var xref_markers = verseList.find('.sword-xref-marker');

  xref_markers.unbind();
  
  xref_markers.bind('mousedown', async (event) => {
    await handleReferenceClick(event);
  }).addClass('events-configured');
}

function onVerseBoxMouseOver(event) {
  var focussedElement = event.target;
  app_controller.navigation_pane.updateNavigationFromVerseBox(focussedElement);
}

async function handleReferenceClick(event) {
  var currentTab = app_controller.tab_controller.getTab();
  var currentTextType = currentTab.getTextType();
  var verseBox = $(event.target).closest('.verse-box');
  var isReferenceVerse = verseBox.parent().hasClass('reference-verse');
  var isXrefMarker = event.target.classList.contains('sword-xref-marker');
  var isTag = event.target.classList.contains('tag');

  if (isReferenceVerse &&
    ((currentTextType == 'xrefs') || (currentTextType == 'tagged_verses'))
  ) {
    if (isXrefMarker) {
      await app_controller.verse_list_popup.initCurrentXrefs(event.target);

      app_controller.openXrefVerses(this.verse_list_popup.currentReferenceVerseBox,
                                    this.verse_list_popup.currentPopupTitle,
                                    this.verse_list_popup.currentXrefs);

    } else if (isTag) {

      app_controller.verse_list_popup.initCurrentTag(event.target);

      app_controller.openTaggedVerses(this.verse_list_popup.currentTagId,
                                      this.verse_list_popup.currentTagTitle,
                                      this.verse_list_popup.currentReferenceVerseBox);

    }
  } else {
    if (isXrefMarker) {
      let referenceType = "XREFS";

      if (app_controller.optionsMenu._verseListNewTabOption.isChecked &&
          !getPlatform().isFullScreen()) { // No tabs available in fullscreen!
        
        app_controller.verse_list_popup.currentReferenceType = referenceType;
        await app_controller.verse_list_popup.initCurrentXrefs(event.target);
        app_controller.verse_list_popup.openVerseListInNewTab();
      } else {
        await app_controller.verse_list_popup.openVerseListPopup(event, referenceType);
      }
    } else if (isTag) {
      let referenceType = "TAGGED_VERSES";

      if (app_controller.optionsMenu._verseListNewTabOption.isChecked &&
          !getPlatform().isFullScreen()) { // No tabs available in fullscreen!
        
        app_controller.verse_list_popup.currentReferenceType = referenceType;
        app_controller.verse_list_popup.initCurrentTag(event.target);
        app_controller.verse_list_popup.openVerseListInNewTab();
      } else {
        await app_controller.verse_list_popup.openVerseListPopup(event, referenceType);
      }
    }
  }
}

// Re-init application to state without Bible translations
function onAllTranslationsRemoved() {
  resetVerseListView();
  hideVerseListLoadingIndicator();
  getCurrentVerseList().append("<div class='help-text'>" + i18n.t("help.help-text-no-translations") + "</div>");
  $('.book-select-value').text(i18n.t("menu.book"));
}

module.exports = {
  init,
  getCurrentVerseListHeader,
  getCurrentVerseListFrame,
  getCurrentVerseList,
  getCurrentSearchProgressBar,
  getCurrentSearchCancelButtonContainer,
  hideSearchProgressBar,
  getCurrentVerseListLoadingIndicator,
  showVerseListLoadingIndicator,
  hideVerseListLoadingIndicator,
  getBibleBookStatsFromVerseList,
  resetVerseListView,
  getVerseListBookNumber,
  bindEventsAfterBibleTextLoaded,
  bindXrefEvents,
  handleReferenceClick
};