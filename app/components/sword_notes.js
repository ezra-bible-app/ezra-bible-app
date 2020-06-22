/* This file is part of Ezra Project.

   Copyright (C) 2019 - 2020 Tobias Klein <contact@ezra-project.net>

   Ezra Project is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   Ezra Project is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Project. See the file LICENSE.
   If not, see <http://www.gnu.org/licenses/>. */


class SwordNotes {
  constructor() {
  }

  getCurrentTabNotes(tabIndex) {
    var verseList = bible_browser_controller.getCurrentVerseList(tabIndex);
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
      var currentNoteContent = currentNote.innerHTML;

      if (currentNote.hasAttribute('type') && currentNote.getAttribute('type') == 'crossReference') {
        // Cross reference note!

        if (currentNoteContent.indexOf("sword-xref-marker") == -1) {
          var currentReferences = currentNote.querySelectorAll('reference');
          var currentTitleArray = [];

          currentReferences.forEach((ref) => {
            var currentRef = ref.innerText;
            currentTitleArray.push(currentRef);
          });
          var currentTitle = currentTitleArray.join('; ');

          var xrefMarker = this.createMarker('sword-xref-marker', currentTitle, 'x');
          currentNote.insertBefore(xrefMarker, currentNote.firstChild);
        }
      } else {
        // Regular note

        if (currentNoteContent.indexOf("sword-note-marker") == -1) {
          var currentTitle = currentNote.innerText;

          var noteMarker = this.createMarker('sword-note-marker', currentTitle, '*');

          currentNote.innerText = "";
          currentNote.insertBefore(noteMarker, currentNote.firstChild);
        }
      }
    }

    swordNotes.css('display', 'inline-block');
    //console.timeEnd('SwordNotes.initForTab');
  }
}

module.exports = SwordNotes;