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

const pug = require('pug');
const path = require('path');

var verse_list_template_file = path.join(__dirname, '../../templates/verse_list.pug');
const verseListTemplate = pug.compileFile(verse_list_template_file);

class BibleBrowserCommunicationController {
  constructor() {

  }

  async request_book_text(tab_index,
                          current_tab_id,
                          book_short_title,
                          render_function,
                          start_verse_number=0,
                          number_of_verses=0) {

    var currentBibleTranslationId = bible_browser_controller.tab_controller.getCurrentBibleTranslationId(tab_index);

    if (currentBibleTranslationId == null || 
        currentBibleTranslationId == "") {

      $('#verse-list-loading-indicator').hide();
      return;
    }

    var bibleBook = await models.BibleBook.findOne({ where: { shortTitle: book_short_title }});
    var verses = await bibleBook.getVerses(currentBibleTranslationId,
                                           start_verse_number,
                                           number_of_verses);

    var verseTags = await bibleBook.getVerseTags(currentBibleTranslationId);
    var groupedVerseTags = models.VerseTag.groupVerseTagsByVerse(verseTags);

    var verses_as_html = verseListTemplate({
      verseListId: current_tab_id,
      renderVerseMetaInfo: true,
      renderBibleBookHeaders: false,
      bibleBooks: [bibleBook],
      verses: verses,
      verseTags: groupedVerseTags,
      reference_separator: reference_separator,
      tagHint: i18n.t("bible-browser.tag-hint")
    });

    render_function(verses_as_html);
  }

  async request_verses_for_search_results(tab_index,
                                          current_tab_id,
                                          search_results,
                                          render_function,
                                          requestedBookId=-1,
                                          render_type='html',
                                          renderVerseMetaInfo=true) {
    if (search_results.length == 0) {
      return;
    }

    var bibleTranslationId = null;
    if (bible_browser_controller.tab_controller.getCurrentBibleTranslationId(tab_index) == null) {
      bibleTranslationId = 1;
    } else {
      bibleTranslationId = bible_browser_controller.tab_controller.getCurrentBibleTranslationId(tab_index);
    }

    var bibleBookStats = {};
    for (var i = 0; i < search_results.length; i++) {
      var bibleBookId = models.BibleTranslation.swordBooktoEzraBook(search_results[i].bibleBookShortTitle);
      
      if (bibleBookStats[bibleBookId] === undefined) {
        bibleBookStats[bibleBookId] = 1;
      } else {
        bibleBookStats[bibleBookId] += 1;
      }
    }
    console.log(bibleBookStats);

    var bibleBooks = await models.BibleBook.findBySearchResults(search_results);
    console.log("Got results for " + bibleBooks.length + " books!");

    console.log("Finding verses by search result!");
    var verses = [];

    var firstBookId = models.BibleTranslation.swordBooktoEzraBook(search_results[0].bibleBookShortTitle);

    for (var i = 0; i < search_results.length; i++) {
      var currentResult = search_results[i];
      var currentBookId = models.BibleTranslation.swordBooktoEzraBook(search_results[i].bibleBookShortTitle);

      if (requestedBookId != -1 && currentBookId != requestedBookId) {
        // Skip the books that are not requested;
        continue;
      }

      var currentVerse = await models.Verse.findBySearchResult(bibleTranslationId, currentResult);
      verses.push(currentVerse);
    }
    console.log("Done!");

    var verseIds = [];
    for (var i = 0; i < verses.length; i++) {
      var currentVerse = verses[i];
      verseIds.push(currentVerse.id);
    }

    var verseTags = await models.VerseTag.findByVerseIds(bibleTranslationId, verseIds.join(','));
    var groupedVerseTags = models.VerseTag.groupVerseTagsByVerse(verseTags);
    
    if (render_type == "html") {
      
      var verses_as_html = this.get_verses_as_html(current_tab_id,
                                                   bibleBooks,
                                                   bibleBookStats,
                                                   groupedVerseTags,
                                                   verses,
                                                   render_function,
                                                   requestedBookId <= 0,
                                                   renderVerseMetaInfo);
    } else if (render_type == "docx") {
      render_function(bibleBooks, groupedVerseTags, verses);
    }
  }

  async request_verses_for_selected_tags(tab_index,
                                         current_tab_id,
                                         selected_tags,
                                         render_function,
                                         render_type='html',
                                         renderVerseMetaInfo=true) {
    if (selected_tags == '') {
      return;
    }

    var bibleTranslationId = null;
    if (bible_browser_controller.tab_controller.getCurrentBibleTranslationId(tab_index) == null) {
      bibleTranslationId = 1;
    } else {
      bibleTranslationId = bible_browser_controller.tab_controller.getCurrentBibleTranslationId(tab_index);
    }

    var verses = await models.Verse.findByTagIds(bibleTranslationId, selected_tags);
    var verseIds = [];
    for (var i = 0; i < verses.length; i++) {
      var currentVerse = verses[i];
      verseIds.push(currentVerse.id);
    }

    var bibleBooks = await models.BibleBook.findByTagIds(selected_tags);
    var verseTags = await models.VerseTag.findByVerseIds(bibleTranslationId, verseIds.join(','));
    var groupedVerseTags = models.VerseTag.groupVerseTagsByVerse(verseTags);

    if (render_type == "html") {
      
      var verses_as_html = this.get_verses_as_html(current_tab_id,
                                                   bibleBooks,
                                                   null,
                                                   groupedVerseTags,
                                                   verses,
                                                   render_function,
                                                   true,
                                                   renderVerseMetaInfo);
    } else if (render_type == "docx") {
      render_function(bibleBooks, groupedVerseTags, verses);
    }
  }

  get_verses_as_html(current_tab_id, bibleBooks, bibleBookStats, groupedVerseTags, verses, render_function, renderBibleBookHeaders=true, renderVerseMetaInfo=true) {
    var verses_as_html = verseListTemplate({
      verseListId: current_tab_id,
      renderBibleBookHeaders: renderBibleBookHeaders,
      renderVerseMetaInfo: renderVerseMetaInfo,
      bibleBooks: bibleBooks,
      bibleBookStats: bibleBookStats,
      verses: verses,
      verseTags: groupedVerseTags,
      reference_separator: reference_separator,
      tagHint: i18n.t("bible-browser.tag-hint"),
      loadSearchResultsText: i18n.t("bible-browser.show-search-results")
    });

    render_function(verses_as_html, verses.length);
  }
}

module.exports = BibleBrowserCommunicationController;
