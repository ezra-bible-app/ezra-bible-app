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

const fs = require('fs');
const path = require('path');
const settings = require('electron-settings');
const Sequelize = require('sequelize');
const Umzug = require("umzug");

class DbHelper {
  constructor(userDataDir) {
    if (userDataDir === undefined) {
      console.log('Cannot initialize DbHelper with userDataDir "undefined"');
    }

    this.userDataDir = userDataDir;
  }

  async initDatabase(databaseDir) {
    this.initDbInUserDir();
    await this.migrateDatabase(databaseDir);
  }

  initDbInUserDir() {
    var dbPath = path.join(this.userDataDir, 'ezra.sqlite');
  
    if (!fs.existsSync(dbPath)) {
      console.log('Database not yet existing in user directory! Setting up empty database from template.');
  
      var templatePath = path.join(__dirname, '../../ezra.sqlite');
      fs.copySync(templatePath, dbPath);
    }
  }

  getDatabaseDir() {
    var databaseDir = this.userDataDir;
    
    if (settings.has('custom_database_dir') &&
      settings.get('custom_database_dir') != null) {

      databaseDir = settings.get('custom_database_dir');
      console.log('Using custom database dir ' + databaseDir + ' for database access!');
    } else {
      console.log('Using default database dir ' + databaseDir + ' for database access!');
    }

    return databaseDir;
  }

  getDbFilePath(databaseDir) {
    var dbPath = path.join(databaseDir, 'ezra.sqlite');
    return dbPath;
  }

  getSequelize(databaseDir) {
    var config = {
      username: null,
      password: null,
      database: "ezra-project-ng",
      host: null,
      dialect: "sqlite",
      storage: this.getDbFilePath(databaseDir),
      logging: false,
      retry: {
        match: [
          /SQLITE_BUSY/,
        ],
        name: 'query',
        max: 5
      }
    };
  
    var sequelize = new Sequelize(config.database, config.username, config.password, config);
    return sequelize;
  }

  async migrateDatabase(databaseDir) {
    var sequelize = this.getSequelize(databaseDir);
    var migrationsDir = path.resolve(__dirname, '../../migrations')

    var umzug = new Umzug({
      storage: 'sequelize',
      storageOptions: {
        sequelize: sequelize
      },
      migrations: {
        params: [ sequelize.getQueryInterface(), Sequelize ],
        // The path to the migrations directory.
        path: migrationsDir
      }
    });

    var pendingMigrations = await umzug.pending();
    if (pendingMigrations.length > 0) {
      $('#loading-subtitle').text(i18n.t("general.applying-migrations"));
    }

    // Execute all pending migrations
    var migrations = await umzug.up();

    if (migrations.length > 0) console.log("Executed the following migrations:");
    for (var i = 0; i < migrations.length; i++) {
      console.log(migrations[i].file);
    }
  }
}

module.exports = DbHelper;

