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

const VerseBoxHelper = require("../helpers/verse_box_helper.js");
const VerseSelection = require("../components/verse_selection.js");
const VerseListPopup = require("../components/verse_list_popup.js");
const TagSelectionMenu = require("../components/tags/tag_selection_menu.js");
const TagStatistics = require("../components/tool_panel/tag_statistics.js");
const DocxExport = require("../components/docx_export/docx_export.js");
const ModuleSearchController = require("./module_search_controller.js");
const TranslationController = require("./translation_controller.js");
const TextController = require("./text_controller.js");
const VerseContextController = require("./verse_context_controller.js");
const TabSearch = require("../components/tab_search/tab_search.js");
const TabController = require("./tab_controller.js");
const OptionsMenu = require("../components/options_menu/options_menu.js");
const NavigationPane = require("../components/navigation_pane.js");
const TranslationComparison = require("../components/tool_panel/translation_comparison.js");
const CommentaryPanel = require("../components/tool_panel/commentary_panel.js");
const DictionaryPanel = require("../components/tool_panel/dictionary_panel.js");
const NoteFilesPanel = require("../components/tool_panel/note_files_panel.js");
const BookSelectionMenu = require("../components/book_selection_menu.js");
const WordStudyController = require("./word_study_controller.js");
const NotesController = require("./notes_controller.js");
const SwordNotes = require("../components/sword_notes.js");
const InfoPopup = require("../components/info_popup.js");
const TextSizeSettings = require("../components/text_size_settings.js");
const VerseStatisticsChart = require('../components/verse_statistics_chart.js');
const verseListController = require('./verse_list_controller.js');
const referenceVerseController = require('./reference_verse_controller.js');
const { waitUntilIdle } = require('../helpers/ezra_helper.js');
const eventController = require('./event_controller.js');
const fullscreenController = require('./fullscreen_controller.js');
const moduleUpdateController = require('./module_update_controller.js');
const transChangeTitles = require('../components/trans_change_titles.js');
const sectionLabelHelper = require('../helpers/section_label_helper.js');
const typeFaceSettings = require('../components/type_face_settings.js');
const clipboardController = require('./clipboard_controller.js');
const MobileTabController = require('./mobile_tab_controller.js');

/**
 * AppController is Ezra Bible App's main controller class which initiates all other controllers and components.
 * It is only instantiated once and an instance is available at `global.app_controller`.
 * 
 * @category Controller
 */
class AppController {
  constructor() {
    this.verseContextMenuOpened = false;
    this.startupCompleted = false;
  }

  isStartupCompleted() {
    return this.startupCompleted;
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
    this.init_component("ModuleSearchController", "module_search_controller");
    this.init_component("TranslationController", "translation_controller");
    this.init_component("TextController", "text_controller");
    this.init_component("DocxExport", "docxExport");
    this.init_component("VerseContextController", "verse_context_controller");
    this.init_component("TabController", "tab_controller");
    this.init_component("OptionsMenu", "optionsMenu");
    this.init_component("NavigationPane", "navigation_pane");
    this.init_component("TranslationComparison", "translationComparison");
    this.init_component("CommentaryPanel", "commentaryPanel");
    this.init_component("DictionaryPanel", "dictionaryPanel");
    this.init_component("NoteFilesPanel", "noteFilesPanel");
    this.init_component("BookSelectionMenu", "book_selection_menu");
    this.init_component("VerseListPopup", "verse_list_popup");
    this.init_component("WordStudyController", "word_study_controller");
    this.init_component("NotesController", "notes_controller");
    this.init_component("SwordNotes", "sword_notes");
    this.init_component("InfoPopup", "info_popup");
    this.init_component("TextSizeSettings", "textSizeSettings");
    this.init_component("VerseStatisticsChart", "verse_statistics_chart");
    
    if (platformHelper.isMobile()) {
      this.init_component("MobileTabController", "mobile_tab_controller");
    }

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
    verseListController.init();
    moduleUpdateController.init();
    transChangeTitles.init();
    clipboardController.init();
    
    if (platformHelper.isMobile()) {
      this.mobile_tab_controller.init();
    }

    eventController.subscribe('on-tab-selected', async (tabIndex=0) => { await this.onTabSelected(tabIndex); });
    eventController.subscribe('on-tab-added', (tabIndex) => { this.onTabAdded(tabIndex); });
    eventController.subscribe('on-verses-selected', (details) => { this.toggleVerseContextMenuButton(details.tabIndex); });
    eventController.subscribe('on-tag-group-list-activated', () => { this.hideAllMenus(); });
    eventController.subscribe('on-tag-group-selected', () => { this.hideAllMenus(); });
    eventController.subscribe('on-button-clicked', () => { this.hideAllMenus(); });

    this.verse_context_controller.initButtonEvents();
  }

  toggleVerseContextMenuButton(tabIndex=undefined) {
    var currentVerseListMenu = this.getCurrentVerseListMenu(tabIndex);
    var verseContextMenuButton = currentVerseListMenu[0].querySelector('.verse-context-menu-button');

    if (app_controller.verse_selection.versesSelected()) {
      verseContextMenuButton.classList.remove('ui-state-disabled');
    } else {
      verseContextMenuButton.classList.add('ui-state-disabled');
    }
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
        '.tab-search-word-boundaries',
        '.tab-search-type',
      );
    }
  }

  async loadSettings() {
    try {
      if (this.tab_controller.getTab().isValid() && await ipcDb.getTagCount() > 0) {
        tag_assignment_panel.showTagListLoadingIndicator();
      }

      typeFaceSettings.init();

      await this.tab_controller.loadTabConfiguration();

      if (await ipcSettings.has('lastUsedTagGroupId')) {
        tag_assignment_panel.currentTagGroupId = await ipcSettings.get('lastUsedTagGroupId', null);
        const tagGroupList = document.getElementById('tag-panel-tag-group-list');
        const tagGroup = await tagGroupList._tagGroupManager.getItemById(tag_assignment_panel.currentTagGroupId);
        await eventController.publishAsync('on-tag-group-selected', tagGroup);
      }

      await this.book_selection_menu.updateAvailableBooks();
      sectionLabelHelper.initHelper(ipcNsi);
    } catch (e) {
      console.trace("Failed to load settings ... got exception.", e);
    }
    
    this.tab_controller.bindEvents();
  }

  async initCurrentVerseListMenu(tabIndex=undefined) {
    const currentVerseListMenu = this.getCurrentVerseListMenu(tabIndex)[0];

    currentVerseListMenu.querySelectorAll('.fg-button').forEach((el) => el.classList.remove('events-configured'));
    let bookSelectButton = currentVerseListMenu.querySelector('.book-select-button');
    let moduleSearchButton = currentVerseListMenu.querySelector('.module-search-button');
    let copyButton = currentVerseListMenu.querySelector('.copy-button');
    let tabButton = currentVerseListMenu.querySelector('.tab-button');

    let bibleTranslations = await ipcNsi.getAllLocalModules();
    if (bibleTranslations != null && bibleTranslations.length > 0) {
      bookSelectButton.classList.remove('ui-state-disabled');
      moduleSearchButton.classList.remove('ui-state-disabled');
    } else {
      bookSelectButton.classList.add('ui-state-disabled');
      moduleSearchButton.classList.add('ui-state-disabled');
    }

    $(bookSelectButton).unbind('click').bind('click', (event) => {
      this.book_selection_menu.handleBookMenuClick(event);
    });

    $(copyButton).unbind('click').bind('click', (event) => {
      clipboardController.handleCopyButtonClick(event);
    });

    $(tabButton).unbind('click').bind('click', () => {
      eventController.publish('on-tab-menu-clicked');
    });

    let verseContextMenu = document.getElementById('verse-context-menu');
    verseContextMenu.currentTabIndex = tabIndex;

    let tabId = this.tab_controller.getSelectedTabId(tabIndex);
    if (tabId !== undefined) {
      uiHelper.configureButtonStyles('#' + tabId);
    }
  }

  initGlobalShortCuts() {
    let shortCut = 'ctrl+c';
    if (platformHelper.isMac()) {
      shortCut = 'command+c';
    }

    Mousetrap.bind(shortCut, async () => {
      clipboardController.copyTextToClipboard();
      return false;
    });

    let searchShortCut = 'ctrl+f';
    if (platformHelper.isMac()) {
      searchShortCut = 'command+f';
    }

    let selectAllShortCut = 'ctrl+a';
    if (platformHelper.isMac()) {
      selectAllShortCut = 'command+a';
    }

    Mousetrap.bind(searchShortCut, () => {
      let currentTab = app_controller.tab_controller.getTab();
      currentTab.tab_search.show();
      currentTab.tab_search.focus();
      return false;
    });

    Mousetrap.bind(selectAllShortCut, () => {
      this.selectAllVerses();
      return false;
    });

    Mousetrap.bind('esc', () => {
      let currentTab = app_controller.tab_controller.getTab();
      currentTab.tab_search.resetSearch();

      eventController.publish('on-esc-pressed');

      return false;
    });

    Mousetrap.bind('enter', () => {
      let currentTab = app_controller.tab_controller.getTab();

      if (currentTab != null && currentTab.tab_search != null) {
        // We need to notify the TabSearch component that there has been a mouse trap event.
        // This is to avoid double event processing, because the TabSearch also listens for key press events.
        currentTab.tab_search.mouseTrapEvent = true;
        currentTab.tab_search.jumpToNextOccurance();
      }
      
      eventController.publish('on-enter-pressed');
      
      return false;
    });

    Mousetrap.bind('shift+enter', () => {
      let currentTab = app_controller.tab_controller.getTab();
      // We need to notify the TabSearch component that there has been a mouse trap event.
      // This is to avoid double event processing, because the TabSearch also listens for key press events.
      currentTab.tab_search.mouseTrapEvent = true;
      currentTab.tab_search.shiftKeyPressed = true;
      currentTab.tab_search.jumpToNextOccurance(false);
      return false;
    });
  }

  selectAllVerses() {
    let currentTab = app_controller.tab_controller.getTab();
    let textType = currentTab.getTextType();
    
    if (textType == 'search_results') {
      this.module_search_controller.selectAllSearchResults();
    } else if (textType == 'tagged_verses') {
      this.text_controller.selectAllVerses();
    }
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
    eventController.publish('on-body-clicked');
  }

  hideAllMenus() {
    this.book_selection_menu.hideBookMenu();
    this.tag_selection_menu.hideTagMenu();
    this.module_search_controller.hideSearchMenu();
    this.optionsMenu.hideDisplayMenu();
    this.textSizeSettings.hideTextSizeMenu();
    document.getElementById('verse-context-menu').hidden = true;
  }

  async openXrefVerses(referenceVerseBox, xrefTitle, xrefs) {
    let xrefVerseReferenceId = null;
    if (referenceVerseBox != null && referenceVerseBox.length > 0) {
      xrefVerseReferenceId = this.verse_box_helper.getVerseReferenceId(referenceVerseBox);
    }

    let currentTab = this.tab_controller.getTab();

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

    if (currentTab.getTextType() == 'search_results') {
      this.module_search_controller.resetSearch();
    }

    currentTab.setTextType('tagged_verses');
    currentTab.setTagIdList(tagIdList);
    var localizedVerseReference = null;

    if (referenceVerseBox != null && referenceVerseBox.length != 0) {
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
    const currentTabId = this.tab_controller.getSelectedTabId();
    const currentVerseList = verseListController.getCurrentVerseList();

    const currentTab = this.tab_controller.getTab();
    if (currentTab.tab_search != null) {
      currentTab.tab_search.setVerseList(currentVerseList);
    }

    if (xrefs.length > 0) {
      // Only reset the view if the current text type has changed
      let resetView = this.tab_controller.getTab().hasTextTypeChanged();

      await this.text_controller.prepareForNewText(resetView, false);
      await this.text_controller.requestTextUpdate(currentTabId, null, null, null, null, null, xrefs);
    }
  }

  async getTaggedVerses() {
    var currentTab = this.tab_controller.getTab();
    var currentTagIdList = currentTab.getTagIdList();
    var currentTabId = this.tab_controller.getSelectedTabId();
    var currentVerseList = verseListController.getCurrentVerseList();

    if (currentTab.tab_search != null) {
      currentTab.tab_search.setVerseList(currentVerseList);
    }

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
      tag_assignment_panel.updateTagList(null, tag_assignment_panel.currentTagGroupId, currentTab.getContentId());
    }
  }

  openModuleSettingsAssistant(moduleType) {
    this.optionsMenu.hideDisplayMenu();
    this.moduleAssistant.openAssistant(moduleType);
  }
}

module.exports = AppController;