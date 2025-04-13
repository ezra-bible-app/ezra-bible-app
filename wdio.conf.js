// WebdriverIO configuration for Ezra Bible App
const path = require('path');
const fs = require('fs-extra');
const os = require('os');
const { config } = require('process');
const Gherkin = require("@cucumber/gherkin");
const Messages = require("@cucumber/messages");
const { fileURLToPath } = require('url');

const tagToArgMap = {
  '@needs-asv-before': '--install-asv'
}

async function getStartupArgsFromTags(specPaths) {
  const args = new Set();
  const uuidFn = Messages.IdGenerator.uuid();

  for (const filePath of specPaths) {
    const absolutePath = filePath.startsWith('file://')
      ? fileURLToPath(filePath)
      : filePath;

    const content = fs.readFileSync(absolutePath, 'utf8');

    const builder = new Gherkin.AstBuilder(uuidFn);
    const matcher = new Gherkin.GherkinClassicTokenMatcher();
    const parser = new Gherkin.Parser(builder, matcher);

    let gherkinDocument;
    try {
      gherkinDocument = parser.parse(content);
    } catch (err) {
      console.error(`[Gherkin Parser] Failed to parse: ${absolutePath}`, err);
      continue;
    }

    const pickles = Gherkin.compile(gherkinDocument, absolutePath, uuidFn);

    for (const pickle of pickles) {
      const tags = pickle.tags || [];

      for (const tag of tags) {
        const tagName = tag.name;
        if (tagToArgMap[tagName]) {
          args.add(tagToArgMap[tagName]);
        }
      }
    }
  }

  return [...args];
}

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
      appArgs: ['--test-mode', '--no-sandbox', '--disable-dev-shm-usage'],
      // Add environment variables to disable Dropbox sync during tests
      env: {
        EZRA_TEST_MODE: 'true',
        DISABLE_DROPBOX_SYNC: 'true',
        NODE_ENV: 'test'
      }
    },

    cucumberOpts: {
      require: ['./features/steps/*.js'],
      scenarioLevelReporter: true // 👈 one session per scenario
    },
  }],
  
  // Delete user data directory before session starts
  beforeSession: async function(config, capabilities, specs, cid) {
    // Initialize the global flag to track the first scenario
    global.isFirstScenario = true;

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

    const extraArgs = await getStartupArgsFromTags(specs);

    capabilities['wdio:electronServiceOptions'].appArgs.push(...extraArgs)
    console.log(`[beforeSession] Injected Electron args: ${extraArgs.join(' ')}`)
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
  
  // Add hooks to restart Electron after each scenario
  beforeScenario: async function (world) {
    console.log('[TEST] beforeScenario: Checking if refresh is needed');

    try {
      // Skip refresh for the first scenario
      if (global.isFirstScenario) {
        console.log('[TEST] First scenario detected, skipping refresh');
        global.isFirstScenario = false;
      } else {
        console.log('[TEST] Refreshing Electron instance');
        // Refresh the page instead of reloading the session
        await browser.refresh();
          
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
            timeoutMsg: 'App did not fully refresh within 15s' 
          }
        );
          
        console.log('[TEST] Successfully refreshed Electron instance');
      }
    } catch (error) {
      console.log('[TEST] Error in beforeScenario hook:', error.message);
    }
    
    // Set a reasonable window size for tests
    try {
      await browser.setWindowRect(null, null, 1280, 800);
    } catch (error) {
      console.log('Could not set window size, continuing with default size');
    }
  },
  
  afterScenario: async function (world, result) {
    console.log('[TEST] afterScenario: Scenario completed, instance will be refreshed before next scenario');
    
    // No longer closing the window or setting the needsRestart flag
    // Just let the beforeScenario handle the refresh
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