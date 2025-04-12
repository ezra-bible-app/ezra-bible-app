// Electron Forge configuration
module.exports = {
  // Additional configuration beyond what's in package.json
  packagerConfig: {
    asar: true,
    executableName: 'ezra-bible-app',
    extraResource: [
      'node_modules/node-sword-interface/sword_modules',
    ],
    ignore: [
      '^/release($|/)',
      '^/wdio-logs($|/)',
      '^/node_modules/node-sword-interface/sword/bindings/Android($|/)'
    ]
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        // Same as in package.json, ensuring consistency
        name: 'ezra_bible_app',
        iconUrl: 'https://raw.githubusercontent.com/ezra-bible-app/ezra-bible-app/master/icons/ezra.ico',
        setupIcon: 'icons/ezra.ico'
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {
        options: {
          icon: 'icons/ezra.png',
          productName: 'Ezra Bible App',
          section: 'education',
          categories: ['Education', 'Literature'],
          mimeType: ['x-scheme-handler/ezrabible'],
          bin: 'ezra-bible-app'
        },
      },
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {
        options: {
          icon: 'icons/ezra.png',
          productName: 'Ezra Bible App',
          categories: ['Education', 'Literature'],
          mimeType: ['x-scheme-handler/ezrabible'],
          bin: 'ezra-bible-app'
        },
      },
    },
  ],
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'ezra-bible-app',
          name: 'ezra-bible-app'
        },
        prerelease: true
      }
    }
  ],
};