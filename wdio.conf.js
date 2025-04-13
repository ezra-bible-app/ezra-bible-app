// WebdriverIO configuration for Ezra Bible App
const path = require('path');

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
      args: [],
      // Add environment variables to disable Dropbox sync during tests
      env: {
        DISABLE_DROPBOX_SYNC: 'true',
        EZRA_TESTING: 'true'
      }
    }
  }],
  
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