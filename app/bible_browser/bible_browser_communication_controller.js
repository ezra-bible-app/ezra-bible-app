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

var verse_list_template_file = path.join(__dirname, 'templates/verse_list.pug');
const verseListTemplate = pug.compileFile(verse_list_template_file);

function BibleBrowserCommunicationController() {
  this.request_book_text = function(current_tab_id,
                                    book_short_title,
                                    render_function,
                                    start_verse_number=0,
                                    number_of_verses=0) {

    if (current_bible_translation_id == null || current_bible_translation_id == "") {
      $('#verse-list-loading-indicator').hide();
      return;
    }

    models.BibleBook.findOne({ where: { shortTitle: book_short_title }}).then(bibleBook => {
      var bibleTranslationId = current_bible_translation_id;

      bibleBook.getVerses(bibleTranslationId=bibleTranslationId,
                          start_verse_number,
                          number_of_verses).then(verses => {

        bibleBook.getVerseTags(bibleTranslationId=bibleTranslationId).then(verseTags => {
          var groupedVerseTags = models.VerseTag.groupVerseTagsByVerse(verseTags);

          var verses_as_html = verseListTemplate({
            verseListId: current_tab_id,
            renderVerseMetaInfo: true,
            renderBibleBookHeaders: false,
            bibleBooks: [bibleBook],
            verses: verses,
            verseTags: groupedVerseTags,
            reference_separator: reference_separator
          });

          render_function(verses_as_html);
        });
      });
    });
  };

  this.request_tags_for_menu = function() {
    models.Tag.getGlobalAndBookTags().then(tags => {
      bible_browser_controller.render_tags_in_menu(tags);
    });
  };

  this.request_verses_for_selected_tags = function(current_tab_id,
                                                   selected_tags,
                                                   render_function,
                                                   renderVerseMetaInfo=true) {
    if (selected_tags == '') {
      return;
    }

    var bibleTranslationId = null;
    if (current_bible_translation_id == null) {
      bibleTranslationId = 1;
    } else {
      bibleTranslationId = current_bible_translation_id;
    }

    models.Verse.findByTagIds(bibleTranslationId=bibleTranslationId, tagIds=selected_tags).then(verses => {
      models.BibleBook.findByTagIds(tagIds=selected_tags).then(bibleBooks => {
        var verseIds = [];
        for (v of verses) {
          verseIds.push(v.id);
        }

        models.VerseTag.findByVerseIds(bibleTranslationId=bibleTranslationId, verseIds=verseIds.join(',')).then(verseTags => {
          var groupedVerseTags = models.VerseTag.groupVerseTagsByVerse(verseTags);

          var verses_as_html = verseListTemplate({
            verseListId: current_tab_id,
            renderBibleBookHeaders: true,
            renderVerseMetaInfo: renderVerseMetaInfo,
            bibleBooks: bibleBooks,
            verses: verses,
            verseTags: groupedVerseTags,
            reference_separator: reference_separator
          });

          render_function(verses_as_html);
        });
      });
    });
  };
}

