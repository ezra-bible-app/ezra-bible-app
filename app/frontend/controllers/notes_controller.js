/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2026 Ezra Bible App Development Team <contact@ezrabibleapp.net>

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
const PlatformHelper = require('../../lib/platform_helper.js');
const { showDialog, sleep } = require('../helpers/ezra_helper.js');
require('../components/emoji_button_trigger.js');

let CodeMirror = null;
function getCodeMirror() {
  if (CodeMirror == null) {
    CodeMirror = require('codemirror/lib/codemirror.js');
    require("codemirror/mode/markdown/markdown.js");
    require("codemirror/mode/gfm/gfm.js");
    require("codemirror/mode/htmlmixed/htmlmixed.js");
    require("codemirror/addon/edit/continuelist.js");
    require("codemirror/addon/mode/overlay.js");
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
    this._platformHelper = new PlatformHelper();
    this.currentlyEditedNotes = null;
    this.currentNoteIsTagNote = false;
    this.clickEventHappened = false;
    this._reset();

    eventController.subscribe('on-bible-text-loaded', (tabIndex) => {
      this.initForTab(tabIndex);
    });

    eventController.subscribe('on-tab-selected', () => {
      // When switching tabs we need to end any note editing.
      this.restoreCurrentlyEditedNotes();
    });

    eventController.subscribe('on-body-clicked', () => {
      // When clicking outside of the notes editor we need to end any note editing.
      // But only if the click event was not triggered just before.
      if (!this.clickEventHappened) {
        this.restoreCurrentlyEditedNotes();
      }
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
          e.stopPropagation();
          this._handleNotesIndicatorClick(e, verseNotes);
        });

        verseNotes.addEventListener('click', (event) => {
          this.currentNoteIsTagNote = false;
          this.isFullScreen = false;
          this._handleNotesClick(event);
        });
      }
    });

    currentVerseListFrame[0].querySelectorAll('.notes-fullscreen-button').forEach(fullscreenButton => {
      fullscreenButton.addEventListener('click', (event) => {
        event.stopPropagation();
        event.preventDefault();

        this._handleFullscreenButtonClick(event);
      });
    });

    const bookNoteBox = currentVerseListFrame[0].querySelector('.book-notes');
    if (bookNoteBox) {
      bookNoteBox.addEventListener('click', (event) => {
        this.currentNoteIsTagNote = false;
        this.isFullScreen = false;
        this._handleNotesClick(event);
      });
    }

    const tagIntroNoteBox = currentVerseListFrame[0].querySelector('.tag-intro-notes');
    if (tagIntroNoteBox) {
      tagIntroNoteBox.addEventListener('click', (event) => {
        this.currentNoteIsTagNote = true;
        this.isFullScreen = false;
        this._handleNotesClick(event);
      });
    }

    const tagConclusionNoteBox = currentVerseListFrame[0].querySelector('.tag-conclusion-notes');
    if (tagConclusionNoteBox) {
      tagConclusionNoteBox.addEventListener('click', (event) => {
        this.currentNoteIsTagNote = true;
        this.isFullScreen = false;
        this._handleNotesClick(event);
      });
    }
  }

  async restoreCurrentlyEditedNotes(persist = true) {
    if (persist) {

      if (this._platformHelper.isCordova()) {
        // There is an issue on Android that makes CodeMirror behave weirdly.
        // This leads to the last word of the text being cut off after adding text,
        // unless the user has already typed a space or . character. 
        // See https://github.com/codemirror/codemirror5/issues/5244
        // To work around this issue, we fire the compositionend event before saving the editor content.
        // This will force CodeMirror to properly save the editor lines.

        if (this.currentlyEditedNotes != null) {
          let codeMirrorLines = this.currentlyEditedNotes.querySelector('.CodeMirror-code');
          codeMirrorLines.dispatchEvent(new Event('compositionend'));

          // We need to wait a little bit, so that CodeMirror has a chance to respond.
          await sleep(100);
        }
      }
      
      var success = await this._saveEditorContent();
      if (success == false) {
        return;
      }
    }

    this._renderContent(!persist);
    this._reset();
  }

  _renderContent(original=false) {
    if (this.currentlyEditedNotes != null) {
      var renderedContent = this._getRenderedEditorContent(original);
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
  }

  _reset() {
    this.currentReferenceId = null;
    this.currentlyEditedNotes = null;
    this.currentEditor = null;
  }

  async _handleNotesClick(event, text=null) {
    this.clickEventHappened = true;
    setTimeout(() => {
      this.clickEventHappened = false;
    }, 200);

    app_controller.hideAllMenus();

    if (event.target.nodeName == 'A') {
      // If the user is clicking a link within the note ('a' element)
      // we simply return and let the platform handle the default action
      // (Link will be opened in the default browser)
      return;
    }
    event.stopPropagation();

    var referenceId = null;
    var verseNotesBox = event.target.closest('.verse-notes');

    if (verseNotesBox == null) {
      return;
    }

    if (verseNotesBox.classList.contains('book-notes')) {
      referenceId = verseNotesBox.getAttribute('verse-reference-id');
    } else if (verseNotesBox.classList.contains('tag-intro-notes') || verseNotesBox.classList.contains('tag-conclusion-notes')) {
      referenceId = verseNotesBox.getAttribute('notes-id');
    } else {
      var verseBox = verseNotesBox.closest('.verse-box');
      referenceId = new VerseBox(verseBox).getVerseReferenceId();
    }

    if (referenceId != this.currentReferenceId) {
      await this.restoreCurrentlyEditedNotes();
      this.currentReferenceId = referenceId;
      this.currentlyEditedNotes = verseNotesBox;
      this.currentlyEditedNotes.classList.remove('verse-notes-empty');
      this._createEditor(this.currentlyEditedNotes, text);
      this._setupVerseNoteButtons();
    }
  }

  _handleNotesIndicatorClick(e, verseNotes) {
    e.stopPropagation();
    e.target.closest('.notes-info').classList.toggle('active');
    this._showAndClickVerseNotes(verseNotes);
  }

  _handleFullscreenButtonClick(event=null, verseNotes=null) {
    let fullscreenButtonIcon = null;

    if (verseNotes == null) {
      verseNotes = event.target.closest('.verse-notes');
      fullscreenButtonIcon = event.target.closest('.notes-fullscreen-button').querySelector('i');
    } else {
      fullscreenButtonIcon = verseNotes.parentNode.querySelector('.notes-fullscreen-button').querySelector('i');
    }

    if (verseNotes) {
      let currentNotes = this.currentEditor.getValue();

      this.restoreCurrentlyEditedNotes(false);

      verseNotes.classList.toggle('verse-notes-fullscreen');

      if (verseNotes.classList.contains('verse-notes-fullscreen')) {
        fullscreenButtonIcon.classList.remove('fa-expand');
        fullscreenButtonIcon.classList.add('fa-compress');

        this.isFullScreen = true;

      } else {
        fullscreenButtonIcon.classList.remove('fa-compress');
        fullscreenButtonIcon.classList.add('fa-expand');

        this.isFullScreen = false;
      }

      if (event != null) {
        this._handleNotesClick(event, currentNotes);
      }
    }
  }

  editVerseNotesForCurrentlySelectedVerse() {
    const selectedVerseBoxes = app_controller.verse_selection.getSelectedVerseBoxes();
    const firstVerseBox = selectedVerseBoxes[0];

    if (firstVerseBox != null) {
      const verseNotes = firstVerseBox.querySelector('.verse-notes');
      this._showAndClickVerseNotes(verseNotes);
    }
  }

  deleteVerseNotesForCurrentlySelectedVerse() {
    const selectedVerseBoxes = app_controller.verse_selection.getSelectedVerseBoxes();
    const firstVerseBox = selectedVerseBoxes[0];

    if (firstVerseBox != null) {
      const verseNotes = firstVerseBox.querySelector('.verse-notes');
      this._deleteVerseNotes(verseNotes);
    }
  }

  _showAndClickVerseNotes(verseNotes) {
    verseNotes.classList.toggle('visible');

    if (verseNotes.classList.contains('verse-notes-empty')) {
      verseNotes.dispatchEvent(new MouseEvent('click'));
    }
  }

  async _deleteVerseNotes(verseNotes) {
    this.currentReferenceId = verseNotes.closest('.verse-box').getAttribute('verse-reference-id');
    this.currentlyEditedNotes = verseNotes;
    await this._saveEditorContent("");
    this._renderContent(true);
    this._reset();
  }

  _getCurrentVerseBox() {
    if (this.currentReferenceId == null) {
      return null;
    }

    var currentVerseListFrame = verseListController.getCurrentVerseListFrame();
    return currentVerseListFrame[0].querySelector('.verse-reference-id-' + this.currentReferenceId);
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

  async _saveEditorContent(newNoteValue=null) {
    let currentVerseBox = this._getCurrentVerseBox();

    if (this.currentlyEditedNotes != null && (currentVerseBox != null && !this.currentNoteIsTagNote || this.currentNoteIsTagNote)) {
      if (newNoteValue == null) {
        newNoteValue = this.currentEditor.getValue();
      }

      let previousNoteValue = this.currentlyEditedNotes.getAttribute('notes-content');

      this._updateActiveIndicator(newNoteValue);

      if (newNoteValue != previousNoteValue) {
        newNoteValue = newNoteValue.trim();
        let translationId = app_controller.tab_controller.getTab().getBibleTranslationId();

        const swordModuleHelper = require('../helpers/sword_module_helper.js');
        let versification = await swordModuleHelper.getVersification(translationId);
        let result = null;
        let currentTabNoteFileId = await app_controller.tab_controller.getCurrentTabNoteFileId();

        if (!this.currentNoteIsTagNote) {
          if (currentVerseBox != null) {
            let verseBoxModel = new VerseBox(currentVerseBox);
            let currentVerseObject = await verseBoxModel.getVerseObject();

            result = await ipcDb.persistNote(newNoteValue,
                                             currentVerseObject,
                                             versification,
                                             currentTabNoteFileId);
          }
        } else {
          let tagId = this.currentlyEditedNotes.getAttribute('tag-id');

          if (this.currentlyEditedNotes.classList.contains('tag-intro-notes')) {
            result = await ipcDb.persistTagNoteIntroduction(tagId, newNoteValue);
          } else if (this.currentlyEditedNotes.classList.contains('tag-conclusion-notes')) {
            result = await ipcDb.persistTagNoteConclusion(tagId, newNoteValue);
          }
        }

        if (result != null && result.success == false) {
          let message = `The note could not be saved.<br>
                        An unexpected database error occurred:<br><br>
                        ${result.exception}<br><br>
                        Please restart the app.`;

          await showDialog('Database Error', message);
          this._focusEditor();
          return false;
        }

        if (this.currentlyEditedNotes != null) {
          this.currentlyEditedNotes.setAttribute('notes-content', newNoteValue);
        }

        this._refreshNotesIndicator(newNoteValue, currentVerseBox);

        let note = result.dbObject;

        if (note != undefined) {
          let updatedTimestamp = null;

          if (newNoteValue == "") {
            updatedTimestamp = "";
          } else {
            if (this.currentNoteIsTagNote) {
              if (this.currentlyEditedNotes.classList.contains('tag-intro-notes')) {
                updatedTimestamp = note.introductionUpdatedAt;
              } else if (this.currentlyEditedNotes.classList.contains('tag-conclusion-notes')) {
                updatedTimestamp = note.conclusionUpdatedAt;
              }

            } else {
              updatedTimestamp = note.updatedAt;
            }
          }

          if (this.currentNoteIsTagNote) {
            this._updateNoteDate(this.currentlyEditedNotes, updatedTimestamp);
          }

          if (currentVerseBox != null) {
            this._updateNoteDate(currentVerseBox, updatedTimestamp);

            verseBoxHelper.iterateAndChangeAllDuplicateVerseBoxes(
              currentVerseBox, { noteValue: newNoteValue, timestamp: updatedTimestamp }, (changedValue, targetVerseBox) => {

                let currentNotes = null;

                if (targetVerseBox.classList.contains('book-notes')) {
                  currentNotes = targetVerseBox;
                } else {
                  currentNotes = targetVerseBox.querySelector('.verse-notes');
                }

                if (currentNotes != null) {
                  currentNotes.setAttribute('notes-content', changedValue.noteValue);
                  this._updateNoteDate(targetVerseBox, changedValue.timestamp);
                }
              }
            );
          }
        }
      }

      if (newNoteValue != "") {
        await eventController.publishAsync('on-note-created');
      } else {
        await eventController.publishAsync('on-note-deleted');
      }
    }

    return true;
  }

  _updateNoteDate(container, dbTimestamp) {
    var localizedTimestamp = "";

    if (dbTimestamp != "") {
      localizedTimestamp = i18nHelper.getLocalizedDate(dbTimestamp);
    }

    container.querySelector('.verse-notes-timestamp').innerText = localizedTimestamp;
  }

  _getRenderedEditorContent(original = false) {
    var content = null;

    if (original) {
      content = this._getNotesElementContent(this.currentlyEditedNotes);
    } else {
      content = this.currentEditor.getValue();
    }

    var renderedContent = "";

    if (content != "") {
      renderedContent = notesHelper.renderNotes(content);
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

      this.currentlyEditedNotes.classList.remove('verse-notes-fullscreen');
      const fullscreenButtonIcon = this.currentlyEditedNotes.querySelector('.notes-fullscreen-button i');
      fullscreenButtonIcon.classList.remove('fa-compress');
      fullscreenButtonIcon.classList.add('fa-expand');

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
      notesContent = notesElement.getAttribute('notes-content');
    }

    return notesContent;
  }

  _htmlToElement(html) {
    var template = document.createElement('template');
    html = html.trim(); // Never return a text node of whitespace as the result
    template.innerHTML = html;
    return template.content;
  }

  _createEditor(notesElement, text=null) {
    var CodeMirror = getCodeMirror();
    CodeMirror.commands.save = () => this.restoreCurrentlyEditedNotes();

    var notesElementText = notesElement.querySelector('.verse-notes-text');
    notesElementText.classList.add('edited');
    notesElementText.innerHTML = '';

    // FIXME: have template to be defined once and insert it with cloneNode(true)
    var textAreaTemplate = this._htmlToElement('<textarea class="editor"></textarea><emoji-button-trigger class="btn-picker"></emoji-button-trigger>');
    notesElementText.appendChild(textAreaTemplate); 

    var textAreaElement = notesElementText.querySelector('.editor');

    let notesContent = this._getNotesElementContent(notesElement);
    if (text != null) {
      notesContent = text;
    }

    textAreaElement.value = notesContent;

    var editor = CodeMirror.fromTextArea(textAreaElement, {
      mode: 'gfm',
      autoCloseBrackets: true,
      lineNumbers: false,
      lineWrapping: true,
      viewportMargin: Infinity,
      autofocus: true,
      extraKeys: { 
        "Enter": "newlineAndIndentContinueMarkdownList",
        "Ctrl-Enter": "save",
        "Cmd-Enter": "save",
        "Esc": () => {
          // Differentiate between fullscreen and regular mode
          // In fullscreen mode, the escape key should close the fullscreen mode
          // In regular mode, the escape key should cancel the note editing and close the editor

          if (this.currentlyEditedNotes.classList.contains('verse-notes-fullscreen')) {
            this._handleFullscreenButtonClick(null, this.currentlyEditedNotes);
          } else {
            this.restoreCurrentlyEditedNotes(false);
          }
        }
      },
      theme: this.theme
    });

    this.currentEditor = editor;

    if (this.isFullScreen) {
      this.currentEditor.getWrapperElement().style.height = window.innerHeight * 0.85 + 'px';
    } else {
      this.currentEditor.getWrapperElement().style.removeProperty('height');
    }

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