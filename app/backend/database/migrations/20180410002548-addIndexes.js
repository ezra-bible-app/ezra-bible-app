/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2021 Ezra Bible App Development Team <contact@ezrabibleapp.net>

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

'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.addIndex('BibleBooks', { fields: ['number'] }),
      queryInterface.addIndex('Tags', { fields: ['bibleBookId'] }),
      queryInterface.addIndex('Verses', { fields: ['bibleBookId'] }),
      queryInterface.addIndex('Verses', { fields: ['bibleTranslationId'] }),
      queryInterface.addIndex('Verses', { fields: ['verseReferenceId'] }),
      queryInterface.addIndex('VerseReferences', { fields: ['bibleBookId'] }),
      queryInterface.addIndex('VerseTags', { fields: ['verseReferenceId'] }),
      queryInterface.addIndex('VerseTags', { fields: ['tagId'] }),
    ]);
  },

  down: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.removeIndex('BibleBooks', 'bible_books_number'),
      queryInterface.removeIndex('Tags', 'tags_bible_book_id'),
      queryInterface.removeIndex('Verses', 'verses_bible_book_id'),
      queryInterface.removeIndex('Verses', 'verses_bible_translation_id'),
      queryInterface.removeIndex('Verses', 'verses_verse_reference_id'),
      queryInterface.removeIndex('VerseReferences', 'verse_references_bible_book_id'),
      queryInterface.removeIndex('VerseTags', 'verse_tags_verse_reference_id'),
      queryInterface.removeIndex('VerseTags', 'verse_tags_tag_id'),
    ]);
  }
};
