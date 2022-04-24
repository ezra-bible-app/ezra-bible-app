/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2022 Ezra Bible App Development Team <contact@ezrabibleapp.net>

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

/**
 * This controller provides an API for the verse list as well as event handlers for clicks within the verse list.
 * @module verseListController
 * @category Controller
 */

module.exports.init = function init() {
  eventController.subscribe('on-all-translations-removed', async () => { this.onAllTranslationsRemoved(); });

  eventController.subscribe('on-bible-text-loaded', (tabIndex) => { 
    this.applyTagGroupFilter(tags_controller.currentTagGroupId, tabIndex);
    this.bindEventsAfterBibleTextLoaded(tabIndex);
  });

  eventController.subscribe('on-tag-group-filter-enabled', async () => {
    this.applyTagGroupFilter(tags_controller.currentTagGroupId);
  });

  eventController.subscribe('on-tag-group-filter-disabled', async () => {
    this.applyTagGroupFilter(null);
  });

  eventController.subscribe('on-tag-group-selected', async(tagGroup) => {
    this.applyTagGroupFilter(tagGroup.id);
  });

  eventController.subscribe('on-tag-group-members-changed', async() => {
    this.applyTagGroupFilter(tags_controller.currentTagGroupId);
  });
};

module.exports.getCurrentVerseListFrame = function(tabIndex=undefined) {
  var currentVerseListTabs = app_controller.getCurrentVerseListTabs(tabIndex);
  var currentVerseListFrame = currentVerseListTabs.find('.verse-list-frame');
  return currentVerseListFrame;
};

module.exports.getCurrentVerseList = function(tabIndex=undefined) {
  var currentVerseListFrame = this.getCurrentVerseListFrame(tabIndex);
  var verseList = currentVerseListFrame[0].querySelector('.verse-list');
  return $(verseList);
};

module.exports.getCurrentVerseListHeader = function(tabIndex=undefined) {
  var currentVerseListFrame = this.getCurrentVerseListFrame(tabIndex);
  var verseListHeader = currentVerseListFrame.find('.verse-list-header');
  return verseListHeader;
};

module.exports.getCurrentSearchProgressBar = function(tabIndex=undefined) {
  var currentVerseListFrame = this.getCurrentVerseListFrame(tabIndex);
  var searchProgressBar = currentVerseListFrame.find('.search-progress-bar');
  return searchProgressBar;
};

module.exports.getCurrentSearchCancelButtonContainer = function(tabIndex=undefined) {
  var currentVerseListFrame = this.getCurrentVerseListFrame(tabIndex);
  var searchCancelButton = currentVerseListFrame.find('.cancel-module-search-button-container');
  return searchCancelButton;
};

module.exports.hideSearchProgressBar = function(tabIndex=undefined) {
  var searchProgressBar = this.getCurrentSearchProgressBar(tabIndex);
  searchProgressBar.hide();

  var cancelSearchButtonContainer = this.getCurrentSearchCancelButtonContainer(tabIndex);
  cancelSearchButtonContainer.hide();
};

module.exports.getCurrentVerseListLoadingIndicator = function(tabIndex=undefined) {
  var currentVerseListFrame = this.getCurrentVerseListFrame(tabIndex);
  var loadingIndicator = currentVerseListFrame.find('.verse-list-loading-indicator');
  return loadingIndicator;
};

module.exports.showVerseListLoadingIndicator = function(tabIndex=undefined, message=undefined, withLoader=true) {
  var loadingIndicator = this.getCurrentVerseListLoadingIndicator(tabIndex);
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
};

module.exports.hideVerseListLoadingIndicator = function(tabIndex=undefined) {
  var loadingIndicator = this.getCurrentVerseListLoadingIndicator(tabIndex);
  loadingIndicator.hide();
};

module.exports.getBibleBookStatsFromVerseList = function(tabIndex) {
  var bibleBookStats = {};    
  var currentVerseList = this.getCurrentVerseList(tabIndex)[0];
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
};

module.exports.getFirstVisibleVerseAnchor = function() {
  let verseListFrame = this.getCurrentVerseListFrame();
  let firstVisibleVerseAnchor = null;

  if (verseListFrame != null && verseListFrame.length > 0) {
    let verseListFrameRect = verseListFrame[0].getBoundingClientRect();

    let currentNavigationPane = app_controller.navigation_pane.getCurrentNavigationPane()[0];
    let currentNavigationPaneWidth = currentNavigationPane.offsetWidth;

    // We need to a add a few pixels to the coordinates of the verseListFrame so that we actually hit an element within the verseListFrame
    const VERSE_LIST_CHILD_ELEMENT_OFFSET = 15;
    let firstElementOffsetX = verseListFrameRect.x + currentNavigationPaneWidth + VERSE_LIST_CHILD_ELEMENT_OFFSET;
    let firstElementOffsetY = verseListFrameRect.y + VERSE_LIST_CHILD_ELEMENT_OFFSET;
    
    let currentElement = document.elementFromPoint(firstElementOffsetX, firstElementOffsetY);

    if (currentElement != null && currentElement.classList != null && currentElement.classList.contains('verse-list')) {
      // If the current element is the verse-list then we try once more 10 pixels lower.
      currentElement = document.elementFromPoint(firstElementOffsetX, firstElementOffsetY + 10);
    }

    if (currentElement == null) {
      return null;
    }

    if (currentElement.classList != null && 
        (currentElement.classList.contains('sword-section-title') ||
          currentElement.classList.contains('tag-browser-verselist-book-header'))) {
      // We are dealing with a section header element (either sword-section-title or tag-browser-verselist-book-header)

      if (currentElement.previousElementSibling != null &&
          currentElement.previousElementSibling.nodeName == 'A') {

        currentElement = currentElement.previousElementSibling;
      }
    } else {
      // We are dealing with an element inside a verse-box
      const MAX_ELEMENT_NESTING = 7;

      // Traverse up the DOM to find the verse-box
      for (let i = 0; i < MAX_ELEMENT_NESTING; i++) {
        if (currentElement == null) {
          break;
        }

        if (currentElement.classList != null && currentElement.classList.contains('verse-box')) {

          // We have gotten a verse-box ... now get the a.nav element inside it!
          currentElement = currentElement.querySelector('a.nav');

          // Leave the loop since we found the anchor!
          break;

        } else {
          // Proceed with the next parentNode
          currentElement = currentElement.parentNode;
        }
      }
    }

    if (currentElement != null && currentElement.nodeName == 'A') {
      firstVisibleVerseAnchor = currentElement.name;
    }
  }

  return firstVisibleVerseAnchor;
};

module.exports.resetVerseListView = function() {
  var textType = app_controller.tab_controller.getTab().getTextType();
  if (textType != 'xrefs' && textType != 'tagged_verses') {
    var currentReferenceVerse = this.getCurrentVerseListFrame().find('.reference-verse');
    currentReferenceVerse[0].innerHTML = "";
  }

  var currentVerseList = this.getCurrentVerseList()[0];
  if (currentVerseList != undefined) {
    currentVerseList.innerHTML = "";
  }

  app_controller.docxExport.disableExportButton();
};

module.exports.getVerseListBookNumber = function(bibleBookLongTitle, bookHeaders=undefined) {
  var bibleBookNumber = -1;

  if (bookHeaders === undefined) {
    var currentVerseListFrame = this.getCurrentVerseListFrame();
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
};

module.exports.bindEventsAfterBibleTextLoaded = function(tabIndex=undefined, preventDoubleBinding=false, verseList=undefined) {
  if (verseList == undefined) {
    verseList = this.getCurrentVerseList(tabIndex);
  }

  var tagBoxes = verseList.find('.tag-box');
  var tags = verseList.find('.tag');
  var xref_markers = verseList.find('.sword-xref-marker');

  if (preventDoubleBinding) {
    tagBoxes = tagBoxes.filter(":not('.tag-events-configured')");
    tags = tags.filter(":not('.tag-events-configured')");
    xref_markers = xref_markers.filter(":not('.events-configured')");
  }

  tagBoxes.bind('mousedown', () => { app_controller.verse_selection.clearVerseSelection(); }).addClass('tag-events-configured');

  tags.bind('mousedown', async (event) => {
    event.stopPropagation();
    await this.handleReferenceClick(event);
  }).addClass('tag-events-configured');

  xref_markers.bind('mousedown', async (event) => {
    event.stopPropagation();
    await this.handleReferenceClick(event);
  }).addClass('events-configured');

  verseList.find('.verse-box').bind('mouseover', (e) => { onVerseBoxMouseOver(e); });

  verseList.find('a.chapter-nav').bind('mousedown', async (event) => {
    event.preventDefault();
    event.stopPropagation();

    const chapter = parseInt(event.target.getAttribute('chapter'));
    await app_controller.navigation_pane.goToChapter(chapter);
  });

  if (getPlatform().isFullScreen()) {
    wheelnavController.bindEvents();
  }
};
  
module.exports.bindXrefEvents = function(tabIndex=undefined) {
  var verseList = this.getCurrentVerseList(tabIndex);
  var xref_markers = verseList.find('.sword-xref-marker');

  xref_markers.unbind();
  
  xref_markers.bind('mousedown', async (event) => {
    await this.handleReferenceClick(event);
  }).addClass('events-configured');
};

function onVerseBoxMouseOver(event) {
  var focussedElement = event.target;
  app_controller.navigation_pane.updateNavigationFromVerseBox(focussedElement);
}

module.exports.handleReferenceClick = async function(event) {
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

      app_controller.openXrefVerses(app_controller.verse_list_popup.currentReferenceVerseBox,
                                    app_controller.verse_list_popup.currentPopupTitle,
                                    app_controller.verse_list_popup.currentXrefs);

    } else if (isTag) {

      app_controller.verse_list_popup.initCurrentTag(event.target);

      app_controller.openTaggedVerses(app_controller.verse_list_popup.currentTagId,
                                      app_controller.verse_list_popup.currentTagTitle,
                                      app_controller.verse_list_popup.currentReferenceVerseBox);

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
};

// Re-init application to state without Bible translations
module.exports.onAllTranslationsRemoved = function() {
  this.resetVerseListView();
  this.hideVerseListLoadingIndicator();
  this.getCurrentVerseList().append("<div class='help-text'>" + i18n.t("help.help-text-no-translations") + "</div>");
  $('.book-select-value').text(i18n.t("menu.book"));
};

module.exports.applyTagGroupFilter = async function(tagGroupId, tabIndex=undefined, rootElement=undefined) {
  let tagGroupFilterOption = app_controller.optionsMenu._tagGroupFilterOption;
  let verseList = this.getCurrentVerseList(tabIndex)[0];

  if (rootElement === undefined) {
    rootElement = verseList;
  }

  let allTagElements = rootElement.querySelectorAll('.tag');

  if (tagGroupId == null || tagGroupId < 0 || !tagGroupFilterOption.isChecked) {
    // Show all tags
    allTagElements.forEach((tagElement) => {
      tagElement.classList.remove('hidden');
    });

  } else {
    // Show tags filtered by current tag group
    let tagGroupMemberIds = await tags_controller.getTagGroupMemberIds(tagGroupId);

    allTagElements.forEach((tagElement) => {
      let currentTagId = parseInt(tagElement.getAttribute('tag-id'));

      if (tagGroupMemberIds.includes(currentTagId)) {
        tagElement.classList.remove('hidden');
      } else {
        tagElement.classList.add('hidden');
      }
    });
  }

  let verseBoxes = verseList.querySelectorAll('.verse-box');

  // Update visibility of verse tag indicators
  verseBoxes.forEach((verseBox) => {
    let visibleTagCount = verseBox.querySelectorAll('.tag:not(.hidden)').length;

    let tagIndicator = verseBox.querySelector('.tag-info');
    if (visibleTagCount > 0) {
      tagIndicator.classList.add('visible');
    } else {
      tagIndicator.classList.remove('visible');
    }
  });
};