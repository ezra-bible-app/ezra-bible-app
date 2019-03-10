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

'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('BibleBooks', [
      { number: 1, shortTitle: 'Gen', longTitle: 'Genesis'          },
      { number: 2, shortTitle: 'Exo', longTitle: 'Exodus '          },
      { number: 3, shortTitle: 'Lev', longTitle: 'Leviticus'        },
      { number: 4, shortTitle: 'Num', longTitle: 'Numbers'          },
      { number: 5, shortTitle: 'Deu', longTitle: 'Deuteronomy'      },
      { number: 6, shortTitle: 'Jos', longTitle: 'Joshua'           },
      { number: 7, shortTitle: 'Jdg', longTitle: 'Judges'           },
      { number: 8, shortTitle: 'Rut', longTitle: 'Ruth'             },
      { number: 9, shortTitle: '1Sa', longTitle: '1 Samuel'         },
      { number: 10, shortTitle: '2Sa', longTitle: '2 Samuel'        },
      { number: 11, shortTitle: '1Ki', longTitle: '1 Kings'         },
      { number: 12, shortTitle: '2Ki', longTitle: '2 Kings'         },
      { number: 13, shortTitle: '1Ch', longTitle: '1 Chronicles'    },
      { number: 14, shortTitle: '2Ch', longTitle: '2 Chronicles'    },
      { number: 15, shortTitle: 'Ezr', longTitle: 'Ezra'            },
      { number: 16, shortTitle: 'Neh', longTitle: 'Nehemiah'        },
      { number: 17, shortTitle: 'Est', longTitle: 'Esther'          },
      { number: 18, shortTitle: 'Job', longTitle: 'Job'             },
      { number: 19, shortTitle: 'Psa', longTitle: 'Psalms'          },
      { number: 20, shortTitle: 'Pro', longTitle: 'Proverbs'        },
      { number: 21, shortTitle: 'Ecc', longTitle: 'Ecclesiastes'    },
      { number: 22, shortTitle: 'Sol', longTitle: 'Song of Solomon' },
      { number: 23, shortTitle: 'Isa', longTitle: 'Isaiah'          },
      { number: 24, shortTitle: 'Jer', longTitle: 'Jeremiah'        },
      { number: 25, shortTitle: 'Lam', longTitle: 'Lamentations'    },
      { number: 26, shortTitle: 'Eze', longTitle: 'Ezekiel'         },
      { number: 27, shortTitle: 'Dan', longTitle: 'Daniel'          },
      { number: 28, shortTitle: 'Hos', longTitle: 'Hosea'           },
      { number: 29, shortTitle: 'Joe', longTitle: 'Joel'            },
      { number: 30, shortTitle: 'Amo', longTitle: 'Amos'            },
      { number: 31, shortTitle: 'Oba', longTitle: 'Obadiah'         },
      { number: 32, shortTitle: 'Jon', longTitle: 'Jonah'           },
      { number: 33, shortTitle: 'Mic', longTitle: 'Micah'           },
      { number: 34, shortTitle: 'Nah', longTitle: 'Nahum'           },
      { number: 35, shortTitle: 'Hab', longTitle: 'Habakkuk'        },
      { number: 36, shortTitle: 'Zep', longTitle: 'Zephaniah'       },
      { number: 37, shortTitle: 'Hag', longTitle: 'Haggai'          },
      { number: 38, shortTitle: 'Zec', longTitle: 'Zechariah'       },
      { number: 39, shortTitle: 'Mal', longTitle: 'Malachi'         },
      { number: 40, shortTitle: 'Mat', longTitle: 'Matthew'         },
      { number: 41, shortTitle: 'Mar', longTitle: 'Mark'            },
      { number: 42, shortTitle: 'Luk', longTitle: 'Luke'            },
      { number: 43, shortTitle: 'Joh', longTitle: 'John'            },
      { number: 44, shortTitle: 'Act', longTitle: 'Acts'            },
      { number: 45, shortTitle: 'Rom', longTitle: 'Romans'          },
      { number: 46, shortTitle: '1Co', longTitle: '1 Corinthians'   },
      { number: 47, shortTitle: '2Co', longTitle: '2 Corinthians'   },
      { number: 48, shortTitle: 'Gal', longTitle: 'Galatians'       },
      { number: 49, shortTitle: 'Eph', longTitle: 'Ephesians'       },
      { number: 50, shortTitle: 'Phi', longTitle: 'Philippians'     },
      { number: 51, shortTitle: 'Col', longTitle: 'Colossians'      },
      { number: 52, shortTitle: '1Th', longTitle: '1 Thessalonians' },
      { number: 53, shortTitle: '2Th', longTitle: '2 Thessalonians' },
      { number: 54, shortTitle: '1Ti', longTitle: '1 Timothy'       },
      { number: 55, shortTitle: '2Ti', longTitle: '2 Timothy'       },
      { number: 56, shortTitle: 'Tit', longTitle: 'Titus'           },
      { number: 57, shortTitle: 'Phm', longTitle: 'Philemon'        },
      { number: 58, shortTitle: 'Heb', longTitle: 'Hebrews'         },
      { number: 59, shortTitle: 'Jam', longTitle: 'James'           },
      { number: 60, shortTitle: '1Pe', longTitle: '1 Peter'         },
      { number: 61, shortTitle: '2Pe', longTitle: '2 Peter'         },
      { number: 62, shortTitle: '1Jo', longTitle: '1 John'          },
      { number: 63, shortTitle: '2Jo', longTitle: '2 John'          },
      { number: 64, shortTitle: '3Jo', longTitle: '3 John'          },
      { number: 65, shortTitle: 'Jud', longTitle: 'Jude'            },
      { number: 66, shortTitle: 'Rev', longTitle: 'Revelation'      }
    ], {});
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('BibleBooks', null, {});
  }
};
