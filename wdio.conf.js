// WebdriverIO configuration for Ezra Bible App
const path = require('path');
const fs = require('fs-extra');
const os = require('os');

exports.config = {
  //
  // ====================
  // Runner Configuration
  // ====================
  runner: 'local',
  
  //
  // ==================
  // Specify Test Files
  // ==================
  specs: [
    './features/**/*.feature'
  ],
  
  // Patterns to exclude
  exclude: [],
  
  //
  // ============
  // Capabilities
  // ============
  maxInstances: 1,
  
  capabilities: [{
    // Set maxInstances to 1 because we're testing an Electron app
    maxInstances: 1,
    browserName: 'electron',
    'wdio:electronServiceOptions': {
      appPath: path.join(process.cwd(), 'main.js'),
      electronPath: path.join(process.cwd(), 'node_modules', '.bin', 'electron'),
      appEntryPoint: './main.js',
      args: [],
      // Add environment variables to disable Dropbox sync during tests
      env: {
        EZRA_TEST_MODE: 'true',
        DISABLE_DROPBOX_SYNC: 'true'
      }
    }
  }],
  
  // Delete user data directory before session starts
  beforeSession: function() {
    console.log('[TEST] beforeSession: Cleaning up test data directory...');
    
    // Use the same path calculation logic as in wdio_helper.js
    const appDataPath = process.env.APPDATA || 
                       (process.platform === 'darwin' ? path.join(os.homedir(), 'Library/Application Support') : 
                       path.join(os.homedir(), '.config'));
                      
    const userDataPath = path.join(appDataPath, 'ezra-bible-app-test');
    
    console.log('[TEST] Using test data directory path:', userDataPath);
    
    if (fs.existsSync(userDataPath)) {
      console.log('[TEST] Removing existing test data directory');
      fs.removeSync(userDataPath);
      console.log('[TEST] Test data directory cleanup complete');
    } else {
      console.log('[TEST] Test data directory does not exist yet, no cleanup needed');
    }
  },
  
  //
  // ===================
  // Test Configurations
  // ===================
  logLevel: 'warn',
  bail: 0,
  baseUrl: 'file://' + path.join(process.cwd()),
  waitforTimeout: 10000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,
  
  services: ['electron'],
  
  framework: 'cucumber',
  cucumberOpts: {
    requireModule: [],
    require: ['./features/steps/*.js'],
    backtrace: false,
    compiler: [],
    dryRun: false,
    failFast: false,
    format: ['pretty'],
    colors: true,
    snippets: true,
    source: true,
    profile: [],
    strict: false,
    tags: [],
    timeout: 60000,
    ignoreUndefinedDefinitions: false
  },
  
  reporters: ['spec'],
  
  //
  // =====
  // Hooks
  // =====
  
  before: async function (capabilities, specs) {
    // Add any setup code here that should run before tests
    const chai = require('chai');
    const chaiAsPromised = require('chai-as-promised');
    chai.use(chaiAsPromised);
    
    global.expect = chai.expect;
    global.assert = chai.assert;
    global.should = chai.should();
  },
  
  beforeFeature: async function (uri, feature) {
    // Custom setup before each feature
  },
  
  afterFeature: async function (uri, feature) {
    // Custom cleanup after each feature
  },
  
  // Add hooks to restart Electron after each scenario
  beforeScenario: async function (world) {
    console.log('[TEST] beforeScenario: Ensuring Electron window is properly started');
    
    // If we need to restart from a previous scenario
    if (global.needsRestart) {
      try {
        // Create a completely new session
        await browser.reloadSession();
        
        // Wait for the app to be fully loaded
        await browser.waitUntil(
          async () => {
            try {
              const result = await browser.executeScript(
                'return isStartupCompleted !== undefined && isStartupCompleted();'
              );
              return result;
            } catch (e) {
              return false;
            }
          },
          { 
            timeout: 15000, 
            timeoutMsg: 'App did not fully load within 15s' 
          }
        );
        
        // Reset the flag
        global.needsRestart = false;
        console.log('[TEST] Successfully restarted Electron window');
      } catch (error) {
        console.log('[TEST] Error restarting Electron window:', error.message);
      }
    }
    
    // Set a reasonable window size for tests
    try {
      await browser.setWindowRect(null, null, 1280, 800);
    } catch (error) {
      console.log('Could not set window size, continuing with default size');
    }
  },
  
  afterScenario: async function (world, result) {
    console.log('[TEST] afterScenario: Closing Electron window to prepare for next test');
    
    try {
      // Check if we have an active window before trying to close it
      const handles = await browser.getWindowHandles();
      
      if (handles && handles.length > 0) {
        // Close the window completely
        await browser.closeWindow();
        console.log('[TEST] Successfully closed Electron window');
        
        // Add a delay to ensure the window is fully closed
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        console.log('[TEST] No active window to close');
      }
    } catch (error) {
      console.log('[TEST] Error closing window:', error.message);
    }
    
    // Set flag for next scenario to know it needs to create a new window
    global.needsRestart = true;
  },
  
  afterTest: async function (test, context, { error, result, duration, passed, retries }) {
    // Take screenshot if test fails
    if (!passed) {
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const screenshotFileName = `error-${test.parent}-${test.title}-${timestamp}.png`;
      await browser.saveScreenshot('./wdio-logs/' + screenshotFileName);
    }
  }
};