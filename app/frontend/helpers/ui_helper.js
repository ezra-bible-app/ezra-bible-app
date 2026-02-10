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

const i18nController = require('../controllers/i18n_controller.js');

// Dialog width ratio for mobile devices (95% to account for borders/padding)
const MOBILE_DIALOG_WIDTH_RATIO = 0.95;

class UiHelper {
  constructor() {
    this.app_container_height = null;
    this.windowWidth = window.innerWidth;
  }

  configureButtonStyles(context=null) {
    if (context == null) {
      context = document;
    } else if (typeof context === 'string') {
      context = document.querySelector(context);
    } else if (!(context instanceof HTMLElement)) {
      throw new Error('context should be HTMLElement, css selector string or null for the document context');
    }
  
    if (context == null) { return; }
    let buttons = context.querySelectorAll('.fg-button');
  
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

  onResize() {
    this.windowWidth = window.innerWidth;
  }

  getMaxDialogWidth() {
    var width = 800;

    if (this.windowWidth > 400 && this.windowWidth < width) {
      width = this.windowWidth - 20;
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
    textLoadingIndicator.removeClass('hidden');
  }

  hideTextLoadingIndicator(tabIndex=undefined) {
    var textLoadingIndicator = this.getCurrentTextLoadingIndicator(tabIndex);
    textLoadingIndicator.addClass('hidden');
  }

  showButtonMenu($button, $menu) {
    const OFFSET_FROM_EDGE = 20;
    $button.addClass('ui-state-active');

    var buttonOffset = $button.offset();
    var topOffset = buttonOffset.top + $button.height() + 1;
    var leftOffset = buttonOffset.left;

    if (leftOffset + $menu.width() > this.windowWidth - OFFSET_FROM_EDGE) {
      leftOffset = (this.windowWidth - $menu.width()) / 2;

      if (leftOffset < 0) {
        leftOffset = 0;
      }
    }

    $menu.css('top', topOffset);
    $menu.css('left', leftOffset);
    $menu.show();
  }

  enableButton(button) {
    button.classList.remove('ui-state-disabled');
    button.removeAttribute('disabled');
  }

  disableButton(button) {
    button.classList.add('ui-state-disabled');
    button.setAttribute('disabled', true);
  }

  getDialogOptions(width, height, draggable, position, resizable=false, fullscreen=false) {
    let modal = false;

    if (platformHelper.isMobile() || fullscreen) {
      const windowWidth = $(window).width();
      // Use ratio to account for dialog borders and padding
      width = Math.min(width, windowWidth * MOBILE_DIALOG_WIDTH_RATIO);
      height = $(window).height() - 85;

      if (platformHelper.isCordova()) {
        // eslint-disable-next-line no-undef
        if (Keyboard.isVisible) {
          height = $(window).height();
        }
      }

      draggable = false;
      modal = true;
      position = [0, 0];
    }

    if (platformHelper.isCordova()) {
      modal = true;
    }

    let dialogOptions = {
      width: width,
      draggable: draggable,
      resizable: resizable,
      modal: modal,
      dialogClass: 'ezra-dialog'
    };

    if (position != null) {
      dialogOptions.position = position;
    }

    if (height != null) {
      dialogOptions.height = height;
    }

    return dialogOptions;
  }

  switchToDarkTheme(docObject, mainElementId) {
    this.switchToTheme(docObject, 'css/jquery-ui/dark-hive/jquery-ui.css');
    docObject.getElementById(mainElementId).classList.add('darkmode--activated');
  }
  
  switchToRegularTheme(docObject, mainElementId) {
    this.switchToTheme(docObject, 'css/jquery-ui/cupertino/jquery-ui.css');
    docObject.getElementById(mainElementId).classList.remove('darkmode--activated');
  }

  switchToTheme(docObject, theme) {
    var currentTheme = docObject.getElementById("theme-css").href;
  
    if (currentTheme.indexOf(theme) == -1) { // Only switch the theme if it is different from the current theme
      docObject.getElementById("theme-css").href = theme;
    }
  }

  fixDialogCloseIconOnCordova(dialogClass) {
    if (!platformHelper.isCordova()) {
      return;
    }

    let dialogElements = document.getElementsByClassName(dialogClass);

    if (dialogElements != null) {
      let dialog = dialogElements[0];

      if (dialog != null) {
        let closeIcon = dialog.querySelector('.ui-icon-closethick');

        if (closeIcon != null) {
          let newIcon = document.createElement('i');
          newIcon.setAttribute('class', 'fa-solid fa-rectangle-xmark close-dialog-icon');
          newIcon.setAttribute('style', 'font-size: 150%; color: darkslategray; position: relative; right: 10px; bottom: 1px');

          closeIcon.replaceWith(newIcon);
        }
      }
    }
  }

  addButton(referenceElement, cssClass, localeId, onClickFunction, isDisabled=false, insertAfter=false) {
    let button = document.createElement('button');
    button.classList.add(cssClass);
    button.classList.add('fg-button');
    button.classList.add('ui-corner-all');
    button.classList.add('ui-state-default');
    
    if (isDisabled) {
      button.classList.add('ui-state-disabled');
    }

    button.innerText = i18n.t(localeId);
    button.setAttribute('i18n', localeId);

    if (insertAfter) {
      referenceElement.after(button);
    } else {
      referenceElement.append(button);
    }

    button.addEventListener('click', () => {
      if (button.classList.contains('ui-state-disabled')){
        return;
      }
      
      onClickFunction();
    });
  }

  openLinkInBrowser(link) {
    if (platformHelper.isElectron()) {

      require("electron").shell.openExternal(link);

    } else if (platformHelper.isCordova()) {

      window.open(link, '_system');

    }
  }

  showSuccessMessage(message, timeout=3000) {
    const position = platformHelper.getIziPosition();

    // eslint-disable-next-line no-undef
    iziToast.success({
      message: message,
      position: position,
      timeout: timeout
    });
  }
}

module.exports = UiHelper;
