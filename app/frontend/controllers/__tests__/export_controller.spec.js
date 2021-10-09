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

const exportController = require('../export_controller.js');

// test input
const verses = require('./ephesian1_KJV.json');
const notes = {
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

jest.mock('../../helpers/i18n_helper.js', () => ({
  getReferenceSeparator: () => ':',
  getChapterText: () => 'Chapter',
}));

jest.mock('../../helpers/sword_module_helper.js', () => ({
  getModuleFullName: () => 'King James Version',
  getModuleLicense: () => 'General Public License',
  getModuleCopyright: () => 'Public Domain',
}));

describe('ExportController', () => {
  it('exports docx for notes', async () => {
    const docx = await exportController.generateWordDocument("Ephesian 1", verses, undefined, notes);
    expect(docx).toMatchSnapshot();
  });
});

