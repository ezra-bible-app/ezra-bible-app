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

require('v8-compile-cache');

const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const isDev = require('electron-is-dev');

app.allowRendererProcessReuse = false;

// Disable security warnings
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = true;

const windowStateKeeper = require('electron-window-state');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let mainWindowState;

if (process.platform === 'win32') {
    // This is only needed for making the Windows installer work properly
    if (require('electron-squirrel-startup')) app.quit();
}

if (!isDev) {
  const { init } = require('@sentry/electron/dist/main')
  init({
    debug: true,
    dsn: 'https://977e321b83ec4e47b7d28ffcbdf0c6a1@sentry.io/1488321',
    enableNative: true,
    environment: process.env.NODE_ENV
  });
}

require('electron-debug')({
    enabled: true,
    showDevTools: false,
    devToolsMode: 'bottom',
});

function createWindow () {
  const path = require('path');
  const url = require('url');

  var preloadScript = '';
  if (!isDev) {
    preloadScript = path.join(__dirname, 'app/helpers/sentry.js')
  }

  mainWindowState = windowStateKeeper({
    defaultWidth: 1200,
    defaultHeight: 800
  });

  ipcMain.on('manageWindowState', (event, arg) => {
    // Register listeners on the window, so we can update the state
    // automatically (the listeners will be removed when the window is closed)
    // and restore the maximized or full screen state
    mainWindowState.manage(mainWindow);
  });

  // Create the browser window.
  mainWindow = new BrowserWindow({x: mainWindowState.x,
                                  y: mainWindowState.y,
                                  width: mainWindowState.width,
                                  height: mainWindowState.height,
                                  show: false,
                                  frame: true,
                                  title: "Ezra Project " + app.getVersion(),
                                  webPreferences: {
                                    nodeIntegration: true,
                                    preload: preloadScript,
                                    enableRemoteModule: true,
                                    defaultEncoding: "UTF-8"
                                  },
                                  icon: path.join(__dirname, 'icons/ezra-project.png')
                                 });
 
  // Disable the application menu
  Menu.setApplicationMenu(null);

  // and load the index.html of the app.
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }));

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  await createWindow();
});

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
});

app.on('activate', async () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    await createWindow();
  }
});