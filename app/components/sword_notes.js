/* This file is part of Ezra Project.

   Copyright (C) 2019 - 2020 Tobias Klein <contact@ezra-project.net>

   Ezra Project is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 2 of the License, or
   (at your option) any later version.

   Ezra Project is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Project. See the file LICENSE.
   If not, see <http://www.gnu.org/licenses/>. */

/**
 * The SwordNotes component implements the handling of SWORD-based note elements
 * like cross-references and footnotes.
 * 
 * @category Component
 */
class SwordNotes {
  constructor() {
    this.notesCharacter = i18n.t('bible-browser.footnote-character');
  }

  getCurrentTabNotes(tabIndex) {
    var verseList = app_controller.getCurrentVerseList(tabIndex);
    var swordNotes = verseList.find('.sword-note');
    return swordNotes;
  }

  createMarker(markerClass, title, content) {
    var marker = document.createElement('div');
    marker.classList.add(markerClass);
    marker.classList.add('sword-marker');
    marker.setAttribute('title', title);
    marker.innerText = content;

    return marker;
  }

  initForTab(tabIndex=undefined) {
    var swordNotes = this.getCurrentTabNotes(tabIndex);
    this.initNotes(swordNotes);
  }

  initForContainer(container) {
    var swordNotes = container.find('.sword-note');
    this.initNotes(swordNotes);
  }

  initNotes(swordNotes) {
    //console.time('SwordNotes.initForTab');
    //console.log(`Got ${swordNotes.length} sword xref elements!`);

    // Within crossReference notes: Remove text nodes containing ';'
    swordNotes.filter('[type="crossReference"]').contents().filter(function() {
      return this.nodeType === 3; //Node.TEXT_NODE
    }).replaceWith("");

    for (var i = 0; i < swordNotes.length; i++) {
      var currentNote = swordNotes[i];

      if (currentNote.hasAttribute('type') && currentNote.getAttribute('type') == 'crossReference') {
        this.initCrossReferenceNote(currentNote);
      } else {
        this.initRegularNote(currentNote);
      }
    }

    swordNotes.css('display', 'inline-block');
    swordNotes.css('margin-left', '0.1em');
    //console.timeEnd('SwordNotes.initForTab');
  }

  initCrossReferenceNote(note) {
    var noteContent = note.innerHTML;

    if (noteContent.indexOf("sword-xref-marker") == -1) {
      var currentReferences = note.querySelectorAll('reference');
      var currentTitleArray = [];

      currentReferences.forEach((ref) => {
        var currentRef = ref.innerText;
        currentTitleArray.push(currentRef);
      });

      var currentTitle = currentTitleArray.join('; ');

      var xrefMarker = this.createMarker('sword-xref-marker', currentTitle, 'x');
      note.insertBefore(xrefMarker, note.firstChild);
    }
  }

  initRegularNote(note) {
    var noteContent = note.innerHTML;

    if (noteContent.indexOf("sword-note-marker") == -1) {
      var currentTitle = note.innerText;
      var noteMarker = this.createMarker('sword-note-marker', currentTitle, this.notesCharacter);
      note.innerText = "";
      note.insertBefore(noteMarker, note.firstChild);
    }
  }
}

module.exports = SwordNotes;