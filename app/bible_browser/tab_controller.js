/* This file is part of Ezra Project.

   Copyright (C) 2019 Tobias Klein <contact@ezra-project.net>

   Ezra Project is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   Ezra Project is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Project. See the file COPYING.
   If not, see <http://www.gnu.org/licenses/>. */

const Mousetrap = require('mousetrap');

class Tab {
  constructor(defaultBibleTranslationId) {
    this.elementId = null;
    this.book = null;
    this.bookTitle = null;
    this.tagIdList = "";
    this.tagTitleList = "";
    this.textIsBook = false;
    this.lastHighlightedNavElementIndex = null;
    this.bibleTranslationId = defaultBibleTranslationId;
  }
}

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

  saveTabConfiguration() {
    if (this.persistanceEnabled) {
      //console.log('Saving tab configuration');
      this.settings.set('tabConfiguration', this.metaTabs);
    }
  }

  deleteTabConfiguration() {
    if (this.persistanceEnabled) {
      //console.log('Saving tab configuration');
      this.settings.delete('tabConfiguration');
    }  
  }
  
  async loadTabConfiguration() {
    if (this.settings.has('tabConfiguration')) {
      bible_browser_controller.showVerseListLoadingIndicator();

      var savedMetaTabs = this.settings.get('tabConfiguration');
      console.log("Loading " + savedMetaTabs.length + " tabs from configuration!");

      for (var i = 0; i < savedMetaTabs.length; i++) {
        var currentMetaTab = savedMetaTabs[i];
        console.log("Creating tab " + i + " from saved entry ... ");
        //console.log("Bible translation: " + currentMetaTab.bibleTranslationId);

        if (i == 0) {
          currentMetaTab.elementId = this.metaTabs[0].elementId;
          this.metaTabs[0] = currentMetaTab;
        } else {
          this.addTab(currentMetaTab);
        }

        var tabTitle = this.getMetaTabTitle(currentMetaTab);
        this.setTabTitle(i, tabTitle);
      }

      for (var i = 0; i < savedMetaTabs.length; i++) {
        var currentMetaTab = savedMetaTabs[i];
        
        await bible_browser_controller.text_loader.requestTextUpdate(
          currentMetaTab.elementId,
          currentMetaTab.book,
          currentMetaTab.tagIdList,
          false,
          i
        );
      }

      bible_browser_controller.hideVerseListLoadingIndicator();
    }

    // Call these methods explicitly to initialize the first tab 
    this.onTabAdded();
    this.onTabSelected();

    this.loadingCompleted = true;
    this.persistanceEnabled = true;
  }

  initTabs() {
    this.tabs = $("#" + this.tabsElement).tabs();
  }

  reloadTabs() {
    this.tabs.tabs("destroy");
    this.initTabs();
    this.bindEvents();
  }

  bindEvents() {
    this.tabs.tabs({
      select: (event, ui) => {
        this.onTabSelected(event, ui);
      }
    });

    this.tabs.find('span.ui-icon-close').unbind();

    // Close icon: removing the tab on click
    this.tabs.find('span.ui-icon-close').on( "click", (event) => {
      this.removeTab(event);
      this.saveTabConfiguration();
    });
  }

  getSelectedTabIndex() {
    var selectedTabIndex = this.tabs.tabs("option").selected;
    return selectedTabIndex;
  }

  getSelectedTabId(index=undefined) {
    if (index === undefined) {
      var index = this.getSelectedTabIndex();
    }

    var allTabsPanels = $('#' + this.tabsElement).find('.' + this.tabsPanelClass);
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

    this.onTabAdded(this.tabCounter - 1);
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
  }

  removeAllExtraTabs() {
    var all_tabs = this.tabs.find("li");
    for (var i = 1; i < all_tabs.length; i++) {
      this.metaTabs.pop();
      this.tabs.tabs("remove", 1);
      this.tabCounter--;
    }   
  }

  resetCurrentTabTitle() {
    this.setCurrentTabTitle(this.defaultLabel);
  }

  getMetaTabTitle(metaTab) {
    var tabTitle = "";

    if (metaTab.bookTitle != null) {
      tabTitle = metaTab.bookTitle;
    } else if (metaTab.tagTitleList != "") {
      tabTitle = metaTab.tagTitleList;
    }

    return tabTitle;
  }

  setTabTitle(index, title) {
    var tabsElement = $('#' + this.tabsElement);
    var tab = $(tabsElement.find('li')[index]);
    var link = $(tab.find('a')[0]);
    link.text(title);
  }

  setCurrentTabTitle(title) {
    var tabsElement = $('#' + this.tabsElement);
    var selectedTab = tabsElement.find('.ui-tabs-selected');
    var link = $(selectedTab.find('a')[0]);
    link.text(title);
  }

  setCurrentTabBook(bookCode, bookTitle) {
    var currentTabIndex = this.getSelectedTabIndex();
    this.metaTabs[currentTabIndex].book = bookCode;
    this.metaTabs[currentTabIndex].bookTitle = bookTitle;

    if (bookTitle != undefined && bookTitle != null) {
      this.setCurrentTabTitle(bookTitle);
    }
  }

  getCurrentTabBook(index=undefined) {
    if (index === undefined) {
      var index = this.getSelectedTabIndex();
    }

    var book = null;
    if (index < this.metaTabs.length) {
      book = this.metaTabs[index].book;
    }

    return book;
  }

  setCurrentTagIdList(tagIdList) {
    var currentTabIndex = this.getSelectedTabIndex();
    this.metaTabs[currentTabIndex].tagIdList = tagIdList;
  }

  setCurrentTagTitleList(tagTitleList) {
    var currentTabIndex = this.getSelectedTabIndex();
    this.metaTabs[currentTabIndex].tagTitleList = tagTitleList;

    if (tagTitleList != undefined && tagTitleList != null) {

      if (tagTitleList == "") {
        this.resetCurrentTabTitle();
      } else {
        this.setCurrentTabTitle(tagTitleList);
      }
    }
  }

  getCurrentTagIdList(index=undefined) {
    if (index === undefined) {
      var index = this.getSelectedTabIndex();
    }

    var tagIdList = null;
    if (index < this.metaTabs.length) {
      tagIdList = this.metaTabs[index].tagIdList;
    }

    return tagIdList;
  }

  getCurrentTagTitleList(index=undefined) {
    if (index === undefined) {
      var index = this.getSelectedTabIndex();
    }

    var tagTitleList = null;
    if (index < this.metaTabs.length) {
      tagTitleList = this.metaTabs[index].tagTitleList;
    }

    return tagTitleList;
  }

  setCurrentTextIsBook(isBook) {
    var currentTabIndex = this.getSelectedTabIndex();
    this.metaTabs[currentTabIndex].textIsBook = isBook;
  }

  isCurrentTextBook(index=undefined) {
    if (index === undefined) {
      var index = this.getSelectedTabIndex();
    }

    var textIsBook = null;
    if (index < this.metaTabs.length) {
      textIsBook = this.metaTabs[index].textIsBook;
    }

    return textIsBook;
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
    //console.log("Setting current bible translation id: " + bibleTranslationId);
    var currentTabIndex = this.getSelectedTabIndex();
    this.metaTabs[currentTabIndex].bibleTranslationId = bibleTranslationId;
    this.defaultBibleTranslationId = bibleTranslationId;
    bible_browser_controller.translation_controller.enableCurrentTranslationInfoButton();
  }

  getCurrentBibleTranslationId(index=undefined) {
    if (index === undefined) {
      var index = this.getSelectedTabIndex();
    }
    return this.metaTabs[index].bibleTranslationId;
  }

  async getCurrentBibleTranslationName() {
    return await models.BibleTranslation.getName(this.getCurrentBibleTranslationId());
  }

  isCurrentTabEmpty() {
    var currentTabIndex = this.getSelectedTabIndex();
    var currentTab = this.metaTabs[currentTabIndex];
    return currentTab.book == null && currentTab.tagIdList == "";
  }
}

module.exports = TabController;

