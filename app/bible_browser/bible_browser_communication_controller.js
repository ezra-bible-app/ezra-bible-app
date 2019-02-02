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

const pug = require('pug');
const path = require('path');

var verse_list_template_file = path.join(__dirname, 'templates/verse_list.pug');
const verseListTemplate = pug.compileFile(verse_list_template_file);

function BibleBrowserCommunicationController() {
  this.request_book_text = function(book_short_title,
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

  this.request_verse_preview = function(book_short_title, chapter, verse) {
    var absolute_verse_number = reference_to_absolute_verse_nr(book_short_title, chapter, verse);
    //console.log("absolute_verse_number: " + absolute_verse_number);
    $('#cr-edit-box-verse-preview').load('/bible_books/' + book_short_title + '/verses/' + absolute_verse_number + '.txt',
                                         bible_browser_controller.communication_controller.on_verse_preview_load);
  };

  this.request_cross_references_for_verse = function(verse_id) {
     $.ajax({
      url: '/verses/' + verse_id + '/cross_references',
      type: 'GET',
      processData: true,
      dataType: "xml",
      success: bible_browser_controller.render_cross_references_in_preview_box
    });
  };

  this.request_tags_for_menu = function() {
    models.Tag.getGlobalAndBookTags().then(tags => {
      bible_browser_controller.render_tags_in_menu(tags);
    });
  };

  this.submit_new_cross_reference = function(verse_id, book, absolute_verse_number) {
    var xml_param = "";
    xml_param += 
      "<cross_reference>" +
      "<book>" + book + "</book>" +
      "<absolute_verse_number>" + absolute_verse_number + "</absolute_verse_number>" +
      "</cross_reference>";

    xml_param = $.create_xml_doc(xml_param);

    $.ajax({
      type: 'POST',
      url: '/verses/' + verse_id + '/cross_references',
      contentType: "text/xml",
      data: xml_param,
      processData: false,
      success: bible_browser_controller.communication_controller.on_new_cross_reference
    });
  };

  this.on_verse_preview_load = function(response) {
    //console.log("verse preview load!");
  };

  this.on_new_cross_reference = function(response) {
      $('#cr-edit-box-verse-preview').empty();
      $('#cr-edit-box-input').val('');
      bible_browser_controller.communication_controller.request_cross_references_for_verse(
        bible_browser_controller.current_cr_verse_id
      );
  };

  this.destroy_cross_reference = function(cross_reference_id) {
    $.ajax({
      type: 'DELETE',
      url: '/cross_references/' + cross_reference_id,
      processData: false,
      success: bible_browser_controller.communication_controller.process_server_response_after_cr_destruction
    });
  };

  this.process_server_response_after_cr_destruction = function(response) {
    if (response == "success") {
      $('#cr-edit-box-verse-preview').empty();
      $('#cr-edit-box-input').val('');
      bible_browser_controller.communication_controller.request_cross_references_for_verse(
        bible_browser_controller.current_cr_verse_id
      );
    } else {
      alert('An error occurred while trying to delete the cross reference!');
    }
  };

  this.request_verses_for_selected_tags = function(selected_tags, render_function, renderVerseMetaInfo=true) {
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

