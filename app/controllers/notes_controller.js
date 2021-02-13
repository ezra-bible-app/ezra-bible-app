/* This file is part of Ezra Project.

   Copyright (C) 2019 - 2021 Tobias Klein <contact@ezra-project.net>

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

let CodeMirror = null;

const VerseBoxHelper = require('../helpers/verse_box_helper.js');
const VerseBox = require('../ui_models/verse_box.js');

/**
 * The NotesController handles all user actions related to note taking.
 * 
 * Like all other controllers it is only initialized once. It is accessible at the
 * global object `app_controller.notes_controller`.
 * 
 * @category Controller
 */
class NotesController {
  constructor() {
    this.verseBoxHelper = new VerseBoxHelper();
    this.theme = this.getCurrentTheme();
    this.reset();
  }

  getCodeMirror() {
    if (CodeMirror == null) {
      CodeMirror = require('codemirror/lib/codemirror.js');
      require("codemirror/addon/edit/continuelist.js");
      require("codemirror/mode/markdown/markdown.js");
      require("codemirror/addon/mode/overlay.js");
      require("codemirror/mode/markdown/markdown.js");
      require("codemirror/mode/gfm/gfm.js");
      require("codemirror/mode/htmlmixed/htmlmixed.js");
    }

    return CodeMirror;
  }

  reset() {
    this.currentVerseReferenceId = null;
    this.currentlyEditedNotes = null;
    this.currentEditor = null;
  }

  initForTab(tabIndex=undefined) {
    this.reset();
    var currentVerseListFrame = app_controller.getCurrentVerseListFrame(tabIndex);
    if (currentVerseListFrame == null || currentVerseListFrame.length == 0) {
      return;
    }

    var notes = currentVerseListFrame[0].querySelectorAll('.verse-notes');
    for (var i = 0; i < notes.length; i++) {
      notes[i].addEventListener('mousedown', (event) => {
        this.handleNotesClick(event);
      });
    }
  }

  getCurrentVerseBox() {
    if (this.currentVerseReferenceId == null) {
      return null;
    }

    var currentVerseListFrame = app_controller.getCurrentVerseListFrame();
    return currentVerseListFrame[0].querySelector('.verse-reference-id-' + this.currentVerseReferenceId);
  }

  refreshNotesInfo(noteValue) {
    var currentVerseBox = this.getCurrentVerseBox();
    if (currentVerseBox == null) {
      return;
    }

    var notesInfo = currentVerseBox.querySelector('.notes-info');

    if (notesInfo != null) {
      if (noteValue != '') {
        notesInfo.classList.add('visible');
      } else {
        notesInfo.classList.remove('visible');
      }
    }
  }

  async saveEditorContent() {
    var currentVerseBox = this.getCurrentVerseBox();

    if (this.currentlyEditedNotes != null && currentVerseBox != null) {
      var currentNoteValue = this.currentEditor.getValue();
      var previousNoteValue = this.currentlyEditedNotes.getAttribute('notes-content');

      if (currentNoteValue != previousNoteValue) {
        currentNoteValue = currentNoteValue.trim();
        
        this.currentlyEditedNotes.setAttribute('notes-content', currentNoteValue);
        this.refreshNotesInfo(currentNoteValue);

        var currentVerseObject = new VerseBox(currentVerseBox).getVerseObject();
        var translationId = app_controller.tab_controller.getTab().getBibleTranslationId();
        var versification = await app_controller.translation_controller.getVersification(translationId);

        ipcDb.persistNote(currentNoteValue, currentVerseObject, versification).then((note) => {
          if (note != undefined) {
            var updatedTimestamp = null;

            if (currentNoteValue == "") {
              updatedTimestamp = "";
            } else {
              updatedTimestamp = note.updatedAt;
            }

            this.updateNoteDate(currentVerseBox, updatedTimestamp);

            this.verseBoxHelper.iterateAndChangeAllDuplicateVerseBoxes(
              currentVerseBox, { noteValue: currentNoteValue, timestamp: updatedTimestamp }, (context, targetVerseBox) => {

              var currentNotes = null;

              if (targetVerseBox.classList.contains('book-notes')) {
                currentNotes = targetVerseBox;
              } else {
                currentNotes = targetVerseBox.querySelector('.verse-notes');
              }

              currentNotes.setAttribute('notes-content', context.noteValue);
              this.updateNoteDate(targetVerseBox, context.timestamp);
            });
          }
        });
      }
    }
  }

  updateNoteDate(verseBox, dbTimestamp) {
    var localizedTimestamp = "";

    if (dbTimestamp != "") {
      localizedTimestamp = i18nHelper.getLocalizedDate(dbTimestamp);
    }
    
    verseBox.querySelector('.verse-notes-timestamp').innerText = localizedTimestamp;
  }

  getRenderedEditorContent(original=false) {
    const marked = require("marked");

    var content = null;

    if (original) {
      content = this.getNotesElementContent(this.currentlyEditedNotes);
    } else {
      content = this.currentEditor.getValue();
    }

    var renderedContent = "";

    if (content != "") {
      renderedContent = marked(content);
    }

    return renderedContent;
  }

  restoreCurrentlyEditedNotes(persist=true) {
    if (persist) {
      this.saveEditorContent();
    }

    if (this.currentlyEditedNotes != null) {
      var renderedContent = this.getRenderedEditorContent(!persist);
      this.updateRenderedContent(this.currentlyEditedNotes, renderedContent);
      var currentVerseBox = this.getCurrentVerseBox();

      this.verseBoxHelper.iterateAndChangeAllDuplicateVerseBoxes(
        currentVerseBox, renderedContent, (context, targetVerseBox) => {

        var targetNotes = null;

        if (targetVerseBox.classList.contains('book-notes')) {
          targetNotes = targetVerseBox;
        } else {
          targetNotes = targetVerseBox.querySelector('.verse-notes');
        }

        this.updateRenderedContent(targetNotes, context);
      });

      this.resetVerseNoteButtons();
    }

    this.reset();
  }

  updateRenderedContent(notesElement, renderedContent) {
    notesElement.style.removeProperty('height');
    var verseNotesText = notesElement.querySelector('.verse-notes-text');
    verseNotesText.classList.remove('edited');
    verseNotesText.innerHTML = renderedContent;

    if (renderedContent == '') {
      notesElement.classList.add('verse-notes-empty');
    } else {
      notesElement.classList.remove('verse-notes-empty');
    }
  }

  resetVerseNoteButtons() {
    var verseNotesButtons = $(this.currentlyEditedNotes).find('.verse-notes-buttons');
    verseNotesButtons.find('a').unbind();
    verseNotesButtons.hide();
  }

  handleNotesClick(event) {
    if (event.target.nodeName == 'A') {
      // If the user is clicking a link within the note ('a' element)
      // we simply return and let Electron handle the default action
      // (Link will be opened in the default browser)
      return;
    }

    event.stopPropagation();

    var verseReferenceId = null;
    var verseNotesBox = $(event.target).closest('.verse-notes');

    // If the notes are not empty we need to ensure that the user actually clicked on the notes content
    if (!verseNotesBox.hasClass('verse-notes-empty')) {
      if (event.target.classList.contains('verse-notes-text') || event.target.classList.contains('verse-notes')) {
        // The click happened outside of the notes content (scrollbar or area right of scrollbar).
        // In this case we return immediately and do not process the click.
        return;
      }
    }

    if (verseNotesBox.hasClass('book-notes')) {
      verseReferenceId = $(event.target).closest('.verse-notes')[0].getAttribute('verse-reference-id');
    } else {
      var verseBox = $(event.target).closest('.verse-box')[0];
      verseReferenceId = new VerseBox(verseBox).getVerseReferenceId();
    }

    if (verseReferenceId != this.currentVerseReferenceId) {
      this.restoreCurrentlyEditedNotes();
      this.currentVerseReferenceId = verseReferenceId;
      this.currentlyEditedNotes = $(event.target).closest('.verse-notes')[0];
      this.currentlyEditedNotes.classList.remove('verse-notes-empty');
      this.createEditor(this.currentlyEditedNotes);
      this.setupVerseNoteButtons();
    }
  }

  setupVerseNoteButtons() {
    var verseNotesButtons = $(this.currentlyEditedNotes).find('.verse-notes-buttons');

    verseNotesButtons.find('a').bind('click', (event) => {
      event.preventDefault();

      if (event.target.className == 'save-note') {

        this.restoreCurrentlyEditedNotes();

      } else if (event.target.className == 'cancel-edit') {

        this.restoreCurrentlyEditedNotes(false);

      }
    });

    verseNotesButtons.show();
  }

  getNotesElementContent(notesElement) {
    var notesContent = "";
    if (notesElement.hasAttribute('notes-content')) {
      notesContent = notesElement.getAttribute('notes-content')
    }
    
    return notesContent;
  }

  htmlToElement(html) {
    var template = document.createElement('template');
    html = html.trim(); // Never return a text node of whitespace as the result
    template.innerHTML = html;
    return template.content.firstChild;
  }

  createEditor(notesElement) {
    CodeMirror = this.getCodeMirror();

    var notesElementText = notesElement.querySelector('.verse-notes-text');
    notesElementText.classList.add('edited');
    notesElementText.innerHTML = '';

    var textArea = this.htmlToElement('<textarea class="editor"></textarea>');
    notesElementText.append(textArea);

    var targetElement = notesElementText.querySelector('.editor');
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
    setTimeout(() => {
      if (this.currentEditor != null) {
        this.currentEditor.refresh();
        this.currentEditor.getInputField().focus();
      }
    }, 200);
  }

  getCurrentTheme() {
    var theme = 'default';
    if (app_controller.optionsMenu._nightModeOption && app_controller.optionsMenu._nightModeOption.isChecked()) {
      theme = 'mbo';
    }

    return theme;
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