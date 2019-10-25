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

const strongs = require('strongs');
const NodeSwordInterface = require('node-sword-interface');

class StrongsController {
  constructor() {
    this.nodeSwordInterface = new NodeSwordInterface();
    this.currentStrongsElement = null;
    this.strongsBox = $('#strongs-box');

    this.strongsBox.bind('mouseout', () => {
      this.hideStrongsBox();
    });
  }

  hideStrongsBox() {
    if (this.currentStrongsElement != null) {
      this.currentStrongsElement.css('visibility', 'visible');
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
      this.currentStrongsElement.css('visibility', 'visible');
    }

    this.currentStrongsElement = $(event.target);
    this.currentStrongsElement.css('visibility', 'hidden');
    var rawStrongsId = this.currentStrongsElement.attr('class');
    var strongsId = rawStrongsId.split(' ')[0].split(':')[1];
    
    this.strongsBox.css({
      'height': '35px',
      'fontSize': this.currentStrongsElement.css('fontSize')
    });

    var text = this.currentStrongsElement.text();
    var strongsValue = strongs[strongsId].lemma;

    try {
      var strongsEntry = this.nodeSwordInterface.getStrongsEntry(strongsId);
      strongsValue = strongsEntry.transcription + " - " + strongsValue;
    } catch (e) {
      console.log(e);
    }

    text += "<br/>" + strongsValue;

    this.strongsBox.html(text);
    this.strongsBox.show();

    this.strongsBox.position({
      at: "center bottom",
      of: this.currentStrongsElement
    });
  }
}

module.exports = StrongsController;