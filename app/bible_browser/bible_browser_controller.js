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

const LanguageMapper = require('./app/helpers/language_mapper.js');
const TranslationWizardHelper = require('./app/translation_wizard/translation_wizard_helper.js');
const Mousetrap = require('mousetrap');
const { clipboard } = require('electron');

class BibleBrowserController {
  constructor() {
    this.book_menu_is_opened = false;
    this.current_cr_verse_id = null;
  }

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

    this.init_component("VerseSelection", "verse_selection", "./app/components/verse_selection.js");
    this.init_component("TagSelectionMenu", "tag_selection_menu", "./app/tags/tag_selection_menu.js");
    this.init_component("TagAssignmentMenu", "tag_assignment_menu", "./app/tags/tag_assignment_menu.js");
    this.init_component("ModuleSearch", "module_search", "./app/components/module_search.js");
    this.init_component("TranslationController", "translation_controller", "./app/bible_browser/translation_controller.js");
    this.init_component("InstallTranslationWizard", "install_translation_wizard", "./app/translation_wizard/install_translation_wizard.js");
    this.init_component("RemoveTranslationWizard", "remove_translation_wizard", "./app/translation_wizard/remove_translation_wizard.js");
    this.init_component("TextLoader", "text_loader", "./app/bible_browser/text_loader.js");
    this.init_component("VerseContextLoader", "verse_context_loader", "./app/bible_browser/verse_context_loader.js");
    this.init_component("BookSearch", "tab_search", "./app/components/tab_search.js");
    this.init_component("TabController", "tab_controller", "./app/bible_browser/tab_controller.js");
    this.init_component("OptionsMenu", "optionsMenu", "./app/components/options_menu.js");
    this.init_component("NavigationPane", "navigation_pane", "./app/components/navigation_pane.js");
    this.init_component("TaggedVerseExport", "taggedVerseExport", "./app/tags/tagged_verse_export.js");
    this.init_component("TranslationComparison", "translationComparison", "./app/components/translation_comparison.js");
    this.init_component("BookSelectionMenu", "book_selection_menu", "./app/components/book_selection_menu.js");
    this.init_component("TagStatistics", "tag_statistics", "./app/tags/tag_statistics.js");
    this.init_component("Strongs", "strongs", "./app/components/strongs.js");

    this.initTagReferenceBox();
    this.initGlobalShortCuts();
    this.book_selection_menu.init();

    this.translation_controller.init(() => { this.onBibleTranslationChanged(); });
    this.remove_translation_wizard.init(() => { this.onAllTranslationsRemoved(); },
                                        () => { this.onTranslationRemoved(); });

    this.tab_search.init('#tab-search',
                          '#tab-search-input',
                          '#tab-search-occurances',
                          '#tab-search-previous',
                          '#tab-search-next',
                          (occurances) => { this.onSearchResultsAvailable(occurances); },
                          () => { this.onSearchReset(); });

    var bibleTranslations = nsi.getAllLocalModules();
    var defaultBibleTranslationId = null;
    if (bibleTranslations.length > 0) {
      var defaultBibleTranslationId = bibleTranslations[0].name;
    }

    var tabHtmlTemplate = this.getTabHtmlTemplate();
    this.tab_controller.init('verse-list-tabs',
                             'verse-list-container',
                             'add-tab-button',
                             this.settings,
                             tabHtmlTemplate,
                             (event = undefined, ui = { 'index' : 0}) => { this.onTabSelected(event, ui); },
                             (tabIndex) => { this.onTabAdded(tabIndex); },
                             defaultBibleTranslationId);
  }

  onSearchResultsAvailable = async function(occurances) {
    // We need to re-initialize the Strong's event handlers, because the search function rewrote the verse html elements
    this.strongs.bindAfterBibleTextLoaded();

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
        var currentBibleBookShortName = verseBox.find('.verse-bible-book-short').text();
        var currentBookName = models.BibleBook.getBookTitleTranslation(currentBibleBookShortName);

        var bibleBookNumber = this.getVerseListBookNumber(currentBookName, bookHeaders);
        if (bibleBookNumber != -1) {
          this.navigation_pane.highlightSearchResult(bibleBookNumber);
        }
      }
    }
  }

  onSearchReset() {
    this.navigation_pane.clearHighlightedSearchResults();

    // We need to re-initialize the Strong's event handlers, because the search function rewrote the verse html elements
    this.strongs.bindAfterBibleTextLoaded();
  }

  async onTabSelected(event = undefined, ui = { 'index' : 0}) {
    // The ui.index may be higher as the actual available index. This happens after a tab was removed.
    if (ui.index > (this.tab_controller.getTabCount() - 1)) {
      // In this case we simply adjust the index to the last available index.
      ui.index = this.tab_controller.getTabCount() - 1;
    }

    var metaTab = this.tab_controller.getTab(ui.index);
    metaTab.selectCount += 1;

    if (metaTab.selectCount >= 2) {
      // Only perform the following actions from the 2nd select (The first is done when the tab is created)

      this.hideAllMenus();
      // Refresh the view based on the options selected
      this.optionsMenu.refreshViewBasedOnOptions(ui.index);

      this.book_selection_menu.clearSelectedBookInMenu();
    }

    // Re-configure tab search
    this.tab_search.resetSearch();
    var currentVerseList = this.getCurrentVerseList(ui.index);
    this.tab_search.setVerseList(currentVerseList);

    // Clear verse selection
    this.verse_selection.clear_verse_selection();

    // Refresh tags view
    // Assume that verses were selected before, because otherwise the checkboxes may not be properly cleared
    tags_controller.verses_were_selected_before = true;
    this.updateTagsView(ui.index);

    // Refresh tags selection menu (It's global!)
    await this.tag_selection_menu.updateTagSelectionMenu(ui.index);

    // Update available books for current translation
    this.translation_controller.updateAvailableBooks(ui.index);

    // Highlight currently selected book (only in book mode)
    var textType = this.tab_controller.getTab(ui.index).getTextType();
    if (textType == 'book') {
      this.book_selection_menu.highlightCurrentlySelectedBookInMenu(ui.index);
    }

    // Toggle book statistics
    this.tag_statistics.toggle_book_tags_statistics_button(ui.index);

    // Populate search menu based on last search (if any)
    this.module_search.populateSearchMenu(ui.index);

    // Hide elements present from previous tab's usage
    this.strongs.hideStrongsBox();
    this.verse_context_loader.hide_verse_expand_box();

    configure_button_styles('.verse-list-menu');
  }

  onTabAdded(tabIndex=0) {
    this.hideAllMenus();
    // Refresh the view based on the options selected
    this.optionsMenu.refreshViewBasedOnOptions(tabIndex);
    resize_verse_list(tabIndex);
    
    this.initCurrentVerseListMenu(tabIndex);
    this.tag_selection_menu.init(tabIndex);
    this.tag_assignment_menu.init(tabIndex);
    this.module_search.initModuleSearchMenu(tabIndex);
    this.translation_controller.initTranslationsMenu(tabIndex);
    this.translation_controller.initBibleTranslationInfoButton();
    var currentBibleTranslationId = this.tab_controller.getTab(tabIndex).getBibleTranslationId();
    if (currentBibleTranslationId != null) {
      this.translation_controller.enableCurrentTranslationInfoButton(tabIndex);
    }

    this.optionsMenu.initCurrentOptionsMenu(tabIndex);
    this.book_selection_menu.clearSelectedBookInMenu();
  }

  onBibleTranslationChanged() {
    // The tab search is not valid anymore if the translation is changing. Therefore we reset it.
    this.tab_search.resetSearch();

    var currentTab = this.tab_controller.getTab();

    if (currentTab.getTextType() == 'search_results') {
      this.text_loader.prepareForNewText(true, true);
      this.module_search.startSearch(null, this.tab_controller.getSelectedTabIndex(), currentTab.getSearchTerm());
    } else {
      if (!this.tab_controller.isCurrentTabEmpty()) {
        this.text_loader.prepareForNewText(false, false);
        this.text_loader.requestTextUpdate(this.tab_controller.getSelectedTabId(),
                                           currentTab.getBook(),
                                           currentTab.getTagIdList(),
                                           null);
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
    $('.book-select-value').text(i18n.t("menu.book"));
  }

  onTranslationRemoved() {
    $("select#bible-select").empty();
    this.translation_controller.initTranslationsMenu();
    tags_controller.updateTagUiBasedOnTagAvailability();
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
      resize_app_container();
    }

    if (await models.Tag.getTagCount() > 0) {
      tags_controller.showTagListLoadingIndicator();
    }

    this.optionsMenu.loadDisplayOptions();
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

    this.translationComparison.initButtonEvents();

    var tabId = this.tab_controller.getSelectedTabId(tabIndex);
    if (tabId !== undefined) {
      configure_button_styles('#' + tabId);
    }

    this.navigation_pane.updateNavigation();
  }

  initTagReferenceBox() {
    $('#tag-reference-box').dialog({
      width: 620,
      position: [200,200],
      autoOpen: false,
      dialogClass: 'ezra-dialog'
    });
  }

  initGlobalShortCuts() {
    var shortCut = 'ctrl+c';
    if (isMac()) {
      shortCut = 'command+c';
    }

    Mousetrap.bind(shortCut, () => {
      this.copySelectedVersesToClipboard();
      return false;
    });
  }

  copySelectedVersesToClipboard() {
    var selectedVerseBoxes = bible_browser_controller.verse_selection.selected_verse_boxes;
    
    var selectedText = "";

    for (var i = 0; i < selectedVerseBoxes.length; i++) {
      var currentVerseBox = $(selectedVerseBoxes[i]);
      var verseReferenceContent = currentVerseBox.find('.verse-reference-content').text();
      var currentVerseNr = verseReferenceContent.split(reference_separator)[1];
      
      var currentText = currentVerseBox.find('.verse-text').clone();
      currentText.find('.sword-markup').remove();

      selectedText += "<sup>" + currentVerseNr + "</sup> " + currentText.text().trim() + " ";
    }

    selectedText = selectedText.trim();
    selectedText += " " + getLineBreak() + this.verse_selection.getSelectedVersesLabel().text();

    clipboard.writeHTML(selectedText);
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

  showVerseListLoadingIndicator(message=undefined) {
    var loadingIndicator = this.getCurrentVerseListLoadingIndicator();
    var loadingText = loadingIndicator.find('.verse-list-loading-indicator-text');
    if (message === undefined) {
      message = i18n.t("bible-browser.loading-bible-text");
    }

    loadingText.html(message);
    loadingIndicator.find('.loader').show();
    loadingIndicator.show();
  }

  hideVerseListLoadingIndicator() {
    var loadingIndicator = this.getCurrentVerseListLoadingIndicator();
    loadingIndicator.hide();
  }

  updateTagsView(tabIndex) {
    tags_controller.showTagListLoadingIndicator();
    var currentTab = this.tab_controller.getTab(tabIndex);

    if (currentTab !== undefined) {
      var currentTabBook = currentTab.getBook();
      var currentTagIdList = currentTab.getTagIdList();
      var currentSearchTerm = currentTab.getSearchTerm();
      if ((currentTabBook != undefined && currentTabBook != null) || currentTagIdList != null || currentSearchTerm != null) {
        tags_controller.communication_controller.request_tags(currentTabBook);
      }
    }
  }

  handleBodyClick(event) {
    if($(this).hasClass('verse-selection-menu')) {
      event.stopPropagation();
      return;
    }
    
    bible_browser_controller.hideAllMenus();

    if ($('#currently-edited-notes').length > 0) {
      notes_controller.restore_currently_edited_notes();
    }
  }

  hideAllMenus() {
    this.book_selection_menu.hide_book_menu();
    this.tag_selection_menu.hideTagMenu();
    this.tag_assignment_menu.hideTagAssignmentMenu();
    this.module_search.hideSearchMenu();
    this.optionsMenu.hideDisplayMenu();
  }

  bindEventsAfterBibleTextLoaded = async function(tabIndex=undefined) {
    var currentVerseList = this.getCurrentVerseList(tabIndex);

    currentVerseList.find('.tag-box').filter(":not('.tag-events-configured')").bind('click', tags_controller.clear_verse_selection).addClass('tag-events-configured');
    currentVerseList.find('.tag').filter(":not('.tag-events-configured')").bind('click', (event) => {
      this.handleTagReferenceClick(event);
    }).addClass('tag-events-configured');

    currentVerseList.find('.verse-box').bind('mouseover', (e) => { this.onVerseBoxMouseOver(e); });
    this.strongs.bindAfterBibleTextLoaded(tabIndex);
    this.verse_context_loader.init_verse_expand_box(tabIndex);
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
    var verseBox = $(event.target).closest('.verse-box');
    var currentTab = this.tab_controller.getTab();
    var currentBook = currentTab.getBook();
    var currentTagIdList = currentTab.getTagIdList();
    var currentTextType = currentTab.getTextType();

    if (currentTextType == 'book' && currentBook != null) {

      var verseReferenceContent = verseBox.find('.verse-reference-content').text();
      var mouseOverChapter = this.getChapterFromReference(verseReferenceContent);
      this.navigation_pane.highlightNavElement(mouseOverChapter);

    } else if (currentTextType == 'tagged_verses' && currentTagIdList != null || currentTextType == 'search_results') {

      var bibleBookShortTitle = verseBox.find('.verse-bible-book-short').text();
      var currentBookName = models.BibleBook.getBookTitleTranslation(bibleBookShortTitle);
      
      var bibleBookNumber = this.getVerseListBookNumber(currentBookName);
      if (bibleBookNumber != -1) {
        this.navigation_pane.highlightNavElement(bibleBookNumber);
      }
    }
  }

  getOverlayVerseBoxPosition(verse_box) {
    var currentVerseListComposite = this.getCurrentVerseListComposite();

    var verse_box_position = verse_box.offset();
    var verse_box_class = verse_box.attr('class');
    var verse_nr = parseInt(verse_box_class.match(/verse-nr-[0-9]*/)[0].split('-')[2]);
    var next_verse_nr = verse_nr + 1;

    var next_verse_box = currentVerseListComposite.find('.verse-nr-' + next_verse_nr);
    var next_verse_box_position = next_verse_box.offset();
    if (next_verse_box_position == undefined) {
      next_verse_box_position = verse_box.offset();
    }
    var verse_list_height = currentVerseListComposite.height();
    var verse_list_position = currentVerseListComposite.offset();
    var screen_bottom = verse_list_position.top + verse_list_height;
    var cross_reference_box_height = 240;
    var overlay_box_position = null;

    var appContainerWidth = $(window).width();
    var offsetLeft = appContainerWidth - 700;

    if ((next_verse_box_position.top + cross_reference_box_height) <
        screen_bottom) {
      // The box does fit in the screen space between the beginning
      // of the next verse box and the bottom of the screen
      overlay_box_position = {
        top: next_verse_box_position.top + 7,
        left: offsetLeft
      };
    } else {
      // The box does NOT fit in the screen space between the beginning
      // of the next verse box and the bottom of the screen
      overlay_box_position = {
        top: verse_box_position.top - cross_reference_box_height,
        left: offsetLeft
      };
    }

    return overlay_box_position;
  }

  handleTagReferenceClick(event) {
    var verse_box = $(event.target).closest('.verse-box');
    var selected_tag = $(event.target).html().trim();
    selected_tag = selected_tag.replace(/&nbsp;/g, ' ');
    selected_tag = selected_tag.replace(/&amp;/g, '&');
    var tag_id = null;

    var tag_info_list = verse_box.find('.tag-global');
    for (var i = 0; i < tag_info_list.length; i++) {
      var current_tag_info = $(tag_info_list[i]);
      var current_tag_title = current_tag_info.find('.tag-title').text();

      if (current_tag_title == selected_tag) {
        tag_id = current_tag_info.find('.tag-id').text();
        break;
      }
    }

    var currentTabId = this.tab_controller.getSelectedTabId();
    var currentTabIndex = this.tab_controller.getSelectedTabIndex();

    this.text_loader.requestVersesForSelectedTags(
      currentTabIndex,
      currentTabId,
      tag_id,
      this.renderTaggedVerseListInReferenceBox,
      'html',
      false
    );

    var box_position = this.getOverlayVerseBoxPosition(verse_box);
    var title = i18n.t("tags.verses-tagged-with") + ' "' + selected_tag + '"';

    $('#tag-reference-box').dialog({
      position: [box_position.left, box_position.top],
      title: title
    });

    $('#tag-reference-box-verse-list').hide();
    $('#tag-reference-box-verse-list').empty();
    $('#tag-references-loading-indicator').find('.loader').show();
    $('#tag-references-loading-indicator').show();
    $('#tag-reference-box').dialog("open");
  }

  renderTaggedVerseListInReferenceBox(htmlVerses, verseCount) {
    $('#tag-references-loading-indicator').hide();
    var tagReferenceBoxTitle = $('#tag-reference-box').dialog('option', 'title');
    tagReferenceBoxTitle += ' (' + verseCount + ')';
    $('#tag-reference-box').dialog({ title: tagReferenceBoxTitle });
    $('#tag-reference-box-verse-list').html(htmlVerses);
    $('#tag-reference-box-verse-list').show();
  }

  getTaggedVerses() {
    var currentTagIdList = this.tab_controller.getTab().getTagIdList();
    var currentTabId = this.tab_controller.getSelectedTabId();
    var currentVerseList = this.getCurrentVerseList();

    this.tab_search.setVerseList(currentVerseList);

    if (currentTagIdList != "") {
      this.text_loader.prepareForNewText(true, false);
      this.text_loader.requestTextUpdate(currentTabId, null, currentTagIdList, null);
      tags_controller.communication_controller.request_tags();
    }
  }

  resetVerseListView() {
    var currentVerseList = this.getCurrentVerseList()[0];
    if (currentVerseList != undefined) {
      while(currentVerseList.firstChild) {
        currentVerseList.removeChild(currentVerseList.firstChild);
      }
    }

    this.navigation_pane.resetNavigationPane();

    if (this.taggedVerseExport != null) {
      this.taggedVerseExport.disableTaggedVersesExportButton();
    }
  }

  wrapBookWithHtml(book_title) {
    return "<div class='tag-browser-verselist-book-header'>" + book_title + "</div>";
  }

  enableToolbox() {
    $('#bible-browser-toolbox').find('.ui-tabs-nav').find('li').removeClass('ui-state-disabled');
  }

  enableTaggingToolboxOnly() {
    var menu_items = $('#bible-browser-toolbox').find('.ui-tabs-nav').find('li');
    for (var i = 0; i < menu_items.length; i++) {
      var current_item = $(menu_items[i]);
      if (current_item.find('a').attr('href') == '#tags-view') {
        current_item.removeClass('ui-state-disabled');
      } else {
        current_item.addClass('ui-state-disabled');
      }
    }
    $('#bible-browser-toolbox').tabs('select', 1);
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

    // Disabled notes controller
    //notes_controller.init();

    if (tabIsCurrentTab) {
      this.tag_statistics.toggle_book_tags_statistics_button(tabIndex);
    }

    this.verse_selection.init(tabIndex);
    this.navigation_pane.updateNavigation(tabIndex);
    this.optionsMenu.showOrHideBookIntroductionBasedOnOption(tabIndex);
    this.optionsMenu.showOrHideSectionTitlesBasedOnOption(tabIndex);
    this.bindEventsAfterBibleTextLoaded(tabIndex);
  }

  updateUiAfterBibleTranslationAvailable(translationCode) {
    var currentBibleTranslationId = this.tab_controller.getTab().getBibleTranslationId();
    if (currentBibleTranslationId == "" || 
        currentBibleTranslationId == null) { // Update UI after a Bible translation becomes available

      this.tab_controller.setCurrentBibleTranslationId(translationCode);
      this.translation_controller.updateAvailableBooks();
      this.translation_controller.enableCurrentTranslationInfoButton();
    }
  }

  openTranslationSettingsWizard() {
    this.optionsMenu.hideDisplayMenu();
    this.install_translation_wizard.openWizard();
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

module.exports = BibleBrowserController;