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

    var verses = await models.Verse.findBySearchResults(bibleTranslationId, search_results);

    var verseIds = [];
    for (var i = 0; i < verses.length; i++) {
      var currentVerse = verses[i];
      verseIds.push(currentVerse.id);
    }

    var bibleBooks = await models.BibleBook.findBySearchResults(search_results);
    var verseTags = await models.VerseTag.findByVerseIds(bibleTranslationId, verseIds.join(','));
    var groupedVerseTags = models.VerseTag.groupVerseTagsByVerse(verseTags);
    
    if (render_type == "html") {
      
      var verses_as_html = this.get_verses_as_html(current_tab_id,
                                                   bibleBooks,
                                                   groupedVerseTags,
                                                   verses,
                                                   render_function,
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
                                                   groupedVerseTags,
                                                   verses,
                                                   render_function,
                                                   renderVerseMetaInfo);
    } else if (render_type == "docx") {
      render_function(bibleBooks, groupedVerseTags, verses);
    }
  }

  get_verses_as_html(current_tab_id, bibleBooks, groupedVerseTags, verses, render_function, renderVerseMetaInfo=true) {
    var verses_as_html = verseListTemplate({
      verseListId: current_tab_id,
      renderBibleBookHeaders: true,
      renderVerseMetaInfo: renderVerseMetaInfo,
      bibleBooks: bibleBooks,
      verses: verses,
      verseTags: groupedVerseTags,
      reference_separator: reference_separator,
      tagHint: i18n.t("bible-browser.tag-hint")
    });

    render_function(verses_as_html, verses.length);
  }
}

module.exports = BibleBrowserCommunicationController;
