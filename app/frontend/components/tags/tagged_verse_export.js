/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2021 Tobias Klein <contact@ezra-project.net>

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
 * The TaggedVerseExport component implements the export of tagged verses into a Word document.
 * 
 * @category Component
 */
class TaggedVerseExport {
  constructor() {
    this.exportFilePath = null;
  }

  enableTaggedVersesExportButton(tabIndex) {
    var currentVerseListMenu = app_controller.getCurrentVerseListMenu(tabIndex);
    var exportButton = currentVerseListMenu.find('.export-tagged-verses-button');
    exportButton.removeClass('ui-state-disabled');
    exportButton.unbind('click');
    exportButton.bind('click', (event) => {
      if (!$(event.target).hasClass('ui-state-disabled')) {
        this.runExport();
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

  getBibleBookVerseBlocks(bibleBook, verses) {
    var lastVerseNr = 0;
    var allBlocks = [];
    var currentBlock = [];

    // Transform the list of verses into a list of verse blocks (verses that belong together)
    for (var j = 0; j < verses.length; j++) {
      var currentVerse = verses[j];

      if (currentVerse.bibleBookShortTitle == bibleBook.shortTitle) {

        if (currentVerse.absoluteVerseNr > (lastVerseNr + 1)) {
          if (currentBlock.length > 0) {
            allBlocks.push(currentBlock);
          }
          currentBlock = [];
        }
        
        currentBlock.push(currentVerse);
        lastVerseNr = currentVerse.absoluteVerseNr;
      }
    }

    allBlocks.push(currentBlock);

    return allBlocks;
  }

  async renderVerseBlocks(paragraph, bibleBook, verseBlocks) {
    var bibleTranslationId = app_controller.tab_controller.getTab().getBibleTranslationId();
    var separator = await getReferenceSeparator(bibleTranslationId);

    for (var j = 0; j < verseBlocks.length; j++) {
      var currentBlock = verseBlocks[j];

      var firstVerse = currentBlock[0];
      var lastVerse = currentBlock[currentBlock.length - 1];
      
      // Output the verse reference of this block
      var bookTitle = await i18nHelper.getSwordTranslation(bibleBook.longTitle);
      paragraph.addText(bookTitle);
      paragraph.addText(" " + firstVerse.chapter + separator + firstVerse.verseNr);

      if (currentBlock.length >= 2) { // At least 2 verses, a bigger block
        var secondRef = "";

        if (lastVerse.chapter == firstVerse.chapter) {
          secondRef = "-" + lastVerse.verseNr;
        } else {
          secondRef = " - " + lastVerse.chapter + separator + lastVerse.verseNr;
        }

        paragraph.addText(secondRef);
      }
      paragraph.addLineBreak();

      for (var k = 0; k < currentBlock.length; k++) {
        var currentVerse = currentBlock[k];
        var currentVerseContent = "";
        var currentVerseNodes = $(jQuery.parseHTML(currentVerse.content));
        
        for (var i = 0; i < currentVerseNodes.length; i++) {
          var currentNode = $(currentVerseNodes[i]);
          var currentNodeName = currentNode[0].nodeName;
          // We export everything that is not a DIV
          // DIV elements contain markup that should not be in the word document
          if (currentNodeName != 'DIV') {
            currentVerseContent += currentNode.text();
          }
        }
      
        paragraph.addText(currentVerse.verseNr + "", { superscript: true });
        paragraph.addText(" " + currentVerseContent);
        paragraph.addLineBreak();
      }

      // Line break after block end
      paragraph.addLineBreak();
    }
  }

  async renderWordDocument(bibleBooks, groupedVerseTags, verses) {
    const officegen = require('officegen');
    const fs = require('fs');
    const shell = require('electron').remote.shell;

    var currentTagTitleList = app_controller.tab_controller.getTab().getTagTitleList();
    var title = i18n.t("tags.verses-tagged-with") + currentTagTitleList;

    var docx = officegen({
      type: 'docx',
      title: title,
      description: 'Automatically generated by Ezra Bible App',
      pageMargins: {
        top: 1200,
        bottom: 1200,
        left: 1000,
        right: 1000
      }
    });

    // Officegen calling this function after finishing to generate the docx document:
    docx.on('finalize', (written) => {
      shell.openPath(this.exportFilePath);
    });

    // Officegen calling this function to report errors:
    docx.on('error', function(err) {
      console.log(err)
    });
    
    var p = docx.createP();
    var versesTaggedWith = i18n.t("tags.verses-tagged-with") + " ";
    p.addText(versesTaggedWith, { font_size: 14, bold: true });
    p.addText(currentTagTitleList, { font_size: 14, bold: true, italic: true });
    p.addLineBreak();
    p.addLineBreak();

    for (var i = 0; i < bibleBooks.length; i++) {
      var currentBook = bibleBooks[i];
      var bookTitle = await i18nHelper.getSwordTranslation(currentBook.longTitle);

      p.addText(bookTitle, { bold: true });
      p.addLineBreak();

      var allBlocks = this.getBibleBookVerseBlocks(currentBook, verses);
      await this.renderVerseBlocks(p, currentBook, allBlocks);

      // Line break after book end
      p.addLineBreak();
    }

    //console.log("Generating word document " + this.saveFilePath);
    var out = fs.createWriteStream(this.exportFilePath);

    out.on('error', function(err) {
      console.log(err);
    });

    // Async call to generate the output file:
    docx.generate(out);
  }

  getPaddedNumber(number) {
    var paddedNumber = "" + number;
    if (number < 10) {
      paddedNumber = "0" + number;
    }
    return paddedNumber;
  }

  getUnixTagTitleList() {
    var currentTagTitleList = app_controller.tab_controller.getTab().getTagTitleList();
    var unixTagTitleList = currentTagTitleList.replace(/, /g, "__");
    unixTagTitleList = unixTagTitleList.replace(/ /g, "_");

    // Eliminate all special characters in the tag title list
    var specialCharacters = /[',;:\(\)\[\]{}=+\-\?\/\"><|@\*~#$%§!^°&`]/g;
    unixTagTitleList = unixTagTitleList.replace(specialCharacters, "");

    return unixTagTitleList;
  }

  getExportDialogOptions() {
    const app = require('electron').remote.app;
    var today = new Date();
    var month = this.getPaddedNumber(today.getMonth()+1);
    var day = this.getPaddedNumber(today.getDate());
    var date = today.getFullYear() + '_' + month + '_' + day;
    var unixTagTitleList = this.getUnixTagTitleList();
    var fileName = date + '__' + unixTagTitleList + '.docx';

    var dialogOptions = {
      defaultPath: app.getPath('documents') + '/' + fileName,
      title: i18n.t("tags.export-tagged-verse-list"),
      buttonLabel: i18n.t("tags.run-export")
    }

    return dialogOptions;
  }

  runExport() {
    const dialog = require('electron').remote.dialog;
    var dialogOptions = this.getExportDialogOptions();

    dialog.showSaveDialog(null, dialogOptions).then(result => {
      this.exportFilePath = result.filePath;

      if (!result.canceled && this.exportFilePath != undefined) {
        var currentTab = app_controller.tab_controller.getTab();
        var currentTagIdList = currentTab.getTagIdList();
  
        app_controller.text_controller.requestVersesForSelectedTags(
          undefined,
          null,
          currentTagIdList,
          async (bibleBooks, groupedVerseTags, verses) => { await this.renderWordDocument(bibleBooks, groupedVerseTags, verses) },
          'docx',
          false
        );
      }
    });
  }
}

module.exports = TaggedVerseExport;