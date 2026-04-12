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

const eventController = require('../../../controllers/event_controller.js');
const swordModuleHelper = require('../../../helpers/sword_module_helper.js');
const { waitUntilIdle } = require('../../../helpers/ezra_helper.js');

/**
 * The StrongsOccurrencesHelper handles all Strong's occurrence-related functionality
 * for the WordStudyPanel, including fetching and rendering occurrence statistics,
 * index generation, and displaying all occurrences in a tab or popup.
 * 
 * @category Component
 */
class StrongsOccurrencesHelper {
  constructor(wordStudyPanel) {
    this._wordStudyPanel = wordStudyPanel;
  }

  /** Returns the translation id that has Strong's numbers, checking primary then secondary. */
  async getStrongsTranslation() {
    const currentBibleTranslationId = app_controller.tab_controller.getTab().getBibleTranslationId();
    const secondBibleTranslationId = app_controller.tab_controller.getTab().getSecondBibleTranslationId();

    const firstTranslationHasStrongs = await swordModuleHelper.moduleHasStrongs(currentBibleTranslationId);
    const secondTranslationHasStrongs = await swordModuleHelper.moduleHasStrongs(secondBibleTranslationId);

    if (firstTranslationHasStrongs) {
      return currentBibleTranslationId;
    } else if (secondTranslationHasStrongs) {
      return secondBibleTranslationId;
    }

    return null;
  }

  /** Returns the full occurrences HTML section for a Strong's entry, handling both Cordova and desktop paths. */
  async getOccurrencesHtml(strongsEntry) {
    const translationId = await this.getStrongsTranslation();

    if (translationId == null) {
      return '';
    }

    const indexExists = await ipcGeneral.strongsIndexExists(translationId);

    if (!indexExists) {
      return this._getIndexNotAvailableHtml(translationId);
    }

    if (platformHelper.isCordova()) {
      const occurrences = await ipcGeneral.getStrongsOccurrences(translationId, strongsEntry.key);
      const totalCount = Object.values(occurrences).reduce((sum, refs) => sum + refs.length, 0);

      return `
        <div id='strongs-occurrences-box'>
          <hr/>
          <div class='bold word-study-title' style='margin-bottom: 0.5em'>
            ${i18n.t('word-study-panel.occurrences')}
            <span class='strongs-occurrence-total'>(${totalCount})</span>
          </div>
          <div><a id='show-occurrence-stats-link' class='dictionary-content' href='#'
             data-strongs-key='${strongsEntry.key}'
             data-translation='${translationId}'>
            ${i18n.t('word-study-panel.show-occurrence-statistics')}
          </a></div>
          <div id='strongs-occurrence-stats-placeholder'></div>
          <div><a id='show-all-occurrences-link' class='dictionary-content' href='#'
             data-strongs-key='${strongsEntry.key}'
             data-translation='${translationId}'>
            ${i18n.t('word-study-panel.show-all-occurrences')}
          </a></div>
        </div>`;
    }

    const occurrences = await ipcGeneral.getStrongsOccurrences(translationId, strongsEntry.key);
    return await this._renderOccurrencesList(occurrences, strongsEntry.key, translationId);
  }

  _getIndexNotAvailableHtml(translationId) {
    return `
      <div id='strongs-occurrences-box'>
        <hr/>
        <div class='bold word-study-title' style='margin-bottom: 0.5em'>${i18n.t('word-study-panel.occurrences')}</div>
        <div class='dictionary-content'>
          <p>${i18n.t('word-study-panel.index-not-available', { translation: translationId })}</p>
          <button id='generate-strongs-index-button'
                  class='fg-button ui-corner-all ui-state-default'
                  data-translation='${translationId}'>
            ${i18n.t('word-study-panel.generate-index')}
          </button>
        </div>
      </div>`;
  }

  async _renderOccurrencesList(occurrences, strongsKey, translationId=null) {
    const books = Object.keys(occurrences);

    if (books.length === 0) {
      return '';
    }

    if (translationId == null) {
      translationId = await this.getStrongsTranslation();
    }

    const i18nHelper = require('../../../helpers/i18n_helper.js');

    let totalCount = 0;
    let listItems = '';

    for (const book of books) {
      const count = occurrences[book].length;
      totalCount += count;

      const longTitle = await ipcDb.getBookLongTitle(book);
      const localizedName = await i18nHelper.getSwordTranslation(longTitle);

      listItems += `<tr>
        <td class='strongs-occurrence-book'>${localizedName}</td>
        <td class='strongs-occurrence-count'>${count}</td>
      </tr>`;
    }

    return `
      <div id='strongs-occurrences-box'>
        <hr/>
        <div class='bold word-study-title' style='margin-bottom: 0.5em'>
          ${i18n.t('word-study-panel.occurrences')}
          <span class='strongs-occurrence-total'>(${totalCount})</span>
        </div>
        <div><a id='show-occurrence-stats-link' class='dictionary-content' href='#'>${i18n.t('word-study-panel.show-occurrence-statistics')}</a></div>
        <table class='strongs-occurrence-list dictionary-content' style='display: none;'>
          ${listItems}
        </table>
        <div><a id='show-all-occurrences-link' class='dictionary-content' href='#'
           data-strongs-key='${strongsKey}'
           data-translation='${translationId}'>
          ${i18n.t('word-study-panel.show-all-occurrences')}
        </a></div>
      </div>`;
  }

  async _loadOccurrenceStats(showStatsLink) {
    const strongsKey = showStatsLink.getAttribute('data-strongs-key');
    const translationId = showStatsLink.getAttribute('data-translation');

    showStatsLink.style.display = 'none';

    const placeholder = document.getElementById('strongs-occurrence-stats-placeholder');
    if (placeholder) {
      placeholder.innerHTML = `<loading-indicator style="display: inline-block; width: 4em; height: 1.2em; vertical-align: middle;"></loading-indicator>`;
    }

    const occurrences = await ipcGeneral.getStrongsOccurrences(translationId, strongsKey);
    const books = Object.keys(occurrences);

    if (books.length === 0) {
      if (placeholder) placeholder.innerHTML = '';
      return;
    }

    const i18nHelper = require('../../../helpers/i18n_helper.js');

    let listItems = '';

    for (const book of books) {
      const count = occurrences[book].length;

      const longTitle = await ipcDb.getBookLongTitle(book);
      const localizedName = await i18nHelper.getSwordTranslation(longTitle);

      listItems += `<tr>
        <td class='strongs-occurrence-book'>${localizedName}</td>
        <td class='strongs-occurrence-count'>${count}</td>
      </tr>`;
    }

    if (placeholder) {
      placeholder.innerHTML = `<table class='strongs-occurrence-list dictionary-content'>${listItems}</table>`;
    }
  }

  /** Attaches click handlers for the occurrence stats link, generate-index button, and show-all link. */
  attachOccurrencesEventHandlers() {
    const panelContent = this._wordStudyPanel.wordStudyPanelContent[0];

    let generateIndexButton = panelContent.querySelector('#generate-strongs-index-button');
    if (generateIndexButton != null) {
      generateIndexButton.addEventListener('click', () => {
        this.handleGenerateIndex(generateIndexButton);
      });
    }

    let showStatsLink = panelContent.querySelector('#show-occurrence-stats-link');
    if (showStatsLink != null) {
      showStatsLink.addEventListener('click', async (event) => {
        event.preventDefault();

        const table = panelContent.querySelector('.strongs-occurrence-list');
        if (table) {
          // Table already rendered (desktop, or Cordova after index generation) — just show it
          table.style.display = '';
          showStatsLink.style.display = 'none';
        } else if (platformHelper.isCordova()) {
          // Cordova: table not yet loaded — fetch and render on demand
          await this._loadOccurrenceStats(showStatsLink);
        }
      });
    }

    let showAllLink = panelContent.querySelector('#show-all-occurrences-link');
    if (showAllLink != null) {
      showAllLink.addEventListener('click', (event) => {
        event.preventDefault();
        const strongsKey = showAllLink.getAttribute('data-strongs-key');
        const translationId = showAllLink.getAttribute('data-translation');
        this.showAllOccurrences(strongsKey, translationId);
      });
    }
  }

  /** Triggers Strong's index generation with a progress bar and re-renders occurrences on completion. */
  async handleGenerateIndex(button) {
    const translationId = button.getAttribute('data-translation');
    const occurrencesBox = document.getElementById('strongs-occurrences-box');

    if (occurrencesBox == null) {
      return;
    }

    occurrencesBox.innerHTML = `
      <hr/>
      <div class='bold word-study-title' style='margin-bottom: 0.5em'>${i18n.t('word-study-panel.occurrences')}</div>
      <div class='dictionary-content'>
        <div id='strongs-index-progress-bar' class='progress-bar'>
          <div class='progress-label'>0%</div>
        </div>
      </div>`;

    const $progressBar = $('#strongs-index-progress-bar');
    uiHelper.initProgressBar($progressBar);

    await ipcGeneral.generateStrongsIndex(translationId, (progress) => {
      $progressBar.progressbar("value", progress.totalPercent);
    });

    const currentStrongsEntry = this._wordStudyPanel.currentStrongsEntry;
    if (currentStrongsEntry != null) {
      const occurrences = await ipcGeneral.getStrongsOccurrences(translationId, currentStrongsEntry.key);
      occurrencesBox.outerHTML = await this._renderOccurrencesList(occurrences, currentStrongsEntry.key, translationId);
      this.attachOccurrencesEventHandlers();
    }
  }

  /** Opens all occurrences of a Strong's key in either a new tab or a popup dialog. */
  async showAllOccurrences(strongsKey, translationId) {
    const occurrences = await ipcGeneral.getStrongsOccurrences(translationId, strongsKey);
    const books = Object.keys(occurrences);

    if (books.length === 0) {
      return;
    }

    // Convert index data to OSIS references
    const xrefs = [];
    for (const book of books) {
      for (const ref of occurrences[book]) {
        const [chapter, verse] = ref.split(':');
        xrefs.push(`${book}.${chapter}.${verse}`);
      }
    }

    const xrefTitle = `${strongsKey} \u2014 ${i18n.t('word-study-panel.occurrences')}`;
    const openInNewTab = app_controller.optionsMenu._verseListNewTabOption.isChecked;

    if (openInNewTab) {
      await this._showOccurrencesInTab(xrefs, xrefTitle, strongsKey, translationId);
    } else {
      await this._showOccurrencesInPopup(xrefs, xrefTitle, strongsKey);
    }
  }

  async _showOccurrencesInTab(xrefs, xrefTitle, strongsKey, translationId) {
    app_controller.tab_controller.saveTabScrollPosition();
    app_controller.tab_controller.addTab(undefined, false, translationId);

    await app_controller.openXrefVerses(null, xrefTitle, xrefs);

    const tabIndex = app_controller.tab_controller.getSelectedTabIndex();
    await eventController.publishAsync('on-tab-selected', tabIndex);

    await waitUntilIdle();
    this._highlightStrongsInVerseList(strongsKey);
  }

  async _showOccurrencesInPopup(xrefs, xrefTitle, strongsKey) {
    const popup = app_controller.verse_list_popup;

    if (!popup.dialogInitDone) {
      popup.dialogInitDone = true;
      popup.initVerseListPopup();
    }

    popup.currentReferenceType = 'XREFS';
    popup.currentXrefs = xrefs;
    popup.currentPopupTitle = xrefTitle;
    popup.currentReferenceVerseBox = null;
    popup.currentStrongsKey = strongsKey;

    const dialogOptions = { title: xrefTitle };
    if (!platformHelper.isMobile()) {
      dialogOptions.width = uiHelper.getMaxDialogWidth();
    }

    $('#verse-list-popup').dialog(dialogOptions);

    popup.toggleBookFilter('XREFS');
    popup.getNewTabButton().removeClass('ui-state-active');
    popup.getNewTabButton().hide();
    $('#verse-list-popup-verse-list').hide();
    $('#verse-list-popup-verse-list').empty();
    $('#verse-list-popup-loading-indicator').find('.loader').show();
    $('#verse-list-popup-loading-indicator').show();
    document.getElementById('verse-list-popup-loading-indicator-message').innerText = i18n.t('bible-browser.loading-verses');
    $('#verse-list-popup').dialog("open");

    const currentTabId = app_controller.tab_controller.getSelectedTabId();
    const currentTabIndex = app_controller.tab_controller.getSelectedTabIndex();

    await app_controller.text_controller.requestVersesForXrefs(
      currentTabIndex,
      currentTabId,
      xrefs,
      (htmlVerses, verseCount) => {
        const currentTab = app_controller.tab_controller.getTab(currentTabIndex);
        const currentTranslationId = currentTab.getBibleTranslationId();
        swordModuleHelper.moduleIsRTL(currentTranslationId).then((rtl) => {
          popup.renderVerseListInPopup(htmlVerses, verseCount, rtl);

          // Highlight Strong's words in popup
          const popupVerseList = document.getElementById('verse-list-popup-verse-list');
          const verses = popupVerseList.querySelectorAll('.verse-text');
          const verseSearch = app_controller.module_search_controller.verseSearch;

          for (let i = 0; i < verses.length; i++) {
            verseSearch.doVerseSearch(verses[i], strongsKey, 'strongsNumber');
          }
        });
      },
      'html',
      false
    );
  }

  _highlightStrongsInVerseList(strongsKey) {
    const verseListController = require('../../../controllers/verse_list_controller.js');
    const currentVerseList = verseListController.getCurrentVerseList();
    const verses = currentVerseList[0].querySelectorAll('.verse-text');
    const verseSearch = app_controller.module_search_controller.verseSearch;

    for (let i = 0; i < verses.length; i++) {
      verseSearch.doVerseSearch(verses[i], strongsKey, 'strongsNumber');
    }
  }
}

module.exports = StrongsOccurrencesHelper;
