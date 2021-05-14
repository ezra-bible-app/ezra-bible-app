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

require('v8-compile-cache');

const { app, BrowserWindow, Menu, ipcMain, nativeTheme } = require('electron');
const isDev = require('electron-is-dev');

const IPC = require('./app/backend/ipc/ipc.js');
global.ipc = new IPC();
global.ipcHandlersRegistered = false;

const PlatformHelper = require('./app/lib/platform_helper.js');
global.platformHelper = new PlatformHelper();

app.allowRendererProcessReuse = false;

// Disable security warnings
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = true;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let mainWindowState;

if (process.platform === 'win32') {
    // This is only needed for making the Windows installer work properly
    if (require('electron-squirrel-startup')) app.quit();
}

if (!isDev) {
  global.Sentry = require('@sentry/electron/dist/main');

  Sentry.init({
    debug: false,
    dsn: 'https://977e321b83ec4e47b7d28ffcbdf0c6a1@sentry.io/1488321',
    enableNative: true,
    environment: process.env.NODE_ENV
  });
} else {
  global.Sentry = {
    addBreadcrumb: function() {},
    captureMessage: function() {},
    Severity: {
      Info: undefined
    }
  }

}

require('electron-debug')({
    isEnabled: true,
    showDevTools: false,
    devToolsMode: 'bottom',
});

function shouldUseDarkMode() {
  var useDarkMode = false;

  if (platformHelper.isMacOsMojaveOrLater()) {
    if (nativeTheme.shouldUseDarkColors) {
      useDarkMode = true;
    }
  } else {
    useDarkMode = ipc.ipcSettingsHandler.getConfig().get('useNightMode', false);
  }

  return useDarkMode;
}

async function createWindow () {
  const path = require('path');
  const url = require('url');

  console.time('Startup');

  var preloadScript = '';
  if (!isDev) {
    preloadScript = path.join(__dirname, 'app/frontend/helpers/sentry.js')
  }

  const windowStateKeeper = require('electron-window-state');

  mainWindowState = windowStateKeeper({
    defaultWidth: 1200,
    defaultHeight: 800
  });

  if (!ipcHandlersRegistered) {
    // This ensures that we do not register ipc handlers twice, which is not possible.
    // This can happen on macOS, when the window is first closed and then opened another time.
    ipcHandlersRegistered = true;

    ipcMain.on('manageWindowState', async (event, arg) => {
      // Register listeners on the window, so we can update the state
      // automatically (the listeners will be removed when the window is closed)
      // and restore the maximized or full screen state
      mainWindowState.manage(mainWindow);
    });

    ipcMain.on('log', async (event, message) => {
      console.log("Log from renderer: " + message);
    });

    ipcMain.handle('initIpc', async (event, arg) => {
      await ipc.init(isDev, mainWindow);
    });

    ipcMain.handle('startupCompleted', async (event, arg) => {
      console.timeEnd('Startup');
    });
  }

  if (shouldUseDarkMode()) {
    var bgColor = '#1e1e1e';
  } else {
    var bgColor = '#ffffff';
  }

  // Create the browser window.
  mainWindow = new BrowserWindow({x: mainWindowState.x,
                                  y: mainWindowState.y,
                                  width: mainWindowState.width,
                                  height: mainWindowState.height,
                                  show: true,
                                  frame: true,
                                  title: "Ezra Bible App " + app.getVersion() + (isDev ? ` [${app.getLocale()}]` : ''),
                                  webPreferences: {
                                    nodeIntegration: true,
                                    preload: preloadScript,
                                    enableRemoteModule: true,
                                    defaultEncoding: "UTF-8"
                                  },
                                  icon: path.join(__dirname, `icons/${platformHelper.isWin() ? 'ezra.ico' : 'ezra.png'}`),
                                  backgroundColor: bgColor
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
