class PlatformDetector {
  isCordova() {
    if (typeof window !== 'undefined' && !!window.cordova) {
      return true;
    }
    
    if (global.cordova !== 'undefined') {
      return true;
    }

    return false;
  }

  // https://github.com/electron/electron/issues/2288
  isElectron() {
    // Renderer process
    if (typeof window !== 'undefined' &&
        typeof window.process === 'object' &&
        window.process.type === 'renderer') {
        
      return true;
    }

    // Main process
    if (typeof process !== 'undefined' &&
        typeof process.versions === 'object' &&
        !!process.versions.electron) {
        
      return true;
    }

    // Detect the user agent when the `nodeIntegration` option is set to true
    if (typeof navigator === 'object' &&
        typeof navigator.userAgent === 'string'
        && navigator.userAgent.indexOf('Electron') >= 0) {
      
      return true;
    }

    return false;
  }
}

module.exports = PlatformDetector;