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

const path = require('path');
const url = require('url');
const { app, BrowserWindow, Menu, ipcMain, nativeTheme } = require('electron');
const IPC = require('./app/backend/ipc/ipc.js');
const PlatformHelper = require('./app/lib/platform_helper.js');

function initGlobals() {
  global.isDev = !app.isPackaged;
  global.ipc = new IPC();
  global.ipcHandlersRegistered = false;
  global.platformHelper = new PlatformHelper();

  // Keep a global reference of the window object, if you don't, the window will
  // be closed automatically when the JavaScript object is garbage collected.
  global.mainWindow = null;
  global.mainWindowState = null;

  // Flag used to determine if the app is ready to create windows
  global.appIsReady = false;

  // Disable security warnings
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = true;

  // Flag used in connection with before-quit handler to ensure the before-quit code is only executed once
  global.exitComplete = false;
}

function initDropboxProtocolClient() {
  const URL_SCHEME = 'ezrabible';

  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient(URL_SCHEME, process.execPath, [path.resolve(process.argv[1])]);
    }
  } else {
    app.setAsDefaultProtocolClient(URL_SCHEME);
  }
}

function initSentryCrashReports() {
  global.sendCrashReports = global.ipc.ipcSettingsHandler.getConfig().get('sendCrashReports', true);

  if (!global.isDev && !global.sendCrashReports) {
    console.log("Not configuring Sentry based on opt-out.");
  }

  if (!global.isDev && global.sendCrashReports) {
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
}

function initElectronDebug() {
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

function updateMacOsMenu(labels=undefined) {
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

function initIpcHandlers() {
  if (!global.ipcHandlersRegistered) {
    // This ensures that we do not register ipc handlers twice, which is not possible.
    // This can happen on macOS, when the window is first closed and then opened another time.
    global.ipcHandlersRegistered = true;

    // eslint-disable-next-line no-unused-vars
    ipcMain.on('manageWindowState', async (event, arg) => {
      // Register listeners on the window, so we can update the state
      // automatically (the listeners will be removed when the window is closed)
      // and restore the maximized or full screen state
      global.mainWindowState.manage(global.mainWindow);
    });

    ipcMain.on('log', async (event, message) => {
      console.log("Log from renderer: " + message);
    });

    // eslint-disable-next-line no-unused-vars
    ipcMain.handle('initIpc', async (event, arg) => {
      let returnCode = await global.ipc.init(global.isDev, global.mainWindow);
      return returnCode;
    });

    // eslint-disable-next-line no-unused-vars
    ipcMain.handle('startupCompleted', async (event, arg) => {
      console.timeEnd('Startup');
    });

    // eslint-disable-next-line no-unused-vars
    ipcMain.handle('localizeMenu', async (event, menuLabels) => {
      updateMacOsMenu(menuLabels);
    });
  }
}

function initMainWindow() {
  let preloadScript = '';
  if (!global.isDev && global.sendCrashReports) {
    preloadScript = path.join(__dirname, 'app/frontend/helpers/sentry.js');
  }

  let bgColor = '#ffffff';

  if (shouldUseDarkMode()) {
    bgColor = '#1e1e1e';
  }

  // Create the browser window.
  global.mainWindow = new BrowserWindow({
    x: global.mainWindowState.x,
    y: global.mainWindowState.y,
    width: global.mainWindowState.width,
    height: global.mainWindowState.height,
    show: true,
    frame: true,
    title: "Ezra Bible App " + app.getVersion() + (global.isDev ? ` [${app.getLocale()}]` : ''),
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
}

function initWindowEventHandlers() {
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

async function createWindow(firstStart=true) {
  const windowStateKeeper = require('electron-window-state');
  global.mainWindowState = windowStateKeeper({
    defaultWidth: 1200,
    defaultHeight: 800
  });

  initIpcHandlers();
  initMainWindow();

  if (firstStart) { // electron remote can only be initialized once, on macOS this function may run multiple times
    require('@electron/remote/main').initialize();
  }

  require("@electron/remote/main").enable(global.mainWindow.webContents);
 
  // The default menu will be created automatically if the app does not set one.
  // It contains standard items such as File, Edit, View, Window and Help.
  // We disable the menu by default and in a second step we enable it with minimal entries and only on macOS.
  Menu.setApplicationMenu(null);

  if (platformHelper.isMac()) {
    updateMacOsMenu();
  }

  initWindowEventHandlers();

  // and load the index.html of the app.
  global.mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }));
}

function handleDropboxAuthUrl(url) {
  if (url.indexOf('ezrabible') != -1) {
    global.mainWindow.webContents.send('dropbox-auth-callback', url);
  }
}

async function appReady() {
  if (process.platform === 'win32' || process.platform === 'linux') {
    // see https://www.electronjs.org/docs/latest/tutorial/launch-app-from-url-in-another-app#windows-and-linux-code

    const lock = app.requestSingleInstanceLock();

    if (!lock) {

      app.quit();
      return;

    } else {
      app.on('second-instance', (event, commandLine, workingDirectory) => {
        let url = commandLine.pop();
        handleDropboxAuthUrl(url);

        // Someone tried to run a second instance, we should focus our window.
        if (global.mainWindow) {
          if (global.mainWindow.isMinimized()) global.mainWindow.restore();

          global.mainWindow.focus();
        }
      });
    }

  } else if (process.platform === 'darwin') {
    app.on('open-url', (event, url) => {
      handleDropboxAuthUrl(url);
    });
  }

  await createWindow();
}

function initAppEventHandlers() {
  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  app.on('ready', async () => {
    global.appIsReady = true;

    appReady();
  });

  app.on('before-quit', async (event) => {
    if (!global.exitComplete) {
      event.preventDefault();
      await global.ipc.closeDatabase();
      global.exitComplete = true;
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
    if (global.mainWindow === null && global.appIsReady) {
      await createWindow(false);
    }
  });
}

function init() {
  console.time('Startup');

  initGlobals();

  // Disable hardware acceleration to avoid issue: 'GPU' process exited with 'abnormal-exit'
  app.disableHardwareAcceleration();

  // Make the app window respond to calls coming from a browser window based on the Dropbox oauth process
  initDropboxProtocolClient();

  // Enable the Sentry crash report system based on the sendCrashReports option
  initSentryCrashReports();

  // Enables the Electron dev tools which can be opened using CTRL + SHIFT + i (Linux/Windows) or CMD + SHIFT + i (macOS)
  initElectronDebug();

  // This will eventually launch the app - based on the app ready event and the appReady handler function.
  initAppEventHandlers();
}

init();
