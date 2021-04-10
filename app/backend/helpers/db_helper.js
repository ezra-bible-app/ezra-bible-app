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

const fs = require('fs-extra');
const path = require('path');
const Sequelize = require('sequelize');
const Umzug = require("umzug");
const PlatformHelper = require("../../lib/platform_helper.js");

class DbHelper {
  constructor(userDataDir) {
    this.platformHelper = new PlatformHelper();

    if (userDataDir === undefined) {
      console.log('Cannot initialize DbHelper with userDataDir "undefined"');
    }

    if (this.platformHelper.isElectron()) {
      this.settings = require('electron-settings');
    }

    this.userDataDir = userDataDir;
  }

  async initDatabase(databaseDir) {
    this.initDbInUserDir();
    await this.migrateDatabase(databaseDir);
  }

  initDbInUserDir() {
    var dbFileName = 'ezra.sqlite';
    var dbPath = path.join(this.userDataDir, dbFileName);

    var oldUserDataDir = this.platformHelper.getUserDataPath(true);
    var oldDbPath = path.join(oldUserDataDir, dbFileName);

    if (!fs.existsSync(dbPath)) {
      console.log('Database not yet existing in user directory!');
  
      if (fs.existsSync(oldDbPath)) {
        console.log(`Copying database from previously used application directory ${oldDbPath}.`);
        fs.copySync(oldDbPath, dbPath);
      } else {
        console.log('Setting up empty database from template.');
        var templatePath = path.join(__dirname, '../../../ezra.sqlite');
        fs.copySync(templatePath, dbPath);
      }
    }
  }

  getDatabaseDir(isDebug) {
    var databaseDir = this.userDataDir;
    var databaseDirKind = "default";

    var config = ipc.ipcSettingsHandler.getConfig();

    if (config.has('customDatabaseDir')) {
      databaseDir = config.get('customDatabaseDir', null);
      databaseDirKind = "custom";
    }
    
    var databaseDirString = databaseDir;
    if (isDebug) {
      databaseDirString += " ";
    } else {
      databaseDirString = "";
    }

    var message = `Using ${databaseDirKind} database dir ${databaseDirString}for database access!`;
    console.log(message);

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
      database: "ezra-bible-app",
      host: null,
      dialect: "sqlite",
      storage: this.getDbFilePath(databaseDir),
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
  
    var sequelize = new Sequelize(config.database, config.username, config.password, config);
    return sequelize;
  }

  async migrateDatabase(databaseDir) {
    var sequelize = this.getSequelize(databaseDir);
    var migrationsDir = path.resolve(__dirname, '../database/migrations')

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
      //$('#loading-subtitle').text(i18n.t("general.applying-migrations"));
      console.log("Applying database migrations ...");
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

