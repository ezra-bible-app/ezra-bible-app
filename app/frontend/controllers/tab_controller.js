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
const Tab = require('../ui_models/tab.js');
const i18nHelper = require('../helpers/i18n_helper.js');
const { waitUntilIdle } = require('../helpers/ezra_helper.js');

/**
 * The TabController manages the tab bar and the state of each tab.
 * 
 * Like all other controllers it is only initialized once. It is accessible at the
 * global object `app_controller.tab_controller`.
 * 
 * @category Controller
 */
class TabController {
  constructor() {
    this.persistanceEnabled = false;
    this.defaultLabel = "-------------";
    this.tabTemplate = "<li><a href='#{href}'>#{label}</a> <span class='close-tab-button'><i class='fas fa-times'></i></span></li>",
    this.tabCounter = 1;
    this.nextTabId = 2;
    this.metaTabs = [];
    this.loadingCompleted = false;
    this.lastSelectedTabIndex = null;
  }

  init(tabsElement, tabsPanelClass, addTabElement, settings, tabHtmlTemplate, onTabSelected, onTabAdded, defaultBibleTranslationId) {
    this.tabsElement = tabsElement;
    this.tabsPanelClass = tabsPanelClass;
    this.addTabElement = addTabElement;
    this.settings = settings;
    this.tabHtmlTemplate = tabHtmlTemplate;
    this.onTabSelected = onTabSelected;
    this.onTabAdded = onTabAdded;
    this.defaultBibleTranslationId = defaultBibleTranslationId;
    this.initFirstTab();

    var addTabShortCut = 'ctrl+t';
    if (platformHelper.isMac()) {
      addTabShortCut = 'command+t';
    }

    Mousetrap.bind(addTabShortCut, () => {
      this.addTab();
      return false;
    });

    var exitEvent = null;
    var exitContext = window;

    if (platformHelper.isElectron()) {
      exitEvent = 'beforeunload';
      exitContext = window;
    } else if (platformHelper.isCordova()) {
      exitEvent = 'pause';
      exitContext = document;
    }

    exitContext.addEventListener(exitEvent, async () => {
      console.log('Persisting data!');

      this.lastSelectedTabIndex = this.getSelectedTabIndex();
      this.savePreviousTabScrollPosition();
      await this.saveTabConfiguration();
      await this.saveBookSelectionMenu();
      await this.saveLastUsedVersionAndLanguage();
    });

    this.initTabs();
  }

  initFirstTab() {
    // Initialize the list with the first tab, which is there by default
    var newTab = new Tab(this.defaultBibleTranslationId);
    newTab.elementId = this.tabsElement + '-1';
    this.metaTabs.push(newTab);
  }

  getTabCount() {
    return this.metaTabs.length;
  }

  getTabHtml(tabIndex) {
    var tabId = this.getSelectedTabId(tabIndex);
    var tabElement = document.getElementById(tabId);
    var html = tabElement.querySelector('.verse-list').innerHTML;
    return html;
  }

  getReferenceVerseHtml(tabIndex) {
    var tabId = this.getSelectedTabId(tabIndex);
    var tabElement = document.getElementById(tabId);
    var html = tabElement.querySelector('.reference-verse').innerHTML;
    return html;
  }

  async saveTabConfiguration() {
    if (this.persistanceEnabled) {
      //console.log('Saving tab configuration');
      var savedMetaTabs = [];
      
      for (var i = 0; i < this.metaTabs.length; i++) {
        this.metaTabs[i].tab_search.resetSearch();
        
        var copiedMetaTab = Object.assign({}, this.metaTabs[i]);
        copiedMetaTab.cachedText = this.getTabHtml(i);

        if (copiedMetaTab.verseReferenceId != null) {
          copiedMetaTab.cachedReferenceVerse = this.getReferenceVerseHtml(i);
        } else {
          copiedMetaTab.cachedReferenceVerse = null;
        }

        if (copiedMetaTab.tab_search != null) { // Each metaTab has a tab_search object.
                                                // That object cannot be persisted, so we set it to null explicitly!
          copiedMetaTab.tab_search = null;
        }

        savedMetaTabs.push(copiedMetaTab);
      }

      await ipcSettings.set('tabConfiguration', savedMetaTabs, 'html-cache');

      var currentTime = new Date(Date.now());
      await ipcSettings.set('tabConfigurationTimestamp', currentTime, 'html-cache');
    }
  }

  async deleteTabConfiguration() {
    if (this.persistanceEnabled) {
      //console.log('Saving tab configuration');
      await ipcSettings.delete('tabConfiguration', 'html-cache');
    }  
  }

  async saveBookSelectionMenu() {
    if (this.persistanceEnabled) {
      var html = document.getElementById("book-selection-menu").innerHTML;

      await ipcSettings.set('bookSelectionMenuCache', html, 'html-cache');
    }
  }

  async saveLastUsedVersionAndLanguage() {
    await ipcSettings.storeLastUsedVersion();
    await ipcSettings.storeLastUsedLanguage();
  }

  updateFirstTabCloseButton() {
    if (this.metaTabs.length > 1) {
      this.showFirstTabCloseButton();
    } else {
      this.hideFirstTabCloseButton();
    }
  }

  getFirstTabCloseButton() {
    var firstTabCloseButton = $($('#' + this.tabsElement).find('.close-tab-button')[0]);
    return firstTabCloseButton;
  }

  showFirstTabCloseButton() {
    var firstTabCloseButton = this.getFirstTabCloseButton();
    firstTabCloseButton.show();
  }

  hideFirstTabCloseButton() {
    var firstTabCloseButton = this.getFirstTabCloseButton();
    firstTabCloseButton.hide();
  }

  async loadMetaTabsFromSettings() {
    var savedMetaTabs = await ipcSettings.get('tabConfiguration', [], 'html-cache');
    var loadedTabCount = 0;

    for (var i = 0; i < savedMetaTabs.length; i++) {
      var currentMetaTab = Tab.fromJsonObject(savedMetaTabs[i]);

      if (!currentMetaTab.isValid()) {
        // We ignore the meta tab if it is invalid
        continue;
      }

      console.log("Creating tab " + loadedTabCount + " from saved entry ... ");

      currentMetaTab.selectCount = 1;

      if (loadedTabCount == 0) {
        currentMetaTab.elementId = this.metaTabs[0].elementId;
        this.metaTabs[0] = currentMetaTab;
        this.updateFirstTabCloseButton();
      } else {
        this.addTab(currentMetaTab, false);
      }

      var tabTitle = currentMetaTab.getTitle();
      this.setTabTitle(tabTitle, currentMetaTab.getBibleTranslationId(), loadedTabCount);
      this.onTabAdded(i - 1, i);
      loadedTabCount += 1;
    }

    if (loadedTabCount > 0) {
      console.log("Loaded " + loadedTabCount + " tabs from configuration!");
    }

    return loadedTabCount;
  }

  async isCacheOutdated() {
    var tabConfigTimestamp = await ipcSettings.get('tabConfigurationTimestamp', null, 'html-cache');
    if (tabConfigTimestamp != null) {
      tabConfigTimestamp = new Date(tabConfigTimestamp);

      var dbUpdateTimestamp = new Date(await ipcDb.getLastMetaRecordUpdate());

      if (dbUpdateTimestamp != null && dbUpdateTimestamp.getTime() > tabConfigTimestamp.getTime()) {
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }

  async populateFromMetaTabs() {
    var cacheOutdated = await this.isCacheOutdated();
    var cacheInvalid = await app_controller.isCacheInvalid();

    if (cacheOutdated) {
      console.log("Tab content cache is outdated. Database has been updated in the meantime!");
    }

    if (cacheInvalid) {
      console.log("Cache is invalid. New app version?");
    }

    for (var i = 0; i < this.metaTabs.length; i++) {
      var currentMetaTab = this.metaTabs[i];

      if (cacheOutdated || cacheInvalid) {
        currentMetaTab.cachedText = null;
        currentMetaTab.cachedReferenceVerse = null;
      }

      var isSearch = (currentMetaTab.textType == 'search_results');
      await app_controller.text_controller.prepareForNewText(true, isSearch, i);

      if (currentMetaTab.textType == 'search_results') {

        await app_controller.module_search_controller.populateSearchMenu(i);

        var requestedBookId = -1; // all books requested
        if (app_controller.module_search_controller.searchResultsExceedPerformanceLimit(i)) {
          requestedBookId = 0; // no books requested - only list headers at first
        }
  
        await app_controller.module_search_controller.renderCurrentSearchResults(requestedBookId,
                                                                                i,
                                                                                undefined,
                                                                                currentMetaTab.cachedText);

      } else {

        await app_controller.text_controller.requestTextUpdate(
          currentMetaTab.elementId,
          currentMetaTab.book,
          currentMetaTab.tagIdList,
          currentMetaTab.cachedText,
          currentMetaTab.cachedReferenceVerse,
          null,
          currentMetaTab.xrefs,
          i
        );

      }
    }
  }
  
  async loadTabConfiguration() {
    var bibleTranslationSettingAvailable = await ipcSettings.has('bibleTranslation');

    if (bibleTranslationSettingAvailable) {
      this.defaultBibleTranslationId = await ipcSettings.get('bibleTranslation');
    }

    var loadedTabCount = 0;

    var tabConfigurationAvailable = await ipcSettings.has('tabConfiguration', 'html-cache');

    if (tabConfigurationAvailable) {
      uiHelper.showTextLoadingIndicator();
      app_controller.showVerseListLoadingIndicator();
      loadedTabCount = await this.loadMetaTabsFromSettings();

      if (loadedTabCount > 0) {
        await this.populateFromMetaTabs();
      } else {
        app_controller.hideVerseListLoadingIndicator();
        uiHelper.hideTextLoadingIndicator();
      }
    }

    // If no tabs are loaded from a previous session we need to explicitly invoke the onTabAdded callback on the first tab
    if (loadedTabCount == 0) {
      this.onTabAdded(-1, 0);
    }

    // Give the UI some time to render
    await waitUntilIdle();

    // Call this method explicitly to initialize the first tab
    await this.onTabSelected();

    await waitUntilIdle();

    this.loadingCompleted = true;
    this.persistanceEnabled = true;
  }

  initTabs() {
    this.tabs = $("#" + this.tabsElement).tabs();
    this.updateFirstTabCloseButton();

    var addTabText = i18n.t("bible-browser.open-new-tab");
    var addTabButton = `<li><button id='add-tab-button' class='fg-button ui-corner-all ui-state-default' title='${addTabText}' i18n='[title]bible-browser.open-new-tab'><i class="fas fa-plus"></i></button></li>`;
    $("#" + this.tabsElement).find('.ui-tabs-nav').append(addTabButton);

    this.addTabElement = 'add-tab-button';

    $('#' + this.addTabElement).on("mousedown", (event) => {
      setTimeout(() => {
        $('#' + this.addTabElement).removeClass('ui-state-active');
      }, 50);

      this.addTab();
      return false;
    });
  }

  reloadTabs() {
    this.tabs.tabs("destroy");
    this.initTabs();
    this.bindEvents();
  }

  getCorrectedIndex(ui) {
    var index = ui.index;

    // The ui.index may be higher as the actual available index. This happens after a tab was removed.
    if (index > (this.getTabCount() - 1)) {
      // In this case we simply adjust the index to the last available index.
      index = this.getTabCount() - 1;
    }

    return index;   
  }

  bindEvents() {
    this.tabs.tabs({
      select: (event, ui) => {
        var index = this.getCorrectedIndex(ui);
        var metaTab = this.getTab(index);
        metaTab.selectCount += 1;

        if (metaTab.addedInteractively || metaTab.selectCount > 1) { // We only run the onTabSelected callback
                                                                     // if the tab has been added interactively
                                                                     // or after the initial select.
                                                                     // This is necessary to ensure good visual performance when
                                                                     // adding tabs automatically (like for finding all Strong's references).
          
          var index = this.getCorrectedIndex(ui);
          ui.index = index;

          if (metaTab.selectCount > 1) {
            this.savePreviousTabScrollPosition();
          }

          if (metaTab.getTextType() != null) {
            var currentVerseList = app_controller.getCurrentVerseList(index);
            var currentVerseListHeader = app_controller.getCurrentVerseListHeader(index);
            var currentReferenceVerse = app_controller.getCurrentReferenceVerse(index);

            currentVerseList.hide();
            currentVerseListHeader.hide();
            currentReferenceVerse.hide();

            app_controller.showVerseListLoadingIndicator(index);
            app_controller.verse_statistics_chart.resetChart(index);
          }

          this.lastSelectedTabIndex = index;
          this.onTabSelected(event, ui);
        }
      },
      show: (event, ui) => {
        var index = this.getCorrectedIndex(ui);
        var metaTab = this.getTab(index);

        (async () => { // We use an async IIFE, because JQuery UI cannot deal with an async function

          if (metaTab.addedInteractively || metaTab.selectCount > 1) { // see above
            if (metaTab.getTextType() != null) {
              await waitUntilIdle();

              var index = this.getCorrectedIndex(ui);
              var currentVerseList = app_controller.getCurrentVerseList(index);
              var currentVerseListHeader = app_controller.getCurrentVerseListHeader(index);
              var currentReferenceVerse = app_controller.getCurrentReferenceVerse(index);

              currentVerseList.show();
              currentVerseListHeader.show();
              currentReferenceVerse.show();

              await app_controller.verse_statistics_chart.repaintChart(index);

              app_controller.hideVerseListLoadingIndicator(index);
              this.restoreScrollPosition(index);
            }
          }
        })();
      }
    });

    this.tabs.find('span.close-tab-button').unbind();

    // Close icon: removing the tab on click
    this.tabs.find('span.close-tab-button').on( "mousedown", (event) => {
      this.removeTab(event);

      var currentTabIndex = this.getSelectedTabIndex();
      uiHelper.resizeVerseList(currentTabIndex);

      setTimeout(() => {
        app_controller.book_selection_menu.highlightCurrentlySelectedBookInMenu();
      }, 250);
    });

    uiHelper.configureButtonStyles('.ui-tabs-nav');
  }

  saveTabScrollPosition(tabIndex) {
    var metaTab = this.getTab(tabIndex);
    var firstVerseListAnchor = uiHelper.getFirstVisibleVerseAnchor();

    if (metaTab != null) {
      if (firstVerseListAnchor != null) {
        metaTab.setLocation(firstVerseListAnchor);
      } else {
        metaTab.setLocation("top");
      }
    }
  }

  savePreviousTabScrollPosition() {
    if (this.lastSelectedTabIndex != null) {
      this.saveTabScrollPosition(this.lastSelectedTabIndex);
    }
  }

  restoreScrollPosition(tabIndex) {
    var metaTab = this.getTab(tabIndex);

    if (metaTab != null) {
      var currentVerseListFrame = app_controller.getCurrentVerseListFrame(tabIndex);

      if (currentVerseListFrame != null) {
        const savedScrollTop = metaTab.getLocation();

        if (savedScrollTop != null) {
          // console.log("Setting location to " + savedScrollTop);
          window.location = "#" + savedScrollTop;
        }
      }
    }
  }

  getSelectedTabIndex() {
    var selectedTabIndex = this.tabs.tabs("option").selected;
    if (selectedTabIndex == null) {
      selectedTabIndex = 0;
    }
    
    return selectedTabIndex;
  }

  getSelectedTabId(index=undefined) {
    if (index === undefined) {
      var index = this.getSelectedTabIndex();
    }

    var allTabsPanels = document.getElementById(this.tabsElement).querySelectorAll('.' + this.tabsPanelClass);
    var selectedTabsPanel = allTabsPanels[index];
    var selectedTabsPanelId = "verse-list-tabs-1";

    if (selectedTabsPanel != null) {
      var selectedTabsPanelId = selectedTabsPanel.getAttribute('id');
    }

    return selectedTabsPanelId;
  }

  addTab(metaTab=undefined, interactive=true, bibleTranslationId=undefined) {
    var initialLoading = true;
    if (metaTab === undefined) {
      initialLoading = false;

      if (bibleTranslationId != undefined) {
        this.defaultBibleTranslationId = bibleTranslationId;
      }

      var metaTab = new Tab(this.defaultBibleTranslationId, interactive);
    }

    metaTab.elementId = this.tabsElement + '-' + this.nextTabId;
    this.metaTabs.push(metaTab);

    var li = $( this.tabTemplate.replace( /#\{href\}/g, "#" + metaTab.elementId ).replace( /#\{label\}/g, this.defaultLabel ) );
    this.tabs.find(".ui-tabs-nav").find('li').last().remove();
    this.tabs.find(".ui-tabs-nav").append(li);
    this.tabs.append("<div id='" + metaTab.elementId + "' class='" + this.tabsPanelClass + "'>" + this.tabHtmlTemplate + "</div>");

    if (interactive) {
      this.lastSelectedTabIndex = this.getSelectedTabIndex();
      this.savePreviousTabScrollPosition();
    }

    this.reloadTabs();
    if (!initialLoading) {
      this.tabs.tabs('select', this.tabCounter);
    }

    this.tabCounter++;
    this.nextTabId++;

    this.updateFirstTabCloseButton();

    if (!initialLoading) {
      this.onTabAdded(this.lastSelectedTabIndex, this.tabCounter - 1);
    }
  }

  removeTab(event) {
    var href = $(event.target).closest("li").find('a').attr('href');
    var all_tabs = $(event.target).closest("ul").find("li");

    for (var i = 0; i < all_tabs.length; i++) {
      var current_href = $(all_tabs[i]).find('a').attr('href');
      if (current_href == href) {
        this.metaTabs.splice(i, 1);
        this.tabs.tabs("remove", i);
        this.tabCounter--;
        break;
      }
    }

    this.updateFirstTabCloseButton();
  }

  removeAllExtraTabs() {
    var all_tabs = this.tabs.find("li");

    for (var i = 2; // We only go down to 2, because that's the initial amount of list elements (first tab + add tab button)
         i < all_tabs.length;
         i++) {

      this.metaTabs.pop();
      this.tabs.tabs("remove", 1);
      this.tabCounter--;
    }
  }

  /**
   * Resets the state of TabController to the initial state (corresponds to the state right after first installation)
   */
  async reset() {
    this.removeAllExtraTabs();
    this.setCurrentBibleTranslationId(null);
    this.getTab().setTagIdList("");
    this.getTab().setXrefs(null);
    this.getTab().setVerseReferenceId(null);
    this.setCurrentTabBook(null, "");
    this.resetCurrentTabTitle();
    await this.deleteTabConfiguration();
  }

  getTab(index=undefined) {
    if (index === undefined) {
      var index = this.getSelectedTabIndex();
    }

    return this.metaTabs[index];
  }

  getTabById(tabId) {
    for (var i = 0; i < this.metaTabs.length; i++) {
      var currentTabId = this.getSelectedTabId(i);
      if (currentTabId == tabId) {
        return this.metaTabs[i];
      }
    }

    return null;
  }

  resetCurrentTabTitle() {
    this.setTabTitle(this.defaultLabel);
  }

  setTabTitle(title, bibleTranslationId=undefined, index=undefined) {
    if (index === undefined) {
      var index = this.getSelectedTabIndex();
    }

    var tabsElement = $('#' + this.tabsElement);
    var tab = $(tabsElement.find('li')[index]);
    var link = $(tab.find('a')[0]);
    var tabTitle = title;
    if (bibleTranslationId !== undefined) {
      tabTitle += ' [' + bibleTranslationId + ']';
    }

    link.html(tabTitle);

    // Resize the current verse list.
    // This may be necessary, because the tab bar may have wrapped after setting the title.
    uiHelper.resizeVerseList(index);
  }

  getTabTitle() {
    var index = this.getSelectedTabIndex();
    var tabsElement = $('#' + this.tabsElement);
    var tab = $(tabsElement.find('li')[index]);
    var link = $(tab.find('a')[0]);
    var linkText = link.html().split(" ");
    linkText.pop();
    return linkText.join(" ");
  }

  refreshBibleTranslationInTabTitle(bibleTranslationId) {
    var currentTabTitle = this.getTabTitle();
    this.setTabTitle(currentTabTitle, bibleTranslationId);
  }

  setCurrentTabBook(bookCode, bookTitle) {
    this.getTab().setBook(bookCode, bookTitle);
    var currentTranslationId = this.getTab().getBibleTranslationId();

    if (bookTitle != undefined && bookTitle != null) {
      this.setTabTitle(bookTitle, currentTranslationId);
    }
  }

  setCurrentTagTitleList(tagTitleList, verseReference, index=undefined) {
    this.getTab(index).setTagTitleList(tagTitleList);
    var currentTranslationId = this.getTab(index).getBibleTranslationId();

    if (tagTitleList != undefined && tagTitleList != null) {
      if (tagTitleList == "") {
        this.resetCurrentTabTitle();
      } else {
        var tagTitle = "";
        if (verseReference != null) tagTitle += verseReference + " &ndash; ";

        if (platformHelper.isElectron()) {
          tagTitle += i18n.t('tags.verses-tagged-with') + " ";
        }

        tagTitle += "<i>" + tagTitleList + "</i>";

        this.setTabTitle(tagTitle, currentTranslationId);
        this.getTab(index).setTaggedVersesTitle(tagTitle);
      }
    }
  }

  setCurrentTabXrefTitle(xrefTitle, index=undefined) {
    this.getTab(index).setXrefTitle(xrefTitle);
    var currentTranslationId = this.getTab(index).getBibleTranslationId();

    if (xrefTitle != undefined && xrefTitle != null) {
      if (xrefTitle == "") {
        this.resetCurrentTabTitle();
      } else {
        this.setTabTitle(xrefTitle, currentTranslationId);
      }
    }
  }

  setTabSearch(searchTerm, index=undefined) {
    this.getTab(index).setSearchTerm(searchTerm);
    var currentTranslationId = this.getTab(index).getBibleTranslationId();

    if (searchTerm != undefined && searchTerm != null) {
      var searchTabTitle = this.getSearchTabTitle(searchTerm);
      this.setTabTitle(searchTabTitle, currentTranslationId, index);
    }
  }

  getSearchTabTitle(searchTerm) {
    return i18n.t("menu.search") + ": " + searchTerm;
  }

  setLastHighlightedNavElementIndex(index, isHeaderNav=false) {
    var currentTabIndex = this.getSelectedTabIndex();

    if (isHeaderNav) {
      this.metaTabs[currentTabIndex].lastHighlightedHeaderIndex = index;
    } else {
      this.metaTabs[currentTabIndex].lastHighlightedChapterIndex = index;
    }
  }

  getLastHighlightedNavElementIndex(isHeaderNav=false) {
    var currentTabIndex = this.getSelectedTabIndex();

    if (isHeaderNav) {
      return this.metaTabs[currentTabIndex].lastHighlightedHeaderIndex;
    } else {
      return this.metaTabs[currentTabIndex].lastHighlightedChapterIndex;
    }
  }

  setCurrentBibleTranslationId(bibleTranslationId) {
    this.getTab().setBibleTranslationId(bibleTranslationId);

    if (bibleTranslationId != null) {
      this.defaultBibleTranslationId = bibleTranslationId;
      app_controller.info_popup.enableCurrentAppInfoButton();
    }
  }

  async getCurrentBibleTranslationName() {
    var module = await ipcNsi.getLocalModule(this.getTab().getBibleTranslationId());
    return module.description;
  }

  isCurrentTabEmpty() {
    var currentTabIndex = this.getSelectedTabIndex();
    var currentTab = this.metaTabs[currentTabIndex];
    return currentTab.book == null && currentTab.tagIdList == "" && currentTab.xrefs == null;
  }

  updateTabTitleAfterTagRenaming(old_title, new_title) {
    for (var i = 0; i < this.metaTabs.length; i++) {
      var currentMetaTab = this.metaTabs[i];
      if (currentMetaTab.getTextType() == 'tagged_verses') {
        var currentTagTitleList = currentMetaTab.tagTitleList;
        var tag_list = currentTagTitleList.split(', ');
        for (var j = 0; j < tag_list.length; j++) {
          var current_tag = tag_list[j];
          if (current_tag == old_title) {
            tag_list[j] = new_title;
            break;
          }
        }

        var tagTitle = "";

        if (platformHelper.isElectron()) {
          tagTitle += i18n.t('tags.verses-tagged-with') + " ";
        }

        tagTitle += "<i>" + tag_list.join(', ') + "</i>";

        this.setTabTitle(tagTitle, currentMetaTab.getBibleTranslationId(), i);
      }
    }
  }

  async updateTabTitleAfterLocaleChange() {
    for (let i = 0; i < this.metaTabs.length; i++) {
      const currentMetaTab = this.metaTabs[i];
      let tabTitle = "";
      switch (currentMetaTab.getTextType()) {
        case 'book':
          tabTitle = await i18nHelper.getSwordTranslation(currentMetaTab.getBookTitle());
          break;
        case 'search_results':
          tabTitle = this.getSearchTabTitle(currentMetaTab.getSearchTerm());
          break;
        case 'tagged_verses': {
            const refTitle = currentMetaTab.getRefFromTitle();
            if (refTitle) {
              tabTitle += `${refTitle} &ndash; `;
            }
            if (platformHelper.isElectron()) {
              tabTitle += `${i18n.t('tags.verses-tagged-with')} `;
            }
            tabTitle += `<i>${currentMetaTab.tagTitleList}</i>`;
          }
          break;  
        case 'xrefs': {
            tabTitle = `${currentMetaTab.getRefFromTitle()} &ndash; ${i18n.t("general.module-xrefs")}`;
          }
          break;
      }
      if (tabTitle !== "") {
        this.setTabTitle(tabTitle, currentMetaTab.getBibleTranslationId(), i);
      }
    }
  }

  onTranslationRemoved(translationId, translationList) {
    if (translationId == this.defaultBibleTranslationId) {
      if (translationList.length > 0) {
        this.defaultBibleTranslationId = translationList[0];
      } else {
        this.defaultBibleTranslationId = null;
      }
    }
  }

  /**
   * Function to update locale strings in new tab template
   * Called on locale change
   */
  localizeTemplate() {
    let $tabHtmlTemplate = $('<div>').append(this.tabHtmlTemplate);
    $tabHtmlTemplate.localize();
    this.tabHtmlTemplate = $tabHtmlTemplate.html();
  }
}

module.exports = TabController;

