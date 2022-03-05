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
/**
 * The VerseTag model is used to handle the relationship between a VerseReference and a Tag.
 * @typedef VerseTag
 * @category Model
 */
module.exports = (sequelize, DataTypes) => {
  const VerseTag = sequelize.define('VerseTag', {
    verseReferenceId: DataTypes.INTEGER,
    tagId: DataTypes.INTEGER,
    tagTitle: DataTypes.VIRTUAL,
    verseId: DataTypes.VIRTUAL,
    bibleBookId: DataTypes.VIRTUAL,
    absoluteVerseNrEng: DataTypes.VIRTUAL,
    absoluteVerseNrHeb: DataTypes.VIRTUAL
  }, {});

  // eslint-disable-next-line no-unused-vars
  VerseTag.associate = function(models) {
    // associations can be defined here
  };

  VerseTag.groupVerseTagsByVerse = function(verseTags, versification) {
    var groupedVerseTags = {};

    for (var i = 0; i < verseTags.length; i++) {
      var vt = verseTags[i];
      var bibleBookId = vt.bibleBookId.toLowerCase();

      var absoluteVerseNr = (versification == 'eng' ? vt.absoluteVerseNrEng : vt.absoluteVerseNrHeb);
      var verseReferenceId = versification + '-' + bibleBookId + '-' + absoluteVerseNr;

      if (groupedVerseTags[verseReferenceId] == null) {
        groupedVerseTags[verseReferenceId] = [];
      }

      groupedVerseTags[verseReferenceId].push(vt);
    }

    return groupedVerseTags;
  };

  VerseTag.findByVerseReferenceIds = function(verseReferenceIds) {
    var query = "SELECT vr.id AS verseReferenceId, t.title AS tagTitle, b.shortTitle AS bibleBookId, vt.*, " +
                " vr.absoluteVerseNrEng, vr.absoluteVerseNrHeb FROM VerseReferences vr" +
                " INNER JOIN VerseTags vt ON vt.verseReferenceId = vr.id" +
                " INNER JOIN Tags t ON t.id = vt.tagId" +
                " INNER JOIN BibleBooks b ON vr.bibleBookId = b.id" +
                " WHERE vr.id IN (" + verseReferenceIds + ")" +
                " ORDER BY b.number ASC, vr.absoluteVerseNrEng ASC, t.title ASC";

    return sequelize.query(query, { model: global.models.VerseTag });
  };

  return VerseTag;
};
