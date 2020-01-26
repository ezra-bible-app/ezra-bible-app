/* This file is part of Ezra Project.

   Copyright (C) 2019 - 2020 Tobias Klein <contact@ezra-project.net>

   Ezra Project is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   Ezra Project is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Project. See the file LICENSE.
   If not, see <http://www.gnu.org/licenses/>. */

'use strict';

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
    "username": null,
    "password": null,
    "database": "ezra-project-ng",
    "host": null,
    "dialect": "sqlite",
    "storage": dbPath,
    "logging": false
  };

  var sequelize = new Sequelize(config.database, config.username, config.password, config);

  fs
    .readdirSync(__dirname)
    .filter(file => {
      return (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js');
    })
    .forEach(file => {
      var model = sequelize['import'](path.join(__dirname, file));
      db[model.name] = model;
    });

  Object.keys(db).forEach(modelName => {
    if (db[modelName].associate) {
      db[modelName].associate(db);
    }
  });

  db.sequelize = sequelize;
  db.Sequelize = Sequelize;

  return db;
};

