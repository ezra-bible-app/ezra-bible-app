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

const Mousetrap = require('mousetrap');
const exportController = require('./export_controller.js');
const exportHelper = require('../../helpers/export_helper.js');
const { html } = require('../../helpers/ezra_helper.js');
const swordHelper = require('../../helpers/sword_module_helper.js');
const verseListTitleHelper = require('../../helpers/verse_list_title_helper.js');

/**
 * The DocxExport component implements the export of tagged verses or verses and notes into a Word (docx) document.
 * 
 * @category Component
 */
class DocxExport {

  enableExportButton(tabIndex, type='TAGGED_VERSES') {
    var currentVerseListMenu = app_controller.getCurrentVerseListMenu(tabIndex);
    var exportButton = currentVerseListMenu.find('.export-docx-button');

    exportButton.removeClass('ui-state-disabled');
    exportButton.unbind('click');
    exportButton.bind('click', (event) => {
      if (!event.target.closest('.fg-button').classList.contains('ui-state-disabled')) {
        this._runExport(type);
      }
    });
    exportButton.css('display', 'flex');
    exportButton.removeClass('events-configured');
    uiHelper.configureButtonStyles('.verse-list-menu');
  }

  disableExportButton(tabIndex=undefined) {
    if (tabIndex !== undefined) {
      const currentVerseListMenu = app_controller.getCurrentVerseListMenu(tabIndex);
      currentVerseListMenu.find('.export-docx-button').addClass('ui-state-disabled');
    } else {
      $('.export-docx-button').addClass('ui-state-disabled');
    }
  }

  /**
   * exports to Word
   * @param {'BOOK_NOTES'|'TAGGED_VERSES'|'TAGGED_VERSES_WITH_NOTES'} type 
   */
  async _runExport(type) {
    /**@type {import('../../ui_models/tab')} */
    const currentTab = app_controller.tab_controller.getTab();
    const translationId = currentTab.getBibleTranslationId();

    if (!(await swordHelper.isPublicDomain(translationId)) && !(await agreeDisclaimerDialog(translationId))) {
      return;
    }
    
    var fileName;
    var isInstantLoadingBook = false;

    if (type === 'TAGGED_VERSES' || type === 'TAGGED_VERSES_WITH_NOTES') {
      fileName = getUnixTagTitleList(currentTab);
    } else if (type === 'BOOK_NOTES') {
      isInstantLoadingBook = await app_controller.translation_controller.isInstantLoadingBook(translationId, null, currentTab.getBook());
      fileName = currentTab.getBookTitle() + (isInstantLoadingBook ? '' : `_${currentTab.getChapter()}`);
    } else {
      console.log('Unrecognized export type:', type);
      return;
    }
    
    var dialogTitle = i18n.t("tags.export-tagged-verse-list");

    const filePath = await exportHelper.showSaveDialog(fileName, 'docx', dialogTitle);
    if (filePath) {
      if (type === 'TAGGED_VERSES') {
        renderTaggedVersesForExport(currentTab, filePath);
      } else if (type === 'TAGGED_VERSES_WITH_NOTES') {
        renderTaggedVersesWithNotesForExport(currentTab, filePath);
      } else if (type === 'BOOK_NOTES') {
        renderBookNotesForExport(currentTab, isInstantLoadingBook, filePath);
      }
    }
  }
}

module.exports = DocxExport;

function renderTaggedVersesForExport(currentTab, filePath) {
  const currentTagIdList = currentTab.getTagIdList();
  
  const currentTagTitleList = currentTab.getTagTitleList();
  const title = `${i18n.t("tags.verses-tagged-with")}_${currentTagTitleList}_`;

  app_controller.text_controller.requestVersesForSelectedTags(
    undefined,
    null,
    currentTagIdList,
    (verses, bibleBooks) => { 
      exportController.saveWordDocument(filePath, title, verses, 'tagged-verses', bibleBooks); 
    },
    'docx',
    false
  );
}

function renderTaggedVersesWithNotesForExport(currentTab, filePath) {
  const currentTagIdList = currentTab.getTagIdList();
  const currentTagTitleList = currentTab.getTagTitleList();
  const title = currentTagTitleList;

  app_controller.text_controller.requestVersesForSelectedTags(
    undefined,
    null,
    currentTagIdList,
    async (verses, bibleBooks, verseTags, verseNotes) => {
      const firstTagId = parseInt(currentTagIdList.split(',')[0]);
      const tagNote = await ipcDb.getTagNote(firstTagId);

      const notes = {
        introduction: tagNote ? tagNote.introduction : "",
        conclusion: tagNote ? tagNote.conclusion : "",
        ...verseNotes
      };

      exportController.saveWordDocument(filePath, title, verses, 'tagged-verses-with-notes', bibleBooks, notes);
    },
    'docx',
    false
  );
}

function renderBookNotesForExport(currentTab, isWholeBook, filePath) {
  app_controller.text_controller.requestNotesForExport(
    undefined,
    currentTab.getBook(),
    isWholeBook ? null : currentTab.getChapter(),
    (verses, notes) => {
      const title = currentTab.getBookTitle() + (isWholeBook ? '' : ` ${currentTab.getChapter()}`);
      exportController.saveWordDocument(filePath, title, verses, 'book-notes', undefined, notes);
    },
    'docx'
  );
}

function getUnixTagTitleList(currentTab) {
  var currentTagTitleList = currentTab.getTagTitleList();
  const andMore = i18n.t('general.and-more');
  currentTagTitleList = verseListTitleHelper.shortenTitleList(currentTagTitleList, andMore);

  var unixTagTitleList = currentTagTitleList.replace(/, /g, "__");
  unixTagTitleList = unixTagTitleList.replace(/ /g, "_");

  // Eliminate all special characters in the tag title list
  var specialCharacters = /[',;:()[\]{}=+\-?/"><|@*~#$%§!^°&`]/g;
  unixTagTitleList = unixTagTitleList.replace(specialCharacters, "");

  return unixTagTitleList;
}

async function agreeDisclaimerDialog(moduleId) {

  const module_name = `<strong>${await swordHelper.getModuleFullName(moduleId)}</strong>`;
  const copyright = await swordHelper.getModuleCopyright(moduleId);

  const dialogBoxTemplate = html`
  <div id="module-disclaimer">
    <div id="module-disclaimer-content" style="margin-right: 0.5em;">
      <p>${i18n.t("general.module-copyright-intro", {module_name})}</p>
      ${copyright ? `<p class="external">${copyright}</p>` : ''}
      <details ${!copyright ? 'open' : ''} style="margin-left: 1em;">
        <summary>${i18n.t('general.more-info')}</summary>
        ${await swordHelper.getModuleAbout(moduleId)}
      </details>
      <p>${i18n.t("general.module-copyright-disclaimer", {module_name})}</p>
    </div>
  </div>
  `;

  return new Promise((resolve) => {

    document.querySelector('#boxes').appendChild(dialogBoxTemplate.content);
    const $dialogBox = $('#module-disclaimer');
    
    var agreed = false;
    const width = 640;
    const height = 360;
    const offsetLeft = ($(window).width() - width)/2;

    var buttons = {};
    buttons[i18n.t('general.cancel')] = function() {
      $(this).dialog('close');
    };
    buttons[i18n.t('general.export')] = function() {
      agreed = true;
      $(this).dialog('close');
    };

    const title = i18n.t('menu.export') + ' &mdash; ' + i18n.t('general.module-copyright');

    Mousetrap.bind('esc', () => { $dialogBox.dialog("close"); });
  
    $dialogBox.dialog({
      width,
      height,
      position: [offsetLeft, 120],
      title: title,
      resizable: false,
      dialogClass: 'ezra-dialog',
      buttons: buttons,
      close() {
        $dialogBox.dialog('destroy');
        $dialogBox.remove();
        resolve(agreed);
      }
    });
  });
}