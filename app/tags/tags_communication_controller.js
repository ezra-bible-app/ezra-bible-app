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

class TagsCommunicationController
{
  constructor() {  }

  request_tags(currentBook=undefined) {
    if (currentBook === undefined) {
      var currentBook = bible_browser_controller.tab_controller.getTab().getBook();
    }

    models.BibleBook.findOne({ where: { shortTitle: currentBook }}).then(bibleBook => {
      var bibleBookId = null;
      if (bibleBook != null) {
        bibleBookId = bibleBook.id;
      }

      models.Tag.getGlobalAndBookTags(bibleBookId).then(tags => {
        tags_controller.render_tags(tags);
      });
    });
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

  destroy_tag = async function(id) {
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

  assign_tag_to_verses(tagId, verseIds) {
    tags_controller.communication_controller.update_tags_on_verses(tagId, verseIds, "add");
  }

  remove_tag_from_verses(tagId, verseIds) {
    tags_controller.communication_controller.update_tags_on_verses(tagId, verseIds, "remove");
  }

  update_tags_on_verses(tagId, verseIds, action) {
    models.Tag.findByPk(tagId).then(tag => {
      for (vId of verseIds) {
        models.Verse.findByPk(vId).then(verse => {
          verse.findOrCreateVerseReference().then(vr => {
            if (action == "add") {
              vr.addTag(tag.id);
            } else if (action == "remove") {
              vr.removeTag(tag.id);
            }
          });
        });
      }
    });

    var increment = (action == "add" ? true : false);
    tags_controller.update_tag_verse_count(tagId, verseIds.length, increment);
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