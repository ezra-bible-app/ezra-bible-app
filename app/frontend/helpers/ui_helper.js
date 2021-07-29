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

const i18nController = require('../controllers/i18n_controller.js');

class UiHelper {
  constructor() {
    this.app_container_height = null;
  }

  configureButtonStyles(context=null) {
    if (context == null) {
      context = document;
    } else if (typeof context === 'string') {
      context = document.querySelector(context);
    } else if (!(context instanceof HTMLElement)) {
      throw new Error('context should be HTMLElement, css selector string or null for the document context');
    }
  
    var buttons = context.querySelectorAll('.fg-button');
  
    for (let i = 0; i < buttons.length; i++) {
      const currentButton = buttons[i];
      const currentButtonClasses = currentButton.classList;
  
      if (!currentButtonClasses.contains("ui-state-disabled") && !currentButtonClasses.contains("events-configured")) {
        currentButton.addEventListener('mouseover', function(e) {
          $(e.target).closest('.fg-button').addClass('ui-state-hover');
        });
  
        currentButton.addEventListener('mouseout', function(e) {
          $(e.target).closest('.fg-button').removeClass('ui-state-hover');
        });
  
        currentButton.addEventListener('mousedown', function(e) {
          uiHelper.handleButtonMousedown($(e.target).closest('.fg-button'), e.target.nodeName != 'INPUT');
        });
  
        currentButton.addEventListener('mouseup', function(e) {
          if(!$(e.target).closest('.fg-button').is('.fg-button-toggleable, .fg-buttonset-single .fg-button,  .fg-buttonset-multi .fg-button') ){
            $(e.target).closest('.fg-button').removeClass("ui-state-active");
          }
        });
  
        currentButton.classList.add('events-configured');
      }
    }
  }
  
  handleButtonMousedown(element, click_checkbox) {
    $(element).parents('.fg-buttonset-single:first').find(".fg-button.ui-state-active").removeClass("ui-state-active");
    if ($(element).is('.ui-state-active.fg-button-toggleable, .fg-buttonset-multi .ui-state-active')) {
      $(element).removeClass("ui-state-active");
    } else { 
      $(element).addClass("ui-state-active");
    }
  
    if (click_checkbox) {
      var embedded_input = $(element).find('input:first');
  
      if (embedded_input.attr('type') == 'checkbox') {
        embedded_input[0].click();
      }
    }
  }
  
  initProgressBar(progressBar) {
    var progressLabel = progressBar.find(".progress-label");
  
    progressBar.progressbar({
      value: false,
      change: function() {
        progressLabel.text( progressBar.progressbar( "value" ) + "%" );
      },
      complete: function() {
        progressLabel.text(i18n.t('general.completed'));
      }
    });
  }

  // FIXME: responsiveness should be done via CSS
  // the only thing that relays on this class is .verse-notes
  adaptVerseList(sidePanelWidth, windowWidth=undefined) {
    if (!windowWidth) {
      windowWidth = window.innerWidth;
    }

    var verseListTabsClassList = document.querySelector('#verse-list-tabs').classList;
    var verseListTabsWidth = windowWidth - sidePanelWidth;

    if (verseListTabsWidth >= 200 && // Initially, at program start the width is very small (100) - in this
                                     // case we don't add the small-screen class to avoid flickering.
        verseListTabsWidth <= 1000) {

      verseListTabsClassList.add('verse-list-tabs-small-screen');

      if (verseListTabsWidth < 850) {
        verseListTabsClassList.add('verse-list-tabs-tiny-screen');
      } else {
        verseListTabsClassList.remove('verse-list-tabs-tiny-screen');
      }

    } else {
      verseListTabsClassList.remove('verse-list-tabs-small-screen', 'verse-list-tabs-tiny-screen');
    }
  }
  
  resizeAppContainer(sidePanelWidth=undefined, cycle=false) {
    var windowWidth = window.innerWidth;

    const sidePanel = document.querySelector('#side-panel');
    const bottomPanel = document.querySelector('#bottom-panel');

    if (windowWidth >= 200 && windowWidth < 1200) {
      // Automatically hide toolbar on smaller screens
      sidePanel.style.display='none';
      app_controller.tag_assignment_menu.moveTagAssignmentList(true);

      // Move dictionary to bottom panel
      const dictionary = sidePanel.querySelector('#dictionary-info-box');
      if (dictionary) {
        bottomPanel.appendChild(dictionary);
        bottomPanel.classList.add('with-dictionary');
        sidePanel.classList.remove('with-dictionary');
      }
      
    } else if (!cycle) {
      sidePanel.style.display='';
      app_controller.tag_assignment_menu.moveTagAssignmentList(false);

      // Move dictionary back to side panel
      const dictionary = bottomPanel.querySelector('#dictionary-info-box');
      if (dictionary) {
        sidePanel.appendChild(dictionary);
        sidePanel.classList.add('with-dictionary');
        bottomPanel.classList.remove('with-dictionary');
      }
    }

    sidePanelWidth = sidePanelWidth || sidePanel.offsetWidth; 
    this.adaptVerseList(sidePanelWidth, windowWidth);
  }

  getMaxDialogWidth() {
    var width = 900;
    var windowWidth = $(window).width();

    if (windowWidth > 400 && windowWidth < width) {
      width = windowWidth - 20;
    }

    return width;
  }

  showGlobalLoadingIndicator() {
    $('#main-content').hide();
    var loadingIndicator = $('#startup-loading-indicator');
    loadingIndicator.show();
    loadingIndicator.find('.loader').show();
  }
  
  hideGlobalLoadingIndicator() {
    var loadingIndicator = $('#startup-loading-indicator');
    loadingIndicator.hide();
    $('#main-content').show();
  }

  updateLoadingSubtitle(i18nKey, fallbackText="") {
    if (!platformHelper.isCordova()) {
      return;
    }
    
    var text = i18nController.getStringForStartup(i18nKey, fallbackText);
    if (text === fallbackText && window.i18n !== undefined && typeof window.i18n.t === 'function') {
      text = window.i18n.t(i18nKey);
    }

    document.querySelector('#loading-subtitle').textContent = text !== i18nKey ? text : fallbackText;
  }

  getCurrentTextLoadingIndicator(tabIndex=undefined) {
    var currentVerseListMenu = app_controller.getCurrentVerseListMenu(tabIndex);
    var loadingIndicator = currentVerseListMenu.find('.loader');
    return loadingIndicator;
  }

  showTextLoadingIndicator(tabIndex=undefined) {
    var textLoadingIndicator = this.getCurrentTextLoadingIndicator(tabIndex);
    textLoadingIndicator.show();
  }

  hideTextLoadingIndicator(tabIndex=undefined) {
    var textLoadingIndicator = this.getCurrentTextLoadingIndicator(tabIndex);
    textLoadingIndicator.hide();
  }

  getFirstVisibleVerseAnchor() {
    let verseListFrame = app_controller.getCurrentVerseListFrame();
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
  }

  showButtonMenu($button, $menu) {
    const OFFSET_FROM_EDGE = 20;
    $button.addClass('ui-state-active');

    var buttonOffset = $button.offset();
    var topOffset = buttonOffset.top + $button.height() + 1;
    var leftOffset = buttonOffset.left;

    if (leftOffset + $menu.width() > $(window).width() - OFFSET_FROM_EDGE) {
      leftOffset = ($(window).width() - $menu.width()) / 2;
    }

    $menu.css('top', topOffset);
    $menu.css('left', leftOffset);
    $menu.show();
  }
}

module.exports = UiHelper;
