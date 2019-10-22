/* This file is part of Ezra Project.

   Copyright (C) 2019 Tobias Klein <contact@ezra-project.net>

   Ezra Project is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   Ezra Project is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Project. See the file COPYING.
   If not, see <http://www.gnu.org/licenses/>. */

   class StrongsController {
    constructor() {
      this.currentStrongsElement = null;

      this.strongsBox = $('#strongs-box');
      this.strongsBoxContent = $('#strongs-box-content');

      this.strongsBox.bind('mouseout', () => {
        this.hideStrongsBox();
      });
    }

    hideStrongsBox() {
      if (this.currentStrongsElement != null) {
        this.currentStrongsElement.css('backgroundColor', 'inherit');
      }

      this.strongsBox.hide();
    }

    bindAfterBibleTextLoaded(tabIndex=undefined) {
      var currentTab = bible_browser_controller.tab_controller.getTab(tabIndex);
      var currentBibleTranslationId = currentTab.getBibleTranslationId();

      if (bible_browser_controller.translation_controller.hasBibleTranslationStrongs(currentBibleTranslationId)) {
        var currentVerseList = bible_browser_controller.getCurrentVerseList(tabIndex);
        currentVerseList.find('w').bind('mouseover', (e) => {
          this.handleMouseOver(e);
        });
      }
    }

    handleMouseOver(event) {
      if (this.currentStrongsElement != null) {
        this.currentStrongsElement.css('backgroundColor', 'inherit');
      }

      this.currentStrongsElement = $(event.target);
      this.currentStrongsElement.css('backgroundColor', 'yellow');
      
      this.strongsBox.css({
        'width': this.currentStrongsElement.width() * 1.5 + 4,
        'height': this.currentStrongsElement.height() * 2.5 + 4
      });

      this.strongsBoxContent.text('test');
      this.strongsBox.show();

      this.strongsBox.position({
        at: "center bottom",
        of: this.currentStrongsElement
      });
    }
  }
  
  module.exports = StrongsController;