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

/**
 * The NavigationPane class implements the update and event handling of the
 * navigation pane that is shown left of the bible text pane.
 * 
 * @category Component
 */
class NavigationPane {
  constructor() {
    this.currentNavigationPane = null;
  }

  getCurrentNavigationPane(tabIndex) {
    var currentVerseListTabs = app_controller.getCurrentVerseListTabs(tabIndex);
    var navigationPane = currentVerseListTabs.find('.navigation-pane');
    return navigationPane;
  };

  initNavigationPaneForCurrentView(tabIndex=undefined) {
    var currentTab = app_controller.tab_controller.getTab(tabIndex);
    var currentBook = currentTab.getBook();
    var currentTranslationId = currentTab.getBibleTranslationId();
    var currentTagTitleList = currentTab.getTagTitleList();
    var currentXrefs = currentTab.getXrefs();
    var currentTextType = currentTab.getTextType();
    var navigationPane = this.getCurrentNavigationPane(tabIndex);
    var headerNavOption = app_controller.optionsMenu._headerNavOption;

    if (currentTextType == 'book' && currentBook != null) { // Book text mode

      navigationPane.removeClass('navigation-pane-books');

      if (headerNavOption.isChecked() &&
          app_controller.translation_controller.hasBibleTranslationHeaders(currentTranslationId)) {
        
        navigationPane.removeClass('navigation-pane-chapters');
        navigationPane.addClass('navigation-pane-headers');
      } else {
        navigationPane.removeClass('navigation-pane-headers');
        navigationPane.addClass('navigation-pane-chapters');
      }

    } else if (currentTextType == 'tagged_verses' && currentTagTitleList != null ||
               currentTextType == 'xrefs' && currentXrefs != null) { // Verse list mode

      navigationPane.removeClass('navigation-pane-chapters');
      navigationPane.removeClass('navigation-pane-headers');
      navigationPane.addClass('navigation-pane-books');

    } else if (currentTextType == 'search_results') {

      navigationPane.removeClass('navigation-pane-chapters');
      navigationPane.removeClass('navigation-pane-headers');
      navigationPane.addClass('navigation-pane-books');
    }
    
    navigationPane.bind('mouseover', app_controller.verse_context_controller.hide_verse_expand_box);
  }

  enableHeaderNavigation(tabIndex=undefined) {
    var navigationPane = this.getCurrentNavigationPane(tabIndex);
    var currentTab = app_controller.tab_controller.getTab(tabIndex);
    var currentTranslationId = currentTab.getBibleTranslationId();
    
    if (app_controller.translation_controller.hasBibleTranslationHeaders(currentTranslationId)) {
      navigationPane.addClass('navigation-pane-headers');
    }
  }

  disableHeaderNavigation() {
    var navigationPane = this.getCurrentNavigationPane();
    navigationPane.removeClass('navigation-pane-headers');
  }

  highlightSectionHeaderByTitle(title) {
    this.currentNavigationPane = this.getCurrentNavigationPane();

    var allHeaderLinks = this.currentNavigationPane[0].querySelectorAll('.header-link');
    for (var i = 0; i < allHeaderLinks.length; i++) {
      var currentTitle = allHeaderLinks[i].innerText;

      if (currentTitle == title) {
        this.highlightNavElement(i + 1, false, "HEADER");
        break;
      }
    }
  }

  scrollNavElementIntoView(navElementIndex, allNavElements) {
    var scrollToNavElementIndex = navElementIndex;
    if (navElementIndex < allNavElements.length - 3) {
      scrollToNavElementIndex += 3;
    } else {
      scrollToNavElementIndex += (allNavElements.length - 1 - navElementIndex);
    }
    
    var scrollToNavElement = allNavElements[scrollToNavElementIndex];
    scrollToNavElement.scrollIntoView(false);
  }

  highlightNavElement(navElementNumber, onClick=false, navElementType='CHAPTER') {
    this.currentNavigationPane = this.getCurrentNavigationPane();
    var navElementTypeClass = null;

    if (navElementType == 'CHAPTER') {
      navElementTypeClass = '.chapter-link';      
    } else if (navElementType == 'HEADER') {
      navElementTypeClass = '.header-link';
    } else {
      navElementTypeClass = '.navigation-link';
    }

    this.allNavElementLinks = this.currentNavigationPane.find(navElementTypeClass);

    var navElementIndex = navElementNumber - 1;
    var lastHighlightedNavElementIndex = app_controller.tab_controller.getLastHighlightedNavElementIndex(navElementType=='HEADER');

    if ((this.allNavElementLinks.length - 1) >= navElementIndex &&
        (this.allNavElementLinks.length - 1) >= lastHighlightedNavElementIndex) {

      var lastHighlightedNavElementLink = $(this.allNavElementLinks[lastHighlightedNavElementIndex]);
      var highlightedNavElementLink = $(this.allNavElementLinks[navElementIndex]);
    
      lastHighlightedNavElementLink.removeClass('hl-nav-element');
      highlightedNavElementLink.addClass('hl-nav-element');

      if (!onClick) {
        this.scrollNavElementIntoView(navElementIndex, this.allNavElementLinks);
      }
    }

    app_controller.tab_controller.setLastHighlightedNavElementIndex(navElementIndex, navElementType=='HEADER');
  }

  highlightSearchResult(navElementNumber, navElementType='BOOK') {
    var navElementTypeClass = 'chapter-link';
    if (navElementType == 'OTHER') {
      navElementTypeClass = 'navigation-link';
    }

    if (this.currentNavigationPane == null) {
      this.currentNavigationPane = this.getCurrentNavigationPane();
    }

    // This may be slow, because it's executed every time we search!
    this.allNavElementLinks = this.currentNavigationPane.find('.' + navElementTypeClass);

    var navElementIndex = navElementNumber - 1;
    var highlightedLink = $(this.allNavElementLinks[navElementIndex]);
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

  updateChapterNavigation(tabIndex) {
    var navigationPane = this.getCurrentNavigationPane(tabIndex);
    var currentTab = app_controller.tab_controller.getTab(tabIndex);
    var currentTranslation = currentTab.getBibleTranslationId();
    var currentBook = currentTab.getBook();
    var chapterCount = nsi.getBookChapterCount(currentTranslation, currentBook);
    var currentVerseList = app_controller.getCurrentVerseList(tabIndex);
    var sectionTitleElements = currentVerseList.find('.sword-section-title');

    var navigationHeader = document.createElement('div');
    navigationHeader.classList.add('nav-pane-header');
    navigationHeader.innerText = i18n.t('bible-browser.chapter-header');
    navigationPane.append(navigationHeader);
    var sectionHeaderNumber = 1;

    for (var i = 1; i <= chapterCount; i++) {
      var current_chapter_link = document.createElement('a');
      current_chapter_link.setAttribute('class', 'navigation-link chapter-link');
      var href = 'javascript:app_controller.navigation_pane.goToChapter(' + i + ')';
      current_chapter_link.setAttribute('href', href);
      $(current_chapter_link).html(i);
      navigationPane.append(current_chapter_link);

      sectionHeaderNumber = this.addHeaderNavLinksForChapter(tabIndex, navigationPane, sectionTitleElements, i, sectionHeaderNumber);
    }
  }

  getUnixSectionHeaderId(tabId, sectionHeader) {
    var unixSectionHeader = sectionHeader.toLowerCase();
    unixSectionHeader = unixSectionHeader.replace(/ /g, "-").replace(/['`()]/g, "");
    var unixSectionHeaderId = tabId + ' ' + 'section-header-' + unixSectionHeader;
    return unixSectionHeaderId;
  }

  addHeaderNavLinksForChapter(tabIndex, navigationPane, sectionTitleElements, chapter, sectionHeaderNumber=1) {
    var chapterSectionHeaderIndex = 0;
    var cachedVerseListTabId = this.getCachedVerseListTabId(tabIndex);

    for (var i = 0; i < sectionTitleElements.length; i++) {
      var sectionTitleElement = sectionTitleElements[i];
      var currentChapter = null;
      var isSectionHeader = true;

      try {
        if (sectionTitleElement.getAttribute('subtype') == 'x-Chapter') {
          isSectionHeader = false;
        }
      } catch (exc) {}
      
      try {
        currentChapter = parseInt(sectionTitleElement.getAttribute('chapter'));
      } catch (exc) {}

      if (isSectionHeader && currentChapter != null && currentChapter == chapter) {
        var sectionHeader = sectionTitleElement.innerText;
        var chapter = sectionTitleElement.getAttribute('chapter');
        var sectionHeaderId = this.getUnixSectionHeaderId(cachedVerseListTabId, sectionHeader);

        var currentHeaderLink = document.createElement('a');
        currentHeaderLink.setAttribute('class', 'navigation-link header-link');
        var sectionHeaderLink = `javascript:app_controller.navigation_pane.goToSection('${sectionHeaderId}', ${sectionHeaderNumber}, ${chapter})`;
        currentHeaderLink.setAttribute('href', sectionHeaderLink);
        $(currentHeaderLink).html(sectionHeader);
        if (chapterSectionHeaderIndex == 0) {
          $(currentHeaderLink).addClass('header-link-first');
        }

        navigationPane.append(currentHeaderLink);
        chapterSectionHeaderIndex++;
        sectionHeaderNumber++;
      }
    };

    return sectionHeaderNumber;
  }

  updateBookNavigation(tabIndex) {
    var navigationPane = this.getCurrentNavigationPane(tabIndex);
    var currentVerseListFrame = app_controller.getCurrentVerseListFrame(tabIndex);
    var bookHeaders = currentVerseListFrame.find('.tag-browser-verselist-book-header');

    for (var i = 0; i < bookHeaders.length; i++) {
      var bookNumber = i + 1;
      var currentBookHeader = $(bookHeaders[i]);
      var currentBookHeaderText = currentBookHeader.text();
      var currentBook = currentBookHeader.attr("bookname");
      var currentBookLink = document.createElement('a');
      currentBookLink.setAttribute('class', 'navigation-link');
      var href = 'javascript:app_controller.navigation_pane.goToBook("' + currentBook + '",' + bookNumber + ')';
      currentBookLink.setAttribute('href', href);
      $(currentBookLink).html(currentBookHeaderText);

      navigationPane.append(currentBookLink);
    }
  }

  resetNavigationPane(tabIndex) {
    this.currentNavigationPane = this.getCurrentNavigationPane(tabIndex);
    this.currentNavigationPane.children().remove();
    this.currentNavigationPane.show();
  }

  updateNavigation(tabIndex=undefined) {
    if (tabIndex === undefined) {
      var tabIndex = app_controller.tab_controller.getSelectedTabIndex();
    }

    this.resetNavigationPane(tabIndex);

    var currentTab = app_controller.tab_controller.getTab(tabIndex);
    var currentTagIdList = null;
    var currentXrefs = null;
    var currentTextType = null;

    if (currentTab != null) {
      currentTagIdList = currentTab.getTagIdList();
      currentXrefs = currentTab.getXrefs();
      currentTextType = currentTab.getTextType();
    }

    if (currentTextType == 'book') { // Update navigation based on book chapters

      this.updateChapterNavigation(tabIndex);

    } else if (currentTextType == 'tagged_verses' && currentTagIdList != null) { // Update navigation based on tagged verses books

      this.updateBookNavigation(tabIndex);

    } else if (currentTextType == 'search_results') {

      this.updateBookNavigation(tabIndex);

    } else if (currentTextType == 'xrefs' && currentXrefs != null) {

      this.updateBookNavigation(tabIndex);
    }

    this.allNavElementLinks = this.currentNavigationPane.find('.navigation-link');
  }

  getCachedVerseListTabId(tabIndex=undefined) {
    var currentVerseList = app_controller.getCurrentVerseList(tabIndex);
    var firstLink = currentVerseList[0].querySelector('a.nav');
    var cachedVerseListTabId = firstLink?.getAttribute('name').split(' ')[0];
    return cachedVerseListTabId;
  }

  goToChapter(chapter) {
    this.highlightNavElement(chapter, true);

    var reference = '#top';

    if (chapter > 1 || app_controller.optionsMenu._bookIntroOption.isChecked()) {
      var cachedVerseListTabId = this.getCachedVerseListTabId();
      reference = '#' + cachedVerseListTabId + ' ' + chapter;
      window.location = reference;
    } else {
      var currentVerseListFrame = app_controller.getCurrentVerseListFrame();
      currentVerseListFrame[0].scrollTop = 0;
    }
  }

  goToSection(sectionHeaderId, sectionHeaderNumber, chapter) {
    this.highlightNavElement(chapter, true);
    this.highlightNavElement(sectionHeaderNumber, true, "HEADER");

    var reference = '#' + sectionHeaderId;
    window.location = reference;
  }

  goToBook(book, bookNr) {
    this.highlightNavElement(bookNr, true, "OTHER");

    var cachedVerseListTabId = this.getCachedVerseListTabId();
    var reference = '#' + cachedVerseListTabId + ' ' + book;
    window.location = reference;
  }
}

module.exports = NavigationPane;

