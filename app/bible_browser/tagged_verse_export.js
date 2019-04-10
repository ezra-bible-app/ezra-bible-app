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

const officegen = require('officegen')
const fs = require('fs')

class TaggedVerseExport {
  constructor() {
  }

  runExport() {
    var docx = officegen('docx');

    // Officegen calling this function after finishing to generate the docx document:
    docx.on('finalize', function(written) {
      console.log(
        'Finished creating a Microsoft Word document.'
      )
    });

    // Officegen calling this function to report errors:
    docx.on('error', function(err) {
      console.log(err)
    });

    // Create a new paragraph:
    var pObj = docx.createP();
    
    pObj.addText('Simple');
    pObj.addText(' with color', { color: '000088' });
    pObj.addText(' and back color.', { color: '00ffff', back: '000088' });

    var out = fs.createWriteStream('example.docx')

    out.on('error', function(err) {
      console.log(err)
    })

    // Async call to generate the output file:
    docx.generate(out)
  }
}

module.exports = TaggedVerseExport;