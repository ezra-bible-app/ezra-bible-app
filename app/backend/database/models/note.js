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

'use strict';

/**
 * The Note model is used to manage notes.
 * @typedef Note
 * @category Model
 */
module.exports = (sequelize, DataTypes) => {
  const Note = sequelize.define('Note', {
    noteFileId: DataTypes.INTEGER,
    verseReferenceId: DataTypes.INTEGER,
    text: DataTypes.TEXT,
    bibleBookId: DataTypes.VIRTUAL,
    absoluteVerseNrEng: DataTypes.VIRTUAL,
    absoluteVerseNrHeb: DataTypes.VIRTUAL
  }, {});

  Note.associate = function(models) {
    Note.belongsTo(models.VerseReference);
  };

  Note.findByVerseReferenceId = async function(verseReferenceId, activeNoteFileId=null) {
    var allNotes = await Note.findByVerseReferenceIds(verseReferenceId, activeNoteFileId);
    if (allNotes.length == 1) {
      return allNotes[0];
    } else {
      return null;
    }
  };

  Note.findByVerseReferenceIds = function(verseReferenceIds, activeNoteFileId=null) {
    var query = "SELECT n.*, b.shortTitle AS bibleBookId, vr.absoluteVerseNrEng, vr.absoluteVerseNrHeb" + 
                " FROM VerseReferences vr " +
                " INNER JOIN BibleBooks b ON vr.bibleBookId = b.id" +
                " INNER JOIN Notes n ON n.verseReferenceId = vr.id" +
                " WHERE vr.id IN (" + verseReferenceIds + ")";
    
    if (activeNoteFileId != null && activeNoteFileId != 0) {
      query += " AND n.noteFileId = " + activeNoteFileId;
    } else {
      query += " AND n.noteFileId IS NULL";
    }

    query += " ORDER BY b.number ASC, vr.absoluteVerseNrEng ASC";

    return sequelize.query(query, { model: global.models.Note });
  };

  Note.groupNotesByVerse = function(notes, versification) {
    var groupedVerseNotes = {};

    for (var i = 0; i < notes.length; i++) {
      var note = notes[i];
      var bibleBookId = note.bibleBookId.toLowerCase();

      var absoluteVerseNr = (versification == 'eng' ? note.absoluteVerseNrEng : note.absoluteVerseNrHeb);
      var verseReferenceId = versification + '-' + bibleBookId + '-' + absoluteVerseNr;
      
      groupedVerseNotes[verseReferenceId] = note;
    }

    return groupedVerseNotes;
  };

  Note.persistNote = async function(noteValue, verseObject, versification, activeNoteFileId=null) {
    try {
      var vr = await global.models.VerseReference.findOrCreateFromVerseObject(verseObject, versification);
      var n = await vr.getOrCreateNote(activeNoteFileId);

      if (noteValue != "") {
        // Save the note if it has content
        n.text = noteValue;
        await n.save();
        await global.models.MetaRecord.updateLastModified();

        return {
          success: true,
          dbObject: n.dataValues
        };
      } else {
        // Delete the note if it does not have any content
        await n.destroy();
        await global.models.MetaRecord.updateLastModified();

        return {
          success: true,
          dbObject: n.dataValues
        };
      }
    } catch (error) {
      console.error("ERROR: Could not persist note! " + error);

      return global.getDatabaseException(error);
    }
  };
  
  return Note;
};