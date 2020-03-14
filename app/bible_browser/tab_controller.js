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

const Mousetrap = require('mousetrap');
const Tab = require('./tab.js');

class TabController {
  constructor() {
    this.persistanceEnabled = false;
    this.defaultLabel = "-------------";
    this.tabTemplate = "<li><a href='#{href}'>#{label}</a> <span class='ui-icon ui-icon-close' role='presentation'>Remove Tab</span></li>",
    this.tabCounter = 1;
    this.nextTabId = 2;
    this.metaTabs = [];
    this.loadingCompleted = false;
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

    Mousetrap.bind('ctrl+t', () => {
      this.addTab();
      return false;
    });
    
    $('#' + this.addTabElement).on("click", (event) => {
      this.addTab();
      return false;
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

  saveTabConfiguration() {
    if (this.persistanceEnabled) {
      //console.log('Saving tab configuration');

      var savedMetaTabs = [];
      
      for (var i = 0; i < this.metaTabs.length; i++) {
        var copiedMetaTab = Object.assign({}, this.metaTabs[i]); 
        copiedMetaTab.searchResults = null;
        savedMetaTabs.push(copiedMetaTab);
      }

      this.settings.set('tabConfiguration', savedMetaTabs);
    }
  }

  deleteTabConfiguration() {
    if (this.persistanceEnabled) {
      //console.log('Saving tab configuration');
      this.settings.delete('tabConfiguration');
    }  
  }

  updateFirstTabCloseButton() {
    if (this.metaTabs.length > 1) {
      this.showFirstTabCloseButton();
    } else {
      this.hideFirstTabCloseButton();
    }
  }

  getFirstTabCloseButton() {
    var firstTabCloseButton = $($('#' + this.tabsElement).find('.ui-icon-close')[0]);
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

  loadMetaTabsFromSettings() {
    var savedMetaTabs = this.settings.get('tabConfiguration');
    var loadedTabCount = 0;

    for (var i = 0; i < savedMetaTabs.length; i++) {
      var currentMetaTab = Tab.fromJsonObject(savedMetaTabs[i]);

      if (!currentMetaTab.isValid()) {
        // We ignore the meta tab if it is invalid
        continue;
      }

      console.log("Creating tab " + loadedTabCount + " from saved entry ... ");

      currentMetaTab.selectCount = 0;

      if (loadedTabCount == 0) {
        currentMetaTab.elementId = this.metaTabs[0].elementId;
        this.metaTabs[0] = currentMetaTab;
        this.updateFirstTabCloseButton();
      } else {
        this.addTab(currentMetaTab);
      }

      var tabTitle = currentMetaTab.getTitle();
      this.setTabTitle(tabTitle, currentMetaTab.getBibleTranslationId(), loadedTabCount);
      loadedTabCount += 1;
    }

    if (loadedTabCount > 0) {
      console.log("Loaded " + loadedTabCount + " tabs from configuration!");
    }

    return loadedTabCount;
  }

  async populateFromMetaTabs() {
    for (var i = 0; i < this.metaTabs.length; i++) {
      var currentMetaTab = this.metaTabs[i];
      var isSearch = (currentMetaTab.textType == 'search_results');

      bible_browser_controller.text_loader.prepareForNewText(true, isSearch, i);

      if (currentMetaTab.textType == 'search_results') {
        await bible_browser_controller.module_search.startSearch(null, i, currentMetaTab.searchTerm);
      } else {
        await bible_browser_controller.text_loader.requestTextUpdate(
          currentMetaTab.elementId,
          currentMetaTab.book,
          currentMetaTab.tagIdList,
          null,
          i
        );
      }
    }
  }
  
  async loadTabConfiguration() {
    if (this.settings.has('bible_translation')) {
      this.defaultBibleTranslationId = this.settings.get('bible_translation');
    }

    if (this.settings.has('tabConfiguration')) {
      bible_browser_controller.showVerseListLoadingIndicator();
      var loadedTabCount = this.loadMetaTabsFromSettings();

      if (loadedTabCount > 0) {
        await this.populateFromMetaTabs();
      } else {
        bible_browser_controller.hideVerseListLoadingIndicator();
      }
    }

    // Call these methods explicitly to initialize the first tab 
    this.onTabAdded();
    this.onTabSelected();

    this.loadingCompleted = true;
    this.persistanceEnabled = true;
  }

  initTabs() {
    this.tabs = $("#" + this.tabsElement).tabs();
    this.updateFirstTabCloseButton();
  }

  reloadTabs() {
    this.tabs.tabs("destroy");
    this.initTabs();
    this.bindEvents();
  }

  bindEvents() {
    this.tabs.tabs({
      select: (event, ui) => {
        setTimeout(() => {
          this.onTabSelected(event, ui);
        }, 500);
      }
    });

    this.tabs.find('span.ui-icon-close').unbind();

    // Close icon: removing the tab on click
    this.tabs.find('span.ui-icon-close').on( "click", (event) => {
      this.removeTab(event);

      setTimeout(() => {
        bible_browser_controller.book_selection_menu.highlightCurrentlySelectedBookInMenu();
        this.saveTabConfiguration();
      }, 250);
    });
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

    var allTabsPanels = $("#" + this.tabsElement).find('.' + this.tabsPanelClass);
    var selectedTabsPanel = $(allTabsPanels[index]);
    var selectedTabsPanelId = selectedTabsPanel.attr('id');
    return selectedTabsPanelId;
  }

  addTab(metaTab=undefined) {
    var initialLoading = true;
    if (metaTab === undefined) {
      initialLoading = false;
      var metaTab = new Tab(this.defaultBibleTranslationId);
    }

    metaTab.elementId = this.tabsElement + '-' + this.nextTabId;
    this.metaTabs.push(metaTab);

    var li = $( this.tabTemplate.replace( /#\{href\}/g, "#" + metaTab.elementId ).replace( /#\{label\}/g, this.defaultLabel ) );
    this.tabs.find(".ui-tabs-nav").append(li);
    this.tabs.append("<div id='" + metaTab.elementId + "' class='" + this.tabsPanelClass + "'>" + this.tabHtmlTemplate + "</div>");

    this.reloadTabs();
    if (!initialLoading) {
      this.tabs.tabs('select', this.tabCounter);
    }

    this.tabCounter++;
    this.nextTabId++;

    this.updateFirstTabCloseButton();

    setTimeout(() => {
      this.onTabAdded(this.tabCounter - 1);
    }, 250);
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
    for (var i = 1; i < all_tabs.length; i++) {
      this.metaTabs.pop();
      this.tabs.tabs("remove", 1);
      this.tabCounter--;
    }   
  }

  /**
   * Resets the state of TabController to the initial state (corresponds to the state right after first installation)
   */
  reset() {
    this.removeAllExtraTabs();
    this.setCurrentBibleTranslationId(null);
    this.getTab().setTagIdList("");
    this.setCurrentTabBook(null, "");
    this.resetCurrentTabTitle();
    this.deleteTabConfiguration();
  }

  getTab(index=undefined) {
    if (index === undefined) {
      var index = this.getSelectedTabIndex();
    }

    return this.metaTabs[index];
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

    link.text(tabTitle);
  }

  getTabTitle() {
    var index = this.getSelectedTabIndex();
    var tabsElement = $('#' + this.tabsElement);
    var tab = $(tabsElement.find('li')[index]);
    var link = $(tab.find('a')[0]);
    var linkText = link.text().split(" ");
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

  setCurrentTagTitleList(tagTitleList) {
    this.getTab().setTagTitleList(tagTitleList);
    var currentTranslationId = this.getTab().getBibleTranslationId();

    if (tagTitleList != undefined && tagTitleList != null) {
      if (tagTitleList == "") {
        this.resetCurrentTabTitle();
      } else {
        this.setTabTitle(tagTitleList, currentTranslationId);
      }
    }
  }

  setTabSearch(searchTerm, index=undefined) {
    this.getTab(index).setSearchTerm(searchTerm);
    var currentTranslationId = this.getTab().getBibleTranslationId();

    if (searchTerm != undefined && searchTerm != null) {
      var searchTabTitle = this.getSearchTabTitle(searchTerm);
      this.setTabTitle(searchTabTitle, currentTranslationId, index);
    }
  }

  getSearchTabTitle(searchTerm) {
    return i18n.t("menu.search") + ": " + searchTerm;
  }

  setLastHighlightedNavElementIndex(index) {
    var currentTabIndex = this.getSelectedTabIndex();
    this.metaTabs[currentTabIndex].lastHighlightedNavElementIndex = index;
  }

  getLastHighlightedNavElementIndex() {
    var currentTabIndex = this.getSelectedTabIndex();
    return this.metaTabs[currentTabIndex].lastHighlightedNavElementIndex;
  }

  setCurrentBibleTranslationId(bibleTranslationId) {
    this.getTab().setBibleTranslationId(bibleTranslationId);

    if (bibleTranslationId != null) {
      this.defaultBibleTranslationId = bibleTranslationId;
      bible_browser_controller.translation_controller.enableCurrentTranslationInfoButton();
    }
  }

  getCurrentBibleTranslationName() {
    var module = nsi.getLocalModule(this.getTab().getBibleTranslationId());
    return module.description;
  }

  isCurrentTabEmpty() {
    var currentTabIndex = this.getSelectedTabIndex();
    var currentTab = this.metaTabs[currentTabIndex];
    return currentTab.book == null && currentTab.tagIdList == "";
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
        this.setTabTitle(tag_list.join(', '), currentMetaTab.getBibleTranslationId(), i);
      }
    }
  }
}

module.exports = TabController;

