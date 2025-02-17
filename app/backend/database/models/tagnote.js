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
 * The TagNote model is used to manage notes for tags.
 * @typedef TagNote
 * @category Model
 */
module.exports = (sequelize, DataTypes) => {
  const TagNote = sequelize.define('TagNote', {
    tagId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Tags',
        key: 'id'
      }
    },
    introduction: DataTypes.TEXT,
    conclusion: DataTypes.TEXT,
    introductionUpdatedAt: DataTypes.DATE,
    conclusionUpdatedAt: DataTypes.DATE
  }, {
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: false
  });

  TagNote.associate = function(models) {
    TagNote.belongsTo(models.Tag, { foreignKey: 'tagId' });
  };

  TagNote.persistIntroduction = async function(tagId, introduction) {
    let tagNote = await TagNote.findOne({ where: { tagId: tagId } });

    if (tagNote) {
      tagNote.introduction = introduction;
      tagNote.introductionUpdatedAt = new Date();
      await tagNote.save();
    } else {
      tagNote = await TagNote.create({
        tagId: tagId,
        introduction: introduction,
        introductionUpdatedAt: new Date()
      });
    }

    return tagNote.dataValues;
  };

  TagNote.persistConclusion = async function(tagId, conclusion) {
    let tagNote = await TagNote.findOne({ where: { tagId: tagId } });

    if (tagNote) {
      tagNote.conclusion = conclusion;
      tagNote.conclusionUpdatedAt = new Date();
      await tagNote.save();
    } else {
      tagNote = await TagNote.create({
        tagId: tagId,
        conclusion: conclusion,
        conclusionUpdatedAt: new Date()
      });
    }

    return tagNote.dataValues;
  };

  return TagNote;
};
