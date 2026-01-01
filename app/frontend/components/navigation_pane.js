/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2026 Ezra Bible App Development Team <contact@ezrabibleapp.net>

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

const VerseBoxHelper = require('../helpers/verse_box_helper.js');
const VerseBox = require('../ui_models/verse_box.js');
const i18nHelper = require('../helpers/i18n_helper.js');
const eventController = require('../controllers/event_controller.js');
const VerseReferenceHelper = require('../helpers/verse_reference_helper.js');
const verseListController = require('../controllers/verse_list_controller.js');
const swordModuleHelper = require('../helpers/sword_module_helper.js');

/**
 * The NavigationPane class implements the update and event handling of the
 * navigation pane that is shown left of the bible text pane.
 * 
 * @category Component
 */
class NavigationPane {
  constructor() {
    this.currentNavigationPane = null;
    this.verse_box_helper = new VerseBoxHelper();
    this.verse_reference_helper = new VerseReferenceHelper();
    this.verseListFrameNoChapterNavCss = 'no-chapter-nav';

    eventController.subscribe('on-bible-text-loaded', async (tabIndex) => {
      await this.updateNavigation(tabIndex);

      var currentTab = app_controller.tab_controller.getTab(tabIndex);

      if (currentTab != null && currentTab.getTextType() != 'search_results') {
        this.scrollToTop(tabIndex);
      }
    });

    eventController.subscribe('on-all-translations-removed', async (tabIndex) => {
      this.resetNavigationPane(tabIndex);
    });

    eventController.subscribe('on-tab-search-results-available', async occurrences => {
      await this.onTabSearchResultsAvailable(occurrences);
    });

    eventController.subscribe('on-tab-search-reset', () => {
      this.clearHighlightedSearchResults();
    });

    eventController.subscribe('on-module-search-started', (tabIndex) => {
      const showSearchResultsInPopup = app_controller.optionsMenu._showSearchResultsInPopupOption.isChecked;

      if (!showSearchResultsInPopup) {
        this.resetNavigationPane(tabIndex);
      }
    });

    let updateChapterTagIndicatorsForBookTextType = () => {
      var currentTab = app_controller.tab_controller.getTab();
      var currentBook = currentTab.getBook();
      var currentTextType = currentTab.getTextType();

      if (currentTextType == 'book' && currentBook != null) { // Book text mode
        this.updateChapterTagIndicators();
      }
    };

    eventController.subscribeMultiple(['on-tag-group-selected',
                                       'on-tag-group-filter-enabled',
                                       'on-tag-group-filter-disabled'], () => {

      updateChapterTagIndicatorsForBookTextType();
    });
  }

  getCurrentNavigationPane(tabIndex=undefined) {
    var currentVerseListTabs = app_controller.getCurrentVerseListTabs(tabIndex);
    var navigationPane = currentVerseListTabs.find('.navigation-pane');
    return navigationPane;
  }

  show(tabIndex) {
    var verseListFrame = verseListController.getCurrentVerseListFrame(tabIndex);
    verseListFrame.removeClass(this.verseListFrameNoChapterNavCss);
    this.getCurrentNavigationPane(tabIndex).show();
  }

  hide(tabIndex) {
    var verseListFrame = verseListController.getCurrentVerseListFrame(tabIndex);
    verseListFrame.addClass(this.verseListFrameNoChapterNavCss);
    this.getCurrentNavigationPane(tabIndex).hide();
  }

  async initNavigationPaneForCurrentView(tabIndex=undefined) {
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
      var bookHasHeaders = await swordModuleHelper.bookHasHeaders(currentTranslationId, currentBook, false);

      if (headerNavOption.isChecked && bookHasHeaders) {
        
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

  async enableHeaderNavigation(tabIndex=undefined) {
    const navigationPane = this.getCurrentNavigationPane(tabIndex);
    const currentTab = app_controller.tab_controller.getTab(tabIndex);
    const currentTranslationId = currentTab.getBibleTranslationId();
    const currentBook = currentTab.getBook();
    const headerNavOption = app_controller.optionsMenu._headerNavOption;
    const hasHeaders = await swordModuleHelper.bookHasHeaders(currentTranslationId, currentBook, false);

    if (headerNavOption.isChecked && hasHeaders) {
      navigationPane.addClass('navigation-pane-headers');

      if (!currentTab.headersLoaded) {
        await this.updateNavigation(tabIndex, true);
        await this.updateChapterTagIndicators(tabIndex, true);
      }
    }
  }

  disableHeaderNavigation() {
    const navigationPane = this.getCurrentNavigationPane();
    navigationPane.removeClass('navigation-pane-headers');
  }

  highlightSectionHeaderByTitle(title) {
    this.currentNavigationPane = this.getCurrentNavigationPane();

    const allHeaderLinks = this.currentNavigationPane[0].querySelectorAll('.header-link');
    for (var i = 0; i < allHeaderLinks.length; i++) {
      const currentTitle = allHeaderLinks[i].innerText;

      if (currentTitle == title) {
        this.highlightNavElement(undefined, i + 1, false, "HEADER");
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
  
  highlightLastNavElement() {
    var currentTab = app_controller.tab_controller.getTab();
    var lastHighlightedNavElementIndex = currentTab.getLastHighlightedNavElementIndex();
    this.highlightNavElement(undefined, lastHighlightedNavElementIndex);
  }

  highlightNavElement(tabIndex, navElementNumber, scrollIntoView=true, navElementType='CHAPTER') {
    this.currentNavigationPane = this.getCurrentNavigationPane(tabIndex);
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
    
      lastHighlightedNavElementLink.blur();
      lastHighlightedNavElementLink.removeClass('hl-nav-element');
      highlightedNavElementLink.addClass('hl-nav-element');

      if (scrollIntoView) {
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

  chapterHasVerseTags(chapter, bookVerseTags, tagGroupMembers) {
    for (let verseTagKey in bookVerseTags) {
      let verseTagList = bookVerseTags[verseTagKey];

      for (let i = 0; i < verseTagList.length; i++) {
        let verseTag = verseTagList[i];

        if (tagGroupMembers != null) {
          if (!tagGroupMembers.includes(verseTag.tagId)) {
            continue;
          }
        }

        if (verseTag.chapter == chapter) {
          return true;
        }
      }
    }

    return false;
  }

  // FIXME: This function is slow with long lists of chapters. It can be optimized by using the vanilla js append function.
  async updateChapterNavigation(tabIndex, force=false) {
    var $navigationPane = this.getCurrentNavigationPane(tabIndex);
    const currentTab = app_controller.tab_controller.getTab(tabIndex);

    if (currentTab == null) {
      return;
    }

    const currentTranslation = currentTab.getBibleTranslationId();
    const currentBook = currentTab.getBook();
    const headerNavOption = app_controller.optionsMenu._headerNavOption;

    if (!force) {
      if (currentTranslation == null || currentBook == null || currentTab.isBookUnchanged()) {
        return;
      }
    }

    this.resetNavigationPane(tabIndex);

    const chapterCount = await ipcNsi.getBookChapterCount(currentTranslation, currentBook);
    let headerList = [];
    let headerCount = 0;

    if (headerNavOption.isChecked && !currentTab.headersLoaded) {
      headerList = await ipcNsi.getBookHeaderList(currentTranslation, currentBook);
      headerCount = headerList.length;
    }

    var navigationHeader = document.createElement('div');
    navigationHeader.classList.add('nav-pane-header');
    navigationHeader.textContent = i18n.t('bible-browser.chapter-header');
    navigationHeader.setAttribute('i18n', 'bible-browser.chapter-header');
    $navigationPane.append(navigationHeader);

    var cachedVerseListTabId = this.getCachedVerseListTabId(tabIndex);
    var sectionHeaderNumber = 1;

    if (headerNavOption.isChecked && headerCount > 0) {
      currentTab.headersLoaded = true;
    }

    for (let i = 1; i <= chapterCount; i++) {
      let href = `javascript:app_controller.navigation_pane.goToChapter(${i})`;
      let chapterLinkHtml = `<a href='${href}' class='navigation-link chapter-link'>${i}</a>`;
      $navigationPane.append(chapterLinkHtml);

      let tagIndicator = `<i id='tag-indicator-chapter-${i}' class='fas fa-tag tag-indicator' style='visibility: hidden'></i>`;
      $navigationPane.append(tagIndicator);

      if (cachedVerseListTabId != null && headerNavOption.isChecked && headerCount > 0) {
        sectionHeaderNumber = this.addHeaderNavLinksForChapter(cachedVerseListTabId, $navigationPane, headerList, i, sectionHeaderNumber);
      }
    }
  }

  async updateChapterTagIndicators(tabIndex=undefined, force=false) {
    const currentTab = app_controller.tab_controller.getTab(tabIndex);

    if (currentTab == null) {
      return;
    }

    const currentTranslation = currentTab.getBibleTranslationId();
    const currentBook = currentTab.getBook();

    if (currentTranslation == null || currentBook == null) {
      return;
    }

    if (!force) {
      if (currentTab.isBookUnchanged()) {
        return;
      }
    }

    var $navigationPane = this.getCurrentNavigationPane(tabIndex);
    const versification = await swordModuleHelper.getThreeLetterVersification(currentTranslation);
    const dbBook = await ipcDb.getBibleBook(currentBook);
    const chapterCount = await ipcNsi.getBookChapterCount(currentTranslation, currentBook);
    const verseTags = dbBook != null ? await ipcDb.getBookVerseTags(dbBook.id, versification) : [];
    const tagGroupFilterOption = app_controller.optionsMenu._tagGroupFilterOption;

    let tagGroupMembers = null;

    if (tag_assignment_panel.tagGroupUsed() && tagGroupFilterOption.isChecked) {
      tagGroupMembers = await tag_assignment_panel.tag_store.getTagGroupMemberIds(tag_assignment_panel.currentTagGroupId);
    }

    for (let i = 1; i <= chapterCount; i++) {
      let chapterHasTags = this.chapterHasVerseTags(i, verseTags, tagGroupMembers);

      if ($navigationPane[0] !== undefined) {
        let tagIndicator = $navigationPane[0].querySelector('#tag-indicator-chapter-' + i);

        if (tagIndicator != null) {
          if (chapterHasTags) {
            tagIndicator.style.visibility = 'visible';
          } else {
            tagIndicator.style.visibility = 'hidden';
          }
        }
      }
    }
  }

  getUnixSectionHeaderId(tabId, chapter, sectionHeader) {
    if (sectionHeader == null) {
      return null;
    }

    var unixSectionHeader = sectionHeader.trim().toLowerCase();
    unixSectionHeader = unixSectionHeader.replace(/ /g, "-").replace(/['`().,;:!?]/g, "");
    var unixSectionHeaderId = tabId + ' ' + chapter + ' ' + 'section-header-' + unixSectionHeader;
    return unixSectionHeaderId;
  }

  addHeaderNavLinksForChapter(cachedVerseListTabId, navigationPane, headerList, chapter, sectionHeaderNumber=1) {
    var chapterSectionHeaderIndex = 0;

    var headerLinkBox = document.createElement('div');
    headerLinkBox.classList.add('header-link-box');

    for (let i = 0; i < headerList.length; i++) {
      let header = headerList[i];
      
      if (header.chapter == chapter &&
          header.subType != "x-Chapter" &&
          header.type != "chapter" &&
          header.type != "psalm" &&
          header.type != "scope" &&
          header.type != "acrostic") {

        let sectionHeader = header.content;
        chapter = header.chapter;
        let sectionHeaderId = this.getUnixSectionHeaderId(cachedVerseListTabId, chapter, sectionHeader);

        if (sectionHeaderId != null) {
          let currentHeaderLink = document.createElement('a');
          currentHeaderLink.setAttribute('class', 'navigation-link header-link');

          let sectionHeaderLink = `javascript:app_controller.navigation_pane.goToSection('${sectionHeaderId}', ${sectionHeaderNumber}, ${chapter})`;

          currentHeaderLink.setAttribute('href', sectionHeaderLink);
          $(currentHeaderLink).html(sectionHeader);
          if (chapterSectionHeaderIndex == 0) {
            $(currentHeaderLink).addClass('header-link-first');
          }

          headerLinkBox.append(currentHeaderLink);
        }

        chapterSectionHeaderIndex++;
        sectionHeaderNumber++;
      }
    }

    navigationPane.append(headerLinkBox);

    return sectionHeaderNumber;
  }

  updateBookNavigation(tabIndex) {
    var navigationPane = this.getCurrentNavigationPane(tabIndex);
    var currentVerseListFrame = verseListController.getCurrentVerseListFrame(tabIndex);
    var bookHeaders = currentVerseListFrame.find('.tag-browser-verselist-book-header');
    var navigationPaneHtml = "";

    for (var i = 0; i < bookHeaders.length; i++) {
      var bookNumber = i + 1;
      var currentBookHeader = $(bookHeaders[i]);
      var currentBookHeaderText = currentBookHeader.text();
      var currentBook = currentBookHeader.attr("bookname");

      var href = `javascript:app_controller.navigation_pane.goToBook('${currentBook}','${bookNumber}')`;
      var link = `<a class='navigation-link' href="${href}">${currentBookHeaderText}</a>`;
      navigationPaneHtml += link;
    }

    navigationPane[0].innerHTML = navigationPaneHtml;
  }

  resetNavigationPane(tabIndex, clear=true) {
    this.currentNavigationPane = this.getCurrentNavigationPane(tabIndex);
    
    if (clear) {
      this.clearNavigationPane();
    }

    app_controller.optionsMenu.showOrHideBookChapterNavigationBasedOnOption(tabIndex);
  }

  clearNavigationPane() {
    var currentTab = app_controller.tab_controller.getTab();

    if (this.currentNavigationPane != null && this.currentNavigationPane[0].childNodes.length >= 1) {
      currentTab.headersLoaded = false;
      this.currentNavigationPane[0].innerHTML = "";
      app_controller.tab_controller.clearLastHighlightedNavElementIndex();
    }
  }

  async updateNavigation(tabIndex=undefined, force=false) {
    if (tabIndex === undefined) {
      tabIndex = app_controller.tab_controller.getSelectedTabIndex();
    }

    var currentTab = app_controller.tab_controller.getTab(tabIndex);
    var currentTagIdList = null;
    var currentXrefs = null;
    var currentTextType = null;

    if (currentTab != null) {
      currentTagIdList = currentTab.getTagIdList();
      currentXrefs = currentTab.getXrefs();
      currentTextType = currentTab.getTextType();
    }

    if (currentTextType != 'book') {
      this.resetNavigationPane(tabIndex);
    } else {
      this.resetNavigationPane(tabIndex, false);
    }

    if (currentTextType == 'book') { // Update navigation based on book chapters

      await this.updateChapterNavigation(tabIndex, force);
      await this.updateChapterTagIndicators(tabIndex, force);

      const currentTranslationId = currentTab.getBibleTranslationId();
      const secondBibleTranslationId = currentTab.getSecondBibleTranslationId();
      const isInstantLoadingBook = await app_controller.translation_controller.isInstantLoadingBook(currentTranslationId, secondBibleTranslationId, currentTab.getBook());
      const selectChapterBeforeLoadingOption = app_controller.optionsMenu._selectChapterBeforeLoadingOption;

      if (isInstantLoadingBook && selectChapterBeforeLoadingOption.isChecked) {
        this.goToChapter(currentTab.getChapter(), true);
      } else {
        this.highlightNavElement(tabIndex, currentTab.getChapter(), currentTab.isBookChanged());
      }

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
    var currentVerseList = verseListController.getCurrentVerseList(tabIndex);
    var cachedVerseListTabId = null;

    try {
      var firstLink = currentVerseList[0].querySelector('a.nav');
      cachedVerseListTabId = null;
      
      if (firstLink !== null) {
        cachedVerseListTabId = firstLink.getAttribute('name').split(' ')[0];
      }
    } catch (e) {
      console.log("NavigationPane: Could not get cached verse list tab id!");
    }

    return cachedVerseListTabId;
  }

  getHighlightedChapter() {
    var highlightedChapter = null;

    try {
      var highlightedChapterElement = this.currentNavigationPane.find('.chapter-link.hl-nav-element');
      highlightedChapter = parseInt(highlightedChapterElement.text());
    // eslint-disable-next-line no-empty
    } catch (e) {}

    return highlightedChapter;
  }

  async goToChapter(chapter, scrollIntoView=false) {
    var previouslyHighlightedChapter = this.getHighlightedChapter();
    
    this.highlightNavElement(undefined, chapter, scrollIntoView);
    const currentTab = app_controller.tab_controller.getTab();
    const isInstantLoadingBook = await app_controller.translation_controller.isInstantLoadingBook(
      currentTab.getBibleTranslationId(),
      currentTab.getSecondBibleTranslationId(),
      currentTab.getBook()
    );

    if (currentTab.getChapter() != null && !isInstantLoadingBook && chapter != previouslyHighlightedChapter) {
      await app_controller.text_controller.loadBook(currentTab.getBook(),
                                                    currentTab.getBookTitle(),
                                                    currentTab.getReferenceBookTitle(),
                                                    false,
                                                    chapter);

      // Update recent passages
      const bookSelectionMenu = app_controller.book_selection_menu;
      await bookSelectionMenu.updateRecentPassages(currentTab.getBook(), chapter);
    } else {
      this.scrollToTop(undefined, chapter);
    }
  }

  scrollToTop(tabIndex=undefined, chapter=1) {
    let reference = '#top';

    if (chapter > 1) {
      const cachedVerseListTabId = this.getCachedVerseListTabId(tabIndex);
      reference = '#' + cachedVerseListTabId + ' ' + chapter;
      window.location = reference;
    } else {
      const currentVerseListFrame = verseListController.getCurrentVerseListFrame(tabIndex);
      currentVerseListFrame[0].scrollTop = 0;
    }
  }

  async goToSection(sectionHeaderId, sectionHeaderNumber, chapter) {
    const currentTab = app_controller.tab_controller.getTab();
    const currentChapter = currentTab.getChapter();
    const isInstantLoadingBook = await app_controller.translation_controller.isInstantLoadingBook(
      currentTab.getBibleTranslationId(),
      currentTab.getSecondBibleTranslationId(),
      currentTab.getBook()
    );

    let scrollNavElementIntoView = true;
    if (!isInstantLoadingBook) {
      scrollNavElementIntoView = false;
    }

    if (!isInstantLoadingBook && chapter != currentChapter) {
      await this.goToChapter(chapter);
    }

    this.highlightNavElement(undefined, chapter, scrollNavElementIntoView);
    this.highlightNavElement(undefined, sectionHeaderNumber, scrollNavElementIntoView, "HEADER");

    var reference = '#' + sectionHeaderId;
    window.location = reference;
  }

  goToBook(book, bookNr) {
    this.highlightNavElement(undefined, bookNr, true, "OTHER");
    var cachedVerseListTabId = this.getCachedVerseListTabId();
    var reference = '#' + cachedVerseListTabId + ' ' + book;
    window.location = reference;
  }

  async updateNavigationFromVerseBox(focussedElement, verseBox=undefined) {
    const currentTab = app_controller.tab_controller.getTab();
    const currentBook = currentTab.getBook();
    const currentTextType = currentTab.getTextType();
    const bibleTranslationId = currentTab.getBibleTranslationId();
    const secondBibleTranslationId = currentTab.getSecondBibleTranslationId();
    const isInstantLoadingBook = await app_controller.translation_controller.isInstantLoadingBook(bibleTranslationId, secondBibleTranslationId, currentBook);

    if (verseBox == undefined) {
      verseBox = focussedElement.closest('.verse-box');
    }

    const separator = await i18nHelper.getReferenceSeparator(bibleTranslationId);

    if (verseBox != null) {
      if (currentTextType == 'book' && currentBook != null) {

        var verseReferenceContent = verseBox.querySelector('.verse-reference-content').innerText;
        var currentChapter = this.verse_reference_helper.getChapterFromReference(verseReferenceContent, separator);
        this.highlightNavElement(undefined, currentChapter, isInstantLoadingBook);

        var sectionTitle = "";
        if (focussedElement.classList.contains('sword-section-title')) {
          sectionTitle = focussedElement.innerText;
        } else {
          sectionTitle = this.verse_box_helper.getSectionTitleFromVerseBox(verseBox);
        }

        if (sectionTitle != null) {
          this.highlightSectionHeaderByTitle(sectionTitle);
        }

      } else if (currentTab.isVerseList()) {

        var bibleBookShortTitle = new VerseBox(verseBox).getBibleBookShortTitle();
        var currentBookName = await ipcDb.getBookTitleTranslation(bibleBookShortTitle);
        
        var bibleBookNumber = verseListController.getVerseListBookNumber(currentBookName);
        if (bibleBookNumber != -1) {
          this.highlightNavElement(undefined, bibleBookNumber, false, "OTHER");
        }
      }
    }
  }

  async onTabSearchResultsAvailable(occurrences) {
    var currentVerseListFrame = verseListController.getCurrentVerseListFrame();
    var bookHeaders = currentVerseListFrame.find('.tag-browser-verselist-book-header');

    var bibleTranslationId = app_controller.tab_controller.getTab().getBibleTranslationId();
    var separator = await i18nHelper.getReferenceSeparator(bibleTranslationId);

    // Highlight occurrences in navigation pane
    for (let i = 0; i < occurrences.length; i++) {
      var currentOccurrences = $(occurrences[i]);
      var verseBox = currentOccurrences.closest('.verse-box');
      var currentTab = app_controller.tab_controller.getTab();
      var currentTextType = currentTab.getTextType();

      if (currentTextType == 'book') {
        // Highlight chapter if we are searching in a book

        var verseReferenceContent = verseBox.find('.verse-reference-content').text();
        var chapter = this.verse_reference_helper.getChapterFromReference(verseReferenceContent, separator);
        this.highlightSearchResult(chapter);

      } else {

        // Highlight bible book if we are searching in a tagged verses list
        var currentBibleBookShortName = new VerseBox(verseBox[0]).getBibleBookShortTitle();
        var currentBookName = await ipcDb.getBookTitleTranslation(currentBibleBookShortName);

        var bibleBookNumber = verseListController.getVerseListBookNumber(currentBookName, bookHeaders);
        if (bibleBookNumber != -1) {
          this.highlightSearchResult(bibleBookNumber, "OTHER");
        }
      }
    }
  }
}

module.exports = NavigationPane;

