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

const docxController = require('../docx_controller.js');

// test input
const versesData = require('./ephesian1_KJV.json');

const anotherBookVerseData =   {
  "moduleCode": "KJV",
  "bibleBookShortTitle": "John",
  "chapter": 15,
  "verseNr": 4,
  "absoluteVerseNr": 659,
  content: '<div class="sword-markup sword-quote-jesus"></div><w class="strong:G3306 lemma.TR:μεινατε" morph="robinson:V-AAM-2P" src="1">Abide</w> <w class="strong:G1722 lemma.TR:εν" morph="robinson:PREP" src="2">in</w> <w class="strong:G1698 lemma.TR:εμοι" morph="robinson:P-1DS" src="3">me</w>, <w class="strong:G2504 lemma.TR:καγω" morph="robinson:P-1NS-C" src="4">and&nbsp;I</w> <w class="strong:G1722 lemma.TR:εν" morph="robinson:PREP" src="5">in</w> <w class="strong:G5213 lemma.TR:υμιν" morph="robinson:P…son:ADV" src="22 23">no&nbsp;more&nbsp;can</w> <w class="strong:G5210 lemma.TR:υμεις" morph="robinson:P-2NP" src="24">ye</w>, <w class="strong:G1437 strong:G3361 lemma.TR:εαν lemma.TR:μη" morph="robinson:COND robinson:PRT-N" src="25 26">except</w> <w class="strong:G3306 lemma.TR:μεινητε" morph="robinson:V-AAS-2P" src="29">ye&nbsp;abide</w> <w class="strong:G1722 lemma.TR:εν" morph="robinson:PREP" src="27">in</w> <w class="strong:G1698 lemma.TR:εμοι" morph="robinson:P-1DS" src="28">me</w>. </q>'
};

const notesData = {
  eph: {
    id: 1,
    verseReferenceId: 64,
    text: "# A Letter 📨 From Prison \n\nWritten: _aprox. **60-63** A.D._\n\n**Themes**:\n- Gospel\n- Faith\n- Church",
    bibleBookId: "Eph",
    absoluteVerseNrEng: 0,
    absoluteVerseNrHeb: 0
  },
  "eph-1": {
    id: 2,
    verseReferenceId: 69,
    text: "## Apostle\n\n[ἀπόστολος](https://www.blueletterbible.org/lexicon/g652/kjv/tr/0-1/)\n\n> a delegate; specially, an `ambassador of the Gospel`; officially a `commissioner of Christ` (\"apostle\") (with miraculous powers):—apostle, messenger, he that is sent.\n\n----\n\n1. a delegate, messenger, one sent forth with orders\n2. specifically applied to the twelve apostles of Christ\n3. in a broader sense applied to other eminent Christian teachers\n\n* of Barnabas\n* of Timothy and Silvanus",
    bibleBookId: "Eph",
    absoluteVerseNrEng: 1,
    absoluteVerseNrHeb: 1
  }
};

const bibleBooksData = [
  {id: 43, number: 43, shortTitle: 'John', longTitle: 'John'},
  {id: 49, number: 49, shortTitle: 'Eph', longTitle: 'Ephesians'}, 
];

// mocking some functions
global.app_controller = {
  tab_controller: {
    getTab() {
      return {
        getBibleTranslationId: () => jest.fn().mockReturnValue('KJV')
      };
    }
  }
};

global.i18n = {
  t: jest.fn(key => key)
};

jest.mock('../../../helpers/i18n_helper.js', () => ({
  getReferenceSeparator: () => ':',
  getChapterText: () => 'Chapter',
  getSwordTranslation: (book) => book + "(localized)",
}));

jest.mock('../../../helpers/sword_module_helper.js', () => ({
  getModuleFullName: () => 'King James Version',
  getModuleLicense: () => 'General Public License',
  getModuleCopyright: () => 'Public Domain',
}));

describe('ExportController', () => {
  it('exports docx for notes', async () => {
    const docx = await docxController.generateDocument("Ephesian 1", versesData, undefined, notesData);
    expect(docx).toMatchSnapshot();
  });

  it('exports docx for tags', async () => {
    const docx = await docxController.generateDocument("'Verses tagged with  _in Christ 🍇_'", 
                                                       [...versesData, anotherBookVerseData], 
                                                       bibleBooksData);
    expect(docx).toMatchSnapshot();
  });
});

