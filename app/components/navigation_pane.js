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

class NavigationPane {
  constructor() {
  }

  getCurrentNavigationPane(tabIndex) {
    var currentVerseListTabs = bible_browser_controller.getCurrentVerseListTabs(tabIndex);
    var navigationPane = currentVerseListTabs.find('.navigation-pane');
    return navigationPane;
  };

  initNavigationPaneForCurrentView(tabIndex=undefined) {
    var navigationPane = this.getCurrentNavigationPane(tabIndex);

    var currentTab = bible_browser_controller.tab_controller.getTab(tabIndex);
    var currentBook = currentTab.getBook();
    var currentTagTitleList = currentTab.getTagTitleList();
    var currentTextType = currentTab.getTextType();

    if (currentTextType == 'book' && currentBook != null) { // Book text mode

      navigationPane.removeClass('navigation-pane-books');
      navigationPane.addClass('navigation-pane-chapters');

    } else if (currentTextType == 'tagged_verses' && currentTagTitleList != null) { // Tagged verse list mode

      navigationPane.removeClass('navigation-pane-chapters');
      navigationPane.addClass('navigation-pane-books');

    } else if (currentTextType == 'search_results') {

      navigationPane.removeClass('navigation-pane-chapters');
      navigationPane.addClass('navigation-pane-books');
    }
    
    navigationPane.bind('mouseover', bible_browser_controller.verse_context_loader.hide_verse_expand_box);
  }

  highlightNavElement(navElementNumber) {
    var navElementIndex = navElementNumber - 1;
    var currentNavigationPane = this.getCurrentNavigationPane();
    var allNavElementLinks = currentNavigationPane.find('.navigation-link');
    var lastHighlightedNavElementIndex = bible_browser_controller.tab_controller.getLastHighlightedNavElementIndex();

    if ((allNavElementLinks.length - 1) >= navElementIndex &&
        (allNavElementLinks.length - 1) >= lastHighlightedNavElementIndex) {

      var lastHighlightedNavElementLink = $(allNavElementLinks[lastHighlightedNavElementIndex]);
      var highlightedNavElementLink = $(allNavElementLinks[navElementIndex]);

      lastHighlightedNavElementLink.removeClass('hl-nav-element');
      highlightedNavElementLink.addClass('hl-nav-element');
    }

    bible_browser_controller.tab_controller.setLastHighlightedNavElementIndex(navElementIndex);
  }

  updateChapterNavigation(tabIndex) {
    var navigationPane = this.getCurrentNavigationPane(tabIndex);
    var currentTab = bible_browser_controller.tab_controller.getTab(tabIndex);
    var currentBook = currentTab.getBook();
    var verse_counts = bible_chapter_verse_counts[currentBook];
    var i = 1;

    for (var key in verse_counts) {
      if (key == 'nil') {
        break;
      }

      var current_chapter_link = document.createElement('a');
      current_chapter_link.setAttribute('class', 'navigation-link');
      var href = 'javascript:bible_browser_controller.navigation_pane.goToChapter(' + i + ')';
      current_chapter_link.setAttribute('href', href);
      $(current_chapter_link).html(i);

      navigationPane.append(current_chapter_link);
      i++;
    }
  }

  updateBookNavigation(tabIndex) {
    var navigationPane = this.getCurrentNavigationPane(tabIndex);
    var currentVerseListFrame = bible_browser_controller.getCurrentVerseListFrame(tabIndex);
    var bookHeaders = currentVerseListFrame.find('.tag-browser-verselist-book-header');

    for (var i = 0; i < bookHeaders.length; i++) {
      var bookNumber = i + 1;
      var currentBookHeader = $(bookHeaders[i]);
      var currentBookHeaderText = currentBookHeader.text();
      var currentBook = currentBookHeader.attr("bookname");
      var currentBookLink = document.createElement('a');
      currentBookLink.setAttribute('class', 'navigation-link');
      var href = 'javascript:bible_browser_controller.navigation_pane.goToBook("' + currentBook + '",' + bookNumber + ')';
      currentBookLink.setAttribute('href', href);
      $(currentBookLink).html(currentBookHeaderText);

      navigationPane.append(currentBookLink);
    }
  }

  resetNavigationPane(tabIndex) {
    var navigationPane = this.getCurrentNavigationPane(tabIndex);
    navigationPane.children().remove();
    navigationPane.show();
  }

  updateNavigation(tabIndex=undefined) {
    if (tabIndex === undefined) {
      var tabIndex = bible_browser_controller.tab_controller.getSelectedTabIndex();
    }

    this.resetNavigationPane(tabIndex);

    var currentTab = bible_browser_controller.tab_controller.getTab(tabIndex);
    var currentTagIdList = null;
    var currentTextType = null;

    if (currentTab != null) {
      currentTagIdList = currentTab.getTagIdList();
      currentTextType = currentTab.getTextType();
    }

    if (currentTextType == 'book' && bible_chapter_verse_counts != null) { // Update navigation based on book chapters

      this.updateChapterNavigation(tabIndex);

    } else if (currentTextType == 'tagged_verses' && currentTagIdList != null) { // Update navigation based on tagged verses books

      this.updateBookNavigation(tabIndex);

    } else if (currentTextType == 'search_results') {

      this.updateBookNavigation(tabIndex);
    }
  }

  goToChapter(chapter) {
    this.highlightNavElement(chapter);

    var currentTabId = bible_browser_controller.tab_controller.getSelectedTabId();
    var reference = '#top';

    if (chapter > 1) {
      reference = '#' + currentTabId + ' ' + chapter;
      window.location = reference;
    } else {
      var currentVerseListFrame = bible_browser_controller.getCurrentVerseListFrame();
      currentVerseListFrame[0].scrollTop = 0;
    }
  }

  goToBook(book, bookNr) {
    this.highlightNavElement(bookNr);

    var currentTabId = bible_browser_controller.tab_controller.getSelectedTabId();
    var reference = '#' + currentTabId + ' ' + book;
    window.location = reference;
  }

  highlightSearchResult(navElementNumber) {  
    var navElementIndex = navElementNumber - 1;
    var currentNavigationPane = this.getCurrentNavigationPane();
    var allNavElementLinks = currentNavigationPane.find('.navigation-link');

    var highlightedLink = $(allNavElementLinks[navElementIndex]);
    highlightedLink.addClass('hl-search-result');
  }

  clearHighlightedSearchResults() {
    var currentNavigationPane = this.getCurrentNavigationPane();
    var allHighlightedLinks = currentNavigationPane.find('.hl-search-result');

    for (var i=0; i < allHighlightedLinks.length; i++) {
      var currentLink = $(allHighlightedLinks[i]);
      currentLink.removeClass('hl-search-result');
    }
  }
}

module.exports = NavigationPane;

