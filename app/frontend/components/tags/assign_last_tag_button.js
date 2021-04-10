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

/**
 * The AssignLastTagButton always shows the latest used tag. It gets updated when
 * a new tag has been created, when a recently created tag gets deleted,
 * when a tag is renamed or when an existing tag has been used via the
 * tag assignment menu. It is only enabled when verses are selected and do not have the
 * respective tag yet.
 * 
 * @category Component
 */
class AssignLastTagButton {
  constructor() {}

  init(tabIndex=undefined) {
    var currentVerseListMenu = app_controller.getCurrentVerseListMenu(tabIndex);

    currentVerseListMenu.find('.assign-last-tag-button').bind('click', async (event) => {
      if (!event.target.classList.contains('ui-state-disabled')) {
        uiHelper.showTextLoadingIndicator();
        await waitUntilIdle();
        await tags_controller.assignLastTag();
        uiHelper.hideTextLoadingIndicator();
      }
    });
  }

  async onLatestUsedTagChanged(tagId=undefined, added=true, currentDbTag=undefined) {
    if (currentDbTag != undefined) {
      tagId = currentDbTag.id;
    } else if (tagId == undefined) {
      tagId = tags_controller.tag_store.latest_tag_id;
    }

    var currentTag = null;

    if (currentDbTag != undefined) {
      currentTag = currentDbTag;
    } else {
      currentTag = await tags_controller.tag_store.getTag(tagId);
    }

    if (currentTag != null) {
      var assignLastTagButton = $('.assign-last-tag-button');
      var label = i18n.t('tags-toolbar.assign-last-tag') + ': ' + currentTag.title;
      assignLastTagButton.text(label);

      if (added) {
        assignLastTagButton.addClass('ui-state-disabled');
      } else {
        assignLastTagButton.removeClass('ui-state-disabled');
      }

      // Resize the verse list in case the tag label change had an impact on the
      // verse list menu (number of lines changed).
      await waitUntilIdle();
      uiHelper.resizeVerseList();
    }
  }

  async refreshLastTagButtonState(versesSelected, selectedVerseTags) {
    if (versesSelected) {
      if (tags_controller.tag_store.latest_tag_id != null) {
        var tagFound = false;

        for (var i = 0; i < selectedVerseTags.length; i++) {
          var currentTagTitle = selectedVerseTags[i].title;
          var latestTag = await tags_controller.tag_store.getTag(tags_controller.tag_store.latest_tag_id);

          if (currentTagTitle == latestTag.title) {
            tagFound = true;
            break;
          }
        }

        if (!tagFound || selectedVerseTags.length == 0) {
          $('.assign-last-tag-button').removeClass('ui-state-disabled');
        } else {
          $('.assign-last-tag-button').addClass('ui-state-disabled');
        }

      } else {
        $('.assign-last-tag-button').addClass('ui-state-disabled');
      }
    } else {
      $('.assign-last-tag-button').addClass('ui-state-disabled');
    }
  }
}

module.exports = AssignLastTagButton;