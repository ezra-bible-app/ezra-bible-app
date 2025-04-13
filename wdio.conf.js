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
  logLevel: 'info',
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
  
  afterTest: async function (test, context, { error, result, duration, passed, retries }) {
    // Take screenshot if test fails
    if (!passed) {
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const screenshotFileName = `error-${test.parent}-${test.title}-${timestamp}.png`;
      await browser.saveScreenshot('./wdio-logs/' + screenshotFileName);
    }
  }
};