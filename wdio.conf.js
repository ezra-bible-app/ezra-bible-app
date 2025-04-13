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

// Helper function to set scenario parameters in the browser via IPC
async function setScenarioParams(params) {
  if (!params || Object.keys(params).length === 0) {
    return;
  }
  
  console.log('[TEST] Setting scenario parameters:', JSON.stringify(params));
  
  try {
    // Use executeScript with proper separate script and arguments format
    await browser.executeScript(`
      try {
        // First argument is our parameter object
        const paramObject = arguments[0];
        
        // Set each parameter as a global variable in the browser window
        Object.entries(paramObject).forEach(([key, value]) => {
          window[key] = value;
          
          // Also notify the main process via IPC if needed
          if (window.ipcRenderer) {
            window.ipcRenderer.send('test:set-parameter', { key, value });
          }
        });

        // Call startup.initTest() if available
        if (window.startup && typeof window.startup.initTest === 'function') {
          console.log('[TEST] Invoking window.startup.initTest()');
          return window.startup.initTest();
        } else {
          console.log('[TEST] window.startup.initTest is not available yet');
          return true;
        }
      } catch (e) {
        console.error('Error in scenario params script:', e);
        return false;
      }
    `, [params]);
    
    console.log('[TEST] Successfully set scenario parameters and invoked initTest');
  } catch (error) {
    console.error('[TEST] Error setting scenario parameters:', error.message);
  }
}

// Helper function to parse string values into appropriate types
function tryParseValue(valueStr) {
  if (valueStr === 'true') return true;
  if (valueStr === 'false') return false;
  if (valueStr === 'null') return null;
  if (valueStr === 'undefined') return undefined;
  
  // Try to parse as number
  const num = Number(valueStr);
  if (!isNaN(num)) return num;
  
  // Try to parse as JSON
  try {
    return JSON.parse(valueStr);
  } catch (e) {
    // Return as string if all else fails
    return valueStr;
  }
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
    
    // Initialize the object to store scenario-specific parameters
    global.scenarioParams = {};

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
      
      // Extract scenario parameters from tags or feature metadata
      const scenarioParams = {};
      
      // Get tags from the scenario
      if (world && world.pickle && world.pickle.tags) {
        // Process tags that may contain parameters
        for (const tag of world.pickle.tags) {
          // Parse tags with format @param:key=value
          const paramMatch = tag.name.match(/^@param:([^=]+)=(.+)$/);
          if (paramMatch) {
            const [, key, value] = paramMatch;
            scenarioParams[key] = tryParseValue(value);
          }
        }
      }
      
      // Add the scenario name as a parameter
      if (world && world.pickle) {
        scenarioParams.scenarioName = world.pickle.name;
        scenarioParams.scenarioId = world.pickle.id;
      }
      
      // Store params globally for potential use in afterScenario
      global.scenarioParams = scenarioParams;
      
      // Send parameters to the browser window
      await setScenarioParams(scenarioParams);
      
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