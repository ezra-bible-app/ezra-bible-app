const electronInstaller = require('electron-winstaller');

(
  async() => {
    try {
      await electronInstaller.createWindowsInstaller({
        title: 'EzraBibleApp',
        name: 'EzraBibleApp',
        version: '1.3.0',
        appDirectory: 'release/Ezra Bible App-win32-ia32',
        authors: 'Ezra Bible App Developers',
        exe: 'Ezra Bible App.exe'
      });
      console.log('Win32 installer generated successfully!');
    } catch (e) {
      console.log(`Could not generate win32 installer: ${e.message}`);
    }
  }
)();