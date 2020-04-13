/* This file is part of Ezra Project.

   Copyright (C) 2019 - 2020 Tobias Klein <contact@ezra-project.net>

   Ezra Project is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   Ezra Project is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Project. See the file LICENSE.
   If not, see <http://www.gnu.org/licenses/>. */

class TagsCommunicationController
{
  constructor() {  }

  async request_tags(currentBook=undefined) {
    if (currentBook === undefined) {
      var currentBook = bible_browser_controller.tab_controller.getTab().getBook();
    }

    var bibleBook = await models.BibleBook.findOne({ where: { shortTitle: currentBook }});
    
    var bibleBookId = null;
    if (bibleBook != null) {
      bibleBookId = bibleBook.id;
    }

    var tags = await models.Tag.getAllTags(bibleBookId);
    tags_controller.render_tags(tags);
  }

  create_new_tag(new_tag_title, type) {
    var isBookTag = (type == 'book' ? true : false);

    var model = models.Tag;

    var bibleBookId = null;
    if (isBookTag) {
      bibleBookId = bible_browser_controller.tab_controller.getTab().getBook();
    }

    model.create({
      title: new_tag_title,
      bibleBookId: bibleBookId
    }).then(tag => {
      bible_browser_controller.tag_selection_menu.requestTagsForMenu();
      tags_controller.communication_controller.request_tags();
    }).catch(error => {
      alert('An error occurred while trying to save the new tag: ' + error);
    });
  }

  async destroy_tag(id) {
    models.VerseTag.destroy({
      where: {
        tagId: id
      }
    }).then(
      models.Tag.destroy({
        where: {
          id: id
        }
      }).then(affectedRows => {
        tags_controller.remove_tag_by_id(tags_controller.tag_to_be_deleted,
                                         tags_controller.tag_to_be_deleted_is_global,
                                         tags_controller.tag_to_be_deleted_title);

        bible_browser_controller.tag_selection_menu.requestTagsForMenu();

      }).catch(error => {
        alert('An error occurred while trying to delete the tag with id ' + id + ': ' + error);
      })
    );
  }

  assign_tag_to_verses(tagId, verseBoxes) {
    tags_controller.communication_controller.update_tags_on_verses(tagId, verseBoxes, "add");
  }

  remove_tag_from_verses(tagId, verseBoxes) {
    tags_controller.communication_controller.update_tags_on_verses(tagId, verseBoxes, "remove");
  }

  async update_tags_on_verses(tagId, verseBoxes, action) {
    var increment = (action == "add" ? true : false);
    tags_controller.update_tag_verse_count(tagId, verseBoxes.length, increment);
    var tag = await models.Tag.findByPk(tagId);

    for (var verseBox of verseBoxes) {
      var verseReference = await models.VerseReference.findOrCreateFromVerseBox(verseBox);
      
      if (action == "add") {
        await verseReference.addTag(tag.id);
      } else if (action == "remove") {
        await verseReference.removeTag(tag.id);
      }
    }
  }

  update_tag(id, title) {
    models.Tag.update(
      { title: title },
      { where: { id: id }}
    ).then(() => {
      tags_controller.rename_tag_in_view(id, title);
    }).catch(error => {
      alert("An error occurred while trying to rename the tag!");
    });
  }
}

module.exports = TagsCommunicationController;