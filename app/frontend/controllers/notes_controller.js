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


const VerseBoxHelper = require('../helpers/verse_box_helper.js');
const verseBoxHelper = new VerseBoxHelper();
const VerseBox = require('../ui_models/verse_box.js');
const notesHelper = require('../helpers/notes_helper.js');
const i18nHelper = require('../helpers/i18n_helper.js');
const eventController = require('../controllers/event_controller.js');
const verseListController = require('../controllers/verse_list_controller.js');
require('../components/emoji_button_trigger.js');

let CodeMirror = null;
function getCodeMirror() {
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
    this.theme = this.getCurrentTheme();
    this._reset();

    eventController.subscribe('on-bible-text-loaded', (tabIndex) => {
      this.initForTab(tabIndex);
    });

    eventController.subscribe('on-tab-selected', () => {
      // When switching tabs we need to end any note editing.
      this.restoreCurrentlyEditedNotes();
    });

    eventController.subscribe('on-theme-changed', (theme) => {
      switch (theme) {
        case 'dark':
          this.setDarkTheme();
          break;

        case 'regular':
          this.setLightTheme();
          break;

        default:
          console.error('Unknown theme ' + theme);
      }
    });
  }

  initForTab(tabIndex = undefined) {
    this._reset();
    var currentVerseListFrame = verseListController.getCurrentVerseListFrame(tabIndex);
    if (currentVerseListFrame == null || currentVerseListFrame.length == 0) {
      return;
    }

    currentVerseListFrame[0].querySelectorAll('.verse-box').forEach(verseBox => {
      const verseNotes = verseBox.querySelector('.verse-notes');

      if (verseNotes != null) {
        verseNotes.classList.remove('visible');

        verseBox.querySelector('.notes-info').addEventListener('mousedown', (e) => {
          this._handleNotesIndicatorClick(e, verseNotes);
        });

        verseNotes.addEventListener('click', (event) => {
          this._handleNotesClick(event);
        });
      }
    });

    const bookNoteBox = currentVerseListFrame[0].querySelector('.book-notes');
    if (bookNoteBox) {
      bookNoteBox.addEventListener('click', (event) => {
        this._handleNotesClick(event);
      });
    }
  }

  restoreCurrentlyEditedNotes(persist = true) {
    if (persist) {
      this._saveEditorContent();
    }

    if (this.currentlyEditedNotes != null) {
      var renderedContent = this._getRenderedEditorContent(!persist);
      this._updateRenderedContent(this.currentlyEditedNotes, renderedContent);
      var currentVerseBox = this._getCurrentVerseBox();

      verseBoxHelper.iterateAndChangeAllDuplicateVerseBoxes(
        currentVerseBox, renderedContent, (changedValue, targetVerseBox) => {

          var targetNotes = null;

          if (targetVerseBox.classList.contains('book-notes')) {
            targetNotes = targetVerseBox;
          } else {
            targetNotes = targetVerseBox.querySelector('.verse-notes');
            this._refreshNotesIndicator(changedValue, targetVerseBox);
          }

          this._updateRenderedContent(targetNotes, changedValue);
        });

      this._resetVerseNoteButtons();
      if (this.currentlyEditedNotes.classList.contains('verse-notes-empty')) {
        this.currentlyEditedNotes.classList.remove('visible');
      }
    }

    this._reset();
  }

  _reset() {
    this.currentVerseReferenceId = null;
    this.currentlyEditedNotes = null;
    this.currentEditor = null;
  }

  _handleNotesClick(event) {
    var verseNotesBox = event.target.closest('.verse-notes');

    if (event.target.nodeName == 'A') {
      // If the user is clicking a link within the note ('a' element)
      // we simply return and let Electron handle the default action
      // (Link will be opened in the default browser)
      return;
    }
    event.stopPropagation();

    var verseReferenceId = null;

    if (verseNotesBox.classList.contains('book-notes')) {
      verseReferenceId = verseNotesBox.getAttribute('verse-reference-id');
    } else {
      var verseBox = verseNotesBox.closest('.verse-box');
      verseReferenceId = new VerseBox(verseBox).getVerseReferenceId();
    }

    if (verseReferenceId != this.currentVerseReferenceId) {
      this.restoreCurrentlyEditedNotes();
      this.currentVerseReferenceId = verseReferenceId;
      this.currentlyEditedNotes = verseNotesBox;
      this.currentlyEditedNotes.classList.remove('verse-notes-empty');
      this._createEditor(this.currentlyEditedNotes);
      this._setupVerseNoteButtons();
    }
  }

  _handleNotesIndicatorClick(e, verseNotes) {
    e.stopPropagation();
    e.target.closest('.notes-info').classList.toggle('active');
    this._showAndClickVerseNotes(verseNotes);
  }

  editVerseNotesForCurrentlySelectedVerse() {
    const selectedVerseBoxes = app_controller.verse_selection.selected_verse_box_elements;
    const firstVerseBox = selectedVerseBoxes[0];
    const verseNotes = firstVerseBox.querySelector('.verse-notes');
    this._showAndClickVerseNotes(verseNotes);
  }

  _showAndClickVerseNotes(verseNotes) {
    verseNotes.classList.toggle('visible');

    if (verseNotes.classList.contains('verse-notes-empty')) {
      verseNotes.dispatchEvent(new MouseEvent('click'));
    }
  }

  _getCurrentVerseBox() {
    if (this.currentVerseReferenceId == null) {
      return null;
    }

    var currentVerseListFrame = verseListController.getCurrentVerseListFrame();
    return currentVerseListFrame[0].querySelector('.verse-reference-id-' + this.currentVerseReferenceId);
  }

  _refreshNotesIndicator(noteValue, verseBox) {
    if (verseBox == null) {
      return;
    }

    var notesInfo = verseBox.querySelector('.notes-info');

    if (notesInfo != null) {
      if (noteValue != '') {
        notesInfo.classList.add('visible');
      } else {
        notesInfo.classList.remove('visible');
      }
      notesInfo.setAttribute('title', notesHelper.getTooltipText(noteValue));
    }
  }

  _updateActiveIndicator(noteValue) {
    var currentVerseBox = this._getCurrentVerseBox();
    if (currentVerseBox == null) {
      return;
    }

    var notesInfo = currentVerseBox.querySelector('.notes-info');

    if (notesInfo != null && noteValue == '') {
        notesInfo.classList.remove('active');
    }
  }

  async _saveEditorContent() {
    var currentVerseBox = this._getCurrentVerseBox();

    if (this.currentlyEditedNotes != null && currentVerseBox != null) {
      var currentNoteValue = this.currentEditor.getValue();
      var previousNoteValue = this.currentlyEditedNotes.getAttribute('notes-content');

      this._updateActiveIndicator(currentNoteValue);

      if (currentNoteValue != previousNoteValue) {
        currentNoteValue = currentNoteValue.trim();

        this.currentlyEditedNotes.setAttribute('notes-content', currentNoteValue);
        this._refreshNotesIndicator(currentNoteValue, currentVerseBox);

        var currentVerseObject = new VerseBox(currentVerseBox).getVerseObject();
        var translationId = app_controller.tab_controller.getTab().getBibleTranslationId();

        const swordModuleHelper = require('../helpers/sword_module_helper.js');
        var versification = await swordModuleHelper.getVersification(translationId);

        ipcDb.persistNote(currentNoteValue, currentVerseObject, versification).then((note) => {
          if (note != undefined) {
            var updatedTimestamp = null;

            if (currentNoteValue == "") {
              updatedTimestamp = "";
            } else {
              updatedTimestamp = note.updatedAt;
            }

            this._updateNoteDate(currentVerseBox, updatedTimestamp);

            verseBoxHelper.iterateAndChangeAllDuplicateVerseBoxes(
              currentVerseBox, { noteValue: currentNoteValue, timestamp: updatedTimestamp }, (changedValue, targetVerseBox) => {

                var currentNotes = null;

                if (targetVerseBox.classList.contains('book-notes')) {
                  currentNotes = targetVerseBox;
                } else {
                  currentNotes = targetVerseBox.querySelector('.verse-notes');
                }

                currentNotes.setAttribute('notes-content', changedValue.noteValue);
                this._updateNoteDate(targetVerseBox, changedValue.timestamp);
              });
          }
        });
      }
    }
  }

  _updateNoteDate(verseBox, dbTimestamp) {
    var localizedTimestamp = "";

    if (dbTimestamp != "") {
      localizedTimestamp = i18nHelper.getLocalizedDate(dbTimestamp);
    }

    verseBox.querySelector('.verse-notes-timestamp').innerText = localizedTimestamp;
  }

  _getRenderedEditorContent(original = false) {
    const marked = require("marked");

    var content = null;

    if (original) {
      content = this._getNotesElementContent(this.currentlyEditedNotes);
    } else {
      content = this.currentEditor.getValue();
    }

    var renderedContent = "";

    if (content != "") {
      renderedContent = marked(content);
    }

    return renderedContent;
  }

  _updateRenderedContent(notesElement, renderedContent) {
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

  _resetVerseNoteButtons() {
    var $verseNotesButtons = $(this.currentlyEditedNotes).find('.verse-notes-buttons');
    $verseNotesButtons.find('a').unbind();
    $verseNotesButtons.hide();
  }

  _setupVerseNoteButtons() {
    var $verseNotesButtons = $(this.currentlyEditedNotes).find('.verse-notes-buttons');

    $verseNotesButtons.find('a').bind('click', (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (event.currentTarget.className == 'save-note') {

        this.restoreCurrentlyEditedNotes();

      } else if (event.currentTarget.className == 'cancel-edit') {

        this.restoreCurrentlyEditedNotes(false);

      }
    });

    $verseNotesButtons.show();
  }

  _getNotesElementContent(notesElement) {
    var notesContent = "";
    if (notesElement.hasAttribute('notes-content')) {
      notesContent = notesElement.getAttribute('notes-content')
    }

    return notesContent;
  }

  _htmlToElement(html) {
    var template = document.createElement('template');
    html = html.trim(); // Never return a text node of whitespace as the result
    template.innerHTML = html;
    return template.content;
  }

  _createEditor(notesElement) {
    var CodeMirror = getCodeMirror();
    CodeMirror.commands.save = () => this.restoreCurrentlyEditedNotes();

    var notesElementText = notesElement.querySelector('.verse-notes-text');
    notesElementText.classList.add('edited');
    notesElementText.innerHTML = '';

    // FIXME: have template to be defined once and insert it with cloneNode(true)
    var textAreaTemplate = this._htmlToElement('<textarea class="editor"></textarea><emoji-button-trigger class="btn-picker"></emoji-button-trigger>');
    notesElementText.appendChild(textAreaTemplate); 

    var textAreaElement = notesElementText.querySelector('.editor');
    textAreaElement.value = this._getNotesElementContent(notesElement);

    var editor = CodeMirror.fromTextArea(textAreaElement, {
      mode: 'gfm',
      autoCloseBrackets: true,
      lineNumbers: false,
      lineWrapping: true,
      viewportMargin: Infinity,
      autofocus: true,
      extraKeys: { 
        "Enter": "newlineAndIndentContinueMarkdownList",
        "Ctrl-Enter": "save", "Cmd-Enter": () => "save", 
      },
      theme: this.theme
    });

    this.currentEditor = editor;
    this._focusEditor(true);
    notesElementText.querySelector('.btn-picker').attachEditor(editor);
  }

  _focusEditor(moveCursorToEnd=false) {
    setTimeout(() => {
      if (this.currentEditor != null) {
        this.currentEditor.refresh();
        this.currentEditor.getInputField().focus();

        if (moveCursorToEnd) {
          this.currentEditor.execCommand('goDocEnd');
        }
      }
    }, 50);
  }

  getCurrentTheme() {
    var theme = 'default';
    if (app_controller.optionsMenu._nightModeOption && app_controller.optionsMenu._nightModeOption.isChecked) {
      theme = 'mbo';
    }

    return theme;
  }

  setLightTheme() {
    this.theme = 'default';
    this._refreshTheme();
  }

  setDarkTheme() {
    this.theme = 'mbo';
    this._refreshTheme();
  }

  _refreshTheme() {
    if (this.currentEditor != null) {
      this.currentEditor.setOption("theme", this.theme);
      this._focusEditor();
    }
  }
}

module.exports = NotesController;