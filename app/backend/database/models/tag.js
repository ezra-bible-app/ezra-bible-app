/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2025 Ezra Bible App Development Team <contact@ezrabibleapp.net>

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
 * The Tag model is used to manage tags.
 * @typedef Tag
 * @category Model
 */
module.exports = (sequelize, DataTypes) => {
  const Tag = sequelize.define('Tag', {
    title: DataTypes.STRING,
    bibleBookId: DataTypes.INTEGER,
    noteFileId: DataTypes.INTEGER,
    tagGroupList: DataTypes.VIRTUAL,
    globalAssignmentCount: DataTypes.VIRTUAL,
    bookAssignmentCount: DataTypes.VIRTUAL,
    lastUsed: DataTypes.VIRTUAL
  }, {});

  Tag.associate = function(models) {
    Tag.belongsToMany(models.VerseReference, {through: 'VerseTags'});
    Tag.belongsToMany(models.TagGroup, {through: 'TagGroupMembers'});
  };

  Tag.createNewTag = async function(newTagTitle, createNoteFile=false) {
    try {
      let noteFileId = null;

      if (createNoteFile) {
        const noteFileResult = await global.models.NoteFile.createNoteFile(newTagTitle);

        if (noteFileResult.success) {
          noteFileId = noteFileResult.dbObject.id;
        } else {
          return noteFileResult;
        }
      }

      let newTag = await global.models.Tag.create({
        title: newTagTitle,
        bibleBookId: null,
        noteFileId: noteFileId
      });

      await global.models.MetaRecord.updateLastModified();

      return {
        success: true,
        dbObject: newTag.dataValues,
      };

    } catch (error) {
      console.error('An error occurred while trying to save the new tag: ' + error);

      return global.getDatabaseException(error);
    }
  };

  Tag.destroyTag = async function(id, deleteNoteFile=false) {
    try {
      if (deleteNoteFile) {
        const tag = await global.models.Tag.findByPk(id);
        if (tag.noteFileId) {
          await global.models.NoteFile.destroyNoteFile(tag.noteFileId);
        }
      }

      await global.models.VerseTag.destroy({ where: { tagId: id } });
      await global.models.TagGroupMember.destroy({ where: { tagId: id }});
      await global.models.Tag.destroy({ where: { id: id } });
      await global.models.MetaRecord.updateLastModified();

      return {
        success: true
      };

    } catch (error) {
      console.error('An error occurred while trying to delete the tag with id ' + id + ': ' + error);

      return global.getDatabaseException(error);
    }
  };

  Tag.updateTag = async function(id, newTitle, addTagGroups, removeTagGroups) {
    try {
      let tag = await global.models.Tag.findByPk(id);
      let titleChanged = tag.title != newTitle;

      if (titleChanged) {
        await global.models.Tag.update({ title: newTitle }, { where: { id: id }});
      }

      for (const tagGroupId of addTagGroups) {
        let tagGroup = await global.models.TagGroup.findByPk(tagGroupId);
        await tagGroup.addTag(id);
      }

      for (const tagGroupId of removeTagGroups) {
        let tagGroup = await global.models.TagGroup.findByPk(tagGroupId);
        await tagGroup.removeTag(id);
      }

      await global.models.MetaRecord.updateLastModified();

      return {
        success: true
      };

    } catch (error) {
      console.error("An error occurred while trying to update the tag with id " + id + ": " + error);

      return global.getDatabaseException(error);
    }
  };

  Tag.updateTagsOnVerses = async function(tagId, verseObjects, versification, action) {
    try {
      var tag = await global.models.Tag.findByPk(tagId);

      for (var verseObject of verseObjects) {
        var verseReference = await global.models.VerseReference.findOrCreateFromVerseObject(verseObject, versification);
        
        if (action == "add") {
          await verseReference.addTag(tag.id);
        } else if (action == "remove") {
          await verseReference.removeTag(tag.id);
        }
      }

      await global.models.MetaRecord.updateLastModified();
      return {
        success: true
      };
      
    } catch (error) {
      console.error("An error occurred while trying to update tags on selected verses: " + error);

      return global.getDatabaseException(error);
    }
  };

  Tag.getAllTags = function(bibleBookId = 0, lastUsed=false, onlyStats=false) {
    var query = "SELECT t.*," +
                 " SUM(CASE WHEN vt.tagId IS NULL THEN 0 ELSE 1 END) AS globalAssignmentCount," +
                 " SUM(CASE WHEN vr.bibleBookId=" + bibleBookId + " THEN 1 ELSE 0 END) AS bookAssignmentCount";

    if (!onlyStats) {
      query += ", GROUP_CONCAT(DISTINCT tg.id) AS tagGroupList";
    }

    query += ", strftime('%s', MAX(vt.updatedAt)) AS lastUsed";

    query += " FROM Tags t" +
             " LEFT JOIN VerseTags vt ON vt.tagId = t.id" +
             " LEFT JOIN VerseReferences vr ON vt.verseReferenceId = vr.id";

    if (!onlyStats) {
      query += " LEFT JOIN TagGroupMembers tgm ON tgm.tagId = t.id" +
               " LEFT JOIN TagGroups tg ON tg.id = tgm.tagGroupId";
    }

    query += " GROUP BY t.id";
    
    if (lastUsed) {
      query += " ORDER BY lastUsed DESC limit 5";
    } else if (!onlyStats) {
      query += " ORDER BY t.title ASC";
    }

    return sequelize.query(query, { model: global.models.Tag });
  };

  Tag.getTagCount = async function(bibleBookId=0) {
    var bibleBookQuery = '';

    if (bibleBookId != 0) {
      bibleBookQuery = `
        LEFT JOIN VerseTags vt ON vt.tagId = t.id
        LEFT JOIN VerseReferences vr ON vt.verseReferenceId = vr.id
        WHERE vr.bibleBookId = ${bibleBookId}
      `;
    }

    var query = `SELECT t.id FROM Tags t ${bibleBookQuery}`;
    var records = await sequelize.query(query, { model: global.models.Tag });
    return records.length;
  };

  return Tag;
};
