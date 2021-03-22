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

const Mousetrap = require('mousetrap');

const DEFAULT_TEXT_SIZE = 10; // in em*10 so not to deal with float
const MIN_SIZE = 7;
const MAX_SIZE = 20;
const INCREASE_SHORTCUT = ['mod+=', 'mod+shift+=']; // Ctrl/Cmd + 
const DECREASE_SHORTCUT = ['mod+-', 'mod+shift+-'];  // Ctrl/Cmd -
const RESET_SHORTCUT = 'mod+0';  // Ctrl/Cmd 0
const SETTINGS_KEY = 'verse-text-size';

/**
 * The TextSizeSettings component implements the buttons two control text (font size) of the verse and
 * other elements. Size update is done by updating (adding new and deleting old) css rule
 * 
 * @category Component
 */
class TextSizeSettings {
  constructor() {
    this._textSizeValue = this.DEFAULT_TEXT_SIZE;
    this.openMenuButton = '.text-size-settings';
    this.menuContainer = '.text-size-menu';
    this.menuIsOpened = false;
    this.stylesheet = null;  // instance of CSSStyleSheet https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleSheet
  }

  async init(tabIndex = undefined) {

    var currentVerseListMenu = app_controller.getCurrentVerseListMenu(tabIndex);
    currentVerseListMenu.find(this.openMenuButton).bind('click', (e) => {
      e.stopPropagation()
      if (this.menuIsOpened) {
        this.hideTextSizeMenu();
      } else {
        this.showTextSizeMenu();
      }
    });

    currentVerseListMenu.find('.text-size-reset').bind('click', () => {
      this.resetSize();
    });

    currentVerseListMenu.find('.text-size-decrease').bind('click', () => {
      this.decreaseSize();
    });

    currentVerseListMenu.find('.text-size-increase').bind('click', () => {
      this.increaseSize();
    });

    if (this.stylesheet === null) {
      var styleEl = $('<style id="dynamic-text-size" />')
      $("head").append(styleEl);
      this.stylesheet = styleEl[0].sheet;

      Mousetrap.bind(INCREASE_SHORTCUT, () => {
        this.increaseSize();
        return false;
      });

      Mousetrap.bind(DECREASE_SHORTCUT, () => {
        this.decreaseSize();
        return false;
      });

      Mousetrap.bind(RESET_SHORTCUT, () => {
        this.resetSize();
        return false;
      });

      if (window.ipcSettings) {
        this._textSizeValue = await window.ipcSettings.get(SETTINGS_KEY, DEFAULT_TEXT_SIZE);
      }

      this.updateStyle();
    }

  }

  showTextSizeMenu() {
    var currentVerseListMenu = app_controller.getCurrentVerseListMenu();
    var $menuButton = currentVerseListMenu.find(this.openMenuButton);
    $menuButton.addClass('ui-state-active');
    var buttonOffset = $menuButton.offset();
    var $menuContainer = currentVerseListMenu.find(this.menuContainer);

    var topOffset = buttonOffset.top + $menuButton.height() + 2;
    var leftOffset = buttonOffset.left - 2;
    if (leftOffset + $menuContainer.width() > $(window).width()) {
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

  increaseSize() {
    if (this._textSizeValue >= MAX_SIZE - 1) {
      return;
    }
    this._textSizeValue += 1;
    this.updateStyle();
    this.saveConfig();
  }

  decreaseSize() {
    if (this._textSizeValue <= MIN_SIZE + 1) {
      return;
    }
    this._textSizeValue -= 1;
    this.updateStyle();
    this.saveConfig();
  }

  resetSize() {
    this._textSizeValue = DEFAULT_TEXT_SIZE;
    this.updateStyle();
    this.saveConfig();
  }

  async saveConfig() {
    if (window.ipcSettings) {
      await window.ipcSettings.set(SETTINGS_KEY, this._textSizeValue);
    }
  }

  updateStyle() {
    this.stylesheet.insertRule(`.verse-list .verse-text { font-size: ${this._textSizeValue * 0.1}em }`, this.stylesheet.cssRules.length);
    if (this.stylesheet.cssRules.length > 1) {
      this.stylesheet.deleteRule(0);
    }
  }

}

module.exports = TextSizeSettings;