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

function TagsCommunicationController()
{
  this.request_tags = function(currentBook=undefined) {
    if (currentBook === undefined) {
      var currentBook = bible_browser_controller.tab_controller.getCurrentTabBook();
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
  };

  this.process_server_response_after_meta_tag_creation = function(response) {
    if (response == "success") {
      tags_controller.communication_controller.request_meta_tags();
    } else {
      alert('An error occurred while trying to save the new meta tag!');
    }
  };

  this.process_server_response_after_meta_tag_destruction = function(response) {
    if (response == "success") {
      tags_controller.communication_controller.request_meta_tags();
    } else {
      alert('An error occurred while trying to delete the new meta tag!');
    }
  };

  this.create_new_tag = function(new_tag_title, type) {
    var isBookTag = (type == 'book' ? true : false);
    var isMetaTag = (type == 'meta' ? true: false);

    var model = models.Tag;
    if (isMetaTag) {
      //
    }

    var bibleBookId = null;
    if (isBookTag) {
      bibleBookId = bible_browser_controller.tab_controller.getCurrentTabBook();
    }

    model.create({
      title: new_tag_title,
      bibleBookId: bibleBookId
    }).then(tag => {
      bible_browser_controller.communication_controller.request_tags_for_menu();
      tags_controller.communication_controller.request_tags();
    }).catch(error => {
      alert('An error occurred while trying to save the new tag: ' + error);
    });
  };

  this.destroy_meta_tag = function(id) {
    $.ajax({
      type: 'DELETE',
      url: '/meta_tags/' + id,
      processData: false,
      success: tags_controller.communication_controller.process_server_response_after_meta_tag_destruction
    });
  };

  this.destroy_tag = async function(id) {
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

        bible_browser_controller.communication_controller.request_tags_for_menu();

      }).catch(error => {
        alert('An error occurred while trying to delete the tag with id ' + id + ': ' + error);
      })
    );
  };

  this.param_for_xml_verse_selection = function(xml_verse_selection) {
    var currentBook = bible_browser_controller.tab_controller.getCurrentTabBook();
    var xml_params = "<params>";
    xml_params += xml_verse_selection;
    xml_params += "<book-code>" + currentBook + "</book-code>";
    xml_params += "</params>";

    xml_params = $.create_xml_doc(xml_params);

    return xml_params;
  };

  this.assign_tag_to_verses = function(tagId, verseIds) {
    tags_controller.communication_controller.update_tags_on_verses(tagId, verseIds, "add");
  };

  this.remove_tag_from_verses = function(tagId, verseIds) {
    tags_controller.communication_controller.update_tags_on_verses(tagId, verseIds, "remove");
  };

  this.update_tags_on_verses = function(tagId, verseIds, action) {
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
  };

  this.process_server_response_after_tag_changes = function(response) {
    if (response != "success") {
      alert('An error occurred while trying to assign the tags!');
    }
  };

  this.request_assigned_tags = function(verse_reference_ids) {
    var verse_references_url_param = verse_reference_ids.join(',');

    $.ajax({
      type: 'GET',
      url: '/verse_references/' + verse_references_url_param + '/assigned_tags',
      processData: false,
      success: tags_controller.update_assigned_tags
    });
  };

  this.update_tag = function(id, title) {
    models.Tag.update(
      { title: title },
      { where: { id: id }}
    ).then(() => {
      tags_controller.rename_tag_in_view(id, title);
    }).catch(error => {
      alert("An error occurred while trying to rename the tag!");
    });
  };

  this.update_meta_tag = function(id, title) {
    var xml_param = "<meta_tag_attributes>";
    xml_param += "<title>" + title + "</title>";
    xml_param += "</meta_tag_attributes>";

    xml_param = $.create_xml_doc(xml_param);

    $.ajax({
      type: 'PUT',
      url: '/meta_tags/' + id,
      contentType: "text/xml",
      data: xml_param,
      processData: false,
      success: tags_controller.communication_controller.request_meta_tags
    });
  };

  this.request_meta_tags = function() {
    $.ajax({
      type: 'GET',
      url: '/meta_tags',
      processData: false,
      success: tags_controller.render_meta_tags
    });
  };

  this.assign_meta_tag = function(meta_tag_id, tag_id) {
    $.ajax({
      type: 'PUT',
      url: '/meta_tags/' + meta_tag_id + '/tags/' + tag_id,
      processData: false,
      success: tags_controller.communication_controller.process_server_response_after_tag_changes
    });
  };

  this.remove_meta_tag_assignment = function(meta_tag_id, tag_id) {
    $.ajax({
      type: 'DELETE',
      url: '/meta_tags/' + meta_tag_id + '/tags/' + tag_id,
      processData: false,
      success: tags_controller.communication_controller.process_server_response_after_tag_changes
    });
  };
}

