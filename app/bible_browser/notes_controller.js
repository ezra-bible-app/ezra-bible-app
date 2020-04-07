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

class NotesController {
  constructor() {
    this.currentVerseReferenceId = null;
    this.currentlyEditedNotes = null;
    this.currentEditor = null;
  }

  initForTab(tabIndex=undefined) {
    var currentVerseList = bible_browser_controller.getCurrentVerseList(tabIndex);

    var notes = currentVerseList[0].querySelectorAll('.verse-notes');
    for (var i = 0; i < notes.length; i++) {
      notes[i].addEventListener('mousedown', (event) => {
        this.handleNotesClick(event);
      });
    }
  }

  handleNotesClick(event) {
    console.log('Notes click!');

    var verseBox = $(event.target).closest('.verse-box');
    var verseReferenceId = verseBox.find('.verse-reference-id').text();

    if (verseReferenceId != this.currentVerseReferenceId) {

      if (this.currentlyEditedNotes != null) { // Clean the currently edited notes
        this.currentlyEditedNotes.innerHTML = '';
      }

      this.currentVerseReferenceId = verseReferenceId;
      this.currentlyEditedNotes = event.target;
      this.currentEditor = this.createEditor(this.currentlyEditedNotes);
    }
  }

  createEditor(notesElement) {
    return monaco.editor.create(notesElement, {
      value: [
        '# TEST'
      ].join('\n'),
      language: 'markdown',
      lineNumbers: false,
      lineDecorationsWidth: '0px',
      lineNumbersMinChars: 0,
      automaticLayout: true,
      minimap: {
        enabled: false
      }
    });
  }
}

module.exports = NotesController;