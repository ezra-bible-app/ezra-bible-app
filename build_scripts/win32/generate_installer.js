const electronInstaller = require('electron-winstaller');

(
  async() => {
    try {
      await electronInstaller.createWindowsInstaller({
        title: 'EzraBibleApp',
        name: 'EzraBibleApp',
        appDirectory: 'release/Ezra Bible App-win32-ia32',
        outputDirectory: 'release/packages',
        noMsi: true,
        authors: 'Ezra Bible App Developers',
        exe: 'Ezra Bible App.exe'
      });
      console.log('Win32 installer generated successfully!');
    } catch (e) {
      console.log(`Could not generate win32 installer: ${e.message}`);
    }
  }
)();