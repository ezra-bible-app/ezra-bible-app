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

/* eslint-disable no-undef */

const fs = require('fs-extra');
const path = require('path');
const Sequelize = require('sequelize');
const Umzug = require("umzug");
const PlatformHelper = require("../../lib/platform_helper.js");

const DB_FILE_NAME = 'ezra.sqlite'
const DB_BACKUP_FILE_NAME = 'ezra-backup.sqlite'

class DbHelper {
  constructor(userDataDir) {
    this.platformHelper = new PlatformHelper();

    if (userDataDir === undefined) {
      console.log('Cannot initialize DbHelper with userDataDir "undefined"');
    }

    this.userDataDir = userDataDir;
  }

  async initDatabase(databaseDir) {
    this.initDbInUserDir();
    await this.migrateDatabase(databaseDir);
  }

  async createDatabaseBackup() {
    const dbPath = path.join(this.userDataDir, DB_FILE_NAME);
    const backupDbPath = path.join(this.userDataDir, DB_BACKUP_FILE_NAME);

    console.log(`Creating database backup at ${backupDbPath}`);
    return fs.copy(dbPath, backupDbPath);
  }

  renameCorruptDatabase(iteration) {
    const dbPath = path.join(this.userDataDir, DB_FILE_NAME);

    if (fs.existsSync(dbPath)) {
      const now = Date.now();
      let dbBackupFileName = `ezra-${now}-${iteration}.sqlite`;
      let dbBackupPath = path.join(this.userDataDir, dbBackupFileName);

      console.log(`Renaming corrupt database file to ${dbBackupPath}`);
      fs.moveSync(dbPath, dbBackupPath);
    }
  }

  restoreDatabaseBackup() {
    const dbPath = path.join(this.userDataDir, DB_FILE_NAME);
    const backupDbPath = path.join(this.userDataDir, DB_BACKUP_FILE_NAME);

    if (fs.existsSync(backupDbPath)) {

      console.log(`Restoring database backup from ${backupDbPath} at ${dbPath}`);
      fs.copySync(backupDbPath, dbPath);

      return true;
    } else {
      return false;
    }
  }

  initDbInUserDir() {
    const dbPath = path.join(this.userDataDir, DB_FILE_NAME);

    if (!fs.existsSync(dbPath)) {
      console.log('Database not yet existing in user directory!');
      console.log('Setting up empty database from template.');
      const templatePath = path.join(__dirname, '../../../ezra.sqlite');
      fs.copySync(templatePath, dbPath);
    }
  }

  getDatabaseDir(isDebug) {
    var databaseDir = this.userDataDir;
    var databaseDirKind = "default";

    var config = ipc.ipcSettingsHandler.getConfig();

    if (config !== undefined && config.has('customDatabaseDir')) {
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
    var dbPath = path.join(databaseDir, DB_FILE_NAME);
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
    var migrationsDir = path.resolve(__dirname, '../database/migrations');

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

