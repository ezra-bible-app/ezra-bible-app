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

const exportController = require('../controllers/export_controller.js');

/**
 * The TaggedVerseExport component implements the export of tagged verses into a Word document.
 * 
 * @category Component
 */
class TaggedVerseExport {

  enableTaggedVersesExportButton(tabIndex) {
    var currentVerseListMenu = app_controller.getCurrentVerseListMenu(tabIndex);
    var exportButton = currentVerseListMenu.find('.export-tagged-verses-button');
    exportButton.removeClass('ui-state-disabled');
    exportButton.unbind('click');
    exportButton.bind('click', (event) => {
      if (!$(event.target).hasClass('ui-state-disabled')) {
        this._runExport();
      }
    });
    exportButton.show();
    exportButton.removeClass('events-configured');
    uiHelper.configureButtonStyles('.verse-list-menu');
  }

  disableTaggedVersesExportButton(tabIndex=undefined) {
    var currentVerseListMenu = app_controller.getCurrentVerseListMenu(tabIndex);
    currentVerseListMenu.find('.export-tagged-verses-button').addClass('ui-state-disabled');
  }

  _runExport() {
    const unixTagTitleList = this._getUnixTagTitleList();
    exportController.showSaveDialog(unixTagTitleList).then(filePath => {
      if (filePath) {

        const currentTab = app_controller.tab_controller.getTab();
        const currentTagIdList = currentTab.getTagIdList();
  
        const currentTagTitleList = app_controller.tab_controller.getTab().getTagTitleList();
        const title = `${i18n.t("tags.verses-tagged-with")} _${currentTagTitleList}_`;
    
    
        app_controller.text_controller.requestVersesForSelectedTags(
          undefined,
          null,
          currentTagIdList,
          async (bibleBooks, groupedVerseTags, verses) => { await exportController.saveWordDocument(title, bibleBooks, verses); },
          'docx',
          false
        );
      }
    });
  }
  
  _getUnixTagTitleList() {
    var currentTagTitleList = app_controller.tab_controller.getTab().getTagTitleList();
    var unixTagTitleList = currentTagTitleList.replace(/, /g, "__");
    unixTagTitleList = unixTagTitleList.replace(/ /g, "_");

    // Eliminate all special characters in the tag title list
    var specialCharacters = /[',;:()[\]{}=+\-?/"><|@*~#$%§!^°&`]/g;
    unixTagTitleList = unixTagTitleList.replace(specialCharacters, "");

    return unixTagTitleList;
  }
}

module.exports = TaggedVerseExport;