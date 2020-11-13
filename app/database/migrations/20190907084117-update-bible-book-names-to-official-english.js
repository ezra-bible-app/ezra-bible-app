'use strict';

var bibleBookLongTitleUpdates =
[
  { shortTitle: 'Exo', oldLongTitle: 'Exodus '         , newLongTitle: 'Exodus'             },
  { shortTitle: '1Sa', oldLongTitle: '1 Samuel'        , newLongTitle: 'I Samuel'           },
  { shortTitle: '2Sa', oldLongTitle: '2 Samuel'        , newLongTitle: 'II Samuel'          },
  { shortTitle: '1Ki', oldLongTitle: '1 Kings'         , newLongTitle: 'I Kings'            },
  { shortTitle: '2Ki', oldLongTitle: '2 Kings'         , newLongTitle: 'II Kings'           },
  { shortTitle: '1Ch', oldLongTitle: '1 Chronicles'    , newLongTitle: 'I Chronicles'       },
  { shortTitle: '2Ch', oldLongTitle: '2 Chronicles'    , newLongTitle: 'II Chronicles'      },
  { shortTitle: '1Co', oldLongTitle: '1 Corinthians'   , newLongTitle: 'I Corinthians'      },
  { shortTitle: '2Co', oldLongTitle: '2 Corinthians'   , newLongTitle: 'II Corinthians'     },
  { shortTitle: '1Th', oldLongTitle: '1 Thessalonians' , newLongTitle: 'I Thessalonians'    },
  { shortTitle: '2Th', oldLongTitle: '2 Thessalonians' , newLongTitle: 'II Thessalonians'   },
  { shortTitle: '1Ti', oldLongTitle: '1 Timothy'       , newLongTitle: 'I Timothy'          },
  { shortTitle: '2Ti', oldLongTitle: '2 Timothy'       , newLongTitle: 'II Timothy'         },
  { shortTitle: '1Pe', oldLongTitle: '1 Peter'         , newLongTitle: 'I Peter'            },
  { shortTitle: '2Pe', oldLongTitle: '2 Peter'         , newLongTitle: 'II Peter'           },
  { shortTitle: '1Jo', oldLongTitle: '1 John'          , newLongTitle: 'I John'             },
  { shortTitle: '2Jo', oldLongTitle: '2 John'          , newLongTitle: 'II John'            },
  { shortTitle: '3Jo', oldLongTitle: '3 John'          , newLongTitle: 'III John'           },
  { shortTitle: 'Rev', oldLongTitle: 'Revelation'      , newLongTitle: 'Revelation of John' }
]

module.exports = {
  up: (queryInterface, Sequelize) => {
    var updates = [];

    for (var i = 0; i < bibleBookLongTitleUpdates.length; i++) {
      var shortTitle = bibleBookLongTitleUpdates[i].shortTitle;
      var newLongTitle = bibleBookLongTitleUpdates[i].newLongTitle;
      var query = "UPDATE BibleBooks SET longTitle='" + newLongTitle + "' WHERE shortTitle='" + shortTitle + "'";
      var updateAction = queryInterface.sequelize.query(query);
      updates.push(updateAction);
    }

    return Promise.all(
      updates
    );
  },

  down: (queryInterface, Sequelize) => {
    return Promise.all([
    ]);
  }
};
