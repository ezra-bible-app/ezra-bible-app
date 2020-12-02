/* This file is part of Ezra Project.

   Copyright (C) 2019 - 2020 Tobias Klein <contact@ezra-project.net>

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

const Mousetrap = require('mousetrap');
const VerseBox = require('../ui_models/verse_box.js');

/**
 * AppController is Ezra Project's main controller class which initiates all other controllers and components.
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
  init_component(componentClassName, componentName, componentPath) {
    var expression = "";
    expression += "const " + componentClassName + " = " + "require('" + componentPath + "');";
    expression += "this." + componentName + " = new " + componentClassName + "();";
    eval(expression);
  }

  async init() {
    this.verse_list_menu_template = $($('.verse-list-menu')[0]).html();
    this.verse_list_composite_template = $($('.verse-list-composite')[0]).html();
    this.settings = require('electron-settings');

    this.init_component("VerseBoxHelper", "verse_box_helper", "../helpers/verse_box_helper.js");
    this.init_component("VerseSelection", "verse_selection", "../components/verse_selection.js");
    this.init_component("TagSelectionMenu", "tag_selection_menu", "../components/tags/tag_selection_menu.js");
    this.init_component("TagAssignmentMenu", "tag_assignment_menu", "../components/tags/tag_assignment_menu.js");
    this.init_component("ModuleSearch", "module_search", "../components/module_search.js");
    this.init_component("TranslationController", "translation_controller", "./translation_controller.js");
    this.init_component("InstallModuleAssistant", "install_module_assistant", "../components/module_assistant/install_module_assistant.js");
    this.init_component("RemoveModuleAssistant", "remove_module_assistant", "../components/module_assistant/remove_module_assistant.js");
    this.init_component("TextController", "text_controller", "./text_controller.js");
    this.init_component("VerseContextController", "verse_context_controller", "./verse_context_controller.js");
    this.init_component("BookSearch", "tab_search", "../components/tab_search/tab_search.js");
    this.init_component("TabController", "tab_controller", "./tab_controller.js");
    this.init_component("OptionsMenu", "optionsMenu", "../components/options_menu.js");
    this.init_component("NavigationPane", "navigation_pane", "../components/navigation_pane.js");
    this.init_component("TaggedVerseExport", "taggedVerseExport", "../components/tags/tagged_verse_export.js");
    this.init_component("TranslationComparison", "translationComparison", "../components/translation_comparison.js");
    this.init_component("BookSelectionMenu", "book_selection_menu", "../components/book_selection_menu.js");
    this.init_component("VerseListPopup", "verse_list_popup", "../components/verse_list_popup.js");
    this.init_component("TagStatistics", "tag_statistics", "../components/tags/tag_statistics.js");
    this.init_component("DictionaryController", "dictionary_controller", "./dictionary_controller.js");
    this.init_component("NotesController", "notes_controller", "./notes_controller.js");
    this.init_component("SwordNotes", "sword_notes", "../components/sword_notes.js");

    this.verse_list_popup.initVerseListPopup();
    this.initGlobalShortCuts();

    this.translation_controller.init(async (oldBibleTranslationId, newBibleTranslationId) => {
      await this.onBibleTranslationChanged(oldBibleTranslationId, newBibleTranslationId);
    });

    this.remove_module_assistant.init(() => { this.onAllTranslationsRemoved(); },
                                   (translationId) => { this.onTranslationRemoved(translationId); });

    this.tab_search.init('#tab-search',
                          '#tab-search-input',
                          '#tab-search-occurances',
                          '#tab-search-previous',
                          '#tab-search-next',
                          '#tab-search-is-case-sensitive',
                          '#tab-search-type',
                          (occurances) => { this.onSearchResultsAvailable(occurances); },
                          () => { this.onSearchReset(); });

    var bibleTranslations = nsi.getAllLocalModules();
    var defaultBibleTranslationId = null;
    if (bibleTranslations.length > 0) {
      var defaultBibleTranslationId = bibleTranslations[0].name;
      this.book_selection_menu.init();
    }

    var tabHtmlTemplate = this.getTabHtmlTemplate();
    this.tab_controller.init('verse-list-tabs',
                             'verse-list-container',
                             'add-tab-button',
                             this.settings,
                             tabHtmlTemplate,
                             (event = undefined, ui = { 'index' : 0}) => { this.onTabSelected(event, ui); },
                             (previousTabIndex, tabIndex) => { this.onTabAdded(previousTabIndex, tabIndex); },
                             defaultBibleTranslationId);
  }

  onSearchResultsAvailable = async function(occurances) {
    // We need to re-initialize the Strong's event handlers, because the search function rewrote the verse html elements
    this.dictionary_controller.bindAfterBibleTextLoaded();

    var currentVerseListFrame = this.getCurrentVerseListFrame();
    var bookHeaders = currentVerseListFrame.find('.tag-browser-verselist-book-header');

    // Highlight occurances in navigation pane
    for (var i = 0; i < occurances.length; i++) {
      var currentOccurance = $(occurances[i]);
      var verseBox = currentOccurance.closest('.verse-box');
      var currentTab = this.tab_controller.getTab();
      var currentTextType = currentTab.getTextType();

      if (currentTextType == 'book') {
        // Highlight chapter if we are searching in a book

        var verseReferenceContent = verseBox.find('.verse-reference-content').text();
        var chapter = this.getChapterFromReference(verseReferenceContent);
        this.navigation_pane.highlightSearchResult(chapter);

      } else {

        // Highlight bible book if we are searching in a tagged verses list
        var currentBibleBookShortName = new VerseBox(verseBox[0]).getBibleBookShortTitle();
        var currentBookName = models.BibleBook.getBookTitleTranslation(currentBibleBookShortName);

        var bibleBookNumber = this.getVerseListBookNumber(currentBookName, bookHeaders);
        if (bibleBookNumber != -1) {
          this.navigation_pane.highlightSearchResult(bibleBookNumber, "OTHER");
        }
      }
    }
  }

  onSearchReset() {
    this.navigation_pane.clearHighlightedSearchResults();

    // We need to re-initialize the Strong's event handlers, because the search function rewrote the verse html elements
    this.dictionary_controller.bindAfterBibleTextLoaded();
  }

  async onTabSelected(event = undefined, ui = { 'index' : 0}) {
    await waitUntilIdle();

    var metaTab = this.tab_controller.getTab(ui.index);

    if (metaTab.selectCount >= 2) {
      // Only perform the following actions from the 2nd select (The first is done when the tab is created)

      this.hideAllMenus();
      this.book_selection_menu.clearSelectedBookInMenu();
    }

    // Refresh the view based on the options selected
    this.optionsMenu.refreshViewBasedOnOptions(ui.index);

    // When switching tabs we need to end any note editing.
    this.notes_controller.restoreCurrentlyEditedNotes();

    // Re-configure tab search
    this.tab_search.resetSearch();
    var currentVerseList = this.getCurrentVerseList(ui.index);
    this.tab_search.setVerseList(currentVerseList);

    // Clear verse selection
    this.verse_selection.clear_verse_selection();

    // Refresh tags view
    // Assume that verses were selected before, because otherwise the checkboxes may not be properly cleared
    tags_controller.verses_were_selected_before = true;
    await this.updateTagsView(ui.index);

    // Refresh tags selection menu (It's global!)
    await this.tag_selection_menu.updateTagSelectionMenu(ui.index);

    // Update available books for current translation
    this.book_selection_menu.updateAvailableBooks(ui.index);

    // Refresh translations menu
    this.translation_controller.initTranslationsMenu(-1, ui.index);

    // Highlight currently selected book (only in book mode)
    var textType = this.tab_controller.getTab(ui.index)?.getTextType();
    if (textType == 'book') this.book_selection_menu.highlightCurrentlySelectedBookInMenu(ui.index);

    // Toggle book statistics
    this.tag_statistics.toggle_book_tags_statistics_button(ui.index);

    // Populate search menu based on last search (if any)
    this.module_search.populateSearchMenu(ui.index);

    // Hide elements present from previous tab's usage
    this.dictionary_controller.hideStrongsBox();
    this.verse_context_controller.hide_verse_expand_box();

    uiHelper.resizeVerseList(ui.index);
    uiHelper.configureButtonStyles('.verse-list-menu');
  }

  onTabAdded(previousTabIndex, tabIndex=0) {
    this.hideAllMenus();
    // Refresh the view based on the options selected
    this.optionsMenu.refreshViewBasedOnOptions(tabIndex);
    uiHelper.resizeVerseList(tabIndex);
    
    this.initCurrentVerseListMenu(tabIndex);
    this.tag_selection_menu.init(tabIndex);
    this.tag_assignment_menu.init(tabIndex);
    this.module_search.initModuleSearchMenu(tabIndex);
    this.translation_controller.initTranslationsMenu(previousTabIndex, tabIndex);
    this.translation_controller.initBibleTranslationInfoButton();
    var currentBibleTranslationId = this.tab_controller.getTab(tabIndex)?.getBibleTranslationId();
    if (currentBibleTranslationId != null) {
      this.translation_controller.enableCurrentTranslationInfoButton(tabIndex);
    }

    this.optionsMenu.initCurrentOptionsMenu(tabIndex);
    this.book_selection_menu.clearSelectedBookInMenu();

    // We need to refresh the last used tag button, because the button is not yet initialized in the tab html template
    tags_controller.onLatestUsedTagChanged(undefined, undefined);
  }

  async onBibleTranslationChanged(oldBibleTranslationId, newBibleTranslationId) {
    // The tab search is not valid anymore if the translation is changing. Therefore we reset it.
    this.tab_search.resetSearch();

    var currentTab = this.tab_controller.getTab();

    if (currentTab.getTextType() == 'search_results') {
      this.text_controller.prepareForNewText(true, true);
      this.module_search.startSearch(null, this.tab_controller.getSelectedTabIndex(), currentTab.getSearchTerm());
    } else {
      if (!this.tab_controller.isCurrentTabEmpty()) {
        this.text_controller.prepareForNewText(false, false);
        await this.text_controller.requestTextUpdate(this.tab_controller.getSelectedTabId(),
                                                 currentTab.getBook(),
                                                 currentTab.getTagIdList(),
                                                 null,
                                                 null,
                                                 null,
                                                 currentTab.getXrefs());

        if (currentTab.getVerseReferenceId() != null) {
          this.updateReferenceVerseTranslation(oldBibleTranslationId, newBibleTranslationId);
        }
      }
    }
  }

  // Re-init application to state without Bible translations
  onAllTranslationsRemoved() {
    this.tab_controller.reset();
    this.resetVerseListView();
    this.hideVerseListLoadingIndicator();
    this.getCurrentVerseList().append("<div class='help-text'>" + i18n.t("help.help-text-no-translations") + "</div>");
    this.translation_controller.disableCurrentTranslationInfoButton();    
    this.verse_selection.clear_verse_selection();
    $('.book-select-value').text(i18n.t("menu.book"));
  }

  onTranslationRemoved(translationId) {
    $("select#bible-select").empty();
    this.translation_controller.initTranslationsMenu();
    tags_controller.updateTagUiBasedOnTagAvailability();
    var installedTranslations = this.translation_controller.getInstalledModules();
    this.tab_controller.onTranslationRemoved(translationId, installedTranslations);
  }

  getTabHtmlTemplate() {
    var tabHtmlTemplate = "";

    tabHtmlTemplate += "<div class='verse-list-menu'>";
    tabHtmlTemplate += this.verse_list_menu_template;
    tabHtmlTemplate += "</div>";

    tabHtmlTemplate += "<div class='verse-list-composite'>";
    tabHtmlTemplate += this.verse_list_composite_template;
    tabHtmlTemplate += "</div>";

    return tabHtmlTemplate;
  }

  loadSettings = async function() {
    if (this.settings.get('tag_list_width') &&
        this.settings.get('tag_list_width') != null) {

      $('#bible-browser-toolbox').css('width', this.settings.get('tag_list_width'));
      uiHelper.resizeAppContainer();
    }

    if (await models.Tag.getTagCount() > 0) {
      tags_controller.showTagListLoadingIndicator();
    }

    await this.tab_controller.loadTabConfiguration();
    this.translation_controller.loadSettings();
    this.tab_controller.bindEvents();
  }

  initCurrentVerseListMenu(tabIndex=undefined) {
    var currentVerseListMenu = this.getCurrentVerseListMenu(tabIndex);

    currentVerseListMenu.find('.fg-button').removeClass('events-configured');
    
    var bookSelectButton = currentVerseListMenu.find('.book-select-button');
    bookSelectButton.bind('click', (event) => {
      this.book_selection_menu.handle_book_menu_click(event);
    });

    currentVerseListMenu.find('.new-standard-tag-button').bind('click', function() {
      tags_controller.handle_new_tag_button_click($(this), "standard");
    });

    currentVerseListMenu.find('.assign-last-tag-button').bind('click', function(event) {
      if (!event.target.classList.contains('ui-state-disabled')) {
        tags_controller.assign_last_tag();
      }
    });

    this.translationComparison.initButtonEvents();

    var tabId = this.tab_controller.getSelectedTabId(tabIndex);
    if (tabId !== undefined) {
      uiHelper.configureButtonStyles('#' + tabId);
    }

    this.navigation_pane.updateNavigation();
  }

  initGlobalShortCuts() {
    var shortCut = 'ctrl+c';
    if (platformHelper.isMac()) {
      shortCut = 'command+c';
    }

    Mousetrap.bind(shortCut, () => {
      this.copySelectedVersesToClipboard();
      return false;
    });

    if (!platformHelper.isMac()) {
      Mousetrap.bind('f11', () => {
        toggleFullScreen();
      });
    }
  }
  
  getLineBreak() {
    if (process.platform === 'win32') {
      return "\r\n";
    } else {
      return "\n";
    }
  }

  copySelectedVersesToClipboard() {
    const { clipboard } = require('electron');
    
    var selectedVerseBoxes = app_controller.verse_selection.selected_verse_box_elements;
    
    var selectedText = "";
    var multipleVerses = selectedVerseBoxes.length > 1;

    for (var i = 0; i < selectedVerseBoxes.length; i++) {
      var currentVerseBox = $(selectedVerseBoxes[i]);
      var verseReferenceContent = currentVerseBox.find('.verse-reference-content').text();
      var currentVerseNr = verseReferenceContent.split(reference_separator)[1];
      
      var currentText = currentVerseBox.find('.verse-text').clone();
      currentText.find('.sword-markup').remove();

      if (multipleVerses) {
        selectedText += currentVerseNr + " ";
      }

      selectedText += currentText.text().trim() + " ";
    }

    selectedText = selectedText.trim();
    selectedText += " " + this.getLineBreak() + this.verse_selection.getSelectedVersesLabel().text();

    clipboard.writeText(selectedText);
  }

  getCurrentVerseListTabs(tabIndex=undefined) {
    var selectedTabId = this.tab_controller.getSelectedTabId(tabIndex);
    var currentVerseListTabs = $('#' + selectedTabId);
    return currentVerseListTabs;
  }

  getCurrentVerseListMenu(tabIndex=undefined) {
    var currentVerseListTabs = this.getCurrentVerseListTabs(tabIndex);
    var currentVerseListMenu = currentVerseListTabs.find('.verse-list-menu');
    return currentVerseListMenu;
  }

  getCurrentVerseListComposite(tabIndex=undefined) {
    var currentVerseListTabs = this.getCurrentVerseListTabs(tabIndex);
    var currentVerseListComposite = currentVerseListTabs.find('.verse-list-composite');
    return currentVerseListComposite;
  }

  getCurrentVerseListFrame(tabIndex=undefined) {
    var currentVerseListComposite = this.getCurrentVerseListComposite(tabIndex);
    var currentVerseListFrame = currentVerseListComposite.find('.verse-list-frame');
    return currentVerseListFrame;
  }

  getCurrentReferenceVerse(tabIndex=undefined) {
    var currentVerseListFrame = this.getCurrentVerseListFrame(tabIndex);
    var referenceVerse = currentVerseListFrame.find('.reference-verse');
    return referenceVerse;
  }

  getCurrentVerseList(tabIndex=undefined) {
    var currentVerseListFrame = this.getCurrentVerseListFrame(tabIndex);
    var verseList = currentVerseListFrame.find('.verse-list');
    return verseList;
  }

  getCurrentVerseListLoadingIndicator() {
    var currentVerseListComposite = this.getCurrentVerseListComposite();
    var loadingIndicator = currentVerseListComposite.find('.verse-list-loading-indicator');
    return loadingIndicator;
  }

  getCurrentSearchProgressBar() {
    var currentVerseListComposite = this.getCurrentVerseListComposite();
    var searchProgressBar = currentVerseListComposite.find('.search-progress-bar');
    return searchProgressBar;
  }

  showVerseListLoadingIndicator(message=undefined, withLoader=true) {
    var loadingIndicator = this.getCurrentVerseListLoadingIndicator();
    var loadingText = loadingIndicator.find('.verse-list-loading-indicator-text');
    if (message === undefined) {
      message = i18n.t("bible-browser.loading-bible-text");
    }

    loadingText.html(message);

    if (withLoader) {
      loadingIndicator.find('.loader').show();
    } else {
      loadingIndicator.find('.loader').hide();
    }

    loadingIndicator.show();
  }

  hideVerseListLoadingIndicator() {
    var loadingIndicator = this.getCurrentVerseListLoadingIndicator();
    loadingIndicator.hide();
  }

  hideSearchProgressBar() {
    var searchProgressBar = this.getCurrentSearchProgressBar();
    searchProgressBar.hide();
  }

  async updateTagsView(tabIndex) {
    tags_controller.showTagListLoadingIndicator();
    var currentTab = this.tab_controller.getTab(tabIndex);

    if (currentTab !== undefined) {
      var currentTabBook = currentTab.getBook();
      var currentTagIdList = currentTab.getTagIdList();
      var currentSearchTerm = currentTab.getSearchTerm();
      if ((currentTabBook != undefined && currentTabBook != null) || currentTagIdList != null || currentSearchTerm != null) {
        await waitUntilIdle();
        tags_controller.update_tag_list(currentTabBook);
      }
    }
  }

  handleBodyClick(event) {
    if($(this).hasClass('verse-selection-menu')) {
      event.stopPropagation();
      return;
    }
    
    app_controller.hideAllMenus();
    app_controller.notes_controller.restoreCurrentlyEditedNotes();
    app_controller.tab_search.blurInputField();
  }

  hideAllMenus() {
    this.book_selection_menu.hide_book_menu();
    this.tag_selection_menu.hideTagMenu();
    this.tag_assignment_menu.hideTagAssignmentMenu();
    this.module_search.hideSearchMenu();
    this.optionsMenu.hideDisplayMenu();
  }
  
  handleReferenceClick(event) {
    var currentTab = this.tab_controller.getTab();
    var currentTextType = currentTab.getTextType();
    var verseBox = $(event.target).closest('.verse-box');
    var isReferenceVerse = verseBox.parent().hasClass('reference-verse');
    var isXrefMarker = event.target.classList.contains('sword-xref-marker');
    var isTag = event.target.classList.contains('tag');

    if (isReferenceVerse &&
      ((currentTextType == 'xrefs') || (currentTextType == 'tagged_verses'))
    ) {
      if (isXrefMarker) {
        this.verse_list_popup.initCurrentXrefs(event.target);

        this.openXrefVerses(this.verse_list_popup.currentReferenceVerseBox,
                            this.verse_list_popup.currentPopupTitle,
                            this.verse_list_popup.currentXrefs);

      } else if (isTag) {

        this.verse_list_popup.initCurrentTag(event.target);

        this.openTaggedVerses(this.verse_list_popup.currentTagId,
                              this.verse_list_popup.currentTagTitle,
                              this.verse_list_popup.currentReferenceVerseBox);

      }
    } else {
      if (isXrefMarker) {
        this.verse_list_popup.openVerseListPopup(event, "XREFS");
      } else if (isTag) {
        this.verse_list_popup.openVerseListPopup(event, "TAGGED_VERSES");
      }
    }
  }

  bindXrefEvents(tabIndex=undefined) {
    var verseList = this.getCurrentVerseList(tabIndex);
    var xref_markers = verseList.find('.sword-xref-marker');
    
    xref_markers.bind('mousedown', (event) => {
      this.handleReferenceClick(event);
    }).addClass('events-configured');
  }

  bindEventsAfterBibleTextLoaded = async function(tabIndex=undefined, preventDoubleBinding=false, verseList=undefined) {
    if (verseList == undefined) {
      verseList = this.getCurrentVerseList(tabIndex);
    }

    var tagBoxes = verseList.find('.tag-box');
    var tags = verseList.find('.tag');
    var xref_markers = verseList.find('.sword-xref-marker');

    if (preventDoubleBinding) {
      tagBoxes = tagBoxes.filter(":not('.tag-events-configured')");
      tags = tags.filter(":not('.tag-events-configured')");
      xref_markers = xref_markers.filter(":not('.events-configured')");
    }

    tagBoxes.bind('mousedown', tags_controller.clear_verse_selection).addClass('tag-events-configured');

    tags.bind('mousedown', (event) => {
      this.handleReferenceClick(event);
    }).addClass('tag-events-configured');

    xref_markers.bind('mousedown', (event) => {
      this.handleReferenceClick(event);
    }).addClass('events-configured');

    verseList.find('.verse-box').bind('mouseover', (e) => { this.onVerseBoxMouseOver(e); });
    this.dictionary_controller.bindAfterBibleTextLoaded(tabIndex);
    this.verse_context_controller.init_verse_expand_box(tabIndex);
  }

  getVerseListBookNumber(bibleBookLongTitle, bookHeaders=undefined) {
    var bibleBookNumber = -1;

    if (bookHeaders === undefined) {
      var currentVerseListFrame = this.getCurrentVerseListFrame();
      bookHeaders = currentVerseListFrame.find('.tag-browser-verselist-book-header');
    }

    for (var i = 0; i < bookHeaders.length; i++) {
      var currentBookHeader = $(bookHeaders[i]);
      var currentBookHeaderText = currentBookHeader.text();

      if (currentBookHeaderText.includes(bibleBookLongTitle)) {
        bibleBookNumber = i + 1;
        break;
      }
    }

    return bibleBookNumber;
  }

  async onVerseBoxMouseOver(event) {
    var verseBox = event.target.closest('.verse-box');
    var currentTab = this.tab_controller.getTab();
    var currentBook = currentTab.getBook();
    var currentTagIdList = currentTab.getTagIdList();
    var currentTextType = currentTab.getTextType();

    if (currentTextType == 'book' && currentBook != null) {

      var verseReferenceContent = verseBox.querySelector('.verse-reference-content').innerText;
      var mouseOverChapter = this.getChapterFromReference(verseReferenceContent);
      this.navigation_pane.highlightNavElement(mouseOverChapter);

      var sectionTitle = this.verse_box_helper.getSectionTitleFromVerseBox(verseBox);
      if (sectionTitle != null) {
        this.navigation_pane.highlightSectionHeaderByTitle(sectionTitle);
      }

    } else if (currentTextType == 'tagged_verses' && currentTagIdList != null || currentTextType == 'xrefs' || currentTextType == 'search_results') {

      var bibleBookShortTitle = new VerseBox(verseBox).getBibleBookShortTitle();
      var currentBookName = models.BibleBook.getBookTitleTranslation(bibleBookShortTitle);
      
      var bibleBookNumber = this.getVerseListBookNumber(currentBookName);
      if (bibleBookNumber != -1) {
        this.navigation_pane.highlightNavElement(bibleBookNumber, false, "OTHER");
      }
    }
  }

  updateReferenceVerseTranslation(oldBibleTranslationId, newBibleTranslationId) {
    var currentVerseListFrame = this.getCurrentVerseListFrame();
    var currentTab = this.tab_controller.getTab();
    var currentBibleTranslationId = currentTab.getBibleTranslationId();
    var referenceVerseContainer = currentVerseListFrame[0].querySelector('.reference-verse');
    var referenceVerseBox = new VerseBox(referenceVerseContainer.querySelector('.verse-box'));
    var bookShortTitle = referenceVerseBox.getBibleBookShortTitle();
    var mappedAbsoluteVerseNumber = referenceVerseBox.getMappedAbsoluteVerseNumber(oldBibleTranslationId, newBibleTranslationId);

    try {
      var verses = nsi.getBookText(currentBibleTranslationId, bookShortTitle, mappedAbsoluteVerseNumber, 1);
      var verseText = referenceVerseContainer.querySelector('.verse-text');
      verseText.innerHTML = verses[0].content;
      this.sword_notes.initForContainer($(referenceVerseContainer));
      this.bindEventsAfterBibleTextLoaded(undefined, false, $(referenceVerseContainer));
    } catch (e) {
      console.warn('Could not update translation for reference verse: ' + e);
    }
  }

  renderReferenceVerse(verseBox, tabIndex=undefined) {
    if (verseBox == null || verseBox.length != 1) return;

    var currentVerseListFrame = this.getCurrentVerseListFrame(tabIndex);
    var currentVerseList = this.getCurrentVerseList(tabIndex);
    var referenceVerseContainer = currentVerseListFrame[0].querySelector('.reference-verse');

    var classList = currentVerseList[0].classList;
    for (var i = 0; i < classList.length; i++) {
      var currentClass = classList[i];

      if (currentClass != "verse-list") {
        referenceVerseContainer.classList.add(currentClass);
      }
    }

    var clonedVerseBox = verseBox[0].cloneNode(true);
    var header = this.verse_box_helper.getLocalizedVerseReference(verseBox[0]);
    var referenceVerseHeader = "<div class='reference-header'>" + header + "</div>";
    referenceVerseContainer.innerHTML = referenceVerseHeader;
    referenceVerseContainer.appendChild(clonedVerseBox);
    referenceVerseContainer.innerHTML += "<br/><hr/>";

    var currentTab = this.tab_controller.getTab(tabIndex);
    var textType = currentTab.getTextType();
    var textTypeHeader = "";

    if (textType == 'xrefs') {
      textTypeHeader = i18n.t('general.module-xrefs');
    } else if (textType == 'tagged_verses') {
      textTypeHeader = i18n.t('tags.verses-tagged-with') + "<i>" + currentTab.getTagTitleList() + "</i>";
    }

    referenceVerseContainer.innerHTML += "<div class='reference-header'>" + textTypeHeader + "</div>";
    this.bindEventsAfterBibleTextLoaded(undefined, false, $(referenceVerseContainer));
  }

  async openXrefVerses(referenceVerseBox, xrefTitle, xrefs) {
    var xrefVerseReferenceId = this.verse_box_helper.getVerseReferenceId(referenceVerseBox);
    var currentTab = this.tab_controller.getTab();

    currentTab.setTextType('xrefs');
    currentTab.setXrefs(xrefs);
    currentTab.setVerseReferenceId(xrefVerseReferenceId);

    app_controller.tab_controller.setCurrentTabXrefTitle(xrefTitle);

    // Set book, search term and tag id list to null, since we just switched to xrefs
    currentTab.setBook(null, null);
    currentTab.setSearchTerm(null);
    currentTab.setTagIdList("");

    this.renderReferenceVerse(referenceVerseBox);
    await this.getXrefVerses(xrefs);
  }

  showReferenceContainer() {
    var currentTab = this.tab_controller.getTab();

    if (currentTab.getVerseReferenceId() != null) {
      var currentVerseListFrame = this.getCurrentVerseListFrame();
      var referenceVerseContainer = currentVerseListFrame[0].querySelector('.reference-verse');
      $(referenceVerseContainer).show();
    }
  }

  async openTaggedVerses(tagIdList, tagTitleList, referenceVerseBox=undefined) {
    var currentTab = this.tab_controller.getTab();
    currentTab.setTextType('tagged_verses');
    currentTab.setTagIdList(tagIdList);
    var localizedVerseReference = null;

    if (referenceVerseBox != null) {
      localizedVerseReference = this.verse_box_helper.getLocalizedVerseReference(referenceVerseBox[0]);
      var verseReferenceId = this.verse_box_helper.getVerseReferenceId(referenceVerseBox);
      currentTab.setVerseReferenceId(verseReferenceId);
    }

    app_controller.tab_controller.setCurrentTagTitleList(tagTitleList, localizedVerseReference);

    // Set book, search term and xrefs to null, since we just switched to a tag
    currentTab.setBook(null, null);
    currentTab.setSearchTerm(null);
    currentTab.setXrefs(null);
    
    this.module_search.resetSearch();
    
    if (tagIdList != "") {
      setTimeout(() => {
        this.tag_selection_menu.hideTagMenu();
      }, 700);
    }

    if (referenceVerseBox != undefined) {
      this.renderReferenceVerse(referenceVerseBox);
    }

    await this.getTaggedVerses();
  }

  async getXrefVerses(xrefs) {
    var currentTabId = this.tab_controller.getSelectedTabId();
    var currentVerseList = this.getCurrentVerseList();

    this.tab_search.setVerseList(currentVerseList);

    if (xrefs.length > 0) {
      // Only reset the view if the current text type is not xrefs.
      // So, in case of xrefs we just "refresh" the view.
      var resetView = this.tab_controller.getTab().getTextType() != 'xrefs';

      this.text_controller.prepareForNewText(resetView, false);
      this.text_controller.requestTextUpdate(currentTabId, null, null, null, null, null, xrefs);
    }
  }

  async getTaggedVerses() {
    var currentTagIdList = this.tab_controller.getTab().getTagIdList();
    var currentTabId = this.tab_controller.getSelectedTabId();
    var currentVerseList = this.getCurrentVerseList();

    this.tab_search.setVerseList(currentVerseList);

    if (currentTagIdList != "") {
      // Only reset the view if the current text type is not tagged_verses.
      // So, in case of tagged_verses we just "refresh" the view.
      // FIXME: This leads to weird visual effects when switching from bible text
      var resetView = this.tab_controller.getTab().getTextType() != 'tagged_verses';

      this.text_controller.prepareForNewText(resetView, false);
      this.text_controller.requestTextUpdate(currentTabId,
                                         null,
                                         currentTagIdList,
                                         null,
                                         null,
                                         null,
                                         null);
      await waitUntilIdle();
      tags_controller.update_tag_list();
    }
  }

  resetVerseListView() {
    var textType = this.tab_controller.getTab().getTextType();
    if (textType != 'xrefs' && textType != 'tagged_verses') {
      var currentReferenceVerse = this.getCurrentVerseListFrame().find('.reference-verse');
      currentReferenceVerse[0].innerHTML = "";
    }

    var currentVerseList = this.getCurrentVerseList()[0];
    if (currentVerseList != undefined) {
      while(currentVerseList.firstChild) {
        currentVerseList.removeChild(currentVerseList.firstChild);
      }
    }

    this.navigation_pane.resetNavigationPane();
    this.taggedVerseExport?.disableTaggedVersesExportButton();
  }

  initApplicationForVerseList(tabIndex=undefined) {
    var selectedTabIndex = this.tab_controller.getSelectedTabIndex();
    var tabIsCurrentTab = false;

    if (tabIndex == selectedTabIndex) {
      tabIsCurrentTab = true;
    }

    if (tabIndex === undefined) {
      var tabIndex = selectedTabIndex;
    }

    if (tabIsCurrentTab) {
      this.tag_statistics.toggle_book_tags_statistics_button(tabIndex);
    }

    this.verse_selection.init(tabIndex);
    this.navigation_pane.updateNavigation(tabIndex);
    this.notes_controller.initForTab(tabIndex);
    this.sword_notes.initForTab(tabIndex);

    this.bindEventsAfterBibleTextLoaded(tabIndex);
  }

  updateUiAfterBibleTranslationAvailable(translationCode) {
    var bibleTranslations = nsi.getAllLocalModules();
    if (bibleTranslations.length == 1) {
      this.book_selection_menu.init();
    }

    var currentBibleTranslationId = this.tab_controller.getTab().getBibleTranslationId();
    if (currentBibleTranslationId == "" || 
        currentBibleTranslationId == null) { // Update UI after a Bible translation becomes available

      this.tab_controller.setCurrentBibleTranslationId(translationCode);
      this.book_selection_menu.updateAvailableBooks();
      this.translation_controller.enableCurrentTranslationInfoButton();
    }
  }

  openModuleSettingsAssistant(moduleType) {
    this.optionsMenu.hideDisplayMenu();
    this.install_module_assistant.openAssistant(moduleType);
  }

  getChapterFromReference(reference) {
    var chapter = Number(reference.split(reference_separator)[0]);
    return chapter;
  }

  getVerseFromReference(reference) {
    var verse = Number(reference.split(reference_separator)[1]);
    return verse;
  }

  jumpToReference(reference, highlight) {
    var currentTabId = this.tab_controller.getSelectedTabId();
    var chapter = this.getChapterFromReference(reference);
    var verse = this.getVerseFromReference(reference);

    var uniqueReference = '#' + currentTabId + ' ' + chapter + ':' + verse;

    if (chapter == 1 && verse < 5) {
      var currentVerseListComposite = this.getCurrentVerseListComposite();
      currentVerseListComposite[0].scrollTop = 0;
    } else {
      window.location = uniqueReference;
    }

    this.navigation_pane.highlightNavElement(chapter);

    /*if (highlight) { // FIXME
      original_verse_box.glow();
    }*/
  }
}

module.exports = AppController;