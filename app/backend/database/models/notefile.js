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

module.exports = (sequelize, DataTypes) => {
  const NoteFile = sequelize.define('NoteFile', {
    title: DataTypes.STRING
  }, {
    timestamps: true
  });

  NoteFile.associate = function(models) {
    NoteFile.hasMany(models.Note);
  };

  NoteFile.createNoteFile = async function(noteFileTitle) {
    try {
      var newNoteFile = await global.models.NoteFile.create({
        title: noteFileTitle
      });

      await global.models.MetaRecord.updateLastModified();

      return {
        success: true,
        dbObject: newNoteFile.dataValues,
      };

    } catch (error) {
      console.error('An error occurred while trying to save the new note file: ' + error);

      return global.getDatabaseException(error);
    }
  };

  NoteFile.destroyNoteFile = async function(id) {
    try {
      await global.models.Note.destroy({ where: { noteFileId: id } });
      await global.models.NoteFile.destroy({ where: { id: id } });
      await global.models.MetaRecord.updateLastModified();

      return {
        success: true
      };

    } catch (error) {
      console.error('An error occurred while trying to delete the note file with id ' + id + ': ' + error);

      return global.getDatabaseException(error);
    }
  };

  return NoteFile;
};
