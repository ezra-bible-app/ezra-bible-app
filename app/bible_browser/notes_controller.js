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

const marked = require("marked");

class NotesController {
  constructor() {
    this.theme = this.getCurrentTheme();
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
    var renderedContent = "";

    if (editorContent != "") {
      renderedContent = marked(editorContent);
    }

    return renderedContent;
  }

  restoreCurrentlyEditedNotes() {
    this.saveEditorContent();

    if (this.currentlyEditedNotes != null) {
      var renderedContent = this.getRenderedEditorContent();
      this.currentlyEditedNotes.style.removeProperty('height');
      this.currentlyEditedNotes.innerHTML = renderedContent;

      if (renderedContent == '') {
        this.currentlyEditedNotes.classList.add('verse-notes-empty');
      } else {
        this.currentlyEditedNotes.classList.remove('verse-notes-empty');
      }
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
      this.currentlyEditedNotes.classList.remove('verse-notes-empty');
      this.createEditor(this.currentlyEditedNotes);
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
    var theme = 'default';
    if (bible_browser_controller.optionsMenu.nightModeSwitchChecked()) {
      theme = 'mbo';
    }

    return theme;
  }

  createEditor(notesElement) {
    notesElement.innerHTML = '';

    var textArea = htmlToElement('<textarea class="editor"></textarea>');
    notesElement.append(textArea);

    var targetElement = notesElement.querySelector('.editor');
    targetElement.value = this.getNotesElementContent(notesElement);

    var editor = CodeMirror.fromTextArea(targetElement, {
      mode: 'gfm',
      autoCloseBrackets: true,
      lineNumbers: false,
      lineWrapping: true,
      viewportMargin: Infinity,
      autofocus: true,
      extraKeys: {"Enter": "newlineAndIndentContinueMarkdownList"},
      theme: this.theme
    });

    this.currentEditor = editor;
    this.focusEditor();
  }

  focusEditor() {
    if (this.currentEditor != null) {
      setTimeout(() => {
        this.currentEditor.getInputField().focus();
        this.currentEditor.refresh();
      }, 200);
    }
  }

  setLightTheme() {
    this.theme = 'default';
    this.refreshTheme();
  }

  setDarkTheme() {
    this.theme = 'mbo';
    this.refreshTheme();
  }

  refreshTheme() {
    if (this.currentEditor != null) {
      this.currentEditor.setOption("theme", this.theme);
      this.focusEditor();
    }
  }
}

module.exports = NotesController;