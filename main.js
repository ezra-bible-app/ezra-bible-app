/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2024 Ezra Bible App Development Team <contact@ezrabibleapp.net>

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

const path = require('path');
const { app, BrowserWindow, Menu, ipcMain, nativeTheme } = require('electron');

global.isDev = !app.isPackaged;

const IPC = require('./app/backend/ipc/ipc.js');
global.ipc = new IPC();
global.ipcHandlersRegistered = false;

const PlatformHelper = require('./app/lib/platform_helper.js');
global.platformHelper = new PlatformHelper();

app.allowRendererProcessReuse = false;

// Disable security warnings
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = true;

const URL_SCHEME = 'ezrabible';

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(URL_SCHEME, process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient(URL_SCHEME);
}

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
global.mainWindow = null;
let mainWindowState;

if (process.platform === 'win32') {
  // This is only needed for making the Windows installer work properly
  if (require('electron-squirrel-startup')) app.quit();
}

global.sendCrashReports = global.ipc.ipcSettingsHandler.getConfig().get('sendCrashReports', true);

if (!isDev && !global.sendCrashReports) {
  console.log("Not configuring Sentry based on opt-out.");
}

if (!isDev && global.sendCrashReports) {
  global.Sentry = require('@sentry/electron/main');
  
  Sentry.init({
    debug: false,
    dsn: 'https://977e321b83ec4e47b7d28ffcbdf0c6a1@sentry.io/1488321',
    enableNative: true,
    environment: process.env.NODE_ENV,
    beforeSend: (event) => global.sendCrashReports ? event : null
  });
} else {
  global.Sentry = {
    addBreadcrumb: function() {},
    captureMessage: function() {},
    Severity: {
      Info: ''
    }
  };
}

try {
  // Loading electron-debug in a try/catch block, because we have observed failures related to this step
  // If it fails ... startup is broken. Why it failed? Unclear!

  require('electron-debug')({
    isEnabled: true,
    showDevTools: false,
    devToolsMode: 'bottom'
  });
} catch (e) {
  console.log('Could not load electron-debug');
}

function shouldUseDarkMode() {
  let useDarkMode = false;
  const useSystemTheme = global.ipc.ipcSettingsHandler.getConfig().get('useSystemTheme', false);

  if (platformHelper.isMacOsMojaveOrLater() && useSystemTheme) {
    if (nativeTheme.shouldUseDarkColors) {
      useDarkMode = true;
    }
  } else {
    useDarkMode = global.ipc.ipcSettingsHandler.getConfig().get('useNightMode', false);
  }

  return useDarkMode;
}

function updateMenu(labels=undefined) {
  var quitAppLabel = 'Quit Ezra Bible App';

  if (labels !== undefined) {
    quitAppLabel = labels['quit-app'];
  }

  const menu = Menu.buildFromTemplate([{
    label: '&File',
    submenu: [{
      label: quitAppLabel,
      accelerator: 'Ctrl+Q',
      click: function () { app.quit(); }
    }]
  }]);

  Menu.setApplicationMenu(menu);
}

async function createWindow(firstStart=true) {
  const path = require('path');
  const url = require('url');

  console.time('Startup');

  var preloadScript = '';
  if (!isDev && global.sendCrashReports) {
    preloadScript = path.join(__dirname, 'app/frontend/helpers/sentry.js');
  }

  const windowStateKeeper = require('electron-window-state');

  mainWindowState = windowStateKeeper({
    defaultWidth: 1200,
    defaultHeight: 800
  });

  if (!global.ipcHandlersRegistered) {
    // This ensures that we do not register ipc handlers twice, which is not possible.
    // This can happen on macOS, when the window is first closed and then opened another time.
    global.ipcHandlersRegistered = true;

    // eslint-disable-next-line no-unused-vars
    ipcMain.on('manageWindowState', async (event, arg) => {
      // Register listeners on the window, so we can update the state
      // automatically (the listeners will be removed when the window is closed)
      // and restore the maximized or full screen state
      mainWindowState.manage(global.mainWindow);
    });

    ipcMain.on('log', async (event, message) => {
      console.log("Log from renderer: " + message);
    });

    // eslint-disable-next-line no-unused-vars
    ipcMain.handle('initIpc', async (event, arg) => {
      await global.ipc.init(isDev, global.mainWindow);
    });

    // eslint-disable-next-line no-unused-vars
    ipcMain.handle('startupCompleted', async (event, arg) => {
      console.timeEnd('Startup');
    });

    // eslint-disable-next-line no-unused-vars
    ipcMain.handle('localizeMenu', async (event, menuLabels) => {
      updateMenu(menuLabels);
    });
  }

  var bgColor = '#ffffff';

  if (shouldUseDarkMode()) {
    bgColor = '#1e1e1e';
  }

  // Create the browser window.
  global.mainWindow = new BrowserWindow({
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: mainWindowState.width,
    height: mainWindowState.height,
    show: true,
    frame: true,
    title: "Ezra Bible App " + app.getVersion() + (isDev ? ` [${app.getLocale()}]` : ''),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: preloadScript,
      enableRemoteModule: true,
      defaultEncoding: "UTF-8"
    },
    icon: path.join(__dirname, `icons/${platformHelper.isWin() ? 'ezra.ico' : 'ezra.png'}`),
    backgroundColor: bgColor
  });

  if (firstStart) { // electron remote can only be initialized once, on macOS this function may run multiple times
    require('@electron/remote/main').initialize();
  }

  require("@electron/remote/main").enable(global.mainWindow.webContents);
 
  // The default menu will be created automatically if the app does not set one.
  // It contains standard items such as File, Edit, View, Window and Help.
  // We disable the menu by default and in a second step we enable it with minimal entries and only on macOS.
  Menu.setApplicationMenu(null);

  if (platformHelper.isMac()) {
    updateMenu();
  }

  // and load the index.html of the app.
  global.mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }));

  // Emitted when the window is closed.
  global.mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    global.mainWindow = null;
  });

  global.mainWindow.on('enter-full-screen', function () {
    global.mainWindow.webContents.send('fullscreen-changed');
  });

  global.mainWindow.on('leave-full-screen', function () {
    global.mainWindow.webContents.send('fullscreen-changed');
  });
}

function handleAuthUrl(url) {
  if (url.indexOf('ezrabible') != -1) {
    global.mainWindow.webContents.send('dropbox-auth-callback', url);
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {

  if (process.platform === 'win32' || process.platform === 'linux') {
    // see https://www.electronjs.org/docs/latest/tutorial/launch-app-from-url-in-another-app#windows-and-linux-code

    const lock = app.requestSingleInstanceLock();

    if (!lock) {

      app.quit();
      return;

    } else {
      app.on('second-instance', (event, commandLine, workingDirectory) => {
        let url = commandLine.pop();
        handleAuthUrl(url);

        // Someone tried to run a second instance, we should focus our window.
        if (global.mainWindow) {
          if (global.mainWindow.isMinimized()) global.mainWindow.restore();

          global.mainWindow.focus();
        }
      });
    }

  } else if (process.platform === 'darwin') {
    app.on('open-url', (event, url) => {
      handleAuthUrl(url);
    });
  }

  await createWindow();
});

let exitComplete = false;

app.on('before-quit', async (event) => {
  if (!exitComplete) {
    event.preventDefault();
    await global.ipc.closeDatabase();
    exitComplete = true;
    app.quit();
  }
});

// Quit when all windows are closed.
app.on('window-all-closed', async function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', async () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (global.mainWindow === null) {
    await createWindow(false);
  }
});
