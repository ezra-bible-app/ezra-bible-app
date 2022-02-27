'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('BibleBooks', [
      { id: 67,  number: 67,  shortTitle: 'Tob',    longTitle: 'Tobit'                 },
      { id: 68,  number: 68,  shortTitle: 'Wis',    longTitle: 'Wisdom'                },
      { id: 69,  number: 69,  shortTitle: 'Jdt',    longTitle: 'Judith'                },
      { id: 70,  number: 70,  shortTitle: 'Sir',    longTitle: 'Sirach'                },
      { id: 71,  number: 71,  shortTitle: 'Bar',    longTitle: 'Baruch'                },
      { id: 72,  number: 72,  shortTitle: '1Macc',  longTitle: 'I Maccabees'           },
      { id: 73,  number: 73,  shortTitle: '2Macc',  longTitle: 'II Maccabees'          },
      { id: 74,  number: 74,  shortTitle: 'AddEsth',longTitle: 'Additions to Esther'   },
      { id: 75,  number: 75,  shortTitle: 'PrAzar', longTitle: 'Prayer of Azariah'     },
      { id: 76,  number: 76,  shortTitle: 'Sus',    longTitle: 'Susanna'               },
      { id: 77,  number: 77,  shortTitle: 'Bel',    longTitle: 'Bel and the Dragon'    },
      { id: 78,  number: 78,  shortTitle: '1Esd',   longTitle: 'I Esdras'              },
      { id: 79,  number: 79,  shortTitle: '2Esd',   longTitle: 'II Esdras'             },
      { id: 80,  number: 80,  shortTitle: 'PrMan',  longTitle: 'Prayer of Manasses'    },
      { id: 81,  number: 81,  shortTitle: 'AddPs',  longTitle: 'Additional Psalm'      },
      { id: 82,  number: 82,  shortTitle: 'EpLao',  longTitle: 'Laodiceans'            }
    ]);
  },

  down: (queryInterface, Sequelize) => {
    const Op = Sequelize.Op;

    return queryInterface.bulkDelete('BibleBooks', {
      id: {
        [Op.in]: [ 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82 ]
      }
    }, {});
  }
};
