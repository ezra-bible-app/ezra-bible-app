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


class UiHelper {
  constructor() {
    this.app_container_height = null;
  }

  configureButtonStyles(context = null) {
    if (context == null) {
      context = document;
    } else {
      var context = document.querySelector(context);
    }
  
    var buttons = context.querySelectorAll('.fg-button');
  
    for (var i = 0; i < buttons.length; i++) {
      var currentButton = buttons[i];
      var currentButtonClasses = currentButton.classList;
  
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

  adaptVerseList(verseListFrame=undefined) {
    if (verseListFrame === undefined) {
      verseListFrame = app_controller.getCurrentVerseListFrame();
    }
    
    if (verseListFrame.width() < 650) {
      verseListFrame.addClass('verse-list-frame-small-screen');
    } else {
      verseListFrame.removeClass('verse-list-frame-small-screen');
    }
  }
  
  resizeVerseList(tabIndex=undefined) {
    if (tabIndex === undefined) {
      tabIndex = app_controller.tab_controller.getSelectedTabIndex();
    }

    var tabsNav = $(document.getElementById('verse-list-tabs').querySelector('.ui-tabs-nav'));
    var currentVerseListMenu = app_controller.getCurrentVerseListMenu(tabIndex);
    var verseListComposite = app_controller.getCurrentVerseListComposite(tabIndex);

    var navigationPane = verseListComposite.find('.navigation-pane');
    var verseListFrame = verseListComposite.find('.verse-list-frame');
  
    var newVerseListHeight = this.app_container_height - tabsNav.height() - currentVerseListMenu.height() - 40;
    navigationPane.css('height', newVerseListHeight);
    verseListFrame.css('height', newVerseListHeight);
  
    this.adaptVerseList(verseListFrame);
  }
  
  // FIXME: Optimize this to be tab-specific
  resizeAppContainer(e, cycle=false) {
    var verseListTabs = $(document.getElementById('verse-list-tabs'));
    var verseListTabsWidth = verseListTabs.width();
    var windowWidth = window.innerWidth;

    if (windowWidth >= 200 && windowWidth < 1200) {
      // Automatically hide toolbar on smaller screens
      var currentToolBar = $('#bible-browser-toolbox');
      currentToolBar.hide();
      app_controller.tag_assignment_menu.moveTagAssignmentList(true);
    } else if (!cycle) {
      app_controller.optionsMenu.showOrHideToolBarBasedOnOption(undefined);
    }

    if (verseListTabsWidth >= 200 && // Initially, at program start the width is very small (100) - in this
                                     // case we don't add the small-screen class to avoid flickering.
        verseListTabsWidth <= 1000) {

      verseListTabs.addClass('verse-list-tabs-small-screen')

      if (windowWidth < 850) {
        verseListTabs.addClass('verse-list-tabs-tiny-screen');
      } else {
        verseListTabs.removeClass('verse-list-tabs-tiny-screen');
      }

    } else {
      verseListTabs.removeClass('verse-list-tabs-small-screen');
      verseListTabs.removeClass('verse-list-tabs-tiny-screen');
    }

    this.app_container_height = $(window).height() - 10;
    $("#app-container").css("height", this.app_container_height);
  
    var tagsToolBarHeight = $('#tags-toolbar').height();
  
    if (app_controller.optionsMenu._dictionaryOption.isChecked()) {
      $('#tags-content-global').css('height', this.app_container_height - tagsToolBarHeight - 540);
      $('#dictionary-info-box-panel').css('height', 422);
    } else {
      $('#tags-content-global').css('height', this.app_container_height - tagsToolBarHeight - 55);
    }

    var tabCount = app_controller.tab_controller.getTabCount();
    for (var i = 0; i < tabCount; i++) {
      this.resizeVerseList(i);
    }
  }

  getMaxDialogWidth() {
    var width = 700;
    var windowWidth = $(window).width();

    if (windowWidth > 400 && windowWidth < 700) {
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

  updateLoadingSubtitle(text) {
    if (platformHelper.isCordova()) {
      $('#loading-subtitle').text(text);
    }
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
    var firstVisibleVerseAnchor = null;
    console.time('firstElement');
    var verseListFrame = app_controller.getCurrentVerseListFrame();

    if (verseListFrame != null) {
      var verseListFrameRect = verseListFrame[0].getBoundingClientRect();

      var verseListFrameOffsetX = verseListFrameRect.x;
      var verseListFrameOffsetY = verseListFrameRect.y;

      var currentNavigationPane = app_controller.navigation_pane.getCurrentNavigationPane()[0];
      var currentNavigationPaneWidth = currentNavigationPane.offsetWidth;

      var firstElementOffsetX = verseListFrameOffsetX + currentNavigationPaneWidth + 15;
      var firstElementOffsetY = verseListFrameOffsetY + 15;
      
      var firstElement = document.elementFromPoint(firstElementOffsetX, firstElementOffsetY);
      var currentElement = firstElement;

      if (currentElement.classList != null && currentElement.classList.contains('verse-list')) {
        currentElement = document.elementFromPoint(firstElementOffsetX, firstElementOffsetY + 10);
      }

      if (currentElement.classList != null && currentElement.classList.contains('sword-section-title')) {
        if (currentElement.previousElementSibling != null &&
            currentElement.previousElementSibling.nodeName == 'A') {

          currentElement = currentElement.previousElementSibling;
        }
      } else {      
        for (var i = 0; i < 5; i++) {
          if (currentElement.classList != null && currentElement.classList.contains('verse-box')) {
            
            if (currentElement.offsetHeight < 0 &&
                currentElement.nextElementSibling != null &&
                currentElement.nextElementSibling.classList != null &&
                currentElement.nextElementSibling.classList.contains('verse-box')) {

              currentElement = currentElement.nextElementSibling;
            }

            currentElement = currentElement.querySelector('a.nav');

            break;
          }

          currentElement = currentElement.parentNode;
        }
      }

      firstVisibleVerseAnchor = currentElement;
    }


    console.timeEnd('firstElement');

    return firstVisibleVerseAnchor;
  }
}

module.exports = UiHelper;