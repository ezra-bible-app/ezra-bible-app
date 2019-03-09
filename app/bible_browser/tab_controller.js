/* This file is part of Ezra Project.

   Copyright (C) 2019 Tobias Klein <contact@tklein.info>

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

class TabController {
  constructor() {
  }

  init(tabsElement, tabsPanelClass, tabHtmlTemplate, onTabSelected, onTabAdded) {
    this.tabsElement = tabsElement;
    this.tabsPanelClass = tabsPanelClass;
    this.tabHtmlTemplate = tabHtmlTemplate;
    this.onTabSelected = onTabSelected;
    this.onTabAdded = onTabAdded;
    this.defaultLabel = "-------------";
    
    this.tabTemplate = "<li><a href='#{href}'>#{label}</a> <span class='ui-icon ui-icon-close' role='presentation'>Remove Tab</span></li>",
    this.tabCounter = 2;
    this.tabId = 2;

    this.currentBooks = [];
    this.currentTagIdLists = [];
    this.currentTagTitleLists = [];
    this.currentTextIsBook = [];

    Mousetrap.bind('ctrl+t', () => {
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
      var href = $(event.target).closest("li").find('a').attr('href');

      var all_tabs = $(event.target).closest("ul").find("li");
      var index = -1;
      for (var i = 0; i < all_tabs.length; i++) {
        var current_href = $(all_tabs[i]).find('a').attr('href');
        if (current_href == href) {
          this.currentBooks.splice(i, 1);
          this.currentTagIdLists.splice(i, 1);
          this.currentTagTitleLists.splice(i, 1);
          this.currentTextIsBook.splice(i, 1);

          this.tabs.tabs("remove", i);
          this.tabCounter--;
          break;
        }
      }
    });
  }

  getSelectedTabIndex() {
    var selectedTabIndex = this.tabs.tabs("option").selected;
    return selectedTabIndex;
  }

  getSelectedTabId() {
    var selectedTabIndex = this.getSelectedTabIndex();
    var allTabsPanels = $('#' + this.tabsElement).find('.' + this.tabsPanelClass);
    var selectedTabsPanel = $(allTabsPanels[selectedTabIndex]);
    var selectedTabsPanelId = selectedTabsPanel.attr('id');
    return selectedTabsPanelId;
  }

  addTab() {
    var id = this.tabsElement + '-' + this.tabId;
    var li = $( this.tabTemplate.replace( /#\{href\}/g, "#" + id ).replace( /#\{label\}/g, this.defaultLabel ) );

    this.tabs.find(".ui-tabs-nav").append(li);
    this.tabs.append("<div id='" + id + "' class='" + this.tabsPanelClass + "'>" + this.tabHtmlTemplate + "</div>");
    this.reloadTabs();
    this.tabs.tabs('select', this.tabCounter - 1);
    this.tabCounter++;
    this.tabId++;
    this.currentBooks.push(null);
    this.currentTagIdLists.push("");
    this.currentTagTitleLists.push("");
    this.currentTextIsBook.push(false);
    this.onTabAdded();
  }

  setCurrentTabTitle(title) {
    var tabsElement = $('#' + this.tabsElement);
    var selectedTab = tabsElement.find('.ui-tabs-selected');
    var link = $(selectedTab.find('a')[0]);
    link.text(title);
  }

  setCurrentTabBook(bookCode, bookTitle) {
    var currentTabIndex = this.getSelectedTabIndex();
    this.currentBooks[currentTabIndex] = bookCode;

    if (bookTitle != undefined && bookTitle != null) {
      this.setCurrentTabTitle(bookTitle);
    }
  }

  getCurrentTabBook(index=undefined) {
    if (index === undefined) {
      var index = this.getSelectedTabIndex();
    }

    return this.currentBooks[index];
  }

  setCurrentTagIdList(tagIdList) {
    var currentTabIndex = this.getSelectedTabIndex();
    this.currentTagIdLists[currentTabIndex] = tagIdList;
  }

  setCurrentTagTitleList(tagTitleList) {
    var currentTabIndex = this.getSelectedTabIndex();
    this.currentTagTitleLists[currentTabIndex] = tagTitleList;

    if (tagTitleList != undefined && tagTitleList != null) {

      if (tagTitleList == "") {
        this.setCurrentTabTitle(this.defaultLabel);
      } else {
        this.setCurrentTabTitle(tagTitleList);
      }
    }
  }

  getCurrentTagIdList(index=undefined) {
    if (index === undefined) {
      var index = this.getSelectedTabIndex();
    }

    return this.currentTagIdLists[index];
  }

  getCurrentTagTitleList(index=undefined) {
    if (index === undefined) {
      var index = this.getSelectedTabIndex();
    }

    return this.currentTagTitleLists[index];
  }

  setCurrentTextIsBook(isBook) {
    var currentTabIndex = this.getSelectedTabIndex();
    this.currentTextIsBook[currentTabIndex] = isBook;
  }

  isCurrentTextBook(index=undefined) {
    if (index === undefined) {
      var index = this.getSelectedTabIndex();
    }

    return this.currentTextIsBook[index];
  }
}

module.exports = TabController;

