/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2021 Tobias Klein <contact@ezra-project.net>

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

/**
 * The TextSizeSettings component implements the buttons two control text (font size) of the verse and
 * other elements. Size update is done by updating (adding new and deleting old) css rule
 * 
 * @category Component
 */
class TextSizeSettings {
  constructor() {
    this.defaultTextSize = 10; // in em*10 so not to deal with float
    this.minSize = 7;
    this.maxSize = 20;
    this._textSizeValue = this.defaultTextSize;
    this._settingsKey = 'verse-text-size';
    this.openMenuButton = '.text-size-settings';
    this.menuContainer = '.text-size-menu';
    this.menuIsOpened = false;
    this.stylesheet = null;  // instance of CSSStyleSheet https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleSheet
  }

  async init() {
    if (this.stylesheet !== null) {
      return;
    }

    var styleEl = $('<style id="dynamic-text-size" />')
    $("head").append(styleEl);
    this.stylesheet = styleEl[0].sheet;

    $('#app-container').find(this.openMenuButton).bind('click', (e) => {
      e.stopPropagation()
      if (this.menuIsOpened) {
        this.hideTextSizeMenu();
      } else {
        this.showTextSizeMenu();
      }
    });

    $('#app-container').find('.text-size-reset').bind('click', () => {
      this._textSizeValue = this.defaultTextSize;
      this.updateStyle();
      this.saveConfig();
    });

    $('#app-container').find('.text-size-decrease').bind('click', () => {
      if(this._textSizeValue <= this.minSize+1) {
        return;
      }
      this._textSizeValue -= 1;
      this.updateStyle();
      this.saveConfig();
    });

    $('#app-container').find('.text-size-increase').bind('click', () => {
      if(this._textSizeValue >= this.maxSize-1) {
        return;
      }
      this._textSizeValue += 1;
      this.updateStyle();
      this.saveConfig();  
    });

    if (window.ipcSettings) {
      this._textSizeValue = await window.ipcSettings.get(this._settingsKey, this.defaultTextSize);
    }

    this.updateStyle();
  }

  showTextSizeMenu() {
    var currentVerseListMenu = app_controller.getCurrentVerseListMenu();
    var $menuButton = currentVerseListMenu.find(this.openMenuButton);
    $menuButton.addClass('ui-state-active');
    var buttonOffset = $menuButton.offset();
    var $menuContainer = currentVerseListMenu.find(this.menuContainer);

    var topOffset = buttonOffset.top + $menuButton.height() + 2;
    var leftOffset = buttonOffset.left - 2;
    if (leftOffset+$menuContainer.width() > $(window).width()) {
      leftOffset = buttonOffset.left + $menuButton.width() - $menuContainer.width();
    }

    $menuContainer.css('top', topOffset);
    $menuContainer.css('left', leftOffset);

    this.menuIsOpened = true;
    $menuContainer.show();
  }

  hideTextSizeMenu() {
    if (this.menuIsOpened) {
      app_controller.getCurrentVerseListMenu().find(this.menuContainer).hide();
      this.menuIsOpened = false;
      app_controller.getCurrentVerseListMenu().find(this.openMenuButton).removeClass('ui-state-active');
    }
  }

  async saveConfig() {
    if (window.ipcSettings) {
      await window.ipcSettings.set(this._settingsKey, this._textSizeValue);
    }
  }

  updateStyle() {
    this.stylesheet.insertRule(`.verse-list .verse-text { font-size: ${this._textSizeValue*0.1}em }`, this.stylesheet.cssRules.length);
    if (this.stylesheet.cssRules.length > 1) {
      this.stylesheet.deleteRule(0);
    }
  }

}

module.exports = TextSizeSettings;