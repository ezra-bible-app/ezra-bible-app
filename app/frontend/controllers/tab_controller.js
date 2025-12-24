/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2025 Ezra Bible App Development Team <contact@ezrabibleapp.net>

   Ezra Bible App is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 2 of the License, or
   (at your option) any later version.

   Ezra Bible App is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Bible App. See the file LICENSE.
   If not, see <http://www.gnu.org/licenses/>. */

const Mousetrap = require('mousetrap');
const Tab = require('../ui_models/tab.js');
const i18nHelper = require('../helpers/i18n_helper.js');
const { waitUntilIdle } = require('../helpers/ezra_helper.js');
const VerseBoxHelper = require('../helpers/verse_box_helper.js');
const verseListTitleHelper = require('../helpers/verse_list_title_helper.js');
const cacheController = require('./cache_controller.js');
const eventController = require('./event_controller.js');
const referenceVerseController = require('../controllers/reference_verse_controller.js');
const verseListController = require('../controllers/verse_list_controller.js');
const PlatformHelper = require('../../lib/platform_helper.js');

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
    this.tabTemplate = "<li><a href='#{href}'>#{label}</a> <span class='close-tab-button'><i class='fas fa-times'></i></span></li>";
    this.nextTabId = 2;
    /** @type Tab[] */
    this.metaTabs = [];
    this.loadingCompleted = false;
    this.lastSelectedTabIndex = null;
    this.verseBoxHelper = new VerseBoxHelper();
    this.tabOperationsEnabled = true;
    this._platformHelper = new PlatformHelper();
  }

  init(tabsElement, tabsPanelClass, addTabElement, tabHtmlTemplate, defaultBibleTranslationId) {
    this.tabsElement = tabsElement;
    this.tabsPanelClass = tabsPanelClass;
    this.addTabElement = addTabElement;
    this.tabHtmlTemplate = tabHtmlTemplate;
    this.defaultBibleTranslationId = defaultBibleTranslationId;
    this.defaultSecondBibleTranslationId = defaultBibleTranslationId
    this.initFirstTab();

    var addTabShortCut = 'ctrl+t';
    if (platformHelper.isMac()) {
      addTabShortCut = 'command+t';
    }

    Mousetrap.bind(addTabShortCut, () => {
      this.addTab();
      return false;
    });

    this.initTabs();

    eventController.subscribe('on-locale-changed', async () => {
      this.localizeTemplate();
      await this.updateTabTitlesAfterLocaleChange();
    });

    eventController.subscribePrioritized('on-translation1-changed', async (data) => await this.onBibleTranslationChanged(data));
    eventController.subscribePrioritized('on-translation2-changed', async (data) => await this.onBibleTranslationChanged(data, true));

    eventController.subscribe('on-translation-removed', async (translationId) => {
      var installedTranslations = await app_controller.translation_controller.getInstalledModules();
      this.onTranslationRemoved(translationId, installedTranslations);
    });

    eventController.subscribe('on-translation-added', (translationCode) => {
      var currentBibleTranslationId = this.getTab().getBibleTranslationId();
      if (currentBibleTranslationId == "" || 
          currentBibleTranslationId == null) { // Update UI after a Bible translation becomes available
  
        this.setBibleTranslationId(translationCode);
      }
    });

    eventController.subscribe('on-all-translations-removed', async () => {
      await this.reset();
    });

    // eslint-disable-next-line no-unused-vars
    eventController.subscribe('on-tag-renamed', ({ tagId, oldTitle, newTitle }) => {
      this.updateTabTitleAfterTagRenaming(oldTitle, newTitle);
    });

    eventController.subscribe('on-tag-deleted', async (deletedTagId) => {
      this.closeTabsWithDeletedTag(Number(deletedTagId));
    });

    eventController.subscribe('on-bible-text-loaded', () => {
      let bibleTranslationId = this.getTab().getBibleTranslationId();
      this.setBibleTranslationId(bibleTranslationId);
      this.restoreScrollPosition();

      if (this.persistanceEnabled) {
        this.lastSelectedTabIndex = this.getSelectedTabIndex();
        this.saveTabConfiguration();
      }
    });

    eventController.subscribe('on-tab-scrolled', (data) => {
      if (data && data.scrollPosition) {
        const tabIndex = data.tabIndex;
        const scrollPosition = data.scrollPosition;
        const metaTab = this.getTab(tabIndex);
        
        if (metaTab) {
          metaTab.setLocation(scrollPosition);
          
          // Save tab configuration if persistence is enabled
          if (this.persistanceEnabled) {
            this.saveTabConfiguration();
          }
        }
      }
    });

    eventController.subscribe('on-db-refresh', async () => {
      let tabsValid = true;

      for (let i = 0; i < this.metaTabs.length; i++) {
        if (!this.metaTabs[i].isValid()) {
          tabsValid = false;
          break;
        }
      }

      if (tabsValid) {
        verseListController.resetVerseListView();

        if (this.loadingCompleted) {
          // If tabs are already loaded, just repopulate them with fresh data
          await this.populateFromMetaTabs(true);
        } else {
          // Initial loading during startup
          await this.loadTabConfiguration(true);
        }
      }
    });

    eventController.subscribe('on-note-file-changed', async () => {
      const currentTabIndex = this.getSelectedTabIndex();
      await this.populateTab(currentTabIndex, true, true, true);
    });
  }

  initFirstTab() {
    // Initialize the list with the first tab, which is there by default
    var newTab = new Tab(this.defaultBibleTranslationId);
    newTab.elementId = this.tabsElement + '-1';
    this.metaTabs.push(newTab);
  }

  getAllTabs() {
    return this.metaTabs;
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
    //console.log('Saving tab configuration');
    var savedMetaTabs = [];

    for (var i = 0; i < this.metaTabs.length; i++) {
      if (this.metaTabs[i].tab_search != null) {
        this.metaTabs[i].tab_search.resetSearch();
      }

      var copiedMetaTab = Object.assign({}, this.metaTabs[i]);
      copiedMetaTab.cachedText = this.getTabHtml(i);
      copiedMetaTab.previousBook = null;
      copiedMetaTab.headersLoaded = false;

      if (copiedMetaTab.referenceVerseElementId != null) {
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

    // Save the currently selected tab index
    const selectedTabIndex = this.getSelectedTabIndex();
    await cacheController.setCachedItem('tabConfiguration', savedMetaTabs);
    await cacheController.setCachedItem('selectedTabIndex', selectedTabIndex);
  }

  disableTabOperations() {
    this.tabOperationsEnabled = false;
  }

  enableTabOperations() {
    this.tabOperationsEnabled = true;
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
    let savedMetaTabs = await cacheController.getCachedItem('tabConfiguration', [], false);
    let loadedTabCount = 0;
    let tabCount = savedMetaTabs.length;

    for (let i = 0; i < tabCount; i++) {
      var currentMetaTab = Tab.fromJsonObject(savedMetaTabs[i], i);

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
      await eventController.publishAsync('on-tab-added', i);
      loadedTabCount += 1;
    }

    if (loadedTabCount > 0) {
      console.log("Loaded " + loadedTabCount + " tabs from configuration!");
    }

    return loadedTabCount;
  }

  async populateFromMetaTabs(force=false) {
    let cacheOutdated = await cacheController.isCacheOutdated();
    let cacheInvalid = await cacheController.isCacheInvalid();
    let tabCount = this.metaTabs.length;

    if (cacheOutdated) {
      console.log("Tab content cache is outdated. Database has been updated in the meantime!");
    }

    if (cacheInvalid) {
      console.log("Cache is invalid. New app version?");
    }

    for (let i = 0; i < tabCount; i++) {
      await this.populateTab(i, cacheOutdated, cacheInvalid, force);
    }
  }

  async populateTab(index, cacheOutdated, cacheInvalid, force) {
    let currentMetaTab = this.metaTabs[index];
    if (currentMetaTab == null) {
      return;
    }

    if (cacheOutdated || cacheInvalid || force) {
      currentMetaTab.cachedText = null;
      currentMetaTab.cachedReferenceVerse = null;
    }

    let isSearch = (currentMetaTab.textType == 'search_results');
    await app_controller.text_controller.prepareForNewText(true, isSearch, index);

    if (currentMetaTab.textType == 'search_results') {
      await app_controller.module_search_controller.populateSearchMenu(index);

      let searchResultBookId = -1; // all books requested
      if (app_controller.module_search_controller.searchResultsExceedPerformanceLimit(index)) {
        searchResultBookId = 0; // no books requested - only list headers at first
      }

      await app_controller.module_search_controller.renderCurrentSearchResults(
        searchResultBookId,
        index,
        undefined,
        currentMetaTab.cachedText
      );

    } else {
      const isInstantLoadingBook = await app_controller.translation_controller.isInstantLoadingBook(
        currentMetaTab.getBibleTranslationId(),
        currentMetaTab.getSecondBibleTranslationId(),
        currentMetaTab.getBook()
      );

      await app_controller.text_controller.requestTextUpdate(
        currentMetaTab.elementId,
        currentMetaTab.book,
        currentMetaTab.tagIdList,
        currentMetaTab.cachedText,
        currentMetaTab.cachedReferenceVerse,
        null,
        currentMetaTab.xrefs,
        currentMetaTab.chapter,
        isInstantLoadingBook,
        index
      );
    }
  }

  async loadTabConfiguration(force=false) {
    const bibleTranslationSettingAvailable = await ipcSettings.has('bibleTranslation');
    const secondBibleTranslationSettingAvailable = await ipcSettings.has('secondBibleTranslation');

    if (bibleTranslationSettingAvailable) {
      this.defaultBibleTranslationId = await ipcSettings.get('bibleTranslation');
    }

    if (secondBibleTranslationSettingAvailable) {
      this.defaultSecondBibleTranslationId = await ipcSettings.get('secondBibleTranslation');
    }

    var loadedTabCount = 0;

    if (await cacheController.hasCachedItem('tabConfiguration')) {
      uiHelper.showTextLoadingIndicator();
      verseListController.showVerseListLoadingIndicator();
      loadedTabCount = await this.loadMetaTabsFromSettings();

      if (loadedTabCount > 0) {
        await this.populateFromMetaTabs(force);
      } else {
        verseListController.hideVerseListLoadingIndicator();
        uiHelper.hideTextLoadingIndicator();
      }
    }

    // If no tabs are loaded from a previous session we need to explicitly invoke the on-tab-added event on the first tab
    if (loadedTabCount == 0) {
      eventController.publish('on-tab-added', 0);
    }

    // Give the UI some time to render
    await waitUntilIdle();

    // Restore the previously selected tab if available
    if (loadedTabCount > 0 && await cacheController.hasCachedItem('selectedTabIndex')) {
      const selectedTabIndex = await cacheController.getCachedItem('selectedTabIndex', 0);
      // Make sure the index is valid (not larger than the number of loaded tabs)
      const validIndex = Math.min(selectedTabIndex, loadedTabCount - 1);
      this.tabs.tabs('select', validIndex);
      await eventController.publishAsync('on-tab-selected', validIndex);
    } else {
      // Call this method explicitly to initialize the first tab
      await eventController.publishAsync('on-tab-selected', 0);
    }

    await waitUntilIdle();

    this.loadingCompleted = true;
    this.persistanceEnabled = true;
    
    // Notify that tab controller has completed loading
    eventController.publish('on-tab-controller-loaded');
  }

  initTabs() {
    this.tabs = $("#" + this.tabsElement).tabs();
    this.updateFirstTabCloseButton();

    var addTabText = i18n.t("bible-browser.open-new-tab");
    var addTabButton = `<li><button id='add-tab-button' class='fg-button ui-corner-all ui-state-default' title='${addTabText}' i18n='[title]bible-browser.open-new-tab'><i class="fas fa-plus"></i></button></li>`;
    $("#" + this.tabsElement).find('.ui-tabs-nav').append(addTabButton);

    this.addTabElement = 'add-tab-button';

    // eslint-disable-next-line no-unused-vars
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

        if (metaTab.addedInteractively || metaTab.selectCount > 1) { // We only run the on-tab-selected callbacks
          // if the tab has been added interactively
          // or after the initial select.
          // This is necessary to ensure good visual performance when
          // adding tabs automatically (like for finding all Strong's references).

          index = this.getCorrectedIndex(ui);
          ui.index = index;

          if (metaTab.selectCount > 1) {
            this.savePreviousTabScrollPosition();
          }

          // Update the current tab title label when switching tabs
          var tabsElement = $('#' + this.tabsElement);
          var tab = $(tabsElement.find('li')[index]);
          var link = $(tab.find('a')[0]);
          var linkText = link.html().split(' ');
          linkText.pop(); // Remove the translation ID part if present
          var title = linkText.join(' ');
          var currentTabTitleLabel = tabsElement.find('.current-tab-title-label');
          currentTabTitleLabel.html(title);

          if (metaTab.getTextType() != null) {
            var currentVerseListFrame = verseListController.getCurrentVerseListFrame(index);
            var currentVerseList = verseListController.getCurrentVerseList(index);
            var currentVerseListHeader = verseListController.getCurrentVerseListHeader(index);
            var currentReferenceVerse = referenceVerseController.getCurrentReferenceVerse(index);
            var selectAllVersesButton = currentVerseListFrame.find('.select-all-verses-button');
            var currentTagDistributionMatrix = currentVerseListFrame.find('.tag-distribution-matrix-wrapper');

            selectAllVersesButton.hide();
            currentVerseList.hide();
            currentVerseListHeader.hide();
            currentReferenceVerse.hide();
            currentTagDistributionMatrix.hide();

            verseListController.showVerseListLoadingIndicator(index);
            app_controller.verse_statistics_chart.resetChart(index);
          }

          this.lastSelectedTabIndex = index;
          
          // Save only the selected tab index when tab selection changes
          if (this.persistanceEnabled) {
            cacheController.setCachedItem('selectedTabIndex', index);
          }
          
          eventController.publish('on-tab-selected', ui.index);
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
              var currentVerseList = verseListController.getCurrentVerseList(index);
              var currentVerseListHeader = verseListController.getCurrentVerseListHeader(index);
              var currentReferenceVerse = referenceVerseController.getCurrentReferenceVerse(index);
              var currentVerseListFrame = verseListController.getCurrentVerseListFrame(index);
              var selectAllVersesButton = currentVerseListFrame.find('.select-all-verses-button');
              var currentTagDistributionMatrix = currentVerseListFrame.find('.tag-distribution-matrix-wrapper');

              currentVerseList.show();

              if (metaTab.hasReferenceVerse()) {
                currentReferenceVerse.show();
              }

              selectAllVersesButton.show();

              if (metaTab.getTextType() == 'search_results' || metaTab.getTextType() == 'tagged_verses') {
                currentVerseListHeader.show();
              }
              
              if (metaTab.getTextType() == 'tagged_verses') {
                currentTagDistributionMatrix.show();
              }

              await app_controller.verse_statistics_chart.repaintChart(index);

              verseListController.hideVerseListLoadingIndicator(index);
              this.restoreScrollPosition(index);
            }
          }
        })();
      }
    });

    this.tabs.find('span.close-tab-button').unbind();

    // Close icon: removing the tab on click
    this.tabs.find('span.close-tab-button').on("mousedown", (event) => {
      if (!this.tabOperationsEnabled) {
        return;
      }

      this.removeTab(event);

      setTimeout(() => {
        app_controller.book_selection_menu.highlightCurrentlySelectedBookInMenu();
      }, 250);
    });

    uiHelper.configureButtonStyles('.ui-tabs-nav');
  }

  saveTabScrollPosition(tabIndex=undefined) {
    // If the tab that we shall save the scroll position for does not exist we cancel this operation.
    // This may happen when a tab is closed.
    if (tabIndex != null && tabIndex >= this.metaTabs.length) {
      return;
    }
    
    var metaTab = this.getTab(tabIndex);
    var firstVerseListAnchor = verseListController.getFirstVisibleVerseAnchor();

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

  restoreScrollPosition(tabIndex=undefined) {
    var metaTab = this.getTab(tabIndex);

    if (metaTab != null) {
      var currentVerseListFrame = verseListController.getCurrentVerseListFrame(tabIndex);

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
    var selectedTabIndex = null;

    if (this.tabs != null) {
      selectedTabIndex = this.tabs.tabs("option").selected;
    }

    if (selectedTabIndex == null) {
      selectedTabIndex = 0;
    }

    return selectedTabIndex;
  }

  getSelectedTabId(index = undefined) {
    if (index === undefined) {
      index = this.getSelectedTabIndex();
    }

    var allTabsPanels = document.getElementById(this.tabsElement).querySelectorAll('.' + this.tabsPanelClass);

    if (index > allTabsPanels.length - 1) {
      index = allTabsPanels.length - 1;
    }

    var selectedTabsPanel = allTabsPanels[index];
    var selectedTabsPanelId = "verse-list-tabs-1";

    if (selectedTabsPanel != null) {
      selectedTabsPanelId = selectedTabsPanel.getAttribute('id');
    }

    return selectedTabsPanelId;
  }

  async addTab(metaTab = undefined, interactive = true, bibleTranslationId = undefined) {
    if (!this.tabOperationsEnabled) {
      return;
    }

    var initialLoading = true;
    if (metaTab === undefined) {
      initialLoading = false;

      if (bibleTranslationId != undefined) {
        this.defaultBibleTranslationId = bibleTranslationId;
      }

      metaTab = new Tab(this.defaultBibleTranslationId, interactive);
    }

    metaTab.elementId = this.tabsElement + '-' + this.nextTabId;
    this.metaTabs.push(metaTab);

    var li = $(this.tabTemplate.replace(/#\{href\}/g, "#" + metaTab.elementId).replace(/#\{label\}/g, this.defaultLabel));
    this.tabs.find(".ui-tabs-nav").find('li').last().remove();
    this.tabs.find(".ui-tabs-nav").append(li);
    this.tabs.append("<div id='" + metaTab.elementId + "' class='" + this.tabsPanelClass + "'>" + this.tabHtmlTemplate + "</div>");

    if (interactive) {
      this.lastSelectedTabIndex = this.getSelectedTabIndex();
      this.savePreviousTabScrollPosition();
    }

    this.reloadTabs();

    let newTabIndex = this.metaTabs.length - 1;

    if (!initialLoading) {
      this.tabs.tabs('select', newTabIndex);
    }

    this.nextTabId++;

    this.updateFirstTabCloseButton();

    if (!initialLoading) {
      await eventController.publish('on-tab-added', newTabIndex);
    }

    return metaTab;
  }

  removeTab(event) {
    var href = $(event.target).closest("li").find('a').attr('href');
    var all_tabs = $(event.target).closest("ul").find("li");

    for (var i = 0; i < all_tabs.length; i++) {
      var current_href = $(all_tabs[i]).find('a').attr('href');
      if (current_href == href) {
        this.removeTabByIndex(i);
        break;
      }
    }
  }

  removeTabByIndex(index) {
    if (index < 0 || index >= this.metaTabs.length) {
      return;
    }

    this.metaTabs.splice(index, 1);
    this.tabs.tabs("remove", index);
    this.updateFirstTabCloseButton();
    eventController.publish('on-tab-removed');

    this.saveTabConfiguration();
  }

  removeAllExtraTabs() {
    var all_tabs = this.tabs.find("li");

    for (var i = 2; // We only go down to 2, because that's the initial amount of list elements (first tab + add tab button)
      i < all_tabs.length;
      i++) {

      this.metaTabs.pop();
      this.tabs.tabs("remove", 1);
    }
  }

  /**
   * Resets the state of TabController to the initial state (corresponds to the state right after first installation)
   */
  async reset() {
    this.removeAllExtraTabs();
    this.setBibleTranslationId(null);

    const tab = this.getTab();
    if (tab != null) {
      tab.setTagIdList("");
      tab.setXrefs(null);
      tab.setReferenceVerseElementId(null);
    }

    this.setCurrentTabBook(null, "", "", null);
    this.resetCurrentTabTitle();
    if (this.persistanceEnabled) {
      await cacheController.deleteCache('tabConfiguration');
    }
  }

  /**
   * @param {Number} index The tab index of the requested Tab
   * @returns @type Tab
   */
  getTab(index = undefined) {
    if (index === undefined) {
      index = this.getSelectedTabIndex();
    }

    if (index >= this.metaTabs.length) {
      index = this.metaTabs.length - 1;
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
    if (platformHelper.isMobile()) {
      this.setTabTitle('');
    } else {
      this.setTabTitle(this.defaultLabel);
    }
  }

  setTabTitle(title, bibleTranslationId = undefined, index = undefined) {
    if (index === undefined) {
      index = this.getSelectedTabIndex();
    }

    var tabsElement = $('#' + this.tabsElement);
    var tab = $(tabsElement.find('li')[index]);
    var link = $(tab.find('a')[0]);
    var tabTitle = title;
    if (bibleTranslationId !== undefined) {
      tabTitle += ' [' + bibleTranslationId + ']';
    }

    var currentTitle = link.html();
    if (tabTitle != currentTitle) {
      link.html(tabTitle);
    }

    // Only update the current tab title label if this is the currently selected tab
    if (index === this.getSelectedTabIndex()) {
      var currentTabTitleLabel = tabsElement.find('.current-tab-title-label');
      currentTabTitleLabel.html(title);
    }
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

  setCurrentTabBook(bookCode, bookTitle, referenceBookTitle, chapter=undefined) {
    const tab = this.getTab();

    if (tab != null) {
      tab.setBook(bookCode, bookTitle, referenceBookTitle, chapter);
      var currentTranslationId = tab.getBibleTranslationId();

      if (bookTitle != undefined && bookTitle != null) {
        this.setTabTitle(bookTitle, currentTranslationId);
      }
    }
  }

  setCurrentTagTitleList(tagTitleList, verseReference, index = undefined) {
    this.getTab(index).setTagTitleList(tagTitleList);
    var currentTranslationId = this.getTab(index).getBibleTranslationId();

    tagTitleList = verseListTitleHelper.shortenTitleList(tagTitleList);

    if (tagTitleList != undefined && tagTitleList != null) {
      if (tagTitleList == "") {
        this.resetCurrentTabTitle();
      } else {
        var tagTitle = "";
        if (verseReference != null) tagTitle += verseReference + " &ndash; ";

        if (platformHelper.isElectron() && !platformHelper.isMobile()) {
          tagTitle += i18n.t('tags.verses-tagged-with') + " ";
        }

        if (!platformHelper.isMobile()) {
          tagTitle += "<i>";
        }

        tagTitle += tagTitleList;

        if (!platformHelper.isMobile()) {
          tagTitle += "</i>";
        }

        this.setTabTitle(tagTitle, currentTranslationId, index);
        this.getTab(index).setTaggedVersesTitle(tagTitle);
      }
    }
  }

  setCurrentTabXrefTitle(xrefTitle, index = undefined) {
    this.getTab(index).setXrefTitle(xrefTitle);
    var currentTranslationId = this.getTab(index).getBibleTranslationId();

    if (xrefTitle != undefined && xrefTitle != null) {
      if (xrefTitle == "") {
        this.resetCurrentTabTitle();
      } else {
        this.setTabTitle(xrefTitle, currentTranslationId, index);
      }
    }
  }

  setTabSearch(searchTerm, index = undefined) {
    this.getTab(index).setSearchTerm(searchTerm);
    
    const showSearchResultsInPopup = app_controller.optionsMenu._showSearchResultsInPopupOption.isChecked;

    if (!showSearchResultsInPopup) {
      var currentTranslationId = this.getTab(index).getBibleTranslationId();

      if (searchTerm != undefined && searchTerm != null) {
        var searchTabTitle = this.getSearchTabTitle(searchTerm);
        this.setTabTitle(searchTabTitle, currentTranslationId, index);
      }
    }
  }

  getSearchTabTitle(searchTerm) {
    return i18n.t("menu.search") + ": " + searchTerm;
  }

  setLastHighlightedNavElementIndex(index, isHeaderNav = false) {
    var currentTabIndex = this.getSelectedTabIndex();

    if (isHeaderNav) {
      this.metaTabs[currentTabIndex].lastHighlightedHeaderIndex = index;
    } else {
      this.metaTabs[currentTabIndex].lastHighlightedChapterIndex = index;
    }
  }

  getLastHighlightedNavElementIndex(isHeaderNav = false) {
    var currentTabIndex = this.getSelectedTabIndex();

    if (isHeaderNav) {
      return this.metaTabs[currentTabIndex].lastHighlightedHeaderIndex;
    } else {
      return this.metaTabs[currentTabIndex].lastHighlightedChapterIndex;
    }
  }

  clearLastHighlightedNavElementIndex() {
    var currentTabIndex = this.getSelectedTabIndex();
    this.metaTabs[currentTabIndex].lastHighlightedHeaderIndex = null;
    this.metaTabs[currentTabIndex].lastHighlightedChapterIndex = null;
  }

  setBibleTranslationId(bibleTranslationId) {
    const tab = this.getTab();

    if (tab != null) {
      tab.setBibleTranslationId(bibleTranslationId);
    }

    if (bibleTranslationId != null) {
      this.defaultBibleTranslationId = bibleTranslationId;
      app_controller.info_popup.enableCurrentAppInfoButton();
    }
  }

  setSecondBibleTranslationId(secondBibleTranslationId, tabIndex=undefined) {
    const tab = this.getTab(tabIndex);

    if (tab != null) {
      tab.setSecondBibleTranslationId(secondBibleTranslationId);

      if (this.persistanceEnabled) {
        this.saveTabConfiguration();
      }
    }

    if (secondBibleTranslationId != null) {
      this.defaultSecondBibleTranslationId = secondBibleTranslationId;
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

  isCurrentTab(tabIndex) {
    var selectedTabIndex = this.getSelectedTabIndex();
    return (tabIndex == selectedTabIndex);
  }

  async getCurrentTabNoteFileId(tabIndex=undefined) {
    const currentTab = this.getTab(tabIndex);
    let noteFileId = null;

    if (currentTab.getTextType() == 'tagged_verses') {
      const tagIds = currentTab.getTagIdList().split(',');

      if (tagIds.length > 0) {
        const firstTagId = parseInt(tagIds[0]);
        const tagObject = await tag_assignment_panel.tag_store.getTag(firstTagId);

        if (tagObject != null) {
          noteFileId = tagObject.noteFileId;
        }
      }
    }

    return noteFileId;
  }

  async updateTabTitleAfterTagRenaming(old_title, new_title) {
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

        currentMetaTab.setTagTitleList(tag_list.join(', '));

        var tagTitle = "";

        var referenceVerseElement = document.querySelector('.' + currentMetaTab.getReferenceVerseElementId());
        if (referenceVerseElement != null) {
          var localizedReference = await this.verseBoxHelper.getLocalizedVerseReference(referenceVerseElement);
          if (localizedReference != null) tagTitle += localizedReference + " &ndash; ";
        }

        if (platformHelper.isElectron() && !platformHelper.isMobile()) {
          tagTitle += i18n.t('tags.verses-tagged-with') + " ";
        }

        if (!platformHelper.isMobile()) {
          tagTitle += "<i>";
        }

        tagTitle += "<i>" + tag_list.join(', ') + "</i>";

        if (!platformHelper.isMobile()) {
          tagTitle += "</i>";
        }


        this.setTabTitle(tagTitle, currentMetaTab.getBibleTranslationId(), i);
        currentMetaTab.setTaggedVersesTitle(tagTitle);
      }
    }
  }

  async updateTabTitlesAfterLocaleChange() {
    for (let i = 0; i < this.metaTabs.length; i++) {
      const currentMetaTab = this.metaTabs[i];

      switch (currentMetaTab.getTextType()) {
        case 'book': {
          let referenceBookTitle = currentMetaTab.getReferenceBookTitle();

          if (referenceBookTitle != null) {
            currentMetaTab.bookTitle = await i18nHelper.getSwordTranslation(currentMetaTab.getReferenceBookTitle());
            const tabTitle = currentMetaTab.bookTitle;
            this.setTabTitle(tabTitle, currentMetaTab.getBibleTranslationId(), i);
          }
        }
          break;

        case 'search_results': {
          const tabTitle = this.getSearchTabTitle(currentMetaTab.getSearchTerm());
          this.setTabTitle(tabTitle, currentMetaTab.getBibleTranslationId(), i);
        }
          break;

        case 'tagged_verses': {
          let localizedReference = null;
          if (currentMetaTab.getReferenceVerseElementId() != null) {
            localizedReference = await referenceVerseController.getLocalizedReferenceVerse(i);
          }
          this.setCurrentTagTitleList(currentMetaTab.tagTitleList, localizedReference, i);
        }
          break;

        case 'xrefs': {
          const localizedReference = await referenceVerseController.getLocalizedReferenceVerse(i);
          const tabTitle = verseListTitleHelper.getXrefsVerseListTitle(localizedReference);
          this.setCurrentTabXrefTitle(tabTitle, i);
        }
          break;
      }
    }
  }

  async onBibleTranslationChanged({ from: oldBibleTranslationId, to: newBibleTranslationId }, isSecondBible=false) {
    var currentTab = this.getTab();

    if (!isSecondBible) {
      this.setBibleTranslationId(newBibleTranslationId);
      this.refreshBibleTranslationInTabTitle(newBibleTranslationId);
    } else {
      this.setSecondBibleTranslationId(newBibleTranslationId);
    }

    // The tab search is not valid anymore if the translation is changing. Therefore we reset it.
    if (currentTab.tab_search != null) {
      currentTab.tab_search.resetSearch();
    }

    var isInstantLoadingBook = true;

    if (currentTab.getTextType() == 'book') {
      // We set the previous book to the current book. This will be used in NavigationPane to avoid reloading the chapter list.
      currentTab.setPreviousBook(currentTab.getBook());

      isInstantLoadingBook = await app_controller.translation_controller.isInstantLoadingBook(newBibleTranslationId, currentTab.getSecondBibleTranslationId(), currentTab.getBook());
    }

    app_controller.commentaryPanel.setRefreshBlocked(true);

    if (currentTab.getTextType() == 'search_results') {
      if (!isSecondBible) {
        // Repeat the search with the new translation
        await app_controller.text_controller.prepareForNewText(true, true);
        app_controller.module_search_controller.startSearch(null, this.getSelectedTabIndex(), currentTab.getSearchTerm());
      } else {
        // We need to re-render the search results with the change of the second translation
        currentTab.setLocation(null);
        await app_controller.module_search_controller.reRenderCurrentSearchResults();
      }
    } else {
      if (!this.isCurrentTabEmpty()) {
        this.saveTabScrollPosition();

        let selectedVerses = await app_controller.verse_selection.getSelectionAsVerseObjects(oldBibleTranslationId, newBibleTranslationId);

        await app_controller.text_controller.prepareForNewText(false, false);
        await app_controller.text_controller.requestTextUpdate(
          this.getSelectedTabId(),
          currentTab.getBook(),
          currentTab.getTagIdList(),
          null,
          null,
          null,
          currentTab.getXrefs(),
          currentTab.getChapter(),
          isInstantLoadingBook
        );

        if (currentTab.getReferenceVerseElementId() != null) {
          await referenceVerseController.updateReferenceVerseTranslation(oldBibleTranslationId, newBibleTranslationId);
        }

        if (currentTab.getTextType() == 'book') {
          app_controller.tag_statistics.highlightFrequentlyUsedTags();
        }

        app_controller.verse_selection.applySelectionFromVerseObjects(selectedVerses);
      }
    }

    app_controller.commentaryPanel.setRefreshBlocked(false);
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

  async refreshBibleTranslations() {
    for (let i = 0; i < this.metaTabs.length; i++) {
      const tab = this.metaTabs[i];
      // Reinitialize Bible translations for the tab
      await app_controller.translation_controller.initTranslationsMenu(-1, i, true);
    }
  }

  /**
   * Closes any tabs that have a tagged verse list where the deleted tag is part of the list of tags opened.
   * If the closed tab is the last one remaining, an additional empty tab is opened before closing it.
   * 
   * @param {Number} deletedTagId - The ID of the deleted tag.
   */
  async closeTabsWithDeletedTag(deletedTagId) {
    for (let i = this.metaTabs.length - 1; i >= 0; i--) {
      const currentTab = this.metaTabs[i];
      if (currentTab.getTextType() === 'tagged_verses') {
        const tagIdList = currentTab.getTagIdList().split(',').map(Number);
        if (tagIdList.includes(deletedTagId)) {
          // If this is the last tab, add a new empty tab before removing it
          if (this.metaTabs.length === 1) {
            await this.addTab();
          }

          this.metaTabs.splice(i, 1);
          this.tabs.tabs("remove", i);
        }
      }
    }

    this.updateFirstTabCloseButton();
    this.saveTabConfiguration();
  }
}

module.exports = TabController;

