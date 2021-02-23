/* This file is part of Ezra Bible Software.

   Copyright (C) 2019 - 2021 Tobias Klein <contact@ezra-project.net>

   Ezra Bible Software is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 2 of the License, or
   (at your option) any later version.

   Ezra Bible Software is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Bible Software. See the file LICENSE.
   If not, see <http://www.gnu.org/licenses/>. */

class TagsPersistanceController
{
  constructor(models) {
    this._models = models;
  }

  async create_new_tag(new_tag_title) {
    var model = this._models.Tag;

    try {
      var newTag = await model.create({
        title: new_tag_title,
        bibleBookId: null
      });

      await this._models.MetaRecord.updateLastModified();
      // Set sequelize attribute to null, because it cannot be properly serialized!
      newTag._modelOptions.sequelize = null;
      return newTag;

    } catch (error) {
      console.error('An error occurred while trying to save the new tag: ' + error);
      return null;
    }
  }

  async destroy_tag(id) {
    try {
      await this._models.VerseTag.destroy({ where: { tagId: id } });
      await this._models.Tag.destroy({ where: { id: id } });
      await this._models.MetaRecord.updateLastModified();

    } catch(e) {
      alert('An error occurred while trying to delete the tag with id ' + id + ': ' + e);
    };
  }

  async update_tags_on_verses(tagId, verseObjects, versification, action) {
    var tag = await this._models.Tag.findByPk(tagId);

    for (var verseObject of verseObjects) {
      var verseReference = await this._models.VerseReference.findOrCreateFromVerseObject(verseObject, versification);
      
      if (action == "add") {
        await verseReference.addTag(tag.id);
      } else if (action == "remove") {
        await verseReference.removeTag(tag.id);
      }
    }

    await this._models.MetaRecord.updateLastModified();
  }

  update_tag(id, title) {
    this._models.Tag.update(
      { title: title },
      { where: { id: id }}
    ).then(() => {
      this._models.MetaRecord.updateLastModified();
    }).catch(error => {
      alert("An error occurred while trying to rename the tag!");
    });
  }
}

module.exports = TagsPersistanceController;