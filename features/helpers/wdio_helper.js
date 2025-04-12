/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2025 Ezra Bible App Development Team <contact@ezrabibleapp.net>

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
const fs = require('fs-extra');
const os = require('os');

class WdioHelper {
  constructor() {
    this.userDataPath = path.join(os.tmpdir(), 'ezra-bible-app-test');
  }

  /**
   * Sleep for the specified amount of milliseconds
   * @param {number} ms - Milliseconds to sleep
   */
  async sleep(ms = 500) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Delete the user data directory used for testing
   */
  async deleteUserDataDir() {
    if (fs.existsSync(this.userDataPath)) {
      await fs.remove(this.userDataPath);
    }
  }

  /**
   * Get the WebDriver client
   * @returns The WebDriver client
   */
  getWebClient() {
    return browser;
  }

  /**
   * Execute JavaScript in the renderer process
   * @param {Function|string} script - The script to execute
   * @param {Array} args - Arguments to pass to the script
   * @returns The result of the script execution
   */
  async executeInRenderer(script, ...args) {
    return await browser.execute(script, ...args);
  }

  /**
   * Take a screenshot
   * @param {string} name - Name of the screenshot file
   */
  async takeScreenshot(name) {
    await browser.saveScreenshot(`./wdio-logs/${name}.png`);
  }

  /**
   * Get the app arguments for specific module installations
   * @param {boolean} installKjv - Whether to install KJV
   * @param {boolean} installAsv - Whether to install ASV
   * @returns App arguments array
   */
  getAppArgs({ installKjv = false, installAsv = false } = {}) {
    const args = [];
    
    if (installKjv) {
      args.push('--install-kjv');
    }
    
    if (installAsv) {
      args.push('--install-asv');
    }
    
    return args;
  }

  /**
   * Wait for the app startup to complete
   */
  async waitForStartupComplete() {
    let startupCompleted = false;
    let attempts = 0;
    const maxAttempts = 20;

    while (!startupCompleted && attempts < maxAttempts) {
      startupCompleted = await browser.execute(() => {
        if (typeof isStartupCompleted === 'function') {
          return isStartupCompleted();
        }
        return false;
      });

      if (!startupCompleted) {
        await this.sleep(1000);
        attempts++;
      }
    }

    if (!startupCompleted) {
      throw new Error('App startup did not complete within the expected time');
    }
  }
}

module.exports = new WdioHelper();