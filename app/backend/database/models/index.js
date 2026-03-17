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

'use strict';

global.sequelize = null;

global.getDatabaseException = function(exception) {
  var errorMessage = exception;

  if (exception.name) {
    errorMessage = exception.name;
  }

  if (exception.original) {
    errorMessage += " / " + exception.original;
  }

  return {
    success: false,
    exception: errorMessage
  };
};

module.exports = function(dbDir) {
  var db        = {};
  var fs        = require('fs');
  var path      = require('path');
  var Sequelize = require('sequelize');
  var basename  = path.basename(__filename);
  //var env       = process.env.NODE_ENV || 'development-sqlite';
  //var config    = require(__dirname + '/../db_config.json')[env];

  var dbPath = path.join(dbDir, 'ezra.sqlite');
  // console.log(dbPath);

  var config = {
    username: null,
    password: null,
    database: "ezra-project",
    host: null,
    dialect: "sqlite",
    storage: dbPath,
    logging: false,
    transactionType: "IMMEDIATE",
    retry: {
      match: [
        /SQLITE_BUSY/,
      ],
      name: 'query',
      max: 5
    }
  };

  global.sequelize = new Sequelize(config.database, config.username, config.password, config);

  fs
    .readdirSync(__dirname)
    .filter(file => {
      return (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js');
    })
    .forEach(file => {
      var model = require(path.join(__dirname, file))(global.sequelize, Sequelize);
      db[model.name] = model;
    });

  Object.keys(db).forEach(modelName => {
    if (db[modelName].associate) {
      db[modelName].associate(db);
    }
  });

  db.sequelize = global.sequelize;
  db.Sequelize = Sequelize;

  return db;
};

