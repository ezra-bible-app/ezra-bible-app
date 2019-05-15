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
    this.tagIdList = "";
    this.tagTitleList = "";
    this.textIsBook = false;
    this.lastHighlightedNavElementIndex = null;
    this.bibleTranslationId = defaultBibleTranslationId;
  }
}

class TabController {
  constructor() {
  }

  init(tabsElement, tabsPanelClass, addTabElement, tabHtmlTemplate, onTabSelected, onTabAdded, defaultBibleTranslationId) {
    this.tabsElement = tabsElement;
    this.tabsPanelClass = tabsPanelClass;
    this.addTabElement = addTabElement;
    this.tabHtmlTemplate = tabHtmlTemplate;
    this.onTabSelected = onTabSelected;
    this.onTabAdded = onTabAdded;
    this.defaultBibleTranslationId = defaultBibleTranslationId;
    this.defaultLabel = "-------------";
    
    this.tabTemplate = "<li><a href='#{href}'>#{label}</a> <span class='ui-icon ui-icon-close' role='presentation'>Remove Tab</span></li>",
    this.tabCounter = 1;
    this.nextTabId = 2;

    this.metaTabs = [];
    // Initialize the list with the first tab, which is there by default
    var newTab = new Tab(this.defaultBibleTranslationId);
    this.metaTabs.push(newTab);

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

  initTabs() {
    this.tabs = $("#" + this.tabsElement).tabs({
      select: (event, ui) => {
        this.onTabSelected(event, ui);
      }
    });

    this.bindEvents();
  }

  reloadTabs() {
    this.tabs.tabs("destroy");
    this.initTabs();
  }

  bindEvents() {
    this.tabs.find('span.ui-icon-close').unbind();

    // Close icon: removing the tab on click
    this.tabs.find('span.ui-icon-close').on( "click", (event) => {
      this.removeTab(event);
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

  addTab() {
    var newTab = new Tab(this.defaultBibleTranslationId);
    newTab.elementId = this.tabsElement + '-' + this.nextTabId;
    this.metaTabs.push(newTab);

    var li = $( this.tabTemplate.replace( /#\{href\}/g, "#" + newTab.elementId ).replace( /#\{label\}/g, this.defaultLabel ) );
    this.tabs.find(".ui-tabs-nav").append(li);
    this.tabs.append("<div id='" + newTab.elementId + "' class='" + this.tabsPanelClass + "'>" + this.tabHtmlTemplate + "</div>");
    this.reloadTabs();
    this.tabs.tabs('select', this.tabCounter);
    this.tabCounter++;
    this.nextTabId++;

    this.onTabAdded();
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

  setCurrentTabTitle(title) {
    var tabsElement = $('#' + this.tabsElement);
    var selectedTab = tabsElement.find('.ui-tabs-selected');
    var link = $(selectedTab.find('a')[0]);
    link.text(title);
  }

  setCurrentTabBook(bookCode, bookTitle) {
    var currentTabIndex = this.getSelectedTabIndex();
    this.metaTabs[currentTabIndex].book = bookCode;

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
    var currentTabIndex = this.getSelectedTabIndex();
    this.metaTabs[currentTabIndex].bibleTranslationId = bibleTranslationId;
    this.defaultBibleTranslationId = bibleTranslationId;
    bible_browser_controller.enableCurrentTranslationInfoButton();
  }

  getCurrentBibleTranslationId() {
    var currentTabIndex = this.getSelectedTabIndex();
    return this.metaTabs[currentTabIndex].bibleTranslationId;
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

