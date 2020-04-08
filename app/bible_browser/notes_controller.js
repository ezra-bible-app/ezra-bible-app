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

const MarkdownIt = require('markdown-it');
const md = new MarkdownIt();

class NotesController {
  constructor() {
    this.reset();
  }

  reset() {
    this.currentVerseReferenceId = null;
    this.currentlyEditedNotes = null;
    this.currentEditor = null;
  }

  initForTab(tabIndex=undefined) {
    this.reset();

    var currentVerseList = bible_browser_controller.getCurrentVerseList(tabIndex);

    var notes = currentVerseList[0].querySelectorAll('.verse-notes');
    for (var i = 0; i < notes.length; i++) {
      notes[i].addEventListener('mousedown', (event) => {
        this.handleNotesClick(event);
      });
    }
  }

  saveEditorContent() {
    if (this.currentlyEditedNotes != null) {
      this.currentlyEditedNotes.setAttribute('notes-content', this.currentEditor.getValue());
    }
  }

  getRenderedEditorContent() {
    var editorContent = this.currentEditor.getValue();
    var renderedContent = md.render(editorContent);
    return renderedContent;
  }

  restoreCurrentlyEditedNotes() {
    this.saveEditorContent();
    
    if (this.currentlyEditedNotes != null) {
      var renderedContent = this.getRenderedEditorContent();
      this.currentlyEditedNotes.style.removeProperty('height');
      this.currentlyEditedNotes.innerHTML = renderedContent;
    }

    this.reset();
  }

  handleNotesClick(event) {
    event.stopPropagation();

    var verseBox = $(event.target).closest('.verse-box');
    var verseReferenceId = verseBox.find('.verse-reference-id').text();

    if (verseReferenceId != this.currentVerseReferenceId) {
      this.restoreCurrentlyEditedNotes();
      this.currentVerseReferenceId = verseReferenceId;
      this.currentlyEditedNotes = $(event.target).closest('.verse-notes')[0];
      this.currentlyEditedNotes.style.height = '15em';
      this.currentEditor = this.createEditor(this.currentlyEditedNotes);
    }
  }

  getNotesElementContent(notesElement) {
    var notesContent = "";
    if (notesElement.hasAttribute('notes-content')) {
      notesContent = notesElement.getAttribute('notes-content')
    }
    
    return notesContent;
  }

  getCurrentTheme() {
    var theme = 'vs';
    if (bible_browser_controller.optionsMenu.nightModeSwitchChecked()) {
      theme = 'vs-dark';
    }

    return theme;
  }

  createEditor(notesElement) {
    var theme = this.getCurrentTheme();
    var notesContent = this.getNotesElementContent(notesElement);

    // Remove the existing html content from the element
    notesElement.innerHTML = '';

    var editor = monaco.editor.create(notesElement, {
      value: notesContent,
      language: 'markdown',
      lineNumbers: false,
      lineDecorationsWidth: '0px',
      lineNumbersMinChars: 0,
      automaticLayout: true,
      theme: theme,
      minimap: {
        enabled: false
      }
    });

    setTimeout(() => {
      editor.setSelection(new monaco.Selection(1,1,1,1));
      editor.focus();
    }, 100);

    return editor;
  }

  setLightTheme() {
    monaco.editor.setTheme('vs');
  }

  setDarkTheme() {
    monaco.editor.setTheme('vs-dark');
  }
}

module.exports = NotesController;