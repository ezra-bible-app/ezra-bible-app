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

/**
 * The SwordNotes component implements the handling of SWORD-based note elements
 * like cross-references and footnotes.
 * 
 * @category Component
 */
class SwordNotes {
  constructor() {
    this.notesCharacter = null;
  }
  
  getNotesCharacter() {
    if (this.notesCharacter == null) {
      this.notesCharacter = i18n.t('bible-browser.footnote-character');
    }

    return this.notesCharacter;
  }

  getCurrentTabNotes(tabIndex) {
    var verseList = app_controller.getCurrentVerseList(tabIndex);
    var swordNotes = verseList[0].querySelectorAll('.sword-note');
    return swordNotes;
  }

  createMarker(markerClass, title, content) {
    var marker = document.createElement('div');
    marker.classList.add(markerClass);
    marker.classList.add('sword-marker');
    marker.setAttribute('title', title);
    marker.textContent = content;

    return marker;
  }

  initForTab(tabIndex=undefined) {
    var swordNotes = this.getCurrentTabNotes(tabIndex);
    this.initNotes(swordNotes);
  }

  initForContainer(container) {
    var swordNotes = container.querySelectorAll('.sword-note');
    this.initNotes(swordNotes);
  }

  cleanNotes(swordNotes) {
    var filteredNotes = [...swordNotes].filter(e => {
      return e.getAttribute('type') == 'crossReference';
    });

    var textNodes = [];

    for (var i = 0; i < filteredNotes.length; i++) {
      var currentNote = filteredNotes[i];

      var nextNode;
      var walk = document.createTreeWalker(currentNote, NodeFilter.SHOW_TEXT);

      while (nextNode = walk.nextNode()) {
        if (nextNode.parentNode.nodeName != "REFERENCE") {
          textNodes.push(nextNode);
        }
      }
    }

    for (var i = 0; i < textNodes.length; i++) {
      textNodes[i].replaceWith("");
    }
  }

  initNotes(swordNotes) {
    //console.time('SwordNotes.initForTab');
    //console.log(`Got ${swordNotes.length} sword xref elements!`);

    // Within crossReference notes: Remove text nodes containing ';'
    this.cleanNotes(swordNotes);
    var notesCharacter = this.getNotesCharacter();

    for (var i = 0; i < swordNotes.length; i++) {
      var currentNote = swordNotes[i];

      if (currentNote.hasAttribute('type') && currentNote.getAttribute('type') == 'crossReference') {
        this.initCrossReferenceNote(currentNote);
      } else {
        this.initRegularNote(currentNote, notesCharacter);
      }
    }

    var jqSwordNotes = $(swordNotes);
    jqSwordNotes.css('display', 'inline-block');
    jqSwordNotes.css('margin-left', '0.1em');
    //console.timeEnd('SwordNotes.initForTab');
  }

  initCrossReferenceNote(note) {
    var noteContent = note.innerHTML;

    if (noteContent.indexOf("sword-xref-marker") == -1) {
      var currentReferences = note.querySelectorAll('reference');
      var currentTitle = "";

      if (currentReferences.length > 1) {
        var currentTitleArray = [];

        currentReferences.forEach(ref => {
          var currentRef = ref.textContent;
          currentTitleArray.push(currentRef);
        });

        currentTitle = currentTitleArray.join('; ');

      } else if (currentReferences.length == 1) {

        currentTitle = currentReferences[0].textContent;
      }

      var xrefMarker = this.createMarker('sword-xref-marker', currentTitle, 'x');
      note.insertBefore(xrefMarker, note.firstChild);
    } else {
      // This is necessary when reloading a tab from cache. For some reason, the x content in the notes is not persisted.
      note.firstChild.innerText = 'x';
    }
  }

  initRegularNote(note, notesCharacter) {
    var noteContent = note.innerHTML;

    if (noteContent.indexOf("sword-note-marker") == -1) {
      var currentTitle = note.textContent;
      var noteMarker = this.createMarker('sword-note-marker', currentTitle, notesCharacter);
      note.innerText = "";
      note.insertBefore(noteMarker, note.firstChild);
    }
  }
}

module.exports = SwordNotes;