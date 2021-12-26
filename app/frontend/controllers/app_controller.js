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

const Mousetrap = require('mousetrap');
const { getPlatform } = require('../helpers/ezra_helper.js');

const VerseBoxHelper = require("../helpers/verse_box_helper.js");
const VerseSelection = require("../components/verse_selection.js");
const VerseListPopup = require("../components/verse_list_popup.js");
const TagSelectionMenu = require("../components/tags/tag_selection_menu.js");
const AssignLastTagButton = require("../components/tags/assign_last_tag_button.js");
const TagStatistics = require("../components/tags/tag_statistics.js");
const DocxExport = require("../components/docx_export/docx_export.js");
const ModuleSearchController = require("./module_search_controller.js");
const TranslationController = require("./translation_controller.js");
const TextController = require("./text_controller.js");
const VerseContextController = require("./verse_context_controller.js");
const TabSearch = require("../components/tab_search/tab_search.js");
const TabController = require("./tab_controller.js");
const OptionsMenu = require("../components/options_menu/options_menu.js");
const NavigationPane = require("../components/navigation_pane.js");
const TranslationComparison = require("../components/translation_comparison.js");
const BookSelectionMenu = require("../components/book_selection_menu.js");
const DictionaryController = require("./dictionary_controller.js");
const NotesController = require("./notes_controller.js");
const SwordNotes = require("../components/sword_notes.js");
const InfoPopup = require("../components/info_popup.js");
const TextSizeSettings = require("../components/text_size_settings.js");
const VerseStatisticsChart = require('../components/verse_statistics_chart.js');
const verseListController = require('../controllers/verse_list_controller.js');
const referenceVerseController = require('../controllers/reference_verse_controller.js');
const { waitUntilIdle } = require('../helpers/ezra_helper.js');
const eventController = require('../controllers/event_controller.js');
const wheelnavController = require('../controllers/wheelnav_controller.js');
const fullscreenController = require('../controllers/fullscreen_controller.js');
const cacheController = require('./cache_controller.js');

/**
 * AppController is Ezra Bible App's main controller class which initiates all other controllers and components.
 * It is only instantiated once and an instance is available at `global.app_controller`.
 * 
 * @category Controller
 */
class AppController {
  constructor() {
    this.book_menu_is_opened = false;
    this.current_cr_verse_id = null;
  }

  /**
   * This function is a "macro" for instantiating a component as a member of AppController.
   * 
   * @param {String} componentClassName The class name of the component 
   * @param {String} componentName The variable name that this component shall get within the AppController instance
   * @param {String} componentPath The path to the component js file
   */
  init_component(componentClassName, componentName) {
    var expression = "";
    expression += "this." + componentName + " = new " + componentClassName + "();";
    eval(expression);
  }

  async init() {
    this.tabHtmlTemplate = $($('.verse-list-container')[0]).html();

    this.init_component("VerseBoxHelper", "verse_box_helper");
    this.init_component("VerseSelection", "verse_selection");
    this.init_component("TagSelectionMenu", "tag_selection_menu");
    this.init_component("TagStatistics", "tag_statistics");
    this.init_component("AssignLastTagButton", "assign_last_tag_button");
    this.init_component("ModuleSearchController", "module_search_controller");
    this.init_component("TranslationController", "translation_controller");
    this.init_component("TextController", "text_controller");
    this.init_component("DocxExport", "docxExport");
    this.init_component("VerseContextController", "verse_context_controller");
    this.init_component("TabController", "tab_controller");
    this.init_component("OptionsMenu", "optionsMenu");
    this.init_component("NavigationPane", "navigation_pane");
    this.init_component("TranslationComparison", "translationComparison");
    this.init_component("BookSelectionMenu", "book_selection_menu");
    this.init_component("VerseListPopup", "verse_list_popup");
    this.init_component("DictionaryController", "dictionary_controller");
    this.init_component("NotesController", "notes_controller");
    this.init_component("SwordNotes", "sword_notes");
    this.init_component("InfoPopup", "info_popup");
    this.init_component("TextSizeSettings", "textSizeSettings");
    this.init_component("VerseStatisticsChart", "verse_statistics_chart");

    /**@type {import('../components/module_assistant/module_assistant')} */
    this.moduleAssistant = document.querySelector('module-assistant');

    this.initGlobalShortCuts();

    await this.book_selection_menu.init();

    var bibleTranslations = await ipcNsi.getAllLocalModules();
    var defaultBibleTranslationId = null;

    if (bibleTranslations != null && bibleTranslations.length > 0) {
      defaultBibleTranslationId = bibleTranslations[0].name;
    }

    this.tab_controller.init('verse-list-tabs', 'verse-list-container', 'add-tab-button', this.tabHtmlTemplate, defaultBibleTranslationId);
    
    fullscreenController.init();
    wheelnavController.init();
    verseListController.init();

    eventController.subscribe('on-tab-selected', async (tabIndex=0) => { await this.onTabSelected(tabIndex); });
    eventController.subscribe('on-tab-added', (tabIndex) => { this.onTabAdded(tabIndex); });

    this.initExitEvent();
  }

  initExitEvent() {
    var exitEvent = null;
    var exitContext = window;

    if (platformHelper.isElectron()) {
      exitEvent = 'beforeunload';
      exitContext = window;
    } else if (platformHelper.isCordova()) {
      exitEvent = 'pause';
      exitContext = document;
    }

    exitContext.addEventListener(exitEvent, () => {
      // FIXME: Introduce new event on-exit and handle the below actions in a de-coupled way

      this.exitLog('Persisting data');

      this.tab_controller.lastSelectedTabIndex = this.tab_controller.getSelectedTabIndex();
      this.tab_controller.savePreviousTabScrollPosition();
      
      if (this.tab_controller.persistanceEnabled) {
        this.exitLog('Saving tab configuration');
        this.tab_controller.saveTabConfiguration();
      }
      
      this.exitLog('Saving last locale');
      cacheController.saveLastLocale();

      this.exitLog('Saving last used version');
      cacheController.saveLastUsedVersion();

      if (platformHelper.isCordova()) {
        ipcSettings.set('lastUsedAndroidVersion', getPlatform().getAndroidVersion());
      }
    });
  }

  exitLog(logMessage) {
    if (platformHelper.isElectron()) {
      const { ipcRenderer } = require('electron');
      ipcRenderer.send('log', logMessage);
    } else {
      console.log(logMessage);
    }
  }

  initVerseButtons(tabIndex=undefined) {
    var currentVerseListMenu = app_controller.getCurrentVerseListMenu(tabIndex)[0];
    var editNoteButton = currentVerseListMenu.querySelector('.edit-note-button');
    var copyButton = currentVerseListMenu.querySelector('.copy-clipboard-button');

    editNoteButton.addEventListener('click', (event) => {
      event.stopPropagation();

      if (!event.target.classList.contains('ui-state-disabled')) {
        app_controller.hideAllMenus();
        app_controller.notes_controller.editVerseNotesForCurrentlySelectedVerse();
      }
    });

    copyButton.addEventListener('click', (event) => {
      event.stopPropagation();

      if (!event.target.classList.contains('ui-state-disabled')) {
        app_controller.hideAllMenus();
        app_controller.verse_selection.copySelectedVerseTextToClipboard();
      }
    });

    this.assign_last_tag_button.init(tabIndex);
    this.translationComparison.initButtonEvents();
    this.verse_context_controller.initButtonEvents();
  }

  enableVerseButtons() {
    var currentVerseListMenu = app_controller.getCurrentVerseListMenu()[0];
    var editNoteButton = currentVerseListMenu.querySelector('.edit-note-button');
    var copyButton = currentVerseListMenu.querySelector('.copy-clipboard-button');
    editNoteButton.classList.remove('ui-state-disabled');
    copyButton.classList.remove('ui-state-disabled');
  }

  disableVerseButtons() {
    var currentVerseListMenu = app_controller.getCurrentVerseListMenu()[0];
    var editNoteButton = currentVerseListMenu.querySelector('.edit-note-button');
    var copyButton = currentVerseListMenu.querySelector('.copy-clipboard-button');
    editNoteButton.classList.add('ui-state-disabled');
    copyButton.classList.add('ui-state-disabled');
  }

  async onTabSelected(tabIndex=0) {
    var metaTab = this.tab_controller.getTab(tabIndex);

    if (metaTab != null && metaTab.selectCount >= 2) {
      // Only perform the following action from the 2nd select (The first is done when the tab is created)
      this.hideAllMenus();
    }

    // Re-configure tab search
    var currentVerseList = verseListController.getCurrentVerseList(tabIndex);
    if (metaTab != null && metaTab.tab_search != null) {
      metaTab.tab_search.setVerseList(currentVerseList);
    }

    uiHelper.configureButtonStyles('.verse-list-menu');
  }

  async onTabAdded(tabIndex=0) {
    this.hideAllMenus();
    
    await this.initCurrentVerseListMenu(tabIndex);
    
    var currentTab = this.tab_controller.getTab(tabIndex);

    if (currentTab) {
      const verseListContainer = verseListController.getCurrentVerseListFrame(tabIndex).parent();

      currentTab.tab_search = new TabSearch();
      currentTab.tab_search.init(
        verseListContainer,
        '.tab-search',
        '.tab-search-input',
        '.tab-search-occurances',
        '.tab-search-previous',
        '.tab-search-next',
        '.tab-search-is-case-sensitive',
        '.tab-search-type',
      );
  
    }
  }

  async loadSettings() {
    try {
      if (this.tab_controller.getTab().isValid() && await ipcDb.getTagCount() > 0) {
        tags_controller.showTagListLoadingIndicator();
      }

      await this.tab_controller.loadTabConfiguration();
      await this.translation_controller.loadSettings();
    } catch (e) {
      console.trace("Failed to load settings ... got exception.", e);
    }
    
    this.tab_controller.bindEvents();
  }

  async initCurrentVerseListMenu(tabIndex=undefined) {
    var currentVerseListMenu = this.getCurrentVerseListMenu(tabIndex)[0];

    currentVerseListMenu.querySelectorAll('.fg-button').forEach((el) => el.classList.remove('events-configured'));
    var bookSelectButton = currentVerseListMenu.querySelector('.book-select-button');
    var moduleSearchButton = currentVerseListMenu.querySelector('.module-search-button');

    var bibleTranslations = await ipcNsi.getAllLocalModules();
    if (bibleTranslations.length > 0) {
      bookSelectButton.classList.remove('ui-state-disabled');
      moduleSearchButton.classList.remove('ui-state-disabled');
    } else {
      bookSelectButton.classList.add('ui-state-disabled');
      moduleSearchButton.classList.add('ui-state-disabled');
    }

    bookSelectButton.addEventListener('click', (event) => {
      this.book_selection_menu.handleBookMenuClick(event);
    });

    app_controller.initVerseButtons(tabIndex);

    var tabId = this.tab_controller.getSelectedTabId(tabIndex);
    if (tabId !== undefined) {
      uiHelper.configureButtonStyles('#' + tabId);
    }

    await this.navigation_pane.updateNavigation(tabIndex);
  }

  initGlobalShortCuts() {
    var shortCut = 'ctrl+c';
    if (platformHelper.isMac()) {
      shortCut = 'command+c';
    }

    Mousetrap.bind(shortCut, async () => {
      var selectedVerseText = await this.verse_selection.getSelectedVerseText();
      getPlatform().copyTextToClipboard(selectedVerseText);
      return false;
    });

    var searchShortCut = 'ctrl+f';
    if (platformHelper.isMac()) {
      searchShortCut = 'command+f';
    }

    Mousetrap.bind(searchShortCut, () => {
      var currentTab = app_controller.tab_controller.getTab();
      currentTab.tab_search.show();
      currentTab.tab_search.focus();
      return false;
    });

    Mousetrap.bind('esc', () => {
      var currentTab = app_controller.tab_controller.getTab();
      currentTab.tab_search.resetSearch();
      return false;
    });

    Mousetrap.bind('enter', () => {
      var currentTab = app_controller.tab_controller.getTab();
      // We need to notify the TabSearch component that there has been a mouse trap event.
      // This is to avoid double event processing, because the TabSearch also listens for key press events.
      currentTab.tab_search.mouseTrapEvent = true;
      currentTab.tab_search.jumpToNextOccurance();
      return false;
    });

    Mousetrap.bind('shift+enter', () => {
      var currentTab = app_controller.tab_controller.getTab();
      // We need to notify the TabSearch component that there has been a mouse trap event.
      // This is to avoid double event processing, because the TabSearch also listens for key press events.
      currentTab.tab_search.mouseTrapEvent = true;
      currentTab.tab_search.shiftKeyPressed = true;
      currentTab.tab_search.jumpToNextOccurance(false);
      return false;
    });
  }

  getCurrentVerseListTabs(tabIndex=undefined) {
    var selectedTabId = this.tab_controller.getSelectedTabId(tabIndex);
    var currentVerseListTabs = document.getElementById(selectedTabId);
    return $(currentVerseListTabs);
  }

  getCurrentVerseListMenu(tabIndex=undefined) {
    var currentVerseListTabs = this.getCurrentVerseListTabs(tabIndex);
    var currentVerseListMenu = null;

    try {
      currentVerseListMenu = $(currentVerseListTabs[0].querySelector('.verse-list-menu'));
    // eslint-disable-next-line no-empty
    } catch (e) { }

    return currentVerseListMenu;
  }

  handleBodyClick(event) {
    if($(this).hasClass('verse-selection-menu')) {
      event.stopPropagation();
      return;
    }
    
    app_controller.hideAllMenus();
    app_controller.notes_controller.restoreCurrentlyEditedNotes();

    var currentTab = app_controller.tab_controller.getTab();
    currentTab.tab_search.blurInputField();
  }

  hideAllMenus() {
    this.book_selection_menu.hideBookMenu();
    this.tag_selection_menu.hideTagMenu();
    this.module_search_controller.hideSearchMenu();
    this.optionsMenu.hideDisplayMenu();
    this.textSizeSettings.hideTextSizeMenu();
    wheelnavController.closeWheelNav();
  }

  async openXrefVerses(referenceVerseBox, xrefTitle, xrefs) {
    var xrefVerseReferenceId = this.verse_box_helper.getVerseReferenceId(referenceVerseBox);
    var currentTab = this.tab_controller.getTab();

    currentTab.setTextType('xrefs');
    currentTab.setXrefs(xrefs);
    currentTab.setReferenceVerseElementId(xrefVerseReferenceId);

    app_controller.tab_controller.setCurrentTabXrefTitle(xrefTitle);

    // Set book, search term and tag id list to null, since we just switched to xrefs
    currentTab.setBook(null, null, null);
    currentTab.setSearchTerm(null);
    currentTab.setTagIdList("");

    await referenceVerseController.renderReferenceVerse(referenceVerseBox);
    await this.getXrefVerses(xrefs);
  }

  async openTaggedVerses(tagIdList, tagTitleList, referenceVerseBox=undefined) {
    var currentTab = this.tab_controller.getTab();
    currentTab.setTextType('tagged_verses');
    currentTab.setTagIdList(tagIdList);
    var localizedVerseReference = null;

    if (referenceVerseBox != null) {
      localizedVerseReference = await this.verse_box_helper.getLocalizedVerseReference(referenceVerseBox[0]);
      var verseReferenceId = this.verse_box_helper.getVerseReferenceId(referenceVerseBox);
      currentTab.setReferenceVerseElementId(verseReferenceId);
    } else {
      currentTab.setReferenceVerseElementId(null);
    }

    app_controller.tab_controller.setCurrentTagTitleList(tagTitleList, localizedVerseReference);

    // Set book, search term and xrefs to null, since we just switched to a tag
    currentTab.setBook(null, null, null);
    currentTab.setSearchTerm(null);
    currentTab.setXrefs(null);
    
    this.module_search_controller.resetSearch();
    
    if (tagIdList != "") {
      setTimeout(() => {
        this.tag_selection_menu.hideTagMenu();
      }, 700);
    }

    if (referenceVerseBox != undefined) {
      await referenceVerseController.renderReferenceVerse(referenceVerseBox);
    } else {
      referenceVerseController.clearReferenceVerse();
    }

    await this.getTaggedVerses();
  }

  async getXrefVerses(xrefs) {
    var currentTabId = this.tab_controller.getSelectedTabId();
    var currentVerseList = verseListController.getCurrentVerseList();

    var currentTab = this.tab_controller.getTab();
    currentTab.tab_search.setVerseList(currentVerseList);

    if (xrefs.length > 0) {
      // Only reset the view if the current text type has changed
      var resetView = this.tab_controller.getTab().hasTextTypeChanged();

      await this.text_controller.prepareForNewText(resetView, false);
      this.text_controller.requestTextUpdate(currentTabId, null, null, null, null, null, xrefs);
    }
  }

  async getTaggedVerses() {
    var currentTab = this.tab_controller.getTab();
    var currentTagIdList = currentTab.getTagIdList();
    var currentTabId = this.tab_controller.getSelectedTabId();
    var currentVerseList = verseListController.getCurrentVerseList();

    currentTab.tab_search.setVerseList(currentVerseList);

    if (currentTagIdList != "") {
      // Only reset the view if the current text type has changed
      var resetView = this.tab_controller.getTab().hasTextTypeChanged();

      await this.text_controller.prepareForNewText(resetView, false);

      this.text_controller.requestTextUpdate(
        currentTabId,
        null,
        currentTagIdList,
        null,
        null,
        null,
        null
      );

      await waitUntilIdle();
      tags_controller.updateTagList(null, currentTab.getContentId());
    }
  }

  openModuleSettingsAssistant(moduleType) {
    this.optionsMenu.hideDisplayMenu();
    this.moduleAssistant.openAssistant(moduleType);
  }
}

module.exports = AppController;