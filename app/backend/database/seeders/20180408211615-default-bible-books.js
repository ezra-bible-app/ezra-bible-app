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

'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('BibleBooks', [
      { id: 1,  number: 1,  shortTitle: 'Gen', longTitle: 'Genesis'            },
      { id: 2,  number: 2,  shortTitle: 'Exo', longTitle: 'Exodus'             },
      { id: 3,  number: 3,  shortTitle: 'Lev', longTitle: 'Leviticus'          },
      { id: 4,  number: 4,  shortTitle: 'Num', longTitle: 'Numbers'            },
      { id: 5,  number: 5,  shortTitle: 'Deu', longTitle: 'Deuteronomy'        },
      { id: 6,  number: 6,  shortTitle: 'Jos', longTitle: 'Joshua'             },
      { id: 7,  number: 7,  shortTitle: 'Jdg', longTitle: 'Judges'             },
      { id: 8,  number: 8,  shortTitle: 'Rut', longTitle: 'Ruth'               },
      { id: 9,  number: 9,  shortTitle: '1Sa', longTitle: 'I Samuel'           },
      { id: 10, number: 10, shortTitle: '2Sa', longTitle: 'II Samuel'          },
      { id: 11, number: 11, shortTitle: '1Ki', longTitle: 'I Kings'            },
      { id: 12, number: 12, shortTitle: '2Ki', longTitle: 'II Kings'           },
      { id: 13, number: 13, shortTitle: '1Ch', longTitle: 'I Chronicles'       },
      { id: 14, number: 14, shortTitle: '2Ch', longTitle: 'II Chronicles'      },
      { id: 15, number: 15, shortTitle: 'Ezr', longTitle: 'Ezra'               },
      { id: 16, number: 16, shortTitle: 'Neh', longTitle: 'Nehemiah'           },
      { id: 17, number: 17, shortTitle: 'Est', longTitle: 'Esther'             },
      { id: 18, number: 18, shortTitle: 'Job', longTitle: 'Job'                },
      { id: 19, number: 19, shortTitle: 'Psa', longTitle: 'Psalms'             },
      { id: 20, number: 20, shortTitle: 'Pro', longTitle: 'Proverbs'           },
      { id: 21, number: 21, shortTitle: 'Ecc', longTitle: 'Ecclesiastes'       },
      { id: 22, number: 22, shortTitle: 'Sol', longTitle: 'Song of Solomon'    },
      { id: 23, number: 23, shortTitle: 'Isa', longTitle: 'Isaiah'             },
      { id: 24, number: 24, shortTitle: 'Jer', longTitle: 'Jeremiah'           },
      { id: 25, number: 25, shortTitle: 'Lam', longTitle: 'Lamentations'       },
      { id: 26, number: 26, shortTitle: 'Eze', longTitle: 'Ezekiel'            },
      { id: 27, number: 27, shortTitle: 'Dan', longTitle: 'Daniel'             },
      { id: 28, number: 28, shortTitle: 'Hos', longTitle: 'Hosea'              },
      { id: 29, number: 29, shortTitle: 'Joe', longTitle: 'Joel'               },
      { id: 30, number: 30, shortTitle: 'Amo', longTitle: 'Amos'               },
      { id: 31, number: 31, shortTitle: 'Oba', longTitle: 'Obadiah'            },
      { id: 32, number: 32, shortTitle: 'Jon', longTitle: 'Jonah'              },
      { id: 33, number: 33, shortTitle: 'Mic', longTitle: 'Micah'              },
      { id: 34, number: 34, shortTitle: 'Nah', longTitle: 'Nahum'              },
      { id: 35, number: 35, shortTitle: 'Hab', longTitle: 'Habakkuk'           },
      { id: 36, number: 36, shortTitle: 'Zep', longTitle: 'Zephaniah'          },
      { id: 37, number: 37, shortTitle: 'Hag', longTitle: 'Haggai'             },
      { id: 38, number: 38, shortTitle: 'Zec', longTitle: 'Zechariah'          },
      { id: 39, number: 39, shortTitle: 'Mal', longTitle: 'Malachi'            },
      { id: 40, number: 40, shortTitle: 'Mat', longTitle: 'Matthew'            },
      { id: 41, number: 41, shortTitle: 'Mar', longTitle: 'Mark'               },
      { id: 42, number: 42, shortTitle: 'Luk', longTitle: 'Luke'               },
      { id: 43, number: 43, shortTitle: 'Joh', longTitle: 'John'               },
      { id: 44, number: 44, shortTitle: 'Act', longTitle: 'Acts'               },
      { id: 45, number: 45, shortTitle: 'Rom', longTitle: 'Romans'             },
      { id: 46, number: 46, shortTitle: '1Co', longTitle: 'I Corinthians'      },
      { id: 47, number: 47, shortTitle: '2Co', longTitle: 'II Corinthians'     },
      { id: 48, number: 48, shortTitle: 'Gal', longTitle: 'Galatians'          },
      { id: 49, number: 49, shortTitle: 'Eph', longTitle: 'Ephesians'          },
      { id: 50, number: 50, shortTitle: 'Phi', longTitle: 'Philippians'        },
      { id: 51, number: 51, shortTitle: 'Col', longTitle: 'Colossians'         },
      { id: 52, number: 52, shortTitle: '1Th', longTitle: 'I Thessalonians'    },
      { id: 53, number: 53, shortTitle: '2Th', longTitle: 'II Thessalonians'   },
      { id: 54, number: 54, shortTitle: '1Ti', longTitle: 'I Timothy'          },
      { id: 55, number: 55, shortTitle: '2Ti', longTitle: 'II Timothy'         },
      { id: 56, number: 56, shortTitle: 'Tit', longTitle: 'Titus'              },
      { id: 57, number: 57, shortTitle: 'Phm', longTitle: 'Philemon'           },
      { id: 58, number: 58, shortTitle: 'Heb', longTitle: 'Hebrews'            },
      { id: 59, number: 59, shortTitle: 'Jam', longTitle: 'James'              },
      { id: 60, number: 60, shortTitle: '1Pe', longTitle: 'I Peter'            },
      { id: 61, number: 61, shortTitle: '2Pe', longTitle: 'II Peter'           },
      { id: 62, number: 62, shortTitle: '1Jo', longTitle: 'I John'             },
      { id: 63, number: 63, shortTitle: '2Jo', longTitle: 'II John'            },
      { id: 64, number: 64, shortTitle: '3Jo', longTitle: 'III John'           },
      { id: 65, number: 65, shortTitle: 'Jud', longTitle: 'Jude'               },
      { id: 66, number: 66, shortTitle: 'Rev', longTitle: 'Revelation of John' }
    ], {});
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('BibleBooks', null, {});
  }
};
