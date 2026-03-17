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

const { waitUntilIdle } = require('../../helpers/ezra_helper.js');
const eventController = require('../../controllers/event_controller.js');

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
  constructor() {
    eventController.subscribe('on-tab-selected', (tabIndex) => {
      this.init(tabIndex);
    });

    eventController.subscribe('on-tab-added', () => {
      // FIXME
      // We need to refresh the last used tag button, because the button is not yet initialized in the tab html template
      // this.onLatestUsedTagChanged(undefined, undefined);
    });

    eventController.subscribe('on-locale-changed', async () => {
      await this.updateLabel();
    });

    eventController.subscribeMultiple(['on-tag-renamed', 'on-tag-deleted'], async () => {
      await this.onLatestUsedTagChanged(undefined, false);
    });

    eventController.subscribe('on-verses-selected', async (selectionDetails) => {
      await this.refreshLastTagButtonState(selectionDetails.selectedElements, selectionDetails.selectedVerseTags);
    });

    eventController.subscribe('on-latest-tag-changed', async (details) => {
      await this.onLatestUsedTagChanged(details.tagId, details.added);
    });

    this._button = null;
  }

  init() {
    var verseContextMenu = $('#verse-context-menu');
    this._button = verseContextMenu.find('.assign-last-tag-button');

    this._button.unbind('click');
    this._button.bind('click', async (event) => {
      event.stopPropagation();
      await this.handleClick();
    });
  }

  async handleClick() {
    if (!this._button[0].classList.contains('ui-state-disabled')) {
      await tag_assignment_panel.assignLastTag();
    }
  }

  resetLabel() {
    var label = i18n.t('tags.assign-last-tag');
    var assignLastTagButton = document.querySelectorAll('.assign-last-tag-button');
    assignLastTagButton.forEach((el) => {
      el.innerText = label;
      el.classList.add('ui-state-disabled');
    });
  }

  async updateLabel(tagTitle=undefined) {
    if (!tagTitle) {
      tagTitle = await this.getCurrentTag();
    }

    var label = i18n.t('tags.assign-last-tag') + ': ' + tagTitle;
    var assignLastTagButton = document.querySelectorAll('.assign-last-tag-button');
    assignLastTagButton.forEach((el) => { el.innerText = label; });
  }

  async getCurrentTag() {
    var tagId = tag_assignment_panel.tag_store.latest_tag_id;
    var currentTag = await tag_assignment_panel.tag_store.getTag(tagId);
    return currentTag !== null ? currentTag.title : '';
  }

  async onLatestUsedTagChanged(tagId=undefined, added=true, currentDbTag=undefined) {
    if (currentDbTag != undefined) {
      tagId = currentDbTag.id;
    } else if (tagId == undefined) {
      tagId = tag_assignment_panel.tag_store.latest_tag_id;
    }

    var currentTag = null;

    if (currentDbTag != undefined) {
      currentTag = currentDbTag;
    } else {
      currentTag = await tag_assignment_panel.tag_store.getTag(tagId);
    }

    if (currentTag != null) {
      await this.updateLabel(currentTag.title);
      var assignLastTagButton = document.querySelectorAll('.assign-last-tag-button');

      if (added) {
        assignLastTagButton.forEach((el) => el.classList.add('ui-state-disabled'));
      } else {
        assignLastTagButton.forEach((el) => el.classList.remove('ui-state-disabled'));
      }

      // Resize the verse list in case the tag label change had an impact on the
      // verse list menu (number of lines changed).
      await waitUntilIdle();
    } else {
      this.resetLabel();
    }
  }

  async refreshLastTagButtonState(versesSelected, selectedVerseTags) {
    var assignLastTagButtons = document.querySelectorAll('.assign-last-tag-button');

    if (versesSelected) {
      if (tag_assignment_panel.tag_store.latest_tag_id != null) {
        var tagFound = false;

        for (var i = 0; i < selectedVerseTags.length; i++) {
          var currentTagTitle = selectedVerseTags[i].title;
          var latestTag = await tag_assignment_panel.tag_store.getTag(tag_assignment_panel.tag_store.latest_tag_id);

          if (currentTagTitle == latestTag.title) {
            tagFound = true;
            break;
          }
        }

        if (!tagFound || selectedVerseTags.length == 0) {
          assignLastTagButtons.forEach((el) => el.classList.remove('ui-state-disabled'));
        } else {
          assignLastTagButtons.forEach((el) => el.classList.add('ui-state-disabled'));
        }

      } else {
        assignLastTagButtons.forEach((e) => e.classList.add('ui-state-disabled'));
      }
    } else {
      assignLastTagButtons.forEach((e) => e.classList.add('ui-state-disabled'));
    }
  }
}

module.exports = AssignLastTagButton;