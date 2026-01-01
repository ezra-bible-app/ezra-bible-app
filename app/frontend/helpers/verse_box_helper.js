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

const VerseBox = require("../ui_models/verse_box.js");
const verseListController = require('../controllers/verse_list_controller.js');
const sectionLabelHelper = require('./section_label_helper.js');

class VerseBoxHelper {
  constructor() {}

  // FIXME: Replace this with the function from VerseBox
  getVerseReferenceId(verseBox) {
    var classList = $(verseBox)[0].classList;
    var verseReferenceId = null;

    for (var i = 0; i < classList.length; i++) {
      if (classList[i].indexOf('verse-reference-id') != -1) {
        verseReferenceId = classList[i];
        break;
      }
    }

    return verseReferenceId;
  }

  getBookListFromVerseBoxes(verseBoxes) {
    var bookList = [];

    for (let i = 0; i < verseBoxes.length; i++) {
      let verseBox = verseBoxes[i];
      var verseBibleBook = new VerseBox(verseBox).getBibleBookShortTitle();

      if (!bookList.includes(verseBibleBook)) {
        bookList.push(verseBibleBook);
      }
    }

    return bookList;
  }

  getBibleBookShortTitleFromElement(element) {
    var bibleBookShortTitle = null;

    if (element != null) {
      if (element.classList.contains('book-notes')) {
        bibleBookShortTitle = element.getAttribute('verse-reference-id');
        bibleBookShortTitle =  bibleBookShortTitle[0].toUpperCase() + bibleBookShortTitle.substring(1);
      } else {
        bibleBookShortTitle = new VerseBox(element).getBibleBookShortTitle();
      }
    }

    return bibleBookShortTitle;
  }

  getSectionTitleFromVerseBox(verseBox) {
    var absoluteVerseNumber = parseInt(verseBox.getAttribute('abs-verse-nr'));
    var currentElement = verseBox;
    var sectionTitle = null;

    for (var i = absoluteVerseNumber; i >= 1; i--) {
      currentElement = currentElement.previousElementSibling;

      if (currentElement == null) {
        break;
      }

      if (currentElement.classList.contains('sword-section-title') && 
          currentElement.getAttribute('subtype') != 'x-Chapter' &&
          currentElement.getAttribute('type') != 'psalm' &&
          currentElement.getAttribute('type') != 'chapter' &&
          currentElement.getAttribute('type') != 'scope' &&
          currentElement.getAttribute('type') != 'acrostic'
      ) {
        sectionTitle = currentElement.innerText;
        break;
      }
    }

    return sectionTitle;
  }

  async iterateAndChangeAllDuplicateVerseBoxes(referenceVerseBoxElement, changedValue, changeCallback) {
    if (referenceVerseBoxElement == null) {
      return;
    }

    var currentTabIndex = app_controller.tab_controller.getSelectedTabIndex();
    var tabCount = app_controller.tab_controller.getTabCount();

    var bibleBook = this.getBibleBookShortTitleFromElement(referenceVerseBoxElement);
    var absoluteVerseNumber = null;
    var chapter = null;
    var verseNumber = null;
    var absoluteVerseNrs = null;

    if (referenceVerseBoxElement.classList.contains('book-notes')) {
      absoluteVerseNumber = 0;
      chapter = 0;
      verseNumber = 0;

      absoluteVerseNrs = {};
      absoluteVerseNrs['absoluteVerseNrEng'] = 0;
      absoluteVerseNrs['absoluteVerseNrHeb'] = 0;
    } else {
      let referenceVerseBox = new VerseBox(referenceVerseBoxElement);
      absoluteVerseNumber = referenceVerseBox.getAbsoluteVerseNumber();
      chapter = referenceVerseBox.getChapter();
      verseNumber = referenceVerseBox.getVerseNumber();

      absoluteVerseNrs = await ipcDb.getAbsoluteVerseNumbersFromReference(sourceVersification,
                                                                          bibleBook,
                                                                          absoluteVerseNumber,
                                                                          chapter,
                                                                          verseNumber);
    }


    var referenceBibleBook = await ipcDb.getBibleBook(bibleBook);
    const swordModuleHelper = require('../helpers/sword_module_helper.js');

    var sourceTabTranslation = app_controller.tab_controller.getTab(currentTabIndex).getBibleTranslationId();
    var sourceVersification = 'ENGLISH';
    try {
      await swordModuleHelper.getVersification(sourceTabTranslation);
    } catch (exception) {
      console.warn('Got exception when getting versification: ' + exception);
    }

    for (let i = 0; i < tabCount; i++) {
      if (i != currentTabIndex) {
        let currentTabTranslation = app_controller.tab_controller.getTab(i).getBibleTranslationId();
        let currentVersification = await swordModuleHelper.getVersification(currentTabTranslation);
        let currentTargetVerseNr = "";

        if (currentVersification == 'HEBREW') {
          currentTargetVerseNr = absoluteVerseNrs.absoluteVerseNrHeb;
        } else {
          currentTargetVerseNr = absoluteVerseNrs.absoluteVerseNrEng;
        }

        let targetVerseListFrame = verseListController.getCurrentVerseListFrame(i);
        let targetVerseBox = targetVerseListFrame[0].querySelectorAll('.verse-nr-' + currentTargetVerseNr);

        // There are potentially multiple verse boxes returned (could be the case for a tagged verse list or a search results list)
        // Therefore we have to go through all of them and check for each of them whether the book is matching our reference book
        for (let j = 0; j < targetVerseBox.length; j++) {
          let specificTargetVerseBox = targetVerseBox[j];
          let targetVerseBoxBibleBookShortTitle = this.getBibleBookShortTitleFromElement(specificTargetVerseBox);
          let targetBibleBook = await ipcDb.getBibleBook(targetVerseBoxBibleBookShortTitle);

          if (targetBibleBook != null && referenceBibleBook != null) {
            if (targetBibleBook.id == referenceBibleBook.id) {
              changeCallback(changedValue, specificTargetVerseBox);
            }
          }
        }
      }
    }
  }

  // FIXME: Move this to VerseBox
  async getLocalizedVerseReference(verseBoxElement) {
    var verseBox = new VerseBox(verseBoxElement);
    var currentBookCode = verseBox.getBibleBookShortTitle();
    var currentBookName = await ipcDb.getBookLongTitle(currentBookCode);
    var currentBookLocalizedName = await require('./i18n_helper.js').getSwordTranslation(currentBookName);
    var verseReferenceContent = verseBoxElement.querySelector('.verse-reference-content').innerText;

    var localizedReference = currentBookLocalizedName + ' ' + verseReferenceContent;
    return localizedReference;
  }
  
  getLineBreak(html=false) {
    if (html) {
      return "<br/>";
    } else {
      if (platformHelper.isElectron() && process.platform === 'win32') {
        return "\r\n";
      } else {
        return "\n";
      }
    }
  }

  convertTransChangeToItalic(textElement) {
    let transChangeElements = textElement.find('transChange');
    transChangeElements.each((index, transChange) => {
      let italicElement = document.createElement('i');
      italicElement.innerText = transChange.innerText;
      transChange.replaceWith(italicElement); 
    });
  }

  convertSwordQuoteJesusToSpanElement(textElement) {
    let swordQuoteJesusElements = textElement.find('.sword-quote-jesus');
    swordQuoteJesusElements.each((index, swordQuoteJesus) => {
      let spanElement = document.createElement('span');
      spanElement.innerHTML = swordQuoteJesus.innerHTML;
      spanElement.setAttribute('style', 'color: #B22222;');
      swordQuoteJesus.replaceWith(spanElement);
    });
  }

  sanitizeHtmlCode(htmlCode) {
    const sanitizeHtml = require('sanitize-html');

    htmlCode = sanitizeHtml(htmlCode, {
      allowedTags: ['i', 'span', 'br', 'sup', 'b', 'div', 'reference'],
      /* Allow all attributes */
      allowedAttributes: false,
      allowedStyles: {
        '*': {
          // Match HEX and RGB
          'color': [/^#(0x)?[0-9a-f]+$/i, /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/],
        },
      }
    });

    return htmlCode;
  }

  async getVerseTextFromVerseElements(verseElements, verseReferenceTextList, html=false, referenceSeparator=window.reference_separator, referenceBeforeText=false) {
    const paragraphsOption = app_controller.optionsMenu._paragraphsOption;
    const bookList = this.getBookListFromVerseBoxes(verseElements);
    var selectedText = "";

    for (let i = 0; i < bookList.length; i++) {
      let book = bookList[i];
      let currentVerseElements = [];
      let currentReferences = [];

      for (let j = 0; j < verseElements.length; j++) {
        let currentReference = new VerseBox(verseElements[j]).getReference();
        let currentVerseBook = new VerseBox(verseElements[j]).getBibleBookShortTitle();

        if (currentVerseBook == book) {
          currentVerseElements.push(verseElements[j]);

          if (currentReference != null) {
            currentReferences.push(currentReference);
          }
        }
      }

      let selectionHasMultipleVerses = currentVerseElements.length > 1;
      let absoluteNrList = await sectionLabelHelper.verseReferenceListToAbsoluteVerseNrList(currentReferences, book);
      let verseListHasGaps = sectionLabelHelper.verseListHasGaps(absoluteNrList);

      for (let j= 0; j < currentVerseElements.length; j++) {
        let currentVerseBox = $(currentVerseElements[j]);
        let verseReferenceContent = currentVerseBox.find('.verse-reference-content').text();
        let currentVerseNr = verseReferenceContent.split(referenceSeparator)[1];
        let currentText = currentVerseBox.find('.verse-text').last().clone();

        if (paragraphsOption.isChecked && j < currentVerseElements.length - 1) {
          let paragraphBreaks = this.getLineBreak(html) + this.getLineBreak(html) + this.getLineBreak(html) + this.getLineBreak(html);
          currentText.find('.sword-paragraph-end').replaceWith(paragraphBreaks);
        }

        currentText.find('.sword-markup').filter(":not('.sword-quote-jesus, .sword-quote')").remove();
        currentText.find('sup.strongs').remove();

        if (html) {
          this.convertTransChangeToItalic(currentText);

          const redLetterOption = app_controller.optionsMenu._redLetterOption;
          if (redLetterOption.isChecked) {
            this.convertSwordQuoteJesusToSpanElement(currentText);
          }
        }

        if (selectionHasMultipleVerses && !verseListHasGaps) {
          if (html) {
            selectedText += "<sup>" + currentVerseNr + "</sup> ";
          } else {
            selectedText += currentVerseNr + " ";
          }
        }

        selectedText += currentText.html().replace(/&nbsp;/g, ' ') + " ";

        if (verseListHasGaps) {
          let verseReference = book + ' ' + verseReferenceContent;
          selectedText += this.getLineBreak(html) + this.getLineBreak(html) + verseReference;

          if (j < currentVerseElements.length - 1) {
            selectedText += this.getLineBreak(html) + this.getLineBreak(html);
          }
        }
      }

      const parser = new DOMParser();
      let htmlText = parser.parseFromString("<div>" + selectedText.trim() + "</div>", 'text/html');

      selectedText = html ? htmlText.querySelector('div').innerHTML : htmlText.querySelector('div').innerText;
      if (!verseListHasGaps) {
        if (referenceBeforeText) {
          // Replace the existing text with reference + text for this book
          selectedText = verseReferenceTextList[i] + " " + this.getLineBreak(html) + this.getLineBreak(html) + selectedText;
        } else {
          // Keep the original behavior (text + reference)
          selectedText += " " + this.getLineBreak(html) + this.getLineBreak(html) + verseReferenceTextList[i];
        }
      }

      if (i < bookList.length - 1) {
        selectedText += this.getLineBreak(html) + this.getLineBreak(html);
      }

      if (html && platformHelper.isElectron()) {
        selectedText = this.sanitizeHtmlCode(selectedText);
      }
    }

    return selectedText;
  }
}

module.exports = VerseBoxHelper;